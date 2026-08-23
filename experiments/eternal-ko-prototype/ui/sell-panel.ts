/** OTO SAT PANELİ — SAF YERLEŞİM (P2.16)
 *
 *  ══════════════ BU DOSYA NE YAPAR ══════════════
 *  Satış ekranının dikdörtgenlerini ve dokunma çözümlemesini üretir.
 *  Karar ve mutasyon BURADA DEĞİLDİR (`world/AutoGearSystem.ts`),
 *  çizim BURADA DEĞİLDİR (Scene).
 *
 *  ══════════════ İKİ BÖLÜM ══════════════
 *  1. AYARLAR — oto giy/sat anahtarları, kalite eşiği, tüketilebilir
 *     koruması ve üst sınırı.
 *  2. ONAY KUYRUĞU — oto giy sonrası çıkan eski eşyalar. Kullanıcı kararı
 *     gereği bunlar HEMEN SATILMAZ; her biri için TUT / SAT seçeneği var.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. */

import { ITEM_CLASSES, type ItemClass } from '../data/item-model.js';
import { INV_LAYOUT, invCloseButton, type UiRect } from './inventory-panel.js';

export const SELL_PANEL = INV_LAYOUT.panel;

export { invCloseButton as sellCloseButton };

const inside = (r: UiRect, x: number, y: number): boolean =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/* ═══════════════════════ AYARLAR ═══════════════════════ */

/** Aç/kapa anahtarları — her biri tek satır. */
export const TOGGLE_IDS = ['autoEquip', 'autoSell', 'protectConsumables'] as const;
export type ToggleId = typeof TOGGLE_IDS[number];

export const TOGGLE_LABELS: Readonly<Record<ToggleId, string>> = {
  autoEquip: 'Oto giy (güçlüyse kuşan)',
  autoSell: 'Oto sat (zayıfları sat)',
  protectConsumables: 'Parşömen/iksir koru',
};

export function toggleRects(): Array<UiRect & { id: ToggleId }> {
  const x = SELL_PANEL.x + 20;
  const w = SELL_PANEL.w - 40;
  return TOGGLE_IDS.map((id, i) => ({
    id, x, y: SELL_PANEL.y + 62 + i * 44, w, h: 38,
  }));
}

/** Kalite eşiği seçicisi — bu kalitenin ALTINDAKİLER satılır.
 *  Beş kademe + "kapalı" seçeneği. */
export function classButtons(): Array<UiRect & { id: string; cls: ItemClass | null }> {
  const opts: Array<ItemClass | null> = [null, ...ITEM_CLASSES];
  const w = 88, h = 36, gap = 6;
  const x0 = SELL_PANEL.x + 20;
  const y = SELL_PANEL.y + 234;
  return opts.map((cls, i) => ({
    id: `sell_cls_${cls ?? 'off'}`, cls,
    x: x0 + i * (w + gap), y, w, h,
  }));
}

/** Tüketilebilir üst sınırı seçenekleri. `null` = sınırsız. */
export const KEEP_MAX_OPTIONS: ReadonlyArray<number | null> = [null, 20, 50, 100];

export function keepMaxButtons(): Array<UiRect & { id: string; value: number | null }> {
  const w = 88, h = 36, gap = 6;
  const x0 = SELL_PANEL.x + 20;
  const y = SELL_PANEL.y + 300;
  return KEEP_MAX_OPTIONS.map((value, i) => ({
    id: `sell_keep_${value ?? 'inf'}`, value,
    x: x0 + i * (w + gap), y, w, h,
  }));
}

/* ═══════════════════════ ONAY KUYRUĞU ═══════════════════════ */

export const PENDING_BOX: UiRect = {
  x: SELL_PANEL.x + 20, y: SELL_PANEL.y + 356,
  w: SELL_PANEL.w - 40, h: 380,
};

export const PENDING_ROW_H = 54;
export const PENDING_PAGE_SIZE = 6;

/** Onay bekleyen her eşya için satır + iki düğme (TUT / SAT). */
export function pendingRows(count: number): Array<{
  row: UiRect; keep: UiRect & { id: string }; sell: UiRect & { id: string };
}> {
  const out: Array<{ row: UiRect; keep: UiRect & { id: string }; sell: UiRect & { id: string } }> = [];
  for (let i = 0; i < count; i++) {
    const y = PENDING_BOX.y + 30 + i * (PENDING_ROW_H + 4);
    const row = { x: PENDING_BOX.x + 8, y, w: PENDING_BOX.w - 16, h: PENDING_ROW_H };
    out.push({
      row,
      keep: { id: `pend_keep_${i}`, x: row.x + row.w - 190, y: y + 8, w: 86, h: 38 },
      sell: { id: `pend_sell_${i}`, x: row.x + row.w - 96, y: y + 8, w: 86, h: 38 },
    });
  }
  return out;
}

/** Toplu işlem düğmeleri. */
export function bulkButtons(): Array<UiRect & { id: string; label: string }> {
  const y = SELL_PANEL.y + SELL_PANEL.h - 62;
  const w = 172, h = 46, gap = 12;
  const x = SELL_PANEL.x + 20;
  return [
    { id: 'sell_sweep', label: 'UYGUNLARI SAT', x, y, w, h },
    { id: 'sell_keep_all', label: 'HEPSİNİ TUT', x: x + w + gap, y, w, h },
    { id: 'sell_all_pending', label: 'HEPSİNİ SAT', x: x + 2 * (w + gap), y, w, h },
  ];
}

export type SellHit =
  | { readonly kind: 'toggle'; readonly id: ToggleId }
  | { readonly kind: 'class'; readonly cls: ItemClass | null }
  | { readonly kind: 'keepMax'; readonly value: number | null }
  | { readonly kind: 'pendingKeep'; readonly index: number }
  | { readonly kind: 'pendingSell'; readonly index: number }
  | { readonly kind: 'button'; readonly id: string }
  | null;

/** @param pendingCount O SAYFADA görünen onay satırı sayısı. */
export function sellHitTest(x: number, y: number, pendingCount: number): SellHit {
  const c = invCloseButton();
  if (inside(c, x, y)) return { kind: 'button', id: c.id };
  for (const b of bulkButtons()) if (inside(b, x, y)) return { kind: 'button', id: b.id };
  for (const t of toggleRects()) if (inside(t, x, y)) return { kind: 'toggle', id: t.id };
  for (const b of classButtons()) if (inside(b, x, y)) return { kind: 'class', cls: b.cls };
  for (const b of keepMaxButtons()) if (inside(b, x, y)) return { kind: 'keepMax', value: b.value };
  const rows = pendingRows(pendingCount);
  for (let i = 0; i < rows.length; i++) {
    if (inside(rows[i]!.keep, x, y)) return { kind: 'pendingKeep', index: i };
    if (inside(rows[i]!.sell, x, y)) return { kind: 'pendingSell', index: i };
  }
  return null;
}

/* ═══════════════════════ ÖLÜM EKRANI ═══════════════════════ */

/** P2.22 — ölüm bildirimi kutusu. Ekranın ortasında, küçük ve tek
 *  düğmeli: ölüm anında oyuncuya seçenek yığmak yerine tek bir onay. */
/** P2.23 — envanter maketi panel ölçüsünü değiştirdi (`SELL_PANEL`
 *  artık tam ekran). Ölüm kutusu ekran ORTASINA sabitlendi; panel
 *  ölçüsüne bağlı kalması onu ekran dışına taşıyordu. */
export const DEATH_BOX: UiRect = { x: 70, y: 420, w: 480, h: 260 };

export function deathOkButton(): UiRect & { id: string; label: string } {
  return {
    id: 'death_ok', label: 'TAMAM',
    x: DEATH_BOX.x + DEATH_BOX.w / 2 - 90, y: DEATH_BOX.y + DEATH_BOX.h - 66,
    w: 180, h: 50,
  };
}
