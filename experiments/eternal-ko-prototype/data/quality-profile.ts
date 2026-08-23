/** ÇİZİM KALİTESİ PROFİLİ — P2.30
 *
 *  ══════════════ NEDEN VAR ══════════════
 *  Oyun testinde P2.29'daki geometri kesiminden SONRA da takılma
 *  sürdü. Kesim üçgen sayısını üçte bire indirmişti, demek ki darboğaz
 *  geometride değil PİKSEL ve GEÇİŞ sayısındaydı.
 *
 *  Üç ayar birden mobil için yanlış kuruluydu:
 *
 *  1. `setPixelRatio(min(2, dpr))` — telefonun cihaz oranı 3 olduğunda
 *     bile 2'ye kırpılıyordu, yani 620×1100 mantıksal ekran 1240×2200
 *     GERÇEK piksele çiziliyordu. 2,7 milyon piksel, her kare.
 *
 *  2. `antialias: true` — MSAA. Masaüstünde ucuz, mobil GPU'da pahalı
 *     ve yüksek piksel oranıyla ZATEN gereksiz.
 *
 *  3. `shadowMap.enabled` + 1024² harita — gölge atan HER nesne ikinci
 *     kez çiziliyor. Oyuncu, 30 mob ve bitkiler iki kez geçiyordu.
 *
 *  ══════════════ TAKAS AÇIK ══════════════
 *  Bu ayarlar görüntüyü GERÇEKTEN düşürür: kenarlar biraz daha
 *  testere, gölgeler daha kaba ya da yok. Takas bilinçlidir —
 *  akıcı 30 kare, keskin 8 kareden iyidir.
 *
 *  Profil DEĞİŞTİRİLEBİLİR: DEV panelinden yükseğe alınıp fark
 *  görülebilir. Varsayılan MOBİLDİR. */

export type QualityLevel = 'mobile' | 'balanced' | 'high';

export interface QualityProfile {
  readonly level: QualityLevel;
  /** Gerçek piksel çarpanı tavanı. */
  readonly maxPixelRatio: number;
  /** MSAA. */
  readonly antialias: boolean;
  /** Gölge haritası açık mı? */
  readonly shadows: boolean;
  /** Gölge haritası kenarı (piksel). `shadows` kapalıysa yok sayılır. */
  readonly shadowMapSize: number;
  /** Gölge kamerasının kapsadığı yarı-genişlik (dünya birimi).
   *  Dar tutmak aynı çözünürlükte daha keskin gölge verir. */
  readonly shadowSpan: number;
}

export const QUALITY_PROFILES: Readonly<Record<QualityLevel, QualityProfile>> = {
  /** VARSAYILAN. Gölge KAPALI — en pahalı tek ayar oydu. */
  mobile: {
    level: 'mobile',
    maxPixelRatio: 1.25,
    antialias: false,
    shadows: false,
    shadowMapSize: 512,
    shadowSpan: 500,
  },
  /** Gölge açık ama küçük harita ve dar alan. */
  balanced: {
    level: 'balanced',
    maxPixelRatio: 1.5,
    antialias: false,
    shadows: true,
    shadowMapSize: 512,
    shadowSpan: 500,
  },
  /** P2.29 öncesi ayarlar — karşılaştırma için. */
  high: {
    level: 'high',
    maxPixelRatio: 2,
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    shadowSpan: 700,
  },
};

export const QUALITY_ORDER: readonly QualityLevel[] = ['mobile', 'balanced', 'high'];

export function nextQuality(level: QualityLevel): QualityLevel {
  const i = QUALITY_ORDER.indexOf(level);
  return QUALITY_ORDER[(i + 1) % QUALITY_ORDER.length]!;
}

/** Etkin piksel çarpanı: cihazınki ile profil tavanının KÜÇÜĞÜ.
 *  Cihaz oranı 1 ise yükseltilmez — profil bir TAVAN, hedef değil. */
export function effectivePixelRatio(profile: QualityProfile, devicePixelRatio: number): number {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(profile.maxPixelRatio, dpr);
}

/** Kabaca kaç GERÇEK piksel çizilecek — telemetri ve test için. */
export function pixelCount(
  profile: QualityProfile, cssWidth: number, cssHeight: number, devicePixelRatio: number,
): number {
  const r = effectivePixelRatio(profile, devicePixelRatio);
  return Math.round(cssWidth * r * cssHeight * r);
}
