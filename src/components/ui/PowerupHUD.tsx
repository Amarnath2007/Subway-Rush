import { useGameStore } from '../../store/gameStore';

export default function PowerupHUD() {
  const activePowerups = useGameStore(s => s.activePowerups);

  if (activePowerups.size === 0) return null;

  const powerups = Array.from(activePowerups.values());

  return (
    <div style={{
      position: 'absolute',
      bottom: '40px',
      left: '40px',
      display: 'flex',
      flexDirection: 'column-reverse',
      gap: '12px',
      pointerEvents: 'none',
      zIndex: 100
    }}>
      {powerups.map(pw => (
        <div key={pw.type} id={`pw-${pw.type}`} style={{
          background: 'rgba(20, 20, 20, 0.75)',
          borderRadius: '16px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          width: '210px',
          border: '1.5px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(10px)',
          animation: 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${getPowerupColor(pw.type)}, ${getPowerupColor(pw.type)}dd)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${getPowerupColor(pw.type)}88`,
            padding: '6px'
          }}>
            {getPowerupIcon(pw.type)}
          </div>
          
          <div style={{ flex: 1 }}>
            <div style={{ 
              color: 'white', 
              fontSize: '12px', 
              fontWeight: 700, 
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>{pw.type}</span>
              <span style={{ opacity: 0.7, fontSize: '10px' }}>{Math.ceil(pw.remaining)}s</span>
            </div>
            <div style={{
              height: '6px',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '3px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                height: '100%',
                width: `${(pw.remaining / pw.duration) * 100}%`,
                background: 'white',
                borderRadius: '3px',
                transition: 'width 0.1s linear',
                boxShadow: '0 0 10px rgba(255,255,255,0.5)'
              }} />
            </div>
          </div>

          {pw.remaining < 3 && (
            <style>{`
              #pw-${pw.type} {
                animation: warn 0.4s infinite alternate;
                border-color: #f43f5e !important;
              }
              @keyframes warn {
                from { background: rgba(20, 20, 20, 0.75); }
                to { background: rgba(244, 63, 94, 0.35); }
              }
            `}</style>
          )}
        </div>
      ))}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function getPowerupIcon(type: string) {
  const props = { width: "100%", height: "100%", fill: "white" };
  switch (type) {
    case 'magnet':
      return (
        <svg viewBox="0 0 24 24" {...props}>
          <path d="M12 2C8.13 2 5 5.13 5 9v3h2V9c0-2.76 2.24-5 5-5s5 2.24 5 5v3h2V9c0-3.87-3.13-7-7-7zm0 13c-2.76 0-5 2.24-5 5h10c0-2.76-2.24-5-5-5z"/>
        </svg>
      );
    case 'sneakers':
      return (
        <svg viewBox="0 0 24 24" {...props}>
          <path d="M21 7.28C21 4.9 19.1 3 16.72 3c-1.34 0-2.5.6-3.26 1.54C12.7 3.6 11.54 3 10.2 3 7.82 3 5.92 4.9 5.92 7.28c0 1.25.54 2.38 1.4 3.16L3 17.5v1.86l2.1-.64L7 21h10l1.9-2.28 2.1.64V17.5l-4.32-7.06c.86-.78 1.4-1.91 1.4-3.16zM12 5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
        </svg>
      );
    case 'multiplier':
      return (
        <div style={{ color: 'white', fontWeight: 900, fontSize: '20px' }}>x2</div>
      );
    case 'jetpack':
      return (
        <svg viewBox="0 0 24 24" {...props}>
          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
        </svg>
      );
    default:
      return null;
  }
}

function getPowerupColor(type: string) {
  switch (type) {
    case 'magnet': return '#3b82f6';
    case 'sneakers': return '#10b981';
    case 'multiplier': return '#f59e0b';
    case 'jetpack': return '#ef4444';
    default: return '#ffffff';
  }
}
