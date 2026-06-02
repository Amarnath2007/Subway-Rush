import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { jumpYRef, playerXRef, useGameStore } from '../../store/gameStore';

function MagnetTrail() {
  const points = useMemo(() => {
    const p = [];
    for (let i = 0; i < 28; i++) {
        p.push(new THREE.Vector3(
            (Math.random() - 0.5) * 5.6,
            (Math.random() - 0.5) * 3.4,
            (Math.random() - 0.5) * 4.8
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
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.25, 0.035, 10, 64]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.65, 0.025, 10, 48]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.06]} />
          <meshBasicMaterial color={i % 2 ? '#38bdf8' : '#bfdbfe'} transparent opacity={0.65} />
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
        <group ref={ref} position={[0, -0.85, 0.18]}>
            <mesh position={[-0.25, 0, 0]}>
                <cylinderGeometry args={[0.05, 0.2, 0.8, 8]} />
                <meshBasicMaterial color="#fb7185" transparent opacity={0.9} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh position={[0.25, 0, 0]}>
                <cylinderGeometry args={[0.05, 0.2, 0.8, 8]} />
                <meshBasicMaterial color="#f97316" transparent opacity={0.9} blending={THREE.AdditiveBlending} />
            </mesh>
            <pointLight color="#fb7185" intensity={1.4} distance={4} />
        </group>
    );
}

function SneakersFootGlow() {
  const ref = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 10) * 0.08;
    ref.current.scale.setScalar(pulse);
  });

  return (
    <group ref={ref} position={[0, -0.86, 0]}>
      {[-0.27, 0.27].map(x => (
        <mesh key={x} position={[x, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.26, 0.43, 32]} />
          <meshBasicMaterial color="#34d399" side={THREE.DoubleSide} transparent opacity={0.62} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      <pointLight color="#34d399" intensity={0.9} distance={3} />
    </group>
  );
}

function MultiplierAura() {
  const ref = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.y += 0.045;
  });

  return (
    <group ref={ref} position={[0, 1.2, 0]}>
      <mesh>
        <torusKnotGeometry args={[0.34, 0.045, 72, 8]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.78} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.18, 12, 10]} />
        <meshBasicMaterial color="#fde68a" transparent opacity={0.42} />
      </mesh>
    </group>
  );
}

export default function PowerupEffects() {
  const activePowerups = useGameStore(s => s.activePowerups);
  
  // We need to follow the player. 
  // In our architecture, the world moves, player stays at Z=0.
  // We can just render this at the player's world position.

  const groupRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, playerXRef.current, 0.24);
    groupRef.current.position.y = jumpYRef.current + 1.0;
  });

  return (
    <group ref={groupRef}>
      {activePowerups.has('magnet') && <MagnetTrail />}
      {activePowerups.has('jetpack') && <JetpackFlames />}
      
      {activePowerups.has('sneakers') && <SneakersFootGlow />}
      {activePowerups.has('multiplier') && <MultiplierAura />}
    </group>
  );
}
