// Lane positions on the X axis. Lane ids are -1, 0, and 1.
export const LANE_POSITIONS = [-3.0, 0, 3.0];
export const LANE_WIDTH = 3.0;

// Lane switching.
export const LANE_SWITCH_SPEED = 14;

// Speed and difficulty. The world moves toward the fixed player.
export const INITIAL_SPEED = 15;
export const MAX_SPEED = 38;
export const SPEED_INCREMENT_PER_SEC = 0.24;

// Jump and slide feel.
export const JUMP_FORCE = 12.5;
export const GRAVITY = -32;
export const SLIDE_DURATION = 720;

// Endless world chunk window. Chunks are fixed to a grid and recycled by index.
export const CHUNK_LENGTH = 50;
export const CHUNKS_AHEAD = 8;
export const CHUNKS_BEHIND = 3;

// Scoring.
export const COIN_SCORE = 50;
export const SCORE_PER_SECOND = 1;

// Collider dimensions.
export const PLAYER_COLLIDER = { hw: 0.45, hh: 1.05, hd: 0.4 };
export const SLIDE_COLLIDER = { hw: 0.45, hh: 0.5, hd: 0.4 };
export const COIN_COLLECT_RADIUS = 1.35;

// Target normalized model sizes in world units.
export const TARGET_PLAYER_HEIGHT = 2.1;
export const TARGET_TREE_HEIGHT = 7.0;
export const TARGET_BUILDING_HEIGHT = 20.0;
export const TARGET_UP_OBS_HEIGHT = 2.2;
export const TARGET_DOWN_OBS_HEIGHT = 2.35;
export const TARGET_TRAIN_HEIGHT = 4.4;
export const TARGET_COIN_SIZE = 0.68;

// Missions.
export const MISSIONS_CONFIG = [
  { id: 'collect_coins', label: 'Pick up 100 coins', icon: 'coin', target: 100 },
  { id: 'jump_times', label: 'Jump 20 times', icon: 'jump', target: 20 },
  { id: 'slide_times', label: 'Roll 10 times', icon: 'slide', target: 10 },
];
