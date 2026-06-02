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

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicSources: SourceSet = new Set();
  private sfxSources: SourceSet = new Set();
  private lastSfx = new Map<string, number>();
  private musicStep = 0;
  private musicEnabled = true;
  private sfxEnabled = true;
  private musicVolume = 0.32;
  private sfxVolume = 0.62;

  private getCtx(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtor();
      this.masterGain = this.audioCtx.createGain();
      this.musicGain = this.audioCtx.createGain();
      this.sfxGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.audioCtx.destination);
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.applyVolumes();
    }

    return this.audioCtx;
  }

  private applyVolumes() {
    if (!this.audioCtx || !this.musicGain || !this.sfxGain) return;
    const now = this.audioCtx.currentTime;
    this.musicGain.gain.setTargetAtTime(this.musicEnabled ? this.musicVolume * 0.18 : 0, now, 0.035);
    this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? this.sfxVolume * 0.45 : 0, now, 0.02);
  }

  private resume() {
    const ctx = this.getCtx();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
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
    if (this.sfxSources.size > 10) return false;
    this.lastSfx.set(key, now);
    return true;
  }

  private playTone(freq: number, duration: number, options: ToneOptions = {}) {
    const ctx = this.getCtx();
    const destination = options.destination ?? this.sfxGain;
    if (!destination) return;

    const start = ctx.currentTime + (options.delay ?? 0);
    const attack = options.attack ?? 0.008;
    const release = options.release ?? 0.04;
    const volume = options.volume ?? 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = options.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, start);
    if (options.slideTo && options.slideTo > 0) {
      osc.frequency.exponentialRampToValueAtTime(options.slideTo, start + duration);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + attack);
    gain.gain.setTargetAtTime(0.0001, start + Math.max(attack, duration - release), Math.max(0.01, release));

    osc.connect(gain);
    gain.connect(destination);
    this.register(osc, destination === this.musicGain ? this.musicSources : this.sfxSources);
    osc.start(start);
    osc.stop(start + duration + release * 2);
  }

  private playNoise(duration: number, volume: number, filterFreq: number, key: 'slide' | 'gameOver') {
    const ctx = this.getCtx();
    if (!this.sfxGain) return;

    const frameCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
    }

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = key === 'slide' ? 'lowpass' : 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = key === 'slide' ? 0.5 : 0.8;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    this.register(source, this.sfxSources);
    source.start();
    source.stop(ctx.currentTime + duration);
  }

  private scheduleMusicPhrase() {
    if (!this.musicEnabled || !this.musicGain) return;
    const ctx = this.getCtx();
    const start = ctx.currentTime + 0.04;
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    const bass = [130.81, 146.83, 164.81, 196.0];
    const phrase = [
      [0, 2, 4, 2],
      [1, 3, 5, 3],
      [2, 4, 5, 4],
      [0, 3, 4, 2],
    ][this.musicStep % 4];

    for (let i = 0; i < phrase.length; i++) {
      const noteTime = start + i * 0.34;
      this.playTone(scale[phrase[i]], 0.16, {
        type: 'triangle',
        volume: 0.18,
        attack: 0.018,
        release: 0.08,
        delay: noteTime - ctx.currentTime,
        destination: this.musicGain,
      });
      this.playTone(scale[phrase[i]] * 2, 0.08, {
        type: 'sine',
        volume: 0.045,
        attack: 0.01,
        release: 0.06,
        delay: noteTime + 0.08 - ctx.currentTime,
        destination: this.musicGain,
      });
    }

    this.playTone(bass[this.musicStep % bass.length], 1.15, {
      type: 'sine',
      volume: 0.08,
      attack: 0.08,
      release: 0.24,
      delay: start - ctx.currentTime,
      destination: this.musicGain,
    });

    this.musicStep += 1;
  }

  unlock() {
    this.resume();
  }

  startBGMusic() {
    if (!this.musicEnabled || this.musicTimer) return;
    this.resume();
    this.scheduleMusicPhrase();
    this.musicTimer = setInterval(() => this.scheduleMusicPhrase(), 1360);
  }

  stopBGMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }

    for (const source of this.musicSources) {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    }
    this.musicSources.clear();
  }

  playCoin() {
    if (!this.canPlay('coin', 38)) return;
    this.resume();
    this.playTone(1046.5, 0.07, { type: 'sine', volume: 0.12, attack: 0.004, release: 0.05 });
    this.playTone(1568, 0.09, { type: 'triangle', volume: 0.08, attack: 0.004, release: 0.06, delay: 0.045 });
  }

  playJump() {
    if (!this.canPlay('jump', 120)) return;
    this.resume();
    this.playTone(260, 0.2, { type: 'sine', volume: 0.08, slideTo: 520, release: 0.08 });
  }

  playSlide() {
    if (!this.canPlay('slide', 170)) return;
    this.resume();
    this.playNoise(0.18, 0.08, 560, 'slide');
  }

  playLaneSwitch() {
    if (!this.canPlay('lane', 55)) return;
    this.resume();
    this.playTone(620, 0.055, { type: 'triangle', volume: 0.045, slideTo: 470, release: 0.03 });
  }

  playGameOver() {
    if (!this.canPlay('gameOver', 650)) return;
    this.resume();
    this.playTone(392, 0.16, { type: 'triangle', volume: 0.11, slideTo: 247, release: 0.08 });
    this.playTone(196, 0.22, { type: 'sine', volume: 0.08, slideTo: 130, release: 0.12, delay: 0.09 });
    this.playNoise(0.16, 0.05, 260, 'gameOver');
  }

  playCrash() {
    this.playGameOver();
  }

  playWarning() {
    if (!this.canPlay('warning', 500)) return;
    this.resume();
    this.playTone(220, 0.12, { type: 'triangle', volume: 0.05, slideTo: 185, release: 0.08 });
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    this.applyVolumes();
    if (this.musicEnabled) this.startBGMusic();
    else this.stopBGMusic();
    return this.musicEnabled;
  }

  toggleSFX() {
    this.sfxEnabled = !this.sfxEnabled;
    this.applyVolumes();
    return this.sfxEnabled;
  }

  setMusicVolume(value: number) {
    this.musicVolume = clamp01(value);
    this.applyVolumes();
    if (this.musicVolume > 0 && this.musicEnabled) this.startBGMusic();
    return this.musicVolume;
  }

  setSFXVolume(value: number) {
    this.sfxVolume = clamp01(value);
    this.applyVolumes();
    return this.sfxVolume;
  }

  get isMusicEnabled() { return this.musicEnabled; }
  get isSFXEnabled() { return this.sfxEnabled; }
  get getMusicVolume() { return this.musicVolume; }
  get getSFXVolume() { return this.sfxVolume; }
}

export const soundManager = new SoundManager();
