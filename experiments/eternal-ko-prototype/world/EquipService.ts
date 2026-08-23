/** EQUIP SERVİSİ — P1.8 (§16/§17/§18)
 *
 *  Ana `EquipmentState` (src/) "hangi item hangi slotta" bilgisinin
 *  AUTHORITATIVE sahibidir ve DEĞİŞTİRİLMEDİ. Bu katman onun üzerine
 *  Project Legacy kapılarını ekler:
 *
 *    · katalogda tanımlı mı?            (uydurma item kuşanılmaz)
 *    · `allowedClasses` karakter sınıfı  (§18)
 *    · `requiredLevel`                   (§17)
 *    · doğru slot tipi                   (§16)
 *
 *  ══════════ ATOMİKLİK ══════════
 *  Sıra: DOĞRULA → PLANLA → UYGULA. Doğrulama aşamasında hiçbir mutasyon
 *  yoktur. Ana `EquipmentState.equip()` swap'i zaten atomik yapar (yeni item
 *  önce çantadan çıkar, sonra eski item çantaya döner) — bu yüzden çanta
 *  60/60 iken bile kapasite aşılmaz ve item KAYBOLMAZ.
 *
 *  ══════════ GEREKSİNİM UYDURULMADI (§17) ══════════
 *  Kaynakta `req_str` / `req_dex` / `req_intel` ALANLARI VARDIR (yaylarda
 *  `req_dex` 56–88 aralığında). Project Legacy karakteri şu an bu ölçekte bir
 *  primary stat sistemine SAHİP DEĞİLDİR (taban DEX = 0, ekipman DEX'i tek
 *  haneli), bu yüzden stat gereksinimi UYGULANMAZ ve `NOT VERIFIED / deferred`
 *  olarak raporlanır. Kaynak değerleri `source` içinde taşınmaya devam eder. */
import { Content } from '../../../src/game/data/GameContentRepository.js';
import type { EquipmentState } from '../../../src/game/systems/EquipmentState.js';
import type { InventoryState } from '../../../src/game/systems/InventoryState.js';
import { itemDefinition } from '../data/item-catalog.js';
import type { ItemDefinition, PlayerClass } from '../data/item-model.js';

export type EquipFail =
  | 'notFound'          // envanterde böyle bir instance yok
  | 'noDefinition'      // Project Legacy katalogunda tanım yok
  | 'wrongClass'        // karakter sınıfı izinli değil
  | 'levelReq'          // seviye yetersiz
  | 'slotMismatch'      // slot tipi uyuşmuyor
  | 'noSlot'            // bu tip için slot yok
  | 'inventoryFull';    // eski item çantaya dönemez

export type EquipOutcome =
  | { ok: true; slotId: string; definition: ItemDefinition; replacedInstanceId: number | null; alreadyEquipped: boolean }
  | { ok: false; reason: EquipFail };

export type UnequipOutcome =
  | { ok: true; slotId: string; instanceId: number; definition: ItemDefinition | null }
  | { ok: false; reason: 'notEquipped' | 'inventoryFull' };

export interface EquipDeps {
  equipment: EquipmentState;
  inventory: InventoryState;
  playerLevel: () => number;
  playerClass: () => PlayerClass;
}

export class EquipService {
  constructor(private deps: EquipDeps) {}

  /** SAF DOĞRULAMA — hiçbir mutasyon yapmaz. */
  validate(instanceId: number): EquipOutcome {
    const inst = this.deps.inventory.get(instanceId);
    if (!inst) return { ok: false, reason: 'notFound' };
    const def = itemDefinition(inst.itemRef);
    if (!def) return { ok: false, reason: 'noDefinition' };
    if (!def.allowedClasses.includes(this.deps.playerClass())) {
      return { ok: false, reason: 'wrongClass' };
    }
    if (def.requiredLevel > this.deps.playerLevel()) return { ok: false, reason: 'levelReq' };

    const current = this.deps.equipment.slotOf(instanceId);
    if (current !== null) {
      return { ok: true, slotId: current, definition: def, replacedInstanceId: null, alreadyEquipped: true };
    }
    /* Hedef slot seçimi ANA SİSTEMİN kuralıdır (boş olan; ikisi de doluysa
       ilki = swap). Kural kopyalanmaz; kaynak item kaydı üzerinden sorulur.
       Katalog `equipSlot`'u kaynak kaydıyla AYNI olmalıdır — testle korunuyor. */
    const sourceItem = Content.item(inst.itemRef);
    if (!sourceItem || sourceItem.equipSlot !== def.equipSlot) {
      return { ok: false, reason: 'slotMismatch' };
    }
    const target = this.deps.equipment.targetSlotFor(sourceItem);
    if (!target) return { ok: false, reason: 'noSlot' };
    const replaced = this.deps.equipment.equippedInstance(target)?.instanceId ?? null;
    return { ok: true, slotId: target, definition: def, replacedInstanceId: replaced, alreadyEquipped: false };
  }

  /** DOĞRULA → PLANLA → UYGULA. Başarısızlıkta HİÇBİR mutasyon olmaz. */
  equip(instanceId: number): EquipOutcome {
    const plan = this.validate(instanceId);
    if (!plan.ok || plan.alreadyEquipped) return plan;
    /* Ana sistemin atomik swap'i: kapasite aşılmaz, item kaybolmaz. */
    const res = this.deps.equipment.equip(instanceId);
    if (!res.ok) {
      const map: Record<string, EquipFail> = {
        notFound: 'notFound', notEquippable: 'noDefinition', wrongClass: 'wrongClass',
        levelReq: 'levelReq', noSlot: 'noSlot', slotTypeMismatch: 'slotMismatch',
      };
      return { ok: false, reason: map[res.reason] ?? 'noDefinition' };
    }
    return plan;
  }

  /** Çanta doluysa REDDEDER — item asla kaybolmaz. */
  unequip(slotId: string): UnequipOutcome {
    const inst = this.deps.equipment.equippedInstance(slotId);
    const def = inst ? itemDefinition(inst.itemRef) ?? null : null;
    const res = this.deps.equipment.unequip(slotId);
    if (!res.ok) return { ok: false, reason: res.reason };
    return { ok: true, slotId, instanceId: res.instanceId, definition: def };
  }

  /** Bu instance şu an kuşanılı mı? */
  slotOf(instanceId: number): string | null { return this.deps.equipment.slotOf(instanceId); }
}
