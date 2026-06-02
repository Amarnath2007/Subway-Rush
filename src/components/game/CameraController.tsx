import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { INITIAL_SPEED, MAX_SPEED, LANE_POSITIONS } from '../../config/constants';
import { useGameStore, jumpYRef } from '../../store/gameStore';

const FOLLOW_OFFSET = new THREE.Vector3(0, 4.15, 8.15);
const LOOK_OFFSET = new THREE.Vector3(0, 1.25, -3.2);
const BASE_FOV = 57;
const MAX_FOV_V2 = 68;

export default function CameraController() {
  const { camera, size } = useThree();
  const currentPos = useRef(new THREE.Vector3(0, FOLLOW_OFFSET.y, FOLLOW_OFFSET.z));
  const currentLook = useRef(new THREE.Vector3(0, LOOK_OFFSET.y, LOOK_OFFSET.z));
  const desiredPos = useRef(new THREE.Vector3());
  const desiredLook = useRef(new THREE.Vector3());
  const smoothedLaneX = useRef(0);
  const crashShake = useRef(0);
  const prevGameState = useRef('menu');

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = BASE_FOV;
      camera.near = 0.1;
      camera.far = 260;
      camera.updateProjectionMatrix();
    }
  }, [camera]);

  useFrame(({ clock }, delta) => {
    const { gameState, targetLane, isWarning, speed } = useGameStore.getState();
    const followT = 1 - Math.pow(1 - 0.095, delta * 60);
    const laneT = 1 - Math.pow(1 - 0.18, delta * 60);

    if (camera instanceof THREE.PerspectiveCamera) {
      const fovTarget = THREE.MathUtils.lerp(BASE_FOV, MAX_FOV_V2, (speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED));
      camera.fov = THREE.MathUtils.lerp(camera.fov, fovTarget, 0.05);
      camera.updateProjectionMatrix();
    }

    if (gameState === 'playing' || gameState === 'paused') {
      const targetX = LANE_POSITIONS[targetLane + 1];
      const prevSmoothedX = smoothedLaneX.current;
      smoothedLaneX.current += (targetX - smoothedLaneX.current) * laneT;

      const jumpY = jumpYRef.current;
      const aspect = size.width / Math.max(1, size.height);
      const portraitBias = Math.max(0, 0.9 - aspect);
      const speedPullback = Math.min(2.5, Math.max(0, speed - INITIAL_SPEED) * 0.12);
      const followY = FOLLOW_OFFSET.y + portraitBias * 1.5;
      const followZ = FOLLOW_OFFSET.z + speedPullback + portraitBias * 11.5;
      const lookY = LOOK_OFFSET.y - portraitBias * 0.35;
      const lookZ = LOOK_OFFSET.z - portraitBias * 0.7;

      desiredPos.current.set(
        smoothedLaneX.current * 0.52,
        followY + jumpY * 0.22,
        followZ
      );
      desiredLook.current.set(
        smoothedLaneX.current * 0.9,
        lookY + jumpY * 0.36,
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

      // Lane tilt
      const velX = (smoothedLaneX.current - prevSmoothedX) / delta;
      const tiltTarget = -velX * 0.006 + (targetLane * -0.02);
      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, tiltTarget, 0.12);
      
      camera.lookAt(currentLook.current);
    } else if (gameState === 'menu') {
      const t = clock.elapsedTime * 0.28;
      camera.position.set(Math.sin(t) * 7.5, 5.8, Math.cos(t) * 8.5 + 4);
      camera.rotation.z = 0;
      camera.lookAt(0, 1.2, -1.8);
    } else if (gameState === 'gameover') {
      desiredPos.current.set(0, 5.8, 8.8);
      currentPos.current.lerp(desiredPos.current, delta * 2.2);
      camera.position.copy(currentPos.current);
      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0, delta * 4);
      camera.lookAt(0, 1.1, -1.2);
    }

    if (gameState === 'gameover' && prevGameState.current === 'playing') {
      crashShake.current = 1.6;
    }

    prevGameState.current = gameState;
  });

  return null;
}

