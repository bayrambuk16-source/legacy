/** KO ARCHER FİZİKSEL HASAR — SAF KAYNAK MATEMATİĞİ (P2.5A)
 *
 *  ══════════════ BU DOSYA NE YAPAR ══════════════
 *  Knight Online sunucu kodundaki Archer/Rogue fiziksel hasar zincirini
 *  uygular. DOM, renderer, three, UI, mutable global state BİLMEZ.
 *  Her fonksiyon saftır: aynı girdi → aynı çıktı.
 *
 *  ══════════════ ZİNCİR ══════════════
 *      AP    → saldırı gücü (silah + DEX + seviye + sınıf katsayısı)
 *      HitB  → zırh azaltması sonrası vuruş
 *      hasar → normal atış ya da Type2 skill rolü
 *
 *  ══════════════ KATSAYILAR TAM SAYI ARİTMETİĞİYLE ══════════════
 *  Kaynak katsayılar ondalıktır (0.00035, 0.0015, 0.003 ...) ama JavaScript'te
 *  `0.003 * 3600 * 60` = 647.9999999999999 çıkar; `trunc` alınca sonuç BİR
 *  EKSİK olur — KO'nun Lv60 MaxMP değeri 1020 iken 1019 görülüyordu.
 *  Bu yüzden katsayılar PAY olarak saklanır ve bölme EN SONA bırakılır.
 *
 *  ══════════════ INTEGER DAVRANIŞI ══════════════
 *  C++ integer atama/bölme davranışı korunur: `Math.trunc`, asla `Math.round`.
 *
 *  ══════════════ KAPSAM DIŞI ══════════════
 *  · KO hit/miss/evasion parity: NOT IMPLEMENTED IN P2.5A
 *  · KO elemental/DoT formülü: NOT IMPLEMENTED IN P2.5A
 *  · Mob → oyuncu hasarı DEĞİŞMEDİ (legacy `damageRoll` yolunda kalır) */

/* ═══════════════════════ SINIF AŞAMALARI ═══════════════════════ */

/** Katsayı paydası. Kaynak 0.00015 → PAY 15. */
export const COEF_SCALE = 100000;

export interface RogueStageCoefficients {
  readonly stage: RogueStage;
  /** KO class kodu (nation varyantları aynı katsayıyı taşır). */
  readonly classCodes: readonly [number, number];
  /** Bow katsayısı × COEF_SCALE. 0.00015 → 15 */
  readonly bow: number;
  /** HP katsayısı × COEF_SCALE. 0.0005 → 50 */
  readonly hp: number;
  /** SP (Rogue mana) katsayısı × COEF_SCALE. 0.0015 → 150 */
  readonly sp: number;
}

export type RogueStage = 'beginner' | 'hunter' | 'master';

/** KO `COEFFICIENT` tablosundaki Rogue satırları. */
export const ROGUE_STAGES: Readonly<Record<RogueStage, RogueStageCoefficients>> = {
  beginner: { stage: 'beginner', classCodes: [102, 202], bow: 15, hp: 50, sp: 150 },
  hunter: { stage: 'hunter', classCodes: [107, 207], bow: 35, hp: 150, sp: 300 },
  master: { stage: 'master', classCodes: [108, 208], bow: 38, hp: 150, sp: 300 },
};

/** GEÇİCİ — sınıf geçişi GÖREVLE olacak (mob kesme görevi), seviyeyle değil.
 *  Görev sistemi gelene kadar oyun ilerleyebilsin diye seviye eşiği kullanılır.
 *  Görev sistemi geldiğinde YALNIZ `rogueStageForLevel` değişir; formüller
 *  ve katsayılar aynı kalır. */
export const HUNTER_LEVEL_GATE = 12;
export const MASTER_LEVEL_GATE = 60;

export function rogueStageForLevel(level: number): RogueStageCoefficients {
  if (level >= MASTER_LEVEL_GATE) return ROGUE_STAGES.master;
  if (level >= HUNTER_LEVEL_GATE) return ROGUE_STAGES.hunter;
  return ROGUE_STAGES.beginner;
}

/* ═══════════════════════ TABAN STATLAR ═══════════════════════ */

/** Lv1 Rogue/Archer taban statları — KO sıfırlanmış karakter kaydı. */
export const ARCHER_BASE_STATS = {
  str: 60,
  /** Character ekranındaki "HP" statı; sunucuda STA olarak tutulur. */
  sta: 60,
  dex: 70,
  int: 50,
  mp: 50,
} as const;

/** Yaratılışta verilen serbest stat puanı. */
export const CREATION_STAT_POINTS = 10;

/** Bir seviyedeki TOPLAM dağıtılabilir stat puanı. KO: Lv2-60 → +3, Lv61+ → +5. */
export function statPointsForLevel(level: number): number {
  if (level < 1) return 0;
  return CREATION_STAT_POINTS + (Math.min(level, 60) - 1) * 3 + Math.max(0, level - 60) * 5;
}

/** Bir seviyedeki TOPLAM skill puanı. KO: Lv10'dan itibaren +2. */
export function skillPointsForLevel(level: number): number {
  return level < 10 ? 0 : 2 * (level - 9);
}

/* ═══════════════════════ SALDIRI GÜCÜ ═══════════════════════ */

export interface ArcherApInput {
  readonly level: number;
  /** effectiveDEX = taban + dağıtılan + ekipman + buff. */
  readonly dex: number;
  /** Kuşanılı yayın kaynak AP değeri. */
  readonly bowDamage: number;
  /** Sınıf aşamasının bow katsayısı (PAY, `COEF_SCALE` paydalı). */
  readonly bowCoefficient: number;
  /** Yüzde AP bonusu (buff/set). P2.5A'da 0. */
  readonly apBonusPercent?: number;
  /** Silaha eklenen ham hasar. P2.5A'da 0. */
  readonly addWeaponDamage?: number;
}

/** Silah hasarının kaynak alt sınırı. */
export const MIN_WEAPON_DAMAGE = 3;

/** KO Archer Attack Power.
 *
 *      base = 0.005 × itemDamage × (DEX + 40)
 *           + bowCoef × itemDamage × level × DEX
 *      AP   = (trunc(base) + 3) × (100 + apBonus) / 100
 *
 *  0.005 = 5/1000 ve bowCoef = PAY/COEF_SCALE olarak işlenir; ortak paydaya
 *  taşınıp bölme en sona bırakılır. */
export function koArcherAttackPower(input: ArcherApInput): number {
  const dmg = Math.max(MIN_WEAPON_DAMAGE, input.bowDamage + (input.addWeaponDamage ?? 0));
  const denom = 1000 * COEF_SCALE;
  const first = 5 * COEF_SCALE * dmg * (input.dex + 40);
  const second = 1000 * input.bowCoefficient * dmg * input.level * input.dex;
  const base = Math.trunc((first + second) / denom);
  const bonus = input.apBonusPercent ?? 0;
  return Math.trunc(((base + 3) * (100 + bonus)) / 100);
}

/* ═══════════════════════ CAN / MANA ═══════════════════════ */

/** KO Archer Max HP.
 *
 *      trunc( hpCoef × Lv² × STA + 0.1 × Lv × STA ) + floor(STA/5) + item + buff + 20 */
export function koArcherMaxHp(
  level: number, staStat: number, coefficient: number, itemHp = 0, buffHp = 0,
): number {
  const denom = 10 * COEF_SCALE;
  const a = 10 * coefficient * level * level * staStat;
  const b = COEF_SCALE * level * staStat;
  return Math.trunc((a + b) / denom) + Math.floor(staStat / 5) + itemHp + buffHp + 20;
}

/** KO Archer Max MP — Rogue mana havuzu INT değil STA'dan türer (SP katsayısı).
 *  MaxHP'den tek farkı: sonda `+20` YOKTUR. */
export function koArcherMaxMp(
  level: number, staStat: number, spCoefficient: number, itemMp = 0, buffMp = 0,
): number {
  const denom = 10 * COEF_SCALE;
  const a = 10 * spCoefficient * level * level * staStat;
  const b = COEF_SCALE * level * staStat;
  return Math.trunc((a + b) / denom) + Math.floor(staStat / 5) + itemMp + buffMp;
}

/* ═══════════════════════ ZIRH AZALTMASI ═══════════════════════ */

/** KO AI sunucusu: `HitB = Hit × 200 / (AC + 240)`, integer bölme. */
export function koPhysicalAfterArmor(attackPower: number, monsterDefense: number): number {
  return Math.trunc((attackPower * 200) / (monsterDefense + 240));
}

/* ═══════════════════════ HASAR ROLLERİ ═══════════════════════ */

/** [0, max] aralığında tam sayı — ÜST SINIR DAHİL (kaynak davranışı).
 *  `rng` projenin tohumlu akışıdır; `Math.random()` KULLANILMAZ. */
export function randomIntInclusive(rng: () => number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(max, Math.trunc(rng() * (max + 1)));
}

/** Normal ok (temel saldırı + Standart Atış):
 *
 *      damage = trunc( 0.85 × HitB + 0.30 × rastgele(0..HitB) ) */
export function koNormalPhysicalDamage(hitB: number, rng: () => number): number {
  if (hitB <= 0) return 0;
  const roll = randomIntInclusive(rng, hitB);
  return Math.trunc((85 * hitB + 30 * roll) / 100);
}

/** Type2 skill vuruşu: `SkillHit = trunc(HitB × addDamage / 100)`. */
export function koType2SkillHit(hitB: number, damageModPercent: number): number {
  return Math.trunc((hitB * damageModPercent) / 100);
}

/** Type2 ok hasarı — normal atıştan FARKLI kaynak formülü:
 *
 *      damage = trunc( Hit × 0.6 + rastgele(0..Hit) + 0.99 ) */
export function koType2ArrowDamage(skillHit: number, rng: () => number): number {
  if (skillHit <= 0) return 0;
  const roll = randomIntInclusive(rng, skillHit);
  return Math.trunc((60 * skillHit + 100 * roll + 99) / 100);
}
