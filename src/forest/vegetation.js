/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import {
  VEGETATION_SPECIES,
  generateVegetationPlacements,
} from './vegetationDistribution.js';
import {
  buildScotsPinePrototype,
  buildMatureOakPrototype,
  buildSilverBirchPrototype,
  buildMountainSprucePrototype,
  buildUnderstoryBushPrototype,
  buildLowScrubPrototype,
  createVegetationMaterials,
} from './treePrototypes.js';

/**
 * Creates and manages the high-performance instanced forest vegetation subsystem.
 * Populates the terrain with diverse, modular tree prototypes and understory layers.
 * Supports dynamic shadow toggling, quality presets, software WebGL safeguards,
 * and comprehensive cleanup.
 *
 * @param {Object} [options]
 * @param {boolean} [options.isSoftwareGl=false]
 * @param {Object} [options.preset=null]
 * @param {number} [options.maxAnisotropy=8]
 * @returns {{
 *   group: THREE.Group,
 *   updateQuality: (preset: Object) => void,
 *   getInfo: () => { totalTrees: number, totalUnderstory: number, activeSpecies: number },
 *   dispose: () => void
 * }}
 */
export function createVegetationSystem(options = {}) {
  const {
    isSoftwareGl = false,
    preset = null,
    maxAnisotropy = 8,
  } = options;

  const group = new THREE.Group();
  group.name = 'ForestVegetationSystem';

  // 1. Build prototype geometries for each distinct species
  const prototypes = {
    [VEGETATION_SPECIES.SCOTS_PINE]: buildScotsPinePrototype(),
    [VEGETATION_SPECIES.MATURE_OAK]: buildMatureOakPrototype(),
    [VEGETATION_SPECIES.SILVER_BIRCH]: buildSilverBirchPrototype(),
    [VEGETATION_SPECIES.MOUNTAIN_SPRUCE]: buildMountainSprucePrototype(),
    [VEGETATION_SPECIES.UNDERSTORY_BUSH]: buildUnderstoryBushPrototype(),
    [VEGETATION_SPECIES.LOW_SCRUB]: buildLowScrubPrototype(),
  };

  // 2. Build shared physically based materials and textures
  const matSystem = createVegetationMaterials(maxAnisotropy);

  // 3. Compute deterministic procedural placements adhering to terrain and road clearance
  const placementData = generateVegetationPlacements({
    isSoftwareGl,
    treeTargetCount: isSoftwareGl ? 1450 : 4200,
    understoryTargetCount: isSoftwareGl ? 850 : 2200,
  });

  const { trees, understory, stats } = placementData;

  // Group placements by species
  const placementsBySpecies = {
    [VEGETATION_SPECIES.SCOTS_PINE]: [],
    [VEGETATION_SPECIES.MATURE_OAK]: [],
    [VEGETATION_SPECIES.SILVER_BIRCH]: [],
    [VEGETATION_SPECIES.MOUNTAIN_SPRUCE]: [],
    [VEGETATION_SPECIES.UNDERSTORY_BUSH]: [],
    [VEGETATION_SPECIES.LOW_SCRUB]: [],
  };

  trees.forEach((t) => placementsBySpecies[t.species].push(t));
  understory.forEach((u) => placementsBySpecies[u.species].push(u));

  // 4. Create InstancedMesh for each species (trunk and foliage)
  const instancedMeshes = [];
  const dummyMatrix = new THREE.Matrix4();
  const dummyColor = new THREE.Color();
  const rotEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  const dummyQuat = new THREE.Quaternion();
  const dummyPos = new THREE.Vector3();
  const dummyScale = new THREE.Vector3();

  const enableShadows = preset ? (preset.shadows && !isSoftwareGl) : !isSoftwareGl;

  Object.keys(prototypes).forEach((speciesKey) => {
    const proto = prototypes[speciesKey];
    const mats = matSystem.materials[speciesKey];
    const items = placementsBySpecies[speciesKey];
    const count = items.length;

    if (count === 0) return;

    // A. Trunk InstancedMesh
    const trunkInstanced = new THREE.InstancedMesh(proto.trunkGeometry, mats.trunk, count);
    trunkInstanced.name = `${speciesKey}_Trunks`;
    trunkInstanced.castShadow = enableShadows;
    trunkInstanced.receiveShadow = true;

    // B. Foliage InstancedMesh
    const foliageInstanced = new THREE.InstancedMesh(proto.foliageGeometry, mats.foliage, count);
    foliageInstanced.name = `${speciesKey}_Foliage`;
    foliageInstanced.castShadow = enableShadows;
    foliageInstanced.receiveShadow = true;

    // Populate instance matrices and per-instance color variation
    for (let i = 0; i < count; i++) {
      const p = items[i];

      dummyPos.set(p.x, p.y, p.z);
      rotEuler.set(p.tiltX, p.rotationY, p.tiltZ, 'YXZ');
      dummyQuat.setFromEuler(rotEuler);
      dummyScale.set(p.scaleX, p.scaleY, p.scaleZ);

      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);

      trunkInstanced.setMatrixAt(i, dummyMatrix);
      foliageInstanced.setMatrixAt(i, dummyMatrix);

      // Per-instance bark tint
      dummyColor.setRGB(p.tint.r, p.tint.g, p.tint.b);
      trunkInstanced.setColorAt(i, dummyColor);

      // Per-instance foliage tint
      dummyColor.setRGB(p.tint.r, p.tint.g, p.tint.b);
      foliageInstanced.setColorAt(i, dummyColor);
    }

    trunkInstanced.instanceMatrix.needsUpdate = true;
    foliageInstanced.instanceMatrix.needsUpdate = true;
    if (trunkInstanced.instanceColor) trunkInstanced.instanceColor.needsUpdate = true;
    if (foliageInstanced.instanceColor) foliageInstanced.instanceColor.needsUpdate = true;

    // Compute bounding volumes for frustum culling
    trunkInstanced.computeBoundingSphere();
    foliageInstanced.computeBoundingSphere();

    group.add(trunkInstanced);
    group.add(foliageInstanced);

    instancedMeshes.push({
      species: speciesKey,
      trunk: trunkInstanced,
      foliage: foliageInstanced,
      totalCount: count,
    });
  });

  /**
   * Adapts vegetation shadows and level of detail when quality preset changes.
   * @param {Object} newPreset
   */
  const updateQuality = (newPreset) => {
    if (!newPreset) return;
    const canShadow = newPreset.shadows && !isSoftwareGl;
    instancedMeshes.forEach(({ trunk, foliage }) => {
      trunk.castShadow = canShadow;
      foliage.castShadow = canShadow;
    });

    const aniso = Math.min(newPreset.anisotropy || 8, 16);
    if (matSystem.textures.barkMap) matSystem.textures.barkMap.anisotropy = aniso;
    if (matSystem.textures.birchBarkMap) matSystem.textures.birchBarkMap.anisotropy = aniso;
    if (matSystem.textures.foliageMap) matSystem.textures.foliageMap.anisotropy = aniso;
  };

  const getInfo = () => ({
    totalTrees: stats.totalTrees,
    totalUnderstory: stats.totalUnderstory,
    activeSpecies: Object.keys(prototypes).length,
    speciesBreakdown: stats.speciesCounts,
  });

  const dispose = () => {
    // Dispose prototype geometries
    Object.values(prototypes).forEach((proto) => {
      proto.trunkGeometry.dispose();
      proto.foliageGeometry.dispose();
    });

    // Dispose materials and procedural textures
    matSystem.dispose();

    // Remove meshes from group
    instancedMeshes.forEach(({ trunk, foliage }) => {
      group.remove(trunk);
      group.remove(foliage);
      trunk.dispose();
      foliage.dispose();
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
