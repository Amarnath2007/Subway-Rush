import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { soundManager } from '../../utils/soundManager';
import BottomMenu from './BottomMenu';
import AchievementsModal from './AchievementsModal';
import CharactersModal from './CharactersModal';
import ShopModal from './ShopModal';
import SettingsModal from './SettingsModal';

export default function MainMenu() {
  const { bestScore, totalCoins, diamonds } = useGameStore();
  const [activeModal, setActiveModal] = useState<'none' | 'achievements' | 'characters' | 'shop' | 'settings'>('none');
  
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.opacity = '0';
      titleRef.current.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        if (!titleRef.current) return;
        titleRef.current.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
        titleRef.current.style.opacity = '1';
        titleRef.current.style.transform = 'translateY(0)';
      }, 100);
    }
  }, []);

  const handleStart = () => {
    if (activeModal !== 'none') return;
    soundManager.unlock();
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
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
      userSelect: 'none',
      background: 'linear-gradient(180deg, rgba(8,16,50,0.1) 0%, rgba(18,8,38,0.4) 100%)',
    }}>
      {/* Header Info */}
      <div style={{
        position: 'absolute', top: '24px', left: '24px', right: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={statBadgeStyle}>
            <span style={{ fontSize: '18px' }}>💰</span>
            <span style={{ fontWeight: 800 }}>{totalCoins.toLocaleString()}</span>
          </div>
          <div style={statBadgeStyle}>
            <span style={{ fontSize: '18px' }}>💎</span>
            <span style={{ fontWeight: 800 }}>{diamonds.toLocaleString()}</span>
          </div>
        </div>

        {bestScore > 0 && (
          <div style={{
             background: 'rgba(255, 215, 0, 0.25)', 
             backdropFilter: 'blur(10px)',
             border: '1px solid rgba(255, 215, 0, 0.4)',
             borderRadius: '16px', padding: '10px 20px',
             color: '#ffd700', fontSize: '0.9rem', fontWeight: 800,
             boxShadow: '0 4px 15px rgba(255, 215, 0, 0.2)'
          }}>
            🏆 BEST: {bestScore}
          </div>
        )}
      </div>

      {/* Center content (Click anywhere or Start) */}
      <div 
        onClick={handleStart}
        style={{
          flex: 1, width: '100%', display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}
      >
        <div ref={titleRef} style={{ textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{
            fontSize: 'clamp(3.5rem, 12vw, 6.5rem)', fontWeight: 900,
            lineHeight: 0.85, letterSpacing: -3,
            filter: 'drop-shadow(0 6px 30px rgba(0,0,0,0.4))',
            ...textGrad('#ffd700', '#ff8c00'),
          }}>SUBWAY</div>
          <div style={{
            fontSize: 'clamp(3.5rem, 12vw, 6.5rem)', fontWeight: 900,
            lineHeight: 0.85, letterSpacing: -3,
            filter: 'drop-shadow(0 6px 30px rgba(0,0,0,0.4))',
            ...textGrad('#00f2fe', '#4facfe'),
          }}>RUSH</div>
          
          <div style={{
            marginTop: '3.5rem',
            fontSize: '1.25rem', fontWeight: 800, color: 'white',
            textTransform: 'uppercase', letterSpacing: '4px',
            animation: 'blink 1.5s infinite',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>
            TAP TO PLAY
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <BottomMenu 
        onOpenAchievements={() => setActiveModal('achievements')}
        onOpenCharacters={() => setActiveModal('characters')}
        onOpenShop={() => setActiveModal('shop')}
        onOpenSettings={() => setActiveModal('settings')}
      />

      {/* Modals */}
      {activeModal === 'achievements' && <AchievementsModal onClose={() => setActiveModal('none')} />}
      {activeModal === 'characters' && <CharactersModal onClose={() => setActiveModal('none')} />}
      {activeModal === 'shop' && <ShopModal onClose={() => setActiveModal('none')} />}
      {activeModal === 'settings' && <SettingsModal onClose={() => setActiveModal('none')} />}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}

const statBadgeStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '50px',
  padding: '8px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  color: 'white',
  fontSize: '0.95rem',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
};
