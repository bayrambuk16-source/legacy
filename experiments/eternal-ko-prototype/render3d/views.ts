/** RENDERER GÖRÜNÜM TİPLERİ — P2.0
 *
 *  Gameplay ile renderer arasındaki SÖZLEŞME. Bilerek DARDIR: renderer
 *  gameplay nesnelerinin tamamını değil, yalnız çizmek için gereken alanları
 *  görür. Bu yüzden renderer gameplay nesnelerini MUTASYONA UĞRATAMAZ —
 *  elinde referans yoktur, kopyalanmış salt-okunur alanlar vardır.
 *
 *  ══════════ BU DOSYA THREE İMPORT ETMEZ ══════════ */
import type { MobAiType } from '../data/mob-ai-profiles.js';
import type { MobPhase } from '../world/MobAi.js';

/* ── renderer'ın gameplay'den OKUDUĞU salt-okunur görünüm ──
   Bilerek DAR: renderer gameplay nesnelerinin tamamına değil, yalnız
   çizmek için gereken alanlara bakar. */
export interface PlayerView {
  worldX: number; worldY: number; facingAngle: number; moving: boolean; alive: boolean;
  /* ── P2.1 — gerçek Archer modeli için gereken EK ALANLAR ──
     Hepsi gameplay'den KOPYALANIR; renderer hiçbirine yazmaz. */
  /** GÖVDENİN baktığı açı: saldırıda HEDEF, aksi halde HAREKET yönü
   *  (`PlayerAnimator.angle` — P1.2.2 kuralı aynen). */
  bodyAngle: number;
  /** Normalize hareket vektörü (yön klibi seçimi için). */
  moveX: number; moveY: number;
  /** 0..1 — düşüş kenarı `14_HIT_REACT` tetikler. */
  hpRatio: number;
  /** Silah slotundaki tanım referansı; `null` → silah yok (DISARM). */
  weaponRef: number | null;
  /** Cast BAŞLANGICINDA artan tetik sayaçları (`PlayerAnimator.triggers`). */
  attackTriggers: number; skillTriggers: number;
}
/** Test/telemetri kolaylığı: yalnız ilgilenilen alanlar ezilerek bir
 *  `PlayerView` kurulur. Gameplay bunu KULLANMAZ. */
export const DEFAULT_PLAYER_VIEW: PlayerView = {
  worldX: 0, worldY: 0, facingAngle: 0, moving: false, alive: true,
  bodyAngle: 0, moveX: 0, moveY: 0, hpRatio: 1, weaponRef: null,
  attackTriggers: 0, skillTriggers: 0,
};

export interface MobView {
  uid: number; generation: number; worldX: number; worldY: number;
  aiType: MobAiType; hpRatio: number; dead: boolean;
  /* ── P2.2 — gerçek mutant modeli için gereken EK ALANLAR ──
     Hepsi `MobAi` runtime'ından KOPYALANIR; renderer hiçbirine yazmaz. */
  /** `MobAi`'nin KENDİ fazı — klip ailesi bundan seçilir. */
  phase: MobPhase;
  /** Saldırı çevriminin fazı (`MobAiRuntime.attackPhase`). */
  attackPhase: 'windup' | 'recovery';
  /** Saldırı çevrimi sayacı (sn). */
  attackTimer: number;
  /** Profilin vuruş anı (sn) — saldırı klibi seçimi + hizalama. */
  hitMomentSec: number;
  /** P2.28 — MOBUN SEVİYESİ. Renderer bunu YALNIZ MODEL SEÇİMİ için
   *  okur (zayıf → goblin, güçlü → mutant); gameplay'e yazmaz.
   *  Seviye zaten `MobAi` runtime'ında var, kopyalanır. */
  level: number;
  /** P2.9 — CESET SÜRESİ DOLDU MU? Ölen mob respawn'a kadar listede kalır
   *  (yuva sahipliği bunu gerektirir), ama görseli birkaç saniye sonra
   *  KAYBOLUR. Bu bir GÖRÜNÜM alanıdır; gameplay'de karşılığı yoktur. */
  corpseFaded: boolean;
}
/** Test/telemetri kolaylığı — gameplay bunu KULLANMAZ. */
export const DEFAULT_MOB_VIEW: Omit<MobView, 'uid' | 'generation' | 'worldX' | 'worldY'> = {
  aiType: 'NORMAL', hpRatio: 1, dead: false,
  phase: 'IDLE', attackPhase: 'recovery', attackTimer: 0, hitMomentSec: 0.45,
  /* P2.28 — varsayılan GOBLIN bandında: test/telemetri kuklaları
     zayıf mob gibi davransın, ölçek ve klip seçimi tutarlı kalsın. */
  level: 1,
  corpseFaded: false,
};

export interface ProjectileView {
  id: number; worldX: number; worldY: number; dirX: number; dirY: number;
  /* ── P2.3 — ok görselinin doğru çıkması için gereken EK ALANLAR ── */
  /** İsabet edeceği mobun uid'i; `null` → ıska (düz uçar). */
  targetUid: number | null;
  /** Katedilen mesafe (world birimi) — yaydan çıkış karışımı bununla ölçülür. */
  travelled: number;
  /** Uçacağı toplam mesafe (world birimi). */
  travelDistance: number;
}
export interface LootView {
  lootUid: number; worldX: number; worldY: number; isCoin: boolean; colorHex: string;
}
/** Test/telemetri kolaylığı — gameplay bunu KULLANMAZ. */
export const DEFAULT_PROJECTILE_VIEW: Omit<ProjectileView, 'id' | 'worldX' | 'worldY'> = {
  dirX: 1, dirY: 0, targetUid: null, travelled: 0, travelDistance: 400,
};

export interface BoundaryView {
  centerX: number; centerY: number; radius: number; enabled: boolean;
}
export interface WorldFrame {
  player: PlayerView;
  mobs: readonly MobView[];
  projectiles: readonly ProjectileView[];
  loot: readonly LootView[];
  targetUid: number | null;
  boundary: BoundaryView | null;
}

/** P2.1 — Archer modeli telemetrisi (yalnız GÖRSEL). */
export interface ArcherRenderStats {
  /** GLB yüklendi mi; `false` → primitive fallback. */
  glbActive: boolean;
  /** Mantıksal state — ATTACK ve SKILL AYRI (klip aynı olsa bile). */
  state: string;
  clip: string;
  clipCount: number;
  /** Oynatma hızı çarpanı (hedef gameplay hızı / kaynak klip hızı). */
  timeScale: number;
  /** Ölçülen görsel hız (m/sn) ve kaynak klip hızı (m/sn). */
  speedMetersPerSec: number;
  sourceSpeedMetersPerSec: number;
  /** Animasyonun DOĞAL bırakma anı ve gameplay sabiti (sn) + fark. */
  animationReleaseSec: number;
  gameplayReleaseSec: number;
  releaseDeltaSec: number;
  /** Ölüm sunumu aktif mi ve uygulanan GÖRSEL Y ötelemesi (metre). */
  deathActive: boolean;
  deathVisualYOffsetMeters: number;
  /** Ölüm klibinin model-yerel yatay kayması (metre) — gameplay'de KARŞILIĞI YOK. */
  deathModelLocalDisplacementMeters: number;
  /** Yay ↔ sol el mesafesi (metre); 17 klipte sabit kalmalı. */
  bowGripDistanceMeters: number;
  /** ArrowSpawn socketinin dünya konumu (world birimi). */
  arrowSpawn: { x: number; y: number; z: number } | null;
}

/** P2.2 — mutant mob telemetrisi (yalnız GÖRSEL). */
export interface MobRenderStats {
  /** Mutant GLB bağlı mı; `false` → P2.0 silindir fallback. */
  glbActive: boolean;
  /** Kaç mob örneği canlı (klonlanmış düğüm grafiği sayısı). */
  rigCount: number;
  clipCount: number;
  /** Faz → klip dağılımı, telemetri panelinde okunur. */
  clips: Array<{ uid: number; phase: string; clip: string; timeScale: number }>;
  /** Ölüm sunumu aktif olan mob sayısı. */
  deathActive: number;
  /** Seçilen saldırı klibi ve hizalama farkı (sn). */
  attackClip: string;
  attackAlignmentSec: number;
  /** Manifestin bildirdiği EKSİK klipler (uydurulmadı). */
  missingClips: readonly string[];
}

/** P2.4 — ok modeli telemetrisi (yalnız GÖRSEL). */
export interface ArrowRenderStats {
  /** Gerçek ok GLB'si bağlı mı; `false` → P2.3 primitive silüeti. */
  glbActive: boolean;
  vertices: number;
  triangles: number;
  /** Model uzunluğu (metre / world birimi). */
  lengthMeters: number;
  lengthWorld: number;
  /** Alfa kesimi zorunludur (uç silueti + tüyler). */
  alphaMode: string;
  doubleSided: boolean;
  /** Havadaki ok görseli sayısı. */
  liveCount: number;
}

export interface RenderStats {
  fps: number; drawCalls: number; triangles: number;
  textures: number; geometries: number; programs: number;
  activeObjectCount: number;
  mobVisualCount: number; projectileVisualCount: number; lootVisualCount: number;
  visualsCreated: number; visualsRemoved: number;
  webgl: boolean;
  /** P2.1 — `null` → gerçek model yok, primitive fallback çiziliyor. */
  archer: ArcherRenderStats | null;
  /** P2.2 — `null` → mutant GLB yok, silindir fallback çiziliyor. */
  mob: MobRenderStats | null;
  /** P2.4 — `null` → ok GLB yok, primitive silüet çiziliyor. */
  arrow: ArrowRenderStats | null;
}


/** Zemin/dünya çerçevesi (ileride arazi için). */
export interface GroundFrameView { width: number; height: number }
