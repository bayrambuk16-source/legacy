/** Sprite-sheet frame animatörü — engine'den bağımsız; çizim DrawApi üzerinden.
 *  Sheet düzeni: satır = animasyon/yön, sütun = kare. */
import type { DrawApi } from './types.js';

export interface AnimDef {
  sheetKey: string;
  frameW: number;
  frameH: number;
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
}

export class SpriteAnimator {
  private def: AnimDef;
  private t = 0;
  private finished = false;

  constructor(def: AnimDef) { this.def = def; }

  /** Animasyonu değiştirir (aynı def gelirse zaman korunur). */
  play(def: AnimDef, restart = false): void {
    if (!restart && this.def.sheetKey === def.sheetKey && this.def.row === def.row) { this.def = def; return; }
    this.def = def; this.t = 0; this.finished = false;
  }

  update(dt: number): void {
    if (this.finished) return;
    this.t += dt;
    if (!this.def.loop && this.frameIndex() >= this.def.frames - 1) this.finished = true;
  }

  frameIndex(): number {
    const i = Math.floor(this.t * this.def.fps);
    return this.def.loop ? i % this.def.frames : Math.min(i, this.def.frames - 1);
  }

  get done(): boolean { return this.finished; }

  render(g: DrawApi, x: number, y: number, opts: { scale?: number; flipX?: boolean; alpha?: number; originX?: number; originY?: number } = {}): void {
    const f = this.frameIndex();
    const s = opts.scale ?? 1;
    g.image(this.def.sheetKey, x, y, {
      sx: f * this.def.frameW, sy: this.def.row * this.def.frameH,
      sw: this.def.frameW, sh: this.def.frameH,
      w: this.def.frameW * s, h: this.def.frameH * s,
      flipX: opts.flipX, alpha: opts.alpha,
      originX: opts.originX ?? 0.5, originY: opts.originY ?? 1,
    });
  }
}
