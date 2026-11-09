/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { VEGETATION_SPECIES } from './vegetationDistribution.js';

/**
 * Procedurally generates a natural rugged tree bark diffuse and bump texture using HTML5 Canvas.
 * Produces realistic vertical bark fissures, weathered ridges, and subtle moss undertones.
 *
 * @param {number} [size=512]
 * @returns {THREE.CanvasTexture | null}
 */
export function createBarkTexture(size = 512) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Dark weathered bark base tone
  ctx.fillStyle = '#42362b';
  ctx.fillRect(0, 0, size, size);

  // 2. Vertical bark ridges & fissures
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Vertical striation pattern
      const fissure = Math.sin(x * 0.18 + Math.sin(y * 0.05) * 4.0);
      const grain = (Math.random() - 0.5) * 35;
      const shadow = fissure < -0.3 ? -30 : fissure * 20;

      const r = Math.min(255, Math.max(0, 78 + shadow + grain));
      const g = Math.min(255, Math.max(0, 62 + shadow * 0.9 + grain));
      const b = Math.min(255, Math.max(0, 48 + shadow * 0.7 + grain));

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Lichen & weathered grey patches
  for (let i = 0; i < 40; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const rad = 8 + Math.random() * 25;
    const grad = ctx.createRadialGradient(px, py, 0, px, py, rad);
    grad.addColorStop(0, 'rgba(102, 112, 94, 0.35)');
    grad.addColorStop(1, 'rgba(66, 54, 43, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 4.0);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Procedurally generates silver birch bark texture with distinctive horizontal dark lenticel marks.
 *
 * @param {number} [size=512]
 * @returns {THREE.CanvasTexture | null}
 */
export function createBirchBarkTexture(size = 512) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Pale chalky white / pale silver-grey base
  ctx.fillStyle = '#dcd8cf';
  ctx.fillRect(0, 0, size, size);

  // Subtle paper grain
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 20;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  // Characteristic horizontal dark birch lenticels and rough rings
  ctx.fillStyle = '#2b2622';
  for (let j = 0; j < 90; j++) {
    const bx = Math.random() * size;
    const by = Math.random() * size;
    const width = 6 + Math.random() * 24;
    const height = 1.2 + Math.random() * 2.8;

    ctx.beginPath();
    ctx.ellipse(bx, by, width, height, (Math.random() - 0.5) * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.0, 3.5);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Procedurally generates foliage cluster noise texture to provide micro-variation on canopy lobes.
 *
 * @param {number} [size=256]
 * @returns {THREE.CanvasTexture | null}
 */
export function createFoliageTexture(size = 256) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#415934';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 45;
    const leafyShadow = Math.random() < 0.25 ? -35 : 0;
    data[i] = Math.min(255, Math.max(0, data[i] + n + leafyShadow));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n * 1.2 + leafyShadow * 0.8));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.9 + leafyShadow));
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Safely normalizes and merges an array of BufferGeometries into a single geometry.
 * Ensures consistent non-indexed representation and vertex attributes (position, normal, uv).
 * @param {THREE.BufferGeometry[]} geometries
 * @returns {THREE.BufferGeometry}
 */
export function safeMergeGeometries(geometries) {
  if (!geometries || geometries.length === 0) {
    throw new Error('safeMergeGeometries requires at least one geometry');
  }

  const normalized = geometries.map((g) => {
    const nonIndexed = g.index ? g.toNonIndexed() : g.clone();
    if (!nonIndexed.attributes.uv) {
      nonIndexed.setAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array(nonIndexed.attributes.position.count * 2), 2)
      );
    }
    return nonIndexed;
  });

  const merged = mergeGeometries(normalized);
  if (!merged) {
    throw new Error('BufferGeometryUtils.mergeGeometries returned null');
  }
  merged.computeVertexNormals();
  return merged;
}

/**
 * Perturbs geometry vertices with organic noise displacement to prevent artificial mathematical perfection.
 * @param {THREE.BufferGeometry} geom
 * @param {number} amplitude - Displacement strength in meters.
 * @param {number} [freq=1.5]
 */
function perturbGeometryVertices(geom, amplitude = 0.25, freq = 1.5) {
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const nx = Math.sin(y * freq * 2.1 + z * freq) * amplitude;
    const ny = Math.cos(x * freq + z * freq * 1.8) * (amplitude * 0.6);
    const nz = Math.sin(x * freq * 1.7 + y * freq * 1.3) * amplitude;

    pos.setXYZ(i, x + nx, y + ny, z + nz);
  }
  geom.computeVertexNormals();
}

/**
 * Prototype 1: Scots Pine (Pinus sylvestris)
 * Tall conifer with a sturdy, slightly curved trunk, bare lower bole, and tiered horizontal branch whorls
 * bearing tiered evergreen needle pads.
 */
export function buildScotsPinePrototype() {
  const trunkParts = [];
  const foliageParts = [];

  // Trunk: Height 15m, base radius 0.42m tapering to 0.12m
  const trunkHeight = 15.0;
  const trunkGeom = new THREE.CylinderGeometry(0.12, 0.44, trunkHeight, 8, 5);
  // Position so base is at y = 0
  trunkGeom.translate(0, trunkHeight / 2, 0);

  // Subtle organic sweep in trunk
  const trunkPos = trunkGeom.attributes.position;
  for (let i = 0; i < trunkPos.count; i++) {
    const y = trunkPos.getY(i);
    const sweep = Math.sin(y / trunkHeight * Math.PI) * 0.35;
    trunkPos.setX(i, trunkPos.getX(i) + sweep);
  }
  trunkParts.push(trunkGeom);

  // Root flare
  const rootFlare = new THREE.ConeGeometry(0.72, 0.8, 8, 1);
  rootFlare.translate(0, 0.4, 0);
  trunkParts.push(rootFlare);

  // Foliage whorls (5 tiers between 6.5m and 15m)
  const tiers = [
    { y: 7.2, radius: 2.8, lobes: 5, lobeR: 1.15, thickness: 0.65 },
    { y: 9.3, radius: 2.5, lobes: 5, lobeR: 1.05, thickness: 0.60 },
    { y: 11.4, radius: 2.1, lobes: 4, lobeR: 0.95, thickness: 0.55 },
    { y: 13.2, radius: 1.6, lobes: 4, lobeR: 0.85, thickness: 0.50 },
    { y: 14.8, radius: 0.9, lobes: 3, lobeR: 0.70, thickness: 0.60 },
  ];

  tiers.forEach((tier, tIdx) => {
    for (let l = 0; l < tier.lobes; l++) {
      const angle = (l / tier.lobes) * Math.PI * 2 + (tIdx * 0.65);
      const dist = tier.radius * (0.85 + Math.sin(l * 2) * 0.15);
      const lx = Math.cos(angle) * dist;
      const lz = Math.sin(angle) * dist;
      const ly = tier.y + (Math.sin(l) * 0.15);

      // Branch arm extending from trunk to foliage pad
      const branchGeom = new THREE.CylinderGeometry(0.04, 0.08, dist * 0.85, 4);
      branchGeom.translate(0, (dist * 0.85) / 2, 0);
      const dir = new THREE.Vector3(lx, -0.15, lz).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      branchGeom.applyQuaternion(quat);
      branchGeom.translate(0, tier.y, 0);
      trunkParts.push(branchGeom);

      // Smooth multi-faceted organic lobe (conifer needle pad)
      const lobe = new THREE.DodecahedronGeometry(tier.lobeR, 1);
      lobe.scale(1.25, tier.thickness, 1.05);
      perturbGeometryVertices(lobe, 0.12, 2.2);
      lobe.translate(lx, ly, lz);
      foliageParts.push(lobe);
    }
  });

  // Pine top spire
  const spire = new THREE.ConeGeometry(0.85, 1.8, 8, 2);
  spire.translate(0, 15.6, 0);
  perturbGeometryVertices(spire, 0.10, 2.0);
  foliageParts.push(spire);

  const mergedTrunk = safeMergeGeometries(trunkParts);
  const mergedFoliage = safeMergeGeometries(foliageParts);

  return {
    trunkGeometry: mergedTrunk,
    foliageGeometry: mergedFoliage,
    height: 16.5,
    crownRadius: 3.2,
  };
}

/**
 * Prototype 2: Mature Woodland Oak (Quercus robur)
 * Powerful muscular trunk with thick root flare, dividing into 3-4 spreading diagonal limbs,
 * supporting a grand, broad, irregular multi-domed deciduous canopy.
 */
export function buildMatureOakPrototype() {
  const trunkParts = [];
  const foliageParts = [];

  // Main Trunk: Height 6m, base radius 0.75m tapering to 0.45m
  const trunkGeom = new THREE.CylinderGeometry(0.48, 0.82, 6.0, 8, 4);
  trunkGeom.translate(0, 3.0, 0);
  trunkParts.push(trunkGeom);

  // Massive Root Flare
  const rootFlare = new THREE.ConeGeometry(1.25, 1.2, 8, 1);
  rootFlare.translate(0, 0.6, 0);
  trunkParts.push(rootFlare);

  // Spreading Major Limbs
  const limbs = [
    { dx: 2.2, dy: 3.5, dz: 1.2, r: 0.28, len: 4.2 },
    { dx: -2.0, dy: 3.2, dz: 1.5, r: 0.26, len: 3.9 },
    { dx: 0.5, dy: 3.8, dz: -2.3, r: 0.25, len: 4.1 },
    { dx: -1.2, dy: 4.0, dz: -1.8, r: 0.24, len: 3.8 },
  ];

  limbs.forEach((l) => {
    const limbGeom = new THREE.CylinderGeometry(l.r * 0.6, l.r, l.len, 6, 2);
    // Align limb along diagonal vector
    limbGeom.translate(0, l.len / 2, 0);
    const dir = new THREE.Vector3(l.dx, l.dy, l.dz).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    limbGeom.applyQuaternion(quat);
    limbGeom.translate(0, 5.0, 0);
    trunkParts.push(limbGeom);
  });

  // Canopy Domes (Clustered Organic Leaf Masses forming broad 12m crown)
  const canopyLobes = [
    { x: 0.0, y: 11.2, z: 0.0, r: 3.4, scaleY: 0.85 },   // Crown summit
    { x: 3.0, y: 8.5, z: 1.5, r: 2.9, scaleY: 0.80 },    // East bough
    { x: -2.8, y: 8.0, z: 2.0, r: 2.8, scaleY: 0.82 },   // West bough
    { x: 0.8, y: 8.8, z: -3.2, r: 3.0, scaleY: 0.78 },   // North bough
    { x: -1.8, y: 9.2, z: -2.2, r: 2.6, scaleY: 0.85 },  // North-west bough
    { x: 1.5, y: 9.8, z: 1.8, r: 2.7, scaleY: 0.88 },    // Infill cluster
    { x: -1.2, y: 10.5, z: 0.5, r: 2.8, scaleY: 0.90 },  // Center-west mass
  ];

  canopyLobes.forEach((cl) => {
    const dome = new THREE.DodecahedronGeometry(cl.r, 1);
    dome.scale(1.15, cl.scaleY, 1.05);
    perturbGeometryVertices(dome, cl.r * 0.16, 1.2);
    dome.translate(cl.x, cl.y, cl.z);
    foliageParts.push(dome);
  });

  const mergedTrunk = safeMergeGeometries(trunkParts);
  const mergedFoliage = safeMergeGeometries(foliageParts);

  return {
    trunkGeometry: mergedTrunk,
    foliageGeometry: mergedFoliage,
    height: 14.5,
    crownRadius: 5.5,
  };
}

/**
 * Prototype 3: Silver Birch / Aspen (Betula pendula)
 * Slender graceful trunk with subtle S-curve lean, pale bark, and an airy, high canopy with delicate hanging volumes.
 */
export function buildSilverBirchPrototype() {
  const trunkParts = [];
  const foliageParts = [];

  // Slender trunk: Height 12.5m, radius 0.22m tapering to 0.08m
  const trunkHeight = 12.5;
  const trunkGeom = new THREE.CylinderGeometry(0.08, 0.22, trunkHeight, 7, 5);
  trunkGeom.translate(0, trunkHeight / 2, 0);

  // S-curve lean in trunk
  const pos = trunkGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = y / trunkHeight;
    const curveX = Math.sin(t * Math.PI * 1.5) * 0.55;
    const curveZ = Math.cos(t * Math.PI) * 0.25;
    pos.setX(i, pos.getX(i) + curveX);
    pos.setZ(i, pos.getZ(i) + curveZ);
  }
  trunkParts.push(trunkGeom);

  // Delicate high foliage volumes (starting above 6m)
  const birchCanopyLobes = [
    { x: 0.4, y: 12.2, z: 0.1, rx: 1.5, ry: 1.9, rz: 1.4 },
    { x: 1.2, y: 10.4, z: 0.7, rx: 1.6, ry: 1.7, rz: 1.3 },
    { x: -0.8, y: 9.8, z: 0.4, rx: 1.4, ry: 1.6, rz: 1.3 },
    { x: 0.2, y: 8.5, z: -0.9, rx: 1.5, ry: 1.5, rz: 1.2 },
    { x: 0.9, y: 7.4, z: -0.3, rx: 1.2, ry: 1.4, rz: 1.1 },
  ];

  birchCanopyLobes.forEach((bcl) => {
    const lobe = new THREE.DodecahedronGeometry(1.0, 1);
    lobe.scale(bcl.rx, bcl.ry, bcl.rz);
    perturbGeometryVertices(lobe, 0.18, 1.8);
    lobe.translate(bcl.x, bcl.y, bcl.z);
    foliageParts.push(lobe);
  });

  const mergedTrunk = safeMergeGeometries(trunkParts);
  const mergedFoliage = safeMergeGeometries(foliageParts);

  return {
    trunkGeometry: mergedTrunk,
    foliageGeometry: mergedFoliage,
    height: 13.8,
    crownRadius: 2.4,
  };
}

/**
 * Prototype 4: Mountain Spruce (Picea abies)
 * Dense conical alpine conifer with overlapping downward-sloping branch tiers all the way to a sharp summit.
 */
export function buildMountainSprucePrototype() {
  const trunkParts = [];
  const foliageParts = [];

  // Central tapered trunk: Height 14.5m
  const trunkGeom = new THREE.CylinderGeometry(0.10, 0.38, 14.5, 7, 4);
  trunkGeom.translate(0, 7.25, 0);
  trunkParts.push(trunkGeom);

  // Downward-sloping conical conifer tiers (6 tiers)
  const spruceTiers = [
    { y: 3.5, r: 3.2, h: 2.2 },
    { y: 5.6, r: 2.7, h: 2.2 },
    { y: 7.7, r: 2.2, h: 2.0 },
    { y: 9.7, r: 1.8, h: 1.9 },
    { y: 11.6, r: 1.3, h: 1.8 },
    { y: 13.4, r: 0.8, h: 1.7 },
  ];

  spruceTiers.forEach((tier) => {
    // 8-sided cone with flared base creating drooping conifer branches
    const cone = new THREE.ConeGeometry(tier.r, tier.h, 8, 1);
    cone.translate(0, tier.y + tier.h * 0.4, 0);
    perturbGeometryVertices(cone, 0.15, 2.2);
    foliageParts.push(cone);
  });

  // Top spire tip
  const topTip = new THREE.ConeGeometry(0.45, 1.6, 6);
  topTip.translate(0, 14.8, 0);
  foliageParts.push(topTip);

  const mergedTrunk = safeMergeGeometries(trunkParts);
  const mergedFoliage = safeMergeGeometries(foliageParts);

  return {
    trunkGeometry: mergedTrunk,
    foliageGeometry: mergedFoliage,
    height: 15.6,
    crownRadius: 3.3,
  };
}

/**
 * Prototype 5: Forest Understory Bush / Shrub
 * Clustered multi-stem shrub filling the road verge and forest floor.
 */
export function buildUnderstoryBushPrototype() {
  const trunkParts = [];
  const foliageParts = [];

  // Low branching stems
  const stems = [
    { dx: 0.4, dy: 1.2, dz: 0.3, len: 1.3, r: 0.05 },
    { dx: -0.5, dy: 1.1, dz: 0.2, len: 1.2, r: 0.05 },
    { dx: 0.1, dy: 1.3, dz: -0.4, len: 1.4, r: 0.05 },
  ];

  stems.forEach((s) => {
    const stem = new THREE.CylinderGeometry(s.r * 0.7, s.r, s.len, 5);
    stem.translate(0, s.len / 2, 0);
    const dir = new THREE.Vector3(s.dx, s.dy, s.dz).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    stem.applyQuaternion(quat);
    trunkParts.push(stem);
  });

  // Clustered leafy lobes (dome spread ~2.6m, height ~2.0m)
  const bushLobes = [
    { x: 0.0, y: 1.3, z: 0.0, r: 1.1 },
    { x: 0.7, y: 1.0, z: 0.5, r: 0.85 },
    { x: -0.6, y: 0.95, z: 0.4, r: 0.80 },
    { x: 0.2, y: 1.1, z: -0.7, r: 0.90 },
    { x: -0.4, y: 1.0, z: -0.5, r: 0.75 },
  ];

  bushLobes.forEach((bl) => {
    const lobe = new THREE.DodecahedronGeometry(bl.r, 1);
    lobe.scale(1.15, 0.85, 1.05);
    perturbGeometryVertices(lobe, 0.10, 2.5);
    lobe.translate(bl.x, bl.y, bl.z);
    foliageParts.push(lobe);
  });

  const mergedTrunk = safeMergeGeometries(trunkParts);
  const mergedFoliage = safeMergeGeometries(foliageParts);

  return {
    trunkGeometry: mergedTrunk,
    foliageGeometry: mergedFoliage,
    height: 2.2,
    crownRadius: 1.5,
  };
}

/**
 * Prototype 6: Low Groundcover Scrub
 * Low spreading organic vegetation dome (height ~1.1m, spread ~2.0m) for road verges and forest glades.
 */
export function buildLowScrubPrototype() {
  const foliageParts = [];

  const scrubLobes = [
    { x: 0.0, y: 0.55, z: 0.0, rx: 1.1, ry: 0.65, rz: 1.0 },
    { x: 0.5, y: 0.45, z: 0.3, rx: 0.7, ry: 0.50, rz: 0.65 },
    { x: -0.4, y: 0.40, z: -0.3, rx: 0.65, ry: 0.45, rz: 0.60 },
  ];

  scrubLobes.forEach((sl) => {
    const lobe = new THREE.DodecahedronGeometry(0.8, 1);
    lobe.scale(sl.rx, sl.ry, sl.rz);
    perturbGeometryVertices(lobe, 0.10, 2.5);
    lobe.translate(sl.x, sl.y, sl.z);
    foliageParts.push(lobe);
  });

  // Dummy mini trunk for consistency
  const dummyTrunk = new THREE.CylinderGeometry(0.04, 0.06, 0.4, 4);
  dummyTrunk.translate(0, 0.2, 0);

  const mergedFoliage = safeMergeGeometries(foliageParts);
  dummyTrunk.computeVertexNormals();

  return {
    trunkGeometry: dummyTrunk,
    foliageGeometry: mergedFoliage,
    height: 1.2,
    crownRadius: 1.2,
  };
}

/**
 * Material definitions for each species, ensuring physically based lighting response,
 * natural roughness, distinct bark character, and non-saturated natural forest greens.
 */
export function createVegetationMaterials(maxAnisotropy = 8) {
  const barkMap = createBarkTexture(512);
  const birchBarkMap = createBirchBarkTexture(512);
  const foliageMap = createFoliageTexture(256);

  if (maxAnisotropy > 1) {
    if (barkMap) barkMap.anisotropy = Math.min(maxAnisotropy, 16);
    if (birchBarkMap) birchBarkMap.anisotropy = Math.min(maxAnisotropy, 16);
    if (foliageMap) foliageMap.anisotropy = Math.min(maxAnisotropy, 16);
  }

  // 1. Standard Conifer / Oak Rough Bark
  const standardBarkMat = new THREE.MeshStandardMaterial({
    color: 0x645140,
    roughness: 0.90,
    metalness: 0.02,
    map: barkMap,
    bumpMap: barkMap,
    bumpScale: 0.04,
  });

  // 2. Silver Birch Pale Bark
  const birchBarkMat = new THREE.MeshStandardMaterial({
    color: 0xdedad2,
    roughness: 0.85,
    metalness: 0.01,
    map: birchBarkMap,
    bumpMap: birchBarkMap,
    bumpScale: 0.03,
  });

  // 3. Scots Pine Needle Foliage (Rich Temperate Evergreen)
  const scotsPineFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x385735,
    roughness: 0.82,
    metalness: 0.01,
    map: foliageMap,
    side: THREE.DoubleSide,
  });

  // 4. Mature Oak Foliage (Rich Woodland Canopy Green)
  const oakFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x466636,
    roughness: 0.80,
    metalness: 0.01,
    map: foliageMap,
    side: THREE.DoubleSide,
  });

  // 5. Silver Birch Foliage (Airy Meadow-Green)
  const birchFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x5d7f42,
    roughness: 0.78,
    metalness: 0.01,
    map: foliageMap,
    side: THREE.DoubleSide,
  });

  // 6. Mountain Spruce Foliage (Deep Alpine Conifer Fir)
  const spruceFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x2a482b,
    roughness: 0.84,
    metalness: 0.01,
    map: foliageMap,
    side: THREE.DoubleSide,
  });

  // 7. Understory Bush Foliage (Natural Olive/Forest Undergrowth)
  const understoryFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x4a673c,
    roughness: 0.82,
    metalness: 0.01,
    map: foliageMap,
    side: THREE.DoubleSide,
  });

  return {
    textures: { barkMap, birchBarkMap, foliageMap },
    materials: {
      [VEGETATION_SPECIES.SCOTS_PINE]: {
        trunk: standardBarkMat,
        foliage: scotsPineFoliageMat,
      },
      [VEGETATION_SPECIES.MATURE_OAK]: {
        trunk: standardBarkMat,
        foliage: oakFoliageMat,
      },
      [VEGETATION_SPECIES.SILVER_BIRCH]: {
        trunk: birchBarkMat,
        foliage: birchFoliageMat,
      },
      [VEGETATION_SPECIES.MOUNTAIN_SPRUCE]: {
        trunk: standardBarkMat,
        foliage: spruceFoliageMat,
      },
      [VEGETATION_SPECIES.UNDERSTORY_BUSH]: {
        trunk: standardBarkMat,
        foliage: understoryFoliageMat,
      },
      [VEGETATION_SPECIES.LOW_SCRUB]: {
        trunk: standardBarkMat,
        foliage: understoryFoliageMat,
      },
    },
    dispose: () => {
      if (barkMap) barkMap.dispose();
      if (birchBarkMap) birchBarkMap.dispose();
      if (foliageMap) foliageMap.dispose();
      standardBarkMat.dispose();
      birchBarkMat.dispose();
      scotsPineFoliageMat.dispose();
      oakFoliageMat.dispose();
      birchFoliageMat.dispose();
      spruceFoliageMat.dispose();
      understoryFoliageMat.dispose();
    },
  };
}
