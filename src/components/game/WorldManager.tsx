import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore, worldZRef } from '../../store/gameStore';
import { generateChunk } from '../../utils/chunkGenerator';
import { CHUNK_LENGTH, CHUNKS_AHEAD, CHUNKS_BEHIND, JETPACK_COIN_STOP_BEFORE_END } from '../../config/constants';
import { ChunkData } from '../../types/game';
import { qualityManager } from '../../utils/qualityManager';

function getChunkIndexForWorld(worldZ: number): number {
  return Math.floor(worldZ / CHUNK_LENGTH);
}

function getChunkZ(index: number): number {
  return -index * CHUNK_LENGTH;
}

function buildChunk(index: number): ChunkData {
  const chunkZ = getChunkZ(index);
  const progressionIndex = Math.max(0, index);
  const difficulty = Math.min(progressionIndex / 32, 1);
  const envDensity = qualityManager.settings.envDensity;
  
  const state = useGameStore.getState();
  const jetpackPower = state.activePowerups.get('jetpack');
  
  // Stop spawning sky coins slightly before the descent starts for a cleaner visual flow
  const isJetpackActive = state.isJetpackActive && jetpackPower != null && jetpackPower.remaining > JETPACK_COIN_STOP_BEFORE_END;
  
  return generateChunk(index, chunkZ, {
    difficulty,
    safe: index < 0,
    envDensity,
    isJetpackActive,
  });
}

function syncChunkWindow(worldZ: number, force = false) {
  const state = useGameStore.getState();
  const qSettings = qualityManager.settings;
  
  const centerIndex = getChunkIndexForWorld(worldZ);
  const firstIndex = centerIndex - qSettings.chunksBehind;
  const lastIndex = centerIndex + qSettings.chunksAhead;
  
  const existing = new Map<number, ChunkData>();

  for (const chunk of state.chunks) {
    existing.set(chunk.index, chunk);
  }

  const nextChunks: ChunkData[] = [];
  let changed = force || state.chunks.length !== lastIndex - firstIndex + 1;

  for (let index = firstIndex; index <= lastIndex; index++) {
    const chunk = existing.get(index);
    if (chunk) {
      nextChunks.push(chunk);
    } else {
      nextChunks.push(buildChunk(index));
      changed = true;
    }
  }

  if (!changed) {
    for (const chunk of state.chunks) {
      if (chunk.index < firstIndex || chunk.index > lastIndex) {
        changed = true;
        break;
      }
    }
  }

  if (!changed) return;

  useGameStore.getState().setChunks(
    nextChunks,
    Math.max(state.chunkCounter, lastIndex + 1)
  );
}

export default function WorldManager() {
  const lastCenterIndexRef = useRef<number | null>(null);
  const lastTierRef = useRef(qualityManager.tier);

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    if (state.gameState !== 'playing') return;

    // Smoother tick clamping
    const clampedDelta = Math.min(delta, 0.04);
    state.tick(clampedDelta);
    
    // Adaptive quality tracking
    qualityManager.trackFrame();

    const worldZ = worldZRef.current;
    const centerIndex = getChunkIndexForWorld(worldZ);
    const currentTier = qualityManager.tier;
    
    if (
      lastCenterIndexRef.current !== centerIndex || 
      state.chunks.length === 0 ||
      lastTierRef.current !== currentTier
    ) {
      lastCenterIndexRef.current = centerIndex;
      lastTierRef.current = currentTier;
      syncChunkWindow(worldZ);
    }
  });

  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prev) => {
      if (state.gameState === 'playing' && prev.gameState !== 'playing') {
        lastCenterIndexRef.current = getChunkIndexForWorld(0);
        lastTierRef.current = qualityManager.tier;
        syncChunkWindow(0, true);
      }
    });

    return unsub;
  }, []);

  return null;
}
