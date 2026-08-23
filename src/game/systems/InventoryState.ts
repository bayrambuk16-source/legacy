/** Envanter — gerçek item instance modeli (Faz 4).
 *  Her entry: instanceId, itemRef, quantity, upgradeLevel, locked, equippedSlot.
 *  Stackable (tüketilebilir) itemler quantity ile birikir; non-stackable her
 *  biri ayrı instance'tır. Kuşanılmış itemler kapasite SAYILMAZ (tasarım kararı,
 *  Legacy kuralı). Kapasite dolunca add() reddeder — çağıran "Inventory Full"
 *  akışını yönetir, item kaybolmaz. */
import { Content, type GameItem } from '../data/GameContentRepository.js';

export interface ItemInstance {
  instanceId: number;
  itemRef: number;
  quantity: number;
  upgradeLevel: number;
  locked: boolean;
  equippedSlot: string | null;
}

export const INVENTORY_CAPACITY = 60;

export type AddResult = { ok: true; instance: ItemInstance } | { ok: false; reason: 'full' };

/** restore() denetim raporu. */
export interface InventoryRestoreReport {
  accepted: number;
  droppedInvalid: number;
}
/** Kapasite normalizasyonu raporu (restore zincirinin SONUNDA çalışır). */
export interface CapacityReport {
  dropped: Array<{ instanceId: number; itemRef: number; reason: 'overCapacity' }>;
}

export class InventoryState {
  private entries: ItemInstance[] = [];
  private nextInstanceId = 1;

  /** Çantada yer kaplayan entry sayısı (kuşanılanlar hariç). */
  get usedSlots(): number {
    return this.entries.filter((e) => e.equippedSlot === null).length;
  }
  get capacity(): number { return INVENTORY_CAPACITY; }
  get isFull(): boolean { return this.usedSlots >= INVENTORY_CAPACITY; }

  get totalItems(): number {
    return this.entries.reduce((a, e) => a + e.quantity, 0);
  }

  /** Yeni item ekler. Stackable ise mevcut yığına eklenir (upgradeLevel 0 yığını). */
  add(itemRef: number, opts: { quantity?: number; upgradeLevel?: number } = {}): AddResult {
    const item = Content.item(itemRef);
    const qty = opts.quantity ?? 1;
    const upgrade = opts.upgradeLevel ?? item?.baseUpgradeLevel ?? 0;

    if (item?.stackable) {
      const stack = this.entries.find((e) => e.itemRef === itemRef && e.equippedSlot === null && !e.locked);
      if (stack) { stack.quantity += qty; return { ok: true, instance: stack }; }
    }
    if (this.isFull) return { ok: false, reason: 'full' };
    const instance: ItemInstance = {
      instanceId: this.nextInstanceId++,
      itemRef, quantity: qty, upgradeLevel: upgrade,
      locked: false, equippedSlot: null,
    };
    this.entries.push(instance);
    return { ok: true, instance };
  }

  get(instanceId: number): ItemInstance | undefined {
    return this.entries.find((e) => e.instanceId === instanceId);
  }

  remove(instanceId: number, quantity = 1): boolean {
    const e = this.get(instanceId);
    if (!e || e.locked || e.equippedSlot !== null) return false;
    if (e.quantity > quantity) { e.quantity -= quantity; return true; }
    this.entries = this.entries.filter((x) => x.instanceId !== instanceId);
    return true;
  }

  setLocked(instanceId: number, locked: boolean): boolean {
    const e = this.get(instanceId);
    if (!e) return false;
    e.locked = locked;
    return true;
  }

  /** EquipmentState tarafından çağrılır — doğrudan kullanma. */
  markEquipped(instanceId: number, slot: string | null): void {
    const e = this.get(instanceId);
    if (e) e.equippedSlot = slot;
  }

  /** EquipmentState.restore() tarafından çağrılır: tüm kuşanılma bayrakları sıfırlanır,
   *  ardından yalnız doğrulanan slot eşlemesi yeniden işaretlenir (senkronizasyon). */
  clearAllEquippedFlags(): void {
    for (const e of this.entries) e.equippedSlot = null;
  }

  /** Bu item için üzerine eklenebilecek açık bir yığın var mı? (MerchantSystem kapasite
   *  hesabı için — stackable alışta yeni slot gerekmeyebilir.) */
  hasOpenStack(itemRef: number): boolean {
    const item = Content.item(itemRef);
    if (!item?.stackable) return false;
    return this.entries.some((e) => e.itemRef === itemRef && e.equippedSlot === null && !e.locked);
  }

  /** Rollback yardımcısı: verilen itemRef'ten toplam `quantity` adedi çantadan siler
   *  (kilitli/kuşanılı olanlara dokunmaz). Silinen adedi döner. */
  removeByRef(itemRef: number, quantity: number): number {
    let left = quantity;
    for (const e of [...this.entries].sort((a, b) => b.instanceId - a.instanceId)) {
      if (left <= 0) break;
      if (e.itemRef !== itemRef || e.locked || e.equippedSlot !== null) continue;
      const take = Math.min(left, e.quantity);
      if (take >= e.quantity) this.entries = this.entries.filter((x) => x.instanceId !== e.instanceId);
      else e.quantity -= take;
      left -= take;
    }
    return quantity - left;
  }

  /** Tüketim ön-koşulu — ConsumableSystem etkileri UYGULAMADAN ÖNCE bunu sorar.
   *  Kural tek yerde: kilitli veya kuşanılı item tüketilemez. */
  canConsume(instanceId: number, quantity = 1): { ok: true } | { ok: false; reason: 'notFound' | 'locked' | 'equipped' | 'empty' } {
    const e = this.get(instanceId);
    if (!e) return { ok: false, reason: 'notFound' };
    if (e.locked) return { ok: false, reason: 'locked' };
    if (e.equippedSlot !== null) return { ok: false, reason: 'equipped' };
    if (e.quantity < quantity) return { ok: false, reason: 'empty' };
    return { ok: true };
  }

  /** ATOMİK tüketim: canConsume() geçerse adedi düşürür, aksi halde HİÇBİR şey yapmaz.
   *  Domain API'sidir — Scene/ConsumableSystem kendi kuralını kurmaz. */
  consume(instanceId: number, quantity = 1): boolean {
    if (!this.canConsume(instanceId, quantity).ok) return false;
    return this.remove(instanceId, quantity);
  }

  count(itemRef: number): number {
    return this.entries.filter((e) => e.itemRef === itemRef).reduce((a, e) => a + e.quantity, 0);
  }

  /** Çanta görünümü: kuşanılmamış entryler, instanceId sırasıyla. */
  bagList(): Array<{ item: GameItem | undefined; entry: ItemInstance }> {
    return this.entries
      .filter((e) => e.equippedSlot === null)
      .sort((a, b) => a.instanceId - b.instanceId)
      .map((entry) => ({ item: Content.item(entry.itemRef), entry }));
  }

  /** Tüm entryler (save için). */
  allEntries(): ItemInstance[] { return [...this.entries]; }

  /** Save yükleme: durumu tamamen değiştirir. Bozuk girdiler (eksik alan, geçersiz
   *  itemRef, negatif adet, duplicate id) atılır — bozuk kayıt oyunu çökertmez.
   *
   *  ÖNEMLİ (Faz 5.1): Kaydın `equippedSlot` alanına GÜVENİLMEZ. Neyin kuşanılı
   *  olduğunun tek otoritesi equipment map'idir; bu yüzden burada tüm bayraklar
   *  null'lanır. Kapasite kesimi de burada YAPILMAZ — EquipmentState.restore()
   *  çalıştıktan sonra `enforceCapacity()` ile deterministik olarak uygulanır
   *  (bkz. systems/StateRestore.ts). Aksi halde sahte equippedSlot değerleriyle
   *  kapasite aşılabiliyordu.
   *  Bu bir güvenlik doğrulaması DEĞİLDİR; state corruption dayanıklılığıdır. */
  restore(entries: ItemInstance[], nextInstanceId: number): InventoryRestoreReport {
    const safe: ItemInstance[] = [];
    const seenIds = new Set<number>();
    const rawCount = Array.isArray(entries) ? entries.length : 0;
    let total = 0;
    for (const raw of Array.isArray(entries) ? entries : []) {
      if (!raw || typeof raw !== 'object') continue;
      const id = Number(raw.instanceId);
      const ref = Number(raw.itemRef);
      if (!Number.isFinite(id) || !Number.isFinite(ref)) continue;
      if (seenIds.has(id)) continue;             // duplicate instanceId
      if (!Content.item(ref)) continue;          // whitelist dışı item
      seenIds.add(id);
      safe.push({
        instanceId: id,
        itemRef: ref,
        quantity: Math.max(1, Math.floor(Number(raw.quantity) || 1)),
        upgradeLevel: Math.max(0, Math.floor(Number(raw.upgradeLevel) || 0)),
        locked: raw.locked === true,
        equippedSlot: null, // otorite equipment map'i — sahte bayraklara güvenilmez
      });
      total += 1;
    }
    this.entries = safe;
    this.nextInstanceId = Math.max(nextInstanceId || 1, ...this.entries.map((e) => e.instanceId + 1), 1);
    return { accepted: total, droppedInvalid: rawCount - total };
  }

  /** Restore zincirinin SON adımı: kapasiteyi aşan çanta entry'lerini deterministik
   *  olarak düşürür (instanceId artan sırada ilk `capacity` tanesi kalır; kuşanılı
   *  entry'ler hiçbir zaman düşürülmez). Sonrasında I1 kesin olarak sağlanır. */
  enforceCapacity(): CapacityReport {
    const report: CapacityReport = { dropped: [] };
    const bag = this.entries
      .filter((e) => e.equippedSlot === null)
      .sort((a, b) => a.instanceId - b.instanceId);
    if (bag.length <= INVENTORY_CAPACITY) return report;
    const excess = new Set(bag.slice(INVENTORY_CAPACITY).map((e) => e.instanceId));
    for (const e of bag.slice(INVENTORY_CAPACITY)) {
      report.dropped.push({ instanceId: e.instanceId, itemRef: e.itemRef, reason: 'overCapacity' });
    }
    this.entries = this.entries.filter((e) => !excess.has(e.instanceId));
    return report;
  }

  clear(): void { this.entries = []; this.nextInstanceId = 1; }

  /** P2.15 — kayıt için anlık görüntü. `restore()` ile simetriktir:
   *  aynı iki alanı verir, aynı ikisini bekler. Girdiler KOPYALANIR —
   *  kaydedilen görüntü sonradan oyun içi mutasyonlarla değişmesin. */
  serialize(): { entries: ItemInstance[]; nextInstanceId: number } {
    return {
      entries: this.entries.map((e) => ({ ...e })),
      nextInstanceId: this.nextInstanceId,
    };
  }

  /* geriye dönük uyum (Faz 3 testleri) */
  list(): Array<{ item: GameItem | undefined; entry: { itemRef: number; count: number } }> {
    const byRef = new Map<number, number>();
    for (const e of this.entries) byRef.set(e.itemRef, (byRef.get(e.itemRef) ?? 0) + e.quantity);
    return [...byRef.entries()].sort((a, b) => a[0] - b[0])
      .map(([itemRef, count]) => ({ item: Content.item(itemRef), entry: { itemRef, count } }));
  }
}
