/** 3/5 OK ÇÖZÜMLEYİCİSİ — geometrik spread.
 *
 *  KURALLAR:
 *  - `damage × N` TEK vuruş YAPILMAZ: her projectile ayrı hit/miss üretir.
 *  - Rastgele "% isabet şansı" YOKTUR: isabet, okun gerçek doğrusu ile hedefin
 *    world-space `combatRadius`'unun kesişmesine bakılarak bulunur.
 *    Bir ok, hedeften `d·sin(θ)` kadar sapar (d = mesafe, θ = açı ofseti);
 *    bu yüzden yakında 5/5, uzakta doğal olarak 4/5, 3/5, 2/5 olur —
 *    mesafeye göre yüzde tablosu YOK.
 *  - Hasar hesabı burada YAPILMAZ; yalnız "hangi ok neye isabet etti" bulunur.
 *    Gerçek hasar ana CombatSystem'in damageRoll'undan gelir. */
import {
  ARCHER_BALANCE, ARCHER_SKILL_ORDER, castRange, isMultiShotRef,
  physicalCoefficient, projectileCount,
} from '../data/archer-balance.js';
import type { WorldMob } from './types.js';

/** Okların yoldaki BAŞKA moblar tarafından tutulup tutulmayacağı.
 *
 *  ÖNEMLİ: Bu davranış KAYNAK DB ile DOĞRULANMAMIŞTIR. V8 DB yalnız
 *  `magic_type2.need_arrow = 3/5` değerini doğrular; okların fiziksel olarak
 *  başka bir mob tarafından intercept edilip edilemeyeceğine dair bir alan yoktur.
 *  Bu yüzden iki mod da PROTOTİP SEÇENEĞİDİR ve DEV panelinden değiştirilebilir. */
export type CollisionMode = 'targetOnly' | 'firstMobAlongRay';

/** Prototip varsayılanı: yalnız seçili hedef test edilir.
 *  Gerekçe: (a) kaynak yan-isabeti doğrulamıyor, (b) "hedefte 1/5 → 3/5 → 5/5"
 *  ölçümünü yan moblar kirletmiyor. NİHAİ TASARIM KARARI DEĞİLDİR. */
export const DEFAULT_COLLISION_MODE: CollisionMode = 'targetOnly';

export interface MultiShotProfile {
  /** Kaç ok atılır. */
  projectiles: number;
  /** Derece cinsinden açı ofsetleri (uzunluğu `projectiles` ile eşleşmeli). */
  anglesDeg: number[];
  /** Her okun hasar katsayısı (ana damageRoll'a verilir). */
  coefficientPerArrow: number;
  /** Okun world menzili. */
  rangeWorld: number;
  /** Çarpışma modeli (prototip seçeneği — bkz. `CollisionMode`). */
  collisionMode: CollisionMode;
}

/** ÇOK-OK PROFİLLERİ — hepsi `data/archer-balance.ts`ten TÜRETİLİR.
 *
 *  SOURCE FACT (KO_Reference_v8.db → magic_type2):
 *    107515 "Multiple Shot"  need_arrow = 3   add_damage = 99
 *    107555 "Arrow Shower"   need_arrow = 5   add_damage = 99
 *
 *  P1.3 — KO FIDELITY PASS: ok başına katsayı artık kaynağın kendi kuralıdır,
 *  `add_damage / 100 = 0.99`. P1'den kalan 0.75 / 0.62 prototip değerleri
 *  KALDIRILDI. Toplam hasar hâlâ `damage × N` DEĞİLDİR: her ok ayrı hit/miss
 *  üretir, bu yüzden 5/5 ancak yakın mesafede mümkündür.
 *
 *  PROJECT LEGACY TUNING (kaynakta yok): açı yayılımı, cast menzili,
 *  çarpışma modeli. */
export const MULTISHOT_PROFILES: Record<number, MultiShotProfile> = buildMultiShotProfiles();

function buildMultiShotProfiles(): Record<number, MultiShotProfile> {
  const out: Record<number, MultiShotProfile> = {};
  for (const ref of ARCHER_SKILL_ORDER) {
    if (!isMultiShotRef(ref)) continue;
    const b = ARCHER_BALANCE[ref]!;
    out[ref] = {
      projectiles: projectileCount(ref),
      anglesDeg: [...b.tuning.spreadDeg],
      coefficientPerArrow: physicalCoefficient(ref),
      rangeWorld: castRange(ref),
      collisionMode: DEFAULT_COLLISION_MODE,
    };
  }
  return out;
}

export interface ProjectileRay {
  index: number;
  angleDeg: number;
  /** birim yön vektörü */
  dx: number; dy: number;
  originX: number; originY: number;
  range: number;
  /** isabet ettiği mob (yoksa null) */
  hit: WorldMob | null;
  /** isabet edilen mob SEÇİLİ HEDEF mi? (telemetri için) */
  onTarget: boolean;
  /** ışın boyunca isabet mesafesi (görsel için); ıskaladıysa menzil sonu */
  travel: number;
}

export interface MultiShotResolution {
  rays: ProjectileRay[];
  hits: ProjectileRay[];
  /** GERİYE DÖNÜK: herhangi bir moba çarpan ok sayısı. UI bunu göstermemeli. */
  hitCount: number;
  /** GERİYE DÖNÜK: atılan ok sayısı (= totalProjectileCount). */
  total: number;
  /** Atılan toplam ok sayısı. */
  totalProjectileCount: number;
  /** SEÇİLİ HEDEFE isabet eden ok sayısı — "3/5" bunun üzerinden okunur. */
  targetHitCount: number;
  /** Seçili hedef DIŞINDA bir moba isabet eden ok sayısı. */
  sideHitCount: number;
  /** Bu çözümde kullanılan çarpışma modeli. */
  collisionMode: CollisionMode;
}

export interface ResolveOptions {
  /** Seçili hedef; `targetOnly` modunda TEK aday, her modda telemetri referansı. */
  target?: WorldMob | null;
  /** Profildeki modu ezmek için (DEV paneli). */
  collisionMode?: CollisionMode;
}

/** Bir ışının bir mobla kesişimi: merkeze dik uzaklık ≤ combatRadius ve ileri yönde. */
export function rayHitsMob(
  ox: number, oy: number, dx: number, dy: number, range: number, mob: WorldMob,
): { hit: boolean; t: number } {
  const px = mob.worldX - ox, py = mob.worldY - oy;
  const t = px * dx + py * dy;                 // ışın üzerindeki izdüşüm
  if (t < 0 || t > range) return { hit: false, t };
  const perp = Math.abs(px * dy - py * dx);    // merkeze dik uzaklık
  return { hit: perp <= mob.combatRadius, t };
}

/** Oyuncudan hedefe doğru yayı çözer.
 *  - `firstMobAlongRay`: her ok yolundaki EN YAKIN canlı mobu tutar (yan isabet olur).
 *  - `targetOnly`: yalnız seçili hedefin combatRadius'u test edilir (yan isabet YOK). */
export function resolveMultiShot(
  originX: number, originY: number,
  aimX: number, aimY: number,
  profile: MultiShotProfile,
  mobs: WorldMob[],
  opts: ResolveOptions = {},
): MultiShotResolution {
  const mode = opts.collisionMode ?? profile.collisionMode;
  const target = opts.target ?? null;
  const alive = (m: WorldMob): boolean => m.ai !== 'dead' && m.state !== 'dying';
  /* targetOnly'de aday listesi yalnız seçili hedeftir; hedef yoksa (elle test)
     mob listesinin ilki referans alınmaz — hiç aday olmaz. */
  const candidates = mode === 'targetOnly'
    ? (target && alive(target) ? [target] : [])
    : mobs.filter(alive);

  const baseAngle = Math.atan2(aimY - originY, aimX - originX);
  const rays: ProjectileRay[] = [];

  for (let i = 0; i < profile.projectiles; i++) {
    const offset = (profile.anglesDeg[i] ?? 0) * Math.PI / 180;
    const a = baseAngle + offset;
    const dx = Math.cos(a), dy = Math.sin(a);
    let best: WorldMob | null = null, bestT = Infinity;
    for (const m of candidates) {
      const r = rayHitsMob(originX, originY, dx, dy, profile.rangeWorld, m);
      if (r.hit && r.t < bestT) { bestT = r.t; best = m; }
    }
    rays.push({
      index: i, angleDeg: profile.anglesDeg[i] ?? 0, dx, dy,
      originX, originY, range: profile.rangeWorld,
      hit: best, onTarget: best !== null && target !== null && best.uid === target.uid,
      travel: best ? bestT : profile.rangeWorld,
    });
  }
  const hits = rays.filter((r) => r.hit !== null);
  const targetHitCount = rays.filter((r) => r.onTarget).length;
  return {
    rays, hits,
    hitCount: hits.length,
    total: rays.length,
    totalProjectileCount: rays.length,
    targetHitCount,
    sideHitCount: hits.length - targetHitCount,
    collisionMode: mode,
  };
}
