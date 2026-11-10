/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WATERFALL_CONFIG } from './streamPath.js';
import { getTerrainHeight } from './terrainElevation.js';
import {
  buildRockLargePrototype,
  buildRockMediumPrototype,
  buildRockSmallPrototype,
} from './forestFloorPrototypes.js';

/**
 * Creates the small woodland waterfall:
 * - Natural rock shelf and mossy boulder cluster
 * - Animated tumbling cascading water sheet
 * - Plunge pool ripple/foam ring at the base
 * - Lightweight, software-safe mist spray sprites
 *
 * @param {Object} [options]
 * @param {Object} options.materials - Materials bundle from createWaterMaterials
 * @param {boolean} [options.isSoftwareGl=false]
 * @returns {{
 *   group: THREE.Group,
 *   update: (delta: number) => void,
 *   dispose: () => void
 * }}
 */
export function createWaterfall(options = {}) {
  const { materials: materialBundle, isSoftwareGl = false } = options;
  const mats = materialBundle.materials || materialBundle;
  const textures = materialBundle.textures || {};
  const group = new THREE.Group();
  group.name = 'WoodlandWaterfallSystem';

  const cfg = WATERFALL_CONFIG;

  const crestGroundY = getTerrainHeight(cfg.crestPoint.x, cfg.crestPoint.z);
  const poolGroundY = getTerrainHeight(cfg.poolCenter.x, cfg.poolCenter.z);

  const crestWaterY = crestGroundY + 0.05;
  const poolWaterY = poolGroundY + 0.04;

  // 1. Rocky Cascade Shelf (Natural rock cluster framing the drop)
  const rockGroup = new THREE.Group();
  rockGroup.name = 'WaterfallRockShelf';

  const largeRockProto = buildRockLargePrototype();
  const medRockProto = buildRockMediumPrototype();
  const smallRockProto = buildRockSmallPrototype();

  // Natural boulder arrangement around crest, flank walls, and plunge pool rim
  const rockPlacements = [
    // Left crest boulder
    { proto: largeRockProto, x: cfg.crestPoint.x - 2.4, z: cfg.crestPoint.z + 0.5, yOff: -0.4, scale: 1.1, rotY: 0.4 },
    // Right crest boulder
    { proto: largeRockProto, x: cfg.crestPoint.x + 2.2, z: cfg.crestPoint.z - 0.4, yOff: -0.45, scale: 1.05, rotY: 1.8 },
    // Center shelf step rock (water cascades over and around it)
    { proto: medRockProto, x: cfg.shelfPoint.x + 0.6, z: cfg.shelfPoint.z + 0.4, yOff: -0.35, scale: 0.95, rotY: 2.3 },
    // Left cascade flank rock
    { proto: medRockProto, x: cfg.shelfPoint.x - 1.9, z: cfg.shelfPoint.z - 0.3, yOff: -0.3, scale: 1.0, rotY: 0.9 },
    // Right cascade flank rock
    { proto: medRockProto, x: cfg.shelfPoint.x + 1.8, z: cfg.shelfPoint.z - 0.2, yOff: -0.28, scale: 0.9, rotY: 3.1 },
    // Pool rim rock 1 (south-west)
    { proto: largeRockProto, x: cfg.poolCenter.x - 3.2, z: cfg.poolCenter.z - 1.8, yOff: -0.5, scale: 1.15, rotY: 1.2 },
    // Pool rim rock 2 (north-east)
    { proto: medRockProto, x: cfg.poolCenter.x + 2.8, z: cfg.poolCenter.z + 1.4, yOff: -0.35, scale: 0.95, rotY: 2.7 },
    // Pool rim rock 3 (south-east)
    { proto: smallRockProto, x: cfg.poolCenter.x + 2.2, z: cfg.poolCenter.z - 2.4, yOff: -0.15, scale: 1.2, rotY: 0.5 },
    // Pool rim rock 4 (north-west)
    { proto: smallRockProto, x: cfg.poolCenter.x - 2.6, z: cfg.poolCenter.z + 2.2, yOff: -0.12, scale: 1.1, rotY: 1.7 },
  ];

  rockPlacements.forEach((item) => {
    const groundY = getTerrainHeight(item.x, item.z);
    const mesh = new THREE.Mesh(item.proto.geometry, mats.wetRock);
    mesh.position.set(item.x, groundY + item.yOff, item.z);
    mesh.rotation.y = item.rotY;
    mesh.scale.set(item.scale, item.scale, item.scale);
    mesh.receiveShadow = true;
    rockGroup.add(mesh);
  });
  group.add(rockGroup);

  // 2. Cascading Water Sheet Geometry
  const crossFractions = [-1.0, -0.5, 0.0, 0.5, 1.0];
  const numRows = 16;
  const numCols = crossFractions.length - 1; // 4 columns = 5 vertices per row
  const numVerts = (numRows + 1) * (numCols + 1);
  const positions = new Float32Array(numVerts * 3);
  const normals = new Float32Array(numVerts * 3);
  const uvs = new Float32Array(numVerts * 2);
  const indices = [];

  const halfCascadeWidth = cfg.cascadeWidth / 2;

  // Tangent and binormal from crest to pool center
  const dirX = cfg.poolCenter.x - cfg.crestPoint.x;
  const dirZ = cfg.poolCenter.z - cfg.crestPoint.z;
  const len = Math.hypot(dirX, dirZ);
  const tX = dirX / len;
  const tZ = dirZ / len;
  const bX = -tZ; // Perpendicular lateral vector
  const bZ = tX;

  for (let r = 0; r <= numRows; r++) {
    const t = r / numRows; // 0 at crest, 1 at pool base
    // S-curve hydraulic drop
    const dropT = t * t * (3 - 2 * t);
    const cy = crestWaterY * (1 - dropT) + poolWaterY * dropT;

    const cx = cfg.crestPoint.x * (1 - t) + cfg.poolCenter.x * t;
    const cz = cfg.crestPoint.z * (1 - t) + cfg.poolCenter.z * t;

    for (let c = 0; c <= numCols; c++) {
      const vertIdx = r * (numCols + 1) + c;
      const latFrac = crossFractions[c];
      const latOffset = latFrac * halfCascadeWidth;

      const wx = cx + bX * latOffset;
      const wz = cz + bZ * latOffset;
      const localGroundY = getTerrainHeight(wx, wz);
      const cyClamped = Math.max(localGroundY + 0.05, cy);

      positions[vertIdx * 3] = wx;
      positions[vertIdx * 3 + 1] = cyClamped;
      positions[vertIdx * 3 + 2] = wz;

      // Normal
      const nx = -tX * 0.4;
      const ny = 0.85;
      const nz = -tZ * 0.4;
      const nLen = Math.hypot(nx, ny, nz);

      normals[vertIdx * 3] = nx / nLen;
      normals[vertIdx * 3 + 1] = ny / nLen;
      normals[vertIdx * 3 + 2] = nz / nLen;

      uvs[vertIdx * 2] = (latFrac + 1) * 0.5;
      uvs[vertIdx * 2 + 1] = t * 3.0; // Flow downstream
    }
  }

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const a = r * (numCols + 1) + c;
      const b = (r + 1) * (numCols + 1) + c;
      const d = r * (numCols + 1) + (c + 1);
      const e = (r + 1) * (numCols + 1) + (c + 1);

      indices.push(a, b, d);
      indices.push(b, e, d);
    }
  }

  const cascadeGeom = new THREE.BufferGeometry();
  cascadeGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  cascadeGeom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  cascadeGeom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  cascadeGeom.setIndex(indices);
  cascadeGeom.computeVertexNormals();

  const cascadeMesh = new THREE.Mesh(cascadeGeom, mats.waterfall);
  cascadeMesh.name = 'WaterfallCascadeCurtain';
  cascadeMesh.position.set(0, 0, 0);
  cascadeMesh.renderOrder = 4;
  cascadeMesh.receiveShadow = true;
  group.add(cascadeMesh);

  // 3. Plunge Pool Splash & Foam Ring
  // Concentric frothy water disc at the base of the waterfall, reacting naturally to lighting
  const foamGeom = new THREE.RingGeometry(0.3, 2.4, 24, 2);
  foamGeom.rotateX(-Math.PI / 2);

  const foamMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a524a,
    roughness: 0.25,
    metalness: 0.04,
    transparent: true,
    opacity: isSoftwareGl ? 0.25 : 0.38,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const foamMesh = new THREE.Mesh(foamGeom, foamMaterial);
  foamMesh.name = 'PlungePoolFoamRing';
  foamMesh.position.set(cfg.poolCenter.x, poolGroundY + 0.065, cfg.poolCenter.z);
  foamMesh.receiveShadow = true;
  group.add(foamMesh);

  // 4. Lightweight Software-Safe Spray Mist Quads
  // Soft rising mist puffs reacting naturally to scene lighting (disabled on software GL to avoid overdraw)
  const mistCount = isSoftwareGl ? 0 : 4;
  const mistQuads = [];

  const mistGeom = new THREE.PlaneGeometry(1.5, 1.5);
  const mistMaterial = new THREE.MeshStandardMaterial({
    color: 0x768f85,
    roughness: 0.85,
    metalness: 0.02,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  for (let m = 0; m < mistCount; m++) {
    const quad = new THREE.Mesh(mistGeom, mistMaterial);
    const angle = (m / mistCount) * Math.PI * 2;
    const rad = 0.6 + Math.random() * 0.8;
    quad.position.set(
      cfg.poolCenter.x + Math.cos(angle) * rad,
      poolWaterY + 0.35 + (m * 0.18),
      cfg.poolCenter.z + Math.sin(angle) * rad
    );
    quad.rotation.y = Math.random() * Math.PI * 2;
    quad.scale.setScalar(0.8 + Math.random() * 0.5);
    quad.userData = {
      baseY: poolWaterY + 0.35,
      driftSpeed: 0.12 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
    };
    group.add(quad);
    mistQuads.push(quad);
  }

  // Animation state
  let totalTime = 0;

  const update = (delta) => {
    totalTime += delta;

    // 1. Animate cascade white-water rapid flow downstream
    if (textures.waterfallFoamMap) {
      textures.waterfallFoamMap.offset.y -= delta * 1.6;
    }

    // 2. Animate gentle pulsing foam ring at pool base
    const foamPulse = 1.0 + Math.sin(totalTime * 2.5) * 0.08;
    foamMesh.scale.set(foamPulse, 1.0, foamPulse);

    // 3. Animate subtle rising mist
    for (let m = 0; m < mistQuads.length; m++) {
      const quad = mistQuads[m];
      const ud = quad.userData;
      quad.position.y = ud.baseY + Math.sin(totalTime * ud.driftSpeed * 2.0 + ud.phase) * 0.25;
      quad.rotation.z += delta * 0.05;
    }
  };

  const dispose = () => {
    cascadeGeom.dispose();
    foamGeom.dispose();
    foamMaterial.dispose();
    mistGeom.dispose();
    mistMaterial.dispose();
    largeRockProto.geometry.dispose();
    medRockProto.geometry.dispose();
    smallRockProto.geometry.dispose();
  };

  return {
    group,
    update,
    dispose,
  };
}
