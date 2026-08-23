/** Savaş çözümü: hasar formülü, temel saldırı, düşman saldırısı.
 *  Skill mantığı SkillSystem'e devredilmiştir (effect handler registry).
 *  Statlar HER ZAMAN CharacterStats.finalStats() üzerinden gelir. */
import { COMBAT, PLAYER } from '../config.js';
import type { PlayerPhysicalStrategy } from './combat/PlayerPhysicalStrategy.js';
import { range, type Rng } from '../../engine/rng.js';
import type { EnemyUnit } from './SpawnSystem.js';
import type { PlayerState } from './PlayerState.js';
import type { CharacterStats } from './CharacterStats.js';
import type { BalanceProfile } from './BalanceProfile.js';
import { SkillSystem } from './SkillSystem.js';
import { SkillLoadout } from './SkillLoadout.js';
import { statusModifiers } from './skills/effects.js';
import type { EffectContext } from './skills/types.js';

export interface AttackOutcome { damage: number; killed: boolean }

export class CombatSystem {
  private basicCooldown = 0;
  /** Skill katmanı — Scene bu nesne üzerinden skill kullanır. */
  readonly skills: SkillSystem;

  constructor(
    private rng: Rng,
    private player: PlayerState,
    private stats: CharacterStats,
    private balance: BalanceProfile,
    loadout?: SkillLoadout,
  ) {
    const ctx: EffectContext = {
      rng: this.rng,
      player: this.player,
      stats: this.stats,
      balance: this.balance,
      /* Skill hasarı OYUNCU yoludur → KO zincirine gider. */
      damageRoll: (a, d, c) => this.playerDamageRoll(a, d, c),
      playerAttack: () => this.playerAttack(),
      effectiveDefense: (e) => this.effectiveDefense(e),
    };
    this.skills = new SkillSystem(ctx, this.player, loadout);
  }

  /* ═══════════ P2.5A — OYUNCU FİZİKSEL HASAR STRATEJİSİ ═══════════
     KO Archer zinciri generic formülden AYRIDIR. Strateji verilirse
     OYUNCU → DÜŞMAN hasarı ondan geçer; DÜŞMAN → OYUNCU hasarı legacy
     `damageRoll` yolunda KALIR (§ mob hasarı değişmedi).
     Strateji verilmezse davranış P2.4 ile birebir aynıdır. */
  private playerPhysical: PlayerPhysicalStrategy | null = null;

  setPlayerPhysical(strategy: PlayerPhysicalStrategy | null): void {
    this.playerPhysical = strategy;
  }

  /** OYUNCU → DÜŞMAN hasarı. Strateji varsa KO zinciri, yoksa legacy. */
  playerDamageRoll(attack: number, defense: number, coefficient = 1): number {
    if (this.playerPhysical) return this.playerPhysical.roll(attack, defense, coefficient);
    return this.damageRoll(attack, defense, coefficient);
  }

  /* ---------- ortak hasar formülü (tek kaynak) ---------- */
  damageRoll(attack: number, defense: number, coefficient = 1): number {
    const variance = range(this.rng, COMBAT.varianceMin, COMBAT.varianceMax);
    const raw = attack * coefficient - defense * COMBAT.defenseFactor;
    return Math.max(COMBAT.minDamage, Math.round(raw * variance));
  }

  /** Final hesaplanmış oyuncu saldırısı (StatCalculator) × balance profili. */
  playerAttack(): number {
    return this.stats.finalStats().attack * this.balance.playerDamage;
  }

  playerDefense(): number {
    return this.stats.finalStats().defense;
  }

  /** Debuff'lar dahil düşman savunması. */
  effectiveDefense(enemy: EnemyUnit): number {
    return enemy.monster.defense * statusModifiers(enemy).defenseMult;
  }

  /* ---------- oyuncu → düşman ---------- */
  get basicReady(): boolean { return this.basicCooldown <= 0; }
  get basicCooldownRatio(): number {
    const full = PLAYER.basicAttackCooldownSec / this.player.attackSpeedMult;
    return full > 0 ? Math.max(0, this.basicCooldown / full) : 0;
  }

  basicAttack(target: EnemyUnit): AttackOutcome | null {
    if (!this.basicReady || !this.player.alive || target.state === 'dying') return null;
    if (!this.stats.finalStats().hasWeapon) return null; // silahsız saldırı yok
    this.basicCooldown = PLAYER.basicAttackCooldownSec / this.player.attackSpeedMult;
    const dmg = this.playerDamageRoll(this.playerAttack(), this.effectiveDefense(target));
    target.hp -= dmg;
    const killed = target.hp <= 0;
    if (killed) target.state = 'dying';
    return { damage: dmg, killed };
  }

  /* ---------- düşman → oyuncu ---------- */
  enemyAttackTick(enemy: EnemyUnit, dt: number): number | null {
    if (enemy.state !== 'attack' || !this.player.alive) return null;
    enemy.attackTimer -= dt;
    if (enemy.attackTimer > 0) return null;
    enemy.attackTimer = enemy.monster.attackDelayMs * COMBAT.monsterAttackDelayScale;
    const dmg = this.damageRoll(
      enemy.monster.attack * this.balance.monsterDamage,
      this.playerDefense(),
    );
    this.player.takeDamage(dmg);
    return dmg;
  }

  update(dt: number): void {
    if (this.basicCooldown > 0) this.basicCooldown -= dt;
    this.skills.update(dt);
  }

  reset(): void {
    this.basicCooldown = 0;
    this.skills.reset();
  }
}
