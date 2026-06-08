import { useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { soundManager } from '../../utils/soundManager';
import { SLIDE_DURATION } from '../../config/constants';
import { Lane } from '../../types/game';

export default function MobileControls() {
  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const actions = {
    moveLeft: () => {
      const { gameState, targetLane, isGameOverPending } = useGameStore.getState();
      if (gameState !== 'playing' || isGameOverPending) return;
      const n = Math.max(-1, targetLane - 1) as Lane;
      if (n !== targetLane) { useGameStore.getState().setTargetLane(n); soundManager.playLaneSwitch(); }
    },
    moveRight: () => {
      const { gameState, targetLane, isGameOverPending } = useGameStore.getState();
      if (gameState !== 'playing' || isGameOverPending) return;
      const n = Math.min(1, targetLane + 1) as Lane;
      if (n !== targetLane) { useGameStore.getState().setTargetLane(n); soundManager.playLaneSwitch(); }
    },
    jump: () => {
      const { gameState, isJumping, isJetpackActive, isGameOverPending } = useGameStore.getState();
      if (gameState !== 'playing' || isJumping || isJetpackActive || isGameOverPending) return;
      useGameStore.getState().setJumping(true);
      useGameStore.getState().setPlayerAction('jump');
      useGameStore.getState().incrementJump();
      soundManager.playJump();
    },
    slide: () => {
      const { gameState, isJumping, isSliding, isJetpackActive, isGameOverPending } = useGameStore.getState();
      if (gameState !== 'playing' || isSliding || isJumping || isJetpackActive || isGameOverPending) return;
      useGameStore.getState().setSliding(true);
      useGameStore.getState().setPlayerAction('slide');
      useGameStore.getState().incrementSlide();
      soundManager.playSlide();
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
      slideTimerRef.current = setTimeout(() => {
        useGameStore.getState().setSliding(false);
        useGameStore.getState().setPlayerAction('run');
      }, SLIDE_DURATION);
    },
  };

  const btn = (label: string, action: () => void, accent: string): React.CSSProperties => ({
    width: 60, height: 60, borderRadius: '50%',
    background: `rgba(${accent}, 0.25)`,
    backdropFilter: 'blur(6px)',
    border: `2px solid rgba(${accent}, 0.55)`,
    color: '#fff', fontSize: '1.4rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none', touchAction: 'manipulation',
    transition: 'transform 0.08s ease',
    flexShrink: 0,
  });

  // Only show on touch devices
  if (!('ontouchstart' in window)) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      pointerEvents: 'all',
    }}>
      {/* Jump */}
      <button
        onTouchStart={e => { e.preventDefault(); actions.jump(); }}
        style={btn('⬆️', actions.jump, '255,215,0')}
      >⬆️</button>

      {/* Left / Slide / Right */}
      <div style={{ display: 'flex', gap: 52, alignItems: 'center' }}>
        <button onTouchStart={e => { e.preventDefault(); actions.moveLeft(); }} style={btn('⬅️', actions.moveLeft, '100,200,255')}>⬅️</button>
        <button onTouchStart={e => { e.preventDefault(); actions.slide(); }} style={btn('⬇️', actions.slide, '255,150,50')}>⬇️</button>
        <button onTouchStart={e => { e.preventDefault(); actions.moveRight(); }} style={btn('➡️', actions.moveRight, '100,200,255')}>➡️</button>
      </div>
    </div>
  );
}
