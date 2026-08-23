/** Karakter stat mimarisi:
 *    Base Stats + Equipment Stats + Upgrade Stats + Buff Stats = Final Combat Stats
 *  Final stat ASLA UI veya Scene içinde hesaplanmaz — tek kaynak burasıdır.
 *  CombatSystem yalnız finalStats() çıktısını kullanır. */
import { PLAYER, COMBAT, UPGRADE_MODEL } from '../config.js';
import type { EquipmentState } from './EquipmentState.js';

export interface StatBlock {
  attack: number;
  defense: number;
  maxHp: number;
  maxMp: number;
  str: number; sta: number; dex: number; int: number;
  elemental: { fire: number; ice: number; lightning: number; poison: number };
}

export interface FinalStats extends StatBlock {
  attackSpeedMult: number;
  hasWeapon: boolean;
}

const emptyBlock = (): StatBlock => ({
  attack: 0, defense: 0, maxHp: 0, maxMp: 0,
  str: 0, sta: 0, dex: 0, int: 0,
  elemental: { fire: 0, ice: 0, lightning: 0, poison: 0 },
});

export class StatCalculator {
  /** Seviyeden gelen taban blok (config; kaynak DB'de oyuncu statı yok). */
  static baseStats(level: number): StatBlock {
    const b = emptyBlock();
    b.attack = level * COMBAT.playerAttackPerLevel;
    b.maxHp = PLAYER.baseHp + (level - 1) * PLAYER.hpPerLevel;
    b.maxMp = PLAYER.baseMp + (level - 1) * PLAYER.mpPerLevel;
    return b;
  }

  /** Tek bir kuşanılmış item'ın katkısı; upgradeLevel çarpanı dahil. */
  static itemStats(item: {
    damage: number; defense: number;
    bonuses: { str: number; sta: number; dex: number; int: number; hp: number; mp: number };
    elemental: { fire: number; ice: number; lightning: number; poison: number };
  }, upgradeLevel: number): StatBlock {
    const u = 1 + upgradeLevel * UPGRADE_MODEL.statPerLevel;
    const b = emptyBlock();
    b.attack = Math.round(item.damage * u);
    b.defense = Math.round(item.defense * u);
    b.maxHp = item.bonuses.hp;
    b.maxMp = item.bonuses.mp;
    b.str = item.bonuses.str; b.sta = item.bonuses.sta;
    b.dex = item.bonuses.dex; b.int = item.bonuses.int;
    b.elemental = { ...item.elemental };
    return b;
  }

  static sum(a: StatBlock, b: StatBlock): StatBlock {
    return {
      attack: a.attack + b.attack,
      defense: a.defense + b.defense,
      maxHp: a.maxHp + b.maxHp,
      maxMp: a.maxMp + b.maxMp,
      str: a.str + b.str, sta: a.sta + b.sta, dex: a.dex + b.dex, int: a.int + b.int,
      elemental: {
        fire: a.elemental.fire + b.elemental.fire,
        ice: a.elemental.ice + b.elemental.ice,
        lightning: a.elemental.lightning + b.elemental.lightning,
        poison: a.elemental.poison + b.elemental.poison,
      },
    };
  }
}

/** Canlı stat servisi: seviye + ekipman + buff'lardan final stat üretir. */
export class CharacterStats {
  constructor(
    private levelProvider: () => number,
    private equipment: EquipmentState,
    private buffProvider: () => { attackSpeedMult: number },
  ) {}

  equipmentStats(): StatBlock {
    let acc = emptyBlock();
    for (const { instance, item } of this.equipment.allEquipped()) {
      acc = StatCalculator.sum(acc, StatCalculator.itemStats(item, instance.upgradeLevel));
    }
    return acc;
  }

  /** Kuşanılı silahın kaynak kind kodu (skill silah gereksinimi için); yoksa null. */
  equippedWeaponKind(): number | null {
    return this.equipment.equippedItem('weapon')?.kindCode ?? null;
  }

  finalStats(): FinalStats {
    const base = StatCalculator.baseStats(this.levelProvider());
    const equip = this.equipmentStats();
    const total = StatCalculator.sum(base, equip);
    const weapon = this.equipment.equippedItem('weapon');
    return {
      ...total,
      attackSpeedMult: this.buffProvider().attackSpeedMult,
      hasWeapon: weapon !== undefined,
    };
  }
}

const emptyBlockExport = emptyBlock;
export { emptyBlockExport as emptyStatBlock };
