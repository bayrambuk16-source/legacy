/** MORADON GANİMET HAVUZU — KATALOGDAN TÜRETİLİR (P2.30)
 *
 *  ══════════════ NEDEN GEREKTİ ══════════════
 *  Oyun testi bulgusu: bir saat oynayıp bot, eldiven ve HİÇBİR takı
 *  düşmedi. Ölçüldü — kaynak ganimet tabloları kataloğumuzun ancak
 *  yarısını kapsıyordu:
 *
 *      yay 5/8 · kask 3/5 · zırh 2/4 · pantolon 2/4
 *      eldiven 2/4 · bot 2/4
 *      küpe 0/2 · yüzük 0/2 · kolye 0/1 · kemer 0/1
 *
 *  Sebep: kaynak tablolar KO'nun kendi item ID'lerine atıf yapıyor.
 *  A1'de kataloğa eklediğimiz Avcı ve Zırhlı Avcı setleri o tablolarda
 *  YOK — ekledik ama düşürecek mob yoktu. Takılar da hiçbir Moradon
 *  mobunun tablosunda değildi.
 *
 *  Düşenlerin oranı da düşüktü: 3000 kill simülasyonunda bot 7,
 *  eldiven 13, yüzük 10 — yani bir saatlik oturumda bir tane bile
 *  düşmeyebiliyordu.
 *
 *  ══════════════ KAYNAK TABLOLAR SİLİNMEDİ ══════════════
 *  `drop-profile.ts` ham kaynak zincirini taşımaya devam eder ve
 *  denetlenebilir kalır. Bu dosya YALNIZ oyuncuya ulaşan havuzu
 *  belirler — kaynağın yerine geçmez, önüne geçer.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. Zar atışı
 *  `DropSystem`in tohumlu akışındadır.
 *
 *  ══════════════ İKİ KURAL ══════════════
 *  1. SEVİYE BANDI — bir mob yalnız kendi bandına uygun eşya düşürür.
 *     Sv1 solucan Sv30 zırhı düşüremez.
 *  2. HER YUVA TEMSİL EDİLİR — bandındaki her yuvadan en az bir eşya
 *     havuzda bulunur. Aksi hâlde o yuva hiç dolmaz (yaşanan hata). */

import { allDefinitions } from './item-catalog.js';
import type { ItemDefinition } from './item-model.js';

/** Bir eşyanın hangi mob seviyesinden itibaren düşebileceği.
 *
 *  Katalogda `reqLevel` alanı KULLANILAMAZ: kaynakta bütün itemlerin
 *  reqLevel değeri 1 (ölçüldü). Bu yüzden bant, eşyanın GÜCÜNDEN
 *  türetilir — güçlü eşya güçlü mobdan düşer. */
export function itemTierLevel(def: ItemDefinition): number {
  /* `stats` bir BİRLEŞİM tipidir: `attack` yalnız silahta, `defense`
     yalnız zırhta var. `category` ile daraltmak tip güvenliğini korur
     — `as` KULLANILMAZ. */
  const atk = def.category === 'weapon' ? def.stats.attack : 0;
  const dfn = def.category === 'armor' ? def.stats.defense : 0;
  const dex = def.category === 'weapon' ? 0 : def.stats.dex;
  const hp = def.category === 'weapon' ? def.stats.maxHp : def.stats.maxHp;
  const power = atk * 2 + dfn + dex * 2 + hp / 8;
  /* Ölçek: en zayıf eşya (Avcı Çizmesi, güç 11) → Sv1
   *        en güçlü (Karanlık Yemin, güç 76)     → Sv30
   *  Doğrusal eşleme; kırılma noktası uydurulmadı, uçlardan çözüldü. */
  const MIN_POWER = 11, MAX_POWER = 76;
  const t = (power - MIN_POWER) / (MAX_POWER - MIN_POWER);
  return Math.max(1, Math.min(30, Math.round(1 + t * 29)));
}

/** Mobun düşürebileceği eşyalar: SEVİYESİNİ AŞMAYAN her katalog eşyası.
 *
 *  ALT SINIR YOKTUR — bilinçli. İlk denemede "mob kendi bandının çok
 *  altını düşürmesin" diye alt sınır konmuştu ve ÖLÇÜMDE ÇÖKTÜ:
 *  Sv30 havuzunda yalnız YAY kalıyordu (4 eşya, 1 yuva), çünkü üst
 *  kademede o kadar çeşit yok. Bu, düzeltmeye çalıştığımız hatanın
 *  aynısıydı — bazı yuvalar hiç dolmuyordu.
 *
 *  Çeşitlilik yerine AĞIRLIKLA sağlanır: güçlü mob kendi kademesine
 *  yakın eşyayı sık, çok altındakini seyrek düşürür (`pickFromPool`).
 *
 *  Sv1 mob için havuz boş kalmaz: en zayıf eşyaların bandı 1'dir. */
export function poolFor(monsterLevel: number): ItemDefinition[] {
  const out = allDefinitions().filter((d) => itemTierLevel(d) <= monsterLevel);
  if (out.length > 0) return out;
  /* Güvenlik ağı: hiçbir eşya bu seviyeye uymuyorsa EN ZAYIFLARA düş.
     Boş havuz "hiç item düşmez" demektir — yaşanan hatanın ta kendisi. */
  const all = allDefinitions();
  const minTier = Math.min(...all.map(itemTierLevel));
  return all.filter((d) => itemTierLevel(d) === minTier);
}

/** ═══ DÜŞME ORANLARI ═══
 *
 *  Hedef: 1-2 saatlik oturumda TAM TAKIM. Ölçüm — saatte ~550 kill.
 *  On iki yuva var; her yuvanın en az bir kez dolması için yuva başına
 *  en az bir düşüş gerekir.
 *
 *  `EQUIP_DROP_CHANCE` mob başına EKİPMAN düşme olasılığıdır; hangi
 *  eşyanın düştüğü havuzdan eşit olasılıkla seçilir. %14 ile 550
 *  kill'de ~77 ekipman düşer — on iki yuvaya dağılınca yuva başına
 *  ortalama 6 parça. Şansın kötüyse bile bir yuva boş kalmaz.
 *
 *  Elit moblar İKİ KAT şansa sahiptir (parşömen kuralıyla aynı). */
export const EQUIP_DROP_CHANCE = 0.14;

/** Aynı kill'de EN ÇOK kaç ekipman düşebilir. Tek parça, çünkü çoklu
 *  düşüş çantayı hızla doldurur ve oto sat kurulmadan boğar. */
export const MAX_EQUIP_PER_KILL = 1;

/** Havuzdan eşya seçer. `roll` [0,1) aralığında tohumlu bir sayıdır —
 *  `Math.random()` KULLANILMAZ.
 *
 *  Seçim AĞIRLIKLIDIR: zayıf eşya sık, güçlü eşya seyrek düşer.
 *  Ağırlık, eşyanın bandı ile mobun seviyesi arasındaki farktan gelir;
 *  mobun seviyesine yakın eşya daha nadirdir. */
export function pickFromPool(
  pool: readonly ItemDefinition[], monsterLevel: number, roll: number,
): ItemDefinition | null {
  if (pool.length === 0) return null;
  const weights = pool.map((d) => {
    /* Mobun kademesine YAKIN eşya sık, ÇOK ALTINDAKİ seyrek.
       Güçlü mobdan güçlü eşya beklemek doğal; ama alt kademe de
       tamamen kesilmez, yoksa yuva çeşitliliği kaybolur. */
    const gap = Math.max(0, monsterLevel - itemTierLevel(d));
    return 1 / (1 + gap * 0.35);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let x = Math.min(0.9999999, Math.max(0, roll)) * total;
  for (let i = 0; i < pool.length; i++) {
    x -= weights[i]!;
    if (x < 0) return pool[i]!;
  }
  return pool[pool.length - 1]!;
}

/** Denetim için: her yuvanın hangi mob seviyesinden itibaren
 *  düşebildiği. Test bunun BOŞ OLMAMASINI doğrular. */
export function slotCoverage(): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const d of allDefinitions()) {
    (out[d.equipSlot] ??= []).push(itemTierLevel(d));
  }
  for (const k of Object.keys(out)) out[k]!.sort((a, b) => a - b);
  return out;
}

/* ═══════════════ P2.33 — ÜST SEVİYE MOB DROPLARI ═══════════════ */

/** Sv31'den itibaren mob "üst seviye" sayılır. Kullanıcı kararı:
 *  bu moblardan düşen üst kademe eşya İKİ KAT ZOR olsun. */
export const HIGH_TIER_MONSTER_LEVEL = 31;

/** Üst seviye mobda ekipman şansı — KULLANICI KARARI: %2-3.
 *  Sv1-30 bandındaki %14'ten belirgin biçimde zor; oradaki eşyalar
 *  bandın en iyileri olduğu için daha seyrek düşer. */
export const HIGH_TIER_EQUIP_CHANCE = 0.03;

/** Mob seviyesine göre ekipman düşme şansı.
 *
 *  ELİT ÇARPANI YALNIZ ALT BANTTA: üst seviye mobların hepsi zaten
 *  elit (Sv20+ kuralı), çarpan uygulansaydı istenen %3 kendiliğinden
 *  %6 olurdu. Kullanıcının verdiği sayı NET orandır. */
export function equipChanceFor(monsterLevel: number, elite: boolean): number {
  if (monsterLevel >= HIGH_TIER_MONSTER_LEVEL) return HIGH_TIER_EQUIP_CHANCE;
  return EQUIP_DROP_CHANCE * (elite ? 2 : 1);
}

/** ═══ SV50 GANİMETİ ═══
 *
 *  Kullanıcı kararı: yeni moblardan 50 000 altınlık, YIĞILABİLİR
 *  (9999) bir eşya düşsün; oranı %0,5.
 *
 *  Kaynak: `items.json` 379107000 "Altın Sikke", `vendorBuy` 1 000 000.
 *  Satış fiyatı bu dosyada DEĞİL, `AutoGearSystem.sellPrice` içindeki
 *  kuralla belirlenir; oraya özel bir kayıt eklendi. */
export const HIGH_TIER_TROPHY_REF = 379107000;
export const HIGH_TIER_TROPHY_CHANCE = 0.005;
export const HIGH_TIER_TROPHY_VALUE = 50_000;
export const HIGH_TIER_TROPHY_STACK = 9999;

/* ═══════════════ SİLAH ACIMA SAYACI (P3.22) ═══════════════
 *
 *  Oyun testi bulgusu: "bow çıkmadı, ilerleyemedim". Ölçüldü — yirmi
 *  dakikada 32 ekipman düştü, HİÇBİRİ yay değildi.
 *
 *  Sebep yapısal: okçuda saldırı gücü YAYA bağlıdır (KO formülünde
 *  DEX yay hasarıyla ÇARPILIR). Yay düşmezse güç artmaz, güç artmazsa
 *  kat çıkılamaz, kat çıkılamazsa daha iyi yay düşmez. Diğer dokuz
 *  yuva bu kilidi açamaz.
 *
 *  Havuz on yuvaya bölündüğü için yay şansı ~%10; birkaç talihsiz
 *  seri oyuncuyu saatlerce kilitleyebiliyor. Sayaç bunu sınırlar:
 *  art arda bu kadar ekipman düşüp hiç yay çıkmadıysa SONRAKİ düşüş
 *  yay olur.
 *
 *  Bu bir OLASILIK DÜZELTMESİDİR, bedava eşya değil: yay yine
 *  havuzdan ve kendi ağırlığıyla seçilir, yalnız yuvası garantilenir. */
export const WEAPON_PITY_LIMIT = 8;

/** Havuzu YALNIZ silahlara daraltır. Havuzda silah yoksa `null`. */
export function weaponsIn(pool: readonly ItemDefinition[]): ItemDefinition[] {
  return pool.filter((d) => d.category === 'weapon');
}
