import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';
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
  colors,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrices: THREE.Matrix4[];
  colors?: THREE.Color[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    
    if (colors && colors.length === matrices.length) {
      colors.forEach((color, index) => mesh.setColorAt(index, color));
      mesh.instanceColor!.needsUpdate = true;
    }
    
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrices, colors]);

  if (matrices.length === 0) return null;

  return (
    <instancedMesh
      key={matrices.length}
      ref={ref}
      args={[geometry, material, matrices.length]}
      frustumCulled={true}
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

  const envProps = useMemo(() => chunks.flatMap(c => c.envProps), [chunks]);
  const chunkFronts = useMemo(() => chunks.map(c => c.z), [chunks]);

  const treeItems = useMemo(() => envProps.filter(p => p.type === 'tree').map(toTreeItem), [envProps]);
  const buildingItems = useMemo(() => envProps.filter(p => p.type === 'building1' || p.type === 'building2').map(toBuildingItem), [envProps]);

  // Procedural props
  const fenceGeo = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.1, 0.8, 10);
    geo.translate(0, 0.4, 0);
    return geo;
  }, []);
  const fenceMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#555', roughness: 0.8 }), []);
  const fenceMatrices = useMemo(() => envProps.filter(p => p.type === 'fence').map(p => {
    const m = new THREE.Matrix4();
    m.compose(new THREE.Vector3(p.x, 0, p.z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    return m;
  }), [envProps]);

  const streetlightGeo = useMemo(() => {
    const poleFinal = new THREE.CylinderGeometry(0.08, 0.1, 4.5, 8);
    poleFinal.translate(0, 2.25, 0);
    const lampFinal = new THREE.BoxGeometry(0.6, 0.15, 0.3);
    lampFinal.translate(0.3, 4.5, 0);
    
    return mergeBufferGeometries([poleFinal, lampFinal]);
  }, []);
  const streetlightMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#444', roughness: 0.5 }), []);
  const streetlightMatrices = useMemo(() => envProps.filter(p => p.type === 'streetlight').map(p => {
    const m = new THREE.Matrix4();
    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.side === 'left' ? Math.PI : 0);
    m.compose(new THREE.Vector3(p.x, 0, p.z), rot, new THREE.Vector3(1, 1, 1));
    return m;
  }), [envProps]);

  const grassGeo = useMemo(() => new THREE.PlaneGeometry(2.5, CHUNK_LENGTH), []);
  const grassMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 1.0 }), []);
  const grassMatrices = useMemo(() => envProps.filter(p => p.type === 'grass').map(p => {
    const m = new THREE.Matrix4();
    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    m.compose(new THREE.Vector3(p.x, 0.01, p.z), rot, new THREE.Vector3(1, 1, 1));
    return m;
  }), [envProps]);

  const benchGeo = useMemo(() => {
    const seat = new THREE.BoxGeometry(1.2, 0.1, 0.5);
    seat.translate(0, 0.45, 0);
    const back = new THREE.BoxGeometry(1.2, 0.5, 0.1);
    back.translate(0, 0.7, -0.25);
    return mergeBufferGeometries([seat, back]);
  }, []);
  const benchMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5d4037', roughness: 0.9 }), []);
  const benchMatrices = useMemo(() => envProps.filter(p => p.type === 'bench').map(p => {
    const m = new THREE.Matrix4();
    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.side === 'left' ? Math.PI / 2 : -Math.PI / 2);
    m.compose(new THREE.Vector3(p.x, 0, p.z), rot, new THREE.Vector3(1, 1, 1));
    return m;
  }), [envProps]);

  return (
    <>
      <Sky sunPosition={[80, 25, 60]} turbidity={4} rayleigh={0.6} mieCoefficient={0.004} mieDirectionalG={0.85} />
      <Stars radius={120} depth={40} count={420} factor={2.4} saturation={0} fade />

      <DistantSkyline />

      <group ref={groupRef}>
        <InstancedModelBatch url={TREE_URL} targetHeight={TARGET_TREE_HEIGHT} items={treeItems} />
        <InstancedModelBatch url={BUILDING_URL} targetHeight={TARGET_BUILDING_HEIGHT} items={buildingItems} />
        <OverheadWires chunkFronts={chunkFronts} />
        
        {/* New V2 Procedural Props */}
        <StaticInstances geometry={fenceGeo} material={fenceMat} matrices={fenceMatrices} />
        <StaticInstances geometry={streetlightGeo} material={streetlightMat} matrices={streetlightMatrices} />
        <StaticInstances geometry={grassGeo} material={grassMat} matrices={grassMatrices} />
        <StaticInstances geometry={benchGeo} material={benchMat} matrices={benchMatrices} />
      </group>
    </>
  );
}


