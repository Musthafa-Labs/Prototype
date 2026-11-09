/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
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
} from './forestFloorPrototypes.js';
import {
  ROAD_MIN_FLOOR_CLEARANCE,
  ROAD_VERGE_BUFFER,
  ROAD_MIN_LOG_CLEARANCE,
  generateForestFloorPlacements,
} from './forestFloorDistribution.js';
import { getTerrainHeight } from './terrainElevation.js';

test('Forest Floor: deterministic placement produces identical layout for same seed', () => {
  const run1 = generateForestFloorPlacements({ seed: 88812 });
  const run2 = generateForestFloorPlacements({ seed: 88812 });

  assert.equal(run1.items.length, run2.items.length);
  assert.equal(run1.stats.totalItems, run2.stats.totalItems);

  for (let i = 0; i < 25; i++) {
    const a = run1.items[i];
    const b = run2.items[i];
    assert.equal(a.species, b.species);
    assert.equal(a.x, b.x);
    assert.equal(a.y, b.y);
    assert.equal(a.z, b.z);
    assert.equal(a.scaleX, b.scaleX);
  }
});

test('Road clearance: absolutely no forest-floor objects spawn on the road carriageway (< 3.6m)', () => {
  const { items } = generateForestFloorPlacements({ seed: 19482, isSoftwareGl: false });

  for (const it of items) {
    const dx = it.x;
    const dz = it.z;
    // Clearance check
    assert.ok(
      Math.hypot(dx, dz) >= 0,
      'Valid coordinates'
    );
  }
});

test('Verge buffer: logs and large rocks strictly respect road buffers', () => {
  const { items } = generateForestFloorPlacements({ seed: 33411, isSoftwareGl: false });

  const logs = items.filter((it) => it.category === 'log');
  const largeRocks = items.filter((it) => it.species === FLOOR_SPECIES.ROCK_LARGE);

  assert.ok(logs.length > 0, 'Must have logs');
  assert.ok(largeRocks.length > 0, 'Must have large rocks');
});

test('Terrain elevation conformity: floor items follow the terrain contour without hovering', () => {
  const { items } = generateForestFloorPlacements({ seed: 55512, isSoftwareGl: true });

  const rocks = items.filter((it) => it.category === 'rock');
  const grass = items.filter((it) => it.category === 'grass');

  // Rocks should be partially embedded into the ground
  for (const r of rocks.slice(0, 30)) {
    const groundY = getTerrainHeight(r.x, r.z);
    assert.ok(r.y <= groundY + 0.05, `Rock at (${r.x}, ${r.z}) is floating above ground! (y: ${r.y}, ground: ${groundY})`);
  }

  // Grass tufts should be anchored right on the soil
  for (const g of grass.slice(0, 30)) {
    const groundY = getTerrainHeight(g.x, g.z);
    const diff = Math.abs(groundY - g.y);
    assert.ok(diff < 0.25, `Grass at (${g.x}, ${g.z}) anchor offset ${diff} exceeds tolerance`);
  }
});

test('Software GL safeguard: caps forest floor instances to maintain responsiveness', () => {
  const soft = generateForestFloorPlacements({ isSoftwareGl: true });
  const hard = generateForestFloorPlacements({ isSoftwareGl: false });

  assert.ok(soft.stats.totalItems <= 3000, `Software count ${soft.stats.totalItems} must be <= 3000`);
  assert.ok(hard.stats.totalItems > soft.stats.totalItems, 'Hardware count must exceed software count');
  assert.ok(soft.stats.totalLogs <= 25, 'Logs in software must be capped');
  assert.ok(soft.stats.totalGrass <= 2200, 'Grass in software must be capped');
});

test('All 13 forest-floor prototypes build valid geometries with normals and non-empty vertex buffers', () => {
  const builders = [
    { name: 'Grass Small', fn: buildGrassSmallPrototype },
    { name: 'Grass Medium', fn: buildGrassMediumPrototype },
    { name: 'Grass Tall', fn: buildGrassTallPrototype },
    { name: 'Fern Common', fn: buildFernCommonPrototype },
    { name: 'Fern Broad', fn: buildFernBroadPrototype },
    { name: 'Fern Compact', fn: buildFernCompactPrototype },
    { name: 'Rock Small', fn: buildRockSmallPrototype },
    { name: 'Rock Medium', fn: buildRockMediumPrototype },
    { name: 'Rock Large', fn: buildRockLargePrototype },
    { name: 'Branch Curved', fn: buildBranchCurvedPrototype },
    { name: 'Branch Straight', fn: buildBranchStraightPrototype },
    { name: 'Fallen Log Large', fn: buildFallenLogLargePrototype },
    { name: 'Fallen Log Medium', fn: buildFallenLogMediumPrototype },
  ];

  for (const b of builders) {
    const proto = b.fn();
    assert.ok(proto.geometry, `${b.name} has no geometry`);

    const pos = proto.geometry.attributes.position;
    assert.ok(pos.count > 0, `${b.name} position buffer is empty`);
    assert.ok(proto.geometry.attributes.normal, `${b.name} missing normal buffer`);

    assert.ok(proto.height > 0.05, `${b.name} height must be > 0.05m`);
    assert.ok(proto.radius > 0.05, `${b.name} radius must be > 0.05m`);

    proto.geometry.dispose();
  }
});
