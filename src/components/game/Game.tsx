import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import { useGameStore } from '../../store/gameStore';
import { useInputHandler } from '../../hooks/useInputHandler';
import { qualityManager } from '../../utils/qualityManager';

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
import CoinFX         from '../effects/CoinFX';
import DebugOverlay  from '../ui/DebugOverlay';
import ErrorDebugger from '../ui/ErrorDebugger';

function GameScene() {
  const gameState = useGameStore(s => s.gameState);
  const isActive  = gameState === 'playing' || gameState === 'paused';

  return (
    <>
      <WorldManager />
      <CameraController />
      <Lighting />
      <fog attach="fog" args={['#87ceeb', 55, 210]} />

      <Suspense fallback={null}>
        <Environment />
      </Suspense>

      <Track />

      <Suspense fallback={null}>
        {(isActive || gameState === 'gameover') && <Player />}
      </Suspense>

      {isActive && (
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

  return (
    <div style={{ width:'100%', height:'100%', position:'relative', overflow:'hidden', background:'#87ceeb' }}>
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
        performance={{ min: 0.7 }}
      >
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
      </Canvas>

      {gameState === 'menu'     && <MainMenu />}
      {gameState === 'playing'  && <><HUD /><PowerupHUD /><CoinFX /></>}
      {gameState === 'paused'   && <PauseMenu />}
      {gameState === 'gameover' && <GameOver />}
      
      <DebugOverlay />
      <ErrorDebugger />
    </div>
  );
}


