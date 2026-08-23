/** ARCHER ITEM KATALOĞU — P1.8 (PROJECT LEGACY İÇERİK)
 *
 *  ══════════ KAYNAK / TASARIM AYRIMI (§2) ══════════
 *
 *  KAYNAK GERÇEĞİ (`items_server`, üretilmiş `items.json` üzerinden okunur):
 *    num · name · kind · class_code · damage · ac · req_level · delay ·
 *    range_value · *_bonus · fire/ice/lightning/poison_damage
 *
 *  PROJECT LEGACY KARARI (kaynakta YOK ya da bilerek KULLANILMIYOR):
 *    itemClass (rarity)   → kaynakta RARITY KOLONU YOK
 *    displayName          → kaynak adları placeholder; Türkçe kimlik verildi
 *    allowedClasses       → kaynak `class_code`'tan TÜRETİLİR ama sözleşme burada
 *    setId                → kaynakta yok (§31, bonus İMPLEMENTE EDİLMEDİ)
 *    silahta primary stat → KAYNAKTA VAR ama Project Legacy'de YASAK (§3)
 *
 *  ══════════ ÖNEMLİ KAYNAK BULGUSU ══════════
 *  KO kaynağında SİLAHLAR primary stat TAŞIYABİLİR: 2505 yayın 208'inde
 *  `dex_bonus`, 197'sinde `str_bonus` sıfır değildir. Project Legacy bunu
 *  BİLEREK KULLANMAZ (§3): silahın işi ATTACK'tır. Bu bir çıkarım hatası
 *  değil, açık bir tasarım sapmasıdır ve her tanımda `droppedSourceFields`
 *  ile işaretlenir.
 *
 *  ══════════ RASTGELE ÜRETİM YOK ══════════
 *  Buradaki her sayı ELLE yazılmıştır ve sabittir. Roll aralığı, affix
 *  havuzu, rastgele resistance YOKTUR (§5/§13). Aynı isimli item her
 *  düştüğünde aynıdır.
 *
 *  ══════════ CRIT YOK ══════════
 *  Hiçbir tanımda kritik şansı/hasarı YOKTUR — tip düzeyinde de imkânsızdır. */
import { Content } from '../../../src/game/data/GameContentRepository.js';
import { archerSourceItem, registerArcherSourceItems } from './archer-source-items.js';

/* A1 — EK KAYNAK KAYITLARI MODÜL YÜKLENİRKEN TANITILIR.
   Katalog tanımları modül gövdesinde `facts()` çağırıyor; kayıt daha
   sonra yapılırsa `Content.item()` boş döner ve item KUŞANILAMAZ
   (envanter/ekipman katmanları da aynı depodan okuyor). */
registerArcherSourceItems();
import {
  ZERO_ELEMENTAL, ZERO_RESIST, ZERO_SPECIAL,
  type AccessoryDefinition, type ArmorDefinition, type ElementalDamage,
  type ItemDefinition, type ItemSourceFacts, type PlayerClass,
  type Resistances, type WeaponDefinition, type WeaponSpecial,
} from './item-model.js';

/** Üretilmiş içerikten kaynak gerçeklerini okur (KOPYALAMAZ — referans alır). */
function facts(sourceRef: number): ItemSourceFacts {
  /* A1 — generated/items.json MVP kapsamıyla üretildi ve okçu ilerlemesi
     için gereken yay/zırh ailelerini içermiyor. Eksik kayıtlar
     `archer-source-items.ts` içinden gelir (kaynağı orada belgeli). */
  const it = Content.item(sourceRef) ?? archerSourceItem(sourceRef);
  if (!it) {
    throw new Error(`P1.8 katalog: kaynak item bulunamadı (${sourceRef})`);
  }
  return {
    sourceRef,
    sourceName: it.sourceName,
    kindCode: it.kindCode,
    classCode: it.classCode,
    damage: it.damage,
    defense: it.defense,
    reqLevel: it.reqLevel,
    delayMs: it.attackDelayMs,
    range: it.range,
    sourceBonuses: { ...it.bonuses },
    sourceElemental: { ...it.elemental },
  };
}

const ARCHER: readonly PlayerClass[] = ['archer'];
const el = (e: Partial<ElementalDamage>): ElementalDamage => ({ ...ZERO_ELEMENTAL, ...e });
const res = (r: Partial<Resistances>): Resistances => ({ ...ZERO_RESIST, ...r });
const spc = (s: Partial<WeaponSpecial>): WeaponSpecial => ({ ...ZERO_SPECIAL, ...s });

/* ═══════════════════════════ SİLAHLAR (§28) ═══════════════════════════
 *
 *  Beş yay, beş sınıf. `attack` değerleri KAYNAK `damage` alanından gelir
 *  (SOURCE FACT); elemental ve özel nitelikler PROJECT LEGACY TUNING'dir.
 *  Hiçbirinde STR/DEX/INT YOKTUR — `WeaponStats` tipinde böyle bir alan
 *  bulunmaz. */

function weapon(
  sourceRef: number, displayName: string, itemClass: WeaponDefinition['itemClass'],
  stats: WeaponDefinition['stats'], dropped: string[] = [],
): WeaponDefinition {
  const f = facts(sourceRef);
  return {
    definitionRef: sourceRef, displayName, itemClass, category: 'weapon',
    equipSlot: 'weapon', allowedClasses: ARCHER, requiredLevel: f.reqLevel,
    stackable: false, setId: null, baseItemRef: sourceRef, source: f,
    droppedSourceFields: ['str_bonus', 'dex_bonus', 'intel_bonus', 'sta_bonus', ...dropped],
    stats,
  };
}

export const ARCHER_WEAPONS: readonly WeaponDefinition[] = [
  /* BEYAZ — yalnız Attack. */
  weapon(160100002, 'Meşe Yay', 'LOW', {
    attack: 12, elemental: el({}), special: spc({}), maxHp: 0, maxMp: 0, resist: res({}),
  }),
  /* YEŞİL — daha yüksek Attack, başka bir şey yok. */
  weapon(160100004, 'Avcı Yayı', 'MIDDLE', {
    attack: 20, elemental: el({}), special: spc({}), maxHp: 0, maxMp: 0, resist: res({}),
  }),
  /* MAVİ — Attack + temel elemental (TUNING: kaynakta bu ref'te elemental yok). */
  weapon(160100006, 'Çelik Tendon Yay', 'HIGH', {
    attack: 28, elemental: el({ fire: 12 }), special: spc({}), maxHp: 0, maxMp: 0, resist: res({}),
  }),
  /* MOR — Attack + GÜÇLÜ elemental. Poison değeri KAYNAKTAN gelir
     (`poison_damage = 50`) ve BİR DoT DEĞİLDİR (§4). */
  weapon(160210045, 'Akrep Dişi Yayı', 'RARE', {
    attack: 31, elemental: el({ poison: 50 }), special: spc({}), maxHp: 0, maxMp: 0, resist: res({}),
  }),
  /* TURUNCU — isimli UNIQUE. Kimliğini tanımlayan SABİT kombinasyon;
     bu nitelikler başka hiçbir yaya basılmaz. */
  weapon(160100005, 'Karanlık Yemin', 'UNIQUE', {
    attack: 34,
    elemental: el({ ice: 18, lightning: 10 }),
    special: spc({ hpDrain: 6, mpDrain: 4 }),
    maxHp: 60, maxMp: 40,
    resist: res({ ice: 10 }),
  }),
];

/* ═══════════════════════════ ZIRHLAR (§29) ═══════════════════════════
 *
 *  Ana stat DEFENSE. Üst sınıflarda okçuya uygun build statları (DEX / HP /
 *  MP / direnç) eklenir — ama her parça bonus çöplüğüne çevrilmez.
 *  `defense` değerleri KAYNAK `ac` alanından gelir. */

function armor(
  sourceRef: number, displayName: string, itemClass: ArmorDefinition['itemClass'],
  equipSlot: ArmorDefinition['equipSlot'], stats: ArmorDefinition['stats'],
  setId: string | null = null,
): ArmorDefinition {
  const f = facts(sourceRef);
  return {
    definitionRef: sourceRef, displayName, itemClass, category: 'armor',
    equipSlot, allowedClasses: ARCHER, requiredLevel: f.reqLevel,
    stackable: false, setId, baseItemRef: sourceRef, source: f,
    droppedSourceFields: [],
    stats,
  };
}
const A0 = { str: 0, dex: 0, int: 0, sta: 0, maxHp: 0, maxMp: 0 };

/* P2.5A — BAŞLANGIÇ YAYI.
   KÖK BUG: `PLAYER.starterWeaponRef = 160100000` oyuncuya kuşanılı olarak
   veriliyordu ama bu referans katalogda YOKTU. `equipmentResolved()` katalog
   dışı itemleri KATKI VERMEDEN geçtiği için yay saldırıya SIFIR ekliyordu;
   Lv1 karakteri 2 saldırı gücüyle dolaşıp 1 hasar vuruyordu.
   Kaynak: items.json 160100000 "Long Bow (+0)", damage 8.

   SIRA ÖNEMLİ: listenin SONUNDA duruyor. `ARCHER_WEAPONS.find(itemClass)`
   ile ilk eşleşeni arayan yerler (testler dahil) LOW sınıfında Meşe Yay'ı
   bulmaya devam etsin diye. */
/* A1 — OKÇU YAY KADEMELERİ (kaynak: MYKO ITEM tablosu, parity doğrulandı).
   Sv1-20 ilerlemesi için üç aile: Bow 8 → Short Bow 15 → Rapt Bow 26.
   Örs yükseltmesi bunları +8'e kadar ~2,6 katına çıkarır (8→21, 15→39,
   26→68), böylece bant Sv20'ye kadar yetiyor.

   İLERLEME KAPISI reqLevel DEĞİL, DROP KAYNAĞIDIR: kaynakta bütün yayların
   reqLevel'i 1'dir ve DEX gereksinimleri (56-74) okçunun 70 taban DEX'inin
   altında kalır. Uydurma seviye şartı yazmak yerine iyi yaylar UZAKTAKİ
   GÜÇLÜ MOBLARDAN düşer (bkz. drop-profile.ts okçu filtresi). */
export const ARCHER_TIER_BOWS: readonly WeaponDefinition[] = [
  weapon(160210000, 'Kısa Avcı Yayı', 'MIDDLE', {
    attack: 15, elemental: el({}), special: spc({}), maxHp: 0, maxMp: 0, resist: res({}),
  }),
  weapon(160410000, 'Yırtıcı Yay', 'RARE', {
    attack: 26, elemental: el({}), special: spc({}), maxHp: 0, maxMp: 0, resist: res({}),
  }),
];

/* A1/P2.21 — OKÇU ZIRH KADEMELERİ. İki set: Rogue (Sv1-10) ve Half Plate
   (Sv10-20).

   `defense` değerleri KAYNAKTAN aynen alındı.

   DEX ve maxHp bonusları PROJECT LEGACY TUNING'dir — kaynakta okçu
   zırhında stat bonusu YOK (ölçüldü, SOURCE GAP). Bu boşluk döngüyü
   kırıyordu: zırh toplamak saldırıyı hiç artırmıyor, yalnız yay
   değiştirmek işe yarıyordu. Eklenen DEX o boşluğu kapatır.

   ÖLÇEK: tam Rogue seti +12 DEX, tam Half Plate +28 DEX. Karşılaştırma
   için Lv20'de dağıtılabilir puan 67'dir — yani ekipman, dağıtımın
   yaklaşık yarısı kadar katkı verir. Baskın değil, ama hissedilir. */
export const ARCHER_TIER_ARMOR: readonly ArmorDefinition[] = [
  armor(241003000, 'Avcı Başlığı', 'LOW', 'helmet', { defense: 8, ...A0, dex: 2, resist: res({}) }, 'rogue'),
  armor(241001000, 'Avcı Gömleği', 'LOW', 'chest', { defense: 14, ...A0, dex: 3, maxHp: 20, resist: res({}) }, 'rogue'),
  armor(241002000, 'Avcı Dizliği', 'LOW', 'pants', { defense: 11, ...A0, dex: 2, maxHp: 15, resist: res({}) }, 'rogue'),
  armor(241004000, 'Avcı Eldiveni', 'LOW', 'gloves', { defense: 5, ...A0, dex: 3, resist: res({}) }, 'rogue'),
  armor(241005000, 'Avcı Çizmesi', 'LOW', 'boots', { defense: 5, ...A0, dex: 2, resist: res({}) }, 'rogue'),
  armor(242003000, 'Zırhlı Avcı Miğferi', 'MIDDLE', 'helmet', { defense: 16, ...A0, dex: 5, maxHp: 20, resist: res({}) }, 'halfplate'),
  armor(242001000, 'Zırhlı Avcı Göğüslüğü', 'MIDDLE', 'chest', { defense: 28, ...A0, dex: 7, maxHp: 45, resist: res({}) }, 'halfplate'),
  armor(242002000, 'Zırhlı Avcı Dizliği', 'MIDDLE', 'pants', { defense: 22, ...A0, dex: 5, maxHp: 35, resist: res({}) }, 'halfplate'),
  armor(242004000, 'Zırhlı Avcı Eldiveni', 'MIDDLE', 'gloves', { defense: 11, ...A0, dex: 6, resist: res({}) }, 'halfplate'),
  armor(242005000, 'Zırhlı Avcı Çizmesi', 'MIDDLE', 'boots', { defense: 11, ...A0, dex: 5, resist: res({}) }, 'halfplate'),
];

export const ARCHER_STARTER_BOW: WeaponDefinition = weapon(
  160100000, 'Kül Ağacı Avcı Yayı', 'LOW',
  { attack: 8, elemental: el({}), special: spc({}), maxHp: 0, maxMp: 0, resist: res({}) },
);

export const ARCHER_ARMOR: readonly ArmorDefinition[] = [
  /* ---- BEYAZ başlangıç seti: yalnız Defense (+ kaynaktaki STA) ---- */
  armor(241003503, 'Deri Başlık', 'LOW', 'helmet',
    { ...A0, defense: 14, sta: 4, resist: res({}) }, 'rogue_leather'),
  armor(241001503, 'Deri Göğüslük', 'LOW', 'chest',
    { ...A0, defense: 22, sta: 4, resist: res({}) }, 'rogue_leather'),
  armor(241002503, 'Deri Pantolon', 'LOW', 'pants',
    { ...A0, defense: 19, sta: 4, resist: res({}) }, 'rogue_leather'),
  armor(241004503, 'Deri Eldiven', 'LOW', 'gloves',
    { ...A0, defense: 9, sta: 4, resist: res({}) }, 'rogue_leather'),
  armor(241005503, 'Deri Çizme', 'LOW', 'boots',
    { ...A0, defense: 9, sta: 4, resist: res({}) }, 'rogue_leather'),

  /* ---- YEŞİL: daha iyi Defense ---- */
  armor(241003504, 'Sertleştirilmiş Başlık', 'MIDDLE', 'helmet',
    { ...A0, defense: 17, sta: 6, resist: res({}) }, 'rogue_hardened'),
  armor(241001504, 'Sertleştirilmiş Göğüslük', 'MIDDLE', 'chest',
    { ...A0, defense: 26, sta: 6, resist: res({}) }, 'rogue_hardened'),

  /* ---- MAVİ: Defense + sınıfa uygun build statı (DEX) ---- */
  armor(241002505, 'İz Sürücü Pantolonu', 'HIGH', 'pants',
    { ...A0, defense: 27, sta: 8, dex: 5, resist: res({}) }, 'tracker'),
  armor(241004505, 'İz Sürücü Eldiveni', 'HIGH', 'gloves',
    { ...A0, defense: 13, sta: 8, dex: 4, resist: res({}) }, 'tracker'),

  /* ---- MOR: Defense + build stat + HP + direnç ---- */
  armor(241003505, 'Gölge Avcısı Başlığı', 'RARE', 'helmet',
    { ...A0, defense: 20, sta: 8, dex: 6, maxHp: 80, resist: res({ poison: 8 }) }, 'shadow'),
  armor(241005504, 'Gölge Avcısı Çizmesi', 'RARE', 'boots',
    { ...A0, defense: 11, sta: 6, dex: 5, maxHp: 60, resist: res({ ice: 6 }) }, 'shadow'),
];

/* ═══════════════════════════ AKSESUARLAR (§30) ═══════════════════════════
 *
 *  Build'in ANA kaynağı. Dört arketip: DEX odaklı · HP odaklı · direnç
 *  odaklı · dengeli. HİÇBİRİNDE CRIT YOK (§12).
 *  Aksesuar upgrade'i P1.9'a bırakıldı; model `baseItemRef` ile hazır (§14). */

function accessory(
  sourceRef: number, displayName: string, itemClass: AccessoryDefinition['itemClass'],
  equipSlot: AccessoryDefinition['equipSlot'], stats: AccessoryDefinition['stats'],
): AccessoryDefinition {
  const f = facts(sourceRef);
  return {
    definitionRef: sourceRef, displayName, itemClass, category: 'accessory',
    equipSlot, allowedClasses: ARCHER, requiredLevel: f.reqLevel,
    stackable: false, setId: null, baseItemRef: sourceRef, source: f,
    droppedSourceFields: [],
    stats,
  };
}

export const ARCHER_ACCESSORIES: readonly AccessoryDefinition[] = [
  /* KÜPE ×2 */
  accessory(310110101, 'Tunç Küpe', 'LOW', 'earring',
    { ...A0, sta: 8, resist: res({}) }),
  accessory(310110103, 'Şahin Küpesi', 'HIGH', 'earring',
    { ...A0, dex: 7, maxHp: 40, resist: res({}) }),          // DEX odaklı
  /* YÜZÜK ×2 */
  accessory(330310014, 'Kekuri Yüzüğü', 'MIDDLE', 'ring',
    { ...A0, dex: 8, resist: res({}) }),                     // kaynak dex_bonus = 8
  accessory(330110262, 'Zümrüt Yüzük', 'RARE', 'ring',
    { ...A0, dex: 4, maxHp: 90, maxMp: 60, resist: res({ fire: 6, ice: 6 }) }),  // dengeli
  /* KOLYE ×1 */
  accessory(320310129, 'Kızıl Ejder Muskası', 'UNIQUE', 'necklace',
    { ...A0, dex: 10, maxHp: 120, maxMp: 100,
      resist: res({ fire: 12, poison: 8 }) }),               // isimli UNIQUE
  /* KEMER ×1 */
  accessory(340110101, 'Yaşam Kuşağı', 'MIDDLE', 'belt',
    { ...A0, sta: 8, maxHp: 100, resist: res({}) }),         // HP odaklı
];

/* ═══════════════════════════ REGISTRY ═══════════════════════════ */

export const ARCHER_CATALOG: readonly ItemDefinition[] = [
  ...ARCHER_WEAPONS, ARCHER_STARTER_BOW, ...ARCHER_TIER_BOWS,
  ...ARCHER_ARMOR, ...ARCHER_TIER_ARMOR, ...ARCHER_ACCESSORIES,
];

const BY_REF = new Map<number, ItemDefinition>(
  ARCHER_CATALOG.map((d) => [d.definitionRef, d]),
);

/** Tanım araması. Katalogda YOKSA `undefined` — uydurma tanım ÜRETİLMEZ. */
export function itemDefinition(definitionRef: number): ItemDefinition | undefined {
  return BY_REF.get(definitionRef);
}

/** Bu ref kuşanılabilir bir Project Legacy itemi mi? */
export function isEquipmentItem(definitionRef: number): boolean {
  return BY_REF.has(definitionRef);
}

/** Katalogdaki tüm tanımlar (test/telemetri). */
export function allDefinitions(): readonly ItemDefinition[] { return ARCHER_CATALOG; }
