import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { soundManager } from '../../utils/soundManager';

export default function PauseMenu() {
  const { resumeGame, score } = useGameStore();
  const [musicOn, setMusicOn] = useState(soundManager.isMusicEnabled);
  const [sfxOn,   setSFXOn]   = useState(soundManager.isSFXEnabled);
  const [musicVolume, setMusicVolume] = useState(soundManager.getMusicVolume);
  const [sfxVolume, setSFXVolume] = useState(soundManager.getSFXVolume);

  const handleResume = () => { soundManager.playJump(); resumeGame(); };
  const handleQuit   = () => { soundManager.playGameOver(); useGameStore.getState().endGame(); };

  const toggleMusic = () => { setMusicOn(soundManager.toggleMusic()); };
  const toggleSFX   = () => { setSFXOn(soundManager.toggleSFX()); };
  const updateMusicVolume = (value: number) => setMusicVolume(soundManager.setMusicVolume(value));
  const updateSFXVolume = (value: number) => setSFXVolume(soundManager.setSFXVolume(value));

  const Toggle = ({ label, on, toggle }: { label: string; on: boolean; toggle: () => void }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'2px 0' }}>
      <span style={{ color:'#fff', fontSize:'0.88rem' }}>{label}</span>
      <button onClick={toggle} style={{
        background: on ? 'linear-gradient(135deg,#4caf50,#2e7d32)' : 'rgba(255,255,255,0.1)',
        border: 'none', borderRadius: 20, width: 52, height: 27, cursor: 'pointer',
        position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', width: 21, height: 21, borderRadius: '50%',
          background: '#fff', top: 3, left: on ? 28 : 3, transition: 'left 0.2s ease',
        }} />
      </button>
    </div>
  );

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(10,18,55,0.9)', backdropFilter: 'blur(14px)',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 26, padding: '2.2rem 1.8rem',
        minWidth: 280, maxWidth: 360, width: '90%', textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 6 }}>⏸ PAUSED</div>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', marginBottom: '1.4rem' }}>
          Score: <span style={{ color:'#ffd700', fontWeight:700 }}>{score.toLocaleString()}</span>
        </div>

        {/* Settings */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: 16,
          padding: '1rem 1.2rem', marginBottom: '1.4rem',
          display: 'flex', flexDirection: 'column', gap: '0.8rem',
        }}>
          <div style={{ color:'#ffd700', fontSize:'0.65rem', fontWeight:700, letterSpacing:2, marginBottom:2 }}>SETTINGS</div>
          <Toggle label="🎵 Music"    on={musicOn} toggle={toggleMusic} />
          <Toggle label="🔊 Sound FX" on={sfxOn}   toggle={toggleSFX} />
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
          <button onClick={handleResume} style={{
            background: 'linear-gradient(135deg,#ffd700,#ff8c00)',
            border:'none', borderRadius:50, padding:'0.85rem 2rem',
            fontSize:'1rem', fontWeight:800, color:'#1a0a00',
            cursor:'pointer', letterSpacing:2, textTransform:'uppercase',
            transition:'transform 0.12s ease',
            boxShadow:'0 6px 22px rgba(255,140,0,0.4)',
          }}
          onMouseEnter={e=>{(e.target as HTMLElement).style.transform='scale(1.04)';}}
          onMouseLeave={e=>{(e.target as HTMLElement).style.transform='scale(1)';}}
          >▶ RESUME</button>

          <button onClick={handleQuit} style={{
            background: 'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.18)',
            borderRadius:50, padding:'0.75rem 2rem',
            fontSize:'0.9rem', fontWeight:600, color:'rgba(255,255,255,0.65)',
            cursor:'pointer', letterSpacing:1, textTransform:'uppercase',
            transition:'all 0.12s ease',
          }}
          onMouseEnter={e=>{(e.target as HTMLElement).style.background='rgba(255,60,60,0.18)'; (e.target as HTMLElement).style.color='#ff6666';}}
          onMouseLeave={e=>{(e.target as HTMLElement).style.background='rgba(255,255,255,0.07)'; (e.target as HTMLElement).style.color='rgba(255,255,255,0.65)';}}
          >🚪 QUIT</button>
        </div>
      </div>
    </div>
  );
}
