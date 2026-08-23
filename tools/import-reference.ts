/** tools/import-reference.ts
 *  KO_Reference_v8.db (read-only kaynak) → src/game/data/generated/*.json
 *
 *  Kurallar (brif):
 *  - v8.db canonical kaynaktır; runtime ASLA doğrudan DB okumaz.
 *  - Üretim deterministiktir: aynı DB + aynı konfig → byte-byte aynı çıktı.
 *  - Oyuncuya gösterilen isimler content_overrides.json katmanından gelir;
 *    kaynak isim/ID sadece sourceRef ve sourceName alanlarında debug için tutulur.
 *  - Grup droplarında grup tetik oranı ÜYE oranı DEĞİLDİR: iki aşamalı roll.
 *    Üye seçimi kaynakta tanımsızdır → yeni oyun kararı: uniform (docs/CONTENT_MAPPING.md).
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DB_PATH = join(ROOT, 'reference', 'KO_Reference_v8.db');
const OUT = join(ROOT, 'src', 'game', 'data', 'generated');
const OVERRIDES_PATH = join(ROOT, 'src', 'game', 'data', 'overrides', 'content_overrides.json');

/* ---------------- MVP kapsam konfigürasyonu ---------------- */
/** Seçim ölçütü: Lv1-15 bandı, aktif drop satırı VE spawn kaydı olan canonical kayıtlar. */
const MVP_MONSTER_IDS = [750, 850, 752, 851, 150, 754, 852, 755, 255, 250] as const;
const MVP_ELITE_IDS = [252] as const; // Bulky bulcan → MVP elite/boss
const MVP_MERCHANT_GROUPS = [253, 255] as const; // potion + sundries
/** Başlangıç yayı: items_server kind=70 (Bow), req_level 1, 'Bow (+0)'. */
const STARTER_BOW_NUM = 160100000;
/** Aksesuar whitelist'i (Faz 4.1): MVP drop havuzunda küpe/kolye/kemer yoktu, bu yüzden
 *  o slotlar test edilemiyordu. Ölçüt: kind 91-94, req_level 1, class_code 0 (evrensel),
 *  negatif statlı "curse" varyantları hariç. Sadece whitelist'e girer; drop tablosuna
 *  eklenmez (merchant/quest kaynağı Faz 6). */
const MVP_ACCESSORY_NUMS = [
  310110101, 310110103, // küpe: Bronze / Golden Earring
  320310126, 320310129, // kolye: Iron Necklace / Red Dragon Amulet
  330110258, 330110262, // yüzük: Opal / Emerald Ring
  340110101, 340310108, // kemer: Belt of Life / Bronze Belt
] as const;

interface Json { [k: string]: unknown }

const db = new DatabaseSync(DB_PATH, { readOnly: true });
mkdirSync(OUT, { recursive: true });

/* içerik override katmanı */
interface Overrides {
  monsters: Record<string, { displayName: string; visualKey?: string }>;
  zones: Record<string, { displayName: string; sceneKey?: string }>;
  items: Record<string, { displayName: string; iconKey?: string }>;
  skills: Record<string, { displayName: string; description?: string }>;
}
const overrides: Overrides = existsSync(OVERRIDES_PATH)
  ? JSON.parse(readFileSync(OVERRIDES_PATH, 'utf-8'))
  : { monsters: {}, zones: {}, items: {}, skills: {} };

function stable(obj: unknown): string {
  return JSON.stringify(obj, null, 2) + '\n';
}
function write(name: string, obj: unknown): void {
  writeFileSync(join(OUT, name), stable(obj));
  console.log(`  ✓ ${name}`);
}

const warnings: string[] = [];

/* ---------------- 1) Level eğrisi ---------------- */
const levelRows = db.prepare(
  `SELECT level, required_exp, cumulative_to_level_start FROM level_exp ORDER BY level`
).all() as Array<{ level: number; required_exp: number; cumulative_to_level_start: number }>;

write('level_curve.json', {
  note: 'KO Lv1-80 referans eğrisi. MVP cap 20; mobil pacing için scale profili ProgressionSystem içinde.',
  maxLevelMvp: 20,
  rows: levelRows.map((r) => ({ level: r.level, requiredExp: r.required_exp, cumulativeStart: r.cumulative_to_level_start })),
});

/* ---------------- 2) Monsterlar ---------------- */
interface MonsterRow {
  s_sid: number; str_name: string; s_level: number; i_hp_point: number; s_mp_point: number;
  s_atk: number; s_damage: number; s_ac: number; s_hit_rate: number; s_evade_rate: number;
  s_attack_delay: number; by_speed1: number; by_speed2: number; i_exp: number; i_money: number;
  by_attack_range: number; by_search_range: number; by_tracing_range: number; s_item: number;
}
const monsterStmt = db.prepare(`SELECT * FROM monsters WHERE s_sid = ?`);
const dropStmt = db.prepare(
  `SELECT slot_no, drop_kind, item_or_group_id, rate_percent FROM monster_drops WHERE s_index = ? ORDER BY slot_no`
);
const groupStmt = db.prepare(
  `SELECT item_slot, item_id FROM make_item_groups WHERE group_id = ? AND item_id != 0 ORDER BY item_slot`
);
const itemStmt = db.prepare(`SELECT * FROM items_server WHERE num = ?`);

const wantedItemIds = new Set<number>();
const lootTables: Json[] = [];
const monstersOut: Json[] = [];

function exportMonster(sid: number, tier: 'normal' | 'elite'): void {
  const m = monsterStmt.get(sid) as unknown as MonsterRow | undefined;
  if (!m) { warnings.push(`monster ${sid} bulunamadı`); return; }
  const ov = overrides.monsters[String(sid)];
  if (!ov) warnings.push(`override eksik: monster ${sid} (${m.str_name})`);

  /* loot table */
  const slots: Json[] = [];
  for (const d of dropStmt.all(sid) as Array<{ slot_no: number; drop_kind: string; item_or_group_id: number; rate_percent: number }>) {
    if (d.drop_kind === 'group') {
      const members = (groupStmt.all(d.item_or_group_id) as Array<{ item_slot: number; item_id: number }>)
        .filter((g) => {
          const exists = itemStmt.get(g.item_id) !== undefined;
          if (!exists) warnings.push(`grup ${d.item_or_group_id} üyesi item ${g.item_id} items_server'da yok — atlandı`);
          return exists;
        });
      if (members.length === 0) { warnings.push(`grup ${d.item_or_group_id} çözülemedi — slot atlandı (monster ${sid})`); continue; }
      members.forEach((g) => wantedItemIds.add(g.item_id));
      slots.push({
        kind: 'group',
        triggerPercent: d.rate_percent,
        selection: 'uniform', // YENİ OYUN KARARI — kaynakta üye ağırlığı yok
        memberItemIds: members.map((g) => g.item_id),
        sourceGroupId: d.item_or_group_id,
      });
    } else {
      const exists = itemStmt.get(d.item_or_group_id) !== undefined;
      if (!exists) { warnings.push(`direct drop item ${d.item_or_group_id} items_server'da yok — atlandı (monster ${sid})`); continue; }
      wantedItemIds.add(d.item_or_group_id);
      slots.push({ kind: 'direct', triggerPercent: d.rate_percent, itemId: d.item_or_group_id });
    }
  }
  const lootId = `loot_${sid}`;
  lootTables.push({ id: lootId, coin: m.i_money, slots });

  monstersOut.push({
    id: `mob_${sid}`,
    sourceRef: sid,
    sourceName: m.str_name,
    displayName: ov?.displayName ?? `[${m.str_name}]`,
    visualKey: ov?.visualKey ?? 'kurt',
    tier,
    level: m.s_level,
    hp: m.i_hp_point,
    attack: m.s_damage,
    defense: m.s_ac,
    hitRate: m.s_hit_rate,
    evadeRate: m.s_evade_rate,
    attackDelayMs: m.s_attack_delay,
    moveSpeed: m.by_speed1,
    exp: m.i_exp,
    attackRange: m.by_attack_range,
    searchRange: m.by_search_range,
    lootTableId: lootId,
  });
}
MVP_MONSTER_IDS.forEach((id) => exportMonster(id, 'normal'));
MVP_ELITE_IDS.forEach((id) => exportMonster(id, 'elite'));
write('monsters.json', monstersOut);
write('loot_tables.json', lootTables);

/* ---------------- 3) Itemlar (whitelist) ---------------- */
/* merchant gruplarındaki itemler + drop itemleri + starter bow */
const merchantItemsStmt = db.prepare(
  `SELECT num FROM items_server WHERE selling_group = ? ORDER BY num`
);
for (const g of MVP_MERCHANT_GROUPS) {
  for (const r of merchantItemsStmt.all(g) as Array<{ num: number }>) wantedItemIds.add(r.num);
}
wantedItemIds.add(STARTER_BOW_NUM);
for (const n of MVP_ACCESSORY_NUMS) wantedItemIds.add(n);

interface ItemRow {
  num: number; name: string; kind: number; slot: number; damage: number; delay: number;
  range_value: number; ac: number; buy_price: number; sell_price: number; countable: number;
  req_level: number; class_code: number; selling_group: number; str_bonus: number; sta_bonus: number; dex_bonus: number;
  intel_bonus: number; cha_bonus: number; max_hp_bonus: number; max_mp_bonus: number;
  fire_damage: number; ice_damage: number; lightning_damage: number; poison_damage: number;
}

/** Kaynak slot kodu → yeni oyunun 12 slotluk ekipman tipi.
 *  Gözlemlenen semantik (DB denetimi): 0-4 silah aileleri (2 kalkan, 4 yay),
 *  5 pauldron/chest, 6 pads/pants, 7 helmet, 8 gloves, 9 boots,
 *  10 earring, 11 necklace, 12 ring, 14 belt; 15/17 tüketilebilir/scroll. */
function equipSlotOf(it: ItemRow): string | null {
  if (it.countable === 1) return null;
  switch (it.slot) {
    case 0: case 1: case 3: case 4: return 'weapon';
    case 2: return 'shield'; // 12 slot düzeninde yeri yok; classReq zaten engeller
    case 5: return 'chest';
    case 6: return 'pants';
    case 7: return 'helmet';
    case 8: return 'gloves';
    case 9: return 'boots';
    case 10: return 'earring';
    case 11: return 'necklace';
    case 12: return 'ring';
    case 14: return 'belt';
    default: return null;
  }
}

/** Ekipman tipine göre varsayılan ikon (Legacy es_okcu seti). */
function defaultIcon(it: ItemRow): string {
  const slotIcon: Record<string, string> = {
    weapon: 'es_okcu_silah', shield: 'es_okcu_yardimci',
    helmet: 'es_okcu_kask', chest: 'es_okcu_zirh', pants: 'es_okcu_pantolon',
    gloves: 'es_okcu_eldiven', boots: 'es_okcu_bot',
    earring: 'es_okcu_tilsim', necklace: 'es_okcu_kolye', ring: 'es_okcu_yuzuk',
    belt: 'es_okcu_yardimci',
  };
  const slot = equipSlotOf(it);
  if (slot && slotIcon[slot]) return slotIcon[slot];
  return it.countable === 1 ? 'es_okcu_tilsim' : 'hud_tas';
}

/** İsimdeki "(+N)" eki: kaynak droplar hazır-yükseltilmiş item varyantları içerir.
 *  Yeni oyunda bu, instance'ın başlangıç upgradeLevel değeri olur. */
function baseUpgradeOf(name: string): number {
  const m = /\(\+(\d+)\)/.exec(name);
  return m ? Number(m[1]) : 0;
}
const kindMap = db.prepare(`SELECT * FROM kind_lookup`).all() as Array<Json>;
const kindLookup = new Map<number, string>();
for (const k of kindMap) kindLookup.set(k.kind as number, (k.label ?? k.name ?? '') as string);

function categoryOf(it: ItemRow): string {
  // Kaba sınıflama; adapter katmanı — CONTENT_MAPPING.md'de belgelendi
  if (it.countable === 1) return 'consumable';
  if (it.damage > 0) return 'weapon';
  if (it.ac > 0) return 'armor';
  return 'material';
}

const itemsOut: Json[] = [...wantedItemIds].sort((a, b) => a - b).map((num) => {
  const it = itemStmt.get(num) as unknown as ItemRow | undefined;
  if (!it) { warnings.push(`item ${num} bulunamadı`); return null; }
  const ov = overrides.items[String(num)];
  return {
    id: `item_${num}`,
    sourceRef: num,
    sourceName: it.name,
    displayName: ov?.displayName ?? `[${it.name.replace(/\s*\(\+\d+\)/, '')}]`,
    iconKey: ov?.iconKey ?? defaultIcon(it),
    category: categoryOf(it),
    kindSource: kindLookup.get(it.kind) ?? String(it.kind),
    kindCode: it.kind,
    equipSlot: equipSlotOf(it),
    classCode: it.class_code,
    baseUpgradeLevel: baseUpgradeOf(it.name),
    damage: it.damage,
    defense: it.ac,
    attackDelayMs: it.delay,
    range: it.range_value,
    reqLevel: it.req_level,
    vendorBuy: it.buy_price,
    vendorSell: it.sell_price,
    stackable: it.countable === 1,
    sellingGroup: it.selling_group,
    bonuses: {
      str: it.str_bonus, sta: it.sta_bonus, dex: it.dex_bonus,
      int: it.intel_bonus, hp: it.max_hp_bonus, mp: it.max_mp_bonus,
    },
    elemental: {
      fire: it.fire_damage, ice: it.ice_damage,
      lightning: it.lightning_damage, poison: it.poison_damage,
    },
  };
}).filter((x) => x !== null) as Json[];
write('items.json', itemsOut);

/* ---------------- 4) Zone + spawn ----------------
 * YENİ OYUN KARARI: seçilen MVP monsterlarının tamamı kaynakta zone 21'de
 * (Moradon, başlangıç bölgesi) spawn oluyor. Yeni oyunda hub ile savaş alanı
 * ayrı sahneler olduğundan zone 21'in spawn listesi seviye bandına göre iki
 * sanal combat zone'a bölünür (1-7 → A, 8+ → B). Bu bölümleme kaynak veriden
 * türetilmiş gibi sunulmaz; docs/CONTENT_MAPPING.md'de belgelenmiştir. */
const SOURCE_SPAWN_ZONE = 21;
const ZONE_A_MAX_LEVEL = 7;

const zoneStmt = db.prepare(`SELECT * FROM zones WHERE zone_no = ?`);
const spawnStmt = db.prepare(
  `SELECT npc_id, num_npc, reg_time, left_x, top_z, right_x, bottom_z FROM npc_positions
   WHERE zone_id = ? AND entity_kind = 'monster' AND npc_id IN (${[...MVP_MONSTER_IDS, ...MVP_ELITE_IDS].join(',')})
   ORDER BY spawn_ref_id`
);
const startStmt = db.prepare(`SELECT * FROM start_positions WHERE zone_id = ?`);

const srcZone = zoneStmt.get(SOURCE_SPAWN_ZONE) as Json;
const srcStart = startStmt.get(SOURCE_SPAWN_ZONE) as Json | undefined;
const allSpawns = (spawnStmt.all(SOURCE_SPAWN_ZONE) as Array<Json>).map((s) => ({
  monsterSourceRef: s.npc_id as number,
  count: s.num_npc,
  // Kaynak reg_time birimi doğrulanmadı (brif uyarısı) — normalize saniye MVP config'te
  regTimeSourceRaw: s.reg_time,
  rect: { left: s.left_x, top: s.top_z, right: s.right_x, bottom: s.bottom_z },
}));
const monsterLevel = new Map(monstersOut.map((m) => [m.sourceRef as number, m.level as number]));

function virtualZone(key: 'hub' | 'combat_a' | 'combat_b'): Json {
  const ov = overrides.zones[key];
  if (!ov) warnings.push(`override eksik: zone ${key}`);
  const spawns = key === 'hub' ? [] : allSpawns.filter((s) => {
    const lv = monsterLevel.get(s.monsterSourceRef) ?? 0;
    return key === 'combat_a' ? lv <= ZONE_A_MAX_LEVEL : lv > ZONE_A_MAX_LEVEL;
  });
  return {
    id: `zone_${key}`,
    sourceRef: SOURCE_SPAWN_ZONE,
    sourceName: srcZone.zone_name,
    displayName: ov?.displayName ?? `[${key}]`,
    sceneKey: ov?.sceneKey ?? (key === 'hub' ? 'hub' : 'combat'),
    role: key === 'hub' ? 'hub' : 'combat',
    spawns,
    startPosition: srcStart ? { x: srcStart.karus_x, z: srcStart.karus_z } : null,
  };
}
const zonesOut: Json[] = [virtualZone('hub'), virtualZone('combat_a'), virtualZone('combat_b')];
write('zones.json', zonesOut);

/* ---------------- 5) Skilller ---------------- */
/* MVP: açık ID listesi — okçu archery kayıtları + hız buffları.
 * 102003 Archery, 107500 through shot, 107505 fire arrow, 107510 arrow shower(varsa),
 * 107010 swift, 107725 light feet. */
/* 107515 multiple shot (3 ok) ve 107555 arrow shower (5 ok) EXPERIMENT P1.1 için
   whitelist'e eklendi — yalnız VERİ eklemesidir; ana oyunun SKILL_BEHAVIORS listesi
   bunları tanımadığı için ana oynanış değişmez. */
/* ARCHER COMBAT V1: 15 okçu skilli + iki eski buff (107010 swift, 107725 light feet).
   1075xx = El Morad okçu dalı; 108570 "Dark pursuer" 1085 (usta) dalındadır — Lv70
   karşılığı 1075 grubunda YOKTUR, bu yüzden bilerek 1085'ten alınmıştır.
   Bu yalnız VERİ eklemesidir: ana oyunun SKILL_BEHAVIORS listesi yeni ID'leri
   tanımadığı için ana oynanış değişmez. */
const MVP_SKILL_IDS = [
  102003,                                                   // Archery      → Standart Atış
  107500, 107505, 107510, 107515, 107520, 107525,           // Lv0-25
  107530, 107535, 107540, 107545, 107550, 107555, 107560,   // Lv30-60
  108570,                                                   // Dark pursuer → Kara Takip (Lv70)
  107010, 107725,                                           // eski buff'lar (geriye dönük)
] as const;
const skillRows = db.prepare(
  `SELECT magic_num, display_name, skill_level, mana_cost, cast_time, recast_time, success_rate,
          effect_type1, effect_type2, range_value
   FROM skills
   WHERE magic_num IN (${MVP_SKILL_IDS.join(',')})
   ORDER BY skill_level, magic_num`
).all() as Array<Json>;
for (const id of MVP_SKILL_IDS) {
  if (!skillRows.some((s) => s.magic_num === id)) warnings.push(`skill ${id} kaynakta bulunamadı`);
}

const skillsOut = skillRows.map((s) => {
  const ov = overrides.skills[String(s.magic_num)];
  return {
    id: `skill_${s.magic_num}`,
    sourceRef: s.magic_num,
    sourceName: s.display_name,
    displayName: ov?.displayName ?? `[${s.display_name}]`,
    description: ov?.description ?? '',
    level: s.skill_level,
    manaCost: s.mana_cost,
    // Kaynak cast/recast birimi görülmeden ms varsayma (brif) — normalizasyon SkillSystem config'te
    castTimeSourceRaw: s.cast_time,
    recastTimeSourceRaw: s.recast_time,
    successRate: s.success_rate,
    type1: s.effect_type1,
    type2: s.effect_type2,
    rangeSourceRaw: s.range_value,
  };
});
write('skills.json', skillsOut);

/* ---------------- 6) Merchant ---------------- */
const merchantsOut = MVP_MERCHANT_GROUPS.map((g) => {
  const items = (merchantItemsStmt.all(g) as Array<{ num: number }>).map((r) => r.num);
  return {
    id: `merchant_${g}`,
    sourceSellingGroup: g,
    role: g === 253 ? 'potion' : 'sundries',
    itemIds: items,
  };
});
write('merchants.json', merchantsOut);

/* ---------------- 7) Upgrade eğrisi ---------------- */
const curve = db.prepare(
  `SELECT mode, display_level, probability_percent FROM upgrade_curve_summary ORDER BY mode, display_level`
).all() as Array<Json>;
write('upgrade_curve.json', {
  note: 'Kaynak referans eğrileri (BUS / TRINA_BUS). MVP profili UpgradeSystem config: kaynak eğri + yumuşatma.',
  source: curve,
});

/* ---------------- rapor ---------------- */
console.log(`\nItem whitelist: ${itemsOut.length} / 62954`);
console.log(`Monster: ${monstersOut.length}, zone: ${zonesOut.length}, skill: ${skillsOut.length}`);
if (warnings.length) {
  console.log(`\nUYARILAR (${warnings.length}):`);
  const uniq = [...new Set(warnings)];
  uniq.slice(0, 30).forEach((w) => console.log(`  ! ${w}`));
  if (uniq.length > 30) console.log(`  ... ve ${uniq.length - 30} uyarı daha`);
}
db.close();
console.log('\nImport tamam.');
