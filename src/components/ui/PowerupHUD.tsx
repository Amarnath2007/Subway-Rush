import { useGameStore } from '../../store/gameStore';

export default function PowerupHUD() {
  const activePowerups = useGameStore(s => s.activePowerups);

  if (activePowerups.size === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '80px',
      left: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none',
      zIndex: 100
    }}>
      {Array.from(activePowerups.values()).map(pw => (
        <div key={pw.type} style={{
          background: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '12px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          width: '180px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(4px)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: getPowerupColor(pw.type),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: `0 0 10px ${getPowerupColor(pw.type)}`
          }}>
            {pw.type[0].toUpperCase()}
          </div>
          
          <div style={{ flex: 1 }}>
            <div style={{ 
              color: 'white', 
              fontSize: '11px', 
              fontWeight: 600, 
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {pw.type}
            </div>
            <div style={{
              height: '4px',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${(pw.remaining / pw.duration) * 100}%`,
                background: getPowerupColor(pw.type),
                transition: 'width 0.1s linear'
              }} />
            </div>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function getPowerupColor(type: string) {
  switch (type) {
    case 'magnet': return '#3b82f6';
    case 'sneakers': return '#10b981';
    case 'multiplier': return '#f59e0b';
    case 'jetpack': return '#ef4444';
    default: return '#fff';
  }
}
