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

export default function LoadingScreen({ progress, onComplete }: LoadingScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const hasTriggeredComplete = useRef(false);

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
      background: '#000', // Black fallback
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      overflow: 'hidden',
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.6s ease-out',
      pointerEvents: fadeOut ? 'none' : 'auto',
    }}>
      {/* Main Background Image - Contains all titles and text already */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url("/assets/loading screen.jpeg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }} />

      {/* Progress bar container - Positioned specifically above "Loading Assets..." in artwork */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '380px', // Standard width for the bar area
        padding: '0 40px 105px 40px', // 105px bottom padding to sit above the artwork text
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 10,
      }}>
        {/* Bar background */}
        <div style={{
          width: '100%',
          height: '10px',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: '5px',
          padding: '2px',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        }}>
          {/* Bar fill */}
          <div style={{
            height: '100%',
            width: `${clampedProgress}%`,
            background: 'linear-gradient(90deg, #ffd700, #ffaa00, #ff8c00)',
            borderRadius: '3px',
            transition: 'width 0.3s ease-out',
            boxShadow: '0 0 15px rgba(255,215,0,0.6)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Shimmer overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
              animation: clampedProgress < 100 ? 'loadingBarShimmer 1.5s linear infinite' : 'none',
            }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes loadingBarShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}


