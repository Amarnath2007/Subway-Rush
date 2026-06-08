import { create } from 'zustand';
import { GameState, Lane, PlayerAction, ChunkData, Mission, PowerupType, ActivePowerup } from '../types/game';
import {
  MISSIONS_CONFIG, INITIAL_SPEED, SPEED_INCREMENT_PER_SEC,
  MAX_SPEED, COIN_SCORE, SCORE_PER_SECOND,
  POWERUP_DURATIONS, POWERUP_UPGRADE_COSTS, REVIVE_COST, CHARACTERS
} from '../config/constants';
import { qualityManager, QualityTier } from '../utils/qualityManager';

// --- V3 Save Data Interface ---
export interface SaveData {
  version: number;
  bestScore: number;
  totalCoins: number;
  diamonds: number;
  unlockedCharacters: string[];
  selectedCharacter: string;
  powerupLevels: Record<string, number>;
  claimedAchievements: string[];
  stats: {
    lifetimeCoins: number;
    lifetimeDistance: number;
    lifetimeGamesPlayed: number;
    lifetimeJumps: number;
    lifetimeSlides: number;
    lifetimePowerupsCollected: number;
  };
}

const SAVE_KEY = 'subway_rush_v3_save';
const DEFAULT_SAVE: SaveData = {
  version: 1,
  bestScore: 0,
  totalCoins: 10000,
  diamonds: 15,
  unlockedCharacters: ['AJ'],
  selectedCharacter: 'AJ',
  powerupLevels: { jetpack: 1, magnet: 1, sneakers: 1, multiplier: 1 },
  claimedAchievements: [],
  stats: {
    lifetimeCoins: 10000,
    lifetimeDistance: 0,
    lifetimeGamesPlayed: 0,
    lifetimeJumps: 0,
    lifetimeSlides: 0,
    lifetimePowerupsCollected: 0,
  }
};

const loadSaveData = (): SaveData => {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return DEFAULT_SAVE;
    const parsed = JSON.parse(saved);
    // Basic migration/merge
    return { ...DEFAULT_SAVE, ...parsed };
  } catch {
    return DEFAULT_SAVE;
  }
};

const saveGameData = (data: Partial<SaveData>) => {
  try {
    const current = loadSaveData();
    const updated = { ...current, ...data };
    localStorage.setItem(SAVE_KEY, JSON.stringify(updated));
  } catch { /* silent */ }
};

// ─── Shared jump state ref ─────────────────────────────────────────────────
export const jumpYRef = { current: 0 };
export const playerXRef = { current: 0 };
export const worldZRef = { current: 0 };

const runtime = {
  score: 0,
  speed: INITIAL_SPEED,
  distance: 0,
  lastUiSync: 0,
  sessionCoins: 0,
  sessionJumps: 0,
  sessionSlides: 0,
  sessionPowerups: 0,
};

const resetRuntime = () => {
  jumpYRef.current = 0;
  playerXRef.current = 0;
  worldZRef.current = 0;
  runtime.score = 0;
  runtime.speed = INITIAL_SPEED;
  runtime.distance = 0;
  runtime.lastUiSync = 0;
  runtime.sessionCoins = 0;
  runtime.sessionJumps = 0;
  runtime.sessionSlides = 0;
  runtime.sessionPowerups = 0;
};

interface GameStore extends SaveData {
  gameState: GameState;
  qualityTier: QualityTier;
  score: number;
  speed: number;
  distance: number;
  coins: number; // Session coins

  playerLane: Lane;
  targetLane: Lane;
  playerAction: PlayerAction;
  isJumping: boolean;
  isSliding: boolean;

  worldZ: number;
  chunks: ChunkData[];
  collectedCoinIds: Set<string>;
  collectedPowerupIds: Set<string>;
  chunkCounter: number;

  missions: Mission[];
  chaseMeter: number;
  isWarning: boolean;

  // Powerups state
  activePowerups: Map<PowerupType, ActivePowerup>;
  isJetpackActive: boolean;
  isGameOverPending: boolean;
  crashVersion: number;
  reviveUsed: boolean;

  // Actions
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  restartGame: () => void;
  revive: () => boolean;

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
  collectPowerup: (id: string, type: PowerupType) => void;
  incrementJump: () => void;
  incrementSlide: () => void;
  updateChaseMeter: (delta: number) => void;
  resetChaseMeter: () => void;

  // Powerup actions
  activatePowerup: (type: PowerupType) => void;
  beginCrash: () => number;

  // Economy & Progression
  buyCharacter: (id: string, currency: 'coins' | 'diamonds') => boolean;
  selectCharacter: (id: string) => void;
  upgradePowerup: (type: string) => boolean;
  claimAchievement: (id: string, rewardValue: number) => void;
}

const initialMissions = (): Mission[] =>
  (MISSIONS_CONFIG as any[]).map((m: any) => ({ ...m, current: 0 }));

export const useGameStore = create<GameStore>((set, get) => ({
  ...loadSaveData(),
  gameState: 'menu',
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
  collectedPowerupIds: new Set(),
  chunkCounter: 0,

  missions: initialMissions(),
  chaseMeter: 0,
  isWarning: false,

  activePowerups: new Map(),
  isJetpackActive: false,
  isGameOverPending: false,
  crashVersion: 0,
  reviveUsed: false,

  startGame: () => {
    resetRuntime();
    set({
      gameState: 'playing',
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
      collectedPowerupIds: new Set(),
      chunkCounter: 0,
      missions: initialMissions(),
      chaseMeter: 0,
      isWarning: false,
      activePowerups: new Map(),
      isJetpackActive: false,
      isGameOverPending: false,
      crashVersion: 0,
      reviveUsed: false,
    });
  },

  pauseGame: () => set({ gameState: 'paused' }),
  resumeGame: () => set({ gameState: 'playing' }),

  endGame: () => {
    const { score, bestScore, totalCoins, diamonds, stats } = get();
    const finalScore = Math.max(score, Math.floor(runtime.score));
    const newBest = Math.max(finalScore, bestScore);
    
    // Update lifetime stats
    const updatedStats = {
      ...stats,
      lifetimeCoins: stats.lifetimeCoins + runtime.sessionCoins,
      lifetimeDistance: stats.lifetimeDistance + Math.floor(runtime.distance),
      lifetimeGamesPlayed: stats.lifetimeGamesPlayed + 1,
      lifetimeJumps: stats.lifetimeJumps + runtime.sessionJumps,
      lifetimeSlides: stats.lifetimeSlides + runtime.sessionSlides,
      lifetimePowerupsCollected: stats.lifetimePowerupsCollected + runtime.sessionPowerups,
    };

    const newTotalCoins = totalCoins + runtime.sessionCoins;

    saveGameData({ 
      bestScore: newBest, 
      totalCoins: newTotalCoins,
      stats: updatedStats 
    });

    set({
      gameState: 'gameover',
      score: finalScore,
      bestScore: newBest,
      totalCoins: newTotalCoins,
      stats: updatedStats,
      worldZ: worldZRef.current,
      isGameOverPending: false,
      isJetpackActive: false,
      activePowerups: new Map(),
      playerAction: 'hit',
    });
  },

  restartGame: () => get().startGame(),

  revive: () => {
    const { diamonds, reviveUsed, crashVersion } = get();
    if (reviveUsed || diamonds < REVIVE_COST) return false;

    const newDiamonds = diamonds - REVIVE_COST;
    saveGameData({ diamonds: newDiamonds });

    set({
      diamonds: newDiamonds,
      reviveUsed: true,
      isGameOverPending: false,
      gameState: 'playing',
      playerAction: 'run',
      speed: Math.max(INITIAL_SPEED, get().speed * 0.7), // soften speed on revive
      crashVersion: crashVersion + 1, // cancel pending gameover
    });
    
    // reset runtime speed
    runtime.speed = get().speed;
    
    return true;
  },

  setPlayerLane: (lane) => set({ playerLane: lane }),
  setTargetLane: (lane) => set({ targetLane: lane }),
  setPlayerAction: (action) => set({ playerAction: action }),
  setJumping: (v) => set({ isJumping: v }),
  setSliding: (v) => set({ isSliding: v }),

  tick: (delta: number) => {
    const { gameState, activePowerups, isGameOverPending } = get();
    if (gameState !== 'playing' || isGameOverPending) return;

    qualityManager.trackFrame();

    let powerupsChanged = false;
    const nextPowerups = new Map(activePowerups);
    
    nextPowerups.forEach((p, type) => {
      p.remaining -= delta;
      if (p.remaining <= 0) {
        nextPowerups.delete(type);
        powerupsChanged = true;
      }
    });

    const wasJetpackActive = get().isJetpackActive;
    const jetpackPower = nextPowerups.get('jetpack');
    const isJetpackActive = jetpackPower != null;
    
    if (isJetpackActive !== wasJetpackActive) {
      powerupsChanged = true;
    }

    const speedForFrame = runtime.speed;
    runtime.speed = Math.min(runtime.speed + SPEED_INCREMENT_PER_SEC * delta, MAX_SPEED);
    runtime.distance += speedForFrame * delta;
    const scoreMultiplier = nextPowerups.has('multiplier') ? 2 : 1;
    runtime.score += SCORE_PER_SECOND * speedForFrame * delta * scoreMultiplier;
    worldZRef.current += speedForFrame * delta;

    if (isJetpackActive && get().playerAction !== 'fly') {
      set({ playerAction: 'fly' });
    } else if (!isJetpackActive && wasJetpackActive && get().playerAction === 'fly') {
      set({ playerAction: 'run' });
    }

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
    runtime.sessionCoins += 1;
    
    const newMissions = missions.map(m => {
      if (m.id !== 'collect_coins') return m;
      let nextCurrent = m.current + 1;
      let nextTarget = m.target;
      if (nextCurrent >= nextTarget) {
        nextCurrent = 0;
        nextTarget = Math.floor(nextTarget * 1.5);
      }
      return { ...m, current: nextCurrent, target: nextTarget };
    });
    
    set({ 
      collectedCoinIds: newIds, 
      coins: coins + 1, 
      score: Math.floor(runtime.score), 
      missions: newMissions 
    });
  },

  collectPowerup: (id, type) => {
    const { collectedPowerupIds } = get();
    if (collectedPowerupIds.has(id)) return;

    const newIds = new Set(collectedPowerupIds);
    newIds.add(id);
    runtime.sessionPowerups += 1;
    set({ collectedPowerupIds: newIds });
    get().activatePowerup(type);
  },

  incrementJump: () => {
    runtime.sessionJumps += 1;
    const { missions } = get();
    set({
      missions: missions.map(m => {
        if (m.id !== 'jump_times') return m;
        let nextCurrent = m.current + 1;
        let nextTarget = m.target;
        if (nextCurrent >= nextTarget) {
          nextCurrent = 0;
          nextTarget = Math.floor(nextTarget * 1.5);
        }
        return { ...m, current: nextCurrent, target: nextTarget };
      }),
    });
  },

  incrementSlide: () => {
    runtime.sessionSlides += 1;
    const { missions } = get();
    set({
      missions: missions.map(m => {
        if (m.id !== 'slide_times') return m;
        let nextCurrent = m.current + 1;
        let nextTarget = m.target;
        if (nextCurrent >= nextTarget) {
          nextCurrent = 0;
          nextTarget = Math.floor(nextTarget * 1.5);
        }
        return { ...m, current: nextCurrent, target: nextTarget };
      }),
    });
  },

  updateChaseMeter: (delta) => {
    const { isJetpackActive } = get();
    if (isJetpackActive) return;
    const newMeter = Math.min(get().chaseMeter + delta * 6, 100);
    set({ chaseMeter: newMeter, isWarning: newMeter > 65 });
  },

  resetChaseMeter: () => set(s => ({ chaseMeter: Math.max(0, s.chaseMeter - 20) })),

  activatePowerup: (type: PowerupType) => {
    const { activePowerups, isGameOverPending, powerupLevels } = get();
    if (isGameOverPending) return;
    const nextPowerups = new Map(activePowerups);
    
    const level = powerupLevels[type] || 1;
    const duration = POWERUP_DURATIONS[level - 1] || 8;

    nextPowerups.set(type, { type, remaining: duration, duration });
    
    set({ 
      activePowerups: nextPowerups,
      isJetpackActive: nextPowerups.has('jetpack'),
      playerAction: type === 'jetpack' ? 'fly' : get().playerAction,
    });
  },

  beginCrash: () => {
    const current = get();
    if (current.isGameOverPending || current.gameState !== 'playing') return current.crashVersion;

    const crashVersion = current.crashVersion + 1;
    set({
      isGameOverPending: true,
      crashVersion,
      playerAction: 'hit',
      isJumping: false,
      isSliding: false,
      activePowerups: new Map(),
      isJetpackActive: false,
    });
    return crashVersion;
  },

  // Ecomony
  buyCharacter: (id, currency) => {
    const { totalCoins, diamonds, unlockedCharacters } = get();
    const config = CHARACTERS.find((c: any) => c.id === id);
    if (!config || unlockedCharacters.includes(id)) return false;

    if (currency === 'coins' && totalCoins >= config.costCoins) {
      const remaining = totalCoins - config.costCoins;
      const newUnlocked = [...unlockedCharacters, id];
      saveGameData({ totalCoins: remaining, unlockedCharacters: newUnlocked });
      set({ totalCoins: remaining, unlockedCharacters: newUnlocked });
      return true;
    }
    if (currency === 'diamonds' && diamonds >= config.costDiamonds) {
      const remaining = diamonds - config.costDiamonds;
      const newUnlocked = [...unlockedCharacters, id];
      saveGameData({ diamonds: remaining, unlockedCharacters: newUnlocked });
      set({ diamonds: remaining, unlockedCharacters: newUnlocked });
      return true;
    }
    return false;
  },

  selectCharacter: (id) => {
    saveGameData({ selectedCharacter: id });
    set({ selectedCharacter: id });
  },

  upgradePowerup: (type) => {
    const { totalCoins, powerupLevels } = get();
    const currentLevel = powerupLevels[type] || 1;
    if (currentLevel >= 5) return false;

    const cost = POWERUP_UPGRADE_COSTS[currentLevel];
    if (totalCoins < cost) return false;

    const newLevel = currentLevel + 1;
    const newLevels = { ...powerupLevels, [type]: newLevel };
    const newTotal = totalCoins - cost;

    saveGameData({ totalCoins: newTotal, powerupLevels: newLevels });
    set({ totalCoins: newTotal, powerupLevels: newLevels });
    return true;
  },

  claimAchievement: (id, rewardValue) => {
    const { claimedAchievements, diamonds } = get();
    if (claimedAchievements.includes(id)) return;

    const newClaimed = [...claimedAchievements, id];
    const newDiamonds = diamonds + rewardValue;

    saveGameData({ claimedAchievements: newClaimed, diamonds: newDiamonds });
    set({ claimedAchievements: newClaimed, diamonds: newDiamonds });
  }
}));
