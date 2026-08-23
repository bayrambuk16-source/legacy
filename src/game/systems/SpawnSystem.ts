/** Spawn: zones.json spawn listesinden ağırlıklı (num_npc) monster üretimi.
 *  Aynı anda en fazla SPAWN.maxActive düşman; ölüler sayaçtan düşer. */
import { Content, type GameMonster, type GameZone } from '../data/GameContentRepository.js';
import { COMBAT, SPAWN } from '../config.js';
import { range, type Rng } from '../../engine/rng.js';
import type { BalanceProfile } from './BalanceProfile.js';
import type { ActiveStatus } from './skills/types.js';

export interface EnemyUnit {
  uid: number;
  monster: GameMonster;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attackTimer: number;
  state: 'walk' | 'attack' | 'dying';
  deathTimer: number;
  /** Aktif DoT/debuff etkileri (SkillSystem yönetir). */
  status?: ActiveStatus[];
}

export class SpawnSystem {
  private pool: Array<{ ref: number; weight: number }> = [];
  private timer: number = SPAWN.firstDelaySec;
  private nextUid = 1;

  constructor(private rng: Rng, zone: GameZone, private balance?: BalanceProfile) {
    const weights = new Map<number, number>();
    for (const s of zone.spawns) {
      weights.set(s.monsterSourceRef, (weights.get(s.monsterSourceRef) ?? 0) + (s.count as number));
    }
    this.pool = [...weights.entries()]
      .map(([ref, weight]) => ({ ref, weight }))
      .sort((a, b) => a.ref - b.ref);
  }

  get poolSize(): number { return this.pool.length; }

  private pick(): GameMonster | undefined {
    const total = this.pool.reduce((a, p) => a + p.weight, 0);
    let r = this.rng() * total;
    for (const p of this.pool) {
      r -= p.weight;
      if (r <= 0) return Content.monster(p.ref);
    }
    return Content.monster(this.pool[this.pool.length - 1]?.ref ?? -1);
  }

  /** Her karede çağrılır; gerekiyorsa yeni düşman döner. */
  update(dt: number, activeCount: number): EnemyUnit | null {
    this.timer -= dt;
    if (this.timer > 0 || activeCount >= SPAWN.maxActive) return null;
    this.timer = SPAWN.intervalSec;
    const monster = this.pick();
    if (!monster) return null;
    return {
      uid: this.nextUid++,
      monster,
      x: COMBAT.spawnX + range(this.rng, 0, 60),
      y: COMBAT.laneY + range(this.rng, -36, 36),
      hp: Math.max(1, Math.round(monster.hp * (this.balance?.monsterHp ?? 1))),
      maxHp: Math.max(1, Math.round(monster.hp * (this.balance?.monsterHp ?? 1))),
      attackTimer: 0,
      state: 'walk',
      deathTimer: 0,
      status: [],
    };
  }

  reset(): void { this.timer = SPAWN.firstDelaySec; }
}
