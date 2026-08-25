/** İKSİR SATIN ALMA — DÜNYADAN BAĞIMSIZ (P2.47)
 *
 *  ══════════════ NEDEN ZİNDANDAN ÇIKARILDI ══════════════
 *  Satın alma mantığı `DungeonSession.buyPotion` içindeydi ve YALNIZ
 *  zindanda erişilebiliyordu. Moradon tempo çöküşünün ölçülen kökü tam
 *  buydu: bir saatlik simülasyonda ilk beş dakika SIFIR ölümle Sv8'e
 *  çıkılıyor, altıncı dakikada HP iksiri stoku bitiyor ve ölümler
 *  4 → 13 → 21/dk diye patlıyor; kalan elli beş dakika %5'lik ölüm
 *  cezası koşu bandında Sv10'da kilitleniyor (422 ölüm / 154 kill).
 *  Yirmi iksir beş dakika yetiyor ve Moradon'da yenisini almanın
 *  HİÇBİR yolu yoktu.
 *
 *  Mantık duruma bağımlı değildir: hangi `PrototypeState` verilirse
 *  onun envanterine/altınına işler. Zindan oturumu da buraya delege
 *  eder — iki dünyada TEK satın alma yolu, tek doğruluk kaynağı.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()` YOKTUR; mutasyon yalnız verilen
 *  state üzerindedir (satın almanın kendisi). */

import { planPurchase, shopCatalog, type BuyResult } from '../ui/potion-shop.js';
import type { PrototypeState } from '../state.js';

/** Verilen dünyanın karakterine iksir satar. Fiyat kaynaktan
 *  (`items_server.buy_price`); altın YALNIZ eşya envantere gerçekten
 *  girdikten sonra düşer — sıra ters olsaydı dolu çantada para
 *  buharlaşırdı. */
export function buyPotionFor(
  state: PrototypeState, itemRef: number, quantity: number,
): BuyResult {
  const entry = shopCatalog().find((e) => e.itemRef === itemRef);
  const coins = state.player.coins;
  const plan = planPurchase(entry, quantity, coins);
  if (!plan.ok || !entry) {
    return {
      ok: false, fail: plan.fail, itemRef, quantity,
      cost: plan.cost, coinsAfter: coins,
    };
  }
  const add = state.inventory.add(itemRef, { quantity });
  if (!add.ok) {
    return {
      ok: false, fail: 'inventoryFull', itemRef, quantity,
      cost: plan.cost, coinsAfter: coins,
    };
  }
  state.player.coins = coins - plan.cost;
  return {
    ok: true, itemRef, quantity, cost: plan.cost,
    coinsAfter: state.player.coins,
  };
}
