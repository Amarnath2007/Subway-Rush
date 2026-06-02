export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';
export type Lane = -1 | 0 | 1; // left, center, right
export type PlayerAction = 'run' | 'jump' | 'slide';

export interface ObstacleData {
  id: string;
  lane: Lane;
  z: number;
  type: 'up' | 'down' | 'train';
}

export interface CoinData {
  id: string;
  lane: Lane;
  z: number;
  collected: boolean;
}

export interface ChunkData {
  id: string;
  index: number;
  z: number;
  obstacles: ObstacleData[];
  coins: CoinData[];
  envProps: EnvProp[];
}

export interface EnvProp {
  id: string;
  type: 'building1' | 'building2' | 'tree';
  x: number;
  z: number;
  side: 'left' | 'right';
}

export interface Mission {
  id: string;
  label: string;
  icon: string;
  current: number;
  target: number;
}
