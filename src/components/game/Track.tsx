import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CHUNK_LENGTH, CHUNKS_AHEAD, CHUNKS_BEHIND, LANE_POSITIONS } from '../../config/constants';
import { useGameStore, worldZRef } from '../../store/gameStore';

const TRACK_WIDTH = 10.5;
const SIDEWALK_WIDTH = 2.4;
const SIDEWALK_X = TRACK_WIDTH / 2 + SIDEWALK_WIDTH / 2;
const SLEEPER_SPACING = 1.45;
const SLEEPERS_PER_CHUNK = Math.ceil(CHUNK_LENGTH / SLEEPER_SPACING);

const PREVIEW_ZS = Array.from(
  { length: CHUNKS_AHEAD + CHUNKS_BEHIND + 1 },
  (_, i) => -(i - CHUNKS_BEHIND) * CHUNK_LENGTH
);

function makeMatrix(x: number, y: number, z: number, scale: THREE.Vector3): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion(),
    scale
  );
}

function TrackInstances({
  geometry,
  material,
  matrices,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrices: THREE.Matrix4[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrices]);

  if (matrices.length === 0) return null;

  return (
    <instancedMesh
      key={matrices.length}
      ref={ref}
      args={[geometry, material, matrices.length]}
      frustumCulled={false}
      dispose={null}
    />
  );
}

export default function Track() {
  const groupRef = useRef<THREE.Group>(null!);
  const chunks = useGameStore(s => s.chunks);
  const chunkZs = chunks.length > 0 ? chunks.map(chunk => chunk.z) : PREVIEW_ZS;

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.z = chunks.length > 0 ? worldZRef.current : 0;
    }
  });

  const ballastGeo = useMemo(() => new THREE.BoxGeometry(TRACK_WIDTH, 0.1, CHUNK_LENGTH), []);
  const sidewalkGeo = useMemo(() => new THREE.BoxGeometry(SIDEWALK_WIDTH, 0.2, CHUNK_LENGTH), []);
  const railGeo = useMemo(() => new THREE.BoxGeometry(0.15, 0.1, CHUNK_LENGTH), []);
  const sleeperGeo = useMemo(() => new THREE.BoxGeometry(1.5, 0.05, 0.3), []);

  const ballastMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#424242', roughness: 0.9 }), []);
  const sidewalkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#757575', roughness: 0.7 }), []);
  const railMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9e9e9e', metalness: 0.75, roughness: 0.25 }), []);
  const sleeperMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5d4037', roughness: 0.9 }), []);

  const matrices = useMemo(() => {
    const unit = new THREE.Vector3(1, 1, 1);
    const ballast: THREE.Matrix4[] = [];
    const sidewalks: THREE.Matrix4[] = [];
    const rails: THREE.Matrix4[] = [];
    const sleepers: THREE.Matrix4[] = [];

    for (const frontZ of chunkZs) {
      const centerZ = frontZ - CHUNK_LENGTH / 2;
      ballast.push(makeMatrix(0, -0.05, centerZ, unit));
      sidewalks.push(makeMatrix(-SIDEWALK_X, 0.05, centerZ, unit));
      sidewalks.push(makeMatrix(SIDEWALK_X, 0.05, centerZ, unit));

      for (const laneX of LANE_POSITIONS) {
        rails.push(makeMatrix(laneX - 0.6, 0.06, centerZ, unit));
        rails.push(makeMatrix(laneX + 0.6, 0.06, centerZ, unit));

        for (let i = 0; i < SLEEPERS_PER_CHUNK; i++) {
          const z = frontZ - i * SLEEPER_SPACING - SLEEPER_SPACING * 0.35;
          sleepers.push(makeMatrix(laneX, 0.02, z, unit));
        }
      }
    }

    return { ballast, sidewalks, rails, sleepers };
  }, [chunkZs]);

  return (
    <group ref={groupRef}>
      <TrackInstances geometry={ballastGeo} material={ballastMat} matrices={matrices.ballast} />
      <TrackInstances geometry={sidewalkGeo} material={sidewalkMat} matrices={matrices.sidewalks} />
      <TrackInstances geometry={railGeo} material={railMat} matrices={matrices.rails} />
      <TrackInstances geometry={sleeperGeo} material={sleeperMat} matrices={matrices.sleepers} />
    </group>
  );
}
