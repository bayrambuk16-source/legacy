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

/** Seviye bandı → slot başına EN ÇOK mob.
 *
 *  Alt bantlar kalabalık kalır: zayıf moblar kalabalıkken eğlenceli ve
 *  oyuncu onları tek vuruşta indiriyor. Tehdit yukarıda birikiyor,
 *  tavan da orada iniyor. */
export const MOB_COUNT_CAPS: ReadonlyArray<{ maxLevel: number; cap: number }> = [
  { maxLevel: 18, cap: 8 },
  { maxLevel: 30, cap: 6 },
  { maxLevel: 42, cap: 5 },
  { maxLevel: Number.POSITIVE_INFINITY, cap: 4 },
];

export function mobCountCap(monsterLevel: number): number {
  for (const c of MOB_COUNT_CAPS) {
    if (monsterLevel <= c.maxLevel) return c.cap;
  }
  return MOB_COUNT_CAPS[MOB_COUNT_CAPS.length - 1]!.cap;
}

/** Yerleşimin istediği sayıyı tavanla kırpar. En az bir mob KALIR —
 *  sıfır mob demek slotun sessizce kaybolması demektir. */
export function cappedMobCount(requested: number, monsterLevel: number): number {
  return Math.max(MIN_MOBS_AFTER_CAP, Math.min(requested, mobCountCap(monsterLevel)));
}

/** Tavan uygulandıktan sonra bir slotta kalabilecek EN AZ mob.
 *
 *  Şema alt sınırı (`MIN_MOBS_PER_SLOT`) yerleşimin YAZDIĞI değere
 *  bakar; bu ise tavandan SONRAKİ değeri korur. İkisi ayrı olmalı:
 *  yerleşim beşten az yazamaz, ama tavan dörde indirebilir. */
export const MIN_MOBS_AFTER_CAP = 4;
