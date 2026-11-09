/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getTerrainHeight, getTerrainNormal, getDistanceToRoad, smoothNoise2D, fbmNoise2D } from './terrainElevation.js';

/**
 * Vegetation species identifiers.
 */
export const VEGETATION_SPECIES = {
  SCOTS_PINE: 'scots_pine',       // Tall layered conifer / evergreen
  MATURE_OAK: 'mature_oak',       // Broad-crowned spreading hardwood
  SILVER_BIRCH: 'silver_birch',   // Slender, graceful deciduous tree
  MOUNTAIN_SPRUCE: 'mountain_spruce', // Dense conical evergreen spire
  UNDERSTORY_BUSH: 'understory_bush', // Forest understory shrub
  LOW_SCRUB: 'low_scrub',         // Low spreading ground cover bush
};

/**
 * Forest road clearance parameters in meters.
 * Strict rules to guarantee readable access road without floating or penetrating trees.
 */
export const ROAD_MIN_VEGETATION_CLEARANCE = 4.2; // Absolute clearance: NO vegetation within 4.2m of centerline
export const ROAD_MIN_TREE_CLEARANCE = 7.5;       // Absolute tree clearance: NO mature trees within 7.5m
export const ROAD_TRANSITION_ZONE = 16.0;         // Verge-to-deep-forest transition boundary

/**
 * Seeded Mulberry32 pseudo-random number generator for 100% reproducible procedural placement.
 * @param {number} seed
 * @returns {() => number} Returns float in [0, 1)
 */
export function createDeterministicRng(seed = 42819) {
  let s = Math.floor(Math.abs(seed)) || 42819;
  return function next() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Evaluates whether a coordinate sits in an intentional natural woodland clearing / glade.
 * @param {number} x
 * @param {number} z
 * @returns {boolean} True if within a natural clearing
 */
export function isNaturalClearing(x, z) {
  // Broad, low-frequency multi-octave noise creating organic meadow pockets
  const clearing = fbmNoise2D(x * 0.0048 + 17.3, z * 0.0048 - 29.5, 2);
  return clearing > 0.44;
}

/**
 * Computes species selection and clustering weight at a given coordinate.
 * Creates believable ecological grouping: pine groves on higher ground/ridges,
 * oaks and birches in sheltered valleys and road verges.
 *
 * @param {number} x
 * @param {number} z
 * @param {number} distanceToRoad
 * @param {() => number} rng
 * @returns {string} One of VEGETATION_SPECIES
 */
export function selectTreeSpecies(x, z, distanceToRoad, rng) {
  // Near the road (7.5m - 18m), birches and mixed younger trees look picturesque and welcoming
  const vergeFactor = Math.max(0, Math.min(1, (18.0 - distanceToRoad) / 10.5));
  const speciesNoise = smoothNoise2D(x * 0.007 + 55.0, z * 0.007 - 38.0);
  const roll = rng();

  if (vergeFactor > 0.4) {
    // Road verge bias: graceful birches and open pines
    if (roll < 0.45) return VEGETATION_SPECIES.SILVER_BIRCH;
    if (roll < 0.75) return VEGETATION_SPECIES.SCOTS_PINE;
    if (roll < 0.90) return VEGETATION_SPECIES.MATURE_OAK;
    return VEGETATION_SPECIES.MOUNTAIN_SPRUCE;
  }

  // Deeper woodland: grouped into natural species stands
  if (speciesNoise > 0.28) {
    // Conifer grove
    return roll < 0.65 ? VEGETATION_SPECIES.SCOTS_PINE : VEGETATION_SPECIES.MOUNTAIN_SPRUCE;
  } else if (speciesNoise < -0.28) {
    // Deciduous hardwood woodland
    return roll < 0.60 ? VEGETATION_SPECIES.MATURE_OAK : VEGETATION_SPECIES.SILVER_BIRCH;
  } else {
    // Mixed temperate forest
    if (roll < 0.35) return VEGETATION_SPECIES.SCOTS_PINE;
    if (roll < 0.60) return VEGETATION_SPECIES.MATURE_OAK;
    if (roll < 0.82) return VEGETATION_SPECIES.SILVER_BIRCH;
    return VEGETATION_SPECIES.MOUNTAIN_SPRUCE;
  }
}

/**
 * Generates deterministic procedural vegetation placements conforming to terrain contours,
 * elevation, road clearance, slope safety, and natural density gradients.
 *
 * @param {Object} [options]
 * @param {number} [options.seed=42819] - Deterministic PRNG seed.
 * @param {number} [options.treeTargetCount=3400] - Desired total mature trees.
 * @param {number} [options.understoryTargetCount=1800] - Desired total understory bushes.
 * @param {number} [options.maxDistance=720] - Maximum placement radius from road/camera.
 * @param {boolean} [options.isSoftwareGl=false] - If true, scales counts down for software safety.
 * @returns {{
 *   trees: Array<{
 *     species: string,
 *     x: number,
 *     y: number,
 *     z: number,
 *     rotationY: number,
 *     tiltX: number,
 *     tiltZ: number,
 *     scaleX: number,
 *     scaleY: number,
 *     scaleZ: number,
 *     distanceToRoad: number,
 *     tint: { r: number, g: number, b: number }
 *   }>,
 *   understory: Array<{
 *     species: string,
 *     x: number,
 *     y: number,
 *     z: number,
 *     rotationY: number,
 *     tiltX: number,
 *     tiltZ: number,
 *     scaleX: number,
 *     scaleY: number,
 *     scaleZ: number,
 *     distanceToRoad: number,
 *     tint: { r: number, g: number, b: number }
 *   }>,
 *   stats: {
 *     totalTrees: number,
 *     totalUnderstory: number,
 *     speciesCounts: Record<string, number>
 *   }
 * }}
 */
export function generateVegetationPlacements(options = {}) {
  const {
    seed = 42819,
    treeTargetCount = 4200,
    understoryTargetCount = 2200,
    maxDistance = 750,
    isSoftwareGl = false,
  } = options;

  const rng = createDeterministicRng(seed);

  // In software WebGL preview, maintain a dense yet fast instance budget (~1,450 trees + 850 understory)
  // On hardware GPU (RTX 3050), scale up to full ~4,200 trees + 2,200 understory
  const targetTrees = isSoftwareGl ? 1450 : treeTargetCount;
  const targetUnderstory = isSoftwareGl ? 850 : understoryTargetCount;

  const trees = [];
  const understory = [];
  const speciesCounts = {
    [VEGETATION_SPECIES.SCOTS_PINE]: 0,
    [VEGETATION_SPECIES.MATURE_OAK]: 0,
    [VEGETATION_SPECIES.SILVER_BIRCH]: 0,
    [VEGETATION_SPECIES.MOUNTAIN_SPRUCE]: 0,
    [VEGETATION_SPECIES.UNDERSTORY_BUSH]: 0,
    [VEGETATION_SPECIES.LOW_SCRUB]: 0,
  };

  // Multi-tier candidate sampling strategy:
  // 1. Near-road corridor band (Z: +50 to -900, X: ±75m) - critical for first-person visual quality
  // 2. Mid-distance valley and slopes (Z: +100 to -1000, X: ±320m)
  // 3. Wide landscape background ridges (Z: +150 to -1100, X: ±680m)
  // Candidate budget to ensure targets are met after filtering
  const candidateBudgetCoefficient = 3.6;
  const totalCandidates = Math.round((targetTrees + targetUnderstory) * candidateBudgetCoefficient);

  for (let i = 0; i < totalCandidates; i++) {
    const tier = rng();
    let x, z;

    if (tier < 0.52) {
      // Tier 1: Road Valley Flanks (critical first-person viewing zone)
      // Follows the actual winding road from foreground (Z: +10m) deep into the valley (Z: -870m)
      const roadProgress = rng(); // 0 to 1
      const roadZ = 12.0 - roadProgress * 870.0;
      const { closestPoint } = getDistanceToRoad(0, roadZ);

      // Flank distance on left or right side of road
      const side = rng() < 0.5 ? -1 : 1;
      // Exponential distribution: denser near road verge (6m - 35m), thinning into the valley (up to 140m)
      const lateralDist = ROAD_MIN_VEGETATION_CLEARANCE + Math.pow(rng(), 1.4) * 140.0;
      x = closestPoint.x + side * lateralDist + (rng() - 0.5) * 14.0;
      z = closestPoint.z + (rng() - 0.5) * 18.0;
    } else if (tier < 0.85) {
      // Tier 2: Mid-distance hills and valley slopes (visible landscape)
      const angle = rng() * Math.PI * 2;
      const rad = 30.0 + Math.pow(rng(), 0.8) * 420.0;
      x = Math.cos(angle) * rad;
      z = -140.0 + Math.sin(angle) * rad;
    } else {
      // Tier 3: Distant ridges and skyline horizons (framing into atmospheric haze)
      const angle = rng() * Math.PI * 2;
      const rad = 280.0 + Math.pow(rng(), 0.85) * (maxDistance - 280.0);
      x = Math.cos(angle) * rad;
      z = -250.0 + Math.sin(angle) * rad;
    }

    // Check circular terrain boundary
    const distFromOrigin = Math.hypot(x, z);
    if (distFromOrigin > 1050) continue; // Terrain tapers at 1150m

    // Strict road clearance check
    const { distance: distToRoad } = getDistanceToRoad(x, z);

    // 1. Total exclusion on road carriageway & gravel edge
    if (distToRoad < ROAD_MIN_VEGETATION_CLEARANCE) {
      continue;
    }

    // 2. Natural clearing check (meadows/glades)
    if (distToRoad > 25.0 && isNaturalClearing(x, z)) {
      // Low probability of sparse understory in clearings, no mature trees
      if (rng() > 0.12) continue;
    }

    // Sample terrain elevation and normal
    const y = getTerrainHeight(x, z);
    const normal = getTerrainNormal(x, z);

    // Steep cliff check: trees do not grow on extreme slopes
    if (normal.y < 0.72) continue;

    // Decide whether this candidate is an Understory Shrub or a Mature Tree
    const isUnderstoryCandidate = distToRoad < ROAD_MIN_TREE_CLEARANCE || (rng() < 0.35 && understory.length < targetUnderstory);

    if (isUnderstoryCandidate) {
      if (understory.length >= targetUnderstory) continue;

      const species = rng() < 0.58 ? VEGETATION_SPECIES.UNDERSTORY_BUSH : VEGETATION_SPECIES.LOW_SCRUB;
      const baseScale = species === VEGETATION_SPECIES.UNDERSTORY_BUSH
        ? 0.75 + rng() * 0.55
        : 0.65 + rng() * 0.45;

      const rotY = rng() * Math.PI * 2;
      // Slight slope conformity
      const tiltX = (rng() - 0.5) * 0.08 - (normal.z * 0.1);
      const tiltZ = (rng() - 0.5) * 0.08 + (normal.x * 0.1);

      // Subtle natural foliage tint variation (healthy olive/moss forest green)
      const tintLuma = 0.92 + rng() * 0.16;
      const tintGreenShift = 0.94 + rng() * 0.12;

      // Sink slightly into terrain (0.15m) so roots are bedded
      const anchorY = y - 0.15 * baseScale;

      understory.push({
        species,
        x,
        y: anchorY,
        z,
        rotationY: rotY,
        tiltX,
        tiltZ,
        scaleX: baseScale * (0.92 + rng() * 0.16),
        scaleY: baseScale * (0.88 + rng() * 0.24),
        scaleZ: baseScale * (0.92 + rng() * 0.16),
        distanceToRoad: distToRoad,
        tint: {
          r: tintLuma,
          g: tintLuma * tintGreenShift,
          b: tintLuma * 0.95,
        },
      });

      speciesCounts[species]++;
    } else {
      // Mature Tree Candidate
      if (trees.length >= targetTrees) continue;

      // Absolute tree clearance from road centerline
      if (distToRoad < ROAD_MIN_TREE_CLEARANCE) continue;

      // Select distinct tree species with natural grove clustering
      const species = selectTreeSpecies(x, z, distToRoad, rng);

      // Organic scale variation
      let scaleRange = { min: 0.82, max: 1.28 };
      if (species === VEGETATION_SPECIES.MATURE_OAK) {
        scaleRange = { min: 0.85, max: 1.35 };
      } else if (species === VEGETATION_SPECIES.SILVER_BIRCH) {
        scaleRange = { min: 0.80, max: 1.25 };
      }

      const uniformScale = scaleRange.min + rng() * (scaleRange.max - scaleRange.min);
      const scaleX = uniformScale * (0.93 + rng() * 0.14);
      const scaleY = uniformScale * (0.88 + rng() * 0.25); // natural height variance
      const scaleZ = uniformScale * (0.93 + rng() * 0.14);

      const rotY = rng() * Math.PI * 2;

      // Natural organic tilt (not rigid 90° plumb line): 1° to 4° organic lean
      // plus slight reaction to terrain slope
      const organicLeanAngle = (0.02 + rng() * 0.05); // radians (~1.1° - 2.9°)
      const leanDir = rng() * Math.PI * 2;
      const tiltX = Math.cos(leanDir) * organicLeanAngle - (normal.z * 0.06);
      const tiltZ = Math.sin(leanDir) * organicLeanAngle + (normal.x * 0.06);

      // Root anchor: sink trunk base 0.35m to 0.55m into the soil
      const rootSink = (0.35 + rng() * 0.2) * scaleY;
      const anchoredY = y - rootSink;

      // Color tint variation for natural individual tree identity
      const luma = 0.90 + rng() * 0.20;
      const warmShift = 0.92 + rng() * 0.16;

      trees.push({
        species,
        x,
        y: anchoredY,
        z,
        rotationY: rotY,
        tiltX,
        tiltZ,
        scaleX,
        scaleY,
        scaleZ,
        distanceToRoad: distToRoad,
        tint: {
          r: luma * warmShift,
          g: luma,
          b: luma * 0.94,
        },
      });

      speciesCounts[species]++;
    }
  }

  return {
    trees,
    understory,
    stats: {
      totalTrees: trees.length,
      totalUnderstory: understory.length,
      speciesCounts,
    },
  };
}
