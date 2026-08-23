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
  /* ═══ P2.27 — SLOTLAR SIFIRDAN DAĞITILDI ═══
     Önceki dağılım bozuktu ve oyun testinde görüldü: Sv5-8 bandında
     ON BİR slot tıkışmış, Sv3/10/12/13/14 hiç yok, Sv16-20 ile Sv9-15
     birbirine karışmıştı — uzaklaştıkça seviye artışı zıplıyordu.

     Yeni dağıtım OTOMATİK: yürünebilirlik maskesi tarandı, 200×200'lük
     alanı tamamen açık ve birbirinden en az 420 birim uzak 87 aday
     bulundu, sonra 33 slot mesafeye göre EŞİT ARALIKLI seçildi ve mob
     havuzu seviye sırasına göre eşlendi.

     SONUÇ: mesafe arttıkça seviye MONOTON artar (1024 birimde Sv1,
     5940 birimde Sv30). Bu bir testle korunur.

     MOB SAYILARI uzaklıkla AZALIR: yakın slotlarda 6-8, uzak
     slotlarda 5. Alt sınır ŞEMADAN gelir (`MIN_MOBS_PER_SLOT = 5`);
     daha seyrek yapmak istemiştim ama kuralı esnetmek yerine ona
     uydum — bir Sv30 slotunun kalabalık olması zaten TASARIM: oraya
     hazırlıksız gelen ölür, bu onun kararıdır. */
  { x: 1220, y: 3540, ref: 750, count: 8, name: 'Toprak Solucanı', ai: 'NORMAL', art: SMALL },
  { x: 1060, y: 3140, ref: 750, count: 6, name: 'Toprak Solucanı', ai: 'NORMAL', art: SMALL },
  { x: 220, y: 3060, ref: 850, count: 7, name: 'Çalı Sıçanı', ai: 'NORMAL', art: SMALL },
  { x: 1420, y: 2900, ref: 850, count: 6, name: 'Çalı Sıçanı', ai: 'NORMAL', art: SMALL },
  { x: 1980, y: 3140, ref: 752, count: 6, name: 'Kan Solucanı', ai: 'NORMAL', art: SMALL },
  { x: 660, y: 2420, ref: 851, count: 6, name: 'Yaban Sıçanı', ai: 'NORMAL', art: SMALL },
  { x: 2700, y: 4740, ref: 851, count: 6, name: 'Yaban Sıçanı', ai: 'NORMAL', art: SMALL },
  { x: 980, y: 2140, ref: 150, count: 6, name: 'Yamyam Goblin', ai: 'AGGRESSIVE', art: SMALL },
  { x: 2860, y: 3580, ref: 754, count: 6, name: 'Leş Böceği', ai: 'NORMAL', art: SMALL },
  { x: 1460, y: 1940, ref: 754, count: 6, name: 'Leş Böceği', ai: 'NORMAL', art: SMALL },
  { x: 820, y: 1740, ref: 852, count: 6, name: 'Çöpçü Sıçan', ai: 'NORMAL', art: SMALL },
  { x: 1900, y: 1900, ref: 755, count: 6, name: 'Kapkaççı', ai: 'AGGRESSIVE', art: SMALL },
  { x: 460, y: 1500, ref: 755, count: 6, name: 'Kapkaççı', ai: 'AGGRESSIVE', art: SMALL },
  { x: 2940, y: 2580, ref: 255, count: 6, name: 'Bataklık Yaratığı', ai: 'NORMAL', art: SWAMP },
  { x: 100, y: 1260, ref: 250, count: 5, name: 'Bataklık Devi', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 2180, y: 1580, ref: 250, count: 5, name: 'Bataklık Devi', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 3180, y: 2220, ref: 252, count: 5, name: 'Bataklık Reisi', ai: 'ELITE', art: BOSS },
  { x: 1780, y: 1140, ref: 105, count: 6, name: 'Kecoon Savaşçısı', ai: 'NORMAL', art: SWAMP },
  { x: 140, y: 820, ref: 105, count: 5, name: 'Kecoon Savaşçısı', ai: 'NORMAL', art: SWAMP },
  { x: 2220, y: 1140, ref: 203, count: 6, name: 'Dev Bulcan', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 3660, y: 2140, ref: 301, count: 5, name: 'Dev Gavolt', ai: 'NORMAL', art: BOSS },
  { x: 2020, y: 740, ref: 301, count: 5, name: 'Dev Gavolt', ai: 'NORMAL', art: BOSS },
  { x: 1060, y: 420, ref: 204, count: 5, name: 'Leş Kuşu', ai: 'AGGRESSIVE', art: BOSS },
  { x: 4060, y: 2300, ref: 109, count: 5, name: 'Kecoon Kaptanı', ai: 'ELITE', art: BOSS },
  { x: 3980, y: 1860, ref: 109, count: 5, name: 'Kecoon Kaptanı', ai: 'ELITE', art: BOSS },
  { x: 4820, y: 4140, ref: 1000, count: 5, name: 'Ceset', ai: 'AGGRESSIVE', art: SWAMP },
  { x: 2380, y: 380, ref: 500, count: 5, name: 'Kurt Adam', ai: 'AGGRESSIVE', art: BOSS },
  { x: 3380, y: 860, ref: 500, count: 5, name: 'Kurt Adam', ai: 'AGGRESSIVE', art: BOSS },
  { x: 3860, y: 980, ref: 114, count: 5, name: 'Kecoon Cengaveri', ai: 'ELITE', art: BOSS },
  { x: 3700, y: 580, ref: 502, count: 5, name: 'Ay Kurdu', ai: 'AGGRESSIVE', art: BOSS },
  { x: 4780, y: 1380, ref: 502, count: 5, name: 'Ay Kurdu', ai: 'AGGRESSIVE', art: BOSS },
  { x: 4700, y: 940, ref: 115, count: 5, name: 'Kecoon Ejderhası', ai: 'ELITE', art: BOSS },
  { x: 4780, y: 140, ref: 115, count: 5, name: 'Kecoon Ejderhası', ai: 'ELITE', art: BOSS },
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
