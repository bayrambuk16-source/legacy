/** VENDOR BAĞLAMA — P2.0
 *
 *  `vendor/three` dizinini `node_modules/three` altına bağlar ki Node/tsx
 *  (headless testler) `import 'three'` ifadesini çözebilsin. Bu bir `npm
 *  install` DEĞİLDİR: ağ erişimi yoktur, yalnız yerel bir bağlantı kurulur —
 *  `file:` bağımlılığının yaptığı işin aynısı.
 *
 *  Tarayıcı bundle'ı bu bağlantıya İHTİYAÇ DUYMAZ; esbuild `alias` ile
 *  doğrudan vendor yolunu kullanır (bkz. tools/build.mjs). */
import { existsSync, mkdirSync, rmSync, symlinkSync, lstatSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(ROOT, 'vendor', 'three');
const LINK = join(ROOT, 'node_modules', 'three');

if (!existsSync(TARGET)) {
  console.error('vendor/three bulunamadı — tarball açılmamış.');
  process.exit(1);
}
mkdirSync(join(ROOT, 'node_modules'), { recursive: true });
try { if (lstatSync(LINK)) rmSync(LINK, { recursive: true, force: true }); } catch { /* yok */ }
symlinkSync(TARGET, LINK, 'junction');
console.log(`node_modules/three → vendor/three (three@0.169.0, yerel)`);
