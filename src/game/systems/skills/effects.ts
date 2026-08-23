/** Effect handler kayıt defteri — CombatSystem içinde skill ID'ye göre dev if/switch
 *  zinciri YOKTUR; her effect ailesi kendi handler'ıyla çözülür. Yeni bir aile eklemek
 *  = yeni bir spec tipi + buraya bir handler. */
import type { EnemyUnit } from '../SpawnSystem.js';
import type {
  ActiveStatus, DamageOverTimeSpec, DirectDamageSpec, EffectContext, EffectHandler,
  EffectKind, EffectOutcome, HealSpec, SelfBuffSpec, SkillEffectSpec, TargetDebuffSpec,
} from './types.js';

function addStatus(target: EnemyUnit, status: ActiveStatus): void {
  if (!target.status) target.status = [];
  target.status.push(status);
}

const directDamage: EffectHandler<DirectDamageSpec> = (ctx, spec, target) => {
  if (!target || target.state === 'dying') return {};
  const dmg = ctx.damageRoll(ctx.playerAttack(), ctx.effectiveDefense(target), spec.coefficient);
  target.hp -= dmg;
  const killed = target.hp <= 0;
  if (killed) target.state = 'dying';
  return { damage: dmg, killed, fxColor: spec.fxColor };
};

const selfBuff: EffectHandler<SelfBuffSpec> = (ctx, spec) => {
  if (spec.stat === 'attackSpeed') ctx.player.applyAttackSpeedBuff(spec.multiplier, spec.durationSec);
  return { label: 'Buff!', fxColor: spec.fxColor };
};

const targetDebuff: EffectHandler<TargetDebuffSpec> = (_ctx, spec, target) => {
  if (!target || target.state === 'dying') return {};
  addStatus(target, {
    kind: 'debuff', stat: spec.stat, multiplier: spec.multiplier,
    timeLeft: spec.durationSec, fxColor: spec.fxColor,
  });
  return { label: spec.stat === 'defense' ? 'Zırh kırıldı' : 'Yavaşladı', fxColor: spec.fxColor };
};

const heal: EffectHandler<HealSpec> = (ctx, spec) => {
  const max = ctx.stats.finalStats().maxHp;
  const before = ctx.player.hp;
  ctx.player.hp = Math.min(max, ctx.player.hp + max * spec.percentOfMaxHp);
  return { healed: Math.round(ctx.player.hp - before), fxColor: spec.fxColor };
};

const damageOverTime: EffectHandler<DamageOverTimeSpec> = (ctx, spec, target) => {
  if (!target || target.state === 'dying') return {};
  const perTick = ctx.damageRoll(ctx.playerAttack(), ctx.effectiveDefense(target), spec.coefficient);
  addStatus(target, {
    kind: 'dot', damagePerTick: perTick, tickSec: spec.tickSec, tickTimer: spec.tickSec,
    timeLeft: spec.durationSec, fxColor: spec.fxColor,
  });
  return { label: 'DoT', fxColor: spec.fxColor };
};

export const EFFECT_HANDLERS: Record<EffectKind, EffectHandler> = {
  directDamage: directDamage as EffectHandler,
  selfBuff: selfBuff as EffectHandler,
  targetDebuff: targetDebuff as EffectHandler,
  heal: heal as EffectHandler,
  damageOverTime: damageOverTime as EffectHandler,
};

export function resolveEffect(ctx: EffectContext, spec: SkillEffectSpec, target: EnemyUnit | null): EffectOutcome {
  const handler = EFFECT_HANDLERS[spec.kind];
  if (!handler) return {}; // bilinmeyen effect kind → sessiz atla, crash yok
  return handler(ctx, spec, target);
}

/** Aktif debuff'lardan gelen çarpanlar. */
export function statusModifiers(enemy: EnemyUnit): { defenseMult: number; moveSpeedMult: number } {
  let defenseMult = 1, moveSpeedMult = 1;
  for (const s of enemy.status ?? []) {
    if (s.kind !== 'debuff' || s.multiplier === undefined) continue;
    if (s.stat === 'defense') defenseMult *= s.multiplier;
    if (s.stat === 'moveSpeed') moveSpeedMult *= s.multiplier;
  }
  return { defenseMult, moveSpeedMult };
}

export interface StatusTickEvent { enemy: EnemyUnit; damage: number; killed: boolean; fxColor: string }

/** DoT tick'leri ve süre dolumları — her karede bir kez çağrılır. */
export function tickStatuses(enemies: EnemyUnit[], dt: number): StatusTickEvent[] {
  const events: StatusTickEvent[] = [];
  for (const e of enemies) {
    if (!e.status || e.status.length === 0) continue;
    if (e.state === 'dying') { e.status = []; continue; }
    for (const s of e.status) {
      s.timeLeft -= dt;
      if (s.kind !== 'dot' || s.damagePerTick === undefined) continue;
      s.tickTimer = (s.tickTimer ?? s.tickSec ?? 1) - dt;
      if (s.tickTimer! > 0) continue;
      s.tickTimer = s.tickSec ?? 1;
      e.hp -= s.damagePerTick;
      const killed = e.hp <= 0;
      if (killed) e.state = 'dying';
      events.push({ enemy: e, damage: s.damagePerTick, killed, fxColor: s.fxColor });
      if (killed) break;
    }
    e.status = e.status.filter((s) => s.timeLeft > 0);
  }
  return events;
}
