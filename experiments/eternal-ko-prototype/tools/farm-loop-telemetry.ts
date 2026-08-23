/** P1.5 — GENIE FARM LOOP TELEMETRİSİ (headless, renderer YOK).
 *  Çalıştırma: npm run telemetry:farm */
import { PrototypeState } from '../state.js';
import { ARCHER_CAST_RANGE } from '../data/archer-balance.js';
import { GENIE_MOVEMENT_V1 } from '../world/GenieMovement.js';
import { resolveJoystick } from '../world/WorldMovementSystem.js';
import { PLAYER_SPEED_OPTIONS, PROTO } from '../config.js';
import { Content } from '../../../src/game/data/GameContentRepository.js';
import type { MovementSource } from '../world/GenieMovement.js';
import type { GenieAction } from '../world/GenieSystem.js';
import type { WorldMob } from '../world/types.js';

const DT = 1 / 60;
const SEED = 20260822;

function rig(radius = 650, seed = SEED): PrototypeState {
  const S = new PrototypeState(seed);
  S.mobs.mobs.length = 0;
  S.genie.settings.farmBoundaryRadius = radius;
  S.genie.settings.forcedSet = 0;
  S.genie.settings.hpPotionRef = null;
  S.genie.settings.mpPotionRef = null;
  return S;
}
function mob(S: PrototypeState, dx: number, dy: number, hp = 1e9): WorldMob {
  const m: WorldMob = {
    uid: 7000 + S.mobs.mobs.length, monster: Content.monsters[0]!,
    x: S.world.worldX + dx, y: S.world.worldY + dy,
    worldX: S.world.worldX + dx, worldY: S.world.worldY + dy,
    hp, maxHp: hp, attackTimer: 0, state: 'walk', deathTimer: 0, status: [],
    slotId: 'tel', instanceIndex: 0, generation: 1, combatRadius: 45, ai: 'idle',
    homeX: 0, homeY: 0, respawnTimer: 0, facing: 1, animT: 0,
  };
  (m.monster as { defense: number }).defense = 0;
  S.mobs.mobs.push(m);
  return m;
}
function step(S: PrototypeState, stick?: { dx: number; dy: number; active: boolean }): {
  src: MovementSource; actions: GenieAction[];
} {
  const mv = stick ? resolveJoystick(stick) : { x: 0, y: 0, magnitude: 0 };
  const intent = S.genie.movementIntent(S.entities(), S.world);
  let src: MovementSource = 'NONE';
  if (mv.magnitude > 0) { src = 'MANUAL'; S.movement.move(S.world, mv, DT); }
  else if (intent.magnitude > 0) { src = 'GENIE'; S.movement.move(S.world, intent, DT); S.genie.clampPlayer(S.world); }
  else S.movement.move(S.world, mv, DT);
  S.player.update(DT); S.combat.update(DT); S.adapter.updateAction(DT);
  S.adapter.updatePipeline(DT, S.world, S.entities());
  return { src, actions: S.genie.update(DT, S.entities(), S.world) };
}

console.log('# P1.5 — GENIE FARM LOOP TELEMETRİSİ');
console.log(`\nacquisition **${450}** · cast range **${ARCHER_CAST_RANGE}** · auto hedef **${GENIE_MOVEMENT_V1.enterCombatDistance}**`
  + ` · histerezis çıkış **${GENIE_MOVEMENT_V1.leaveCombatDistance}** · return toleransı **${GENIE_MOVEMENT_V1.returnTolerance}**`);
console.log(`playerSpeed varsayılan 120 · dt 1/60 · seed ${SEED}`);

/* ------------------------------------------------ §24 tam farm döngüsü */
console.log('\n## 1. TAM FARM DÖNGÜSÜ (§24)');
{
  const S = rig(600);
  const center = { x: S.world.worldX, y: S.world.worldY };
  const A = mob(S, 430, 0, 1);
  const B = mob(S, 0, 420, 1);
  const C = mob(S, 900, 0, 1e9);         // merkezden 900 → sınır DIŞI
  S.genie.start(S.world);
  console.log('\n| t (s) | state | geçiş | hedef | mesafe | merkeze | kaynak | hız |');
  console.log('|---|---|---|---|---|---|---|---|');
  let last = '';
  for (let i = 0; i < 60 * 16; i++) {
    const r = step(S);
    const t = S.genie.status(S.entities());
    const key = `${t.movementState}|${t.targetUid}`;
    if (key !== last) {
      last = key;
      const tgt = t.targetUid === null ? '—' : (t.targetUid === A.uid ? 'A' : t.targetUid === B.uid ? 'B' : t.targetUid === C.uid ? 'C' : `#${t.targetUid}`);
      console.log(
        `| ${(i * DT).toFixed(2)} | **${t.movementState}** | ${t.lastTransition ?? '—'} | ${tgt}`
        + ` | ${t.distance === null ? '—' : Math.round(t.distance)}`
        + ` | ${t.farmCenterDistance === null ? '—' : Math.round(t.farmCenterDistance)}`
        + ` | ${r.src} | ${t.autoMoveSpeed > 0 ? Math.round(t.autoMoveSpeed) : '—'} |`,
      );
    }
  }
  const d = Math.hypot(S.world.worldX - center.x, S.world.worldY - center.y);
  console.log(`\n**Sonuç:** A ${A.state === 'dying' ? 'ÖLDÜ' : A.state} · B ${B.state === 'dying' ? 'ÖLDÜ' : B.state}`
    + ` · C ${C.state === 'dying' ? 'ÖLDÜ ✗' : 'YOK SAYILDI ✓ (sınır dışı)'}`
    + ` · son durum ${S.genie.movementState} · merkeze ${Math.round(d)} (sınır 600)`);
}

/* ------------------------------------------------------ histerezis kanıtı */
console.log('\n## 2. HİSTEREZİS 380 / 400 (§6)');
console.log('| mesafe | önceki durum | sonuç |');
console.log('|---|---|---|');
{
  const S = rig();
  const m = mob(S, 300, 0);
  S.genie.start(S.world);
  for (let i = 0; i < 12; i++) step(S);          // hedef edinilsin (COMBAT)
  const probe = (d: number): string => {
    m.worldX = S.world.worldX + d; m.x = m.worldX;
    const before = S.genie.movementState;
    S.genie.movementIntent(S.entities(), S.world);
    return `| ${d} | ${before} | **${S.genie.movementState}** |`;
  };
  for (const d of [405, 395, 385, 381, 380, 390, 400, 401, 399]) console.log(probe(d));
}

/* -------------------------------------------------------- hız kanıtı */
console.log('\n## 3. playerSpeed YENİDEN KULLANIMI (§7) — Genie\'ye özel hız YOK');
console.log('| playerSpeed | ölçülen auto yaklaşma | Attack Move %60 (ActionLock) |');
console.log('|---|---|---|');
for (const speed of PLAYER_SPEED_OPTIONS) {
  const S = rig(); S.tuning.set('playerSpeed', speed);
  const m = mob(S, 449, 0);
  S.genie.start(S.world);
  let g = 0; while (S.genie.movementState !== 'APPROACH' && g++ < 120) step(S);
  const x1 = S.world.worldX;
  for (let i = 0; i < 24; i++) step(S);
  const plain = (S.world.worldX - x1) / 0.4;

  const S2 = rig(); S2.tuning.set('playerSpeed', speed);
  S2.adapter.pipeline.timing.attackMoveMult = 0.60;
  const m2 = mob(S2, 370, 0);
  S2.genie.start(S2.world);
  for (let i = 0; i < 30; i++) step(S2);
  m2.worldX = S2.world.worldX + 420; m2.x = m2.worldX;
  const x2 = S2.world.worldX; let f = 0;
  while (S2.adapter.actionBusy && f < 60) { step(S2); f++; }
  const locked = f > 0 ? (S2.world.worldX - x2) / (f / 60) : 0;
  console.log(`| ${speed} | ${plain.toFixed(1)} birim/sn | ${locked.toFixed(1)} birim/sn |`);
  void m;
}

/* --------------------------------------------------- boundary kanıtı */
console.log('\n## 4. FARM BOUNDARY (§9 · §10 · §28 · §29)');
{
  const S = rig(500);
  const center = { x: S.world.worldX, y: S.world.worldY };
  const inside = mob(S, 440, 0, 1e9);        // acquisition (450) içi, cast (400) DIŞI → yürümek gerekir
  const outside = mob(S, 0, 560, 1e9);       // merkezden 560 → sınır DIŞI
  S.genie.start(S.world);
  let maxD = 0;
  for (let i = 0; i < 60 * 6; i++) { step(S); maxD = Math.max(maxD, Math.hypot(S.world.worldX - center.x, S.world.worldY - center.y)); }
  console.log(`\n| kontrol | sonuç |`);
  console.log('|---|---|');
  console.log(`| sınır yarıçapı | 500 |`);
  console.log(`| oyuncunun merkeze EN UZAK noktası | **${maxD.toFixed(1)}** ${maxD <= 500.01 ? '✓ sınır aşılmadı' : '✗'} |`);
  console.log(`| sınır İÇİ mob (440) hedeflendi | ${S.targets.selectedUid === inside.uid ? 'EVET ✓' : 'hayır'} |`);
  console.log(`| sınır DIŞI mob (560) hedeflendi | ${S.targets.selectedUid === outside.uid ? 'EVET ✗' : 'HAYIR ✓'} |`);

  /* hedef sınır dışına kaçarsa */
  inside.worldX = center.x + 900; inside.x = inside.worldX;
  for (let i = 0; i < 60 * 3; i++) step(S);
  const after = Math.hypot(S.world.worldX - center.x, S.world.worldY - center.y);
  console.log(`| hedef sınır dışına kaçtı → hedef | ${S.targets.selectedUid === null ? 'DÜŞTÜ ✓' : 'korundu ✗'} |`);
  console.log(`| peşinden gidildi mi | ${after <= 500.01 ? 'HAYIR ✓ (merkeze ' + Math.round(after) + ')' : 'EVET ✗'} |`);
}

/* ------------------------------------------------------ return center */
console.log('\n## 5. RETURN CENTER (§30) ve KESİNTİ (§31)');
{
  const S = rig();
  S.genie.start(S.world);
  const center = { ...S.genie.farmCenter! };
  S.world.worldX = center.x + 300;
  console.log('\n| t (s) | state | merkeze uzaklık |');
  console.log('|---|---|---|');
  for (let i = 0; i < 60 * 4; i++) {
    step(S);
    if (i % 45 === 0 || S.genie.movementState === 'WAIT') {
      const d = Math.hypot(S.world.worldX - center.x, S.world.worldY - center.y);
      console.log(`| ${(i * DT).toFixed(2)} | ${S.genie.movementState} | ${d.toFixed(1)} |`);
      if (S.genie.movementState === 'WAIT') break;
    }
  }
  /* kesinti: RETURN sırasında mob gir */
  const S2 = rig();
  S2.genie.start(S2.world);
  const c2 = { ...S2.genie.farmCenter! };
  S2.world.worldX = c2.x + 300;
  for (let i = 0; i < 30; i++) step(S2);
  const st1 = S2.genie.movementState;
  mob(S2, 200, 0, 1e9);
  for (let i = 0; i < 120; i++) step(S2);
  console.log(`\nRETURN kesintisi: **${st1} → ${S2.genie.movementState}** (hedef ${S2.targets.selectedUid === null ? 'yok ✗' : 'edinildi ✓'})`);
}

/* ------------------------------------------- manuel öncelik (§13/§32) */
console.log('\n## 6. MANUEL ÖNCELİK — VEKTÖRLER TOPLANMAZ (§13)');
{
  const S = rig(); S.tuning.set('playerSpeed', 120);
  mob(S, 430, 0);
  S.genie.start(S.world);
  for (let i = 0; i < 12; i++) step(S);
  const p0 = { x: S.world.worldX, y: S.world.worldY };
  const stick = { dx: 0, dy: -PROTO.joystickRadius, active: true };
  const srcs = new Set<MovementSource>();
  for (let i = 0; i < 60; i++) srcs.add(step(S, stick).src);
  const dx = S.world.worldX - p0.x, dy = S.world.worldY - p0.y;
  console.log('\n| kontrol | sonuç |');
  console.log('|---|---|');
  console.log(`| joystick basılıyken kaynak | ${[...srcs].join(', ')} |`);
  console.log(`| GENIE hareketi uygulandı mı | ${srcs.has('GENIE') ? 'EVET ✗' : 'HAYIR ✓'} |`);
  console.log(`| 1 sn'de X kayması (Genie yönü) | ${dx.toFixed(2)} (≈0 olmalı) |`);
  console.log(`| 1 sn'de Y hareketi (manuel) | ${dy.toFixed(1)} |`);
  console.log(`| bileşke hız | **${Math.hypot(dx, dy).toFixed(1)}** birim/sn (base 120 aşılmamalı) |`);
  const p1 = { x: S.world.worldX, y: S.world.worldY };
  const srcs2 = new Set<MovementSource>();
  for (let i = 0; i < 60; i++) srcs2.add(step(S).src);
  console.log(`| joystick bırakıldı → kaynak | ${[...srcs2].join(', ')} |`);
  console.log(`| Genie devam etti mi | ${S.world.worldX > p1.x ? 'EVET ✓' : 'hayır ✗'} |`);
}
