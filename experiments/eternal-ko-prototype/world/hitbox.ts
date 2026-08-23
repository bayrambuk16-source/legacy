/** Monster combat hitbox'ı — sprite genişliği DEĞİL, ayrı bir gameplay değeri.
 *  Büyük/elit yaratık daha büyük hitbox alır; bu doğrudan 3/5 ok isabetini etkiler
 *  (büyük hedefe 5/5 sokmak küçük moba göre daha kolay). */
import type { GameMonster } from '../../../src/game/data/GameContentRepository.js';
import type { MobSpawnSlot } from '../data/farm-area.js';

export const HITBOX = {
  /** Taban yarıçap (world birimi) */
  base: 26,
  /** Seviye başına büyüme */
  perLevel: 0.9,
  /** Elit çarpanı */
  eliteMult: 1.6,
  /** Slotun görsel ölçeğinin katkısı (0.6 referans ölçek) */
  visualInfluence: 0.5,
  min: 16,
  max: 90,
} as const;

export function hitboxRadius(monster: GameMonster, slot?: Pick<MobSpawnSlot, 'visual'>): number {
  const visual = slot ? 1 + ((slot.visual.scale - 0.6) / 0.6) * HITBOX.visualInfluence : 1;
  const raw = (HITBOX.base + monster.level * HITBOX.perLevel)
    * (monster.tier === 'elite' ? HITBOX.eliteMult : 1)
    * visual;
  return Math.max(HITBOX.min, Math.min(HITBOX.max, Math.round(raw)));
}
