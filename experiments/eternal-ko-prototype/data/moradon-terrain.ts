/** MORADON YÜKSEKLİK ÖRNEKLEYİCİSİ — P2.4C
 *
 *  ══════════════ YALNIZ RENDERER ══════════════
 *  Yükseklik GÖRSELDİR. Gameplay 2B'dir (`worldX` / `worldY`) ve bu dosyayı
 *  İMPORT ETMEZ — `world/` altındaki hiçbir modül, `state.ts` ve `WorldFrame`
 *  yapıcısı dahil. Bu sınır testle taranır (§P2.4C kabul kriteri).
 *  Kullanım yeri: `render3d/` — oyuncu, mob, loot ve ok GÖRSELLERİNİ zemine
 *  oturtmak (`coords.toScene`'in `elevation` parametresi).
 *
 *  ══════════════ BU DOSYA THREE İMPORT ETMEZ ══════════════
 *  Saf matematiktir, deterministiktir, `Math.random()` kullanmaz, headless
 *  test edilir. GLB çalışma zamanında PARSE EDİLMEZ; tablo üretim scriptinden
 *  gelir (`tools/build-moradon-data.mjs`).
 *
 *  ══════════════ SINIR DIŞI: KENARA KELEPÇE ══════════════
 *  Harita dışı bir nokta EN YAKIN KENAR düğümünün yüksekliğini alır. Yükseklik
 *  bir authority DEĞİLDİR, bu yüzden kelepçelemek zararsızdır. (Yürünebilirlik
 *  bunun TERSİDİR — bkz. `moradon-walkmask.ts`, sınır dışı → `false`.) */

import { bytesToFloat32, decodeBase64 } from './moradon-codec.js';
import {
  MORADON_GRID, MORADON_HEIGHT_B64, MORADON_NODE_STEP,
} from './moradon-terrain-data.js';
import {
  MORADON_TERRAIN_OVERRIDE, MORADON_TERRAIN_OVERRIDE_COUNT,
} from './moradon-terrain-override.js';

/** HAM tablo — GLB'den ne geldiyse o. ASLA DEĞİŞTİRİLMEZ.
 *  §46 fixture testi buna karşı çalışır; karşılaştırma döngüsel olmaz. */
const HEIGHTS_RAW: Float32Array = (() => {
  const h = bytesToFloat32(decodeBase64(MORADON_HEIGHT_B64));
  if (h.length !== MORADON_GRID * MORADON_GRID) {
    throw new Error(`[P2.4C] yükseklik tablosu bozuk: ${h.length} değer`);
  }
  return h;
})();

/** ÜRETİM tablosu — ham tablonun kopyası, üstüne override binmiş.
 *  Görünen zemin mesh'i ve `heightAt()` BUNU okur; ikisi hâlâ AYNI tablodan
 *  beslenir, aralarında sapma OLAMAZ (§51). */
const HEIGHTS: Float32Array = (() => {
  const h = HEIGHTS_RAW.slice();
  for (const [i, v] of MORADON_TERRAIN_OVERRIDE) {
    if (i < 0 || i >= h.length) throw new Error(`[P2.35] override indisi taşıyor: ${i}`);
    h[i] = v;
  }
  if (MORADON_TERRAIN_OVERRIDE.size !== MORADON_TERRAIN_OVERRIDE_COUNT) {
    throw new Error('[P2.35] override sayısı bildirilen ile uyuşmuyor');
  }
  return h;
})();

/** Izgaranın kapladığı world genişliği/yüksekliği (kenar düğümleri dahil). */
export const MORADON_TERRAIN_SPAN = (MORADON_GRID - 1) * MORADON_NODE_STEP;

const clampIndex = (i: number): number => (i < 0 ? 0 : i > MORADON_GRID - 1 ? MORADON_GRID - 1 : i);

/** Bir IZGARA DÜĞÜMÜNÜN yüksekliği. İndisler kenara kelepçelenir.
 *  Kaynak GLB vertex değerini BİREBİR döndürür (yuvarlama/nicemleme YOK). */
export function terrainNodeHeight(col: number, row: number): number {
  return HEIGHTS[clampIndex(row) * MORADON_GRID + clampIndex(col)]!;
}

/** Aynı düğümün OVERRIDE UYGULANMAMIŞ değeri — yalnız §46 fixture testi ve
 *  denetim içindir. Gameplay ve renderer bunu KULLANMAZ. */
export function terrainNodeHeightRaw(col: number, row: number): number {
  return HEIGHTS_RAW[clampIndex(row) * MORADON_GRID + clampIndex(col)]!;
}

/** Bir düğüm override edilmiş mi? Denetim/test içindir. */
export function isTerrainOverridden(col: number, row: number): boolean {
  return MORADON_TERRAIN_OVERRIDE.has(clampIndex(row) * MORADON_GRID + clampIndex(col));
}

/** Bir world noktasının GÖRSEL zemin yüksekliği — bilineer örnekleme.
 *
 *  Izgara düğümünün tam üstünde çağrıldığında (`worldX`, `worldY` düğüm
 *  adımının katı) sonuç o düğümün GLB değerine BİREBİR eşittir: interpolasyon
 *  ağırlıkları 0/1 olur, ara işlem yapılmaz.
 *
 *  Deterministiktir: aynı girdi → aynı çıktı, her platformda. */
export function heightAt(worldX: number, worldY: number): number {
  const fx = worldX / MORADON_NODE_STEP;
  const fy = worldY / MORADON_NODE_STEP;
  /* Kenara kelepçe: sınır dışı nokta en yakın kenar hücresinin değerini alır. */
  const cx = fx < 0 ? 0 : fx > MORADON_GRID - 1 ? MORADON_GRID - 1 : fx;
  const cy = fy < 0 ? 0 : fy > MORADON_GRID - 1 ? MORADON_GRID - 1 : fy;
  const c0 = Math.floor(cx), r0 = Math.floor(cy);
  const c1 = clampIndex(c0 + 1), r1 = clampIndex(r0 + 1);
  const tx = cx - c0, ty = cy - r0;
  const h00 = HEIGHTS[r0 * MORADON_GRID + c0]!;
  const h10 = HEIGHTS[r0 * MORADON_GRID + c1]!;
  const h01 = HEIGHTS[r1 * MORADON_GRID + c0]!;
  const h11 = HEIGHTS[r1 * MORADON_GRID + c1]!;
  const top = h00 + (h10 - h00) * tx;
  const bottom = h01 + (h11 - h01) * tx;
  return top + (bottom - top) * ty;
}
