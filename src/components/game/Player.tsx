import { useRef, useEffect, useMemo, Component, ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { jumpYRef, playerXRef, useGameStore, worldZRef } from '../../store/gameStore';
import {
  LANE_POSITIONS, JUMP_FORCE, GRAVITY,
  COIN_COLLECT_RADIUS,
  CRASH_GAME_OVER_DELAY_MS,
  GROUND_COIN_Y,
  TARGET_PLAYER_HEIGHT,
  LANE_TILT_AMOUNT,
  LANDING_SQUASH_DURATION,
  SNEAKERS_JUMP_MULTIPLIER,
  JETPACK_HEIGHT,
  POWERUP_COLLECT_RADIUS,
  POWERUP_PICKUP_Y,
  MAGNET_COLLECT_RADIUS,
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
  fly: '/assets/runner/Flying.fbx',
  hit: '/assets/runner/Got hit.fbx',
} as const;

useFBX.preload(RUNNER_ASSETS.base);
useFBX.preload(RUNNER_ASSETS.run);
useFBX.preload(RUNNER_ASSETS.jump);
useFBX.preload(RUNNER_ASSETS.slide);
useFBX.preload(RUNNER_ASSETS.fly);
useFBX.preload(RUNNER_ASSETS.hit);

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
  const fbxFly   = useFBX(RUNNER_ASSETS.fly);
  const fbxHit   = useFBX(RUNNER_ASSETS.hit);

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
      getUsableClip(fbxFly, 'fly'),
      getUsableClip(fbxHit, 'hit'),
    ].filter((clip): clip is THREE.AnimationClip => Boolean(clip));
  }, [fbxRun, fbxJump, fbxSlide, fbxFly, fbxHit]);

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
      if (nextActionName === 'jump' || nextActionName === 'slide' || nextActionName === 'hit') {
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
        const state = useGameStore.getState();
        if (!state.isGameOverPending) {
          useGameStore.getState().setPlayerAction(state.isJetpackActive ? 'fly' : 'run');
        }
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
  const wasJetpackActiveRef = useRef(false);
  
  // V2: Effects state
  const landingSquashRef = useRef(0);
  const lastLaneXRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const state = useGameStore.getState();
    const isJetpack = state.isJetpackActive;
    
    if (state.gameState !== 'playing') return;

    if (state.isGameOverPending) {
      groupRef.current.position.x = laneXRef.current;
      groupRef.current.position.y = jumpYRef.current;
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.18);
      playerXRef.current = laneXRef.current;
      return;
    }

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
      jumpYRef.current += (targetY - jumpYRef.current) * (1 - Math.pow(1 - 0.115, delta * 60));
      jumpVelRef.current = 0;
      isJumpPhysicsActive.current = false;
      wasJetpackActiveRef.current = true;
      if (state.playerAction !== 'fly') useGameStore.getState().setPlayerAction('fly');
    } else {
      if (wasJetpackActiveRef.current && jumpYRef.current > 0 && !isJumpPhysicsActive.current) {
        wasJetpackActiveRef.current = false;
        isJumpPhysicsActive.current = true;
        jumpVelRef.current = -3.5;
        useGameStore.getState().setJumping(true);
        useGameStore.getState().setPlayerAction('run');
      } else if (jumpYRef.current <= 0) {
        wasJetpackActiveRef.current = false;
      }

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
    playerXRef.current = laneXRef.current;

    // ── Crash shake ─────────────────────────────
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
            if (dx < 1.6 && py < 1.3) { triggerCrash(lastHitTime); return; }
          } else if (obs.type === 'down') {
            if (dx < 1.6 && !state.isSliding) { triggerCrash(lastHitTime); return; }
          } else if (obs.type === 'train') {
            if (dx < 1.3 && py < 3.8) { triggerCrash(lastHitTime); return; }
          }
        }
      }

      // Coins
      for (const coin of chunk.coins) {
        if (state.collectedCoinIds.has(coin.id)) continue;
        if (coin.kind === 'aerial' && !isJetpack) continue;
        const coinWorldZ = coin.z + worldZRef.current;
        if (coinWorldZ < -5 || coinWorldZ > 5) continue;
        const coinX = LANE_POSITIONS[coin.lane + 1] + (coin.xOffset ?? 0);
        const coinY = coin.y ?? GROUND_COIN_Y;
        const dx = Math.abs(px - coinX);
        const dy = Math.abs(py - coinY);
        const dz = Math.abs(coinWorldZ);

        const magnetDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const magnetSweep = isMagnet && dz < MAGNET_COLLECT_RADIUS && dx < MAGNET_RADIUS && dy < MAGNET_RADIUS;
        const isCollected = isMagnet
          ? magnetDist < MAGNET_COLLECT_RADIUS || magnetSweep
          : dx < COIN_COLLECT_RADIUS && dy < COIN_COLLECT_RADIUS && dz < COIN_COLLECT_RADIUS;

        if (isCollected) {
          soundManager.playCoin();
          useGameStore.getState().collectCoin(coin.id);
        }
      }

      // Powerups
      for (const pw of chunk.powerups) {
        if (state.collectedPowerupIds.has(pw.id)) continue;
        const pwWorldZ = pw.z + worldZRef.current;
        if (pwWorldZ < -2 || pwWorldZ > 2) continue;
        const pwX = LANE_POSITIONS[pw.lane + 1];
        const pwDy = Math.abs(py - POWERUP_PICKUP_Y);
        if (
          Math.abs(px - pwX) < POWERUP_COLLECT_RADIUS &&
          pwDy < POWERUP_COLLECT_RADIUS &&
          Math.abs(pwWorldZ) < POWERUP_COLLECT_RADIUS
        ) {
          soundManager.playPowerup();
          useGameStore.getState().collectPowerup(pw.id, pw.type);
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

function triggerCrash(lastHitTime: React.MutableRefObject<number>) {
  lastHitTime.current   = performance.now();
  const crashVersion = useGameStore.getState().beginCrash();
  soundManager.playGameOver();
  window.setTimeout(() => {
    const state = useGameStore.getState();
    if (state.isGameOverPending && state.crashVersion === crashVersion) {
      state.endGame();
    }
  }, CRASH_GAME_OVER_DELAY_MS);
}
