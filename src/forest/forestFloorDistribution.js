/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getTerrainHeight, getTerrainNormal, getDistanceToRoad, smoothNoise2D, fbmNoise2D } from './terrainElevation.js';
import { createDeterministicRng } from './vegetationDistribution.js';
import { FLOOR_SPECIES } from './forestFloorPrototypes.js';

export const ROAD_MIN_FLOOR_CLEARANCE = 3.6; // Absolute zero floor detail on carriageway
export const ROAD_VERGE_BUFFER = 6.0;        // Only small grass/pebble allowed in 3.6m - 6.0m
export const ROAD_MIN_LOG_CLEARANCE = 12.0;  // Logs kept well back from road

/**
 * Generates deterministic procedural placements for forest floor details:
 * grass tufts, ferns, rocks, fallen branches, and occasional fallen logs.
 *
 * @param {Object} [options]
 * @param {number} [options.seed=58213]
 * @param {boolean} [options.isSoftwareGl=false]
 * @param {number} [options.maxDistance=650]
 * @returns {{
 *   items: Array<{
 *     species: string,
 *     category: 'grass' | 'fern' | 'rock' | 'deadwood' | 'log',
 *     x: number,
 *     y: number,
 *     z: number,
 *     rotationY: number,
 *     tiltX: number,
 *     tiltZ: number,
 *     scaleX: number,
 *     scaleY: number,
 *     scaleZ: number,
 *     tint: { r: number, g: number, b: number }
 *   }>,
 *   stats: {
 *     totalGrass: number,
 *     totalFerns: number,
 *     totalRocks: number,
 *     totalDeadwood: number,
 *     totalLogs: number,
 *     totalItems: number,
 *     speciesCounts: Record<string, number>
 *   }
 * }}
 */
export function generateForestFloorPlacements(options = {}) {
  const {
    seed = 58213,
    isSoftwareGl = false,
    maxDistance = 650,
  } = options;

  const rng = createDeterministicRng(seed);

  // Targets scaled appropriately for software preview vs hardware GPU
  const targetGrass = isSoftwareGl ? 1800 : 5200;
  const targetFerns = isSoftwareGl ? 450 : 1500;
  const targetRocks = isSoftwareGl ? 280 : 850;
  const targetDeadwood = isSoftwareGl ? 120 : 350;
  const targetLogs = isSoftwareGl ? 18 : 36;

  const items = [];
  const speciesCounts = {};
  Object.values(FLOOR_SPECIES).forEach((k) => { speciesCounts[k] = 0; });

  let grassCount = 0;
  let fernCount = 0;
  let rockCount = 0;
  let deadwoodCount = 0;
  let logCount = 0;

  // 1. Generate Fallen Logs First (Rare, prominent landscape features)
  const logCandidates = targetLogs * 4;
  for (let l = 0; l < logCandidates && logCount < targetLogs; l++) {
    const roadProgress = rng();
    const roadZ = 10.0 - roadProgress * 840.0;
    const { closestPoint } = getDistanceToRoad(0, roadZ);

    const side = rng() < 0.5 ? -1 : 1;
    const lateralDist = ROAD_MIN_LOG_CLEARANCE + 4.0 + rng() * 85.0;
    const x = closestPoint.x + side * lateralDist + (rng() - 0.5) * 15.0;
    const z = closestPoint.z + (rng() - 0.5) * 20.0;

    const distFromOrigin = Math.hypot(x, z);
    if (distFromOrigin > 850) continue;

    const { distance: distToRoad } = getDistanceToRoad(x, z);
    if (distToRoad < ROAD_MIN_LOG_CLEARANCE) continue;

    const normal = getTerrainNormal(x, z);
    if (normal.y < 0.75) continue; // avoid steep gullies

    const species = rng() < 0.55 ? FLOOR_SPECIES.FALLEN_LOG_LARGE : FLOOR_SPECIES.FALLEN_LOG_MEDIUM;
    const logLength = species === FLOOR_SPECIES.FALLEN_LOG_LARGE ? 6.2 : 4.2;
    const logRadius = species === FLOOR_SPECIES.FALLEN_LOG_LARGE ? 0.40 : 0.28;

    // Orient log tangent to local contour / along natural slope
    const rotY = rng() * Math.PI * 2;
    const tailX = x + Math.cos(rotY) * logLength;
    const tailZ = z + Math.sin(rotY) * logLength;

    // Both ends must avoid the road
    if (getDistanceToRoad(tailX, tailZ).distance < ROAD_MIN_LOG_CLEARANCE) continue;

    const headY = getTerrainHeight(x, z);
    const tailY = getTerrainHeight(tailX, tailZ);
    const midY = (headY + tailY) / 2;

    // Embed slightly into earth so log isn't teetering in mid-air
    const anchoredY = midY - logRadius * 0.35;

    // Pitch angle matching the ground slope between head and tail
    const slopePitch = Math.atan2(tailY - headY, logLength);
    const tiltX = Math.cos(rotY) * slopePitch;
    const tiltZ = Math.sin(rotY) * slopePitch;

    const scale = 0.85 + rng() * 0.35;
    const tintLuma = 0.92 + rng() * 0.16;

    items.push({
      species,
      category: 'log',
      x,
      y: anchoredY,
      z,
      rotationY: rotY,
      tiltX,
      tiltZ,
      scaleX: scale,
      scaleY: scale,
      scaleZ: scale,
      tint: { r: tintLuma, g: tintLuma * 0.96, b: tintLuma * 0.92 },
    });

    logCount++;
    speciesCounts[species]++;
  }

  // 2. Generate Rocks & Stones
  const rockCandidates = targetRocks * 3;
  for (let r = 0; r < rockCandidates && rockCount < targetRocks; r++) {
    const tier = rng();
    let x, z;
    if (tier < 0.6) {
      // Along road valley slopes
      const roadProgress = rng();
      const roadZ = 12.0 - roadProgress * 860.0;
      const { closestPoint } = getDistanceToRoad(0, roadZ);
      const side = rng() < 0.5 ? -1 : 1;
      const lateralDist = 4.5 + Math.pow(rng(), 1.3) * 90.0;
      x = closestPoint.x + side * lateralDist + (rng() - 0.5) * 12.0;
      z = closestPoint.z + (rng() - 0.5) * 15.0;
    } else {
      // Hills and distant terrain
      const angle = rng() * Math.PI * 2;
      const rad = 25.0 + Math.pow(rng(), 0.75) * maxDistance;
      x = Math.cos(angle) * rad;
      z = -140.0 + Math.sin(angle) * rad;
    }

    if (Math.hypot(x, z) > 950) continue;

    const { distance: distToRoad } = getDistanceToRoad(x, z);
    if (distToRoad < ROAD_MIN_FLOOR_CLEARANCE) continue;

    // Large rocks not allowed right on verge buffer
    const speciesRoll = rng();
    let species;
    if (distToRoad < ROAD_VERGE_BUFFER) {
      species = FLOOR_SPECIES.ROCK_SMALL;
    } else if (speciesRoll < 0.62) {
      species = FLOOR_SPECIES.ROCK_SMALL;
    } else if (speciesRoll < 0.88) {
      species = FLOOR_SPECIES.ROCK_MEDIUM;
    } else {
      species = FLOOR_SPECIES.ROCK_LARGE;
    }

    const groundY = getTerrainHeight(x, z);
    const normal = getTerrainNormal(x, z);

    let embedDepth = 0.12;
    let baseScale = 0.85 + rng() * 0.35;
    if (species === FLOOR_SPECIES.ROCK_LARGE) {
      embedDepth = 0.55 * baseScale;
    } else if (species === FLOOR_SPECIES.ROCK_MEDIUM) {
      embedDepth = 0.28 * baseScale;
    } else {
      embedDepth = 0.12 * baseScale;
    }

    const rotY = rng() * Math.PI * 2;
    // Align with terrain slope
    const tiltX = (normal.z * 0.12) + (rng() - 0.5) * 0.1;
    const tiltZ = (-normal.x * 0.12) + (rng() - 0.5) * 0.1;

    const luma = 0.88 + rng() * 0.24;
    const mossTint = rng() > 0.6 ? 1.06 : 1.0;

    items.push({
      species,
      category: 'rock',
      x,
      y: groundY - embedDepth,
      z,
      rotationY: rotY,
      tiltX,
      tiltZ,
      scaleX: baseScale * (0.92 + rng() * 0.16),
      scaleY: baseScale * (0.85 + rng() * 0.25),
      scaleZ: baseScale * (0.92 + rng() * 0.16),
      tint: { r: luma * 0.98, g: luma * mossTint, b: luma * 0.96 },
    });

    rockCount++;
    speciesCounts[species]++;
  }

  // 3. Generate Fallen Deadwood Branches
  const deadwoodCandidates = targetDeadwood * 3;
  for (let d = 0; d < deadwoodCandidates && deadwoodCount < targetDeadwood; d++) {
    const roadProgress = rng();
    const roadZ = 12.0 - roadProgress * 860.0;
    const { closestPoint } = getDistanceToRoad(0, roadZ);
    const side = rng() < 0.5 ? -1 : 1;
    const lateralDist = 6.5 + Math.pow(rng(), 1.2) * 80.0;
    const x = closestPoint.x + side * lateralDist + (rng() - 0.5) * 10.0;
    const z = closestPoint.z + (rng() - 0.5) * 12.0;

    if (Math.hypot(x, z) > 900) continue;

    const { distance: distToRoad } = getDistanceToRoad(x, z);
    if (distToRoad < ROAD_VERGE_BUFFER) continue;

    const species = rng() < 0.55 ? FLOOR_SPECIES.BRANCH_CURVED : FLOOR_SPECIES.BRANCH_STRAIGHT;
    const groundY = getTerrainHeight(x, z);
    const normal = getTerrainNormal(x, z);

    const rotY = rng() * Math.PI * 2;
    const tiltX = (normal.z * 0.15) + (rng() - 0.5) * 0.05;
    const tiltZ = (-normal.x * 0.15) + (rng() - 0.5) * 0.05;
    const scale = 0.8 + rng() * 0.45;
    const luma = 0.90 + rng() * 0.20;

    items.push({
      species,
      category: 'deadwood',
      x,
      y: groundY - 0.03, // firmly anchored on the soil
      z,
      rotationY: rotY,
      tiltX,
      tiltZ,
      scaleX: scale,
      scaleY: scale,
      scaleZ: scale,
      tint: { r: luma, g: luma * 0.96, b: luma * 0.92 },
    });

    deadwoodCount++;
    speciesCounts[species]++;
  }

  // 4. Generate Fern Clusters (Clustered around tree bases, valleys, shaded glades)
  const fernCandidates = targetFerns * 3;
  for (let f = 0; f < fernCandidates && fernCount < targetFerns; f++) {
    const roadProgress = rng();
    const roadZ = 12.0 - roadProgress * 860.0;
    const { closestPoint } = getDistanceToRoad(0, roadZ);
    const side = rng() < 0.5 ? -1 : 1;
    // Ferns prefer moist lower valley slopes and shaded verges (7m - 65m)
    const lateralDist = 6.5 + Math.pow(rng(), 1.3) * 60.0;
    const x = closestPoint.x + side * lateralDist + (rng() - 0.5) * 10.0;
    const z = closestPoint.z + (rng() - 0.5) * 14.0;

    if (Math.hypot(x, z) > 850) continue;

    const { distance: distToRoad } = getDistanceToRoad(x, z);
    if (distToRoad < ROAD_VERGE_BUFFER) continue;

    // Moisture / valley clustering preference
    const groundY = getTerrainHeight(x, z);
    const shadeNoise = smoothNoise2D(x * 0.012 + 10.0, z * 0.012 - 50.0);
    if (shadeNoise < -0.35 && groundY > 6.0) {
      // Skip high dry ridges for ferns
      continue;
    }

    const fRoll = rng();
    let species;
    if (fRoll < 0.50) {
      species = FLOOR_SPECIES.FERN_COMMON;
    } else if (fRoll < 0.80) {
      species = FLOOR_SPECIES.FERN_BROAD;
    } else {
      species = FLOOR_SPECIES.FERN_COMPACT;
    }

    const normal = getTerrainNormal(x, z);
    const rotY = rng() * Math.PI * 2;
    const tiltX = (normal.z * 0.12) + (rng() - 0.5) * 0.06;
    const tiltZ = (-normal.x * 0.12) + (rng() - 0.5) * 0.06;

    const scale = 0.80 + rng() * 0.45;
    const luma = 0.90 + rng() * 0.20;

    items.push({
      species,
      category: 'fern',
      x,
      y: groundY - 0.04 * scale,
      z,
      rotationY: rotY,
      tiltX,
      tiltZ,
      scaleX: scale * (0.94 + rng() * 0.12),
      scaleY: scale * (0.90 + rng() * 0.20),
      scaleZ: scale * (0.94 + rng() * 0.12),
      tint: { r: luma * 0.95, g: luma * 1.05, b: luma * 0.95 },
    });

    fernCount++;
    speciesCounts[species]++;
  }

  // 5. Generate Grass Clusters (Pervasive across the forest floor and glades)
  const grassCandidates = targetGrass * 2.8;
  for (let g = 0; g < grassCandidates && grassCount < targetGrass; g++) {
    const tier = rng();
    let x, z;
    if (tier < 0.65) {
      // Dense corridor along road valley and shoulders
      const roadProgress = rng();
      const roadZ = 12.0 - roadProgress * 860.0;
      const { closestPoint } = getDistanceToRoad(0, roadZ);
      const side = rng() < 0.5 ? -1 : 1;
      const lateralDist = ROAD_MIN_FLOOR_CLEARANCE + 0.5 + Math.pow(rng(), 1.25) * 95.0;
      x = closestPoint.x + side * lateralDist + (rng() - 0.5) * 12.0;
      z = closestPoint.z + (rng() - 0.5) * 15.0;
    } else {
      // Surrounding terrain glades
      const angle = rng() * Math.PI * 2;
      const rad = 25.0 + Math.pow(rng(), 0.75) * maxDistance;
      x = Math.cos(angle) * rad;
      z = -140.0 + Math.sin(angle) * rad;
    }

    if (Math.hypot(x, z) > 950) continue;

    const { distance: distToRoad } = getDistanceToRoad(x, z);
    if (distToRoad < ROAD_MIN_FLOOR_CLEARANCE) continue;

    // Grass height based on verge distance and glade exposure
    let species;
    if (distToRoad < ROAD_VERGE_BUFFER) {
      species = FLOOR_SPECIES.GRASS_SMALL;
    } else {
      const gRoll = rng();
      if (gRoll < 0.45) species = FLOOR_SPECIES.GRASS_MEDIUM;
      else if (gRoll < 0.75) species = FLOOR_SPECIES.GRASS_SMALL;
      else species = FLOOR_SPECIES.GRASS_TALL;
    }

    const groundY = getTerrainHeight(x, z);
    const normal = getTerrainNormal(x, z);
    if (normal.y < 0.70) continue;

    const rotY = rng() * Math.PI * 2;
    const tiltX = (normal.z * 0.12) + (rng() - 0.5) * 0.05;
    const tiltZ = (-normal.x * 0.12) + (rng() - 0.5) * 0.05;

    const scale = 0.80 + rng() * 0.42;
    const luma = 0.90 + rng() * 0.22;
    const greenShift = 0.94 + rng() * 0.14;

    items.push({
      species,
      category: 'grass',
      x,
      y: groundY - 0.03 * scale,
      z,
      rotationY: rotY,
      tiltX,
      tiltZ,
      scaleX: scale * (0.92 + rng() * 0.16),
      scaleY: scale * (0.85 + rng() * 0.30),
      scaleZ: scale * (0.92 + rng() * 0.16),
      tint: { r: luma * 0.96, g: luma * greenShift, b: luma * 0.94 },
    });

    grassCount++;
    speciesCounts[species]++;
  }

  return {
    items,
    stats: {
      totalGrass: grassCount,
      totalFerns: fernCount,
      totalRocks: rockCount,
      totalDeadwood: deadwoodCount,
      totalLogs: logCount,
      totalItems: items.length,
      speciesCounts,
    },
  };
}
