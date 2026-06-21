import { useEffect, useState, useRef, useCallback } from 'react';

interface LoadingScreenProps {
  progress: number;
  phase?: string;
  onComplete?: () => void;
}

const LOADING_TIPS = [
  'Swipe up to jump over barriers!',
  'Collect coins to unlock new characters!',
  'Use the jetpack to soar above obstacles!',
  'The magnet pulls coins toward you!',
  'Super sneakers let you jump higher!',
  'Swipe down to slide under obstacles!',
  'Tap the pause button if you need a break!',
];

export default function LoadingScreen({ progress, phase, onComplete }: LoadingScreenProps) {
  const [dots, setDots] = useState('');
  const [tip] = useState(() => LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]);
  const [fadeOut, setFadeOut] = useState(false);
  const hasTriggeredComplete = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100 && !hasTriggeredComplete.current) {
      hasTriggeredComplete.current = true;
      const timer = setTimeout(() => {
        setFadeOut(true);
        const fadeTimer = setTimeout(() => onComplete?.(), 600);
        return () => clearTimeout(fadeTimer);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      background: '#0a0a2e',
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      overflow: 'hidden',
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.6s ease-out',
      pointerEvents: fadeOut ? 'none' : 'auto',
    }}>
      {/* Main Background Image */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url("/assets/loading screen.jpeg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }} />

      {/* Gradient Overlay for Text Readability */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.8) 100%)',
      }} />

      {/* Title (Floating at top-middle) */}
      <div style={{
        position: 'absolute',
        top: '12%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          fontSize: 'clamp(2.5rem, 8vw, 4.2rem)',
          fontWeight: 950,
          color: '#ffffff',
          letterSpacing: '8px',
          textTransform: 'uppercase',
          textShadow: '0 0 20px rgba(255,215,0,0.6), 0 4px 10px rgba(0,0,0,0.8)',
          background: 'linear-gradient(135deg, #fff 0%, #ffd700 50%, #fff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'loadingTitlePulse 2s ease-in-out infinite alternate',
        }}>
          SUBWAY RUSH
        </div>
        <div style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.7)',
          letterSpacing: '10px',
          textTransform: 'uppercase',
          marginTop: '-5px',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}>
          ENDLESS RUNNER
        </div>
      </div>

      {/* Bottom Content Area */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '450px',
        padding: '0 40px 60px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 10,
      }}>
        
        {/* Progress bar container */}
        <div style={{ width: '100%', marginBottom: '1.5rem' }}>
          {/* Progress percentage & Phase */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '10px',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ color: '#ffd700' }}>●</span>
              <span>{phase || `Loading${dots}`}</span>
            </div>
            <span style={{ 
              fontSize: '1rem', 
              fontWeight: 900, 
              color: '#ffd700' 
            }}>{clampedProgress}%</span>
          </div>

          {/* Bar background */}
          <div style={{
            width: '100%',
            height: '12px',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '6px',
            padding: '2px',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          }}>
            {/* Bar fill */}
            <div style={{
              height: '100%',
              width: `${clampedProgress}%`,
              background: 'linear-gradient(90deg, #ffd700, #ffaa00, #ff8c00)',
              borderRadius: '4px',
              transition: 'width 0.3s ease-out',
              boxShadow: '0 0 15px rgba(255,215,0,0.5)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Shimmer overlay */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                animation: clampedProgress < 100 ? 'loadingBarShimmer 1.5s linear infinite' : 'none',
              }} />
            </div>
          </div>
        </div>

        {/* Loading tip */}
        <div style={{
          width: '100%',
          padding: '12px 20px',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '0.85rem',
          fontWeight: 500,
          textAlign: 'center',
          lineHeight: 1.4,
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        }}>
          <span style={{ color: '#ffd700', fontWeight: 800, marginRight: '8px' }}>TIP:</span>
          {tip}
        </div>
      </div>

      <style>{`
        @keyframes loadingTitlePulse {
          from { transform: scale(1); filter: drop-shadow(0 0 10px rgba(255,215,0,0.4)); }
          to   { transform: scale(1.03); filter: drop-shadow(0 0 25px rgba(255,215,0,0.8)); }
        }
        @keyframes loadingBarShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

