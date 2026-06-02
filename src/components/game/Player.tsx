import { useRef, useEffect, useMemo, Component, ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, jumpYRef, worldZRef } from '../../store/gameStore';
import {
  LANE_POSITIONS, LANE_SWITCH_SPEED, JUMP_FORCE, GRAVITY,
  PLAYER_COLLIDER, SLIDE_COLLIDER, COIN_COLLECT_RADIUS,
  TARGET_PLAYER_HEIGHT,
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
      <mesh position={[-0.18, 0.38, 0]}>
        <capsuleGeometry args={[0.07, 0.55, 6, 8]} />
        <meshStandardMaterial color="#1e88e5" roughness={0.5} />
      </mesh>
      <mesh position={[0.18, 0.38, 0]}>
        <capsuleGeometry args={[0.07, 0.55, 6, 8]} />
        <meshStandardMaterial color="#1e88e5" roughness={0.5} />
      </mesh>
    </group>
  );
}

// ─── FBX character — loaded at top level, no conditional hooks ────────────
// Bug 1 fix: hooks always called unconditionally at component top level.
// Bug 2 fix: use drei's useAnimations with clips from each FBX file;
//            retarget by matching bone names via SkeletonUtils or direct cross-fade.
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

function logFbxStatus(label: string, path: string, fbx: THREE.Group) {
  const box = new THREE.Box3().setFromObject(fbx);
  const size = new THREE.Vector3();
  box.getSize(size);

  console.info(`[runner asset] ${label} loaded`, {
    path,
    children: fbx.children.length,
    animations: fbx.animations.map((clip, index) => ({
      index,
      name: clip.name,
      duration: Number(clip.duration.toFixed(3)),
      tracks: clip.tracks.length,
    })),
    bounds: {
      width: Number(size.x.toFixed(3)),
      height: Number(size.y.toFixed(3)),
      depth: Number(size.z.toFixed(3)),
    },
  });
}

// ─── FBX character — loaded at top level, no conditional hooks ────────────
function FBXCharacter({ isSliding, groupRef }: { isSliding: boolean; groupRef: React.RefObject<THREE.Group> }) {
  // Load assets
  const base     = useFBX(RUNNER_ASSETS.base);
  const fbxRun   = useFBX(RUNNER_ASSETS.run);
  const fbxJump  = useFBX(RUNNER_ASSETS.jump);
  const fbxSlide = useFBX(RUNNER_ASSETS.slide);

  const playerAction = useGameStore(s => s.playerAction);

  // Clone and normalize the model
  const model = useMemo(() => {
    // Bug fix: use SkeletonUtils for rigged models, not .clone()
    const cloned = SkeletonUtils.clone(base) as THREE.Group;
    const { scale, position, sourceSize } = computeNormalizedTransform(cloned, TARGET_PLAYER_HEIGHT, { centerXZ: true });
    cloned.scale.setScalar(scale);
    cloned.position.copy(position);
    applyMeshRenderOptions(cloned, { castShadow: false, receiveShadow: false, frustumCulled: false });

    console.info('[runner model] normalized transform', {
      targetHeight: TARGET_PLAYER_HEIGHT,
      sourceSize: {
        width: Number(sourceSize.x.toFixed(3)),
        height: Number(sourceSize.y.toFixed(3)),
        depth: Number(sourceSize.z.toFixed(3)),
      },
      scale: Number(scale.toFixed(5)),
      position: cloned.position.toArray().map(v => Number(v.toFixed(3))),
      rotationY: Math.PI,
    });

    return cloned;
  }, [base]);

  useEffect(() => {
    logFbxStatus('Aj.fbx', RUNNER_ASSETS.base, base);
    logFbxStatus('Running.fbx', RUNNER_ASSETS.run, fbxRun);
    logFbxStatus('Running Jump.fbx', RUNNER_ASSETS.jump, fbxJump);
    logFbxStatus('Running Slide.fbx', RUNNER_ASSETS.slide, fbxSlide);
  }, [base, fbxRun, fbxJump, fbxSlide]);

  const allClips = useMemo(() => {
    const clips = [
      getUsableClip(fbxRun, 'run'),
      getUsableClip(fbxJump, 'jump'),
      getUsableClip(fbxSlide, 'slide'),
    ].filter((clip): clip is THREE.AnimationClip => Boolean(clip));

    console.info('[runner animation] selected clips', clips.map(clip => ({
      name: clip.name,
      duration: Number(clip.duration.toFixed(3)),
      tracks: clip.tracks.length,
    })));

    if (!clips.some(clip => clip.name === 'run')) {
      console.warn('[runner animation] run animation missing; player fallback pose will remain visible');
    }

    return clips;
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
      if (prevAction) {
        prevAction.fadeOut(0.2);
      }
      
      nextAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.2).play();
      
      if (nextActionName === 'jump' || nextActionName === 'slide') {
        nextAction.setLoop(THREE.LoopOnce, 1);
        nextAction.clampWhenFinished = true;
      } else {
        nextAction.setLoop(THREE.LoopRepeat, Infinity);
      }
      
      currentActionName.current = nextActionName;
    }
  }, [playerAction, actions, model]);

  // Return to run after jump/slide finishes
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

// ─── Main Player component ─────────────────────────────────────────────────
export default function Player() {
  const groupRef = useRef<THREE.Group>(null!);

  // Local physics state — not in Zustand to avoid 60fps re-renders (Bug 14)
  const laneXRef    = useRef(0);
  const jumpVelRef  = useRef(0);
  const isJumpPhysicsActive = useRef(false);
  const lastHitTime = useRef(0);
  const crashShakeRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const state = useGameStore.getState();
    if (state.gameState !== 'playing') return;

    // ── Lane switching (Bug 12 pattern: delta-normalised lerp) ─────────────
    const targetX = LANE_POSITIONS[state.targetLane + 1];
    const lerpT   = 1 - Math.pow(1 - 0.18, delta * 60);  // ~18% per frame at 60fps
    laneXRef.current += (targetX - laneXRef.current) * lerpT;
    if (Math.abs(laneXRef.current - targetX) < 0.04 && state.playerLane !== state.targetLane) {
      useGameStore.getState().setPlayerLane(state.targetLane);
    }

    // ── Jump physics ─────────────────────────────────────────────────────
    if (state.isJumping && !isJumpPhysicsActive.current) {
      isJumpPhysicsActive.current = true;
      jumpVelRef.current = JUMP_FORCE;
    }

    if (isJumpPhysicsActive.current) {
      jumpVelRef.current  += GRAVITY * delta;
      jumpYRef.current    += jumpVelRef.current * delta;  // Bug 14 fix: write to shared ref
      if (jumpYRef.current <= 0) {
        jumpYRef.current           = 0;
        jumpVelRef.current         = 0;
        isJumpPhysicsActive.current = false;
        useGameStore.getState().setJumping(false);
        if (!state.isSliding) useGameStore.getState().setPlayerAction('run');
        useGameStore.getState().resetChaseMeter();
      }
    }

    // ── Chase meter grows while jumping (tension during air time) ────────
    if (isJumpPhysicsActive.current) useGameStore.getState().updateChaseMeter(delta);

    // ── Apply transform ──────────────────────────────────────────────────
    groupRef.current.position.x = laneXRef.current;
    groupRef.current.position.y = jumpYRef.current;

    // ── Crash shake ──────────────────────────────────────────────────────
    if (crashShakeRef.current > 0) {
      crashShakeRef.current -= delta * 5;
      groupRef.current.rotation.z = Math.sin(Date.now() * 0.05) * crashShakeRef.current * 0.1;
    } else {
      groupRef.current.rotation.z = 0;
    }

    // ── Collision detection (Bug 5 fix) ─────────────────────────────────
    const now = performance.now();
    if (now - lastHitTime.current < 500) return; // invincibility window

    const px = laneXRef.current;
    const py = jumpYRef.current;

    for (const chunk of state.chunks) {
      // ── Obstacles ──
      for (const obs of chunk.obstacles) {
        // Bug 5 fix: obstacle world Z = obs.z + worldZ.
        // Player is at Z = 0. Collision when |obs.z + worldZ| < depth_threshold.
        const obsWorldZ = obs.z + worldZRef.current;
        if (obsWorldZ < -1.5 || obsWorldZ > 4) continue; // not near player

        const obsX = LANE_POSITIONS[obs.lane + 1];
        const dx   = Math.abs(px - obsX);

        if (obs.type === 'up') {
          // Barrier: player must jump. Collider height = TARGET_UP_OBS_HEIGHT
          const xHit = dx < 1.6;
          const yHit = py < 1.3; // not high enough
          if (xHit && yHit) { triggerCrash(lastHitTime, crashShakeRef); return; }
        } else if (obs.type === 'down') {
          // Low barrier: player must slide. Full height collision unless sliding.
          const xHit = dx < 1.6;
          if (xHit && !state.isSliding) { triggerCrash(lastHitTime, crashShakeRef); return; }
        } else if (obs.type === 'train') {
          // Train: entire lane blocked, must be in adjacent lane
          if (dx < 1.4) { triggerCrash(lastHitTime, crashShakeRef); return; }
        }
      }

      // ── Coins ──
      for (const coin of chunk.coins) {
        if (state.collectedCoinIds.has(coin.id)) continue;
        const coinWorldZ = coin.z + worldZRef.current;
        if (coinWorldZ < -2.5 || coinWorldZ > 3) continue;
        const coinX = LANE_POSITIONS[coin.lane + 1];
        const dx = Math.abs(px - coinX);
        if (dx < COIN_COLLECT_RADIUS && Math.abs(coinWorldZ) < COIN_COLLECT_RADIUS) {
          soundManager.playCoin();
          useGameStore.getState().collectCoin(coin.id);
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
        {/* Bug 1 fix: FBXCharacter always calls hooks unconditionally.
            Suspense boundary above catches the throw during load.
            ErrorBoundary catches actual load errors. */}
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
