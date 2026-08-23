/** PROTOTİP İKSİR SİSTEMİ — SABİT geri kazanım (P1.4.1)
 *
 *  Ana `ConsumableSystem` yüzdelik (`percentOfMax`) çalışır ve O DOSYA
 *  DEĞİŞTİRİLMEDİ. Prototip KO kaynağına sadık olmak için sabit miktar kullanır:
 *
 *      after = min(max, before + restoreAmount)
 *
 *  Yavaş dolum YOK, mana-over-time YOK: kullanıldığı anda uygulanır.
 *  Yüzde YALNIZ Genie eşiği (ne zaman içileceği) içindir — miktar için değil.
 *
 *  ATOMİKLİK (ana sistemle aynı disiplin):
 *    1) doğrulamalar  → hiçbir mutasyon yok
 *    2) delta hesabı  → saf
 *    3) adet düşürme  → InventoryState (authoritative)
 *    4) delta uygula
 *  Başarısız kullanımda HP/MP ve adet DEĞİŞMEZ.
 *
 *  COOLDOWN YOK: kaynak `recast_time = 1` / `cast_time = 5` alanlarının birimi
 *  DOĞRULANMADI (POTION RECAST SEMANTIC UNRESOLVED) → uydurma cooldown eklenmedi.
 *  Kullanım temposunu yalnız Genie'nin karar tiki belirler. */
import type { InventoryState } from '../../../src/game/systems/InventoryState.js';
import type { PlayerState } from '../../../src/game/systems/PlayerState.js';
import type { CharacterStats } from '../../../src/game/systems/CharacterStats.js';
import { koPotion, type KoPotionProfile, type PotionResource } from '../data/ko-potions.js';

export type PotionFail = 'noProfile' | 'outOfStock' | 'full' | 'locked';

export interface PotionUseResult {
  ok: boolean;
  fail?: PotionFail;
  itemRef: number;
  displayName: string;
  resource: PotionResource;
  /** Kaynak sabit miktar. */
  restoreAmount: number;
  before: number;
  after: number;
  /** GERÇEKTEN kazanılan (clamp sonrası). */
  actual: number;
  /** Tavana takıldığı için ZİYAN olan kısım. */
  wasted: number;
  /** Kullanımdan sonra kalan adet. */
  remaining: number;
}

function emptyResult(p: KoPotionProfile, fail: PotionFail, remaining: number): PotionUseResult {
  return {
    ok: false, fail, itemRef: p.itemRef, displayName: p.displayName, resource: p.resource,
    restoreAmount: p.restoreAmount, before: 0, after: 0, actual: 0, wasted: 0, remaining,
  };
}

export class KoPotionSystem {
  constructor(
    private inventory: InventoryState,
    private player: PlayerState,
    private stats: CharacterStats,
  ) {}

  /** Çantadaki toplam adet (yığınlar toplanır). */
  stock(itemRef: number): number {
    let n = 0;
    for (const { entry } of this.inventory.bagList()) {
      if (entry.itemRef === itemRef) n += entry.quantity;
    }
    return n;
  }

  /** Kullanılabilir ilk yığının instanceId'si (kilitli/kuşanılı olanı atlar). */
  private firstUsable(itemRef: number): number | null {
    for (const { entry } of this.inventory.bagList()) {
      if (entry.itemRef !== itemRef || entry.quantity <= 0) continue;
      if (!this.inventory.canConsume(entry.instanceId, 1).ok) continue;
      return entry.instanceId;
    }
    return null;
  }

  /** Bu iksir şu an bir işe yarar mı? (dolu HP/MP ile boşa harcanmasın) */
  wouldHelp(itemRef: number): boolean {
    const p = koPotion(itemRef);
    if (!p) return false;
    const f = this.stats.finalStats();
    return p.resource === 'hp' ? this.player.hp < f.maxHp : this.player.mp < f.maxMp;
  }

  /** Sabit miktarlı kullanım. */
  use(itemRef: number): PotionUseResult {
    const p = koPotion(itemRef);
    if (!p) {
      return {
        ok: false, fail: 'noProfile', itemRef, displayName: '—', resource: 'hp',
        restoreAmount: 0, before: 0, after: 0, actual: 0, wasted: 0, remaining: 0,
      };
    }
    /* 1) doğrulamalar */
    const stock = this.stock(itemRef);
    if (stock <= 0) return emptyResult(p, 'outOfStock', 0);
    const instanceId = this.firstUsable(itemRef);
    if (instanceId === null) return emptyResult(p, 'locked', stock);

    const f = this.stats.finalStats();
    const before = p.resource === 'hp' ? this.player.hp : this.player.mp;
    const max = p.resource === 'hp' ? f.maxHp : f.maxMp;
    if (before >= max) return emptyResult(p, 'full', stock);

    /* 2) saf delta */
    const after = Math.min(max, before + p.restoreAmount);
    const actual = after - before;

    /* 3) adet düşürme — başarısızsa etki UYGULANMAZ */
    if (!this.inventory.consume(instanceId, 1)) return emptyResult(p, 'locked', stock);

    /* 4) uygula */
    if (p.resource === 'hp') this.player.hp = after; else this.player.mp = after;

    return {
      ok: true, itemRef, displayName: p.displayName, resource: p.resource,
      restoreAmount: p.restoreAmount,
      before: Math.round(before), after: Math.round(after),
      actual: Math.round(actual), wasted: Math.round(p.restoreAmount - actual),
      remaining: this.stock(itemRef),
    };
  }
}
