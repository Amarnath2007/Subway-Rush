import { useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

function CoinCounter({ coins }: { coins: number }) {
  const prevRef = useRef(coins);
  const showPop = coins > prevRef.current;
  prevRef.current = coins;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontSize: '1rem' }}>🪙</span>
      <span
        style={{
          color: '#fff',
          fontSize: '1.05rem',
          fontWeight: 900,
          textShadow: '0 2px 6px rgba(0,0,0,0.65)',
          transform: showPop ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 0.12s ease',
          display: 'inline-block',
          minWidth: 24,
          textAlign: 'right',
        }}
      >
        {coins}
      </span>
    </div>
  );
}

export default function HUD() {
  const { score, coins, pauseGame, speed, activePowerups } = useGameStore();

  const level = Math.max(1, Math.floor(speed / 5));
  const isMultiplierActive = activePowerups.has('multiplier');

  return (
    <>
      {/* Top-left pause */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          zIndex: 20,
          pointerEvents: 'none',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}
      >
        <button
          onClick={pauseGame}
          style={{
            pointerEvents: 'all',
            width: 50,
            height: 50,
            borderRadius: 14,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            border: '2px solid rgba(255,255,255,0.18)',
            color: '#fff',
            fontSize: '1.2rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 18px rgba(0,0,0,0.28)',
          }}
        >
          ⏸
        </button>
      </div>

      {/* Top-center score */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          pointerEvents: 'none',
          textAlign: 'center',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: 10,
            background: 'rgba(0,0,0,0.28)',
            backdropFilter: 'blur(4px)',
            marginBottom: 2,
          }}
        >
          <span
            style={{
              color: '#ffd54f',
              fontSize: '0.95rem',
              fontWeight: 900,
              textShadow: '0 2px 4px rgba(0,0,0,0.55)',
            }}
          >
            x{level}
          </span>
        </div>

        <div
          style={{
            color: '#fff',
            fontSize: 'clamp(1.8rem, 4.5vw, 2.5rem)',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-1px',
            textShadow: '0 3px 8px rgba(0,0,0,0.7)',
            minWidth: 130,
          }}
        >
          {String(score).padStart(6, '0')}
        </div>

        {isMultiplierActive && (
          <div
            style={{
              marginTop: 4,
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: 999,
              background: 'linear-gradient(135deg,#ffd700,#ff8c00)',
              color: '#1a0a00',
              fontSize: '0.65rem',
              fontWeight: 900,
              boxShadow: '0 0 14px rgba(255,215,0,0.35)',
            }}
          >
            2X MULTIPLIER
          </div>
        )}
      </div>

      {/* Top-right coins */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          zIndex: 20,
          pointerEvents: 'none',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 14,
            background: 'rgba(0,0,0,0.42)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.22)',
          }}
        >
          <CoinCounter coins={coins} />
        </div>
      </div>
    </>
  );
}