import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, worldZRef } from '../../store/gameStore';
import { CHUNK_LENGTH, TARGET_BUILDING_HEIGHT, TARGET_TREE_HEIGHT } from '../../config/constants';
import { EnvProp } from '../../types/game';
import { InstancedModelBatch, InstancedModelItem } from './InstancedModel';

const BUILDING_URL = '/assets/Environment/cartoon_building2.glb';
const TREE_URL = '/assets/Environment/stylized_tree.glb';

useGLTF.preload(BUILDING_URL);
useGLTF.preload(TREE_URL);

const BUILDING_COLORS = [
  '#e57373', '#f06292', '#ba68c8', '#64b5f6', '#4dd0e1',
  '#81c784', '#ffd54f', '#ff8a65', '#a1887f', '#90a4ae',
];

function hashUnit(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function toTreeItem(prop: EnvProp): InstancedModelItem {
  const seed = hashUnit(prop.id);
  return {
    id: prop.id,
    position: [prop.x, 0, prop.z],
    rotationY: seed * Math.PI * 2,
    scale: 0.86 + seed * 0.28,
  };
}

function toBuildingItem(prop: EnvProp): InstancedModelItem {
  const seed = hashUnit(`${prop.id}:${prop.type}`);
  return {
    id: prop.id,
    position: [prop.x, 0, prop.z],
    rotationY: prop.side === 'left' ? Math.PI * 0.5 : -Math.PI * 0.5,
    scale: (prop.type === 'building2' ? 1.12 : 0.82) + seed * 0.18,
  };
}

function getBuildingColor(x: number, z: number): string {
  const idx = Math.abs(Math.round(x * 7 + z * 3)) % BUILDING_COLORS.length;
  return BUILDING_COLORS[idx];
}

function StaticInstances({
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

function OverheadWires({ chunkFronts }: { chunkFronts: number[] }) {
  const poleGeo = useMemo(() => new THREE.CylinderGeometry(0.07, 0.09, 4.4, 8), []);
  const crossGeo = useMemo(() => new THREE.BoxGeometry(13.5, 0.08, 0.06), []);
  const insulatorGeo = useMemo(() => new THREE.SphereGeometry(0.07, 8, 8), []);
  const poleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#37474f', metalness: 0.35, roughness: 0.55 }), []);
  const crossMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#546e7a', metalness: 0.35, roughness: 0.45 }), []);
  const insulatorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e0e0e0', roughness: 0.4 }), []);

  const matrices = useMemo(() => {
    const poles: THREE.Matrix4[] = [];
    const crosses: THREE.Matrix4[] = [];
    const insulators: THREE.Matrix4[] = [];
    const unit = new THREE.Vector3(1, 1, 1);
    const quat = new THREE.Quaternion();

    const compose = (x: number, y: number, z: number) =>
      new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), quat, unit);

    for (const frontZ of chunkFronts) {
      for (const z of [frontZ - CHUNK_LENGTH * 0.28, frontZ - CHUNK_LENGTH * 0.72]) {
        poles.push(compose(-6.6, 2.2, z));
        poles.push(compose(6.6, 2.2, z));
        crosses.push(compose(0, 4.4, z));
        for (const x of [-3.5, 0, 3.5]) {
          insulators.push(compose(x, 4.38, z));
        }
      }
    }

    return { poles, crosses, insulators };
  }, [chunkFronts]);

  return (
    <>
      <StaticInstances geometry={poleGeo} material={poleMat} matrices={matrices.poles} />
      <StaticInstances geometry={crossGeo} material={crossMat} matrices={matrices.crosses} />
      <StaticInstances geometry={insulatorGeo} material={insulatorMat} matrices={matrices.insulators} />
    </>
  );
}

function DistantSkyline() {
  return (
    <group position={[0, 0, -120]}>
      {[-28, -20, -14, -6, 0, 6, 14, 20, 28].map((x, i) => {
        const h = 10 + Math.abs(Math.sin(i * 1.7)) * 18;
        return (
          <mesh key={i} position={[x, h / 2, 0]}>
            <boxGeometry args={[4.5, h, 2]} />
            <meshStandardMaterial color={getBuildingColor(x, i * 7)} roughness={0.85} metalness={0.05} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function Environment() {
  const groupRef = useRef<THREE.Group>(null!);
  const chunks = useGameStore(s => s.chunks);

  useFrame(() => {
    if (groupRef.current) groupRef.current.position.z = worldZRef.current;
  });

  const envPropChunks = useMemo(() => chunks.map(c => c.envProps), [chunks]);
  const chunkFronts = useMemo(() => chunks.map(c => c.z), [chunks]);
  const allProps = useMemo(() => envPropChunks.flat(), [envPropChunks]);
  const treeItems = useMemo(
    () => allProps.filter(prop => prop.type === 'tree').map(toTreeItem),
    [allProps]
  );
  const buildingItems = useMemo(
    () => allProps.filter(prop => prop.type !== 'tree').map(toBuildingItem),
    [allProps]
  );

  return (
    <>
      <Sky sunPosition={[80, 25, 60]} turbidity={4} rayleigh={0.6} mieCoefficient={0.004} mieDirectionalG={0.85} />
      <Stars radius={120} depth={40} count={420} factor={2.4} saturation={0} fade />

      <DistantSkyline />

      <group ref={groupRef}>
        <InstancedModelBatch url={TREE_URL} targetHeight={TARGET_TREE_HEIGHT} items={treeItems} />
        <InstancedModelBatch url={BUILDING_URL} targetHeight={TARGET_BUILDING_HEIGHT} items={buildingItems} />
        <OverheadWires chunkFronts={chunkFronts} />
      </group>
    </>
  );
}
