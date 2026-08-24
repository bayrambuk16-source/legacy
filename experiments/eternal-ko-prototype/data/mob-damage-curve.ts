/** MOB HASAR EĞRİSİ — SEVİYEYE GÖRE KADEMELİ (P2.36)
 *
 *  ══════════════ NEDEN SABİT ÇARPAN YETMEDİ ══════════════
 *  Sabit bir `monsterDamageMultiplier` iki ucu birden tutamıyor.
 *  Sv50, tamamı +7 donanımlı bir karakterle üç dakika farm ölçüldü:
 *
 *      bant      kill/dk   ölüm   alınan hasar/sn
 *      Sv 1-8      15,0      0          0
 *      Sv19-30     18,0      0        3,6
 *      Sv31-42      3,7     48        858
 *      Sv43-50      3,7     61       1087
 *
 *  Vuruş başına bakınca sebep açık: Sv50 mobu tam donanımlı Sv50
 *  oyuncuyu İKİ VURUŞTA öldürüyordu (1371 hasar, oyuncu canı 3174).
 *
 *  Sebep çarpanın SABİT 4 olmasıydı. Mob saldırısı Sv1'de 4, Sv50'de
 *  325 — seksen kat. Oyuncunun savunması ise 0'dan 232'ye çıkıyor ve
 *  KO'nun zırh formülü (`HitB = AP × 200 / (AC + 240)`) bu farkı
 *  kapatamıyor. Dört katı çarpmak üst seviyede hasarı patlatıyor.
 *
 *  ══════════════ ÖLÇÜLEN İKİ SEÇENEK ══════════════
 *  ÇARPAN 1 (sabit): üst seviye düzeliyor ama Sv10'da oyuncu 744
 *  vuruş dayanıyor — orta oyunda ölüm riski tamamen kayboluyor.
 *
 *  ÇARPAN 4→1 (kademeli): eğri düzgün ama Sv1'de çıplak oyuncu İKİ
 *  vuruşta ölüyor; bu, P2.32'de kullanıcının şikâyet ettiği durumun
 *  ta kendisi.
 *
 *  ══════════════ SEÇİLEN: 2 → 1 ══════════════
 *  Başlangıçta 2 (solucan 9 vuruyor, çıplak oyuncu dört vuruşta
 *  ölür — tehlikeli ama adil), Sv30'dan itibaren 1 (Sv50 mobu on
 *  vuruşta öldürür, iksire zaman kalır).
 *
 *  Böylece sabit-1'in orta oyun çukuru da, 4→1'in sert başlangıcı da
 *  oluşmuyor.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. */

/** Eğrinin uçları. Aradaki geçiş DOĞRUSALDIR — üstel bir eğri
 *  ayarlanması ve açıklanması zor olurdu, kazancı da yok. */
export const DAMAGE_MULT_LOW = 2.0;
export const DAMAGE_MULT_HIGH = 1.0;

/** Çarpanın tabana indiği mob seviyesi. Bunun üstünde sabit kalır.
 *  Sv30 seçildi çünkü ölçümde kırılma tam orada başlıyor: Sv32'de
 *  oyuncu sekiz vuruşta ölüyordu. */
export const DAMAGE_MULT_FLOOR_LEVEL = 30;

/** Mob seviyesine göre hasar çarpanı.
 *
 *  Seviye MOBUN seviyesidir, oyuncunun değil: aynı mob herkese aynı
 *  vurmalı. Oyuncuya göre ölçeklemek "seviye atladım, mob zayıfladı"
 *  gibi ters bir his üretirdi. */
export function monsterDamageMultiplierFor(monsterLevel: number): number {
  const lv = Math.max(1, monsterLevel);
  if (lv >= DAMAGE_MULT_FLOOR_LEVEL) return DAMAGE_MULT_HIGH;
  const t = (lv - 1) / (DAMAGE_MULT_FLOOR_LEVEL - 1);
  return DAMAGE_MULT_LOW + (DAMAGE_MULT_HIGH - DAMAGE_MULT_LOW) * t;
}
