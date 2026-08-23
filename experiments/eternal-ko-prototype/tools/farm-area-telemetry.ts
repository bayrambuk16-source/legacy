/** P1.6 — MOB AI + FARM AREA TELEMETRİSİ (headless, renderer YOK).
 *  Çalıştırma: npm run telemetry:mobs
 *
 *  Ölçülenler:
 *    §29 mob durum makinesi geçişleri, aggro sebebi, leash/return davranışı
 *    §30 farm alanı yerleşimi ve slot dolulukları
 *    FPS bağımsızlığı (30/60/120) ve respawn preset davranışı */
import { PrototypeState } from '../state.js';
import { FARM_AREA_SLOTS } from '../data/farm-area.js';
import { MOB_AI_PROFILES, MOB_AI_TYPES, RESPAWN_OPTIONS } from '../data/mob-ai-profiles.js';
import { profileFor } from '../world/MobAi.js';
import { MobSlotSystem } from '../world/MobSlotSystem.js';
import { SPAWN_POINT } from '../data/world-map.js';
import { mulberry32 } from '../../../src/engine/rng.js';
import { Content } from '../../../src/game/data/GameContentRepository.js';
import type { MobSpawnSlot } from '../data/farm-area.js';
import type { PlayerWorldState } from '../world/types.js';

const SEED = 20260822;
const player = (x: number, y: number): PlayerWorldState => ({
  worldX: x, worldY: y, facing: 1, facingAngle: 0, travelled: 0,
  moveX: 0, moveY: 0, moving: false, animT: 0,
});

function rig(over: Partial<MobSpawnSlot>, seed = SEED) {
  const slot: MobSpawnSlot = {
    id: 'tel', displayName: 'Telemetri', monsterRef: 250,
    homeX: 0, homeY: 0, aiType: 'NORMAL',
    visual: { sheet: 'kurt', tint: '#fff', scale: 0.6 }, ...over,
  };
  let hits = 0;
  const sys = new MobSlotSystem([slot], {
    rng: mulberry32(seed), aggroMult: () => 1, playerAlive: () => true,
    strike: (mob) => { hits += 1; return { mob, damage: 1, playerHpAfter: 1 }; },
  });
  sys.populate();
  return { sys, slot, mob: sys.mobs[0]!, hits: () => hits };
}

console.log('# P1.6 — MOB AI + FARM AREA TELEMETRİSİ\n');

/* ---------------- §2 PROFİLLER ---------------- */
console.log('## §2 — DAVRANIŞ PROFİLLERİ (PROJECT LEGACY TUNING)\n');
console.log('| Tip | aggroR | leashR | roamR | hız | kovala | attackR | enter/leave | çevrim | vuruş anı | respawn |');
console.log('|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|');
for (const t of MOB_AI_TYPES) {
  const p = MOB_AI_PROFILES[t];
  console.log(`| ${t} | ${p.aggroRadius} | ${p.leashRadius} | ${p.roamRadius} | ${p.moveSpeed} | ${p.chaseSpeed}`
    + ` | ${p.attackRange} | ${p.enterAttack}/${p.leaveAttack} | ${p.attackIntervalSec}s | ${p.hitMomentSec}s | ${p.respawnSec}s |`);
}
console.log('\n> NORMAL `aggroRadius = 0` → PASİF: yalnız HASAR ALINCA uyanır.\n');

/* ---------------- §3 FARM ALANI ---------------- */
console.log('## §3 — FARM ALANI YERLEŞİMİ\n');
console.log('| Slot | Ad | ref | AI | Spawn\'a uzaklık | Kaynak lv/HP/atk |');
console.log('|---|---|---:|---|---:|---|');
for (const s of FARM_AREA_SLOTS) {
  const m = Content.monster(s.monsterRef)!;
  const d = Math.hypot(s.homeX - SPAWN_POINT.x, s.homeY - SPAWN_POINT.y);
  console.log(`| ${s.id} | ${s.displayName} | ${s.monsterRef} | ${s.aiType} | ${d.toFixed(0)}`
    + ` | lv${m.level} · ${m.hp} hp · ${m.attack} atk |`);
}
console.log('');

/* ---------------- §29 DURUM GEÇİŞLERİ ---------------- */
console.log('## §29 — DURUM MAKİNESİ GEÇİŞLERİ\n');
{
  const r = rig({ aiType: 'AGGRESSIVE' });
  const p = profileFor(r.slot, 'AGGRESSIVE');
  const seq: string[] = [];
  const push = (): void => {
    const ph = r.sys.ai.runtimeOf(r.mob.uid)!.phase;
    if (seq[seq.length - 1] !== ph) seq.push(ph);
  };
  push();
  for (let i = 0; i < 60 * 3; i++) { r.sys.update(1 / 60, player(5000, 0)); push(); }
  for (let i = 0; i < 60 * 3; i++) { r.sys.update(1 / 60, player(120, 0)); push(); }
  for (let i = 0; i < 60 * 40; i++) { r.sys.update(1 / 60, player(5000, 0)); push(); }
  console.log(`AGGRESSIVE akış: \`${seq.join(' → ')}\``);
  console.log(`Leash: evden en fazla ${p.leashRadius} → dönüşte HP ${r.mob.hp}/${r.mob.maxHp}\n`);
}
{
  const r = rig({ aiType: 'NORMAL' });
  for (let i = 0; i < 60 * 20; i++) r.sys.update(1 / 60, player(6, 0));
  const rt = r.sys.ai.runtimeOf(r.mob.uid)!;
  console.log(`NORMAL — oyuncu 20 sn dibinde: aggro=${rt.aggro} · vuruş=${r.hits()} · durum=${rt.phase}`);
  r.sys.notifyDamaged(r.mob);
  for (let i = 0; i < 60 * 5; i++) r.sys.update(1 / 60, player(6, 0));
  const rt2 = r.sys.ai.runtimeOf(r.mob.uid)!;
  console.log(`NORMAL — hasar sonrası: aggro=${rt2.aggro} (${rt2.aggroCause}) · vuruş=${r.hits()} · durum=${rt2.phase}\n`);
}

/* ---------------- FPS BAĞIMSIZLIĞI ---------------- */
console.log('## SALDIRI TEMPOSU — FPS BAĞIMSIZLIĞI (10 sn)\n');
console.log('| dt | vuruş |');
console.log('|---|---:|');
for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
  const r = rig({ aiType: 'AGGRESSIVE' });
  for (let i = 0; i < Math.round(10 / dt); i++) r.sys.update(dt, player(40, 0));
  console.log(`| 1/${Math.round(1 / dt)} | ${r.hits()} |`);
}
console.log('');

/* ---------------- RESPAWN PRESET ---------------- */
console.log('## RESPAWN PRESETLERİ\n');
console.log('| Preset | Ölümden dirilişe (ölçülen) |');
console.log('|---:|---:|');
for (const sec of RESPAWN_OPTIONS) {
  const r = rig({ aiType: 'NORMAL' });
  r.sys.ai.respawnOverrideSec = sec;
  r.sys.markDead(r.mob);
  let t = 0;
  while (r.mob.ai === 'dead' && t < 60) { r.sys.update(1 / 60, player(5000, 0)); t += 1 / 60; }
  console.log(`| ${sec}s | ${t.toFixed(2)}s |`);
}
console.log('');

/* ---------------- §30 CANLI DÜNYA ---------------- */
console.log('## §30 — FARM ALANI ANLIK DURUMU (oyuncu spawn noktasında)\n');
{
  const S = new PrototypeState(SEED);
  for (let i = 0; i < 60 * 5; i++) S.mobs.update(1 / 60, S.world);
  const area = S.mobs.areaTelemetry();
  console.log(`slot ${area.slots} · canlı ${area.alive} · ölü ${area.dead}`
    + ` (N ${area.byType.NORMAL} / A ${area.byType.AGGRESSIVE} / E ${area.byType.ELITE})\n`);
  console.log('| Slot | Ad | AI | Durum | HP | dPlayer | dHome | aggro |');
  console.log('|---|---|---|---|---:|---:|---:|---|');
  for (const r of S.mobs.telemetry(S.world)) {
    console.log(`| ${r.slotId} | ${r.name} | ${r.aiType} | ${r.phase} | ${r.hp}/${r.maxHp}`
      + ` | ${r.distPlayer} | ${r.distHome} | ${r.aggro ? r.aggroCause : '—'} |`);
  }
  console.log('');
  const moved = S.mobs.mobs.filter((m) => Math.hypot(m.worldX - m.homeX, m.worldY - m.homeY) > 1).length;
  console.log(`5 sn sonunda evinden ayrılmış (roam) mob: ${moved}/8`);
  console.log(`Oyuncu konumu değişti mi: ${S.world.worldX === SPAWN_POINT.x && S.world.worldY === SPAWN_POINT.y ? 'HAYIR ✓' : 'EVET ✗'}`);
}
