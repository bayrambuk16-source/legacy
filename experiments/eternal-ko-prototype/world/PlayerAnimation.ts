/** OYUNCU GÖRSEL DURUM MAKİNESİ + 8 YÖNLÜ POZ (P1.2.2)
 *
 *  GEÇMİŞ HATA (P1.1): sahne, oyuncunun sprite karesini doğrudan `world.moving`
 *  durumuna bağlıyordu. `gt_okcu_*` sayfaları YÜRÜME değil OK ATMA animasyonudur;
 *  sonuç olarak karakter yürürken sürekli ok atıyordu.
 *
 *  KURALLAR
 *  - hareket ve combat state'i BİRBİRİNE KARIŞMAZ,
 *  - `attack`/`skill` tetiği GAMEPLAY SONUCUNDAN gelir; hareket asla saldırı
 *    animasyonu açmaz,
 *  - saldırı sırasında HEDEF yönü, aksi halde HAREKET yönü kullanılır.
 *
 *  İKİ MOD
 *  1. ATLAS MODU (`setAtlas(meta)`): gerçek walk/attack/skill/idle/dead atlasları
 *     yüklü. Kare seçimi metadata'dan gelir. Sahte adım efektleri
 *     (hop/sway/squash/gölge nabzı) TAMAMEN KAPANIR — spec §8 renderer'ın
 *     bunları uygulamasını yasaklar; gerçek karelerde dikey hareket zaten çizimin
 *     içindedir, üst üste binerse çift zıplama olur.
 *  2. FALLBACK (`atlas === null`): P1.1.4/P1.2.1 davranışı AYNEN korunur —
 *     mesafeye bağlı prosedürel adım döngüsü. Atlas gelmeden preview bozulmaz.
 *
 *  Renderer'sız test edilebilir: burada hiçbir çizim çağrısı yoktur. */

import {
  ARCHER_ATLAS_DEFAULT, clipForSkillRef,
  type ArcherAtlasMeta, type ArcherClip,
} from '../data/archer-atlas.js';

export type PlayerAnimState = 'idle' | 'move' | 'attack' | 'skill' | 'dead';

export const PLAYER_ANIM = {
  attackFrames: 6,
  attackFps: 22,
  skillFps: 16,
  idleFrame: 0,
  /** Bir tam adım için katedilen mesafe (world birimi). */
  strideWorld: 46,
  /** Adımın tepe noktasındaki dikey kalkış (piksel, ölçek uygulanmadan). */
  hopPixels: 5.5,
  /** Basış anındaki dikey ezilme oranı (1 = yok). */
  squash: 0.055,
  /** Gövdenin yana salınımı (piksel). */
  swayPixels: 2.4,
  /** Durunca adım fazının sıfıra dönme hızı (1/sn). */
  settleSpeed: 9,
} as const;

/** `state` → atlas klibi. `move` state'i WALK klibini oynatır (spec adlandırması). */
export const STATE_CLIP: Readonly<Record<PlayerAnimState, ArcherClip>> = {
  idle: 'idle', move: 'walk', attack: 'attack', skill: 'skill', dead: 'dead',
};

export class PlayerAnimator {
  private stateValue: PlayerAnimState = 'idle';
  private actionT = 0;
  private actionFps: number = PLAYER_ANIM.attackFps;
  private actionFrames: number = PLAYER_ANIM.attackFrames;
  private dead = false;

  /** 0..1 arası adım fazı (0 = sol basış, 0.5 = sağ basış). */
  private stride = 0;
  private lastTravelled = 0;
  /** Bu karede ayak yere bastı mı? (toz efekti için) */
  private plantedThisFrame = false;

  /* ---- FACING AYRIMI (spec §10) ----
     movementFacing : joystick yönü      → walk yönü
     combatFacing   : hedefin konumu     → attack/skill yönü
     Saldırı boyunca combat facing ÖNCELİKLİDİR; saldırı bitince movement
     facing kendiliğinden geri gelir (ayrı alanlar oldukları için ezilme yok). */
  private moveFacing = 0;
  private aimFacing = 0;

  /* ---- ATLAS ---- */
  private atlas: ArcherAtlasMeta | null = null;
  /** Walk kare seçimi zamana mı (metadata fps) mesafeye mi kilitli?
   *  Varsayılan METADATA'ya sadıktır (spec §3: fps 10, loop).
   *  Mesafe kilidi ancak gerçek sanat ölçülüp ayak kayması görülürse açılır
   *  (bkz. `docs/ARCHER_RUNTIME_GAP.md` §3.1) — tahminle açılmaz. */
  walkDistanceLock = false;
  private walkT = 0;

  /* ---- ÖLÜM ÇAPASI (spec: dead pozu world position'ı DEĞİŞTİRMEZ) ---- */
  private deathX: number | null = null;
  private deathY: number | null = null;

  readonly triggers = { attack: 0, skill: 0 };

  get state(): PlayerAnimState { return this.stateValue; }
  get isActing(): boolean { return this.stateValue === 'attack' || this.stateValue === 'skill'; }
  get footPlanted(): boolean { return this.plantedThisFrame; }

  /** Oynatılan atlas klibi. */
  get clip(): ArcherClip { return STATE_CLIP[this.stateValue]; }

  /** Çizimde kullanılacak bakış açısı: saldırıda HEDEF, aksi halde HAREKET. */
  get angle(): number { return this.isActing ? this.aimFacing : this.moveFacing; }
  get movementFacing(): number { return this.moveFacing; }
  get combatFacing(): number { return this.aimFacing; }

  /* -------------------------------------------------------------- atlas --- */

  get atlasActive(): boolean { return this.atlas !== null; }
  get meta(): ArcherAtlasMeta { return this.atlas ?? ARCHER_ATLAS_DEFAULT; }

  setAtlas(meta: ArcherAtlasMeta): void {
    this.atlas = meta;
    this.walkT = 0;
    /* Atlas modunda sahte adım fazı anlamsız; artığı temizle. */
    this.stride = 0;
  }
  clearAtlas(): void { this.atlas = null; this.walkT = 0; }

  /** Aktif klipteki kare sayısı. */
  get clipFrames(): number {
    return this.atlas ? this.atlas.clips[this.clip].frames : PLAYER_ANIM.attackFrames;
  }

  /** Sayfa kare indeksi.
   *  FALLBACK: idle/move/dead DAİMA duruş karesidir (ok atma sayfası yalnız saldırıda).
   *  ATLAS   : her klip kendi karelerini oynatır — walk dahil. */
  get frame(): number {
    if (this.atlas) {
      const m = this.atlas.clips[this.clip];
      if (m.frames <= 1) return 0;
      if (this.isActing) {
        return Math.min(m.frames - 1, Math.floor(this.actionT * m.fps));
      }
      if (this.stateValue === 'move') {
        const raw = this.walkDistanceLock
          ? Math.floor(this.stride * m.frames)
          : Math.floor(this.walkT * m.fps);
        return ((raw % m.frames) + m.frames) % m.frames;
      }
      return 0;
    }
    if (!this.isActing) return PLAYER_ANIM.idleFrame;
    return Math.min(PLAYER_ANIM.attackFrames - 1, Math.floor(this.actionT * this.actionFps));
  }

  /** Mermi bu karede mi çıkmalı? Metadata `releaseFrame` vermezse ASLA true. */
  get atReleaseFrame(): boolean {
    if (!this.atlas || !this.isActing) return false;
    const rf = this.atlas.clips[this.clip].releaseFrame;
    return rf !== null && this.frame === rf;
  }

  /* --------------------------------- prosedürel adım efektleri (fallback) --- */
  /*  Spec §8: gerçek atlas aktifken renderer hop/bob/bounce/squash UYGULAMAZ.
      Bu yüzden hepsi atlas modunda NÖTR döner (silinmedi, KAPIYA ALINDI). */

  get stridePhase(): number { return this.atlas ? 0 : this.stride; }

  get hopOffset(): number {
    if (this.atlas) return 0;
    return Math.abs(Math.sin(this.stride * Math.PI * 2)) * PLAYER_ANIM.hopPixels;
  }

  get squashY(): number {
    if (this.atlas) return 1;
    const plant = 1 - Math.abs(Math.sin(this.stride * Math.PI * 2));   // basışta 1
    return 1 - plant * PLAYER_ANIM.squash;
  }

  get swayOffset(): number {
    if (this.atlas) return 0;
    return Math.sin(this.stride * Math.PI * 2) * PLAYER_ANIM.swayPixels;
  }

  get shadowScale(): number {
    if (this.atlas) return 1;
    return 1 - Math.abs(Math.sin(this.stride * Math.PI * 2)) * 0.22;
  }

  /* ------------------------------------------------------------ tetikler --- */

  /** KAYNAK REFERANSINA göre klip seçer — "basic mi skill mi" diye bakmaz.
   *  Standart Atış (102003) bir skill slotundan atılır ama ATTACK atlasını
   *  kullanır; diğer 14 okçu skilli SKILL atlasını kullanır. */
  triggerForRef(sourceRef: number, angle?: number): void {
    if (clipForSkillRef(sourceRef) === 'attack') this.triggerAttack(angle);
    else this.triggerSkill(angle);
  }

  triggerAttack(angle?: number): void {
    if (this.dead) return;
    if (angle !== undefined) this.aimFacing = angle;
    this.stateValue = 'attack';
    this.actionT = 0;
    this.actionFps = this.atlas ? this.atlas.clips.attack.fps : PLAYER_ANIM.attackFps;
    this.actionFrames = this.atlas ? this.atlas.clips.attack.frames : PLAYER_ANIM.attackFrames;
    this.triggers.attack += 1;
  }

  triggerSkill(angle?: number): void {
    if (this.dead) return;
    if (angle !== undefined) this.aimFacing = angle;
    this.stateValue = 'skill';
    this.actionT = 0;
    this.actionFps = this.atlas ? this.atlas.clips.skill.fps : PLAYER_ANIM.skillFps;
    this.actionFrames = this.atlas ? this.atlas.clips.skill.frames : PLAYER_ANIM.attackFrames;
    this.triggers.skill += 1;
  }

  /* ---------------------------------------------------------------- ölüm --- */

  /** Ölüm anındaki ZEMİN ÇAPASI. Yatan sprite farklı genişlikte/yükseklikte olsa
   *  bile çizim bu noktaya oturur; karakter ölürken YER DEĞİŞTİRMEZ. */
  get deathAnchorX(): number | null { return this.deathX; }
  get deathAnchorY(): number | null { return this.deathY; }
  get hasDeathAnchor(): boolean { return this.deathX !== null; }

  setDead(dead: boolean, worldX?: number, worldY?: number): void {
    if (dead && !this.dead) {
      /* İLK ölüm karesinde çapa DONDURULUR — sonra bir daha güncellenmez. */
      if (worldX !== undefined) this.deathX = worldX;
      if (worldY !== undefined) this.deathY = worldY;
    }
    this.dead = dead;
    if (dead) { this.stateValue = 'dead'; this.actionT = 0; this.stride = 0; this.walkT = 0; }
    else if (this.stateValue === 'dead') { this.stateValue = 'idle'; this.deathX = null; this.deathY = null; }
  }

  /* -------------------------------------------------------------- update --- */

  /** `moving` YALNIZ idle ↔ move geçişini belirler; saldırı state'ini ASLA açmaz.
   *  `travelled` toplam katedilen mesafedir (adım fazı / mesafe kilidi buradan türer).
   *  `faceAngle` HAREKET yönüdür; saldırı sırasında hedef açısı korunur. */
  update(dt: number, moving: boolean, travelled: number, faceAngle: number, inputActive = false): void {
    const delta = Math.max(0, travelled - this.lastTravelled);
    this.lastTravelled = travelled;
    const prev = this.stride;

    /* Movement facing HER ZAMAN güncellenir (ayrı alan olduğu için combat
       facing'i ezmez). Böylece saldırı bittiği anda karakter GERÇEK hareket
       yönüne döner — eski yöne takılı kalmaz.
       P1.4 §3: "Attack Move 0%" modunda karakter YERİNDE sayar (delta = 0) ama
       joystick girdisi KAYBOLMAZ; `inputActive` ile bakış yönü izlenmeye devam
       eder, saldırı bitince o yöne döner (§19-L). */
    if ((moving && delta > 0) || inputActive) this.moveFacing = faceAngle;

    if (moving && delta > 0) {
      this.stride = (this.stride + delta / PLAYER_ANIM.strideWorld) % 1;
      this.walkT += dt;
    } else {
      /* Duruşta adım fazı en yakın basışa (0 veya 0.5) yumuşakça oturur. */
      const target = this.stride < 0.25 || this.stride >= 0.75 ? (this.stride >= 0.75 ? 1 : 0) : 0.5;
      const k = 1 - Math.exp(-PLAYER_ANIM.settleSpeed * dt);
      this.stride += (target - this.stride) * k;
      if (this.stride >= 1) this.stride = 0;
      this.walkT = 0;                       // duruşta walk klibi başa döner
    }

    if (this.atlas) {
      /* Atlas modunda toz/gölge nabzı YALNIZ metadata `contactFrames` verirse
         üretilir. Vermezse hiç üretilmez — hangi karede ayak bastığını TAHMİN
         ETMEYİZ (releaseFrame ile aynı prensip). */
      const cf = this.atlas.clips.walk.contactFrames;
      this.plantedThisFrame = moving && delta > 0 && cf !== null
        && this.stateValue === 'move' && cf.includes(this.frame);
    } else {
      this.plantedThisFrame = moving && delta > 0
        && (crossed(prev, this.stride, 0) || crossed(prev, this.stride, 0.5));
    }

    if (this.dead) { this.stateValue = 'dead'; return; }
    if (this.isActing) {
      this.actionT += dt;
      if (this.actionT * this.actionFps >= this.actionFrames) {
        this.stateValue = moving ? 'move' : 'idle';
        this.actionT = 0;
      }
      return;
    }
    this.stateValue = moving ? 'move' : 'idle';
  }

  reset(): void {
    this.stateValue = 'idle';
    this.actionT = 0;
    this.actionFps = PLAYER_ANIM.attackFps;
    this.actionFrames = PLAYER_ANIM.attackFrames;
    this.stride = 0;
    this.walkT = 0;
    this.lastTravelled = 0;
    this.dead = false;
    this.moveFacing = 0;
    this.aimFacing = 0;
    this.deathX = null;
    this.deathY = null;
    this.triggers.attack = 0;
    this.triggers.skill = 0;
  }
}

/** `from` → `to` ilerlerken `mark` eşiğini geçti mi? (döngüsel 0..1) */
function crossed(from: number, to: number, mark: number): boolean {
  if (to >= from) return from < mark && to >= mark;
  return from < mark || to >= mark;               // wrap
}
