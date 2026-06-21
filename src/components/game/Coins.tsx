import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { jumpYRef, playerXRef, useGameStore, worldZRef } from '../../store/gameStore';
import { GROUND_COIN_Y, LANE_POSITIONS, MAGNET_RADIUS, TARGET_COIN_SIZE } from '../../config/constants';
import { CoinData } from '../../types/game';
import { InstancedModelSource, useInstancedModelSources } from './InstancedModel';
import { qualityManager } from '../../utils/qualityManager';

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

function getCoinX(coin: CoinData): number {
  return LANE_POSITIONS[coin.lane + 1] + (coin.xOffset ?? 0);
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
    const state = useGameStore.getState();
    const quality = qualityManager.settings;
    const isMagnetActive = state.activePowerups.has('magnet');
    const magnetTargetX = playerXRef.current;
    const magnetTargetY = jumpYRef.current + 0.85;
    const worldZ = worldZRef.current;

    // Limit the number of coins we animate to save CPU/GPU on mobile
    const displayCount = Math.min(coins.length, quality.maxCoinAnimations);
    mesh.count = displayCount;

    for (let i = 0; i < displayCount; i++) {
      const coin = coins[i];
      const phase = hashUnit(coin.id) * Math.PI * 2;
      const spin = time * 4.2 + phase;
      const baseY = coin.y ?? GROUND_COIN_Y;
      let x = getCoinX(coin);
      let y = baseY + Math.sin(time * 3 + phase) * 0.08;
      let z = coin.z;

      // Only perform expensive magnet math if magnet is active
      if (isMagnetActive) {
        const coinWorldZ = coin.z + worldZ;
        const dx = x - magnetTargetX;
        const dy = baseY - magnetTargetY;
        const dz = coinWorldZ;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < MAGNET_RADIUS * MAGNET_RADIUS) {
          const dist = Math.sqrt(distSq);
          const pull = Math.pow(1 - dist / MAGNET_RADIUS, 1.7) * 0.92;
          x = THREE.MathUtils.lerp(x, magnetTargetX, pull);
          y = THREE.MathUtils.lerp(y, magnetTargetY, pull);
          z = THREE.MathUtils.lerp(z, -worldZ, pull);
        }
      }

      position.current.set(x, y, z);
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
    // Only update matrices if there are coins to show
    if (coins.length > 0) {
      writeMatrices(clock.elapsedTime);
    }
  });

  if (coins.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[source.geometry, source.material, qualityManager.settings.maxCoinAnimations]}
      frustumCulled={true}
      dispose={null}
    />
  );
}

export default function Coins() {
  const groupRef = useRef<THREE.Group>(null!);
  const chunks = useGameStore(s => s.chunks);
  const collectedCoinIds = useGameStore(s => s.collectedCoinIds);
  const isJetpackActive = useGameStore(s => s.isJetpackActive);
  const sources = useInstancedModelSources(COIN_URL, TARGET_COIN_SIZE, { centerXZ: true });
  const readableSources = useMemo(
    () => sources.map(source => ({ ...source, material: boostCoinMaterial(source.material) })),
    [sources]
  );
  
  const quality = qualityManager.settings;

  useFrame(() => {
    if (groupRef.current) groupRef.current.position.z = worldZRef.current;
  });

  const visibleCoins = useMemo(
    () => {
      const all = chunks
        .flatMap(c => c.coins)
        .filter(coin => !collectedCoinIds.has(coin.id))
        .filter(coin => coin.kind !== 'aerial' || isJetpackActive);
      
      // Sort by Z to ensure we animate and show the closest coins first
      return all.sort((a, b) => b.z - a.z).slice(0, quality.maxCoinAnimations + 10);
    },
    [chunks, collectedCoinIds, isJetpackActive, quality.maxCoinAnimations]
  );

  return (
    <group ref={groupRef}>
      {readableSources.map(source => (
        <CoinLayer key={`${source.key}`} source={source} coins={visibleCoins} />
      ))}
    </group>
  );
}
