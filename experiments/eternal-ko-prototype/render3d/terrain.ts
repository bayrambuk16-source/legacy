/** ARAZİ KÖPRÜSÜ (RENDERER) — P2.4C
 *
 *  ══════════════ YÜKSEKLİK YALNIZ BURADA ══════════════
 *  Gameplay 2B'dir ve yüksekliği GÖRMEZ (`WorldFrame`'de böyle bir alan
 *  yoktur, `world/` ve `data/` modülleri `heightAt`i import EDEMEZ — testle
 *  kilitli). Renderer görselleri zemine BURADAN oturtur.
 *
 *  ══════════════ TEK KAYNAK ══════════════
 *  Görünen zemin mesh'i ile `heightAt()` AYNI tablodan üretilir
 *  (`data/moradon-terrain-data.ts`). Ayrı bir GLB yüklenmez; yüklenseydi
 *  görsel zemin ile örnekleyici zamanla birbirinden sapabilirdi. Mesh'in
 *  köşe yükseklikleri, `heightAt()`in ızgara düğümünde döndürdüğü değerle
 *  BİREBİR aynıdır.
 *
 *  ══════════════ NORMAL YOKTUR, HESAPLANIR ══════════════
 *  Kaynak GLB normal taşımaz; ışıklı malzeme için `computeVertexNormals()`
 *  çağrılır, aksi halde arazi düz/karanlık görünür. */

import { BufferAttribute, BufferGeometry } from 'three';
import { heightAt, terrainNodeHeight } from '../data/moradon-terrain.js';
import { buildBiomeColors } from '../data/moradon-biome.js';
import { MORADON_GRID, MORADON_NODE_STEP } from '../data/moradon-terrain-data.js';
import { ACTIVE_MAP } from '../data/world-map.js';

/** Aktif haritada bir world noktasının GÖRSEL zemin yüksekliği.
 *  Test dünyasında arazi yoktur → düz zemin (0). */
export function groundElevationAt(worldX: number, worldY: number): number {
  return ACTIVE_MAP === 'moradon' ? heightAt(worldX, worldY) : 0;
}

/** Aktif haritada gerçek arazi mesh'i çizilmeli mi? */
export const TERRAIN_MESH_ACTIVE = ACTIVE_MAP === 'moradon';

/** Moradon zemin geometrisi — 129×129 düğüm, 32768 üçgen.
 *  Üçgen sarımı three'nin varsayılan CCW/ön yüz kuralına göredir; zemin
 *  yukarıdan görünür. */
export function buildTerrainGeometry(): BufferGeometry {
  const n = MORADON_GRID;
  const step = MORADON_NODE_STEP;
  const positions = new Float32Array(n * n * 3);
  /* P2.19.1 — UV KOORDİNATI. Bunlar olmadan materyalin `map`i hiçbir şey
     yapmaz: zemin dokusu atanıyor ama görünmüyordu. UV 0..1 aralığında
     bütün araziyi kaplar; döşeme sayısı `Texture.repeat` ile ayarlanır
     (bkz. `ThreeWorldRenderer.applyGroundTexture`). */
  const uvs = new Float32Array(n * n * 2);
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const i = (row * n + col) * 3;
      positions[i] = col * step;                       // world X
      positions[i + 1] = terrainNodeHeight(col, row);  // yükseklik (Y-up)
      positions[i + 2] = row * step;                   // world Y → sahne Z
      const u = (row * n + col) * 2;
      uvs[u] = col / (n - 1);
      uvs[u + 1] = row / (n - 1);
    }
  }
  const quads = (n - 1) * (n - 1);
  const indices = new Uint32Array(quads * 6);
  let k = 0;
  for (let row = 0; row < n - 1; row++) {
    for (let col = 0; col < n - 1; col++) {
      const a = row * n + col, b = a + 1, c = a + n, d = c + 1;
      indices[k++] = a; indices[k++] = c; indices[k++] = b;
      indices[k++] = b; indices[k++] = c; indices[k++] = d;
    }
  }
  const geo = new BufferGeometry();
  /* P2.36 — BİOME VERTEX RENGİ. Zemin dokusu tek ve tüm haritaya
     döşeniyor; beş bandı ayırmak için düğüm başına bir renk ÇARPANI
     yazılır ve GPU üçgen içinde interpolasyonla karıştırır. Bant sınırı
     iki düğüm arasında (40-80 birim) yumuşakça geçer.

     Çarpanlar 1'i AŞABİLİR (zemin dokusu koyu zeytin), bu yüzden
     `BufferAttribute` normalize EDİLMEZ. */
  const colors = buildBiomeColors();
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  geo.setAttribute('uv', new BufferAttribute(uvs, 2));
  geo.setAttribute('color', new BufferAttribute(colors, 3));
  geo.setIndex(new BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/** Örnekleyici ile mesh'in aynı tabloyu kullandığını doğrular (test/telemetri).
 *  Sapma DÖNDÜRÜR (0 beklenir); fırlatmaz ki telemetri raporlayabilsin. */
export function terrainMeshDrift(): number {
  let worst = 0;
  const step = MORADON_NODE_STEP;
  for (let row = 0; row < MORADON_GRID; row += 7) {
    for (let col = 0; col < MORADON_GRID; col += 7) {
      const d = Math.abs(heightAt(col * step, row * step) - terrainNodeHeight(col, row));
      if (d > worst) worst = d;
    }
  }
  return worst;
}
