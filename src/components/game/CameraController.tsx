import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { 
  INITIAL_SPEED, 
  JETPACK_HEIGHT, 
  MAX_SPEED, 
  LANE_POSITIONS,
  BASE_FOV,
  MAX_FOV_SPEED,
  JETPACK_FOV_BOOST,
  CAMERA_JETPACK_PULLBACK,
  CAMERA_JETPACK_HEIGHT,
  CAMERA_JETPACK_LOOK_DOWN
} from '../../config/constants';
import { useGameStore, jumpYRef } from '../../store/gameStore';

const FOLLOW_OFFSET = new THREE.Vector3(0, 4.15, 8.15);
const LOOK_OFFSET = new THREE.Vector3(0, 1.25, -3.2);

export default function CameraController() {
  const { camera, size } = useThree();
  const currentPos = useRef(new THREE.Vector3(0, FOLLOW_OFFSET.y, FOLLOW_OFFSET.z));
  const currentLook = useRef(new THREE.Vector3(0, LOOK_OFFSET.y, LOOK_OFFSET.z));
  const desiredPos = useRef(new THREE.Vector3());
  const desiredLook = useRef(new THREE.Vector3());
  const smoothedLaneX = useRef(0);
  const crashShake = useRef(0);
  const prevCrashVersion = useRef(0);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = BASE_FOV;
      camera.near = 0.1;
      camera.far = 320; 
      camera.updateProjectionMatrix();
    }
  }, [camera]);

  useFrame(({ clock }, delta) => {
    const state = useGameStore.getState();
    const { gameState, targetLane, isWarning, speed, isJetpackActive, crashVersion } = state;
    
    const followT = 1 - Math.pow(1 - 0.095, delta * 60);
    const laneT = 1 - Math.pow(1 - 0.18, delta * 60);
    const speedNorm = (speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED);

    if (crashVersion !== prevCrashVersion.current) {
      prevCrashVersion.current = crashVersion;
      crashShake.current = Math.max(crashShake.current, 1.7);
    }

    if (camera instanceof THREE.PerspectiveCamera) {
      let fovTarget = THREE.MathUtils.lerp(BASE_FOV, MAX_FOV_SPEED, speedNorm);
      if (isJetpackActive) {
        fovTarget += JETPACK_FOV_BOOST;
      }
      camera.fov = THREE.MathUtils.lerp(camera.fov, fovTarget, 0.06);
      camera.updateProjectionMatrix();
    }

    if (gameState === 'playing' || gameState === 'paused') {
      const targetX = LANE_POSITIONS[targetLane + 1];
      const prevSmoothedX = smoothedLaneX.current;
      smoothedLaneX.current += (targetX - smoothedLaneX.current) * laneT;

      const jumpY = jumpYRef.current;
      const aspect = size.width / Math.max(1, size.height);
      const portraitBias = Math.max(0, 1.0 - aspect); // Stronger bias for portrait
      const speedPullback = Math.min(2.5, Math.max(0, speed - INITIAL_SPEED) * 0.15);
      
      const altitudeT = Math.min(1, jumpY / JETPACK_HEIGHT);
      
      // V3.1 Cinematic Flight: Higher, tilted down, and pulled back
      const jetpackPullback = altitudeT * CAMERA_JETPACK_PULLBACK;
      const jetpackHeightAdd = altitudeT * CAMERA_JETPACK_HEIGHT;
      const jetpackLookDown = altitudeT * CAMERA_JETPACK_LOOK_DOWN;

      const followY = FOLLOW_OFFSET.y + portraitBias * 2.0 + jetpackHeightAdd;
      const followZ = FOLLOW_OFFSET.z + speedPullback + portraitBias * 12.0 + jetpackPullback;
      
      // Look target moves FURTHER AHEAD but also stays LOWER on tracks for the "downward" look
      const lookY = LOOK_OFFSET.y - portraitBias * 0.5 - jetpackLookDown;
      const lookZ = LOOK_OFFSET.z - portraitBias * 1.5 - altitudeT * 12.0;

      desiredPos.current.set(
        smoothedLaneX.current * (isJetpackActive ? 0.35 : 0.5), 
        followY + (isJetpackActive ? jumpY * 0.5 : jumpY * 0.22),
        followZ
      );
      
      desiredLook.current.set(
        smoothedLaneX.current * 0.8,
        lookY + (isJetpackActive ? jumpY * 0.15 : jumpY * 0.36), // Keep look target closer to ground
        lookZ
      );

      currentPos.current.lerp(desiredPos.current, followT);
      currentLook.current.lerp(desiredLook.current, followT);
      camera.position.copy(currentPos.current);

      if (crashShake.current > 0) {
        crashShake.current = Math.max(0, crashShake.current - delta * 7);
        const amp = crashShake.current * 0.18;
        camera.position.x += (Math.random() - 0.5) * amp;
        camera.position.y += (Math.random() - 0.5) * amp;
      } else if (isWarning) {
        camera.position.x += Math.sin(clock.elapsedTime * 42) * 0.045;
      }

      // Speed/Flight wobble
      const wobbleFreq = isJetpackActive ? 15 : 12;
      const wobbleAmp = isJetpackActive ? 0.04 : 0.02;
      camera.position.y += Math.sin(clock.elapsedTime * wobbleFreq) * speedNorm * wobbleAmp;

      // Lane tilt
      const velX = (smoothedLaneX.current - prevSmoothedX) / delta;
      const tiltTarget = -velX * 0.005 + (targetLane * -0.012);
      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, tiltTarget, 0.12);
      
      camera.lookAt(currentLook.current);
    } else if (gameState === 'menu') {
      const t = clock.elapsedTime * 0.45;
      const orbitRadius = 6.8;
      camera.position.set(Math.sin(t * 0.4) * orbitRadius, 3.15, Math.cos(t * 0.4) * orbitRadius + 2);
      camera.rotation.z = Math.sin(t * 0.5) * 0.02;
      camera.lookAt(0, 1.25, 0);
    } else if (gameState === 'gameover') {
      desiredPos.current.set(0, 5.8, 8.8);
      currentPos.current.lerp(desiredPos.current, delta * 2.2);
      camera.position.copy(currentPos.current);
      camera.lookAt(0, 1.1, -1.2);
    }
  });

  return null;
}
