/** ARCHER ANİMASYON DURUM MAKİNESİ — P2.1
 *
 *  ══════════════ BU DOSYA THREE İMPORT ETMEZ ══════════════
 *  Saf karar makinesidir: gameplay'den okunan DAR görünümü alır, hangi klibin
 *  hangi hızda ve hangi döngü kipiyle çalacağına karar verir. `AnimationMixer`
 *  ve `AnimationAction` bu dosyanın DIŞINDADIR (`ArcherRig`). Bu yüzden 17
 *  klibin tamamı WebGL olmadan sınanabilir.
 *
 *  ══════════════ GAMEPLAY OTORİTESİ DEĞİLDİR ══════════════
 *  Buradan çıkan hiçbir değer gameplay'e geri yazılmaz. `releaseDelay = 0.20`
 *  gameplay sabiti P2.1'de DEĞİŞTİRİLMEDİ; animasyonun kendi doğal bırakma anı
 *  (0.183 sn) yalnız TELEMETRİDE raporlanır (§RELEASE TIMING).
 *
 *  ══════════════ KLİP SEÇİMİ MANİFEST SÜRÜCÜLÜDÜR ══════════════
 *  Yön eşlemesi elle yazılmaz: her lokomosyon klibinin manifestteki
 *  `direction` vektörü ile hareketin MODEL-YEREL yönü arasındaki iç çarpım
 *  en büyük olan klip seçilir. Aile (RUN ↔ AIM_WALK) seçimi de manifestteki
 *  `sourceSpeedMetersPerSec` değerlerinden türetilir. */
import {
  ARCHER_NATURAL_RELEASE_SEC, ARCHER_OVERDRAW_90_SEC, DEATH_VISUAL_Y_OFFSET_METERS,
  archerClip, type ArcherClipFact, type ArcherClipName,
} from '../data/archer-model.js';

/* ───────────────────────────── ayarlar (GÖRSEL) ───────────────────────────── */

export const ARCHER_ANIM_TUNING = {
  /** Klipler arası geçiş süresi (sn). */
  fadeSec: 0.18,
  /** Lokomosyon `timeScale` sınırları — absürt hızlanma/yavaşlama olmasın. */
  minTimeScale: 0.25,
  maxTimeScale: 3.0,
  /** Bu hızın altında lokomosyon "duruş" sayılır (m/sn). */
  idleSpeedEps: 0.05,
  /** HAREKET HALİNDE atış klibinin kesildiği an (sn).
   *  Doğal bırakma 0.183 sn; kalan kareler takip hareketidir. Karışım (blend)
   *  olmadığı için yürürken bacakların 0.7 sn donmasını engeller. */
  recoilMoveCutSec: 0.35,
  /** Kesintisiz duruştan sonra bir kez `02_IDLE_LOOK` oynatılır (sn). */
  idleLookAfterSec: 6,
  /** Tutuş klibinin oynatma hızı — manifest notu: 1.5–2.0× ile ~1.5–2.0 sn'de
   *  tam overdraw. Tutuş pozuna çabuk otursun diye 1.8 seçildi. */
  overdrawTimeScale: 1.8,
} as const;

/** Bir atış tetiği ile animasyonun doğal bırakma anı arasındaki fark (sn).
 *  Gameplay değeri (0.20) DEĞİŞTİRİLMEDİ; bu yalnız raporlanan sapmadır. */
export function releaseTimingDelta(gameplayReleaseDelaySec: number): number {
  return gameplayReleaseDelaySec - ARCHER_NATURAL_RELEASE_SEC;
}

/* ───────────────────────────── giriş / çıkış ───────────────────────────── */

/* ───────────────────────────── klip eşleme tablosu ───────────────────────────── */

/** OYUNCU STATE'İ → KLİP. Eşleme TEK YERDE; yeni klip gelirse yalnız burası
 *  değişir.
 *
 *  ══════════ VARLIK BOŞLUĞU — UYDURULMADI ══════════
 *  `archer_mobile_v1.glb` **tek bir bırakma klibi** taşır (`13_AIM_RECOIL`).
 *  Pakette ikinci bir atış/cast animasyonu YOKTUR ve boşluğu kapatmak için
 *  hiçbir klip yeniden adlandırılmadı. Bu yüzden ATTACK ve SKILL **ayrı
 *  state'lerdir** (telemetride ve testte ayrı görünür) ama bugün AYNI klibe
 *  çözülürler. Gerçek bir skill klibi geldiğinde değişecek tek satır
 *  `SKILL` satırıdır. Aynı durum mutantın eksik `HIT_REACT`'i için de
 *  geçerlidir (bkz. `data/mutant-model.ts`). */
export const ARCHER_CLIP_MAP = {
  IDLE: '01_IDLE',
  IDLE_LOOK: '02_IDLE_LOOK',
  /** Standart Atış — `clipForSkillRef(ref) === 'attack'`. */
  ATTACK: '13_AIM_RECOIL',
  /** Diğer archery skilleri — `clipForSkillRef(ref) === 'skill'`. */
  SKILL: '13_AIM_RECOIL',
  AIM_HOLD: '12_AIM_OVERDRAW',
  HIT: '14_HIT_REACT',
  DEATH: '15_DEATH',
  EQUIP: '16_EQUIP_BOW',
  DISARM: '17_DISARM_BOW',
} as const satisfies Record<string, ArcherClipName>;

/** Oyuncunun mantıksal görsel state'i — klipten AYRI kavramdır. */
export type ArcherAnimState =
  | 'IDLE' | 'MOVE' | 'ATTACK' | 'SKILL' | 'AIM' | 'HIT' | 'EQUIP' | 'DISARM' | 'DEATH';

export interface ArcherAnimInput {
  /** Oyuncu hayatta mı (gameplay'den KOPYA). */
  alive: boolean;
  /** ÖLÇÜLEN görsel hız (m/sn) — renderer konum farkından türetir. */
  speedMetersPerSec: number;
  /** Hareket yönünün gövdeye göre YEREL açısı (radyan, 0 = ileri). */
  localMoveAngle: number;
  /** Gameplay `moving` bayrağı. */
  moving: boolean;
  /** `PlayerAnimator.triggers.attack` sayacı (cast BAŞLANGICINDA artar). */
  attackTriggerCount: number;
  /** `PlayerAnimator.triggers.skill` sayacı. */
  skillTriggerCount: number;
  /** 0..1 — düşüş kenarı `14_HIT_REACT` tetikler. */
  hpRatio: number;
  /** Silah slotundaki tanım referansı (`null` → silah yok). */
  weaponRef: number | null;
  /** Seçili hedef var mı (nişan tutuşu için). */
  hasTarget: boolean;
}

export interface ArcherAnimDecision {
  /** Mantıksal state — ATTACK ve SKILL AYRI görünür (klip aynı olsa bile). */
  state: ArcherAnimState;
  clip: ArcherClipName;
  /** `true` → LoopRepeat. `false` → LoopOnce. */
  loop: boolean;
  /** `LoopOnce` iken son karede tutulsun mu (`clampWhenFinished`). */
  clamp: boolean;
  timeScale: number;
  fadeSec: number;
  /** Klip AYNI olsa bile baştan başlatılmalı mı (tekrar tetiklenen atış). */
  restart: boolean;
  /** Ölüm sırasında uygulanan GÖRSEL yukarı öteleme (metre). */
  visualYOffsetMeters: number;
  /** Ölüm sunumu aktif mi (model-yerel yer değiştirme serbest). */
  deathActive: boolean;
}

/* ───────────────────────────── yardımcılar ───────────────────────────── */

const RUN_FAMILY: readonly ArcherClipName[] =
  ['03_RUN_FORWARD', '04_RUN_BACK', '05_RUN_LEFT', '06_RUN_RIGHT'];
const AIM_FAMILY: readonly ArcherClipName[] =
  ['07_AIM_WALK_FORWARD', '08_AIM_WALK_BACK', '09_AIM_WALK_LEFT', '10_AIM_WALK_RIGHT'];

/** Açıyı [-π, π) aralığına indirger. */
function norm(a: number): number {
  const twoPi = Math.PI * 2;
  let r = (a + Math.PI) % twoPi;
  if (r < 0) r += twoPi;
  return r - Math.PI;
}

/** Yerel hareket açısını MODEL-YEREL birim vektöre çevirir (three uzayı).
 *  δ = 0 → (0, 0, 1) = +Z ileri. δ = +π/2 → (-1, 0, 0) = -X. */
export function localMoveVector(delta: number): { x: number; z: number } {
  return { x: -Math.sin(delta), z: Math.cos(delta) };
}

/** Aile içinden yönü EN İYİ eşleşen klip — manifest `direction` vektörüyle. */
export function directionalClip(
  family: readonly ArcherClipName[], delta: number,
): ArcherClipFact {
  const v = localMoveVector(delta);
  let best = archerClip(family[0]!);
  let bestDot = -Infinity;
  for (const name of family) {
    const c = archerClip(name);
    const dot = v.x * c.direction[0] + v.z * c.direction[2];
    if (dot > bestDot) { bestDot = dot; best = c; }
  }
  return best;
}

/** RUN ↔ AIM_WALK eşiği: iki kaynak hızın GEOMETRİK ORTASI.
 *  Sabit uydurulmadı — eşik manifest hızlarından türer. */
export function familyThreshold(delta: number): number {
  const run = directionalClip(RUN_FAMILY, delta).sourceSpeedMetersPerSec;
  const walk = directionalClip(AIM_FAMILY, delta).sourceSpeedMetersPerSec;
  return Math.sqrt(Math.max(1e-6, run * walk));
}

function clampScale(v: number): number {
  return Math.min(ARCHER_ANIM_TUNING.maxTimeScale,
    Math.max(ARCHER_ANIM_TUNING.minTimeScale, v));
}

/* ───────────────────────────── durum makinesi ───────────────────────────── */

type OneShot = {
  clip: ArcherClipName;
  /** Kalan süre (sn) — 0'a inince tek atışlık klip biter. */
  remaining: number;
  /** Hareket başlarsa erken kesilebilir mi (yalnız atış klibi). */
  cutOnMove: boolean;
};

export class ArcherAnimator {
  private oneShot: OneShot | null = null;
  private dead = false;
  private idleElapsed = 0;
  private idleLookPlayed = false;
  private lastAttack = 0;
  private lastSkill = 0;
  private lastHp = 1;
  private lastWeapon: number | null = null;
  private primed = false;
  private current: ArcherClipName = '01_IDLE';
  private currentState: ArcherAnimState = 'IDLE';
  /** Devam eden tek-atışlık klibin mantıksal state'i. */
  private oneShotState: ArcherAnimState = 'IDLE';
  /** Ölçüm/telemetri: hangi klip kaç kez BAŞLATILDI. */
  readonly playCounts = new Map<ArcherClipName, number>();

  get currentClip(): ArcherClipName { return this.current; }
  get state(): ArcherAnimState { return this.currentState; }
  get deathActive(): boolean { return this.dead; }
  /** Devam eden tek-atışlık klip (yoksa `null`). */
  get pendingOneShot(): ArcherClipName | null { return this.oneShot?.clip ?? null; }

  /** Respawn / sahne sıfırlaması — ölüm sunumu ve tüm artıklar TEMİZLENİR. */
  reset(): void {
    this.oneShot = null;
    this.dead = false;
    this.idleElapsed = 0;
    this.idleLookPlayed = false;
    this.primed = false;
    this.current = '01_IDLE';
    this.currentState = 'IDLE';
    this.oneShotState = 'IDLE';
  }

  /** Bir kareyi çözer. Gameplay'e HİÇBİR ŞEY yazmaz. */
  update(dt: number, input: ArcherAnimInput): ArcherAnimDecision {
    /* İlk karede tetik sayaçları senkronlanır; aksi halde sahne açılışında
       sahte bir atış/hasar kenarı görünürdü. */
    if (!this.primed) {
      this.lastAttack = input.attackTriggerCount;
      this.lastSkill = input.skillTriggerCount;
      this.lastHp = input.hpRatio;
      this.lastWeapon = input.weaponRef;
      this.primed = true;
    }

    /* ── 1. ÖLÜM: her şeyi ezer ── */
    if (!input.alive) {
      if (!this.dead) { this.dead = true; this.oneShot = null; this.note('15_DEATH'); }
      this.current = ARCHER_CLIP_MAP.DEATH;
      this.currentState = 'DEATH';
      return {
        state: 'DEATH',
        clip: ARCHER_CLIP_MAP.DEATH, loop: false, clamp: true, timeScale: 1,
        fadeSec: ARCHER_ANIM_TUNING.fadeSec, restart: false,
        visualYOffsetMeters: DEATH_VISUAL_Y_OFFSET_METERS, deathActive: true,
      };
    }
    /* Dirilme: ölüm sunumu ve GÖRSEL öteleme TAMAMEN sıfırlanır. */
    if (this.dead) this.reset();

    /* ── 2. kenar tetikleri ── */
    /* ══ ATTACK ve SKILL AYRI TETİKLERDİR ══
       `PlayerAnimator` klibi KAYNAK REFERANSINA göre ayırır: Standart Atış
       `attack`, diğer 14 okçu skilli `skill` sayacını artırır (P1.2.2). O
       ayrım burada AYNEN korunur. */
    const attackFired = input.attackTriggerCount > this.lastAttack;
    const skillFired = input.skillTriggerCount > this.lastSkill;
    const attacked = attackFired || skillFired;
    const hurt = input.hpRatio < this.lastHp - 1e-6;
    const weaponChanged = input.weaponRef !== this.lastWeapon;
    const weaponGained = weaponChanged && input.weaponRef !== null;
    const weaponLost = weaponChanged && input.weaponRef === null;
    this.lastAttack = input.attackTriggerCount;
    this.lastSkill = input.skillTriggerCount;
    this.lastHp = input.hpRatio;
    this.lastWeapon = input.weaponRef;

    let restart = false;

    /* Öncelik: atış > kuşan/çıkar > hasar tepkisi. */
    if (attacked) {
      const state: ArcherAnimState = attackFired ? 'ATTACK' : 'SKILL';
      const clip = attackFired ? ARCHER_CLIP_MAP.ATTACK : ARCHER_CLIP_MAP.SKILL;
      this.oneShot = { clip, remaining: archerClip(clip).durationSec, cutOnMove: true };
      this.oneShotState = state;
      restart = true;
      this.note(clip);
    } else if (weaponGained) {
      this.oneShot = {
        clip: ARCHER_CLIP_MAP.EQUIP,
        remaining: archerClip(ARCHER_CLIP_MAP.EQUIP).durationSec, cutOnMove: false,
      };
      this.oneShotState = 'EQUIP';
      restart = true;
      this.note(ARCHER_CLIP_MAP.EQUIP);
    } else if (weaponLost) {
      this.oneShot = {
        clip: ARCHER_CLIP_MAP.DISARM,
        remaining: archerClip(ARCHER_CLIP_MAP.DISARM).durationSec, cutOnMove: false,
      };
      this.oneShotState = 'DISARM';
      restart = true;
      this.note(ARCHER_CLIP_MAP.DISARM);
    } else if (hurt && this.oneShot === null) {
      this.oneShot = {
        clip: ARCHER_CLIP_MAP.HIT,
        remaining: archerClip(ARCHER_CLIP_MAP.HIT).durationSec, cutOnMove: false,
      };
      this.oneShotState = 'HIT';
      restart = true;
      this.note(ARCHER_CLIP_MAP.HIT);
    }

    const speed = Math.max(0, input.speedMetersPerSec);
    const reallyMoving = input.moving && speed > ARCHER_ANIM_TUNING.idleSpeedEps;

    /* ── 3. devam eden tek-atışlık klip ── */
    if (this.oneShot !== null) {
      const os = this.oneShot;
      if (!restart) os.remaining -= dt;
      const cut = os.cutOnMove && reallyMoving
        && archerClip(os.clip).durationSec - os.remaining >= ARCHER_ANIM_TUNING.recoilMoveCutSec;
      if (os.remaining > 0 && !cut) {
        this.current = os.clip;
        this.idleElapsed = 0;
        return this.decide(this.oneShotState, os.clip, false, true, 1, restart);
      }
      this.oneShot = null;
    }

    /* ── 4. lokomosyon ── */
    if (reallyMoving) {
      this.idleElapsed = 0;
      this.idleLookPlayed = false;
      const delta = norm(input.localMoveAngle);
      const useAim = speed < familyThreshold(delta);
      const clip = directionalClip(useAim ? AIM_FAMILY : RUN_FAMILY, delta);
      const scale = clampScale(speed / Math.max(0.01, clip.sourceSpeedMetersPerSec));
      if (this.current !== clip.name) this.note(clip.name);
      this.current = clip.name;
      return this.decide('MOVE', clip.name, true, false, scale, false);
    }

    /* ── 5. nişan tutuşu / duruş ── */
    this.idleElapsed += dt;
    if (input.hasTarget && input.weaponRef !== null) {
      if (this.current !== ARCHER_CLIP_MAP.AIM_HOLD) this.note(ARCHER_CLIP_MAP.AIM_HOLD);
      this.current = ARCHER_CLIP_MAP.AIM_HOLD;
      return this.decide('AIM', ARCHER_CLIP_MAP.AIM_HOLD, false, true,
        ARCHER_ANIM_TUNING.overdrawTimeScale, false);
    }
    if (!this.idleLookPlayed && this.idleElapsed >= ARCHER_ANIM_TUNING.idleLookAfterSec) {
      this.idleLookPlayed = true;
      this.oneShot = {
        clip: ARCHER_CLIP_MAP.IDLE_LOOK,
        remaining: archerClip(ARCHER_CLIP_MAP.IDLE_LOOK).durationSec, cutOnMove: false,
      };
      this.oneShotState = 'IDLE';
      this.current = ARCHER_CLIP_MAP.IDLE_LOOK;
      this.note(ARCHER_CLIP_MAP.IDLE_LOOK);
      return this.decide('IDLE', ARCHER_CLIP_MAP.IDLE_LOOK, false, false, 1, true);
    }
    if (this.current !== ARCHER_CLIP_MAP.IDLE) this.note(ARCHER_CLIP_MAP.IDLE);
    this.current = ARCHER_CLIP_MAP.IDLE;
    return this.decide('IDLE', ARCHER_CLIP_MAP.IDLE, true, false, 1, false);
  }

  private note(clip: ArcherClipName): void {
    this.playCounts.set(clip, (this.playCounts.get(clip) ?? 0) + 1);
  }

  private decide(
    state: ArcherAnimState, clip: ArcherClipName,
    loop: boolean, clamp: boolean, timeScale: number, restart: boolean,
  ): ArcherAnimDecision {
    this.currentState = state;
    return {
      state, clip, loop, clamp, timeScale,
      fadeSec: ARCHER_ANIM_TUNING.fadeSec, restart,
      visualYOffsetMeters: 0, deathActive: false,
    };
  }
}

/** Telemetri için: overdraw tutuşunun %90 doluluğa ulaşma süresi (uygulanan
 *  `timeScale` ile). Manifest kaynak değeri 3.03 sn'dir. */
export function overdrawFullSec(): number {
  return ARCHER_OVERDRAW_90_SEC / ARCHER_ANIM_TUNING.overdrawTimeScale;
}
