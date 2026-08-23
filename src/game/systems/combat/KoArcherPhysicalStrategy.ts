/** KO ARCHER HASAR STRATEJİSİ — P2.5A
 *
 *  ══════════════ BU DOSYA NE YAPAR ══════════════
 *  `KoArcherDamage` içindeki saf formülleri `CombatSystem`in beklediği
 *  `roll(attack, defense, coefficient)` arayüzüne bağlar. Formül BURADA
 *  DEĞİLDİR; burası yalnız hangi rolün kullanılacağına karar verir.
 *
 *  ══════════════ NORMAL Mİ TYPE2 Mİ ══════════════
 *  `coefficient === 1` → normal ok (temel saldırı ve Standart Atış):
 *      trunc(0.85 × HitB + 0.30 × rastgele(0..HitB))
 *
 *  `coefficient !== 1` → Type2 skill (addDamage / 100):
 *      SkillHit = trunc(HitB × addDamage / 100)
 *      hasar    = trunc(SkillHit × 0.6 + rastgele(0..SkillHit) + 0.99)
 *
 *  Katsayının kendisi `archer-balance.ts`ten gelir; burada UYDURULMAZ.
 *
 *  ══════════════ MİNİMUM HASAR ══════════════
 *  Kaynak formül 0 üretebilir (AP çok düşük ya da AC çok yüksek). Oyuncunun
 *  "hiç vuramıyorum" hissine düşmemesi için ana `COMBAT.minDamage` tabanı
 *  KORUNUR — bu bir Project Legacy kararıdır, kaynak davranışı değildir. */

import { COMBAT } from '../../config.js';
import type { Rng } from '../../../engine/rng.js';
import type { PlayerPhysicalStrategy } from './PlayerPhysicalStrategy.js';
import {
  koNormalPhysicalDamage, koPhysicalAfterArmor, koType2ArrowDamage, koType2SkillHit,
} from './KoArcherDamage.js';

export class KoArcherPhysicalStrategy implements PlayerPhysicalStrategy {
  private rng: Rng;

  constructor(rng: Rng) { this.rng = rng; }

  roll(attack: number, defense: number, coefficient: number): number {
    const hitB = koPhysicalAfterArmor(Math.max(0, Math.trunc(attack)), Math.max(0, defense));
    const raw = coefficient === 1
      ? koNormalPhysicalDamage(hitB, this.rng)
      : koType2ArrowDamage(koType2SkillHit(hitB, Math.round(coefficient * 100)), this.rng);
    return Math.max(COMBAT.minDamage, raw);
  }
}
