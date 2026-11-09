/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VEGETATION_SPECIES,
  ROAD_MIN_VEGETATION_CLEARANCE,
  ROAD_MIN_TREE_CLEARANCE,
  createDeterministicRng,
  generateVegetationPlacements,
} from './vegetationDistribution.js';
import {
  buildScotsPinePrototype,
  buildMatureOakPrototype,
  buildSilverBirchPrototype,
  buildMountainSprucePrototype,
  buildUnderstoryBushPrototype,
  buildLowScrubPrototype,
} from './treePrototypes.js';
import { getTerrainHeight } from './terrainElevation.js';

test('createDeterministicRng produces reproducible sequences for a given seed', () => {
  const rng1 = createDeterministicRng(42819);
  const rng2 = createDeterministicRng(42819);

  for (let i = 0; i < 20; i++) {
    assert.equal(rng1(), rng2());
  }
});

test('generateVegetationPlacements is completely deterministic and reproducible', () => {
  const run1 = generateVegetationPlacements({ seed: 12345, treeTargetCount: 200, understoryTargetCount: 100 });
  const run2 = generateVegetationPlacements({ seed: 12345, treeTargetCount: 200, understoryTargetCount: 100 });

  assert.equal(run1.trees.length, run2.trees.length);
  assert.equal(run1.understory.length, run2.understory.length);

  for (let i = 0; i < run1.trees.length; i++) {
    const t1 = run1.trees[i];
    const t2 = run2.trees[i];
    assert.equal(t1.species, t2.species);
    assert.equal(t1.x, t2.x);
    assert.equal(t1.y, t2.y);
    assert.equal(t1.z, t2.z);
    assert.equal(t1.scaleY, t2.scaleY);
  }
});

test('Road clearance: absolutely no vegetation penetrates the road carriageway (< 4.2m)', () => {
  const { trees, understory } = generateVegetationPlacements({
    seed: 99999,
    treeTargetCount: 500,
    understoryTargetCount: 300,
  });

  for (const t of trees) {
    assert.ok(
      t.distanceToRoad >= ROAD_MIN_VEGETATION_CLEARANCE,
      `Tree spawned at distance ${t.distanceToRoad} < ${ROAD_MIN_VEGETATION_CLEARANCE}m`
    );
  }

  for (const u of understory) {
    assert.ok(
      u.distanceToRoad >= ROAD_MIN_VEGETATION_CLEARANCE,
      `Understory spawned at distance ${u.distanceToRoad} < ${ROAD_MIN_VEGETATION_CLEARANCE}m`
    );
  }
});

test('Mature tree clearance: no mature trees spawn within 7.5m of road centerline', () => {
  const { trees } = generateVegetationPlacements({
    seed: 54321,
    treeTargetCount: 600,
    understoryTargetCount: 300,
  });

  for (const t of trees) {
    assert.ok(
      t.distanceToRoad >= ROAD_MIN_TREE_CLEARANCE,
      `Mature tree (${t.species}) encroached within road verge at distance ${t.distanceToRoad}m < ${ROAD_MIN_TREE_CLEARANCE}m`
    );
  }
});

test('Terrain elevation conformity: all vegetation is anchored directly to terrain surface', () => {
  const { trees, understory } = generateVegetationPlacements({
    seed: 77777,
    treeTargetCount: 100,
    understoryTargetCount: 50,
  });

  for (const t of trees) {
    const groundElevation = getTerrainHeight(t.x, t.z);
    // Tree root anchor sinks 0.2m - 0.9m into terrain to prevent floating
    const diff = groundElevation - t.y;
    assert.ok(diff >= 0.15 && diff <= 1.1, `Tree at (${t.x}, ${t.z}) anchor diff ${diff} out of expected range`);
  }

  for (const u of understory) {
    const groundElevation = getTerrainHeight(u.x, u.z);
    const diff = groundElevation - u.y;
    assert.ok(diff >= 0.05 && diff <= 0.6, `Understory anchor diff ${diff} out of expected range`);
  }
});

test('Tree variation: scale, rotation, and organic lean are within natural bounds', () => {
  const { trees } = generateVegetationPlacements({
    seed: 33333,
    treeTargetCount: 150,
    understoryTargetCount: 50,
  });

  for (const t of trees) {
    // Scales within believable natural variation
    assert.ok(t.scaleY >= 0.65 && t.scaleY <= 1.75, `scaleY ${t.scaleY} out of bounds`);
    assert.ok(t.scaleX >= 0.65 && t.scaleX <= 1.75, `scaleX ${t.scaleX} out of bounds`);

    // Rotation is full 360 degrees
    assert.ok(t.rotationY >= 0 && t.rotationY <= Math.PI * 2 + 0.01);

    // Tilt angle is subtle organic lean, not fallen log
    const totalTilt = Math.hypot(t.tiltX, t.tiltZ);
    assert.ok(totalTilt <= 0.16, `Tree tilt ${totalTilt} rad exceeds organic threshold (~9°)`);
  }
});

test('Software WebGL safeguard: caps vegetation instances to maintain responsiveness', () => {
  const hardwarePlacements = generateVegetationPlacements({
    isSoftwareGl: false,
    treeTargetCount: 3400,
    understoryTargetCount: 1800,
  });

  const softwarePlacements = generateVegetationPlacements({
    isSoftwareGl: true,
    treeTargetCount: 3400,
    understoryTargetCount: 1800,
  });

  assert.ok(softwarePlacements.trees.length <= 1500);
  assert.ok(softwarePlacements.understory.length <= 900);
  assert.ok(hardwarePlacements.trees.length > softwarePlacements.trees.length);
});

test('All tree and understory prototypes build valid geometries with normals and non-zero bounds', () => {
  const builders = [
    { name: 'Scots Pine', fn: buildScotsPinePrototype },
    { name: 'Mature Oak', fn: buildMatureOakPrototype },
    { name: 'Silver Birch', fn: buildSilverBirchPrototype },
    { name: 'Mountain Spruce', fn: buildMountainSprucePrototype },
    { name: 'Understory Bush', fn: buildUnderstoryBushPrototype },
    { name: 'Low Scrub', fn: buildLowScrubPrototype },
  ];

  for (const b of builders) {
    const proto = b.fn();
    assert.ok(proto.trunkGeometry, `${b.name} has no trunkGeometry`);
    assert.ok(proto.foliageGeometry, `${b.name} has no foliageGeometry`);

    const trunkPos = proto.trunkGeometry.attributes.position;
    const foliagePos = proto.foliageGeometry.attributes.position;

    assert.ok(trunkPos.count > 0, `${b.name} trunk has 0 vertices`);
    assert.ok(foliagePos.count > 0, `${b.name} foliage has 0 vertices`);

    assert.ok(proto.trunkGeometry.attributes.normal, `${b.name} trunk missing normals`);
    assert.ok(proto.foliageGeometry.attributes.normal, `${b.name} foliage missing normals`);

    assert.ok(proto.height > 0.5, `${b.name} height must be > 0.5m`);
    assert.ok(proto.crownRadius > 0.4, `${b.name} crownRadius must be > 0.4m`);

    proto.trunkGeometry.dispose();
    proto.foliageGeometry.dispose();
  }
});
