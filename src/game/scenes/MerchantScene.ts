/** Tüccar ekranı — tek ekran, SCROLL YOK (sayfalı liste).
 *  Tüm kurallar MerchantSystem'de; Scene yalnız seçim/gösterim yapar. */
import type { DrawApi, GameHost, PointerEventInfo, Scene } from '../../engine/types.js';
import { DisposerBag } from '../../engine/dispose.js';
import { Content } from '../data/GameContentRepository.js';
import { rarityOf } from '../config.js';
import { GameState } from '../state.js';
import type { BuyFail, SellFail } from '../systems/MerchantSystem.js';
import { drawBottomNav, inRect, navHit, NAV_H } from '../ui/hud.js';

type Mode = 'buy' | 'sell';
interface Row { key: string; label: string; price: number; itemRef: number; instanceId?: number; qty?: number; upgrade: number }

const ROWS_PER_PAGE = 7;
const LIST_Y = 258, ROW_H = 62, LIST_X = 24, LIST_W = 572;
const PANEL_Y = 748, PANEL_H = 1100 - NAV_H - PANEL_Y - 6;

const BUY_FAIL_TEXT: Record<BuyFail, string> = {
  unknownMerchant: 'Tüccar bulunamadı', notSold: 'Bu tüccar satmıyor', unknownItem: 'Bilinmeyen eşya',
  badQuantity: 'Geçersiz miktar', coin: 'Altın yetersiz', inventoryFull: 'Çanta dolu',
};
const SELL_FAIL_TEXT: Record<SellFail, string> = {
  unknownItem: 'Bilinmeyen eşya', notFound: 'Eşya bulunamadı', badQuantity: 'Geçersiz miktar',
  locked: 'Kilitli eşya satılamaz', equipped: 'Kuşanılı eşya satılamaz',
};

export class MerchantScene implements Scene {
  readonly key = 'merchant';
  private bag = new DisposerBag();
  private mode: Mode = 'buy';
  private page = 0;
  private selectedKey: string | null = null;
  private qty = 1;
  private notice = '';
  private noticeTimer = 0;

  constructor(private host: GameHost) {}

  enter(): void {
    this.mode = 'buy'; this.page = 0; this.selectedKey = null; this.qty = 1;
    this.bag.add(this.host.input.onDown((p) => this.tap(p)));
  }
  exit(): void { this.bag.disposeAll(); }

  private say(msg: string): void { this.notice = msg; this.noticeTimer = 2.4; }

  /* ---------------- veri ---------------- */
  private rows(): Row[] {
    if (this.mode === 'buy') {
      return GameState.merchants.offers(GameState.currentMerchantId).map((o) => ({
        key: `b${o.item.sourceRef}`, label: o.item.displayName, price: o.unitPrice,
        itemRef: o.item.sourceRef, upgrade: 0,
      }));
    }
    return GameState.inventory.bagList().map(({ item, entry }) => ({
      key: `s${entry.instanceId}`,
      label: item?.displayName ?? `#${entry.itemRef}`,
      price: GameState.merchants.unitSellPrice(entry.itemRef, entry.upgradeLevel) ?? 0,
      itemRef: entry.itemRef, instanceId: entry.instanceId, qty: entry.quantity,
      upgrade: entry.upgradeLevel,
    }));
  }
  private pageRows(): Row[] {
    const all = this.rows();
    return all.slice(this.page * ROWS_PER_PAGE, this.page * ROWS_PER_PAGE + ROWS_PER_PAGE);
  }
  private pageCount(): number { return Math.max(1, Math.ceil(this.rows().length / ROWS_PER_PAGE)); }
  private selected(): Row | undefined { return this.rows().find((r) => r.key === this.selectedKey); }
  private maxQty(row: Row): number {
    if (this.mode === 'sell') return row.qty ?? 1;
    const affordable = row.price > 0 ? Math.floor(GameState.player.coins / row.price) : 99;
    return Math.max(1, Math.min(99, affordable));
  }

  /* ---------------- layout ---------------- */
  private tabRects(): Array<{ id: string; x: number; y: number; w: number; h: number; label: string }> {
    return Content.merchants.map((m, i) => ({
      id: m.id, x: 24 + i * 200, y: 88, w: 190, h: 48,
      label: m.role === 'potion' ? 'İksirci' : 'Levazımcı',
    }));
  }
  private modeRects(): Array<{ id: Mode; x: number; y: number; w: number; h: number; label: string }> {
    return [
      { id: 'buy', x: 24, y: 152, w: 180, h: 44, label: 'Satın Al' },
      { id: 'sell', x: 216, y: 152, w: 180, h: 44, label: 'Sat' },
    ];
  }
  private rowRect(i: number): { x: number; y: number; w: number; h: number } {
    return { x: LIST_X, y: LIST_Y + i * ROW_H, w: LIST_W, h: ROW_H - 4 };
  }
  private pagerRects(): Array<{ id: string; x: number; y: number; w: number; h: number; label: string }> {
    const y = LIST_Y + ROWS_PER_PAGE * ROW_H + 4;
    return [
      { id: 'prev', x: LIST_X, y, w: 90, h: 40, label: '‹' },
      { id: 'next', x: LIST_X + LIST_W - 90, y, w: 90, h: 40, label: '›' },
    ];
  }
  private actionRects(): Array<{ id: string; x: number; y: number; w: number; h: number; label: string }> {
    const y = PANEL_Y + PANEL_H - 56;
    return [
      { id: 'minus', x: 30, y, w: 56, h: 48, label: '−' },
      { id: 'plus', x: 154, y, w: 56, h: 48, label: '+' },
      { id: 'confirm', x: 236, y, w: 200, h: 48, label: this.mode === 'buy' ? 'Satın Al' : 'Sat' },
      { id: 'max', x: 452, y, w: 130, h: 48, label: 'Tümü' },
    ];
  }

  /* ---------------- input ---------------- */
  private tap(p: PointerEventInfo): void {
    const nav = navHit(p, this.host.draw);
    if (nav !== null && nav !== this.key) {
      GameState.autosave(); this.host.audio.play('ui'); this.host.goTo(nav); return;
    }
    for (const t of this.tabRects()) {
      if (inRect(p, t)) {
        GameState.currentMerchantId = t.id;
        this.page = 0; this.selectedKey = null; this.qty = 1;
        this.host.audio.play('ui'); return;
      }
    }
    for (const m of this.modeRects()) {
      if (inRect(p, m)) {
        this.mode = m.id; this.page = 0; this.selectedKey = null; this.qty = 1;
        this.host.audio.play('ui'); return;
      }
    }
    for (const pg of this.pagerRects()) {
      if (inRect(p, pg)) {
        this.page = pg.id === 'prev'
          ? (this.page - 1 + this.pageCount()) % this.pageCount()
          : (this.page + 1) % this.pageCount();
        this.selectedKey = null; this.host.audio.play('ui'); return;
      }
    }
    const rows = this.pageRows();
    for (let i = 0; i < rows.length; i++) {
      if (inRect(p, this.rowRect(i))) {
        this.selectedKey = rows[i].key; this.qty = 1;
        this.host.audio.play('ui'); return;
      }
    }
    this.tapActions(p);
  }

  private tapActions(p: PointerEventInfo): void {
    const row = this.selected();
    if (!row) return;
    for (const b of this.actionRects()) {
      if (!inRect(p, b)) continue;
      if (b.id === 'minus') { this.qty = Math.max(1, this.qty - 1); return; }
      if (b.id === 'plus') { this.qty = Math.min(this.maxQty(row), this.qty + 1); return; }
      if (b.id === 'max') { this.qty = this.maxQty(row); return; }
      if (b.id === 'confirm') { this.confirm(row); return; }
    }
  }

  private confirm(row: Row): void {
    if (this.mode === 'buy') {
      const res = GameState.merchants.buy(GameState.currentMerchantId, row.itemRef, this.qty);
      if (!res.ok) { this.say(BUY_FAIL_TEXT[res.reason]); this.host.audio.play('ui'); return; }
      this.say(`${row.label} ×${res.quantity} alındı (−${res.totalCost})`);
      this.host.audio.play('loot');
    } else {
      const res = GameState.merchants.sell(row.instanceId!, this.qty);
      if (!res.ok) { this.say(SELL_FAIL_TEXT[res.reason]); this.host.audio.play('ui'); return; }
      this.say(`${row.label} ×${res.quantity} satıldı (+${res.totalGain})`);
      this.host.audio.play('loot');
      this.selectedKey = null;
    }
    this.qty = 1;
    GameState.autosave();
    const maxPage = this.pageCount() - 1;
    if (this.page > maxPage) this.page = maxPage;
  }

  update(dt: number): void {
    GameState.player.update(dt);
    if (this.noticeTimer > 0) this.noticeTimer -= dt;
  }

  /* ---------------- render ---------------- */
  render(g: DrawApi): void {
    g.clear('#181410');
    const inv = GameState.inventory;

    g.text('Tüccar', 24, 34, { size: 26, bold: true, color: '#e8d9a0' });
    if (this.host.assets.has('hud_coin')) g.image('hud_coin', 424, 22, { w: 22, h: 22 });
    g.text(String(GameState.player.coins), 454, 33, { size: 18, color: '#e8d9a0' });
    g.text(`Çanta ${inv.usedSlots}/${inv.capacity}`, 596, 33,
      { align: 'right', size: 14, color: inv.isFull ? '#c96a5a' : '#8d8272' });

    for (const t of this.tabRects()) {
      const on = t.id === GameState.currentMerchantId;
      g.rect(t.x, t.y, t.w, t.h, on ? '#2c2417' : '#1c1710');
      g.rect(t.x, t.y, t.w, 3, on ? '#e08a3c' : '#3a3128');
      g.text(t.label, t.x + t.w / 2, t.y + t.h / 2, { align: 'center', size: 16, bold: on, color: on ? '#e8d9a0' : '#8d8272' });
    }
    for (const m of this.modeRects()) {
      const on = m.id === this.mode;
      g.rect(m.x, m.y, m.w, m.h, on ? '#2c2417' : '#1c1710');
      g.text(m.label, m.x + m.w / 2, m.y + m.h / 2, { align: 'center', size: 15, bold: on, color: on ? '#e8e0d0' : '#6f655a' });
    }
    if (this.noticeTimer > 0) g.text(this.notice, 596, 174, { align: 'right', size: 14, color: '#e8d9a0' });

    // liste
    const rows = this.pageRows();
    for (let i = 0; i < ROWS_PER_PAGE; i++) {
      const r = this.rowRect(i);
      const row = rows[i];
      g.rect(r.x, r.y, r.w, r.h, row && row.key === this.selectedKey ? '#2c2417' : '#1c1710');
      if (!row) continue;
      const item = Content.item(row.itemRef);
      const rar = rarityOf(row.upgrade);
      g.rect(r.x, r.y, 4, r.h, rar.color);
      if (item && this.host.assets.has(item.iconKey)) {
        g.image(item.iconKey, r.x + 34, r.y + r.h / 2, { w: 34, h: 34, originX: 0.5, originY: 0.5 });
      }
      const name = row.upgrade > 0 ? `${row.label} (+${row.upgrade})` : row.label;
      g.text(name, r.x + 62, r.y + 22, { size: 15, color: '#e8e0d0' });
      if (this.mode === 'sell' && (row.qty ?? 1) > 1) {
        g.text(`×${row.qty}`, r.x + 62, r.y + 42, { size: 13, color: '#8d8272' });
      } else if (this.mode === 'buy' && item) {
        g.text(GameState.consumables.isConsumable(item.sourceRef) ? 'kullanılabilir' : item.kindSource,
          r.x + 62, r.y + 42, { size: 12, color: '#6f655a' });
      }
      g.text(String(row.price), r.x + r.w - 14, r.y + r.h / 2, { align: 'right', size: 16, color: '#e8d9a0' });
    }
    for (const pg of this.pagerRects()) {
      g.rect(pg.x, pg.y, pg.w, pg.h, '#1c1710');
      g.text(pg.label, pg.x + pg.w / 2, pg.y + pg.h / 2, { align: 'center', size: 20, color: '#cfc7b6' });
    }
    g.text(`${this.page + 1}/${this.pageCount()}`, 310, this.pagerRects()[0].y + 20,
      { align: 'center', size: 14, color: '#8d8272' });

    // seçim paneli
    g.rect(24, PANEL_Y, 572, PANEL_H, '#100d09', 0.85);
    const row = this.selected();
    if (!row) {
      g.text(this.mode === 'buy' ? 'Satın almak için eşya seç' : 'Satmak için eşya seç',
        310, PANEL_Y + PANEL_H / 2, { align: 'center', size: 15, color: '#6f655a' });
    } else {
      const total = row.price * this.qty;
      g.text(row.label, 36, PANEL_Y + 26, { size: 18, bold: true, color: rarityOf(row.upgrade).color });
      g.text(`Birim ${row.price}   ·   Toplam ${total}`, 36, PANEL_Y + 52, { size: 14, color: '#8d8272' });
      const item = Content.item(row.itemRef);
      if (item && GameState.consumables.isConsumable(item.sourceRef)) {
        const b = GameState.consumables.behavior(item.sourceRef);
        const desc = b?.effects.map((e) => e.kind === 'restoreHp' ? `Can +%${Math.round(e.percentOfMax * 100)}`
          : e.kind === 'restoreMp' ? `Mana +%${Math.round(e.percentOfMax * 100)}` : 'Arınma').join('  ');
        if (desc) g.text(desc, 36, PANEL_Y + 76, { size: 13, color: '#7fa85c' });
      }
      for (const b of this.actionRects()) {
        const isConfirm = b.id === 'confirm';
        g.rect(b.x, b.y, b.w, b.h, isConfirm ? '#2c2417' : '#1c1710');
        if (isConfirm) g.rect(b.x, b.y, b.w, 3, '#e08a3c');
        g.text(b.label, b.x + b.w / 2, b.y + b.h / 2,
          { align: 'center', size: isConfirm ? 16 : 20, bold: isConfirm, color: '#e8e0d0' });
      }
      g.text(String(this.qty), 126, PANEL_Y + PANEL_H - 32, { align: 'center', size: 20, bold: true, color: '#e8d9a0' });
    }

    drawBottomNav(g, this.host, this.key);
  }
}
