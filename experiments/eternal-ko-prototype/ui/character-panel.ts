/** KARAKTER + YETENEK PANELLERİ — SAF KATMAN
 *
 *  ══════════════ BU DOSYA NE YAPAR ══════════════
 *  İki panelin YERLEŞİMİNİ ve okunacak SATIRLARINI üretir. Çizim BURADA
 *  DEĞİLDİR (Scene çizer), stat hesabı BURADA DEĞİLDİR (`ArcherBuildResolver`
 *  authority'sidir), skill yuvası ataması BURADA DEĞİLDİR (`SkillLoadout`).
 *
 *  ══════════════ SAF ══════════════
 *  Canvas, three, `Math.random()`, mutasyon YOKTUR. Aynı girdi → aynı çıktı.
 *  Envanter paneliyle (`ui/inventory-panel.ts`) AYNI deseni izler: dikdörtgen
 *  üret, dokunmayı çöz, satırları biçimle. */

import type { FinalStats, StatBlock } from '../../../src/game/systems/CharacterStats.js';
import { EQUIP_SLOTS } from '../../../src/game/systems/EquipmentState.js';
import type { UiRect } from './inventory-panel.js';
import { INV_LAYOUT, invCloseButton } from './inventory-panel.js';

/** Her iki panel de envanterle AYNI çerçeveyi kullanır — ekranlar arası
 *  geçişte pencere zıplamaz. */
export const PANEL_FRAME = INV_LAYOUT.panel;

/** Kapatma düğmesi de ortaktır. */
export { invCloseButton as panelCloseButton };

const inside = (r: UiRect, x: number, y: number): boolean =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/* ═══════════════════════ KARAKTER PANELİ ═══════════════════════ */

export interface StatRow {
  readonly label: string;
  readonly value: string;
  /** Ekipmandan gelen katkı — `null` ise gösterilmez. */
  readonly fromGear: string | null;
}

/** Karakter ekranının stat satırları.
 *
 *  DEĞERLER HESAPLANMAZ, OKUNUR: `final` `ArcherBuildResolver.finalStats()`
 *  çıktısıdır, `base` ise ekipmansız taban (`StatCalculator.baseStats`). Fark
 *  ekipman katkısıdır. `shotSec` temel atışın süresi — zamanlama profilinden
 *  gelir, burada uydurulmaz. */
export function statRows(final: FinalStats, base: StatBlock, shotSec: number): StatRow[] {
  const gear = (a: number, b: number): string | null => {
    const d = Math.round(a - b);
    return d === 0 ? null : `${d > 0 ? '+' : ''}${d}`;
  };
  return [
    /* P2.5A — "Saldırı" artık KO Archer AP'sidir (`ArcherBuildResolver`
       finalStats'ı okçu değerleriyle ezer). Eski generic `level × 2`
       sayısı ana mimaride duruyor ama oyuncuya GÖSTERİLMEZ. */
    { label: 'Saldırı (AP)', value: String(Math.round(final.attack)), fromGear: gear(final.attack, base.attack) },
    { label: 'Savunma', value: String(Math.round(final.defense)), fromGear: gear(final.defense, base.defense) },
    /* DPS UYDURULMAZ: temel atışın süresi zamanlama profilinden (`ArcherCombatTimingProfile`)
       gelir, hasar `attack`tan. Kritik sistemi YOKTUR (§12), formüle de girmez. */
    { label: 'Saldırı / sn', value: shotSec > 0 ? (final.attack * final.attackSpeedMult / shotSec).toFixed(1) : '—', fromGear: null },
    { label: 'Max HP', value: String(Math.round(final.maxHp)), fromGear: gear(final.maxHp, base.maxHp) },
    { label: 'Max MP', value: String(Math.round(final.maxMp)), fromGear: gear(final.maxMp, base.maxMp) },
    { label: 'STR', value: String(Math.round(final.str)), fromGear: gear(final.str, base.str) },
    { label: 'DEX', value: String(Math.round(final.dex)), fromGear: gear(final.dex, base.dex) },
    { label: 'INT', value: String(Math.round(final.int)), fromGear: gear(final.int, base.int) },
    { label: 'STA', value: String(Math.round(final.sta)), fromGear: gear(final.sta, base.sta) },
    { label: 'Saldırı hızı', value: `×${final.attackSpeedMult.toFixed(2)}`, fromGear: null },
  ];
}

/* ═══════════════════ STAT DAĞITIMI (P2.5B) ═══════════════════ */

/** Dağıtım satırı — DEX ve HP için birer tane. */
export const ALLOC_ROWS = ['dex', 'hp'] as const;
export type AllocStatId = typeof ALLOC_ROWS[number];

/** Artı düğmelerinin dikdörtgenleri. `+1` ve `+5` iki ayrı düğmedir:
 *  67 puanı tek tek harcamak mobilde işkence olur. */
/** Dağıtım stat satırları — [y, yükseklik]. */
export const ALLOC_STAT_ROWS: ReadonlyArray<readonly [number, number]> = [
  [329, 36], [375, 36],
];

/** Amber kare düğmeler: maketin 2×2 bloğu (x 440 ve 508, sahne). */
export function allocButtons(): Array<UiRect & { id: string; stat: AllocStatId; amount: number }> {
  const out: Array<UiRect & { id: string; stat: AllocStatId; amount: number }> = [];
  ALLOC_ROWS.forEach((stat, i) => {
    const [y, h] = ALLOC_STAT_ROWS[i]!;
    out.push({ id: `alloc_${stat}_1`, stat, amount: 1, x: 440, y, w: 60, h });
    out.push({ id: `alloc_${stat}_5`, stat, amount: 5, x: 508, y, w: 60, h });
  });
  return out;
}

/** Dağıtım bloğunun tamamı (başlık + iki satır). */
/* ═══ P2.25 — KARAKTER MAKETİNE OTURTULDU ═══
   Konumlar maketin koyu bloklarından ÖLÇÜLDÜ (941×1672 → sahne 620×1100,
   çarpan 0.659), formülle türetilmedi. */

/** Kimlik bloğu: portre çemberi + üç bilgi satırı. */
export const CHAR_PORTRAIT: UiRect = { x: 72, y: 112, w: 155, h: 155 };
export const CHAR_IDENTITY_ROWS: ReadonlyArray<readonly [number, number]> = [
  [123, 36], [169, 34], [214, 34],
];
export const CHAR_IDENTITY_X = 243;
export const CHAR_IDENTITY_W = 320;

/** Dağıtım bloğu: üstte puan satırı, altında iki stat satırı. */
export const ALLOC_BOX: UiRect = { x: 66, y: 280, w: 500, h: 140 };
export const ALLOC_POINT_ROW: UiRect = { x: 70, y: 287, w: 490, h: 32 };

/** Stat satırlarının çizileceği blok. */
/** Stat listesi. 11 satır, 28,3 px aralıklı — maketin zebra bantlarından.
 *  Dikey ayırıcı x 410'da: sol etiket, sağ değer. */
export const CHAR_STAT_ROW_H = 28.3;
export const CHAR_STAT_FIRST_Y = 445;
export const CHAR_STAT_DIVIDER_X = 410;
export const CHAR_RESIST_ROWS: ReadonlyArray<readonly [number, number]> = [
  [783, 47], [836, 45], [888, 45],
];

export const CHAR_STATS_BOX: UiRect = {
  x: PANEL_FRAME.x + 20, y: PANEL_FRAME.y + 136,
  w: PANEL_FRAME.w - 40, h: 330,
};

/** Kuşanılı ekipmanın özet listesi (dolu yuvalar). */
export const CHAR_GEAR_BOX: UiRect = {
  x: PANEL_FRAME.x + 20, y: CHAR_STATS_BOX.y + CHAR_STATS_BOX.h + 16,
  w: PANEL_FRAME.w - 40, h: 340,
};

/** Ekipman özetinde gösterilecek yuva sırası — EQUIP_SLOTS ile AYNI. */
export function gearSlotOrder(): ReadonlyArray<{ id: string; label: string }> {
  return EQUIP_SLOTS.map((s) => ({ id: s.id, label: s.label }));
}

export type CharHit = { readonly kind: 'button'; readonly id: string } | null;

export function charHitTest(x: number, y: number): CharHit {
  const c = invCloseButton();
  if (inside(c, x, y)) return { kind: 'button', id: c.id };
  for (const b of allocButtons()) if (inside(b, x, y)) return { kind: 'button', id: b.id };
  return null;
}

/** Düğme kimliğinden stat ve miktarı çözer. Kimlik biçimi tek yerde
 *  tanımlı olsun diye ayrıştırma da burada. */
export function parseAllocId(id: string): { stat: AllocStatId; amount: number } | null {
  const m = /^alloc_(dex|hp)_(\d+)$/.exec(id);
  return m ? { stat: m[1] as AllocStatId, amount: Number(m[2]) } : null;
}

/* ═══════════════════════ YETENEK PANELİ ═══════════════════════ */

/** Aktif bar yuvalarının dikdörtgenleri (üstteki şerit). */
export function skillBarRects(count: number): UiRect[] {
  const w = 96, h = 74, gap = 8;
  const total = count * w + (count - 1) * gap;
  const x0 = PANEL_FRAME.x + (PANEL_FRAME.w - total) / 2;
  const y = PANEL_FRAME.y + 96;
  const out: UiRect[] = [];
  for (let i = 0; i < count; i++) out.push({ x: x0 + i * (w + gap), y, w, h });
  return out;
}

/** Havuzdaki skill satırlarının dikdörtgenleri (alttaki liste). */
/** Havuz hücreleri — maket tablosundan, satır-major (soldan sağa). */
export function skillPoolCells(): UiRect[] {
  const out: UiRect[] = [];
  for (const [y, h] of SKILL_POOL_ROWS) {
    for (const [x, w] of SKILL_POOL_COLS) out.push({ x, y, w, h });
  }
  return out;
}

export function skillPoolRects(count: number): UiRect[] {
  const h = 52, gap = 6;
  const x = PANEL_FRAME.x + 20;
  const w = PANEL_FRAME.w - 40;
  const y0 = PANEL_FRAME.y + 200;
  const out: UiRect[] = [];
  for (let i = 0; i < count; i++) out.push({ x, y: y0 + i * (h + gap), w, h });
  return out;
}

/** Havuz listesinin bir ekrana sığan satır sayısı. Taşan skiller sayfalanır —
 *  panel KAYDIRILMAZ (mobil düzen kuralı: dikey kaydırma yok). */
export const SKILL_PAGE_SIZE = 12;

/* ═══ P2.25 — YETENEK MAKETİ ═══ ölçülen konumlar (sahne pikseli). */
/** Üstteki puan şeridi: solda bilgi, sağda vurgulu kutu. */
export const SKILL_POINT_ROW: UiRect = { x: 40, y: 110, w: 530, h: 51 };
export const SKILL_POINT_BOX: UiRect = { x: 425, y: 114, w: 145, h: 43 };
/** 5 aktif yuva — sütun konumları maketten. */
export const SKILL_BAR_SLOTS: ReadonlyArray<readonly [number, number]> = [
  [59, 78], [165, 78], [273, 72], [375, 75], [480, 78],
];
export const SKILL_BAR_Y = 190;
export const SKILL_BAR_H = 80;
/** Yuva altındaki isim şeridi. */
export const SKILL_BAR_LABEL_Y = 283;
/** Havuz: 2 sütun × 6 satır. */
export const SKILL_POOL_COLS: ReadonlyArray<readonly [number, number]> = [
  [48, 210], [321, 212],
];
export const SKILL_POOL_ROWS: ReadonlyArray<readonly [number, number]> = [
  [329, 76], [416, 76], [503, 76], [590, 80], [677, 76], [763, 80],
];
/** Havuz hücresindeki ikon karesi (sol taraf). */
export const SKILL_POOL_ICON_W = 62;
/** Sayfa şeridi ve okları. */
export const SKILL_PAGE_ROW: UiRect = { x: 190, y: 864, w: 240, h: 43 };

export function skillPageButtons(): Array<UiRect & { id: string; label: string }> {
  const y = PANEL_FRAME.y + PANEL_FRAME.h - 62;
  return [
    { id: 'skill_prev', label: '‹', x: PANEL_FRAME.x + 20, y, w: 72, h: 44 },
    { id: 'skill_next', label: '›', x: PANEL_FRAME.x + PANEL_FRAME.w - 92, y, w: 72, h: 44 },
  ];
}

export type SkillHit =
  | { readonly kind: 'bar'; readonly index: number }
  | { readonly kind: 'pool'; readonly index: number }
  | { readonly kind: 'button'; readonly id: string }
  | null;

/** @param barCount aktif bar yuva sayısı
 *  @param poolCount O SAYFADA görünen havuz satırı sayısı */
export function skillHitTest(
  x: number, y: number, barCount: number, poolCount: number,
): SkillHit {
  const c = invCloseButton();
  if (inside(c, x, y)) return { kind: 'button', id: c.id };
  for (const b of skillPageButtons()) if (inside(b, x, y)) return { kind: 'button', id: b.id };
  const bar = skillBarRects(barCount);
  for (let i = 0; i < bar.length; i++) if (inside(bar[i]!, x, y)) return { kind: 'bar', index: i };
  const pool = skillPoolRects(poolCount);
  for (let i = 0; i < pool.length; i++) if (inside(pool[i]!, x, y)) return { kind: 'pool', index: i };
  return null;
}

/* ═══════════════════════ ÖRS PANELİ ═══════════════════════ */

/** Yükseltilebilir eşyaların listelendiği blok. */
export const FORGE_LIST_BOX: UiRect = {
  x: PANEL_FRAME.x + 20, y: PANEL_FRAME.y + 96,
  w: PANEL_FRAME.w - 40, h: 430,
};

/** Seçilen eşyanın önizleme bloğu (şans, maliyet, uyarı). */
export const FORGE_PREVIEW_BOX: UiRect = {
  x: PANEL_FRAME.x + 20, y: FORGE_LIST_BOX.y + FORGE_LIST_BOX.h + 14,
  w: PANEL_FRAME.w - 40, h: 250,
};

export const FORGE_ROW_H = 46;
export const FORGE_PAGE_SIZE = 9;

export function forgeRowRects(count: number): UiRect[] {
  const out: UiRect[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: FORGE_LIST_BOX.x + 8, y: FORGE_LIST_BOX.y + 28 + i * (FORGE_ROW_H + 4),
      w: FORGE_LIST_BOX.w - 16, h: FORGE_ROW_H,
    });
  }
  return out;
}

export function forgeButtons(): Array<UiRect & { id: string; label: string }> {
  const B = FORGE_PREVIEW_BOX;
  return [
    { id: 'forge_do', label: 'YÜKSELT', x: B.x + 12, y: B.y + B.h - 60, w: 200, h: 48 },
    { id: 'forge_prev', label: '‹', x: B.x + B.w - 160, y: B.y + B.h - 60, w: 70, h: 48 },
    { id: 'forge_next', label: '›', x: B.x + B.w - 82, y: B.y + B.h - 60, w: 70, h: 48 },
  ];
}

export type ForgeHit =
  | { readonly kind: 'row'; readonly index: number }
  | { readonly kind: 'button'; readonly id: string }
  | null;

export function forgeHitTest(x: number, y: number, rowCount: number): ForgeHit {
  const c = invCloseButton();
  if (inside(c, x, y)) return { kind: 'button', id: c.id };
  for (const b of forgeButtons()) if (inside(b, x, y)) return { kind: 'button', id: b.id };
  const rows = forgeRowRects(rowCount);
  for (let i = 0; i < rows.length; i++) if (inside(rows[i]!, x, y)) return { kind: 'row', index: i };
  return null;
}
