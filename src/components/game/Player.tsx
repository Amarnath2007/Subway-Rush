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
  LANDING_SQUASH_DURATION,
  SNEAKERS_JUMP_MULTIPLIER,
  JETPACK_HEIGHT,
  POWERUP_COLLECT_RADIUS,
  POWERUP_PICKUP_Y,
  MAGNET_COLLECT_RADIUS,
  MAGNET_RADIUS,
  CHARACTERS,
  JETPACK_LANDING_SPEED,
  JETPACK_LANDING_IMMUNITY_HEIGHT,
  JETPACK_DESCENT_START_TIME,
  OBS_UP_DX,
  OBS_UP_PY,
  OBS_DOWN_DX,
  OBS_TRAIN_DX,
  OBS_TRAIN_PY,
  OBS_Z_MIN,
  OBS_Z_MAX,
} from '../../config/constants';
import { soundManager } from '../../utils/soundManager';
import { applyMeshRenderOptions, computeNormalizedTransform } from '../../utils/normalizeModel';
import { SkeletonUtils } from 'three-stdlib';

interface EBState { hasError: boolean }
class ModelErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

function FallbackCharacter({ isSliding }: { isSliding: boolean }) {
  return (
    <group rotation={[0, Math.PI, 0]}>
      <mesh position={[0, isSliding ? 0.58 : 1.05, 0]}>
        <capsuleGeometry args={[0.28, isSliding ? 0.65 : 1.25, 8, 12]} />
        <meshStandardMaterial color="#ffcc33" roughness={0.45} />
      </mesh>
    </group>
  );
}

function retargetClip(clip: THREE.AnimationClip, name: string): THREE.AnimationClip {
  const newClip = clip.clone();
  newClip.name = name;
  newClip.tracks.forEach(track => {
    const parts = track.name.split('.');
    const boneName = parts[0].split(':').pop() || parts[0];
    track.name = `${boneName}.${parts[1]}`;
    if (parts[1] === 'position' && /hips|root/i.test(boneName)) {
      const v = track.values as Float32Array;
      const baseX = v[0] ?? 0;
      const baseZ = v[2] ?? 0;
      for (let i = 0; i < v.length; i += 3) {
        v[i] = baseX; v[i + 2] = baseZ;
      }
    }
  });
  return newClip;
}

function FBXCharacter() {
  const selectedId = useGameStore(s => s.selectedCharacter);
  const characterConfig = useMemo(() => 
    CHARACTERS.find((c: any) => c.id === selectedId) || CHARACTERS[0]
  , [selectedId]);
  const base = useFBX(characterConfig.modelPath);
  const fbxRun = useFBX('/assets/runner/runner/Animations/Running.fbx');
  const fbxJump = useFBX('/assets/runner/runner/Animations/Running Jump.fbx');
  const fbxSlide = useFBX('/assets/runner/runner/Animations/Running Slide.fbx');
  const fbxFly = useFBX('/assets/runner/runner/Animations/Flying.fbx');
  const fbxHit = useFBX('/assets/runner/runner/Animations/Got hit.fbx');
  const playerAction = useGameStore(s => s.playerAction);
  const gameState = useGameStore(s => s.gameState);
  const model = useMemo(() => {
    const cloned = SkeletonUtils.clone(base) as THREE.Group;
    cloned.traverse(n => { if ((n as any).isBone) n.name = n.name.split(':').pop() || n.name; });
    const { scale, position } = computeNormalizedTransform(cloned, TARGET_PLAYER_HEIGHT * (characterConfig.scaleOverride ?? 1.0), { centerXZ: true });
    cloned.scale.setScalar(scale);
    cloned.position.set(position.x, position.y + (characterConfig.yOffset ?? 0), position.z);
    applyMeshRenderOptions(cloned, { castShadow: true, receiveShadow: false, frustumCulled: false });
    return cloned;
  }, [base, characterConfig]);
  const clips = useMemo(() => [
    fbxRun, fbxJump, fbxSlide, fbxFly, fbxHit
  ].map((f, i) => {
    const names = ['run', 'jump', 'slide', 'fly', 'hit'];
    const s = f.animations.find(c => c.tracks.length > 0 && c.duration > 0.01);
    return s ? retargetClip(s, names[i]) : null;
  }).filter(c => !!c) as THREE.AnimationClip[], [fbxRun, fbxJump, fbxSlide, fbxFly, fbxHit]);

  const { actions, mixer } = useAnimations(clips, model);
  const cur = useRef('');
  useEffect(() => {
    if (!actions) return;
    const next = gameState === 'menu' ? 'idle' : playerAction;
    if (next === cur.current) return;
    const p = actions[cur.current]; const n = actions[next] || actions['run'];
    if (n) {
      if (p) p.fadeOut(0.2);
      n.reset().setEffectiveWeight(1).fadeIn(0.2).play();
      if (next === 'idle') n.setEffectiveTimeScale(0.12);
      else n.setEffectiveTimeScale(1.0);
      if (/jump|slide|hit/.test(next)) { n.setLoop(THREE.LoopOnce, 1); n.clampWhenFinished = true; }
      cur.current = next;
    }
  }, [playerAction, gameState, actions]);
  useEffect(() => {
    if (!mixer) return;
    const f = (e: any) => { if (/jump|slide/.test(e.action.getClip().name)) {
      const s = useGameStore.getState(); if (!s.isGameOverPending) s.setPlayerAction(s.isJetpackActive ? 'fly' : 'run');
    }};
    mixer.addEventListener('finished', f); return () => mixer.removeEventListener('finished', f);
  }, [mixer]);
  return <primitive object={model} rotation={[0, Math.PI, 0]} />; 
}

export default function Player() {
  const groupRef = useRef<THREE.Group>(null!);
  const laneXRef = useRef(0);
  const jumpVelRef = useRef(0);
  const isJumpPhysicsActive = useRef(false);
  const lastHitTime = useRef(0);
  const wasJetpackActiveRef = useRef(false);
  const isJetpackLanding = useRef(false);
  const landingSquashRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const state = useGameStore.getState();
    if (state.gameState !== 'playing') return;
    if (state.isGameOverPending) {
      groupRef.current.position.set(laneXRef.current, jumpYRef.current, 0);
      return;
    }

    const tX = LANE_POSITIONS[state.targetLane + 1];
    laneXRef.current = THREE.MathUtils.lerp(laneXRef.current, tX, 1 - Math.pow(1 - 0.18, delta * 60));
    if (Math.abs(laneXRef.current - tX) < 0.01) state.setPlayerLane(state.targetLane);

    if (state.isJetpackActive) {
      const jet = state.activePowerups.get('jetpack');
      const time = jet?.remaining ?? 10;
      let targetY = JETPACK_HEIGHT;
      
      // Smooth takeoff and consistent height
      if (time > (jet?.duration ?? 10) - 1.0) {
        // Takeoff phase (first 1 second)
        const t = (jet!.duration - time);
        targetY = THREE.MathUtils.lerp(0, JETPACK_HEIGHT, Math.min(1, t * 1.2));
      } else if (time < JETPACK_DESCENT_START_TIME) {
        // Warning/Descent phase
        targetY = THREE.MathUtils.lerp(0.1, JETPACK_HEIGHT, time / JETPACK_DESCENT_START_TIME);
      }
      
      jumpYRef.current = THREE.MathUtils.lerp(jumpYRef.current, targetY, 0.08); // smoother height transition
      wasJetpackActiveRef.current = true;
    } else {
      if (wasJetpackActiveRef.current && jumpYRef.current > 0.1) { 
        wasJetpackActiveRef.current = false; 
        isJetpackLanding.current = true; 
      }
      
      if (isJetpackLanding.current) {
        // Smooth controlled landing glide
        jumpYRef.current = THREE.MathUtils.lerp(jumpYRef.current, 0, JETPACK_LANDING_SPEED);
        if (jumpYRef.current < 0.05) { 
          jumpYRef.current = 0; 
          isJetpackLanding.current = false; 
          state.setJumping(false); 
          landingSquashRef.current = 0.8; // subtle landing impact
        }
      } else {
        if (state.isJumping && !isJumpPhysicsActive.current) {
          isJumpPhysicsActive.current = true;
          jumpVelRef.current = JUMP_FORCE * (state.activePowerups.has('sneakers') ? SNEAKERS_JUMP_MULTIPLIER : 1.0);
        }
        if (isJumpPhysicsActive.current) {
          jumpVelRef.current += GRAVITY * delta; 
          jumpYRef.current += jumpVelRef.current * delta;
          if (jumpYRef.current <= 0) { 
            jumpYRef.current = 0; 
            isJumpPhysicsActive.current = false; 
            state.setJumping(false); 
            landingSquashRef.current = 1.0; 
          }
        }
      }
    }

    if (landingSquashRef.current > 0) {
      landingSquashRef.current -= delta / LANDING_SQUASH_DURATION;
      const s = 1.0 + Math.sin(landingSquashRef.current * Math.PI) * 0.15;
      groupRef.current.scale.set(1.1 - s * 0.1, s, 1);
    } else groupRef.current.scale.set(1, 1, 1);

    groupRef.current.position.set(laneXRef.current, jumpYRef.current, 0);
    playerXRef.current = laneXRef.current;

    // --- Collision V3.2: Absolute No-Penetration Logic ---
    const now = performance.now();
    if (now - lastHitTime.current < 500) return;
    const isImmune = state.isJetpackActive || (isJetpackLanding.current && jumpYRef.current > JETPACK_LANDING_IMMUNITY_HEIGHT);
    const px = laneXRef.current;
    const py = jumpYRef.current;

    for (const chunk of state.chunks) {
      if (!isImmune) {
        for (const obs of chunk.obstacles) {
          const relZ = obs.z + worldZRef.current;
          const dx = Math.abs(px - LANE_POSITIONS[obs.lane + 1]);

          if (obs.type === 'train') {
            // Train length is 8.0, origin center.
            // Front is relZ + 4.0. Player is at 0.
            // Crash if front touches player (tight safety margin to prevent entry)
            // AND we haven't passed the back yet
            if (dx < OBS_TRAIN_DX && py < OBS_TRAIN_PY) {
              const trainFront = relZ + 4.0;
              const trainBack = relZ - 4.0;
              if (trainFront >= -1.2 && trainBack <= 1.0) {
                triggerCrash(lastHitTime); return;
              }
            }
          } else {
            // Tight X/Z window for hurdles
            if (relZ < OBS_Z_MIN || relZ > OBS_Z_MAX) continue;
            if (obs.type === 'up' && dx < OBS_UP_DX && py < OBS_UP_PY) { triggerCrash(lastHitTime); return; }
          }
        }
      }
      // Coins & Powerups (standard logic remains)
      for (const coin of chunk.coins) {
        if (state.collectedCoinIds.has(coin.id)) continue;
        if (coin.kind === 'aerial' && !state.isJetpackActive) continue;
        const cz = coin.z + worldZRef.current;
        if (Math.abs(cz) > 5) continue;
        const cx = LANE_POSITIONS[coin.lane + 1] + (coin.xOffset ?? 0);
        const cy = coin.y ?? GROUND_COIN_Y;
        const dist = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2) + Math.pow(cz, 2));
        const mag = state.activePowerups.has('magnet') && Math.abs(cz) < 1.5 && Math.abs(px - cx) < 6 && Math.abs(py - cy) < 6;
        if (mag || dist < 1.35) { soundManager.playCoin(); state.collectCoin(coin.id); }
      }
      for (const pw of chunk.powerups) {
        if (state.collectedPowerupIds.has(pw.id)) continue;
        const pz = pw.z + worldZRef.current;
        if (Math.abs(pz) < 1.6 && Math.abs(px - LANE_POSITIONS[pw.lane + 1]) < 1.6 && Math.abs(py - 1.05) < 1.6) {
          soundManager.playPowerup(); state.collectPowerup(pw.id, pw.type);
        }
      }
    }
  });

  return (
    <group ref={groupRef}>
      <ModelErrorBoundary fallback={<FallbackCharacter isSliding={useGameStore.getState().isSliding} />}>
        <FBXCharacter />
      </ModelErrorBoundary>
    </group>
  );
}

function triggerCrash(lastHitTime: React.MutableRefObject<number>) {
  lastHitTime.current = performance.now();
  const cv = useGameStore.getState().beginCrash();
  soundManager.playGameOver();
  window.setTimeout(() => { if (useGameStore.getState().crashVersion === cv) useGameStore.getState().endGame(); }, CRASH_GAME_OVER_DELAY_MS);
}
