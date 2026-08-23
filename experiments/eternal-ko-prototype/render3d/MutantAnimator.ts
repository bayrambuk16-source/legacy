/** MUTANT ANİMASYON DURUM MAKİNESİ — P2.2
 *
 *  ══════════════ BU DOSYA THREE İMPORT ETMEZ ══════════════
 *  `MobAi`'nin KENDİ fazını okur ve hangi klibin çalacağına karar verir.
 *  `AnimationMixer` bu dosyanın DIŞINDADIR (`MobRig`), bu yüzden 8 klibin
 *  tamamı WebGL olmadan sınanabilir.
 *
 *  ══════════════ AI OTORİTESİ DEĞİŞMEZ ══════════════
 *  Burada hiçbir faz geçişi ÜRETİLMEZ. `IDLE / ROAM / AGGRO / CHASE / ATTACK /
 *  RETURN / DYING / DEAD / RESPAWN` kararları `world/MobAi.ts` içinde kalır;
 *  bu katman yalnız KOPYALANMIŞ fazı okur ve klip seçer.
 *
 *  ══════════════ KLİP AİLESİ FAZDAN, HIZ ORANI ÖLÇÜMDEN ══════════════
 *  Lokomosyon klibi AI'ın kendi anlamıyla seçilir (ROAM/RETURN = yürüyüş,
 *  CHASE = koşu); oynatma hızı ise `ölçülen hız ÷ klibin kaynak hızı`dır.
 *  Böylece ayak kayması manifestteki %0,3–%1,2 bandında kalır.
 *
 *  ══════════════ SALDIRI HİZALAMASI ══════════════
 *  `MobAi` vuruşu `hitMomentSec` (0,45 sn) sonunda düşürür; `06_ATTACK_PUNCH`
 *  klibinin ÖLÇÜLMÜŞ vuruş anı 0,267 sn'dir. Klip, windup sayacı klibin
 *  vuruş anına indiğinde başlatılır → animasyonun yumruğu gameplay vuruşuyla
 *  AYNI KAREDE temas eder. Gameplay zamanlaması DEĞİŞTİRİLMEZ.
 *
 *  ══════════════ HIT_REACT YOK ══════════════
 *  Manifest `missingClips` altında açıkça "Creature Pack (2) içinde hiçbir
 *  hit/damage reaction animasyonu yok" diyor. Bu katman da UYDURMAZ: hasar
 *  tepkisi state'i BAĞLANMAZ. */
import {
  MUTANT_CLIPS, MUTANT_DEATH_VISUAL_Y_OFFSET_METERS, mutantClip,
  type MutantClipFact, type MutantClipName,
} from '../data/mutant-model.js';
import type { MobPhase } from '../world/MobAi.js';

/* ───────────────────────────── ayarlar (GÖRSEL) ───────────────────────────── */

export const MUTANT_ANIM_TUNING = {
  fadeSec: 0.2,
  minTimeScale: 0.25,
  maxTimeScale: 3.0,
  idleSpeedEps: 0.03,
  /** Bu kadar kesintisiz duruştan sonra nefes klibine geçilir (sn).
   *  `01_IDLE` 14,23 sn'lik tek bir cycle olduğu için eşik onun üstündedir. */
  breatheAfterSec: 15,
  /** AGGRO kükremesi hareket başlayınca kesilir — `MobAi` tepki penceresi
   *  yalnız 0,25 sn olduğu için klip zaten kısa bir hırıltı gibi okunur. */
  roarCutOnMove: true,
} as const;

/* ───────────────────────────── klip eşleme tablosu ───────────────────────────── */

/** P2.28 — MODELE GÖRE KLİP TABLOSU. Goblin'in klip kümesi dardır:
 *  nefes, koşu ve kükreme YOK. Eksik faz için EN YAKIN klip kullanılır;
 *  uydurma klip adı ÜRETİLMEZ.
 *
 *  Model, oynayan klip adlarından anlaşılır — ayrı bir bayrak taşımaya
 *  gerek yok ve `MobRig` model bilmez. */
export function clipMapFor(available: readonly string[]): {
  idle: string; idleLong: string; walk: string; run: string;
  roar: string | null; death: string;
} {
  const goblin = available.includes('02_WALK');
  if (goblin) {
    return {
      idle: '01_IDLE', idleLong: '01_IDLE', walk: '02_WALK',
      run: '02_WALK', roar: null, death: '05_DEATH',
    };
  }
  return {
    idle: '01_IDLE', idleLong: '02_IDLE_BREATHE', walk: '03_WALK',
    run: '04_RUN', roar: '07_ROAR', death: '08_DEATH',
  };
}

/** FAZ → KLİP eşlemesi TEK YERDE. Yeni bir klip gelirse yalnız burası değişir. */
export const MUTANT_CLIP_MAP = {
  idle: '01_IDLE',
  idleLong: '02_IDLE_BREATHE',
  walk: '03_WALK',
  run: '04_RUN',
  roar: '07_ROAR',
  death: '08_DEATH',
  /** Saldırı klibi SABİT DEĞİL: profilin `hitMomentSec` değerine EN YAKIN
   *  ölçülmüş vuruş anına sahip klip seçilir (bkz. `attackClipFor`). */
  attackCandidates: ['06_ATTACK_PUNCH', '05_ATTACK_SWIPE'],
} as const satisfies Record<string, MutantClipName | readonly MutantClipName[]>;

/** Profilin vuruş anına EN YAKIN saldırı klibi.
 *  Uydurulmuş bir seçim değildir: manifestteki ölçülmüş `hitTimeSec` ile
 *  `MobAiProfile.hitMomentSec` arasındaki fark en küçük olan klip kazanır. */
export function attackClipFor(profileHitMomentSec: number): MutantClipFact {
  const candidates = MUTANT_CLIPS.filter((c) => c.hitTimeSec !== null);
  if (candidates.length === 0) throw new Error('[P2.2] saldırı klibi yok');
  let best = candidates[0]!;
  let bestDiff = Infinity;
  for (const c of candidates) {
    const diff = Math.abs((c.hitTimeSec ?? 0) - profileHitMomentSec);
    if (diff < bestDiff) { bestDiff = diff; best = c; }
  }
  return best;
}

/* ───────────────────────────── giriş / çıkış ───────────────────────────── */

export interface MutantAnimInput {
  /** `MobAi`'nin KENDİ fazı — kopyalanmış, salt okunur. */
  phase: MobPhase;
  /** ÖLÇÜLEN görsel hız (m/sn) — renderer konum farkından türetir. */
  speedMetersPerSec: number;
  /** Saldırı çevriminin fazı (`MobAiRuntime.attackPhase`). */
  attackPhase: 'windup' | 'recovery';
  /** Saldırı çevrimi sayacı (sn) — windup'ta 0'a doğru iner. */
  attackTimer: number;
  /** Profilin vuruş anı (sn) — klip seçimi ve hizalama için. */
  hitMomentSec: number;
}

export interface MutantAnimDecision {
  clip: MutantClipName;
  loop: boolean;
  clamp: boolean;
  timeScale: number;
  fadeSec: number;
  restart: boolean;
  /** Ölüm sırasında uygulanan GÖRSEL yukarı öteleme (metre). */
  visualYOffsetMeters: number;
  deathActive: boolean;
}

function clampScale(v: number): number {
  return Math.min(MUTANT_ANIM_TUNING.maxTimeScale,
    Math.max(MUTANT_ANIM_TUNING.minTimeScale, v));
}

/** Lokomosyon fazları — AI'ın KENDİ anlamı klip ailesini belirler. */
const WALK_PHASES: readonly MobPhase[] = ['ROAM', 'RETURN'];
const RUN_PHASES: readonly MobPhase[] = ['CHASE'];

/* ───────────────────────────── durum makinesi ───────────────────────────── */

type OneShot = { clip: MutantClipName; remaining: number; cutOnMove: boolean };

export class MutantAnimator {
  /** P2.28 — MODELE GÖRE klip tablosu. Varsayılan mutanttır; goblin
   *  rig'i için `useClipMap()` ile değiştirilir. `MobRig` model
   *  bilmez, animatör bilir. */
  private map: ReturnType<typeof clipMapFor> = clipMapFor([]);

  useClipMap(availableClips: readonly string[]): void {
    this.map = clipMapFor(availableClips);
  }

  private oneShot: OneShot | null = null;
  private dead = false;
  private idleElapsed = 0;
  private attackArmed = false;
  private lastPhase: MobPhase | null = null;
  private current: MutantClipName = '01_IDLE';
  readonly playCounts = new Map<MutantClipName, number>();

  get currentClip(): MutantClipName { return this.current; }
  get deathActive(): boolean { return this.dead; }
  get pendingOneShot(): MutantClipName | null { return this.oneShot?.clip ?? null; }

  /** Respawn / yeniden kullanım — ölüm sunumu ve artıklar TEMİZLENİR. */
  reset(): void {
    this.oneShot = null;
    this.dead = false;
    this.idleElapsed = 0;
    this.attackArmed = false;
    this.lastPhase = null;
    this.current = '01_IDLE';
  }

  update(dt: number, input: MutantAnimInput): MutantAnimDecision {
    const phase = input.phase;
    const prevPhase = this.lastPhase;
    this.lastPhase = phase;

    /* ── 1. ÖLÜM: her şeyi ezer ── */
    if (phase === 'DYING' || phase === 'DEAD') {
      if (!this.dead) { this.dead = true; this.oneShot = null; this.note((this.map.death as MutantClipName)); }
      this.current = (this.map.death as MutantClipName);
      return {
        clip: (this.map.death as MutantClipName), loop: false, clamp: true, timeScale: 1,
        fadeSec: MUTANT_ANIM_TUNING.fadeSec, restart: false,
        visualYOffsetMeters: MUTANT_DEATH_VISUAL_Y_OFFSET_METERS, deathActive: true,
      };
    }
    /* Respawn: ölüm pozu ve GÖRSEL öteleme TAMAMEN sıfırlanır. */
    if (this.dead) this.reset();

    const speed = Math.max(0, input.speedMetersPerSec);
    const moving = speed > MUTANT_ANIM_TUNING.idleSpeedEps;
    let restart = false;

    /* ── 2. SALDIRI: klip, gameplay vuruşuyla AYNI ANDA temas edecek şekilde
           hizalanır (windup sayacı klibin vuruş anına inince başlar). ── */
    if (phase === 'ATTACK') {
      const clip = attackClipFor(input.hitMomentSec);
      if (input.attackPhase === 'recovery') {
        this.attackArmed = false;
      } else if (!this.attackArmed && input.attackTimer <= (clip.hitTimeSec ?? 0)) {
        this.oneShot = { clip: clip.name, remaining: clip.durationSec, cutOnMove: false };
        this.attackArmed = true;
        restart = true;
        this.note(clip.name);
      }
    } else {
      this.attackArmed = false;
    }

    /* ── 3. AGGRO KÜKREMESİ (yükselen kenar) ── */
    if (phase === 'AGGRO' && prevPhase !== 'AGGRO' && this.oneShot === null) {
      const roar = mutantClip((this.map.roar as MutantClipName));
      this.oneShot = {
        clip: roar.name, remaining: roar.durationSec,
        cutOnMove: MUTANT_ANIM_TUNING.roarCutOnMove,
      };
      restart = true;
      this.note(roar.name);
    }

    /* ── 4. devam eden tek-atışlık klip ── */
    if (this.oneShot !== null) {
      const os = this.oneShot;
      if (!restart) os.remaining -= dt;
      const cut = os.cutOnMove && moving;
      if (os.remaining > 0 && !cut) {
        this.current = os.clip;
        this.idleElapsed = 0;
        return this.decide(os.clip, false, true, 1, restart);
      }
      this.oneShot = null;
    }

    /* ── 5. lokomosyon: AİLE FAZDAN, HIZ ORANI ÖLÇÜMDEN ── */
    if (moving && (WALK_PHASES.includes(phase) || RUN_PHASES.includes(phase))) {
      this.idleElapsed = 0;
      const name = RUN_PHASES.includes(phase) ? (this.map.run as MutantClipName) : (this.map.walk as MutantClipName);
      const clip = mutantClip(name);
      const scale = clampScale(speed / Math.max(0.01, clip.sourceSpeedMetersPerSec));
      if (this.current !== name) this.note(name);
      this.current = name;
      return this.decide(name, true, false, scale, false);
    }

    /* ── 6. duruş ── */
    this.idleElapsed += dt;
    const name = this.idleElapsed >= MUTANT_ANIM_TUNING.breatheAfterSec
      ? (this.map.idleLong as MutantClipName) : (this.map.idle as MutantClipName);
    if (this.current !== name) this.note(name);
    this.current = name;
    return this.decide(name, true, false, 1, false);
  }

  private note(clip: MutantClipName): void {
    this.playCounts.set(clip, (this.playCounts.get(clip) ?? 0) + 1);
  }

  private decide(
    clip: MutantClipName, loop: boolean, clamp: boolean, timeScale: number, restart: boolean,
  ): MutantAnimDecision {
    return {
      clip, loop, clamp, timeScale,
      fadeSec: MUTANT_ANIM_TUNING.fadeSec, restart,
      visualYOffsetMeters: 0, deathActive: false,
    };
  }
}
