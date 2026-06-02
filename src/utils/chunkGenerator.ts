import { ChunkData, CoinData, EnvProp, Lane, ObstacleData } from '../types/game';
import { CHUNK_LENGTH } from '../config/constants';

let gid = 0;
const uid = () => `e${++gid}`;

const LANES: Lane[] = [-1, 0, 1];

interface Cfg {
  difficulty?: number;
  safe?: boolean;
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

function coinLine(lane: Lane, startZ: number, count: number): CoinData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: uid(),
    lane,
    z: startZ - i * 2.4,
    collected: false,
  }));
}

function coinSweep(startZ: number): CoinData[] {
  const pattern: Lane[] = [-1, 0, 1, 0, -1, 0, 1];
  return pattern.map((lane, i) => ({
    id: uid(),
    lane,
    z: startZ - i * 1.8,
    collected: false,
  }));
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
      obstacles.push({ id: uid(), lane, z, type: 'train' });
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

  const pattern = Math.random();
  if (pattern < 0.35) {
    return coinLine(randomLane(), chunkZ - CHUNK_LENGTH * 0.55, 6);
  }

  if (pattern < 0.6) {
    return coinSweep(chunkZ - CHUNK_LENGTH * 0.45);
  }

  if (pattern < 0.8) {
    const [laneA, laneB] = shuffle(LANES).slice(0, 2) as [Lane, Lane];
    return [
      ...coinLine(laneA, chunkZ - CHUNK_LENGTH * 0.3, 3),
      ...coinLine(laneB, chunkZ - CHUNK_LENGTH * 0.6, 3),
    ];
  }

  return coinLine(randomLane(), chunkZ - CHUNK_LENGTH * 0.65, 8);
}

function generateEnvironmentProps(chunkZ: number): EnvProp[] {
  const envProps: EnvProp[] = [];

  (['left', 'right'] as const).forEach(side => {
    const count = 4 + Math.floor(Math.random() * 3);
    const corridorX = side === 'left' ? -6.2 : 6.2;

    for (let i = 0; i < count; i++) {
      const z = chunkZ - (i / count) * CHUNK_LENGTH - Math.random() * 4;
      const roll = Math.random();
      let type: EnvProp['type'] = 'building1';
      let x = corridorX;

      if (roll < 0.42) {
        type = Math.random() > 0.5 ? 'building1' : 'building2';
        x = side === 'left' ? -12 - Math.random() * 6 : 12 + Math.random() * 6;
      } else if (roll < 0.78) {
        type = 'tree';
        x = side === 'left' ? -5.8 - Math.random() * 1.5 : 5.8 + Math.random() * 1.5;
      } else {
        type = Math.random() > 0.5 ? 'building1' : 'building2';
        x = side === 'left' ? -9 - Math.random() * 3 : 9 + Math.random() * 3;
      }

      envProps.push({ id: uid(), type, x, z, side });
    }
  });

  return envProps;
}

export function generateChunk(index: number, chunkZ: number, cfg: Cfg = {}): ChunkData {
  const gameplayIndex = Math.max(0, index);
  const difficulty = cfg.difficulty ?? 0;
  const safe = cfg.safe ?? false;

  return {
    id: uid(),
    index,
    z: chunkZ,
    obstacles: safe ? [] : generateObstacles(gameplayIndex, chunkZ, difficulty),
    coins: safe ? [] : generateCoins(gameplayIndex, chunkZ),
    envProps: generateEnvironmentProps(chunkZ),
  };
}
