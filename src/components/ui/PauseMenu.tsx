import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { soundManager } from '../../utils/soundManager';

interface SliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

const Slider = ({ label, value, onChange }: SliderProps) => (
  <div style={{ width: '100%', marginBottom: '14px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
      <span>{label}</span>
      <span>{Math.round(value * 100)}%</span>
    </div>
    <div style={{ position: 'relative', height: '6px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
      <input 
        type="range" min="0" max="1" step="0.01" value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer', zIndex: 2
        }}
      />
      <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${value * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: '3px' }} />
      <div style={{ 
        position: 'absolute', top: '50%', left: `${value * 100}%`, width: '14px', height: '14px', 
        background: '#fff', borderRadius: '50%', transform: 'translate(-50%, -50%)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)', pointerEvents: 'none'
      }} />
    </div>
  </div>
);

export default function PauseMenu() {
  const resume = useGameStore(s => s.resumeGame);
  const restart = useGameStore(s => s.restartGame);
  const score = useGameStore(s => s.score);
  
  const [vols, setVols] = useState(soundManager.volumes);

  const updateVols = (key: 'music' | 'sfx', val: number) => {
    soundManager.setVolumes({ [key]: val });
    setVols(soundManager.volumes);
  };

  const toggleMute = () => {
    // Basic mute logic: if music is enabled, disable both, else enable both
    const newState = !vols.musicEnabled;
    soundManager.setMusicEnabled(newState);
    soundManager.setSfxEnabled(newState);
    setVols(soundManager.volumes);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5, 10, 25, 0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: 'linear-gradient(145deg, rgba(30, 35, 50, 0.9), rgba(15, 20, 35, 0.95))',
        padding: '30px',
        borderRadius: '32px',
        width: '340px',
        textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)',
        animation: 'popIn 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
      }}>
        <div style={{ color: '#3b82f6', fontSize: '10px', fontWeight: 800, letterSpacing: '4px', marginBottom: '8px' }}>SESSION PAUSED</div>
        <h1 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '32px', fontWeight: 900, letterSpacing: '-1px' }}>RESUME?</h1>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '24px' }}>Current Score: <span style={{ color: '#fff', fontWeight: 600 }}>{score.toLocaleString()}</span></div>
        
        <div style={{ 
          background: 'rgba(0,0,0,0.2)', 
          padding: '20px', 
          borderRadius: '20px', 
          marginBottom: '24px',
          border: '1px solid rgba(255,255,255,0.03)'
        }}>
          <Slider label="Music Volume" value={vols.music} onChange={(v) => updateVols('music', v)} />
          <Slider label="SFX Volume" value={vols.sfx} onChange={(v) => updateVols('sfx', v)} />
          
          <button 
            onClick={toggleMute}
            style={{
              width: '100%', padding: '10px', borderRadius: '12px', border: 'none',
              background: vols.musicEnabled ? 'rgba(255,255,255,0.1)' : '#ef4444',
              color: 'white', fontWeight: 700, fontSize: '12px', cursor: 'pointer',
              marginTop: '8px', transition: 'all 0.2s'
            }}
          >
            {vols.musicEnabled ? '🔊 MUTE ALL' : '🔇 UNMUTE ALL'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={resume}
            style={{
              padding: '16px', borderRadius: '16px', border: 'none',
              background: '#3b82f6', color: 'white', fontWeight: 700, fontSize: '16px',
              cursor: 'pointer', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            RESUME RUN
          </button>
          
          <button 
            onClick={restart}
            style={{
              padding: '14px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '14px',
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
          >
            RESTART MISSION
          </button>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @font-face {
          font-family: 'Inter';
          src: url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        }
      `}</style>
    </div>
  );
}
