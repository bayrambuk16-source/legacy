/** MORADON FARM SLOTLARI — KANONİK ÇOK-MOBLU (P2.9)
 *
 *  ══════════════ P2.4B SÖZLEŞMESİ CANLI OYUNDA ══════════════
 *  Bu tablo, P2.4B'de kurulup yalnız test fixture'ında kanıtlanan kanonik
 *  slot sistemini CANLI oyuna getirir:
 *
 *      1 SLOT = 1 MOB TÜRÜ + 1 DİKDÖRTGEN + 5..8 BAĞIMSIZ ÖRNEK
 *
 *  Her örneğin kendi uid'i, generation'ı, HP'si, konumu, AI durumu ve KENDİ
 *  respawn sayacı vardır. Bir örneğin ölümü slotu sıfırlamaz.
 *
 *  ══════════════ DİKDÖRTGENLER ELLE SEÇİLMEDİ ══════════════
 *  Yürünebilirlik maskesi taranarak bulundu: her dikdörtgenin 70×70 world
 *  birimlik alanının TAMAMI doğuş noktasından erişilebilir açık hücredir.
 *  Merkezler birbirinden en az 140 birim ayrıktır — slotlar dip dibe değildir.
 *  Hepsi Genie'nin varsayılan Farm Boundary yarıçapının (650) yakınındadır;
 *  en uzağı 683 birimdedir ve DEV panelinden yarıçap büyütülebilir.
 *
 *  ══════════════ RESPAWN 20 SANİYE ══════════════
 *  `respawnSec` her slotta 20'dir ve artık gerçekten OKUNUR: P2.4D'nin
 *  "KAPI 1"i açıldı — `PrototypeState` DEV ezmesini (`respawnOverrideSec`)
 *  artık varsayılan olarak KURMUYOR, dolayısıyla slot değeri geçerli.
 *
 *  ══════════════ DOĞUŞ NOKTASI TEKRAR ETMEZ ══════════════
 *  Örnek `(slotId, instanceIndex, generation)` üçlüsünden deterministik bir
 *  noktada doğar. Generation her respawn'da arttığı için mob AYNI YERE
 *  düşmez; kendi hücresinde birkaç birim kayar. Bu P2.4B'de kurulmuştu ama
 *  legacy tekil slotlarda dikdörtgen tek noktaya çöktüğü için görünmüyordu. */

import { defineMobSlot, type MobSpawnSlot } from './mob-slot-schema.js';

/** Bütün slotların respawn süresi (sn) — kullanıcı kararı. */
export const MORADON_RESPAWN_SEC = 20;

const SMALL = { sheet: 'kurt', tint: '#e8e0d0', scale: 0.52 } as const;
const SWAMP = { sheet: 'kurt', tint: '#9fb08a', scale: 0.62 } as const;
const BOSS = { sheet: 'kurt', tint: '#c9a05a', scale: 0.78 } as const;

/** Dikdörtgen + tür + population. Sıra doğuş noktasına yakınlıktandır:
 *  ilk slotlar yakın ve zayıf, son slotlar uzak ve güçlü. */
export const MORADON_FARM_SLOTS: readonly MobSpawnSlot[] = [
  /* ---- YAKIN (2) — düşük seviye, NORMAL ---- */
  defineMobSlot({
    id: 'mo_01', displayName: 'Toprak Solucanı', monsterRef: 750,
    area: { minX: 1620, maxX: 1690, minY: 1660, maxY: 1730 }, count: 5,
    aiType: 'NORMAL', respawnSec: MORADON_RESPAWN_SEC, roamRadius: 30, visual: SMALL,
  }),
  defineMobSlot({
    id: 'mo_02', displayName: 'Çalı Sıçanı', monsterRef: 850,
    area: { minX: 1430, maxX: 1500, minY: 1850, maxY: 1920 }, count: 5,
    aiType: 'NORMAL', respawnSec: MORADON_RESPAWN_SEC, roamRadius: 30, visual: SMALL,
  }),

  /* ---- ORTA (4) ---- */
  defineMobSlot({
    id: 'mo_03', displayName: 'Yaban Sıçanı', monsterRef: 851,
    area: { minX: 1310, maxX: 1380, minY: 1930, maxY: 2000 }, count: 6,
    aiType: 'NORMAL', respawnSec: MORADON_RESPAWN_SEC, roamRadius: 30, visual: SMALL,
  }),
  /* İLK SALDIRGAN SLOT — doğuş noktasına 277 birim. P1.6 kuralı korunur:
     aggroRadius + roamRadius < ev–doğuş mesafesi (150 + 30 = 180 < 277). */
  defineMobSlot({
    id: 'mo_04', displayName: 'Kan Solucanı', monsterRef: 752,
    area: { minX: 1710, maxX: 1780, minY: 1550, maxY: 1620 }, count: 5,
    aiType: 'AGGRESSIVE', respawnSec: MORADON_RESPAWN_SEC,
    aggroRadius: 150, roamRadius: 30, visual: SMALL,
  }),
  defineMobSlot({
    id: 'mo_05', displayName: 'Leş Böceği', monsterRef: 754,
    area: { minX: 1340, maxX: 1410, minY: 2070, maxY: 2140 }, count: 6,
    aiType: 'NORMAL', respawnSec: MORADON_RESPAWN_SEC, roamRadius: 32, visual: SWAMP,
  }),
  defineMobSlot({
    id: 'mo_06', displayName: 'Yamyam Goblin', monsterRef: 150,
    area: { minX: 1850, maxX: 1920, minY: 1520, maxY: 1590 }, count: 6,
    aiType: 'AGGRESSIVE', respawnSec: MORADON_RESPAWN_SEC, roamRadius: 32, visual: SWAMP,
  }),

  /* ---- UZAK (4) — güçlü ---- */
  defineMobSlot({
    id: 'mo_07', displayName: 'Bataklık Yaratığı', monsterRef: 255,
    area: { minX: 1840, maxX: 1910, minY: 1380, maxY: 1450 }, count: 6,
    aiType: 'NORMAL', respawnSec: MORADON_RESPAWN_SEC, roamRadius: 32, visual: SWAMP,
  }),
  defineMobSlot({
    id: 'mo_08', displayName: 'Bataklık Devi', monsterRef: 250,
    area: { minX: 1970, maxX: 2040, minY: 1600, maxY: 1670 }, count: 6,
    aiType: 'AGGRESSIVE', respawnSec: MORADON_RESPAWN_SEC, roamRadius: 32, visual: SWAMP,
  }),
  defineMobSlot({
    id: 'mo_09', displayName: 'Bataklık Reisi', monsterRef: 252,
    area: { minX: 1980, maxX: 2050, minY: 1460, maxY: 1530 }, count: 5,
    aiType: 'ELITE', respawnSec: MORADON_RESPAWN_SEC, roamRadius: 32, visual: BOSS,
  }),
  defineMobSlot({
    id: 'mo_10', displayName: 'Kan Solucanı', monsterRef: 752,
    area: { minX: 2110, maxX: 2180, minY: 1590, maxY: 1660 }, count: 8,
    aiType: 'NORMAL', respawnSec: MORADON_RESPAWN_SEC, roamRadius: 32, visual: SMALL,
  }),
] as const;

/** Toplam population — 10 slot, 58 mob. */
export const MORADON_POPULATION = MORADON_FARM_SLOTS
  .reduce((n, s) => n + (s.count ?? 1), 0);
