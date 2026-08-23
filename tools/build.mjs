/** Bundler seçimi — taşınabilirlik için üç kademeli:
 *   1) esbuild (package.json devDependency; `npm install` sonrası yerelde bulunur)
 *   2) bun (PATH'te global bun varsa)
 *   3) hata: nasıl kurulacağını söyler
 *  Her iki yol da aynı çıktıyı üretir: dist/main.js (ESM, minified). */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

/* Parametreli build: varsayılan ana oyun; --entry/--out/--preview ile deneysel
   giriş noktaları (experiments/) aynı hattan derlenir. Ana oyun davranışı değişmez. */
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const ENTRY = arg('entry', 'src/main.ts');
const OUT_JS = arg('out', 'dist/main.js');
const PREVIEW = arg('preview', 'dist/preview.html');
const TITLE = arg('title', 'Mobile RPG — önizleme');
const EXTRA_MANIFEST = arg('manifest', null);

async function tryEsbuild() {
  let esbuild;
  for (const spec of ['esbuild', join(ROOT, 'node_modules', 'esbuild', 'lib', 'main.js')]) {
    try { esbuild = require(spec); break; } catch { /* sonraki */ }
  }
  if (!esbuild) return false;
  try {
    await esbuild.build({
      entryPoints: [join(ROOT, ENTRY)],
      outfile: join(ROOT, OUT_JS),
      bundle: true, format: 'esm', target: 'es2022', minify: true, loader: { '.json': 'json' },
      /* P2.0 — three@0.169.0 YEREL vendor dizininden gelir. npm bagimliligi ve
         runtime CDN YOKTUR; surum vendor/three/VENDOR.json ile sabittir. */
      alias: {
        three: join(ROOT, 'vendor/three/build/three.module.js'),
        'three/addons/loaders/GLTFLoader.js':
          join(ROOT, 'vendor/three/examples/jsm/loaders/GLTFLoader.js'),
        'three/addons/utils/SkeletonUtils.js':
          join(ROOT, 'vendor/three/examples/jsm/utils/SkeletonUtils.js'),
        'three/addons/utils/BufferGeometryUtils.js':
          join(ROOT, 'vendor/three/examples/jsm/utils/BufferGeometryUtils.js'),
      },
    });
  } catch (err) {
    /* Alias/çözümleme hatasi bir YAPILANDIRMA kusurudur; sessizce yedek
       bundler'a düşmek bayat ya da farkli bir çikti üretme riski tasir.
       Bu yüzden TAM hata basilir. */
    console.warn(`esbuild kullanilamadi:\n${err.message}\nbun deneniyor...`);
    return false;
  }
  console.log('bundle: esbuild');
  return true;
}

function tryBun() {
  const candidates = ['bun', join(process.env.HOME ?? '', '.bun', 'bin', 'bun')];
  for (const bin of candidates) {
    if (bin.includes('/') && !existsSync(bin)) continue;
    const r = spawnSync(bin, ['build', ENTRY, '--outfile', OUT_JS, '--target', 'browser', '--minify'],
      { cwd: ROOT, stdio: 'inherit' });
    if (r.status === 0) { console.log('bundle: bun'); return true; }
  }
  return false;
}

const ok = (await tryEsbuild()) || tryBun();
if (!ok) {
  console.error([
    'Bundler bulunamadı. Şunlardan biri gerekli:',
    '  • npm install            (esbuild devDependency olarak kurulur — önerilen)',
    '  • bun                    (https://bun.sh, PATH üzerinde)',
  ].join('\n'));
  process.exit(1);
}
const packArgs = [join(ROOT, 'tools', 'pack-preview.mjs'), '--js', OUT_JS, '--out', PREVIEW, '--title', TITLE];
if (EXTRA_MANIFEST) packArgs.push('--manifest', EXTRA_MANIFEST);
spawnSync(process.execPath, packArgs, { cwd: ROOT, stdio: 'inherit' });
