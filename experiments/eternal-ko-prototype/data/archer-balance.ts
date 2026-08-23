/** ARCHER COMBAT BALANCE V1 — TEK data-driven balance profili (P1.3)
 *
 *  ══ EN ÖNEMLİ KURAL: SOURCE FACT ile PROJECT LEGACY TUNING KESİN AYRILIR ══
 *
 *  `source*` ön ekli her alan KO_Reference_v8.db'den OKUNMUŞTUR — tahmin yoktur,
 *  değiştirilmez, kaynak JSON'a geri yazılmaz.
 *  `tuning` bloğundaki her alan PROJECT LEGACY KARARIDIR — KO'dan gelmiş gibi
 *  belgelenmez. İkisi asla karıştırılmaz.
 *
 *  Bu dosya combat/domain katmanının TEK otoritesidir:
 *    · `archer-skills.ts`  davranışları (hasar / ateş / zehir) buradan türetir,
 *    · `MultiShot.ts`      3/5 profillerini buradan türetir,
 *    · `state.ts`          cast range'leri buradan kaydeder.
 *  Scene'e ve Genie'ye hiçbir hasar rakamı yazılmaz.
 *
 *  ── SORGULANMIŞ KAYNAK (22 Ağu 2026, KO_Reference_v8.db) ──────────────────
 *  magic_type2 : hit_type · hit_rate · add_damage · add_range · need_arrow
 *  magic_type3 : first_damage · time_damage · duration · attribute
 *  skills      : mana_cost · skill_level · recast_time · range_value · cast_time
 *  Tablolar aşağıda birebir taşınır; ölçüm çıktısı `docs/ARCHER_BALANCE_V1.md`. */

import { Content } from '../../../src/game/data/GameContentRepository.js';

export const ARCHER = {
  STANDART_ATIS: 102003,   // Archery
  DELICI_OK: 107500,       // Through Shot
  KOR_OKU: 107505,         // Fire Arrow
  ZEHIRLI_UC: 107510,      // Poison Arrow
  UCLU_SALVO: 107515,      // Multiple Shot
  IZCI_OKU: 107520,        // Guided Arrow
  KESKIN_ATIS: 107525,     // Perfect Shot
  ALEV_ATISI: 107530,      // Fire Shot
  TOKSIK_ATIS: 107535,     // Poison Shot
  YIRTICI_OK: 107540,      // Arc Shot
  PATLAYICI_OK: 107545,    // Explosive Shot
  ENGEREK_OKU: 107550,     // Viper
  BESLI_SALVO: 107555,     // Arrow Shower
  GOLGE_AVCISI: 107560,    // Shadow Hunter
  KARA_TAKIP: 108570,      // Dark Pursuer
} as const;

export type ArcherElement = 'none' | 'fire' | 'poison';

/** KO kaynağından OKUNAN ham alanlar. Hiçbiri gameplay tuning DEĞİLDİR. */
export interface ArcherSourceFacts {
  /** `magic_type2.add_damage` — hasar YÜZDESİ. Kayıt yoksa null. */
  readonly addDamage: number | null;
  /** `magic_type2.need_arrow` — atılan ok sayısı. */
  readonly needArrow: number | null;
  /** `magic_type2.hit_type` — semantiği DOĞRULANMADI, ham saklanır. */
  readonly hitType: number | null;
  /** `magic_type2.hit_rate` — semantiği DOĞRULANMADI, ham saklanır. */
  readonly hitRate: number | null;
  /** `magic_type2.add_range` — 14 kayıtta da 100; ayrım üretmez. */
  readonly addRange: number | null;
  /** `magic_type3.first_damage` — anlık elemental hasar (KO ölçeği). */
  readonly firstDamage: number | null;
  /** `magic_type3.time_damage` — zamana yayılı hasar (KO ölçeği). */
  readonly timeDamage: number | null;
  /** `magic_type3.duration` — BİRİMİ ÇÖZÜLMEDİ (ham 20). */
  readonly durationRaw: number | null;
  /** `magic_type3.attribute` — 1 = ateş, 6 = zehir. */
  readonly attribute: number | null;
  /** `skills.cast_time` — BİRİMİ ÇÖZÜLMEDİ (ham 13 / 15). */
  readonly castTimeRaw: number;
  /** `skills.range_value` — 15 kayıtta da 0; menzil ayrımı ÜRETMEZ. */
  readonly rangeValueRaw: number;
}

/** PROJECT LEGACY kararları. KO'dan GELMEZ. */
export interface ArcherTuning {
  /** Cast menzili (world birimi). Kaynak `range_value = 0` olduğu için tuning. */
  readonly castRange: number;
  readonly element: ArcherElement;
  /** Anlık elemental bonus katsayısı (× playerAttack). Ateş ailesi. */
  readonly elementalCoefficient: number;
  /** DoT'un TOPLAM katsayısı — tick başına DEĞİL. Zehir ailesi. */
  readonly dotTotalCoefficient: number;
  readonly dotDurationSec: number;
  readonly dotTickSec: number;
  /** Çok-ok yayılım açıları (derece). Tek-oklu skillerde [0]. */
  readonly spreadDeg: readonly number[];
  /** Kaynakta `add_damage` kaydı YOKSA kullanılacak katsayı (yalnız 102003). */
  readonly physicalCoefficientFallback: number | null;
  /** Kaynak `skills.skill_level` yerine kullanılacak açılış seviyesi.
   *  null = kaynak değeri aynen geçerli.
   *  BU BİR PROJECT LEGACY TUNING DEĞERİDİR: kaynak seviye alanı DEĞİŞTİRİLMEZ,
   *  `source` tarafında ve raporda ham hâliyle görünmeye devam eder. */
  readonly requiredLevelOverride: number | null;
}

export interface ArcherSkillBalance {
  readonly sourceRef: number;
  /** Kaynaktaki İngilizce ad (izlenebilirlik için). */
  readonly koName: string;
  readonly source: ArcherSourceFacts;
  readonly tuning: ArcherTuning;
}

/* ------------------------------------------------------------------ sabitler */

/** 15 Archer saldırı skillinin tamamı için TEK cast menzili.
 *  Gerekçe: kaynak `range_value` 15 kayıtta da 0, `add_range` 14 kayıtta da 100.
 *  Kaynak menzil AYRIMI ÜRETMİYOR → yapay skill-başına fark yaratılmaz.
 *  BU BİR PROJECT LEGACY TUNING DEĞERİDİR — kaynak alanlar DEĞİŞTİRİLMEDİ.
 *
 *  P1.3 : 340 world
 *  P1.4.1: **400 world** (mevcut değer). Genie hedef edinme yarıçapı
 *  (`attackRange`) BUNDAN AYRI bir kavramdır ve bu değişiklikten etkilenmez. */
export const ARCHER_CAST_RANGE = 400;

/** §9 — zehir süresi/tick'i. Kaynak `duration = 20`'nin BİRİMİ ÇÖZÜLMEDİ;
 *  bu değerler prototip tuning'idir ve kaynak süresi diye BELGELENMEZ. */
export const POISON_DURATION_SEC = 4.0;
export const POISON_TICK_SEC = 1.0;

/** P1.3.1 — Üçlü Salvo yayılımı ±4° → ±5°.
 *  Amaç: küçük hedefte mesafe RİSKİ oluşsun. ±4°'de cast menzilinin sonunda
 *  yanal sapma 335·sin4° = 23.4 < 26 (hitbox) olduğu için 3'lü hiçbir mesafede
 *  ok kaybetmiyordu. ±5° ile sınır 26/sin5° ≈ 298 birime iner.
 *  BU BİR PROJECT LEGACY TUNING DEĞERİDİR — kaynakta spread alanı yoktur.
 *  Beşli Salvo'nun ±8°'si DEĞİŞMEDİ. */
const SPREAD_3 = [-5, 0, 5] as const;
const SPREAD_5 = [-8, -4, 0, 4, 8] as const;
const SPREAD_1 = [0] as const;

function facts(o: Partial<ArcherSourceFacts>): ArcherSourceFacts {
  return {
    addDamage: null, needArrow: null, hitType: null, hitRate: null, addRange: null,
    firstDamage: null, timeDamage: null, durationRaw: null, attribute: null,
    castTimeRaw: 13, rangeValueRaw: 0, ...o,
  };
}
function tune(o: Partial<ArcherTuning> = {}): ArcherTuning {
  return {
    castRange: ARCHER_CAST_RANGE, element: 'none',
    elementalCoefficient: 0, dotTotalCoefficient: 0,
    dotDurationSec: 0, dotTickSec: 0, spreadDeg: SPREAD_1,
    physicalCoefficientFallback: null, requiredLevelOverride: null, ...o,
  };
}

/* ------------------------------------------------------------------- profil */

export const ARCHER_BALANCE: Readonly<Record<number, ArcherSkillBalance>> = {
  /* Archery — magic_type2 KAYDI YOKTUR. %100 "normal atış" karşılığı bir
     PROJECT LEGACY kararıdır, kaynak add_damage diye belgelenmez. */
  [ARCHER.STANDART_ATIS]: {
    sourceRef: ARCHER.STANDART_ATIS, koName: 'Archery',
    source: facts({ needArrow: null }),
    /* P1.3.1 — kaynak `skill_level = 3`; oyunun ilk skilli olduğu için Lv1'e
       çekildi (TUNING). Kaynak değeri `Content.skills` içinde AYNEN duruyor. */
    tuning: tune({ physicalCoefficientFallback: 1.00, requiredLevelOverride: 1 }),
  },
  [ARCHER.DELICI_OK]: {
    sourceRef: ARCHER.DELICI_OK, koName: 'Through Shot',
    source: facts({ addDamage: 150, needArrow: 1, hitType: 0, hitRate: 100, addRange: 100 }),
    /* P1.3.1 — kaynak `skill_level = 0` (Lv0 bir oyun seviyesi değil); ikinci
       skill olarak Lv3'e alındı (TUNING). Kaynak değeri değiştirilmedi. */
    tuning: tune({ requiredLevelOverride: 3 }),
  },
  [ARCHER.KOR_OKU]: {
    sourceRef: ARCHER.KOR_OKU, koName: 'Fire Arrow',
    source: facts({
      addDamage: 100, needArrow: 1, hitType: 0, hitRate: 100, addRange: 100,
      firstDamage: -156, durationRaw: 0, attribute: 1,
    }),
    tuning: tune({ element: 'fire', elementalCoefficient: 0.25 }),
  },
  [ARCHER.ZEHIRLI_UC]: {
    sourceRef: ARCHER.ZEHIRLI_UC, koName: 'Poison Arrow',
    source: facts({
      addDamage: 100, needArrow: 1, hitType: 0, hitRate: 100, addRange: 100,
      timeDamage: -232, durationRaw: 20, attribute: 6,
    }),
    tuning: tune({
      element: 'poison', dotTotalCoefficient: 0.30,
      dotDurationSec: POISON_DURATION_SEC, dotTickSec: POISON_TICK_SEC,
    }),
  },
  [ARCHER.UCLU_SALVO]: {
    sourceRef: ARCHER.UCLU_SALVO, koName: 'Multiple Shot',
    source: facts({ addDamage: 99, needArrow: 3, hitType: 0, hitRate: 100, addRange: 100 }),
    tuning: tune({ spreadDeg: SPREAD_3 }),
  },
  [ARCHER.IZCI_OKU]: {
    sourceRef: ARCHER.IZCI_OKU, koName: 'Guided Arrow',
    /* hit_type = 2 HAM saklanır; "kesin vurur" gibi bir davranış EKLENMEDİ. */
    source: facts({ addDamage: 100, needArrow: 1, hitType: 2, hitRate: 100, addRange: 100 }),
    tuning: tune(),
  },
  [ARCHER.KESKIN_ATIS]: {
    sourceRef: ARCHER.KESKIN_ATIS, koName: 'Perfect Shot',
    /* hit_rate = 150 HAM saklanır; accuracy sistemi bu görevde YAZILMADI. */
    source: facts({ addDamage: 200, needArrow: 1, hitType: 0, hitRate: 150, addRange: 100 }),
    tuning: tune(),
  },
  [ARCHER.ALEV_ATISI]: {
    sourceRef: ARCHER.ALEV_ATISI, koName: 'Fire Shot',
    source: facts({
      addDamage: 100, needArrow: 1, hitType: 0, hitRate: 100, addRange: 100,
      firstDamage: -309, durationRaw: 0, attribute: 1,
    }),
    tuning: tune({ element: 'fire', elementalCoefficient: 0.50 }),
  },
  [ARCHER.TOKSIK_ATIS]: {
    sourceRef: ARCHER.TOKSIK_ATIS, koName: 'Poison Shot',
    source: facts({
      addDamage: 100, needArrow: 1, hitType: 0, hitRate: 100, addRange: 100,
      timeDamage: -463, durationRaw: 20, attribute: 6,
    }),
    tuning: tune({
      element: 'poison', dotTotalCoefficient: 0.60,
      dotDurationSec: POISON_DURATION_SEC, dotTickSec: POISON_TICK_SEC,
    }),
  },
  [ARCHER.YIRTICI_OK]: {
    sourceRef: ARCHER.YIRTICI_OK, koName: 'Arc Shot',
    source: facts({ addDamage: 250, needArrow: 1, hitType: 0, hitRate: 100, addRange: 100 }),
    tuning: tune(),
  },
  [ARCHER.PATLAYICI_OK]: {
    sourceRef: ARCHER.PATLAYICI_OK, koName: 'Explosive Shot',
    source: facts({
      addDamage: 100, needArrow: 1, hitType: 0, hitRate: 100, addRange: 100,
      firstDamage: -463, durationRaw: 0, attribute: 1,
    }),
    tuning: tune({ element: 'fire', elementalCoefficient: 0.75 }),
  },
  [ARCHER.ENGEREK_OKU]: {
    sourceRef: ARCHER.ENGEREK_OKU, koName: 'Viper',
    source: facts({
      addDamage: 100, needArrow: 1, hitType: 0, hitRate: 100, addRange: 100,
      timeDamage: -691, durationRaw: 20, attribute: 6,
    }),
    tuning: tune({
      element: 'poison', dotTotalCoefficient: 0.90,
      dotDurationSec: POISON_DURATION_SEC, dotTickSec: POISON_TICK_SEC,
    }),
  },
  [ARCHER.BESLI_SALVO]: {
    sourceRef: ARCHER.BESLI_SALVO, koName: 'Arrow Shower',
    source: facts({ addDamage: 99, needArrow: 5, hitType: 0, hitRate: 100, addRange: 100, castTimeRaw: 15 }),
    tuning: tune({ spreadDeg: SPREAD_5 }),
  },
  [ARCHER.GOLGE_AVCISI]: {
    sourceRef: ARCHER.GOLGE_AVCISI, koName: 'Shadow Hunter',
    source: facts({ addDamage: 250, needArrow: 1, hitType: 2, hitRate: 100, addRange: 100 }),
    tuning: tune(),
  },
  [ARCHER.KARA_TAKIP]: {
    sourceRef: ARCHER.KARA_TAKIP, koName: 'Dark Pursuer',
    /* hit_type = 2 ve hit_rate = 300 HAM saklanır; %300 accuracy davranışı YOK. */
    source: facts({ addDamage: 250, needArrow: 1, hitType: 2, hitRate: 300, addRange: 100 }),
    tuning: tune(),
  },
};

/** 15 skill, oyun sırasına göre. */
export const ARCHER_SKILL_ORDER: number[] = [
  ARCHER.STANDART_ATIS, ARCHER.DELICI_OK, ARCHER.KOR_OKU, ARCHER.ZEHIRLI_UC,
  ARCHER.UCLU_SALVO, ARCHER.IZCI_OKU, ARCHER.KESKIN_ATIS, ARCHER.ALEV_ATISI,
  ARCHER.TOKSIK_ATIS, ARCHER.YIRTICI_OK, ARCHER.PATLAYICI_OK, ARCHER.ENGEREK_OKU,
  ARCHER.BESLI_SALVO, ARCHER.GOLGE_AVCISI, ARCHER.KARA_TAKIP,
];

export function balanceOf(sourceRef: number): ArcherSkillBalance | undefined {
  return ARCHER_BALANCE[sourceRef];
}

/* ------------------------------------------------------- TÜREVLER (formül) */

/** §3 — tek kural: `physicalCoefficient = add_damage / 100`.
 *  3/5 salvolarda bu katsayı OK BAŞINADIR (99 → 0.99), toplam hasar DEĞİLDİR. */
export function physicalCoefficient(sourceRef: number): number {
  const b = ARCHER_BALANCE[sourceRef];
  if (!b) return 1;
  if (b.source.addDamage !== null) return b.source.addDamage / 100;
  return b.tuning.physicalCoefficientFallback ?? 1;
}

/** Atılan ok sayısı — kaynak `need_arrow`. Kayıt yoksa 1. */
export function projectileCount(sourceRef: number): number {
  return ARCHER_BALANCE[sourceRef]?.source.needArrow ?? 1;
}

export function isMultiShotRef(sourceRef: number): boolean {
  return projectileCount(sourceRef) > 1;
}

export function castRange(sourceRef: number): number {
  return ARCHER_BALANCE[sourceRef]?.tuning.castRange ?? ARCHER_CAST_RANGE;
}

/** Individual cooldown (sn) = kaynak `recast_time` / 10. KODDA SABİT YOK. */
export function sourceCooldownSec(sourceRef: number): number {
  const s = Content.skills.find((x) => x.sourceRef === sourceRef);
  return s ? s.recastTimeSourceRaw / 10 : 0;
}

/** DoT kaç tick'e bölünür? (4.0 sn / 1.0 sn = 4) */
export function dotTickCount(sourceRef: number): number {
  const t = ARCHER_BALANCE[sourceRef]?.tuning;
  if (!t || t.dotTotalCoefficient <= 0 || t.dotTickSec <= 0) return 0;
  return Math.max(1, Math.round(t.dotDurationSec / t.dotTickSec));
}

/** §9 — TOPLAM katsayı tick'lere DETERMİNİSTİK bölünür.
 *  0.60 total / 4 tick → tick başına 0.15. Toplamın sapması test edilir. */
export function dotPerTickCoefficient(sourceRef: number): number {
  const n = dotTickCount(sourceRef);
  if (n === 0) return 0;
  return ARCHER_BALANCE[sourceRef]!.tuning.dotTotalCoefficient / n;
}

/** Kaynak `skills.skill_level` — ham, DEĞİŞTİRİLMEZ. */
export function sourceRequiredLevel(sourceRef: number): number {
  return Content.skills.find((x) => x.sourceRef === sourceRef)?.level ?? 0;
}

/** Oyunda GEÇERLİ açılış seviyesi: tuning ezmesi varsa o, yoksa kaynak. */
export function effectiveRequiredLevel(sourceRef: number): number {
  return ARCHER_BALANCE[sourceRef]?.tuning.requiredLevelOverride ?? sourceRequiredLevel(sourceRef);
}

export function elementOf(sourceRef: number): ArcherElement {
  return ARCHER_BALANCE[sourceRef]?.tuning.element ?? 'none';
}
export function elementalCoefficient(sourceRef: number): number {
  return ARCHER_BALANCE[sourceRef]?.tuning.elementalCoefficient ?? 0;
}

/** Bir skillin V1 tablo satırı — UI/debug ve rapor aynı yerden okur. */
export interface ArcherBalanceRow {
  sourceRef: number; koName: string;
  manaCost: number;
  /** Oyunda geçerli seviye (tuning ezmesi uygulanmış). */
  requiredLevel: number;
  /** Kaynaktaki ham seviye — ezme varsa bile bu değişmez. */
  sourceRequiredLevel: number;
  individualCooldownSec: number; castRange: number;
  physicalCoefficient: number; projectileCount: number;
  element: ArcherElement; elementalCoefficient: number;
  dotTotalCoefficient: number; dotPerTickCoefficient: number; dotTickCount: number;
  sourceHitType: number | null; sourceHitRate: number | null;
}

export function balanceRow(sourceRef: number): ArcherBalanceRow {
  const b = ARCHER_BALANCE[sourceRef]!;
  const s = Content.skills.find((x) => x.sourceRef === sourceRef);
  return {
    sourceRef, koName: b.koName,
    manaCost: s?.manaCost ?? 0,
    requiredLevel: effectiveRequiredLevel(sourceRef),
    sourceRequiredLevel: s?.level ?? 0,
    individualCooldownSec: sourceCooldownSec(sourceRef),
    castRange: b.tuning.castRange,
    physicalCoefficient: physicalCoefficient(sourceRef),
    projectileCount: projectileCount(sourceRef),
    element: b.tuning.element,
    elementalCoefficient: b.tuning.elementalCoefficient,
    dotTotalCoefficient: b.tuning.dotTotalCoefficient,
    dotPerTickCoefficient: dotPerTickCoefficient(sourceRef),
    dotTickCount: dotTickCount(sourceRef),
    sourceHitType: b.source.hitType,
    sourceHitRate: b.source.hitRate,
  };
}
