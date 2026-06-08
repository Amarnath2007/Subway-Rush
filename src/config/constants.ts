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
export const TARGET_POWERUP_HEIGHT = 1.25;
export const GROUND_COIN_Y = 0.9;

// Powerup configuration.
export const POWERUP_SPAWN_CHANCE = 0.12;   // chance per chunk
export const POWERUP_MAGNET_DURATION = 10;
export const POWERUP_SNEAKERS_DURATION = 10;
export const POWERUP_MULTIPLIER_DURATION = 15;
export const POWERUP_JETPACK_DURATION = 10;
export const MAGNET_RADIUS = 6.0;
export const MAGNET_COLLECT_RADIUS = 1.45;
export const SNEAKERS_JUMP_MULTIPLIER = 2.0;
export const JETPACK_HEIGHT = 6.0;
export const AERIAL_COIN_Y = JETPACK_HEIGHT + 0.75;
export const POWERUP_COLLECT_RADIUS = 1.6;
export const POWERUP_PICKUP_Y = 1.05;
export const CRASH_GAME_OVER_DELAY_MS = 780;

// Missions.
export const MISSIONS_CONFIG = [
  { id: 'collect_coins', label: 'Pick up 100 coins', icon: 'coin', target: 100 },
  { id: 'jump_times', label: 'Jump 20 times', icon: 'jump', target: 20 },
  { id: 'slide_times', label: 'Roll 10 times', icon: 'slide', target: 10 },
];

// --- V3: Progression & Shop ---

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface CharacterConfig {
  id: string;
  name: string;
  rarity: Rarity;
  costCoins: number;
  costDiamonds: number;
  modelPath: string;
}

export const CHARACTERS: CharacterConfig[] = [
  { id: 'AJ', name: 'AJ', rarity: 'Common', costCoins: 0, costDiamonds: 0, modelPath: '/assets/runner/runner/characters/Aj.fbx' },
  { id: 'Amy', name: 'Amy', rarity: 'Rare', costCoins: 2000, costDiamonds: 20, modelPath: '/assets/runner/runner/characters/Amy.fbx' },
  { id: 'Claire', name: 'Claire', rarity: 'Epic', costCoins: 4000, costDiamonds: 40, modelPath: '/assets/runner/runner/characters/claire.fbx' },
  { id: 'Mousey', name: 'Mousey', rarity: 'Epic', costCoins: 7000, costDiamonds: 70, modelPath: '/assets/runner/runner/characters/mousey.fbx' },
  { id: 'Knight', name: 'Knight', rarity: 'Legendary', costCoins: 10000, costDiamonds: 100, modelPath: '/assets/runner/runner/characters/Knight.fbx' },
];

export const RARITY_COLORS: Record<Rarity, string> = {
  Common: '#b0b0b0',
  Rare: '#4CAF50',
  Epic: '#9C27B0',
  Legendary: '#FF9800',
};

export const POWERUP_UPGRADE_COSTS = [0, 500, 1000, 2000, 4000]; // level 1 is free, index 1 is for level 2
export const POWERUP_DURATIONS = [8, 10, 12, 14, 16]; // indices 0 to 4 represent levels 1 to 5

export interface Achievement {
  id: string;
  title: string;
  description: string;
  target: number;
  reward: number;
  type: 'coins' | 'distance' | 'jumps' | 'slides' | 'powerups' | 'games';
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'coins_100', title: 'Coin Collector I', description: 'Collect 100 coins', target: 100, reward: 5, type: 'coins' },
  { id: 'coins_500', title: 'Coin Collector II', description: 'Collect 500 coins', target: 500, reward: 10, type: 'coins' },
  { id: 'coins_1000', title: 'Coin Collector III', description: 'Collect 1000 coins', target: 1000, reward: 25, type: 'coins' },
  { id: 'jumps_50', title: 'Leaper I', description: 'Jump 50 times', target: 50, reward: 5, type: 'jumps' },
  { id: 'jumps_200', title: 'Leaper II', description: 'Jump 200 times', target: 200, reward: 10, type: 'jumps' },
  { id: 'slides_50', title: 'Slider I', description: 'Slide 50 times', target: 50, reward: 5, type: 'slides' },
  { id: 'slides_200', title: 'Slider II', description: 'Slide 200 times', target: 200, reward: 10, type: 'slides' },
  { id: 'dist_1000', title: 'Traveler I', description: 'Travel 1000m', target: 1000, reward: 10, type: 'distance' },
  { id: 'dist_5000', title: 'Traveler II', description: 'Travel 5000m', target: 5000, reward: 25, type: 'distance' },
  { id: 'play_10', title: 'Rookie', description: 'Play 10 games', target: 10, reward: 10, type: 'games' },
  { id: 'play_50', title: 'Veteran', description: 'Play 50 games', target: 50, reward: 25, type: 'games' },
  { id: 'powerups_20', title: 'Power User', description: 'Collect 20 powerups', target: 20, reward: 20, type: 'powerups' },
];

export const REVIVE_COST = 5;
