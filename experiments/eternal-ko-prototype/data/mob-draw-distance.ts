/** MOB ÇİZİM MESAFESİ — P2.29
 *
 *  ══════════════ NEDEN VAR ══════════════
 *  Oyun testinde "biraz ilerleyince oyun donuyor" bulgusu. Sebep:
 *  haritadaki 184 mobun TAMAMI her karede canlı iskeletli mesh olarak
 *  duruyordu — ekran dışındakiler dahil. Her birinin kendi animasyon
 *  karıştırıcısı çalışıyordu.
 *
 *  Yük: 97 mutant (11 271 üçgen) + 87 goblin (17 404 üçgen) ≈ 2,6
 *  milyon üçgen ve 184 karıştırıcı. Telefon bunu kaldırmaz.
 *
 *  ══════════════ SAYI ÖLÇÜLDÜ ══════════════
 *  En geniş kamera kuş bakışıdır: mesafe 750 × zoom tavanı 2,2 = 1650,
 *  görüş açısı 40°. Bu, ekran köşegeninde 1223 dünya birimi kapsar.
 *  Kesim mesafesi onun biraz üstünde tutulur ki kenardan giren mob
 *  görünürken belirmesin.
 *
 *  ══════════════ GAMEPLAY ETKİLENMEZ ══════════════
 *  Bu YALNIZ bir çizim kuralıdır. Mob AI, respawn, aggro ve savaş
 *  dünyada çalışmaya devam eder; kesilen mobun yalnız GÖRSELİ
 *  üretilmez. Renderer zaten gameplay'e hiçbir şey yazmaz. */

/** Kameradan bu mesafeden uzaktaki mobların görseli ÜRETİLMEZ. */
export const MOB_DRAW_DISTANCE = 1400;

/** Kameranın köşegende kapsadığı ölçülmüş mesafe — kesim bunun
 *  ÜSTÜNDE olmak zorunda, yoksa görünür alanda mob kaybolur. */
export const CAMERA_DIAGONAL_REACH = 1223;

/** AYNI ANDA çizilebilecek EN ÇOK mob görseli.
 *
 *  Mesafe kesimi tek başına YETMİYOR: slotlar 420 birim aralıklı ve her
 *  biri 5-8 mob taşıyor, bu yüzden kalabalık bir noktada 1400 birimlik
 *  daire 79 moba denk geliyor (ölçüldü) — yaklaşık 1,1 milyon üçgen.
 *
 *  Sert bir tavan, kümelenmeden BAĞIMSIZ bir üst sınır verir. 30 mob
 *  ≈ 450 bin üçgen; ekranda aynı anda otuz düşman zaten fazlasıyla
 *  kalabalık görünür.
 *
 *  Kesim EN YAKINDAN yapılır: uzaktakiler düşer, savaştığın moblar
 *  her zaman görünür kalır. */
export const MAX_MOB_VISUALS = 30;
