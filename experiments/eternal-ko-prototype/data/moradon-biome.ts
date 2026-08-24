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
 *  ══════════════ NE YAPMAZ ══════════════
 *  Bu bir renk çarpanıdır, DOKU DEĞİŞTİRMEZ. Bataklıkta zemin koyu yeşile
 *  döner ama hâlâ çim dokusudur — çamur deseni, su birikintisi, kırık taş
 *  döşeme GELMEZ. Onun için splat blending gerekir (hücre başına doku
 *  ağırlığı + özel shader). Bu katman onunla ÇELİŞMEZ, üstünde kalabilir. */

import { decodeBase64 } from './moradon-codec.js';
import { MORADON_BIOME_B64, MORADON_BIOME_BANDS } from './moradon-biome-data.js';
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

/** Bir ızgara düğümünün vertex renk çarpanı. */
export function biomeTintAt(col: number, row: number): readonly [number, number, number] {
  return BIOME_TINT[biomeAt(col, row)]!;
}

/** Arazi mesh'i için düğüm sırasına GÖRE renk dizisi (RGB, düğüm başına 3).
 *  `buildTerrainGeometry()` ile AYNI düğüm sırasını kullanır: `row * GRID + col`. */
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
  return out;
}
