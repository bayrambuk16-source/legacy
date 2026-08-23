/** OYUNCU FİZİKSEL HASAR STRATEJİSİ — P2.5A
 *
 *  ══════════════ NEDEN VAR ══════════════
 *  Ana `CombatSystem.damageRoll` generic bir formüldür ve DÜŞMAN → OYUNCU
 *  hasarında hâlâ kullanılır. Okçunun OYUNCU → DÜŞMAN hasarı ise KO kaynak
 *  zincirinden geçer. İkisini tek formüle sıkıştırmak yerine, oyuncu yolu
 *  bir strateji arkasına alındı.
 *
 *  Strateji BAĞLANMAZSA davranış P2.4 ile birebir aynıdır — ana oyun ve
 *  diğer sınıflar etkilenmez. */

export interface PlayerPhysicalStrategy {
  /** @param attack   oyuncunun saldırı gücü (okçuda KO AP)
   *  @param defense  hedefin efektif savunması (AC)
   *  @param coefficient  skill katsayısı; 1 = normal atış,
   *                      1 değilse Type2 skill (addDamage / 100) */
  roll(attack: number, defense: number, coefficient: number): number;
}
