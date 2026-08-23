/** KO tarzı hedefleme: aktif tek `targetUid`. Otomatik olarak herkese vurulmaz.
 *  Hedef ölür ya da geçerli mesafeden çıkarsa temizlenir. */
import type { WorldMob } from './types.js';

export interface TargetPickOptions {
  /** Dokunma/tık yarıçapı (world birimi) */
  pickRadius: number;
  /** Bu mesafenin ötesindeki hedef geçersiz sayılır (world birimi) */
  dropDistance: number;
}

export class WorldTargetSystem {
  private targetUid: number | null = null;

  get selectedUid(): number | null { return this.targetUid; }
  clear(): void { this.targetUid = null; }
  select(uid: number): void { this.targetUid = uid; }

  /** World noktasına en yakın canlı mobu seçer (pickRadius içinde). */
  pickAt(mobs: WorldMob[], worldX: number, worldY: number, pickRadius: number): WorldMob | null {
    let best: WorldMob | null = null, bestD = Infinity;
    for (const m of mobs) {
      if (m.ai === 'dead' || m.state === 'dying') continue;
      const d = Math.hypot(m.worldX - worldX, m.worldY - worldY);
      if (d <= pickRadius && d < bestD) { bestD = d; best = m; }
    }
    if (best) this.targetUid = best.uid;
    return best;
  }

  /** "En Yakın Hedef" düğmesi için. */
  selectNearest(mobs: WorldMob[], fromX: number, fromY: number, maxDist: number): WorldMob | null {
    let best: WorldMob | null = null, bestD = Infinity;
    for (const m of mobs) {
      if (m.ai === 'dead' || m.state === 'dying') continue;
      const d = Math.hypot(m.worldX - fromX, m.worldY - fromY);
      if (d <= maxDist && d < bestD) { bestD = d; best = m; }
    }
    if (best) this.targetUid = best.uid;
    return best;
  }

  /** Geçerli hedefi döndürür; ölü/uzak/yok ise temizler ve null döner.
   *  Otomatik olarak başka hedefe ATLAMAZ (KO ruhu: hedef oyuncunun kararı). */
  current(mobs: WorldMob[], playerX: number, playerY: number, opts: TargetPickOptions): WorldMob | null {
    if (this.targetUid === null) return null;
    const m = mobs.find((x) => x.uid === this.targetUid);
    if (!m || m.ai === 'dead' || m.state === 'dying') { this.targetUid = null; return null; }
    const d = Math.hypot(m.worldX - playerX, m.worldY - playerY);
    if (d > opts.dropDistance) { this.targetUid = null; return null; }
    return m;
  }
}
