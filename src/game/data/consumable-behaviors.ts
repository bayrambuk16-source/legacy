/** Tüketilebilir item davranış katmanı.
 *
 *  Kaynak `items_server` bir iksirin NE yaptığını doğrudan taşımıyor (effect1/effect2
 *  alanları çözülmedi). Bu yüzden davranış burada VERİ olarak tanımlanır — kod içinde
 *  item ID switch'i YOKTUR; ConsumableSystem bu tabloyu okur ve effect kind'ına göre
 *  handler çağırır. Yeni iksir eklemek = buraya satır eklemek. */

export type ConsumableEffect =
  | { kind: 'restoreHp'; percentOfMax: number }
  | { kind: 'restoreMp'; percentOfMax: number }
  | { kind: 'cure'; note: string };

export interface ConsumableBehaviorDef {
  sourceRef: number;
  effects: ConsumableEffect[];
  /** Kullanım sonrası adet düşer mi (false = gelecekteki kalıcı itemler için) */
  consumesOne: boolean;
}

/** KO iksir aileleri → yeni oyun etkileri (CONTENT_MAPPING.md'de belgeli).
 *  "Water of ..." ailesi HP, "Potion of ..." ailesi MP kademeleridir. */
export const CONSUMABLE_BEHAVIORS: ConsumableBehaviorDef[] = [
  { sourceRef: 389011000, consumesOne: true, effects: [{ kind: 'restoreHp', percentOfMax: 0.25 }] }, // Yaşam Suyu
  { sourceRef: 389012000, consumesOne: true, effects: [{ kind: 'restoreHp', percentOfMax: 0.40 }] }, // Sevgi Suyu
  { sourceRef: 389013000, consumesOne: true, effects: [{ kind: 'restoreHp', percentOfMax: 0.65 }] }, // Zarafet Suyu
  { sourceRef: 389014000, consumesOne: true, effects: [{ kind: 'restoreHp', percentOfMax: 1.00 }] }, // Lütuf Suyu
  { sourceRef: 389016000, consumesOne: true, effects: [{ kind: 'restoreMp', percentOfMax: 0.25 }] }, // Ruh İksiri
  { sourceRef: 389017000, consumesOne: true, effects: [{ kind: 'restoreMp', percentOfMax: 0.40 }] }, // Zihin İksiri
  { sourceRef: 389018000, consumesOne: true, effects: [{ kind: 'restoreMp', percentOfMax: 0.65 }] }, // Bilgelik İksiri
  { sourceRef: 389019000, consumesOne: true, effects: [{ kind: 'restoreMp', percentOfMax: 1.00 }] }, // İrfan İksiri
  { sourceRef: 389020000, consumesOne: true, effects: [                                              // Can İksiri
    { kind: 'restoreHp', percentOfMax: 1.00 }, { kind: 'restoreMp', percentOfMax: 1.00 },
  ] },
  { sourceRef: 389010000, consumesOne: true, effects: [{ kind: 'cure', note: 'debuff temizleme — Faz 7' }] },
];
