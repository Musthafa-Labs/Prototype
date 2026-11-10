/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import {
  STREAM_WAYPOINTS,
  createStreamSpline,
  getStreamWidthAt,
  getStreamWaterElevation,
} from './streamPath.js';
import { getTerrainHeight, getTerrainNormal } from './terrainElevation.js';
import { createDeterministicRng } from './vegetationDistribution.js';
import {
  buildRockSmallPrototype,
  buildRockMediumPrototype,
} from './forestFloorPrototypes.js';

/**
 * Creates the stream bed channel mesh and submerged river stones:
 * - Concave depressed bed channel beneath the water surface
 * - Damp soil bank verges transitioning smoothly into the terrain
 * - High-efficiency InstancedMesh river stones and submerged pebbles
 *
 * @param {Object} [options]
 * @param {THREE.CatmullRomCurve3} [options.spline]
 * @param {Object} options.materials
 * @param {boolean} [options.isSoftwareGl=false]
 * @returns {{
 *   group: THREE.Group,
 *   dispose: () => void
 * }}
 */
export function createStreamBed(options = {}) {
  const {
    spline = createStreamSpline(STREAM_WAYPOINTS),
    materials,
    isSoftwareGl = false,
  } = options;

  const group = new THREE.Group();
  group.name = 'WoodlandStreamBedSystem';

  // 1. Channel Bed Ribbon Geometry
  // Spans slightly wider than the water surface (1.35x) to include the damp bank verges
  const subdivisions = 120;
  const crossSegments = 6; // 7 vertices per row: outer left bank, inner left verge, shallow left, center bed, shallow right, inner right verge, outer right bank
  const numRows = subdivisions + 1;
  const numCols = crossSegments + 1;

  const positions = new Float32Array(numRows * numCols * 3);
  const normals = new Float32Array(numRows * numCols * 3);
  const uvs = new Float32Array(numRows * numCols * 2);
  const indices = [];

  // Lateral relative fractions: -1.0 (outer bank) to +1.0 (outer bank)
  const crossFractions = [-1.0, -0.7, -0.35, 0.0, 0.35, 0.7, 1.0];

  const tangent = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const binormal = new THREE.Vector3();
  const samplePos = new THREE.Vector3();

  for (let i = 0; i <= subdivisions; i++) {
    const uCurve = i / subdivisions;
    spline.getPointAt(uCurve, samplePos);
    spline.getTangentAt(uCurve, tangent).normalize();

    binormal.crossVectors(tangent, worldUp).normalize();

    const waterWidth = getStreamWidthAt(uCurve, STREAM_WAYPOINTS);
    const bedWidth = waterWidth * 1.35; // Bed extends beyond water surface into damp verges
    const halfWidth = bedWidth / 2;
    const waterLevelY = getStreamWaterElevation(uCurve, spline);

    for (let j = 0; j <= crossSegments; j++) {
      const vertIdx = i * numCols + j;
      const lateralFrac = crossFractions[j];
      const lateralOffset = lateralFrac * halfWidth;

      const wx = samplePos.x + binormal.x * lateralOffset;
      const wz = samplePos.z + binormal.z * lateralOffset;

      const rawTerrainY = getTerrainHeight(wx, wz);

      // Damp bed channel profile:
      // Overlays the coarse 15m terrain quads with dark wet river sediment and gravel (+0.012m),
      // providing a continuous natural stream bed without terrain z-fighting
      const wy = rawTerrainY + 0.012;

      positions[vertIdx * 3] = wx;
      positions[vertIdx * 3 + 1] = wy;
      positions[vertIdx * 3 + 2] = wz;

      // Normal
      const nx = -binormal.x * lateralFrac * 0.15;
      const ny = 1.0;
      const nz = -binormal.z * lateralFrac * 0.15;
      const nLen = Math.hypot(nx, ny, nz);

      normals[vertIdx * 3] = nx / nLen;
      normals[vertIdx * 3 + 1] = ny / nLen;
      normals[vertIdx * 3 + 2] = nz / nLen;

      uvs[vertIdx * 2] = (lateralFrac + 1.0) * 0.5;
      uvs[vertIdx * 2 + 1] = uCurve * 12.0;
    }
  }

  // Triangles
  for (let i = 0; i < subdivisions; i++) {
    for (let j = 0; j < crossSegments; j++) {
      const a = i * numCols + j;
      const b = (i + 1) * numCols + j;
      const c = (i + 1) * numCols + (j + 1);
      const d = i * numCols + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const bedGeom = new THREE.BufferGeometry();
  bedGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  bedGeom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  bedGeom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  bedGeom.setIndex(indices);
  bedGeom.computeVertexNormals();

  const bedMesh = new THREE.Mesh(bedGeom, materials.streamBed);
  bedMesh.name = 'StreamBedChannel';
  bedMesh.renderOrder = 1; // Drawn before water surface
  bedMesh.receiveShadow = true;
  group.add(bedMesh);

  // 2. Submerged River Stones & Wet Bank Pebbles (InstancedMesh)
  const rng = createDeterministicRng(94217);

  const smallRockProto = buildRockSmallPrototype();
  const medRockProto = buildRockMediumPrototype();

  const smallCount = isSoftwareGl ? 32 : 65;
  const medCount = isSoftwareGl ? 14 : 28;

  const smallInstMesh = new THREE.InstancedMesh(smallRockProto.geometry, materials.wetRock, smallCount);
  smallInstMesh.name = 'SubmergedRiverPebbles';
  smallInstMesh.receiveShadow = true;

  const medInstMesh = new THREE.InstancedMesh(medRockProto.geometry, materials.wetRock, medCount);
  medInstMesh.name = 'SubmergedRiverStones';
  medInstMesh.receiveShadow = true;

  const dummy = new THREE.Object3D();

  // Populate small pebbles along bed and shallows
  for (let s = 0; s < smallCount; s++) {
    const uCurve = 0.05 + rng() * 0.90;
    spline.getPointAt(uCurve, samplePos);
    spline.getTangentAt(uCurve, tangent).normalize();
    binormal.crossVectors(tangent, worldUp).normalize();

    const wWidth = getStreamWidthAt(uCurve, STREAM_WAYPOINTS);
    // Cluster in shallows and near edges (fraction -0.85 to +0.85)
    const side = (rng() - 0.5) * 2;
    const lateralOffset = side * (wWidth * 0.45);

    const sx = samplePos.x + binormal.x * lateralOffset + (rng() - 0.5) * 0.3;
    const sz = samplePos.z + binormal.z * lateralOffset + (rng() - 0.5) * 0.3;
    const waterY = getStreamWaterElevation(uCurve, spline);
    const groundY = getTerrainHeight(sx, sz);

    // Embed into bed so stones rest naturally on the stream bed
    const scale = 0.65 + rng() * 0.45;
    const sy = groundY + 0.012;

    dummy.position.set(sx, sy, sz);
    dummy.rotation.set((rng() - 0.5) * 0.2, rng() * Math.PI * 2, (rng() - 0.5) * 0.2);
    dummy.scale.set(scale * (0.9 + rng() * 0.2), scale * (0.8 + rng() * 0.3), scale * (0.9 + rng() * 0.2));
    dummy.updateMatrix();

    smallInstMesh.setMatrixAt(s, dummy.matrix);
  }
  smallInstMesh.instanceMatrix.needsUpdate = true;
  group.add(smallInstMesh);

  // Populate medium submerged stepping stones and bank clusters
  for (let m = 0; m < medCount; m++) {
    const uCurve = 0.08 + rng() * 0.84;
    spline.getPointAt(uCurve, samplePos);
    spline.getTangentAt(uCurve, tangent).normalize();
    binormal.crossVectors(tangent, worldUp).normalize();

    const wWidth = getStreamWidthAt(uCurve, STREAM_WAYPOINTS);
    const side = (rng() - 0.5) * 2;
    // Bank verges and shallows
    const lateralOffset = side * (wWidth * 0.48);

    const mx = samplePos.x + binormal.x * lateralOffset + (rng() - 0.5) * 0.4;
    const mz = samplePos.z + binormal.z * lateralOffset + (rng() - 0.5) * 0.4;
    const waterY = getStreamWaterElevation(uCurve, spline);
    const groundY = getTerrainHeight(mx, mz);

    const scale = 0.75 + rng() * 0.4;
    const my = groundY + 0.015;

    dummy.position.set(mx, my, mz);
    dummy.rotation.set((rng() - 0.5) * 0.15, rng() * Math.PI * 2, (rng() - 0.5) * 0.15);
    dummy.scale.set(scale * (0.92 + rng() * 0.16), scale * (0.85 + rng() * 0.25), scale * (0.92 + rng() * 0.16));
    dummy.updateMatrix();

    medInstMesh.setMatrixAt(m, dummy.matrix);
  }
  medInstMesh.instanceMatrix.needsUpdate = true;
  group.add(medInstMesh);

  const dispose = () => {
    bedGeom.dispose();
    smallRockProto.geometry.dispose();
    medRockProto.geometry.dispose();
    smallInstMesh.dispose();
    medInstMesh.dispose();
  };

  return {
    group,
    dispose,
  };
}
