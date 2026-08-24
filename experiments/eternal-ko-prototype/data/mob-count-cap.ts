/** SLOT MOB SAYISI TAVANI — SEVİYEYE GÖRE (P2.37)
 *
 *  ══════════════ NEDEN GEREKTİ ══════════════
 *  Sv50, tamamı +7 donanımlı bir karakterle üst bantta üç dakika farm
 *  ölçüldü. Hasar eğrisi (P2.36) düzeltildikten SONRA bile:
 *
 *      Sv31-42 →  9 ölüm
 *      Sv43-50 → 20 ölüm
 *
 *  Sebep tek tek mobun sertliği DEĞİL, KALABALIK. Aynı slot farklı
 *  mob sayılarıyla ölçüldü:
 *
 *      mob sayısı   kill/dk   ölüm
 *          8          3,0      31
 *          6          3,7      22
 *          5          5,0      15
 *          4          6,0       7
 *
 *  Sekizden dörde inince ölüm dörtte bire düşüyor, kill hızı ikiye
 *  katlanıyor.
 *
 *  Aritmetiği açık: Sv50 mobu tek başına on vuruşta öldürüyor — bu
 *  adil bir pay. Ama sekizi birden vurunca o pay bir saniyede bitiyor
 *  ve iksir yetişmiyor (ölçümde bütün stok tükendi).
 *
 *  ══════════════ NEDEN YERLEŞİMDE DEĞİL BURADA ══════════════
 *  Mob sayıları yerleşim üretiminden geliyor (`moradon-farm-slots.ts`,
 *  dışarıda üretilen bir dosya). Orada düzeltmek bir sonraki tazelemede
 *  kaybolur. Tavan yerleşimden BAĞIMSIZ çalışır: yerleşim ne derse
 *  desin, üst bantta bu sayı aşılamaz.
 *
 *  Tavan bir KIRPMADIR, atama değil: yerleşim daha AZ mob istiyorsa
 *  ona dokunulmaz.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. */

/** ═══ P2.41 — TAVAN DEĞİL, HEDEF ═══
 *
 *  Önce yalnız bir ÜST SINIR'dı: yerleşim daha az yazmışsa dokunulmuyordu.
 *  Sonuç, ölçüldü: alt bantlarda slot başına 5 mob kalıyordu, oysa oyuncu
 *  onları tek vuruşta indiriyor ve çoğu zaman respawn bekliyordu.
 *
 *  Artık sayıyı SEVİYE BANDI belirler; yerleşimin yazdığı değer
 *  kullanılmaz. Yerleşim dışarıda üretiliyor ve bir sonraki tazelemede
 *  yine 5 ya da 8 yazacak — sayı burada, tek yerde durmalı.
 *
 *  ══════════════ SAYILAR ÖLÇÜMDEN ══════════════
 *  Sv50 tam donanımlı oyuncuyla üç dakika farm, slot başına mob sayısı
 *  değiştirilerek:
 *
 *      8 mob → 31 ölüm · 3,0 kill/dk
 *      6 mob → 22 ölüm · 3,7
 *      5 mob → 15 ölüm · 5,0
 *      4 mob →  7 ölüm · 6,0
 *
 *  Tehdit yukarıda birikiyor, kalabalık da orada iniyor. Alt bantlarda
 *  tersi: zayıf mob kalabalıkken hem eğlenceli hem hızlı. */
export const MOB_COUNT_TIERS: ReadonlyArray<{ maxLevel: number; count: number }> = [
  /* Sv1-18 — tek vuruşta ölüyorlar; kalabalık akışı canlı tutar. */
  { maxLevel: 18, count: 8 },
  /* Sv19-30 — orta. Hâlâ hızlı ama vuruş sayısı artıyor. */
  { maxLevel: 30, count: 6 },
  /* Sv31-42 — ölçümde 5 mobla sıfır ölüm. */
  { maxLevel: 42, count: 5 },
  /* Sv43-50 — ölçümde 4 mobla 7 ölüm; 8 mobla 31'di. */
  { maxLevel: Number.POSITIVE_INFINITY, count: 4 },
];

/** Bu seviyedeki bir slotta KAÇ mob olmalı. */
export function mobCountCap(monsterLevel: number): number {
  for (const c of MOB_COUNT_TIERS) {
    if (monsterLevel <= c.maxLevel) return c.count;
  }
  return MOB_COUNT_TIERS[MOB_COUNT_TIERS.length - 1]!.count;
}

/** Slotun mob sayısı. `requested` YOK SAYILIR — imzada duruyor çünkü
 *  çağıranlar yerleşimin değerini geçiriyor ve bir gün geri dönmek
 *  gerekirse yol açık kalsın. */
export function cappedMobCount(_requested: number, monsterLevel: number): number {
  return mobCountCap(monsterLevel);
}

/** Bir slotta bulunabilecek EN AZ mob — üst bant değeri.
 *
 *  Şema alt sınırı (`MIN_MOBS_PER_SLOT`) yerleşimin YAZDIĞI değere
 *  bakar; bu ise uygulanan değeri korur. İkisi ayrı olmalı: yerleşim
 *  beşten az yazamaz, ama bant dörde indirebilir. */
export const MIN_MOBS_AFTER_CAP = 4;
