/** ARCHER SPRITE VALIDATOR — ARCHER ANIMATION ASSET SPEC V1 §14
 *
 *  Gercek artwork TESLIM EDILMEDEN once hazirlanmistir. Hicbir dosyayi SILMEZ,
 *  TASIMAZ veya DEGISTIRMEZ; yalniz rapor uretir ve exit kodu doner.
 *
 *  NEDEN PNG? Spec §12 pipeline'i `source PNG -> validation -> WebP runtime atlas`.
 *  Pixel-identical duplicate ve bos-kare tespiti kayipli WebP uzerinde guvenilir
 *  degildir; bu yuzden dogrulama LOSSLESS KAYNAK uzerinde calisir.
 *
 *  BAGIMLILIK YOK: PNG cozumu node:zlib ile elle yapilir (proje kutuphane
 *  ekleyemiyor — npm registry 403).
 *
 *  Kullanim:
 *    node tools/validate-archer-sprites.mjs --dir <klasor> [--meta <json>] [--json] [--strict]
 *    node tools/validate-archer-sprites.mjs --selftest
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync, deflateSync } from 'node:zlib';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ CLI */
function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1] : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

/* Esikler — CLI'dan degistirilebilir, koda gomulu "sihirli sayi" birakmamak icin
   hepsi burada toplu. Perceptual esik WARN uretir, FAIL degil (spec §14). */
const TH = {
  /** Bir pikselin "dolu" sayilmasi icin en az bu alfa. */
  alpha: Number(arg('alpha-threshold', 8)),
  /** Iki kare bu benzerligin uzerindeyse supheli (0..1). */
  similar: Number(arg('similarity', 0.985)),
  /** Ayak hizasi: icerik alt kenari [anchorY - below, anchorY + above] icinde olmali. */
  footBelow: Number(arg('foot-below', 40)),
  footAbove: Number(arg('foot-above', 6)),
  /** Yatay merkez sapmasi (px). */
  centerDrift: Number(arg('center-drift', 60)),
  /** Ardisik kareler arasi bbox sicramasi (px). */
  bboxJump: Number(arg('bbox-jump', 90)),
};

/* --------------------------------------------------------------- PNG I/O */
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Bagimsiz PNG cozucu. Donen: { width, height, rgba: Uint8Array, hadAlphaChannel } */
function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIG)) {
    if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
      throw new Error('WEBP_INPUT');
    }
    throw new Error('PNG imzasi yok (dosya PNG degil)');
  }
  let off = 8, ihdr = null, palette = null, trns = null;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString('ascii');
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4),
        bitDepth: data[8], colorType: data[9], interlace: data[12],
      };
    } else if (type === 'PLTE') palette = Buffer.from(data);
    else if (type === 'tRNS') trns = Buffer.from(data);
    else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!ihdr) throw new Error('IHDR yok');
  if (ihdr.interlace !== 0) throw new Error('Interlaced (Adam7) PNG desteklenmiyor — interlace kapali export edin');
  if (ihdr.bitDepth !== 8) throw new Error(`bitDepth ${ihdr.bitDepth} desteklenmiyor — 8-bit/kanal export edin`);

  const chans = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.colorType];
  if (!chans) throw new Error(`colorType ${ihdr.colorType} desteklenmiyor`);

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = chans;
  const stride = ihdr.width * bpp;
  const out = Buffer.alloc(ihdr.height * stride);
  let pos = 0;
  for (let y = 0; y < ihdr.height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride); pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = x >= bpp && prev ? prev[x - bpp] : 0;
      const v = line[x];
      cur[x] = (filter === 0 ? v
        : filter === 1 ? v + a
        : filter === 2 ? v + b
        : filter === 3 ? v + ((a + b) >> 1)
        : v + paeth(a, b, c)) & 0xff;
    }
  }
  /* RGBA'ya normalize et */
  const rgba = new Uint8Array(ihdr.width * ihdr.height * 4);
  for (let i = 0, p = 0; i < ihdr.width * ihdr.height; i++, p += 4) {
    const s = i * bpp;
    if (ihdr.colorType === 6) { rgba[p] = out[s]; rgba[p + 1] = out[s + 1]; rgba[p + 2] = out[s + 2]; rgba[p + 3] = out[s + 3]; }
    else if (ihdr.colorType === 2) { rgba[p] = out[s]; rgba[p + 1] = out[s + 1]; rgba[p + 2] = out[s + 2]; rgba[p + 3] = 255; }
    else if (ihdr.colorType === 4) { rgba[p] = rgba[p + 1] = rgba[p + 2] = out[s]; rgba[p + 3] = out[s + 1]; }
    else if (ihdr.colorType === 0) { rgba[p] = rgba[p + 1] = rgba[p + 2] = out[s]; rgba[p + 3] = 255; }
    else { /* colorType 3: palette */
      const idx = out[s];
      rgba[p] = palette?.[idx * 3] ?? 0;
      rgba[p + 1] = palette?.[idx * 3 + 1] ?? 0;
      rgba[p + 2] = palette?.[idx * 3 + 2] ?? 0;
      rgba[p + 3] = trns && idx < trns.length ? trns[idx] : 255;
    }
  }
  const hadAlphaChannel = ihdr.colorType === 6 || ihdr.colorType === 4
    || (ihdr.colorType === 3 && trns !== null);
  return { width: ihdr.width, height: ihdr.height, rgba, hadAlphaChannel };
}

/** Minimal PNG yazici — YALNIZ --selftest fikstürleri icin. */
function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([PNG_SIG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
let CRC_T = null;
function crc32(buf) {
  if (!CRC_T) {
    CRC_T = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_T[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

/* ------------------------------------------------------- kare metrikleri */
const SIG = 16;                                  // perceptual imza cozunurlugu

function frameMetrics(img, fw, fh, col, row) {
  const x0 = col * fw, y0 = row * fh;
  let minX = fw, minY = fh, maxX = -1, maxY = -1, filled = 0, opaqueAll = true;
  let h = 0x811c9dc5;                             // FNV-1a
  const sig = new Float64Array(SIG * SIG);
  const cnt = new Float64Array(SIG * SIG);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const p = ((y0 + y) * img.width + (x0 + x)) * 4;
      const r = img.rgba[p], g = img.rgba[p + 1], b = img.rgba[p + 2], a = img.rgba[p + 3];
      h = Math.imul(h ^ r, 16777619); h = Math.imul(h ^ g, 16777619);
      h = Math.imul(h ^ b, 16777619); h = Math.imul(h ^ a, 16777619);
      if (a < 255) opaqueAll = false;
      if (a >= TH.alpha) {
        filled++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
      const si = Math.min(SIG - 1, (y * SIG / fh) | 0) * SIG + Math.min(SIG - 1, (x * SIG / fw) | 0);
      sig[si] += (0.299 * r + 0.587 * g + 0.114 * b) * (a / 255);
      cnt[si] += 1;
    }
  }
  for (let i = 0; i < sig.length; i++) sig[i] = cnt[i] ? sig[i] / cnt[i] : 0;
  return {
    col, row, filled, opaqueAll, hash: (h >>> 0).toString(16).padStart(8, '0'), sig,
    bbox: maxX < 0 ? null : { x0: minX, y0: minY, x1: maxX, y1: maxY, w: maxX - minX + 1, h: maxY - minY + 1 },
  };
}

/** 0..1 benzerlik (1 = ayni). Normalize L1. */
function similarity(a, b) {
  let d = 0, m = 0;
  for (let i = 0; i < a.length; i++) { d += Math.abs(a[i] - b[i]); m += Math.max(a[i], b[i]); }
  return m === 0 ? 1 : 1 - d / m;
}

/* --------------------------------------------------------------- rapor */
class Report {
  constructor() { this.fail = []; this.warn = []; this.info = []; this.atlases = {}; }
  F(atlas, msg) { this.fail.push({ atlas, msg }); }
  W(atlas, msg) { this.warn.push({ atlas, msg }); }
  I(msg) { this.info.push(msg); }
}

const DIRECTION_NAMES = ['BACK', 'BACK_RIGHT', 'RIGHT', 'FRONT_RIGHT', 'FRONT', 'FRONT_LEFT', 'LEFT', 'BACK_LEFT'];
const ATLAS_FILES = {
  walk: 'archer_walk', attack: 'archer_attack', skill: 'archer_skill',
  idle: 'archer_idle', dead: 'archer_dead',
};

function validateAtlas(rep, name, file, img, meta, animMeta) {
  const fw = meta.frameWidth, fh = meta.frameHeight;
  const cols = animMeta.frames, rows = 8;
  const a = { file, cols, rows, frames: [] };
  rep.atlases[name] = a;

  /* 1) boyut + deterministik cikarim */
  if (img.width !== fw * cols || img.height !== fh * rows) {
    rep.F(name, `boyut ${img.width}×${img.height}, beklenen ${fw * cols}×${fh * rows} (${cols} sütun × ${rows} satır)`);
    return;
  }
  if (img.width % fw !== 0 || img.height % fh !== 0) {
    rep.F(name, 'kare boyutuna tam bölünmüyor — satır/sütun çıkarımı deterministik değil');
    return;
  }
  a.size = `${img.width}×${img.height}`;

  /* 2) alfa kanali gercekten var mi */
  if (!img.hadAlphaChannel) rep.F(name, 'PNG alfa kanalı YOK (RGBA export edilmeli)');

  /* 3) kare metrikleri */
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const line = [];
    for (let c = 0; c < cols; c++) line.push(frameMetrics(img, fw, fh, c, r));
    grid.push(line);
  }
  a.frames = grid.map((line) => line.map((f) => ({
    hash: f.hash, filled: f.filled, bbox: f.bbox,
  })));

  const anyTransparent = grid.some((l) => l.some((f) => !f.opaqueAll));
  if (img.hadAlphaChannel && !anyTransparent) {
    rep.F(name, 'hiçbir karede şeffaf piksel yok — arka plan kesilmemiş olabilir');
  }

  /* 4) bos kare / bos satir */
  for (let r = 0; r < rows; r++) {
    const empties = grid[r].filter((f) => f.filled === 0).map((f) => f.col);
    if (empties.length === cols) rep.F(name, `satır ${r} (${DIRECTION_NAMES[r]}) tamamen BOŞ`);
    else if (empties.length) rep.F(name, `satır ${r} (${DIRECTION_NAMES[r]}) boş kare içeriyor: ${empties.join(', ')}`);
  }

  /* 5) pixel-identical duplicate — AYNI yon icinde */
  for (let r = 0; r < rows; r++) {
    const seen = new Map();
    for (const f of grid[r]) {
      if (f.filled === 0) continue;
      if (seen.has(f.hash)) {
        rep.F(name, `satır ${r} (${DIRECTION_NAMES[r]}): kare ${seen.get(f.hash)} ve ${f.col} PIXEL-IDENTICAL`);
      } else seen.set(f.hash, f.col);
    }
  }

  /* 6) perceptual benzerlik — WARN, otomatik yaptirim YOK */
  if (cols > 1) {
    const pairs = [];
    for (let r = 0; r < rows; r++) {
      let distinct = 1;
      for (let i = 0; i < cols; i++) {
        for (let j = i + 1; j < cols; j++) {
          const s = similarity(grid[r][i].sig, grid[r][j].sig);
          if (s >= TH.similar) pairs.push({ row: r, i, j, s });
        }
      }
      /* kaba kume sayimi: bir onceki karelerden hicbirine cok benzemeyen kare sayisi */
      for (let i = 1; i < cols; i++) {
        let novel = true;
        for (let j = 0; j < i; j++) if (similarity(grid[r][i].sig, grid[r][j].sig) >= TH.similar) novel = false;
        if (novel) distinct++;
      }
      a.distinctPerRow = a.distinctPerRow ?? [];
      a.distinctPerRow.push(distinct);
      if (name === 'walk' && distinct < 4) {
        rep.W(name, `satır ${r} (${DIRECTION_NAMES[r]}): yalnız ~${distinct} ayrı poz görünüyor (${cols} kare) — sahte döngü (A A A… / A B A B…) olabilir, GÖZLE DOĞRULA`);
      }
    }
    if (pairs.length) {
      const top = pairs.sort((x, y) => y.s - x.s).slice(0, 6)
        .map((p) => `r${p.row}[${p.i}~${p.j}] %${(p.s * 100).toFixed(1)}`).join(', ');
      rep.W(name, `yüksek benzerlik (eşik %${(TH.similar * 100).toFixed(1)}): ${pairs.length} çift — ${top}`);
    }
  }

  /* 7) foot anchor mantikli mi */
  const bottoms = [], centers = [];
  for (let r = 0; r < rows; r++) for (const f of grid[r]) {
    if (!f.bbox) continue;
    bottoms.push(f.bbox.y1);
    centers.push((f.bbox.x0 + f.bbox.x1) / 2);
  }
  if (bottoms.length) {
    const lo = Math.min(...bottoms), hi = Math.max(...bottoms);
    const cLo = Math.min(...centers), cHi = Math.max(...centers);
    a.footBottom = { min: lo, max: hi, anchorY: meta.footAnchor.y };
    a.centerX = { min: +cLo.toFixed(1), max: +cHi.toFixed(1), anchorX: meta.footAnchor.x };
    if (hi > meta.footAnchor.y + TH.footAbove) {
      rep.W(name, `içerik anchor'ın ALTINA taşıyor (en alt y=${hi}, anchorY=${meta.footAnchor.y}) — karakter zemine gömülü görünebilir`);
    }
    if (lo < meta.footAnchor.y - TH.footBelow) {
      rep.W(name, `bazı karelerde içerik anchor'dan çok yukarıda (en alt y=${lo}, anchorY=${meta.footAnchor.y}) — havada durma riski`);
    }
    if (cLo < meta.footAnchor.x - TH.centerDrift || cHi > meta.footAnchor.x + TH.centerDrift) {
      rep.W(name, `yatay merkez kayması geniş (${cLo.toFixed(0)}..${cHi.toFixed(0)}, anchorX=${meta.footAnchor.x})`);
    }
  }

  /* 8) ardisik kareler arasi bbox sicramasi */
  if (cols > 1) {
    let worst = 0, where = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 1; c < cols; c++) {
        const p = grid[r][c - 1].bbox, q = grid[r][c].bbox;
        if (!p || !q) continue;
        const d = Math.max(Math.abs(p.x0 - q.x0), Math.abs(p.y0 - q.y0), Math.abs(p.x1 - q.x1), Math.abs(p.y1 - q.y1));
        if (d > worst) { worst = d; where = `r${r} ${c - 1}→${c}`; }
      }
    }
    a.maxBboxJump = worst;
    if (worst > TH.bboxJump) rep.W(name, `ardışık kareler arası bbox sıçraması ${worst}px (${where}) — eşik ${TH.bboxJump}px`);
  }
}

/* ------------------------------------------------------------- calistir */
function loadMeta(dir) {
  const local = join(dir, 'archer_animation.json');
  const explicit = arg('meta');
  const path = explicit ? resolve(ROOT, explicit)
    : existsSync(local) ? local
    : join(ROOT, 'docs', 'schema', 'archer_animation.example.json');
  const meta = JSON.parse(readFileSync(path, 'utf-8'));
  return { meta, path, isTemplate: !explicit && !existsSync(local) };
}

function run(dir) {
  const rep = new Report();
  const { meta, path, isTemplate } = loadMeta(dir);
  rep.I(`metadata: ${path.replace(ROOT + '/', '')}${isTemplate ? '  (ŞABLON — teslimde gerçek dosya bekleniyor)' : ''}`);
  rep.I(`kare: ${meta.frameWidth}×${meta.frameHeight}  ·  anchor: (${meta.footAnchor.x}, ${meta.footAnchor.y})`);

  /* yon satiri sozlesmesi */
  const rowsSeen = new Set(Object.values(meta.directionRows));
  if (rowsSeen.size !== 8) rep.F('meta', 'directionRows 8 farklı satır içermiyor');
  for (const [i, n] of DIRECTION_NAMES.entries()) {
    if (meta.directionRows[n] !== i) {
      rep.F('meta', `directionRows.${n} = ${meta.directionRows[n]}, spec §2'ye göre ${i} olmalı`);
    }
  }

  let missing = 0;
  for (const [name, base] of Object.entries(ATLAS_FILES)) {
    const animMeta = meta.animations[name];
    if (!animMeta) { rep.F(name, 'metadata içinde tanım yok'); continue; }
    const png = join(dir, `${base}.png`);
    const webp = join(dir, `${base}.webp`);
    if (!existsSync(png)) {
      if (existsSync(webp)) {
        rep.F(name, `yalnız WebP var (${base}.webp). Doğrulama LOSSLESS KAYNAK üzerinde yapılır (spec §12) — ${base}.png teslim edin`);
      } else {
        missing++;
        rep.I(`· ${base}.png — TESLİM EDİLMEDİ`);
      }
      continue;
    }
    let img;
    try { img = decodePng(readFileSync(png)); }
    catch (e) {
      rep.F(name, e.message === 'WEBP_INPUT'
        ? 'dosya adı .png ama içerik WebP'
        : `PNG çözülemedi: ${e.message}`);
      continue;
    }
    validateAtlas(rep, name, `${base}.png`, img, meta, animMeta);
  }

  /* releaseFrame dolduruldu mu */
  for (const k of ['attack', 'skill']) {
    const rf = meta.animations?.[k]?.releaseFrame;
    if (rf === null || rf === undefined) {
      rep.W(k, 'releaseFrame null — runtime projectile timing\'i TAHMİN ETMEYECEK (spec §9). Final art ile doldurulmalı.');
    } else if (rf < 0 || rf >= meta.animations[k].frames) {
      rep.F(k, `releaseFrame ${rf} kare aralığı dışında (0..${meta.animations[k].frames - 1})`);
    }
  }
  return { rep, missing, total: Object.keys(ATLAS_FILES).length };
}

function print({ rep, missing, total }) {
  const line = (s) => console.log(s);
  line('');
  line('  ARCHER SPRITE VALIDATOR — SPEC V1 §14');
  line('  ' + '─'.repeat(62));
  for (const i of rep.info) line(`  ${i}`);
  line('');
  for (const [name, a] of Object.entries(rep.atlases)) {
    if (!a.size) continue;
    const extra = [
      a.footBottom ? `ayak y ${a.footBottom.min}..${a.footBottom.max} (anchor ${a.footBottom.anchorY})` : null,
      a.maxBboxJump !== undefined ? `max bbox sıçrama ${a.maxBboxJump}px` : null,
      a.distinctPerRow ? `ayrı poz/satır ${Math.min(...a.distinctPerRow)}..${Math.max(...a.distinctPerRow)}` : null,
    ].filter(Boolean).join(' · ');
    line(`  ${name.padEnd(7)} ${a.file.padEnd(20)} ${a.size.padEnd(12)} ${a.cols}×${a.rows}   ${extra}`);
  }
  if (missing === total) {
    line('');
    line('  ⓘ  Hiçbir atlas teslim edilmemiş. Araç hazır; gerçek dosyalar geldiğinde çalıştırın.');
  }
  if (rep.warn.length) {
    line('');
    line('  UYARILAR (rapor — otomatik yaptırım YOK):');
    for (const w of rep.warn) line(`    ! [${w.atlas}] ${w.msg}`);
  }
  if (rep.fail.length) {
    line('');
    line('  HATALAR:');
    for (const f of rep.fail) line(`    ✗ [${f.atlas}] ${f.msg}`);
  }
  line('');
  line(`  Sonuç: ${rep.fail.length} hata, ${rep.warn.length} uyarı${missing ? `, ${missing}/${total} atlas teslim edilmedi` : ''}`);
  line('');
}

/* ------------------------------------------------------------- selftest */
/** Sentetik fikstür: gercek sanat DEGIL, aracin kendi dogrulugunu kanitlamak icin
 *  gecici klasore uretilen basit sekiller. Repoya YAZILMAZ. */
function drawFixture(dir, faults = {}) {
  const fw = faults.frameW ?? 60, fh = 60, anchorY = 53;
  mkdirSync(dir, { recursive: true });
  const metaObj = JSON.parse(readFileSync(join(ROOT, 'docs', 'schema', 'archer_animation.example.json'), 'utf-8'));
  metaObj.frameWidth = fw; metaObj.frameHeight = fh;
  metaObj.footAnchor = { x: Math.round(fw / 2), y: anchorY };
  writeFileSync(join(dir, 'archer_animation.json'), JSON.stringify(metaObj, null, 2));

  for (const [name, base] of Object.entries(ATLAS_FILES)) {
    const cols = metaObj.animations[name].frames, rows = 8;
    const W = fw * cols, H = fh * rows;
    const px = new Uint8Array(W * H * 4);
    if (faults.opaque) for (let i = 3; i < px.length; i += 4) px[i] = 255;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (faults.emptyFrame && name === 'walk' && r === 0 && c === 3) continue;
        /* poz varyasyonu: normalde her kare farkli, hatali senaryolarda degil */
        const pose = faults.allSame ? 0 : faults.abab ? (c % 2) : c;
        const legSpread = 2 + pose * 2;
        const bodyH = 22 + (r % 3);
        for (let y = 0; y < fh; y++) {
          for (let x = 0; x < fw; x++) {
            const cx = fw / 2, footY = anchorY;
            let on = false;
            if (y > footY - bodyH && y <= footY - 8 && Math.abs(x - cx) < 5 + (r % 2)) on = true;      // gövde
            if (y > footY - 8 && y <= footY && (Math.abs(x - cx + legSpread) < 2 || Math.abs(x - cx - legSpread) < 2)) on = true; // bacaklar
            if (y > footY - bodyH - 7 && y <= footY - bodyH && Math.abs(x - cx) < 4) on = true;        // kafa
            if (!on) continue;
            const p = ((r * fh + y) * W + (c * fw + x)) * 4;
            px[p] = 120 + pose * 10; px[p + 1] = 90 + r * 8; px[p + 2] = 70; px[p + 3] = 255;
          }
        }
      }
    }
    const w = faults.badSize && name === 'walk' ? W - fw : W;
    if (w !== W) {
      const cut = new Uint8Array(w * H * 4);
      for (let y = 0; y < H; y++) cut.set(px.subarray((y * W) * 4, (y * W + w) * 4), y * w * 4);
      writeFileSync(join(dir, `${base}.png`), encodePng(w, H, cut));
    } else {
      writeFileSync(join(dir, `${base}.png`), encodePng(W, H, px));
    }
  }
}

function selftest() {
  const base = join(tmpdir(), `archer-validator-selftest-${process.pid}`);
  const cases = [
    { id: 'temiz',                faults: {},                    expectFail: false },
    { id: 'walk hepsi aynı',      faults: { allSame: true },     expectFail: true },
    { id: 'walk A B A B',         faults: { abab: true },        expectFail: true },
    { id: 'boş kare',             faults: { emptyFrame: true },  expectFail: true },
    { id: 'alfa yok (opak)',      faults: { opaque: true },      expectFail: true },
    { id: 'yanlış atlas boyutu',  faults: { badSize: true },     expectFail: true },
  ];
  let bad = 0;
  console.log('\n  SELF-TEST — sentetik fikstürler (gerçek sanat DEĞİL, repoya yazılmaz)');
  console.log('  ' + '─'.repeat(62));
  for (const c of cases) {
    const dir = join(base, c.id.replace(/\s+/g, '_'));
    rmSync(dir, { recursive: true, force: true });
    drawFixture(dir, c.faults);
    const { rep } = run(dir);
    const failed = rep.fail.length > 0;
    const warned = rep.warn.some((w) => /sahte döngü/.test(w.msg));
    /* A B A B: pixel-identical duplicate FAIL uretir; hepsi ayni da oyle */
    const ok = failed === c.expectFail;
    if (!ok) bad++;
    console.log(`  ${ok ? '✓' : '✗'} ${c.id.padEnd(22)} hata=${rep.fail.length} uyarı=${rep.warn.length}${warned ? ' (sahte-döngü uyarısı ✓)' : ''}`);
    if (!ok) for (const f of rep.fail) console.log(`      → ${f.msg}`);
    rmSync(dir, { recursive: true, force: true });
  }
  rmSync(base, { recursive: true, force: true });
  console.log(`\n  Self-test: ${cases.length - bad}/${cases.length} senaryo beklendiği gibi\n`);
  return bad === 0 ? 0 : 1;
}

/* ------------------------------------------------------------------ main */
if (flag('selftest')) {
  process.exit(selftest());
}
/* Araci ucdan uca denemek icin sentetik ornek uretir. GERCEK SANAT DEGILDIR;
   yalniz verilen klasore yazilir, repoya/asset klasorlerine dokunmaz. */
if (flag('make-fixture')) {
  const out = arg("make-fixture") ? resolve(ROOT, arg("make-fixture")) : join(tmpdir(), "archer-fixture");
  drawFixture(out, {});
  console.log(`\n  Sentetik ornek uretildi (GERCEK SANAT DEGIL): ${out}`);
  console.log(`  Denemek icin: npm run validate:archer -- --dir ${out}\n`);
  process.exit(0);
}
const DIR = resolve(ROOT, arg('dir', 'assets-src/archer'));
if (!existsSync(DIR)) {
  console.log(`\n  ⓘ  Klasör yok: ${DIR.replace(ROOT + '/', '')}`);
  console.log('     Gerçek atlaslar henüz teslim edilmedi. Teslim geldiğinde:');
  console.log('       npm run validate:archer -- --dir <klasör>');
  console.log('     Aracın kendi doğruluğunu görmek için: npm run validate:archer -- --selftest\n');
  process.exit(0);
}
const result = run(DIR);
if (flag('json')) console.log(JSON.stringify({ fail: result.rep.fail, warn: result.rep.warn, atlases: result.rep.atlases }, null, 2));
else print(result);
process.exit(result.rep.fail.length > 0 ? 1 : (flag('strict') && result.rep.warn.length > 0 ? 1 : 0));
