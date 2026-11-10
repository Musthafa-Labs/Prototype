/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STREAM_WAYPOINTS,
  WATERFALL_CONFIG,
  createStreamSpline,
  getStreamWidthAt,
  getStreamWaterElevation,
  getDistanceToStream,
} from './streamPath.js';
import { getDistanceToRoad, getTerrainHeight } from './terrainElevation.js';
import { ROAD_MIN_VEGETATION_CLEARANCE } from './vegetationDistribution.js';
import { createWaterMaterials } from './waterMaterial.js';

test('Stream Path: waypoints define a continuous downhill hydraulic gradient', () => {
  const spline = createStreamSpline(STREAM_WAYPOINTS);
  const totalLength = spline.getLength();

  // Verify stream length is roughly 120m - 160m (woodland stream, not massive river)
  assert.ok(totalLength >= 120 && totalLength <= 165, `Stream length ${totalLength}m out of expected bounds`);

  // Sample elevation along the stream from headwaters (u=0) to lower glade (u=0.9)
  // Ensure water elevation decreases monotonically downhill without flowing uphill
  let prevElev = getStreamWaterElevation(0, spline);

  for (let step = 1; step <= 25; step++) {
    const u = (step / 25) * 0.90; // Up to glade pool
    const currentElev = getStreamWaterElevation(u, spline);

    assert.ok(
      currentElev <= prevElev + 0.05,
      `Stream water flowed uphill at u=${u.toFixed(2)}: prev=${prevElev.toFixed(2)}m, curr=${currentElev.toFixed(2)}m`
    );
    prevElev = currentElev;
  }
});

test('Stream Width: conforms to woodland scale (narrow 2-3m, normal 3-5m, pools 5-8m)', () => {
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    const width = getStreamWidthAt(u, STREAM_WAYPOINTS);

    // Absolute bounds: never narrower than 2.0m, never wider than 8.0m (not a wide river)
    assert.ok(width >= 2.0, `Width ${width}m at u=${u} is too narrow (< 2m)`);
    assert.ok(width <= 8.0, `Width ${width}m at u=${u} is too wide (> 8m, would be a river)`);
  }

  // Plunge pool at waypoint 5 should be within 5m - 8m
  const plungePoolWidth = STREAM_WAYPOINTS[WATERFALL_CONFIG.poolWaypointIndex].width;
  assert.ok(plungePoolWidth >= 5.0 && plungePoolWidth <= 8.0, `Plunge pool width ${plungePoolWidth}m outside [5, 8]`);
});

test('Waterfall: geometry defines a small natural rocky drop into a plunge pool', () => {
  const cfg = WATERFALL_CONFIG;
  const crestH = getTerrainHeight(cfg.crestPoint.x, cfg.crestPoint.z);
  const poolH = getTerrainHeight(cfg.poolCenter.x, cfg.poolCenter.z);

  const actualDrop = crestH - poolH;

  // Verify natural small drop (~0.8m - 1.6m), not a massive cinematic cliff
  assert.ok(actualDrop >= 0.7 && actualDrop <= 1.8, `Waterfall drop ${actualDrop}m outside expected natural range [0.7m, 1.8m]`);
  assert.ok(cfg.cascadeWidth >= 2.5 && cfg.cascadeWidth <= 4.0, 'Cascade width must fit natural stream scale');
  assert.ok(cfg.poolRadiusX >= 3.0 && cfg.poolRadiusX <= 5.5, 'Pool radius must cradle the plunge pool');
});

test('Road clearance: stream never penetrates or crosses the road carriageway (< 4.2m)', () => {
  const spline = createStreamSpline(STREAM_WAYPOINTS);

  for (let i = 0; i <= 50; i++) {
    const u = i / 50;
    const pt = spline.getPointAt(u);
    const { distance } = getDistanceToRoad(pt.x, pt.z);
    const width = getStreamWidthAt(u, STREAM_WAYPOINTS);
    const bankDistance = distance - (width / 2);

    // Bank must stay strictly clear of the road carriageway
    assert.ok(
      bankDistance > ROAD_MIN_VEGETATION_CLEARANCE,
      `Stream bank at u=${u} encroached road clearance: bankDistance=${bankDistance.toFixed(2)}m <= ${ROAD_MIN_VEGETATION_CLEARANCE}m`
    );
  }
});

test('getDistanceToStream: accurately identifies points inside water channel and bank proximity', () => {
  // Test a point directly at headwaters waypoint 0
  const wp0 = STREAM_WAYPOINTS[0];
  const query0 = getDistanceToStream(wp0.x, wp0.z);

  assert.ok(query0.distance < 0.1, `Query at waypoint 0 should have near-0 distance, got ${query0.distance}`);
  assert.ok(query0.isInsideWater, 'Point at waypoint 0 must be inside water');

  // Test a point far away from stream (e.g. road origin at 0, 0)
  const queryFar = getDistanceToStream(0, 0);
  assert.ok(queryFar.distance > 10.0, 'Origin (0, 0) should be far from stream');
  assert.equal(queryFar.isInsideWater, false, 'Origin (0, 0) must not be inside water');
});

test('Water Materials: creates valid PBR materials and textures with clean disposal', () => {
  const matBundle = createWaterMaterials({ isSoftwareGl: false, maxAnisotropy: 8 });

  assert.ok(matBundle.materials.waterSurface, 'waterSurface material must exist');
  assert.ok(matBundle.materials.waterfall, 'waterfall material must exist');
  assert.ok(matBundle.materials.streamBed, 'streamBed material must exist');
  assert.ok(matBundle.materials.wetRock, 'wetRock material must exist');

  // Verify physically based attributes
  assert.ok(matBundle.materials.waterSurface.transparent, 'Water surface must be transparent');
  assert.ok(matBundle.materials.waterSurface.roughness <= 0.25, 'Water roughness must reflect naturally');
  assert.ok(matBundle.materials.wetRock.roughness < 0.50, 'Wet rock must have smooth glistening sheen');

  // Ensure disposal executes without errors
  matBundle.dispose();
});
