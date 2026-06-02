import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  progress?: number;
}

export default function LoadingScreen({ progress = 0 }: LoadingScreenProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #0a0a2e 0%, #1a0a40 100%)',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        fontSize: '3rem',
        marginBottom: '1rem',
        animation: 'bounce 0.6s ease-in-out infinite alternate',
      }}>
        🏃
      </div>

      <div style={{
        fontSize: '1.5rem',
        fontWeight: 900,
        color: '#ffd700',
        letterSpacing: '3px',
        marginBottom: '0.5rem',
      }}>
        SUBWAY RUSH
      </div>

      <div style={{
        color: 'rgba(255,255,255,0.5)',
        fontSize: '0.9rem',
        marginBottom: '2rem',
      }}>
        Loading{dots}
      </div>

      <div style={{
        width: '200px',
        height: '6px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '3px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #ffd700, #ff8c00)',
          borderRadius: '3px',
          transition: 'width 0.3s ease',
          animation: progress < 100 ? 'shimmer 1s linear infinite' : 'none',
        }} />
      </div>

      <style>{`
        @keyframes bounce {
          from { transform: translateY(0px); }
          to { transform: translateY(-15px); }
        }
        @keyframes shimmer {
          0% { filter: brightness(1); }
          50% { filter: brightness(1.3); }
          100% { filter: brightness(1); }
        }
      `}</style>
    </div>
  );
}
