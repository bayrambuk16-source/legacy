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

import { MORADON_TERRAIN_OVERRIDE } from './moradon-terrain-override.js';
import { bytesToFloat32, decodeBase64 } from './moradon-codec.js';
import {
  MORADON_GRID, MORADON_HEIGHT_B64, MORADON_NODE_STEP,
} from './moradon-terrain-data.js';

/** Yükseklik ızgarası, satır-major: `HEIGHTS[row * GRID + col]`.
 *  `row = worldY / NODE_STEP`, `col = worldX / NODE_STEP`. */
const HEIGHTS: Float32Array = (() => {
  const h = bytesToFloat32(decodeBase64(MORADON_HEIGHT_B64));
  if (h.length !== MORADON_GRID * MORADON_GRID) {
    throw new Error(`[P2.4C] yükseklik tablosu bozuk: ${h.length} değer`);
  }
  return h;
})();

/** Izgaranın kapladığı world genişliği/yüksekliği (kenar düğümleri dahil). */
export const MORADON_TERRAIN_SPAN = (MORADON_GRID - 1) * MORADON_NODE_STEP;

const clampIndex = (i: number): number => (i < 0 ? 0 : i > MORADON_GRID - 1 ? MORADON_GRID - 1 : i);

/** Bir IZGARA DÜĞÜMÜNÜN yüksekliği. İndisler kenara kelepçelenir.
 *  Kaynak GLB vertex değerini BİREBİR döndürür (yuvarlama/nicemleme YOK). */
/** HAM GLB değeri — override UYGULANMADAN.
 *
 *  Yalnız KAYNAK SADAKATİ denetimi içindir (§46 fixture'ı). Oyunun
 *  hiçbir yerinde kullanılmaz: görsel zemin de çarpışma da
 *  `terrainNodeHeight` üzerinden gider, yoksa ikisi ayrışır. */
export function terrainNodeHeightRaw(col: number, row: number): number {
  return HEIGHTS[clampIndex(row) * MORADON_GRID + clampIndex(col)]!;
}

export function terrainNodeHeight(col: number, row: number): number {
  /* ═══ P2.35 — OVERRIDE SONRA UYGULANIR ═══
   *  Ham tablo (`moradon-terrain-data.ts`) GLB'den ne geldiyse öyle
   *  DURUYOR. Teras yumuşatma ve göl oyma seyrek bir düzeltme
   *  tablosundan gelir ve BURADA, en son adımda binerler.
   *
   *  Sıra bilinçli: §46 fixture testi HAM tabloya karşı çalışmaya
   *  devam eder, kaynak paket tazelenirse heykel kaybolmaz. */
  const idx = clampIndex(row) * MORADON_GRID + clampIndex(col);
  const patched = MORADON_TERRAIN_OVERRIDE.get(idx);
  return patched ?? HEIGHTS[idx]!;
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
  /* P2.35 — DÖRT KÖŞE DE `terrainNodeHeight` ÜZERİNDEN okunur.
     Ham tabloyu doğrudan okumak override'ı atlar ve GÖRSEL zemin ile
     örnekleyici ayrışır: mesh yumuşatılmış tepeyi çizerken oyuncu eski
     dik zemine basardı (ölçüldü: 44,8 birim sapma). */
  const h00 = terrainNodeHeight(c0, r0);
  const h10 = terrainNodeHeight(c1, r0);
  const h01 = terrainNodeHeight(c0, r1);
  const h11 = terrainNodeHeight(c1, r1);
  const top = h00 + (h10 - h00) * tx;
  const bottom = h01 + (h11 - h01) * tx;
  return top + (bottom - top) * ty;
}
