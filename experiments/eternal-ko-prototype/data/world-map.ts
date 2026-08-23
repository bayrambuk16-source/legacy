/** AKTİF DÜNYA — P2.4C
 *
 *  ══════════════ HARİTA ANAHTARI ══════════════
 *  P2.4C'de aktif harita MORADON'dur. P1.6'dan gelen geçici test dünyası
 *  SİLİNMEDİ; `ACTIVE_MAP` anahtarının arkasında `TEST_*` adlarıyla durur ve
 *  tek satır değiştirilerek geri alınabilir.
 *
 *  ══════════════ ENGEL AUTHORITY'Sİ DEĞİŞTİ ══════════════
 *  Test dünyasında engel = dairesel `OBSTACLES` listesi. Moradon'da engel =
 *  `data/moradon-walkmask.ts` hücre maskesi (collision mesh'ten offline
 *  üretildi). Moradon modunda `OBSTACLES` BOŞTUR — iki engel sistemi AYNI ANDA
 *  çalışmaz, yoksa hangisinin authority olduğu belirsizleşir.
 *
 *  ══════════════ TEK ADIM KAPISI ══════════════
 *  Hem oyuncu hem mob `worldStepAllowed()` üzerinden geçer. Bu fonksiyon
 *  Moradon'da `canTraverse()`ye (supercover, endpoint-only DEĞİL), test
 *  dünyasında sabit `true`ya çözülür. */
import type { Obstacle, WorldBounds } from '../world/types.js';
import { MORADON_WORLD_BOUNDS, MORADON_WORLD_SPAWN } from './moradon-coords.js';
import { canTraverse, isInsidePlayableArea } from './moradon-walkmask.js';

/** Aktif harita. 'test' yapılırsa P1.6 dünyası aynen geri gelir. */
export const ACTIVE_MAP: 'moradon' | 'test' = 'moradon';

/** MORADON ENGELLERİ AÇIK MI?
 *
 *  ══════════════ ŞU AN KAPALI — BİLİNÇLİ GEÇİCİ KARAR ══════════════
 *  Collision maskesi Moradon'un binalarını, surlarını, kayalarını ve
 *  heykellerini doğru biçimde engelliyor. Ama sunucu haritasında bu
 *  nesnelerin GÖRSEL MODELLERİ YOK: oyuncu görmediği bir şeye çarpıyor.
 *  "Görünmeyen duvar" hissi, engelin doğru olmasından daha kötü.
 *
 *  Bu yüzden collision kaynaklı engelleme KAPATILDI. Maske verisi, üretim
 *  scripti, `canTraverse()` supercover kontrolü ve bütün testleri YERİNDE
 *  DURUYOR — tek satır `true` yapılınca aynen geri gelir. Görsel nesneler
 *  (ya da DEV tel kafes katmanı) geldiğinde açılacak.
 *
 *  KAPALI OLSA BİLE oynanabilir dikdörtgen sınırı UYGULANIR: kaynak
 *  heightmap'in dejenere kenar şeridi (uçurum) yürünebilir OLMAZ. */
export const MORADON_COLLISION_ACTIVE = false;

/* ───────────────────────── P1.6 TEST DÜNYASI (arşiv) ───────────────────────── */

export const TEST_WORLD_BOUNDS: WorldBounds = { width: 2480, height: 3300 };

/** Test dünyasında oyuncunun doğduğu nokta. */
export const TEST_SPAWN_POINT = { x: 1240, y: 1650 };

/** Yol/açıklık şeridi — yalnız görsel; çarpışma yok. */
export const TEST_ROADS: Array<{ x: number; y: number; w: number; h: number }> = [
  { x: 1140, y: 300, w: 200, h: 2700 },     // dikey ana yol
  { x: 500, y: 1560, w: 1500, h: 180 },     // yatay bağlantı
  { x: 420, y: 700, w: 760, h: 160 },       // kurt çukuruna sapak
  { x: 1240, y: 2120, w: 800, h: 170 },     // bataklığa sapak
];

/** Basit dairesel engeller. Deterministik (rastgele değil) — testler tekrar üretilebilir. */
function grove(cx: number, cy: number, count: number, spread: number, seed: number): Obstacle[] {
  const out: Obstacle[] = [];
  let s = seed;
  const rand = (): number => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = spread * (0.35 + rand() * 0.65);
    out.push({
      x: Math.round(cx + Math.cos(a) * r),
      y: Math.round(cy + Math.sin(a) * r),
      radius: 34 + Math.round(rand() * 22),
      kind: rand() > 0.72 ? 'rock' : 'tree',
    });
  }
  return out;
}

export const TEST_OBSTACLES: Obstacle[] = [
  ...grove(420, 380, 9, 320, 11),
  ...grove(1900, 620, 10, 380, 23),
  ...grove(360, 2100, 11, 420, 37),
  ...grove(2050, 1500, 8, 300, 53),
  ...grove(900, 2700, 10, 380, 71),
  // yolu daraltan birkaç belirgin kaya (geçilemez engel testi)
  { x: 1240, y: 1180, radius: 70, kind: 'rock' },
  { x: 1060, y: 2000, radius: 60, kind: 'rock' },
  { x: 1500, y: 1450, radius: 66, kind: 'rock' },
];

/* ───────────────────────── AKTİF SEÇİM ───────────────────────── */

/** Aktif dünya sınırları. */
export const WORLD_BOUNDS: WorldBounds =
  ACTIVE_MAP === 'moradon'
    ? { width: MORADON_WORLD_BOUNDS.width, height: MORADON_WORLD_BOUNDS.height }
    : TEST_WORLD_BOUNDS;

/** Aktif doğuş noktası.
 *  Moradon'da KAYNAK: `start_positions` zone 21 → KO 306/352 → world 1530/1760.
 *  Bu KAPANMIŞ bir karardır; `regene0` ilk doğuş adayı DEĞİLDİR (P2.4D). */
export const SPAWN_POINT =
  ACTIVE_MAP === 'moradon'
    ? { x: MORADON_WORLD_SPAWN.x, y: MORADON_WORLD_SPAWN.y }
    : TEST_SPAWN_POINT;

/** Aktif dairesel engeller. Moradon'da BOŞ — engel authority'si maskededir. */
export const OBSTACLES: Obstacle[] = ACTIVE_MAP === 'moradon' ? [] : TEST_OBSTACLES;

/** Aktif yollar (yalnız görsel). */
export const ROADS: Array<{ x: number; y: number; w: number; h: number }> =
  ACTIVE_MAP === 'moradon' ? [] : TEST_ROADS;

/** Tek bir dünya yapılandırması — sınır, doğuş ve adım kapısı BİR ARADA.
 *  P2.4C: `PrototypeState` bunu enjekte alabilir. Amaç, P1.6'dan gelen
 *  hareket/Genie testlerinin (mesafe ölçümü, roam/leash senaryoları) TEST
 *  DÜNYASI üzerinde koşabilmesidir — görev tanımı §4'ün son maddesi. Canlı
 *  oyun her zaman `ACTIVE_WORLD`u kullanır; varsayılan DEĞİŞMEZ. */
export interface WorldConfig {
  readonly bounds: WorldBounds;
  readonly spawn: { readonly x: number; readonly y: number };
  readonly obstacles: Obstacle[];
  readonly stepAllowed: (fx: number, fy: number, tx: number, ty: number) => boolean;
}

/** ADIM KAPISI — oyuncu ve mob AYNI yoldan geçer.
 *
 *  Kontrol ENDPOINT-ONLY DEĞİLDİR: `from → to` doğru parçasının değdiği BÜTÜN
 *  maske hücreleri denetlenir. Düşük FPS ya da büyük `dt` durumunda karakterin
 *  ince bir duvarın öbür yanına atlamasını bu engeller. */
export function worldStepAllowed(
  fromX: number, fromY: number, toX: number, toY: number,
): boolean {
  if (ACTIVE_MAP !== 'moradon') return true;
  /* Engeller kapalıyken yalnız dünya kenarı korunur (bkz.
     `MORADON_COLLISION_ACTIVE`). Supercover kontrolü tamamen atlanır —
     yarım açık bir kapı bırakılmaz. */
  if (!MORADON_COLLISION_ACTIVE) return isInsidePlayableArea(toX, toY);
  return canTraverse(fromX, fromY, toX, toY);
}

/** Canlı oyunun dünyası — harita anahtarının çözdüğü yapılandırma. */
export const ACTIVE_WORLD: WorldConfig = {
  bounds: WORLD_BOUNDS,
  spawn: SPAWN_POINT,
  obstacles: OBSTACLES,
  stepAllowed: worldStepAllowed,
};

/** P1.6 test dünyası — YALNIZ test/telemetri içindir. Yürünebilirlik maskesi
 *  YOKTUR (o dünyanın engelleri dairesel listedir), bu yüzden adım kapısı
 *  serbesttir. Canlı oyun bunu KULLANMAZ. */
export const TEST_WORLD: WorldConfig = {
  bounds: TEST_WORLD_BOUNDS,
  spawn: TEST_SPAWN_POINT,
  obstacles: TEST_OBSTACLES,
  stepAllowed: () => true,
};
