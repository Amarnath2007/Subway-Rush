import { useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

function Bar({ pct, color = 'linear-gradient(90deg,#4caf50,#8bc34a)' }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${Math.min(pct * 100, 100)}%`, background: color, borderRadius: 4, transition: 'width 0.25s ease' }} />
    </div>
  );
}

// Coin pop animation counter
function CoinCounter({ coins }: { coins: number }) {
  const prevRef = useRef(coins);
  const showPop = coins > prevRef.current;
  prevRef.current = coins;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#ffd700', fontSize: '1rem', fontWeight: 700, marginTop: 2 }}>
      <span style={{ fontSize: '1rem', transform: showPop ? 'scale(1.5)' : 'scale(1)', transition: 'transform 0.1s ease', display: 'inline-block' }}>🪙</span>
      <span>{coins}</span>
    </div>
  );
}

export default function HUD() {
  const { score, bestScore, coins, pauseGame, speed, activePowerups } = useGameStore();
  const level = Math.max(1, Math.floor(speed / 5));
  const isMultiplierActive = activePowerups.has('multiplier');

  return (
    <>
      {/* ── Top bar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: '14px 18px',
        pointerEvents: 'none',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>

        {/* Left: pause */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={pauseGame} style={{
            pointerEvents: 'all',
            width: 52, height: 52, borderRadius: '16px',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255,255,255,0.2)', color: '#fff',
            fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
            transition: 'all 0.15s ease',
          }}>⏸</button>
        </div>

        {/* Centre: score panel */}
        <div style={{
          textAlign: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
          borderRadius: '24px', padding: '10px 24px',
          border: '1px solid rgba(255,255,255,0.15)', minWidth: 160,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          pointerEvents: 'none'
        }}>
          <div style={{
            color: '#fff', fontSize: 'clamp(1.6rem, 5vw, 2.3rem)',
            fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-1px'
          }}>
            {String(score).padStart(6, '0')}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '6px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.1rem' }}>🪙</span>
                <span style={{ color: '#ffd700', fontWeight: 800 }}>{coins}</span>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.1rem' }}>💎</span>
                <span style={{ color: '#4facfe', fontWeight: 800 }}>{useGameStore.getState().diamonds}</span>
             </div>
          </div>

          {isMultiplierActive && (
            <div style={{
              marginTop: '8px', padding: '3px 12px', borderRadius: '10px',
              background: 'linear-gradient(135deg,#ffd700,#ff8c00)',
              color: '#000', fontSize: '0.7rem', fontWeight: 900,
              display: 'inline-block', boxShadow: '0 0 15px rgba(255,215,0,0.4)'
            }}>2x MULTIPLIER</div>
          )}
        </div>

        {/* Right: best score */}
        <div style={{
          textAlign: 'center',
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
          borderRadius: 14, padding: '8px 14px',
          border: '1px solid rgba(255,255,255,0.1)', minWidth: 94,
        }}>
          <div style={{ color: '#ffd700', fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, marginBottom: 2 }}>HIGH SCORE</div>
          <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 800 }}>{String(bestScore).padStart(6, '0')}</div>
          <div style={{
            marginTop: 4, width: 34, height: 34, borderRadius: 8,
            background: 'linear-gradient(135deg,#ffd700,#ff8c00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', margin: '4px auto 0',
          }}>🏃</div>
        </div>
      </div>

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}
        @media (max-width: 700px) {
          .missions-panel { display: none; }
        }
      `}</style>
    </>
  );
}
