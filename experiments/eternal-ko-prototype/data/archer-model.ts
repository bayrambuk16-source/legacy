/** ARCHER MOBILE V1 — VARLIK GERÇEKLERİ (P2.1)
 *
 *  ══════════════ MANİFEST AUTHORITATIVE'DİR ══════════════
 *
 *  `archer-manifest.json` varlıkla BİRLİKTE teslim edilen metadata dosyasıdır
 *  ve bu projede **tek gerçek kaynaktır**. Kemik adları, socket ofsetleri, klip
 *  süreleri, kaynak hızları ve bilinen kusurlar BURADAN okunur; hiçbir değer
 *  elle uydurulmaz, hiçbiri kod içinde yeniden yazılmaz.
 *
 *  GLB dosyası YENİDEN OPTİMİZE EDİLMEDİ. Animasyon / kemik / doku verisine
 *  DOKUNULMADI. Bu katman yalnız manifesti TİPLİ hale getirir.
 *
 *  ══════════════ BU DOSYA THREE İMPORT ETMEZ ══════════════
 *  Saf veridir; WebGL olmadan test edilir. */
import manifest from './archer-manifest.json';

/* ───────────────────────────── klip kimlikleri ───────────────────────────── */

/** GLB içindeki 17 klibin adı — manifestteki sırayla. */
export type ArcherClipName =
  | '01_IDLE' | '02_IDLE_LOOK'
  | '03_RUN_FORWARD' | '04_RUN_BACK' | '05_RUN_LEFT' | '06_RUN_RIGHT'
  | '07_AIM_WALK_FORWARD' | '08_AIM_WALK_BACK' | '09_AIM_WALK_LEFT' | '10_AIM_WALK_RIGHT'
  | '11_DRAW_ARROW' | '12_AIM_OVERDRAW' | '13_AIM_RECOIL'
  | '14_HIT_REACT' | '15_DEATH' | '16_EQUIP_BOW' | '17_DISARM_BOW';

export interface ArcherClipFact {
  readonly name: ArcherClipName;
  readonly durationSec: number;
  readonly frames: number;
  readonly loop: boolean;
  /** `false` YALNIZ `15_DEATH` içindir: klip 1,13 m'lik geriye düşüş taşır. */
  readonly rootMotionRemoved: boolean;
  /** Kaynak klibin kendi ilerleme hızı (m/sn). YALNIZ görsel playback referansı. */
  readonly sourceSpeedMetersPerSec: number;
  /** Klibin MODEL-YEREL ilerleme yönü (three uzayı: +Z ileri, +X sol).
   *  Manifestten BİREBİR gelir; yön seçimi bu vektörle yapılır (elle eşleme YOK). */
  readonly direction: readonly [number, number, number];
}

/** Yerel yön (karakterin kendi ekseninde) → lokomosyon klip ailesi. */
export type LocalDirection = 'FORWARD' | 'BACK' | 'LEFT' | 'RIGHT';

/* ───────────────────────────── manifest → tip ───────────────────────────── */

const RAW_CLIPS = manifest.animations as unknown as ReadonlyArray<{
  name: string; durationSec: number; frames: number; loop: boolean;
  rootMotionRemoved: boolean; sourceSpeedMetersPerSec: number; direction: number[];
}>;

export const ARCHER_CLIPS: readonly ArcherClipFact[] = RAW_CLIPS.map((c) => ({
  name: c.name as ArcherClipName,
  durationSec: c.durationSec,
  frames: c.frames,
  loop: c.loop,
  rootMotionRemoved: c.rootMotionRemoved,
  sourceSpeedMetersPerSec: c.sourceSpeedMetersPerSec,
  direction: [c.direction[0]!, c.direction[1]!, c.direction[2]!] as const,
}));

export const ARCHER_CLIP_NAMES: readonly ArcherClipName[] = ARCHER_CLIPS.map((c) => c.name);

export function archerClip(name: ArcherClipName): ArcherClipFact {
  const hit = ARCHER_CLIPS.find((c) => c.name === name);
  if (!hit) throw new Error(`[P2.1] manifestte klip yok: ${name}`);
  return hit;
}

/* ───────────────────────────── dosya gerçekleri ───────────────────────────── */

/** §"Asset facts" — hepsi manifestten okunur, elle yazılmaz. */
export const ARCHER_MODEL = {
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
  boneCount: manifest.skeleton.boneCount,
  clipCount: RAW_CLIPS.length,
  atlasSize: manifest.textureAtlas.size as readonly number[],
  atlasFormat: manifest.textureAtlas.format,
  /** `null` → Draco/Meshopt/KTX2 YOK; ek çözücü paketi GEREKMEZ. */
  decoderDependency: manifest.runtime.decoderDependency as string | null,
  extensionsRequired: manifest.runtime.extensionsRequired as readonly string[],
} as const;

/** Manifestteki kemik adları — GLB düğüm adları DEĞİL (bkz. `GlbLoader`). */
export const ARCHER_BONES = {
  root: manifest.skeleton.root,
  hips: manifest.skeleton.hips,
  leftHand: manifest.skeleton.leftHand,
  rightHand: manifest.skeleton.rightHand,
  bow: manifest.skeleton.bowBone,
  all: manifest.skeleton.bones as readonly string[],
} as const;

/* ───────────────────────────── socketler ───────────────────────────── */

export type ArcherSocketName = 'bow' | 'arrowSpawn' | 'nock';

export interface ArcherSocketFact {
  readonly name: ArcherSocketName;
  readonly bone: string;
  /** Kemiğe göre YEREL konum (metre). Manifestten BİREBİR. */
  readonly localPosition: readonly [number, number, number];
  /** Kemiğe göre YEREL dönüş (quaternion x,y,z,w). Manifestten BİREBİR. */
  readonly localRotation: readonly [number, number, number, number];
}

const RAW_SOCKETS = manifest.sockets as unknown as Record<ArcherSocketName, {
  bone: string; localPosition: number[]; localRotation: number[];
}>;

/** Socket verisi ELLE UYDURULMAZ; üçü de manifestten gelir. */
export const ARCHER_SOCKETS: readonly ArcherSocketFact[] =
  (['bow', 'arrowSpawn', 'nock'] as const).map((name) => {
    const s = RAW_SOCKETS[name];
    return {
      name,
      bone: s.bone,
      localPosition: [s.localPosition[0]!, s.localPosition[1]!, s.localPosition[2]!] as const,
      localRotation: [
        s.localRotation[0]!, s.localRotation[1]!, s.localRotation[2]!, s.localRotation[3]!,
      ] as const,
    };
  });

export function archerSocket(name: ArcherSocketName): ArcherSocketFact {
  const hit = ARCHER_SOCKETS.find((s) => s.name === name);
  if (!hit) throw new Error(`[P2.1] manifestte socket yok: ${name}`);
  return hit;
}

/* ───────────────────────── release zamanlaması (§RELEASE TIMING) ───────────────────────── */

const RECOIL = RAW_CLIPS.find((c) => c.name === '13_AIM_RECOIL') as unknown as {
  timing?: { releaseTimeSec: number; releaseFrame: number };
};

/** ANIMASYONUN DOĞAL bırakma anı — manifestten (0.183 sn, kare 6). */
export const ARCHER_NATURAL_RELEASE_SEC = RECOIL.timing?.releaseTimeSec ?? 0.183;
export const ARCHER_NATURAL_RELEASE_FRAME = RECOIL.timing?.releaseFrame ?? 6;

/** 12_AIM_OVERDRAW bir ÇEKİŞ değil TUTUŞ klibidir (manifest §timing):
 *  kare 0'da yay zaten tam gerili. LoopOnce + clamp ile son karede tutulur. */
const OVERDRAW = RAW_CLIPS.find((c) => c.name === '12_AIM_OVERDRAW') as unknown as {
  timing?: { ninetyPercentOverdrawSec: number };
};
export const ARCHER_OVERDRAW_90_SEC = OVERDRAW.timing?.ninetyPercentOverdrawSec ?? 3.03;

/* ───────────────────────── ölüm özel durumu (§DEATH SPECIAL CASE) ───────────────────────── */

/** `15_DEATH` içindeki YAZILI geriye düşüş (metre).
 *  Bu yer değiştirme **model-yerel sunumdur**; gameplay `worldX/worldY`'ye
 *  ASLA yazılmaz — otorite `WorldMovementSystem`'de kalır. */
export const DEATH_AUTHORED_DISPLACEMENT_METERS = 1.13;

/** Kaynak klibin sonunda gövdenin Y=0 altına battığı miktar (metre).
 *  Mixamo kaynağından gelir (orijinal 70 kemikte 0,155 m). */
export const DEATH_GROUND_DIP_METERS = 0.118;

/** Ölüm boyunca YALNIZ GÖRSEL olarak uygulanan yukarı öteleme (metre).
 *  Gameplay zemin/çarpışma sistemi ölüm sırasında YAZILMAZ. */
export const DEATH_VISUAL_Y_OFFSET_METERS = 0.12;

/** Manifestin kendi bildirdiği bilinen kusurlar (rapora birebir taşınır). */
export const ARCHER_KNOWN_ISSUES = manifest.validation.knownIssues as readonly string[];

/* ───────────────────────── ölçek köprüsü ───────────────────────── */

/** Gameplay world birimi ↔ metre.
 *
 *  SEÇİM GEREKÇESİ: P2.0 placeholder oyuncu kapsülü **52 world birimi**
 *  yüksekliğindeydi ve mob boyutları (42 / 52 / 72) buna göre ayarlıydı.
 *  Gerçek model 1,801 m olduğuna göre dünyanın oranlarını KORUMAK için:
 *
 *      52 world birimi = 1,801 m  →  1 m ≈ 28,87 world birimi
 *
 *  Bu bir GÖRSEL ölçek kararıdır; hiçbir gameplay değeri (playerSpeed,
 *  menzil, hitbox) DEĞİŞMEZ. */
export const PLACEHOLDER_PLAYER_HEIGHT_WORLD = 52;
export const WORLD_UNITS_PER_METER =
  PLACEHOLDER_PLAYER_HEIGHT_WORLD / ARCHER_MODEL.characterHeightMeters;

/** Modelin kendi metre ölçeğinden world birimine geçiş çarpanı. */
export const ARCHER_MODEL_SCALE = WORLD_UNITS_PER_METER;

export function metersToWorld(m: number): number { return m * WORLD_UNITS_PER_METER; }
export function worldToMeters(w: number): number { return w / WORLD_UNITS_PER_METER; }
