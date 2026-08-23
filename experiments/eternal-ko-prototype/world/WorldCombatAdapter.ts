/** World combat ADAPTÖRÜ — combat formülleri İKİNCİ KEZ YAZILMAZ.
 *  Ana oyunun CombatSystem / SkillSystem / CharacterStats / LootSystem sistemleri
 *  aynen kullanılır; bu katman world-space menzil kapısını, ölüm/loot olaylarını
 *  ve (P1.4'ten beri) İKİ FAZLI cast → release → impact zamanlamasını ekler.
 *
 *  ══════════════════ P1.4 — CAST ≠ IMPACT ══════════════════
 *
 *  `SkillSystem.useByRef()` ATOMİKTİR: kapı kontrolleri + mana + individual
 *  cooldown + effect çözümü tek çağrıda olur ve `src/` DEĞİŞTİRİLMEYECEK.
 *  Effect'leri geciktirmek için formülleri kopyalamak §5'e aykırı olurdu.
 *
 *  ÇÖZÜM — PAYLOAD SNAPSHOT:
 *  Cast anında `useByRef` GERÇEK hedefe değil, hedefin bir SNAPSHOT stand-in'ine
 *  (`payloadProxy`) uygulanır. Proxy:
 *    · aynı `monster` referansını taşır  → `effectiveDefense()` DOĞRU çalışır,
 *    · hedefin status listesinin KOPYASINI taşır → savunma debuff'ları okunur,
 *      ama yeni DoT kayıtları GERÇEK hedefe DÜŞMEZ,
 *    · `hp = Infinity` → cast anında ÖLÜM/kill kararı verilmez.
 *  Böylece mana, cooldown, seviye/silah şartı, damage roll, elemental katsayı ve
 *  DoT üretimi ANA SİSTEMDEN gelir; yalnız SONUCUN UYGULANMASI impact anına taşınır.
 *
 *  V1 DAVRANIŞI (belgede açık):
 *  · Tek-oklu skillerde hasar CAST anında rollenir, IMPACT anında uygulanır.
 *  · Çok-oklu skillerde geometri + ok başına hasar RELEASE anında kilitlenir
 *    (§10). Ok uçarken mob kıpırdarsa ışın YENİDEN hesaplanmaz.
 *  · Aradaki ~0.2 sn'de hedefin savunması değişirse rollenmiş sayı eskidir.
 *    Sürekli fizik-tabanlı collision bu görevin kapsamı DEĞİLDİR. */
import { SkillRegistry } from '../../../src/game/systems/SkillRegistry.js';
import type { CombatSystem } from '../../../src/game/systems/CombatSystem.js';
import type { PlayerState } from '../../../src/game/systems/PlayerState.js';
import type { EnemyUnit } from '../../../src/game/systems/SpawnSystem.js';
import type { SkillUseResult, SkillFailReason } from '../../../src/game/systems/SkillSystem.js';
import type { CombatRangeProfile } from './CombatRangeProfile.js';
import type { ActionLock } from './ActionLock.js';
import type { ArcherCombatTimingProfile } from '../data/archer-timing.js';
import type { PlayerWorldState, WorldMob } from './types.js';
import {
  MULTISHOT_PROFILES, resolveMultiShot,
  type CollisionMode, type MultiShotResolution,
} from './MultiShot.js';
import {
  CombatPipeline,
  type EffectPayload, type ImpactInvalidReason, type PendingCast, type Projectile,
} from './CombatPipeline.js';
import { elementOf } from '../data/archer-balance.js';
import type { ArcherElement } from '../data/archer-balance.js';
import { killExp } from '../data/exp-level-gap.js';

export type WorldAttackFail = 'noTarget' | 'range' | 'notReady' | 'noWeapon' | 'dead';
export type WorldAttackResult =
  | { ok: true; damage: number; killed: boolean }
  | { ok: false; reason: WorldAttackFail };

/** 'busy' = ACTION LOCK: karakter hâlâ önceki saldırının action süresinde.
 *  Bu bir cooldown DEĞİLDİR ve skill ikonunda cooldown olarak gösterilmez. */
export type WorldSkillFail = SkillFailReason | 'range' | 'busy';

/** §8/§9 — hasar BİLEŞENLERİ. P1.4'te bunlar CAST anında rollenmiş ama HENÜZ
 *  UYGULANMAMIŞ değerlerdir; `applied` bayrağı bunu açıkça söyler. */
export interface DamageBreakdown {
  element: ArcherElement;
  physicalDamage: number;
  elementalDamage: number;
  totalDamage: number;
  dotPerTickDamage: number;
  dotTickCount: number;
  dotExpectedTotal: number;
  /** P1.4: cast anında DAİMA false — hasar impact'te uygulanır. */
  applied: boolean;
}

/** Cast KABUL edildi. Hasar henüz uygulanmadı. */
export interface AcceptedCast {
  castId: number;
  skillRef: number;
  targetUid: number | null;
  acceptedAt: number;
  releaseAt: number;
  projectileCount: number;
  isMultiShot: boolean;
}

export type WorldSkillResult =
  | { ok: true; skillRef: number; accepted: AcceptedCast; breakdown: DamageBreakdown }
  | { ok: false; reason: WorldSkillFail };

/** Bir okun hedefe varış olayı — hasar BURADA uygulanmıştır. */
export interface ImpactEvent {
  projectileId: number;
  castId: number;
  skillRef: number;
  arrowIndex: number;
  targetUid: number | null;
  target: WorldMob | null;
  worldX: number; worldY: number;
  physicalDamage: number;
  /** Skill'in kendi elemental bileşeni (ör. Alev Oku). */
  elementalDamage: number;
  /** P1.8 §21 — KUŞANILI SİLAHIN elemental bileşeni. Fiziksel hasardan ve
   *  skill elementalinden AYRI tutulur; asla tek alana ezilmez. */
  weaponElementalDamage: number;
  /** Silah elementalinin türlere göre dağılımı (telemetri). */
  weaponElemental: { fire: number; ice: number; lightning: number; poison: number };
  damage: number;
  statusesApplied: number;
  killed: boolean;
  /** null = geçerli isabet. Aksi halde neden hasar uygulanmadığı. */
  invalid: ImpactInvalidReason;
  releasedAt: number;
  impactAt: number;
  travelDistance: number;
  speed: number;
  fxColor: string;
}

/** Bir cast'in release sonucu (telemetri + görsel). */
export interface ReleaseEvent {
  castId: number;
  skillRef: number;
  releasedAt: number;
  projectiles: Projectile[];
  resolution: MultiShotResolution | null;
  /** SEÇİLİ HEDEFE isabet edecek ok sayısı (release'te kilitlendi). */
  targetHitCount: number;
  totalProjectileCount: number;
  sideHitCount: number;
}

/** Ölüm olayı — YALNIZ deneyim. Drop/coin `DropSystem` sorumluluğundadır. */
export interface KillEvent { mob: WorldMob; exp: number }

/** Cast anında effect'leri emen SNAPSHOT hedef.
 *  GERÇEK moba dokunmaz; yalnız savunma/status okunur. */
function payloadProxy(mob: WorldMob): EnemyUnit {
  return {
    uid: mob.uid,
    monster: mob.monster,
    x: mob.x, y: mob.y,
    hp: Number.POSITIVE_INFINITY,      // cast anında ölüm kararı YOK
    maxHp: mob.maxHp,
    attackTimer: 0,
    state: 'walk',
    deathTimer: 0,
    status: [...(mob.status ?? [])],   // debuff OKUNUR, yeni kayıt buraya düşer
  };
}

export class WorldCombatAdapter {
  /** DEV panelinden gelen çarpışma modeli ezmesi. null = profil değeri kullanılır. */
  collisionModeOverride: CollisionMode | null = null;
  readonly pipeline = new CombatPipeline();
  /** castId → o cast'ten HÂLÂ HAVADA olan ok sayısı.
   *  P1.6.1: eskiden buraya yalnız YAZILIYORDU ve hiç silinmiyordu → uzun
   *  farm oturumlarında sınırsız büyüyordu. Artık her impact'te azaltılır ve
   *  cast'in son oku çözülünce kayıt SİLİNİR. */
  private castProjectiles = new Map<number, number>();

  /** Açık (henüz bütün okları çözülmemiş) cast sayısı — soak/telemetri. */
  get openCastCount(): number { return this.castProjectiles.size; }
  /** Bir cast'ten havada kalan ok sayısı (telemetri). */
  inFlightForCast(castId: number): number { return this.castProjectiles.get(castId) ?? 0; }

  /** Bir okun çözüldüğünü (impact ya da geçersiz) bookkeeping'e bildirir. */
  private noteProjectileResolved(castId: number): void {
    const left = (this.castProjectiles.get(castId) ?? 0) - 1;
    if (left > 0) this.castProjectiles.set(castId, left);
    else this.castProjectiles.delete(castId);
  }

  /** P1.7 — `LootSystem` bağımlılığı KALDIRILDI: drop artık bu katmanın işi
   *  değil, `world/DropSystem.ts` authority'sinindir. */
  /** P1.8 — kuşanılı silahın elemental bileşeni. Bağlanmazsa 0 döner ve
   *  davranış P1.7 ile BİREBİR aynı kalır. */
  weaponElementalProvider: () => { fire: number; ice: number; lightning: number; poison: number } =
    () => ({ fire: 0, ice: 0, lightning: 0, poison: 0 });

  constructor(
    private combat: CombatSystem,
    private player: PlayerState,
    private ranges: CombatRangeProfile,
    private action?: ActionLock,
    private timing?: ArcherCombatTimingProfile,
  ) {}

  get actionBusy(): boolean { return this.action?.busy ?? false; }
  get actionRatio(): number { return this.action?.ratio ?? 0; }
  get actionRemaining(): number { return this.action?.remainingSec ?? 0; }
  actionTimeOf(sourceRef: number): number { return this.timing?.actionTime(sourceRef) ?? 0; }
  updateAction(dt: number): void { this.action?.update(dt); }

  distance(p: PlayerWorldState, mob: WorldMob): number {
    return Math.hypot(mob.worldX - p.worldX, mob.worldY - p.worldY);
  }

  inBasicRange(p: PlayerWorldState, mob: WorldMob): boolean {
    return this.distance(p, mob) <= this.ranges.basicAttack;
  }

  /** LEGACY temel saldırı yolu — ARCHER COMBAT V1'den beri KULLANILMIYOR
   *  (Standart Atış artık bir SkillDefinition'dır). Geriye dönük testler için durur
   *  ve ANINDA hasar uygular; prototip combat yolu buradan GEÇMEZ. */
  basicAttack(p: PlayerWorldState, mob: WorldMob | null): WorldAttackResult {
    if (!this.player.alive) return { ok: false, reason: 'dead' };
    if (!mob || mob.ai === 'dead') return { ok: false, reason: 'noTarget' };
    if (!this.inBasicRange(p, mob)) return { ok: false, reason: 'range' };
    const out = this.combat.basicAttack(mob);
    if (!out) return { ok: false, reason: this.combat.basicReady ? 'noWeapon' : 'notReady' };
    return { ok: true, damage: out.damage, killed: out.killed };
  }

  useSkillSlot(slotIndex: number, p: PlayerWorldState, mob: WorldMob | null): WorldSkillResult {
    const view = this.combat.skills.slots()[slotIndex];
    if (!view?.def) return { ok: false, reason: 'emptySlot' };
    return this.useSkillRef(view.def.sourceRef, p, mob);
  }

  /* ------------------------------------------------------ FAZ 1: CAST --- */

  /** Skill KABULÜ. Hasar UYGULAMAZ — yalnız mana/cooldown/ActionLock commit eder
   *  ve okun release kuyruğuna girmesini sağlar.
   *  Reddedilirse HİÇBİR mutasyon olmaz (mana, cooldown, action lock, projectile). */
  useSkillRef(sourceRef: number, p: PlayerWorldState, mob: WorldMob | null, allMobs?: WorldMob[]): WorldSkillResult {
    const def = SkillRegistry.get(sourceRef);
    if (!def) return { ok: false, reason: 'unknown' };
    /* ACTION LOCK — mana/cooldown HARCANMADAN önce. */
    if (this.action?.busy) return { ok: false, reason: 'busy' };

    const profile = MULTISHOT_PROFILES[sourceRef];
    if (def.targeting === 'enemy') {
      if (!mob || mob.ai === 'dead' || mob.state === 'dying') return { ok: false, reason: 'noTarget' };
      const range = profile ? profile.rangeWorld : this.ranges.skillRange(def.sourceRef, def.targeting);
      /* MENZİL: otomatik yürüme YOK — reddedilir, oyuncu joystick ile yaklaşır. */
      if (this.distance(p, mob) > range) return { ok: false, reason: 'range' };
    }
    /* Seviye / silah / mana / cooldown — ANA sistemin kapısı, mutasyonsuz. */
    const blocked = this.combat.skills.canUse(def, mob);
    if (blocked) return { ok: false, reason: blocked };

    /* COMMIT — mana + individual cooldown ana sistemde; effect'ler SNAPSHOT'a. */
    const proxy = mob ? payloadProxy(mob) : null;
    const before = proxy?.status?.length ?? 0;
    const res = this.combat.skills.useByRef(sourceRef, proxy);
    if (!res.ok) return { ok: false, reason: res.fail ?? 'unknown' };

    const effects = profile ? null : buildEffectPayload(sourceRef, res, proxy, before);

    /* Saldırı başladı → action recovery (cooldown'dan BAĞIMSIZ, impact BEKLEMEZ). */
    this.action?.begin(this.timing?.actionTime(sourceRef) ?? 0, sourceRef);

    const pending = this.pipeline.accept({
      skillRef: sourceRef,
      targetUid: mob?.uid ?? null,
      aimX: mob?.worldX ?? p.worldX, aimY: mob?.worldY ?? p.worldY,
      originX: p.worldX, originY: p.worldY,
      effects,
      isMultiShot: profile !== undefined,
    });
    void allMobs;   // release anında GÜNCEL liste kullanılır

    return {
      ok: true, skillRef: sourceRef,
      accepted: {
        castId: pending.id, skillRef: sourceRef, targetUid: pending.targetUid,
        acceptedAt: pending.acceptedAt, releaseAt: pending.releaseAt,
        projectileCount: profile ? profile.projectiles : 1,
        isMultiShot: profile !== undefined,
      },
      breakdown: castBreakdown(sourceRef, effects, proxy, before),
    };
  }

  /* --------------------------------------- FAZ 2+3: RELEASE ve IMPACT --- */

  /** Her karede bir kez. Release'leri çözer, okları uçurur, impact'leri UYGULAR.
   *  Manuel oyuncu ve Genie AYNI bu yoldan geçer (§14). */
  updatePipeline(dt: number, p: PlayerWorldState, mobs: WorldMob[]): {
    releases: ReleaseEvent[]; impacts: ImpactEvent[];
  } {
    const { released, impacts } = this.pipeline.advance(dt);
    const releases = released.map((c) => this.resolveRelease(c, p, mobs));
    return { releases, impacts: impacts.map((proj) => this.applyImpact(proj, mobs)) };
  }

  /** RELEASE — ok(lar) yaydan çıkar. Çok-okta geometri ve ok başına hasar
   *  BURADA kilitlenir (§10). Hasar hâlâ UYGULANMAZ. */
  private resolveRelease(cast: PendingCast, p: PlayerWorldState, mobs: WorldMob[]): ReleaseEvent {
    const profile = MULTISHOT_PROFILES[cast.skillRef];
    /* Origin: okun çıkış noktası. Şimdilik oyuncunun GÜNCEL world konumu;
       ileride 3D BowSocket / ProjectileSpawn buraya bağlanır. Canvas sprite
       anchor'ı ile gameplay bağı YOKTUR. */
    const ox = p.worldX, oy = p.worldY;
    /* §21 — silah elementali RELEASE anında KİLİTLENİR (çok-ok geometrisiyle
       aynı an). Ok uçarken silah değişse bile bu atış eski silahındır. */
    const wel = this.weaponElementalProvider();
    const target = cast.targetUid === null ? null
      : mobs.find((m) => m.uid === cast.targetUid && m.ai !== 'dead' && m.state !== 'dying') ?? null;
    const aimX = target?.worldX ?? cast.aimX, aimY = target?.worldY ?? cast.aimY;
    const projectiles: Projectile[] = [];

    if (profile) {
      const resolution = resolveMultiShot(ox, oy, aimX, aimY, profile, mobs, {
        target, collisionMode: this.collisionModeOverride ?? undefined,
      });
      for (const ray of resolution.rays) {
        const victim = ray.hit;
        /* Ok başına hasar ANA damageRoll'dan — burada formül YOK. */
        const damage = victim
          ? this.combat.damageRoll(
            this.combat.playerAttack(), this.combat.effectiveDefense(victim), profile.coefficientPerArrow,
          )
          : 0;
        projectiles.push(this.pipeline.spawn({
          castId: cast.id,
          skillRef: cast.skillRef, arrowIndex: ray.index,
          originX: ox, originY: oy, dirX: ray.dx, dirY: ray.dy,
          speed: this.pipeline.timing.projectileSpeed,
          travelDistance: ray.travel,
          targetUid: victim?.uid ?? null,
          targetGeneration: victim?.generation ?? null,
          arrowDamage: damage, effects: null,
          weaponElemental: { ...wel },
        }));
      }
      if (projectiles.length > 0) this.castProjectiles.set(cast.id, projectiles.length);
      return {
        castId: cast.id, skillRef: cast.skillRef, releasedAt: this.pipeline.time,
        projectiles, resolution,
        targetHitCount: resolution.targetHitCount,
        totalProjectileCount: resolution.totalProjectileCount,
        sideHitCount: resolution.sideHitCount,
      };
    }

    /* Tek ok: hedef geçerliyse ona, değilse son nişan noktasına doğru uçar. */
    const dx = aimX - ox, dy = aimY - oy;
    const d = Math.hypot(dx, dy) || 1;
    projectiles.push(this.pipeline.spawn({
      castId: cast.id,
      skillRef: cast.skillRef, arrowIndex: 0,
      originX: ox, originY: oy, dirX: dx / d, dirY: dy / d,
      speed: this.pipeline.timing.projectileSpeed,
      travelDistance: d,
      targetUid: target?.uid ?? null,
      targetGeneration: target?.generation ?? null,
      arrowDamage: 0, effects: cast.effects,
      weaponElemental: { ...wel },
    }));
    this.castProjectiles.set(cast.id, 1);
    return {
      castId: cast.id, skillRef: cast.skillRef, releasedAt: this.pipeline.time,
      projectiles, resolution: null,
      targetHitCount: target ? 1 : 0, totalProjectileCount: 1, sideHitCount: 0,
    };
  }

  /** IMPACT — hasar, DoT ve ölüm kararı BURADA olur. */
  private applyImpact(proj: Projectile, mobs: WorldMob[]): ImpactEvent {
    const pos = CombatPipeline.position(proj);
    const base: ImpactEvent = {
      projectileId: proj.id, castId: proj.castId, skillRef: proj.skillRef, arrowIndex: proj.arrowIndex,
      targetUid: proj.targetUid, target: null,
      worldX: pos.x, worldY: pos.y,
      physicalDamage: 0, elementalDamage: 0,
      weaponElementalDamage: 0, weaponElemental: { fire: 0, ice: 0, lightning: 0, poison: 0 },
      damage: 0,
      statusesApplied: 0, killed: false, invalid: null,
      releasedAt: proj.releasedAt, impactAt: proj.impactAt,
      travelDistance: proj.travelDistance, speed: proj.speed,
      fxColor: '#e08a3c',
    };
    this.noteProjectileResolved(proj.castId);
    if (proj.targetUid === null) return { ...base, invalid: 'miss' };
    const mob = mobs.find((m) => m.uid === proj.targetUid) ?? null;
    if (!mob) return { ...base, invalid: 'targetGone' };
    /* ═══ P1.6.1 — ENTITY KİMLİK KAPISI ═══
       Ok havadayken hedef ölüp AYNI SLOTTA yeniden doğmuş olabilir. Respawn
       entity'ye yeni bir uid verir (yukarıdaki `find` zaten boş döner), ama
       nesil kapısı ikinci bir savunma hattıdır: uid bir şekilde yeniden
       kullanılırsa bile release anındaki nesille uyuşmayan canlı VURULMAZ.
       Yeni doğan mob: hasar almaz · DoT almaz · aggro olmaz · kill üretmez. */
    if (proj.targetGeneration !== null && mob.generation !== proj.targetGeneration) {
      return { ...base, target: null, invalid: 'targetReplaced' };
    }
    /* §12 — ok havadayken hedef başka hasarla öldüyse: İKİNCİ kill/loot/HP YOK. */
    if (mob.ai === 'dead' || mob.state === 'dying') {
      return { ...base, target: mob, invalid: 'targetDead' };
    }

    let physical = 0, elemental = 0, statuses = 0, color = base.fxColor;
    if (proj.effects) {
      /* Tek-ok: cast'te rollenmiş payload UYGULANIR. */
      const el = elementOf(proj.skillRef);
      for (const o of proj.effects.outcomes) {
        if (o.damage <= 0) continue;
        mob.hp -= o.damage;
        if (o.index === 0) physical += o.damage;
        else if (el === 'fire') elemental += o.damage;
        else physical += o.damage;
        if (o.index === 0) color = o.fxColor;
      }
      /* §11 — DoT hedefe TAM BU ANDA eklenir (cast anında değil). */
      for (const st of proj.effects.statuses) {
        if (!mob.status) mob.status = [];
        mob.status.push(st);
        statuses++;
      }
    } else {
      /* Çok-ok: release'te rollenmiş ok hasarı. */
      mob.hp -= proj.arrowDamage;
      physical = proj.arrowDamage;
    }

    /* ═══ P1.8 §21 — SİLAH ELEMENTALİ (PROJECT LEGACY V1 TUNING) ═══
       Kaynakta silah elementalinin combat entegrasyonu DOĞRULANAMADI
       (`fire_damage` vb. kolonlar var, ama ana oyunun hasar yolunda hiçbir
       tüketicisi yok). Bu yüzden minimum bir adaptör yazıldı: elemental,
       fiziksel hasardan AYRI bir bileşen olarak eklenir.
       ══ POISON BİR DoT DEĞİLDİR (§4) ══ Burada status ÜRETİLMEZ, tik
       kurulmaz. Zehir skilinin DoT'u `SkillSystem` tarafındadır. */
    const we = proj.weaponElemental;
    const weaponElementalDamage = Math.max(0,
      Math.round(we.fire + we.ice + we.lightning + we.poison));
    if (weaponElementalDamage > 0) mob.hp -= weaponElementalDamage;

    const damage = physical + elemental + weaponElementalDamage;
    let killed = false;
    if (mob.hp <= 0) { mob.state = 'dying'; killed = true; }
    return {
      ...base, target: mob,
      physicalDamage: physical, elementalDamage: elemental,
      weaponElementalDamage, weaponElemental: { ...we },
      damage,
      statusesApplied: statuses, killed, fxColor: color,
    };
  }

  /** Bu skill çok-oklu mu? (UI/Genie bilgisi) */
  isMultiShot(sourceRef: number): boolean { return MULTISHOT_PROFILES[sourceRef] !== undefined; }

  /** Ölüm sonrası EXP. Mob başına YALNIZ BİR KEZ çağrılır
   *  (`PrototypeState.reapDead()` bunu garanti eder).
   *
   *  P1.7 — DROP ARTIK BURADA DEĞİL. Eskiden bu metot loot'u da yuvarlıyor ve
   *  coin'i doğrudan cüzdana yazıyordu; teslimat kararı (Auto Loot / yere düşme
   *  / envanter dolu) yoktu. Artık drop ve coin tek authority olan
   *  `world/DropSystem.ts` içindedir. Burada YALNIZ deneyim kalır. */
  resolveKill(mob: WorldMob): KillEvent {
    /* P2.14 — EXP artık iki filtreden geçer: seviye farkı cezası
       (`data/exp-level-gap.ts`) ve denge çarpanı. Kaynak değer
       `mob.monster.exp` olduğu gibi durur; kırpma burada yapılmaz,
       saf katmanda yapılır. */
    const exp = killExp(
      mob.monster.exp, this.player.level, mob.monster.level, this.combat.balance.exp,
    );
    this.player.addExp(exp);
    return { mob, exp };
  }
}

/* ------------------------------------------------------------- yardımcı */

function buildEffectPayload(
  sourceRef: number, res: SkillUseResult, proxy: EnemyUnit | null, statusBefore: number,
): EffectPayload {
  const el = elementOf(sourceRef);
  const outcomes = (res.outcomes ?? []).map((o, index) => ({
    index, damage: o.damage ?? 0, fxColor: o.fxColor ?? '#e08a3c',
  }));
  const physicalDamage = outcomes[0]?.damage ?? 0;
  const elementalDamage = el === 'fire' ? (outcomes[1]?.damage ?? 0) : 0;
  return {
    outcomes,
    statuses: (proxy?.status ?? []).slice(statusBefore),
    physicalDamage, elementalDamage,
    totalDamage: physicalDamage + elementalDamage,
  };
}

/** Cast anındaki bileşen raporu. `applied: false` — hasar HENÜZ verilmedi. */
function castBreakdown(
  sourceRef: number, effects: EffectPayload | null, proxy: EnemyUnit | null, statusBefore: number,
): DamageBreakdown {
  const element = elementOf(sourceRef);
  const dots = (proxy?.status ?? []).slice(statusBefore).filter((s) => s.kind === 'dot');
  const dotPerTickDamage = dots.length > 0 ? dots[dots.length - 1]!.damagePerTick ?? 0 : 0;
  const dotTickCount = dots.length > 0
    ? Math.max(1, Math.round((dots[dots.length - 1]!.timeLeft) / (dots[dots.length - 1]!.tickSec ?? 1)))
    : 0;
  return {
    element,
    physicalDamage: effects?.physicalDamage ?? 0,
    elementalDamage: effects?.elementalDamage ?? 0,
    totalDamage: effects?.totalDamage ?? 0,
    dotPerTickDamage, dotTickCount,
    dotExpectedTotal: dotPerTickDamage * dotTickCount,
    applied: false,
  };
}
