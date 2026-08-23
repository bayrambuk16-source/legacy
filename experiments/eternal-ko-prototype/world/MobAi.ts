/** MOB AI STATE MACHINE — P1.6
 *
 *  TEK bir durum makinesi vardır; NORMAL / AGGRESSIVE / ELITE aynı kodu
 *  `MobAiProfile` parametreleriyle çalıştırır (üç ayrı AI YAZILMAZ).
 *
 *  Bu dosya RENDERER'DAN BAĞIMSIZDIR: canvas, sahne, girdi bilmez. Scene
 *  içinde if blokları halinde dağıtılmış AI YOKTUR — Scene yalnız çizer.
 *
 *  DURUMLAR
 *    IDLE    → ev çevresinde bekler
 *    ROAM    → ev çevresinde (roamRadius) rastgele bir noktaya yürür
 *    AGGRO   → hedefi fark etti, kısa tepki gecikmesi (aggroReactionSec)
 *    CHASE   → oyuncuya doğru koşar (chaseSpeed)
 *    ATTACK  → menzilde, saldırı çevrimini işletir
 *    RETURN  → leash aşıldı / hedef kayboldu → EVE döner (bu sırada aggro OLMAZ)
 *    DYING   → ölüm bildirildi, ödül/loot henüz çözülmedi
 *    DEAD    → ceset + respawn sayacı
 *    RESPAWN → sayaç bitti, aynı slotta yeniden doğuş (tek kare)
 *
 *  DYING/DEAD gösterimi MEVCUT sözleşmeyi korur: ölüm `mob.state === 'dying'`
 *  ile başlar, `MobSlotSystem.markDead()` `mob.ai = 'dead'` yapar. Yeni bir
 *  ölüm yolu EKLENMEZ (tek ölüm kapısı `reapDead()` olarak kalır).
 *
 *  BÜTÜN sayılar `data/mob-ai-profiles.ts` içindedir; burada hardcode yoktur.
 *  Monster HP/attack/defense değerleri ANA VERİ katmanından gelir. */
import type { Rng } from '../../../src/engine/rng.js';
import type { MobAiProfile, MobAiType } from '../data/mob-ai-profiles.js';
import { MOB_AI_PROFILES } from '../data/mob-ai-profiles.js';
import type { MobSpawnSlot } from '../data/farm-area.js';
import type { PlayerWorldState, WorldMob } from './types.js';

/** Telemetride görünen mantıksal faz. `WorldMob.ai` ile birebir eşlenir. */
export type MobPhase =
  | 'IDLE' | 'ROAM' | 'AGGRO' | 'CHASE' | 'ATTACK'
  | 'RETURN' | 'DYING' | 'DEAD' | 'RESPAWN';

export interface MobAiRuntime {
  /** Bu runtime'ın ait olduğu ENTITY uid'i. Respawn'da entity yeni bir uid
   *  aldığı için `reindex()` ile güncellenir (bkz. `MobSlotSystem.respawn`). */
  uid: number;
  readonly slotId: string;
  readonly profile: MobAiProfile;
  phase: MobPhase;
  /** Oyuncuya kilitlendi mi? (V1: tek hedef = oyuncu) */
  aggro: boolean;
  /** AGGRO tepki gecikmesi sayacı */
  aggroTimer: number;
  /** IDLE bekleme sayacı */
  idleTimer: number;
  roamX: number;
  roamY: number;
  /** Saldırı çevrimi — `windup` bitince vuruş DÜŞER, sonra `recovery`. */
  attackPhase: 'windup' | 'recovery';
  /** Devreden sayaç (FPS bağımsızlığı için `=` değil `+=` kullanılır). */
  attackTimer: number;
  respawnTimer: number;
  /** Telemetri */
  hits: number;
  transitions: number;
  aggroCause: 'none' | 'proximity' | 'damage';
}

export interface MobAiDeps {
  rng: Rng;
  /** DEV aggro yarıçapı çarpanı. */
  aggroMult: () => number;
  /** Slot ezmeleri için slot tablosu. */
  slotOf: (slotId: string) => MobSpawnSlot | undefined;
  /** Oyuncu hayatta mı? Ölü oyuncu kovalanmaz. */
  playerAlive: () => boolean;
  /** Vuruş anı — hasar UYGULAMA bu callback'te (formül burada DEĞİL). */
  onAttackHit: (mob: WorldMob) => void;
  /** P2.4C — ADIM KAPISI. Oyuncuyla AYNI fonksiyondur (`worldStepAllowed`);
   *  mob için ikinci bir hareket yolu açılmaz. Verilmezse (eski testler)
   *  hareket serbesttir. */
  stepAllowed?: (fx: number, fy: number, tx: number, ty: number) => boolean;
}

/** Profil = slot ezmeleri uygulanmış AI profili. */
export function profileFor(slot: MobSpawnSlot | undefined, aiType: MobAiType): MobAiProfile {
  const base = MOB_AI_PROFILES[aiType];
  if (!slot) return base;
  return {
    ...base,
    respawnSec: slot.respawnSec ?? base.respawnSec,
    roamRadius: slot.roamRadius ?? base.roamRadius,
    aggroRadius: slot.aggroRadius ?? base.aggroRadius,
    leashRadius: slot.leashRadius ?? base.leashRadius,
  };
}

const dist = (ax: number, ay: number, bx: number, by: number): number =>
  Math.hypot(ax - bx, ay - by);

export class MobAiController {
  private runtimes = new Map<number, MobAiRuntime>();
  /** DEV: respawn süresi ezmesi (null → profil/slot değeri). */
  respawnOverrideSec: number | null = null;

  constructor(private deps: MobAiDeps) {}

  runtimeOf(uid: number): MobAiRuntime | undefined { return this.runtimes.get(uid); }
  all(): MobAiRuntime[] { return [...this.runtimes.values()]; }

  /** Mob doğduğunda/yeniden doğduğunda çağrılır. */
  register(mob: WorldMob, aiType: MobAiType): MobAiRuntime {
    const slot = this.deps.slotOf(mob.slotId);
    const profile = profileFor(slot, aiType);
    const rt: MobAiRuntime = {
      uid: mob.uid, slotId: mob.slotId, profile,
      phase: 'IDLE', aggro: false, aggroTimer: 0,
      idleTimer: this.rollIdle(profile),
      roamX: mob.homeX, roamY: mob.homeY,
      attackPhase: 'windup', attackTimer: profile.hitMomentSec,
      respawnTimer: 0, hits: 0, transitions: 0, aggroCause: 'none',
    };
    this.runtimes.set(mob.uid, rt);
    mob.ai = 'idle';
    return rt;
  }

  unregister(uid: number): void { this.runtimes.delete(uid); }

  /** P1.6.1 — respawn'da entity YENİ bir uid alır; runtime aynı kalır ama
   *  anahtarı taşınır. Eski uid ARTIK HİÇBİR ŞEYE çözülmez → havadaki eski
   *  oklar yeni canlıyı bulamaz. */
  reindex(oldUid: number, newUid: number): void {
    const rt = this.runtimes.get(oldUid);
    if (!rt) return;
    this.runtimes.delete(oldUid);
    rt.uid = newUid;
    this.runtimes.set(newUid, rt);
  }

  private rollIdle(p: MobAiProfile): number {
    return p.idleMinSec + this.deps.rng() * (p.idleMaxSec - p.idleMinSec);
  }

  private go(rt: MobAiRuntime, mob: WorldMob, phase: MobPhase): void {
    if (rt.phase === phase) return;
    rt.phase = phase;
    rt.transitions += 1;
    switch (phase) {
      case 'IDLE': mob.ai = 'idle'; mob.state = 'walk'; break;
      case 'ROAM': mob.ai = 'roam'; mob.state = 'walk'; break;
      case 'AGGRO': mob.ai = 'aggro'; mob.state = 'walk'; break;
      case 'CHASE': mob.ai = 'chase'; mob.state = 'walk'; break;
      case 'ATTACK': mob.ai = 'attack'; mob.state = 'attack'; break;
      case 'RETURN': mob.ai = 'return'; mob.state = 'walk'; break;
      case 'DYING': mob.state = 'dying'; break;
      case 'DEAD': mob.ai = 'dead'; mob.state = 'dying'; break;
      case 'RESPAWN': break;
      default: break;
    }
  }

  /** HASAR BİLDİRİMİ — yalnız IMPACT anında çağrılır (cast anında DEĞİL).
   *  IDEMPOTENT: aynı karede 3/5 ok değse bile tek aggro olur, durum sıfırlanmaz.
   *  §17 — RETURN sırasında YENİDEN AGGRO OLMAZ (mob evine döner). Bu V1
   *  kararıdır: dönen moba hasar vurulabilir ama dönüşü bozulmaz. */
  notifyDamaged(mob: WorldMob): void {
    const rt = this.runtimes.get(mob.uid);
    if (!rt) return;
    if (mob.ai === 'dead' || mob.state === 'dying') return;
    if (rt.phase === 'RETURN') return;
    if (rt.aggro) return;                        // idempotent
    rt.aggro = true;
    rt.aggroCause = 'damage';
    rt.aggroTimer = rt.profile.aggroReactionSec;
    this.go(rt, mob, 'AGGRO');
  }

  /** Ölüm bildirimi — `MobSlotSystem.markDead()` çağırır. */
  notifyDead(mob: WorldMob): void {
    const rt = this.runtimes.get(mob.uid);
    if (!rt) return;
    rt.aggro = false;
    rt.aggroCause = 'none';
    rt.phase = 'DEAD';
    rt.transitions += 1;
    const slotSec = this.respawnOverrideSec ?? rt.profile.respawnSec;
    rt.respawnTimer = slotSec;
    mob.respawnTimer = slotSec;
  }

  /** Bir mobun bir karesi. `onRespawn` çağrılırsa mob yeniden konumlandırılır. */
  step(
    dt: number, mob: WorldMob, player: PlayerWorldState,
    onRespawn: (mob: WorldMob, rt: MobAiRuntime) => void,
  ): void {
    const rt = this.runtimes.get(mob.uid);
    if (!rt) return;
    const p = rt.profile;

    /* ---- DEAD / RESPAWN ---- */
    if (mob.ai === 'dead') {
      rt.phase = 'DEAD';
      mob.deathTimer += dt;
      rt.respawnTimer -= dt;
      mob.respawnTimer = rt.respawnTimer;
      if (rt.respawnTimer <= 0) {
        rt.phase = 'RESPAWN';
        rt.transitions += 1;
        onRespawn(mob, rt);
        this.resetRuntime(rt, mob);
        this.go(rt, mob, 'IDLE');
      }
      return;
    }
    /* ---- DYING: ödül/loot çözülene kadar hiçbir şey yapmaz (saldırı YOK) ---- */
    if (mob.state === 'dying') { rt.phase = 'DYING'; return; }

    const dPlayer = dist(mob.worldX, mob.worldY, player.worldX, player.worldY);
    const dHome = dist(mob.worldX, mob.worldY, mob.homeX, mob.homeY);

    /* ---- RETURN: mutlak öncelik, aggro kapıları KAPALI (§17) ---- */
    if (rt.phase === 'RETURN') {
      if (dHome <= p.returnTolerance) {
        /* HP yalnız EVE ULAŞINCA dolar — anında değil. */
        mob.hp = mob.maxHp;
        mob.status = [];
        rt.attackPhase = 'windup';
        rt.attackTimer = p.hitMomentSec;
        rt.idleTimer = this.rollIdle(p);
        this.go(rt, mob, 'IDLE');
      } else {
        this.moveTo(mob, mob.homeX, mob.homeY, p.moveSpeed, dt);
      }
      this.mirror(mob, dt);
      return;
    }

    /* ---- LEASH: ev mesafesi aşıldıysa hedefi bırak ---- */
    if (dHome > p.leashRadius) {
      rt.aggro = false;
      rt.aggroCause = 'none';
      this.go(rt, mob, 'RETURN');
      this.mirror(mob, dt);
      return;
    }

    /* ---- Oyuncu öldüyse aggro düşer ---- */
    if (rt.aggro && !this.deps.playerAlive()) {
      rt.aggro = false;
      rt.aggroCause = 'none';
      this.go(rt, mob, 'RETURN');
      this.mirror(mob, dt);
      return;
    }

    /* ---- PROXIMITY AGGRO: yalnız aggroRadius > 0 olan profiller.
           NORMAL'da aggroRadius 0'dır → oyuncu yanından geçmekle AGGRO OLMAZ. ---- */
    if (!rt.aggro && p.aggroRadius > 0 && this.deps.playerAlive()) {
      if (dPlayer <= p.aggroRadius * this.deps.aggroMult()) {
        rt.aggro = true;
        rt.aggroCause = 'proximity';
        rt.aggroTimer = p.aggroReactionSec;
        this.go(rt, mob, 'AGGRO');
      }
    }

    switch (rt.phase) {
      case 'IDLE': {
        rt.idleTimer -= dt;
        if (rt.idleTimer <= 0) {
          const a = this.deps.rng() * Math.PI * 2;
          const r = p.roamRadius * (0.35 + this.deps.rng() * 0.65);
          rt.roamX = mob.homeX + Math.cos(a) * r;
          rt.roamY = mob.homeY + Math.sin(a) * r;
          this.go(rt, mob, 'ROAM');
        }
        break;
      }
      case 'ROAM': {
        if (dist(mob.worldX, mob.worldY, rt.roamX, rt.roamY) <= p.returnTolerance) {
          rt.idleTimer = this.rollIdle(p);
          this.go(rt, mob, 'IDLE');
        } else {
          this.moveTo(mob, rt.roamX, rt.roamY, p.moveSpeed, dt);
        }
        break;
      }
      case 'AGGRO': {
        rt.aggroTimer -= dt;
        if (rt.aggroTimer <= 0) this.go(rt, mob, 'CHASE');
        break;
      }
      case 'CHASE': {
        if (dPlayer <= p.enterAttack) { this.go(rt, mob, 'ATTACK'); break; }
        this.moveTo(mob, player.worldX, player.worldY, p.chaseSpeed, dt);
        break;
      }
      case 'ATTACK': {
        if (dPlayer > p.leaveAttack) { this.go(rt, mob, 'CHASE'); break; }
        mob.facing = player.worldX >= mob.worldX ? 1 : -1;
        this.runAttackCycle(dt, rt, mob, dPlayer);
        break;
      }
      default: break;
    }
    this.mirror(mob, dt);
  }

  /** SALDIRI ÇEVRİMİ — FPS BAĞIMSIZ.
   *  Sayaç `=` ile SIFIRLANMAZ, `+=` ile DEVREDER; 30/60/120 fps aynı sayıda
   *  vuruş üretir. Vuruş `windup` bitiminde, YALNIZ authoritative menzil
   *  (`attackRange`) içindeyken düşer. */
  private runAttackCycle(dt: number, rt: MobAiRuntime, mob: WorldMob, dPlayer: number): void {
    const p = rt.profile;
    rt.attackTimer -= dt;
    let guard = 0;
    while (rt.attackTimer <= 0 && guard++ < 64) {
      if (rt.attackPhase === 'windup') {
        if (dPlayer <= p.attackRange && this.deps.playerAlive()) {
          rt.hits += 1;
          this.deps.onAttackHit(mob);
        }
        rt.attackPhase = 'recovery';
        rt.attackTimer += Math.max(0.01, p.attackIntervalSec - p.hitMomentSec);
      } else {
        rt.attackPhase = 'windup';
        rt.attackTimer += p.hitMomentSec;
      }
    }
    mob.attackTimer = rt.attackTimer;
  }

  /** Hedefe doğru bir adım. P2.4C — adım ADIM KAPISINDAN geçer; eksenler ayrı
   *  denenir ki mob duvara dayandığında kilitlenmek yerine kayabilsin.
   *  Yön (`facing`) adım reddedilse bile güncellenir: mob hedefine bakmaya
   *  devam eder, yalnız ilerleyemez. */
  private moveTo(mob: WorldMob, tx: number, ty: number, speed: number, dt: number): void {
    const dx = tx - mob.worldX, dy = ty - mob.worldY;
    const d = Math.hypot(dx, dy);
    if (d < 1e-4) return;
    const step = Math.min(d, speed * dt);
    const nx = mob.worldX + (dx / d) * step;
    const ny = mob.worldY + (dy / d) * step;
    const gate = this.deps.stepAllowed;
    if (!gate || gate(mob.worldX, mob.worldY, nx, mob.worldY)) mob.worldX = nx;
    if (!gate || gate(mob.worldX, mob.worldY, mob.worldX, ny)) mob.worldY = ny;
    mob.facing = dx >= 0 ? 1 : -1;
  }

  private mirror(mob: WorldMob, dt: number): void {
    mob.animT += dt * (mob.state === 'walk' ? 1.4 : 1);
    mob.x = mob.worldX; mob.y = mob.worldY;   // EnemyUnit aynası
  }

  private resetRuntime(rt: MobAiRuntime, mob: WorldMob): void {
    rt.aggro = false;
    rt.aggroCause = 'none';
    rt.aggroTimer = 0;
    rt.idleTimer = this.rollIdle(rt.profile);
    rt.roamX = mob.homeX; rt.roamY = mob.homeY;
    /* Respawn olan mob menzile girer girmez "bekleyen" vuruş YAPMAZ. */
    rt.attackPhase = 'windup';
    rt.attackTimer = rt.profile.hitMomentSec;
    rt.respawnTimer = 0;
    mob.attackTimer = 0;
  }
}
