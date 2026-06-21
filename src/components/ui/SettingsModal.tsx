import React, { useState, useEffect } from 'react';
import { soundManager } from '../../utils/soundManager';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [volumes, setVolumes] = useState(soundManager.volumes);

  const updateVolume = (key: 'music' | 'sfx', value: number) => {
    soundManager.setVolumes({ [key]: value });
    setVolumes(soundManager.volumes);
  };

  const toggleMusic = () => {
    soundManager.toggleMusic();
    setVolumes(soundManager.volumes);
  };

  const toggleSFX = () => {
    soundManager.toggleSFX();
    setVolumes(soundManager.volumes);
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>SETTINGS</h2>
          <button style={closeButtonStyle} onClick={onClose}>×</button>
        </div>

        <div style={contentStyle}>
          {/* Music Toggle & Volume */}
          <div style={sectionStyle}>
            <div style={labelRowStyle}>
              <span style={labelStyle}>MUSIC</span>
              <button 
                onClick={toggleMusic}
                style={toggleButtonStyle(volumes.musicEnabled)}
              >
                {volumes.musicEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <input 
              type="range" 
              min="0" max="1" step="0.01" 
              value={volumes.music}
              disabled={!volumes.musicEnabled}
              onChange={(e) => updateVolume('music', parseFloat(e.target.value))}
              style={sliderStyle(!volumes.musicEnabled)}
            />
          </div>

          {/* SFX Toggle & Volume */}
          <div style={sectionStyle}>
            <div style={labelRowStyle}>
              <span style={labelStyle}>SOUND EFFECTS</span>
              <button 
                onClick={toggleSFX}
                style={toggleButtonStyle(volumes.sfxEnabled)}
              >
                {volumes.sfxEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <input 
              type="range" 
              min="0" max="1" step="0.01" 
              value={volumes.sfx}
              disabled={!volumes.sfxEnabled}
              onChange={(e) => updateVolume('sfx', parseFloat(e.target.value))}
              style={sliderStyle(!volumes.sfxEnabled)}
            />
          </div>

          <div style={footerTextStyle}>
            Audio settings are saved automatically.
          </div>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute', inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(8px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
  animation: 'fadeIn 0.3s ease-out',
};

const modalStyle: React.CSSProperties = {
  width: '90%', maxWidth: '400px',
  background: 'rgba(30, 41, 59, 0.85)',
  backdropFilter: 'blur(20px)',
  borderRadius: '24px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  padding: '24px',
  display: 'flex', flexDirection: 'column', gap: '20px',
  color: 'white',
  fontFamily: "'Inter', sans-serif",
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginBottom: '8px',
};

const titleStyle: React.CSSProperties = {
  margin: 0, fontSize: '1.5rem', fontWeight: 900, letterSpacing: '1px',
  background: 'linear-gradient(to right, #60a5fa, #a855f7)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.1)',
  border: 'none', borderRadius: '50%',
  width: '32px', height: '32px',
  color: 'white', fontSize: '20px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.2s',
};

const contentStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '24px',
};

const sectionStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '12px',
};

const labelRowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px',
};

const toggleButtonStyle = (enabled: boolean): React.CSSProperties => ({
  background: enabled ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(71, 85, 105, 0.5)',
  border: 'none', borderRadius: '12px',
  padding: '6px 16px',
  color: 'white', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: enabled ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
});

const sliderStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  background: '#334155',
  appearance: 'none',
  WebkitAppearance: 'none',
  outline: 'none',
  opacity: disabled ? 0.3 : 1,
  cursor: disabled ? 'default' : 'pointer',
});

const footerTextStyle: React.CSSProperties = {
  fontSize: '0.7rem', color: '#64748b', textAlign: 'center', marginTop: '8px',
};
