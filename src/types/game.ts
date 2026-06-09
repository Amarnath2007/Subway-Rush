export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';
export type Lane = -1 | 0 | 1; // left, center, right
export type PlayerAction = 'run' | 'jump' | 'slide' | 'fly' | 'hit' | 'idle';

export type PowerupType = 'magnet' | 'sneakers' | 'multiplier' | 'jetpack';

export interface ObstacleData {
  id: string;
  lane: Lane;
  z: number;
  type: 'up' | 'down' | 'train';
  trainVariant?: 'train1' | 'train2';
}

export interface CoinData {
  id: string;
  lane: Lane;
  z: number;
  collected: boolean;
  kind?: 'ground' | 'aerial';
  y?: number;
  xOffset?: number;
}

export interface PowerupData {
  id: string;
  lane: Lane;
  z: number;
  type: PowerupType;
}

export interface ChunkData {
  id: string;
  index: number;
  z: number;
  obstacles: ObstacleData[];
  coins: CoinData[];
  powerups: PowerupData[];
  envProps: EnvProp[];
}

export type EnvPropType =
  | 'building1' | 'building2' | 'building3'
  | 'tree1' | 'tree2'
  | 'fence'
  | 'streetlight' | 'streetlight_fancy'
  | 'bench'
  | 'trashbin'
  | 'mailbox'
  | 'bush' | 'bush_large'
  | 'planter'
  | 'bus_stop'
  | 'signboard'
  | 'grass';

export interface EnvProp {
  id: string;
  type: EnvPropType;
  x: number;
  z: number;
  side: 'left' | 'right';
}

export interface ActivePowerup {
  type: PowerupType;
  remaining: number;
  duration: number;
}

export interface Mission {
  id: string;
  label: string;
  icon: string;
  current: number;
  target: number;
}
