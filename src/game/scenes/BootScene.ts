/** Açılış: varlıkları yükler, içerik deposunu doğrular, Hub'a geçer. */
import type { DrawApi, GameHost, Scene } from '../../engine/types.js';
import { DisposerBag } from '../../engine/dispose.js';
import { ASSET_MANIFEST, assetSrc } from '../data/assets-manifest.js';
import { Content } from '../data/GameContentRepository.js';
import { GameState } from '../state.js';

export class BootScene implements Scene {
  readonly key = 'boot';
  private bag = new DisposerBag();
  private progress = 0;
  private done = false;
  private startShown = false;
  private loadStarted = false;

  constructor(private host: GameHost) {}

  enter(): void {
    if (!this.loadStarted) {
      this.loadStarted = true;
      const keys = Object.keys(ASSET_MANIFEST);
      let loaded = 0;
      keys.forEach((k) => {
        void this.host.assets.loadImage(k, assetSrc(k)).then(() => {
          loaded += 1;
          this.progress = loaded / keys.length;
          if (loaded === keys.length) this.done = true;
        });
      });
    } else if (this.progress >= 1) {
      this.done = true;
    }
    this.bag.add(this.host.input.onDown(() => {
      if (this.done && this.startShown) {
        GameState.loadOrNew();
        this.host.goTo('hub');
      }
    }));
  }

  exit(): void { this.bag.disposeAll(); }

  update(_dt: number): void {
    if (this.done) this.startShown = true;
  }

  render(g: DrawApi): void {
    g.clear('#14100c');
    if (this.host.assets.has('acilis')) {
      const s = this.host.assets.size('acilis')!;
      const scale = Math.min(g.width / s.w, g.height / s.h);
      g.image('acilis', (g.width - s.w * scale) / 2, (g.height - s.h * scale) / 2, { w: s.w * scale, h: s.h * scale });
    }
    const cy = g.height - 150;
    if (!this.done) {
      g.rect(g.width * 0.2, cy, g.width * 0.6, 10, '#3a3128');
      g.rect(g.width * 0.2, cy, g.width * 0.6 * this.progress, 10, '#7fa85c');
      g.text('Yükleniyor...', g.width / 2, cy + 34, { align: 'center', size: 18, color: '#cfc7b6' });
    } else {
      g.text('BAŞLA', g.width / 2, cy + 10, { align: 'center', size: 34, bold: true, color: '#e8d9a0' });
      g.text(`içerik: ${Content.monsters.length} yaratık · ${Content.items.length} eşya · ${Content.zones.length} bölge`,
        g.width / 2, cy + 48, { align: 'center', size: 14, color: '#8d8272' });
    }
  }
}
