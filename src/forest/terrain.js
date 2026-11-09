/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { getTerrainHeight } from './terrainElevation.js';

/**
 * Procedurally generates a natural forest floor loam texture using HTML5 Canvas.
 * Produces organic forest soil with muted earth tones, damp humus, and subtle mossy tints.
 *
 * @param {number} [size=512]
 * @returns {THREE.CanvasTexture}
 */
function createProceduralTerrainTexture(size = 512) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Rich forest floor base earth
  ctx.fillStyle = '#44533a';
  ctx.fillRect(0, 0, size, size);

  // 2. Micro-granularity (soil particles, decayed leaves, mossy earth)
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 26;
    const mossTint = Math.random() > 0.52 ? Math.random() * 22 : 0;

    data[i] = Math.min(255, Math.max(0, data[i] + n - mossTint * 0.25));      // R: dark loam
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n + mossTint));    // G: moss tint
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.8 - mossTint * 0.25)); // B: earth tone
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Organic damp soil, moss, and warm leaf-litter patches
  for (let j = 0; j < 65; j++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 25 + Math.random() * 70;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const layerType = Math.random();

    if (layerType < 0.35) {
      // Moss patch
      grad.addColorStop(0, 'rgba(84, 108, 66, 0.38)');
      grad.addColorStop(1, 'rgba(68, 83, 58, 0)');
    } else if (layerType < 0.70) {
      // Dark damp humus loam
      grad.addColorStop(0, 'rgba(36, 44, 30, 0.48)');
      grad.addColorStop(1, 'rgba(68, 83, 58, 0)');
    } else {
      // Decayed leaf litter & organic woodland debris
      grad.addColorStop(0, 'rgba(92, 68, 44, 0.42)');
      grad.addColorStop(1, 'rgba(68, 83, 58, 0)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Subtle pine needle, decayed leaf fragments & dry twig accents
  ctx.strokeStyle = 'rgba(42, 32, 22, 0.48)';
  ctx.lineWidth = 1.3;
  for (let k = 0; k < 90; k++) {
    const sx = Math.random() * size;
    const sy = Math.random() * size;
    const angle = Math.random() * Math.PI * 2;
    const len = 5 + Math.random() * 12;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
    ctx.stroke();
  }

  // 5. Scattered small fallen leaf specks
  ctx.fillStyle = 'rgba(96, 68, 38, 0.55)';
  for (let m = 0; m < 50; m++) {
    const lx = Math.random() * size;
    const ly = Math.random() * size;
    const lr = 1.2 + Math.random() * 2.2;
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(160, 160);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;

  return texture;
}

/**
 * Procedurally generates a terrain bump map for subtle tactile micro-relief.
 * @param {number} [size=256]
 * @returns {THREE.CanvasTexture}
 */
function createProceduralTerrainBump(size = 256) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.min(255, Math.max(0, 128 + (Math.random() - 0.5) * 50));
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(160, 160);
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Constructs the natural terrain surface for The Hidden Forest.
 * Combines high-fidelity rolling hills and valleys across the exploration expanse (2400m x 2400m)
 * with a seamless outer horizon ring (inner 1145m, outer 3800m) ensuring 360° uninterrupted landscape.
 *
 * @param {Object} [options]
 * @param {number} [options.terrainSize=2400] - Expanse of the primary undulating terrain.
 * @param {number} [options.segments=160] - Subdivision segments along X and Z.
 * @param {number} [options.maxAnisotropy=8]
 * @returns {{
 *   group: THREE.Group,
 *   terrainMesh: THREE.Mesh,
 *   skirtMesh: THREE.Mesh,
 *   updateQuality: (preset: Object) => void,
 *   dispose: () => void
 * }}
 */
export function createNaturalTerrain(options = {}) {
  const {
    terrainSize = 2400,
    segments = 160,
    maxAnisotropy = 8,
  } = options;

  const group = new THREE.Group();
  group.name = 'NaturalTerrainSystem';

  // 1. Primary Terrain Plane Geometry (X: [-1200, 1200], Z: [-1200, 1200])
  const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const posAttr = geometry.attributes.position;
  const count = posAttr.count;

  // Elevate vertices using our analytical continuous terrain height function
  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);

    // Fade elevation smoothly towards baseline 0.0 at outer borders (between 950m and 1150m)
    const distFromOrigin = Math.hypot(x, z);
    let height = getTerrainHeight(x, z);

    if (distFromOrigin > 950) {
      const fade = Math.max(0, Math.min(1, (1150 - distFromOrigin) / 200));
      const smoothFade = fade * fade * (3 - 2 * fade);
      height = height * smoothFade; // Tapers cleanly to 0.0 at 1150m
    }

    posAttr.setY(i, height);
  }

  geometry.computeVertexNormals();

  // 2. Physically Based Terrain Material
  const diffuseMap = createProceduralTerrainTexture(512);
  const bumpMap = createProceduralTerrainBump(256);

  if (diffuseMap && maxAnisotropy > 1) {
    diffuseMap.anisotropy = Math.min(maxAnisotropy, 16);
  }
  if (bumpMap && maxAnisotropy > 1) {
    bumpMap.anisotropy = Math.min(maxAnisotropy, 16);
  }

  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.02,
    map: diffuseMap,
    bumpMap: bumpMap,
    bumpScale: 0.035,
    flatShading: false,
  });

  const terrainMesh = new THREE.Mesh(geometry, terrainMaterial);
  terrainMesh.name = 'TerrainMesh';
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // 3. Seamless Outer Horizon Ring (Inner radius 1145m, Outer radius 3800m)
  // An open donut ring that seamlessly matches the tapered edge at 1145m, extending to 3800m horizon.
  // Because it is a ring with an open center, it NEVER overlaps or occludes the terrain or road!
  const skirtGeom = new THREE.RingGeometry(1145, 3800, 64, 4);
  skirtGeom.rotateX(-Math.PI / 2);

  const skirtMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d4b35,
    roughness: 0.95,
    metalness: 0.01,
  });

  const skirtMesh = new THREE.Mesh(skirtGeom, skirtMaterial);
  skirtMesh.name = 'HorizonSkirtRing';
  skirtMesh.position.set(0, 0, 0); // Sits at exactly y = 0 where the terrain taper meets it
  skirtMesh.receiveShadow = true;
  group.add(skirtMesh);

  const updateQuality = (preset) => {
    if (!preset) return;
    const aniso = Math.min(preset.anisotropy || 8, 16);
    if (diffuseMap) {
      diffuseMap.anisotropy = aniso;
      diffuseMap.needsUpdate = true;
    }
    if (bumpMap) {
      bumpMap.anisotropy = aniso;
      bumpMap.needsUpdate = true;
    }
  };

  const dispose = () => {
    geometry.dispose();
    skirtGeom.dispose();
    if (diffuseMap) diffuseMap.dispose();
    if (bumpMap) bumpMap.dispose();
    terrainMaterial.dispose();
    skirtMaterial.dispose();
  };

  return {
    group,
    terrainMesh,
    skirtMesh,
    updateQuality,
    dispose,
  };
}
