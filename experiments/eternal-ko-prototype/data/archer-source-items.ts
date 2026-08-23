/** OKÇU KAYNAK ITEMLERİ — v8 DIŞI EK KAYITLAR (A1)
 *
 *  ══════════════ NEDEN AYRI DOSYA ══════════════
 *  `src/game/data/generated/items.json` MVP kapsamıyla üretilmişti ve yalnız
 *  169 item içeriyor. Okçu ilerlemesi için gereken yay/zırh aileleri orada
 *  YOK. Generated klasörü "kaynaktan yeniden üretilebilir" olmak zorunda
 *  olduğu için ORAYA ELLE YAZILMADI; ek kayıtlar bu dosyada, kaynağı açıkça
 *  belirtilerek durur.
 *
 *  ══════════════ KAYNAK ══════════════
 *  2019 Ko-Yardim / MYKO `kn_online` yedeğinin ITEM tablosundan ham olarak
 *  çıkarıldı. Kolon eşlemesi sınıf korelasyonuyla doğrulandı:
 *  savaşçı silahlarında yalnız ReqStr, yaylarda yalnız ReqDex, büyücü
 *  kıyafetinde yalnız ReqIntel dolu.
 *
 *  ══════════════ PARITY ══════════════
 *  İki kaynağın ORTAK 29 kaydında `damage`, `defense`, `reqLevel`,
 *  `sellingGroup`, `classCode`, `kindCode` alanlarında SIFIR uyuşmazlık
 *  bulundu. Bu yüzden aynı ID uzayı kabul edildi.
 *
 *  ══════════════ UYARI ══════════════
 *  MYKO bir ÖZEL SUNUCU veritabanıdır, saf KO değildir. Ortak alanlarda
 *  v8 ile birebir uyuşuyor; yine de denge değerleri kanonik sayılmamalıdır.
 *
 *  ══════════════ reqDex KULLANILMIYOR ══════════════
 *  Kaynak DEX gereksinimleri (46-100) taşınıyor ama ŞU AN KAPI DEĞİL:
 *  okçu 70 DEX ile başlıyor, bu yüzden çoğu item zaten kuşanılabilir.
 *  İlerleme DROP KAYNAĞIYLA kapılanıyor (güçlü mob → iyi item). */

import { Content, type GameItem } from '../../../src/game/data/GameContentRepository.js';

export interface ArcherSourceItem {
  readonly sourceRef: number;
  readonly sourceName: string;
  readonly kindCode: number;
  readonly classCode: number;
  readonly equipSlot: string;
  readonly damage: number;
  readonly defense: number;
  readonly attackDelayMs: number;
  readonly range: number;
  readonly reqLevel: number;
  /** Kaynak DEX gereksinimi — bilgi olarak taşınır, kapı olarak kullanılmaz. */
  readonly reqDex: number;
  readonly vendorBuy: number;
  readonly vendorSell: number;
  readonly sellingGroup: number;
}

export const ARCHER_SOURCE_ITEMS: readonly ArcherSourceItem[] = [
  {
    sourceRef: 160210000, sourceName: 'Short Bow (+0)',
    kindCode: 70, classCode: 2, equipSlot: 'weapon',
    damage: 15, defense: 0, attackDelayMs: 150, range: 350,
    reqLevel: 1, reqDex: 64,
    vendorBuy: 349, vendorSell: 0, sellingGroup: 201,
  },
  {
    sourceRef: 160410000, sourceName: 'Rapt Bow (+0)',
    kindCode: 70, classCode: 2, equipSlot: 'weapon',
    damage: 26, defense: 0, attackDelayMs: 150, range: 400,
    reqLevel: 1, reqDex: 74,
    vendorBuy: 1542, vendorSell: 0, sellingGroup: 201,
  },
  {
    sourceRef: 241001000, sourceName: 'Rogue Shirt (+0)',
    kindCode: 220, classCode: 2, equipSlot: 'chest',
    damage: 0, defense: 14, attackDelayMs: 100, range: 0,
    reqLevel: 1, reqDex: 62,
    vendorBuy: 448, vendorSell: 0, sellingGroup: 202,
  },
  {
    sourceRef: 241002000, sourceName: 'Rogue Pads (+0)',
    kindCode: 220, classCode: 2, equipSlot: 'pants',
    damage: 0, defense: 11, attackDelayMs: 100, range: 0,
    reqLevel: 1, reqDex: 58,
    vendorBuy: 268, vendorSell: 0, sellingGroup: 202,
  },
  {
    sourceRef: 241003000, sourceName: 'Rogue Cap (+0)',
    kindCode: 220, classCode: 2, equipSlot: 'helmet',
    damage: 0, defense: 8, attackDelayMs: 100, range: 0,
    reqLevel: 1, reqDex: 54,
    vendorBuy: 179, vendorSell: 0, sellingGroup: 202,
  },
  {
    sourceRef: 241004000, sourceName: 'Rogue Gloves (+0)',
    kindCode: 220, classCode: 2, equipSlot: 'gloves',
    damage: 0, defense: 5, attackDelayMs: 100, range: 0,
    reqLevel: 1, reqDex: 46,
    vendorBuy: 89, vendorSell: 0, sellingGroup: 202,
  },
  {
    sourceRef: 241005000, sourceName: 'Rogue Shoes (+0)',
    kindCode: 220, classCode: 2, equipSlot: 'boots',
    damage: 0, defense: 5, attackDelayMs: 100, range: 0,
    reqLevel: 1, reqDex: 50,
    vendorBuy: 89, vendorSell: 0, sellingGroup: 202,
  },
  {
    sourceRef: 242001000, sourceName: 'Rogue Half Plate Pauldron (+0)',
    kindCode: 220, classCode: 2, equipSlot: 'chest',
    damage: 0, defense: 28, attackDelayMs: 100, range: 0,
    reqLevel: 1, reqDex: 100,
    vendorBuy: 3600, vendorSell: 0, sellingGroup: 202,
  },
  {
    sourceRef: 242002000, sourceName: 'Rogue Half Plate Pads (+0)',
    kindCode: 220, classCode: 2, equipSlot: 'pants',
    damage: 0, defense: 22, attackDelayMs: 100, range: 0,
    reqLevel: 1, reqDex: 96,
    vendorBuy: 2160, vendorSell: 0, sellingGroup: 202,
  },
  {
    sourceRef: 242003000, sourceName: 'Rogue Helmet (+0)',
    kindCode: 220, classCode: 2, equipSlot: 'helmet',
    damage: 0, defense: 16, attackDelayMs: 100, range: 0,
    reqLevel: 1, reqDex: 92,
    vendorBuy: 1440, vendorSell: 0, sellingGroup: 202,
  },
  {
    sourceRef: 242004000, sourceName: 'Rogue Gauntlet (+0)',
    kindCode: 220, classCode: 2, equipSlot: 'gloves',
    damage: 0, defense: 11, attackDelayMs: 100, range: 0,
    reqLevel: 1, reqDex: 84,
    vendorBuy: 720, vendorSell: 0, sellingGroup: 202,
  },
  {
    sourceRef: 242005000, sourceName: 'Rogue Boots (+0)',
    kindCode: 220, classCode: 2, equipSlot: 'boots',
    damage: 0, defense: 11, attackDelayMs: 100, range: 0,
    reqLevel: 1, reqDex: 88,
    vendorBuy: 720, vendorSell: 0, sellingGroup: 202,
  },
];

const BY_REF = new Map(ARCHER_SOURCE_ITEMS.map((i) => [i.sourceRef, i]));

/** `Content.item()` biçimine çevirir — katalog `facts()` bunu bekliyor. */
export function archerSourceItem(sourceRef: number): GameItem | undefined {
  const i = BY_REF.get(sourceRef);
  if (!i) return undefined;
  return {
    id: `item_${i.sourceRef}`,
    sourceRef: i.sourceRef,
    sourceName: i.sourceName,
    displayName: i.sourceName,
    iconKey: 'es_okcu_silah',
    category: i.damage > 0 ? 'weapon' : 'armor',
    kindSource: String(i.kindCode),
    kindCode: i.kindCode,
    equipSlot: i.equipSlot,
    classCode: i.classCode,
    baseUpgradeLevel: 0,
    damage: i.damage,
    defense: i.defense,
    attackDelayMs: i.attackDelayMs,
    range: i.range,
    reqLevel: i.reqLevel,
    vendorBuy: i.vendorBuy,
    vendorSell: i.vendorSell,
    stackable: false,
    sellingGroup: i.sellingGroup,
    bonuses: { str: 0, sta: 0, dex: 0, int: 0, hp: 0, mp: 0 },
    elemental: { fire: 0, ice: 0, lightning: 0, poison: 0 },
  } as GameItem;
}

/** Ek kayıtları Content deposuna tanıtır. Katalog, envanter ve ekipman
 *  katmanlarının HEPSİ `Content.item()` üzerinden okuduğu için tek noktadan
 *  kayıt şart: yalnız katalog `facts()` içine fallback koymak yetmez,
 *  o zaman item kuşanılamaz (envanter doğrulaması düşer). */
export function registerArcherSourceItems(): number {
  const rows = ARCHER_SOURCE_ITEMS
    .map((i) => archerSourceItem(i.sourceRef))
    .filter((g): g is GameItem => g !== undefined);
  return Content.registerSourceItems(rows);
}
