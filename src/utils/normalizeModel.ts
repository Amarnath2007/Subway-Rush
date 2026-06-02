import * as THREE from 'three';

interface NormalizeOptions {
  centerXZ?: boolean;
}

interface PrepareOptions {
  castShadow?: boolean;
  receiveShadow?: boolean;
  frustumCulled?: boolean;
}

/**
 * Normalise a loaded model to a target height.
 * Computes bounding box, scales uniformly so the model's height = targetHeight,
 * then repositions so the bottom of the bounding box sits at Y = 0.
 *
 * Returns { scale, yOffset } so you can apply them without mutating the cached object.
 */
export function computeNormalizedScale(
  object: THREE.Object3D,
  targetHeight: number
): { scale: number; yOffset: number } {
  // Force geometry/matrix updates
  object.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);

  const currentHeight = size.y;
  if (currentHeight < 0.001) return { scale: 1, yOffset: 0 };

  const scale = targetHeight / currentHeight;

  // After scaling, the bottom of the box sits at box.min.y * scale.
  // We want that to be 0, so yOffset = -box.min.y * scale
  const yOffset = -box.min.y * scale;

  return { scale, yOffset };
}

export function computeNormalizedTransform(
  object: THREE.Object3D,
  targetHeight: number,
  options: NormalizeOptions = {}
): {
  scale: number;
  position: THREE.Vector3;
  sourceBox: THREE.Box3;
  sourceSize: THREE.Vector3;
} {
  object.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const scale = size.y > 0.001 ? targetHeight / size.y : 1;
  const position = new THREE.Vector3(
    options.centerXZ ? -center.x * scale : 0,
    -box.min.y * scale,
    options.centerXZ ? -center.z * scale : 0
  );

  return { scale, position, sourceBox: box, sourceSize: size };
}

export function applyMeshRenderOptions(
  object: THREE.Object3D,
  options: PrepareOptions = {}
): void {
  const castShadow = options.castShadow ?? false;
  const receiveShadow = options.receiveShadow ?? false;
  const frustumCulled = options.frustumCulled;

  object.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      if (frustumCulled !== undefined) mesh.frustumCulled = frustumCulled;
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => { m.needsUpdate = true; });
      } else if (mesh.material) {
        mesh.material.needsUpdate = true;
      }
    }
  });
}

/**
 * Inline-mutate an object: normalise to targetHeight and apply mesh render options.
 * Call this inside a useEffect / after useLoader resolves, never during render.
 */
export function normalizeAndPrepareMesh(
  object: THREE.Object3D,
  targetHeight: number,
  options: PrepareOptions = {}
): { scale: number; yOffset: number } {
  const result = computeNormalizedScale(object, targetHeight);
  applyMeshRenderOptions(object, options);
  return result;
}
