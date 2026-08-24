/** İKSİR MAĞAZASI — SAF KATMAN (P3.7)
 *
 *  ══════════════ NEDEN VAR ══════════════
 *  Kullanıcı kararı: zindanda Genie sürekli açık, iksir tüketiyor ve
 *  iksir mağazadan satın alınıyor. Bu, modun ekonomik dengesinin
 *  KALBİ: kazanılan altın ile harcanan iksir birbirini dengeliyor.
 *  Kat çok zorsa iksir masrafı geliri aşar ve oyuncu doğal olarak
 *  geri iner — yapay duvar yerine ekonomik duvar.
 *
 *  ══════════════ FİYATLAR KAYNAKTAN ══════════════
 *  `ko-potions.ts` → `vendorPrice`: 160 / 600 / 2 000 / 7 000.
 *  Uydurma fiyat YOKTUR.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. Satın alma
 *  `PrototypeState` üzerinden yapılır. */

import { KO_POTIONS, type KoPotionProfile } from './../data/ko-potions.js';

export interface ShopEntry {
  readonly itemRef: number;
  readonly displayName: string;
  readonly resource: 'hp' | 'mp';
  readonly restoreAmount: number;
  readonly unitPrice: number;
}

/** Mağaza kataloğu — kaynak iksir profillerinden türer.
 *
 *  SIRALAMA: önce can sonra mana, her biri kendi içinde ucuzdan
 *  pahalıya. Oyuncu en çok ihtiyaç duyduğunu üstte bulur. */
export function shopCatalog(): ShopEntry[] {
  const rows: ShopEntry[] = KO_POTIONS.map((p: KoPotionProfile) => ({
    itemRef: p.itemRef,
    displayName: p.displayName,
    resource: p.resource,
    restoreAmount: p.restoreAmount,
    unitPrice: p.vendorPrice,
  }));
  return rows.sort((a, b) => {
    if (a.resource !== b.resource) return a.resource === 'hp' ? -1 : 1;
    return a.unitPrice - b.unitPrice;
  });
}

export type BuyFail = 'noCoins' | 'inventoryFull' | 'badQuantity' | 'unknownItem';

export interface BuyResult {
  readonly ok: boolean;
  readonly fail?: BuyFail;
  readonly itemRef: number;
  readonly quantity: number;
  readonly cost: number;
  readonly coinsAfter: number;
}

/** Satın alma KURALI — saf. Gerçek mutasyon çağıranındır.
 *
 *  Kısmi satın alma YOKTUR: on tane isteyip parası yedi tanesine
 *  yetiyorsa işlem REDDEDİLİR. Sessizce yedi vermek oyuncuyu şaşırtır
 *  ve altın sayacını anlaşılmaz kılar. */
export function planPurchase(
  entry: ShopEntry | undefined, quantity: number, coins: number,
): { ok: boolean; fail?: BuyFail; cost: number } {
  if (!entry) return { ok: false, fail: 'unknownItem', cost: 0 };
  const q = Math.floor(quantity);
  if (!Number.isFinite(q) || q <= 0) return { ok: false, fail: 'badQuantity', cost: 0 };
  const cost = entry.unitPrice * q;
  if (cost > coins) return { ok: false, fail: 'noCoins', cost };
  return { ok: true, cost };
}

/** Bir iksirin "altın başına yenilenen kaynak" verimi.
 *
 *  Denetim içindir: üst kademe iksirler tek kullanımda daha çok
 *  yeniler ama altın başına DAHA VERİMSİZDİR (kaynak verisi böyle).
 *  Oyuncu 1,5 sn beklemeyle sınırlı olduğu için üst kademe yine de
 *  gereklidir — verimlilik tek ölçüt değildir. */
export function restorePerCoin(e: ShopEntry): number {
  return e.restoreAmount / Math.max(1, e.unitPrice);
}
