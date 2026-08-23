/** ARCHER BALANCE V1 — TELEMETRİ ÖLÇÜMÜ (P1.3 §12 · §13)
 *
 *  Headless çalışır, renderer yoktur. Gerçek hedeflar (Small / Boss) üzerinde
 *  gerçek combat yolundan geçerek ölçer: `PrototypeState.performSkill()` →
 *  `WorldCombatAdapter` → `MultiShot` → ana `CombatSystem.damageRoll`.
 *  Hiçbir sayı burada hesaplanmaz; yalnız OKUNUR ve tablolanır.
 *
 *  Çalıştırma:  npm run telemetry:archer */
import { PrototypeState } from '../state.js';
import {
  ARCHER, balanceRow, physicalCoefficient, projectileCount,
} from '../data/archer-balance.js';
import { Content } from '../../../src/game/data/GameContentRepository.js';
import type { WorldMob } from '../world/types.js';

const DISTANCES = [100, 200, 300, 335];
const SEED = 20260822;

function fresh(): PrototypeState {
  const S = new PrototypeState(SEED);
  S.mobs.mobs.length = 0;
  return S;
}

/** Hedefyı oyuncudan tam `dist` uzağa koyar (X ekseninde). */
function place(S: PrototypeState, target: WorldMob, dist: number): void {
  target.worldX = S.world.worldX + dist;
  target.worldY = S.world.worldY;
  target.x = target.worldX; target.y = target.worldY;
  target.hp = target.maxHp;
}

function refill(S: PrototypeState): void {
  S.player.restoreVitals({ hp: Number.POSITIVE_INFINITY, mp: Number.POSITIVE_INFINITY });
  S.action.reset();
}

/* P2.2 — HASAR KUKLASI KALDIRILDI.
   Ölçüm hedefi artık GERÇEK bir mob kaydıdır; hedef yerine yalnız HP'si
   pratikte tükenmeyecek şekilde ayarlanmış tek bir mob bırakılır. İki
   yarıçap (26 / 60) eski küçük/boss hedef hitbox'larının AYNI değerleridir,
   böylece ölçüm serisi P1.3 ile karşılaştırılabilir kalır. */
export const SMALL_TARGET_RADIUS = 26;
export const BOSS_TARGET_RADIUS = 60;

function only(S: PrototypeState, which: 'target_small' | 'target_boss'): WorldMob {
  const radius = which === 'target_small' ? SMALL_TARGET_RADIUS : BOSS_TARGET_RADIUS;
  S.mobs.mobs.length = 0;
  const mob: WorldMob = {
    uid: which === 'target_small' ? 9101 : 9102,
    monster: Content.monsters[0]!,
    x: S.world.worldX, y: S.world.worldY,
    worldX: S.world.worldX, worldY: S.world.worldY,
    hp: 1e12, maxHp: 1e12, attackTimer: 0, state: 'walk', deathTimer: 0, status: [],
    slotId: 'telemetry', instanceIndex: 0, generation: 1, combatRadius: radius, ai: 'idle',
    homeX: S.world.worldX, homeY: S.world.worldY, respawnTimer: 0, facing: 1, animT: 0,
  };
  (mob.monster as { defense: number }).defense = 0;
  S.mobs.mobs.push(mob);
  return mob;
}

interface Row {
  distance: number; radius: number; projectiles: number;
  targetHits: number; misses: number; sideHits: number;
  coefficient: number; totalDamage: number;
}

function measure(which: 'target_small' | 'target_boss', ref: number): Row[] {
  const out: Row[] = [];
  for (const dist of DISTANCES) {
    const S = fresh();
    const target = only(S, which);
    place(S, target, dist);
    refill(S);
    const shot = S.resolveCastToImpact(ref, target, S.entities());
    if (!shot.result.ok) {
      out.push({
        distance: dist, radius: target.combatRadius, projectiles: projectileCount(ref),
        targetHits: -1, misses: -1, sideHits: -1,
        coefficient: physicalCoefficient(ref), totalDamage: 0,
      });
      continue;
    }
    const rel = shot.releases[0]!;
    const valid = shot.impacts.filter((i) => i.invalid === null);
    out.push({
      distance: dist, radius: target.combatRadius,
      projectiles: rel.totalProjectileCount,
      targetHits: rel.targetHitCount,
      misses: rel.totalProjectileCount - rel.targetHitCount - rel.sideHitCount,
      sideHits: rel.sideHitCount,
      coefficient: physicalCoefficient(ref),
      totalDamage: valid.reduce((a, i) => a + i.damage, 0),
    });
  }
  return out;
}

function table(title: string, rows: Row[]): void {
  console.log(`\n### ${title}`);
  console.log('| mesafe | hitbox r | ok | hedef isabet | ıska | katsayı/ok | toplam hasar |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const hit = r.targetHits < 0 ? 'MENZİL DIŞI' : `**${r.targetHits}/${r.projectiles}**`;
    const miss = r.targetHits < 0 ? '—' : String(r.misses);
    console.log(`| ${r.distance} | ${r.radius} | ${r.projectiles} | ${hit} | ${miss} | ${r.coefficient.toFixed(2)} | ${r.totalDamage} |`);
  }
}

console.log('# ARCHER BALANCE V1 — TELEMETRİ');
const S0 = fresh();
console.log(`\nSeed ${SEED} · deterministik RNG · hedef defense = 0 · hedef HP pratikte sonsuz.`);
console.log(`playerAttack = ${S0.combat.playerAttack().toFixed(1)}  (Sv${S0.player.level}, başlangıç yayı)`);
console.log(`Küçük Hedef r = ${SMALL_TARGET_RADIUS} · Büyük Hedef r = ${BOSS_TARGET_RADIUS} · cast range 340`);

console.log('\n## §12 — KÜÇÜK HEDEF');
table('Üçlü Salvo · Multiple Shot · 3 ok · 0.99/ok', measure('target_small', ARCHER.UCLU_SALVO));
table('Beşli Salvo · Arrow Shower · 5 ok · 0.99/ok', measure('target_small', ARCHER.BESLI_SALVO));

/* P1.3.1 — ±5° sonrası isabet SINIRININ nerede olduğunu ölçer. */
console.log('\n### Üçlü Salvo ±5° — isabet sınırı taraması (Küçük Hedef, r 26)');
console.log('| mesafe | hedef isabet |');
console.log('|---|---|');
let flip: number | null = null, prev = -1;
for (let d = 260; d <= 340; d += 5) {
  const S = fresh();
  const target = only(S, 'target_small');
  place(S, target, d);
  refill(S);
  const shot = S.resolveCastToImpact(ARCHER.UCLU_SALVO, target, S.entities());
  const h = shot.result.ok ? (shot.releases[0]?.targetHitCount ?? -1) : -1;
  console.log(`| ${d} | ${h < 0 ? 'MENZİL DIŞI' : `${h}/3`} |`);
  if (prev === 3 && h === 1 && flip === null) flip = d;
  prev = h;
}
console.log(`\n**Sınır:** dış oklar ${flip ?? '?'} birimde kaçmaya başlıyor.`);
console.log(`Geometrik beklenti: r / sin 5° = 26 / ${Math.sin(5 * Math.PI / 180).toFixed(5)} = ${(26 / Math.sin(5 * Math.PI / 180)).toFixed(1)} birim.`);

console.log('\n## §12 — BÜYÜK HEDEF');
table('Üçlü Salvo · Multiple Shot · 3 ok · 0.99/ok', measure('target_boss', ARCHER.UCLU_SALVO));
table('Beşli Salvo · Arrow Shower · 5 ok · 0.99/ok', measure('target_boss', ARCHER.BESLI_SALVO));

/* --------------------------------------------------------- §13 rotasyon */
console.log('\n## §13 — ROTASYON: Beşli → Üçlü → Kara Takip → Gölge Avcısı');
const ROT = [ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO, ARCHER.KARA_TAKIP, ARCHER.GOLGE_AVCISI];

function rotation(which: 'target_small' | 'target_boss', dist: number, infiniteMp = false): void {
  const S = fresh();
  const target = only(S, which);
  place(S, target, dist);
  S.player.restoreVitals({ hp: Number.POSITIVE_INFINITY, mp: Number.POSITIVE_INFINITY });
  const mpStart = S.player.mp;
  console.log(`\n### ${which === 'target_small' ? 'Small' : 'Boss'} Dummy · mesafe ${dist} · başlangıç MP ${Math.round(mpStart)}${infiniteMp ? ' · **MP SINIRSIZ (teorik)**' : ''}`);
  console.log('| t (s) | skill | MP | ok | isabet | fiziksel | elemental | toplam | impact gecikme | kalan MP |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');

  let t = 0, spent = 0, dealt = 0, coeff = 0;
  const DT = 1 / 120;
  for (const ref of ROT) {
    let guard = 0;
    while (S.adapter.actionBusy && guard++ < 100000) { S.adapter.updateAction(DT); S.combat.update(DT); t += DT; }
    const row = balanceRow(ref);
    if (infiniteMp) S.player.restoreVitals({ hp: Number.POSITIVE_INFINITY, mp: Number.POSITIVE_INFINITY });
    const mpBefore = infiniteMp ? row.manaCost : S.player.mp;
    /* P1.4 — cast → release → impact ZİNCİRİ. Hasar impact'te uygulanır. */
    const shot = S.resolveCastToImpact(ref, target, S.entities());
    if (!shot.result.ok) {
      console.log(`| ${t.toFixed(2)} | ${row.koName} | — | — | REDDEDİLDİ (${shot.result.reason}) | — | — | — | — | ${Math.round(S.player.mp)} |`);
      continue;
    }
    const acc = shot.result.accepted;
    const mp = infiniteMp ? row.manaCost : Math.round(mpBefore - S.player.mp);
    spent += mp;
    const rel = shot.releases[0]!;
    const valid = shot.impacts.filter((i) => i.invalid === null);
    const shots = rel.totalProjectileCount;
    const hits = rel.targetHitCount;
    const phys = valid.reduce((a, i) => a + i.physicalDamage, 0);
    const elem = valid.reduce((a, i) => a + i.elementalDamage, 0);
    const total = phys + elem;
    const lastImpact = shot.impacts.length > 0 ? shot.impacts[shot.impacts.length - 1]!.impactAt : acc.acceptedAt;
    dealt += total;
    coeff += physicalCoefficient(ref) * hits;
    console.log(
      `| ${t.toFixed(2)} | ${row.koName} | ${mp} | ${shots} | ${hits}/${shots} | ${phys} | ${elem} | ${total} | ${(lastImpact - acc.acceptedAt).toFixed(3)}s | ${Math.round(S.player.mp)} |`,
    );
  }
  console.log(`\n**Toplam:** MP ${spent} · anlık hasar ${dealt} · GERÇEKLEŞEN fiziksel katsayı ${coeff.toFixed(2)} · cycle ${t.toFixed(2)}s`);
}

console.log(`\nOyuncunun MAKSİMUM MP'si: ${Math.round(S0.stats.finalStats().maxMp)} — rotasyonun teorik maliyeti 740 MP.`);
rotation('target_small', 100);
rotation('target_small', 300);
rotation('target_boss', 300);
/* MP kapısı olmadan tam cycle: teorik 12.92 katsayısını görebilmek için. */
rotation('target_boss', 100, true);

/* ------------------------------------------------- §8/§9 fire & poison örnek */
console.log('\n## §8 / §9 — ATEŞ ve ZEHİR ÖRNEKLERİ (Küçük Hedef, mesafe 100)');
console.log('| skill | element | fiziksel | anlık elemental | DoT/tick | tick | DoT beklenen | anlık toplam |');
console.log('|---|---|---|---|---|---|---|---|');
for (const ref of [ARCHER.KOR_OKU, ARCHER.ALEV_ATISI, ARCHER.PATLAYICI_OK,
  ARCHER.ZEHIRLI_UC, ARCHER.TOKSIK_ATIS, ARCHER.ENGEREK_OKU]) {
  const S = fresh();
  const target = only(S, 'target_small');
  place(S, target, 100);
  refill(S);
  const res = S.performSkill(ref, target, S.entities());
  const row = balanceRow(ref);
  if (!res.ok) { console.log(`| ${row.koName} | REDDEDİLDİ (${res.reason}) | | | | | | |`); continue; }
  const b = res.breakdown;
  console.log(
    `| ${row.koName} | ${b.element} | ${b.physicalDamage} | ${b.elementalDamage} | ${b.dotPerTickDamage} | ${b.dotTickCount} | ${b.dotExpectedTotal} | ${b.totalDamage} |`,
  );
}

console.log('\n### Zehir: BEKLENEN vs GERÇEKTEN uygulanan (yuvarlama sapması testi)');
console.log('| skill | beklenen toplam | uygulanan tick | uygulanan toplam | sapma |');
console.log('|---|---|---|---|---|');
for (const ref of [ARCHER.ZEHIRLI_UC, ARCHER.TOKSIK_ATIS, ARCHER.ENGEREK_OKU]) {
  const S = fresh();
  const target = only(S, 'target_small');
  place(S, target, 100);
  refill(S);
  const res = S.performSkill(ref, target, S.entities());
  if (!res.ok) continue;
  const expected = res.breakdown.dotExpectedTotal;
  let ticks = 0, applied = 0;
  for (let i = 0; i < 60 * 8; i++) {
    for (const ev of S.combat.skills.tickStatuses(S.entities() as never, 1 / 60)) { ticks++; applied += ev.damage; }
  }
  console.log(`| ${balanceRow(ref).koName} | ${expected} | ${ticks} | ${applied} | ${applied - expected} |`);
}

/* -------------------------------------------------- 15 skill final V1 tablo */
console.log('\n## 15 SKİLL FINAL V1 TABLOSU');
console.log('| skill | KO | ref | Lv | MP | ind. CD | action | range | phys | ok | element | elem | DoT total | hit_type | hit_rate |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
const Sx = fresh();
for (const ref of [ARCHER.STANDART_ATIS, ARCHER.DELICI_OK, ARCHER.KOR_OKU, ARCHER.ZEHIRLI_UC,
  ARCHER.UCLU_SALVO, ARCHER.IZCI_OKU, ARCHER.KESKIN_ATIS, ARCHER.ALEV_ATISI, ARCHER.TOKSIK_ATIS,
  ARCHER.YIRTICI_OK, ARCHER.PATLAYICI_OK, ARCHER.ENGEREK_OKU, ARCHER.BESLI_SALVO,
  ARCHER.GOLGE_AVCISI, ARCHER.KARA_TAKIP]) {
  const r = balanceRow(ref);
  const name = Content.skills.find((d) => d.sourceRef === ref)?.displayName ?? '?';
  console.log(
    `| ${name} | ${r.koName} | ${ref} | ${r.requiredLevel} | ${r.manaCost} | ${r.individualCooldownSec.toFixed(1)}s | ${Sx.adapter.actionTimeOf(ref).toFixed(2)}s | ${r.castRange} | ${r.physicalCoefficient.toFixed(2)} | ${r.projectileCount} | ${r.element} | ${r.elementalCoefficient.toFixed(2)} | ${r.dotTotalCoefficient.toFixed(2)} | ${r.sourceHitType ?? '—'} | ${r.sourceHitRate ?? '—'} |`,
  );
}
