/** GLB YÜKLEYİCİ ADAPTÖRÜ — P2.1
 *
 *  `three/addons/loaders/GLTFLoader.js` YEREL vendor paketinden gelir
 *  (`vendor/three/examples/jsm/...`). CDN / ağ bağımlılığı YOKTUR.
 *
 *  GLB'de **Draco / Meshopt / KTX2 YOK** (`extensionsRequired` boş), bu yüzden
 *  ek çözücü paketi bağlanmaz. `EXT_texture_webp` yalnız `extensionsUsed`
 *  içindedir ve gömülü JPEG fallback vardır.
 *
 *  ══════════════ `fetch` KULLANILMAZ — GERÇEK KUSURDAN ÖĞRENİLDİ ══════════════
 *
 *  İlk sürüm `GLTFLoader.load(url)` çağırıyordu. O yol Three'nin `FileLoader`
 *  sınıfına gider ve `FileLoader` **bir `Request` NESNESİ kurup** `fetch(req)`
 *  çağırır (three 0.169.0, `three.module.js` ~44415).
 *
 *  Önizleme HTML'i `fetch`'in araya girildiği bir görüntüleyicide açıldığında
 *  (istek `postMessage` ile ana pencereye iletiliyor) `Request` nesnesi
 *  **yapısal olarak klonlanamaz** ve yükleme şu hatayla düşer:
 *
 *      DataCloneError: Failed to execute 'postMessage' on 'Window':
 *      Request object could not be cloned.
 *
 *  Bu ortam `file://` ile açılan yerel testlerde GÖRÜNMÜYORDU. Çözüm, yükleme
 *  yolundan `fetch`'i TAMAMEN çıkarmaktır:
 *
 *    1. `data:` URI  → `atob` ile YERİNDE çözülür (ağ isteği YOK).
 *    2. diğer URL'ler → `XMLHttpRequest` (fetch'e dokunmaz, `Request` kurmaz).
 *    3. her iki durumda da `GLTFLoader.parse()` çağrılır — `FileLoader` DEVRE DIŞI.
 *
 *  Doku yolu da aynı sebeple sabitlenir: `GLTFParser`, `createImageBitmap`
 *  varsa `ImageBitmapLoader` (yine `fetch`) seçer. Kurucu sırasında bu global
 *  geçici olarak gizlenir; böylece `<img>` tabanlı `TextureLoader` kullanılır
 *  ve doku çözümü de ağ katmanına HİÇ dokunmaz. Yan etki olarak headless
 *  testler ile tarayıcı AYNI doku yolunu çalıştırır.
 *
 *  ══════════ `blob:` DE KULLANILMAZ — İKİNCİ GERÇEK KUSUR ══════════
 *
 *  Bu yetmedi. GLB dokusu `bufferView` içinde gömülüdür ve `GLTFLoader` onu
 *  şöyle çözer: `new Blob([...])` → `URL.createObjectURL(blob)` → `<img src=…>`.
 *  Aynı görüntüleyici `URL.createObjectURL`'i de sarmalayıp `blob-request://`
 *  şemasıyla kendi kanalına yönlendiriyor; `<img>` o şemayı yükleyemiyor:
 *
 *      THREE.GLTFLoader: Couldn't load texture blob-request://blob-…
 *
 *  Model geliyor ama DOKUSUZ (beyaz) görünüyordu. Çözüm `inlineGlbImages()`:
 *  GLB'nin JSON parçası çözümlemeden ÖNCE yeniden yazılır, `bufferView`
 *  tabanlı her görsel BIN parçasından çıkarılıp `data:` URI'sine dönüştürülür.
 *  Böylece `GLTFLoader` `uri` dalına girer — `Blob` de `createObjectURL` de
 *  HİÇ çağrılmaz. İkili veri (geometri/animasyon) DEĞİŞMEZ; yalnız JSON
 *  parçasındaki `images[]` kayıtları taşınır.
 *
 *  ══════════════ DÜĞÜM ADI SORUNU ══════════════
 *  Manifest kemikleri Mixamo adlarıyla verir: `mixamorig:Left_arch1`.
 *  glTF yükleyici düğüm adlarını `PropertyBinding.sanitizeNodeName` ile
 *  temizler ve iki nokta DÜŞER → `mixamorigLeft_arch1`. Bu yüzden kemik
 *  araması iki adımlıdır. Manifest verisi DEĞİŞTİRİLMEZ; yalnız arama
 *  sırasında aynı sanitize kuralı uygulanır. */
import { Object3D, PropertyBinding, SkinnedMesh, type AnimationClip, type Group } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

export interface LoadedGlb {
  scene: Group;
  clips: AnimationClip[];
  skinned: SkinnedMesh | null;
}

/** glTF yükleyicisinin uyguladığı adlandırma kuralı. */
export function sanitizedNodeName(name: string): string {
  return PropertyBinding.sanitizeNodeName(name);
}

/** Manifest adıyla düğüm arar: önce birebir, sonra sanitize edilmiş hâliyle. */
export function findNode(root: Object3D, manifestName: string): Object3D | null {
  return root.getObjectByName(manifestName)
    ?? root.getObjectByName(sanitizedNodeName(manifestName))
    ?? null;
}

function collect(gltf: GLTF): LoadedGlb {
  let skinned: SkinnedMesh | null = null;
  gltf.scene.traverse((o) => {
    const maybe = o as Object3D & { isSkinnedMesh?: boolean };
    if (maybe.isSkinnedMesh === true && skinned === null) skinned = o as SkinnedMesh;
  });
  return { scene: gltf.scene, clips: gltf.animations, skinned };
}

/* ───────────────────────── bayt kaynakları (fetch YOK) ───────────────────────── */

/** `data:...;base64,...` URI'sini ağ isteği OLMADAN çözer.
 *  Önizleme paketinde GLB tam olarak bu biçimde gömülüdür. */
export function decodeDataUri(url: string): ArrayBuffer | null {
  if (!url.startsWith('data:')) return null;
  const comma = url.indexOf(',');
  if (comma < 0) throw new Error('[P2.1] bozuk data URI: virgül yok');
  if (!url.slice(0, comma).includes(';base64')) {
    throw new Error('[P2.1] base64 olmayan data URI desteklenmiyor');
  }
  const bin = atob(url.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** `XMLHttpRequest` ile ikili indirir. `fetch` ÇAĞRILMAZ, `Request` KURULMAZ. */
function xhrArrayBuffer(url: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const Xhr = (globalThis as { XMLHttpRequest?: new () => XMLHttpRequest }).XMLHttpRequest;
    if (!Xhr) { reject(new Error('[P2.1] XMLHttpRequest yok; GLB yüklenemez')); return; }
    const xhr = new Xhr();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = (): void => {
      if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
        resolve(xhr.response as ArrayBuffer);
      } else {
        reject(new Error(`[P2.1] GLB indirilemedi (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = (): void => reject(new Error('[P2.1] GLB indirilemedi (ağ hatası)'));
    xhr.send();
  });
}

/** URL'i ham baytlara çevirir — hiçbir yolda `fetch` kullanılmaz. */
export function glbBytes(url: string): Promise<ArrayBuffer> {
  const inline = decodeDataUri(url);
  return inline ? Promise.resolve(inline) : xhrArrayBuffer(url);
}

/* ───────────────────── gömülü görselleri data URI'ye taşı ───────────────────── */

const GLB_MAGIC = 0x46546c67;          // 'glTF'
const CHUNK_JSON = 0x4e4f534a;         // 'JSON'
const CHUNK_BIN = 0x004e4942;          // 'BIN\0'

/** Büyük diziyi yığın taşırmadan base64'e çevirir. */
function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode(...bytes.subarray(i, Math.min(i + step, bytes.length)));
  }
  return btoa(bin);
}

interface GlbJson {
  images?: Array<{ bufferView?: number; mimeType?: string; uri?: string }>;
  bufferViews?: Array<{ buffer: number; byteOffset?: number; byteLength: number }>;
}

/** İstatistik — telemetri ve testler için. */
export interface InlineImagesResult {
  data: ArrayBuffer;
  /** Kaç görsel `bufferView` → `data:` URI'sine taşındı. */
  inlined: number;
}

/** GLB'nin JSON parçasını yeniden yazar: `bufferView` tabanlı her görsel
 *  `data:` URI'sine taşınır. İKİLİ VERİ (geometri/iskelet/animasyon)
 *  DEĞİŞTİRİLMEZ — BIN parçası bit-bit aynen kopyalanır. */
export function inlineGlbImages(data: ArrayBuffer): InlineImagesResult {
  const dv = new DataView(data);
  if (data.byteLength < 20 || dv.getUint32(0, true) !== GLB_MAGIC) {
    return { data, inlined: 0 };                       // GLB değil → dokunma
  }
  let offset = 12;
  let json: GlbJson | null = null;
  let bin: Uint8Array | null = null;
  while (offset + 8 <= data.byteLength) {
    const len = dv.getUint32(offset, true);
    const type = dv.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + len > data.byteLength) break;
    if (type === CHUNK_JSON) {
      json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, start, len))) as GlbJson;
    } else if (type === CHUNK_BIN) {
      bin = new Uint8Array(data, start, len);
    }
    offset = start + len;
  }
  if (!json || !bin || !Array.isArray(json.images) || !json.bufferViews) {
    return { data, inlined: 0 };
  }

  let inlined = 0;
  for (const img of json.images) {
    if (img.bufferView === undefined) continue;
    const bv = json.bufferViews[img.bufferView];
    if (!bv || bv.buffer !== 0) continue;              // dış tampon → dokunma
    const from = bv.byteOffset ?? 0;
    const bytes = bin.subarray(from, from + bv.byteLength);
    img.uri = `data:${img.mimeType ?? 'image/png'};base64,${toBase64(bytes)}`;
    delete img.bufferView;
    delete img.mimeType;                               // `uri` varken gereksiz
    inlined += 1;
  }
  if (inlined === 0) return { data, inlined: 0 };

  /* GLB'yi yeniden kur: yeni JSON parçası + AYNI BIN parçası. */
  const enc = new TextEncoder();
  let jsonBytes = enc.encode(JSON.stringify(json));
  const pad = (4 - (jsonBytes.length % 4)) % 4;
  if (pad > 0) {
    const padded = new Uint8Array(jsonBytes.length + pad);
    padded.set(jsonBytes);
    padded.fill(0x20, jsonBytes.length);               // boşlukla hizala
    jsonBytes = padded;
  }
  const total = 12 + 8 + jsonBytes.length + 8 + bin.length;
  const out = new Uint8Array(total);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, GLB_MAGIC, true);
  odv.setUint32(4, 2, true);
  odv.setUint32(8, total, true);
  odv.setUint32(12, jsonBytes.length, true);
  odv.setUint32(16, CHUNK_JSON, true);
  out.set(jsonBytes, 20);
  const binStart = 20 + jsonBytes.length;
  odv.setUint32(binStart, bin.length, true);
  odv.setUint32(binStart + 4, CHUNK_BIN, true);
  out.set(bin, binStart + 8);
  return { data: out.buffer, inlined };
}

/* ───────────────────────── çözümleme ───────────────────────── */

/** Bellekteki bir ArrayBuffer'ı çözer.
 *
 *  `GLTFParser` kurucusu doku yükleyicisini `createImageBitmap` globaline
 *  BAKARAK seçer. `ImageBitmapLoader` yolu `fetch` kullandığı için bu global
 *  kurucu boyunca gizlenir ve `<img>` tabanlı `TextureLoader` seçtirilir.
 *  Global, `parse()` senkron olarak döndüğü anda eski hâline getirilir. */
export function parseGlb(data: ArrayBuffer): Promise<LoadedGlb> {
  /* Gömülü görselleri `data:` URI'sine taşı → `Blob`/`createObjectURL` YOK. */
  const prepared = inlineGlbImages(data).data;
  const g = globalThis as { createImageBitmap?: unknown };
  const had = 'createImageBitmap' in g;
  const saved = g.createImageBitmap;
  try {
    g.createImageBitmap = undefined;              // → TextureLoader (<img>) yolu
    return new Promise((resolve, reject) => {
      new GLTFLoader().parse(prepared, '', (gltf) => resolve(collect(gltf)), reject);
    });
  } finally {
    if (had) g.createImageBitmap = saved;
    else delete g.createImageBitmap;
  }
}

/** URL'den (veya önizleme paketindeki data URI'dan) yükler.
 *  `GLTFLoader.load()` KULLANILMAZ — bkz. dosya başlığındaki `fetch` notu. */
export async function loadGlb(url: string): Promise<LoadedGlb> {
  return parseGlb(await glbBytes(url));
}
