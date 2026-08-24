/** HEDEF SEVİYE FARKI — HEDEF KARTI İBARESİ (P2.38)
 *
 *  ══════════════ NEDEN VAR ══════════════
 *  Sv10 oyuncuyla Sv20 bandında üç dakika farm ölçüldü:
 *
 *      hedef   kill/dk  ölüm  EXP/dk  ölüm kaybı düşünce NET
 *      Sv11      5,3      0     246          +738
 *      Sv15      2,0      8     997          +963
 *      Sv20      0,3     14     596         −1761
 *      Sv25      0,0     16       0            —
 *
 *  Sv20'de oyuncu GERİYE gidiyor: kazandığından fazlasını ölüm
 *  cezasına veriyor. Sv25'te hiç öldüremiyor.
 *
 *  Duvar doğru yerde ama GÖRÜNMÜYOR. Oyuncu bunu ancak defalarca
 *  ölerek öğreniyor; haritada ya da hedef kartında hiçbir işaret yok.
 *
 *  ══════════════ NEDEN SEVİYE FARKI, MUTLAK SEVİYE DEĞİL ══════════════
 *  "Sv20" yazmak tek başına bir şey anlatmaz — oyuncu kendi seviyesini
 *  akılda tutup çıkarma yapmak zorunda kalır. Fark doğrudan gösterilir:
 *  aynı bilgi, düşünmeden okunur.
 *
 *  ══════════════ EŞİKLER ÖLÇÜMDEN ══════════════
 *  Uydurma değil, yukarıdaki tablodan:
 *      +4'e kadar   → güvenli (ölüm yok ya da çok az)
 *      +5..+7       → verimli ama ölümlü; EN İYİ EXP burada
 *      +8..+12      → net kayıp bölgesi
 *      +13 ve üstü  → öldürmek imkânsız
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. */

export type TargetRisk = 'easy' | 'fair' | 'risky' | 'deadly' | 'hopeless';

/** Ölçülen eşikler. Seviye FARKI = mob − oyuncu. */
export const RISK_FAIR_GAP = 0;
export const RISK_RISKY_GAP = 5;
export const RISK_DEADLY_GAP = 8;
export const RISK_HOPELESS_GAP = 13;

export function targetRisk(monsterLevel: number, playerLevel: number): TargetRisk {
  const gap = monsterLevel - playerLevel;
  if (gap >= RISK_HOPELESS_GAP) return 'hopeless';
  if (gap >= RISK_DEADLY_GAP) return 'deadly';
  if (gap >= RISK_RISKY_GAP) return 'risky';
  if (gap >= RISK_FAIR_GAP) return 'fair';
  return 'easy';
}

/** Hedef kartında mob adının yanına yazılan işaret.
 *
 *  KISA olmak zorunda: kart dar ve mob adı zaten uzun olabiliyor
 *  ("Kecoon Cengaveri"). Bu yüzden işaret, kelime değil. */
export const RISK_MARK: Readonly<Record<TargetRisk, string>> = {
  easy: '',
  fair: '',
  risky: '!',
  deadly: '!!',
  hopeless: '✖',
};

/** Seviye farkının rengi. Yeşil-sarı-turuncu-kırmızı sırası oyunun
 *  başka yerlerinde de aynı anlamı taşıyor (zindan risk etiketi). */
export const RISK_COLOR: Readonly<Record<TargetRisk, string>> = {
  easy: '#7fa85c',
  fair: '#e8d9a0',
  risky: '#e0b03c',
  deadly: '#e08a3c',
  hopeless: '#c96a5a',
};

/** Kartta gösterilecek seviye metni: `Sv20 (+10)`.
 *
 *  Fark sıfırsa parantez YAZILMAZ — gereksiz gürültü olur. */
export function targetLevelText(monsterLevel: number, playerLevel: number): string {
  const gap = monsterLevel - playerLevel;
  if (gap === 0) return `Sv${monsterLevel}`;
  return `Sv${monsterLevel} (${gap > 0 ? '+' : ''}${gap})`;
}
