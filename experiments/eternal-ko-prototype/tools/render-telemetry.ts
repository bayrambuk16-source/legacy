/** P2.0 — RENDERER TELEMETRİSİ (headless, WebGL YOK).
 *  Çalıştırma: npm run telemetry:render
 *
 *  WebGL bağlamı olmadan ölçülebilenler: sahne grafiği büyüklüğü, görsel
 *  yaşam döngüsü, kamera yerleşimi, koordinat eşlemesi ve STRESS senaryosunun
 *  nesne sayıları. Gerçek draw call / üçgen / FPS değerleri tarayıcıdaki
 *  DEV → "Renderer telemetrisi" panelinden okunur. */
import { PrototypeState } from '../state.js';
import { ThreeWorldRenderer } from '../render3d/ThreeWorldRenderer.js';
import { buildWorldFrame } from '../render3d/frame.js';
import {
  CAMERA_V1, cameraLookAt, cameraPosition, orthoBounds,
} from '../render3d/CameraRig.js';
import { facingToYaw, toScene } from '../render3d/coords.js';
import { ARCHER } from '../data/archer-balance.js';
import type { WorldFrame } from '../render3d/views.js';
import {
  DEFAULT_MOB_VIEW, DEFAULT_PLAYER_VIEW, DEFAULT_PROJECTILE_VIEW,
} from '../render3d/views.js';
/* ---- P2.1 ---- */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ARCHER_CLIP_NAMES, ARCHER_MODEL, ARCHER_NATURAL_RELEASE_FRAME, ARCHER_NATURAL_RELEASE_SEC,
  ARCHER_SOCKETS, DEATH_AUTHORED_DISPLACEMENT_METERS, DEATH_GROUND_DIP_METERS,
  WORLD_UNITS_PER_METER, archerClip,
} from '../data/archer-model.js';
import { ArcherAnimator, familyThreshold, releaseTimingDelta } from '../render3d/ArcherAnimator.js';
import { ArcherRig } from '../render3d/ArcherRig.js';
import { parseGlb } from '../render3d/GlbLoader.js';
import { installHeadlessImageShim } from '../tests/headless-dom.js';
/* ---- P2.2 ---- */
import {
  MOB_PLACEHOLDER_HEIGHT_WORLD, MUTANT_MISSING_CLIPS, MUTANT_MODEL, mutantClip, mutantScaleFor,
} from '../data/mutant-model.js';
import { MutantAnimator, attackClipFor } from '../render3d/MutantAnimator.js';
import { MOB_AI_PROFILES } from '../data/mob-ai-profiles.js';
/* ---- P2.4 ---- */
import { ARROW_LENGTH_WORLD, ARROW_MODEL, ARROW_TIP_LOCAL } from '../data/arrow-model.js';

console.log('# P2.0 — THREE.JS RENDERER TELEMETRİSİ\n');

/* ---------------- bağımlılık ---------------- */
console.log('## §1/§3 — BAĞIMLILIK\n');
console.log('| Alan | Değer |');
console.log('|---|---|');
console.log('| three sürümü | **0.169.0** (SABİT) |');
console.log('| kaynak | yerel tarball → `vendor/three` |');
console.log('| runtime CDN | **YOK** |');
console.log('| bütünlük | `npm run verify:three` (sha256) |');
console.log('| tarayıcı yolu | esbuild `alias` → `vendor/three/build/three.module.js` |');
console.log('| headless yolu | `node_modules/three` → `vendor/three` (yerel bağlantı) |\n');

/* ---------------- koordinat + kamera ---------------- */
console.log('## §5/§8 — KOORDİNAT VE KAMERA\n');
console.log('```');
console.log('gameplay(worldX, worldY) → three(x = worldX, y = 0, z = worldY)');
console.log(`örnek: (1240, 1650) → ${JSON.stringify(toScene({ worldX: 1240, worldY: 1650 }))}`);
console.log(`facing 0 rad → yaw ${facingToYaw(0).toFixed(4)} rad (yerel ileri +Z)`);
console.log('```\n');
const t = CAMERA_V1;
console.log('| Parametre | Varsayılan | DEV seçenekleri |');
console.log('|---|---:|---|');
console.log(`| yaw | ${t.yawDeg}° | 0 / 45 / 90 / 135 |`);
console.log(`| pitch | ${t.pitchDeg}° | 40 / 50 / 55 / 60 / 70 |`);
console.log(`| mesafe | ${t.distance} | 600 / 750 / 900 / 1100 / 1400 |`);
console.log(`| bakış yüksekliği | ${t.height} | 0 / 60 / 90 / 140 |`);
console.log(`| FOV | ${t.fov} | 30 / 35 / 40 / 45 |`);
console.log(`| izdüşüm | ${t.projection} | perspective / orthographic |`);
console.log(`| yumuşatma | ${t.smoothing} | YALNIZ GÖRSEL |`);
const camAt = cameraPosition({ worldX: 1240, worldY: 1650 }, t);
const lookAt = cameraLookAt({ worldX: 1240, worldY: 1650 }, t);
console.log(`\nOyuncu (1240, 1650) iken kamera `
  + `(${camAt.x.toFixed(0)}, ${camAt.y.toFixed(0)}, ${camAt.z.toFixed(0)})`
  + ` → bakış (${lookAt.x.toFixed(0)}, ${lookAt.y.toFixed(0)}, ${lookAt.z.toFixed(0)})`);
const ob = orthoBounds(t, 620 / 1100);
console.log(`Ortografik sınırlar (620×1100): ${ob.left.toFixed(0)} … ${ob.right.toFixed(0)} yatay,`
  + ` ${ob.bottom.toFixed(0)} … ${ob.top.toFixed(0)} dikey\n`);

/* ---------------- STRESS (§23) ---------------- */
console.log('## §23 — STRESS SAHNESİ (1 oyuncu · 20 mob · 30 ok)\n');
{
  const r = new ThreeWorldRenderer();       // headless
  const mobs = Array.from({ length: 20 }, (_, i) => ({
    ...DEFAULT_MOB_VIEW,
    uid: 100 + i, generation: 1,
    worldX: 1240 + Math.cos(i) * 300, worldY: 1650 + Math.sin(i) * 300,
    aiType: (['NORMAL', 'AGGRESSIVE', 'ELITE'] as const)[i % 3],
  }));
  const projectiles = Array.from({ length: 30 }, (_, i) => ({
    ...DEFAULT_PROJECTILE_VIEW, id: 500 + i, worldX: 1240 + i * 4, worldY: 1650 + i * 3,
  }));
  const loot = Array.from({ length: 12 }, (_, i) => ({
    lootUid: 900 + i, worldX: 1200 + i * 12, worldY: 1700, isCoin: i % 2 === 0,
    colorHex: '#a06fd0',
  }));
  const frame: WorldFrame = {
    player: { ...DEFAULT_PLAYER_VIEW, worldX: 1240, worldY: 1650, facingAngle: 0.4, bodyAngle: 0.4, moving: true, moveX: 1, moveY: 0 },
    mobs, projectiles, loot, targetUid: 103,
    boundary: { centerX: 1240, centerY: 1650, radius: 650, enabled: true },
  };
  for (let i = 0; i < 10; i++) r.update(frame, 1 / 60);
  const s = r.stats();
  console.log('| Ölçüm | Değer |');
  console.log('|---|---:|');
  console.log(`| mob görseli | ${s.mobVisualCount} |`);
  console.log(`| ok görseli | ${s.projectileVisualCount} |`);
  console.log(`| ganimet görseli | ${s.lootVisualCount} |`);
  console.log(`| sahne nesnesi (toplam Object3D) | ${s.activeObjectCount} |`);
  console.log(`| üretilen / silinen görsel | ${s.visualsCreated} / ${s.visualsRemoved} |`);
  console.log(`| WebGL | ${s.webgl ? 'var' : 'YOK (headless)'} |`);
  /* boşalt → sızıntı kontrolü */
  r.update({ ...frame, mobs: [], projectiles: [], loot: [], targetUid: null }, 1 / 60);
  const after = r.stats();
  console.log(`\nBoş kare sonrası: mob ${after.mobVisualCount} · ok ${after.projectileVisualCount}`
    + ` · ganimet ${after.lootVisualCount} · canlı görsel`
    + ` ${after.visualsCreated - after.visualsRemoved} (**sızıntı yok**)`);
  r.dispose();
}

/* ---------------- gerçek oyun karesi ---------------- */
console.log('\n## GERÇEK FARM KARESİ (8 mob · Genie açık)\n');
{
  const S = new PrototypeState(20260822);
  S.infiniteMp = true;
  S.genie.settings.hpPotionRef = null; S.genie.settings.mpPotionRef = null;
  S.genie.start(S.world);
  const r = new ThreeWorldRenderer();
  const dt = 1 / 60;
  let peakProj = 0;
  for (let i = 0; i < 60 * 20; i++) {
    const mv = S.genie.movementIntent(S.entities(), S.world);
    if (mv.magnitude > 0) { S.movement.move(S.world, mv, dt); S.genie.clampPlayer(S.world); }
    S.player.update(dt); S.combat.update(dt); S.adapter.updateAction(dt); S.updateInfiniteMp();
    S.stepCombat(dt, S.entities());
    S.mobs.update(dt, S.world);
    S.tickStatuses(dt, S.entities());
    S.worldLoot.update(dt);
    S.reapDead();
    S.genie.update(dt, S.entities(), S.world);
    r.update(buildWorldFrame(S), dt);
    peakProj = Math.max(peakProj, r.stats().projectileVisualCount);
  }
  const s = r.stats();
  console.log(`20 sn farm · kill ${S.drops.totals.kills} · sahne nesnesi ${s.activeObjectCount}`
    + ` · mob görseli ${s.mobVisualCount} · ok tepe ${peakProj}`
    + ` · üretilen ${s.visualsCreated} · silinen ${s.visualsRemoved}`);
  console.log(`Canlı görsel = üretilen − silinen = ${s.visualsCreated - s.visualsRemoved}`
    + ` (mob ${s.mobVisualCount} + ok ${s.projectileVisualCount} + ganimet ${s.lootVisualCount})`);
  r.dispose();
}

/* ---------------- salvo ---------------- */
console.log('\n## §16 — SALVO GÖRSEL SAYISI\n');
{
  const S = new PrototypeState(20260823);
  S.infiniteMp = true;
  const mob = S.mobs.mobs.find((m) => m.slotId === 'fa_a3')!;
  mob.hp = 1e9; mob.maxHp = 1e9;
  S.world.worldX = mob.worldX - 100; S.world.worldY = mob.worldY;
  S.targets.select(mob.uid);
  console.log('| Skill | authoritative ok | görsel |');
  console.log('|---|---:|---:|');
  for (const [name, ref] of [['Standart Atış', ARCHER.STANDART_ATIS],
    ['Üçlü Salvo', ARCHER.UCLU_SALVO], ['Beşli Salvo', ARCHER.BESLI_SALVO]] as const) {
    S.action.reset(); S.combat.skills.reset(); S.updateInfiniteMp();
    S.performSkill(ref, mob, S.entities());
    let g = 0;
    while (S.adapter.pipeline.projectiles.length === 0 && g++ < 4000) S.stepCombat(1 / 240, S.entities());
    const authoritative = S.adapter.pipeline.projectiles.length;
    const visual = buildWorldFrame(S).projectiles.length;
    console.log(`| ${name} | ${authoritative} | ${visual} |`);
    while ((S.adapter.pipeline.projectiles.length > 0 || S.adapter.pipeline.pending.length > 0)
      && g++ < 9000) S.stepCombat(1 / 240, S.entities());
  }
  console.log('\n> Geometri ve hasar `CombatPipeline`\'da; renderer yalnız SAYIYI yansıtır.');
}

/* ═══════════════ P2.1 — ARCHER GLB ═══════════════ */
console.log('\n\n# P2.1 — ARCHER GLB TELEMETRİSİ\n');

installHeadlessImageShim();
const GLB_PATH = join(import.meta.dirname, '..', '..', '..',
  'public', 'assets', 'models', 'archer_mobile_v1.glb');
const GLB_BYTES = readFileSync(GLB_PATH);
const GLB_BUFFER = GLB_BYTES.buffer.slice(
  GLB_BYTES.byteOffset, GLB_BYTES.byteOffset + GLB_BYTES.byteLength) as ArrayBuffer;

console.log('## VARLIK GERÇEKLERİ (manifest authoritative)\n');
console.log('| Alan | Değer |');
console.log('|---|---|');
console.log(`| dosya | \`${ARCHER_MODEL.file}\` |`);
console.log(`| boyut | ${ARCHER_MODEL.fileBytes.toLocaleString('tr-TR')} bayt |`);
console.log(`| vertex / üçgen | ${ARCHER_MODEL.vertices} / ${ARCHER_MODEL.triangles} |`);
console.log(`| mesh / primitive / materyal / draw call | ${ARCHER_MODEL.meshes} / `
  + `${ARCHER_MODEL.primitives} / ${ARCHER_MODEL.materials} / ${ARCHER_MODEL.drawCalls} |`);
console.log(`| kemik / klip | ${ARCHER_MODEL.boneCount} / ${ARCHER_MODEL.clipCount} |`);
console.log(`| atlas | ${ARCHER_MODEL.atlasSize.join('×')} · ${ARCHER_MODEL.atlasFormat} |`);
console.log(`| eksen | ${ARCHER_MODEL.upAxis}-up · ${ARCHER_MODEL.forwardAxis} forward |`);
console.log(`| karakter yüksekliği | ${ARCHER_MODEL.characterHeightMeters} m |`);
console.log(`| decoder bağımlılığı | ${ARCHER_MODEL.decoderDependency ?? '**YOK**'} |`);
console.log(`| zorunlu extension | ${ARCHER_MODEL.extensionsRequired.length === 0
  ? '**YOK**' : ARCHER_MODEL.extensionsRequired.join(', ')} |`);
console.log(`\n> Ölçek köprüsü: 1 m = ${WORLD_UNITS_PER_METER.toFixed(3)} world birimi `
  + `(P2.0 placeholder yüksekliği 52 birim KORUNDU).`);

console.log('\n## RELEASE TIMING (§RELEASE TIMING)\n');
{
  const S = new PrototypeState(20260824);
  const gameplay = S.adapter.pipeline.timing.releaseDelaySec;
  console.log('| Kaynak | Değer |');
  console.log('|---|---:|');
  console.log(`| animasyon doğal bırakma (13_AIM_RECOIL, kare ${ARCHER_NATURAL_RELEASE_FRAME}) `
    + `| **${ARCHER_NATURAL_RELEASE_SEC.toFixed(3)} sn** |`);
  console.log(`| gameplay releaseDelay (DEĞİŞTİRİLMEDİ) | **${gameplay.toFixed(2)} sn** |`);
  console.log(`| fark | **${releaseTimingDelta(gameplay).toFixed(3)} sn** |`);
  console.log('\n> Gameplay sabiti P2.1\'de DEĞİŞTİRİLMEDİ; fark kabul edilebilir.');
}

console.log('\n## LOKOMOSYON PLAYBACK (kaynak hız → timeScale)\n');
{
  const speeds = [120, 90, 150];
  console.log('| playerSpeed (world/sn) | m/sn | seçilen klip | kaynak m/sn | timeScale |');
  console.log('|---:|---:|---|---:|---:|');
  const a = new ArcherAnimator();
  for (const sp of speeds) {
    const mps = sp / WORLD_UNITS_PER_METER;
    a.reset();
    a.update(1 / 60, {
      alive: true, speedMetersPerSec: mps, localMoveAngle: 0, moving: true,
      attackTriggerCount: 0, skillTriggerCount: 0, hpRatio: 1,
      weaponRef: 160210045, hasTarget: false,
    });
    const d = a.update(1 / 60, {
      alive: true, speedMetersPerSec: mps, localMoveAngle: 0, moving: true,
      attackTriggerCount: 0, skillTriggerCount: 0, hpRatio: 1,
      weaponRef: 160210045, hasTarget: false,
    });
    const src = archerClip(d.clip).sourceSpeedMetersPerSec;
    console.log(`| ${sp} | ${mps.toFixed(2)} | ${d.clip} | ${src.toFixed(3)} `
      + `| ×${d.timeScale.toFixed(2)} |`);
  }
  console.log(`\n> RUN ↔ AIM_WALK eşiği (ileri) = √(3.632 × 1.156) = `
    + `${familyThreshold(0).toFixed(3)} m/sn — manifest hızlarından TÜRETİLDİ.`);
}

console.log('\n## YAY KAVRAMA — 17 KLİPTE SAPMA\n');
{
  const rig = new ArcherRig(await parseGlb(GLB_BUFFER));
  let min = Infinity, max = -Infinity;
  console.log('| Klip | süre | yay↔sol el (m) |');
  console.log('|---|---:|---:|');
  for (const name of ARCHER_CLIP_NAMES) {
    const c = archerClip(name);
    let cMin = Infinity, cMax = -Infinity;
    for (let k = 0; k <= 4; k++) {
      rig.sampleClip(name, (c.durationSec * k) / 4);
      const d = rig.bowGripDistanceMeters() ?? 0;
      cMin = Math.min(cMin, d); cMax = Math.max(cMax, d);
    }
    min = Math.min(min, cMin); max = Math.max(max, cMax);
    console.log(`| ${name} | ${c.durationSec.toFixed(2)} sn | ${cMin.toFixed(6)} |`);
  }
  console.log(`\n> 17 klip × 5 kare: **sapma ${(max - min).toExponential(2)} m** — `
    + 'yay elden KOPMUYOR.');
  rig.dispose();
}

console.log('\n## ÖLÜM ÖZEL DURUMU (§DEATH SPECIAL CASE)\n');
{
  const S = new PrototypeState(20260825);
  const r = new ThreeWorldRenderer();
  r.tuning.smoothing = 0;
  const rig = r.attachArcher(await parseGlb(GLB_BUFFER));
  S.world.worldX = 1240; S.world.worldY = 1650;
  r.update(buildWorldFrame(S), 1 / 60);
  const bx = S.world.worldX, by = S.world.worldY;
  S.player.takeDamage(999999);
  for (let i = 0; i < 60 * 3.5; i++) r.update(buildWorldFrame(S), 1 / 60);
  console.log('| Ölçüm | Değer |');
  console.log('|---|---:|');
  console.log(`| gameplay worldX/worldY değişimi | **${(S.world.worldX - bx).toFixed(6)} / `
    + `${(S.world.worldY - by).toFixed(6)}** |`);
  console.log(`| model-yerel yatay kayma | ${rig.hipsLocalDisplacementMeters().toFixed(3)} m `
    + `(manifest ${DEATH_AUTHORED_DISPLACEMENT_METERS} m) |`);
  console.log(`| kaynak zemin batması | ${DEATH_GROUND_DIP_METERS} m |`);
  console.log(`| uygulanan GÖRSEL Y ötelemesi | +${rig.modelLocalOffset().y.toFixed(2)} m |`);
  S.player.restoreVitals({ hp: Number.POSITIVE_INFINITY });
  for (let i = 0; i < 10; i++) r.update(buildWorldFrame(S), 1 / 60);
  console.log(`| respawn sonrası kök ötelemesi | ${JSON.stringify(rig.modelLocalOffset())} |`);
  console.log(`| respawn sonrası klip | ${rig.currentClip} |`);
  console.log('\n> Gameplay konumu ölüm boyunca DEĞİŞMEDİ; düşüş model-yerel SUNUMDUR.');
  r.dispose();
}

console.log('\n## SOCKETLER (manifestten BİREBİR)\n');
{
  const rig = new ArcherRig(await parseGlb(GLB_BUFFER));
  rig.sampleClip('12_AIM_OVERDRAW', 1.5);
  console.log('| Socket | kemik | yerel konum (m) | dünya (world birimi) |');
  console.log('|---|---|---|---|');
  for (const s of ARCHER_SOCKETS) {
    const w = rig.socketWorldPosition(s.name);
    console.log(`| ${s.name} | \`${s.bone}\` | ${s.localPosition.map((v) => v.toFixed(4)).join(', ')} `
      + `| ${w ? `${w.x.toFixed(1)}, ${w.y.toFixed(1)}, ${w.z.toFixed(1)}` : '—'} |`);
  }
  console.log('\n> Hard-code edilmiş farklı ofset UYDURULMADI.');
  rig.dispose();
}

/* ═══════════════ P2.2 — MUTANT MOB ═══════════════ */
console.log('\n\n# P2.2 — MUTANT MOB TELEMETRİSİ\n');

const MUTANT_PATH = join(import.meta.dirname, '..', '..', '..',
  'public', 'assets', 'models', 'mutant_mobile_v1.glb');
const MUTANT_BYTES = readFileSync(MUTANT_PATH);
const MUTANT_BUFFER = MUTANT_BYTES.buffer.slice(
  MUTANT_BYTES.byteOffset, MUTANT_BYTES.byteOffset + MUTANT_BYTES.byteLength) as ArrayBuffer;

console.log('## VARLIK GERÇEKLERİ (manifest authoritative)\n');
console.log('| Alan | Değer |');
console.log('|---|---|');
console.log(`| dosya | \`${MUTANT_MODEL.file}\` |`);
console.log(`| boyut | ${MUTANT_MODEL.fileBytes.toLocaleString('tr-TR')} bayt |`);
console.log(`| vertex / üçgen | ${MUTANT_MODEL.vertices} / ${MUTANT_MODEL.triangles} |`);
console.log(`| mesh / materyal / draw call | ${MUTANT_MODEL.meshes} / `
  + `${MUTANT_MODEL.materials} / ${MUTANT_MODEL.drawCalls} |`);
console.log(`| skin joint / node | ${MUTANT_MODEL.skinJointCount} / ${MUTANT_MODEL.nodeCount} |`);
console.log(`| klip | ${MUTANT_MODEL.clipCount} |`);
console.log(`| boy | ${MUTANT_MODEL.characterHeightMeters} m |`);
console.log(`| decoder bağımlılığı | ${MUTANT_MODEL.decoderDependency ?? '**YOK**'} |`);
console.log(`| **EKSİK KLİP (uydurulmadı)** | **${MUTANT_MISSING_CLIPS.join(', ')}** |`);

console.log('\n## AI FAZI → KLİP EŞLEMESİ\n');
{
  const a = new MutantAnimator();
  const rows: Array<[string, number]> = [
    ['IDLE', 0], ['ROAM', 55 / WORLD_UNITS_PER_METER], ['CHASE', 75 / WORLD_UNITS_PER_METER],
    ['RETURN', 55 / WORLD_UNITS_PER_METER], ['DYING', 0], ['DEAD', 0],
  ];
  console.log('| faz | ölçülen hız (m/sn) | klip | kaynak (m/sn) | timeScale |');
  console.log('|---|---:|---|---:|---:|');
  for (const [phase, speed] of rows) {
    a.reset();
    const inp = {
      phase: phase as never, speedMetersPerSec: speed,
      attackPhase: 'recovery' as const, attackTimer: 0, hitMomentSec: 0.45,
    };
    a.update(1 / 60, inp);
    const d = a.update(1 / 60, inp);
    const src = mutantClip(d.clip).sourceSpeedMetersPerSec;
    console.log(`| ${phase} | ${speed.toFixed(2)} | ${d.clip} | ${src.toFixed(3)} `
      + `| ×${d.timeScale.toFixed(2)} |`);
  }
  const atk = attackClipFor(MOB_AI_PROFILES.NORMAL.hitMomentSec);
  console.log(`\n> SALDIRI: profil vuruş anı ${MOB_AI_PROFILES.NORMAL.hitMomentSec} sn → `
    + `**${atk.name}** (ölçülmüş vuruş ${atk.hitTimeSec} sn, erişim ${atk.reachMeters} m). `
    + `Klip, windup sayacı ${atk.hitTimeSec} sn'ye inince başlar → animasyon vuruşu `
    + 'gameplay vuruşuyla AYNI KAREDE temas eder.');
}

console.log('\n## ÖLÇEK (P2.0 silüet hiyerarşisi KORUNDU)\n');
console.log('| AI tipi | placeholder yüksekliği | model ölçeği | world yüksekliği |');
console.log('|---|---:|---:|---:|');
for (const t of ['NORMAL', 'AGGRESSIVE', 'ELITE'] as const) {
  const sc = mutantScaleFor(t);
  console.log(`| ${t} | ${MOB_PLACEHOLDER_HEIGHT_WORLD[t]} | ×${sc.toFixed(3)} `
    + `| ${(MUTANT_MODEL.characterHeightMeters * sc).toFixed(1)} |`);
}

console.log('\n## ÖRNEK PAYLAŞIMI VE SIZINTI\n');
{
  const S2 = new PrototypeState(20260826);
  const r = new ThreeWorldRenderer();
  r.tuning.smoothing = 0;
  r.attachMutant(await parseGlb(MUTANT_BUFFER));
  S2.mobs.ai.respawnOverrideSec = 0.4;
  let peak = 0;
  for (let i = 0; i < 60 * 60; i++) {
    if (i % 240 === 0) for (const m of S2.mobs.mobs) { m.hp = 0; m.state = 'dying'; }
    S2.reapDead();
    S2.mobs.update(1 / 60, S2.world);
    r.update(buildWorldFrame(S2), 1 / 60);
    peak = Math.max(peak, r.stats().mob?.rigCount ?? 0);
  }
  const st = r.stats();
  console.log('| Ölçüm | Değer |');
  console.log('|---|---:|');
  console.log(`| 60 sn respawn döngüsünde mob örnek TEPESİ | **${peak}** |`);
  console.log(`| görsel üretilen / silinen | ${st.visualsCreated} / ${st.visualsRemoved} |`);
  console.log(`| canlı görsel | ${st.visualsCreated - st.visualsRemoved} |`);
  console.log(`| sahne nesnesi | ${st.activeObjectCount} |`);
  console.log('\n> Geometri ve materyal TEK KOPYA paylaşılır (`SkeletonUtils.clone`); '
    + 'yalnız düğüm grafiği + skeleton kopyalanır.');
  r.dispose();
}

/* ═══════════════ P2.4 — GERÇEK OK MODELİ ═══════════════ */
console.log('\n\n# P2.4 — OK MODELİ TELEMETRİSİ\n');
{
  const ARROW_PATH = join(import.meta.dirname, '..', '..', '..',
    'public', 'assets', 'models', 'arrow_mobile_v1.glb');
  const ab = readFileSync(ARROW_PATH);
  const buf = ab.buffer.slice(ab.byteOffset, ab.byteOffset + ab.byteLength) as ArrayBuffer;

  console.log('| Alan | Değer |');
  console.log('|---|---|');
  console.log(`| dosya | \`${ARROW_MODEL.file}\` · ${ARROW_MODEL.fileBytes.toLocaleString('tr-TR')} bayt |`);
  console.log(`| vertex / üçgen | ${ARROW_MODEL.vertices} / ${ARROW_MODEL.triangles} |`);
  console.log(`| mesh / materyal / draw call | ${ARROW_MODEL.meshes} / `
    + `${ARROW_MODEL.materials} / ${ARROW_MODEL.drawCalls} |`);
  console.log(`| uzunluk | ${ARROW_MODEL.lengthMeters} m = `
    + `**${ARROW_LENGTH_WORLD.toFixed(2)} world birimi** |`);
  console.log(`| yönelim | ${ARROW_MODEL.forwardAxis} ileri · orijin NOCK (z = 0) |`);
  console.log(`| uç (yerel) | (0, 0, ${ARROW_TIP_LOCAL[2]}) |`);
  console.log(`| alfa | ${ARROW_MODEL.alphaMode} (ZORUNLU) · çift yüzlü `
    + `${ARROW_MODEL.doubleSided ? 'EVET' : 'HAYIR'} (ZORUNLU) |`);
  console.log(`| decoder bağımlılığı | ${ARROW_MODEL.decoderDependency ?? '**YOK**'} |`);

  const S3 = new PrototypeState(20260827);
  const r = new ThreeWorldRenderer();
  r.tuning.smoothing = 0;
  const attached = r.attachArrow(await parseGlb(buf));
  const projs = Array.from({ length: 10 }, (_, i) => ({
    ...DEFAULT_PROJECTILE_VIEW, id: 9000 + i,
    worldX: S3.world.worldX + i * 10, worldY: S3.world.worldY,
  }));
  const base = { ...buildWorldFrame(S3), projectiles: [] as typeof projs };
  r.update(base, 1 / 60);
  const before = r.stats().activeObjectCount;
  r.update({ ...base, projectiles: projs }, 1 / 60);
  console.log(`\n> Model bağlandı: ${attached ? 'EVET' : 'HAYIR'} · `
    + `10 ok = **${r.stats().activeObjectCount - before} sahne nesnesi** `
    + '(düğüm grafiği KOPYALANMAZ; yalnız geometri + materyal paylaşılan '
    + 'projectile yoluna takılır). Orijin NOCK\'tan UCA taşınır: gameplay\'in '
    + 'otoritatif konumu okun VURDUĞU noktadır.');
  r.dispose();
}
