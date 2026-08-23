/** ARCHER COMBAT V1 → BALANCE V1 — 15 okçu skillinin DAVRANIŞ katmanı.
 *
 *  P1.3'ten itibaren bütün hasar sayıları TEK yerden gelir:
 *  `data/archer-balance.ts` (SOURCE FACT / PROJECT LEGACY TUNING ayrımı orada).
 *  Bu dosya artık kendi katsayı tablosunu TUTMAZ; yalnız kaynak+tuning verisini
 *  `SkillBehaviorDef` efektlerine çevirir.
 *
 *  KAYNAK AUTHORITATIVE: sourceRef, displayName, requiredLevel, manaCost ve
 *  individual cooldown `skills.json`'dan gelir; cooldown `recast_time / 10`
 *  ile TÜRETİLİR, kodda 3/5/7 sn gibi uydurma sabit YOKTUR.
 *
 *  ── Çözülmüş kaynak belirsizlikleri ───────────────────────────────────────
 *  · `recast_time` birimi = DESİSANİYE (32 → 3.2 sn, 42 → 4.2 sn, 0 → 0).
 *    Altı bağımsız kayıt tutuyor.
 *  · `magic_type2.add_damage` = HASAR YÜZDESİ; kaynağın kendi açıklama metni
 *    beş kayıtta doğruluyor ("Inflict 150% damage" ↔ 150).
 *    → tek kural: `physicalCoefficient = add_damage / 100`, 3/5 salvoda OK BAŞINA.
 *
 *  ── HÂLÂ AÇIK kaynak belirsizlikleri (uydurulmadı) ────────────────────────
 *  · `magic_type3.duration = 20` biriminin ne olduğu DOĞRULANMADI → zehir
 *    süresi (4 sn) PROJECT LEGACY tuning'idir, kaynak süresi diye yazılmaz.
 *  · `magic_type2.hit_type` (0/2) ve `hit_rate` (100/150/300) semantiği
 *    DOĞRULANMADI → ham saklanır, davranış üretmez. Accuracy sistemi YOK.
 *  · `skills.cast_time` (13/15) birimi DOĞRULANMADI → action time ile
 *    İLİŞKİLENDİRİLMEDİ (action time ayrı tuning: `data/archer-timing.ts`).
 *  · Elemental hasarın KO mutlak rakamları (-156/-309/-463 …) bizim HP
 *    ölçeğimize basılmaz; yalnız 1 : 2 : 3 ORANI korunur. */
import {
  ARCHER, ARCHER_SKILL_ORDER, dotPerTickCoefficient, elementalCoefficient, elementOf,
  isMultiShotRef, physicalCoefficient, sourceCooldownSec,
  POISON_DURATION_SEC, POISON_TICK_SEC,
} from './archer-balance.js';
import type { SkillBehaviorDef } from '../../../src/game/data/skill-behaviors.js';

const BOW = [70, 71];

/* ARCHER / ARCHER_SKILL_ORDER / sourceCooldownSec artık balance profilinde
   yaşıyor; eski import yolları bozulmasın diye buradan yeniden dışa verilir. */
export { ARCHER, ARCHER_SKILL_ORDER, sourceCooldownSec };
export { physicalCoefficient as sourceCoefficient };

const C = { phys: '#cfc7b6', pierce: '#6f8fd0', fire: '#e08a3c', poison: '#7fa85c', heavy: '#e0c060' };

function damage(ref: number, color: string): SkillBehaviorDef['effects'][number] {
  return { kind: 'directDamage', coefficient: physicalCoefficient(ref), fxColor: color };
}

function behavior(ref: number, effects: SkillBehaviorDef['effects']): SkillBehaviorDef {
  return {
    sourceRef: ref,
    classes: ['archer'],
    cooldownSec: sourceCooldownSec(ref),   // KAYNAKTAN — uydurma 3/5/7 sn YOK
    targeting: 'enemy',
    weaponKinds: BOW,
    effects,
  };
}

/** 15 skill davranışı. `SkillRegistry.registerBehavior()` ile additive eklenir.
 *
 *  Efekt SIRASI sabittir ve telemetri buna güvenir:
 *    [0] fiziksel hasar
 *    [1] (varsa) elemental — ateşte anlık `directDamage`, zehirde `damageOverTime`
 *
 *  Çok-oklu skiller (need_arrow > 1) BURADA efekt taşımaz: hasarları
 *  `MultiShot.ts` içinde ok başına ayrı `damageRoll` ile çözülür.
 *  `damage × N` tek vuruşa ASLA çevrilmez. */
export function archerBehaviors(): SkillBehaviorDef[] {
  const out: SkillBehaviorDef[] = [];
  for (const ref of ARCHER_SKILL_ORDER) {
    if (isMultiShotRef(ref)) {
      /* Çok-ok: hasar MultiShot çözümleyicisinde; SkillSystem yalnız kural kapısı. */
      out.push(behavior(ref, []));
      continue;
    }
    const effects: SkillBehaviorDef['effects'] = [];
    const element = elementOf(ref);
    const phys = physicalCoefficient(ref);
    /* [0] fiziksel — Delici Ok'un rengi ayrı, ağır skiller altın, gerisi nötr. */
    const color = ref === ARCHER.DELICI_OK ? C.pierce : (phys >= 2 ? C.heavy : C.phys);
    effects.push(damage(ref, color));

    if (element === 'fire') {
      /* [1] ANLIK ateş bonusu — ayrı bileşen olarak telemetride görünür.
         Kaynak `first_damage` oranı 1 : 2 : 3, mutlak KO rakamı DEĞİL. */
      effects.push({ kind: 'directDamage', coefficient: elementalCoefficient(ref), fxColor: C.fire });
    } else if (element === 'poison') {
      /* [1] DoT — profil TOPLAM katsayı tutar; motor tick BAŞINA istediği için
         burada tick sayısına deterministik bölünür (0.60 → 4 × 0.15). */
      effects.push({
        kind: 'damageOverTime', coefficient: dotPerTickCoefficient(ref),
        tickSec: POISON_TICK_SEC, durationSec: POISON_DURATION_SEC, fxColor: C.poison,
      });
    }
    out.push(behavior(ref, effects));
  }
  return out;
}

/* ---------------- bar / Genie varsayılanları ---------------- */

/** Aktif combat barı 5 slot (Eternal tarzı portrait düzen). Skill kitabında 15'i de var. */
export const ACTIVE_BAR_SLOTS = 5;
export const DEFAULT_ACTIVE_BAR: number[] = [
  ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO, ARCHER.KARA_TAKIP,
  ARCHER.GOLGE_AVCISI, ARCHER.STANDART_ATIS,
];

/** Genie set başına en fazla skill. Aktif barla AYNI OLMAK ZORUNDA DEĞİL. */
export const GENIE_SET_MAX = 6;

/** Varsayılan Genie setleri (oyuncu değiştirebilir). */
export function DEFAULT_GENIE_SETS(): [number[], number[], number[]] {
  return [
    /* Set 1 — Yakın Burst: yalnız 5'li ve 3'lü. Araya Standart Atış SOKULMAZ. */
    [ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO],
    /* Set 2 — Ekonomik */
    [ARCHER.DELICI_OK, ARCHER.IZCI_OKU, ARCHER.STANDART_ATIS],
    /* Set 3 — Elite */
    [ARCHER.KARA_TAKIP, ARCHER.GOLGE_AVCISI, ARCHER.YIRTICI_OK, ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO],
  ];
}

/** Ayar ekranının set/bar düzenlemesinde gösterdiği havuz = 15 skillin tamamı. */
export const GENIE_SKILL_POOL = ARCHER_SKILL_ORDER;

/* Geriye dönük ad'lar (P1.1 testleri ve mevcut kod bunları kullanıyor). */
export const MULTI_SHOT_REF = ARCHER.UCLU_SALVO;
export const ARROW_SHOWER_REF = ARCHER.BESLI_SALVO;
