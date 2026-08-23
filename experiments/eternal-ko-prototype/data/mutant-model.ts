/** MUTANT MOBILE V1 — VARLIK GERÇEKLERİ (P2.2)
 *
 *  ══════════════ MANİFEST AUTHORITATIVE'DİR ══════════════
 *
 *  `mutant-manifest.json` varlıkla birlikte teslim edilen metadata dosyasıdır.
 *  Kemik adları, saldırı vuruş anları, klip süreleri, kaynak hızları ve bilinen
 *  kusurlar BURADAN okunur; hiçbiri elle uydurulmaz.
 *
 *  GLB YENİDEN OPTİMİZE EDİLMEDİ. Animasyon / kemik / doku verisine
 *  DOKUNULMADI. Bu katman yalnız manifesti TİPLİ hale getirir.
 *
 *  ══════════════ EKSİK KLİP AÇIKÇA İŞARETLİ ══════════════
 *  Manifest `missingClips` altında **HIT_REACT YOK** diyor: Creature Pack (2)
 *  içinde hiçbir irkilme/sendeleme animasyonu bulunmuyor ve boşluğu kapatmak
 *  için hiçbir klip yeniden adlandırılmamış. Bu proje de UYDURMAZ — hasar
 *  tepkisi state'i BAĞLANMAZ (bkz. `MUTANT_MISSING_CLIPS`).
 *
 *  ══════════════ BU DOSYA THREE İMPORT ETMEZ ══════════════ */
import manifest from './mutant-manifest.json';
import { WORLD_UNITS_PER_METER } from './archer-model.js';
import type { MobAiType } from './mob-ai-profiles.js';

/* ───────────────────────────── klip kimlikleri ───────────────────────────── */

export type MutantClipName =
  | '01_IDLE' | '02_IDLE_BREATHE'
  | '03_WALK' | '04_RUN'
  | '05_ATTACK_SWIPE' | '06_ATTACK_PUNCH'
  | '07_ROAR' | '08_DEATH';

export interface MutantClipFact {
  readonly name: MutantClipName;
  readonly durationSec: number;
  readonly frames: number;
  readonly loop: boolean;
  /** `false` YALNIZ `08_DEATH` içindir: klip 0,87 m'lik geriye düşüş taşır. */
  readonly rootMotionRemoved: boolean;
  /** Kaynak klibin kendi ilerleme hızı (m/sn). YALNIZ görsel playback referansı. */
  readonly sourceSpeedMetersPerSec: number;
  /** Saldırı kliplerinde ölçülmüş vuruş anı (sn); diğerlerinde `null`. */
  readonly hitTimeSec: number | null;
  /** Saldırı kliplerinde ölçülmüş erişim (m); diğerlerinde `null`. */
  readonly reachMeters: number | null;
}

const RAW_CLIPS = manifest.animations as unknown as ReadonlyArray<{
  name: string; durationSec: number; frames: number; loop: boolean;
  rootMotionRemoved: boolean; sourceSpeedMetersPerSec: number;
  timing?: { hitTimeSec?: number; reachAtHitMeters?: number };
}>;

export const MUTANT_CLIPS: readonly MutantClipFact[] = RAW_CLIPS.map((c) => ({
  name: c.name as MutantClipName,
  durationSec: c.durationSec,
  frames: c.frames,
  loop: c.loop,
  rootMotionRemoved: c.rootMotionRemoved,
  sourceSpeedMetersPerSec: c.sourceSpeedMetersPerSec,
  hitTimeSec: c.timing?.hitTimeSec ?? null,
  reachMeters: c.timing?.reachAtHitMeters ?? null,
}));

export const MUTANT_CLIP_NAMES: readonly MutantClipName[] = MUTANT_CLIPS.map((c) => c.name);

export function mutantClip(name: MutantClipName): MutantClipFact {
  const hit = MUTANT_CLIPS.find((c) => c.name === name);
  if (!hit) throw new Error(`[P2.2] manifestte klip yok: ${name}`);
  return hit;
}

/** Manifestin kendi bildirdiği EKSİK klipler — uydurulmadı, işaretlendi. */
export const MUTANT_MISSING_CLIPS: readonly string[] =
  (manifest.missingClips as unknown as ReadonlyArray<{ name: string }>).map((m) => m.name);

/* ───────────────────────────── dosya gerçekleri ───────────────────────────── */

export const MUTANT_MODEL = {
  file: manifest.file,
  fileBytes: manifest.fileBytes,
  units: manifest.units,
  upAxis: manifest.upAxis,
  forwardAxis: manifest.forwardAxis,
  characterHeightMeters: manifest.characterHeightMeters,
  vertices: manifest.mesh.vertices,
  triangles: manifest.mesh.triangles,
  meshes: manifest.mesh.meshes,
  primitives: manifest.mesh.primitives,
  drawCalls: manifest.mesh.drawCalls,
  materials: manifest.mesh.materials,
  skinJointCount: manifest.skeleton.skinJointCount,
  nodeCount: manifest.skeleton.nodeCount,
  clipCount: RAW_CLIPS.length,
  decoderDependency: manifest.runtime.decoderDependency as string | null,
  extensionsRequired: manifest.runtime.extensionsRequired as readonly string[],
} as const;

export const MUTANT_BONES = {
  root: manifest.skeleton.root,
  hips: manifest.skeleton.hips,
  leftHand: manifest.skeleton.leftHand,
  rightHand: manifest.skeleton.rightHand,
  /** Kafa üstü çapa — can barı / hasar sayısı / aggro işareti. */
  headTop: manifest.skeleton.headTop,
  /** Swipe saldırısını süren kemik (sol pençenin tamamı buna skinli). */
  attackSwipe: manifest.skeleton.attackBoneSwipe,
  /** Punch saldırısını süren kemik. */
  attackPunch: manifest.skeleton.attackBonePunch,
} as const;

/* ───────────────────────── ölüm özel durumu ───────────────────────── */

/** `08_DEATH` içindeki YAZILI geriye düşüş (metre).
 *  Model-yerel SUNUMDUR; mob `worldX/worldY` otoritesi `MobAi`/`MobSlotSystem`
 *  içinde kalır ve buradan ASLA değişmez. */
export const MUTANT_DEATH_DISPLACEMENT_METERS =
  (manifest.animations as unknown as ReadonlyArray<{ name: string; rootMotionMeters?: number }>)
    .find((c) => c.name === '08_DEATH')?.rootMotionMeters ?? 0.866;

/** Kaynak klibin düşüş sonunda Y=0 altına indiği miktar (metre). */
export const MUTANT_DEATH_GROUND_DIP_METERS =
  (manifest.animations as unknown as ReadonlyArray<{ name: string; groundPenetrationMeters?: number }>)
    .find((c) => c.name === '08_DEATH')?.groundPenetrationMeters ?? 0.0705;

/** Ölüm boyunca YALNIZ GÖRSEL uygulanan yukarı öteleme (metre).
 *  Manifest önerisi: "~7 cm yukarı ötele veya zemin çarpışmasını kapat". */
export const MUTANT_DEATH_VISUAL_Y_OFFSET_METERS = 0.075;

export const MUTANT_KNOWN_ISSUES = manifest.validation.knownIssues as readonly string[];

/* ───────────────────────── ölçek köprüsü ───────────────────────── */

/** Metre → world birimi çarpanı, ARCHER İLE AYNI köprüyü kullanır
 *  (`archer-model.ts` → `WORLD_UNITS_PER_METER`). İki varlık aynı dünyada
 *  yaşadığı için ikinci bir ölçek sabiti TANIMLANMAZ. */
export const MUTANT_BASE_SCALE = WORLD_UNITS_PER_METER;

/** Mutantın world birimi cinsinden doğal boyu (1× ölçekte). */
export const MUTANT_NATURAL_HEIGHT_WORLD =
  MUTANT_MODEL.characterHeightMeters * WORLD_UNITS_PER_METER;

/** P2.0 primitive mob yükseklikleri — silüet hiyerarşisi BURADAN gelir.
 *  Mutant tek bir varlıktır; tip farkı yalnız ÖLÇEKTİR (yeni mob varlığı YOK). */
export const MOB_PLACEHOLDER_HEIGHT_WORLD: Readonly<Record<MobAiType, number>> = {
  NORMAL: 42, AGGRESSIVE: 52, ELITE: 72,
};

/** AI tipine göre model ölçeği — P2.0 placeholder yüksekliğini KORUR.
 *  Uydurulmuş bir sayı değildir: `placeholder / doğal boy` oranıdır. */
export function mutantScaleFor(type: MobAiType): number {
  return (MOB_PLACEHOLDER_HEIGHT_WORLD[type] / MUTANT_NATURAL_HEIGHT_WORLD) * MUTANT_BASE_SCALE;
}
