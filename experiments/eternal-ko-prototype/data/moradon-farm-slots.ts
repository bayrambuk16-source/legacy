/** MORADON YERLEŞİMİ — KÖŞE DOĞUŞ + HARİTAYA YAYILMIŞ SLOTLAR (P2.10)
 *
 *  ══════════════ DOĞUŞ NOKTASI BİLİNÇLİ OLARAK TAŞINDI ══════════════
 *  P2.4C'de doğuş `start_positions` kaynağından türetilmişti (KO 306/352 →
 *  world 1530/1760) ve "kapanmış karar" diye işaretlenmişti. P2.10'da bu
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
 *  biridir (2560 / 5 ≈ 512) — kullanıcı kararı. Yeni oyuncu üstüne mob
 *  gelmeden nefes alır; ileride kale yapıları bu alana kurulur.
 *
 *  ══════════════ SEVİYE GRADYANI MESAFEDEN TÜRER ══════════════
 *  Slotlar doğuşa uzaklığa göre sıralanır ve 11 mob türü seviye sırasına
 *  göre bu sıraya dağıtılır: en yakın slotta Sv1, en uzakta Sv15.
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

/** OYNANIŞ doğuş noktası — güneybatı köşesi. Kaynak değeri EZMEZ. */
export const MORADON_PLAY_SPAWN = { x: 340, y: 2220 } as const;

/** Kale alanı yarıçapı — bu mesafede mob YOK. */
export const KEEP_RADIUS = 512;

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
  /* ---- BANT 1 · Sv1-2 · 600-900 ---- */
  { x: 840, y: 2020, ref: 750, count: 8, name: 'Toprak Solucanı', ai: 'NORMAL', art: SMALL },
  { x: 600, y: 1500, ref: 750, count: 5, name: 'Toprak Solucanı', ai: 'NORMAL', art: SMALL },
  { x: 40, y: 1300, ref: 850, count: 6, name: 'Çalı Sıçanı', ai: 'NORMAL', art: SMALL },

  /* ---- BANT 2 · Sv4-5 · 1000-1350 ---- */
  { x: 600, y: 1180, ref: 752, count: 6, name: 'Kan Solucanı', ai: 'NORMAL', art: SMALL },
  { x: 920, y: 1100, ref: 851, count: 8, name: 'Yaban Sıçanı', ai: 'NORMAL', art: SMALL },
  { x: 440, y: 900, ref: 851, count: 5, name: 'Yaban Sıçanı', ai: 'AGGRESSIVE', art: SMALL },
  { x: 120, y: 780, ref: 851, count: 8, name: 'Yaban Sıçanı', ai: 'NORMAL', art: SMALL },

  /* ---- BANT 3 · Sv6-7 · 1400-1950 ---- */
  { x: 720, y: 780, ref: 150, count: 7, name: 'Yamyam Goblin', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 1760, y: 1900, ref: 150, count: 6, name: 'Yamyam Goblin', ai: 'NORMAL', art: SWAMP },
  { x: 1120, y: 820, ref: 150, count: 7, name: 'Yamyam Goblin', ai: 'NORMAL', art: SWAMP },
  { x: 520, y: 540, ref: 754, count: 7, name: 'Leş Böceği', ai: 'NORMAL', art: SWAMP },
  { x: 80, y: 460, ref: 754, count: 5, name: 'Leş Böceği', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 1960, y: 1460, ref: 852, count: 8, name: 'Çöpçü Sıçan', ai: 'NORMAL', art: SWAMP },
  { x: 800, y: 340, ref: 852, count: 6, name: 'Çöpçü Sıçan', ai: 'NORMAL', art: SWAMP },
  { x: 240, y: 180, ref: 852, count: 6, name: 'Çöpçü Sıçan', ai: 'AGGRESSIVE', art: SWAMP },

  /* ---- BANT 4 · Sv8-9 · 1950-2350 ---- */
  { x: 1560, y: 660, ref: 755, count: 8, name: 'Kapkaççı', ai: 'NORMAL', art: SWAMP },
  { x: 1320, y: 460, ref: 755, count: 8, name: 'Kapkaççı', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 1120, y: 140, ref: 255, count: 8, name: 'Bataklık Yaratığı', ai: 'NORMAL', art: SWAMP },
  { x: 1440, y: 140, ref: 255, count: 5, name: 'Bataklık Yaratığı', ai: 'AGGRESSIVE', art: SWAMP },

  /* ---- BANT 5 · Sv11-15 · en uzak köşe ---- */
  { x: 1720, y: 300, ref: 250, count: 5, name: 'Bataklık Devi', ai: 'AGGRESSIVE', art: BOSS },
  { x: 2000, y: 420, ref: 250, count: 5, name: 'Bataklık Devi', ai: 'NORMAL', art: BOSS },
  { x: 2280, y: 580, ref: 252, count: 5, name: 'Bataklık Reisi', ai: 'ELITE', art: BOSS },
  { x: 2120, y: 140, ref: 252, count: 7, name: 'Bataklık Reisi', ai: 'ELITE', art: BOSS },
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
