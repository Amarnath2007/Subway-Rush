import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { soundManager } from '../../utils/soundManager';

export default function GameOver() {
  const { score, bestScore, coins, missions, distance } = useGameStore();
  const panelRef   = useRef<HTMLDivElement>(null);
  const isNewBest  = score >= bestScore && score > 0;

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'scale(0.7) translateY(30px)';
    requestAnimationFrame(() => {
      el.style.transition = 'all 0.45s cubic-bezier(0.34,1.56,0.64,1)';
      el.style.opacity = '1';
      el.style.transform = 'scale(1) translateY(0)';
    });
  }, []);

  const handleRestart = () => {
    soundManager.playJump();
    useGameStore.getState().restartGame();
  };

  const handleMenu = () => {
    soundManager.playLaneSwitch();
    useGameStore.setState({ gameState: 'menu' });
  };

  const statBox = (label: string, value: string, color = '#fff') => (
    <div style={{
      background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 12px', textAlign: 'center',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontWeight: 800, fontSize: '1.05rem' }}>{value}</div>
    </div>
  );

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5,10,30,0.92)', backdropFilter: 'blur(18px)',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div ref={panelRef} style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 28, padding: '2.5rem 2rem',
        textAlign: 'center', minWidth: 290, maxWidth: 390, width: '90%',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* New best ribbon */}
        {isNewBest && (
          <div style={{
            position: 'absolute', top: 14, right: -28,
            background: 'linear-gradient(135deg,#ffd700,#ff8c00)',
            color: '#000', fontSize: '0.62rem', fontWeight: 800,
            padding: '4px 40px', transform: 'rotate(30deg)', letterSpacing: 2,
          }}>NEW BEST!</div>
        )}

        {/* Title */}
        <div style={{
          fontSize: 'clamp(2rem,6vw,2.8rem)', fontWeight: 900,
          color: '#ff4444', letterSpacing: -1, marginBottom: 4,
          textShadow: '0 0 30px rgba(255,68,68,0.5)',
        }}>GAME OVER</div>
        <div style={{ fontSize: '2.2rem', marginBottom: '1.2rem' }}>💥</div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.2rem' }}>
          {statBox('SCORE',      String(score).padStart(6,'0'))}
          {statBox('COINS',      `${coins} 🪙`, '#ffd700')}
          {statBox('BEST',       String(bestScore).padStart(6,'0'), '#ffd700')}
          {statBox('DISTANCE',   `${Math.floor(distance)}m`, '#4fc3f7')}
        </div>

        {/* Mission recap */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: 12,
          padding: '10px 12px', marginBottom: '1.2rem',
        }}>
          <div style={{ color: '#ffd700', fontSize: '0.64rem', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
            MISSIONS
          </div>
          {missions.map(m => (
            <div key={m.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5,
            }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>{m.icon} {m.label}</span>
              <span style={{
                color: m.current >= m.target ? '#4caf50' : '#ffd700',
                fontSize: '0.7rem', fontWeight: 700, minWidth: 50, textAlign: 'right',
              }}>
                {m.current}/{m.target} {m.current >= m.target ? '✓' : ''}
              </span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {!useGameStore.getState().reviveUsed && (
            <button 
              onClick={() => {
                if (useGameStore.getState().revive()) {
                  soundManager.playPowerup();
                } else {
                  alert("Not enough Diamonds!");
                }
              }}
              style={{
                background: 'linear-gradient(135deg,#00d2ff,#3a7bd5)',
                border: 'none', borderRadius: 50, padding: '0.95rem 2rem',
                fontSize: '1.05rem', fontWeight: 800, color: '#fff',
                cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase',
                transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                boxShadow: '0 6px 24px rgba(0,180,255,0.4)',
                marginBottom: '4px',
                opacity: useGameStore.getState().diamonds < 5 ? 0.6 : 1,
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(1.04)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
            >💎 REVIVE (5)</button>
          )}

          <button onClick={handleRestart} style={{
            background: 'linear-gradient(135deg,#ffd700,#ff8c00)',
            border: 'none', borderRadius: 50, padding: '0.95rem 2rem',
            fontSize: '1.05rem', fontWeight: 800, color: '#1a0a00',
            cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase',
            transition: 'transform 0.12s ease, box-shadow 0.12s ease',
            boxShadow: '0 6px 24px rgba(255,140,0,0.4)',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(1.04)'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
          >🏃 PLAY AGAIN</button>

          <button onClick={handleMenu} style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 50, padding: '0.8rem 2rem',
            fontSize: '0.92rem', fontWeight: 600, color: 'rgba(255,255,255,0.65)',
            cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase',
            transition: 'all 0.12s ease',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.background='rgba(255,255,255,0.14)'; (e.target as HTMLElement).style.color='#fff'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background='rgba(255,255,255,0.07)'; (e.target as HTMLElement).style.color='rgba(255,255,255,0.65)'; }}
          >🏠 MAIN MENU</button>
        </div>
      </div>
    </div>
  );
}
