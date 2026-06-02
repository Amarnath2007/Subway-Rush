import { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { applyMeshRenderOptions, computeNormalizedTransform } from '../../utils/normalizeModel';

export interface InstancedModelItem {
  id: string;
  position: [number, number, number];
  rotationY?: number;
  scale?: number | [number, number, number];
}

export interface InstancedModelSource {
  key: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  matrix: THREE.Matrix4;
}

const ZERO_SCALE = new THREE.Vector3(0, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export function useInstancedModelSources(
  url: string,
  targetHeight: number,
  options: { centerXZ?: boolean } = {}
): InstancedModelSource[] {
  const { scene } = useGLTF(url);

  return useMemo(() => {
    applyMeshRenderOptions(scene, { castShadow: false, receiveShadow: false });

    const { scale, position } = computeNormalizedTransform(scene, targetHeight, {
      centerXZ: options.centerXZ ?? true,
    });
    const normalizedRoot = new THREE.Matrix4().compose(
      position,
      new THREE.Quaternion(),
      new THREE.Vector3(scale, scale, scale)
    );

    scene.updateWorldMatrix(true, true);

    const sources: InstancedModelSource[] = [];
    scene.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry || !mesh.material) return;

      sources.push({
        key: mesh.uuid,
        geometry: mesh.geometry,
        material: mesh.material,
        matrix: normalizedRoot.clone().multiply(mesh.matrixWorld),
      });
    });

    return sources;
  }, [scene, targetHeight, options.centerXZ]);
}

function composeItemMatrix(
  item: InstancedModelItem,
  target: THREE.Matrix4,
  quaternion: THREE.Quaternion,
  scale: THREE.Vector3
) {
  quaternion.setFromAxisAngle(Y_AXIS, item.rotationY ?? 0);
  if (Array.isArray(item.scale)) {
    scale.set(item.scale[0], item.scale[1], item.scale[2]);
  } else {
    const s = item.scale ?? 1;
    scale.set(s, s, s);
  }
  target.compose(new THREE.Vector3(...item.position), quaternion, scale);
}

function InstancedLayer({
  source,
  itemMatrices,
  castShadow,
  receiveShadow,
}: {
  source: InstancedModelSource;
  itemMatrices: THREE.Matrix4[];
  castShadow: boolean;
  receiveShadow: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const instanceMatrix = new THREE.Matrix4();
    const hiddenMatrix = new THREE.Matrix4().compose(
      new THREE.Vector3(0, -10000, 0),
      new THREE.Quaternion(),
      ZERO_SCALE
    );

    for (let i = 0; i < mesh.count; i++) {
      if (i < itemMatrices.length) {
        instanceMatrix.multiplyMatrices(itemMatrices[i], source.matrix);
        mesh.setMatrixAt(i, instanceMatrix);
      } else {
        mesh.setMatrixAt(i, hiddenMatrix);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [itemMatrices, source]);

  if (itemMatrices.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[source.geometry, source.material, itemMatrices.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={false}
      dispose={null}
    />
  );
}

export function InstancedModelBatch({
  url,
  targetHeight,
  items,
  centerXZ = true,
  castShadow = false,
  receiveShadow = false,
}: {
  url: string;
  targetHeight: number;
  items: InstancedModelItem[];
  centerXZ?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const sources = useInstancedModelSources(url, targetHeight, { centerXZ });

  const itemMatrices = useMemo(() => {
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const matrix = new THREE.Matrix4();

    return items.map(item => {
      composeItemMatrix(item, matrix, quaternion, scale);
      return matrix.clone();
    });
  }, [items]);

  return (
    <>
      {sources.map(source => (
        <InstancedLayer
          key={source.key}
          source={source}
          itemMatrices={itemMatrices}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        />
      ))}
    </>
  );
}
