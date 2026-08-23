/** Hedef seçimi: dokunulan düşman hedef olur; hedef ölür/kaybolursa
 *  en yakındaki canlı düşmana otomatik geçilir (karma oynanış kararı). */
import type { EnemyUnit } from './SpawnSystem.js';

export class TargetSystem {
  private targetUid: number | null = null;

  select(uid: number): void { this.targetUid = uid; }
  clear(): void { this.targetUid = null; }

  /** Geçerli hedefi döndürür; geçersizse en yakına düşer. */
  current(enemies: EnemyUnit[], playerX: number): EnemyUnit | null {
    const alive = enemies.filter((e) => e.state !== 'dying');
    if (alive.length === 0) { this.targetUid = null; return null; }
    const chosen = alive.find((e) => e.uid === this.targetUid);
    if (chosen) return chosen;
    let best: EnemyUnit | null = null;
    let bestDist = Infinity;
    for (const e of alive) {
      const d = Math.abs(e.x - playerX);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    this.targetUid = best?.uid ?? null;
    return best;
  }

  /** Dokunma noktasına göre düşman seç; isabet varsa true. */
  tapSelect(enemies: EnemyUnit[], x: number, y: number, hitRadius: number): boolean {
    for (const e of enemies) {
      if (e.state === 'dying') continue;
      if (Math.hypot(e.x - x, e.y - 40 - y) <= hitRadius) {
        this.targetUid = e.uid;
        return true;
      }
    }
    return false;
  }

  get selectedUid(): number | null { return this.targetUid; }
}
