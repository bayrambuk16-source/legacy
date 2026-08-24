/** OTO GİY / OTO SAT — P2.13
 *
 *  ══════════════ TEK KARAR KAYNAĞI: GÜÇ SKORU ══════════════
 *  "Bu item daha mı iyi?" sorusunun cevabı `powerScore`tur. Ayrı bir
 *  karşılaştırma kuralı YOKTUR — böylece oto giy, bildirim ve oto sat
 *  birbiriyle çelişemez.
 *
 *  ══════════════ KULLANICI KARARLARI ══════════════
 *  1. KİLİT = KORUMA. Kilitli eşya ASLA satılmaz. (Kilit "sat" işareti
 *     değildir; tersi.)
 *  2. Oto giy sonrası çıkan eski eşya HEMEN SATILMAZ — onay bekler.
 *     Oyuncu görmeden pahalı bir eşya yok olmasın diye.
 *  3. Parşömen/iksir koruması AYARDAN açılıp kapanır.
 *
 *  ══════════════ MUTASYON KAPILARI ══════════════
 *  Kuşanma `EquipService`, envanter `InventoryState`, altın `PlayerState`
 *  üzerinden gider. Bu sınıf onları ÇAĞIRIR, kendi kopyasını tutmaz. */

import type { InventoryState, ItemInstance } from '../../../src/game/systems/InventoryState.js';
import type { PlayerState } from '../../../src/game/systems/PlayerState.js';
import { ITEM_CLASS_RANK, type ItemClass } from '../data/item-model.js';
import { itemDefinition } from '../data/item-catalog.js';
import { SELL_UPGRADE_PER_LEVEL, equipSellPrice, fixedSellPrice } from '../data/sell-prices.js';
import { powerScore, type PowerInput } from '../data/power-score.js';
import type { EquipmentState } from '../../../src/game/systems/EquipmentState.js';
import type { EquipService } from './EquipService.js';
import type { ArcherBuildResolver } from './BuildResolver.js';

export interface AutoGearSettings {
  /** Daha güçlü eşya çıkınca kendiliğinden kuşanılsın mı? */
  autoEquip: boolean;
  /** Zayıf eşyalar kendiliğinden satılsın mı? */
  autoSell: boolean;
  /** Bu kalitenin ALTINDAKİ eşyalar satılır. `null` = kalite süzgeci yok. */
  sellBelowClass: ItemClass | null;
  /** Parşömen ve iksirler korunsun mu? (kullanıcı: ayardan aç/kapa) */
  protectConsumables: boolean;
  /** Korunan yığın üst sınırı; fazlası satılır. `null` = sınırsız. */
  consumableKeepMax: number | null;
}

export const AUTO_GEAR_DEFAULTS: AutoGearSettings = {
  autoEquip: true,
  autoSell: false,          // eşya yok eden bir sistem VARSAYILAN OLARAK KAPALI
  sellBelowClass: 'HIGH',
  protectConsumables: true,
  consumableKeepMax: null,
};

/** Oto giy sonucu — bildirim için. */
export interface EquipUpgradeEvent {
  readonly instanceId: number;
  readonly displayName: string;
  readonly scoreBefore: number;
  readonly scoreAfter: number;
  /** Yerinden çıkan eski eşya (varsa) — ONAY BEKLER, satılmaz. */
  readonly replacedInstanceId: number | null;
}

export type SellRefusal =
  | 'locked' | 'equipped' | 'notFound' | 'protected' | 'aboveThreshold' | 'noPrice';

export interface SellResult {
  readonly ok: boolean;
  readonly coins: number;
  readonly reason?: SellRefusal;
}

export interface AutoGearDeps {
  inventory: InventoryState;
  equip: EquipService;
  equipment: EquipmentState;
  stats: ArcherBuildResolver;
  player: PlayerState;
}

export class AutoGearSystem {
  readonly settings: AutoGearSettings = { ...AUTO_GEAR_DEFAULTS };
  /** Oto giy sonrası çıkan, ONAY BEKLEYEN eşyalar. */
  private pending = new Set<number>();

  private deps: AutoGearDeps;

  constructor(deps: AutoGearDeps) { this.deps = deps; }

  /* ─────────────────────── güç skoru ─────────────────────── */

  private input(): PowerInput {
    const f = this.deps.stats.finalStats();
    return {
      attack: f.attack, defense: f.defense, maxHp: f.maxHp, maxMp: f.maxMp,
      dex: this.deps.stats.effectiveDex(), sta: this.deps.stats.effectiveSta(),
    };
  }

  /** Şu anki güç skoru. */
  score(): number { return powerScore(this.input()); }

  /* ─────────────────────── oto giy ─────────────────────── */

  /** Bir eşyayı kuşanmak skoru YÜKSELTİYOR MU? Deneme YAPILMAZ —
   *  gerçekten kuşanıp geri almak envanteri kirletirdi; bunun yerine
   *  kuşanma denenir ve düşürüyorsa GERİ ALINIR. */
  tryUpgrade(instanceId: number): EquipUpgradeEvent | null {
    if (!this.settings.autoEquip) return null;
    const inst = this.deps.inventory.get(instanceId);
    if (!inst || inst.equippedSlot !== null) return null;
    const def = itemDefinition(inst.itemRef);
    if (!def) return null;

    const before = this.score();
    const slot = def.equipSlot;
    const previous = this.deps.equipment.equippedInstance(slot)?.instanceId ?? null;

    const res = this.deps.equip.equip(instanceId);
    if (!res.ok) return null;

    const after = this.score();
    if (after <= before) {
      /* Skoru düşürdü → geri al. Eski eşya varsa yeniden kuşanılır. */
      this.deps.equip.unequip(slot);
      if (previous !== null) this.deps.equip.equip(previous);
      return null;
    }

    /* KULLANICI KARARI: çıkan eski eşya SATILMAZ, onay bekler. */
    if (previous !== null) this.pending.add(previous);
    return {
      instanceId, displayName: def.displayName,
      scoreBefore: before, scoreAfter: after,
      replacedInstanceId: previous,
    };
  }

  /* ─────────────────────── onay kuyruğu ─────────────────────── */

  /** Onay bekleyen eşyalar (envanterden düşmüş olanlar temizlenir). */
  pendingSales(): ItemInstance[] {
    const out: ItemInstance[] = [];
    for (const id of [...this.pending]) {
      const inst = this.deps.inventory.get(id);
      if (!inst) { this.pending.delete(id); continue; }
      out.push(inst);
    }
    return out;
  }

  /** Onay bekleyenlerden çıkarır (oyuncu "TUT" dedi). */
  keep(instanceId: number): void { this.pending.delete(instanceId); }

  isPending(instanceId: number): boolean { return this.pending.has(instanceId); }

  /* ─────────────────────── satış ─────────────────────── */

  /** Satış fiyatı.
   *
   *  P2.33 — `vendorBuy / 4` YAKLAŞIMI KALDIRILDI. Ölçüm: kaynakta
   *  satış fiyatı yok (169 kaydın 4'ünde, MYKO'da 14 534'ün 51'inde),
   *  bizim kataloğumuzda sıfır. Yani "gerçek DB fiyatı" diye bir şey
   *  yoktu ve `vendorBuy / 4` de bir uydurmaydı — üstelik gizli bir
   *  uydurma, çünkü kaynaktan geliyormuş gibi duruyordu.
   *
   *  Artık fiyat açıkça TUNING'dir ve `data/sell-prices.ts` içinde
   *  gerekçesiyle durur: ekipman gücünden türer, ekipman dışı eşyalar
   *  tek tek belirlenmiştir. */
  sellPrice(inst: ItemInstance): number {
    const fixed = fixedSellPrice(inst.itemRef);
    if (fixed !== null) return Math.max(0, fixed * inst.quantity);
    const def = itemDefinition(inst.itemRef);
    if (!def) {
      /* Katalog dışı ve sabit fiyatı yok — satılamaz. Uydurma fiyat
         üretmek yerine sıfır döner; `sell()` bunu 'noPrice' sayar. */
      return 0;
    }
    const base = equipSellPrice(def);
    const mult = 1 + inst.upgradeLevel * SELL_UPGRADE_PER_LEVEL;
    return Math.max(1, Math.floor(base * mult * inst.quantity));
  }

  /** Bu eşya oto satışa UYGUN mu? Kural sırası açıklamalıdır:
   *  kilit ve kuşanma her şeyin üstünde, sonra tüketilebilir koruması,
   *  en son kalite eşiği. */
  private refuseReason(inst: ItemInstance): SellRefusal | null {
    if (inst.locked) return 'locked';                    // KİLİT = KORUMA
    if (inst.equippedSlot !== null) return 'equipped';
    const def = itemDefinition(inst.itemRef);
    if (!def) {
      /* Katalog dışı → tüketilebilir/malzeme sayılır. */
      if (this.settings.protectConsumables) {
        const max = this.settings.consumableKeepMax;
        if (max === null || inst.quantity <= max) return 'protected';
      }
      return this.sellPrice(inst) > 0 ? null : 'noPrice';
    }
    const threshold = this.settings.sellBelowClass;
    if (threshold !== null
      && ITEM_CLASS_RANK[def.itemClass] >= ITEM_CLASS_RANK[threshold]) {
      return 'aboveThreshold';
    }
    return this.sellPrice(inst) > 0 ? null : 'noPrice';
  }

  canAutoSell(instanceId: number): boolean {
    const inst = this.deps.inventory.get(instanceId);
    return inst !== undefined && this.refuseReason(inst) === null;
  }

  /** TEK SATIŞ KAPISI. Reddedilirse HİÇBİR mutasyon olmaz. */
  sell(instanceId: number): SellResult {
    const inst = this.deps.inventory.get(instanceId);
    if (!inst) return { ok: false, coins: 0, reason: 'notFound' };
    if (inst.locked) return { ok: false, coins: 0, reason: 'locked' };
    if (inst.equippedSlot !== null) return { ok: false, coins: 0, reason: 'equipped' };
    const coins = this.sellPrice(inst);
    if (coins <= 0) return { ok: false, coins: 0, reason: 'noPrice' };
    if (!this.deps.inventory.remove(instanceId, inst.quantity)) {
      return { ok: false, coins: 0, reason: 'notFound' };
    }
    this.pending.delete(instanceId);
    this.deps.player.coins += coins;
    return { ok: true, coins };
  }

  /** Ayarlara uyan HER şeyi satar. Onay bekleyenler DAHİL EDİLMEZ —
   *  onlar oyuncunun kararını bekliyor. */
  sellAllEligible(): { sold: number; coins: number } {
    if (!this.settings.autoSell) return { sold: 0, coins: 0 };
    let sold = 0, coins = 0;
    for (const inst of this.deps.inventory.allEntries()) {
      if (this.pending.has(inst.instanceId)) continue;
      if (this.refuseReason(inst) !== null) continue;
      const r = this.sell(inst.instanceId);
      if (r.ok) { sold += 1; coins += r.coins; }
    }
    return { sold, coins };
  }
}
