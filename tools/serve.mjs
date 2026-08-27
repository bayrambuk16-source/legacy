/** Statik geliştirme sunucusu — repo kökünü servis eder.
 *
 *  party-rpg gibi çok dosyalı deneyler `file://` ile açılamaz: ES module
 *  import'ları ve GLTF fetch'i CORS'a takılır. Bu sunucu o boşluğu doldurur.
 *  Build hattının yerine geçmez; yalnız geliştirme içindir.
 *
 *  Kullanım:  node tools/serve.mjs [port]
 *  Ardından:  http://localhost:<port>/experiments/party-rpg/index.html
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 8123;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
};

http.createServer((req, res) => {
  const yol = decodeURIComponent(req.url.split('?')[0]);
  /* Kök dışına çıkma denemesini engelle (../ ile) */
  const dosya = path.resolve(ROOT, '.' + yol);
  if (!dosya.startsWith(ROOT)) { res.writeHead(403).end('yasak'); return; }

  fs.stat(dosya, (e, st) => {
    if (e) { res.writeHead(404).end('bulunamadi'); return; }
    if (st.isDirectory()) {
      const idx = path.join(dosya, 'index.html');
      if (fs.existsSync(idx)) return gonder(idx, res);
      res.writeHead(404).end('dizin listesi kapali'); return;
    }
    gonder(dosya, res);
  });
}).listen(PORT, () => {
  console.log(`kok    : ${ROOT}`);
  console.log(`sunucu : http://localhost:${PORT}`);
  console.log(`party  : http://localhost:${PORT}/experiments/party-rpg/index.html`);
});

function gonder(dosya, res) {
  fs.readFile(dosya, (e, d) => {
    if (e) { res.writeHead(500).end('okunamadi'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(dosya).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(d);
  });
}
