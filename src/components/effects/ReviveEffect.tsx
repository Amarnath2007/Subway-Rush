import { useGameStore } from '../../store/gameStore';

export default function ReviveEffect() {
  const isBoom = useGameStore(s => s.reviveBoom);
  const slowMo = useGameStore(s => s.reviveSlowMo);

  if (!isBoom && slowMo <= 0) return null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {/* Flash / Boom Overlay - Faster and less intense */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'white',
        opacity: isBoom ? 0.8 : 0,
        transition: 'opacity 0.25s ease-out',
      }} />

      {/* Shockwave Circle */}
      {isBoom && (
        <div style={{
          width: '100px',
          height: '100px',
          border: '15px solid rgba(255, 255, 255, 0.8)',
          borderRadius: '50%',
          animation: 'boomWave 0.8s ease-out forwards',
          boxShadow: '0 0 50px rgba(255,255,255,0.5)',
        }} />
      )}

      <style>{`
        @keyframes boomWave {
          0% { transform: scale(0.1); opacity: 1; border-width: 40px; }
          100% { transform: scale(30); opacity: 0; border-width: 2px; }
        }
      `}</style>
    </div>
  );
}
