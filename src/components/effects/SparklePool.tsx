import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

const MAX_PARTICLES = 96;

export default function SparklePool() {
  const particlesRef = useRef<Particle[]>([]);
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const prevCoins = useRef(0);
  const matrix = useRef(new THREE.Matrix4());
  const position = useRef(new THREE.Vector3());
  const quaternion = useRef(new THREE.Quaternion());
  const scale = useRef(new THREE.Vector3());
  const geometry = useMemo(() => new THREE.SphereGeometry(0.07, 6, 6), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd700' }), []);

  useLayoutEffect(() => {
    if (meshRef.current) meshRef.current.count = 0;
  }, []);

  useFrame((_, delta) => {
    const coins = useGameStore.getState().coins;

    if (coins > prevCoins.current) {
      const burstCount = Math.min((coins - prevCoins.current) * 8, 24);
      for (let i = 0; i < burstCount && particlesRef.current.length < MAX_PARTICLES; i++) {
        particlesRef.current.push({
          pos: new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.85 + Math.random() * 0.4, 0),
          vel: new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 3, (Math.random() - 0.5) * 2),
          life: 0,
          maxLife: 0.35 + Math.random() * 0.25,
        });
      }
    }
    prevCoins.current = coins;

    const alive: Particle[] = [];
    for (const particle of particlesRef.current) {
      particle.life += delta;
      if (particle.life < particle.maxLife) {
        particle.pos.addScaledVector(particle.vel, delta);
        particle.vel.y -= 8 * delta;
        alive.push(particle);
      }
    }
    particlesRef.current = alive;

    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = alive.length;

    for (let i = 0; i < alive.length; i++) {
      const particle = alive[i];
      const t = particle.life / particle.maxLife;
      position.current.copy(particle.pos);
      scale.current.setScalar(Math.max(0.05, 1 - t * 0.8));
      matrix.current.compose(position.current, quaternion.current, scale.current);
      mesh.setMatrixAt(i, matrix.current);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_PARTICLES]}
      frustumCulled={false}
    />
  );
}
