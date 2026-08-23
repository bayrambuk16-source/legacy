/** SPAWN SLOT ŞEMASI — P2.4B
 *
 *  ══════════════ BU DOSYA NE YAPAR ══════════════
 *  Spawn slotunun KANONİK sözleşmesini, doğrulamasını ve örnek yerleşim
 *  matematiğini taşır. Yaşam döngüsü BURADA DEĞİLDİR (`world/MobSlotSystem.ts`),
 *  AI BURADA DEĞİLDİR (`world/MobAi.ts`). Burası saf veri + saf fonksiyondur:
 *  three import etmez, gameplay'e yazmaz, `Math.random()` KULLANMAZ.
 *
 *  ══════════════ KANONİK KURAL ══════════════
 *      1 SLOT = 1 MOB TÜRÜ + 1 DİKDÖRTGEN + 5..8 BAĞIMSIZ ÖRNEK
 *
 *  Aynı slotta farklı `monsterRef` KARIŞTIRILAMAZ — bu tipin kendisiyle
 *  garanti edilir: slot TEK bir `monsterRef` alanı taşır, liste değil. Farklı
 *  tür isteyen AYRI slot açar.
 *
 *  ══════════════ LEGACY UYUM YOLU (geçici) ══════════════
 *  P1.6'dan gelen canlı farm alanı (`data/farm-area.ts`) slot başına TEK mob
 *  ve TEK ev noktası (`homeX/homeY`) kullanır. Bu slotlar KANONİK DEĞİLDİR ve
 *  `defineMobSlot()`ten GEÇMEZLER; `area`/`count` alanları yoktur. Bu yüzden
 *  yeni bir public bayrak (`legacySingleInstance` vb.) EKLENMEDİ — uyum,
 *  `slotPlacement()` içindeki tek bir dallanmadır: alan yoksa dikdörtgen
 *  ev noktasının kendisine çöker ve population 1 olur.
 *
 *  Yeni kanonik slot ASLA count=1 kabul etmez (bkz. `validateMobSlot`). */

import type { MobAiType } from './mob-ai-profiles.js';

/* ───────────────────────── population sabitleri ───────────────────────── */

/** Kanonik slotun taşıyabileceği EN AZ örnek sayısı. */
export const MIN_MOBS_PER_SLOT = 5;
/** Kanonik slotun taşıyabileceği EN ÇOK örnek sayısı. */
export const MAX_MOBS_PER_SLOT = 8;

/** Örneklerin hücre içinde bırakacağı kenar payı (hücre genişliğinin oranı).
 *  Jitter yalnız hücrenin İÇ %64'ünde gezinir; komşu hücreler ASLA çakışmaz,
 *  bu yüzden farklı örnekler aynı koordinata düşemez. */
const CELL_INSET = 0.18;

/* ───────────────────────── slot sözleşmesi ───────────────────────── */

/** Normalize edilmiş spawn dikdörtgeni (world birimi). `minX <= maxX`,
 *  `minY <= maxY` ZORUNLUDUR; doğrulama bunu reddeder, sessizce düzeltmez. */
export interface MobSpawnArea {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface MobSpawnSlot {
  readonly id: string;
  readonly displayName: string;
  /** `monsters.json` sourceRef — slot başına TEK monster (havuz YOK). */
  readonly monsterRef: number;
  /** Slotun temsilî merkezi. Kanonik slotta dikdörtgenin ORTASIDIR ve yalnız
   *  gösterim/telemetri içindir; örnekler kendi `homeX/homeY` noktalarını
   *  dikdörtgenden alır. Legacy slotta örneğin gerçek evidir. */
  readonly homeX: number;
  readonly homeY: number;
  readonly aiType: MobAiType;
  /** KANONİK ALAN — yoksa slot legacy tekil slottur (bkz. dosya başlığı). */
  readonly area?: MobSpawnArea;
  /** KANONİK POPULATION — yoksa legacy tekil slottur (population 1). */
  readonly count?: number;
  /** Profil ezmeleri (opsiyonel). */
  readonly respawnSec?: number;
  readonly roamRadius?: number;
  readonly aggroRadius?: number;
  readonly leashRadius?: number;
  /** Prototip görseli. P2.4B'de HER mob türü aynı Mutant GLB ile render edilir;
   *  bu alan yalnız 2D fallback tonu ve hitbox ölçeği içindir. */
  readonly visual: { sheet: 'kurt'; tint: string; scale: number };
}

/** `defineMobSlot()` girdisi — `homeX/homeY` TÜRETİLİR, elle verilmez. */
export interface MobSlotDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly monsterRef: number;
  readonly area: MobSpawnArea;
  readonly count: number;
  readonly aiType: MobAiType;
  readonly respawnSec?: number;
  readonly roamRadius?: number;
  readonly aggroRadius?: number;
  readonly leashRadius?: number;
  readonly visual: { sheet: 'kurt'; tint: string; scale: number };
}

/* ───────────────────────── doğrulama ───────────────────────── */

export type SlotValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Slot KANONİK mi? (dikdörtgen + population taşıyor mu) */
export function isCanonicalSlot(slot: MobSpawnSlot): boolean {
  return slot.area !== undefined && slot.count !== undefined;
}

/** KANONİK slot doğrulaması — result tabanlı (mevcut `EquipService` stili).
 *
 *  Geçersiz `count` SESSİZCE 5 veya 8'e KIRPILMAZ; hata olarak döner ve
 *  `defineMobSlot()` bunu fırlatır (fail-fast). */
export function validateMobSlot(def: MobSlotDefinition): SlotValidation {
  const errors: string[] = [];
  if (def.id.length === 0) errors.push('slot id boş olamaz');
  if (!Number.isFinite(def.monsterRef)) errors.push('monsterRef sonlu bir sayı olmalı');

  /* --- population --- */
  if (!Number.isInteger(def.count)) {
    errors.push(`count tam sayı olmalı (verilen: ${def.count})`);
  } else if (def.count < MIN_MOBS_PER_SLOT || def.count > MAX_MOBS_PER_SLOT) {
    errors.push(
      `count ${MIN_MOBS_PER_SLOT}..${MAX_MOBS_PER_SLOT} aralığında olmalı (verilen: ${def.count})`,
    );
  }

  /* --- dikdörtgen --- */
  const a = def.area;
  if (![a.minX, a.maxX, a.minY, a.maxY].every(Number.isFinite)) {
    errors.push('dikdörtgen sonlu sayılardan oluşmalı');
  } else {
    if (a.minX > a.maxX) errors.push(`dikdörtgen normalize değil: minX ${a.minX} > maxX ${a.maxX}`);
    if (a.minY > a.maxY) errors.push(`dikdörtgen normalize değil: minY ${a.minY} > maxY ${a.maxY}`);
    /* Çok örnekli slot ÜST ÜSTE doğuramaz → her hücrenin eni/boyu > 0 olmalı. */
    if (Number.isInteger(def.count) && def.count > 1 && a.minX <= a.maxX && a.minY <= a.maxY) {
      const { cols, rows } = gridOf(def.count);
      if ((a.maxX - a.minX) / cols <= 0) errors.push('dikdörtgen genişliği 0 — örnekler üst üste doğar');
      if ((a.maxY - a.minY) / rows <= 0) errors.push('dikdörtgen yüksekliği 0 — örnekler üst üste doğar');
    }
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/** KANONİK slot üretir. Geçersiz girdide FIRLATIR — bozuk slot tablosu
 *  runtime'a sızmaz. `homeX/homeY` dikdörtgenin merkezinden türetilir. */
export function defineMobSlot(def: MobSlotDefinition): MobSpawnSlot {
  const v = validateMobSlot(def);
  if (!v.ok) throw new Error(`[P2.4B] geçersiz spawn slotu "${def.id}": ${v.errors.join(' · ')}`);
  return {
    id: def.id,
    displayName: def.displayName,
    monsterRef: def.monsterRef,
    homeX: (def.area.minX + def.area.maxX) / 2,
    homeY: (def.area.minY + def.area.maxY) / 2,
    aiType: def.aiType,
    area: def.area,
    count: def.count,
    respawnSec: def.respawnSec,
    roamRadius: def.roamRadius,
    aggroRadius: def.aggroRadius,
    leashRadius: def.leashRadius,
    visual: def.visual,
  };
}

/* ───────────────────────── yerleşim ───────────────────────── */

/** Slotun etkin dikdörtgeni + population'ı. TEK legacy dallanması burasıdır. */
export function slotPlacement(slot: MobSpawnSlot): MobSpawnArea & { count: number } {
  if (slot.area !== undefined && slot.count !== undefined) {
    return { ...slot.area, count: slot.count };
  }
  /* Legacy tekil slot: dikdörtgen ev noktasına çöker, population 1. */
  return { minX: slot.homeX, maxX: slot.homeX, minY: slot.homeY, maxY: slot.homeY, count: 1 };
}

/** Population için hücre ızgarası. count=5 → 3x2 (6 hücre, 5'i kullanılır),
 *  count=8 → 3x3 (9 hücre, 8'i kullanılır). */
function gridOf(count: number): { cols: number; rows: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  return { cols, rows };
}

/** FNV-1a 32-bit — saf, platformdan bağımsız string karması. */
function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Karmadan tek bir [0,1) değeri. `salt` bağımsız eksen üretir. */
function unit(seed: number, salt: number): number {
  let a = (seed + Math.imul(salt, 0x9e3779b9)) >>> 0;
  a = Math.imul(a ^ (a >>> 16), 0x21f0aaad);
  a = Math.imul(a ^ (a >>> 15), 0x735a2d97);
  a = (a ^ (a >>> 15)) >>> 0;
  return a / 4294967296;
}

/** ÖRNEĞİN DOĞUŞ NOKTASI — DETERMİNİSTİK.
 *
 *  `Math.random()` KULLANILMAZ ve paylaşılan `Rng` akışı da kullanılmaz:
 *  paylaşılan akış çağrı SIRASINA bağlı olurdu, oysa sözleşme
 *  `(slotId, instanceIndex, generation)` girdisinin TEK BAŞINA noktayı
 *  belirlemesidir. Aynı üçlü → aynı nokta, her zaman.
 *
 *  ÜST ÜSTE DOĞMAMA GARANTİSİ: dikdörtgen `count` hücreye bölünür, örnek #i
 *  YALNIZ #i'nin hücresinde jitter yapar. Hücreler ayrık olduğu için iki örnek
 *  aynı koordinata düşemez. Generation değişince aynı hücre içinde YENİ bir
 *  nokta seçilir (§17) — yani respawn yerinde çakılıp kalmaz. */
export function instanceSpawnPoint(
  slot: MobSpawnSlot, instanceIndex: number, generation: number,
): { x: number; y: number } {
  const p = slotPlacement(slot);
  const { cols, rows } = gridOf(p.count);
  const col = instanceIndex % cols;
  const row = Math.floor(instanceIndex / cols) % rows;
  const cw = (p.maxX - p.minX) / cols;
  const ch = (p.maxY - p.minY) / rows;
  const seed = hash32(`${slot.id}#${instanceIndex}#${generation}`);
  const jx = CELL_INSET + unit(seed, 1) * (1 - 2 * CELL_INSET);
  const jy = CELL_INSET + unit(seed, 2) * (1 - 2 * CELL_INSET);
  return { x: p.minX + (col + jx) * cw, y: p.minY + (row + jy) * ch };
}

/** Nokta dikdörtgenin İÇİNDE mi? (test ve telemetri için) */
export function isInsideArea(slot: MobSpawnSlot, x: number, y: number): boolean {
  const p = slotPlacement(slot);
  return x >= p.minX && x <= p.maxX && y >= p.minY && y <= p.maxY;
}
