import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { POWERUP_UPGRADE_COSTS, POWERUP_DURATIONS } from '../../config/constants';

interface ShopModalProps {
  onClose: () => void;
}

export default function ShopModal({ onClose }: ShopModalProps) {
  const { totalCoins, powerupLevels, upgradePowerup } = useGameStore();

  const powerups = [
    { id: 'jetpack', name: 'Jetpack', icon: '🚀' },
    { id: 'magnet', name: 'Coin Magnet', icon: '🧲' },
    { id: 'sneakers', name: 'Super Sneakers', icon: '👟' },
    { id: 'multiplier', name: '2x Multiplier', icon: '✨' },
  ];

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <div style={modalHeaderStyle}>
          <h2>Powerup Shop</h2>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
          {powerups.map(p => {
            const level = powerupLevels[p.id] || 1;
            const isMax = level >= 5;
            const cost = POWERUP_UPGRADE_COSTS[level];
            const currentDuration = POWERUP_DURATIONS[level - 1];
            const nextDuration = isMax ? currentDuration : POWERUP_DURATIONS[level];

            return (
              <div key={p.id} style={itemCardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={iconBoxStyle}>{p.icon}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{p.name}</h3>
                    <div style={levelBarContainerStyle}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} style={{
                          height: '6px', flex: 1, backgroundColor: i < level ? '#ffd700' : 'rgba(255,255,255,0.1)',
                          borderRadius: '3px'
                        }} />
                      ))}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                      {isMax ? 'MAX LEVEL' : `${currentDuration}s → ${nextDuration}s Duration`}
                    </p>
                  </div>
                  <button 
                    disabled={isMax || totalCoins < cost}
                    onClick={() => upgradePowerup(p.id)}
                    style={{
                      ...buyButtonStyle,
                      opacity: isMax ? 0.5 : (totalCoins < cost ? 0.7 : 1),
                      cursor: isMax || totalCoins < cost ? 'default' : 'pointer',
                      background: isMax ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #ffd700, #ff8c00)'
                    }}
                  >
                    {isMax ? 'MAX' : `UPGRADE 💰${cost}`}
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
  width: '100%', maxWidth: '500px', background: '#1e293b', borderRadius: '32px',
  border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden', padding: '24px', color: 'white'
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer'
};

const itemCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)'
};

const iconBoxStyle: React.CSSProperties = {
  width: '48px', height: '48px', background: 'rgba(255,255,255,0.1)', borderRadius: '14px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px'
};

const levelBarContainerStyle: React.CSSProperties = {
  display: 'flex', gap: '4px', marginTop: '8px', width: '120px'
};

const buyButtonStyle: React.CSSProperties = {
  padding: '10px 16px', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '0.85rem', color: '#1a1a1a', transition: 'all 0.2s'
};
