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
    dpr: [0.75, 1],
    chunksAhead: 4,
    chunksBehind: 1,
    maxParticles: 16,
    enableShadows: false,
    envDensity: 0.4,
    antialias: false,
    maxCoinAnimations: 30,
    shadowMapSize: 512,
    maxPointLights: 0,
    enablePowerupGlow: false,
    enableClouds: false,
    enableDistantSkyline: false,
    enableStars: false,
    envPropCastShadow: false,
    sparkleParticles: 24,
    fogNear: 25,
    fogFar: 140,
  },
  medium: {
    tier: 'medium',
    dpr: [1, 1.25],
    chunksAhead: 5,
    chunksBehind: 2,
    maxParticles: 48,
    enableShadows: false,
    envDensity: 0.65,
    antialias: false,
    maxCoinAnimations: 60,
    shadowMapSize: 1024,
    maxPointLights: 1,
    enablePowerupGlow: true,
    enableClouds: true,
    enableDistantSkyline: false,
    enableStars: false,
    envPropCastShadow: false,
    sparkleParticles: 48,
    fogNear: 30,
    fogFar: 180,
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
  // Check user agent
  const uaMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  // Also check touch support + small screen as a fallback
  const touchMatch = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && 
    window.innerWidth < 1024;
  return uaMatch || touchMatch;
}

function detectIsLowEndMobile(): boolean {
  if (!detectIsMobile()) return false;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  return cores <= 4 || memory <= 3;
}

function detectTier(): QualityTier {
  const isMobile = detectIsMobile();

  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency ?? 4;

  // Check device memory (Chrome only)
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8;

  // Mobile with low specs → low
  if (isMobile) {
    if (cores <= 4 || memory <= 4) return 'low';
    return 'medium';
  }

  // Desktop with low specs → medium
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

  /** Call every frame to track FPS and adaptively downgrade */
  trackFrame() {
    const now = performance.now();
    if (this._lastFrameTime > 0) {
      const fps = 1000 / (now - this._lastFrameTime);
      this._fpsHistory.push(fps);

      // Keep only last 120 frames (about 2 seconds)
      if (this._fpsHistory.length > 120) {
        this._fpsHistory.shift();
      }

      // Check after 60 frames of data (react faster on mobile)
      const checkThreshold = this._isMobile ? 60 : 90;
      if (this._fpsHistory.length >= checkThreshold && this._downgradeCount < 2) {
        const avgFps =
          this._fpsHistory.reduce((a, b) => a + b, 0) / this._fpsHistory.length;

        const threshold = this._isMobile ? 30 : 45;
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
      console.info('[QualityManager] Downgraded to MEDIUM quality');
    } else if (current === 'medium') {
      this._settings = { ...QUALITY_PRESETS.low };
      console.info('[QualityManager] Downgraded to LOW quality');
    }
  }

  setTier(tier: QualityTier) {
    this._settings = { ...QUALITY_PRESETS[tier] };
  }
}

export const qualityManager = new QualityManager();
