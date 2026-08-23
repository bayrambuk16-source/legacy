/** tools/validate-content.ts — üretilen içerikte referans bütünlüğü denetimi.
 *  Hata varsa exit 1: build kalite kapısının parçası. */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const GEN = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'game', 'data', 'generated');
const load = <T>(f: string): T => JSON.parse(readFileSync(join(GEN, f), 'utf-8')) as T;

interface Monster { id: string; sourceRef: number; displayName: string; lootTableId: string; hp: number; level: number }
interface LootTable { id: string; slots: Array<{ kind: string; triggerPercent: number; itemId?: number; memberItemIds?: number[] }> }
interface Item { id: string; sourceRef: number; displayName: string; vendorBuy: number }
interface Zone { id: string; displayName: string; role: string; spawns: Array<{ monsterSourceRef: number }> }
interface Merchant { id: string; itemIds: number[] }
interface LevelCurve { rows: Array<{ level: number; requiredExp: number }> }

const monsters = load<Monster[]>('monsters.json');
const loots = load<LootTable[]>('loot_tables.json');
const items = load<Item[]>('items.json');
const zones = load<Zone[]>('zones.json');
const merchants = load<Merchant[]>('merchants.json');
const curve = load<LevelCurve>('level_curve.json');

const errors: string[] = [];
const warns: string[] = [];

const itemIds = new Set(items.map((i) => i.sourceRef));
const lootIds = new Set(loots.map((l) => l.id));
const monsterRefs = new Set(monsters.map((m) => m.sourceRef));

for (const m of monsters) {
  if (!lootIds.has(m.lootTableId)) errors.push(`${m.id}: loot table yok (${m.lootTableId})`);
  if (m.hp <= 0) errors.push(`${m.id}: hp <= 0`);
  if (m.displayName.startsWith('[')) warns.push(`${m.id}: override eksik (${m.displayName})`);
}
for (const l of loots) {
  for (const s of l.slots) {
    if (s.triggerPercent <= 0 || s.triggerPercent > 100) errors.push(`${l.id}: geçersiz oran ${s.triggerPercent}`);
    if (s.kind === 'direct' && !itemIds.has(s.itemId!)) errors.push(`${l.id}: item ${s.itemId} whitelist'te yok`);
    if (s.kind === 'group') for (const id of s.memberItemIds!) if (!itemIds.has(id)) errors.push(`${l.id}: grup üyesi ${id} whitelist'te yok`);
  }
}
for (const z of zones) {
  for (const s of z.spawns) if (!monsterRefs.has(s.monsterSourceRef)) errors.push(`${z.id}: spawn monster ${s.monsterSourceRef} export edilmemiş`);
}
if (!zones.some((z) => z.role === 'hub')) errors.push('hub zone yok');
if (zones.filter((z) => z.role === 'combat').length < 2) errors.push('en az 2 combat zone gerekli');
for (const mc of merchants) {
  for (const id of mc.itemIds) if (!itemIds.has(id)) errors.push(`${mc.id}: item ${id} whitelist'te yok`);
}
if (curve.rows.length !== 80) errors.push(`level eğrisi 80 satır değil: ${curve.rows.length}`);
for (let i = 1; i < curve.rows.length; i++) {
  if (curve.rows[i].requiredExp <= curve.rows[i - 1].requiredExp && curve.rows[i].level > 5)
    warns.push(`level ${curve.rows[i].level}: EXP monoton artmıyor`);
}

console.log(`Doğrulama: ${monsters.length} monster, ${items.length} item, ${zones.length} zone, ${merchants.length} merchant`);
warns.forEach((w) => console.log(`  uyarı: ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`  HATA: ${e}`));
  process.exit(1);
}
console.log('Referans bütünlüğü: OK');
