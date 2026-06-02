// ─── Quality Tier Manager ──────────────────────────────────────────────────
// Detects device capabilities and provides quality settings for the renderer.

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
}

const QUALITY_PRESETS: Record<QualityTier, QualitySettings> = {
  low: {
    tier: 'low',
    dpr: [1, 1],
    chunksAhead: 4,
    chunksBehind: 2,
    maxParticles: 32,
    enableShadows: false,
    envDensity: 0.5,
    antialias: false,
    maxCoinAnimations: 40,
  },
  medium: {
    tier: 'medium',
    dpr: [1, 1.25],
    chunksAhead: 5,
    chunksBehind: 2,
    maxParticles: 64,
    enableShadows: false,
    envDensity: 0.75,
    antialias: false,
    maxCoinAnimations: 80,
  },
  high: {
    tier: 'high',
    dpr: [1, 1.5],
    chunksAhead: 6,
    chunksBehind: 3,
    maxParticles: 96,
    enableShadows: false,
    envDensity: 1.0,
    antialias: false,
    maxCoinAnimations: 120,
  },
};

function detectIsMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
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
  private _fpsHistory: number[] = [];
  private _lastFrameTime = 0;
  private _downgradeCount = 0;

  constructor() {
    this._isMobile = detectIsMobile();
    const tier = detectTier();
    this._settings = { ...QUALITY_PRESETS[tier] };
  }

  get settings(): QualitySettings {
    return this._settings;
  }

  get isMobile(): boolean {
    return this._isMobile;
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

      // Check after 90 frames of data
      if (this._fpsHistory.length >= 90 && this._downgradeCount < 2) {
        const avgFps =
          this._fpsHistory.reduce((a, b) => a + b, 0) / this._fpsHistory.length;

        const threshold = this._isMobile ? 35 : 45;
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
