type SourceSet = Set<AudioScheduledSourceNode>;

interface ToneOptions {
  type?: OscillatorType;
  volume?: number;
  attack?: number;
  release?: number;
  delay?: number;
  slideTo?: number;
  destination?: AudioNode;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const AUDIO_SAVE_KEY = 'subway_rush_audio_v1';

interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  
  private bgm: HTMLAudioElement | null = null;
  private bgmSource: MediaElementAudioSourceNode | null = null;
  
  private sfxSources: SourceSet = new Set();
  private lastSfx = new Map<string, number>();
  
  private masterVolume = 0.85;
  private musicVolume = 0.45;
  private sfxVolume = 0.75;
  private musicEnabled = true;
  private sfxEnabled = true;

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem(AUDIO_SAVE_KEY);
      if (saved) {
        const settings: AudioSettings = JSON.parse(saved);
        this.masterVolume = settings.masterVolume ?? 0.85;
        this.musicVolume = settings.musicVolume ?? 0.45;
        this.sfxVolume = settings.sfxVolume ?? 0.75;
        this.musicEnabled = settings.musicEnabled ?? true;
        this.sfxEnabled = settings.sfxEnabled ?? true;
      }
    } catch (e) {
      console.warn('Failed to load audio settings', e);
    }
  }

  private saveSettings() {
    try {
      const settings: AudioSettings = {
        masterVolume: this.masterVolume,
        musicVolume: this.musicVolume,
        sfxVolume: this.sfxVolume,
        musicEnabled: this.musicEnabled,
        sfxEnabled: this.sfxEnabled,
      };
      localStorage.setItem(AUDIO_SAVE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save audio settings', e);
    }
  }

  private getCtx(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtor();
      this.masterGain = this.audioCtx.createGain();
      this.musicGain = this.audioCtx.createGain();
      this.sfxGain = this.audioCtx.createGain();
      this.ambientGain = this.audioCtx.createGain();
      
      this.masterGain.connect(this.audioCtx.destination);
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.ambientGain.connect(this.masterGain);
      
      this.applyVolumes();
      this.startAmbient();
      this.initBGM();
    }
    return this.audioCtx;
  }

  private initBGM() {
    if (!this.bgm && this.audioCtx && this.musicGain) {
      this.bgm = new Audio('/assets/BGM- mfcc-retro-arcade-game-music-297305.mp3');
      this.bgm.loop = true;
      this.bgm.crossOrigin = 'anonymous';
      this.bgmSource = this.audioCtx.createMediaElementSource(this.bgm);
      this.bgmSource.connect(this.musicGain);
    }
  }

  unlock() {
    this.resume();
  }

  private applyVolumes() {
    if (!this.audioCtx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.audioCtx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.masterVolume, now, 0.05);
    this.musicGain.gain.setTargetAtTime(this.musicEnabled ? this.musicVolume : 0, now, 0.1);
    this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? this.sfxVolume : 0, now, 0.05);
    if (this.ambientGain) this.ambientGain.gain.setTargetAtTime(this.sfxEnabled ? 0.05 : 0, now, 0.5);
  }

  private startAmbient() {
    if (!this.audioCtx || !this.ambientGain) return;
    
    const bufferSize = 2 * this.audioCtx.sampleRate;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 120;
    
    noise.connect(filter);
    filter.connect(this.ambientGain);
    noise.start();
  }

  private resume() {
    const ctx = this.getCtx();
    if (ctx.state === 'suspended') void ctx.resume();
  }

  private register(source: AudioScheduledSourceNode, set: SourceSet) {
    set.add(source);
    source.addEventListener('ended', () => set.delete(source), { once: true });
  }

  private canPlay(key: string, cooldownMs: number): boolean {
    if (!this.sfxEnabled) return false;
    const now = performance.now();
    const last = this.lastSfx.get(key) ?? -Infinity;
    if (now - last < cooldownMs) return false;
    this.lastSfx.set(key, now);
    return true;
  }

  private playTone(freq: number, duration: number, options: ToneOptions = {}) {
    const ctx = this.getCtx();
    const destination = options.destination ?? this.sfxGain;
    if (!destination) return;

    const start = ctx.currentTime + (options.delay ?? 0);
    const attack = options.attack ?? 0.01;
    const release = options.release ?? 0.05;
    const volume = options.volume ?? 0.15;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = options.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, start);
    if (options.slideTo && options.slideTo > 0) {
      osc.frequency.exponentialRampToValueAtTime(options.slideTo, start + duration);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + attack);
    gain.gain.setTargetAtTime(0.0001, start + Math.max(attack, duration - release), release);

    osc.connect(gain);
    gain.connect(destination);
    this.register(osc, this.sfxSources);
    osc.start(start);
    osc.stop(start + duration + release * 3);
  }

  startBGMusic() {
    this.resume();
    this.initBGM();
    if (this.bgm && this.musicEnabled && this.bgm.paused) {
      this.bgm.play().catch(e => console.warn('BGM play failed', e));
    }
  }

  stopBGMusic() {
    if (this.bgm) {
      this.bgm.pause();
    }
  }

  playCoin() {
    if (!this.canPlay('coin', 40)) return;
    this.resume();
    this.playTone(987.77, 0.08, { type: 'sine', volume: 0.15 });
    this.playTone(1318.51, 0.1, { type: 'triangle', volume: 0.1, delay: 0.04 });
  }

  playJump() {
    if (!this.canPlay('jump', 150)) return;
    this.resume();
    this.playTone(180, 0.15, { type: 'square', volume: 0.1, slideTo: 440 });
  }

  playSlide() {
    if (!this.canPlay('slide', 200)) return;
    this.resume();
    this.playTone(800, 0.4, { type: 'triangle', volume: 0.08, slideTo: 200 });
  }

  playLaneSwitch() {
    if (!this.canPlay('lane', 60)) return;
    this.resume();
    this.playTone(440, 0.06, { type: 'sine', volume: 0.05, slideTo: 220 });
  }

  playPowerup() {
    this.resume();
    [523, 659, 783, 1046].forEach((f, i) => {
        this.playTone(f, 0.1, { volume: 0.15, delay: i * 0.06 });
    });
  }

  playGameOver() {
    this.resume();
    this.playTone(220, 0.5, { type: 'sawtooth', volume: 0.2, slideTo: 55 });
  }

  playCrash() { this.playGameOver(); }

  setVolumes({ master, music, sfx }: { master?: number; music?: number; sfx?: number }) {
    if (master !== undefined) this.masterVolume = clamp01(master);
    if (music !== undefined) this.musicVolume = clamp01(music);
    if (sfx !== undefined) this.sfxVolume = clamp01(sfx);
    this.applyVolumes();
    this.saveSettings();
  }

  get volumes() {
    return {
      master: this.masterVolume,
      music: this.musicVolume,
      sfx: this.sfxVolume,
      musicEnabled: this.musicEnabled,
      sfxEnabled: this.sfxEnabled
    };
  }
  
  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    this.applyVolumes();
    if (this.musicEnabled) this.startBGMusic();
    else this.stopBGMusic();
    this.saveSettings();
    return this.musicEnabled;
  }

  toggleSFX() {
    this.sfxEnabled = !this.sfxEnabled;
    this.applyVolumes();
    this.saveSettings();
    return this.sfxEnabled;
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    this.applyVolumes();
    if (this.musicEnabled) this.startBGMusic();
    else this.stopBGMusic();
    this.saveSettings();
  }

  setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    this.applyVolumes();
    this.saveSettings();
  }
}

export const soundManager = new SoundManager();

