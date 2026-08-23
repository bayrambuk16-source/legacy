/** Oyun ayar katmanı — kaynak DB'de OLMAYAN her denge kararı burada, açık birimlerle.
 *  Kaynaktan gelen sayılar generated JSON'da; buradakiler yeni oyunun tasarım kararlarıdır. */

export const PLAYER = {
  /** Okçu başlangıç değerleri (tasarım kararı; ekipman bonusları ayrıca eklenir). */
  baseHp: 120,
  baseMp: 60,
  hpPerLevel: 14,
  mpPerLevel: 6,
  /** saniyede pasif yenilenme */
  hpRegenPerSec: 1.5,
  mpRegenPerSec: 4,
  /** silah gecikmesi kaynak delay birimi doğrulanmadığından: temel saldırı aralığı sn */
  basicAttackCooldownSec: 1.1,
  /** başlangıç yayı (items.json sourceRef) */
  starterWeaponRef: 160100000,
} as const;

export const COMBAT = {
  /** hasar varyansı [min, max) çarpan */
  varianceMin: 0.9,
  varianceMax: 1.1,
  /** savunmanın hasarı azaltma katsayısı: dmg = atk*coef - def*defFactor.
   *  KO s_ac değerleri (Sv6'da 31+) oyuncu hasarına göre büyük — 0.1 seçildi,
   *  yoksa düşük seviyede hasar 1'e yapışıyor (tasarım kararı, kaynak formülü değil). */
  defenseFactor: 0.1,
  minDamage: 1,
  /** oyuncu saldırı gücü: silah hasarı + seviye × bu */
  playerAttackPerLevel: 2,
  /** kaynak s_attack_delay ms varsayımı yerine açık ölçek: raw × bu = sn */
  monsterAttackDelayScale: 0.001,
  /** monster yürüme hızı: kaynak by_speed1 (1-3 bandı) × bu = px/sn */
  monsterSpeedScale: 55,
  /** monsterın oyuncuya durma mesafesi (px) */
  meleeStopDistance: 120,
  /** sıradaki düşmanlar arası kuyruk aralığı (px) — üst üste yığılmayı önler */
  queueGap: 52,
  /** karma oynanış: temel saldırı hazır olunca kendiliğinden atılır */
  autoBasicAttack: true,
  playerX: 150,
  laneY: 620,
  spawnX: 700,
} as const;

export const SPAWN = {
  maxActive: 3,
  firstDelaySec: 0.8,
  intervalSec: 1.6,
  /** slice hedefi: bu kadar kesimde bölüm ödül ekranı */
  killTarget: 10,
} as const;

export const LOOT = {
  /** yerdeki lootun görünür kalma süresi (sn) */
  groundLifeSec: 6,
  pickupRadius: 60,
} as const;

/* NOT: Skill davranışları Faz 5'te src/game/data/skill-behaviors.ts dosyasına taşındı
   (SkillRegistry + SkillSystem). Burada skill parametresi TUTULMAZ. */

/** Monster görsel varyantları (Legacy kurt seti — CONTENT_MAPPING.md). */
export const MONSTER_VISUALS: Record<string, { scale: number }> = {
  kurt_yavru: { scale: 0.42 },
  kurt: { scale: 0.54 },
  kurt_alfa: { scale: 0.7 },
};

/** Rarity gösterimi upgradeLevel'dan türetilir (kaynakta rarity alanı yok;
 *  KO dropları hazır-(+N) varyantlar içerir — CONTENT_MAPPING.md). */
export const RARITY_TIERS = [
  { min: 7, name: 'Destansı', color: '#e08a3c' },
  { min: 5, name: 'Nadir', color: '#9b7cc4' },
  { min: 3, name: 'Büyülü', color: '#6f8fd0' },
  { min: 0, name: 'Sıradan', color: '#cfc7b6' },
] as const;

export function rarityOf(upgradeLevel: number): { name: string; color: string } {
  return RARITY_TIERS.find((t) => upgradeLevel >= t.min) ?? RARITY_TIERS[RARITY_TIERS.length - 1];
}

/** Upgrade veri modeli (Faz 4: yalnız model; UI Faz 7).
 *  Her upgrade seviyesi item'ın attack/defense değerini bu oranda artırır. */
export const UPGRADE_MODEL = {
  statPerLevel: 0.2,
  maxLevel: 10,
} as const;

export const LEVELING = {
  /** MVP seviye tavanı (level_curve.json maxLevelMvp ile uyumlu) */
  maxLevel: 20,
} as const;
