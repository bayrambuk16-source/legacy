/** MOB SALDIRI PROFİLİ — P1.6 (prototipe özel)
 *
 *  YENİ HASAR FORMÜLÜ YOKTUR. Ana oyunun `CombatSystem.damageRoll()` fonksiyonu
 *  ve `PlayerState.takeDamage()` aynen kullanılır; monster attack değeri
 *  `monsters.json`'dan, oyuncu savunması `CharacterStats`'tan gelir.
 *
 *  Ana `CombatSystem.enemyAttackTick()`'ten FARKI yalnız ZAMANLAMADIR:
 *  orada sayaç `= attackDelayMs * scale` ile SIFIRLANIR; burada zamanlama
 *  `MobAiController` içinde DEVREDEN sayaçla yürür (FPS bağımsızlığı, §…).
 *  Ana `enemyAttackTick` DEĞİŞTİRİLMEDİ ve ana oyunda çalışmaya devam eder.
 *
 *  Hasar uygulaması TEK YERDEDİR — Scene'e dağıtılmaz. */
import type { CombatSystem } from '../../../src/game/systems/CombatSystem.js';
import { monsterDamageMultiplierFor } from '../data/mob-damage-curve.js';
import type { BalanceProfile } from '../../../src/game/systems/BalanceProfile.js';
import type { PlayerState } from '../../../src/game/systems/PlayerState.js';
import type { WorldMob } from './types.js';

export interface MobHitEvent {
  mob: WorldMob;
  damage: number;
  /** Oyuncunun vuruştan SONRAKİ canı (telemetri). */
  playerHpAfter: number;
}

export class MobAttackProfile {
  /** Telemetri sayaçları. */
  hits = 0;
  totalDamage = 0;

  constructor(
    private combat: CombatSystem,
    private player: PlayerState,
    private balance: BalanceProfile,
  ) {}

  /** Tek vuruş. Ölü oyuncuya vuruş YOKTUR. */
  strike(mob: WorldMob): MobHitEvent | null {
    if (!this.player.alive) return null;
    /* ═══ P2.36 — HASAR ÇARPANI SEVİYEYE GÖRE ═══
       Sabit çarpan iki ucu birden tutamıyordu: 4'te Sv50 mobu tam
       donanımlı oyuncuyu iki vuruşta öldürüyor, 1'de Sv10 oyuncusu
       744 vuruş dayanıyordu (ikisi de ölçüldü).

       `balance.monsterDamage` KALDIRILMADI: denge profili hâlâ genel
       bir el (zindan, DEV panel). Eğri onun ÜSTÜNE biner, yerine
       geçmez. */
    const damage = this.combat.damageRoll(
      mob.monster.attack
        * monsterDamageMultiplierFor(mob.monster.level)
        * this.balance.monsterDamage,
      this.combat.playerDefense(),
    );
    this.player.takeDamage(damage);
    this.hits += 1;
    this.totalDamage += damage;
    return { mob, damage, playerHpAfter: this.player.hp };
  }

  reset(): void { this.hits = 0; this.totalDamage = 0; }
}
