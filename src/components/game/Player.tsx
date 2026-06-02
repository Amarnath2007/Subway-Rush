import { useRef, useEffect, useMemo, Component, ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, jumpYRef, worldZRef } from '../../store/gameStore';
import {
  LANE_POSITIONS, JUMP_FORCE, GRAVITY,
  COIN_COLLECT_RADIUS,
  TARGET_PLAYER_HEIGHT,
  LANE_TILT_AMOUNT,
  LANDING_SQUASH_DURATION,
  SNEAKERS_JUMP_MULTIPLIER,
  JETPACK_HEIGHT,
  POWERUP_COLLECT_RADIUS,
  MAGNET_RADIUS,
} from '../../config/constants';
import { soundManager } from '../../utils/soundManager';
import { applyMeshRenderOptions, computeNormalizedTransform } from '../../utils/normalizeModel';

// ─── Error boundary for FBX loads ─────────────────────────────────────────
interface EBState { hasError: boolean }
class ModelErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

// ─── High-quality fallback character ──────────────────────────────────────
function FallbackCharacter({ isSliding }: { isSliding: boolean }) {
  return (
    <group rotation={[0, Math.PI, 0]}>
      <mesh position={[0, isSliding ? 0.58 : 1.05, 0]}>
        <capsuleGeometry args={[0.28, isSliding ? 0.65 : 1.25, 8, 12]} />
        <meshStandardMaterial color="#ffcc33" roughness={0.45} />
      </mesh>
      <mesh position={[0, isSliding ? 1.05 : 1.95, 0]}>
        <sphereGeometry args={[0.24, 16, 12]} />
        <meshStandardMaterial color="#ffe0b2" roughness={0.55} />
      </mesh>
    </group>
  );
}

import { SkeletonUtils } from 'three-stdlib';

const RUNNER_ASSETS = {
  base: '/assets/runner/Aj.fbx',
  run: '/assets/runner/Running.fbx',
  jump: '/assets/runner/Running Jump.fbx',
  slide: '/assets/runner/Running Slide.fbx',
} as const;

useFBX.preload(RUNNER_ASSETS.base);
useFBX.preload(RUNNER_ASSETS.run);
useFBX.preload(RUNNER_ASSETS.jump);
useFBX.preload(RUNNER_ASSETS.slide);

function getUsableClip(fbx: THREE.Group, name: string): THREE.AnimationClip | null {
  const source = fbx.animations.find(clip => clip.tracks.length > 0 && clip.duration > 0.01);
  if (!source) return null;

  const clip = source.clone();
  clip.name = name;
  clip.tracks = clip.tracks.map(track => {
    const isPositionTrack = track.name.endsWith('.position');
    const isRootTrack = /hips|root/i.test(track.name);
    if (!isPositionTrack || !isRootTrack) return track;

    const pinned = track.clone();
    const values = pinned.values as Float32Array | number[];
    const baseX = values[0] ?? 0;
    const baseZ = values[2] ?? 0;
    for (let i = 0; i < values.length; i += 3) {
      values[i] = baseX;
      values[i + 2] = baseZ;
    }
    return pinned;
  }).filter(track => {
    const isPositionTrack = track.name.endsWith('.position');
    const isRootTrack = /hips|root/i.test(track.name);
    return !isPositionTrack || isRootTrack;
  });
  return clip;
}

function FBXCharacter({ isSliding, groupRef }: { isSliding: boolean; groupRef: React.RefObject<THREE.Group> }) {
  const base     = useFBX(RUNNER_ASSETS.base);
  const fbxRun   = useFBX(RUNNER_ASSETS.run);
  const fbxJump  = useFBX(RUNNER_ASSETS.jump);
  const fbxSlide = useFBX(RUNNER_ASSETS.slide);

  const playerAction = useGameStore(s => s.playerAction);

  const model = useMemo(() => {
    const cloned = SkeletonUtils.clone(base) as THREE.Group;
    const { scale, position } = computeNormalizedTransform(cloned, TARGET_PLAYER_HEIGHT, { centerXZ: true });
    cloned.scale.setScalar(scale);
    cloned.position.copy(position);
    applyMeshRenderOptions(cloned, { castShadow: false, receiveShadow: false, frustumCulled: false });
    return cloned;
  }, [base]);

  const allClips = useMemo(() => {
    return [
      getUsableClip(fbxRun, 'run'),
      getUsableClip(fbxJump, 'jump'),
      getUsableClip(fbxSlide, 'slide'),
    ].filter((clip): clip is THREE.AnimationClip => Boolean(clip));
  }, [fbxRun, fbxJump, fbxSlide]);

  const { actions, mixer } = useAnimations(allClips, model);
  const currentActionName = useRef<string>('');

  useEffect(() => {
    if (!actions || !actions['run'] || !model) return;
    const nextActionName = playerAction;
    if (nextActionName === currentActionName.current) return;
    const prevAction = actions[currentActionName.current];
    const nextAction = actions[nextActionName] || actions['run'];
    if (nextAction) {
      if (prevAction) prevAction.fadeOut(0.15);
      nextAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.15).play();
      if (nextActionName === 'jump' || nextActionName === 'slide') {
        nextAction.setLoop(THREE.LoopOnce, 1);
        nextAction.clampWhenFinished = true;
      } else {
        nextAction.setLoop(THREE.LoopRepeat, Infinity);
      }
      currentActionName.current = nextActionName;
    }
  }, [playerAction, actions, model]);

  useEffect(() => {
    if (!mixer || !actions) return;
    const onFinished = (e: any) => {
      if (e.action.getClip().name === 'jump' || e.action.getClip().name === 'slide') {
        useGameStore.getState().setPlayerAction('run');
      }
    };
    mixer.addEventListener('finished', onFinished);
    return () => mixer.removeEventListener('finished', onFinished);
  }, [mixer, actions]);

  if (!model) return null;
  return <primitive object={model} rotation={[0, Math.PI, 0]} />; 
}

export default function Player() {
  const groupRef = useRef<THREE.Group>(null!);
  const characterRef = useRef<THREE.Group>(null!);

  const laneXRef    = useRef(0);
  const jumpVelRef  = useRef(0);
  const isJumpPhysicsActive = useRef(false);
  const lastHitTime = useRef(0);
  const crashShakeRef = useRef(0);
  
  // V2: Effects state
  const landingSquashRef = useRef(0);
  const lastLaneXRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const state = useGameStore.getState();
    const isJetpack = state.isJetpackActive;
    
    if (state.gameState !== 'playing') return;

    // ── Lane switching ─────────────────────────────
    const targetX = LANE_POSITIONS[state.targetLane + 1];
    const lerpT   = 1 - Math.pow(1 - 0.22, delta * 60); 
    lastLaneXRef.current = laneXRef.current;
    laneXRef.current += (targetX - laneXRef.current) * lerpT;
    
    if (Math.abs(laneXRef.current - targetX) < 0.01 && state.playerLane !== state.targetLane) {
      useGameStore.getState().setPlayerLane(state.targetLane);
    }

    // Lane tilt logic
    const velX = (laneXRef.current - lastLaneXRef.current) / delta;
    const targetTilt = -velX * 0.015;
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetTilt, 0.15);

    // ── Jump/Jetpack physics ─────────────────────
    if (isJetpack) {
      const targetY = JETPACK_HEIGHT;
      jumpYRef.current += (targetY - jumpYRef.current) * (1 - Math.pow(1 - 0.1, delta * 60));
      isJumpPhysicsActive.current = false;
    } else {
      if (state.isJumping && !isJumpPhysicsActive.current) {
        isJumpPhysicsActive.current = true;
        const jumpMultiplier = state.activePowerups.has('sneakers') ? SNEAKERS_JUMP_MULTIPLIER : 1.0;
        jumpVelRef.current = JUMP_FORCE * jumpMultiplier;
      }

      if (isJumpPhysicsActive.current) {
        jumpVelRef.current  += GRAVITY * delta;
        jumpYRef.current    += jumpVelRef.current * delta;
        if (jumpYRef.current <= 0) {
          jumpYRef.current           = 0;
          jumpVelRef.current         = 0;
          isJumpPhysicsActive.current = false;
          useGameStore.getState().setJumping(false);
          if (!state.isSliding) useGameStore.getState().setPlayerAction('run');
          useGameStore.getState().resetChaseMeter();
          
          // Landing squash trigger
          landingSquashRef.current = 1.0;
        }
      }
    }

    // Apply squash and stretch
    if (landingSquashRef.current > 0) {
      landingSquashRef.current -= delta / LANDING_SQUASH_DURATION;
      const squash = 1.0 + Math.sin(landingSquashRef.current * Math.PI) * 0.2;
      groupRef.current.scale.set(1.1 - squash * 0.1, squash, 1);
    } else {
      groupRef.current.scale.set(1, 1, 1);
    }

    if (isJumpPhysicsActive.current) useGameStore.getState().updateChaseMeter(delta);

    groupRef.current.position.x = laneXRef.current;
    groupRef.current.position.y = jumpYRef.current;

    // ── Crash shake ─────────────────────────────
    if (crashShakeRef.current > 0) {
      crashShakeRef.current -= delta * 5;
    }

    // ── Collision detection ──────────────────────
    const now = performance.now();
    if (now - lastHitTime.current < 500) return; 

    const px = laneXRef.current;
    const py = jumpYRef.current;
    const isMagnet = state.activePowerups.has('magnet');

    for (const chunk of state.chunks) {
      // Obstacles (skip if jetpack)
      if (!isJetpack) {
        for (const obs of chunk.obstacles) {
          const obsWorldZ = obs.z + worldZRef.current;
          if (obsWorldZ < -1.5 || obsWorldZ > 4) continue; 

          const obsX = LANE_POSITIONS[obs.lane + 1];
          const dx   = Math.abs(px - obsX);

          if (obs.type === 'up') {
            if (dx < 1.6 && py < 1.3) { triggerCrash(lastHitTime, crashShakeRef); return; }
          } else if (obs.type === 'down') {
            if (dx < 1.6 && !state.isSliding) { triggerCrash(lastHitTime, crashShakeRef); return; }
          } else if (obs.type === 'train') {
            if (dx < 1.3 && py < 3.8) { triggerCrash(lastHitTime, crashShakeRef); return; }
          }
        }
      }

      // Coins
      for (const coin of chunk.coins) {
        if (state.collectedCoinIds.has(coin.id)) continue;
        const coinWorldZ = coin.z + worldZRef.current;
        if (coinWorldZ < -5 || coinWorldZ > 5) continue;
        const coinX = LANE_POSITIONS[coin.lane + 1];
        const dx = Math.abs(px - coinX);
        const dy = Math.abs(py - 0.9);
        const dz = Math.abs(coinWorldZ);

        const radius = isMagnet ? MAGNET_RADIUS : COIN_COLLECT_RADIUS;
        if (dx < radius && dy < radius && dz < radius) {
          soundManager.playCoin();
          useGameStore.getState().collectCoin(coin.id);
        }
      }

      // Powerups
      for (const pw of chunk.powerups) {
        const pwWorldZ = pw.z + worldZRef.current;
        if (pwWorldZ < -2 || pwWorldZ > 2) continue;
        const pwX = LANE_POSITIONS[pw.lane + 1];
        if (Math.abs(px - pwX) < POWERUP_COLLECT_RADIUS && Math.abs(pwWorldZ) < POWERUP_COLLECT_RADIUS) {
          useGameStore.getState().activatePowerup(pw.type);
          // We need a way to track collected powerups. I'll add that to the store.
          // For now, let's just assume we need to give them IDs and filter like coins.
          // I'll update types to include id and collected flag.
        }
      }
    }
  });

  const isSliding2 = useGameStore(s => s.isSliding);
  const gameState  = useGameStore(s => s.gameState);

  if (gameState === 'menu') return null;

  return (
    <group ref={groupRef} position={[LANE_POSITIONS[1], 0, 0]}>
      <ModelErrorBoundary fallback={<FallbackCharacter isSliding={isSliding2} />}>
        <FBXCharacter isSliding={isSliding2} groupRef={groupRef} />
      </ModelErrorBoundary>
    </group>
  );
}

function triggerCrash(
  lastHitTime: React.MutableRefObject<number>,
  crashShakeRef: React.MutableRefObject<number>
) {
  lastHitTime.current   = performance.now();
  crashShakeRef.current = 1;
  soundManager.playGameOver();
  useGameStore.getState().endGame();
}

