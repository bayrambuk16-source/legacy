/** Skill sistemi ortak tipleri — CombatSystem ile karşılıklı import döngüsü
 *  oluşmasın diye ayrı dosyada. */
import type { PlayerState } from '../PlayerState.js';
import type { CharacterStats } from '../CharacterStats.js';
import type { BalanceProfile } from '../BalanceProfile.js';
import type { EnemyUnit } from '../SpawnSystem.js';
import type { Rng } from '../../../engine/rng.js';

/** Sınıf kimlikleri — Faz 5'te yalnız archer aktif; altyapı diğerlerine hazır. */
export type ClassId = 'archer' | 'warrior' | 'mage' | 'priest';

/* ---------------- effect spec'leri (genişletilebilir aile) ---------------- */
export interface EffectBase { fxColor: string }
export interface DirectDamageSpec extends EffectBase { kind: 'directDamage'; coefficient: number }
export interface SelfBuffSpec extends EffectBase {
  kind: 'selfBuff'; stat: 'attackSpeed'; multiplier: number; durationSec: number;
}
export interface TargetDebuffSpec extends EffectBase {
  kind: 'targetDebuff'; stat: 'defense' | 'moveSpeed'; multiplier: number; durationSec: number;
}
export interface HealSpec extends EffectBase { kind: 'heal'; percentOfMaxHp: number }
export interface DamageOverTimeSpec extends EffectBase {
  kind: 'damageOverTime'; coefficient: number; tickSec: number; durationSec: number;
}
export type SkillEffectSpec =
  | DirectDamageSpec | SelfBuffSpec | TargetDebuffSpec | HealSpec | DamageOverTimeSpec;

export type EffectKind = SkillEffectSpec['kind'];

/** Düşman üzerinde yaşayan durum etkisi (DoT / debuff). */
export interface ActiveStatus {
  kind: 'dot' | 'debuff';
  stat?: 'defense' | 'moveSpeed';
  multiplier?: number;
  /** DoT: her tick'te uygulanacak hasar */
  damagePerTick?: number;
  tickSec?: number;
  tickTimer?: number;
  timeLeft: number;
  fxColor: string;
}

/** Effect handler'ların gördüğü bağlam — CombatSystem'in hasar formülünü paylaşır. */
export interface EffectContext {
  rng: Rng;
  player: PlayerState;
  stats: CharacterStats;
  balance: BalanceProfile;
  /** CombatSystem.damageRoll — tek hasar formülü, kopyalanmaz. */
  damageRoll(attack: number, defense: number, coefficient?: number): number;
  /** Final oyuncu saldırısı (balance dahil). */
  playerAttack(): number;
  /** Düşmanın anlık (debuff'lı) savunması. */
  effectiveDefense(enemy: EnemyUnit): number;
}

export interface EffectOutcome {
  damage?: number;
  healed?: number;
  killed?: boolean;
  /** UI'a gösterilecek kısa etiket (ör. "Zehir!") */
  label?: string;
  fxColor?: string;
}

export type EffectHandler<S extends SkillEffectSpec = SkillEffectSpec> =
  (ctx: EffectContext, spec: S, target: EnemyUnit | null) => EffectOutcome;
