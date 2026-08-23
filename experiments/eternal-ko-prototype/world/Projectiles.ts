/** GÖRSEL yardımcılar — SADECE görsel.
 *
 *  P1.4'TEN İTİBAREN OKLARI BU SİSTEM ÜRETMEZ. Gerçek oklar artık
 *  `CombatPipeline.projectiles` içindedir ve hasar onların impact anında
 *  uygulanır. Burada yalnız DEBUG IŞINLARI ve (geriye dönük) eski ok görseli
 *  kalır; ikisi de gameplay'i etkilemez.
 *
 *  ESKİ AÇIKLAMA (P1.3 ve öncesi):
 *
 *  ÖNEMLİ: Oynanış çarpışması bu sistemden BAĞIMSIZDIR. İsabet kararı zaten
 *  `MultiShot.resolveMultiShot()` içinde geometrik olarak verilmiştir; buradaki
 *  oklar o kararın görselleştirilmesidir. Ok görseli takılsa/gecikse bile
 *  hasar sonucu değişmez (renderer-free test edilebilir olması için sistem
 *  Scene'den ayrıdır). */
import type { MultiShotResolution } from './MultiShot.js';

export const ARROW = {
  /** world birimi / sn */
  speed: 1500,
  /** vardıktan sonra sönme süresi (sn) */
  fadeSec: 0.22,
  /** hata payı: ıskalayan ok menzil sonuna kadar uçar */
  missTailSec: 0.10,
  /** debug ışınlarının ekranda kalma süresi (sn) */
  rayDebugSec: 0.7,
} as const;

export interface ArrowFx {
  id: number;
  originX: number; originY: number;
  dx: number; dy: number;
  /** uçacağı toplam mesafe (isabetliyse hedefe kadar, değilse menzil sonu) */
  distance: number;
  traveled: number;
  hit: boolean;
  /** vardıktan sonra geriye kalan sönme süresi */
  fade: number;
  done: boolean;
}

export interface DebugRay {
  originX: number; originY: number;
  dx: number; dy: number;
  distance: number;
  hit: boolean;
  life: number;
}


export class ProjectileFxSystem {
  readonly arrows: ArrowFx[] = [];
  /** P1.6.1 — görsel ok id sayacı örnek kapsamında. */
  private nextArrowId = 1;
  readonly rays: DebugRay[] = [];

  /** P1.4 — yalnız DEBUG IŞINLARI (ok görseli artık pipeline'da). */
  spawnRays(res: MultiShotResolution): void {
    for (const r of res.rays) {
      this.rays.push({
        originX: r.originX, originY: r.originY,
        dx: r.dx, dy: r.dy, distance: r.travel,
        hit: r.hit !== null, life: ARROW.rayDebugSec,
      });
    }
  }

  /** LEGACY (P1.3 ve öncesi) — çözülmüş bir multi-shot'ı görselleştirir. */
  spawnFromResolution(res: MultiShotResolution): void {
    for (const r of res.rays) {
      this.arrows.push({
        id: this.nextArrowId++,
        originX: r.originX, originY: r.originY,
        dx: r.dx, dy: r.dy,
        distance: r.travel,
        traveled: 0,
        hit: r.hit !== null,
        fade: ARROW.fadeSec,
        done: false,
      });
      this.rays.push({
        originX: r.originX, originY: r.originY,
        dx: r.dx, dy: r.dy, distance: r.travel,
        hit: r.hit !== null, life: ARROW.rayDebugSec,
      });
    }
  }

  /** Tek oklu saldırı (temel atış / tek hedefli skill) görseli. */
  spawnSingle(ox: number, oy: number, tx: number, ty: number, hit = true): void {
    const d = Math.hypot(tx - ox, ty - oy);
    if (d < 1e-6) return;
    this.arrows.push({
      id: this.nextArrowId++,
      originX: ox, originY: oy,
      dx: (tx - ox) / d, dy: (ty - oy) / d,
      distance: d, traveled: 0, hit,
      fade: ARROW.fadeSec, done: false,
    });
  }

  update(dt: number): void {
    for (const a of this.arrows) {
      if (a.traveled < a.distance) {
        a.traveled = Math.min(a.distance, a.traveled + ARROW.speed * dt);
      } else {
        a.fade -= dt;
        if (a.fade <= 0) a.done = true;
      }
    }
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      if (this.arrows[i].done) this.arrows.splice(i, 1);
    }
    for (let i = this.rays.length - 1; i >= 0; i--) {
      this.rays[i].life -= dt;
      if (this.rays[i].life <= 0) this.rays.splice(i, 1);
    }
  }

  /** Okun o anki dünya konumu (renderer bunu projeksiyona verir). */
  static position(a: ArrowFx): { x: number; y: number } {
    return { x: a.originX + a.dx * a.traveled, y: a.originY + a.dy * a.traveled };
  }

  clear(): void { this.arrows.length = 0; this.rays.length = 0; }
}
