import { qualityManager } from '../../utils/qualityManager';

export default function Lighting() {
  const quality = qualityManager.settings;

  return (
    <>
      <ambientLight intensity={0.65} color="#e3f2fd" />
      <hemisphereLight args={['#87ceeb', '#4d4d4d', 0.6]} />
      
      {/* Sun Light */}
      <directionalLight 
        position={[15, 25, 10]} 
        intensity={1.8} 
        color="#fff4e0"
        castShadow={quality.enableShadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-far={60}
      />

      {/* Fill Light */}
      <directionalLight position={[-10, 8, -5]} intensity={0.5} color="#90caf9" />
      
      {/* Back Light */}
      <pointLight position={[0, 5, -20]} intensity={0.4} color="#ffffff" />
    </>
  );
}

