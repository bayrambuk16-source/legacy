/** Yetenekler ekranı — tek ekran, scroll yok.
 *  Kilit/atama kuralları SkillCatalog + SkillLoadout'ta; Scene kural KOPYALAMAZ. */
import type { DrawApi, GameHost, PointerEventInfo, Scene } from '../../engine/types.js';
import { DisposerBag } from '../../engine/dispose.js';
import { GameState } from '../state.js';
import { assignSkill, skillCatalog, type SkillCatalogEntry } from '../systems/SkillCatalog.js';
import { drawBottomNav, inRect, navHit, NAV_H } from '../ui/hud.js';

const SLOT_Y = 150, SLOT_W = 176, SLOT_H = 96;
const POOL_Y = 330, POOL_ROW_H = 78;
const INFO_Y = 1100 - NAV_H - 150;

export class SkillsScene implements Scene {
  readonly key = 'skills';
  private bag = new DisposerBag();
  private activeSlot = 0;
  private selectedRef: number | null = null;
  private notice = '';
  private noticeTimer = 0;

  constructor(private host: GameHost) {}

  enter(): void {
    this.activeSlot = 0; this.selectedRef = null;
    this.bag.add(this.host.input.onDown((p) => this.tap(p)));
  }
  exit(): void { this.bag.disposeAll(); }

  private say(m: string): void { this.notice = m; this.noticeTimer = 2.4; }
  private catalog(): SkillCatalogEntry[] {
    return skillCatalog('archer', GameState.player.level, GameState.skills);
  }
  private slotRect(i: number): { x: number; y: number; w: number; h: number } {
    return { x: 24 + i * (SLOT_W + 16), y: SLOT_Y, w: SLOT_W, h: SLOT_H };
  }
  private poolRect(i: number): { x: number; y: number; w: number; h: number } {
    return { x: 24, y: POOL_Y + i * POOL_ROW_H, w: 572, h: POOL_ROW_H - 8 };
  }
  private actionRects(): Array<{ id: string; x: number; y: number; w: number; h: number; label: string }> {
    return [
      { id: 'assign', x: 24, y: INFO_Y + 92, w: 280, h: 48, label: `Slot ${this.activeSlot + 1}'e Ata` },
      { id: 'clear', x: 316, y: INFO_Y + 92, w: 280, h: 48, label: `Slot ${this.activeSlot + 1}'i Boşalt` },
    ];
  }

  private tap(p: PointerEventInfo): void {
    const nav = navHit(p, this.host.draw);
    if (nav !== null && nav !== this.key) {
      GameState.autosave(); this.host.audio.play('ui'); this.host.goTo(nav); return;
    }
    for (let i = 0; i < GameState.skills.size; i++) {
      if (inRect(p, this.slotRect(i))) { this.activeSlot = i; this.host.audio.play('ui'); return; }
    }
    const cat = this.catalog();
    for (let i = 0; i < cat.length; i++) {
      if (inRect(p, this.poolRect(i))) {
        this.selectedRef = cat[i].def.sourceRef;
        this.host.audio.play('ui');
        return;
      }
    }
    for (const b of this.actionRects()) {
      if (!inRect(p, b)) continue;
      if (b.id === 'clear') {
        assignSkill(GameState.skills, this.activeSlot, null, GameState.player.level);
        this.say(`Slot ${this.activeSlot + 1} boşaltıldı`);
        GameState.autosave(); this.host.audio.play('ui'); return;
      }
      if (this.selectedRef === null) { this.say('Önce bir yetenek seç'); return; }
      const res = assignSkill(GameState.skills, this.activeSlot, this.selectedRef, GameState.player.level);
      if (!res.ok) {
        this.say(res.reason === 'locked' ? 'Bu yetenek henüz açılmadı' : 'Atanamadı');
        this.host.audio.play('ui');
        return;
      }
      this.say('Bara eklendi');
      GameState.autosave();
      this.host.audio.play('loot');
      return;
    }
  }

  update(dt: number): void {
    GameState.player.update(dt);
    if (this.noticeTimer > 0) this.noticeTimer -= dt;
  }

  render(g: DrawApi): void {
    g.clear('#181410');
    const p = GameState.player;
    g.text('Yetenekler', 24, 34, { size: 26, bold: true, color: '#e8d9a0' });
    g.text(`Sv ${p.level} Okçu`, 596, 34, { align: 'right', size: 16, color: '#8d8272' });
    g.text('Aktif bar (savaşta sağdaki 3 düğme)', 24, 118, { size: 14, color: '#cfc7b6' });
    if (this.noticeTimer > 0) g.text(this.notice, 596, 118, { align: 'right', size: 14, color: '#e8d9a0' });

    const defs = GameState.skills.definitions();
    for (let i = 0; i < GameState.skills.size; i++) {
      const r = this.slotRect(i);
      const on = i === this.activeSlot;
      g.rect(r.x, r.y, r.w, r.h, on ? '#2c2417' : '#1c1710');
      g.rect(r.x, r.y, r.w, 3, on ? '#e08a3c' : '#3a3128');
      g.text(`Slot ${i + 1}`, r.x + 10, r.y + 18, { size: 12, color: '#6f655a' });
      const def = defs[i];
      g.text(def?.displayName ?? 'Boş', r.x + r.w / 2, r.y + r.h / 2 + 4,
        { align: 'center', size: 15, bold: true, color: def ? '#e8e0d0' : '#6f655a' });
      if (def) g.text(`${def.manaCost} MP · ${def.cooldownSec}s`, r.x + r.w / 2, r.y + r.h - 16,
        { align: 'center', size: 11, color: '#6f8fd0' });
    }

    g.text('Yetenek havuzu', 24, POOL_Y - 20, { size: 14, color: '#cfc7b6' });
    const cat = this.catalog();
    cat.forEach((e, i) => {
      const r = this.poolRect(i);
      const sel = e.def.sourceRef === this.selectedRef;
      g.rect(r.x, r.y, r.w, r.h, sel ? '#2c2417' : '#1c1710');
      if (sel) g.rect(r.x, r.y, r.w, 2, '#e08a3c');
      const color = e.unlocked ? '#e8e0d0' : '#6f655a';
      g.text(e.def.displayName, r.x + 16, r.y + 22, { size: 16, bold: true, color });
      g.text(e.def.description || e.def.effects.map((ef) => ef.kind).join(' + '), r.x + 16, r.y + 46, { size: 12, color: '#8d8272' });
      const right = r.x + r.w - 14;
      if (!e.unlocked) {
        g.text(`Sv ${e.def.requiredLevel} gerekli`, right, r.y + 24, { align: 'right', size: 13, color: '#c96a5a' });
      } else {
        g.text(`${e.def.manaCost} MP`, right, r.y + 24, { align: 'right', size: 13, color: '#6f8fd0' });
      }
      if (e.assignedSlot !== null) {
        g.text(`Slot ${e.assignedSlot + 1}`, right, r.y + 48, { align: 'right', size: 12, color: '#7fa85c' });
      }
    });

    g.rect(24, INFO_Y, 572, 1100 - NAV_H - INFO_Y - 6, '#100d09', 0.85);
    const sel = cat.find((e) => e.def.sourceRef === this.selectedRef);
    if (sel) {
      g.text(sel.def.displayName, 36, INFO_Y + 26, { size: 17, bold: true, color: sel.unlocked ? '#e8d9a0' : '#6f655a' });
      g.text(`Gerekli seviye ${sel.def.requiredLevel} · ${sel.def.manaCost} MP · ${sel.def.cooldownSec}s bekleme`,
        36, INFO_Y + 50, { size: 13, color: '#8d8272' });
      g.text(sel.def.effects.map((ef) => ef.kind).join(' + '), 36, INFO_Y + 72, { size: 12, color: '#6f8fd0' });
    } else {
      g.text('Havuzdan bir yetenek seç, sonra bir slota ata', 310, INFO_Y + 46,
        { align: 'center', size: 14, color: '#6f655a' });
    }
    for (const b of this.actionRects()) {
      const enabled = b.id === 'clear' || (sel?.unlocked ?? false);
      g.rect(b.x, b.y, b.w, b.h, enabled ? '#2c2417' : '#161209');
      if (enabled) g.rect(b.x, b.y, b.w, 3, '#e08a3c');
      g.text(b.label, b.x + b.w / 2, b.y + b.h / 2,
        { align: 'center', size: 15, bold: true, color: enabled ? '#e8e0d0' : '#4a4239' });
    }

    drawBottomNav(g, this.host, this.key);
  }
}
