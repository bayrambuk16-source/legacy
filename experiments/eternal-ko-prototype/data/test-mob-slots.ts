/** ÇOK-MOBLU SLOT TEST FIXTURE'I — P2.4B
 *
 *  ══════════════ BU TABLO CANLI OYUNA BAĞLI DEĞİLDİR ══════════════
 *  `state.ts` bunu İMPORT ETMEZ. Canlı preview P1.6'dan beri
 *  `FARM_AREA_SLOTS` (8 legacy tekil slot) ile çalışmaya devam eder (§40).
 *  Buradaki iki slot YALNIZ kanonik çok-moblu sözleşmeyi kanıtlamak içindir.
 *
 *  ══════════════ İSİMLENDİRME ══════════════
 *  Knight Online verisi kaynak/referanstır; oyuncuya BİREBİR gösterilmez (§7).
 *  Bu yüzden fixture kimlikleri NÖTRDÜR: `test_slot_a` / `test_mob_a`.
 *  `monsterRef` ise hâlâ ANA VERİ katmanının sayısal referansıdır
 *  (`monsters.json` → `Content.monster`) — stat/HP/exp oradan gelmeye devam
 *  eder ve BURADA KOPYALANMAZ. Gerçek Project Legacy mob kimlikleri P2.4C'nin
 *  konusudur; bu görevde ÜRETİLMEZ.
 *
 *  ══════════════ GÖRSEL ══════════════
 *  İki slot gameplay açısından FARKLI mob türleridir (farklı `monsterRef`),
 *  ama ikisi de şimdilik AYNI `mutant_mobile_v1.glb` ile render edilir.
 *  `mobRef` → GLB seçimi P2.4B'de YOKTUR. */

import { defineMobSlot, type MobSpawnSlot } from './mob-slot-schema.js';

/** Fixture görseli — canlı tablodaki SMALL ile aynı ton. */
const FIXTURE_VISUAL = { sheet: 'kurt', tint: '#e8e0d0', scale: 0.52 } as const;

/** Kısa test respawn süresi (sn) — canlı `RESPAWN_DEFAULT` (8) DEĞİŞMEDİ. */
export const TEST_SLOT_RESPAWN_SEC = 4;

/** TEST SLOT A — population 5. */
export const TEST_SLOT_A: MobSpawnSlot = defineMobSlot({
  id: 'test_slot_a',
  displayName: 'test_mob_a',
  monsterRef: 750,
  area: { minX: 600, maxX: 1000, minY: 600, maxY: 900 },
  count: 5,
  /* P2.41 — bant tablosu ATLANIR: fixture bilinen sayıyla sınamalı. */
  exactCount: true,
  aiType: 'NORMAL',
  respawnSec: TEST_SLOT_RESPAWN_SEC,
  visual: FIXTURE_VISUAL,
});

/** TEST SLOT B — population 8, FARKLI mob türü → AYRI slot (§2.1). */
export const TEST_SLOT_B: MobSpawnSlot = defineMobSlot({
  id: 'test_slot_b',
  displayName: 'test_mob_b',
  monsterRef: 850,
  area: { minX: 1400, maxX: 1900, minY: 1200, maxY: 1700 },
  count: 8,
  exactCount: true,
  aiType: 'NORMAL',
  respawnSec: TEST_SLOT_RESPAWN_SEC,
  visual: FIXTURE_VISUAL,
});

/** Toplam fixture population: 5 + 8 = 13. */
export const TEST_MULTI_SLOTS: readonly MobSpawnSlot[] = [TEST_SLOT_A, TEST_SLOT_B];
