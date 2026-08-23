/** BUILD RESOLVER — P1.8
 *
 *  ══════════ TEK AUTHORITY (§15) ══════════
 *  Türetilmiş statları YALNIZ burası hesaplar. Scene hesaplamaz, UI
 *  hesaplamaz, Inventory hesaplamaz. `EquipmentState` yalnız "hangi item
 *  hangi slotta" bilgisinin sahibidir; stat üretmez.
 *
 *  ══════════ DRIFT YOK (§19/§33) ══════════
 *  Tek bir mutable sayının üstüne ekleme/çıkarma YAPILMAZ. Her çağrıda
 *  **sıfırdan** hesaplanır:
 *
 *      total = base(level)  +  Σ equipment definition stats
 *
 *  Bu yüzden 100 kez equip/unequip sonrası değerler başlangıçla BİREBİR
 *  aynıdır — birikimli yuvarlama hatası oluşamaz.
 *
 *  ══════════ ANA SİSTEMLE İLİŞKİ ══════════
 *  `CharacterStats` (ana oyun, `src/`) DEĞİŞTİRİLMEDİ. Bu sınıf ondan TÜRER
 *  ve yalnız `equipmentStats()`'i ezer; taban stat, toplama ve `finalStats()`
 *  zinciri ANA SİSTEMDEN gelir. Böylece `CombatSystem` hiçbir değişiklik
 *  olmadan Project Legacy ekipman statlarını görür.
 *
 *  Ana `CharacterStats.equipmentStats()` `Content.item()` üzerinden KAYNAK
 *  statlarını okur. P1.8'de ekipman statlarının authority'si Project Legacy
 *  KATALOĞUDUR (`data/item-catalog.ts`) — kaynak satırı değil. Katalogda
 *  olmayan kuşanılı bir item KATKI VERMEZ (uydurma stat üretilmez). */
import { CharacterStats, emptyStatBlock, type StatBlock } from '../../../src/game/systems/CharacterStats.js';
import { StatCalculator } from '../../../src/game/systems/CharacterStats.js';
import type { EquipmentState } from '../../../src/game/systems/EquipmentState.js';
import { EQUIP_SLOTS } from '../../../src/game/systems/EquipmentState.js';
import { itemDefinition } from '../data/item-catalog.js';
import { UPGRADE_MODEL } from '../../../src/game/config.js';
import { ArcherProgression } from '../../../src/game/systems/combat/ArcherProgression.js';
import {
  koArcherAttackPower, koArcherMaxHp, koArcherMaxMp,
} from '../../../src/game/systems/combat/KoArcherDamage.js';
import {
  resolveStats, zeroStats,
  type ItemClass, type ItemDefinition, type ResolvedItemStats,
} from '../data/item-model.js';

/** Bir slotun o anki içeriği (telemetri/UI). */
export interface EquippedView {
  slotId: string;
  label: string;
  instanceId: number | null;
  definitionRef: number | null;
  definition: ItemDefinition | null;
  itemClass: ItemClass | null;
  upgradeLevel: number;
}

/** §19 — taban / ekipman / toplam AYRI görünür. */
export interface BuildBreakdown {
  base: StatBlock;
  equipment: ResolvedItemStats;
  total: {
    attack: number; defense: number;
    str: number; dex: number; int: number; sta: number;
    maxHp: number; maxMp: number;
  };
  /** Ekipmandan gelen elemental (yalnız SİLAH) ve direnç toplamı. */
  weaponElemental: ResolvedItemStats['elemental'];
  resist: ResolvedItemStats['resist'];
  special: ResolvedItemStats['special'];
}

export class ArcherBuildResolver extends CharacterStats {
  /** P2.5A — KO ilerleme durumu (dağıtılan DEX/HP, sınıf aşaması). */
  readonly progression: ArcherProgression;

  constructor(
    private level: () => number,
    private equip: EquipmentState,
    buffs: () => { attackSpeedMult: number },
  ) {
    super(level, equip, buffs);
    this.progression = new ArcherProgression(level);
  }

  /* ═══════════ P2.5A — KO ARCHER YOLU ═══════════
     Generic `finalStats()` DEĞİŞMEDİ: ana oyunun `level × 2` saldırısı ve
     `baseHp + level × 14` canı olduğu gibi duruyor. Okçuya özel değerler
     AYRI okunur; iki hesap birbirini kirletmez (§24). */

  /** Kuşanılı yayın kaynak AP değeri. Silah yoksa 0. */
  bowDamage(): number {
    const inst = this.equip.equippedInstance('weapon');
    if (!inst) return 0;
    const def = itemDefinition(inst.itemRef);
    if (!def || def.category !== 'weapon') return 0;
    /* Yükseltme çarpanı ana modelle AYNI: +N başına %20. */
    return Math.round(def.stats.attack * (1 + inst.upgradeLevel * UPGRADE_MODEL.statPerLevel));
  }

  /** Efektif DEX = taban + dağıtılan + ekipman. */
  effectiveDex(): number {
    return this.progression.dexStat + this.equipmentResolved().dex;
  }

  /** Efektif HP statı = taban + dağıtılan + ekipman STA. */
  effectiveSta(): number {
    return this.progression.staStat + this.equipmentResolved().sta;
  }

  /** KO Archer Attack Power — hasar zincirinin GİRDİSİ. */
  archerAttackPower(): number {
    return koArcherAttackPower({
      level: this.level(),
      dex: this.effectiveDex(),
      bowDamage: this.bowDamage(),
      bowCoefficient: this.progression.stage.bow,
    });
  }

  /** KO Archer Max HP (ekipman maxHp bonusu dahil). */
  archerMaxHp(): number {
    return koArcherMaxHp(this.level(), this.effectiveSta(),
      this.progression.stage.hp, this.equipmentResolved().maxHp);
  }

  /** KO Archer Max MP — Rogue mana havuzu STA'dan türer. */
  archerMaxMp(): number {
    return koArcherMaxMp(this.level(), this.effectiveSta(),
      this.progression.stage.sp, this.equipmentResolved().maxMp);
  }

  /** Kuşanılı Project Legacy tanımlarının HAM toplamı — her çağrıda sıfırdan. */
  equipmentResolved(): ResolvedItemStats {
    const acc = zeroStats();
    for (const { instance } of this.equip.allEquipped()) {
      const def = itemDefinition(instance.itemRef);
      if (!def) continue;                       // katalog dışı item KATKI VERMEZ
      const s = resolveStats(def);
      acc.attack += s.attack; acc.defense += s.defense;
      acc.str += s.str; acc.dex += s.dex; acc.int += s.int; acc.sta += s.sta;
      acc.maxHp += s.maxHp; acc.maxMp += s.maxMp;
      acc.elemental = {
        fire: acc.elemental.fire + s.elemental.fire,
        ice: acc.elemental.ice + s.elemental.ice,
        lightning: acc.elemental.lightning + s.elemental.lightning,
        poison: acc.elemental.poison + s.elemental.poison,
      };
      acc.resist = {
        fire: acc.resist.fire + s.resist.fire,
        ice: acc.resist.ice + s.resist.ice,
        lightning: acc.resist.lightning + s.resist.lightning,
        poison: acc.resist.poison + s.resist.poison,
      };
      acc.special = {
        hpDrain: acc.special.hpDrain + s.special.hpDrain,
        mpDrain: acc.special.mpDrain + s.special.mpDrain,
        mpDamage: acc.special.mpDamage + s.special.mpDamage,
      };
    }
    return acc;
  }

  /** P2.5A — OKÇU DEĞERLERİ generic bloğa YANSITILIR.
   *
   *  `PlayerState.maxHp/maxMp` ve `CombatSystem.playerAttack()` bu bloğu
   *  okur; okçu için doğru sayı KO formülünden gelmelidir. Ana
   *  `CharacterStats` DEĞİŞMEDİ — orada hâlâ `level × 2` saldırı ve
   *  `baseHp + level × 14` can var; bu override YALNIZ okçu çözücüsündedir. */
  override finalStats(): ReturnType<CharacterStats['finalStats']> {
    const base = super.finalStats();
    return {
      ...base,
      attack: this.archerAttackPower(),
      maxHp: this.archerMaxHp(),
      maxMp: this.archerMaxMp(),
      dex: this.effectiveDex(),
      sta: this.effectiveSta(),
    };
  }

  /** ANA SİSTEM KÖPRÜSÜ — `equipmentStats()` bunu çağırır.
   *  Elemental burada BİLEREK BOŞ bırakılır: silah elementali ana damage
   *  formülüne KARIŞTIRILMAZ, ayrı bir bileşen olarak taşınır (§21). */
  override equipmentStats(): StatBlock {
    const r = this.equipmentResolved();
    const b = emptyStatBlock();
    b.attack = r.attack;
    b.defense = r.defense;
    b.maxHp = r.maxHp;
    b.maxMp = r.maxMp;
    b.str = r.str; b.sta = r.sta; b.dex = r.dex; b.int = r.int;
    return b;
  }

  /** §19 — taban / ekipman / toplam ayrımı. */
  build(): BuildBreakdown {
    const base = StatCalculator.baseStats(this.level());
    const equipment = this.equipmentResolved();
    return {
      base,
      equipment,
      total: {
        attack: base.attack + equipment.attack,
        defense: base.defense + equipment.defense,
        str: base.str + equipment.str,
        dex: base.dex + equipment.dex,
        int: base.int + equipment.int,
        sta: base.sta + equipment.sta,
        maxHp: base.maxHp + equipment.maxHp,
        maxMp: base.maxMp + equipment.maxMp,
      },
      weaponElemental: { ...equipment.elemental },
      resist: { ...equipment.resist },
      special: { ...equipment.special },
    };
  }

  /** Kuşanılı SİLAHIN elemental bileşeni (combat adaptörü bunu okur). */
  weaponElemental(): ResolvedItemStats['elemental'] {
    const weapon = this.equip.equippedInstance('weapon');
    const def = weapon ? itemDefinition(weapon.itemRef) : undefined;
    if (!def || def.category !== 'weapon') return { fire: 0, ice: 0, lightning: 0, poison: 0 };
    return { ...def.stats.elemental };
  }

  /** Kuşanılı silahın Project Legacy tanımı (tooltip/telemetri). */
  equippedWeaponDefinition(): ItemDefinition | null {
    const weapon = this.equip.equippedInstance('weapon');
    return weapon ? itemDefinition(weapon.itemRef) ?? null : null;
  }

  /** 12 slotun tamamı — boş olanlar dahil (§41 telemetri). */
  slots(): EquippedView[] {
    return EQUIP_SLOTS.map((s) => {
      const inst = this.equip.equippedInstance(s.id);
      const def = inst ? itemDefinition(inst.itemRef) ?? null : null;
      return {
        slotId: s.id, label: s.label,
        instanceId: inst?.instanceId ?? null,
        definitionRef: inst?.itemRef ?? null,
        definition: def,
        itemClass: def?.itemClass ?? null,
        upgradeLevel: inst?.upgradeLevel ?? 0,
      };
    });
  }
}
