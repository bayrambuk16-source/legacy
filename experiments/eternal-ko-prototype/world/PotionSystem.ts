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
 *  ══════════════ P2.32 — COOLDOWN EKLENDİ ══════════════
 *  Eskiden cooldown YOKTU: kaynak `recast_time` / `cast_time` alanlarının
 *  birimi doğrulanamadığı için uydurma bir sayı konmamıştı ve tempoyu
 *  yalnız Genie'nin karar tiki belirliyordu.
 *
 *  Oyun testinde bu bir kusur olarak bildirildi: iksir sınırsız hızda
 *  içilebiliyor, can/mana yönetimi anlamını yitiriyordu.
 *
 *  `POTION_COOLDOWN_SEC` bir PROJECT LEGACY TUNING'idir — kaynaktan
 *  gelmez, kullanıcı kararıdır (en az 1,5 sn). Kaynak belirsizliği
 *  hâlâ geçerli; bu sayı onun yerine geçmez, oynanış için konur.
 *
 *  KAYNAK PAYLAŞIMLI DEĞİL: can ve mana iksirinin cooldown'ı AYRIDIR.
 *  Tek sayaç olsaydı can içmek manayı kilitlerdi ve savaşta ölümcül
 *  olurdu. */
import type { InventoryState } from '../../../src/game/systems/InventoryState.js';
import type { PlayerState } from '../../../src/game/systems/PlayerState.js';
import type { CharacterStats } from '../../../src/game/systems/CharacterStats.js';
import { koPotion, type KoPotionProfile, type PotionResource } from '../data/ko-potions.js';

export type PotionFail = 'noProfile' | 'outOfStock' | 'full' | 'locked' | 'cooldown';

/** İksir bekleme süresi (sn) — PROJECT LEGACY TUNING, kullanıcı kararı.
 *  Can ve mana için AYRI sayaç. */
export const POTION_COOLDOWN_SEC = 1.5;

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
  /** Kaynak başına kalan bekleme (sn). Can ve mana AYRI. */
  private cooldown: Record<PotionResource, number> = { hp: 0, mp: 0 };

  /** Kare tiki — bekleme sayaçlarını düşürür. */
  update(dt: number): void {
    for (const k of ['hp', 'mp'] as const) {
      if (this.cooldown[k] > 0) this.cooldown[k] = Math.max(0, this.cooldown[k] - dt);
    }
  }

  /** Bu kaynak için kalan bekleme (sn); 0 = hazır. */
  cooldownLeft(resource: PotionResource): number { return this.cooldown[resource]; }

  use(itemRef: number): PotionUseResult {
    const p = koPotion(itemRef);
    if (!p) {
      return {
        ok: false, fail: 'noProfile', itemRef, displayName: '—', resource: 'hp',
        restoreAmount: 0, before: 0, after: 0, actual: 0, wasted: 0, remaining: 0,
      };
    }
    /* 1) doğrulamalar — bekleme EN ÖNCE, hiçbir mutasyon olmadan. */
    if (this.cooldown[p.resource] > 0) return emptyResult(p, 'cooldown', this.stock(itemRef));
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
    /* Bekleme YALNIZ başarılı kullanımda başlar — reddedilen deneme
       cezalandırılmaz. */
    this.cooldown[p.resource] = POTION_COOLDOWN_SEC;

    return {
      ok: true, itemRef, displayName: p.displayName, resource: p.resource,
      restoreAmount: p.restoreAmount,
      before: Math.round(before), after: Math.round(after),
      actual: Math.round(actual), wasted: Math.round(p.restoreAmount - actual),
      remaining: this.stock(itemRef),
    };
  }
}
