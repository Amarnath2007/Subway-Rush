// ─── Quality Tier Manager ──────────────────────────────────────────────────
// Detects device capabilities and provides quality settings for the renderer.
// V2: Enhanced mobile detection and more aggressive mobile optimizations.

export type QualityTier = 'low' | 'medium' | 'high';

export interface QualitySettings {
  tier: QualityTier;
  dpr: [number, number];
  chunksAhead: number;
  chunksBehind: number;
  maxParticles: number;
  enableShadows: boolean;
  envDensity: number;       // 0–1, multiplier for environment prop count
  antialias: boolean;
  maxCoinAnimations: number;
  // V2 additions
  shadowMapSize: number;
  maxPointLights: number;
  enablePowerupGlow: boolean;
  enableClouds: boolean;
  enableDistantSkyline: boolean;
  enableStars: boolean;
  envPropCastShadow: boolean;
  sparkleParticles: number;
  fogNear: number;
  fogFar: number;
}

const QUALITY_PRESETS: Record<QualityTier, QualitySettings> = {
  low: {
    tier: 'low',
    dpr: [0.65, 0.85], // More aggressive reduction for low-end mobile
    chunksAhead: 3,   // Reduced for mobile
    chunksBehind: 1,
    maxParticles: 12, // Reduced
    enableShadows: false,
    envDensity: 0.3,  // Reduced
    antialias: false,
    maxCoinAnimations: 20, // Reduced
    shadowMapSize: 512,
    maxPointLights: 0,
    enablePowerupGlow: false,
    enableClouds: false,
    enableDistantSkyline: false,
    enableStars: false,
    envPropCastShadow: false,
    sparkleParticles: 16, // Reduced
    fogNear: 20,
    fogFar: 100, // Thicker fog to hide lower visibility
  },
  medium: {
    tier: 'medium',
    dpr: [0.85, 1],
    chunksAhead: 4,
    chunksBehind: 2,
    maxParticles: 32,
    enableShadows: false,
    envDensity: 0.5,
    antialias: false,
    maxCoinAnimations: 40,
    shadowMapSize: 1024,
    maxPointLights: 1,
    enablePowerupGlow: true,
    enableClouds: true,
    enableDistantSkyline: false,
    enableStars: false,
    envPropCastShadow: false,
    sparkleParticles: 32,
    fogNear: 25,
    fogFar: 150,
  },
  high: {
    tier: 'high',
    dpr: [1, 1.5],
    chunksAhead: 6,
    chunksBehind: 3,
    maxParticles: 96,
    enableShadows: true,
    envDensity: 1.0,
    antialias: true,
    maxCoinAnimations: 120,
    shadowMapSize: 1024,
    maxPointLights: 3,
    enablePowerupGlow: true,
    enableClouds: true,
    enableDistantSkyline: true,
    enableStars: true,
    envPropCastShadow: true,
    sparkleParticles: 96,
    fogNear: 55,
    fogFar: 210,
  },
};

function detectIsMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  const uaMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  const touchMatch = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && 
    window.innerWidth < 1024;
  return uaMatch || touchMatch;
}

function detectIsLowEndMobile(): boolean {
  if (!detectIsMobile()) return false;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  return cores <= 4 || memory <= 4;
}

function detectTier(): QualityTier {
  const isMobile = detectIsMobile();
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8;

  if (isMobile) {
    if (cores <= 4 || memory <= 4) return 'low';
    if (cores >= 8 && memory >= 6) return 'medium'; // Most mobile devices should stick to medium
    return 'low'; 
  }

  if (cores <= 2 || memory <= 4) return 'medium';
  return 'high';
}

class QualityManager {
  private _settings: QualitySettings;
  private _isMobile: boolean;
  private _isLowEnd: boolean;
  private _fpsHistory: number[] = [];
  private _lastFrameTime = 0;
  private _downgradeCount = 0;

  constructor() {
    this._isMobile = detectIsMobile();
    this._isLowEnd = detectIsLowEndMobile();
    const tier = detectTier();
    this._settings = { ...QUALITY_PRESETS[tier] };
    
    // Safety check: force low if explicitly low end
    if (this._isLowEnd) {
      this._settings = { ...QUALITY_PRESETS.low };
    }
  }

  get settings(): QualitySettings {
    return this._settings;
  }

  get isMobile(): boolean {
    return this._isMobile;
  }

  get isLowEnd(): boolean {
    return this._isLowEnd;
  }

  get tier(): QualityTier {
    return this._settings.tier;
  }

  trackFrame() {
    const now = performance.now();
    if (this._lastFrameTime > 0) {
      const fps = 1000 / (now - this._lastFrameTime);
      this._fpsHistory.push(fps);
      if (this._fpsHistory.length > 120) this._fpsHistory.shift();

      const checkThreshold = this._isMobile ? 45 : 90; // Check faster on mobile
      if (this._fpsHistory.length >= checkThreshold && this._downgradeCount < 2) {
        const avgFps = this._fpsHistory.reduce((a, b) => a + b, 0) / this._fpsHistory.length;
        const threshold = this._isMobile ? 32 : 45; // Downgrade if below 32fps on mobile
        if (avgFps < threshold) {
          this._downgrade();
          this._fpsHistory.length = 0;
        }
      }
    }
    this._lastFrameTime = now;
  }

  private _downgrade() {
    this._downgradeCount++;
    const current = this._settings.tier;
    if (current === 'high') {
      this._settings = { ...QUALITY_PRESETS.medium };
      console.info('[QualityManager] Adaptive: Downgraded to MEDIUM');
    } else if (current === 'medium') {
      this._settings = { ...QUALITY_PRESETS.low };
      console.info('[QualityManager] Adaptive: Downgraded to LOW');
    }
  }

  setTier(tier: QualityTier) {
    this._settings = { ...QUALITY_PRESETS[tier] };
  }
}

export const qualityManager = new QualityManager();
