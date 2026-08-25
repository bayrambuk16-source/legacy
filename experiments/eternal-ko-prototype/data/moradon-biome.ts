/** MORADON BİOME RENKLERİ — VERTEX RENK KATMANI (P2.36)
 *
 *  ══════════════ YALNIZ RENDERER ══════════════
 *  Bu dosya GÖRSELDİR. `world/` altındaki hiçbir modül import ETMEZ; bant
 *  sınırı bir gameplay authority'si DEĞİLDİR. Sınır `moradon-terrain.ts` ile
 *  aynı kuralla taranır.
 *
 *  ══════════════ NASIL ÇALIŞIR ══════════════
 *  Arazi mesh'inin her düğümüne (129×129) bir renk yazılır. GPU üçgen içindeki
 *  her piksel için köşe renklerini interpolasyonla karıştırır, sonra zemin
 *  dokusundan gelen rengi bununla ÇARPAR. Yani bunlar mutlak renk değil,
 *  ÇARPAN'dır.
 *
 *  Bant sınırı iki düğüm arasında (40-80 birim) yumuşakça geçer — keskin çizgi
 *  oluşmaz, ek bir maskeye gerek kalmaz.
 *
 *  ══════════════ ÇARPANLAR NEREDEN GELDİ ══════════════
 *  Hedef renk / zemin dokusunun ortalaması. `ground.webp` ortalaması
 *  RGB (102, 85, 35) — koyu zeytin. 1'in ALTINDAKİ çarpanlar her şeyi
 *  karartıp bantları birbirine yaklaştırıyordu; bu yüzden çarpanlar 1'i
 *  aşabilir ve `Float32BufferAttribute` normalize EDİLMEDEN kullanılır.
 *
 *  Doku değiştirilirse bu çarpanlar da yeniden türetilmelidir.
 *
 *  ══════════════ YOL DA BURADA ══════════════
 *  Yol ayrı bir mesh veya decal DEĞİLDİR: `moradon-roadw-data.ts`'teki düğüm
 *  ağırlığıyla bant renginin üstüne toprak rengi karıştırılır. Bedeli sıfır
 *  ek draw call. Bedeli olan tarafı: ızgara 40 birim aralıklı olduğu için
 *  yol 40-80 birim genişliğinde ve kenarları yumuşak çıkar — keskin bir
 *  taş döşeme istiyorsak o ayrı bir iştir (MegaKit'te 8 `Rock Path` var).
 *
 *  ══════════════ NE YAPMAZ ══════════════
 *  Bu bir renk çarpanıdır, DOKU DEĞİŞTİRMEZ. Bataklıkta zemin koyu yeşile
 *  döner ama hâlâ çim dokusudur — çamur deseni, su birikintisi, kırık taş
 *  döşeme GELMEZ. Onun için splat blending gerekir (hücre başına doku
 *  ağırlığı + özel shader). Bu katman onunla ÇELİŞMEZ, üstünde kalabilir. */

import { decodeBase64 } from './moradon-codec.js';
import { MORADON_BIOME_B64, MORADON_BIOME_BANDS } from './moradon-biome-data.js';
import { MORADON_ROADW_B64 } from './moradon-roadw-data.js';
import { MORADON_GRID } from './moradon-terrain-data.js';

/** Bant başına RGB çarpanı. Hedef renk ÷ zemin dokusu ortalaması.
 *  Sıra `moradon-biome-data.ts` indisiyle AYNI: 0=A … 4=E. */
export const BIOME_TINT: readonly (readonly [number, number, number])[] = [
  [1.100, 1.559, 1.769],  /* A · Kale Ovası      → çayır yeşili  (112,132,62) */
  [0.688, 1.039, 1.313],  /* B · Bataklık Sınırı → koyu bataklık (70, 88, 46) */
  [1.494, 1.488, 1.655],  /* C · Vahşi Topraklar → kuru sarı     (152,126,58) */
  [1.159, 1.252, 2.054],  /* D · Harabeler       → soluk gri-kum (118,106,72) */
  [0.943, 0.638, 1.141],  /* E · Ölüm Sınırı     → yanık kızıl   (96, 54, 40) */
];

/** Bant sınırı yumuşatma yarıçapı (DÜĞÜM). Izgara adımı 40 birim, yani
 *  σ=1,2 düğüm ≈ 50 birimlik bir geçiş demek.
 *
 *  Neden gerekli: bant indisi düğüm başına KESİNDİR, komşu iki düğüm farklı
 *  banda düşünce renk TEK HÜCREDE (40 birim = 0,33 sn yürüyüş) değişiyordu.
 *  Haritada 946 yerde böyle bir sınır var ve hepsi görünür bir kenar
 *  üretiyordu.
 *
 *  Yumuşatma İNDİS TABLOSUNA DEĞİL, renk alanına uygulanır: `BIOME_TINT`
 *  ayarlanabilir kalır, `biomeAt()` hâlâ kesin bandı döndürür.
 *
 *  Daha büyük σ kenarı tamamen eritir ama beş bandı ayırt etmeyi zorlaştırır;
 *  bantların işi oyuncuya "bölge değiştim" demek. 1,2 bu ikisinin dengesi. */
export const BIOME_SMOOTH_SIGMA = 1.2;

/** Toprak yolun rengi — bant renginin ÜSTÜNE karışır.
 *  Hedef (150, 124, 86) kuru toprak ÷ zemin dokusu ortalaması (102, 85, 35). */
export const ROAD_TINT: readonly [number, number, number] = [1.471, 1.459, 2.457];

/** Yol tam üstündeyken bant renginin ne kadarı korunur. 0 = yol rengi
 *  tamamen bastırır. 0,12 bırakmak bandın karakterini yolda da hissettirir:
 *  bataklıktan geçen yol biraz yeşile, Ölüm Sınırı'ndaki biraz kızıla çalar. */
const ROAD_BLEND_FLOOR = 0.12;

/** Düğüm başına yol ağırlığı (0-1). */
const ROADW: Float32Array = (() => {
  const b = decodeBase64(MORADON_ROADW_B64);
  if (b.length !== MORADON_GRID * MORADON_GRID) {
    throw new Error(`[P2.37] yol ağırlığı bozuk: ${b.length} bayt`);
  }
  const f = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) f[i] = b[i]! / 255;
  return f;
})();

/** Düğüm başına bant indisi, satır-major: `BIOME[row * GRID + col]`. */
const BIOME: Uint8Array = (() => {
  const b = decodeBase64(MORADON_BIOME_B64);
  if (b.length !== MORADON_GRID * MORADON_GRID) {
    throw new Error(`[P2.36] biome tablosu bozuk: ${b.length} bayt`);
  }
  for (const v of b) {
    if (v >= MORADON_BIOME_BANDS) throw new Error(`[P2.36] geçersiz bant indisi ${v}`);
  }
  if (BIOME_TINT.length !== MORADON_BIOME_BANDS) {
    throw new Error('[P2.36] renk tablosu bant sayısıyla uyuşmuyor');
  }
  return b;
})();

const clampIndex = (i: number): number => (i < 0 ? 0 : i > MORADON_GRID - 1 ? MORADON_GRID - 1 : i);

/** Bir ızgara düğümünün bant indisi (0=A … 4=E). İndisler kenara kelepçelenir. */
export function biomeAt(col: number, row: number): number {
  return BIOME[clampIndex(row) * MORADON_GRID + clampIndex(col)]!;
}

/** Bir ızgara düğümünün yol ağırlığı (0 = yol yok, 1 = yolun üstü). */
export function roadWeightAt(col: number, row: number): number {
  return ROADW[clampIndex(row) * MORADON_GRID + clampIndex(col)]!;
}

/** Bir ızgara düğümünün NİHAİ vertex renk çarpanı — bant rengi, üstüne
 *  yol ağırlığınca karışmış toprak rengi. */
export function biomeTintAt(col: number, row: number): readonly [number, number, number] {
  const b = BIOME_TINT[biomeAt(col, row)]!;
  const w = roadWeightAt(col, row) * (1 - ROAD_BLEND_FLOOR);
  if (w <= 0) return b;
  return [
    b[0] + (ROAD_TINT[0] - b[0]) * w,
    b[1] + (ROAD_TINT[1] - b[1]) * w,
    b[2] + (ROAD_TINT[2] - b[2]) * w,
  ];
}

/** Ayrılabilir Gauss — satır sonra sütun. Kenarda değer tekrarlanır
 *  (`nearest`), böylece harita kenarında renk koyulaşmaz. */
function blurInPlace(buf: Float32Array, n: number, sigma: number): void {
  const rad = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(rad * 2 + 1);
  let sum = 0;
  for (let i = -rad; i <= rad; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    k[i + rad] = v; sum += v;
  }
  for (let i = 0; i < k.length; i++) k[i]! /= sum;
  const tmp = new Float32Array(buf.length);
  const clamp = (v: number): number => (v < 0 ? 0 : v > n - 1 ? n - 1 : v);
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      for (let c = 0; c < 3; c++) {
        let acc = 0;
        for (let i = -rad; i <= rad; i++) acc += k[i + rad]! * buf[(row * n + clamp(col + i)) * 3 + c]!;
        tmp[(row * n + col) * 3 + c] = acc;
      }
    }
  }
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      for (let c = 0; c < 3; c++) {
        let acc = 0;
        for (let i = -rad; i <= rad; i++) acc += k[i + rad]! * tmp[(clamp(row + i) * n + col) * 3 + c]!;
        buf[(row * n + col) * 3 + c] = acc;
      }
    }
  }
}

/** Arazi mesh'i için düğüm sırasına GÖRE renk dizisi (RGB, düğüm başına 3).
 *  `buildTerrainGeometry()` ile AYNI düğüm sırasını kullanır: `row * GRID + col`.
 *
 *  SIRA ÖNEMLİ: önce bant rengi yazılır, sonra YUMUŞATILIR, en son yol
 *  karıştırılır. Yol yumuşatmaya girseydi iki kez bulanıklaşır ve zaten
 *  geniş olan patika iyice erirdi. */
export function buildBiomeColors(): Float32Array {
  const n = MORADON_GRID;
  const out = new Float32Array(n * n * 3);
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const t = BIOME_TINT[BIOME[row * n + col]!]!;
      const i = (row * n + col) * 3;
      out[i] = t[0]; out[i + 1] = t[1]; out[i + 2] = t[2];
    }
  }
  if (BIOME_SMOOTH_SIGMA > 0) blurInPlace(out, n, BIOME_SMOOTH_SIGMA);
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const w = roadWeightAt(col, row) * (1 - ROAD_BLEND_FLOOR);
      if (w <= 0) continue;
      const i = (row * n + col) * 3;
      for (let c = 0; c < 3; c++) out[i + c] += (ROAD_TINT[c]! - out[i + c]!) * w;
    }
  }
  return out;
}
