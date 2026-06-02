import { create } from 'zustand';
import { GameState, Lane, PlayerAction, ChunkData, Mission, PowerupType, ActivePowerup } from '../types/game';
import {
  MISSIONS_CONFIG, INITIAL_SPEED, SPEED_INCREMENT_PER_SEC,
  MAX_SPEED, COIN_SCORE, SCORE_PER_SECOND,
  POWERUP_MAGNET_DURATION, POWERUP_SNEAKERS_DURATION,
  POWERUP_MULTIPLIER_DURATION, POWERUP_JETPACK_DURATION
} from '../config/constants';
import { qualityManager, QualityTier } from '../utils/qualityManager';

// ─── Shared jump state ref ─────────────────────────────────────────────────
// Player writes to this every frame; CameraController reads it.
// Keeping it outside Zustand avoids 60fps state updates (Bug 14).
export const jumpYRef = { current: 0 };
export const worldZRef = { current: 0 };

const runtime = {
  score: 0,
  speed: INITIAL_SPEED,
  distance: 0,
  lastUiSync: 0,
};

const resetRuntime = () => {
  jumpYRef.current = 0;
  worldZRef.current = 0;
  runtime.score = 0;
  runtime.speed = INITIAL_SPEED;
  runtime.distance = 0;
  runtime.lastUiSync = 0;
};

interface GameStore {
  gameState: GameState;
  qualityTier: QualityTier;
  score: number;
  bestScore: number;
  coins: number;
  speed: number;
  distance: number;

  playerLane: Lane;
  targetLane: Lane;
  playerAction: PlayerAction;
  isJumping: boolean;
  isSliding: boolean;

  worldZ: number;
  chunks: ChunkData[];
  collectedCoinIds: Set<string>;
  chunkCounter: number;

  missions: Mission[];
  jumpCount: number;
  slideCount: number;

  chaseMeter: number;
  isWarning: boolean;

  // Powerups state
  activePowerups: Map<PowerupType, ActivePowerup>;
  isJetpackActive: boolean;

  // Actions
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  restartGame: () => void;

  setPlayerLane: (lane: Lane) => void;
  setTargetLane: (lane: Lane) => void;
  setPlayerAction: (action: PlayerAction) => void;
  setJumping: (v: boolean) => void;
  setSliding: (v: boolean) => void;

  tick: (delta: number) => void;
  addChunk: (chunk: ChunkData) => void;
  removeChunk: (id: string) => void;
  setChunks: (chunks: ChunkData[], chunkCounter: number) => void;
  collectCoin: (id: string) => void;
  incrementJump: () => void;
  incrementSlide: () => void;
  updateChaseMeter: (delta: number) => void;
  resetChaseMeter: () => void;

  // Powerup actions
  activatePowerup: (type: PowerupType) => void;
}

const loadBestScore = () => {
  try { return parseInt(localStorage.getItem('subwayrush_best') || '0', 10); }
  catch { return 0; }
};

const saveBestScore = (score: number) => {
  try { localStorage.setItem('subwayrush_best', String(score)); }
  catch { /* silent */ }
};

const initialMissions = (): Mission[] =>
  MISSIONS_CONFIG.map(m => ({ ...m, current: 0 }));

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: 'menu',
  qualityTier: qualityManager.tier,
  score: 0,
  bestScore: loadBestScore(),
  coins: 0,
  speed: INITIAL_SPEED,
  distance: 0,

  playerLane: 0,
  targetLane: 0,
  playerAction: 'run',
  isJumping: false,
  isSliding: false,

  worldZ: 0,
  chunks: [],
  collectedCoinIds: new Set(),
  chunkCounter: 0,

  missions: initialMissions(),
  jumpCount: 0,
  slideCount: 0,

  chaseMeter: 0,
  isWarning: false,

  activePowerups: new Map(),
  isJetpackActive: false,

  startGame: () => {
    resetRuntime();
    set({
      gameState: 'playing',
      qualityTier: qualityManager.tier,
      score: 0,
      coins: 0,
      speed: INITIAL_SPEED,
      distance: 0,
      playerLane: 0,
      targetLane: 0,
      playerAction: 'run',
      isJumping: false,
      isSliding: false,
      worldZ: 0,
      chunks: [],
      collectedCoinIds: new Set(),
      chunkCounter: 0,
      missions: initialMissions(),
      jumpCount: 0,
      slideCount: 0,
      chaseMeter: 0,
      isWarning: false,
      activePowerups: new Map(),
      isJetpackActive: false,
    });
  },

  pauseGame: () => set({ gameState: 'paused' }),
  resumeGame: () => set({ gameState: 'playing' }),

  endGame: () => {
    const { score, bestScore } = get();
    const finalScore = Math.max(score, Math.floor(runtime.score));
    const newBest = Math.max(finalScore, bestScore);
    if (newBest > bestScore) saveBestScore(newBest);
    set({ gameState: 'gameover', score: finalScore, bestScore: newBest, worldZ: worldZRef.current });
  },

  restartGame: () => get().startGame(),

  setPlayerLane: (lane) => set({ playerLane: lane }),
  setTargetLane: (lane) => set({ targetLane: lane }),
  setPlayerAction: (action) => set({ playerAction: action }),
  setJumping: (v) => set({ isJumping: v }),
  setSliding: (v) => set({ isSliding: v }),

  tick: (delta: number) => {
    const { gameState, activePowerups } = get();
    if (gameState !== 'playing') return;

    // Update quality manager
    qualityManager.trackFrame();

    // Tick powerups locally to determine if state needs update
    let powerupsChanged = false;
    const nextPowerups = new Map(activePowerups);
    
    nextPowerups.forEach((p, type) => {
      p.remaining -= delta;
      if (p.remaining <= 0) {
        nextPowerups.delete(type);
        powerupsChanged = true;
      }
    });

    const isJetpackActive = nextPowerups.has('jetpack');
    if (isJetpackActive !== get().isJetpackActive) {
      powerupsChanged = true;
    }

    const speedForFrame = runtime.speed;
    runtime.speed = Math.min(runtime.speed + SPEED_INCREMENT_PER_SEC * delta, MAX_SPEED);
    runtime.distance += speedForFrame * delta;
    runtime.score += SCORE_PER_SECOND * speedForFrame * delta;
    worldZRef.current += speedForFrame * delta;

    const now = performance.now();
    if (now - runtime.lastUiSync > 90 || powerupsChanged) {
      runtime.lastUiSync = now;
      set({
        speed: runtime.speed,
        distance: runtime.distance,
        score: Math.floor(runtime.score),
        worldZ: worldZRef.current,
        activePowerups: nextPowerups,
        isJetpackActive,
        qualityTier: qualityManager.tier,
      });
    }
  },

  addChunk:    (chunk) => set(s => ({ chunks: [...s.chunks, chunk], chunkCounter: s.chunkCounter + 1 })),
  removeChunk: (id)    => set(s => ({ chunks: s.chunks.filter(c => c.id !== id) })),
  setChunks: (chunks, chunkCounter) => set({ chunks, chunkCounter }),

  collectCoin: (id) => {
    const { collectedCoinIds, coins, score, missions, activePowerups } = get();
    if (collectedCoinIds.has(id)) return;
    
    const newIds = new Set(collectedCoinIds);
    newIds.add(id);

    const multiplier = activePowerups.has('multiplier') ? 2 : 1;
    runtime.score = Math.max(runtime.score, score) + COIN_SCORE * multiplier;
    
    const newMissions = missions.map(m =>
      m.id === 'collect_coins' ? { ...m, current: Math.min(m.current + 1, m.target) } : m
    );
    
    set({ 
      collectedCoinIds: newIds, 
      coins: coins + 1, 
      score: Math.floor(runtime.score), 
      missions: newMissions 
    });
  },

  incrementJump: () => {
    const { jumpCount, missions } = get();
    set({
      jumpCount: jumpCount + 1,
      missions: missions.map(m =>
        m.id === 'jump_times' ? { ...m, current: Math.min(m.current + 1, m.target) } : m
      ),
    });
  },

  incrementSlide: () => {
    const { slideCount, missions } = get();
    set({
      slideCount: slideCount + 1,
      missions: missions.map(m =>
        m.id === 'slide_times' ? { ...m, current: Math.min(m.current + 1, m.target) } : m
      ),
    });
  },

  updateChaseMeter: (delta) => {
    const { isJetpackActive } = get();
    // Don't increase chase meter if flying high in jetpack
    if (isJetpackActive) return;

    const newMeter = Math.min(get().chaseMeter + delta * 6, 100);
    set({ chaseMeter: newMeter, isWarning: newMeter > 65 });
  },

  resetChaseMeter: () => set(s => ({ chaseMeter: Math.max(0, s.chaseMeter - 20) })),

  activatePowerup: (type: PowerupType) => {
    const { activePowerups } = get();
    const nextPowerups = new Map(activePowerups);
    
    let duration = 10;
    if (type === 'magnet') duration = POWERUP_MAGNET_DURATION;
    if (type === 'sneakers') duration = POWERUP_SNEAKERS_DURATION;
    if (type === 'multiplier') duration = POWERUP_MULTIPLIER_DURATION;
    if (type === 'jetpack') duration = POWERUP_JETPACK_DURATION;

    nextPowerups.set(type, { type, remaining: duration, duration });
    
    set({ 
      activePowerups: nextPowerups,
      isJetpackActive: nextPowerups.has('jetpack')
    });
  }
}));

