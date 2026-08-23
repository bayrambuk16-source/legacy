/** Envanter ekranı — tek ekran, scroll YOK (620×1100).
 *  Düzen: üst bilgi → karakter + 12 ekipman slotu → 60'lık grid → bilgi paneli → nav.
 *  Slot tanımları EquipmentState'ten gelir; burada hardcode edilmez.
 *  Scene yalnız orchestration/render — equip/unequip mantığı EquipmentState'te. */
import type { DrawApi, GameHost, PointerEventInfo, Scene } from '../../engine/types.js';
import { DisposerBag } from '../../engine/dispose.js';
import { Content, type GameItem } from '../data/GameContentRepository.js';
import { rarityOf } from '../config.js';
import { GameState } from '../state.js';
import { EQUIP_SLOTS } from '../systems/EquipmentState.js';
import { StatCalculator } from '../systems/CharacterStats.js';
import type { ItemInstance } from '../systems/InventoryState.js';
import { drawBar, drawBottomNav, inRect, navHit, NAV_H } from '../ui/hud.js';

type Selection = { kind: 'bag'; instanceId: number } | { kind: 'equip'; slotId: string } | null;

/* düzen sabitleri */
const GRID_COLS = 10, GRID_ROWS = 6, CELL = 56, GRID_X = 30, GRID_Y = 452;
const EQ_COLS = 6, EQ_CELL = 64, EQ_X = 214, EQ_Y = 236;
const INFO_Y = 806, INFO_H = 1100 - NAV_H - INFO_Y - 6;

export class InventoryScene implements Scene {
  readonly key = 'inventory';
  private bag = new DisposerBag();
  private selection: Selection = null;
  private notice = '';
  private noticeTimer = 0;

  constructor(private host: GameHost) {}

  enter(): void {
    this.selection = null;
    this.bag.add(this.host.input.onDown((p) => this.tap(p)));
  }

  exit(): void { this.bag.disposeAll(); }

  /* ---------------- yardımcılar ---------------- */
  private equipSlotRect(i: number): { x: number; y: number; w: number; h: number } {
    const col = i % EQ_COLS, row = Math.floor(i / EQ_COLS);
    return { x: EQ_X + col * (EQ_CELL + 2), y: EQ_Y + row * (EQ_CELL + 22), w: EQ_CELL, h: EQ_CELL };
  }
  private gridRect(i: number): { x: number; y: number; w: number; h: number } {
    const col = i % GRID_COLS, row = Math.floor(i / GRID_COLS);
    return { x: GRID_X + col * CELL, y: GRID_Y + row * CELL, w: CELL - 2, h: CELL - 2 };
  }
  private say(msg: string): void { this.notice = msg; this.noticeTimer = 2.2; }

  private selectedInstance(): ItemInstance | undefined {
    if (this.selection?.kind === 'bag') return GameState.inventory.get(this.selection.instanceId);
    if (this.selection?.kind === 'equip') return GameState.equipment.equippedInstance(this.selection.slotId);
    return undefined;
  }

  /* ---------------- input ---------------- */
  private tap(p: PointerEventInfo): void {
    const nav = navHit(p, this.host.draw);
    if (nav !== null && nav !== this.key) {
      GameState.autosave();
      this.host.audio.play('ui');
      this.host.goTo(nav);
      return;
    }
    // ekipman slotları
    for (let i = 0; i < EQUIP_SLOTS.length; i++) {
      if (inRect(p, this.equipSlotRect(i))) {
        this.selection = { kind: 'equip', slotId: EQUIP_SLOTS[i].id };
        this.host.audio.play('ui');
        return;
      }
    }
    // çanta grid'i
    const bagItems = GameState.inventory.bagList();
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      if (inRect(p, this.gridRect(i))) {
        const entry = bagItems[i];
        this.selection = entry ? { kind: 'bag', instanceId: entry.entry.instanceId } : null;
        if (entry) this.host.audio.play('ui');
        return;
      }
    }
    // aksiyon butonları
    this.tapActions(p);
  }

  private actionButtons(): Array<{ id: string; x: number; y: number; w: number; h: number; label: string }> {
    const inst = this.selectedInstance();
    if (!inst) return [];
    const item = Content.item(inst.itemRef);
    const y = INFO_Y + INFO_H - 54, w = 148, h = 46;
    const btns: Array<{ id: string; x: number; y: number; w: number; h: number; label: string }> = [];
    if (this.selection?.kind === 'bag') {
      if (item?.equipSlot) btns.push({ id: 'equip', x: 30, y, w, h, label: 'Kuşan' });
      btns.push({ id: 'lock', x: 194, y, w, h, label: inst.locked ? 'Kilidi Aç' : 'Kilitle' });
    } else if (this.selection?.kind === 'equip') {
      btns.push({ id: 'unequip', x: 30, y, w, h, label: 'Çıkar' });
    }
    return btns;
  }

  private tapActions(p: PointerEventInfo): void {
    for (const b of this.actionButtons()) {
      if (!inRect(p, b)) continue;
      const inst = this.selectedInstance();
      if (!inst) return;
      if (b.id === 'equip') {
        const r = GameState.equipment.equip(inst.instanceId);
        if (r.ok) {
          this.selection = { kind: 'equip', slotId: r.slotId };
          this.say('Kuşanıldı — statlar güncellendi');
          this.host.audio.play('loot');
          GameState.autosave();
        } else {
          this.say(r.reason === 'levelReq' ? 'Seviye yetersiz'
            : r.reason === 'wrongClass' ? 'Okçu bu itemi kullanamaz'
            : 'Kuşanılamadı');
          this.host.audio.play('ui');
        }
      } else if (b.id === 'unequip') {
        // Doğrulama domain katmanında (EquipmentState); UI yalnız mesajı gösterir.
        const slotId = (this.selection as { kind: 'equip'; slotId: string }).slotId;
        const res = GameState.equipment.unequip(slotId);
        if (res.ok) {
          this.selection = { kind: 'bag', instanceId: inst.instanceId };
          this.say('Çıkarıldı');
          this.host.audio.play('ui');
          GameState.autosave();
        } else {
          this.say(res.reason === 'inventoryFull' ? 'Çanta dolu — çıkarılamaz' : 'Bu slot boş');
          this.host.audio.play('ui');
        }
      } else if (b.id === 'lock') {
        GameState.inventory.setLocked(inst.instanceId, !inst.locked);
        this.host.audio.play('ui');
        GameState.autosave();
      }
      return;
    }
  }

  update(dt: number): void {
    GameState.player.update(dt);
    if (this.noticeTimer > 0) this.noticeTimer -= dt;
  }

  /* ---------------- render ---------------- */
  render(g: DrawApi): void {
    g.clear('#181410');
    const inv = GameState.inventory;

    // üst bilgi
    g.text('Çanta', 30, 34, { size: 26, bold: true, color: '#e8d9a0' });
    g.text(`${inv.usedSlots}/${inv.capacity}`, 590, 34, { align: 'right', size: 18, color: inv.isFull ? '#c96a5a' : '#8d8272' });
    if (this.noticeTimer > 0) g.text(this.notice, 310, 66, { align: 'center', size: 15, color: '#e8d9a0' });

    this.renderCharacter(g);
    this.renderEquipSlots(g);
    this.renderGrid(g);
    this.renderInfo(g);
    drawBottomNav(g, this.host, this.key);
  }

  private renderCharacter(g: DrawApi): void {
    const f = GameState.stats.finalStats();
    // karakter görünümü
    g.rect(24, 92, 170, 330, '#100d09', 0.6);
    if (this.host.assets.has('gt_okcu_y_sag')) {
      g.image('gt_okcu_y_sag', 108, 380, { sx: 0, sy: 0, sw: 300, sh: 300, w: 210, h: 210, originX: 0.5, originY: 1 });
    }
    // kuşanılı silah görseli karakter üzerinde (Faz 4 kapsamı: silah)
    const weapon = GameState.equipment.equippedItem('weapon');
    if (weapon) {
      const inst = GameState.equipment.equippedInstance('weapon');
      const r = rarityOf(inst?.upgradeLevel ?? 0);
      g.circle(160, 300, 20, '#0b0908', 0.7);
      g.circle(160, 300, 20, r.color, 0.25);
      if (this.host.assets.has(weapon.iconKey)) {
        g.image(weapon.iconKey, 160, 300, { w: 30, h: 30, originX: 0.5, originY: 0.5 });
      }
    } else {
      g.text('silahsız', 108, 300, { align: 'center', size: 13, color: '#c96a5a' });
    }
    g.text(`Sv ${GameState.player.level} Okçu`, 108, 112, { align: 'center', size: 16, bold: true, color: '#e8e0d0' });

    // final statlar (StatCalculator — burada hesap YAPILMAZ, yalnız gösterilir)
    const sx = 214, sy = 100;
    g.text(`Saldırı ${Math.round(f.attack)}`, sx, sy, { size: 16, color: '#e8d9a0' });
    g.text(`Savunma ${Math.round(f.defense)}`, sx + 140, sy, { size: 16, color: '#7fa85c' });
    g.text(`HP ${Math.round(f.maxHp)}`, sx + 280, sy, { size: 16, color: '#c96a5a' });
    const bonus = [f.str && `STR+${f.str}`, f.sta && `STA+${f.sta}`, f.dex && `DEX+${f.dex}`, f.int && `INT+${f.int}`]
      .filter(Boolean).join('  ');
    if (bonus) g.text(bonus, sx, sy + 26, { size: 13, color: '#6f8fd0' });
    drawBar(g, sx, sy + 44, 180, 10, GameState.player.hp / f.maxHp, '#7fa85c', '#241c14');
    drawBar(g, sx + 200, sy + 44, 180, 10, GameState.player.mp / f.maxMp, '#6f8fd0', '#1a1f2c');
  }

  private renderEquipSlots(g: DrawApi): void {
    g.text('Ekipman', EQ_X, EQ_Y - 14, { size: 14, color: '#cfc7b6' });
    EQUIP_SLOTS.forEach((slot, i) => {
      const r = this.equipSlotRect(i);
      const inst = GameState.equipment.equippedInstance(slot.id);
      const selected = this.selection?.kind === 'equip' && this.selection.slotId === slot.id;
      g.rect(r.x, r.y, r.w, r.h, selected ? '#2c2417' : '#221c14');
      g.rect(r.x, r.y, r.w, 2, selected ? '#e08a3c' : '#4a3f30');
      if (inst) {
        const item = Content.item(inst.itemRef);
        const rar = rarityOf(inst.upgradeLevel);
        g.rect(r.x + 2, r.y + r.h - 4, r.w - 4, 3, rar.color);
        if (item && this.host.assets.has(item.iconKey)) {
          g.image(item.iconKey, r.x + r.w / 2, r.y + r.h / 2, { w: 36, h: 36, originX: 0.5, originY: 0.5 });
        }
        if (inst.upgradeLevel > 0) {
          g.text(`+${inst.upgradeLevel}`, r.x + r.w - 4, r.y + 12, { align: 'right', size: 11, bold: true, color: rar.color });
        }
      }
      g.text(slot.label, r.x + r.w / 2, r.y + r.h + 11, { align: 'center', size: 10, color: '#6f655a' });
    });
  }

  private renderGrid(g: DrawApi): void {
    const bagItems = GameState.inventory.bagList();
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      const r = this.gridRect(i);
      const entry = bagItems[i];
      const selected = entry && this.selection?.kind === 'bag' && this.selection.instanceId === entry.entry.instanceId;
      g.rect(r.x, r.y, r.w, r.h, selected ? '#2c2417' : '#1c1710');
      if (!entry) continue;
      const rar = rarityOf(entry.entry.upgradeLevel);
      g.rect(r.x, r.y, r.w, 2, rar.color);
      if (entry.item && this.host.assets.has(entry.item.iconKey)) {
        g.image(entry.item.iconKey, r.x + r.w / 2, r.y + r.h / 2, { w: 32, h: 32, originX: 0.5, originY: 0.5 });
      } else {
        g.circle(r.x + r.w / 2, r.y + r.h / 2, 10, rar.color, 0.7);
      }
      if (entry.entry.quantity > 1) {
        g.text(String(entry.entry.quantity), r.x + r.w - 3, r.y + r.h - 9, { align: 'right', size: 11, bold: true, color: '#e8e0d0' });
      }
      if (entry.entry.upgradeLevel > 0) {
        g.text(`+${entry.entry.upgradeLevel}`, r.x + 3, r.y + 10, { size: 10, bold: true, color: rar.color });
      }
      if (entry.entry.locked) g.text('K', r.x + r.w - 3, r.y + 10, { align: 'right', size: 10, color: '#e8d9a0' });
    }
  }

  private renderInfo(g: DrawApi): void {
    g.rect(24, INFO_Y, 572, INFO_H, '#100d09', 0.8);
    const inst = this.selectedInstance();
    if (!inst) {
      g.text('Bir item seç', 310, INFO_Y + INFO_H / 2, { align: 'center', size: 15, color: '#6f655a' });
      return;
    }
    const item = Content.item(inst.itemRef);
    if (!item) return;
    const rar = rarityOf(inst.upgradeLevel);
    const name = inst.upgradeLevel > 0 ? `${item.displayName} (+${inst.upgradeLevel})` : item.displayName;
    g.text(name, 36, INFO_Y + 24, { size: 18, bold: true, color: rar.color });
    g.text(`${rar.name} · ${item.kindSource}${item.reqLevel > 1 ? ` · Gerekli Sv ${item.reqLevel}` : ''}`, 36, INFO_Y + 48, { size: 13, color: '#8d8272' });

    // stat satırı
    const stats: string[] = [];
    if (item.damage > 0) stats.push(`Saldırı ${item.damage}`);
    if (item.defense > 0) stats.push(`Savunma ${item.defense}`);
    const b = item.bonuses;
    if (b.str) stats.push(`STR+${b.str}`); if (b.sta) stats.push(`STA+${b.sta}`);
    if (b.dex) stats.push(`DEX+${b.dex}`); if (b.int) stats.push(`INT+${b.int}`);
    if (b.hp) stats.push(`HP+${b.hp}`); if (b.mp) stats.push(`MP+${b.mp}`);
    const e = item.elemental;
    if (e.fire) stats.push(`Ateş+${e.fire}`); if (e.ice) stats.push(`Buz+${e.ice}`);
    if (e.lightning) stats.push(`Yıldırım+${e.lightning}`); if (e.poison) stats.push(`Zehir+${e.poison}`);
    g.text(stats.join('  ') || 'Stat bonusu yok', 36, INFO_Y + 74, { size: 14, color: '#e8e0d0' });

    // karşılaştırma (çantadaki item vs aynı slottaki takılı)
    if (this.selection?.kind === 'bag' && item.equipSlot) {
      const slotId = GameState.equipment.targetSlotFor(item);
      const eqInst = slotId ? GameState.equipment.equippedInstance(slotId) : undefined;
      const eqItem = eqInst ? Content.item(eqInst.itemRef) : undefined;
      if (eqItem && eqInst) {
        const diffs = this.compare(item, inst, eqItem, eqInst);
        g.text(`Takılı: ${eqItem.displayName}${eqInst.upgradeLevel > 0 ? ` (+${eqInst.upgradeLevel})` : ''}`, 36, INFO_Y + 102, { size: 13, color: '#8d8272' });
        diffs.slice(0, 5).forEach((d, i) => {
          g.text(d.text, 36 + i * 112, INFO_Y + 124, { size: 14, bold: true, color: d.positive ? '#7fa85c' : '#c96a5a' });
        });
        if (diffs.length === 0) g.text('Fark yok', 36, INFO_Y + 124, { size: 14, color: '#6f655a' });
      }
    }

    // aksiyon butonları
    for (const btn of this.actionButtons()) {
      g.rect(btn.x, btn.y, btn.w, btn.h, '#2c2417');
      g.rect(btn.x, btn.y, btn.w, 2, '#e08a3c');
      g.text(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, { align: 'center', size: 15, bold: true, color: '#e8e0d0' });
    }
  }

  /** Karşılaştırma farkları — hesap StatCalculator'da, UI yalnızca gösterir. */
  private compare(item: GameItem, inst: ItemInstance, eqItem: GameItem, eqInst: ItemInstance): Array<{ text: string; positive: boolean }> {
    const mine = StatCalculator.itemStats(item, inst.upgradeLevel);
    const theirs = StatCalculator.itemStats(eqItem, eqInst.upgradeLevel);
    const out: Array<{ text: string; positive: boolean }> = [];
    const push = (label: string, d: number): void => {
      if (Math.round(d) !== 0) out.push({ text: `${label} ${d > 0 ? '+' : ''}${Math.round(d)}`, positive: d > 0 });
    };
    push('Saldırı', mine.attack - theirs.attack);
    push('Savunma', mine.defense - theirs.defense);
    push('STR', mine.str - theirs.str);
    push('STA', mine.sta - theirs.sta);
    push('DEX', mine.dex - theirs.dex);
    push('INT', mine.int - theirs.int);
    push('HP', mine.maxHp - theirs.maxHp);
    push('MP', mine.maxMp - theirs.maxMp);
    return out;
  }
}
