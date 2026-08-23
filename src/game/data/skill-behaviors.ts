/** Skill davranış/override katmanı.
 *
 *  KURAL: skills.json (KO_Reference_v8 → MAGIC) AUTHORITATIVE'dir.
 *  Buradan ASLA tekrar tanımlanmaz: manaCost, requiredLevel, displayName.
 *  Burada YALNIZCA kaynakta bulunmayan ya da birimi doğrulanmamış davranış
 *  parametreleri vardır:
 *   - cooldownSec  → NOT (22 Ağu 2026): kaynak `recast_time` biriminin DESİSANİYE
 *                    olduğu ARCHER COMBAT V1'de doğrulandı (bkz. docs/CONTENT_MAPPING.md).
 *                    Aşağıdaki ANA OYUN değerleri bilerek DEĞİŞTİRİLMEDİ — Faz 6.1
 *                    dengesi bozulmasın diye. Kaynaktan türeten örnek:
 *                    experiments/eternal-ko-prototype/data/archer-skills.ts
 *   - targeting    → kaynakta hedef kuralı yok
 *   - weaponKinds  → silah gereksinimi yeni oyun kuralı (items_server.kind kodları)
 *   - effects      → effect composition (kaynak type1/type2'den ilham, birebir değil)
 *
 *  Yeni sınıf eklemek = buraya `classes: ['mage']` girdileri eklemek; sistem kodu
 *  değişmez. */
import type { ClassId, SkillEffectSpec } from '../systems/skills/types.js';

export interface SkillBehaviorDef {
  sourceRef: number;
  classes: ClassId[];
  cooldownSec: number;
  targeting: 'enemy' | 'self';
  /** Boş/undefined = silah gerekmez. Dolu = bu kind'lardan biri kuşanılı olmalı. */
  weaponKinds?: number[];
  effects: SkillEffectSpec[];
}

const BOW = [70, 71]; // Bow, Crossbow

export const SKILL_BEHAVIORS: SkillBehaviorDef[] = [
  {
    // Archery → "Temel Atış": tek hedef fiziksel atış
    sourceRef: 102003, classes: ['archer'], cooldownSec: 2.5,
    targeting: 'enemy', weaponKinds: BOW,
    effects: [{ kind: 'directDamage', coefficient: 1.25, fxColor: '#cfc7b6' }],
  },
  {
    // fire arrow → "Alev Oku": ağır tek vuruş (Faz 3 davranışı korunur)
    sourceRef: 107505, classes: ['archer'], cooldownSec: 5,
    targeting: 'enemy', weaponKinds: BOW,
    effects: [{ kind: 'directDamage', coefficient: 1.9, fxColor: '#e08a3c' }],
  },
  {
    // swift → "Rüzgar Adımı": saldırı hızı buff'ı (Faz 3 davranışı korunur)
    sourceRef: 107010, classes: ['archer'], cooldownSec: 12,
    targeting: 'self',
    effects: [{ kind: 'selfBuff', stat: 'attackSpeed', multiplier: 1.35, durationSec: 6, fxColor: '#7fa85c' }],
  },
  {
    // poison arrow → "Zehirli Ok": hafif vuruş + damageOverTime (yeni aile örneği)
    sourceRef: 107510, classes: ['archer'], cooldownSec: 9,
    targeting: 'enemy', weaponKinds: BOW,
    effects: [
      { kind: 'directDamage', coefficient: 0.6, fxColor: '#7fa85c' },
      { kind: 'damageOverTime', coefficient: 0.35, tickSec: 1, durationSec: 4, fxColor: '#7fa85c' },
    ],
  },
  {
    /* through shot: vuruş + savunma debuff'ı.
       NOT (22 Ağu 2026): bu debuff KAYNAKTA YOKTUR — Faz 5'te `targetDebuff` effect
       ailesini göstermek için eklenmişti ve ana oyunda hâlâ o ailenin TEK kullanıcısı
       (tests/run.ts "targetDebuff savunmayı düşürür"). ARCHER COMBAT V1'de prototip
       tarafında KALDIRILDI (yalnız kaynak %150 hasar). Ana oyundan da kaldırılması
       ayrı bir karardır: Faz 6.1 dengesini ve effect-ailesi kapsamını etkiler. */
    sourceRef: 107500, classes: ['archer'], cooldownSec: 7,
    targeting: 'enemy', weaponKinds: BOW,
    effects: [
      { kind: 'directDamage', coefficient: 1.4, fxColor: '#6f8fd0' },
      { kind: 'targetDebuff', stat: 'defense', multiplier: 0.6, durationSec: 5, fxColor: '#6f8fd0' },
    ],
  },
];

/** Yeni oyun başlangıç loadout'u (3 aktif slot). Kaydı olmayan oyuncu bununla başlar. */
export const DEFAULT_LOADOUT: Array<number | null> = [102003, 107505, 107010];

/** Combat barındaki aktif skill slotu sayısı (basic attack ayrı). */
export const LOADOUT_SLOTS = 3;
