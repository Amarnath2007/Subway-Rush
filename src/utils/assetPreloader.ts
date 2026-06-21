// ─── Asset Preloader ──────────────────────────────────────────────────────
// Preloads all game resources (models, animations, sounds) before starting.
// Reports granular progress to the loading screen.

import { useGLTF } from '@react-three/drei';
import { CHARACTERS } from '../config/constants';

const GLB_ASSETS = [
  // Environment
  '/assets/Environment/cartoon_building1.glb',
  '/assets/Environment/cartoon_building2.glb',
  '/assets/Environment/cartoon_building3.glb',
  '/assets/Environment/stylized_tree.glb',
  '/assets/Environment/tree2.glb',
  '/assets/Environment/subway_surfers_coin.glb',
  '/assets/Environment/up_obstacle.glb',
  '/assets/Environment/down_obstacle.glb',
  '/assets/Environment/subway_surfers_train.glb',
  '/assets/Environment/subway_surfers_train2.glb',
  // Powerups
  '/assets/power ups/u_magnet.glb',
  '/assets/power ups/sneakers.glb',
  '/assets/power ups/2x_multiplier.glb',
  '/assets/power ups/jetpack_-_subway_surfers.glb',
];

const ANIMATION_ASSETS = [
  '/assets/runner/runner/Animations/Running.fbx',
  '/assets/runner/runner/Animations/Running Jump.fbx',
  '/assets/runner/runner/Animations/Running Slide.fbx',
  '/assets/runner/runner/Animations/Flying.fbx',
  '/assets/runner/runner/Animations/Got hit.fbx',
];

const SOUND_ASSETS = [
  '/assets/BGM- mfcc-retro-arcade-game-music-297305.mp3',
];

// All characters from config
const CHARACTER_ASSETS = CHARACTERS.map(c => c.modelPath);

export type LoadingState = {
  progress: number;
  phase: string;
  done: boolean;
};

type ProgressCallback = (state: LoadingState) => void;

/**
 * Ensures all assets are loaded into memory/cache.
 * Uses fetch to warm browser cache and useGLTF.preload to warm Three.js cache.
 */
export async function preloadAllAssets(onProgress: ProgressCallback): Promise<void> {
  const allAssets = [
    ...GLB_ASSETS,
    ...CHARACTER_ASSETS,
    ...ANIMATION_ASSETS,
    ...SOUND_ASSETS
  ];
  
  const total = allAssets.length;
  let loadedCount = 0;

  const update = (phase: string) => {
    onProgress({
      progress: Math.round((loadedCount / total) * 100),
      phase,
      done: loadedCount >= total,
    });
  };

  update('Booting engine...');

  // Resource loaders
  const loadResource = async (url: string, phase: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      // If it's a GLB, also preload it into Three.js cache
      if (url.endsWith('.glb')) {
        useGLTF.preload(url);
      }
    } catch (err) {
      console.warn(`[Preloader] Failed to load ${url}:`, err);
    } finally {
      loadedCount++;
      update(phase);
    }
  };

  // We load in parallel but with a limit to avoid choking mobile browsers
  const limit = navigator.hardwareConcurrency > 4 ? 8 : 4;
  const queue = [...allAssets];
  
  const workers = Array(limit).fill(null).map(async () => {
    while (queue.length > 0) {
      const url = queue.shift()!;
      let phase = 'Loading resources...';
      if (url.includes('.glb')) phase = 'Loading 3D models...';
      if (url.includes('.fbx')) phase = 'Loading characters...';
      if (url.includes('.mp3')) phase = 'Loading audio...';
      await loadResource(url, phase);
    }
  });

  await Promise.all(workers);
  
  update('Finalizing...');
}
