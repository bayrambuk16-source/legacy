/** VENDOR BÜTÜNLÜK KAPISI — P2.0
 *  `vendor/three` içeriğinin VENDOR.json'daki sha256 değerleriyle aynı
 *  olduğunu doğrular. Sürüm sabitliğinin makine tarafından kontrol edilebilir
 *  kanıtıdır: dosya değişirse build kırmızı yanar. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'vendor', 'three');
const manifest = JSON.parse(readFileSync(join(DIR, 'VENDOR.json'), 'utf8'));

let bad = 0;
for (const [rel, meta] of Object.entries(manifest.files)) {
  const buf = readFileSync(join(DIR, rel));
  const sha = createHash('sha256').update(buf).digest('hex');
  const ok = sha === meta.sha256 && buf.length === meta.bytes;
  if (!ok) bad += 1;
  console.log(`${ok ? '✓' : '✗'} ${rel}  ${buf.length} bayt`);
}
console.log(`\nthree@${manifest.version} · ${Object.keys(manifest.files).length} dosya · `
  + (bad === 0 ? 'BÜTÜNLÜK TAMAM' : `${bad} DOSYA BOZUK`));
if (bad > 0) process.exit(1);
