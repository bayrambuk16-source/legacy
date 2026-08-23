/** skills.json (authoritative) + skill-behaviors.ts (davranış) birleşimi.
 *  Eksik/bilinmeyen kayıtlar sessizce atlanır ve uyarı olarak toplanır —
 *  geçersiz skill ID hiçbir zaman crash üretmez. */
import { Content, type GameSkill } from '../data/GameContentRepository.js';
import { SKILL_BEHAVIORS, type SkillBehaviorDef } from '../data/skill-behaviors.js';
import type { ClassId, SkillEffectSpec } from './skills/types.js';

export interface SkillDefinition {
  id: string;
  sourceRef: number;
  displayName: string;      // skills.json + content_overrides
  description: string;
  requiredLevel: number;    // skills.json (KAYNAK) — hardcode edilmez
  manaCost: number;         // skills.json (KAYNAK) — hardcode edilmez
  cooldownSec: number;      // behavior (kaynak birimi doğrulanmadı)
  targeting: 'enemy' | 'self';
  weaponKinds: number[];
  classes: ClassId[];
  effects: SkillEffectSpec[];
  /** debug/audit: kaynak ham alanları */
  source: { castTimeRaw: number; recastTimeRaw: number; type1: number; type2: number };
}

function build(behavior: SkillBehaviorDef, skill: GameSkill): SkillDefinition {
  return {
    id: `skill_${behavior.sourceRef}`,
    sourceRef: behavior.sourceRef,
    displayName: skill.displayName,
    description: skill.description,
    requiredLevel: skill.level,        // KAYNAK
    manaCost: skill.manaCost,          // KAYNAK
    cooldownSec: behavior.cooldownSec,
    targeting: behavior.targeting,
    weaponKinds: behavior.weaponKinds ?? [],
    classes: behavior.classes,
    effects: behavior.effects,
    source: {
      castTimeRaw: skill.castTimeSourceRaw,
      recastTimeRaw: skill.recastTimeSourceRaw,
      type1: skill.type1, type2: skill.type2,
    },
  };
}

class Registry {
  private byRef = new Map<number, SkillDefinition>();
  readonly warnings: string[] = [];

  constructor() {
    for (const b of SKILL_BEHAVIORS) {
      const skill = Content.skills.find((s) => s.sourceRef === b.sourceRef);
      if (!skill) { this.warnings.push(`skills.json içinde yok, atlandı: ${b.sourceRef}`); continue; }
      if (this.byRef.has(b.sourceRef)) { this.warnings.push(`duplicate behavior: ${b.sourceRef}`); continue; }
      this.byRef.set(b.sourceRef, build(b, skill));
    }
    if (this.warnings.length) console.warn('[SkillRegistry]', this.warnings.join(' | '));
  }

  /** Deneysel katmanların (experiments/) kendi davranışlarını eklemesi için additive API.
   *  Ana oyun bunu KULLANMAZ; skills.json'da karşılığı olmayan girdi sessizce reddedilir. */
  registerBehavior(behavior: SkillBehaviorDef): boolean {
    const skill = Content.skills.find((s) => s.sourceRef === behavior.sourceRef);
    if (!skill) { this.warnings.push(`registerBehavior: skills.json içinde yok ${behavior.sourceRef}`); return false; }
    this.byRef.set(behavior.sourceRef, build(behavior, skill));
    return true;
  }

  /** Bilinmeyen ID → undefined (asla throw etmez). */
  get(sourceRef: number | null | undefined): SkillDefinition | undefined {
    return sourceRef == null ? undefined : this.byRef.get(sourceRef);
  }
  has(sourceRef: number): boolean { return this.byRef.has(sourceRef); }
  /** Bir sınıfın kullanabileceği tüm skiller (SkillsScene için hazır). */
  forClass(cls: ClassId): SkillDefinition[] {
    return [...this.byRef.values()].filter((d) => d.classes.includes(cls))
      .sort((a, b) => a.requiredLevel - b.requiredLevel || a.sourceRef - b.sourceRef);
  }
  all(): SkillDefinition[] { return [...this.byRef.values()]; }
}

export const SkillRegistry = new Registry();
