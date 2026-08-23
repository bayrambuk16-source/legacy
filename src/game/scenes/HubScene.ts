/** Hub (Avcı Kampı): bölge seçimi → sefere çıkış; envanter özeti.
 *  Combat'tan dönüşte durum (seviye/coin/çanta) korunur. */
import type { DrawApi, GameHost, PointerEventInfo, Scene } from '../../engine/types.js';
import { DisposerBag } from '../../engine/dispose.js';
import { Content, type GameZone } from '../data/GameContentRepository.js';
import { GameState } from '../state.js';
import { drawBar, drawBottomNav, inRect, navHit } from '../ui/hud.js';

interface ZoneCard { zone: GameZone; x: number; y: number; w: number; h: number }

export class HubScene implements Scene {
  readonly key = 'hub';
  private bag = new DisposerBag();
  private cards: ZoneCard[] = [];
  private selected: GameZone | null = null;
  private goBtn = { x: 60, y: 880, w: 500, h: 66 };
  private shopBtn = { x: 60, y: 806, w: 240, h: 58 };
  private skillsBtn = { x: 320, y: 806, w: 240, h: 58 };

  constructor(private host: GameHost) {}

  enter(): void {
    const zones = Content.combatZones();
    const w = 520, h = 116, x = 50;
    this.cards = zones.map((zone, i) => ({ zone, x, y: 330 + i * (h + 22), w, h }));
    this.selected = this.cards.find((c) => c.zone.id === GameState.currentZoneId)?.zone ?? null;
    this.bag.add(this.host.input.onDown((p) => this.tap(p)));
  }

  exit(): void { this.bag.disposeAll(); }

  private tap(p: PointerEventInfo): void {
    const nav = navHit(p, this.host.draw);
    if (nav !== null && nav !== this.key) {
      GameState.autosave();
      this.host.audio.play('ui');
      this.host.goTo(nav);
      return;
    }
    for (const c of this.cards) {
      if (inRect(p, c)) {
        this.selected = c.zone;
        GameState.currentZoneId = c.zone.id;
        this.host.audio.play('ui');
        return;
      }
    }
    if (inRect(p, this.shopBtn)) {
      GameState.autosave(); this.host.audio.play('ui'); this.host.goTo('merchant'); return;
    }
    if (inRect(p, this.skillsBtn)) {
      GameState.autosave(); this.host.audio.play('ui'); this.host.goTo('skills'); return;
    }
    if (this.selected && inRect(p, this.goBtn)) {
      GameState.currentZoneId = this.selected.id;
      GameState.autosave();
      this.host.audio.play('ui');
      this.host.goTo('combat');
    }
  }

  update(dt: number): void {
    GameState.player.update(dt); // kampta canlar dolar
  }

  render(g: DrawApi): void {
    g.clear('#181410');
    const hub = Content.hub();
    const p = GameState.player;

    g.text(hub.displayName, g.width / 2, 64, { align: 'center', size: 30, bold: true, color: '#e8d9a0' });
    if (this.host.assets.has('pr_okcu')) {
      g.image('pr_okcu', 96, 160, { w: 88, h: 88, originX: 0.5, originY: 0.5 });
    }
    g.text(`Sv ${p.level} Okçu`, 160, 132, { size: 19, bold: true, color: '#e8e0d0' });
    drawBar(g, 160, 150, 240, 13, p.hp / p.maxHp, '#7fa85c', '#241c14');
    drawBar(g, 160, 170, 240, 10, p.mp / p.maxMp, '#6f8fd0', '#1a1f2c');
    drawBar(g, 160, 188, 240, 6, p.expProgress(), '#9b7cc4', '#221c2a');
    if (this.host.assets.has('hud_coin')) g.image('hud_coin', 430, 150, { w: 22, h: 22 });
    g.text(String(p.coins), 460, 161, { size: 16, color: '#e8d9a0' });
    g.text(`Çanta: ${GameState.inventory.totalItems} eşya`, 160, 216, { size: 14, color: '#8d8272' });

    g.text('Sefer bölgeleri:', 50, 300, { size: 18, color: '#cfc7b6' });
    for (const c of this.cards) {
      const sel = this.selected === c.zone;
      g.rect(c.x, c.y, c.w, c.h, sel ? '#2c2417' : '#221c14');
      g.rect(c.x, c.y, 6, c.h, sel ? '#e08a3c' : '#4a3f30');
      g.text(c.zone.displayName, c.x + 26, c.y + 32, { size: 22, bold: true, color: '#e8e0d0' });
      const uniq = new Set(c.zone.spawns.map((s) => s.monsterSourceRef)).size;
      g.text(`${uniq} yaratık türü · ${c.zone.spawns.length} spawn noktası`, c.x + 26, c.y + 62, { size: 15, color: '#8d8272' });
      const lv = c.zone.spawns.map((s) => Content.monster(s.monsterSourceRef)?.level ?? 0).filter((v) => v > 0);
      if (lv.length) g.text(`önerilen seviye ${Math.min(...lv)}-${Math.max(...lv)}`, c.x + 26, c.y + 90, { size: 14, color: '#7fa85c' });
    }

    // envanter özeti (ilk 4 kalem)
    const inv = GameState.inventory.list().slice(0, 4);
    if (inv.length > 0) {
      g.text('Son ganimetler:', 50, 640, { size: 16, color: '#cfc7b6' });
      inv.forEach((e, i) => {
        const y = 670 + i * 28;
        g.text(`${e.item?.displayName ?? `#${e.entry.itemRef}`}`, 70, y, { size: 14, color: '#e8e0d0' });
        g.text(`×${e.entry.count}`, 500, y, { size: 14, color: '#8d8272' });
      });
    }

    // kamp hizmetleri
    for (const [btn, label] of [[this.shopBtn, 'Tüccar'], [this.skillsBtn, 'Yetenekler']] as const) {
      g.rect(btn.x, btn.y, btn.w, btn.h, '#221c14');
      g.rect(btn.x, btn.y, btn.w, 2, '#4a3f30');
      g.text(label, btn.x + btn.w / 2, btn.y + btn.h / 2, { align: 'center', size: 17, bold: true, color: '#cfc7b6' });
    }

    if (this.selected) {
      g.rect(this.goBtn.x, this.goBtn.y, this.goBtn.w, this.goBtn.h, '#2c2417');
      g.rect(this.goBtn.x, this.goBtn.y, this.goBtn.w, 3, '#e08a3c');
      g.text(`${this.selected.displayName} — Sefere Çık`, g.width / 2, this.goBtn.y + 34, { align: 'center', size: 20, bold: true, color: '#e8d9a0' });
    }

    drawBottomNav(g, this.host, this.key);
  }
}
