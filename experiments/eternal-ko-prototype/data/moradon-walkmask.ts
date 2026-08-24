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
import {
  MORADON_CELL_SIZE, MORADON_MASK_B64, MORADON_MASK_CELLS, MORADON_PLAYABLE_RECT,
} from './moradon-walkmask-data.js';
import { MORADON_CITY_CLEAR_B64, MORADON_CITY_CLEAR_CELLS } from './moradon-city-clear.js';
import { MORADON_LAKE_MASK_B64, MORADON_LAKE_CELLS } from './moradon-lake-mask.js';

export { MORADON_CELL_SIZE, MORADON_MASK_CELLS, MORADON_PLAYABLE_RECT };

function popcount(bytes: Uint8Array): number {
  let n = 0;
  for (const b of bytes) {
    let v = b;
    while (v) { n += v & 1; v >>= 1; }
  }
  return n;
}

/** Bit maskesi: `1` = KAPALI. Satır-major, LSB-first.
 *
 *  ══════════════ ZİNCİR — SIRA ÖNEMLİ ══════════════
 *      ham maske  AND NOT (city-clear)  OR (lake-mask)
 *
 *  `moradon-walkmask-data.ts` EZİLMEZ. İki düzeltme ayrı dosyalarda durur:
 *  eski şehrin YAPI collision'ı çıkarılır, göl EKLENİR. Ne silindiği ve ne
 *  eklendiği her zaman denetlenebilir kalır.
 *
 *  Zincir bir KEZ, modül yüklenirken uygulanır — `isCellBlocked()` sıcak
 *  yolda tek bit okumaya devam eder, ek maliyet yoktur. */
const MASK: Uint8Array = (() => {
  const need = (MORADON_MASK_CELLS * MORADON_MASK_CELLS) / 8;
  const base = decodeBase64(MORADON_MASK_B64);
  if (base.length !== need) throw new Error(`[P2.4C] maske bozuk: ${base.length} bayt, beklenen ${need}`);

  const clear = decodeBase64(MORADON_CITY_CLEAR_B64);
  if (clear.length !== need) throw new Error(`[P2.35] şehir maskesi bozuk: ${clear.length} bayt`);
  if (popcount(clear) !== MORADON_CITY_CLEAR_CELLS) {
    throw new Error('[P2.35] şehir maskesi hücre sayısı bildirilen ile uyuşmuyor');
  }

  const lake = decodeBase64(MORADON_LAKE_MASK_B64);
  if (lake.length !== need) throw new Error(`[P2.35] göl maskesi bozuk: ${lake.length} bayt`);
  if (popcount(lake) !== MORADON_LAKE_CELLS) {
    throw new Error('[P2.35] göl maskesi hücre sayısı bildirilen ile uyuşmuyor');
  }

  const out = new Uint8Array(need);
  for (let i = 0; i < need; i++) out[i] = ((base[i]! & ~clear[i]!) | lake[i]!) & 0xff;
  return out;
})();

/** Zincir uygulanmadan ÖNCEKİ ham maske — yalnız denetim ve test içindir. */
const MASK_RAW: Uint8Array = decodeBase64(MORADON_MASK_B64);

/** HÜCRE indisiyle HAM maske sorgusu (şehir silme ve göl UYGULANMAMIŞ).
 *  Gameplay bunu KULLANMAZ; kaynak verinin denetlenebilirliği içindir. */
export function isCellBlockedRaw(cx: number, cy: number): boolean {
  if (cx < 0 || cy < 0 || cx >= MORADON_MASK_CELLS || cy >= MORADON_MASK_CELLS) return true;
  const bit = cy * MORADON_MASK_CELLS + cx;
  return (MASK_RAW[bit >> 3]! & (1 << (bit & 7))) !== 0;
}

/** Zincir sonrası kapalı hücre sayısı — denetim içindir. */
export const MORADON_BLOCKED_CELLS = popcount(MASK);

/** World koordinatının hücre indisi (aşağı yuvarlama, negatifte de doğru). */
export function cellIndex(world: number): number {
  return Math.floor(world / MORADON_CELL_SIZE);
}

/** HÜCRE indisleriyle sorgu. Izgara dışı → KAPALI. */
export function isCellBlocked(cx: number, cy: number): boolean {
  if (cx < 0 || cy < 0 || cx >= MORADON_MASK_CELLS || cy >= MORADON_MASK_CELLS) return true;
  const bit = cy * MORADON_MASK_CELLS + cx;
  return (MASK[bit >> 3]! & (1 << (bit & 7))) !== 0;
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
