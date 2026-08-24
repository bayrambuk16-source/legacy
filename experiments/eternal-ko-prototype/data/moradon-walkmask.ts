/** MORADON YÜRÜNEBİLİRLİK MASKESİ — P2.4C
 *
 *  ══════════════ GAMEPLAY AUTHORITY'SİDİR ══════════════
 *  "Buraya basılabilir mi" sorusunun TEK cevabı buradadır. Collision mesh
 *  çalışma zamanında OKUNMAZ; üçgenler üretim scriptinde bir kez hücre
 *  maskesine rasterize edilir (`tools/build-moradon-data.mjs`, conservative).
 *
 *  ══════════════ BU DOSYA THREE İMPORT ETMEZ ══════════════
 *  Saf fonksiyondur, deterministiktir, `Math.random()` kullanmaz.
 *
 *  ══════════════ SINIR DIŞI → FALSE ══════════════
 *  Yürünebilirlik bir AUTHORITY'dir; kenara kelepçelenip `true` DÖNMEZ.
 *  Kelepçelenseydi harita dışına çıkış kapısı açılırdı. (Yükseklik bunun
 *  TERSİDİR — bkz. `moradon-terrain.ts`.)
 *
 *  ══════════════ ADIM KONTROLÜ ENDPOINT-ONLY DEĞİLDİR ══════════════
 *  `canTraverse()` `from → to` doğru parçasının DEĞDİĞİ BÜTÜN hücreleri
 *  denetler (supercover). Yalnız varış hücresine bakmak, düşük FPS ya da
 *  büyük `dt`'de karakterin ince bir duvarın öbür yanına ATLAMASINA izin
 *  verirdi. */

import { decodeBase64 } from './moradon-codec.js';
import { isCityCleared } from './moradon-city-clear.js';
import { isLakeCell } from './moradon-lake-mask.js';
import {
  MORADON_CELL_SIZE, MORADON_MASK_B64, MORADON_MASK_CELLS, MORADON_PLAYABLE_RECT,
} from './moradon-walkmask-data.js';

export { MORADON_CELL_SIZE, MORADON_MASK_CELLS, MORADON_PLAYABLE_RECT };

/** Bit maskesi: `1` = KAPALI. Satır-major, LSB-first. */
const MASK: Uint8Array = (() => {
  const m = decodeBase64(MORADON_MASK_B64);
  const need = (MORADON_MASK_CELLS * MORADON_MASK_CELLS) / 8;
  if (m.length !== need) throw new Error(`[P2.4C] maske bozuk: ${m.length} bayt, beklenen ${need}`);
  return m;
})();

/** World koordinatının hücre indisi (aşağı yuvarlama, negatifte de doğru). */
export function cellIndex(world: number): number {
  return Math.floor(world / MORADON_CELL_SIZE);
}

/** HÜCRE indisleriyle sorgu. Izgara dışı → KAPALI. */
/** ═══ P2.35 — MASKE ZİNCİRİ ═══
 *
 *  Kaynak maske EZİLMEZ; iki seyrek katman ÜSTÜNE binerler:
 *
 *      ham  AND NOT (şehir temizliği)  OR  (göl)
 *
 *  SIRA ÖNEMLİ ve bu sırayla üretilen maske referansla bit-birebir
 *  doğrulandı. Önce şehir açılır (surlar, kuleler, iç kale ve
 *  duvar içindeki 46 bina — toplam 28 758 ince hücre), sonra göl
 *  kapatılır. Ters sırada gölün şehirle kesiştiği yerler açılırdı.
 *
 *  Doğal kayalar ve ağaç kütleleri KORUNUR — yalnız yapı collision'ı
 *  kaldırıldı. */
export function isCellBlocked(cx: number, cy: number): boolean {
  if (cx < 0 || cy < 0 || cx >= MORADON_MASK_CELLS || cy >= MORADON_MASK_CELLS) return true;
  const bit = cy * MORADON_MASK_CELLS + cx;
  const raw = (MASK[bit >> 3]! & (1 << (bit & 7))) !== 0;
  const cleared = raw && !isCityCleared(cx, cy);
  return cleared || isLakeCell(cx, cy);
}

/** World noktası yürünebilir mi? Sınır dışı → `false`. */
export function isWalkable(worldX: number, worldY: number): boolean {
  if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return false;
  return !isCellBlocked(cellIndex(worldX), cellIndex(worldY));
}

/** Bir adım GEÇİLEBİLİR Mİ? — TEK ORTAK KAPI (oyuncu ve mob aynı yoldan).
 *
 *  Doğru parçasının değdiği HER hücre denetlenir. Köşe geçişinde (segment iki
 *  hücre sınırını AYNI anda kestiğinde) iki komşu hücrenin İKİSİ de denetlenir:
 *  duvar köşesinden çapraz sızma olmaz.
 *
 *  BAŞLANGIÇ HÜCRESİ DENETLENMEZ. Bir varlık herhangi bir sebeple kapalı bir
 *  hücrede kalmışsa (maske yeniden üretildi, konum elle kuruldu) oradan
 *  ÇIKABİLMELİDİR; aksi halde kalıcı olarak kilitlenirdi. */
export function canTraverse(fromX: number, fromY: number, toX: number, toY: number): boolean {
  if (![fromX, fromY, toX, toY].every(Number.isFinite)) return false;

  let cx = cellIndex(fromX), cy = cellIndex(fromY);
  const ex = cellIndex(toX), ey = cellIndex(toY);
  /* Aynı hücre içinde kalan adım: hiçbir sınır geçilmez, başlangıç hücresi de
     denetlenmediği için adım her zaman geçerlidir. */
  if (cx === ex && cy === ey) return true;

  const dx = toX - fromX, dy = toY - fromY;
  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  const cs = MORADON_CELL_SIZE;

  /* Bir hücre sınırını geçmek için gereken parametrik ilerleme. */
  const tDeltaX = stepX === 0 ? Infinity : Math.abs(cs / dx);
  const tDeltaY = stepY === 0 ? Infinity : Math.abs(cs / dy);
  let tMaxX = stepX === 0 ? Infinity
    : ((stepX > 0 ? (cx + 1) * cs : cx * cs) - fromX) / dx;
  let tMaxY = stepY === 0 ? Infinity
    : ((stepY > 0 ? (cy + 1) * cs : cy * cs) - fromY) / dy;

  /* Güvenlik ağı: adım sayısı hücre farkının ötesine geçemez. */
  const guardMax = Math.abs(ex - cx) + Math.abs(ey - cy) + 4;
  for (let guard = 0; guard < guardMax; guard++) {
    if (cx === ex && cy === ey) return true;
    if (tMaxX < tMaxY) {
      cx += stepX; tMaxX += tDeltaX;
    } else if (tMaxY < tMaxX) {
      cy += stepY; tMaxY += tDeltaY;
    } else {
      /* TAM KÖŞE: segment iki sınırı aynı anda kesiyor. Çapraz sızmayı
         engellemek için İKİ komşu da denetlenir, sonra çapraz geçilir. */
      if (isCellBlocked(cx + stepX, cy) || isCellBlocked(cx, cy + stepY)) return false;
      cx += stepX; cy += stepY;
      tMaxX += tDeltaX; tMaxY += tDeltaY;
    }
    if (isCellBlocked(cx, cy)) return false;
  }
  return cx === ex && cy === ey;
}

/** Nokta OYNANABİLİR DİKDÖRTGENİN içinde mi?
 *
 *  Bu, maskenin collision'dan BAĞIMSIZ olan ikinci kaynağıdır: kaynak
 *  heightmap'in dejenere kenar sıraları (bkz. `MORADON_PLAYABLE_RECT`).
 *  Collision engelleri kapatılsa bile bu sınır AÇIK KALIR — kapatılırsa
 *  oyuncu haritanın uçurumdan aşağı düşen kenar şeridine yürür. */
export function isInsidePlayableArea(worldX: number, worldY: number): boolean {
  if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return false;
  const r = MORADON_PLAYABLE_RECT;
  return worldX >= r.minX && worldX < r.maxX && worldY >= r.minY && worldY < r.maxY;
}
