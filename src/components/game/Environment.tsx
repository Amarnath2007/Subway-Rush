import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';
import { useGameStore, worldZRef } from '../../store/gameStore';
import { CHUNK_LENGTH, TARGET_BUILDING_HEIGHT, TARGET_TREE_HEIGHT } from '../../config/constants';
import { EnvProp } from '../../types/game';
import { InstancedModelBatch, InstancedModelItem } from './InstancedModel';
import { qualityManager } from '../../utils/qualityManager';

const BUILDING1_URL = '/assets/Environment/cartoon_building1.glb';
const BUILDING2_URL = '/assets/Environment/cartoon_building2.glb';
const BUILDING3_URL = '/assets/Environment/cartoon_building3.glb';
const TREE1_URL = '/assets/Environment/stylized_tree.glb';
const TREE2_URL = '/assets/Environment/tree2.glb';

useGLTF.preload(BUILDING1_URL);
useGLTF.preload(BUILDING2_URL);
useGLTF.preload(BUILDING3_URL);
useGLTF.preload(TREE1_URL);
useGLTF.preload(TREE2_URL);

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
    scale: 0.86 + seed * 0.45,
  };
}
function toBuildingItem(prop: EnvProp): InstancedModelItem {
  const seed = hashUnit(`${prop.id}:${prop.type}`);

  let rotationY: number;

  if (prop.type === 'building3') {
    rotationY = prop.side === 'left' ? 0 : 0;
  } else {
    rotationY = prop.side === 'left' ? Math.PI * 0.5 : -Math.PI * 0.5;
  }

  return {
    id: prop.id,
    position: [prop.x, 0, prop.z],
    rotationY,
    scale: (prop.type === 'building1' ? 0.95 : prop.type === 'building2' ? 1.15 : 1.35) + seed * 0.25,
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
  castShadow: castShadowProp = true,
  receiveShadow: receiveShadowProp = true,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrices: THREE.Matrix4[];
  colors?: THREE.Color[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const quality = qualityManager.settings;

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

  // On low quality, environment props don't cast shadows
  const shouldCastShadow = castShadowProp && quality.envPropCastShadow;
  const shouldReceiveShadow = receiveShadowProp && quality.enableShadows;

  return (
    <instancedMesh
      key={matrices.length}
      ref={ref}
      args={[geometry, material, matrices.length]}
      frustumCulled={true}
      dispose={null}
      castShadow={shouldCastShadow}
      receiveShadow={shouldReceiveShadow}
    />
  );
}

function OverheadWires({ chunkFronts }: { chunkFronts: number[] }) {
  const poleGeo = useMemo(() => new THREE.CylinderGeometry(0.07, 0.09, 4.4, 6), []);
  const crossGeo = useMemo(() => new THREE.BoxGeometry(13.5, 0.08, 0.06), []);
  const insulatorGeo = useMemo(() => new THREE.SphereGeometry(0.07, 6, 6), []);
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
      <StaticInstances geometry={poleGeo} material={poleMat} matrices={matrices.poles} castShadow={false} />
      <StaticInstances geometry={crossGeo} material={crossMat} matrices={matrices.crosses} castShadow={false} />
      <StaticInstances geometry={insulatorGeo} material={insulatorMat} matrices={matrices.insulators} castShadow={false} />
    </>
  );
}

function DistantSkyline() {
  return (
    <group position={[0, 0, -180]}>
      {/* City Fog/Atmosphere Plane */}
      <mesh position={[0, 20, -5]} rotation={[0, 0, 0]}>
        <planeGeometry args={[400, 200]} />
        <meshBasicMaterial color="#b3e5fc" transparent opacity={0.3} />
      </mesh>

      {/* Primary Skyline Layer */}
      <group position={[0, 0, 0]}>
        {[-140, -120, -100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100, 120, 140].map((x, i) => {
          const h = 15 + Math.abs(Math.sin(i * 1.7)) * 25;
          const w = 8 + (i * 3.7) % 6; // deterministic instead of Math.random()
          return (
            <mesh key={`b1-${i}`} position={[x, h / 2, 0]}>
              <boxGeometry args={[w, h, 8]} />
              <meshStandardMaterial color={getBuildingColor(x, i * 7)} roughness={0.9} metalness={0.05} />
            </mesh>
          );
        })}
      </group>

      {/* Further Skyline Layer */}
      <group position={[0, 0, -40]}>
        {[-180, -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180].map((x, i) => {
          const h = 40 + Math.abs(Math.cos(i * 2.1)) * 30;
          const w = 12 + (i * 2.3) % 8; // deterministic instead of Math.random()
          return (
            <mesh key={`b2-${i}`} position={[x, h / 2, 0]}>
              <boxGeometry args={[w, h, 10]} />
              <meshStandardMaterial color="#78909c" roughness={1.0} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function Clouds() {
  const cloudGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const cloudMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 }), []);

  // Reduce cloud count on mobile
  const cloudCount = qualityManager.isMobile ? 6 : 12;

  return (
    <group position={[0, 45, -120]}>
      {[...Array(cloudCount)].map((_, i) => {
        // Use deterministic positions instead of Math.random() for stable rendering
        const xBase = (i - cloudCount / 2) * 35;
        const xOffset = Math.sin(i * 2.7) * 15;
        const yBase = Math.abs(Math.cos(i * 1.3)) * 12;
        const zBase = -Math.abs(Math.sin(i * 0.8)) * 60;
        return (
          <group key={i} position={[xBase + xOffset, yBase, zBase]}>
            <mesh scale={[12, 5, 7]}>
              <primitive object={cloudGeo} />
              <primitive object={cloudMat} />
            </mesh>
            <mesh position={[5, -1, 3]} scale={[7, 3.5, 4.5]}>
              <primitive object={cloudGeo} />
              <primitive object={cloudMat} />
            </mesh>
            <mesh position={[-4, 1.5, -3]} scale={[8, 4, 6]}>
              <primitive object={cloudGeo} />
              <primitive object={cloudMat} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export default function Environment() {
  const groupRef = useRef<THREE.Group>(null!);
  const chunks = useGameStore(s => s.chunks);
  const quality = qualityManager.settings;

  useFrame(() => {
    if (groupRef.current) groupRef.current.position.z = worldZRef.current;
  });

  const envProps = useMemo(() => chunks.flatMap(c => c.envProps), [chunks]);
  const chunkFronts = useMemo(() => chunks.map(c => c.z), [chunks]);

  const tree1Items = useMemo(() => envProps.filter(p => p.type === 'tree1').map(toTreeItem), [envProps]);
  const tree2Items = useMemo(() => envProps.filter(p => p.type === 'tree2').map(toTreeItem), [envProps]);

  const building1Items = useMemo(() => envProps.filter(p => p.type === 'building1').map(toBuildingItem), [envProps]);
  const building2Items = useMemo(() => envProps.filter(p => p.type === 'building2').map(toBuildingItem), [envProps]);
  const building3Items = useMemo(() => envProps.filter(p => p.type === 'building3').map(toBuildingItem), [envProps]);

  // --- High-Quality Procedural Geometries (Scaled up for better presence) ---

  const fenceGeo = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.15, 1.2, 12.5);
    geo.translate(0, 0.6, 0);
    return geo;
  }, []);
  const fenceMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#455a64', roughness: 0.7 }), []);

  const streetlightGeo = useMemo(() => {
    const pole = new THREE.CylinderGeometry(0.12, 0.18, 7.5, 6);
    pole.translate(0, 3.75, 0);
    const lamp = new THREE.BoxGeometry(1.2, 0.3, 0.6);
    lamp.translate(0.6, 7.5, 0);
    return mergeBufferGeometries([pole, lamp]) ?? pole;
  }, []);

  const fancyStreetlightGeo = useMemo(() => {
    const pole = new THREE.CylinderGeometry(0.15, 0.22, 8.5, 6);
    pole.translate(0, 4.25, 0);
    const arm = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 6);
    arm.rotateZ(Math.PI / 2.5);
    arm.translate(0.8, 8.2, 0);
    const head = new THREE.BoxGeometry(1.0, 0.4, 0.8);
    head.translate(1.5, 8.4, 0);
    return mergeBufferGeometries([pole, arm, head]) ?? pole;
  }, []);

  const streetlightMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#37474f', roughness: 0.4, metalness: 0.3 }), []);

  const trashbinGeo = useMemo(() => {
    const body = new THREE.CylinderGeometry(0.4, 0.35, 1.3, 8);
    body.translate(0, 0.65, 0);
    const lid = new THREE.CylinderGeometry(0.45, 0.45, 0.15, 8);
    lid.translate(0, 1.3, 0);
    return mergeBufferGeometries([body, lid]) ?? body;
  }, []);
  const trashbinMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#546e7a', roughness: 0.6 }), []);

  const mailboxGeo = useMemo(() => {
    const post = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6);
    post.translate(0, 0.6, 0);
    const box = new THREE.BoxGeometry(0.7, 0.8, 1.0);
    box.translate(0, 1.6, 0);
    return mergeBufferGeometries([post, box]) ?? box;
  }, []);
  const mailboxMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d32f2f', roughness: 0.5 }), []);

  const planterGeo = useMemo(() => {
    const pot = new THREE.BoxGeometry(1.8, 1.0, 1.8);
    pot.translate(0, 0.5, 0);
    const dirt = new THREE.BoxGeometry(1.6, 0.2, 1.6);
    dirt.translate(0, 1.0, 0);
    return mergeBufferGeometries([pot, dirt]) ?? pot;
  }, []);
  const planterMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#795548', roughness: 0.8 }), []);

  const bushGeo = useMemo(() => {
    const segments = qualityManager.isMobile ? 6 : 8;
    const g1 = new THREE.SphereGeometry(0.85, segments, segments);
    g1.translate(0, 0.7, 0);
    const g2 = new THREE.SphereGeometry(0.7, segments, segments);
    g2.translate(0.6, 0.5, 0.3);
    const g3 = new THREE.SphereGeometry(0.75, segments, segments);
    g3.translate(-0.5, 0.6, -0.2);
    return mergeBufferGeometries([g1, g2, g3]) ?? g1;
  }, []);
  const bushLargeGeo = useMemo(() => {
    const segments = qualityManager.isMobile ? 6 : 8;
    const g1 = new THREE.SphereGeometry(1.3, segments, segments);
    g1.translate(0, 1.0, 0);
    const g2 = new THREE.SphereGeometry(0.9, segments, segments);
    g2.translate(0.8, 0.8, 0.5);
    const g3 = new THREE.SphereGeometry(1.0, segments, segments);
    g3.translate(-0.75, 0.9, -0.3);
    const g4 = new THREE.SphereGeometry(0.8, segments, segments);
    g4.translate(0.2, 1.6, -0.2);
    return mergeBufferGeometries([g1, g2, g3, g4]) ?? g1;
  }, []);
  const bushMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2e7d32', roughness: 1.0 }), []);

  const signboardGeo = useMemo(() => {
    const post = new THREE.BoxGeometry(0.15, 3.5, 0.15);
    post.translate(0, 1.75, 0);
    const board = new THREE.BoxGeometry(2.0, 1.3, 0.15);
    board.translate(0, 2.8, 0.15);
    return mergeBufferGeometries([post, board]) ?? post;
  }, []);
  const signboardMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#37474f', roughness: 0.4 }), []);

  const busStopGeo = useMemo(() => {
    const floor = new THREE.BoxGeometry(6.5, 0.15, 2.8);
    floor.translate(0, 0.075, 0);
    const p1 = new THREE.BoxGeometry(0.15, 3.8, 0.15); p1.translate(-3.1, 1.9, 1.3);
    const p2 = new THREE.BoxGeometry(0.15, 3.8, 0.15); p2.translate(3.1, 1.9, 1.3);
    const p3 = new THREE.BoxGeometry(0.15, 3.8, 0.15); p3.translate(-3.1, 1.9, -1.3);
    const p4 = new THREE.BoxGeometry(0.15, 3.8, 0.15); p4.translate(3.1, 1.9, -1.3);
    const roof = new THREE.BoxGeometry(6.8, 0.2, 3.0); roof.translate(0, 3.8, 0);
    const back = new THREE.BoxGeometry(6.2, 3.5, 0.08); back.translate(0, 1.8, -1.35);
    return mergeBufferGeometries([floor, p1, p2, p3, p4, roof, back]) ?? floor;
  }, []);
  const busStopMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#455a64', roughness: 0.3, metalness: 0.4 }), []);

  const benchGeo = useMemo(() => {
    const seat = new THREE.BoxGeometry(2.6, 0.15, 1.0);
    seat.translate(0, 0.7, 0);
    const back = new THREE.BoxGeometry(2.6, 0.9, 0.15);
    back.translate(0, 1.25, -0.5);
    const leg1 = new THREE.BoxGeometry(0.15, 0.7, 0.15); leg1.translate(-1.1, 0.35, 0.35);
    const leg2 = new THREE.BoxGeometry(0.15, 0.7, 0.15); leg2.translate(1.1, 0.35, 0.35);
    const leg3 = new THREE.BoxGeometry(0.15, 0.7, 0.15); leg3.translate(-1.1, 0.35, -0.35);
    const leg4 = new THREE.BoxGeometry(0.15, 0.7, 0.15); leg4.translate(1.1, 0.35, -0.35);
    return mergeBufferGeometries([seat, back, leg1, leg2, leg3, leg4]) ?? seat;
  }, []);
  const benchMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5d4037', roughness: 0.8 }), []);

  const grassGeo = useMemo(() => new THREE.PlaneGeometry(3.5, CHUNK_LENGTH), []);
  const grassMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#558b2f', roughness: 1.0 }), []);

  // --- Instance Matrices Memos ---

  const getMatrices = (type: string) => envProps.filter(p => p.type === type).map(p => {
    const m = new THREE.Matrix4();
    const rot = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0), 
      p.side === 'left' ? Math.PI : 0
    );
    // Special rotation for bench & bus stop to face the track
    if (type === 'bench' || type === 'bus_stop') {
      rot.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.side === 'left' ? Math.PI / 2 : -Math.PI / 2);
    }
    m.compose(new THREE.Vector3(p.x, 0, p.z), rot, new THREE.Vector3(1, 1, 1));
    return m;
  });

  const fenceMatrices = useMemo(() => getMatrices('fence'), [envProps]);
  const streetlightMatrices = useMemo(() => getMatrices('streetlight'), [envProps]);
  const fancyStreetlightMatrices = useMemo(() => getMatrices('streetlight_fancy'), [envProps]);
  const trashbinMatrices = useMemo(() => getMatrices('trashbin'), [envProps]);
  const mailboxMatrices = useMemo(() => getMatrices('mailbox'), [envProps]);
  const planterMatrices = useMemo(() => getMatrices('planter'), [envProps]);
  const bushMatrices = useMemo(() => getMatrices('bush'), [envProps]);
  const bushLargeMatrices = useMemo(() => getMatrices('bush_large'), [envProps]);
  const signboardMatrices = useMemo(() => getMatrices('signboard'), [envProps]);
  const busStopMatrices = useMemo(() => getMatrices('bus_stop'), [envProps]);
  const benchMatrices = useMemo(() => getMatrices('bench'), [envProps]);
  
  const grassMatrices = useMemo(() => envProps.filter(p => p.type === 'grass').map(p => {
    const m = new THREE.Matrix4();
    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    m.compose(new THREE.Vector3(p.x, 0.015, p.z), rot, new THREE.Vector3(1, 1, 1));
    return m;
  }), [envProps]);

  const shouldCastShadow = quality.envPropCastShadow;
  const shouldReceiveShadow = quality.enableShadows;

  return (
    <>
      <Sky
        sunPosition={[100, 40, 80]}
        turbidity={0.2}
        rayleigh={1.2}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <fog attach="fog" args={['#b3e5fc', quality.fogNear, quality.fogFar]} />

      {quality.enableClouds && <Clouds />}
      {quality.enableDistantSkyline && <DistantSkyline />}

      <group ref={groupRef}>
        <InstancedModelBatch url={TREE1_URL} targetHeight={TARGET_TREE_HEIGHT} items={tree1Items} castShadow={shouldCastShadow} receiveShadow={shouldReceiveShadow} />
        <InstancedModelBatch url={TREE2_URL} targetHeight={TARGET_TREE_HEIGHT * 1.2} items={tree2Items} castShadow={shouldCastShadow} receiveShadow={shouldReceiveShadow} />

        <InstancedModelBatch url={BUILDING1_URL} targetHeight={TARGET_BUILDING_HEIGHT * 0.9} items={building1Items} castShadow={shouldCastShadow} receiveShadow={shouldReceiveShadow} />
        <InstancedModelBatch url={BUILDING2_URL} targetHeight={TARGET_BUILDING_HEIGHT} items={building2Items} castShadow={shouldCastShadow} receiveShadow={shouldReceiveShadow} />
        <InstancedModelBatch url={BUILDING3_URL} targetHeight={TARGET_BUILDING_HEIGHT * 1.3} items={building3Items} castShadow={shouldCastShadow} receiveShadow={shouldReceiveShadow} />

        <StaticInstances geometry={fenceGeo} material={fenceMat} matrices={fenceMatrices} castShadow={false} />
        <StaticInstances geometry={streetlightGeo} material={streetlightMat} matrices={streetlightMatrices} castShadow={false} />
        <StaticInstances geometry={fancyStreetlightGeo} material={streetlightMat} matrices={fancyStreetlightMatrices} castShadow={false} />
        <StaticInstances geometry={trashbinGeo} material={trashbinMat} matrices={trashbinMatrices} castShadow={false} />
        <StaticInstances geometry={mailboxGeo} material={mailboxMat} matrices={mailboxMatrices} castShadow={false} />
        <StaticInstances geometry={planterGeo} material={planterMat} matrices={planterMatrices} castShadow={false} />
        <StaticInstances geometry={bushGeo} material={bushMat} matrices={bushMatrices} castShadow={false} />
        <StaticInstances geometry={bushLargeGeo} material={bushMat} matrices={bushLargeMatrices} castShadow={false} />
        <StaticInstances geometry={signboardGeo} material={signboardMat} matrices={signboardMatrices} castShadow={false} />
        <StaticInstances geometry={busStopGeo} material={busStopMat} matrices={busStopMatrices} castShadow={false} />
        <StaticInstances geometry={benchGeo} material={benchMat} matrices={benchMatrices} castShadow={false} />
        <StaticInstances geometry={grassGeo} material={grassMat} matrices={grassMatrices} castShadow={false} receiveShadow={false} />
      </group>
    </>
  );
}
