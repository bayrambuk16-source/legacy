/** dist/main.js + index.html + varlıklar → dist/preview.html (tek dosya).
 *  Çift tıklayla (file://) açılabilir test sürümü; varlıklar data URI olarak gömülür. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const JS_PATH = arg('js', 'dist/main.js');
const OUT_PATH = arg('out', 'dist/preview.html');
const TITLE = arg('title', 'Mobile RPG — önizleme');
const js = readFileSync(join(ROOT, JS_PATH), 'utf-8');

// manifesti kaynak dosyadan oku (tek gerçek kaynak)
const manifestSrc = readFileSync(join(ROOT, 'src', 'game', 'data', 'assets-manifest.ts'), 'utf-8');
const entries = [...manifestSrc.matchAll(/(\w+):\s*'(assets\/[^']+)'/g)];

/* --manifest <path[,path2,...]>: EK manifest(ler) (deneyler icin). Ana preview
   cagrisinda verilmez, bu yuzden ana cikti bu ekten etkilenmez.

   P2.25.1 — VIRGULLE AYRILMIS COKLU YOL. Tarama METIN TABANLIDIR:
   `key: 'assets/...'` desenini arar. Bu yuzden bir manifest baska bir
   dosyadan `...SPREAD` ile besleniyorsa O DOSYA DA verilmelidir; yoksa
   varliklar sessizce paketlenmez.

   Gercek ornek: `proto-assets.ts` icindeki `...ITEM_ICON_PATHS` yayilimi
   `item-icons.ts` dosyasindan geliyordu. Tarama yayilimi izleyemedigi
   icin 39 item ikonu preview'a HIC girmedi ve oyunda yedek daireler
   cizildi. */
const EXTRA = arg('manifest', null);
if (EXTRA) {
  for (const rel of EXTRA.split(',').map((x) => x.trim()).filter(Boolean)) {
    const extraSrc = readFileSync(join(ROOT, rel), 'utf-8');
    entries.push(...extraSrc.matchAll(/(\w+):\s*'(assets\/[^']+)'/g));
  }
}

/* P2.1: .glb de gomulur (model/gltf-binary). Ana preview manifestinde model
   YOKTUR; bu giris yalnizca --manifest ile verilen prototip manifestinden gelir. */
const mime = { '.webp': 'image/webp', '.png': 'image/png', '.glb': 'model/gltf-binary' };
const assets = {};
let missing = 0;
for (const [, key, rel] of entries) {
  const p = join(ROOT, 'public', rel);
  if (!existsSync(p)) { console.warn(`  ! eksik varlık: ${rel}`); missing++; continue; }
  const b64 = readFileSync(p).toString('base64');
  assets[key] = `data:${mime[extname(p)] ?? 'application/octet-stream'};base64,${b64}`;
}

const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<title>${TITLE}</title>
<style>
  html, body { margin: 0; height: 100%; background: #0b0908; overflow: hidden; }
  #game { height: 100%; display: flex; align-items: center; justify-content: center;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    box-sizing: border-box; }
  canvas { display: block; }
</style>
</head>
<body>
<div id="game"></div>
<script>window.__ASSETS__ = ${JSON.stringify(assets)};</script>
<script type="module">${js.replace(/<\/script>/g, '<\\/script>')}</script>
</body>
</html>`;

writeFileSync(join(ROOT, OUT_PATH), html);
const kb = Math.round(Buffer.byteLength(html) / 1024);
console.log(`${OUT_PATH} üretildi (${kb} KB, ${Object.keys(assets).length} gömülü varlık${missing ? `, ${missing} eksik` : ''})`);
