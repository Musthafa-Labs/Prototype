/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { validateRadialGroundParameters } from './math.js';

/**
 * Procedurally generates a seamless high-frequency forest floor color texture using HTML5 Canvas.
 * Simulates forest humus, rich topsoil, pine needles, and subtle moss variation.
 * @param {number} [size=512] - Texture resolution.
 * @returns {THREE.CanvasTexture}
 */
function createProceduralGroundTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // Rich base earth: deep forest understory loam and mossy soil
  ctx.fillStyle = '#425338';
  ctx.fillRect(0, 0, size, size);

  // Micro-granularity (soil particles, fine organic loam)
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 32;
    const mossNoise = Math.random() > 0.55 ? (Math.random() * 26) : 0;

    data[i] = Math.min(255, Math.max(0, data[i] + n - mossNoise * 0.3));       // R: dark loam
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n + mossNoise));    // G: moss tint
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.8 - mossNoise * 0.3)); // B: earth tone
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // Organic moss & damp soil patches
  for (let j = 0; j < 45; j++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 20 + Math.random() * 50;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const isMoss = Math.random() > 0.4;
    if (isMoss) {
      grad.addColorStop(0, 'rgba(84, 110, 64, 0.35)');
      grad.addColorStop(1, 'rgba(66, 83, 56, 0)');
    } else {
      grad.addColorStop(0, 'rgba(46, 56, 38, 0.42)');
      grad.addColorStop(1, 'rgba(66, 83, 56, 0)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scattered pine needle accents
  ctx.strokeStyle = 'rgba(40, 48, 34, 0.45)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 75; k++) {
    const sx = Math.random() * size;
    const sy = Math.random() * size;
    const angle = Math.random() * Math.PI * 2;
    const len = 4 + Math.random() * 10;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(300, 300);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;

  return texture;
}

/**
 * Procedurally generates a bump map for subtle tactile micro-relief across the terrain.
 * @param {number} [size=256]
 * @returns {THREE.CanvasTexture}
 */
function createProceduralBumpTexture(size = 256) {
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
  texture.repeat.set(300, 300);
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Creates the foundation ground surface for The Hidden Forest.
 * Uses a radial circular disk (radius 3500m) so that the horizon is perfectly uniform
 * in all 360 degrees without any corner clipping artifacts.
 *
 * @param {Object} [options]
 * @param {number} [options.radius=3500] - Radial extent of the ground in meters.
 * @param {number} [options.segments=96] - Radial segments for smooth curvature.
 * @param {number} [options.maxAnisotropy=8] - Anisotropic filtering factor.
 * @returns {{ mesh: THREE.Mesh, dispose: () => void }}
 */
export function createGroundSurface(options = {}) {
  const { radius = 3500, segments = 96, maxAnisotropy = 8 } = options;
  const params = validateRadialGroundParameters(radius, segments);

  // Circular ground disk ensures equidistant horizon boundary in all directions
  const geometry = new THREE.CircleGeometry(params.radius, params.segments);
  // Lay flat horizontally along the XZ plane with surface normal pointing up (+Y)
  geometry.rotateX(-Math.PI / 2);

  const diffuseMap = typeof document !== 'undefined' ? createProceduralGroundTexture(512) : null;
  const bumpMap = typeof document !== 'undefined' ? createProceduralBumpTexture(256) : null;

  if (diffuseMap && maxAnisotropy > 1) {
    diffuseMap.anisotropy = Math.min(maxAnisotropy, 16);
  }
  if (bumpMap && maxAnisotropy > 1) {
    bumpMap.anisotropy = Math.min(maxAnisotropy, 16);
  }

  const material = new THREE.MeshStandardMaterial({
    color: 0x4d5f42,
    roughness: 0.86,
    metalness: 0.02,
    map: diffuseMap,
    bumpMap: bumpMap,
    bumpScale: 0.03,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'GroundSurface';
  mesh.position.set(0, 0, 0);

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
    if (diffuseMap) diffuseMap.dispose();
    if (bumpMap) bumpMap.dispose();
    material.dispose();
  };

  return {
    mesh,
    updateQuality,
    dispose,
  };
}
