/** ÖRS — YÜKSELTME MODELİ (P2.8)
 *
 *  ══════════════ BU DOSYA NE YAPAR ══════════════
 *  Yükseltmenin SÖZLEŞMESİNİ taşır: başarı eğrisi, maliyet, malzeme ve
 *  sonuç türleri. Mutasyon BURADA DEĞİLDİR (`world/ForgeSystem.ts`),
 *  çizim BURADA DEĞİLDİR (Scene).
 *
 *  ══════════════ SAF ══════════════
 *  three yok, canvas yok, `Math.random()` YOK. Zar `ForgeSystem`'e verilen
 *  tohumlu `Rng` akışından gelir — testler tekrar üretilebilir.
 *
 *  ══════════════ EĞRİ KAYNAKTAN GELİR ══════════════
 *  Yüzdeler `src/game/data/generated/upgrade_curve.json` içindeki BUS_ONLY
 *  satırlarıdır; burada UYDURULMAZ. Kaynak eğri zaten "ilk üç garantili,
 *  sonra risk" biçimindedir:
 *
 *      +1 %100 · +2 %100 · +3 %100 · +4 %70 · +5 %50
 *      +6 %30  · +7 %9   · +8 %5   · +9 %0  · +10 %0
 *
 *  ══════════════ +9 / +10 KAYNAKTA %0 ══════════════
 *  Kaynak veride bu iki kademe BUS_ONLY ile ERİŞİLEMEZDİR (Trina eğrisinde
 *  %1 ve %0). Bu bir hata değil, kaynağın kendisidir; uydurma bir yüzdeyle
 *  doldurulmadı. Oyun tavanı bu yüzden fiilen +8'dir. Trina benzeri bir
 *  ikinci malzeme geldiğinde `TRINA_BUS` satırları devreye alınabilir. */

import upgradeCurve from '../../../src/game/data/generated/upgrade_curve.json';
import { UPGRADE_MODEL } from '../../../src/game/config.js';

/* ───────────────────────── başarı eğrisi ───────────────────────── */

interface CurveRow { mode: string; display_level: number; probability_percent: number }

/** Hedef kademe (`+n`) → başarı olasılığı [0,1]. Kaynak BUS_ONLY satırı. */
const BUS_CURVE: ReadonlyMap<number, number> = new Map(
  (upgradeCurve.source as CurveRow[])
    .filter((r) => r.mode === 'BUS_ONLY')
    .map((r) => [r.display_level, r.probability_percent / 100]),
);

/** `from` seviyesinden bir üste geçme olasılığı. Tavanda 0 döner. */
export function successChance(from: number): number {
  const target = from + 1;
  if (target > UPGRADE_MODEL.maxLevel) return 0;
  return BUS_CURVE.get(target) ?? 0;
}

/** Bu eşya daha yükseltilebilir mi? (kaynakta %0 olan kademe DENENMEZ —
 *  oyuncunun boşuna malzeme yakmasına izin verilmez) */
export function canAttempt(from: number): boolean {
  return successChance(from) > 0;
}

/** Fiilî tavan — kaynak eğride olasılığı sıfırdan büyük EN SON kademe. */
export const FORGE_EFFECTIVE_MAX: number = (() => {
  let max = 0;
  for (const [lvl, p] of BUS_CURVE) if (p > 0 && lvl > max) max = lvl;
  return max;
})();

/* ───────────────────────── maliyet ───────────────────────── */

/** Altın maliyeti — PROJECT LEGACY KARARI (kaynaktan gelmez).
 *  Taban 200, her kademede 1,7 kat. +1 200 · +4 982 · +8 8199. */
export const FORGE_GOLD_BASE = 200;
export const FORGE_GOLD_GROWTH = 1.7;

export function goldCost(from: number): number {
  return Math.round(FORGE_GOLD_BASE * Math.pow(FORGE_GOLD_GROWTH, from));
}

/** Parşömen maliyeti — PROJECT LEGACY KARARI. Garantili kademeler 1 parşömen,
 *  riskli kademeler 2. Böylece riskli denemenin bedeli yalnız altın değildir. */
export function scrollCost(from: number): number {
  return successChance(from) >= 1 ? 1 : 2;
}

/* ───────────────────────── sonuç ───────────────────────── */

export type ForgeFail =
  /** P3.15 — başlangıç yayı yükseltilemez: güvenlik ağı olduğu için
   *  yakılabilir olmamalı (bkz. `ForgeSystem`). */
  | 'starterWeapon'
  | 'notFound'          // envanterde böyle bir instance yok
  | 'noDefinition'      // katalogda tanım yok
  | 'maxLevel'          // kaynak eğride bu kademe erişilemez
  | 'noGold'
  | 'noScroll'
  | 'locked';           // kilitli eşya yükseltilmez

export type ForgeOutcome =
  | { readonly ok: true; readonly success: true; readonly newLevel: number;
      readonly goldSpent: number; readonly scrollsSpent: number; readonly chance: number }
  /** BAŞARISIZ: eşya YANAR (kullanıcı kararı). `burned` her zaman true'dur;
   *  alan yine de taşınır ki gelecekte "seviye düşer" seçeneği eklenirse
   *  çağıran tarafın kodu değişmesin. */
  | { readonly ok: true; readonly success: false; readonly burned: true;
      readonly goldSpent: number; readonly scrollsSpent: number; readonly chance: number }
  | { readonly ok: false; readonly reason: ForgeFail };

/** Bir denemenin ÖN İZLEMESİ — panel bunu gösterir, mutasyon yapmaz. */
export interface ForgePreview {
  readonly from: number;
  readonly to: number;
  readonly chance: number;
  readonly gold: number;
  readonly scrolls: number;
  readonly guaranteed: boolean;
  readonly atMax: boolean;
}

export function forgePreview(from: number): ForgePreview {
  const chance = successChance(from);
  return {
    from, to: from + 1, chance,
    gold: goldCost(from), scrolls: scrollCost(from),
    guaranteed: chance >= 1,
    atMax: chance <= 0,
  };
}
