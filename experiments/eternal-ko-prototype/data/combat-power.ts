/** DOĞRUSAL SAVAŞ GÜCÜ — KAT KAPISI İÇİN (P3.1)
 *
 *  ══════════════ NEDEN AYRI BİR HESAP ══════════════
 *  `data/power-score.ts` içindeki güç skoru ÜSTELDİR (üs 4,25) ve
 *  "ilerleme hissi" için kalibre edildi. Ölçüldü:
 *
 *      Sv 1 çıplak  → AP   7  · skor      63
 *      Sv20 +4      → AP 128  · skor    375 000
 *      Sv50 +8      → AP 434  · skor 19 210 000
 *
 *  Gerçek savaş gücü 62 kat artarken skor 300 000 kat artıyor. Kat
 *  kapısı buna bağlanırsa "önerilen güç" sayıları oyuncuya hiçbir şey
 *  anlatmaz ve kat aralıkları anlamsızlaşır.
 *
 *  Bu dosya AYRI bir ölçü verir: gerçek savaşa yakın, DOĞRUSALA yakın.
 *  Üstel skor HUD'da kalabilir; kat kapısı bunu kullanır.
 *
 *  ══════════════ NEYE DAYANIYOR ══════════════
 *  İki şeyin çarpımı: ne kadar hızlı öldürüyorsun (saldırı) ve ne kadar
 *  dayanıyorsun (efektif can). Bir savaşın sonucunu belirleyen budur.
 *
 *      combatPower = sqrt( saldırıGücü × dayanıklılık )
 *
 *  Karekök, iki bileşeni DENGELİ tutar: yalnız saldırıya ya da yalnız
 *  cana yatırmak tek başına gücü katlamaz. Çarpım olmasaydı sıfır
 *  savunmalı bir karakter yüksek güç gösterirdi.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. */

import type { PowerInput } from './power-score.js';

/** Zırhın hasarı azaltma etkisi — KO'nun kendi formülünden türer:
 *  `HitB = AP × 200 / (AC + 240)`. Yani AC=240'ta gelen hasar yarıya
 *  iner. Efektif can bu yüzden `hp × (1 + ac/240)` olur.
 *
 *  Uydurma bir katsayı DEĞİLDİR; savaş formülünün kendisinden gelir. */
export const ARMOR_HALVING_POINT = 240;

/** Ne kadar dayanıyorsun. */
export function effectiveHealth(p: PowerInput): number {
  return Math.max(1, p.maxHp) * (1 + Math.max(0, p.defense) / ARMOR_HALVING_POINT);
}

/** Ne kadar hızlı öldürüyorsun. AP zaten KO zincirinin girdisidir. */
export function offense(p: PowerInput): number {
  return Math.max(1, p.attack);
}

/** Doğrusala yakın savaş gücü. Ölçek, sayının okunabilir olması için
 *  seçildi (Sv1 ≈ 20, Sv50 ≈ 2 000); anlamı ORANDADIR, mutlak değerde
 *  değil. */
export const COMBAT_POWER_SCALE = 1.35;

export function combatPower(p: PowerInput): number {
  return Math.max(1, Math.round(COMBAT_POWER_SCALE * Math.sqrt(offense(p) * effectiveHealth(p))));
}

/** Oyuncunun gücü ile katın önerdiği güç arasındaki ilişki.
 *
 *  Kat kapısı DEĞİLDİR — oyuncu her zaman geçebilir (kullanıcı kararı:
 *  "yapay duvar yerine risk almasına izin ver"). Bu yalnız UI'da
 *  gösterilecek risk etiketidir. */
export type FloorRisk = 'safe' | 'fair' | 'high' | 'extreme';

export function floorRisk(playerPower: number, recommended: number): FloorRisk {
  if (recommended <= 0) return 'safe';
  const r = playerPower / recommended;
  if (r >= 1.25) return 'safe';
  if (r >= 0.9) return 'fair';
  if (r >= 0.6) return 'high';
  return 'extreme';
}

export const RISK_LABEL: Readonly<Record<FloorRisk, string>> = {
  safe: 'Güvenli',
  fair: 'Dengeli',
  high: 'Riskli',
  extreme: 'Ölümcül',
};
