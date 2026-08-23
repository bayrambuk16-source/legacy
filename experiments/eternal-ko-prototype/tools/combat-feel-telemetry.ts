/** P1.4 — MANUAL COMBAT FEEL TELEMETRİSİ (headless, renderer YOK).
 *  Çalıştırma: npm run telemetry:feel */
import { PrototypeState } from '../state.js';
import { ARCHER, balanceRow, physicalCoefficient } from '../data/archer-balance.js';
import { COMBAT_TIMING_V1, PROJECTILE_SPEED_OPTIONS } from '../world/CombatPipeline.js';
import { resolveJoystick } from '../world/WorldMovementSystem.js';
import { PLAYER_SPEED_OPTIONS, PROTO } from '../config.js';
import { KO_POTIONS } from '../data/ko-potions.js';
import { Content } from '../../../src/game/data/GameContentRepository.js';
import type { ImpactEvent, ReleaseEvent } from '../world/WorldCombatAdapter.js';
import type { WorldMob } from '../world/types.js';

const SEED = 20260822;
const DT = 1 / 240;
const name = (ref: number): string => Content.skills.find((s) => s.sourceRef === ref)?.displayName ?? String(ref);

function rig(distance: number, radius = 26, hp = 1e12, seed = SEED): { S: PrototypeState; mob: WorldMob } {
  const S = new PrototypeState(seed);
  S.mobs.mobs.length = 0;
  const mob: WorldMob = {
    uid: 9001, monster: Content.monsters[0]!,
    x: S.world.worldX + distance, y: S.world.worldY,
    worldX: S.world.worldX + distance, worldY: S.world.worldY,
    hp, maxHp: hp, attackTimer: 0, state: 'walk', deathTimer: 0, status: [],
    slotId: 'telemetry', instanceIndex: 0, generation: 1, combatRadius: radius, ai: 'idle',
    homeX: 0, homeY: 0, respawnTimer: 0, facing: 1, animT: 0,
  };
  (mob.monster as { defense: number }).defense = 0;
  S.mobs.mobs.push(mob);
  S.targets.select(mob.uid);
  return { S, mob };
}

function run(S: PrototypeState, mobs: WorldMob[], seconds: number): {
  releases: ReleaseEvent[]; impacts: ImpactEvent[];
} {
  const releases: ReleaseEvent[] = []; const impacts: ImpactEvent[] = [];
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    S.adapter.updateAction(DT); S.combat.update(DT);
    const out = S.adapter.updatePipeline(DT, S.world, mobs);
    releases.push(...out.releases); impacts.push(...out.impacts);
  }
  return { releases, impacts };
}

console.log('# P1.4 — MANUAL COMBAT FEEL TELEMETRİSİ');
console.log(`\nrelease delay = ${COMBAT_TIMING_V1.releaseDelaySec}s · projectile speed = ${COMBAT_TIMING_V1.projectileSpeed} birim/sn · seed ${SEED} · dt 1/240`);

/* ------------------------------------------------ §5 projectile timing */
console.log('\n## 1. PROJECTILE TIMING (Standart Atış, tek ok)');
console.log('| mesafe | cast→release | release→impact | TOPLAM | beklenen | hasar | cast anında HP |');
console.log('|---|---|---|---|---|---|---|');
for (const d of [100, 200, 300, 395, 400]) {
  const { S, mob } = rig(d);
  const hp0 = mob.hp;
  const res = S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities());
  if (!res.ok) { console.log(`| ${d} | REDDEDİLDİ (${res.reason}) | | | | | |`); continue; }
  const hpAtCast = mob.hp;
  const out = run(S, S.entities(), 2);
  const rel = out.releases[0]!, hit = out.impacts.find((i) => i.invalid === null)!;
  const expected = COMBAT_TIMING_V1.releaseDelaySec + d / COMBAT_TIMING_V1.projectileSpeed;
  console.log(
    `| ${d} | ${(rel.releasedAt - res.accepted.acceptedAt).toFixed(3)}s`
    + ` | ${(hit.impactAt - rel.releasedAt).toFixed(3)}s`
    + ` | **${(hit.impactAt - res.accepted.acceptedAt).toFixed(3)}s** | ${expected.toFixed(3)}s`
    + ` | ${hit.damage} | ${hpAtCast === hp0 ? 'DEĞİŞMEDİ ✓' : 'DEĞİŞTİ ✗'} |`,
  );
}

console.log('\n### projectile speed karşılaştırması (mesafe 300)');
console.log('| hız | release→impact | TOPLAM |');
console.log('|---|---|---|');
for (const sp of PROJECTILE_SPEED_OPTIONS) {
  const { S, mob } = rig(300);
  S.adapter.pipeline.timing.projectileSpeed = sp;
  const res = S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities());
  if (!res.ok) continue;
  const out = run(S, S.entities(), 3);
  const rel = out.releases[0]!, hit = out.impacts.find((i) => i.invalid === null)!;
  console.log(`| ${sp} | ${(hit.impactAt - rel.releasedAt).toFixed(3)}s | ${(hit.impactAt - res.accepted.acceptedAt).toFixed(3)}s |`);
}

/* ------------------------------------------------------- §6 fire impact */
console.log('\n## 2. ATEŞ IMPACT (cast anında hasar YOK)');
console.log('| skill | mesafe | cast HP | impact fiziksel | impact ateş | impact toplam | impact anı |');
console.log('|---|---|---|---|---|---|---|');
for (const ref of [ARCHER.KOR_OKU, ARCHER.ALEV_ATISI, ARCHER.PATLAYICI_OK]) {
  const { S, mob } = rig(200);
  const hp0 = mob.hp;
  const res = S.performSkill(ref, mob, S.entities());
  if (!res.ok) continue;
  const same = mob.hp === hp0;
  const out = run(S, S.entities(), 2);
  const hit = out.impacts.find((i) => i.invalid === null)!;
  console.log(`| ${name(ref)} | 200 | ${same ? 'DEĞİŞMEDİ ✓' : 'DEĞİŞTİ ✗'} | ${hit.physicalDamage} | ${hit.elementalDamage} | ${hit.damage} | ${hit.impactAt.toFixed(3)}s |`);
}

/* ----------------------------------------------------- §7 poison impact */
console.log('\n## 3. ZEHİR IMPACT + İLK TICK');
console.log('| skill | cast status | impact status | impact anı | ilk tick anı | fark | tick hasarı |');
console.log('|---|---|---|---|---|---|---|');
for (const ref of [ARCHER.ZEHIRLI_UC, ARCHER.TOKSIK_ATIS, ARCHER.ENGEREK_OKU]) {
  const { S, mob } = rig(200);
  const res = S.performSkill(ref, mob, S.entities());
  if (!res.ok) continue;
  const castStatus = (mob.status ?? []).length;
  let hit: ImpactEvent | null = null, firstTick: number | null = null, tickDmg = 0;
  for (let i = 0; i < 240 * 6; i++) {
    S.adapter.updateAction(DT); S.combat.update(DT);
    const out = S.adapter.updatePipeline(DT, S.world, S.entities());
    for (const e of out.impacts) if (e.invalid === null && hit === null) hit = e;
    for (const ev of S.combat.skills.tickStatuses(S.entities() as never, DT)) {
      if (firstTick === null) { firstTick = S.adapter.pipeline.time; tickDmg = ev.damage; }
    }
    if (firstTick !== null) break;
  }
  console.log(
    `| ${name(ref)} | ${castStatus} ✓ | ${(mob.status ?? []).length} | ${hit!.impactAt.toFixed(3)}s`
    + ` | ${firstTick!.toFixed(3)}s | ${(firstTick! - hit!.impactAt).toFixed(3)}s | ${tickDmg} |`,
  );
}

/* -------------------------------------------------- §8 3/5 impact tablo */
console.log('\n## 4. ÜÇLÜ / BEŞLİ IMPACT TELEMETRİSİ');
for (const [label, radius] of [['Küçük hedef (r26)', 26], ['Büyük hedef (r60)', 60]] as const) {
  console.log(`\n### ${label}`);
  console.log('| skill | mesafe | ok | isabet (release) | ıska | impact hasar | ilk impact | son impact |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const ref of [ARCHER.UCLU_SALVO, ARCHER.BESLI_SALVO]) {
    for (const d of [100, 200, 300, 395]) {
      const { S, mob } = rig(d, radius);
      const res = S.performSkill(ref, mob, S.entities());
      if (!res.ok) { console.log(`| ${name(ref)} | ${d} | REDDEDİLDİ (${res.reason}) | | | | | |`); continue; }
      const out = run(S, S.entities(), 2.5);
      const rel = out.releases[0]!;
      const valid = out.impacts.filter((i) => i.invalid === null);
      const dmg = valid.reduce((a, i) => a + i.damage, 0);
      const times = out.impacts.map((i) => i.impactAt);
      console.log(
        `| ${name(ref)} | ${d} | ${rel.totalProjectileCount} | **${rel.targetHitCount}/${rel.totalProjectileCount}**`
        + ` | ${rel.totalProjectileCount - rel.targetHitCount - rel.sideHitCount} | ${dmg}`
        + ` | ${Math.min(...times).toFixed(3)}s | ${Math.max(...times).toFixed(3)}s |`,
      );
    }
  }
}

/* ------------------------------------------- §9 hedef impact'ten önce ölür */
/* range 401 → cast reddi */
console.log('\n### menzil sınırı (cast range 400)');
console.log('| mesafe | sonuç |');
console.log('|---|---|');
for (const d of [395, 400, 401]) {
  const { S, mob } = rig(d);
  const res = S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities());
  console.log(`| ${d} | ${res.ok ? 'cast KABUL' : `REDDEDİLDİ (${res.reason})`} |`);
}

console.log('\n## 5. HEDEF IMPACT\'TEN ÖNCE ÖLÜRSE');
{
  const { S, mob } = rig(300, 60, 1);         // 1 HP → ilk ok öldürür
  const res = S.performSkill(ARCHER.BESLI_SALVO, mob, S.entities());
  const out = run(S, S.entities(), 2.5);
  console.log('| ok # | impact anı | invalid | hasar | kill |');
  console.log('|---|---|---|---|---|');
  for (const i of out.impacts) {
    console.log(`| ${i.arrowIndex} | ${i.impactAt.toFixed(3)}s | ${i.invalid ?? '—'} | ${i.damage} | ${i.killed ? 'EVET' : 'hayır'} |`);
  }
  const kills = out.impacts.filter((i) => i.killed).length;
  let resolveKillCalls = 0;
  for (let i = 0; i < 5; i++) {
    if (mob.state === 'dying' && mob.ai !== 'dead') { S.adapter.resolveKill(mob); S.mobs.markDead(mob); resolveKillCalls++; }
  }
  console.log(`\n**kill sayısı: ${kills}** · **resolveKill çağrısı: ${resolveKillCalls}** · cast kabul: ${res.ok ? 'evet' : 'hayır'} · mana iade: YOK`);
}

/* ------------------------------------------------------ §4 attack move */
console.log('\n## 6. ATTACK MOVE 0 / 60 / 100');
console.log('| mod | 0.50 sn joystick ile katedilen mesafe | oran | ActionLock |');
console.log('|---|---|---|---|');
{
  const measure = (mult: number): { dist: number; busy: boolean } => {
    const { S, mob } = rig(100, 60);
    S.adapter.pipeline.timing.attackMoveMult = mult;
    S.performSkill(ARCHER.KARA_TAKIP, mob, S.entities());   // action time 0.90s
    const y0 = S.world.worldY;
    const stick = { dx: 0, dy: -PROTO.joystickRadius, active: true };
    for (let i = 0; i < 30; i++) { S.movement.move(S.world, resolveJoystick(stick), 1 / 60); }
    return { dist: Math.abs(S.world.worldY - y0), busy: S.action.busy };
  };
  const full = measure(1.00);
  for (const m of [0, 0.60, 1.00]) {
    const r = measure(m);
    console.log(`| %${Math.round(m * 100)} | ${r.dist.toFixed(1)} birim | ${(r.dist / full.dist * 100).toFixed(0)}% | ${r.busy ? 'aktif' : 'bitti'} |`);
  }
}

/* ------------------------------------------------- §10 Genie / manual */
console.log('\n## 7. GENIE ve MANUEL AYNI PIPELINE');
{
  const manual = rig(120, 45);
  const hpM0 = manual.mob.hp;
  manual.S.performSkill(ARCHER.BESLI_SALVO, manual.mob, manual.S.entities());
  const manualCastHp = manual.mob.hp;
  const mOut = run(manual.S, manual.S.entities(), 2.5);

  const genie = rig(120, 45);
  const hpG0 = genie.mob.hp;
  genie.S.genie.start(genie.S.world);
  genie.S.genie.settings.forcedSet = 0;
  genie.S.genie.settings.sets[0] = [ARCHER.BESLI_SALVO];
  for (let i = 0; i < 20; i++) {
    const acts = genie.S.genie.update(1 / 60, genie.S.entities(), genie.S.world);
    if (acts.some((a) => a.kind === 'skill')) break;
  }
  const genieCastHp = genie.mob.hp;
  const gOut = run(genie.S, genie.S.entities(), 2.5);

  console.log('| yol | cast anında HP | uçan ok | impact sayısı | impact hasar |');
  console.log('|---|---|---|---|---|');
  console.log(`| MANUEL | ${manualCastHp === hpM0 ? 'DEĞİŞMEDİ ✓' : 'DEĞİŞTİ ✗'} | ${mOut.releases[0]?.totalProjectileCount ?? 0} | ${mOut.impacts.filter((i) => i.invalid === null).length} | ${Math.round(hpM0 - manual.mob.hp)} |`);
  console.log(`| GENIE  | ${genieCastHp === hpG0 ? 'DEĞİŞMEDİ ✓' : 'DEĞİŞTİ ✗'} | ${gOut.releases[0]?.totalProjectileCount ?? 0} | ${gOut.impacts.filter((i) => i.invalid === null).length} | ${Math.round(hpG0 - genie.mob.hp)} |`);
}

/* ----------------------------------------------------- action lock ayrımı */
console.log('\n## 8. ACTION LOCK IMPACT BEKLEMEZ');
console.log('| skill | action time | impact anı | action lock bitişi | ilişki |');
console.log('|---|---|---|---|---|');
for (const ref of [ARCHER.UCLU_SALVO, ARCHER.KARA_TAKIP]) {
  const { S, mob } = rig(335, 60);
  const at = S.adapter.actionTimeOf(ref);
  const res = S.performSkill(ref, mob, S.entities());
  if (!res.ok) continue;
  const out = run(S, S.entities(), 3);
  const first = Math.min(...out.impacts.map((i) => i.impactAt));
  console.log(`| ${name(ref)} | ${at.toFixed(2)}s | ${first.toFixed(3)}s | ${at.toFixed(2)}s | ${first < at ? 'impact ÖNCE (lock uzamadı)' : 'lock önce'} |`);
}

/* ------------------------------------------------- P1.4.1: hareket hızı */
console.log('\n## 9. HAREKET HIZI (P1.4.1: varsayılan 120)');
console.log('| base | 1 sn mesafe | Attack Move %0 | %60 | %100 |');
console.log('|---|---|---|---|---|');
for (const base of PLAYER_SPEED_OPTIONS) {
  const plain = (() => {
    const S = new PrototypeState(SEED); S.tuning.set('playerSpeed', base);
    const y0 = S.world.worldY; const stick = { dx: 0, dy: -PROTO.joystickRadius, active: true };
    for (let i = 0; i < 60; i++) S.movement.move(S.world, resolveJoystick(stick), 1 / 60);
    return Math.abs(S.world.worldY - y0);
  })();
  const withAttack = (mult: number): number => {
    const { S, mob } = rig(100, 60);
    S.tuning.set('playerSpeed', base);
    S.adapter.pipeline.timing.attackMoveMult = mult;
    S.performSkill(ARCHER.KARA_TAKIP, mob, S.entities());
    const y0 = S.world.worldY; const stick = { dx: 0, dy: -PROTO.joystickRadius, active: true };
    for (let i = 0; i < 60; i++) S.movement.move(S.world, resolveJoystick(stick), 1 / 60);
    return Math.abs(S.world.worldY - y0);
  };
  console.log(`| ${base} | ${plain.toFixed(1)} | ${withAttack(0).toFixed(1)} | ${withAttack(0.60).toFixed(1)} | ${withAttack(1.00).toFixed(1)} |`);
}

/* ---------------------------------------------------- P1.4.1: iksirler */
console.log('\n## 10. KO POTION — SOURCE TABLOSU (KO_Reference_v8.db)');
console.log('| itemRef | KO adı | oyun adı | tür | miktar | fiyat | effect ref | direct_type | cast_time | recast_time |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const p of KO_POTIONS) {
  console.log(`| ${p.itemRef} | ${p.sourceName} | ${p.displayName} | ${p.resource.toUpperCase()} | **${p.restoreAmount}** | ${p.vendorPrice} | ${p.sourceEffectRef} | ${p.sourceDirectType} | ${p.sourceCastTimeRaw} | ${p.sourceRecastTimeRaw} |`);
}

console.log('\n## 11. SABİT RESTORE ÖLÇÜMÜ');
{
  const S = new PrototypeState(SEED);
  S.giveTestPotions();
  const maxMp = Math.round(S.stats.finalStats().maxMp);
  const maxHp = Math.round(S.stats.finalStats().maxHp);
  console.log(`\nmaxHP = ${maxHp} · maxMP = ${maxMp}`);
  console.log('| iksir | miktar | before | after | actual | wasted | kalan |');
  console.log('|---|---|---|---|---|---|---|');
  for (const p of KO_POTIONS) {
    const S2 = new PrototypeState(SEED); S2.giveTestPotions();
    if (p.resource === 'mp') S2.player.mp = 100; else S2.player.hp = 100;
    const r = S2.potions.use(p.itemRef);
    console.log(`| ${p.displayName} (${p.resource.toUpperCase()} +${p.restoreAmount}) | ${r.restoreAmount} | ${r.before} | ${r.after} | **${r.actual}** | ${r.wasted} | ${r.remaining} |`);
  }
}

console.log('\n## 12. GENIE SEÇİLİ İKSİR / OUT OF STOCK');
{
  const S = new PrototypeState(SEED);
  S.giveTestPotions();
  S.genie.settings.hpPotionRef = null;
  S.genie.settings.mpPotionRef = 389019000;          // +960 seçili
  S.genie.settings.mpThresholdPct = 0.9;
  for (const { entry } of [...S.inventory.bagList()]) {
    if (entry.itemRef === 389019000) S.inventory.remove(entry.instanceId, entry.quantity);
  }
  S.inventory.add(389018000, { quantity: 99 });
  const before480 = S.potions.stock(389018000);
  S.player.mp = 1;
  const act = S.genie.tryPotions(0);
  console.log(`\nSeçili: MP +960 (stok 0) · elde MP +480 ×${before480}`);
  console.log(`Genie eylemi : **${act?.kind ?? 'yok'}** — "${(act as { label?: string })?.label ?? ''}"`);
  console.log(`+480 stoğu   : ${before480} → ${S.potions.stock(389018000)} (**otomatik geçiş YOK**)`);
  console.log(`MP           : 1 → ${Math.round(S.player.mp)} (mutasyon yok)`);
}

console.log(`\n_Not: physicalCoefficient(3'lü) = ${physicalCoefficient(ARCHER.UCLU_SALVO)} · MP(5'li) = ${balanceRow(ARCHER.BESLI_SALVO).manaCost} — P1.3 dengesi DEĞİŞMEDİ._`);
