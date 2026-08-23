/** Skill UI'ının okuduğu tek API — kilit/atama kuralları burada, Scene'de DEĞİL. */
import { SkillRegistry, type SkillDefinition } from './SkillRegistry.js';
import type { SkillLoadout } from './SkillLoadout.js';
import type { ClassId } from './skills/types.js';

export interface SkillCatalogEntry {
  def: SkillDefinition;
  unlocked: boolean;
  lockReason: 'levelReq' | null;
  /** Bu skill hangi aktif slotta? (yoksa null) */
  assignedSlot: number | null;
}

export type AssignFail = 'unknownSkill' | 'locked' | 'badSlot' | 'wrongClass';
export type AssignResult = { ok: true; slot: number } | { ok: false; reason: AssignFail };

/** Sınıfın tüm skilleri + oyuncunun durumuna göre kilit bilgisi. */
export function skillCatalog(cls: ClassId, playerLevel: number, loadout: SkillLoadout): SkillCatalogEntry[] {
  const refs = loadout.slotRefs();
  return SkillRegistry.forClass(cls).map((def) => {
    const unlocked = playerLevel >= def.requiredLevel;
    const slot = refs.indexOf(def.sourceRef);
    return {
      def, unlocked,
      lockReason: unlocked ? null : 'levelReq',
      assignedSlot: slot >= 0 ? slot : null,
    };
  });
}

/** Atama kuralı: kilitli skill atanamaz; aynı skill iki slotta olamaz (loadout garantiler). */
export function assignSkill(
  loadout: SkillLoadout, slot: number, sourceRef: number | null, playerLevel: number, cls: ClassId = 'archer',
): AssignResult {
  if (slot < 0 || slot >= loadout.size) return { ok: false, reason: 'badSlot' };
  if (sourceRef === null) { loadout.setSlot(slot, null); return { ok: true, slot }; }
  const def = SkillRegistry.get(sourceRef);
  if (!def) return { ok: false, reason: 'unknownSkill' };
  if (!def.classes.includes(cls)) return { ok: false, reason: 'wrongClass' };
  if (playerLevel < def.requiredLevel) return { ok: false, reason: 'locked' };
  return loadout.setSlot(slot, sourceRef) ? { ok: true, slot } : { ok: false, reason: 'unknownSkill' };
}
