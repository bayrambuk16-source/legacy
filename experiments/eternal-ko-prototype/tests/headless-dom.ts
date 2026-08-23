/** HEADLESS GÖRÜNTÜ ŞİMİ — P2.1 (YALNIZ TEST/TELEMETRİ)
 *
 *  ══════════════ NEDEN GEREKLİ ══════════════
 *  `GLTFLoader` gömülü dokuyu çözerken tarayıcı `Image` nesnesini kullanır
 *  (`EXT_texture_webp` destek yoklaması + `ImageLoader`). Node'da `Image`,
 *  `document` ve `self` yoktur; bu yüzden GLB **çözülemez**.
 *
 *  Şim yalnız DOKU DECODE yolunu kapatır. Geometri, iskelet, inverse-bind
 *  matrisleri, 17 animasyon klibi ve socket kemikleri GERÇEKTİR ve gerçek
 *  `GLTFLoader` koduyla çözülür. Bu yüzden testler sahte nesne değil, GERÇEK
 *  varlığı ölçer.
 *
 *  ══════════════ WEBGL GEREKTİRMEZ ══════════════
 *  Burada hiçbir GL bağlamı, hiçbir GPU kaynağı yoktur. Şim sahte bir
 *  `WebGLRenderer` KURMAZ; `ThreeWorldRenderer` testlerde canvas'sız
 *  çalışmaya devam eder (P2.0 §25).
 *
 *  ══════════════ ÜRÜN KODUNDA KULLANILMAZ ══════════════
 *  Bu dosya tarayıcı bundle'ına GİRMEZ: yalnız `tests/` ve `tools/` içinden
 *  çağrılır. */

interface ShimGlobals {
  self?: unknown;
  Image?: unknown;
  document?: unknown;
}

/** Yüklenmiş gibi davranan en küçük görüntü nesnesi. */
class HeadlessImage {
  width = 512;
  height = 512;
  onload: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  private listeners: Array<[string, (e: unknown) => void]> = [];
  private value = '';

  addEventListener(type: string, fn: (e: unknown) => void): void {
    this.listeners.push([type, fn]);
  }
  removeEventListener(type: string, fn: (e: unknown) => void): void {
    this.listeners = this.listeners.filter(([t, f]) => !(t === type && f === fn));
  }
  set src(v: string) {
    this.value = v;
    /* Yükleme BAŞARILI kabul edilir; piksel verisi hiçbir yerde kullanılmaz. */
    setTimeout(() => {
      this.onload?.call(this, {});
      for (const [t, fn] of [...this.listeners]) if (t === 'load') fn.call(this, {});
    }, 0);
  }
  get src(): string { return this.value; }
}

let installed = false;

/** Şimi bir kez kurar. Tarayıcıda çağrılırsa HİÇBİR ŞEY YAPMAZ. */
export function installHeadlessImageShim(): void {
  const g = globalThis as ShimGlobals;
  if (installed || typeof (g as { window?: unknown }).window !== 'undefined') return;
  if (g.self === undefined) g.self = globalThis;
  if (g.Image === undefined) g.Image = HeadlessImage;
  if (g.document === undefined) {
    g.document = { createElementNS: (): HeadlessImage => new HeadlessImage() };
  }
  installed = true;
}
