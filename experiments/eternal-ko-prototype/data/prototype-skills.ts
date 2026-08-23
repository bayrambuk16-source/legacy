/** P1.1 prototip skill davranışları.
 *
 *  Kaynak (skills.json) AUTHORITATIVE kalır: manaCost, requiredLevel, isim oradan gelir.
 *  Burada yalnız prototipin davranış parametreleri var. Multi-shot skillerinin
 *  `effects` listesi BOŞTUR: SkillSystem yalnız kural kapısı + mana + cooldown için
 *  kullanılır, hasar MultiShot çözümleyicisi + ana damageRoll ile uygulanır. */
import type { SkillBehaviorDef } from '../../../src/game/data/skill-behaviors.js';

const BOW = [70, 71];

/** TESPİT EDİLEN KAYNAK KAYITLARI (tahmin değil — KO_Reference_v8.db sorgusu):
 *
 *  skills (MAGIC):
 *    107515 | name_field1 "multiple shot" | skill_level 15 | mana_cost 40
 *           | cast_time 13 | recast_time 0 | effect_type1 2 | skill_group 1075
 *           | source_variant MAGIC_196_NO_EVENT | offset 9522469 | confidence medium
 *    107555 | name_field1 "arrow shower"  | skill_level 55 | mana_cost 150
 *           | cast_time 15 | recast_time 0 | effect_type1 2 | skill_group 1075
 *           | source_variant MAGIC_200_EVENT | offset 8754177 | confidence high
 *
 *  magic_type2 (ok sayısı BURADAN gelir):
 *    107515 | "Multiple Shot" | "Shoot 3 arrows at once" | need_arrow 3
 *           | hit_rate 100 | add_damage 99 | add_range 100
 *    107555 | "Arrow Shower"  | "Shoot 5 arrows at once" | need_arrow 5
 *           | hit_rate 100 | add_damage 99 | add_range 100
 *
 *  NOT: 107515/107555 El Morad okçu dalıdır (skill_group 1075). Karus karşılıkları
 *  207515/207555'tir; prototip tek sınıf kullandığı için yalnız 1075xx alındı. */
export const MULTI_SHOT_REF = 107515;
export const ARROW_SHOWER_REF = 107555;

export const PROTOTYPE_SKILL_BEHAVIORS: SkillBehaviorDef[] = [
  {
    sourceRef: MULTI_SHOT_REF, classes: ['archer'], cooldownSec: 4,
    targeting: 'enemy', weaponKinds: BOW,
    effects: [],   // hasar MultiShot resolver'da — bkz. world/MultiShot.ts
  },
  {
    sourceRef: ARROW_SHOWER_REF, classes: ['archer'], cooldownSec: 9,
    targeting: 'enemy', weaponKinds: BOW,
    effects: [],
  },
];

/* ---------------- Genie varsayılan skill setleri ---------------- */

/** Aktif skill havuzundan Genie setlerine atanan sourceRef'ler.
 *  Sıra ÖNEMLİDİR: Genie soldan sağa ilk KULLANILABİLİR skill'i seçer
 *  (cooldown/mana/seviye/silah/menzil engeli olan atlanır).
 *  AYNI SKILL BİLEREK TEKRAR EDEBİLİR: "arrow shower cooldown'da ise multiple shot,
 *  o da yoksa yine multiple shot dene" gibi bir sıra kurmak mümkün olsun diye
 *  liste tekrarı açıkça desteklenir (Set 1 ve Set 3'te örneği var). */
export const GENIE_SET_1_BURST = [ARROW_SHOWER_REF, MULTI_SHOT_REF, 107505, MULTI_SHOT_REF];
export const GENIE_SET_2_MANA = [MULTI_SHOT_REF, 107510, 107500, 107505];
export const GENIE_SET_3_ELITE = [ARROW_SHOWER_REF, 107500, 107510, MULTI_SHOT_REF, 107505, MULTI_SHOT_REF];

/** Her çağrıda YENİ dizi döndürür — setler mutasyona açıktır (ayar ekranı). */
export function DEFAULT_GENIE_SETS(): [number[], number[], number[]] {
  return [[...GENIE_SET_1_BURST], [...GENIE_SET_2_MANA], [...GENIE_SET_3_ELITE]];
}

/** Ayar ekranının set düzenlemesinde gösterdiği havuz.
 *  YALNIZ SkillRegistry'de DAVRANIŞI olan skiller: skills.json'da bulunup
 *  behavior'ı olmayan kayıtlar (ör. 107725 "light feet") havuzda görünmez —
 *  aksi halde sete eklenip hiç çalışmayan bir satır oluşurdu. */
export const GENIE_SKILL_POOL = [
  ARROW_SHOWER_REF, MULTI_SHOT_REF, 107505, 107510, 107500, 107010,
];
