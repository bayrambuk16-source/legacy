/** EKİPMAN DIŞI EŞYALAR — AÇIKLAMA KATMANI (P2.20)
 *
 *  ══════════════ NEDEN VAR ══════════════
 *  Envanterde ekipman olmayan bir eşya seçilince panel "Bu eşya
 *  kuşanılamaz (katalogda yok)" diyordu. Bu mesaj YANILTICIYDI: eşya
 *  bozuk değil, sadece ekipman değil. Parşömen, iksir ve satılık ganimet
 *  tasarım gereği kuşanılmaz.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. */

import { SCROLL_ITEM_REF } from '../world/ForgeSystem.js';
import { HP_POTION_REF, MP_POTION_REF, TROPHY_ITEM_REF } from '../world/DropSystem.js';

export type NonGearRole = 'scroll' | 'potion' | 'trophy' | 'unknown';

export interface NonGearInfo {
  readonly role: NonGearRole;
  /** Ne işe yaradığı — tek satır. */
  readonly purpose: string;
  /** Oyuncunun ne yapması gerektiği. */
  readonly action: string;
}

const INFO: Readonly<Record<NonGearRole, Omit<NonGearInfo, 'role'>>> = {
  scroll: {
    purpose: 'Örs malzemesi — eşya yükseltmek için gerekir.',
    action: 'Örs ekranında kullanılır. Biriktir.',
  },
  potion: {
    purpose: 'Can ya da mana yeniler.',
    action: 'Genie ayarlarından otomatik içirilebilir.',
  },
  trophy: {
    purpose: 'Değerli ganimet — kuşanılmaz, yalnız satılır.',
    action: 'Menü → Satış ekranından sat.',
  },
  unknown: {
    purpose: 'Bu eşyanın Project Legacy karşılığı henüz tanımlı değil.',
    action: 'Şimdilik satılabilir.',
  },
};

/** Ekipman OLMAYAN bir eşyanın rolü. Bilinen referanslar açıkça
 *  eşlenir; kalanı `unknown` olur ve bu bir HATA DEĞİL, kapsam
 *  bilgisidir (kaynak katalog 62 binden fazla item taşıyor). */
export function nonGearRole(itemRef: number): NonGearRole {
  if (itemRef === SCROLL_ITEM_REF) return 'scroll';
  if (itemRef === TROPHY_ITEM_REF) return 'trophy';
  if (itemRef === HP_POTION_REF || itemRef === MP_POTION_REF) return 'potion';
  return 'unknown';
}

export function nonGearInfo(itemRef: number): NonGearInfo {
  const role = nonGearRole(itemRef);
  return { role, ...INFO[role] };
}

/** Rol → renk anahtarı. Sunu katmanı bunu kendi paletine çevirir. */
export const NON_GEAR_COLOR: Readonly<Record<NonGearRole, string>> = {
  scroll: '#c9a05a',
  potion: '#6f8fd0',
  trophy: '#e08a3c',
  unknown: '#6f655a',
};
