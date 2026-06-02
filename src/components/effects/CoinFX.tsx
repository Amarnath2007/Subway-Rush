import { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

interface Pop { id: number; x: number; y: number }
let popId = 0;

export default function CoinFX() {
  const [pops, setPops] = useState<Pop[]>([]);
  const prevCoins = useRef(0);
  const coins = useGameStore(s => s.coins);

  useEffect(() => {
    if (coins > prevCoins.current) {
      const diff = Math.min(coins - prevCoins.current, 5); // cap burst
      for (let i = 0; i < diff; i++) {
        const id = ++popId;
        const x  = 44 + Math.random() * 14;
        const y  = 14 + Math.random() * 8;
        setPops(p => [...p, { id, x, y }]);
        setTimeout(() => setPops(p => p.filter(pop => pop.id !== id)), 850);
      }
    }
    prevCoins.current = coins;
  }, [coins]);

  return (
    <>
      {pops.map(pop => (
        <div key={pop.id} style={{
          position: 'absolute',
          left: `${pop.x}%`,
          top:  `${pop.y}%`,
          color: '#ffd700',
          fontWeight: 800,
          fontSize: '0.95rem',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          pointerEvents: 'none',
          zIndex: 20,
          animation: 'coinPop 0.85s ease-out forwards',
          textShadow: '0 2px 6px rgba(0,0,0,0.7)',
          whiteSpace: 'nowrap',
        }}>+{50} 🪙</div>
      ))}
      <style>{`
        @keyframes coinPop {
          0%   { opacity:1; transform:translateY(0) scale(1); }
          55%  { opacity:1; transform:translateY(-30px) scale(1.15); }
          100% { opacity:0; transform:translateY(-52px) scale(0.85); }
        }
      `}</style>
    </>
  );
}
