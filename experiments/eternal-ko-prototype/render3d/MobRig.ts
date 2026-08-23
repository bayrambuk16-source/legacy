/** MUTANT MOB RIG — P2.2 (three'yi KULLANAN dosya)
 *
 *  Bir mob ÖRNEĞİNİ sarar: klonlanmış düğüm grafiği, kendi `AnimationMixer`'ı,
 *  8 action, AI tipine göre ölçek ve ölüm sunumu. Kararı `MutantAnimator`
 *  (three'siz) verir; burası yalnız UYGULAR.
 *
 *  ══════════════ GEOMETRİ VE MATERYAL PAYLAŞILIR ══════════════
 *  Örnekler `SkeletonUtils.clone()` ile üretilir: düğüm grafiği + skeleton
 *  KOPYALANIR (her mobun kendi pozu olabilsin diye), `BufferGeometry` ve
 *  `Material` ise TEK KOPYA olarak PAYLAŞILIR. 8 mob = 1 geometri + 1 materyal
 *  + 1 doku. GPU kaynakları YALNIZ fabrika `dispose()` edilince serbest kalır.
 *
 *  ══════════════ GAMEPLAY'E YAZMAZ ══════════════
 *  Girdisi kopyalanmış, salt okunur `MutantAnimInput`'tur. `08_DEATH`
 *  klibinin 0,87 m'lik yazılı geriye düşüşü model-yerel bir SUNUMDUR; mob
 *  `worldX/worldY` otoritesi `MobAi` / `MobSlotSystem` içinde kalır. */
import {
  AnimationMixer, Group, LoopOnce, LoopRepeat, Mesh, Object3D, Vector3,
  type AnimationAction, type AnimationClip, type MeshStandardMaterial,
} from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import {
  MUTANT_BONES, mutantScaleFor, type MutantClipName,
} from '../data/mutant-model.js';
import { kecoonScaleFor } from '../data/kecoon-model.js';
import type { MobAiType } from '../data/mob-ai-profiles.js';
import { MutantAnimator, type MutantAnimDecision, type MutantAnimInput } from './MutantAnimator.js';
import { findNode, type LoadedGlb } from './GlbLoader.js';

/** Yüklenmiş mutant GLB'sinden ucuz örnekler üreten fabrika.
 *  GLB BİR KEZ çözülür; her mob yalnız düğüm grafiği kopyası alır. */
export class MutantRigFactory {
  private clips: AnimationClip[];
  constructor(private glb: LoadedGlb) { this.clips = glb.clips; }

  get clipNames(): string[] { return this.clips.map((c) => c.name); }
  get source(): LoadedGlb { return this.glb; }

  /** Yeni bir mob örneği — geometri/materyal PAYLAŞILIR. */
  create(aiType: MobAiType): MobRig {
    return new MobRig(cloneSkinned(this.glb.scene), this.clips, aiType);
  }

  /** GPU kaynaklarını serbest bırakır — sahne kapanışında BİR KEZ. */
  dispose(): void {
    this.glb.scene.traverse((o) => {
      const mesh = o as Mesh & { isMesh?: boolean; isSkinnedMesh?: boolean };
      if (mesh.isMesh !== true && mesh.isSkinnedMesh !== true) return;
      mesh.geometry?.dispose();
      const mat = mesh.material as MeshStandardMaterial | undefined;
      mat?.map?.dispose();
      mat?.dispose();
    });
  }
}

export class MobRig {
  /** Sahneye eklenen, world birimine ölçeklenmiş kap. */
  readonly root = new Group();
  readonly animator = new MutantAnimator();

  private mixer: AnimationMixer;
  private clipMap = new Map<MutantClipName, AnimationClip>();
  private actions = new Map<MutantClipName, AnimationAction>();
  private current: MutantClipName | null = null;
  private wasDead = false;
  private tmp = new Vector3();

  constructor(
    /** Klonlanmış GLB kökü (`Mutant`, transform identity). */
    readonly model: Object3D,
    clips: readonly AnimationClip[],
    readonly aiType: MobAiType,
  ) {
    this.root.name = `mobRig:${aiType}`;
    /* P2.28 — ÖLÇEK MODELE GÖRE. Goblin mutanttan kısadır; kendi
       doğal boyu üzerinden ölçeklenir ki placeholder yükseklik
       hiyerarşisi korunsun. Model, klip adından ANLAŞILIR: goblin
       klipleri `02_WALK` taşır, mutantınki `03_WALK`. */
    const isGoblin = clips.some((c) => c.name === '02_WALK');
    const s = isGoblin ? kecoonScaleFor(aiType) : mutantScaleFor(aiType);
    this.root.scale.set(s, s, s);
    this.root.add(this.model);

    this.model.traverse((o) => {
      const mesh = o as Mesh & { isMesh?: boolean; isSkinnedMesh?: boolean };
      if (mesh.isMesh === true || mesh.isSkinnedMesh === true) {
        o.castShadow = true;
        o.receiveShadow = false;
      }
    });

    this.mixer = new AnimationMixer(this.model);
    for (const c of clips) this.clipMap.set(c.name as MutantClipName, c);
    /* P2.28 — animatöre HANGİ KLİPLERİN var olduğunu söyle; tablo
       ona göre seçilir. Rig model adı bilmez, klip listesi bilir. */
    this.animator.useClipMap(clips.map((c) => c.name));
  }

  get clipNames(): MutantClipName[] { return [...this.clipMap.keys()]; }
  get currentClip(): MutantClipName | null { return this.current; }
  hasClip(name: MutantClipName): boolean { return this.clipMap.has(name); }
  get scale(): number { return this.root.scale.x; }

  private action(name: MutantClipName): AnimationAction | null {
    const cached = this.actions.get(name);
    if (cached) return cached;
    const clip = this.clipMap.get(name);
    if (!clip) return null;
    const act = this.mixer.clipAction(clip);
    this.actions.set(name, act);
    return act;
  }

  /** Karar ver + uygula. Gameplay durumuna HİÇBİR ŞEY yazmaz. */
  update(dt: number, input: MutantAnimInput): MutantAnimDecision {
    const d = this.animator.update(dt, input);
    /* Respawn: ölüm pozu ve GÖRSEL öteleme TAMAMEN sıfırlanır. */
    if (this.wasDead && !d.deathActive) this.hardReset();
    this.wasDead = d.deathActive;

    this.play(d);
    this.model.position.y = d.visualYOffsetMeters;
    this.mixer.update(dt);
    return d;
  }

  private play(d: MutantAnimDecision): void {
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

  /** Ölümden dönüş / yeniden kullanım. */
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

  /* ───────────────────── denetim yüzeyi (test/telemetri) ───────────────────── */

  /** Kafa üstü çapa (can barı / hasar sayısı) — DÜNYA konumu. */
  headTopWorldPosition(): { x: number; y: number; z: number } | null {
    return this.boneWorldPosition(MUTANT_BONES.headTop);
  }

  boneWorldPosition(manifestName: string): { x: number; y: number; z: number } | null {
    const bone = findNode(this.model, manifestName);
    if (!bone) return null;
    bone.getWorldPosition(this.tmp);
    return { x: this.tmp.x, y: this.tmp.y, z: this.tmp.z };
  }

  /** Modelin YEREL kök ötelemesi (metre) — ölüm sunumu ölçümü. */
  modelLocalOffset(): { x: number; y: number; z: number } {
    const p = this.model.position;
    return { x: p.x, y: p.y, z: p.z };
  }

  /** Kalçanın model uzayındaki yatay kayması (metre).
   *  Ölüm klibinin yazılı yer değiştirmesi BURADA görünür — gameplay'de DEĞİL. */
  hipsLocalDisplacementMeters(): number {
    const hips = findNode(this.model, MUTANT_BONES.hips);
    if (!hips) return 0;
    return Math.hypot(hips.position.x, hips.position.z);
  }

  /** TEST ARACI — bir klibi belirli bir ANA sabitler. */
  sampleClip(name: MutantClipName, timeSec: number): boolean {
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

  /** Örneği sahneden ayırır ve mixer bağlarını TEMİZLER.
   *
   *  ══ PAYLAŞILAN GEOMETRİ/MATERYALE DOKUNMAZ ══
   *  Onları yalnız `MutantRigFactory.dispose()` serbest bırakır. */
  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    for (const clip of this.clipMap.values()) this.mixer.uncacheClip(clip);
    this.actions.clear();
    this.clipMap.clear();
    this.model.removeFromParent();
    this.root.clear();
    this.root.removeFromParent();
    this.current = null;
  }
}
