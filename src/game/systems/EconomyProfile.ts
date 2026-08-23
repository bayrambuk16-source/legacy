/** Ekonomi katmanı — fiyat politikası tek yerde, kaynak JSON değiştirilmeden.
 *
 *  Kaynak (items_server) `buy_price` AUTHORITATIVE'dir ve olduğu gibi kullanılır.
 *  `sell_price` kaynakta neredeyse her item için 0'dır (satış fiyatı sunucu tarafında
 *  ayrı hesaplanıyormuş) — bu yüzden satış fiyatı burada `buyPrice × sellMultiplier`
 *  olarak tanımlanır. İleride tüm ekonomi dengesi bu profilden ayarlanır. */
import type { GameItem } from '../data/GameContentRepository.js';

export interface EconomyValues {
  /** Kaynak buy_price'a uygulanan genel çarpan (1 = kaynak fiyatı aynen). */
  buyMultiplier: number;
  /** Satış fiyatı = buyPrice × sellMultiplier (kaynak sell_price 0 olduğunda). */
  sellMultiplier: number;
  /** Kaynakta sell_price > 0 ise ona mı güvenilsin? (varsayılan: evet) */
  preferSourceSellPrice: boolean;
  /** Satışta en az bu kadar coin verilir. */
  minSellPrice: number;
}

const DEFAULTS: EconomyValues = {
  buyMultiplier: 1,
  sellMultiplier: 0.25,
  preferSourceSellPrice: true,
  minSellPrice: 1,
};

export class EconomyProfile {
  private values: EconomyValues;
  constructor(overrides: Partial<EconomyValues> = {}) {
    this.values = { ...DEFAULTS, ...overrides };
  }

  /** Tüccardan alış fiyatı (birim). */
  buyPrice(item: GameItem): number {
    return Math.max(0, Math.round(item.vendorBuy * this.values.buyMultiplier));
  }

  /** Tüccara satış fiyatı (birim). Upgrade seviyesi değeri artırır. */
  sellPrice(item: GameItem, upgradeLevel = 0): number {
    const base = this.values.preferSourceSellPrice && item.vendorSell > 0
      ? item.vendorSell
      : item.vendorBuy * this.values.sellMultiplier;
    const withUpgrade = base * (1 + upgradeLevel * 0.2);
    return Math.max(this.values.minSellPrice, Math.round(withUpgrade));
  }

  set(overrides: Partial<EconomyValues>): void { this.values = { ...this.values, ...overrides }; }
  snapshot(): EconomyValues { return { ...this.values }; }
}
