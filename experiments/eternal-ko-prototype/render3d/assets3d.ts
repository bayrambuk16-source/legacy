/** 3D VARLIK KAYITÇISI — P2.0 §27 · P2.1 (GERÇEK GLB)
 *
 *  Runtime kanonik 3D formatı **GLB**'dir. FBX runtime'da KULLANILMAZ.
 *  P2.1'de oyuncu varlığı GERÇEKTİR (`archer_mobile_v1.glb`); mob varlıkları
 *  hâlâ primitive fallback kullanır. Sözleşme değişmedi:
 *
 *      manifest kaydı VAR + dosya yüklendi  →  GLB görseli
 *      kayıt YOK / yükleme başarısız        →  PRIMITIVE FALLBACK
 *
 *  ══════════ BU DOSYA THREE İMPORT ETMEZ ══════════
 *  Saf veri + durum makinesidir. Gerçek yükleme `render3d/GlbLoader.ts`
 *  adaptörüne aittir. */
import { ARCHER_CLIP_NAMES, ARCHER_MODEL_SCALE, archerSocket } from '../data/archer-model.js';
import { PROTO_MODELS } from '../data/proto-assets.js';

/** Bir görsel varlığın mantıksal kimliği. */
export type VisualKind =
  | 'player' | 'mob_normal' | 'mob_aggressive' | 'mob_elite'
  | 'projectile' | 'loot_item' | 'loot_coin';

/** MOB varlıkları için genel klip sözleşmesi (§28).
 *  Mob GLB'leri henüz YOK; hiçbiri oynatılmaz. Oyuncunun klip listesi bu
 *  genel adlar DEĞİL, manifestteki 17 GERÇEK klip adıdır. */
export type AnimationClip = 'IDLE' | 'WALK' | 'RUN' | 'ATTACK' | 'SKILL' | 'DEATH';
export const ANIMATION_CLIPS: readonly AnimationClip[] =
  ['IDLE', 'WALK', 'RUN', 'ATTACK', 'SKILL', 'DEATH'];

/** İskelet soketleri.
 *  P2.1'de GERÇEK socket verisi manifestten gelir (`data/archer-model.ts` →
 *  `ARCHER_SOCKETS`: kemik + localPosition + localRotation). Buradaki ofset
 *  YALNIZ model yokken (primitive fallback) kullanılır. */
export interface SocketSpec {
  readonly name: 'BowSocket' | 'ArrowSpawn';
  /** Manifest kemiği (model yüklüyse bu kullanılır). */
  readonly bone: string | null;
  /** Bone bulunamazsa kullanılacak yerel ofset (three uzayı, world birimi). */
  readonly fallbackOffset: { x: number; y: number; z: number };
}

export interface GlbAssetSpec {
  readonly kind: VisualKind;
  /** Manifest anahtarı; dosya gelince buraya bağlanır. */
  readonly key: string;
  /** GLB yolu. `null` → varlık HENÜZ YOK, primitive kullanılır. */
  readonly url: string | null;
  /** Model ölçek çarpanı (world birimine uyum). */
  readonly scale: number;
  readonly clips: readonly string[];
  readonly sockets: readonly SocketSpec[];
}

/** P2.1 MANİFESTİ — oyuncu GERÇEK GLB kullanır; moblar hâlâ primitive. */
export const GLB_MANIFEST: readonly GlbAssetSpec[] = [
  {
    kind: 'player', key: 'archer_glb', url: PROTO_MODELS.archer_glb ?? null,
    scale: ARCHER_MODEL_SCALE,
    clips: ARCHER_CLIP_NAMES,
    sockets: [
      { name: 'BowSocket', bone: archerSocket('bow').bone, fallbackOffset: { x: 12, y: 28, z: 0 } },
      { name: 'ArrowSpawn', bone: archerSocket('arrowSpawn').bone, fallbackOffset: { x: 14, y: 30, z: 6 } },
    ],
  },
  { kind: 'mob_normal', key: 'mob_normal', url: null, scale: 1, clips: ANIMATION_CLIPS, sockets: [] },
  { kind: 'mob_aggressive', key: 'mob_aggressive', url: null, scale: 1, clips: ANIMATION_CLIPS, sockets: [] },
  { kind: 'mob_elite', key: 'mob_elite', url: null, scale: 1, clips: ANIMATION_CLIPS, sockets: [] },
];

export type AssetState = 'missing' | 'loading' | 'ready' | 'failed';

/** Hangi görselin GLB mi primitive mi kullanacağını söyleyen tek kapı. */
export class Asset3dRegistry {
  private states = new Map<VisualKind, AssetState>();

  constructor(private manifest: readonly GlbAssetSpec[] = GLB_MANIFEST) {
    for (const a of this.manifest) {
      this.states.set(a.kind, a.url === null ? 'missing' : 'loading');
    }
  }

  spec(kind: VisualKind): GlbAssetSpec | undefined {
    return this.manifest.find((a) => a.kind === kind);
  }
  state(kind: VisualKind): AssetState { return this.states.get(kind) ?? 'missing'; }
  markReady(kind: VisualKind): void { this.states.set(kind, 'ready'); }
  markFailed(kind: VisualKind): void { this.states.set(kind, 'failed'); }

  /** GLB kullanılacak mı? `false` → PRIMITIVE FALLBACK. */
  useGlb(kind: VisualKind): boolean { return this.state(kind) === 'ready'; }

  /** Yüklenmesi gereken (url'i olan) varlıklar. P2.1'de: oyuncu. */
  pending(): GlbAssetSpec[] {
    return this.manifest.filter((a) => a.url !== null && this.state(a.kind) === 'loading');
  }

  /** Bir soketin yerel ofseti; bone yoksa fallback (§29). */
  socketOffset(kind: VisualKind, name: SocketSpec['name']): { x: number; y: number; z: number } | null {
    return this.spec(kind)?.sockets.find((s) => s.name === name)?.fallbackOffset ?? null;
  }

  summary(): Array<{ kind: VisualKind; state: AssetState; usingGlb: boolean }> {
    return this.manifest.map((a) => ({
      kind: a.kind, state: this.state(a.kind), usingGlb: this.useGlb(a.kind),
    }));
  }
}
