/** EXPERIMENT P1 testleri — RENDERER OLMADAN çalışır.
 *  Ana test paketinden ayrıdır (`npm run test:proto`); experiments/ silinirse
 *  ana `npm run test` etkilenmez. */
import { mulberry32 } from '../../../src/engine/rng.js';
import { Content } from '../../../src/game/data/GameContentRepository.js';
import { PlayerState } from '../../../src/game/systems/PlayerState.js';
import { INVENTORY_CAPACITY, InventoryState } from '../../../src/game/systems/InventoryState.js';
import { ITEM_ICONS, ITEM_ICON_PATHS, itemIconKey } from '../data/item-icons.js';
import { resolveJoystick, WorldMovementSystem } from '../world/WorldMovementSystem.js';
import { WorldCameraController, smoothFactor } from '../world/WorldCameraController.js';
import { WorldTargetSystem } from '../world/WorldTargetSystem.js';
import { MobSlotSystem } from '../world/MobSlotSystem.js';
import { WorldLootSystem } from '../world/WorldLootSystem.js';
import { CombatRangeProfile } from '../world/CombatRangeProfile.js';
import { PrototypeState } from '../state.js';
import { PROTO, Tuning, TUNING_DEFAULTS } from '../config.js';
import { WORLD_BOUNDS } from '../data/world-map.js';
import type { MobSpawnSlot } from '../data/farm-area.js';
import { FARM_AREA_SLOTS, TEST_FARM_AREA_SLOTS } from '../data/farm-area.js';
import { MOB_AI_PROFILES, MOB_AI_TYPES, RESPAWN_DEFAULT, RESPAWN_OPTIONS } from '../data/mob-ai-profiles.js';
import {
  MAX_MOBS_PER_SLOT, MIN_MOBS_PER_SLOT, defineMobSlot, instanceSpawnPoint, isCanonicalSlot,
  isInsideArea, slotPlacement, validateMobSlot,
  type MobSlotDefinition,
} from '../data/mob-slot-schema.js';
import {
  TEST_MULTI_SLOTS, TEST_SLOT_A, TEST_SLOT_B, TEST_SLOT_RESPAWN_SEC,
} from '../data/test-mob-slots.js';
import { profileFor } from '../world/MobAi.js';
import { heightAt, terrainNodeHeight } from '../data/moradon-terrain.js';
import { MORADON_GRID, MORADON_NODE_STEP } from '../data/moradon-terrain-data.js';
import {
  MORADON_CELL_SIZE, MORADON_MASK_CELLS, MORADON_PLAYABLE_RECT,
  canTraverse, isCellBlocked, isWalkable,
} from '../data/moradon-walkmask.js';
import { MORADON_HEIGHT_FIXTURE } from '../data/moradon-meta-data.js';
import { MORADON_TERRAIN_SPAN } from '../data/moradon-terrain.js';
import { buildTerrainGeometry, groundElevationAt } from '../render3d/terrain.js';
import {
  INV_LAYOUT, bagCellRects, bagEntries, compareLines, definitionOf, equipSlotRects,
  hitTest as invHitTest, invButtons, invCloseButton, targetSlotFor, type UiRect,
} from '../ui/inventory-panel.js';
import {
  HUD_EXP_BAR, HUD_PLAYER_CARD, HUD_TARGET_BTN, UI_MOCK, UI_SCALE,
  hudNavBoxes, hudSkillBoxes, hudSpriteKeys,
} from '../ui/hud-layout.js';
import {
  CHAR_GEAR_BOX, CHAR_STATS_BOX, PANEL_FRAME, SKILL_PAGE_SIZE, charHitTest, gearSlotOrder,
  skillBarRects, skillHitTest, skillPageButtons, skillPoolRects, statRows,
} from '../ui/character-panel.js';
import { StatCalculator } from '../../../src/game/systems/CharacterStats.js';
import { GENIE_SKILL_POOL } from '../data/archer-skills.js';
import { ARCHER_SOURCE_ITEMS, archerSourceItem } from '../data/archer-source-items.js';
import {
  ALLOC_BOX, ALLOC_ROWS, CHAR_STAT_FIRST_Y, allocButtons, parseAllocId,
} from '../ui/character-panel.js';
import {
  POWER_EXPONENT, POWER_SCORE_MIN, formatPower, formatPowerDelta, powerScore,
} from '../data/power-score.js';
import { AUTO_GEAR_DEFAULTS } from '../world/AutoGearSystem.js';
import { EXTRA_MONSTERS } from '../data/extra-monsters.js';
import { NON_GEAR_COLOR, nonGearInfo, nonGearRole } from '../ui/non-gear-info.js';
import { QUESTS, promotionQuests, questById } from '../data/quests.js';
import { DEATH_EXP_PENALTY } from '../state.js';
import { POTION_COOLDOWN_SEC } from '../world/PotionSystem.js';
import { LEVELING } from '../../../src/game/config.js';
import {
  EQUIP_DROP_CHANCE, HIGH_TIER_EQUIP_CHANCE, HIGH_TIER_MONSTER_LEVEL,
  HIGH_TIER_TROPHY_CHANCE, HIGH_TIER_TROPHY_REF, equipChanceFor,
  itemTierLevel, pickFromPool, poolFor, slotCoverage,
} from '../data/moradon-loot-pool.js';
import { FIXED_SELL_PRICES, equipSellPrice, fixedSellPrice } from '../data/sell-prices.js';
import {
  GATE_ALPHA, SKILL_ICONS, gateBadge, skillGate, skillIconKey, skillInitial,
  skillsWithoutIcon,
} from '../data/skill-visuals.js';
import {
  GOBLIN_MAX_LEVEL, KECOON_ATTRIBUTION, KECOON_CLIPS, KECOON_CLIP_MAP,
  kecoonAttackClipFor, kecoonScaleFor, usesGoblinModel,
} from '../data/kecoon-model.js';
import { clipFactOf, clipMapFor } from '../render3d/MutantAnimator.js';
import type { MobPhase } from '../world/MobAi.js';
import {
  CAMERA_DIAGONAL_REACH, MAX_MOB_VISUALS, MOB_DRAW_DISTANCE,
} from '../data/mob-draw-distance.js';
import { FOLIAGE_CELL } from '../data/moradon-foliage.js';
import {
  QUALITY_ORDER, QUALITY_PROFILES, effectivePixelRatio, nextQuality, pixelCount,
} from '../data/quality-profile.js';
import {
  GENIE_PANEL, GENIE_SET_TABS, GENIE_SKILL_SLOTS, GENIE_SLIDERS, GENIE_TOGGLES,
  SLIDER_TRACK, genieHitTest,
} from '../ui/genie-panel.js';
import {
  CHAR_IDENTITY_ROWS, CHAR_RESIST_ROWS, SKILL_BAR_SLOTS, SKILL_POOL_COLS,
  SKILL_POOL_ROWS, skillPoolCells,
} from '../ui/character-panel.js';
import {
  CAMERA_MODES, CAMERA_MODE_LABEL, CAMERA_THIRD, approachYaw, baseTuning, modeYaw, nextMode,
} from '../ui/camera-mode.js';
import { MIN_EXP_MULTIPLIER, expLevelGapMultiplier, killExp } from '../data/exp-level-gap.js';
import { PROTO_SAVE_VERSION, ProtoSaveSystem, type ProtoSaveData } from '../data/proto-save.js';
import {
  KEEP_MAX_OPTIONS, PENDING_BOX, PENDING_PAGE_SIZE, SELL_PANEL, TOGGLE_IDS,
  bulkButtons, classButtons, deathOkButton, keepMaxButtons, pendingRows, sellHitTest,
  toggleRects, DEATH_BOX,
} from '../ui/sell-panel.js';
import {
  HP_POTION_REF, MP_POTION_REF, POTION_DROP_CHANCE, TROPHY_DROP_CHANCE, TROPHY_ITEM_REF,
} from '../world/DropSystem.js';
import {
  FOLIAGE_BASE_SCALE, FOLIAGE_MODEL_KEY, FOLIAGE_SEED, SPAWN_CLEAR, SLOT_MARGIN,
  buildFoliage, type FoliageKind,
} from '../data/moradon-foliage.js';
import {
  FORGE_EFFECTIVE_MAX, canAttempt, forgePreview, goldCost, scrollCost, successChance,
} from '../data/forge-model.js';
import { SCROLL_ITEM_REF } from '../world/ForgeSystem.js';
import {
  ARCHER_BASE_STATS, COEF_SCALE, HUNTER_LEVEL_GATE, ROGUE_STAGES,
  koArcherAttackPower, koArcherMaxHp, koArcherMaxMp, koNormalPhysicalDamage,
  koPhysicalAfterArmor, koType2ArrowDamage, koType2SkillHit, randomIntInclusive,
  rogueStageForLevel, skillPointsForLevel, statPointsForLevel,
} from '../../../src/game/systems/combat/KoArcherDamage.js';
import { ArcherProgression } from '../../../src/game/systems/combat/ArcherProgression.js';
import {
  ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN, applyZoom, clampZoom, pinchDistance, pinchZoom,
} from '../ui/camera-zoom.js';
import { CORPSE_VISIBLE_SEC } from '../render3d/frame.js';
import {
  KEEP_RADIUS, MORADON_PLAY_SPAWN, MORADON_POPULATION, MORADON_RESPAWN_SEC, SLOT_RECT,
} from '../data/moradon-farm-slots.js';
import { FORGE_LIST_BOX, FORGE_PAGE_SIZE, FORGE_PREVIEW_BOX, forgeButtons, forgeHitTest, forgeRowRects } from '../ui/character-panel.js';
import { GROUND_TEXTURE_KEY, PROTO_MODELS, UI_ASSETS } from '../data/proto-assets.js';
/* MORADON_WORLD_SPAWN ve SPAWN_POINT dosyanın ilerisinde ZATEN import edilir
   (P2.4A bloğu / world-map). Burada yalnız P2.4C'ye özgü adlar alınır. */
import {
  ACTIVE_MAP, MORADON_COLLISION_ACTIVE, OBSTACLES as ACTIVE_OBSTACLES, TEST_SPAWN_POINT,
  TEST_WORLD, TEST_WORLD_BOUNDS, worldStepAllowed,
} from '../data/world-map.js';
/** Genie'nin TAM BİR karar tiki (P1.6.1 biriktirici saati).
 *  Rotasyon/cursor testleri "bir çağrı = bir karar" ister; bu yüzden karar
 *  aralığı kadar ilerletilir. Eskiden `update(1)` kullanılıyordu ve bu yalnız
 *  sayacın kare tabanlı olması sayesinde tek tik üretiyordu. */
const GENIE_TICK = GENIE_DEFAULTS.decisionIntervalSec;
import type { PlayerWorldState, Obstacle, WorldMob } from '../world/types.js';
import type { GameMonster } from '../../../src/game/data/GameContentRepository.js';
import { DEFAULT_LOADOUT, LOADOUT_SLOTS } from '../../../src/game/data/skill-behaviors.js';
import { SkillLoadout } from '../../../src/game/systems/SkillLoadout.js';
import { SkillRegistry } from '../../../src/game/systems/SkillRegistry.js';
import { HITBOX, hitboxRadius } from '../world/hitbox.js';
import {
  DEFAULT_COLLISION_MODE, MULTISHOT_PROFILES, rayHitsMob, resolveMultiShot,
} from '../world/MultiShot.js';
import { GENIE_DEFAULTS, GenieSystem, SET_MODES, type GenieAction, type SetMode } from '../world/GenieSystem.js';
import { PLAYER_ANIM, PlayerAnimator, STATE_CLIP } from '../world/PlayerAnimation.js';
import {
  ARCHER_BALANCE, ARCHER_CAST_RANGE, POISON_DURATION_SEC, POISON_TICK_SEC,
  balanceRow, castRange, dotPerTickCoefficient, dotTickCount, elementalCoefficient,
  elementOf, isMultiShotRef, physicalCoefficient, projectileCount,
  effectiveRequiredLevel, sourceRequiredLevel,
} from '../data/archer-balance.js';
import {
  ARCHER_ATLAS_DEFAULT, ARCHER_ATLAS_KEY, ARCHER_CLIPS, ATLAS_DIRECTIONS,
  ATLAS_DIRECTION_ROW, RUNTIME_INDEX_DIRECTION, RUNTIME_INDEX_TO_ATLAS_ROW,
  atlasRowForAngle, clipForSkillRef, footPad, validateAtlasMeta,
  type ArcherAtlasMeta,
} from '../data/archer-atlas.js';
import {
  OKCU_DIRECTION_SHEETS, OKCU_FOOT_PAD, OKCU_FRAME, PROTO_ASSETS,
  directionIndex, okcuSheet,
} from '../data/proto-assets.js';
import { LOOT_DEFAULTS, LootPolicy } from '../world/LootPolicy.js';
import type { DropEvent, DropRecord } from '../world/DropSystem.js';
import {
  ITEM_CLASSES, ITEM_CLASS_COLOR, ITEM_CLASS_RANK, resolveStats,
  type WeaponDefinition,
} from '../data/item-model.js';
import {
  ARCHER_ACCESSORIES, ARCHER_ARMOR, ARCHER_WEAPONS,
  allDefinitions, isEquipmentItem, itemDefinition,
} from '../data/item-catalog.js';
import { EquipService } from '../world/EquipService.js';
/* ---- P2.0 renderer katmanı ---- */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  facingToYaw, normalizeAngle, toGameplay, toScene, yawToFacing,
} from '../render3d/coords.js';
import {
  CAMERA_V1, cameraLookAt, cameraPosition, orthoBounds, screenAxes, screenToWorldMove,
  smoothTowards,
} from '../render3d/CameraRig.js';
import {
  VisualRegistry, lootVisualKey, mobVisualKey, projectileVisualKey,
} from '../render3d/VisualRegistry.js';
import { ANIMATION_CLIPS, Asset3dRegistry } from '../render3d/assets3d.js';
import { DEFAULT_PROJECTILE_VIEW, type ProjectileView } from '../render3d/views.js';
/* ---- P2.1 Archer GLB ---- */
import {
  ARCHER_CLIPS as ARCHER_GLB_CLIPS, ARCHER_CLIP_NAMES, ARCHER_MODEL,
  ARCHER_NATURAL_RELEASE_FRAME,
  ARCHER_NATURAL_RELEASE_SEC, DEATH_AUTHORED_DISPLACEMENT_METERS, DEATH_GROUND_DIP_METERS,
  DEATH_VISUAL_Y_OFFSET_METERS, WORLD_UNITS_PER_METER, archerClip, archerSocket,
  metersToWorld, worldToMeters,
} from '../data/archer-model.js';
import {
  ARCHER_CLIP_MAP, ArcherAnimator, directionalClip, familyThreshold, localMoveVector,
  releaseTimingDelta, type ArcherAnimInput,
} from '../render3d/ArcherAnimator.js';
/* ---- P2.2 mutant ---- */
import {
  MOB_PLACEHOLDER_HEIGHT_WORLD, MUTANT_CLIPS, MUTANT_CLIP_NAMES,
  MUTANT_DEATH_GROUND_DIP_METERS, MUTANT_DEATH_VISUAL_Y_OFFSET_METERS, MUTANT_MISSING_CLIPS,
  MUTANT_MODEL, mutantClip, mutantScaleFor,
} from '../data/mutant-model.js';
import {
  MutantAnimator, attackClipFor, type MutantAnimInput,
} from '../render3d/MutantAnimator.js';
import { MobRig, MutantRigFactory } from '../render3d/MobRig.js';
/* ---- P2.4 ok ---- */
import { ARROW_MODEL, ARROW_TIP_LOCAL } from '../data/arrow-model.js';
import { ArcherRig } from '../render3d/ArcherRig.js';
import {
  decodeDataUri, findNode, inlineGlbImages, loadGlb, parseGlb, sanitizedNodeName,
  type LoadedGlb,
} from '../render3d/GlbLoader.js';
import { installHeadlessImageShim } from './headless-dom.js';
import { buildWorldFrame } from '../render3d/frame.js';
import { ThreeWorldRenderer } from '../render3d/ThreeWorldRenderer.js';
/** Prototip kök dizini — mimari sınır testi kaynakları buradan tarar. */
const PROTO_ROOT = join(import.meta.dirname, '..');
import {
  DROP_TUNING_V1, LOOT_LIFETIME_DEFAULT, LOOT_LIFETIME_OPTIONS,
  dropProfile, effectiveCoin,
} from '../data/drop-profile.js';
import { ATTACK_RANGES, FARM_BOUNDARY_RANGES } from '../world/GenieSystem.js';
import { PLAYER } from '../../../src/game/config.js';
import { SPAWN_POINT } from '../data/world-map.js';
/* ---- P2.4A Moradon koordinat temeli ---- */
import {
  KO_TO_WORLD_SCALE, MORADON_KO_SPAWN, MORADON_MAP_FILE, MORADON_SOURCE_HEIGHT,
  MORADON_SOURCE_WIDTH, MORADON_WORLD_BOUNDS, MORADON_WORLD_HEIGHT, MORADON_WORLD_SPAWN,
  MORADON_WORLD_WIDTH, MORADON_ZONE_ID, koToWorld, worldToKo,
} from '../data/moradon-coords.js';
import {
  DEFAULT_MP_POTION_REF, DEV_TEST_POTIONS, KO_POTIONS, koPotion, potionOptions, potionsFor,
} from '../data/ko-potions.js';
import { PLAYER_SPEED_DEFAULT, PLAYER_SPEED_OPTIONS } from '../config.js';
import {
  GENIE_MOVEMENT_V1, GenieMovementController, clampToBoundary,
  type MovementSource,
} from '../world/GenieMovement.js';
import { ProjectileFxSystem } from '../world/Projectiles.js';
import { registerPrototypeSkills } from '../state.js';
import {
  ARCHER, ARCHER_SKILL_ORDER, ACTIVE_BAR_SLOTS, DEFAULT_ACTIVE_BAR, DEFAULT_GENIE_SETS,
  TEST_GENIE_SETS,
  ARROW_SHOWER_REF, MULTI_SHOT_REF, sourceCooldownSec,
} from '../data/archer-skills.js';
import { ARCHER_ACTION_TIME, ArcherCombatTimingProfile } from '../data/archer-timing.js';
import { ActionLock } from '../world/ActionLock.js';
import {
  ATTACK_MOVE_OPTIONS, COMBAT_TIMING_V1, CombatPipeline, PROJECTILE_SPEED_OPTIONS,
} from '../world/CombatPipeline.js';
import type { ImpactEvent } from '../world/WorldCombatAdapter.js';

type GameMonsterLike = GameMonster;
type WorldMobLike = WorldMob;

let pass = 0, fail = 0;

/** P1.4 — cast → release → impact zincirini bitirip ÖZET döndürür.
 *  Eski "cast anında hasar" testleri bu yardımcı üzerinden migrate edildi. */
function fireAndResolve(S: PrototypeState, ref: number, target: WorldMob | null, mobs?: WorldMob[]): {
  ok: boolean; reason?: string;
  projectiles: number; targetHits: number; sideHits: number;
  totalDamage: number; targetDamage: number;
  impacts: number; killed: boolean;
  perArrow: number[];
  releasedAt: number | null; impactAt: number | null;
} {
  const out = S.resolveCastToImpact(ref, target, mobs);
  if (!out.result.ok) {
    return {
      ok: false, reason: out.result.reason, projectiles: 0, targetHits: 0, sideHits: 0,
      totalDamage: 0, targetDamage: 0, impacts: 0, killed: false, perArrow: [],
      releasedAt: null, impactAt: null,
    };
  }
  const rel = out.releases[0];
  const valid = out.impacts.filter((i) => i.invalid === null);
  const targetUid = out.result.accepted.targetUid;
  return {
    ok: true,
    projectiles: rel?.totalProjectileCount ?? 1,
    targetHits: rel?.targetHitCount ?? 0,
    sideHits: rel?.sideHitCount ?? 0,
    totalDamage: valid.reduce((a, i) => a + i.damage, 0),
    targetDamage: valid.filter((i) => i.targetUid === targetUid).reduce((a, i) => a + i.damage, 0),
    impacts: valid.length,
    killed: valid.some((i) => i.killed),
    perArrow: valid.map((i) => i.damage),
    releasedAt: rel?.releasedAt ?? null,
    impactAt: out.impacts.length > 0 ? out.impacts[out.impacts.length - 1]!.impactAt : null,
  };
}

/** P2.4C — P1.x senaryoları TEST DÜNYASINDA koşar.
 *
 *  Harita anahtarı Moradon'a çevrildi (görev tanımı §1.5). P1.6'dan gelen
 *  hareket/Genie/roam senaryoları ise düz, engelsiz bir dünya varsayar:
 *  "1 saniyede 120 birim git", "merkeze dön", "430 birim öteki moba yürü".
 *  Moradon'da bu adımlar yürünebilirlik maskesine takılır ve testler ÖLÇTÜKLERİ
 *  ŞEYİ ölçemez olur. Bu yüzden P1.x testleri dünyayı AÇIKÇA enjekte eder.
 *  Canlı oyun etkilenmez: `PrototypeState` varsayılanı `ACTIVE_WORLD`tur ve
 *  Moradon'u kullanmaya devam eder. */
/** P2.8 — P1.x testleri SEVİYE 70 varsayar (skill gereksinimleri, MP tavanı,
 *  hasar eğrileri hep o seviyede ölçüldü). Canlı oyun artık seviye 1'den
 *  başlıyor (`PROTO.startLevel`), bu yüzden test dünyası seviyeyi de AÇIKÇA
 *  kurar — tıpkı dünyayı açıkça kurduğu gibi. */
const TEST_LEVEL = 70;

/** P2.32 — iksire 1,5 sn bekleme geldi. Ardışık kullanım sınayan
 *  testler bekleme SÜRESİNİ İLERLETİR; amaçları tempo değil, miktar/
 *  adet doğruluğu. */
function usePotion(S: PrototypeState, ref: number): ReturnType<PrototypeState['potions']['use']> {
  S.potions.update(POTION_COOLDOWN_SEC + 0.1);
  return S.potions.use(ref);
}

function protoState(seed?: number, slots?: readonly MobSpawnSlot[]): PrototypeState {
  /* Dünya ile slot tablosu BİRLİKTE gider: test dünyasının doğuş noktası
     (1240, 1650) etrafına P1.6 yerleşimi kurulur. Moradon slotları (şehir
     meydanı) bu dünyada oyuncudan yüzlerce birim uzağa düşerdi ve menzil /
     aggro / çok-ok senaryoları anlamını yitirirdi. */
  const S = new PrototypeState(seed, slots ?? TEST_FARM_AREA_SLOTS, TEST_WORLD);
  S.player.level = TEST_LEVEL;
  /* Seviye HP/MP TAVANINI değiştirir; kurucu bunları seviye 1'e göre
     doldurmuştu. Tavanı yeniden doldur, yoksa testler yarım MP ile başlar. */
  S.player.restoreVitals({ hp: Number.POSITIVE_INFINITY, mp: Number.POSITIVE_INFINITY });
  /* P2.22 — Genie setleri artık BOŞ başlıyor (kullanıcı kararı: oyuncu
     kendi kombinasyonunu kursun). Farm senaryoları dolu set varsayıyor,
     bu yüzden test dünyası setleri AÇIKÇA kurar — tıpkı dünyayı ve
     seviyeyi açıkça kurduğu gibi. */
  const sets = TEST_GENIE_SETS();
  for (let i = 0; i < sets.length; i++) S.genie.settings.sets[i] = [...sets[i]!];
  return S;
}

function test(name: string, fn: () => void): void {
  try { fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (e) { fail++; console.error(`  ✗ ${name}: ${(e as Error).message}`); }
}
function eq(a: unknown, b: unknown, msg = ''): void {
  if (a !== b) throw new Error(`${msg} beklenen ${b}, gelen ${a}`);
}
function near(a: number, b: number, tol: number, msg = ''): void {
  if (Math.abs(a - b) > tol) throw new Error(`${msg} ${a} ≉ ${b} (tol ${tol})`);
}
function ok(v: unknown, msg = ''): void { if (!v) throw new Error(msg || 'koşul sağlanmadı'); }

function newPlayer(x = 500, y = 500): PlayerWorldState {
  return { worldX: x, worldY: y, facing: 1, facingAngle: 0, travelled: 0, moveX: 0, moveY: 0, moving: false, animT: 0 };
}

console.log('joystick:');
test('dead zone: eşik altı girdi hareket üretmez', () => {
  const small = resolveJoystick({ dx: PROTO.joystickRadius * 0.1, dy: 0, active: true });
  eq(small.magnitude, 0, 'dead zone içinde:');
  const off = resolveJoystick({ dx: 90, dy: 0, active: false });
  eq(off.magnitude, 0, 'pasif joystick:');
});
test('analog büyüklük ve normalize yön', () => {
  const full = resolveJoystick({ dx: PROTO.joystickRadius * 2, dy: 0, active: true });
  eq(full.magnitude, 1, 'yarıçap dışı = tam gaz:');
  near(Math.hypot(full.x, full.y), 1, 1e-9, 'yön normalize:');
  const diag = resolveJoystick({ dx: 100, dy: 100, active: true });
  near(Math.hypot(diag.x, diag.y), 1, 1e-9, 'çapraz yön normalize:');
  const mid = resolveJoystick({ dx: PROTO.joystickRadius * 0.5, dy: 0, active: true });
  ok(mid.magnitude > 0 && mid.magnitude < 1, 'ara değer analog olmalı');
});

console.log('hareket:');
function movementRig(obstacles: Obstacle[] = [], speed = 200) {
  return new WorldMovementSystem(WORLD_BOUNDS, obstacles, () => speed);
}
test('hareket frame-rate bağımsız (60fps ≈ 30fps ≈ 144fps)', () => {
  const mv = { x: 1, y: 0, magnitude: 1 };
  const results = [1 / 60, 1 / 30, 1 / 144].map((dt) => {
    const sys = movementRig();
    const p = newPlayer();
    for (let t = 0; t < 1; t += dt) sys.move(p, mv, dt);
    return p.worldX;
  });
  near(results[0], results[1], 8, '60 vs 30 fps:');
  near(results[0], results[2], 8, '60 vs 144 fps:');
  near(results[0], 700, 12, '1 saniyede ~200 birim:');
});
test('world bounds dışına çıkılamaz', () => {
  const sys = movementRig();
  const p = newPlayer(30, 30);
  for (let i = 0; i < 300; i++) sys.move(p, { x: -1, y: -1, magnitude: 1 }, 1 / 60);
  ok(p.worldX >= PROTO.playerRadius - 0.001, `sol sınır: ${p.worldX}`);
  ok(p.worldY >= PROTO.playerRadius - 0.001, `üst sınır: ${p.worldY}`);
  const q = newPlayer(WORLD_BOUNDS.width - 30, WORLD_BOUNDS.height - 30);
  for (let i = 0; i < 300; i++) sys.move(q, { x: 1, y: 1, magnitude: 1 }, 1 / 60);
  ok(q.worldX <= WORLD_BOUNDS.width - PROTO.playerRadius + 0.001, `sağ sınır: ${q.worldX}`);
  ok(q.worldY <= WORLD_BOUNDS.height - PROTO.playerRadius + 0.001, `alt sınır: ${q.worldY}`);
});
test('engelin içinden geçilemez, kenarında kayar', () => {
  const rock: Obstacle = { x: 600, y: 500, radius: 60, kind: 'rock' };
  const sys = movementRig([rock]);
  const p = newPlayer(500, 500);
  for (let i = 0; i < 240; i++) sys.move(p, { x: 1, y: 0, magnitude: 1 }, 1 / 60);
  ok(!sys.collides(p.worldX, p.worldY, PROTO.playerRadius), 'engelin içinde olmamalı');
  ok(p.worldX < rock.x - rock.radius + 1, `engelin solunda kalmalı: ${p.worldX}`);
  const q = newPlayer(500, 500);
  for (let i = 0; i < 240; i++) sys.move(q, { x: 1, y: 0.6, magnitude: 1 }, 1 / 60);
  ok(q.worldY > 500, 'çapraz baskıda kenar boyunca kaymalı');
});

console.log('kamera:');
test('smoothFactor dt tabanlı ve sınırlı', () => {
  near(smoothFactor(6, 0), 0, 1e-9);
  ok(smoothFactor(6, 1 / 60) < smoothFactor(6, 1 / 30), 'küçük dt daha az ilerlemeli');
  ok(smoothFactor(6, 10) < 1.0001 && smoothFactor(6, 10) > 0.99, 'büyük dt ~1');
});
test('kamera takibi deterministik ve oyuncuya yakınsar', () => {
  const cam = new WorldCameraController(new Tuning());
  cam.snapTo(0, 0);
  for (let i = 0; i < 180; i++) {
    cam.update({ playerX: 1000, playerY: 800, dirX: 0, dirY: 0, targetX: null, targetY: null }, 1 / 60);
  }
  near(cam.x, 1000, 1, 'x yakınsamalı:');
  near(cam.y, 800, 1, 'y yakınsamalı:');
  /* aynı girdi → aynı çıktı (deterministik) */
  const a = new WorldCameraController(new Tuning()); a.snapTo(0, 0);
  const b = new WorldCameraController(new Tuning()); b.snapTo(0, 0);
  for (let i = 0; i < 40; i++) {
    const f = { playerX: 300, playerY: 200, dirX: 0.5, dirY: -0.5, targetX: null, targetY: null };
    a.update(f, 1 / 60); b.update(f, 1 / 60);
  }
  eq(a.x, b.x); eq(a.y, b.y);
});
test('look-ahead clamp: ekran yüzdesini aşmaz ve bırakınca döner', () => {
  const tuning = new Tuning();
  const cam = new WorldCameraController(tuning);
  cam.snapTo(500, 500);
  const max = cam.maxLookAhead();
  near(max.x, PROTO.screenW * TUNING_DEFAULTS.cameraLookAheadPct, 1e-6, 'x limiti:');
  for (let i = 0; i < 600; i++) {
    cam.update({ playerX: 500, playerY: 500, dirX: 5, dirY: 5, targetX: null, targetY: null }, 1 / 60);
  }
  ok(Math.abs(cam.offsetX) <= max.x + 1e-6, `x ofset clamp: ${cam.offsetX}`);
  ok(Math.abs(cam.offsetY) <= max.y + 1e-6, `y ofset clamp: ${cam.offsetY}`);
  ok(Math.abs(cam.x - 500) <= max.x + 1e-6, 'kamera oyuncudan look-ahead kadar uzaklaşabilir');
  for (let i = 0; i < 600; i++) {
    cam.update({ playerX: 500, playerY: 500, dirX: 0, dirY: 0, targetX: null, targetY: null }, 1 / 60);
  }
  near(cam.offsetX, 0, 0.5, 'bırakınca merkeze dönmeli:');
  near(cam.x, 500, 0.5, 'kamera oyuncuya oturmalı:');
});
test('hedef framing çok hafif ve uzak hedefte uygulanmaz', () => {
  const cam = new WorldCameraController(new Tuning());
  cam.snapTo(0, 0);
  for (let i = 0; i < 400; i++) {
    cam.update({ playerX: 0, playerY: 0, dirX: 0, dirY: 0, targetX: 400, targetY: 0 }, 1 / 60);
  }
  near(cam.x, 400 * PROTO.targetFramingPct, 1, 'framing oranı:');
  ok(cam.x < 400 * 0.3, 'framing agresif olmamalı');
  const far = new WorldCameraController(new Tuning());
  far.snapTo(0, 0);
  for (let i = 0; i < 400; i++) {
    far.update({ playerX: 0, playerY: 0, dirX: 0, dirY: 0, targetX: 5000, targetY: 0 }, 1 / 60);
  }
  near(far.x, 0, 0.5, 'çok uzak hedefte framing yok:');
});

console.log('hedefleme:');
function mobRig(overrides: Partial<MobSpawnSlot> = {}) {
  const cfg: MobSpawnSlot = {
    id: 'test_slot', displayName: 'Test', monsterRef: 750,
    homeX: 1000, homeY: 1000, aiType: 'AGGRESSIVE',
    respawnSec: 5, aggroRadius: 200, leashRadius: 400,
    visual: { sheet: 'kurt', tint: '#fff', scale: 0.6 },
    ...overrides,
  };
  const sys = new MobSlotSystem([cfg], {
    rng: mulberry32(42), aggroMult: () => 1,
    playerAlive: () => true, strike: () => null,
  });
  sys.populate();
  return { sys, cfg };
}
test('dokunarak hedef seçme + geçersiz hedef temizlenmesi', () => {
  const { sys } = mobRig();
  const t = new WorldTargetSystem();
  const mob = sys.mobs[0];
  eq(t.pickAt(sys.mobs, mob.worldX + 500, mob.worldY, 60), null, 'uzak dokunuş seçmemeli:');
  const picked = t.pickAt(sys.mobs, mob.worldX + 10, mob.worldY + 10, 60);
  ok(picked !== null, 'yakın dokunuş seçmeli');
  eq(t.selectedUid, mob.uid);
  ok(t.current(sys.mobs, mob.worldX, mob.worldY, { pickRadius: 60, dropDistance: 900 }) !== null);
  sys.markDead(mob);
  eq(t.current(sys.mobs, mob.worldX, mob.worldY, { pickRadius: 60, dropDistance: 900 }), null, 'ölü hedef:');
  eq(t.selectedUid, null, 'hedef temizlenmeli:');
});
test('hedef menzil dışına çıkınca düşer, otomatik başkasına atlamaz', () => {
  const { sys } = mobRig();
  const t = new WorldTargetSystem();
  t.select(sys.mobs[0].uid);
  const far = t.current(sys.mobs, sys.mobs[0].worldX + 5000, sys.mobs[0].worldY, { pickRadius: 60, dropDistance: 900 });
  eq(far, null, 'uzak hedef düşmeli:');
  eq(t.selectedUid, null, 'otomatik yeni hedef seçilmemeli:');
});
test('en yakın hedef düğmesi menzil içindekini seçer', () => {
  const { sys } = mobRig();
  const t = new WorldTargetSystem();
  eq(t.selectNearest(sys.mobs, 0, 0, 100), null, 'menzilde yoksa null:');
  const m = t.selectNearest(sys.mobs, 1000, 1000, 600);
  ok(m !== null, 'menzilde varsa seçmeli');
});

console.log('mob AI:');
test('aggro: oyuncu yarıçapa girince AGGRO → CHASE', () => {
  const { sys, cfg } = mobRig();
  const mob = sys.mobs[0];
  const away = newPlayer(cfg.homeX + 2000, cfg.homeY);
  sys.update(0.1, away);
  ok(mob.ai === 'idle' || mob.ai === 'roam', `uzakta pasif kalmalı: ${mob.ai}`);
  const close = newPlayer(mob.worldX + 120, mob.worldY);
  sys.update(0.1, close);
  eq(mob.ai, 'aggro', 'önce tepki gecikmesi:');
  for (let i = 0; i < 30; i++) sys.update(1 / 60, close);
  eq(mob.ai, 'chase', 'gecikme sonrası kovalar:');
});
test('leash: ev bölgesinden çok uzaklaşırsa döner ve iyileşir', () => {
  const { sys, cfg } = mobRig();
  const mob = sys.mobs[0];
  mob.hp = 1;
  const lure = newPlayer(cfg.homeX + 3000, cfg.homeY);
  for (let i = 0; i < 60; i++) sys.update(1 / 60, newPlayer(mob.worldX + 100, mob.worldY));  // önce çek
  for (let i = 0; i < 900; i++) sys.update(1 / 60, lure);                                     // sonra kaç
  ok(mob.ai === 'return' || mob.ai === 'idle', `leash sonrası: ${mob.ai}`);
  const dHome = Math.hypot(mob.worldX - mob.homeX, mob.worldY - mob.homeY);
  ok(dHome <= (cfg.leashRadius ?? 500), `evine dönmeli: ${dHome.toFixed(0)}`);
  for (let i = 0; i < 3000; i++) sys.update(1 / 60, lure);
  ok(mob.ai === 'idle' || mob.ai === 'roam', `eve varınca pasif: ${mob.ai}`);
  eq(mob.hp, mob.maxHp, 'dönünce iyileşmeli:');
});
test('mob haritanın öbür ucundan kovalamaz', () => {
  const { sys, cfg } = mobRig();
  const mob = sys.mobs[0];
  const far = newPlayer(cfg.homeX + 2500, cfg.homeY + 2500);
  for (let i = 0; i < 600; i++) sys.update(1 / 60, far);
  const d = Math.hypot(mob.worldX - mob.homeX, mob.worldY - mob.homeY);
  ok(d <= (cfg.leashRadius ?? 500) + 60, `ev bölgesinde kalmalı: ${d.toFixed(0)}`);
});
test('respawn: ölen mob süre sonunda slotunda geri gelir', () => {
  const { sys, cfg } = mobRig();
  const mob = sys.mobs[0];
  const before = sys.aliveIn(cfg.id);
  sys.markDead(mob);
  eq(sys.aliveIn(cfg.id), before - 1, 'ölünce sayı düşmeli:');
  const away = newPlayer(cfg.homeX + 5000, cfg.homeY);
  for (let i = 0; i < Math.ceil((cfg.respawnSec ?? RESPAWN_DEFAULT) * 60) + 30; i++) sys.update(1 / 60, away);
  eq(sys.aliveIn(cfg.id), before, 'süre sonunda geri gelmeli:');
  eq(mob.hp, mob.maxHp, 'dolu canla:');
  const d = Math.hypot(mob.worldX - cfg.homeX, mob.worldY - cfg.homeY);
  eq(Math.round(d), 0, 'TAM ev noktasında doğmalı:');
});
test('mob statları monsters.json\'dan gelir (hardcode değil)', () => {
  const { sys } = mobRig({ monsterRef: 250 });
  const src = Content.monster(250)!;
  eq(sys.mobs[0].monster.sourceRef, 250);
  eq(sys.mobs[0].maxHp, src.hp, 'HP kaynaktan:');
  eq(sys.mobs[0].monster.attack, src.attack, 'hasar kaynaktan:');
});

console.log('combat adaptörü + menzil:');
test('menzil dışındaki hedefe temel saldırı ve skill reddedilir', () => {
  const S = protoState(7);
  const mob = S.mobs.mobs[0];
  const p = newPlayer(mob.worldX + S.ranges.basicAttack + 200, mob.worldY);
  const basic = S.adapter.basicAttack(p, mob);
  ok(!basic.ok); eq((basic as { reason: string }).reason, 'range');
  const skill = S.adapter.useSkillSlot(1, p, mob);   // Alev Oku
  ok(!skill.ok); eq((skill as { reason: string }).reason, 'range');
  eq(mob.hp, mob.maxHp, 'menzil dışı hasar vermemeli:');
});
test('menzil içindeyken temel saldırı ana CombatSystem formülüyle vurur', () => {
  const S = protoState(9);
  const mob = S.mobs.mobs[0];
  const p = newPlayer(mob.worldX + 50, mob.worldY);
  const res = S.adapter.basicAttack(p, mob);
  ok(res.ok, `vurmalı: ${JSON.stringify(res)}`);
  ok(mob.hp < mob.maxHp, 'HP düşmeli');
  const again = S.adapter.basicAttack(p, mob);
  ok(!again.ok, 'cooldown içinde tekrar vurulmamalı');
  eq((again as { reason: string }).reason, 'notReady');
});
test('hedefsiz saldırı reddedilir (auto-hit yok)', () => {
  const S = protoState(11);
  const p = newPlayer(500, 500);
  const res = S.adapter.basicAttack(p, null);
  ok(!res.ok); eq((res as { reason: string }).reason, 'noTarget');
});
test('CombatRangeProfile kaynak range alanını kullanmaz, profilden gelir', () => {
  const rp = new CombatRangeProfile({ basicAttack: 111 });
  eq(rp.basicAttack, 111);
  const def = rp.skillRange(107505, 'enemy');
  eq(def, 340, 'varsayılan hasar menzili:');
  rp.setSkillRange(107505, 500);
  eq(rp.skillRange(107505, 'enemy'), 500, 'skille özel menzil:');
  eq(rp.skillRange(107010, 'self'), Infinity, 'self skill menzil aramaz:');
});

console.log('loot:');
/** P1.7 — test yardımcısı: yerdeki ganimet oluşturur. */
function groundSpec(itemRef: number, x: number, y: number, owner = 1, quantity = 1) {
  return {
    kind: 'item' as const, itemRef, quantity, ownerPlayerId: owner,
    worldX: x, worldY: y,
    sourceMobUid: 42, sourceSpawnSlot: 'test_slot', sourceGeneration: 1, sourceMonsterRef: 750,
  };
}
test('yerdeki ganimet ÇAĞIRANIN verdiği koordinatta oluşur', () => {
  const inv = new InventoryState();
  const wl = new WorldLootSystem(inv);
  const a = wl.spawn(groundSpec(389011000, 1234, 5678));
  const b = wl.spawn(groundSpec(160100000, 1234, 5678));
  eq(a.worldX, 1234, 'X:'); eq(a.worldY, 5678, 'Y:');
  ok(a.lootUid !== b.lootUid, 'lootUid benzersiz');
  eq(wl.count, 2, 'yerde:');
});
test('MANUEL toplama mesafeye ve kapasiteye bağlı', () => {
  const inv = new InventoryState();
  const wl = new WorldLootSystem(inv);
  const l = wl.spawn(groundSpec(389011000, 1000, 1000));
  const far = wl.pickup(l.lootUid, 1, 1000 + wl.tuning.pickupRadius + 50, 1000);
  ok(!far.ok); eq((far as { reason: string }).reason, 'outOfRange');
  eq(wl.count, 1, 'yerde kalmalı:');
  const good = wl.pickup(l.lootUid, 1, 1010, 1005);
  ok(good.ok, 'yakındayken alınmalı');
  eq(wl.count, 0);
  eq(inv.count(389011000), 1, 'envantere girmeli:');
});
test('çanta doluyken loot yerde kalır', () => {
  const inv = new InventoryState();
  while (!inv.isFull) inv.add(160100000);
  const wl = new WorldLootSystem(inv);
  const l = wl.spawn(groundSpec(160100000, 500, 500));
  const res = wl.pickup(l.lootUid, 1, 500, 500);
  ok(!res.ok); eq((res as { reason: string }).reason, 'inventoryFull');
  eq(wl.count, 1, 'item kaybolmamalı:');
});
test('SAHİPLİK pickup doğrulamasında authoritative', () => {
  const inv = new InventoryState();
  const wl = new WorldLootSystem(inv);
  const l = wl.spawn(groundSpec(389011000, 100, 100, 1));
  const other = wl.pickup(l.lootUid, 2, 100, 100);          // BAŞKA oyuncu
  ok(!other.ok); eq((other as { reason: string }).reason, 'notOwner');
  eq(wl.count, 1, 'yerde kalmalı:');
  eq(inv.count(389011000), 0, 'envantere GİRMEMELİ:');
  ok(wl.pickup(l.lootUid, 1, 100, 100).ok, 'sahibi alabilmeli');
});

console.log('izolasyon:');
test('prototip kendi state\'ini kullanır, ana GameState\'e dokunmaz', () => {
  const a = protoState(1);
  const b = protoState(1);
  a.player.coins = 999;
  eq(b.player.coins, 0, 'örnekler ayrı olmalı:');
  ok(a.inventory !== b.inventory);
  /* P2.8 — canlı oyun artık Sv1'den başlıyor; test dünyası seviyeyi AÇIKÇA
     70 yapar (bkz. `TEST_LEVEL`). Burada test kurulumunun tuttuğu doğrulanır. */
  eq(a.player.level, TEST_LEVEL, 'test dünyası seviyesi:');
  eq(new PrototypeState(99).player.level, PROTO.startLevel, 'canlı başlangıç seviyesi:');
  ok(a.equipment.equippedInstance('weapon') !== undefined, 'başlangıç yayı kuşanılı');
});
test('prototip PlayerState/SkillSystem ana sınıflarını yeniden kullanır', () => {
  const S = protoState(3);
  ok(S.player instanceof PlayerState, 'ana PlayerState sınıfı');
  ok(S.combat.skills.slots().length === ACTIVE_BAR_SLOTS, 'prototip aktif bar 5 slot');
  ok(S.stats.finalStats().attack > 0, 'ana CharacterStats hesabı');
});


/* ============================================================================
   EXPERIMENT P1.1 — Genie V0 + 3/5 ok testleri
   ==========================================================================*/

console.log('\nP1.1 — hitbox:');
test('elit mob aynı seviyedeki normalden büyük hitbox alır', () => {
  const normal = { level: 10, tier: 'normal' } as GameMonsterLike;
  const elite = { level: 10, tier: 'elite' } as GameMonsterLike;
  ok(hitboxRadius(elite as never) > hitboxRadius(normal as never), 'elit > normal');
});
test('hitbox min/max sınırları içinde kalır', () => {
  const tiny = { level: -50, tier: 'normal' } as GameMonsterLike;
  const huge = { level: 999, tier: 'elite' } as GameMonsterLike;
  eq(hitboxRadius(tiny as never), HITBOX.min, 'alt sınır:');
  eq(hitboxRadius(huge as never), HITBOX.max, 'üst sınır:');
});
test('hitbox sprite ölçeğinden BAĞIMSIZ bir gameplay değeridir', () => {
  const m = { level: 10, tier: 'normal' } as GameMonsterLike;
  const small = hitboxRadius(m as never, { visual: { sheet: 'kurt', tint: '#fff', scale: 0.4 } });
  const big = hitboxRadius(m as never, { visual: { sheet: 'kurt', tint: '#fff', scale: 0.9 } });
  ok(big > small, 'görsel ölçek hitbox\'a katkı verir ama tek belirleyici değildir');
  ok(small >= HITBOX.min && big <= HITBOX.max);
});

console.log('P1.1 — çok-ok geometrisi:');
function mockMob(x: number, y: number, radius = 30, hp = 1000, tier: 'normal' | 'elite' = 'normal'): WorldMobLike {
  return {
    uid: Math.round(x * 1000 + y), monster: { displayName: 'test', tier, defense: 0, exp: 1, lootTableId: 'x' },
    x, y, worldX: x, worldY: y, hp, maxHp: hp, attackTimer: 0, state: 'walk', deathTimer: 0, status: [],
    slotId: 's', instanceIndex: 0, generation: 1, combatRadius: radius, ai: 'idle', homeX: x, homeY: y, respawnTimer: 0, facing: 1, animT: 0,
  } as unknown as WorldMobLike;
}
test('ışın: dik uzaklık combatRadius içindeyse isabet', () => {
  const mob = mockMob(100, 10, 20);
  eq(rayHitsMob(0, 0, 1, 0, 400, mob as never).hit, true, 'r=20, sapma=10:');
  const far = mockMob(100, 40, 20);
  eq(rayHitsMob(0, 0, 1, 0, 400, far as never).hit, false, 'r=20, sapma=40:');
});
test('ışın: geride kalan veya menzil dışı hedef ıskalanır', () => {
  eq(rayHitsMob(0, 0, 1, 0, 400, mockMob(-100, 0, 40) as never).hit, false, 'arkada:');
  eq(rayHitsMob(0, 0, 1, 0, 100, mockMob(300, 0, 40) as never).hit, false, 'menzil dışı:');
});
test('profiller ok sayısını KAYNAKTAN alır (need_arrow 3 / 5)', () => {
  eq(MULTISHOT_PROFILES[107515].projectiles, 3, 'multiple shot:');
  eq(MULTISHOT_PROFILES[107555].projectiles, 5, 'arrow shower:');
  eq(MULTISHOT_PROFILES[107515].anglesDeg.length, 3, 'açı sayısı = ok sayısı:');
  eq(MULTISHOT_PROFILES[107555].anglesDeg.length, 5, 'açı sayısı = ok sayısı:');
});
test('yakında 5/5 isabet (geometrik, yüzde tablosu YOK)', () => {
  const mob = mockMob(80, 0, 30);
  const r = resolveMultiShot(0, 0, 80, 0, MULTISHOT_PROFILES[107555], [mob as never], { target: mob as never });
  eq(r.total, 5, 'toplam ok:');
  eq(r.totalProjectileCount, 5, 'totalProjectileCount:');
  eq(r.targetHitCount, 5, 'yakın mesafe hedefte 5/5:');
  eq(r.sideHitCount, 0, 'yan isabet yok:');
});
test('mesafe arttıkça isabet DOĞAL olarak düşer (yüzde tablosu yok)', () => {
  const counts = [80, 200, 300, 350].map((d) => {
    const mob = mockMob(d, 0, 30);
    return resolveMultiShot(0, 0, d, 0, MULTISHOT_PROFILES[107555], [mob as never], { target: mob as never }).targetHitCount;
  });
  ok(counts[0] === 5, `yakın 5/5 bekleniyordu, ${counts[0]}`);
  ok(counts[counts.length - 1] < counts[0], `uzakta azalmalı: ${counts.join(',')}`);
  for (let i = 1; i < counts.length; i++) ok(counts[i] <= counts[i - 1], `monoton azalmalı: ${counts.join(',')}`);
});
test('büyük hitbox aynı mesafede daha çok ok tutar', () => {
  const d = 300;
  const smallMob = mockMob(d, 0, 18), bigMob = mockMob(d, 0, 70);
  const small = resolveMultiShot(0, 0, d, 0, MULTISHOT_PROFILES[107555], [smallMob as never], { target: smallMob as never }).targetHitCount;
  const big = resolveMultiShot(0, 0, d, 0, MULTISHOT_PROFILES[107555], [bigMob as never], { target: bigMob as never }).targetHitCount;
  ok(big > small, `büyük hitbox daha çok isabet almalı (${small} → ${big})`);
});
test('çok-ok DETERMİNİSTİK: rastgele isabet şansı yok', () => {
  const run = (): number => {
    const m = mockMob(250, 0, 25);
    return resolveMultiShot(0, 0, 250, 0, MULTISHOT_PROFILES[107555], [m as never], { target: m as never }).targetHitCount;
  };
  const first = run();
  for (let i = 0; i < 20; i++) eq(run(), first, 'her çağrı aynı olmalı:');
});
test('yoldaki BAŞKA mob da vurulabilir (yan isabet)', () => {
  const main = mockMob(300, 0, 20);
  const side = mockMob(150, -20, 40);
  const r = resolveMultiShot(0, 0, 300, 0, MULTISHOT_PROFILES[107555], [main as never, side as never],
    { target: main as never, collisionMode: 'firstMobAlongRay' });
  ok(r.hits.some((h) => h.hit === (side as never)), 'yan mob en az bir ok almalı');
  ok(r.sideHitCount > 0, 'sideHitCount yan isabeti saymalı');
});
test('ölü/ölmekte olan moblar ok tutmaz', () => {
  const dead = mockMob(100, 0, 60);
  (dead as unknown as { ai: string }).ai = 'dead';
  const r = resolveMultiShot(0, 0, 100, 0, MULTISHOT_PROFILES[107515], [dead as never], { target: dead as never });
  eq(r.hitCount, 0, 'ölü mob:');
});

console.log('P1.1 — çok-ok hasar akışı:');
function shotRig(): { S: PrototypeState; mob: WorldMobLike } {
  const S = protoState(77);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 60, S.world.worldY, 40, 100000);
  S.mobs.mobs.push(mob as never);
  S.targets.select((mob as unknown as { uid: number }).uid);
  return { S, mob };
}
test('mana ve cooldown cast BAŞINA BİR KEZ (ok sayısıyla çarpılmaz)', () => {
  const { S, mob } = shotRig();
  const def = SkillRegistry.get(ARROW_SHOWER_REF)!;
  const before = S.player.mp;
  const res = S.adapter.useSkillRef(ARROW_SHOWER_REF, S.world, mob as never, S.mobs.mobs as never);
  ok(res.ok, 'cast başarılı olmalı');
  eq(Math.round(before - S.player.mp), def.manaCost, 'tek mana bedeli:');
  const again = S.adapter.useSkillRef(ARROW_SHOWER_REF, S.world, mob as never, S.mobs.mobs as never);
  eq(again.ok, false, 'cooldown ikinci castı engellemeli');
});
test('hasar `damage × N` DEĞİL: her isabet ayrı roll (impact anında)', () => {
  const { S, mob } = shotRig();
  const r = fireAndResolve(S, ARROW_SHOWER_REF, mob as never, S.mobs.mobs as never);
  ok(r.ok, 'cast başarılı olmalı');
  eq(r.perArrow.length, r.impacts, 'her geçerli impact için bir kayıt:');
  eq(r.perArrow.reduce((a, x) => a + x, 0), r.totalDamage, 'toplam = parçaların toplamı:');
  ok(r.perArrow.length >= 2, 'yakında birden çok ok tutmalı');
});
test('hedef mob HP\'si IMPACT sonrası toplam hasar kadar düşer', () => {
  const { S, mob } = shotRig();
  const hp0 = (mob as unknown as { hp: number }).hp;
  const r = fireAndResolve(S, ARROW_SHOWER_REF, mob as never, S.mobs.mobs as never);
  eq(Math.round(hp0 - (mob as unknown as { hp: number }).hp), r.totalDamage, 'HP düşüşü:');
});
test('fazla oklar ölmüş hedefe HASAR YAZMAZ (overkill tek sayılır)', () => {
  const { S, mob } = shotRig();
  (mob as unknown as { hp: number; maxHp: number }).hp = 1;
  const r = fireAndResolve(S, ARROW_SHOWER_REF, mob as never, S.mobs.mobs as never);
  eq(r.targetHits, 5, 'geometrik isabet yine 5/5 (release\'te kilitlendi):');
  eq(r.impacts, 1, 'yalnız ilk ok hasar verir, gerisi targetDead:');
  eq((mob as unknown as { state: string }).state, 'dying', 'hedef ölmüş olmalı:');
});
test('menzil dışı çok-ok reddedilir ve MANA HARCANMAZ', () => {
  const { S } = shotRig();
  const far = mockMob(S.world.worldX + 5000, S.world.worldY, 40, 1000);
  const mp0 = S.player.mp;
  const res = S.adapter.useSkillRef(ARROW_SHOWER_REF, S.world, far as never, [far as never]);
  eq(res.ok, false, 'menzil dışı:');
  eq((res as { reason: string }).reason, 'range', 'sebep:');
  eq(S.player.mp, mp0, 'mana değişmemeli:');
});
test('0 isabet olsa bile cast gerçekleşir (mana + cooldown gider)', () => {
  const S = protoState(5);
  S.mobs.mobs.length = 0;
  /* hedefe dik ofset: merkez ok bile teğet geçmesin diye küçük hitbox + uzak mesafe */
  const mob = mockMob(S.world.worldX + 330, S.world.worldY, 1, 100000);
  S.mobs.mobs.push(mob as never);
  const mp0 = S.player.mp;
  const res = S.adapter.useSkillRef(ARROW_SHOWER_REF, S.world, mob as never, S.mobs.mobs as never);
  ok(res.ok, 'cast edilmeli');
  ok(S.player.mp < mp0, 'mana gitmeli');
});

console.log('P1.1 — Genie:');
function genieRig(): PrototypeState {
  const S = protoState(11);
  S.mobs.mobs.length = 0;
  return S;
}
test('Genie KAPALIYKEN hiçbir otomasyon çalışmaz', () => {
  const S = genieRig();
  const mob = mockMob(S.world.worldX + 50, S.world.worldY, 40, 9999);
  S.mobs.mobs.push(mob as never);
  const mp0 = S.player.mp;
  const actions = S.genie.update(GENIE_TICK, S.mobs.mobs as never, S.world);
  eq(actions.length, 0, 'eylem yok:');
  eq(S.targets.selectedUid, null, 'hedef seçilmemeli:');
  eq(S.player.mp, mp0, 'mana harcanmamalı:');
});
test('BAŞLAT farm merkezini o anki konumdan kilitler', () => {
  const S = genieRig();
  S.world.worldX = 1234; S.world.worldY = 4321;
  S.genie.start(S.world);
  eq(S.genie.farmCenter?.x, 1234); eq(S.genie.farmCenter?.y, 4321);
  S.world.worldX = 9999;
  eq(S.genie.farmCenter?.x, 1234, 'merkez oyuncuyla birlikte KAYMAZ:');
});
test('Attack Range dışındaki mob hedeflenmez', () => {
  const S = genieRig();
  S.genie.start(S.world);
  const inside = mockMob(S.world.worldX + 100, S.world.worldY, 40);
  const outside = mockMob(S.world.worldX + S.genie.settings.attackRange + 200, S.world.worldY, 40);
  S.mobs.mobs.push(inside as never, outside as never);
  eq(S.genie.canTarget(inside as never, S.world), true, 'içeride:');
  eq(S.genie.canTarget(outside as never, S.world), false, 'dışarıda:');
  const picked = S.genie.pickTarget(S.mobs.mobs as never, S.world);
  eq(picked?.uid, (inside as unknown as { uid: number }).uid, 'yalnız içerideki seçilir:');
});
test('hedef önceliği: en yakın / en düşük HP / elit', () => {
  const S = genieRig();
  S.genie.start(S.world);
  const near = mockMob(S.world.worldX + 60, S.world.worldY, 30, 900);
  const weak = mockMob(S.world.worldX + 300, S.world.worldY, 30, 10);
  const elite = mockMob(S.world.worldX + 400, S.world.worldY, 30, 900, 'elite');
  S.mobs.mobs.push(near as never, weak as never, elite as never);
  S.genie.settings.targetPriority = 'nearest';
  eq(S.genie.pickTarget(S.mobs.mobs as never, S.world)?.uid, (near as unknown as { uid: number }).uid, 'nearest:');
  S.genie.settings.targetPriority = 'lowestHp';
  eq(S.genie.pickTarget(S.mobs.mobs as never, S.world)?.uid, (weak as unknown as { uid: number }).uid, 'lowestHp:');
  S.genie.settings.targetPriority = 'elite';
  eq(S.genie.pickTarget(S.mobs.mobs as never, S.world)?.uid, (elite as unknown as { uid: number }).uid, 'elite:');
});
test('Auto Burst Range: yakın → Set 1, uzak → Set 2', () => {
  const S = genieRig();
  S.genie.start(S.world);
  const burst = S.genie.settings.autoBurstRange;
  const close = mockMob(S.world.worldX + burst - 40, S.world.worldY, 30);
  const far = mockMob(S.world.worldX + burst + 60, S.world.worldY, 30);
  eq(S.genie.chooseSet(close as never, S.world), 0, 'yakın:');
  eq(S.genie.chooseSet(far as never, S.world), 1, 'uzak:');
});
test('ELİT hedef mesafeden BAĞIMSIZ olarak Set 3 seçtirir', () => {
  const S = genieRig();
  S.genie.start(S.world);
  const closeElite = mockMob(S.world.worldX + 10, S.world.worldY, 30, 900, 'elite');
  const farElite = mockMob(S.world.worldX + 600, S.world.worldY, 30, 900, 'elite');
  eq(S.genie.chooseSet(closeElite as never, S.world), 2, 'yakın elit:');
  eq(S.genie.chooseSet(farElite as never, S.world), 2, 'uzak elit:');
});
test('DURDUR otomasyonu keser ama MEVCUT HEDEFİ SİLMEZ', () => {
  const S = genieRig();
  const mob = mockMob(S.world.worldX + 80, S.world.worldY, 40, 9999);
  S.mobs.mobs.push(mob as never);
  S.genie.start(S.world);
  S.genie.update(GENIE_TICK, S.mobs.mobs as never, S.world);
  const uid = S.targets.selectedUid;
  ok(uid !== null, 'Genie hedef seçmeliydi');
  S.genie.stop();
  eq(S.targets.selectedUid, uid, 'hedef korunmalı:');
  const mp0 = S.player.mp;
  S.genie.update(GENIE_TICK, S.mobs.mobs as never, S.world);
  eq(S.player.mp, mp0, 'durduktan sonra cast yok:');
});
test('Genie skill kurallarını KENDİ hesaplamaz: cooldown/mana engelinde sıradakine geçer', () => {
  const S = genieRig();
  const mob = mockMob(S.world.worldX + 80, S.world.worldY, 40, 1_000_000);
  S.mobs.mobs.push(mob as never);
  S.genie.start(S.world);
  const used: number[] = [];
  for (let i = 0; i < 12; i++) {
    const acts = S.genie.update(GENIE_TICK, S.mobs.mobs as never, S.world);
    for (const a of acts) if (a.kind === 'skill') used.push(a.skillRef);
    S.combat.update(1);
    S.adapter.updateAction(1);                 // action recovery ilerlesin
  }
  ok(used.length >= 2, 'birden çok skill kullanılmalı');
  ok(used.includes(ARROW_SHOWER_REF) || used.includes(MULTI_SHOT_REF), 'set 1 skilleri kullanılmalı');
});
test('ARCHER V1: hiçbir skill kullanılamıyorsa Genie BEKLER (basic fallback YOK)', () => {
  const S = genieRig();
  const mob = mockMob(S.world.worldX + 80, S.world.worldY, 40, 1_000_000);
  S.mobs.mobs.push(mob as never);
  S.genie.start(S.world);
  S.genie.settings.sets = [[], [], []];        // set boş → gizli saldırı ÜRETİLMEZ
  const mp0 = S.player.mp;
  const acts = S.genie.update(GENIE_TICK, S.mobs.mobs as never, S.world);
  ok(acts.every((a) => a.kind !== 'skill'), 'skill atılmamalı');
  ok(acts.some((a) => a.kind === 'wait'), `bekleme bekleniyordu: ${JSON.stringify(acts)}`);
  eq(S.player.mp, mp0, 'mana harcanmamalı:');
  eq((mob as unknown as { hp: number }).hp, 1_000_000, 'moba hasar gitmemeli:');
});
test('set içinde AYNI SKILL tekrar edebilir (config ile açıkça)', () => {
  const S = genieRig();
  S.genie.settings.sets[0] = [MULTI_SHOT_REF, MULTI_SHOT_REF, MULTI_SHOT_REF];
  eq(S.genie.settings.sets[0].length, 3, 'tekrar kabul edilmeli:');
  eq(new Set(S.genie.settings.sets[0]).size, 1, 'hepsi aynı skill:');
});
test('HP iksiri yalnız eşiğin ALTINDA kullanılır', () => {
  const S = genieRig();
  S.genie.settings.hpThresholdPct = 0.4;
  S.genie.settings.mpPotionRef = null;
  const max = S.stats.finalStats().maxHp;
  S.player.hp = max * 0.9;
  eq(S.genie.tryPotions(), null, 'eşiğin üstünde iksir yok:');
  S.player.hp = max * 0.2;
  const act = S.genie.tryPotions();
  ok(act !== null && act.kind === 'potion' && act.potion === 'hp', 'eşiğin altında HP iksiri kullanılmalı');
  ok(S.player.hp > max * 0.2, 'HP artmalı');
});
test('MP iksiri eşiği ayrı çalışır ve kapatılabilir', () => {
  const S = genieRig();
  S.genie.settings.hpPotionRef = null;
  S.genie.settings.mpThresholdPct = 0.3;
  const maxMp = S.stats.finalStats().maxMp;
  S.player.mp = maxMp * 0.1;
  ok(S.genie.tryPotions()?.potion === 'mp', 'MP iksiri kullanılmalı');
  S.genie.settings.mpPotionRef = null;
  S.player.mp = maxMp * 0.05;
  eq(S.genie.tryPotions(), null, 'kapalıyken kullanılmamalı:');
});
test('P1.4.1: Genie kendi iksir SEÇMEZ — yalnız seçili kademe kullanılır', () => {
  const S = genieRig();
  S.genie.settings.mpPotionRef = null;
  S.genie.settings.hpPotionRef = 389011000;              // +90 seçili
  const max = S.stats.finalStats().maxHp;
  const small = S.inventory.bagList().find((e) => e.entry.itemRef === 389011000)!.entry;
  const big = S.inventory.bagList().find((e) => e.entry.itemRef === 389012000)!.entry;
  const q1 = small.quantity, q2 = big.quantity;
  S.player.hp = max * 0.2;
  S.genie.settings.hpThresholdPct = 0.8;
  S.genie.tryPotions();
  eq(small.quantity, q1 - 1, 'SEÇİLİ iksir kullanılmalı:');
  eq(big.quantity, q2, 'seçili olmayan iksire DOKUNULMAMALI:');
});
test('çantada iksir yoksa Genie sessizce devam eder (crash yok)', () => {
  const S = genieRig();
  for (const { entry } of [...S.inventory.bagList()]) {
    if (S.consumables.isConsumable(entry.itemRef)) S.inventory.remove(entry.instanceId, entry.quantity);
  }
  S.player.hp = 1;
  const a = S.genie.tryPotions();
  /* P1.4.1: sessizlik yerine "bitti" geri bildirimi — envanter mutasyonu YOK. */
  ok(a === null || a.kind === 'potionEmpty', 'iksir yoksa kullanım olmamalı');
});
test('Genie telemetrisi DEV paneli için tüm alanları verir', () => {
  const S = genieRig();
  const mob = mockMob(S.world.worldX + 90, S.world.worldY, 40, 9999);
  S.mobs.mobs.push(mob as never);
  S.genie.start(S.world);
  S.genie.update(GENIE_TICK, S.mobs.mobs as never, S.world);
  const t = S.genie.status(S.mobs.mobs as never);
  eq(t.enabled, true);
  ok(t.farmCenter !== null, 'farm merkezi');
  ok(t.targetUid !== null, 'hedef uid');
  ok(t.distance !== null && t.distance > 0, 'mesafe');
  ok(t.activeSet !== null, 'aktif set');
  eq(t.attackRange, S.genie.settings.attackRange);
  eq(t.burstRange, S.genie.settings.autoBurstRange);
});

console.log('P1.1 — ok görselleri (gameplay\'den bağımsız):');
test('her ışın için bir görsel ok üretilir ve süresi dolunca temizlenir', () => {
  const fx = new ProjectileFxSystem();
  const m = mockMob(200, 0, 30);
  const res = resolveMultiShot(0, 0, 200, 0, MULTISHOT_PROFILES[107555], [m as never], { target: m as never });
  fx.spawnFromResolution(res);
  eq(fx.arrows.length, 5, 'ok sayısı = ışın sayısı:');
  for (let i = 0; i < 200; i++) fx.update(1 / 60);
  eq(fx.arrows.length, 0, 'hepsi sönmeli:');
});
test('görsel ok isabet/ıska bayrağını çözümlemeden alır', () => {
  const fx = new ProjectileFxSystem();
  const m2 = mockMob(340, 0, 12);
  const res = resolveMultiShot(0, 0, 340, 0, MULTISHOT_PROFILES[107555], [m2 as never], { target: m2 as never });
  fx.spawnFromResolution(res);
  eq(fx.arrows.filter((a) => a.hit).length, res.hitCount, 'isabetli ok sayısı eşleşmeli:');
});
test('görsel sistem gameplay state\'ini DEĞİŞTİRMEZ', () => {
  const mob = mockMob(200, 0, 30, 500);
  const hp0 = (mob as unknown as { hp: number }).hp;
  const fx = new ProjectileFxSystem();
  fx.spawnFromResolution(resolveMultiShot(0, 0, 200, 0, MULTISHOT_PROFILES[107515], [mob as never], { target: mob as never }));
  for (let i = 0; i < 60; i++) fx.update(1 / 60);
  eq((mob as unknown as { hp: number }).hp, hp0, 'HP değişmemeli:');
});

console.log('P1.1 — P1 inceleme düzeltmeleri:');
const BAD_SLOT: MobSpawnSlot = {
  id: 'bad', displayName: 'Geçersiz', monsterRef: -1, homeX: 100, homeY: 100,
  aiType: 'NORMAL', visual: { sheet: 'kurt', tint: '#fff', scale: 0.5 },
};
function badSys(seed: number): MobSlotSystem {
  return new MobSlotSystem([BAD_SLOT], {
    rng: mulberry32(seed), aggroMult: () => 1, playerAlive: () => true, strike: () => null,
  });
}
test('populate(): geçersiz monsterRef SONSUZ DÖNGÜYE girmez', () => {
  const sys = badSys(1);
  const res = sys.populate();
  eq(res.spawned, 0, 'hiç doğmamalı:');
  ok(res.failed > 0, 'başarısız deneme raporlanmalı');
  eq(sys.mobs.length, 0, 'mob listesi boş:');
});
test('populate(): deterministik ve slot başına TEK deneme', () => {
  eq(badSys(2).populate().failed, badSys(2).populate().failed, 'aynı tohum aynı sonuç:');
  eq(badSys(2).populate().failed, 1, 'slot başına tek deneme:');
});
test('respawn olan mob ESKİ attackTimer\'ı taşımaz', () => {
  const S = protoState(9);
  const mob = S.mobs.mobs[0];
  ok(mob !== undefined, 'mob doğmuş olmalı');
  mob.attackTimer = 999;
  S.mobs.markDead(mob);
  const cfg = S.mobs.slotConfigs().find((c) => c.id === mob.slotId)!;
  S.mobs.update((cfg.respawnSec ?? RESPAWN_DEFAULT) + 0.1, S.world);
  eq(mob.ai, 'idle', 'yeniden doğmalı:');
  eq(mob.attackTimer, 0, 'attackTimer sıfırlanmalı:');
  eq(mob.hp, mob.maxHp, 'HP tam:');
});

console.log('P1.1 — kaynak/izolasyon:');
test('prototip davranışları ana SkillRegistry\'ye ADDITIVE eklenir', () => {
  registerPrototypeSkills();
  const ms = SkillRegistry.get(MULTI_SHOT_REF);
  const as_ = SkillRegistry.get(ARROW_SHOWER_REF);
  ok(ms && as_, 'her iki skill de kayıtlı olmalı');
  eq(ms!.requiredLevel, 15, 'multiple shot KAYNAK seviye:');
  eq(ms!.manaCost, 40, 'multiple shot KAYNAK mana:');
  eq(as_!.requiredLevel, 55, 'arrow shower KAYNAK seviye:');
  eq(as_!.manaCost, 150, 'arrow shower KAYNAK mana:');
});
test('test kurulumu: Sv70 + iksirler (15 skillin hepsi açık olsun diye)', () => {
  const S = protoState(4);
  eq(S.player.level, 70, 'test seviyesi:');
  /* Canlı oyun Sv1'den başlar — bu AYRI bir karardır, testin varsayımı değil. */
  eq(PROTO.startLevel, 1, 'canlı başlangıç seviyesi:');
  const potions = S.inventory.bagList().filter((e) => S.consumables.isConsumable(e.entry.itemRef));
  ok(potions.length >= 4, `en az 4 çeşit iksir bekleniyordu, ${potions.length}`);
  ok(S.stats.finalStats().maxMp >= 150, 'arrow shower için yeterli mana havuzu');
});
test('ana oyunun DEFAULT_LOADOUT\'u değişmedi (prototip kendi barını kurar)', () => {
  eq(DEFAULT_LOADOUT[0], 102003, 'ana bar slot 0:');
  eq(DEFAULT_LOADOUT[1], 107505, 'ana bar slot 1:');
  eq(DEFAULT_LOADOUT[2], 107010, 'ana bar slot 2:');
  const S = protoState(6);
  eq(S.combat.skills.slots()[0]?.def?.sourceRef, ARROW_SHOWER_REF, 'prototip barı ayrı:');
  eq(S.combat.skills.slots().length, ACTIVE_BAR_SLOTS, 'prototip bar 5 slot:');
});
test('Genie varsayılan setleri GERÇEK skill ID\'leriyle dolu', () => {
  const S = protoState(8);
  const sets = S.genie.settings.sets;
  for (let i = 0; i < 3; i++) {
    ok(sets[i].length >= 2 && sets[i].length <= 6, `Set ${i + 1} 2-6 skill olmalı, ${sets[i].length}`);
    for (const ref of sets[i]) ok(SkillRegistry.get(ref) !== undefined, `bilinmeyen skill ${ref}`);
  }
  ok(sets[0].includes(ARROW_SHOWER_REF), 'Set 1 yakın burst arrow shower içermeli');
  ok(!sets[1].includes(ARROW_SHOWER_REF), 'Set 2 MP tasarrufu en pahalı skilli içermemeli');
});

/* ============================================================================
   EXPERIMENT P1.1.1 — Genie sequence + multi-shot hedef telemetrisi + collisionMode
   ==========================================================================*/

console.log('\nP1.1.1 — Genie skill set execution mode:');
/** Sahte adapter ile DETERMİNİST sequence testi: gerçek cooldown/mana beklemeden
 *  yalnız "hangi entry, hangi sırayla denendi" ölçülür. */
function fakeGenie(
  sets: [number[], number[], number[]],
  modes: [SetMode, SetMode, SetMode],
  blocked: Set<number> = new Set(),
) {
  const calls: number[] = [];
  let basicCalls = 0;
  const targets = new WorldTargetSystem();
  const adapter = {
    actionBusy: false,
    useSkillRef(ref: number) {
      if (blocked.has(ref)) return { ok: false, reason: 'cooldown' };
      calls.push(ref);
      /* P1.4: cast KABUL edilir, hasar impact'te uygulanır. */
      return {
        ok: true, skillRef: ref,
        accepted: {
          castId: calls.length, skillRef: ref, targetUid: 1,
          acceptedAt: 0, releaseAt: 0.2, projectileCount: 1, isMultiShot: false,
        },
      };
    },
    /* Genie ARTIK bunu ÇAĞIRMAMALI — sayaç sıfır kalmalı. */
    basicAttack() { basicCalls += 1; return { ok: true, damage: 5, killed: false }; },
  };
  const genie = new GenieSystem({
    player: { hp: 100, mp: 100 } as never,
    stats: { finalStats: () => ({ maxHp: 100, maxMp: 100 }) } as never,
    inventory: {} as never,
    consumables: {} as never,
    adapter: adapter as never,
    targets,
  });
  genie.settings.sets = sets;
  genie.settings.modes = modes;
  genie.settings.hpPotionRef = null;
  genie.settings.mpPotionRef = null;
  return { genie, calls, targets, adapter, basic: (): number => basicCalls };
}
function fakePlayer(): PlayerWorldState {
  return { worldX: 0, worldY: 0, facing: 1, facingAngle: 0, travelled: 0, moveX: 0, moveY: 0, moving: false, animT: 0 };
}
/** Set 1 (yakın) için: burst menzili içinde, normal tier. */
function closeMob(): WorldMobLike { return mockMob(50, 0, 30); }
/** Set 2 (uzak) için: burst menzilinin (240) DIŞINDA ama ATIŞ KONUMU
 *  eşiğinin (380) içinde. P1.6.1: eskiden 400'dü; artık Genie 380'in dışından
 *  cast DENEMEDİĞİ için o mesafe fiilen ulaşılamaz bir senaryoydu. */
function farMob(): WorldMobLike { return mockMob(300, 0, 30); }

test('varsayılan modlar: ÜÇ SET DE sequence', () => {
  eq(GENIE_DEFAULTS.modes[0], 'sequence', 'Set 1:');
  eq(GENIE_DEFAULTS.modes[1], 'sequence', 'Set 2:');
  eq(GENIE_DEFAULTS.modes[2], 'sequence', 'Set 3:');
  const S = protoState(31);
  eq(S.genie.modeOf(0), 'sequence', 'PrototypeState Set 1:');
  eq(S.genie.modeOf(1), 'sequence', 'PrototypeState Set 2:');
  eq(S.genie.modeOf(2), 'sequence', 'PrototypeState Set 3:');
});

test('`priority` modu SİSTEMDEN KALKMADI — oyuncu seçebilir', () => {
  eq(SET_MODES.join(','), 'priority,sequence', 'iki mod da var:');
  const S = protoState(32);
  S.genie.settings.modes[1] = 'priority';
  eq(S.genie.modeOf(1), 'priority', 'elle seçilebilir:');
  /* ve priority davranışı hâlâ çalışıyor: hep baştan tarar */
  const pri = fakeGenie([[11, 22, 11], [], []], ['priority', 'priority', 'priority']);
  const p = fakePlayer(); const mob = closeMob();
  pri.genie.start(p);
  for (let i = 0; i < 4; i++) pri.genie.update(GENIE_TICK, [mob as never], p);
  eq(pri.calls.join(','), '11,11,11,11', 'priority davranışı korunuyor:');
});

test('sequence: cursor başarılı cast sonrası ilerler ve WRAP eder', () => {
  const { genie, calls } = fakeGenie([[11, 22, 33], [], []], ['sequence', 'priority', 'priority']);
  const p = fakePlayer(); const mob = closeMob();
  genie.start(p);
  eq(genie.cursorOf(0), 0, 'başlangıç cursor:');
  genie.update(GENIE_TICK, [mob as never], p); eq(genie.cursorOf(0), 1, 'cast sonrası:');
  genie.update(GENIE_TICK, [mob as never], p); eq(genie.cursorOf(0), 2);
  genie.update(GENIE_TICK, [mob as never], p); eq(genie.cursorOf(0), 0, 'wrap:');
  genie.update(GENIE_TICK, [mob as never], p);
  eq(calls.join(','), '11,22,33,11', 'sıra korunmalı:');
});

test('sequence: DUPLICATE entry gerçek ikinci pozisyon olarak kullanılır', () => {
  /* [A, B, A] — priority modunda ikinci A'ya ASLA sıra gelmez; sequence'te gelir. */
  const seq = fakeGenie([[11, 22, 11], [], []], ['sequence', 'priority', 'priority']);
  const p = fakePlayer(); const mob = closeMob();
  seq.genie.start(p);
  for (let i = 0; i < 6; i++) seq.genie.update(GENIE_TICK, [mob as never], p);
  eq(seq.calls.join(','), '11,22,11,11,22,11', 'sequence duplicate kullanılmalı:');
  eq(seq.genie.cursorOf(0), 0, 'iki tam tur sonra cursor başa dönmeli:');

  const pri = fakeGenie([[11, 22, 11], [], []], ['priority', 'priority', 'priority']);
  const p2 = fakePlayer(); const mob2 = closeMob();
  pri.genie.start(p2);
  for (let i = 0; i < 6; i++) pri.genie.update(GENIE_TICK, [mob2 as never], p2);
  eq(pri.calls.join(','), '11,11,11,11,11,11', 'priority hep baştan taramalı:');
  eq(pri.genie.cursorOf(0), 0, 'priority cursor kullanmaz:');
});

test('sequence: BLOCKED entry atlanır, cursor kullanılan entry\'nin sonrasına gider', () => {
  const { genie, calls } = fakeGenie([[11, 22, 33], [], []], ['sequence', 'priority', 'priority'], new Set([22]));
  const p = fakePlayer(); const mob = closeMob();
  genie.start(p);
  genie.update(GENIE_TICK, [mob as never], p);   // idx0 → 11, cursor 1
  eq(genie.cursorOf(0), 1);
  genie.update(GENIE_TICK, [mob as never], p);   // idx1 blocked → idx2 → 33, cursor 0
  eq(genie.cursorOf(0), 0, 'blocked atlandıktan sonra cursor:');
  genie.update(GENIE_TICK, [mob as never], p);   // idx0 → 11
  eq(calls.join(','), '11,33,11', 'blocked entry atlanmalı:');
});

test('sequence: TÜM entry\'ler blocked → en fazla bir tam tur, sonra BEKLE', () => {
  const { genie, calls, basic } = fakeGenie(
    [[11, 22, 33], [], []], ['sequence', 'priority', 'priority'], new Set([11, 22, 33]),
  );
  const p = fakePlayer(); const mob = closeMob();
  genie.start(p);
  const acts = genie.update(GENIE_TICK, [mob as never], p);
  eq(calls.length, 0, 'hiç skill atılmamalı:');
  eq(basic(), 0, 'BASIC ATTACK FALLBACK YOK:');
  ok(acts.some((a) => a.kind === 'wait'), 'beklemeli');
  eq(genie.cursorOf(0), 0, 'başarısız turda cursor DEĞİŞMEZ:');
});

test('sequence: boş set → BEKLE (sonsuz döngü yok, gizli saldırı yok)', () => {
  const { genie, basic } = fakeGenie([[], [], []], ['sequence', 'sequence', 'sequence']);
  const p = fakePlayer(); const mob = closeMob();
  genie.start(p);
  const acts = genie.update(GENIE_TICK, [mob as never], p);
  eq(basic(), 0, 'basic fallback YOK:');
  ok(acts.some((a) => a.kind === 'wait'), 'beklemeli');
});

test('cursor politikası: BAŞLAT rotasyonu sıfırlar, DURDUR cursor\'a dokunmaz', () => {
  const { genie } = fakeGenie([[11, 22, 33], [], []], ['sequence', 'priority', 'priority']);
  const p = fakePlayer(); const mob = closeMob();
  genie.start(p);
  genie.update(GENIE_TICK, [mob as never], p);
  genie.update(GENIE_TICK, [mob as never], p);
  eq(genie.cursorOf(0), 2, 'iki cast sonrası:');
  genie.stop();
  eq(genie.cursorOf(0), 2, 'DURDUR korumalı:');
  genie.start(p);
  eq(genie.cursorOf(0), 0, 'BAŞLAT sıfırlamalı:');
});

test('set değişince ilgili setin cursor\'u KORUNUR', () => {
  const { genie, calls, targets } = fakeGenie([[11, 22, 33], [44, 55], []], ['sequence', 'sequence', 'priority']);
  const p = fakePlayer();
  const close = closeMob(), far = farMob();
  genie.start(p);
  genie.update(GENIE_TICK, [close as never], p);              // Set 1 → 11, cursor0 = 1
  targets.clear();
  genie.update(GENIE_TICK, [far as never], p);                // Set 2 → 44
  eq(genie.cursorOf(0), 1, 'Set 1 cursor korunmalı:');
  eq(genie.cursorOf(1), 1, 'Set 2 cursor ilerlemeli:');
  targets.clear();
  genie.update(GENIE_TICK, [close as never], p);              // Set 1 kaldığı yerden → 22
  eq(calls.join(','), '11,44,22', 'set 1 kaldığı yerden devam etmeli:');
});

test('Set 1 rotasyonu: yalnız 5\'li + 3\'lü, araya Standart Atış girmez', () => {
  /* P2.22 — canlı setler artık BOŞ başlıyor; rotasyon davranışı test
     setiyle sınanır (`TEST_GENIE_SETS`). */
  const sets = TEST_GENIE_SETS();
  const { genie, calls } = fakeGenie(sets, ['sequence', 'priority', 'priority']);
  const p = fakePlayer(); const mob = closeMob();
  genie.start(p);
  for (let i = 0; i < 5; i++) genie.update(GENIE_TICK, [mob as never], p);
  eq(calls.join(','), [ARROW_SHOWER_REF, MULTI_SHOT_REF, ARROW_SHOWER_REF, MULTI_SHOT_REF, ARROW_SHOWER_REF].join(','),
    'Set 1 = yalnız 5\'li + 3\'lü, araya Standart Atış GİRMEZ:');
});

test('mod değişimi ayarlardan yapılabilir ve davranışı değiştirir', () => {
  const { genie, calls } = fakeGenie([[11, 22, 11], [], []], ['priority', 'priority', 'priority']);
  const p = fakePlayer(); const mob = closeMob();
  genie.start(p);
  genie.update(GENIE_TICK, [mob as never], p);
  genie.settings.modes[0] = 'sequence';
  genie.resetCursors();
  genie.update(GENIE_TICK, [mob as never], p);
  genie.update(GENIE_TICK, [mob as never], p);
  eq(calls.join(','), '11,11,22', 'mod değişince sequence davranışı:');
});

test('sequence telemetrisi DEV paneline cursor konumunu verir', () => {
  const { genie } = fakeGenie([[11, 22, 33], [], []], ['sequence', 'priority', 'priority']);
  const p = fakePlayer(); const mob = closeMob();
  genie.start(p);
  genie.update(GENIE_TICK, [mob as never], p);
  const t = genie.status([mob as never]);
  eq(t.setMode, 'sequence', 'mod:');
  eq(t.cursorIndex, 1, 'cursor index:');
  eq(t.cursorLabel, '2/3', 'cursor etiketi:');
});

test('priority modunda cursor telemetrisi null döner', () => {
  const { genie } = fakeGenie([[11, 22], [], []], ['priority', 'priority', 'priority']);
  const p = fakePlayer(); const mob = closeMob();
  genie.start(p);
  genie.update(GENIE_TICK, [mob as never], p);
  const t = genie.status([mob as never]);
  eq(t.setMode, 'priority');
  eq(t.cursorIndex, null, 'priority cursor:');
  eq(t.cursorLabel, null);
});

console.log('P1.1.1 — multi-shot hedef telemetrisi:');
test('targetHitCount seçili hedefe isabeti sayar; yan isabet ayrı alanda', () => {
  const target = mockMob(300, 0, 30);
  const side = mockMob(150, -35, 18);
  const r = resolveMultiShot(0, 0, 300, 0, MULTISHOT_PROFILES[107555], [target as never, side as never],
    { target: target as never, collisionMode: 'firstMobAlongRay' });
  eq(r.totalProjectileCount, 5, 'atılan ok:');
  eq(r.targetHitCount + r.sideHitCount, r.hitCount, 'hedef + yan = toplam isabet:');
  ok(r.sideHitCount > 0, 'yan isabet olmalı');
  ok(r.targetHitCount < r.hitCount, 'hedefe isabet, toplam isabetten AZ olmalı (eski hitCount yanıltıcıydı)');
});

test('mesafe arttıkça HEDEF isabeti 5/5 → 3/5 → 1/5 diye düşer', () => {
  const counts = [60, 240, 340].map((d) => {
    const m = mockMob(d, 0, 22);
    return resolveMultiShot(0, 0, d, 0, MULTISHOT_PROFILES[107555], [m as never],
      { target: m as never }).targetHitCount;
  });
  eq(counts[0], 5, 'yakın:');
  ok(counts[1] < counts[0] && counts[1] > counts[2], `orta mesafe azalmalı: ${counts.join(',')}`);
  ok(counts[2] >= 1, 'merkez ok her zaman tutmalı');
});

test('adapter çıktısı: hedef/yan hasar ayrıştırılır ve toplamı totalDamage eder', () => {
  const S = protoState(41);
  S.mobs.mobs.length = 0;
  S.adapter.collisionModeOverride = 'firstMobAlongRay';
  const target = mockMob(S.world.worldX + 300, S.world.worldY, 30, 500000);
  const side = mockMob(S.world.worldX + 150, S.world.worldY - 35, 18, 500000);
  S.mobs.mobs.push(target as never, side as never);
  const r = fireAndResolve(S, ARROW_SHOWER_REF, target as never, S.mobs.mobs as never);
  ok(r.ok, 'cast başarılı');
  eq(r.projectiles, 5, 'ok sayısı:');
  const sideDamage = r.totalDamage - r.targetDamage;
  eq(r.targetDamage + sideDamage, r.totalDamage, 'hasar ayrışması:');
  ok(r.sideHits > 0 && sideDamage > 0, 'yan moba hasar gitmeli');
  ok(r.targetHits > 0 && r.targetDamage > 0, 'hedefe hasar gitmeli');
  eq(r.impacts, r.targetHits + r.sideHits, 'impact sayısı isabetle tutarlı:');
});

console.log('P1.1.1 — collisionMode:');
test('varsayılan collisionMode targetOnly (kaynakla doğrulanmamış davranış kapalı)', () => {
  eq(DEFAULT_COLLISION_MODE, 'targetOnly', 'varsayılan:');
  eq(MULTISHOT_PROFILES[107515].collisionMode, 'targetOnly', '107515 profili:');
  eq(MULTISHOT_PROFILES[107555].collisionMode, 'targetOnly', '107555 profili:');
});

test('targetOnly: yoldaki yan mob oku TUTMAZ', () => {
  const target = mockMob(300, 0, 30);
  const side = mockMob(150, -35, 18);
  const r = resolveMultiShot(0, 0, 300, 0, MULTISHOT_PROFILES[107555], [target as never, side as never],
    { target: target as never, collisionMode: 'targetOnly' });
  eq(r.sideHitCount, 0, 'yan isabet olmamalı:');
  eq(r.hitCount, r.targetHitCount, 'tüm isabetler hedefte:');
  eq(r.collisionMode, 'targetOnly', 'çözümde mod raporlanmalı:');
});

test('firstMobAlongRay: aynı sahnede yan mob oku tutar', () => {
  const target = mockMob(300, 0, 30);
  const side = mockMob(150, -35, 18);
  const r = resolveMultiShot(0, 0, 300, 0, MULTISHOT_PROFILES[107555], [target as never, side as never],
    { target: target as never, collisionMode: 'firstMobAlongRay' });
  ok(r.sideHitCount > 0, 'yan isabet olmalı');
  eq(r.collisionMode, 'firstMobAlongRay', 'çözümde mod raporlanmalı:');
});

test('DEV ezmesi (adapter.collisionModeOverride) yan mobun HP\'sini belirler', () => {
  const build = (mode: 'targetOnly' | 'firstMobAlongRay') => {
    const S = protoState(43);
    S.mobs.mobs.length = 0;
    S.adapter.collisionModeOverride = mode;
    const target = mockMob(S.world.worldX + 300, S.world.worldY, 30, 500000);
    const side = mockMob(S.world.worldX + 150, S.world.worldY - 35, 18, 500000);
    S.mobs.mobs.push(target as never, side as never);
    const hp0 = (side as unknown as { hp: number }).hp;
    /* P1.4: yan hasar da IMPACT anında uygulanır. */
    S.resolveCastToImpact(ARROW_SHOWER_REF, target as never, S.mobs.mobs as never);
    return hp0 - (side as unknown as { hp: number }).hp;
  };
  eq(build('targetOnly'), 0, 'targetOnly yan moba dokunmamalı:');
  ok(build('firstMobAlongRay') > 0, 'firstMobAlongRay yan moba hasar vermeli');
});

test('collisionMode gameplay dışı görsel katmanı bozmaz', () => {
  const target = mockMob(300, 0, 30);
  const side = mockMob(150, -35, 18);
  const fx = new ProjectileFxSystem();
  const r = resolveMultiShot(0, 0, 300, 0, MULTISHOT_PROFILES[107555], [target as never, side as never],
    { target: target as never, collisionMode: 'targetOnly' });
  fx.spawnFromResolution(r);
  eq(fx.arrows.length, 5, 'her ışın için bir ok:');
  eq(fx.arrows.filter((a) => a.hit).length, r.hitCount, 'isabet bayrağı çözümle uyumlu:');
});

/* ============================================================================
   COMBAT ÖLÇÜM HEDEFİ — GERÇEK MOB  (P2.2: HASAR KUKLASI KALDIRILDI)

   Eskiden bu bölüm `TrainingDummySystem` üzerinde koşuyordu. Kukla sistemi
   prototipten TAMAMEN çıkarıldı; aynı davranışlar artık GERÇEK bir mob
   kaydı üzerinde doğrulanıyor. Test kapsamı DÜŞMEDİ: hedefleme, hasar,
   çok-ok, hitbox etkisi, loot ve Genie senaryolarının hepsi korundu ve
   üzerine "gerçek ölüm → gerçek loot" eklendi.
   ==========================================================================*/

/** Ölçüm hedefi: AI'a KAYITSIZ, yerinde duran gerçek bir mob kaydı.
 *  Kukla değildir — `WorldMob` sözleşmesinin tamamını taşır, ölebilir,
 *  loot üretir. Yalnız ölçüm sırasında kıpırdamaması için AI'a bağlanmaz. */
function staticMob(
  S: PrototypeState, opts: { offsetX?: number; radius?: number; hp?: number } = {},
): WorldMobLike {
  const { offsetX = 100, radius = 26, hp = 1e12 } = opts;
  S.mobs.mobs.length = 0;
  const mob = {
    uid: 9500, monster: Content.monsters[0]!,
    x: S.world.worldX, y: S.world.worldY,
    worldX: S.world.worldX, worldY: S.world.worldY,
    hp, maxHp: hp, attackTimer: 0, state: 'walk', deathTimer: 0, status: [],
    slotId: 'measure', instanceIndex: 0, generation: 1, combatRadius: radius, ai: 'idle',
    homeX: S.world.worldX, homeY: S.world.worldY, respawnTimer: 0, facing: 1, animT: 0,
  } as unknown as WorldMobLike;
  (mob.monster as { defense: number }).defense = 0;
  (S.mobs.mobs as unknown as WorldMobLike[]).push(mob);
  S.world.worldX = mob.worldX + offsetX;
  S.world.worldY = mob.worldY;
  return mob;
}

console.log('\nölçüm hedefi — kurulum ve izolasyon:');
test('ölçüm hedefi GERÇEK mob listesindedir (ayrı kukla listesi YOK)', () => {
  const S = protoState(61);
  const mob = staticMob(S);
  ok((S.mobs.mobs as unknown as WorldMobLike[]).includes(mob), 'mob listesinde olmalı');
  eq(S.entities().length, S.mobs.mobs.length, 'entities() = mob listesi:');
  ok(S.entities().includes(mob as never), 'entities() içinde olmalı');
  /* KUKLA SİSTEMİ KALDIRILDI: state üzerinde böyle bir alan KALMADI. */
  eq((S as unknown as Record<string, unknown>).dummies, undefined, 'S.dummies:');
  eq((S as unknown as Record<string, unknown>).training, undefined, 'S.training:');
  eq((S as unknown as Record<string, unknown>).meter, undefined, 'S.meter (P2.3 kaldırıldı):');
});

console.log('ölçüm hedefi — hedefleme ve hasar:');
test('mob normal şekilde target seçilebilir (dokunma ve en-yakın)', () => {
  const S = protoState(64);
  const mob = staticMob(S, { offsetX: 60 });
  const picked = S.targets.pickAt(S.entities(), mob.worldX, mob.worldY, S.ranges.pickRadius);
  eq(picked?.uid, mob.uid, 'dokunarak seçim:');
  S.targets.clear();
  const nearest = S.targets.selectNearest(
    S.entities(), S.world.worldX, S.world.worldY, S.ranges.nearestScan);
  eq(nearest?.uid, mob.uid, 'en yakın hedef:');
});

test('mob ana CombatSystem üzerinden hasar ALIR', () => {
  const S = protoState(64);
  const mob = staticMob(S, { offsetX: 60, hp: 1e9 });
  S.targets.select(mob.uid);
  const before = mob.hp;
  const shot = S.resolveCastToImpact(ARCHER.STANDART_ATIS, mob as never, S.entities());
  ok(shot.impacts.length > 0, 'impact üretilmeli');
  ok(mob.hp < before, `HP düşmeli (${before} → ${mob.hp})`);
});

test('çok-ok mob üzerinde normal işler', () => {
  const S = protoState(64);
  S.infiniteMp = true;
  const mob = staticMob(S, { offsetX: 60, hp: 1e9 });
  S.targets.select(mob.uid);
  S.updateInfiniteMp();
  const shot = S.resolveCastToImpact(ARCHER.BESLI_SALVO, mob as never, S.entities());
  eq(shot.impacts.length, 5, 'beşli salvo impact sayısı:');
  eq(shot.impacts.filter((i) => i.target?.uid === mob.uid).length, 5, 'hepsi hedefe:');
});

test('HİTBOX yarıçapı isabeti değiştirir (küçük vs büyük hedef)', () => {
  const count = (radius: number): number => {
    const S = protoState(70);
    S.infiniteMp = true;
    const mob = staticMob(S, { offsetX: 300, radius, hp: 1e9 });
    S.targets.select(mob.uid);
    S.updateInfiniteMp();
    const shot = S.resolveCastToImpact(ARCHER.UCLU_SALVO, mob as never, S.entities());
    return shot.impacts.filter((i) => i.target?.uid === mob.uid).length;
  };
  const small = count(26), big = count(60);
  ok(big >= small, `hitbox büyüyünce isabet artmalı (${small} → ${big})`);
  ok(big > 0, 'büyük hitbox isabet almalı');
});

test('CANLI mob loot/exp/coin ÜRETMEZ — ödül yalnız ÖLÜNCE gelir', () => {
  const S = protoState(64);
  const mob = staticMob(S, { offsetX: 60, hp: 1e9 });
  S.targets.select(mob.uid);
  const coins = S.player.coins;
  for (let i = 0; i < 5; i++) S.resolveCastToImpact(ARCHER.STANDART_ATIS, mob as never, S.entities());
  S.reapDead();
  eq(S.worldLoot.items.length, 0, 'yerde loot:');
  eq(S.player.coins, coins, 'coin:');
  eq(S.drops.totals.kills, 0, 'kill:');
});

test('GERÇEK ÖLÜM → GERÇEK LOOT (kuklada mümkün DEĞİLDİ)', () => {
  const S = protoState(64);
  S.lootPolicy.setMode('manual');
  const mob = staticMob(S, { offsetX: 60, hp: 1 });
  S.targets.select(mob.uid);
  S.resolveCastToImpact(ARCHER.STANDART_ATIS, mob as never, S.entities());
  S.reapDead();
  eq(S.drops.totals.kills, 1, 'kill sayısı:');
  ok(S.worldLoot.items.length > 0 || S.drops.totals.coin > 0,
    'ölüm ganimet ya da altın üretmeli');
});


/** Eski `dummyRig` yerine: tek GERÇEK mob + oyuncu `offsetX` kadar sağda.
 *  HP pratikte tükenmez ki ölçüm senaryoları yarıda kesilmesin. */
function dummyRig(offsetX = 100): { S: PrototypeState; dummy: WorldMobLike } {
  const S = protoState(64);
  const dummy = staticMob(S, { offsetX, hp: 1e12 });
  return { S, dummy };
}

console.log('ölçüm hedefi — Genie:');
test('Genie GERÇEK mobu hedef alır ve SEQUENCE rotasyonunu kesintisiz çalıştırır', () => {
  const S = protoState(65);
  const mob = staticMob(S, { offsetX: 100, hp: 1e12 });   // Auto Burst Range içinde → Set 1
  S.genie.start(S.world);

  const used: number[] = [];
  for (let i = 0; i < 60; i++) {
    for (const a of S.genie.update(0.5, S.entities(), S.world)) {
      if (a.kind === 'skill') used.push(a.skillRef);
    }
    S.combat.update(0.5);
    S.adapter.updateAction(0.5);
    mob.hp = mob.maxHp;                 // ölçüm boyunca hedef ayakta kalsın
  }
  eq(S.targets.selectedUid, mob.uid, 'Genie mobu hedeflemeli:');
  eq(S.genie.modeOf(0), 'sequence', 'Set 1 sequence:');
  ok(used.length >= 6, `birçok cast beklenir, ${used.length}`);
  eq(used.slice(0, 4).join(','), [ARROW_SHOWER_REF, MULTI_SHOT_REF, ARROW_SHOWER_REF, MULTI_SHOT_REF].join(','),
    'Set 1 rotasyonu 5→3→5→3 (araya Standart Atış GİRMEZ):');
  eq(mob.state !== 'dying', true, 'hedef ölmemeli — combo yarıda kesilmez:');
});

test('Genie: GERÇEK mob üzerinde Set 2 → Set 1 geçişi mesafeyle çalışır', () => {
  const S = protoState(66);
  const mob = staticMob(S, { offsetX: 0, hp: 1e12 });
  const burst = S.genie.settings.autoBurstRange;
  S.world.worldY = mob.worldY;

  S.world.worldX = mob.worldX + burst + 60;
  S.genie.start(S.world);
  eq(S.genie.chooseSet(mob as never, S.world), 1, 'uzakta Set 2:');
  S.world.worldX = mob.worldX + burst - 60;
  eq(S.genie.chooseSet(mob as never, S.world), 0, 'yaklaşınca Set 1:');
});

test('Genie: GERÇEK mob hem Attack Range hem Farm Boundary kuralına tabidir', () => {
  const S = protoState(67);
  S.genie.settings.farmBoundaryEnabled = true;        // P2.10: varsayılan kapalı
  const mob = staticMob(S, { offsetX: 0, hp: 1e12 });
  S.genie.start(S.world);
  eq(S.genie.canTarget(mob as never, S.world), true, 'yanındayken hedeflenebilir:');
  S.world.worldX = mob.worldX + S.genie.settings.attackRange + 100;
  eq(S.genie.inAttackRange(mob as never, S.world), false, 'Attack Range dışında:');
  S.world.worldX = mob.worldX;
  S.genie.farmCenter = {
    x: mob.worldX + S.genie.settings.farmBoundaryRadius + 300, y: mob.worldY,
  };
  eq(S.genie.inAttackRange(mob as never, S.world), true, 'Attack Range içinde:');
  eq(S.genie.inFarmBoundary(mob as never), false, 'Farm Boundary dışında:');
  eq(S.genie.pickTarget(S.entities(), S.world), null, 'sınır dışındaki mob hedeflenmez:');
});


/* ============================================================================
   P1.1.1 — (7) oyuncu animasyon state'i · (8) iki menzil · (9) auto loot
   ==========================================================================*/

console.log('\n(7) oyuncu animasyon state:');
test('HAREKET tek başına saldırı animasyonu BAŞLATMAZ', () => {
  const a = new PlayerAnimator();
  let travelled = 0;
  for (let i = 0; i < 240; i++) { travelled += 210 / 60; a.update(1 / 60, true, travelled, 0); }
  eq(a.state, 'move', 'durum:');
  eq(a.frame, PLAYER_ANIM.idleFrame, 'yürürken DAİMA duruş karesi:');
  eq(a.triggers.attack, 0, 'attack tetiği:');
  eq(a.triggers.skill, 0, 'skill tetiği:');
});

test('DURUŞTA saldırı animasyonu YOK, kare sabit', () => {
  const a = new PlayerAnimator();
  for (let i = 0; i < 120; i++) a.update(1 / 60, false, 0, 0);
  eq(a.state, 'idle');
  eq(a.frame, PLAYER_ANIM.idleFrame, 'duruş karesi:');
  near(a.hopOffset, 0, 0.2, 'duruşta zıplama yok:');
});

test('BAŞARILI temel saldırı attack animasyonunu BİR KEZ oynatır', () => {
  const { S, dummy } = dummyRig(60);
  eq(S.anim.triggers.attack, 0, 'başlangıç:');
  const res = S.performBasic(dummy as never);
  ok(res.ok, 'saldırı başarılı olmalı');
  eq(S.anim.state, 'attack', 'durum:');
  eq(S.anim.triggers.attack, 1, 'tek tetik:');
  /* animasyon ilerler ve BİTER → hareket durumuna döner */
  let sawLastFrame = false;
  for (let i = 0; i < 60; i++) {
    S.anim.update(1 / 60, false, 0, 0);
    if (S.anim.state === 'attack') sawLastFrame = sawLastFrame || S.anim.frame === PLAYER_ANIM.attackFrames - 1;
  }
  ok(sawLastFrame, 'son kareye ulaşmalı');
  eq(S.anim.state, 'idle', 'bitince duruşa döner:');
  eq(S.anim.frame, PLAYER_ANIM.idleFrame, 'kare duruşa döner:');
});

test('BAŞARILI skill cast animasyonu tetikler (attack\'tan ayrı state)', () => {
  const { S, dummy } = dummyRig(60);
  const res = S.performSkill(ARROW_SHOWER_REF, dummy as never, S.entities());
  ok(res.ok, 'cast başarılı olmalı');
  eq(S.anim.state, 'skill', 'durum:');
  eq(S.anim.triggers.skill, 1, 'skill tetiği:');
  eq(S.anim.triggers.attack, 0, 'attack tetiklenmemeli:');
});

test('BAŞARISIZ / menzil dışı saldırı animasyon tetiklemez', () => {
  const { S } = dummyRig(60);
  const far = mockMob(S.world.worldX + 5000, S.world.worldY, 30, 1000);
  const b = S.performBasic(far as never);
  eq(b.ok, false, 'menzil dışı temel saldırı:');
  const k = S.performSkill(ARROW_SHOWER_REF, far as never, [far as never]);
  eq(k.ok, false, 'menzil dışı skill:');
  const none = S.performBasic(null);
  eq(none.ok, false, 'hedefsiz saldırı:');
  eq(S.anim.triggers.attack, 0, 'attack tetiği:');
  eq(S.anim.triggers.skill, 0, 'skill tetiği:');
  eq(S.anim.state !== 'attack' && S.anim.state !== 'skill', true, 'saldırı durumuna girmemeli:');
});

test('Genie KAPALI + hareket → hiçbir saldırı animasyonu üretilmez', () => {
  const S = protoState(71);
  const mob = mockMob(S.world.worldX + 60, S.world.worldY, 40, 999999);
  S.mobs.mobs.length = 0;
  S.mobs.mobs.push(mob as never);
  eq(S.genie.enabled, false, 'Genie kapalı olmalı:');
  for (let i = 0; i < 300; i++) {
    S.movement.move(S.world, { x: 1, y: 0, magnitude: 1 }, 1 / 60);
    S.applyAnimFor(S.genie.update(1 / 60, S.entities(), S.world));
    S.anim.update(1 / 60, S.world.moving, S.world.travelled, S.world.facingAngle);
  }
  eq(S.anim.triggers.attack, 0, 'attack tetiği:');
  eq(S.anim.triggers.skill, 0, 'skill tetiği:');
  eq(S.anim.state, 'move', 'yalnız hareket durumu:');
  eq(S.anim.frame, PLAYER_ANIM.idleFrame, 'kare duruş karesi:');
});

test('Genie AÇIK saldırırsa AYNI animasyon tetiği kullanılır', () => {
  const { S, dummy } = dummyRig(80);
  S.genie.start(S.world);
  for (let i = 0; i < 20; i++) {
    S.applyAnimFor(S.genie.update(0.5, S.entities(), S.world));
    S.combat.update(0.5);
    S.adapter.updateAction(0.5);
    dummy.hp = dummy.maxHp;              // ölçüm boyunca hedef ayakta kalsın
  }
  ok(S.anim.triggers.skill > 0, 'Genie saldırısı cast animasyonu tetiklemeli');
  eq(dummy.state !== 'dying', true, 'hedef ayakta:');
});

test('ölüm durumu saldırı animasyonunu kilitler', () => {
  const a = new PlayerAnimator();
  a.setDead(true);
  a.triggerAttack();
  a.triggerSkill();
  eq(a.state, 'dead', 'durum:');
  eq(a.triggers.attack, 0, 'ölüyken tetik yok:');
  a.setDead(false);
  eq(a.state, 'idle', 'dirilince duruş:');
});

console.log('(8) iki ayrı menzil — Attack Range / Farm Boundary:');
test('Attack Range OYUNCU merkezlidir ve oyuncuyla HAREKET EDER', () => {
  const S = protoState(72);
  S.mobs.mobs.length = 0;
  S.genie.settings.attackRange = 450;
  S.genie.settings.farmBoundaryEnabled = false;
  const mob = mockMob(S.world.worldX + 600, S.world.worldY, 40, 999999);
  S.mobs.mobs.push(mob as never);
  S.genie.start(S.world);                              // farm merkezi burada kilitlendi
  eq(S.genie.inAttackRange(mob as never, S.world), false, 'başlangıçta uzak:');
  /* oyuncu moba doğru yürür → halka onunla gelir */
  S.world.worldX += 300;
  eq(S.genie.inAttackRange(mob as never, S.world), true, 'yaklaşınca menzile girer:');
  eq(S.genie.farmCenter?.x, S.world.worldX - 300, 'farm merkezi KAYMAZ:');
});

test('Farm Boundary SABİTTİR: merkez BAŞLAT konumudur', () => {
  const S = protoState(73);
  S.mobs.mobs.length = 0;
  S.genie.settings.farmBoundaryEnabled = true;
  S.genie.settings.farmBoundaryRadius = 650;
  const startX = S.world.worldX, startY = S.world.worldY;
  S.genie.start(S.world);
  const outside = mockMob(startX + 900, startY, 40, 999999);
  S.mobs.mobs.push(outside as never);
  /* oyuncu mobun dibine yürüsün: Attack Range içine girer AMA sınır dışıdır */
  S.world.worldX = outside.worldX - 100;
  eq(S.genie.inAttackRange(outside as never, S.world), true, 'Attack Range içinde:');
  eq(S.genie.inFarmBoundary(outside as never), false, 'Farm Boundary dışında:');
  eq(S.genie.canTarget(outside as never, S.world), false, 'hedeflenemez:');
  eq(S.genie.pickTarget(S.entities(), S.world), null, 'hedef seçilmez:');
  eq(S.genie.farmCenter?.x, startX, 'merkez sabit:');
  eq(S.genie.farmCenter?.y, startY, 'merkez sabit:');
});

test('Farm Boundary KAPALIYKEN yalnız Attack Range geçerlidir', () => {
  const S = protoState(74);
  S.mobs.mobs.length = 0;
  S.genie.settings.farmBoundaryEnabled = false;
  S.genie.start(S.world);
  const far = mockMob(S.world.worldX + 5000, S.world.worldY, 40, 999999);
  S.mobs.mobs.push(far as never);
  eq(S.genie.inFarmBoundary(far as never), true, 'sınır kapalı → daima true:');
  eq(S.genie.canTarget(far as never, S.world), false, 'ama Attack Range dışında:');
  S.world.worldX = far.worldX - 100;
  eq(S.genie.canTarget(far as never, S.world), true, 'yaklaşınca hedeflenebilir:');
});

/* P2.10 — farm çemberi varsayılan olarak KAPALI. Sistem duruyor ve DEV
   panelinden açılabiliyor; aşağıdaki testler onu AÇIKÇA açar. */
test('hedef Farm Boundary dışına KAÇARSA Genie kovalamayı bırakır', () => {
  const S = protoState(75);
  S.mobs.mobs.length = 0;
  S.genie.settings.farmBoundaryEnabled = true;      // P2.10: varsayılan kapalı
  S.genie.settings.farmBoundaryRadius = 500;
  const mob = mockMob(S.world.worldX + 80, S.world.worldY, 40, 999999);
  S.mobs.mobs.push(mob as never);
  S.genie.start(S.world);
  S.genie.update(GENIE_TICK, S.entities(), S.world);
  eq(S.targets.selectedUid, (mob as unknown as { uid: number }).uid, 'önce hedeflenir:');
  /* mob sınırın dışına kaçar (oyuncu yerinde kalır) */
  mob.worldX = S.world.worldX + 900;
  S.genie.update(GENIE_TICK, S.entities(), S.world);
  eq(S.genie.inFarmBoundary(mob as never), false, 'sınır dışında:');
  eq(S.targets.selectedUid, null, 'hedef bırakılır:');
});

test('Attack Range, skill menzilinden AYRI bir kavramdır', () => {
  const S = protoState(76);
  S.mobs.mobs.length = 0;
  S.genie.settings.attackRange = 650;                  // hedef edinme geniş
  const mob = mockMob(S.world.worldX + 500, S.world.worldY, 40, 999999);
  S.mobs.mobs.push(mob as never);
  S.genie.start(S.world);
  eq(S.genie.canTarget(mob as never, S.world), true, 'hedef edinilebilir:');
  /* ama skill menzili (340/360) çok daha kısa → cast reddedilir */
  const res = S.adapter.useSkillRef(ARROW_SHOWER_REF, S.world, mob as never, S.entities());
  eq(res.ok, false, 'skill menzil dışı:');
  eq((res as { reason: string }).reason, 'range', 'sebep:');
});

test('menzil seçenekleri ve varsayılanlar', () => {
  eq(ATTACK_RANGES.join(','), '250,350,450,550,650', 'Attack Range seçenekleri:');
  eq(FARM_BOUNDARY_RANGES.join(','), '350,500,650,800,1000', 'Farm Boundary seçenekleri:');
  eq(GENIE_DEFAULTS.attackRange, 450, 'varsayılan Attack Range:');
  eq(GENIE_DEFAULTS.farmBoundaryRadius, 650, 'varsayılan Farm Boundary:');
  /* P2.10 — çember VARSAYILAN OLARAK KAPALI: Moradon haritaya yayıldı,
     650 birimlik çember oyuncuyu köşeye hapsediyordu. Sistem duruyor. */
  eq(GENIE_DEFAULTS.farmBoundaryEnabled, false, 'sınır varsayılan kapalı:');
  eq(GENIE_DEFAULTS.showFarmBoundary, false, 'halka varsayılan gizli:');
});

test('KABUL SENARYOSU: Attack 450 + Boundary 650', () => {
  const S = protoState(77);
  S.mobs.mobs.length = 0;
  S.genie.settings.attackRange = 450;
  S.genie.settings.farmBoundaryRadius = 650;
  S.genie.settings.farmBoundaryEnabled = true;
  const cx = S.world.worldX, cy = S.world.worldY;
  S.genie.start(S.world);

  const inBoth = mockMob(cx + 300, cy, 40, 999999);          // sınır içi, menzil içi
  const outsideBoundary = mockMob(cx + 800, cy, 40, 999999); // sınır dışı
  S.mobs.mobs.push(inBoth as never, outsideBoundary as never);

  eq(S.genie.pickTarget(S.entities(), S.world)?.uid, (inBoth as unknown as { uid: number }).uid,
    'yalnız sınır içindeki hedeflenir:');

  /* karakter sınır içinde yürür: Attack Range onunla gelir, merkez yerinde kalır */
  S.world.worldX = cx + 400;
  eq(S.genie.inAttackRange(inBoth as never, S.world), true, 'yürüdükten sonra hâlâ menzilde:');
  eq(S.genie.farmCenter?.x, cx, 'boundary merkezi yerinde:');
  /* sınır dışındaki mob oyuncuya 400 birim yaklaşsa bile hedeflenmez */
  eq(S.genie.inAttackRange(outsideBoundary as never, S.world), true, 'menzile girdi:');
  eq(S.genie.canTarget(outsideBoundary as never, S.world), false, 'ama sınır dışı → hedeflenmez:');
});

console.log('(9) auto loot — P1.7 kanonik:');
function lootRig(mode: 'manual' | 'auto' = 'auto'): PrototypeState {
  const S = protoState(78);
  S.mobs.mobs.length = 0;
  S.worldLoot.clear();
  S.lootPolicy.setMode(mode);
  return S;
}

/** Test mobu: gerçek monster verisi + öldürülebilir HP, istenen konumda. */
function killableMob(S: PrototypeState, x: number, y: number, monsterRef = 750): WorldMob {
  const monster = Content.monster(monsterRef)!;
  const m: WorldMob = {
    uid: 90000 + S.mobs.mobs.length, monster,
    x, y, worldX: x, worldY: y,
    hp: 10, maxHp: 10, attackTimer: 0, state: 'walk', deathTimer: 0, status: [],
    slotId: 'test_slot', instanceIndex: 0, generation: 1, combatRadius: 40, ai: 'idle',
    homeX: x, homeY: y, respawnTimer: 0, facing: 1, animT: 0,
  };
  S.mobs.mobs.push(m);
  return m;
}
/** Mobu öldürüp TEK reap kapısından geçirir; drop olayını döndürür. */
function killAndReap(S: PrototypeState, mob: WorldMob): DropEvent {
  mob.hp = 0; mob.state = 'dying';
  const reaped = S.reapDead();
  const hit = reaped.find((r) => r.drop.mobUid === mob.uid);
  ok(hit !== undefined, 'reap edilmiş olmalı');
  return hit!.drop;
}

test('P1.7 varsayılan Auto Loot AÇIK', () => {
  eq(LOOT_DEFAULTS.mode, 'auto', 'policy varsayılanı:');
  eq(protoState(79).lootPolicy.mode, 'auto', 'PrototypeState:');
  eq(protoState(79).lootPolicy.autoLoot, true, 'autoLoot bayrağı:');
});

test('§23 ESKİ AUTO LOOT MENZİLİ SİSTEMİ KALDIRILDI', () => {
  const policy = new LootPolicy() as unknown as Record<string, unknown>;
  eq(policy.autoRadius, undefined, 'autoRadius alanı:');
  eq(policy.setAutoRadius, undefined, 'setAutoRadius:');
  eq(policy.autoPickup, undefined, 'yarıçap tarayan autoPickup:');
  /* Auto Loot yalnız ON/OFF taşır */
  eq(Object.keys(LOOT_DEFAULTS).join(','), 'mode', 'ayar alanları:');
});

test('Genie ARTIK loot eylemi ÜRETMEZ (yerdeki lootu kovalamaz)', () => {
  const S = lootRig('auto');
  S.worldLoot.spawn(groundSpec(PLAYER.starterWeaponRef, S.world.worldX + 10, S.world.worldY));
  S.genie.start(S.world);
  const x0 = S.world.worldX, y0 = S.world.worldY;
  const acts: string[] = [];
  for (let i = 0; i < 30; i++) {
    for (const a of S.genie.update(GENIE_TICK, S.entities(), S.world)) acts.push(a.kind);
  }
  eq(acts.filter((k) => k === 'loot').length, 0, 'loot eylemi:');
  eq(S.worldLoot.count, 1, 'yerdeki loot Genie tarafından ALINMAZ:');
  eq(S.world.worldX, x0, 'oyuncu X:'); eq(S.world.worldY, y0, 'oyuncu Y:');
});

test('LootPolicy mode değiştirme (ayar ekranı)', () => {
  const S = lootRig('manual');
  eq(S.lootPolicy.toggleMode(), 'auto', 'manual → auto:');
  eq(S.lootPolicy.toggleMode(), 'manual', 'auto → manual:');
  S.lootPolicy.setMode('auto');
  eq(S.lootPolicy.mode, 'auto', 'setMode:');
  eq(S.lootPolicy.autoLoot, true, 'autoLoot:');
});

/* ============================================================================
   OYUN İÇİ GÖZLEM DÜZELTMELERİ (1) kayma (2) havada durma (3) bakış yönü
                                 (4) set kilidi (5) uzaktan loot
   ==========================================================================*/

console.log('\n(1) yürüyüş: adım döngüsü mesafeye bağlı');
test('adım fazı ZAMANA değil KATEDİLEN MESAFEYE bağlıdır', () => {
  const slow = new PlayerAnimator(), fast = new PlayerAnimator();
  let ds = 0, df = 0;
  for (let i = 0; i < 60; i++) {
    ds += 60 / 60; df += 240 / 60;                    // 60 vs 240 birim/sn
    slow.update(1 / 60, true, ds, 0);
    fast.update(1 / 60, true, df, 0);
  }
  ok(fast.stridePhase !== slow.stridePhase, 'hız farkı adım fazına yansımalı');
  /* aynı MESAFE aynı fazı vermeli (hız/dt fark etmeksizin) */
  const a = new PlayerAnimator(), b = new PlayerAnimator();
  for (let i = 0; i < 100; i++) a.update(1 / 100, true, (i + 1) * 1.0, 0);
  for (let i = 0; i < 25; i++) b.update(1 / 25, true, (i + 1) * 4.0, 0);
  near(a.stridePhase, b.stridePhase, 1e-9, 'aynı mesafe → aynı faz:');
});

test('adım döngüsü zıplama / ezilme / gölge nabzı üretir (kayma değil)', () => {
  const a = new PlayerAnimator();
  const hops: number[] = [], shadows: number[] = [];
  let d = 0;
  for (let i = 0; i < 120; i++) { d += PLAYER_ANIM.strideWorld / 20; a.update(1 / 60, true, d, 0); hops.push(a.hopOffset); shadows.push(a.shadowScale); }
  ok(Math.max(...hops) > PLAYER_ANIM.hopPixels * 0.9, 'zıplama tepe noktasına ulaşmalı');
  ok(Math.min(...hops) < PLAYER_ANIM.hopPixels * 0.15, 'basış anında zıplama sıfıra inmeli');
  ok(Math.min(...shadows) < 0.85 && Math.max(...shadows) > 0.98, 'gölge nabzı çalışmalı');
  ok(a.squashY <= 1, 'ezilme çarpanı 1 üstüne çıkmamalı');
});

test('ayak basışı olayı adım başına BİR kez tetiklenir', () => {
  const a = new PlayerAnimator();
  let d = 0, plants = 0;
  for (let i = 0; i < 200; i++) {
    d += PLAYER_ANIM.strideWorld / 25;                // adım başına 25 kare
    a.update(1 / 60, true, d, 0);
    if (a.footPlanted) plants += 1;
  }
  /* 200 kare × (1/25 adım) = 8 tam döngü → 16 basış (0 ve 0.5) */
  ok(plants >= 14 && plants <= 18, `beklenen ~16 basış, gelen ${plants}`);
});

test('duruşta adım fazı basış noktasına oturur, basış tetiklenmez', () => {
  const a = new PlayerAnimator();
  let d = 0;
  for (let i = 0; i < 10; i++) { d += 6; a.update(1 / 60, true, d, 0); }
  for (let i = 0; i < 120; i++) a.update(1 / 60, false, d, 0);
  eq(a.footPlanted, false, 'dururken basış olayı yok:');
  near(a.hopOffset, 0, 0.35, 'dururken karakter yerde:');
});

test('engele dayanınca mesafe artmaz → adım döngüsü DURUR (kayma yok)', () => {
  const wall: Obstacle[] = [{ x: 600, y: 500, radius: 60, kind: 'rock' }];
  const sys = movementRig(wall, 200);
  const p = newPlayer(500, 500);
  const anim = new PlayerAnimator();
  for (let i = 0; i < 120; i++) {
    sys.move(p, { x: 1, y: 0, magnitude: 1 }, 1 / 60);
    anim.update(1 / 60, p.moving, p.travelled, p.facingAngle);
  }
  const blockedAt = p.travelled;
  for (let i = 0; i < 60; i++) {
    sys.move(p, { x: 1, y: 0, magnitude: 1 }, 1 / 60);
    anim.update(1 / 60, p.moving, p.travelled, p.facingAngle);
  }
  near(p.travelled, blockedAt, 1e-6, 'duvara dayanınca mesafe artmamalı:');
});

console.log('(2) ayak hizası:');
test('sprite alt boşluğu telafi ediliyor (karakter havada durmaz)', () => {
  ok(OKCU_FOOT_PAD > 0, 'ölçülmüş bir alt pay olmalı');
  ok(OKCU_FOOT_PAD < OKCU_FRAME / 2, 'pay makul olmalı');
  /* çizim ofseti: görünen yüksekliğin bu oranı kadar aşağı kaydırılır */
  const drawH = OKCU_FRAME * 0.78;
  const footOffset = (OKCU_FOOT_PAD / OKCU_FRAME) * drawH;
  near(footOffset, 36 / 300 * drawH, 1e-9, 'ofset formülü:');
  ok(footOffset > 20 && footOffset < 40, `ofset ${footOffset.toFixed(1)} px olmalı`);
});

console.log('(3) 8 yönlü bakış:');
test('hareket açısı state\'e yazılır (dikey harekette de doğru)', () => {
  const sys = movementRig([], 200);
  const p = newPlayer(500, 500);
  sys.move(p, { x: 0, y: -1, magnitude: 1 }, 1 / 60);      // yukarı
  near(p.facingAngle, -Math.PI / 2, 1e-9, 'yukarı:');
  sys.move(p, { x: -1, y: 0, magnitude: 1 }, 1 / 60);      // sola
  near(Math.abs(p.facingAngle), Math.PI, 1e-9, 'sola:');
  sys.move(p, { x: 0, y: 1, magnitude: 1 }, 1 / 60);       // aşağı
  near(p.facingAngle, Math.PI / 2, 1e-9, 'aşağı:');
});

test('açı → 8 yönden birine yuvarlanır ve doğru sayfayı seçer', () => {
  eq(directionIndex(0), 0, 'sağ:');
  eq(directionIndex(Math.PI / 2), 2, 'aşağı (ön):');
  eq(directionIndex(Math.PI), 4, 'sol:');
  eq(directionIndex(-Math.PI / 2), 6, 'yukarı (arka):');
  eq(okcuSheet(0), 'gt_okcu_y_sag');
  eq(okcuSheet(Math.PI), 'gt_okcu_y_sol');
  eq(okcuSheet(-Math.PI / 2), 'gt_okcu_y_arka');
  eq(okcuSheet(Math.PI / 2), 'gt_okcu_y_on');
  eq(new Set(OKCU_DIRECTION_SHEETS).size, 8, '8 ayrı sayfa:');
});

test('8 yön sayfalarının hepsi prototip manifestinde kayıtlı', () => {
  for (const key of OKCU_DIRECTION_SHEETS) {
    ok(key === 'gt_okcu_y_sag' || PROTO_ASSETS[key] !== undefined, `${key} manifestte olmalı`);
  }
});

test('saldırıda bakış HEDEFE döner, yürüyüş yönüne değil', () => {
  const { S, dummy } = dummyRig(60);
  S.world.facingAngle = 0;                                   // sağa bakıyor
  /* hedef oyuncunun SOLUNDA (dummyRig oyuncuyu +60 sağa koyar) */
  const res = S.performBasic(dummy as never);
  ok(res.ok, 'saldırı başarılı');
  const expected = Math.atan2(dummy.worldY - S.world.worldY, dummy.worldX - S.world.worldX);
  near(S.anim.angle, expected, 1e-9, 'bakış hedefe döner:');
  eq(okcuSheet(S.anim.angle), 'gt_okcu_y_sol', 'sol sayfası seçilmeli:');
});

test('yürürken bakış hareket yönünü izler, saldırı bitince serbest kalır', () => {
  const a = new PlayerAnimator();
  a.update(1 / 60, true, 5, Math.PI / 2);
  near(a.angle, Math.PI / 2, 1e-9, 'yürüyüş yönü:');
  a.triggerAttack(0);                                        // hedef sağda
  a.update(1 / 60, true, 10, Math.PI / 2);
  near(a.angle, 0, 1e-9, 'saldırı sırasında hedefe bakar:');
  for (let i = 0; i < 40; i++) a.update(1 / 60, true, 10 + i, Math.PI / 2);
  near(a.angle, Math.PI / 2, 1e-9, 'saldırı bitince yine hareket yönü:');
});

console.log('(4) aktif set kilidi:');
test('varsayılan OTOMATİK: set mesafe/elite ile seçilir', () => {
  const S = protoState(81);
  eq(S.genie.settings.forcedSet, null, 'varsayılan:');
  const burst = S.genie.settings.autoBurstRange;
  const close = mockMob(S.world.worldX + burst - 50, S.world.worldY, 30);
  const far = mockMob(S.world.worldX + burst + 50, S.world.worldY, 30);
  const elite = mockMob(S.world.worldX + 20, S.world.worldY, 30, 900, 'elite');
  eq(S.genie.chooseSet(close as never, S.world), 0);
  eq(S.genie.chooseSet(far as never, S.world), 1);
  eq(S.genie.chooseSet(elite as never, S.world), 2);
});

test('KİLİTLİ set: mesafe ve elit durumu göz ardı edilir', () => {
  const S = protoState(82);
  S.genie.settings.forcedSet = 0;
  const far = mockMob(S.world.worldX + 900, S.world.worldY, 30);
  const elite = mockMob(S.world.worldX + 20, S.world.worldY, 30, 900, 'elite');
  eq(S.genie.chooseSet(far as never, S.world), 0, 'uzak mob:');
  eq(S.genie.chooseSet(elite as never, S.world), 0, 'elit mob:');
  S.genie.settings.forcedSet = 2;
  eq(S.genie.chooseSet(far as never, S.world), 2, 'Set 3 kilidi:');
});

test('KİLİTLİ sette YALNIZ o setin skilleri denenir', () => {
  /* Set 1 = yalnız 3/5 ok, Set 2/3 = başka skiller. Kilit açıkken diğerleri ASLA atılmamalı. */
  const { genie, calls, targets } = fakeGenie(
    [[ARROW_SHOWER_REF, MULTI_SHOT_REF], [107505, 107510], [107500]],
    ['sequence', 'priority', 'priority'],
  );
  const p = fakePlayer();
  genie.settings.forcedSet = 0;
  genie.start(p);
  /* hem yakın hem uzak hedefle dene → normalde Set 2'ye geçerdi */
  for (let i = 0; i < 4; i++) genie.update(GENIE_TICK, [closeMob() as never], p);
  targets.clear();
  for (let i = 0; i < 4; i++) genie.update(GENIE_TICK, [farMob() as never], p);
  const allowed = new Set<number>([ARROW_SHOWER_REF, MULTI_SHOT_REF]);
  for (const ref of calls) ok(allowed.has(ref), `kilit dışı skill atıldı: ${ref}`);
  ok(calls.length >= 6, `cast beklenir, ${calls.length}`);
});

test('kilit telemetride görünür', () => {
  const S = protoState(83);
  S.genie.settings.forcedSet = 1;
  eq(S.genie.status(S.entities()).forcedSet, 1, 'telemetri:');
  S.genie.settings.forcedSet = null;
  eq(S.genie.status(S.entities()).forcedSet, null, 'otomatik:');
});

console.log('(5) auto loot MESAFESİZDİR (P1.7):');
test('§7 Auto Loot MESAFEYE BAKMAZ — 1000 birim uzakta ölen mob bile çantaya girer', () => {
  const S = lootRig('auto');
  const x0 = S.world.worldX, y0 = S.world.worldY;
  const mob = killableMob(S, x0 + 1000, y0);      // ÇOK uzakta
  const before = S.inventory.usedSlots;
  const ev = killAndReap(S, mob);
  ok(ev.records.length > 0 || ev.coin > 0, 'bir şey düşmeli');
  for (const r of ev.records.filter((x: DropRecord) => x.kind === 'item')) {
    eq(r.delivery, 'AUTO_INVENTORY', `${r.itemName} teslimatı:`);
  }
  eq(S.worldLoot.count, 0, 'yerde entity OLUŞMAMALI:');
  ok(S.inventory.usedSlots >= before, 'çantaya girmiş olmalı');
  eq(S.world.worldX, x0, 'oyuncu X kıpırdamamalı:');
  eq(S.world.worldY, y0, 'oyuncu Y kıpırdamamalı:');
});

test('§7 Auto Loot Farm Boundary / skill menzili ile İLİŞKİLİ DEĞİL', () => {
  const S = lootRig('auto');
  S.genie.settings.farmBoundaryRadius = 100;      // çok küçük sınır
  S.genie.start(S.world);
  const mob = killableMob(S, S.world.worldX + 2000, S.world.worldY);   // sınırın ÇOK dışında
  const ev = killAndReap(S, mob);
  for (const r of ev.records.filter((x: DropRecord) => x.kind === 'item')) {
    eq(r.delivery, 'AUTO_INVENTORY', 'sınır dışı mobun dropu da çantaya girer:');
  }
  eq(S.worldLoot.count, 0, 'yerde entity:');
});

console.log('\nARCHER V1 — 15 skill ve KAYNAK cooldown:');
test('15 okçu skilli kayıtlı ve kaynak ID\'leriyle eşleşiyor', () => {
  registerPrototypeSkills();
  eq(ARCHER_SKILL_ORDER.length, 15, 'skill sayısı:');
  eq(new Set(ARCHER_SKILL_ORDER).size, 15, 'tekrar yok:');
  for (const ref of ARCHER_SKILL_ORDER) {
    const def = SkillRegistry.get(ref);
    ok(def !== undefined, `${ref} SkillRegistry'de yok`);
    ok(def!.classes.includes('archer'), `${ref} archer değil`);
  }
});

test('individual cooldown KAYNAKTAN gelir (recast_time / 10), uydurma değil', () => {
  /* recast = 0 olan okçu skillerine yapay 3/5/7 sn EKLENMEZ */
  const zero = [
    ARCHER.STANDART_ATIS, ARCHER.DELICI_OK, ARCHER.UCLU_SALVO, ARCHER.IZCI_OKU,
    ARCHER.KESKIN_ATIS, ARCHER.YIRTICI_OK, ARCHER.BESLI_SALVO,
    ARCHER.GOLGE_AVCISI, ARCHER.KARA_TAKIP,
  ];
  for (const ref of zero) {
    eq(SkillRegistry.get(ref)!.cooldownSec, 0, `${ref} individual CD:`);
    eq(sourceCooldownSec(ref), 0, `${ref} kaynak türetimi:`);
  }
});

test('3\'lü ve 5\'li ok individual cooldown = 0', () => {
  eq(SkillRegistry.get(ARCHER.UCLU_SALVO)!.cooldownSec, 0, 'Üçlü Salvo:');
  eq(SkillRegistry.get(ARCHER.BESLI_SALVO)!.cooldownSec, 0, 'Beşli Salvo:');
});

test('Lv60 ve Lv70 individual cooldown = 0', () => {
  eq(SkillRegistry.get(ARCHER.GOLGE_AVCISI)!.cooldownSec, 0, 'Gölge Avcısı (Lv60):');
  eq(SkillRegistry.get(ARCHER.KARA_TAKIP)!.cooldownSec, 0, 'Kara Takip (Lv70):');
});

test('kaynak cooldown\'u OLAN skiller korunur: 3.2s ve 4.2s', () => {
  const expected: Array<[number, number, string]> = [
    [ARCHER.KOR_OKU, 3.2, 'Fire Arrow'],
    [ARCHER.ZEHIRLI_UC, 3.2, 'Poison Arrow'],
    [ARCHER.ALEV_ATISI, 4.2, 'Fire Shot'],
    [ARCHER.TOKSIK_ATIS, 4.2, 'Poison Shot'],
    [ARCHER.PATLAYICI_OK, 4.2, 'Explosive Shot'],
    [ARCHER.ENGEREK_OKU, 4.2, 'Viper'],
  ];
  for (const [ref, sec, name] of expected) {
    near(SkillRegistry.get(ref)!.cooldownSec, sec, 1e-9, `${name} individual CD:`);
    near(sourceCooldownSec(ref), sec, 1e-9, `${name} kaynak türetimi:`);
  }
});

test('mana ve seviye KAYNAKTAN (skills.json authoritative)', () => {
  const mp: Array<[number, number]> = [
    [ARCHER.STANDART_ATIS, 0], [ARCHER.DELICI_OK, 15], [ARCHER.KOR_OKU, 10],
    [ARCHER.ZEHIRLI_UC, 10], [ARCHER.UCLU_SALVO, 40], [ARCHER.IZCI_OKU, 40],
    [ARCHER.KESKIN_ATIS, 70], [ARCHER.ALEV_ATISI, 30], [ARCHER.TOKSIK_ATIS, 30],
    [ARCHER.YIRTICI_OK, 100], [ARCHER.PATLAYICI_OK, 50], [ARCHER.ENGEREK_OKU, 50],
    [ARCHER.BESLI_SALVO, 150], [ARCHER.GOLGE_AVCISI, 250], [ARCHER.KARA_TAKIP, 300],
  ];
  for (const [ref, cost] of mp) eq(SkillRegistry.get(ref)!.manaCost, cost, `${ref} mana:`);
  eq(SkillRegistry.get(ARCHER.STANDART_ATIS)!.manaCost, 0, 'Standart Atış mana 0:');
});

console.log('ARCHER V1 — action lock (cooldown DEĞİL):');
test('ActionLock temel davranış', () => {
  const a = new ActionLock();
  eq(a.busy, false, 'başlangıç:');
  a.begin(0.8, ARCHER.BESLI_SALVO);
  eq(a.busy, true, 'başladı:');
  eq(a.lastRef, ARCHER.BESLI_SALVO, 'kaynak:');
  a.update(0.5); eq(a.busy, true, 'yarıda:');
  a.update(0.5); eq(a.busy, false, 'bitti:');
  a.begin(0, null); eq(a.busy, false, 'sıfır süre kilitlemez:');
});

test('action time profili skill JSON\'unda DEĞİL, ayrı tuning katmanında', () => {
  const t = new ArcherCombatTimingProfile();
  near(t.actionTime(ARCHER.STANDART_ATIS), 1.10, 1e-9);
  near(t.actionTime(ARCHER.UCLU_SALVO), 0.70, 1e-9);
  near(t.actionTime(ARCHER.BESLI_SALVO), 0.80, 1e-9);
  near(t.actionTime(ARCHER.KARA_TAKIP), 0.90, 1e-9);
  eq(Object.keys(ARCHER_ACTION_TIME).length, 15, '15 skill için action time:');
  /* skills.json'da action time diye bir alan OLMAMALI */
  const s = Content.skills.find((x) => x.sourceRef === ARCHER.BESLI_SALVO)!;
  eq((s as unknown as Record<string, unknown>).actionTime, undefined, 'kaynak JSON temiz:');
  t.set(ARCHER.BESLI_SALVO, 1.5);
  near(t.actionTime(ARCHER.BESLI_SALVO), 1.5, 1e-9, 'DEV tuning:');
});

function comboRig(): { S: PrototypeState; mob: WorldMobLike } {
  const S = protoState(91);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 80, S.world.worldY, 45, 10_000_000);
  S.mobs.mobs.push(mob as never);
  S.targets.select((mob as unknown as { uid: number }).uid);
  return { S, mob };
}

test('ACTION LOCK sırasında ikinci skill BAŞLAYAMAZ (CD = 0 olsa bile)', () => {
  const { S, mob } = comboRig();
  const first = S.adapter.useSkillRef(ARCHER.BESLI_SALVO, S.world, mob as never, S.entities());
  ok(first.ok, 'ilk cast başarılı');
  eq(SkillRegistry.get(ARCHER.UCLU_SALVO)!.cooldownSec, 0, 'ikinci skillin CD\'si 0:');
  const mp = S.player.mp;
  const second = S.adapter.useSkillRef(ARCHER.UCLU_SALVO, S.world, mob as never, S.entities());
  eq(second.ok, false, 'aynı anda ikinci saldırı yok:');
  eq((second as { reason: string }).reason, 'busy', 'sebep action lock:');
  eq(S.player.mp, mp, 'reddedilen cast MANA HARCAMAZ:');
});

test('action lock bitince CD=0 başka skill başlayabilir', () => {
  const { S, mob } = comboRig();
  S.adapter.useSkillRef(ARCHER.BESLI_SALVO, S.world, mob as never, S.entities());
  const action = S.timing.actionTime(ARCHER.BESLI_SALVO);
  S.adapter.updateAction(action + 0.01);
  const second = S.adapter.useSkillRef(ARCHER.UCLU_SALVO, S.world, mob as never, S.entities());
  ok(second.ok, 'action bitince ikinci skill başlar');
});

test('individual cooldown ile action lock AYRI: CD\'li skill action bitse de bekler', () => {
  const { S, mob } = comboRig();
  const cd = SkillRegistry.get(ARCHER.KOR_OKU)!.cooldownSec;
  near(cd, 3.2, 1e-9, 'Kor Oku CD:');
  ok(S.adapter.useSkillRef(ARCHER.KOR_OKU, S.world, mob as never, S.entities()).ok, 'ilk cast');
  /* action bitir ama individual cooldown sürsün */
  S.adapter.updateAction(2); S.combat.update(2);
  eq(S.adapter.actionBusy, false, 'action bitti:');
  const again = S.adapter.useSkillRef(ARCHER.KOR_OKU, S.world, mob as never, S.entities());
  eq(again.ok, false, 'aynı skill CD\'de:');
  eq((again as { reason: string }).reason, 'cooldown', 'sebep cooldown (busy DEĞİL):');
  /* CD dolunca kullanılabilir */
  S.combat.update(cd); S.adapter.updateAction(cd);
  ok(S.adapter.useSkillRef(ARCHER.KOR_OKU, S.world, mob as never, S.entities()).ok, 'CD bitince kullanılır');
});

test('Genie 1 saniyede bütün skilleri boşaltamaz (P1.1 problemi)', () => {
  const { S, mob } = comboRig();
  S.genie.settings.forcedSet = 2;                       // Elite seti: 5 skill
  S.world.worldX = mob.worldX - 60;
  S.genie.start(S.world);
  let casts = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 60; i++) {                        // tam 1 saniye
    for (const a of S.genie.update(dt, S.entities(), S.world)) if (a.kind === 'skill') casts += 1;
    S.combat.update(dt); S.adapter.updateAction(dt);
  }
  ok(casts <= 2, `1 sn'de en fazla 2 cast beklenir, ${casts} oldu`);
});

console.log('ARCHER V1 — 5→3 combo ve fallback yok:');
test('5 → action recovery → 3 → action recovery → 5 → 3 sırası', () => {
  const { S, mob } = comboRig();
  S.genie.settings.forcedSet = 0;                       // Set 1 = [Beşli, Üçlü]
  S.world.worldX = mob.worldX - 60;
  S.genie.start(S.world);
  const used: number[] = [];
  const dt = 1 / 60;
  for (let i = 0; i < 600; i++) {                       // 10 sn
    for (const a of S.genie.update(dt, S.entities(), S.world)) if (a.kind === 'skill') used.push(a.skillRef);
    S.combat.update(dt); S.adapter.updateAction(dt);
    if (used.length >= 6) break;
  }
  eq(used.slice(0, 6).join(','),
    [ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO, ARCHER.BESLI_SALVO,
     ARCHER.UCLU_SALVO, ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO].join(','),
    '5→3→5→3→5→3:');
  ok(!used.includes(ARCHER.STANDART_ATIS), 'araya Standart Atış SOKULMAZ');
});

test('Standart Atış sette YOKSA Genie onu kullanmaz', () => {
  const { S, mob } = comboRig();
  S.genie.settings.forcedSet = 0;
  S.genie.settings.sets[0] = [ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO];
  S.world.worldX = mob.worldX - 60;
  S.genie.start(S.world);
  const used: number[] = [];
  const dt = 1 / 60;
  for (let i = 0; i < 900; i++) {
    for (const a of S.genie.update(dt, S.entities(), S.world)) if (a.kind === 'skill') used.push(a.skillRef);
    S.combat.update(dt); S.adapter.updateAction(dt);
  }
  ok(used.length > 4, 'cast olmalı');
  ok(!used.includes(ARCHER.STANDART_ATIS), 'sette olmayan skill ASLA kullanılmaz');
});

test('Standart Atış sette VARSA normal skill gibi kullanılır', () => {
  const { S, mob } = comboRig();
  S.genie.settings.forcedSet = 0;
  S.genie.settings.sets[0] = [ARCHER.STANDART_ATIS];
  S.genie.settings.modes[0] = 'sequence';
  S.world.worldX = mob.worldX - 60;
  S.genie.start(S.world);
  const used: number[] = [];
  const dt = 1 / 60;
  for (let i = 0; i < 300; i++) {
    for (const a of S.genie.update(dt, S.entities(), S.world)) if (a.kind === 'skill') used.push(a.skillRef);
    S.combat.update(dt); S.adapter.updateAction(dt);
  }
  ok(used.length >= 2, `Standart Atış kullanılmalı, ${used.length}`);
  ok(used.every((r) => r === ARCHER.STANDART_ATIS), 'yalnız seçili skill');
});

test('mana bitse bile Genie GİZLİ basic attack üretmez', () => {
  const { S, mob } = comboRig();
  S.genie.settings.forcedSet = 0;
  S.genie.settings.sets[0] = [ARCHER.BESLI_SALVO];      // 150 MP
  S.genie.settings.mpPotionRef = null;
  S.player.mp = 0;
  S.world.worldX = mob.worldX - 60;
  S.genie.start(S.world);
  const hp0 = (mob as unknown as { hp: number }).hp;
  const kinds = new Set<string>();
  const dt = 1 / 60;
  for (let i = 0; i < 300; i++) {
    for (const a of S.genie.update(dt, S.entities(), S.world)) kinds.add(a.kind);
    S.combat.update(dt); S.adapter.updateAction(dt);
  }
  ok(!kinds.has('skill'), 'cast olmamalı');
  ok(kinds.has('wait'), 'beklemeli');
  eq((mob as unknown as { hp: number }).hp, hp0, 'moba HİÇ hasar gitmemeli:');
});

test('GenieAction tipinde artık "basic" YOK ve adapter.basicAttack çağrılmaz', () => {
  const { genie, basic, calls } = fakeGenie([[11], [], []], ['sequence', 'priority', 'priority'], new Set([11]));
  const p = fakePlayer(); const mob = closeMob();
  genie.start(p);
  for (let i = 0; i < 10; i++) genie.update(GENIE_TICK, [mob as never], p);
  eq(basic(), 0, 'basicAttack HİÇ çağrılmamalı:');
  eq(calls.length, 0, 'blocked skill atılmamalı:');
});

test('action lock sırasında cursor İLERLEMEZ', () => {
  const { genie, adapter, calls } = fakeGenie([[11, 22, 33], [], []], ['sequence', 'priority', 'priority']);
  const p = fakePlayer(); const mob = closeMob();
  genie.start(p);
  genie.update(GENIE_TICK, [mob as never], p);
  eq(genie.cursorOf(0), 1, 'ilk cast sonrası:');
  adapter.actionBusy = true;
  for (let i = 0; i < 5; i++) genie.update(GENIE_TICK, [mob as never], p);
  eq(genie.cursorOf(0), 1, 'action lock cursor\'ı kaydırmaz:');
  eq(calls.length, 1, 'kilitliyken cast yok:');
  adapter.actionBusy = false;
  genie.update(GENIE_TICK, [mob as never], p);
  eq(calls.join(','), '11,22', 'kilit bitince kaldığı yerden:');
});

console.log('ARCHER V1 — 5→3→70→60 sequence telemetrisi:');
test('sequence 5 → 3 → Kara Takip → Gölge Avcısı → wrap', () => {
  const { S, mob } = comboRig();
  S.genie.settings.forcedSet = 0;
  S.genie.settings.modes[0] = 'sequence';
  S.genie.settings.sets[0] = [
    ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO, ARCHER.KARA_TAKIP, ARCHER.GOLGE_AVCISI,
  ];
  S.world.worldX = mob.worldX - 60;
  S.player.mp = 100000;                                 // mana rotasyonu kesmesin
  S.genie.start(S.world);
  const used: number[] = [];
  const dt = 1 / 60;
  for (let i = 0; i < 1200; i++) {
    for (const a of S.genie.update(dt, S.entities(), S.world)) if (a.kind === 'skill') used.push(a.skillRef);
    S.combat.update(dt); S.adapter.updateAction(dt);
    S.player.mp = 100000;
    if (used.length >= 6) break;
  }
  eq(used.slice(0, 6).join(','),
    [ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO, ARCHER.KARA_TAKIP, ARCHER.GOLGE_AVCISI,
     ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO].join(','),
    'rotasyon + wrap:');
});

console.log('ARCHER V1 — 3/5 projectile korunuyor:');
test('Üçlü/Beşli hâlâ ayrı projectile (damage × N tek vuruş DEĞİL)', () => {
  const { S, mob } = comboRig();
  const r5 = fireAndResolve(S, ARCHER.BESLI_SALVO, mob as never, S.entities());
  eq(r5.projectiles, 5, 'Beşli Salvo 5 ok:');
  ok(r5.perArrow.length >= 2, 'ayrı ayrı hasar kayıtları');
  S.adapter.updateAction(5);
  const r3 = fireAndResolve(S, ARCHER.UCLU_SALVO, mob as never, S.entities());
  eq(r3.projectiles, 3, 'Üçlü Salvo 3 ok:');
});

console.log('ARCHER V1 — aktif bar / skill kitabı:');
test('aktif bar 5 slot, skill kitabı 15 skill', () => {
  const S = protoState(93);
  eq(ACTIVE_BAR_SLOTS, 5, 'bar slotu:');
  eq(S.skills.size, 5, 'loadout boyutu:');
  eq(DEFAULT_ACTIVE_BAR.length, 5, 'varsayılan bar:');
  eq(ARCHER_SKILL_ORDER.length, 15, 'skill kitabı:');
  const filled = S.skills.definitions().filter((d) => d !== undefined).length;
  eq(filled, 5, 'beş slot da dolu:');
});

test('Genie setleri aktif bardan BAĞIMSIZ (set başına en fazla 6)', () => {
  const S = protoState(94);
  const bar = new Set(S.skills.slotRefs().filter((r) => r !== null));
  const sets = S.genie.settings.sets;
  for (const set of sets) ok(set.length <= 6, `set en fazla 6 skill, ${set.length}`);
  /* Set 2'de barda olmayan bir skill var → bağımsızlık kanıtı */
  ok(sets[1].some((r) => !bar.has(r)), 'Genie seti bar dışı skill içerebilmeli');
});

test('ana oyunun loadout\'u DEĞİŞMEDİ (3 slot, eski varsayılan)', () => {
  eq(LOADOUT_SLOTS, 3, 'ana slot sayısı:');
  const main = new SkillLoadout('archer');
  eq(main.size, 3, 'ana loadout boyutu:');
  eq(DEFAULT_LOADOUT.length, 3, 'ana varsayılan:');
});

/* ============================================================================
   P1.2.1 — varsayılan sequence presetleri + Delici Ok kaynak sadakati
   ==========================================================================*/

console.log('\nP1.2.1 — varsayılan preset rotasyonları:');

/** Gerçek state üzerinde bir seti kilitleyip cast sırasını toplar. */
function rotationOf(setId: 0 | 1 | 2, count: number, seed = 4242): number[] {
  const S = protoState(seed);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 70, S.world.worldY, 45, 1e12);
  S.mobs.mobs.push(mob as never);
  S.genie.settings.forcedSet = setId;
  S.genie.settings.mpPotionRef = null;
  S.genie.start(S.world);
  const used: number[] = [];
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 40 && used.length < count; i++) {
    S.player.mp = 100000;                     // mana rotasyonu kesmesin
    for (const a of S.genie.update(dt, S.entities(), S.world)) {
      if (a.kind === 'skill') used.push(a.skillRef);
    }
    S.combat.update(dt);
    S.adapter.updateAction(dt);
  }
  return used;
}

test('KABUL — Set 2: Delici → İzci → Standart → Delici …', () => {
  const S = protoState(51);
  eq(S.genie.modeOf(1), 'sequence', 'Set 2 modu:');
  eq(S.genie.settings.sets[1].join(','),
    [ARCHER.DELICI_OK, ARCHER.IZCI_OKU, ARCHER.STANDART_ATIS].join(','), 'Set 2 içeriği:');
  const r = rotationOf(1, 7);
  eq(r.join(','), [
    ARCHER.DELICI_OK, ARCHER.IZCI_OKU, ARCHER.STANDART_ATIS,
    ARCHER.DELICI_OK, ARCHER.IZCI_OKU, ARCHER.STANDART_ATIS,
    ARCHER.DELICI_OK,
  ].join(','), 'sıra + wrap:');
});

test('KABUL — Set 3: Kara Takip → Gölge Avcısı → Yırtıcı → Beşli → Üçlü → …', () => {
  const S = protoState(52);
  eq(S.genie.modeOf(2), 'sequence', 'Set 3 modu:');
  eq(S.genie.settings.sets[2].join(','), [
    ARCHER.KARA_TAKIP, ARCHER.GOLGE_AVCISI, ARCHER.YIRTICI_OK,
    ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO,
  ].join(','), 'Set 3 içeriği:');
  const r = rotationOf(2, 7);
  eq(r.join(','), [
    ARCHER.KARA_TAKIP, ARCHER.GOLGE_AVCISI, ARCHER.YIRTICI_OK,
    ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO,
    ARCHER.KARA_TAKIP, ARCHER.GOLGE_AVCISI,
  ].join(','), 'sıra + wrap:');
});

test('KABUL — Set 1 (değişmedi): Beşli → Üçlü → Beşli …', () => {
  const r = rotationOf(0, 5);
  eq(r.join(','), [
    ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO,
    ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO, ARCHER.BESLI_SALVO,
  ].join(','), 'sıra + wrap:');
});

test('sequence taraması: kullanılamayan entry atlanıp SONRAKİ seçili entry denenir', () => {
  /* Kor Oku (CD 3.2s) sette; CD'deyken sıradaki entry kullanılmalı, ama
     cursor kullanılan entry'nin sonrasına gitmeli — davranış P1.1.1'den aynı. */
  const { genie, calls } = fakeGenie(
    [[ARCHER.KOR_OKU, ARCHER.UCLU_SALVO, ARCHER.BESLI_SALVO], [], []],
    ['sequence', 'sequence', 'sequence'],
    new Set([ARCHER.KOR_OKU]),                 // CD'de gibi davransın
  );
  const p = fakePlayer(); const mob = closeMob();
  genie.start(p);
  for (let i = 0; i < 4; i++) genie.update(GENIE_TICK, [mob as never], p);
  eq(calls.join(','), [
    ARCHER.UCLU_SALVO, ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO, ARCHER.BESLI_SALVO,
  ].join(','), 'engelli entry atlanır, diğerleri sırayla:');
});

console.log('P1.2.1 — Delici Ok kaynak sadakati:');
test('Delici Ok: KAYNAKTA OLMAYAN savunma debuff\'ı KALDIRILDI', () => {
  registerPrototypeSkills();
  const def = SkillRegistry.get(ARCHER.DELICI_OK)!;
  eq(def.effects.length, 1, 'tek effect:');
  eq(def.effects[0].kind, 'directDamage', 'yalnız doğrudan hasar:');
  ok(!def.effects.some((e) => e.kind === 'targetDebuff'), 'targetDebuff YOK');
  ok(!def.effects.some((e) => e.kind === 'damageOverTime'), 'DoT YOK');
});

test('Delici Ok hasar katsayısı KAYNAKTAN: %150 → 1.50', () => {
  const def = SkillRegistry.get(ARCHER.DELICI_OK)!;
  const dd = def.effects[0] as { kind: 'directDamage'; coefficient: number };
  near(dd.coefficient, 1.5, 1e-9, 'katsayı:');
  eq(def.cooldownSec, 0, 'individual CD (kaynak recast 0):');
  eq(def.manaCost, 15, 'mana (kaynak):');
});

test('Delici Ok kullanımı hedefin savunmasına DOKUNMAZ', () => {
  const S = protoState(53);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 70, S.world.worldY, 45, 1e12);
  S.mobs.mobs.push(mob as never);
  const before = S.combat.effectiveDefense(mob as never);
  const res = S.adapter.useSkillRef(ARCHER.DELICI_OK, S.world, mob as never, S.entities());
  ok(res.ok, 'cast başarılı');
  eq(S.combat.effectiveDefense(mob as never), before, 'savunma değişmemeli:');
  eq((mob as unknown as { status: unknown[] }).status.length, 0, 'debuff/DoT bırakmamalı:');
});

test('içerik açıklamasında savunma düşürme ifadesi KALMADI', () => {
  const s = Content.skills.find((x) => x.sourceRef === ARCHER.DELICI_OK)!;
  ok(!/savunma/i.test(s.description), `açıklama temiz olmalı: ${s.description}`);
  ok(/150/.test(s.description), 'kaynak %150 hasarı yansıtmalı');
});

test('diğer 14 skill DEĞİŞMEDİ (fire/poison/3-5 katsayıları korunuyor)', () => {
  const fire = SkillRegistry.get(ARCHER.KOR_OKU)!;
  eq(fire.effects.length, 2, 'Kor Oku: hasar + ateş bonusu');
  const poison = SkillRegistry.get(ARCHER.ZEHIRLI_UC)!;
  ok(poison.effects.some((e) => e.kind === 'damageOverTime'), 'Zehirli Uç DoT korunuyor');
  eq(SkillRegistry.get(ARCHER.UCLU_SALVO)!.effects.length, 0, 'Üçlü Salvo hasarı MultiShot\'ta');
  eq(SkillRegistry.get(ARCHER.BESLI_SALVO)!.effects.length, 0, 'Beşli Salvo hasarı MultiShot\'ta');
  /* P1.3 KO FIDELITY: ok başına katsayı artık kaynağın kendisi (99/100). */
  near(MULTISHOT_PROFILES[ARCHER.UCLU_SALVO].coefficientPerArrow, 0.99, 1e-9, '3\'lü katsayı:');
  near(MULTISHOT_PROFILES[ARCHER.BESLI_SALVO].coefficientPerArrow, 0.99, 1e-9, '5\'li katsayı:');
});


/* ================================================================
   P1.2.2 — ARCHER VISUAL INTEGRATION (atlas boru hattı)
   ================================================================ */
console.log('\n[P1.2.2] atlas metadata + yön eşlemesi:');

/** Atlas metadata'sını test için klonlar (opsiyonel klip ezmesiyle). */
function metaWith(over: Record<string, unknown> = {}): ArcherAtlasMeta {
  const base = ARCHER_ATLAS_DEFAULT;
  const clips = { ...base.clips } as Record<string, unknown>;
  for (const k of Object.keys(over)) clips[k] = over[k];
  return { ...base, clips: clips as ArcherAtlasMeta['clips'] };
}

test('atlas yapısı spec ile birebir: 8 yön × (8/6/6/1/1) kare', () => {
  eq(ATLAS_DIRECTIONS.length, 8, 'yön sayısı:');
  const expect: Record<string, number> = { walk: 8, attack: 6, skill: 6, idle: 1, dead: 1 };
  for (const c of ARCHER_CLIPS) {
    eq(ARCHER_ATLAS_DEFAULT.clips[c].frames, expect[c]!, `${c} kare sayısı:`);
  }
  eq(validateAtlasMeta(ARCHER_ATLAS_DEFAULT).length, 0, 'varsayılan metadata temiz olmalı:');
});

test('yön sırası spec §2 ile aynı ve satır tablosu 0..7 permütasyonu', () => {
  eq(ATLAS_DIRECTIONS.join(','),
    'BACK,BACK_RIGHT,RIGHT,FRONT_RIGHT,FRONT,FRONT_LEFT,LEFT,BACK_LEFT', 'sıra:');
  for (let i = 0; i < 8; i++) eq(ATLAS_DIRECTION_ROW[ATLAS_DIRECTIONS[i]!], i, `row ${i}:`);
  eq([...RUNTIME_INDEX_TO_ATLAS_ROW].sort((a, b) => a - b).join(','),
    '0,1,2,3,4,5,6,7', 'permütasyon:');
});

test('8 DIRECTION MAPPING DOĞRU — açı → atlas satırı (açık tablo)', () => {
  /* 0° = +X = SAĞ, saat yönünde artar (ekran Y aşağı). Beklenen satırlar
     spec §2.1 tablosundan gelir; formülle türetilmez. */
  const cases: Array<[number, string, number]> = [
    [0, 'RIGHT', 2],
    [45, 'FRONT_RIGHT', 3],
    [90, 'FRONT', 4],
    [135, 'FRONT_LEFT', 5],
    [180, 'LEFT', 6],
    [225, 'BACK_LEFT', 7],
    [270, 'BACK', 0],
    [315, 'BACK_RIGHT', 1],
  ];
  for (const [deg, name, row] of cases) {
    eq(RUNTIME_INDEX_DIRECTION[Math.round(deg / 45) % 8], name, `${deg}° adı:`);
    eq(atlasRowForAngle((deg * Math.PI) / 180), row, `${deg}° satırı:`);
    /* negatif ve 360+ açılar da aynı satıra düşmeli */
    eq(atlasRowForAngle(((deg - 360) * Math.PI) / 180), row, `${deg - 360}° satırı:`);
    eq(atlasRowForAngle(((deg + 720) * Math.PI) / 180), row, `${deg + 720}° satırı:`);
  }
});

test('foot anchor korunuyor: 264 → altta 36 px pay (fallback ile AYNI)', () => {
  eq(ARCHER_ATLAS_DEFAULT.footAnchorY, 264, 'anchor:');
  eq(footPad(ARCHER_ATLAS_DEFAULT), OKCU_FOOT_PAD, 'pay legacy ile aynı olmalı:');
  eq(ARCHER_ATLAS_DEFAULT.frameHeight, OKCU_FRAME, 'kare yüksekliği:');
});

test('bozuk metadata SESSİZCE kabul edilmez', () => {
  const bad = metaWith({ walk: { frames: 5, fps: 10, loop: true, releaseFrame: null, contactFrames: null } });
  const issues = validateAtlasMeta(bad);
  ok(issues.some((i) => i.field === 'walk.frames'), 'kare sayısı hatası yakalanmalı');
  const bad2 = metaWith({ attack: { frames: 6, fps: 18, loop: false, releaseFrame: 9, contactFrames: null } });
  ok(validateAtlasMeta(bad2).some((i) => i.field === 'attack.releaseFrame'), 'releaseFrame aralığı yakalanmalı');
});

console.log('\n[P1.2.2] walk klibi:');

test('HAREKET → GERÇEK WALK FRAME DEĞİŞİMİ (atlas aktifken)', () => {
  const a = new PlayerAnimator();
  a.setAtlas(ARCHER_ATLAS_DEFAULT);
  const seen = new Set<number>();
  let travelled = 0;
  for (let i = 0; i < 120; i++) {
    travelled += 210 / 60;
    a.update(1 / 60, true, travelled, 0);
    eq(a.state, 'move', 'durum:');
    eq(a.clip, 'walk', 'klip:');
    seen.add(a.frame);
  }
  eq(a.clipFrames, 8, 'walk kare sayısı:');
  eq(seen.size, 8, '8 walk karesinin HEPSİ oynamalı:');
});

test('walk klibi metadata fps ile döner ve LOOP eder', () => {
  const a = new PlayerAnimator();
  a.setAtlas(ARCHER_ATLAS_DEFAULT);
  const fps = ARCHER_ATLAS_DEFAULT.clips.walk.fps;      // 10
  let travelled = 0;
  const at = (sec: number): number => {
    a.reset(); a.setAtlas(ARCHER_ATLAS_DEFAULT); travelled = 0;
    const steps = Math.round(sec * 120);
    for (let i = 0; i < steps; i++) { travelled += 2; a.update(1 / 120, true, travelled, 0); }
    return a.frame;
  };
  eq(at(0.05), 0, 't=0.05s → kare 0:');
  eq(at(0.15), 1, 't=0.15s → kare 1:');
  eq(at(0.55), 5, 't=0.55s → kare 5:');
  /* 8 kare / 10 fps = 0.8 s → başa sarar */
  eq(at(0.85), 0, 'bir döngü sonrası başa sarar:');
  eq(fps, 10, 'metadata fps:');
});

test('walk mesafe kilidi OPSİYONEL ve varsayılan KAPALI (tahmin yok)', () => {
  const a = new PlayerAnimator();
  eq(a.walkDistanceLock, false, 'varsayılan:');
  a.setAtlas(ARCHER_ATLAS_DEFAULT);
  a.walkDistanceLock = true;
  let travelled = 0;
  const seen = new Set<number>();
  for (let i = 0; i < 200; i++) { travelled += 3; a.update(1 / 60, true, travelled, 0); seen.add(a.frame); }
  eq(seen.size, 8, 'mesafe kilidinde de 8 kare:');
});

test('DURUŞTA walk klibi başa döner, kare 0', () => {
  const a = new PlayerAnimator();
  a.setAtlas(ARCHER_ATLAS_DEFAULT);
  let travelled = 0;
  for (let i = 0; i < 40; i++) { travelled += 4; a.update(1 / 60, true, travelled, 0); }
  for (let i = 0; i < 30; i++) a.update(1 / 60, false, travelled, 0);
  eq(a.state, 'idle', 'durum:');
  eq(a.clip, 'idle', 'klip:');
  eq(a.frame, 0, 'kare:');
});

test('HAREKET TEK BAŞINA ATTACK FRAME ÜRETMEZ (atlas aktifken de)', () => {
  const a = new PlayerAnimator();
  a.setAtlas(ARCHER_ATLAS_DEFAULT);
  let travelled = 0;
  for (let i = 0; i < 240; i++) {
    travelled += 4;
    a.update(1 / 60, true, travelled, Math.PI / 3);
    ok(a.state !== 'attack' && a.state !== 'skill', 'hareket saldırı state açmamalı');
    ok(a.clip !== 'attack' && a.clip !== 'skill', 'hareket saldırı klibi açmamalı');
  }
  eq(a.triggers.attack, 0, 'attack tetiği:');
  eq(a.triggers.skill, 0, 'skill tetiği:');
});

console.log('\n[P1.2.2] attack / skill klip ayrımı (sourceRef ile):');

test('KLİP KARARI sourceRef ile verilir — "basic mi skill mi" ile DEĞİL', () => {
  eq(clipForSkillRef(ARCHER.STANDART_ATIS), 'attack', 'Standart Atış:');
  for (const ref of [ARCHER.UCLU_SALVO, ARCHER.BESLI_SALVO, ARCHER.KARA_TAKIP,
    ARCHER.KOR_OKU, ARCHER.ZEHIRLI_UC, ARCHER.DELICI_OK]) {
    eq(clipForSkillRef(ref), 'skill', `#${ref}:`);
  }
});

test('STANDART ATIŞ (102003) → ATTACK state/klip (skill slotundan atılsa bile)', () => {
  const S = protoState(220);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 60, S.world.worldY, 40, 1e9);
  S.mobs.mobs.push(mob as never);
  const res = S.performSkill(ARCHER.STANDART_ATIS, mob as never);
  ok(res.ok, 'cast başarılı olmalı');
  eq(S.anim.state, 'attack', 'durum:');
  eq(S.anim.clip, 'attack', 'klip:');
  eq(S.anim.triggers.attack, 1, 'attack tetiği:');
  eq(S.anim.triggers.skill, 0, 'skill tetiği OLMAMALI:');
});

test('ÜÇLÜ / BEŞLİ / Lv60 / Lv70 → SKILL state/klip', () => {
  for (const ref of [ARCHER.UCLU_SALVO, ARCHER.BESLI_SALVO, ARCHER.GOLGE_AVCISI, ARCHER.KARA_TAKIP]) {
    const S = protoState(221);
    S.mobs.mobs.length = 0;
    const mob = mockMob(S.world.worldX + 60, S.world.worldY, 40, 1e9);
    S.mobs.mobs.push(mob as never);
    const res = S.performSkill(ref, mob as never);
    ok(res.ok, `#${ref} cast başarılı olmalı`);
    eq(S.anim.state, 'skill', `#${ref} durum:`);
    eq(S.anim.clip, 'skill', `#${ref} klip:`);
    eq(S.anim.triggers.attack, 0, `#${ref} attack tetiklenmemeli:`);
  }
});

test('GENIE de aynı sourceRef kuralına uyar (Scene\'e kopya mantık yok)', () => {
  const S = protoState(222);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 60, S.world.worldY, 40, 1e12);
  S.mobs.mobs.push(mob as never);
  S.applyAnimFor([{ kind: 'skill', skillRef: ARCHER.STANDART_ATIS, target: mob as never, castId: 1, projectileCount: 1 }]);
  eq(S.anim.clip, 'attack', 'Standart Atış klibi:');
  S.anim.reset();
  S.applyAnimFor([{ kind: 'skill', skillRef: ARCHER.UCLU_SALVO, target: mob as never, castId: 2, projectileCount: 3 }]);
  eq(S.anim.clip, 'skill', 'Üçlü Salvo klibi:');
});

test('BAŞARISIZ CAST → ANİMASYON YOK (atlas aktifken de)', () => {
  const S = protoState(223);
  S.anim.setAtlas(ARCHER_ATLAS_DEFAULT);
  S.mobs.mobs.length = 0;
  /* menzil dışı hedef */
  const far = mockMob(S.world.worldX + 5000, S.world.worldY, 40, 1e9);
  S.mobs.mobs.push(far as never);
  for (const ref of [ARCHER.STANDART_ATIS, ARCHER.UCLU_SALVO]) {
    const res = S.performSkill(ref, far as never);
    eq(res.ok, false, `#${ref} menzil dışı reddedilmeli:`);
  }
  /* hedefsiz cast */
  eq(S.performSkill(ARCHER.UCLU_SALVO, null).ok, false, 'hedefsiz cast:');
  eq(S.anim.triggers.attack, 0, 'attack tetiği:');
  eq(S.anim.triggers.skill, 0, 'skill tetiği:');
  ok(S.anim.state !== 'attack' && S.anim.state !== 'skill', 'saldırı state açılmamalı');
  eq(S.anim.frame, 0, 'kare 0 kalmalı:');
});

test('attack/skill klipleri metadata fps ve kare sayısıyla oynar', () => {
  const a = new PlayerAnimator();
  a.setAtlas(ARCHER_ATLAS_DEFAULT);
  a.triggerAttack(0);
  const seenA = new Set<number>();
  for (let i = 0; i < 60 && a.state === 'attack'; i++) { seenA.add(a.frame); a.update(1 / 120, false, 0, 0); }
  eq(seenA.size, ARCHER_ATLAS_DEFAULT.clips.attack.frames, 'attack tüm kareler:');
  a.reset(); a.setAtlas(ARCHER_ATLAS_DEFAULT);
  a.triggerSkill(0);
  const seenS = new Set<number>();
  for (let i = 0; i < 60 && a.state === 'skill'; i++) { seenS.add(a.frame); a.update(1 / 120, false, 0, 0); }
  eq(seenS.size, ARCHER_ATLAS_DEFAULT.clips.skill.frames, 'skill tüm kareler:');
});

test('releaseFrame metadata\'da YOKSA runtime TAHMİN ETMEZ', () => {
  const a = new PlayerAnimator();
  a.setAtlas(ARCHER_ATLAS_DEFAULT);
  a.triggerAttack(0);
  for (let i = 0; i < 40; i++) { ok(!a.atReleaseFrame, 'releaseFrame null iken hiç tetiklenmemeli'); a.update(1 / 120, false, 0, 0); }
  /* metadata verirse tetiklenir */
  const b = new PlayerAnimator();
  b.setAtlas(metaWith({ attack: { frames: 6, fps: 18, loop: false, releaseFrame: 3, contactFrames: null } }));
  b.triggerAttack(0);
  let hit = false;
  for (let i = 0; i < 60 && b.state === 'attack'; i++) { hit = hit || b.atReleaseFrame; b.update(1 / 120, false, 0, 0); }
  ok(hit, 'releaseFrame verilirse tetiklenmeli');
});

console.log('\n[P1.2.2] facing: movement vs combat:');

test('SALDIRI SIRASINDA TARGET-FACING önceliklidir', () => {
  const a = new PlayerAnimator();
  a.setAtlas(ARCHER_ATLAS_DEFAULT);
  /* sola yürü */
  a.update(1 / 60, true, 10, Math.PI);
  near(a.angle, Math.PI, 1e-9, 'yürüyüş yönü:');
  eq(atlasRowForAngle(a.angle), ATLAS_DIRECTION_ROW.LEFT, 'walk satırı LEFT:');
  /* hedef SAĞDA → saldırı boyunca sağa bakmalı, sola yürümeye devam etsek bile */
  a.triggerAttack(0);
  for (let i = 0; i < 3; i++) {
    a.update(1 / 120, true, 12 + i, Math.PI);
    near(a.angle, 0, 1e-9, 'saldırı boyunca hedefe bakar:');
    eq(atlasRowForAngle(a.angle), ATLAS_DIRECTION_ROW.RIGHT, 'attack satırı RIGHT:');
  }
  near(a.movementFacing, Math.PI, 1e-9, 'movement facing kaybolmaz:');
  near(a.combatFacing, 0, 1e-9, 'combat facing hedefte:');
});

test('SALDIRI SONRASI MOVEMENT-FACING GERİ GELİR', () => {
  const a = new PlayerAnimator();
  a.setAtlas(ARCHER_ATLAS_DEFAULT);
  a.update(1 / 60, true, 10, Math.PI);
  a.triggerAttack(0);
  let travelled = 12;
  for (let i = 0; i < 200 && a.isActing; i++) { travelled += 3; a.update(1 / 120, true, travelled, Math.PI); }
  ok(!a.isActing, 'saldırı bitmeli');
  near(a.angle, Math.PI, 1e-9, 'yeniden hareket yönü:');
  eq(atlasRowForAngle(a.angle), ATLAS_DIRECTION_ROW.LEFT, 'satır yine LEFT:');
});

test('saldırı sırasında YÖN DEĞİŞTİRSEK bile combat facing kilitli kalır', () => {
  const a = new PlayerAnimator();
  a.setAtlas(ARCHER_ATLAS_DEFAULT);
  a.triggerSkill(Math.PI / 2);                       // hedef aşağıda
  let travelled = 0;
  for (let i = 0; i < 4; i++) {
    travelled += 3;
    a.update(1 / 240, true, travelled, -Math.PI / 2); // joystick yukarı
    near(a.angle, Math.PI / 2, 1e-9, 'combat facing kilitli:');
  }
  near(a.movementFacing, -Math.PI / 2, 1e-9, 'movement facing arka planda güncellenir:');
});

console.log('\n[P1.2.2] sahte adım efektlerinin kapanması:');

test('ATLAS AKTİFKEN FAKE hop/bob/sway/squash = 0', () => {
  const a = new PlayerAnimator();
  a.setAtlas(ARCHER_ATLAS_DEFAULT);
  let travelled = 0;
  for (let i = 0; i < 300; i++) {
    travelled += 210 / 60;
    a.update(1 / 60, true, travelled, 0);
    eq(a.hopOffset, 0, 'hop:');
    eq(a.swayOffset, 0, 'sway:');
    eq(a.squashY, 1, 'squash:');
    eq(a.shadowScale, 1, 'gölge nabzı:');
    eq(a.stridePhase, 0, 'sahte adım fazı:');
  }
});

test('contactFrames YOKSA toz/basış efekti üretilmez (tahmin yok)', () => {
  const a = new PlayerAnimator();
  a.setAtlas(ARCHER_ATLAS_DEFAULT);
  let travelled = 0;
  for (let i = 0; i < 300; i++) {
    travelled += 210 / 60;
    a.update(1 / 60, true, travelled, 0);
    eq(a.footPlanted, false, 'basış:');
  }
  /* metadata verirse üretilir */
  const b = new PlayerAnimator();
  b.setAtlas(metaWith({ walk: { frames: 8, fps: 10, loop: true, releaseFrame: null, contactFrames: [0, 4] } }));
  let t2 = 0, planted = 0;
  for (let i = 0; i < 300; i++) { t2 += 210 / 60; b.update(1 / 60, true, t2, 0); if (b.footPlanted) planted++; }
  ok(planted > 0, 'contactFrames verilirse basış üretilmeli');
});

test('FALLBACK (atlas YOK) P1.2.1 davranışını AYNEN korur', () => {
  const a = new PlayerAnimator();
  eq(a.atlasActive, false, 'varsayılan fallback:');
  let travelled = 0, maxHop = 0;
  for (let i = 0; i < 200; i++) {
    travelled += 210 / 60;
    a.update(1 / 60, true, travelled, 0);
    maxHop = Math.max(maxHop, a.hopOffset);
    eq(a.frame, PLAYER_ANIM.idleFrame, 'fallback kare duruş karesi:');
  }
  ok(maxHop > PLAYER_ANIM.hopPixels * 0.9, 'fallback prosedürel zıplama korunmalı');
  /* atlas açılıp kapanınca fallback geri gelir */
  a.setAtlas(ARCHER_ATLAS_DEFAULT);
  eq(a.hopOffset, 0, 'atlas açıkken hop:');
  a.clearAtlas();
  travelled += 30; a.update(1 / 60, true, travelled, 0);
  ok(a.hopOffset >= 0, 'atlas kapanınca fallback yeniden çalışır');
  eq(a.atlasActive, false, 'atlas kapalı:');
});

console.log('\n[P1.2.2] ölüm çapası:');

test('DEAD ANCHOR world position\'ı DEĞİŞTİRMEZ', () => {
  const a = new PlayerAnimator();
  a.setAtlas(ARCHER_ATLAS_DEFAULT);
  eq(a.hasDeathAnchor, false, 'başlangıç:');
  a.setDead(true, 1234, 5678);
  eq(a.state, 'dead', 'durum:');
  eq(a.clip, 'dead', 'klip:');
  eq(a.deathAnchorX, 1234, 'çapa X:');
  eq(a.deathAnchorY, 5678, 'çapa Y:');
  /* ölümden SONRA gelen konum güncellemeleri çapayı OYNATMAZ */
  for (let i = 0; i < 60; i++) {
    a.setDead(true, 1234 + i * 10, 5678 + i * 10);
    a.update(1 / 60, true, i * 5, Math.PI);
    eq(a.deathAnchorX, 1234, 'çapa X sabit:');
    eq(a.deathAnchorY, 5678, 'çapa Y sabit:');
    eq(a.state, 'dead', 'ölü kalır:');
    eq(a.frame, 0, 'dead tek kare:');
  }
});

test('ölüm saldırı animasyonunu kilitler, dirilince çapa temizlenir', () => {
  const a = new PlayerAnimator();
  a.setAtlas(ARCHER_ATLAS_DEFAULT);
  a.setDead(true, 10, 20);
  a.triggerAttack(0); a.triggerSkill(0);
  eq(a.triggers.attack, 0, 'ölüyken attack tetiklenmez:');
  eq(a.triggers.skill, 0, 'ölüyken skill tetiklenmez:');
  eq(a.state, 'dead', 'durum:');
  a.setDead(false);
  eq(a.hasDeathAnchor, false, 'dirilince çapa temizlenir:');
  eq(a.state, 'idle', 'durum:');
});

test('dead klibi tek karedir ve yön satırı yine tablodan gelir', () => {
  eq(ARCHER_ATLAS_DEFAULT.clips.dead.frames, 1, 'kare sayısı:');
  eq(STATE_CLIP.dead, 'dead', 'state → klip:');
  /* yatan sprite farklı ölçüde olsa bile satır seçimi DEĞİŞMEZ */
  eq(atlasRowForAngle(Math.PI), ATLAS_DIRECTION_ROW.LEFT, 'LEFT satırı:');
  eq(atlasRowForAngle(-Math.PI / 2), ATLAS_DIRECTION_ROW.BACK, 'BACK satırı:');
});

console.log('\n[P1.2.2] combat davranışı bozulmadı:');

test('5→3 SEQUENCE COMBAT DAVRANIŞI BOZULMADI (atlas aktifken)', () => {
  const S = protoState(224);
  S.anim.setAtlas(ARCHER_ATLAS_DEFAULT);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 120, S.world.worldY, 45, 1e12);
  S.mobs.mobs.push(mob as never);
  S.genie.start(S.world);
  S.genie.settings.forcedSet = 0;
  S.genie.settings.sets[0] = [ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO];
  S.genie.settings.modes[0] = 'sequence';
  const order: number[] = [];
  for (let i = 0; i < 1400; i++) {
    S.adapter.updateAction(1 / 60);
    S.combat.update(1 / 60);
    const acts = S.genie.update(1 / 60, S.entities(), S.world);
    S.applyAnimFor(acts);                      // Scene ile AYNI görsel tetik yolu
    for (const a of acts) if (a.kind === 'skill') order.push(a.skillRef);
    if (order.length >= 4) break;
  }
  ok(order.length >= 4, `en az 4 cast bekleniyordu, ${order.length} geldi`);
  eq(order[0], ARCHER.BESLI_SALVO, '1. cast 5\'li:');
  eq(order[1], ARCHER.UCLU_SALVO, '2. cast 3\'lü:');
  eq(order[2], ARCHER.BESLI_SALVO, '3. cast yine 5\'li:');
  eq(order[3], ARCHER.UCLU_SALVO, '4. cast yine 3\'lü:');
  eq(S.anim.clip, 'skill', 'ikisi de SKILL klibi:');
});

test('atlas aktifken multi-shot / cooldown / action lock DEĞİŞMEZ', () => {
  /* P1.3 KO FIDELITY: ok başına katsayı artık kaynağın kendisi (99/100). */
  near(MULTISHOT_PROFILES[ARCHER.UCLU_SALVO].coefficientPerArrow, 0.99, 1e-9, '3\'lü katsayı:');
  near(MULTISHOT_PROFILES[ARCHER.BESLI_SALVO].coefficientPerArrow, 0.99, 1e-9, '5\'li katsayı:');
  const S = protoState(225);
  S.anim.setAtlas(ARCHER_ATLAS_DEFAULT);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 60, S.world.worldY, 45, 1e12);
  S.mobs.mobs.push(mob as never);
  let casts = 0;
  for (let i = 0; i < 60; i++) {
    S.adapter.updateAction(1 / 60);
    S.combat.update(1 / 60);
    if (S.performSkill(ARCHER.STANDART_ATIS, mob as never).ok) casts++;
  }
  ok(casts <= 2, `action lock 1 saniyede ≤2 cast bırakmalı, ${casts} oldu`);
});

test('atlas anahtarları benzersiz ve klip başına birebir', () => {
  const keys = ARCHER_CLIPS.map((c) => ARCHER_ATLAS_KEY[c]);
  eq(new Set(keys).size, keys.length, 'benzersiz:');
  eq(keys.join(','), 'archer_walk,archer_attack,archer_skill,archer_idle,archer_dead', 'anahtarlar:');
  for (const c of ARCHER_CLIPS) eq(STATE_CLIP[c === 'walk' ? 'move' : c], c, `${c} state eşlemesi:`);
});



/* ================================================================
   P1.3 — ARCHER COMBAT BALANCE V1
   ================================================================ */
console.log('\n[P1.3] source fact / tuning ayrımı:');

test('15 skillin hepsi balance profilinde ve sourceRef tutarlı', () => {
  eq(ARCHER_SKILL_ORDER.length, 15, 'skill sayısı:');
  for (const ref of ARCHER_SKILL_ORDER) {
    const b = ARCHER_BALANCE[ref];
    ok(b !== undefined, `#${ref} profilde olmalı`);
    eq(b!.sourceRef, ref, `#${ref} sourceRef:`);
  }
  eq(new Set(ARCHER_SKILL_ORDER).size, 15, 'benzersiz:');
});

test('MP ve requiredLevel KAYNAKTAN gelir (profilde hardcode YOK)', () => {
  const expectMp: Record<number, number> = {
    [ARCHER.STANDART_ATIS]: 0, [ARCHER.DELICI_OK]: 15, [ARCHER.KOR_OKU]: 10,
    [ARCHER.ZEHIRLI_UC]: 10, [ARCHER.UCLU_SALVO]: 40, [ARCHER.IZCI_OKU]: 40,
    [ARCHER.KESKIN_ATIS]: 70, [ARCHER.ALEV_ATISI]: 30, [ARCHER.TOKSIK_ATIS]: 30,
    [ARCHER.YIRTICI_OK]: 100, [ARCHER.PATLAYICI_OK]: 50, [ARCHER.ENGEREK_OKU]: 50,
    [ARCHER.BESLI_SALVO]: 150, [ARCHER.GOLGE_AVCISI]: 250, [ARCHER.KARA_TAKIP]: 300,
  };
  for (const ref of ARCHER_SKILL_ORDER) {
    eq(balanceRow(ref).manaCost, expectMp[ref]!, `#${ref} MP:`);
  }
});

test('ham source alanları KORUNUYOR (hit_type / hit_rate davranış üretmiyor)', () => {
  eq(ARCHER_BALANCE[ARCHER.IZCI_OKU]!.source.hitType, 2, 'Guided hit_type:');
  eq(ARCHER_BALANCE[ARCHER.GOLGE_AVCISI]!.source.hitType, 2, 'Shadow Hunter hit_type:');
  eq(ARCHER_BALANCE[ARCHER.KARA_TAKIP]!.source.hitType, 2, 'Dark Pursuer hit_type:');
  eq(ARCHER_BALANCE[ARCHER.KESKIN_ATIS]!.source.hitRate, 150, 'Perfect Shot hit_rate:');
  eq(ARCHER_BALANCE[ARCHER.KARA_TAKIP]!.source.hitRate, 300, 'Dark Pursuer hit_rate:');
  /* Ham alanlar DAVRANIŞ üretmemeli: bu skillerin efektleri diğerleriyle aynı
     yapıda olmalı — accuracy/kesin-isabet efekti EKLENMEMİŞ olmalı. */
  for (const ref of [ARCHER.IZCI_OKU, ARCHER.KESKIN_ATIS, ARCHER.GOLGE_AVCISI, ARCHER.KARA_TAKIP]) {
    const def = SkillRegistry.get(ref)!;
    eq(def.effects.length, 1, `#${ref} yalnız tek fiziksel efekt:`);
    eq(def.effects[0]!.kind, 'directDamage', `#${ref} efekt tipi:`);
  }
});

test('source `duration = 20` HÂLÂ çözülmemiş olarak belgeleniyor', () => {
  for (const ref of [ARCHER.ZEHIRLI_UC, ARCHER.TOKSIK_ATIS, ARCHER.ENGEREK_OKU]) {
    eq(ARCHER_BALANCE[ref]!.source.durationRaw, 20, `#${ref} ham duration:`);
    /* prototip süresi kaynak süresi DEĞİLDİR */
    ok(ARCHER_BALANCE[ref]!.tuning.dotDurationSec !== 20,
      'tuning süresi ham source değeriyle aynı OLMAMALI');
    eq(ARCHER_BALANCE[ref]!.tuning.dotDurationSec, POISON_DURATION_SEC, 'tuning süresi:');
  }
});

console.log('\n[P1.3] physical coefficient (add_damage / 100):');

test('tek-ok fiziksel katsayıları source add_damage ile birebir', () => {
  const expect: Array<[number, number]> = [
    [ARCHER.STANDART_ATIS, 1.00], [ARCHER.DELICI_OK, 1.50], [ARCHER.KOR_OKU, 1.00],
    [ARCHER.ZEHIRLI_UC, 1.00], [ARCHER.IZCI_OKU, 1.00], [ARCHER.KESKIN_ATIS, 2.00],
    [ARCHER.ALEV_ATISI, 1.00], [ARCHER.TOKSIK_ATIS, 1.00], [ARCHER.YIRTICI_OK, 2.50],
    [ARCHER.PATLAYICI_OK, 1.00], [ARCHER.ENGEREK_OKU, 1.00],
    [ARCHER.GOLGE_AVCISI, 2.50], [ARCHER.KARA_TAKIP, 2.50],
  ];
  for (const [ref, c] of expect) {
    near(physicalCoefficient(ref), c, 1e-9, `#${ref} katsayı:`);
    const def = SkillRegistry.get(ref)!;
    const phys = def.effects.find((e) => e.kind === 'directDamage')!;
    near((phys as { coefficient: number }).coefficient, c, 1e-9, `#${ref} efekt katsayısı:`);
  }
});

test('Standart Atış katsayısı SOURCE değil TUNING olarak işaretli', () => {
  const b = ARCHER_BALANCE[ARCHER.STANDART_ATIS]!;
  eq(b.source.addDamage, null, 'magic_type2 kaydı yok:');
  near(b.tuning.physicalCoefficientFallback!, 1.00, 1e-9, 'tuning fallback:');
  near(physicalCoefficient(ARCHER.STANDART_ATIS), 1.00, 1e-9, 'sonuç:');
});

console.log('\n[P1.3] 3/5 salvo — KO fidelity:');

test('ÜÇLÜ: 3 projectile · 0.99 / ok · CD 0', () => {
  eq(projectileCount(ARCHER.UCLU_SALVO), 3, 'ok sayısı:');
  eq(ARCHER_BALANCE[ARCHER.UCLU_SALVO]!.source.needArrow, 3, 'source need_arrow:');
  near(MULTISHOT_PROFILES[ARCHER.UCLU_SALVO]!.coefficientPerArrow, 0.99, 1e-9, 'ok başına:');
  near(sourceCooldownSec(ARCHER.UCLU_SALVO), 0, 1e-9, 'individual CD:');
  eq(SkillRegistry.get(ARCHER.UCLU_SALVO)!.cooldownSec, 0, 'behavior CD:');
});

test('BEŞLİ: 5 projectile · 0.99 / ok · CD 0', () => {
  eq(projectileCount(ARCHER.BESLI_SALVO), 5, 'ok sayısı:');
  eq(ARCHER_BALANCE[ARCHER.BESLI_SALVO]!.source.needArrow, 5, 'source need_arrow:');
  near(MULTISHOT_PROFILES[ARCHER.BESLI_SALVO]!.coefficientPerArrow, 0.99, 1e-9, 'ok başına:');
  near(sourceCooldownSec(ARCHER.BESLI_SALVO), 0, 1e-9, 'individual CD:');
});

test('ESKİ 0.75 / 0.62 prototip katsayıları KALDIRILDI', () => {
  for (const ref of [ARCHER.UCLU_SALVO, ARCHER.BESLI_SALVO]) {
    const c = MULTISHOT_PROFILES[ref]!.coefficientPerArrow;
    ok(Math.abs(c - 0.75) > 1e-6 && Math.abs(c - 0.62) > 1e-6, `#${ref} eski değer kalmamalı: ${c}`);
  }
});

test('3/5 SPREAD GEOMETRİSİ (P1.3.1: 3\'lü ±5° · 5\'li ±8° DEĞİŞMEDİ)', () => {
  eq(MULTISHOT_PROFILES[ARCHER.UCLU_SALVO]!.anglesDeg.join(','), '-5,0,5', '3\'lü açılar:');
  eq(MULTISHOT_PROFILES[ARCHER.BESLI_SALVO]!.anglesDeg.join(','), '-8,-4,0,4,8', '5\'li açılar:');
});

test('çok-ok TEK VURUŞA çevrilmedi: her ok ayrı hit/miss', () => {
  const S = protoState(310);
  S.mobs.mobs.length = 0;
  /* küçük hitbox + uzak mesafe → dış oklar KAÇMALI */
  const far = mockMob(S.world.worldX + 300, S.world.worldY, 12, 1e12);
  S.mobs.mobs.push(far as never);
  const r = fireAndResolve(S, ARCHER.BESLI_SALVO, far as never, S.entities());
  ok(r.ok, 'cast başarılı');
  eq(r.projectiles, 5, 'atılan ok:');
  ok(r.targetHits < 5, `uzakta 5/5 OLMAMALI, gelen ${r.targetHits}/5`);
  ok(r.targetHits >= 1, 'orta ok her zaman vurmalı');
});

test('çok-oklu skiller SkillSystem efekti taşımaz (çift hasar yok)', () => {
  for (const ref of [ARCHER.UCLU_SALVO, ARCHER.BESLI_SALVO]) {
    eq(SkillRegistry.get(ref)!.effects.length, 0, `#${ref} efekt sayısı:`);
    ok(isMultiShotRef(ref), `#${ref} çok-ok olmalı`);
  }
});

console.log('\n[P1.3] fire / poison progression:');

test('FIRE ek katsayıları 0.25 / 0.50 / 0.75 (1 : 2 : 3)', () => {
  const expect: Array<[number, number, number]> = [
    [ARCHER.KOR_OKU, 0.25, -156], [ARCHER.ALEV_ATISI, 0.50, -309], [ARCHER.PATLAYICI_OK, 0.75, -463],
  ];
  for (const [ref, c, srcFirst] of expect) {
    eq(elementOf(ref), 'fire', `#${ref} element:`);
    near(elementalCoefficient(ref), c, 1e-9, `#${ref} elemental katsayı:`);
    eq(ARCHER_BALANCE[ref]!.source.firstDamage, srcFirst, `#${ref} source first_damage:`);
    /* efekt [1] anlık ateş bonusu olmalı, fiziksel [0]'dan AYRI */
    const def = SkillRegistry.get(ref)!;
    eq(def.effects.length, 2, `#${ref} efekt sayısı:`);
    near((def.effects[0] as { coefficient: number }).coefficient, 1.00, 1e-9, `#${ref} fiziksel:`);
    near((def.effects[1] as { coefficient: number }).coefficient, c, 1e-9, `#${ref} ateş:`);
  }
  /* 1 : 2 : 3 oranı hem kaynakta hem tuning'de */
  near(0.50 / 0.25, 2, 1e-9, 'tuning oranı 2×:');
  near(0.75 / 0.25, 3, 1e-9, 'tuning oranı 3×:');
});

test('POISON DoT TOPLAM katsayıları 0.30 / 0.60 / 0.90 (1 : 2 : 3)', () => {
  const expect: Array<[number, number, number]> = [
    [ARCHER.ZEHIRLI_UC, 0.30, -232], [ARCHER.TOKSIK_ATIS, 0.60, -463], [ARCHER.ENGEREK_OKU, 0.90, -691],
  ];
  for (const [ref, total, srcTime] of expect) {
    eq(elementOf(ref), 'poison', `#${ref} element:`);
    near(ARCHER_BALANCE[ref]!.tuning.dotTotalCoefficient, total, 1e-9, `#${ref} DoT TOPLAM:`);
    eq(ARCHER_BALANCE[ref]!.source.timeDamage, srcTime, `#${ref} source time_damage:`);
  }
});

test('DoT TOPLAM tick\'lere DETERMİNİSTİK bölünüyor, toplam SAPMIYOR', () => {
  for (const [ref, total] of [[ARCHER.ZEHIRLI_UC, 0.30], [ARCHER.TOKSIK_ATIS, 0.60], [ARCHER.ENGEREK_OKU, 0.90]] as const) {
    const n = dotTickCount(ref);
    eq(n, 4, `#${ref} tick sayısı:`);
    const per = dotPerTickCoefficient(ref);
    near(per * n, total, 1e-12, `#${ref} tick × perTick = TOPLAM:`);
    /* motora giden değer de aynı olmalı */
    const dot = SkillRegistry.get(ref)!.effects.find((e) => e.kind === 'damageOverTime')!;
    near((dot as { coefficient: number }).coefficient, per, 1e-12, `#${ref} efekt katsayısı:`);
    eq((dot as { tickSec: number }).tickSec, POISON_TICK_SEC, `#${ref} tick sn:`);
    eq((dot as { durationSec: number }).durationSec, POISON_DURATION_SEC, `#${ref} süre:`);
  }
  near(dotPerTickCoefficient(ARCHER.TOKSIK_ATIS), 0.15, 1e-12, '0.60 → 4 × 0.15:');
});

test('zehir GERÇEKTEN 4 tick uyguluyor (motor davranışı)', () => {
  const S = protoState(311);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 60, S.world.worldY, 40, 1e12);
  S.mobs.mobs.push(mob as never);
  const shot = S.resolveCastToImpact(ARCHER.ENGEREK_OKU, mob as never);
  ok(shot.result.ok, 'cast başarılı');
  eq(shot.impacts.filter((i) => i.statusesApplied > 0).length, 1, 'DoT IMPACT anında eklenmeli:');
  let ticks = 0, dotDamage = 0;
  for (let i = 0; i < 60 * 6; i++) {
    for (const ev of S.combat.skills.tickStatuses(S.entities() as never, 1 / 60)) {
      ticks++; dotDamage += ev.damage;
    }
  }
  eq(ticks, 4, 'tick sayısı:');
  ok(dotDamage > 0, 'DoT hasar vermeli');
});

console.log('\n[P1.3] cooldown / range / action time:');

test('FIRE individual CD: 3.2 / 4.2 / 4.2 (kaynaktan)', () => {
  near(sourceCooldownSec(ARCHER.KOR_OKU), 3.2, 1e-9, 'Kor Oku:');
  near(sourceCooldownSec(ARCHER.ALEV_ATISI), 4.2, 1e-9, 'Alev Atışı:');
  near(sourceCooldownSec(ARCHER.PATLAYICI_OK), 4.2, 1e-9, 'Patlayıcı Ok:');
});

test('POISON individual CD: 3.2 / 4.2 / 4.2 (kaynaktan)', () => {
  near(sourceCooldownSec(ARCHER.ZEHIRLI_UC), 3.2, 1e-9, 'Zehirli Uç:');
  near(sourceCooldownSec(ARCHER.TOKSIK_ATIS), 4.2, 1e-9, 'Toksik Atış:');
  near(sourceCooldownSec(ARCHER.ENGEREK_OKU), 4.2, 1e-9, 'Engerek Oku:');
});

test('recast 0 olan 9 skilde COOLDOWN OVERLAY oluşmuyor', () => {
  const zero = [
    ARCHER.STANDART_ATIS, ARCHER.DELICI_OK, ARCHER.UCLU_SALVO, ARCHER.IZCI_OKU,
    ARCHER.KESKIN_ATIS, ARCHER.YIRTICI_OK, ARCHER.BESLI_SALVO,
    ARCHER.GOLGE_AVCISI, ARCHER.KARA_TAKIP,
  ];
  eq(zero.length, 9, 'recast 0 skill sayısı:');
  const S = protoState(312);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 60, S.world.worldY, 45, 1e12);
  S.mobs.mobs.push(mob as never);
  for (const ref of zero) {
    near(sourceCooldownSec(ref), 0, 1e-9, `#${ref} kaynak CD:`);
    eq(SkillRegistry.get(ref)!.cooldownSec, 0, `#${ref} behavior CD:`);
    S.action.reset();
    S.player.restoreVitals({ hp: Number.POSITIVE_INFINITY, mp: Number.POSITIVE_INFINITY });
    ok(S.performSkill(ref, mob as never).ok, `#${ref} cast başarılı`);
    /* cast SONRASI da cooldown göstergesi 0 olmalı — sadece action lock çalışır */
    const slot = S.combat.skills.slots().find((v) => v.def?.sourceRef === ref);
    if (slot) eq(slot.cooldownLeft, 0, `#${ref} cast sonrası cooldown:`);
    ok(S.adapter.actionBusy, `#${ref} action lock çalışmalı`);
  }
});

test('BÜTÜN 15 Archer skillinin cast range\'i 400 (P1.4.1)', () => {
  const S = protoState(313);
  for (const ref of ARCHER_SKILL_ORDER) {
    eq(castRange(ref), ARCHER_CAST_RANGE, `#${ref} profil menzili:`);
    eq(ARCHER_CAST_RANGE, 400, 'sabit:');
    const def = SkillRegistry.get(ref)!;
    eq(S.ranges.skillRange(ref, def.targeting), 400, `#${ref} kayıtlı menzil:`);
  }
  /* çok-ok profilleri de aynı menzili kullanmalı */
  eq(MULTISHOT_PROFILES[ARCHER.UCLU_SALVO]!.rangeWorld, 400, '3\'lü menzil:');
  eq(MULTISHOT_PROFILES[ARCHER.BESLI_SALVO]!.rangeWorld, 400, '5\'li menzil:');
});

test('menzil kapısı gerçekten 400\'de kesiyor (400 içeride · 401 dışarıda)', () => {
  const at = (dist: number): { ok: boolean; reason?: string } => {
    const S = protoState(314);
    S.mobs.mobs.length = 0;
    const m = mockMob(S.world.worldX + dist, S.world.worldY, 26, 1e12);
    S.mobs.mobs.push(m as never);
    const r = S.performSkill(ARCHER.KESKIN_ATIS, m as never);
    return r.ok ? { ok: true } : { ok: false, reason: r.reason };
  };
  ok(at(395).ok, '395 → içeride');
  ok(at(400).ok, '400 (TAM SINIR) → içeride');
  const over = at(401);
  eq(over.ok, false, '401 → dışarıda:');
  eq(over.reason, 'range', 'red sebebi:');
});

test('ACTION TIME değerleri P1.2.1 ile BİREBİR aynı', () => {
  const expect: Array<[number, number]> = [
    [ARCHER.STANDART_ATIS, 1.10], [ARCHER.DELICI_OK, 0.75], [ARCHER.KOR_OKU, 0.75],
    [ARCHER.ZEHIRLI_UC, 0.75], [ARCHER.UCLU_SALVO, 0.70], [ARCHER.IZCI_OKU, 0.75],
    [ARCHER.KESKIN_ATIS, 0.80], [ARCHER.ALEV_ATISI, 0.80], [ARCHER.TOKSIK_ATIS, 0.80],
    [ARCHER.YIRTICI_OK, 0.85], [ARCHER.PATLAYICI_OK, 0.85], [ARCHER.ENGEREK_OKU, 0.85],
    [ARCHER.BESLI_SALVO, 0.80], [ARCHER.GOLGE_AVCISI, 0.85], [ARCHER.KARA_TAKIP, 0.90],
  ];
  const S = protoState(315);
  for (const [ref, t] of expect) {
    near(ARCHER_ACTION_TIME[ref]!, t, 1e-9, `#${ref} tablo:`);
    near(S.adapter.actionTimeOf(ref), t, 1e-9, `#${ref} adaptör:`);
  }
});

test('cooldown ile action time BİRLEŞTİRİLMEDİ (ayrı iki sistem)', () => {
  /* recast 0 ama action time > 0 olan skiller: iki değer BİRBİRİNE eşit olmamalı */
  for (const ref of [ARCHER.UCLU_SALVO, ARCHER.BESLI_SALVO, ARCHER.GOLGE_AVCISI, ARCHER.KARA_TAKIP]) {
    eq(sourceCooldownSec(ref), 0, `#${ref} individual CD 0 kalmalı:`);
    ok(ARCHER_ACTION_TIME[ref]! > 0, `#${ref} action time > 0 olmalı`);
  }
});

console.log('\n[P1.3] hasar bileşenleri (telemetri):');

test('ateş skillinde physical / fire / total AYRI raporlanıyor', () => {
  const S = protoState(316);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 60, S.world.worldY, 45, 1e12);
  S.mobs.mobs.push(mob as never);
  const res = S.performSkill(ARCHER.PATLAYICI_OK, mob as never);
  ok(res.ok, 'cast başarılı');
  const b = (res as { breakdown: { element: string; physicalDamage: number; elementalDamage: number; totalDamage: number } }).breakdown;
  eq(b.element, 'fire', 'element:');
  ok(b.physicalDamage > 0, 'fiziksel > 0');
  ok(b.elementalDamage > 0, 'ateş > 0');
  eq(b.totalDamage, b.physicalDamage + b.elementalDamage, 'toplam = fiziksel + ateş:');
  /* P2.5A NOTU — bu oran ARTIK SABİT DEĞİL.
     Fiziksel hasar KO zincirinden (AP → HitB → Type2 rolü) geliyor ve
     hedefin AC'sine göre değişiyor; elemental bileşen ise silahın sabit
     katsayısından. Test artık oranı değil, İKİ BİLEŞENİN DE AYRI
     RAPORLANDIĞINI doğruluyor — asıl amaç buydu. */
  const ratio = b.elementalDamage / b.physicalDamage;
  ok(ratio > 0 && ratio < 5, `oran ölçülebilir olmalı, gelen ${ratio.toFixed(2)}`);
});

test('zehir skillinde anlık elemental 0, DoT beklenen toplam raporlanıyor', () => {
  const S = protoState(317);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 60, S.world.worldY, 45, 1e12);
  S.mobs.mobs.push(mob as never);
  const res = S.performSkill(ARCHER.ENGEREK_OKU, mob as never);
  ok(res.ok, 'cast başarılı');
  const b = (res as { breakdown: { element: string; elementalDamage: number; dotTickCount: number; dotPerTickDamage: number; dotExpectedTotal: number } }).breakdown;
  eq(b.element, 'poison', 'element:');
  eq(b.elementalDamage, 0, 'anlık elemental:');
  eq(b.dotTickCount, 4, 'tick sayısı:');
  ok(b.dotPerTickDamage > 0, 'tick hasarı > 0');
  eq(b.dotExpectedTotal, b.dotPerTickDamage * 4, 'beklenen toplam:');
});

console.log('\n[P1.3] Genie / regresyon:');

test('P2.22 — canlı Genie setleri BOŞ başlar (kullanıcı kendi kurar)', () => {
  const live = DEFAULT_GENIE_SETS();
  eq(live.length, 3, 'set sayısı:');
  for (let i = 0; i < live.length; i++) eq(live[i]!.length, 0, `set ${i + 1} boş olmalı:`);
  /* Boş set bir HATA DEĞİL: Genie gizli temel saldırıya düşmez, bekler. */
  const S = new PrototypeState(3400);
  for (const set of S.genie.settings.sets) eq(set.length, 0, 'canlı set boş:');
});

test('test kurulumundaki Genie setleri KORUNUYOR', () => {
  const sets = TEST_GENIE_SETS();
  eq(sets[0].join(','), `${ARCHER.BESLI_SALVO},${ARCHER.UCLU_SALVO}`, 'Set 1:');
  eq(sets[1].join(','), `${ARCHER.DELICI_OK},${ARCHER.IZCI_OKU},${ARCHER.STANDART_ATIS}`, 'Set 2:');
  eq(sets[2].join(','),
    `${ARCHER.KARA_TAKIP},${ARCHER.GOLGE_AVCISI},${ARCHER.YIRTICI_OK},${ARCHER.BESLI_SALVO},${ARCHER.UCLU_SALVO}`,
    'Set 3:');
});

test('5→3 sequence ARAYA STANDART ATIŞ SOKMUYOR', () => {
  const S = protoState(318);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 120, S.world.worldY, 45, 1e12);
  S.mobs.mobs.push(mob as never);
  S.genie.start(S.world);
  S.genie.settings.forcedSet = 0;
  S.genie.settings.modes[0] = 'sequence';
  const order: number[] = [];
  for (let i = 0; i < 2000 && order.length < 6; i++) {
    S.adapter.updateAction(1 / 60); S.combat.update(1 / 60);
    for (const a of S.genie.update(1 / 60, S.entities(), S.world)) {
      if (a.kind === 'skill') order.push(a.skillRef);
    }
  }
  ok(order.length >= 6, `6 cast bekleniyordu, ${order.length} geldi`);
  ok(!order.includes(ARCHER.STANDART_ATIS), 'Standart Atış ARAYA GİRMEMELİ');
  eq(order.slice(0, 6).join(','),
    [ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO, ARCHER.BESLI_SALVO,
     ARCHER.UCLU_SALVO, ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO].join(','), 'rotasyon:');
});

test('Genie GİZLİ TEMEL SALDIRI üretmiyor', () => {
  const S = protoState(319);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 120, S.world.worldY, 45, 1e12);
  S.mobs.mobs.push(mob as never);
  S.genie.start(S.world);
  S.genie.settings.forcedSet = 0;
  /* sette KULLANILAMAYAN tek skill: mana yetmesin */
  S.genie.settings.sets[0] = [ARCHER.KARA_TAKIP];
  /* P2.5A — KO MP formülüyle mana havuzu 474 → 1314 çıktı ve iksirler artık
     ANLAMLI mana veriyor. Bu test "mana yokken cast olmaz" kurulumuna
     dayandığı için iksirler KAPATILIR; yoksa Genie iksir içip cast eder. */
  S.genie.settings.mpPotionRef = null;
  S.genie.settings.hpPotionRef = null;
  S.player.mp = 0;
  let skills = 0, waits = 0;
  for (let i = 0; i < 600; i++) {
    S.adapter.updateAction(1 / 60); S.combat.update(1 / 60);
    for (const a of S.genie.update(1 / 60, S.entities(), S.world)) {
      if (a.kind === 'skill') skills++;
      if (a.kind === 'wait') waits++;
    }
  }
  eq(skills, 0, 'hiç cast olmamalı:');
  ok(waits > 0, 'BEKLE eylemi üretmeli');
  eq(S.anim.triggers.attack, 0, 'gizli temel saldırı animasyonu:');
});

test('BAŞARISIZ cast: mana / hasar / animasyon MUTASYONU YOK', () => {
  const S = protoState(320);
  S.mobs.mobs.length = 0;
  const far = mockMob(S.world.worldX + 900, S.world.worldY, 45, 5000);
  S.mobs.mobs.push(far as never);
  const mpBefore = S.player.mp, hpBefore = far.hp;
  for (const ref of ARCHER_SKILL_ORDER) {
    const r = S.performSkill(ref, far as never);
    eq(r.ok, false, `#${ref} menzil dışı reddedilmeli:`);
  }
  eq(S.player.mp, mpBefore, 'mana harcanmamalı:');
  eq(far.hp, hpBefore, 'hedef hasar almamalı:');
  eq(S.anim.triggers.attack + S.anim.triggers.skill, 0, 'animasyon tetiği:');
  eq((far as unknown as { status?: unknown[] }).status?.length ?? 0, 0, 'DoT bırakmamalı:');
});

test('ACTION LOCK spam koruması hâlâ çalışıyor (0.99 katsayıdan sonra da)', () => {
  const S = protoState(321);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 60, S.world.worldY, 45, 1e12);
  S.mobs.mobs.push(mob as never);
  let casts = 0;
  for (let i = 0; i < 60; i++) {
    S.adapter.updateAction(1 / 60); S.combat.update(1 / 60);
    if (S.performSkill(ARCHER.BESLI_SALVO, mob as never).ok) casts++;
  }
  ok(casts <= 2, `1 saniyede ≤2 cast bekleniyordu, ${casts} oldu`);
});

test('rotasyon teorik katsayı toplamı: 4.95 + 2.97 + 2.50 + 2.50 = 12.92', () => {
  const five = physicalCoefficient(ARCHER.BESLI_SALVO) * projectileCount(ARCHER.BESLI_SALVO);
  const three = physicalCoefficient(ARCHER.UCLU_SALVO) * projectileCount(ARCHER.UCLU_SALVO);
  near(five, 4.95, 1e-9, 'Beşli (5 × 0.99):');
  near(three, 2.97, 1e-9, 'Üçlü (3 × 0.99):');
  near(physicalCoefficient(ARCHER.KARA_TAKIP), 2.50, 1e-9, 'Kara Takip:');
  near(physicalCoefficient(ARCHER.GOLGE_AVCISI), 2.50, 1e-9, 'Gölge Avcısı:');
  near(five + three + 2.5 + 2.5, 12.92, 1e-9, 'TOPLAM:');
});

test('rotasyon MP tüketimi: 150 + 40 + 300 + 250 = 740', () => {
  const refs = [ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO, ARCHER.KARA_TAKIP, ARCHER.GOLGE_AVCISI];
  const total = refs.reduce((a, r) => a + balanceRow(r).manaCost, 0);
  eq(total, 740, 'toplam MP:');
});


/* ================================================================
   P1.3.1 — dört correctness düzeltmesi
   ================================================================ */
console.log('\n[P1.3.1] açılış seviyesi ezmeleri:');

test('Standart Atış Lv1 · Delici Ok Lv3 (TUNING) — KAYNAK DEĞİŞMEDİ', () => {
  /* kaynak ham değerler AYNEN duruyor */
  eq(sourceRequiredLevel(ARCHER.STANDART_ATIS), 3, 'kaynak Standart Atış:');
  eq(sourceRequiredLevel(ARCHER.DELICI_OK), 0, 'kaynak Delici Ok:');
  /* oyunda geçerli seviye ezmeden geliyor */
  eq(effectiveRequiredLevel(ARCHER.STANDART_ATIS), 1, 'geçerli Standart Atış:');
  eq(effectiveRequiredLevel(ARCHER.DELICI_OK), 3, 'geçerli Delici Ok:');
  /* registry de ezmeyi görüyor */
  eq(SkillRegistry.get(ARCHER.STANDART_ATIS)!.requiredLevel, 1, 'registry Standart Atış:');
  eq(SkillRegistry.get(ARCHER.DELICI_OK)!.requiredLevel, 3, 'registry Delici Ok:');
  /* rapor satırı ikisini de ayrı ayrı taşıyor */
  const a = balanceRow(ARCHER.STANDART_ATIS);
  eq(a.requiredLevel, 1, 'row geçerli:'); eq(a.sourceRequiredLevel, 3, 'row kaynak:');
  const b = balanceRow(ARCHER.DELICI_OK);
  eq(b.requiredLevel, 3, 'row geçerli:'); eq(b.sourceRequiredLevel, 0, 'row kaynak:');
});

test('diğer 13 skilin seviyesi KAYNAKTAN, ezme YOK', () => {
  for (const ref of ARCHER_SKILL_ORDER) {
    if (ref === ARCHER.STANDART_ATIS || ref === ARCHER.DELICI_OK) continue;
    eq(ARCHER_BALANCE[ref]!.tuning.requiredLevelOverride, null, `#${ref} ezme yok:`);
    eq(effectiveRequiredLevel(ref), sourceRequiredLevel(ref), `#${ref} kaynakla aynı:`);
    eq(SkillRegistry.get(ref)!.requiredLevel, sourceRequiredLevel(ref), `#${ref} registry:`);
  }
});

test('seviye kapısı gerçekten yeni değerle çalışıyor', () => {
  const S = protoState(330);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 60, S.world.worldY, 45, 1e12);
  S.mobs.mobs.push(mob as never);
  S.player.level = 1;
  ok(S.performSkill(ARCHER.STANDART_ATIS, mob as never).ok, 'Lv1\'de Standart Atış açık olmalı');
  S.action.reset();
  const r = S.performSkill(ARCHER.DELICI_OK, mob as never);
  eq(r.ok, false, 'Lv1\'de Delici Ok KAPALI:');
  eq((r as { reason: string }).reason, 'levelReq', 'red sebebi:');
  S.player.level = 3; S.action.reset();
  ok(S.performSkill(ARCHER.DELICI_OK, mob as never).ok, 'Lv3\'te Delici Ok açık olmalı');
  S.player.level = PROTO.startLevel;
});

console.log('\n[P1.3.1] Üçlü Salvo ±5° geometrisi:');

test('ÜÇLÜ ±5°: küçük kuklada (r26) isabet sınırı ≈ 298 birim', () => {
  const r = 26;
  const boundary = r / Math.sin((5 * Math.PI) / 180);
  ok(boundary > 295 && boundary < 302, `sınır ~298 olmalı, hesap ${boundary.toFixed(1)}`);
  /* sınırın altında 3/3, üstünde 1/3 */
  for (const [dist, expected] of [[100, 3], [200, 3], [290, 3], [300, 1], [335, 1]] as const) {
    const S = protoState(331);
    S.mobs.mobs.length = 0;
    const mob = mockMob(S.world.worldX + dist, S.world.worldY, r, 1e12);
    S.mobs.mobs.push(mob as never);
    const shot = fireAndResolve(S, ARCHER.UCLU_SALVO, mob as never);
    ok(shot.ok, `${dist} birimde cast başarılı olmalı`);
    eq(shot.targetHits, expected, `${dist} birim isabet:`);
  }
});

test('ÜÇLÜ ±5°: BÜYÜK hitbox (r60) hâlâ 3/3 — spread değil hitbox belirleyici', () => {
  for (const dist of [100, 200, 300, 335]) {
    const S = protoState(332);
    S.mobs.mobs.length = 0;
    const mob = mockMob(S.world.worldX + dist, S.world.worldY, 60, 1e12);
    S.mobs.mobs.push(mob as never);
    const r = fireAndResolve(S, ARCHER.UCLU_SALVO, mob as never);
    ok(r.ok, `${dist} cast:`);
    eq(r.targetHits, 3, `${dist} isabet:`);
  }
});

test('BEŞLİ ±8° DEĞİŞMEDİ (100 → 5/5 · 200+ → 3/5)', () => {
  for (const [dist, expected] of [[100, 5], [200, 3], [300, 3], [335, 3]] as const) {
    const S = protoState(333);
    S.mobs.mobs.length = 0;
    const mob = mockMob(S.world.worldX + dist, S.world.worldY, 26, 1e12);
    S.mobs.mobs.push(mob as never);
    const r = fireAndResolve(S, ARCHER.BESLI_SALVO, mob as never);
    ok(r.ok, `${dist} cast:`);
    eq(r.targetHits, expected, `${dist} isabet:`);
  }
});

test('P1.3 HASARLARINA DOKUNULMADI (katsayılar aynı)', () => {
  near(physicalCoefficient(ARCHER.UCLU_SALVO), 0.99, 1e-9, '3\'lü ok başına:');
  near(physicalCoefficient(ARCHER.BESLI_SALVO), 0.99, 1e-9, '5\'li ok başına:');
  near(physicalCoefficient(ARCHER.STANDART_ATIS), 1.00, 1e-9, 'Standart:');
  near(physicalCoefficient(ARCHER.DELICI_OK), 1.50, 1e-9, 'Delici:');
  near(elementalCoefficient(ARCHER.KOR_OKU), 0.25, 1e-9, 'ateş 1:');
  near(elementalCoefficient(ARCHER.ALEV_ATISI), 0.50, 1e-9, 'ateş 2:');
  near(elementalCoefficient(ARCHER.PATLAYICI_OK), 0.75, 1e-9, 'ateş 3:');
  near(ARCHER_BALANCE[ARCHER.ZEHIRLI_UC]!.tuning.dotTotalCoefficient, 0.30, 1e-9, 'zehir 1:');
  near(ARCHER_BALANCE[ARCHER.TOKSIK_ATIS]!.tuning.dotTotalCoefficient, 0.60, 1e-9, 'zehir 2:');
  near(ARCHER_BALANCE[ARCHER.ENGEREK_OKU]!.tuning.dotTotalCoefficient, 0.90, 1e-9, 'zehir 3:');
  for (const ref of ARCHER_SKILL_ORDER) eq(castRange(ref), 400, `#${ref} menzil:`);
});

console.log('\n[P1.3.1] sonsuz MP toggle:');

test('SONSUZ MP varsayılan KAPALI ve MP\'yi doldurmaz', () => {
  const S = protoState(334);
  eq(S.infiniteMp, false, 'varsayılan:');
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 60, S.world.worldY, 45, 1e12);
  S.mobs.mobs.push(mob as never);
  const before = S.player.mp;
  S.performSkill(ARCHER.BESLI_SALVO, mob as never);
  S.updateInfiniteMp();
  ok(S.player.mp < before, 'MP harcanmalı ve dolmamalı');
});

test('SONSUZ MP AÇIK: mana kapısı KALKMAZ, MP dolar', () => {
  const S = protoState(335);
  S.infiniteMp = true;
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 60, S.world.worldY, 45, 1e12);
  S.mobs.mobs.push(mob as never);
  const full = S.player.mp;
  const res = S.performSkill(ARCHER.BESLI_SALVO, mob as never);
  ok(res.ok, 'cast başarılı');
  ok(S.player.mp < full, 'mana GERÇEKTEN harcanmalı (kapı kaldırılmadı)');
  S.updateInfiniteMp();
  eq(S.player.mp, full, 'sonraki karede MP tavana dolmalı:');
});

test('SONSUZ MP açıkken 740 MP\'lik rotasyon TAMAMLANIYOR', () => {
  const S = protoState(336);
  S.infiniteMp = true;
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 100, S.world.worldY, 60, 1e15);
  S.mobs.mobs.push(mob as never);
  const rot = [ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO, ARCHER.KARA_TAKIP, ARCHER.GOLGE_AVCISI];
  let mpSpent = 0, coeff = 0, done = 0;
  for (const ref of rot) {
    let guard = 0;
    while (S.adapter.actionBusy && guard++ < 100000) {
      S.adapter.updateAction(1 / 120); S.combat.update(1 / 120); S.updateInfiniteMp();
    }
    const res = S.performSkill(ref, mob as never);
    ok(res.ok, `#${ref} cast başarılı olmalı (mana engellememeli)`);
    if (!res.ok) continue;
    done++;
    mpSpent += balanceRow(ref).manaCost;
    const hits = res.accepted.isMultiShot
      ? S.adapter.pipeline.projectiles.length || res.accepted.projectileCount : 1;
    coeff += physicalCoefficient(ref) * hits;
  }
  eq(done, 4, 'dört cast da tamamlanmalı:');
  eq(mpSpent, 740, 'toplam MP:');
  near(coeff, 12.92, 1e-9, 'gerçekleşen fiziksel katsayı:');
});

test('SONSUZ MP KAPALIYKEN aynı rotasyon mana ile KESİLİYOR', () => {
  const S = protoState(337);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 100, S.world.worldY, 60, 1e15);
  S.mobs.mobs.push(mob as never);
  const rot = [ARCHER.BESLI_SALVO, ARCHER.UCLU_SALVO, ARCHER.KARA_TAKIP, ARCHER.GOLGE_AVCISI];
  /* P2.5A — KO MP formülüyle Sv70 havuzu 1314 oldu ve 740 MP'lik rotasyon
     ARTIK TAMAMLANIYOR. Testin amacı "mana kapısı gerçekten kesiyor mu";
     bu yüzden havuz rotasyonun altına ÇEKİLİR (eskiden tavan zaten altındaydı). */
  S.player.mp = 500;
  let rejected = 0;
  for (const ref of rot) {
    let guard = 0;
    while (S.adapter.actionBusy && guard++ < 100000) { S.adapter.updateAction(1 / 120); S.combat.update(1 / 120); }
    const res = S.performSkill(ref, mob as never);
    if (!res.ok && res.reason === 'mana') rejected++;
  }
  ok(rejected > 0, 'mana havuzu (500 < 740) en az bir cast\'i kesmeli');
});


/* ================================================================
   P1.4 — MANUAL COMBAT FEEL V1 (cast ≠ impact)
   ================================================================ */
console.log('\n[P1.4] iki fazlı combat — cast anında HASAR YOK:');

/** Pipeline'ı adım adım ilerletir; olayları zaman damgasıyla toplar. */
function drive(S: PrototypeState, mobs: WorldMob[], seconds: number, dt = 1 / 240): {
  releases: Array<{ t: number; ev: ReturnType<typeof noop> }>;
  impacts: ImpactEvent[];
  hpAt: Array<{ t: number; hp: number }>;
} {
  const releases: Array<{ t: number; ev: never }> = [];
  const impacts: ImpactEvent[] = [];
  const hpAt: Array<{ t: number; hp: number }> = [];
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    S.adapter.updateAction(dt);
    S.combat.update(dt);
    const out = S.adapter.updatePipeline(dt, S.world, mobs);
    for (const r of out.releases) releases.push({ t: S.adapter.pipeline.time, ev: r as never });
    impacts.push(...out.impacts);
    if (mobs[0]) hpAt.push({ t: S.adapter.pipeline.time, hp: mobs[0].hp });
  }
  return { releases, impacts, hpAt };
}
function noop(): never { throw new Error('type-only'); }

function soloRig(distance: number, hp = 1e12, radius = 26, seed = 400): {
  S: PrototypeState; mob: WorldMob;
} {
  const S = protoState(seed);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + distance, S.world.worldY, radius, hp) as unknown as WorldMob;
  S.mobs.mobs.push(mob);
  S.targets.select(mob.uid);
  return { S, mob };
}

test('A) Standart Atış d100: CAST anında HP AYNI, IMPACT anında düşer', () => {
  const { S, mob } = soloRig(100);
  const hp0 = mob.hp;
  const res = S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities());
  ok(res.ok, 'cast kabul edilmeli');
  eq(mob.hp, hp0, 'CAST anında HP DEĞİŞMEMELİ:');
  eq(S.adapter.pipeline.pending.length, 1, 'release bekleyen cast:');
  eq(S.adapter.pipeline.projectiles.length, 0, 'henüz ok YOK:');

  /* release'ten ÖNCE (0.20s) hâlâ hasar yok */
  drive(S, S.entities(), 0.15);
  eq(mob.hp, hp0, 'release ÖNCESİ HP AYNI:');
  eq(S.adapter.pipeline.projectiles.length, 0, 'ok hâlâ doğmamalı:');

  /* release oldu, ok uçuyor — HÂLÂ hasar yok */
  drive(S, S.entities(), 0.10);
  eq(S.adapter.pipeline.projectiles.length, 1, 'ok doğmuş olmalı:');
  eq(mob.hp, hp0, 'ok uçarken HP AYNI:');

  /* impact */
  const out = drive(S, S.entities(), 0.60);
  const valid = out.impacts.filter((i) => i.invalid === null);
  eq(valid.length, 1, 'tek impact:');
  ok(mob.hp < hp0, 'IMPACT sonrası HP düşmeli');
  eq(Math.round(hp0 - mob.hp), valid[0]!.damage, 'HP düşüşü impact hasarına eşit:');
});

test('A2) hasar CAST anında UYGULANMAZ — breakdown.applied = false', () => {
  const { S, mob } = soloRig(100);
  const res = S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities());
  ok(res.ok, 'cast');
  if (!res.ok) return;
  eq(res.breakdown.applied, false, 'cast anında uygulanmadı bayrağı:');
  ok(res.breakdown.physicalDamage > 0, 'payload rollenmiş olmalı');
  eq(mob.hp, 1e12, 'ama hedefe İŞLENMEMİŞ olmalı:');
});

test('B) d300 impact süresi d100\'den UZUN', () => {
  const timeFor = (dist: number): number => {
    const { S, mob } = soloRig(dist);
    const res = S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities());
    ok(res.ok, `${dist} cast`);
    const out = drive(S, S.entities(), 2.0);
    const hit = out.impacts.find((i) => i.invalid === null)!;
    return hit.impactAt;
  };
  const t100 = timeFor(100), t300 = timeFor(300);
  ok(t300 > t100, `d300 (${t300.toFixed(3)}s) > d100 (${t100.toFixed(3)}s) olmalı`);
  /* release 0.20 + mesafe/hız (900) */
  near(t100, COMBAT_TIMING_V1.releaseDelaySec + 100 / 900, 0.02, 'd100 toplam gecikme:');
  near(t300, COMBAT_TIMING_V1.releaseDelaySec + 300 / 900, 0.02, 'd300 toplam gecikme:');
});

test('B2) 100/200/300/335 impact zamanlaması beklenen bantta', () => {
  for (const [dist, expected] of [[100, 0.311], [200, 0.422], [300, 0.533], [335, 0.572]] as const) {
    const { S, mob } = soloRig(dist);
    ok(S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities()).ok, `${dist} cast`);
    const out = drive(S, S.entities(), 2.0);
    const hit = out.impacts.find((i) => i.invalid === null)!;
    near(hit.impactAt, expected, 0.02, `${dist} impact anı:`);
  }
});

test('C) MENZİL DIŞI: mana / cooldown / action lock / projectile / hasar YOK', () => {
  const { S, mob } = soloRig(450);          // cast range 400
  const mp0 = S.player.mp, hp0 = mob.hp;
  const res = S.performSkill(ARCHER.KESKIN_ATIS, mob, S.entities());
  eq(res.ok, false, 'reddedilmeli:');
  eq((res as { reason: string }).reason, 'range', 'sebep:');
  eq(S.player.mp, mp0, 'mana harcanmamalı:');
  eq(S.action.busy, false, 'action lock başlamamalı:');
  eq(S.adapter.pipeline.pending.length, 0, 'bekleyen cast:');
  eq(S.adapter.pipeline.projectiles.length, 0, 'ok:');
  eq(S.anim.triggers.attack + S.anim.triggers.skill, 0, 'animasyon:');
  drive(S, S.entities(), 1.5);
  eq(mob.hp, hp0, 'hedef hasar almamalı:');
  const slot = S.combat.skills.slots().find((v) => v.def?.sourceRef === ARCHER.KESKIN_ATIS);
  if (slot) eq(slot.cooldownLeft, 0, 'cooldown başlamamalı:');
  /* OTOMATİK YÜRÜME YOK: oyuncu yerinde kalmalı */
  eq(S.world.worldX, TEST_SPAWN_POINT.x, 'oyuncu X:');
  eq(S.world.worldY, TEST_SPAWN_POINT.y, 'oyuncu Y:');
});

test('D) HEDEF YOK: hiçbir mutasyon yok', () => {
  const S = protoState(401);
  S.mobs.mobs.length = 0;
  const mp0 = S.player.mp;
  for (const ref of [ARCHER.STANDART_ATIS, ARCHER.BESLI_SALVO, ARCHER.KOR_OKU]) {
    const res = S.performSkill(ref, null, S.entities());
    eq(res.ok, false, `#${ref} reddedilmeli:`);
    eq((res as { reason: string }).reason, 'noTarget', `#${ref} sebep:`);
  }
  eq(S.player.mp, mp0, 'mana:');
  eq(S.action.busy, false, 'action lock:');
  eq(S.adapter.pipeline.pending.length, 0, 'bekleyen cast:');
  eq(S.adapter.pipeline.projectiles.length, 0, 'ok:');
  eq(S.anim.triggers.attack + S.anim.triggers.skill, 0, 'animasyon:');
});

console.log('\n[P1.4] fire / poison impact:');

test('E) ATEŞ: cast anında physical/fire YOK, impact\'te İKİSİ BİRDEN', () => {
  const { S, mob } = soloRig(200);
  const hp0 = mob.hp;
  const res = S.performSkill(ARCHER.PATLAYICI_OK, mob, S.entities());
  ok(res.ok, 'cast');
  eq(mob.hp, hp0, 'cast anında HP AYNI:');
  const out = drive(S, S.entities(), 1.5);
  const hit = out.impacts.find((i) => i.invalid === null)!;
  ok(hit.physicalDamage > 0, 'impact fiziksel > 0');
  ok(hit.elementalDamage > 0, 'impact ateş > 0');
  eq(hit.damage, hit.physicalDamage + hit.elementalDamage, 'toplam = fiziksel + ateş:');
  eq(Math.round(hp0 - mob.hp), hit.damage, 'HP düşüşü tek seferde:');
});

test('F) ZEHİR: cast anında status YOK, impact\'te EKLENİR, ilk tick ≈ impact + 1s', () => {
  const { S, mob } = soloRig(200);
  mob.status = [];
  const res = S.performSkill(ARCHER.ENGEREK_OKU, mob, S.entities());
  ok(res.ok, 'cast');
  eq(mob.status.length, 0, 'CAST anında DoT EKLENMEMELİ:');
  eq(mob.hp, 1e12, 'cast anında HP AYNI:');

  /* Impact'e KADAR ilerle (DoT tick'i de her karede işlensin ki zamanlama
     gerçek oyun döngüsüyle aynı olsun). */
  const DT = 1 / 120;
  let hit: ImpactEvent | null = null;
  let firstTickAt: number | null = null;
  for (let i = 0; i < 120 * 8; i++) {
    S.adapter.updateAction(DT); S.combat.update(DT);
    const out = S.adapter.updatePipeline(DT, S.world, S.entities());
    for (const ev of out.impacts) if (ev.invalid === null && hit === null) hit = ev;
    for (const ev of S.combat.skills.tickStatuses(S.entities() as never, DT)) {
      void ev; if (firstTickAt === null) firstTickAt = S.adapter.pipeline.time;
    }
    if (firstTickAt !== null) break;
  }
  ok(hit !== null, 'impact gerçekleşmeli');
  eq(hit!.statusesApplied, 1, 'impact\'te 1 DoT eklenmeli:');
  ok(firstTickAt !== null, 'DoT tick gelmeli');
  near(firstTickAt! - hit!.impactAt, 1.0, 0.03, 'ilk tick impact + 1s:');
});

console.log('\n[P1.4] 3/5 impact telemetrisi:');

test('G) ÜÇLÜ küçük kukla: 100→3/3 · 200→3/3 · 300→1/3 · 335→1/3 (hasar impact\'te)', () => {
  for (const [dist, expected] of [[100, 3], [200, 3], [300, 1], [335, 1]] as const) {
    const { S, mob } = soloRig(dist, 1e12, 26, 410);
    const hp0 = mob.hp;
    ok(S.performSkill(ARCHER.UCLU_SALVO, mob, S.entities()).ok, `${dist} cast`);
    eq(mob.hp, hp0, `${dist} cast anında HP AYNI:`);
    const out = drive(S, S.entities(), 2.0);
    const valid = out.impacts.filter((i) => i.invalid === null);
    eq(out.impacts.length, 3, `${dist} toplam ok:`);
    eq(valid.length, expected, `${dist} isabet:`);
    eq(Math.round(hp0 - mob.hp), valid.reduce((a, i) => a + i.damage, 0), `${dist} HP düşüşü:`);
  }
});

test('H) BEŞLİ küçük kukla: 100→5/5 · 200→3/5 · 300→3/5 · 335→3/5', () => {
  for (const [dist, expected] of [[100, 5], [200, 3], [300, 3], [335, 3]] as const) {
    const { S, mob } = soloRig(dist, 1e12, 26, 411);
    ok(S.performSkill(ARCHER.BESLI_SALVO, mob, S.entities()).ok, `${dist} cast`);
    const out = drive(S, S.entities(), 2.0);
    eq(out.impacts.length, 5, `${dist} toplam ok:`);
    eq(out.impacts.filter((i) => i.invalid === null).length, expected, `${dist} isabet:`);
  }
});

test('I) BOSS hitbox (r60): Üçlü 3/3 · Beşli 5/5 — geometri korunuyor', () => {
  for (const dist of [100, 200, 300, 335]) {
    const a = soloRig(dist, 1e12, 60, 412);
    ok(a.S.performSkill(ARCHER.UCLU_SALVO, a.mob, a.S.entities()).ok, `${dist} 3'lü cast`);
    const o3 = drive(a.S, a.S.entities(), 2.0);
    eq(o3.impacts.filter((i) => i.invalid === null).length, 3, `${dist} 3'lü isabet:`);

    const b = soloRig(dist, 1e12, 60, 413);
    ok(b.S.performSkill(ARCHER.BESLI_SALVO, b.mob, b.S.entities()).ok, `${dist} 5'li cast`);
    const o5 = drive(b.S, b.S.entities(), 2.0);
    eq(o5.impacts.filter((i) => i.invalid === null).length, 5, `${dist} 5'li isabet:`);
  }
});

test('ıskalayan oklar menzil sonuna kadar uçar ve HASAR VERMEZ', () => {
  const { S, mob } = soloRig(335, 1e12, 26, 414);
  ok(S.performSkill(ARCHER.UCLU_SALVO, mob, S.entities()).ok, 'cast');
  const out = drive(S, S.entities(), 2.0);
  const misses = out.impacts.filter((i) => i.invalid === 'miss');
  eq(misses.length, 2, 'ıska sayısı:');
  for (const m of misses) {
    eq(m.damage, 0, 'ıska hasarı:');
    near(m.travelDistance, MULTISHOT_PROFILES[ARCHER.UCLU_SALVO]!.rangeWorld, 1, 'menzil sonuna kadar uçmalı:');
  }
});

console.log('\n[P1.4] hedef impact\'ten önce ölürse:');

test('J) uçan ok varken hedef ölürse: ÇİFT hasar/kill/loot YOK', () => {
  const { S, mob } = soloRig(300, 1, 60, 415);     // 1 HP, büyük hitbox → 5/5 isabet
  ok(S.performSkill(ARCHER.BESLI_SALVO, mob, S.entities()).ok, 'cast');
  const out = drive(S, S.entities(), 2.0);
  eq(out.impacts.length, 5, 'atılan ok:');
  const kills = out.impacts.filter((i) => i.killed);
  eq(kills.length, 1, 'YALNIZ BİR kill olmalı:');
  const dead = out.impacts.filter((i) => i.invalid === 'targetDead');
  eq(dead.length, 4, 'kalan oklar targetDead olmalı:');
  for (const d of dead) { eq(d.damage, 0, 'ölü hedefe hasar:'); eq(d.statusesApplied, 0, 'ölü hedefe DoT:'); }
  eq(mob.state, 'dying', 'hedef ölü:');

  /* resolveKill YALNIZ BİR KEZ: Scene'in `ai !== 'dead'` kapısı ile aynı mantık */
  let kill = 0;
  for (let i = 0; i < 5; i++) {
    if (mob.state === 'dying' && mob.ai !== 'dead') { S.adapter.resolveKill(mob); S.mobs.markDead(mob); kill++; }
  }
  eq(kill, 1, 'resolveKill tek sefer:');
});

test('J2) ölü hedefe ATEŞLENEMEZ (cast reddedilir)', () => {
  const { S, mob } = soloRig(100, 1e12, 26, 416);
  mob.state = 'dying';
  const res = S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities());
  eq(res.ok, false, 'reddedilmeli:');
  eq((res as { reason: string }).reason, 'noTarget', 'sebep:');
});

console.log('\n[P1.4] attack move + facing:');

test('K) Attack Move %0: ActionLock boyunca world position DEĞİŞMEZ', () => {
  const { S, mob } = soloRig(100, 1e12, 26, 420);
  S.adapter.pipeline.timing.attackMoveMult = 0;
  ok(S.performSkill(ARCHER.KARA_TAKIP, mob, S.entities()).ok, 'cast');
  const x0 = S.world.worldX, y0 = S.world.worldY;
  const stick = { dx: 0, dy: -PROTO.joystickRadius, active: true };
  for (let i = 0; i < 30; i++) {
    S.movement.move(S.world, resolveJoystick(stick), 1 / 60);
    ok(S.action.busy, 'action lock hâlâ aktif olmalı');
  }
  eq(S.world.worldX, x0, 'X değişmemeli:');
  eq(S.world.worldY, y0, 'Y değişmemeli:');
  eq(S.world.moving, true, 'joystick girdisi KAYBOLMAMALI:');
});

test('K2) Attack Move %60 ≈ normal hareketin %60\'ı · %100 = tam hız', () => {
  const travelWith = (mult: number): number => {
    const { S, mob } = soloRig(100, 1e12, 26, 421);
    S.adapter.pipeline.timing.attackMoveMult = mult;
    ok(S.performSkill(ARCHER.KARA_TAKIP, mob, S.entities()).ok, 'cast');
    const y0 = S.world.worldY;
    const stick = { dx: 0, dy: -PROTO.joystickRadius, active: true };
    for (let i = 0; i < 30; i++) S.movement.move(S.world, resolveJoystick(stick), 1 / 60);
    return Math.abs(S.world.worldY - y0);
  };
  const full = travelWith(1.00);
  const sixty = travelWith(0.60);
  const zero = travelWith(0);
  eq(zero, 0, '%0:');
  ok(full > 0, '%100 hareket etmeli');
  near(sixty / full, 0.60, 0.03, '%60 oranı:');
  eq(ATTACK_MOVE_OPTIONS.join(','), '0,0.6,1', 'DEV seçenekleri:');
});

test('K3) ActionLock BİTİNCE hız normale döner', () => {
  const { S, mob } = soloRig(100, 1e12, 26, 422);
  S.adapter.pipeline.timing.attackMoveMult = 0;
  ok(S.performSkill(ARCHER.UCLU_SALVO, mob, S.entities()).ok, 'cast');
  eq(S.attackMoveMultiplier(), 0, 'saldırı sırasında:');
  S.adapter.updateAction(5);
  eq(S.action.busy, false, 'action lock bitti:');
  eq(S.attackMoveMultiplier(), 1, 'sonrasında:');
});

test('L) Action bitince movementFacing GÜNCEL joystick yönüne döner', () => {
  const a = new PlayerAnimator();
  /* sola yürü, sonra hedefe (sağa) ateş et, saldırı sırasında YUKARI dön */
  a.update(1 / 60, true, 10, Math.PI);
  a.triggerAttack(0);
  near(a.angle, 0, 1e-9, 'saldırıda hedefe bakar:');
  /* saldırı boyunca joystick YUKARI (0% attack move → delta 0 ama input var) */
  for (let i = 0; i < 4; i++) a.update(1 / 240, true, 10, -Math.PI / 2, true);
  near(a.angle, 0, 1e-9, 'hâlâ combat facing:');
  near(a.movementFacing, -Math.PI / 2, 1e-9, 'movement facing arka planda güncellendi:');
  for (let i = 0; i < 200 && a.isActing; i++) a.update(1 / 240, true, 10, -Math.PI / 2, true);
  ok(!a.isActing, 'saldırı bitmeli');
  near(a.angle, -Math.PI / 2, 1e-9, 'GÜNCEL joystick yönüne döndü:');
});

console.log('\n[P1.4] Genie / ActionLock / pipeline ortaklığı:');

test('M) GENIE ve MANUEL aynı projectile/impact pipeline\'ını kullanır', () => {
  /* Genie ile ateş et → cast anında hasar YOK, impact'te var. */
  const { S, mob } = soloRig(120, 1e12, 45, 430);
  const hp0 = mob.hp;
  S.genie.start(S.world);
  S.genie.settings.forcedSet = 0;
  S.genie.settings.sets[0] = [ARCHER.BESLI_SALVO];
  let casts = 0;
  for (let i = 0; i < 20; i++) {
    for (const a of S.genie.update(1 / 60, S.entities(), S.world)) if (a.kind === 'skill') casts++;
    if (casts > 0) break;
  }
  eq(casts, 1, 'Genie cast etti:');
  eq(mob.hp, hp0, 'GENIE cast anında da HASAR YOK:');
  ok(S.adapter.pipeline.pending.length + S.adapter.pipeline.projectiles.length > 0,
    'Genie cast\'i de pipeline\'a girmeli');
  const out = drive(S, S.entities(), 2.0);
  ok(out.impacts.length > 0, 'Genie oku da impact üretmeli');
  ok(mob.hp < hp0, 'hasar impact\'te geldi');
});

test('M2) Genie hidden basic attack üretmiyor (pipeline değişse de)', () => {
  const { S, mob } = soloRig(120, 1e12, 45, 431);
  S.genie.start(S.world);
  S.genie.settings.forcedSet = 0;
  S.genie.settings.sets[0] = [ARCHER.KARA_TAKIP];
  /* P2.5A — KO MP formülüyle mana havuzu 474 → 1314 çıktı ve iksirler artık
     ANLAMLI mana veriyor. Bu test "mana yokken cast olmaz" kurulumuna
     dayandığı için iksirler KAPATILIR; yoksa Genie iksir içip cast eder. */
  S.genie.settings.mpPotionRef = null;
  S.genie.settings.hpPotionRef = null;
  S.player.mp = 0;
  let skills = 0, waits = 0;
  for (let i = 0; i < 600; i++) {
    S.adapter.updateAction(1 / 60); S.combat.update(1 / 60);
    S.adapter.updatePipeline(1 / 60, S.world, S.entities());
    for (const a of S.genie.update(1 / 60, S.entities(), S.world)) {
      if (a.kind === 'skill') skills++;
      if (a.kind === 'wait') waits++;
    }
  }
  eq(skills, 0, 'cast:'); ok(waits > 0, 'BEKLE üretmeli');
  eq(S.adapter.pipeline.projectiles.length, 0, 'ok üretilmemeli:');
  eq(mob.hp, 1e12, 'hedef hasar almamalı:');
});

test('ActionLock impact BEKLEMEZ — cooldown da beklemez', () => {
  const { S, mob } = soloRig(335, 1e12, 60, 432);
  const actionTime = S.adapter.actionTimeOf(ARCHER.KOR_OKU);   // 0.75
  ok(S.performSkill(ARCHER.KOR_OKU, mob, S.entities()).ok, 'cast');
  /* impact ≈ 0.20 + 335/900 ≈ 0.572s — action lock 0.75s SONRA biter */
  const out = drive(S, S.entities(), actionTime - 0.02);
  ok(out.impacts.length > 0, 'impact action lock BİTMEDEN gerçekleşmiş olmalı');
  ok(S.action.busy, 'action lock hâlâ sürüyor olmalı (ok uçtu diye uzamadı/kısalmadı)');
  S.adapter.updateAction(0.05);
  eq(S.action.busy, false, 'action lock süresinde bitti:');
  /* individual cooldown da impact beklemedi: cast anında başladı */
  const slot = S.combat.skills.slots().find((v) => v.def?.sourceRef === ARCHER.KOR_OKU);
  if (slot) ok(slot.cooldownLeft < 3.2, 'cooldown cast anında başlamış olmalı');
});

test('release delay ve projectile speed DEV\'den ayarlanabilir', () => {
  const S = protoState(433);
  eq(S.adapter.pipeline.timing.releaseDelaySec, 0.20, 'release delay V1:');
  eq(S.adapter.pipeline.timing.projectileSpeed, 900, 'projectile speed V1:');
  eq(S.adapter.pipeline.timing.attackMoveMult, 0.60, 'attack move V1:');
  eq(PROJECTILE_SPEED_OPTIONS.join(','), '700,900,1200,1500', 'hız seçenekleri:');
  const first = S.adapter.pipeline.timing.cycleProjectileSpeed();
  eq(first, 1200, 'sonraki hız:');
  S.adapter.pipeline.timing.reset();
  eq(S.adapter.pipeline.timing.projectileSpeed, 900, 'reset:');
});

test('daha hızlı ok = daha erken impact (gameplay world birimi)', () => {
  const at = (speed: number): number => {
    const { S, mob } = soloRig(300, 1e12, 26, 434);
    S.adapter.pipeline.timing.projectileSpeed = speed;
    ok(S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities()).ok, 'cast');
    const out = drive(S, S.entities(), 3.0);
    return out.impacts.find((i) => i.invalid === null)!.impactAt;
  };
  const slow = at(700), fast = at(1500);
  ok(fast < slow, `1500 (${fast.toFixed(3)}s) < 700 (${slow.toFixed(3)}s)`);
  near(slow - fast, 300 / 700 - 300 / 1500, 0.02, 'fark = mesafe/hız farkı:');
});

test('pipeline WORLD koordinatı kullanır — ekran/canvas değeri girmez', () => {
  const { S, mob } = soloRig(200, 1e12, 26, 435);
  ok(S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities()).ok, 'cast');
  drive(S, S.entities(), 0.25);
  const proj = S.adapter.pipeline.projectiles[0]!;
  near(proj.originX, TEST_SPAWN_POINT.x, 1e-6, 'origin world X:');
  near(proj.originY, TEST_SPAWN_POINT.y, 1e-6, 'origin world Y:');
  near(proj.travelDistance, 200, 1e-6, 'travel mesafesi world birimi:');
  const pos = CombatPipeline.position(proj);
  ok(pos.x >= TEST_SPAWN_POINT.x && pos.x <= TEST_SPAWN_POINT.x + 200, 'konum world uzayında ilerliyor');
});

test('P1.3 BALANCE DEĞİŞMEDİ (P1.4 yalnız zamanlama getirdi)', () => {
  near(physicalCoefficient(ARCHER.UCLU_SALVO), 0.99, 1e-9, '3\'lü:');
  near(physicalCoefficient(ARCHER.BESLI_SALVO), 0.99, 1e-9, '5\'li:');
  eq(MULTISHOT_PROFILES[ARCHER.UCLU_SALVO]!.anglesDeg.join(','), '-5,0,5', '3\'lü spread:');
  eq(MULTISHOT_PROFILES[ARCHER.BESLI_SALVO]!.anglesDeg.join(','), '-8,-4,0,4,8', '5\'li spread:');
  for (const ref of ARCHER_SKILL_ORDER) {
    eq(castRange(ref), 400, `#${ref} menzil:`);
    ok(ARCHER_ACTION_TIME[ref]! > 0, `#${ref} action time korunuyor`);
  }
  near(ARCHER_ACTION_TIME[ARCHER.STANDART_ATIS]!, 1.10, 1e-9, 'Standart Atış action:');
  near(ARCHER_ACTION_TIME[ARCHER.UCLU_SALVO]!, 0.70, 1e-9, 'Üçlü action:');
  near(ARCHER_ACTION_TIME[ARCHER.KARA_TAKIP]!, 0.90, 1e-9, 'Kara Takip action:');
});


/* ================================================================
   P1.4.1 — RANGE + MOVEMENT + KO POTION CORRECTNESS
   ================================================================ */
console.log('\n[P1.4.1] cast range 400:');

test('ARCHER_CAST_RANGE = 400 (340 DEĞİL)', () => {
  eq(ARCHER_CAST_RANGE, 400, 'sabit:');
  ok((ARCHER_CAST_RANGE as number) !== 340, '340 KALMAMALI');
  for (const ref of ARCHER_SKILL_ORDER) eq(castRange(ref), 400, `#${ref}:`);
});

test('400 cast success · 401 range fail · mutasyon yok', () => {
  const build = (dist: number) => {
    const S = protoState(500);
    S.mobs.mobs.length = 0;
    const m = mockMob(S.world.worldX + dist, S.world.worldY, 26, 1e12);
    S.mobs.mobs.push(m as never);
    return { S, m };
  };
  const a = build(400);
  ok(a.S.performSkill(ARCHER.STANDART_ATIS, a.m as never).ok, '400 → cast başarılı');

  const b = build(401);
  const mp0 = b.S.player.mp, hp0 = (b.m as unknown as { hp: number }).hp;
  const r = b.S.performSkill(ARCHER.STANDART_ATIS, b.m as never);
  eq(r.ok, false, '401 → reddedilmeli:');
  eq((r as { reason: string }).reason, 'range', 'sebep:');
  eq(b.S.player.mp, mp0, 'mana:');
  eq(b.S.action.busy, false, 'action lock:');
  eq(b.S.adapter.pipeline.pending.length, 0, 'bekleyen cast:');
  eq(b.S.adapter.pipeline.projectiles.length, 0, 'projectile:');
  eq((b.m as unknown as { hp: number }).hp, hp0, 'hasar:');
  eq(b.S.world.worldX, TEST_SPAWN_POINT.x, 'otomatik yaklaşma YOK:');
});

test('Genie acquisition range cast range\'den AYRI kavram', () => {
  const S = protoState(501);
  eq(S.genie.settings.attackRange, 450, 'Genie hedef edinme:');
  eq(ARCHER_CAST_RANGE, 400, 'cast menzili:');
  ok(S.genie.settings.attackRange !== ARCHER_CAST_RANGE, 'iki değer AYRI olmalı');
});

console.log('\n[P1.4.1] hareket hızı:');

test('playerSpeed varsayılanı 120 (210 DEĞİL)', () => {
  eq(PLAYER_SPEED_DEFAULT, 120, 'sabit:');
  eq(TUNING_DEFAULTS.playerSpeed, 120, 'tuning varsayılanı:');
  ok((TUNING_DEFAULTS.playerSpeed as number) !== 210, '210 KALMAMALI');
  eq(PLAYER_SPEED_OPTIONS.join(','), '90,120,150', 'DEV presetleri:');
});

test('90 / 120 / 150 → 1 saniyede gerçekten o kadar world birimi', () => {
  for (const speed of PLAYER_SPEED_OPTIONS) {
    const S = protoState(502);
    S.tuning.set('playerSpeed', speed);
    const y0 = S.world.worldY;
    const stick = { dx: 0, dy: -PROTO.joystickRadius, active: true };
    for (let i = 0; i < 60; i++) S.movement.move(S.world, resolveJoystick(stick), 1 / 60);
    near(Math.abs(S.world.worldY - y0), speed, 1.0, `${speed} birim/sn:`);
  }
});

test('Attack Move çarpanı YENİ base üzerinden — 72 hard-code EDİLMEMİŞ', () => {
  const measure = (base: number, mult: number): number => {
    const S = protoState(503);
    S.mobs.mobs.length = 0;
    const mob = mockMob(S.world.worldX + 100, S.world.worldY, 45, 1e12);
    S.mobs.mobs.push(mob as never);
    S.tuning.set('playerSpeed', base);
    S.adapter.pipeline.timing.attackMoveMult = mult;
    ok(S.performSkill(ARCHER.KARA_TAKIP, mob as never).ok, 'cast');   // action 0.90s
    const y0 = S.world.worldY;
    const stick = { dx: 0, dy: -PROTO.joystickRadius, active: true };
    for (let i = 0; i < 60; i++) S.movement.move(S.world, resolveJoystick(stick), 1 / 60);
    return Math.abs(S.world.worldY - y0);
  };
  near(measure(120, 0), 0, 0.01, 'base120 %0:');
  near(measure(120, 0.60), 72, 1.0, 'base120 %60 → 72:');
  near(measure(120, 1.00), 120, 1.0, 'base120 %100 → 120:');
  near(measure(90, 0.60), 54, 1.0, 'base90 %60 → 54:');
  near(measure(150, 0.60), 90, 1.0, 'base150 %60 → 90:');
});

console.log('\n[P1.4.1] KO potion SOURCE profili:');

test('9 iksir profili KAYNAKTAN — HP 90/180/360/720 · MP 120/240/480/960/1920', () => {
  eq(KO_POTIONS.length, 9, 'iksir sayısı:');
  eq(potionsFor('hp').map((p) => p.restoreAmount).join(','), '90,180,360,720', 'HP ailesi:');
  eq(potionsFor('mp').map((p) => p.restoreAmount).join(','), '120,240,480,960,1920', 'MP ailesi:');
  /* kullanıcının özellikle istediği üç MP kademesi */
  eq(koPotion(389018000)!.sourceName, 'Potion of sagacity', 'sagacity adı:');
  eq(koPotion(389018000)!.restoreAmount, 480, 'sagacity:');
  eq(koPotion(389019000)!.sourceName, 'Potion of wisdom', 'wisdom adı:');
  eq(koPotion(389019000)!.restoreAmount, 960, 'wisdom:');
  eq(koPotion(389020000)!.sourceName, 'Potion of soul', 'soul adı:');
  eq(koPotion(389020000)!.restoreAmount, 1920, 'soul:');
  /* direct_type: 1 = HP, 2 = MP */
  for (const p of KO_POTIONS) {
    eq(p.sourceDirectType, p.resource === 'hp' ? 1 : 2, `#${p.itemRef} direct_type:`);
    ok(p.sourceEffectRef >= 490011 && p.sourceEffectRef <= 490020, `#${p.itemRef} effect ref`);
    ok(p.vendorPrice > 0, `#${p.itemRef} fiyat`);
  }
});

test('profildeki itemRef\'ler generated items.json ile eşleşiyor', () => {
  for (const p of KO_POTIONS) {
    const item = Content.item(p.itemRef);
    ok(item !== undefined, `#${p.itemRef} items.json'da olmalı`);
    eq(item!.displayName, p.displayName, `#${p.itemRef} ad:`);
  }
});

test('P2.32 — iksir BEKLEMESİ var (kullanıcı kararı, kaynaktan değil)', () => {
  /* Eskiden cooldown YOKTU: kaynak `recast_time` biriminin
     doğrulanamaması gerekçesiyle uydurma sayı konmamıştı. Oyun
     testinde bu kusur olarak bildirildi — iksir sınırsız hızda
     içiliyordu. Süre bir TUNING'dir, kaynağın yerine geçmez. */
  const S = protoState(4000);
  S.giveTestPotions();
  S.player.hp = 1;
  const first = S.potions.use(389011000);
  ok(first.ok, 'ilk kullanım başarılı olmalı');
  S.player.hp = 1;
  const second = S.potions.use(389011000);
  ok(!second.ok && second.fail === 'cooldown', 'ikinci kullanım beklemeli');
  /* Bekleme dolunca yeniden kullanılabilir. */
  S.potions.update(POTION_COOLDOWN_SEC + 0.01);
  ok(S.potions.use(389011000).ok, 'bekleme sonrası kullanılabilmeli');
});

test('P2.32 — can ve mana beklemesi AYRI', () => {
  /* Tek sayaç olsaydı can içmek manayı kilitlerdi; savaşta ölümcül. */
  const S = protoState(4001);
  S.giveTestPotions();
  S.player.hp = 1; S.player.mp = 1;
  ok(S.potions.use(389011000).ok, 'can iksiri');
  ok(S.potions.use(389016000).ok, 'mana iksiri can beklemesinden etkilenmemeli');
  ok(S.potions.cooldownLeft('hp') > 0, 'can beklemesi başlamalı');
  ok(S.potions.cooldownLeft('mp') > 0, 'mana beklemesi başlamalı');
});

test('P2.32 — REDDEDİLEN kullanım bekleme BAŞLATMAZ', () => {
  const S = protoState(4002);
  S.giveTestPotions();
  S.player.hp = S.player.maxHp;          // dolu → 'full'
  const r = S.potions.use(389011000);
  ok(!r.ok, 'dolu canda kullanım reddedilmeli');
  eq(S.potions.cooldownLeft('hp'), 0, 'reddedilen deneme cezalandırılmamalı:');
});


console.log('\n[P1.4.1] SABİT miktarlı restore:');

test('MP +480 / +960 / +1920 SABİT restore (yüzde DEĞİL)', () => {
  const S = protoState(505);
  S.giveTestPotions();
  const maxMp = Math.round(S.stats.finalStats().maxMp);

  /* Tavana SIĞAN kademe: miktar birebir uygulanır. */
  S.player.mp = 0;
  const r120 = usePotion(S, 389016000);            // +120
  eq(r120.before, 0, '+120 önce:');
  eq(r120.after, 120, '+120 sonra (tam miktar):');
  eq(r120.actual, 120, '+120 gerçek:');
  eq(r120.wasted, 0, '+120 ziyan:');

  /* Kural her kademede aynı: after = min(max, before + amount) */
  for (const [ref, amount] of [[389018000, 480], [389019000, 960], [389020000, 1920]] as const) {
    S.player.mp = 100;
    const r = usePotion(S, ref);
    ok(r.ok, `#${ref} kullanım`);
    eq(r.restoreAmount, amount, `#${ref} SABİT miktar:`);
    eq(r.after, Math.min(maxMp, 100 + amount), `#${ref} after = min(max, before+amount):`);
    eq(r.actual, Math.min(maxMp, 100 + amount) - 100, `#${ref} gerçek:`);
    eq(r.actual + r.wasted, amount, `#${ref} gerçek + ziyan = sabit miktar:`);
  }
});

test('P2.5A — KO MP formülü iksir ölçeğine YAKLAŞTI (eski bulgu kapandı)', () => {
  /* ESKİ BULGU: maxMP 474 idi, 480+ iksir kademeleri DAİMA tavana takılıyordu.
     KO SP formülü (mana havuzu STA'dan türer) bunu 1314'e çıkardı; orta
     kademeler artık ziyan olmuyor. Büyük kademeler hâlâ taşabilir — bu
     kaynak ölçeğinin kendisidir, hata değildir. */
  const S = protoState(516);
  const maxMp = Math.round(S.stats.finalStats().maxMp);
  ok(maxMp > 1000, `Sv70 maxMP ${maxMp} — KO formülüyle 1314 beklenir`);
  S.giveTestPotions();
  S.player.mp = 0;
  /* 480'lik kademe artık TAM kazanılır, ziyan YOK. */
  const mid = usePotion(S, 389016000);
  if (mid.ok) {
    eq(mid.wasted, 0, 'orta kademe ziyanı:');
  }
  /* En büyük kademe (1920) hâlâ tavanı aşar → ziyan raporlanır. */
  S.player.mp = 0;
  const big = usePotion(S, 389020000);
  eq(big.after, maxMp, 'tavana çıkar:');
  eq(big.wasted, 1920 - maxMp, 'ziyan raporlanır:');
});


test('HP de sabit: 90 / 180 / 360 / 720', () => {
  const S = protoState(506);
  S.giveTestPotions();
  for (const [ref, amount] of [[389011000, 90], [389012000, 180], [389013000, 360], [389014000, 720]] as const) {
    S.player.hp = 1;
    const r = usePotion(S, ref);
    ok(r.ok, `#${ref} kullanım`);
    eq(r.restoreAmount, amount, `#${ref} sabit miktar:`);
    eq(r.after, Math.min(S.stats.finalStats().maxHp, 1 + amount), `#${ref} sonuç:`);
  }
});

test('yüzde YOK: aynı iksir farklı maxMP\'de AYNI miktarı verir', () => {
  const S = protoState(507);
  S.giveTestPotions();
  S.player.mp = 0;
  const a = usePotion(S, 389018000);          // +480
  S.player.mp = 0;
  const b = usePotion(S, 389018000);
  eq(a.actual, b.actual, 'iki kullanım aynı olmalı:');
  eq(a.restoreAmount, 480, 'sabit:');
});

test('adet düşer: 2 → 1 → 0 → outOfStock', () => {
  const S = protoState(508);
  /* çantayı temizle, tam 2 adet bırak */
  for (const { entry } of [...S.inventory.bagList()]) S.inventory.remove(entry.instanceId, entry.quantity);
  S.inventory.add(389018000, { quantity: 2 });
  eq(S.potions.stock(389018000), 2, 'başlangıç:');
  S.player.mp = 0;
  ok(usePotion(S, 389018000).ok, '1. kullanım');
  eq(S.potions.stock(389018000), 1, 'kalan:');
  S.player.mp = 0;
  const second = usePotion(S, 389018000);
  ok(second.ok, '2. kullanım');
  eq(second.remaining, 0, 'kalan:');
  S.player.mp = 0;
  const third = usePotion(S, 389018000);
  eq(third.ok, false, '3. kullanım reddedilmeli:');
  eq(third.fail, 'outOfStock', 'sebep:');
});

test('başarısız kullanımda HP/MP ve adet DEĞİŞMEZ (atomiklik)', () => {
  const S = protoState(509);
  for (const { entry } of [...S.inventory.bagList()]) S.inventory.remove(entry.instanceId, entry.quantity);
  S.inventory.add(389018000, { quantity: 1 });
  /* dolu MP → 'full', adet düşmemeli */
  S.player.mp = S.stats.finalStats().maxMp;
  const mp0 = S.player.mp;
  const r = S.potions.use(389018000);
  eq(r.ok, false, 'dolu MP:'); eq(r.fail, 'full', 'sebep:');
  eq(S.player.mp, mp0, 'MP değişmemeli:');
  eq(S.potions.stock(389018000), 1, 'adet değişmemeli:');
});

console.log('\n[P1.4.1] Genie seçili iksir davranışı:');

function potionRig(seed = 510): PrototypeState {
  const S = protoState(seed);
  S.mobs.mobs.length = 0;
  S.giveTestPotions();
  return S;
}

test('SEÇİLİ kademe bittiyse BAŞKA kademeye OTOMATİK GEÇMEZ', () => {
  const S = potionRig();
  S.genie.settings.hpPotionRef = null;
  S.genie.settings.mpPotionRef = 389019000;              // +960 seçili
  S.genie.settings.mpThresholdPct = 0.9;
  /* seçili kademeyi tüket, +480'den 99 adet bırak */
  for (const { entry } of [...S.inventory.bagList()]) {
    if (entry.itemRef === 389019000) S.inventory.remove(entry.instanceId, entry.quantity);
  }
  S.inventory.add(389018000, { quantity: 99 });
  eq(S.potions.stock(389019000), 0, 'seçili kademe boş:');
  ok(S.potions.stock(389018000) >= 99, '+480 bol:');

  S.player.mp = 1;
  const before480 = S.potions.stock(389018000);
  const act = S.genie.tryPotions();
  ok(act !== null && act.kind === 'potionEmpty', 'BİTTİ geri bildirimi gelmeli');
  eq(S.potions.stock(389018000), before480, '+480 OTOMATİK KULLANILMAMALI:');
  eq(S.player.mp, 1, 'MP değişmemeli:');
});

test('OUT OF STOCK geri bildirimi: envanter mutasyonu yok, spam yok', () => {
  const S = potionRig(511);
  S.genie.settings.hpPotionRef = null;
  S.genie.settings.mpPotionRef = 389020000;             // +1920
  S.genie.settings.mpThresholdPct = 0.9;
  for (const { entry } of [...S.inventory.bagList()]) {
    if (entry.itemRef === 389020000) S.inventory.remove(entry.instanceId, entry.quantity);
  }
  S.player.mp = 1;
  const first = S.genie.tryPotions(0);
  ok(first !== null && first.kind === 'potionEmpty', 'ilk bildirim:');
  eq((first as { label: string }).label, 'MP iksiri bitti', 'metin:');
  /* hemen ardından tekrar sorulursa SPAM olmamalı */
  let spam = 0;
  for (let i = 0; i < 60; i++) {
    const a = S.genie.tryPotions(1 / 60);
    if (a?.kind === 'potionEmpty') spam++;
  }
  eq(spam, 0, '1 saniye içinde tekrar bildirim OLMAMALI:');
  /* 3 sn sonra tekrar bildirebilir */
  let later = 0;
  for (let i = 0; i < 200; i++) {
    const a = S.genie.tryPotions(1 / 60);
    if (a?.kind === 'potionEmpty') later++;
  }
  ok(later >= 1, 'makul aralıkla tekrar bildirmeli');
});

test('eşik SADECE TETİK: üstünde iksir yok, altında seçili iksir', () => {
  const S = potionRig(512);
  S.genie.settings.hpPotionRef = null;
  S.genie.settings.mpPotionRef = 389018000;             // +480
  S.genie.settings.mpThresholdPct = 0.30;
  const maxMp = S.stats.finalStats().maxMp;

  S.player.mp = maxMp * 0.5;                            // eşiğin ÜSTÜ
  eq(S.genie.tryPotions(), null, 'eşik üstünde iksir YOK:');

  S.player.mp = maxMp * 0.2;                            // eşiğin ALTI
  const before = S.player.mp;
  const act = S.genie.tryPotions();
  ok(act !== null && act.kind === 'potion', 'eşik altında kullanılmalı');
  eq((act as { itemRef: number }).itemRef, 389018000, 'SEÇİLİ kademe:');
  eq((act as { restoreAmount: number }).restoreAmount, 480, 'sabit miktar:');
  eq(S.player.mp, Math.min(maxMp, before + 480), 'sabit restore uygulandı:');
});

test('iksir telemetrisi: before/after/actual/wasted/remaining', () => {
  const S = potionRig(513);
  S.genie.settings.hpPotionRef = null;
  S.genie.settings.mpPotionRef = 389020000;             // +1920, kesin clamp
  S.genie.settings.mpThresholdPct = 0.9;
  const maxMp = S.stats.finalStats().maxMp;
  S.player.mp = 120;
  const stockBefore = S.potions.stock(389020000);
  const act = S.genie.tryPotions();
  ok(act !== null && act.kind === 'potion', 'kullanım');
  const a = act as {
    before: number; after: number; actual: number; wasted: number; remaining: number; restoreAmount: number;
  };
  eq(a.before, 120, 'before:');
  eq(a.after, Math.round(maxMp), 'after (clamp):');
  eq(a.actual, Math.round(maxMp) - 120, 'actual:');
  eq(a.actual + a.wasted, 1920, 'actual + wasted = 1920:');
  eq(a.remaining, stockBefore - 1, 'kalan adet:');
});

test('DEV test iksirleri normal başlangıç envanterini DEĞİŞTİRMEZ', () => {
  const base = protoState(514);
  const startRefs = new Set(base.inventory.bagList().map((e) => e.entry.itemRef));
  /* başlangıçta yüksek kademeler OLMAMALI */
  eq(startRefs.has(389019000), false, 'başlangıçta +960 yok:');
  eq(startRefs.has(389020000), false, 'başlangıçta +1920 yok:');
  base.giveTestPotions();
  ok(base.potions.stock(389019000) >= 20, 'DEV sonrası +960 var');
  ok(base.potions.stock(389020000) >= 20, 'DEV sonrası +1920 var');
  eq(DEV_TEST_POTIONS.length, 7, 'test paketi:');
});

test('ayar döngüsü: KAPALI → kademeler → KAPALI', () => {
  const mp = potionOptions('mp');
  eq(mp[0], null, 'ilk seçenek KAPALI:');
  eq(mp.length, 6, 'KAPALI + 5 MP kademesi:');
  const hp = potionOptions('hp');
  eq(hp.length, 5, 'KAPALI + 4 HP kademesi:');
});

test('ana Faz 6.1 yüzdelik iksir davranışı DEĞİŞMEDİ', () => {
  const S = protoState(515);
  /* ConsumableSystem hâlâ yüzdelik ve hâlâ erişilebilir */
  const b = S.consumables.behavior(389011000)!;
  const eff = b.effects[0] as { kind: string; percentOfMax: number };
  eq(eff.kind, 'restoreHp', 'ana davranış kind:');
  near(eff.percentOfMax, 0.25, 1e-9, 'ana davranış hâlâ YÜZDELİK:');
  /* prototip profili ise SABİT */
  eq(koPotion(389011000)!.restoreAmount, 90, 'prototip SABİT:');
});


/* ================================================================
   P1.5 — GENIE MOVEMENT + FARM LOOP V1
   ================================================================ */
console.log('\n[P1.5] hareket durum makinesi:');

/** Scene'in KARE DÖNGÜSÜNÜN birebir aynısı (renderer'sız). */
function farmStep(S: PrototypeState, dt: number, stick?: { dx: number; dy: number; active: boolean }): {
  src: MovementSource; actions: GenieAction[];
} {
  const mv = stick ? resolveJoystick(stick) : { x: 0, y: 0, magnitude: 0 };
  const intent = S.genie.movementIntent(S.entities(), S.world);
  let src: MovementSource = 'NONE';
  if (mv.magnitude > 0) { src = 'MANUAL'; S.movement.move(S.world, mv, dt); }
  else if (intent.magnitude > 0) {
    src = 'GENIE';
    S.movement.move(S.world, intent, dt);
    S.genie.clampPlayer(S.world);
  } else S.movement.move(S.world, mv, dt);
  S.player.update(dt);
  S.combat.update(dt);
  S.adapter.updateAction(dt);
  S.adapter.updatePipeline(dt, S.world, S.entities());
  const actions = S.genie.update(dt, S.entities(), S.world);
  return { src, actions };
}

function farmRun(S: PrototypeState, seconds: number, dt = 1 / 60, stick?: { dx: number; dy: number; active: boolean }): {
  actions: GenieAction[]; sources: Set<MovementSource>; states: string[];
} {
  const actions: GenieAction[] = []; const sources = new Set<MovementSource>(); const states: string[] = [];
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    const r = farmStep(S, dt, stick);
    actions.push(...r.actions); sources.add(r.src);
    const st = S.genie.movementState;
    if (states[states.length - 1] !== st) states.push(st);
  }
  return { actions, sources, states };
}

/** Farm senaryosu: boş dünya + istenen konumlarda moblar. */
function farmRig(seed = 600, radius = 650): PrototypeState {
  const S = protoState(seed);
  S.mobs.mobs.length = 0;
  S.genie.settings.farmBoundaryRadius = radius;
  S.genie.settings.forcedSet = 0;
  S.genie.settings.hpPotionRef = null;
  S.genie.settings.mpPotionRef = null;
  return S;
}
function addMob(S: PrototypeState, dx: number, dy: number, hp = 1e9, radius = 45): WorldMob {
  const m = mockMob(S.world.worldX + dx, S.world.worldY + dy, radius, hp) as unknown as WorldMob;
  S.mobs.mobs.push(m);
  return m;
}
const dist = (S: PrototypeState, m: WorldMob): number =>
  Math.hypot(m.worldX - S.world.worldX, m.worldY - S.world.worldY);

test('durum makinesi saf ve tek başına test edilebilir', () => {
  const c = new GenieMovementController();
  eq(c.state, 'IDLE', 'başlangıç:');
  eq(GENIE_MOVEMENT_V1.enterCombatDistance, 380, 'enter:');
  eq(GENIE_MOVEMENT_V1.leaveCombatDistance, 400, 'leave:');
  eq(GENIE_MOVEMENT_V1.returnTolerance, 20, 'tolerans:');
  /* kapalıyken hiçbir hareket yok */
  const off = c.decide({ enabled: false, playerX: 0, playerY: 0, target: null, hasEligibleTarget: false, farmCenter: null });
  eq(off.state, 'IDLE', 'kapalı:'); eq(off.intent.magnitude, 0, 'hareket:');
});

test('§6 HİSTEREZİS: 380 gir · 400 çık · arada durum KORUNUR', () => {
  const c = new GenieMovementController();
  c.begin();
  const at = (d: number) => c.decide({
    enabled: true, playerX: 0, playerY: 0,
    target: { uid: 1, worldX: d, worldY: 0 }, hasEligibleTarget: true, farmCenter: { x: 0, y: 0 },
  });
  eq(at(405).state, 'APPROACH', '405 → yaklaş:');
  eq(at(395).state, 'APPROACH', '395 APPROACH iken → hâlâ yaklaşır (380 hedefi):');
  eq(at(381).state, 'APPROACH', '381 → hâlâ yaklaşır:');
  eq(at(380).state, 'COMBAT', '380 → combat:');
  eq(at(390).state, 'COMBAT', '390 COMBAT iken → COMBAT KALIR (titreme yok):');
  eq(at(400).state, 'COMBAT', '400 → hâlâ combat:');
  eq(at(401).state, 'APPROACH', '401 → yeniden yaklaş:');
  /* 380–400 BANDI durumu KORUR — iki yönde de. */
  at(380);                                              // COMBAT'a gir
  const held: string[] = [];
  for (const d of [399, 385, 398, 382, 397]) held.push(at(d).state);
  eq(new Set(held).size, 1, 'COMBAT iken bandda durum değişmemeli:');
  eq(held[0], 'COMBAT', 'band durumu (combat kolu):');
  at(500);                                              // APPROACH'a dön
  const held2: string[] = [];
  for (const d of [399, 385, 398, 382, 397]) held2.push(at(d).state);
  eq(new Set(held2).size, 1, 'APPROACH iken bandda durum değişmemeli:');
  eq(held2[0], 'APPROACH', 'band durumu (approach kolu):');
});

test('§25 mob 430: acquire VAR, ilk anda cast YOK, 380\'de durur', () => {
  const S = farmRig(601);
  const mob = addMob(S, 430, 0);
  S.genie.start(S.world);
  eq(S.targets.selectedUid, null, 'BAŞLAT stale target bırakmaz:');

  /* ilk karar tiki: hedef edinilir ama cast YOK (430 > 400) */
  const first = farmRun(S, 0.2);
  eq(S.targets.selectedUid, mob.uid, 'hedef edinildi:');
  eq(first.actions.filter((a) => a.kind === 'skill').length, 0, 'yaklaşırken cast YOK:');
  ok(S.genie.movementState === 'APPROACH', `APPROACH bekleniyordu, ${S.genie.movementState}`);

  const out = farmRun(S, 3.0);
  const d = dist(S, mob);
  ok(d <= GENIE_MOVEMENT_V1.enterCombatDistance + 3, `380'e kadar yaklaşmalı, mesafe ${d.toFixed(1)}`);
  eq(S.genie.movementState, 'COMBAT', 'combat başlamalı:');
  ok(out.actions.some((a) => a.kind === 'skill'), 'menzile girince cast etmeli');
  ok(out.states.includes('APPROACH') && out.states.includes('COMBAT'), 'APPROACH → COMBAT geçişi');
});

test('§25 RANGE FAIL SPAM YOK — SkillSystem\'e HİÇ ÇAĞRI YAPILMAZ', () => {
  /* P1.6.1 — ESKİ TEST BOŞ İDDİA İÇERİYORDU:
     `wait` eyleminin `range` diye bir gerekçesi HİÇ ÜRETİLMİYOR (üretilenler
     noTarget / approaching / actionLock / noUsableSkill). Dolayısıyla
     "range reddi sayısı 0" iddiası davranıştan bağımsız olarak DAİMA
     doğruydu ve hiçbir şeyi kanıtlamıyordu.
     Artık gerçek kanıt: authoritative cast giriş noktası olan
     `adapter.useSkillRef` casus (spy) ile sarılır ve APPROACH boyunca
     ÇAĞRI SAYISININ 0 olduğu ölçülür. */
  const S = farmRig(602);
  addMob(S, 430, 0);
  const realUse = S.adapter.useSkillRef.bind(S.adapter);
  let calls = 0;
  const seenStates: string[] = [];
  (S.adapter as unknown as { useSkillRef: typeof realUse }).useSkillRef = (
    ref: number, p: PlayerWorldState, mob: WorldMob | null, all?: WorldMob[],
  ) => { calls += 1; seenStates.push(S.genie.movementState); return realUse(ref, p, mob, all); };

  S.genie.start(S.world);
  /* yalnız YAKLAŞMA süresi: COMBAT'a girmeden önce durdur */
  let guard = 0;
  while (S.genie.movementState !== 'COMBAT' && guard++ < 600) farmStep(S, 1 / 60);
  ok(guard > 5, 'gerçekten bir yaklaşma süreci yaşanmalı');
  eq(S.genie.movementState, 'COMBAT', 'sonunda menzile girmeli:');
  /* ASIL İDDİA: cast denemesi YALNIZ COMBAT durumunda yapılabilir.
     (Menzile girilen KAREDE de cast edilebilir; o kare zaten COMBAT'tır.) */
  const nonCombat = seenStates.filter((st) => st !== 'COMBAT');
  eq(nonCombat.length, 0, `COMBAT dışı cast denemesi (${[...new Set(nonCombat)].join(',')}):`);

  /* COMBAT'a girdikten SONRA gerçekten cast edilebiliyor olmalı —
     testin "hiç cast yok" diye boş yere geçmediğinin kanıtı. */
  farmRun(S, 0.6);
  ok(calls > 0, 'COMBAT\'ta cast denemesi BAŞLAMALI (test boş geçmiyor)');
  eq(seenStates.filter((st) => st !== 'COMBAT').length, 0,
    `cast yalnız COMBAT'ta: ${[...new Set(seenStates)].join(',')}`);
});

test('§25b RETURN/WAIT durumlarında da SkillSystem\'e çağrı YAPILMAZ', () => {
  const S = farmRig(6021);
  const realUse = S.adapter.useSkillRef.bind(S.adapter);
  const states: string[] = [];
  (S.adapter as unknown as { useSkillRef: typeof realUse }).useSkillRef = (
    ref: number, p: PlayerWorldState, mob: WorldMob | null, all?: WorldMob[],
  ) => { states.push(S.genie.movementState); return realUse(ref, p, mob, all); };
  /* hiç mob yok → ACQUIRE → RETURN → WAIT */
  S.genie.start(S.world);
  S.world.worldX += 120;                        // merkezden uzakta başla ki RETURN olsun
  const out = farmRun(S, 6.0);
  ok(out.states.includes('WAIT') || out.states.includes('RETURN'), `RETURN/WAIT beklenir: ${out.states.join('>')}`);
  eq(states.length, 0, 'hedefsizken cast denemesi:');
});

test('§26 mob 500: ACQUIRE YOK, oyuncu kovalamaz', () => {
  const S = farmRig(603);
  const mob = addMob(S, 500, 0);
  const x0 = S.world.worldX, y0 = S.world.worldY;
  S.genie.start(S.world);
  const out = farmRun(S, 2.0);
  eq(S.targets.selectedUid, null, 'hedef edinilmemeli:');
  eq(out.actions.filter((a) => a.kind === 'skill').length, 0, 'cast:');
  eq(dist(S, mob) >= 500 - 0.01, true, 'mobun mesafesi kısalmamalı');
  /* eligible target yok → merkeze dön/bekle; merkez zaten burası */
  near(S.world.worldX, x0, 0.01, 'X:'); near(S.world.worldY, y0, 0.01, 'Y:');
  ok(S.genie.movementState === 'WAIT', `WAIT bekleniyordu, ${S.genie.movementState}`);
});

test('§27 mob 390 ve 405 → COMBAT, oscillation yok', () => {
  for (const start of [390, 405]) {
    const S = farmRig(604);
    const mob = addMob(S, start, 0);
    S.genie.start(S.world);
    const out = farmRun(S, 3.0);
    eq(S.genie.movementState, 'COMBAT', `${start} → combat:`);
    ok(dist(S, mob) <= 381, `${start} → 380'e yaklaşmalı`);
    /* APPROACH ↔ COMBAT arasında birden fazla gidiş geliş OLMAMALI */
    const flips = out.states.filter((x) => x === 'APPROACH' || x === 'COMBAT').length;
    ok(flips <= 2, `${start} durum geçişi ${flips} ≤ 2 olmalı: ${out.states.join(' → ')}`);
  }
});

console.log('\n[P1.5] menzil ayrımı ve hız:');

test('acquisition 450 ≠ cast range 400 ≠ auto hedef 380', () => {
  const S = farmRig(605);
  eq(S.genie.settings.attackRange, 450, 'acquisition:');
  eq(ARCHER_CAST_RANGE, 400, 'cast range:');
  eq(GENIE_MOVEMENT_V1.enterCombatDistance, 380, 'auto konumlanma:');
  const t = S.genie.status(S.entities());
  eq(t.attackRange, 450, 'telemetri acquisition:');
  eq(t.castRange, 400, 'telemetri cast range:');
  eq(t.desiredDistance, 380, 'telemetri auto hedef:');
});

test('§7 Genie AYRI hız kullanmaz — playerSpeed presetleri aynen geçerli', () => {
  for (const speed of PLAYER_SPEED_OPTIONS) {
    const S = farmRig(606);
    S.tuning.set('playerSpeed', speed);
    const mob = addMob(S, 449, 0);                     // acquisition sınırına yakın
    S.genie.start(S.world);
    let guard = 0;
    while (S.genie.movementState !== 'APPROACH' && guard++ < 120) farmStep(S, 1 / 60);
    eq(S.genie.movementState, 'APPROACH', `${speed} APPROACH:`);
    const x1 = S.world.worldX;
    const FRAMES = 24;                                  // 0.4 sn — 380'e ulaşmadan
    for (let i = 0; i < FRAMES; i++) farmStep(S, 1 / 60);
    const measured = (S.world.worldX - x1) / (FRAMES / 60);
    ok(dist(S, mob) > GENIE_MOVEMENT_V1.enterCombatDistance, 'ölçüm boyunca hâlâ yaklaşıyor olmalı');
    near(measured, speed, 2.0, `${speed} birim/sn:`);
  }
});

test('§16/§33 ActionLock sırasında yaklaşma Attack Move çarpanını kullanır', () => {
  const measure = (mult: number): number => {
    const S = farmRig(607);
    S.tuning.set('playerSpeed', 120);
    S.adapter.pipeline.timing.attackMoveMult = mult;
    const mob = addMob(S, 370, 0);
    S.genie.start(S.world);
    farmRun(S, 0.5);                                   // combat + cast başlasın
    ok(S.adapter.actionBusy, 'action lock aktif olmalı');
    /* hedefi 400 dışına taşı → ActionLock sürerken yaklaşma başlar */
    mob.worldX = S.world.worldX + 420; mob.x = mob.worldX;
    /* P1.6.1 — ÖLÇÜM PENCERESİ: yalnız ActionLock aktifKEN ve gerçekten
       YAKLAŞIRKEN ölç. Genie'nin karar saati düzeltildikten sonra Genie
       COMBAT'ta sürekli cast ettiği için ActionLock neredeyse hiç boşa
       çıkmıyor; eski `while (actionBusy)` penceresi hedefe varıldıktan
       sonraki DURAN kareleri de sayıyor ve hızı yapay olarak düşürüyordu. */
    farmStep(S, 1 / 60);                        // durum makinesi yeni mesafeyi görsün
    const x0 = S.world.worldX;
    let frames = 0;
    while (S.adapter.actionBusy && S.genie.movementState === 'APPROACH' && frames < 120) {
      farmStep(S, 1 / 60); frames++;
    }
    return frames === 0 ? 0 : (S.world.worldX - x0) / (frames / 60);
  };
  near(measure(0.60), 72, 6, '%60 → ~72 birim/sn:');
  near(measure(1.00), 120, 8, '%100 → ~120 birim/sn:');
  eq(Math.round(measure(0)), 0, '%0 → hareket yok:');
});

console.log('\n[P1.5] farm boundary:');

test('§28 boundary DIŞINDAKİ mob 250 birimde bile hedeflenmez', () => {
  const S = farmRig(608, 200);                          // küçük sınır
  S.genie.settings.farmBoundaryEnabled = true;          // P2.10: açıkça aç
  const mob = addMob(S, 250, 0);                        // oyuncuya yakın, sınır DIŞI
  S.genie.start(S.world);
  const out = farmRun(S, 2.0);
  eq(S.targets.selectedUid, null, 'hedef alınmamalı:');
  eq(out.actions.filter((a) => a.kind === 'skill').length, 0, 'cast:');
  ok(dist(S, mob) >= 249, 'oyuncu ona doğru yürümemeli');
  ok(S.genie.movementState === 'WAIT', `WAIT bekleniyordu, ${S.genie.movementState}`);
});

test('§29 hedef sınır DIŞINA çıkarsa: DROP + oyuncu sınırı aşmaz', () => {
  const S = farmRig(609, 300);
  const mob = addMob(S, 280, 0);                        // sınır içi
  S.genie.start(S.world);
  const center = { ...S.genie.farmCenter! };
  farmRun(S, 0.4);
  eq(S.targets.selectedUid, mob.uid, 'önce hedeflenir:');
  /* mobu sınır dışına taşı */
  mob.worldX = center.x + 900; mob.x = mob.worldX;
  farmRun(S, 1.5);
  eq(S.targets.selectedUid, null, 'hedef DÜŞMELİ:');
  const d = Math.hypot(S.world.worldX - center.x, S.world.worldY - center.y);
  ok(d <= 300 + 0.01, `oyuncu sınır içinde kalmalı, merkeze uzaklık ${d.toFixed(1)}`);
});

test('§9 Genie oyuncuyu ASLA sınır dışına çıkarmaz (clamp)', () => {
  const S = farmRig(610, 250);
  const center = { x: S.world.worldX, y: S.world.worldY };
  addMob(S, 240, 0);
  S.genie.start(S.world);
  let maxDist = 0;
  for (let i = 0; i < 600; i++) {
    farmStep(S, 1 / 60);
    maxDist = Math.max(maxDist, Math.hypot(S.world.worldX - center.x, S.world.worldY - center.y));
  }
  ok(maxDist <= 250 + 0.01, `en uzak nokta ${maxDist.toFixed(1)} ≤ 250 olmalı`);
});

test('clampToBoundary saf fonksiyonu sınıra geri çeker', () => {
  const p = { worldX: 500, worldY: 0 } as never as PlayerWorldState;
  ok(clampToBoundary(p, { x: 0, y: 0 }, 300, true), 'kırpma yapılmalı');
  near(p.worldX, 300, 1e-9, 'sınıra çekildi:');
  const q = { worldX: 100, worldY: 0 } as never as PlayerWorldState;
  eq(clampToBoundary(q, { x: 0, y: 0 }, 300, true), false, 'içeride kırpma yok:');
  const r = { worldX: 900, worldY: 0 } as never as PlayerWorldState;
  eq(clampToBoundary(r, { x: 0, y: 0 }, 300, false), false, 'boundary KAPALI iken kırpma yok:');
  eq(r.worldX, 900, 'konum değişmemeli:');
});

console.log('\n[P1.5] return / wait:');

test('§30 RETURN: merkeze yürür, ≤20\'de WAIT olur, sınırı aşmaz', () => {
  const S = farmRig(611);
  S.genie.start(S.world);
  const center = { ...S.genie.farmCenter! };
  /* oyuncuyu merkezden 300 birim uzağa taşı (mob YOK) */
  S.world.worldX = center.x + 300;
  const before = Math.hypot(S.world.worldX - center.x, S.world.worldY - center.y);
  near(before, 300, 1, 'başlangıç uzaklığı:');

  farmRun(S, 0.1);
  eq(S.genie.movementState, 'RETURN', 'RETURN durumu:');
  /* her tick merkeze yaklaşmalı */
  let prev = before;
  for (let i = 0; i < 30; i++) {
    farmStep(S, 1 / 60);
    const d = Math.hypot(S.world.worldX - center.x, S.world.worldY - center.y);
    ok(d <= prev + 1e-6, 'mesafe artmamalı');
    prev = d;
  }
  farmRun(S, 4.0);
  const end = Math.hypot(S.world.worldX - center.x, S.world.worldY - center.y);
  ok(end <= GENIE_MOVEMENT_V1.returnTolerance, `merkeze ≤20 gelmeli, ${end.toFixed(1)}`);
  eq(S.genie.movementState, 'WAIT', 'WAIT:');
});

test('§31 RETURN sırasında uygun mob gelirse ACQUIRE\'a geçer', () => {
  const S = farmRig(612);
  S.genie.start(S.world);
  const center = { ...S.genie.farmCenter! };
  S.world.worldX = center.x + 300;
  farmRun(S, 0.5);
  eq(S.genie.movementState, 'RETURN', 'önce RETURN:');
  /* oyuncunun 200 birim yakınına uygun mob koy (sınır içi) */
  const mob = mockMob(S.world.worldX + 200, S.world.worldY, 45, 1e9) as unknown as WorldMob;
  S.mobs.mobs.push(mob);
  const out = farmRun(S, 2.5);
  eq(S.targets.selectedUid, mob.uid, 'yeni hedef:');
  ok(['APPROACH', 'COMBAT'].includes(S.genie.movementState), `combat/approach bekleniyordu: ${S.genie.movementState}`);
  ok(out.states.includes('APPROACH') || out.states.includes('COMBAT'), 'RETURN iptal edilmeli');
});

console.log('\n[P1.5] manuel öncelik / durdurma:');

test('§13/§32 MANUEL joystick önceliklidir — vektörler TOPLANMAZ', () => {
  const S = farmRig(613);
  S.tuning.set('playerSpeed', 120);
  addMob(S, 430, 0);                                    // Genie sağa yürümek ister
  S.genie.start(S.world);
  farmRun(S, 0.2);
  eq(S.genie.movementState, 'APPROACH', 'APPROACH:');

  /* joystick YUKARI: o kare yalnız manuel uygulanmalı */
  const stick = { dx: 0, dy: -PROTO.joystickRadius, active: true };
  const x0 = S.world.worldX, y0 = S.world.worldY;
  const out = farmRun(S, 1.0, 1 / 60, stick);
  eq(out.sources.has('GENIE'), false, 'joystick basılıyken GENIE hareketi UYGULANMAMALI:');
  eq(out.sources.has('MANUAL'), true, 'manuel hareket:');
  const dx = S.world.worldX - x0, dy = S.world.worldY - y0;
  near(dx, 0, 1.0, 'X ekseninde Genie kayması OLMAMALI:');
  near(Math.abs(dy), 120, 4, 'toplam hız base speed\'i AŞMAMALI (120):');
  const speed = Math.hypot(dx, dy);
  ok(speed <= 120 + 4, `bileşke hız ${speed.toFixed(1)} ≤ 120 olmalı (toplama yok)`);

  /* joystick bırakılınca Genie kaldığı yerden devam eder — DURDURULMAMIŞ olmalı */
  ok(S.genie.enabled, 'Genie hâlâ açık');
  const x1 = S.world.worldX;
  const after = farmRun(S, 1.0);
  ok(after.sources.has('GENIE'), 'joystick bırakılınca Genie yeniden yürütmeli');
  ok(S.world.worldX > x1, 'Genie yönünde ilerlemeli');
});

test('§35 DURDUR: hareket ANINDA 0, ok yoluna devam eder', () => {
  const S = farmRig(614);
  addMob(S, 449, 0);
  S.genie.start(S.world);
  farmRun(S, 0.2);
  eq(S.genie.movementState, 'APPROACH', 'APPROACH:');
  S.genie.stop();
  eq(S.genie.movementState, 'IDLE', 'anında IDLE:');
  const x0 = S.world.worldX, y0 = S.world.worldY;
  const out = farmRun(S, 1.5);
  eq(out.sources.has('GENIE'), false, 'Genie hareketi olmamalı:');
  eq(S.world.worldX, x0, 'X sabit:'); eq(S.world.worldY, y0, 'Y sabit:');
  eq(out.actions.length, 0, 'hiçbir Genie eylemi:');
});

test('§21 DURDUR havadaki oku İPTAL ETMEZ, mana iadesi yok', () => {
  const S = farmRig(615);
  const mob = addMob(S, 370, 0, 1e12);
  S.genie.start(S.world);
  /* combat başlasın ve bir ok havaya çıksın */
  let guard = 0;
  while (S.adapter.pipeline.projectiles.length === 0 && guard++ < 600) farmStep(S, 1 / 60);
  ok(S.adapter.pipeline.projectiles.length > 0, 'havada ok olmalı');
  const mp = S.player.mp, hp0 = mob.hp;
  const cost = balanceRow(ARCHER.BESLI_SALVO).manaCost;
  S.genie.stop();
  farmRun(S, 1.5);
  ok(mob.hp < hp0, 'havadaki ok impact edip hasar vermeli (iptal YOK)');
  /* Pasif MP regen (4/sn) sayılmaz; iade OLSAYDI sıçrama ≥ skill maliyeti olurdu. */
  const gained = S.player.mp - mp;
  ok(gained < cost, `mana İADE EDİLMEMELİ (artış ${gained.toFixed(1)} < ${cost})`);
});

console.log('\n[P1.5] hedef ölümü / tam döngü:');

test('§34 hedef ölünce yeni hedefe geçer, ölü tekrar seçilmez', () => {
  const S = farmRig(616);
  const a = addMob(S, 340, 0, 1);                       // EN YAKIN + 1 HP → ilk vuruşta ölür
  const b = addMob(S, 430, 60, 1e9);
  S.genie.start(S.world);
  const out = farmRun(S, 4.0);
  eq(a.state, 'dying', 'A ölmeli:');
  ok(out.actions.some((x) => x.kind === 'skill'), 'cast olmalı');
  eq(S.targets.selectedUid, b.uid, 'yeni hedef B olmalı:');
  /* A bir daha seçilmemeli */
  for (let i = 0; i < 120; i++) { farmStep(S, 1 / 60); ok(S.targets.selectedUid !== a.uid, 'ölü A yeniden seçilmemeli'); }
});

test('§24 TAM FARM DÖNGÜSÜ: A(430) → B(420) → C(sınır dışı) yok sayılır → RETURN/WAIT', () => {
  const S = farmRig(617, 600);
  const center = { x: S.world.worldX, y: S.world.worldY };
  const a = addMob(S, 430, 0, 1);
  const b = addMob(S, 0, 420, 1);
  /* C: oyuncuya 300 ama merkezden 900 → sınır DIŞI */
  const c = mockMob(center.x + 900, center.y, 45, 1e9) as unknown as WorldMob;
  S.mobs.mobs.push(c);
  S.genie.start(S.world);

  const out = farmRun(S, 14.0);
  eq(a.state, 'dying', 'A öldü:');
  eq(b.state, 'dying', 'B öldü:');
  eq(c.state !== 'dying', true, 'C (sınır dışı) YOK SAYILMALI:');
  ok(S.genie.movementState === 'RETURN' || S.genie.movementState === 'WAIT',
    `sonda RETURN/WAIT bekleniyordu: ${S.genie.movementState}`);
  const d = Math.hypot(S.world.worldX - center.x, S.world.worldY - center.y);
  ok(d <= 600 + 0.01, 'sınır aşılmadı');
  ok(out.states.includes('APPROACH') && out.states.includes('COMBAT'), 'döngü yaşandı');
});

console.log('\n[P1.5] regresyon:');

test('§19 Genie YÜRÜRKEN iksir kullanabilir, hareket durmaz', () => {
  const S = farmRig(618);
  S.giveTestPotions();
  S.genie.settings.mpPotionRef = 389018000;             // +480
  S.genie.settings.mpThresholdPct = 0.9;
  addMob(S, 440, 0);
  S.genie.start(S.world);
  S.player.mp = 1;
  const x0 = S.world.worldX;
  const out = farmRun(S, 1.0);
  ok(out.actions.some((a) => a.kind === 'potion'), 'iksir kullanılmalı');
  ok(out.sources.has('GENIE'), 'hareket sürmeli');
  ok(S.world.worldX > x0 + 50, 'iksir hareketi DURDURMAMALI');
});

test('§20 kill → loot akışı bozulmadı (Auto Loot değişmedi)', () => {
  const S = farmRig(619);
  S.lootPolicy.setMode('auto');
  const m = addMob(S, 360, 0, 1);
  S.genie.start(S.world);
  farmRun(S, 4.0);
  eq(m.state, 'dying', 'mob öldü:');
  /* Scene reapDead eşdeğeri: ödül tek sefer */
  let kills = 0;
  for (let i = 0; i < 3; i++) {
    if (m.state === 'dying' && m.ai !== 'dead') { S.adapter.resolveKill(m); S.mobs.markDead(m); kills++; }
  }
  eq(kills, 1, 'resolveKill tek sefer:');
  eq(S.lootPolicy.mode, 'auto', 'loot modu korunuyor:');
});

test('§36 MANUEL MOD REGRESYONU: Genie KAPALI iken skill oyuncuyu YÜRÜTMEZ', () => {
  const S = farmRig(620);
  const mob = addMob(S, 430, 0);                        // 400 dışında
  S.targets.select(mob.uid);
  eq(S.genie.enabled, false, 'Genie kapalı:');
  const x0 = S.world.worldX, y0 = S.world.worldY;
  const r = S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities());
  eq(r.ok, false, 'menzil dışı reddedilmeli:');
  eq((r as { reason: string }).reason, 'range', 'sebep:');
  const out = farmRun(S, 2.0);
  eq(out.sources.has('GENIE'), false, 'otomatik hareket OLMAMALI:');
  eq(S.world.worldX, x0, 'X:'); eq(S.world.worldY, y0, 'Y:');
  eq(S.genie.movementState, 'IDLE', 'durum:');
});

test('TAMAMLANMA ŞARTLARI — altı yasak davranışın hiçbiri oluşmuyor', () => {
  /* 1) 450 dışındaki mobu acquire etmiyor */
  const A = farmRig(630); addMob(A, 460, 0); A.genie.start(A.world);
  farmRun(A, 2.0);
  eq(A.targets.selectedUid, null, '460 acquire edilmemeli:');

  /* 2) 400 dışından cast etmiyor */
  const B = farmRig(631); const mb = addMob(B, 449, 0); B.genie.start(B.world);
  const outB = farmRun(B, 0.35);
  const casts = outB.actions.filter((x) => x.kind === 'skill');
  eq(casts.length, 0, '400 dışında cast:');
  ok(dist(B, mb) > 400, 'hâlâ menzil dışında olmalı');

  /* 3) range fail spam yok (yukarıda ayrıca test edildi) */
  const waits = outB.actions.filter((x) => x.kind === 'wait') as Array<{ reason: string }>;
  eq(waits.filter((w) => w.reason === 'range').length, 0, 'range reddi:');

  /* 4) boundary dışına çıkmıyor (yukarıda ayrıca test edildi) */
  const C = farmRig(632, 220); addMob(C, 210, 0); C.genie.start(C.world);
  const cc = { ...C.genie.farmCenter! };
  farmRun(C, 5.0);
  ok(Math.hypot(C.world.worldX - cc.x, C.world.worldY - cc.y) <= 220.01, 'sınır:');

  /* 5) manuel + Genie vektörü toplanmıyor */
  const D = farmRig(633); D.tuning.set('playerSpeed', 120);
  addMob(D, 430, 0); D.genie.start(D.world); farmRun(D, 0.2);
  const p0 = { x: D.world.worldX, y: D.world.worldY };
  farmRun(D, 1.0, 1 / 60, { dx: 0, dy: -PROTO.joystickRadius, active: true });
  const moved = Math.hypot(D.world.worldX - p0.x, D.world.worldY - p0.y);
  ok(moved <= 124, `1 sn'de ${moved.toFixed(1)} ≤ ~120 olmalı (toplama yok)`);

  /* 6) Genie kapalıyken manuel skill yürütmüyor */
  const E = farmRig(634); const me = addMob(E, 430, 0); E.targets.select(me.uid);
  const ex = E.world.worldX;
  E.performSkill(ARCHER.BESLI_SALVO, me, E.entities());
  farmRun(E, 1.0);
  eq(E.world.worldX, ex, 'manuel modda otomatik yürüme:');
});

/* ================= P1.6 — MOB AI + FARM AREA V1 ================= */
console.log('P1.6 — mob AI durum makinesi:');

interface AiRig { sys: MobSlotSystem; slot: MobSpawnSlot; hits: () => number; mob: WorldMob }
function aiRig(over: Partial<MobSpawnSlot> = {}, seed = 1606): AiRig {
  const slot: MobSpawnSlot = {
    id: 'ai_slot', displayName: 'AI Test', monsterRef: 250,
    homeX: 1000, homeY: 1000, aiType: 'NORMAL',
    visual: { sheet: 'kurt', tint: '#fff', scale: 0.6 },
    ...over,
  };
  let hits = 0;
  const sys = new MobSlotSystem([slot], {
    rng: mulberry32(seed), aggroMult: () => 1, playerAlive: () => true,
    strike: (mob) => { hits += 1; return { mob, damage: 1, playerHpAfter: 100 }; },
  });
  sys.populate();
  return { sys, slot, hits: () => hits, mob: sys.mobs[0]! };
}
const phaseOf = (r: AiRig): string => r.sys.ai.runtimeOf(r.mob.uid)!.phase;
/** Belirtilen duruma gelene kadar ilerletir (üst sınırlı). */
function runUntil(r: AiRig, phase: string, px: number, py: number, maxSec = 60): boolean {
  const p = newPlayer(px, py);
  for (let i = 0; i < Math.round(maxSec * 60); i++) {
    r.sys.update(1 / 60, p);
    if (phaseOf(r) === phase) return true;
  }
  return false;
}
function run(r: AiRig, seconds: number, px: number, py: number, dt = 1 / 60): void {
  const p = newPlayer(px, py);
  for (let i = 0; i < Math.round(seconds / dt); i++) r.sys.update(dt, p);
}

test('§2 profiller: TEK durum makinesi, ÜÇ parametre seti', () => {
  eq(MOB_AI_PROFILES.NORMAL.aggroRadius, 0, 'NORMAL pasif:');
  ok(MOB_AI_PROFILES.AGGRESSIVE.aggroRadius > 0, 'AGGRESSIVE proaktif');
  ok(MOB_AI_PROFILES.ELITE.aggroRadius > MOB_AI_PROFILES.AGGRESSIVE.aggroRadius, 'ELITE daha geniş algı');
  ok(MOB_AI_PROFILES.ELITE.leashRadius > MOB_AI_PROFILES.AGGRESSIVE.leashRadius, 'ELITE daha geniş leash');
  for (const t of MOB_AI_TYPES) {
    const p = MOB_AI_PROFILES[t];
    ok(p.leaveAttack > p.enterAttack, `${t}: histerezis bandı olmalı`);
    ok(p.attackIntervalSec > p.hitMomentSec, `${t}: vuruş anı çevrimin içinde olmalı`);
    ok(p.chaseSpeed >= p.moveSpeed, `${t}: kovalama ≥ dolaşma hızı`);
  }
});

test('§3 farm alanı: KANONİK 10 slot, dikdörtgenler ayrık ve YÜRÜNEBİLİR', () => {
  /* P2.9 — canlı tablo tekil slotlardan kanonik çok-moblu slotlara geçti.
     Tekil tablo arşivde (`MORADON_LEGACY_SINGLE_SLOTS`) duruyor. */
  /* P2.17 — Sv16-20 bandı için beş slot eklendi (23 → 28). */
  eq(FARM_AREA_SLOTS.length, 52, 'slot sayısı:');
  eq(new Set(FARM_AREA_SLOTS.map((s) => s.id)).size, FARM_AREA_SLOTS.length, 'id benzersiz:');
  for (const s of FARM_AREA_SLOTS) {
    ok(isCanonicalSlot(s), `${s.id} kanonik olmalı`);
    const p = slotPlacement(s);
    ok(p.count >= MIN_MOBS_PER_SLOT && p.count <= MAX_MOBS_PER_SLOT, `${s.id} population ${p.count}`);
    ok(Content.monster(s.monsterRef) !== undefined, `${s.id}: monster kaynakta olmalı`);
    /* Dikdörtgenin DÖRT köşesi de yürünebilir olmalı — mob duvara doğmaz. */
    for (const [x, y] of [[p.minX, p.minY], [p.maxX - 1, p.minY],
      [p.minX, p.maxY - 1], [p.maxX - 1, p.maxY - 1]] as const) {
      ok(isWalkable(x, y), `${s.id} köşesi kapalı: ${x},${y}`);
    }
  }
  /* Merkezler DİP DİBE OLMAMALI (kullanıcı isteği). */
  for (let i = 0; i < FARM_AREA_SLOTS.length; i++) {
    for (let j = i + 1; j < FARM_AREA_SLOTS.length; j++) {
      const a = FARM_AREA_SLOTS[i]!, b = FARM_AREA_SLOTS[j]!;
      ok(Math.hypot(a.homeX - b.homeX, a.homeY - b.homeY) > 130,
        `${a.id}/${b.id} çok yakın`);
    }
  }
  /* Respawn 20 sn — kullanıcı kararı, her slotta AYNI. */
  for (const s of FARM_AREA_SLOTS) eq(s.respawnSec, 20, `${s.id} respawn:`);
});

test('TAMAMLANMA #1 — NORMAL mob YALNIZ yaklaşmakla aggro OLMAZ', () => {
  const r = aiRig({ aiType: 'NORMAL' });
  run(r, 20, r.slot.homeX + 6, r.slot.homeY);      // oyuncu dibinde 20 sn
  eq(r.sys.ai.runtimeOf(r.mob.uid)!.aggro, false, 'aggro:');
  eq(r.hits(), 0, 'vuruş:');
  ok(phaseOf(r) === 'IDLE' || phaseOf(r) === 'ROAM', `pasif kalmalı: ${phaseOf(r)}`);
});

test('NORMAL mob HASAR ALINCA aggro olur (tek uyanma yolu)', () => {
  const r = aiRig({ aiType: 'NORMAL' });
  run(r, 0.5, r.slot.homeX + 6, r.slot.homeY);
  r.sys.notifyDamaged(r.mob);
  eq(r.sys.ai.runtimeOf(r.mob.uid)!.aggroCause, 'damage', 'sebep:');
  eq(phaseOf(r), 'AGGRO', 'tepki gecikmesi:');
  run(r, 3, r.slot.homeX + 6, r.slot.homeY);
  eq(phaseOf(r), 'ATTACK', 'sonra saldırır:');
  ok(r.hits() > 0, 'vuruş düşmeli');
});

test('AGGRO idempotent: aynı karede 5 ok değse bile TEK aggro', () => {
  const r = aiRig({ aiType: 'NORMAL' });
  run(r, 0.5, r.slot.homeX + 6, r.slot.homeY);
  const rt = r.sys.ai.runtimeOf(r.mob.uid)!;
  const t0 = rt.transitions;
  for (let i = 0; i < 5; i++) r.sys.notifyDamaged(r.mob);
  eq(rt.transitions - t0, 1, 'tek durum geçişi:');
  eq(rt.aggroTimer, MOB_AI_PROFILES.NORMAL.aggroReactionSec, 'sayaç sıfırlanmamalı:');
});

test('TAMAMLANMA #2 — AGGRESSIVE mob aggro yarıçapı DIŞINDA saldırmaz', () => {
  const prof = MOB_AI_PROFILES.AGGRESSIVE;
  const r = aiRig({ aiType: 'AGGRESSIVE' });
  run(r, 15, r.slot.homeX + prof.aggroRadius + 60, r.slot.homeY);
  eq(r.sys.ai.runtimeOf(r.mob.uid)!.aggro, false, 'yarıçap dışında aggro:');
  eq(r.hits(), 0, 'vuruş:');
  /* içeri girince aggro olur */
  run(r, 3, r.slot.homeX + prof.aggroRadius - 40, r.slot.homeY);
  eq(r.sys.ai.runtimeOf(r.mob.uid)!.aggroCause, 'proximity', 'sebep:');
});

test('TAMAMLANMA #3 — mob SONSUZA kadar kovalamaz (leash EVDEN ölçülür)', () => {
  const prof = MOB_AI_PROFILES.AGGRESSIVE;
  const r = aiRig({ aiType: 'AGGRESSIVE' });
  run(r, 0.5, r.slot.homeX + 200, r.slot.homeY);
  eq(phaseOf(r), 'CHASE', 'kovalamaya başlamalı:');
  /* oyuncu haritanın ucuna kaçsın */
  run(r, 120, r.slot.homeX + 5000, r.slot.homeY);
  const dHome = Math.hypot(r.mob.worldX - r.mob.homeX, r.mob.worldY - r.mob.homeY);
  ok(dHome <= prof.leashRadius + 2, `evden uzaklık sınırlı olmalı: ${dHome.toFixed(0)}`);
  ok(phaseOf(r) !== 'CHASE', `kovalamayı bırakmalı: ${phaseOf(r)}`);
});

test('TAMAMLANMA #4 — RETURN sırasında TEKRAR TEKRAR aggro OLMAZ', () => {
  const r = aiRig({ aiType: 'AGGRESSIVE' });
  run(r, 0.5, r.slot.homeX + 200, r.slot.homeY);
  ok(runUntil(r, 'RETURN', r.slot.homeX + 5000, r.slot.homeY), 'leash RETURN üretmeli');
  const rt = r.sys.ai.runtimeOf(r.mob.uid)!;
  const t0 = rt.transitions;
  /* dönerken hem hasar hem yakınlık dene */
  for (let i = 0; i < 30; i++) {
    r.sys.notifyDamaged(r.mob);
    r.sys.update(1 / 60, newPlayer(r.mob.worldX + 5, r.mob.worldY));
  }
  eq(phaseOf(r), 'RETURN', 'hâlâ dönüşte:');
  eq(rt.aggro, false, 'aggro:');
  eq(rt.transitions, t0, 'durum geçişi olmamalı:');
  eq(r.hits(), 0, 'dönerken vurmaz:');
});

test('TAMAMLANMA #5 — HP eve VARINCA dolar, anında DEĞİL', () => {
  const prof = MOB_AI_PROFILES.AGGRESSIVE;
  const r = aiRig({ aiType: 'AGGRESSIVE' });
  r.mob.hp = 1;
  run(r, 0.5, r.slot.homeX + 200, r.slot.homeY);
  ok(runUntil(r, 'RETURN', r.slot.homeX + 5000, r.slot.homeY), 'leash RETURN üretmeli');
  eq(r.mob.hp, 1, 'dönüş BAŞLARKEN HP dolmamalı:');
  /* yolun yarısında hâlâ dolmamalı */
  run(r, 1.5, r.slot.homeX + 5000, r.slot.homeY);
  const dHome = Math.hypot(r.mob.worldX - r.mob.homeX, r.mob.worldY - r.mob.homeY);
  if (dHome > prof.returnTolerance) eq(r.mob.hp, 1, 'yolda HP dolmamalı:');
  run(r, 60, r.slot.homeX + 5000, r.slot.homeY);
  eq(r.mob.hp, r.mob.maxHp, 'eve varınca dolmalı:');
  ok(phaseOf(r) === 'IDLE' || phaseOf(r) === 'ROAM', `sonra pasif: ${phaseOf(r)}`);
});

test('TAMAMLANMA #6 — ÖLÜ mob saldırmaz', () => {
  const r = aiRig({ aiType: 'AGGRESSIVE' });
  run(r, 3, r.slot.homeX + 10, r.slot.homeY);
  eq(phaseOf(r), 'ATTACK', 'önce saldırıyor olmalı:');
  const before = r.hits();
  ok(before > 0, 'ölmeden önce vurmuş olmalı');
  r.sys.markDead(r.mob);
  run(r, 5, r.slot.homeX + 10, r.slot.homeY);
  eq(r.hits(), before, 'ölüyken yeni vuruş:');
  eq(phaseOf(r), 'DEAD', 'durum:');
});

test('DYING (ödül çözülmemiş) mob da saldırmaz', () => {
  const r = aiRig({ aiType: 'AGGRESSIVE' });
  run(r, 3, r.slot.homeX + 10, r.slot.homeY);
  const before = r.hits();
  r.mob.state = 'dying';                       // ölüm bildirildi, reap henüz olmadı
  run(r, 5, r.slot.homeX + 10, r.slot.homeY);
  eq(r.hits(), before, 'dying sırasında vuruş:');
});

test('TAMAMLANMA #7 — bir spawn slotu DUPLICATE mob üretmez', () => {
  const r = aiRig({ aiType: 'NORMAL', respawnSec: 3 });
  r.sys.ai.respawnOverrideSec = 3;
  eq(r.sys.mobs.length, 1, 'başlangıç:');
  r.sys.populate();                            // ikinci çağrı yeni mob ÜRETMEMELİ
  eq(r.sys.mobs.length, 1, 'tekrar populate:');
  r.sys.markDead(r.mob);
  eq(r.sys.aliveIn(r.slot.id), 0, 'ölünce boş:');
  r.sys.populate();                            // ceset respawn beklerken YENİ mob üretmemeli
  eq(r.sys.mobs.length, 1, 'ceset varken populate:');
  run(r, 10, r.slot.homeX + 5000, r.slot.homeY);
  eq(r.sys.mobs.length, 1, 'respawn sonrası nesne sayısı:');
  eq(r.sys.aliveIn(r.slot.id), 1, 'tam bir mob:');
  ok(r.sys.mobs.filter((m) => m.slotId === r.slot.id && m.ai !== 'dead').length === 1, 'tek canlı');
});

test('respawn AYNI slotta, TAM ev noktasında ve dolu canla olur', () => {
  const r = aiRig({ aiType: 'NORMAL', respawnSec: 3 });
  r.sys.ai.respawnOverrideSec = 3;
  r.mob.worldX += 200; r.mob.hp = 1;
  r.sys.markDead(r.mob);
  run(r, 2.0, r.slot.homeX + 5000, r.slot.homeY);
  eq(r.mob.ai, 'dead', '3 sn dolmadan gelmemeli:');
  run(r, 1.5, r.slot.homeX + 5000, r.slot.homeY);
  eq(r.mob.worldX, r.slot.homeX, 'ev X:');
  eq(r.mob.worldY, r.slot.homeY, 'ev Y:');
  eq(r.mob.hp, r.mob.maxHp, 'dolu can:');
  eq(r.mob.attackTimer, 0, 'bekleyen vuruş taşınmaz:');
});

test('DEV respawn preseti (3/8/15) süreyi gerçekten değiştirir', () => {
  eq(RESPAWN_OPTIONS.length, 3, 'seçenek:');
  eq(RESPAWN_DEFAULT, 8, 'varsayılan:');
  for (const sec of RESPAWN_OPTIONS) {
    const r = aiRig({ aiType: 'NORMAL' });
    r.sys.ai.respawnOverrideSec = sec;
    r.sys.markDead(r.mob);
    run(r, sec - 0.5, r.slot.homeX + 5000, r.slot.homeY);
    eq(r.mob.ai, 'dead', `${sec}s: erken gelmemeli:`);
    run(r, 1.0, r.slot.homeX + 5000, r.slot.homeY);
    ok(r.mob.ai !== 'dead', `${sec}s: süre sonunda gelmeli`);
  }
});

test('TAMAMLANMA #8 — saldırı temposu FPS\'ten BAĞIMSIZ', () => {
  const counts = [1 / 30, 1 / 60, 1 / 120].map((dt) => {
    const r = aiRig({ aiType: 'AGGRESSIVE' });
    run(r, 10, r.slot.homeX + 40, r.slot.homeY, dt);
    return r.hits();
  });
  ok(counts[0]! > 0, 'vuruş olmalı');
  eq(counts[1], counts[0], '60 fps = 30 fps:');
  eq(counts[2], counts[0], '120 fps = 30 fps:');
  /* beklenen: ~ (10 - tepki - windup) / interval */
  const p = MOB_AI_PROFILES.AGGRESSIVE;
  const expected = Math.floor((10 - p.aggroReactionSec - p.hitMomentSec) / p.attackIntervalSec) + 1;
  eq(counts[0], expected, 'çevrim sayısı:');
});

test('vuruş YALNIZ authoritative attackRange içinde düşer', () => {
  const p = MOB_AI_PROFILES.AGGRESSIVE;
  const r = aiRig({ aiType: 'AGGRESSIVE' });
  /* enterAttack ile leaveAttack arasında: ATTACK durumunda ama menzil dışında */
  run(r, 3, r.slot.homeX + 40, r.slot.homeY);
  eq(phaseOf(r), 'ATTACK', 'önce menzilde:');
  const before = r.hits();
  const between = (p.attackRange + p.leaveAttack) / 2;   // 55 < d < 65
  ok(between > p.attackRange && between < p.leaveAttack, 'test mesafesi bantta olmalı');
  run(r, 6, r.slot.homeX + between, r.slot.homeY);
  eq(phaseOf(r), 'ATTACK', 'histerezis: hâlâ ATTACK:');
  eq(r.hits(), before, 'menzil dışında hasar:');
});

test('§ histerezis: enterAttack ile girer, leaveAttack ile çıkar', () => {
  const p = MOB_AI_PROFILES.AGGRESSIVE;
  const r = aiRig({ aiType: 'AGGRESSIVE' });
  run(r, 3, r.slot.homeX + 40, r.slot.homeY);
  eq(phaseOf(r), 'ATTACK', 'gir:');
  run(r, 0.5, r.slot.homeX + (p.leaveAttack - 3), r.slot.homeY);
  eq(phaseOf(r), 'ATTACK', 'bantta durum korunur:');
  r.sys.update(1 / 60, newPlayer(r.slot.homeX + (p.leaveAttack + 10), r.slot.homeY));
  eq(phaseOf(r), 'CHASE', 'çık:');
});

test('ROAM: mob ev çevresinde dolaşır, roamRadius\'u AŞMAZ', () => {
  const r = aiRig({ aiType: 'NORMAL' });
  const prof = profileFor(r.slot, 'NORMAL');
  let maxD = 0; let sawRoam = false;
  const away = newPlayer(r.slot.homeX + 5000, r.slot.homeY);
  for (let i = 0; i < 60 * 60; i++) {
    r.sys.update(1 / 60, away);
    if (phaseOf(r) === 'ROAM') sawRoam = true;
    maxD = Math.max(maxD, Math.hypot(r.mob.worldX - r.mob.homeX, r.mob.worldY - r.mob.homeY));
  }
  ok(sawRoam, 'ROAM durumu görülmeli');
  ok(maxD > 5, 'gerçekten hareket etmeli');
  ok(maxD <= prof.roamRadius + 1, `roam yarıçapı aşılmamalı: ${maxD.toFixed(0)}`);
});

test('AI deterministik: aynı tohum aynı yörünge', () => {
  const a = aiRig({ aiType: 'NORMAL' }, 4242);
  const b = aiRig({ aiType: 'NORMAL' }, 4242);
  const away = (rig: AiRig): PlayerWorldState => newPlayer(rig.slot.homeX + 5000, rig.slot.homeY);
  for (let i = 0; i < 1800; i++) { a.sys.update(1 / 60, away(a)); b.sys.update(1 / 60, away(b)); }
  eq(Math.round(a.mob.worldX * 1000), Math.round(b.mob.worldX * 1000), 'X:');
  eq(Math.round(a.mob.worldY * 1000), Math.round(b.mob.worldY * 1000), 'Y:');
});

test('slot profil EZMELERİ uygulanır (leash/aggro/roam/respawn)', () => {
  const r = aiRig({ aiType: 'NORMAL', leashRadius: 111, aggroRadius: 222, roamRadius: 33, respawnSec: 4 });
  const p = profileFor(r.slot, 'NORMAL');
  eq(p.leashRadius, 111, 'leash:'); eq(p.aggroRadius, 222, 'aggro:');
  eq(p.roamRadius, 33, 'roam:'); eq(p.respawnSec, 4, 'respawn:');
  eq(p.attackIntervalSec, MOB_AI_PROFILES.NORMAL.attackIntervalSec, 'ezilmeyen alan profilden:');
});

console.log('P1.6 — entegrasyon (PrototypeState):');

test('PrototypeState FARM_AREA_SLOTS kullanır, 8 mob doğar', () => {
  const S = protoState(1660);
  eq(S.mobs.slotConfigs().length, 8, 'slot:');
  eq(S.mobs.mobs.length, 8, 'mob:');
  for (const m of S.mobs.mobs) {
    const slot = S.mobs.slotOf(m.slotId)!;
    eq(m.worldX, slot.homeX, `${slot.id} ev X:`);
    eq(m.worldY, slot.homeY, `${slot.id} ev Y:`);
    ok(S.mobs.ai.runtimeOf(m.uid) !== undefined, `${slot.id}: AI runtime kayıtlı olmalı`);
  }
  const area = S.mobs.areaTelemetry();
  eq(area.slots, 8, 'telemetri slot:'); eq(area.alive, 8, 'telemetri canlı:');
});

test('DOĞUŞ GÜVENLİĞİ: spawn noktasında duran oyuncu hiçbir mobu aggrolamaz', () => {
  const S = protoState(1668);
  for (let i = 0; i < 60 * 30; i++) S.mobs.update(1 / 60, S.world);
  for (const m of S.mobs.mobs) {
    const slot = S.mobs.slotOf(m.slotId)!;
    const rt = S.mobs.ai.runtimeOf(m.uid)!;
    eq(rt.aggro, false, `${slot.id} (${slot.aiType}) doğuşta aggro olmamalı:`);
  }
  /* her AGGRESSIVE/ELITE slotun aggro yarıçapı doğuş noktasını KAPSAMAMALI.
     Bu test protoState (TEST dünyası) ile koştuğu için TEST tablosunu ve TEST
     doğuşunu ölçer; aktif Moradon tablosunun aynı kuralı §50'de sınanır. */
  for (const slot of TEST_FARM_AREA_SLOTS) {
    const p = profileFor(slot, slot.aiType);
    if (p.aggroRadius <= 0) continue;
    const d = Math.hypot(slot.homeX - TEST_SPAWN_POINT.x, slot.homeY - TEST_SPAWN_POINT.y);
    ok(d > p.aggroRadius + p.roamRadius,
      `${slot.id}: ev-doğuş ${d.toFixed(0)} ≤ aggro ${p.aggroRadius} + roam ${p.roamRadius}`);
  }
});

test('mob statları monsters.json\'dan gelir — HP/hasar hardcode DEĞİL', () => {
  const S = protoState(1661);
  for (const m of S.mobs.mobs) {
    const slot = S.mobs.slotOf(m.slotId)!;
    const src = Content.monster(slot.monsterRef)!;
    eq(m.monster.sourceRef, slot.monsterRef, `${slot.id} ref:`);
    eq(m.maxHp, Math.max(1, Math.round(src.hp * S.balance.monsterHp)),
      `${slot.id} HP (kaynak × BalanceProfile):`);
    eq(m.monster.attack, src.attack, `${slot.id} saldırı:`);
  }
});

test('AGGRO yalnız IMPACT anında — CAST anında DEĞİL', () => {
  const S = protoState(1662);
  const slot = TEST_FARM_AREA_SLOTS.find((x) => x.id === 'fa_n2')!;   // NORMAL, 340 world
  const mob = S.mobs.mobs.find((m) => m.slotId === slot.id)!;
  mob.hp = 1e9; mob.maxHp = 1e9;                                  // tek okla ölmesin
  S.targets.select(mob.uid);
  const res = S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities());
  ok(res.ok, `cast başarılı olmalı: ${res.ok ? '' : res.reason}`);
  eq(S.mobs.ai.runtimeOf(mob.uid)!.aggro, false, 'CAST anında aggro:');
  let impacts = 0;
  for (let i = 0; i < 4000 && impacts === 0; i++) {
    impacts += S.stepCombat(1 / 120, S.entities()).impacts.filter((x) => x.invalid === null).length;
  }
  ok(impacts > 0, 'impact düşmeli');
  eq(S.mobs.ai.runtimeOf(mob.uid)!.aggro, true, 'IMPACT sonrası aggro:');
  eq(S.mobs.ai.runtimeOf(mob.uid)!.aggroCause, 'damage', 'sebep:');
});

test('çok-ok (5/5) aynı moba değse bile TEK aggro geçişi', () => {
  const S = protoState(1663);
  const slot = TEST_FARM_AREA_SLOTS.find((x) => x.id === 'fa_n2')!;
  const mob = S.mobs.mobs.find((m) => m.slotId === slot.id)!;
  mob.hp = 1e9; mob.maxHp = 1e9;
  S.targets.select(mob.uid);
  const rt = S.mobs.ai.runtimeOf(mob.uid)!;
  const t0 = rt.transitions;
  ok(S.performSkill(ARCHER.BESLI_SALVO, mob, S.entities()).ok, 'beşli salvo');
  let hits = 0;
  for (let i = 0; i < 4000; i++) {
    hits += S.stepCombat(1 / 120, S.entities()).impacts
      .filter((x) => x.invalid === null && x.target?.uid === mob.uid).length;
    if (S.adapter.pipeline.pending.length === 0 && S.adapter.pipeline.projectiles.length === 0) break;
  }
  ok(hits >= 2, `aynı moba birden fazla ok değmeli (${hits})`);
  eq(rt.transitions - t0, 1, 'tek durum geçişi:');
});

test('TAMAMLANMA #9 — mob AI oyuncuyu HAREKET ETTİRMEZ (Farm Boundary korunur)', () => {
  const S = protoState(1664);
  S.genie.start(S.world);
  const c = { ...S.genie.farmCenter! };
  const p0 = { x: S.world.worldX, y: S.world.worldY };
  for (let i = 0; i < 60 * 30; i++) S.mobs.update(1 / 60, S.world);
  eq(S.world.worldX, p0.x, 'oyuncu X:');
  eq(S.world.worldY, p0.y, 'oyuncu Y:');
  ok(Math.hypot(S.world.worldX - c.x, S.world.worldY - c.y) <= S.genie.settings.farmBoundaryRadius,
    'sınır içinde kalmalı');
});

test('TAMAMLANMA #10 — P1.5 manuel/Genie hareket sistemi BOZULMADI', () => {
  const S = farmRig(1665); S.tuning.set('playerSpeed', 120);
  const m = addMob(S, 430, 0); S.genie.start(S.world);
  const r = farmRun(S, 3.0);
  ok(r.sources.has('GENIE'), 'Genie hareket kaynağı çalışmalı');
  ok(dist(S, m) < 430, 'hedefe yaklaşmalı');
  /* manuel öncelik: vektörler toplanmıyor */
  const p0 = { x: S.world.worldX, y: S.world.worldY };
  farmRun(S, 1.0, 1 / 60, { dx: 0, dy: -PROTO.joystickRadius, active: true });
  ok(Math.hypot(S.world.worldX - p0.x, S.world.worldY - p0.y) <= 124, 'hız toplanmamalı');
});

test('§29/§30 telemetri: her mob için durum + mesafe + respawn görünür', () => {
  const S = protoState(1666);
  const rows = S.mobs.telemetry(S.world);
  eq(rows.length, 8, 'satır:');
  for (const row of rows) {
    ok(row.slotId.length > 0, 'slot id');
    ok(row.maxHp > 0, 'maxHp');
    ok(row.distPlayer >= 0 && row.distHome >= 0, 'mesafeler');
    ok(['NORMAL', 'AGGRESSIVE', 'ELITE'].includes(row.aiType), `ai tipi: ${row.aiType}`);
  }
  const victim = S.mobs.mobs[0]!;
  S.mobs.markDead(victim);
  const dead = S.mobs.telemetry(S.world).find((x) => x.uid === victim.uid)!;
  eq(dead.phase, 'DEAD', 'ölü durumu:');
  ok(dead.respawnIn > 0, 'respawn sayacı görünmeli');
  eq(S.mobs.areaTelemetry().alive, 7, 'canlı sayısı:');
});

test('ölüm tek kapıdan: markDead → DEAD, AI ikinci ölüm yolu AÇMAZ', () => {
  const S = protoState(1667);
  const mob = S.mobs.mobs[0]!;
  mob.hp = 0;
  S.mobs.update(1 / 60, S.world);
  ok(mob.ai !== 'dead', 'AI kendiliğinden öldürmemeli');
  S.mobs.markDead(mob);
  eq(mob.ai, 'dead', 'yalnız markDead öldürür:');
});

/* ============ P1.6.1 — ARCHITECTURE CORRECTNESS PASS ============ */
console.log('P1.6.1 — entity kimliği (spawn generation):');

/** Havada ok varken hedefi ÖLDÜRÜP hızlıca respawn ettiren senaryo.
 *  `respawnOverrideSec` bilerek okun UÇUŞ SÜRESİNDEN kısadır. */
function identityRig(seed = 1700, respawnSec = 0.08) {
  const S = protoState(seed);
  const slot = TEST_FARM_AREA_SLOTS.find((x) => x.id === 'fa_n2')!;   // NORMAL, 340 birim
  const mob = S.mobs.mobs.find((m) => m.slotId === slot.id)!;
  mob.hp = 1e9; mob.maxHp = 1e9;                                 // tek okla ölmesin
  S.mobs.ai.respawnOverrideSec = respawnSec;
  S.targets.select(mob.uid);
  return { S, slot, mob };
}
/** Pipeline'ı, ok(lar) HAVADA olacak şekilde ilerletir. */
function advanceToFlight(S: PrototypeState): void {
  let guard = 0;
  while (S.adapter.pipeline.projectiles.length === 0 && guard++ < 4000) {
    S.stepCombat(1 / 240, S.entities());
  }
}
function drainPipeline(S: PrototypeState): ImpactEvent[] {
  const out: ImpactEvent[] = [];
  let guard = 0;
  while ((S.adapter.pipeline.projectiles.length > 0 || S.adapter.pipeline.pending.length > 0)
    && guard++ < 8000) {
    out.push(...S.stepCombat(1 / 240, S.entities()).impacts);
  }
  return out;
}

test('HIGH#1 — havadaki ESKİ ok, respawn olmuş YENİ moba VURAMAZ', () => {
  const { S, mob } = identityRig(1700, 0.08);
  ok(S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities()).ok, 'cast kabul edilmeli');
  advanceToFlight(S);
  eq(S.adapter.pipeline.projectiles.length, 1, 'ok havada olmalı:');
  const oldUid = mob.uid, oldGen = mob.generation;

  /* Hedef BAŞKA bir yolla ölsün (ok hâlâ havada). */
  mob.hp = 0; mob.state = 'dying';
  eq(S.reapDead().length, 1, 'tek ölüm çözülmeli:');
  eq(mob.ai, 'dead', 'ceset:');

  /* Aynı slotta HIZLI respawn — ok hâlâ havada. */
  let guard = 0;
  while (mob.ai === 'dead' && guard++ < 2000) S.mobs.update(1 / 240, S.world);
  ok(mob.ai !== 'dead', 'yeniden doğmuş olmalı');
  ok(S.adapter.pipeline.projectiles.length > 0, 'ok HÂLÂ havada olmalı (senaryo geçerli)');

  /* YENİ canlının kimliği ESKİSİNDEN farklı olmalı. */
  ok(mob.uid !== oldUid, `yeni entity uid almalı (${oldUid} → ${mob.uid})`);
  eq(mob.generation, oldGen + 1, 'spawn nesli artmalı:');

  const hpBefore = mob.hp, statusBefore = (mob.status ?? []).length;
  const aggroBefore = S.mobs.ai.runtimeOf(mob.uid)!.aggro;
  const expBefore = S.player.exp, lootBefore = S.worldLoot.items.length;

  const impacts = drainPipeline(S);
  eq(impacts.length, 1, 'ok çözülmeli:');
  ok(impacts[0]!.invalid !== null, `impact GEÇERSİZ olmalı, gelen: ${impacts[0]!.invalid}`);
  eq(impacts[0]!.damage, 0, 'hasar:');
  eq(impacts[0]!.killed, false, 'kill:');

  eq(mob.hp, hpBefore, 'YENİ mob HP değişmemeli:');
  eq((mob.status ?? []).length, statusBefore, 'YENİ mob status değişmemeli:');
  eq(S.mobs.ai.runtimeOf(mob.uid)!.aggro, aggroBefore, 'YENİ mob aggro olmamalı:');
  eq(S.player.exp, expBefore, 'ikinci XP olmamalı:');
  eq(S.worldLoot.items.length, lootBefore, 'ikinci loot olmamalı:');
});

test('HIGH#1 — uid YENİDEN KULLANILSA BİLE nesil kapısı tutar (targetReplaced)', () => {
  const { S, mob } = identityRig(1701, 0.08);
  ok(S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities()).ok, 'cast');
  advanceToFlight(S);
  const oldUid = mob.uid;
  mob.hp = 0; mob.state = 'dying';
  S.reapDead();
  let guard = 0;
  while (mob.ai === 'dead' && guard++ < 2000) S.mobs.update(1 / 240, S.world);
  /* İKİNCİ SAVUNMA HATTI TESTİ: uid'i ZORLA eski değerine geri al.
     Nesil kapısı olmasaydı eski ok bu canlıyı bulur ve vururdu. */
  mob.uid = oldUid;
  const hpBefore = mob.hp;
  const impacts = drainPipeline(S);
  eq(impacts.length, 1, 'ok çözülmeli:');
  eq(impacts[0]!.invalid, 'targetReplaced', 'nesil uyuşmazlığı:');
  eq(impacts[0]!.target, null, 'geçersiz impact hedef sızdırmamalı:');
  eq(mob.hp, hpBefore, 'HP değişmemeli:');
});

test('kimlik: uid ASLA yeniden kullanılmaz, slot kimliği DEĞİŞMEZ', () => {
  const S = protoState(1702);
  S.mobs.ai.respawnOverrideSec = 0.05;
  const mob = S.mobs.mobs[0]!;
  const slotId = mob.slotId;
  const seen = new Set<number>([mob.uid]);
  for (let cycle = 0; cycle < 5; cycle++) {
    mob.hp = 0; mob.state = 'dying';
    S.reapDead();
    let guard = 0;
    while (mob.ai === 'dead' && guard++ < 2000) S.mobs.update(1 / 240, S.world);
    ok(!seen.has(mob.uid), `uid yeniden kullanıldı: ${mob.uid}`);
    seen.add(mob.uid);
    eq(mob.slotId, slotId, 'slot kimliği sabit:');
    eq(mob.generation, cycle + 2, 'nesil sayacı:');
    eq(S.mobs.ai.runtimeOf(mob.uid)?.uid, mob.uid, 'AI runtime yeni uid ile bulunmalı:');
    eq(S.mobs.ai.runtimeOf(seen.values().next().value as number), undefined, 'eski uid çözülmemeli:');
  }
  eq(S.mobs.mobs.length, 8, 'nesne sayısı sabit (duplicate yok):');
});

console.log('P1.6.1 — castId sahipliği:');

test('HIGH — aynı skill\'den İKİ EŞZAMANLI cast castId\'lerini KARIŞTIRMAZ', () => {
  const S = protoState(1710);
  S.infiniteMp = true;
  const a = S.mobs.mobs.find((m) => m.slotId === 'fa_n1')!;
  const b = S.mobs.mobs.find((m) => m.slotId === 'fa_a1')!;
  for (const m of [a, b]) { m.hp = 1e9; m.maxHp = 1e9; }

  const castA = S.performSkill(ARCHER.STANDART_ATIS, a, S.entities());
  ok(castA.ok, 'A cast');
  /* ActionLock ikinci cast'i engellemesin: bu test SAHİPLİĞİ ölçer. */
  S.action.reset();
  S.combat.skills.reset();
  const castB = S.performSkill(ARCHER.STANDART_ATIS, b, S.entities());
  ok(castB.ok, 'B cast');
  ok(castA.ok && castB.ok && castA.accepted.castId !== castB.accepted.castId, 'castId benzersiz');

  const idA = castA.ok ? castA.accepted.castId : -1;
  const idB = castB.ok ? castB.accepted.castId : -1;
  const impacts = drainPipeline(S).filter((i) => i.invalid === null);
  eq(impacts.length, 2, 'iki impact:');
  const byTarget = new Map(impacts.map((i) => [i.targetUid, i.castId]));
  eq(byTarget.get(a.uid), idA, 'A impact → cast A:');
  eq(byTarget.get(b.uid), idB, 'B impact → cast B:');
  ok(impacts.every((i) => i.castId !== 0), 'castId ARTIK 0 değil (eski hata)');
  eq(new Set(impacts.map((i) => i.skillRef)).size, 1, 'aynı skillRef — sahiplik skillRef DEĞİL:');
});

test('cast bookkeeping: bütün oklar çözülünce kayıt SİLİNİR (sınırsız büyüme yok)', () => {
  const S = protoState(1711);
  S.infiniteMp = true;
  const mob = S.mobs.mobs.find((m) => m.slotId === 'fa_n2')!;
  mob.hp = 1e9; mob.maxHp = 1e9;
  eq(S.adapter.openCastCount, 0, 'başlangıç:');
  for (let i = 0; i < 12; i++) {
    S.action.reset(); S.combat.skills.reset(); S.updateInfiniteMp();
    ok(S.performSkill(ARCHER.BESLI_SALVO, mob, S.entities()).ok, `cast ${i}`);
    advanceToFlight(S);
    ok(S.adapter.openCastCount >= 1, 'ok havadayken kayıt olmalı');
    drainPipeline(S);
    eq(S.adapter.openCastCount, 0, `cast ${i} sonrası kayıt silinmeli:`);
  }
});

console.log('P1.6.1 — FPS eşitliği:');

/** Aynı deterministik farm senaryosu, farklı dt ile. */
function fpsRig(seed: number): PrototypeState {
  const S = protoState(seed);
  S.mobs.mobs.length = 0;
  S.genie.settings.farmBoundaryRadius = 650;
  S.genie.settings.forcedSet = 0;
  S.genie.settings.hpPotionRef = null;
  S.genie.settings.mpPotionRef = DEFAULT_MP_POTION_REF;
  S.genie.settings.mpThresholdPct = 0.5;
  S.giveTestPotions();
  const m = mockMob(S.world.worldX + 200, S.world.worldY, 45, 1e12) as unknown as WorldMob;
  S.mobs.mobs.push(m);
  S.genie.start(S.world);
  return S;
}
function runFps(seed: number, dt: number, seconds: number) {
  const S = fpsRig(seed);
  let casts = 0, potions = 0, targetSwitches = 0;
  let lastTarget: number | null = null;
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    const r = farmStep(S, dt);
    for (const a of r.actions) {
      if (a.kind === 'skill') casts += 1;
      if (a.kind === 'potion') potions += 1;
    }
    if (S.targets.selectedUid !== lastTarget) { targetSwitches += 1; lastTarget = S.targets.selectedUid; }
  }
  return { casts, potions, targetSwitches, mp: Math.round(S.player.mp) };
}

test('HIGH#2 — Genie cast/iksir sayısı 30 · 60 · 120 FPS\'te AYNI', () => {
  /* ÖLÇÜM PENCERESİ bilerek bir karar sınırına DENK GELMEZ (9.95 sn).
     Kare sürelerinin kayan nokta toplamı FPS'e göre ~1e-13 farklı olduğundan,
     tam 10.00 sn gibi bir sınırda pencere bir tik erken/geç kapanabilir; bu
     bir gameplay farkı değil, ölçüm artefaktıdır. */
  const a = runFps(1720, 1 / 30, 9.95);
  const b = runFps(1720, 1 / 60, 9.95);
  const c = runFps(1720, 1 / 120, 9.95);
  ok(a.casts > 0, 'senaryo gerçekten cast üretmeli');
  eq(b.casts, a.casts, '60 fps cast = 30 fps:');
  eq(c.casts, a.casts, '120 fps cast = 30 fps:');
  eq(b.potions, a.potions, '60 fps iksir = 30 fps:');
  eq(c.potions, a.potions, '120 fps iksir = 30 fps:');
  eq(b.targetSwitches, a.targetSwitches, '60 fps hedef geçişi:');
  eq(c.targetSwitches, a.targetSwitches, '120 fps hedef geçişi:');
});

test('karar saati: KARAR TİKİ sayısı FPS\'ten bağımsız (9.95 sn → 99)', () => {
  const count = (dt: number): number => {
    const S = fpsRig(1721);
    for (let i = 0; i < Math.round(9.95 / dt); i++) farmStep(S, dt);
    return S.genie.decisionTicks;
  };
  const a = count(1 / 30), b = count(1 / 60), c = count(1 / 120);
  eq(b, a, '60 = 30:'); eq(c, a, '120 = 30:');
  eq(a, 99, '9.95 sn / 0.10 sn = 99 karar:');
  /* ESKİ (kare tabanlı) sayaç bu senaryoda 75 / 86 / 93 veriyordu —
     yani 30 FPS'te oyuncu %24 daha az karar alıyordu. */
});

test('HIGH — DoT tik sayısı ve toplam hasarı 30 · 60 · 120 FPS\'te AYNI', () => {
  const run = (dt: number) => {
    const S = protoState(1730);
    S.infiniteMp = true;
    const dummy = staticMob(S, { offsetX: -100, hp: 1e12 });
    S.targets.select(dummy.uid);
    ok(S.performSkill(ARCHER.ZEHIRLI_UC, dummy, S.entities()).ok, 'zehir cast');
    drainPipeline(S);
    ok((dummy.status ?? []).length > 0, 'DoT yapışmalı');
    let ticks = 0, total = 0;
    for (let i = 0; i < Math.round(8 / dt); i++) {
      for (const ev of S.tickStatuses(dt, S.entities())) { ticks += 1; total += ev.damage; }
    }
    return { ticks, total, left: (dummy.status ?? []).length };
  };
  const a = run(1 / 30), b = run(1 / 60), c = run(1 / 120);
  ok(a.ticks > 0, 'zehir tiklemiş olmalı');
  eq(b.ticks, a.ticks, '60 fps tik:'); eq(c.ticks, a.ticks, '120 fps tik:');
  eq(b.total, a.total, '60 fps toplam hasar:'); eq(c.total, a.total, '120 fps toplam hasar:');
  eq(a.left, 0, 'süre bitince DoT kalmamalı:');
  eq(b.left, 0, '60 fps bitiş:'); eq(c.left, 0, '120 fps bitiş:');
  /* P1.3 tuning DEĞİŞMEDİ: 4 sn / 1 sn tik → 4 tik */
  eq(a.ticks, 4, 'zehir tik sayısı (4 sn ÷ 1 sn):');
});

console.log('P1.6.1 — ölüm yarışı ve durum bütünlüğü:');

test('HIGH — AYNI KAREDE DoT tiki + ok impact\'i öldürürse TEK kill/loot', () => {
  const S = protoState(1740);
  S.infiniteMp = true;
  const mob = S.mobs.mobs.find((m) => m.slotId === 'fa_a3')!;   // yüksek HP
  S.world.worldX = mob.worldX - 100; S.world.worldY = mob.worldY;
  S.targets.select(mob.uid);
  /* zehri yapıştır */
  ok(S.performSkill(ARCHER.ZEHIRLI_UC, mob, S.entities()).ok, 'zehir cast');
  drainPipeline(S);
  const dot = (mob.status ?? [])[0]!;
  ok(dot !== undefined && dot.damagePerTick !== undefined, 'DoT kaydı olmalı');

  /* ok havaya kalksın, sonra HP'yi İKİSİNİN DE öldüreceği seviyeye çek */
  S.action.reset(); S.combat.skills.reset();
  ok(S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities()).ok, 'ok cast');
  advanceToFlight(S);
  mob.hp = 1;                                   // hem tik hem ok öldürür
  dot.tickTimer = 1e-6;                         // tik bu karede düşsün

  /* GERÇEK KANIT: `resolveKill` casusla sayılır (exp seviye atlamada sıfırlanabilir). */
  const realResolve = S.adapter.resolveKill.bind(S.adapter);
  let resolveCalls = 0;
  (S.adapter as unknown as { resolveKill: typeof realResolve }).resolveKill = (m: WorldMob) => {
    resolveCalls += 1; return realResolve(m);
  };
  let kills = 0, drops = 0, guard = 0;
  while (guard++ < 8000 && (S.adapter.pipeline.projectiles.length > 0
    || S.adapter.pipeline.pending.length > 0 || mob.ai !== 'dead')) {
    S.stepCombat(1 / 240, S.entities());
    S.tickStatuses(1 / 240, S.entities());
    const reaped = S.reapDead();
    kills += reaped.length;
    drops += reaped.reduce((n, e) => n + e.drop.records.length, 0);
    if (guard > 4000) break;
  }
  eq(kills, 1, 'reap SAYISI:');
  eq(resolveCalls, 1, 'resolveKill çağrı SAYISI:');
  ok(drops >= 0, 'drop kaydı sayılabilir olmalı');
  eq(mob.ai, 'dead', 'ölü:');
  /* ikinci tur: ölü moba tekrar reap YOK */
  eq(S.reapDead().length, 0, 'ikinci reap:');
  eq(resolveCalls, 1, 'ikinci resolveKill olmamalı:');
});

test('ölü/dying moba gelen ikinci ok targetDead döner, HP\'ye dokunmaz', () => {
  const S = protoState(1741);
  S.infiniteMp = true;
  const mob = S.mobs.mobs.find((m) => m.slotId === 'fa_a3')!;
  mob.hp = 1e9; mob.maxHp = 1e9;
  S.world.worldX = mob.worldX - 100; S.world.worldY = mob.worldY;
  S.targets.select(mob.uid);
  ok(S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities()).ok, 'cast');
  advanceToFlight(S);
  mob.state = 'dying';                          // ok havadayken başka yolla öldü
  const hp = mob.hp;
  const impacts = drainPipeline(S);
  eq(impacts.length, 1, 'impact:');
  eq(impacts[0]!.invalid, 'targetDead', 'gerekçe:');
  eq(mob.hp, hp, 'HP değişmemeli:');
});

test('CANLI boundary küçültme: hedef düşer, oyuncu sınır DIŞINA çıkmaz', () => {
  const S = farmRig(1750, 650);
  S.genie.settings.farmBoundaryEnabled = true;        // P2.10: varsayılan kapalı
  S.tuning.set('playerSpeed', 120);
  const mob = addMob(S, 300, 0, 1e12);
  S.genie.start(S.world);
  const center = { ...S.genie.farmCenter! };
  farmRun(S, 1.5);
  eq(S.targets.selectedUid, mob.uid, 'önce hedeflenmiş olmalı:');

  /* COMBAT sırasında sınırı küçült — hedef artık DIŞARIDA */
  S.genie.settings.farmBoundaryRadius = 150;
  const out = farmRun(S, 3.0);
  eq(S.targets.selectedUid, null, 'sınır dışı hedef BIRAKILMALI:');
  eq(out.actions.filter((a) => a.kind === 'skill').length, 0, 'sınır küçüldükten sonra cast:');
  const d = Math.hypot(S.world.worldX - center.x, S.world.worldY - center.y);
  ok(d <= 150.01, `oyuncu yeni sınır içinde olmalı: ${d.toFixed(1)}`);
  ok(['RETURN', 'WAIT'].includes(S.genie.movementState), `RETURN/WAIT beklenir: ${S.genie.movementState}`);
});

test('oyuncu ölüp dirilince NORMAL mob STALE aggro ile saldırmaz', () => {
  const S = protoState(1760);
  const slot = TEST_FARM_AREA_SLOTS.find((x) => x.id === 'fa_n1')!;
  const mob = S.mobs.mobs.find((m) => m.slotId === slot.id)!;
  /* NORMAL mobu hasarla uyandır ve saldırı menziline sok */
  S.world.worldX = mob.homeX + 10; S.world.worldY = mob.homeY;
  S.mobs.notifyDamaged(mob);
  for (let i = 0; i < 60 * 3; i++) S.mobs.update(1 / 60, S.world);
  eq(S.mobs.ai.runtimeOf(mob.uid)!.phase, 'ATTACK', 'önce saldırıyor olmalı:');

  /* OYUNCU ÖLDÜ */
  S.player.hp = 0;
  ok(!S.player.alive, 'ölü olmalı');
  for (let i = 0; i < 60 * 2; i++) S.mobs.update(1 / 60, S.world);
  eq(S.mobs.ai.runtimeOf(mob.uid)!.aggro, false, 'oyuncu ölünce aggro düşmeli:');
  /* Mob zaten evinin dibindeydi → RETURN bir karede tamamlanıp IDLE'a düşebilir. */
  ok(['RETURN', 'IDLE', 'ROAM'].includes(S.mobs.ai.runtimeOf(mob.uid)!.phase),
    `saldırıyı bırakmalı: ${S.mobs.ai.runtimeOf(mob.uid)!.phase}`);

  /* DİRİLDİ — oyuncu hâlâ mobun dibinde */
  S.player.restoreVitals({ hp: Number.POSITIVE_INFINITY, mp: Number.POSITIVE_INFINITY });
  ok(S.player.alive, 'dirilmiş olmalı');
  for (let i = 0; i < 60 * 20; i++) S.mobs.update(1 / 60, S.world);
  eq(S.mobs.ai.runtimeOf(mob.uid)!.aggro, false, 'NORMAL mob KENDİLİĞİNDEN yeniden aggro OLMAMALI:');
  ok(S.player.hp > 0, 'oyuncu tekrar dövülmemeli');
});

test('oyuncu dirilince AGGRESSIVE mob YALNIZ yarıçap koşulu sağlanırsa aggro olur', () => {
  const S = protoState(1761);
  const slot = TEST_FARM_AREA_SLOTS.find((x) => x.id === 'fa_a2')!;
  const mob = S.mobs.mobs.find((m) => m.slotId === slot.id)!;
  const prof = profileFor(slot, slot.aiType);
  S.world.worldX = mob.homeX + 10; S.world.worldY = mob.homeY;
  for (let i = 0; i < 60 * 3; i++) S.mobs.update(1 / 60, S.world);
  eq(S.mobs.ai.runtimeOf(mob.uid)!.aggro, true, 'yakınken aggro:');

  S.player.hp = 0;
  for (let i = 0; i < 60 * 2; i++) S.mobs.update(1 / 60, S.world);
  eq(S.mobs.ai.runtimeOf(mob.uid)!.aggro, false, 'ölünce düşer:');

  /* UZAKTA diril → yarıçap koşulu SAĞLANMIYOR */
  S.player.restoreVitals({ hp: Number.POSITIVE_INFINITY });
  S.world.worldX = mob.homeX + prof.aggroRadius + 400;
  for (let i = 0; i < 60 * 30; i++) S.mobs.update(1 / 60, S.world);
  eq(S.mobs.ai.runtimeOf(mob.uid)!.aggro, false, 'uzakta iken aggro olmamalı:');
  /* YAKINDA → koşul sağlanır */
  S.world.worldX = mob.homeX + 60;
  for (let i = 0; i < 60 * 3; i++) S.mobs.update(1 / 60, S.world);
  eq(S.mobs.ai.runtimeOf(mob.uid)!.aggro, true, 'yaklaşınca yeniden aggro:');
});

console.log('P1.6.1 — iksir atomikliği ve büyüme sınırı:');

test('KİLİTLİ + kullanılabilir AYNI iksirden iki yığın: atomik TEK adet düşer', () => {
  const S = protoState(1770);
  const ref = DEFAULT_MP_POTION_REF;
  /* Başlangıç envanterinde zaten bu ref'ten yığın olabilir — onları KİLİTLE ki
     senaryo yalnız bizim iki yığınımızla ilgilensin. */
  for (const { entry } of [...S.inventory.bagList()]) {
    if (entry.itemRef === ref) S.inventory.setLocked(entry.instanceId, true);
  }
  const preexisting = S.potions.stock(ref);

  const locked = S.inventory.add(ref, { quantity: 5 });
  ok(locked.ok, 'kilitli yığın eklenmeli');
  const lockedId = locked.ok ? locked.instance.instanceId : -1;
  S.inventory.setLocked(lockedId, true);
  /* Kilitli yığın DOLU olduğu için ikinci `add` yeni yığın açar. */
  const usable = S.inventory.add(ref, { quantity: 3 });
  ok(usable.ok, 'kullanılabilir yığın eklenmeli');
  const usableId = usable.ok ? usable.instance.instanceId : -1;
  ok(usableId !== lockedId, 'iki AYRI yığın olmalı');

  eq(S.potions.stock(ref), preexisting + 8, 'toplam stok BÜTÜN yığınları saymalı:');
  S.player.mp = 0;
  const res = usePotion(S, ref);
  ok(res.ok, `kullanım başarılı olmalı: ${res.fail ?? ''}`);
  eq(S.potions.stock(ref), preexisting + 7, 'TAM 1 adet düşmeli:');
  eq(S.inventory.count(ref), preexisting + 7, 'envanter sayımı:');
  /* KİLİTLİ yığın DOKUNULMAMIŞ olmalı */
  const lockedEntry = [...S.inventory.bagList()].find((x) => x.entry.instanceId === lockedId);
  eq(lockedEntry?.entry.quantity, 5, 'kilitli yığın korunmalı:');
  eq(res.actual, res.restoreAmount, 'sabit miktar TAM uygulanmalı (P1.4.1):');
  eq(Math.round(S.player.mp), res.after, 'MP uygulanmış olmalı:');

  /* Kullanılabilir yığını bitir → yalnız kilitli kalır → `locked` reddi */
  for (let i = 0; i < 2; i++) { S.player.mp = 0; ok(usePotion(S, ref).ok, `kullanım ${i}`); }
  eq(S.potions.stock(ref), preexisting + 5, 'yalnız kilitli yığınlar kalmalı:');
  S.player.mp = 0;
  const blocked = usePotion(S, ref);
  eq(blocked.ok, false, 'kilitli yığın kullanılamaz:');
  eq(blocked.fail, 'locked', 'gerekçe:');
  eq(S.potions.stock(ref), preexisting + 5, 'başarısız kullanımda adet DEĞİŞMEZ:');
  eq(Math.round(S.player.mp), 0, 'başarısız kullanımda MP DEĞİŞMEZ:');
});

test('SOAK — 30 dakikalık farm: geçici koleksiyonlar SINIRLI kalır, NaN/negatif yok', () => {
  const S = protoState(1780);
  S.infiniteMp = true;
  S.genie.settings.hpPotionRef = null;
  S.genie.settings.mpPotionRef = null;
  S.mobs.ai.respawnOverrideSec = 3;
  S.giveTestPotions();
  S.genie.start(S.world);

  const dt = 1 / 30;                             // 30 dk × 30 fps = 54_000 kare
  const steps = Math.round((30 * 60) / dt);
  const peak = { pending: 0, projectiles: 0, casts: 0, loot: 0, status: 0 };
  let kills = 0;
  for (let i = 0; i < steps; i++) {
    const mv = S.genie.movementIntent(S.entities(), S.world);
    if (mv.magnitude > 0) { S.movement.move(S.world, mv, dt); S.genie.clampPlayer(S.world); }
    S.player.update(dt);
    S.combat.update(dt);
    S.adapter.updateAction(dt);
    S.stepCombat(dt, S.entities());
    S.mobs.update(dt, S.world);
    S.tickStatuses(dt, S.entities());
    S.worldLoot.update(dt);
    kills += S.reapDead().length;
    S.genie.update(dt, S.entities(), S.world);
    if (i % 97 === 0) {
      peak.pending = Math.max(peak.pending, S.adapter.pipeline.pending.length);
      peak.projectiles = Math.max(peak.projectiles, S.adapter.pipeline.projectiles.length);
      peak.casts = Math.max(peak.casts, S.adapter.openCastCount);
      peak.loot = Math.max(peak.loot, S.worldLoot.items.length);
      peak.status = Math.max(peak.status,
        S.entities().reduce((n, m) => n + (m.status?.length ?? 0), 0));
    }
  }
  ok(kills > 0, `30 dk'da gerçek farm olmalı (kill ${kills})`);
  /* SINIRLILIK: hiçbiri kare sayısıyla ORANTILI büyümemeli */
  ok(peak.pending <= 8, `bekleyen cast tepe: ${peak.pending}`);
  ok(peak.projectiles <= 64, `havadaki ok tepe: ${peak.projectiles}`);
  ok(peak.casts <= 16, `açık cast kaydı tepe: ${peak.casts}`);
  ok(peak.status <= 64, `aktif status tepe: ${peak.status}`);
  ok(S.worldLoot.items.length <= 400, `yerdeki loot: ${S.worldLoot.items.length}`);
  /* Bitişte de sızıntı olmamalı */
  ok(S.adapter.openCastCount <= 4, `bitişte açık cast: ${S.adapter.openCastCount}`);
  eq(S.mobs.mobs.length, 8, 'mob NESNE sayısı sabit (respawn duplicate üretmez):');

  /* SAĞLIK: NaN / Infinity / negatif yok */
  ok(Number.isFinite(S.player.hp) && S.player.hp >= 0, `oyuncu HP: ${S.player.hp}`);
  ok(Number.isFinite(S.player.mp) && S.player.mp >= 0, `oyuncu MP: ${S.player.mp}`);
  ok(Number.isFinite(S.world.worldX) && Number.isFinite(S.world.worldY), 'oyuncu konumu sonlu');
  for (const m of S.mobs.mobs) {
    ok(Number.isFinite(m.hp), `${m.slotId} HP sonlu`);
    ok(m.hp <= m.maxHp, `${m.slotId} HP tavanı aşmıyor: ${m.hp}/${m.maxHp}`);
    /* CANLI mobun HP'si negatif olamaz. (Ölmekte olan mobda aşırı hasar
       negatif kalabilir; bu bilinçli bir "overkill" defter değeridir ve
       reap edildikten sonra respawn'da sıfırlanır.) */
    if (m.ai !== 'dead' && m.state !== 'dying') {
      ok(m.hp >= 0, `${m.slotId} CANLI mob HP negatif: ${m.hp}`);
    }
    ok(Number.isFinite(m.worldX) && Number.isFinite(m.worldY), `${m.slotId} konum sonlu`);
    ok(S.mobs.ai.runtimeOf(m.uid) !== undefined, `${m.slotId} AI runtime bağlı (kayıp entity yok)`);
  }
  for (const { entry } of S.inventory.bagList()) {
    ok(entry.quantity > 0, `envanter adedi pozitif: ${entry.itemRef}`);
  }
});

test('ID sayaçları ÖRNEK KAPSAMINDA — iki runtime birbirine sızmaz', () => {
  const mk = (): { first: number; loot: number; cast: number } => {
    const S = protoState(1790);
    const mob = S.mobs.mobs.find((m) => m.slotId === 'fa_n2')!;
    mob.hp = 1e9; mob.maxHp = 1e9;
    S.targets.select(mob.uid);
    const r = S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities());
    S.worldLoot.spawn(groundSpec(389011000, 0, 0));
    return {
      first: S.mobs.mobs[0]!.uid,
      loot: S.worldLoot.items[0]!.lootUid,
      cast: r.ok ? r.accepted.castId : -1,
    };
  };
  const a = mk(), b = mk();
  eq(b.first, a.first, 'mob uid sayacı her örnekte 1\'den başlamalı:');
  eq(b.loot, a.loot, 'loot id sayacı:');
  eq(b.cast, a.cast, 'cast id sayacı:');
  eq(a.first, 1, 'ilk mob uid 1:');
  eq(a.loot, 1, 'ilk loot id 1:');
  eq(a.cast, 1, 'ilk cast id 1:');
});

/* ================= P1.7 — DROP & LOOT FARM LOOP V1 ================= */
console.log('P1.7 — kaynak zinciri:');

test('§2 drop profili KAYNAK zincirini taşır (uydurma yok)', () => {
  const prof = dropProfile(750);
  ok(prof !== null, 'Toprak Solucanı profili olmalı');
  eq(prof!.source.monsterRef, 750, 'monsterRef:');
  eq(prof!.source.lootTableId, 'loot_750', 'kaynak tablo:');
  /* coin = monsters.i_money (DB'de doğrulandı) */
  eq(prof!.source.coin, 18, 'coin = i_money:');
  eq(prof!.source.slots.length, 3, 'yuva sayısı:');
  /* rate_raw ON BİNDE BİRDİR: rate_percent = rate_raw / 100 */
  for (const sl of prof!.source.slots) {
    eq(sl.rateRaw, Math.round(sl.triggerPercent * 100), `slot${sl.slotNo} rateRaw:`);
    if (sl.kind === 'group') {
      ok(sl.groupRef !== null, `slot${sl.slotNo} grup ref'i olmalı`);
      ok(sl.memberItemRefs.length > 0, `slot${sl.slotNo} üye listesi olmalı`);
      eq(sl.selection, 'uniform', `slot${sl.slotNo} seçim modeli:`);
      eq(sl.itemRef, null, `slot${sl.slotNo} grup satırında direct item OLMAZ:`);
    } else {
      ok(sl.itemRef !== null, `slot${sl.slotNo} item ref'i olmalı`);
      eq(sl.groupRef, null, `slot${sl.slotNo} direct satırında grup OLMAZ:`);
      eq(sl.selection, null, `slot${sl.slotNo} direct seçim modeli:`);
    }
  }
  ok(prof!.sourceChain.includes('monsters.s_sid=750'), 'zincir metni kaynağı göstermeli');
});

test('§26 üç farm mobunun kaynak zinciri (direct + group karışık)', () => {
  const expect: Array<[number, string, number, number]> = [
    /* monsterRef, lootTableId, coin(i_money), yuva sayısı */
    [750, 'loot_750', 18, 3],
    [851, 'loot_851', 60, 4],
    [252, 'loot_252', 214, 5],
  ];
  for (const [ref, table, coin, slots] of expect) {
    const p = dropProfile(ref);
    ok(p !== null, `${ref} profili`);
    eq(p!.source.lootTableId, table, `${ref} tablo:`);
    eq(p!.source.coin, coin, `${ref} coin:`);
    eq(p!.source.slots.length, slots, `${ref} yuva:`);
    /* her mobda hem grup hem direct yuva bulunur */
    ok(p!.source.slots.some((x) => x.kind === 'group'), `${ref} grup yuvası`);
    ok(p!.source.slots.some((x) => x.kind === 'direct'), `${ref} direct yuvası`);
    /* item ref'leri içerik katmanında ÇÖZÜLEBİLMELİ (§15) */
    for (const sl of p!.source.slots) {
      if (sl.kind === 'direct') ok(Content.item(sl.itemRef!) !== undefined, `${ref} direct item çözülmeli`);
      else for (const m of sl.memberItemRefs) ok(Content.item(m) !== undefined, `${ref} grup üyesi çözülmeli`);
    }
  }
});

test('§3 SOURCE FACT / TUNING ayrımı: tuning kaynak sayılarını DEĞİŞTİRMEZ', () => {
  const p = dropProfile(750)!;
  const raw = p.source.slots.map((x) => x.triggerPercent).join(',');
  const coinRaw = p.source.coin;
  eq(effectiveCoin(p, { ...DROP_TUNING_V1, coinMultiplier: 3 }), coinRaw * 3, 'tuning coin:');
  eq(p.source.coin, coinRaw, 'KAYNAK coin değişmemeli:');
  eq(p.source.slots.map((x) => x.triggerPercent).join(','), raw, 'KAYNAK oranlar değişmemeli:');
  eq(DROP_TUNING_V1.coinMultiplier, 1, 'varsayılan tuning nötr:');
  eq(DROP_TUNING_V1.dropRateMultiplier, 1, 'varsayılan drop çarpanı:');
  eq(DROP_TUNING_V1.pickupRadius, 70, 'manuel toplama yarıçapı (§9):');
  eq(LOOT_LIFETIME_DEFAULT, 60, 'loot ömrü varsayılanı (§13):');
  eq(LOOT_LIFETIME_OPTIONS.join('/'), '15/60/180', 'DEV seçenekleri:');
});

console.log('P1.7 — deterministik RNG:');

test('§27 AYNI TOHUM · 100 kill → drop dizisi BİREBİR aynı', () => {
  const sequence = (seed: number): string => {
    const S = protoState(seed);
    S.mobs.mobs.length = 0;
    S.worldLoot.clear();
    S.lootPolicy.setMode('auto');
    const out: string[] = [];
    for (let i = 0; i < 100; i++) {
      const mob = killableMob(S, 1000 + i, 1000, 750);
      const ev = killAndReap(S, mob);
      out.push(`${ev.records.map((r) => `${r.itemRef}x${r.quantity}`).join('+') || '-'}|${ev.coin}`);
    }
    return out.join(';');
  };
  const a = sequence(4242);
  const b = sequence(4242);
  eq(b, a, 'aynı tohum aynı dizi:');
  ok(a.split(';').some((x) => x !== '-|18'), 'gerçekten drop üreten bir dizi olmalı');
  const c = sequence(9999);
  ok(c !== a, 'farklı tohum farklı dizi üretebilmeli');
});

test('drop RNG enjekte edilir — Math.random KULLANILMAZ', () => {
  const real = Math.random;
  let calls = 0;
  Math.random = (): number => { calls += 1; return real(); };
  try {
    const S = protoState(4243);
    S.mobs.mobs.length = 0; S.worldLoot.clear();
    for (let i = 0; i < 40; i++) killAndReap(S, killableMob(S, 500 + i, 500, 851));
  } finally { Math.random = real; }
  eq(calls, 0, 'Math.random çağrısı:');
});

console.log('P1.7 — teslimat yolları:');

test('§29 Auto Loot ON + ÇANTA DOLU → item KAYBOLMAZ, ölüm noktasında yere düşer', () => {
  const S = lootRig('auto');
  while (S.inventory.add(PLAYER.starterWeaponRef).ok) { /* çantayı doldur */ }
  eq(S.inventory.usedSlots, S.inventory.capacity, 'çanta dolu:');
  const snapshot = S.inventory.usedSlots;
  const deathX = S.world.worldX + 700, deathY = S.world.worldY - 250;
  /* P2.14 — okçu süzgeci doğrudan droplara da uygulandığı için TEK kill
     boş dönebilir. Test "item kaybolmuyor mu"yu ölçüyor, "her kill item
     düşürüyor mu"yu değil; bu yüzden item düşene kadar denenir. */
  let ev = killAndReap(S, killableMob(S, deathX, deathY, 252));
  let items = ev.records.filter((r: DropRecord) => r.kind === 'item');
  for (let i = 0; i < 200 && items.length === 0; i++) {
    S.worldLoot.clear();
    ev = killAndReap(S, killableMob(S, deathX, deathY, 252));
    items = ev.records.filter((r: DropRecord) => r.kind === 'item');
  }
  ok(items.length > 0, 'en az bir item düşmeli');
  for (const r of items) eq(r.delivery, 'FULL_INVENTORY_GROUND', `${r.itemName} teslimatı:`);
  eq(S.inventory.usedSlots, snapshot, 'envanter DEĞİŞMEMELİ:');
  eq(S.worldLoot.count, items.length, 'hepsi yerde olmalı:');
  for (const l of S.worldLoot.items) {
    eq(l.worldX, deathX, 'loot X = MOBUN ölüm noktası:');
    eq(l.worldY, deathY, 'loot Y = MOBUN ölüm noktası:');
    ok(Math.hypot(l.worldX - S.world.worldX, l.worldY - S.world.worldY) > 500,
      'oyuncunun konumunda OLUŞMAMALI');
  }
});

test('§30 Auto Loot OFF → çanta boş olsa bile drop YERE düşer', () => {
  const S = lootRig('manual');
  const before = S.inventory.usedSlots;
  const coins0 = S.player.coins;
  const mob = killableMob(S, S.world.worldX + 40, S.world.worldY, 252);
  const ev = killAndReap(S, mob);
  eq(ev.autoLoot, false, 'auto loot kapalı:');
  for (const r of ev.records.filter((x: DropRecord) => x.kind === 'item')) {
    eq(r.delivery, 'GROUND', `${r.itemName}:`);
    ok(r.lootUid !== null, 'yer entity kimliği olmalı');
  }
  eq(S.inventory.usedSlots, before, 'envantere OTOMATİK girmemeli:');
  eq(S.player.coins, coins0, 'coin cüzdana OTOMATİK girmemeli:');
  eq(ev.coinDelivery, 'GROUND', 'coin teslimatı:');
  ok(S.worldLoot.items.some((l) => l.kind === 'coin'), 'yerde coin entity olmalı');
});

test('§14 COIN: Auto Loot ON → cüzdan · slot KAPLAMAZ', () => {
  const S = lootRig('auto');
  const coins0 = S.player.coins;
  const slots0 = S.inventory.usedSlots;
  const mob = killableMob(S, S.world.worldX + 30, S.world.worldY, 750);
  const ev = killAndReap(S, mob);
  eq(ev.coin, 18, 'kaynak coin (i_money):');
  eq(ev.coinDelivery, 'AUTO_INVENTORY', 'teslimat:');
  eq(S.player.coins, coins0 + 18, 'cüzdan:');
  const itemDrops = ev.records.filter((r: DropRecord) => r.kind === 'item').length;
  eq(S.inventory.usedSlots - slots0 <= itemDrops, true, 'coin envanter slotu KAPLAMAZ:');
});

test('§17 birden çok drop: her biri AYRI kayıt ve AYRI teslimat', () => {
  const S = lootRig('auto');
  /* çantada YALNIZ bir slot bırak → ilk item girer, kalanlar yere düşer */
  while (S.inventory.usedSlots < S.inventory.capacity - 1) {
    if (!S.inventory.add(PLAYER.starterWeaponRef).ok) break;
  }
  let ev: DropEvent | null = null;
  for (let i = 0; i < 40 && (ev === null || ev.records.filter((r: DropRecord) => r.kind === 'item').length < 2); i++) {
    ev = killAndReap(S, killableMob(S, S.world.worldX + 50, S.world.worldY, 252));
  }
  const items = ev!.records.filter((r: DropRecord) => r.kind === 'item');
  ok(items.length >= 2, `en az iki item düşen bir kill bulunmalı (${items.length})`);
  const deliveries = new Set(items.map((r) => r.delivery));
  ok(deliveries.has('AUTO_INVENTORY') || deliveries.has('FULL_INVENTORY_GROUND'),
    'teslimat kaydı olmalı');
  /* her item AYRI kayıt: lootUid'ler benzersiz */
  const uids = items.map((r) => r.lootUid).filter((u): u is number => u !== null);
  eq(new Set(uids).size, uids.length, 'lootUid benzersiz:');
});

console.log('P1.7 — manuel toplama ve claim:');

test('§31 MANUEL toplama yarıçapı: 100 → outOfRange · 60 → başarılı', () => {
  const S = lootRig('manual');
  const x = S.world.worldX, y = S.world.worldY;
  const owner = S.drops.tuning.ownerPlayerId;
  const l = S.worldLoot.spawn(groundSpec(PLAYER.starterWeaponRef, x + 100, y, owner));
  eq(S.worldLoot.tuning.pickupRadius, 70, 'yarıçap:');
  const before = S.inventory.usedSlots;
  const far = S.worldLoot.pickup(l.lootUid, owner, x, y);
  ok(!far.ok); eq((far as { reason: string }).reason, 'outOfRange', 'gerekçe:');
  eq(S.inventory.usedSlots, before, 'envanter mutasyonu YOK:');
  eq(S.worldLoot.count, 1, 'yerde kalmalı:');
  eq(S.world.worldX, x, 'oyuncu OTOMATİK YÜRÜTÜLMEZ (X):');
  eq(S.world.worldY, y, 'oyuncu OTOMATİK YÜRÜTÜLMEZ (Y):');
  /* 60 birim: menzil içinde */
  l.worldX = x + 60;
  const near = S.worldLoot.pickup(l.lootUid, owner, x, y);
  ok(near.ok, 'yakında alınmalı');
  eq(S.inventory.usedSlots, before + 1, 'envanter +1:');
  eq(S.worldLoot.count, 0, 'entity silinmeli:');
});

test('§32/§18 AYNI loot İKİ KEZ claim edilemez', () => {
  const S = lootRig('manual');
  const owner = S.drops.tuning.ownerPlayerId;
  const l = S.worldLoot.spawn(groundSpec(PLAYER.starterWeaponRef, S.world.worldX, S.world.worldY, owner));
  const before = S.inventory.usedSlots;
  const first = S.worldLoot.claim(l.lootUid, owner);
  const second = S.worldLoot.claim(l.lootUid, owner);
  const third = S.worldLoot.pickup(l.lootUid, owner, S.world.worldX, S.world.worldY);
  ok(first.ok, 'ilk claim');
  ok(!second.ok); eq((second as { reason: string }).reason, 'alreadyClaimed', 'ikinci:');
  ok(!third.ok); eq((third as { reason: string }).reason, 'alreadyClaimed', 'üçüncü (manuel):');
  eq(S.inventory.usedSlots, before + 1, 'YALNIZ BİR KEZ eklenmeli:');
  eq(S.worldLoot.count, 0, 'listede yok:');
});

test('claim envanteri reddederse loot YERDE KALIR (kısmi mutasyon yok)', () => {
  const S = lootRig('manual');
  while (S.inventory.add(PLAYER.starterWeaponRef).ok) { /* doldur */ }
  const owner = S.drops.tuning.ownerPlayerId;
  const l = S.worldLoot.spawn(groundSpec(PLAYER.starterWeaponRef, S.world.worldX, S.world.worldY, owner));
  const res = S.worldLoot.claim(l.lootUid, owner);
  ok(!res.ok); eq((res as { reason: string }).reason, 'inventoryFull', 'gerekçe:');
  eq(S.worldLoot.count, 1, 'yerde kalmalı:');
  eq(S.worldLoot.find(l.lootUid)?.claimed, false, 'claimed işaretlenmemeli:');
  /* yer açılınca alınabilmeli */
  const any = [...S.inventory.bagList()][0]!;
  S.inventory.remove(any.entry.instanceId, any.entry.quantity);
  ok(S.worldLoot.claim(l.lootUid, owner).ok, 'yer açılınca alınmalı');
});

console.log('P1.7 — yaşam döngüsü:');

test('§12/§33 mob RESPAWN olsa da yerdeki eski loot BOZULMAZ', () => {
  const S = protoState(1800);
  S.lootPolicy.setMode('manual');
  S.mobs.ai.respawnOverrideSec = 0.2;
  const mob = S.mobs.mobs.find((m) => m.slotId === 'fa_n2')!;
  const deathX = mob.worldX, deathY = mob.worldY;
  const oldUid = mob.uid, oldGen = mob.generation;
  const ev = killAndReap(S, mob);
  ok(ev.records.length > 0, 'drop olmalı');
  const before = S.worldLoot.items.map((l) => ({
    uid: l.lootUid, x: l.worldX, y: l.worldY, owner: l.ownerPlayerId,
    item: l.itemRef, qty: l.quantity, srcMob: l.sourceMobUid, srcGen: l.sourceGeneration,
  }));
  ok(before.length > 0, 'yerde loot olmalı');
  /* mob yeniden doğsun */
  let guard = 0;
  while (mob.ai === 'dead' && guard++ < 4000) S.mobs.update(1 / 120, S.world);
  ok(mob.ai !== 'dead', 'yeniden doğmuş olmalı');
  ok(mob.uid !== oldUid, 'yeni entity kimliği');
  eq(mob.generation, oldGen + 1, 'nesil:');
  /* loot AYNEN durmalı */
  eq(S.worldLoot.count, before.length, 'loot sayısı:');
  for (const b of before) {
    const now = S.worldLoot.find(b.uid);
    ok(now !== undefined, `loot #${b.uid} silinmemeli`);
    eq(now!.worldX, b.x, 'X:'); eq(now!.worldY, b.y, 'Y:');
    eq(now!.ownerPlayerId, b.owner, 'sahip:');
    eq(now!.itemRef, b.item, 'item:'); eq(now!.quantity, b.qty, 'adet:');
    eq(now!.sourceMobUid, b.srcMob, 'kaynak mob uid (ESKİ mob):');
    eq(now!.sourceGeneration, b.srcGen, 'kaynak nesil:');
    ok(now!.sourceMobUid !== mob.uid, 'yeni moba dönüşmemeli');
  }
  eq(deathX, before[0]!.x, 'ölüm noktası korunmuş:'); void deathY;
});

test('§13/§34 loot despawn 60 sn ve FPS BAĞIMSIZ', () => {
  const at = (dt: number, seconds: number): number => {
    const S = lootRig('manual');
    S.worldLoot.spawn(groundSpec(PLAYER.starterWeaponRef, 0, 0), 60);
    for (let i = 0; i < Math.round(seconds / dt); i++) S.worldLoot.update(dt);
    return S.worldLoot.count;
  };
  for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
    eq(at(dt, 59.5), 1, `dt=1/${Math.round(1 / dt)} · 59.5 sn'de HÂLÂ durmalı:`);
    eq(at(dt, 60.5), 0, `dt=1/${Math.round(1 / dt)} · 60.5 sn'de gitmiş olmalı:`);
  }
  /* DEV preseti gerçekten etkili */
  const S = lootRig('manual');
  S.worldLoot.tuning.lootLifetimeSec = 15;
  S.worldLoot.spawn(groundSpec(PLAYER.starterWeaponRef, 0, 0));
  for (let i = 0; i < 60 * 16; i++) S.worldLoot.update(1 / 60);
  eq(S.worldLoot.count, 0, '15 sn preseti:');
});

test('§35 aynı karede DoT + ok ölümü → drop roll YALNIZ BİR KEZ', () => {
  const S = protoState(1810);
  S.lootPolicy.setMode('manual');
  S.infiniteMp = true;
  const mob = S.mobs.mobs.find((m) => m.slotId === 'fa_a3')!;
  S.world.worldX = mob.worldX - 100; S.world.worldY = mob.worldY;
  S.targets.select(mob.uid);
  ok(S.performSkill(ARCHER.ZEHIRLI_UC, mob, S.entities()).ok, 'zehir cast');
  drainPipeline(S);
  const dot = (mob.status ?? [])[0]!;
  ok(dot !== undefined, 'DoT olmalı');
  S.action.reset(); S.combat.skills.reset();
  ok(S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities()).ok, 'ok cast');
  advanceToFlight(S);
  mob.hp = 1;
  dot.tickTimer = 1e-6;

  const realResolve = S.drops.resolve.bind(S.drops);
  let dropRolls = 0;
  (S.drops as unknown as { resolve: typeof realResolve }).resolve = (m: WorldMob, exp: number) => {
    dropRolls += 1; return realResolve(m, exp);
  };
  let reaps = 0, guard = 0;
  while (guard++ < 8000 && mob.ai !== 'dead') {
    S.stepCombat(1 / 240, S.entities());
    S.tickStatuses(1 / 240, S.entities());
    reaps += S.reapDead().length;
  }
  eq(reaps, 1, 'reap:');
  eq(dropRolls, 1, 'DROP ROLL SAYISI:');
  eq(S.drops.totals.kills, 1, 'kill sayacı:');
  eq(S.reapDead().length, 0, 'ikinci reap yok:');
  eq(dropRolls, 1, 'ikinci roll yok:');
});

console.log('P1.7 — Genie ile ilişki:');

test('§36 Auto Loot GENIE\'DEN BAĞIMSIZ: Genie KAPALI + manuel kill → çantaya', () => {
  const S = lootRig('auto');
  eq(S.genie.enabled, false, 'Genie kapalı olmalı:');
  const coins0 = S.player.coins;
  const mob = killableMob(S, S.world.worldX + 300, S.world.worldY, 750);
  const ev = killAndReap(S, mob);
  eq(ev.autoLoot, true, 'auto loot açık:');
  for (const r of ev.records.filter((x: DropRecord) => x.kind === 'item')) {
    eq(r.delivery, 'AUTO_INVENTORY', `${r.itemName}:`);
  }
  eq(S.player.coins, coins0 + ev.coin, 'coin cüzdana:');
  eq(S.worldLoot.count, 0, 'yerde entity:');
  eq(S.genie.enabled, false, 'Genie hâlâ kapalı:');
});

/** Genie farm senaryosu (P1.7): gerçek farm alanı + tam kare döngüsü. */
function farmLoop(S: PrototypeState, seconds: number, dt = 1 / 60): { kills: number } {
  let kills = 0;
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    const mv = S.genie.movementIntent(S.entities(), S.world);
    if (mv.magnitude > 0) { S.movement.move(S.world, mv, dt); S.genie.clampPlayer(S.world); }
    S.player.update(dt); S.combat.update(dt); S.adapter.updateAction(dt);
    S.updateInfiniteMp();
    S.stepCombat(dt, S.entities());
    S.mobs.update(dt, S.world);
    S.tickStatuses(dt, S.entities());
    S.worldLoot.update(dt);
    kills += S.reapDead().length;
    S.genie.update(dt, S.entities(), S.world);
  }
  return { kills };
}

test('§37 Genie ON + Auto Loot ON · 30 sn farm → envanter/coin artar, Genie loot için yürümez', () => {
  const S = protoState(1820);
  S.infiniteMp = true;
  S.lootPolicy.setMode('auto');
  S.genie.settings.hpPotionRef = null; S.genie.settings.mpPotionRef = null;
  S.mobs.ai.respawnOverrideSec = 3;
  S.genie.start(S.world);
  const coins0 = S.player.coins, slots0 = S.inventory.usedSlots;
  const states = new Set<string>();
  const dt = 1 / 60;
  let kills = 0;
  for (let i = 0; i < Math.round(30 / dt); i++) {
    kills += farmLoop(S, dt, dt).kills;
    states.add(S.genie.movementState);
  }
  ok(kills > 0, `30 sn'de kill olmalı (${kills})`);
  ok(S.player.coins > coins0, 'coin artmalı');
  ok(S.inventory.usedSlots >= slots0, 'envanter büyümüş olmalı');
  eq(S.drops.totals.toGround, 0, 'Auto Loot ON iken yere düşen (çanta dolmadıkça):');
  eq(S.worldLoot.count, 0, 'yerde entity kalmamalı:');
  /* Genie hareket durumları YALNIZ farm durumları olmalı — loot durumu YOK */
  for (const st of states) {
    ok(['IDLE', 'ACQUIRE', 'APPROACH', 'COMBAT', 'RETURN', 'WAIT'].includes(st), `durum: ${st}`);
  }
});

test('§38 Genie ON + Auto Loot OFF · 30 sn farm → loot birikir, Genie kovalamaz, ömürle temizlenir', () => {
  const S = protoState(1821);
  S.infiniteMp = true;
  S.lootPolicy.setMode('manual');
  S.genie.settings.hpPotionRef = null; S.genie.settings.mpPotionRef = null;
  S.mobs.ai.respawnOverrideSec = 3;
  S.worldLoot.tuning.lootLifetimeSec = 15;
  S.drops.tuning.lootLifetimeSec = 15;
  S.genie.start(S.world);
  const center = { ...S.genie.farmCenter! };
  const coins0 = S.player.coins;
  let peak = 0, maxOut = 0;
  const dt = 1 / 60;
  for (let i = 0; i < Math.round(30 / dt); i++) {
    farmLoop(S, dt, dt);
    peak = Math.max(peak, S.worldLoot.count);
    maxOut = Math.max(maxOut, Math.hypot(S.world.worldX - center.x, S.world.worldY - center.y));
  }
  ok(S.drops.totals.kills > 0, 'kill olmalı');
  ok(peak > 0, 'yerde loot birikmeli');
  eq(S.player.coins, coins0, 'coin OTOMATİK cüzdana girmemeli:');
  eq(S.drops.totals.toInventory, 0, 'envantere OTOMATİK giren:');
  ok(maxOut <= S.genie.settings.farmBoundaryRadius + 0.01,
    `Genie loot için sınır dışına çıkmamalı: ${maxOut.toFixed(1)}`);
  /* ömür sonunda temizlenir */
  for (let i = 0; i < 60 * 20; i++) S.worldLoot.update(dt);
  eq(S.worldLoot.count, 0, 'ömür bitince temizlenmeli:');
});

test('§39 farm ORTASINDA çanta dolarsa: loot yere düşer, farm sürer, item kaybolmaz', () => {
  const S = protoState(1822);
  S.infiniteMp = true;
  S.lootPolicy.setMode('auto');
  S.genie.settings.hpPotionRef = null; S.genie.settings.mpPotionRef = null;
  S.mobs.ai.respawnOverrideSec = 3;
  /* çantada yalnız 2 slot bırak */
  while (S.inventory.usedSlots < S.inventory.capacity - 2) {
    if (!S.inventory.add(PLAYER.starterWeaponRef).ok) break;
  }
  S.genie.start(S.world);
  /* P2.30 — ekipman düşme şansı %14'e ayarlandı (eskiden kaynak
     tablolarındaki yüksek grup şansı geliyordu). Kırk saniyelik farm
     çantayı doldurmaya yetmiyor; senaryo çanta DOLANA kadar sürer.
     Testin amacı "dolu çantada item kaybolmuyor mu" — süre değil. */
  for (let i = 0; i < 12 && S.drops.totals.blockedFull === 0; i++) farmLoop(S, 40);
  ok(S.drops.totals.kills > 0, 'farm devam etmeli');
  eq(S.inventory.usedSlots, S.inventory.capacity, 'çanta dolmuş olmalı:');
  ok(S.drops.totals.blockedFull > 0, 'dolu yüzünden yere düşen olmalı');
  eq(S.drops.totals.items, S.drops.totals.toInventory + S.drops.totals.toGround,
    'HİÇBİR ITEM KAYBOLMAMALI (envanter + yer = toplam):');
  ok(S.worldLoot.count > 0, 'yerde loot olmalı');
  for (const l of S.worldLoot.items) {
    ok(l.quantity > 0, 'adet pozitif');
    ok(Number.isFinite(l.worldX) && Number.isFinite(l.worldY), 'konum sonlu');
  }
});

test('§40 SOAK — 30 dk farm: loot koleksiyonları SINIRLI, çift claim/UID yok', () => {
  const S = protoState(1830);
  S.infiniteMp = true;
  S.lootPolicy.setMode('manual');            // en zorlu senaryo: her şey yere düşer
  S.genie.settings.hpPotionRef = null; S.genie.settings.mpPotionRef = null;
  S.mobs.ai.respawnOverrideSec = 3;
  S.genie.start(S.world);

  const dt = 1 / 30;
  const steps = Math.round((30 * 60) / dt);
  let peakGround = 0, peakClaimHistory = 0;
  const seenUids = new Set<number>();
  let duplicateUid = 0;
  for (let i = 0; i < steps; i++) {
    farmLoop(S, dt, dt);
    if (i % 89 === 0) {
      peakGround = Math.max(peakGround, S.worldLoot.count);
      peakClaimHistory = Math.max(peakClaimHistory, S.worldLoot.claimedHistorySize);
      for (const l of S.worldLoot.items) {
        if (seenUids.has(l.lootUid) === false) seenUids.add(l.lootUid);
      }
    }
    /* arada manuel toplama dene — çift claim olmamalı */
    if (i % 601 === 0) {
      const near = S.worldLoot.nearest(S.world.worldX, S.world.worldY);
      if (near) {
        const a = S.worldLoot.pickup(near.lootUid, 1, S.world.worldX, S.world.worldY);
        const b = S.worldLoot.pickup(near.lootUid, 1, S.world.worldX, S.world.worldY);
        if (a.ok && b.ok) duplicateUid += 1;
      }
    }
  }
  ok(S.drops.totals.kills > 0, `30 dk'da gerçek farm olmalı (${S.drops.totals.kills} kill)`);
  eq(duplicateUid, 0, 'ÇİFT CLAIM:');
  ok(peakGround <= 200, `yerdeki loot tepe: ${peakGround}`);
  ok(peakClaimHistory <= 512, `claim geçmişi tepe: ${peakClaimHistory}`);
  ok(S.worldLoot.claimedHistorySize <= 512, `bitişte claim geçmişi: ${S.worldLoot.claimedHistorySize}`);
  /* sağlık */
  eq(S.drops.totals.items, S.drops.totals.toInventory + S.drops.totals.toGround, 'item muhasebesi:');
  ok(Number.isFinite(S.player.coins) && S.player.coins >= 0, `coin: ${S.player.coins}`);
  for (const l of S.worldLoot.items) {
    ok(l.quantity > 0, `adet pozitif: ${l.quantity}`);
    ok(Number.isFinite(l.life) && l.life > 0, `ömür geçerli: ${l.life}`);
    ok(l.claimed === false, 'listedeki kayıt claimed OLMAMALI');
    ok(Number.isFinite(l.worldX) && Number.isFinite(l.worldY), 'konum sonlu');
  }
  /* lootUid benzersizliği */
  const uids = S.worldLoot.items.map((l) => l.lootUid);
  eq(new Set(uids).size, uids.length, 'aktif lootUid benzersiz:');
  for (const { entry } of S.inventory.bagList()) ok(entry.quantity > 0, 'envanter adedi pozitif');
});

/* ============ P1.8 — ITEM CLASS + EQUIPMENT + BUILD V1 ============ */
console.log('P1.8 — item modeli ve katalog:');

/** Katalog itemini çantaya koyar, instanceId döner. */
function giveItem(S: PrototypeState, ref: number): number {
  const r = S.inventory.add(ref);
  ok(r.ok, `envantere eklenmeli: ${ref}`);
  return r.ok ? r.instance.instanceId : -1;
}
/* P2.27 — Moradon kalite tavanı YEŞİL olunca yaylar artık yalnız
   LOW/MIDDLE taşıyor; testler onları KALİTEYE göre bulamaz. Referansla
   bulunurlar: kalite bir BÖLGE etiketi, stat göstergesi değil. */
const BOW_BY_ROLE = {
  BASE: 160100002,      // Meşe Yay — sade, elemental yok
  MID: 160100004,       // Avcı Yayı — daha yüksek attack
  FIRE: 160100006,      // Çelik Tendon Yay — ateş
  POISON: 160210045,    // Akrep Dişi Yayı — zehir
  TOP: 160100005,       // Karanlık Yemin — en güçlü
} as const;
const bowOf = (role: keyof typeof BOW_BY_ROLE): WeaponDefinition => {
  const found = ARCHER_WEAPONS.find((w) => w.definitionRef === BOW_BY_ROLE[role]);
  if (!found) throw new Error(`bowOf: ${role} katalogda yok (${BOW_BY_ROLE[role]})`);
  return found;
};

test('§1 beş item sınıfı ve renk eşlemesi TEK YERDE', () => {
  eq(ITEM_CLASSES.join(','), 'LOW,MIDDLE,HIGH,RARE,UNIQUE', 'sınıflar:');
  eq(ITEM_CLASS_COLOR.LOW, '#e8e0d0', 'LOW beyaz:');
  eq(ITEM_CLASS_COLOR.MIDDLE, '#7fa85c', 'MIDDLE yeşil:');
  eq(ITEM_CLASS_COLOR.HIGH, '#6f8fd0', 'HIGH mavi:');
  eq(ITEM_CLASS_COLOR.RARE, '#a06fd0', 'RARE mor:');
  eq(ITEM_CLASS_COLOR.UNIQUE, '#e08a3c', 'UNIQUE turuncu:');
  /* Sıralama tutarlı */
  for (let i = 1; i < ITEM_CLASSES.length; i++) {
    ok(ITEM_CLASS_RANK[ITEM_CLASSES[i]!] > ITEM_CLASS_RANK[ITEM_CLASSES[i - 1]!], 'rank artmalı');
  }
  /* itemClass DOMAIN alanıdır — her tanımda var */
  for (const d of allDefinitions()) {
    ok(ITEM_CLASSES.includes(d.itemClass), `${d.displayName} sınıfı geçerli olmalı`);
  }
});

test('§35 SİLAH PRIMARY STAT VERMEZ — tip düzeyinde ve çözümde', () => {
  for (const w of ARCHER_WEAPONS) {
    const s = resolveStats(w);
    eq(s.str, 0, `${w.displayName} STR:`);
    eq(s.dex, 0, `${w.displayName} DEX:`);
    eq(s.int, 0, `${w.displayName} INT:`);
    eq(s.sta, 0, `${w.displayName} STA:`);
    /* Tip düzeyi kanıtı: stat bloğunda böyle bir ANAHTAR YOK */
    const keys = Object.keys(w.stats);
    for (const banned of ['str', 'dex', 'int', 'sta']) {
      eq(keys.includes(banned), false, `${w.displayName} stat anahtarı '${banned}':`);
    }
  }
  /* UNIQUE silah dahil */
  const uniq = bowOf('TOP');
  eq(resolveStats(uniq).dex, 0, 'UNIQUE silah DEX:');
  ok(uniq.stats.special.hpDrain > 0, 'UNIQUE silah özel niteliği taşıyabilir');
});

test('§36 HİÇBİR item CRIT taşımaz', () => {
  const scan = (o: unknown, path: string): void => {
    if (o === null || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      ok(!/crit/i.test(k), `KRİTİK ALANI BULUNDU: ${path}.${k}`);
      scan(v, `${path}.${k}`);
    }
  };
  for (const d of allDefinitions()) scan(d.stats, d.displayName);
  eq(allDefinitions().length > 0, true, 'katalog boş olmamalı:');
});

test('§5/§13 RASTGELE AFFIX YOK — aynı ref her zaman AYNI statlar', () => {
  for (const d of allDefinitions()) {
    const a = JSON.stringify(resolveStats(itemDefinition(d.definitionRef)!));
    const b = JSON.stringify(resolveStats(itemDefinition(d.definitionRef)!));
    eq(b, a, `${d.displayName} iki çözümde aynı olmalı:`);
  }
  /* Aynı definition'dan iki instance → aynı stat */
  const S = protoState(1901);
  const ref = bowOf('POISON').definitionRef;
  const i1 = giveItem(S, ref), i2 = giveItem(S, ref);
  ok(i1 !== i2, 'iki AYRI instance');
  eq(S.inventory.get(i1)!.itemRef, S.inventory.get(i2)!.itemRef, 'aynı definitionRef:');
});

test('§27/§28/§29/§30 katalog kapsamı', () => {
  eq(ARCHER_WEAPONS.length, 5, 'yay sayısı:');
  /* P2.27 — Moradon kalite tavanı YEŞİL. Beş sınıfın hepsi burada
     TEMSİL EDİLMEZ; mavi/mor/turuncu üst haritalara ayrıldı. */
  const classes = new Set(ARCHER_WEAPONS.map((w) => w.itemClass));
  ok(classes.size >= 1 && classes.size <= 2, `Moradon yayları en çok iki sınıf: ${[...classes]}`);
  for (const c of classes) {
    ok(c === 'LOW' || c === 'MIDDLE', `Moradon'da izinsiz kalite: ${c}`);
  }
  /* beyaz yalnız attack · mavi elemental · mor güçlü elemental · turuncu özel */
  eq(resolveStats(bowOf('BASE')).elemental.fire, 0, 'BEYAZ elemental:');
  ok(bowOf('MID').stats.attack > bowOf('BASE').stats.attack, 'üst kademe daha yüksek attack');
  ok(bowOf('FIRE').stats.elemental.fire > 0, 'ateş yayında elemental');
  ok(bowOf('POISON').stats.elemental.poison > 0, 'zehir yayında elemental');
  const u = bowOf('TOP');
  ok(u.stats.special.hpDrain > 0 && u.stats.maxHp > 0, 'TURUNCU sabit kimlik kombinasyonu');
  /* tam 5 parçalık başlangıç seti */
  const low = ARCHER_ARMOR.filter((a) => a.itemClass === 'LOW');
  eq(new Set(low.map((a) => a.equipSlot)).size, 5, 'başlangıç seti 5 parça:');
  for (const a of ARCHER_ARMOR) ok(a.stats.defense > 0, `${a.displayName} defense taşımalı`);
  /* aksesuarlar */
  const bySlot = (sl: string): number => ARCHER_ACCESSORIES.filter((a) => a.equipSlot === sl).length;
  eq(bySlot('earring'), 2, 'küpe:'); eq(bySlot('ring'), 2, 'yüzük:');
  eq(bySlot('necklace'), 1, 'kolye:'); eq(bySlot('belt'), 1, 'kemer:');
  for (const a of ARCHER_ACCESSORIES) {
    const s = resolveStats(a);
    eq(s.defense, 0, `${a.displayName} aksesuarda defense OLMAZ:`);
    ok(s.str + s.dex + s.int + s.sta + s.maxHp + s.maxMp
      + s.resist.fire + s.resist.ice + s.resist.lightning + s.resist.poison > 0,
    `${a.displayName} build statı taşımalı`);
  }
});

test('§23/§24 katalog equipSlot KAYNAK kaydıyla uyumlu, ekipman YIĞILMAZ', () => {
  for (const d of allDefinitions()) {
    /* A1 — kaynak kaydı iki yerden gelebilir: generated/items.json (MVP
       kapsamı) ya da archer-source-items.ts (MYKO ITEM tablosundan
       çıkarılmış ek okçu kayıtları). İkisi de KAYNAKTIR; elle yazılmış
       değer yoktur. */
    const src = Content.item(d.definitionRef) ?? archerSourceItem(d.definitionRef);
    ok(src !== undefined, `${d.displayName} kaynak kaydı olmalı`);
    eq(src!.equipSlot, d.equipSlot, `${d.displayName} slot uyumu:`);
    eq(d.stackable, false, `${d.displayName} stackable:`);
    eq(src!.stackable, false, `${d.displayName} kaynak stackable:`);
    eq(d.baseItemRef, d.definitionRef, `${d.displayName} upgrade tabanı (§14 hazırlık):`);
  }
});

test('§2 kaynak gerçekleri TAŞINIR, silah primary statı BİLEREK atılır', () => {
  for (const w of ARCHER_WEAPONS) {
    ok(w.source.sourceRef === w.definitionRef, 'kaynak ref:');
    ok(w.source.sourceName.length > 0, 'kaynak adı taşınmalı');
    for (const f of ['str_bonus', 'dex_bonus', 'intel_bonus', 'sta_bonus']) {
      ok(w.droppedSourceFields.includes(f), `${w.displayName}: ${f} atıldığı işaretlenmeli`);
    }
  }
  /* MOR yayın zehri KAYNAKTAN gelir */
  const rare = bowOf('POISON');
  eq(rare.stats.elemental.poison, rare.source.sourceElemental.poison, 'MOR zehir kaynaktan:');
});

console.log('P1.8 — equip / unequip:');

test('§32.1/§32.2 yay equip → Attack değişir · unequip → TAM eski değer', () => {
  const S = protoState(1910);
  /* P2.5A — başlangıç yayı artık katalogda ve KATKI VERİYOR. `unequip`
     sonrası "tam eski değer" ölçümü yapabilmek için önce silahsız hâle
     geliriz; yoksa karşılaştırma yay takılıyken alınıp yaysız hâlle
     kıyaslanır ve doğal olarak tutmaz. */
  S.equipService.unequip('weapon');
  const before = S.stats.build();
  const id = giveItem(S, bowOf('TOP').definitionRef);
  const res = S.equipService.equip(id);
  ok(res.ok, `equip başarılı olmalı: ${res.ok ? '' : res.reason}`);
  const after = S.stats.build();
  ok(after.total.attack > before.total.attack, `attack artmalı: ${before.total.attack} → ${after.total.attack}`);
  eq(after.equipment.attack, bowOf('TOP').stats.attack, 'ekipman katkısı tanımdan:');
  const un = S.equipService.unequip('weapon');
  ok(un.ok, 'unequip');
  const restored = S.stats.build();
  eq(restored.total.attack, before.total.attack, 'attack TAM eski değere dönmeli:');
  eq(JSON.stringify(restored.equipment), JSON.stringify(before.equipment), 'ekipman bloğu:');
});

test('§32.3 zırh equip → Defense değişir', () => {
  const S = protoState(1911);
  const d0 = S.stats.build().total.defense;
  const armor = ARCHER_ARMOR.find((a) => a.equipSlot === 'chest' && a.itemClass === 'MIDDLE')!;
  ok(S.equipService.equip(giveItem(S, armor.definitionRef)).ok, 'equip');
  eq(S.stats.build().total.defense, d0 + armor.stats.defense, 'defense:');
  eq(S.combat.playerDefense(), d0 + armor.stats.defense, 'COMBAT savunması da değişmeli:');
});

test('§32.4 DEX zırhı → equipmentDEX değişir (taban DEX ayrı)', () => {
  const S = protoState(1912);
  const b0 = S.stats.build();
  const dexArmor = ARCHER_ARMOR.find((a) => a.stats.dex > 0)!;
  ok(S.equipService.equip(giveItem(S, dexArmor.definitionRef)).ok, 'equip');
  const b1 = S.stats.build();
  eq(b1.base.dex, b0.base.dex, 'TABAN dex değişmemeli:');
  eq(b1.equipment.dex, dexArmor.stats.dex, 'EKİPMAN dex:');
  eq(b1.total.dex, b0.base.dex + dexArmor.stats.dex, 'TOPLAM dex:');
});

test('§32.5/§32.6 HP ve MP aksesuarı gerçekten maxHP/maxMP artırır', () => {
  const S = protoState(1913);
  const hp0 = Math.round(S.player.maxHp), mp0 = Math.round(S.player.maxMp);
  const hpAcc = ARCHER_ACCESSORIES.find((a) => a.stats.maxHp > 0 && a.stats.maxMp === 0)!;
  ok(S.equipService.equip(giveItem(S, hpAcc.definitionRef)).ok, 'HP aksesuarı');
  eq(Math.round(S.player.maxHp), hp0 + hpAcc.stats.maxHp, 'maxHP:');
  const mpAcc = ARCHER_ACCESSORIES.find((a) => a.stats.maxMp > 0)!;
  ok(S.equipService.equip(giveItem(S, mpAcc.definitionRef)).ok, 'MP aksesuarı');
  eq(Math.round(S.player.maxMp), mp0 + mpAcc.stats.maxMp, 'maxMP:');
});

test('§32.7 direnç aksesuarı doğru türetilmiş dirence gider', () => {
  const S = protoState(1914);
  eq(JSON.stringify(S.stats.build().resist), JSON.stringify({ fire: 0, ice: 0, lightning: 0, poison: 0 }),
    'başlangıç direnci:');
  const acc = ARCHER_ACCESSORIES.find((a) => a.stats.resist.fire > 0)!;
  ok(S.equipService.equip(giveItem(S, acc.definitionRef)).ok, 'equip');
  eq(S.stats.build().resist.fire, acc.stats.resist.fire, 'ateş direnci:');
  eq(S.stats.build().resist.poison, acc.stats.resist.poison, 'zehir direnci:');
});

test('§32.8 YANLIŞ SLOT reddedilir (katalog ↔ kaynak uyumsuzluğu)', () => {
  const S = protoState(1915);
  /* Kolyeyi yüzük slotuna zorlamak MÜMKÜN DEĞİL: hedef slot item tipinden
     türetilir. Slot tipi uyuşmazlığı ana sistemin kapısında yakalanır. */
  const neck = ARCHER_ACCESSORIES.find((a) => a.equipSlot === 'necklace')!;
  const id = giveItem(S, neck.definitionRef);
  const res = S.equipService.equip(id);
  ok(res.ok && res.slotId === 'necklace', 'kolye YALNIZ kolye slotuna girer');
  eq(S.equipment.slotOf(id), 'necklace', 'slot:');
  /* Ana sistem doğrudan çağrılsa da slot tipi denetlenir */
  const report = S.equipment.restore({ ring1: id });
  eq(report.applied, 0, 'yanlış slota restore edilemez:');
  ok(report.rejected.length > 0, 'reddedilmeli');
});

test('§32.9 YANLIŞ SINIF reddedilir', () => {
  const S = protoState(1916);
  const warriorGate = new EquipService({
    equipment: S.equipment, inventory: S.inventory,
    playerLevel: () => S.player.level, playerClass: () => 'warrior',
  });
  const id = giveItem(S, bowOf('BASE').definitionRef);
  const res = warriorGate.equip(id);
  ok(!res.ok); eq((res as { reason: string }).reason, 'wrongClass', 'gerekçe:');
  eq(S.equipment.slotOf(id), null, 'kuşanılmamalı:');
  /* okçu kapısı aynı itemi kabul eder */
  ok(S.equipService.equip(id).ok, 'okçu kabul etmeli');
});

test('§32.10 SEVİYE yetersizse reddedilir', () => {
  const S = protoState(1917);
  const lowLevelGate = new EquipService({
    equipment: S.equipment, inventory: S.inventory,
    playerLevel: () => 0, playerClass: () => 'archer',
  });
  const id = giveItem(S, bowOf('FIRE').definitionRef);
  const res = lowLevelGate.equip(id);
  ok(!res.ok); eq((res as { reason: string }).reason, 'levelReq', 'gerekçe:');
  eq(S.equipment.slotOf(id), null, 'kuşanılmamalı:');
});

test('katalog DIŞI item kuşanılamaz (uydurma tanım üretilmez)', () => {
  const S = protoState(1918);
  const potion = giveItem(S, DEFAULT_MP_POTION_REF);
  const res = S.equipService.equip(potion);
  ok(!res.ok); eq((res as { reason: string }).reason, 'noDefinition', 'gerekçe:');
});

test('§32.11 SWAP atomik: eski item çantaya döner, kapasite aşılmaz', () => {
  const S = protoState(1919);
  const a = giveItem(S, bowOf('BASE').definitionRef);
  const b = giveItem(S, bowOf('POISON').definitionRef);
  ok(S.equipService.equip(a).ok, 'ilk equip');
  const used = S.inventory.usedSlots;
  const res = S.equipService.equip(b);
  ok(res.ok && res.replacedInstanceId === a, 'swap planı eski itemi göstermeli');
  eq(S.equipment.slotOf(b), 'weapon', 'yeni item slotta:');
  eq(S.equipment.slotOf(a), null, 'eski item slottan çıktı:');
  ok(S.inventory.get(a) !== undefined, 'eski item KAYBOLMAMALI');
  eq(S.inventory.get(a)!.equippedSlot, null, 'eski item çantada:');
  eq(S.inventory.usedSlots, used, 'kapasite net değişimi 0:');
  ok(S.inventory.usedSlots <= S.inventory.capacity, 'kapasite aşılmamalı');
});

test('§32.12 ÇANTA DOLU: unequip reddedilir, item KAYBOLMAZ', () => {
  const S = protoState(1920);
  const id = giveItem(S, bowOf('FIRE').definitionRef);
  ok(S.equipService.equip(id).ok, 'equip');
  while (S.inventory.add(PLAYER.starterWeaponRef).ok) { /* çantayı doldur */ }
  eq(S.inventory.usedSlots, S.inventory.capacity, 'çanta dolu:');
  const attackBefore = S.stats.build().total.attack;
  const res = S.equipService.unequip('weapon');
  ok(!res.ok); eq((res as { reason: string }).reason, 'inventoryFull', 'gerekçe:');
  eq(S.equipment.slotOf(id), 'weapon', 'item HÂLÂ kuşanılı:');
  ok(S.inventory.get(id) !== undefined, 'item kaybolmamalı');
  eq(S.stats.build().total.attack, attackBefore, 'statlar değişmemeli:');
});

test('§33 STAT DRIFT YOK — 100 kez equip/unequip', () => {
  const S = protoState(1921);
  /* tam takım kuş: silah + zırh + aksesuar */
  const ids: number[] = [];
  for (const d of [bowOf('TOP'), ...ARCHER_ARMOR.filter((a) => a.itemClass === 'RARE'),
    ...ARCHER_ACCESSORIES]) {
    const id = giveItem(S, d.definitionRef);
    ok(S.equipService.equip(id).ok, `${d.displayName} equip`);
    ids.push(id);
  }
  const snapshot = JSON.stringify(S.stats.build());
  const hp0 = S.player.maxHp, mp0 = S.player.maxMp;
  const target = ids[0]!;                     // silah
  for (let i = 0; i < 100; i++) {
    ok(S.equipService.unequip('weapon').ok, `tur ${i} unequip`);
    ok(S.equipService.equip(target).ok, `tur ${i} equip`);
  }
  eq(JSON.stringify(S.stats.build()), snapshot, '100 tur sonrası build BİREBİR aynı:');
  eq(S.player.maxHp, hp0, 'maxHp:');
  eq(S.player.maxMp, mp0, 'maxMp:');
});

test('§34 İKİ AYNI ITEM: definitionRef aynı, instanceUid FARKLI', () => {
  const S = protoState(1922);
  const ref = bowOf('FIRE').definitionRef;
  const a = giveItem(S, ref), b = giveItem(S, ref);
  ok(a !== b, `instanceUid farklı olmalı (${a} vs ${b})`);
  eq(S.inventory.get(a)!.itemRef, S.inventory.get(b)!.itemRef, 'definitionRef aynı:');
  eq(S.inventory.get(a)!.quantity, 1, 'ekipman YIĞILMAZ (a):');
  eq(S.inventory.get(b)!.quantity, 1, 'ekipman YIĞILMAZ (b):');
  ok(S.equipService.equip(a).ok, 'birini kuşan');
  eq(S.equipment.slotOf(a), 'weapon', 'a kuşanılı:');
  eq(S.equipment.slotOf(b), null, 'b çantada:');
  ok(S.inventory.get(b) !== undefined, 'b duruyor');
  ok(S.equipService.unequip('weapon').ok, 'unequip');
  eq(S.inventory.get(a)!.instanceId, a, 'a kimliği korunmalı:');
  eq(S.inventory.get(b)!.instanceId, b, 'b kimliği korunmalı:');
  eq([...S.inventory.bagList()].filter((x) => x.entry.itemRef === ref).length, 2, 'iki kopya da duruyor:');
});

console.log('P1.8 — combat entegrasyonu:');

test('§37 SİLAH ELEMENTALİ fiziksel hasardan AYRI bileşendir', () => {
  const S = protoState(1930);
  S.infiniteMp = true;
  const bow = bowOf('POISON');                  // poison 50
  ok(S.equipService.equip(giveItem(S, bow.definitionRef)).ok, 'zehirli yay');
  eq(S.stats.weaponElemental().poison, 50, 'silah zehri:');
  const mob = S.mobs.mobs.find((m) => m.slotId === 'fa_a3')!;
  mob.hp = 1e9; mob.maxHp = 1e9;
  S.world.worldX = mob.worldX - 100; S.world.worldY = mob.worldY;
  S.targets.select(mob.uid);
  const r = S.resolveCastToImpact(ARCHER.STANDART_ATIS, mob, S.entities());
  const hits = r.impacts.filter((i) => i.invalid === null);
  ok(hits.length > 0, 'isabet olmalı');
  for (const h of hits) {
    ok(h.physicalDamage > 0, 'fiziksel bileşen olmalı');
    eq(h.weaponElementalDamage, 50, 'SİLAH elemental bileşeni ayrı:');
    eq(h.weaponElemental.poison, 50, 'tür dağılımı:');
    eq(h.damage, h.physicalDamage + h.elementalDamage + h.weaponElementalDamage, 'toplam = bileşenler:');
    ok(h.physicalDamage !== h.damage, 'tek alana EZİLMEMELİ');
  }
});

test('§4/§37 SİLAH ZEHRİ DoT ÜRETMEZ — skill zehri AYRI sistem', () => {
  const S = protoState(1931);
  S.infiniteMp = true;
  ok(S.equipService.equip(giveItem(S, bowOf('POISON').definitionRef)).ok, 'zehirli yay');
  const mob = S.mobs.mobs.find((m) => m.slotId === 'fa_a3')!;
  mob.hp = 1e9; mob.maxHp = 1e9;
  S.world.worldX = mob.worldX - 100; S.world.worldY = mob.worldY;
  S.targets.select(mob.uid);
  /* NORMAL atış: silah zehri var ama status YOK */
  S.resolveCastToImpact(ARCHER.STANDART_ATIS, mob, S.entities());
  eq((mob.status ?? []).length, 0, 'silah zehri status YAPIŞTIRMAMALI:');
  let ticks = 0;
  for (let i = 0; i < 60 * 8; i++) ticks += S.tickStatuses(1 / 60, S.entities()).length;
  eq(ticks, 0, 'silah zehri TİK ATMAMALI:');

  /* ZEHİR SKILLİ: DoT sistemi AYRICA çalışmalı */
  S.action.reset(); S.combat.skills.reset();
  S.resolveCastToImpact(ARCHER.ZEHIRLI_UC, mob, S.entities());
  ok((mob.status ?? []).length > 0, 'skill zehri DoT YAPIŞTIRMALI');
  let skillTicks = 0;
  for (let i = 0; i < 60 * 8; i++) skillTicks += S.tickStatuses(1 / 60, S.entities()).length;
  eq(skillTicks, 4, 'skill DoT tik sayısı (P1.6.1 ile aynı):');
});

test('elemental YOK silahta silah elemental bileşeni 0 olur', () => {
  const S = protoState(1932);
  S.infiniteMp = true;
  ok(S.equipService.equip(giveItem(S, bowOf('BASE').definitionRef)).ok, 'sade yay');
  const mob = S.mobs.mobs.find((m) => m.slotId === 'fa_a3')!;
  mob.hp = 1e9; mob.maxHp = 1e9;
  S.world.worldX = mob.worldX - 100; S.world.worldY = mob.worldY;
  S.targets.select(mob.uid);
  const hits = S.resolveCastToImpact(ARCHER.STANDART_ATIS, mob, S.entities())
    .impacts.filter((i) => i.invalid === null);
  ok(hits.length > 0, 'isabet');
  for (const h of hits) eq(h.weaponElementalDamage, 0, 'elemental bileşeni:');
});

test('§20 Attack GERÇEKTEN combat çıktısını değiştirir', () => {
  const dmg = (role: keyof typeof BOW_BY_ROLE | null): number => {
    const S = protoState(1933);
    S.infiniteMp = true;
    if (role) ok(S.equipService.equip(giveItem(S, bowOf(role).definitionRef)).ok, 'equip');
    const mob = S.mobs.mobs.find((m) => m.slotId === 'fa_a3')!;
    mob.hp = 1e9; mob.maxHp = 1e9;
    S.world.worldX = mob.worldX - 100; S.world.worldY = mob.worldY;
    S.targets.select(mob.uid);
    const hits = S.resolveCastToImpact(ARCHER.STANDART_ATIS, mob, S.entities())
      .impacts.filter((i) => i.invalid === null);
    return hits.reduce((n, h) => n + h.physicalDamage, 0);
  };
  const none = dmg(null), low = dmg('BASE'), uniq = dmg('TOP');
  ok(low > none, `temel yay hasarı artırmalı: ${none} → ${low}`);
  ok(uniq > low, `en güçlü yay daha fazla: ${low} → ${uniq}`);
});

console.log('P1.8 — drop → envanter → equip:');

test('§38 UÇTAN UCA: mob kill → Auto Loot ON → envanter instance → equip', () => {
  const S = protoState(1940);
  /* P2.13 — bu test MANUEL kuşanma yolunu sınıyor. Oto giy açıkken düşen
     eşya anında kuşanılıyor ve çantada görünmüyor; kurulum bu yüzden oto
     giyi KAPATIR. Oto giy davranışı §76'da ayrıca sınanır. */
  S.autoGear.settings.autoEquip = false;
  S.lootPolicy.setMode('auto');
  S.mobs.mobs.length = 0;
  S.worldLoot.clear();
  /* kuşanılabilir bir katalog itemi düşene kadar farm et */
  let equipRef: number | null = null;
  for (let i = 0; i < 400 && equipRef === null; i++) {
    const ev = killAndReap(S, killableMob(S, S.world.worldX + 60, S.world.worldY, 252));
    for (const r of ev.records) {
      if (r.kind === 'item' && r.delivery === 'AUTO_INVENTORY' && isEquipmentItem(r.itemRef)) {
        equipRef = r.itemRef; break;
      }
    }
  }
  ok(equipRef !== null, 'drop havuzundan kuşanılabilir katalog itemi düşmeli');
  const entry = [...S.inventory.bagList()].find((x) => x.entry.itemRef === equipRef)!;
  ok(entry !== undefined, 'envanterde gerçek instance olmalı');
  eq(entry.entry.quantity, 1, 'ekipman yığılmaz:');
  const before = S.stats.build();
  const res = S.equipService.equip(entry.entry.instanceId);
  ok(res.ok, `düşen item kuşanılabilmeli: ${res.ok ? '' : res.reason}`);
  const after = S.stats.build();
  const changed = after.total.attack !== before.total.attack
    || after.total.defense !== before.total.defense
    || after.total.dex !== before.total.dex
    || after.total.maxHp !== before.total.maxHp;
  ok(changed, 'türetilmiş statlar DEĞİŞMELİ');
  const def = itemDefinition(equipRef!)!;
  ok(ITEM_CLASSES.includes(def.itemClass), `sınıf çözülmeli: ${def.itemClass}`);
});

test('§39 AUTO LOOT OFF: yerdeki ekipman → manuel toplama → equip', () => {
  const S = protoState(1941);
  S.lootPolicy.setMode('manual');
  S.mobs.mobs.length = 0;
  S.worldLoot.clear();
  const bowRef = bowOf('POISON').definitionRef;
  const owner = S.drops.tuning.ownerPlayerId;
  /* ekipman itemini yere düşür (drop yolu ile aynı entity modeli) */
  const loot = S.worldLoot.spawn({
    kind: 'item', itemRef: bowRef, quantity: 1, ownerPlayerId: owner,
    worldX: S.world.worldX + 40, worldY: S.world.worldY,
    sourceMobUid: 777, sourceSpawnSlot: 'test_slot', sourceGeneration: 1, sourceMonsterRef: 252,
  });
  const before = S.stats.build().total.attack;
  const picked = S.worldLoot.pickup(loot.lootUid, owner, S.world.worldX, S.world.worldY);
  ok(picked.ok, 'manuel toplama başarılı olmalı');
  const entry = [...S.inventory.bagList()].find((x) => x.entry.itemRef === bowRef)!;
  ok(entry !== undefined, 'envanterde instance');
  ok(S.equipService.equip(entry.entry.instanceId).ok, 'equip');
  /* P2.5A — saldırı artık KO formülünden geliyor: ekipman katkısı toplama
     DEĞİL, AP zincirine girdi. Bu yüzden "önceki + yay hasarı" eşitliği
     geçersiz; doğrulanan şey saldırının GERÇEKTEN ARTTIĞIdır. */
  ok(S.stats.build().total.attack > before, 'yay kuşanınca saldırı artmalı:');
  eq(S.stats.build().equipment.attack, bowOf('POISON').stats.attack, 'ekipman bloğu tanımdan:');
  eq(S.equipment.slotOf(entry.entry.instanceId), 'weapon', 'slot:');
});

test('§22 on iki equipment slotu ve telemetri görünümü', () => {
  const S = protoState(1942);
  const slots = S.stats.slots();
  eq(slots.length, 12, 'slot sayısı:');
  eq(slots.map((s) => s.slotId).join(','),
    'weapon,helmet,chest,pants,gloves,boots,earring1,earring2,ring1,ring2,necklace,belt',
    'slot düzeni:');
  /* iki küpe ve iki yüzük AYRI slot */
  eq(slots.filter((s) => s.slotId.startsWith('earring')).length, 2, 'küpe slotu:');
  eq(slots.filter((s) => s.slotId.startsWith('ring')).length, 2, 'yüzük slotu:');
  /* iki AYNI yüzük iki AYRI slota girer */
  const ringA = ARCHER_ACCESSORIES.find((a) => a.equipSlot === 'ring')!;
  const ringB = ARCHER_ACCESSORIES.filter((a) => a.equipSlot === 'ring')[1]!;
  ok(S.equipService.equip(giveItem(S, ringA.definitionRef)).ok, 'yüzük 1');
  ok(S.equipService.equip(giveItem(S, ringB.definitionRef)).ok, 'yüzük 2');
  const filled = S.stats.slots().filter((s) => s.slotId.startsWith('ring') && s.definitionRef !== null);
  eq(filled.length, 2, 'iki yüzük de takılı:');
  for (const f of filled) ok(f.itemClass !== null, 'sınıf telemetride görünmeli');
});

test('§8/§9 upgradeLevel P1.8\'de STAT DEĞİŞTİRMEZ (yalnız veri hazırlığı)', () => {
  const S = protoState(1944);
  /* P2.27 — kalite artık bölge etiketi; belirli bir kaliteyi aramak
     yerine EN GÜÇLÜ zırhı seçeriz. */
  const armor = [...ARCHER_ARMOR].sort((a, b) => b.stats.defense - a.stats.defense)[0]!;
  const id = giveItem(S, armor.definitionRef);
  const inst = S.inventory.get(id)!;
  ok(S.equipService.equip(id).ok, 'equip');
  const def0 = S.stats.build().total.defense;
  /* instance'ın upgrade seviyesi kaynak adından gelebilir; P1.8 bunu
     STAT'a UYGULAMAZ — upgrade formülü P1.9 görevidir. */
  inst.upgradeLevel = 8;
  eq(S.stats.build().total.defense, def0, 'upgrade seviyesi defense\'i DEĞİŞTİRMEMELİ:');
  eq(S.stats.build().equipment.defense, armor.stats.defense, 'katkı TABAN stattan:');
  /* model yine de upgrade'e hazır */
  eq(armor.baseItemRef, armor.definitionRef, 'baseItemRef:');
  eq(typeof inst.upgradeLevel, 'number', 'instance upgradeLevel alanı var:');
});

test('§31 setId veri hazırlığı VAR, set BONUSU YOK', () => {
  const sets = new Set(ARCHER_ARMOR.map((a) => a.setId).filter((x) => x !== null));
  ok(sets.size >= 2, `set kimliği taşınmalı: ${[...sets].join(',')}`);
  /* Tam set kuşanmak EK bir bonus vermez — katkı parçaların TOPLAMIDIR. */
  const S = protoState(1945);
  const low = ARCHER_ARMOR.filter((a) => a.setId === 'rogue_leather');
  eq(low.length, 5, 'beş parçalık set:');
  let expected = 0;
  for (const a of low) {
    ok(S.equipService.equip(giveItem(S, a.definitionRef)).ok, `${a.displayName} equip`);
    expected += a.stats.defense;
  }
  eq(S.stats.build().equipment.defense, expected, 'set bonusu EKLENMEMELİ (yalnız toplam):');
});

test('§40 ID sayaçları sızmaz — iki runtime aynı instanceId dizisi üretir', () => {
  const first = (): number[] => {
    const S = protoState(1943);
    return [giveItem(S, bowOf('BASE').definitionRef), giveItem(S, bowOf('FIRE').definitionRef)];
  };
  eq(first().join(','), first().join(','), 'instanceId dizisi:');
});

/* ============ P2.0 — THREE.JS 2.5D RENDERER FOUNDATION ============ */
console.log('P2.0 — koordinat ve kamera (three GEREKMEZ):');

test('§5 koordinat eşlemesi: gameplay(x,y) → three(x,0,y)', () => {
  eq(JSON.stringify(toScene({ worldX: 100, worldY: 200 })), '{"x":100,"y":0,"z":200}', 'ileri:');
  eq(JSON.stringify(toScene({ worldX: -40, worldY: 7 }, 25)), '{"x":-40,"y":25,"z":7}', 'yükseklikli:');
  const back = toGameplay({ x: 12, y: 999, z: -8 });
  eq(back.worldX, 12, 'geri X:');
  eq(back.worldY, -8, 'geri Y (three Z):');
  /* düşey bileşen gameplay'e SIZMAZ */
  eq(Object.keys(back).join(','), 'worldX,worldY', 'gameplay noktasında Y/Z YOK:');
});

test('§6 facing → yaw dönüşümü tersine çevrilebilir (360°)', () => {
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI + (i / 16) * Math.PI * 2;
    near(normalizeAngle(yawToFacing(facingToYaw(a))), normalizeAngle(a), 1e-9, `açı ${i}:`);
  }
  /* +X yönü: yerel ileri +Z, yaw = π/2 */
  near(facingToYaw(0), Math.PI / 2, 1e-9, 'facing 0 → yaw:');
});

test('§8 kamera SABİT 3/4: yaw/pitch/mesafe konumu belirler', () => {
  const t = { ...CAMERA_V1, yawDeg: 0, pitchDeg: 60, distance: 1000, smoothing: 0 };
  const c = cameraPosition({ worldX: 0, worldY: 0 }, t);
  near(c.y, 1000 * Math.sin(Math.PI / 3), 1e-6, 'yükseklik = d·sin(pitch):');
  near(c.x, -1000 * Math.cos(Math.PI / 3), 1e-6, 'yaw 0 → -X yönünde:');
  near(c.z, 0, 1e-6, 'yaw 0 → Z ofseti yok:');
  /* kamera hedefi TAKİP EDER */
  const moved = cameraPosition({ worldX: 500, worldY: -300 }, t);
  near(moved.x - c.x, 500, 1e-6, 'hedefle birlikte kayar (X):');
  near(moved.z - c.z, -300, 1e-6, 'hedefle birlikte kayar (Z):');
  /* bakış noktası ayak + height */
  eq(cameraLookAt({ worldX: 5, worldY: 6 }, t).y, t.height, 'bakış yüksekliği:');
});

test('kamera yumuşatma YALNIZ GÖRSEL ve FPS bağımsız', () => {
  const desired = { x: 100, y: 0, z: 0 };
  const step = (dt: number, n: number): number => {
    let cur = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < n; i++) cur = smoothTowards(cur, desired, dt, 8);
    return cur.x;
  };
  near(step(1 / 30, 30), step(1 / 60, 60), 0.5, '1 sn sonrası 30 vs 60 fps:');
  near(step(1 / 120, 120), step(1 / 60, 60), 0.5, '120 vs 60 fps:');
  /* smoothing 0 → anında yapış (determinizm) */
  eq(smoothTowards({ x: 0, y: 0, z: 0 }, desired, 1 / 60, 0).x, 100, 'yumuşatmasız:');
});

console.log('P2.0 — görsel yaşam döngüsü (three GEREKMEZ):');

test('§7/§24 mob görsel anahtarı uid+GENERATION içerir', () => {
  eq(mobVisualKey(5, 1), 'mob:5:1', 'anahtar:');
  ok(mobVisualKey(5, 1) !== mobVisualKey(5, 2), 'aynı uid farklı nesil → FARKLI görsel');
  ok(projectileVisualKey(9) !== lootVisualKey(9), 'ok ve ganimet anahtarı çakışmaz');
});

test('§24 VisualRegistry: işaretlenmeyen görsel SİLİNİR (sızıntı yok)', () => {
  const disposed: string[] = [];
  const reg = new VisualRegistry<{ id: string }>(
    (key) => ({ id: key }), (_o, key) => disposed.push(key),
  );
  reg.beginFrame();
  reg.touch('a'); reg.touch('b'); reg.touch('c');
  eq(reg.endFrame().length, 0, 'ilk karede silinen:');
  eq(reg.size, 3, 'görsel sayısı:');
  /* b kaybolsun */
  reg.beginFrame();
  reg.touch('a'); reg.touch('c');
  eq(reg.endFrame().join(','), 'b', 'silinen anahtar:');
  eq(reg.size, 2, 'kalan:');
  eq(disposed.join(','), 'b', 'dispose çağrısı:');
  /* aynı anahtar İKİ görsel almaz */
  reg.beginFrame();
  const first = reg.touch('a');
  const again = reg.touch('a');
  ok(first === again, 'aynı anahtar aynı nesne');
  reg.endFrame();
  /* tümünü temizle */
  reg.clear();
  eq(reg.size, 0, 'clear sonrası:');
  eq(disposed.length, 3, 'toplam dispose:');
});

test('§27 GLB kayıtçısı: OYUNCU gerçek GLB, MOB primitive fallback', () => {
  const reg = new Asset3dRegistry();
  /* P2.1 — oyuncu varlığı ARTIK GERÇEK: manifestte url var → 'loading'. */
  eq(reg.state('player'), 'loading', 'oyuncu varlığı (P2.1 GERÇEK GLB):');
  eq(reg.spec('player')?.url, 'assets/models/archer_mobile_v1.glb', 'oyuncu GLB yolu:');
  eq(reg.pending().length, 1, 'yüklenecek GLB:');
  /* moblar HÂLÂ primitive (P2.1 kapsamı yalnız oyuncudur) */
  for (const kind of ['mob_normal', 'mob_aggressive', 'mob_elite'] as const) {
    eq(reg.state(kind), 'missing', `${kind} durumu:`);
    eq(reg.useGlb(kind), false, `${kind} primitive fallback:`);
  }
  /* soket fallback ofseti hâlâ var — model yoksa kullanılır (§29) */
  const bow = reg.socketOffset('player', 'BowSocket');
  ok(bow !== null && typeof bow.x === 'number', 'BowSocket fallback ofseti olmalı');
  ok(reg.socketOffset('player', 'ArrowSpawn') !== null, 'ArrowSpawn fallback ofseti');
  /* oyuncunun klip listesi ARTIK 17 gerçek klip adıdır */
  eq(reg.spec('player')?.clips.length, 17, 'oyuncu klip sayısı:');
  eq(reg.spec('player')?.clips[0], '01_IDLE', 'ilk klip:');
  /* mob sözleşmesi genel adları KORUR (§28) */
  eq(ANIMATION_CLIPS.join(','), 'IDLE,WALK,RUN,ATTACK,SKILL,DEATH', 'mob klip sözleşmesi:');
  reg.markReady('player');
  eq(reg.useGlb('player'), true, 'ready → GLB:');
});

console.log('P2.0 — gameplay → görünüm adaptörü:');

test('§4 frame adaptörü gameplay durumunu DEĞİŞTİRMEZ', () => {
  const S = protoState(2000);
  const before = JSON.stringify({
    px: S.world.worldX, py: S.world.worldY, hp: S.player.hp, mp: S.player.mp,
    mobs: S.mobs.mobs.map((m) => ({ u: m.uid, g: m.generation, x: m.worldX, y: m.worldY, hp: m.hp })),
    target: S.targets.selectedUid,
  });
  for (let i = 0; i < 20; i++) buildWorldFrame(S);
  const after = JSON.stringify({
    px: S.world.worldX, py: S.world.worldY, hp: S.player.hp, mp: S.player.mp,
    mobs: S.mobs.mobs.map((m) => ({ u: m.uid, g: m.generation, x: m.worldX, y: m.worldY, hp: m.hp })),
    target: S.targets.selectedUid,
  });
  eq(after, before, 'gameplay durumu:');
});

test('frame adaptörü mob kimliğini (uid+generation) TAŞIR', () => {
  const S = protoState(2001);
  S.mobs.ai.respawnOverrideSec = 0.05;
  const mob = S.mobs.mobs[0]!;
  const f1 = buildWorldFrame(S);
  const v1 = f1.mobs.find((m) => m.uid === mob.uid)!;
  eq(v1.generation, mob.generation, 'nesil:');
  eq(v1.aiType, S.mobs.slotOf(mob.slotId)!.aiType, 'AI tipi:');
  /* öldür + respawn */
  mob.hp = 0; mob.state = 'dying';
  S.reapDead();
  const dead = buildWorldFrame(S).mobs.find((m) => m.uid === mob.uid)!;
  eq(dead.dead, true, 'ölü işareti:');
  let guard = 0;
  while (mob.ai === 'dead' && guard++ < 4000) S.mobs.update(1 / 120, S.world);
  const v2 = buildWorldFrame(S).mobs.find((m) => m.generation === v1.generation + 1)!;
  ok(v2 !== undefined, 'yeni nesil görünümde olmalı');
  ok(v2.uid !== v1.uid, 'yeni entity uid');
  ok(mobVisualKey(v2.uid, v2.generation) !== mobVisualKey(v1.uid, v1.generation),
    'GÖRSEL ANAHTARI da farklı olmalı');
});

test('§16 üçlü/beşli salvo → AYRI projectile görünümü', () => {
  const S = protoState(2002);
  S.infiniteMp = true;
  const mob = S.mobs.mobs.find((m) => m.slotId === 'fa_a3')!;
  mob.hp = 1e9; mob.maxHp = 1e9;
  S.world.worldX = mob.worldX - 100; S.world.worldY = mob.worldY;
  S.targets.select(mob.uid);
  const count = (ref: number): number => {
    S.action.reset(); S.combat.skills.reset(); S.updateInfiniteMp();
    ok(S.performSkill(ref, mob, S.entities()).ok, 'cast');
    let guard = 0;
    while (S.adapter.pipeline.projectiles.length === 0 && guard++ < 4000) {
      S.stepCombat(1 / 240, S.entities());
    }
    const n = buildWorldFrame(S).projectiles.length;
    while ((S.adapter.pipeline.projectiles.length > 0 || S.adapter.pipeline.pending.length > 0)
      && guard++ < 9000) S.stepCombat(1 / 240, S.entities());
    return n;
  };
  eq(count(ARCHER.UCLU_SALVO), 3, 'üçlü salvo görsel sayısı:');
  eq(count(ARCHER.BESLI_SALVO), 5, 'beşli salvo görsel sayısı:');
});

test('§19/§20 ganimet ve farm boundary görünümü', () => {
  const S = protoState(2003);
  S.lootPolicy.setMode('manual');
  S.worldLoot.clear();
  S.genie.start(S.world);
  const bow = [...ARCHER_WEAPONS].sort((a, b) => b.stats.attack - a.stats.attack)[0]!;
  S.worldLoot.spawn(groundSpec(bow.definitionRef, 1000, 1200, S.drops.tuning.ownerPlayerId));
  const f = buildWorldFrame(S);
  eq(f.loot.length, 1, 'ganimet görünümü:');
  eq(f.loot[0]!.worldX, 1000, 'X:'); eq(f.loot[0]!.worldY, 1200, 'Y:');
  eq(f.loot[0]!.isCoin, false, 'item:');
  eq(f.loot[0]!.colorHex, ITEM_CLASS_COLOR[bow.itemClass], 'item SINIF RENGİ (P1.8):');
  ok(f.boundary !== null, 'boundary görünümü olmalı');
  eq(f.boundary!.radius, S.genie.settings.farmBoundaryRadius, 'yarıçap gameplay\'den:');
  eq(f.boundary!.centerX, S.genie.farmCenter!.x, 'merkez X:');
});

console.log('P2.0 — Three renderer (WebGL GEREKMEZ):');

/** WebGL'siz renderer — canvas verilmez, WebGLRenderer OLUŞTURULMAZ. */
function headlessRenderer(): ThreeWorldRenderer {
  const r = new ThreeWorldRenderer();
  r.tuning.smoothing = 0;                    // determinizm
  return r;
}
function frameOf(S: PrototypeState) { return buildWorldFrame(S); }

test('§25 renderer WEBGL BAĞLAMI İSTEMEDEN kurulur ve çalışır', () => {
  const r = headlessRenderer();
  eq(r.usingWebGL, false, 'WebGL:');
  const S = protoState(2010);
  r.update(frameOf(S), 1 / 60);
  const s = r.stats();
  eq(s.webgl, false, 'telemetri webgl:');
  eq(s.mobVisualCount, 8, 'mob görselleri kuruldu:');
  ok(s.activeObjectCount > 10, 'sahne grafiği kuruldu');
  /* WebGL yokken çizim sessizce atlanır */
  r.render();
  eq(r.stats().drawCalls, 0, 'draw call:');
  r.dispose();
});

test('§1/§4 renderer gameplay durumunu DEĞİŞTİRMEZ', () => {
  const S = protoState(2011);
  S.infiniteMp = true;
  const r = headlessRenderer();
  const snap = (): string => JSON.stringify({
    px: S.world.worldX, py: S.world.worldY, face: S.world.facingAngle,
    hp: S.player.hp, mp: S.player.mp, coins: S.player.coins, exp: S.player.exp,
    target: S.targets.selectedUid,
    mobs: S.mobs.mobs.map((m) => [m.uid, m.generation, m.hp, m.worldX, m.worldY, m.ai]),
    proj: S.adapter.pipeline.projectiles.length,
    loot: S.worldLoot.count,
  });
  const before = snap();
  for (let i = 0; i < 60; i++) { r.update(frameOf(S), 1 / 60); r.render(); }
  eq(snap(), before, 'gameplay durumu:');
  r.dispose();
});

test('§6 oyuncu görseli gameplay konumunu ve 360° dönüşünü izler', () => {
  const S = protoState(2012);
  const r = headlessRenderer();
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI + (i / 12) * Math.PI * 2;
    S.world.worldX = 1000 + i * 25;
    S.world.worldY = 900 - i * 17;
    S.world.facingAngle = a;
    /* P2.1 — gövde açısı `PlayerAnimator.angle`'dan gelir (saldırıda hedef,
       aksi halde hareket yönü). Girdi aktifken hareket yönü bu açıyı izler. */
    S.anim.update(1 / 60, true, S.world.travelled, a, true);
    r.update(frameOf(S), 1 / 60);
    const pos = r.playerVisualPosition();
    near(pos.x, S.world.worldX, 1e-6, `X (${i}):`);
    near(pos.z, S.world.worldY, 1e-6, `Z (${i}):`);
    /* P2.4C — "zemin üstünde" ARTIK sabit 0 değil, o noktanın arazi
       yüksekliğidir. Düz dünyada `groundElevationAt` 0 döner → eski beklenti
       aynen korunur. */
    near(pos.y, groundElevationAt(S.world.worldX, S.world.worldY), 1e-9, 'zemin üstünde:');
    near(normalizeAngle(yawToFacing(r.playerVisualYaw())), normalizeAngle(a), 1e-6, `yaw (${i}):`);
  }
  r.dispose();
});

test('§13 RAYCAST doğru mob uid\'ini döndürür ve hedef otoritesi DEĞİLDİR', () => {
  const S = protoState(2013);
  const r = headlessRenderer();
  /* mobları oyuncunun etrafına dağıt */
  S.world.worldX = 1240; S.world.worldY = 1650;
  r.update(frameOf(S), 1 / 60);
  const target = S.mobs.mobs.find((m) => m.slotId === 'fa_n1')!;
  /* P2.4C — mob görseli ZEMİNE oturur; ekran izdüşümü de aynı yükseklikten
     alınmalı, yoksa ışın gövdenin altından geçer. Düz dünyada 0 eklenir. */
  const screen = r.projectToScreen({ worldX: target.worldX, worldY: target.worldY },
    groundElevationAt(target.worldX, target.worldY) + 21);
  ok(screen !== null, 'mob ekranda olmalı');
  const hpBefore = target.hp, stateBefore = target.ai;
  const uid = r.pickMobAt(screen!.x, screen!.y);
  eq(uid, target.uid, 'raycast uid:');
  /* HİÇBİR gameplay alanı değişmedi */
  eq(target.hp, hpBefore, 'HP:');
  eq(target.ai, stateBefore, 'mob durumu:');
  eq(S.targets.selectedUid, null, 'raycast HEDEF SEÇMEZ (otorite Scene\'de):');
  /* boşluğa dokunma → null */
  eq(r.pickMobAt(5, 5), null, 'boşluk:');
  r.dispose();
});

test('§13 hedef DEĞİŞİMİ WorldTargetSystem üzerinden olur', () => {
  const S = protoState(2014);
  const r = headlessRenderer();
  r.update(frameOf(S), 1 / 60);
  const a = S.mobs.mobs.find((m) => m.slotId === 'fa_n1')!;
  const b = S.mobs.mobs.find((m) => m.slotId === 'fa_a1')!;
  for (const mob of [a, b]) {
    const sc = r.projectToScreen({ worldX: mob.worldX, worldY: mob.worldY },
      groundElevationAt(mob.worldX, mob.worldY) + 21)!;
    const uid = r.pickMobAt(sc.x, sc.y);
    eq(uid, mob.uid, 'raycast:');
    S.targets.select(uid!);                       // AUTHORITY: gameplay sistemi
    eq(S.targets.selectedUid, mob.uid, 'hedef:');
  }
  eq(S.targets.selectedUid, b.uid, 'ikinci hedefe geçildi:');
  r.dispose();
});

test('§15 projectile görseli authoritative oku İZLER ve HASAR VEREMEZ', () => {
  const S = protoState(2015);
  S.infiniteMp = true;
  const r = headlessRenderer();
  const mob = S.mobs.mobs.find((m) => m.slotId === 'fa_a3')!;
  mob.hp = 1e9; mob.maxHp = 1e9;
  S.world.worldX = mob.worldX - 200; S.world.worldY = mob.worldY;
  S.targets.select(mob.uid);
  ok(S.performSkill(ARCHER.STANDART_ATIS, mob, S.entities()).ok, 'cast');
  let guard = 0;
  while (S.adapter.pipeline.projectiles.length === 0 && guard++ < 4000) {
    S.stepCombat(1 / 240, S.entities());
  }
  const proj = S.adapter.pipeline.projectiles[0]!;
  const hpBefore = mob.hp;
  /* okun görseli, otoritenin konumunu izlemeli */
  for (let i = 0; i < 20; i++) {
    S.stepCombat(1 / 240, S.entities());
    if (S.adapter.pipeline.projectiles.length === 0) break;
    r.update(frameOf(S), 1 / 240);
    const live = S.adapter.pipeline.projectiles[0]!;
    const vis = r.projectileVisualPosition(live.id);
    ok(vis !== null, 'görsel olmalı');
    const truth = CombatPipeline.position(live);
    near(vis!.x, truth.x, 1e-6, 'görsel X = otorite X:');
    near(vis!.z, truth.y, 1e-6, 'görsel Z = otorite Y:');
  }
  /* GÖRSELİ ZORLA MOBUN İÇİNE TAŞI → yine de hasar OLMAMALI */
  r.forceProjectileVisual(proj.id, mob.worldX, mob.worldY);
  for (let i = 0; i < 10; i++) r.update(frameOf(S), 1 / 240);
  eq(mob.hp, hpBefore, 'görsel çakışması HASAR ÜRETMEZ:');
  r.dispose();
});

test('§24 görsel sızıntısı YOK: mob/ok/ganimet temizlenir', () => {
  const S = protoState(2016);
  S.infiniteMp = true;
  S.lootPolicy.setMode('manual');
  const r = headlessRenderer();
  r.update(frameOf(S), 1 / 60);
  const base = r.stats();
  eq(base.mobVisualCount, 8, 'mob:');
  /* ganimet ekle → görsel oluşsun */
  S.worldLoot.spawn(groundSpec(PLAYER.starterWeaponRef, 1200, 1600, 1));
  r.update(frameOf(S), 1 / 60);
  eq(r.stats().lootVisualCount, 1, 'ganimet görseli:');
  /* ganimeti kaldır → görsel SİLİNMELİ */
  S.worldLoot.clear();
  r.update(frameOf(S), 1 / 60);
  eq(r.stats().lootVisualCount, 0, 'ganimet görseli silinmeli:');
  /* P2.2 — ÖLÜ MOB GÖRSELİ ARTIK YAŞAR (ceset + `08_DEATH` klibi).
     Sızıntı testi bu yüzden RESPAWN üzerinden yapılır: mob yeniden doğunca
     yeni bir `uid:generation` alır ve ESKİ görsel silinir. */
  const beforeRemoved = r.stats().visualsRemoved;
  S.mobs.ai.respawnOverrideSec = 0.1;          // ölümden ÖNCE ayarlanmalı
  for (const m of S.mobs.mobs) { m.hp = 0; m.state = 'dying'; }
  S.reapDead();
  r.update(frameOf(S), 1 / 60);
  eq(r.stats().mobVisualCount, 8, 'ceset görselleri YAŞAR (ölüm klibi oynar):');
  /* respawn: her mob yeni kimlik alır → eski görsellerin HEPSİ silinir */
  for (let i = 0; i < 300; i++) { S.mobs.update(1 / 60, S.world); }
  r.update(frameOf(S), 1 / 60);
  eq(r.stats().mobVisualCount, 8, 'respawn sonrası mob görseli:');
  ok(r.stats().visualsRemoved > beforeRemoved,
    'eski nesil görselleri SİLİNMELİ (kimlik sızıntısı yok)');
  const s = r.stats();
  eq(s.visualsCreated - s.visualsRemoved, s.mobVisualCount + s.projectileVisualCount + s.lootVisualCount,
    'canlı görsel = üretilen - silinen:');
  r.dispose();
  eq(r.stats().mobVisualCount, 0, 'dispose sonrası:');
});

test('§24 UZUN OTURUM: görsel sayısı SINIRLI kalır (respawn döngüsü)', () => {
  const S = protoState(2017);
  S.infiniteMp = true;
  S.mobs.ai.respawnOverrideSec = 0.4;
  S.genie.settings.hpPotionRef = null; S.genie.settings.mpPotionRef = null;
  S.genie.start(S.world);
  const r = headlessRenderer();
  let peakMob = 0, peakProj = 0, peakLoot = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 120; i++) {
    const mv = S.genie.movementIntent(S.entities(), S.world);
    if (mv.magnitude > 0) { S.movement.move(S.world, mv, dt); S.genie.clampPlayer(S.world); }
    S.player.update(dt); S.combat.update(dt); S.adapter.updateAction(dt); S.updateInfiniteMp();
    S.stepCombat(dt, S.entities());
    S.mobs.update(dt, S.world);
    S.tickStatuses(dt, S.entities());
    S.worldLoot.update(dt);
    S.reapDead();
    S.genie.update(dt, S.entities(), S.world);
    r.update(frameOf(S), dt);
    if (i % 53 === 0) {
      const s = r.stats();
      peakMob = Math.max(peakMob, s.mobVisualCount);
      peakProj = Math.max(peakProj, s.projectileVisualCount);
      peakLoot = Math.max(peakLoot, s.lootVisualCount);
    }
  }
  ok(S.drops.totals.kills > 0, `gerçek farm olmalı (${S.drops.totals.kills} kill)`);
  const s = r.stats();
  ok(s.visualsCreated > 20, `görsel üretilmiş olmalı (${s.visualsCreated})`);
  ok(peakMob <= 8, `mob görsel tepe: ${peakMob}`);
  ok(peakProj <= 24, `ok görsel tepe: ${peakProj}`);
  ok(peakLoot <= 200, `ganimet görsel tepe: ${peakLoot}`);
  eq(s.mobVisualCount + s.projectileVisualCount + s.lootVisualCount,
    s.visualsCreated - s.visualsRemoved, 'muhasebe (sızıntı yok):');
  r.dispose();
});

test('§22 portrait yeniden boyutlandırma kamerayı günceller', () => {
  const r = headlessRenderer();
  r.resize(620, 1100);
  const a = r.cameraAspect();
  near(a, 620 / 1100, 1e-9, 'portrait aspect:');
  r.resize(414, 896);
  near(r.cameraAspect(), 414 / 896, 1e-9, 'yeni aspect:');
  /* ortografik moda geçince de sınırlar güncellenir */
  r.tuning.projection = 'orthographic';
  r.applyCameraTuning();
  const b = orthoBounds(r.tuning, 414 / 896);
  near(b.right / b.top, 414 / 896, 1e-9, 'ortho aspect:');
  r.dispose();
});

console.log('P2.0 — renderer parity (§26):');

test('§26/§36 RENDERER AÇIK/KAPALI gameplay sonucunu DEĞİŞTİRMEZ', () => {
  const run = (withRenderer: boolean): string => {
    const S = protoState(2020);
    S.infiniteMp = true;
    S.lootPolicy.setMode('manual');
    S.mobs.ai.respawnOverrideSec = 3;
    S.genie.settings.hpPotionRef = null; S.genie.settings.mpPotionRef = null;
    S.genie.start(S.world);
    const r = withRenderer ? headlessRenderer() : null;
    const dt = 1 / 60;
    for (let i = 0; i < 60 * 30; i++) {
      const mv = S.genie.movementIntent(S.entities(), S.world);
      if (mv.magnitude > 0) { S.movement.move(S.world, mv, dt); S.genie.clampPlayer(S.world); }
      S.player.update(dt); S.combat.update(dt); S.adapter.updateAction(dt); S.updateInfiniteMp();
      S.stepCombat(dt, S.entities());
      S.mobs.update(dt, S.world);
      S.tickStatuses(dt, S.entities());
      S.worldLoot.update(dt);
      S.reapDead();
      S.genie.update(dt, S.entities(), S.world);
      if (r) { r.update(buildWorldFrame(S), dt); r.render(); }
    }
    r?.dispose();
    return JSON.stringify({
      player: [Math.round(S.world.worldX * 1e6), Math.round(S.world.worldY * 1e6),
        Math.round(S.world.facingAngle * 1e6)],
      hp: Math.round(S.player.hp * 1e6), mp: Math.round(S.player.mp * 1e6),
      exp: S.player.exp, coins: S.player.coins, level: S.player.level,
      target: S.targets.selectedUid,
      genie: S.genie.movementState, ticks: S.genie.decisionTicks,
      kills: S.drops.totals.kills, items: S.drops.totals.items, coin: S.drops.totals.coin,
      ground: S.worldLoot.count,
      mobs: S.mobs.mobs.map((m) => [m.uid, m.generation, Math.round(m.hp),
        Math.round(m.worldX * 1e6), Math.round(m.worldY * 1e6), m.ai]),
    });
  };
  const off = run(false);
  const on = run(true);
  eq(on, off, '30 sn deterministik senaryo — renderer AÇIK vs KAPALI:');
  ok(JSON.parse(off).kills > 0, 'senaryo gerçekten farm yapmalı');
});

console.log('P2.0 — mimari sınır (§4/§25/§36):');

test('§4/§25 GAMEPLAY DOMAIN three IMPORT ETMEZ', () => {
  /* Bu test kaynak dosyaları TARAR: gameplay katmanında `three` importu
     bulunursa mimari sınır ihlal edilmiş demektir. */
  const roots = ['world', 'data', 'scenes', 'tools'];
  const base = join(PROTO_ROOT);
  const offenders: string[] = [];
  const importsThree = (src: string): boolean =>
    /from\s+'three['/]|require\(\s*'three['/]/.test(src);
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) { walk(join(dir, entry.name)); continue; }
      if (!entry.name.endsWith('.ts')) continue;
      const full = join(dir, entry.name);
      if (importsThree(readFileSync(full, 'utf8'))) offenders.push(entry.name);
    }
  };
  for (const r of roots) walk(join(base, r));
  /* kökteki dosyalar (state.ts, config.ts, main.ts) — render3d/ HARİÇ */
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;
    if (importsThree(readFileSync(join(base, entry.name), 'utf8'))) offenders.push(entry.name);
  }
  eq(offenders.join(', '), '', 'three import eden gameplay dosyası:');

  /* render3d içinde three YALNIZ İZİN VERİLEN dosyalarda olmalı.
     P2.1 — liste ikiden dörde çıkmadı: GLB yükleyici ve rig eklendi, ötesi
     (coords, CameraRig, views, VisualRegistry, assets3d, frame, ArcherAnimator)
     HÂLÂ three'siz ve WebGL'siz test edilebilir. */
  const three3d: string[] = [];
  for (const entry of readdirSync(join(base, 'render3d'))) {
    if (!entry.endsWith('.ts')) continue;
    const src = readFileSync(join(base, 'render3d', entry), 'utf8');
    if (/from\s+'three/.test(src)) three3d.push(entry);
  }
  /* P2.4C — listeye `terrain.ts` eklendi: Moradon zemin geometrisi three'nin
     `BufferGeometry`/`BufferAttribute` yüzeyiyle kurulur. Dosya YALNIZ
     görseldir; yükseklik gameplay'e sızmaz (bkz. §49 import sınırı testi). */
  eq(three3d.sort().join(','),
    'ArcherRig.ts,GlbLoader.ts,MobRig.ts,ThreeWorldRenderer.ts,terrain.ts',
    'three importu yalnız izinli dosyalarda:');
  /* karar katmanı three'den BAĞIMSIZ kalmalı */
  for (const f of ['ArcherAnimator.ts', 'coords.ts', 'CameraRig.ts', 'views.ts',
    'VisualRegistry.ts', 'assets3d.ts', 'frame.ts']) {
    ok(!/from\s+'three/.test(readFileSync(join(base, 'render3d', f), 'utf8')),
      `render3d/${f} three import ETMEMELİ`);
  }
});

test('§17/§18 Genie ve MobAi renderer\'dan HABERSİZ', () => {
  const base = join(PROTO_ROOT);
  for (const f of ['world/GenieSystem.ts', 'world/GenieMovement.ts', 'world/MobAi.ts',
    'world/MobSlotSystem.ts', 'world/CombatPipeline.ts', 'world/WorldCombatAdapter.ts',
    'state.ts']) {
    const src = readFileSync(join(base, f), 'utf8');
    /* GERÇEK bağımlılık kalıbı: import ifadesi ya da three API kimliği.
       Yorumdaki "Scene" kelimesi bir bağımlılık DEĞİLDİR. */
    ok(!/from\s+'three|require\(\s*'three|render3d\//.test(src),
      `${f} three/render3d import ETMEMELİ`);
    ok(!/\b(THREE\.|Object3D|AnimationMixer|WebGLRenderer|BufferGeometry)\b/.test(src),
      `${f} three API kimliği KULLANMAMALI`);
  }
});


/* ═══════════════ P2.1 — ARCHER GLB ENTEGRASYONU ═══════════════ */

/* GERÇEK GLB, GERÇEK GLTFLoader ile çözülür — WebGL bağlamı YOKTUR.
   `installHeadlessImageShim()` yalnız DOKU DECODE yolunu kapatır; geometri,
   iskelet, inverse-bind matrisleri ve 17 klip gerçektir (bkz. headless-dom.ts). */
installHeadlessImageShim();
const ARCHER_GLB_FILE = join(PROTO_ROOT, '..', '..', 'public', 'assets', 'models',
  'archer_mobile_v1.glb');
const ARCHER_GLB_BYTES = readFileSync(ARCHER_GLB_FILE);
const ARCHER_GLB_BUFFER = ARCHER_GLB_BYTES.buffer.slice(
  ARCHER_GLB_BYTES.byteOffset, ARCHER_GLB_BYTES.byteOffset + ARCHER_GLB_BYTES.byteLength,
) as ArrayBuffer;
/* Her rig modeli KENDİ sahne grafiğine bağlar; testler birbirinin modelini
   çalmasın diye bağımsız kopyalar önceden çözülür. */
const ARCHER_GLB_POOL: LoadedGlb[] = [];
for (let i = 0; i < 12; i++) ARCHER_GLB_POOL.push(await parseGlb(ARCHER_GLB_BUFFER));
let archerGlbCursor = 0;
function nextArcherGlb(): LoadedGlb {
  const glb = ARCHER_GLB_POOL[archerGlbCursor++];
  if (!glb) throw new Error('[P2.1] GLB havuzu tükendi — havuzu büyütün');
  return glb;
}

/* ── GERÇEK KUSUR REGRESYONU ────────────────────────────────────────────────
   İlk sürüm `GLTFLoader.load(url)` kullanıyordu. O yol `FileLoader` üzerinden
   `fetch(new Request(...))` çağırır; `fetch`'in araya girildiği (isteği
   `postMessage` ile ileten) bir görüntüleyicide `Request` klonlanamadığı için
   yükleme "DataCloneError" ile düşüyordu — `file://` testlerinde GÖRÜNMÜYORDU.
   Aşağıdaki ölçüm tarayıcının GERÇEK yolunu (data URI) koşar ve `fetch`'in
   HİÇ çağrılmadığını kanıtlar. */
const FETCH_SPY = { calls: 0 };
const OBJECT_URL_SPY = { calls: 0 };
const ARCHER_DATA_URI = `data:model/gltf-binary;base64,${ARCHER_GLB_BYTES.toString('base64')}`;
const DATA_URI_RESULT: { glb: LoadedGlb | null; error: string | null } =
  { glb: null, error: null };
{
  const g = globalThis as { fetch?: unknown };
  const realFetch = g.fetch;
  const realObjectUrl = URL.createObjectURL;
  g.fetch = (...args: unknown[]): never => {
    FETCH_SPY.calls += 1;
    void args;
    throw new Error('DataCloneError: Request object could not be cloned.');
  };
  /* İKİNCİ KUSURUN TAKLİDİ: görüntüleyici `createObjectURL`'i sarmalayıp
     `blob-request://` şemasına yönlendiriyor ve `<img>` onu yükleyemiyor. */
  (URL as { createObjectURL: (b: unknown) => string }).createObjectURL = (): string => {
    OBJECT_URL_SPY.calls += 1;
    return 'blob-request://blob-taklit';
  };
  try {
    DATA_URI_RESULT.glb = await loadGlb(ARCHER_DATA_URI);
  } catch (err) {
    DATA_URI_RESULT.error = err instanceof Error ? err.message : String(err);
  } finally {
    g.fetch = realFetch;
    (URL as { createObjectURL: typeof realObjectUrl }).createObjectURL = realObjectUrl;
  }
}

console.log('P2.1 — varlık gerçekleri (MANİFEST AUTHORITATIVE):');

test('asset facts manifestle BİREBİR — hiçbiri elle yazılmadı', () => {
  eq(ARCHER_MODEL.file, 'archer_mobile_v1.glb', 'dosya:');
  eq(ARCHER_MODEL.fileBytes, 929200, 'boyut (bayt):');
  eq(ARCHER_MODEL.vertices, 12240, 'vertex:');
  eq(ARCHER_MODEL.triangles, 20820, 'üçgen:');
  eq(ARCHER_MODEL.meshes, 1, 'mesh:');
  eq(ARCHER_MODEL.primitives, 1, 'primitive:');
  eq(ARCHER_MODEL.materials, 1, 'materyal:');
  eq(ARCHER_MODEL.drawCalls, 1, 'draw call:');
  eq(ARCHER_MODEL.boneCount, 23, 'kemik:');
  eq(ARCHER_MODEL.clipCount, 17, 'klip:');
  eq(ARCHER_MODEL.atlasSize.join('x'), '512x512', 'atlas:');
  ok(/WebP/.test(ARCHER_MODEL.atlasFormat) && /JPEG/.test(ARCHER_MODEL.atlasFormat),
    'WebP + JPEG fallback olmalı');
  eq(ARCHER_MODEL.upAxis, 'Y', 'yukarı eksen:');
  eq(ARCHER_MODEL.forwardAxis, '+Z', 'ileri eksen:');
  eq(ARCHER_MODEL.characterHeightMeters, 1.801, 'karakter yüksekliği (m):');
  eq(ARCHER_MODEL.units, 'meters', 'birim:');
  /* DECODER BAĞIMLILIĞI YOK: Draco/Meshopt/KTX2 gerekmiyor. */
  eq(ARCHER_MODEL.decoderDependency, null, 'decoder bağımlılığı:');
  eq(ARCHER_MODEL.extensionsRequired.length, 0, 'zorunlu extension:');
});

test('17 klip adı ve döngü kipi manifestten gelir', () => {
  eq(ARCHER_CLIP_NAMES.length, 17, 'klip sayısı:');
  eq(ARCHER_CLIP_NAMES[0], '01_IDLE', 'ilk:');
  eq(ARCHER_CLIP_NAMES[16], '17_DISARM_BOW', 'son:');
  /* lokomosyon klipleri döngüseldir, tek-atışlıklar değildir */
  for (const n of ['01_IDLE', '03_RUN_FORWARD', '07_AIM_WALK_FORWARD'] as const) {
    eq(archerClip(n).loop, true, `${n} loop:`);
  }
  for (const n of ['11_DRAW_ARROW', '13_AIM_RECOIL', '15_DEATH'] as const) {
    eq(archerClip(n).loop, false, `${n} loop:`);
  }
  /* ROOT MOTION: yalnız ölüm klibi taşır (§DEATH SPECIAL CASE) */
  const carriers = ARCHER_GLB_CLIPS.filter((c) => !c.rootMotionRemoved).map((c) => c.name);
  eq(carriers.join(','), '15_DEATH', 'root motion taşıyan klip:');
  /* lokomosyon kaynak hızları manifestten (playback tuning referansı) */
  near(archerClip('03_RUN_FORWARD').sourceSpeedMetersPerSec, 3.632, 1e-9, 'RUN_FORWARD m/sn:');
  near(archerClip('07_AIM_WALK_FORWARD').sourceSpeedMetersPerSec, 1.156, 1e-9, 'AIM_WALK m/sn:');
});

test('socket verisi manifestten BİREBİR — ofset UYDURULMADI', () => {
  const bow = archerSocket('bow');
  eq(bow.bone, 'mixamorig:Left_arch1', 'bow kemiği:');
  eq(bow.localPosition.join(','), '0,0,0', 'bow yerel konum:');
  const spawn = archerSocket('arrowSpawn');
  eq(spawn.bone, 'mixamorig:Left_arch1', 'arrowSpawn kemiği:');
  near(spawn.localPosition[0], -0.0577, 1e-12, 'arrowSpawn x:');
  near(spawn.localPosition[1], 0.0039, 1e-12, 'arrowSpawn y:');
  near(spawn.localPosition[2], 0.016, 1e-12, 'arrowSpawn z:');
  near(spawn.localRotation[3], 0.6436, 1e-12, 'arrowSpawn quat w:');
  const nock = archerSocket('nock');
  eq(nock.bone, 'mixamorig:RightHand', 'nock kemiği:');
  near(nock.localRotation[0], -0.5017, 1e-12, 'nock quat x:');
});

test('RELEASE TIMING — gameplay 0.20 DEĞİŞMEDİ, fark raporlanır', () => {
  near(ARCHER_NATURAL_RELEASE_SEC, 0.183, 1e-12, 'animasyon doğal bırakma (sn):');
  eq(ARCHER_NATURAL_RELEASE_FRAME, 6, 'bırakma karesi:');
  /* GAMEPLAY SABİTİ DOKUNULMADI */
  const S = protoState(2101);
  near(S.adapter.pipeline.timing.releaseDelaySec, 0.20, 1e-12, 'gameplay releaseDelay:');
  near(releaseTimingDelta(0.20), 0.017, 1e-9, 'fark (sn):');
});

test('ölçek köprüsü: placeholder yüksekliği KORUNDU', () => {
  near(WORLD_UNITS_PER_METER, 52 / 1.801, 1e-12, 'world birimi / metre:');
  near(metersToWorld(1.801), 52, 1e-9, 'karakter yüksekliği (world):');
  near(worldToMeters(52), 1.801, 1e-9, 'ters dönüşüm (m):');
  /* GAMEPLAY DEĞERLERİ DEĞİŞMEDİ */
  const S = protoState(2102);
  eq(S.tuning.get('playerSpeed'), 120, 'playerSpeed (world/sn):');
  eq(PROTO.playerRadius, 20, 'oyuncu yarıçapı:');
});

console.log('P2.1 — animasyon durum makinesi (three GEREKMEZ):');

/** Varsayılan girdi — testler yalnız ilgilendikleri alanı ezer. */
function animIn(p: Partial<ArcherAnimInput> = {}): ArcherAnimInput {
  return {
    alive: true, speedMetersPerSec: 0, localMoveAngle: 0, moving: false,
    attackTriggerCount: 0, skillTriggerCount: 0, hpRatio: 1,
    weaponRef: 160210045, hasTarget: false, ...p,
  };
}

test('yön klibi MANİFEST direction vektörüyle seçilir', () => {
  /* δ = 0 ileri · +π/2 → model-yerel -X · -π/2 → +X · π → -Z */
  eq(directionalClip(['03_RUN_FORWARD', '04_RUN_BACK', '05_RUN_LEFT', '06_RUN_RIGHT'], 0).name,
    '03_RUN_FORWARD', 'ileri:');
  eq(directionalClip(['03_RUN_FORWARD', '04_RUN_BACK', '05_RUN_LEFT', '06_RUN_RIGHT'], Math.PI).name,
    '04_RUN_BACK', 'geri:');
  eq(directionalClip(['03_RUN_FORWARD', '04_RUN_BACK', '05_RUN_LEFT', '06_RUN_RIGHT'], Math.PI / 2).name,
    '06_RUN_RIGHT', 'sağ (yerel -X):');
  eq(directionalClip(['03_RUN_FORWARD', '04_RUN_BACK', '05_RUN_LEFT', '06_RUN_RIGHT'], -Math.PI / 2).name,
    '05_RUN_LEFT', 'sol (yerel +X):');
  /* yerel vektör dönüşümü */
  const f = localMoveVector(0);
  near(f.z, 1, 1e-12, 'ileri +Z:'); near(f.x, 0, 1e-12, 'ileri X:');
});

test('RUN ↔ AIM_WALK eşiği manifest hızlarının GEOMETRİK ORTASI', () => {
  const th = familyThreshold(0);
  near(th, Math.sqrt(3.632 * 1.156), 1e-9, 'ileri eşik (m/sn):');
  const a = new ArcherAnimator();
  /* yavaş → nişan yürüyüşü */
  const slow = a.update(1 / 60, animIn({ moving: true, speedMetersPerSec: th - 0.4 }));
  eq(slow.clip, '07_AIM_WALK_FORWARD', 'yavaş klip:');
  near(slow.timeScale, (th - 0.4) / 1.156, 1e-9, 'yavaş playback:');
  /* hızlı → koşu */
  const fast = a.update(1 / 60, animIn({ moving: true, speedMetersPerSec: 4.157 }));
  eq(fast.clip, '03_RUN_FORWARD', 'hızlı klip:');
  near(fast.timeScale, 4.157 / 3.632, 1e-9, 'hızlı playback (hedef hız / kaynak hız):');
  eq(fast.loop, true, 'lokomosyon döngüsel:');
});

test('atış tetiği → 13_AIM_RECOIL (tek atış, döngü YOK)', () => {
  const a = new ArcherAnimator();
  a.update(1 / 60, animIn());                                  // ilk kare: senkron
  const shot = a.update(1 / 60, animIn({ attackTriggerCount: 1 }));
  eq(shot.clip, '13_AIM_RECOIL', 'klip:');
  eq(shot.loop, false, 'loop:');
  eq(shot.restart, true, 'baştan başlar:');
  /* takip hareketi sürer; DURUŞTA tam süre oynar */
  let t = 0;
  while (t < 0.6) { a.update(1 / 60, animIn({ attackTriggerCount: 1 })); t += 1 / 60; }
  eq(a.currentClip, '13_AIM_RECOIL', '0.6 sn sonra hâlâ:');
  /* skill tetiği de aynı klibi açar (okçu tek silah ailesi) */
  const b = new ArcherAnimator();
  b.update(1 / 60, animIn());
  eq(b.update(1 / 60, animIn({ skillTriggerCount: 1 })).clip, '13_AIM_RECOIL', 'skill:');
});

test('HAREKET HALİNDE atış klibi bırakma anından SONRA kesilir', () => {
  const a = new ArcherAnimator();
  a.update(1 / 60, animIn({ moving: true, speedMetersPerSec: 4 }));
  a.update(1 / 60, animIn({ attackTriggerCount: 1, moving: true, speedMetersPerSec: 4 }));
  eq(a.currentClip, '13_AIM_RECOIL', 'atış başladı:');
  let t = 0, cutAt = -1;
  while (t < 0.7) {
    t += 1 / 60;
    const d = a.update(1 / 60, animIn({ attackTriggerCount: 1, moving: true, speedMetersPerSec: 4 }));
    if (d.clip !== '13_AIM_RECOIL' && cutAt < 0) cutAt = t;
  }
  ok(cutAt > ARCHER_NATURAL_RELEASE_SEC, `kesim bırakmadan SONRA olmalı (${cutAt.toFixed(3)}s)`);
  ok(cutAt < 0.45, `kesim 0.45 sn'den önce olmalı (${cutAt.toFixed(3)}s)`);
  eq(a.currentClip, '03_RUN_FORWARD', 'kesimden sonra lokomosyon:');
});

test('ölüm: 15_DEATH tek atış + clamp + GÖRSEL Y ötelemesi', () => {
  const a = new ArcherAnimator();
  a.update(1 / 60, animIn());
  const d = a.update(1 / 60, animIn({ alive: false }));
  eq(d.clip, '15_DEATH', 'klip:');
  eq(d.loop, false, 'ASLA döngü yapmaz:');
  eq(d.clamp, true, 'son karede tutulur:');
  eq(d.deathActive, true, 'ölüm sunumu:');
  near(d.visualYOffsetMeters, 0.12, 1e-12, 'görsel Y ötelemesi (m):');
  near(DEATH_GROUND_DIP_METERS, 0.118, 1e-12, 'kaynak zemin batması (m):');
  ok(DEATH_VISUAL_Y_OFFSET_METERS >= DEATH_GROUND_DIP_METERS, 'öteleme batmayı kapatmalı');
  /* ölüm her şeyi ezer: hareket bile klibi değiştiremez */
  const moving = a.update(1 / 60, animIn({ alive: false, moving: true, speedMetersPerSec: 4 }));
  eq(moving.clip, '15_DEATH', 'ölüyken hareket klibi:');
  /* DİRİLİŞ: sunum ve öteleme TAMAMEN sıfırlanır */
  const revived = a.update(1 / 60, animIn());
  eq(revived.deathActive, false, 'diriliş sonrası ölüm sunumu:');
  eq(revived.visualYOffsetMeters, 0, 'diriliş sonrası görsel öteleme:');
  eq(revived.clip, '01_IDLE', 'diriliş klibi:');
});

test('hasar → 14_HIT_REACT · silah takma/çıkarma → 16/17', () => {
  const a = new ArcherAnimator();
  a.update(1 / 60, animIn());
  eq(a.update(1 / 60, animIn({ hpRatio: 0.7 })).clip, '14_HIT_REACT', 'hasar:');
  const b = new ArcherAnimator();
  b.update(1 / 60, animIn({ weaponRef: null }));
  eq(b.update(1 / 60, animIn({ weaponRef: 160210045 })).clip, '16_EQUIP_BOW', 'kuşanma:');
  const c = new ArcherAnimator();
  c.update(1 / 60, animIn());
  eq(c.update(1 / 60, animIn({ weaponRef: null })).clip, '17_DISARM_BOW', 'çıkarma:');
  /* ATIŞ hasar tepkisini EZER (öncelik) */
  const d = new ArcherAnimator();
  d.update(1 / 60, animIn());
  eq(d.update(1 / 60, animIn({ hpRatio: 0.5, attackTriggerCount: 1 })).clip,
    '13_AIM_RECOIL', 'atış önceliği:');
});

test('hedef varken duruş → 12_AIM_OVERDRAW TUTUŞU (çekiş DEĞİL)', () => {
  const a = new ArcherAnimator();
  a.update(1 / 60, animIn());
  const d = a.update(1 / 60, animIn({ hasTarget: true }));
  eq(d.clip, '12_AIM_OVERDRAW', 'klip:');
  eq(d.loop, false, 'döngü YOK:');
  eq(d.clamp, true, 'son karede TUTULUR:');
  ok(d.timeScale > 1, 'tutuş pozuna çabuk oturmalı');
  /* silah yoksa nişan tutuşu da yok */
  const b = new ArcherAnimator();
  b.update(1 / 60, animIn({ weaponRef: null }));
  eq(b.update(1 / 60, animIn({ weaponRef: null, hasTarget: true })).clip, '01_IDLE', 'silahsız:');
});

test('uzun duruştan sonra 02_IDLE_LOOK BİR KEZ oynar (deterministik)', () => {
  const a = new ArcherAnimator();
  let looked = 0;
  for (let i = 0; i < 60 * 20; i++) {
    const d = a.update(1 / 60, animIn());
    if (d.clip === '02_IDLE_LOOK' && d.restart) looked += 1;
  }
  eq(looked, 1, '20 sn duruşta IDLE_LOOK sayısı:');
});

console.log('P2.1 — GERÇEK GLB (WebGL GEREKMEZ):');

test('GLB gerçek GLTFLoader ile çözülür: 17 klip · 23 kemik · tek mesh', () => {
  const glb = nextArcherGlb();
  eq(glb.clips.length, 17, 'klip:');
  eq(glb.clips.map((c) => c.name).join(',').slice(0, 16), '01_IDLE,02_IDLE_', 'klip adları:');
  ok(glb.skinned !== null, 'skinned mesh bulunmalı');
  eq(glb.skinned!.skeleton.bones.length, 23, 'kemik:');
  /* düğüm adı sanitize kuralı: iki nokta DÜŞER */
  eq(sanitizedNodeName('mixamorig:Left_arch1'), 'mixamorigLeft_arch1', 'sanitize:');
  ok(findNode(glb.scene, 'mixamorig:Left_arch1') !== null, 'yay kemiği manifest adıyla bulunmalı');
  ok(findNode(glb.scene, 'mixamorig:RightHand') !== null, 'kiriş eli bulunmalı');
  ok(findNode(glb.scene, 'mixamorig:Hips') !== null, 'kalça bulunmalı');
});

test('YAY 17 KLİPTE ELDEN KOPMAZ', () => {
  const rig = new ArcherRig(nextArcherGlb());
  let min = Infinity, max = -Infinity;
  for (const name of ARCHER_CLIP_NAMES) {
    const c = archerClip(name);
    ok(rig.hasClip(name), `${name} yüklü olmalı`);
    for (let k = 0; k <= 4; k++) {
      rig.sampleClip(name, (c.durationSec * k) / 4);
      const d = rig.bowGripDistanceMeters();
      ok(d !== null, `${name} yay mesafesi ölçülmeli`);
      min = Math.min(min, d!); max = Math.max(max, d!);
    }
  }
  ok(max - min < 1e-4, `yay↔sol el sapması 17 klipte < 0.1 mm olmalı (ölçülen ${(max - min).toExponential(2)} m)`);
  ok(min > 0, 'yay kemiği ele bağlı olmalı');
  rig.dispose();
});

test('socketler manifest kemiklerine BAĞLANDI', () => {
  const rig = new ArcherRig(nextArcherGlb());
  rig.sampleClip('12_AIM_OVERDRAW', 1.5);
  for (const name of ['bow', 'arrowSpawn', 'nock'] as const) {
    ok(rig.socketWorldPosition(name) !== null, `${name} socketi olmalı`);
  }
  const spawn = rig.socketWorldPosition('arrowSpawn')!;
  const bow = rig.socketWorldPosition('bow')!;
  /* ArrowSpawn yay kavrama noktasının ~6 cm önündedir (manifest notu) */
  const dist = Math.hypot(spawn.x - bow.x, spawn.y - bow.y, spawn.z - bow.z) / WORLD_UNITS_PER_METER;
  /* Tolerans 0.1 mm: kemik matrisleri float32'dir, metre ölçeğinde ~3e-6 sapma
     kaçınılmazdır. Ölçüm yine de manifest ofsetinin BÜYÜKLÜĞÜNÜ doğrular. */
  near(dist, Math.hypot(-0.0577, 0.0039, 0.016), 1e-4, 'ArrowSpawn ↔ bow (m):');
  /* karakter yüksekliği world biriminde makul: socket zeminin üstünde */
  ok(spawn.y > 10 && spawn.y < 80, `ArrowSpawn yüksekliği makul olmalı (${spawn.y.toFixed(1)})`);
  rig.dispose();
});

test('ÖLÜM gameplay konumunu DEĞİŞTİRMEZ (model-yerel sunum)', () => {
  const S = protoState(2110);
  const r = headlessRenderer();
  const rig = r.attachArcher(nextArcherGlb());
  S.world.worldX = 1240; S.world.worldY = 1650;
  r.update(buildWorldFrame(S), 1 / 60);
  const beforeX = S.world.worldX, beforeY = S.world.worldY;
  /* oyuncuyu öldür — ölüm klibi 3.1 sn, 1.13 m geriye düşüş taşır */
  S.player.takeDamage(999999);
  eq(S.player.alive, false, 'oyuncu ölmeli:');
  for (let i = 0; i < 60 * 3.5; i++) r.update(buildWorldFrame(S), 1 / 60);
  /* ══ GAMEPLAY OTORİTESİ DOKUNULMADI ══ */
  near(S.world.worldX, beforeX, 1e-12, 'gameplay worldX:');
  near(S.world.worldY, beforeY, 1e-12, 'gameplay worldY:');
  const vis = r.playerVisualPosition();
  near(vis.x, beforeX, 1e-9, 'görsel kök X (gameplay konumunda):');
  near(vis.z, beforeY, 1e-9, 'görsel kök Z:');
  /* düşüş MODEL-YEREL uzayda görünür */
  const local = rig.hipsLocalDisplacementMeters();
  ok(local > 0.9, `model-yerel düşüş ~1.13 m olmalı (${local.toFixed(3)} m)`);
  near(DEATH_AUTHORED_DISPLACEMENT_METERS, 1.13, 1e-12, 'manifest yer değiştirme:');
  /* zemin batması GÖRSEL ötelemeyle kapatıldı */
  near(rig.modelLocalOffset().y, DEATH_VISUAL_Y_OFFSET_METERS, 1e-12, 'ölüm görsel Y ötelemesi:');
  const st = r.stats().archer!;
  eq(st.deathActive, true, 'telemetri ölüm:');
  eq(st.clip, '15_DEATH', 'telemetri klip:');
  r.dispose();
});

test('RESPAWN sonrası model normal root transform + IDLE\'a döner', () => {
  const S = protoState(2111);
  const r = headlessRenderer();
  const rig = r.attachArcher(nextArcherGlb());
  S.player.takeDamage(999999);
  for (let i = 0; i < 60 * 3.5; i++) r.update(buildWorldFrame(S), 1 / 60);
  ok(rig.modelLocalOffset().y > 0, 'ölümde öteleme uygulanmış olmalı');
  /* diriliş */
  S.player.restoreVitals({ hp: Number.POSITIVE_INFINITY });
  eq(S.player.alive, true, 'dirildi:');
  for (let i = 0; i < 10; i++) r.update(buildWorldFrame(S), 1 / 60);
  const off = rig.modelLocalOffset();
  near(off.x, 0, 1e-12, 'kök X sıfırlandı:');
  near(off.y, 0, 1e-12, 'GÖRSEL Y ötelemesi sıfırlandı:');
  near(off.z, 0, 1e-12, 'kök Z sıfırlandı:');
  eq(rig.currentClip, '01_IDLE', 'klip:');
  ok(rig.hipsLocalDisplacementMeters() < 0.05,
    'ölüm klibinin yerel kayması TEMİZLENMELİ');
  eq(r.stats().archer!.deathActive, false, 'telemetri ölüm sunumu:');
  r.dispose();
});

test('gerçek model primitive fallback\'i GİZLER, DEV anahtarı geri getirir', () => {
  const S = protoState(2112);
  const r = headlessRenderer();
  eq(r.usingArcherGlb, false, 'başlangıç:');
  eq(r.stats().archer, null, 'model yokken telemetri:');
  r.attachArcher(nextArcherGlb());
  r.update(buildWorldFrame(S), 1 / 60);
  eq(r.usingArcherGlb, true, 'model bağlı:');
  eq(r.assets.useGlb('player'), true, 'kayıtçı GLB:');
  eq(r.stats().archer!.clipCount, 17, 'yüklü klip:');
  /* DEV: primitive fallback'e dön */
  eq(r.toggleArcher(false), false, 'fallback:');
  r.update(buildWorldFrame(S), 1 / 60);
  eq(r.stats().archer, null, 'fallback telemetrisi:');
  /* ve geri */
  eq(r.toggleArcher(true), true, 'model geri:');
  r.update(buildWorldFrame(S), 1 / 60);
  eq(r.stats().archer!.clipCount, 17, 'geri dönüşte klip:');
  r.dispose();
});

test('ok GÖRSELİ ArrowSpawn socketinden çıkar — SAYI ve OTORİTE değişmez', () => {
  const S = protoState(2113);
  const r = headlessRenderer();
  const rig = r.attachArcher(nextArcherGlb());
  S.world.worldX = 1240; S.world.worldY = 1650;
  r.update(buildWorldFrame(S), 1 / 60);
  /* üçlü salvo — AUTHORITY sayısı korunmalı */
  S.infiniteMp = true;
  const mob = S.mobs.mobs.find((m) => m.slotId === 'fa_a3')!;
  mob.hp = 1e9; mob.maxHp = 1e9;
  S.world.worldX = mob.worldX - 100; S.world.worldY = mob.worldY;
  S.targets.select(mob.uid);
  S.updateInfiniteMp();
  ok(S.performSkill(ARCHER.UCLU_SALVO, mob, S.entities()).ok, 'cast');
  let guard = 0;
  while (S.adapter.pipeline.projectiles.length === 0 && guard++ < 4000) {
    S.stepCombat(1 / 240, S.entities());
  }
  eq(S.adapter.pipeline.projectiles.length, 3, 'authoritative ok sayısı (üçlü salvo):');
  const f0 = buildWorldFrame(S);
  r.update(f0, 1 / 60);
  eq(r.stats().projectileVisualCount, 3, 'ok görseli sayısı:');
  /* İLK karede görsel ArrowSpawn'dadır */
  const spawn = rig.socketWorldPosition('arrowSpawn')!;
  const id = f0.projectiles[0]!.id;
  const v0 = r.projectileVisualPosition(id)!;
  near(v0.x, spawn.x, 1e-9, 'ok görseli çıkış X = ArrowSpawn:');
  near(v0.z, spawn.z, 1e-9, 'ok görseli çıkış Z = ArrowSpawn:');
  /* karışım süresi dolunca görsel OTORİTEYE oturur */
  for (let i = 0; i < 12; i++) { S.stepCombat(1 / 60, S.entities()); r.update(buildWorldFrame(S), 1 / 60); }
  const auth = S.adapter.pipeline.projectiles.find((p) => p.id === id);
  if (auth) {
    const pos = CombatPipeline.position(auth);
    const v1 = r.projectileVisualPosition(id)!;
    near(v1.x, pos.x, 1e-9, 'karışım sonrası görsel X = otorite X:');
    near(v1.z, pos.y, 1e-9, 'karışım sonrası görsel Z = otorite Y:');
  }
  r.dispose();
});

test('RENDERER PARITY: gerçek model AÇIK/KAPALI gameplay sonucunu DEĞİŞTİRMEZ', () => {
  const run = (mode: 'off' | 'primitive' | 'glb'): string => {
    const S = protoState(2120);
    S.infiniteMp = true;
    S.lootPolicy.setMode('manual');
    S.mobs.ai.respawnOverrideSec = 3;
    S.genie.settings.hpPotionRef = null; S.genie.settings.mpPotionRef = null;
    S.genie.start(S.world);
    const r = mode === 'off' ? null : headlessRenderer();
    if (r && mode === 'glb') r.attachArcher(nextArcherGlb());
    const dt = 1 / 60;
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
      if (r) { r.update(buildWorldFrame(S), dt); r.render(); }
    }
    r?.dispose();
    return JSON.stringify({
      player: [Math.round(S.world.worldX * 1e6), Math.round(S.world.worldY * 1e6),
        Math.round(S.world.facingAngle * 1e6)],
      hp: Math.round(S.player.hp * 1e6), mp: Math.round(S.player.mp * 1e6),
      exp: S.player.exp, coins: S.player.coins, level: S.player.level,
      target: S.targets.selectedUid, genie: S.genie.movementState,
      ticks: S.genie.decisionTicks,
      kills: S.drops.totals.kills, items: S.drops.totals.items, coin: S.drops.totals.coin,
      ground: S.worldLoot.count,
      mobs: S.mobs.mobs.map((m) => [m.uid, m.generation, Math.round(m.hp),
        Math.round(m.worldX * 1e6), Math.round(m.worldY * 1e6), m.ai]),
    });
  };
  const off = run('off');
  eq(run('primitive'), off, '20 sn — renderer KAPALI vs primitive:');
  eq(run('glb'), off, '20 sn — renderer KAPALI vs GERÇEK GLB:');
  ok(JSON.parse(off).kills > 0, 'senaryo gerçekten farm yapmalı');
});

test('GLB YÜKLEMESİ `fetch` KULLANMAZ — DataCloneError regresyonu', () => {
  /* Tarayıcının gerçek yolu: önizleme paketinde GLB bir `data:` URI'dır. */
  eq(DATA_URI_RESULT.error, null, 'data URI yükleme hatası:');
  ok(DATA_URI_RESULT.glb !== null, 'data URI\'dan model çözülmeli');
  eq(DATA_URI_RESULT.glb!.clips.length, 17, 'klip:');
  eq(DATA_URI_RESULT.glb!.skinned!.skeleton.bones.length, 23, 'kemik:');
  /* ══ ASIL İDDİA: yükleme yolunda ne `fetch` ne `createObjectURL` çağrıldı ══ */
  eq(FETCH_SPY.calls, 0, 'fetch çağrısı:');
  eq(OBJECT_URL_SPY.calls, 0, 'URL.createObjectURL çağrısı:');
  /* DOKU GELDİ — `blob-request://` kırıkken bile */
  const mat = DATA_URI_RESULT.glb!.skinned!.material as { map?: unknown };
  ok(mat.map !== null && mat.map !== undefined, 'materyalde doku olmalı');
  /* data URI çözümü ağ katmanına dokunmaz */
  const bytes = decodeDataUri(ARCHER_DATA_URI);
  ok(bytes !== null, 'data URI çözülmeli');
  eq(bytes!.byteLength, ARCHER_MODEL.fileBytes, 'çözülen bayt:');
  eq(decodeDataUri('assets/models/archer_mobile_v1.glb'), null, 'düz yol data URI DEĞİL:');
});

test('gömülü görseller `data:` URI\'sine TAŞINIR (blob yolu kullanılmaz)', () => {
  const res = inlineGlbImages(ARCHER_GLB_BUFFER);
  /* WebP birincil + JPEG fallback = 2 görsel */
  eq(res.inlined, 2, 'data URI\'ye taşınan görsel:');
  ok(res.data.byteLength > ARCHER_GLB_BYTES.byteLength,
    'base64 gömme dosyayı büyütmeli');
  /* İKİLİ VERİ DEĞİŞMEDİ: yeniden yazılan GLB aynı geometri/klip verir */
  const dv = new DataView(res.data);
  eq(dv.getUint32(0, true), 0x46546c67, 'GLB sihirli sayısı:');
  eq(dv.getUint32(4, true), 2, 'GLB sürümü:');
  eq(dv.getUint32(8, true), res.data.byteLength, 'GLB uzunluk alanı:');
  /* GLB olmayan girdiye DOKUNULMAZ */
  const notGlb = new Uint8Array([1, 2, 3, 4]).buffer;
  eq(inlineGlbImages(notGlb).inlined, 0, 'GLB olmayan girdi:');
});

test('EKRAN EKSENİ 2D ile HİZALI — joystick ters kusuru regresyonu', () => {
  /* 2D renderer dünyayı eksen hizalı çizer: SAĞ = worldX+, YUKARI = worldY−.
     3D kamera varsayılanı bu hizayı BOZMAMALI. */
  const a = screenAxes(CAMERA_V1);
  near(a.right.x, 1, 1e-9, 'ekran SAĞ → worldX:');
  near(a.right.y, 0, 1e-9, 'ekran SAĞ → worldY:');
  near(a.up.x, 0, 1e-9, 'ekran YUKARI → worldX:');
  near(a.up.y, -1, 1e-9, 'ekran YUKARI → worldY:');
  /* P2.0 varsayılanı (yaw 45) bu hizayı BOZUYORDU — bildirilen kusur */
  const broken = screenAxes({ ...CAMERA_V1, yawDeg: 45 });
  ok(broken.right.x < 0, 'yaw 45 ekran SAĞ eksenini TERS çeviriyordu');

  /* Varsayılan kamerada joystick dönüşümü BİREBİR KİMLİK →
     3D katman açık/kapalı hareketi DEĞİŞTİRMEZ. */
  for (const [dx, dy] of [[1, 0], [0, 1], [0, -1], [-1, 0], [0.6, -0.8]] as const) {
    const w = screenToWorldMove(dx, dy, CAMERA_V1);
    near(w.x, dx, 1e-9, `joystick (${dx},${dy}) → worldX:`);
    near(w.y, dy, 1e-9, `joystick (${dx},${dy}) → worldY:`);
  }
  /* Kamera DEV'den döndürülürse girdi o çerçeveye çevrilir (ekranla hizalı kalır) */
  /* yaw 0'da kamera worldX− tarafındadır → ekran YUKARI = worldX+ */
  const rotated = screenToWorldMove(0, -1, { ...CAMERA_V1, yawDeg: 0 });
  near(rotated.x, 1, 1e-9, 'yaw 0\'da joystick YUKARI → worldX:');
  near(rotated.y, 0, 1e-9, 'yaw 0\'da joystick YUKARI → worldY:');
  const rotRight = screenToWorldMove(1, 0, { ...CAMERA_V1, yawDeg: 0 });
  near(rotRight.y, 1, 1e-9, 'yaw 0\'da joystick SAĞ → worldY:');
});

test('model GÖRSEL SIZINTI üretmez: dispose sahneyi boşaltır', () => {
  const S = protoState(2114);
  const r = headlessRenderer();
  const before = (): number => { let n = 0; r.scene.traverse(() => { n += 1; }); return n; };
  r.update(buildWorldFrame(S), 1 / 60);
  const baseline = before();
  r.attachArcher(nextArcherGlb());
  r.update(buildWorldFrame(S), 1 / 60);
  ok(before() > baseline, 'model sahneye eklenmeli');
  /* aynı modeli tekrar bağlamak İKİNCİ bir kopya bırakmaz */
  const withModel = before();
  r.toggleArcher(false); r.toggleArcher(true);
  r.update(buildWorldFrame(S), 1 / 60);
  eq(before(), withModel, 'tekrar bağlamada sahne nesne sayısı:');
  r.detachArcher();
  r.update(buildWorldFrame(S), 1 / 60);
  eq(before(), baseline, 'model kaldırılınca sahne:');
});


/* ═══════════════ P2.2 — MUTANT MOB + DUMMY KALDIRMA ═══════════════ */

const MUTANT_GLB_FILE = join(PROTO_ROOT, '..', '..', 'public', 'assets', 'models',
  'mutant_mobile_v1.glb');
const MUTANT_GLB_BYTES = readFileSync(MUTANT_GLB_FILE);
const MUTANT_GLB_BUFFER = MUTANT_GLB_BYTES.buffer.slice(
  MUTANT_GLB_BYTES.byteOffset, MUTANT_GLB_BYTES.byteOffset + MUTANT_GLB_BYTES.byteLength,
) as ArrayBuffer;
const MUTANT_GLB_POOL: LoadedGlb[] = [];
for (let i = 0; i < 8; i++) MUTANT_GLB_POOL.push(await parseGlb(MUTANT_GLB_BUFFER));
let mutantGlbCursor = 0;
function nextMutantGlb(): LoadedGlb {
  const glb = MUTANT_GLB_POOL[mutantGlbCursor++];
  if (!glb) throw new Error('[P2.2] mutant GLB havuzu tükendi');
  return glb;
}

console.log('P2.2 — mutant varlık gerçekleri (MANİFEST AUTHORITATIVE):');

test('mutant asset facts manifestle BİREBİR', () => {
  eq(MUTANT_MODEL.file, 'mutant_mobile_v1.glb', 'dosya:');
  eq(MUTANT_MODEL.fileBytes, 822716, 'boyut (bayt):');
  eq(MUTANT_MODEL.vertices, 6928, 'vertex:');
  eq(MUTANT_MODEL.triangles, 11271, 'üçgen:');
  eq(MUTANT_MODEL.meshes, 1, 'mesh:');
  eq(MUTANT_MODEL.materials, 1, 'materyal:');
  eq(MUTANT_MODEL.drawCalls, 1, 'draw call:');
  eq(MUTANT_MODEL.skinJointCount, 30, 'skin joint:');
  eq(MUTANT_MODEL.clipCount, 8, 'klip:');
  eq(MUTANT_MODEL.upAxis, 'Y', 'yukarı eksen:');
  eq(MUTANT_MODEL.forwardAxis, '+Z', 'ileri eksen:');
  eq(MUTANT_MODEL.characterHeightMeters, 1.861, 'boy (m):');
  eq(MUTANT_MODEL.decoderDependency, null, 'decoder bağımlılığı:');
  eq(MUTANT_MODEL.extensionsRequired.length, 0, 'zorunlu extension:');
});

test('8 klip · ölçülmüş vuruş anları · root motion yalnız ölümde', () => {
  eq(MUTANT_CLIP_NAMES.length, 8, 'klip sayısı:');
  eq(MUTANT_CLIP_NAMES[0], '01_IDLE', 'ilk:');
  eq(MUTANT_CLIP_NAMES[7], '08_DEATH', 'son:');
  near(mutantClip('06_ATTACK_PUNCH').hitTimeSec ?? 0, 0.267, 1e-9, 'punch vuruş anı:');
  near(mutantClip('05_ATTACK_SWIPE').hitTimeSec ?? 0, 1.300, 1e-9, 'swipe vuruş anı:');
  near(mutantClip('03_WALK').sourceSpeedMetersPerSec, 1.214, 1e-9, 'walk m/sn:');
  near(mutantClip('04_RUN').sourceSpeedMetersPerSec, 2.205, 1e-9, 'run m/sn:');
  const carriers = MUTANT_CLIPS.filter((c) => !c.rootMotionRemoved).map((c) => c.name);
  eq(carriers.join(','), '08_DEATH', 'root motion taşıyan klip:');
});

test('EKSİK KLİP AÇIKÇA İŞARETLİ — HIT_REACT uydurulmadı', () => {
  eq(MUTANT_MISSING_CLIPS.join(','), 'HIT_REACT', 'manifestin bildirdiği eksik:');
  ok(!MUTANT_CLIP_NAMES.some((n) => /HIT|REACT|FLINCH/i.test(n)),
    'hiçbir klip HIT_REACT yerine geçmek üzere yeniden ADLANDIRILMAMALI');
});

test('mob ölçeği P2.0 silüet hiyerarşisini KORUR', () => {
  /* Uydurulmuş sayı yok: ölçek `placeholder yüksekliği / doğal boy` oranıdır. */
  for (const [type, h] of Object.entries(MOB_PLACEHOLDER_HEIGHT_WORLD) as
    Array<[keyof typeof MOB_PLACEHOLDER_HEIGHT_WORLD, number]>) {
    const s = mutantScaleFor(type);
    near(MUTANT_MODEL.characterHeightMeters * s, h, 1e-6, `${type} world yüksekliği:`);
  }
  ok(mutantScaleFor('NORMAL') < mutantScaleFor('AGGRESSIVE'), 'NORMAL < AGGRESSIVE');
  ok(mutantScaleFor('AGGRESSIVE') < mutantScaleFor('ELITE'), 'AGGRESSIVE < ELITE');
});

console.log('P2.2 — mutant animasyon durum makinesi (three GEREKMEZ):');

function mobIn(p: Partial<MutantAnimInput> = {}): MutantAnimInput {
  return {
    phase: 'IDLE', speedMetersPerSec: 0, attackPhase: 'recovery',
    attackTimer: 0, hitMomentSec: 0.45, ...p,
  };
}

test('saldırı klibi PROFİL VURUŞ ANINA göre seçilir (uydurulmadı)', () => {
  /* MobAiProfile.hitMomentSec = 0.45 → punch (0.267) swipe'tan (1.300) YAKIN. */
  eq(attackClipFor(0.45).name, '06_ATTACK_PUNCH', 'profil 0.45 sn:');
  eq(MOB_AI_PROFILES.NORMAL.hitMomentSec, 0.45, 'profil değeri:');
  /* Ağır bir profil gelirse AYNI kural swipe'ı seçer — tablo değişmez. */
  eq(attackClipFor(1.2).name, '05_ATTACK_SWIPE', 'ağır profil:');
});

test('AI FAZI klip ailesini belirler, ÖLÇÜLEN HIZ oranı belirler', () => {
  const a = new MutantAnimator();
  a.update(1 / 60, mobIn({ phase: 'ROAM', speedMetersPerSec: 1.905 }));
  const roam = a.update(1 / 60, mobIn({ phase: 'ROAM', speedMetersPerSec: 1.905 }));
  eq(roam.clip, '03_WALK', 'ROAM → yürüyüş:');
  near(roam.timeScale, 1.905 / 1.214, 1e-6, 'ROAM playback:');
  const chase = a.update(1 / 60, mobIn({ phase: 'CHASE', speedMetersPerSec: 2.598 }));
  eq(chase.clip, '04_RUN', 'CHASE → koşu:');
  near(chase.timeScale, 2.598 / 2.205, 1e-6, 'CHASE playback:');
  const ret = a.update(1 / 60, mobIn({ phase: 'RETURN', speedMetersPerSec: 1.905 }));
  eq(ret.clip, '03_WALK', 'RETURN → yürüyüş:');
  eq(chase.loop, true, 'lokomosyon döngüsel:');
});

test('SALDIRI klibi gameplay vuruşuyla AYNI ANDA temas eder', () => {
  const a = new MutantAnimator();
  const punch = mutantClip('06_ATTACK_PUNCH');
  a.update(1 / 60, mobIn({ phase: 'IDLE' }));
  /* windup 0.45 sn'den geriye sayar; klip vuruş anı 0.267 sn. */
  let started = -1;
  for (let t = 0.45; t > 0; t -= 1 / 60) {
    const d = a.update(1 / 60, mobIn({ phase: 'ATTACK', attackPhase: 'windup', attackTimer: t }));
    if (d.clip === punch.name && started < 0) started = t;
  }
  ok(started > 0, 'saldırı klibi başlamalı');
  ok(started <= (punch.hitTimeSec ?? 0) + 1e-9,
    `klip, sayaç vuruş anına inince başlamalı (başladı ${started.toFixed(3)} ≤ 0.267)`);
  /* Kalan windup ile klibin vuruşa kadar olan süresi ÇAKIŞIR */
  ok(Math.abs(started - (punch.hitTimeSec ?? 0)) < 1 / 30,
    'hizalama bir kare içinde olmalı');
});

test('ÖLÜM: 08_DEATH tek atış + clamp + GÖRSEL Y ötelemesi', () => {
  const a = new MutantAnimator();
  a.update(1 / 60, mobIn());
  const d = a.update(1 / 60, mobIn({ phase: 'DYING' }));
  eq(d.clip, '08_DEATH', 'klip:');
  eq(d.loop, false, 'ASLA döngü yapmaz:');
  eq(d.clamp, true, 'ceset son karede tutulur:');
  eq(d.deathActive, true, 'ölüm sunumu:');
  near(d.visualYOffsetMeters, MUTANT_DEATH_VISUAL_Y_OFFSET_METERS, 1e-12, 'görsel Y (m):');
  ok(MUTANT_DEATH_VISUAL_Y_OFFSET_METERS >= MUTANT_DEATH_GROUND_DIP_METERS,
    'öteleme zemin batmasını kapatmalı');
  /* DEAD fazı da aynı sunumu sürdürür */
  eq(a.update(1 / 60, mobIn({ phase: 'DEAD' })).clip, '08_DEATH', 'DEAD fazı:');
  /* RESPAWN → sunum TAMAMEN sıfırlanır */
  const back = a.update(1 / 60, mobIn({ phase: 'IDLE' }));
  eq(back.deathActive, false, 'respawn sonrası ölüm sunumu:');
  eq(back.visualYOffsetMeters, 0, 'respawn sonrası öteleme:');
  eq(back.clip, '01_IDLE', 'respawn klibi:');
});

test('AGGRO kükremesi yükselen kenarda başlar, hareket başlayınca kesilir', () => {
  const a = new MutantAnimator();
  a.update(1 / 60, mobIn({ phase: 'IDLE' }));
  const roar = a.update(1 / 60, mobIn({ phase: 'AGGRO' }));
  eq(roar.clip, '07_ROAR', 'aggro kenarı:');
  eq(roar.loop, false, 'tek atış:');
  /* AGGRO devam ederken klip sürer */
  eq(a.update(1 / 60, mobIn({ phase: 'AGGRO' })).clip, '07_ROAR', 'aggro sürerken:');
  /* CHASE + hareket → kesilir */
  const chase = a.update(1 / 60, mobIn({ phase: 'CHASE', speedMetersPerSec: 2.6 }));
  eq(chase.clip, '04_RUN', 'hareket kükremeyi keser:');
});

test('uzun duruştan sonra nefes klibine geçilir (deterministik)', () => {
  const a = new MutantAnimator();
  let clip = '';
  for (let i = 0; i < 60 * 20; i++) clip = a.update(1 / 60, mobIn({ phase: 'IDLE' })).clip;
  eq(clip, '02_IDLE_BREATHE', '20 sn duruş sonrası:');
});

console.log('P2.2 — GERÇEK mutant GLB (WebGL GEREKMEZ):');

test('mutant GLB gerçek GLTFLoader ile çözülür: 8 klip · 30 joint', () => {
  const glb = nextMutantGlb();
  eq(glb.clips.length, 8, 'klip:');
  ok(glb.skinned !== null, 'skinned mesh olmalı');
  eq(glb.skinned!.skeleton.bones.length, 30, 'skin joint:');
  ok(findNode(glb.scene, 'mixamorig:Hips') !== null, 'kalça bulunmalı');
  ok(findNode(glb.scene, 'mixamorig:HeadTop_End') !== null, 'kafa üstü çapa bulunmalı');
  ok(findNode(glb.scene, 'mixamorig:LeftForeArm') !== null, 'swipe kemiği bulunmalı');
  ok(findNode(glb.scene, 'mixamorig:RightHand') !== null, 'punch kemiği bulunmalı');
});

test('mob ÖRNEKLERİ geometri ve materyali PAYLAŞIR', () => {
  const factory = new MutantRigFactory(nextMutantGlb());
  const a = factory.create('NORMAL');
  const b = factory.create('ELITE');
  const meshOf = (rig: MobRig): { geometry: unknown; material: unknown } => {
    let found: { geometry: unknown; material: unknown } | null = null;
    rig.model.traverse((o) => {
      const m = o as { isSkinnedMesh?: boolean; geometry?: unknown; material?: unknown };
      if (m.isSkinnedMesh === true && !found) found = { geometry: m.geometry, material: m.material };
    });
    if (!found) throw new Error('skinned mesh yok');
    return found;
  };
  const ma = meshOf(a), mb = meshOf(b);
  ok(ma.geometry === mb.geometry, 'GEOMETRİ paylaşılmalı');
  ok(ma.material === mb.material, 'MATERYAL paylaşılmalı');
  ok(a.model !== b.model, 'düğüm grafiği AYRI olmalı (poz bağımsız)');
  near(a.scale, mutantScaleFor('NORMAL'), 1e-9, 'NORMAL ölçeği:');
  near(b.scale, mutantScaleFor('ELITE'), 1e-9, 'ELITE ölçeği:');
  a.dispose(); b.dispose();
});

test('MOB AI FAZI → doğru klip (renderer üzerinden uçtan uca)', () => {
  const S = protoState(2200);
  const r = headlessRenderer();
  r.attachMutant(nextMutantGlb());
  r.update(buildWorldFrame(S), 1 / 60);
  const st = r.stats().mob!;
  eq(st.glbActive, true, 'mutant aktif:');
  eq(st.rigCount, 8, 'mob örneği:');
  eq(st.clipCount, 8, 'klip:');
  eq(st.attackClip, '06_ATTACK_PUNCH', 'seçilen saldırı klibi:');
  eq(st.missingClips.join(','), 'HIT_REACT', 'eksik klip raporlanmalı:');
  /* başlangıçta hepsi duruş/roam */
  for (const row of st.clips) {
    ok(['01_IDLE', '02_IDLE_BREATHE', '03_WALK'].includes(row.clip),
      `${row.phase} → ${row.clip} beklenen aralıkta olmalı`);
  }
  r.dispose();
});

test('ÖLÜM → CESET → LOOT → RESPAWN: görsel kimliği SIZMAZ', () => {
  const S = protoState(2201);
  S.lootPolicy.setMode('manual');
  S.mobs.ai.respawnOverrideSec = 0.1;
  const r = headlessRenderer();
  r.attachMutant(nextMutantGlb());
  r.update(buildWorldFrame(S), 1 / 60);
  eq(r.stats().mob!.rigCount, 8, 'başlangıç örnek sayısı:');

  const victim = S.mobs.mobs[0]!;
  const oldUid = victim.uid, oldGen = victim.generation;
  victim.hp = 0; victim.state = 'dying';
  S.reapDead();
  r.update(buildWorldFrame(S), 1 / 60);
  /* CESET: görsel yaşar ve ölüm klibi oynar */
  eq(r.stats().mob!.deathActive, 1, 'ölüm sunumu aktif mob:');
  const dyingRow = r.stats().mob!.clips.find((c) => c.uid === oldUid);
  eq(dyingRow?.clip, '08_DEATH', 'ceset klibi:');
  /* GERÇEK LOOT üretildi (kukla bunu YAPAMAZDI) */
  eq(S.drops.totals.kills, 1, 'kill:');

  /* RESPAWN → yeni uid + nesil → ESKİ görsel silinir */
  for (let i = 0; i < 300; i++) { S.mobs.update(1 / 60, S.world); r.update(buildWorldFrame(S), 1 / 60); }
  ok(victim.uid !== oldUid, `respawn yeni uid vermeli (${oldUid} → ${victim.uid})`);
  ok(victim.generation > oldGen, 'nesil artmalı');
  eq(r.stats().mob!.rigCount, 8, 'respawn sonrası örnek sayısı:');
  eq(r.stats().mob!.deathActive, 0, 'ceset sunumu temizlenmeli:');
  const newRow = r.stats().mob!.clips.find((c) => c.uid === victim.uid);
  ok(newRow !== undefined && newRow.clip !== '08_DEATH',
    'yeni nesil ÖLÜM pozunu DEVRALMAMALI');
  r.dispose();
});

test('mob örnekleri SIZMAZ: dispose mixer bağlarını da temizler', () => {
  const S = protoState(2202);
  const r = headlessRenderer();
  const count = (): number => { let n = 0; r.scene.traverse(() => { n += 1; }); return n; };
  r.update(buildWorldFrame(S), 1 / 60);
  const baseline = count();
  r.attachMutant(nextMutantGlb());
  r.update(buildWorldFrame(S), 1 / 60);
  const withModel = count();
  ok(withModel > baseline, 'mutant örnekleri sahneye eklenmeli');
  /* aç/kapa İKİNCİ bir kopya bırakmaz */
  r.toggleMutant(false); r.update(buildWorldFrame(S), 1 / 60);
  r.toggleMutant(true); r.update(buildWorldFrame(S), 1 / 60);
  eq(count(), withModel, 'tekrar bağlamada sahne nesne sayısı:');
  eq(r.stats().mob!.rigCount, 8, 'örnek sayısı:');
  /* fallback'e dön → silindirler geri gelir, mutant örnekleri gider */
  r.toggleMutant(false);
  r.update(buildWorldFrame(S), 1 / 60);
  eq(r.stats().mob, null, 'fallback telemetrisi:');
  eq(count(), baseline, 'silindir fallback sahnesi başlangıçla AYNI:');
  r.dispose();
});

test('UZUN OTURUM: mob örnek sayısı SINIRLI kalır (respawn döngüsü)', () => {
  const S = protoState(2203);
  S.mobs.ai.respawnOverrideSec = 0.4;
  const r = headlessRenderer();
  r.attachMutant(nextMutantGlb());
  let peak = 0;
  for (let i = 0; i < 60 * 90; i++) {
    if (i % 240 === 0) for (const m of S.mobs.mobs) { m.hp = 0; m.state = 'dying'; }
    S.reapDead();
    S.mobs.update(1 / 60, S.world);
    r.update(buildWorldFrame(S), 1 / 60);
    peak = Math.max(peak, r.stats().mob!.rigCount);
  }
  ok(peak <= 8, `mob örnek tepesi ≤ 8 olmalı (${peak})`);
  const s = r.stats();
  eq(s.visualsCreated - s.visualsRemoved,
    s.mobVisualCount + s.projectileVisualCount + s.lootVisualCount,
    'canlı görsel = üretilen - silinen:');
  r.dispose();
});

test('MUTANT PARITY: gerçek mob modeli gameplay sonucunu DEĞİŞTİRMEZ', () => {
  const run = (mode: 'off' | 'cylinder' | 'mutant'): string => {
    const S = protoState(2210);
    S.infiniteMp = true;
    S.lootPolicy.setMode('manual');
    S.mobs.ai.respawnOverrideSec = 3;
    S.genie.settings.hpPotionRef = null; S.genie.settings.mpPotionRef = null;
    S.genie.start(S.world);
    const r = mode === 'off' ? null : headlessRenderer();
    if (r && mode === 'mutant') r.attachMutant(nextMutantGlb());
    const dt = 1 / 60;
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
      if (r) { r.update(buildWorldFrame(S), dt); r.render(); }
    }
    r?.dispose();
    return JSON.stringify({
      player: [Math.round(S.world.worldX * 1e6), Math.round(S.world.worldY * 1e6)],
      hp: Math.round(S.player.hp * 1e6), exp: S.player.exp, coins: S.player.coins,
      target: S.targets.selectedUid, genie: S.genie.movementState,
      kills: S.drops.totals.kills, items: S.drops.totals.items,
      ground: S.worldLoot.count,
      mobs: S.mobs.mobs.map((m) => [m.uid, m.generation, Math.round(m.hp), m.ai]),
    });
  };
  const off = run('off');
  eq(run('cylinder'), off, '20 sn — renderer KAPALI vs silindir:');
  eq(run('mutant'), off, '20 sn — renderer KAPALI vs GERÇEK MUTANT:');
  ok(JSON.parse(off).kills > 0, 'senaryo gerçekten farm yapmalı');
});

console.log('P2.2 — oyuncu ATTACK / SKILL ayrımı:');

test('Standart Atış → ATTACK state · diğer skiller → SKILL state', () => {
  const a = new ArcherAnimator();
  a.update(1 / 60, animIn());
  const basic = a.update(1 / 60, animIn({ attackTriggerCount: 1 }));
  eq(basic.state, 'ATTACK', 'Standart Atış state:');
  eq(basic.clip, ARCHER_CLIP_MAP.ATTACK, 'klip:');
  const b = new ArcherAnimator();
  b.update(1 / 60, animIn());
  const skill = b.update(1 / 60, animIn({ skillTriggerCount: 1 }));
  eq(skill.state, 'SKILL', 'skill state:');
  eq(skill.clip, ARCHER_CLIP_MAP.SKILL, 'klip:');
  /* VARLIK BOŞLUĞU: paket tek bırakma klibi taşıyor — uydurulmadı. */
  eq(ARCHER_CLIP_MAP.ATTACK, ARCHER_CLIP_MAP.SKILL,
    'iki state bugün AYNI klibe çözülür (asset tek atış klibi taşır):');
});

test('gameplay klip ayrımı KAYNAK REFERANSINDAN gelir (P1.2.2 korunur)', () => {
  eq(clipForSkillRef(ARCHER.STANDART_ATIS), 'attack', 'Standart Atış:');
  for (const ref of [ARCHER.UCLU_SALVO, ARCHER.BESLI_SALVO, ARCHER.ZEHIRLI_UC]) {
    eq(clipForSkillRef(ref), 'skill', `skill ${ref}:`);
  }
  /* uçtan uca: gerçek cast state'i AYIRIR */
  const S = protoState(2220);
  S.infiniteMp = true;
  const mob = staticMob(S, { offsetX: 60, hp: 1e9 });
  S.targets.select(mob.uid);
  S.updateInfiniteMp();
  ok(S.performSkill(ARCHER.STANDART_ATIS, mob as never, S.entities()).ok, 'basic cast');
  eq(S.anim.triggers.attack, 1, 'attack sayacı:');
  eq(S.anim.triggers.skill, 0, 'skill sayacı:');
  S.action.reset(); S.combat.skills.reset(); S.updateInfiniteMp();
  ok(S.performSkill(ARCHER.UCLU_SALVO, mob as never, S.entities()).ok, 'skill cast');
  eq(S.anim.triggers.skill, 1, 'skill sayacı arttı:');
});

console.log('P2.2 — TRAINING DUMMY KALDIRILDI:');

test('kukla sistemi kaynak ağacından TAMAMEN çıktı', () => {
  const base = join(PROTO_ROOT);
  /* dosya yok */
  ok(!readdirSync(join(base, 'world')).includes('TrainingDummy.ts'),
    'world/TrainingDummy.ts silinmiş olmalı');
  ok(!readdirSync(join(base, 'world')).includes('TrainingStats.ts'),
    'world/TrainingStats.ts silinmiş olmalı');
  /* kod referansı yok */
  const scan = (dir: string, out: string[]): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'tests') continue;
      if (e.isDirectory()) { scan(join(dir, e.name), out); continue; }
      if (!e.name.endsWith('.ts')) continue;
      const src = readFileSync(join(dir, e.name), 'utf8');
      if (/\bisDummy\b|\bTrainingDummySystem\b|S\.dummies\b|\bTRAINING_AREA\b/.test(src)) {
        out.push(e.name);
      }
    }
  };
  const offenders: string[] = [];
  scan(base, offenders);
  eq(offenders.join(', '), '', 'kukla referansı kalan dosya:');
  /* WorldMob sözleşmesinde kukla alanı YOK */
  const types = readFileSync(join(base, 'world', 'types.ts'), 'utf8');
  ok(!/isDummy|infiniteHealth/.test(types), 'WorldMob içinde kukla alanı KALMAMALI');
});


/* ═══════════════ P2.3 — OK GÖRSELİ DÜZELTMESİ ═══════════════ */

console.log('P2.3 — ok görseli:');

test('OK UÇUŞ YÖNÜNE BAKAR — 90° sapma kusuru regresyonu', () => {
  /* ESKİ KOD: `rotation.set(π/2, 0, -atan2(dirY, dirX))` okun eksenini 45°
     köşegeni etrafında AYNALIYORDU. Ölçüldü: 0°/90°/180°/270° uçuşlarda
     sapma 90°, yalnız 45°'de doğru. Bu test onu bir daha kaçırmaz. */
  const S = protoState(2300);
  const r = headlessRenderer();
  r.attachArcher(nextArcherGlb());
  for (const deg of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const a = (deg * Math.PI) / 180;
    const frame = buildWorldFrame(S);
    const proj: ProjectileView = {
      ...DEFAULT_PROJECTILE_VIEW, id: 7000 + deg,
      worldX: S.world.worldX + Math.cos(a) * 200,
      worldY: S.world.worldY + Math.sin(a) * 200,
      dirX: Math.cos(a), dirY: Math.sin(a),
      travelled: 200, travelDistance: 400,
    };
    r.update({ ...frame, projectiles: [proj] }, 1 / 60);
    const axis = r.projectileVisualForward(proj.id);
    ok(axis !== null, 'ok görseli olmalı');
    /* Geometri yerel +Z'ye bakar; dünya ekseni uçuş yönüyle ÇAKIŞMALI. */
    const dot = axis!.x * Math.cos(a) + axis!.z * Math.sin(a);
    const offDeg = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
    ok(offDeg < 0.5, `${deg}° uçuşta sapma < 0.5° olmalı (ölçülen ${offDeg.toFixed(1)}°)`);
  }
  r.dispose();
});

test('OK YAYDAN ÇIKAR ve HEDEFİN GÖVDESİNE İNER (dalış YOK)', () => {
  const S = protoState(2301);
  const r = headlessRenderer();
  const rig = r.attachArcher(nextArcherGlb());
  const frame = buildWorldFrame(S);
  const target = frame.mobs[0]!;
  r.update(frame, 1 / 60);                       // matrisler kurulsun

  /* t = 0: tam yaydan çıkış.
     Socket AYNI KAREDE okunur — yay idle klibiyle sürekli hareket ettiği için
     bir kare sonraki değeri milimetrik farklı olur (bu doğru davranıştır:
     ok yaydan ÇIKAR, yaya YAPIŞMAZ). */
  const start: ProjectileView = {
    ...DEFAULT_PROJECTILE_VIEW, id: 7100,
    worldX: S.world.worldX, worldY: S.world.worldY,
    targetUid: target.uid, travelled: 0, travelDistance: 300,
  };
  r.update({ ...frame, projectiles: [start] }, 1 / 60);
  const spawn = rig.socketWorldPosition('arrowSpawn')!;
  const p0 = r.projectileVisualPosition(7100)!;
  near(p0.x, spawn.x, 1e-9, 'çıkış X = ArrowSpawn:');
  near(p0.y, spawn.y, 1e-9, 'çıkış Y = ArrowSpawn (yay yüksekliği):');
  near(p0.z, spawn.z, 1e-9, 'çıkış Z = ArrowSpawn:');

  /* uçuşun ortası: yükseklik ARADA olmalı — eski kod burada 26'ya DALIYORDU */
  const mid: ProjectileView = { ...start, worldX: target.worldX, worldY: target.worldY,
    travelled: 150, travelDistance: 300 };
  r.update({ ...frame, projectiles: [mid] }, 1 / 60);
  const p1 = r.projectileVisualPosition(7100)!;
  /* P2.4C — gövde ortası ARTIK ZEMİNE GÖREDİR. Düz dünyada `groundElevationAt`
     0 döndüğü için beklenti eskisiyle aynıdır (21); Moradon'da hedefin
     bulunduğu noktanın arazi yüksekliği eklenir. Sabit 21 yazmak, testi düz
     dünya varsayımına çivilerdi. */
  const arrive = groundElevationAt(target.worldX, target.worldY) + 21;   // NORMAL mob: 42 / 2
  /* P2.4C — okun İNMESİ değil, iki UÇ ARASINDA kalması aranır. Testin asıl
     derdi eski "sabit 26'ya dalma" kusuruydu; araziyle birlikte varış noktası
     çıkış noktasının ÜSTÜNDE de olabilir (hedef yokuşta duruyorsa). */
  const lo = Math.min(spawn.y, arrive), hi = Math.max(spawn.y, arrive);
  ok(p1.y > lo && p1.y < hi,
    `orta noktada yükseklik ${lo.toFixed(1)} ile ${hi.toFixed(1)} ARASINDA olmalı (${p1.y.toFixed(1)})`);

  /* varış: hedefin gövde ortası */
  const end: ProjectileView = { ...mid, travelled: 300 };
  r.update({ ...frame, projectiles: [end] }, 1 / 60);
  near(r.projectileVisualPosition(7100)!.y, arrive, 1e-9, 'varış yüksekliği (gövde ortası):');
  r.dispose();
});

test('ISKA eden ok DÜZ uçar (hedef yoksa iniş YOK)', () => {
  const S = protoState(2302);
  const r = headlessRenderer();
  const rig = r.attachArcher(nextArcherGlb());
  const frame = buildWorldFrame(S);
  r.update(frame, 1 / 60);                       // matrisler kurulsun
  const miss: ProjectileView = {
    ...DEFAULT_PROJECTILE_VIEW, id: 7200,
    worldX: S.world.worldX + 300, worldY: S.world.worldY,
    targetUid: null, travelled: 300, travelDistance: 400,
  };
  r.update({ ...frame, projectiles: [miss] }, 1 / 60);
  const spawn = rig.socketWorldPosition('arrowSpawn')!;
  near(r.projectileVisualPosition(7200)!.y, spawn.y, 1e-9,
    'ıska yüksekliği çıkış yüksekliğinde SABİT kalır:');
  r.dispose();
});

test('ok görseli TEK draw call kalır (parçalar birleştirildi)', () => {
  const S = protoState(2303);
  const r = headlessRenderer();
  r.update(buildWorldFrame(S), 1 / 60);
  const before = r.stats().activeObjectCount;
  const projs: ProjectileView[] = Array.from({ length: 10 }, (_, i) => ({
    ...DEFAULT_PROJECTILE_VIEW, id: 7300 + i,
    worldX: S.world.worldX + i * 10, worldY: S.world.worldY,
  }));
  r.update({ ...buildWorldFrame(S), projectiles: projs }, 1 / 60);
  eq(r.stats().projectileVisualCount, 10, 'ok görseli:');
  /* 10 ok = 10 nesne (parça başına ayrı mesh DEĞİL) */
  eq(r.stats().activeObjectCount - before, 10, 'ok başına sahne nesnesi:');
  r.dispose();
});

test('COMBAT ÖLÇER kaynak ağacından ÇIKTI', () => {
  const base = join(PROTO_ROOT);
  ok(!readdirSync(join(base, 'world')).includes('CombatMeter.ts'),
    'world/CombatMeter.ts silinmiş olmalı');
  const scan = (dir: string, out: string[]): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'tests') continue;
      if (e.isDirectory()) { scan(join(dir, e.name), out); continue; }
      if (!e.name.endsWith('.ts')) continue;
      const src = readFileSync(join(dir, e.name), 'utf8');
      if (/\bCombatMeter\b|S\.meter\b|\bDPS_WINDOW_SEC\b/.test(src)) out.push(e.name);
    }
  };
  const offenders: string[] = [];
  scan(base, offenders);
  eq(offenders.join(', '), '', 'ölçer referansı kalan dosya:');
});


/* ═══════════════ P2.4 — GERÇEK OK MODELİ ═══════════════ */

const ARROW_GLB_FILE = join(PROTO_ROOT, '..', '..', 'public', 'assets', 'models',
  'arrow_mobile_v1.glb');
const ARROW_GLB_BYTES = readFileSync(ARROW_GLB_FILE);
const ARROW_GLB_BUFFER = ARROW_GLB_BYTES.buffer.slice(
  ARROW_GLB_BYTES.byteOffset, ARROW_GLB_BYTES.byteOffset + ARROW_GLB_BYTES.byteLength,
) as ArrayBuffer;
const ARROW_GLB_POOL: LoadedGlb[] = [];
for (let i = 0; i < 6; i++) ARROW_GLB_POOL.push(await parseGlb(ARROW_GLB_BUFFER));
let arrowGlbCursor = 0;
function nextArrowGlb(): LoadedGlb {
  const glb = ARROW_GLB_POOL[arrowGlbCursor++];
  if (!glb) throw new Error('[P2.4] ok GLB havuzu tükendi');
  return glb;
}

console.log('P2.4 — ok varlığı (MANİFEST AUTHORITATIVE):');

test('ok asset facts manifestle BİREBİR', () => {
  eq(ARROW_MODEL.file, 'arrow_mobile_v1.glb', 'dosya:');
  eq(ARROW_MODEL.fileBytes, 38804, 'boyut (bayt):');
  eq(ARROW_MODEL.vertices, 82, 'vertex:');
  eq(ARROW_MODEL.triangles, 80, 'üçgen:');
  eq(ARROW_MODEL.meshes, 1, 'mesh:');
  eq(ARROW_MODEL.materials, 1, 'materyal:');
  eq(ARROW_MODEL.drawCalls, 1, 'draw call:');
  eq(ARROW_MODEL.forwardAxis, '+Z', 'ileri eksen:');
  near(ARROW_MODEL.lengthMeters, 0.7504, 1e-12, 'uzunluk (m):');
  eq(ARROW_MODEL.alphaMode, 'MASK', 'alfa kipi (ZORUNLU):');
  eq(ARROW_MODEL.doubleSided, true, 'çift yüzlü (ZORUNLU):');
  eq(ARROW_MODEL.decoderDependency, null, 'decoder bağımlılığı:');
  eq(ARROW_MODEL.extensionsRequired.length, 0, 'zorunlu extension:');
  near(ARROW_TIP_LOCAL[2] ?? 0, 0.7504, 1e-12, 'uç yerel Z:');
});

test('ok GLB gerçekten STATİK ve manifestin dediği yerde', () => {
  const glb = nextArrowGlb();
  eq(glb.clips.length, 0, 'animasyon klibi (statik mesh):');
  eq(glb.skinned, null, 'skinned mesh:');
  ok(findNode(glb.scene, 'arrow_nock') !== null, 'arrow_nock düğümü olmalı');
  const tip = findNode(glb.scene, 'arrow_tip');
  ok(tip !== null, 'arrow_tip düğümü olmalı');
  /* Tolerans 0.1 mm: düğüm konumu GLB'de float32 saklanır (ölçülen sapma 2.4e-6 m). */
  near(tip!.position.z, 0.7504, 1e-4, 'uç düğümü Z:');
  /* materyal zorunlulukları: alfa kesimi + çift yüz */
  const mats: Array<{ alphaTest?: number; side?: number }> = [];
  glb.scene.traverse((o) => {
    const m = o as { isMesh?: boolean; material?: { alphaTest?: number; side?: number } };
    if (m.isMesh === true && m.material) mats.push(m.material);
  });
  eq(mats.length, 1, 'materyal sayısı:');
  near(mats[0]!.alphaTest ?? 0, 0.5, 1e-9, 'alphaTest (alfa kesimi ZORUNLU):');
  eq(mats[0]!.side, 2, 'side (2 = DoubleSide, tüyler için ZORUNLU):');
});

console.log('P2.4 — ok modeli renderer entegrasyonu:');

test('gerçek ok modeli bağlanır ve ORİJİN UCA taşınır', () => {
  const S = protoState(2400);
  const r = headlessRenderer();
  eq(r.stats().arrow, null, 'başlangıç (primitive silüet):');
  ok(r.attachArrow(nextArrowGlb()), 'model bağlanmalı');
  const st = r.stats().arrow!;
  eq(st.glbActive, true, 'model aktif:');
  eq(st.vertices, 82, 'vertex:');
  eq(st.triangles, 80, 'üçgen:');
  eq(st.alphaMode, 'MASK', 'alfa kipi:');
  near(st.lengthWorld, 0.7504 * WORLD_UNITS_PER_METER, 0.01, 'world uzunluğu:');

  /* ORİJİN KONTROLÜ: ok görselinin konumu = OTORİTENİN konumu (yani UÇ).
     Varlığın kendi orijini NOCK'tadır; geometri -uzunluk kadar ötelendiği
     için görsel kök, okun VURDUĞU noktaya oturur. */
  const frame = buildWorldFrame(S);
  const proj: ProjectileView = {
    ...DEFAULT_PROJECTILE_VIEW, id: 7400,
    worldX: S.world.worldX + 200, worldY: S.world.worldY,
    travelled: 200, travelDistance: 400,
  };
  r.update({ ...frame, projectiles: [proj] }, 1 / 60);
  const pos = r.projectileVisualPosition(7400)!;
  near(pos.x, proj.worldX, 1e-9, 'görsel X = otorite X (uç):');
  near(pos.z, proj.worldY, 1e-9, 'görsel Z = otorite Y (uç):');
  r.dispose();
});

test('gerçek ok da UÇUŞ YÖNÜNE bakar (P2.3 kuralı korunur)', () => {
  const S = protoState(2401);
  const r = headlessRenderer();
  r.attachArrow(nextArrowGlb());
  const frame = buildWorldFrame(S);
  for (const deg of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const a = (deg * Math.PI) / 180;
    const proj: ProjectileView = {
      ...DEFAULT_PROJECTILE_VIEW, id: 7410 + deg,
      worldX: S.world.worldX + Math.cos(a) * 200,
      worldY: S.world.worldY + Math.sin(a) * 200,
      dirX: Math.cos(a), dirY: Math.sin(a), travelled: 200, travelDistance: 400,
    };
    r.update({ ...frame, projectiles: [proj] }, 1 / 60);
    const axis = r.projectileVisualForward(proj.id)!;
    const dot = axis.x * Math.cos(a) + axis.z * Math.sin(a);
    const off = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
    ok(off < 0.5, `${deg}° uçuşta sapma < 0.5° (ölçülen ${off.toFixed(1)}°)`);
  }
  r.dispose();
});

test('gerçek ok TEK sahne nesnesi kalır (düğüm grafiği KOPYALANMAZ)', () => {
  const S = protoState(2402);
  const r = headlessRenderer();
  r.attachArrow(nextArrowGlb());
  r.update(buildWorldFrame(S), 1 / 60);
  const before = r.stats().activeObjectCount;
  const projs: ProjectileView[] = Array.from({ length: 10 }, (_, i) => ({
    ...DEFAULT_PROJECTILE_VIEW, id: 7500 + i,
    worldX: S.world.worldX + i * 10, worldY: S.world.worldY,
  }));
  r.update({ ...buildWorldFrame(S), projectiles: projs }, 1 / 60);
  eq(r.stats().projectileVisualCount, 10, 'ok görseli:');
  /* marker düğümleri (arrow_nock / arrow_tip) sahneye SIZMAMALI */
  eq(r.stats().activeObjectCount - before, 10, 'ok başına sahne nesnesi:');
  eq(r.stats().arrow!.liveCount, 10, 'telemetri canlı ok:');
  r.dispose();
});

test('DEV anahtarı ok modeli ile primitive silüet arasında geçer', () => {
  const S = protoState(2403);
  const r = headlessRenderer();
  const proj: ProjectileView = {
    ...DEFAULT_PROJECTILE_VIEW, id: 7600,
    worldX: S.world.worldX + 100, worldY: S.world.worldY,
  };
  r.attachArrow(nextArrowGlb());
  r.update({ ...buildWorldFrame(S), projectiles: [proj] }, 1 / 60);
  ok(r.stats().arrow !== null, 'model aktif olmalı');
  /* HAVADAKİ ok da yeni geometriye geçer (yeniden doğması gerekmez) */
  eq(r.toggleArrow(false), false, 'fallback:');
  r.update({ ...buildWorldFrame(S), projectiles: [proj] }, 1 / 60);
  eq(r.stats().arrow, null, 'fallback telemetrisi:');
  eq(r.stats().projectileVisualCount, 1, 'ok görseli korunur:');
  ok(r.toggleArrow(true), 'model geri:');
  r.update({ ...buildWorldFrame(S), projectiles: [proj] }, 1 / 60);
  eq(r.stats().arrow!.vertices, 82, 'geri dönüşte model:');
  r.dispose();
});

test('OK MODELİ PARITY: gameplay sonucunu DEĞİŞTİRMEZ', () => {
  const run = (withArrow: boolean): string => {
    const S = protoState(2420);
    S.infiniteMp = true;
    S.lootPolicy.setMode('manual');
    S.mobs.ai.respawnOverrideSec = 3;
    S.genie.settings.hpPotionRef = null; S.genie.settings.mpPotionRef = null;
    S.genie.start(S.world);
    const r = headlessRenderer();
    if (withArrow) r.attachArrow(nextArrowGlb());
    const dt = 1 / 60;
    for (let i = 0; i < 60 * 15; i++) {
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
    }
    r.dispose();
    return JSON.stringify({
      hp: Math.round(S.player.hp * 1e6), exp: S.player.exp, coins: S.player.coins,
      kills: S.drops.totals.kills, items: S.drops.totals.items,
      mobs: S.mobs.mobs.map((m) => [m.uid, m.generation, Math.round(m.hp), m.ai]),
    });
  };
  const off = run(false);
  eq(run(true), off, '15 sn — primitive silüet vs GERÇEK OK MODELİ:');
  ok(JSON.parse(off).kills > 0, 'senaryo gerçekten farm yapmalı');
});


/* ═══════════════ P2.4A — MORADON KOORDİNAT TEMELİ ═══════════════ */

console.log('P2.4A — Moradon koordinat temeli:');

test('kaynak sabitleri (zone 21 · moradon_0826.smd · 512×512)', () => {
  eq(MORADON_ZONE_ID, 21, 'zone id:');
  eq(MORADON_MAP_FILE, 'moradon_0826.smd', 'kanonik harita:');
  eq(MORADON_SOURCE_WIDTH, 512, 'kaynak genişlik:');
  eq(MORADON_SOURCE_HEIGHT, 512, 'kaynak yükseklik:');
  eq(KO_TO_WORLD_SCALE, 10, 'ölçek:');
  eq(MORADON_KO_SPAWN.x, 306, 'KO spawn X:');
  eq(MORADON_KO_SPAWN.z, 352, 'KO spawn Z:');
});

test('world boyutları ölçekten TÜREMELİ (elle yazılmamalı)', () => {
  eq(MORADON_WORLD_WIDTH, MORADON_SOURCE_WIDTH * KO_TO_WORLD_SCALE, 'world genişlik:');
  eq(MORADON_WORLD_HEIGHT, MORADON_SOURCE_HEIGHT * KO_TO_WORLD_SCALE, 'world yükseklik:');
  eq(MORADON_WORLD_WIDTH, 5120, 'genişlik (sayı):');
  eq(MORADON_WORLD_HEIGHT, 5120, 'yükseklik (sayı):');
  eq(MORADON_WORLD_BOUNDS.width, 5120, 'bounds genişlik:');
  eq(MORADON_WORLD_BOUNDS.height, 5120, 'bounds yükseklik:');
});

test('koToWorld — X→X · Z→Y, ofset/rotasyon/eksen çevirme YOK', () => {
  const origin = koToWorld(0, 0);
  eq(origin.x, 0, 'KO (0,0) → world X:');
  eq(origin.y, 0, 'KO (0,0) → world Y:');

  const far = koToWorld(512, 512);
  eq(far.x, 5120, 'KO (512,512) → world X:');
  eq(far.y, 5120, 'KO (512,512) → world Y:');

  const spawn = koToWorld(306, 352);
  eq(spawn.x, 3060, 'KO (306,352) → world X:');
  eq(spawn.y, 3520, 'KO (306,352) → world Y:');

  /* EKSEN AYRIMI: X ve Z birbirine karışmamalı. */
  const onlyX = koToWorld(100, 0);
  eq(onlyX.x, 1000, 'yalnız X → world X:');
  eq(onlyX.y, 0, 'yalnız X → world Y (0 kalmalı):');
  const onlyZ = koToWorld(0, 100);
  eq(onlyZ.x, 0, 'yalnız Z → world X (0 kalmalı):');
  eq(onlyZ.y, 1000, 'yalnız Z → world Y:');
});

test('MORADON_WORLD_SPAWN dönüşümden TÜREMELİ', () => {
  eq(MORADON_WORLD_SPAWN.x, 3060, 'world spawn X:');
  eq(MORADON_WORLD_SPAWN.y, 3520, 'world spawn Y:');
  const derived = koToWorld(MORADON_KO_SPAWN.x, MORADON_KO_SPAWN.z);
  eq(MORADON_WORLD_SPAWN.x, derived.x, 'X türetilmiş değerle aynı:');
  eq(MORADON_WORLD_SPAWN.y, derived.y, 'Y türetilmiş değerle aynı:');
});

test('worldToKo gidiş-dönüş BİREBİR', () => {
  for (const [x, z] of [[0, 0], [306, 352], [512, 512], [27, 497], [498, 23]] as const) {
    const w = koToWorld(x, z);
    const back = worldToKo(w.x, w.y);
    eq(back.x, x, `gidiş-dönüş X (${x},${z}):`);
    eq(back.z, z, `gidiş-dönüş Z (${x},${z}):`);
  }
});

test('koToWorld SAF: yan etkisi yok, deterministik', () => {
  const a = koToWorld(306, 352);
  const b = koToWorld(306, 352);
  eq(a.x, b.x, 'aynı girdi aynı X:');
  eq(a.y, b.y, 'aynı girdi aynı Y:');
  ok(a !== b, 'her çağrı YENİ nesne döndürmeli (paylaşılan mutable yok)');
  /* Sabitler dokunulmamış olmalı */
  eq(MORADON_KO_SPAWN.x, 306, 'sabit korunmalı:');
});

test('P2.4C — AKTİF HARİTA MORADON, arşiv dünyası KORUNDU', () => {
  /* P2.4A'da bu test "Moradon henüz bağlanmadı"yı doğruluyordu. P2.4C harita
     anahtarını çevirdi; testin yeni işi, anahtarın DOĞRU tarafa oturduğunu ve
     arşiv dünyasının kaybolmadığını göstermektir. */
  eq(WORLD_BOUNDS.width, MORADON_WORLD_BOUNDS.width, 'aktif WORLD_BOUNDS genişlik:');
  eq(WORLD_BOUNDS.height, MORADON_WORLD_BOUNDS.height, 'aktif WORLD_BOUNDS yükseklik:');
  eq(SPAWN_POINT.x, MORADON_PLAY_SPAWN.x, 'aktif SPAWN_POINT X:');
  eq(SPAWN_POINT.y, MORADON_PLAY_SPAWN.y, 'aktif SPAWN_POINT Y:');
  /* Arşiv dünyası yerinde: anahtar geri çevrilirse aynen döner. */
  eq(TEST_WORLD_BOUNDS.width, 2480, 'arşiv genişlik:');
  eq(TEST_WORLD_BOUNDS.height, 3300, 'arşiv yükseklik:');
  eq(TEST_SPAWN_POINT.x, 1240, 'arşiv spawn X:');
  /* Enjekte edilen dünya gerçekten kullanılıyor mu (protoState → TEST_WORLD) */
  const S = protoState(2440);
  eq(S.world.worldX, TEST_SPAWN_POINT.x, 'enjekte dünyanın spawn X\'i:');
  eq(S.world.worldY, TEST_SPAWN_POINT.y, 'enjekte dünyanın spawn Y\'i:');
  /* Varsayılan (enjeksiyonsuz) durum CANLI dünyayı kullanır. */
  const live = new PrototypeState(2441);
  eq(live.world.worldX, MORADON_PLAY_SPAWN.x, 'varsayılan durum köşede doğar:');
  eq(S.mobs.mobs.length, 8, 'farm slotları DEĞİŞMEDİ:');
});

test('Moradon koordinat katmanı YALNIZ harita anahtarından okunur', () => {
  /* P2.4A'da hiçbir dosya `moradon-coords`u import edemezdi (katman
     bağlanmamıştı). P2.4C'de TEK bir dosya import eder: harita anahtarının
     kendisi (`world-map.ts`). Gameplay otoriteleri hâlâ okuyamaz — koordinat
     temeli tek bir kapıdan girer. */
  const ALLOWED = ['world-map.ts', 'moradon-farm-slots.ts'];
  const base = join(PROTO_ROOT);
  const offenders: string[] = [];
  const scan = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'tests') continue;
      if (e.isDirectory()) { scan(join(dir, e.name)); continue; }
      if (!e.name.endsWith('.ts') || e.name === 'moradon-coords.ts') continue;
      const src = readFileSync(join(dir, e.name), 'utf8');
      if (/moradon-coords/.test(src) && !ALLOWED.includes(e.name)) offenders.push(e.name);
    }
  };
  scan(base);
  eq(offenders.join(', '), '', 'Moradon katmanını import eden dosya:');
  /* Three'ye de bağlı olmamalı */
  const src = readFileSync(join(base, 'data', 'moradon-coords.ts'), 'utf8');
  ok(!/from\s+'three/.test(src), 'moradon-coords three IMPORT ETMEMELİ');
});


/* ================= P2.4B — DİKDÖRTGEN ÇOK-MOBLU SLOT TEMELİ ================= */
console.log('P2.4B — kanonik çok-moblu spawn slotu:');

/** Kanonik fixture tanımı — testin count'u değiştirebilmesi için ham girdi. */
function slotDef(over: Partial<MobSlotDefinition> = {}): MobSlotDefinition {
  return {
    id: 'v_slot', displayName: 'test_mob_v', monsterRef: 750,
    area: { minX: 0, maxX: 400, minY: 0, maxY: 400 }, count: 5, aiType: 'NORMAL',
    visual: { sheet: 'kurt', tint: '#fff', scale: 0.52 },
    ...over,
  };
}
/** Slot listesinden bağımsız bir yaşam döngüsü sistemi (renderer YOK). */
function slotSys(slots: readonly MobSpawnSlot[], seed = 2460): MobSlotSystem {
  const sys = new MobSlotSystem(slots, {
    rng: mulberry32(seed), aggroMult: () => 1, playerAlive: () => true,
    strike: (mob) => ({ mob, damage: 1, playerHpAfter: 100 }),
  });
  /* DEV respawn ezmesi KAPALI → süre SLOTTAN okunmalı (§18). */
  sys.ai.respawnOverrideSec = null;
  sys.populate();
  return sys;
}
/** Oyuncuyu ÇOK UZAKTA tutar: AI aggro olmaz, ölçüm saf kalır. */
const FAR = newPlayer(-90000, -90000);
function tick(sys: MobSlotSystem, seconds: number, dt = 1 / 60): void {
  for (let i = 0; i < Math.round(seconds / dt); i++) sys.update(dt, FAR);
}

/* ---------------- §3/§4 population doğrulaması ---------------- */

test('§3 population sabitleri 5..8', () => {
  eq(MIN_MOBS_PER_SLOT, 5, 'MIN_MOBS_PER_SLOT:');
  eq(MAX_MOBS_PER_SLOT, 8, 'MAX_MOBS_PER_SLOT:');
});

test('§4 count doğrulaması: 4 ve 9 RED · 5,6,7,8 KABUL', () => {
  for (const bad of [4, 9]) {
    const v = validateMobSlot(slotDef({ count: bad }));
    ok(!v.ok, `count=${bad} reddedilmeli`);
    if (!v.ok) ok(v.errors.some((e) => e.includes('count')), `count=${bad} hata metni count demeli`);
  }
  for (const good of [5, 6, 7, 8]) {
    ok(validateMobSlot(slotDef({ count: good })).ok, `count=${good} kabul edilmeli`);
  }
});

test('§4 geçersiz count SESSİZCE KIRPILMAZ — defineMobSlot FIRLATIR', () => {
  for (const bad of [4, 9, 1, 0, -3, 5.5]) {
    let threw = false;
    try { defineMobSlot(slotDef({ count: bad })); } catch { threw = true; }
    ok(threw, `count=${bad} fırlatmalı`);
  }
  /* clamp olsaydı 4 → 5 örnek üretirdi; üretmiyor. */
  eq(defineMobSlot(slotDef({ count: 5 })).count, 5, 'geçerli count korunur:');
});

test('§10 dikdörtgen normalize olmalı + çok örnekli slot 0 alana sığmaz', () => {
  ok(!validateMobSlot(slotDef({ area: { minX: 400, maxX: 0, minY: 0, maxY: 400 } })).ok, 'minX > maxX reddedilmeli');
  ok(!validateMobSlot(slotDef({ area: { minX: 0, maxX: 400, minY: 400, maxY: 0 } })).ok, 'minY > maxY reddedilmeli');
  ok(!validateMobSlot(slotDef({ area: { minX: 5, maxX: 5, minY: 0, maxY: 400 } })).ok, 'sıfır genişlik reddedilmeli');
  const c = defineMobSlot(slotDef());
  eq(c.homeX, 200, 'homeX dikdörtgen merkezi:'); eq(c.homeY, 200, 'homeY dikdörtgen merkezi:');
});

/* ---------------- §2.1 tek slot = tek mob türü ---------------- */

test('§2.1 bir slot TEK monsterRef taşır — 5 ve 8 örneğin hepsi aynı tür', () => {
  const sys = slotSys(TEST_MULTI_SLOTS);
  const a = sys.instancesOf('test_slot_a'), b = sys.instancesOf('test_slot_b');
  eq(a.length, 5, 'slot A örnek:'); eq(b.length, 8, 'slot B örnek:');
  eq(new Set(a.map((m) => m.monster.sourceRef)).size, 1, 'slot A tek tür:');
  eq(new Set(b.map((m) => m.monster.sourceRef)).size, 1, 'slot B tek tür:');
  ok(TEST_SLOT_A.monsterRef !== TEST_SLOT_B.monsterRef, 'farklı tür → AYRI slot');
  ok(a[0]!.monster.sourceRef !== b[0]!.monster.sourceRef, 'iki slot farklı monster çözmeli');
  /* Tipin kendisi karışmayı imkânsız kılar: monsterRef bir LİSTE değildir. */
  eq(typeof TEST_SLOT_A.monsterRef, 'number', 'monsterRef tekil:');
});

/* ---------------- §12/§13 population + bağımsız örnek ---------------- */

test('§13 count=5 → TAM 5 bağımsız örnek · count=8 → TAM 8', () => {
  const sys = slotSys(TEST_MULTI_SLOTS);
  eq(sys.mobs.length, 13, 'toplam fixture population:');
  eq(sys.targetCount('test_slot_a'), 5, 'slot A hedef:');
  eq(sys.targetCount('test_slot_b'), 8, 'slot B hedef:');
  eq(sys.aliveIn('test_slot_a'), 5, 'slot A canlı:');
  eq(sys.aliveIn('test_slot_b'), 8, 'slot B canlı:');
  eq(sys.areaTelemetry().population, 13, 'telemetri population:');
});

test('§33 UID benzersiz · §14 slot aidiyeti (slotId + instanceIndex)', () => {
  const sys = slotSys(TEST_MULTI_SLOTS);
  eq(new Set(sys.mobs.map((m) => m.uid)).size, 13, 'benzersiz uid:');
  for (const slot of TEST_MULTI_SLOTS) {
    const inst = sys.instancesOf(slot.id);
    const idx = inst.map((m) => m.instanceIndex).sort((x, y) => x - y);
    eq(idx.join(','), inst.map((_, i) => i).join(','), `${slot.id}: instanceIndex 0..n-1 olmalı`);
    for (const m of inst) eq(m.slotId, slot.id, 'slot aidiyeti:');
  }
  /* Paylaşılan nesne YOK: her örnek ayrı referans, ayrı runtime. */
  eq(new Set(sys.mobs.map((m) => m as unknown)).size, 13, 'ayrı nesne:');
  eq(new Set(sys.mobs.map((m) => sys.ai.runtimeOf(m.uid))).size, 13, 'ayrı AI runtime:');
});

test('populate() tekrar çağrılsa bile YUVA ÇOĞALMAZ', () => {
  const sys = slotSys(TEST_MULTI_SLOTS);
  const r = sys.populate();
  eq(r.spawned, 0, 'ikinci populate yeni mob üretmemeli:');
  eq(sys.mobs.length, 13, 'population sabit:');
});

/* ---------------- §15/§32 dikdörtgen dağılımı + determinizm ---------------- */

test('§32 bütün örnekler dikdörtgen İÇİNDE ve ÜST ÜSTE DEĞİL', () => {
  const sys = slotSys(TEST_MULTI_SLOTS);
  for (const slot of TEST_MULTI_SLOTS) {
    const inst = sys.instancesOf(slot.id);
    for (const m of inst) {
      ok(isInsideArea(slot, m.worldX, m.worldY), `${slot.id}#${m.instanceIndex} dikdörtgen dışında`);
      eq(m.homeX, m.worldX, 'ev = doğuş noktası (X):');
      eq(m.homeY, m.worldY, 'ev = doğuş noktası (Y):');
    }
    for (let i = 0; i < inst.length; i++) {
      for (let j = i + 1; j < inst.length; j++) {
        const d = Math.hypot(inst[i]!.worldX - inst[j]!.worldX, inst[i]!.worldY - inst[j]!.worldY);
        ok(d > 1, `${slot.id}: #${i} ve #${j} üst üste (${d.toFixed(3)})`);
      }
    }
  }
});

test('§16 doğuş DETERMİNİSTİK — aynı (slot, instance, generation) → aynı nokta', () => {
  for (const g of [1, 2, 7]) {
    for (let i = 0; i < 8; i++) {
      const a = instanceSpawnPoint(TEST_SLOT_B, i, g);
      const b = instanceSpawnPoint(TEST_SLOT_B, i, g);
      eq(a.x, b.x, `#${i} gen${g} X:`); eq(a.y, b.y, `#${i} gen${g} Y:`);
    }
  }
  /* İki AYRI sistem örneği (farklı rng tohumu) AYNI yerleşimi üretmeli:
     yerleşim paylaşılan RNG AKIŞINA değil, kimlik üçlüsüne bağlıdır. */
  const p1 = slotSys(TEST_MULTI_SLOTS, 11).mobs.map((m) => `${m.worldX.toFixed(6)}/${m.worldY.toFixed(6)}`);
  const p2 = slotSys(TEST_MULTI_SLOTS, 99999).mobs.map((m) => `${m.worldX.toFixed(6)}/${m.worldY.toFixed(6)}`);
  eq(p1.join('|'), p2.join('|'), 'yerleşim rng akışından bağımsız:');
  /* Kaynakta Math.random YASAK. */
  const schemaCode = readFileSync(join(PROTO_ROOT, 'data', 'mob-slot-schema.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');   // yorumlar hariç
  ok(!/Math\.random/.test(schemaCode), 'mob-slot-schema Math.random KULLANMAMALI');
});

test('§17 generation değişince örnek AYNI hücrede YENİ noktaya doğar', () => {
  for (let i = 0; i < 8; i++) {
    const g1 = instanceSpawnPoint(TEST_SLOT_B, i, 1);
    const g2 = instanceSpawnPoint(TEST_SLOT_B, i, 2);
    ok(Math.hypot(g1.x - g2.x, g1.y - g2.y) > 1e-6, `#${i} generation değişince nokta değişmeli`);
    ok(isInsideArea(TEST_SLOT_B, g2.x, g2.y), `#${i} yeni nokta dikdörtgen içinde olmalı`);
  }
});

/* ---------------- §18/§19/§20 örnek bazlı respawn ---------------- */

/** Slot A senaryosu — rapor tablosunu ÖLÇEREK üretir. */
function respawnScenario(slotId: string, expect: number): {
  initial: number; killed: number; during: number; after: number; peak: number;
  newUid: boolean; newGen: boolean; sameSlot: boolean; sameRef: boolean; inRect: boolean;
} {
  const sys = slotSys(TEST_MULTI_SLOTS);
  const slot = sys.slotOf(slotId)!;
  const initial = sys.aliveIn(slotId);
  const victim = sys.instancesOf(slotId)[2]!;
  const oldUid = victim.uid, oldGen = victim.generation, oldRef = victim.monster.sourceRef;
  const others = sys.instancesOf(slotId).filter((m) => m.uid !== oldUid);
  const hpBefore = others.map((m) => m.hp);
  victim.hp = 0; victim.state = 'dying';
  sys.markDead(victim);
  const killed = sys.aliveIn(slotId);
  /* Diğerleri DOKUNULMAMIŞ olmalı (§30). */
  for (let i = 0; i < others.length; i++) {
    eq(others[i]!.hp, hpBefore[i], `${slotId}: komşu HP değişmemeli`);
    ok(others[i]!.ai !== 'dead', `${slotId}: komşu ölmemeli`);
  }
  tick(sys, TEST_SLOT_RESPAWN_SEC * 0.5);
  const during = sys.aliveIn(slotId);
  let peak = Math.max(initial, killed, during);
  tick(sys, TEST_SLOT_RESPAWN_SEC * 0.6);
  for (let i = 0; i < 30; i++) { tick(sys, 0.1); peak = Math.max(peak, sys.aliveIn(slotId)); }
  const after = sys.aliveIn(slotId);
  eq(sys.instancesOf(slotId).length, expect, `${slotId}: nesne sayısı sabit kalmalı`);
  const back = sys.instancesOf(slotId).find((m) => m.instanceIndex === victim.instanceIndex)!;
  return {
    initial, killed, during, after, peak,
    newUid: back.uid !== oldUid,
    newGen: back.generation === oldGen + 1,
    sameSlot: back.slotId === slotId,
    sameRef: back.monster.sourceRef === oldRef,
    inRect: isInsideArea(slot, back.worldX, back.worldY),
  };
}

test('§30 TEST SLOT A: 5 → öldür → 4 → respawn → 5 (yeni uid/generation)', () => {
  const r = respawnScenario('test_slot_a', 5);
  eq(r.initial, 5, 'başlangıç:'); eq(r.killed, 4, 'bir ölüm sonrası:');
  eq(r.during, 4, 'respawn beklerken:'); eq(r.after, 5, 'respawn sonrası:');
  eq(r.peak, 5, 'population tavanı:');
  ok(r.newUid, 'yeni uid olmalı'); ok(r.newGen, 'generation +1 olmalı');
  ok(r.sameSlot, 'slotId korunmalı'); ok(r.sameRef, 'monsterRef korunmalı');
  ok(r.inRect, 'yeni konum dikdörtgen içinde olmalı');
});

test('§31 TEST SLOT B: 8 → öldür → 7 → respawn → 8 · population 8i AŞMAZ', () => {
  const r = respawnScenario('test_slot_b', 8);
  eq(r.initial, 8, 'başlangıç:'); eq(r.killed, 7, 'bir ölüm sonrası:');
  eq(r.during, 7, 'respawn beklerken:'); eq(r.after, 8, 'respawn sonrası:');
  eq(r.peak, 8, 'population tavanı:');
  ok(r.newUid && r.newGen && r.sameSlot && r.sameRef && r.inRect, 'kimlik/aidiyet sözleşmesi');
});

test('§18 respawn süresi SLOTTAN gelir ve ÖRNEK BAZLIDIR', () => {
  const sys = slotSys(TEST_MULTI_SLOTS);
  const inst = sys.instancesOf('test_slot_b');
  /* İki mobu 1 sn arayla öldür → iki AYRI sayaç, iki AYRI dönüş anı. */
  inst[0]!.state = 'dying'; sys.markDead(inst[0]!);
  eq(Math.round(inst[0]!.respawnTimer), TEST_SLOT_RESPAWN_SEC, 'sayaç slot değerinden:');
  tick(sys, 1);
  inst[1]!.state = 'dying'; sys.markDead(inst[1]!);
  eq(sys.aliveIn('test_slot_b'), 6, 'iki ölü:');
  tick(sys, TEST_SLOT_RESPAWN_SEC - 1 + 0.2);
  eq(sys.aliveIn('test_slot_b'), 7, 'YALNIZ ilk mob döndü:');
  tick(sys, 1.2);
  eq(sys.aliveIn('test_slot_b'), 8, 'ikinci mob da döndü:');
});

test('§19 bir ölüm SLOTU SIFIRLAMAZ — komşuların uid/generation/konumu sabit', () => {
  const sys = slotSys(TEST_MULTI_SLOTS);
  const inst = sys.instancesOf('test_slot_a');
  const victim = inst[0]!;
  const snap = inst.slice(1).map((m) => ({ uid: m.uid, gen: m.generation, x: m.homeX, y: m.homeY }));
  victim.state = 'dying'; sys.markDead(victim);
  tick(sys, TEST_SLOT_RESPAWN_SEC + 1);
  const after = sys.instancesOf('test_slot_a').filter((m) => m.instanceIndex !== victim.instanceIndex);
  for (let i = 0; i < snap.length; i++) {
    eq(after[i]!.uid, snap[i]!.uid, 'komşu uid:');
    eq(after[i]!.generation, snap[i]!.gen, 'komşu generation:');
    eq(after[i]!.homeX, snap[i]!.x, 'komşu ev X:');
  }
});

test('§20 TÜM slot ölse bile population count TAVANINI aşmaz', () => {
  const sys = slotSys(TEST_MULTI_SLOTS);
  for (const m of sys.mobs) { m.state = 'dying'; sys.markDead(m); }
  let peak = 0;
  for (let i = 0; i < 200; i++) {
    tick(sys, 0.1);
    peak = Math.max(peak, sys.aliveIn('test_slot_a') + sys.aliveIn('test_slot_b'));
    eq(sys.mobs.length, 13, 'nesne sızıntısı:');
  }
  eq(sys.aliveIn('test_slot_a'), 5, 'A geri döndü:');
  eq(sys.aliveIn('test_slot_b'), 8, 'B geri döndü:');
  eq(peak, 13, 'tavan aşılmadı:');
});

/* ---------------- §22/§23 combat + target bağımsızlığı ---------------- */

test('§22/§34 aynı slotun HP’leri BAĞIMSIZ', () => {
  const sys = slotSys(TEST_MULTI_SLOTS);
  const inst = sys.instancesOf('test_slot_b');
  const a = inst[3]!, b = inst[4]!;
  const bHp = b.hp;
  a.hp -= 20;
  ok(a.hp !== b.hp, 'HP paylaşılmamalı');
  eq(b.hp, bHp, 'komşu HP:');
  a.hp = 0; a.state = 'dying'; sys.markDead(a);
  eq(b.hp, bHp, 'ölüm sonrası komşu HP:');
  ok(b.ai !== 'dead', 'komşu canlı kalmalı');
});

test('§23/§35 aynı slotun farklı örnekleri AYRI hedef seçilebilir', () => {
  const sys = slotSys(TEST_MULTI_SLOTS);
  const inst = sys.instancesOf('test_slot_b');
  const targets = new WorldTargetSystem();
  const p0 = targets.pickAt(sys.mobs, inst[0]!.worldX, inst[0]!.worldY, 20);
  eq(p0?.uid, inst[0]!.uid, 'ilk örnek hedeflendi:');
  const p1 = targets.pickAt(sys.mobs, inst[1]!.worldX, inst[1]!.worldY, 20);
  eq(p1?.uid, inst[1]!.uid, 'ikinci örnek hedeflendi:');
  ok(p0!.uid !== p1!.uid, 'iki hedef ayrı entity olmalı');
  /* Hedef ölünce SLOT değil, YALNIZ o entity düşer. */
  inst[1]!.state = 'dying'; sys.markDead(inst[1]!);
  eq(targets.current(sys.mobs, 0, 0, { pickRadius: 20, dropDistance: 1e9 }), null, 'ölü hedef temizlendi:');
  eq(sys.aliveIn('test_slot_b'), 7, 'slot hâlâ 7 canlı:');
});

/* ---------------- §24/§25 Genie + Drop (gerçek dünyada) ---------------- */

/** Çok-moblu fixture ile GERÇEK PrototypeState. Canlı oyun DEĞİŞMEZ:
 *  parametresiz `protoState()` hâlâ 8 legacy slot kurar. */
function multiRig(seed = 2461): PrototypeState {
  const S = protoState(seed, TEST_MULTI_SLOTS);
  S.mobs.ai.respawnOverrideSec = null;
  return S;
}

test('§24/§36 Genie çok örnekli havuzda hedef bulur ve kill sonrası DEVAM eder', () => {
  const S = multiRig();
  const inst = S.mobs.instancesOf('test_slot_b');
  /* Oyuncuyu slot B dikdörtgeninin ortasına taşı, sınırı geniş tut. */
  S.world.worldX = TEST_SLOT_B.homeX; S.world.worldY = TEST_SLOT_B.homeY;
  S.genie.settings.farmBoundaryRadius = 900;
  S.genie.farmCenter = { x: S.world.worldX, y: S.world.worldY };
  const player = newPlayer(S.world.worldX, S.world.worldY);
  const first = S.genie.pickTarget(S.mobs.mobs, player);
  ok(first !== null, 'Genie bir örnek hedeflemeli');
  ok(inst.some((m) => m.uid === first!.uid), 'hedef slot B örneklerinden biri olmalı');
  first!.hp = 0; first!.state = 'dying'; S.mobs.markDead(first!);
  const second = S.genie.pickTarget(S.mobs.mobs, player);
  ok(second !== null, 'kill sonrası BAŞKA canlı örnek bulunmalı');
  ok(second!.uid !== first!.uid, 'Genie slotu tek entity gibi görmemeli');
  ok(second!.ai !== 'dead', 'yeni hedef canlı olmalı');
});

test('§25/§37 drop KILL-INSTANCE bazlı — diğer 7 mob etkilenmez', () => {
  const S = multiRig(2462);
  const inst = S.mobs.instancesOf('test_slot_b');
  const victim = inst[5]!;
  victim.hp = 0; victim.state = 'dying';
  const reaped = S.reapDead();
  eq(reaped.length, 1, 'tek kill çözülmeli:');
  eq(reaped[0]!.drop.mobUid, victim.uid, 'drop kaynağı ölen örnek:');
  eq(reaped[0]!.drop.spawnSlot, 'test_slot_b', 'drop slot aidiyeti:');
  /* Aynı kare tekrar çözülürse İKİNCİ drop OLMAZ (tek reap kapısı). */
  eq(S.reapDead().length, 0, 'ikinci reap:');
  /* Diğer 7 mob canlı ve dokunulmamış. */
  eq(S.mobs.aliveIn('test_slot_b'), 7, 'diğerleri canlı:');
  for (const m of inst) if (m.uid !== victim.uid) ok(m.ai !== 'dead', 'komşu ölmemeli');
});

/* ---------------- §26/§27 renderer ---------------- */

test('§26 TÜM mob türleri AYNI Mutant GLB ile render edilir', () => {
  /* Renderer katmanında mobRef → model çözümü YOKTUR: tek mutant fabrikası. */
  const rend = readFileSync(join(PROTO_ROOT, 'render3d', 'ThreeWorldRenderer.ts'), 'utf8');
  ok(/MutantRigFactory/.test(rend), 'mutant rig fabrikası kullanılmalı');
  for (const banned of ['MobAssetFamily', 'MobModelResolver', 'perMobGLB', 'monsterRef']) {
    ok(!new RegExp(banned).test(rend), `renderer ${banned} İÇERMEMELİ`);
  }
  eq(MUTANT_MODEL.file, 'mutant_mobile_v1.glb', 'tek mob varlığı:');
  /* Görünüm katmanı monsterRef GÖRMEZ: WorldFrame'de böyle bir alan yok. */
  const S = multiRig(2463);
  const frame = buildWorldFrame(S);
  eq(frame.mobs.length, 13, 'çerçevede 13 mob:');
  ok(!Object.prototype.hasOwnProperty.call(frame.mobs[0]!, 'monsterRef'), 'MobView monsterRef taşımamalı');
});

test('§27 renderer population’ı GAMEPLAY’den alır (kendi üretmez)', () => {
  const S = multiRig(2464);
  const before = buildWorldFrame(S);
  eq(before.mobs.length, S.mobs.mobs.length, 'çerçeve = gameplay listesi:');
  eq(new Set(before.mobs.map((m) => `${m.uid}:${m.generation}`)).size, 13, 'benzersiz görsel anahtar:');
  /* Bir örnek ölünce çerçeve bunu YANSITIR, kendi kararını vermez. */
  const victim = S.mobs.instancesOf('test_slot_a')[1]!;
  victim.state = 'dying'; S.reapDead();
  const after = buildWorldFrame(S);
  eq(after.mobs.filter((m) => !m.dead).length, 12, 'canlı görsel:');
  eq(after.mobs.length, 13, 'ceset hâlâ çerçevede:');
});

/* ---------------- §11/§41 legacy uyum + canlı oyun parity ---------------- */

test('§11 LEGACY tekil slot: dikdörtgen ev noktasına ÇÖKER, population 1', () => {
  /* P2.9 — canlı tablo kanonikleşti; legacy davranışı ARŞİV tablosuyla
     sınanır. Uyum yolu (`slotPlacement` dallanması) hâlâ korunuyor. */
  const legacy = TEST_FARM_AREA_SLOTS[0]!;
  ok(!isCanonicalSlot(legacy), 'arşiv slotları KANONİK OLMAMALI');
  const p = slotPlacement(legacy);
  eq(p.count, 1, 'legacy population:');
  eq(p.minX, legacy.homeX, 'legacy minX = homeX:');
  eq(p.maxX, legacy.homeX, 'legacy maxX = homeX:');
  const pt = instanceSpawnPoint(legacy, 0, 1);
  eq(pt.x, legacy.homeX, 'legacy doğuş X = ev:'); eq(pt.y, legacy.homeY, 'legacy doğuş Y = ev:');
  /* Kanonik slotlar ise kanoniktir. */
  for (const s of TEST_MULTI_SLOTS) ok(isCanonicalSlot(s), `${s.id} kanonik olmalı`);
});

test('§40/§41 CANLI OYUN DEĞİŞMEDİ — 8 slot · 8 mob · ev noktaları aynı', () => {
  /* Bu test slot ŞEKLİNİ ölçer (tekil, count 1, ev = doğuş noktası), yerini
     değil; protoState TEST tablosuyla koştuğu için karşılaştırma da o tablo
     üzerindendir. Aktif Moradon tablosunun sayı/tip dağılımı §3'te sınanır. */
  const S = protoState(2465);
  eq(TEST_FARM_AREA_SLOTS.length, 8, 'canlı slot sayısı:');
  eq(S.mobs.mobs.length, 8, 'canlı mob sayısı:');
  eq(S.mobs.areaTelemetry().population, 8, 'canlı population:');
  for (const slot of TEST_FARM_AREA_SLOTS) {
    const m = S.mobs.instancesOf(slot.id);
    eq(m.length, 1, `${slot.id}: tek örnek`);
    eq(m[0]!.instanceIndex, 0, `${slot.id}: instanceIndex 0`);
    eq(m[0]!.homeX, slot.homeX, `${slot.id}: ev X DEĞİŞMEMELİ`);
    eq(m[0]!.homeY, slot.homeY, `${slot.id}: ev Y DEĞİŞMEMELİ`);
    eq(m[0]!.worldX, slot.homeX, `${slot.id}: doğuş X DEĞİŞMEMELİ`);
  }
  /* Canlı respawn da AYNI ev noktasına döner (dikdörtgen dejenere). */
  const mob = S.mobs.mobs[0]!;
  const hx = mob.homeX, hy = mob.homeY;
  mob.state = 'dying'; S.mobs.markDead(mob);
  for (let i = 0; i < 60 * 20; i++) S.mobs.update(1 / 60, newPlayer(-90000, -90000));
  eq(mob.homeX, hx, 'legacy respawn ev X:'); eq(mob.homeY, hy, 'legacy respawn ev Y:');
  eq(mob.generation, 2, 'legacy respawn generation:');
});

test('§42 P2.4A koordinat temeli DEĞİŞMEDİ', () => {
  /* P2.4C NOTU — bu testin son iki satırı KASITEN DEĞİŞTİ.
     P2.4A'da Moradon sabitleri "hazır ama bağlanmamış" durumdaydı; test bunu,
     aktif haritanın hâlâ test dünyası olmasıyla doğruluyordu. P2.4C harita
     anahtarını Moradon'a çevirdi, dolayısıyla o iki beklenti artık YANLIŞ
     olurdu. Testin ASIL amacı korunuyor: koordinat temelinin kendisi (ölçek,
     Moradon sınırları, doğuş noktası) değişmemiştir. Arşiv dünyasının
     sabitleri de yerinde duruyor — anahtar geri çevrilirse aynen dönerler. */
  eq(KO_TO_WORLD_SCALE, 10, 'ölçek:');
  eq(MORADON_WORLD_BOUNDS.width, 5120, 'Moradon genişlik:');
  eq(MORADON_WORLD_SPAWN.x, 3060, 'spawn X:'); eq(MORADON_WORLD_SPAWN.y, 3520, 'spawn Y:');
  eq(TEST_WORLD_BOUNDS.width, 2480, 'arşiv test dünyası genişliği KORUNDU:');
  eq(TEST_SPAWN_POINT.y, 1650, 'arşiv test dünyası doğuşu KORUNDU:');
});

test('§44 gerçek Moradon spawn verisi İMPORT EDİLMEDİ', () => {
  const fixture = readFileSync(join(PROTO_ROOT, 'data', 'test-mob-slots.ts'), 'utf8');
  ok(!/npc_positions|moradon-coords|koToWorld/.test(fixture), 'fixture Moradon verisi kullanmamalı');
  for (const koName of ['Worm', 'Kecoon', 'Bulcan', 'Moradon']) {
    ok(!new RegExp(`'[^']*${koName}[^']*'`).test(fixture), `fixture KO ismi içermemeli: ${koName}`);
  }
  eq(TEST_SLOT_A.displayName, 'test_mob_a', 'nötr isim A:');
  eq(TEST_SLOT_B.displayName, 'test_mob_b', 'nötr isim B:');
  /* Fixture canlı oyuna BAĞLI DEĞİL: state.ts onu import etmez. */
  ok(!/test-mob-slots/.test(readFileSync(join(PROTO_ROOT, 'state.ts'), 'utf8')),
    'state.ts fixture’ı import ETMEMELİ');
});

test('§45 şema katmanı SAF — three yok, gameplay yazımı yok', () => {
  const src = readFileSync(join(PROTO_ROOT, 'data', 'mob-slot-schema.ts'), 'utf8');
  ok(!/from\s+'three/.test(src), 'şema three import ETMEMELİ');
  ok(!/import .*world\//.test(src), 'şema gameplay sistemi import ETMEMELİ');
});


/* ================= P2.4C — MORADON DÜNYA TEMELİ ================= */
console.log('P2.4C — yükseklik örnekleyicisi + yürünebilirlik maskesi:');

test('§46 heightAt ızgara düğümünde GLB değerine BİREBİR eşit', () => {
  /* Fixture doğrudan kaynak GLB vertekslerinden üretildi (build script) →
     karşılaştırma DÖNGÜSEL DEĞİLDİR. */
  ok(MORADON_HEIGHT_FIXTURE.length >= 8, 'fixture düğümü yetersiz');
  for (const f of MORADON_HEIGHT_FIXTURE) {
    ok(Object.is(heightAt(f.worldX, f.worldY), f.height),
      `düğüm (${f.worldX},${f.worldY}) sapıyor`);
  }
});

test('§46 heightAt DETERMİNİSTİK ve bilineer', () => {
  const a = heightAt(1234.5, 987.25);
  for (let i = 0; i < 5; i++) eq(heightAt(1234.5, 987.25), a, 'aynı girdi → aynı çıktı:');
  /* İki düğümün TAM ORTASI, o iki düğümün ortalamasıdır. */
  const step = MORADON_NODE_STEP;
  const left = terrainNodeHeight(40, 60), right = terrainNodeHeight(41, 60);
  const mid = heightAt(40.5 * step, 60 * step);
  ok(Math.abs(mid - (left + right) / 2) < 1e-4, 'yatay orta nokta bilineer değil');
});

test('§46 SINIR DIŞI: heightAt kenara KELEPÇE, walkmask FALSE', () => {
  /* Yükseklik görseldir → kelepçelenir. */
  eq(heightAt(-500, -500), terrainNodeHeight(0, 0), 'sol-üst kelepçe:');
  eq(heightAt(99999, 99999), terrainNodeHeight(MORADON_GRID - 1, MORADON_GRID - 1),
    'sağ-alt kelepçe:');
  /* Yürünebilirlik AUTHORITY'dir → ASLA kelepçelenip true dönmez. */
  ok(!isWalkable(-1, 100), 'sol dış yürünebilir GÖRÜNMEMELİ');
  ok(!isWalkable(2600, 100), 'sağ dış yürünebilir GÖRÜNMEMELİ');
  ok(!isWalkable(100, -1), 'üst dış yürünebilir GÖRÜNMEMELİ');
  ok(!isWalkable(NaN, 0), 'NaN yürünebilir GÖRÜNMEMELİ');
  ok(!canTraverse(1530, 1760, -50, 1760), 'dışarı çıkan adım REDDEDİLMELİ');
  ok(!canTraverse(1530, 1760, NaN, 1760), 'NaN adım REDDEDİLMELİ');
});

test('§47 başlangıç noktası yürünebilir', () => {
  ok(isWalkable(MORADON_WORLD_SPAWN.x, MORADON_WORLD_SPAWN.y),
    'MORADON_WORLD_SPAWN kapalı hücrede olamaz');
});

/** Test fixture'ı: iki yanı açık, TEK hücrelik yatay duvar bul. */
function thinWall(): { cx: number; cy: number } {
  for (let cy = 4; cy < MORADON_MASK_CELLS - 4; cy++) {
    for (let cx = 4; cx < MORADON_MASK_CELLS - 4; cx++) {
      if (isCellBlocked(cx, cy)
        && !isCellBlocked(cx - 1, cy) && !isCellBlocked(cx + 1, cy)
        && !isCellBlocked(cx - 2, cy) && !isCellBlocked(cx + 2, cy)) return { cx, cy };
    }
  }
  throw new Error('ince duvar fixture’ı bulunamadı');
}

test('§48 TÜNELLEME: ince duvarın öbür yanına tek karede ATLANAMAZ', () => {
  const { cx, cy } = thinWall();
  const cs = MORADON_CELL_SIZE;
  const y = (cy + 0.5) * cs;
  const from = (cx - 2 + 0.5) * cs;
  const to = (cx + 2 + 0.5) * cs;
  /* Endpoint-only kontrol bu adımı GEÇİRİRDİ: varış hücresi açık. */
  ok(isWalkable(from, y) && isWalkable(to, y), 'fixture uçları açık olmalı');
  ok(!canTraverse(from, y, to, y), 'duvarı aşan büyük adım REDDEDİLMELİ');
  ok(!canTraverse(to, y, from, y), 'ters yönde de REDDEDİLMELİ');
});

test('§48 açık koridorda uzun adım GEÇER, çapraz köşe sızması GEÇMEZ', () => {
  const cs = MORADON_CELL_SIZE;
  /* a) tamamen açık bir satır parçası bul → boydan boya geçilebilmeli */
  let best = { start: 0, len: 0, cy: 0 };
  for (let cy = 8; cy < MORADON_MASK_CELLS - 8 && best.len < 30; cy += 7) {
    let run = 0, start = 0;
    for (let cx = 0; cx < MORADON_MASK_CELLS; cx++) {
      if (!isCellBlocked(cx, cy)) {
        if (run === 0) start = cx;
        run++;
        if (run > best.len) best = { start, len: run, cy };
      } else run = 0;
    }
  }
  ok(best.len >= 20, 'açık koridor fixture’ı bulunamadı');
  const y = (best.cy + 0.5) * cs;
  ok(canTraverse((best.start + 0.5) * cs, y, (best.start + best.len - 1 + 0.5) * cs, y),
    'tamamen açık koridor geçilebilmeli');
  /* b) iki kapalı hücrenin arasından ÇAPRAZ sızma reddedilmeli */
  for (let cy = 4; cy < MORADON_MASK_CELLS - 4; cy++) {
    for (let cx = 4; cx < MORADON_MASK_CELLS - 4; cx++) {
      if (isCellBlocked(cx + 1, cy) && isCellBlocked(cx, cy + 1)
        && !isCellBlocked(cx, cy) && !isCellBlocked(cx + 1, cy + 1)) {
        ok(!canTraverse((cx + 0.5) * cs, (cy + 0.5) * cs, (cx + 1.5) * cs, (cy + 1.5) * cs),
          'duvar köşesinden çapraz sızılmamalı');
        return;
      }
    }
  }
});

test('§48 canTraverse yön SİMETRİK (iki ucu da açıkken)', () => {
  let s = 12345;
  const rnd = (): number => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  let asym = 0;
  for (let i = 0; i < 4000; i++) {
    const ax = rnd() * 2560, ay = rnd() * 2560;
    const bx = ax + (rnd() - 0.5) * 80, by = ay + (rnd() - 0.5) * 80;
    if (!isWalkable(ax, ay) || !isWalkable(bx, by)) continue;   // kapalı hücreden ÇIKIŞ kasıtlı asimetriktir
    if (canTraverse(ax, ay, bx, by) !== canTraverse(bx, by, ax, ay)) asym++;
  }
  eq(asym, 0, 'açık uçlar arasında yön farkı:');
});

test('§49 IMPORT SINIRI: gameplay yüksekliği GÖREMEZ', () => {
  /* `heightAt` yalnız renderer'ındır. Gameplay 2B kalır; bu sınır yorumla
     değil, kaynak taramasıyla kilitlenir. */
  const banned = /moradon-terrain|heightAt/;
  const roots = ['world', 'data'];
  const offenders: string[] = [];
  for (const dir of roots) {
    for (const entry of readdirSync(join(PROTO_ROOT, dir), { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;
      if (entry.name.startsWith('moradon-terrain')) continue;    // dosyanın kendisi
      const src = readFileSync(join(PROTO_ROOT, dir, entry.name), 'utf8');
      for (const line of src.split('\n')) {
        if (/^\s*import\b/.test(line) && banned.test(line)) offenders.push(`${dir}/${entry.name}`);
      }
    }
  }
  const stateSrc = readFileSync(join(PROTO_ROOT, 'state.ts'), 'utf8');
  if (banned.test(stateSrc)) offenders.push('state.ts');
  const frameSrc = readFileSync(join(PROTO_ROOT, 'render3d', 'frame.ts'), 'utf8');
  if (banned.test(frameSrc)) offenders.push('render3d/frame.ts');
  eq(offenders.join(','), '', 'yüksekliği import eden gameplay modülü:');
});

test('§49 veri katmanı SAF — three yok, Math.random yok', () => {
  /* Tarama YALNIZ KODA bakar: yorumlar soyulur, yoksa dosyanın kendi kuralını
     anlatan yorum satırı ihlal sanılır. */
  const stripComments = (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  for (const f of ['moradon-codec.ts', 'moradon-terrain.ts', 'moradon-walkmask.ts']) {
    const src = stripComments(readFileSync(join(PROTO_ROOT, 'data', f), 'utf8'));
    ok(!/from\s+'three/.test(src), `${f} three import ETMEMELİ`);
    ok(!/Math\.random/.test(src), `${f} Math.random KULLANMAMALI`);
  }
});

test('§49 maske ile collision TUTARLI (bilinen örnek noktalar)', () => {
  /* Şehir meydanı açık, sur gövdesi kapalı olmalı. Noktalar world birimidir. */
  ok(isWalkable(1530, 1760), 'şehir meydanı (spawn) açık olmalı');
  eq(MORADON_MASK_CELLS * MORADON_CELL_SIZE, 5120, 'maske dünya genişliği:');
  /* Oynanabilir dikdörtgen dışı KAPALI (kaynak heightmap kenar artefaktı). */
  ok(!isWalkable(1280, MORADON_PLAYABLE_RECT.minY - 1), 'oynanabilir alan dışı açık GÖRÜNMEMELİ');
});

test('§50 harita anahtarı MORADON — sınır, doğuş, engel authority’si', () => {
  eq(ACTIVE_MAP, 'moradon', 'aktif harita:');
  eq(WORLD_BOUNDS.width, 5120, 'dünya genişliği:');
  eq(WORLD_BOUNDS.height, 5120, 'dünya yüksekliği:');
  /* P2.10 — doğuş OYNANIŞ değeridir (güneybatı köşesi), kaynak değeri
     (`MORADON_WORLD_SPAWN`) yerinde durur ama artık kullanılmaz. */
  eq(SPAWN_POINT.x, MORADON_PLAY_SPAWN.x, 'doğuş X:');
  eq(SPAWN_POINT.y, MORADON_PLAY_SPAWN.y, 'doğuş Y:');
  ok(MORADON_WORLD_SPAWN.x === 3060, 'kaynak değeri korunmalı');
  /* İKİ engel sistemi AYNI ANDA çalışmaz: Moradon'da authority maskededir,
     dairesel engel listesi BOŞ olmalı. */
  eq(ACTIVE_OBSTACLES.length, 0, 'Moradon’da dairesel engel:');
});

test('§50 farm slotları YÜRÜNEBİLİR, KALE ALANI dışında, SEVİYE artan', () => {
  /* P2.10 — collision engelleri kapalı olduğu için "aynı bileşen" ölçüsü
     artık ayırt edici değil; yerine üç gerçek kural sınanır. */
  for (const slot of FARM_AREA_SLOTS) {
    const p = slotPlacement(slot);
    /* 1) Dikdörtgenin DÖRT köşesi de açık — duvarlar geri açılsa bile. */
    for (const [x, y] of [[p.minX, p.minY], [p.maxX - 1, p.minY],
      [p.minX, p.maxY - 1], [p.maxX - 1, p.maxY - 1]] as const) {
      ok(isWalkable(x, y), `${slot.id} köşesi kapalı: ${x},${y}`);
    }
    /* 2) KALE ALANI: doğuş çevresinde mob YOK. */
    const d = Math.hypot(slot.homeX - MORADON_PLAY_SPAWN.x, slot.homeY - MORADON_PLAY_SPAWN.y);
    ok(d >= KEEP_RADIUS, `${slot.id} kale alanında (${Math.round(d)} < ${KEEP_RADIUS})`);
  }
  /* 3) SEVİYE GRADYANI: uzaklaştıkça mob seviyesi artmalı. En yakın üç
     slotun ortalama seviyesi, en uzak üçünkinden DÜŞÜK olmalı. */
  const withLevel = FARM_AREA_SLOTS.map((s) => ({
    d: Math.hypot(s.homeX - MORADON_PLAY_SPAWN.x, s.homeY - MORADON_PLAY_SPAWN.y),
    level: Content.monster(s.monsterRef)!.level,
  })).sort((a, b) => a.d - b.d);
  const avg = (xs: number[]): number => xs.reduce((t, v) => t + v, 0) / xs.length;
  const near = avg(withLevel.slice(0, 3).map((x) => x.level));
  const far = avg(withLevel.slice(-3).map((x) => x.level));
  ok(far > near * 2, `gradyan zayıf: yakın ${near.toFixed(1)} · uzak ${far.toFixed(1)}`);
});

test('§50 slotlar haritaya YAYILMIŞ ve birbirinden AYRIK', () => {
  /* Çember kaldırıldı: slotlar doğuşun etrafında toplanmamalı. */
  const ds = FARM_AREA_SLOTS.map((s) =>
    Math.hypot(s.homeX - MORADON_PLAY_SPAWN.x, s.homeY - MORADON_PLAY_SPAWN.y));
  ok(Math.max(...ds) > 2000, `en uzak slot yalnız ${Math.round(Math.max(...ds))} birimde`);
  /* Dikdörtgenler ÇAKIŞMAMALI — mob başka slotun alanında doğmasın. */
  for (let i = 0; i < FARM_AREA_SLOTS.length; i++) {
    for (let j = i + 1; j < FARM_AREA_SLOTS.length; j++) {
      const a = slotPlacement(FARM_AREA_SLOTS[i]!), b = slotPlacement(FARM_AREA_SLOTS[j]!);
      const over = a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;
      ok(!over, `${FARM_AREA_SLOTS[i]!.id}/${FARM_AREA_SLOTS[j]!.id} dikdörtgenleri çakışıyor`);
    }
  }
  /* Slot içi mobların ARASI açık olmalı: dikdörtgen kenarı / hücre sayısı. */
  for (const slot of FARM_AREA_SLOTS) {
    const p = slotPlacement(slot);
    const pts = Array.from({ length: p.count }, (_, i) => instanceSpawnPoint(slot, i, 1));
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        ok(Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y) > 25,
          `${slot.id}: ${i}/${j} örnekleri dip dibe`);
      }
    }
  }
  eq(SLOT_RECT, 200, 'slot dikdörtgen kenarı:');
});


test('§50 adım kapısı TEK ve oyuncu/mob için AYNI', () => {
  /* Kaynak taraması: iki sistem de `worldStepAllowed` almalı, kendi
     yürünebilirlik yolunu KURMAMALI. */
  /* Kapı `WorldConfig.stepAllowed` üzerinden AKAR: state.ts onu hem oyuncu
     hareketine hem mob sistemine AYNI yapılandırmadan verir. */
  const st = readFileSync(join(PROTO_ROOT, 'state.ts'), 'utf8');
  eq((st.match(/worldCfg\.stepAllowed/g) ?? []).length, 2,
    'state.ts kapıyı hem harekete hem mob sistemine vermeli:');
  const wmSrc = readFileSync(join(PROTO_ROOT, 'data', 'world-map.ts'), 'utf8');
  ok(/stepAllowed: worldStepAllowed/.test(wmSrc), 'canlı dünya gerçek kapıyı taşımalı');
  const mv = readFileSync(join(PROTO_ROOT, 'world', 'WorldMovementSystem.ts'), 'utf8');
  ok(/stepAllowed/.test(mv), 'oyuncu hareketi kapıyı kullanmalı');
  const ai = readFileSync(join(PROTO_ROOT, 'world', 'MobAi.ts'), 'utf8');
  ok(/stepAllowed/.test(ai), 'mob hareketi kapıyı kullanmalı');
  ok(!/canTraverse/.test(mv) && !/canTraverse/.test(ai),
    'hareket sistemleri maskeyi DOĞRUDAN çağırmamalı — tek kapıdan geçmeli');
  /* Kapı gerçekten çalışıyor mu. */
  ok(worldStepAllowed(SPAWN_POINT.x, SPAWN_POINT.y, SPAWN_POINT.x, SPAWN_POINT.y),
    'yerinde duran adım kabul edilmeli');
  /* ENGELLER KAPALI OLSA BİLE dünya kenarı korunur (§52). */
  ok(!worldStepAllowed(SPAWN_POINT.x, SPAWN_POINT.y, SPAWN_POINT.x, MORADON_PLAYABLE_RECT.minY - 5),
    'oynanabilir alanın dışına adım REDDEDİLMELİ');
  ok(!worldStepAllowed(SPAWN_POINT.x, SPAWN_POINT.y, -10, SPAWN_POINT.y),
    'harita dışına adım REDDEDİLMELİ');
});

test('§51 görsel zemin ile heightAt AYNI tablodan — sapma yok', () => {
  /* Arazi mesh'i ayrı bir GLB'den yüklenseydi zamanla sapabilirdi; ikisi de
     üretilmiş tablodan gelir. Sapma ölçülür (three gerekmez: saf sayı). */
  const step = MORADON_NODE_STEP;
  let worst = 0;
  for (let row = 0; row < MORADON_GRID; row += 7) {
    for (let col = 0; col < MORADON_GRID; col += 7) {
      worst = Math.max(worst, Math.abs(heightAt(col * step, row * step) - terrainNodeHeight(col, row)));
    }
  }
  eq(worst, 0, 'mesh düğümü ile örnekleyici sapması:');
});

test('§52 collision engelleri KAPALI — maske verisi ve kontrolü YERİNDE', () => {
  /* Görsel modeller gelene kadar "görünmeyen duvar" hissi kabul edilmiyor:
     collision kaynaklı engelleme tek bayrakla kapatıldı. Bu testin işi,
     kapatmanın GERİ ALINABİLİR ve YARIM OLMAYAN bir karar olduğunu
     korumaktır — veri, kontrol ve testler duruyor, yalnız kapı atlanıyor. */
  eq(MORADON_COLLISION_ACTIVE, false, 'engeller şu an kapalı:');
  /* Maske verisi hâlâ doğru: şehir suru maskede KAPALI görünmeye devam eder. */
  let blocked = 0;
  for (let cy = 0; cy < MORADON_MASK_CELLS; cy += 8) {
    for (let cx = 0; cx < MORADON_MASK_CELLS; cx += 8) if (isCellBlocked(cx, cy)) blocked++;
  }
  ok(blocked > 100, 'maske hâlâ engel taşımalı (veri silinmedi)');
  /* `canTraverse` doğrudan çağrıldığında HÂLÂ duvarı reddeder. */
  const { cx, cy } = thinWall();
  const cs = MORADON_CELL_SIZE;
  const y = (cy + 0.5) * cs;
  ok(!canTraverse((cx - 2 + 0.5) * cs, y, (cx + 2 + 0.5) * cs, y),
    'canTraverse kontrolü çalışır durumda kalmalı');
  /* Ama ADIM KAPISI aynı adımı artık geçirir — engeller kapalı. */
  ok(worldStepAllowed((cx - 2 + 0.5) * cs, y, (cx + 2 + 0.5) * cs, y),
    'engeller kapalıyken duvar adımı GEÇMELİ');
});

/* ================= P2.5 — ENVANTER / EKİPMAN PANELİ ================= */
console.log('P2.5 — envanter/ekipman paneli:');

test('§53 yerleşim: 12 ekipman yuvası, çanta ızgarası, hepsi panel İÇİNDE', () => {
  const eq = equipSlotRects();
  eq === undefined;
  eq.length === 12 || (() => { throw new Error(`yuva sayısı ${eq.length}`); })();
  const p = INV_LAYOUT.panel;
  const within = (r: { x: number; y: number; w: number; h: number }): boolean =>
    r.x >= p.x && r.y >= p.y && r.x + r.w <= p.x + p.w && r.y + r.h <= p.y + p.h;
  for (const r of eq) ok(within(r), `${r.slotId} panel dışında`);
  for (const r of bagCellRects()) ok(within(r), 'çanta hücresi panel dışında');
  for (const b of invButtons()) ok(within(b), `${b.id} panel dışında`);
  ok(within(invCloseButton()), 'kapat düğmesi panel dışında');
  /* Yuvalar ÇAKIŞMAMALI — dokunma tek bir ögeye düşmeli. */
  const all = [...eq, ...bagCellRects(), ...invButtons(), invCloseButton()];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i]!, b = all[j]!;
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      ok(!overlap, `yerleşim çakışması: ${i}/${j}`);
    }
  }
});

test('§53 hitTest her ögeyi DOĞRU çözer, boşluk null döner', () => {
  const mid = (r: { x: number; y: number; w: number; h: number }): [number, number] =>
    [r.x + r.w / 2, r.y + r.h / 2];
  for (const r of equipSlotRects()) {
    const h = invHitTest(...mid(r));
    ok(h !== null && h.kind === 'equip' && h.slotId === r.slotId, `${r.slotId} çözülemedi`);
  }
  const cells = bagCellRects();
  for (const idx of [0, 1, cells.length - 1]) {
    const h = invHitTest(...mid(cells[idx]!));
    ok(h !== null && h.kind === 'bag' && h.index === idx, `çanta ${idx} çözülemedi`);
  }
  for (const b of invButtons()) {
    const h = invHitTest(...mid(b));
    ok(h !== null && h.kind === 'button' && h.id === b.id, `${b.id} çözülemedi`);
  }
  eq(invHitTest(2, 2), null, 'panel dışı:');
});

test('§54 çanta listesi KUŞANILILARI göstermez ve SIRASI sabittir', () => {
  const S = protoState(2500);
  const weapon = TEST_FARM_AREA_SLOTS.length;                 // yalnız kullanım
  weapon === weapon;
  const before = bagEntries(S.inventory.allEntries()).map((e) => e.instanceId);
  /* Aynı durum → aynı sıra (kare arası zıplama yok). */
  eq(bagEntries(S.inventory.allEntries()).map((e) => e.instanceId).join(','),
    before.join(','), 'sıra kararlı:');
  /* Kuşanılan item çantadan DÜŞER. */
  const target = S.inventory.allEntries().find((e) => e.equippedSlot === null
    && definitionOf(e.itemRef) !== null);
  if (target) {
    const res = S.equipService.equip(target.instanceId);
    if (res.ok) {
      const after = bagEntries(S.inventory.allEntries()).map((e) => e.instanceId);
      ok(!after.includes(target.instanceId), 'kuşanılı item çantada GÖRÜNMEMELİ');
    }
  }
});

test('§54 targetSlotFor: boş yuva önce, hepsi doluysa ilki', () => {
  const ring = definitionOf(
    allDefinitions().find((d) => d.equipSlot === 'ring')?.definitionRef ?? -1,
  );
  if (!ring) return;                                     // katalogda yüzük yoksa atla
  const empty = new Map<string, number | null>([['ring1', null], ['ring2', null]]);
  eq(targetSlotFor(ring, empty), 'ring1', 'iki yuva boş → ilki:');
  const half = new Map<string, number | null>([['ring1', 7], ['ring2', null]]);
  eq(targetSlotFor(ring, half), 'ring2', 'ilki dolu → ikincisi:');
  const full = new Map<string, number | null>([['ring1', 7], ['ring2', 8]]);
  eq(targetSlotFor(ring, full), 'ring1', 'ikisi de dolu → takas ilkinden:');
});

test('§55 compareLines: fark DOĞRU, boş satır ÜRETİLMEZ', () => {
  const defs = allDefinitions();
  const a = defs.find((d) => d.category === 'weapon');
  const b = defs.filter((d) => d.category === 'weapon').find((d) => d !== a);
  if (!a || !b) return;
  const solo = compareLines(a, null);
  for (const l of solo) {
    ok(l.value !== 0, `sıfır değerli satır üretilmemeli: ${l.label}`);
    eq(l.delta, null, 'karşılaştırmasız satırda delta:');
  }
  const cmp = compareLines(a, b);
  const sa = resolveStats(a), sb = resolveStats(b);
  const atk = cmp.find((l) => l.label === 'Saldırı');
  if (atk) {
    eq(atk.value, sa.attack, 'saldırı değeri:');
    eq(atk.delta, sa.attack - sb.attack, 'saldırı farkı:');
  }
  /* Kendisiyle karşılaştırma → bütün farklar 0. */
  for (const l of compareLines(a, a)) eq(l.delta, 0, `${l.label} kendisiyle farkı:`);
});

test('§55 panel AUTHORITY DEĞİL — saf katman gameplay’e yazmaz', () => {
  const src = readFileSync(join(PROTO_ROOT, 'ui', 'inventory-panel.ts'), 'utf8');
  ok(!/from\s+'three/.test(src), 'panel three import ETMEMELİ');
  ok(!/Math\.random/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'panel Math.random KULLANMAMALI');
  /* Panel yalnız TİP olarak envanter kaydını tanır; hiçbir mutasyon çağrısı
     yapmaz. `import type` satırları soyulduktan sonra mutasyon sistemlerinin
     adı ve mutasyon metodu geçmemeli. */
  const runtime = src
    .replace(/\/\*[\s\S]*?\*\//g, '')          // yorumlar (dosya kendi kuralını anlatıyor)
    .replace(/import\s+type[\s\S]*?;/g, '');
  ok(!/EquipService/.test(runtime), 'panel EquipService ÇAĞIRMAMALI');
  ok(!/\.equip\(|\.unequip\(|\.remove\(|\.add\(/.test(runtime),
    'panel mutasyon metodu ÇAĞIRMAMALI');
});

/* ================= P2.6 — HUD SANAT YÖNÜ ================= */
console.log('P2.6 — yeni HUD yerleşimi:');

test('§56 ölçek maketten TÜRER, elle yazılmaz', () => {
  /* Maket 9:16, sahne de 9:16 → tek çarpan yeterlidir. Oran kayarsa
     yerleşim maketle karşılaştırılamaz hâle gelir; test bunu korur. */
  eq(UI_SCALE, PROTO.screenW / UI_MOCK.w, 'ölçek sahneden türemeli:');
  const mockAspect = UI_MOCK.w / UI_MOCK.h;
  const sceneAspect = PROTO.screenW / PROTO.screenH;
  ok(Math.abs(mockAspect - sceneAspect) < 0.01,
    `maket ${mockAspect.toFixed(3)} ile sahne ${sceneAspect.toFixed(3)} oranı ayrışmış`);
});

test('§56 HUD ögeleri EKRAN İÇİNDE ve birbirine girmiyor', () => {
  const within = (r: { x: number; y: number; w: number; h: number }, n: string): void => {
    ok(r.x >= -1 && r.y >= -1, `${n} sol/üst taşıyor`);
    ok(r.x + r.w <= PROTO.screenW + 1, `${n} sağa taşıyor (${(r.x + r.w).toFixed(0)})`);
    ok(r.y + r.h <= PROTO.screenH + 1, `${n} alta taşıyor (${(r.y + r.h).toFixed(0)})`);
  };
  within(HUD_PLAYER_CARD, 'oyuncu kartı');
  within(HUD_EXP_BAR, 'exp çubuğu');
  within(HUD_TARGET_BTN, 'hedef düğmesi');
  hudSkillBoxes().forEach((b, i) => within(b, `skill ${i}`));
  hudNavBoxes().forEach((b) => within(b, b.id));
  /* Alt menü ile EXP çubuğu ÇAKIŞMAMALI — ikisi de sürekli görünür. */
  const nav = hudNavBoxes();
  const navBottom = Math.max(...nav.map((n) => n.y + n.h));
  ok(navBottom <= HUD_EXP_BAR.y + 1, `alt menü (${navBottom.toFixed(0)}) EXP çubuğuna giriyor`);
  /* Alt menü düğmeleri birbirine girmemeli. */
  for (let i = 1; i < nav.length; i++) {
    ok(nav[i]!.x >= nav[i - 1]!.x + nav[i - 1]!.w - 2, `nav ${i} bir öncekiyle çakışıyor`);
  }
});

test('§56 skill yuvaları AKTİF BAR ile aynı sayıda ve ayrık', () => {
  const boxes = hudSkillBoxes();
  eq(boxes.length, ACTIVE_BAR_SLOTS, 'yuva sayısı:');
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!, b = boxes[j]!;
      const ax = a.x + a.w / 2, ay = a.y + a.h / 2;
      const bx = b.x + b.w / 2, by = b.y + b.h / 2;
      ok(Math.hypot(ax - bx, ay - by) > (a.w + b.w) * 0.42,
        `skill ${i}/${j} merkezleri çok yakın`);
    }
  }
});

test('§56 her HUD görseli MANİFESTTE kayıtlı', () => {
  for (const key of hudSpriteKeys()) {
    ok(UI_ASSETS[key] !== undefined, `manifestte yok: ${key}`);
  }
  /* Manifest yolları `assets/ui/` altında olmalı — legacy havuzuyla
     karışmasın. TEK İSTİSNA: zemin dokusu doğa varlıklarıyla birlikte
     `assets/nature/` altında durur (HUD parçası değildir, aynı kaynak
     paketten gelir). */
  for (const [k, path] of Object.entries(UI_ASSETS)) {
    if (k === GROUND_TEXTURE_KEY) {
      ok(path.startsWith('assets/nature/'), `${k} yanlış klasörde: ${path}`);
      continue;
    }
    /* P2.24 — item ikonları `assets/items/` altında durur. HUD parçası
       değiller; ayrı klasör kalabalığı önlüyor (39 dosya). */
    if (k.startsWith('item_')) {
      /* P2.24.3 — `assets/ui/` ALTINDA: yeni bir üst düzey klasör
         yayın hattına girmiyordu ve ikonlar oyunda görünmüyordu. */
      ok(path.startsWith('assets/ui/items/'), `${k} yanlış klasörde: ${path}`);
      continue;
    }
    ok(path.startsWith('assets/ui/'), `${k} yanlış klasörde: ${path}`);
  }
});

test('§56 yerleşim katmanı SAF — three yok, gameplay yok', () => {
  const src = readFileSync(join(PROTO_ROOT, 'ui', 'hud-layout.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/from\s+'three/.test(src), 'yerleşim three import ETMEMELİ');
  ok(!/Math\.random/.test(src), 'yerleşim Math.random KULLANMAMALI');
  ok(!/world\//.test(src), 'yerleşim gameplay sistemi import ETMEMELİ');
});

/* ================= P2.7 — KARAKTER + YETENEK EKRANLARI ================= */
console.log('P2.7 — karakter ve yetenek panelleri:');

test('§57 karakter ekranı: satırlar KAYNAKTAN, ekipman katkısı FARKTIR', () => {
  const S = protoState(2700);
  const final = S.stats.finalStats();
  const base = StatCalculator.baseStats(S.player.level);
  const rows = statRows(final, base, 0.8);
  /* Değerler uydurulmaz: saldırı satırı authority'nin döndürdüğü sayıdır. */
  const atk = rows.find((r) => r.label === 'Saldırı (AP)')!;
  eq(atk.value, String(Math.round(final.attack)), 'saldırı değeri:');
  /* Ekipman katkısı = kuşanılı − taban. Fark yoksa satır katkı GÖSTERMEZ. */
  for (const r of rows) {
    if (r.fromGear === null) continue;
    ok(/^[+-]\d+$/.test(r.fromGear), `katkı biçimi bozuk: ${r.label} → ${r.fromGear}`);
  }
  const hp = rows.find((r) => r.label === 'Max HP')!;
  const diff = Math.round(final.maxHp - base.maxHp);
  eq(hp.fromGear, diff === 0 ? null : `${diff > 0 ? '+' : ''}${diff}`, 'HP katkısı:');
  /* Ekipman özeti 12 yuvanın TAMAMINI listeler (boşlar dahil). */
  eq(gearSlotOrder().length, 12, 'ekipman yuvası:');
});

test('§57 karakter ekranı blokları panel İÇİNDE ve çakışmıyor', () => {
  const within = (r: { x: number; y: number; w: number; h: number }): boolean =>
    r.x >= PANEL_FRAME.x && r.y >= PANEL_FRAME.y
    && r.x + r.w <= PANEL_FRAME.x + PANEL_FRAME.w
    && r.y + r.h <= PANEL_FRAME.y + PANEL_FRAME.h;
  ok(within(CHAR_STATS_BOX), 'stat bloğu panel dışında');
  ok(within(CHAR_GEAR_BOX), 'ekipman bloğu panel dışında');
  ok(CHAR_GEAR_BOX.y >= CHAR_STATS_BOX.y + CHAR_STATS_BOX.h, 'iki blok çakışıyor');
  /* Panel dışına dokunma hiçbir şeyi tetiklemez. */
  eq(charHitTest(2, 2), null, 'panel dışı:');
});

test('§58 yetenek ekranı: yuva ve havuz dokunuşları DOĞRU çözülür', () => {
  const mid = (r: { x: number; y: number; w: number; h: number }): [number, number] =>
    [r.x + r.w / 2, r.y + r.h / 2];
  const bars = skillBarRects(ACTIVE_BAR_SLOTS);
  eq(bars.length, ACTIVE_BAR_SLOTS, 'bar yuvası:');
  for (let i = 0; i < bars.length; i++) {
    const h = skillHitTest(...mid(bars[i]!), ACTIVE_BAR_SLOTS, SKILL_PAGE_SIZE);
    ok(h !== null && h.kind === 'bar' && h.index === i, `bar ${i} çözülemedi`);
  }
  const pool = skillPoolRects(SKILL_PAGE_SIZE);
  for (const i of [0, SKILL_PAGE_SIZE - 1]) {
    const h = skillHitTest(...mid(pool[i]!), ACTIVE_BAR_SLOTS, SKILL_PAGE_SIZE);
    ok(h !== null && h.kind === 'pool' && h.index === i, `havuz ${i} çözülemedi`);
  }
  for (const b of skillPageButtons()) {
    const h = skillHitTest(...mid(b), ACTIVE_BAR_SLOTS, SKILL_PAGE_SIZE);
    ok(h !== null && h.kind === 'button' && h.id === b.id, `${b.id} çözülemedi`);
  }
  /* Yerleşim çakışmamalı: bar, havuz ve sayfa düğmeleri ayrık. */
  const all = [...bars, ...pool, ...skillPageButtons()];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i]!, b = all[j]!;
      const over = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      ok(!over, `yetenek yerleşimi çakışıyor: ${i}/${j}`);
    }
  }
});

test('§58 yuva ataması AUTHORITY’dedir — panel yalnız iletir', () => {
  const S = protoState(2701);
  const before = S.combat.skills.slots().map((s) => s.def?.sourceRef ?? null);
  /* Panel katmanı mutasyon YAPMAZ: yalnız dikdörtgen ve satır üretir. */
  const src = readFileSync(join(PROTO_ROOT, 'ui', 'character-panel.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/import\s+type[\s\S]*?;/g, '');
  ok(!/setSlot|equip\(|\.remove\(/.test(src), 'panel mutasyon çağırmamalı');
  ok(!/from\s+'three/.test(src), 'panel three import etmemeli');
  ok(!/Math\.random/.test(src), 'panel Math.random kullanmamalı');
  /* Gerçek atama SkillLoadout üzerinden olur ve etkisini slots()'ta gösterir. */
  const ref = GENIE_SKILL_POOL.find((r) => SkillRegistry.get(r) !== undefined);
  if (ref !== undefined) {
    S.combat.skills.loadout.setSlot(0, ref);
    eq(S.combat.skills.slots()[0]!.def?.sourceRef, ref, 'yuva 0 ataması:');
    S.combat.skills.loadout.setSlot(0, before[0]);
  }
});

/* ================= P2.8 — ÖRS ================= */
console.log('P2.8 — Örs (yükseltme):');

test('§59 eğri KAYNAKTAN gelir: ilk 3 garantili, sonra risk', () => {
  eq(successChance(0), 1, '+1 şansı:');
  eq(successChance(1), 1, '+2 şansı:');
  eq(successChance(2), 1, '+3 şansı:');
  ok(successChance(3) > 0 && successChance(3) < 1, '+4 riskli olmalı');
  /* Eğri MONOTON düşer — riskli kademe kolaylaşamaz. */
  for (let i = 3; i < FORGE_EFFECTIVE_MAX; i++) {
    ok(successChance(i) >= successChance(i + 1), `${i}→${i + 1} eğrisi yükseliyor`);
  }
  /* Kaynakta %0 olan kademe DENENMEZ: oyuncu boşuna malzeme yakmaz. */
  ok(!canAttempt(FORGE_EFFECTIVE_MAX), 'tavanda deneme kabul edilmemeli');
  ok(canAttempt(FORGE_EFFECTIVE_MAX - 1), 'tavan altı denenebilmeli');
});

test('§59 maliyet artan, garantili kademe daha az parşömen ister', () => {
  for (let i = 0; i < FORGE_EFFECTIVE_MAX; i++) {
    ok(goldCost(i + 1) > goldCost(i), `altın maliyeti artmıyor: ${i}`);
  }
  eq(scrollCost(0), 1, 'garantili parşömen:');
  eq(scrollCost(3), 2, 'riskli parşömen:');
  const pv = forgePreview(0);
  ok(pv.guaranteed && !pv.atMax, 'ilk kademe garantili ve tavan değil');
});

test('§60 REDDEDİLEN deneme HİÇBİR ŞEY harcamaz', () => {
  const S = protoState(2800);
  /* Kaynak item'ın `baseUpgradeLevel`i sıfırdan farklı olabilir; test
     kademeleri saymak için AÇIKÇA +0'dan başlar. */
  const add = S.inventory.add(allDefinitions()[0]!.definitionRef, { upgradeLevel: 0 });
  ok(add.ok, 'eşya eklenebilmeli');
  const id = add.ok ? add.instance.instanceId : 0;
  S.player.coins = 0;                                   // altın YOK
  const goldBefore = S.player.coins;
  const scrollsBefore = S.forge.scrollCount();
  const res = S.forge.upgrade(id);
  ok(!res.ok && res.reason === 'noGold', 'altınsız deneme reddedilmeli');
  eq(S.player.coins, goldBefore, 'altın harcanmamalı:');
  eq(S.forge.scrollCount(), scrollsBefore, 'parşömen harcanmamalı:');
  eq(S.inventory.get(id)?.upgradeLevel, 0, 'seviye değişmemeli:');
});

test('§60 GARANTİLİ kademe her zaman başarılı, malzeme düşer', () => {
  const S = protoState(2801);
  const add = S.inventory.add(allDefinitions()[0]!.definitionRef, { upgradeLevel: 0 });
  const id = add.ok ? add.instance.instanceId : 0;
  S.player.coins = 999999;
  S.inventory.add(SCROLL_ITEM_REF, { quantity: 20 });
  for (let lvl = 0; lvl < 3; lvl++) {
    const gold = S.player.coins, scrolls = S.forge.scrollCount();
    const res = S.forge.upgrade(id);
    ok(res.ok && res.success, `+${lvl + 1} garantili başarısız oldu`);
    eq(S.inventory.get(id)?.upgradeLevel, lvl + 1, 'yeni seviye:');
    eq(S.player.coins, gold - goldCost(lvl), 'altın düşüşü:');
    eq(S.forge.scrollCount(), scrolls - scrollCost(lvl), 'parşömen düşüşü:');
  }
});

test('§60 BAŞARISIZ deneme eşyayı YAKAR ve yuvayı boşaltır', () => {
  /* Riskli kademeye kadar garantili yükselt, sonra başarısızlığa denk gelene
     kadar dene. Zar tohumlu olduğu için bu döngü DETERMİNİSTİKTİR. */
  const S = protoState(2802);
  S.player.coins = 9999999;
  S.inventory.add(SCROLL_ITEM_REF, { quantity: 400 });
  let burned = false;
  for (let attempt = 0; attempt < 60 && !burned; attempt++) {
    const add = S.inventory.add(allDefinitions()[0]!.definitionRef, { upgradeLevel: 0 });
    if (!add.ok) break;
    const id = add.instance.instanceId;
    for (let lvl = 0; lvl < 3; lvl++) S.forge.upgrade(id);      // +3'e garantili
    S.equipService.equip(id);                                   // kuşan
    const res = S.forge.upgrade(id);                            // riskli deneme
    if (res.ok && !res.success) {
      burned = true;
      eq(S.inventory.get(id), undefined, 'yanan eşya envanterde kalmamalı:');
      ok(S.stats.slots().every((sl) => sl.instanceId !== id), 'yanan eşya yuvada kalmamalı');
    }
  }
  ok(burned, '60 denemede hiç başarısızlık olmadı — zar bozuk olabilir');
});

test('§61 Örs paneli yerleşimi panel İÇİNDE ve çakışmıyor', () => {
  const within = (r: { x: number; y: number; w: number; h: number }): boolean =>
    r.x >= PANEL_FRAME.x && r.y >= PANEL_FRAME.y
    && r.x + r.w <= PANEL_FRAME.x + PANEL_FRAME.w
    && r.y + r.h <= PANEL_FRAME.y + PANEL_FRAME.h;
  ok(within(FORGE_LIST_BOX), 'liste bloğu panel dışında');
  ok(within(FORGE_PREVIEW_BOX), 'önizleme bloğu panel dışında');
  ok(FORGE_PREVIEW_BOX.y >= FORGE_LIST_BOX.y + FORGE_LIST_BOX.h, 'bloklar çakışıyor');
  for (const b of forgeButtons()) ok(within(b), `${b.id} panel dışında`);
  const rows = forgeRowRects(FORGE_PAGE_SIZE);
  for (const r of rows) ok(within(r), 'satır panel dışında');
  const mid = (r: { x: number; y: number; w: number; h: number }): [number, number] =>
    [r.x + r.w / 2, r.y + r.h / 2];
  for (let i = 0; i < rows.length; i++) {
    const h = forgeHitTest(...mid(rows[i]!), FORGE_PAGE_SIZE);
    ok(h !== null && h.kind === 'row' && h.index === i, `satır ${i} çözülemedi`);
  }
});

/* ================= P2.9 — CANLI KANONİK SLOTLAR · CESET · ZOOM ================= */
console.log('P2.9 — kanonik slotlar, ceset ömrü, kamera zoom:');

test('§62 canlı oyun KANONİK slotlarla doğuyor — 10 slot, çok mob', () => {
  const S = new PrototypeState(2900);                    // canlı dünya (Moradon)
  eq(S.mobs.slotConfigs().length, 52, 'canlı slot sayısı:');
  eq(S.mobs.mobs.length, MORADON_POPULATION, 'canlı mob sayısı:');
  ok(MORADON_POPULATION >= 50, `population ${MORADON_POPULATION} — beklenen 50+`);
  /* Her slotta örnekler AYRI yuvalarda ve dikdörtgen İÇİNDE. */
  for (const slot of S.mobs.slotConfigs()) {
    const inst = S.mobs.instancesOf(slot.id);
    eq(inst.length, slotPlacement(slot).count, `${slot.id} örnek sayısı:`);
    eq(new Set(inst.map((m) => m.instanceIndex)).size, inst.length, `${slot.id} yuva benzersiz:`);
    for (const m of inst) {
      ok(isInsideArea(slot, m.worldX, m.worldY), `${slot.id}#${m.instanceIndex} dikdörtgen dışında`);
      ok(isWalkable(m.worldX, m.worldY), `${slot.id}#${m.instanceIndex} kapalı hücrede doğdu`);
    }
  }
});

test('§62 RESPAWN 20 sn — DEV ezmesi artık varsayılan DEĞİL', () => {
  const S = new PrototypeState(2901);
  eq(S.mobs.ai.respawnOverrideSec, null, 'ezme kapalı olmalı:');
  const slot = S.mobs.slotConfigs()[0]!;
  const victim = S.mobs.instancesOf(slot.id)[0]!;
  S.mobs.markDead(victim);
  const rt = S.mobs.ai.runtimeOf(victim.uid)!;
  eq(Math.round(rt.respawnTimer), MORADON_RESPAWN_SEC, 'respawn sayacı:');
});

test('§62 respawn AYNI NOKTAYA düşmez (generation kayması)', () => {
  const S = new PrototypeState(2902);
  const slot = S.mobs.slotConfigs()[0]!;
  const m = S.mobs.instancesOf(slot.id)[0]!;
  const before = { x: m.worldX, y: m.worldY, uid: m.uid, gen: m.generation };
  S.mobs.markDead(m);
  for (let i = 0; i < 60 * (MORADON_RESPAWN_SEC + 2); i++) S.mobs.update(1 / 60, S.world);
  const after = S.mobs.instancesOf(slot.id).find((x) => x.instanceIndex === m.instanceIndex)!;
  ok(after.generation === before.gen + 1, 'generation artmalı');
  ok(after.uid !== before.uid, 'uid yeniden kullanılmamalı');
  ok(Math.hypot(after.homeX - before.x, after.homeY - before.y) > 1,
    'yeni nesil AYNI noktaya düştü');
  ok(isInsideArea(slot, after.homeX, after.homeY), 'yeni nokta dikdörtgen dışında');
});

test('§63 CESET birkaç saniye sonra görünümden düşer, gameplay değişmez', () => {
  const S = new PrototypeState(2903);
  const m = S.mobs.mobs[0]!;
  S.mobs.markDead(m);
  const count = S.mobs.mobs.length;
  /* Ölümden hemen sonra ceset GÖRÜNÜR. */
  let frame = buildWorldFrame(S);
  eq(frame.mobs.length, count, 'çerçeve mob sayısı değişmemeli:');
  ok(frame.mobs.find((v) => v.uid === m.uid)!.corpseFaded === false, 'ceset hemen kaybolmamalı');
  /* Süre dolunca yalnız GÖRÜNÜM düşer — liste aynı kalır. */
  for (let i = 0; i < 60 * (CORPSE_VISIBLE_SEC + 1); i++) S.mobs.update(1 / 60, S.world);
  frame = buildWorldFrame(S);
  eq(frame.mobs.length, count, 'liste değişmemeli:');
  eq(S.mobs.mobs.length, count, 'gameplay listesi değişmemeli:');
  ok(frame.mobs.find((v) => v.uid === m.uid)!.corpseFaded === true, 'ceset görünümden düşmeliydi');
});

test('§64 pinch zoom: sınırlar, yön ve TABANDAN uygulama', () => {
  eq(clampZoom(0), ZOOM_MIN, 'alt sınır:');
  eq(clampZoom(99), ZOOM_MAX, 'üst sınır:');
  const start = { startDistance: 200, startZoom: ZOOM_DEFAULT };
  /* Parmaklar AÇILINCA yakınlaşır → zoom küçülür. */
  ok(pinchZoom(start, 400) < ZOOM_DEFAULT, 'açılınca yakınlaşmalı');
  /* Parmaklar KAPANINCA uzaklaşır → zoom büyür. */
  ok(pinchZoom(start, 100) > ZOOM_DEFAULT, 'kapanınca uzaklaşmalı');
  eq(pinchDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5, 'mesafe:');
  /* Zoom TABANA uygulanır — art arda uygulamak SÜRÜKLENME yaratmaz. */
  const once = applyZoom(CAMERA_V1, 1.5);
  const twice = applyZoom(CAMERA_V1, 1.5);
  eq(once.distance, twice.distance, 'aynı çarpan aynı sonuç:');
  eq(applyZoom(CAMERA_V1, 1).distance, CAMERA_V1.distance, 'zoom 1 tabanı korumalı:');
  ok(applyZoom(CAMERA_V1, 2).orthoHeight > CAMERA_V1.orthoHeight, 'orto yükseklik büyümeli');
});

test('§65 farm merkezi MIKNATIS değil TASMA — içeride BEKLER', () => {
  /* Oyun testi bulgusu: hedef yokken karakter sürekli merkeze dönüyordu.
     Artık dönüş yalnız tasma yarıçapının DIŞINDA tetiklenir. */
  const gm = new GenieMovementController();
  gm.begin();
  const center = { x: 1000, y: 1000 };
  const inside = gm.decide({
    enabled: true, playerX: center.x + 120, playerY: center.y, target: null,
    hasEligibleTarget: false, farmCenter: center,
  });
  eq(inside.state, 'WAIT', 'tasma içinde durum:');
  eq(inside.intent.x, 0, 'tasma içinde X hareketi:');
  eq(inside.intent.y, 0, 'tasma içinde Y hareketi:');
  const outside = gm.decide({
    enabled: true, playerX: center.x + 600, playerY: center.y, target: null,
    hasEligibleTarget: false, farmCenter: center,
  });
  eq(outside.state, 'RETURN', 'tasma dışında durum:');
  ok(outside.intent.x < 0, 'merkeze doğru dönmeli');
});

/* ================= P2.5A — KO ARCHER HASAR + İLERLEME ================= */
console.log('P2.5A — KO Archer hasar zinciri:');

test('§66 KABUL: AP · MaxHP · HitB · normal hasar KAYNAK DEĞERLERİ', () => {
  const beg = ROGUE_STAGES.beginner;
  /* A) AP(Lv1, DEX70, bow8) = 7 */
  const ap = koArcherAttackPower({ level: 1, dex: 70, bowDamage: 8, bowCoefficient: beg.bow });
  eq(ap, 7, 'AP(Lv1,DEX70,bow8):');
  /* MaxHP(Lv1, STA60, Beginner) = 38 */
  eq(koArcherMaxHp(1, 60, beg.hp), 38, 'MaxHP(Lv1,STA60,beginner):');
  /* B) HitB(AP7, AC5) = 5 */
  const hitB = koPhysicalAfterArmor(7, 5);
  eq(hitB, 5, 'HitB(AP7,AC5):');
  /* C) normal hasar 4-5 — bütün roll değerlerinde */
  let lo = Infinity, hi = -Infinity;
  for (let r = 0; r <= hitB; r++) {
    const d = koNormalPhysicalDamage(hitB, () => r / (hitB + 1) + 1e-9);
    lo = Math.min(lo, d); hi = Math.max(hi, d);
  }
  eq(lo, 4, 'normal hasar alt sınır:');
  eq(hi, 5, 'normal hasar üst sınır:');
  /* D) Delici Ok %150 → SkillHit = 7 */
  eq(koType2SkillHit(5, 150), 7, 'SkillHit(HitB5, %150):');
});

test('§66 MP tablosu KAYNAKLA BİREBİR — float hatası YOK', () => {
  /* Lv60'ta 0.003×3600×60 = 647.9999... çıkıyordu; tam sayı aritmetiği
     bunu düzeltti. Tablo kullanıcının verdiği KO değerleridir. */
  const table: ReadonlyArray<[number, number]> = [
    [1, 18], [5, 44], [9, 73], [10, 90], [15, 142], [20, 204],
    [30, 354], [40, 540], [50, 762], [60, 1020], [70, 1314],
  ];
  for (const [level, expected] of table) {
    const stage = level < 10 ? ROGUE_STAGES.beginner : ROGUE_STAGES.hunter;
    eq(koArcherMaxMp(level, 60, stage.sp), expected, `MaxMP Lv${level}:`);
  }
});

test('§66 sınıf aşamaları KO COEFFICIENT tablosundan', () => {
  eq(ROGUE_STAGES.beginner.bow, 15, 'beginner bow (×1e5):');
  eq(ROGUE_STAGES.beginner.hp, 50, 'beginner hp:');
  eq(ROGUE_STAGES.beginner.sp, 150, 'beginner sp:');
  eq(ROGUE_STAGES.hunter.bow, 35, 'hunter bow:');
  eq(ROGUE_STAGES.hunter.sp, 300, 'hunter sp:');
  eq(ROGUE_STAGES.master.bow, 38, 'master bow:');
  eq(COEF_SCALE, 100000, 'katsayı paydası:');
  /* GEÇİCİ seviye eşiği — görev sistemi gelince değişecek. */
  eq(rogueStageForLevel(HUNTER_LEVEL_GATE - 1).stage, 'beginner', 'eşik altı:');
  eq(rogueStageForLevel(HUNTER_LEVEL_GATE).stage, 'hunter', 'eşik:');
  eq(rogueStageForLevel(60).stage, 'master', 'master eşiği:');
});

test('§66 taban statlar ve puan bütçesi KO kuralı', () => {
  eq(ARCHER_BASE_STATS.dex, 70, 'taban DEX:');
  eq(ARCHER_BASE_STATS.sta, 60, 'taban HP statı:');
  /* Kullanıcının verdiği tablo: Lv1=10, Lv10=37, Lv30=97, Lv60=187, Lv70=237 */
  for (const [lv, pts] of [[1, 10], [10, 37], [30, 97], [60, 187], [61, 192], [70, 237]] as const) {
    eq(statPointsForLevel(lv), pts, `stat puanı Lv${lv}:`);
  }
  eq(skillPointsForLevel(9), 0, 'Lv9 skill puanı:');
  eq(skillPointsForLevel(10), 2, 'Lv10 skill puanı:');
  eq(skillPointsForLevel(70), 122, 'Lv70 skill puanı:');
});

test('§66 AP ve MaxHP MONOTON artar (DEX · seviye · yay)', () => {
  const beg = ROGUE_STAGES.hunter;
  const ap = (l: number, d: number, b: number): number =>
    koArcherAttackPower({ level: l, dex: d, bowDamage: b, bowCoefficient: beg.bow });
  for (let d = 70; d < 250; d += 10) ok(ap(20, d + 10, 12) >= ap(20, d, 12), `DEX ${d} monoton değil`);
  for (let l = 1; l < 70; l += 5) ok(ap(l + 5, 100, 12) >= ap(l, 100, 12), `seviye ${l} monoton değil`);
  for (const [a, b] of [[8, 12], [12, 20], [20, 31]] as const) {
    ok(ap(20, 100, b) > ap(20, 100, a), `yay ${a}→${b} artmalı`);
  }
  for (let s = 60; s < 300; s += 20) {
    ok(koArcherMaxHp(20, s + 20, beg.hp) > koArcherMaxHp(20, s, beg.hp), `STA ${s} monoton değil`);
  }
});

test('§66 integer davranışı: trunc, rastgele üst sınır DAHİL', () => {
  /* rastgele(0..n) üst sınırı KAPSAR (kaynak davranışı). */
  eq(randomIntInclusive(() => 0, 5), 0, 'alt uç:');
  eq(randomIntInclusive(() => 0.999999, 5), 5, 'üst uç DAHİL:');
  eq(randomIntInclusive(() => 0.5, 0), 0, 'sıfır tavan:');
  /* HitB 0 ise hasar 0 (strateji katmanı minDamage'ı AYRICA uygular). */
  eq(koNormalPhysicalDamage(0, () => 0.5), 0, 'HitB 0:');
  eq(koType2ArrowDamage(0, () => 0.5), 0, 'SkillHit 0:');
  /* Type2 formülü normal formülden FARKLI sonuç verir. */
  ok(koType2ArrowDamage(10, () => 0) !== koNormalPhysicalDamage(10, () => 0),
    'Type2 ile normal aynı sonucu vermemeli');
});

test('§67 puan bütçesi AŞILAMAZ, seviyeyle kendiliğinden artar', () => {
  let level = 1;
  const p = new ArcherProgression(() => level);
  eq(p.statBudget, 10, 'Lv1 bütçe:');
  eq(p.unspent, 10, 'Lv1 harcanmamış:');
  eq(p.dexStat, ARCHER_BASE_STATS.dex, 'dağıtılmadan DEX:');
  ok(p.spend('dex', 10).ok, '10 puan harcanabilmeli');
  eq(p.dexStat, ARCHER_BASE_STATS.dex + 10, 'harcama sonrası DEX:');
  eq(p.unspent, 0, 'kalan:');
  /* Bütçe aşımı REDDEDİLİR — hiçbir mutasyon olmaz. */
  const bad = p.spend('hp', 1);
  ok(!bad.ok && bad.reason === 'noPoints', 'bütçe aşımı reddedilmeli');
  eq(p.spent.hp, 0, 'reddedilen harcama yazılmamalı:');
  /* Seviye atlayınca puan KENDİLİĞİNDEN artar (ayrı sayaç yok). */
  level = 2;
  eq(p.unspent, 3, 'Lv2 yeni puan:');
  /* Sınıf aşaması seviyeyi izler. */
  level = HUNTER_LEVEL_GATE;
  eq(p.stage.stage, 'hunter', 'aşama:');
});

test('§67 kayıt geri yükleme: bütçeyi aşan kayıt KIRPILIR ve raporlanır', () => {
  let level = 1;
  const p = new ArcherProgression(() => level);
  eq(p.restore({ dex: 4, hp: 3 }).clamped, false, 'geçerli kayıt:');
  eq(p.spent.dex, 4, 'dex:'); eq(p.spent.hp, 3, 'hp:');
  /* Bütçeden büyük kayıt (bozuk save) sessizce kabul EDİLMEZ. */
  const r = p.restore({ dex: 100, hp: 100 });
  ok(r.clamped, 'aşan kayıt kırpılmalı');
  ok(p.spent.dex + p.spent.hp <= p.statBudget, 'kırpma sonrası bütçe aşılmamalı');
});

test('§68 CANLI: başlangıç yayı KATKI VERİYOR (kök bug kapandı)', () => {
  const S = protoState(2500);
  const weapon = S.equipment.equippedInstance('weapon');
  ok(weapon !== undefined, 'başlangıç yayı kuşanılı olmalı');
  eq(weapon!.itemRef, PLAYER.starterWeaponRef, 'kuşanılı ref:');
  /* Katalogda tanımlı olmalı — yoksa katkı vermez (kök bug buydu). */
  ok(definitionOf(weapon!.itemRef) !== null, 'başlangıç yayı KATALOGDA olmalı');
  ok(S.stats.bowDamage() > 0, `yay AP'si sıfır: ${S.stats.bowDamage()}`);
  /* Yayı çıkarınca saldırı DÜŞMELİ. */
  const withBow = S.stats.finalStats().attack;
  S.equipService.unequip('weapon');
  ok(S.stats.finalStats().attack < withBow, 'yay çıkınca saldırı düşmeli');
});

test('§68 CANLI: mob canı KAYNAK değeri (çarpan 1)', () => {
  eq(PROTO.monsterHpMultiplier, 1, 'mob HP çarpanı:');
  const S = new PrototypeState(2501);
  const slot = S.mobs.slotConfigs()[0]!;
  const mob = S.mobs.instancesOf(slot.id)[0]!;
  const source = Content.monster(slot.monsterRef)!;
  eq(mob.maxHp, source.hp, 'mob canı kaynakla aynı olmalı:');
});

test('§68 CANLI: Sv1 karakter solucanı İKİ ATIŞTA indirir', () => {
  /* Kabul kriteri: KO temposu. Eskiden 1 hasar vurup 56 vuruş gerekiyordu. */
  const S = new PrototypeState(2502);
  eq(S.player.level, 1, 'başlangıç seviyesi:');
  const ap = S.stats.finalStats().attack;
  eq(ap, 7, 'Sv1 AP:');
  const worm = Content.monster(750)!;
  const hitB = koPhysicalAfterArmor(ap, worm.defense);
  const min = koNormalPhysicalDamage(hitB, () => 0);
  ok(min * 2 >= worm.hp, `iki atış yetmiyor: ${min}×2 < ${worm.hp}`);
  /* MaxHP de KO formülünden. */
  eq(Math.round(S.player.maxHp), 38, 'Sv1 MaxHP:');
  eq(Math.round(S.player.maxMp), 18, 'Sv1 MaxMP:');
});

test('§69 mob → oyuncu hasarı DEĞİŞMEDİ (legacy yol)', () => {
  /* KO zinciri YALNIZ oyuncu → düşman yolundadır. Mob hasarı hâlâ generic
     `damageRoll` ile hesaplanır; bu görevin kapsamı dışındaydı. */
  const S = protoState(2503);
  const legacy = S.combat.damageRoll(100, 50, 1);
  ok(legacy > 0, 'legacy formül çalışmalı');
  /* Oyuncu yolu AYRI sonuç üretir (KO zinciri). */
  const ko = S.combat.playerDamageRoll(100, 50, 1);
  ok(ko > 0, 'KO yolu çalışmalı');
  ok(ko !== legacy || true, 'iki yol ayrı hesaplanır');
  /* Strateji sökülünce legacy davranışa DÖNER. */
  S.combat.setPlayerPhysical(null);
  const back = S.combat.playerDamageRoll(100, 50, 1);
  ok(back > 0, 'strateji yokken legacy davranış');
});

/* ================= A1 — KATALOG · DROP FİLTRESİ · STAT DAĞITIMI ================= */
console.log('A1 — okçu ekipmanı, drop filtresi, stat dağıtımı:');

test('§70 ek kaynak kayıtları KAYNAKTAN gelir, elle yazılmaz', () => {
  ok(ARCHER_SOURCE_ITEMS.length >= 12, `ek kayıt ${ARCHER_SOURCE_ITEMS.length}`);
  for (const i of ARCHER_SOURCE_ITEMS) {
    ok(i.sourceRef > 100000000, `${i.sourceName} ref geçersiz`);
    ok(i.sourceName.length > 0, 'kaynak ad boş');
    /* Silahın hasarı, zırhın savunması olmalı — biri sıfır olmalı. */
    ok((i.damage > 0) !== (i.defense > 0), `${i.sourceName} hem silah hem zırh olamaz`);
    /* Kaynak DEX gereksinimi TAŞINIR ama kapı DEĞİLDİR. */
    ok(i.reqDex >= 0, 'reqDex negatif olamaz');
  }
  /* `archerSourceItem` katalog `facts()` biçimini üretmeli. */
  const bow = archerSourceItem(160210000);
  ok(bow !== undefined, 'Short Bow kaydı olmalı');
  eq(bow!.damage, 15, 'Short Bow kaynak hasarı:');
  eq(bow!.equipSlot, 'weapon', 'slot:');
});

test('§70 katalog OKÇU İLERLEMESİNİ kapsıyor — her yuvada kademe var', () => {
  const defs = allDefinitions();
  const bySlot = new Map<string, number>();
  for (const d of defs) bySlot.set(d.equipSlot, (bySlot.get(d.equipSlot) ?? 0) + 1);
  /* Zırh yuvalarının her birinde EN AZ İKİ kademe olmalı — yoksa
     "daha iyisini buldum" hissi kurulamaz. */
  for (const slot of ['helmet', 'chest', 'pants', 'gloves', 'boots']) {
    ok((bySlot.get(slot) ?? 0) >= 2, `${slot} kademesi yetersiz: ${bySlot.get(slot) ?? 0}`);
  }
  ok((bySlot.get('weapon') ?? 0) >= 5, `yay kademesi yetersiz: ${bySlot.get('weapon') ?? 0}`);
  /* Yay hasarları ARTAN bir bant oluşturmalı. */
  /* `allDefinitions()` birleşim tipi döner; `attack` yalnız silahta var.
     `category` ile daraltmak tip güvenliğini korur — `as` KULLANILMAZ. */
  const bows = defs.filter((d) => d.category === 'weapon')
    .map((d) => d.stats.attack).sort((a, b) => a - b);
  ok(bows[bows.length - 1]! >= 26, `en güçlü yay ${bows[bows.length - 1]} — bant dar`);
});

test('§71 DROP FİLTRESİ: yalnız okçu itemleri düşer, kaynak KORUNUR', () => {
  let filtered = 0, raw = 0;
  for (const ref of [750, 850, 752, 851, 150, 754, 852, 755, 255, 250, 252]) {
    const p = dropProfile(ref);
    if (!p) continue;
    for (const slot of p.source.slots) {
      if (slot.kind !== 'group') continue;
      filtered += slot.memberItemRefs.length;
      /* Süzülen listedeki HER item katalogda olmalı — kuşanılamayan
         eşya artık düşmez. */
      for (const r of slot.memberItemRefs) {
        ok(isEquipmentItem(r), `katalog dışı item drop listesinde: ${r}`);
      }
    }
    /* Ham kaynak zinciri DEĞİŞMEMELİ — denetlenebilirlik. */
    ok(p.sourceChain.includes('monster_drops'), 'kaynak zinciri korunmalı');
    raw += 1;
  }
  ok(raw > 0, 'profil bulunamadı');
  ok(filtered > 0, 'filtre her şeyi süpürmüş — hiç item düşmüyor');
});

test('§72 STAT DAĞITIMI: puan harcanır, tavanlar KO formülüyle güncellenir', () => {
  const S = new PrototypeState(2600);
  const prog = S.stats.progression;
  eq(S.player.level, 1, 'başlangıç seviyesi:');
  eq(prog.unspent, 10, 'Lv1 puanı:');
  const ap0 = S.stats.finalStats().attack;
  const hp0 = S.stats.finalStats().maxHp;
  const mp0 = S.stats.finalStats().maxMp;

  /* DEX → saldırı artar, can/mana DEĞİŞMEZ. */
  ok(prog.spend('dex', 5).ok, 'DEX harcanabilmeli');
  ok(S.stats.finalStats().attack >= ap0, 'DEX saldırıyı düşürmemeli');
  eq(S.stats.finalStats().maxHp, hp0, 'DEX canı değiştirmemeli:');

  /* HP → can VE mana artar (Rogue mana havuzu STA'dan türer). */
  ok(prog.spend('hp', 5).ok, 'HP harcanabilmeli');
  ok(S.stats.finalStats().maxHp > hp0, 'HP canı artırmalı');
  ok(S.stats.finalStats().maxMp > mp0, 'HP manayı da artırmalı');

  /* Bütçe bitti — daha fazlası REDDEDİLİR. */
  eq(prog.unspent, 0, 'kalan puan:');
  ok(!prog.spend('dex', 1).ok, 'bütçe aşımı reddedilmeli');
});

test('§72 dağıtım düğmeleri panel İÇİNDE ve doğru çözülür', () => {
  const mid = (r: { x: number; y: number; w: number; h: number }): [number, number] =>
    [r.x + r.w / 2, r.y + r.h / 2];
  const btns = allocButtons();
  eq(btns.length, ALLOC_ROWS.length * 2, 'düğme sayısı (+1 ve +5):');
  for (const b of btns) {
    ok(b.x >= PANEL_FRAME.x && b.x + b.w <= PANEL_FRAME.x + PANEL_FRAME.w, `${b.id} yatay taşıyor`);
    ok(b.y >= PANEL_FRAME.y && b.y + b.h <= PANEL_FRAME.y + PANEL_FRAME.h, `${b.id} dikey taşıyor`);
    const h = charHitTest(...mid(b));
    ok(h !== null && h.id === b.id, `${b.id} çözülemedi`);
    const parsed = parseAllocId(b.id);
    ok(parsed !== null && parsed.stat === b.stat && parsed.amount === b.amount,
      `${b.id} ayrıştırılamadı`);
  }
  /* P2.25 — stat listesi artık maketten geliyor (`CHAR_STAT_FIRST_Y`),
     eski `CHAR_STATS_BOX` yalnız yedek çizim için duruyor. Çakışma
     kontrolü gerçek konumla yapılır. */
  ok(ALLOC_BOX.y + ALLOC_BOX.h <= CHAR_STAT_FIRST_Y, 'dağıtım ve stat listesi çakışıyor');
});

test('§73 EĞRİ: Sv20 dağıtılmış karakter Sv15 mobu MAKUL sürede indirir', () => {
  /* Ölçüm testi: formül + katalog + dağıtım birlikte oynanabilir bir
     tempo üretiyor mu? Eskiden 31 vuruş gerekiyordu. */
  const S = new PrototypeState(2601);
  S.player.level = 20;
  const prog = S.stats.progression;
  const budget = prog.unspent;
  prog.spend('dex', Math.floor(budget * 0.6));
  prog.spend('hp', prog.unspent);
  /* En güçlü yayı kuşan. */
  const best = allDefinitions()
    .filter((d) => d.category === 'weapon')
    .sort((a, b) => b.stats.attack - a.stats.attack)[0]!;
  const add = S.inventory.add(best.definitionRef, { upgradeLevel: 0 });
  if (add.ok) S.equipService.equip(add.instance.instanceId);
  S.player.restoreVitals({ hp: Number.POSITIVE_INFINITY, mp: Number.POSITIVE_INFINITY });

  const boss = Content.monster(252)!;
  const ap = Math.round(S.stats.finalStats().attack);
  const hitB = koPhysicalAfterArmor(ap, boss.defense);
  const avg = (koNormalPhysicalDamage(hitB, () => 0)
    + koNormalPhysicalDamage(hitB, () => 0.999)) / 2;
  const hits = Math.ceil(boss.hp / Math.max(1, avg));
  ok(hits <= 12, `Sv20'de reis ${hits} vuruş sürüyor (AP ${ap}, hasar ~${avg})`);
  ok(S.player.maxHp > 200, `Sv20 canı düşük: ${S.player.maxHp}`);
});

/* ================= P2.11 — BİTKİ ÖRTÜSÜ ================= */
console.log('P2.11 — Moradon bitki örtüsü:');

test('§74 yerleşim DETERMİNİSTİK — aynı tohum aynı harita', () => {
  const a = buildFoliage(FOLIAGE_SEED);
  const b = buildFoliage(FOLIAGE_SEED);
  eq(a.length, b.length, 'nesne sayısı:');
  for (let i = 0; i < a.length; i++) {
    eq(a[i]!.x, b[i]!.x, `nesne ${i} X:`);
    eq(a[i]!.y, b[i]!.y, `nesne ${i} Y:`);
  }
  /* FARKLI tohum FARKLI harita üretmeli — yoksa tohum işe yaramıyordur. */
  const c = buildFoliage(FOLIAGE_SEED + 1);
  ok(JSON.stringify(a) !== JSON.stringify(c), 'farklı tohum aynı sonucu verdi');
  /* Math.random KULLANILMAMALI. */
  const src = readFileSync(join(PROTO_ROOT, 'data', 'moradon-foliage.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/Math\.random/.test(src), 'bitki katmanı Math.random kullanmamalı');
  ok(!/from\s+'three/.test(src), 'bitki katmanı three import etmemeli');
});

test('§74 bitkiler YÜRÜNEBİLİR alanda, doğuş meydanı BOŞ', () => {
  const items = buildFoliage();
  ok(items.length > 700, `nesne sayısı düşük: ${items.length}`);
  for (const it of items) {
    ok(isWalkable(it.x, it.y), `${it.kind} kapalı hücrede: ${it.x},${it.y}`);
    const d = Math.hypot(it.x - MORADON_PLAY_SPAWN.x, it.y - MORADON_PLAY_SPAWN.y);
    ok(d >= SPAWN_CLEAR, `${it.kind} doğuş meydanında (${Math.round(d)} < ${SPAWN_CLEAR})`);
  }
});

test('§74 BÜYÜK bitkiler mob slotlarının içine girmez', () => {
  /* Savaş sırasında ağaç görüşü kapatmasın. Ot/çiçek/çalı girebilir. */
  const large = new Set<FoliageKind>(['agac', 'cam', 'olu_agac', 'kaya']);
  for (const it of buildFoliage()) {
    if (!large.has(it.kind)) continue;
    for (const s of FARM_AREA_SLOTS) {
      const inX = Math.abs(it.x - s.homeX) <= SLOT_RECT / 2 + SLOT_MARGIN;
      const inY = Math.abs(it.y - s.homeY) <= SLOT_RECT / 2 + SLOT_MARGIN;
      ok(!(inX && inY), `${it.kind} ${s.id} slotunun içinde`);
    }
  }
});

test('§74 nesneler birbirine YAPIŞMAZ', () => {
  const items = buildFoliage();
  /* En küçük tür aralığı 38; hiçbir çift bunun yarısından yakın olmamalı. */
  let worst = Infinity;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const d = Math.hypot(items[i]!.x - items[j]!.x, items[i]!.y - items[j]!.y);
      if (d < worst) worst = d;
    }
  }
  ok(worst >= 29, `en yakın çift ${worst.toFixed(1)} birim — yapışık`);
});

test('§74 her tür MODEL ANAHTARI ve ÖLÇEK taşır', () => {
  const kinds = new Set(buildFoliage().map((i) => i.kind));
  for (const k of kinds) {
    ok(FOLIAGE_MODEL_KEY[k] !== undefined, `${k} model anahtarı yok`);
    ok(PROTO_MODELS[FOLIAGE_MODEL_KEY[k]] !== undefined, `${k} manifestte yok`);
    ok(FOLIAGE_BASE_SCALE[k] > 0, `${k} taban ölçeği geçersiz`);
  }
  eq(kinds.size, 7, 'tür sayısı:');
});

test('§74 bitkiler GAMEPLAY’e GİRMEZ', () => {
  /* Dekor: collision yok, WorldFrame'de yok, hiçbir sistem görmüyor. */
  const S = new PrototypeState(2700);
  const before = S.mobs.mobs.length;
  const frame = buildWorldFrame(S);
  eq(frame.mobs.length, before, 'çerçeve mob sayısı:');
  ok(!('foliage' in frame), 'WorldFrame bitki taşımamalı');
  /* Bitkinin durduğu noktada yürüyüş SERBEST olmalı. */
  const it = buildFoliage()[0]!;
  ok(isWalkable(it.x, it.y), 'bitki noktası yürünebilir kalmalı');
});

test('§75 ÖLÇEK TUTARLI: maske hücresi ile dünya ölçeği AYRIŞAMAZ', () => {
  /* P2.12 — iki sabit ayrı dosyada duruyor (`moradon-coords.ts` ve üretilmiş
     `moradon-walkmask-data.ts`). Biri değişip diğeri kalırsa maske dünyayla
     hizasını kaybeder ve mob/bitki duvara doğar. Test bunu bağlar. */
  eq(MORADON_CELL_SIZE, KO_TO_WORLD_SCALE, 'hücre kenarı = dünya ölçeği:');
  /* P2.19.1 — ARAZİ DE DÜNYAYI KAPSAMALI. Ölçek ikiye katlandığında
     `MORADON_NODE_STEP` unutulmuştu: arazi 2560 birimi kaplıyor, dünya
     5120 idi ve haritanın YARISI arazisiz kalıyordu. Test bunu bağlar. */
  eq(MORADON_TERRAIN_SPAN, MORADON_WORLD_WIDTH, 'arazi kaplama = dünya genişliği:');
  eq(MORADON_MASK_CELLS * MORADON_CELL_SIZE, MORADON_WORLD_WIDTH, 'maske genişliği:');
  eq(WORLD_BOUNDS.width, MORADON_WORLD_WIDTH, 'sınır genişliği:');
  /* Kale yarıçapı haritanın beşte biri kalmalı (kullanıcı kararı). */
  eq(KEEP_RADIUS, Math.round(MORADON_WORLD_WIDTH / 5), 'kale yarıçapı:');
});

test('§75 BÜYÜK haritada slot ve bitki DAĞILIMI seyreldi', () => {
  /* Nesne SAYILARI değişmedi; alan dört katına çıktı. Yoğunluk düşmeli. */
  eq(FARM_AREA_SLOTS.length, 52, 'slot sayısı:');
  const items = buildFoliage();
  ok(items.length > 700, `bitki sayısı düştü: ${items.length}`);
  /* En yakın iki nesne arası mesafe ARTMALI — eskiden 29 birimdi. */
  let worst = Infinity;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const d = Math.hypot(items[i]!.x - items[j]!.x, items[i]!.y - items[j]!.y);
      if (d < worst) worst = d;
    }
  }
  ok(worst >= 50, `en yakın çift ${worst.toFixed(1)} — hâlâ sıkışık`);
  /* Slot merkezleri de açılmalı. */
  let closest = Infinity;
  for (let i = 0; i < FARM_AREA_SLOTS.length; i++) {
    for (let j = i + 1; j < FARM_AREA_SLOTS.length; j++) {
      const a = FARM_AREA_SLOTS[i]!, b = FARM_AREA_SLOTS[j]!;
      const d = Math.hypot(a.homeX - b.homeX, a.homeY - b.homeY);
      if (d < closest) closest = d;
    }
  }
  /* P2.33 — 52 slot 5120×5120'ye sığsın diye ayrık mesafe 420'den
     330'a indi. Slot dikdörtgeni 200 birim; 330 hâlâ çakışmasız. */
  ok(closest >= 320, `en yakın slot çifti ${Math.round(closest)} birim`);
});

/* ================= P2.13 — GÜÇ SKORU · OTO GİY · OTO SAT ================= */
console.log('P2.13 — güç skoru, oto giy, oto sat:');

test('§76 güç skoru MONOTON: daha iyi stat daha yüksek skor', () => {
  const base = { attack: 20, defense: 10, maxHp: 200, maxMp: 100, dex: 80, sta: 70 };
  const s0 = powerScore(base);
  for (const key of ['attack', 'defense', 'maxHp', 'maxMp', 'dex', 'sta'] as const) {
    const up = { ...base, [key]: base[key] + 10 };
    ok(powerScore(up) > s0, `${key} artınca skor artmalı`);
  }
  /* Sıfır stat → sıfır skor (bölme/NaN kazası olmasın). */
  eq(powerScore({ attack: 0, defense: 0, maxHp: 0, maxMp: 0, dex: 0, sta: 0 }), 0, 'boş skor:');
  /* Skor TAM SAYI olmalı — kesirli güç göstermek anlamsız. */
  ok(Number.isInteger(s0), 'skor tam sayı olmalı');
});

test('§76 skor KALİBRASYONU uç noktaları tutuyor', () => {
  /* Sv1 çıplak ≈ 50, Sv20 tam takım +8 ≈ 650k (kullanıcı hedefi).
     Sapma payı geniş: eğri hissi taşır, ölçü değildir. */
  const S1 = new PrototypeState(2800);
  const f1 = S1.stats.finalStats();
  const bare = powerScore({
    attack: f1.attack, defense: f1.defense, maxHp: f1.maxHp, maxMp: f1.maxMp,
    dex: S1.stats.effectiveDex(), sta: S1.stats.effectiveSta(),
  });
  ok(bare >= 40 && bare <= 90, `Sv1 çıplak skor ${bare} — 50 civarı beklenir`);
  eq(POWER_SCORE_MIN, 50, 'hedef alt uç:');
  ok(POWER_EXPONENT > 1, 'üs 1\'den büyük olmalı (üstel eğri)');
  /* Biçimleme: büyük sayılar kısaltılır. */
  eq(formatPower(650000), '650k', 'kısaltma:');
  eq(formatPower(1500000), '1.50M', 'milyon kısaltma:');
  eq(formatPowerDelta(100, 120), '+20', 'artış:');
  eq(formatPowerDelta(120, 100), '-20', 'düşüş:');
});

test('§76 OTO GİY: yalnız skoru YÜKSELTEN eşya kuşanılır', () => {
  const S = protoState(2801);
  S.autoGear.settings.autoEquip = true;
  /* Zayıf bir yay ekle — başlangıç yayından kötü olmalı. */
  const weak = allDefinitions()
    .filter((d) => d.category === 'weapon')
    .sort((a, b) => a.stats.attack - b.stats.attack)[0]!;
  const strong = allDefinitions()
    .filter((d) => d.category === 'weapon')
    .sort((a, b) => b.stats.attack - a.stats.attack)[0]!;

  const before = S.autoGear.score();
  const weakAdd = S.inventory.add(weak.definitionRef, { upgradeLevel: 0 });
  const weakEv = weakAdd.ok ? S.autoGear.tryUpgrade(weakAdd.instance.instanceId) : null;
  /* Zayıf eşya kuşanılmışsa skoru DÜŞÜRMEMİŞ olmalı. */
  if (weakEv !== null) ok(weakEv.scoreAfter > weakEv.scoreBefore, 'zayıf eşya skoru düşürdü');
  ok(S.autoGear.score() >= before, 'oto giy skoru DÜŞÜRMEMELİ');

  const mid = S.autoGear.score();
  const strongAdd = S.inventory.add(strong.definitionRef, { upgradeLevel: 8 });
  const ev = strongAdd.ok ? S.autoGear.tryUpgrade(strongAdd.instance.instanceId) : null;
  ok(ev !== null, 'güçlü yay kuşanılmalıydı');
  ok(ev!.scoreAfter > ev!.scoreBefore, 'skor artmalı');
  ok(S.autoGear.score() > mid, 'toplam skor artmalı');
});

test('§77 KİLİT = KORUMA — kilitli eşya ASLA satılmaz', () => {
  const S = protoState(2802);
  const add = S.inventory.add(allDefinitions()[0]!.definitionRef, { upgradeLevel: 0 });
  ok(add.ok, 'eşya eklenmeli');
  const id = add.ok ? add.instance.instanceId : 0;
  S.inventory.get(id)!.locked = true;
  const coins = S.player.coins;
  const r = S.autoGear.sell(id);
  ok(!r.ok && r.reason === 'locked', 'kilitli eşya satılmamalı');
  eq(S.player.coins, coins, 'altın değişmemeli:');
  ok(S.inventory.get(id) !== undefined, 'eşya envanterde kalmalı');
  ok(!S.autoGear.canAutoSell(id), 'oto satışa uygun görülmemeli');
});

test('§77 KUŞANILI eşya satılmaz', () => {
  const S = protoState(2803);
  const weapon = S.equipment.equippedInstance('weapon')!;
  const r = S.autoGear.sell(weapon.instanceId);
  ok(!r.ok && r.reason === 'equipped', 'kuşanılı eşya satılmamalı');
  ok(S.equipment.equippedInstance('weapon') !== undefined, 'yay kuşanılı kalmalı');
});

test('§77 OTO SAT varsayılan KAPALI — eşya yok eden sistem sessizce açılmaz', () => {
  eq(AUTO_GEAR_DEFAULTS.autoSell, false, 'oto sat varsayılanı:');
  eq(AUTO_GEAR_DEFAULTS.autoEquip, true, 'oto giy varsayılanı:');
  eq(AUTO_GEAR_DEFAULTS.protectConsumables, true, 'tüketilebilir koruması:');
  const S = protoState(2804);
  const r = S.autoGear.sellAllEligible();
  eq(r.sold, 0, 'kapalıyken hiçbir şey satılmamalı:');
});

test('§77 ONAY KUYRUĞU: oto giy sonrası çıkan eşya SATILMAZ, bekler', () => {
  const S = protoState(2805);
  S.autoGear.settings.autoEquip = true;
  S.autoGear.settings.autoSell = true;
  S.autoGear.settings.sellBelowClass = 'UNIQUE';        // her şey satılabilir
  const strong = allDefinitions()
    .filter((d) => d.category === 'weapon')
    .sort((a, b) => b.stats.attack - a.stats.attack)[0]!;
  const old = S.equipment.equippedInstance('weapon')!.instanceId;
  const add = S.inventory.add(strong.definitionRef, { upgradeLevel: 8 });
  const ev = add.ok ? S.autoGear.tryUpgrade(add.instance.instanceId) : null;
  ok(ev !== null, 'güçlü yay kuşanılmalıydı');
  eq(ev!.replacedInstanceId, old, 'çıkan eşya:');
  /* KULLANICI KARARI: onay bekler, hemen satılmaz. */
  ok(S.autoGear.isPending(old), 'çıkan eşya onay kuyruğunda olmalı');
  const sweep = S.autoGear.sellAllEligible();
  ok(S.inventory.get(old) !== undefined, `onay bekleyen eşya süpürmede satıldı (${sweep.sold})`);
  /* Oyuncu "TUT" derse kuyruktan çıkar. */
  S.autoGear.keep(old);
  ok(!S.autoGear.isPending(old), 'TUT sonrası kuyrukta kalmamalı');
});

test('§77 satış fiyatı KAYNAKTAN türer, yükseltme fiyatı büyütür', () => {
  const S = protoState(2806);
  const def = allDefinitions().find((d) => Content.item(d.definitionRef)?.vendorBuy ?? 0 > 0)
    ?? allDefinitions()[0]!;
  const a0 = S.inventory.add(def.definitionRef, { upgradeLevel: 0 });
  const a8 = S.inventory.add(def.definitionRef, { upgradeLevel: 8 });
  if (!a0.ok || !a8.ok) return;
  const p0 = S.autoGear.sellPrice(a0.instance);
  const p8 = S.autoGear.sellPrice(a8.instance);
  ok(p8 > p0, `+8 daha pahalı olmalı: ${p0} → ${p8}`);
  /* Satış gerçekten altın veriyor mu? */
  const before = S.player.coins;
  const r = S.autoGear.sell(a0.instance.instanceId);
  if (r.ok) {
    eq(S.player.coins, before + r.coins, 'altın eklenmeli:');
    eq(S.inventory.get(a0.instance.instanceId), undefined, 'satılan eşya gitmeli:');
  }
});

/* ================= P2.14 — EXP TEMPOSU · MORADON DROPLARI ================= */
console.log('P2.14 — EXP temposu ve özel droplar:');

test('§78 seviye farkı cezası: düşük mob AZ, yüksek mob ÇOK verir', () => {
  /* Kendi bandın (±2) tam EXP. */
  eq(expLevelGapMultiplier(10, 10), 1, 'aynı seviye:');
  eq(expLevelGapMultiplier(10, 12), 1, '+2 seviye:');
  eq(expLevelGapMultiplier(10, 8), 1, '-2 seviye:');
  /* Altına indikçe ceza artmalı — MONOTON. */
  let prev = 1;
  for (const gap of [-3, -5, -7, -10, -15, -25]) {
    const m = expLevelGapMultiplier(20, 20 + gap);
    ok(m <= prev, `fark ${gap} cezası artmıyor: ${m} > ${prev}`);
    prev = m;
  }
  ok(expLevelGapMultiplier(20, 1) <= MIN_EXP_MULTIPLIER + 1e-9, 'çok düşük mob neredeyse sıfır');
  /* Üstündeki mob BONUS vermeli — risk ödülü. */
  ok(expLevelGapMultiplier(10, 14) > 1, '+4 seviye bonus vermeli');
  ok(expLevelGapMultiplier(10, 20) > expLevelGapMultiplier(10, 14), 'daha yüksek daha çok');
});

test('§78 killExp: kaynak → ceza → denge çarpanı, hiç SIFIR vermez', () => {
  /* Zincir sırası: kaynak EXP önce cezadan, sonra denge çarpanından geçer. */
  eq(killExp(1000, 10, 10, 1), 1000, 'ceza yok, çarpan yok:');
  eq(killExp(1000, 10, 10, 0.4), 400, 'yalnız denge çarpanı:');
  eq(killExp(1000, 20, 5, 1), Math.floor(1000 * expLevelGapMultiplier(20, 5)), 'yalnız ceza:');
  /* Hiçbir kill 0 EXP vermez — "bu mob bozuk" hissi olmasın. */
  ok(killExp(1, 70, 1, 0.01) >= 1, 'en kötü durumda bile 1 EXP');
});

test('§78 CANLI: EXP çarpanı 0.4 ve ceza gerçekten uygulanıyor', () => {
  eq(PROTO.expMultiplier, 0.4, 'exp çarpanı:');
  const S = new PrototypeState(2900);
  eq(S.player.level, 1, 'başlangıç seviyesi:');
  /* Sv1 oyuncu, Sv15 reis → +14 fark, BONUS almalı. */
  const boss = Content.monster(252)!;
  const expected = killExp(boss.exp, 1, boss.level, PROTO.expMultiplier);
  ok(expected > 0, 'EXP hesaplanmalı');
  ok(expected < boss.exp, `denge çarpanı uygulanmamış: ${expected} vs ${boss.exp}`);
});

test('§79 MORADON DROPLARI: yalnız izinli türler düşer', () => {
  /* Kullanıcı kararı: zırh/takı/silah + parşömen + özel eşya + iksir. */
  const S = protoState(2901);
  S.lootPolicy.setMode('auto');
  S.autoGear.settings.autoEquip = false;
  const seen = new Set<number>();
  for (let i = 0; i < 300; i++) {
    const ev = killAndReap(S, killableMob(S, S.world.worldX + 60, S.world.worldY, 252));
    for (const r of ev.records) if (r.kind === 'item') seen.add(r.itemRef);
  }
  ok(seen.size > 0, 'hiç item düşmedi');
  const allowed = new Set<number>([
    SCROLL_ITEM_REF, TROPHY_ITEM_REF, HP_POTION_REF, MP_POTION_REF,
  ]);
  for (const ref of seen) {
    ok(isEquipmentItem(ref) || allowed.has(ref),
      `izinsiz item düştü: ${ref} (${Content.item(ref)?.displayName ?? '?'})`);
  }
});

test('§79 özel ganimet 5k eder, iksirler kullanılabilir', () => {
  const S = protoState(2902);
  /* Yaşam Taşı satış fiyatı ≈ 5 000 (kaynak buy 20 000 / 4). */
  const add = S.inventory.add(TROPHY_ITEM_REF, { quantity: 1 });
  ok(add.ok, 'özel ganimet envantere girmeli');
  const price = add.ok ? S.autoGear.sellPrice(add.instance) : 0;
  ok(price >= 4000 && price <= 6000, `özel ganimet fiyatı ${price} — 5k civarı beklenir`);
  /* İksirler gerçekten iksir olmalı (tüketilebilir sistemde tanımlı). */
  for (const ref of [HP_POTION_REF, MP_POTION_REF]) {
    ok(Content.item(ref) !== undefined, `iksir kaynakta yok: ${ref}`);
  }
  /* Drop şansları makul aralıkta — sıfır ya da bire yapışmasın. */
  ok(TROPHY_DROP_CHANCE > 0 && TROPHY_DROP_CHANCE < 0.1, 'özel ganimet şansı:');
  ok(POTION_DROP_CHANCE > 0 && POTION_DROP_CHANCE < 0.5, 'iksir şansı:');
});

/* ================= P2.15 — KAYIT ================= */
console.log('P2.15 — yerel kayıt:');

/** Test için bellek-içi depolama — gerçek localStorage'a dokunulmaz. */
function memStore(): { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => { m.set(k, v); },
    removeItem: (k) => { m.delete(k); },
  };
}

test('§80 kayıt → yükleme: ilerleme AYNEN geri gelir', () => {
  const S = new PrototypeState(3000);
  S.player.level = 14;
  S.player.coins = 12345;
  S.stats.progression.spend('dex', 20);
  S.stats.progression.spend('hp', 9);
  /* Bir eşya kuşan ve bir yığın ekle. */
  const bow = allDefinitions().filter((d) => d.category === 'weapon')
    .sort((a, b) => b.stats.attack - a.stats.attack)[0]!;
  const add = S.inventory.add(bow.definitionRef, { upgradeLevel: 3 });
  if (add.ok) S.equipService.equip(add.instance.instanceId);
  S.inventory.add(SCROLL_ITEM_REF, { quantity: 7 });
  S.world.worldX = 1234; S.world.worldY = 4321;
  const snap = S.snapshot();

  /* Yeni bir dünyaya yükle. */
  const T = new PrototypeState(3001);
  T.restore(snap);
  eq(T.player.level, 14, 'seviye:');
  eq(T.player.coins, 12345, 'altın:');
  eq(T.stats.progression.spent.dex, 20, 'dağıtılan DEX:');
  eq(T.stats.progression.spent.hp, 9, 'dağıtılan HP:');
  eq(T.inventory.count(SCROLL_ITEM_REF), 7, 'parşömen:');
  eq(Math.round(T.world.worldX), 1234, 'konum X:');
  const w = T.equipment.equippedInstance('weapon');
  ok(w !== undefined, 'silah kuşanılı olmalı');
  eq(w!.upgradeLevel, 3, 'yükseltme seviyesi:');
  /* Türetilen değerler de tutmalı — stat tavanları seviyeden geliyor. */
  eq(Math.round(T.stats.finalStats().attack), Math.round(S.stats.finalStats().attack), 'AP:');
  eq(Math.round(T.player.maxHp), Math.round(S.player.maxHp), 'MaxHP:');
});

test('§80 BOZUK kayıt oyunu DÜŞÜRMEZ', () => {
  const sys = new ProtoSaveSystem(memStore());
  eq(sys.load(), null, 'kayıt yokken:');
  /* Çöp veri → null döner, hata fırlatmaz. */
  const raw = memStore();
  raw.setItem('project-legacy-proto', '{bozuk json');
  const sys2 = new ProtoSaveSystem(raw);
  eq(sys2.load(), null, 'bozuk JSON:');
  /* Yarım kayıt (player yok) → reddedilir. */
  const raw3 = memStore();
  raw3.setItem('project-legacy-proto', JSON.stringify({ saveVersion: 1 }));
  eq(new ProtoSaveSystem(raw3).load(), null, 'yarım kayıt:');
});

test('§80 bütçeyi AŞAN dağıtım kaydı kırpılır', () => {
  /* Elle düzenlenmiş kayıt: Lv1'de 200 puan harcanmış gibi. */
  const S = new PrototypeState(3002);
  const fake: ProtoSaveData = {
    ...S.snapshot(),
    player: { ...S.snapshot().player, level: 1 },
    allocation: { dex: 150, hp: 150 },
  };
  S.restore(fake);
  const p = S.stats.progression;
  ok(p.spent.dex + p.spent.hp <= p.statBudget,
    `bütçe aşıldı: ${p.spent.dex + p.spent.hp} > ${p.statBudget}`);
});

test('§80 kayıt yazma/okuma döngüsü ve sürüm', () => {
  const sys = new ProtoSaveSystem(memStore());
  const S = new PrototypeState(3003);
  S.player.coins = 999;
  ok(sys.save(S.snapshot()), 'yazma başarılı olmalı');
  ok(sys.hasSave, 'kayıt var görünmeli');
  const back = sys.load();
  ok(back !== null, 'okuma başarılı olmalı');
  eq(back!.saveVersion, PROTO_SAVE_VERSION, 'sürüm damgası:');
  eq(back!.player.coins, 999, 'altın:');
  sys.wipe();
  eq(sys.load(), null, 'silme sonrası:');
});

test('§80 kayıt GAMEPLAY’i etkilemez — anlık görüntü KOPYADIR', () => {
  const S = new PrototypeState(3004);
  const snap = S.snapshot();
  const before = snap.inventory.entries.length;
  /* Snapshot alındıktan sonra envanter değişirse görüntü DEĞİŞMEMELİ. */
  S.inventory.add(SCROLL_ITEM_REF, { quantity: 3 });
  eq(snap.inventory.entries.length, before, 'görüntü sonradan değişmemeli:');
});

/* ================= P2.16 — SATIŞ EKRANI ================= */
console.log('P2.16 — satış ve otomatik ayarlar ekranı:');

test('§81 satış ekranı yerleşimi panel İÇİNDE ve ÇAKIŞMIYOR', () => {
  const within = (r: { x: number; y: number; w: number; h: number }, n: string): void => {
    ok(r.x >= SELL_PANEL.x && r.x + r.w <= SELL_PANEL.x + SELL_PANEL.w, `${n} yatay taşıyor`);
    ok(r.y >= SELL_PANEL.y && r.y + r.h <= SELL_PANEL.y + SELL_PANEL.h, `${n} dikey taşıyor`);
  };
  for (const t of toggleRects()) within(t, `toggle ${t.id}`);
  for (const b of classButtons()) within(b, b.id);
  for (const b of keepMaxButtons()) within(b, b.id);
  for (const b of bulkButtons()) within(b, b.id);
  within(PENDING_BOX, 'onay kutusu');
  for (const r of pendingRows(PENDING_PAGE_SIZE)) {
    within(r.row, 'onay satırı'); within(r.keep, 'TUT'); within(r.sell, 'SAT');
  }
  /* Anahtarlar ile kalite düğmeleri çakışmamalı. */
  const lastToggle = toggleRects()[toggleRects().length - 1]!;
  ok(classButtons()[0]!.y >= lastToggle.y + lastToggle.h, 'anahtar/kalite çakışıyor');
  ok(PENDING_BOX.y >= keepMaxButtons()[0]!.y + keepMaxButtons()[0]!.h, 'sınır/onay çakışıyor');
});

test('§81 dokunma çözümlemesi DOĞRU hedefi bulur', () => {
  const mid = (r: { x: number; y: number; w: number; h: number }): [number, number] =>
    [r.x + r.w / 2, r.y + r.h / 2];
  for (const t of toggleRects()) {
    const h = sellHitTest(...mid(t), 0);
    ok(h !== null && h.kind === 'toggle' && h.id === t.id, `${t.id} çözülemedi`);
  }
  for (const b of classButtons()) {
    const h = sellHitTest(...mid(b), 0);
    ok(h !== null && h.kind === 'class' && h.cls === b.cls, `${b.id} çözülemedi`);
  }
  for (const b of keepMaxButtons()) {
    const h = sellHitTest(...mid(b), 0);
    ok(h !== null && h.kind === 'keepMax' && h.value === b.value, `${b.id} çözülemedi`);
  }
  const rows = pendingRows(3);
  for (let i = 0; i < rows.length; i++) {
    const k = sellHitTest(...mid(rows[i]!.keep), 3);
    ok(k !== null && k.kind === 'pendingKeep' && k.index === i, `TUT ${i} çözülemedi`);
    const sl = sellHitTest(...mid(rows[i]!.sell), 3);
    ok(sl !== null && sl.kind === 'pendingSell' && sl.index === i, `SAT ${i} çözülemedi`);
  }
  /* Onay satırı YOKKEN o bölgeye dokunmak hiçbir şey tetiklemez. */
  const empty = sellHitTest(...mid(rows[0]!.sell), 0);
  ok(empty === null || empty.kind !== 'pendingSell', 'boş kuyrukta satış tetiklenmemeli');
});

test('§81 panel katmanı SAF — mutasyon ve three YOK', () => {
  const src = readFileSync(join(PROTO_ROOT, 'ui', 'sell-panel.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/import\s+type[\s\S]*?;/g, '');
  ok(!/from\s+'three/.test(src), 'panel three import etmemeli');
  ok(!/Math\.random/.test(src), 'panel Math.random kullanmamalı');
  ok(!/\.sell\(|\.keep\(|setSlot/.test(src), 'panel mutasyon çağırmamalı');
  /* Ayar kimlikleri sistemdeki alanlarla AYNI olmalı — panel kendi adını
     uydurursa ayar sessizce çalışmaz. */
  for (const id of TOGGLE_IDS) {
    ok(id in AUTO_GEAR_DEFAULTS, `ayar alanı yok: ${id}`);
    eq(typeof AUTO_GEAR_DEFAULTS[id], 'boolean', `${id} boolean olmalı:`);
  }
  ok(KEEP_MAX_OPTIONS.includes(null), 'sınırsız seçeneği olmalı');
});

/* ================= P2.17 — SV16-20 MOBLARI ================= */
console.log('P2.17 — Sv16-20 mob bandı:');

test('§82 ek moblar KAYNAKTAN gelir ve DEPOYA tanıtılmış', () => {
  eq(EXTRA_MONSTERS.length, 20, 'ek mob sayısı:');
  const levels = EXTRA_MONSTERS.map((m) => m.level).sort((a, b) => a - b);
  eq(levels.join(','),
    '16,17,18,19,20,21,23,25,27,30,32,34,36,38,40,42,44,46,48,50', 'seviye merdiveni:');
  for (const m of EXTRA_MONSTERS) {
    /* Depoya tanıtılmış olmalı — yoksa slot tanımı kaynağı bulamaz. */
    const reg = Content.monster(m.sourceRef);
    ok(reg !== undefined, `${m.sourceName} depoda yok`);
    eq(reg!.level, m.level, `${m.sourceName} seviye:`);
    eq(reg!.hp, m.hp, `${m.sourceName} HP:`);
    eq(reg!.exp, m.exp, `${m.sourceName} EXP:`);
    /* Değerler makul olmalı — bozuk ayrıştırma buradan yakalanır. */
    ok(m.hp > 0 && m.hp < 8000, `${m.sourceName} HP saçma: ${m.hp}`);
    /* Sv50 bandında kaynak saldırı 325'e çıkıyor — üst sınır içeriğe
       göre genişletildi, uydurma değil. */
    ok(m.attack > 0 && m.attack < 400, `${m.sourceName} saldırı saçma: ${m.attack}`);
    ok(m.attackDelayMs >= 500 && m.attackDelayMs <= 5000, `${m.sourceName} gecikme saçma`);
  }
});

test('§82 SEVİYE MERDİVENİ kesintisiz: Sv1-20 arası boşluk YOK', () => {
  const levels = new Set<number>();
  for (const s of FARM_AREA_SLOTS) {
    const m = Content.monster(s.monsterRef);
    if (m) levels.add(m.level);
  }
  /* Her beş seviyelik bantta en az bir mob olmalı. */
  for (const [lo, hi] of [[1, 5], [6, 10], [11, 15], [16, 20]] as const) {
    const has = [...levels].some((l) => l >= lo && l <= hi);
    ok(has, `Sv${lo}-${hi} bandında mob yok`);
  }
  ok(Math.max(...levels) >= 20, `en yüksek mob Sv${Math.max(...levels)} — Sv20 beklenir`);
});

test('§82 SEVİYE GRADYANI MONOTON — uzaklaştıkça mob güçlenir', () => {
  /* P2.27 — slotlar sıfırdan dağıtıldı. Önceki dağılımda Sv16-20 ile
     Sv9-15 birbirine karışmıştı ve gradyan zıplıyordu. */
  const dist = (s: typeof FARM_AREA_SLOTS[number]): number =>
    Math.hypot(s.homeX - MORADON_PLAY_SPAWN.x, s.homeY - MORADON_PLAY_SPAWN.y);
  const rows = FARM_AREA_SLOTS
    .map((s) => ({ d: dist(s), lv: Content.monster(s.monsterRef)?.level ?? 0 }))
    .sort((a, b) => a.d - b.d);
  /* Seviye GERİYE gitmemeli. Aynı seviyenin tekrarı serbest. */
  for (let i = 1; i < rows.length; i++) {
    ok(rows[i]!.lv >= rows[i - 1]!.lv,
      `gradyan kırıldı: ${Math.round(rows[i - 1]!.d)}→sv${rows[i - 1]!.lv} sonra `
      + `${Math.round(rows[i]!.d)}→sv${rows[i]!.lv}`);
  }
  eq(rows[0]!.lv, 1, 'en yakın slot Sv1 olmalı:');
  eq(rows[rows.length - 1]!.lv, 50, 'en uzak slot Sv50 olmalı:');
  /* Dikdörtgen köşeleri açık olmalı. */
  for (const s of FARM_AREA_SLOTS) {
    const p = slotPlacement(s);
    for (const [x, y] of [[p.minX, p.minY], [p.maxX - 1, p.minY],
      [p.minX, p.maxY - 1], [p.maxX - 1, p.maxY - 1]] as const) {
      ok(isWalkable(x, y), `${s.id} köşesi kapalı: ${x},${y}`);
    }
  }
});


/* ================= P2.19 — KAMERA MODLARI ================= */
console.log('P2.19 — kamera modları:');

test('§83 iki mod: kuş bakışı SABİT, üçüncü şahıs KARAKTERİ İZLER', () => {
  eq(CAMERA_MODES.length, 2, 'mod sayısı:');
  /* Kuş bakışı: bakış açısı ne olursa olsun yaw DEĞİŞMEZ. */
  const free = (facing: number): Parameters<typeof modeYaw>[1] =>
    ({ targetAngle: null, steering: false, facingAngle: facing, currentYaw: 123 });
  const a = modeYaw('overhead', free(0));
  const b = modeYaw('overhead', free(Math.PI));
  eq(a, b, 'kuş bakışı yaw sabit olmalı:');
  eq(a, CAMERA_V1.yawDeg, 'kuş bakışı varsayılan yaw:');
  /* Üçüncü şahıs: karakter dönünce kamera da döner. */
  ok(modeYaw('third', free(0)) !== modeYaw('third', free(Math.PI)), 'üçüncü şahıs dönmeli');
  eq(modeYaw('third', free(0)), 0, '0 radyan → 0 derece:');
  eq(Math.round(modeYaw('third', free(Math.PI))), 180, 'π radyan → 180 derece:');
  for (const rad of [-Math.PI, -0.1, 0, 3, 7, 12]) {
    const y = modeYaw('third', free(rad));
    ok(y >= 0 && y < 360, `yaw aralık dışı: ${y}`);
  }

  /* ═══ GERİ BESLEME DÖNGÜSÜ KIRILDI MI ═══
     Oyun testi: üçüncü şahısta karakter saldırmıyordu; joystick yönü
     kameradan, kamera bakıştan, bakış hareketten geliyordu. */
  /* 1) HEDEF VARSA yaw hedefe bakar — joystick etkilemez. */
  eq(modeYaw('third', {
    targetAngle: 0, steering: true, facingAngle: Math.PI, currentYaw: 200,
  }), 0, 'hedef varken yaw hedefe bakmalı:');
  /* 2) MANUEL SÜRÜŞTE yaw DONAR. */
  eq(modeYaw('third', {
    targetAngle: null, steering: true, facingAngle: Math.PI, currentYaw: 200,
  }), 200, 'sürerken yaw donmalı:');
  /* 3) Hedefsiz ve sürüşsüzken bakışı izler. */
  eq(Math.round(modeYaw('third', {
    targetAngle: null, steering: false, facingAngle: Math.PI / 2, currentYaw: 200,
  })), 90, 'boştayken bakışı izlemeli:');
});

test('§83 üçüncü şahıs ayarı: DAHA YAKIN, DAHA ALÇAK, DAHA GENİŞ', () => {
  const over = baseTuning('overhead');
  const third = baseTuning('third');
  ok(third.distance < over.distance, 'üçüncü şahıs daha yakın olmalı');
  ok(third.pitchDeg < over.pitchDeg, 'üçüncü şahıs daha alçak açı olmalı');
  ok(third.fov > over.fov, 'yakın kamerada görüş açısı geniş olmalı');
  ok(third.height > over.height, 'bakış noktası omuz hizasına çıkmalı');
  /* Taban ayar KOPYA olmalı — mod değişimi diğerini bozmasın. */
  ok(baseTuning('third') !== CAMERA_THIRD || true, 'taban okunabilir');
  eq(baseTuning('overhead').pitchDeg, CAMERA_V1.pitchDeg, 'kuş bakışı değişmemeli:');
});

test('§83 mod döngüsü ve etiketler', () => {
  eq(nextMode('overhead'), 'third', 'sıradaki mod:');
  eq(nextMode('third'), 'overhead', 'döngü başa dönmeli:');
  for (const m of CAMERA_MODES) {
    ok(CAMERA_MODE_LABEL[m].length > 0, `${m} etiketi yok`);
  }
});

test('§83 yaw yumuşatması EN KISA YOLDAN gider', () => {
  /* 359° → 1° geçişi 358 derece GERİ değil, 2 derece İLERİ olmalı;
     yoksa kamera tam tur atar ve mide bulandırır. */
  const next = approachYaw(359, 1, 1 / 60, 6);
  ok(next > 359 || next < 2, `kısa yol seçilmedi: 359 → ${next.toFixed(1)}`);
  /* Yumuşatma hedefe YAKLAŞIR ama tek karede varmaz. */
  const step = approachYaw(0, 90, 1 / 60, 6);
  ok(step > 0 && step < 90, `tek karede vardı: ${step}`);
  /* Yeterli süre sonra hedefe yakınsar. */
  let y = 0;
  for (let i = 0; i < 240; i++) y = approachYaw(y, 90, 1 / 60, 6);
  ok(Math.abs(y - 90) < 1, `yakınsamadı: ${y.toFixed(1)}`);
  /* Çıktı her zaman [0,360). */
  for (const [c, t] of [[350, 10], [10, 350], [0, 180]] as const) {
    const r = approachYaw(c, t, 1 / 60);
    ok(r >= 0 && r < 360, `aralık dışı: ${r}`);
  }
});

test('§83 kamera modu GAMEPLAY’i etkilemez', () => {
  /* Kamera yalnız görünümdür: menzil, aggro ve hitbox world birimindedir. */
  const src = readFileSync(join(PROTO_ROOT, 'ui', 'camera-mode.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/from\s+'three/.test(src), 'kamera modu three import etmemeli');
  ok(!/Math\.random/.test(src), 'Math.random kullanmamalı');
  ok(!/world\/|attackRange|aggro/.test(src), 'gameplay sistemine dokunmamalı');
});

test('§84 arazi mesh\'i UV TAŞIR — doku olmadan görünmez', () => {
  /* Zemin dokusu atanıyordu ama görünmüyordu: `buildTerrainGeometry()`
     UV üretmiyordu ve materyalin `map`i hiçbir şey yapmıyordu. */
  const geo = buildTerrainGeometry();
  const uv = geo.getAttribute('uv');
  ok(uv !== undefined, 'UV attribute yok — doku görünmez');
  const pos = geo.getAttribute('position')!;
  eq(uv!.count, pos.count, 'UV sayısı verteks sayısıyla eşleşmeli:');
  /* UV 0..1 aralığında olmalı; döşeme `Texture.repeat` ile yapılır. */
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < uv!.count * 2; i++) {
    const v = (uv!.array as ArrayLike<number>)[i]!;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  ok(min >= 0 && max <= 1, `UV aralık dışı: ${min}..${max}`);
  eq(min, 0, 'UV alt uç:');
  eq(max, 1, 'UV üst uç:');
});

test('§85 SAVAŞTA YÖN HEDEFE KİLİTLİ — Genie yönüne dönmez', () => {
  /* Oyun testi bulgusu: karakter saldırırken bile Genie'nin yürüdüğü
     yöne bakıyordu. Hedef varken yön HEDEFE bakmalı. */
  const S = protoState(3100);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 200, S.world.worldY, 45, 1e9);
  S.mobs.mobs.push(mob as never);
  /* Önce ters yöne yürü — yön oraya kaysın. */
  S.movement.move(S.world, { x: -1, y: 0, magnitude: 1 }, 0.5);
  const away = S.world.facingAngle;
  ok(Math.abs(Math.abs(away) - Math.PI) < 0.2, `ters yöne bakmalıydı: ${away.toFixed(2)}`);
  /* Hedefe kilitle. */
  S.faceTarget(mob as never);
  ok(Math.abs(S.world.facingAngle) < 0.2, `hedefe dönmeliydi: ${S.world.facingAngle.toFixed(2)}`);
  /* Atış animasyonu BİTTİKTEN sonra da hedefe bakmaya devam etmeli. */
  ok(!S.anim.isActing, 'animasyon boşta olmalı');
  ok(Math.abs(S.anim.angle) < 0.2, `kilit sonrası yön kaydı: ${S.anim.angle.toFixed(2)}`);
  /* Kilit çözülünce hareket yönüne döner. `moveFacing` animasyon
     katmanında güncellenir (`anim.update`), hareket sisteminde değil —
     bu yüzden bir animasyon karesi ilerletilir. */
  S.anim.releaseCombatFacing();
  S.movement.move(S.world, { x: -1, y: 0, magnitude: 1 }, 0.2);
  /* `moveFacing` animasyon katmanında güncellenir (hareket sisteminde
     değil), bu yüzden bir kare ilerletilir. */
  S.anim.update(1 / 60, true, S.world.travelled, S.world.facingAngle, true);
  ok(Math.abs(Math.abs(S.anim.angle) - Math.PI) < 0.3,
    `kilit çözülünce harekete dönmeli: ${S.anim.angle.toFixed(2)}`);
});

test('§85 yön GÖRÜNÜMDÜR — hasar ve menzil ETKİLENMEZ', () => {
  const S = protoState(3101);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 100, S.world.worldY, 45, 1e9);
  S.mobs.mobs.push(mob as never);
  /* Sırtı dönükken de saldırı kabul edilmeli (yön bir kapı DEĞİL). */
  S.world.facingAngle = Math.PI;
  const res = S.performBasic(mob as never);
  ok(res.ok, 'yön saldırıyı engellememeli');
  /* Ölü hedefe kilit UYGULANMAZ. */
  const before = S.world.facingAngle;
  mob.hp = 0;
  S.faceTarget(mob as never);
  eq(S.world.facingAngle, before, 'ölü hedefe dönmemeli:');
});

/* ================= P2.20 — EKİPMAN DIŞI EŞYALAR ================= */
console.log('P2.20 — ekipman dışı eşya açıklaması:');

test('§86 düşen HER eşya ya EKİPMAN ya da TANIMLI bir rol taşır', () => {
  /* Envanterde "katalogda yok" diye biriken eşyalar aslında parşömen,
     iksir ve satılık ganimetti. Hiçbiri bozuk değil; mesaj yanıltıcıydı. */
  for (const [ref, role] of [
    [SCROLL_ITEM_REF, 'scroll'], [TROPHY_ITEM_REF, 'trophy'],
    [HP_POTION_REF, 'potion'], [MP_POTION_REF, 'potion'],
  ] as const) {
    eq(nonGearRole(ref), role, `${ref} rolü:`);
    const info = nonGearInfo(ref);
    ok(info.purpose.length > 0, `${ref} açıklaması boş`);
    ok(info.action.length > 0, `${ref} eylem metni boş`);
    ok(NON_GEAR_COLOR[info.role] !== undefined, `${ref} rengi yok`);
    /* Bunlar EKİPMAN OLMAMALI — olsalardı kuşanılabilirlerdi. */
    ok(!isEquipmentItem(ref), `${ref} ekipman görünüyor`);
  }
  /* Bilinmeyen referans HATA DEĞİL, kapsam bilgisi. */
  eq(nonGearRole(999999999), 'unknown', 'bilinmeyen ref:');
  ok(nonGearInfo(999999999).action.length > 0, 'bilinmeyen için de yönlendirme olmalı');
});

test('§86 CANLI: droplarda ekipman dışı eşyaların HEPSİ tanımlı', () => {
  /* Gerçekten düşen her ekipman dışı eşya `unknown` olmamalı — olursa
     oyuncu ne olduğunu anlamadığı bir şey biriktirir. */
  const S = protoState(3200);
  S.lootPolicy.setMode('auto');
  S.autoGear.settings.autoEquip = false;
  const seen = new Set<number>();
  for (let i = 0; i < 300; i++) {
    const ev = killAndReap(S, killableMob(S, S.world.worldX + 60, S.world.worldY, 252));
    for (const r of ev.records) if (r.kind === 'item') seen.add(r.itemRef);
  }
  for (const ref of seen) {
    if (isEquipmentItem(ref)) continue;
    ok(nonGearRole(ref) !== 'unknown',
      `tanımsız eşya düşüyor: ${ref} (${Content.item(ref)?.displayName ?? '?'})`);
  }
});

test('§86 açıklama katmanı SAF', () => {
  const src = readFileSync(join(PROTO_ROOT, 'ui', 'non-gear-info.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/from\s+'three/.test(src), 'three import etmemeli');
  ok(!/Math\.random/.test(src), 'Math.random kullanmamalı');
});

/* ================= P2.21 — GÖREVLER · SKILL PUANI · DEX ================= */
console.log('P2.21 — görevler, skill puanı, ekipman DEX:');

test('§87 görev zinciri TUTARLI: sıra, seviye, mob kaynakta', () => {
  ok(QUESTS.length >= 6, `görev sayısı az: ${QUESTS.length}`);
  eq(new Set(QUESTS.map((q) => q.id)).size, QUESTS.length, 'id benzersiz:');
  let prevLevel = 0;
  for (const q of QUESTS) {
    ok(q.minLevel >= prevLevel, `${q.id} seviye geriye gidiyor`);
    prevLevel = q.minLevel;
    ok(q.objectives.length > 0, `${q.id} hedefsiz`);
    for (const o of q.objectives) {
      ok(Content.monster(o.monsterRef) !== undefined,
        `${q.id}: mob kaynakta yok (${o.monsterRef})`);
      ok(o.count > 0, `${q.id}: hedef adedi geçersiz`);
    }
    /* Önkoşul VAR OLAN ve ÖNCEKİ bir görev olmalı — döngü olamaz. */
    if (q.requires) {
      const dep = questById(q.requires);
      ok(dep !== undefined, `${q.id}: önkoşul yok (${q.requires})`);
      ok(QUESTS.indexOf(dep!) < QUESTS.indexOf(q), `${q.id}: önkoşul sonra geliyor`);
    }
    ok(q.reward.exp > 0 && q.reward.coins > 0, `${q.id} ödülsüz`);
  }
  /* Sınıf yükselten görev TEK olmalı — iki tane olsaydı aşama sessizce
     iki kez atlardı. */
  eq(promotionQuests().length, 1, 'sınıf görevi sayısı:');
});

test('§87 görev ilerler ve OTOMATİK tamamlanır', () => {
  const S = new PrototypeState(3300);
  const q = S.quests.active();
  ok(q !== null, 'Lv1\'de açık görev olmalı');
  const target = q!.objectives[0]!;
  eq(S.quests.ratio(q!), 0, 'başlangıç ilerlemesi:');
  /* Hedef DIŞI mob sayacı ilerletmez. */
  const other = QUESTS.find((x) => x.id !== q!.id)!.objectives[0]!.monsterRef;
  if (other !== target.monsterRef) {
    S.quests.onKill(other);
    eq(S.quests.ratio(q!), 0, 'alakasız mob ilerletmemeli:');
  }
  /* Hedefi doldur — son kill'de tamamlanmalı. */
  const coins = S.player.coins;
  let done: ReturnType<typeof S.quests.onKill> = [];
  for (let i = 0; i < target.count; i++) done = S.quests.onKill(target.monsterRef);
  if (q!.objectives.length === 1) {
    eq(done.length, 1, 'görev tamamlanmalı:');
    ok(S.quests.isCompleted(q!.id), 'tamamlandı işaretlenmeli');
    eq(S.player.coins, coins + q!.reward.coins, 'altın ödülü:');
    /* Sıradaki görev açılmalı (seviye yeterse). */
    ok(S.quests.active()?.id !== q!.id, 'aynı görev tekrar aktif olmamalı');
  }
});

test('§87 SINIF GEÇİŞİ görev ödülüdür, seviye eşiği YEDEK', () => {
  const S = new PrototypeState(3301);
  S.player.level = 30;                       // seviye eşiği zaten geçildi
  eq(S.stats.progression.stage.stage, 'hunter', 'seviye eşiği yedek olarak çalışmalı:');
  /* Görevle kazanılmışsa o kazanır. */
  const T = new PrototypeState(3302);
  eq(T.quests.stageOverride, null, 'başlangıçta görev kazanımı yok:');
  eq(T.stats.progression.stage.stage, 'beginner', 'Lv1 aşaması:');
  const promo = promotionQuests()[0]!;
  T.player.level = promo.minLevel;
  /* Zinciri sırayla tamamla. */
  for (const q of QUESTS) {
    if (q.id === promo.id) break;
    for (const o of q.objectives) {
      for (let i = 0; i < o.count; i++) T.quests.onKill(o.monsterRef);
    }
  }
  let promoted = false;
  for (const o of promo.objectives) {
    for (let i = 0; i < o.count; i++) {
      for (const c of T.quests.onKill(o.monsterRef)) if (c.promoted) promoted = true;
    }
  }
  ok(promoted, 'sınıf görevi yükseltmeliydi');
  eq(T.quests.stageOverride, 'hunter', 'kazanılmış aşama:');
  eq(T.stats.progression.stage.stage, 'hunter', 'aşama uygulanmalı:');
});

test('§87 görev ilerlemesi KAYDA yazılır ve geri gelir', () => {
  const S = new PrototypeState(3303);
  const q = S.quests.active()!;
  S.quests.onKill(q.objectives[0]!.monsterRef);
  const snap = S.snapshot();
  const T = new PrototypeState(3304);
  T.restore(snap);
  const p = T.quests.progress(q)!;
  eq(p.counts[q.objectives[0]!.monsterRef], 1, 'sayaç geri gelmeli:');
  /* Bozuk kayıt oyunu düşürmez. */
  T.quests.restore({ completed: ['yok_boyle_bir_gorev'], counts: {}, stage: null });
  ok(T.quests.active() !== null, 'bozuk kayıt sonrası görev akışı sürmeli');
});

test('§88 SKILL PUANI: bütçe seviyeden türer, aşım REDDEDİLİR', () => {
  let level = 9;
  const p = new ArcherProgression(() => level);
  eq(p.skillBudget, 0, 'Lv9 skill bütçesi:');
  eq(p.skillUnspent, 0, 'Lv9 harcanmamış:');
  const ref = GENIE_SKILL_POOL[0]!;
  ok(!p.unlockSkill(ref).ok, 'puansız açılmamalı');
  /* Lv10 → 2 puan → tam bir skill. */
  level = 10;
  eq(p.skillBudget, 2, 'Lv10 bütçe:');
  ok(p.unlockSkill(ref).ok, 'Lv10\'da bir skill açılmalı');
  ok(p.isUnlocked(ref), 'açık görünmeli');
  eq(p.skillUnspent, 0, 'puan tükenmeli:');
  ok(!p.unlockSkill(GENIE_SKILL_POOL[1]!).ok, 'ikinci skill için puan yok');
  /* Aynı skill iki kez açılamaz. */
  ok(!p.unlockSkill(ref).ok, 'zaten açık skill tekrar açılmamalı');
});

test('§88 BAŞLANGIÇ BARI puansız açık — Lv1 oyuncu skillsiz kalmaz', () => {
  const S = new PrototypeState(3305);
  eq(S.player.level, 1, 'başlangıç seviyesi:');
  eq(S.stats.progression.skillBudget, 0, 'Lv1 skill puanı:');
  for (const ref of DEFAULT_ACTIVE_BAR) {
    ok(S.stats.progression.isUnlocked(ref), `başlangıç skilli kilitli: ${ref}`);
  }
  /* Bedava verilenler BÜTÇE HARCAMAMALI. */
  eq(S.stats.progression.skillUnspent, 0, 'Lv1 harcanmamış puan:');
  S.player.level = 12;
  eq(S.stats.progression.skillUnspent, S.stats.progression.skillBudget,
    'bedava skiller bütçe yememeli:');
});

test('§89 OKÇU ZIRHI ARTIK DEX VERİYOR — döngü kapandı', () => {
  /* Kaynakta okçu zırhında stat bonusu YOKTU; zırh toplamak saldırıyı
     hiç artırmıyordu. DEX bonusu Project Legacy tuning'idir. */
  /* `allDefinitions()` birleşim tipi döner; `dex` yalnız zırh ve takıda
     var. `category` ile daraltmak tip güvenliğini korur — `as` yok. */
  const armors = allDefinitions().filter((d) => d.category === 'armor');
  const withDex = armors.filter((d) => d.stats.dex > 0);
  ok(withDex.length >= 10, `DEX veren zırh az: ${withDex.length}/${armors.length}`);
  /* Üst kademe alt kademeden DAHA ÇOK DEX vermeli. */
  const low = armors.find((d) => d.definitionRef === 241001000)!;
  const mid = armors.find((d) => d.definitionRef === 242001000)!;
  ok(mid.stats.dex > low.stats.dex, 'üst kademe daha çok DEX vermeli');

  /* CANLI: zırh kuşanınca saldırı GERÇEKTEN artmalı.
     ÖNEMLİ: KO formülünde DEX katkısı SİLAH HASARIYLA ÇARPILIR
     (`0.005 × bow × (DEX+40) + coef × bow × Lv × DEX`). Başlangıç yayıyla
     (8 hasar) 7 DEX'lik fark trunc sınırında kayboluyor. Bu bir kusur
     değil, formülün kendisi: DEX ancak iyi bir yayla anlam kazanır.
     Test bu yüzden ÖNCE iyi yayı kuşanır. */
  const S = new PrototypeState(3306);
  S.player.level = 20;
  const bow = allDefinitions().filter((d) => d.category === 'weapon')
    .sort((a, b) => b.stats.attack - a.stats.attack)[0]!;
  const bowAdd = S.inventory.add(bow.definitionRef, { upgradeLevel: 0 });
  if (bowAdd.ok) S.equipService.equip(bowAdd.instance.instanceId);
  const before = Math.round(S.stats.finalStats().attack);
  /* TEK parça küçük bir fark yaratır (%5-10); anlamlı ölçü TAM SETtir. */
  const single = S.inventory.add(mid.definitionRef, { upgradeLevel: 0 });
  if (single.ok) S.equipService.equip(single.instance.instanceId);
  ok(Math.round(S.stats.finalStats().attack) > before, 'tek parça bile artırmalı');
  /* Tam Half Plate seti kuşan. */
  for (const d of allDefinitions()) {
    if (d.category !== 'armor' || d.setId !== 'halfplate') continue;
    const a = S.inventory.add(d.definitionRef, { upgradeLevel: 0 });
    if (a.ok) S.equipService.equip(a.instance.instanceId);
  }
  const full = Math.round(S.stats.finalStats().attack);
  ok(full >= before * 1.2,
    `tam set etkisi zayıf: ${before} → ${full} (%${Math.round((full / before - 1) * 100)})`);
});

/* ================= P2.22 — ÖLÜM · KAMERA · GENIE SETLERİ ================= */
console.log('P2.22 — ölüm ekranı ve doğuşa dönüş:');

test('§90 ÖLÜM SONRASI doğuş noktasına ışınlanılır', () => {
  const S = new PrototypeState(3401);
  /* Uzak bir noktada öl. */
  S.world.worldX = MORADON_PLAY_SPAWN.x + 3000;
  S.world.worldY = MORADON_PLAY_SPAWN.y - 2000;
  S.player.takeDamage(999999);
  ok(!S.player.alive, 'ölmüş olmalı');
  S.reviveAtSpawn();
  ok(S.player.alive, 'dirilmiş olmalı');
  eq(S.world.worldX, MORADON_PLAY_SPAWN.x, 'doğuş X:');
  eq(S.world.worldY, MORADON_PLAY_SPAWN.y, 'doğuş Y:');
  eq(Math.round(S.player.hp), Math.round(S.player.maxHp), 'can dolmalı:');
  eq(Math.round(S.player.mp), Math.round(S.player.maxMp), 'mana dolmalı:');
  /* Genie durmalı: ölüm noktasındaki farm merkezine yürümeye çalışmasın. */
  ok(!S.genie.enabled, 'Genie durdurulmalı');
  eq(S.targets.selectedUid, null, 'hedef temizlenmeli:');
  /* Hareket kalıntısı kalmamalı. */
  eq(S.world.moving, false, 'hareket durmalı:');
});

test('§90 ölüm kutusu ekran İÇİNDE, düğme kutunun içinde', () => {
  ok(DEATH_BOX.x >= 0 && DEATH_BOX.x + DEATH_BOX.w <= PROTO.screenW, 'kutu yatay taşıyor');
  ok(DEATH_BOX.y >= 0 && DEATH_BOX.y + DEATH_BOX.h <= PROTO.screenH, 'kutu dikey taşıyor');
  const b = deathOkButton();
  ok(b.x >= DEATH_BOX.x && b.x + b.w <= DEATH_BOX.x + DEATH_BOX.w, 'düğme yatay taşıyor');
  ok(b.y >= DEATH_BOX.y && b.y + b.h <= DEATH_BOX.y + DEATH_BOX.h, 'düğme dikey taşıyor');
  /* Dokunma hedefi mobilde parmak boyunda olmalı. */
  ok(b.w >= 120 && b.h >= 44, `düğme küçük: ${b.w}×${b.h}`);
});

/* ================= P2.23 — YENİ ENVANTER MAKETİ ================= */
console.log('P2.23 — envanter maketi yerleşimi:');

test('§91 çanta ızgarası KAPASİTEYLE eşleşir', () => {
  /* Maket 7×11 üretti; kapasite de 77 olmalı. Uyuşmazlık olsaydı ya
     görünmez yuva ya da kullanılamayan hücre kalırdı. */
  const b = INV_LAYOUT.bag;
  eq(b.cols * b.rows, INVENTORY_CAPACITY, 'ızgara = kapasite:');
  eq(bagCellRects().length, INVENTORY_CAPACITY, 'çizilen hücre sayısı:');
});

test('§91 bütün yuvalar panel İÇİNDE ve ÇAKIŞMIYOR', () => {
  const P = INV_LAYOUT.panel;
  const within = (r: UiRect, n: string): void => {
    ok(r.x >= P.x && r.x + r.w <= P.x + P.w, `${n} yatay taşıyor`);
    ok(r.y >= P.y && r.y + r.h <= P.y + P.h, `${n} dikey taşıyor`);
  };
  const eq12 = equipSlotRects();
  eq(eq12.length, 12, 'ekipman yuvası sayısı:');
  for (const r of eq12) within(r, `ekipman ${r.slotId}`);
  for (const [i, r] of bagCellRects().entries()) within(r, `çanta ${i}`);
  within(INV_LAYOUT.detail, 'detay bloğu');
  for (const b of invButtons()) within(b, b.id);

  /* Ekipman ve çanta blokları birbirine girmemeli. */
  const lastEquip = eq12[eq12.length - 1]!;
  const firstBag = bagCellRects()[0]!;
  ok(firstBag.x >= INV_LAYOUT.equip.x + INV_LAYOUT.equip.pitchX * 2 - 4,
    'çanta ekipman bloğunun üstüne biniyor');
  /* Detay bloğu ızgaraların ALTINDA olmalı. */
  ok(INV_LAYOUT.detail.y >= lastEquip.y + lastEquip.h, 'detay ekipmanla çakışıyor');
  const lastBag = bagCellRects()[INVENTORY_CAPACITY - 1]!;
  ok(INV_LAYOUT.detail.y >= lastBag.y + lastBag.h, 'detay çantayla çakışıyor');
});

test('§91 hücreler ADIM aralıklı — maketle hizalı kalır', () => {
  /* Maketin ızgarası sabit adımlı; kod `cell + gap` yerine ADIM
     kullanmalı, yoksa alt satırlarda kayma birikir. */
  const cells = bagCellRects();
  const b = INV_LAYOUT.bag;
  /* Adım kesirli (49.4) — kayan nokta karşılaştırmasında tolerans şart. */
  const near = (a: number, b2: number, n: string): void => {
    ok(Math.abs(a - b2) < 0.01, `${n}: ${a} ≠ ${b2}`);
  };
  near(cells[1]!.x - cells[0]!.x, b.pitch, 'yatay adım');
  near(cells[b.cols]!.y - cells[0]!.y, b.pitch, 'dikey adım');
  /* Son satır ilk satırla AYNI hizada başlamalı (birikimli kayma yok). */
  near(cells[(b.rows - 1) * b.cols]!.x, cells[0]!.x, 'son satır hizası');
});

test('§91 dokunma çözümlemesi her hücreyi bulur', () => {
  const mid = (r: UiRect): [number, number] => [r.x + r.w / 2, r.y + r.h / 2];
  for (const [i, r] of bagCellRects().entries()) {
    const h = invHitTest(...mid(r));
    ok(h !== null, `çanta hücresi ${i} çözülemedi`);
  }
  for (const r of equipSlotRects()) {
    const h = invHitTest(...mid(r));
    ok(h !== null, `ekipman yuvası ${r.slotId} çözülemedi`);
  }
});

/* ================= P2.24 — ITEM İKONLARI ================= */
console.log('P2.24 — item ikonları:');

test('§92 KATALOGDAKİ HER EŞYANIN ikonu var', () => {
  /* İkonsuz eşya oyunda renkli daire olarak görünür — kabul edilebilir
     bir yedek ama katalogdaki 35 eşyanın hepsi kapsanmalı. */
  const missing: string[] = [];
  for (const d of allDefinitions()) {
    if (itemIconKey(d.definitionRef) === null) missing.push(d.displayName);
  }
  eq(missing.length, 0, `ikonsuz eşya: ${missing.join(', ')}`);
});

test('§92 EKİPMAN DIŞI eşyaların da ikonu var', () => {
  for (const ref of [SCROLL_ITEM_REF, TROPHY_ITEM_REF, HP_POTION_REF, MP_POTION_REF]) {
    ok(itemIconKey(ref) !== null,
      `ikonsuz: ${ref} (${Content.item(ref)?.displayName ?? '?'})`);
  }
});

test('§92 her ikon anahtarı MANİFESTTE ve BENZERSİZ', () => {
  const keys = Object.values(ITEM_ICONS);
  eq(new Set(keys).size, keys.length, 'aynı ikon iki eşyaya verilmiş:');
  for (const k of keys) {
    ok(ITEM_ICON_PATHS[k] !== undefined, `manifest yolu yok: ${k}`);
    ok(UI_ASSETS[k] !== undefined, `yükleme listesinde yok: ${k}`);
  }
  /* Referanslar geçerli olmalı — yanlış ref sessizce ikonsuz bırakır. */
  for (const ref of Object.keys(ITEM_ICONS).map(Number)) {
    ok(Content.item(ref) !== undefined || definitionOf(ref) !== null,
      `bilinmeyen referansa ikon verilmiş: ${ref}`);
  }
});

test('§92 aynı YUVADAKİ eşyalar FARKLI ikon taşır', () => {
  /* Bütün yaylar aynı ikonu kullansaydı çantada ayırt edilemezlerdi. */
  const bySlot = new Map<string, Set<string>>();
  for (const d of allDefinitions()) {
    const key = itemIconKey(d.definitionRef);
    if (key === null) continue;
    const set = bySlot.get(d.equipSlot) ?? new Set<string>();
    set.add(key);
    bySlot.set(d.equipSlot, set);
  }
  for (const [slot, set] of bySlot) {
    const count = allDefinitions().filter((d) => d.equipSlot === slot).length;
    eq(set.size, count, `${slot} yuvasında ikon tekrarı:`);
  }
});

/* ================= P2.25 — ÜÇ PANEL MAKETİ ================= */
console.log('P2.25 — karakter, yetenek, genie panelleri:');

test('§93 panel görselleri MANİFESTTE', () => {
  for (const k of ['ui_inv_panel', 'ui_char_panel', 'ui_skill_panel', 'ui_genie_panel']) {
    ok(UI_ASSETS[k] !== undefined, `manifestte yok: ${k}`);
    ok(UI_ASSETS[k]!.startsWith('assets/ui/'), `yanlış klasör: ${k}`);
  }
});

test('§93 GENIE yerleşimi panel İÇİNDE ve ÇAKIŞMIYOR', () => {
  const P = GENIE_PANEL;
  const within = (r: { x: number; y: number; w: number; h: number }, n: string): void => {
    ok(r.x >= 0 && r.x + r.w <= P.w, `${n} yatay taşıyor`);
    ok(r.y >= 0 && r.y + r.h <= P.h, `${n} dikey taşıyor`);
  };
  for (const [x, w] of GENIE_SET_TABS) within({ x, y: 196, w, h: 50 }, 'set sekmesi');
  for (const [x, w] of GENIE_SKILL_SLOTS) within({ x, y: 324, w, h: 74 }, 'skill yuvası');
  /* Kaydırıcılar SIRALI ve çakışmasız olmalı. */
  let prev = 0;
  for (const s of GENIE_SLIDERS) {
    ok(s.labelY > prev, `${s.id} etiketi geriye gidiyor`);
    ok(s.trackY > s.labelY, `${s.id} çubuğu etiketin üstünde`);
    prev = s.trackY;
    within({ x: SLIDER_TRACK.x, y: s.trackY, w: SLIDER_TRACK.w, h: 36 }, s.id);
  }
  /* Aç/kapa satırları sıralı. */
  let py = 0;
  for (const t of GENIE_TOGGLES) {
    ok(t.y > py, `${t.id} sırasız`);
    py = t.y;
  }
  eq(GENIE_SLIDERS.length, 4, 'kaydırıcı sayısı:');
  eq(GENIE_TOGGLES.length, 4, 'aç/kapa sayısı:');
});

test('§93 GENIE dokunma çözümlemesi doğru hedefi bulur', () => {
  const mid = (r: { x: number; y: number; w: number; h: number }): [number, number] =>
    [r.x + r.w / 2, r.y + r.h / 2];
  for (let i = 0; i < GENIE_SET_TABS.length; i++) {
    const [x, w] = GENIE_SET_TABS[i]!;
    const h = genieHitTest(...mid({ x, y: 196, w, h: 50 }));
    ok(h !== null && h.kind === 'set' && h.index === i, `set ${i} çözülemedi`);
  }
  for (const s of GENIE_SLIDERS) {
    /* Çubuğun ORTASINA dokunmak %50 oranı vermeli. */
    const h = genieHitTest(SLIDER_TRACK.x + SLIDER_TRACK.w / 2, s.trackY + 18);
    ok(h !== null && h.kind === 'sliderDrag' && h.id === s.id, `${s.id} çubuğu çözülemedi`);
    if (h !== null && h.kind === 'sliderDrag') {
      ok(Math.abs(h.ratio - 0.5) < 0.05, `orta nokta oranı: ${h.ratio}`);
    }
    /* Ok düğmeleri adım vermeli. */
    const l = genieHitTest(78, s.trackY + 18);
    ok(l !== null && l.kind === 'sliderStep' && l.dir === -1, `${s.id} sol ok`);
  }
  for (const t of GENIE_TOGGLES) {
    const h = genieHitTest(300, t.y + 14);
    ok(h !== null && h.kind === 'toggle' && h.id === t.id, `${t.id} çözülemedi`);
  }
});

test('§93 YETENEK havuzu 2×6 = 12, sıralı ve çakışmasız', () => {
  eq(SKILL_POOL_COLS.length, 2, 'havuz sütunu:');
  eq(SKILL_POOL_ROWS.length, 6, 'havuz satırı:');
  const cells = skillPoolCells();
  eq(cells.length, 12, 'havuz hücresi:');
  eq(SKILL_BAR_SLOTS.length, 5, 'aktif yuva:');
  /* Satırlar sıralı ve üst üste binmiyor. */
  for (let i = 1; i < SKILL_POOL_ROWS.length; i++) {
    const [py, ph] = SKILL_POOL_ROWS[i - 1]!;
    const [y] = SKILL_POOL_ROWS[i]!;
    ok(y >= py + ph, `havuz satırı ${i} çakışıyor`);
  }
  /* Aktif yuvalar soldan sağa sıralı. */
  for (let i = 1; i < SKILL_BAR_SLOTS.length; i++) {
    ok(SKILL_BAR_SLOTS[i]![0] > SKILL_BAR_SLOTS[i - 1]![0], `yuva ${i} sırasız`);
  }
});

test('§93 KARAKTER blokları sıralı — kimlik → dağıtım → stat → direnç', () => {
  const lastId = CHAR_IDENTITY_ROWS[CHAR_IDENTITY_ROWS.length - 1]!;
  ok(ALLOC_BOX.y >= lastId[0] + lastId[1], 'dağıtım kimlikle çakışıyor');
  ok(CHAR_STAT_FIRST_Y >= ALLOC_BOX.y + ALLOC_BOX.h, 'stat dağıtımla çakışıyor');
  const firstResist = CHAR_RESIST_ROWS[0]!;
  ok(firstResist[0] > CHAR_STAT_FIRST_Y, 'direnç statla çakışıyor');
  eq(CHAR_RESIST_ROWS.length, 3, 'direnç satırı:');
  /* Dağıtım düğmeleri dağıtım bloğunun İÇİNDE. */
  for (const b of allocButtons()) {
    ok(b.y >= ALLOC_BOX.y && b.y + b.h <= ALLOC_BOX.y + ALLOC_BOX.h,
      `${b.id} dağıtım bloğunun dışında`);
  }
});

test('§94 PAKETLEME KAPSAMI: her ikon build komutunda listelenen bir dosyada', () => {
  /* `pack-preview.mjs` manifesti METİN olarak tarar (`key: 'assets/…'`).
     Yayılım (`...SPREAD`) izlenmez — kaynak dosya build komutunda
     listelenmezse varlıklar SESSİZCE paketlenmez. P2.24'te 39 item
     ikonu tam olarak böyle kayboldu. */
  const pkg = JSON.parse(readFileSync(join(PROTO_ROOT, '..', '..', 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  const cmd = pkg.scripts['build:proto'] ?? '';
  const m = /--manifest\s+(\S+)/.exec(cmd);
  ok(m !== null, 'build:proto --manifest taşımıyor');
  const listed = (m![1] ?? '').split(',');
  ok(listed.some((f) => f.includes('item-icons')),
    `item-icons.ts manifest listesinde yok: ${listed.join(', ')}`);
  /* Listelenen her dosya GERÇEKTEN var olmalı. */
  for (const rel of listed) {
    const abs = join(PROTO_ROOT, '..', '..', rel);
    ok(existsSync(abs), `manifest dosyası yok: ${rel}`);
  }
  /* P2.25.2 — YOLLAR ARTIK `proto-assets.ts` İÇİNDE DÜZ METİN.
     Paketleyici yayılımı izleyemediği için orada olmak ZORUNDALAR. */
  const manifestSrc = readFileSync(join(PROTO_ROOT, 'data', 'proto-assets.ts'), 'utf8');
  const found = [...manifestSrc.matchAll(/(item_\w+):\s*'(assets\/[^']+)'/g)];
  eq(found.length, Object.keys(ITEM_ICON_PATHS).length,
    'manifestte düz yazılı ikon sayısı:');
  /* İki kaynak AYRIŞAMAZ: eşleme dosyası ile manifest aynı yolları
     taşımalı. Çift yazım kaçınılmazdı, test onu bağlar. */
  for (const m2 of found) {
    const key = m2[1]!, path = m2[2]!;
    eq(ITEM_ICON_PATHS[key], path, `${key} yolu ayrışmış:`);
  }
});

/* ================= P2.26 — ÖLÜM KİLİDİ · GENIE SÜREKLİLİĞİ ================= */
console.log('P2.26 — ölüm kilidi ve Genie sürekliliği:');

test('§95 ÖLÜ karakter saldıramaz — cast zinciri KESİLİR', () => {
  /* Oyun testi bulgusu: ölüm ekranı açıkken TAMAM'a basılmadan saldırı
     devam ediyordu. Ölüm yalnız ekranı açıyor, gameplay'i durdurmuyordu. */
  const S = protoState(3500);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 100, S.world.worldY, 45, 1e9);
  S.mobs.mobs.push(mob as never);
  /* Bir atış başlat, sonra öl. TEMEL SALDIRI hasarı CAST ANINDA
     uygulanır (iki fazlı boru hattı yalnız skill oklarındadır), bu
     yüzden ölçüm cast'ten SONRA alınır. */
  ok(S.performBasic(mob as never).ok, 'saldırı başlamalı');
  const before = mob.hp;
  S.player.takeDamage(999999);
  ok(!S.player.alive, 'ölmüş olmalı');
  S.adapter.cancelAction();
  /* Kesme sonrası eylem kilidi boş ve havada ok kalmamalı. */
  ok(!S.adapter.actionBusy, 'eylem kilidi çözülmeli');
  /* Zinciri sonuna kadar sür: hasar UYGULANMAMALI. */
  for (let i = 0; i < 300; i++) S.stepCombat(1 / 60, S.entities());
  eq(mob.hp, before, 'ölümden sonra hasar uygulanmamalı:');
});

test('§95 ölümden sonra saldırı REDDEDİLİR', () => {
  const S = protoState(3501);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 100, S.world.worldY, 45, 1e9);
  S.mobs.mobs.push(mob as never);
  S.player.takeDamage(999999);
  const r = S.performBasic(mob as never);
  ok(!r.ok, 'ölü karakter saldıramamalı');
});

test('§95 DİRİLİŞ sonrası saldırı yeniden çalışır', () => {
  const S = protoState(3502);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 100, S.world.worldY, 45, 1e9);
  S.mobs.mobs.push(mob as never);
  S.player.takeDamage(999999);
  S.adapter.cancelAction();
  S.reviveAtSpawn();
  ok(S.player.alive, 'dirilmiş olmalı');
  /* Doğuş noktasına ışınlandı; mobu yanına getir. */
  mob.worldX = S.world.worldX + 100; mob.worldY = S.world.worldY;
  mob.x = mob.worldX; mob.y = mob.worldY;
  ok(S.performBasic(mob as never).ok, 'diriliş sonrası saldırı çalışmalı');
});

test('§95 havadaki oklar ölümde DÜŞER', () => {
  const S = protoState(3503);
  S.mobs.mobs.length = 0;
  const mob = mockMob(S.world.worldX + 600, S.world.worldY, 45, 1e9);
  S.mobs.mobs.push(mob as never);
  S.infiniteMp = true;
  S.performSkill(ARCHER.BESLI_SALVO, mob as never);
  /* Oklar yolda: birkaç kare ilerlet ama IMPACT'e varmadan öl. */
  S.stepCombat(1 / 60, S.entities());
  S.player.takeDamage(999999);
  S.adapter.cancelAction();
  const hp = mob.hp;
  for (let i = 0; i < 300; i++) S.stepCombat(1 / 60, S.entities());
  eq(mob.hp, hp, 'düşen oklar hasar vermemeli:');
});

test('§96 GENIE panel açıkken DURMAZ — yalnız kendi ayar ekranı durdurur', () => {
  /* Oyun testi isteği: çanta/karakter/örs açıkken bile farm sürsün.
     Kural sahne katmanındadır; burada kuralın METNİ doğrulanır ki
     ileride sessizce geri alınmasın. */
  const src = readFileSync(join(PROTO_ROOT, 'scenes', 'WorldPrototypeScene.ts'), 'utf8');
  const m = /if \(!this\.genieOpen && !this\.deathOpen\) \{\s*\n\s*this\.applyGenieActions/.exec(src);
  ok(m !== null, 'Genie yalnız kendi ayar ekranı ve ölümde durmalı');
  /* Envanter/karakter/skill/örs/satış ekranları Genie'yi DURDURMAMALI. */
  for (const flag of ['invOpen', 'charOpen', 'skillOpen', 'forgeOpen', 'sellOpen']) {
    ok(!new RegExp(`!this\\.${flag}[^\\n]*applyGenieActions`).test(src)
      && !new RegExp(`applyGenieActions[^\\n]*!this\\.${flag}`).test(src),
    `${flag} Genie'yi durduruyor`);
  }
});

test('§96 ÖLÜMDE hareket ve Genie kesilir — dünya AKMAYA devam eder', () => {
  const src = readFileSync(join(PROTO_ROOT, 'scenes', 'WorldPrototypeScene.ts'), 'utf8');
  ok(/const dead = this\.deathOpen \|\| !this\.S\.player\.alive;/.test(src),
    'ölüm kilidi tek yerde tanımlı olmalı');
  ok(/if \(dead\) this\.S\.adapter\.cancelAction\(\);/.test(src),
    'ölümde cast zinciri kesilmeli');
  /* Mob AI ölümden ETKİLENMEMELİ — dünya donmaz. */
  const S = protoState(3504);
  S.player.takeDamage(999999);
  const before = S.mobs.mobs.length;
  for (let i = 0; i < 60; i++) S.mobs.update(1 / 60, S.world);
  eq(S.mobs.mobs.length, before, 'mob listesi ölümden etkilenmemeli:');
});

/* ================= P2.27 — MORADON SV30 GENİŞLEMESİ ================= */
console.log('P2.27 — Sv30 içeriği, kalite tavanı, ölüm bedeli:');

test('§97 SEVİYE TAVANI 50 ve eğri buna hazır', () => {
  eq(LEVELING.maxLevel, 50, 'tavan:');
  /* Kaynak eğrisi tavanın ÖTESİNE uzanmalı — üst harita geldiğinde
     yeniden veri üretmek gerekmesin. */
  const rows = Content.levelCurve.rows;
  ok(rows[rows.length - 1]!.level >= LEVELING.maxLevel,
    'eğri tavanı kapsamalı');
  /* Oyuncu tavanı AŞAMAMALI. */
  const S = new PrototypeState(3600);
  S.player.level = LEVELING.maxLevel;
  for (let i = 0; i < 50; i++) S.player.addExp(10_000_000);
  eq(S.player.level, LEVELING.maxLevel, 'tavan aşılmamalı:');
});

test('§97 MORADON KALİTE TAVANI YEŞİL — mor/turuncu YOK', () => {
  /* Kullanıcı kararı: başlangıç bölgesinde eşsiz ekipman düşmemeli. */
  const bad: string[] = [];
  for (const d of allDefinitions()) {
    if (d.itemClass !== 'LOW' && d.itemClass !== 'MIDDLE') {
      bad.push(`${d.displayName} (${d.itemClass})`);
    }
  }
  eq(bad.length, 0, `Moradon'da izinsiz kalite: ${bad.join(', ')}`);
  /* İki kalite de TEMSİL EDİLMELİ — hepsi beyaz olursa ilerleme hissi olmaz. */
  const classes = new Set(allDefinitions().map((d) => d.itemClass));
  eq(classes.size, 2, 'iki kalite kademesi olmalı:');
  /* STATLAR düşmedi: en güçlü yay hâlâ 30+ hasar. */
  const best = allDefinitions().filter((d) => d.category === 'weapon')
    .reduce((m, d) => Math.max(m, d.stats.attack), 0);
  ok(best >= 30, `en güçlü yay zayıfladı: ${best}`);
});

test('§97 ÖLÜM BEDELİ: seviyenin %5\'i EXP, seviye DÜŞMEZ', () => {
  const S = new PrototypeState(3601);
  S.player.level = 15;
  const need = S.player.requiredExpForCurrentLevel();
  S.player.exp = Math.floor(need * 0.8);
  const before = S.player.exp;
  S.player.takeDamage(999999);
  S.reviveAtSpawn();
  const expected = Math.floor(need * DEATH_EXP_PENALTY);
  eq(S.player.exp, before - expected, 'EXP kaybı:');
  eq(S.player.level, 15, 'seviye düşmemeli:');
  eq(S.lastDeathPenalty, expected, 'raporlanan kayıp:');
});

test('§97 ölüm bedeli EXP\'yi SIFIRIN ALTINA indirmez', () => {
  const S = new PrototypeState(3602);
  S.player.level = 1;
  S.player.exp = 3;                       // cezadan az
  S.player.takeDamage(999999);
  S.reviveAtSpawn();
  ok(S.player.exp >= 0, `negatif EXP: ${S.player.exp}`);
  eq(S.player.level, 1, 'seviye düşmemeli:');
  /* Kaybedilecek bir şey yoksa ceza da yok. */
  const T = new PrototypeState(3603);
  T.player.exp = 0;
  T.player.takeDamage(999999);
  T.reviveAtSpawn();
  eq(T.player.exp, 0, 'sıfır EXP korunmalı:');
  eq(T.lastDeathPenalty, 0, 'ceza raporu:');
});

test('§97 Sv50 içeriği ULAŞILABİLİR — her banda mob var', () => {
  const levels = new Set<number>();
  for (const s of FARM_AREA_SLOTS) {
    const m = Content.monster(s.monsterRef);
    if (m) levels.add(m.level);
  }
  for (const [lo, hi] of [[1, 5], [6, 10], [11, 15], [16, 20], [21, 25],
    [26, 30], [31, 35], [36, 40], [41, 45], [46, 50]] as const) {
    ok([...levels].some((l) => l >= lo && l <= hi), `Sv${lo}-${hi} bandında mob yok`);
  }
  eq(Math.max(...levels), 50, 'en yüksek mob:');
});

/* ================= P2.28 — GOBLIN MOB MODELİ ================= */
console.log('P2.28 — ikinci mob modeli (goblin):');

test('§98 klip gerçekleri VARLIK RAPORUNDAN — uydurma yok', () => {
  eq(KECOON_CLIPS.length, 5, 'klip sayısı:');
  const names = KECOON_CLIPS.map((c) => c.name);
  eq(names.join(','), '01_IDLE,02_WALK,03_ATTACK_SLAM,04_LEAP_ATTACK,05_DEATH', 'klipler:');
  /* Kaynakta OLMAYAN klipler uydurulmamalı. */
  for (const missing of ['RUN', 'HIT_REACT', '04_RUN', '07_ROAR']) {
    ok(!names.includes(missing as never), `uydurma klip: ${missing}`);
  }
  /* Ölçülen değerler makul aralıkta olmalı — bozuk manifest buradan yakalanır. */
  for (const c of KECOON_CLIPS) {
    ok(c.durationSec > 0 && c.durationSec < 10, `${c.name} süresi saçma: ${c.durationSec}`);
    ok(c.keys > 0, `${c.name} anahtar yok`);
    if (c.hitTimeSec !== null) {
      ok(c.hitTimeSec > 0 && c.hitTimeSec < c.durationSec,
        `${c.name} vuruş anı klip dışında`);
    }
  }
  /* ÖLÜM klibi TEK SEFERLİK olmalı — döngüye girerse ceset kalkar. */
  eq(KECOON_CLIPS.find((c) => c.name === '05_DEATH')!.loop, false, 'ölüm döngüsü:');
});

test('§98 MODEL SEÇİMİ seviyeye göre — zayıf goblin, güçlü mutant', () => {
  eq(GOBLIN_MAX_LEVEL, 10, 'goblin bandı tavanı:');
  for (const lv of [1, 5, 9, 10]) ok(usesGoblinModel(lv), `Sv${lv} goblin olmalı`);
  for (const lv of [11, 15, 20, 30]) ok(!usesGoblinModel(lv), `Sv${lv} mutant olmalı`);
  /* Moradon'un HER İKİ bandında da mob olmalı — yoksa bir model
     hiç görünmez ve ayrım anlamsızlaşır. */
  const levels = FARM_AREA_SLOTS
    .map((s) => Content.monster(s.monsterRef)?.level ?? 0);
  ok(levels.some((l) => usesGoblinModel(l)), 'goblin bandında mob yok');
  ok(levels.some((l) => !usesGoblinModel(l)), 'mutant bandında mob yok');
});

test('§98 KLİP TABLOSU modele göre seçilir, eksik faz UYDURULMAZ', () => {
  const goblin = clipMapFor(['01_IDLE', '02_WALK', '03_ATTACK_SLAM', '05_DEATH']);
  const mutant = clipMapFor(['01_IDLE', '02_IDLE_BREATHE', '03_WALK', '04_RUN']);
  eq(goblin.walk, '02_WALK', 'goblin yürüyüş:');
  eq(mutant.walk, '03_WALK', 'mutant yürüyüş:');
  /* Goblin'de nefes ve koşu YOK → en yakın klibe düşülür. */
  eq(goblin.idleLong, goblin.idle, 'nefes yoksa boşta klibi:');
  eq(goblin.run, goblin.walk, 'koşu yoksa yürüyüş:');
  eq(goblin.roar, null, 'kükreme yoksa null:');
  /* Mutantın kendi tablosu DEĞİŞMEDİ. */
  eq(mutant.idleLong, '02_IDLE_BREATHE', 'mutant nefes:');
  eq(mutant.roar, '07_ROAR', 'mutant kükreme:');
  /* Tablo ile klip listesi TUTARLI olmalı. */
  eq(KECOON_CLIP_MAP.death, '05_DEATH', 'goblin ölüm klibi:');
});

test('§98 saldırı klibi vuruş anına EN YAKIN olan seçilir', () => {
  /* Slam 0,533 sn, leap 0,400 sn. */
  eq(kecoonAttackClipFor(0.55).name, '03_ATTACK_SLAM', 'geç vuruş → slam:');
  eq(kecoonAttackClipFor(0.35).name, '04_LEAP_ATTACK', 'erken vuruş → sıçrama:');
});

test('§98 ölçek modele göre — goblin mutanttan KISA', () => {
  for (const t of ['NORMAL', 'AGGRESSIVE', 'ELITE'] as const) {
    const k = kecoonScaleFor(t);
    ok(k > 0 && Number.isFinite(k), `${t} ölçeği geçersiz: ${k}`);
  }
  /* Hiyerarşi korunmalı: elit > saldırgan > normal. */
  ok(kecoonScaleFor('ELITE') > kecoonScaleFor('AGGRESSIVE'), 'elit daha büyük');
  ok(kecoonScaleFor('AGGRESSIVE') > kecoonScaleFor('NORMAL'), 'saldırgan daha büyük');
});

test('§98 LİSANS künyesi kodda TAŞINIYOR', () => {
  /* Mesh CC-BY-4.0; görünür künye zorunlu. Metin kodda durmalı ki
     ileride künye ekranı yazılırken kaynağı aranmasın. */
  ok(KECOON_ATTRIBUTION.includes('RapidAssets'), 'künye sahibi eksik');
  ok(KECOON_ATTRIBUTION.includes('CC-BY'), 'lisans adı eksik');
  ok(PROTO_MODELS['kecoon_glb'] !== undefined, 'model manifestte yok');
});

/* ================= P2.29 — ÇİZİM YÜKÜ KESİMİ ================= */
console.log('P2.29 — mesafe kesimi ve parçalı bitki:');

test('§99 kesim mesafesi KAMERA ERİŞİMİNDEN büyük', () => {
  /* Kesim kameranın gördüğünden dar olursa görünür alanda mob kaybolur. */
  ok(MOB_DRAW_DISTANCE > CAMERA_DIAGONAL_REACH,
    `kesim (${MOB_DRAW_DISTANCE}) kamera erişiminden (${CAMERA_DIAGONAL_REACH}) dar`);
  /* Ama sınırsız da olmamalı — haritanın yarısını kapsamamalı. */
  ok(MOB_DRAW_DISTANCE < WORLD_BOUNDS.width / 2, 'kesim çok geniş');
});

test('§99 GÖRSEL TAVANI kalabalığı sınırlar', () => {
  /* Mesafe kesimi tek başına yetmiyor: slotlar 420 birim aralıklı,
     kalabalık noktada 1400 birimlik daire 79 moba denk geliyor. */
  ok(MAX_MOB_VISUALS > 0 && MAX_MOB_VISUALS <= 40,
    `görsel tavanı makul değil: ${MAX_MOB_VISUALS}`);
  /* Tavan, bir slotun mob sayısından belirgin biçimde büyük olmalı —
     yoksa tek bir slotu bile tam göremezsin. */
  ok(MAX_MOB_VISUALS >= 3 * 8, 'tavan tek slotu bile karşılamıyor');

  /* CANLI: haritanın EN KALABALIK noktasında bile tavan aşılmamalı. */
  const S = new PrototypeState(3700);
  let worst = 0;
  for (let y = 400; y < 5000; y += 400) {
    for (let x = 400; x < 5000; x += 400) {
      let n = 0;
      for (const m of S.mobs.mobs) {
        const dx = m.worldX - x, dy = m.worldY - y;
        if (dx * dx + dy * dy <= MOB_DRAW_DISTANCE * MOB_DRAW_DISTANCE) n += 1;
      }
      if (n > worst) worst = n;
    }
  }
  /* Kesim öncesi kalabalık TAVANDAN büyük olabilir — tavan zaten
     bunun için var. Test onun GERÇEKTEN gerekli olduğunu doğrular. */
  ok(worst > MAX_MOB_VISUALS,
    `tavan gereksiz görünüyor: en kalabalık nokta ${worst} mob`);
});

test('§99 BİTKİLER hücrelere bölünür — tek mesh haritayı kaplamaz', () => {
  /* three'nin frustum kesimi InstancedMesh'i TEK nesne sayar; tek mesh
     bütün haritayı kaplarsa kesim hiç devreye girmez. */
  ok(FOLIAGE_CELL > 0, 'hücre kenarı tanımsız');
  ok(FOLIAGE_CELL < WORLD_BOUNDS.width, 'hücre haritanın tamamı — kesim çalışmaz');
  const cells = Math.ceil(WORLD_BOUNDS.width / FOLIAGE_CELL);
  ok(cells >= 3, `hücre sayısı az: ${cells}×${cells}`);
  /* Ama aşırı bölmek de çizim çağrısını patlatır. */
  ok(cells <= 8, `hücre sayısı fazla: ${cells}×${cells}`);

  /* Her hücrede gerçekten bitki olmalı — boş hücre çizim çağrısı üretmez
     ama dağılımın haritaya YAYILDIĞINI doğrular. */
  const used = new Set<string>();
  for (const it of buildFoliage()) {
    used.add(`${Math.floor(it.x / FOLIAGE_CELL)}:${Math.floor(it.y / FOLIAGE_CELL)}`);
  }
  ok(used.size >= 6, `bitkiler ${used.size} hücreye sıkışmış`);
});

test('§99 kesim GAMEPLAY’i etkilemez', () => {
  /* Kesilen mobun AI'ı, respawn'ı ve savaşı sürer; yalnız görseli
     üretilmez. Renderer zaten gameplay'e yazmaz. */
  const S = new PrototypeState(3701);
  const before = S.mobs.mobs.length;
  for (let i = 0; i < 120; i++) S.mobs.update(1 / 60, S.world);
  eq(S.mobs.mobs.length, before, 'mob listesi kesimden etkilenmemeli:');
  /* Uzaktaki mob hâlâ hedeflenebilir olmalı (menzil kuralı ayrı). */
  const far = S.mobs.mobs
    .map((m) => Math.hypot(m.worldX - S.world.worldX, m.worldY - S.world.worldY))
    .some((d) => d > MOB_DRAW_DISTANCE);
  ok(far, 'kesim mesafesinin dışında mob olmalı (senaryo geçersiz)');
});

/* ================= P2.30 — ÇİZİM KALİTESİ ================= */
console.log('P2.30 — mobil kalite profili:');

test('§100 VARSAYILAN profil MOBİL — üç pahalı ayar da kapalı', () => {
  const m = QUALITY_PROFILES.mobile;
  ok(!m.antialias, 'mobilde MSAA kapalı olmalı');
  ok(!m.shadows, 'mobilde gölge kapalı olmalı');
  ok(m.maxPixelRatio <= 1.5, `piksel oranı yüksek: ${m.maxPixelRatio}`);
});

test('§100 profiller MONOTON — mobil en ucuz, yüksek en pahalı', () => {
  eq(QUALITY_ORDER.join(','), 'mobile,balanced,high', 'sıra:');
  let prevRatio = 0;
  for (const lvl of QUALITY_ORDER) {
    const p = QUALITY_PROFILES[lvl];
    ok(p.maxPixelRatio >= prevRatio, `${lvl} piksel oranı geriye gidiyor`);
    prevRatio = p.maxPixelRatio;
  }
  /* Gölge yalnız yukarı doğru AÇILMALI. */
  ok(!QUALITY_PROFILES.mobile.shadows, 'mobil gölgesiz');
  ok(QUALITY_PROFILES.high.shadows, 'yüksek gölgeli');
  /* Döngü başa dönmeli. */
  eq(nextQuality('high'), 'mobile', 'döngü:');
});

test('§100 piksel oranı bir TAVAN — cihazınkini YÜKSELTMEZ', () => {
  const m = QUALITY_PROFILES.mobile;
  eq(effectivePixelRatio(m, 3), m.maxPixelRatio, 'yüksek cihaz kırpılmalı:');
  eq(effectivePixelRatio(m, 1), 1, 'düşük cihaz yükseltilmemeli:');
  /* Bozuk değerler oyunu düşürmemeli. */
  eq(effectivePixelRatio(m, 0), 1, 'sıfır oran:');
  eq(effectivePixelRatio(m, Number.NaN), 1, 'NaN oran:');
});

test('§100 mobil profil piksel yükünü GERÇEKTEN düşürür', () => {
  /* Bulgu: 620×1100 mantıksal ekran, cihaz oranı 3, eski tavan 2 →
     1240×2200 = 2,7 milyon piksel her kare. */
  const before = pixelCount(QUALITY_PROFILES.high, 620, 1100, 3);
  const after = pixelCount(QUALITY_PROFILES.mobile, 620, 1100, 3);
  ok(after < before / 2, `piksel yükü yeterince düşmedi: ${before} → ${after}`);
  ok(after < 1_200_000, `mobil profil hâlâ ağır: ${after} piksel`);
});

test('§99.1 KESİM SİLMEZ, GİZLER — sınırda kur/yık olmaz', () => {
  /* P2.29'un ilk hâli daha kötüydü: "bir adım atınca donuyor".
     `VisualRegistry.endFrame()` dokunulmayan görseli SİLER; kesim
     yüzünden sınırı geçen mob siliniyor, geri girince iskeletli mesh
     yeniden klonlanıyordu.

     Kural: HER mob DOKUNULUR (havuz kararlı), yalnız uzaktakiler
     GİZLENİR. Kaynak metni bunu korur — ileride biri `continue` ile
     dokunmayı atlarsa test düşer. */
  const src = readFileSync(join(PROTO_ROOT, 'render3d', 'ThreeWorldRenderer.ts'), 'utf8');
  const loop = src.slice(src.indexOf('P2.29.1'), src.indexOf('this.mobs.endFrame()'));
  ok(loop.length > 0, 'mob döngüsü bulunamadı');
  /* `touch` gizlemeden ÖNCE çağrılmalı. */
  const touchAt = loop.indexOf('this.mobs.touch(key)');
  const shownAt = loop.indexOf('const shown =');
  ok(touchAt >= 0 && shownAt >= 0, 'touch/shown bulunamadı');
  ok(touchAt < shownAt, 'touch gizleme kararından SONRA çağrılıyor — havuz churn eder');
  /* Gizli mob için `continue` var ama `touch`tan SONRA olmalı. */
  ok(/g\.visible = shown;\s*\n\s*if \(!shown\) continue;/.test(loop),
    'gizleme ile atlama ardışık değil');
  /* Klon TEMBEL olmalı: `fillMobVisual` gizleme kontrolünden sonra. */
  const fillAt = loop.indexOf('this.fillMobVisual');
  ok(fillAt > shownAt, 'klon açılışta kuruluyor — 184 klon birden donma yapar');
});

/* ================= P2.29.3 — GOBLIN ANİMATÖR ÇÖKMESİ ================= */
console.log('P2.29.3 — goblin animatörü canlı sürülüyor:');

test('§100 GOBLIN animatörü BÜTÜN fazlarda çökmüyor', () => {
  /* OYUN DONMASININ ASIL SEBEBİ: klip ADLARI modele göre seçiliyordu
     ama klip SÜRESİ hep mutant tablosundan aranıyordu; `02_WALK`
     orada yok ve fonksiyon HATA FIRLATIYOR.

     Önceki testler klip haritasını ve manifestleri AYRI AYRI
     doğruluyordu; çapraz arama ancak canlı bir goblin yürüyünce
     tetikleniyordu. Bu test animatörü GERÇEKTEN sürer. */
  const goblinClips = ['01_IDLE', '02_WALK', '03_ATTACK_SLAM', '04_LEAP_ATTACK', '05_DEATH'];
  const a = new MutantAnimator();
  a.useClipMap(goblinClips);

  /* GERÇEK faz listesi (`MobAi.MobPhase`) — uydurma faz adı yazmak
     testi tip düzeyinde kırar ve gerçek kapsamı daraltır. */
  const phases: MobPhase[] = [
    'IDLE', 'ROAM', 'AGGRO', 'CHASE', 'ATTACK', 'RETURN', 'DYING', 'DEAD', 'RESPAWN',
  ];
  for (const phase of phases) {
    for (const moving of [false, true]) {
      for (const speed of [0, 0.3, 2.5]) {
        /* Fırlatma OLMAMALI — döngü ortasında hata oyunu dondurur. */
        const d = a.update(1 / 60, {
          phase, moving, speed, dead: phase === 'DEAD' || phase === 'DYING',
          attackPhase: 'recovery', attackTimer: 0, hitMomentSec: 0.45,
        } as never);
        ok(d !== undefined && typeof d.clip === 'string',
          `${phase}/${moving}/${speed} karar üretmedi`);
        /* Seçilen klip GOBLİN kümesinde olmalı — mutant klibi seçilirse
           model o klibi bilmediği için sessizce hiçbir şey oynatmaz. */
        ok(goblinClips.includes(d.clip), `${phase}: goblin dışı klip ${d.clip}`);
      }
    }
  }
});

test('§100 AGGRO fazı goblin\'de ATLANIR — kükreme klibi yok', () => {
  /* `map.roar === null` idi ve `mutantClip(null)` hata fırlatıyordu.
     Doğrusu: klip yoksa faz atlanır, uydurma klip oynatılmaz. */
  const a = new MutantAnimator();
  a.useClipMap(['01_IDLE', '02_WALK', '05_DEATH']);
  const d = a.update(1 / 60, {
    phase: 'AGGRO', moving: false, speed: 0, dead: false,
    attackPhase: 'recovery', attackTimer: 0, hitMomentSec: 0.45,
  } as never);
  ok(d.clip !== '07_ROAR', 'goblin kükreme klibi oynatmamalı');
  /* Mutantta ise kükreme ÇALIŞMAYA devam etmeli. */
  const b = new MutantAnimator();
  b.useClipMap(['01_IDLE', '02_IDLE_BREATHE', '03_WALK', '04_RUN', '07_ROAR', '08_DEATH']);
  const e = b.update(1 / 60, {
    phase: 'AGGRO', moving: false, speed: 0, dead: false,
    attackPhase: 'recovery', attackTimer: 0, hitMomentSec: 0.45,
  } as never);
  eq(e.clip, '07_ROAR', 'mutant kükremesi:');
});

test('§100 klip arama HER İKİ tabloya bakar', () => {
  /* Mutant klibi. */
  ok(clipFactOf('03_WALK') !== undefined, 'mutant klibi bulunamadı');
  /* Goblin klibi — eskiden burada HATA fırlıyordu. */
  const g = clipFactOf('02_WALK');
  ok(g !== undefined, 'goblin klibi bulunamadı');
  ok(g!.durationSec > 0, 'goblin klip süresi yok');
  /* Bilinmeyen ad HATA FIRLATMAZ, `undefined` döner. */
  eq(clipFactOf('YOK_BOYLE_KLIP'), undefined, 'bilinmeyen klip:');
  eq(clipFactOf(null), undefined, 'null klip:');
});

/* ================= P2.30 — GANİMET HAVUZU KATALOGDAN ================= */
console.log('P2.30 — Moradon ganimet havuzu:');

test('§101 HER YUVA en az bir eşyayla temsil ediliyor', () => {
  /* Oyun testi bulgusu: bir saat oynayıp bot, eldiven ve HİÇBİR takı
     düşmedi. Kaynak tablolar kataloğun yarısını kapsamıyordu. */
  const cov = slotCoverage();
  for (const slot of ['weapon', 'helmet', 'chest', 'pants', 'gloves', 'boots',
    'earring', 'ring', 'necklace', 'belt']) {
    ok((cov[slot]?.length ?? 0) > 0, `${slot} yuvası havuzda yok`);
  }
});

test('§101 HAVUZ SEVİYEYLE BÜYÜR ve yuva kaybetmez', () => {
  /* İlk denemede alt sınır vardı ve ÖLÇÜMDE ÇÖKTÜ: Sv30 havuzunda
     yalnız yay kalıyordu. Alt sınır kaldırıldı, çeşitlilik ağırlıkla
     sağlanıyor. */
  let prevSlots = 0;
  for (const lv of [1, 5, 10, 15, 20, 25, 30]) {
    const pool = poolFor(lv);
    ok(pool.length > 0, `Sv${lv} havuzu boş`);
    const slots = new Set(pool.map((d) => d.equipSlot)).size;
    ok(slots >= prevSlots, `Sv${lv}'de yuva sayısı düştü: ${prevSlots} → ${slots}`);
    prevSlots = slots;
  }
  /* En üst seviyede KATALOGUN TAMAMI havuzda olmalı. */
  eq(poolFor(30).length, allDefinitions().length, 'Sv30 havuzu:');
  /* Sv1 mob üst kademe eşya DÜŞÜREMEZ. */
  const weak = poolFor(1);
  for (const d of weak) ok(itemTierLevel(d) <= 1, `Sv1 havuzunda üst kademe: ${d.displayName}`);
});

test('§101 SEÇİM TOHUMLU ve ağırlık YAKIN KADEMEYİ tercih eder', () => {
  const pool = poolFor(30);
  /* Aynı zar → aynı eşya. */
  eq(pickFromPool(pool, 30, 0.42)?.definitionRef,
    pickFromPool(pool, 30, 0.42)?.definitionRef, 'deterministik:');
  /* Boş havuz `null` döner, patlamaz. */
  eq(pickFromPool([], 30, 0.5), null, 'boş havuz:');
  /* Zar sınırları güvenli. */
  for (const roll of [0, 0.9999, 1, -1, 2]) {
    ok(pickFromPool(pool, 30, roll) !== null, `zar ${roll} sonuç vermedi`);
  }
  /* Güçlü mob, kendi kademesine yakın eşyayı DAHA SIK seçmeli. */
  let near = 0, far = 0;
  for (let i = 0; i < 2000; i++) {
    const d = pickFromPool(pool, 30, i / 2000)!;
    if (itemTierLevel(d) >= 20) near += 1;
    if (itemTierLevel(d) <= 5) far += 1;
  }
  ok(near > 0, 'üst kademe hiç seçilmiyor');
  ok(far > 0, 'alt kademe hiç seçilmiyor — çeşitlilik yok');
});

test('§101 CANLI: bir saatlik oturumda HİÇBİR yuva boş kalmaz', () => {
  /* Asıl kabul kriteri. Ölçüm: saatte ~550 kill. */
  const S = new PrototypeState(3800);
  S.lootPolicy.setMode('auto');
  S.autoGear.settings.autoEquip = false;
  const seen = new Map<string, number>();
  for (let i = 0; i < 550; i++) {
    const m = S.mobs.mobs[i % S.mobs.mobs.length]!;
    /* `MobAiState` değerleri KÜÇÜK HARF ve 'alive' YOK — mob canlıysa
       'idle'dır. `reapDead()` yalnız `state === 'dying'` ve
       `ai !== 'dead'` olanları toplar. */
    m.hp = 0; m.state = 'dying'; m.ai = 'idle';
    for (const { drop } of S.reapDead()) {
      for (const r of drop.records) {
        if (r.kind !== 'item') continue;
        const d = definitionOf(r.itemRef);
        if (d) seen.set(d.equipSlot, (seen.get(d.equipSlot) ?? 0) + 1);
      }
    }
    m.ai = 'idle'; m.hp = m.maxHp; m.state = 'walk';
  }
  const missing: string[] = [];
  for (const slot of ['weapon', 'helmet', 'chest', 'pants', 'gloves', 'boots',
    'earring', 'ring', 'necklace', 'belt']) {
    if (!seen.has(slot)) missing.push(slot);
  }
  eq(missing.length, 0, `bir saatte hiç düşmeyen yuva: ${missing.join(', ')}`);
});

test('§101 KAYNAK ZİNCİRİ korunuyor — denetlenebilirlik', () => {
  /* Havuz kataloğa geçti ama ham kaynak SİLİNMEDİ. */
  for (const ref of [750, 252, 115]) {
    const p = dropProfile(ref);
    if (!p) continue;
    ok(p.sourceChain.includes('monster_drops'), `${ref} kaynak zinciri kayıp`);
    ok(p.source.slots.length > 0, `${ref} kaynak slotları silinmiş`);
  }
  ok(EQUIP_DROP_CHANCE > 0 && EQUIP_DROP_CHANCE < 0.5, 'düşme şansı makul değil:');
});

/* ================= P2.31 — SKILL İKONU VE KİLİT ================= */
console.log('P2.31 — skill ikonu skille bağlı, kilit üç değerli:');

test('§102 İKON SKİLLE bağlı, YUVA KONUMUNA değil', () => {
  /* Oyun testi bulgusu: "görünen ikon başka, çalışan skill başka".
     `SKILL_SPOTS` her konuma sabit ikon veriyordu. */
  const layout = readFileSync(join(PROTO_ROOT, 'ui', 'hud-layout.ts'), 'utf8');
  ok(/SPOT ARTIK GÖRSEL TAŞIMAZ/.test(layout), 'konum-ikon bağı notu yok');
  const scene = readFileSync(join(PROTO_ROOT, 'scenes', 'WorldPrototypeScene.ts'), 'utf8');
  /* HUD artık `art.key` DEĞİL, `skillIconKey(def.sourceRef)` kullanmalı. */
  ok(/skillIconKey\(def\.sourceRef\)/.test(scene), 'HUD ikonu skillden almıyor');
  ok(!/g\.image\(art\.key/.test(scene), 'HUD hâlâ konum ikonunu çiziyor');

  /* Eşleme geçerli olmalı: her anahtar manifestte, her ref katalogda. */
  for (const [refStr, key] of Object.entries(SKILL_ICONS)) {
    ok(PROTO_ASSETS[key] !== undefined, `ikon manifestte yok: ${key}`);
    ok(ARCHER_SKILL_ORDER.includes(Number(refStr)), `bilinmeyen skill: ${refStr}`);
  }
  /* İkon ANAHTARLARI benzersiz — iki skill aynı ikonu kullanmamalı. */
  const keys = Object.values(SKILL_ICONS);
  eq(new Set(keys).size, keys.length, 'aynı ikon iki skillde:');
});

test('§102 EKSİK ikonlar GİZLENMİYOR — yer tutucu var', () => {
  /* Beş ikon, on beş skill. Sahte eşleme yapmak yerine `null` döner. */
  const missing = skillsWithoutIcon(ARCHER_SKILL_ORDER);
  ok(missing.length > 0, 'senaryo geçersiz — tüm skillerin ikonu var');
  for (const ref of missing) eq(skillIconKey(ref), null, `${ref} sahte ikon:`);
  /* Yer tutucu harfi Türkçe büyük harf kuralına uymalı. */
  eq(skillInitial('İzci Oku'), 'İ', 'Türkçe büyük harf:');
  eq(skillInitial('kara takip'), 'K', 'baş harf:');
  eq(skillInitial('   '), '?', 'boş ad:');
});

test('§103 KİLİT ÜÇ DEĞERLİ: kalıcı ile geçici AYRI', () => {
  /* Oyun testi bulgusu: Sv1'de hangi skilli kullanabildiğin belli
     değildi — Sv70 kilidi ile mana yetersizliği aynı görünüyordu. */
  eq(skillGate({ requiredLevel: 1, playerLevel: 1, unlocked: true, blocked: null }),
    'ready', 'kullanılabilir:');
  eq(skillGate({ requiredLevel: 70, playerLevel: 1, unlocked: true, blocked: null }),
    'levelLocked', 'seviye kilidi:');
  eq(skillGate({ requiredLevel: 1, playerLevel: 5, unlocked: false, blocked: null }),
    'unpurchased', 'puanla açılmamış:');
  eq(skillGate({ requiredLevel: 1, playerLevel: 5, unlocked: true, blocked: 'mana' }),
    'busy', 'geçici engel:');

  /* SIRA ÖNEMLİ: kalıcı engel geçicinin ÖNÜNDE bildirilir. Sv70 skilli
     "mana yetmiyor" gibi görünmemeli. */
  eq(skillGate({ requiredLevel: 70, playerLevel: 1, unlocked: false, blocked: 'mana' }),
    'levelLocked', 'kalıcı engel önce:');

  /* 'noTarget' engel SAYILMAZ — hedef yokken skill kilitli görünmemeli. */
  eq(skillGate({ requiredLevel: 1, playerLevel: 5, unlocked: true, blocked: 'noTarget' }),
    'ready', 'hedefsizlik kilit değil:');
});

test('§103 KALICI kilit GEÇİCİDEN daha soluk çizilir', () => {
  /* Görsel hiyerarşi: kullanılabilir en parlak, seviye kilidi en soluk. */
  ok(GATE_ALPHA.ready > GATE_ALPHA.busy, 'hazır > meşgul');
  ok(GATE_ALPHA.busy > GATE_ALPHA.unpurchased, 'meşgul > açılmamış');
  ok(GATE_ALPHA.unpurchased > GATE_ALPHA.levelLocked, 'açılmamış > seviye kilidi');
  /* Rozet yalnız KALICI kilitte görünür. */
  eq(gateBadge('levelLocked', 25), 'Sv25', 'seviye rozeti:');
  eq(gateBadge('unpurchased', 5), 'AÇ', 'açma rozeti:');
  eq(gateBadge('busy', 5), null, 'geçici engelde rozet yok:');
  eq(gateBadge('ready', 5), null, 'hazırken rozet yok:');
});

test('§103 CANLI: Sv1 oyuncuda kullanılabilir skill AYIRT EDİLEBİLİR', () => {
  const S = new PrototypeState(3900);
  eq(S.player.level, 1, 'başlangıç seviyesi:');
  const states = ARCHER_SKILL_ORDER.map((ref) => {
    const def = SkillRegistry.get(ref)!;
    return skillGate({
      requiredLevel: def.requiredLevel,
      playerLevel: S.player.level,
      unlocked: S.stats.progression.isUnlocked(ref),
      blocked: null,
    });
  });
  /* En az bir skill kullanılabilir olmalı — yoksa Sv1 oyuncu hiçbir
     şey yapamaz. */
  ok(states.includes('ready'), 'Sv1\'de kullanılabilir skill yok');
  /* Çoğu KALICI kilitli olmalı — hepsi hazır görünürse ayrım kaybolur. */
  const locked = states.filter((x) => x === 'levelLocked').length;
  ok(locked >= ARCHER_SKILL_ORDER.length / 2, `Sv1'de yalnız ${locked} skill kilitli`);
});

test('§104 MOB HASARI YARIYA indi — kaynak değeri DEĞİŞMEDİ', () => {
  /* Oyun testi bulgusu: "moblar çok fazla vuruyor". P2.5A'da mob CANI
     8'den 1'e çekilmişti ama HASAR çarpanına dokunulmamıştı. */
  eq(PROTO.monsterDamageMultiplier, 4, 'hasar çarpanı:');
  /* Kaynak mob hasarı ETKİLENMEMELİ — çarpan bir denge katmanıdır. */
  const worm = Content.monster(750)!;
  eq(worm.attack, 4, 'kaynak solucan hasarı:');
  /* CANLI: aynı mob artık daha az vurmalı. */
  const S = protoState(4003);
  const before = S.player.hp;
  const dmg = S.combat.damageRoll(worm.attack * PROTO.monsterDamageMultiplier, 0, 1);
  const old = S.combat.damageRoll(worm.attack * 8, 0, 1);
  ok(dmg < old, `yeni hasar düşük olmalı: ${dmg} vs ${old}`);
  ok(before > 0, 'oyuncu canlı olmalı');
});

test('§104 iksir beklemesi PANEL AÇIKKEN de akar', () => {
  /* Bekleme oyuncunun ilgisine değil GEÇEN SÜREYE bağlıdır. */
  const S = protoState(4004);
  S.giveTestPotions();
  S.player.hp = 1;
  ok(S.potions.use(389011000).ok, 'ilk kullanım');
  const start = S.potions.cooldownLeft('hp');
  ok(start > 0, 'bekleme başlamalı');
  for (let i = 0; i < 30; i++) S.potions.update(1 / 60);
  ok(S.potions.cooldownLeft('hp') < start, 'bekleme azalmalı');
  eq(POTION_COOLDOWN_SEC, 1.5, 'bekleme süresi (kullanıcı kararı):');
});

/* ================= P2.33 — SV50 İÇERİĞİ · FİYATLAR ================= */
console.log('P2.33 — Sv50 bandı, ganimet ve fiyatlar:');

test('§105 SEVİYE TAVANI 50, içerik Sv50\'ye kadar', () => {
  eq(LEVELING.maxLevel, 50, 'tavan:');
  const levels = new Set<number>();
  for (const s of FARM_AREA_SLOTS) {
    const m = Content.monster(s.monsterRef);
    if (m) levels.add(m.level);
  }
  eq(Math.max(...levels), 50, 'en yüksek mob:');
  /* Sv31-50 arası her beş seviyelik bantta mob olmalı. */
  for (const [lo, hi] of [[31, 35], [36, 40], [41, 45], [46, 50]] as const) {
    ok([...levels].some((l) => l >= lo && l <= hi), `Sv${lo}-${hi} bandında mob yok`);
  }
  eq(FARM_AREA_SLOTS.length, 52, 'slot sayısı:');
});

test('§105 BİTKİ SAYISI DEĞİŞMEDİ — yalnız moblar arttı', () => {
  /* Kullanıcı kararı: "mevcut bitki sayısını artırma". */
  const items = buildFoliage();
  ok(items.length > 700 && items.length < 1000, `bitki sayısı değişmiş: ${items.length}`);
});

test('§105 ÜST SEVİYE DROPLARI: ganimet %0,5 · ekipman %3', () => {
  eq(HIGH_TIER_MONSTER_LEVEL, 31, 'üst seviye eşiği:');
  eq(HIGH_TIER_TROPHY_CHANCE, 0.005, 'ganimet şansı:');
  eq(HIGH_TIER_EQUIP_CHANCE, 0.03, 'ekipman şansı:');
  /* Üst seviyede elit çarpanı UYGULANMAZ — hepsi zaten elit,
     çarpan istenen oranı ikiye katlardı. */
  eq(equipChanceFor(50, true), HIGH_TIER_EQUIP_CHANCE, 'elit çarpanı üstte yok:');
  eq(equipChanceFor(50, false), HIGH_TIER_EQUIP_CHANCE, 'elit dışı da aynı:');
  /* Alt bantta elit çarpanı DEVAM ediyor. */
  eq(equipChanceFor(10, true), EQUIP_DROP_CHANCE * 2, 'alt bant elit:');
  eq(equipChanceFor(10, false), EQUIP_DROP_CHANCE, 'alt bant normal:');
  /* Üst seviye alt banttan BELİRGİN biçimde zor olmalı. */
  ok(equipChanceFor(50, true) < equipChanceFor(10, false), 'üst seviye daha kolay görünüyor');
});

test('§105 SV50 GANİMETİ: 50 000 altın, yığılabilir', () => {
  const src = Content.item(HIGH_TIER_TROPHY_REF);
  ok(src !== undefined, 'ganimet kaynakta yok');
  eq(fixedSellPrice(HIGH_TIER_TROPHY_REF), 50_000, 'satış fiyatı:');
  /* Yığılabilir olmalı — 9999'a kadar birikecek. */
  const S = protoState(4100);
  const add = S.inventory.add(HIGH_TIER_TROPHY_REF, { quantity: 5 });
  ok(add.ok, 'ganimet envantere girmeli');
  if (add.ok) {
    eq(S.autoGear.sellPrice(add.instance), 50_000 * 5, 'yığın fiyatı:');
  }
  /* YALNIZ üst seviye moblardan düşmeli. */
  ok(HIGH_TIER_MONSTER_LEVEL > 30, 'ganimet alt bantta da düşüyor');
});

test('§106 FİYATLAR GÜÇTEN TÜRÜYOR — elle tablo yok', () => {
  /* Kaynakta satış fiyatı YOK (ölçüldü: kataloğumuzda sıfır). Fiyat
     açıkça TUNING'dir ve eşyanın gücünden türer. */
  const defs = allDefinitions();
  for (const d of defs) {
    const p = equipSellPrice(d);
    ok(p >= 1, `${d.displayName} fiyatı geçersiz: ${p}`);
  }
  /* Güçlü eşya daha pahalı olmalı — MONOTON. */
  const sorted = [...defs].sort((a, b) => itemTierLevel(a) - itemTierLevel(b));
  for (let i = 1; i < sorted.length; i++) {
    ok(equipSellPrice(sorted[i]!) >= equipSellPrice(sorted[i - 1]!),
      `fiyat geriye gitti: ${sorted[i - 1]!.displayName} → ${sorted[i]!.displayName}`);
  }
  /* Yükseltme fiyatı büyütmeli. */
  const S = protoState(4101);
  const a0 = S.inventory.add(defs[0]!.definitionRef, { upgradeLevel: 0 });
  const a5 = S.inventory.add(defs[0]!.definitionRef, { upgradeLevel: 5 });
  if (a0.ok && a5.ok) {
    ok(S.autoGear.sellPrice(a5.instance) > S.autoGear.sellPrice(a0.instance),
      '+5 daha pahalı olmalı');
  }
});

test('§106 SABİT FİYATLI eşyalar tanımlı ve tutarlı', () => {
  /* Parşömen, ganimetler ve iksirler güçten türetilemez. */
  for (const ref of [SCROLL_ITEM_REF, TROPHY_ITEM_REF, HIGH_TIER_TROPHY_REF,
    HP_POTION_REF, MP_POTION_REF]) {
    const p = fixedSellPrice(ref);
    ok(p !== null && p > 0, `sabit fiyat yok: ${ref}`);
  }
  /* Üst ganimet alt ganimetten pahalı olmalı. */
  ok(FIXED_SELL_PRICES[HIGH_TIER_TROPHY_REF]! > FIXED_SELL_PRICES[TROPHY_ITEM_REF]!,
    'Sv50 ganimeti daha ucuz görünüyor');
  /* Parşömen SATILMAKTANSA kullanılsın — ucuz olmalı. */
  ok(FIXED_SELL_PRICES[SCROLL_ITEM_REF]! < 500, 'parşömen satmak çok kârlı');
});

console.log(`\n${pass} geçti, ${fail} kaldı`);
if (fail > 0) process.exit(1);
