/** ÖRS SİSTEMİ — YÜKSELTMENİN TEK KAPISI (P2.8)
 *
 *  ══════════════ TEK MUTASYON KAPISI ══════════════
 *  Bir eşyanın `upgradeLevel`i YALNIZ burada değişir; envanterden altın ve
 *  parşömen YALNIZ burada düşer. Panel karar vermez, sonucu gösterir.
 *
 *  ══════════════ REDDEDİLEN DENEME HİÇBİR ŞEY HARCAMAZ ══════════════
 *  Ön kontroller (kilit, altın, parşömen, tavan) TAMAMEN geçilmeden hiçbir
 *  mutasyon yapılmaz. `EquipService` ile aynı desen: `{ ok:false, reason }`.
 *
 *  ══════════════ ZAR TOHUMLU AKIŞTAN GELİR ══════════════
 *  `Math.random()` KULLANILMAZ; `Rng` `PrototypeState`'in tohumlu akışıdır,
 *  böylece testler tekrar üretilebilir.
 *
 *  ══════════════ BAŞARISIZLIK: EŞYA YANAR ══════════════
 *  Kullanıcı kararı. Kuşanılı eşya yanarsa yuva da boşalır — envanterde
 *  hayalet bir kayıt kalmaz. */

import type { Rng } from '../../../src/engine/rng.js';
import type { InventoryState } from '../../../src/game/systems/InventoryState.js';
import type { PlayerState } from '../../../src/game/systems/PlayerState.js';
import type { EquipmentState } from '../../../src/game/systems/EquipmentState.js';
import { itemDefinition } from '../data/item-catalog.js';
import {
  canAttempt, goldCost, scrollCost, successChance,
  type ForgeOutcome,
} from '../data/forge-model.js';

/** Yükseltme parşömeninin kaynak referansı.
 *  KAYNAK: `items.json` → 379016000 "Upgrade Scroll (High Class Item)".
 *  Görünen ad `content_overrides.json` üzerinden Türkçeleştirildi. */
export const SCROLL_ITEM_REF = 379016000;

export interface ForgeDeps {
  rng: Rng;
  inventory: InventoryState;
  equipment: EquipmentState;
  player: PlayerState;
}

export class ForgeSystem {
  private deps: ForgeDeps;

  constructor(deps: ForgeDeps) { this.deps = deps; }

  /** Envanterdeki parşömen adedi. */
  scrollCount(): number {
    return this.deps.inventory.count(SCROLL_ITEM_REF);
  }

  /** Bir denemenin sonucu. Reddedilirse HİÇBİR mutasyon olmaz. */
  upgrade(instanceId: number): ForgeOutcome {
    const inv = this.deps.inventory;
    const inst = inv.get(instanceId);
    if (!inst) return { ok: false, reason: 'notFound' };
    if (inst.locked) return { ok: false, reason: 'locked' };
    const def = itemDefinition(inst.itemRef);
    if (!def) return { ok: false, reason: 'noDefinition' };

    const from = inst.upgradeLevel;
    if (!canAttempt(from)) return { ok: false, reason: 'maxLevel' };

    const gold = goldCost(from);
    const scrolls = scrollCost(from);
    if (this.deps.player.coins < gold) return { ok: false, reason: 'noGold' };
    if (this.scrollCount() < scrolls) return { ok: false, reason: 'noScroll' };

    /* ---- buradan sonrası TAAHHÜT: malzeme kesin gider ---- */
    this.deps.player.coins -= gold;
    inv.removeByRef(SCROLL_ITEM_REF, scrolls);

    const chance = successChance(from);
    const roll = this.deps.rng();
    if (roll < chance) {
      inst.upgradeLevel = from + 1;
      return { ok: true, success: true, newLevel: inst.upgradeLevel, goldSpent: gold, scrollsSpent: scrolls, chance };
    }

    /* BAŞARISIZ → eşya yanar. Kuşanılıysa önce yuva boşalır ki ekipman
       durumu envanterde olmayan bir instance'a işaret etmesin. */
    if (inst.equippedSlot !== null) this.deps.equipment.unequip(inst.equippedSlot);
    inv.remove(instanceId, inst.quantity);
    return { ok: true, success: false, burned: true, goldSpent: gold, scrollsSpent: scrolls, chance };
  }
}
