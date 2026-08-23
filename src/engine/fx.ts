/** FxApi Canvas implementasyonu: uçuşan yazılar + parçacıklar.
 *  Havuzlu ve sınırlı — taşarsa en eskiler düşer (mobil performans hedefi). */
import type { DrawApi, FxApi } from './types.js';
import { easeOutQuad } from './tween.js';

interface FloatText {
  x: number; y: number; str: string; color: string; size: number; bold: boolean;
  rise: number; life: number; t: number;
}
interface Particle {
  x: number; y: number; vx: number; vy: number; color: string; r: number; life: number; t: number;
}

const MAX_TEXTS = 40;
const MAX_PARTICLES = 200;

export class CanvasFx implements FxApi {
  private texts: FloatText[] = [];
  private parts: Particle[] = [];
  /** deterministik testler için enjekte edilebilir */
  constructor(private rand: () => number = Math.random) {}

  floatText(x: number, y: number, str: string, opts: Parameters<FxApi['floatText']>[3] = {}): void {
    if (this.texts.length >= MAX_TEXTS) this.texts.shift();
    this.texts.push({
      x, y, str,
      color: opts.color ?? '#f4e8c8',
      size: opts.size ?? 20,
      bold: opts.bold ?? true,
      rise: opts.riseSpeed ?? 55,
      life: opts.lifeSec ?? 0.9,
      t: 0,
    });
  }

  particles(x: number, y: number, opts: Parameters<FxApi['particles']>[2] = {}): void {
    const count = opts.count ?? 6;
    for (let i = 0; i < count; i++) {
      if (this.parts.length >= MAX_PARTICLES) this.parts.shift();
      const a = this.rand() * Math.PI * 2;
      const sp = (opts.speed ?? 120) * (0.5 + this.rand() * 0.7);
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        color: opts.color ?? '#e8d9a0',
        r: opts.radius ?? 3,
        life: opts.lifeSec ?? 0.45,
        t: 0,
      });
    }
  }

  update(dt: number): void {
    for (const ft of this.texts) ft.t += dt;
    this.texts = this.texts.filter((ft) => ft.t < ft.life);
    for (const p of this.parts) {
      p.t += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 260 * dt;
    }
    this.parts = this.parts.filter((p) => p.t < p.life);
  }

  render(g: DrawApi): void {
    for (const p of this.parts) {
      const k = 1 - p.t / p.life;
      g.circle(p.x, p.y, p.r * (0.5 + k * 0.5), p.color, k);
    }
    for (const ft of this.texts) {
      const k = ft.t / ft.life;
      const y = ft.y - easeOutQuad(k) * ft.rise;
      g.text(ft.str, ft.x, y, { color: ft.color, size: ft.size, bold: ft.bold, align: 'center', alpha: 1 - k * k });
    }
  }

  clear(): void { this.texts = []; this.parts = []; }
}
