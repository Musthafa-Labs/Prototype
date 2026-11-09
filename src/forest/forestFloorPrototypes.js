/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { safeMergeGeometries } from './treePrototypes.js';

/**
 * Forest floor prototype identifiers.
 */
export const FLOOR_SPECIES = {
  GRASS_SMALL: 'grass_small',
  GRASS_MEDIUM: 'grass_medium',
  GRASS_TALL: 'grass_tall',
  FERN_COMMON: 'fern_common',
  FERN_BROAD: 'fern_broad',
  FERN_COMPACT: 'fern_compact',
  ROCK_SMALL: 'rock_small',
  ROCK_MEDIUM: 'rock_medium',
  ROCK_LARGE: 'rock_large',
  BRANCH_CURVED: 'branch_curved',
  BRANCH_STRAIGHT: 'branch_straight',
  FALLEN_LOG_LARGE: 'fallen_log_large',
  FALLEN_LOG_MEDIUM: 'fallen_log_medium',
};

/**
 * Perturbs geometry vertices with organic displacement.
 * @param {THREE.BufferGeometry} geom
 * @param {number} amplitude
 * @param {number} [freq=2.0]
 */
function perturbVertices(geom, amplitude = 0.08, freq = 2.0) {
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const nx = Math.sin(y * freq * 2.2 + z * freq) * amplitude;
    const ny = Math.cos(x * freq + z * freq * 1.6) * (amplitude * 0.7);
    const nz = Math.sin(x * freq * 1.5 + y * freq * 1.2) * amplitude;

    pos.setXYZ(i, x + nx, y + ny, z + nz);
  }
  geom.computeVertexNormals();
}

/**
 * Builds an arching, tapered grass blade strip geometry.
 * @param {number} height
 * @param {number} baseWidth
 * @param {number} curveAmount
 * @param {number} rotY
 * @returns {THREE.BufferGeometry}
 */
function createGrassBlade(height, baseWidth, curveAmount, rotY) {
  const segments = 3;
  const geom = new THREE.PlaneGeometry(baseWidth, height, 1, segments);
  geom.translate(0, height / 2, 0);

  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = Math.max(0, Math.min(1, y / height));
    // Taper width toward the tip
    const currentX = pos.getX(i);
    const taper = 1.0 - t * 0.85;
    pos.setX(i, currentX * taper);

    // Curve along Z
    const curve = Math.pow(t, 1.8) * curveAmount;
    pos.setZ(i, pos.getZ(i) + curve);
  }

  geom.rotateY(rotY);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Prototype: Small woodland grass cluster
 */
export function buildGrassSmallPrototype() {
  const blades = [];
  const count = 4;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI + (i * 0.35);
    const h = 0.38 + (i % 2) * 0.08;
    const w = 0.14;
    const curve = 0.12 + (i % 2) * 0.06;
    blades.push(createGrassBlade(h, w, curve, angle));
  }
  const merged = safeMergeGeometries(blades);
  return {
    geometry: merged,
    height: 0.45,
    radius: 0.30,
  };
}

/**
 * Prototype: Medium woodland grass cluster
 */
export function buildGrassMediumPrototype() {
  const blades = [];
  const count = 6;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 1.3 + (i * 0.45);
    const h = 0.62 + (i % 3) * 0.12;
    const w = 0.18;
    const curve = 0.20 + (i % 2) * 0.08;
    blades.push(createGrassBlade(h, w, curve, angle));
  }
  const merged = safeMergeGeometries(blades);
  return {
    geometry: merged,
    height: 0.70,
    radius: 0.50,
  };
}

/**
 * Prototype: Tall meadow/valley grass tuft
 */
export function buildGrassTallPrototype() {
  const blades = [];
  const count = 8;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 1.5 + (i * 0.55);
    const h = 0.85 + (i % 3) * 0.15;
    const w = 0.22;
    const curve = 0.32 + (i % 2) * 0.10;
    blades.push(createGrassBlade(h, w, curve, angle));
  }
  const merged = safeMergeGeometries(blades);
  return {
    geometry: merged,
    height: 0.95,
    radius: 0.65,
  };
}

/**
 * Creates an arching fern frond ribbon geometry with outward and downward graceful droop.
 * @param {number} length
 * @param {number} maxWidth
 * @param {number} archHeight
 * @param {number} rotY
 * @returns {THREE.BufferGeometry}
 */
function createFernFrond(length, maxWidth, archHeight, rotY) {
  const segments = 4;
  const geom = new THREE.PlaneGeometry(maxWidth, length, 1, segments);
  geom.translate(0, length / 2, 0);

  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = y / length; // 0 (base) to 1 (tip)

    // Leaf profile: narrow at base, wider in mid-frond, tapering to pointed apex
    const widthFactor = Math.sin(t * Math.PI) * 0.8 + 0.2;
    pos.setX(i, pos.getX(i) * widthFactor);

    // Arch: rises up then curves downward toward tip
    const archY = Math.sin(t * Math.PI * 0.85) * archHeight - (t > 0.6 ? (t - 0.6) * archHeight * 1.2 : 0);
    const reachZ = Math.sin(t * Math.PI * 0.5) * length * 0.75;

    pos.setY(i, archY);
    pos.setZ(i, reachZ);
  }

  geom.rotateY(rotY);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Prototype: Common Woodland Shuttlecock / Bracken Fern
 */
export function buildFernCommonPrototype() {
  const fronds = [];
  const frondCount = 7;
  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2 + (i * 0.15);
    const len = 1.25 + (i % 2) * 0.2;
    const maxW = 0.38;
    const archH = 0.65;
    fronds.push(createFernFrond(len, maxW, archH, angle));
  }
  const merged = safeMergeGeometries(fronds);
  return {
    geometry: merged,
    height: 0.75,
    radius: 0.85,
  };
}

/**
 * Prototype: Broad Valley Fern
 */
export function buildFernBroadPrototype() {
  const fronds = [];
  const frondCount = 6;
  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2 + (i * 0.25);
    const len = 1.45 + (i % 2) * 0.25;
    const maxW = 0.48;
    const archH = 0.50; // lower, spreading droop
    fronds.push(createFernFrond(len, maxW, archH, angle));
  }
  const merged = safeMergeGeometries(fronds);
  return {
    geometry: merged,
    height: 0.58,
    radius: 1.05,
  };
}

/**
 * Prototype: Compact Rock/Tree-Base Fern
 */
export function buildFernCompactPrototype() {
  const fronds = [];
  const frondCount = 5;
  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2;
    const len = 0.85 + (i % 2) * 0.15;
    const maxW = 0.28;
    const archH = 0.42;
    fronds.push(createFernFrond(len, maxW, archH, angle));
  }
  const merged = safeMergeGeometries(fronds);
  return {
    geometry: merged,
    height: 0.48,
    radius: 0.55,
  };
}

/**
 * Prototype: Small Forest Soil Pebble/Stone
 */
export function buildRockSmallPrototype() {
  const geom = new THREE.DodecahedronGeometry(0.32, 1);
  geom.scale(1.15, 0.65, 0.95);
  perturbVertices(geom, 0.05, 3.0);
  return {
    geometry: geom,
    height: 0.42,
    radius: 0.35,
  };
}

/**
 * Prototype: Medium Weathered Woodland Rock
 */
export function buildRockMediumPrototype() {
  const geom = new THREE.DodecahedronGeometry(0.75, 1);
  geom.scale(1.2, 0.75, 0.95);
  perturbVertices(geom, 0.12, 2.2);
  return {
    geometry: geom,
    height: 0.95,
    radius: 0.85,
  };
}

/**
 * Prototype: Large Forest Boulder / Outcrop Rock
 */
export function buildRockLargePrototype() {
  const geom = new THREE.DodecahedronGeometry(1.45, 1);
  geom.scale(1.25, 0.82, 1.1);
  perturbVertices(geom, 0.22, 1.6);
  return {
    geometry: geom,
    height: 1.75,
    radius: 1.65,
  };
}

/**
 * Prototype: Twisted Fallen Deadwood Branch
 */
export function buildBranchCurvedPrototype() {
  const parts = [];

  // Main branch shaft
  const mainBranch = new THREE.CylinderGeometry(0.04, 0.07, 2.2, 5);
  mainBranch.rotateZ(Math.PI / 2);
  mainBranch.translate(1.1, 0.06, 0);
  perturbVertices(mainBranch, 0.04, 3.5);
  parts.push(mainBranch);

  // Twig 1
  const twig1 = new THREE.CylinderGeometry(0.02, 0.035, 0.7, 4);
  twig1.rotateZ(Math.PI / 4);
  twig1.translate(0.8, 0.08, 0.25);
  parts.push(twig1);

  // Twig 2
  const twig2 = new THREE.CylinderGeometry(0.015, 0.03, 0.55, 4);
  twig2.rotateZ(-Math.PI / 5);
  twig2.translate(1.6, 0.07, -0.2);
  parts.push(twig2);

  const merged = safeMergeGeometries(parts);
  return {
    geometry: merged,
    height: 0.25,
    radius: 1.2,
  };
}

/**
 * Prototype: Straight Fallen Branch
 */
export function buildBranchStraightPrototype() {
  const geom = new THREE.CylinderGeometry(0.035, 0.06, 1.7, 5);
  geom.rotateZ(Math.PI / 2);
  geom.translate(0.85, 0.05, 0);
  perturbVertices(geom, 0.03, 4.0);
  return {
    geometry: geom,
    height: 0.15,
    radius: 0.9,
  };
}

/**
 * Prototype: Large Fallen Tree Trunk / Log
 */
export function buildFallenLogLargePrototype() {
  const geom = new THREE.CylinderGeometry(0.32, 0.48, 6.2, 7, 3);
  geom.rotateZ(Math.PI / 2);
  geom.translate(3.1, 0.40, 0);
  perturbVertices(geom, 0.09, 1.8);
  return {
    geometry: geom,
    height: 0.85,
    radius: 3.2,
  };
}

/**
 * Prototype: Medium Weathered Mossy Dead Log
 */
export function buildFallenLogMediumPrototype() {
  const geom = new THREE.CylinderGeometry(0.24, 0.36, 4.2, 6, 2);
  geom.rotateZ(Math.PI / 2);
  geom.translate(2.1, 0.30, 0);
  perturbVertices(geom, 0.07, 2.2);
  return {
    geometry: geom,
    height: 0.65,
    radius: 2.2,
  };
}

/**
 * Procedurally generates a weathered granite rock texture with moss tints.
 * @param {number} [size=256]
 * @returns {THREE.CanvasTexture | null}
 */
export function createRockTexture(size = 256) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Base stone grey-brown
  ctx.fillStyle = '#655e56';
  ctx.fillRect(0, 0, size, size);

  // Micro-granite grain
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 45;
    const moss = Math.random() > 0.65 ? Math.random() * 20 : 0;
    data[i] = Math.min(255, Math.max(0, data[i] + grain - moss * 0.3));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain + moss));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain - moss * 0.2));
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // Organic lichen/moss patches
  for (let j = 0; j < 25; j++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 10 + Math.random() * 30;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(92, 108, 76, 0.4)');
    grad.addColorStop(1, 'rgba(101, 94, 86, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Creates physically based materials for all forest-floor assets.
 * @param {number} [maxAnisotropy=8]
 */
export function createForestFloorMaterials(maxAnisotropy = 8) {
  const rockMap = createRockTexture(256);
  if (rockMap && maxAnisotropy > 1) {
    rockMap.anisotropy = Math.min(maxAnisotropy, 16);
  }

  // 1. Woodland Grass Material (Natural muted green)
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a6534,
    roughness: 0.80,
    metalness: 0.01,
    side: THREE.DoubleSide,
  });

  // 2. Fern Material (Deep, lush shade green)
  const fernMaterial = new THREE.MeshStandardMaterial({
    color: 0x2e4a26,
    roughness: 0.78,
    metalness: 0.01,
    side: THREE.DoubleSide,
  });

  // 3. Rock Material (Granite earth stone)
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x6e665d,
    roughness: 0.94,
    metalness: 0.02,
    map: rockMap,
    bumpMap: rockMap,
    bumpScale: 0.04,
  });

  // 4. Deadwood & Log Material (Weathered wood)
  const deadwoodMaterial = new THREE.MeshStandardMaterial({
    color: 0x56493c,
    roughness: 0.92,
    metalness: 0.02,
  });

  return {
    textures: { rockMap },
    materials: {
      [FLOOR_SPECIES.GRASS_SMALL]: grassMaterial,
      [FLOOR_SPECIES.GRASS_MEDIUM]: grassMaterial,
      [FLOOR_SPECIES.GRASS_TALL]: grassMaterial,
      [FLOOR_SPECIES.FERN_COMMON]: fernMaterial,
      [FLOOR_SPECIES.FERN_BROAD]: fernMaterial,
      [FLOOR_SPECIES.FERN_COMPACT]: fernMaterial,
      [FLOOR_SPECIES.ROCK_SMALL]: rockMaterial,
      [FLOOR_SPECIES.ROCK_MEDIUM]: rockMaterial,
      [FLOOR_SPECIES.ROCK_LARGE]: rockMaterial,
      [FLOOR_SPECIES.BRANCH_CURVED]: deadwoodMaterial,
      [FLOOR_SPECIES.BRANCH_STRAIGHT]: deadwoodMaterial,
      [FLOOR_SPECIES.FALLEN_LOG_LARGE]: deadwoodMaterial,
      [FLOOR_SPECIES.FALLEN_LOG_MEDIUM]: deadwoodMaterial,
    },
    dispose: () => {
      if (rockMap) rockMap.dispose();
      grassMaterial.dispose();
      fernMaterial.dispose();
      rockMaterial.dispose();
      deadwoodMaterial.dispose();
    },
  };
}
