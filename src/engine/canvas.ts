/** Canvas 2D implementasyonu. Dikey (portrait) mantıksal alan: 620×1100.
 *  Cihaz ekranına aspect korunarak letterbox ile oturur; dokunma koordinatları
 *  mantıksal alana çevrilir. */

import type { AssetStore, AudioApi, DrawApi, FxApi, GameHost, InputApi, PointerEventInfo, Scene } from './types.js';
import { CanvasFx } from './fx.js';
import { WebAudio } from './audio.js';

export const LOGICAL_W = 620;
export const LOGICAL_H = 1100;

class CanvasDraw implements DrawApi {
  readonly width = LOGICAL_W;
  readonly height = LOGICAL_H;
  constructor(private ctx: CanvasRenderingContext2D, private images: Map<string, HTMLImageElement>) {}

  clear(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
  rect(x: number, y: number, w: number, h: number, color: string, alpha = 1): void {
    const c = this.ctx;
    c.globalAlpha = alpha; c.fillStyle = color; c.fillRect(x, y, w, h); c.globalAlpha = 1;
  }
  circle(x: number, y: number, r: number, color: string, alpha = 1): void {
    const c = this.ctx;
    c.globalAlpha = alpha; c.fillStyle = color;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
  }
  image(key: string, x: number, y: number, opts: NonNullable<Parameters<DrawApi['image']>[3]> = {}): void {
    const img = this.images.get(key);
    if (!img) return; // eksik asset oyunu dusurmez (PDF hata kurali)
    const c = this.ctx;
    const sx = opts.sx ?? 0, sy = opts.sy ?? 0;
    const sw = opts.sw ?? img.naturalWidth, sh = opts.sh ?? img.naturalHeight;
    const w = opts.w ?? sw, h = opts.h ?? sh;
    const ox = (opts.originX ?? 0) * w, oy = (opts.originY ?? 0) * h;
    c.globalAlpha = opts.alpha ?? 1;
    if (opts.flipX) {
      c.save(); c.translate(x, 0); c.scale(-1, 1);
      c.drawImage(img, sx, sy, sw, sh, -w + ox, y - oy, w, h);
      c.restore();
    } else {
      c.drawImage(img, sx, sy, sw, sh, x - ox, y - oy, w, h);
    }
    c.globalAlpha = 1;
  }
  text(str: string, x: number, y: number, opts: NonNullable<Parameters<DrawApi['text']>[3]> = {}): void {
    const c = this.ctx;
    c.globalAlpha = opts.alpha ?? 1;
    c.fillStyle = opts.color ?? '#e8e0d0';
    c.font = `${opts.bold ? 'bold ' : ''}${opts.size ?? 16}px system-ui, sans-serif`;
    c.textAlign = opts.align ?? 'left';
    c.textBaseline = 'middle';
    c.fillText(str, x, y);
    c.globalAlpha = 1;
  }
}

class CanvasAssets implements AssetStore {
  readonly images = new Map<string, HTMLImageElement>();
  loadImage(key: string, src: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.images.set(key, img); resolve(); };
      img.onerror = () => { console.warn(`[assets] yüklenemedi: ${key}`); resolve(); };
      img.src = src;
    });
  }
  has(key: string): boolean { return this.images.has(key); }
  size(key: string): { w: number; h: number } | null {
    const i = this.images.get(key);
    return i ? { w: i.naturalWidth, h: i.naturalHeight } : null;
  }
}

class CanvasInput implements InputApi {
  private downCbs: Array<(p: PointerEventInfo) => void> = [];
  private upCbs: Array<(p: PointerEventInfo) => void> = [];
  private moveCbs: Array<(p: PointerEventInfo) => void> = [];

  constructor(private canvas: HTMLCanvasElement) {
    const toLogical = (e: PointerEvent): PointerEventInfo => {
      const r = this.canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * LOGICAL_W,
        y: ((e.clientY - r.top) / r.height) * LOGICAL_H,
        id: e.pointerId,
      };
    };
    canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); this.downCbs.forEach((f) => f(toLogical(e))); });
    canvas.addEventListener('pointerup', (e) => this.upCbs.forEach((f) => f(toLogical(e))));
    canvas.addEventListener('pointermove', (e) => this.moveCbs.forEach((f) => f(toLogical(e))));
  }
  onDown(cb: (p: PointerEventInfo) => void): () => void { this.downCbs.push(cb); return () => { this.downCbs = this.downCbs.filter((f) => f !== cb); }; }
  onUp(cb: (p: PointerEventInfo) => void): () => void { this.upCbs.push(cb); return () => { this.upCbs = this.upCbs.filter((f) => f !== cb); }; }
  onMove(cb: (p: PointerEventInfo) => void): () => void { this.moveCbs.push(cb); return () => { this.moveCbs = this.moveCbs.filter((f) => f !== cb); }; }
}

export class CanvasGame implements GameHost {
  readonly draw: DrawApi;
  readonly input: InputApi;
  readonly assets: CanvasAssets;
  readonly fx: FxApi = new CanvasFx();
  readonly audio: AudioApi = new WebAudio();
  private scenes = new Map<string, Scene>();
  private current: Scene | null = null;
  private last = 0;
  private canvas: HTMLCanvasElement;

  constructor(mount: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = LOGICAL_W;
    this.canvas.height = LOGICAL_H;
    this.canvas.style.touchAction = 'none';
    mount.appendChild(this.canvas);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context alınamadı');
    ctx.imageSmoothingQuality = 'high';
    this.assets = new CanvasAssets();
    this.draw = new CanvasDraw(ctx, this.assets.images);
    this.input = new CanvasInput(this.canvas);
    this.fit(mount);
    window.addEventListener('resize', () => this.fit(mount));
  }

  /** Letterbox: aspect koruyarak ekranı doldur, safe-area payı CSS'te. */
  private fit(mount: HTMLElement): void {
    const vw = mount.clientWidth, vh = mount.clientHeight;
    const scale = Math.min(vw / LOGICAL_W, vh / LOGICAL_H);
    this.canvas.style.width = `${Math.floor(LOGICAL_W * scale)}px`;
    this.canvas.style.height = `${Math.floor(LOGICAL_H * scale)}px`;
  }

  register(scene: Scene): void { this.scenes.set(scene.key, scene); }

  goTo(key: string): void {
    const next = this.scenes.get(key);
    if (!next) { console.error(`[scene] bulunamadı: ${key}`); return; }
    this.current?.exit?.();
    this.fx.clear();
    this.current = next;
    next.enter?.();
  }

  start(firstScene: string): void {
    this.goTo(firstScene);
    const loop = (t: number): void => {
      const dt = Math.min(0.05, (t - this.last) / 1000); // tab dönüşünde dev dt engeli
      this.last = t;
      if (this.current) {
        this.current.update(dt);
        this.fx.update(dt);
        this.current.render(this.draw);
        this.fx.render(this.draw);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame((t) => { this.last = t; requestAnimationFrame(loop); });
  }
}
