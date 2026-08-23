/** Runtime denge katmanı — kaynak DB değerleri ASLA overwrite edilmez;
 *  mobil pacing bu katsayılarla ayarlanır. sourceRef ve orijinal değerler korunur. */

export interface BalanceValues {
  monsterHpMultiplier: number;
  monsterDamageMultiplier: number;
  playerDamageMultiplier: number;
  expMultiplier: number;
  coinMultiplier: number;
}

const DEFAULTS: BalanceValues = {
  monsterHpMultiplier: 1.0,
  monsterDamageMultiplier: 1.0,
  playerDamageMultiplier: 1.0,
  expMultiplier: 1.0,
  coinMultiplier: 1.0,
};

export class BalanceProfile {
  private values: BalanceValues;
  constructor(overrides: Partial<BalanceValues> = {}) {
    this.values = { ...DEFAULTS, ...overrides };
  }
  get monsterHp(): number { return this.values.monsterHpMultiplier; }
  get monsterDamage(): number { return this.values.monsterDamageMultiplier; }
  get playerDamage(): number { return this.values.playerDamageMultiplier; }
  get exp(): number { return this.values.expMultiplier; }
  get coin(): number { return this.values.coinMultiplier; }
  set(overrides: Partial<BalanceValues>): void {
    this.values = { ...this.values, ...overrides };
  }
  snapshot(): BalanceValues { return { ...this.values }; }
}
