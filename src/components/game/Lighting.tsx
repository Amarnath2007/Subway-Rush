export default function Lighting() {
  return (
    <>
      <ambientLight intensity={0.72} color="#fff7e8" />
      <hemisphereLight args={['#8fd6ff', '#8a806f', 0.55]} />
      <directionalLight position={[10, 16, 8]} intensity={1.45} color="#fff1cc" />
      <directionalLight position={[-8, 5, -10]} intensity={0.42} color="#bfe4ff" />
    </>
  );
}
