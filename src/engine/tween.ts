/** Basit tween yardımcıları — engine'den bağımsız saf fonksiyonlar. */

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);
export const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);
export const easeOutBack = (t: number): number => {
  const c = 1.70158;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};

/** Zamanla ilerleyen tek değerlik tween. */
export class Tween {
  private t = 0;
  constructor(
    public from: number,
    public to: number,
    public durSec: number,
    public ease: (t: number) => number = easeOutQuad,
  ) {}
  update(dt: number): void { this.t = Math.min(1, this.t + dt / this.durSec); }
  get value(): number { return lerp(this.from, this.to, this.ease(clamp01(this.t))); }
  get done(): boolean { return this.t >= 1; }
}
