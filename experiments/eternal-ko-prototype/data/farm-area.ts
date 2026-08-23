/** FARM AREA V1 — TEKİL SPAWN SLOTLARI (P1.6, P2.4B'de LEGACY)
 *
 *  Her slot TEK bir mobun sabit EVİDİR (`homeX/homeY`). Mob roam / chase / leash
 *  hesaplarını mevcut konumundan değil bu EV noktasından yapar. Mob ölünce slot
 *  boşalır, respawn süresi dolunca AYNI slotta yeniden doğar.
 *
 *  Monster statları (HP/attack/defense/exp) ANA VERİ katmanından gelir
 *  (`monsters.json` → `Content.monster`); burada kopyalanmaz. Buradaki tek
 *  şey yerleşim + AI profili seçimidir.
 *
 *  YERLEŞİM: oyuncunun doğuş noktası (1240, 1650) çevresinde, farklı yönlerde,
 *  üst üste GELMEYECEK şekilde — 2 yakın · 3 orta · 3 uzak.
 *  Hepsi Genie'nin varsayılan Farm Boundary yarıçapının (650) içindedir. */

/*  ══════════════ P2.4B NOTU — BU TABLO LEGACY'DİR ══════════════
 *  P2.4B kanonik slot kuralını getirdi: 1 slot = 1 dikdörtgen + 5..8 örnek
 *  (`data/mob-slot-schema.ts`). AŞAĞIDAKİ 8 SLOT KANONİK DEĞİLDİR: her biri
 *  tek ev noktası ve tek mob taşır. Canlı preview'u BOZMAMAK için oldukları
 *  gibi bırakıldılar ve `defineMobSlot()` doğrulamasından GEÇMEZLER.
 *  Yeni kanonik slot ASLA count=1 kabul etmez. */

/*  ══════════════ P2.4C NOTU — MORADON'A TAŞINDI ══════════════
 *  Harita anahtarı Moradon'a çevrildi. Slotlar DÖNÜŞTÜRÜLMEDİ (hâlâ tekil,
 *  hâlâ legacy); yalnız KOORDİNATLARI değişti. Yeni ev noktaları elle
 *  seçilmedi: yürünebilirlik maskesinden, spawn'dan ERİŞİLEBİLİR hücreler
 *  arasından, en yüksek açıklığa (en yakın kapalı hücreye uzaklık) sahip ve
 *  birbirinden en az 125 birim ayrık noktalar seçildi. Her slotun
 *  `roamRadius`u kendi açıklığına göre kısıldı — mob dolaşırken sürekli
 *  duvara dayanmasın.
 *
 *  SUR KAPALI: Moradon'un surları collision verisinde kapalıdır, bu yüzden
 *  spawn'dan erişilebilen alan ŞEHİR MEYDANIDIR (~381.650 world birim²).
 *  Slotlar bu yüzden meydandadır. Kapıların açılması P2.4D'nin konusudur;
 *  açıldığında slotlar şehir dışına taşınabilir.
 *
 *  EK KISIT: hepsi doğuş noktasının 650 birim (Genie'nin varsayılan Farm
 *  Boundary yarıçapı) İÇİNDEDİR — dışarı taşan slot Genie tarafından yok
 *  sayılırdı. En uzağı 584 birimdedir. */

export type { MobSpawnArea, MobSpawnSlot } from './mob-slot-schema.js';
import type { MobSpawnSlot as Slot } from './mob-slot-schema.js';
import { ACTIVE_MAP } from './world-map.js';

const SPAWN = { x: 1240, y: 1650 };
/** Kutupsal yerleşim yardımcısı — okunabilirlik için. */
function at(deg: number, dist: number): { homeX: number; homeY: number } {
  const a = (deg * Math.PI) / 180;
  return {
    homeX: Math.round(SPAWN.x + Math.cos(a) * dist),
    homeY: Math.round(SPAWN.y + Math.sin(a) * dist),
  };
}

const SMALL = { sheet: 'kurt', tint: '#e8e0d0', scale: 0.52 } as const;
const SWAMP = { sheet: 'kurt', tint: '#9fb08a', scale: 0.62 } as const;
const BOSS = { sheet: 'kurt', tint: '#c9a05a', scale: 0.78 } as const;

/** 8 slot · 4 NORMAL · 3 AGGRESSIVE · 1 ELITE. */
export const TEST_FARM_AREA_SLOTS: readonly Slot[] = [
  /* ---- YAKIN (2) ---- */
  { id: 'fa_n1', displayName: 'Toprak Solucanı', monsterRef: 750,
    ...at(20, 190), aiType: 'NORMAL', visual: SMALL },
  /* YAKIN SALDIRGAN — AGGRO YARIÇAPI EZMESİ.
     Profil varsayılanı 220'dir; bu slotun evi doğuş noktasına 210 uzaklıkta
     olduğu için varsayılan yarıçap DOĞUŞ NOKTASINI KAPSIYORDU ve oyuncu
     oyuna girer girmez saldırıya uğruyordu (telemetride ölçüldü).
     KURAL: aggroRadius + roamRadius < ev-doğuş mesafesi. Burada 210 uzaklık
     için 120 + 60 = 180 seçildi; mob dolaşmanın EN UÇ noktasında bile doğuş
     noktasını kapsamaz. Oyuncu artık kendi isteğiyle yaklaşınca aggro olur.
     Bu bir PROJECT LEGACY TUNING kararıdır; kaynak veriden gelmez. */
  { id: 'fa_a1', displayName: 'Çalı Sıçanı', monsterRef: 850,
    ...at(200, 210), aiType: 'AGGRESSIVE', aggroRadius: 120, roamRadius: 60, visual: SMALL },

  /* ---- ORTA (3) ---- */
  { id: 'fa_n2', displayName: 'Çalı Sıçanı', monsterRef: 850,
    ...at(75, 340), aiType: 'NORMAL', visual: SMALL },
  { id: 'fa_a2', displayName: 'Yaban Sıçanı', monsterRef: 851,
    ...at(150, 370), aiType: 'AGGRESSIVE', visual: SMALL },
  { id: 'fa_n3', displayName: 'Yaban Sıçanı', monsterRef: 851,
    ...at(285, 360), aiType: 'NORMAL', visual: SMALL },

  /* ---- UZAK (3) ---- */
  { id: 'fa_n4', displayName: 'Bataklık Yaratığı', monsterRef: 255,
    ...at(50, 545), aiType: 'NORMAL', visual: SWAMP },
  { id: 'fa_a3', displayName: 'Bataklık Devi', monsterRef: 250,
    ...at(235, 560), aiType: 'AGGRESSIVE', visual: SWAMP },
  { id: 'fa_e1', displayName: 'Bataklık Reisi', monsterRef: 252,
    ...at(320, 590), aiType: 'ELITE', visual: BOSS },
] as const;

/* ───────────────────────── MORADON YERLEŞİMİ (P2.4C) ───────────────────────── */

/** Maske taramasıyla seçilmiş 8 ev noktası. `clear` = o noktadaki açıklık
 *  (en yakın kapalı hücreye uzaklık, world birimi); `roamRadius` bundan türer. */
export const MORADON_FARM_SLOTS: readonly Slot[] = [
  /* ---- YAKIN (2) ---- */
  { id: 'fa_n1', displayName: 'Toprak Solucanı', monsterRef: 750,
    homeX: 1668, homeY: 1658, aiType: 'NORMAL', roamRadius: 45, visual: SMALL },
  /* YAKIN SALDIRGAN — P1.6 KURALI KORUNDU: aggroRadius + roamRadius < ev-doğuş
     mesafesi (burada 190). 110 + 35 = 145 < 190 → oyuncu oyuna girer girmez
     saldırıya uğramaz, kendi isteğiyle yaklaşınca aggro olur. */
  { id: 'fa_a1', displayName: 'Çalı Sıçanı', monsterRef: 850,
    homeX: 1433, homeY: 1923, aiType: 'AGGRESSIVE',
    aggroRadius: 110, roamRadius: 35, visual: SMALL },

  /* ---- ORTA (3) ---- */
  { id: 'fa_n2', displayName: 'Çalı Sıçanı', monsterRef: 850,
    homeX: 1343, homeY: 2018, aiType: 'NORMAL', roamRadius: 60, visual: SMALL },
  { id: 'fa_a2', displayName: 'Yaban Sıçanı', monsterRef: 851,
    homeX: 1808, homeY: 1518, aiType: 'AGGRESSIVE', roamRadius: 55, visual: SMALL },
  { id: 'fa_n3', displayName: 'Yaban Sıçanı', monsterRef: 851,
    homeX: 1348, homeY: 2143, aiType: 'NORMAL', roamRadius: 55, visual: SMALL },

  /* ---- UZAK (3) ---- */
  { id: 'fa_n4', displayName: 'Bataklık Yaratığı', monsterRef: 255,
    homeX: 1983, homeY: 1633, aiType: 'NORMAL', roamRadius: 35, visual: SWAMP },
  { id: 'fa_a3', displayName: 'Bataklık Devi', monsterRef: 250,
    homeX: 1933, homeY: 1503, aiType: 'AGGRESSIVE', roamRadius: 80, visual: SWAMP },
  { id: 'fa_e1', displayName: 'Bataklık Reisi', monsterRef: 252,
    homeX: 2073, homeY: 1543, aiType: 'ELITE', roamRadius: 110, visual: BOSS },
] as const;

/** Aktif farm tablosu — harita anahtarını izler. */
export const FARM_AREA_SLOTS: readonly Slot[] =
  ACTIVE_MAP === 'moradon' ? MORADON_FARM_SLOTS : TEST_FARM_AREA_SLOTS;
