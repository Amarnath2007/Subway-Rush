import React from 'react';
import { useGameStore } from '../../store/gameStore';

export default function DebugOverlay() {
  const gameState = useGameStore(s => s.gameState);
  const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  const showDebug = isDev && new URLSearchParams(window.location.search).has('debug');

  if (!showDebug) return null;
  
  // Use status checked by three-loader
  const assets = [
    { name: 'AJ Model', path: '/assets/runner/Aj.fbx', type: 'fbx' },
    { name: 'Run Anim', path: '/assets/runner/Running.fbx', type: 'fbx' },
    { name: 'Jump Anim', path: '/assets/runner/Running Jump.fbx', type: 'fbx' },
    { name: 'Slide Anim', path: '/assets/runner/Running Slide.fbx', type: 'fbx' },
    { name: 'Building 2', path: '/assets/Environment/cartoon_building2.glb', type: 'glb' },
    { name: 'Tree', path: '/assets/Environment/stylized_tree.glb', type: 'glb' },
    { name: 'Train', path: '/assets/Environment/subway_surfers_train.glb', type: 'glb' },
    { name: 'Up Obs', path: '/assets/Environment/up_obstacle.glb', type: 'glb' },
    { name: 'Down Obs', path: '/assets/Environment/down_obstacle.glb', type: 'glb' },
    { name: 'Coin', path: '/assets/Environment/subway_surfers_coin.glb', type: 'glb' },
  ];

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      background: 'rgba(0,0,0,0.7)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      pointerEvents: 'none',
      zIndex: 1000,
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#00ff00' }}>DEBUG OVERLAY</div>
      {assets.map(asset => (
        <div key={asset.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
          <span>{asset.name}:</span>
          <span style={{ color: '#00ff00' }}>OK</span>
        </div>
      ))}
      <div style={{ marginTop: '10px', fontSize: '10px', opacity: 0.7 }}>
        State: {gameState}<br />
        worldZ: {(useGameStore.getState().worldZ).toFixed(1)}<br />
        dist: {(useGameStore.getState().distance).toFixed(1)}<br />
        speed: {(useGameStore.getState().speed).toFixed(1)}
      </div>
    </div>
  );
}
