/** THREE.JS TİP BİLDİRİMİ — P2.0 (yerel, sürüm 0.169.0)
 *
 *  three@0.169.0 tarball'ı TypeScript tipi TAŞIMAZ (`@types/three` ayrı bir
 *  pakettir ve bu ortamda npm erişimi yoktur). Bu yüzden YALNIZ PROJENİN
 *  KULLANDIĞI yüzey elle bildirilmiştir.
 *
 *  KURAL: buraya yeni bir API eklemek, onu gerçekten kullanmayı gerektirir.
 *  Kullanılmayan yüzey bildirilmez — böylece bildirim gerçek kullanımla
 *  senkron kalır ve "tip var ama çalışmıyor" durumu oluşmaz.
 *
 *  Bu dosya `vendor/three/build/three.module.js` ile AYNI sürüme aittir;
 *  tarball değişirse birlikte gözden geçirilmelidir (bkz. VENDOR.json). */
declare module 'three' {
  export class Vector2 {
    constructor(x?: number, y?: number);
    x: number; y: number;
    set(x: number, y: number): this;
  }
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number; y: number; z: number;
    set(x: number, y: number, z: number): this;
    copy(v: Vector3): this;
    clone(): Vector3;
    add(v: Vector3): this;
    sub(v: Vector3): this;
    addScaledVector(v: Vector3, s: number): this;
    multiplyScalar(s: number): this;
    normalize(): this;
    length(): number;
    lengthSq(): number;
    distanceTo(v: Vector3): number;
    lerp(v: Vector3, alpha: number): this;
    setFromMatrixPosition(m: Matrix4): this;
    applyQuaternion(q: Quaternion): this;
  }
  export class Euler {
    constructor(x?: number, y?: number, z?: number, order?: string);
    x: number; y: number; z: number;
    set(x: number, y: number, z: number): this;
  }
  export class Quaternion {
    constructor(x?: number, y?: number, z?: number, w?: number);
    x: number; y: number; z: number; w: number;
    set(x: number, y: number, z: number, w: number): this;
    copy(q: Quaternion): this;
    setFromAxisAngle(axis: Vector3, angle: number): this;
  }
  export class Matrix4 {
    elements: number[];
    copy(m: Matrix4): this;
    invert(): this;
    /* P2.11 — bitki örtüsü InstancedMesh matrisleri için. */
    compose(position: Vector3, quaternion: Quaternion, scale: Vector3): this;
  }
  export class Vector4 {
    constructor(x?: number, y?: number, z?: number, w?: number);
    x: number; y: number; z: number; w: number;
    applyMatrix4(m: Matrix4): this;
  }
  export class Color {
    constructor(color?: number | string);
    set(color: number | string): this;
    setHex(hex: number): this;
    getHexString(): string;
  }

  export class Object3D {
    readonly id: number;
    name: string;
    readonly position: Vector3;
    readonly rotation: Euler;
    readonly scale: Vector3;
    readonly children: Object3D[];
    parent: Object3D | null;
    visible: boolean;
    castShadow: boolean;
    receiveShadow: boolean;
    /* P2.11 — bitki örtüsü: kameranın dışındaki örnekler çizilmesin. */
    frustumCulled: boolean;
    userData: Record<string, unknown>;
    matrixWorld: Matrix4;
    readonly quaternion: Quaternion;
    add(...o: Object3D[]): this;
    getObjectByName(name: string): Object3D | undefined;
    removeFromParent(): this;
    remove(...o: Object3D[]): this;
    clear(): this;
    lookAt(v: Vector3): void;
    updateMatrixWorld(force?: boolean): void;
    traverse(cb: (o: Object3D) => void): void;
    getWorldPosition(target: Vector3): Vector3;
  }
  export class Group extends Object3D {}
  export class Scene extends Object3D {
    background: Color | null;
    fog: Fog | null;
  }
  export class Fog {
    constructor(color: number | string, near?: number, far?: number);
  }

  export class Camera extends Object3D {
    readonly projectionMatrix: Matrix4;
    readonly matrixWorldInverse: Matrix4;
  }
  export class PerspectiveCamera extends Camera {
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    fov: number; aspect: number; near: number; far: number;
    updateProjectionMatrix(): void;
  }
  export class OrthographicCamera extends Camera {
    constructor(left?: number, right?: number, top?: number, bottom?: number, near?: number, far?: number);
    left: number; right: number; top: number; bottom: number; near: number; far: number;
    zoom: number;
    updateProjectionMatrix(): void;
  }

  /** Tipli dizi tamponu. P2.4C — Moradon arazi mesh'i düğüm konumlarını ve
   *  indislerini doğrudan bu yolla yazar (hazır geometri sınıfı yetmez). */
  export class BufferAttribute {
    constructor(array: ArrayLike<number>, itemSize: number, normalized?: boolean);
    array: ArrayLike<number>;
    itemSize: number;
    needsUpdate: boolean;
  }
  export class BufferGeometry {
    dispose(): void;
    scale(x: number, y: number, z: number): this;
    clone(): this;
    rotateX(angle: number): this;
    rotateY(angle: number): this;
    rotateZ(angle: number): this;
    translate(x: number, y: number, z: number): this;
    /* P2.4C — elle geometri kurma yüzeyi. */
    setAttribute(name: string, attribute: BufferAttribute): this;
    setIndex(index: BufferAttribute | null): this;
    computeVertexNormals(): void;
    computeBoundingSphere(): void;
  }
  export class PlaneGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, ws?: number, hs?: number);
  }
  export class BoxGeometry extends BufferGeometry {
    constructor(w?: number, h?: number, d?: number);
  }
  export class SphereGeometry extends BufferGeometry {
    constructor(radius?: number, ws?: number, hs?: number);
  }
  export class CylinderGeometry extends BufferGeometry {
    constructor(rTop?: number, rBottom?: number, height?: number, radial?: number);
  }
  export class ConeGeometry extends BufferGeometry {
    constructor(radius?: number, height?: number, radial?: number);
  }
  export class CapsuleGeometry extends BufferGeometry {
    constructor(radius?: number, length?: number, capSeg?: number, radial?: number);
  }
  export class RingGeometry extends BufferGeometry {
    constructor(inner?: number, outer?: number, seg?: number);
  }
  export class TorusGeometry extends BufferGeometry {
    constructor(radius?: number, tube?: number, radial?: number, tubular?: number);
  }

  export interface MaterialParams {
    color?: number | string;
    transparent?: boolean;
    opacity?: number;
    depthWrite?: boolean;
    side?: number;
    roughness?: number;
    metalness?: number;
    emissive?: number | string;
    emissiveIntensity?: number;
    flatShading?: boolean;
    fog?: boolean;
  }
  export class Material {
    color: Color;
    opacity: number;
    transparent: boolean;
    visible: boolean;
    dispose(): void;
  }
  export class MeshBasicMaterial extends Material {
    constructor(p?: MaterialParams);
  }
  /** P2.11 — bitki örtüsü. 860 nesne için 860 draw call yerine tür başına
   *  TEK çağrı; mobil bunu kaldırabilsin diye. */
  export class InstancedMesh extends Mesh {
    constructor(geometry: BufferGeometry, material: Material | Material[], count: number);
    count: number;
    instanceMatrix: { needsUpdate: boolean };
    setMatrixAt(index: number, matrix: Matrix4): void;
    dispose(): void;
  }
  export class MeshLambertMaterial extends Material {
    constructor(p?: MaterialParams);
    /* P2.11 — zemin dokusu bu materyale bağlanıyor. */
    map: Texture | null;
    needsUpdate: boolean;
  }
  export class MeshStandardMaterial extends Material {
    constructor(p?: MaterialParams);
    emissive: Color;
    map: Texture | null;
    roughness: number;
    metalness: number;
  }

  export class Mesh extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material | Material[]);
    geometry: BufferGeometry;
    material: Material;
  }

  export class Light extends Object3D {
    intensity: number;
    color: Color;
  }
  export class AmbientLight extends Light {
    constructor(color?: number | string, intensity?: number);
  }
  export class HemisphereLight extends Light {
    constructor(sky?: number | string, ground?: number | string, intensity?: number);
  }
  export class DirectionalLight extends Light {
    constructor(color?: number | string, intensity?: number);
    readonly target: Object3D;
    readonly shadow: {
      mapSize: Vector2;
      bias: number;
      normalBias: number;
      camera: OrthographicCamera;
    };
  }

  /** Zemin okunabilirliği için ızgara (tek LineSegments — ucuz). */
  export class GridHelper extends Object3D {
    constructor(size?: number, divisions?: number, color1?: number | string, color2?: number | string);
    material: Material;
    geometry: BufferGeometry;
  }

  export class Raycaster {
    constructor();
    setFromCamera(coords: Vector2, camera: Camera): void;
    intersectObjects(objects: Object3D[], recursive?: boolean): Array<{
      distance: number; object: Object3D; point: Vector3;
    }>;
    ray: { origin: Vector3; direction: Vector3 };
  }

  export interface RendererInfo {
    render: { calls: number; triangles: number; frame: number };
    memory: { geometries: number; textures: number };
    programs: unknown[] | null;
  }
  export class WebGLRenderer {
    constructor(params?: {
      canvas?: unknown; antialias?: boolean; alpha?: boolean; powerPreference?: string;
    });
    domElement: HTMLCanvasElement;
    readonly info: RendererInfo;
    shadowMap: { enabled: boolean; type: number };
    setPixelRatio(v: number): void;
    setSize(w: number, h: number, updateStyle?: boolean): void;
    setClearColor(color: number | string, alpha?: number): void;
    render(scene: Scene, camera: Camera): void;
    dispose(): void;
  }

  /* ─────────────── P2.1: iskelet + animasyon yüzeyi ─────────────── */

  export class Bone extends Object3D {}
  export class Skeleton {
    readonly bones: Bone[];
    readonly boneInverses: Matrix4[];
  }
  export class SkinnedMesh extends Mesh {
    readonly isSkinnedMesh: true;
    readonly skeleton: Skeleton;
    bindMode: string;
  }
  export class Box3 {
    constructor(min?: Vector3, max?: Vector3);
    readonly min: Vector3;
    readonly max: Vector3;
    setFromObject(o: Object3D, precise?: boolean): this;
    getSize(target: Vector3): Vector3;
    isEmpty(): boolean;
  }
  export class KeyframeTrack {
    name: string;
    times: ArrayLike<number>;
    values: ArrayLike<number>;
  }
  export class AnimationClip {
    name: string;
    duration: number;
    tracks: KeyframeTrack[];
  }
  export class AnimationAction {
    enabled: boolean;
    paused: boolean;
    time: number;
    timeScale: number;
    weight: number;
    clampWhenFinished: boolean;
    loop: number;
    play(): this;
    stop(): this;
    reset(): this;
    fadeIn(sec: number): this;
    fadeOut(sec: number): this;
    crossFadeFrom(other: AnimationAction, sec: number, warp?: boolean): this;
    crossFadeTo(other: AnimationAction, sec: number, warp?: boolean): this;
    setLoop(mode: number, repetitions: number): this;
    setEffectiveTimeScale(v: number): this;
    setEffectiveWeight(v: number): this;
    isRunning(): boolean;
    getClip(): AnimationClip;
  }
  export class AnimationMixer {
    constructor(root: Object3D);
    time: number;
    timeScale: number;
    clipAction(clip: AnimationClip, root?: Object3D): AnimationAction;
    existingAction(clip: AnimationClip, root?: Object3D): AnimationAction | null;
    update(dt: number): this;
    setTime(timeInSeconds: number): this;
    stopAllAction(): this;
    uncacheRoot(root: Object3D): void;
    uncacheClip(clip: AnimationClip): void;
    uncacheAction(clip: AnimationClip, root?: Object3D): void;
  }
  export const PropertyBinding: {
    sanitizeNodeName(name: string): string;
  };
  export const LoopOnce: number;
  export const LoopRepeat: number;
  export const LoopPingPong: number;
  export const SRGBColorSpace: string;
  export class Texture {
    /* P2.11 — zemin dokusu döşeme için görüntüden kurulur. */
    constructor(image?: TexImageSource);
    colorSpace: string;
    anisotropy: number;
    needsUpdate: boolean;
    wrapS: number;
    wrapT: number;
    repeat: Vector2;
    dispose(): void;
  }

  /* P2.11 — doku döşeme sarma modu. */
  export const RepeatWrapping: number;
  export const DoubleSide: number;
  export const FrontSide: number;
  export const BackSide: number;
  export const PCFSoftShadowMap: number;
  export const MathUtils: {
    degToRad(d: number): number;
    radToDeg(r: number): number;
    clamp(v: number, min: number, max: number): number;
    lerp(a: number, b: number, t: number): number;
  };
}

declare module 'three/addons/loaders/GLTFLoader.js' {
  import { AnimationClip, Group, Object3D } from 'three';
  export interface GLTF {
    scene: Group;
    scenes: Group[];
    animations: AnimationClip[];
    cameras: Object3D[];
  }
  export class GLTFLoader {
    constructor();
    load(
      url: string,
      onLoad: (gltf: GLTF) => void,
      onProgress?: (e: { loaded: number; total: number }) => void,
      onError?: (e: unknown) => void,
    ): void;
    parse(
      data: ArrayBuffer | string, path: string,
      onLoad: (gltf: GLTF) => void, onError?: (e: unknown) => void,
    ): void;
  }
}

declare module 'three/addons/utils/SkeletonUtils.js' {
  import { Object3D } from 'three';
  /** İskeletli bir hiyerarşiyi klonlar; GEOMETRİ ve MATERYAL PAYLAŞILIR,
   *  yalnız düğüm grafiği + skeleton kopyalanır (P2.2 — mob örnekleri). */
  export function clone<T extends Object3D>(source: T): T;
}

declare module 'three/addons/utils/BufferGeometryUtils.js' {
  import { BufferGeometry } from 'three';
  /** Birden çok geometriyi TEK tampona birleştirir (P2.3 — ok silüeti,
   *  parça sayısı artarken draw call SABİT kalsın diye). */
  export function mergeGeometries(
    geometries: BufferGeometry[], useGroups?: boolean,
  ): BufferGeometry | null;
}
