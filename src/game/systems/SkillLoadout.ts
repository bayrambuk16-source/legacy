/** Aktif combat barı — kullanılabilir skill havuzundan AYRI.
 *  3 slot; save'e girer; geçersiz/bilinmeyen ID yüklenirse slot boş kalır (crash yok).
 *  SkillsScene ileride setSlot() üzerinden değişiklik yapacak. */
import { DEFAULT_LOADOUT, LOADOUT_SLOTS } from '../data/skill-behaviors.js';
import { SkillRegistry, type SkillDefinition } from './SkillRegistry.js';
import type { ClassId } from './skills/types.js';

export class SkillLoadout {
  private slots: Array<number | null> = [];
  /** Slot sayısı. Ana oyun `LOADOUT_SLOTS` (3) kullanır; deneysel katmanlar
   *  (Eternal tarzı portrait bar) daha fazlasını isteyebilir — ADDITIVE API,
   *  varsayılan davranış değişmez. */
  private readonly slotCount: number;
  /** Varsayılan doldurma listesi (deneyler kendi barını verebilir). */
  private readonly defaults: Array<number | null>;

  constructor(private cls: ClassId = 'archer', slotCount = LOADOUT_SLOTS, defaults: Array<number | null> = DEFAULT_LOADOUT) {
    this.slotCount = Math.max(1, Math.floor(slotCount));
    this.defaults = defaults;
    this.reset();
  }

  get size(): number { return this.slotCount; }

  reset(): void {
    this.slots = Array.from({ length: this.slotCount }, (_, i) => {
      const ref = this.defaults[i] ?? null;
      return ref !== null && SkillRegistry.has(ref) ? ref : null;
    });
  }

  slotRefs(): Array<number | null> { return [...this.slots]; }

  definitions(): Array<SkillDefinition | undefined> {
    return this.slots.map((ref) => SkillRegistry.get(ref));
  }

  /** Slota skill koyar. Sınıf uyumsuz/bilinmeyen ID reddedilir; aynı skill iki slotta olamaz. */
  setSlot(index: number, sourceRef: number | null): boolean {
    if (index < 0 || index >= this.slotCount) return false;
    if (sourceRef === null) { this.slots[index] = null; return true; }
    const def = SkillRegistry.get(sourceRef);
    if (!def || !def.classes.includes(this.cls)) return false;
    const existing = this.slots.indexOf(sourceRef);
    if (existing >= 0 && existing !== index) this.slots[existing] = null; // taşı, kopyalama
    this.slots[index] = sourceRef;
    return true;
  }

  serialize(): Array<number | null> { return [...this.slots]; }

  /** Save yükleme — doğrulanmayan her girdi null'a düşer. */
  restore(refs: unknown): void {
    const arr = Array.isArray(refs) ? refs : [];
    const seen = new Set<number>();
    this.slots = Array.from({ length: this.slotCount }, (_, i) => {
      const raw = arr[i];
      const ref = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
      if (ref === null) return null;
      const def = SkillRegistry.get(ref);
      if (!def || !def.classes.includes(this.cls) || seen.has(ref)) return null;
      seen.add(ref);
      return ref;
    });
  }
}
