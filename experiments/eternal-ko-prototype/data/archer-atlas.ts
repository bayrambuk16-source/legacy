/** ARCHER ATLAS — RUNTIME TANIMI (P1.2.2)
 *
 *  Bu dosya `docs/ARCHER_ANIMATION_SPEC.md` + `docs/schema/archer_animation.schema.json`
 *  belgelerinin KOD KARŞILIĞIDIR. Renderer'sız, headless test edilebilir.
 *
 *  TEMEL KURAL — TAHMİN YOK:
 *  - yön → satır eşlemesi AÇIK TABLODUR, formülle türetilmez (spec §2),
 *  - kare sayısı / fps / loop metadata'dan okunur, koda gömülmez,
 *  - `releaseFrame` ve `contactFrames` metadata'da YOKSA (null) runtime bir değer
 *    UYDURMAZ; ilgili davranış kapalı kalır.
 *
 *  ÖNEMLİ: bu dosya hiçbir piksel içermez. Atlas görselleri ayrıca teslim edilir.
 *  Kullanıcının yüklediği dört "contact sheet" sayfası RUNTIME ATLAS DEĞİLDİR
 *  (bkz. `docs/ARCHER_SHEET_REVIEW_V1.md`) ve buraya bağlanmamıştır. */

import { ARCHER } from './archer-skills.js';

/* ---------------------------------------------------------------- yönler --- */

/** Spec §2 — atlas SATIR sırası. Bu sıra hiçbir koşulda değişmez. */
export const ATLAS_DIRECTIONS = [
  'BACK', 'BACK_RIGHT', 'RIGHT', 'FRONT_RIGHT',
  'FRONT', 'FRONT_LEFT', 'LEFT', 'BACK_LEFT',
] as const;
export type AtlasDirection = (typeof ATLAS_DIRECTIONS)[number];

/** Yön adı → atlas satırı (spec §2). */
export const ATLAS_DIRECTION_ROW: Record<AtlasDirection, number> = {
  BACK: 0, BACK_RIGHT: 1, RIGHT: 2, FRONT_RIGHT: 3,
  FRONT: 4, FRONT_LEFT: 5, LEFT: 6, BACK_LEFT: 7,
};

/** Runtime yön indeksi → yön adı.
 *  Runtime açıyı `directionIndex()` ile 8'e yuvarlar: 0 = +X = SAĞ, saat yönünde
 *  artar (ekran Y aşağı). Atlas ise BACK'ten başlar. İkisi FARKLI sıradadır;
 *  bu yüzden aradaki köprü AÇIK TABLODUR (spec §2.1). */
export const RUNTIME_INDEX_DIRECTION: readonly AtlasDirection[] = [
  'RIGHT',        // 0   →  0°   sağ
  'FRONT_RIGHT',  // 1   →  45°  aşağı-sağ
  'FRONT',        // 2   →  90°  aşağı (ekrana doğru)
  'FRONT_LEFT',   // 3   →  135° aşağı-sol
  'LEFT',         // 4   →  180° sol
  'BACK_LEFT',    // 5   →  225° yukarı-sol
  'BACK',         // 6   →  270° yukarı (ekrandan uzağa)
  'BACK_RIGHT',   // 7   →  315° yukarı-sağ
] as const;

/** Runtime yön indeksi → atlas satırı. Tabloların BİLEŞİMİ, formül değil. */
export const RUNTIME_INDEX_TO_ATLAS_ROW: readonly number[] =
  RUNTIME_INDEX_DIRECTION.map((d) => ATLAS_DIRECTION_ROW[d]);

/** Açı (radyan) → atlas satırı. Tek giriş noktası; sahne kendi hesabını yapmaz. */
export function atlasRowForAngle(angleRad: number): number {
  const deg = ((angleRad * 180) / Math.PI + 360) % 360;
  const idx = Math.round(deg / 45) % 8;
  return RUNTIME_INDEX_TO_ATLAS_ROW[idx]!;
}

/* ----------------------------------------------------------------- klipler --- */

export const ARCHER_CLIPS = ['walk', 'attack', 'skill', 'idle', 'dead'] as const;
export type ArcherClip = (typeof ARCHER_CLIPS)[number];

export interface ClipMeta {
  readonly frames: number;
  readonly fps: number;
  readonly loop: boolean;
  /** Mermi hangi karede çıkar? Metadata vermiyorsa `null` → runtime TAHMİN ETMEZ. */
  readonly releaseFrame: number | null;
  /** Ayağın yere bastığı kareler (toz/gölge nabzı). `null` → efekt üretilmez. */
  readonly contactFrames: readonly number[] | null;
}

export interface ArcherAtlasMeta {
  readonly version: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly footAnchorX: number;
  readonly footAnchorY: number;
  readonly clips: Readonly<Record<ArcherClip, ClipMeta>>;
}

/** Atlas görsel anahtarları (AssetStore key'leri). */
export const ARCHER_ATLAS_KEY: Readonly<Record<ArcherClip, string>> = {
  walk: 'archer_walk',
  attack: 'archer_attack',
  skill: 'archer_skill',
  idle: 'archer_idle',
  dead: 'archer_dead',
};

/** `docs/schema/archer_animation.example.json` ile birebir aynı varsayılan.
 *  Gerçek atlas teslim edildiğinde `archer_animation.json` bunu EZER. */
export const ARCHER_ATLAS_DEFAULT: ArcherAtlasMeta = {
  version: 'v1-default',
  frameWidth: 300,
  frameHeight: 300,
  footAnchorX: 150,
  /** 300 px karede içerik 264'te biter → altta 36 px pay.
   *  Bu telafi edilmezse karakter HAVADA durur (gözlem #2). */
  footAnchorY: 264,
  clips: {
    walk: { frames: 8, fps: 10, loop: true, releaseFrame: null, contactFrames: null },
    attack: { frames: 6, fps: 18, loop: false, releaseFrame: null, contactFrames: null },
    skill: { frames: 6, fps: 16, loop: false, releaseFrame: null, contactFrames: null },
    idle: { frames: 1, fps: 1, loop: true, releaseFrame: null, contactFrames: null },
    dead: { frames: 1, fps: 1, loop: false, releaseFrame: null, contactFrames: null },
  },
};

/** Karenin altındaki şeffaf pay (px). Ayak hizası bundan türer. */
export function footPad(meta: ArcherAtlasMeta): number {
  return meta.frameHeight - meta.footAnchorY;
}

/* ------------------------------------------------- attack mı skill mi? --- */

/** Standart Atış artık GERÇEK bir skilldir (kaynak id 102003) ama görsel olarak
 *  TEMEL ATIŞtır → ATTACK atlası. Diğer 14 okçu skilli → SKILL atlası.
 *
 *  Karar "basic mi skill mi" üzerinden VERİLMEZ: Standart Atış loadout'ta bir
 *  skill slotundadır ve `performSkill()` ile atılır. Tek doğru ayrım
 *  KAYNAK REFERANSIDIR. */
export const ATTACK_CLIP_REFS: readonly number[] = [ARCHER.STANDART_ATIS];

export function clipForSkillRef(sourceRef: number): 'attack' | 'skill' {
  return ATTACK_CLIP_REFS.includes(sourceRef) ? 'attack' : 'skill';
}

/* --------------------------------------------------- metadata doğrulama --- */

export interface AtlasMetaIssue { readonly field: string; readonly message: string }

/** Teslim edilen `archer_animation.json`'u runtime'a bağlamadan önce doğrular.
 *  Spec'e uymayan metadata SESSİZCE kabul edilmez. */
export function validateAtlasMeta(meta: ArcherAtlasMeta): AtlasMetaIssue[] {
  const out: AtlasMetaIssue[] = [];
  const expect: Record<ArcherClip, number> = {
    walk: 8, attack: 6, skill: 6, idle: 1, dead: 1,
  };
  if (meta.frameWidth <= 0 || meta.frameHeight <= 0) {
    out.push({ field: 'frameSize', message: 'kare boyutu pozitif olmalı' });
  }
  if (meta.footAnchorY < 0 || meta.footAnchorY > meta.frameHeight) {
    out.push({ field: 'footAnchorY', message: 'ayak hizası kare dışında' });
  }
  for (const c of ARCHER_CLIPS) {
    const m = meta.clips[c];
    if (!m) { out.push({ field: c, message: 'klip tanımı eksik' }); continue; }
    if (m.frames !== expect[c]) {
      out.push({ field: `${c}.frames`, message: `spec ${expect[c]} kare istiyor, metadata ${m.frames}` });
    }
    if (m.fps <= 0) out.push({ field: `${c}.fps`, message: 'fps pozitif olmalı' });
    if (m.releaseFrame !== null && (m.releaseFrame < 0 || m.releaseFrame >= m.frames)) {
      out.push({ field: `${c}.releaseFrame`, message: 'kare aralığı dışında' });
    }
    for (const f of m.contactFrames ?? []) {
      if (f < 0 || f >= m.frames) {
        out.push({ field: `${c}.contactFrames`, message: `kare ${f} aralık dışında` });
      }
    }
  }
  return out;
}
