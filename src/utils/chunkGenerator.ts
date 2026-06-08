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

// ─── Organized Sky Coin Trails V3.1 ─────────────────────────────────────

function aerialStraightPath(lane: Lane, startZ: number, count: number): CoinData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: uid(),
    lane,
    z: startZ - i * 2.5, // slightly more spacing
    collected: false,
    kind: 'aerial' as const,
    y: AERIAL_COIN_Y,
  }));
}

function aerialCurvedPath(startLane: Lane, endLane: Lane, startZ: number, count: number): CoinData[] {
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    // Smooth lane transition
    const laneX = THREE.MathUtils.lerp(startLane * 3.0, endLane * 3.0, t);
    return {
      id: uid(),
      lane: 0 as Lane,
      z: startZ - i * 2.5,
      collected: false,
      kind: 'aerial' as const,
      y: AERIAL_COIN_Y,
      xOffset: laneX,
    };
  });
}

function aerialDoubleWave(startZ: number, count: number): CoinData[] {
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const wave = Math.sin(t * Math.PI * 2);
    return {
      id: uid(),
      lane: 0 as Lane,
      z: startZ - i * 2.2,
      collected: false,
      kind: 'aerial' as const,
      y: AERIAL_COIN_Y,
      xOffset: wave * 3.5, // wider wave for lane-to-lane feel
    };
  });
}

function aerialDiamondFormation(startZ: number): CoinData[] {
  const coins: CoinData[] = [];
  const spacing = 2.0;
  // Cleaner diamond (horizontal only)
  const positions = [
    { l: 0, z: 0 },
    { l: -0.5, z: spacing },
    { l: 0.5, z: spacing },
    { l: -1, z: spacing * 2 },
    { l: 1, z: spacing * 2 },
    { l: -0.5, z: spacing * 3 },
    { l: 0.5, z: spacing * 3 },
    { l: 0, z: spacing * 4 }
  ];
  positions.forEach(p => {
    coins.push({
      id: uid(),
      lane: 0 as Lane,
      z: startZ - p.z,
      collected: false,
      kind: 'aerial' as const,
      y: AERIAL_COIN_Y,
      xOffset: p.l * 3.0,
    });
  });
  return coins;
}

function generateAerialCoins(index: number, chunkZ: number): CoinData[] {
  if (index < 8) return [];
  const entryZ = chunkZ - 5;
  const pattern = index % 5;

  switch (pattern) {
    case 0: return aerialStraightPath(0, entryZ, 12);
    case 1: return aerialCurvedPath(-1, 1, entryZ, 15);
    case 2: {
        // Lane switch trail
        const coins = [...aerialStraightPath(-1, entryZ, 6)];
        const transition = aerialCurvedPath(-1, 1, entryZ - 6 * 2.5, 6);
        const exit = aerialStraightPath(1, entryZ - 12 * 2.5, 6);
        return [...coins, ...transition, ...exit];
    }
    case 3: return aerialDoubleWave(entryZ, 18);
    case 4: return aerialDiamondFormation(entryZ);
    default: return aerialStraightPath(0, entryZ, 10);
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

function generateEnvironmentProps(chunkZ: number, density: number = 1.0): EnvProp[] {
  const env: EnvProp[] = [];
  (['left', 'right'] as const).forEach(side => {
    const xDir = side === 'left' ? -1 : 1;
    // Fences
    for (let i = 0; i < 5; i++) env.push({ id: uid(), type: 'fence', x: 5.3 * xDir, z: chunkZ - i*10 - 5, side });
    // Props
    const pCount = Math.floor(4 * density);
    for (let i = 0; i < pCount; i++) {
        const z = chunkZ - (i/pCount)*CHUNK_LENGTH - Math.random()*5;
        const r = Math.random();
        if (r < 0.3) env.push({ id: uid(), type: 'tree', x: (7.2 + Math.random()*2)*xDir, z, side });
        else if (r < 0.5) env.push({ id: uid(), type: 'streetlight', x: 6.5*xDir, z, side });
        else if (r < 0.7) env.push({ id: uid(), type: 'bench', x: 7.5*xDir, z, side });
    }
    // Buildings
    const bCount = Math.ceil(2 * density);
    for (let i = 0; i < bCount; i++) {
        env.push({ id: uid(), type: Math.random() > 0.5 ? 'building1' : 'building2', x: (15 + Math.random()*10)*xDir, z: chunkZ - (i/bCount)*CHUNK_LENGTH, side });
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
    envProps: generateEnvironmentProps(chunkZ, cfg.envDensity ?? 1.0),
  };
}
