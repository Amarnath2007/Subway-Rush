import React from 'react';
import { useGameStore } from '../../store/gameStore';

interface BottomMenuProps {
  onOpenAchievements: () => void;
  onOpenCharacters: () => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
}

export default function BottomMenu({ onOpenAchievements, onOpenCharacters, onOpenShop, onOpenSettings }: BottomMenuProps) {
  const btnStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderRadius: '16px',
    background: 'transparent',
    border: 'none',
    color: 'white',
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 48px)',
      maxWidth: '450px',
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(16px)',
      borderRadius: '24px',
      padding: '8px',
      display: 'flex',
      justifyContent: 'space-around',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
      zIndex: 100,
    }}>
      <button 
        style={btnStyle} 
        onClick={onOpenAchievements}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <span style={{ fontSize: '24px' }}>🏆</span>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Awards</span>
      </button>
      
      <button 
        style={btnStyle} 
        onClick={onOpenCharacters}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <span style={{ fontSize: '24px' }}>🧥</span>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Runners</span>
      </button>

      <button 
        style={btnStyle} 
        onClick={onOpenShop}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <span style={{ fontSize: '24px' }}>🛒</span>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shop</span>
      </button>

      <button 
        style={btnStyle} 
        onClick={onOpenSettings}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <span style={{ fontSize: '24px' }}>⚙️</span>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Settings</span>
      </button>
    </div>
  );
}
