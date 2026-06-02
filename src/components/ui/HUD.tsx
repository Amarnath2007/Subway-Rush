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
  const { score, bestScore, coins, chaseMeter, isWarning, missions, pauseGame, speed } = useGameStore();
  const level = Math.max(1, Math.floor(speed / 5));

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

        {/* Left: pause + level */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={pauseGame} style={{
            pointerEvents: 'all',
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
            border: '2px solid rgba(255,255,255,0.25)', color: '#fff',
            fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.1s ease',
          }}>⏸</button>
          <div style={{
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
            borderRadius: 8, padding: '3px 10px',
            color: '#ffd700', fontSize: '0.68rem', fontWeight: 800, letterSpacing: 1, textAlign: 'center',
          }}>LVL {level}</div>
        </div>

        {/* Centre: score panel */}
        <div style={{
          textAlign: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          borderRadius: 18, padding: '7px 22px',
          border: '1px solid rgba(255,255,255,0.12)', minWidth: 150,
        }}>
          <div style={{ color: '#ffd700', fontSize: '0.7rem', fontWeight: 800, letterSpacing: 2 }}>
            ×{level} ⭐
          </div>
          <div style={{
            color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2.1rem)',
            fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          }}>
            {String(score).padStart(6, '0')}
          </div>
          <CoinCounter coins={coins} />
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

      {/* ── Missions panel (right side) ── */}
      <div className="missions-panel" style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        width: 182, background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(10px)',
        borderRadius: 18, padding: '12px 14px',
        border: '1px solid rgba(255,255,255,0.1)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        pointerEvents: 'none',
      }}>
        <div style={{ color: '#ffd700', fontSize: '0.68rem', fontWeight: 800, letterSpacing: 2, marginBottom: 10, textAlign: 'center' }}>
          MISSIONS
        </div>
        {missions.map(m => (
          <div key={m.id} style={{ marginBottom: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '1rem' }}>{m.icon}</span>
              <div>
                <div style={{ color: '#fff', fontSize: '0.66rem', fontWeight: 600 }}>{m.label}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6rem' }}>{m.current}/{m.target}</div>
              </div>
              {m.current >= m.target && <span style={{ marginLeft: 'auto', color: '#4caf50', fontSize: '0.8rem' }}>✓</span>}
            </div>
            <Bar pct={m.current / m.target} />
          </div>
        ))}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8, marginTop: 4, textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', marginBottom: 4 }}>HIGH SCORE</div>
          <div style={{ color: '#ffd700', fontWeight: 800, fontSize: '0.88rem' }}>{String(bestScore).padStart(6, '0')}</div>
        </div>
      </div>

      {/* ── Chase meter ── */}
      <div style={{
        position: 'absolute', bottom: 88, left: '50%', transform: 'translateX(-50%)',
        width: 'min(280px, 78vw)', pointerEvents: 'none',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        {isWarning && (
          <div style={{
            textAlign: 'center', color: '#ff4444',
            fontSize: '0.75rem', fontWeight: 800, letterSpacing: 3,
            marginBottom: 5, animation: 'blink 0.45s linear infinite',
          }}>⚠️ POLICE CLOSING IN ⚠️</div>
        )}
        <div style={{
          background: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: '5px 10px',
          backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: '1rem' }}>👮</span>
          <div style={{ flex: 1, height: 9, background: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${chaseMeter}%`,
              background: chaseMeter > 65 ? 'linear-gradient(90deg,#ff4444,#ff0000)' : 'linear-gradient(90deg,#4caf50,#ffd700)',
              borderRadius: 5, transition: 'width 0.1s ease, background 0.3s ease',
            }} />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: 700, minWidth: 28, textAlign: 'right' }}>
            {Math.round(chaseMeter)}%
          </span>
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
