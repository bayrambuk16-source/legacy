/** Oyuncu durumu: HP/MP, seviye/EXP (level_curve.json'dan), buff'lar.
 *  MaxHP/MaxMP artık StatCalculator üzerinden gelir (ekipman dahil);
 *  bindStats() ile CharacterStats bağlanır — bağlanmadan önce taban değerler. */
import { Content } from '../data/GameContentRepository.js';
import { LEVELING, PLAYER } from '../config.js';
import { StatCalculator } from './CharacterStats.js';
import type { CharacterStats } from './CharacterStats.js';

export interface LevelUpEvent { newLevel: number }

export class PlayerState {
  level = 1;
  exp = 0;
  hp: number;
  mp: number;
  coins = 0;
  attackSpeedMult = 1;
  private buffTimeLeft = 0;
  private levelUpListeners: Array<(e: LevelUpEvent) => void> = [];
  private stats: CharacterStats | null = null;

  constructor() {
    this.hp = this.maxHp;
    this.mp = this.maxMp;
  }

  /** GameState kurulumunda çağrılır; final stat kaynağını bağlar. */
  bindStats(stats: CharacterStats): void { this.stats = stats; }

  get maxHp(): number {
    return this.stats?.finalStats().maxHp ?? StatCalculator.baseStats(this.level).maxHp;
  }
  get maxMp(): number {
    return this.stats?.finalStats().maxMp ?? StatCalculator.baseStats(this.level).maxMp;
  }
  get alive(): boolean { return this.hp > 0; }

  requiredExpForCurrentLevel(): number {
    const row = Content.levelCurve.rows.find((r) => r.level === this.level);
    return row?.requiredExp ?? Number.MAX_SAFE_INTEGER;
  }

  addExp(amount: number): void {
    if (this.level >= LEVELING.maxLevel) return;
    this.exp += amount;
    while (this.level < LEVELING.maxLevel && this.exp >= this.requiredExpForCurrentLevel()) {
      this.exp -= this.requiredExpForCurrentLevel();
      this.level += 1;
      this.hp = this.maxHp;
      this.mp = this.maxMp;
      this.levelUpListeners.forEach((f) => f({ newLevel: this.level }));
    }
  }

  onLevelUp(cb: (e: LevelUpEvent) => void): () => void {
    this.levelUpListeners.push(cb);
    return () => { this.levelUpListeners = this.levelUpListeners.filter((f) => f !== cb); };
  }

  expProgress(): number {
    const need = this.requiredExpForCurrentLevel();
    return need > 0 ? Math.min(1, this.exp / need) : 1;
  }

  spendMana(cost: number): boolean {
    if (this.mp < cost) return false;
    this.mp -= cost;
    return true;
  }

  takeDamage(amount: number): void { this.hp = Math.max(0, this.hp - amount); }

  applyAttackSpeedBuff(mult: number, durationSec: number): void {
    this.attackSpeedMult = mult;
    this.buffTimeLeft = durationSec;
  }

  update(dt: number): void {
    if (this.alive) {
      this.hp = Math.min(this.maxHp, this.hp + PLAYER.hpRegenPerSec * dt);
      this.mp = Math.min(this.maxMp, this.mp + PLAYER.mpRegenPerSec * dt);
    }
    if (this.buffTimeLeft > 0) {
      this.buffTimeLeft -= dt;
      if (this.buffTimeLeft <= 0) this.attackSpeedMult = 1;
    }
  }

  /** Combat yeniden başlatma: canlar dolar, buff sıfırlanır; seviye/EXP/coin korunur. */
  reviveForRetry(): void {
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.attackSpeedMult = 1;
    this.buffTimeLeft = 0;
  }

  /* ---------------- kayıt geri yükleme (iki aşamalı — Faz 6.1) ----------------
     Sıra ÖNEMLİ: önce progression (level/exp/coins) yüklenir ki ekipman doğrulaması
     KAYITLI seviyeyle yapılsın; ekipman yerleştikten ve final statlar oluştuktan
     SONRA vitals (HP/MP) clamp edilir. Sırayı yöneten tek yer: systems/StateRestore.ts */

  /** Bozuk/eksik alanları normalize eder. Anti-cheat DEĞİLDİR; corruption dayanıklılığı. */
  restoreProgression(d: Partial<{ level: number; exp: number; coins: number }> | null | undefined): void {
    const src = d ?? {};
    const level = Math.floor(Number(src.level));
    this.level = Number.isFinite(level) ? Math.min(LEVELING.maxLevel, Math.max(1, level)) : 1;
    const exp = Number(src.exp);
    this.exp = Number.isFinite(exp) && exp > 0 ? Math.floor(exp) : 0;
    const coins = Number(src.coins);
    this.coins = Number.isFinite(coins) && coins > 0 ? Math.floor(coins) : 0;
    this.attackSpeedMult = 1;
    this.buffTimeLeft = 0;
  }

  /** Ekipman yüklendikten SONRA çağrılır: final maxHp/maxMp'ye göre clamp.
   *  Geçersiz (NaN/eksik) değer → tam dolu başlar; asla NaN bırakmaz. */
  restoreVitals(d: Partial<{ hp: number; mp: number }> | null | undefined): void {
    const src = d ?? {};
    const hp = Number(src.hp);
    const mp = Number(src.mp);
    this.hp = Number.isFinite(hp) ? Math.max(0, Math.min(hp, this.maxHp)) : this.maxHp;
    this.mp = Number.isFinite(mp) ? Math.max(0, Math.min(mp, this.maxMp)) : this.maxMp;
  }

  /** Kısayol (newGame ve testler): iki aşamayı ard arda çalıştırır.
   *  Kayıt yüklemede KULLANILMAZ — orada araya ekipman restore'u girer. */
  restore(d: { level: number; exp: number; hp: number; mp: number; coins: number }): void {
    this.restoreProgression(d);
    this.restoreVitals(d);
  }

  serialize(): { level: number; exp: number; hp: number; mp: number; coins: number } {
    return { level: this.level, exp: this.exp, hp: Math.round(this.hp), mp: Math.round(this.mp), coins: this.coins };
  }
}
