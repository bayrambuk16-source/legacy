/** AudioApi Canvas/Web implementasyonu — WebAudio synth (dosyasız, küçük).
 *  AudioContext ilk kullanıcı etkileşiminde açılır; yoksa sessiz düşer. */
import type { AudioApi, SoundKey } from './types.js';

interface Voice { freq: number; freq2?: number; dur: number; type: OscillatorType; vol: number }

const VOICES: Record<SoundKey, Voice> = {
  attack: { freq: 320, freq2: 180, dur: 0.07, type: 'triangle', vol: 0.25 },
  hit: { freq: 140, freq2: 70, dur: 0.1, type: 'square', vol: 0.2 },
  skill: { freq: 520, freq2: 780, dur: 0.14, type: 'sine', vol: 0.3 },
  loot: { freq: 660, freq2: 990, dur: 0.12, type: 'sine', vol: 0.3 },
  death: { freq: 220, freq2: 55, dur: 0.5, type: 'sawtooth', vol: 0.3 },
  levelup: { freq: 440, freq2: 880, dur: 0.35, type: 'triangle', vol: 0.35 },
  ui: { freq: 400, dur: 0.05, type: 'sine', vol: 0.15 },
};

export class WebAudio implements AudioApi {
  private ctx: AudioContext | null = null;
  private on = true;

  constructor() {
    if (typeof document !== 'undefined') {
      const resume = (): void => {
        if (!this.ctx) {
          const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (AC) this.ctx = new AC();
        }
        if (this.ctx?.state === 'suspended') void this.ctx.resume();
      };
      document.addEventListener('pointerdown', resume);
      document.addEventListener('keydown', resume);
    }
  }

  get enabled(): boolean { return this.on; }
  setEnabled(on: boolean): void { this.on = on; }

  play(key: SoundKey): void {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    const v = VOICES[key];
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = v.type;
    osc.frequency.setValueAtTime(v.freq, t0);
    if (v.freq2 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, v.freq2), t0 + v.dur);
    gain.gain.setValueAtTime(v.vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + v.dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + v.dur + 0.02);
  }
}

/** Test/headless ortamı için sessiz implementasyon. */
export class NullAudio implements AudioApi {
  private on = true;
  get enabled(): boolean { return this.on; }
  setEnabled(on: boolean): void { this.on = on; }
  play(): void { /* sessiz */ }
}
