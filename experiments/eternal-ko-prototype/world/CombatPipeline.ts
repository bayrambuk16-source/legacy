/** İKİ FAZLI COMBAT — CAST ≠ IMPACT (P1.4)
 *
 *  ══ PROBLEM ══
 *  P1.3'e kadar hasar SKILL'E BASILDIĞI AN uygulanıyordu; uçan ok yalnız
 *  görseldi. Bu yüzden mesafe ne olursa olsun "skill bir anda vuruyor"
 *  hissi vardı.
 *
 *  ══ YENİ AKIŞ ══
 *      t = 0.00   cast ACCEPTED   → mana + individual cooldown + ActionLock
 *                                   + animasyon  (hedefin HP'si DEĞİŞMEZ)
 *      t = 0.20   RELEASE         → çok-ok geometrisi çözülür, oklar doğar
 *      t ≈ 0.53   IMPACT          → hasar / DoT / kill / loot BURADA olur
 *
 *  ══ BU KATMAN NE YAPMAZ ══
 *  Mana, cooldown, seviye/silah şartı, damage roll, elemental katsayı, DoT —
 *  hiçbiri burada YENİDEN YAZILMAZ. Hepsi ana `SkillSystem` / `CombatSystem`
 *  yolundan gelir; bu katman yalnız ZAMANLAMA ve TAŞIMA yapar.
 *  (Payload'ı kimin ürettiği için bkz. `WorldCombatAdapter`.)
 *
 *  ══ KOORDİNAT ══
 *  Her şey WORLD birimindedir. Canvas/ekran koordinatı bu katmana GİRMEZ —
 *  ileride Three.js/3D renderer aynı pipeline'ı kullanabilsin diye. */

import type { ActiveStatus } from '../../../src/game/systems/skills/types.js';
import type { ElementalDamage } from '../data/item-model.js';

/* ------------------------------------------------------------- tuning V1 */

/** PROJECT LEGACY TUNING — kaynaktan GELMEZ, playtest ile ayarlanır. */
export const COMBAT_TIMING_V1 = {
  /** Cast kabulü ile okun yaydan çıkışı arası (sn).
   *  Bu bir individual cooldown DEĞİL, Action Time DEĞİL — ayrı bir alandır.
   *  Gerçek sprite `releaseFrame` veya 3D animation event (BowSocket) geldiğinde
   *  bu sabitin yerine o event bağlanacak: `releaseDelayFor()` tek giriş noktası. */
  releaseDelaySec: 0.20,
  /** Okun world hızı (birim/sn). */
  projectileSpeed: 900,
} as const;

export const PROJECTILE_SPEED_OPTIONS = [700, 900, 1200, 1500] as const;
/** Saldırı sırasında hareket çarpanı (DEV A/B/C). */
export const ATTACK_MOVE_OPTIONS = [0, 0.60, 1.00] as const;
export const ATTACK_MOVE_DEFAULT = 0.60;

export class CombatTimingProfileV1 {
  releaseDelaySec: number = COMBAT_TIMING_V1.releaseDelaySec;
  projectileSpeed: number = COMBAT_TIMING_V1.projectileSpeed;
  /** ActionLock aktifken hareket hızı çarpanı (0 / 0.60 / 1.00). */
  attackMoveMult: number = ATTACK_MOVE_DEFAULT;

  /** Release gecikmesi — şimdilik bütün Archer skillerinde aynı.
   *  Skill başına farklılaşması gerektiğinde TEK değişecek yer burasıdır. */
  releaseDelayFor(_sourceRef: number): number { return this.releaseDelaySec; }

  cycleProjectileSpeed(): number {
    const i = PROJECTILE_SPEED_OPTIONS.indexOf(this.projectileSpeed as 700);
    this.projectileSpeed = PROJECTILE_SPEED_OPTIONS[(i + 1) % PROJECTILE_SPEED_OPTIONS.length]!;
    return this.projectileSpeed;
  }
  cycleAttackMove(): number {
    const i = ATTACK_MOVE_OPTIONS.indexOf(this.attackMoveMult as 0);
    this.attackMoveMult = ATTACK_MOVE_OPTIONS[(i + 1) % ATTACK_MOVE_OPTIONS.length]!;
    return this.attackMoveMult;
  }
  reset(): void {
    this.releaseDelaySec = COMBAT_TIMING_V1.releaseDelaySec;
    this.projectileSpeed = COMBAT_TIMING_V1.projectileSpeed;
    this.attackMoveMult = ATTACK_MOVE_DEFAULT;
  }
}

/* ---------------------------------------------------------------- payload */

/** Tek-oklu skillin TAŞINAN etkisi.
 *  `SkillSystem.useByRef()` atomiktir (kapı + mana + cooldown + effect); bu
 *  yüzden effect'ler cast anında bir SNAPSHOT hedefe çözülür ve sonuç burada
 *  taşınır. Uygulama IMPACT anında yapılır. Bkz. `WorldCombatAdapter`. */
export interface EffectPayload {
  /** Efekt sırası `archer-skills.ts` ile aynı: [0] fiziksel, [1] elemental. */
  outcomes: Array<{ index: number; damage: number; fxColor: string }>;
  /** Cast anında üretilen ama HENÜZ UYGULANMAMIŞ DoT/debuff kayıtları. */
  statuses: ActiveStatus[];
  physicalDamage: number;
  elementalDamage: number;
  totalDamage: number;
}

/** IMPACT neden geçersiz sayıldı?
 *  · `miss`            — ok zaten kimseyi hedeflemiyordu (ıska)
 *  · `targetGone`      — hedef entity artık listede yok (öldü + kaldırıldı,
 *                        ya da respawn ile YENİ bir entity kimliği aldı)
 *  · `targetDead`      — hedef bu ok havadayken başka bir yolla öldü
 *  · `targetReplaced`  — hedef uid'i aynı ama SPAWN NESLİ farklı: aynı slotta
 *                        yeniden doğmuş BAŞKA bir canlıdır (P1.6.1 kimlik kapısı) */
export type ImpactInvalidReason =
  | 'targetDead' | 'targetGone' | 'targetReplaced' | 'miss' | null;

/** Uçan ok. Tek-oklu skillerde bir tane, çok-oklularda ok başına bir tane. */
export interface Projectile {
  id: number;
  /** Bu okun ait olduğu cast. Aynı skill'den iki cast aynı anda havadayken
   *  impact'in DOĞRU cast'e bağlanmasını sağlar — `skillRef` sahiplik DEĞİLDİR. */
  castId: number;
  skillRef: number;
  /** Çok-okta 0..N-1, tek-okta 0. */
  arrowIndex: number;
  originX: number; originY: number;
  dirX: number; dirY: number;
  speed: number;
  /** Uçacağı toplam mesafe: isabetliyse hedefe kadar, ıskaysa menzil sonu. */
  travelDistance: number;
  travelled: number;
  /** Isabet edeceği mobun uid'i. `null` = ıska (hasar YOK, ok uçmaya devam eder). */
  targetUid: number | null;
  /** RELEASE anında hedefin SPAWN NESLİ (`WorldMob.generation`) anlık kopyası.
   *  Impact'te canlının nesli bununla karşılaştırılır: uymuyorsa hedef ölmüş ve
   *  aynı slotta yeniden doğmuş demektir → hasar UYGULANMAZ. */
  targetGeneration: number | null;
  /** Çok-ok: bu okun hasarı. Tek-okta 0 (payload `effects`tedir). */
  arrowDamage: number;
  /** P1.8 §21 — KUŞANILI SİLAHIN elemental bileşeni, RELEASE anında kilitlenir.
   *  Fiziksel hasarla AYNI alana EZİLMEZ; impact'te ayrı bir bileşen olarak
   *  uygulanır ve telemetride ayrı görünür.
   *  ══ POISON ≠ DoT (§4) ══ Buradaki `poison` bir HASAR BİLEŞENİDİR; status
   *  üretmez, tik atmaz. Archer zehir skilinin DoT'u TAMAMEN AYRI sistemdir. */
  weaponElemental: ElementalDamage;
  /** Tek-ok: taşınan effect payload'ı. */
  effects: EffectPayload | null;
  releasedAt: number;
  impactAt: number;
}

/** Kabul edilmiş ama henüz yaydan çıkmamış atış. */
export interface PendingCast {
  id: number;
  skillRef: number;
  acceptedAt: number;
  releaseAt: number;
  targetUid: number | null;
  /** Cast anındaki nişan noktası (release'te hedefin GÜNCEL konumu okunur). */
  aimX: number; aimY: number;
  originX: number; originY: number;
  /** Tek-ok payload'ı (cast anında rollendi). Çok-okta null. */
  effects: EffectPayload | null;
  isMultiShot: boolean;
}

/* --------------------------------------------------------------- pipeline */

export class CombatPipeline {
  readonly timing = new CombatTimingProfileV1();
  /** P1.6.1 — ID sayacı ARTIK MODÜL DÜZEYİNDE DEĞİL.
   *  Global `let nextId` iki farklı runtime (test/yeni oyun) arasında sızıyordu;
   *  artık her pipeline örneği 1'den başlar ve deterministiktir. */
  private nextId = 1;
  /** Simülasyon saati (sn) — telemetri zaman damgaları buradan. */
  time = 0;
  readonly pending: PendingCast[] = [];
  readonly projectiles: Projectile[] = [];

  /** P2.26 — havadaki okları düşür (ölüm). Impact üretmezler. */
  clearProjectiles(): void { this.projectiles.length = 0; }

  /** Cast kabul edildi: release kuyruğuna alınır. */
  accept(cast: Omit<PendingCast, 'id' | 'acceptedAt' | 'releaseAt'>): PendingCast {
    const p: PendingCast = {
      ...cast,
      id: this.nextId++,
      acceptedAt: this.time,
      releaseAt: this.time + this.timing.releaseDelayFor(cast.skillRef),
    };
    this.pending.push(p);
    return p;
  }

  /** Okları doğurur (release çözümü adaptörde yapılır). */
  spawn(p: Omit<Projectile, 'id' | 'releasedAt' | 'impactAt' | 'travelled'>): Projectile {
    const proj: Projectile = {
      ...p,
      id: this.nextId++,
      travelled: 0,
      releasedAt: this.time,
      impactAt: this.time + (p.speed > 0 ? p.travelDistance / p.speed : 0),
    };
    this.projectiles.push(proj);
    return proj;
  }

  /** Zamanı ilerletir.
   *  Dönen `released` için adaptör geometriyi çözüp `spawn()` çağırır;
   *  dönen `impacts` için adaptör payload'ı UYGULAR.
   *  Bu sırayla çağrılır ki aynı karede release edilen bir ok impact etmesin. */
  advance(dt: number): { released: PendingCast[]; impacts: Projectile[] } {
    this.time += dt;

    const released: PendingCast[] = [];
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (this.pending[i]!.releaseAt <= this.time) released.unshift(this.pending.splice(i, 1)[0]!);
    }

    const impacts: Projectile[] = [];
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      p.travelled = Math.min(p.travelDistance, p.travelled + p.speed * dt);
      if (p.travelled >= p.travelDistance) impacts.unshift(this.projectiles.splice(i, 1)[0]!);
    }
    return { released, impacts };
  }

  /** Okun o anki world konumu (renderer projeksiyonu AYRI katmandır). */
  static position(p: Projectile): { x: number; y: number } {
    return { x: p.originX + p.dirX * p.travelled, y: p.originY + p.dirY * p.travelled };
  }

  /** Bu hedefe havada ok var mı? (telemetri) */
  inFlightFor(uid: number): number {
    return this.projectiles.filter((p) => p.targetUid === uid).length;
  }

  clear(): void {
    this.pending.length = 0;
    this.projectiles.length = 0;
    this.time = 0;
    this.nextId = 1;
  }
}
