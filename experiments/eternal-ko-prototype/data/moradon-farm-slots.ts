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
  /* ═══ P2.33 — 52 SLOT, SV1-50 ═══
     Moradon'un tavanı Sv30'dan Sv50'ye çıktı (kullanıcı kararı).
     Slot sayısı 33'ten 52'ye, mob havuzu 21'den 31'e.

     Dağıtım OTOMATİK: yürünebilirlik maskesi tarandı, 200×200'lük
     alanı tamamen açık ve birbirinden en az 330 birim uzak 129 aday
     bulundu; 52 slot mesafeye göre EŞİT ARALIKLI seçildi ve mob havuzu
     seviye sırasına göre eşlendi. Seviye mesafeyle MONOTON artar.

     HARİTA BÜYÜTÜLMEDİ — yalnız slot yoğunluğu arttı (kullanıcı
     kararı: bitki sayısı sabit, moblar artacak). Ayrık mesafe 420'den
     330'a indi ki 52 slot 5120×5120'ye sığsın.

     MOB SAYISI seviyeyle AZALIR: Sv1-10 sekiz, Sv36+ beş. Güçlü mobun
     kalabalık olması hazırlıksız oyuncuyu anında öldürürdü. */
  { x: 1600, y: 4240, ref: 750, count: 8, name: 'Toprak Solucanı', ai: 'NORMAL', art: SMALL },
  { x: 1750, y: 4540, ref: 750, count: 8, name: 'Toprak Solucanı', ai: 'NORMAL', art: SMALL },
  { x: 1810, y: 3970, ref: 850, count: 8, name: 'Çalı Sıçanı', ai: 'NORMAL', art: SMALL },
  { x: 1540, y: 3370, ref: 850, count: 8, name: 'Çalı Sıçanı', ai: 'NORMAL', art: SMALL },
  { x: 100, y: 2830, ref: 752, count: 8, name: 'Kan Solucanı', ai: 'NORMAL', art: SMALL },
  { x: 1780, y: 3070, ref: 851, count: 8, name: 'Yaban Sıçanı', ai: 'NORMAL', art: SMALL },
  { x: 250, y: 2530, ref: 851, count: 8, name: 'Yaban Sıçanı', ai: 'NORMAL', art: SMALL },
  { x: 2470, y: 3910, ref: 150, count: 8, name: 'Yamyam Goblin', ai: 'NORMAL', art: SMALL },
  { x: 2110, y: 3040, ref: 150, count: 8, name: 'Yamyam Goblin', ai: 'NORMAL', art: SMALL },
  { x: 1480, y: 2410, ref: 754, count: 8, name: 'Leş Böceği', ai: 'NORMAL', art: SMALL },
  { x: 880, y: 2170, ref: 852, count: 8, name: 'Çöpçü Sıçan', ai: 'NORMAL', art: SMALL },
  { x: 2440, y: 2950, ref: 852, count: 8, name: 'Çöpçü Sıçan', ai: 'NORMAL', art: SMALL },
  { x: 1780, y: 2260, ref: 755, count: 8, name: 'Kapkaççı', ai: 'AGGRESSIVE', art: SMALL },
  { x: 1120, y: 1930, ref: 755, count: 8, name: 'Kapkaççı', ai: 'AGGRESSIVE', art: SMALL },
  { x: 3160, y: 4090, ref: 255, count: 8, name: 'Bataklık Yaratığı', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 850, y: 1720, ref: 250, count: 7, name: 'Bataklık Devi', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 1750, y: 1930, ref: 250, count: 7, name: 'Bataklık Devi', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 3130, y: 3250, ref: 252, count: 7, name: 'Bataklık Reisi', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 2110, y: 1930, ref: 252, count: 7, name: 'Bataklık Reisi', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 3490, y: 4030, ref: 105, count: 7, name: 'Kecoon Savaşçısı', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 1780, y: 1600, ref: 203, count: 7, name: 'Dev Bulcan', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 3640, y: 3730, ref: 203, count: 7, name: 'Dev Bulcan', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 2140, y: 1600, ref: 301, count: 7, name: 'Dev Gavolt', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 2470, y: 1690, ref: 301, count: 7, name: 'Dev Gavolt', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 1240, y: 1090, ref: 204, count: 7, name: 'Leş Kuşu', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 2800, y: 1750, ref: 109, count: 7, name: 'Kecoon Kaptanı', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 3790, y: 3040, ref: 109, count: 7, name: 'Kecoon Kaptanı', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 2530, y: 1360, ref: 1000, count: 6, name: 'Ceset', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 1510, y: 880, ref: 500, count: 6, name: 'Kurt Adam', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 2860, y: 1420, ref: 500, count: 6, name: 'Kurt Adam', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 3460, y: 1870, ref: 114, count: 6, name: 'Kecoon Cengaveri', ai: 'AGGRESSIVE', art: BOSS },
  { x: 1030, y: 550, ref: 114, count: 6, name: 'Kecoon Cengaveri', ai: 'AGGRESSIVE', art: BOSS },
  { x: 3190, y: 1510, ref: 502, count: 6, name: 'Ay Kurdu', ai: 'AGGRESSIVE', art: BOSS },
  { x: 1480, y: 550, ref: 115, count: 6, name: 'Kecoon Ejderhası', ai: 'AGGRESSIVE', art: BOSS },
  { x: 2230, y: 760, ref: 115, count: 6, name: 'Kecoon Ejderhası', ai: 'AGGRESSIVE', art: BOSS },
  { x: 3520, y: 1540, ref: 1100, count: 6, name: 'İskelet', ai: 'AGGRESSIVE', art: BOSS },
  { x: 4660, y: 3730, ref: 1100, count: 6, name: 'İskelet', ai: 'AGGRESSIVE', art: BOSS },
  { x: 1780, y: 370, ref: 505, count: 6, name: 'Azgın Kurt', ai: 'AGGRESSIVE', art: BOSS },
  { x: 2110, y: 430, ref: 905, count: 5, name: 'İğneli Akrep', ai: 'AGGRESSIVE', art: BOSS },
  { x: 3970, y: 1840, ref: 905, count: 5, name: 'İğneli Akrep', ai: 'AGGRESSIVE', art: BOSS },
  { x: 2920, y: 790, ref: 1102, count: 5, name: 'İskelet Şövalye', ai: 'AGGRESSIVE', art: BOSS },
  { x: 3250, y: 880, ref: 1102, count: 5, name: 'İskelet Şövalye', ai: 'AGGRESSIVE', art: BOSS },
  { x: 2800, y: 460, ref: 600, count: 5, name: 'Kılıç Dişli', ai: 'ELITE', art: BOSS },
  { x: 3160, y: 550, ref: 1103, count: 5, name: 'İskelet Kahraman', ai: 'ELITE', art: BOSS },
  { x: 4090, y: 1240, ref: 1103, count: 5, name: 'İskelet Kahraman', ai: 'ELITE', art: BOSS },
  { x: 3040, y: 220, ref: 603, count: 5, name: 'Kılıç Diş', ai: 'ELITE', art: BOSS },
  { x: 4510, y: 1540, ref: 603, count: 5, name: 'Kılıç Diş', ai: 'ELITE', art: BOSS },
  { x: 3850, y: 580, ref: 1111, count: 5, name: 'Ölüm Şövalyesi', ai: 'ELITE', art: BOSS },
  { x: 4810, y: 1390, ref: 1201, count: 5, name: 'Muhafız', ai: 'ELITE', art: BOSS },
  { x: 4720, y: 1060, ref: 1201, count: 5, name: 'Muhafız', ai: 'ELITE', art: BOSS },
  { x: 4600, y: 730, ref: 512, count: 5, name: 'Kan Avcısı', ai: 'ELITE', art: BOSS },
  { x: 4690, y: 130, ref: 512, count: 5, name: 'Kan Avcısı', ai: 'ELITE', art: BOSS },
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
