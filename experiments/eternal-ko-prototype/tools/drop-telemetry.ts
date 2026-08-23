/** P1.7 — DROP & LOOT TELEMETRİSİ (headless).
 *  Çalıştırma: npm run telemetry:drops
 *
 *  Basar:
 *    §2/§26 kaynak zinciri (3 farm mobu)
 *    §27    deterministik RNG kanıtı
 *    §7-§9  Auto Loot ON / ON+dolu / OFF teslimat yolları
 *    §37/38 Genie ON senaryolarında 30 sn farm sonucu */
import { PrototypeState } from '../state.js';
import { Content } from '../../../src/game/data/GameContentRepository.js';
import { PLAYER } from '../../../src/game/config.js';
import { dropProfile, LOOT_LIFETIME_DEFAULT, DROP_TUNING_V1 } from '../data/drop-profile.js';
import type { WorldMob } from '../world/types.js';
import type { DropEvent } from '../world/DropSystem.js';

const SEED = 20260822;

function rig(mode: 'auto' | 'manual', seed = SEED): PrototypeState {
  const S = new PrototypeState(seed);
  S.mobs.mobs.length = 0;
  S.worldLoot.clear();
  S.lootPolicy.setMode(mode);
  return S;
}
function killable(S: PrototypeState, x: number, y: number, ref: number): WorldMob {
  const m = {
    uid: 90000 + S.mobs.mobs.length, monster: Content.monster(ref)!,
    x, y, worldX: x, worldY: y, hp: 10, maxHp: 10, attackTimer: 0, state: 'walk',
    deathTimer: 0, status: [], slotId: 'tel_slot', generation: 1, combatRadius: 40,
    ai: 'idle', homeX: x, homeY: y, respawnTimer: 0, facing: 1, animT: 0,
  } as unknown as WorldMob;
  S.mobs.mobs.push(m);
  return m;
}
function kill(S: PrototypeState, m: WorldMob): DropEvent {
  m.hp = 0; m.state = 'dying';
  return S.reapDead().find((r) => r.drop.mobUid === m.uid)!.drop;
}

console.log('# P1.7 — DROP & LOOT TELEMETRİSİ\n');

/* ---------------- §2 / §26 KAYNAK ZİNCİRİ ---------------- */
console.log('## §2/§26 — KAYNAK ZİNCİRİ (KO_Reference_v8.db)\n');
console.log('```');
console.log('monsters.s_sid → monster_drops.s_index');
console.log('  slot_no 1..5 · drop_kind · item_or_group_id · rate_raw (ON BİNDE BİR)');
console.log('    direct_item → items_server.num');
console.log('    group       → make_item_groups.group_id → item_id[] → items_server.num');
console.log('monsters.i_money → coin');
console.log('```\n');
for (const ref of [750, 851, 252]) {
  const p = dropProfile(ref);
  if (!p) { console.log(`- ${ref}: PROFİL YOK`); continue; }
  const m = Content.monster(ref)!;
  console.log(`### ${m.displayName} (s_sid=${ref}, ${p.source.lootTableId})\n`);
  console.log('| Yuva | Tür | rate_raw | % | Hedef | Üye | Seçim |');
  console.log('|---:|---|---:|---:|---|---:|---|');
  for (const s of p.source.slots) {
    const target = s.kind === 'direct'
      ? `${s.itemRef} · ${Content.item(s.itemRef!)?.displayName ?? '?'}`
      : `grup ${s.groupRef}`;
    console.log(`| ${s.slotNo} | ${s.kind} | ${s.rateRaw} | ${s.triggerPercent} | ${target}`
      + ` | ${s.memberItemRefs.length || '—'} | ${s.selection ?? '—'} |`);
  }
  console.log(`\ncoin (i_money) = **${p.source.coin}**`);
  console.log(`> yuva oranları toplamı %${p.source.slots.reduce((n, s) => n + s.triggerPercent, 0)}`
    + ' → yuvalar BAĞIMSIZ atılır\n');
}

/* ---------------- §27 DETERMİNİZM ---------------- */
console.log('## §27 — DETERMİNİSTİK RNG (100 kill · Toprak Solucanı)\n');
{
  const seq = (seed: number): { line: string; items: number } => {
    const S = rig('auto', seed);
    const out: string[] = [];
    let items = 0;
    for (let i = 0; i < 100; i++) {
      const ev = kill(S, killable(S, 1000 + i, 1000, 750));
      items += ev.records.filter((r) => r.kind === 'item').length;
      out.push(ev.records.map((r) => r.itemRef).join('+') || '-');
    }
    return { line: out.slice(0, 8).join(' · '), items };
  };
  const a = seq(4242), b = seq(4242), c = seq(9999);
  console.log('| Koşu | tohum | ilk 8 kill | toplam item |');
  console.log('|---|---:|---|---:|');
  console.log(`| A | 4242 | ${a.line} | ${a.items} |`);
  console.log(`| B | 4242 | ${b.line} | ${b.items} |`);
  console.log(`| C | 9999 | ${c.line} | ${c.items} |`);
  console.log(`\n> A ≡ B: **${a.line === b.line && a.items === b.items ? 'EVET' : 'HAYIR'}**`
    + ` · A ≠ C: **${a.line !== c.line ? 'EVET' : 'HAYIR'}**\n`);
}

/* ---------------- TESLİMAT YOLLARI ---------------- */
console.log('## §7–§9 — TESLİMAT YOLLARI (Bataklık Reisi, 5 yuva)\n');
console.log('| Senaryo | Auto Loot | Çanta | item kaydı | teslimat | yerde | coin |');
console.log('|---|---|---|---:|---|---:|---|');
{
  /* A) Auto Loot ON, çanta boş, mob 1000 birim UZAKTA */
  const A = rig('auto');
  const evA = kill(A, killable(A, A.world.worldX + 1000, A.world.worldY, 252));
  const iA = evA.records.filter((r) => r.kind === 'item');
  console.log(`| 1000 birim uzakta | AÇIK | boş | ${iA.length}`
    + ` | ${[...new Set(iA.map((r) => r.delivery))].join(',') || '—'} | ${A.worldLoot.count}`
    + ` | ${evA.coin} → ${evA.coinDelivery} |`);

  /* B) Auto Loot ON, çanta DOLU */
  const B = rig('auto');
  while (B.inventory.add(PLAYER.starterWeaponRef).ok) { /* doldur */ }
  const evB = kill(B, killable(B, B.world.worldX + 700, B.world.worldY, 252));
  const iB = evB.records.filter((r) => r.kind === 'item');
  console.log(`| çanta dolu | AÇIK | DOLU | ${iB.length}`
    + ` | ${[...new Set(iB.map((r) => r.delivery))].join(',') || '—'} | ${B.worldLoot.count}`
    + ` | ${evB.coin} → ${evB.coinDelivery} |`);
  for (const l of B.worldLoot.items) {
    console.log(`|   ↳ loot #${l.lootUid} | | | | ${Content.item(l.itemRef)?.displayName ?? l.itemRef}`
      + ` | ${Math.round(l.worldX)},${Math.round(l.worldY)} = mobun ölüm noktası | sahip ${l.ownerPlayerId} |`);
  }

  /* C) Auto Loot OFF */
  const C = rig('manual');
  const evC = kill(C, killable(C, C.world.worldX + 40, C.world.worldY, 252));
  const iC = evC.records.filter((r) => r.kind === 'item');
  console.log(`| yakında ölüm | KAPALI | boş | ${iC.length}`
    + ` | ${[...new Set(iC.map((r) => r.delivery))].join(',') || '—'} | ${C.worldLoot.count}`
    + ` | ${evC.coin} → ${evC.coinDelivery} |`);
}
console.log(`\n> Auto Loot MESAFESİZDİR · manuel toplama yarıçapı ${DROP_TUNING_V1.pickupRadius}`
  + ` · loot ömrü ${LOOT_LIFETIME_DEFAULT} sn\n`);

/* ---------------- §37/§38 GENIE FARM ---------------- */
console.log('## §37/§38 — GENIE 30 SN FARM\n');
console.log('| Auto Loot | kill | item | envanter | yer | altın | yerdeki tepe | sınır dışı |');
console.log('|---|---:|---:|---:|---:|---:|---:|---|');
for (const mode of ['auto', 'manual'] as const) {
  const S = new PrototypeState(1820);
  S.infiniteMp = true;
  S.lootPolicy.setMode(mode);
  S.genie.settings.hpPotionRef = null;
  S.genie.settings.mpPotionRef = null;
  S.mobs.ai.respawnOverrideSec = 3;
  S.genie.start(S.world);
  const center = { ...S.genie.farmCenter! };
  const dt = 1 / 60;
  let peak = 0, maxOut = 0;
  for (let i = 0; i < Math.round(30 / dt); i++) {
    const mv = S.genie.movementIntent(S.entities(), S.world);
    if (mv.magnitude > 0) { S.movement.move(S.world, mv, dt); S.genie.clampPlayer(S.world); }
    S.player.update(dt); S.combat.update(dt); S.adapter.updateAction(dt); S.updateInfiniteMp();
    S.stepCombat(dt, S.entities());
    S.mobs.update(dt, S.world);
    S.tickStatuses(dt, S.entities());
    S.worldLoot.update(dt);
    S.reapDead();
    S.genie.update(dt, S.entities(), S.world);
    peak = Math.max(peak, S.worldLoot.count);
    maxOut = Math.max(maxOut, Math.hypot(S.world.worldX - center.x, S.world.worldY - center.y));
  }
  const t = S.drops.totals;
  console.log(`| ${mode === 'auto' ? 'AÇIK' : 'KAPALI'} | ${t.kills} | ${t.items}`
    + ` | ${t.toInventory} | ${t.toGround} | ${t.coin} | ${peak}`
    + ` | ${maxOut <= S.genie.settings.farmBoundaryRadius + 0.01 ? 'HAYIR ✓' : 'EVET ✗'} |`);
}
console.log('\n> Genie loot toplamak için HAREKET ETMEZ; yerdeki lootu kovalamaz.');
