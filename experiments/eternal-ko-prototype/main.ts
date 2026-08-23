/** EXPERIMENT P1/P2 giriş noktası — ana oyundan TAMAMEN ayrı bundle.
 *  `src/main.ts` değiştirilmemiştir; ana preview davranışı aynıdır.
 *
 *  ══════════ P2.0 — İKİ KATMANLI SUNUM (§21) ══════════
 *
 *      [arka]  Three.js canvas   →  DÜNYA katmanı (zemin, oyuncu, mob, ok, ganimet)
 *      [ön]    mevcut 2D canvas  →  HUD overlay (joystick, butonlar, paneller)
 *
 *  HUD Three'ye TAŞINMADI. 2D katman 3D açıkken ŞEFFAF temizlenir; kapalıyken
 *  P1.8'deki gibi dünyayı kendisi çizer. WebGL yoksa 3D katman hiç kurulmaz ve
 *  oyun eskisi gibi çalışmaya devam eder. */
import { CanvasGame } from '../../src/engine/canvas.js';
import { ASSET_MANIFEST, assetSrc } from '../../src/game/data/assets-manifest.js';
import { PROTO_ASSETS } from './data/proto-assets.js';
import type { FoliageKind } from './data/moradon-foliage.js';
import { WorldPrototypeScene } from './scenes/WorldPrototypeScene.js';
import { PROTO } from './config.js';

const mount = document.getElementById('game');
if (!mount) throw new Error('#game elementi yok');

/* ── 3D katman canvas'ı: 2D canvas'tan ÖNCE eklenir (arkada kalsın) ── */
const glCanvas = document.createElement('canvas');
glCanvas.width = PROTO.screenW;
glCanvas.height = PROTO.screenH;
glCanvas.style.position = 'absolute';
glCanvas.style.pointerEvents = 'none';       // girdi DAİMA 2D katmanda
mount.appendChild(glCanvas);

const game = new CanvasGame(mount);
const scene = new WorldPrototypeScene(game);
game.register(scene);

/* 2D canvas mount'a CanvasGame tarafından eklendi; konumlandırmayı eşitle. */
const canvases = mount.querySelectorAll('canvas');
const uiCanvas = canvases[canvases.length - 1] as HTMLCanvasElement;
uiCanvas.style.position = 'absolute';

/** İki katmanı AYNI letterbox kutusuna oturtur (§22). */
function fitLayers(): void {
  const scale = Math.min(mount!.clientWidth / PROTO.screenW, mount!.clientHeight / PROTO.screenH);
  const w = Math.floor(PROTO.screenW * scale);
  const h = Math.floor(PROTO.screenH * scale);
  const left = Math.floor((mount!.clientWidth - w) / 2);
  const top = Math.floor((mount!.clientHeight - h) / 2);
  for (const c of [glCanvas, uiCanvas]) {
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    c.style.left = `${left}px`;
    c.style.top = `${top}px`;
  }
}
fitLayers();
window.addEventListener('resize', fitLayers);

/** Three katmanını kurar. WebGL yoksa SESSİZCE atlanır — oyun 2D devam eder. */
async function attachThree(): Promise<void> {
  try {
    const mod = await import('./render3d/ThreeWorldRenderer.js');
    const renderer = new mod.ThreeWorldRenderer(glCanvas, PROTO.screenW, PROTO.screenH);
    scene.attachThree(renderer, uiCanvas.getContext('2d'));
    window.addEventListener('resize', () => renderer.resize(PROTO.screenW, PROTO.screenH));

    /* ══ P2.1 — GERÇEK ARCHER MODELİ ══
       Yükleme BAŞARISIZ olursa oyun DURMAZ: P2.0 primitive fallback'i devrede
       kalır. Model gameplay'i etkilemediği için bu tamamen görsel bir kayıptır. */
    try {
      const [{ loadGlb }, { modelSrc }] = await Promise.all([
        import('./render3d/GlbLoader.js'),
        import('./data/proto-assets.js'),
      ]);
      const url = modelSrc('archer_glb');
      if (url) renderer.attachArcher(await loadGlb(url));
    } catch (err) {
      console.warn('[P2.1] Archer GLB yüklenemedi, primitive fallback:',
        err instanceof Error ? err.message : err);
    }

    /* ══ P2.2 — GERÇEK MUTANT MOB MODELİ ══
       Bağımsız `try`: mutant yüklenemezse Archer bozulmaz, moblar P2.0
       silindir fallback'iyle çizilmeye devam eder. */
    try {
      const [{ loadGlb }, { modelSrc }] = await Promise.all([
        import('./render3d/GlbLoader.js'),
        import('./data/proto-assets.js'),
      ]);
      const url = modelSrc('mutant_glb');
      if (url) renderer.attachMutant(await loadGlb(url));
    } catch (err) {
      console.warn('[P2.2] Mutant GLB yüklenemedi, silindir fallback:',
        err instanceof Error ? err.message : err);
    }

    /* ══ P2.4 — GERÇEK OK MODELİ ══
       Bağımsız `try`: ok yüklenemezse P2.3 primitive silüeti devrede kalır. */
    try {
      const [{ loadGlb }, { modelSrc }] = await Promise.all([
        import('./render3d/GlbLoader.js'),
        import('./data/proto-assets.js'),
      ]);
      const url = modelSrc('arrow_glb');
      if (url) renderer.attachArrow(await loadGlb(url));
    } catch (err) {
      console.warn('[P2.4] Ok GLB yüklenemedi, primitive silüet:',
        err instanceof Error ? err.message : err);
    }
    /* ══ P2.28 — GOBLIN MOB MODELİ (zayıf moblar) ══
       Bağımsız `try`: yüklenemezse bütün moblar mutant modeline
       düşer ve oyun çalışmaya devam eder. */
    try {
      const [{ loadGlb }, { modelSrc }] = await Promise.all([
        import('./render3d/GlbLoader.js'),
        import('./data/proto-assets.js'),
      ]);
      const url = modelSrc('kecoon_glb');
      if (url) renderer.attachKecoon(await loadGlb(url));
    } catch (err) {
      console.warn('[P2.28] Goblin GLB yüklenemedi, mutant modeli:',
        err instanceof Error ? err.message : err);
    }

    /* ══ P2.11 — ZEMİN DOKUSU ══
       Görsel ön-yükleyici bu anahtarı zaten indirdi; burada yalnız
       materyale bağlanır. Doku yoksa düz renk devrede kalır. */
    try {
      const { GROUND_TEXTURE_KEY } = await import('./data/proto-assets.js');
      const img = game.assets.images.get(GROUND_TEXTURE_KEY);
      if (img) renderer.applyGroundTexture(img);
    } catch (err) {
      console.warn('[P2.11] Zemin dokusu uygulanamadı:',
        err instanceof Error ? err.message : err);
    }

    /* ══ P2.11 — BİTKİ ÖRTÜSÜ ══
       Bağımsız `try`: bitkiler yüklenemezse harita çıplak kalır ama oyun
       çalışmaya devam eder. Bitkiler DEKORDUR, gameplay'e girmezler. */
    try {
      const [{ loadGlb }, { modelSrc }, { FOLIAGE_MODEL_KEY, buildFoliage }] = await Promise.all([
        import('./render3d/GlbLoader.js'),
        import('./data/proto-assets.js'),
        import('./data/moradon-foliage.js'),
      ]);
      const items = buildFoliage();
      /* Anahtar tipi `FoliageKind` olarak KORUNUR: `string` yaparsak
         `FOLIAGE_MODEL_KEY[kind]` indekslemesi tip güvenliğini kaybeder. */
      const byKind = new Map<FoliageKind, typeof items>();
      for (const it of items) {
        const list = byKind.get(it.kind) ?? [];
        list.push(it);
        byKind.set(it.kind, list);
      }
      /* Türler SIRAYLA yüklenir: hepsini paralel çekmek mobilde ağ ve
         bellek tepesi yaratıyor. Biri düşerse diğerleri devam eder. */
      for (const [kind, list] of byKind) {
        try {
          const url = modelSrc(FOLIAGE_MODEL_KEY[kind]);
          if (url) renderer.attachFoliage(kind, await loadGlb(url), list);
        } catch (e) {
          console.warn(`[P2.11] ${kind} yüklenemedi:`, e instanceof Error ? e.message : e);
        }
      }
    } catch (err) {
      console.warn('[P2.11] Bitki örtüsü kurulamadı, harita çıplak:',
        err instanceof Error ? err.message : err);
    }
  } catch (err) {
    console.warn('[P2.0] Three katmanı kurulamadı, 2D devam ediyor:',
      err instanceof Error ? err.message : err);
    glCanvas.remove();
  }
}

/** Prototip varlıkları: ana manifest + prototipe özel 8 yönlü okçu sayfaları. */
const keys = [...Object.keys(ASSET_MANIFEST), ...Object.keys(PROTO_ASSETS)];
const srcOf = (k: string): string => assetSrc(k) || PROTO_ASSETS[k] || '';

/* P2.15 — VARSA KAYDI YÜKLE.
   Sahne başlamadan ÖNCE yüklenir: seviye/ekipman ilk kareden itibaren
   doğru olsun, oyuncu bir an Sv1 görüp sonra sıçramasın.
   Kayıt yoksa ya da bozuksa sessizce yeni oyun başlar. */
try {
  if (scene.state.loadSaved()) console.info('[P2.15] Kayıt yüklendi.');
} catch (err) {
  console.warn('[P2.15] Kayıt yüklenemedi, yeni oyun:',
    err instanceof Error ? err.message : err);
}

/* Sekme kapanırken son durumu yaz — 20 sn'lik otomatik kayıt aralığında
   kaybolan ilerleme olmasın. */
window.addEventListener('pagehide', () => { scene.state.saveNow(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') scene.state.saveNow();
});

void Promise.all(keys.map((k) => game.assets.loadImage(k, srcOf(k)).catch(() => undefined)))
  .then(() => attachThree())
  .then(() => game.start(scene.key));
