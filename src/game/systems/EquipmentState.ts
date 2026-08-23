/** 12 slotluk ekipman durumu. UI'a gömülü değildir; slot tanımı buradadır.
 *
 *  DOMAIN INVARIANT'LARI (UI'dan bağımsız, her işlem sonunda geçerli):
 *   I1. inventory.usedSlots <= inventory.capacity  (geçici durumda da bozulmaz)
 *   I2. Bir instanceId aynı anda EN FAZLA bir slotta bulunur
 *       (new Set(Object.values(serialize())).size === Object.values(serialize()).length)
 *   I3. slots map'i ile inventory entry'lerinin equippedSlot alanı her zaman senkron
 *   I4. Slotta duran item'ın equipSlot tipi slot tipiyle uyumlu
 *
 *  UI yalnızca kullanıcıya mesaj gösterir; doğrulama burada yapılır. */
import { Content, type EquipSlotType, type GameItem } from '../data/GameContentRepository.js';
import type { InventoryState, ItemInstance } from './InventoryState.js';

export interface EquipSlotDef { id: string; type: EquipSlotType; label: string }

/** Tam 12 slot (spec): weapon, helmet, chest, pants, gloves, boots, earring×2, ring×2, necklace, belt. */
export const EQUIP_SLOTS: EquipSlotDef[] = [
  { id: 'weapon', type: 'weapon', label: 'Silah' },
  { id: 'helmet', type: 'helmet', label: 'Kask' },
  { id: 'chest', type: 'chest', label: 'Zırh' },
  { id: 'pants', type: 'pants', label: 'Pantolon' },
  { id: 'gloves', type: 'gloves', label: 'Eldiven' },
  { id: 'boots', type: 'boots', label: 'Bot' },
  { id: 'earring1', type: 'earring', label: 'Küpe 1' },
  { id: 'earring2', type: 'earring', label: 'Küpe 2' },
  { id: 'ring1', type: 'ring', label: 'Yüzük 1' },
  { id: 'ring2', type: 'ring', label: 'Yüzük 2' },
  { id: 'necklace', type: 'necklace', label: 'Kolye' },
  { id: 'belt', type: 'belt', label: 'Kemer' },
];

const SLOT_BY_ID = new Map(EQUIP_SLOTS.map((s) => [s.id, s]));

/** Okçu sınıfının ekipman kuralları (yeni oyun kararı; KO rogue karşılığı). */
export const ARCHER_CLASS: { allowedClassCodes: number[]; allowedWeaponKinds: number[] } = {
  allowedClassCodes: [0, 2],
  allowedWeaponKinds: [70, 71], // Bow, Crossbow
};

export type EquipFailReason =
  | 'notFound' | 'notEquippable' | 'wrongClass' | 'levelReq' | 'noSlot' | 'slotTypeMismatch';

/** SAF doğrulama — hem canEquip() hem restore() bunu kullanır; kural kopyalanmaz.
 *  State mutasyonu içermez, bu yüzden restore sırasında da güvenle çağrılabilir.
 *  slotDef verilirse slot tipi uyumu da denetlenir. */
export function validateEquipCandidate(
  item: GameItem | undefined,
  playerLevel: number,
  slotDef?: EquipSlotDef,
): { ok: true } | { ok: false; reason: EquipFailReason } {
  if (!item || !item.equipSlot) return { ok: false, reason: 'notEquippable' };
  if (slotDef && item.equipSlot !== slotDef.type) return { ok: false, reason: 'slotTypeMismatch' };
  const classOk = ARCHER_CLASS.allowedClassCodes.includes(item.classCode)
    && (item.equipSlot !== 'weapon' || ARCHER_CLASS.allowedWeaponKinds.includes(item.kindCode));
  if (!classOk) return { ok: false, reason: 'wrongClass' };
  if (item.reqLevel > playerLevel) return { ok: false, reason: 'levelReq' };
  return { ok: true };
}
export type EquipResult =
  | { ok: true; slotId: string; replacedInstanceId: number | null; alreadyEquipped: boolean }
  | { ok: false; reason: EquipFailReason };

export type UnequipFailReason = 'notEquipped' | 'inventoryFull';
export type UnequipResult = { ok: true; instanceId: number } | { ok: false; reason: UnequipFailReason };

/** restore() denetim raporu — bozuk kaydın hangi girdileri atıldı. */
export interface RestoreReport {
  applied: number;
  rejected: Array<{ slotId: string; instanceId: number; reason: string }>;
}

export class EquipmentState {
  /** slotId -> instanceId */
  private slots = new Map<string, number>();

  constructor(private inventory: InventoryState, private playerLevel: () => number) {}

  equippedInstance(slotId: string): ItemInstance | undefined {
    const id = this.slots.get(slotId);
    return id === undefined ? undefined : this.inventory.get(id);
  }

  equippedItem(slotId: string): GameItem | undefined {
    const inst = this.equippedInstance(slotId);
    return inst ? Content.item(inst.itemRef) : undefined;
  }

  /** Bu instance hangi slotta? (I2 gereği en fazla bir tane) */
  slotOf(instanceId: number): string | null {
    for (const [slotId, id] of this.slots) if (id === instanceId) return slotId;
    return null;
  }

  /** Item tipine uygun hedef slotu bulur: boş olan; ikisi de doluysa ilki (swap). */
  targetSlotFor(item: GameItem): string | null {
    if (!item.equipSlot) return null;
    const candidates = EQUIP_SLOTS.filter((s) => s.type === item.equipSlot);
    if (candidates.length === 0) return null;
    const empty = candidates.find((s) => !this.slots.has(s.id));
    return (empty ?? candidates[0]).id;
  }

  canEquip(instanceId: number): EquipResult {
    const inst = this.inventory.get(instanceId);
    if (!inst) return { ok: false, reason: 'notFound' };
    const item = Content.item(inst.itemRef);
    const check = validateEquipCandidate(item, this.playerLevel());
    if (!check.ok) return { ok: false, reason: check.reason };

    /* Zaten kuşanılıysa mevcut slotunu KORU — asla ikinci slota kopyalanmaz (I2). */
    const current = this.slotOf(instanceId);
    if (current !== null) return { ok: true, slotId: current, replacedInstanceId: null, alreadyEquipped: true };

    const slotId = this.targetSlotFor(item!);
    if (!slotId) return { ok: false, reason: 'noSlot' };
    const replaced = this.slots.get(slotId) ?? null;
    return { ok: true, slotId, replacedInstanceId: replaced, alreadyEquipped: false };
  }

  /** ATOMİK equip: yeni item önce çantadan çıkar, ardından eski item çantaya döner.
   *  Böylece çanta 60/60 iken bile swap sırasında kapasite aşılmaz (I1). */
  equip(instanceId: number): EquipResult {
    const check = this.canEquip(instanceId);
    if (!check.ok || check.alreadyEquipped) return check;
    const { slotId, replacedInstanceId } = check;

    // 1) hedef slotu yeni item'a ver + çantadan düş (usedSlots -1)
    this.slots.set(slotId, instanceId);
    this.inventory.markEquipped(instanceId, slotId);
    // 2) yerinden edilen item çantaya dön (usedSlots +1) → net değişim 0
    if (replacedInstanceId !== null && replacedInstanceId !== instanceId) {
      this.inventory.markEquipped(replacedInstanceId, null);
    }
    return check;
  }

  /** Çanta doluysa REDDEDER — domain garantisi, UI kontrolüne bağlı değil (I1). */
  unequip(slotId: string): UnequipResult {
    const id = this.slots.get(slotId);
    if (id === undefined) return { ok: false, reason: 'notEquipped' };
    if (this.inventory.isFull) return { ok: false, reason: 'inventoryFull' };
    this.slots.delete(slotId);
    this.inventory.markEquipped(id, null);
    return { ok: true, instanceId: id };
  }

  /** Tüm kuşanılmış instance'lar (stat hesabı ve save için). */
  allEquipped(): Array<{ slotId: string; instance: ItemInstance; item: GameItem }> {
    const out: Array<{ slotId: string; instance: ItemInstance; item: GameItem }> = [];
    for (const [slotId, id] of this.slots) {
      const instance = this.inventory.get(id);
      const item = instance ? Content.item(instance.itemRef) : undefined;
      if (instance && item) out.push({ slotId, instance, item });
    }
    return out.sort((a, b) => a.slotId.localeCompare(b.slotId));
  }

  /** Save yükleme — kaydı KÖRÜ KÖRÜNE kabul etmez.
   *  NOT: Bu bir güvenlik önlemi DEĞİLDİR (kayıt istemci tarafındadır ve kullanıcı
   *  tarafından değiştirilebilir); amaç bozuk/eski state'e karşı dayanıklılıktır. */
  restore(slotMap: Record<string, number>): RestoreReport {
    const report: RestoreReport = { applied: 0, rejected: [] };
    this.slots.clear();
    // I3: önce tüm entry'lerin equippedSlot bayrağı sıfırlanır, sonra doğrulananlar işlenir
    this.inventory.clearAllEquippedFlags();

    const seen = new Set<number>();
    for (const [slotId, instanceId] of Object.entries(slotMap ?? {})) {
      const reject = (reason: string): void => { report.rejected.push({ slotId, instanceId, reason }); };
      const slotDef = SLOT_BY_ID.get(slotId);
      if (!slotDef) { reject('bilinmeyen slot ID'); continue; }
      if (typeof instanceId !== 'number' || !Number.isFinite(instanceId)) { reject('geçersiz instanceId'); continue; }
      if (seen.has(instanceId)) { reject('duplicate instanceId'); continue; }
      const inst = this.inventory.get(instanceId);
      if (!inst) { reject('envanterde yok'); continue; }
      const item = Content.item(inst.itemRef);
      if (!item) { reject('item tanımı yok'); continue; }
      /* Normal equip kuralları restore'da da uygulanır (aynı saf fonksiyon). */
      const check = validateEquipCandidate(item, this.playerLevel(), slotDef);
      if (!check.ok) {
        reject(check.reason === 'slotTypeMismatch'
          ? `slot tipi uyuşmuyor (${item.equipSlot} → ${slotDef.type})`
          : check.reason === 'wrongClass' ? 'sınıf kuralına uymuyor'
          : check.reason === 'levelReq' ? `seviye yetersiz (Sv ${item.reqLevel})`
          : 'kuşanılamaz');
        continue;
      }
      seen.add(instanceId);
      this.slots.set(slotId, instanceId);
      this.inventory.markEquipped(instanceId, slotId);
      report.applied += 1;
    }
    return report;
  }

  serialize(): Record<string, number> {
    return Object.fromEntries([...this.slots.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }

  clear(): void {
    for (const [, id] of this.slots) this.inventory.markEquipped(id, null);
    this.slots.clear();
  }
}
