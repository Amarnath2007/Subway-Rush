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
  CAMERA_JETPACK_LOOK_DOWN,
  CAMERA_DISTANCE,
  CAMERA_HEIGHT,
  CAMERA_PITCH,
  FOLLOW_SMOOTHNESS,
  LANE_SMOOTHNESS
} from '../../config/constants';
import { useGameStore, jumpYRef } from '../../store/gameStore';

// --- Subway Surfers (Normal) Configuration ---
const FOLLOW_OFFSET_SS = new THREE.Vector3(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
const LOOK_DISTANCE_SS = 25; 
const LOOK_Y_OFFSET_SS = CAMERA_HEIGHT - Math.tan(CAMERA_PITCH * Math.PI / 180) * LOOK_DISTANCE_SS;
const LOOK_OFFSET_SS = new THREE.Vector3(0, LOOK_Y_OFFSET_SS, -LOOK_DISTANCE_SS);

// --- Original Cinematic (Jetpack) Configuration ---
const FOLLOW_OFFSET_OLD = new THREE.Vector3(0, 4.15, 8.15);
const LOOK_OFFSET_OLD = new THREE.Vector3(0, 1.25, -3.2);
const JETPACK_PULLBACK_OLD = 6.0;
const JETPACK_HEIGHT_OLD = 8.5;
const JETPACK_LOOK_DOWN_OLD = 6.0;
const JETPACK_FOV_BOOST_OLD = 15;

export default function CameraController() {
  const { camera, size } = useThree();
  const currentPos = useRef(new THREE.Vector3(0, FOLLOW_OFFSET_SS.y, FOLLOW_OFFSET_SS.z));
  const currentLook = useRef(new THREE.Vector3(0, LOOK_OFFSET_SS.y, LOOK_OFFSET_SS.z));
  const desiredPos = useRef(new THREE.Vector3(0, FOLLOW_OFFSET_SS.y, FOLLOW_OFFSET_SS.z));
  const desiredLook = useRef(new THREE.Vector3());
  const smoothedLaneX = useRef(0);

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
    
    const followT = 1 - Math.pow(1 - FOLLOW_SMOOTHNESS, delta * 60);
    const laneT = 1 - Math.pow(1 - LANE_SMOOTHNESS, delta * 60);
    const speedNorm = (speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED);

    if (camera instanceof THREE.PerspectiveCamera) {
      let fovTarget = THREE.MathUtils.lerp(BASE_FOV, MAX_FOV_SPEED, speedNorm);
      if (isJetpackActive) {
        fovTarget += JETPACK_FOV_BOOST_OLD;
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
      const portraitBias = Math.max(0, 1.0 - aspect); 
      const speedPullback = Math.min(2.5, Math.max(0, speed - INITIAL_SPEED) * 0.15);
      const altitudeT = Math.min(1, jumpY / JETPACK_HEIGHT);
      
      if (isJetpackActive) {
        // --- RESTORED ORIGINAL JETPACK CAMERA LOGIC ---
        const jetpackPullback = altitudeT * JETPACK_PULLBACK_OLD;
        const jetpackHeightAdd = altitudeT * JETPACK_HEIGHT_OLD;
        const jetpackLookDown = altitudeT * JETPACK_LOOK_DOWN_OLD;

        const followY = FOLLOW_OFFSET_OLD.y + portraitBias * 2.0 + jetpackHeightAdd;
        const followZ = FOLLOW_OFFSET_OLD.z + speedPullback + portraitBias * 12.0 + jetpackPullback;
        const lookY = LOOK_OFFSET_OLD.y - portraitBias * 0.5 - jetpackLookDown;
        const lookZ = LOOK_OFFSET_OLD.z - portraitBias * 1.5 - altitudeT * 12.0;

        desiredPos.current.set(
          smoothedLaneX.current * 0.35, 
          followY + jumpY * 0.5,        
          followZ
        );
        
        desiredLook.current.set(
          smoothedLaneX.current * 0.8,
          lookY + jumpY * 0.15, 
          lookZ
        );
      } else {
        // --- NEW SUBWAY SURFERS RUNNING CAMERA ---
        const { isSliding } = state;
        const slideDip = isSliding ? -0.45 : 0;
        
        const followY = FOLLOW_OFFSET_SS.y + portraitBias * 1.5 + jumpY + slideDip;
        const followZ = FOLLOW_OFFSET_SS.z + speedPullback + portraitBias * 4.0;
        
        const lookY = LOOK_OFFSET_SS.y - portraitBias * 2.0 + jumpY + slideDip;
        const lookZ = LOOK_OFFSET_SS.z - portraitBias * 5.0;

        desiredPos.current.set(
          smoothedLaneX.current, 
          followY,
          followZ
        );
        
        desiredLook.current.set(
          smoothedLaneX.current,
          lookY, 
          lookZ
        );
      }

      currentPos.current.lerp(desiredPos.current, followT);
      currentLook.current.lerp(desiredLook.current, followT);
      camera.position.copy(currentPos.current);

      camera.position.copy(currentPos.current);

      // Lane tilt
      const velX = (smoothedLaneX.current - prevSmoothedX) / delta;
      const tiltTarget = -velX * 0.005 + (targetLane * -0.012);
      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, tiltTarget, 0.1);
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
