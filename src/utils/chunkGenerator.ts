import { ChunkData, CoinData, EnvProp, Lane, ObstacleData, PowerupData, PowerupType } from '../types/game';
import { AERIAL_COIN_Y, CHUNK_LENGTH, GROUND_COIN_Y, POWERUP_SPAWN_CHANCE } from '../config/constants';

let gid = 0;
const uid = () => `e${++gid}`;

const LANES: Lane[] = [-1, 0, 1];

interface Cfg {
  difficulty?: number;
  safe?: boolean;
  envDensity?: number;
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

function coinLine(lane: Lane, startZ: number, count: number, spacing = 2.4): CoinData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: uid(),
    lane,
    z: startZ - i * spacing,
    collected: false,
    kind: 'ground',
    y: GROUND_COIN_Y,
  }));
}

function coinSweep(startZ: number): CoinData[] {
  const pattern: Lane[] = [-1, 0, 1, 0, -1, 0, 1];
  return pattern.map((lane, i) => ({
    id: uid(),
    lane,
    z: startZ - i * 1.8,
    collected: false,
    kind: 'ground',
    y: GROUND_COIN_Y,
  }));
}

function aerialLaneLine(lane: Lane, startZ: number, count: number): CoinData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: uid(),
    lane,
    z: startZ - i * 1.65,
    collected: false,
    kind: 'aerial',
    y: AERIAL_COIN_Y + Math.sin(i * 0.55) * 0.18,
  }));
}

function aerialCurve(startZ: number, count: number): CoinData[] {
  return Array.from({ length: count }, (_, i) => {
    const t = count <= 1 ? 0 : i / (count - 1);
    return {
      id: uid(),
      lane: 0,
      z: startZ - i * 1.55,
      collected: false,
      kind: 'aerial',
      y: AERIAL_COIN_Y + Math.sin(t * Math.PI * 2) * 0.55,
      xOffset: Math.sin(t * Math.PI * 2) * 2.8,
    };
  });
}

function generateAerialCoins(index: number, chunkZ: number): CoinData[] {
  if (index < 8) return [];

  const leadZ = chunkZ - CHUNK_LENGTH * 0.16;
  const pattern = index % 4;

  if (pattern === 0) {
    return [
      ...aerialLaneLine(-1, leadZ, 10),
      ...aerialLaneLine(0, leadZ - 0.55, 10),
      ...aerialLaneLine(1, leadZ - 1.1, 10),
    ];
  }

  if (pattern === 1) {
    return [
      ...aerialCurve(leadZ, 22),
      ...aerialLaneLine(randomLane(), leadZ - 24, 9),
    ];
  }

  if (pattern === 2) {
    return [
      ...aerialLaneLine(-1, leadZ, 8),
      ...aerialCurve(leadZ - 10, 18),
      ...aerialLaneLine(1, leadZ - 31, 8),
    ];
  }

  return [
    ...aerialLaneLine(-1, leadZ, 7),
    ...aerialLaneLine(0, leadZ - 9, 7),
    ...aerialLaneLine(1, leadZ - 18, 7),
    ...aerialCurve(leadZ - 28, 12),
  ];
}

function generateObstacles(index: number, chunkZ: number, difficulty: number): ObstacleData[] {
  if (index < 3) return [];

  const obstacles: ObstacleData[] = [];
  const maxObs = Math.min(1 + Math.floor(difficulty * 2.6), 3);
  const slots = [0.24, 0.52, 0.8].slice(0, maxObs);

  for (const frac of slots) {
    const z = chunkZ - frac * CHUNK_LENGTH;
    const roll = Math.random();
    const lane = randomLane();

    if (roll < 0.28) {
      obstacles.push({
        id: uid(),
        lane,
        z,
        type: 'train',
        trainVariant: Math.random() < 0.5 ? 'train1' : 'train2',
      });
    } else if (roll < 0.62) {
      obstacles.push({ id: uid(), lane, z, type: 'up' });
    } else {
      obstacles.push({ id: uid(), lane, z, type: 'down' });
    }
  }

  return obstacles;
}

function generateCoins(index: number, chunkZ: number): CoinData[] {
  if (index < 3) return coinLine(0, chunkZ - 8, 5);

  const aerialCoins = generateAerialCoins(index, chunkZ);

  const pattern = Math.random();
  let groundCoins: CoinData[];
  if (pattern < 0.35) {
    groundCoins = coinLine(randomLane(), chunkZ - CHUNK_LENGTH * 0.55, 6);
  } else if (pattern < 0.6) {
    groundCoins = coinSweep(chunkZ - CHUNK_LENGTH * 0.45);
  } else if (pattern < 0.8) {
    const [laneA, laneB] = shuffle(LANES).slice(0, 2) as [Lane, Lane];
    groundCoins = [
      ...coinLine(laneA, chunkZ - CHUNK_LENGTH * 0.3, 3),
      ...coinLine(laneB, chunkZ - CHUNK_LENGTH * 0.6, 3),
    ];
  } else {
    groundCoins = coinLine(randomLane(), chunkZ - CHUNK_LENGTH * 0.65, 8);
  }

  return [...groundCoins, ...aerialCoins];
}

function generatePowerups(index: number, chunkZ: number): PowerupData[] {
  if (index < 10) return []; // No powerups in early game

  if (Math.random() > POWERUP_SPAWN_CHANCE) return [];

  const types: PowerupType[] = ['magnet', 'sneakers', 'multiplier', 'jetpack'];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = randomLane();
  const z = chunkZ - (0.3 + Math.random() * 0.4) * CHUNK_LENGTH;

  return [{ id: uid(), lane, z, type }];
}

function generateEnvironmentProps(chunkZ: number, density: number = 1.0): EnvProp[] {
  const envProps: EnvProp[] = [];

  (['left', 'right'] as const).forEach(side => {
    // 1. Layer: Fences (essential for V2 look)
    // Continuous fences along the track
    if (density > 0.4) {
      const fenceCount = Math.ceil(CHUNK_LENGTH / 10);
      for (let i = 0; i < fenceCount; i++) {
        envProps.push({
          id: uid(),
          type: 'fence',
          x: side === 'left' ? -5.3 : 5.3,
          z: chunkZ - i * 10 - 5,
          side
        });
      }
    }

    // 2. Layer: Streetlights & Trees
    const propCount = Math.floor((3 + Math.random() * 3) * density);
    for (let i = 0; i < propCount; i++) {
      const z = chunkZ - (i / propCount) * CHUNK_LENGTH - Math.random() * 5;
      const roll = Math.random();
      
      if (roll < 0.3) {
        // Tree
        envProps.push({
          id: uid(),
          type: 'tree',
          x: side === 'left' ? -7.2 - Math.random() * 2 : 7.2 + Math.random() * 2,
          z,
          side
        });
      } else if (roll < 0.5) {
        // Streetlight
        envProps.push({
          id: uid(),
          type: 'streetlight',
          x: side === 'left' ? -6.5 : 6.5,
          z,
          side
        });
      } else if (roll < 0.7) {
        // Small props
        const type = Math.random() > 0.5 ? 'bench' : 'trashbin';
        envProps.push({
          id: uid(),
          type,
          x: side === 'left' ? -7.0 - Math.random() * 1.5 : 7.0 + Math.random() * 1.5,
          z,
          side
        });
      }
    }

    // 3. Layer: Buildings
    const buildingCount = Math.ceil((2 + Math.random() * 2) * density);
    for (let i = 0; i < buildingCount; i++) {
      const z = chunkZ - (i / buildingCount) * CHUNK_LENGTH - Math.random() * 10;
      const x = side === 'left' ? -14 - Math.random() * 8 : 14 + Math.random() * 8;
      const type = Math.random() > 0.5 ? 'building1' : 'building2';
      envProps.push({ id: uid(), type, x, z, side });
    }

    // 4. Layer: Grass strips
    if (density > 0.5) {
      envProps.push({
        id: uid(),
        type: 'grass',
        x: side === 'left' ? -6.0 : 6.0,
        z: chunkZ - CHUNK_LENGTH / 2,
        side
      });
    }
  });

  return envProps;
}

export function generateChunk(index: number, chunkZ: number, cfg: Cfg = {}): ChunkData {
  const gameplayIndex = Math.max(0, index);
  const difficulty = cfg.difficulty ?? 0;
  const safe = cfg.safe ?? false;
  const envDensity = cfg.envDensity ?? 1.0;

  return {
    id: uid(),
    index,
    z: chunkZ,
    obstacles: safe ? [] : generateObstacles(gameplayIndex, chunkZ, difficulty),
    coins: safe ? [] : generateCoins(gameplayIndex, chunkZ),
    powerups: safe ? [] : generatePowerups(gameplayIndex, chunkZ),
    envProps: generateEnvironmentProps(chunkZ, envDensity),
  };
}
