/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { getTerrainHeight } from './terrainElevation.js';

/**
 * Key surveyed waypoints defining the natural forest stream path.
 * Flows downhill from the high wooded western hillside through a shallow valley,
 * drops over a rocky ledge as a small waterfall into a plunge pool, and meanders
 * through the valley glade into a tranquil lower forest pool.
 *
 * All coordinates in world space [X, Z] with local target width in meters.
 */
export const STREAM_WAYPOINTS = [
  { x: -68.0, z: -88.0, width: 2.4, isPool: false }, // Waypoint 0: Headwaters spring in upper birch/pine hillside (~4.96m elev)
  { x: -59.0, z: -78.0, width: 2.8, isPool: false }, // Waypoint 1: Narrow woodland brook between mossy roots (~3.75m elev)
  { x: -51.0, z: -68.0, width: 3.3, isPool: false }, // Waypoint 2: Clear stream approaching rocky crest (~3.11m elev)
  { x: -45.0, z: -58.0, width: 3.6, isPool: false }, // Waypoint 3: Lip / crest of the small waterfall (~2.75m elev)
  { x: -38.0, z: -50.0, width: 3.2, isWaterfall: true }, // Waypoint 4: Cascade shelf drop over rock ledge (~2.21m elev)
  { x: -32.0, z: -42.0, width: 6.8, isPool: true },  // Waypoint 5: Serene plunge pool at base of waterfall (~1.72m elev)
  { x: -27.0, z: -32.0, width: 4.2, isPool: false }, // Waypoint 6: Exiting plunge pool into open valley glade (~1.32m elev)
  { x: -22.0, z: -18.0, width: 3.6, isPool: false }, // Waypoint 7: Gently curving woodland stream (~1.02m elev)
  { x: -17.0, z: -4.0,  width: 4.0, isPool: false }, // Waypoint 8: Meandering through foreground-left clearing (~0.60m elev)
  { x: -13.0, z: 8.0,   width: 4.8, isPool: false }, // Waypoint 9: Shallow sparkling ripples over gravel bed (~0.10m elev)
  { x: -9.5,  z: 20.0,  width: 6.5, isPool: true },  // Waypoint 10: Tranquil shallow forest basin pool (-0.09m elev)
];

/**
 * Waterfall specific configuration and dimensions.
 */
export const WATERFALL_CONFIG = {
  crestWaypointIndex: 3,
  dropWaypointIndex: 4,
  poolWaypointIndex: 5,
  crestPoint: { x: -45.0, z: -58.0 },
  shelfPoint: { x: -38.0, z: -50.0 },
  poolCenter: { x: -32.0, z: -42.0 },
  poolRadiusX: 4.2,
  poolRadiusZ: 3.8,
  cascadeWidth: 3.2,
  cascadeHeightDrop: 1.03, // Natural small waterfall drop (~1.03m)
};

/**
 * Creates a Catmull-Rom spline curve from the 2D stream waypoints.
 * @param {Array<{x: number, z: number}>} [waypoints=STREAM_WAYPOINTS]
 * @returns {THREE.CatmullRomCurve3}
 */
export function createStreamSpline(waypoints = STREAM_WAYPOINTS) {
  const points = waypoints.map((pt) => new THREE.Vector3(pt.x, 0, pt.z));
  return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
}

// Cached spline instance for efficient spatial queries
let cachedSpline = null;
let cachedWaypoints = null;

function getSplineInstance() {
  if (!cachedSpline || cachedWaypoints !== STREAM_WAYPOINTS) {
    cachedSpline = createStreamSpline(STREAM_WAYPOINTS);
    cachedWaypoints = STREAM_WAYPOINTS;
  }
  return cachedSpline;
}

/**
 * Evaluates the stream width at fractional curve parameter u in [0, 1].
 * Interpolates smoothly between waypoint widths and adds subtle natural meandering width variance.
 *
 * @param {number} u - Normalized parameter [0, 1] along the stream.
 * @param {Array<{width: number}>} [waypoints=STREAM_WAYPOINTS]
 * @returns {number} Stream width in meters.
 */
export function getStreamWidthAt(u, waypoints = STREAM_WAYPOINTS) {
  const clampedU = Math.max(0, Math.min(1, u));
  const segmentFraction = clampedU * (waypoints.length - 1);
  const index = Math.floor(segmentFraction);
  const nextIndex = Math.min(waypoints.length - 1, index + 1);
  const t = segmentFraction - index;

  // Smooth Hermite blend between waypoint widths
  const smoothT = t * t * (3 - 2 * t);
  const baseWidth = waypoints[index].width * (1 - smoothT) + waypoints[nextIndex].width * smoothT;

  // Subtle natural undulating width ripple (±0.25m)
  const ripple = Math.sin(clampedU * Math.PI * 12) * 0.20;
  return Math.max(2.0, baseWidth + ripple);
}

/**
 * Calculates the water surface elevation along the stream.
 * Smoothly interpolates the downhill hydraulic gradient and ensures water never flows uphill.
 *
 * @param {number} u - Normalized parameter [0, 1] along the stream.
 * @param {THREE.CatmullRomCurve3} [spline]
 * @returns {number} Water surface elevation in meters.
 */
export function getStreamWaterElevation(u, spline = null) {
  const s = spline || getSplineInstance();
  const clampedU = Math.max(0, Math.min(1, u));
  const pos = new THREE.Vector3();
  s.getPointAt(clampedU, pos);

  const rawGround = getTerrainHeight(pos.x, pos.z);

  // At the waterfall cascade (between u ~ 0.28 and 0.52):
  // The water surface smoothly transitions over the rock shelf into the plunge pool
  const uCascadeStart = 0.28; // Waypoint 3 crest
  const uCascadeEnd = 0.52;   // Waypoint 5 pool

  if (clampedU < uCascadeStart) {
    // Upper reach: water rests slightly into the natural valley bed (0.04m above carved bed)
    return rawGround + 0.04;
  } else if (clampedU <= uCascadeEnd) {
    // Cascade slope: steep smooth hydraulic drop
    const tCascade = (clampedU - uCascadeStart) / (uCascadeEnd - uCascadeStart);
    const smoothT = tCascade * tCascade * (3 - 2 * tCascade);

    const crestY = getTerrainHeight(STREAM_WAYPOINTS[3].x, STREAM_WAYPOINTS[3].z) + 0.04;
    const poolY = getTerrainHeight(STREAM_WAYPOINTS[5].x, STREAM_WAYPOINTS[5].z) + 0.03;

    return crestY * (1 - smoothT) + poolY * smoothT;
  } else {
    // Lower reach: tranquil water flowing into the valley glade
    return rawGround + 0.035;
  }
}

/**
 * Finds the minimum distance from point (x, z) to the piecewise-linear stream centerline.
 * Similar to getDistanceToRoad, provides fast spatial lookups for vegetation and floor placement exclusion.
 *
 * @param {number} x
 * @param {number} z
 * @param {Array<{x: number, z: number, width: number}>} [waypoints=STREAM_WAYPOINTS]
 * @returns {{
 *   distance: number,
 *   closestPoint: { x: number, z: number },
 *   u: number,
 *   streamWidth: number,
 *   isInsideWater: boolean,
 *   segmentIndex: number
 * }}
 */
export function getDistanceToStream(x, z, waypoints = STREAM_WAYPOINTS) {
  let minDistanceSq = Infinity;
  let closestX = 0;
  let closestZ = 0;
  let bestSegIndex = 0;
  let bestU = 0;

  const numSegs = waypoints.length - 1;

  for (let i = 0; i < numSegs; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];

    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const lenSq = dx * dx + dz * dz;

    if (lenSq === 0) continue;

    const uClamped = Math.max(0, Math.min(1, ((x - p1.x) * dx + (z - p1.z) * dz) / lenSq));

    const projX = p1.x + uClamped * dx;
    const projZ = p1.z + uClamped * dz;

    const distSq = (x - projX) * (x - projX) + (z - projZ) * (z - projZ);

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      closestX = projX;
      closestZ = projZ;
      bestSegIndex = i;
      bestU = (i + uClamped) / numSegs;
    }
  }

  const distance = Math.sqrt(minDistanceSq);
  const streamWidth = getStreamWidthAt(bestU, waypoints);
  const isInsideWater = distance <= streamWidth / 2;

  return {
    distance,
    closestPoint: { x: closestX, z: closestZ },
    u: bestU,
    streamWidth,
    isInsideWater,
    segmentIndex: bestSegIndex,
  };
}
