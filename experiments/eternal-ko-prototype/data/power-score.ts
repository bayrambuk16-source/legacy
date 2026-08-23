/** GÜÇ SKORU — SAF FORMÜL (P2.13)
 *
 *  ══════════════ NEDEN TEK SAYI ══════════════
 *  Üç ayrı soru aynı cevaba bakar:
 *      · "Bu item daha mı iyi?"   → oto giy
 *      · "Ne kadar güçlendim?"    → `+20 Up` bildirimi
 *      · "Bu item satılır mı?"    → oto sat
 *  Üçü için ayrı kural yazmak yerine TEK skor kullanılır. Böylece bir
 *  kural değişince üçü birden tutarlı kalır.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. Aynı statlar → aynı skor.
 *
 *  ══════════════ SKOR BİR ÖLÇÜ DEĞİL, BİR HİSTİR ══════════════
 *  Üstel eğri kullanılır: skor "iki katı skor = iki katı güçlü" ANLAMINA
 *  GELMEZ. Amaç ilerleme hissi vermek ve iki itemi karşılaştırmaktır.
 *  Gerçek güç karşılaştırması için karakter ekranındaki ham statlara
 *  bakılmalıdır.
 *
 *  ══════════════ HEDEF NOKTALAR (kullanıcı kararı) ══════════════
 *      Sv1  çıplak      ≈      50
 *      Sv20 tam takım   ≈ 600 000 – 700 000
 *  Eğri bu iki noktadan geçecek şekilde kalibre edildi. */

/** Skora giren ham değerler. Hepsi `finalStats()` ve türevlerinden okunur;
 *  burada hiçbir şey hesaplanmaz. */
export interface PowerInput {
  /** KO Archer Attack Power. */
  readonly attack: number;
  readonly defense: number;
  readonly maxHp: number;
  readonly maxMp: number;
  /** Efektif DEX (taban + dağıtılan + ekipman). */
  readonly dex: number;
  /** Efektif HP statı. */
  readonly sta: number;
}

/* ───────────────────────── ağırlıklar ─────────────────────────
 *  PROJECT LEGACY TUNING — kaynaktan gelmez.
 *  Saldırı en ağır: okçunun asıl işi vurmak. Can ve savunma hayatta
 *  kalma tarafı, daha hafif. MP en hafif: skill kullanımını mümkün kılar
 *  ama doğrudan güç değildir. */
export const POWER_WEIGHTS = {
  attack: 6,
  defense: 2,
  maxHp: 0.5,
  maxMp: 0.2,
  dex: 1.5,
  sta: 1,
} as const;

/** Ham ağırlıklı toplam — üs uygulanmadan önceki taban. */
export function powerBase(p: PowerInput): number {
  const w = POWER_WEIGHTS;
  return Math.max(0,
    p.attack * w.attack
    + p.defense * w.defense
    + p.maxHp * w.maxHp
    + p.maxMp * w.maxMp
    + p.dex * w.dex
    + p.sta * w.sta);
}

/* ───────────────────────── kalibrasyon ─────────────────────────
 *  Eğri: skor = SCALE × taban^EXPONENT
 *
 *  İki UÇ NOKTA CANLI OYUNDA ÖLÇÜLDÜ (uydurulmadı):
 *      Sv1  çıplak (başlangıç yayı)      → taban  230
 *      Sv20 tam takım, hepsi +8          → taban 2133
 *
 *  Hedef skorlar (kullanıcı kararı): 50 ve 650 000.
 *  Üs bu dört sayıdan ÇÖZÜLDÜ:
 *      us = ln(650000 / 50) / ln(2133 / 230) = 4.25 */
export const POWER_BASE_MIN = 230;
export const POWER_SCORE_MIN = 50;
export const POWER_EXPONENT = 4.25;
export const POWER_SCALE = POWER_SCORE_MIN / Math.pow(POWER_BASE_MIN, POWER_EXPONENT);

/** Güç skoru. Her zaman tam sayıdır — kesirli güç göstermek anlamsız. */
export function powerScore(p: PowerInput): number {
  const base = powerBase(p);
  if (base <= 0) return 0;
  return Math.max(1, Math.round(POWER_SCALE * Math.pow(base, POWER_EXPONENT)));
}

/** İki skor arasındaki fark — bildirim metni için.
 *  Büyük sayılarda kısaltma yapılır: `+12.4k`, `+3.1M`. */
export function formatPowerDelta(before: number, after: number): string {
  const d = after - before;
  const sign = d >= 0 ? '+' : '-';
  const a = Math.abs(d);
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${sign}${(a / 1_000).toFixed(1)}k`;
  return `${sign}${a}`;
}

/** Skorun kendisi için kısa gösterim (HUD'da yer dar). */
export function formatPower(score: number): string {
  if (score >= 1_000_000) return `${(score / 1_000_000).toFixed(2)}M`;
  if (score >= 10_000) return `${Math.round(score / 1_000)}k`;
  if (score >= 1_000) return `${(score / 1_000).toFixed(1)}k`;
  return String(score);
}
