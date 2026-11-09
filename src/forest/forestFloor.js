/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import {
  FLOOR_SPECIES,
  buildGrassSmallPrototype,
  buildGrassMediumPrototype,
  buildGrassTallPrototype,
  buildFernCommonPrototype,
  buildFernBroadPrototype,
  buildFernCompactPrototype,
  buildRockSmallPrototype,
  buildRockMediumPrototype,
  buildRockLargePrototype,
  buildBranchCurvedPrototype,
  buildBranchStraightPrototype,
  buildFallenLogLargePrototype,
  buildFallenLogMediumPrototype,
  createForestFloorMaterials,
} from './forestFloorPrototypes.js';
import { generateForestFloorPlacements } from './forestFloorDistribution.js';

/**
 * Creates and manages the high-performance instanced forest floor detail subsystem.
 * Enriches the terrain with grass patches, ferns, embedded stones/rocks, fallen branches,
 * and occasional fallen logs.
 *
 * @param {Object} [options]
 * @param {boolean} [options.isSoftwareGl=false]
 * @param {Object} [options.preset=null]
 * @param {number} [options.maxAnisotropy=8]
 * @returns {{
 *   group: THREE.Group,
 *   updateQuality: (preset: Object) => void,
 *   getInfo: () => Object,
 *   dispose: () => void
 * }}
 */
export function createForestFloorSystem(options = {}) {
  const {
    isSoftwareGl = false,
    preset = null,
    maxAnisotropy = 8,
  } = options;

  const group = new THREE.Group();
  group.name = 'ForestFloorDetailSystem';

  // 1. Prototype geometries
  const prototypes = {
    [FLOOR_SPECIES.GRASS_SMALL]: buildGrassSmallPrototype(),
    [FLOOR_SPECIES.GRASS_MEDIUM]: buildGrassMediumPrototype(),
    [FLOOR_SPECIES.GRASS_TALL]: buildGrassTallPrototype(),
    [FLOOR_SPECIES.FERN_COMMON]: buildFernCommonPrototype(),
    [FLOOR_SPECIES.FERN_BROAD]: buildFernBroadPrototype(),
    [FLOOR_SPECIES.FERN_COMPACT]: buildFernCompactPrototype(),
    [FLOOR_SPECIES.ROCK_SMALL]: buildRockSmallPrototype(),
    [FLOOR_SPECIES.ROCK_MEDIUM]: buildRockMediumPrototype(),
    [FLOOR_SPECIES.ROCK_LARGE]: buildRockLargePrototype(),
    [FLOOR_SPECIES.BRANCH_CURVED]: buildBranchCurvedPrototype(),
    [FLOOR_SPECIES.BRANCH_STRAIGHT]: buildBranchStraightPrototype(),
    [FLOOR_SPECIES.FALLEN_LOG_LARGE]: buildFallenLogLargePrototype(),
    [FLOOR_SPECIES.FALLEN_LOG_MEDIUM]: buildFallenLogMediumPrototype(),
  };

  // 2. Shared PBR materials
  const matSystem = createForestFloorMaterials(maxAnisotropy);

  // 3. Compute deterministic placements adhering to terrain and road clearance
  const placementData = generateForestFloorPlacements({
    isSoftwareGl,
  });

  const { items, stats } = placementData;

  // Group items by species
  const itemsBySpecies = {};
  Object.values(FLOOR_SPECIES).forEach((sp) => {
    itemsBySpecies[sp] = [];
  });
  items.forEach((it) => {
    if (itemsBySpecies[it.species]) {
      itemsBySpecies[it.species].push(it);
    }
  });

  // 4. Create InstancedMesh for each species
  const instancedMeshes = [];
  const dummyMatrix = new THREE.Matrix4();
  const dummyColor = new THREE.Color();
  const rotEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  const dummyQuat = new THREE.Quaternion();
  const dummyPos = new THREE.Vector3();
  const dummyScale = new THREE.Vector3();

  const enableShadows = preset ? (preset.shadows && !isSoftwareGl) : !isSoftwareGl;

  Object.keys(prototypes).forEach((spKey) => {
    const proto = prototypes[spKey];
    const mat = matSystem.materials[spKey];
    const spItems = itemsBySpecies[spKey];
    const count = spItems.length;

    if (count === 0) return;

    const instancedMesh = new THREE.InstancedMesh(proto.geometry, mat, count);
    instancedMesh.name = `Floor_${spKey}`;
    // Large rocks and logs can cast shadows on hardware GPU
    const canCast = enableShadows && (spKey.startsWith('rock_large') || spKey.startsWith('fallen_log'));
    instancedMesh.castShadow = canCast;
    instancedMesh.receiveShadow = true;

    for (let i = 0; i < count; i++) {
      const p = spItems[i];

      dummyPos.set(p.x, p.y, p.z);
      rotEuler.set(p.tiltX, p.rotationY, p.tiltZ, 'YXZ');
      dummyQuat.setFromEuler(rotEuler);
      dummyScale.set(p.scaleX, p.scaleY, p.scaleZ);

      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      instancedMesh.setMatrixAt(i, dummyMatrix);

      dummyColor.setRGB(p.tint.r, p.tint.g, p.tint.b);
      instancedMesh.setColorAt(i, dummyColor);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
    instancedMesh.computeBoundingSphere();

    group.add(instancedMesh);
    instancedMeshes.push({
      species: spKey,
      mesh: instancedMesh,
      count,
    });
  });

  const updateQuality = (newPreset) => {
    if (!newPreset) return;
    const canShadow = newPreset.shadows && !isSoftwareGl;
    instancedMeshes.forEach(({ species, mesh }) => {
      mesh.castShadow = canShadow && (species.startsWith('rock_large') || species.startsWith('fallen_log'));
    });

    const aniso = Math.min(newPreset.anisotropy || 8, 16);
    if (matSystem.textures.rockMap) {
      matSystem.textures.rockMap.anisotropy = aniso;
    }
  };

  const getInfo = () => ({
    totalFloorItems: stats.totalItems,
    totalGrass: stats.totalGrass,
    totalFerns: stats.totalFerns,
    totalRocks: stats.totalRocks,
    totalDeadwood: stats.totalDeadwood,
    totalLogs: stats.totalLogs,
    speciesBreakdown: stats.speciesCounts,
  });

  const dispose = () => {
    Object.values(prototypes).forEach((proto) => {
      proto.geometry.dispose();
    });
    matSystem.dispose();

    instancedMeshes.forEach(({ mesh }) => {
      group.remove(mesh);
      mesh.dispose();
    });
    instancedMeshes.length = 0;
  };

  return {
    group,
    updateQuality,
    getInfo,
    dispose,
  };
}
