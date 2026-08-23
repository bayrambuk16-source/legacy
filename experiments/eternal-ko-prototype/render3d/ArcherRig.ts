/** ARCHER RIG — P2.1 (three'yi KULLANAN dosya)
 *
 *  Yüklenmiş `archer_mobile_v1.glb` sahnesini sarar: mixer, 17 action,
 *  manifest socketleri, world ölçeği ve ölüm sunumu. Kararı `ArcherAnimator`
 *  (three'siz) verir; burası yalnız UYGULAR.
 *
 *  ══════════════ GAMEPLAY'E YAZMAZ ══════════════
 *  Bu sınıfın gameplay durumuna erişimi YOKTUR: girdisi kopyalanmış, salt
 *  okunur `ArcherAnimInput`'tur. Ölüm klibinin **1,13 m'lik yazılı geriye
 *  düşüşü** model-yerel bir SUNUMDUR; `worldX/worldY` otoritesi
 *  `WorldMovementSystem`'de kalır ve buradan ASLA değişmez.
 *
 *  ══════════════ ÖLÇEK ══════════════
 *  Model metre ölçeğindedir (karakter 1,801 m). `root` ölçeği ile world
 *  birimine çevrilir; hiçbir gameplay mesafesi/menzili DEĞİŞMEZ. */
import {
  AnimationMixer, Group, LoopOnce, LoopRepeat, Mesh, Object3D, Quaternion, Vector3,
  type AnimationAction, type AnimationClip, type MeshStandardMaterial,
} from 'three';
import {
  ARCHER_MODEL_SCALE, ARCHER_SOCKETS, ARCHER_BONES,
  type ArcherClipName, type ArcherSocketName,
} from '../data/archer-model.js';
import { ArcherAnimator, type ArcherAnimDecision, type ArcherAnimInput } from './ArcherAnimator.js';
import { findNode, type LoadedGlb } from './GlbLoader.js';

export class ArcherRig {
  /** Oyuncu görselinin altına eklenen, world birimine ölçeklenmiş kap. */
  readonly root = new Group();
  /** GLB'nin kendi sahne kökü (`Archer`, transform identity). */
  readonly model: Group;
  readonly animator = new ArcherAnimator();

  private mixer: AnimationMixer;
  private clips = new Map<ArcherClipName, AnimationClip>();
  private actions = new Map<ArcherClipName, AnimationAction>();
  private sockets = new Map<ArcherSocketName, Object3D>();
  private current: ArcherClipName | null = null;
  private wasDead = false;
  private tmp = new Vector3();

  constructor(glb: LoadedGlb) {
    this.model = glb.scene;
    this.root.name = 'archerRig';
    this.root.scale.set(ARCHER_MODEL_SCALE, ARCHER_MODEL_SCALE, ARCHER_MODEL_SCALE);
    this.root.add(this.model);

    /* Gölge: tek skinned mesh; alıcı DEĞİL (zemin alır). */
    this.model.traverse((o) => {
      const mesh = o as Mesh & { isMesh?: boolean; isSkinnedMesh?: boolean };
      if (mesh.isMesh === true || mesh.isSkinnedMesh === true) {
        o.castShadow = true;
        o.receiveShadow = false;
      }
    });

    this.mixer = new AnimationMixer(this.model);
    for (const clip of glb.clips) this.clips.set(clip.name as ArcherClipName, clip);

    /* Manifest socketleri: kemik + yerel konum + yerel dönüş BİREBİR.
       Hard-code edilmiş farklı bir ofset UYDURULMAZ. */
    for (const spec of ARCHER_SOCKETS) {
      const bone = findNode(this.model, spec.bone);
      if (!bone) continue;                          // kemik yoksa socket YOK (sessiz)
      const node = new Object3D();
      node.name = `socket:${spec.name}`;
      node.position.set(spec.localPosition[0], spec.localPosition[1], spec.localPosition[2]);
      node.quaternion.set(
        spec.localRotation[0], spec.localRotation[1],
        spec.localRotation[2], spec.localRotation[3],
      );
      bone.add(node);
      this.sockets.set(spec.name, node);
    }
  }

  /* ───────────────────────────── klip erişimi ───────────────────────────── */

  get clipNames(): ArcherClipName[] { return [...this.clips.keys()]; }
  get currentClip(): ArcherClipName | null { return this.current; }
  hasClip(name: ArcherClipName): boolean { return this.clips.has(name); }

  private action(name: ArcherClipName): AnimationAction | null {
    const cached = this.actions.get(name);
    if (cached) return cached;
    const clip = this.clips.get(name);
    if (!clip) return null;
    const act = this.mixer.clipAction(clip);
    this.actions.set(name, act);
    return act;
  }

  /* ───────────────────────────── kare uygulaması ───────────────────────────── */

  /** Karar ver + uygula. Gameplay durumuna HİÇBİR ŞEY yazmaz. */
  update(dt: number, input: ArcherAnimInput): ArcherAnimDecision {
    const d = this.animator.update(dt, input);

    /* Diriliş: ölüm pozu, model-yerel yer değiştirme ve GÖRSEL Y ötelemesi
       TAMAMEN sıfırlanır; karakter normal root transform + IDLE'a döner. */
    if (this.wasDead && !d.deathActive) this.hardReset();
    this.wasDead = d.deathActive;

    this.play(d);
    /* Ölüm GÖRSEL yükseltmesi model uzayında (metre) uygulanır; root ölçeği
       onu world birimine çevirir. Gameplay zemin/çarpışma sistemi YAZILMAZ. */
    this.model.position.y = d.visualYOffsetMeters;
    this.mixer.update(dt);
    return d;
  }

  private play(d: ArcherAnimDecision): void {
    const act = this.action(d.clip);
    if (!act) return;
    act.setLoop(d.loop ? LoopRepeat : LoopOnce, d.loop ? Infinity : 1);
    act.clampWhenFinished = d.clamp;
    act.setEffectiveTimeScale(d.timeScale);

    if (this.current === d.clip) {
      if (d.restart) { act.reset(); act.play(); }
      return;
    }
    const prev = this.current === null ? null : this.action(this.current);
    act.reset();
    act.setEffectiveWeight(1);
    act.play();
    if (prev && d.fadeSec > 0) act.crossFadeFrom(prev, d.fadeSec, false);
    this.current = d.clip;
  }

  /** Ölümden dönüş / sahne sıfırlaması. */
  hardReset(): void {
    this.mixer.stopAllAction();
    for (const act of this.actions.values()) { act.reset(); act.stop(); }
    this.mixer.setTime(0);
    this.model.position.set(0, 0, 0);
    this.model.rotation.set(0, 0, 0);
    this.current = null;
    this.animator.reset();
    this.wasDead = false;
  }

  /* ───────────────────────── denetim yüzeyi (test/telemetri) ───────────────────────── */

  /** Bir socketin DÜNYA konumu (world birimi). Yoksa `null`. */
  socketWorldPosition(name: ArcherSocketName): { x: number; y: number; z: number } | null {
    const node = this.sockets.get(name);
    if (!node) return null;
    node.getWorldPosition(this.tmp);
    return { x: this.tmp.x, y: this.tmp.y, z: this.tmp.z };
  }

  /** Manifest adıyla bir kemiğin DÜNYA konumu. */
  boneWorldPosition(manifestName: string): { x: number; y: number; z: number } | null {
    const bone = findNode(this.model, manifestName);
    if (!bone) return null;
    bone.getWorldPosition(this.tmp);
    return { x: this.tmp.x, y: this.tmp.y, z: this.tmp.z };
  }

  /** Yayın sol ele göre mesafesi (metre) — "yay elden kopmuyor" ölçümü. */
  bowGripDistanceMeters(): number | null {
    const bow = this.boneWorldPosition(ARCHER_BONES.bow);
    const hand = this.boneWorldPosition(ARCHER_BONES.leftHand);
    if (!bow || !hand) return null;
    const d = Math.hypot(bow.x - hand.x, bow.y - hand.y, bow.z - hand.z);
    return d / ARCHER_MODEL_SCALE;
  }

  /** TEST ARACI — bir klibi belirli bir ANA sabitler ve matrisleri tazeler.
   *  Yalnız ölçüm içindir; gameplay'e dokunmaz. */
  sampleClip(name: ArcherClipName, timeSec: number): boolean {
    const act = this.action(name);
    if (!act) return false;
    this.mixer.stopAllAction();
    act.reset();
    act.setEffectiveTimeScale(1);
    act.setEffectiveWeight(1);
    act.play();
    this.mixer.setTime(timeSec);
    this.current = name;
    this.root.updateMatrixWorld(true);
    return true;
  }

  /** Modelin YEREL kök ötelemesi (metre) — ölüm sunumu ölçümü için. */
  modelLocalOffset(): { x: number; y: number; z: number } {
    const p = this.model.position;
    return { x: p.x, y: p.y, z: p.z };
  }

  /** Kalça kemiğinin model uzayındaki yatay kayması (metre).
   *  Ölüm klibinin yazılı yer değiştirmesi BURADA görünür — gameplay'de DEĞİL. */
  hipsLocalDisplacementMeters(): number {
    const hips = findNode(this.model, ARCHER_BONES.hips);
    if (!hips) return 0;
    return Math.hypot(hips.position.x, hips.position.z);
  }

  /** Rig'i sahne grafiğinden ayırır.
   *
   *  ══ GLB GEOMETRİ/MATERYALİNE DOKUNMAZ ══
   *  Model paylaşılan bir varlıktır (P2.0 §24 sahiplik kuralı): DEV panelinden
   *  primitive fallback'e geçip geri dönülebilsin diye burada serbest
   *  bırakılmaz. GPU kaynakları YALNIZ `disposeGlbAssets()` ile bırakılır ve
   *  onu da yalnız `ThreeWorldRenderer.dispose()` çağırır. */
  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    for (const node of this.sockets.values()) node.removeFromParent();
    this.model.removeFromParent();
    this.root.clear();
    this.root.removeFromParent();
    this.actions.clear();
    this.clips.clear();
    this.sockets.clear();
  }
}

/** GLB'nin GPU kaynaklarını serbest bırakır — sahne kapanışında BİR KEZ. */
export function disposeGlbAssets(model: Group): void {
  model.traverse((o) => {
    const mesh = o as Mesh & { isMesh?: boolean; isSkinnedMesh?: boolean };
    if (mesh.isMesh !== true && mesh.isSkinnedMesh !== true) return;
    mesh.geometry?.dispose();
    const mat = mesh.material as MeshStandardMaterial | undefined;
    mat?.map?.dispose();
    mat?.dispose();
  });
}

/** Yardımcı — kimlik quaternion (testlerde karşılaştırma için). */
export const IDENTITY_QUATERNION = new Quaternion(0, 0, 0, 1);
