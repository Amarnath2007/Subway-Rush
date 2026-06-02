import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, jumpYRef } from '../../store/gameStore';

function MagnetTrail() {
  const points = useMemo(() => {
    const p = [];
    for (let i = 0; i < 20; i++) {
        p.push(new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5
        ));
    }
    return p;
  }, []);

  const ref = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y += 0.05;
    ref.current.rotation.z += 0.03;
  });

  return (
    <group ref={ref}>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.06]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function JetpackFlames() {
    const ref = useRef<THREE.Group>(null!);
    useFrame((state) => {
        if (!ref.current) return;
        ref.current.scale.y = 0.8 + Math.random() * 0.4;
    });
    return (
        <group ref={ref} position={[0, -0.8, 0]}>
            <mesh position={[-0.25, 0, 0]}>
                <cylinderGeometry args={[0.05, 0.2, 0.8, 8]} />
                <meshBasicMaterial color="#ef4444" />
            </mesh>
            <mesh position={[0.25, 0, 0]}>
                <cylinderGeometry args={[0.05, 0.2, 0.8, 8]} />
                <meshBasicMaterial color="#ef4444" />
            </mesh>
        </group>
    );
}

export default function PowerupEffects() {
  const activePowerups = useGameStore(s => s.activePowerups);
  const playerLane = useGameStore(s => s.playerLane);
  const targetLane = useGameStore(s => s.targetLane);
  
  // We need to follow the player. 
  // In our architecture, the world moves, player stays at Z=0.
  // We can just render this at the player's world position.

  const groupRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (!groupRef.current) return;
    // Follow player X and Y loosely or directly
    // For simplicity, let's just use the store lanes
    const targetX = targetLane * 3.0; 
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.2);
    groupRef.current.position.y = jumpYRef.current + 1.0;
  });

  return (
    <group ref={groupRef}>
      {activePowerups.has('magnet') && <MagnetTrail />}
      {activePowerups.has('jetpack') && <JetpackFlames />}
      
      {activePowerups.has('sneakers') && (
        <mesh position={[0, -0.9, 0]}>
          <ringGeometry args={[0.4, 0.5, 32]} />
          <meshBasicMaterial color="#10b981" side={THREE.DoubleSide} transparent opacity={0.5} />
        </mesh>
      )}

      {activePowerups.has('multiplier') && (
        <group position={[0, 1.2, 0]}>
            <mesh>
                <sphereGeometry args={[0.2]} />
                <meshBasicMaterial color="#f59e0b" wireframe />
            </mesh>
        </group>
      )}
    </group>
  );
}
