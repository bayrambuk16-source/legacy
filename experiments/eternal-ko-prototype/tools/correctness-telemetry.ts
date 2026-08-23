/** P1.6.1 — ARCHITECTURE CORRECTNESS TELEMETRİSİ (headless).
 *  Çalıştırma: npm run telemetry:correctness
 *
 *  Denetimde bulunan üç zamanlama/kimlik borcunun ÖLÇÜLEBİLİR kanıtını basar:
 *    1) Genie karar saati — ESKİ (kare tabanlı) vs YENİ (biriktirici)
 *    2) DoT tik saati    — ESKİ (ham dt) vs YENİ (sabit 1/128 adım)
 *    3) Entity kimliği   — respawn'da uid/nesil davranışı */
import { PrototypeState } from '../state.js';
import { GENIE_DEFAULTS } from '../world/GenieSystem.js';
import { POISON_DURATION_SEC, POISON_TICK_SEC } from '../data/archer-balance.js';

const FPS = [30, 60, 120];

/* ---- 1. KARAR SAATİ ---- */
function oldDecisionTicks(dt: number, seconds: number, interval: number): number {
  let timer = 0, ticks = 0;
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    timer -= dt;
    if (timer > 0) continue;
    timer = interval;                       // ← ARTIK ÇÖPE GİDİYORDU
    ticks++;
  }
  return ticks;
}
function newDecisionTicks(dt: number, seconds: number, interval: number): number {
  let acc = 0, ticks = 0;
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    acc += dt;
    let g = 0;
    while (acc >= interval && g < 4) { acc -= interval; g++; ticks++; }
    if (acc >= interval) acc = 0;
  }
  return ticks;
}

console.log('# P1.6.1 — CORRECTNESS TELEMETRİSİ\n');
/* ÖLÇÜM PENCERESİ bir karar sınırına DENK GELMEZ (9.95 sn → 99 karar).
   Tam 10.00 sn'de kare sürelerinin kayan nokta toplamı FPS'e göre ~1e-13
   farklı olduğu için pencere bir tik erken/geç kapanabilir; bu bir gameplay
   farkı değil, ölçüm artefaktıdır. */
const WINDOW = 9.95;
console.log(`## 1 — GENIE KARAR SAATİ (${WINDOW} sn · aralık `
  + `${GENIE_DEFAULTS.decisionIntervalSec} sn · ideal 99 karar)\n`);
console.log('| FPS | ESKİ (kare tabanlı) | YENİ (biriktirici) |');
console.log('|---:|---:|---:|');
for (const f of FPS) {
  console.log(`| ${f} | ${oldDecisionTicks(1 / f, WINDOW, GENIE_DEFAULTS.decisionIntervalSec)}`
    + ` | ${newDecisionTicks(1 / f, WINDOW, GENIE_DEFAULTS.decisionIntervalSec)} |`);
}
console.log('\n> ESKİ: 30 FPS oyuncusu 120 FPS oyuncusundan **%19 daha az** karar alıyordu.\n');

/* ---- 2. DoT SAATİ ---- */
function dotTicks(dt: number, step: number | null): number {
  const st = { timeLeft: POISON_DURATION_SEC, tickTimer: POISON_TICK_SEC };
  let ticks = 0, alive = true, acc = 0;
  const apply = (d: number): void => {
    if (!alive) return;
    st.timeLeft -= d; st.tickTimer -= d;
    if (st.tickTimer <= 0) { st.tickTimer = POISON_TICK_SEC; ticks++; }
    if (st.timeLeft <= 0) alive = false;
  };
  for (let i = 0; i < Math.round(8 / dt); i++) {
    if (step === null) { apply(dt); continue; }
    acc += dt;
    let g = 0;
    while (acc >= step && g < 16) { acc -= step; g++; apply(step); }
  }
  return ticks;
}
console.log(`## 2 — DoT TİK SAATİ (zehir ${POISON_DURATION_SEC} sn ÷ ${POISON_TICK_SEC} sn `
  + '= ideal 4 tik)\n');
console.log('| FPS | ESKİ (ham dt) | 1/120 sabit adım | YENİ (1/128 sabit adım) |');
console.log('|---:|---:|---:|---:|');
for (const f of FPS) {
  console.log(`| ${f} | ${dotTicks(1 / f, null)} | ${dotTicks(1 / f, 1 / 120)}`
    + ` | ${dotTicks(1 / f, PrototypeState.STATUS_STEP_SEC)} |`);
}
console.log('\n> ESKİ: 60 FPS oyuncusu 30/120 FPS oyuncusundan **%33 fazla** zehir hasarı alıyordu.');
console.log('> 1/120 adım FPS\'i eşitler ama SON TİKİ düşürür (2\'nin kuvveti değil).');
console.log(`> 1/128 ikilik tabanda TAM temsil edilir → 128 adım = 1.000 sn.\n`);

/* ---- 3. ENTITY KİMLİĞİ ---- */
console.log('## 3 — ENTITY KİMLİĞİ (aynı slotta 5 ölüm/respawn)\n');
{
  const S = new PrototypeState(20260822);
  S.mobs.ai.respawnOverrideSec = 0.05;
  const mob = S.mobs.mobs[0]!;
  console.log('| Döngü | slotId | entityUid | generation | AI runtime bağlı |');
  console.log('|---:|---|---:|---:|---|');
  console.log(`| 0 | ${mob.slotId} | ${mob.uid} | ${mob.generation}`
    + ` | ${S.mobs.ai.runtimeOf(mob.uid) ? 'evet' : 'HAYIR'} |`);
  const seen = new Set<number>([mob.uid]);
  for (let i = 1; i <= 5; i++) {
    mob.hp = 0; mob.state = 'dying';
    S.reapDead();
    let g = 0;
    while (mob.ai === 'dead' && g++ < 4000) S.mobs.update(1 / 240, S.world);
    console.log(`| ${i} | ${mob.slotId} | ${mob.uid} | ${mob.generation}`
      + ` | ${S.mobs.ai.runtimeOf(mob.uid) ? 'evet' : 'HAYIR'} |`);
    if (seen.has(mob.uid)) console.log('  ✗ uid YENİDEN KULLANILDI');
    seen.add(mob.uid);
  }
  console.log(`\n> Benzersiz uid sayısı: ${seen.size}/6 · mob NESNE sayısı: ${S.mobs.mobs.length}`
    + ' (duplicate yok)\n');
}
