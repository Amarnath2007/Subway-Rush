import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, worldZRef } from '../../store/gameStore';
import { POWERUP_PICKUP_Y, TARGET_POWERUP_HEIGHT } from '../../config/constants';
import { PowerupType } from '../../types/game';
import { applyMeshRenderOptions, computeNormalizedTransform } from '../../utils/normalizeModel';

const POWERUP_MODELS: Record<PowerupType, string> = {
  magnet: '/assets/power ups/u_magnet.glb',
  sneakers: '/assets/power ups/sneakers.glb',
  multiplier: '/assets/power ups/2x_multiplier.glb',
  jetpack: '/assets/power ups/jetpack_-_subway_surfers.glb',
};

Object.values(POWERUP_MODELS).forEach(url => useGLTF.preload(url));

function getPowerupColor(type: PowerupType): string {
  switch (type) {
    case 'magnet': return '#38bdf8';
    case 'sneakers': return '#34d399';
    case 'multiplier': return '#fbbf24';
    case 'jetpack': return '#fb7185';
    default: return '#fff';
  }
}

function clonePowerupScene(scene: THREE.Group, type: PowerupType, color: string): THREE.Group {
  const clone = scene.clone(true);
  const targetHeight = type === 'jetpack' ? TARGET_POWERUP_HEIGHT * 1.35 : TARGET_POWERUP_HEIGHT;
  const { scale, position } = computeNormalizedTransform(clone, targetHeight, { centerXZ: true });
  clone.scale.setScalar(scale);
  clone.position.copy(position);

  clone.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;

    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(material => material.clone())
      : mesh.material.clone();

    const tune = (material: THREE.Material) => {
      const standard = material as THREE.MeshStandardMaterial;
      if (standard.emissive) {
        standard.emissive = new THREE.Color(color);
        standard.emissiveIntensity = type === 'jetpack' ? 0.32 : 0.2;
        standard.roughness = Math.min(standard.roughness ?? 0.5, 0.45);
      }
    };

    if (Array.isArray(mesh.material)) mesh.material.forEach(tune);
    else tune(mesh.material);
  });

  applyMeshRenderOptions(clone, { castShadow: false, receiveShadow: false, frustumCulled: false });
  return clone;
}

function PowerupPickup({ type, position }: { type: PowerupType, position: [number, number, number] }) {
  const meshRef = useRef<THREE.Group>(null!);
  const { scene } = useGLTF(POWERUP_MODELS[type]);
  const color = getPowerupColor(type);

  const model = useMemo(
    () => clonePowerupScene(scene, type, color),
    [scene, type, color]
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += 0.04;
    meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2.5) * 0.15;
  });

  return (
    <group ref={meshRef} position={position}>
      <mesh>
        <sphereGeometry args={[0.78, 20, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <primitive object={model} />
      <pointLight color={color} intensity={1.6} distance={4.2} />
    </group>
  );
}

export default function Powerups() {
  const chunks = useGameStore(s => s.chunks);
  const collectedPowerupIds = useGameStore(s => s.collectedPowerupIds);
  const powerups = useMemo(
    () => chunks.flatMap(c => c.powerups).filter(pw => !collectedPowerupIds.has(pw.id)),
    [chunks, collectedPowerupIds]
  );

  const groupRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (groupRef.current) groupRef.current.position.z = worldZRef.current;
  });

  return (
    <group ref={groupRef}>
      {powerups.map(pw => (
        <PowerupPickup
          key={pw.id}
          type={pw.type}
          position={[pw.lane * 3.0, POWERUP_PICKUP_Y, pw.z]}
        />
      ))}
    </group>
  );
}
