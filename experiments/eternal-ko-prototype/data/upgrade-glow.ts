/** YÜKSELTME PARILTISI — +3 ÜSTÜ GÖRSEL (P2.39)
 *
 *  ══════════════ NEDEN VAR ══════════════
 *  Yükseltme oyunun en pahalı uğraşı: tam takımı +7 yapmak 114 390
 *  altın ve 110 parşömen istiyor, üstelik +4'ten sonra her deneme
 *  eşyayı yakabiliyor.
 *
 *  Buna karşılık oyuncunun elde ettiği şey ekranda HİÇ görünmüyordu.
 *  Yalnız envanterde küçük bir `+7` yazısı vardı.
 *
 *  Kullanıcı kararı: +3'ten sonra bir efekt. +3'e kadar her deneme
 *  garantili, yani orası "bedava" bölge; parıltı RİSK ALINAN yerden
 *  başlıyor.
 *
 *  ══════════════ NEDEN KADEMELİ ══════════════
 *  Tek bir "parlıyor / parlamıyor" ayrımı +4 ile +9 arasındaki farkı
 *  yutardı. Renk kademeye göre değişir: oyuncu uzaktan bakıp kaçıncı
 *  kademede olduğunu okur.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. Renderer ve 2B
 *  envanter AYNI tablodan okur, iki farklı görsel dil oluşmasın. */

/** Bu kademeden İTİBAREN parıltı görünür. +3'e kadar her deneme
 *  garantili olduğu için orası ödül sayılmaz. */
export const GLOW_MIN_LEVEL = 4;

export interface UpgradeGlow {
  /** Işıma rengi (hex). */
  readonly color: number;
  /** Işıma şiddeti — malzemenin `emissiveIntensity` değeri. */
  readonly intensity: number;
  /** Envanter/HUD çerçevesi için aynı renk, CSS biçiminde. */
  readonly css: string;
  /** Nabız var mı? Yalnız en üst kademelerde — sürekli hareket
   *  ekranı yorar, o yüzden nadir tutulur. */
  readonly pulse: boolean;
}

/** Kademe → parıltı. Sıralama ÖNEMLİ: ilk eşleşen kazanır. */
const GLOW_TABLE: ReadonlyArray<{ min: number; glow: UpgradeGlow }> = [
  /* +4-5 — soluk altın: "riskli bölgeye girdin". */
  { min: 4, glow: { color: 0xc9a05a, intensity: 0.35, css: '#c9a05a', pulse: false } },
  /* +6-7 — turkuaz: belirgin ama sakin. */
  { min: 6, glow: { color: 0x4fd0c0, intensity: 0.55, css: '#4fd0c0', pulse: false } },
  /* +8 — mor: nadir. */
  { min: 8, glow: { color: 0xa06ad8, intensity: 0.75, css: '#a06ad8', pulse: false } },
  /* +9 — kızıl ve NABIZLI: %6. */
  { min: 9, glow: { color: 0xff5a3c, intensity: 1.0, css: '#ff5a3c', pulse: true } },
  /* +10 — beyaz-altın, TAVAN. %3'lük son kademe kendi rengini hak
     ediyor: kızılın bir tonu olsaydı +9'dan ayırt edilemezdi. */
  { min: 10, glow: { color: 0xfff2c0, intensity: 1.3, css: '#fff2c0', pulse: true } },
];

/** Bir yükseltme kademesinin parıltısı. Eşiğin altında `null` —
 *  çağıran hiçbir şey çizmez. */
export function upgradeGlow(upgradeLevel: number): UpgradeGlow | null {
  if (upgradeLevel < GLOW_MIN_LEVEL) return null;
  let found: UpgradeGlow | null = null;
  for (const row of GLOW_TABLE) {
    if (upgradeLevel >= row.min) found = row.glow;
  }
  return found;
}

/** Nabız çarpanı — `pulse` açıkken şiddeti zamanla salındırır.
 *  Saf: zaman DIŞARIDAN gelir, `Date.now()` okunmaz. */
export const GLOW_PULSE_HZ = 1.1;
export const GLOW_PULSE_DEPTH = 0.3;

export function glowIntensityAt(glow: UpgradeGlow, timeSec: number): number {
  if (!glow.pulse) return glow.intensity;
  const w = Math.sin(timeSec * GLOW_PULSE_HZ * Math.PI * 2);
  return glow.intensity * (1 - GLOW_PULSE_DEPTH * 0.5 * (1 - w));
}
