/** P1.8 — ITEM / EQUIPMENT / BUILD TELEMETRİSİ (headless).
 *  Çalıştırma: npm run telemetry:items */
import { PrototypeState } from '../state.js';
import { Content } from '../../../src/game/data/GameContentRepository.js';
import {
  ARCHER_ACCESSORIES, ARCHER_ARMOR, ARCHER_WEAPONS, allDefinitions,
} from '../data/item-catalog.js';
import { ITEM_CLASS_COLOR, ITEM_CLASS_LABEL, resolveStats } from '../data/item-model.js';
import { ARCHER } from '../data/archer-balance.js';

console.log('# P1.8 — ITEM CLASS + EQUIPMENT + BUILD TELEMETRİSİ\n');

/* ---- SINIF / RENK ---- */
console.log('## §1 — ITEM SINIFI (kaynakta rarity kolonu YOK → PROJECT LEGACY)\n');
console.log('| Sınıf | Etiket | Renk |');
console.log('|---|---|---|');
for (const [k, v] of Object.entries(ITEM_CLASS_COLOR)) {
  console.log(`| ${k} | ${ITEM_CLASS_LABEL[k as keyof typeof ITEM_CLASS_LABEL]} | \`${v}\` |`);
}

/* ---- KATALOG ---- */
const row = (d: (typeof ARCHER_WEAPONS)[number] | (typeof ARCHER_ARMOR)[number]
  | (typeof ARCHER_ACCESSORIES)[number]): string => {
  const s = resolveStats(d);
  const p: string[] = [];
  if (s.attack) p.push(`atk ${s.attack}`);
  if (s.defense) p.push(`def ${s.defense}`);
  for (const [k, v] of Object.entries(s.elemental)) if (v > 0) p.push(`${k} ${v}`);
  for (const [k, v] of ([['STR', s.str], ['DEX', s.dex], ['INT', s.int], ['STA', s.sta]] as const)) {
    if (v > 0) p.push(`${k} ${v}`);
  }
  if (s.maxHp) p.push(`HP ${s.maxHp}`);
  if (s.maxMp) p.push(`MP ${s.maxMp}`);
  for (const [k, v] of Object.entries(s.resist)) if (v > 0) p.push(`r-${k} ${v}`);
  if (s.special.hpDrain) p.push(`hpDrain ${s.special.hpDrain}`);
  if (s.special.mpDrain) p.push(`mpDrain ${s.special.mpDrain}`);
  return `| ${d.displayName} | ${d.itemClass} | ${d.equipSlot} | ${d.definitionRef}`
    + ` | ${d.source.sourceRef} | ${p.join(' · ')} |`;
};
for (const [title, list] of [
  ['§28 SİLAHLAR', ARCHER_WEAPONS], ['§29 ZIRHLAR', ARCHER_ARMOR], ['§30 AKSESUARLAR', ARCHER_ACCESSORIES],
] as const) {
  console.log(`\n## ${title}\n`);
  console.log('| Ad | Sınıf | Slot | defRef | kaynak | Statlar |');
  console.log('|---|---|---|---:|---:|---|');
  for (const d of list) console.log(row(d));
}

/* ---- YASAK DENETİMİ ---- */
console.log('\n## §35/§36 — YASAK DENETİMİ\n');
let weaponPrimary = 0, crit = 0;
for (const w of ARCHER_WEAPONS) {
  const s = resolveStats(w);
  if (s.str || s.dex || s.int || s.sta) weaponPrimary += 1;
}
const scan = (o: unknown): void => {
  if (o === null || typeof o !== 'object') return;
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
    if (/crit/i.test(k)) crit += 1;
    scan(v);
  }
};
for (const d of allDefinitions()) scan(d.stats);
console.log(`- Silahta primary stat taşıyan tanım: **${weaponPrimary}** (olması gereken: 0)`);
console.log(`- Herhangi bir tanımda kritik alanı: **${crit}** (olması gereken: 0)`);
console.log(`- Toplam tanım: ${allDefinitions().length}`
  + ` (${ARCHER_WEAPONS.length} silah · ${ARCHER_ARMOR.length} zırh · ${ARCHER_ACCESSORIES.length} aksesuar)`);

/* ---- BUILD ---- */
console.log('\n## §19/§41 — BUILD (taban / ekipman / toplam)\n');
const S = new PrototypeState(20260822);
const before = S.stats.build();
S.giveTestGear();
const after = S.stats.build();
console.log('| Stat | taban | ekipman | toplam |');
console.log('|---|---:|---:|---:|');
const r2 = (n: string, b: number, e: number): void =>
  console.log(`| ${n} | ${b} | +${e} | ${b + e} |`);
r2('Attack', after.base.attack, after.equipment.attack);
r2('Defense', after.base.defense, after.equipment.defense);
r2('STR', after.base.str, after.equipment.str);
r2('DEX', after.base.dex, after.equipment.dex);
r2('INT', after.base.int, after.equipment.int);
r2('STA', after.base.sta, after.equipment.sta);
r2('Max HP', after.base.maxHp, after.equipment.maxHp);
r2('Max MP', after.base.maxMp, after.equipment.maxMp);
console.log(`\nDirenç: ${JSON.stringify(after.resist)}`);
console.log(`Silah elementali: ${JSON.stringify(after.weaponElemental)} (DoT DEĞİL)`);
console.log(`Özel: ${JSON.stringify(after.special)}`);
console.log(`\nOyuncu maxHP ${Math.round(S.player.maxHp)} · maxMP ${Math.round(S.player.maxMp)}`
  + ` (kuşanmadan önce ${before.total.maxHp} / ${before.total.maxMp})`);

console.log('\n### Kuşanılı 12 slot\n');
console.log('| Slot | Item | Sınıf | instanceId | defRef |');
console.log('|---|---|---|---:|---:|');
for (const s of S.stats.slots()) {
  console.log(`| ${s.label} | ${s.definition?.displayName ?? '—'} | ${s.itemClass ?? '—'}`
    + ` | ${s.instanceId ?? '—'} | ${s.definitionRef ?? '—'} |`);
}

/* ---- ELEMENTAL AYRIMI ---- */
console.log('\n## §21/§37 — SİLAH ELEMENTALİ AYRI BİLEŞEN\n');
for (const cls of ['LOW', 'RARE', 'UNIQUE'] as const) {
  const T = new PrototypeState(20260823);
  T.infiniteMp = true;
  const bow = ARCHER_WEAPONS.find((w) => w.itemClass === cls)!;
  const add = T.inventory.add(bow.definitionRef);
  if (add.ok) T.equipService.equip(add.instance.instanceId);
  const mob = T.mobs.mobs.find((m) => m.slotId === 'fa_a3')!;
  mob.hp = 1e9; mob.maxHp = 1e9;
  T.world.worldX = mob.worldX - 100; T.world.worldY = mob.worldY;
  T.targets.select(mob.uid);
  const hits = T.resolveCastToImpact(ARCHER.STANDART_ATIS, mob, T.entities())
    .impacts.filter((i) => i.invalid === null);
  const h = hits[0]!;
  let ticks = 0;
  for (let i = 0; i < 60 * 8; i++) ticks += T.tickStatuses(1 / 60, T.entities()).length;
  console.log(`- **${bow.displayName}** (${cls}) → fiziksel **${h.physicalDamage}**`
    + ` · silah elementali **${h.weaponElementalDamage}** ${JSON.stringify(h.weaponElemental)}`
    + ` · toplam **${h.damage}** · yapışan status **${(mob.status ?? []).length}**`
    + ` · DoT tiki **${ticks}**`);
}
console.log('\n> Silah zehri bir HASAR BİLEŞENİDİR; status üretmez, tik atmaz (§4).');

/* ---- KAYNAK AYRIMI ---- */
console.log('\n## §2 — KAYNAK GERÇEĞİ / PROJECT LEGACY AYRIMI\n');
console.log('| Item | kaynak damage/ac | Project Legacy atk/def | kaynak bonusları | atılan alanlar |');
console.log('|---|---:|---:|---|---|');
for (const w of ARCHER_WEAPONS) {
  const s = resolveStats(w);
  const b = w.source.sourceBonuses;
  console.log(`| ${w.displayName} | ${w.source.damage} | ${s.attack}`
    + ` | str${b.str} dex${b.dex} int${b.int} sta${b.sta} | ${w.droppedSourceFields.join(', ')} |`);
}
for (const a of ARCHER_ARMOR.slice(0, 3)) {
  const s = resolveStats(a);
  const b = a.source.sourceBonuses;
  console.log(`| ${a.displayName} | ${a.source.defense} | ${s.defense}`
    + ` | str${b.str} dex${b.dex} int${b.int} sta${b.sta} | ${a.droppedSourceFields.join(', ') || '—'} |`);
}
void Content;
