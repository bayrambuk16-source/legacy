/** Skill çalıştırma: gereksinim kontrolleri + cooldown + effect çözümü.
 *  Scene HİÇBİR kuralı hesaplamaz; yalnız use() sonucunu gösterir.
 *  Effect'ler handler registry ile çözülür (skill ID'ye göre if/switch YOK). */
import type { EnemyUnit } from './SpawnSystem.js';
import type { PlayerState } from './PlayerState.js';
import { SkillRegistry, type SkillDefinition } from './SkillRegistry.js';
import { SkillLoadout } from './SkillLoadout.js';
import { resolveEffect, statusModifiers, tickStatuses, type StatusTickEvent } from './skills/effects.js';
import type { EffectContext, EffectOutcome } from './skills/types.js';

export type SkillFailReason =
  | 'unknown' | 'emptySlot' | 'dead' | 'levelReq' | 'mana' | 'cooldown' | 'noWeapon' | 'noTarget';

export interface SkillUseResult {
  ok: boolean;
  fail?: SkillFailReason;
  def?: SkillDefinition;
  outcomes?: EffectOutcome[];
  totalDamage?: number;
  killed?: boolean;
}

export interface SkillSlotView {
  index: number;
  def: SkillDefinition | undefined;
  cooldownLeft: number;
  cooldownRatio: number;      // 0 = hazır
  /** Şu an kullanılabilir mi (hedefsiz kontrol); değilse neden. */
  blocked: SkillFailReason | null;
}

export class SkillSystem {
  readonly loadout: SkillLoadout;
  private cooldowns = new Map<number, number>();

  constructor(private ctx: EffectContext, private player: PlayerState, loadout?: SkillLoadout) {
    this.loadout = loadout ?? new SkillLoadout('archer');
  }

  /* ---------------- gereksinim kontrolleri ---------------- */
  /** Hedeften bağımsız kontroller (UI butonunu kilitlemek için de kullanılır). */
  private staticBlock(def: SkillDefinition): SkillFailReason | null {
    if (!this.player.alive) return 'dead';
    if (this.player.level < def.requiredLevel) return 'levelReq';           // KAYNAK seviye şartı
    if ((this.cooldowns.get(def.sourceRef) ?? 0) > 0) return 'cooldown';
    if (def.weaponKinds.length > 0) {
      const w = this.ctx.stats.equippedWeaponKind();
      if (w === null || !def.weaponKinds.includes(w)) return 'noWeapon';
    }
    if (this.player.mp < def.manaCost) return 'mana';                        // KAYNAK mana
    return null;
  }

  canUse(def: SkillDefinition, target: EnemyUnit | null): SkillFailReason | null {
    const s = this.staticBlock(def);
    if (s) return s;
    if (def.targeting === 'enemy' && (!target || target.state === 'dying')) return 'noTarget';
    return null;
  }

  /* ---------------- kullanım ---------------- */
  useByRef(sourceRef: number | null, target: EnemyUnit | null): SkillUseResult {
    const def = SkillRegistry.get(sourceRef);
    if (!def) return { ok: false, fail: sourceRef === null ? 'emptySlot' : 'unknown' };
    const blocked = this.canUse(def, target);
    if (blocked) return { ok: false, fail: blocked, def };

    if (!this.player.spendMana(def.manaCost)) return { ok: false, fail: 'mana', def };
    this.cooldowns.set(def.sourceRef, def.cooldownSec);

    const outcomes: EffectOutcome[] = [];
    let totalDamage = 0, killed = false;
    for (const spec of def.effects) {
      const out = resolveEffect(this.ctx, spec, target);
      outcomes.push(out);
      totalDamage += out.damage ?? 0;
      killed = killed || out.killed === true;
    }
    return { ok: true, def, outcomes, totalDamage, killed };
  }

  useSlot(index: number, target: EnemyUnit | null): SkillUseResult {
    const refs = this.loadout.slotRefs();
    if (index < 0 || index >= refs.length) return { ok: false, fail: 'unknown' };
    return this.useByRef(refs[index], target);
  }

  /* ---------------- görünüm + tick ---------------- */
  slots(): SkillSlotView[] {
    return this.loadout.definitions().map((def, index) => {
      const left = def ? this.cooldowns.get(def.sourceRef) ?? 0 : 0;
      return {
        index, def, cooldownLeft: left,
        cooldownRatio: def && def.cooldownSec > 0 ? Math.max(0, left / def.cooldownSec) : 0,
        blocked: def ? this.staticBlock(def) : 'emptySlot',
      };
    });
  }

  update(dt: number): void {
    for (const [k, v] of this.cooldowns) if (v > 0) this.cooldowns.set(k, Math.max(0, v - dt));
  }

  /** DoT/debuff ilerlemesi — CombatScene her karede çağırır, fx için olay listesi döner. */
  tickStatuses(enemies: EnemyUnit[], dt: number): StatusTickEvent[] {
    return tickStatuses(enemies, dt);
  }

  /** Debuff'lı savunma/hız çarpanları (CombatSystem ve hareket için). */
  static modifiers(enemy: EnemyUnit): { defenseMult: number; moveSpeedMult: number } {
    return statusModifiers(enemy);
  }

  reset(): void { this.cooldowns.clear(); }
}
