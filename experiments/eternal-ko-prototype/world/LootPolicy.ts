/** AUTO LOOT TERCİHİ — P1.7
 *
 *  ══ KANONİK DAVRANIŞ ══
 *  Auto Loot AÇIK/KAPALI bir OYUNCU TERCİHİDİR. **MESAFEYE BAĞLI DEĞİLDİR.**
 *  Karar DROP ANINDA verilir (`world/DropSystem.ts`): drop oyuncuya aitse
 *  mob 1000 birim uzakta ölse bile doğrudan envantere/cüzdana girer.
 *
 *  ══ P1.7'DE KALDIRILAN ══
 *  Eski `autoRadius` (90 / 300 / 600 / 1200) ve yarıçap taraması YAPAN
 *  `autoPickup()` KALDIRILDI. Auto Loot artık skill menzili, Farm Boundary
 *  veya oyuncu mesafesiyle İLİŞKİLİ DEĞİLDİR.
 *
 *  ══ GENIE'DEN BAĞIMSIZ ══
 *  Genie kapalıyken manuel öldürülen mobun dropu da bu tercihe uyar. Genie
 *  loot toplamak için HAREKET ETMEZ ve yerdeki lootu kovalamaz (§20). */

export type LootMode = 'manual' | 'auto';
export const LOOT_MODES: LootMode[] = ['manual', 'auto'];
export const LOOT_MODE_LABELS: Record<LootMode, string> = {
  manual: 'MANUEL', auto: 'OTOMATİK',
};

export interface LootSettings {
  /** 'auto' = Auto Loot AÇIK · 'manual' = her drop yere düşer. */
  mode: LootMode;
}

export const LOOT_DEFAULTS: LootSettings = { mode: 'auto' };

export class LootPolicy {
  settings: LootSettings = { ...LOOT_DEFAULTS };

  get mode(): LootMode { return this.settings.mode; }
  /** Auto Loot açık mı? `DropSystem` teslimat kararını buradan okur. */
  get autoLoot(): boolean { return this.settings.mode === 'auto'; }

  setMode(mode: LootMode): void { this.settings.mode = mode; }
  toggleMode(): LootMode {
    this.settings.mode = this.settings.mode === 'manual' ? 'auto' : 'manual';
    return this.settings.mode;
  }
}
