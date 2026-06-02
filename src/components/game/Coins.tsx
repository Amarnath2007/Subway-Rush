import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, worldZRef } from '../../store/gameStore';
import { LANE_POSITIONS, TARGET_COIN_SIZE } from '../../config/constants';
import { CoinData } from '../../types/game';
import { InstancedModelSource, useInstancedModelSources } from './InstancedModel';

const COIN_URL = '/assets/Environment/subway_surfers_coin.glb';
const Y_AXIS = new THREE.Vector3(0, 1, 0);

useGLTF.preload(COIN_URL);

function hashUnit(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function boostCoinMaterial(material: THREE.Material | THREE.Material[]): THREE.Material | THREE.Material[] {
  const tune = (input: THREE.Material): THREE.Material => {
    const clone = input.clone();
    const maybeStandard = clone as THREE.MeshStandardMaterial;
    if (maybeStandard.emissive) {
      maybeStandard.emissive = new THREE.Color('#ffb300');
      maybeStandard.emissiveIntensity = 0.35;
      maybeStandard.roughness = Math.min(maybeStandard.roughness ?? 0.5, 0.38);
      maybeStandard.metalness = Math.max(maybeStandard.metalness ?? 0.2, 0.45);
    }
    return clone;
  };

  return Array.isArray(material) ? material.map(tune) : tune(material);
}

function CoinLayer({ source, coins }: { source: InstancedModelSource; coins: CoinData[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const itemMatrix = useRef(new THREE.Matrix4());
  const finalMatrix = useRef(new THREE.Matrix4());
  const position = useRef(new THREE.Vector3());
  const quaternion = useRef(new THREE.Quaternion());
  const scale = useRef(new THREE.Vector3(1, 1, 1));

  const writeMatrices = (time: number, computeBounds = false) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < coins.length; i++) {
      const coin = coins[i];
      const phase = hashUnit(coin.id) * Math.PI * 2;
      const spin = time * 4.2 + phase;
      const y = 0.9 + Math.sin(time * 3 + phase) * 0.08;

      position.current.set(LANE_POSITIONS[coin.lane + 1], y, coin.z);
      quaternion.current.setFromAxisAngle(Y_AXIS, spin);
      itemMatrix.current.compose(position.current, quaternion.current, scale.current);
      finalMatrix.current.multiplyMatrices(itemMatrix.current, source.matrix);
      mesh.setMatrixAt(i, finalMatrix.current);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (computeBounds) mesh.computeBoundingSphere();
  };

  useLayoutEffect(() => {
    if (meshRef.current) meshRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    writeMatrices(0, true);
  }, [coins, source]);

  useFrame(({ clock }) => {
    writeMatrices(clock.elapsedTime);
  });

  if (coins.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[source.geometry, source.material, coins.length]}
      frustumCulled={true}
      dispose={null}
    />
  );
}

export default function Coins() {
  const groupRef = useRef<THREE.Group>(null!);
  const chunks = useGameStore(s => s.chunks);
  const collectedCoinIds = useGameStore(s => s.collectedCoinIds);
  const sources = useInstancedModelSources(COIN_URL, TARGET_COIN_SIZE, { centerXZ: true });
  const readableSources = useMemo(
    () => sources.map(source => ({ ...source, material: boostCoinMaterial(source.material) })),
    [sources]
  );

  useFrame(() => {
    if (groupRef.current) groupRef.current.position.z = worldZRef.current;
  });

  const visibleCoins = useMemo(
    () => chunks.flatMap(c => c.coins).filter(coin => !collectedCoinIds.has(coin.id)),
    [chunks, collectedCoinIds]
  );

  return (
    <group ref={groupRef}>
      {readableSources.map(source => (
        <CoinLayer key={`${source.key}:${visibleCoins.length}`} source={source} coins={visibleCoins} />
      ))}
    </group>
  );
}
