/** THREE.JS DÜNYA RENDERER'I — P2.0
 *
 *  ══════════════════ TEK YÖNLÜ SÖZLEŞME (§1/§4) ══════════════════
 *
 *  Bu dosya gameplay durumunu **OKUR** ve görselleri günceller.
 *  Gameplay durumunu **ASLA DEĞİŞTİRMEZ**: HP, mob state, hedef, mana,
 *  konum, hasar — hiçbirine yazmaz. Tek istisna, oyuncunun DOKUNUŞUNU
 *  çözen `pickMobAt()` girdi adaptörüdür (§13): o da yalnız "hangi mob'a
 *  dokunuldu" sorusunu yanıtlar, hedefi Scene mevcut `WorldTargetSystem`
 *  üzerinden seçer.
 *
 *  Gameplay tarafı (`state.ts`, `world/*`, Genie, MobAi, CombatPipeline)
 *  bu dosyayı ve Three'yi HİÇ BİLMEZ. Bağımlılık yönü tek taraflıdır:
 *
 *      gameplay  ←──yalnız okunur──  render3d/ThreeWorldRenderer
 *
 *  ══════════════════ WEBGL İSTEĞE BAĞLI (§25) ══════════════════
 *  `canvas` verilmezse WebGLRenderer OLUŞTURULMAZ. Sahne grafiği, kamera,
 *  görsel yaşam döngüsü ve raycast yine KURULUR ve çalışır — bu yüzden
 *  headless testler WebGL bağlamı istemeden GERÇEK kod yollarını sınar.
 *
 *  ══════════════════ BU KATMAN NE YAPMAZ ══════════════════
 *  · Çarpışma/hasar hesaplamaz — projectile görselleri HASAR VEREMEZ (§15)
 *  · Hedef otoritesi değildir (§13)
 *  · Animasyon karıştırıcısı P2.0'da yoktur; primitive görseller (§28) */
import {
  AmbientLight, BoxGeometry, CapsuleGeometry, Color, ConeGeometry, CylinderGeometry,
  DirectionalLight, DoubleSide, GridHelper, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  InstancedMesh, Object3D, OrthographicCamera, PerspectiveCamera, PlaneGeometry, Quaternion, Raycaster,
  RepeatWrapping, Texture,
  Matrix4, RingGeometry, Scene, SphereGeometry, Vector2, Vector3, Vector4, WebGLRenderer,
  type BufferGeometry, type Camera, type Material,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { facingToYaw } from './coords.js';
import {
  FOLIAGE_BASE_SCALE, type FoliageItem, type FoliageKind,
} from '../data/moradon-foliage.js';
import type { GameplayPoint } from './coords.js';
import {
  CAMERA_V1, cameraLookAt, cameraPosition, orthoBounds, smoothTowards,
  type CameraTuning,
} from './CameraRig.js';
import {
  VisualRegistry, lootVisualKey, mobVisualKey, projectileVisualKey,
} from './VisualRegistry.js';
import { Asset3dRegistry } from './assets3d.js';
import { ArcherRig, disposeGlbAssets } from './ArcherRig.js';
import { MobRig, MutantRigFactory } from './MobRig.js';
import { attackClipFor } from './MutantAnimator.js';
import { MUTANT_MISSING_CLIPS } from '../data/mutant-model.js';
import {
  ARROW_LENGTH_WORLD, ARROW_MODEL, ARROW_MODEL_SCALE,
} from '../data/arrow-model.js';
import { releaseTimingDelta } from './ArcherAnimator.js';
import type { LoadedGlb } from './GlbLoader.js';
import {
  ARCHER_NATURAL_RELEASE_SEC, WORLD_UNITS_PER_METER, archerClip,
} from '../data/archer-model.js';
import type { MobAiType } from '../data/mob-ai-profiles.js';
import {
  TERRAIN_MESH_ACTIVE, buildTerrainGeometry, groundElevationAt,
} from './terrain.js';

import type {
  ArcherRenderStats, ArrowRenderStats, BoundaryView, GroundFrameView, MobRenderStats, MobView,
  PlayerView, ProjectileView, RenderStats, WorldFrame,
} from './views.js';
export type {
  ArcherRenderStats, ArrowRenderStats, BoundaryView, GroundFrameView, MobRenderStats, MobView,
  PlayerView, ProjectileView, RenderStats, WorldFrame,
};

/** Gölge kamerasının oyuncu çevresinde kapsadığı yarı-genişlik. */
const SHADOW_SPAN = 700;
/** Güneşin oyuncuya göre yerel ofseti (gölge yönü sabit kalsın). */
const SUN_OFFSET = { x: 500, y: 1000, z: 350 };

/* ── P2.1 / P2.3 ── */
/** Okun GÖRSEL çıkış noktası ArrowSpawn socketinden otoritenin konumuna
 *  bu MESAFE boyunca karışır (world birimi ≈ 1,5 m).
 *  P2.3: zaman yerine KATEDİLEN MESAFE kullanılır — kare hızından bağımsız
 *  ve fiziksel olarak anlamlı. YALNIZ GÖRSEL: otorite konumu DEĞİŞMEZ. */
const ARROW_SPAWN_BLEND_WORLD = 45;
/** Ok görselinin varsayılan yüksekliği (world birimi, model/hedef yokken). */
const ARROW_DEFAULT_Y = 26;
/** Ölçülen görsel hız için üst sınır (m/sn) — respawn/ışınlanma sıçraması
 *  animasyonu absürt hızlandırmasın. */
const MAX_MEASURED_SPEED_MPS = 12;

/** OK GEOMETRİSİ — gövde + uç + yelek, TEK parça (1 draw call).
 *
 *  P2.3: eskiden tek bir `ConeGeometry` idi ve ok yerine "havuç" gibi
 *  görünüyordu. Parçalar birleştirilerek (`mergeGeometries`) tek tampona
 *  indirildi, böylece silüet düzeldi ama çizim maliyeti AYNI kaldı.
 *
 *  Eksen YEREL +Z'dir: renderer yalnız yaw uygular, ek bir Euler numarası
 *  gerekmez (eski kodun 90° hatası tam oradan geliyordu).
 *
 *  Ölçüler world biriminde (1 m ≈ 28,87 birim): toplam ~26 birim ≈ 0,9 m. */
function arrowGeometry(): BufferGeometry {
  /* gövde: ince silindir, +Z boyunca */
  const shaft = new CylinderGeometry(0.85, 0.85, 22, 6);
  shaft.rotateX(Math.PI / 2);
  /* uç: koni, gövdenin önünde */
  const tip = new ConeGeometry(2.2, 6, 6);
  tip.rotateX(Math.PI / 2);
  tip.translate(0, 0, 14);
  /* yelek: arkada iki ince kanat (dönüşü okunur kılar) */
  const finA = new BoxGeometry(0.4, 4.4, 6);
  finA.translate(0, 0, -8);
  const finB = new BoxGeometry(4.4, 0.4, 6);
  finB.translate(0, 0, -8);
  const merged = mergeGeometries([shaft, tip, finA, finB], false);
  for (const g of [shaft, tip, finA, finB]) g.dispose();
  if (!merged) throw new Error('[P2.3] ok geometrisi birleştirilemedi');
  return merged;
}

const MOB_STYLE: Readonly<Record<MobAiType, { radius: number; height: number; color: number }>> = {
  NORMAL: { radius: 16, height: 42, color: 0x9a8f7a },
  AGGRESSIVE: { radius: 19, height: 52, color: 0xc06a58 },
  ELITE: { radius: 26, height: 72, color: 0xd9a04a },
};

/** Dünya noktasını NDC'ye yansıtır (kamera matris zinciri).
 *  three'nin `Vector3.project()` yardımcısına eşdeğerdir; burada elle
 *  yazılmasının sebebi yerel tip bildiriminin dar tutulmasıdır. */
function worldToNdc(
  v: Vector3, cam: PerspectiveCamera | OrthographicCamera,
): { x: number; y: number } | null {
  cam.updateMatrixWorld(true);
  const view = new Matrix4().copy(cam.matrixWorld).invert();
  const clip = new Vector4(v.x, v.y, v.z, 1).applyMatrix4(view).applyMatrix4(cam.projectionMatrix);
  if (clip.w === 0) return null;
  if (clip.w < 0) return null;                   // kameranın ARKASINDA
  return { x: clip.x / clip.w, y: clip.y / clip.w };
}

export class ThreeWorldRenderer {
  readonly scene = new Scene();
  readonly assets = new Asset3dRegistry();
  tuning: CameraTuning = { ...CAMERA_V1 };
  /** DEV: boundary debug halkası (gameplay etkisi YOK, §20). */
  showBoundary = true;

  private perspective: PerspectiveCamera;
  private ortho: OrthographicCamera;
  private renderer: WebGLRenderer | null = null;
  private raycaster = new Raycaster();
  private pointer = new Vector2();
  private tmp = new Vector3();

  private sun: DirectionalLight;
  private grid: GridHelper;
  private playerRoot = new Group();
  private targetRing: Mesh;
  private boundaryRing: Mesh;
  private ground: Mesh;

  private mobs: VisualRegistry<Group>;
  private projectiles: VisualRegistry<Mesh>;
  private lootVisuals: VisualRegistry<Mesh>;
  /** Raycast hedefi olan mob gövdeleri: mesh → mob uid (§13). */
  private mobPickTargets = new Map<Object3D, number>();

  /** PAYLAŞILAN varlıklar — örnek başına DEĞİL. §24: sahibi renderer'dır ve
   *  yalnız `dispose()` içinde serbest bırakılır; görsel silinirken DOKUNULMAZ. */
  private sharedGeometries: BufferGeometry[] = [];
  private sharedMaterials: Material[] = [];
  private mobGeo = new Map<MobAiType, BufferGeometry>();
  private mobMat = new Map<MobAiType, Material>();
  /** GERÇEK model kullanılırken raycast gövdesinin (görünmez) materyali. */
  private mobPickMat: Material;
  private projGeo: BufferGeometry;
  private projMat: Material;
  private lootGeo: BufferGeometry;
  private coinGeo: BufferGeometry;
  private lootMats = new Map<string, Material>();

  private camPos = { x: 0, y: 0, z: 0 };
  private camReady = false;
  private fpsAvg = 60;
  private width: number;
  private height: number;

  /* ───────── P2.1 — gerçek Archer modeli ───────── */
  /** GLB bağlanana kadar `null` → primitive fallback çizilir. */
  private archer: ArcherRig | null = null;
  /** Yüklenmiş GLB — DEV panelinden model açılıp kapatılabilsin diye tutulur. */
  private loadedGlb: LoadedGlb | null = null;
  /** GLB gelince gizlenen P2.0 primitive parçaları (silinmez: geri alınabilir). */
  private playerPrimitives: Object3D[] = [];
  /** Görsel hız ölçümü için önceki kare konumu. */
  private prevPlayer: { x: number; y: number } | null = null;
  private measuredSpeedMps = 0;
  private archerClipName = '01_IDLE';
  private archerState = 'IDLE';
  private archerTimeScale = 1;
  private archerDeathActive = false;
  private archerDeathOffsetM = 0;
  /** Ok görsellerinin ArrowSpawn'dan çıkış karışımı (yalnız GÖRSEL). */
  private arrowOrigins = new Map<string, { x: number; y: number; z: number }>();
  /** Gameplay `releaseDelay` sabitinin KOPYASI — telemetri içindir.
   *  Renderer bu değeri KULLANMAZ ve DEĞİŞTİRMEZ; sahne atar. */
  gameplayReleaseSec = 0.20;

  /* ───────── P2.2 — gerçek mutant mob modeli ───────── */
  /** Mutant GLB fabrikası; `null` → P2.0 silindir fallback. */
  private mutantFactory: MutantRigFactory | null = null;
  private mutantGlb: LoadedGlb | null = null;
  /** Görsel anahtarı (`uid:generation`) → mob örneği. */
  private mobRigs = new Map<string, MobRig>();
  /** Kapsayıcı Group → örnek (silme geri çağrısı için). */
  private rigByGroup = new Map<Group, MobRig>();
  /** Görsel hız + bakış ölçümü (her mob için önceki kare). */
  private mobMotion = new Map<string, { x: number; y: number; speed: number; yaw: number }>();
  /** Telemetri: bu karede hangi mob hangi klibi çalıyor. */
  private mobClipRows: Array<{ uid: number; phase: string; clip: string; timeScale: number }> = [];
  private mobDeathActive = 0;

  /* ───────── P2.4 — gerçek ok modeli ───────── */
  /** GLB'den gelen ok geometrisi/materyali; `null` → P2.3 primitive silüeti. */
  private arrowGlb: LoadedGlb | null = null;
  private arrowOwned: { geo: BufferGeometry; mat: Material } | null = null;
  /** Primitive yedek — model kaldırılırsa anında geri gelir. */
  private arrowFallbackGeo: BufferGeometry;
  private arrowFallbackMat: Material;

  constructor(canvas?: HTMLCanvasElement, width = 620, height = 1100) {
    this.width = width; this.height = height;
    this.scene.background = new Color(0x1d2417);

    /* ---- kameralar (§8/§9) ---- */
    this.perspective = new PerspectiveCamera(this.tuning.fov, width / height, 1, 8000);
    const b = orthoBounds(this.tuning, width / height);
    this.ortho = new OrthographicCamera(b.left, b.right, b.top, b.bottom, 1, 8000);

    /* ---- ışık (§11): mobil dostu; PBR / post-processing YOK ---- */
    const ambient = new AmbientLight(0xb9c6d0, 1.15);
    this.sun = new DirectionalLight(0xfff2d8, 1.45);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    /* Gölge kamerası OYUNCUYU TAKİP EDER (aşağıda `updateSun`).
       Sabit kalsaydı dünya (1240, 1650) civarında olduğu için zemin gölge
       haritasının DIŞINDA kalır ve tamamen karanlık görünürdü. */
    this.sun.shadow.camera.left = -SHADOW_SPAN; this.sun.shadow.camera.right = SHADOW_SPAN;
    this.sun.shadow.camera.top = SHADOW_SPAN; this.sun.shadow.camera.bottom = -SHADOW_SPAN;
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 3000;
    this.sun.shadow.normalBias = 0.8;
    this.scene.add(ambient, this.sun, this.sun.target);

    /* ---- zemin ----
       P2.4C: Moradon aktifken zemin GERÇEK ARAZİDİR ve `heightAt()` ile AYNI
       tablodan üretilir (bkz. `render3d/terrain.ts`) — görsel zemin ile
       örnekleyici birbirinden SAPAMAZ. Test dünyasında eski düz plane kalır.
       Her iki durumda da navmesh/physics YOKTUR: yürünebilirlik authority'si
       gameplay tarafındaki hücre maskesidir. */
    const groundGeo = this.keepGeo(
      TERRAIN_MESH_ACTIVE ? buildTerrainGeometry() : new PlaneGeometry(8000, 8000),
    );
    /* P2.11 — zemin dokusu. Doku YOKSA eski düz renk devrede kalır:
       varlık yüklenemezse oyun yine çalışır. `repeat` arazi boyutundan
       türer, elle sayı yazılmaz. */
    const groundMat = this.keepMat(new MeshLambertMaterial({ color: 0x38472b }));
    this.groundMat = groundMat;
    this.ground = new Mesh(groundGeo, groundMat);
    /* Arazi geometrisi ZATEN dünya düzlemindedir (X/Z); düz plane XY'de üretilir
       ve yatırılması gerekir. */
    if (!TERRAIN_MESH_ACTIVE) this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.name = 'ground';
    this.scene.add(this.ground);

    /* ---- ızgara: hareketin okunabilir olması için tek LineSegments.
       Gameplay etkisi YOKTUR; yalnız mekânsal referans verir. ---- */
    this.grid = new GridHelper(8000, 80, 0x4a5a3a, 0x3f4d31);
    this.grid.position.y = 0.5;
    this.grid.name = 'grid';
    this.scene.add(this.grid);
    this.sharedGeometries.push(this.grid.geometry);
    this.sharedMaterials.push(this.grid.material);

    /* ---- oyuncu placeholder (§6): gövde + BURUN (dönüş görünür olsun) ---- */
    const bodyGeo = this.keepGeo(new CapsuleGeometry(13, 26, 4, 10));
    const bodyMat = this.keepMat(new MeshLambertMaterial({ color: 0xd8c49a }));
    const body = new Mesh(bodyGeo, bodyMat);
    body.position.y = 26;
    body.castShadow = true;
    const noseGeo = this.keepGeo(new ConeGeometry(6, 18, 8));
    const noseMat = this.keepMat(new MeshLambertMaterial({ color: 0xe08a3c }));
    const nose = new Mesh(noseGeo, noseMat);
    /* Yerel ileri yön +Z (bkz. coords.facingToYaw). */
    nose.position.set(0, 30, 16);
    nose.rotation.x = Math.PI / 2;
    nose.castShadow = true;
    this.playerRoot.add(body, nose);
    this.playerRoot.name = 'player';
    this.playerPrimitives = [body, nose];
    this.scene.add(this.playerRoot);

    /* ---- hedef halkası (§14): yalnız GÖRSEL ---- */
    const ringGeo = this.keepGeo(new RingGeometry(24, 32, 32));
    const ringMat = this.keepMat(new MeshBasicMaterial({
      color: 0xe08a3c, transparent: true, opacity: 0.9, side: DoubleSide, depthWrite: false,
    }));
    this.targetRing = new Mesh(ringGeo, ringMat);
    this.targetRing.rotation.x = -Math.PI / 2;
    this.targetRing.position.y = 1.2;
    this.targetRing.visible = false;
    this.targetRing.name = 'targetRing';
    this.scene.add(this.targetRing);

    /* ---- farm boundary DEBUG halkası (§20) ---- */
    const bGeo = this.keepGeo(new RingGeometry(0.985, 1, 128));
    const bMat = this.keepMat(new MeshBasicMaterial({
      color: 0x6f8fd0, transparent: true, opacity: 0.55, side: DoubleSide, depthWrite: false,
    }));
    this.boundaryRing = new Mesh(bGeo, bMat);
    this.boundaryRing.rotation.x = -Math.PI / 2;
    this.boundaryRing.position.y = 1;
    this.boundaryRing.visible = false;
    this.boundaryRing.name = 'boundaryRing';
    this.scene.add(this.boundaryRing);

    /* ---- paylaşılan mob varlıkları (§7: tip başına basit boyut/renk farkı) ---- */
    for (const type of ['NORMAL', 'AGGRESSIVE', 'ELITE'] as const) {
      const s = MOB_STYLE[type];
      this.mobGeo.set(type, this.keepGeo(new CylinderGeometry(s.radius, s.radius * 1.15, s.height, 10)));
      this.mobMat.set(type, this.keepMat(new MeshLambertMaterial({ color: s.color })));
    }
    this.mobPickMat = this.keepMat(new MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
    }));
    this.arrowFallbackGeo = this.keepGeo(arrowGeometry());
    this.arrowFallbackMat = this.keepMat(new MeshBasicMaterial({ color: 0xf0d890 }));
    this.projGeo = this.arrowFallbackGeo;
    this.projMat = this.arrowFallbackMat;
    this.lootGeo = this.keepGeo(new BoxGeometry(15, 15, 15));
    this.coinGeo = this.keepGeo(new SphereGeometry(8, 10, 8));

    /* ---- görsel yaşam döngüsü kayıtçıları (§24) ---- */
    this.mobs = new VisualRegistry<Group>(
      () => { const g = new Group(); this.scene.add(g); return g; },
      (g) => this.disposeMobVisual(g),
    );
    this.projectiles = new VisualRegistry<Mesh>(
      () => { const m = new Mesh(this.projGeo, this.projMat); m.name = 'projectile'; this.scene.add(m); return m; },
      (m) => { m.parent?.remove(m); },
    );
    this.lootVisuals = new VisualRegistry<Mesh>(
      () => { const m = new Mesh(this.lootGeo, this.lootMaterial('#e8d9a0')); m.name = 'loot'; this.scene.add(m); return m; },
      (m) => { m.parent?.remove(m); },
    );

    /* ---- WebGL YALNIZ canvas verilirse (§25) ---- */
    if (canvas) {
      this.renderer = new WebGLRenderer({
        canvas, antialias: true, alpha: false, powerPreference: 'high-performance',
      });
      this.renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio ?? 1));   // §22
      this.renderer.setSize(width, height, false);
      this.renderer.shadowMap.enabled = true;
    }
  }

  /* ───────────────────── P2.1 — gerçek Archer modeli ───────────────────── */

  /** Yüklenmiş GLB'yi oyuncu görseline bağlar.
   *
   *  Primitive parçalar SİLİNMEZ, yalnız gizlenir: model yüklenemezse ya da
   *  DEV panelinden kapatılırsa P2.0 fallback'i anında geri gelir. */
  attachArcher(glb: LoadedGlb): ArcherRig {
    this.detachArcher();
    this.loadedGlb = glb;
    const rig = new ArcherRig(glb);
    this.playerRoot.add(rig.root);
    for (const o of this.playerPrimitives) o.visible = false;
    this.archer = rig;
    this.assets.markReady('player');
    return rig;
  }

  /** Modeli kaldırır ve primitive fallback'e döner. */
  detachArcher(): void {
    this.archer?.dispose();
    this.archer = null;
    for (const o of this.playerPrimitives) o.visible = true;
  }

  /** Yüklenmiş mutant GLB'sini mob görseline bağlar.
   *  Silindir fallback SİLİNMEZ; model kaldırılırsa anında geri gelir. */
  attachMutant(glb: LoadedGlb): MutantRigFactory {
    this.detachMutant();
    this.mutantGlb = glb;
    this.mutantFactory = new MutantRigFactory(glb);
    for (const kind of ['mob_normal', 'mob_aggressive', 'mob_elite'] as const) {
      this.assets.markReady(kind);
    }
    /* Var olan görseller yeniden kurulsun (bir sonraki karede doldurulur). */
    this.rebuildMobVisuals();
    return this.mutantFactory;
  }

  /** Modeli kaldırır ve silindir fallback'e döner. */
  detachMutant(): void {
    for (const rig of this.mobRigs.values()) rig.dispose();
    this.mobRigs.clear();
    this.rigByGroup.clear();
    this.mutantFactory = null;
    this.rebuildMobVisuals();
  }

  get usingMutantGlb(): boolean { return this.mutantFactory !== null; }
  get mutantGlbAvailable(): boolean { return this.mutantGlb !== null; }

  /** DEV — gerçek mob modeli ile P2.0 silindir fallback'i arasında geçiş. */
  toggleMutant(on: boolean): boolean {
    if (on && this.mutantGlb) { this.attachMutant(this.mutantGlb); return true; }
    if (!on) { const g = this.mutantGlb; this.detachMutant(); this.mutantGlb = g; return false; }
    return this.mutantFactory !== null;
  }

  /** Tüm mob görsellerini boşaltır; bir sonraki karede yeniden doldurulur. */
  private rebuildMobVisuals(): void {
    for (const key of this.mobs.keys()) {
      const g = this.mobs.get(key);
      if (!g) continue;
      for (const child of [...g.children]) this.mobPickTargets.delete(child);
      g.clear();
    }
  }

  /** Yüklenmiş ok GLB'sini projectile görseline bağlar.
   *
   *  ══ ORİJİN UCA TAŞINIR ══
   *  Varlığın orijini NOCK'tadır (arka uç); gameplay'in otoritatif konumu ise
   *  okun VURDUĞU noktadır. Geometri bir kez klonlanıp world birimine
   *  ölçeklenir ve `-uzunluk` kadar ötelenir → orijin UÇ olur, gövde arkada
   *  kalır. Manifestin kendi entegrasyon notu da bunu söylüyor.
   *
   *  ══ TEK MESH, TEK DRAW CALL ══
   *  GLB'nin düğüm grafiği KOPYALANMAZ: yalnız geometri + materyal alınır ve
   *  mevcut PAYLAŞILAN projectile yoluna takılır. Böylece ok başına sahne
   *  nesnesi 1 kalır (P2.3'teki gibi) ve marker düğümleri sahneye sızmaz. */
  attachArrow(glb: LoadedGlb): boolean {
    let mesh: Mesh | null = null;
    glb.scene.traverse((o) => {
      const m = o as Mesh & { isMesh?: boolean };
      if (m.isMesh === true && mesh === null) mesh = o as Mesh;
    });
    if (mesh === null) return false;
    const src = mesh as Mesh;
    this.detachArrow();
    this.arrowGlb = glb;
    const geo = src.geometry.clone();
    geo.scale(ARROW_MODEL_SCALE, ARROW_MODEL_SCALE, ARROW_MODEL_SCALE);
    geo.translate(0, 0, -ARROW_LENGTH_WORLD);      // orijin: nock → UÇ
    const mat = src.material;
    this.arrowOwned = { geo, mat };
    this.projGeo = geo;
    this.projMat = mat;
    this.rebuildProjectileVisuals();
    return true;
  }

  /** Modeli kaldırır ve P2.3 primitive silüetine döner. */
  detachArrow(): void {
    if (this.arrowOwned) {
      this.arrowOwned.geo.dispose();
      this.arrowOwned = null;
    }
    this.projGeo = this.arrowFallbackGeo;
    this.projMat = this.arrowFallbackMat;
    this.rebuildProjectileVisuals();
  }

  get usingArrowGlb(): boolean { return this.arrowOwned !== null; }

  /* ═══════════════ P2.11 — BİTKİ ÖRTÜSÜ ═══════════════
     Konumlar `data/moradon-foliage.ts` (saf, tohumlu) katmanından gelir.
     Burada YALNIZ çizim var: model yüklenir, InstancedMesh'e dizilir.

     NEDEN InstancedMesh: 860 nesne var ama 7 farklı model. Her nesne için
     ayrı Mesh yaratmak 860 draw call demek — mobil bunu kaldırmaz.
     Instancing ile tür başına TEK draw call (7 toplam).

     GAMEPLAY ETKİSİ YOK: bitkiler collision'a girmez, WorldFrame'e
     yazılmaz, hiçbir gameplay sistemi bunları görmez. */
  private foliage = new Map<FoliageKind, InstancedMesh>();
  private foliageOwned: BufferGeometry[] = [];

  /** Bir bitki türünün modelini yükler ve örneklerini yerleştirir. */
  attachFoliage(kind: FoliageKind, glb: LoadedGlb, items: FoliageItem[]): boolean {
    if (items.length === 0) return false;
    /* Modelin bütün mesh'lerini tek geometriye topla — kaynak modeller
       çok parçalı olabiliyor (gövde + yaprak ayrı materyal). İlk mesh'i
       alıyoruz; çok materyalli modellerde ikincil parçalar düşer, bu
       bilinçli bir sadeleştirmedir. */
    let src: Mesh | null = null;
    glb.scene.traverse((o) => {
      const m = o as Mesh & { isMesh?: boolean };
      if (m.isMesh === true && src === null) src = o as Mesh;
    });
    if (src === null) return false;
    const mesh = src as Mesh;
    this.detachFoliage(kind);

    const geo = mesh.geometry.clone();
    this.foliageOwned.push(geo);
    const inst = new InstancedMesh(geo, mesh.material, items.length);
    inst.frustumCulled = true;
    const m4 = new Matrix4();
    const q = new Quaternion();
    const pos = new Vector3();
    const scl = new Vector3();
    items.forEach((it, i) => {
      const base = FOLIAGE_BASE_SCALE[it.kind] * it.scale;
      pos.set(it.x, groundElevationAt(it.x, it.y), it.y);
      q.setFromAxisAngle(new Vector3(0, 1, 0), it.rotation);
      scl.set(base, base, base);
      m4.compose(pos, q, scl);
      inst.setMatrixAt(i, m4);
    });
    inst.instanceMatrix.needsUpdate = true;
    this.scene.add(inst);
    this.foliage.set(kind, inst);
    return true;
  }

  detachFoliage(kind: FoliageKind): void {
    const inst = this.foliage.get(kind);
    if (!inst) return;
    this.scene.remove(inst);
    inst.dispose();
    this.foliage.delete(kind);
  }

  /** Yüklenmiş bitki türü sayısı (telemetri). */
  get foliageKinds(): number { return this.foliage.size; }

  /** P2.11 — zemin dokusunu uygular. Doku tileable olduğu için `repeat`
   *  ile döşenir; tek karo 320 dünya birimi (≈ oyuncunun iki adımı).
   *  Renk çarpanı beyaza çekilir, yoksa doku yeşil filtreden geçer. */
  private groundMat: MeshLambertMaterial | null = null;

  applyGroundTexture(image: TexImageSource, worldSize = 2560, tile = 320): boolean {
    if (!this.groundMat) return false;
    const tex = new Texture(image as unknown as HTMLImageElement);
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.repeat.set(worldSize / tile, worldSize / tile);
    tex.needsUpdate = true;
    this.groundMat.map = tex;
    this.groundMat.color.set(0x9aa88a);   // dokuyu hafif yeşile boya
    this.groundMat.needsUpdate = true;
    return true;
  }
  get arrowGlbAvailable(): boolean { return this.arrowGlb !== null; }

  /** DEV — gerçek ok modeli ↔ primitive silüet. */
  toggleArrow(on: boolean): boolean {
    if (on && this.arrowGlb) return this.attachArrow(this.arrowGlb);
    if (!on) { const g = this.arrowGlb; this.detachArrow(); this.arrowGlb = g; return false; }
    return this.arrowOwned !== null;
  }

  /** Havadaki okların görselini yeni geometri/materyale geçirir. */
  private rebuildProjectileVisuals(): void {
    for (const key of this.projectiles.keys()) {
      const m = this.projectiles.get(key);
      if (!m) continue;
      m.geometry = this.projGeo;
      m.material = this.projMat;
    }
  }

  get archerRig(): ArcherRig | null { return this.archer; }
  get usingArcherGlb(): boolean { return this.archer !== null; }
  get archerGlbAvailable(): boolean { return this.loadedGlb !== null; }

  /** DEV — gerçek model ile P2.0 primitive fallback'i arasında geçiş.
   *  Gameplay HER İKİ durumda da AYNIDIR (§26 parity). */
  toggleArcher(on: boolean): boolean {
    if (on && this.loadedGlb) { this.attachArcher(this.loadedGlb); return true; }
    if (!on) { const g = this.loadedGlb; this.detachArcher(); this.loadedGlb = g; return false; }
    return this.archer !== null;
  }

  /* ───────────────────── paylaşılan varlık sahipliği (§24) ───────────────────── */
  private keepGeo<T extends BufferGeometry>(g: T): T { this.sharedGeometries.push(g); return g; }
  private keepMat<T extends Material>(m: T): T { this.sharedMaterials.push(m); return m; }
  /** Item sınıfı rengine göre PAYLAŞILAN materyal (renk başına bir tane). */
  private lootMaterial(hex: string): Material {
    const hit = this.lootMats.get(hex);
    if (hit) return hit;
    const made = this.keepMat(new MeshBasicMaterial({ color: hex }));
    this.lootMats.set(hex, made);
    return made;
  }
  private disposeMobVisual(g: Group): void {
    for (const child of [...g.children]) this.mobPickTargets.delete(child);
    /* P2.2 — mob örneğinin mixer bağları BURADA çözülür; paylaşılan
       geometri/materyale DOKUNULMAZ (onlar fabrikaya aittir). */
    const rig = this.rigByGroup.get(g);
    if (rig) { rig.dispose(); this.rigByGroup.delete(g); }
    g.clear();
    g.parent?.remove(g);
  }

  /* ───────────────────────────── kamera ───────────────────────────── */

  get camera(): Camera {
    return this.tuning.projection === 'orthographic' ? this.ortho : this.perspective;
  }
  get usingWebGL(): boolean { return this.renderer !== null; }

  /** Kamera ayarı değişince izdüşümü tazele. */
  applyCameraTuning(): void {
    this.perspective.fov = this.tuning.fov;
    this.perspective.aspect = this.width / this.height;
    this.perspective.updateProjectionMatrix();
    const b = orthoBounds(this.tuning, this.width / this.height);
    this.ortho.left = b.left; this.ortho.right = b.right;
    this.ortho.top = b.top; this.ortho.bottom = b.bottom;
    this.ortho.updateProjectionMatrix();
  }

  /** §22 — portrait yeniden boyutlandırma. */
  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.applyCameraTuning();
    this.renderer?.setPixelRatio(Math.min(2, globalThis.devicePixelRatio ?? 1));
    this.renderer?.setSize(this.width, this.height, false);
  }

  /** Kamerayı oyuncuya taşır. Yumuşatma YALNIZ GÖRSELDİR (§8). */
  private updateCamera(target: GameplayPoint, dt: number): void {
    const desired = cameraPosition(target, this.tuning);
    this.camPos = this.camReady
      ? smoothTowards(this.camPos, desired, dt, this.tuning.smoothing)
      : { ...desired };
    this.camReady = true;
    const look = cameraLookAt(target, this.tuning);
    for (const cam of [this.perspective, this.ortho]) {
      cam.position.set(this.camPos.x, this.camPos.y, this.camPos.z);
      cam.lookAt(this.tmp.set(look.x, look.y, look.z));
    }
  }

  /* ───────────────────────────── kare güncellemesi ───────────────────────────── */

  /** Gameplay karesini OKUR ve görselleri günceller. Gameplay'e YAZMAZ. */
  update(frame: WorldFrame, dt: number): void {
    /* oyuncu (§6): konum + 360° dönüş.
       P2.1 — gövde açısı `bodyAngle`'dır (saldırıda hedef, aksi halde hareket);
       böylece nişan alırken yana kaçış YÖNLÜ klipleri tetikleyebilir. */
    const p = frame.player;
    this.playerRoot.position.set(p.worldX, groundElevationAt(p.worldX, p.worldY), p.worldY);
    this.playerRoot.rotation.y = facingToYaw(p.bodyAngle);
    /* Ölüm klibi oynarken görsel GİZLENMEZ — düşüş animasyonu görünmeli. */
    this.playerRoot.visible = p.alive || this.archer !== null;
    this.measureSpeed(p, dt);
    this.updateArcher(p, dt, frame.targetUid !== null);
    /* ArrowSpawn socketi bu karede OKUNACAK: oyuncu alt ağacının dünya matrisi
       BURADA tazelenmeli. Aksi halde ok, BİR KARE BAYAT (ilk karede hiç
       kurulmamış) bir socket konumundan doğar — ölçüldü ve düzeltildi. */
    this.playerRoot.updateMatrixWorld(true);

    /* moblar (§7): anahtar uid+generation → respawn eski görseli DEVRALAMAZ.
       P2.2 — ÖLÜ MOB GÖRSELİ ARTIK YAŞAR: `08_DEATH` klibi oynayıp ceset son
       karede tutulur. Görsel, mob RESPAWN olunca yeni bir `uid:generation`
       aldığı için kendiliğinden silinir; eski poz yeni nesle SIZAMAZ. */
    this.mobs.beginFrame();
    this.mobClipRows.length = 0;
    this.mobDeathActive = 0;
    for (const m of frame.mobs) {
      /* P2.9 — ceset süresi dolduysa görsel ÜRETİLMEZ ve dokunulmaz;
         `endFrame()` onu kendiliğinden söker. Gameplay listesi değişmez. */
      if (m.corpseFaded) continue;
      const key = mobVisualKey(m.uid, m.generation);
      const g = this.mobs.touch(key);
      if (g.children.length === 0) this.fillMobVisual(g, m, key);
      g.position.set(m.worldX, groundElevationAt(m.worldX, m.worldY), m.worldY);
      this.updateMobVisual(g, m, key, dt, frame.player);
    }
    for (const key of this.mobs.endFrame()) {
      this.mobMotion.delete(key);
      this.mobRigs.delete(key);
    }

    /* projectile (§15): AUTHORITY CombatPipeline'dadır; burada yalnız görsel.
       P2.1 — ok GÖRSELİ ArrowSpawn socketinden çıkar ve ilk 0.12 sn içinde
       otoritenin konumuna karışır. Otorite konumu DEĞİŞMEZ; bu yalnız
       "ok yaydan çıkıyor" görüntüsüdür. */
    const spawn = this.archer?.socketWorldPosition('arrowSpawn') ?? null;
    this.projectiles.beginFrame();
    for (const pr of frame.projectiles) {
      const key = projectileVisualKey(pr.id);
      const m = this.projectiles.touch(key);
      let origin = this.arrowOrigins.get(key);
      if (!origin && spawn !== null) {
        origin = { x: spawn.x, y: spawn.y, z: spawn.z };
        this.arrowOrigins.set(key, origin);
      }
      /* Model YOKKEN karışım da YOKTUR: görsel otoritenin konumunun
         BİREBİR aynısıdır (P2.0 davranışı korunur). */
      const t = origin
        ? Math.min(1, Math.max(0, pr.travelled) / ARROW_SPAWN_BLEND_WORLD) : 1;
      const ox = origin?.x ?? pr.worldX;
      const oz = origin?.z ?? pr.worldY;
      /* ── YÜKSEKLİK: yaydan ÇIKIŞ yüksekliğinden HEDEFİN gövde ortasına ──
         Eski kod okun ilk 0,12 sn'de sabit 26 birime DALMASINA yol açıyordu
         (yay ~40,6 birimde). Artık iniş, uçuşun TAMAMINA yayılır ve varış
         yüksekliği gerçek hedefin gövde ortasıdır; ıskada düz uçar. */
      const launchY = origin?.y ?? ARROW_DEFAULT_Y;
      const arriveY = this.arrowArrivalY(pr, frame, launchY);
      const progress = pr.travelDistance > 0
        ? Math.min(1, Math.max(0, pr.travelled / pr.travelDistance)) : 0;
      m.position.set(
        ox + (pr.worldX - ox) * t,
        launchY + (arriveY - launchY) * progress,
        oz + (pr.worldY - oz) * t,
      );
      /* ── YÖN ──
         Geometri ZATEN yerel +Z'ye bakacak şekilde döndürülmüştür
         (bkz. `arrowGeometry`), bu yüzden tek gereken yaw'dır.
         ESKİ KOD YANLIŞTI: `rotation.set(π/2, 0, -atan2(dirY, dirX))` okun
         eksenini 45° köşegeni etrafında AYNALIYORDU — ölçüldü: 0°/90°/180°/270°
         uçuşlarda sapma **90°**, yalnız 45°'de doğru. */
      m.rotation.set(0, facingToYaw(Math.atan2(pr.dirY, pr.dirX)), 0);
    }
    for (const key of this.projectiles.endFrame()) this.arrowOrigins.delete(key);

    /* ganimet (§19): yalnız işaretçi; sahiplik/claim P1.7'de kalır */
    this.lootVisuals.beginFrame();
    for (const l of frame.loot) {
      const m = this.lootVisuals.touch(lootVisualKey(l.lootUid));
      m.geometry = l.isCoin ? this.coinGeo : this.lootGeo;
      m.material = this.lootMaterial(l.colorHex);
      m.position.set(l.worldX,
        groundElevationAt(l.worldX, l.worldY) + (l.isCoin ? 9 : 10), l.worldY);
      m.rotation.y += dt * 1.6;
    }
    this.lootVisuals.endFrame();

    /* hedef halkası (§14) */
    const target = frame.targetUid === null ? null
      : frame.mobs.find((m) => m.uid === frame.targetUid && !m.dead) ?? null;
    this.targetRing.visible = target !== null;
    if (target) {
      this.targetRing.position.set(target.worldX,
        groundElevationAt(target.worldX, target.worldY) + 1.2, target.worldY);
    }

    /* farm boundary DEBUG (§20) */
    const b = frame.boundary;
    const showB = this.showBoundary && b !== null && b.enabled;
    this.boundaryRing.visible = showB;
    if (showB && b) {
      this.boundaryRing.position.set(b.centerX,
        groundElevationAt(b.centerX, b.centerY) + 1, b.centerY);
      this.boundaryRing.scale.set(b.radius, b.radius, 1);
    }

    this.updateSun(p.worldX, p.worldY);
    this.updateCamera({ worldX: p.worldX, worldY: p.worldY }, dt);
    /* Raycaster `matrixWorld`'e bakar; `render()` çağrılmadığı headless
       durumda da doğru sonuç vermesi için matrisler burada tazelenir. */
    this.scene.updateMatrixWorld(true);
    this.fpsAvg += ((dt > 0 ? 1 / dt : 60) - this.fpsAvg) * Math.min(1, dt * 3);
  }

  /** Okun VARIŞ yüksekliği: isabet edeceği mobun gövde ortası.
   *  Iska (hedef yok) ya da mob bulunamazsa çıkış yüksekliği korunur → düz uçar. */
  private arrowArrivalY(pr: ProjectileView, frame: WorldFrame, launchY: number): number {
    if (pr.targetUid === null) return launchY;
    const mob = frame.mobs.find((mm) => mm.uid === pr.targetUid);
    if (!mob) return launchY;
    /* P2.4C — hedefin gövde ortası ARTIK ZEMİNE GÖREDİR; düz dünyada
       `groundElevationAt` 0 döndüğü için eski davranış aynen korunur. */
    return groundElevationAt(mob.worldX, mob.worldY) + MOB_STYLE[mob.aiType].height / 2;
  }

  /** Görsel hızı KONUM FARKINDAN ölçer (m/sn).
   *  Gameplay'e sorulmaz, gameplay'e yazılmaz; yalnız playback hızı içindir. */
  private measureSpeed(p: PlayerView, dt: number): void {
    if (this.prevPlayer === null || dt <= 0) {
      this.prevPlayer = { x: p.worldX, y: p.worldY };
      this.measuredSpeedMps = 0;
      return;
    }
    const dist = Math.hypot(p.worldX - this.prevPlayer.x, p.worldY - this.prevPlayer.y);
    this.prevPlayer.x = p.worldX; this.prevPlayer.y = p.worldY;
    const mps = dist / WORLD_UNITS_PER_METER / dt;
    this.measuredSpeedMps = Math.min(MAX_MEASURED_SPEED_MPS, mps);
  }

  /** Archer modelini sürer. Model yoksa hiçbir şey yapmaz (primitive fallback). */
  private updateArcher(p: PlayerView, dt: number, hasTarget: boolean): void {
    const rig = this.archer;
    if (!rig) return;
    /* Hareket yönünün GÖVDEYE göre yerel açısı — yön klibi bundan seçilir. */
    const moveAngle = Math.atan2(p.moveY, p.moveX);
    const d = rig.update(dt, {
      alive: p.alive,
      speedMetersPerSec: this.measuredSpeedMps,
      localMoveAngle: moveAngle - p.bodyAngle,
      moving: p.moving,
      attackTriggerCount: p.attackTriggers,
      skillTriggerCount: p.skillTriggers,
      hpRatio: p.hpRatio,
      weaponRef: p.weaponRef,
      hasTarget,
    });
    this.archerClipName = d.clip;
    this.archerState = d.state;
    this.archerTimeScale = d.timeScale;
    this.archerDeathActive = d.deathActive;
    this.archerDeathOffsetM = d.visualYOffsetMeters;
  }

  /** Güneşi ve gölge kamerasını oyuncuyla birlikte taşır.
   *  Gölge yönü SABİT kalır; yalnız kapsanan bölge kayar. */
  private updateSun(worldX: number, worldY: number): void {
    this.sun.position.set(worldX + SUN_OFFSET.x, SUN_OFFSET.y, worldY + SUN_OFFSET.z);
    this.sun.target.position.set(worldX, groundElevationAt(worldX, worldY), worldY);
    this.sun.target.updateMatrixWorld();
  }

  private fillMobVisual(g: Group, m: MobView, key: string): void {
    /* GERÇEK MODEL: klonlanmış mutant örneği (geometri/materyal PAYLAŞILIR). */
    if (this.mutantFactory) {
      const rig = this.mutantFactory.create(m.aiType);
      g.add(rig.root);
      this.mobRigs.set(key, rig);
      this.rigByGroup.set(g, rig);
      /* Raycast hedefi: GÖRÜNMEZ bir çarpışma gövdesi. Skinned mesh'e raycast
         atmak her karede iskelet çözümü gerektirir; ucuz silindir yeterlidir
         ve hedef seçimi otoritesi zaten `WorldTargetSystem`'dedir (§13). */
      const pick = new Mesh(this.mobGeo.get(m.aiType)!, this.mobPickMat);
      pick.position.y = MOB_STYLE[m.aiType].height / 2;
      pick.visible = false;
      pick.name = `mobPick:${m.uid}`;
      /* `visible = false` raycast'i engellemez; three görünürlüğe bakmaz. */
      g.add(pick);
      this.mobPickTargets.set(pick, m.uid);
      return;
    }
    /* FALLBACK: P2.0 silindiri. */
    const body = new Mesh(this.mobGeo.get(m.aiType)!, this.mobMat.get(m.aiType)!);
    body.position.y = MOB_STYLE[m.aiType].height / 2;
    body.castShadow = true;
    body.name = `mobBody:${m.uid}`;
    g.add(body);
    /* Raycast hedefi YALNIZ gövdedir; uid eşlemesi burada tutulur (§13). */
    this.mobPickTargets.set(body, m.uid);
  }

  /** Mob görselinin bakışını, hızını ve klibini günceller. */
  private updateMobVisual(
    g: Group, m: MobView, key: string, dt: number, player: PlayerView,
  ): void {
    /* Görsel hız + bakış: KONUM FARKINDAN ölçülür (gameplay'e sorulmaz). */
    let mo = this.mobMotion.get(key);
    if (!mo) {
      mo = { x: m.worldX, y: m.worldY, speed: 0, yaw: 0 };
      this.mobMotion.set(key, mo);
    } else if (dt > 0) {
      const dx = m.worldX - mo.x, dy = m.worldY - mo.y;
      const dist = Math.hypot(dx, dy);
      mo.speed = Math.min(MAX_MEASURED_SPEED_MPS, dist / WORLD_UNITS_PER_METER / dt);
      if (dist > 1e-4) mo.yaw = facingToYaw(Math.atan2(dy, dx));
      mo.x = m.worldX; mo.y = m.worldY;
    }
    /* Saldırı/aggro sırasında mob OYUNCUYA bakar (hareket etmiyor olabilir). */
    if (m.phase === 'ATTACK' || m.phase === 'AGGRO') {
      mo.yaw = facingToYaw(Math.atan2(player.worldY - m.worldY, player.worldX - m.worldX));
    }
    g.rotation.y = mo.yaw;

    const rig = this.mobRigs.get(key);
    if (!rig) return;
    const d = rig.update(dt, {
      phase: m.phase,
      speedMetersPerSec: mo.speed,
      attackPhase: m.attackPhase,
      attackTimer: m.attackTimer,
      hitMomentSec: m.hitMomentSec,
    });
    if (d.deathActive) this.mobDeathActive += 1;
    this.mobClipRows.push({
      uid: m.uid, phase: m.phase, clip: d.clip,
      timeScale: Math.round(d.timeScale * 100) / 100,
    });
  }

  /** WebGL varsa çizer; yoksa sessizce atlar (headless). */
  render(): void {
    if (!this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }

  /* ───────────────────────── girdi adaptörü (§13) ───────────────────────── */

  /** Ekran koordinatından mob UID'i çözer.
   *
   *  ══ BU BİR HEDEF OTORİTESİ DEĞİLDİR ══
   *  Yalnız "hangi mob'a dokunuldu" sorusunu yanıtlar. HP, mob state, combat
   *  ya da hedef DEĞİŞTİRMEZ; hedefi Scene mevcut `WorldTargetSystem`
   *  üzerinden seçer. Hiçbir gameplay alanına yazmaz. */
  pickMobAt(screenX: number, screenY: number): number | null {
    const meshes = [...this.mobPickTargets.keys()];
    if (meshes.length === 0) return null;
    this.pointer.set((screenX / this.width) * 2 - 1, -(screenY / this.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    return this.mobPickTargets.get(hits[0]!.object) ?? null;
  }

  /* ───────────────── görsel denetim yüzeyi (test/telemetri) ─────────────────
     Bunlar YALNIZ OKUMA (ve testlerin kasten kötüye kullanabilmesi için tek
     bir zorlama) sağlar; hiçbiri gameplay durumuna dokunmaz. */

  /** Oyuncu görselinin sahne konumu. */
  playerVisualPosition(): { x: number; y: number; z: number } {
    const p = this.playerRoot.position;
    return { x: p.x, y: p.y, z: p.z };
  }
  /** Oyuncu görselinin Y ekseni dönüşü. */
  playerVisualYaw(): number { return this.playerRoot.rotation.y; }

  /** Bir okun GÖRSEL konumu (otoritenin konumu DEĞİL — karşılaştırma için). */
  projectileVisualPosition(id: number): { x: number; y: number; z: number } | null {
    const m = this.projectiles.get(projectileVisualKey(id));
    if (!m) return null;
    return { x: m.position.x, y: m.position.y, z: m.position.z };
  }

  /** Ok görselinin baktığı DÜNYA yönü (birim vektör).
   *  Geometri yerel +Z'ye baktığı için bu, okun uçuş yönü olmalıdır. */
  projectileVisualForward(id: number): { x: number; y: number; z: number } | null {
    const m = this.projectiles.get(projectileVisualKey(id));
    if (!m) return null;
    const v = new Vector3(0, 0, 1).applyQuaternion(m.quaternion).normalize();
    return { x: v.x, y: v.y, z: v.z };
  }

  /** TEST ARACI — ok GÖRSELİNİ zorla taşır.
   *  Amacı §15'i kanıtlamaktır: görsel bir mobun tam içine konsa bile
   *  HİÇBİR hasar/çarpışma üretmez, çünkü bu katmanın gameplay'e yazma
   *  yolu YOKTUR. Bir sonraki karede otorite konumu yeniden yazar. */
  forceProjectileVisual(id: number, worldX: number, worldY: number): boolean {
    const m = this.projectiles.get(projectileVisualKey(id));
    if (!m) return false;
    m.position.set(worldX, 26, worldY);
    return true;
  }

  /** Dünya noktasını ekran pikseline yansıtır (raycast testleri için).
   *  Kamera arkasında kalırsa `null`. */
  projectToScreen(p: GameplayPoint, elevation = 0): { x: number; y: number } | null {
    const cam = this.camera;
    cam.updateMatrixWorld(true);
    const v = this.tmp.set(p.worldX, elevation, p.worldY);
    const proj = (cam as PerspectiveCamera | OrthographicCamera);
    /* three'nin project() yardımcısı yerine kamera matrisini kullanmak için
       geçici bir Vector3 üzerinde çalışırız. */
    const ndc = worldToNdc(v, proj);
    if (ndc === null) return null;
    return {
      x: (ndc.x * 0.5 + 0.5) * this.width,
      y: (-ndc.y * 0.5 + 0.5) * this.height,
    };
  }

  /** Etkin kameranın en-boy oranı (§22). */
  cameraAspect(): number {
    return this.tuning.projection === 'orthographic'
      ? (this.ortho.right - this.ortho.left) / (this.ortho.top - this.ortho.bottom)
      : this.perspective.aspect;
  }

  /* ───────────────────────── telemetri (§23) ───────────────────────── */

  /** P2.1 — Archer modeli telemetrisi. Model yoksa `null`. */
  archerStats(): ArcherRenderStats | null {
    const rig = this.archer;
    if (!rig) return null;
    const clip = archerClip(this.archerClipName as Parameters<typeof archerClip>[0]);
    return {
      glbActive: true,
      state: this.archerState,
      clip: this.archerClipName,
      clipCount: rig.clipNames.length,
      timeScale: Math.round(this.archerTimeScale * 1000) / 1000,
      speedMetersPerSec: Math.round(this.measuredSpeedMps * 1000) / 1000,
      sourceSpeedMetersPerSec: clip.sourceSpeedMetersPerSec,
      animationReleaseSec: ARCHER_NATURAL_RELEASE_SEC,
      gameplayReleaseSec: this.gameplayReleaseSec,
      releaseDeltaSec:
        Math.round(releaseTimingDelta(this.gameplayReleaseSec) * 1e6) / 1e6,
      deathActive: this.archerDeathActive,
      deathVisualYOffsetMeters: this.archerDeathOffsetM,
      deathModelLocalDisplacementMeters:
        Math.round(rig.hipsLocalDisplacementMeters() * 1000) / 1000,
      bowGripDistanceMeters: Math.round((rig.bowGripDistanceMeters() ?? 0) * 1e5) / 1e5,
      arrowSpawn: rig.socketWorldPosition('arrowSpawn'),
    };
  }

  /** P2.2 — mutant mob telemetrisi. Model yoksa `null`. */
  mobStats(): MobRenderStats | null {
    if (!this.mutantFactory) return null;
    const attack = attackClipFor(0.45);
    return {
      glbActive: true,
      rigCount: this.mobRigs.size,
      clipCount: this.mutantFactory.clipNames.length,
      clips: [...this.mobClipRows],
      deathActive: this.mobDeathActive,
      attackClip: attack.name,
      attackAlignmentSec: Math.round(((attack.hitTimeSec ?? 0) - 0.45) * 1000) / 1000,
      missingClips: MUTANT_MISSING_CLIPS,
    };
  }

  /** P2.4 — ok modeli telemetrisi. Model yoksa `null`. */
  arrowStats(): ArrowRenderStats | null {
    if (!this.arrowOwned) return null;
    return {
      glbActive: true,
      vertices: ARROW_MODEL.vertices,
      triangles: ARROW_MODEL.triangles,
      lengthMeters: ARROW_MODEL.lengthMeters,
      lengthWorld: Math.round(ARROW_LENGTH_WORLD * 100) / 100,
      alphaMode: ARROW_MODEL.alphaMode,
      doubleSided: ARROW_MODEL.doubleSided,
      liveCount: this.projectiles.size,
    };
  }

  stats(): RenderStats {
    const info = this.renderer?.info;
    let objects = 0;
    this.scene.traverse(() => { objects += 1; });
    return {
      fps: Math.round(this.fpsAvg),
      drawCalls: info?.render.calls ?? 0,
      triangles: info?.render.triangles ?? 0,
      textures: info?.memory.textures ?? 0,
      geometries: info?.memory.geometries ?? 0,
      programs: info?.programs?.length ?? 0,
      activeObjectCount: objects,
      mobVisualCount: this.mobs.size,
      projectileVisualCount: this.projectiles.size,
      lootVisualCount: this.lootVisuals.size,
      visualsCreated: this.mobs.created + this.projectiles.created + this.lootVisuals.created,
      visualsRemoved: this.mobs.removed + this.projectiles.removed + this.lootVisuals.removed,
      webgl: this.renderer !== null,
      archer: this.archerStats(),
      mob: this.mobStats(),
      arrow: this.arrowStats(),
    };
  }

  /** Sahne kapanışı — PAYLAŞILAN varlıklar YALNIZ BURADA serbest bırakılır. */
  dispose(): void {
    this.detachArcher();
    if (this.loadedGlb) disposeGlbAssets(this.loadedGlb.scene);
    this.loadedGlb = null;
    /* P2.4 — ok modeli: klonlanan geometri bize ait, materyal GLB'ye. */
    const arrowGlb = this.arrowGlb;
    this.detachArrow();
    if (arrowGlb) disposeGlbAssets(arrowGlb.scene);
    this.arrowGlb = null;
    /* P2.2 — mob örnekleri + PAYLAŞILAN mutant GPU kaynakları. */
    const factory = this.mutantFactory;
    this.detachMutant();
    factory?.dispose();
    this.mutantGlb = null;
    this.mobMotion.clear();
    this.mobRigs.clear();
    this.rigByGroup.clear();
    this.arrowOrigins.clear();
    this.mobs.clear();
    this.projectiles.clear();
    this.lootVisuals.clear();
    this.mobPickTargets.clear();
    for (const g of this.sharedGeometries) g.dispose();
    for (const m of this.sharedMaterials) m.dispose();
    this.sharedGeometries.length = 0;
    this.sharedMaterials.length = 0;
    this.renderer?.dispose();
    this.renderer = null;
  }
}
