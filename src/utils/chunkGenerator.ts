import * as THREE from 'three';
import { ChunkData, CoinData, EnvProp, Lane, ObstacleData, PowerupData, PowerupType } from '../types/game';
import { AERIAL_COIN_Y, CHUNK_LENGTH, GROUND_COIN_Y, POWERUP_SPAWN_CHANCE } from '../config/constants';

let gid = 0;
const uid = () => `e${++gid}`;

const LANES: Lane[] = [-1, 0, 1];

interface Cfg {
  difficulty?: number;
  safe?: boolean;
  envDensity?: number;
  isJetpackActive?: boolean;
  jetpackTimeRemaining?: number;
}

function randomLane(): Lane {
  return LANES[Math.floor(Math.random() * LANES.length)];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ─── Organized Sky Coin Trails V3.2 ─────────────────────────────────────

function aerialStraightPath(lane: Lane, startZ: number, count: number): CoinData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: uid(),
    lane,
    z: startZ - i * 2.8, // Uniform, catchable spacing
    collected: false,
    kind: 'aerial' as const,
    y: AERIAL_COIN_Y,
  }));
}

/**
 * Creates a smooth transition from one lane to another.
 * startX and endX are absolute world X coordinates.
 */
function aerialTransitionPath(startX: number, endX: number, startZ: number, count: number): CoinData[] {
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    // Use smoothstep for a more natural curve than linear lerp
    const smoothT = t * t * (3 - 2 * t);
    const xOffset = THREE.MathUtils.lerp(startX, endX, smoothT);
    return {
      id: uid(),
      lane: 0 as Lane,
      z: startZ - i * 2.8,
      collected: false,
      kind: 'aerial' as const,
      y: AERIAL_COIN_Y,
      xOffset,
    };
  });
}

function aerialSwervePath(startZ: number, count: number): CoinData[] {
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    // Wave confined strictly to lane bounds (-3 to 3)
    const wave = Math.sin(t * Math.PI * 2);
    return {
      id: uid(),
      lane: 0 as Lane,
      z: startZ - i * 2.6,
      collected: false,
      kind: 'aerial' as const,
      y: AERIAL_COIN_Y,
      xOffset: wave * 3.0,
    };
  });
}


function generateAerialCoins(index: number, chunkZ: number): CoinData[] {
  if (index < 8) return [];
  const entryZ = chunkZ - 4; // Start slightly into the chunk
  const pattern = index % 5;

  switch (pattern) {
    case 0: 
      // 12 coins at 2.8 spacing = 33.6 units
      return aerialStraightPath(0, entryZ, 12);
    case 1: 
      // 15 coins at 2.8 spacing = 42 units
      return aerialTransitionPath(-3, 3, entryZ, 15);
    case 2: {
      // 16 coins at 2.6 spacing = 41.6 units
      return aerialSwervePath(entryZ, 16);
    }
    case 3: {
      // 3 groups of 4 = 12 coins. Total ~34 units
      return [
        ...aerialStraightPath(-1, entryZ, 4),
        ...aerialStraightPath(0, entryZ - 5 * 2.8, 4),
        ...aerialStraightPath(1, entryZ - 10 * 2.8, 4),
      ];
    }
    case 4: 
      // Shortened spiral to fit
      const coins: CoinData[] = [];
      const spacing = 2.8;
      let currentZ = entryZ;
      // 3 segments of 5 = 15 coins. Total 42 units
      [{s:0,e:-3}, {s:-3,e:3}, {s:3,e:0}].forEach(seg => {
        coins.push(...aerialTransitionPath(seg.s, seg.e, currentZ, 5));
        currentZ -= 5 * spacing;
      });
      return coins;
    default: 
      return aerialStraightPath(0, entryZ, 10);
  }
}

function generateObstacles(index: number, chunkZ: number, difficulty: number): ObstacleData[] {
  if (index < 3) return [];
  const obstacles: ObstacleData[] = [];
  const maxObs = Math.min(1 + Math.floor(difficulty * 2.8), 3);
  const slots = [0.25, 0.55, 0.85].slice(0, maxObs);

  for (const frac of slots) {
    const z = chunkZ - frac * CHUNK_LENGTH;
    const roll = Math.random();
    const lane = randomLane();
    if (roll < 0.35) {
      obstacles.push({ id: uid(), lane, z, type: 'train', trainVariant: Math.random() > 0.5 ? 'train1' : 'train2'});
    } else {
      obstacles.push({ id: uid(), lane, z, type: 'up' }); // Hurdle (now 0.35-1.0, removed down obstacles)
    }
  }
  return obstacles;
}

function generateCoins(index: number, chunkZ: number, isJetpackActive?: boolean): CoinData[] {
  const aerial = generateAerialCoins(index, chunkZ);
  if (isJetpackActive) return aerial;

  if (index < 3) return Array.from({length: 5}, (_, i) => ({
      id: uid(), lane: 0, z: chunkZ - 8 - i*2.4, collected: false, kind: 'ground', y: GROUND_COIN_Y
  }));

  const pattern = Math.random();
  let ground: CoinData[] = [];
  const zBase = chunkZ - CHUNK_LENGTH * 0.45;

  if (pattern < 0.4) {
    ground = Array.from({length: 6}, (_, i) => ({
      id: uid(), lane: randomLane(), z: zBase - i*2.4, collected: false, kind: 'ground', y: GROUND_COIN_Y
    }));
  } else if (pattern < 0.7) {
    const lane = randomLane();
    ground = Array.from({length: 8}, (_, i) => ({
        id: uid(), lane, z: zBase - i*2.4, collected: false, kind: 'ground', y: GROUND_COIN_Y
    }));
  } else {
    ground = [-1, 0, 1].map(l => ({
        id: uid(), lane: l as Lane, z: zBase, collected: false, kind: 'ground', y: GROUND_COIN_Y
    }));
  }
  return [...ground, ...aerial];
}

function generatePowerups(index: number, chunkZ: number): PowerupData[] {
  if (index < 12 || Math.random() > POWERUP_SPAWN_CHANCE) return [];
  const types: PowerupType[] = ['magnet', 'multiplier', 'jetpack'];
  return [{ id: uid(), lane: randomLane(), z: chunkZ - 0.5*CHUNK_LENGTH, type: types[Math.floor(Math.random()*3)] }];
}

function generateEnvironmentProps(chunkZ: number, chunkIndex: number, density: number = 1.0): EnvProp[] {
  const env: EnvProp[] = [];
  const baseBuildings: EnvPropType[] = ['building1', 'building2', 'building3'];
  const decorations: EnvPropType[] = ['trashbin', 'mailbox', 'planter', 'bush', 'bush_large', 'signboard'];

  (['left', 'right'] as const).forEach(side => {
    const xDir = side === 'left' ? -1 : 1;
    
    // 1. Sidewalk Edge & Fences (Boundary to track)
    for (let i = 0; i < 4; i++) {
      env.push({ id: uid(), type: 'fence', x: 6.2 * xDir, z: chunkZ - i * 12.5 - 6, side });
    }

    // 2. Streetlights - Spaced every 16 units
    for (let i = 0; i < 3; i++) {
        const type: EnvPropType = (chunkIndex + i) % 5 === 0 ? 'streetlight_fancy' : 'streetlight';
        env.push({ id: uid(), type, x: 8.5 * xDir, z: chunkZ - i * 16 - 8, side });
    }

    // 3. Sidewalk Decorations (Variety)
    const decorCount = 5;
    const decorSpacing = CHUNK_LENGTH / decorCount;
    for (let i = 0; i < decorCount; i++) {
      const z = chunkZ - i * decorSpacing - (decorSpacing / 2);
      
      // Determine what to place based on chunk index and position for non-repeating variety
      const seed = (chunkIndex * decorCount + i) % 10;
      
      if (seed === 0) {
        env.push({ id: uid(), type: 'bus_stop', x: 10.5 * xDir, z, side });
      } else if (seed === 1 || seed === 6) {
        env.push({ id: uid(), type: 'bench', x: 10.0 * xDir, z, side });
      } else if (seed === 2 || seed === 7) {
        const type = decorations[(chunkIndex + i) % decorations.length];
        env.push({ id: uid(), type, x: 11.0 * xDir, z, side });
      } else if (seed === 3 || seed === 8) {
        env.push({ id: uid(), type: 'planter', x: 10.0 * xDir, z, side });
      } else if (seed === 4 || seed === 9) {
        const type = (chunkIndex + i) % 2 === 0 ? 'bush' : 'bush_large';
        env.push({ id: uid(), type, x: 12.0 * xDir, z, side });
      }
    }

    // 4. Trees - Placed between the sidewalk and buildings
    const treeCount = 2;
    const treeSpacing = CHUNK_LENGTH / treeCount;
    for (let i = 0; i < treeCount; i++) {
      const treeType = ((chunkIndex * treeCount + i) % 2 === 0) ? 'tree1' : 'tree2';
      // Trees carefully offset from building positions
      env.push({ 
        id: uid(), 
        type: treeType, 
        x: 14.5 * xDir, 
        z: chunkZ - (i * treeSpacing) - 5,
        side 
      });
    }

    // 5. Grass/Nature Buffer
    for (let i = 0; i < 2; i++) {
        env.push({ id: uid(), type: 'grass', x: 19.0 * xDir, z: chunkZ - i * 25 - 12, side });
    }

    // 6. Buildings - Row 1 (Main Street)
    const bCount = 3;
    const bSpacing = CHUNK_LENGTH / bCount;
    for (let i = 0; i < bCount; i++) {
      const bType = baseBuildings[(chunkIndex * bCount + i) % baseBuildings.length];
      const zBuilding = chunkZ - (i * bSpacing) - (bSpacing / 2);
      
      env.push({ 
        id: uid(), 
        type: bType, 
        x: (28.0 + Math.random() * 2.0) * xDir, 
        z: zBuilding,
        side 
      });
    }

    // 7. Background Layers (Rows 2 & 3)
    for (let i = 0; i < 2; i++) {
      env.push({ 
        id: uid(), 
        type: baseBuildings[(chunkIndex + i + 1) % 3], 
        x: (65 + Math.random() * 5) * xDir, 
        z: chunkZ - i * 25 - 15, 
        side 
      });
      env.push({ 
        id: uid(), 
        type: baseBuildings[(chunkIndex + i + 2) % 3], 
        x: (100 + Math.random() * 10) * xDir, 
        z: chunkZ - i * 25 - 5, 
        side 
      });
    }
  });
  return env;
}

export function generateChunk(index: number, chunkZ: number, cfg: Cfg = {}): ChunkData {
  return {
    id: uid(),
    index,
    z: chunkZ,
    obstacles: cfg.safe ? [] : generateObstacles(index, chunkZ, cfg.difficulty ?? 0),
    coins: cfg.safe ? [] : generateCoins(index, chunkZ, cfg.isJetpackActive),
    powerups: cfg.safe ? [] : generatePowerups(index, chunkZ),
    envProps: generateEnvironmentProps(chunkZ, index, cfg.envDensity ?? 1.0),
  };
}
