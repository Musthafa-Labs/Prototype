/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { VEGETATION_SPECIES } from './vegetationDistribution.js';

// ============================================================================
// HIGH-FIDELITY PROCEDURAL PROCEDURES FOR NATURAL BARK & LEAF TEXTURES
// ============================================================================

/**
 * Procedurally generates rugged oak bark texture with deep vertical fissures,
 * weathered grey-brown bark plates, subtle moss/lichen undertones, and specular variation.
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

  // 1. Weathered charcoal-brown base tone
  ctx.fillStyle = '#3a2d22';
  ctx.fillRect(0, 0, size, size);

  // 2. Vertical bark ridges & fissures
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Meandering vertical fissures
      const meander = Math.sin(y * 0.035) * 8.0 + Math.cos(y * 0.07) * 4.0;
      const xMod = (x + meander) % size;
      const fissure = Math.sin(xMod * 0.14 + Math.sin(y * 0.04) * 3.2);
      const grain = (Math.random() - 0.5) * 30;
      const shadow = fissure < -0.25 ? -55 : (fissure > 0.3 ? 42 : fissure * 25);

      const r = Math.min(255, Math.max(0, 96 + shadow + grain));
      const g = Math.min(255, Math.max(0, 76 + shadow * 0.88 + grain));
      const b = Math.min(255, Math.max(0, 58 + shadow * 0.68 + grain));

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Lichen & weathered grey/green patches
  for (let i = 0; i < 40; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const rad = 8 + Math.random() * 24;
    const grad = ctx.createRadialGradient(px, py, 0, px, py, rad);
    grad.addColorStop(0, 'rgba(112, 130, 96, 0.45)');
    grad.addColorStop(1, 'rgba(58, 45, 34, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.0, 5.0);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Procedurally generates Scots Pine bark texture:
 * Warm cinnamon/amber-orange flaky diamond bark for upper branches and limbs,
 * transitioning to rugged dark furrowed bark at base.
 *
 * @param {number} [size=512]
 * @returns {THREE.CanvasTexture | null}
 */
export function createPineBarkTexture(size = 512) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#6b3a20';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    const heightFactor = y / size;
    const baseR = 155 * heightFactor + 80 * (1 - heightFactor);
    const baseG = 82 * heightFactor + 52 * (1 - heightFactor);
    const baseB = 46 * heightFactor + 38 * (1 - heightFactor);

    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const p1 = Math.sin(x * 0.12 + y * 0.08);
      const p2 = Math.cos(x * 0.12 - y * 0.08);
      const flake = (p1 * p2) * 38;
      const noise = (Math.random() - 0.5) * 22;

      const r = Math.min(255, Math.max(0, baseR + flake + noise));
      const g = Math.min(255, Math.max(0, baseG + flake * 0.8 + noise));
      const b = Math.min(255, Math.max(0, baseB + flake * 0.5 + noise));

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.0, 6.0);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Procedurally generates Silver Birch bark texture with characteristic chalky white paper surface,
 * horizontal dark lenticels, paper curls, and rough dark fissures.
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

  ctx.fillStyle = '#e8e5dc';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  ctx.fillStyle = '#1c1814';
  for (let j = 0; j < 130; j++) {
    const bx = Math.random() * size;
    const by = Math.random() * size;
    const width = 8 + Math.random() * 34;
    const height = 1.2 + Math.random() * 3.4;

    ctx.beginPath();
    ctx.ellipse(bx, by, width, height, (Math.random() - 0.5) * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let k = 0; k < 20; k++) {
    const bx = Math.random() * size;
    const by = Math.random() * size * 0.35 + size * 0.65;
    ctx.fillStyle = 'rgba(24, 20, 16, 0.9)';
    ctx.fillRect(bx, by, 5 + Math.random() * 8, 12 + Math.random() * 26);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 5.0);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Procedurally generates high-definition deciduous leaf-spray texture with transparent background.
 * Draws dozens of natural leaf blades with veins, stems, and chlorophyll translucency.
 *
 * @param {number} [size=512]
 * @returns {THREE.CanvasTexture | null}
 */
export function createDeciduousFoliageTexture(size = 512) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);

  // Central woody branch twigs
  ctx.strokeStyle = '#4e3b2b';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.98);
  ctx.quadraticCurveTo(size * 0.48, size * 0.5, size * 0.5, size * 0.05);
  ctx.stroke();

  // Secondary sub-twigs
  const twigBranches = [
    { x0: size * 0.49, y0: size * 0.78, x1: size * 0.16, y1: size * 0.52 },
    { x0: size * 0.49, y0: size * 0.72, x1: size * 0.84, y1: size * 0.48 },
    { x0: size * 0.50, y0: size * 0.52, x1: size * 0.22, y1: size * 0.28 },
    { x0: size * 0.50, y0: size * 0.44, x1: size * 0.80, y1: size * 0.22 },
    { x0: size * 0.50, y0: size * 0.28, x1: size * 0.32, y1: size * 0.10 },
    { x0: size * 0.50, y0: size * 0.22, x1: size * 0.70, y1: size * 0.08 },
  ];

  ctx.lineWidth = 4;
  twigBranches.forEach((tw) => {
    ctx.beginPath();
    ctx.moveTo(tw.x0, tw.y0);
    ctx.quadraticCurveTo((tw.x0 + tw.x1) * 0.5, tw.y0 - 22, tw.x1, tw.y1);
    ctx.stroke();
  });

  function drawLeaf(x, y, length, width, angle, greenTone) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-width * 0.75, length * 0.35, -width * 0.75, length * 0.75, 0, length);
    ctx.bezierCurveTo(width * 0.75, length * 0.75, width * 0.75, length * 0.35, 0, 0);
    ctx.closePath();

    const grad = ctx.createLinearGradient(-width * 0.5, 0, width * 0.5, length);
    grad.addColorStop(0, greenTone.base);
    grad.addColorStop(0.5, greenTone.mid);
    grad.addColorStop(1, greenTone.edge);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = greenTone.vein;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, length * 0.92);
    ctx.stroke();

    ctx.restore();
  }

  const greenTones = [
    { base: '#365a24', mid: '#4d7833', edge: '#679d42', vein: '#7cb350' },
    { base: '#3d6329', mid: '#578539', edge: '#72a946', vein: '#87bf56' },
    { base: '#2f4e1f', mid: '#446e2e', edge: '#598f3a', vein: '#6da346' },
    { base: '#456b2e', mid: '#5f903e', edge: '#78b34a', vein: '#90c65f' },
  ];

  // Draw 60+ overlapping natural leaf blades covering the armature
  const leafNodes = [
    { x: size * 0.5, y: size * 0.90, len: 48, w: 28, a: -0.6 },
    { x: size * 0.5, y: size * 0.86, len: 50, w: 30, a: 0.65 },
    { x: size * 0.5, y: size * 0.78, len: 52, w: 30, a: -0.85 },
    { x: size * 0.5, y: size * 0.72, len: 54, w: 32, a: 0.9 },
    { x: size * 0.5, y: size * 0.62, len: 55, w: 32, a: -0.5 },
    { x: size * 0.5, y: size * 0.56, len: 52, w: 30, a: 0.55 },
    { x: size * 0.5, y: size * 0.46, len: 48, w: 28, a: -0.7 },
    { x: size * 0.5, y: size * 0.40, len: 48, w: 28, a: 0.75 },
    { x: size * 0.5, y: size * 0.30, len: 44, w: 26, a: -0.4 },
    { x: size * 0.5, y: size * 0.24, len: 42, w: 25, a: 0.45 },
    { x: size * 0.5, y: size * 0.14, len: 40, w: 24, a: -0.2 },
    { x: size * 0.5, y: size * 0.08, len: 38, w: 22, a: 0.1 },

    { x: size * 0.40, y: size * 0.68, len: 46, w: 28, a: -1.2 },
    { x: size * 0.30, y: size * 0.60, len: 48, w: 29, a: -1.4 },
    { x: size * 0.20, y: size * 0.54, len: 50, w: 30, a: -1.7 },
    { x: size * 0.12, y: size * 0.48, len: 44, w: 26, a: -2.0 },
    { x: size * 0.18, y: size * 0.42, len: 46, w: 28, a: -1.5 },
    { x: size * 0.28, y: size * 0.46, len: 45, w: 26, a: -1.0 },

    { x: size * 0.60, y: size * 0.64, len: 46, w: 28, a: 1.2 },
    { x: size * 0.70, y: size * 0.56, len: 48, w: 29, a: 1.4 },
    { x: size * 0.80, y: size * 0.50, len: 50, w: 30, a: 1.7 },
    { x: size * 0.88, y: size * 0.44, len: 44, w: 26, a: 2.0 },
    { x: size * 0.82, y: size * 0.38, len: 46, w: 28, a: 1.5 },
    { x: size * 0.72, y: size * 0.42, len: 45, w: 26, a: 1.0 },

    { x: size * 0.42, y: size * 0.40, len: 44, w: 26, a: -1.1 },
    { x: size * 0.32, y: size * 0.32, len: 46, w: 28, a: -1.4 },
    { x: size * 0.22, y: size * 0.24, len: 42, w: 25, a: -1.8 },
    { x: size * 0.28, y: size * 0.18, len: 40, w: 24, a: -1.3 },

    { x: size * 0.58, y: size * 0.34, len: 44, w: 26, a: 1.1 },
    { x: size * 0.68, y: size * 0.26, len: 46, w: 28, a: 1.4 },
    { x: size * 0.78, y: size * 0.18, len: 42, w: 25, a: 1.8 },
    { x: size * 0.72, y: size * 0.14, len: 40, w: 24, a: 1.3 },
  ];

  leafNodes.forEach((node, idx) => {
    const tone = greenTones[idx % greenTones.length];
    drawLeaf(node.x, node.y, node.len, node.w, node.a, tone);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Procedurally generates high-definition conifer pine needle spray texture with transparent background.
 *
 * @param {number} [size=512]
 * @returns {THREE.CanvasTexture | null}
 */
export function createPineNeedleTexture(size = 512) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);

  ctx.strokeStyle = '#5a3d28';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.98);
  ctx.lineTo(size * 0.5, size * 0.05);
  ctx.stroke();

  ctx.lineWidth = 2.0;
  const needleColors = ['#284725', '#33592f', '#3f6c3a', '#4c7f46', '#598e53'];

  for (let i = 0; i < 520; i++) {
    const t = Math.random();
    const cy = size * 0.95 - t * size * 0.88;
    const cx = size * 0.5 + (Math.random() - 0.5) * 14;

    const side = Math.random() < 0.5 ? -1 : 1;
    const angle = (side * (0.35 + Math.random() * 0.85)) - Math.PI * 0.5;
    const length = 42 + Math.random() * 58;

    const x2 = cx + Math.cos(angle) * length;
    const y2 = cy + Math.sin(angle) * length;

    ctx.strokeStyle = needleColors[Math.floor(Math.random() * needleColors.length)];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + Math.cos(angle) * length * 0.5 + side * 5, cy + Math.sin(angle) * length * 0.5 - 2, x2, y2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  return texture;
}

export function createFoliageTexture(size = 512) {
  return createDeciduousFoliageTexture(size);
}

// ============================================================================
// GEOMETRY GENERATORS: TRUNKS, BRANCHES & FOLIAGE SPRAYS
// ============================================================================

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

export function perturbGeometryVertices(geom, amplitude = 0.25, freq = 1.5) {
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
 * Constructs a tapered, organic 3D branch limb along a smooth quadratic 3D bezier curve.
 *
 * @param {THREE.Vector3} p0 - Branch base position.
 * @param {THREE.Vector3} p1 - Branch tip position.
 * @param {THREE.Vector3} pCtrl - Bezier control point determining curvature and bend.
 * @param {number} r0 - Starting radius at base.
 * @param {number} r1 - Ending radius at tip.
 * @param {number} [radialSegs=6] - Number of radial segments.
 * @param {number} [lengthSegs=4] - Slices along length.
 * @param {number} [fluting=0.06] - Fluting variation.
 * @returns {THREE.BufferGeometry}
 */
export function createBranchLimb(
  p0,
  p1,
  pCtrl,
  r0,
  r1,
  radialSegs = 6,
  lengthSegs = 4,
  fluting = 0.06
) {
  const positions = [];
  const uvs = [];
  const indices = [];

  const upGuide = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= lengthSegs; i++) {
    const t = i / lengthSegs;
    const oneMinusT = 1.0 - t;

    const px = oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * pCtrl.x + t * t * p1.x;
    const py = oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * pCtrl.y + t * t * p1.y;
    const pz = oneMinusT * oneMinusT * p0.z + 2 * oneMinusT * t * pCtrl.z + t * t * p1.z;

    const tx = 2 * oneMinusT * (pCtrl.x - p0.x) + 2 * t * (p1.x - pCtrl.x);
    const ty = 2 * oneMinusT * (pCtrl.y - p0.y) + 2 * t * (p1.y - pCtrl.y);
    const tz = 2 * oneMinusT * (pCtrl.z - p0.z) + 2 * t * (p1.z - pCtrl.z);
    const tangent = new THREE.Vector3(tx, ty, tz).normalize();

    let normal = new THREE.Vector3().crossVectors(tangent, upGuide);
    if (normal.lengthSq() < 0.001) {
      normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(1, 0, 0));
    }
    normal.normalize();
    const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

    const radius = r0 * (1.0 - t) + r1 * t;

    for (let j = 0; j <= radialSegs; j++) {
      const angle = (j / radialSegs) * Math.PI * 2;
      const rMod = radius * (1.0 + Math.sin(angle * 3 + t * 4.0) * fluting);

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const vx = px + (normal.x * cosA + binormal.x * sinA) * rMod;
      const vy = py + (normal.y * cosA + binormal.y * sinA) * rMod;
      const vz = pz + (normal.z * cosA + binormal.z * sinA) * rMod;

      positions.push(vx, vy, vz);
      uvs.push(j / radialSegs, t * 2.5);
    }
  }

  for (let i = 0; i < lengthSegs; i++) {
    const row1 = i * (radialSegs + 1);
    const row2 = (i + 1) * (radialSegs + 1);

    for (let j = 0; j < radialSegs; j++) {
      const a = row1 + j;
      const b = row1 + j + 1;
      const c = row2 + j + 1;
      const d = row2 + j;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates a smooth, continuous natural tree trunk with gentle muscular root flare
 * at ground level. Smooth linear taper ensures NO hourglass waist pinch.
 *
 * @param {THREE.Vector3} pBase - Ground position (y = 0).
 * @param {THREE.Vector3} pTop - Top trunk position.
 * @param {THREE.Vector3} pCtrl - Midpoint curvature control point.
 * @param {number} rBase - Base trunk radius.
 * @param {number} rTop - Top trunk radius.
 * @param {number} [flareRatio=0.25] - Gentle ground root flare ratio.
 * @param {number} [radialSegs=8]
 * @param {number} [lengthSegs=7]
 * @returns {THREE.BufferGeometry}
 */
export function createSmoothTrunkWithFlare(
  pBase,
  pTop,
  pCtrl,
  rBase,
  rTop,
  flareRatio = 0.25,
  radialSegs = 8,
  lengthSegs = 7
) {
  const positions = [];
  const uvs = [];
  const indices = [];

  const upGuide = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= lengthSegs; i++) {
    const t = i / lengthSegs;
    const oneMinusT = 1.0 - t;

    const px = oneMinusT * oneMinusT * pBase.x + 2 * oneMinusT * t * pCtrl.x + t * t * pTop.x;
    const py = oneMinusT * oneMinusT * pBase.y + 2 * oneMinusT * t * pCtrl.y + t * t * pTop.y;
    const pz = oneMinusT * oneMinusT * pBase.z + 2 * oneMinusT * t * pCtrl.z + t * t * pTop.z;

    const tx = 2 * oneMinusT * (pCtrl.x - pBase.x) + 2 * t * (pTop.x - pCtrl.x);
    const ty = 2 * oneMinusT * (pCtrl.y - pBase.y) + 2 * t * (pTop.y - pCtrl.y);
    const tz = 2 * oneMinusT * (pCtrl.z - pBase.z) + 2 * t * (pTop.z - pCtrl.z);
    const tangent = new THREE.Vector3(tx, ty, tz).normalize();

    let normal = new THREE.Vector3().crossVectors(tangent, upGuide);
    if (normal.lengthSq() < 0.001) {
      normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(1, 0, 0));
    }
    normal.normalize();
    const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

    // Natural linear taper: steadily narrows with height
    const baseR = rBase * (1.0 - t) + rTop * t;

    // Gentle root flare only at bottom 20% of trunk
    const flareT = Math.max(0, 1.0 - (t / 0.35));
    const flare = rBase * flareRatio * Math.pow(flareT, 2);

    for (let j = 0; j <= radialSegs; j++) {
      const angle = (j / radialSegs) * Math.PI * 2;
      const buttress = Math.pow(Math.cos(angle * 2.0), 2) * flare;
      const fluting = Math.sin(angle * 3.0 + t * 4.0) * (baseR * 0.04);

      const r = baseR + buttress + fluting;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const vx = px + (normal.x * cosA + binormal.x * sinA) * r;
      const vy = py;
      const vz = pz + (normal.z * cosA + binormal.z * sinA) * r;

      positions.push(vx, vy, vz);
      uvs.push(j / radialSegs, t * 4.0);
    }
  }

  for (let i = 0; i < lengthSegs; i++) {
    const row1 = i * (radialSegs + 1);
    const row2 = (i + 1) * (radialSegs + 1);

    for (let j = 0; j < radialSegs; j++) {
      const a = row1 + j;
      const b = row1 + j + 1;
      const c = row2 + j + 1;
      const d = row2 + j;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

export function createTrunkWithRootFlare(pBase, pTop, pCtrl, rBase, rTop, flareSpread, buttressCount, radialSegs, lengthSegs) {
  return createSmoothTrunkWithFlare(pBase, pTop, pCtrl, rBase, rTop, 0.25, radialSegs, lengthSegs);
}

/**
 * Creates an authentic leaf spray / foliage card cluster with 3-4 intersecting cards.
 * With alphaTest: 0.30, renders as hundreds of individual leaves and needles with transparent gaps.
 *
 * @param {THREE.Vector3} center - Attachment position on branch.
 * @param {number} size - Width/height of the leaf spray.
 * @param {Object} [options]
 * @param {THREE.Vector3} [options.direction]
 * @param {boolean} [options.isConifer=false]
 * @param {number} [options.droop=0.0]
 * @returns {THREE.BufferGeometry}
 */
export function createFoliageSpray(
  center,
  size,
  options = {}
) {
  const {
    direction = new THREE.Vector3(1, 0, 0),
    isConifer = false,
    droop = 0.0,
  } = options;

  const sprayParts = [];
  const cardCount = 3;

  for (let c = 0; c < cardCount; c++) {
    const cardWidth = size * (isConifer ? 1.4 : 1.3);
    const cardHeight = size * (isConifer ? 0.8 : 1.1);

    const plane = new THREE.PlaneGeometry(cardWidth, cardHeight, 2, 2);

    const baseAngle = (c / cardCount) * Math.PI;
    plane.rotateY(baseAngle);
    plane.rotateX((c - 1) * 0.22);
    if (droop !== 0) {
      plane.rotateZ(droop * 0.35);
    }

    perturbGeometryVertices(plane, size * 0.10, 3.2);

    plane.translate(
      center.x + (Math.sin(c * 2.1) * size * 0.10),
      center.y + (Math.cos(c * 2.1) * size * 0.06) - (droop * 0.18),
      center.z + (Math.sin(c * 3.4) * size * 0.10)
    );

    sprayParts.push(plane);
  }

  // 4th Card: Arching horizontal cap plane
  const capPlane = new THREE.PlaneGeometry(size * 1.2, size * 1.2, 2, 2);
  capPlane.rotateX(-Math.PI * 0.5 + (droop * 0.2));
  capPlane.rotateZ(Math.random() * Math.PI);
  perturbGeometryVertices(capPlane, size * 0.08, 3.0);
  capPlane.translate(center.x, center.y + size * 0.12 - (droop * 0.12), center.z);
  sprayParts.push(capPlane);

  const merged = safeMergeGeometries(sprayParts);

  // Soften vertex normals outward from spray center (volumetric lighting)
  const pos = merged.attributes.position;
  const norms = merged.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);

    const dx = vx - center.x;
    const dy = vy - center.y;
    const dz = vz - center.z;
    const len = Math.hypot(dx, dy, dz) || 1.0;

    const nx = norms.getX(i) * 0.35 + (dx / len) * 0.65;
    const ny = norms.getY(i) * 0.35 + (dy / len) * 0.65;
    const nz = norms.getZ(i) * 0.35 + (dz / len) * 0.65;
    const nLen = Math.hypot(nx, ny, nz) || 1.0;

    norms.setXYZ(i, nx / nLen, ny / nLen, nz / nLen);
  }

  return merged;
}

export function createFoliageCluster(center, size, options = {}) {
  return createFoliageSpray(center, size, options);
}

// ============================================================================
// SPECIES 1: SCOTS PINE (Pinus sylvestris)
// ============================================================================

/**
 * Scots Pine: Tall, rugged conifer with bare lower trunk, reddish-cinnamon upper bark,
 * upward-reaching twisted limbs, and tiered horizontal needle pads with distinct sky gaps.
 */
export function buildScotsPinePrototype(options = {}) {
  const isSoftwareGl = Boolean(options.isSoftwareGl);
  const trunkParts = [];
  const foliageParts = [];

  // 1. Smooth Tapered Lower Trunk (0m to 9.2m) - Bare bole with rugged bark
  const lowerTrunk = createSmoothTrunkWithFlare(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.35, 9.2, 0.2),
    new THREE.Vector3(0.12, 4.6, -0.1),
    0.46,
    0.28,
    0.22,
    8,
    isSoftwareGl ? 5 : 7
  );
  trunkParts.push(lowerTrunk);

  // Upper trunk continuing into crown (9.2m to 16.5m)
  const upperTrunk = createBranchLimb(
    new THREE.Vector3(0.35, 9.2, 0.2),
    new THREE.Vector3(0.5, 16.5, 0.35),
    new THREE.Vector3(0.52, 12.8, 0.15),
    0.28,
    0.10,
    isSoftwareGl ? 5 : 6,
    4,
    0.06
  );
  trunkParts.push(upperTrunk);

  // 2. Branch Whorls & Needle Boughs (concentrated in upper crown 9.5m to 16.5m)
  const whorlTiers = [
    { y: 10.0, radius: 3.4, branches: 4, spraySize: 1.65, droop: -0.1 },
    { y: 11.8, radius: 3.1, branches: 4, spraySize: 1.55, droop: -0.05 },
    { y: 13.5, radius: 2.6, branches: 4, spraySize: 1.45, droop: 0.0 },
    { y: 15.0, radius: 2.0, branches: 3, spraySize: 1.35, droop: 0.05 },
    { y: 16.2, radius: 1.3, branches: 3, spraySize: 1.25, droop: 0.1 },
  ];

  whorlTiers.forEach((tier, tIdx) => {
    for (let b = 0; b < tier.branches; b++) {
      const angle = (b / tier.branches) * Math.PI * 2 + (tIdx * 0.75) + (b * 0.12);
      const dist = tier.radius * (0.88 + Math.sin(b * 3.1 + tIdx) * 0.16);

      const tipX = Math.cos(angle) * dist + 0.4;
      const tipZ = Math.sin(angle) * dist + 0.25;
      const tipY = tier.y + 0.45 + (Math.sin(b * 2) * 0.25);

      const basePos = new THREE.Vector3(0.35 + Math.cos(angle) * 0.18, tier.y, 0.25 + Math.sin(angle) * 0.18);
      const tipPos = new THREE.Vector3(tipX, tipY, tipZ);

      const ctrlPos = new THREE.Vector3(
        basePos.x + (tipX - basePos.x) * 0.55,
        basePos.y - 0.22,
        basePos.z + (tipZ - basePos.z) * 0.55
      );

      trunkParts.push(
        createBranchLimb(basePos, tipPos, ctrlPos, 0.11, 0.045, isSoftwareGl ? 4 : 5, 3, 0.06)
      );

      foliageParts.push(
        createFoliageSpray(tipPos, tier.spraySize, {
          direction: new THREE.Vector3(Math.cos(angle), 0.2, Math.sin(angle)),
          isConifer: true,
          droop: tier.droop,
        })
      );

      const midPos = new THREE.Vector3().lerpVectors(basePos, tipPos, 0.55);
      const subAngle = angle + 0.38;
      const subTip = new THREE.Vector3(
        midPos.x + Math.cos(subAngle) * 1.1,
        midPos.y + 0.2,
        midPos.z + Math.sin(subAngle) * 1.1
      );
      const subCtrl = new THREE.Vector3(
        (midPos.x + subTip.x) * 0.5,
        midPos.y - 0.05,
        (midPos.z + subTip.z) * 0.5
      );

      trunkParts.push(
        createBranchLimb(midPos, subTip, subCtrl, 0.05, 0.025, 3, 2, 0.05)
      );

      foliageParts.push(
        createFoliageSpray(subTip, tier.spraySize * 0.9, {
          direction: new THREE.Vector3(Math.cos(subAngle), 0.15, Math.sin(subAngle)),
          isConifer: true,
          droop: tier.droop,
        })
      );
    }
  });

  // Top Summit Needle Crown Spire
  foliageParts.push(
    createFoliageSpray(new THREE.Vector3(0.5, 17.0, 0.35), 1.5, {
      direction: new THREE.Vector3(0, 1, 0),
      isConifer: true,
    })
  );

  const mergedTrunk = safeMergeGeometries(trunkParts);
  const mergedFoliage = safeMergeGeometries(foliageParts);

  return {
    trunkGeometry: mergedTrunk,
    foliageGeometry: mergedFoliage,
    height: 17.6,
    crownRadius: 3.7,
  };
}

// ============================================================================
// SPECIES 2: MATURE WOODLAND OAK (Quercus robur)
// ============================================================================

/**
 * Mature Oak: Muscular trunk with smooth root flare and da Vinci cross-section conservation.
 * Horizontally spreading arching boughs, 60+ layered foliage sprays, and natural sky gaps.
 */
export function buildMatureOakPrototype(options = {}) {
  const isSoftwareGl = Boolean(options.isSoftwareGl);
  const trunkParts = [];
  const foliageParts = [];

  // Trunk rises in continuous stepped sections as major limbs branch off (Zero hourglass pinch!)
  // Section 1: Ground to first limb (0m to 3.5m)
  const trunkSec1 = createSmoothTrunkWithFlare(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.10, 3.5, 0.05),
    new THREE.Vector3(-0.08, 1.8, 0.04),
    0.80,
    0.72,
    0.28,
    8,
    isSoftwareGl ? 5 : 6
  );
  trunkParts.push(trunkSec1);

  // Section 2: First limb to second limb (3.5m to 4.8m)
  const trunkSec2 = createBranchLimb(
    new THREE.Vector3(0.10, 3.5, 0.05),
    new THREE.Vector3(0.14, 4.8, -0.06),
    new THREE.Vector3(0.12, 4.15, 0.0),
    0.68,
    0.58,
    isSoftwareGl ? 6 : 7,
    3,
    0.06
  );
  trunkParts.push(trunkSec2);

  // Section 3: Second limb to crown split (4.8m to 6.2m)
  const trunkSec3 = createBranchLimb(
    new THREE.Vector3(0.14, 4.8, -0.06),
    new THREE.Vector3(0.18, 6.2, -0.10),
    new THREE.Vector3(0.16, 5.5, -0.08),
    0.54,
    0.44,
    isSoftwareGl ? 6 : 7,
    3,
    0.06
  );
  trunkParts.push(trunkSec3);

  // Five Major Primary Spreading Limbs diverging at staggered heights
  const primaryBoughs = [
    {
      base: new THREE.Vector3(0.10, 3.5, 0.05),
      tip: new THREE.Vector3(4.5, 6.8, 2.2),
      ctrl: new THREE.Vector3(2.4, 4.6, 1.3),
      r0: 0.32,
      r1: 0.16,
    },
    {
      base: new THREE.Vector3(0.14, 4.8, -0.06),
      tip: new THREE.Vector3(-4.4, 6.6, 1.8),
      ctrl: new THREE.Vector3(-2.3, 4.8, 1.0),
      r0: 0.30,
      r1: 0.15,
    },
    {
      base: new THREE.Vector3(0.16, 5.5, -0.08),
      tip: new THREE.Vector3(1.8, 7.8, -4.4),
      ctrl: new THREE.Vector3(1.0, 6.0, -2.5),
      r0: 0.28,
      r1: 0.15,
    },
    {
      base: new THREE.Vector3(0.18, 6.2, -0.10),
      tip: new THREE.Vector3(-3.2, 8.2, -3.2),
      ctrl: new THREE.Vector3(-1.8, 6.4, -1.9),
      r0: 0.28,
      r1: 0.14,
    },
    {
      // Central ascending crown bough
      base: new THREE.Vector3(0.18, 6.2, -0.10),
      tip: new THREE.Vector3(0.25, 10.8, 0.15),
      ctrl: new THREE.Vector3(0.35, 8.4, 0.2),
      r0: 0.32,
      r1: 0.16,
    },
  ];

  primaryBoughs.forEach((bough, bIdx) => {
    trunkParts.push(
      createBranchLimb(
        bough.base,
        bough.tip,
        bough.ctrl,
        bough.r0,
        bough.r1,
        isSoftwareGl ? 5 : 6,
        3,
        0.06
      )
    );

    // Tip Spray
    foliageParts.push(
      createFoliageSpray(bough.tip, 2.3, {
        direction: new THREE.Vector3().subVectors(bough.tip, bough.base),
        isConifer: false,
      })
    );

    // Mid-limb Spray
    const midLimbPos = new THREE.Vector3().lerpVectors(bough.base, bough.tip, 0.58);
    foliageParts.push(
      createFoliageSpray(
        new THREE.Vector3(midLimbPos.x, midLimbPos.y + 0.35, midLimbPos.z),
        1.95,
        {
          direction: new THREE.Vector3().subVectors(bough.tip, bough.base),
          isConifer: false,
        }
      )
    );

    // Secondary & Tertiary Branching
    const secAngles = [0.48, -0.48];
    secAngles.forEach((secA, sIdx) => {
      const midPoint = new THREE.Vector3().lerpVectors(bough.base, bough.tip, 0.52);
      const boughDir = new THREE.Vector3().subVectors(bough.tip, bough.base).normalize();
      const perp = new THREE.Vector3(-boughDir.z, 0.3, boughDir.x).normalize();

      const secTip = new THREE.Vector3(
        midPoint.x + boughDir.x * 2.5 + perp.x * secA * 3.0,
        midPoint.y + 1.6 + sIdx * 0.4,
        midPoint.z + boughDir.z * 2.5 + perp.z * secA * 3.0
      );

      const secCtrl = new THREE.Vector3(
        (midPoint.x + secTip.x) * 0.5 + perp.x * secA * 0.4,
        midPoint.y + 0.8,
        (midPoint.z + secTip.z) * 0.5 + perp.z * secA * 0.4
      );

      trunkParts.push(
        createBranchLimb(
          midPoint,
          secTip,
          secCtrl,
          bough.r1 * 0.82,
          0.075,
          isSoftwareGl ? 4 : 5,
          2,
          0.05
        )
      );

      foliageParts.push(
        createFoliageSpray(secTip, 2.0, {
          direction: new THREE.Vector3().subVectors(secTip, midPoint),
          isConifer: false,
        })
      );

      // Tertiary Branchlet
      const tertTip = new THREE.Vector3(
        secTip.x + (Math.sin(bIdx * 3 + sIdx) * 1.4),
        secTip.y + 1.2,
        secTip.z + (Math.cos(bIdx * 3 + sIdx) * 1.4)
      );
      const tertCtrl = new THREE.Vector3(
        (secTip.x + tertTip.x) * 0.5,
        secTip.y + 0.5,
        (secTip.z + tertTip.z) * 0.5
      );

      trunkParts.push(
        createBranchLimb(secTip, tertTip, tertCtrl, 0.065, 0.025, 3, 2, 0.04)
      );

      foliageParts.push(
        createFoliageSpray(tertTip, 1.8, {
          direction: new THREE.Vector3().subVectors(tertTip, secTip),
          isConifer: false,
        })
      );
    });
  });

  // Crown Apex Summit Foliage Sprays (Broad arching oak crown dome)
  const summitNodes = [
    new THREE.Vector3(0.25, 12.0, 0.15),
    new THREE.Vector3(1.7, 11.2, 1.3),
    new THREE.Vector3(-1.5, 11.0, 1.1),
    new THREE.Vector3(0.8, 11.3, -1.6),
    new THREE.Vector3(-1.1, 11.5, -1.3),
    new THREE.Vector3(2.4, 9.6, -1.9),
    new THREE.Vector3(-2.4, 9.4, 2.0),
  ];

  summitNodes.forEach((node) => {
    foliageParts.push(
      createFoliageSpray(node, 2.2, {
        isConifer: false,
      })
    );
  });

  const mergedTrunk = safeMergeGeometries(trunkParts);
  const mergedFoliage = safeMergeGeometries(foliageParts);

  return {
    trunkGeometry: mergedTrunk,
    foliageGeometry: mergedFoliage,
    height: 15.0,
    crownRadius: 6.8,
  };
}

// ============================================================================
// SPECIES 3: SILVER BIRCH (Betula pendula)
// ============================================================================

/**
 * Silver Birch: Slender, graceful trunk with subtle S-curve, chalky white paper bark,
 * fine ascending limbs, pendulous weeping branchlets, and airy fluttering leaf sprays.
 */
export function buildSilverBirchPrototype(options = {}) {
  const isSoftwareGl = Boolean(options.isSoftwareGl);
  const trunkParts = [];
  const foliageParts = [];

  // Slender continuous mast (0m to 14.2m) with gentle S-curve
  const lowerTrunk = createSmoothTrunkWithFlare(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.38, 6.2, 0.2),
    new THREE.Vector3(-0.18, 3.1, -0.08),
    0.24,
    0.15,
    0.20,
    isSoftwareGl ? 6 : 7,
    isSoftwareGl ? 4 : 5
  );
  trunkParts.push(lowerTrunk);

  const upperTrunk = createBranchLimb(
    new THREE.Vector3(0.38, 6.2, 0.2),
    new THREE.Vector3(0.1, 14.0, 0.4),
    new THREE.Vector3(0.60, 10.1, 0.28),
    0.15,
    0.05,
    isSoftwareGl ? 5 : 6,
    4,
    0.04
  );
  trunkParts.push(upperTrunk);

  const birchBoughs = [
    { base: new THREE.Vector3(0.38, 6.8, 0.2), tip: new THREE.Vector3(2.2, 9.5, 1.3), ctrl: new THREE.Vector3(1.4, 7.9, 0.8), r0: 0.10, r1: 0.035 },
    { base: new THREE.Vector3(0.44, 7.9, 0.22), tip: new THREE.Vector3(-2.0, 10.4, 1.0), ctrl: new THREE.Vector3(-1.1, 8.7, 0.6), r0: 0.09, r1: 0.035 },
    { base: new THREE.Vector3(0.48, 9.2, 0.25), tip: new THREE.Vector3(1.5, 11.6, -1.7), ctrl: new THREE.Vector3(1.1, 10.2, -0.8), r0: 0.08, r1: 0.03 },
    { base: new THREE.Vector3(0.38, 10.8, 0.28), tip: new THREE.Vector3(-1.4, 12.7, -1.3), ctrl: new THREE.Vector3(-0.7, 11.5, -0.6), r0: 0.075, r1: 0.025 },
    { base: new THREE.Vector3(0.24, 12.2, 0.32), tip: new THREE.Vector3(0.9, 14.1, 0.7), ctrl: new THREE.Vector3(0.6, 12.9, 0.5), r0: 0.065, r1: 0.02 },
  ];

  birchBoughs.forEach((bough, bIdx) => {
    trunkParts.push(
      createBranchLimb(bough.base, bough.tip, bough.ctrl, bough.r0, bough.r1, 4, 3, 0.04)
    );

    foliageParts.push(
      createFoliageSpray(bough.tip, 1.6, {
        direction: new THREE.Vector3().subVectors(bough.tip, bough.base),
        isConifer: false,
        droop: 0.25,
      })
    );

    const weepTip = new THREE.Vector3(
      bough.tip.x + (bIdx % 2 === 0 ? 0.65 : -0.65),
      bough.tip.y - 0.9,
      bough.tip.z + 0.45
    );
    const weepCtrl = new THREE.Vector3(
      (bough.tip.x + weepTip.x) * 0.5,
      bough.tip.y + 0.1,
      (bough.tip.z + weepTip.z) * 0.5
    );
    trunkParts.push(
      createBranchLimb(bough.tip, weepTip, weepCtrl, 0.035, 0.015, 3, 2, 0.04)
    );

    foliageParts.push(
      createFoliageSpray(weepTip, 1.4, {
        direction: new THREE.Vector3(0, -1, 0),
        isConifer: false,
        droop: 0.4,
      })
    );
  });

  foliageParts.push(
    createFoliageSpray(new THREE.Vector3(0.1, 14.7, 0.4), 1.5, {
      direction: new THREE.Vector3(0, 1, 0),
      isConifer: false,
    })
  );

  const mergedTrunk = safeMergeGeometries(trunkParts);
  const mergedFoliage = safeMergeGeometries(foliageParts);

  return {
    trunkGeometry: mergedTrunk,
    foliageGeometry: mergedFoliage,
    height: 15.4,
    crownRadius: 3.0,
  };
}

// ============================================================================
// SPECIES 4: MOUNTAIN SPRUCE (Picea abies)
// ============================================================================

/**
 * Mountain Spruce: Dense alpine conifer with a prominent central trunk and 7-8 whorl tiers
 * of downward-sloping branches with upturned tips and tiered needle sprays.
 */
export function buildMountainSprucePrototype(options = {}) {
  const isSoftwareGl = Boolean(options.isSoftwareGl);
  const trunkParts = [];
  const foliageParts = [];

  const mainTrunk = createSmoothTrunkWithFlare(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.04, 15.8, -0.04),
    new THREE.Vector3(0.02, 7.9, -0.02),
    0.42,
    0.07,
    0.20,
    isSoftwareGl ? 6 : 7,
    isSoftwareGl ? 5 : 7
  );
  trunkParts.push(mainTrunk);

  const spruceTiers = [
    { y: 3.0, radius: 3.4, branches: 5, spraySize: 1.45, droop: -0.65 },
    { y: 5.0, radius: 3.0, branches: 5, spraySize: 1.40, droop: -0.55 },
    { y: 7.0, radius: 2.6, branches: 5, spraySize: 1.30, droop: -0.48 },
    { y: 9.0, radius: 2.2, branches: 4, spraySize: 1.20, droop: -0.40 },
    { y: 11.0, radius: 1.7, branches: 4, spraySize: 1.10, droop: -0.32 },
    { y: 12.8, radius: 1.3, branches: 4, spraySize: 1.00, droop: -0.24 },
    { y: 14.4, radius: 0.85, branches: 3, spraySize: 0.90, droop: -0.16 },
  ];

  spruceTiers.forEach((tier, tIdx) => {
    for (let b = 0; b < tier.branches; b++) {
      const angle = (b / tier.branches) * Math.PI * 2 + (tIdx * 0.65) + (b * 0.12);
      const dist = tier.radius * (0.88 + Math.sin(b * 2.7) * 0.14);

      const tipX = Math.cos(angle) * dist;
      const tipZ = Math.sin(angle) * dist;
      const tipY = tier.y + tier.droop;

      const basePos = new THREE.Vector3(0.02, tier.y, -0.02);
      const tipPos = new THREE.Vector3(tipX, tipY, tipZ);

      const ctrlPos = new THREE.Vector3(
        tipX * 0.58,
        tier.y + tier.droop * 0.85,
        tipZ * 0.58
      );

      trunkParts.push(
        createBranchLimb(basePos, tipPos, ctrlPos, 0.10, 0.03, isSoftwareGl ? 4 : 5, 2, 0.05)
      );

      foliageParts.push(
        createFoliageSpray(tipPos, tier.spraySize, {
          direction: new THREE.Vector3(Math.cos(angle), -0.25, Math.sin(angle)),
          isConifer: true,
          droop: 0.35,
        })
      );

      if (dist > 1.8) {
        const midPos = new THREE.Vector3().lerpVectors(basePos, tipPos, 0.52);
        foliageParts.push(
          createFoliageSpray(midPos, tier.spraySize * 0.88, {
            direction: new THREE.Vector3(Math.cos(angle), -0.2, Math.sin(angle)),
            isConifer: true,
            droop: 0.25,
          })
        );
      }
    }
  });

  foliageParts.push(
    createFoliageSpray(new THREE.Vector3(0.04, 16.1, -0.04), 1.3, {
      direction: new THREE.Vector3(0, 1, 0),
      isConifer: true,
    })
  );

  const mergedTrunk = safeMergeGeometries(trunkParts);
  const mergedFoliage = safeMergeGeometries(foliageParts);

  return {
    trunkGeometry: mergedTrunk,
    foliageGeometry: mergedFoliage,
    height: 16.6,
    crownRadius: 3.7,
  };
}

// ============================================================================
// SPECIES 5: UNDERSTORY BUSH / SHRUB
// ============================================================================

export function buildUnderstoryBushPrototype(options = {}) {
  const trunkParts = [];
  const foliageParts = [];

  const stems = [
    { p0: new THREE.Vector3(0, 0, 0), p1: new THREE.Vector3(0.9, 1.8, 0.4), pCtrl: new THREE.Vector3(0.4, 0.9, 0.2), r: 0.055 },
    { p0: new THREE.Vector3(0, 0, 0), p1: new THREE.Vector3(-0.8, 1.7, 0.5), pCtrl: new THREE.Vector3(-0.35, 0.85, 0.25), r: 0.05 },
    { p0: new THREE.Vector3(0, 0, 0), p1: new THREE.Vector3(0.3, 1.9, -0.8), pCtrl: new THREE.Vector3(0.15, 0.95, -0.4), r: 0.05 },
    { p0: new THREE.Vector3(0, 0, 0), p1: new THREE.Vector3(-0.6, 1.6, -0.6), pCtrl: new THREE.Vector3(-0.3, 0.8, -0.3), r: 0.045 },
    { p0: new THREE.Vector3(0, 0, 0), p1: new THREE.Vector3(0.1, 2.3, 0.1), pCtrl: new THREE.Vector3(0.05, 1.1, 0.05), r: 0.06 },
  ];

  stems.forEach((s) => {
    trunkParts.push(createBranchLimb(s.p0, s.p1, s.pCtrl, s.r, 0.02, 4, 3, 0.06));

    foliageParts.push(
      createFoliageSpray(s.p1, 1.3, {
        isConifer: false,
      })
    );
  });

  const mergedTrunk = safeMergeGeometries(trunkParts);
  const mergedFoliage = safeMergeGeometries(foliageParts);

  return {
    trunkGeometry: mergedTrunk,
    foliageGeometry: mergedFoliage,
    height: 2.6,
    crownRadius: 1.6,
  };
}

// ============================================================================
// SPECIES 6: LOW GROUNDCOVER SCRUB
// ============================================================================

export function buildLowScrubPrototype(options = {}) {
  const trunkParts = [];
  const foliageParts = [];

  const twigs = [
    { p0: new THREE.Vector3(0, 0, 0), p1: new THREE.Vector3(0.4, 0.7, 0.2), pCtrl: new THREE.Vector3(0.2, 0.35, 0.1) },
    { p0: new THREE.Vector3(0, 0, 0), p1: new THREE.Vector3(-0.4, 0.65, 0.2), pCtrl: new THREE.Vector3(-0.2, 0.3, 0.1) },
    { p0: new THREE.Vector3(0, 0, 0), p1: new THREE.Vector3(0.1, 0.75, -0.35), pCtrl: new THREE.Vector3(0.05, 0.38, -0.15) },
  ];

  twigs.forEach((tw) => {
    trunkParts.push(createBranchLimb(tw.p0, tw.p1, tw.pCtrl, 0.04, 0.015, 3, 2, 0.04));
    foliageParts.push(
      createFoliageSpray(tw.p1, 1.0, {
        isConifer: false,
      })
    );
  });

  const mergedTrunk = safeMergeGeometries(trunkParts);
  const mergedFoliage = safeMergeGeometries(foliageParts);

  return {
    trunkGeometry: mergedTrunk,
    foliageGeometry: mergedFoliage,
    height: 1.3,
    crownRadius: 1.3,
  };
}

// ============================================================================
// MATERIALS & SHADERS FOR AUTHENTIC LIGHT RESPONSE & BARK CHARACTER
// ============================================================================

/**
 * Material definitions for each species, ensuring physically based lighting response,
 * natural roughness, distinct bark character, transparent leaf cutouts, and lush non-saturated forest greens.
 *
 * @param {number} [maxAnisotropy=8]
 * @returns {{
 *   textures: Object,
 *   materials: Record<string, { trunk: THREE.Material, foliage: THREE.Material }>,
 *   dispose: () => void
 * }}
 */
export function createVegetationMaterials(maxAnisotropy = 8) {
  const oakBarkMap = createBarkTexture(512);
  const pineBarkMap = createPineBarkTexture(512);
  const birchBarkMap = createBirchBarkTexture(512);
  const deciduousFoliageMap = createDeciduousFoliageTexture(512);
  const pineNeedleMap = createPineNeedleTexture(512);

  if (maxAnisotropy > 1) {
    const aniso = Math.min(maxAnisotropy, 16);
    if (oakBarkMap) oakBarkMap.anisotropy = aniso;
    if (pineBarkMap) pineBarkMap.anisotropy = aniso;
    if (birchBarkMap) birchBarkMap.anisotropy = aniso;
    if (deciduousFoliageMap) deciduousFoliageMap.anisotropy = aniso;
    if (pineNeedleMap) pineNeedleMap.anisotropy = aniso;
  }

  // 1. Mature Oak Bark (Rugged deep charcoal-brown furrowed plates)
  const oakBarkMat = new THREE.MeshStandardMaterial({
    color: 0x5a483a,
    roughness: 0.92,
    metalness: 0.01,
    map: oakBarkMap,
    bumpMap: oakBarkMap,
    bumpScale: 0.05,
  });

  // 2. Scots Pine Bark (Warm cinnamon/amber flakes on upper boles, dark plates below)
  const pineBarkMat = new THREE.MeshStandardMaterial({
    color: 0x72452e,
    roughness: 0.88,
    metalness: 0.01,
    map: pineBarkMap,
    bumpMap: pineBarkMap,
    bumpScale: 0.045,
  });

  // 3. Silver Birch Bark (Luminous chalky paper-white with dark horizontal lenticels)
  const birchBarkMat = new THREE.MeshStandardMaterial({
    color: 0xe8e4dc,
    roughness: 0.82,
    metalness: 0.01,
    map: birchBarkMap,
    bumpMap: birchBarkMap,
    bumpScale: 0.035,
  });

  // 4. Mountain Spruce Bark (Deep weathered conifer timber)
  const spruceBarkMat = new THREE.MeshStandardMaterial({
    color: 0x4a3c32,
    roughness: 0.90,
    metalness: 0.01,
    map: oakBarkMap,
    bumpMap: oakBarkMap,
    bumpScale: 0.04,
  });

  // 5. Standard Understory Woody Stem Material
  const understoryBarkMat = new THREE.MeshStandardMaterial({
    color: 0x524337,
    roughness: 0.88,
    metalness: 0.01,
    map: oakBarkMap,
  });

  // 6. Scots Pine Needle Foliage (Rich evergreen needle bough with alpha cutout and warm subsurface chlorophyll)
  const scotsPineFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x46683c,
    emissive: 0x0f1c0d,
    roughness: 0.78,
    metalness: 0.01,
    map: pineNeedleMap,
    alphaTest: 0.28,
    side: THREE.DoubleSide,
  });

  // 7. Mature Oak Deciduous Foliage (Rich woodland chlorophyll green with leaf cutouts)
  const oakFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x4e7239,
    emissive: 0x11210f,
    roughness: 0.75,
    metalness: 0.01,
    map: deciduousFoliageMap,
    alphaTest: 0.28,
    side: THREE.DoubleSide,
  });

  // 8. Silver Birch Foliage (Airy, fresh vibrant lime/meadow green)
  const birchFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x628c42,
    emissive: 0x142610,
    roughness: 0.72,
    metalness: 0.01,
    map: deciduousFoliageMap,
    alphaTest: 0.28,
    side: THREE.DoubleSide,
  });

  // 9. Mountain Spruce Foliage (Deep alpine conifer fir)
  const spruceFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x335634,
    emissive: 0x0a170a,
    roughness: 0.80,
    metalness: 0.01,
    map: pineNeedleMap,
    alphaTest: 0.28,
    side: THREE.DoubleSide,
  });

  // 10. Understory Bush Foliage (Natural woodland shrub green)
  const understoryFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x547840,
    emissive: 0x122210,
    roughness: 0.76,
    metalness: 0.01,
    map: deciduousFoliageMap,
    alphaTest: 0.28,
    side: THREE.DoubleSide,
  });

  return {
    textures: {
      oakBarkMap,
      pineBarkMap,
      birchBarkMap,
      deciduousFoliageMap,
      pineNeedleMap,
      foliageMap: deciduousFoliageMap,
      barkMap: oakBarkMap,
    },
    materials: {
      [VEGETATION_SPECIES.SCOTS_PINE]: {
        trunk: pineBarkMat,
        foliage: scotsPineFoliageMat,
      },
      [VEGETATION_SPECIES.MATURE_OAK]: {
        trunk: oakBarkMat,
        foliage: oakFoliageMat,
      },
      [VEGETATION_SPECIES.SILVER_BIRCH]: {
        trunk: birchBarkMat,
        foliage: birchFoliageMat,
      },
      [VEGETATION_SPECIES.MOUNTAIN_SPRUCE]: {
        trunk: spruceBarkMat,
        foliage: spruceFoliageMat,
      },
      [VEGETATION_SPECIES.UNDERSTORY_BUSH]: {
        trunk: understoryBarkMat,
        foliage: understoryFoliageMat,
      },
      [VEGETATION_SPECIES.LOW_SCRUB]: {
        trunk: understoryBarkMat,
        foliage: understoryFoliageMat,
      },
    },
    dispose: () => {
      if (oakBarkMap) oakBarkMap.dispose();
      if (pineBarkMap) pineBarkMap.dispose();
      if (birchBarkMap) birchBarkMap.dispose();
      if (deciduousFoliageMap) deciduousFoliageMap.dispose();
      if (pineNeedleMap) pineNeedleMap.dispose();
      oakBarkMat.dispose();
      pineBarkMat.dispose();
      birchBarkMat.dispose();
      spruceBarkMat.dispose();
      understoryBarkMat.dispose();
      scotsPineFoliageMat.dispose();
      oakFoliageMat.dispose();
      birchFoliageMat.dispose();
      spruceFoliageMat.dispose();
      understoryFoliageMat.dispose();
    },
  };
}
