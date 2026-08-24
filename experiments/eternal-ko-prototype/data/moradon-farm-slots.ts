/** MORADON YERLEŞİMİ — P2.35
 *
 *  ══════════════ ÖN KOŞUL ══════════════
 *  Bu dosya ÜÇ dosyayla BİRLİKTE alınmalı, tek başına kullanılamaz:
 *      moradon-city-clear.ts        (maskeden çıkarılır)
 *      moradon-lake-mask.ts         (maskeye eklenir)
 *      moradon-terrain-override.ts  (yükseklik tablosuna binen düzeltme)
 *  Zincir:  ham maske  AND NOT city-clear  OR lake-mask
 *  Konumlar ve MORADON_WALK_DISTANCE bu zincir uygulanmış maskeye göre
 *  hesaplandı. Ham maskede 19 slot bina içinde kalır.
 *
 *  ══════════════ P2.34'TEN FARKLAR ══════════════
 *  1. ESKİ ŞEHİR SİLİNDİ (28 758 ince hücre).
 *  2. AYRIK MESAFE ARTIK KENARDAN KENARA. P2.34'te 330 birim MERKEZDEN
 *     ölçülüyordu; slotlar 200×200 olduğu için çapraz komşularda gerçek
 *     boşluk 57 birime iniyordu ve elit aggro (260) komşu slotu uyandırıyordu.
 *     Şimdi kenardan kenara EN AZ 300. Ölçülen: min 301, medyan 339.
 *  3. KENAR BOYU SABİT DEĞİL — 160-260 arası, slot başına ayrı. Görsel
 *     tekdüzelik kırılır, her farm noktası farklı yoğunlukta hissedilir.
 *  4. IZGARAYA HİZALI DEĞİL. P2.34'te 29 slot aynı Y'yi paylaşıyordu ve göz
 *     bunu satır olarak okuyordu. Şimdi 51 slotun 51'i benzersiz Y'de.
 *  5. EĞİM KISITI: slot içinde maks eğim 15°, yükseklik farkı 45 birim.
 *     P2.34'te 12 slot dik zemine oturuyordu.
 *  6. GEÇERLİLİK EŞİĞİ 16/16. Slot dikdörtgeninin İÇİNDE tek bir kapalı ince
 *     hücre bile olamaz. 12/16 eşiğinde 3 slotta artık kapalı hücre kalıyordu
 *     ve bir mob doğuş noktası duvara denk geliyordu.
 *
 *  ══════════════ KEEP_RADIUS ══════════════
 *  1024'te BIRAKILDI. Gerekçe kalenin görsel boyutu değil: yeni oyuncunun
 *  mob görmeden önce nefes alacağı bir alan. Kale modeli küçülse de gerekli.
 *  Bedeli ölçüldü: A bandı 1024'te 9 slot almıyor, 8 alıyor. Slot sayısı
 *  52 → 51'e indi. Kayıp değil temizlenme: Sv1-8 aralığında tam 8 tür var,
 *  her türe bir slot düşüyor, P2.34'teki Toprak Solucanı tekrarı kalktı.
 *
 *  ══════════════ YÖNTEM ══════════════
 *  Önce mesafeye göre açgözlü paketleme ile geçerli bir temel yerleşim
 *  kuruldu (kapasite 62), sonra 80 000 rastgele oynatma denendi ve YALNIZ
 *  hiçbir kısıtı bozmayanlar kabul edildi (25 053 kabul). Oynatma sırasında
 *  slotun bant değiştirmesine izin verilmedi — gradyan monotonluğu korundu.
 *  Tohum sabit, her derlemede AYNI çıkar.
 *
 *  ══════════════ AI KESİMİ ══════════════
 *  Sv1-7 PASİF (7 slot): yeni oyuncu ne olduğunu anlamadan saldırıya
 *  uğramasın. Sv8 SALDIRGAN: oyuncu B bandına girmeden aggro diye bir şeyin
 *  var olduğunu öğrensin. Sv40+ ELİT.
 *
 *  Elit aggro yarıçapı 260'ta BIRAKILDI. 360'a çıkarmak 400 birim boşluk
 *  ister, harita bütçesi kaldırmıyor. Elit farkı leash ve tepki gecikmesiyle
 *  verilmeli, aggro yarıçapıyla değil. */

import { defineMobSlot, slotPlacement, type MobSpawnSlot } from './mob-slot-schema.js';
import { registerExtraMonsters } from './extra-monsters.js';

registerExtraMonsters();

export const MORADON_PLAY_SPAWN = { x: 680, y: 4440 } as const;

/** Kale alanı yarıçapı — bu mesafede mob YOK. */
export const KEEP_RADIUS = 1024;

/** Kenardan kenara EN AZ boşluk. Elit aggro (260) bunun altında kalmalı. */
export const SLOT_MIN_EDGE_GAP = 300;

/** Kenar boyu artık slot başına. `SLOT_RECT` sabitine bağlı kod —
 *  özellikle moradon-foliage.ts'teki yasak bölge hesabı — slotun kendi
 *  `r` değerini okumalıdır. */
export const SLOT_RECT_MIN = 160;
export const SLOT_RECT_MAX = 260;

export const MORADON_RESPAWN_SEC = 20;

const SMALL = { sheet: 'kurt', tint: '#e8e0d0', scale: 0.52 } as const;
const SWAMP = { sheet: 'kurt', tint: '#9fb08a', scale: 0.62 } as const;
const BOSS  = { sheet: 'kurt', tint: '#c9a05a', scale: 0.78 } as const;

interface Placement {
  x: number; y: number; r: number; ref: number; count: number; name: string;
  ai: 'NORMAL' | 'AGGRESSIVE' | 'ELITE';
  art: { sheet: 'kurt'; tint: string; scale: number };
}

/** `x`/`y` dikdörtgenin SOL ÜST köşesi, `r` kenar uzunluğu.
 *  Yorum: bant · seviye · doğuştan YÜRÜME mesafesi. */
const PLACEMENT: readonly Placement[] = [
  { x: 1750, y: 4307, r: 160, ref: 750, count: 5, name: 'Toprak Solucanı', ai: 'NORMAL', art: SMALL },   /* A · Sv1 · 1186 */
  { x: 1453, y: 3454, r: 160, ref: 850, count: 5, name: 'Çalı Sıçanı', ai: 'NORMAL', art: SMALL },   /* A · Sv2 · 1315 */
  { x: 1845, y: 4831, r: 160, ref: 752, count: 5, name: 'Kan Solucanı', ai: 'NORMAL', art: SMALL },   /* A · Sv4 · 1422 */
  { x: 524, y: 2827, r: 190, ref: 851, count: 5, name: 'Yaban Sıçanı', ai: 'NORMAL', art: SMALL },   /* A · Sv5 · 1553 */
  { x: 1370, y: 2843, r: 210, ref: 150, count: 5, name: 'Yamyam Goblin', ai: 'NORMAL', art: SMALL },   /* A · Sv6 · 1835 */
  { x: 2356, y: 4133, r: 190, ref: 754, count: 5, name: 'Leş Böceği', ai: 'NORMAL', art: SMALL },   /* A · Sv6 · 1859 */
  { x: 2349, y: 4705, r: 210, ref: 852, count: 5, name: 'Çöpçü Sıçan', ai: 'NORMAL', art: SMALL },   /* A · Sv7 · 1909 */
  { x: 2033, y: 3071, r: 160, ref: 755, count: 5, name: 'Kapkaççı', ai: 'AGGRESSIVE', art: SMALL },   /* A · Sv8 · 2040 */
  { x: 2852, y: 4069, r: 170, ref: 255, count: 5, name: 'Bataklık Yaratığı', ai: 'AGGRESSIVE', art: SWAMP },   /* B · Sv9 · 2373 */
  { x: 2607, y: 3386, r: 210, ref: 255, count: 5, name: 'Bataklık Yaratığı', ai: 'AGGRESSIVE', art: SWAMP },   /* B · Sv9 · 2445 */
  { x: 1901, y: 2469, r: 180, ref: 250, count: 5, name: 'Bataklık Devi', ai: 'AGGRESSIVE', art: SWAMP },   /* B · Sv11 · 2450 */
  { x: 2939, y: 4582, r: 260, ref: 252, count: 5, name: 'Bataklık Reisi', ai: 'AGGRESSIVE', art: SWAMP },   /* B · Sv15 · 2459 */
  { x: 1102, y: 2075, r: 220, ref: 105, count: 5, name: 'Kecoon Savaşçısı', ai: 'AGGRESSIVE', art: SWAMP },   /* B · Sv16 · 2595 */
  { x: 2544, y: 2541, r: 200, ref: 105, count: 5, name: 'Kecoon Savaşçısı', ai: 'AGGRESSIVE', art: SWAMP },   /* B · Sv16 · 2799 */
  { x: 602, y: 2073, r: 160, ref: 203, count: 5, name: 'Dev Bulcan', ai: 'AGGRESSIVE', art: SWAMP },   /* B · Sv17 · 2850 */
  { x: 1643, y: 1884, r: 260, ref: 301, count: 5, name: 'Dev Gavolt', ai: 'AGGRESSIVE', art: SWAMP },   /* B · Sv18 · 2887 */
  { x: 3537, y: 4286, r: 210, ref: 204, count: 6, name: 'Leş Kuşu', ai: 'AGGRESSIVE', art: SWAMP },   /* C · Sv19 · 3059 */
  { x: 3271, y: 3167, r: 190, ref: 204, count: 6, name: 'Leş Kuşu', ai: 'AGGRESSIVE', art: SWAMP },   /* C · Sv19 · 3177 */
  { x: 2294, y: 1810, r: 180, ref: 109, count: 6, name: 'Kecoon Kaptanı', ai: 'AGGRESSIVE', art: SWAMP },   /* C · Sv20 · 3256 */
  { x: 3684, y: 4919, r: 160, ref: 109, count: 6, name: 'Kecoon Kaptanı', ai: 'AGGRESSIVE', art: SWAMP },   /* C · Sv20 · 3295 */
  { x: 3067, y: 2412, r: 210, ref: 1000, count: 6, name: 'Ceset', ai: 'AGGRESSIVE', art: SWAMP },   /* C · Sv21 · 3386 */
  { x: 3758, y: 3766, r: 190, ref: 500, count: 6, name: 'Kurt Adam', ai: 'AGGRESSIVE', art: SWAMP },   /* C · Sv23 · 3409 */
  { x: 1720, y: 1348, r: 190, ref: 500, count: 6, name: 'Kurt Adam', ai: 'AGGRESSIVE', art: SWAMP },   /* C · Sv23 · 3464 */
  { x: 1149, y: 1291, r: 250, ref: 114, count: 6, name: 'Kecoon Cengaveri', ai: 'AGGRESSIVE', art: SWAMP },   /* C · Sv25 · 3471 */
  { x: 2819, y: 1839, r: 200, ref: 502, count: 6, name: 'Ay Kurdu', ai: 'AGGRESSIVE', art: SWAMP },   /* C · Sv27 · 3502 */
  { x: 4161, y: 4555, r: 240, ref: 502, count: 6, name: 'Ay Kurdu', ai: 'AGGRESSIVE', art: SWAMP },   /* C · Sv27 · 3716 */
  { x: 3746, y: 2805, r: 170, ref: 115, count: 6, name: 'Kecoon Ejderhası', ai: 'AGGRESSIVE', art: SWAMP },   /* C · Sv30 · 3766 */
  { x: 4261, y: 3861, r: 160, ref: 1100, count: 8, name: 'İskelet', ai: 'AGGRESSIVE', art: BOSS },   /* D · Sv32 · 3855 */
  { x: 494, y: 963, r: 200, ref: 1100, count: 8, name: 'İskelet', ai: 'AGGRESSIVE', art: BOSS },   /* D · Sv32 · 3914 */
  { x: 2246, y: 1130, r: 170, ref: 1100, count: 8, name: 'İskelet', ai: 'AGGRESSIVE', art: BOSS },   /* D · Sv32 · 3919 */
  { x: 2880, y: 1340, r: 160, ref: 505, count: 8, name: 'Azgın Kurt', ai: 'AGGRESSIVE', art: BOSS },   /* D · Sv34 · 3984 */
  { x: 4162, y: 3186, r: 210, ref: 505, count: 8, name: 'Azgın Kurt', ai: 'AGGRESSIVE', art: BOSS },   /* D · Sv34 · 4040 */
  { x: 3376, y: 1616, r: 160, ref: 905, count: 8, name: 'İğneli Akrep', ai: 'AGGRESSIVE', art: BOSS },   /* D · Sv36 · 4044 */
  { x: 4760, y: 4042, r: 190, ref: 905, count: 8, name: 'İğneli Akrep', ai: 'AGGRESSIVE', art: BOSS },   /* D · Sv36 · 4293 */
  { x: 4808, y: 4609, r: 160, ref: 905, count: 8, name: 'İğneli Akrep', ai: 'AGGRESSIVE', art: BOSS },   /* D · Sv36 · 4299 */
  { x: 1729, y: 465, r: 240, ref: 1102, count: 8, name: 'İskelet Şövalye', ai: 'AGGRESSIVE', art: BOSS },   /* D · Sv38 · 4360 */
  { x: 3348, y: 1144, r: 160, ref: 1102, count: 8, name: 'İskelet Şövalye', ai: 'AGGRESSIVE', art: BOSS },   /* D · Sv38 · 4367 */
  { x: 3945, y: 2025, r: 160, ref: 600, count: 8, name: 'Kılıç Dişli', ai: 'ELITE', art: BOSS },   /* D · Sv40 · 4368 */
  { x: 1072, y: 446, r: 170, ref: 600, count: 8, name: 'Kılıç Dişli', ai: 'ELITE', art: BOSS },   /* D · Sv40 · 4400 */
  { x: 4329, y: 2708, r: 160, ref: 600, count: 8, name: 'Kılıç Dişli', ai: 'ELITE', art: BOSS },   /* D · Sv40 · 4416 */
  { x: 545, y: 443, r: 200, ref: 1103, count: 8, name: 'İskelet Kahraman', ai: 'ELITE', art: BOSS },   /* D · Sv42 · 4467 */
  { x: 4729, y: 3338, r: 210, ref: 1103, count: 8, name: 'İskelet Kahraman', ai: 'ELITE', art: BOSS },   /* D · Sv42 · 4534 */
  { x: 2325, y: 459, r: 160, ref: 603, count: 8, name: 'Kılıç Diş', ai: 'ELITE', art: BOSS },   /* E · Sv44 · 4632 */
  { x: 3078, y: 690, r: 170, ref: 603, count: 8, name: 'Kılıç Diş', ai: 'ELITE', art: BOSS },   /* E · Sv44 · 4707 */
  { x: 3814, y: 975, r: 230, ref: 603, count: 8, name: 'Kılıç Diş', ai: 'ELITE', art: BOSS },   /* E · Sv44 · 4772 */
  { x: 4853, y: 2588, r: 200, ref: 1111, count: 8, name: 'Ölüm Şövalyesi', ai: 'ELITE', art: BOSS },   /* E · Sv46 · 4969 */
  { x: 4373, y: 1497, r: 170, ref: 1111, count: 8, name: 'Ölüm Şövalyesi', ai: 'ELITE', art: BOSS },   /* E · Sv46 · 5047 */
  { x: 2965, y: 225, r: 160, ref: 1201, count: 8, name: 'Muhafız', ai: 'ELITE', art: BOSS },   /* E · Sv48 · 5138 */
  { x: 4864, y: 2053, r: 160, ref: 1201, count: 8, name: 'Muhafız', ai: 'ELITE', art: BOSS },   /* E · Sv48 · 5201 */
  { x: 3537, y: 347, r: 180, ref: 512, count: 8, name: 'Kan Avcısı', ai: 'ELITE', art: BOSS },   /* E · Sv50 · 5250 */
  { x: 4235, y: 430, r: 210, ref: 512, count: 8, name: 'Kan Avcısı', ai: 'ELITE', art: BOSS },   /* E · Sv50 · 5538 */   /* P2.35: 170→210, 8 mob 3×3 ızgarada dip dibe düşüyordu (§50) */
];

/** Slot başına gerçek yürüme mesafesi, PLACEMENT ile AYNI SIRADA.
 *  Seviye gradyanı bu diziye göre monotondur; kuş uçuşuyla ölçen test
 *  yanlış sonuç verir. */
export const MORADON_WALK_DISTANCE: readonly number[] = [
  1186, 1315, 1422, 1553, 1835, 1859, 1909, 2040, 2373, 2445, 2450, 2459, 2595, 2799, 2850, 2887, 3059, 3177, 3256, 3295, 3386, 3409, 3464, 3471, 3502, 3716, 3766, 3855, 3914, 3919, 3984, 4040, 4044, 4293, 4299, 4360, 4367, 4368, 4400, 4416, 4467, 4534, 4632, 4707, 4772, 4969, 5047, 5138, 5201, 5250, 5538,
];

export const MORADON_FARM_SLOTS: readonly MobSpawnSlot[] = PLACEMENT.map((p, i) =>
  defineMobSlot({
    id: `mo_${String(i + 1).padStart(2, '0')}`,
    displayName: p.name,
    monsterRef: p.ref,
    area: { minX: p.x, maxX: p.x + p.r, minY: p.y, maxY: p.y + p.r },
    count: p.count,
    aiType: p.ai,
    respawnSec: MORADON_RESPAWN_SEC,
    roamRadius: p.r / 4,
    visual: p.art,
  }));

/** Sahada GERÇEKTEN doğan mob sayısı.
 *
 *  P2.37 — ham `count` DEĞİL, TAVANLANMIŞ sayı toplanır. Yerleşim üst
 *  bantlarda slot başına sekiz mob yazıyor; ölçümde bu çöküyordu
 *  (bkz. `mob-count-cap.ts`). Tavan `slotPlacement` içinde uygulanır ve
 *  sayım da aynı kapıdan geçmeli, yoksa "kaç mob var" sorusunun iki
 *  farklı cevabı olur. */
export const MORADON_POPULATION = MORADON_FARM_SLOTS
  .reduce((n, s) => n + slotPlacement(s).count, 0);
