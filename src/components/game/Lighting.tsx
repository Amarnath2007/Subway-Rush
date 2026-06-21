import { qualityManager } from '../../utils/qualityManager';

export default function Lighting() {
  const quality = qualityManager.settings;

  return (
    <>
      <ambientLight intensity={0.65} color="#e3f2fd" />
      <hemisphereLight args={['#87ceeb', '#4d4d4d', 0.6]} />
      
      {/* Sun Light — shadow map size and cascade adjusted per quality tier */}
      <directionalLight 
        position={[15, 25, 10]} 
        intensity={1.8} 
        color="#fff4e0"
        castShadow={quality.enableShadows}
        shadow-mapSize={[quality.shadowMapSize, quality.shadowMapSize]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-far={60}
        shadow-bias={-0.001}
      />

      {/* Fill Light — simpler for low quality */}
      <directionalLight position={[-10, 8, -5]} intensity={0.5} color="#90caf9" />
      
      {/* Back Light — only on medium/high */}
      {quality.maxPointLights > 0 && (
        <pointLight position={[0, 5, -20]} intensity={0.4} color="#ffffff" />
      )}
    </>
  );
}


