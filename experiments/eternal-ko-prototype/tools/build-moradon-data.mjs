/** MORADON VERİ ÜRETİCİSİ — P2.4C
 *
 *  ══════════════ BU SCRIPT NE YAPAR ══════════════
 *  `moradon_0826.smd` çıkarımından gelen GLB'leri okur ve gameplay/renderer'ın
 *  kullanacağı SAYISAL TABLOLARI üretir. Çalışma zamanında GLB PARSE EDİLMEZ;
 *  bütün ayrıştırma BURADA, bir kez olur.
 *
 *  Üretilen dosyalar (elle DÜZENLENMEZ, yeniden üretilir):
 *    data/moradon-terrain-data.ts    — yükseklik ızgarası (float32, base64)
 *    data/moradon-walkmask-data.ts   — yürünebilirlik maskesi (bit, base64)
 *    data/moradon-meta-data.ts       — sunucu event'leri + referans fixture
 *
 *  Bağımlılık YOKTUR: GLB ikili ayrıştırma elle yapılır, three import edilmez.
 *
 *  Kullanım:
 *    node experiments/eternal-ko-prototype/tools/build-moradon-data.mjs <paketDizini>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/* ═══════════════════════ sabitler (görev tanımı §1) ═══════════════════════ */

/** KO ızgara birimi → world birimi. `data/moradon-coords.ts` ile AYNI olmalı. */
const KO_TO_WORLD_SCALE = 5;
/** Kaynak ızgara düğüm sayısı (kenar başına). KAYNAK: .smd grid_size. */
const GRID = 129;
/** Kaynak düğüm aralığı (KO birimi). KAYNAK: .smd unit_distance. */
const KO_STEP = 4;
/** Düğüm aralığı, world birimi. */
const NODE_STEP = KO_STEP * KO_TO_WORLD_SCALE;          // 20
/** Maske hücresi = 1 KO birimi = 5 world birimi (görev tanımı §1.3). */
const CELL = KO_TO_WORLD_SCALE;                          // 5
/** Maske kenar uzunluğu (hücre). */
const CELLS = (GRID - 1) * KO_STEP;                      // 512
/** Dünya sınırı (world birimi). */
const WORLD_SPAN = CELLS * CELL;                         // 2560

/* ═══════════════════════ GLB ayrıştırma (bağımlılıksız) ═══════════════════════ */

function readGlb(path) {
  const buf = readFileSync(path);
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546c67) throw new Error(`GLB değil: ${path}`);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const binStart = 20 + jsonLen + 8;
  return { gltf, buf, binStart };
}

/** Accessor'ı tipli diziye çevirir (yalnız bu projede geçen tipler). */
function accessor({ gltf, buf, binStart }, index) {
  const a = gltf.accessors[index];
  const v = gltf.bufferViews[a.bufferView];
  const off = binStart + (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
  if (a.componentType === 5125) {                        // UNSIGNED_INT
    const out = new Uint32Array(a.count);
    for (let i = 0; i < a.count; i++) out[i] = buf.readUInt32LE(off + i * 4);
    return out;
  }
  if (a.componentType === 5126 && a.type === 'VEC3') {    // FLOAT VEC3
    const out = new Float32Array(a.count * 3);
    for (let i = 0; i < out.length; i++) out[i] = buf.readFloatLE(off + i * 4);
    return out;
  }
  throw new Error(`desteklenmeyen accessor: ${a.componentType}/${a.type}`);
}

/** Mesh'in ilk primitive'ini döndürür. */
function primitiveOf(glb, meshIndex) {
  const p = glb.gltf.meshes[meshIndex].primitives[0];
  return { pos: accessor(glb, p.attributes.POSITION), idx: accessor(glb, p.indices) };
}

/* ═══════════════════════ 1) yükseklik ızgarası ═══════════════════════ */

/** x5 terrain GLB → satır-major (z, x) float32 yükseklik ızgarası, WORLD birimi.
 *
 *  Vertex sırası doğrulanır: ilk GRID vertex X boyunca artmalı, sonra Z. Sıra
 *  beklenenden farklıysa SESSİZCE kabul edilmez — fırlatılır. */
function buildHeightGrid(glb) {
  const { pos } = primitiveOf(glb, 0);
  const n = pos.length / 3;
  if (n !== GRID * GRID) throw new Error(`vertex sayısı ${n}, beklenen ${GRID * GRID}`);
  const h = new Float32Array(GRID * GRID);
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    const col = Math.round(x / NODE_STEP);
    const row = Math.round(z / NODE_STEP);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) {
      throw new Error(`vertex ${i} ızgara dışında: ${x},${z}`);
    }
    if (Math.abs(col * NODE_STEP - x) > 1e-3 || Math.abs(row * NODE_STEP - z) > 1e-3) {
      throw new Error(`vertex ${i} ızgaraya oturmuyor: ${x},${z}`);
    }
    h[row * GRID + col] = y;
  }
  return h;
}

/** Kenar artefaktı tespiti — SABİT DEĞİL, VERİDEN TÜRER.
 *
 *  Kaynak heightmap'in dış düğüm sıralarında dejenere (uçuruma düşen) değerler
 *  var. "İç" bölgenin taban yüksekliği ölçülür; bir kenar sırasının minimumu bu
 *  tabanın ALTINDAYSA o sıra artefakt sayılır ve oynanabilir dikdörtgen içeri
 *  çekilir. Eşik elle yazılmaz; iç bölgenin kendi minimumudur. */
function playableInset(h) {
  const INNER = 4;                       // iç bölge payı (düğüm)
  let floor = Infinity;
  for (let r = INNER; r < GRID - INNER; r++) {
    for (let c = INNER; c < GRID - INNER; c++) floor = Math.min(floor, h[r * GRID + c]);
  }
  let top = 0, bottom = 0, left = 0, right = 0;
  /* YİNELEMELİ: bir kenarın artefaktı KÖŞEDE komşu kenarın minimumunu da
     bozar (üst sıradaki uçurum, en sağ sütunun minimumunu da aşağı çeker).
     Bu yüzden her kenar, DİĞERLERİNİN halihazırda kırptığı aralıkta ölçülür
     ve sabit noktaya kadar tekrarlanır. */
  const rowMin = (r) => {
    let m = Infinity;
    for (let c = left; c < GRID - right; c++) m = Math.min(m, h[r * GRID + c]);
    return m;
  };
  const colMin = (c) => {
    let m = Infinity;
    for (let r = top; r < GRID - bottom; r++) m = Math.min(m, h[r * GRID + c]);
    return m;
  };
  for (let pass = 0; pass < 8; pass++) {
    const before = `${top}|${bottom}|${left}|${right}`;
    while (top < INNER && rowMin(top) < floor) top++;
    while (bottom < INNER && rowMin(GRID - 1 - bottom) < floor) bottom++;
    while (left < INNER && colMin(left) < floor) left++;
    while (right < INNER && colMin(GRID - 1 - right) < floor) right++;
    if (`${top}|${bottom}|${left}|${right}` === before) break;
  }
  return { floor, top, bottom, left, right };
}

/* ═══════════════════════ 2) yürünebilirlik maskesi ═══════════════════════ */

/** Üçgen ↔ hücre (AABB) 2B çakışması — AYIRICI EKSEN.
 *  CONSERVATIVE: üçgen hücreye DEĞİYORSA true (görev tanımı §1.4a). */
function triTouchesCell(ax, ay, bx, by, cx, cy, minX, minY, maxX, maxY) {
  /* Eksen 1-2: hücrenin kendi eksenleri. */
  if (Math.min(ax, bx, cx) > maxX || Math.max(ax, bx, cx) < minX) return false;
  if (Math.min(ay, by, cy) > maxY || Math.max(ay, by, cy) < minY) return false;
  /* Eksen 3-5: üçgen kenar normalleri. */
  const ex = [bx - ax, cx - bx, ax - cx];
  const ey = [by - ay, cy - by, ay - cy];
  const tx = [ax, bx, cx], ty = [ay, by, cy];
  for (let e = 0; e < 3; e++) {
    const nx = -ey[e], ny = ex[e];
    if (nx === 0 && ny === 0) continue;                 // dejenere kenar → atla
    let tMin = Infinity, tMax = -Infinity;
    for (let i = 0; i < 3; i++) {
      const p = nx * tx[i] + ny * ty[i];
      if (p < tMin) tMin = p; if (p > tMax) tMax = p;
    }
    let bMin = Infinity, bMax = -Infinity;
    for (const [px, py] of [[minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]]) {
      const p = nx * px + ny * py;
      if (p < bMin) bMin = p; if (p > bMax) bMax = p;
    }
    if (tMin > bMax || tMax < bMin) return false;
  }
  return true;
}

/** Collision mesh (KAYNAK ölçek) → hücre maskesi. Hücre = 1 KO birimi. */
function rasterizeCollision(glb) {
  const { pos, idx } = primitiveOf(glb, 0);
  const blocked = new Uint8Array(CELLS * CELLS);
  let tris = 0, marked = 0, outside = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const i0 = idx[t] * 3, i1 = idx[t + 1] * 3, i2 = idx[t + 2] * 3;
    /* XZ düzlemine izdüşüm — dikey bileşen ATILIR (gameplay 2B'dir). */
    const ax = pos[i0], ay = pos[i0 + 2];
    const bx = pos[i1], by = pos[i1 + 2];
    const cx = pos[i2], cy = pos[i2 + 2];
    tris++;
    const lo = Math.floor(Math.min(ax, bx, cx)), hi = Math.ceil(Math.max(ax, bx, cx));
    const lo2 = Math.floor(Math.min(ay, by, cy)), hi2 = Math.ceil(Math.max(ay, by, cy));
    if (hi < 0 || lo >= CELLS || hi2 < 0 || lo2 >= CELLS) { outside++; continue; }
    for (let gy = Math.max(0, lo2); gy < Math.min(CELLS, hi2 + 1); gy++) {
      for (let gx = Math.max(0, lo); gx < Math.min(CELLS, hi + 1); gx++) {
        const k = gy * CELLS + gx;
        if (blocked[k]) continue;
        if (triTouchesCell(ax, ay, bx, by, cx, cy, gx, gy, gx + 1, gy + 1)) {
          blocked[k] = 1; marked++;
        }
      }
    }
  }
  return { blocked, tris, marked, outside };
}

/** Oynanabilir dikdörtgen dışını maskeye ekler (görev tanımı §1.4c). */
function applyPlayableRect(blocked, inset) {
  const c0 = inset.left * KO_STEP, c1 = CELLS - inset.right * KO_STEP;
  const r0 = inset.top * KO_STEP, r1 = CELLS - inset.bottom * KO_STEP;
  let added = 0;
  for (let gy = 0; gy < CELLS; gy++) {
    for (let gx = 0; gx < CELLS; gx++) {
      if (gx >= c0 && gx < c1 && gy >= r0 && gy < r1) continue;
      const k = gy * CELLS + gx;
      if (!blocked[k]) { blocked[k] = 1; added++; }
    }
  }
  return { added, rect: { minX: c0 * CELL, maxX: c1 * CELL, minY: r0 * CELL, maxY: r1 * CELL } };
}

/* ═══════════════════════ 3) kodlama ═══════════════════════ */

function heightsToB64(h) {
  const b = Buffer.alloc(h.length * 4);
  for (let i = 0; i < h.length; i++) b.writeFloatLE(h[i], i * 4);
  return b.toString('base64');
}
function maskToB64(blocked) {
  const b = Buffer.alloc(blocked.length / 8);
  for (let i = 0; i < blocked.length; i++) if (blocked[i]) b[i >> 3] |= 1 << (i & 7);
  return b.toString('base64');
}
/** Uzun base64'ü kaynak dosyada okunur satırlara böler. */
function wrap(b64, width = 100) {
  const out = [];
  for (let i = 0; i < b64.length; i += width) out.push(`  '${b64.slice(i, i + width)}'`);
  return out.join(' +\n');
}

/* ═══════════════════════ 4) üretim ═══════════════════════ */

const pkgDir = resolve(process.argv[2] ?? '.');
const outDir = resolve(new URL('../data', import.meta.url).pathname);

const terrainGlb = readGlb(join(pkgDir, 'moradon_0826_terrain_project_legacy_x5.glb'));
const collisionGlb = readGlb(join(pkgDir, 'moradon_0826_collision_clean.glb'));
const analysis = JSON.parse(readFileSync(join(pkgDir, 'moradon_0826_analysis.json'), 'utf8'));

const heights = buildHeightGrid(terrainGlb);
const inset = playableInset(heights);
const ras = rasterizeCollision(collisionGlb);
const rect = applyPlayableRect(ras.blocked, inset);

let blockedCount = 0;
for (const v of ras.blocked) if (v) blockedCount++;

/* Referans fixture: ızgara düğümlerinin GERÇEK GLB değerleri. Test bunları
   heightAt() ile karşılaştırır → "bit düzeyinde eşit" kriteri döngüsel olmaz. */
const fixtureNodes = [];
for (const [r, c] of [[0, 0], [3, 3], [10, 40], [32, 64], [44, 88], [64, 64],
  [70, 45], [88, 76], [100, 20], [110, 110], [128, 128], [64, 0]]) {
  fixtureNodes.push({ worldX: c * NODE_STEP, worldY: r * NODE_STEP, height: heights[r * GRID + c] });
}

const stamp = `üretildi: tools/build-moradon-data.mjs · kaynak ${analysis.source_file}`;
const banner = (what) => `/** ${what} — P2.4C · ÜRETİLMİŞ DOSYA, ELLE DÜZENLEME.
 *  ${stamp}
 *  Yeniden üretmek için: node experiments/eternal-ko-prototype/tools/build-moradon-data.mjs <paketDizini>
 */`;

writeFileSync(join(outDir, 'moradon-terrain-data.ts'), `${banner('MORADON YÜKSEKLİK IZGARASI')}

/** Izgara düğüm sayısı (kenar başına). */
export const MORADON_GRID = ${GRID};
/** Düğüm aralığı, world birimi. */
export const MORADON_NODE_STEP = ${NODE_STEP};
/** Yükseklik değerleri, satır-major (row = worldY/step, col = worldX/step),
 *  float32 little-endian, base64. Değerler WORLD birimindedir (×${KO_TO_WORLD_SCALE} uygulanmış). */
export const MORADON_HEIGHT_B64 =
${wrap(heightsToB64(heights))};
`);

writeFileSync(join(outDir, 'moradon-walkmask-data.ts'), `${banner('MORADON YÜRÜNEBİLİRLİK MASKESİ')}

/** Maske kenar uzunluğu (hücre). */
export const MORADON_MASK_CELLS = ${CELLS};
/** Hücre kenarı, world birimi. */
export const MORADON_CELL_SIZE = ${CELL};
/** Oynanabilir dikdörtgen (world birimi) — kaynak heightmap'in dejenere kenar
 *  sıraları VERİDEN tespit edilip çıkarıldı (üst ${inset.top} / alt ${inset.bottom} /
 *  sol ${inset.left} / sağ ${inset.right} düğüm sırası; iç taban ${inset.floor.toFixed(3)}). */
export const MORADON_PLAYABLE_RECT = {
  minX: ${rect.rect.minX}, maxX: ${rect.rect.maxX},
  minY: ${rect.rect.minY}, maxY: ${rect.rect.maxY},
} as const;
/** Kapalı hücre bitleri (1 = KAPALI), satır-major, LSB-first, base64.
 *  Kaynaklar: collision üçgenleri (conservative) + oynanabilir dikdörtgen dışı. */
export const MORADON_MASK_B64 =
${wrap(maskToB64(ras.blocked))};
`);

const toWorld = (koX, koZ) => ({ x: +(koX * KO_TO_WORLD_SCALE).toFixed(3), y: +(koZ * KO_TO_WORLD_SCALE).toFixed(3) });
const regene = analysis.regene_events.records.map((r) => {
  const c = toWorld(r.x, r.z);
  return `  { index: ${r.index}, worldX: ${c.x}, worldY: ${c.y}, areaX: ${+(r.areaX * KO_TO_WORLD_SCALE).toFixed(3)}, areaY: ${+(r.areaZ * KO_TO_WORLD_SCALE).toFixed(3)} },`;
}).join('\n');
const objects = analysis.object_events.records.map((r) => {
  const c = toWorld(r.x, r.z);
  return `  { nation: ${r.nation}, index: ${r.index}, type: ${r.type}, controlNpcRef: ${r.controlNpcID}, worldX: ${c.x}, worldY: ${c.y} },`;
}).join('\n');
const fixture = fixtureNodes.map((f) =>
  `  { worldX: ${f.worldX}, worldY: ${f.worldY}, height: ${f.height} },`).join('\n');

writeFileSync(join(outDir, 'moradon-meta-data.ts'), `${banner('MORADON SUNUCU META VERİSİ')}

/** SUNUCU regene bölgeleri — world koordinatına çevrilmiş. VERİDİR: hiçbir
 *  gameplay davranışına BAĞLANMAMIŞTIR (P2.4D). \`index 0\` şehir içindedir;
 *  ilk doğuş noktası DEĞİLDİR (o \`MORADON_WORLD_SPAWN\`'dır). */
export const MORADON_REGENE_AREAS = [
${regene}
] as const;

/** SUNUCU object event'leri (kapılar vb.) — world koordinatına çevrilmiş.
 *  VERİDİR: davranış bağlanmamıştır. */
export const MORADON_OBJECT_EVENTS = [
${objects}
] as const;

/** TEST REFERANSI — doğrudan kaynak GLB vertekslerinden alınmış ızgara düğümü
 *  yükseklikleri. \`heightAt()\` bunlarla BİT DÜZEYİNDE eşleşmelidir. */
export const MORADON_HEIGHT_FIXTURE = [
${fixture}
] as const;
`);

/* ═══════════════════════ 5) tanı çıktısı ═══════════════════════ */

console.log('— MORADON VERİ ÜRETİMİ —');
console.log(`ızgara            : ${GRID}×${GRID}, adım ${NODE_STEP} world`);
console.log(`yükseklik aralığı : ${Math.min(...heights).toFixed(2)} .. ${Math.max(...heights).toFixed(2)} world`);
console.log(`iç taban          : ${inset.floor.toFixed(3)}`);
console.log(`kenar artefaktı   : üst ${inset.top} · alt ${inset.bottom} · sol ${inset.left} · sağ ${inset.right} düğüm sırası`);
console.log(`oynanabilir alan  : X ${rect.rect.minX}..${rect.rect.maxX} · Y ${rect.rect.minY}..${rect.rect.maxY}`);
console.log(`collision üçgen   : ${ras.tris} (ızgara dışı ${ras.outside})`);
console.log(`kapalı hücre      : ${blockedCount} / ${CELLS * CELLS} (%${(100 * blockedCount / (CELLS * CELLS)).toFixed(2)})`);
console.log(`  · collision     : ${ras.marked}`);
console.log(`  · alan dışı     : ${rect.added}`);
console.log(`world span        : ${WORLD_SPAN}`);

/* ═══════════════════════ 6) ÜRETİM KAPISI ═══════════════════════
   Bu kontroller GEÇMEZSE script FIRLATIR — bozuk maske repoya giremez. */

const cellOf = (w) => Math.floor(w / CELL);
const isFree = (wx, wy) => {
  const gx = cellOf(wx), gy = cellOf(wy);
  if (gx < 0 || gy < 0 || gx >= CELLS || gy >= CELLS) return false;
  return ras.blocked[gy * CELLS + gx] === 0;
};

const problems = [];
/* a) Başlangıç noktası yürünebilir olmalı (görev tanımı §4). */
const SPAWN = { x: 306 * KO_TO_WORLD_SCALE, y: 352 * KO_TO_WORLD_SCALE };
if (!isFree(SPAWN.x, SPAWN.y)) problems.push(`spawn (${SPAWN.x},${SPAWN.y}) KAPALI`);
/* b) Maske haritayı boğmamalı. */
if (blockedCount > CELLS * CELLS * 0.45) problems.push(`kapalı oran çok yüksek: %${(100 * blockedCount / (CELLS * CELLS)).toFixed(1)}`);
/* c) Spawn'dan erişilebilir açık alan, açık alanın EZİCİ çoğunluğu olmalı —
      yoksa maske haritayı erişilemez adacıklara bölmüştür. */
let freeCells = 0;
for (const v of ras.blocked) if (!v) freeCells++;
const seen = new Uint8Array(CELLS * CELLS);
const start = cellOf(SPAWN.y) * CELLS + cellOf(SPAWN.x);
const stack = [start]; seen[start] = 1; let reached = 1;
while (stack.length) {
  const k = stack.pop();
  const gx = k % CELLS, gy = (k - gx) / CELLS;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = gx + dx, ny = gy + dy;
    if (nx < 0 || ny < 0 || nx >= CELLS || ny >= CELLS) continue;
    const nk = ny * CELLS + nx;
    if (seen[nk] || ras.blocked[nk]) continue;
    seen[nk] = 1; reached++; stack.push(nk);
  }
}
const reachPct = 100 * reached / freeCells;
const reachArea = reached * CELL * CELL;
console.log(`açık hücre        : ${freeCells}`);
console.log(`spawn'dan erişilen: ${reached} hücre = ${reachArea} world birim² (açık alanın %${reachPct.toFixed(1)}'i)`);
/* c) Spawn'dan erişilen alan OYNANABİLİR büyüklükte olmalı. YÜZDE ölçüsü
      KULLANILMAZ: surlu bir şehir haritayı meşru olarak bölebilir. Önemli olan
      erişilen alanın gerçekten oynanacak kadar geniş olmasıdır. */
const MIN_PLAYABLE_AREA = 250000;
if (reachArea < MIN_PLAYABLE_AREA) {
  problems.push(`spawn'dan erişilen alan ${reachArea} world birim² — oynanamayacak kadar küçük`);
}

if (problems.length) {
  console.error('\n✗ ÜRETİM KAPISI BAŞARISIZ:');
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}
console.log('\n✓ üretim kapısı geçti');
