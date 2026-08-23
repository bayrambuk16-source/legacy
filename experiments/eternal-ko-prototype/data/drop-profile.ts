/** MONSTER DROP PROFİLİ — P1.7
 *
 *  ══════════ KAYNAK ZİNCİRİ (KO_Reference_v8.db ile DOĞRULANDI) ══════════
 *
 *    monsters.s_sid                    ← monsterin kaynak kimliği
 *        └─ monster_drops.s_index      ← aynı değere bağlanır (526/526 eşleşme)
 *             ├─ slot_no          1..5 (mob başına EN FAZLA 5 drop yuvası)
 *             ├─ drop_kind        'direct_item' | 'group'
 *             ├─ item_or_group_id → drop_kind='direct_item' ise items_server.num
 *             │                   → drop_kind='group'       ise make_item_groups.group_id
 *             └─ rate_raw         0..10000  (ON BİNDE BİR — bkz. aşağıda)
 *
 *    make_item_groups(group_id, item_slot 1..30, item_id) → items_server.num
 *    monsters.i_money  → coin
 *
 *  ══════════ DOĞRULANMIŞ ALAN SEMANTİKLERİ ══════════
 *
 *  1) `rate_raw` YÜZDE DEĞİL, ON BİNDE BİRDİR.
 *     DB'nin kendi türetilmiş kolonu bunu söylüyor:
 *     `rate_percent = rate_raw / 100` — 2275 satırın TAMAMINDA ihlal 0.
 *     Örn. rate_raw 6000 → %60 · rate_raw 85 → %0.85.
 *
 *  2) YUVALAR BAĞIMSIZ ATILIR (tek seçim DEĞİL).
 *     526 mobun 216'sında yuva oranlarının TOPLAMI %100'ü aşıyor
 *     (en yüksek %375). Tek bir seçim modeli matematiksel olarak imkânsız
 *     olurdu → her yuva KENDİ bağımsız atışını yapar. Bu bir varsayım değil,
 *     kaynaktan çıkan bir SONUÇTUR.
 *
 *  3) `item_or_group_id` iki farklı uzaya bakar ve bunu `drop_kind` söyler.
 *     direct_item → items_server.num: 1247/1252 çözülüyor
 *     group       → make_item_groups: 692/1023 çözülüyor
 *
 *  4) `monsters.i_money` = COIN. Oyunun üretilmiş `loot_tables.json` dosyasındaki
 *     `coin` alanı bununla BİREBİR aynıdır (Worm 18 · Bandicoot 27 ·
 *     Wild Bandicoot 60 · Small bulcan 114 · Bulcan 145 · Bulky bulcan 214).
 *
 *  ══════════ ÇÖZÜLEMEYEN (UYDURULMADI) ══════════
 *
 *  · GRUP İÇİ ÜYE AĞIRLIĞI YOKTUR. `make_item_groups` yalnız `item_slot` ve
 *    `item_id` taşır; ağırlık/yüzde kolonu KAYNAKTA BULUNMUYOR. Bu yüzden üye
 *    seçimi YUVA-TEKDÜZEDİR (uniform) ve bu bir PROJECT LEGACY kararıdır.
 *    Üretilmiş içerik bunu `selection: "uniform"` olarak açıkça işaretler.
 *  · COIN'İN ARALIK OLUP OLMADIĞI BİLİNMİYOR. Kaynakta tek bir sayı vardır;
 *    "i_money ± %x" gibi bir alan YOKTUR. Bu yüzden coin SABİT miktardır.
 *    → COIN_RANGE_SEMANTIC UNRESOLVED
 *  · EKSİK GRUPLAR. `monster_drops`'taki 331 grup satırı, çıkarılamamış
 *    gruplara (id 1, 5, 7, 8 …) işaret ediyor. Bunlar UYDURULMAZ: üretilmiş
 *    içerikte yer almazlar ve bu profil de onları icat etmez.
 *
 *  ══════════ BU DOSYA NE YAPMAZ ══════════
 *  Kaynak DB'ye ve üretilmiş JSON'a DOKUNMAZ. Item adı / stat / ikon / rarity
 *  KOPYALAMAZ — hepsi `Content.item()` üzerinden çözülür (§15). Yeni item
 *  balance'ı YOKTUR (§41). */
import { Content, type LootTable } from '../../../src/game/data/GameContentRepository.js';
import { isEquipmentItem } from './item-catalog.js';

/* ───────────────────────── SOURCE FACT ───────────────────────── */

export type DropSlotKind = 'direct' | 'group';

/** Bir drop yuvasının KAYNAK gerçekleri. Hiçbiri burada hesaplanmaz. */
export interface DropSlotSourceFact {
  /** `monster_drops.slot_no` (1..5). */
  readonly slotNo: number;
  readonly kind: DropSlotKind;
  /** Tetik yüzdesi = `rate_raw / 100`. */
  readonly triggerPercent: number;
  /** `monster_drops.rate_raw` — on binde bir cinsinden HAM değer. */
  readonly rateRaw: number;
  /** direct: `items_server.num`. group: null. */
  readonly itemRef: number | null;
  /** group: `make_item_groups.group_id`. direct: null. */
  readonly groupRef: number | null;
  /** group: üye `item_id` listesi (kaynak sırasıyla). direct: boş. */
  readonly memberItemRefs: readonly number[];
  /** Grup içi seçim modeli. Kaynakta ağırlık YOK → 'uniform'. */
  readonly selection: 'uniform' | null;
}

export interface MonsterDropSourceFacts {
  /** `monsters.s_sid` — aynı zamanda `monster_drops.s_index`. */
  readonly monsterRef: number;
  /** Üretilmiş içerikteki tablo kimliği (`loot_tables.json`). */
  readonly lootTableId: string;
  /** `monsters.i_money`. */
  readonly coin: number;
  readonly slots: readonly DropSlotSourceFact[];
}

/* ─────────────────── PROJECT LEGACY TUNING ─────────────────── */

/** Kaynaktan GELMEZ. Playtest ile ayarlanır; kaynak sayıları DEĞİŞTİRMEZ. */
export interface DropTuning {
  /** Coin miktarı çarpanı (1 = kaynak değeri aynen). */
  coinMultiplier: number;
  /** Tetik yüzdesi çarpanı (1 = kaynak oranı aynen). Test/DEV içindir. */
  dropRateMultiplier: number;
  /** Her drop bu oyuncuya aittir (P1.7: tek oyunculu prototip). */
  ownerPlayerId: number;
  /** Yerdeki loot ömrü (sn). */
  lootLifetimeSec: number;
  /** MANUEL toplama yarıçapı (world birimi). */
  pickupRadius: number;
}

export const DROP_TUNING_V1: DropTuning = {
  coinMultiplier: 1,
  dropRateMultiplier: 1,
  ownerPlayerId: 1,
  lootLifetimeSec: 60,
  pickupRadius: 70,
};

/** DEV: yerdeki loot ömrü seçenekleri. Varsayılan 60. */
export const LOOT_LIFETIME_OPTIONS = [15, 60, 180] as const;
export const LOOT_LIFETIME_DEFAULT = 60;

/* ─────────────────────── PROFİL ─────────────────────── */

export interface MonsterDropProfile {
  readonly source: MonsterDropSourceFacts;
  /** Kaynak zincirinin okunabilir özeti (telemetri/rapor). */
  readonly sourceChain: string;
}

/** Üretilmiş içerikten (loot_tables.json) profil kurar.
 *  ÜRETİLMİŞ JSON DEĞİŞTİRİLMEZ — yalnız OKUNUR ve etiketlenir. */
function fromLootTable(monsterRef: number, table: LootTable): MonsterDropProfile {
  /* ═══ A1 — OKÇU FİLTRESİ ═══
     Kaynak ganimet tabloları BÜTÜN sınıfların eşyasını taşır: bir mobun
     62 üyeli grubunun yalnız 9-13'ü okçuya uygun. Diğerleri kuşanılamıyor,
     yalnız çantayı dolduruyordu.

     Filtre kaynağı DEĞİŞTİRMEZ: `source` bloğu ham kaydı olduğu gibi
     saklamaya devam eder (denetlenebilirlik). Yalnız oyuncuya ULAŞAN
     üye listesi süzülür.

     Ölçüt: Project Legacy kataloğunda tanımı OLAN item. Katalog zaten
     okçu-yalnız olduğu için ayrıca sınıf kodu kontrolüne gerek yok. */
  const keepForArcher = (refs: readonly number[]): number[] =>
    refs.filter((r) => isEquipmentItem(r));

  const slots: DropSlotSourceFact[] = table.slots.map((s, i) => ({
    slotNo: i + 1,
    kind: s.kind === 'direct' ? 'direct' : 'group',
    triggerPercent: s.triggerPercent,
    /* rate_raw = triggerPercent × 100 (DB'de `rate_percent = rate_raw / 100`). */
    rateRaw: Math.round(s.triggerPercent * 100),
    itemRef: s.kind === 'direct' ? (s.itemId ?? null) : null,
    groupRef: s.kind === 'direct' ? null : (s.sourceGroupId ?? null),
    memberItemRefs: s.kind === 'direct' ? [] : keepForArcher(s.memberItemIds ?? []),
    selection: s.kind === 'direct' ? null : 'uniform',
  }));
  const parts = slots.map((s) => (s.kind === 'direct'
    ? `slot${s.slotNo}:direct(${s.itemRef})@${s.triggerPercent}%`
    : `slot${s.slotNo}:group(${s.groupRef}×${s.memberItemRefs.length})@${s.triggerPercent}%`));
  return {
    source: { monsterRef, lootTableId: table.id, coin: table.coin, slots },
    sourceChain: `monsters.s_sid=${monsterRef} → monster_drops → ${parts.join(' · ')}`
      + ` · coin=monsters.i_money=${table.coin}`,
  };
}

const cache = new Map<number, MonsterDropProfile | null>();

/** Bir monsterin drop profili. Tablo yoksa `null` — UYDURULMAZ. */
export function dropProfile(monsterRef: number): MonsterDropProfile | null {
  const hit = cache.get(monsterRef);
  if (hit !== undefined) return hit;
  const monster = Content.monster(monsterRef);
  const table = monster ? Content.loot(monster.lootTableId) : undefined;
  const built = monster && table ? fromLootTable(monsterRef, table) : null;
  cache.set(monsterRef, built);
  return built;
}

/** Tuning uygulanmış efektif tetik yüzdesi (kaynak değeri DEĞİŞMEZ). */
export function effectiveTriggerPercent(slot: DropSlotSourceFact, tuning: DropTuning): number {
  return Math.max(0, Math.min(100, slot.triggerPercent * tuning.dropRateMultiplier));
}

/** Tuning uygulanmış efektif coin (kaynak değeri DEĞİŞMEZ). */
export function effectiveCoin(profile: MonsterDropProfile, tuning: DropTuning): number {
  return Math.max(0, Math.round(profile.source.coin * tuning.coinMultiplier));
}
