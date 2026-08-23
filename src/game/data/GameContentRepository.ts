/** Tüm oyun içeriğinin tek erişim noktası. Sceneler/sistemler SADECE buradan okur;
 *  JSON'lar build sırasında bundle'a gömülür (runtime'da DB veya fetch yok). */

import monstersJson from './generated/monsters.json';
import itemsJson from './generated/items.json';
import lootJson from './generated/loot_tables.json';
import zonesJson from './generated/zones.json';
import skillsJson from './generated/skills.json';
import merchantsJson from './generated/merchants.json';
import levelCurveJson from './generated/level_curve.json';
import upgradeCurveJson from './generated/upgrade_curve.json';

export interface GameMonster {
  id: string; sourceRef: number; sourceName: string; displayName: string;
  visualKey: string; tier: 'normal' | 'elite';
  level: number; hp: number; attack: number; defense: number;
  hitRate: number; evadeRate: number; attackDelayMs: number; moveSpeed: number;
  exp: number; attackRange: number; searchRange: number; lootTableId: string;
}
export type EquipSlotType =
  | 'weapon' | 'shield' | 'helmet' | 'chest' | 'pants' | 'gloves' | 'boots'
  | 'earring' | 'ring' | 'necklace' | 'belt';

export interface GameItem {
  id: string; sourceRef: number; sourceName: string; displayName: string; iconKey: string;
  category: 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material';
  kindSource: string; kindCode: number;
  equipSlot: EquipSlotType | null;
  classCode: number;
  baseUpgradeLevel: number;
  damage: number; defense: number; attackDelayMs: number; range: number;
  reqLevel: number; vendorBuy: number; vendorSell: number; stackable: boolean; sellingGroup: number;
  bonuses: { str: number; sta: number; dex: number; int: number; hp: number; mp: number };
  elemental: { fire: number; ice: number; lightning: number; poison: number };
}
export interface LootSlot {
  kind: 'direct' | 'group'; triggerPercent: number;
  itemId?: number; memberItemIds?: number[]; selection?: 'uniform'; sourceGroupId?: number;
}
export interface LootTable { id: string; coin: number; slots: LootSlot[] }
export interface ZoneSpawn {
  monsterSourceRef: number; count: number; regTimeSourceRaw: number;
  rect: { left: number; top: number; right: number; bottom: number };
}
export interface GameZone {
  id: string; sourceRef: number; sourceName: string; displayName: string;
  sceneKey: string; role: 'hub' | 'combat'; spawns: ZoneSpawn[];
  startPosition: { x: number; z: number } | null;
}
export interface GameSkill {
  id: string; sourceRef: number; sourceName: string; displayName: string; description: string;
  level: number; manaCost: number; castTimeSourceRaw: number; recastTimeSourceRaw: number;
  successRate: number; type1: number; type2: number; rangeSourceRaw: number;
}
export interface GameMerchant { id: string; sourceSellingGroup: number; role: string; itemIds: number[] }
export interface LevelRow { level: number; requiredExp: number; cumulativeStart: number }

class Repository {
  readonly monsters = monstersJson as unknown as GameMonster[];
  readonly items = itemsJson as unknown as GameItem[];
  readonly lootTables = lootJson as unknown as LootTable[];
  readonly zones = zonesJson as unknown as GameZone[];
  readonly skills = skillsJson as unknown as GameSkill[];
  readonly merchants = merchantsJson as unknown as GameMerchant[];
  readonly levelCurve = (levelCurveJson as unknown as { rows: LevelRow[]; maxLevelMvp: number });
  readonly upgradeCurve = upgradeCurveJson as unknown as {
    source: Array<{ mode: string; display_level: number; probability_percent: number }>;
  };

  private itemByRef = new Map(this.items.map((i) => [i.sourceRef, i]));
  private monsterByRef = new Map(this.monsters.map((m) => [m.sourceRef, m]));
  private lootById = new Map(this.lootTables.map((l) => [l.id, l]));

  item(sourceRef: number): GameItem | undefined { return this.itemByRef.get(sourceRef); }

  /** EK KAYNAK KAYITLARI (A1).
   *
   *  `generated/items.json` MVP kapsamıyla üretildi ve 169 item içeriyor;
   *  okçu ilerlemesi için gereken yay/zırh aileleri orada yok. Bu metot,
   *  KAYNAKTAN çıkarılmış ek kayıtları depoya ekler.
   *
   *  · Generated dosyalar DEĞİŞTİRİLMEZ — "kaynaktan yeniden üretilebilir"
   *    kuralı korunur.
   *  · VAR OLAN kayıt EZİLMEZ: aynı ref ikinci kez gelirse yok sayılır,
   *    böylece canonical kayıt her zaman öncelikli kalır.
   *  · Dönen sayı gerçekten eklenen kayıt adedidir (test bunu doğrular). */
  registerSourceItems(extra: readonly GameItem[]): number {
    let added = 0;
    for (const it of extra) {
      if (this.itemByRef.has(it.sourceRef)) continue;
      this.itemByRef.set(it.sourceRef, it);
      this.items.push(it);
      added += 1;
    }
    return added;
  }
  monster(sourceRef: number): GameMonster | undefined { return this.monsterByRef.get(sourceRef); }

  /** EK MOB KAYITLARI (P2.17) — `registerSourceItems` ile aynı sözleşme:
   *  generated dosyalar değişmez, var olan kayıt ezilmez, dönen sayı
   *  gerçekten eklenen adettir. */
  registerSourceMonsters(extra: readonly GameMonster[]): number {
    let added = 0;
    for (const m of extra) {
      if (this.monsterByRef.has(m.sourceRef)) continue;
      this.monsterByRef.set(m.sourceRef, m);
      this.monsters.push(m);
      added += 1;
    }
    return added;
  }
  loot(id: string): LootTable | undefined { return this.lootById.get(id); }
  zone(id: string): GameZone | undefined { return this.zones.find((z) => z.id === id); }
  hub(): GameZone { return this.zones.find((z) => z.role === 'hub')!; }
  combatZones(): GameZone[] { return this.zones.filter((z) => z.role === 'combat'); }
}

export const Content = new Repository();
