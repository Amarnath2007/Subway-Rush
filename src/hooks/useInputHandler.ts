import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { soundManager } from '../utils/soundManager';
import { SLIDE_DURATION, JUMP_BUFFER_MS } from '../config/constants';
import { Lane } from '../types/game';

export function useInputHandler() {
  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const jumpBufferRef = useRef<number>(0);

  const moveLeft = () => {
    const { gameState, targetLane } = useGameStore.getState();
    if (gameState !== 'playing') return;
    const newLane = Math.max(-1, targetLane - 1) as Lane;
    if (newLane !== targetLane) {
      useGameStore.getState().setTargetLane(newLane);
      soundManager.playLaneSwitch();
    }
  };

  const moveRight = () => {
    const { gameState, targetLane } = useGameStore.getState();
    if (gameState !== 'playing') return;
    const newLane = Math.min(1, targetLane + 1) as Lane;
    if (newLane !== targetLane) {
      useGameStore.getState().setTargetLane(newLane);
      soundManager.playLaneSwitch();
    }
  };

  const doJump = () => {
    const { gameState, isJumping, isSliding } = useGameStore.getState();
    if (gameState !== 'playing') return;
    
    if (isJumping) {
      jumpBufferRef.current = performance.now();
      return;
    }

    if (isSliding) {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
      useGameStore.getState().setSliding(false);
    }
    
    useGameStore.getState().setJumping(true);
    useGameStore.getState().setPlayerAction('jump');
    useGameStore.getState().incrementJump();
    soundManager.playJump();
  };

  const doSlide = () => {
    const { gameState, isSliding } = useGameStore.getState();
    if (gameState !== 'playing' || isSliding) return;
    
    // Slide can happen while jumping to force descend
    useGameStore.getState().setSliding(true);
    useGameStore.getState().setPlayerAction('slide');
    useGameStore.getState().incrementSlide();
    soundManager.playSlide();
    
    if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    slideTimerRef.current = setTimeout(() => {
      const s = useGameStore.getState();
      if (s.isSliding) {
        useGameStore.getState().setSliding(false);
        if (!s.isJumping) useGameStore.getState().setPlayerAction('run');
      }
    }, SLIDE_DURATION);
  };

  const doPause = () => {
    const { gameState } = useGameStore.getState();
    if (gameState === 'playing') useGameStore.getState().pauseGame();
    else if (gameState === 'paused') useGameStore.getState().resumeGame();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':  case 'KeyA': e.preventDefault(); moveLeft();  break;
        case 'ArrowRight': case 'KeyD': e.preventDefault(); moveRight(); break;
        case 'ArrowUp':    case 'KeyW': case 'Space': e.preventDefault(); doJump(); break;
        case 'ArrowDown':  case 'KeyS': e.preventDefault(); doSlide();  break;
        case 'Escape':     case 'KeyP': doPause(); break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: performance.now() };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const t   = e.changedTouches[0];
      const dx  = t.clientX - touchStartRef.current.x;
      const dy  = t.clientY - touchStartRef.current.y;
      const dt  = performance.now() - touchStartRef.current.time;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      if (adx < 25 && ady < 25 && dt < 200) { 
        doJump(); // tap to jump for comfort
      } else if (Math.max(adx, ady) > 35 && dt < 400) {
        if (adx > ady) { dx < 0 ? moveLeft() : moveRight(); }
        else           { dy < 0 ? doJump()   : doSlide();   }
      }

      touchStartRef.current = null;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend',   onTouchEnd);
    };
  }, []);

  // Jump buffer tick
  useEffect(() => {
    const tick = () => {
      if (jumpBufferRef.current > 0) {
        const state = useGameStore.getState();
        if (!state.isJumping && state.gameState === 'playing') {
          if (performance.now() - jumpBufferRef.current < JUMP_BUFFER_MS) {
            doJump();
          }
          jumpBufferRef.current = 0;
        } else if (performance.now() - jumpBufferRef.current > JUMP_BUFFER_MS) {
          jumpBufferRef.current = 0;
        }
      }
      requestAnimationFrame(tick);
    };
    const animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);
}

