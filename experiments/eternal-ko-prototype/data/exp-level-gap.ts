/** SEVİYE FARKI EXP CEZASI — SAF KATMAN (P2.14)
 *
 *  ══════════════ NEDEN VAR ══════════════
 *  Ölçüm: seviye eğrisi ve mob EXP değerleri KAYNAKTAN geliyor ama
 *  Lv1→20 yalnız 106 kill sürüyordu. İki sebep vardı:
 *
 *    1. KO'nun Lv1-20 bandı zaten hızlıdır; asıl duvar Lv20+'dadır.
 *       Moradon tavanı 20 olduğu için oyunun TAMAMI hızlı banda düşüyor.
 *    2. KO'da seviyenin çok altındaki mobu öldürmek EXP'yi kırpar.
 *       Bizde böyle bir kural YOKTU — Lv1 karakter uzaktaki Sv15 reisi
 *       öldürünce tam EXP alıyordu.
 *
 *  Bu dosya ikinci eksiği kapatır.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. Aynı iki seviye →
 *  aynı çarpan.
 *
 *  ══════════════ KADEMELER PROJECT LEGACY KARARIDIR ══════════════
 *  KO'nun tam formülü elimizdeki veride YOK (sunucu kodunda). Kaynağı
 *  taklit eden bir kademe tablosu kuruldu; sayılar uydurulmadı ama
 *  kaynaktan da türetilmedi — tuning'dir ve tek yerden değişir. */

/** `mobLevel - playerLevel` farkına göre EXP çarpanı.
 *
 *  Fark NEGATİF ise mob senden düşüktür → ceza.
 *  Fark POZİTİF ise mob senden yüksektir → küçük bonus (risk ödülü).
 *
 *  Kademeler eşik-tabanlıdır: fark bu değerden KÜÇÜK ya da EŞİTSE
 *  o satırın çarpanı geçerlidir. İlk eşleşen satır kazanır. */
const GAP_TABLE: ReadonlyArray<readonly [maxGap: number, mult: number]> = [
  [-15, 0.05],   // 15+ seviye altı → neredeyse hiç EXP
  [-10, 0.15],
  [-7, 0.35],
  [-5, 0.55],
  [-3, 0.80],
  [2, 1.00],     // -2 .. +2 → tam EXP (kendi bandın)
  [5, 1.15],     // 3-5 seviye üstü → risk ödülü
  [Number.POSITIVE_INFINITY, 1.30],
];

/** Alt sınır: hiçbir kill TAM SIFIR vermez. Sıfır EXP, oyuncuya
 *  "bu mob bozuk" hissi verir; çok küçük bir sayı "yanlış yerdesin"
 *  hissi verir. */
export const MIN_EXP_MULTIPLIER = 0.05;

/** Seviye farkı çarpanı [0,1.3]. */
export function expLevelGapMultiplier(playerLevel: number, mobLevel: number): number {
  const gap = mobLevel - playerLevel;
  for (const [maxGap, mult] of GAP_TABLE) {
    if (gap <= maxGap) return mult;
  }
  return 1;
}

/** Bir kill'in vereceği EXP. Zincir açıktır:
 *      kaynak EXP → seviye farkı çarpanı → denge çarpanı → tam sayı
 *  Sıra ÖNEMLİDİR: denge çarpanı en sonda uygulanır ki DEV'den
 *  değiştirildiğinde kaynak matematiği bozulmasın. */
export function killExp(
  sourceExp: number, playerLevel: number, mobLevel: number, balanceMult = 1,
): number {
  const gap = expLevelGapMultiplier(playerLevel, mobLevel);
  const raw = sourceExp * gap * balanceMult;
  return Math.max(1, Math.floor(raw));
}
