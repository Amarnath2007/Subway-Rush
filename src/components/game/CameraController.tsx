import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { INITIAL_SPEED, LANE_POSITIONS } from '../../config/constants';
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
  const prevGameState = useRef('menu');

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 57;
      camera.near = 0.1;
      camera.far = 260;
      camera.updateProjectionMatrix();
    }
  }, [camera]);

  useFrame(({ clock }, delta) => {
    const { gameState, targetLane, isWarning, speed } = useGameStore.getState();
    const followT = 1 - Math.pow(1 - 0.095, delta * 60);
    const laneT = 1 - Math.pow(1 - 0.18, delta * 60);

    if (gameState === 'playing' || gameState === 'paused') {
      const targetX = LANE_POSITIONS[targetLane + 1];
      smoothedLaneX.current += (targetX - smoothedLaneX.current) * laneT;

      const jumpY = jumpYRef.current;
      const aspect = size.width / Math.max(1, size.height);
      const portraitBias = Math.max(0, 0.9 - aspect);
      const speedPullback = Math.min(1.2, Math.max(0, speed - INITIAL_SPEED) * 0.045);
      const followY = FOLLOW_OFFSET.y + portraitBias * 1.25;
      const followZ = FOLLOW_OFFSET.z + speedPullback + portraitBias * 10.5;
      const lookY = LOOK_OFFSET.y - portraitBias * 0.35;
      const lookZ = LOOK_OFFSET.z - portraitBias * 0.7;

      desiredPos.current.set(
        smoothedLaneX.current * 0.58,
        followY + jumpY * 0.18,
        followZ
      );
      desiredLook.current.set(
        smoothedLaneX.current,
        lookY + jumpY * 0.34,
        lookZ
      );

      currentPos.current.lerp(desiredPos.current, followT);
      currentLook.current.lerp(desiredLook.current, followT);
      camera.position.copy(currentPos.current);

      if (crashShake.current > 0) {
        crashShake.current = Math.max(0, crashShake.current - delta * 8);
        const amp = crashShake.current * 0.14;
        camera.position.x += Math.sin(clock.elapsedTime * 70) * amp;
        camera.position.y += Math.cos(clock.elapsedTime * 94) * amp * 0.5;
      } else if (isWarning) {
        camera.position.x += Math.sin(clock.elapsedTime * 42) * 0.035;
      }

      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, targetLane * -0.035, followT);
      camera.lookAt(currentLook.current);
    } else if (gameState === 'menu') {
      const t = clock.elapsedTime * 0.28;
      camera.position.set(Math.sin(t) * 7, 5.4, Math.cos(t) * 8 + 4);
      camera.rotation.z = 0;
      camera.lookAt(0, 1.2, -1.5);
    } else if (gameState === 'gameover') {
      desiredPos.current.set(0, 5.5, 8.5);
      currentPos.current.lerp(desiredPos.current, delta * 1.8);
      camera.position.copy(currentPos.current);
      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0, delta * 4);
      camera.lookAt(0, 1.1, -1);
    }

    if (gameState === 'gameover' && prevGameState.current === 'playing') {
      crashShake.current = 1.3;
    }

    prevGameState.current = gameState;
  });

  return null;
}
