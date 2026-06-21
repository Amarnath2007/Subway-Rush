import React from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import App from './App';

// Enable global Three.js cache for preloader effectiveness
THREE.Cache.enabled = true;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

