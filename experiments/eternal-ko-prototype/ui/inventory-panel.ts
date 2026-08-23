/** ENVANTER + EKİPMAN PANELİ — SAF KATMAN
 *
 *  ══════════════ BU DOSYA NE YAPAR ══════════════
 *  Panelin YERLEŞİMİNİ (dikdörtgenler), SEÇİM MODELİNİ ve KARŞILAŞTIRMA
 *  satırlarını üretir. Çizim BURADA DEĞİLDİR (Scene çizer), envanter
 *  mutasyonu BURADA DEĞİLDİR (`EquipService` / `InventoryState` yapar).
 *
 *  ══════════════ SAF ══════════════
 *  Canvas, three, `Math.random()` YOKTUR. Aynı girdi → aynı yerleşim.
 *  Bu yüzden dokunma isabetleri ve karşılaştırma matematiği WebGL olmadan
 *  test edilebilir.
 *
 *  ══════════════ AUTHORITY DEĞİLDİR ══════════════
 *  `hitTest()` yalnız "nereye dokunuldu" sorusunu yanıtlar. Kuşanma kararını
 *  `EquipService` verir; panel onun sonucunu gösterir. */

import { EQUIP_SLOTS } from '../../../src/game/systems/EquipmentState.js';
import type { ItemInstance } from '../../../src/game/systems/InventoryState.js';
import { itemDefinition } from '../data/item-catalog.js';
import {
  ITEM_CLASS_COLOR, ITEM_CLASS_LABEL, resolveStats,
  type ItemDefinition, type ResolvedItemStats,
} from '../data/item-model.js';

/* ───────────────────────── yerleşim sabitleri ───────────────────────── */

/* ═══════════════ P2.23 — YENİ MAKET YERLEŞİMİ ═══════════════
 *
 *  Koordinatlar MAKET PİKSELİNDE (941×1672) yazılır ve tek çarpanla
 *  (`UI_SCALE`) sahneye taşınır — HUD'da kurulan düzenin aynısı.
 *
 *  DEĞERLER ÖLÇÜLDÜ, TAHMİN EDİLMEDİ: maketin parlaklık profilinden
 *  otokorelasyonla adım bulundu (çanta 76 px, ekipman 158×191 px) ve
 *  ilk çizgi konumları tepe noktalarından okundu.
 *
 *  KOORDİNATLAR SAHNE PİKSELİNDE tutulur (620×1100): maket 941×1672
 *  ölçüldü, sonra `620/941 ≈ 0.659` çarpanıyla indirildi. Böylece panel
 *  kodu ölçek bilmez ve dokunma çözümlemesi doğrudan çalışır.
 *
 *  ÇANTA 7×14 = 98 HÜCRE. Satırlar maketin koyu hücre bantlarından
 *  SAYILDI (göz kararı ilk seferde 11 demişti, ölçüm 14 çıkardı).
 *  Kapasite de 98'e çekildi: boş görünen ama kullanılamayan hücre
 *  bırakmaktansa ızgaraya eşitlemek oyuncunun lehine. */
export const INV_LAYOUT = {
  panel: { x: 0, y: 0, w: 620, h: 1100 },
  /** Ekipman ızgarası — 2 sütun × 6 satır, maketin sol bloğu. */
  equip: { x: 40, y: 96, cell: 80, gap: 18, cols: 2, pitchX: 104, pitchY: 126 },
  /** Yuva etiketi şeridi — yuvanın ÜSTÜNDE, maketten ölçüldü. */
  equipLabelH: 20,
  /** Çanta ızgarası — 7 sütun × 11 satır. */
  bag: { x: 244, y: 105, cell: 45, gap: 5, cols: 7, rows: 14, pitch: 50 },
  /** Alt detay/karşılaştırma bloğu. */
  detail: { x: 26, y: 819, w: 567, h: 165 },
} as const;

export interface UiRect { x: number; y: number; w: number; h: number }

/** 12 ekipman yuvasının dikdörtgenleri (EQUIP_SLOTS sırasıyla). */
export function equipSlotRects(): Array<UiRect & { slotId: string; label: string }> {
  const e = INV_LAYOUT.equip;
  return EQUIP_SLOTS.map((s, i) => ({
    slotId: s.id,
    label: s.label,
    /* Adım maketten ölçüldü; `cell + gap` yerine ADIM kullanılır çünkü
       maketin yuvaları arasında etiket şeridi de var. */
    x: e.x + (i % e.cols) * e.pitchX,
    y: e.y + Math.floor(i / e.cols) * e.pitchY,
    w: e.cell,
    h: e.cell,
  }));
}

/** Çanta hücrelerinin dikdörtgenleri (index sırasıyla, içerik bağımsız). */
export function bagCellRects(): UiRect[] {
  const b = INV_LAYOUT.bag;
  const out: UiRect[] = [];
  for (let i = 0; i < b.cols * b.rows; i++) {
    out.push({
      x: b.x + (i % b.cols) * b.pitch,
      y: b.y + Math.floor(i / b.cols) * b.pitch,
      w: b.cell,
      h: b.cell,
    });
  }
  return out;
}

/** Panelin düğmeleri. `id` Scene'in dispatch anahtarıdır. */
export function invButtons(): Array<UiRect & { id: string; label: string }> {
  const d = INV_LAYOUT.detail;
  const w = 168, h = 46, gap = 12;
  const y = d.y + d.h - h - 14;
  return [
    { id: 'inv_equip', label: 'KUŞAN', x: d.x + 10, y, w, h },
    { id: 'inv_unequip', label: 'ÇIKAR', x: d.x + 10 + (w + gap), y, w, h },
    { id: 'inv_drop', label: 'AT', x: d.x + 10 + 2 * (w + gap), y, w, h },
  ];
}

export function invCloseButton(): UiRect & { id: string; label: string } {
  const p = INV_LAYOUT.panel;
  return { id: 'inv_close', label: '✕', x: p.x + p.w - 52, y: p.y + 12, w: 40, h: 36 };
}

/* ───────────────────────── seçim modeli ───────────────────────── */

export type InvSelection =
  | { readonly kind: 'bag'; readonly instanceId: number }
  | { readonly kind: 'equip'; readonly slotId: string }
  | null;

export type InvHit =
  | { readonly kind: 'bag'; readonly index: number }
  | { readonly kind: 'equip'; readonly slotId: string }
  | { readonly kind: 'button'; readonly id: string }
  | null;

const inside = (r: UiRect, x: number, y: number): boolean =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** Dokunulan öge. Panel dışına dokunma `null` döner — Scene bunu "kapat"
 *  olarak yorumlamaz; modal davranışı Scene'in kararıdır. */
export function hitTest(x: number, y: number): InvHit {
  const close = invCloseButton();
  if (inside(close, x, y)) return { kind: 'button', id: close.id };
  for (const b of invButtons()) if (inside(b, x, y)) return { kind: 'button', id: b.id };
  for (const s of equipSlotRects()) if (inside(s, x, y)) return { kind: 'equip', slotId: s.slotId };
  const cells = bagCellRects();
  for (let i = 0; i < cells.length; i++) if (inside(cells[i]!, x, y)) return { kind: 'bag', index: i };
  return null;
}

/* ───────────────────────── çanta içeriği ───────────────────────── */

/** Çantada GÖRÜNEN kayıtlar: kuşanılı olanlar ÇANTADA GÖSTERİLMEZ (onlar
 *  ekipman ızgarasındadır). Sıra `instanceId` ile SABİTTİR — aynı durum aynı
 *  yerleşimi verir, hücreler kare arası zıplamaz. */
export function bagEntries(entries: readonly ItemInstance[]): ItemInstance[] {
  return entries
    .filter((e) => e.equippedSlot === null)
    .sort((a, b) => a.instanceId - b.instanceId);
}

/** Bir tanımın gideceği ekipman yuvası. Aynı tipte birden çok yuva varsa
 *  (küpe/yüzük) ÖNCE BOŞ olan seçilir; hepsi doluysa ilki (takas edilecek). */
export function targetSlotFor(
  def: ItemDefinition,
  occupied: ReadonlyMap<string, number | null>,
): string | null {
  const candidates = EQUIP_SLOTS.filter((s) => s.type === def.equipSlot);
  if (candidates.length === 0) return null;
  const free = candidates.find((s) => (occupied.get(s.id) ?? null) === null);
  return (free ?? candidates[0]!).id;
}

/* ───────────────────────── karşılaştırma ───────────────────────── */

export interface CompareLine {
  readonly label: string;
  /** Seçilen itemin değeri. */
  readonly value: number;
  /** Kuşanılı itemle FARK. `null` → karşılaştırılacak bir şey yok. */
  readonly delta: number | null;
}

const STAT_ROWS: ReadonlyArray<{ label: string; pick: (s: ResolvedItemStats) => number }> = [
  { label: 'Saldırı', pick: (s) => s.attack },
  { label: 'Savunma', pick: (s) => s.defense },
  { label: 'STR', pick: (s) => s.str },
  { label: 'DEX', pick: (s) => s.dex },
  { label: 'INT', pick: (s) => s.int },
  { label: 'STA', pick: (s) => s.sta },
  { label: 'Max HP', pick: (s) => s.maxHp },
  { label: 'Max MP', pick: (s) => s.maxMp },
];

/** Seçilen item ile kuşanılı itemin stat karşılaştırması.
 *
 *  Yalnız SIFIRDAN FARKLI satırlar döner (ikisinden biri sıfırdan farklıysa
 *  satır görünür) — boş satırlarla panel doldurulmaz. `compareTo` yoksa
 *  `delta` null'dır ve panel yalnız değeri gösterir. */
export function compareLines(
  def: ItemDefinition,
  compareTo: ItemDefinition | null,
): CompareLine[] {
  const a = resolveStats(def);
  const b = compareTo ? resolveStats(compareTo) : null;
  const out: CompareLine[] = [];
  for (const row of STAT_ROWS) {
    const va = row.pick(a);
    const vb = b ? row.pick(b) : 0;
    if (va === 0 && vb === 0) continue;
    out.push({ label: row.label, value: va, delta: b ? va - vb : null });
  }
  return out;
}

/** Başlık satırı — ad, sınıf rengi, seviye şartı. */
export function itemHeadline(def: ItemDefinition, upgradeLevel: number): {
  text: string; color: string; sub: string;
} {
  return {
    text: upgradeLevel > 0 ? `${def.displayName} +${upgradeLevel}` : def.displayName,
    color: ITEM_CLASS_COLOR[def.itemClass],
    sub: `${ITEM_CLASS_LABEL[def.itemClass]} · Sv ${def.requiredLevel} · ${def.equipSlot}`,
  };
}

/** Katalogda tanımı olan mı? Tanımsız item kuşanılamaz (uydurma stat yok). */
export function definitionOf(itemRef: number): ItemDefinition | null {
  return itemDefinition(itemRef) ?? null;
}
