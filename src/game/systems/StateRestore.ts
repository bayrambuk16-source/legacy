/** Kayıt geri yükleme koordinatörü — sıra ve final normalizasyon TEK yerde.
 *
 *  Zincir:
 *    1) InventoryState.restore()  — entry'leri temizler, TÜM equippedSlot bayraklarını
 *                                   null'lar (kaydın bayraklarına güvenilmez).
 *    2) EquipmentState.restore()  — slot map'ini normal equip kurallarıyla doğrular
 *                                   (slot tipi + sınıf + silah türü + seviye) ve
 *                                   yalnız geçerli olanları işaretler.
 *    3) InventoryState.enforceCapacity() — kapasiteyi aşan çanta entry'lerini
 *                                   deterministik olarak düşürür.
 *
 *  Bu sıra sonunda şu invariant KESİN sağlanır:
 *    inventory.usedSlots <= inventory.capacity
 *
 *  NOT: Güvenlik doğrulaması değildir (kayıt istemci tarafında ve düzenlenebilir);
 *  amaç bozuk state'e karşı dayanıklılıktır — crash yerine raporlanabilir düşüş. */
import type { InventoryState, ItemInstance } from './InventoryState.js';
import type { EquipmentState } from './EquipmentState.js';
import type { PlayerState } from './PlayerState.js';

export interface StateRestoreReport {
  inventory: { accepted: number; droppedInvalid: number };
  equipment: { applied: number; rejected: Array<{ slotId: string; instanceId: number; reason: string }> };
  capacity: { dropped: Array<{ instanceId: number; itemRef: number; reason: string }> };
  /** Zincir sonrası doğrulanan invariant durumu. */
  invariantOk: boolean;
}

/** TAM profil geri yükleme — sıra burada tanımlıdır ve BAŞKA YERDE KOPYALANMAZ:
 *
 *    1) player progression (level / exp / coins)
 *         → ekipman doğrulaması KAYITLI seviyeyle yapılsın diye ÖNCE gelir
 *    2) inventory restore → equipment restore → enforceCapacity
 *         → final CharacterStats bu adımdan sonra doğru değerleri üretir
 *    3) player vitals (HP / MP) clamp
 *         → ekipmandan gelen maxHp/maxMp bonusları hesaba katılmış olur
 *
 *  GameState.loadOrNew() yalnızca bu fonksiyonu çağırır. */
export function restoreProfile(
  systems: { player: PlayerState; inventory: InventoryState; equipment: EquipmentState },
  data: {
    player: Partial<{ level: number; exp: number; coins: number; hp: number; mp: number }>;
    inventory: { entries: ItemInstance[]; nextInstanceId: number };
    equipment: Record<string, number>;
  },
): StateRestoreReport {
  // 1) progression — ekipman seviye şartı bu değerlerle denetlenir
  systems.player.restoreProgression(data.player);

  // 2) envanter + ekipman + kapasite
  const report = restoreInventoryAndEquipment(systems.inventory, systems.equipment, {
    entries: data.inventory?.entries ?? [],
    nextInstanceId: data.inventory?.nextInstanceId ?? 1,
    equipment: data.equipment ?? {},
  });

  // 3) vitals — final statlar (ekipman bonusları dahil) oluştuktan SONRA clamp
  systems.player.restoreVitals(data.player);

  return report;
}

export function restoreInventoryAndEquipment(
  inventory: InventoryState,
  equipment: EquipmentState,
  data: { entries: ItemInstance[]; nextInstanceId: number; equipment: Record<string, number> },
): StateRestoreReport {
  const invReport = inventory.restore(data.entries, data.nextInstanceId);
  const eqReport = equipment.restore(data.equipment ?? {});
  const capReport = inventory.enforceCapacity();

  /* Kapasite düşürmesi kuşanılı bir instance'ı silmiş olamaz (enforceCapacity yalnız
     çanta entry'lerine dokunur); yine de map/entry senkronunu son kez doğrula. */
  for (const { slotId, instance } of equipment.allEquipped()) {
    if (instance.equippedSlot !== slotId) inventory.markEquipped(instance.instanceId, slotId);
  }

  return {
    inventory: invReport,
    equipment: eqReport,
    capacity: capReport,
    invariantOk: inventory.usedSlots <= inventory.capacity,
  };
}
