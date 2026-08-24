/** SATIŞ FİYATLARI — PROJECT LEGACY TUNING (P2.33)
 *
 *  ══════════════ NEDEN UYDURULDU ══════════════
 *  Kaynakta satış fiyatı YOK. Ölçüldü:
 *      · `items.json` 169 kaydın 4'ünde `vendorSell > 0`
 *      · MYKO çıkarımı 14 534 kaydın 51'inde `priceSale > 0`
 *  Bizim 35 itemlik kataloğumuzda SIFIR.
 *
 *  Yani "gerçek DB fiyatını kullan" mümkün değil — alan boş. Kullanıcı
 *  kararı: fiyatları Claude belirlesin. Bu dosya o kararın kaydıdır ve
 *  buradaki hiçbir sayı KAYNAK DEĞİLDİR.
 *
 *  ══════════════ FİYAT NEREDEN TÜRÜYOR ══════════════
 *  Eşyanın GÜCÜNDEN (`itemTierLevel`). Böylece fiyat listesi elle
 *  bakımı gereken bir tablo olmaz: yeni eşya eklenince fiyatı
 *  kendiliğinden yerine oturur.
 *
 *  Eğri üstel: üst kademe eşya belirgin biçimde daha değerli olsun ama
 *  alt kademe de satmaya değsin.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. */

import type { ItemDefinition } from './item-model.js';
import { itemTierLevel } from './moradon-loot-pool.js';

/** Sv1 kademesindeki eşyanın satış fiyatı. */
export const SELL_BASE = 40;

/** Kademe başına çarpan. 1,105^49 ≈ 120 → Sv50 eşyası ~4 800 altın.
 *  Ölçek şuradan çözüldü: Sv50 tam takım (12 parça) ≈ 50 000 altın,
 *  yani üst seviye ganimetin (50 000) BİR TANESİNE denk. Böylece
 *  ganimet "bir takım değerinde" hissettirir. */
export const SELL_GROWTH = 1.105;

/** Yükseltme seviyesi başına fiyat artışı — stat artışıyla AYNI oran
 *  (`UPGRADE_MODEL.statPerLevel = 0.2`). Uydurma ikinci bir eğri
 *  eklenmedi. */
export const SELL_UPGRADE_PER_LEVEL = 0.2;

/** Bir ekipmanın taban satış fiyatı (yükseltmesiz, tek adet). */
export function equipSellPrice(def: ItemDefinition): number {
  const tier = itemTierLevel(def);
  return Math.max(1, Math.round(SELL_BASE * SELL_GROWTH ** (tier - 1)));
}

/** ═══ EKİPMAN DIŞI SABİT FİYATLAR ═══
 *
 *  Bunlar güçten türetilemez (statları yok), bu yüzden tek tek
 *  belirlendi. Her birinin gerekçesi yanında. */
export const FIXED_SELL_PRICES: Readonly<Record<number, number>> = {
  /* Yükseltme Parşömeni — Örs malzemesi. Satmak yerine kullanmak
     istensin diye DÜŞÜK tutuldu. */
  379016000: 120,
  /* Yaşam Taşı — Sv1-30 bandının ganimeti (kullanıcı kararı: 5 000). */
  379006000: 5_000,
  /* Altın Sikke — Sv31+ ganimeti (kullanıcı kararı: 50 000). */
  379107000: 50_000,
  /* İksirler — satılabilir ama içmek daha değerli olsun. */
  389011000: 30,
  389016000: 30,
};

/** Sabit fiyatlı mı? */
export function fixedSellPrice(itemRef: number): number | null {
  return FIXED_SELL_PRICES[itemRef] ?? null;
}
