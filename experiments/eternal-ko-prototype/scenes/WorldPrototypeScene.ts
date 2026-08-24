/** EXPERIMENT P1 / P1.1 sahnesi — YALNIZ girdi toplama + çizim.
 *  Hareket/kamera/hedef/AI/combat/Genie kararlarının HİÇBİRİ burada hesaplanmaz;
 *  hepsi world sistemlerinden gelir. Renderer 2.5D projeksiyonu uygular ama
 *  bu projeksiyon gameplay hesabına KARIŞMAZ (collision/menzil world uzayında).
 *
 *  P1.1: Genie kontrolü (BAŞLAT/DURDUR/AYARLAR), 3/5 ok görselleri ve
 *  genişletilmiş DEV paneli eklendi. Genie KAPALIYKEN sahne tam manuel çalışır. */
import type { DrawApi, GameHost, PointerEventInfo, Scene } from '../../../src/engine/types.js';
import { DisposerBag } from '../../../src/engine/dispose.js';
import { Content } from '../../../src/game/data/GameContentRepository.js';
import { SkillRegistry } from '../../../src/game/systems/SkillRegistry.js';
import { StatCalculator } from '../../../src/game/systems/CharacterStats.js';
import type { ItemInstance } from '../../../src/game/systems/InventoryState.js';
import { PLAYER_SPEED_OPTIONS, PROTO, TUNING_DEFAULTS, type TuningValues } from '../config.js';
import { DEATH_EXP_PENALTY, PrototypeState } from '../state.js';
import { DungeonSession } from '../world/DungeonSession.js';
import {
  DUNGEON_FLOOR_BOX, DUNGEON_INFO, DUNGEON_POWER_ROW, DUNGEON_SHOP_BTN, DUNGEON_WAVE_BOX,
  SHOP_CLOSE, SHOP_PANEL, dungeonActions, dungeonHitTest, shopBuyButtons, shopRows,
} from '../ui/dungeon-hud.js';
import { shopCatalog } from '../ui/potion-shop.js';
import { RISK_LABEL, combatPower, floorRisk } from '../data/combat-power.js';
import { recommendedPower } from '../data/wave-floors.js';
import { nextQuality } from '../data/quality-profile.js';
import {
  resolveJoystick, type JoystickInput, type MoveVector,
} from '../world/WorldMovementSystem.js';
import type { EquipFail } from '../world/EquipService.js';
import { OBSTACLES, ROADS, WORLD_BOUNDS } from '../data/world-map.js';
import {
  HUD_EXP_BAR, HUD_EXP_FILL, HUD_EXP_TEXT, HUD_GENIE, HUD_JOY_BASE_W, HUD_JOY_KNOB_W, HUD_PAGE_DOTS,
  HUD_CAMERA_BTN, HUD_DUNGEON_BTN, HUD_PLAYER_CARD, HUD_SETTINGS, HUD_TARGET, HUD_TARGET_BTN,
  HUD_TARGET_CARD, HUD_BARS,
  hudNavBoxes, hudSkillBoxes,
} from '../ui/hud-layout.js';
/* `character-panel.js` üç ekranın yerleşimini taşır: karakter, yetenek
   ve örs. `*_ROWS` / `*_SLOTS` tabloları P2.25.2'de maketten ÖLÇÜLDÜ. */
import {
  ALLOC_ROWS, FORGE_LIST_BOX, FORGE_PAGE_SIZE,
  FORGE_PREVIEW_BOX, allocButtons, parseAllocId,
  PANEL_FRAME, SKILL_PAGE_SIZE, charHitTest, forgeButtons, forgeHitTest, forgeRowRects,
  panelCloseButton, skillHitTest, skillPageButtons,
  statRows,
  ALLOC_POINT_ROW, ALLOC_STAT_ROWS,
  CHAR_IDENTITY_ROWS, CHAR_IDENTITY_W, CHAR_IDENTITY_X, CHAR_RESIST_ROWS,
  CHAR_STAT_DIVIDER_X, CHAR_STAT_FIRST_Y, CHAR_STAT_ROW_H,
  SKILL_BAR_H, SKILL_BAR_LABEL_Y, SKILL_BAR_SLOTS, SKILL_BAR_Y,
  SKILL_PAGE_ROW, SKILL_POINT_ROW, SKILL_POOL_ICON_W, skillPoolCells,
} from '../ui/character-panel.js';
import { canAttempt, forgePreview } from '../data/forge-model.js';
import { MORADON_PLAY_SPAWN } from '../data/moradon-farm-slots.js';
import {
  PENDING_BOX, PENDING_PAGE_SIZE, SELL_PANEL, TOGGLE_LABELS,
  bulkButtons, classButtons, deathOkButton, keepMaxButtons, pendingRows, sellHitTest,
  toggleRects, DEATH_BOX,
} from '../ui/sell-panel.js';
import { formatPower, formatPowerDelta } from '../data/power-score.js';
import { NON_GEAR_COLOR, nonGearInfo } from '../ui/non-gear-info.js';
import { itemIconKey } from '../data/item-icons.js';
import {
  GATE_ALPHA, GATE_COLOR, gateBadge, skillGate, skillIconKey, skillInitial,
  type SkillGateState,
} from '../data/skill-visuals.js';
import { ArcherProgression } from '../../../src/game/systems/combat/ArcherProgression.js';
import {
  ZOOM_DEFAULT, applyZoom, pinchDistance, pinchZoom, type PinchState,
} from '../ui/camera-zoom.js';
import { CAMERA_V1 } from '../render3d/CameraRig.js';
import {
  CAMERA_MODE_LABEL, approachYaw, baseTuning, modeYaw, nextMode, type CameraMode,
} from '../ui/camera-mode.js';
import {
  INV_LAYOUT, bagCellRects, bagEntries, compareLines, definitionOf, equipSlotRects,
  hitTest as invHitTest, invButtons, invCloseButton, itemHeadline, targetSlotFor,
  type InvSelection,
} from '../ui/inventory-panel.js';
import { ACTIVE_BAR_SLOTS, GENIE_SET_MAX, GENIE_SKILL_POOL } from '../data/archer-skills.js';
import {
  ATTACK_RANGES, BURST_RANGES, FARM_BOUNDARY_RANGES, HP_THRESHOLDS, MP_THRESHOLDS,
  PRIORITY_LABELS, SET_LABELS, SET_MODE_LABELS, TARGET_PRIORITIES,
  type GenieAction, type SetId,
} from '../world/GenieSystem.js';
import { LOOT_MODE_LABELS } from '../world/LootPolicy.js';
import { LOOT_LIFETIME_OPTIONS } from '../data/drop-profile.js';
import type { DropEvent } from '../world/DropSystem.js';
import { ITEM_CLASS_COLOR, ITEM_CLASS_LABEL, resolveStats } from '../data/item-model.js';
import { itemDefinition } from '../data/item-catalog.js';
import type { ThreeWorldRenderer } from '../render3d/ThreeWorldRenderer.js';
import { buildWorldFrame } from '../render3d/frame.js';
import {
  DISTANCE_OPTIONS, FOV_OPTIONS, HEIGHT_OPTIONS, PITCH_OPTIONS, YAW_OPTIONS, cycle,
  screenToWorldMove,
} from '../render3d/CameraRig.js';
import { koPotion, potionLabel, potionOptions } from '../data/ko-potions.js';
import type { MovementSource } from '../world/GenieMovement.js';
import { OKCU_FOOT_PAD, okcuSheet } from '../data/proto-assets.js';
import {
  ARCHER_ATLAS_DEFAULT, ARCHER_ATLAS_KEY, ARCHER_CLIPS,
  atlasRowForAngle, footPad as atlasFootPad,
} from '../data/archer-atlas.js';
import { buildPlaceholderAtlas } from '../data/placeholder-atlas.js';
import { DEFAULT_COLLISION_MODE, type CollisionMode } from '../world/MultiShot.js';
import { ARCHER_SKILL_ORDER, balanceRow } from '../data/archer-balance.js';
import type {
  DamageBreakdown, ImpactEvent, KillEvent, ReleaseEvent, WorldSkillResult,
} from '../world/WorldCombatAdapter.js';
import {
  ATTACK_MOVE_OPTIONS, CombatPipeline, PROJECTILE_SPEED_OPTIONS,
} from '../world/CombatPipeline.js';
import type { WorldMob } from '../world/types.js';
import { profileFor } from '../world/MobAi.js';
import { RESPAWN_DEFAULT, RESPAWN_OPTIONS } from '../data/mob-ai-profiles.js';

const KURT_FRAME = 230, KURT_ROW_LEFT = 6;

/** Uzun tek satırlık metni sabit genişlikte parçalara böler (telemetri). */
function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += width) out.push(text.slice(i, i + width));
  return out;
}
const OKCU_FRAME = 300;
/** Sprite'ın görünen ölçeği (kare boyutuna göre). */
const OKCU_DRAW = 0.78;
const NAV_RESERVE = 92;

/** P2.6.1 — HUD varlıklarının genel opaklığı. Maket dokulu bir zemine
 *  çizilmişti; düz arazide altın işlemeler çiğ kalıyor. Tek sayı. */
const HUD_ALPHA = 0.88;

/** Oto giy bildiriminin ekranda kalma süresi (sn). */
const POWER_TOAST_SEC = 3;

/** Otomatik kayıt aralığı (sn). Seviye atlayınca ayrıca hemen yazılır. */
const AUTOSAVE_SEC = 20;
const MAX_SET_SKILLS = GENIE_SET_MAX;
const LOG_LINES = 5;
/** DEV panelinde telemetri listesinin ALTINDA başlayan toggle kolonu. */
const DEV_TOGGLE_TOP = 692;

interface Btn { id: string; x: number; y: number; w: number; h: number; label: string; sub?: string }

/** `EquipService` reddetme sebebi → kullanıcı mesajı. Kural BURADA DEĞİL,
 *  serviste; bu tablo yalnız çeviridir. */
/** Örs reddetme sebebi → kullanıcı mesajı. Kural serviste, bu tablo çeviri. */
/** Satış reddi → mesaj. Kural `AutoGearSystem`te, bu tablo çeviri. */
const SELL_FAIL: Record<string, string> = {
  locked: 'Eşya kilitli — kilit KORUR',
  equipped: 'Kuşanılı eşya satılmaz',
  notFound: 'Eşya bulunamadı',
  protected: 'Korumalı (parşömen/iksir)',
  aboveThreshold: 'Kalite eşiğinin üstünde',
  noPrice: 'Satış değeri yok',
};

const FORGE_FAIL: Record<string, string> = {
  notFound: 'Eşya bulunamadı',
  noDefinition: 'Katalogda yok',
  maxLevel: 'Tavanda — denenemez',
  noGold: 'Altın yetmiyor',
  noScroll: 'Parşömen yetmiyor',
  locked: 'Eşya kilitli',
  /* P3.15 — başlangıç yayı güvenlik ağıdır, yakılmamalı. */
  starterWeapon: 'Başlangıç yayı yükseltilemez',
};

const INV_FAIL: Record<EquipFail, string> = {
  notFound: 'Eşya bulunamadı',
  noDefinition: 'Katalogda yok — kuşanılamaz',
  wrongClass: 'Sınıfın kuşanamaz',
  levelReq: 'Seviyen yetmiyor',
  slotMismatch: 'Bu yuvaya uymuyor',
  noSlot: 'Bu tip için yuva yok',
  inventoryFull: 'Çanta dolu — eski eşya dönemiyor',
};

/** P1.4 — son cast'in cast→release→impact telemetrisi. */
interface CastTrace {
  castId: number;
  skillRef: number;
  label: string;
  acceptedAt: number;
  releaseAt: number;
  releasedAt: number | null;
  impactAt: number | null;
  projectiles: number;
  targetHits: number | null;
  impactsDone: number;
  damage: number; physical: number; elemental: number;
  distance: number | null;
  travelDistance: number | null;
  invalid: string | null;
  breakdown: DamageBreakdown;
}

const EMPTY_BREAKDOWN: DamageBreakdown = {
  element: 'none', physicalDamage: 0, elementalDamage: 0, totalDamage: 0,
  dotPerTickDamage: 0, dotTickCount: 0, dotExpectedTotal: 0, applied: false,
};

/** DEV panelinde ayarlanabilen alanlar + adım/aralık tanımları. */
const TUNABLES: Array<{ key: keyof TuningValues; label: string; step: number; min: number; max: number; fmt?: (v: number) => string }> = [
  { key: 'cameraFollow', label: 'Kamera takip', step: 0.5, min: 1, max: 20 },
  { key: 'cameraLookAheadPct', label: 'Look-ahead %', step: 0.005, min: 0, max: 0.2, fmt: (v) => `${(v * 100).toFixed(1)}%` },
  { key: 'cameraPlayerYPct', label: 'Kamera Y ofset', step: 0.01, min: 0.35, max: 0.85, fmt: (v) => `${(v * 100).toFixed(0)}%` },
  { key: 'playerSpeed', label: 'Hareket hızı', step: 10, min: 60, max: 480 },
  { key: 'worldYCompression', label: 'Y sıkıştırma', step: 0.02, min: 0.3, max: 1 },
  { key: 'characterScale', label: 'Karakter ölçeği', step: 0.04, min: 0.3, max: 1.6 },
  { key: 'aggroRadiusMult', label: 'Aggro çarpanı', step: 0.1, min: 0.2, max: 3 },
];

function skillName(ref: number): string {
  return SkillRegistry.get(ref)?.displayName ?? `#${ref}`;
}

export class WorldPrototypeScene implements Scene {
  readonly key = 'world-proto';
  private bag = new DisposerBag();
  /* ═══ P3.8 — TEK SAHNE, İKİ DÜNYA ═══
     Zindan için AYRI SAHNE yazmadım. Sebep: bu dosyadaki HUD, girdi,
     panel ve kamera kodunun neredeyse tamamı iki modda da aynı; ayrı
     sahne bunları KOPYALARDI ve iki kopya zamanla ayrışırdı.

     Bunun yerine `S` DEĞİŞTİRİLEBİLİR: zindana girince zindan
     karakterine, çıkınca normal karaktere işaret eder. Dallanma
     yalnız DAVRANIŞIN GERÇEKTEN FARKLI olduğu yerlerdedir (dalga
     akışı, zindan HUD'ı, kayıt anahtarı). */
  private S = new PrototypeState();
  /** Zindan oturumu — `null` = normal dünyadayız. */
  private dungeon: DungeonSession | null = null;
  /** Normal dünya durumu, zindandayken saklanır. */
  private overworld: PrototypeState | null = null;
  /** İksir mağazası açık mı. */
  private shopOpen = false;

  /** P2.15 — kayıt erişimi. `main.ts` sahne başlamadan ÖNCE yükler ve
   *  sekme kapanırken yazar; durum nesnesi sahnenin içinde olduğu için
   *  dışarıya bu köprüden verilir. */
  get state(): PrototypeState { return this.S; }

  /* joystick */
  private stick: JoystickInput = { dx: 0, dy: 0, active: false };
  private stickPointer: number | null = null;
  /** P2.9 — İKİ PARMAK ZOOM. Aktif parmakların ekran konumları; ikisi birden
   *  basılıyken pinch başlar ve joystick DEVRE DIŞI kalır (yanlışlıkla
   *  yürümemek için). */
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch: PinchState | null = null;
  private zoom = ZOOM_DEFAULT;
  /** P2.22 — ölüm ekranı. Açıkken diğer girdiler kilitlidir. */
  private deathOpen = false;
  private deathAt: { x: number; y: number } | null = null;

  /** P2.19 — kamera modu ve yumuşatılmış yaw. */
  private camMode: CameraMode = 'overhead';
  private camYaw = CAMERA_V1.yawDeg;
  private stickOrigin = { x: PROTO.joystickCenter.x, y: PROTO.joystickCenter.y };

  private notice = '';
  private noticeTimer = 0;
  private devOpen = false;
  private showRays = false;
  /** P1.6 — mob telemetri paneli (varsayılan KAPALI). */
  private mobPanelOpen = false;
  /** P1.7 — drop/ganimet telemetri paneli (varsayılan KAPALI). */
  private lootPanelOpen = false;
  /** P1.8 — build/ekipman telemetri paneli (varsayılan KAPALI). */
  private buildPanelOpen = false;

  /* ═══════════════ P2.0 — THREE.JS DÜNYA KATMANI ═══════════════
     Renderer İSTEĞE BAĞLIDIR ve GAMEPLAY AUTHORITY DEĞİLDİR. Bağlı değilse
     (headless test, WebGL yok) sahne P1.8 ile BİREBİR aynı davranır. */
  private three: ThreeWorldRenderer | null = null;
  /** 3D katman açık mı? Açıkken 2D dünya çizimi ATLANIR, HUD üstte kalır (§21). */
  private render3dOn = false;
  /** 2D katmanın şeffaf temizlenmesi için canvas bağlamı (HUD overlay). */
  private overlayCtx: CanvasRenderingContext2D | null = null;
  /** P2.0 — renderer telemetri paneli (varsayılan KAPALI). */
  private renderPanelOpen = false;

  /** Prototip giriş noktası bağlar. Scene Three tiplerini KULLANMAZ —
   *  yalnız opak bir arayüz tutar. */
  attachThree(renderer: ThreeWorldRenderer, overlay: CanvasRenderingContext2D | null): void {
    this.three = renderer;
    this.overlayCtx = overlay;
    this.render3dOn = true;
    /* P2.1 — gameplay `releaseDelay` sabitinin TELEMETRİ KOPYASI.
       Renderer bu değeri kullanmaz; yalnız animasyonun doğal bırakma anıyla
       (0.183 sn) farkını gösterebilmek için okur. Gameplay DEĞİŞMEZ. */
    renderer.gameplayReleaseSec = this.S.adapter.pipeline.timing.releaseDelaySec;
  }
  get three3dActive(): boolean { return this.render3dOn && this.three !== null; }

  /** P2.1 — JOYSTICK EKRANLA HİZALI KALIR.
   *
   *  Joystick `dx/dy` EKRAN uzayındadır. 2D katman dünyayı eksen hizalı çizer
   *  (ekran SAĞ = worldX+, YUKARI = worldY−) ve 3D kameranın VARSAYILANI da
   *  artık aynı hizadadır (`yawDeg = 270`) — bu yüzden dönüşüm varsayılanda
   *  **BİREBİR KİMLİKTİR** ve 3D katmanın açık/kapalı olması hareketi
   *  DEĞİŞTİRMEZ. Yalnız DEV panelinden kamera döndürülürse devreye girer.
   *
   *  P2.0'da varsayılan yaw 45 idi ve bu hizayı bozuyordu: joystick "sağ"
   *  komutu karakteri ekranda yukarı-sola götürüyordu (bildirilen kusur).
   *
   *  P2.19 — ÜÇÜNCÜ ŞAHIS MODUNDA BU DÖNÜŞÜM ZORUNLU. Kamera karakterin
   *  arkasında döndüğü için ekran ekseni sürekli değişir; joystick "ileri"
   *  komutu kameranın baktığı yöne gitmelidir. Dönüşüm zaten kameranın
   *  GÜNCEL yaw'ını okuduğu için ek bir dallanma gerekmez. */
  private cameraRelative(mv: MoveVector): MoveVector {
    if (!this.three3dActive || mv.magnitude <= 0) return mv;
    const w = screenToWorldMove(mv.x, mv.y, this.three!.tuning);
    const len = Math.hypot(w.x, w.y);
    if (len <= 0) return mv;
    return { x: w.x / len, y: w.y / len, magnitude: mv.magnitude };
  }
  /** Atlas modu açık mı? (gerçek atlas yoksa DEBUG yer tutucu kullanılır) */
  private atlasOn = false;
  private atlasLoading = false;
  /** BALANCE V1 tablosu açık mı? (DEV alt sayfası) */
  private balanceOpen = false;
  /** Son cast'in cast→release→impact izi (§18 telemetrisi). */
  private lastCast: CastTrace | null = null;
  /** P1.5 — bu karede hareketi kim sürdü? (telemetri) */
  private movementSource: MovementSource = 'NONE';
  /** Son iksir kullanımı (§12 telemetrisi). */
  private lastPotion: Extract<GenieAction, { kind: 'potion' }> | null = null;
  /** Impact parlamaları — SALT GÖRSEL, gameplay'e etkisi yok. */
  private impactFx: Array<{ x: number; y: number; hit: boolean; life: number }> = [];
  private genieOpen = false;
  /** P2.5 — envanter/ekipman paneli MODAL'dır (Genie ayarları gibi). */
  private invOpen = false;
  private invSel: InvSelection = null;
  /** P2.7 — karakter ve yetenek ekranları (envanterle AYNI modal deseni). */
  private charOpen = false;
  private skillOpen = false;
  /** Yetenek havuzunun sayfası (dikey kaydırma YOK — sayfalanır). */
  private skillPage = 0;
  /** Havuzdan seçilen skill hangi bar yuvasına gidecek. */
  private skillBarSel = 0;
  /** P2.8 — Örs. */
  private forgeOpen = false;
  private forgePage = 0;
  private forgeSel: number | null = null;
  /** Son deneme sonucunun kısa özeti (panelde gösterilir). */
  private forgeMsg = '';
  /** P2.16 — oto sat ekranı. */
  private sellOpen = false;
  private sellMsg = '';
  /** P2.13 — güç skoru bildirimi: `+20 Up` şeridi. Süre dolunca kaybolur. */
  private powerToast: { name: string; before: number; after: number; t: number } | null = null;
  /** P2.15 — otomatik kayıt sayacı ve son kaydedilen seviye. */
  private autosaveTimer = AUTOSAVE_SEC;
  private lastSavedLevel = 0;
  private genieTab: 'general' | 'sets' | 'bar' = 'general';
  private editingSet: SetId = 0;
  /** Aktif bar sekmesinde düzenlenen slot. */
  private editingBarSlot = 0;
  private log: string[] = [];
  /** Uzaktan toplanan ganimetin oyuncuya uçuş efekti (yalnız görsel). */
  private lootFlights: Array<{ x: number; y: number; itemRef: number; t: number }> = [];
  private fpsAvg = 60;

  constructor(private host: GameHost) {}

  enter(): void {
    this.bag.add(this.host.input.onDown((p) => this.onDown(p)));
    this.bag.add(this.host.input.onMove((p) => this.onMove(p)));
    this.bag.add(this.host.input.onUp((p) => this.onUp(p)));
  }
  exit(): void { this.bag.disposeAll(); }

  private say(m: string): void { this.notice = m; this.noticeTimer = 1.8; }
  private logLine(m: string): void {
    this.log.push(m);
    if (this.log.length > LOG_LINES) this.log.shift();
  }

  /** Hedeflenebilir tüm varlıklar. P2.2 — yalnız GERÇEK moblar. */
  private ents(): WorldMob[] { return this.S.entities(); }

  /* ---------------- projeksiyon (yalnız render) ---------------- */
  private projX(worldX: number): number {
    return worldX - this.S.camera.x + PROTO.screenW / 2;
  }
  private projY(worldY: number): number {
    const c = this.S.tuning.get('worldYCompression');
    return (worldY - this.S.camera.y) * c + PROTO.screenH * this.S.tuning.get('cameraPlayerYPct');
  }
  /** Çok hafif perspektif: ekranın altındaki nesneler bir tık büyük. */
  private depthScale(screenY: number): number {
    const base = PROTO.screenH * this.S.tuning.get('cameraPlayerYPct');
    return 1 + (screenY - base) * 0.00016;
  }
  /** Ekranı ters çevirip world noktası bulur (dokunma → hedef seçimi). */
  private unproject(sx: number, sy: number): { x: number; y: number } {
    const c = this.S.tuning.get('worldYCompression');
    return {
      x: sx - PROTO.screenW / 2 + this.S.camera.x,
      y: (sy - PROTO.screenH * this.S.tuning.get('cameraPlayerYPct')) / c + this.S.camera.y,
    };
  }

  /* ---------------- düzen ---------------- */
  /** ARCHER COMBAT V1: ayrı "Saldırı" düğmesi YOK. Standart Atış artık gerçek bir
   *  skilldir ve 5 aktif slottan birine konur. */
  /** P2.6 — skill yuvaları artık maket ÇEMBERİNDEDİR. Dokunma alanı ile
   *  görsel AYNI dikdörtgendir (`ui/hud-layout.ts`), ikisi ayrı yerde
   *  tanımlanmaz. Sıra korunur: index 0 merkezdeki büyük yuvadır. */
  private actionButtons(): Btn[] {
    const boxes = hudSkillBoxes();
    return this.S.combat.skills.slots().map((s, i) => {
      const b = boxes[i] ?? boxes[0]!;
      return {
        id: `slot_${i}`, x: b.x, y: b.y, w: b.w, h: b.h,
        label: s.def ? s.def.displayName : 'Boş',
        sub: s.def ? `${s.def.manaCost}MP` : '—',
      };
    });
  }
  private nearestBtn(): Btn {
    const b = HUD_TARGET_BTN;
    return { id: 'nearest', x: b.x, y: b.y, w: b.w, h: b.h, label: 'Hedef' };
  }
  /** Alt menü — Çanta paneli bağlı, diğerleri sonraki görevlerde. */
  private navButtons(): Btn[] {
    return hudNavBoxes().map((n) => ({ id: n.id, x: n.x, y: n.y, w: n.w, h: n.h, label: n.key }));
  }
  private pickupBtn(): Btn { return { id: 'pickup', x: 246, y: 962, w: 148, h: 52, label: 'Topla' }; }
  /** P2.6.1 — DEV anahtarı maket dışıdır; ayar düğmesinin ÜSTÜNE geliyordu.
   *  Sol kenara, oyuncu kartının altına alındı. */
  private devToggle(): Btn { return { id: 'dev', x: 8, y: 128, w: 44, h: 30, label: 'DEV' }; }

  /** P1.3.1 — MP tavanının rotasyonu kesmesini engelleyen DEV anahtarı.
   *  P2.3: combat ölçer paneli kaldırıldı; bu araç DEV paneline taşındı. */
  private infiniteMpBtn(): Btn {
    return { id: 'dev_inf_mp', x: 44, y: DEV_TOGGLE_TOP + 80, w: 300, h: 34, label: 'SONSUZ MP' };
  }

  /** P2.15 — DEV: kaydı sil ve baştan başla. Oyun testinde temiz bir
   *  başlangıca dönmek için tek yol; production'da bu düğme yoktur. */
  /** P2.30 — DEV: çizim kalitesi. Varsayılan mobil; yükseğe alıp
   *  farkı görmek için. */
  private qualityBtn(): Btn {
    return { id: 'dev_quality', x: 44, y: DEV_TOGGLE_TOP + 160, w: 300, h: 34, label: 'KALİTE' };
  }

  private wipeSaveBtn(): Btn {
    return { id: 'dev_wipe', x: 44, y: DEV_TOGGLE_TOP + 120, w: 300, h: 34, label: 'KAYDI SİL' };
  }

  /** Genie kontrol şeridi (üst HUD'ın hemen altı). */
  /** P2.6 — Genie üç düğmeden TEK ANAHTARA indi (maket). Aç/kapa tek dokunuş,
   *  ayarlar dişli düğmesindedir. */
  private genieButtons(): Btn[] {
    return [
      { id: 'genie_toggle', x: HUD_GENIE.x, y: HUD_GENIE.y, w: HUD_GENIE.w, h: HUD_GENIE.h, label: 'Genie' },
      { id: 'genie_settings', x: HUD_SETTINGS.x, y: HUD_SETTINGS.y, w: HUD_SETTINGS.w, h: HUD_SETTINGS.h, label: 'Ayarlar' },
    ];
  }

  private devRows(): Array<{ minus: Btn; plus: Btn; key: keyof TuningValues; label: string; y: number }> {
    return TUNABLES.map((t, i) => {
      const y = 200 + i * 46;
      return {
        key: t.key, label: t.label, y,
        minus: { id: `dev_minus_${t.key}`, x: 386, y, w: 40, h: 36, label: '−' },
        plus: { id: `dev_plus_${t.key}`, x: 546, y, w: 40, h: 36, label: '+' },
      };
    });
  }
  private devReset(): Btn { return { id: 'dev_reset', x: 386, y: 200 + TUNABLES.length * 46 + 6, w: 200, h: 40, label: 'Reset Defaults' }; }
  private raysToggle(): Btn {
    return { id: 'dev_rays', x: 44, y: DEV_TOGGLE_TOP, w: 300, h: 34, label: 'Show projectile rays' };
  }
  private collisionToggle(): Btn {
    return { id: 'dev_collision', x: 44, y: DEV_TOGGLE_TOP + 40, w: 300, h: 34, label: 'Collision mode' };
  }
  private atlasToggle(): Btn {
    return { id: 'dev_atlas', x: 44, y: DEV_TOGGLE_TOP + 120, w: 300, h: 34, label: 'Archer atlas modu' };
  }
  private balanceToggle(): Btn {
    return { id: 'dev_balance', x: 44, y: DEV_TOGGLE_TOP + 160, w: 300, h: 34, label: 'BALANCE V1 tablosu' };
  }
  /** P1.4 A/B/C — saldırı sırasında hareket hızı. */
  private attackMoveToggle(): Btn {
    return { id: 'dev_attack_move', x: 44, y: DEV_TOGGLE_TOP + 200, w: 300, h: 34, label: 'Attack Move' };
  }
  private projSpeedToggle(): Btn {
    return { id: 'dev_proj_speed', x: 44, y: DEV_TOGGLE_TOP + 240, w: 300, h: 34, label: 'Projectile Speed' };
  }
  /** P1.4.1 §2 — gerçek world hareket hızı presetleri. */
  private moveSpeedToggle(): Btn {
    return { id: 'dev_move_speed', x: 386, y: DEV_TOGGLE_TOP + 60, w: 200, h: 34, label: 'Hareket hızı' };
  }
  /** P1.4.1 §14 — DEV test iksirleri. */
  private testPotionBtn(): Btn {
    return { id: 'dev_test_potions', x: 386, y: DEV_TOGGLE_TOP + 104, w: 200, h: 34, label: 'Test iksirleri ver' };
  }
  /** P1.6 §… — respawn süresi preseti (3 / 8 / 15 sn). */
  private respawnToggle(): Btn {
    return { id: 'dev_respawn', x: 386, y: DEV_TOGGLE_TOP + 148, w: 200, h: 34, label: 'Respawn' };
  }
  /* ═══ P2.0 — 3D DEV KONTROLLERİ (§8/§9/§23) ═══ */
  private threeToggle(): Btn {
    return { id: 'dev_3d', x: 386, y: DEV_TOGGLE_TOP + 320, w: 200, h: 34, label: '3D dünya' };
  }
  private renderPanelToggle(): Btn {
    return { id: 'dev_render_panel', x: 386, y: DEV_TOGGLE_TOP + 360, w: 200, h: 34, label: 'Renderer paneli' };
  }
  /** Kamera düğmeleri YALNIZ renderer paneli açıkken görünür ve tıklanır;
   *  panelin kendi alanında iki sütun halinde dizilir. */
  private camBtn(i: number, id: string): Btn {
    const col = i % 2, row = Math.floor(i / 2);
    return { id, x: 44 + col * 156, w: 148, y: 566 + row * 32, h: 28, label: '' };
  }
  /** P1.8 — DEV: katalog ekipmanını ver ve kuşandır. */
  private testGearBtn(): Btn {
    return { id: 'dev_test_gear', x: 386, y: DEV_TOGGLE_TOP + 280, w: 200, h: 34, label: 'Test ekipmanı ver' };
  }
  /** P1.7 — yerdeki ganimet ömrü preseti (15 / 60 / 180 sn). */
  private lootLifeToggle(): Btn {
    return { id: 'dev_loot_life', x: 386, y: DEV_TOGGLE_TOP + 236, w: 200, h: 34, label: 'Loot ömrü' };
  }
  /** P1.8 — karakter build / ekipman telemetri paneli aç/kapa. */
  private buildPanelToggle(): Btn {
    return { id: 'dev_build_panel', x: 44, y: DEV_TOGGLE_TOP + 320, w: 300, h: 34, label: 'Build telemetrisi' };
  }
  /** P1.7 — drop/ganimet telemetri paneli aç/kapa. */
  private lootPanelToggle(): Btn {
    return { id: 'dev_loot_panel', x: 44, y: DEV_TOGGLE_TOP + 280, w: 300, h: 34, label: 'Drop telemetrisi' };
  }
  /** P1.6 — mob telemetri paneli aç/kapa. */
  private mobPanelToggle(): Btn {
    return { id: 'dev_mob_panel', x: 386, y: DEV_TOGGLE_TOP + 192, w: 200, h: 34, label: 'Mob telemetri' };
  }
  /** Etkin çarpışma modeli (DEV ezmesi varsa o, yoksa profil varsayılanı). */
  private collisionMode(): CollisionMode {
    return this.S.adapter.collisionModeOverride ?? DEFAULT_COLLISION_MODE;
  }

  /* ---- Genie ayar ekranı ---- */
  private genieTabs(): Btn[] {
    return [
      { id: 'gs_tab_general', x: 40, y: 150, w: 172, h: 44, label: 'Genel' },
      { id: 'gs_tab_bar', x: 220, y: 150, w: 172, h: 44, label: 'Aktif Bar' },
      { id: 'gs_tab_sets', x: 400, y: 150, w: 172, h: 44, label: 'Genie Setleri' },
    ];
  }

  /** Aktif bar sekmesi: 5 slot + 15 skillik kitap. */
  private genieBarButtons(): Btn[] {
    const btns: Btn[] = [];
    for (let i = 0; i < ACTIVE_BAR_SLOTS; i++) {
      btns.push({ id: `bar_slot_${i}`, x: 40, y: 214 + i * 46, w: 380, h: 40, label: `${i + 1}` });
      btns.push({ id: `bar_clear_${i}`, x: 432, y: 214 + i * 46, w: 140, h: 40, label: 'Boşalt' });
    }
    GENIE_SKILL_POOL.forEach((ref, i) => {
      btns.push({
        id: `bar_pick_${ref}`, x: 40 + (i % 2) * 274, y: 476 + Math.floor(i / 2) * 44,
        w: 262, h: 38, label: skillName(ref),
      });
    });
    return btns;
  }
  private genieCloseBtn(): Btn { return { id: 'gs_close', x: 40, y: 1000, w: 540, h: 48, label: 'Kapat' }; }

  private genieGeneralRows(): Array<{ label: string; value: string; minus?: Btn; plus?: Btn; toggle?: Btn; y: number }> {
    const g = this.S.genie.settings;
    const row = (i: number): number => 200 + i * 50;
    const pair = (i: number, id: string): { minus: Btn; plus: Btn } => ({
      minus: { id: `gs_${id}_minus`, x: 400, y: row(i), w: 48, h: 38, label: '−' },
      plus: { id: `gs_${id}_plus`, x: 528, y: row(i), w: 48, h: 38, label: '+' },
    });
    const sw = (i: number, id: string, on: boolean): Btn =>
      ({ id: `gs_${id}`, x: 400, y: row(i), w: 176, h: 38, label: on ? 'AÇIK' : 'KAPALI' });
    return [
      { label: 'Attack Range (hedef edinme)', value: `${g.attackRange}`, ...pair(0, 'range'), y: row(0) },
      { label: 'Auto Burst Range', value: `${g.autoBurstRange}`, ...pair(1, 'burst'), y: row(1) },
      {
        label: 'Hedef Önceliği', value: PRIORITY_LABELS[g.targetPriority], y: row(2),
        toggle: { id: 'gs_priority', x: 400, y: row(2), w: 176, h: 38, label: PRIORITY_LABELS[g.targetPriority] },
      },
      {
        label: 'Farm Alanı', value: g.farmBoundaryEnabled ? 'AÇIK' : 'KAPALI', y: row(3),
        toggle: sw(3, 'farm_toggle', g.farmBoundaryEnabled),
      },
      { label: 'Farm Alanı Yarıçapı', value: `${g.farmBoundaryRadius}`, ...pair(4, 'farmr'), y: row(4) },
      {
        label: 'Farm Alanını Göster', value: g.showFarmBoundary ? 'AÇIK' : 'KAPALI', y: row(5),
        toggle: sw(5, 'farm_show', g.showFarmBoundary),
      },
      {
        label: 'Aktif Set', value: g.forcedSet === null ? 'OTOMATİK' : `SET ${g.forcedSet + 1}`, y: row(6),
        toggle: {
          id: 'gs_forced_set', x: 400, y: row(6), w: 176, h: 38,
          label: g.forcedSet === null ? 'OTOMATİK' : `SET ${g.forcedSet + 1}`,
        },
      },
      /* P1.7 — AUTO LOOT MESAFESİZDİR. Eski "Auto Loot Menzili" satırı
         (90/300/600/1200) KALDIRILDI; teslimat kararı drop anında verilir. */
      {
        label: 'Auto Loot', value: LOOT_MODE_LABELS[this.S.lootPolicy.mode], y: row(7),
        toggle: { id: 'gs_loot_mode', x: 400, y: row(7), w: 176, h: 38, label: LOOT_MODE_LABELS[this.S.lootPolicy.mode] },
      },
      /* P1.4.1 — SEÇİLİ KADEME. Genie kendi iksir SEÇMEZ; bittiğinde başka
         kademeye geçmez. Miktar sabittir, eşik yalnız tetikleyicidir. */
      {
        label: 'HP İksiri', value: this.potionValue(g.hpPotionRef), y: row(9),
        toggle: { id: 'gs_hp_potion', x: 400, y: row(9), w: 176, h: 38, label: potionLabel(g.hpPotionRef, 'hp') },
      },
      { label: 'HP Eşiği (tetik)', value: `%${Math.round(g.hpThresholdPct * 100)}`, ...pair(10, 'hp'), y: row(10) },
      {
        label: 'MP İksiri', value: this.potionValue(g.mpPotionRef), y: row(11),
        toggle: { id: 'gs_mp_potion', x: 400, y: row(11), w: 176, h: 38, label: potionLabel(g.mpPotionRef, 'mp') },
      },
      { label: 'MP Eşiği (tetik)', value: `%${Math.round(g.mpThresholdPct * 100)}`, ...pair(12, 'mp'), y: row(12) },
    ];
  }

  /** Ayar satırında gösterilen değer: ad + miktar + eldeki adet. */
  private potionValue(ref: number | null): string {
    if (ref === null) return 'KAPALI';
    const p = koPotion(ref);
    if (!p) return '—';
    return `${p.displayName} (+${p.restoreAmount}) ×${this.S.potions.stock(ref)}`;
  }

  /** KAPALI → en küçük kademe → … → en büyük → KAPALI. */
  private cyclePotion(ref: number | null, resource: 'hp' | 'mp'): number | null {
    const opts = potionOptions(resource);
    const i = opts.indexOf(ref);
    return opts[((i < 0 ? 0 : i) + 1) % opts.length] ?? null;
  }

  private genieSetButtons(): Btn[] {
    const btns: Btn[] = [];
    for (let i = 0; i < 3; i++) {
      btns.push({ id: `gs_set_${i}`, x: 40 + i * 182, y: 212, w: 172, h: 44, label: `Set ${i + 1}` });
    }
    btns.push({
      id: 'gs_mode', x: 380, y: 264, w: 200, h: 40,
      label: SET_MODE_LABELS[this.S.genie.settings.modes[this.editingSet]],
    });
    const seq = this.S.genie.settings.sets[this.editingSet];
    seq.forEach((_ref, i) => {
      btns.push({ id: `gs_del_${i}`, x: 500, y: 316 + i * 46, w: 80, h: 40, label: 'Sil' });
    });
    GENIE_SKILL_POOL.forEach((ref, i) => {
      btns.push({
        id: `gs_add_${ref}`, x: 40 + (i % 2) * 274, y: 640 + Math.floor(i / 2) * 52,
        w: 262, h: 44, label: `+ ${skillName(ref)}`,
      });
    });
    return btns;
  }

  private hit(p: PointerEventInfo, b: Btn): boolean {
    return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  }

  /* ---------------- girdi ---------------- */
  private onDown(p: PointerEventInfo): void {
    this.pointers.set(p.id, { x: p.x, y: p.y });
    /* İkinci parmak indi → pinch başlat, joystick'i bırak. */
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = { startDistance: pinchDistance(a!, b!), startZoom: this.zoom };
      this.stickPointer = null;
      this.stick = { dx: 0, dy: 0, active: false };
      return;
    }

    /* Genie ayar ekranı MODAL'dır: açıkken alttaki hiçbir kontrol tetiklenmez. */
    if (this.genieOpen) { this.handleGenieSettings(p); return; }
    /* Zindan mağazası AÇIKKEN başka hiçbir girdi işlenmez. */
    if (this.shopOpen) { this.handleShopInput(p); return; }
    /* Zindan eylem düğmeleri panellerden ÖNCE: kat değiştirmek
       çanta açmaktan daha acil bir eylemdir. */
    if (this.inDungeon && this.handleDungeonInput(p)) return;

    /* Ölüm ekranı AÇIKKEN başka hiçbir girdi işlenmez. */
    if (this.deathOpen) {
      if (this.hit(p, deathOkButton())) {
        this.host.audio.play('ui');
        this.S.reviveAtSpawn();
        this.deathOpen = false;
        this.deathAt = null;
      }
      return;
    }
    if (this.invOpen) { this.handleInventory(p); return; }
    if (this.charOpen) { this.handleCharacter(p); return; }
    if (this.skillOpen) { this.handleSkills(p); return; }
    if (this.forgeOpen) { this.handleForge(p); return; }
    if (this.sellOpen) { this.handleSell(p); return; }
    /* P2.19 — kamera modu düğmesi. Her dokunuşta sıradaki moda geçer. */
    if (this.hit(p, { id: 'cam_mode', ...HUD_CAMERA_BTN, label: '' })) {
      this.camMode = nextMode(this.camMode);
      this.host.audio.play('ui');
      this.say(`Kamera: ${CAMERA_MODE_LABEL[this.camMode]}`);
      return;
    }
    /* P3.2 — ZİNDAN GİRİŞİ. Şu an yalnız KAPIYI açar; dalga modu
       sahnesi Aşama 2'de gelecek. Düğmenin şimdiden durması bilinçli:
       giriş noktası netleşsin ve yerleşim testi bugünden korunsun. */
    if (this.hit(p, { id: 'dungeon', ...HUD_DUNGEON_BTN, label: '' })) {
      this.host.audio.play('ui');
      this.enterDungeon();
      return;
    }
    for (const n of this.navButtons()) {
      if (!this.hit(p, n)) continue;
      this.host.audio.play('ui');
      if (n.id === 'nav_bag') { this.invOpen = true; this.invSel = null; }
      else if (n.id === 'nav_char') { this.charOpen = true; }
      else if (n.id === 'nav_skill') { this.skillOpen = true; this.skillPage = 0; }
      else if (n.id === 'nav_forge') {
        this.forgeOpen = true; this.forgePage = 0; this.forgeSel = null; this.forgeMsg = '';
      }
      else if (n.id === 'nav_menu') { this.sellOpen = true; this.sellMsg = ''; }
      else this.say('Bu ekran sonraki görevde');
      return;
    }

    if (this.hit(p, this.devToggle())) { this.devOpen = !this.devOpen; return; }
    if (this.devOpen && this.handleDev(p)) return;

    for (const b of this.genieButtons()) {
      if (!this.hit(p, b)) continue;
      if (b.id === 'genie_toggle') {
        if (this.S.genie.status(this.ents()).enabled) {
          this.S.genie.stop();
          this.say('Genie durdu (hedef korunuyor)');
          this.logLine('Genie DURDUR');
        } else {
          this.S.genie.start(this.S.world);
          this.say('Genie başladı — farm merkezi kilitlendi');
          this.logLine(`Genie BAŞLAT @ ${Math.round(this.S.world.worldX)},${Math.round(this.S.world.worldY)}`);
        }
      } else {
        this.genieOpen = true;
      }
      this.host.audio.play('ui');
      return;
    }


    for (const b of this.actionButtons()) {
      if (this.hit(p, b)) { this.press(b.id); return; }
    }
    if (this.hit(p, this.nearestBtn())) {
      const m = this.S.targets.selectNearest(this.ents(), this.S.world.worldX, this.S.world.worldY, this.S.ranges.nearestScan);
      this.say(m ? `Hedef: ${m.monster.displayName}` : 'Yakında hedef yok');
      return;
    }
    const near = this.S.worldLoot.nearest(this.S.world.worldX, this.S.world.worldY);
    if (near && this.hit(p, this.pickupBtn())) { this.pickup(near.lootUid); return; }

    /* joystick bölgesi: sol alt çeyrek */
    if (p.x < PROTO.screenW * 0.55 && p.y > PROTO.screenH * 0.66) {
      this.stickPointer = p.id;
      this.stickOrigin = { x: p.x, y: p.y };
      this.stick = { dx: 0, dy: 0, active: true };
      return;
    }

    /* dünyaya dokunma: hedef seçimi ya da yakındaki loot */
    /* §13 — 3D açıkken ekran→mob çözümü RAYCASTER ile yapılır. Raycaster
       bir HEDEF OTORİTESİ DEĞİLDİR: yalnız uid döndürür, hedefi yine
       mevcut `WorldTargetSystem` seçer ve hiçbir combat state değişmez. */
    if (this.three3dActive) {
      const uid = this.three!.pickMobAt(p.x, p.y);
      if (uid !== null) {
        const picked = this.ents().find((m) => m.uid === uid) ?? null;
        if (picked) {
          this.S.targets.select(picked.uid);
          this.say(picked.monster.displayName);
          this.host.audio.play('ui');
          return;
        }
      }
    }
    const w = this.unproject(p.x, p.y);
    const mob = this.S.targets.pickAt(this.ents(), w.x, w.y, this.S.ranges.pickRadius);
    if (mob) { this.say(mob.monster.displayName); this.host.audio.play('ui'); return; }
    const loot = this.S.worldLoot.nearest(w.x, w.y);
    if (loot) this.pickup(loot.lootUid);
  }

  private onMove(p: PointerEventInfo): void {
    if (this.pointers.has(p.id)) this.pointers.set(p.id, { x: p.x, y: p.y });
    if (this.pinch !== null && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      this.zoom = pinchZoom(this.pinch, pinchDistance(a!, b!));
      return;
    }
    if (this.stickPointer !== p.id) return;
    this.stick = { dx: p.x - this.stickOrigin.x, dy: p.y - this.stickOrigin.y, active: true };
  }
  private onUp(p: PointerEventInfo): void {
    this.pointers.delete(p.id);
    if (this.pointers.size < 2) this.pinch = null;
    if (this.stickPointer !== p.id) return;
    this.stickPointer = null;
    this.stick = { dx: 0, dy: 0, active: false };
  }

  private handleDev(p: PointerEventInfo): boolean {
    /* BALANCE tablosu tam ekran kaplar → herhangi bir dokunuş onu kapatır. */
    if (this.balanceOpen) { this.balanceOpen = false; return true; }
    for (const row of this.devRows()) {
      const t = TUNABLES.find((x) => x.key === row.key)!;
      if (this.hit(p, row.minus)) {
        this.S.tuning.set(row.key, Math.max(t.min, +(this.S.tuning.get(row.key) - t.step).toFixed(4)));
        return true;
      }
      if (this.hit(p, row.plus)) {
        this.S.tuning.set(row.key, Math.min(t.max, +(this.S.tuning.get(row.key) + t.step).toFixed(4)));
        return true;
      }
    }
    if (this.hit(p, this.devReset())) { this.S.tuning.reset(); this.say('Varsayılanlara döndü'); return true; }
    if (this.hit(p, this.raysToggle())) { this.showRays = !this.showRays; return true; }
    if (this.hit(p, this.atlasToggle())) { void this.toggleAtlas(); return true; }
    if (this.hit(p, this.balanceToggle())) { this.balanceOpen = !this.balanceOpen; return true; }
    if (this.hit(p, this.attackMoveToggle())) {
      const v = this.S.adapter.pipeline.timing.cycleAttackMove();
      this.say(`Attack Move: %${Math.round(v * 100)}`);
      return true;
    }
    if (this.hit(p, this.moveSpeedToggle())) {
      const cur = this.S.tuning.get('playerSpeed');
      const i = PLAYER_SPEED_OPTIONS.indexOf(cur as 90);
      const next = PLAYER_SPEED_OPTIONS[((i < 0 ? -1 : i) + 1) % PLAYER_SPEED_OPTIONS.length]!;
      this.S.tuning.set('playerSpeed', next);
      this.say(`Hareket hızı: ${next}`);
      return true;
    }
    if (this.hit(p, this.testPotionBtn())) {
      const n = this.S.giveTestPotions();
      this.say(n > 0 ? `${n} test iksiri eklendi` : 'Çanta dolu');
      return true;
    }
    if (this.hit(p, this.projSpeedToggle())) {
      const v = this.S.adapter.pipeline.timing.cycleProjectileSpeed();
      this.say(`Projectile Speed: ${v}`);
      return true;
    }
    if (this.hit(p, this.collisionToggle())) {
      this.S.adapter.collisionModeOverride =
        this.collisionMode() === 'targetOnly' ? 'firstMobAlongRay' : 'targetOnly';
      this.say(`Collision: ${this.S.adapter.collisionModeOverride}`);
      return true;
    }
    if (this.hit(p, this.respawnToggle())) {
      const cur = this.S.mobs.ai.respawnOverrideSec ?? RESPAWN_DEFAULT;
      const i = RESPAWN_OPTIONS.indexOf(cur as 3);
      const next = RESPAWN_OPTIONS[((i < 0 ? -1 : i) + 1) % RESPAWN_OPTIONS.length]!;
      this.S.mobs.ai.respawnOverrideSec = next;
      this.say(`Respawn: ${next} sn`);
      return true;
    }
    if (this.hit(p, this.mobPanelToggle())) {
      this.mobPanelOpen = !this.mobPanelOpen;
      if (this.mobPanelOpen) { this.lootPanelOpen = false; this.buildPanelOpen = false; }
      return true;
    }
    if (this.hit(p, this.infiniteMpBtn())) {
      this.S.infiniteMp = !this.S.infiniteMp;
      this.say(`Sonsuz MP: ${this.S.infiniteMp ? 'AÇIK' : 'KAPALI'}`);
      return true;
    }
    /* P2.30 — kalite döngüsü. MSAA bağlam kurulumunda sabit olduğu
       için değişimi AÇIKÇA bildirilir; yanıltıcı "uygulandı" demiyoruz. */
    if (this.hit(p, this.qualityBtn())) {
      const r = this.three?.setQuality(nextQuality(this.three.qualityLevel));
      const lvl = this.three?.qualityLevel ?? 'mobile';
      this.say(r?.msaaNeedsReload === true
        ? `Kalite: ${lvl} (kenar yumuşatma için yenile)`
        : `Kalite: ${lvl}`);
      return true;
    }
    if (this.hit(p, this.wipeSaveBtn())) {
      this.S.saves.wipe();
      this.say('Kayıt silindi — sayfayı yenile');
      return true;
    }
    if (this.hit(p, this.lootPanelToggle())) {
      this.lootPanelOpen = !this.lootPanelOpen;
      if (this.lootPanelOpen) { this.mobPanelOpen = false; this.buildPanelOpen = false; }
      return true;
    }
    if (this.hit(p, this.buildPanelToggle())) {
      this.buildPanelOpen = !this.buildPanelOpen;
      if (this.buildPanelOpen) { this.mobPanelOpen = false; this.lootPanelOpen = false; }
      return true;
    }
    if (this.three !== null) {
      if (this.hit(p, this.threeToggle())) {
        this.render3dOn = !this.render3dOn;
        this.say(`3D katman: ${this.render3dOn ? 'AÇIK' : 'KAPALI'}`);
        return true;
      }
      if (this.hit(p, this.renderPanelToggle())) {
        this.renderPanelOpen = !this.renderPanelOpen;
        if (this.renderPanelOpen) {
          this.mobPanelOpen = false; this.lootPanelOpen = false; this.buildPanelOpen = false;
        }
        return true;
      }
      const t = this.three.tuning;
      if (this.renderPanelOpen) {
      if (this.hit(p, this.camBtn(0, 'cam_yaw'))) {
        t.yawDeg = cycle(YAW_OPTIONS, t.yawDeg); this.three.applyCameraTuning();
        this.say(`Yaw ${t.yawDeg}°`); return true;
      }
      if (this.hit(p, this.camBtn(1, 'cam_pitch'))) {
        t.pitchDeg = cycle(PITCH_OPTIONS, t.pitchDeg); this.three.applyCameraTuning();
        this.say(`Pitch ${t.pitchDeg}°`); return true;
      }
      if (this.hit(p, this.camBtn(2, 'cam_dist'))) {
        t.distance = cycle(DISTANCE_OPTIONS, t.distance); this.three.applyCameraTuning();
        this.say(`Mesafe ${t.distance}`); return true;
      }
      if (this.hit(p, this.camBtn(3, 'cam_height'))) {
        t.height = cycle(HEIGHT_OPTIONS, t.height); this.three.applyCameraTuning();
        this.say(`Bakış yüksekliği ${t.height}`); return true;
      }
      if (this.hit(p, this.camBtn(4, 'cam_fov'))) {
        t.fov = cycle(FOV_OPTIONS, t.fov); this.three.applyCameraTuning();
        this.say(`FOV ${t.fov}`); return true;
      }
      if (this.hit(p, this.camBtn(5, 'cam_proj'))) {
        t.projection = t.projection === 'perspective' ? 'orthographic' : 'perspective';
        this.three.applyCameraTuning();
        this.say(`İzdüşüm: ${t.projection === 'perspective' ? 'PERSPEKTİF' : 'ORTOGRAFİK'}`);
        return true;
      }
      /* P2.1 — gerçek model ↔ P2.0 primitive fallback.
         GAMEPLAY İKİSİNDE DE AYNIDIR; bu yalnız görsel bir DEV anahtarıdır. */
      if (this.hit(p, this.camBtn(6, 'model_glb'))) {
        if (!this.three.archerGlbAvailable) { this.say('Archer GLB yüklü değil'); return true; }
        const on = this.three.toggleArcher(!this.three.usingArcherGlb);
        this.say(on ? 'Oyuncu: GERÇEK GLB' : 'Oyuncu: PRIMITIVE fallback');
        return true;
      }
      /* P2.2 — mutant mob modeli ↔ P2.0 silindir fallback. */
      if (this.hit(p, this.camBtn(7, 'mob_glb'))) {
        if (!this.three.mutantGlbAvailable) { this.say('Mutant GLB yüklü değil'); return true; }
        const on = this.three.toggleMutant(!this.three.usingMutantGlb);
        this.say(on ? 'Mob: GERÇEK MUTANT' : 'Mob: SİLİNDİR fallback');
        return true;
      }
      /* P2.4 — gerçek ok modeli ↔ primitive silüet. */
      if (this.hit(p, this.camBtn(8, 'arrow_glb'))) {
        if (!this.three.arrowGlbAvailable) { this.say('Ok GLB yüklü değil'); return true; }
        const on = this.three.toggleArrow(!this.three.usingArrowGlb);
        this.say(on ? 'Ok: GERÇEK MODEL' : 'Ok: PRIMITIVE silüet');
        return true;
      }
      }
    }
    if (this.hit(p, this.testGearBtn())) {
      const r = this.S.giveTestGear();
      this.say(r.given > 0
        ? `${r.given} ekipman · ${r.equipped} kuşanıldı · ${r.ground} yerde`
        : 'Çanta dolu');
      return true;
    }
    if (this.hit(p, this.lootLifeToggle())) {
      const cur = this.S.worldLoot.tuning.lootLifetimeSec;
      const i = LOOT_LIFETIME_OPTIONS.indexOf(cur as 15);
      const next = LOOT_LIFETIME_OPTIONS[((i < 0 ? -1 : i) + 1) % LOOT_LIFETIME_OPTIONS.length]!;
      this.S.worldLoot.tuning.lootLifetimeSec = next;
      this.S.drops.tuning.lootLifetimeSec = next;
      this.say(`Loot ömrü: ${next} sn`);
      return true;
    }
    return false;
  }

  /** Ayar ekranı — hepsi Genie ayar nesnesini değiştirir, kural HESAPLAMAZ. */
  private handleGenieSettings(p: PointerEventInfo): void {
    const g = this.S.genie.settings;
    const step = (list: number[], cur: number, dir: number): number => {
      const i = list.indexOf(cur);
      const next = i < 0 ? 0 : Math.min(list.length - 1, Math.max(0, i + dir));
      return list[next];
    };
    if (this.hit(p, this.genieCloseBtn())) { this.genieOpen = false; return; }
    for (const t of this.genieTabs()) {
      if (this.hit(p, t)) {
        this.genieTab = t.id === 'gs_tab_sets' ? 'sets' : t.id === 'gs_tab_bar' ? 'bar' : 'general';
        return;
      }
    }
    if (this.genieTab === 'bar') {
      for (const b of this.genieBarButtons()) {
        if (!this.hit(p, b)) continue;
        if (b.id.startsWith('bar_slot_')) { this.editingBarSlot = Number(b.id.slice(9)); return; }
        if (b.id.startsWith('bar_clear_')) { this.S.skills.setSlot(Number(b.id.slice(10)), null); return; }
        if (b.id.startsWith('bar_pick_')) {
          const ok = this.S.skills.setSlot(this.editingBarSlot, Number(b.id.slice(9)));
          if (!ok) this.say('Bu skill bara konulamadı');
          return;
        }
      }
      return;
    }
    if (this.genieTab === 'general') {
      for (const row of this.genieGeneralRows()) {
        for (const b of [row.minus, row.plus, row.toggle]) {
          if (!b || !this.hit(p, b)) continue;
          const dir = b.id.endsWith('_minus') ? -1 : 1;
          if (b.id.startsWith('gs_range')) g.attackRange = step(ATTACK_RANGES, g.attackRange, dir);
          else if (b.id.startsWith('gs_burst')) g.autoBurstRange = step(BURST_RANGES, g.autoBurstRange, dir);
          else if (b.id.startsWith('gs_farmr')) g.farmBoundaryRadius = step(FARM_BOUNDARY_RANGES, g.farmBoundaryRadius, dir);
          else if (b.id === 'gs_farm_toggle') g.farmBoundaryEnabled = !g.farmBoundaryEnabled;
          else if (b.id === 'gs_farm_show') g.showFarmBoundary = !g.showFarmBoundary;
          else if (b.id === 'gs_loot_mode') this.S.lootPolicy.toggleMode();
          else if (b.id === 'gs_forced_set') {
            /* OTOMATİK → Set 1 → Set 2 → Set 3 → OTOMATİK */
            g.forcedSet = g.forcedSet === null ? 0 : (g.forcedSet === 2 ? null : ((g.forcedSet + 1) as SetId));
            this.S.genie.resetCursors();
          }
          else if (b.id === 'gs_hp_potion') g.hpPotionRef = this.cyclePotion(g.hpPotionRef, 'hp');
          else if (b.id === 'gs_mp_potion') g.mpPotionRef = this.cyclePotion(g.mpPotionRef, 'mp');
          else if (b.id.startsWith('gs_hp')) g.hpThresholdPct = step(HP_THRESHOLDS, g.hpThresholdPct, dir);
          else if (b.id.startsWith('gs_mp')) g.mpThresholdPct = step(MP_THRESHOLDS, g.mpThresholdPct, dir);
          else if (b.id === 'gs_priority') {
            const i = TARGET_PRIORITIES.indexOf(g.targetPriority);
            g.targetPriority = TARGET_PRIORITIES[(i + 1) % TARGET_PRIORITIES.length];
          }
          return;
        }
      }
      return;
    }
    for (const b of this.genieSetButtons()) {
      if (!this.hit(p, b)) continue;
      if (b.id.startsWith('gs_set_')) { this.editingSet = Number(b.id.slice(7)) as SetId; return; }
      if (b.id === 'gs_mode') {
        const modes = g.modes;
        modes[this.editingSet] = modes[this.editingSet] === 'priority' ? 'sequence' : 'priority';
        this.S.genie.resetCursors();      // mod değişince rotasyon baştan başlar
        return;
      }
      if (b.id.startsWith('gs_del_')) {
        g.sets[this.editingSet].splice(Number(b.id.slice(7)), 1);
        return;
      }
      if (b.id.startsWith('gs_add_')) {
        const seq = g.sets[this.editingSet];
        /* AYNI SKILL TEKRAR EKLENEBİLİR — bilinçli tasarım kararı. */
        if (seq.length >= MAX_SET_SKILLS) { this.say(`En fazla ${MAX_SET_SKILLS} skill`); return; }
        seq.push(Number(b.id.slice(7)));
        return;
      }
    }
  }

  /** MANUEL toplama. Sahiplik + mesafe + envanter kapıları
   *  `WorldLootSystem` içindedir; burada yalnız geri bildirim verilir.
   *  Oyuncu ASLA otomatik yürütülmez (§10). */
  private pickup(lootUid: number): void {
    const res = this.S.worldLoot.pickup(
      lootUid, this.S.drops.tuning.ownerPlayerId, this.S.world.worldX, this.S.world.worldY,
    );
    if (res.ok) {
      this.say(res.kind === 'coin'
        ? `+${res.quantity} altın`
        : Content.item(res.itemRef)?.displayName ?? 'Eşya alındı');
      this.host.audio.play('loot');
      return;
    }
    const label: Record<string, string> = {
      inventoryFull: 'Çanta dolu', outOfRange: 'Çok uzak',
      notOwner: 'Bu senin ganimetin değil', alreadyClaimed: 'Zaten alındı', missing: 'Bulunamadı',
    };
    this.say(label[res.reason] ?? 'Bulunamadı');
  }

  /* ---------------- manuel saldırı ---------------- */
  private press(id: string): void {
    const target = this.S.targets.current(this.ents(), this.S.world.worldX, this.S.world.worldY, {
      pickRadius: this.S.ranges.pickRadius, dropDistance: this.S.ranges.targetDropDistance,
    });
    const slot = Number(id.replace('slot_', ''));
    const ref = this.S.combat.skills.slots()[slot]?.def?.sourceRef ?? null;
    const res = ref === null
      ? ({ ok: false, reason: 'emptySlot' } as const)
      : this.S.performSkill(ref, target, this.ents());   // başarılıysa cast anim tetiklenir
    if (!res.ok) {
      const msg: Record<string, string> = {
        range: 'Menzil dışı', noTarget: 'Hedef seç', mana: 'Mana yetersiz', cooldown: 'Skill hazır değil',
        busy: 'Karakter hazır değil', levelReq: 'Seviye yetersiz', noWeapon: 'Silah gerek',
        emptySlot: 'Boş slot', dead: 'Öldün', unknown: '—',
      };
      this.say(msg[res.reason] ?? '—');
      return;
    }
    /* P1.4 — CAST KABUL EDİLDİ. Hasar YOK: ok release'te doğar, impact'te vurur.
       Buradan sonra hiçbir HP mutasyonu YAPILMAZ. */
    this.host.audio.play('skill');
    this.noteCast(res, target);
  }

  /** Kabul edilen cast'i telemetriye yazar (hasar henüz uygulanmadı). */
  private noteCast(
    res: Extract<WorldSkillResult, { ok: true }>, target: WorldMob | null,
  ): void {
    this.lastCast = {
      castId: res.accepted.castId,
      skillRef: res.skillRef,
      label: skillName(res.skillRef),
      acceptedAt: res.accepted.acceptedAt,
      releaseAt: res.accepted.releaseAt,
      releasedAt: null, impactAt: null,
      projectiles: res.accepted.projectileCount,
      targetHits: null, impactsDone: 0,
      damage: 0, physical: 0, elemental: 0,
      distance: target ? Math.round(this.S.adapter.distance(this.S.world, target)) : null,
      travelDistance: null, invalid: null,
      breakdown: res.breakdown,
    };
  }


  /** RELEASE — oklar yaydan çıktı. Hasar HÂLÂ uygulanmadı; yalnız görsel + telemetri. */
  private onRelease(ev: ReleaseEvent): void {
    if (ev.resolution && this.showRays) this.S.projectiles.spawnRays(ev.resolution);
    if (this.lastCast && this.lastCast.castId === ev.castId) {
      this.lastCast.releasedAt = ev.releasedAt;
      this.lastCast.targetHits = ev.targetHitCount;
      this.lastCast.projectiles = ev.totalProjectileCount;
      this.lastCast.travelDistance = ev.projectiles[0]?.travelDistance ?? null;
    }
    if (ev.totalProjectileCount > 1) {
      const side = ev.sideHitCount > 0 ? ` | yan ${ev.sideHitCount}` : '';
      this.S.genie.setLastMultiShot(
        `hedef ${ev.targetHitCount}/${ev.totalProjectileCount}${side} (release)`,
      );
    }
  }

  /** IMPACT — hasar BURADA uygulanmıştır (adapter'da). Scene yalnız gösterir. */
  private onImpact(ev: ImpactEvent): void {
    if (this.lastCast && ev.skillRef === this.lastCast.skillRef) {
      const c = this.lastCast;
      c.impactsDone++;
      if (c.impactAt === null) c.impactAt = ev.impactAt;
      c.damage += ev.damage;
      c.physical += ev.physicalDamage;
      c.elemental += ev.elementalDamage;
      if (ev.invalid && ev.invalid !== 'miss') c.invalid = ev.invalid;
    }
    this.impactFx.push({ x: ev.worldX, y: ev.worldY, hit: ev.invalid === null, life: 0.22 });
    if (ev.invalid !== null || !ev.target) return;         // ıska / ölü hedef → mutasyon yok
    this.onHit(ev.target, ev.damage, ev.fxColor);
    if (ev.statusesApplied > 0) {
      this.host.fx.floatText(this.projX(ev.target.worldX), this.projY(ev.target.worldY) - 92,
        'Zehir', { color: '#7fa85c', size: 13 });
    }
  }

  private onHit(mob: WorldMob, damage: number, color: string): void {
    this.S.world.facing = mob.worldX >= this.S.world.worldX ? 1 : -1;
    this.S.world.facingAngle = Math.atan2(mob.worldY - this.S.world.worldY, mob.worldX - this.S.world.worldX);
    this.host.fx.floatText(this.projX(mob.worldX), this.projY(mob.worldY) - 70, String(damage), { color, size: 20 });
    this.host.audio.play('attack');
  }

  /** Ölüm GÖRSELİ. Ödül/loot/respawn kararı `PrototypeState.reapDead()`
   *  içindedir (tek gameplay kapısı); burada yalnız tepki verilir. */
  private onKillFx(ev: KillEvent): void {
    const mob = ev.mob;
    this.host.fx.floatText(this.projX(mob.worldX), this.projY(mob.worldY) - 110,
      `+${ev.exp} XP`, { color: '#6f8fd0', size: 15 });
    this.host.audio.play('hit');
  }

  /** Tek ölüm kapısı: hangi yoldan ölürse ölsün (temel/skill/çok-ok/DoT/Genie)
   *  ödül ve respawn `PrototypeState.reapDead()` içinde BİR KEZ çözülür. */
  private reapDead(): void {
    for (const { kill, drop } of this.S.reapDead()) {
      this.onKillFx(kill);
      this.onDropFx(drop);
    }
  }

  /** Drop GÖRSELİ. Teslimat kararı `DropSystem` içindedir. */
  private onDropFx(ev: DropEvent): void {
    const sx = this.projX(ev.worldX), sy = this.projY(ev.worldY);
    for (const r of ev.records) {
      if (r.delivery === 'AUTO_INVENTORY') {
        /* uçuş efekti: mobun ölüm noktasından oyuncuya */
        this.lootFlights.push({ x: ev.worldX, y: ev.worldY, itemRef: r.itemRef, t: 0 });
      }
      this.host.fx.floatText(sx, sy - 130,
        r.kind === 'coin' ? `+${r.quantity} altın` : r.itemName,
        { color: r.delivery === 'AUTO_INVENTORY' ? '#e8d9a0' : '#a89878', size: 13 });
    }
    if (ev.coinDelivery === 'AUTO_INVENTORY' && ev.coin > 0) {
      this.host.fx.floatText(sx, sy - 150, `+${ev.coin} altın`, { color: '#e8d9a0', size: 13 });
    }
    if (ev.records.length > 0) this.host.audio.play('loot');
    this.logLine(`${ev.monsterName}#${ev.mobUid} → ${ev.records.length} drop · ${ev.coin} altın`);
  }

  /* ---------------- Genie eylemleri ---------------- */
  private applyGenieActions(actions: GenieAction[]): void {
    this.S.applyAnimFor(actions);        // Genie, manuel saldırıyla AYNI görsel tetiği kullanır
    for (const a of actions) {
      if (a.kind === 'potion') {
        this.host.fx.floatText(this.projX(this.S.world.worldX), this.projY(this.S.world.worldY) - 130, a.label,
          { color: a.potion === 'hp' ? '#7fa85c' : '#6f8fd0', size: 16 });
        /* §12 — clamp yüzünden ZİYAN olan kısım telemetride görünür. */
        this.lastPotion = a;
        this.logLine(
          `${a.potion.toUpperCase()} +${a.restoreAmount}: ${a.before} → ${a.after}`
          + ` (gerçek +${a.actual}${a.wasted > 0 ? `, ziyan ${a.wasted}` : ''}) | kalan ${a.remaining}`,
        );
        this.host.audio.play('loot');
      } else if (a.kind === 'potionEmpty') {
        /* §13 — envanter mutasyonu YOK, başka iksir KULLANILMAZ. */
        this.say(a.label);
        this.logLine(`Genie: ${a.label}`);
      } else if (a.kind === 'skill') {
        /* §14 — Genie de MANUEL oyuncuyla AYNI pipeline'ı kullanır: burada
           hiçbir hasar uygulanmaz, yalnız cast telemetrisi yazılır. */
        this.host.audio.play('skill');
        this.noteCast(
          { ok: true, skillRef: a.skillRef, accepted: {
            castId: a.castId, skillRef: a.skillRef, targetUid: a.target.uid,
            acceptedAt: this.S.adapter.pipeline.time, releaseAt: this.S.adapter.pipeline.time,
            projectileCount: a.projectileCount,
            isMultiShot: this.S.adapter.isMultiShot(a.skillRef),
          }, breakdown: EMPTY_BREAKDOWN },
          a.target,
        );
      }
    }
  }

  /* ---------------- update ---------------- */
  update(dt: number): void {
    this.fpsAvg += ((dt > 0 ? 1 / dt : 60) - this.fpsAvg) * Math.min(1, dt * 3);
    /* ═══ P1.5 §13 — HAREKET ÖNCELİĞİ: İKİ VEKTÖR ASLA TOPLANMAZ ═══
       Joystick dead-zone üstündeyse O KARE manuel hareket uygulanır ve Genie'nin
       otomatik vektörü UYGULANMAZ (Genie durdurulmaz, sadece o kare pas geçer).
       Joystick bırakılınca Genie kaldığı yerden yürümeye devam eder.
       Böylece "manuel + otomatik toplanıp çift hız" davranışı imkânsızdır. */
    /* ═══ P2.26 — ÖLÜ KARAKTER HAREKET ETMEZ, SALDIRMAZ ═══
       Oyun testi bulgusu: ölüm ekranı açıkken TAMAM'a basılmadan
       saldırı devam ediyordu. Sebep: ölüm YALNIZ ekranı açıyordu,
       gameplay döngüsünü durdurmuyordu. Joystick, Genie ve cast
       zinciri çalışmaya devam ediyordu.

       Ölü karakterin hareketi ve saldırısı kesilir; mob AI, ceset
       süresi ve respawn AKMAYA DEVAM EDER (dünya durmaz). */
    const dead = this.deathOpen || !this.S.player.alive;
    const mv = dead
      ? { x: 0, y: 0, magnitude: 0 }
      : this.cameraRelative(resolveJoystick(this.stick));
    const genieIntent = dead
      ? { x: 0, y: 0, magnitude: 0 }
      : this.S.genie.movementIntent(this.ents(), this.S.world);
    if (mv.magnitude > 0) {
      this.movementSource = 'MANUAL';
      this.S.movement.move(this.S.world, mv, dt);
    } else if (genieIntent.magnitude > 0) {
      this.movementSource = 'GENIE';
      /* AYNI hareket sistemi, AYNI hız (Attack Move çarpanı dahil). */
      this.S.movement.move(this.S.world, genieIntent, dt);
      /* §9 — Genie oyuncuyu farm sınırı DIŞINA çıkaramaz. */
      this.S.genie.clampPlayer(this.S.world);
    } else {
      this.movementSource = 'NONE';
      this.S.movement.move(this.S.world, mv, dt);      // moving=false için
    }
    /* P2.19.1 — SAVAŞTA YÖN HEDEFE KİLİTLİ. Hareketten SONRA uygulanır:
       hareket sistemi `facingAngle`i vektörden yazar, hedef varsa onu
       hedefe çeviririz. Hedef yoksa kilit çözülür ve yön yine harekete
       döner. */
    {
      const t = this.S.targets.current(this.ents(), this.S.world.worldX, this.S.world.worldY, {
        pickRadius: this.S.ranges.pickRadius, dropDistance: this.S.ranges.targetDropDistance,
      });
      if (t) this.S.faceTarget(t);
      else this.S.anim.releaseCombatFacing();
    }
    this.S.player.update(dt);
    /* P2.32 — iksir bekleme sayaçları. Panel açıkken de akar: bekleme
       oyuncunun ilgisine değil GEÇEN SÜREYE bağlıdır. */
    this.S.potions.update(dt);
    this.S.updateInfiniteMp();      // TEST: sonsuz MP (varsayılan kapalı)
    this.S.combat.update(dt);
    /* Ölüyken devam eden cast/ok zinciri KESİLİR — havadaki oklar da
       düşer, yoksa oyuncu öldükten sonra hasar vermeye devam eder. */
    if (dead) this.S.adapter.cancelAction();
    this.S.adapter.updateAction(dt);     // attack recovery (cooldown DEĞİL)
    /* P1.4 — İKİ FAZLI COMBAT: release + projectile + IMPACT.
       Hasar YALNIZ burada uygulanır. Manuel oyuncu ve Genie AYNI yol (§14). */
    {
      const out = this.S.stepCombat(dt, this.ents());
      for (const r of out.releases) this.onRelease(r);
      for (const i of out.impacts) this.onImpact(i);
    }
    /* P1.6 — MOB AI: durum makinesi + saldırı çevrimi tek çağrıda.
       Saldırı hasarı `MobAttackProfile` içinde uygulanır (Scene'de formül YOK). */
    for (const h of this.S.mobs.update(dt, this.S.world)) {
      this.host.fx.floatText(this.projX(this.S.world.worldX), this.projY(this.S.world.worldY) - 100,
        `-${h.damage}`, { color: '#c96a5a', size: 17 });
    }
    this.S.worldLoot.update(dt);
    this.S.projectiles.update(dt);
    for (let i = this.impactFx.length - 1; i >= 0; i--) {
      this.impactFx[i]!.life -= dt;
      if (this.impactFx[i]!.life <= 0) this.impactFx.splice(i, 1);
    }
    /* GÖRSEL DURUM: hareket YALNIZ idle↔move belirler; saldırı animasyonunu
       ASLA açmaz (saldırı sheet'i yalnız başarılı vuruş/cast ile tetiklenir). */
    this.S.anim.setDead(!this.S.player.alive, this.S.world.worldX, this.S.world.worldY);
    this.S.anim.update(dt, this.S.world.moving, this.S.world.travelled, this.S.world.facingAngle,
      mv.magnitude > 0);      // §3: 0% attack move'da bile joystick yönü izlenir
    /* ayak basışında küçük toz — "yürüyor" hissini veren ikinci ipucu */
    if (this.S.anim.footPlanted) {
      this.host.fx.particles(
        this.projX(this.S.world.worldX), this.projY(this.S.world.worldY),
        { count: 3, color: '#6b6350', speed: 26, lifeSec: 0.33, radius: 2 },
      );
    }

    /* DoT/debuff — ana SkillSystem, SABİT ADIMLI saatle sürülür (P1.6.1). */
    for (const ev of this.S.tickStatuses(dt, this.ents())) {
      const victim = ev.enemy as WorldMob;
      this.host.fx.floatText(this.projX(victim.worldX), this.projY(victim.worldY) - 60, String(ev.damage), { color: ev.fxColor, size: 14 });
    }

    /* ═══ P2.26 — GENIE PANEL AÇIKKEN DE ÇALIŞIR ═══
       Eskiden HERHANGİ bir panel açılınca Genie duruyordu: oyuncu
       çantasını açtığında farm kesiliyor, mob geri kaçıyor, iksir
       içilmiyordu. Oysa Genie'nin bütün amacı ilgilenmeden devam
       edebilmek.

       TEK İSTİSNA: Genie'nin KENDİ ayar ekranı. Orada set ve eşik
       değiştirirken cast etmesi karışıklık yaratır — ayarı yaparken
       sonucunu görmek yerine yarı yarıya eski davranışı görürsün.

       ÖLÜM EKRANI da durdurur: ölü karakter saldıramaz. */
    /* P3.8 — ZİNDANDA GENIE SÜREKLİ AÇIK (kullanıcı kararı): modun
       kendisi otomatik farm üzerine kuruludur. Ayar ekranı yine
       durdurur — orada set değiştirirken cast etmesi karışıklık
       yaratır. */
    /* ═══ P3.11 — SADECE KAPALIYKEN BAŞLAT ═══
       Oyun testi bulgusu: "zindanda hâlâ saldırı yapmıyor". Sebep bu
       satırdı: `start()` her çağrıldığında KARAR SAATİNİ SIFIRLIYOR
       (`accumulator = 0`). Her karede çağırınca sayaç hiçbir zaman
       karar aralığına (0,1 sn) ulaşamıyor ve Genie ÖMÜR BOYU karar
       veremiyordu.

       Kendi eklediğim "Genie sürekli açık" satırı, Genie'yi sonsuza
       kadar susturmuştu. Artık yalnız KAPALIYSA başlatılır. */
    if (this.inDungeon && !this.genieOpen && this.S.player.alive
      && !this.S.genie.enabled) {
      this.S.genie.start(this.S.world);
    }
    if (!this.genieOpen && !this.deathOpen) {
      this.applyGenieActions(this.S.genie.update(dt, this.ents(), this.S.world));
    }

    /* ═══ P3.16 — ÖNCE ÖDÜL, SONRA SÜPÜRME ═══
       `reapDead()` ölen mobun EXP/coin/ganimetini verir. Zindan akışı
       ise temizlenen dalganın cesetlerini listeden siler.

       Sıra tersken ("moblar ölüyor ama EXP gelmiyor" bulgusu) ölen mob
       ödülü verilmeden listeden çıkıyor ve kazanç buharlaşıyordu. */
    this.reapDead();

    /* Normal dünyada `dungeon` null olduğu için bu çağrı hiçbir şey
       yapmaz; zindan kuralları oraya sızamaz. */
    this.tickDungeon();

    /* ═══ P2.0 — THREE KATMANI: gameplay'den SONRA, YALNIZ OKUR ═══
       Bu çağrı gameplay durumuna hiçbir şey yazmaz; renderer kapalıysa
       (headless/2D) hiç çalışmaz ve sonuçlar değişmez (§26). */
    if (this.three3dActive) {
      /* P2.9/P2.19 — ZOOM ve MOD: çarpan her karede MODUN TABAN ayarına
         uygulanır, bir önceki değere DEĞİL — yoksa zoom sürüklenir.
         Yaw ayrıca yumuşatılır: üçüncü şahısta kamera karakterin arkasında
         durur ve dönüş anında değil, yaklaşarak gerçekleşir. */
      const base = baseTuning(this.camMode);
      const camTarget = this.S.targets.current(
        this.ents(), this.S.world.worldX, this.S.world.worldY,
        { pickRadius: this.S.ranges.pickRadius, dropDistance: this.S.ranges.targetDropDistance },
      );
      this.camYaw = approachYaw(this.camYaw, modeYaw(this.camMode, {
        targetAngle: camTarget
          ? Math.atan2(camTarget.worldY - this.S.world.worldY,
            camTarget.worldX - this.S.world.worldX)
          : null,
        steering: this.stickPointer !== null,
        facingAngle: this.S.world.facingAngle,
        currentYaw: this.camYaw,
      }), dt);
      Object.assign(this.three!.tuning, base, applyZoom(base, this.zoom), {
        yawDeg: this.camMode === 'third' ? this.camYaw : base.yawDeg,
      });
      this.three!.update(buildWorldFrame(this.S), dt);
      this.three!.render();
    }
    /* uzaktan toplanan ganimetin uçuşu (yalnız görsel; envanter zaten güncellendi) */
    for (const f of this.lootFlights) f.t += dt * 2.6;
    this.lootFlights = this.lootFlights.filter((f) => f.t < 1);

    const target = this.S.targets.current(this.ents(), this.S.world.worldX, this.S.world.worldY, {
      pickRadius: this.S.ranges.pickRadius, dropDistance: this.S.ranges.targetDropDistance,
    });
    this.S.camera.update({
      playerX: this.S.world.worldX, playerY: this.S.world.worldY,
      dirX: mv.x * mv.magnitude, dirY: mv.y * mv.magnitude,
      targetX: target?.worldX ?? null, targetY: target?.worldY ?? null,
    }, dt);

    if (this.noticeTimer > 0) this.noticeTimer -= dt;

    /* P2.15 — OTOMATİK KAYIT.
       Her karede yazmak localStorage'ı boğar; `AUTOSAVE_SEC` aralıkla
       yazılır. Ayrıca seviye atlayınca HEMEN yazılır — en çok canı yakan
       kayıp odur. Kayıt gameplay'i etkilemez; yazma başarısız olsa bile
       oyun devam eder. */
    this.autosaveTimer -= dt;
    if (this.S.player.level !== this.lastSavedLevel) {
      this.lastSavedLevel = this.S.player.level;
      this.autosaveTimer = 0;
    }
    if (this.autosaveTimer <= 0) {
      this.autosaveTimer = AUTOSAVE_SEC;
      this.S.saveNow();
    }
    /* P2.13 — oto giy olayını yakala ve bildirim şeridini süre ile söndür. */
    /* P2.21 — tamamlanan görev bildirimi. */
    if (this.S.lastQuests.length > 0) {
      const q = this.S.lastQuests.shift()!;
      this.say(q.promoted
        ? `${q.quest.title} tamam · SINIF YÜKSELDİ · +${q.exp} EXP`
        : `${q.quest.title} tamam · +${q.exp} EXP · +${q.coins} altın`);
      this.noticeTimer = 4;
    }
    const up = this.S.lastUpgrade;
    if (up) {
      this.powerToast = {
        name: up.displayName, before: up.scoreBefore, after: up.scoreAfter, t: POWER_TOAST_SEC,
      };
      this.S.lastUpgrade = null;
    }
    if (this.powerToast) {
      this.powerToast.t -= dt;
      if (this.powerToast.t <= 0) this.powerToast = null;
    }
    /* P2.22 — ÖLÜM EKRANI. Eskiden ölüm sessizce ve anında geri
       dönüşle geçiştiriliyordu; oyuncu ne olduğunu görmüyordu.
       Artık ekran durur, bildirim çıkar ve TAMAM'a basınca doğuş
       noktasına ışınlanılır. */
    /* P3.8 — ZİNDANDA ölüm ekranı AÇILMAZ: kat düşüşü `tickDungeon`
       tarafından işlenir ve oyuncu akışta kalır. İki sistemin birden
       devreye girmesi oyuncuyu iki kez cezalandırırdı. */
    if (!this.S.player.alive && !this.deathOpen && !this.inDungeon) {
      this.deathOpen = true;
      this.deathAt = { x: this.S.world.worldX, y: this.S.world.worldY };
    }
  }

  /* ---------------- render ---------------- */
  render(g: DrawApi): void {
    if (this.three3dActive) {
      /* §21 — DÜNYA KATMANI Three canvas'ındadır; 2D katman yalnız HUD
         overlay'idir ve ŞEFFAF temizlenir ki 3D altından görünsün. */
      this.overlayCtx?.clearRect(0, 0, PROTO.screenW, PROTO.screenH);
    } else {
      g.clear('#1d2417');
      this.renderGround(g);
      this.renderEntities(g);
      this.renderProjectiles(g);
    }
    this.renderHud(g);
    if (this.devOpen) this.renderDev(g);
    if (this.devOpen && this.balanceOpen) this.renderBalance(g);
    if (this.genieOpen) this.renderGenieSettings(g);
    if (this.invOpen) this.renderInventory(g);
    if (this.charOpen) this.renderCharacter(g);
    if (this.skillOpen) this.renderSkills(g);
    if (this.forgeOpen) this.renderForge(g);
    if (this.inDungeon) this.renderDungeonHud(g);
    if (this.shopOpen) this.renderShop(g);
    if (this.deathOpen) this.renderDeath(g);
    if (this.sellOpen) this.renderSell(g);
  }

  private onScreen(sx: number, sy: number, pad = 160): boolean {
    return sx > -pad && sx < PROTO.screenW + pad && sy > -pad && sy < PROTO.screenH + pad;
  }

  private renderGround(g: DrawApi): void {
    const x0 = this.projX(0), y0 = this.projY(0);
    const x1 = this.projX(WORLD_BOUNDS.width), y1 = this.projY(WORLD_BOUNDS.height);
    g.rect(x0, y0, x1 - x0, y1 - y0, '#2a3520');
    const step = 200;
    for (let x = 0; x <= WORLD_BOUNDS.width; x += step) {
      const sx = this.projX(x);
      if (sx < -20 || sx > PROTO.screenW + 20) continue;
      g.rect(sx, Math.max(y0, 0), 1, Math.min(y1, PROTO.screenH) - Math.max(y0, 0), '#33402a', 0.5);
    }
    for (let y = 0; y <= WORLD_BOUNDS.height; y += step) {
      const sy = this.projY(y);
      if (sy < -20 || sy > PROTO.screenH + 20) continue;
      g.rect(Math.max(x0, 0), sy, Math.min(x1, PROTO.screenW) - Math.max(x0, 0), 1, '#33402a', 0.5);
    }
    for (const r of ROADS) {
      const rx = this.projX(r.x), ry = this.projY(r.y);
      const rw = r.w, rh = r.h * this.S.tuning.get('worldYCompression');
      if (!this.onScreen(rx + rw / 2, ry + rh / 2, 400)) continue;
      g.rect(rx, ry, rw, rh, '#5a5238', 0.55);
    }
    /* P1.6 — SPAWN SLOTLARI: her slot TEK mobun sabit evidir. Roam yarıçapı
       ve AI tipi (renk) görünür; küme/spawn kutusu artık YOK. */
    for (const s of this.S.mobs.slotConfigs()) {
      const sx = this.projX(s.homeX), sy = this.projY(s.homeY);
      if (!this.onScreen(sx, sy, 420)) continue;
      const prof = profileFor(s, s.aiType);
      const comp = this.S.tuning.get('worldYCompression');
      const tint = s.aiType === 'ELITE' ? '#7a5228'
        : s.aiType === 'AGGRESSIVE' ? '#5a2f2a' : '#3b2f22';
      const rr = prof.roamRadius;
      g.rect(sx - rr, sy - rr * comp, rr * 2, rr * 2 * comp, tint, 0.30);
      if (this.showRays) {
        const ar = prof.aggroRadius * this.S.tuning.get('aggroRadiusMult');
        if (ar > 0) {
          for (let i = 0; i < 40; i++) {
            const a = (i / 40) * Math.PI * 2;
            g.circle(sx + Math.cos(a) * ar, sy + Math.sin(a) * ar * comp, 1.4, '#c96a5a', 0.45);
          }
        }
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          g.circle(sx + Math.cos(a) * prof.leashRadius,
            sy + Math.sin(a) * prof.leashRadius * comp, 1.2, '#6f8fd0', 0.28);
        }
      }
      g.circle(sx, sy, 3, '#8d8272', 0.8);
      g.text(`${s.displayName} · ${s.aiType}`, sx, sy - rr * comp - 12,
        { align: 'center', size: 12, color: '#8d8272' });
    }

    /* İKİ AYRI HALKA — birbirine karışmasın diye renk + çizgi tipi farklı:
         · SABİT turuncu KESİKLİ halka  = Farm Boundary (BAŞLAT konumunda durur)
         · HAREKETLİ mavi SIK noktalı halka = Attack Range (oyuncu merkezli) */
    const gs = this.S.genie.settings;
    const comp = this.S.tuning.get('worldYCompression');
    const ring = (
      cx: number, cy: number, r: number, dots: number,
      color: string, alpha: number, size: number, dashed: boolean,
    ): void => {
      for (let i = 0; i < dots; i++) {
        if (dashed && i % 3 === 2) continue;                 // kesikli çizgi hissi
        const a = (i / dots) * Math.PI * 2;
        const sx = this.projX(cx + Math.cos(a) * r);
        const sy = this.projY(cy + Math.sin(a) * r);
        if (!this.onScreen(sx, sy, 40)) continue;
        g.circle(sx, sy, size, color, alpha);
      }
    };

    const fc = this.S.genie.farmCenter;
    if (fc && gs.farmBoundaryEnabled && gs.showFarmBoundary) {
      const on = this.S.genie.enabled;
      ring(fc.x, fc.y, gs.farmBoundaryRadius, 96, on ? '#e08a3c' : '#5b5c58', on ? 0.6 : 0.3, 3.0, true);
      const cx = this.projX(fc.x), cyy = this.projY(fc.y);
      if (this.onScreen(cx, cyy)) {
        g.circle(cx, cyy, 9, on ? '#e08a3c' : '#5b5c58', 0.5);
        g.text('farm merkezi', cx, cyy - 26 * comp, { align: 'center', size: 11, color: '#8d8272' });
      }
    }
    if (this.S.genie.enabled) {
      ring(this.S.world.worldX, this.S.world.worldY, gs.attackRange, 120, '#6f8fd0', 0.5, 2.2, false);
    }
    g.rect(x0 - 4, y0 - 4, x1 - x0 + 8, 4, '#0b0908');
    g.rect(x0 - 4, y1, x1 - x0 + 8, 4, '#0b0908');
    g.rect(x0 - 4, y0, 4, y1 - y0, '#0b0908');
    g.rect(x1, y0, 4, y1 - y0, '#0b0908');
  }

  private renderEntities(g: DrawApi): void {
    interface Drawable { worldY: number; draw: () => void }
    const list: Drawable[] = [];

    for (const o of OBSTACLES) {
      const sx = this.projX(o.x), sy = this.projY(o.y);
      if (!this.onScreen(sx, sy)) continue;
      list.push({ worldY: o.y, draw: () => {
        const sc = this.depthScale(sy);
        g.circle(sx, sy, o.radius * sc * 0.9, '#0b0908', 0.3);
        if (o.kind === 'tree') {
          g.rect(sx - 5 * sc, sy - 40 * sc, 10 * sc, 40 * sc, '#4a3a26');
          g.circle(sx, sy - 52 * sc, o.radius * sc, '#2f4a24');
          g.circle(sx - 8 * sc, sy - 64 * sc, o.radius * 0.7 * sc, '#3a5a2c');
        } else {
          g.circle(sx, sy - 12 * sc, o.radius * 0.85 * sc, '#5b5c58');
          g.circle(sx - 7 * sc, sy - 20 * sc, o.radius * 0.5 * sc, '#6d6e69');
        }
      } });
    }

    for (const l of this.S.worldLoot.items) {
      const sx = this.projX(l.worldX), sy = this.projY(l.worldY);
      if (!this.onScreen(sx, sy)) continue;
      list.push({ worldY: l.worldY, draw: () => {
        const blink = l.life < 6 ? 0.45 + 0.55 * Math.abs(Math.sin(l.life * 6)) : 1;
        g.circle(sx, sy, 13, '#0b0908', 0.5 * blink);
        const item = Content.item(l.itemRef);
        if (item && this.host.assets.has(item.iconKey)) {
          g.image(item.iconKey, sx, sy - 6, { w: 26, h: 26, originX: 0.5, originY: 0.5, alpha: blink });
        } else g.circle(sx, sy - 6, 8, '#e8d9a0', blink);
      } });
    }

    const targetUid = this.S.targets.selectedUid;
    const compression = this.S.tuning.get('worldYCompression');
    for (const m of this.S.mobs.mobs) {
      if (m.ai === 'dead' && m.deathTimer > 1.1) continue;
      const sx = this.projX(m.worldX), sy = this.projY(m.worldY);
      if (!this.onScreen(sx, sy)) continue;
      const cfg = this.S.mobs.slotConfigs().find((s) => s.id === m.slotId);
      list.push({ worldY: m.worldY, draw: () => {
        const sc = this.depthScale(sy) * this.S.tuning.get('characterScale') * (cfg?.visual.scale ?? 0.6);
        const dying = m.ai === 'dead';
        const alpha = dying ? Math.max(0, 1 - m.deathTimer / 1.1) : 1;
        g.circle(sx, sy, 30 * sc, '#000', 0.28 * alpha);
        /* DEV: gameplay hitbox (combatRadius) — sprite genişliğinden bağımsızdır */
        if (this.showRays && !dying) {
          for (let i = 0; i < 28; i++) {
            const a = (i / 28) * Math.PI * 2;
            g.circle(sx + Math.cos(a) * m.combatRadius, sy + Math.sin(a) * m.combatRadius * compression,
              1.6, '#6f8fd0', 0.5);
          }
        }
        if (targetUid === m.uid && !dying) {
          g.circle(sx, sy, 40 * sc, '#e08a3c', 0.3);
          g.circle(sx, sy, 26 * sc, '#1d2417', 0.0);
        }
        const sheet = dying ? 'kd_kurt_o' : m.state === 'attack' ? 'kd_kurt_s' : 'kd_kurt_k';
        const frame = dying
          ? Math.min(5, Math.floor(m.deathTimer * 6))
          : Math.floor(m.animT * 9) % 6;
        if (this.host.assets.has(sheet)) {
          g.image(sheet, sx, sy + 8, {
            sx: frame * KURT_FRAME, sy: KURT_ROW_LEFT * KURT_FRAME, sw: KURT_FRAME, sh: KURT_FRAME,
            w: KURT_FRAME * sc, h: KURT_FRAME * sc,
            originX: 0.5, originY: 1, flipX: m.facing === 1, alpha,
          });
        }
        if (!dying && m.hp < m.maxHp) {
          const bw = 44 * sc;
          g.rect(sx - bw / 2, sy - 92 * sc, bw, 5, '#241c14');
          g.rect(sx - bw / 2, sy - 92 * sc, bw * (m.hp / m.maxHp), 5, '#c96a5a');
        }
        if (m.monster.tier === 'elite' && !dying) {
          g.text('ELİT', sx, sy - 106 * sc, { align: 'center', size: 11, bold: true, color: '#e0c060' });
        }
      } });
    }

    const anim = this.S.anim;
    /* ÖLÜM ÇAPASI: ölüyken çizim ölüm ANINDAKİ zemin noktasına oturur.
       Yatan sprite farklı genişlik/yükseklikte olsa bile karakter kaymaz. */
    const anchorX = anim.deathAnchorX ?? this.S.world.worldX;
    const anchorY = anim.deathAnchorY ?? this.S.world.worldY;
    const px = this.projX(anchorX), py = this.projY(anchorY);
    list.push({ worldY: anchorY, draw: () => {
      const sc = this.depthScale(py) * this.S.tuning.get('characterScale');
      /* gölge: FALLBACK'te basışta genişler; ATLAS modunda nabız YOK (sabit 1). */
      g.circle(px, py, 26 * sc * anim.shadowScale, '#000', 0.3 * (0.7 + 0.3 * anim.shadowScale));

      const atlasKey = ARCHER_ATLAS_KEY[anim.clip];
      if (anim.atlasActive && this.host.assets.has(atlasKey)) {
        /* ---- ATLAS MODU ----
           satır = yön (AÇIK eşleme tablosu), sütun = klip karesi.
           Spec §8: renderer hop/bob/bounce/squash UYGULAMAZ — dikey hareket
           gerçek karelerin içindedir. Bu yüzden burada hiçbir sahte ofset yok. */
        const meta = anim.meta;
        const drawH = meta.frameHeight * sc * OKCU_DRAW;
        const pad = (atlasFootPad(meta) / meta.frameHeight) * drawH;
        g.image(atlasKey, px, py + pad, {
          sx: anim.frame * meta.frameWidth,
          sy: atlasRowForAngle(anim.angle) * meta.frameHeight,
          sw: meta.frameWidth, sh: meta.frameHeight,
          w: meta.frameWidth * sc * OKCU_DRAW, h: drawH,
          originX: 0.5, originY: 1, flipX: false,
        });
      } else {
        /* ---- FALLBACK (P1.2.1 davranışı, DEĞİŞMEDİ) ----
           DÜZELTME 1 — kare indeksi hareketten GELMEZ (ok atma sayfası yalnız saldırıda).
           DÜZELTME 2 — ayak hizası: karenin altında 36 px şeffaf pay var.
           DÜZELTME 3 — 8 yönlü sayfa: karakter gittiği/nişan aldığı yöne bakar. */
        const drawH = OKCU_FRAME * sc * OKCU_DRAW;
        const footPad = (OKCU_FOOT_PAD / OKCU_FRAME) * drawH;
        const sheet = okcuSheet(anim.angle);
        const key = this.host.assets.has(sheet) ? sheet : 'gt_okcu_y_sag';
        const hop = anim.hopOffset * sc;
        const sway = anim.swayOffset * sc;
        if (this.host.assets.has(key)) {
          g.image(key, px + sway, py + footPad - hop, {
            sx: anim.frame * OKCU_FRAME, sy: 0, sw: OKCU_FRAME, sh: OKCU_FRAME,
            w: OKCU_FRAME * sc * OKCU_DRAW,
            h: drawH * anim.squashY,
            originX: 0.5, originY: 1,
            /* 8 yönlü sayfa varsa ayna GEREKMEZ; yoksa eski sağ/sol aynası. */
            flipX: key === sheet ? false : this.S.world.facing === -1,
          });
        }
      }
      /* Gameplay FX katmanı: cast halesi. Karakter kareleri element-NÖTR kalır;
         Fire/Poison/iz efektleri buradan gelir, sprite'a pişirilmez. */
      if (anim.state === 'skill') g.circle(px, py - 4 * sc, 34 * sc, '#6f8fd0', 0.16);
    } });

    list.sort((a, b) => a.worldY - b.worldY);
    for (const d of list) d.draw();
  }

  /** Uçan oklar + (opsiyonel) debug ışınları. GÖRSELDİR — isabet zaten çözülmüştür. */
  private renderProjectiles(g: DrawApi): void {
    if (this.showRays) {
      for (const r of this.S.projectiles.rays) {
        const dots = Math.min(48, Math.max(4, Math.round(r.distance / 22)));
        for (let i = 1; i <= dots; i++) {
          const t = (i / dots) * r.distance;
          const sx = this.projX(r.originX + r.dx * t), sy = this.projY(r.originY + r.dy * t);
          if (!this.onScreen(sx, sy, 30)) continue;
          g.circle(sx, sy - 26, 1.7, r.hit ? '#e0c060' : '#8d8272', 0.45 * (r.life / 0.7));
        }
      }
    }
    for (const f of this.lootFlights) {
      const e = f.t * f.t * (3 - 2 * f.t);                    // smoothstep
      const wx = f.x + (this.S.world.worldX - f.x) * e;
      const wy = f.y + (this.S.world.worldY - f.y) * e;
      const sx = this.projX(wx), sy = this.projY(wy) - 20 - Math.sin(f.t * Math.PI) * 46;
      if (!this.onScreen(sx, sy, 40)) continue;
      const item = Content.item(f.itemRef);
      const alpha = 1 - Math.max(0, f.t - 0.7) / 0.3;
      if (item && this.host.assets.has(item.iconKey)) {
        g.image(item.iconKey, sx, sy, { w: 24, h: 24, originX: 0.5, originY: 0.5, alpha });
      } else g.circle(sx, sy, 7, '#e8d9a0', alpha);
    }
    /* P1.4 — GERÇEK oklar: `CombatPipeline.projectiles`. Bunlar yalnız görsel
       DEĞİLDİR; hasar tam bu okun impact anında uygulanır. Çizim world→screen
       projeksiyonudur; gameplay bu koordinatları KULLANMAZ. */
    for (const a of this.S.adapter.pipeline.projectiles) {
      const pos = CombatPipeline.position(a);
      const sx = this.projX(pos.x), sy = this.projY(pos.y) - 26;
      if (!this.onScreen(sx, sy, 40)) continue;
      const willHit = a.targetUid !== null;
      for (let i = 0; i < 4; i++) {
        const back = i * 9;
        const bx = this.projX(pos.x - a.dirX * back), by = this.projY(pos.y - a.dirY * back) - 26;
        g.circle(bx, by, 2.6 - i * 0.5, willHit ? '#f4e8c8' : '#b8b0a0', 0.9 - i * 0.2);
      }
    }
    /* impact parlaması (kısa ömürlü, yalnız görsel) */
    for (const f of this.impactFx) {
      const sx = this.projX(f.x), sy = this.projY(f.y) - 26;
      if (!this.onScreen(sx, sy, 40)) continue;
      const k = f.life / 0.22;
      if (f.hit) {
        g.circle(sx, sy, 9 * (1.4 - k * 0.4), '#e08a3c', 0.75 * k);
        g.circle(sx, sy, 4, '#f4e8c8', k);
      } else {
        g.circle(sx, sy, 6, '#8d8272', 0.5 * k);
        g.text('ıska', sx, sy - 18, { align: 'center', size: 10, color: '#8d8272', alpha: 0.8 * k });
      }
    }
  }

  /* ═══════════════ P2.6 — HUD (yeni sanat yönü) ═══════════════
     Görseller `data/proto-assets.ts` → `UI_ASSETS`, yerleşim
     `ui/hud-layout.ts`. Bu metot yalnız ÇİZER: hiçbir kutu burada
     hesaplanmaz, dokunma alanları da AYNI kutulardan gelir. */
  private renderHud(g: DrawApi): void {
    const p = this.S.player;
    const f = this.S.stats.finalStats();
    /* P2.6.1 — HUD OPAKLIĞI TEK YERDEN.
       Maket zengin dokulu bir zemin üzerine çizilmişti; bizim arazimiz şu an
       düz ve dokusuz olduğu için altın işlemeler çiğ duruyordu. Bütün HUD
       varlıkları bu çarpanla çiziliyor — tek sayı değiştirilerek ayarlanır. */
    const A = HUD_ALPHA;

    /* ---- oyuncu kartı ---- */
    const pc = HUD_PLAYER_CARD;
    g.image(pc.key, pc.x, pc.y, { w: pc.w, h: pc.h, alpha: A });
    /* ÇUBUKLAR VARLIKTA DOLU BOYALI: eksik kısmı ÖRTERİZ, dolu kısmı
       ÇİZMEYİZ (bkz. ui/hud-layout.ts HUD_BARS notu). */
    const hpR = Math.max(0, Math.min(1, p.hp / f.maxHp));
    const mpR = Math.max(0, Math.min(1, p.mp / f.maxMp));
    const drain = (b: { x: number; y: number; w: number; h: number }, ratio: number): void => {
      if (ratio >= 1) return;
      g.rect(b.x + b.w * ratio, b.y, b.w * (1 - ratio), b.h, '#120d0a', 0.82);
    };
    drain(HUD_BARS.hp, hpR);
    drain(HUD_BARS.mp, mpR);
    g.text(`${Math.round(p.hp)} / ${f.maxHp}`,
      HUD_BARS.hp.x + HUD_BARS.hp.w / 2, HUD_BARS.hp.y + HUD_BARS.hp.h * 0.16,
      { align: 'center', size: 11, bold: true, color: '#f4ece0' });
    g.text(`${Math.round(p.mp)} / ${f.maxMp}`,
      HUD_BARS.mp.x + HUD_BARS.mp.w / 2, HUD_BARS.mp.y + HUD_BARS.mp.h * 0.16,
      { align: 'center', size: 11, bold: true, color: '#e6eefb' });
    g.text(`Sv ${p.level}`, HUD_BARS.levelText.x, HUD_BARS.levelText.y,
      { align: 'center', size: 13, bold: true, color: '#e8d9a0' });

    /* ---- hedef kartı (yalnız hedef varken) ---- */
    const target = this.S.targets.current(this.ents(), this.S.world.worldX, this.S.world.worldY, {
      pickRadius: this.S.ranges.pickRadius, dropDistance: this.S.ranges.targetDropDistance,
    });
    if (target) {
      const tc = HUD_TARGET_CARD;
      g.image(tc.key, tc.x, tc.y, { w: tc.w, h: tc.h, alpha: A });
      const tR = Math.max(0, Math.min(1, target.hp / target.maxHp));
      if (tR < 1) {
        g.rect(HUD_TARGET.bar.x + HUD_TARGET.bar.w * tR, HUD_TARGET.bar.y,
          HUD_TARGET.bar.w * (1 - tR), HUD_TARGET.bar.h, '#120d0a', 0.82);
      }
      g.text(target.monster.displayName, HUD_TARGET.name.x, HUD_TARGET.name.y,
        { align: 'center', size: 12, bold: true, color: '#e8d9a0' });
      g.text(`${Math.round(target.hp)} / ${target.maxHp}`,
        HUD_TARGET.bar.x + HUD_TARGET.bar.w / 2, HUD_TARGET.bar.y + HUD_TARGET.bar.h * 0.14,
        { align: 'center', size: 10, bold: true, color: '#f4ece0' });
    }

    /* ---- Genie anahtarı + ayar ---- */
    const tel = this.S.genie.status(this.ents());
    g.image(HUD_GENIE.key, HUD_GENIE.x, HUD_GENIE.y,
      { w: HUD_GENIE.w, h: HUD_GENIE.h, alpha: tel.enabled ? A : A * 0.55 });
    g.image(HUD_SETTINGS.key, HUD_SETTINGS.x, HUD_SETTINGS.y,
      { w: HUD_SETTINGS.w, h: HUD_SETTINGS.h, alpha: A });

    /* ---- kamera modu ---- */
    g.image(HUD_CAMERA_BTN.key, HUD_CAMERA_BTN.x, HUD_CAMERA_BTN.y,
      { w: HUD_CAMERA_BTN.w, h: HUD_CAMERA_BTN.h, alpha: A });
    g.text(this.camMode === 'third' ? '3Ş' : 'KB',
      HUD_CAMERA_BTN.x + HUD_CAMERA_BTN.w / 2, HUD_CAMERA_BTN.y + HUD_CAMERA_BTN.h * 0.34,
      { align: 'center', size: 11, bold: true, color: '#e8d9a0' });

    /* ---- zindan girişi ---- */
    g.image(HUD_DUNGEON_BTN.key, HUD_DUNGEON_BTN.x, HUD_DUNGEON_BTN.y,
      { w: HUD_DUNGEON_BTN.w, h: HUD_DUNGEON_BTN.h, alpha: A });
    g.text('ZİN', HUD_DUNGEON_BTN.x + HUD_DUNGEON_BTN.w / 2,
      HUD_DUNGEON_BTN.y + HUD_DUNGEON_BTN.h * 0.34,
      { align: 'center', size: 11, bold: true, color: '#c9a05a' });
    /* Varlıkta "GENİE AÇIK" yazısı BOYALIDIR. Kapalı durumu üstüne yazı
       basarak DEĞİL, gri perde + sönük ışıkla gösterilir. */
    if (!tel.enabled) {
      g.rect(HUD_GENIE.x, HUD_GENIE.y, HUD_GENIE.w, HUD_GENIE.h, '#0b0908', 0.45);
    }

    /* ---- güç skoru (sürekli görünür) ---- */
    const power = this.S.autoGear.score();
    g.text(`GÜÇ ${formatPower(power)}`, PROTO.screenW / 2, 96,
      { align: 'center', size: 12, bold: true, color: '#e8d9a0' });

    /* ---- aktif görev ---- */
    const quest = this.S.quests.active();
    if (quest) {
      const pr = this.S.quests.progress(quest)!;
      const parts = quest.objectives.map((o) => {
        const nm = Content.monster(o.monsterRef)?.displayName ?? `#${o.monsterRef}`;
        return `${nm} ${pr.counts[o.monsterRef] ?? 0}/${o.count}`;
      });
      g.text(quest.title, PROTO.screenW / 2, 112,
        { align: 'center', size: 11, bold: true, color: '#c9a05a' });
      g.text(parts.join('   ·   '), PROTO.screenW / 2, 128,
        { align: 'center', size: 10, color: '#8d8272' });
      /* İlerleme çubuğu — tek bakışta ne kadar kaldığı. */
      const bw = 200, bx = PROTO.screenW / 2 - bw / 2;
      g.rect(bx, 144, bw, 4, '#241c14', 0.9);
      g.rect(bx, 144, bw * this.S.quests.ratio(quest), 4, '#c9a05a', 0.95);
    }

    /* ---- oto giy bildirimi ---- */
    if (this.powerToast) {
      const t = this.powerToast;
      const alpha = Math.min(1, t.t / 0.4);
      const ty = 160;
      g.rect(PROTO.screenW / 2 - 120, ty, 240, 34, '#100d08', 0.9 * alpha);
      g.rect(PROTO.screenW / 2 - 120, ty, 240, 2, '#7fa85c', alpha);
      g.text(t.name, PROTO.screenW / 2 - 110, ty + 6,
        { size: 11, bold: true, color: '#e8e0d0', alpha });
      g.text(`${formatPower(t.before)} → ${formatPower(t.after)}`,
        PROTO.screenW / 2 - 110, ty + 20, { size: 10, color: '#8d8272', alpha });
      g.text(formatPowerDelta(t.before, t.after), PROTO.screenW / 2 + 110, ty + 10,
        { align: 'right', size: 15, bold: true, color: '#7fa85c', alpha });
    }

    if (this.noticeTimer > 0) {
      g.text(this.notice, PROTO.screenW / 2, 158, { align: 'center', size: 15, color: '#e8d9a0' });
    }

    /* ---- joystick ---- */
    const jc = this.stickPointer !== null ? this.stickOrigin : PROTO.joystickCenter;
    g.image('ui_joy_base', jc.x, jc.y,
      { w: HUD_JOY_BASE_W, h: HUD_JOY_BASE_W * (306 / 320), originX: 0.5, originY: 0.5, alpha: A * 0.8 });
    const mv = resolveJoystick(this.stick);
    const knobX = jc.x + mv.x * mv.magnitude * PROTO.joystickRadius * 0.62;
    const knobY = jc.y + mv.y * mv.magnitude * PROTO.joystickRadius * 0.62;
    g.image('ui_joy_knob', knobX, knobY,
      { w: HUD_JOY_KNOB_W, h: HUD_JOY_KNOB_W * (141 / 140), originX: 0.5, originY: 0.5, alpha: A * 0.9 });

    /* ---- skill çemberi ----
       COOLDOWN UI KURALI (ARCHER COMBAT V1 §12) DEĞİŞMEDİ:
       · Perde YALNIZ gerçek individual cooldown'da.
       · Action recovery perde DEĞİL, alt kenar çizgisidir. */
    const slots = this.S.combat.skills.slots();
    const busy = this.S.adapter.actionBusy;
    const skillBoxes = hudSkillBoxes();
    this.actionButtons().forEach((b, i) => {
      const s = slots[i];
      const def = s?.def;
      const hasRealCd = (def?.cooldownSec ?? 0) > 0;
      const cdRatio = hasRealCd ? (s?.cooldownRatio ?? 0) : 0;
      /* ═══ P2.31 — İKON SKİLLE, KİLİT DURUMU ÜÇ DEĞERLİ ═══
         Eskiden ikon YUVA KONUMUNA bağlıydı ve kilit yalnız "engelli mi"
         diye bakıyordu; Sv70 skilli ile mana yetersizliği aynı
         görünüyordu. Artık kalıcı kilit (seviye/puan) geçici engelden
         (mana/cooldown) belirgin biçimde AYRI çizilir. */
      const gate: SkillGateState = def
        ? skillGate({
          requiredLevel: def.requiredLevel,
          playerLevel: this.S.player.level,
          unlocked: this.S.stats.progression.isUnlocked(def.sourceRef),
          blocked: s?.blocked ?? null,
        })
        : 'ready';
      const alpha = A * (def ? GATE_ALPHA[gate] : 0.3);
      const iconKey = def ? skillIconKey(def.sourceRef) : null;
      if (iconKey !== null && this.host.assets.has(iconKey)) {
        g.image(iconKey, b.x, b.y, { w: b.w, h: b.h, alpha });
      } else {
        /* İkon YOK — sahte eşleme yapmak yerine yer tutucu. Hangi
           skillin görselinin eksik olduğu GÖRÜNÜR kalır. */
        g.rect(b.x, b.y, b.w, b.h, '#221c14', alpha);
        g.rect(b.x, b.y, b.w, 2, GATE_COLOR[gate], alpha);
        if (def) {
          g.text(skillInitial(def.displayName), b.x + b.w / 2, b.y + b.h / 2 - 12,
            { align: 'center', size: 20, bold: true, color: GATE_COLOR[gate], alpha });
        }
      }
      /* Kalıcı kilit rozeti — Sv1 oyuncu neyi kullanamadığını görsün. */
      const badge = def ? gateBadge(gate, def.requiredLevel) : null;
      if (badge !== null) {
        g.rect(b.x, b.y + b.h - 16, b.w, 16, '#0b0908', 0.85);
        g.text(badge, b.x + b.w / 2, b.y + b.h - 14,
          { align: 'center', size: 10, bold: true, color: GATE_COLOR[gate] });
      }
      if (cdRatio > 0) {
        g.rect(b.x, b.y + b.h * (1 - cdRatio), b.w, b.h * cdRatio, '#0b0908', 0.66);
        g.text(s!.cooldownLeft.toFixed(1), b.x + b.w / 2, b.y + b.h / 2 - 8,
          { align: 'center', size: 14, bold: true, color: '#e8d9a0' });
      }
      if (busy) g.rect(b.x + b.w * 0.2, b.y + b.h - 4, b.w * 0.6, 3, '#6f8fd0', 0.85);
    });

    /* ACTION çubuğu — saldırı toparlanması (skill CD'sinden AYRI) */
    {
      const c = skillBoxes[0]!;
      const bw = c.w * 0.7, bx = c.x + (c.w - bw) / 2, by = c.y + c.h + 4;
      g.rect(bx, by, bw, 5, '#1a1f2c', 0.9);
      if (busy) g.rect(bx, by, bw * (1 - this.S.adapter.actionRatio), 5, '#6f8fd0');
    }

    /* ---- hedef seç düğmesi + sayfa noktaları ---- */
    const nb = this.nearestBtn();
    g.image(HUD_TARGET_BTN.key, nb.x, nb.y, { w: nb.w, h: nb.h, alpha: A });
    g.image(HUD_PAGE_DOTS.key, HUD_PAGE_DOTS.x, HUD_PAGE_DOTS.y,
      { w: HUD_PAGE_DOTS.w, h: HUD_PAGE_DOTS.h, alpha: A * 0.85 });

    /* ---- ganimet toplama ---- */
    const nearLoot = this.S.worldLoot.nearest(this.S.world.worldX, this.S.world.worldY);
    if (nearLoot) {
      const pb = this.pickupBtn();
      g.rect(pb.x, pb.y, pb.w, pb.h, '#2c2417');
      g.rect(pb.x, pb.y, pb.w, 3, '#e08a3c');
      g.text(pb.label, pb.x + pb.w / 2, pb.y + pb.h / 2, { align: 'center', size: 15, bold: true, color: '#e8d9a0' });
      this.drawItemTooltip(g, nearLoot.kind === 'coin' ? null : nearLoot.itemRef,
        nearLoot.kind === 'coin' ? nearLoot.quantity : 0);
    }

    /* ---- alt menü ---- */
    for (const n of this.navButtons()) {
      g.image(n.label, n.x, n.y, { w: n.w, h: n.h, alpha: A });
    }

    /* ---- EXP çubuğu ---- */
    g.image(HUD_EXP_BAR.key, HUD_EXP_BAR.x, HUD_EXP_BAR.y,
      { w: HUD_EXP_BAR.w, h: HUD_EXP_BAR.h, alpha: A });
    /* Çubukta %48'lik altın dolgu BOYALI: önce yuvayı örteriz, sonra gerçek
       oranı çizeriz. Yüzde yazısı varlıktan silindi, buradan yazılır. */
    const expR = this.S.player.expProgress();
    g.rect(HUD_EXP_FILL.x, HUD_EXP_FILL.y, HUD_EXP_FILL.w, HUD_EXP_FILL.h, '#131111', 0.98);
    g.rect(HUD_EXP_FILL.x, HUD_EXP_FILL.y, HUD_EXP_FILL.w * expR, HUD_EXP_FILL.h, '#e0aa1c', 0.95);
    g.text(`${(expR * 100).toFixed(1)}%`, HUD_EXP_TEXT.x, HUD_EXP_TEXT.y,
      { align: 'center', size: 10, bold: true, color: '#e8d9a0' });

    /* ---- DEV anahtarı (maket dışı, sol üstte küçük) ---- */
    const dv = this.devToggle();
    g.rect(dv.x, dv.y, dv.w, dv.h, '#1c1710', 0.7);
    g.text('DEV', dv.x + dv.w / 2, dv.y + dv.h / 2 - 6, { align: 'center', size: 11, color: '#8d8272' });
  }

  private renderDev(g: DrawApi): void {
    const rows = this.devRows();
    /* Renderer paneli açıkken içerik uzar (P2.2: Archer + Mutant blokları). */
    const h = Math.max(rows.length * 46 + 208, this.renderPanelOpen ? 560 : 0);
    g.rect(30, 150, 568, h, '#0b0908', 0.94);
    g.text('DEV AYARLARI', 486, 168, { align: 'center', size: 13, bold: true, color: '#e8d9a0' });
    for (const r of rows) {
      const t = TUNABLES.find((x) => x.key === r.key)!;
      const v = this.S.tuning.get(r.key);
      g.text(r.label, 386, r.y - 6, { size: 11, color: '#8d8272' });
      g.rect(r.minus.x, r.minus.y, r.minus.w, r.minus.h, '#221c14');
      g.text('−', r.minus.x + 20, r.minus.y + 18, { align: 'center', size: 18, color: '#e8e0d0' });
      g.rect(r.plus.x, r.plus.y, r.plus.w, r.plus.h, '#221c14');
      g.text('+', r.plus.x + 20, r.plus.y + 18, { align: 'center', size: 18, color: '#e8e0d0' });
      const shown = t.fmt ? t.fmt(v) : String(v);
      const isDefault = Math.abs(v - TUNING_DEFAULTS[r.key]) < 1e-6;
      g.text(shown, 486, r.y + 18, { align: 'center', size: 13, bold: true, color: isDefault ? '#cfc7b6' : '#e08a3c' });
    }
    const rb = this.devReset();
    g.rect(rb.x, rb.y, rb.w, rb.h, '#2c2417');
    g.text(rb.label, rb.x + rb.w / 2, rb.y + rb.h / 2, { align: 'center', size: 13, color: '#e8d9a0' });

    /* GENIE telemetrisi */
    const t = this.S.genie.status(this.ents());
    const lines: Array<[string, string]> = [
      ['Genie', t.enabled ? 'AÇIK' : 'KAPALI'],
      ['Farm merkezi', t.farmCenter ? `${Math.round(t.farmCenter.x)}, ${Math.round(t.farmCenter.y)}` : '—'],
      ['Attack range (oyuncu)', `${t.attackRange}`],
      ['Farm boundary', t.farmBoundaryEnabled ? `${t.farmBoundaryRadius}` : 'KAPALI'],
      ['Burst range', `${t.burstRange}`],
      ['Hedef', t.targetName ?? '—'],
      ['Hedef uid', t.targetUid === null ? '—' : `#${t.targetUid}`],
      ['Mesafe', t.distance === null ? '—' : `${Math.round(t.distance)}`],
      ['Aktif set', t.activeSet === null ? '—' : SET_LABELS[t.activeSet]],
      ['Set modu', t.setMode === null ? '—' : SET_MODE_LABELS[t.setMode]],
      ['Sequence cursor', t.cursorLabel === null ? '—' : `${t.cursorLabel} → ${this.cursorSkillName()}`],
      ['Collision mode', this.collisionMode()],
      ['Auto Loot', `${LOOT_MODE_LABELS[this.S.lootPolicy.mode]} (mesafesiz)`],
      ['Ground Loot', `${this.S.worldLoot.count}`],
      ['Aktif set kilidi', t.forcedSet === null ? 'OTOMATİK' : `SET ${t.forcedSet + 1}`],
      ['GENIE STATE', t.movementState],
      ['  son geçiş', t.lastTransition ?? '—'],
      ['  hareket kaynağı', this.movementSource],
      ['  auto hız', t.autoMoveSpeed > 0 ? `${Math.round(t.autoMoveSpeed)} birim/sn` : '—'],
      ['  hedef mesafe (auto)', `${t.desiredDistance}`],
      ['  cast range', `${t.castRange}`],
      ['  acquisition', `${t.attackRange}`],
      ['  merkeze uzaklık', t.farmCenterDistance === null ? '—' : `${Math.round(t.farmCenterDistance)}`],
      ['Anim state', `${this.S.anim.state} → ${this.S.anim.clip}`],
      ['Anim atlas', this.S.anim.atlasActive ? `AÇIK · row ${atlasRowForAngle(this.S.anim.angle)} · kare ${this.S.anim.frame}/${this.S.anim.clipFrames}` : 'KAPALI (fallback)'],
      ['Fake hop/sway/squash', this.S.anim.atlasActive
        ? '0 / 0 / 1 (kapalı)'
        : `${this.S.anim.hopOffset.toFixed(1)} / ${this.S.anim.swayOffset.toFixed(1)} / ${this.S.anim.squashY.toFixed(3)}`],
      ['Facing (move/combat)', `${(this.S.anim.movementFacing * 180 / Math.PI).toFixed(0)}° / ${(this.S.anim.combatFacing * 180 / Math.PI).toFixed(0)}°`],
      ['Action lock', this.S.adapter.actionBusy ? `${this.S.adapter.actionRemaining.toFixed(2)}s` : 'hazır'],
      ['Son action', this.S.action.lastRef === null ? '—'
        : `${this.S.adapter.actionTimeOf(this.S.action.lastRef).toFixed(2)}s`],
      ['Son eylem', t.lastAction],
      ['Son çok-ok', t.lastMultiShot ?? '—'],
      ['Attack Move', `%${Math.round(this.S.adapter.pipeline.timing.attackMoveMult * 100)}`],
      ['Projectile speed', `${this.S.adapter.pipeline.timing.projectileSpeed}`],
      ['Release delay', `${this.S.adapter.pipeline.timing.releaseDelaySec.toFixed(2)}s`],
      ['Uçan ok', `${this.S.adapter.pipeline.projectiles.length}`],
      ['Bekleyen cast', `${this.S.adapter.pipeline.pending.length}`],
      ...this.castTraceLines(),
      ['Hareket hızı', `${this.S.tuning.get('playerSpeed')} birim/sn`],
      ['HP iksiri', `${potionLabel(this.S.genie.settings.hpPotionRef, 'hp')}`
        + (this.S.genie.settings.hpPotionRef === null ? ''
          : ` ×${this.S.potions.stock(this.S.genie.settings.hpPotionRef)}`)],
      ['MP iksiri', `${potionLabel(this.S.genie.settings.mpPotionRef, 'mp')}`
        + (this.S.genie.settings.mpPotionRef === null ? ''
          : ` ×${this.S.potions.stock(this.S.genie.settings.mpPotionRef)}`)],
      ['Son iksir', this.lastPotion === null ? '—'
        : `${this.lastPotion.before}→${this.lastPotion.after} (+${this.lastPotion.actual}`
          + `${this.lastPotion.wasted > 0 ? ` · ziyan ${this.lastPotion.wasted}` : ''})`],
    ];
    /* Sol sütun TEK liste gösterir: Genie durumu VEYA mob telemetrisi.
       İkisi aynı anda çizilmez — üst üste binme olmaz. */
    if (this.mobPanelOpen) {
      this.drawMobTelemetry(g);
    } else if (this.lootPanelOpen) {
      this.drawLootTelemetry(g);
    } else if (this.buildPanelOpen) {
      this.drawBuildTelemetry(g);
    } else if (this.renderPanelOpen) {
      this.drawRenderTelemetry(g);
    } else {
      g.text('GENIE DURUMU', 44, 168, { size: 12, bold: true, color: '#e8d9a0' });
      lines.forEach(([k, v], i) => {
        const y = 182 + i * 15;
        g.text(k, 44, y, { size: 9, color: '#8d8272' });
        g.text(v, 360, y, { align: 'right', size: 9, bold: true, color: '#e8e0d0' });
      });
    }
    const rt = this.raysToggle();
    g.rect(rt.x, rt.y, rt.w, rt.h, this.showRays ? '#2c2417' : '#1c1710');
    g.rect(rt.x, rt.y, rt.w, 3, this.showRays ? '#e08a3c' : '#4a3f30');
    g.text(`${this.showRays ? '☑' : '☐'} ${rt.label}`, rt.x + rt.w / 2, rt.y + rt.h / 2,
      { align: 'center', size: 13, color: this.showRays ? '#e8d9a0' : '#cfc7b6' });
    const ct = this.collisionToggle();
    const custom = this.collisionMode() !== DEFAULT_COLLISION_MODE;
    g.rect(ct.x, ct.y, ct.w, ct.h, custom ? '#2c2417' : '#1c1710');
    g.rect(ct.x, ct.y, ct.w, 3, custom ? '#e08a3c' : '#4a3f30');
    g.text(`${ct.label}: ${this.collisionMode()}`, ct.x + ct.w / 2, ct.y + ct.h / 2,
      { align: 'center', size: 12, color: custom ? '#e8d9a0' : '#cfc7b6' });
    const tm = this.S.adapter.pipeline.timing;
    const am = this.attackMoveToggle();
    g.rect(am.x, am.y, am.w, am.h, '#1c1710');
    g.rect(am.x, am.y, am.w, 3, '#e08a3c');
    g.text(`${am.label}: %${Math.round(tm.attackMoveMult * 100)}`
      + `   (${ATTACK_MOVE_OPTIONS.map((v) => `${Math.round(v * 100)}`).join(' / ')})`,
      am.x + am.w / 2, am.y + am.h / 2, { align: 'center', size: 12, color: '#e8d9a0' });
    const ms = this.moveSpeedToggle();
    g.rect(ms.x, ms.y, ms.w, ms.h, '#1c1710');
    g.rect(ms.x, ms.y, ms.w, 3, '#7fa85c');
    g.text(`${ms.label}: ${this.S.tuning.get('playerSpeed')}  (${PLAYER_SPEED_OPTIONS.join('/')})`,
      ms.x + ms.w / 2, ms.y + ms.h / 2, { align: 'center', size: 11, color: '#a8c090' });
    const tp = this.testPotionBtn();
    g.rect(tp.x, tp.y, tp.w, tp.h, '#1c1710');
    g.rect(tp.x, tp.y, tp.w, 3, '#e08a3c');
    g.text(tp.label, tp.x + tp.w / 2, tp.y + tp.h / 2, { align: 'center', size: 11, color: '#e8d9a0' });
    const ps = this.projSpeedToggle();
    g.rect(ps.x, ps.y, ps.w, ps.h, '#1c1710');
    g.rect(ps.x, ps.y, ps.w, 3, '#6f8fd0');
    g.text(`${ps.label}: ${tm.projectileSpeed}`
      + `   (${PROJECTILE_SPEED_OPTIONS.join(' / ')})`,
      ps.x + ps.w / 2, ps.y + ps.h / 2, { align: 'center', size: 12, color: '#9fb4d8' });
    const bt = this.balanceToggle();
    g.rect(bt.x, bt.y, bt.w, bt.h, this.balanceOpen ? '#2c2417' : '#1c1710');
    g.rect(bt.x, bt.y, bt.w, 3, this.balanceOpen ? '#e08a3c' : '#4a3f30');
    g.text(`${this.balanceOpen ? '☑' : '☐'} ${bt.label}`, bt.x + bt.w / 2, bt.y + bt.h / 2,
      { align: 'center', size: 13, color: this.balanceOpen ? '#e8d9a0' : '#cfc7b6' });
    const at = this.atlasToggle();
    g.rect(at.x, at.y, at.w, at.h, this.atlasOn ? '#2c2417' : '#1c1710');
    g.rect(at.x, at.y, at.w, 3, this.atlasOn ? '#e08a3c' : '#4a3f30');
    g.text(`${this.atlasOn ? '☑' : '☐'} ${at.label}${this.atlasOn ? ' (DEBUG)' : ''}`,
      at.x + at.w / 2, at.y + at.h / 2,
      { align: 'center', size: 13, color: this.atlasOn ? '#e8d9a0' : '#cfc7b6' });
    const rs = this.respawnToggle();
    g.rect(rs.x, rs.y, rs.w, rs.h, '#1c1710');
    g.rect(rs.x, rs.y, rs.w, 3, '#c96a5a');
    g.text(`${rs.label}: ${this.S.mobs.ai.respawnOverrideSec ?? RESPAWN_DEFAULT}s`
      + `  (${RESPAWN_OPTIONS.join('/')})`,
      rs.x + rs.w / 2, rs.y + rs.h / 2, { align: 'center', size: 11, color: '#d99a8a' });
    const ll = this.lootLifeToggle();
    g.rect(ll.x, ll.y, ll.w, ll.h, '#1c1710');
    g.rect(ll.x, ll.y, ll.w, 3, '#7fa85c');
    g.text(`${ll.label}: ${this.S.worldLoot.tuning.lootLifetimeSec}s`
      + `  (${LOOT_LIFETIME_OPTIONS.join('/')})`,
      ll.x + ll.w / 2, ll.y + ll.h / 2, { align: 'center', size: 11, color: '#a8c090' });
    const qb = this.qualityBtn();
    g.rect(qb.x, qb.y, qb.w, qb.h, '#1b2634', 0.95);
    g.rect(qb.x, qb.y, qb.w, 2, '#6f8fd0');
    g.text(`${qb.label}: ${this.three?.qualityLevel ?? '—'}`,
      qb.x + 12, qb.y + qb.h / 2 - 7, { size: 12, bold: true, color: '#9fb4d8' });

    const wb = this.wipeSaveBtn();
    g.rect(wb.x, wb.y, wb.w, wb.h, '#2a1512', 0.95);
    g.rect(wb.x, wb.y, wb.w, 2, '#c96a5a');
    g.text(`${wb.label}${this.S.saves.persistent ? '' : '  (kalıcı depolama YOK)'}`,
      wb.x + 12, wb.y + wb.h / 2 - 7, { size: 12, bold: true, color: '#e8b8b0' });

    const im = this.infiniteMpBtn();
    const imOn = this.S.infiniteMp;
    g.rect(im.x, im.y, im.w, im.h, imOn ? '#1b2634' : '#1c1710');
    g.rect(im.x, im.y, im.w, 3, imOn ? '#6f8fd0' : '#4a3f30');
    g.text(`${imOn ? '☑' : '☐'} ${im.label}: ${imOn ? 'AÇIK' : 'KAPALI'}`,
      im.x + im.w / 2, im.y + im.h / 2,
      { align: 'center', size: 12, color: imOn ? '#9fb4d8' : '#cfc7b6' });
    const lp = this.lootPanelToggle();
    g.rect(lp.x, lp.y, lp.w, lp.h, this.lootPanelOpen ? '#2c2417' : '#1c1710');
    g.rect(lp.x, lp.y, lp.w, 3, this.lootPanelOpen ? '#e08a3c' : '#4a3f30');
    g.text(`${this.lootPanelOpen ? '☑' : '☐'} ${lp.label}`, lp.x + lp.w / 2, lp.y + lp.h / 2,
      { align: 'center', size: 12, color: this.lootPanelOpen ? '#e8d9a0' : '#cfc7b6' });
    if (this.three !== null) {
      const t3 = this.threeToggle();
      g.rect(t3.x, t3.y, t3.w, t3.h, this.render3dOn ? '#2c2417' : '#1c1710');
      g.rect(t3.x, t3.y, t3.w, 3, this.render3dOn ? '#6f8fd0' : '#4a3f30');
      g.text(`${this.render3dOn ? '☑' : '☐'} ${t3.label}`, t3.x + t3.w / 2, t3.y + t3.h / 2,
        { align: 'center', size: 12, color: this.render3dOn ? '#9fb4d8' : '#cfc7b6' });
      const rp = this.renderPanelToggle();
      g.rect(rp.x, rp.y, rp.w, rp.h, this.renderPanelOpen ? '#2c2417' : '#1c1710');
      g.rect(rp.x, rp.y, rp.w, 3, this.renderPanelOpen ? '#e08a3c' : '#4a3f30');
      g.text(`${this.renderPanelOpen ? '☑' : '☐'} ${rp.label}`, rp.x + rp.w / 2, rp.y + rp.h / 2,
        { align: 'center', size: 12, color: this.renderPanelOpen ? '#e8d9a0' : '#cfc7b6' });
    }
    const tg = this.testGearBtn();
    g.rect(tg.x, tg.y, tg.w, tg.h, '#1c1710');
    g.rect(tg.x, tg.y, tg.w, 3, '#a06fd0');
    g.text(tg.label, tg.x + tg.w / 2, tg.y + tg.h / 2, { align: 'center', size: 11, color: '#c9a5e0' });
    const bp = this.buildPanelToggle();
    g.rect(bp.x, bp.y, bp.w, bp.h, this.buildPanelOpen ? '#2c2417' : '#1c1710');
    g.rect(bp.x, bp.y, bp.w, 3, this.buildPanelOpen ? '#e08a3c' : '#4a3f30');
    g.text(`${this.buildPanelOpen ? '☑' : '☐'} ${bp.label}`, bp.x + bp.w / 2, bp.y + bp.h / 2,
      { align: 'center', size: 12, color: this.buildPanelOpen ? '#e8d9a0' : '#cfc7b6' });
    const mp = this.mobPanelToggle();
    g.rect(mp.x, mp.y, mp.w, mp.h, this.mobPanelOpen ? '#2c2417' : '#1c1710');
    g.rect(mp.x, mp.y, mp.w, 3, this.mobPanelOpen ? '#e08a3c' : '#4a3f30');
    g.text(`${this.mobPanelOpen ? '☑' : '☐'} ${mp.label}`, mp.x + mp.w / 2, mp.y + mp.h / 2,
      { align: 'center', size: 11, color: this.mobPanelOpen ? '#e8d9a0' : '#cfc7b6' });
  }

  /** P1.6 §29/§30 — MOB + FARM ALANI TELEMETRİSİ.
   *  Her mob için: durum, HP, oyuncuya/eve mesafe, aggro sebebi, respawn sayacı. */
  private drawMobTelemetry(g: DrawApi): void {
    const rows = this.S.mobs.telemetry(this.S.world);
    const area = this.S.mobs.areaTelemetry();
    const x = 44, top = 168;
    g.text(`FARM ALANI — slot ${area.slots} · canlı ${area.alive} · ölü ${area.dead}`
      + `  (N ${area.byType.NORMAL}/A ${area.byType.AGGRESSIVE}/E ${area.byType.ELITE})`,
      x, top, { size: 11, bold: true, color: '#e8d9a0' });
    rows.forEach((r, i) => {
      const y = top + 18 + i * 26;
      const color = r.phase === 'DEAD' ? '#6b6350'
        : r.aggro ? '#c96a5a' : r.phase === 'RETURN' ? '#6f8fd0' : '#cfc7b6';
      const tail = r.phase === 'DEAD' ? `respawn ${r.respawnIn}s`
        : `hp ${r.hp}/${r.maxHp} · dP ${r.distPlayer} · dH ${r.distHome}`
          + (r.aggro ? ` · ${r.aggroCause}` : '');
      g.text(`${r.slotId} ${r.name} [${r.aiType[0]}]`, x, y, { size: 10, color });
      g.text(r.phase, 360, y, { align: 'right', size: 10, bold: true, color });
      g.text(tail, x + 6, y + 12, { size: 9, color: '#8d8272' });
    });
  }

  /** P2.0 §23 — RENDERER TELEMETRİSİ. */
  private drawRenderTelemetry(g: DrawApi): void {
    const x = 44;
    let y = 168;
    const line = (t: string, color = '#cfc7b6', size = 10): void => {
      g.text(t, x, y, { size, color }); y += 13;
    };
    g.text('RENDERER — THREE.JS', x, y, { size: 11, bold: true, color: '#e8d9a0' }); y += 16;
    if (!this.three) { line('(3D katman bağlı değil)', '#6b6350'); return; }
    const s = this.three.stats();
    const t = this.three.tuning;
    line(`Katman: ${this.render3dOn ? 'AÇIK' : 'KAPALI'} · WebGL: ${s.webgl ? 'evet' : 'HAYIR (headless)'}`,
      this.render3dOn ? '#7fa85c' : '#8d8272');
    line(`FPS ${s.fps}  ·  draw calls ${s.drawCalls}  ·  üçgen ${s.triangles}`, '#e8e0d0');
    line(`doku ${s.textures} · geometri ${s.geometries} · program ${s.programs}`, '#8d8272');
    line(`sahne nesnesi ${s.activeObjectCount}`, '#8d8272');
    y += 4;
    line(`GÖRSEL SAYIMI  mob ${s.mobVisualCount} · ok ${s.projectileVisualCount}`
      + ` · ganimet ${s.lootVisualCount}`, '#e8e0d0');
    line(`yaşam döngüsü: üretilen ${s.visualsCreated} · silinen ${s.visualsRemoved}`
      + ` · canlı ${s.visualsCreated - s.visualsRemoved}`, '#8d8272');
    y += 4;
    line(`KAMERA  yaw ${t.yawDeg}° · pitch ${t.pitchDeg}° · mesafe ${t.distance}`
      + ` · bakış Y ${t.height} · FOV ${t.fov}`, '#9fb4d8');
    line(`izdüşüm: ${t.projection}  ·  yumuşatma ${t.smoothing} (YALNIZ GÖRSEL)`, '#9fb4d8');
    y += 4;
    g.text('3D VARLIKLAR (GLB)', x, y, { size: 11, bold: true, color: '#e8d9a0' }); y += 16;
    for (const a of this.three.assets.summary()) {
      line(`${a.kind.padEnd(16)} ${a.state.padEnd(8)} → ${a.usingGlb ? 'GLB' : 'PRIMITIVE fallback'}`,
        a.usingGlb ? '#7fa85c' : '#8d8272');
    }
    y += 4;
    const a = s.archer;
    g.text('ARCHER MODELİ (P2.1)', x, y, { size: 11, bold: true, color: '#e8d9a0' }); y += 16;
    if (!a) {
      line('GLB yok → primitive fallback (P2.0 kapsülü)', '#8d8272');
    } else {
      line(`state ${a.state} → klip ${a.clip}  ·  ${a.clipCount}/17 yüklü`, '#e8e0d0');
      line(`playback ×${a.timeScale.toFixed(2)}`
        + `  (ölçülen ${a.speedMetersPerSec.toFixed(2)} m/sn ÷ kaynak `
        + `${a.sourceSpeedMetersPerSec.toFixed(3)} m/sn)`, '#a8c090');
      line(`release: animasyon ${a.animationReleaseSec.toFixed(3)}s`
        + ` · gameplay ${a.gameplayReleaseSec.toFixed(2)}s`
        + ` · fark ${a.releaseDeltaSec.toFixed(3)}s`, '#9fb4d8');
      line(`yay↔sol el ${a.bowGripDistanceMeters.toFixed(5)} m (17 klipte sabit)`, '#7fa85c');
      line(a.deathActive
        ? `ÖLÜM: görsel +${a.deathVisualYOffsetMeters.toFixed(2)} m ·`
          + ` model-yerel kayma ${a.deathModelLocalDisplacementMeters.toFixed(2)} m`
        : 'ölüm sunumu kapalı', a.deathActive ? '#c06a58' : '#8d8272');
      const sp = a.arrowSpawn;
      line(sp ? `ArrowSpawn (${sp.x.toFixed(0)}, ${sp.y.toFixed(0)}, ${sp.z.toFixed(0)})`
        : 'ArrowSpawn socketi YOK', '#e8d9a0');
    }
    y += 4;
    const mb = s.mob;
    g.text('MUTANT MOB (P2.2)', x, y, { size: 11, bold: true, color: '#e8d9a0' }); y += 16;
    if (!mb) {
      line('GLB yok → silindir fallback (P2.0)', '#8d8272');
    } else {
      line(`${mb.rigCount} örnek · ${mb.clipCount}/8 klip · ölüm sunumu ${mb.deathActive}`,
        '#e8e0d0');
      line(`saldırı klibi ${mb.attackClip}`
        + ` (hizalama ${mb.attackAlignmentSec >= 0 ? '+' : ''}${mb.attackAlignmentSec.toFixed(3)}s)`,
        '#a8c090');
      for (const row of mb.clips.slice(0, 1)) {
        line(`  #${row.uid} ${row.phase.padEnd(7)} → ${row.clip} ×${row.timeScale.toFixed(2)}`,
          '#9fb4d8', 9);
      }
      if (mb.clips.length > 1) line(`  … +${mb.clips.length - 1} mob`, '#6b6350', 9);
      line(`EKSİK KLİP (uydurulmadı): ${mb.missingClips.join(', ') || 'yok'}`, '#c06a58', 9);
    }
    const ar = s.arrow;
    line(ar
      ? `OK (P2.4): ${ar.vertices}v/${ar.triangles}t · ${ar.lengthMeters} m `
        + `(${ar.lengthWorld} birim) · ${ar.alphaMode}${ar.doubleSided ? ' · 2 yüzlü' : ''}`
      : 'OK: primitive silüet (P2.3)', ar ? '#a8c090' : '#8d8272', 9);


    /* ---- KAMERA AYAR DÜĞMELERİ (§8/§9) ---- */
    g.text('KAMERA / MODEL AYARI', 44, 556, { size: 11, bold: true, color: '#e8d9a0' });
    const rows: Array<[string, string]> = [
      ['Yaw', `${t.yawDeg}°`],
      ['Pitch', `${t.pitchDeg}°`],
      ['Mesafe', `${t.distance}`],
      ['Bakış Y', `${t.height}`],
      ['FOV', `${t.fov}`],
      ['İzdüşüm', t.projection === 'perspective' ? 'PERSP' : 'ORTHO'],
    ];
    rows.push(['Oyuncu', this.three.usingArcherGlb ? 'GLB' : 'PRIMITIF']);
    rows.push(['Mob', this.three.usingMutantGlb ? 'MUTANT' : 'SİLİNDİR']);
    rows.push(['Ok', this.three.usingArrowGlb ? 'MODEL' : 'PRIMITIF']);
    rows.forEach(([label, value], i) => {
      const b = this.camBtn(i, `cam_${i}`);
      g.rect(b.x, b.y, b.w, b.h, '#1c1710');
      g.rect(b.x, b.y, b.w, 3, '#6f8fd0');
      g.text(`${label}: ${value}`, b.x + b.w / 2, b.y + b.h / 2,
        { align: 'center', size: 10, color: '#9fb4d8' });
    });
  }

  /** P1.8 §26 — MİNİMAL ITEM TOOLTIP.
   *  Ad · sınıf · gerekli seviye · slot · kategoriye göre statlar · +upgrade.
   *  KRİTİK SATIRI YOK · RASTGELE ROLL SATIRI YOK. */

  /* ═══════════════ P2.5 — ENVANTER / EKİPMAN PANELİ ═══════════════
     Yerleşim ve karşılaştırma matematiği `ui/inventory-panel.ts` içindedir
     (saf, testli). Buradaki iş yalnız ÇİZMEK ve dokunmayı AUTHORITY'ye
     (EquipService / InventoryState) iletmektir. */

  /** Kuşanılı yuvaların anlık haritası (slotId → instanceId | null). */
  private equipMap(): Map<string, number | null> {
    return new Map(this.S.stats.slots().map((s) => [s.slotId, s.instanceId]));
  }

  /** Seçili itemin tanımı + yükseltme seviyesi (yoksa null). */
  private selectedItem(): {
    def: ReturnType<typeof definitionOf>; upgrade: number;
    instanceId: number | null; itemRef: number;
  } | null {
    const sel = this.invSel;
    if (sel === null) return null;
    if (sel.kind === 'bag') {
      const inst = this.S.inventory.get(sel.instanceId);
      if (!inst) return null;
      return {
        def: definitionOf(inst.itemRef), upgrade: inst.upgradeLevel,
        instanceId: inst.instanceId, itemRef: inst.itemRef,
      };
    }
    const view = this.S.stats.slots().find((v) => v.slotId === sel.slotId);
    if (!view || view.definitionRef === null) return null;
    return {
      def: definitionOf(view.definitionRef), upgrade: view.upgradeLevel,
      instanceId: view.instanceId, itemRef: view.definitionRef,
    };
  }

  private handleInventory(p: PointerEventInfo): void {
    const hit = invHitTest(p.x, p.y);
    if (hit === null) return;
    if (hit.kind === 'equip') {
      this.invSel = { kind: 'equip', slotId: hit.slotId };
      this.host.audio.play('ui');
      return;
    }
    if (hit.kind === 'bag') {
      const entry = bagEntries(this.S.inventory.allEntries())[hit.index];
      this.invSel = entry ? { kind: 'bag', instanceId: entry.instanceId } : null;
      this.host.audio.play('ui');
      return;
    }
    /* ---- düğmeler ---- */
    this.host.audio.play('ui');
    if (hit.id === 'inv_close') { this.invOpen = false; this.invSel = null; return; }
    const sel = this.invSel;
    if (sel === null) { this.say('Önce bir eşya seç'); return; }

    if (hit.id === 'inv_equip') {
      if (sel.kind !== 'bag') { this.say('Bu eşya zaten kuşanılı'); return; }
      /* KARAR EquipService'indir; panel yalnız sonucu gösterir. */
      const res = this.S.equipService.equip(sel.instanceId);
      if (res.ok) {
        this.say(`${res.definition.displayName} kuşanıldı`);
        this.invSel = { kind: 'equip', slotId: res.slotId };
      } else {
        this.say(INV_FAIL[res.reason]);
      }
      return;
    }
    if (hit.id === 'inv_unequip') {
      if (sel.kind !== 'equip') { this.say('Bu eşya çantada'); return; }
      const res = this.S.equipService.unequip(sel.slotId);
      if (res.ok) {
        this.say(`${res.definition?.displayName ?? 'Eşya'} çıkarıldı`);
        this.invSel = { kind: 'bag', instanceId: res.instanceId };
      } else {
        this.say('Yuva boş');
      }
      return;
    }
    if (hit.id === 'inv_sell') {
      /* ═══ P3.10 — "AT" YERİNE "SAT" ═══
         Eskiden eşya SİLİNİYORDU ve karşılığında hiçbir şey
         alınmıyordu. Oyuncunun çantasını boşaltmak için tek yolu
         değerli eşyayı yok etmekti — bu, ganimet toplamayı
         cezalandırıyordu.

         Fiyat `AutoGearSystem.sellPrice` ile AYNI kaynaktan gelir
         (`data/sell-prices.ts`); satış ekranı ve buradaki düğme
         farklı fiyat veremez. */
      if (sel.kind !== 'bag') { this.say('Kuşanılı eşya satılamaz — önce çıkar'); return; }
      const inst = this.S.inventory.get(sel.instanceId);
      if (!inst) { this.invSel = null; return; }
      if (inst.locked) { this.say('Eşya kilitli'); return; }
      const price = this.S.autoGear.sellPrice(inst);
      if (price <= 0) { this.say('Bu eşyanın satış değeri yok'); return; }
      const name = Content.item(inst.itemRef)?.displayName ?? 'Eşya';
      const qty = inst.quantity;
      this.S.inventory.remove(sel.instanceId, qty);
      this.S.player.coins += price;
      this.host.audio.play('ui');
      this.say(`${name}${qty > 1 ? ` x${qty}` : ''} satıldı  ·  +${price} altın`);
      this.invSel = null;
    }
  }

  private renderInventory(g: DrawApi): void {
    /* ═══ P2.24.2 — GÖRSEL VARSA ESKİ KABUK ÇİZİLMEZ ═══
       P2.23'te panel görseli eklendi ama eski çizim SİLİNMEDİ: ikisi
       peş peşe çalışıyor, %97 opak dikdörtgen yeni çerçevenin üstünü
       tamamen örtüyordu. Oyuncu yeni paneli hiç görmedi.

       Doğrusu bir DALLANMA: görsel yüklüyse çerçeveyi o taşır ve kod
       yalnız METİN + ITEM ikonu çizer; yüklü değilse eski kabuk
       yedek olarak devrede kalır. */
    const L = INV_LAYOUT;
    const art = this.host.assets.has('ui_inv_panel');
    g.rect(0, 0, PROTO.screenW, PROTO.screenH, '#050403', 0.75);
    if (art) {
      g.image('ui_inv_panel', L.panel.x, L.panel.y,
        { w: L.panel.w, h: L.panel.h, alpha: 1 });
    } else {
      g.rect(L.panel.x, L.panel.y, L.panel.w, L.panel.h, '#100d08', 0.97);
      g.rect(L.panel.x, L.panel.y, L.panel.w, 3, '#e08a3c');
    }
    /* Başlık maketin ORTA şeridinde (x ~130-500, y ~28-70 sahne).
       Eskiden sol üst köşeye yazılıyordu ve çerçevenin dışına taşıyordu. */
    g.text('ÇANTA & EKİPMAN', L.panel.w / 2, 38,
      { align: 'center', size: 15, bold: true, color: '#e8d9a0' });
    const cap = `${this.S.inventory.usedSlots}/${this.S.inventory.capacity}`;
    g.text(cap, L.panel.w / 2, 58, { align: 'center', size: 11, color: '#8d8272' });
    const close = invCloseButton();
    /* Kapatma düğmesinin zemini de görselde var — yalnız yoksa çizilir. */
    if (!art) {
      g.rect(close.x, close.y, close.w, close.h, '#241c14');
      g.text(close.label, close.x + close.w / 2, close.y + 9,
        { align: 'center', size: 15, color: '#cfc7b6' });
    }

    /* ---- ekipman ızgarası ---- */
    const views = this.S.stats.slots();
    const sel = this.invSel;
    for (const r of equipSlotRects()) {
      const v = views.find((x) => x.slotId === r.slotId)!;
      const on = sel !== null && sel.kind === 'equip' && sel.slotId === r.slotId;
      /* Yuva zemini GÖRSELDEN gelir; kod yalnız seçim vurgusu ve
         kalite şeridi çizer. */
      if (!art) g.rect(r.x, r.y, r.w, r.h, '#1a1610');
      if (on) g.rect(r.x, r.y, r.w, r.h, '#2c2417', 0.55);
      if (v.itemClass) g.rect(r.x, r.y, r.w, 2, ITEM_CLASS_COLOR[v.itemClass]);
      /* P2.24 — etiket yuvanın ÜSTÜNDEKİ şeritte (maketin ayırdığı yer),
         ikon yuvanın ortasında. Eskiden ikisi de kutunun içindeydi ve
         item adı ikonla çakışıyordu. */
      g.text(r.label, r.x + r.w / 2, r.y - INV_LAYOUT.equipLabelH + 5,
        { align: 'center', size: 9, color: '#8d8272' });
      if (v.definition) {
        this.drawItemIcon(g, v.definition.definitionRef, r.x + r.w / 2, r.y + r.h / 2,
          r.w - 12, ITEM_CLASS_COLOR[v.definition.itemClass]);
        if (v.upgradeLevel > 0) {
          g.text(`+${v.upgradeLevel}`, r.x + r.w - 5, r.y + r.h - 16,
            { align: 'right', size: 11, bold: true, color: '#e8d9a0' });
        }
      }
      if (on) g.rect(r.x, r.y + r.h - 2, r.w, 2, '#e08a3c');
    }

    /* ---- çanta ızgarası ---- */
    const entries = bagEntries(this.S.inventory.allEntries());
    const cells = bagCellRects();
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]!;
      const e = entries[i];
      const on = e !== undefined && sel !== null && sel.kind === 'bag' && sel.instanceId === e.instanceId;
      if (!art) g.rect(c.x, c.y, c.w, c.h, '#1a1610');
      if (on) g.rect(c.x, c.y, c.w, c.h, '#2c2417', 0.55);
      if (!e) continue;
      const def = definitionOf(e.itemRef);
      const col = def ? ITEM_CLASS_COLOR[def.itemClass] : '#6f655a';
      g.rect(c.x, c.y, c.w, 2, col);
      /* P2.24 — GERÇEK İKON. Yoksa eski renkli daireye düşülür;
         katalog büyüdükçe ikonlar sonradan eklenebilsin diye. */
      this.drawItemIcon(g, e.itemRef, c.x + c.w / 2, c.y + c.h / 2, c.w - 8, col);
      if (e.quantity > 1) {
        g.text(String(e.quantity), c.x + c.w - 4, c.y + c.h - 15, { align: 'right', size: 10, color: '#cfc7b6' });
      }
      if (e.upgradeLevel > 0) g.text(`+${e.upgradeLevel}`, c.x + 4, c.y + 5, { size: 9, color: '#e8d9a0' });
      if (on) g.rect(c.x, c.y + c.h - 2, c.w, 2, '#e08a3c');
    }

    /* ---- detay + karşılaştırma ---- */
    const d = L.detail;
    if (!art) g.rect(d.x, d.y, d.w, d.h, '#0b0908', 0.95);
    const picked = this.selectedItem();
    if (picked === null) {
      g.text('Bir eşya seç', d.x + d.w / 2, d.y + 20,
        { align: 'center', size: 13, color: '#6f655a' });
    } else if (picked.def === null) {
      /* P2.20 — EKİPMAN OLMAYAN EŞYA. Eskiden "katalogda yok" deniyordu
         ve bozukmuş gibi görünüyordu; parşömen/iksir/ganimet tasarım
         gereği kuşanılmaz. Artık ne olduğu ve ne yapılacağı yazıyor. */
      const inst = picked.instanceId === null ? undefined : this.S.inventory.get(picked.instanceId);
      const info = nonGearInfo(picked.itemRef);
      const src = Content.item(picked.itemRef);
      const col = NON_GEAR_COLOR[info.role];
      g.rect(d.x, d.y, d.w, 2, col);
      g.text(src?.displayName ?? `#${picked.itemRef}`, d.x + 12, d.y + 14,
        { size: 14, bold: true, color: col });
      g.text(info.purpose, d.x + 12, d.y + 38, { size: 11, color: '#cfc7b6' });
      g.text(info.action, d.x + 12, d.y + 58, { size: 11, color: '#8d8272' });
      if (inst) {
        const price = this.S.autoGear.sellPrice(inst);
        g.text(`Adet ${inst.quantity}  ·  satış ${price} altın`, d.x + 12, d.y + 82,
          { size: 11, color: '#8d8272' });
      }
    } else {
      const head = itemHeadline(picked.def, picked.upgrade);
      g.rect(d.x, d.y, d.w, 2, head.color);
      g.text(head.text, d.x + 12, d.y + 14, { size: 14, bold: true, color: head.color });
      g.text(head.sub, d.x + 12, d.y + 34, { size: 10, color: '#8d8272' });
      /* Çantadaki bir item seçiliyse, gideceği yuvadaki itemle KARŞILAŞTIRILIR. */
      let against: ReturnType<typeof definitionOf> = null;
      if (sel !== null && sel.kind === 'bag') {
        const target = targetSlotFor(picked.def, this.equipMap());
        const cur = target === null ? undefined : views.find((v) => v.slotId === target);
        against = cur?.definition ?? null;
        if (target !== null) {
          g.text(`→ ${views.find((v) => v.slotId === target)?.label ?? target}`,
            d.x + d.w - 12, d.y + 14, { align: 'right', size: 11, color: '#6f655a' });
        }
      }
      const lines = compareLines(picked.def, against);
      lines.forEach((ln, i) => {
        const y = d.y + 58 + i * 17;
        g.text(ln.label, d.x + 16, y, { size: 11, color: '#8d8272' });
        g.text(String(ln.value), d.x + 130, y, { align: 'right', size: 11, color: '#e8e0d0' });
        if (ln.delta !== null && ln.delta !== 0) {
          g.text(`${ln.delta > 0 ? '+' : ''}${ln.delta}`, d.x + 190, y,
            { align: 'right', size: 11, color: ln.delta > 0 ? '#7fa85c' : '#c96a5a' });
        }
      });
      if (lines.length === 0) {
        g.text('Stat katkısı yok', d.x + 16, d.y + 58, { size: 11, color: '#6f655a' });
      }
    }
    for (const b of invButtons()) {
      const active = picked !== null;
      /* Düğme zeminleri GÖRSELDE var (yeşil/altın/kırmızı). Görsel
         yüklüyse yalnız PASİF durum karartılır ve metin yazılır. */
      if (!art) g.rect(b.x, b.y, b.w, b.h, active ? '#1c1710' : '#141009', 0.95);
      else if (!active) g.rect(b.x, b.y, b.w, b.h, '#0b0908', 0.55);
      if (!art) g.rect(b.x, b.y, b.w, 2, active ? '#e08a3c' : '#3a3128');
      g.text(b.label, b.x + b.w / 2, b.y + b.h / 2 - 7,
        { align: 'center', size: 13, bold: true, color: active ? '#e8d9a0' : '#4a3f30' });
    }
  }

  /** Yuva kutusuna sığmayan uzun adları kısaltır (yalnız GÖRSEL). */


  /* ═══════════════ P2.7 — KARAKTER EKRANI ═══════════════
     Statlar BURADA HESAPLANMAZ: `ArcherBuildResolver` authority'sinden okunur.
     Ekipman katkısı, kuşanılı hâl ile TABAN (seviye) statının farkıdır. */

  private handleCharacter(p: PointerEventInfo): void {
    const hit = charHitTest(p.x, p.y);
    if (hit === null) return;
    this.host.audio.play('ui');
    if (hit.id === 'inv_close') { this.charOpen = false; return; }
    /* Stat dağıtımı — karar `ArcherProgression.spend()` authority'sindedir;
       panel yalnız iletir ve sonucu gösterir. */
    const alloc = parseAllocId(hit.id);
    if (!alloc) return;
    const res = this.S.stats.progression.spend(alloc.stat, alloc.amount);
    if (!res.ok) {
      this.say(res.reason === 'noPoints' ? 'Puan yetmiyor' : 'Geçersiz miktar');
      return;
    }
    /* Tavan değiştiği için can/mana yeniden doldurulur (KO davranışı:
       seviye atlayınca sunucu MaxHP/MaxMP'yi yeniden hesaplayıp doldurur). */
    this.S.player.restoreVitals({ hp: Number.POSITIVE_INFINITY, mp: Number.POSITIVE_INFINITY });
    this.say(alloc.stat === 'dex' ? `DEX +${alloc.amount}` : `HP +${alloc.amount}`);
  }

  /** Görsel varken YALNIZ başlık metni. Maketin başlık şeridi ORTADA
   *  olduğu için metin de ortalanır. */
  private panelTitle(g: DrawApi, title: string, right: string): void {
    g.text(title, PROTO.screenW / 2, 38,
      { align: 'center', size: 15, bold: true, color: '#e8d9a0' });
    if (right) {
      g.text(right, PROTO.screenW / 2, 58,
        { align: 'center', size: 11, color: '#8d8272' });
    }
  }


  /* ═══════════════ ZİNDAN MODU ═══════════════ */

  get inDungeon(): boolean { return this.dungeon !== null; }

  /** Zindana gir. Normal karakter SAKLANIR, silinmez. */
  private enterDungeon(): void {
    if (this.dungeon) return;
    this.S.saveNow();                       // normal ilerleme kaybolmasın
    this.overworld = this.S;
    const d = new DungeonSession();
    d.load();                               // önceki zindan ilerlemesi varsa
    this.dungeon = d;
    this.S = d.state;
    this.S.targets.clear();
    this.say(`Zindan — Kat ${d.dungeon.floor}`);
  }

  /** Zindandan çık. Zindan ilerlemesi KAYDEDİLİR. */
  private exitDungeon(): void {
    const d = this.dungeon;
    if (!d || !this.overworld) return;
    d.save();
    this.dungeon = null;
    this.shopOpen = false;
    this.S = this.overworld;
    this.overworld = null;
    this.S.targets.clear();
    this.say('Moradon\'a döndün');
  }

  /** Zindan kare akışı: dalga doğur, temizleneni süpür, ölümü işle.
   *  Normal dünyanın `update`i BU KODU HİÇ ÇALIŞTIRMAZ. */
  private tickDungeon(): void {
    const d = this.dungeon;
    if (!d) return;
    if (!this.S.player.alive) {
      const floor = d.onDeath();
      this.say(`Öldün — Kat ${floor}`);
      return;
    }
    if (d.sweepCleared()) {
      this.say(`Dalga ${d.dungeon.wave - 1} temiz`);
      return;                                // bir kare nefes: art arda doğmasın
    }
    if (!d.dungeon.waveActive) d.startNextWave();
  }

  /** Zindan HUD'ı: üstte bilgi, altta eylem. Savaş alanı BOŞ kalır. */
  private renderDungeonHud(g: DrawApi): void {
    const d = this.dungeon;
    if (!d) return;
    const A = 0.95;
    const f = this.S.stats.finalStats();
    const power = combatPower({
      attack: f.attack, defense: f.defense, maxHp: f.maxHp, maxMp: f.maxMp,
      dex: this.S.stats.effectiveDex(), sta: this.S.stats.effectiveSta(),
    });
    const rec = recommendedPower(d.dungeon.floor);
    const risk = floorRisk(power, rec);

    g.rect(DUNGEON_INFO.x, DUNGEON_INFO.y, DUNGEON_INFO.w, DUNGEON_INFO.h, '#100d08', 0.82);
    g.rect(DUNGEON_INFO.x, DUNGEON_INFO.y, DUNGEON_INFO.w, 2, '#c9a05a', A);
    g.text(`KAT ${d.dungeon.floor}`, DUNGEON_FLOOR_BOX.x + 8, DUNGEON_FLOOR_BOX.y + 10,
      { size: 17, bold: true, color: '#e8d9a0' });
    g.text(`Dalga ${d.dungeon.wave}`,
      DUNGEON_WAVE_BOX.x + DUNGEON_WAVE_BOX.w - 8, DUNGEON_WAVE_BOX.y + 12,
      { align: 'right', size: 14, color: '#cfc7b6' });
    g.text(`Güç ${power}  ·  Önerilen ${rec}`,
      DUNGEON_POWER_ROW.x + 8, DUNGEON_POWER_ROW.y + 10, { size: 12, color: '#8d8272' });
    g.text(RISK_LABEL[risk], DUNGEON_POWER_ROW.x + DUNGEON_POWER_ROW.w - 8,
      DUNGEON_POWER_ROW.y + 8, {
        align: 'right', size: 14, bold: true,
        color: risk === 'safe' ? '#7fa85c' : risk === 'fair' ? '#e8d9a0'
          : risk === 'high' ? '#e08a3c' : '#c96a5a',
      });
    /* En yüksek kat — geri dönüş hedefi. */
    if (d.dungeon.highestFloor > d.dungeon.floor) {
      g.text(`En yüksek: ${d.dungeon.highestFloor}`,
        DUNGEON_FLOOR_BOX.x + 8, DUNGEON_FLOOR_BOX.y + 30, { size: 10, color: '#6f655a' });
    }

    for (const b of dungeonActions()) {
      /* İLERİ dalga sürerken PASİF — neden pasif olduğu görünsün. */
      const blocked = b.id === 'dg_next' && d.dungeon.waveActive;
      const atBottom = b.id === 'dg_prev' && d.dungeon.floor <= 1;
      const off = blocked || atBottom;
      g.rect(b.x, b.y, b.w, b.h, off ? '#141009' : '#2c2417', A);
      g.rect(b.x, b.y, b.w, 2, off ? '#3a3128' : '#e08a3c', A);
      g.text(b.label, b.x + b.w / 2, b.y + b.h / 2 - 9,
        { align: 'center', size: 15, bold: true, color: off ? '#6f655a' : '#e8d9a0' });
    }
    g.rect(DUNGEON_SHOP_BTN.x, DUNGEON_SHOP_BTN.y,
      DUNGEON_SHOP_BTN.w, DUNGEON_SHOP_BTN.h, '#241c14', A);
    g.rect(DUNGEON_SHOP_BTN.x, DUNGEON_SHOP_BTN.y, DUNGEON_SHOP_BTN.w, 2, '#c9a05a', A);
    g.text('İKSİR', DUNGEON_SHOP_BTN.x + DUNGEON_SHOP_BTN.w / 2,
      DUNGEON_SHOP_BTN.y + 15, { align: 'center', size: 13, bold: true, color: '#e8d9a0' });
  }

  /** Zindan eylem düğmeleri. */
  private handleDungeonInput(p: PointerEventInfo): boolean {
    const d = this.dungeon;
    if (!d) return false;
    const hit = dungeonHitTest(p.x, p.y);
    if (hit === null) return false;
    this.host.audio.play('ui');
    if (hit.kind === 'shop') { this.shopOpen = true; return true; }
    if (hit.id === 'dg_exit') { this.exitDungeon(); return true; }
    if (hit.id === 'dg_prev') {
      const r = d.dungeon.previousFloor();
      this.say(r.ok ? `Kat ${r.floor}` : 'En alttasın');
      return true;
    }
    const r = d.dungeon.nextFloor(this.S.player.alive);
    this.say(r.ok ? `Kat ${r.floor}` : 'Önce dalgayı temizle');
    return true;
  }

  /** İksir mağazası. */
  private renderShop(g: DrawApi): void {
    const d = this.dungeon;
    if (!d) return;
    g.rect(0, 0, PROTO.screenW, PROTO.screenH, '#050403', 0.8);
    g.rect(SHOP_PANEL.x, SHOP_PANEL.y, SHOP_PANEL.w, SHOP_PANEL.h, '#100d08', 0.97);
    g.rect(SHOP_PANEL.x, SHOP_PANEL.y, SHOP_PANEL.w, 3, '#c9a05a');
    g.text('İKSİR MAĞAZASI', SHOP_PANEL.x + SHOP_PANEL.w / 2, SHOP_PANEL.y + 18,
      { align: 'center', size: 15, bold: true, color: '#e8d9a0' });
    g.text(`${this.S.player.coins} altın`, SHOP_PANEL.x + SHOP_PANEL.w / 2,
      SHOP_PANEL.y + 40, { align: 'center', size: 12, color: '#c9a05a' });
    g.rect(SHOP_CLOSE.x, SHOP_CLOSE.y, SHOP_CLOSE.w, SHOP_CLOSE.h, '#241c14');
    g.text(SHOP_CLOSE.label, SHOP_CLOSE.x + SHOP_CLOSE.w / 2, SHOP_CLOSE.y + 12,
      { align: 'center', size: 15, color: '#cfc7b6' });

    const cat = shopCatalog();
    shopRows().forEach((r, i) => {
      const e = cat[i];
      if (!e) return;
      g.rect(r.x, r.y, r.w, r.h, '#1a1610', 0.9);
      g.rect(r.x, r.y, r.w, 2, e.resource === 'hp' ? '#c96a5a' : '#6f8fd0');
      g.text(e.displayName, r.x + 10, r.y + 8, { size: 12, bold: true, color: '#e8e0d0' });
      g.text(`${e.resource === 'hp' ? 'Can' : 'Mana'} +${e.restoreAmount}  ·  ${e.unitPrice} altın`,
        r.x + 10, r.y + 28, { size: 10, color: '#8d8272' });
      g.text(`x${this.S.inventory.count(e.itemRef)}`, r.x + r.w - 160, r.y + 18,
        { align: 'right', size: 11, color: '#cfc7b6' });
      for (const b of shopBuyButtons(r)) {
        const can = this.S.player.coins >= e.unitPrice * b.qty;
        g.rect(b.x, b.y, b.w, b.h, can ? '#2c2417' : '#141009');
        g.rect(b.x, b.y, b.w, 2, can ? '#7fa85c' : '#3a3128');
        g.text(`x${b.qty}`, b.x + b.w / 2, b.y + b.h / 2 - 7,
          { align: 'center', size: 12, bold: true, color: can ? '#e8d9a0' : '#6f655a' });
      }
    });
  }

  private handleShopInput(p: PointerEventInfo): void {
    const d = this.dungeon;
    if (!d) return;
    if (this.hit(p, SHOP_CLOSE)) { this.host.audio.play('ui'); this.shopOpen = false; return; }
    const cat = shopCatalog();
    shopRows().forEach((r, i) => {
      const e = cat[i];
      if (!e) return;
      for (const b of shopBuyButtons(r)) {
        if (!this.hit(p, { id: `buy_${i}_${b.qty}`, ...b, label: '' })) continue;
        const res = d.buyPotion(e.itemRef, b.qty);
        this.host.audio.play('ui');
        this.say(res.ok
          ? `${e.displayName} x${b.qty} alındı (-${res.cost})`
          : res.fail === 'noCoins' ? 'Altın yetmiyor' : 'Çanta dolu');
      }
    });
  }

  /** Panel kabuğu — YEDEK çizim. Görsel yüklüyse çağıranlar bunu
   *  ATLAR; yalnız başlık metni yazılır (bkz. `panelTitle`). */
  private panelShell(g: DrawApi, title: string, right: string): void {
    const F = PANEL_FRAME;
    g.rect(0, 0, PROTO.screenW, PROTO.screenH, '#050403', 0.72);
    g.rect(F.x, F.y, F.w, F.h, '#100d08', 0.97);
    g.rect(F.x, F.y, F.w, 3, '#e08a3c');
    g.text(title, F.x + 16, F.y + 18, { size: 15, bold: true, color: '#e8d9a0' });
    if (right) g.text(right, F.x + F.w - 74, F.y + 20, { align: 'right', size: 12, color: '#8d8272' });
    const c = panelCloseButton();
    g.rect(c.x, c.y, c.w, c.h, '#241c14');
    g.text(c.label, c.x + c.w / 2, c.y + 9, { align: 'center', size: 15, color: '#cfc7b6' });
  }

  private renderCharacter(g: DrawApi): void {
    /* P2.25 — panel görseli. Yüklüyse çerçeveyi O taşır; kod yalnız
       metin, ikon ve durum vurgusu çizer (bkz. P2.24.2 üzerine çizim
       hatası). */
    const art = this.host.assets.has('ui_char_panel');
    if (art) {
      g.rect(0, 0, PROTO.screenW, PROTO.screenH, '#050403', 0.75);
      g.image('ui_char_panel', 0, 0, { w: PROTO.screenW, h: PROTO.screenH, alpha: 1 });
    }
    const p = this.S.player;
    const final = this.S.stats.finalStats();
    const base = StatCalculator.baseStats(p.level);
    const prog = this.S.stats.progression;
    if (art) this.panelTitle(g, 'KARAKTER', `Sv ${p.level} · ${prog.stage.stage}`);
    else this.panelShell(g, 'KARAKTER', `Sv ${p.level} · ${prog.stage.stage}`);

    /* ═══ P2.25.2 — MAKETE OTURTULMUŞ ÇİZİM ═══
       Bir önceki turda görsel eklendi ama YERLEŞİM eski kalmıştı:
       stat listesi portre çemberinin üstüne, ekipman özeti direnç
       bloğunun üstüne biniyordu. Artık her blok maketten ölçülen
       konumdan çizilir ve görsel varken kendi zeminini çizmez. */

    /* ---- kimlik ---- */
    CHAR_IDENTITY_ROWS.forEach(([y, h], i) => {
      if (!art) g.rect(CHAR_IDENTITY_X, y, CHAR_IDENTITY_W, h, '#0b0908', 0.9);
      const text = i === 0 ? `Sv ${p.level}`
        : i === 1 ? `Okçu · ${prog.stage.stage}`
          : `${p.coins} altın`;
      g.text(text, CHAR_IDENTITY_X + 14, y + h / 2 - 7,
        { size: 12, bold: i === 0, color: i === 0 ? '#e8d9a0' : '#cfc7b6' });
    });

    /* ---- stat dağıtımı ---- */
    g.text(`DAĞITILABİLİR PUAN: ${prog.unspent}`,
      ALLOC_POINT_ROW.x + 14, ALLOC_POINT_ROW.y + 9,
      { size: 12, bold: true, color: prog.unspent > 0 ? '#e8d9a0' : '#6f655a' });
    const btns = allocButtons();
    ALLOC_ROWS.forEach((stat, i) => {
      const [y, h] = ALLOC_STAT_ROWS[i]!;
      const label = stat === 'dex' ? 'DEX (saldırı)' : 'HP (can + mana)';
      const value = stat === 'dex' ? this.S.stats.effectiveDex() : this.S.stats.effectiveSta();
      const spent = stat === 'dex' ? prog.spent.dex : prog.spent.hp;
      g.text(label, 78, y + h / 2 - 7, { size: 12, color: '#cfc7b6' });
      g.text(`${value}`, 415, y + h / 2 - 8,
        { align: 'right', size: 13, bold: true, color: '#e8e0d0' });
      if (spent > 0) {
        g.text(`+${spent}`, 415, y + h / 2 + 6,
          { align: 'right', size: 9, color: '#7fa85c' });
      }
      for (const b of btns.filter((x) => x.stat === stat)) {
        const on = prog.unspent >= b.amount;
        if (!art || !on) g.rect(b.x, b.y, b.w, b.h, on ? '#2c2417' : '#0b0908', on ? 0.5 : 0.6);
        g.text(`+${b.amount}`, b.x + b.w / 2, b.y + b.h / 2 - 7,
          { align: 'center', size: 12, bold: true, color: on ? '#e8d9a0' : '#4a4239' });
      }
    });

    /* ---- stat listesi ---- */
    const rows = statRows(final, base, this.S.timing.actionTime(0));
    rows.forEach((row, i) => {
      const y = CHAR_STAT_FIRST_Y + i * CHAR_STAT_ROW_H;
      g.text(row.label, 84, y, { size: 11, color: '#cfc7b6' });
      g.text(row.value, CHAR_STAT_DIVIDER_X - 14, y,
        { align: 'right', size: 12, bold: true, color: '#e8e0d0' });
      if (row.fromGear !== null) {
        g.text(row.fromGear, 560, y,
          { align: 'right', size: 10, color: row.fromGear.startsWith('-') ? '#c96a5a' : '#7fa85c' });
      }
    });
    /* Maket 11 satır taşıyor, listemiz 10 — sonuncusuna GÜÇ SKORU. */
    const extraY = CHAR_STAT_FIRST_Y + rows.length * CHAR_STAT_ROW_H;
    g.text('Güç skoru', 84, extraY, { size: 11, color: '#c9a05a' });
    g.text(formatPower(this.S.autoGear.score()), CHAR_STAT_DIVIDER_X - 14, extraY,
      { align: 'right', size: 12, bold: true, color: '#e8d9a0' });

    /* ---- direnç (sistem PASİF: değerler gösterilmez, blok yer tutar) ---- */
    CHAR_RESIST_ROWS.forEach(([y, h]) => {
      g.text('—', 200, y + h / 2 - 7, { size: 11, color: '#4a4239' });
      g.text('—', 560, y + h / 2 - 7, { align: 'right', size: 11, color: '#4a4239' });
    });
  }

  private skillPool(): number[] {
    return GENIE_SKILL_POOL.filter((ref) => SkillRegistry.get(ref) !== undefined);
  }

  private handleSkills(p: PointerEventInfo): void {
    const pool = this.skillPool();
    const pageCount = Math.max(1, Math.ceil(pool.length / SKILL_PAGE_SIZE));
    const shown = pool.slice(this.skillPage * SKILL_PAGE_SIZE,
      this.skillPage * SKILL_PAGE_SIZE + SKILL_PAGE_SIZE);
    const hit = skillHitTest(p.x, p.y, ACTIVE_BAR_SLOTS, shown.length);
    if (hit === null) return;
    this.host.audio.play('ui');
    if (hit.kind === 'button') {
      if (hit.id === 'inv_close') { this.skillOpen = false; return; }
      if (hit.id === 'skill_prev') this.skillPage = (this.skillPage + pageCount - 1) % pageCount;
      if (hit.id === 'skill_next') this.skillPage = (this.skillPage + 1) % pageCount;
      return;
    }
    if (hit.kind === 'bar') {
      /* Aynı yuvaya ikinci dokunuş yuvayı BOŞALTIR. */
      if (this.skillBarSel === hit.index) {
        this.S.combat.skills.loadout.setSlot(hit.index, null);
        this.say('Yuva boşaltıldı');
      }
      this.skillBarSel = hit.index;
      return;
    }
    /* havuzdan seçim → seçili bar yuvasına ata */
    const ref = shown[hit.index];
    if (ref === undefined) return;
    const def = SkillRegistry.get(ref);
    if (!def) return;
    if (def.requiredLevel > this.S.player.level) {
      this.say(`Sv ${def.requiredLevel} gerekiyor`);
      return;
    }
    /* P2.21 — SKILL PUANI. Seviye şartı geçse bile skill AÇILMAMIŞSA
       yuvaya konamaz; dokunuş önce açma denemesi yapar. */
    const prog = this.S.stats.progression;
    if (!prog.isUnlocked(ref)) {
      const r = prog.unlockSkill(ref);
      if (!r.ok) {
        this.say(r.reason === 'noPoints' ? 'Skill puanı yetmiyor' : 'Açılamadı');
        return;
      }
      this.say(`${def.displayName} açıldı`);
      return;
    }
    const ok = this.S.combat.skills.loadout.setSlot(this.skillBarSel, ref);
    this.say(ok ? `${def.displayName} → yuva ${this.skillBarSel + 1}` : 'Bu yuvaya atanamadı');
  }

  private renderSkills(g: DrawApi): void {
    /* P2.25 — panel görseli. Yüklüyse çerçeveyi O taşır; kod yalnız
       metin, ikon ve durum vurgusu çizer (bkz. P2.24.2 üzerine çizim
       hatası). */
    const art = this.host.assets.has('ui_skill_panel');
    if (art) {
      g.rect(0, 0, PROTO.screenW, PROTO.screenH, '#050403', 0.75);
      g.image('ui_skill_panel', 0, 0, { w: PROTO.screenW, h: PROTO.screenH, alpha: 1 });
    }
    const pool = this.skillPool();
    const pageCount = Math.max(1, Math.ceil(pool.length / SKILL_PAGE_SIZE));
    const shown = pool.slice(this.skillPage * SKILL_PAGE_SIZE,
      this.skillPage * SKILL_PAGE_SIZE + SKILL_PAGE_SIZE);
    const sp = this.S.stats.progression.skillUnspent;
    if (art) this.panelTitle(g, 'YETENEKLER', `${sp} puan · ${this.skillPage + 1}/${pageCount}`);
    else this.panelShell(g, 'YETENEKLER', `${sp} puan · ${this.skillPage + 1}/${pageCount}`);

    /* ═══ P2.25.2 — MAKETE OTURTULMUŞ AKTİF BAR ═══
       Yuva konumları maketten ölçüldü; isim yuvanın ALTINDAKİ şeritte
       (maketin ayırdığı yer), mana ise yuvanın içinde. Eskiden ikisi de
       yuvanın içine yazılıyor ve üst üste biniyordu. */
    g.text(`${sp} puan`, SKILL_POINT_ROW.x + 14, SKILL_POINT_ROW.y + 18,
      { size: 12, bold: true, color: sp > 0 ? '#e8d9a0' : '#6f655a' });
    const slots = this.S.combat.skills.slots();
    SKILL_BAR_SLOTS.forEach(([x, w], i) => {
      const def = slots[i]?.def;
      const on = this.skillBarSel === i;
      if (!art) g.rect(x, SKILL_BAR_Y, w, SKILL_BAR_H, '#1a1610');
      if (on) g.rect(x, SKILL_BAR_Y, w, SKILL_BAR_H, '#2c2417', 0.55);
      g.text(`${i + 1}`, x + 5, SKILL_BAR_Y + 4, { size: 9, color: '#6f655a' });
      if (def) {
        g.text(`${def.manaCost}`, x + w / 2, SKILL_BAR_Y + SKILL_BAR_H / 2 - 8,
          { align: 'center', size: 13, bold: true, color: '#6f8fd0' });
        g.text(this.shortLabel(def.displayName), x + w / 2, SKILL_BAR_LABEL_Y + 4,
          { align: 'center', size: 9, color: '#cfc7b6' });
      } else {
        g.text('—', x + w / 2, SKILL_BAR_Y + SKILL_BAR_H / 2 - 8,
          { align: 'center', size: 13, color: '#3a3128' });
      }
    });

    /* ---- havuz ---- */
    const equipped = new Set(slots.map((s) => s.def?.sourceRef).filter((v) => v !== undefined));
    skillPoolCells().slice(0, shown.length).forEach((r, i) => {
      const ref = shown[i]!;
      const def = SkillRegistry.get(ref);
      if (!def) return;
      /* P2.31 — kapı durumu TEK KAYNAKTAN (`skillGate`). Eskiden HUD
         ve yetenek ekranı kilidi ayrı ayrı hesaplıyordu. */
      const gate = skillGate({
        requiredLevel: def.requiredLevel,
        playerLevel: this.S.player.level,
        unlocked: this.S.stats.progression.isUnlocked(ref),
        blocked: null,
      });
      const levelLocked = gate === 'levelLocked';
      const unlocked = gate !== 'unpurchased';
      const locked = gate !== 'ready';
      const inBar = equipped.has(ref);
      /* Hücre zemini GÖRSELDEN; kod yalnız durum vurgusu ve metin.
         Metin ikon karesinin SAĞINDAN başlar — maketin sol tarafında
         kare bir ikon alanı var. */
      if (!art) g.rect(r.x, r.y, r.w, r.h, '#141009', 0.95);
      if (inBar) g.rect(r.x, r.y, 3, r.h, '#e08a3c');
      const tx = r.x + SKILL_POOL_ICON_W + 10;
      g.text(def.displayName, tx, r.y + 12,
        { size: 11, bold: true, color: locked ? '#4a4239' : '#e8e0d0' });
      g.text(`Sv ${def.requiredLevel} · ${def.manaCost}MP`,
        tx, r.y + 30, { size: 9, color: locked ? '#4a4239' : '#8d8272' });
      if (inBar) {
        g.text('kuşanılı', r.x + r.w - 10, r.y + 22,
          { align: 'right', size: 9, color: '#e08a3c' });
      } else if (levelLocked) {
        g.text(`Sv ${def.requiredLevel}`, r.x + r.w - 10, r.y + 22,
          { align: 'right', size: 9, color: '#c96a5a' });
      } else if (!unlocked) {
        g.text(`AÇ ${ArcherProgression.SKILL_COST}p`, r.x + r.w - 10, r.y + 22,
          { align: 'right', size: 9, color: '#7fa85c' });
      }
    });

    g.text(`${this.skillPage + 1} / ${pageCount}`,
      SKILL_PAGE_ROW.x + SKILL_PAGE_ROW.w / 2, SKILL_PAGE_ROW.y + 14,
      { align: 'center', size: 12, bold: true, color: '#cfc7b6' });
    for (const b of skillPageButtons()) {
      if (!art) {
        g.rect(b.x, b.y, b.w, b.h, '#1c1710', 0.95);
        g.text(b.label, b.x + b.w / 2, b.y + b.h / 2 - 9,
          { align: 'center', size: 18, bold: true, color: '#cfc7b6' });
      }
    }
  }


  /* ═══════════════ P2.8 — ÖRS ═══════════════
     Karar ve mutasyon `ForgeSystem` authority'sindedir; bu metotlar yalnız
     listeler, gösterir ve dokunmayı iletir. */

  /** Yükseltilebilir eşyalar: katalogda tanımı olan, kilitli olmayanlar.
   *  Kuşanılı olanlar DA listelenir — yükseltmek için çıkarmak gerekmez. */
  private forgeItems(): ItemInstance[] {
    return this.S.inventory.allEntries()
      .filter((e) => !e.locked && definitionOf(e.itemRef) !== null)
      .sort((a, b) => a.instanceId - b.instanceId);
  }

  private handleForge(p: PointerEventInfo): void {
    const items = this.forgeItems();
    const pageCount = Math.max(1, Math.ceil(items.length / FORGE_PAGE_SIZE));
    const shown = items.slice(this.forgePage * FORGE_PAGE_SIZE,
      this.forgePage * FORGE_PAGE_SIZE + FORGE_PAGE_SIZE);
    const hit = forgeHitTest(p.x, p.y, shown.length);
    if (hit === null) return;
    this.host.audio.play('ui');
    if (hit.kind === 'row') {
      this.forgeSel = shown[hit.index]?.instanceId ?? null;
      this.forgeMsg = '';
      return;
    }
    if (hit.id === 'inv_close') { this.forgeOpen = false; return; }
    if (hit.id === 'forge_prev') { this.forgePage = (this.forgePage + pageCount - 1) % pageCount; return; }
    if (hit.id === 'forge_next') { this.forgePage = (this.forgePage + 1) % pageCount; return; }
    if (hit.id !== 'forge_do') return;

    if (this.forgeSel === null) { this.forgeMsg = 'Önce bir eşya seç'; return; }
    const before = this.S.inventory.get(this.forgeSel);
    const name = before ? definitionOf(before.itemRef)?.displayName ?? 'Eşya' : 'Eşya';
    const res = this.S.forge.upgrade(this.forgeSel);
    if (!res.ok) { this.forgeMsg = FORGE_FAIL[res.reason]; return; }
    if (res.success) {
      this.forgeMsg = `${name} +${res.newLevel} oldu`;
      this.say(this.forgeMsg);
    } else {
      this.forgeMsg = `${name} YANDI (şans %${Math.round(res.chance * 100)})`;
      this.say(this.forgeMsg);
      this.forgeSel = null;
    }
  }

  private renderForge(g: DrawApi): void {
    const items = this.forgeItems();
    const pageCount = Math.max(1, Math.ceil(items.length / FORGE_PAGE_SIZE));
    const shown = items.slice(this.forgePage * FORGE_PAGE_SIZE,
      this.forgePage * FORGE_PAGE_SIZE + FORGE_PAGE_SIZE);
    const scrolls = this.S.forge.scrollCount();
    this.panelShell(g, 'ÖRS', `${this.S.player.coins} altın · ${scrolls} parşömen`);

    /* ---- eşya listesi ---- */
    const L = FORGE_LIST_BOX;
    g.rect(L.x, L.y, L.w, L.h, '#0b0908', 0.95);
    g.text(`EŞYALAR  ${this.forgePage + 1}/${pageCount}`, L.x + 12, L.y + 10,
      { size: 11, bold: true, color: '#8d8272' });
    forgeRowRects(shown.length).forEach((r, i) => {
      const e = shown[i]!;
      const def = definitionOf(e.itemRef)!;
      const on = this.forgeSel === e.instanceId;
      g.rect(r.x, r.y, r.w, r.h, on ? '#2c2417' : '#141009', 0.95);
      g.rect(r.x, r.y, 3, r.h, ITEM_CLASS_COLOR[def.itemClass]);
      g.text(e.upgradeLevel > 0 ? `${def.displayName} +${e.upgradeLevel}` : def.displayName,
        r.x + 14, r.y + 8, { size: 12, bold: true, color: ITEM_CLASS_COLOR[def.itemClass] });
      const pv = forgePreview(e.upgradeLevel);
      g.text(pv.atMax ? 'tavan' : `+${pv.to} · %${Math.round(pv.chance * 100)}`,
        r.x + r.w - 14, r.y + 16,
        { align: 'right', size: 11, color: pv.atMax ? '#4a4239' : pv.guaranteed ? '#7fa85c' : '#e08a3c' });
      if (e.equippedSlot !== null) {
        g.text('kuşanılı', r.x + 14, r.y + 28, { size: 9, color: '#6f655a' });
      }
    });
    if (shown.length === 0) {
      g.text('Yükseltilebilir eşya yok', L.x + L.w / 2, L.y + 60,
        { align: 'center', size: 12, color: '#6f655a' });
    }

    /* ---- önizleme ---- */
    const B = FORGE_PREVIEW_BOX;
    g.rect(B.x, B.y, B.w, B.h, '#0b0908', 0.95);
    const sel = this.forgeSel === null ? undefined : this.S.inventory.get(this.forgeSel);
    if (!sel) {
      g.text(this.forgeMsg || 'Bir eşya seç', B.x + 14, B.y + 16,
        { size: 12, color: this.forgeMsg ? '#e8d9a0' : '#6f655a' });
    } else {
      const def = definitionOf(sel.itemRef)!;
      const pv = forgePreview(sel.upgradeLevel);
      g.text(`${def.displayName} +${sel.upgradeLevel} → +${pv.to}`, B.x + 14, B.y + 14,
        { size: 13, bold: true, color: ITEM_CLASS_COLOR[def.itemClass] });
      if (pv.atMax) {
        g.text('Bu eşya kaynak eğrisinin tavanında — denenemez.', B.x + 14, B.y + 42,
          { size: 11, color: '#8d8272' });
      } else {
        const rows: Array<[string, string, string]> = [
          ['Başarı şansı', `%${Math.round(pv.chance * 100)}`, pv.guaranteed ? '#7fa85c' : '#e08a3c'],
          ['Altın', `${pv.gold}`, this.S.player.coins >= pv.gold ? '#e8e0d0' : '#c96a5a'],
          ['Parşömen', `${pv.scrolls}`, scrolls >= pv.scrolls ? '#e8e0d0' : '#c96a5a'],
        ];
        rows.forEach(([k, v, col], i) => {
          const y = B.y + 44 + i * 24;
          g.text(k, B.x + 16, y, { size: 11, color: '#8d8272' });
          g.text(v, B.x + 220, y, { align: 'right', size: 12, bold: true, color: col });
        });
        g.text(pv.guaranteed ? 'Garantili — eşya yanmaz.' : 'BAŞARISIZ OLURSA EŞYA YANAR.',
          B.x + 16, B.y + 122,
          { size: 11, bold: !pv.guaranteed, color: pv.guaranteed ? '#7fa85c' : '#c96a5a' });
      }
      if (this.forgeMsg) {
        g.text(this.forgeMsg, B.x + 16, B.y + 146, { size: 11, color: '#e8d9a0' });
      }
    }

    for (const b of forgeButtons()) {
      const active = b.id !== 'forge_do' || (sel !== undefined && canAttempt(sel.upgradeLevel));
      g.rect(b.x, b.y, b.w, b.h, active ? '#1c1710' : '#141009', 0.95);
      g.rect(b.x, b.y, b.w, 2, active ? '#e08a3c' : '#3a3128');
      g.text(b.label, b.x + b.w / 2, b.y + b.h / 2 - 8,
        { align: 'center', size: b.id === 'forge_do' ? 13 : 18, bold: true,
          color: active ? '#e8d9a0' : '#4a4239' });
    }
  }


  /* ═══════════════ P2.16 — OTO SAT EKRANI ═══════════════
     Ayarlar ve onay kuyruğu. Karar `AutoGearSystem` authority'sindedir;
     bu metotlar yalnız iletir ve sonucu gösterir. */

  private handleSell(p: PointerEventInfo): void {
    const pend = this.S.autoGear.pendingSales().slice(0, PENDING_PAGE_SIZE);
    const hit = sellHitTest(p.x, p.y, pend.length);
    if (hit === null) return;
    this.host.audio.play('ui');
    const st = this.S.autoGear.settings;

    if (hit.kind === 'toggle') {
      st[hit.id] = !st[hit.id];
      this.sellMsg = `${TOGGLE_LABELS[hit.id]}: ${st[hit.id] ? 'AÇIK' : 'KAPALI'}`;
      return;
    }
    if (hit.kind === 'class') { st.sellBelowClass = hit.cls; this.sellMsg = ''; return; }
    if (hit.kind === 'keepMax') { st.consumableKeepMax = hit.value; this.sellMsg = ''; return; }
    if (hit.kind === 'pendingKeep') {
      const inst = pend[hit.index];
      if (inst) { this.S.autoGear.keep(inst.instanceId); this.sellMsg = 'Tutuldu'; }
      return;
    }
    if (hit.kind === 'pendingSell') {
      const inst = pend[hit.index];
      if (!inst) return;
      const r = this.S.autoGear.sell(inst.instanceId);
      this.sellMsg = r.ok ? `Satıldı · +${r.coins} altın` : SELL_FAIL[r.reason ?? 'notFound'];
      return;
    }
    if (hit.id === 'inv_close') { this.sellOpen = false; return; }
    if (hit.id === 'sell_sweep') {
      const r = this.S.autoGear.sellAllEligible();
      this.sellMsg = st.autoSell
        ? `${r.sold} eşya satıldı · +${r.coins} altın`
        : 'Önce OTO SAT açılmalı';
      return;
    }
    if (hit.id === 'sell_keep_all') {
      for (const i of this.S.autoGear.pendingSales()) this.S.autoGear.keep(i.instanceId);
      this.sellMsg = 'Bekleyenlerin hepsi tutuldu';
      return;
    }
    if (hit.id === 'sell_all_pending') {
      let n = 0, c = 0;
      for (const i of this.S.autoGear.pendingSales()) {
        const r = this.S.autoGear.sell(i.instanceId);
        if (r.ok) { n += 1; c += r.coins; }
      }
      this.sellMsg = `${n} eşya satıldı · +${c} altın`;
    }
  }

  private renderSell(g: DrawApi): void {
    const st = this.S.autoGear.settings;
    this.panelShell(g, 'SATIŞ VE OTOMATİK', `${this.S.player.coins} altın`);

    /* ---- aç/kapa anahtarları ---- */
    for (const t of toggleRects()) {
      const on = st[t.id];
      g.rect(t.x, t.y, t.w, t.h, on ? '#1c2a18' : '#141009', 0.95);
      g.rect(t.x, t.y, 3, t.h, on ? '#7fa85c' : '#3a3128');
      g.text(`${on ? '☑' : '☐'}  ${TOGGLE_LABELS[t.id]}`, t.x + 14, t.y + t.h / 2 - 7,
        { size: 12, bold: true, color: on ? '#c8e0b0' : '#8d8272' });
    }

    /* ---- kalite eşiği ---- */
    g.text('BU KALİTENİN ALTINDAKİLERİ SAT', SELL_PANEL.x + 20, SELL_PANEL.y + 212,
      { size: 10, bold: true, color: '#8d8272' });
    for (const b of classButtons()) {
      const on = st.sellBelowClass === b.cls;
      g.rect(b.x, b.y, b.w, b.h, on ? '#2c2417' : '#141009', 0.95);
      g.rect(b.x, b.y, b.w, 2, on ? '#e08a3c' : '#3a3128');
      g.text(b.cls === null ? 'KAPALI' : ITEM_CLASS_LABEL[b.cls],
        b.x + b.w / 2, b.y + b.h / 2 - 7,
        { align: 'center', size: 10, bold: true,
          color: on ? '#e8d9a0' : (b.cls === null ? '#6f655a' : ITEM_CLASS_COLOR[b.cls]) });
    }

    /* ---- tüketilebilir üst sınırı ---- */
    g.text('PARŞÖMEN/İKSİR ÜST SINIRI (fazlası satılır)',
      SELL_PANEL.x + 20, SELL_PANEL.y + 278, { size: 10, bold: true, color: '#8d8272' });
    for (const b of keepMaxButtons()) {
      const on = st.consumableKeepMax === b.value;
      const usable = st.protectConsumables;
      g.rect(b.x, b.y, b.w, b.h, on ? '#2c2417' : '#141009', usable ? 0.95 : 0.5);
      g.rect(b.x, b.y, b.w, 2, on ? '#e08a3c' : '#3a3128');
      g.text(b.value === null ? 'SINIRSIZ' : String(b.value),
        b.x + b.w / 2, b.y + b.h / 2 - 7,
        { align: 'center', size: 11, bold: true,
          color: usable ? (on ? '#e8d9a0' : '#8d8272') : '#4a4239' });
    }

    /* ---- onay kuyruğu ---- */
    const pend = this.S.autoGear.pendingSales().slice(0, PENDING_PAGE_SIZE);
    g.rect(PENDING_BOX.x, PENDING_BOX.y, PENDING_BOX.w, PENDING_BOX.h, '#0b0908', 0.95);
    g.text(`ONAY BEKLEYEN  (${this.S.autoGear.pendingSales().length})`,
      PENDING_BOX.x + 12, PENDING_BOX.y + 10, { size: 11, bold: true, color: '#8d8272' });
    if (pend.length === 0) {
      g.text('Oto giy sonrası çıkan eşyalar burada onay bekler.',
        PENDING_BOX.x + PENDING_BOX.w / 2, PENDING_BOX.y + 60,
        { align: 'center', size: 11, color: '#6f655a' });
    }
    pendingRows(pend.length).forEach((r, i) => {
      const inst = pend[i]!;
      const def = definitionOf(inst.itemRef);
      const price = this.S.autoGear.sellPrice(inst);
      g.rect(r.row.x, r.row.y, r.row.w, r.row.h, '#141009', 0.95);
      g.rect(r.row.x, r.row.y, 3, r.row.h,
        def ? ITEM_CLASS_COLOR[def.itemClass] : '#3a3128');
      const name = def
        ? (inst.upgradeLevel > 0 ? `${def.displayName} +${inst.upgradeLevel}` : def.displayName)
        : `#${inst.itemRef}`;
      g.text(name, r.row.x + 14, r.row.y + 10,
        { size: 12, bold: true, color: def ? ITEM_CLASS_COLOR[def.itemClass] : '#8d8272' });
      g.text(`${price} altın`, r.row.x + 14, r.row.y + 30, { size: 10, color: '#8d8272' });
      for (const [b, label, col] of [
        [r.keep, 'TUT', '#7fa85c'], [r.sell, 'SAT', '#e08a3c'],
      ] as const) {
        g.rect(b.x, b.y, b.w, b.h, '#1c1710', 0.95);
        g.rect(b.x, b.y, b.w, 2, col);
        g.text(label, b.x + b.w / 2, b.y + b.h / 2 - 7,
          { align: 'center', size: 12, bold: true, color: col });
      }
    });

    /* ---- toplu işlemler ---- */
    for (const b of bulkButtons()) {
      g.rect(b.x, b.y, b.w, b.h, '#1c1710', 0.95);
      g.rect(b.x, b.y, b.w, 2, '#4a3f30');
      g.text(b.label, b.x + b.w / 2, b.y + b.h / 2 - 7,
        { align: 'center', size: 11, bold: true, color: '#cfc7b6' });
    }
    if (this.sellMsg) {
      g.text(this.sellMsg, SELL_PANEL.x + 20, SELL_PANEL.y + SELL_PANEL.h - 84,
        { size: 11, color: '#e8d9a0' });
    }
  }


  /** P2.22 — ÖLÜM EKRANI. Tek düğme: ölüm anında seçenek yığmak yerine
   *  ne olduğunu söyle ve tek bir onayla devam et. */
  private renderDeath(g: DrawApi): void {
    const B = DEATH_BOX;
    g.rect(0, 0, PROTO.screenW, PROTO.screenH, '#050403', 0.82);
    g.rect(B.x, B.y, B.w, B.h, '#150d0b', 0.97);
    g.rect(B.x, B.y, B.w, 3, '#c96a5a');
    g.text('ÖLDÜN', B.x + B.w / 2, B.y + 26,
      { align: 'center', size: 22, bold: true, color: '#e8b8b0' });
    g.text(`Sv ${this.S.player.level} · ${this.S.player.coins} altın`,
      B.x + B.w / 2, B.y + 62, { align: 'center', size: 12, color: '#8d8272' });
    if (this.deathAt) {
      const d = Math.round(Math.hypot(
        this.deathAt.x - MORADON_PLAY_SPAWN.x, this.deathAt.y - MORADON_PLAY_SPAWN.y));
      g.text(`Doğuş noktasına ${d} birim uzakta düştün.`,
        B.x + B.w / 2, B.y + 86, { align: 'center', size: 11, color: '#6f655a' });
    }
    /* P2.27 — ölüm bedeli ÖNCEDEN gösterilir: oyuncu ne kaybedeceğini
       onaylamadan önce görsün. */
    const need = this.S.player.requiredExpForCurrentLevel();
    const loss = Math.min(Math.floor(need * DEATH_EXP_PENALTY), this.S.player.exp);
    g.text(`Deneyim kaybı: -${loss}`, B.x + B.w / 2, B.y + 110,
      { align: 'center', size: 12, bold: true, color: '#c96a5a' });
    g.text('TAMAM dediğinde doğuş noktasına ışınlanırsın.',
      B.x + B.w / 2, B.y + 132, { align: 'center', size: 11, color: '#8d8272' });
    const b = deathOkButton();
    g.rect(b.x, b.y, b.w, b.h, '#2c2417');
    g.rect(b.x, b.y, b.w, 3, '#e08a3c');
    g.text(b.label, b.x + b.w / 2, b.y + b.h / 2 - 8,
      { align: 'center', size: 15, bold: true, color: '#e8d9a0' });
  }

  /** P2.24 — item ikonu. Eşleme `data/item-icons.ts` içinde; ikon yoksa
   *  kalite renginde daireye düşer (eksik ikon HATA DEĞİL). */
  /** Uzun skill adını yuva şeridine sığdırır. */
  private shortLabel(name: string): string {
    return name.length <= 12 ? name : `${name.slice(0, 11)}…`;
  }

  private drawItemIcon(
    g: DrawApi, itemRef: number, cx: number, cy: number, size: number, fallback: string,
  ): void {
    const key = itemIconKey(itemRef);
    if (key !== null && this.host.assets.has(key)) {
      g.image(key, cx, cy, { w: size, h: size, originX: 0.5, originY: 0.5, alpha: 1 });
      return;
    }
    g.circle(cx, cy, Math.max(6, size * 0.24), fallback, 0.85);
  }

  private drawItemTooltip(g: DrawApi, itemRef: number | null, coin: number): void {
    const x = 26, w = 340;
    const lines: Array<{ t: string; c: string; s?: number }> = [];
    if (itemRef === null) {
      lines.push({ t: `${coin} Altın`, c: '#e8d9a0' });
      lines.push({ t: 'Para — envanter slotu kaplamaz', c: '#8d8272', s: 10 });
    } else {
      const def = itemDefinition(itemRef);
      if (!def) {
        lines.push({ t: Content.item(itemRef)?.displayName ?? `#${itemRef}`, c: '#cfc7b6' });
        lines.push({ t: 'Kuşanılamaz', c: '#8d8272', s: 10 });
      } else {
        const st = resolveStats(def);
        lines.push({ t: `${def.displayName}  +0`, c: ITEM_CLASS_COLOR[def.itemClass] });
        lines.push({ t: `${ITEM_CLASS_LABEL[def.itemClass]} · Sv ${def.requiredLevel}`
          + ` · ${def.equipSlot}`, c: '#8d8272', s: 10 });
        if (st.attack) lines.push({ t: `Saldırı  ${st.attack}`, c: '#e8e0d0', s: 11 });
        if (st.defense) lines.push({ t: `Savunma  ${st.defense}`, c: '#e8e0d0', s: 11 });
        for (const [k, v] of Object.entries(st.elemental)) {
          if (v > 0) lines.push({ t: `${k} hasarı  +${v}`, c: '#e08a3c', s: 11 });
        }
        for (const [k, v] of ([['STR', st.str], ['DEX', st.dex], ['INT', st.int], ['STA', st.sta]] as const)) {
          if (v > 0) lines.push({ t: `${k}  +${v}`, c: '#7fa85c', s: 11 });
        }
        if (st.maxHp) lines.push({ t: `Max HP  +${st.maxHp}`, c: '#7fa85c', s: 11 });
        if (st.maxMp) lines.push({ t: `Max MP  +${st.maxMp}`, c: '#6f8fd0', s: 11 });
        for (const [k, v] of Object.entries(st.resist)) {
          if (v > 0) lines.push({ t: `${k} direnci  +${v}`, c: '#6f8fd0', s: 11 });
        }
        if (st.special.hpDrain) lines.push({ t: `HP çalma  ${st.special.hpDrain}`, c: '#a06fd0', s: 11 });
        if (st.special.mpDrain) lines.push({ t: `MP çalma  ${st.special.mpDrain}`, c: '#a06fd0', s: 11 });
      }
    }
    const h = 12 + lines.length * 15;
    const y = 962 - h - 8;
    g.rect(x, y, w, h, '#100d08', 0.92);
    g.rect(x, y, w, 2, itemRef !== null && itemDefinition(itemRef)
      ? ITEM_CLASS_COLOR[itemDefinition(itemRef)!.itemClass] : '#4a3f30');
    lines.forEach((l, i) => {
      g.text(l.t, x + 10, y + 14 + i * 15, { size: l.s ?? 13, color: l.c, bold: i === 0 });
    });
  }

  /** P1.8 §41 — KARAKTER BUILD + EKİPMAN TELEMETRİSİ.
   *  Statlar BURADA HESAPLANMAZ; `ArcherBuildResolver` authority'sinden okunur. */
  private drawBuildTelemetry(g: DrawApi): void {
    const x = 44;
    let y = 168;
    const line = (t: string, color = '#cfc7b6', size = 9): void => {
      g.text(t, x, y, { size, color }); y += 12;
    };
    const b = this.S.stats.build();

    g.text('KARAKTER BUILD', x, y, { size: 11, bold: true, color: '#e8d9a0' }); y += 16;
    line(`Sv ${this.S.player.level}   ${'taban'.padEnd(10)}${'ekipman'.padEnd(10)}toplam`, '#8d8272');
    const row = (label: string, base: number, eq: number): void => {
      line(`${label.padEnd(9)} ${String(base).padEnd(10)}${(eq >= 0 ? '+' : '') + eq}`.padEnd(30)
        + `${base + eq}`, eq !== 0 ? '#e8e0d0' : '#8d8272');
    };
    row('Attack', b.base.attack, b.equipment.attack);
    row('Defense', b.base.defense, b.equipment.defense);
    row('STR', b.base.str, b.equipment.str);
    row('DEX', b.base.dex, b.equipment.dex);
    row('INT', b.base.int, b.equipment.int);
    row('STA', b.base.sta, b.equipment.sta);
    row('Max HP', b.base.maxHp, b.equipment.maxHp);
    row('Max MP', b.base.maxMp, b.equipment.maxMp);
    const r = b.resist;
    line(`Direnç    ateş ${r.fire} · buz ${r.ice} · yıldırım ${r.lightning} · zehir ${r.poison}`,
      '#6f8fd0');
    const we = b.weaponElemental;
    line(`Silah elm ateş ${we.fire} · buz ${we.ice} · yıldırım ${we.lightning} · zehir ${we.poison}`
      + '   (DoT DEĞİL)', '#e08a3c');
    const sp = b.special;
    if (sp.hpDrain || sp.mpDrain || sp.mpDamage) {
      line(`Özel      HP çalma ${sp.hpDrain} · MP çalma ${sp.mpDrain} · MP hasarı ${sp.mpDamage}`, '#a06fd0');
    }

    y += 6;
    g.text('EKİPMAN — 12 SLOT', x, y, { size: 11, bold: true, color: '#e8d9a0' }); y += 16;
    for (const s of this.S.stats.slots()) {
      if (!s.definition) { line(`${s.label.padEnd(10)} —`, '#4a4239'); continue; }
      const d = s.definition;
      const st = resolveStats(d);
      const parts: string[] = [];
      if (st.attack) parts.push(`atk ${st.attack}`);
      if (st.defense) parts.push(`def ${st.defense}`);
      if (st.dex) parts.push(`DEX ${st.dex}`);
      if (st.sta) parts.push(`STA ${st.sta}`);
      if (st.maxHp) parts.push(`HP ${st.maxHp}`);
      if (st.maxMp) parts.push(`MP ${st.maxMp}`);
      const elm = Object.entries(st.elemental).filter(([, v]) => v > 0)
        .map(([k, v]) => `${k} ${v}`);
      if (elm.length) parts.push(elm.join('/'));
      const rst = Object.entries(st.resist).filter(([, v]) => v > 0)
        .map(([k, v]) => `r-${k} ${v}`);
      if (rst.length) parts.push(rst.join('/'));
      line(`${s.label.padEnd(10)} ${d.displayName}  +${s.upgradeLevel}`, ITEM_CLASS_COLOR[d.itemClass]);
      line(`           [${ITEM_CLASS_LABEL[d.itemClass]}] #${s.instanceId} · def ${d.definitionRef}`
        + ` · kaynak ${d.source.sourceRef} · ${parts.join(' · ')}`, '#8d8272', 8);
    }
  }

  /** P1.7 §24/§25 — DROP + YERDEKİ GANİMET TELEMETRİSİ. */
  private drawLootTelemetry(g: DrawApi): void {
    const x = 44;
    let y = 168;
    const line = (t: string, color = '#cfc7b6', size = 9): void => {
      g.text(t, x, y, { size, color }); y += 12;
    };
    const ev = this.S.drops.last;
    g.text('SON KILL — DROP', x, y, { size: 11, bold: true, color: '#e8d9a0' }); y += 16;
    if (!ev) line('(henüz kill yok)', '#6b6350');
    else {
      line(`Mob: ${ev.monsterName} · uid #${ev.mobUid} · ref ${ev.monsterRef}`
        + ` · slot ${ev.spawnSlot} · nesil ${ev.generation}`, '#e8e0d0');
      line(`Kaynak: ${ev.lootTableId}`, '#8d8272');
      /* kaynak zinciri uzun → sarılarak yazılır */
      for (const part of wrap(ev.sourceChain, 74)) line(part, '#6f8fd0', 8);
      line(`Auto Loot: ${ev.autoLoot ? 'AÇIK' : 'KAPALI'} · sahip: oyuncu`
        + ` #${this.S.drops.tuning.ownerPlayerId}`, '#8d8272');
      if (ev.records.length === 0) line('Drop: — (hiçbir yuva tetiklenmedi)', '#6b6350');
      for (const r of ev.records) {
        const color = r.delivery === 'AUTO_INVENTORY' ? '#7fa85c'
          : r.delivery === 'FULL_INVENTORY_GROUND' ? '#c96a5a' : '#e8d9a0';
        line(`  ${r.itemName} ×${r.quantity} [${r.from}] → ${r.delivery}`
          + (r.lootUid !== null ? ` (loot #${r.lootUid})` : ''), color);
      }
      line(`Coin: ${ev.coin} → ${ev.coinDelivery}`, '#e8d9a0');
      line(`EXP: ${ev.exp}`, '#6f8fd0');
    }
    const t = this.S.drops.totals;
    y += 4;
    line(`TOPLAM — kill ${t.kills} · item ${t.items} · altın ${t.coin}`
      + ` · envanter ${t.toInventory} · yer ${t.toGround} · dolu ${t.blockedFull}`, '#8d8272');

    y += 8;
    g.text(`YERDEKİ GANİMET (${this.S.worldLoot.count})`, x, y,
      { size: 11, bold: true, color: '#e8d9a0' }); y += 16;
    const list = this.S.worldLoot.items.slice(0, 12);
    if (list.length === 0) line('(yerde ganimet yok)', '#6b6350');
    for (const l of list) {
      const d = Math.round(Math.hypot(l.worldX - this.S.world.worldX, l.worldY - this.S.world.worldY));
      const def = l.kind === 'coin' ? undefined : itemDefinition(l.itemRef);
      const name = l.kind === 'coin' ? `${l.quantity} altın`
        : def?.displayName ?? Content.item(l.itemRef)?.displayName ?? `#${l.itemRef}`;
      line(`#${l.lootUid} ${name} ×${l.quantity} · sahip ${l.ownerPlayerId}`
        + ` · ${Math.round(l.worldX)},${Math.round(l.worldY)} · d${d}`
        + ` · ${l.life.toFixed(1)}/${l.lifetimeSec}s`
        + ` · kaynak mob #${l.sourceMobUid} n${l.sourceGeneration}`,
      def ? ITEM_CLASS_COLOR[def.itemClass]
        : d <= this.S.worldLoot.tuning.pickupRadius ? '#7fa85c' : '#cfc7b6');
    }
    if (this.S.worldLoot.count > list.length) {
      line(`… +${this.S.worldLoot.count - list.length} kayıt`, '#6b6350');
    }
  }

  /** ATLAS MODU aç/kapa.
   *
   *  Gerçek atlaslar manifest'te varsa ONLAR kullanılır. Yoksa runtime'da
   *  ÇİZİLEN bir DEBUG yer tutucu üretilir — amaç boru hattını (satır=yön,
   *  sütun=kare, foot anchor, klip ayrımı, sahte efektlerin kapanması) gözle
   *  doğrulayabilmektir. Yer tutucu bir sanat varlığı DEĞİLDİR ve posterden
   *  KIRPILMAMIŞTIR; canvas'a çizilir, bundle'a bayt eklemez. */
  private async toggleAtlas(): Promise<void> {
    if (this.atlasLoading) return;
    if (this.atlasOn) {
      this.atlasOn = false;
      this.S.anim.clearAtlas();
      this.say('Atlas KAPALI (fallback sayfalar)');
      return;
    }
    const missing = ARCHER_CLIPS.filter((c) => !this.host.assets.has(ARCHER_ATLAS_KEY[c]));
    if (missing.length > 0) {
      this.atlasLoading = true;
      try {
        const built = buildPlaceholderAtlas(ARCHER_ATLAS_DEFAULT);
        await Promise.all(missing.map((c) => this.host.assets.loadImage(ARCHER_ATLAS_KEY[c], built[c])));
        this.say('DEBUG yer tutucu atlas üretildi (gerçek sanat değil)');
      } catch {
        this.say('Atlas üretilemedi');
        this.atlasLoading = false;
        return;
      }
      this.atlasLoading = false;
    } else {
      this.say('Gerçek Archer atlası yüklendi');
    }
    this.S.anim.setAtlas(ARCHER_ATLAS_DEFAULT);
    this.atlasOn = true;
  }

  /** §18 — son cast'in cast → release → impact zaman çizelgesi. */
  private castTraceLines(): Array<[string, string]> {
    const c = this.lastCast;
    if (!c) return [['Son cast', '—']];
    const rel = c.releasedAt === null ? null : c.releasedAt - c.acceptedAt;
    const trav = c.releasedAt !== null && c.impactAt !== null ? c.impactAt - c.releasedAt : null;
    const total = c.impactAt === null ? null : c.impactAt - c.acceptedAt;
    return [
      ['Son cast', `${c.label} #${c.castId}`],
      ['  mesafe / ok', `${c.distance ?? '—'} / ${c.projectiles}`],
      ['  isabet (release)', c.targetHits === null ? '—' : `${c.targetHits}/${c.projectiles}`],
      ['  impact tamamlanan', `${c.impactsDone}/${c.projectiles}`],
      ['  cast→release', rel === null ? '—' : `${rel.toFixed(3)}s`],
      ['  release→impact', trav === null ? '—' : `${trav.toFixed(3)}s`],
      ['  TOPLAM gecikme', total === null ? '—' : `${total.toFixed(3)}s`],
      ['  travel mesafe', c.travelDistance === null ? '—' : `${Math.round(c.travelDistance)}`],
      ['  impact hasar', `${c.damage} (fiz ${c.physical} / elem ${c.elemental})`],
      ['  impactInvalid', c.invalid ?? '—'],
    ];
  }

  /** Sequence cursor'ının işaret ettiği skill adı (DEV telemetrisi). */
  private cursorSkillName(): string {
    const t = this.S.genie.status(this.ents());
    if (t.activeSet === null || t.cursorIndex === null) return '—';
    const ref = this.S.genie.settings.sets[t.activeSet][t.cursorIndex];
    return ref === undefined ? '—' : skillName(ref);
  }

  /** §17 — BALANCE V1 tablosu (DEV alt sayfası).
   *  Bütün sayılar `data/archer-balance.ts`ten okunur; burada HİÇBİR hasar
   *  rakamı hesaplanmaz veya hardcode edilmez. */
  private renderBalance(g: DrawApi): void {
    g.rect(0, 0, PROTO.screenW, PROTO.screenH, '#0b0908', 1);
    g.rect(0, 0, PROTO.screenW, PROTO.screenH, '#0b0908', 1);
    g.text('ARCHER BALANCE V1', PROTO.screenW / 2, 60, { align: 'center', size: 18, bold: true, color: '#e8d9a0' });
    g.text('source fact = KO · tuning = Project Legacy', PROTO.screenW / 2, 82,
      { align: 'center', size: 11, color: '#6f655a' });

    const cols: Array<[string, number]> = [
      ['skill', 16], ['Lv', 148], ['MP', 190], ['CD', 232], ['act', 276], ['rng', 320],
      ['phys', 372], ['ok', 414], ['elem', 470], ['DoT', 524], ['ht/hr', 588],
    ];
    let y = 112;
    for (const [label, x] of cols) {
      g.text(label, x, y, { size: 10, bold: true, color: '#8d8272', align: x > 160 ? 'right' : 'left' });
    }
    y += 6;
    g.rect(12, y, PROTO.screenW - 24, 1, '#3a3128');
    y += 10;

    for (const ref of ARCHER_SKILL_ORDER) {
      const r = balanceRow(ref);
      const name = skillName(ref);
      const act = this.S.adapter.actionTimeOf(ref);
      const cells: Array<[string, number, string]> = [
        [name.length > 14 ? `${name.slice(0, 13)}…` : name, 16, '#e8e0d0'],
        [r.requiredLevel === r.sourceRequiredLevel
          ? String(r.requiredLevel)
          : `${r.requiredLevel}*`, 148,
          r.requiredLevel === r.sourceRequiredLevel ? '#8d8272' : '#e08a3c'],
        [String(r.manaCost), 190, '#9fb4d8'],
        [r.individualCooldownSec > 0 ? `${r.individualCooldownSec.toFixed(1)}s` : '—', 232,
          r.individualCooldownSec > 0 ? '#e8d9a0' : '#4a4239'],
        [`${act.toFixed(2)}s`, 276, '#6f8fd0'],
        [String(r.castRange), 320, '#8d8272'],
        [r.physicalCoefficient.toFixed(2), 372, r.physicalCoefficient >= 2 ? '#e0c060' : '#cfc7b6'],
        [r.projectileCount > 1 ? `×${r.projectileCount}` : '1', 414,
          r.projectileCount > 1 ? '#e08a3c' : '#4a4239'],
        [r.element === 'fire' ? r.elementalCoefficient.toFixed(2) : '—', 470, '#e08a3c'],
        [r.element === 'poison' ? `${r.dotTotalCoefficient.toFixed(2)}` : '—', 524, '#7fa85c'],
        [`${r.sourceHitType ?? '—'}/${r.sourceHitRate ?? '—'}`, 588, '#4a4239'],
      ];
      for (const [text, x, color] of cells) {
        g.text(text, x, y + 10, { size: 10, color, align: x > 160 ? 'right' : 'left' });
      }
      y += 21;
    }

    y += 8;
    g.rect(12, y, PROTO.screenW - 24, 1, '#3a3128');
    y += 14;
    const notes = [
      'phys = magic_type2.add_damage / 100  (SOURCE)',
      '×3 / ×5 = need_arrow (SOURCE); katsayı OK BAŞINA — damage×N DEĞİL',
      'CD = recast_time / 10 (SOURCE) · act = action time (TUNING, cooldown DEĞİL)',
      'rng = 340 (TUNING; kaynak range_value 15 kayıtta da 0)',
      'elem = anlık ateş bonusu (TUNING 1:2:3) · DoT = 4 tick TOPLAMI (TUNING 1:2:3)',
      'ht/hr = ham hit_type / hit_rate — SAKLANIR, davranış üretmez',
      'Lv* = TUNING ezmesi var (kaynak seviye değişmedi): Standart 3→1 · Delici 0→3',
    ];
    for (const n of notes) { g.text(n, 16, y, { size: 9, color: '#6f655a' }); y += 13; }

    if (this.lastCast) {
      y += 8;
      const c = this.lastCast;
      const total = c.impactAt === null ? null : c.impactAt - c.acceptedAt;
      g.text(`son cast: ${c.label} · impact ${c.impactsDone}/${c.projectiles}`
        + ` · hasar ${c.damage} (fiz ${c.physical} / elem ${c.elemental})`
        + (total === null ? '' : ` · gecikme ${total.toFixed(2)}s`),
        16, y, { size: 10, color: '#e8d9a0' });
    }
    g.text('(kapatmak için DEV → BALANCE V1 tablosu)', PROTO.screenW / 2, PROTO.screenH - NAV_RESERVE - 18,
      { align: 'center', size: 10, color: '#4a4239' });
  }

  private renderGenieSettings(g: DrawApi): void {
    g.rect(0, 0, PROTO.screenW, PROTO.screenH, '#0b0908', 0.95);
    g.text('GENIE AYARLARI', PROTO.screenW / 2, 90, { align: 'center', size: 20, bold: true, color: '#e8d9a0' });
    /* P1.6.1 — ESKİ/YANLIŞ METİN DÜZELTİLDİ: P1.5'ten beri Genie'nin otomatik
       hareketi VARDIR. Ekranda "otomatik hareket YOK" yazıyordu. */
    g.text('Genie hedefe kendi yürür · joystick DAİMA öncelikli',
      PROTO.screenW / 2, 116, { align: 'center', size: 12, color: '#6f655a' });
    g.text('Attack Range = hedef edinme (seninle hareket eder) · Farm Alanı = sabit sınır',
      PROTO.screenW / 2, 134, { align: 'center', size: 10, color: '#6f8fd0' });

    for (const t of this.genieTabs()) {
      const on = (t.id === 'gs_tab_sets' && this.genieTab === 'sets')
        || (t.id === 'gs_tab_bar' && this.genieTab === 'bar')
        || (t.id === 'gs_tab_general' && this.genieTab === 'general');
      g.rect(t.x, t.y, t.w, t.h, on ? '#2c2417' : '#161310');
      g.rect(t.x, t.y, t.w, 3, on ? '#e08a3c' : '#3a3128');
      g.text(t.label, t.x + t.w / 2, t.y + t.h / 2, { align: 'center', size: 14, bold: on, color: on ? '#e8d9a0' : '#8d8272' });
    }

    if (this.genieTab === 'bar') {
      g.text('AKTİF COMBAT BARI — 5 slot', 40, 196, { size: 13, bold: true, color: '#e8d9a0' });
      const defs = this.S.skills.definitions();
      for (const b of this.genieBarButtons()) {
        if (b.id.startsWith('bar_slot_')) {
          const i = Number(b.id.slice(9));
          const on = i === this.editingBarSlot;
          const d = defs[i];
          g.rect(b.x, b.y, b.w, b.h, on ? '#2c2417' : '#161310');
          if (on) g.rect(b.x, b.y, 4, b.h, '#e08a3c');
          g.text(`${i + 1}.  ${d ? d.displayName : '(boş)'}`, b.x + 16, b.y + 14,
            { size: 13, color: d ? '#e8e0d0' : '#6f655a' });
          if (d) {
            const cd = d.cooldownSec > 0 ? `CD ${d.cooldownSec.toFixed(1)}s` : 'CD yok';
            g.text(`Sv${d.requiredLevel} · ${d.manaCost}MP · ${cd} · action ${this.S.timing.actionTime(d.sourceRef).toFixed(2)}s`,
              b.x + b.w - 12, b.y + 14, { align: 'right', size: 10, color: '#6f8fd0' });
          }
        } else if (b.id.startsWith('bar_clear_')) {
          g.rect(b.x, b.y, b.w, b.h, '#2c1a16');
          g.text(b.label, b.x + b.w / 2, b.y + b.h / 2, { align: 'center', size: 12, color: '#c96a5a' });
        } else {
          const ref = Number(b.id.slice(9));
          const inBar = defs.some((d) => d?.sourceRef === ref);
          g.rect(b.x, b.y, b.w, b.h, inBar ? '#2c2417' : '#1c1710');
          g.rect(b.x, b.y, b.w, 3, inBar ? '#e08a3c' : '#4a3f30');
          g.text(b.label, b.x + b.w / 2, b.y + b.h / 2, { align: 'center', size: 12, color: inBar ? '#e8d9a0' : '#cfc7b6' });
        }
      }
      g.text(`SKILL KİTABI — ${GENIE_SKILL_POOL.length} okçu skilli · slot seç, sonra skill seç`,
        40, 458, { size: 10, color: '#6f655a' });
    } else if (this.genieTab === 'general') {
      for (const row of this.genieGeneralRows()) {
        g.text(row.label, 40, row.y + 8, { size: 13, color: '#cfc7b6' });
        g.text(row.value, 380, row.y + 8, { align: 'right', size: 15, bold: true, color: '#e08a3c' });
        for (const b of [row.minus, row.plus]) {
          if (!b) continue;
          g.rect(b.x, b.y, b.w, b.h, '#221c14');
          g.text(b.label, b.x + b.w / 2, b.y + b.h / 2, { align: 'center', size: 20, color: '#e8e0d0' });
        }
        if (row.toggle) {
          g.rect(row.toggle.x, row.toggle.y, row.toggle.w, row.toggle.h, '#221c14');
          g.text(row.toggle.label, row.toggle.x + row.toggle.w / 2, row.toggle.y + row.toggle.h / 2,
            { align: 'center', size: 13, bold: true, color: '#e8d9a0' });
        }
      }
    } else {
      const btns = this.genieSetButtons();
      const forced = this.S.genie.settings.forcedSet;
      const live = this.S.genie.status(this.ents()).activeSet;
      for (const b of btns.filter((x) => x.id.startsWith('gs_set_'))) {
        const idx = Number(b.id.slice(7));
        const on = idx === this.editingSet;
        g.rect(b.x, b.y, b.w, b.h, on ? '#2c2417' : '#161310');
        g.rect(b.x, b.y, b.w, 3, on ? '#e08a3c' : '#3a3128');
        g.text(b.label, b.x + b.w / 2, b.y + b.h / 2 - 4,
          { align: 'center', size: 14, bold: on, color: on ? '#e8d9a0' : '#8d8272' });
        /* hangi set GERÇEKTEN kullanılıyor: kilitliyse "KİLİT", değilse canlı set */
        const tag = forced === idx ? 'KİLİT' : (forced === null && live === idx ? 'aktif' : '');
        if (tag) g.text(tag, b.x + b.w / 2, b.y + b.h - 10,
          { align: 'center', size: 10, color: forced === idx ? '#c96a5a' : '#7fa85c' });
      }
      g.text(forced === null
        ? 'Aktif Set: OTOMATİK — mesafe/elit durumuna göre set değişir (Genel Ayarlar\'dan kilitle)'
        : `Aktif Set KİLİTLİ: SET ${forced + 1} — Genie yalnız bu setin skillerini dener`,
        40, 296, { size: 10, color: forced === null ? '#6f655a' : '#c96a5a' });
      g.text(SET_LABELS[this.editingSet], 40, 272, { size: 14, bold: true, color: '#e8d9a0' });
      const mode = this.S.genie.settings.modes[this.editingSet];
      const modeBtn = btns.find((x) => x.id === 'gs_mode')!;
      g.rect(modeBtn.x, modeBtn.y, modeBtn.w, modeBtn.h, '#221c14');
      g.rect(modeBtn.x, modeBtn.y, modeBtn.w, 3, mode === 'sequence' ? '#e08a3c' : '#4a3f30');
      g.text(modeBtn.label, modeBtn.x + modeBtn.w / 2, modeBtn.y + modeBtn.h / 2,
        { align: 'center', size: 13, bold: true, color: '#e8d9a0' });
      const seq = this.S.genie.settings.sets[this.editingSet];
      const cursor = this.S.genie.cursorOf(this.editingSet);
      g.text(mode === 'sequence'
        ? `${seq.length}/${MAX_SET_SKILLS} skill — cursor'dan başlar, başarılı cast'te ilerler (tekrar GERÇEK combo adımı)`
        : `${seq.length}/${MAX_SET_SKILLS} skill — her tikte baştan taranır (tekrar eden entry'ye asla sıra gelmez)`,
        40, 610, { size: 10, color: '#6f655a' });
      seq.forEach((ref, i) => {
        const y = 316 + i * 46;
        const def = SkillRegistry.get(ref);
        const onCursor = mode === 'sequence' && seq.length > 0 && i === cursor % seq.length;
        g.rect(40, y, 440, 40, onCursor ? '#2c2417' : '#161310');
        if (onCursor) g.rect(40, y, 4, 40, '#e08a3c');
        g.text(`${i + 1}. ${skillName(ref)}`, 54, y + 14,
          { size: 13, color: onCursor ? '#e8d9a0' : '#e8e0d0' });
        g.text(def ? `Sv${def.requiredLevel} · ${def.manaCost}MP` : '—', 470, y + 14,
          { align: 'right', size: 11, color: '#6f8fd0' });
      });
      if (seq.length === 0) g.text('(boş — aşağıdan skill ekle)', 54, 328, { size: 12, color: '#6f655a' });
      for (const b of btns.filter((x) => x.id.startsWith('gs_del_'))) {
        g.rect(b.x, b.y, b.w, b.h, '#2c1a16');
        g.text(b.label, b.x + b.w / 2, b.y + b.h / 2, { align: 'center', size: 12, color: '#c96a5a' });
      }
      for (const b of btns.filter((x) => x.id.startsWith('gs_add_'))) {
        g.rect(b.x, b.y, b.w, b.h, '#1c1710');
        g.rect(b.x, b.y, b.w, 3, '#4a3f30');
        g.text(b.label, b.x + b.w / 2, b.y + b.h / 2, { align: 'center', size: 12, color: '#cfc7b6' });
      }
    }

    const cb = this.genieCloseBtn();
    g.rect(cb.x, cb.y, cb.w, cb.h, '#2c2417');
    g.rect(cb.x, cb.y, cb.w, 3, '#e08a3c');
    g.text(cb.label, cb.x + cb.w / 2, cb.y + cb.h / 2, { align: 'center', size: 16, bold: true, color: '#e8d9a0' });
  }
}
