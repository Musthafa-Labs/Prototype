/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  smoothNoise2D,
  fbmNoise2D,
  getRawTerrainElevation,
  getDistanceToRoad,
  getTerrainHeight,
  getTerrainNormal,
  ROAD_CONTROL_POINTS,
} from './terrainElevation.js';

test('smoothNoise2D and fbmNoise2D produce bounded continuous values', () => {
  for (let x = -100; x <= 100; x += 35) {
    for (let z = -100; z <= 100; z += 35) {
      const sn = smoothNoise2D(x * 0.1, z * 0.1);
      assert.ok(sn >= -1.05 && sn <= 1.05, `Noise out of bounds: ${sn}`);

      const fbm = fbmNoise2D(x * 0.05, z * 0.05, 3);
      assert.ok(fbm >= -1.5 && fbm <= 1.5, `FBM out of bounds: ${fbm}`);
    }
  }
});

test('terrain elevation is within gentle rolling landscape bounds (no extreme cliffs)', () => {
  let minH = Infinity;
  let maxH = -Infinity;

  // Sample across 1000m x 1000m exploration area
  for (let x = -500; x <= 500; x += 50) {
    for (let z = -800; z <= 100; z += 50) {
      const h = getTerrainHeight(x, z);
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }
  }

  // Realistic gentle hills and valleys: should not drop below -40m or exceed +50m
  assert.ok(minH > -40, `Terrain lowest valley too extreme: ${minH}m`);
  assert.ok(maxH < 50, `Terrain highest peak too extreme: ${maxH}m`);
  assert.ok(maxH - minH > 10, `Terrain lacks topographical variation: range is ${maxH - minH}m`);
});

test('road control points define a continuous scenic winding path', () => {
  assert.ok(ROAD_CONTROL_POINTS.length >= 8, 'Road must have sufficient waypoints');

  // Verify road progresses in negative Z direction (away from starting viewpoint)
  for (let i = 0; i < ROAD_CONTROL_POINTS.length - 1; i++) {
    const cur = ROAD_CONTROL_POINTS[i];
    const next = ROAD_CONTROL_POINTS[i + 1];
    assert.ok(next.z < cur.z, `Road waypoint ${i+1} must advance forward in distance (-Z)`);
    const dist = Math.hypot(next.x - cur.x, next.z - cur.z);
    assert.ok(dist >= 20 && dist <= 160, `Segment length between waypoints ${dist}m must be smooth`);
  }
});

test('getDistanceToRoad accurately calculates distance to road centerline', () => {
  // Test point directly on the first control point
  const firstPt = ROAD_CONTROL_POINTS[0];
  const onRoad = getDistanceToRoad(firstPt.x, firstPt.z);
  assert.ok(onRoad.distance < 0.001, `Distance on road waypoint must be zero: ${onRoad.distance}`);

  // Test point 10m to the right of road
  const offRoad = getDistanceToRoad(firstPt.x + 10, firstPt.z);
  assert.ok(Math.abs(offRoad.distance - 10) < 0.5, `Distance should be ~10m, got ${offRoad.distance}`);
});

test('roadbed blends smoothly into terrain without height seams or spikes', () => {
  const p = ROAD_CONTROL_POINTS[2]; // Near x=14, z=-65

  // Sample across transverse cross-section of road (-15m to +15m perpendicular)
  let lastH = getTerrainHeight(p.x - 15, p.z);

  for (let offset = -14; offset <= 15; offset += 0.5) {
    const h = getTerrainHeight(p.x + offset, p.z);
    const slope = Math.abs(h - lastH) / 0.5;
    // Max slope across road and shoulder transition should be gentle (< 0.45 or ~24 degrees)
    assert.ok(slope < 0.45, `Road transition slope at offset ${offset}m too steep: ${slope}`);
    lastH = h;
  }
});

test('getTerrainNormal computes valid upward-pointing unit normal vectors', () => {
  for (let x = -100; x <= 100; x += 50) {
    for (let z = -200; z <= 0; z += 50) {
      const normal = getTerrainNormal(x, z);
      const len = Math.hypot(normal.x, normal.y, normal.z);
      assert.ok(Math.abs(len - 1.0) < 0.01, `Normal vector must be unit length: ${len}`);
      assert.ok(normal.y > 0.7, `Terrain normal must point predominantly upwards: ${normal.y}`);
    }
  }
});
