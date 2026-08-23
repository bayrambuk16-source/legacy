/** KECOON GOBLIN MOB MODELİ — P2.28
 *
 *  ══════════════ NEDEN İKİNCİ BİR MOB MODELİ ══════════════
 *  Şimdiye kadar bütün moblar TEK modelin (mutant) ölçeklenmiş
 *  kopyasıydı; tip farkı yalnız boyuttu. Moradon'un otuz üç slotu
 *  Sv1'den Sv30'a uzanıyor ve hepsi aynı yaratığa benziyordu.
 *
 *  Kullanıcı kararı: **zayıf moblar goblin, güçlü moblar mutant.**
 *  Silüet farkı seviye bandını anında okutur — uzaktan bakınca
 *  "buranın mobu başka" belli olur.
 *
 *  ══════════════ DEĞERLER ÖLÇÜLDÜ ══════════════
 *  Bütün sayılar varlık raporundan gelir (`kecoon_goblin_mobile_v1`).
 *  Klip süreleri, vuruş anı, erişim ve boy ÖLÇÜMDÜR; hiçbiri
 *  uydurulmadı. Gameplay zamanlaması bu dosyadan OKUNMAZ — mob AI
 *  kendi profilini kullanır; buradakiler yalnız GÖRSEL playback
 *  referansıdır.
 *
 *  ══════════════ KAYNAKTA OLMAYAN KLİPLER ══════════════
 *  RUN ve HIT_REACT kaynakta YOK ve UYDURULMADI. Koşu gerekince
 *  yürüyüş hızlandırılır, darbe tepkisi gerekince o an için klip
 *  değişimi YAPILMAZ.
 *
 *  ══════════════ LİSANS — EYLEM GEREKTİRİR ══════════════
 *  Mesh CC-BY-4.0, RapidAssets'e ait. Oyun yayınlandığı her yerde
 *  GÖRÜNÜR künye zorunlu. Künye `asset.extras` içinde saklı ama bu
 *  kullanıcıya görünen atıf yerine GEÇMEZ. */

import type { MobAiType } from './mob-ai-profiles.js';
import { WORLD_UNITS_PER_METER } from './archer-model.js';

export type KecoonClipName =
  | '01_IDLE' | '02_WALK' | '03_ATTACK_SLAM' | '04_LEAP_ATTACK' | '05_DEATH';

export interface KecoonClipFact {
  readonly name: KecoonClipName;
  readonly durationSec: number;
  readonly keys: number;
  readonly loop: boolean;
  /** Kaynak klibin kendi ilerleme hızı (m/sn). YALNIZ görsel referans. */
  readonly sourceSpeedMetersPerSec: number;
  /** Saldırı kliplerinde ölçülmüş vuruş anı (sn); diğerlerinde `null`. */
  readonly hitTimeSec: number | null;
  /** Saldırı kliplerinde ölçülmüş erişim (m); diğerlerinde `null`. */
  readonly reachMeters: number | null;
}

/** Klip gerçekleri — varlık raporunun §3 ve §6 ölçümleri. */
export const KECOON_CLIPS: readonly KecoonClipFact[] = [
  {
    name: '01_IDLE', durationSec: 4.0, keys: 61, loop: true,
    sourceSpeedMetersPerSec: 0.003, hitTimeSec: null, reachMeters: null,
  },
  {
    /* Ayak kayması ölçülen aralık 0,25-0,34 m/sn; rapor 0,30 öneriyor.
       Bu bir GÖRSEL referanstır — mob AI hızı kendi profilinden alır. */
    name: '02_WALK', durationSec: 1.3333, keys: 21, loop: true,
    sourceSpeedMetersPerSec: 0.30, hitTimeSec: null, reachMeters: null,
  },
  {
    name: '03_ATTACK_SLAM', durationSec: 1.3333, keys: 21, loop: true,
    sourceSpeedMetersPerSec: 0, hitTimeSec: 0.5333, reachMeters: 0.646,
  },
  {
    /* Sıçrama YERİNDE: kök XZ yer değiştirmesi 0,039 m — yani klip
       ilerleme taşımaz, mob AI onu bir yere taşımaz. */
    name: '04_LEAP_ATTACK', durationSec: 0.8667, keys: 14, loop: true,
    sourceSpeedMetersPerSec: 0, hitTimeSec: 0.40, reachMeters: 0.646,
  },
  {
    name: '05_DEATH', durationSec: 1.4, keys: 22, loop: false,
    sourceSpeedMetersPerSec: 0, hitTimeSec: null, reachMeters: null,
  },
];

const BY_NAME = new Map(KECOON_CLIPS.map((c) => [c.name, c]));
export function kecoonClip(name: KecoonClipName): KecoonClipFact | undefined {
  return BY_NAME.get(name);
}

/** Modelin metre cinsinden doğal boyu (manifest: `height_m`). */
export const KECOON_HEIGHT_METERS = 0.9925;

/** World birimi cinsinden doğal boy (1× ölçekte). */
export const KECOON_NATURAL_HEIGHT_WORLD = KECOON_HEIGHT_METERS * WORLD_UNITS_PER_METER;

/** Goblin ZAYIF mobların modelidir; bu yüzden ölçek bandı mutantınkinden
 *  ALÇAKTIR. Sayılar P2.0 placeholder yükseklik hiyerarşisini korur —
 *  aynı slotun silüeti model değişince zıplamasın. */
export const KECOON_HEIGHT_WORLD: Readonly<Record<MobAiType, number>> = {
  NORMAL: 38, AGGRESSIVE: 46, ELITE: 60,
};

export function kecoonScaleFor(type: MobAiType): number {
  return (KECOON_HEIGHT_WORLD[type] / KECOON_NATURAL_HEIGHT_WORLD) * WORLD_UNITS_PER_METER;
}

/** ══════════════ HANGİ MOB HANGİ MODEL ══════════════
 *
 *  Kullanıcı kararı: zayıflar goblin, güçlüler mutant. Eşik SEVİYEDİR,
 *  AI tipi değil — bir Sv2 "AGGRESSIVE" mob hâlâ zayıftır.
 *
 *  Eşik 11: Moradon'un ilk on seviyesi goblin bandıdır (solucan,
 *  sıçan, böcek, goblin, kapkaççı). Bataklık Devi'nden (Sv11)
 *  itibaren mutant devreye girer ve bölge gözle ayrılır. */
export const GOBLIN_MAX_LEVEL = 10;

export function usesGoblinModel(monsterLevel: number): boolean {
  return monsterLevel <= GOBLIN_MAX_LEVEL;
}

/** CC-BY-4.0 künyesi — oyunda GÖRÜNÜR yerde gösterilmek zorunda. */
export const KECOON_ATTRIBUTION =
  'Snarling Goblin Fighter — RapidAssets (CC-BY-4.0)';

/* ═══════════════ KLİP EŞLEME ═══════════════
   `MutantAnimator`ın faz adları TEK dildir; her modelin kendi klip
   tablosu bu dile çevrilir. Goblin'in klip kümesi mutantınkinden
   DAR: nefes, koşu ve kükreme YOK.

   EKSİK KLİPLER UYDURULMAZ:
   · `idleLong` → boşta klibin kendisi (nefes klibi kaynakta yok)
   · `run`      → yürüyüş (koşu kaynakta yok; hız çarpanı animatörde)
   · `roar`     → `null`; kükreme fazı goblin'de ATLANIR */
export const KECOON_CLIP_MAP = {
  idle: '01_IDLE',
  idleLong: '01_IDLE',
  walk: '02_WALK',
  run: '02_WALK',
  roar: null,
  death: '05_DEATH',
  /** Saldırı klibi profilin vuruş anına göre seçilir. */
  attackCandidates: ['03_ATTACK_SLAM', '04_LEAP_ATTACK'],
} as const;

/** Profilin vuruş anına EN YAKIN saldırı klibi — mutanttaki kuralın
 *  aynısı, farklı klip kümesiyle. */
export function kecoonAttackClipFor(profileHitMomentSec: number): KecoonClipFact {
  const candidates = KECOON_CLIPS.filter((c) => c.hitTimeSec !== null);
  if (candidates.length === 0) throw new Error('[P2.28] goblin saldırı klibi yok');
  let best = candidates[0]!;
  let bestDiff = Infinity;
  for (const c of candidates) {
    const diff = Math.abs((c.hitTimeSec ?? 0) - profileHitMomentSec);
    if (diff < bestDiff) { bestDiff = diff; best = c; }
  }
  return best;
}
