/** Menzil profili (PROTOTİP).
 *
 *  Kaynak `skills.json` içindeki `rangeSourceRaw` alanının GERÇEK DÜNYA BİRİMİ
 *  DOĞRULANMAMIŞTIR (KO'da 25 / 10000 gibi değerler var, ölçek belirsiz). Bu yüzden
 *  onu piksel/metre olarak yorumlamıyoruz; prototipin kendi world-space menzilleri
 *  burada tanımlıdır. Kaynak JSON değiştirilmemiştir. */

export interface RangeValues {
  /** Temel saldırı menzili (world birimi) — okçu yayı. */
  basicAttack: number;
  /** Hasar veren skiller için varsayılan menzil. */
  damageSkill: number;
  /** Kendine buff — menzil aranmaz. */
  selfSkill: number;
  /** Hedef bu mesafeyi aşarsa target düşer. */
  targetDropDistance: number;
  /** Dokunma ile hedef seçme yarıçapı (world). */
  pickRadius: number;
  /** "En yakın hedef" düğmesinin tarama menzili. */
  nearestScan: number;
}

const DEFAULTS: RangeValues = {
  basicAttack: 300,
  damageSkill: 340,
  selfSkill: Infinity,
  targetDropDistance: 900,
  pickRadius: 80,
  nearestScan: 520,
};

export class CombatRangeProfile {
  private values: RangeValues;
  /** İstisna gereken skiller için sourceRef → world menzil. */
  private perSkill = new Map<number, number>();

  constructor(overrides: Partial<RangeValues> = {}) {
    this.values = { ...DEFAULTS, ...overrides };
  }

  get basicAttack(): number { return this.values.basicAttack; }
  get targetDropDistance(): number { return this.values.targetDropDistance; }
  get pickRadius(): number { return this.values.pickRadius; }
  get nearestScan(): number { return this.values.nearestScan; }

  setSkillRange(sourceRef: number, worldRange: number): void { this.perSkill.set(sourceRef, worldRange); }

  /** Bir skill için world menzili: özel tanım → hedefleme tipine göre varsayılan. */
  skillRange(sourceRef: number, targeting: 'enemy' | 'self'): number {
    const special = this.perSkill.get(sourceRef);
    if (special !== undefined) return special;
    return targeting === 'self' ? this.values.selfSkill : this.values.damageSkill;
  }

  snapshot(): RangeValues { return { ...this.values }; }
}
