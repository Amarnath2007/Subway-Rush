// Lane positions on the X axis. Lane ids are -1, 0, and 1.
export const LANE_POSITIONS = [-3.0, 0, 3.0];
export const LANE_WIDTH = 3.0;

// Lane switching.
export const LANE_SWITCH_SPEED = 14;

// Speed and difficulty. The world moves toward the fixed player.
export const INITIAL_SPEED = 15;
export const MAX_SPEED = 38;
export const SPEED_INCREMENT_PER_SEC = 0.24;

// Jump and slide feel — tuned for snappy, responsive controls.
export const JUMP_FORCE = 13.2;
export const GRAVITY = -34;
export const SLIDE_DURATION = 720;

// Jump input improvements.
export const JUMP_BUFFER_MS = 120;      // buffer window to queue a jump before landing
export const COYOTE_TIME_MS = 80;       // grace period after leaving ground (unused for endless runner, kept for future)
export const LANDING_SQUASH_DURATION = 0.15; // seconds of squash-stretch on landing
export const LANE_TILT_AMOUNT = 0.08;   // radians of character Z-rotation tilt per lane switch

// Endless world chunk window. Chunks are fixed to a grid and recycled by index.
export const CHUNK_LENGTH = 50;
export const CHUNKS_AHEAD = 6;
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

// Powerup configuration.
export const POWERUP_SPAWN_CHANCE = 0.12;   // chance per chunk
export const POWERUP_MAGNET_DURATION = 10;
export const POWERUP_SNEAKERS_DURATION = 10;
export const POWERUP_MULTIPLIER_DURATION = 15;
export const POWERUP_JETPACK_DURATION = 10;
export const MAGNET_RADIUS = 6.0;
export const SNEAKERS_JUMP_MULTIPLIER = 1.6;
export const JETPACK_HEIGHT = 6.0;
export const POWERUP_COLLECT_RADIUS = 1.6;

// Missions.
export const MISSIONS_CONFIG = [
  { id: 'collect_coins', label: 'Pick up 100 coins', icon: 'coin', target: 100 },
  { id: 'jump_times', label: 'Jump 20 times', icon: 'jump', target: 20 },
  { id: 'slide_times', label: 'Roll 10 times', icon: 'slide', target: 10 },
];
