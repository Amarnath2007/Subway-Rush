import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { jumpYRef, playerXRef, useGameStore } from '../../store/gameStore';

function MagnetEffect() {
  const ringRef = useRef<THREE.Mesh>(null!);
  const particles = useMemo(() => Array.from({ length: 8 }, () => ({
    speed: 1.5 + Math.random(),
    offset: Math.random() * Math.PI * 2
  })), []);
  const particleRefs = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = clock.elapsedTime * 2.5; // Smooth spin
    }

    particles.forEach((p, i) => {
      const mesh = particleRefs.current[i];
      if (!mesh) return;
      const t = clock.elapsedTime * p.speed + p.offset;
      mesh.position.set(
        Math.cos(t) * 1.3,
        Math.sin(t * 0.5) * 0.2 - 0.2, // Swirling slightly below/above the hip
        Math.sin(t) * 1.3
      );
      mesh.scale.setScalar(0.4 + Math.sin(t * 3) * 0.15);
    });
  });

  return (
    <group position={[0, -0.2, 0]}> {/* Adjusted to sit at hip height */}
      {/* Single Horizontal Golden Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.35, 0.025, 8, 48]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.45} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Subtle Sparkles clinging to the orbit */}
      {particles.map((p, i) => (
        <mesh key={i} ref={el => particleRefs.current[i] = el!}>
          <sphereGeometry args={[0.07, 6, 6]} />
          <meshBasicMaterial color="#fcd34d" transparent opacity={0.7} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

function JetpackTrail() {
  const ref = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.scale.y = 0.8 + Math.random() * 0.4;
  });
  return (
    <group ref={ref} position={[0, -0.85, 0.18]}>
      <mesh position={[-0.25, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.18, 0.8, 8]} />
        <meshBasicMaterial color="#fb7185" transparent opacity={0.85} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0.25, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.18, 0.8, 8]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.85} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight color="#fb7185" intensity={1.5} distance={4} />
    </group>
  );
}

function SneakersEffect() {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((c, i) => {
      const pulse = 0.8 + Math.sin(clock.elapsedTime * 8 + i) * 0.2;
      c.scale.setScalar(pulse);
    });
  });

  return (
    <group ref={ref} position={[0, -0.95, 0]}>
      {[-0.3, 0.3].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.4, 16]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.25} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

function MultiplierEffect() {
  const particles = useMemo(() => Array.from({ length: 15 }, () => ({
    pos: new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 2, (Math.random() - 0.5) * 1.5),
    speed: 0.5 + Math.random()
  })), []);
  const refs = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }) => {
    particles.forEach((p, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;
      mesh.position.y = (p.pos.y + clock.elapsedTime * p.speed) % 2.5;
      mesh.scale.setScalar(0.5 + Math.sin(clock.elapsedTime * 5 + i) * 0.5);

      // Type-safe material opacity modification
      const material = mesh.material as THREE.MeshBasicMaterial;
      if (material) {
        material.opacity = 0.3 + Math.sin(clock.elapsedTime * 4 + i) * 0.3;
      }
    });
  });

  return (
    <group position={[0, -0.5, 0]}>
      {particles.map((p, i) => (
        <mesh key={i} ref={el => refs.current[i] = el!} position={[p.pos.x, 0, p.pos.z]}>
          <sphereGeometry args={[0.07, 6, 6]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.5} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

export default function PowerupEffects() {
  const activePowerups = useGameStore(s => s.activePowerups);
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.x = playerXRef.current;
    groupRef.current.position.y = jumpYRef.current + 1.0;
  });

  return (
    <group ref={groupRef}>
      {activePowerups.has('magnet') && <MagnetEffect />}
      {activePowerups.has('jetpack') && <JetpackTrail />}
      {activePowerups.has('sneakers') && <SneakersEffect />}
      {activePowerups.has('multiplier') && <MultiplierEffect />}
    </group>
  );
}
