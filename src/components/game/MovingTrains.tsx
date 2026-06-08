import { useMemo, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { jumpYRef, playerXRef, useGameStore, worldZRef } from '../../store/gameStore';
import {
  LANE_POSITIONS,
  TARGET_TRAIN_HEIGHT,
  MOVING_TRAIN_MIN_SPEED,
  MOVING_TRAIN_MAX_SPEED,
  MOVING_TRAIN_SPAWN_INTERVAL,
  MOVING_TRAIN_CAR_LENGTH,
  OBS_TRAIN_DX,
  OBS_TRAIN_PY,
  CRASH_GAME_OVER_DELAY_MS,
} from '../../config/constants';
import { soundManager } from '../../utils/soundManager';
import { computeNormalizedTransform, applyMeshRenderOptions } from '../../utils/normalizeModel';

const TRAIN_URL_1 = '/assets/Environment/subway_surfers_train.glb'; 
const TRAIN_URL_2 = '/assets/Environment/subway_surfers_train2.glb';

useGLTF.preload(TRAIN_URL_1);
useGLTF.preload(TRAIN_URL_2);

interface MovingTrainData {
  id: number;
  lane: number;
  speed: number;
  cars: number;
  spawnZ: number;
  currentLocalZ: number;
}

const POOL_SIZE = 8; 
const DESPAWN_Z = 120; 

function triggerMovingTrainCrash() {
  const state = useGameStore.getState();
  if (state.isGameOverPending || state.gameState !== 'playing' || state.isJetpackActive) return;
  const cv = state.beginCrash();
  soundManager.playGameOver();
  window.setTimeout(() => { if (useGameStore.getState().crashVersion === cv) useGameStore.getState().endGame(); }, CRASH_GAME_OVER_DELAY_MS);
}

export default function MovingTrains() {
  const { scene: t1 } = useGLTF(TRAIN_URL_1);
  const { scene: t2 } = useGLTF(TRAIN_URL_2);
  const meshRefs = useRef<(THREE.Group | null)[]>(Array(POOL_SIZE).fill(null));
  const pool = useRef<(MovingTrainData | null)[]>(Array(POOL_SIZE).fill(null));
  const timer = useRef(2.5);
  const lastCrash = useRef(0);

  const models = useMemo(() => {
    const n1 = t1.clone();
    const tr1 = computeNormalizedTransform(n1, TARGET_TRAIN_HEIGHT, { centerXZ: true });
    n1.scale.setScalar(tr1.scale); n1.position.copy(tr1.position);
    applyMeshRenderOptions(n1, { frustumCulled: false });
    const n2 = t2.clone();
    const tr2 = computeNormalizedTransform(n2, TARGET_TRAIN_HEIGHT, { centerXZ: true });
    n2.scale.setScalar(tr2.scale); n2.position.copy(tr2.position);
    applyMeshRenderOptions(n2, { frustumCulled: false });
    return { engine: n1, carriage: n2 };
  }, [t1, t2]);

  const spawn = useCallback(() => {
    const idx = pool.current.findIndex(t => t === null);
    if (idx === -1) return;
    pool.current[idx] = {
      id: Math.random(),
      lane: Math.floor(Math.random() * 3),
      speed: MOVING_TRAIN_MIN_SPEED + Math.random() * (MOVING_TRAIN_MAX_SPEED - MOVING_TRAIN_MIN_SPEED),
      cars: Math.random() > 0.4 ? Math.floor(Math.random() * 3) + 1 : 1,
      spawnZ: worldZRef.current + 220,
      currentLocalZ: 0,
    };
  }, []);

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    if (state.gameState !== 'playing' || state.isGameOverPending) return;

    timer.current -= delta;
    if (timer.current <= 0) { spawn(); timer.current = MOVING_TRAIN_SPAWN_INTERVAL * (0.8 + Math.random() * 0.4); }

    for (let i = 0; i < POOL_SIZE; i++) {
       const t = pool.current[i]; const m = meshRefs.current[i];
       if (!m || !t) { if (m) m.visible = false; continue; }

       t.currentLocalZ += (t.speed + state.speed * 0.5) * delta;
       const tWorldZ = t.spawnZ - t.currentLocalZ;
       const relZ = tWorldZ - worldZRef.current; // Screen-space relative Z

       if (relZ > DESPAWN_Z) { pool.current[i] = null; m.visible = false; continue; }

       m.visible = true;
       m.position.set(LANE_POSITIONS[t.lane], 0, tWorldZ);
       m.rotation.y = Math.PI;

       for (let c = 0; c < 4; c++) {
         const carAnchor = m.children[c] as THREE.Group;
         if (c < t.cars) {
           carAnchor.visible = true; carAnchor.position.z = c * MOVING_TRAIN_CAR_LENGTH;
           const target = (c === 0) ? models.engine : models.carriage;
           if (carAnchor.children[0] !== target) { carAnchor.clear(); carAnchor.add(target.clone()); }
         } else carAnchor.visible = false;
       }

       // Collision check (No-penetration logic)
       if (!state.isJetpackActive && performance.now() - lastCrash.current > 500) {
         const dx = Math.abs(playerXRef.current - LANE_POSITIONS[t.lane]);
         const py = jumpYRef.current;
         if (dx < OBS_TRAIN_DX && py < OBS_TRAIN_PY) {
           // Front of engine is relZ + 4.0. Player is at 0.
           // Crash if front reaches player's position range (tight margin)
           const front = relZ + 4.0;
           const back = relZ - 4.0; // Engine back, regardless of car count
           if (front >= -1.2 && back <= 1.0) {
             lastCrash.current = performance.now();
             triggerMovingTrainCrash();
           }
         }
       }
    }
  });

  return (
    <group>
      {Array.from({ length: POOL_SIZE }).map((_, i) => (
        <group key={i} ref={el => { meshRefs.current[i] = el; }} visible={false}>
          {Array.from({ length: 4 }).map((__, c) => <group key={c} />)}
        </group>
      ))}
    </group>
  );
}
