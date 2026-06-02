import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { soundManager } from '../../utils/soundManager';

export default function MainMenu() {
  const bestScore  = useGameStore(s => s.bestScore);
  const titleRef   = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Entrance animation
    [titleRef, contentRef].forEach((ref, i) => {
      const el = ref.current;
      if (!el) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(-24px)';
      setTimeout(() => {
        el.style.transition = `all ${0.5 + i * 0.1}s cubic-bezier(0.34,1.56,0.64,1)`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 80 + i * 120);
    });
  }, []);

  const handleStart = () => {
    soundManager.unlock();
    soundManager.playJump();
    soundManager.startBGMusic();
    useGameStore.getState().startGame();
  };

  const textGrad = (from: string, to: string) => ({
    background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent' as const,
    backgroundClip: 'text' as const,
  });

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg,rgba(8,16,50,0.88) 0%,rgba(18,8,38,0.92) 100%)',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      userSelect: 'none',
    }}>
      {/* Floating coins background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            fontSize: `${0.8 + Math.random() * 0.8}rem`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: 0.18 + Math.random() * 0.22,
            animation: `floatCoin ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 3}s infinite alternate`,
          }}>🪙</div>
        ))}
      </div>

      {/* Logo */}
      <div ref={titleRef} style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
        <div style={{
          fontSize: 'clamp(2.8rem,9vw,5.5rem)', fontWeight: 900,
          lineHeight: 1, letterSpacing: -2,
          filter: 'drop-shadow(0 4px 20px rgba(255,165,0,0.6))',
          marginBottom: '0.15rem',
          ...textGrad('#ffd700', '#ff4500'),
        }}>SUBWAY</div>
        <div style={{
          fontSize: 'clamp(2.8rem,9vw,5.5rem)', fontWeight: 900,
          lineHeight: 1, letterSpacing: -2,
          filter: 'drop-shadow(0 4px 20px rgba(0,191,255,0.4))',
          ...textGrad('#00bfff', '#0044ff'),
        }}>RUSH</div>
        <div style={{
          fontSize: 'clamp(0.75rem,2vw,0.95rem)', color: 'rgba(255,255,255,0.45)',
          letterSpacing: 5, textTransform: 'uppercase', marginTop: 8, fontWeight: 400,
        }}>Endless Runner</div>
      </div>

      <div ref={contentRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: 360, padding: '0 20px' }}>
        {/* Best score badge */}
        {bestScore > 0 && (
          <div style={{
            background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.35)',
            borderRadius: 14, padding: '6px 22px',
            color: '#ffd700', fontSize: '0.95rem', fontWeight: 700, letterSpacing: 1,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            🏆 BEST: {String(bestScore).padStart(6,'0')}
          </div>
        )}

        {/* Start button */}
        <button onClick={handleStart} style={{
          width: '100%',
          background: 'linear-gradient(135deg,#ffd700 0%,#ff8c00 100%)',
          border: 'none', borderRadius: 50,
          padding: '1rem 3rem',
          fontSize: 'clamp(1.05rem,3vw,1.3rem)', fontWeight: 800,
          color: '#1a0a00', cursor: 'pointer', letterSpacing: 2,
          textTransform: 'uppercase',
          boxShadow: '0 8px 30px rgba(255,140,0,0.5)',
          transition: 'transform 0.12s ease, box-shadow 0.12s ease',
          animation: 'pulseCTA 2s ease-in-out infinite',
        }}
        onMouseEnter={e => { (e.target as HTMLElement).style.transform='scale(1.06)'; (e.target as HTMLElement).style.boxShadow='0 12px 40px rgba(255,140,0,0.7)'; }}
        onMouseLeave={e => { (e.target as HTMLElement).style.transform='scale(1)'; (e.target as HTMLElement).style.boxShadow='0 8px 30px rgba(255,140,0,0.5)'; }}
        >🏃 START RUNNING</button>

        {/* Controls grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
          padding: '1rem', width: '100%',
          background: 'rgba(255,255,255,0.04)', borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {[
            ['⬅️➡️ A / D','Lane switch'],
            ['⬆️ Space / W', 'Jump'],
            ['⬇️ S', 'Slide'],
            ['👆 Swipe', 'Touch'],
          ].map(([key, desc]) => (
            <div key={key} style={{ textAlign: 'center' }}>
              <div style={{ color: '#ffd700', fontSize: '0.72rem', fontWeight: 600 }}>{key}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.66rem' }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes floatCoin {
          from { transform: translateY(0) rotate(0deg); }
          to   { transform: translateY(-22px) rotate(180deg); }
        }
        @keyframes pulseCTA {
          0%,100% { box-shadow: 0 8px 30px rgba(255,140,0,0.5), 0 0 0 0 rgba(255,140,0,0.4); }
          50%      { box-shadow: 0 8px 30px rgba(255,140,0,0.5), 0 0 0 10px rgba(255,140,0,0); }
        }
      `}</style>
    </div>
  );
}
