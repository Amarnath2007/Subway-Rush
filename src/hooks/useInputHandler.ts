import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { soundManager } from '../utils/soundManager';
import { SLIDE_DURATION } from '../config/constants';
import { Lane } from '../types/game';

// Bug 18 fix: removed unused canInputRef and lastActionRef

export function useInputHandler() {
  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // ── Action functions (stable — capture store via .getState()) ─────────
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
    if (gameState !== 'playing' || isJumping) return;
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
    const { gameState, isJumping, isSliding } = useGameStore.getState();
    if (gameState !== 'playing' || isSliding || isJumping) return;
    useGameStore.getState().setSliding(true);
    useGameStore.getState().setPlayerAction('slide');
    useGameStore.getState().incrementSlide();
    soundManager.playSlide();
    if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    slideTimerRef.current = setTimeout(() => {
      useGameStore.getState().setSliding(false);
      useGameStore.getState().setPlayerAction('run');
    }, SLIDE_DURATION);
  };

  const doPause = () => {
    const { gameState } = useGameStore.getState();
    if (gameState === 'playing') useGameStore.getState().pauseGame();
    else if (gameState === 'paused') useGameStore.getState().resumeGame();
  };

  // ── Keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':  case 'KeyA': e.preventDefault(); moveLeft();  break;
        case 'ArrowRight': case 'KeyD': e.preventDefault(); moveRight(); break;
        case 'ArrowUp': case 'KeyW': case 'Space': e.preventDefault(); doJump(); break;
        case 'ArrowDown':  case 'KeyS': e.preventDefault(); doSlide();  break;
        case 'Escape':     case 'KeyP': doPause(); break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []); // empty deps — stable via .getState() reads

  // ── Touch / swipe ──────────────────────────────────────────────────────
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const t   = e.changedTouches[0];
      const dx  = t.clientX - touchStartRef.current.x;
      const dy  = t.clientY - touchStartRef.current.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      if (adx < 35 && ady < 35) { doJump(); }        // tap
      else if (adx > ady) { dx < 0 ? moveLeft() : moveRight(); }
      else                { dy < 0 ? doJump()   : doSlide();   }

      touchStartRef.current = null;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend',   onTouchEnd);
    };
  }, []);
}
