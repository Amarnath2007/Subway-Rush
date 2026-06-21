import { Suspense, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import { useGameStore } from '../../store/gameStore';
import { useInputHandler } from '../../hooks/useInputHandler';
import { qualityManager } from '../../utils/qualityManager';
import { preloadAllAssets, LoadingState } from '../../utils/assetPreloader';

import Player           from './Player';
import Track            from './Track';
import Obstacles        from './Obstacles';
import Coins            from './Coins';
import Environment      from './Environment';
import Powerups         from './Powerups';
import PowerupEffects   from './PowerupEffects';
import Lighting         from './Lighting';
import CameraController from './CameraController';
import WorldManager     from './WorldManager';
import SparklePool      from '../effects/SparklePool';

import MainMenu       from '../ui/MainMenu';
import HUD            from '../ui/HUD';
import PowerupHUD     from '../ui/PowerupHUD';
import PauseMenu      from '../ui/PauseMenu';
import GameOver       from '../ui/GameOver';
import LoadingScreen  from '../ui/LoadingScreen';
import CoinFX         from '../effects/CoinFX';
import ReviveEffect   from '../effects/ReviveEffect';
import DebugOverlay  from '../ui/DebugOverlay';
import ErrorDebugger from '../ui/ErrorDebugger';

function GameScene() {
  const gameState = useGameStore(s => s.gameState);
  const isActive  = gameState === 'playing' || gameState === 'paused';
  const showPlayer = isActive || gameState === 'menu' || gameState === 'gameover';

  return (
    <>
      <WorldManager />
      <CameraController />
      <Lighting />

      <Suspense fallback={null}>
        <Environment />
      </Suspense>

      <Track />

      <Suspense fallback={null}>
        {showPlayer && <Player />}
      </Suspense>

      {(isActive || gameState === 'gameover') && (
        <>
          <Suspense fallback={null}><Obstacles /></Suspense>

          <Suspense fallback={null}><Coins /></Suspense>
          <Suspense fallback={null}><Powerups /></Suspense>
          <PowerupEffects />
          <SparklePool />
        </>
      )}

      <AdaptiveDpr pixelated />
    </>
  );
}

export default function Game() {
  useInputHandler();
  const gameState = useGameStore(s => s.gameState);
  const quality = qualityManager.settings;

  const [assetsReady, setAssetsReady] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    progress: 0, phase: 'Initializing...', done: false,
  });

  useEffect(() => {
    preloadAllAssets(setLoadingState);
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setAssetsReady(true);
    // Extra slight delay to ensure UI transitions are smooth
    setTimeout(() => setShowLoadingScreen(false), 200);
  }, []);

  return (
    <div style={{ width:'100%', height:'100%', position:'relative', overflow:'hidden', background:'#0a0a2e' }}>
      {/* Loading Screen — High priority overlay */}
      {showLoadingScreen && (
        <LoadingScreen
          progress={loadingState.progress}
          phase={loadingState.phase}
          onComplete={handleLoadingComplete}
        />
      )}

      {/* Canvas — Only mounted/visible when ready, or suspended until assets load */}
      {/* We keep it in a container that stays hidden until assets are ready to prevent flashing */}
      <div style={{
        width: '100%',
        height: '100%',
        opacity: assetsReady ? 1 : 0,
        transition: 'opacity 0.8s ease-in-out',
        background: '#87ceeb'
      }}>
        <Canvas
          shadows={quality.enableShadows}
          camera={{ fov: 57, near: 0.1, far: 260, position: [0, 4.15, 8.15] }}
          gl={{ 
            antialias: quality.antialias, 
            powerPreference: 'high-performance', 
            stencil: false,
            depth: true,
          }}
          dpr={quality.dpr}
          performance={{ min: 0.5 }}
        >
          <Suspense fallback={null}>
            {assetsReady && <GameScene />}
          </Suspense>
        </Canvas>
      </div>

      {/* UI overlays — only rendered when assets are loaded */}
      {assetsReady && (
        <>
          {gameState === 'menu'     && <MainMenu />}
          {gameState === 'playing'  && <><HUD /><PowerupHUD /><CoinFX /><ReviveEffect /></>}
          {gameState === 'paused'   && <PauseMenu />}
          {gameState === 'gameover' && <GameOver />}
          
          <DebugOverlay />
          <ErrorDebugger />
        </>
      )}
    </div>
  );
}



