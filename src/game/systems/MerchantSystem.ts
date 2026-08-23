/** Tüccar işlemleri — UI'dan bağımsız, ATOMİK.
 *
 *  Atomiklik kuralı: her işlem önce tüm ön koşulları doğrular, sonra state'i değiştirir.
 *  - Satın alma: coin düşülür DÜŞÜLMEZ önce envantere sığacağı garanti edilir; ekleme
 *    beklenmedik şekilde başarısız olursa coin geri verilir (rollback).
 *  - Satış: item önce silinir, ancak silme başarılıysa coin verilir.
 *  Merchant envanteri ve fiyatlar generated JSON'dan gelir; hardcode yoktur. */
import { Content, type GameItem, type GameMerchant } from '../data/GameContentRepository.js';
import type { InventoryState } from './InventoryState.js';
import type { PlayerState } from './PlayerState.js';
import type { EconomyProfile } from './EconomyProfile.js';

export type BuyFail = 'unknownMerchant' | 'notSold' | 'unknownItem' | 'badQuantity' | 'coin' | 'inventoryFull';
export type SellFail = 'unknownItem' | 'notFound' | 'badQuantity' | 'locked' | 'equipped';

export type BuyResult =
  | { ok: true; itemRef: number; quantity: number; totalCost: number; coinsLeft: number }
  | { ok: false; reason: BuyFail };
export type SellResult =
  | { ok: true; itemRef: number; quantity: number; totalGain: number; coinsLeft: number }
  | { ok: false; reason: SellFail };

export interface MerchantOffer { item: GameItem; unitPrice: number }

export class MerchantSystem {
  constructor(
    private inventory: InventoryState,
    private player: PlayerState,
    private economy: EconomyProfile,
  ) {}

  merchants(): GameMerchant[] { return Content.merchants; }
  merchant(id: string): GameMerchant | undefined {
    return Content.merchants.find((m) => m.id === id);
  }

  /** Tüccarın satış listesi — sıralama deterministik (itemRef). */
  offers(merchantId: string): MerchantOffer[] {
    const m = this.merchant(merchantId);
    if (!m) return [];
    return m.itemIds
      .map((ref) => Content.item(ref))
      .filter((i): i is GameItem => i !== undefined)
      .sort((a, b) => a.sourceRef - b.sourceRef)
      .map((item) => ({ item, unitPrice: this.economy.buyPrice(item) }));
  }

  unitBuyPrice(itemRef: number): number | null {
    const item = Content.item(itemRef);
    return item ? this.economy.buyPrice(item) : null;
  }
  unitSellPrice(itemRef: number, upgradeLevel = 0): number | null {
    const item = Content.item(itemRef);
    return item ? this.economy.sellPrice(item, upgradeLevel) : null;
  }

  /** Envanterde bu alışın yer bulup bulmadığı (stackable ise mevcut yığına biner). */
  private hasRoomFor(item: GameItem): boolean {
    if (item.stackable && this.inventory.hasOpenStack(item.sourceRef)) return true;
    return !this.inventory.isFull;
  }

  buy(merchantId: string, itemRef: number, quantity = 1): BuyResult {
    const m = this.merchant(merchantId);
    if (!m) return { ok: false, reason: 'unknownMerchant' };
    if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, reason: 'badQuantity' };
    const item = Content.item(itemRef);
    if (!item) return { ok: false, reason: 'unknownItem' };
    if (!m.itemIds.includes(itemRef)) return { ok: false, reason: 'notSold' };

    const total = this.economy.buyPrice(item) * quantity;
    if (this.player.coins < total) return { ok: false, reason: 'coin' };
    /* Stackable olmayan itemde her adet ayrı slot ister. */
    const neededSlots = item.stackable
      ? (this.inventory.hasOpenStack(itemRef) ? 0 : 1)
      : quantity;
    if (this.inventory.usedSlots + neededSlots > this.inventory.capacity) {
      return { ok: false, reason: 'inventoryFull' };
    }
    if (!this.hasRoomFor(item)) return { ok: false, reason: 'inventoryFull' };

    // --- mutasyon başlıyor ---
    this.player.coins -= total;
    let added = 0;
    if (item.stackable) {
      const r = this.inventory.add(itemRef, { quantity });
      if (r.ok) added = quantity;
    } else {
      for (let i = 0; i < quantity; i++) {
        if (this.inventory.add(itemRef).ok) added += 1; else break;
      }
    }
    if (added !== quantity) {
      // beklenmedik durum: kısmi ekleme → tamamını geri al (rollback), coin iade
      this.player.coins += total;
      if (added > 0) this.inventory.removeByRef(itemRef, added);
      return { ok: false, reason: 'inventoryFull' };
    }
    return { ok: true, itemRef, quantity, totalCost: total, coinsLeft: this.player.coins };
  }

  /** Belirli bir instance'ı satar (kilitli/kuşanılı reddedilir). */
  sell(instanceId: number, quantity = 1): SellResult {
    const entry = this.inventory.get(instanceId);
    if (!entry) return { ok: false, reason: 'notFound' };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > entry.quantity) {
      return { ok: false, reason: 'badQuantity' };
    }
    if (entry.locked) return { ok: false, reason: 'locked' };
    if (entry.equippedSlot !== null) return { ok: false, reason: 'equipped' };
    const item = Content.item(entry.itemRef);
    if (!item) return { ok: false, reason: 'unknownItem' };

    const gain = this.economy.sellPrice(item, entry.upgradeLevel) * quantity;
    // --- mutasyon: önce item gider, sonra coin gelir ---
    const removed = this.inventory.remove(instanceId, quantity);
    if (!removed) return { ok: false, reason: 'notFound' };
    this.player.coins += gain;
    return { ok: true, itemRef: entry.itemRef, quantity, totalGain: gain, coinsLeft: this.player.coins };
  }
}
