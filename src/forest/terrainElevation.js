/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pure mathematical elevation, noise synthesis, and road profile functions for The Hidden Forest.
 * Decoupled from WebGL and DOM contexts for deterministic testing and cross-system evaluation.
 */

/**
 * Pseudo-random 2D gradient hash for smooth continuous simplex/Perlin-style noise.
 * @param {number} x
 * @param {number} z
 * @returns {number} Value in range [-1, 1]
 */
function hash2d(x, z) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return (n - Math.floor(n)) * 2.0 - 1.0;
}

/**
 * Smooth 2D value noise with quintic Hermite interpolation.
 * @param {number} x
 * @param {number} z
 * @returns {number} Value in range [-1, 1]
 */
export function smoothNoise2D(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;

  // Quintic fade curve: 6t^5 - 15t^4 + 10t^3
  const ux = fx * fx * fx * (fx * (fx * 6.0 - 15.0) + 10.0);
  const uz = fz * fz * fz * (fz * (fz * 6.0 - 15.0) + 10.0);

  const a = hash2d(ix, iz);
  const b = hash2d(ix + 1, iz);
  const c = hash2d(ix, iz + 1);
  const d = hash2d(ix + 1, iz + 1);

  const nx0 = a + ux * (b - a);
  const nx1 = c + ux * (d - c);

  return nx0 + uz * (nx1 - nx0);
}

/**
 * Multi-octave Fractional Brownian Motion (FBM) for natural rolling terrain contours.
 * @param {number} x
 * @param {number} z
 * @param {number} [octaves=4]
 * @returns {number} Normalized elevation value roughly in [-1, 1]
 */
export function fbmNoise2D(x, z, octaves = 4) {
  let total = 0.0;
  let amplitude = 0.55;
  let frequency = 1.0;
  let maxAmp = 0.0;

  for (let i = 0; i < octaves; i++) {
    total += smoothNoise2D(x * frequency, z * frequency) * amplitude;
    maxAmp += amplitude;
    frequency *= 2.02;
    amplitude *= 0.48;
  }

  return total / maxAmp;
}

/**
 * Key control points defining the main winding forest access road.
 * Surveyed to curve naturally through the landscape, following terrain elevation,
 * skirting gentle hill shoulders, and dipping into shallow valley corridors.
 * Coordinates in world space [X, Z].
 */
export const ROAD_CONTROL_POINTS = [
  { x: 0.0, z: 6.0 },       // Waypoint 0: starts right in front of camera
  { x: 2.0, z: -15.0 },     // Waypoint 1: gentle curving rightward in immediate foreground
  { x: 6.5, z: -45.0 },     // Waypoint 2: clearly visible foreground curve
  { x: 15.0, z: -85.0 },    // Waypoint 3: skirting the foot of the eastern hill
  { x: 23.0, z: -135.0 },   // Waypoint 4: winding through the middle valley corridor
  { x: 19.0, z: -190.0 },   // Waypoint 5: curving around a gentle ridge shoulder
  { x: 3.0, z: -255.0 },    // Waypoint 6: dipping through a shallow saddle pass (hidden contour)
  { x: -15.0, z: -330.0 },  // Waypoint 7: re-emerging in the western valley basin
  { x: -25.0, z: -420.0 },  // Waypoint 8: sweeping across the open valley glade
  { x: -10.0, z: -520.0 },  // Waypoint 9: rising toward the northern vista ridge
  { x: 12.0, z: -630.0 },   // Waypoint 10: winding into the distant pine valley
  { x: 6.0, z: -740.0 },    // Waypoint 11: fading gracefully into atmospheric distance fog
  { x: -15.0, z: -860.0 },  // Waypoint 12: distant terminus in atmospheric depth
];

/**
 * Analytical model for natural rolling terrain without artificial cliff clamps.
 * Produces gentle rolling hills, broad valleys, and natural slopes with no harsh cliffs.
 *
 * @param {number} x - World X coordinate in meters.
 * @param {number} z - World Z coordinate in meters.
 * @returns {number} Raw elevation in meters.
 */
function calculateNaturalHeight(x, z) {
  // Road corridor path around which the valley is centered
  const valleyCurveX = Math.sin(z * 0.009) * 22.0 + Math.cos(z * 0.004) * 8.0 - 8.0;

  // Valley cradle along the road: hills rise on both sides (lateral slopes)
  const distFromValley = Math.abs(x - valleyCurveX);
  const valleyFlank = Math.min(14.0, Math.pow(distFromValley / 45.0, 1.8) * 4.2);

  // Natural rolling hills and ridges
  const swell = fbmNoise2D(x * 0.0022, z * 0.0022, 3) * 6.5;
  const hillocks = smoothNoise2D((x + 75) * 0.008, (z - 50) * 0.008) * 3.5;
  const localRoll = smoothNoise2D((x - 30) * 0.018, (z + 20) * 0.018) * 1.4;

  // Gentle longitudinal gradient: rolling slopes along travel direction
  const longitudinal = Math.sin(z * 0.005) * 3.0 - (z * 0.0025);

  return valleyFlank + swell + hillocks + localRoll + longitudinal;
}

// Fixed baseline elevation at camera origin (0, 0)
const BASELINE_ORIGIN_ELEVATION = calculateNaturalHeight(0, 0);

/**
 * Calculates raw natural terrain elevation at world coordinates (x, z).
 * Zero-anchored at (0, 0) for seamless first-person camera positioning.
 *
 * @param {number} x - World X coordinate in meters.
 * @param {number} z - World Z coordinate in meters.
 * @returns {number} Elevation in meters (Y coordinate).
 */
export function getRawTerrainElevation(x, z) {
  return calculateNaturalHeight(x, z) - BASELINE_ORIGIN_ELEVATION;
}

/**
 * Finds the minimum distance from point (x, z) to the piecewise-linear road centerline.
 * @param {number} x
 * @param {number} z
 * @param {Array<{x: number, z: number}>} [points=ROAD_CONTROL_POINTS]
 * @returns {{ distance: number, closestPoint: { x: number, z: number }, segmentIndex: number }}
 */
export function getDistanceToRoad(x, z, points = ROAD_CONTROL_POINTS) {
  let minDistanceSq = Infinity;
  let closestX = 0;
  let closestZ = 0;
  let bestSegIndex = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const lenSq = dx * dx + dz * dz;

    if (lenSq === 0) continue;

    // Projection factor clamped to segment [0, 1]
    const u = Math.max(0, Math.min(1, ((x - p1.x) * dx + (z - p1.z) * dz) / lenSq));

    const projX = p1.x + u * dx;
    const projZ = p1.z + u * dz;

    const distSq = (x - projX) * (x - projX) + (z - projZ) * (z - projZ);

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      closestX = projX;
      closestZ = projZ;
      bestSegIndex = i;
    }
  }

  return {
    distance: Math.sqrt(minDistanceSq),
    closestPoint: { x: closestX, z: closestZ },
    segmentIndex: bestSegIndex,
  };
}

/**
 * Computes the final natural terrain elevation with a graded roadbed carved into the landscape.
 * Blends smoothly across the road width (5.2m) and soft shoulders (up to 8m) so the road
 * naturally beds into the earth without floating or harsh stepped seams.
 *
 * @param {number} x - World X coordinate in meters.
 * @param {number} z - World Z coordinate in meters.
 * @returns {number} Final terrain elevation in meters.
 */
export function getTerrainHeight(x, z) {
  const rawHeight = getRawTerrainElevation(x, z);

  // Check proximity to the road centerline
  const { distance, closestPoint } = getDistanceToRoad(x, z);

  const roadHalfWidth = 2.6; // 5.2m total road carriageway
  const shoulderWidth = 4.0; // 4.0m soft sloping shoulder blend

  if (distance > roadHalfWidth + shoulderWidth) {
    return rawHeight;
  }

  // Sample raw elevation at the road centerline
  const roadCenterHeight = getRawTerrainElevation(closestPoint.x, closestPoint.z);

  // Add subtle crown: center of road is 0.04m higher than the shoulders
  const crown = (1.0 - Math.min(1.0, distance / roadHalfWidth)) * 0.04;

  if (distance <= roadHalfWidth) {
    // Within the road surface: smooth graded surface with subtle crown
    return roadCenterHeight + crown;
  }

  // Within the shoulder transition: smooth cubic Hermite blend between road and raw terrain
  const t = (distance - roadHalfWidth) / shoulderWidth;
  const smoothT = t * t * (3 - 2 * t);

  return (roadCenterHeight + crown) * (1 - smoothT) + rawHeight * smoothT;
}

/**
 * Computes terrain normal vector analytically via central finite differences.
 * @param {number} x
 * @param {number} z
 * @param {number} [h=0.5] - Finite difference step in meters.
 * @returns {{ x: number, y: number, z: number }} Normalized normal vector
 */
export function getTerrainNormal(x, z, h = 0.5) {
  const dy_dx = (getTerrainHeight(x + h, z) - getTerrainHeight(x - h, z)) / (2 * h);
  const dy_dz = (getTerrainHeight(x, z + h) - getTerrainHeight(x, z - h)) / (2 * h);

  const nx = -dy_dx;
  const ny = 1.0;
  const nz = -dy_dz;

  const len = Math.hypot(nx, ny, nz);
  return {
    x: nx / len,
    y: ny / len,
    z: nz / len,
  };
}
