import { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, worldZRef } from '../../store/gameStore';
import { PowerupData, PowerupType } from '../../types/game';

function PowerupPickup({ type, position }: { type: PowerupType, position: [number, number, number] }) {
  const meshRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += 0.04;
    meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2.5) * 0.15;
  });

  const color = useMemo(() => {
    switch (type) {
      case 'magnet': return '#3b82f6';
      case 'sneakers': return '#10b981';
      case 'multiplier': return '#f59e0b';
      case 'jetpack': return '#ef4444';
      default: return '#fff';
    }
  }, [type]);

  return (
    <group ref={meshRef} position={position}>
      {/* Glow */}
      <mesh>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial color={color} transparent opacity={0.3} emissive={color} emissiveIntensity={2} />
      </mesh>
      
      {/* Icon Shape */}
      {type === 'magnet' && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.12, 12, 24]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
        </mesh>
      )}
      
      {type === 'sneakers' && (
        <mesh>
          <boxGeometry args={[0.4, 0.25, 0.6]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
        </mesh>
      )}

      {type === 'multiplier' && (
        <mesh>
          <octahedronGeometry args={[0.4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
        </mesh>
      )}

      {type === 'jetpack' && (
        <mesh>
          <cylinderGeometry args={[0.15, 0.2, 0.7, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
        </mesh>
      )}

      <pointLight color={color} intensity={1.5} distance={4} />
    </group>
  );
}

export default function Powerups() {
  const chunks = useGameStore(s => s.chunks);
  const powerups = useMemo(() => chunks.flatMap(c => c.powerups), [chunks]);

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
          position={[pw.lane * 3.0, 0.9, pw.z]}
        />
      ))}
    </group>
  );
}
