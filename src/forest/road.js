/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { ROAD_CONTROL_POINTS, getTerrainHeight } from './terrainElevation.js';

/**
 * Procedurally generates a realistic forest dirt/gravel road texture with:
 * - Compacted dark wheel ruts
 * - Raised center gravel strip
 * - Feathered organic soil transitions along the edges
 * @param {number} [width=512]
 * @param {number} [height=512]
 * @returns {THREE.CanvasTexture}
 */
function createProceduralRoadTexture(width = 512, height = 512) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Warm dirt & crushed gravel base tone
  ctx.fillStyle = '#6b6150';
  ctx.fillRect(0, 0, width, height);

  // 2. Micro-gravel and packed soil granularity
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const u = x / width; // 0 to 1 across road width

      // Wheel ruts: left rut at u = 0.28, right rut at u = 0.72
      const distLeftRut = Math.abs(u - 0.28);
      const distRightRut = Math.abs(u - 0.72);
      const isRut = Math.min(distLeftRut, distRightRut) < 0.12;

      // Granular noise
      const n = (Math.random() - 0.5) * 32;
      const rutDarkening = isRut ? -24 : 0;

      // Soft edge darkening to blend seamlessly with dark forest soil
      const edgeDist = Math.min(u, 1.0 - u); // 0 at edges, 0.5 at center
      const edgeBlend = Math.max(0, 1.0 - edgeDist * 3.5); // 1.0 at outer 15%, 0.0 towards center
      const edgeDarken = -edgeBlend * 32;

      data[idx] = Math.min(255, Math.max(0, data[idx] + n + rutDarkening + edgeDarken));
      data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + n * 0.9 + rutDarkening * 0.9 + edgeDarken));
      data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + n * 0.7 + rutDarkening * 0.8 + edgeDarken));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Compacted tire striations along the road
  ctx.fillStyle = 'rgba(68, 58, 46, 0.38)';
  for (let i = 0; i < 70; i++) {
    const rx = (Math.random() > 0.5 ? 0.28 : 0.72) * width + (Math.random() - 0.5) * 35;
    const ry = Math.random() * height;
    const rw = 14 + Math.random() * 22;
    const rh = 40 + Math.random() * 80;
    ctx.fillRect(rx - rw / 2, ry, rw, rh);
  }

  // 4. Center strip loose gravel & earth
  ctx.fillStyle = 'rgba(125, 115, 96, 0.45)';
  for (let k = 0; k < 140; k++) {
    const cx = (0.5 + (Math.random() - 0.5) * 0.2) * width;
    const cy = Math.random() * height;
    const cr = 1.5 + Math.random() * 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Irregular organic dirt patches along the borders
  ctx.fillStyle = 'rgba(54, 65, 46, 0.45)'; // forest loam tint
  for (let e = 0; e < 50; e++) {
    const isLeft = Math.random() > 0.5;
    const ex = isLeft ? Math.random() * 45 : width - Math.random() * 45;
    const ey = Math.random() * height;
    const er = 15 + Math.random() * 30;
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 55); // Tile along the 880m road length
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;

  return texture;
}

/**
 * Procedurally generates a gravel surface bump map for tactile off-road relief.
 * @param {number} [size=256]
 * @returns {THREE.CanvasTexture}
 */
function createProceduralRoadBump(size = 256) {
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
    const v = Math.min(255, Math.max(0, 128 + (Math.random() - 0.5) * 55));
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 55);
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Constructs the winding forest road ribbon geometry and PBR material.
 * Curves naturally through terrain contours, adheres directly to the graded roadbed,
 * and eliminates floating meshes via polygon offset and elevation conforming.
 *
 * @param {Object} [options]
 * @param {number} [options.roadWidth=5.4] - Total width of the road carriageway in meters.
 * @param {number} [options.subdivisions=350] - Longitudinal segments along the road spline.
 * @param {number} [options.crossSegments=4] - Transverse cross-section segments (5 vertices per row).
 * @param {number} [options.maxAnisotropy=8]
 * @returns {{
 *   mesh: THREE.Mesh,
 *   curve: THREE.CatmullRomCurve3,
 *   totalLength: number,
 *   updateQuality: (preset: Object) => void,
 *   dispose: () => void
 * }}
 */
export function createForestRoad(options = {}) {
  const {
    roadWidth = 5.4,
    subdivisions = 350,
    crossSegments = 4,
    maxAnisotropy = 8,
  } = options;

  // 1. Build 3D Catmull-Rom Spline from surveyed waypoints
  const points3D = ROAD_CONTROL_POINTS.map((pt) => {
    const y = getTerrainHeight(pt.x, pt.z);
    return new THREE.Vector3(pt.x, y, pt.z);
  });

  const curve = new THREE.CatmullRomCurve3(points3D, false, 'centripetal', 0.5);
  const totalLength = curve.getLength();

  // 2. Generate Ribbed Ribbon Geometry conforming to terrain
  const numRows = subdivisions + 1;
  const numCols = crossSegments + 1;
  const halfWidth = roadWidth / 2;

  const positions = new Float32Array(numRows * numCols * 3);
  const normals = new Float32Array(numRows * numCols * 3);
  const uvs = new Float32Array(numRows * numCols * 2);
  const indices = [];

  const crossFractions = [-1.0, -0.5, 0.0, 0.5, 1.0]; // Relative lateral offsets

  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3(0, 1, 0);
  const binormal = new THREE.Vector3();
  const samplePos = new THREE.Vector3();

  for (let i = 0; i <= subdivisions; i++) {
    const uCurve = i / subdivisions;
    curve.getPointAt(uCurve, samplePos);
    curve.getTangentAt(uCurve, tangent).normalize();

    // Binormal (horizontal lateral vector perpendicular to road direction)
    binormal.crossVectors(tangent, normal).normalize();

    for (let j = 0; j <= crossSegments; j++) {
      const vertIdx = i * numCols + j;
      const lateralFrac = crossFractions[j];
      const lateralOffset = lateralFrac * halfWidth;

      // World position of this road ribbon vertex
      const wx = samplePos.x + binormal.x * lateralOffset;
      const wz = samplePos.z + binormal.z * lateralOffset;

      // Sample exact terrain elevation at vertex location
      // Add subtle +0.035m baseline + center crown (tapering to 0 at edges)
      const crown = (1.0 - Math.abs(lateralFrac)) * 0.04;
      const wy = getTerrainHeight(wx, wz) + 0.035 + crown;

      // Vertex position
      positions[vertIdx * 3] = wx;
      positions[vertIdx * 3 + 1] = wy;
      positions[vertIdx * 3 + 2] = wz;

      // Vertex normal (upward with subtle lateral crown tilt)
      const nx = -binormal.x * lateralFrac * 0.05;
      const ny = 1.0;
      const nz = -binormal.z * lateralFrac * 0.05;
      const nLen = Math.hypot(nx, ny, nz);

      normals[vertIdx * 3] = nx / nLen;
      normals[vertIdx * 3 + 1] = ny / nLen;
      normals[vertIdx * 3 + 2] = nz / nLen;

      // Texture UV coordinates (U across road 0..1, V along road length)
      uvs[vertIdx * 2] = (lateralFrac + 1.0) * 0.5;
      uvs[vertIdx * 2 + 1] = uCurve;
    }
  }

  // Quad indices
  for (let i = 0; i < subdivisions; i++) {
    for (let j = 0; j < crossSegments; j++) {
      const a = i * numCols + j;
      const b = (i + 1) * numCols + j;
      const c = (i + 1) * numCols + (j + 1);
      const d = i * numCols + (j + 1);

      // Two triangles per quad
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // 3. Physically Based Dirt/Gravel Road Material
  const diffuseMap = createProceduralRoadTexture(512, 512);
  const bumpMap = createProceduralRoadBump(256);

  if (diffuseMap && maxAnisotropy > 1) {
    diffuseMap.anisotropy = Math.min(maxAnisotropy, 16);
  }
  if (bumpMap && maxAnisotropy > 1) {
    bumpMap.anisotropy = Math.min(maxAnisotropy, 16);
  }

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.90,
    metalness: 0.02,
    map: diffuseMap,
    bumpMap: bumpMap,
    bumpScale: 0.035,
    polygonOffset: true,
    polygonOffsetFactor: -2.0,
    polygonOffsetUnits: -4.0,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'WindingForestRoad';
  mesh.receiveShadow = true;

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
    curve,
    totalLength: Math.round(totalLength),
    updateQuality,
    dispose,
  };
}
