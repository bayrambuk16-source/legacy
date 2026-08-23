/** İki aşamalı drop roll — loot_tables.json semantiğiyle birebir:
 *  direct slot: tek aşama (tetik = item şansı)
 *  group slot: 1) tetik yüzdesi, 2) slot-uniform üye seçimi
 *  (grup tetik yüzdesi ASLA üye yüzdesi olarak kullanılmaz). */
import { Content, type LootTable } from '../data/GameContentRepository.js';
import { chance, int, type Rng } from '../../engine/rng.js';

export interface DropResult { itemRef: number; from: 'direct' | 'group' }

export class LootSystem {
  constructor(private rng: Rng) {}

  /** Bir loot tablosunu yuvarlar; düşen itemlerin listesi + coin döner. */
  roll(lootTableId: string): { drops: DropResult[]; coin: number } {
    const table: LootTable | undefined = Content.loot(lootTableId);
    if (!table) return { drops: [], coin: 0 };
    const drops: DropResult[] = [];
    for (const slot of table.slots) {
      if (!chance(this.rng, slot.triggerPercent)) continue;
      if (slot.kind === 'direct') {
        drops.push({ itemRef: slot.itemId!, from: 'direct' });
      } else {
        const members = slot.memberItemIds!;
        drops.push({ itemRef: members[int(this.rng, members.length)], from: 'group' });
      }
    }
    return { drops, coin: table.coin };
  }
}
