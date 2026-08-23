/** GENIE PANELİ YERLEŞİMİ — SAF KATMAN (P2.25)
 *
 *  ══════════════ ÖLÇÜLDÜ, TÜRETİLMEDİ ══════════════
 *  Bütün konumlar maketin (941×1672) koyu bloklarından çıkarıldı ve
 *  sahne ölçüsüne indirildi (620×1100, çarpan 0,659). Formülle
 *  türetmek envanterde yanılmama sebep olmuştu: maketler eşit aralıklı
 *  değil ve tek bir adım varsaymak satırları kaydırıyor.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. */

import type { UiRect } from './inventory-panel.js';

export const GENIE_PANEL: UiRect = { x: 0, y: 0, w: 620, h: 1100 };

/** Ana aç/kapa satırı: solda etiket, sağda büyük anahtar. */
export const GENIE_MASTER_ROW: UiRect = { x: 45, y: 111, w: 530, h: 58 };
export const GENIE_MASTER_TOGGLE: UiRect = { x: 400, y: 116, w: 155, h: 48 };

/** Üç set sekmesi — sütun konumları maketten. */
export const GENIE_SET_TABS: ReadonlyArray<readonly [number, number]> = [
  [52, 161], [229, 158], [406, 160],
];
export const GENIE_SET_TAB_Y = 196;
export const GENIE_SET_TAB_H = 50;

/** Beş skill yuvası ve altındaki isim şeritleri. */
export const GENIE_SKILL_SLOTS: ReadonlyArray<readonly [number, number]> = [
  [63, 74], [167, 78], [275, 69], [374, 79], [478, 74],
];
export const GENIE_SKILL_Y = 324;
export const GENIE_SKILL_H = 74;
export const GENIE_SKILL_LABEL_Y = 416;
/** Sağ üstteki mod düğmesi. */
export const GENIE_MODE_BTN: UiRect = { x: 528, y: 275, w: 42, h: 42 };

/** DÖRT KAYDIRICI. Her satır: etiket şeridi + [sol ok, çubuk, sağ ok, değer].
 *  `label` etiket şeridinin y'si, `track` çubuğun y'si. */
export interface SliderRow {
  readonly id: SliderId;
  readonly labelY: number;
  readonly trackY: number;
}

export type SliderId = 'hpThreshold' | 'mpThreshold' | 'attackRange' | 'farmRadius';

export const GENIE_SLIDERS: readonly SliderRow[] = [
  { id: 'hpThreshold', labelY: 461, trackY: 500 },
  { id: 'mpThreshold', labelY: 546, trackY: 585 },
  { id: 'attackRange', labelY: 617, trackY: 656 },
  { id: 'farmRadius', labelY: 688, trackY: 727 },
];

/** Kaydırıcı satırının yatay bölümleri — dördünde de aynı. */
export const SLIDER_LEFT_BTN = { x: 58, w: 40, h: 36 } as const;
export const SLIDER_TRACK = { x: 106, w: 320 } as const;
export const SLIDER_RIGHT_BTN = { x: 434, w: 40, h: 36 } as const;
export const SLIDER_VALUE_BOX = { x: 482, w: 90, h: 36 } as const;
/** Tutamağın çapı — parmakla yakalanabilir olmalı. */
export const SLIDER_HANDLE = 26;

/** DÖRT AÇMA/KAPAMA satırı: solda etiket, sağda kare kutu. */
export type ToggleId = 'farmBoundary' | 'showBoundary' | 'autoEquip' | 'autoSell';

export const GENIE_TOGGLES: ReadonlyArray<{ id: ToggleId; y: number }> = [
  { id: 'farmBoundary', y: 776 },
  { id: 'showBoundary', y: 814 },
  { id: 'autoEquip', y: 853 },
  { id: 'autoSell', y: 891 },
];
export const TOGGLE_ROW = { x: 52, w: 460, h: 28 } as const;
export const TOGGLE_BOX = { x: 517, w: 30, h: 28 } as const;

const inside = (r: { x: number; y: number; w: number; h: number }, x: number, y: number): boolean =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export type GenieHit =
  | { readonly kind: 'master' }
  | { readonly kind: 'set'; readonly index: number }
  | { readonly kind: 'slot'; readonly index: number }
  | { readonly kind: 'mode' }
  | { readonly kind: 'sliderStep'; readonly id: SliderId; readonly dir: -1 | 1 }
  | { readonly kind: 'sliderDrag'; readonly id: SliderId; readonly ratio: number }
  | { readonly kind: 'toggle'; readonly id: ToggleId }
  | null;

/** Dokunma çözümlemesi. Kaydırıcıda çubuk BÜTÜN uzunluğu boyunca
 *  yakalanır — yalnız tutamağa dokunmayı beklemek mobilde işkencedir. */
export function genieHitTest(x: number, y: number): GenieHit {
  if (inside(GENIE_MASTER_TOGGLE, x, y)) return { kind: 'master' };
  if (inside(GENIE_MODE_BTN, x, y)) return { kind: 'mode' };

  for (let i = 0; i < GENIE_SET_TABS.length; i++) {
    const [tx, tw] = GENIE_SET_TABS[i]!;
    if (inside({ x: tx, y: GENIE_SET_TAB_Y, w: tw, h: GENIE_SET_TAB_H }, x, y)) {
      return { kind: 'set', index: i };
    }
  }
  for (let i = 0; i < GENIE_SKILL_SLOTS.length; i++) {
    const [sx, sw] = GENIE_SKILL_SLOTS[i]!;
    if (inside({ x: sx, y: GENIE_SKILL_Y, w: sw, h: GENIE_SKILL_H }, x, y)) {
      return { kind: 'slot', index: i };
    }
  }
  for (const s of GENIE_SLIDERS) {
    const h = SLIDER_LEFT_BTN.h;
    if (inside({ x: SLIDER_LEFT_BTN.x, y: s.trackY, w: SLIDER_LEFT_BTN.w, h }, x, y)) {
      return { kind: 'sliderStep', id: s.id, dir: -1 };
    }
    if (inside({ x: SLIDER_RIGHT_BTN.x, y: s.trackY, w: SLIDER_RIGHT_BTN.w, h }, x, y)) {
      return { kind: 'sliderStep', id: s.id, dir: 1 };
    }
    /* Çubuk dokunma alanı DİKEYDE GENİŞLETİLİR: görsel çubuk ince ama
       parmak kalın. */
    if (inside({ x: SLIDER_TRACK.x, y: s.trackY - 8, w: SLIDER_TRACK.w, h: h + 16 }, x, y)) {
      const ratio = Math.min(1, Math.max(0, (x - SLIDER_TRACK.x) / SLIDER_TRACK.w));
      return { kind: 'sliderDrag', id: s.id, ratio };
    }
  }
  for (const t of GENIE_TOGGLES) {
    if (inside({ x: TOGGLE_ROW.x, y: t.y, w: TOGGLE_ROW.w + 80, h: TOGGLE_ROW.h }, x, y)) {
      return { kind: 'toggle', id: t.id };
    }
  }
  return null;
}
