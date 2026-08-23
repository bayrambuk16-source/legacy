/** ITEM MODELİ — P1.8
 *
 *  ══════════ İKİ AYRI KAVRAM (§23) ══════════
 *
 *  ItemDefinition : "bu item NEDİR" — ad, sınıf, temel statlar, gereksinimler,
 *                   slot, izinli karakter sınıfları, kaynak referansı.
 *                   TEK KOPYA vardır ve DEĞİŞMEZ.
 *  ItemInstance   : "oyuncunun sahip olduğu TEK PARÇA" — `instanceId`,
 *                   `itemRef` (= definitionRef), `upgradeLevel`, `quantity`.
 *                   Ana `InventoryState.ItemInstance` bu rolü zaten oynar.
 *
 *  STATLAR INSTANCE'A KOPYALANMAZ. Her zaman definition üzerinden çözülür.
 *
 *  ══════════ RASTGELE AFFIX YOKTUR (§5/§13) ══════════
 *  Aynı isimli item her düştüğünde AYNI statları taşır. Roll aralığı,
 *  rastgele resistance, rastgele DEX gibi bir sistem YOKTUR.
 *
 *  ══════════ SİLAH PRIMARY STAT YASAĞI — TİP DÜZEYİNDE (§3/§35) ══════════
 *  `WeaponStats` içinde `str` / `dex` / `int` ALANI HİÇ YOKTUR. Bu bir runtime
 *  kontrolü değil, DERLEYİCİ garantisidir: bir silaha primary stat yazmak
 *  derleme hatası verir.
 *
 *  ══════════ CRIT YASAĞI (§12/§36) ══════════
 *  Hiçbir stat bloğunda `criticalChance` / `criticalDamage` ALANI YOKTUR.
 *  Kaynak `items_server` tablosunda da böyle bir kolon BULUNMUYOR. */
import type { EquipSlotType } from '../../../src/game/data/GameContentRepository.js';

/* ─────────────────────────── SINIF / RENK ─────────────────────────── */

/** Item sınıfı — AUTHORITATIVE alan, yalnız bir UI rengi DEĞİLDİR (§1).
 *  KAYNAKTA BÖYLE BİR ALAN YOKTUR (`items_server`'da rarity kolonu yok):
 *  bu tamamen bir PROJECT LEGACY içerik kararıdır. */
export type ItemClass = 'LOW' | 'MIDDLE' | 'HIGH' | 'RARE' | 'UNIQUE';

export const ITEM_CLASSES: ItemClass[] = ['LOW', 'MIDDLE', 'HIGH', 'RARE', 'UNIQUE'];

/** Sıralama (karşılaştırma/telemetri için). */
export const ITEM_CLASS_RANK: Readonly<Record<ItemClass, number>> = {
  LOW: 0, MIDDLE: 1, HIGH: 2, RARE: 3, UNIQUE: 4,
};

export const ITEM_CLASS_LABEL: Readonly<Record<ItemClass, string>> = {
  LOW: 'Sıradan', MIDDLE: 'İyi', HIGH: 'Üstün', RARE: 'Nadir', UNIQUE: 'Eşsiz',
};

/** DOMAIN CSS BİLMEZ (§25). Renk eşlemesi TEK YERDE, yalnız sunum katmanı
 *  için. Domain `ItemClass` taşır; renderer bunu renge çevirir. */
export const ITEM_CLASS_COLOR: Readonly<Record<ItemClass, string>> = {
  LOW: '#e8e0d0',      // BEYAZ
  MIDDLE: '#7fa85c',   // YEŞİL
  HIGH: '#6f8fd0',     // MAVİ
  RARE: '#a06fd0',     // MOR
  UNIQUE: '#e08a3c',   // TURUNCU
};

/* ─────────────────────────── KARAKTER SINIFI ─────────────────────────── */

export type PlayerClass = 'archer' | 'warrior' | 'mage' | 'priest';

/* ─────────────────────────── STAT BLOKLARI ─────────────────────────── */

/** Elemental hasar (yalnız SİLAH). Hasar bileşenidir — DoT DEĞİLDİR (§4). */
export interface ElementalDamage {
  readonly fire: number;
  readonly ice: number;
  readonly lightning: number;
  readonly poison: number;
}

/** Direnç (zırh + aksesuar). */
export interface Resistances {
  readonly fire: number;
  readonly ice: number;
  readonly lightning: number;
  readonly poison: number;
}

/** Yalnız ÖZEL/UNIQUE silahlarda bulunan sabit özellikler (§3).
 *  Her silaha rastgele BASILMAZ. */
export interface WeaponSpecial {
  readonly hpDrain: number;
  readonly mpDrain: number;
  readonly mpDamage: number;
}

/** SİLAH STATLARI.
 *  DİKKAT: `str` / `dex` / `int` ALANI BİLEREK YOKTUR (§3). */
export interface WeaponStats {
  readonly attack: number;
  readonly elemental: ElementalDamage;
  readonly special: WeaponSpecial;
  /** Özel silahlarda bulunabilir; normal silahlarda 0. */
  readonly maxHp: number;
  readonly maxMp: number;
  readonly resist: Resistances;
}

/** ZIRH STATLARI — ana stat DEFENSE (§6). */
export interface ArmorStats {
  readonly defense: number;
  readonly str: number;
  readonly dex: number;
  readonly int: number;
  readonly sta: number;
  readonly maxHp: number;
  readonly maxMp: number;
  readonly resist: Resistances;
}

/** AKSESUAR STATLARI — build'in ana kaynağı (§11). Defense YOK. */
export interface AccessoryStats {
  readonly str: number;
  readonly dex: number;
  readonly int: number;
  readonly sta: number;
  readonly maxHp: number;
  readonly maxMp: number;
  readonly resist: Resistances;
}

/** Çözülmüş ortak stat bloğu — resolver ve telemetri bunu kullanır. */
export interface ResolvedItemStats {
  attack: number;
  defense: number;
  str: number; dex: number; int: number; sta: number;
  maxHp: number; maxMp: number;
  elemental: ElementalDamage;
  resist: Resistances;
  special: WeaponSpecial;
}

export const ZERO_ELEMENTAL: ElementalDamage = { fire: 0, ice: 0, lightning: 0, poison: 0 };
export const ZERO_RESIST: Resistances = { fire: 0, ice: 0, lightning: 0, poison: 0 };
export const ZERO_SPECIAL: WeaponSpecial = { hpDrain: 0, mpDrain: 0, mpDamage: 0 };

export function zeroStats(): ResolvedItemStats {
  return {
    attack: 0, defense: 0, str: 0, dex: 0, int: 0, sta: 0, maxHp: 0, maxMp: 0,
    elemental: { ...ZERO_ELEMENTAL }, resist: { ...ZERO_RESIST }, special: { ...ZERO_SPECIAL },
  };
}

/* ─────────────────────────── KAYNAK GERÇEKLERİ ─────────────────────────── */

/** `items_server` satırından OKUNAN gerçekler. Hiçbiri burada hesaplanmaz.
 *  Bir alanın kaynakta bulunması, Project Legacy iteminde KULLANILDIĞI
 *  anlamına GELMEZ (§2) — hangisinin kullanıldığı `legacy` tarafında yazar. */
export interface ItemSourceFacts {
  /** `items_server.num` */
  readonly sourceRef: number;
  readonly sourceName: string;
  /** `items_server.kind` */
  readonly kindCode: number;
  /** `items_server.class_code` */
  readonly classCode: number;
  /** `items_server.damage` */
  readonly damage: number;
  /** `items_server.ac` */
  readonly defense: number;
  /** `items_server.req_level` */
  readonly reqLevel: number;
  /** `items_server.delay` */
  readonly delayMs: number;
  /** `items_server.range_value` */
  readonly range: number;
  /** `*_bonus` kolonları — KAYNAKTA VAR, Project Legacy'de kullanılıp
   *  kullanılmadığı ayrı bir karardır. */
  readonly sourceBonuses: { str: number; sta: number; dex: number; int: number; hp: number; mp: number };
  /** `fire_damage` / `ice_damage` / `lightning_damage` / `poison_damage` */
  readonly sourceElemental: ElementalDamage;
}

/* ─────────────────────────── DEFINITION ─────────────────────────── */

export type ItemCategory = 'weapon' | 'armor' | 'accessory';

interface BaseDefinition {
  /** Envanterdeki `itemRef` ile AYNI değerdir — ayrı bir kimlik uzayı YOK. */
  readonly definitionRef: number;
  /** PROJECT LEGACY adı. Kaynak adı `source.sourceName` içinde durur. */
  readonly displayName: string;
  readonly itemClass: ItemClass;
  readonly equipSlot: EquipSlotType;
  readonly allowedClasses: readonly PlayerClass[];
  readonly requiredLevel: number;
  /** Ekipman ASLA yığılmaz (§24). */
  readonly stackable: false;
  /** §31 — set bonusu İMPLEMENTE EDİLMEDİ; yalnız veri hazırlığı. */
  readonly setId: string | null;
  /** §8/§14 — upgrade zincirinin tabanı. P1.8'de upgrade YOK. */
  readonly baseItemRef: number;
  readonly source: ItemSourceFacts;
  /** Kaynakta olup Project Legacy iteminde BİLEREK KULLANILMAYAN alanlar. */
  readonly droppedSourceFields: readonly string[];
}

export interface WeaponDefinition extends BaseDefinition {
  readonly category: 'weapon';
  readonly stats: WeaponStats;
}
export interface ArmorDefinition extends BaseDefinition {
  readonly category: 'armor';
  readonly stats: ArmorStats;
}
export interface AccessoryDefinition extends BaseDefinition {
  readonly category: 'accessory';
  readonly stats: AccessoryStats;
}

export type ItemDefinition = WeaponDefinition | ArmorDefinition | AccessoryDefinition;

/** Tanımı ortak bloğa çözer. Silahta primary stat OLAMAZ — tipte yok. */
export function resolveStats(def: ItemDefinition): ResolvedItemStats {
  const out = zeroStats();
  out.maxHp = def.stats.maxHp;
  out.maxMp = def.stats.maxMp;
  out.resist = { ...def.stats.resist };
  if (def.category === 'weapon') {
    out.attack = def.stats.attack;
    out.elemental = { ...def.stats.elemental };
    out.special = { ...def.stats.special };
    /* str/dex/int/sta: silahta ALAN YOK → 0 kalır (§3). */
  } else {
    out.str = def.stats.str; out.dex = def.stats.dex;
    out.int = def.stats.int; out.sta = def.stats.sta;
    if (def.category === 'armor') out.defense = def.stats.defense;
  }
  return out;
}
