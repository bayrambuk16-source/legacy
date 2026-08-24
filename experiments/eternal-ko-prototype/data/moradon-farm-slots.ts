/** MORADON YERLEŞİMİ — KÖŞE DOĞUŞ + HARİTAYA YAYILMIŞ SLOTLAR (P2.10)
 *
 *  ══════════════ DOĞUŞ NOKTASI BİLİNÇLİ OLARAK TAŞINDI ══════════════
 *  P2.4C'de doğuş `start_positions` kaynağından türetilmişti ve "kapanmış
 *  karar" diye işaretlenmişti. P2.10'da bu
 *  karar OYNANIŞ GEREKÇESİYLE değiştirildi: doğuş haritanın GÜNEYBATI
 *  köşesine alındı. Sebep — oyuncu bir köşeden başlayıp haritanın içine
 *  doğru ilerlemeli; merkezden başlayınca her yön aynı oluyor ve seviye
 *  gradyanı kurulamıyor. Köşe ileride KALE olacak.
 *
 *  Kaynak değer SİLİNMEDİ: `MORADON_WORLD_SPAWN` (moradon-coords.ts) yerinde
 *  duruyor ve KO'nun ne dediğini söylemeye devam ediyor. Buradaki değer
 *  Project Legacy'nin OYNANIŞ kararıdır; ikisi AYRI kavramdır.
 *
 *  ══════════════ KALE ALANI — MOB YOK ══════════════
 *  Doğuş çevresinde `KEEP_RADIUS` kadar mob YOKTUR. Yarıçap haritanın beşte
 *  biridir (5120 / 5 ≈ 1024) — kullanıcı kararı. Yeni oyuncu üstüne mob
 *  gelmeden nefes alır; ileride kale yapıları bu alana kurulur.
 *
 *  ══════════════ SEVİYE GRADYANI MESAFEDEN TÜRER ══════════════
 *  Slotlar doğuşa uzaklığa göre sıralanır ve 11 mob türü seviye sırasına
 *  göre bu sıraya dağıtılır: en yakın slotta Sv1, en uzakta Sv15.
 *
 *  ══════════════ P2.12 — KOORDİNATLAR ×2 ══════════════
 *  Harita ölçeği 5'ten 10'a çıkınca (dünya 5120×5120) bütün slot
 *  koordinatları iki katına alındı. SLOT SAYISI ve MOB SAYISI DEĞİŞMEDİ
 *  (kullanıcı kararı) — aynı 23 slot dört kat alana yayıldı.
 *
 *  `SLOT_RECT` 200'de KALDI: slot içi mob yoğunluğu aynı kalsın, yalnız
 *  slotlar arası mesafe açılsın diye.
 *
 *  ══════════════ YERLEŞİM "NİZAMİ" DEĞİLDİR ══════════════
 *  Dikdörtgenler ızgaraya dizilmedi. Aday havuzu TOHUMLU bir karıştırmayla
 *  tarandı ve aralarında en az 300 birim bulunanlar seçildi. Tohum sabit
 *  olduğu için yerleşim her derlemede AYNIDIR (test edilebilir), ama gözle
 *  bakınca düzensiz görünür.
 *
 *  ══════════════ DİKDÖRTGENLER TAMAMEN AÇIK ══════════════
 *  Her slotun 200×200'lük alanının TAMAMI collision maskesine göre açıktır.
 *  Engeller şu an kapalı olsa bile (`MORADON_COLLISION_ACTIVE = false`) bu
 *  kural korundu: duvarlar geri açıldığında hiçbir mob duvarda kalmaz. */

import { defineMobSlot, type MobSpawnSlot } from './mob-slot-schema.js';
import { registerExtraMonsters } from './extra-monsters.js';

/* P2.17 — SV16-20 MOBLARI. Slot tanımları `Content.monster()` doğrulaması
   yapıyor; kayıt bu yüzden tablodan ÖNCE tanıtılmalı. */
registerExtraMonsters();

/** OYNANIŞ doğuş noktası — güneybatı köşesi. Kaynak değeri EZMEZ. */
export const MORADON_PLAY_SPAWN = { x: 680, y: 4440 } as const;

/** Kale alanı yarıçapı — bu mesafede mob YOK. */
export const KEEP_RADIUS = 1024;

/** Slot dikdörtgeninin kenarı. 200 birim: 5-8 mob içeride birbirine
 *  yapışmadan dağılır (hücre ızgarası 3×3 → hücre başına ~66 birim). */
export const SLOT_RECT = 200;

/** Respawn süresi (sn) — kullanıcı kararı. */
export const MORADON_RESPAWN_SEC = 20;

const SMALL = { sheet: 'kurt', tint: '#e8e0d0', scale: 0.52 } as const;
const SWAMP = { sheet: 'kurt', tint: '#9fb08a', scale: 0.62 } as const;
const BOSS = { sheet: 'kurt', tint: '#c9a05a', scale: 0.78 } as const;

interface Placement {
  x: number; y: number; ref: number; count: number; name: string;
  ai: 'NORMAL' | 'AGGRESSIVE' | 'ELITE';
  art: { sheet: 'kurt'; tint: string; scale: number };
}

/** Ham yerleşim — maske taramasının çıktısı. `x`/`y` dikdörtgenin SOL ÜST
 *  köşesidir; kenar `SLOT_RECT`. Yorumdaki mesafe doğuş noktasınadır. */
const PLACEMENT: readonly Placement[] = [
  /* ═══ P2.34 — YÜRÜME MESAFESİNE GÖRE DAĞITIM ═══
     P2.33'te dağıtım KUŞ UÇUŞU mesafeye göreydi ve haritada bakınca
     bozuk görünüyordu: şehrin sağ tarafındaki slotlar doğuşa yakın
     ölçülüyor ama arada binalar olduğu için yürüyerek uzak kalıyordu.
     Sv32'lik bir slot, Sv9'un hemen yanında duruyordu.

     Artık mesafe BFS ile hesaplanıyor: doğuş noktasından yürünebilir
     hücreler üzerinden gerçek yol uzunluğu. 40 birimlik ızgarada
     16 384 hücrenin 12 527'si ulaşılabilir; en uzak nokta 6 283 birim.

     Slotlar bu gerçek mesafeye göre EŞİT ARALIKLI seçildi (120 aday
     içinden 52). Şehir arkasındaki noktalar artık doğru bantlarına
     düşüyor ve boş kalan köşeler doluyor.

     Diğer kurallar P2.33'ten aynen sürüyor: harita büyütülmedi, bitki
     sayısı sabit, mob sayısı seviyeyle azalır (Sv1-10 sekiz, Sv36+
     beş), ayrık mesafe 330 birim. */
  { x: 580, y: 3100, ref: 750, count: 8, name: 'Toprak Solucanı', ai: 'NORMAL', art: SMALL },
  { x: 1450, y: 3400, ref: 750, count: 8, name: 'Toprak Solucanı', ai: 'NORMAL', art: SMALL },
  { x: 220, y: 3040, ref: 850, count: 8, name: 'Çalı Sıçanı', ai: 'NORMAL', art: SMALL },
  { x: 580, y: 2740, ref: 850, count: 8, name: 'Çalı Sıçanı', ai: 'NORMAL', art: SMALL },
  { x: 250, y: 2710, ref: 752, count: 8, name: 'Kan Solucanı', ai: 'NORMAL', art: SMALL },
  { x: 2140, y: 3550, ref: 851, count: 8, name: 'Yaban Sıçanı', ai: 'NORMAL', art: SMALL },
  { x: 1690, y: 2740, ref: 851, count: 8, name: 'Yaban Sıçanı', ai: 'NORMAL', art: SMALL },
  { x: 220, y: 2380, ref: 150, count: 8, name: 'Yamyam Goblin', ai: 'NORMAL', art: SMALL },
  { x: 1240, y: 2380, ref: 150, count: 8, name: 'Yamyam Goblin', ai: 'NORMAL', art: SMALL },
  { x: 2200, y: 2860, ref: 754, count: 8, name: 'Leş Böceği', ai: 'NORMAL', art: SMALL },
  { x: 1930, y: 2500, ref: 852, count: 8, name: 'Çöpçü Sıçan', ai: 'NORMAL', art: SMALL },
  { x: 220, y: 2020, ref: 852, count: 8, name: 'Çöpçü Sıçan', ai: 'NORMAL', art: SMALL },
  { x: 2860, y: 3580, ref: 755, count: 8, name: 'Kapkaççı', ai: 'AGGRESSIVE', art: SMALL },
  { x: 580, y: 1660, ref: 755, count: 8, name: 'Kapkaççı', ai: 'AGGRESSIVE', art: SMALL },
  { x: 2500, y: 2590, ref: 255, count: 8, name: 'Bataklık Yaratığı', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 220, y: 1660, ref: 250, count: 7, name: 'Bataklık Devi', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 3130, y: 3220, ref: 250, count: 7, name: 'Bataklık Devi', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 2410, y: 2020, ref: 252, count: 7, name: 'Bataklık Reisi', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 1180, y: 1480, ref: 252, count: 7, name: 'Bataklık Reisi', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 1810, y: 1630, ref: 105, count: 7, name: 'Kecoon Savaşçısı', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 3040, y: 2620, ref: 203, count: 7, name: 'Dev Bulcan', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 520, y: 1060, ref: 203, count: 7, name: 'Dev Bulcan', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 3460, y: 2950, ref: 301, count: 7, name: 'Dev Gavolt', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 100, y: 1000, ref: 301, count: 7, name: 'Dev Gavolt', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 3010, y: 1780, ref: 204, count: 7, name: 'Leş Kuşu', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 1750, y: 1180, ref: 109, count: 7, name: 'Kecoon Kaptanı', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 1120, y: 820, ref: 109, count: 7, name: 'Kecoon Kaptanı', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 2530, y: 1390, ref: 1000, count: 6, name: 'Ceset', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 1450, y: 880, ref: 500, count: 6, name: 'Kurt Adam', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 3340, y: 1870, ref: 500, count: 6, name: 'Kurt Adam', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 940, y: 520, ref: 114, count: 6, name: 'Kecoon Cengaveri', ai: 'AGGRESSIVE', art: BOSS },
  { x: 1780, y: 790, ref: 114, count: 6, name: 'Kecoon Cengaveri', ai: 'AGGRESSIVE', art: BOSS },
  { x: 2770, y: 1150, ref: 502, count: 6, name: 'Ay Kurdu', ai: 'AGGRESSIVE', art: BOSS },
  { x: 1480, y: 550, ref: 115, count: 6, name: 'Kecoon Ejderhası', ai: 'AGGRESSIVE', art: BOSS },
  { x: 3490, y: 1300, ref: 115, count: 6, name: 'Kecoon Ejderhası', ai: 'AGGRESSIVE', art: BOSS },
  { x: 2290, y: 760, ref: 1100, count: 6, name: 'İskelet', ai: 'AGGRESSIVE', art: BOSS },
  { x: 1180, y: 280, ref: 1100, count: 6, name: 'İskelet', ai: 'AGGRESSIVE', art: BOSS },
  { x: 2680, y: 820, ref: 505, count: 6, name: 'Azgın Kurt', ai: 'AGGRESSIVE', art: BOSS },
  { x: 3340, y: 1000, ref: 905, count: 5, name: 'İğneli Akrep', ai: 'AGGRESSIVE', art: BOSS },
  { x: 3850, y: 1420, ref: 905, count: 5, name: 'İğneli Akrep', ai: 'AGGRESSIVE', art: BOSS },
  { x: 3730, y: 1060, ref: 1102, count: 5, name: 'İskelet Şövalye', ai: 'AGGRESSIVE', art: BOSS },
  { x: 2920, y: 580, ref: 1102, count: 5, name: 'İskelet Şövalye', ai: 'AGGRESSIVE', art: BOSS },
  { x: 3580, y: 760, ref: 600, count: 5, name: 'Kılıç Dişli', ai: 'ELITE', art: BOSS },
  { x: 4180, y: 1540, ref: 1103, count: 5, name: 'İskelet Kahraman', ai: 'ELITE', art: BOSS },
  { x: 3970, y: 820, ref: 1103, count: 5, name: 'İskelet Kahraman', ai: 'ELITE', art: BOSS },
  { x: 3160, y: 340, ref: 603, count: 5, name: 'Kılıç Diş', ai: 'ELITE', art: BOSS },
  { x: 4330, y: 940, ref: 603, count: 5, name: 'Kılıç Diş', ai: 'ELITE', art: BOSS },
  { x: 4210, y: 580, ref: 1111, count: 5, name: 'Ölüm Şövalyesi', ai: 'ELITE', art: BOSS },
  { x: 3730, y: 190, ref: 1201, count: 5, name: 'Muhafız', ai: 'ELITE', art: BOSS },
  { x: 4570, y: 700, ref: 1201, count: 5, name: 'Muhafız', ai: 'ELITE', art: BOSS },
  { x: 4810, y: 940, ref: 512, count: 5, name: 'Kan Avcısı', ai: 'ELITE', art: BOSS },
  { x: 4720, y: 130, ref: 512, count: 5, name: 'Kan Avcısı', ai: 'ELITE', art: BOSS },
];

/** P2.34 — SLOT BAŞINA GERÇEK YÜRÜME MESAFESİ (dünya birimi).
 *
 *  `PLACEMENT` ile AYNI SIRADA. BFS ile hesaplandı: doğuş noktasından
 *  yürünebilir hücreler üzerinden gerçek yol uzunluğu (40 birimlik
 *  ızgara, sekiz yön).
 *
 *  Neden saklanıyor: seviye gradyanı artık KUŞ UÇUŞU değil YÜRÜME
 *  mesafesine göre monoton. Test bunu doğrular; kuş uçuşuyla ölçerse
 *  şehir arkasındaki slotlar yanlış görünür. */
export const MORADON_WALK_DISTANCE: readonly number[] = [
  1240, 1331, 1469, 1600, 1789, 1915, 2047, 2109, 2225, 2307, 2387, 2469, 2595, 2680, 2743, 2829, 2984, 3066, 3129, 3217, 3279, 3313, 3460, 3559, 3578, 3640, 3735, 3755, 3828, 3881, 3989, 4057, 4095, 4165, 4256, 4296, 4329, 4382, 4503, 4543, 4596, 4721, 4843, 4887, 4935, 5060, 5222, 5275, 5452, 5561, 5735, 5970,
];

/** Kanonik slot tablosu — haritanın tamamına yayılmış. */
export const MORADON_FARM_SLOTS: readonly MobSpawnSlot[] = PLACEMENT.map((p, i) =>
  defineMobSlot({
    id: `mo_${String(i + 1).padStart(2, '0')}`,
    displayName: p.name,
    monsterRef: p.ref,
    area: { minX: p.x, maxX: p.x + SLOT_RECT, minY: p.y, maxY: p.y + SLOT_RECT },
    count: p.count,
    aiType: p.ai,
    respawnSec: MORADON_RESPAWN_SEC,
    /* Roam yarıçapı dikdörtgenin çeyreği: mob kendi alanında gezer ama
       komşu slotun içine taşmaz. */
    roamRadius: SLOT_RECT / 4,
    visual: p.art,
  }));

/** Toplam population. */
export const MORADON_POPULATION = MORADON_FARM_SLOTS
  .reduce((n, s) => n + (s.count ?? 1), 0);
