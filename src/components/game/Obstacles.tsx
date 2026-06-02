import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, worldZRef } from '../../store/gameStore';
import { LANE_POSITIONS, TARGET_DOWN_OBS_HEIGHT, TARGET_TRAIN_HEIGHT, TARGET_UP_OBS_HEIGHT } from '../../config/constants';
import { ObstacleData } from '../../types/game';
import { InstancedModelBatch, InstancedModelItem } from './InstancedModel';

const UP_URL = '/assets/Environment/up_obstacle.glb';
const DOWN_URL = '/assets/Environment/down_obstacle.glb';
const TRAIN_URL_1 = '/assets/Environment/subway_surfers_train.glb';
const TRAIN_URL_2 = '/assets/Environment/subway_surfers_train2.glb';

useGLTF.preload(UP_URL);
useGLTF.preload(DOWN_URL);
useGLTF.preload(TRAIN_URL_1);
useGLTF.preload(TRAIN_URL_2);

function toItem(obs: ObstacleData): InstancedModelItem {
  const base = {
    id: obs.id,
    position: [LANE_POSITIONS[obs.lane + 1], 0, obs.z] as [number, number, number],
  };

  if (obs.type === 'down') {
    return {
      ...base,
      scale: [1.35, 1, 2.8],
    };
  }

  if (obs.type === 'up') {
    return {
      ...base,
      scale: [1.1, 1, 1.9],
    };
  }
  return {
    ...base,
    rotationY: Math.PI,
    scale: [0.94, 1, 1.15],
  };
}

export default function Obstacles() {
  const groupRef = useRef<THREE.Group>(null!);
  const chunks = useGameStore(s => s.chunks);

  useFrame(() => {
    if (groupRef.current) groupRef.current.position.z = worldZRef.current;
  });

  const obstacles = useMemo(() => chunks.flatMap(chunk => chunk.obstacles), [chunks]);
  const upItems = useMemo(() => obstacles.filter(obs => obs.type === 'up').map(toItem), [obstacles]);
  const downItems = useMemo(() => obstacles.filter(obs => obs.type === 'down').map(toItem), [obstacles]);
  const train1Items = useMemo(
    () => obstacles.filter(obs => obs.type === 'train' && obs.trainVariant !== 'train2').map(toItem),
    [obstacles]
  );
  const train2Items = useMemo(
    () => obstacles.filter(obs => obs.type === 'train' && obs.trainVariant === 'train2').map(toItem),
    [obstacles]
  );

  return (
    <group ref={groupRef}>
      <InstancedModelBatch url={UP_URL} targetHeight={TARGET_UP_OBS_HEIGHT} items={upItems} />
      <InstancedModelBatch url={DOWN_URL} targetHeight={TARGET_DOWN_OBS_HEIGHT} items={downItems} />
      <InstancedModelBatch url={TRAIN_URL_1} targetHeight={TARGET_TRAIN_HEIGHT} items={train1Items} />
      <InstancedModelBatch url={TRAIN_URL_2} targetHeight={TARGET_TRAIN_HEIGHT} items={train2Items} />
    </group>
  );
}
