/** GENIE V0 — KO benzeri otomatik farm (yalnız hedef/saldırı/skill/iksir).
 *
 *  KURAL: Genie hiçbir skill kuralını KENDİ hesaplamaz. Cooldown, mana, seviye,
 *  silah ve menzil kararları ana SkillSystem + WorldCombatAdapter üzerinden gelir;
 *  Genie yalnız "hangi hedef, hangi set, hangi sıradaki skill" sorusunu yanıtlar.
 *
 *  HAREKET: V0'da otomatik hareket YOKTU. P1.5'ten beri VARDIR — hareket kararı
 *  ayrı ve test edilebilir bir sistemdedir (`world/GenieMovement.ts`) ve bu
 *  dosyadan `movementIntent()` ile HER KAREDE okunur. Manuel joystick DAİMA
 *  önceliklidir ve iki vektör asla toplanmaz.
 *
 *  Renderer'dan bağımsızdır: `update()` yaptığı işi `GenieAction[]` olarak döndürür,
 *  görsel/ses tepkisini Scene verir. Bu sayede headless test edilebilir. */
import type { ConsumableSystem } from '../../../src/game/systems/ConsumableSystem.js';
import type { KoPotionSystem } from './PotionSystem.js';
import { DEFAULT_HP_POTION_REF, DEFAULT_MP_POTION_REF } from '../data/ko-potions.js';
import type { InventoryState } from '../../../src/game/systems/InventoryState.js';
import type { PlayerState } from '../../../src/game/systems/PlayerState.js';
import type { CharacterStats } from '../../../src/game/systems/CharacterStats.js';
import type { WorldCombatAdapter } from './WorldCombatAdapter.js';
import type { WorldTargetSystem } from './WorldTargetSystem.js';
import type { PlayerWorldState, WorldMob } from './types.js';
import {
  GenieMovementController, clampToBoundary, NO_MOVE,
  type GenieState, type MoveIntent,
} from './GenieMovement.js';

export type TargetPriority = 'nearest' | 'lowestHp' | 'elite';
export type SetId = 0 | 1 | 2;

/** Bir setin skill sırasını nasıl çalıştıracağı.
 *  - `priority`: her karar tikinde liste BAŞTAN taranır; her zaman listedeki en
 *    yüksek öncelikli kullanılabilir skill atılır. Aynı skill'in listede ikinci
 *    kez bulunması bu modda ANLAMSIZDIR (asla o pozisyona gelinmez).
 *  - `sequence`: set için runtime cursor tutulur; arama cursor'dan başlar ve
 *    başarılı cast sonrası cursor bir sonraki entry'ye ilerler (wrap eder).
 *    Bu modda aynı sourceRef iki farklı pozisyonda GERÇEK bir combo adımıdır. */
export type SetMode = 'priority' | 'sequence';
export const SET_MODES: SetMode[] = ['priority', 'sequence'];
export const SET_MODE_LABELS: Record<SetMode, string> = {
  priority: 'Priority', sequence: 'Sequence',
};

export interface GenieSettings {
  /** HEDEF EDİNME yarıçapı — merkezi OYUNCUDUR ve oyuncu ile birlikte hareket eder.
   *  Bu bir skill menzili DEĞİLDİR: skill'in gerçek kullanım mesafesi
   *  `CombatRangeProfile` + `SkillSystem` tarafından ayrıca kontrol edilir. */
  attackRange: number;
  /** FARM ALANI açık mı? Açıksa Genie sınır dışındaki mobu hedeflemez. */
  farmBoundaryEnabled: boolean;
  /** Farm alanı yarıçapı — merkezi BAŞLAT anındaki konumdur, oyuncuyla KAYMAZ. */
  farmBoundaryRadius: number;
  /** Farm alanı halkası ekranda çizilsin mi? */
  showFarmBoundary: boolean;
  targetPriority: TargetPriority;
  /** SEÇİLİ HP iksiri (`itemRef`). `null` = KAPALI.
   *  P1.4.1: Genie ARTIK kendi iksir seçmez — yalnız bu referansı kullanır.
   *  Seçili iksir bittiğinde BAŞKA KADEMEYE OTOMATİK GEÇMEZ. */
  hpPotionRef: number | null;
  hpThresholdPct: number;      // 0.2 / 0.3 / 0.4 / 0.5 / 0.6
  /** SEÇİLİ MP iksiri (`itemRef`). `null` = KAPALI. Otomatik kademe değiştirme YOK. */
  mpPotionRef: number | null;
  mpThresholdPct: number;      // 0.1 ... 0.5
  /** Bu mesafenin ALTINDA Set 1 (yakın burst), üstünde Set 2 (MP tasarruf). */
  autoBurstRange: number;
  /** 3 preset; her biri SIRALI skill sourceRef listesi (aynı skill tekrar edebilir). */
  sets: [number[], number[], number[]];
  /** Her setin çalıştırma modu (bkz. `SetMode`). */
  modes: [SetMode, SetMode, SetMode];
  /** AKTİF SET KİLİDİ. null = otomatik seçim (elit → Set 3, mesafe → Set 1/2).
   *  Bir set sabitlenirse Genie SADECE o setin skillerini dener — "seçtiğim
   *  skiller yerine başkalarını atıyor" sorununun (gözlem #4) çözümü. */
  forcedSet: SetId | null;
  /** Karar tiki (sn). ARCHER COMBAT V1'den önce bu, spam koruması olarak 0.25'ti;
   *  artık combat ritmini ACTION LOCK belirlediği için yalnız karar gecikmesidir.
   *  Yüksek tutulursa action time'ın üstüne gecikme biner (0.90s action → 1.07s
   *  gerçek aralık gibi), bu yüzden 0.10'a çekildi.
   *  P1.6.1: bu değer artık GERÇEK aralıktır — karar saati biriktiricidir ve
   *  kare süresine yuvarlanmaz (bkz. `GenieSystem.accumulator`). */
  decisionIntervalSec: number;
}

export const HP_THRESHOLDS = [0.2, 0.3, 0.4, 0.5, 0.6];
export const MP_THRESHOLDS = [0.1, 0.2, 0.3, 0.4, 0.5];
export const TARGET_PRIORITIES: TargetPriority[] = ['nearest', 'lowestHp', 'elite'];
export const PRIORITY_LABELS: Record<TargetPriority, string> = {
  nearest: 'En Yakın', lowestHp: 'En Düşük HP', elite: 'Elit Öncelik',
};
export const SET_LABELS = ['Set 1 — Yakın Burst', 'Set 2 — MP Tasarruf', 'Set 3 — Elit'];
/** Hedef edinme (oyuncu merkezli) yarıçap seçenekleri. */
export const ATTACK_RANGES = [250, 350, 450, 550, 650];
/** Farm alanı (sabit merkezli) yarıçap seçenekleri. */
export const FARM_BOUNDARY_RANGES = [350, 500, 650, 800, 1000];
export const BURST_RANGES = [140, 180, 240, 300, 380];

export const GENIE_DEFAULTS: GenieSettings = {
  attackRange: 450,
  /* P2.10 — FARM ÇEMBERİ VARSAYILAN OLARAK KAPALI.
     Moradon artık haritanın tamamına yayılmış 23 slot taşıyor; 650 birimlik
     bir çember oyuncuyu doğuş köşesine hapsediyordu. Sınır sistemi
     SİLİNMEDİ — DEV panelinden açılabilir ve dar bir alanda farm etmek
     isteyen için hâlâ çalışır. */
  farmBoundaryEnabled: false,
  farmBoundaryRadius: 650,
  showFarmBoundary: false,
  targetPriority: 'nearest',
  hpPotionRef: DEFAULT_HP_POTION_REF,
  hpThresholdPct: 0.4,
  mpPotionRef: DEFAULT_MP_POTION_REF,
  mpThresholdPct: 0.3,
  autoBurstRange: 240,
  sets: [[], [], []],           // PrototypeState kurulumda gerçek ID'lerle doldurur
  /* ÜÇ SET DE varsayılan olarak `sequence`: presetler gerçek rotasyonlardır,
     sırayı korumaları beklenir. `priority` modu sistemde KALIR — oyuncu ayar
     ekranından her set için ayrı ayrı seçebilir. */
  modes: ['sequence', 'sequence', 'sequence'],
  forcedSet: null,
  decisionIntervalSec: 0.10,
};

export interface GenieDeps {
  player: PlayerState;
  stats: CharacterStats;
  inventory: InventoryState;
  consumables: ConsumableSystem;
  /** P1.4.1 — SABİT miktarlı KO iksir sistemi (prototipe özel). */
  potions?: KoPotionSystem;
  /** P1.5 telemetrisi — skill'in authoritative cast menzili (400). */
  castRange?: () => number;
  /** P1.5 telemetrisi — o anki GERÇEK hareket hızı (Attack Move çarpanı dahil).
   *  Genie'nin AYRI bir hızı YOKTUR; oyuncunun hızını aynen kullanır. */
  moveSpeed?: () => number;
  adapter: WorldCombatAdapter;
  targets: WorldTargetSystem;
  /** Auto loot, Genie'nin ALT ÖZELLİĞİDİR: Genie durunca o da durur. */
}

export type GenieAction =
  | {
      kind: 'potion'; potion: 'hp' | 'mp'; label: string;
      itemRef: number; restoreAmount: number;
      before: number; after: number; actual: number; wasted: number; remaining: number;
    }
  /** Seçili iksir BİTTİ. Envanter mutasyonu YOK, başka iksir KULLANILMAZ. */
  | { kind: 'potionEmpty'; potion: 'hp' | 'mp'; label: string; itemRef: number }
  /** P1.4: cast KABUL edildi. Hasar HENÜZ uygulanmadı — impact'te uygulanacak.
   *  `damage`/`killed` alanları bu yüzden KALDIRILDI; Genie de manuel oyuncuyla
   *  aynı projectile/impact yolundan geçer (§14). */
  | { kind: 'skill'; skillRef: number; target: WorldMob; castId: number; projectileCount: number }
  | { kind: 'wait'; reason: string };

export interface GenieTelemetry {
  enabled: boolean;
  farmCenter: { x: number; y: number } | null;
  /** Hedef edinme yarıçapı (oyuncu merkezli). */
  attackRange: number;
  farmBoundaryEnabled: boolean;
  farmBoundaryRadius: number;
  burstRange: number;
  targetUid: number | null;
  targetName: string | null;
  activeSet: SetId | null;
  /** Aktif setin çalıştırma modu. */
  setMode: SetMode | null;
  /** Aktif set kilidi (null = otomatik). */
  forcedSet: SetId | null;
  /** `sequence` modunda sıradaki entry index'i (0 tabanlı), aksi halde null. */
  cursorIndex: number | null;
  /** "3/4" gibi okunur cursor konumu. */
  cursorLabel: string | null;
  distance: number | null;
  lastAction: string;
  lastMultiShot: string | null;
  /* ---- P1.5 farm loop ---- */
  movementState: GenieState;
  lastTransition: string | null;
  /** Otomatik konumlanma hedefi (380). SKILL MENZİLİ DEĞİL. */
  desiredDistance: number;
  /** Skill'in authoritative cast menzili (400). */
  castRange: number;
  /** Oyuncunun farm merkezine uzaklığı. */
  farmCenterDistance: number | null;
  /** Genie'nin bu karede kullandığı gerçek hareket hızı (world/sn). */
  autoMoveSpeed: number;
}

/** Ayarların kopyası — mutasyon paylaşılmasın. */
export function cloneSettings(s: GenieSettings): GenieSettings {
  return {
    ...s,
    sets: [[...s.sets[0]], [...s.sets[1]], [...s.sets[2]]],
    modes: [s.modes[0], s.modes[1], s.modes[2]],
  };
}

export class GenieSystem {
  settings: GenieSettings = cloneSettings(GENIE_DEFAULTS);
  enabled = false;
  farmCenter: { x: number; y: number } | null = null;

  /** KARAR SAATİ — BİRİKTİRİCİ (P1.6.1).
   *
   *  ESKİ HATA: `timer -= dt; if (timer > 0) return; timer = interval;`
   *  Sayaç tik anında TAM interval'e SIFIRLANIYORDU, yani sayacın eksiye
   *  taştığı kadar süre ÇÖPE GİDİYORDU. Böylece gerçek karar aralığı
   *  `ceil(interval / dt) * dt` oluyordu ve FPS'e göre değişiyordu:
   *  10 sn'de 1/30 → 75 tik · 1/60 → 86 tik · 1/120 → 93 tik (ideal 100).
   *  Yani 30 FPS'te oyuncu %24 daha az cast/iksir kararı alıyordu.
   *
   *  YENİ: artık süre BİRİKTİRİLİR ve tik başına yalnız `interval` düşülür;
   *  kalan artık (residue) bir sonraki kareye DEVREDER. Karar sayısı artık
   *  yalnız GEÇEN SÜREYE bağlıdır, kare sayısına değil. */
  private accumulator = 0;
  /** Tek `update()` çağrısında en fazla kaç karar tiki işlenir.
   *  SONSUZ DÖNGÜ GUARD'ı: dt intervalden çok büyük gelirse (yavaş kare,
   *  hata ayıklama duraklaması, kaba adımlı test) biriken karar borcu
   *  sınırlanır ve fazlası ATILIR — Genie "gecikmeyi telafi etmek için"
   *  bir karede onlarca cast denemez. */
  private static readonly MAX_TICKS_PER_UPDATE = 4;
  /** BAŞLAT'tan beri işlenen karar tiki sayısı (telemetri/test).
   *  FPS eşitliğinin ölçülebilir kanıtıdır: aynı süre → aynı tik sayısı. */
  private ticksTaken = 0;
  get decisionTicks(): number { return this.ticksTaken; }
  /** `sequence` modundaki setler için runtime cursor (set başına ayrı). */
  private cursors: [number, number, number] = [0, 0, 0];
  private lastAction = '—';
  private lastMultiShot: string | null = null;
  /** Release/impact telemetrisi Scene tarafından yazılır (cast anında bilinmez). */
  setLastMultiShot(text: string | null): void { this.lastMultiShot = text; }
  private activeSet: SetId | null = null;
  private lastDistance: number | null = null;
  /** P1.5 — hareket durum makinesi (ayrı, test edilebilir sistem). */
  readonly movement = new GenieMovementController();
  private lastAutoSpeed = 0;
  private lastPlayer: { x: number; y: number } | null = null;

  constructor(private deps: GenieDeps) {}

  /** BAŞLAT: o anki oyuncu konumu farm merkezi olur (harita boyunca kovalama yok). */
  start(player: PlayerWorldState): void {
    this.enabled = true;
    this.farmCenter = { x: player.worldX, y: player.worldY };
    /* Karar saati SIFIRDAN başlar: ilk karar bir tam `decisionIntervalSec`
       sonra alınır (60 FPS'te 6 kare ≈ 0.1 sn). Eski kod ilk kareyi hemen
       tiklatıyordu; bu, karar temposunu BAŞLANGIÇ KARESİNE bağlı yapıyordu.
       Artık tempo yalnız geçen süreye bağlıdır ve `update(interval)` çağrısı
       DAİMA tam bir karar tiki demektir. */
    this.accumulator = 0;
    this.ticksTaken = 0;
    /* CURSOR POLİTİKASI: BAŞLAT rotasyonu SIFIRDAN başlatır. DURDUR cursor'a
       dokunmaz (o an nerede kaldığı DEV panelinde okunabilsin diye), ama bir
       sonraki BAŞLAT yine baştan başlatır. Set değiştiğinde ilgili setin kendi
       cursor'u KORUNUR — oyuncu yaklaşıp uzaklaştıkça Set 1 combosu kaldığı
       yerden devam eder. */
    this.cursors = [0, 0, 0];
    /* P1.5 §22 — eski stale target KULLANILMAZ; arama sıfırdan başlar. */
    this.deps.targets.clear();
    this.movement.begin();
    this.lastAction = 'başlatıldı';
  }

  /** DURDUR: otomatik hedefleme/cast/iksir durur. Mevcut hedef SİLİNMEZ. */
  /** DURDUR: otomatik hedefleme/cast/iksir/HAREKET durur.
   *  P1.5 §21: hareket ANINDA 0'a düşer, Genie'nin iç durumu temizlenir.
   *  Havadaki oklar İPTAL EDİLMEZ, mana/cooldown iadesi YOKTUR.
   *  Manuel hedef sistemi zorla bozulmaz — Genie yalnız kendi sahipliğini bırakır. */
  stop(): void {
    this.enabled = false;
    this.activeSet = null;
    this.movement.reset();
    this.lastAutoSpeed = 0;
    this.lastAction = 'durduruldu';
  }

  toggle(player: PlayerWorldState): void {
    if (this.enabled) this.stop(); else this.start(player);
  }

  /** Bir setin çalıştırma modu. */
  modeOf(setId: SetId): SetMode { return this.settings.modes[setId]; }
  /** `sequence` setinin sıradaki entry index'i (test/telemetri için). */
  cursorOf(setId: SetId): number { return this.cursors[setId]; }
  /** Cursor'ları elle sıfırlar (test yardımcısı / ayar değişiminde). */
  resetCursors(): void { this.cursors = [0, 0, 0]; }

  status(mobs: WorldMob[]): GenieTelemetry {
    const t = mobs.find((m) => m.uid === this.deps.targets.selectedUid) ?? null;
    const set = this.activeSet;
    const mode = set === null ? null : this.settings.modes[set];
    const len = set === null ? 0 : this.settings.sets[set].length;
    const cursor = set === null || mode !== 'sequence' ? null : (len > 0 ? this.cursors[set] % len : 0);
    return {
      enabled: this.enabled,
      farmCenter: this.farmCenter,
      attackRange: this.settings.attackRange,
      farmBoundaryEnabled: this.settings.farmBoundaryEnabled,
      farmBoundaryRadius: this.settings.farmBoundaryRadius,
      burstRange: this.settings.autoBurstRange,
      targetUid: this.deps.targets.selectedUid,
      targetName: t?.monster.displayName ?? null,
      activeSet: this.activeSet,
      forcedSet: this.settings.forcedSet,
      setMode: mode,
      cursorIndex: cursor,
      cursorLabel: cursor === null ? null : `${cursor + 1}/${Math.max(1, len)}`,
      distance: this.lastDistance,
      lastAction: this.lastAction,
      lastMultiShot: this.lastMultiShot,
      movementState: this.movement.state,
      lastTransition: this.movement.lastTransition,
      desiredDistance: this.movement.tuning.enterCombatDistance,
      castRange: this.deps.castRange?.() ?? 0,
      farmCenterDistance: this.farmCenter && this.lastPlayer
        ? Math.hypot(this.lastPlayer.x - this.farmCenter.x, this.lastPlayer.y - this.farmCenter.y)
        : null,
      autoMoveSpeed: this.lastAutoSpeed,
    };
  }

  /* --------- İKİ AYRI MENZİL (birbirine karıştırılmaz) ---------
     A) Attack Range  : OYUNCU merkezli, oyuncuyla birlikte HAREKET EDER.
                        "Genie hangi mobları arayıp hedefleyebilir" sorusudur.
                        Skill'in gerçek cast menzili DEĞİLDİR.
     B) Farm Boundary : BAŞLAT anındaki konum merkezlidir, SABİTTİR.
                        Açıkken sınır dışındaki mob hedeflenmez; hedef sınır
                        dışına kaçarsa bırakılır. (Auto Movement geldiğinde
                        aynı sınır hard limit olarak kullanılacaktır.) */

  private alive(mob: WorldMob): boolean {
    return mob.ai !== 'dead' && mob.state !== 'dying';
  }

  /** A — hedef edinme yarıçapı: oyuncudan ölçülür. */
  inAttackRange(mob: WorldMob, player: PlayerWorldState): boolean {
    return Math.hypot(mob.worldX - player.worldX, mob.worldY - player.worldY) <= this.settings.attackRange;
  }

  /** B — farm sınırı: BAŞLAT konumundan ölçülür. Kapalıysa daima true. */
  inFarmBoundary(mob: WorldMob): boolean {
    if (!this.settings.farmBoundaryEnabled) return true;
    if (!this.farmCenter) return true;
    return Math.hypot(mob.worldX - this.farmCenter.x, mob.worldY - this.farmCenter.y)
      <= this.settings.farmBoundaryRadius;
  }

  /** Genie bu mobu hedefleyebilir mi? (canlı + A + B) */
  canTarget(mob: WorldMob, player: PlayerWorldState): boolean {
    return this.alive(mob) && this.inAttackRange(mob, player) && this.inFarmBoundary(mob);
  }

  /** Önceliğe göre hedef seçimi (yalnız hedeflenebilir havuzdan). */
  pickTarget(mobs: WorldMob[], player: PlayerWorldState): WorldMob | null {
    const pool = mobs.filter((m) => this.canTarget(m, player));
    if (pool.length === 0) return null;
    const dist = (m: WorldMob): number => Math.hypot(m.worldX - player.worldX, m.worldY - player.worldY);
    const score = (m: WorldMob): number => {
      switch (this.settings.targetPriority) {
        case 'lowestHp': return m.hp;
        case 'elite': return (m.monster.tier === 'elite' ? 0 : 1_000_000) + dist(m);
        case 'nearest':
        default: return dist(m);
      }
    };
    return pool.reduce((best, m) => (score(m) < score(best) ? m : best), pool[0]);
  }

  /** Aktif set. Kullanıcı bir set sabitlediyse O KULLANILIR (otomatik seçim devre dışı).
   *  Aksi halde: ELİT → Set 3, mesafe ≤ Auto Burst → Set 1, değilse Set 2. */
  chooseSet(target: WorldMob, player: PlayerWorldState): SetId {
    if (this.settings.forcedSet !== null) return this.settings.forcedSet;
    if (target.monster.tier === 'elite') return 2;
    const d = Math.hypot(target.worldX - player.worldX, target.worldY - player.worldY);
    return d <= this.settings.autoBurstRange ? 0 : 1;
  }

  /* ---------------- iksir ---------------- */

  /** Eşik altındaysa SEÇİLİ iksiri kullanır.
   *
   *  P1.4.1 KURALLARI
   *  · Eşik (`hpThresholdPct`/`mpThresholdPct`) YALNIZ TETİKTİR — "ne zaman iç".
   *  · Miktar YÜZDE DEĞİL: kaynak sabit `restoreAmount` (bkz. `ko-potions.ts`).
   *  · Seçili kademe bittiyse BAŞKA kademeye GEÇİLMEZ; `potionEmpty` üretilir.
   *  · Gameplay iksir cooldown'u YOK (kaynak birimi çözülmedi); yalnız geri
   *    bildirim spam'i sınırlanır. */
  tryPotions(dt = 0): Extract<GenieAction, { kind: 'potion' | 'potionEmpty' }> | null {
    this.emptyNoticeTimer = Math.max(0, this.emptyNoticeTimer - dt);
    const f = this.deps.stats.finalStats();
    const p = this.deps.player;
    const hp = this.settings.hpPotionRef;
    if (hp !== null && f.maxHp > 0 && p.hp / f.maxHp <= this.settings.hpThresholdPct) {
      const a = this.drink('hp', hp);
      if (a) return a;
    }
    const mp = this.settings.mpPotionRef;
    if (mp !== null && f.maxMp > 0 && p.mp / f.maxMp <= this.settings.mpThresholdPct) {
      const a = this.drink('mp', mp);
      if (a) return a;
    }
    return null;
  }

  /** Geri bildirim spam'ini engelleyen sayaç (GAMEPLAY cooldown'u DEĞİL). */
  private emptyNoticeTimer = 0;
  private static readonly EMPTY_NOTICE_SEC = 3;

  private drink(
    resource: 'hp' | 'mp', itemRef: number,
  ): Extract<GenieAction, { kind: 'potion' | 'potionEmpty' }> | null {
    const potions = this.deps.potions;
    if (!potions) return null;
    if (potions.stock(itemRef) <= 0) {
      if (this.emptyNoticeTimer > 0) return null;
      this.emptyNoticeTimer = GenieSystem.EMPTY_NOTICE_SEC;
      return {
        kind: 'potionEmpty', potion: resource, itemRef,
        label: resource === 'hp' ? 'HP iksiri bitti' : 'MP iksiri bitti',
      };
    }
    const res = potions.use(itemRef);
    if (!res.ok) return null;                       // dolu can / kilitli → sessiz geç
    return {
      kind: 'potion', potion: resource, itemRef,
      label: `${res.displayName} +${res.actual}`,
      restoreAmount: res.restoreAmount,
      before: res.before, after: res.after,
      actual: res.actual, wasted: res.wasted, remaining: res.remaining,
    };
  }

  /* ---------------- P1.5 HAREKET (her karede) ---------------- */

  /** HER KAREDE çağrılır — karar tikinden BAĞIMSIZDIR.
   *  `update()` 0.10 sn'lik karar tikiyle çalışır; hareket ise her frame akmalıdır.
   *
   *  Dönen `MoveIntent` bir BİRİM YÖN vektörüdür: hızı Scene, oyuncunun kendi
   *  `WorldMovementSystem`'i üzerinden uygular. Genie'ye özel hız YOKTUR. */
  movementIntent(mobs: WorldMob[], player: PlayerWorldState): MoveIntent {
    this.lastPlayer = { x: player.worldX, y: player.worldY };
    if (!this.enabled) {
      this.movement.decide({
        enabled: false, playerX: player.worldX, playerY: player.worldY,
        target: null, hasEligibleTarget: false, farmCenter: this.farmCenter,
      });
      this.lastAutoSpeed = 0;
      return NO_MOVE;
    }
    /* Hedef: yalnız GEÇERLİ olan taşınır (ölü / Attack Range dışı / Farm
       Boundary dışı hedef hareket kararına girmez — §10). */
    const selected = mobs.find((m) => m.uid === this.deps.targets.selectedUid) ?? null;
    const target = selected && this.canTarget(selected, player) ? selected : null;
    const hasEligible = target !== null || mobs.some((m) => this.canTarget(m, player));

    const d = this.movement.decide({
      enabled: true, playerX: player.worldX, playerY: player.worldY,
      target: target ? { uid: target.uid, worldX: target.worldX, worldY: target.worldY } : null,
      hasEligibleTarget: hasEligible,
      farmCenter: this.farmCenter,
    });
    this.lastAutoSpeed = d.intent.magnitude > 0 ? (this.deps.moveSpeed?.() ?? 0) : 0;
    return d.intent;
  }

  /** Genie kaynaklı hareketten SONRA çağrılır: oyuncu farm sınırını AŞAMAZ (§9).
   *  Manuel harekette çağrılmaz — oyuncu istediği yere gidebilir. */
  clampPlayer(player: PlayerWorldState): boolean {
    return clampToBoundary(
      player, this.farmCenter, this.settings.farmBoundaryRadius,
      this.settings.farmBoundaryEnabled,
    );
  }

  /** Genie'nin O ANKİ hareket durumu (telemetri/test). */
  get movementState(): GenieState { return this.movement.state; }

  /* ---------------- ana döngü ---------------- */

  /** Her karede çağrılır. Genie kapalıyken HİÇBİR otomasyon çalışmaz.
   *
   *  P1.6.1 — FPS BAĞIMSIZ KARAR SAATİ: geçen süre biriktirilir, her tam
   *  `decisionIntervalSec` için BİR karar tiki işlenir, artık devreder.
   *  30 / 60 / 120 FPS aynı sayıda cast ve iksir kararı üretir. */
  update(dt: number, mobs: WorldMob[], player: PlayerWorldState): GenieAction[] {
    if (!this.enabled) { this.activeSet = null; this.accumulator = 0; return []; }
    const interval = Math.max(1e-4, this.settings.decisionIntervalSec);
    this.accumulator += dt;
    if (this.accumulator < interval) return [];

    const out: GenieAction[] = [];
    let ticks = 0;
    while (this.accumulator >= interval && ticks < GenieSystem.MAX_TICKS_PER_UPDATE) {
      this.accumulator -= interval;
      ticks += 1;
      this.ticksTaken += 1;
      out.push(...this.decisionTick(interval, mobs, player));
    }
    /* Guard doldu ve hâlâ borç varsa: KUYRUĞA ALMA, at. */
    if (this.accumulator >= interval) this.accumulator = 0;
    return out;
  }

  /** TEK karar tiki. `update()` bunu FPS'ten bağımsız bir tempoda çağırır. */
  private decisionTick(interval: number, mobs: WorldMob[], player: PlayerWorldState): GenieAction[] {
    const actions: GenieAction[] = [];
    const potion = this.tryPotions(interval);
    if (potion) { actions.push(potion); this.lastAction = potion.label; }

    /* P1.7 — GENIE ARTIK LOOT TOPLAMAZ.
       Auto Loot bir OYUNCU TERCİHİDİR ve teslimat kararı DROP ANINDA
       `DropSystem` tarafından verilir (mesafesiz). Genie'nin yarıçap tarayan
       eski `autoPickup()` yolu KALDIRILDI: Genie loot'a yaklaşmaz, yerdeki
       lootu kovalamaz ve loot yüzünden Farm Boundary dışına çıkmaz (§20/§21). */

    /* hedef: mevcut hedef hâlâ geçerliyse KORUNUR (gereksiz hedef zıplaması yok).
       Attack Range oyuncuyla hareket ettiği için oyuncu uzaklaşınca hedef düşer;
       Farm Boundary açıksa sınır dışına kaçan hedef de bırakılır. */
    let target = mobs.find((m) => m.uid === this.deps.targets.selectedUid) ?? null;
    if (!target || !this.canTarget(target, player)) {
      target = this.pickTarget(mobs, player);
      if (target) this.deps.targets.select(target.uid);
      else {
        /* Geçersiz hedef (ölü / Attack Range dışı / Farm Boundary dışı) BIRAKILIR.
           Not: bu, DURDUR'dan farklıdır — DURDUR mevcut hedefi korur. */
        this.deps.targets.clear();
        this.activeSet = null;
        this.lastDistance = null;
        this.lastAction = 'menzilde hedef yok';
        actions.push({ kind: 'wait', reason: 'noTarget' });
        return actions;
      }
    }
    this.lastDistance = Math.hypot(target.worldX - player.worldX, target.worldY - player.worldY);

    /* P1.5 §14 / P1.6.1 — KONUMDA DEĞİLKEN SKILL DENENMEZ.
       Eskiden Genie her tikte cast deneyip `range` reddi alıyordu (spam).
       P1.5 bunu yalnız APPROACH için kapatmıştı; P1.6.1'de casus (spy) testi
       AÇIK BİR SIZINTI buldu:
         · `movementIntent()` kare BAŞINDA çalışır ve o an hedef HENÜZ
           seçilmemiştir → durum makinesi `ACQUIRE` der,
         · hemen ardından karar tiki hedefi seçer ve durum hâlâ `ACQUIRE`
           olduğu için cast kapısına TAKILMADAN geçerdi,
         · hedef 430 birim uzakta olsa bile `useSkillRef` çağrılır ve
           adaptörden `range` reddi alınırdı.
       Bu, "yaklaşmak yerine range fail üretme" davranışının kalan son
       kapısıydı. Artık KONUMDA OLMAYAN bütün durumlar kapalıdır.

       IDLE ve WAIT bilinçli olarak AÇIKTIR:
         · IDLE  = hareket sistemi hiç sürülmemiş (Genie hareketi kullanmayan
                   gömücüler ve headless birim testleri),
         · WAIT  = merkezde bekleniyor; buraya zaten GEÇERLİ bir hedef
                   olmadan gelinemez.
       Skill'in authoritative menzil kapısı (400) yine WorldCombatAdapter'dadır. */
    if (!this.movement.inCastingPosition(this.lastDistance)) {
      this.activeSet = null;
      this.lastAction = 'hedefe yaklaşıyor';
      actions.push({ kind: 'wait', reason: 'approaching' });
      return actions;
    }

    const setId = this.chooseSet(target, player);
    this.activeSet = setId;

    /* sıradaki KULLANILABİLİR skill — kurallar SkillSystem'den, Genie yalnız dener.
       cooldown/mana/level/silah/menzil hatası olan skill atlanır.

       priority : her tikte index 0'dan tara.
       sequence : cursor'dan başla, EN FAZLA BİR TAM TUR tara; başarılı cast'te
                  cursor kullanılan entry'nin BİR SONRASINA ilerler (wrap).
                  Böylece aynı sourceRef'in iki farklı pozisyonu gerçek bir
                  combo adımı olur. Hiçbiri kullanılamazsa cursor DEĞİŞMEZ. */
    /* ACTION LOCK: karakter hâlâ önceki saldırının action süresinde → hiçbir
       skill denenmez, cursor İLERLEMEZ. Bu bir cooldown değildir. */
    if (this.deps.adapter.actionBusy) {
      this.lastAction = 'action recovery';
      actions.push({ kind: 'wait', reason: 'actionLock' });
      return actions;
    }

    const seq = this.settings.sets[setId];
    const mode = this.settings.modes[setId];
    const start = seq.length > 0 && mode === 'sequence' ? this.cursors[setId] % seq.length : 0;
    for (let k = 0; k < seq.length; k++) {
      const idx = mode === 'sequence' ? (start + k) % seq.length : k;
      const ref = seq[idx];
      const res = this.deps.adapter.useSkillRef(ref, player, target, mobs);
      if (!res.ok) continue;
      if (mode === 'sequence') this.cursors[setId] = (idx + 1) % seq.length;
      this.lastAction = `skill ${ref} (cast)`;
      actions.push({
        kind: 'skill', skillRef: ref, target,
        castId: res.accepted.castId, projectileCount: res.accepted.projectileCount,
      });
      return actions;
    }

    /* ARCHER COMBAT V1: BASIC ATTACK FALLBACK YOK.
       Seçili skillerin hiçbiri kullanılamıyorsa Genie BEKLER; gizli/uydurma
       saldırı üretmez. "Standart Atış" da normal bir skilldir — sette varsa
       kullanılır, yoksa kullanılmaz. */
    this.lastAction = 'bekliyor (seçili skiller hazır değil)';
    actions.push({ kind: 'wait', reason: 'noUsableSkill' });
    return actions;
  }
}
