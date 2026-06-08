import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { ACHIEVEMENTS } from '../../config/constants';

interface AchievementsModalProps {
  onClose: () => void;
}

export default function AchievementsModal({ onClose }: AchievementsModalProps) {
  const { stats, claimedAchievements, claimAchievement } = useGameStore();

  const getProgress = (a: any) => {
    switch (a.type) {
      case 'coins': return stats.lifetimeCoins;
      case 'distance': return stats.lifetimeDistance;
      case 'jumps': return stats.lifetimeJumps;
      case 'slides': return stats.lifetimeSlides;
      case 'powerups': return stats.lifetimePowerupsCollected;
      case 'games': return stats.lifetimeGamesPlayed;
      default: return 0;
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <div style={modalHeaderStyle}>
          <h2>Achievements</h2>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
          {ACHIEVEMENTS.map(a => {
            const current = getProgress(a);
            const isCompleted = current >= a.target;
            const isClaimed = claimedAchievements.includes(a.id);
            const progressPct = Math.min(100, (current / a.target) * 100);

            return (
              <div key={a.id} style={achievementCardStyle}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>{a.title}</h3>
                  <p style={{ margin: '2px 0 8px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{a.description}</p>
                  
                  <div style={progressBgStyle}>
                    <div style={{ ...progressFillStyle, width: `${progressPct}%` }} />
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', marginTop: '4px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    {current.toLocaleString()} / {a.target.toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '90px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4facfe' }}>💎 {a.reward}</div>
                  <button 
                    disabled={!isCompleted || isClaimed}
                    onClick={() => claimAchievement(a.id, a.reward)}
                    style={{
                      ...claimButtonStyle,
                      background: isClaimed ? 'rgba(255,255,255,0.05)' : (isCompleted ? '#4facfe' : 'rgba(255,255,255,0.1)'),
                      color: isClaimed ? 'rgba(255,255,255,0.3)' : (isCompleted ? 'white' : 'rgba(255,255,255,0.4)')
                    }}
                  >
                    {isClaimed ? 'CLAIMED' : (isCompleted ? 'CLAIM' : 'LOCKED')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
};

const modalContentStyle: React.CSSProperties = {
  width: '100%', maxWidth: '540px', background: '#0f172a', borderRadius: '32px',
  border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden', padding: '24px', color: 'white'
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer'
};

const achievementCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)', borderRadius: '18px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)',
  display: 'flex', alignItems: 'center', gap: '16px'
};

const progressBgStyle: React.CSSProperties = {
  height: '8px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden'
};

const progressFillStyle: React.CSSProperties = {
  height: '100%', background: 'linear-gradient(90deg, #4facfe, #00f2fe)', borderRadius: '4px', transition: 'width 0.4s ease'
};

const claimButtonStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '10px', border: 'none', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
  width: '100%', transition: 'all 0.2s'
};
