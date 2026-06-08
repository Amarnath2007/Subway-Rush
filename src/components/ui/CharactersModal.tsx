import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { CHARACTERS, RARITY_COLORS } from '../../config/constants';

interface CharactersModalProps {
  onClose: () => void;
}

export default function CharactersModal({ onClose }: CharactersModalProps) {
  const { totalCoins, diamonds, unlockedCharacters, selectedCharacter, selectCharacter, buyCharacter } = useGameStore();

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <div style={modalHeaderStyle}>
          <h2>Runners</h2>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px', marginTop: '20px', maxHeight: '65vh', overflowY: 'auto', padding: '4px' }}>
          {CHARACTERS.map(c => {
            const isUnlocked = unlockedCharacters.includes(c.id);
            const isSelected = selectedCharacter === c.id;
            const rarityColor = RARITY_COLORS[c.rarity];

            return (
              <div key={c.id} style={{
                ...charCardStyle,
                border: isSelected ? `2px solid ${rarityColor}` : '1px solid rgba(255,255,255,0.1)',
                transform: isSelected ? 'scale(1.02)' : 'none'
              }}>
                <div style={{ ...rarityBadgeStyle, background: rarityColor }}>{c.rarity}</div>
                
                <div style={charPreviewBoxStyle}>
                   <div style={{ fontSize: '40px', filter: isUnlocked ? 'none' : 'grayscale(1) brightness(0.4)' }}>👤</div>
                   {!isUnlocked && <div style={{ position: 'absolute', fontSize: '20px' }}>🔒</div>}
                </div>

                <h3 style={{ margin: '8px 0 4px', fontSize: '1rem', textAlign: 'center' }}>{c.name}</h3>

                {isUnlocked ? (
                  <button 
                    onClick={() => selectCharacter(c.id)}
                    style={{
                      ...actionButtonStyle,
                      background: isSelected ? 'rgba(255,255,255,0.1)' : '#ffd700',
                      color: isSelected ? 'white' : '#1a1a1a'
                    }}
                  >
                    {isSelected ? 'SELECTED' : 'SELECT'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    <button 
                      onClick={() => buyCharacter(c.id, 'coins')}
                      disabled={totalCoins < c.costCoins}
                      style={{ ...buyBtnSmallStyle, opacity: totalCoins < c.costCoins ? 0.5 : 1 }}
                    >
                      💰 {c.costCoins.toLocaleString()}
                    </button>
                    <button 
                      onClick={() => buyCharacter(c.id, 'diamonds')}
                      disabled={diamonds < c.costDiamonds}
                      style={{ ...buyBtnSmallStyle, opacity: diamonds < c.costDiamonds ? 0.5 : 1, background: '#4facfe' }}
                    >
                      💎 {c.costDiamonds}
                    </button>
                  </div>
                )}
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
  width: '100%', maxWidth: '600px', background: '#111827', borderRadius: '32px',
  border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden', padding: '24px', color: 'white'
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer'
};

const charCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', borderRadius: '24px', padding: '12px',
  display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative',
  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
};

const rarityBadgeStyle: React.CSSProperties = {
  position: 'absolute', top: '8px', left: '12px', padding: '2px 8px', borderRadius: '4px',
  fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: 'white'
};

const charPreviewBoxStyle: React.CSSProperties = {
  width: '100px', height: '100px', background: 'rgba(0,0,0,0.2)', borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
  marginTop: '12px'
};

const actionButtonStyle: React.CSSProperties = {
  marginTop: '8px', width: '100%', padding: '8px', borderRadius: '12px', border: 'none',
  fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'
};

const buyBtnSmallStyle: React.CSSProperties = {
  width: '100%', padding: '6px', borderRadius: '8px', border: 'none', fontWeight: 800,
  fontSize: '0.75rem', color: 'white', background: '#374151', cursor: 'pointer'
};
