import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore, worldZRef } from '../../store/gameStore';
import { generateChunk } from '../../utils/chunkGenerator';
import { CHUNK_LENGTH, CHUNKS_AHEAD, CHUNKS_BEHIND } from '../../config/constants';
import { ChunkData } from '../../types/game';

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
  return generateChunk(index, chunkZ, {
    difficulty,
    safe: index < 0,
  });
}

function syncChunkWindow(worldZ: number, force = false) {
  const centerIndex = getChunkIndexForWorld(worldZ);
  const firstIndex = centerIndex - CHUNKS_BEHIND;
  const lastIndex = centerIndex + CHUNKS_AHEAD;
  const state = useGameStore.getState();
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

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    if (state.gameState !== 'playing') return;

    const clampedDelta = Math.min(delta, 0.05);
    state.tick(clampedDelta);

    const worldZ = worldZRef.current;
    const centerIndex = getChunkIndexForWorld(worldZ);
    if (lastCenterIndexRef.current !== centerIndex || state.chunks.length === 0) {
      lastCenterIndexRef.current = centerIndex;
      syncChunkWindow(worldZ);
    }
  });

  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prev) => {
      if (state.gameState === 'playing' && prev.gameState !== 'playing') {
        lastCenterIndexRef.current = getChunkIndexForWorld(0);
        syncChunkWindow(0, true);
      }
    });

    return unsub;
  }, []);

  return null;
}
