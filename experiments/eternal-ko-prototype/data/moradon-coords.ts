/** MORADON KOORDİNAT TEMELİ — P2.4A (P2.4C'de DOĞRULANDI)
 *
 *  ══════════════ BU MODÜL NE YAPAR ══════════════
 *  Tek bir iş yapar: **KO Moradon koordinatını Project Legacy world
 *  koordinatına çevirir.** Terrain yükleme YOK · gerçek Moradon spawnları YOK ·
 *  MobSlotSystem V2 YOK · UI değişikliği YOK · combat tuning YOK.
 *
 *  ══════════════ AKTİF HARİTA DEĞİŞMEDİ ══════════════
 *  `data/world-map.ts` içindeki geçici test dünyası (`WORLD_BOUNDS` 2480×3300,
 *  `SPAWN_POINT` 1240/1650, `ROADS`, `OBSTACLES`) AYNEN çalışmaya devam eder.
 *  Buradaki `MORADON_WORLD_BOUNDS` / `MORADON_WORLD_SPAWN` ileride
 *  kullanılmak üzere HAZIR ve TESTLİ durur; harita anahtarı sonraki görevde
 *  atılacak. Bu dosya hiçbir gameplay sistemine bağlanmaz.
 *
 *  ══════════════ BU DOSYA THREE İMPORT ETMEZ ══════════════
 *  Saf matematiktir: renderer'a bağlı değildir, yan etki üretmez,
 *  deterministiktir.
 *
 *  ══════════════ KAYNAK DOĞRULAMASI ══════════════
 *  `reference/KO_Reference_v8.db` üzerinde doğrudan sorgulandı:
 *
 *    · `zones` → zone_no 21 · zone_file `moradon_0826.smd` · zone_name
 *      "Moradon"                                          → KAYNAK DOĞRULANDI
 *    · `start_positions` → zone_id 21 · karus_x 306 · karus_z 352
 *      (elmorad_x/z de aynı, extraction_confidence "high") → KAYNAK DOĞRULANDI
 *
 *  **512×512 — P2.4C'DE KAYNAKTAN DOĞRULANDI.** Daha önce yalnız tutarlılık
 *  vardı (DB'de harita boyutu kolonu yok). P2.4C'de `moradon_0826.smd`
 *  çıkarımı okundu: `grid_size` 129 · `unit_distance` 4,0 → 128 × 4 = 512.
 *  Değer artık VARSAYIM DEĞİL, kaynağın kendi başlığındandır.
 *
 *  ══════════════ NOT: `zones.init_x/init_z` BURADA KULLANILMAZ ══════════════
 *  Zone 21 kaydında `init_x = 31200`, `init_z = 40200` vardır. Bu değerler
 *  BAŞKA bir koordinat uzayındadır (sunucu ölçeği) ve `start_positions`'ın
 *  306/352 değerlerinin katı DEĞİLDİR (31200/306 ≈ 102, 40200/352 ≈ 114).
 *  İkisi farklı noktalardır; bu modül YALNIZ `start_positions` uzayını
 *  (0..512 ızgara) kullanır. Karıştırılmamalıdır. */

/* ───────────────────────────── kaynak gerçekler ───────────────────────────── */

/** KO zone numarası. KAYNAK: `zones.zone_no`. */
export const MORADON_ZONE_ID = 21;

/** Kanonik harita dosyası. KAYNAK: `zones.zone_file`. */
export const MORADON_MAP_FILE = 'moradon_0826.smd';

/** KO ızgara genişliği/yüksekliği. Kullanıcı tarafından verildi; zone 21
 *  spawn verisiyle tutarlı (yukarıdaki nota bakın). */
export const MORADON_SOURCE_WIDTH = 512;
export const MORADON_SOURCE_HEIGHT = 512;

/** Moradon başlangıç noktası, KO ızgara koordinatı.
 *  KAYNAK: `start_positions` zone_id 21 → karus_x 306 / karus_z 352. */
export const MORADON_KO_SPAWN = { x: 306, z: 352 } as const;

/* ───────────────────────────── ölçek kararı ───────────────────────────── */

/** KO ızgara birimi → Project Legacy world birimi çarpanı.
 *
 *  PROJECT LEGACY KARARI — kaynaktan gelmez. P2.4A'da kanonik değer 5'tir.
 *  Ofset YOK · rotasyon YOK · eksen ters çevirme YOK; dönüşüm yalnız çarpımdır.
 *
 *  ══════════════ DİKEYDE DE GEÇERLİDİR (P2.4C) ══════════════
 *  Terrain GLB'si üç eksende birden ×5 ölçeklidir (kaynak yükseklik aralığı
 *  −47,26..18,75 → world −236,31..93,73; sapma bit düzeyinde 0). Yani bu
 *  çarpan YALNIZ yatay düzlemin değil, YÜKSEKLİĞİN de dönüşümüdür. Oranlar
 *  korunur; eğimler kaynaktakiyle aynı açıdadır.
 *
 *  ══════════════ EKSEN YÖNÜ DOĞRULANDI (P2.4C) ══════════════
 *  Çıkarım paketinin README'si Z ekseninin ters çevrilmesi gerekip
 *  gerekmediğini AÇIK bırakmıştı. P2.4C'de landmark ile kapatıldı: collision
 *  mesh'i terrain üstüne bindirildiğinde sur/kule/bina ayak izleri araziyle
 *  hizalı çıkıyor ve `start_positions` (306/352) sur halkasının İÇİNE,
 *  şehir tile bölgesiyle örtüşerek düşüyor. FLIP YOKTUR. */
export const KO_TO_WORLD_SCALE = 5;

export const MORADON_WORLD_WIDTH = MORADON_SOURCE_WIDTH * KO_TO_WORLD_SCALE;
export const MORADON_WORLD_HEIGHT = MORADON_SOURCE_HEIGHT * KO_TO_WORLD_SCALE;

/* ───────────────────────────── dönüşüm ───────────────────────────── */

/** Dönüşüm sonucu. `x` → `worldX`, `y` → `worldY` karşılığıdır.
 *  (KO'nun **Z** ekseni Project Legacy'nin **worldY**'sine gider — dünya
 *  düzlemi yataydır, KO'nun dikey ekseni bu köprüde KULLANILMAZ.) */
export interface WorldPoint { x: number; y: number }

/** KO Moradon ızgara koordinatı → Project Legacy world koordinatı.
 *
 *      worldX = koX * KO_TO_WORLD_SCALE
 *      worldY = koZ * KO_TO_WORLD_SCALE
 *
 *  Saf fonksiyondur: yan etki yok, gameplay'e dokunmaz, deterministiktir. */
export function koToWorld(koX: number, koZ: number): WorldPoint {
  return { x: koX * KO_TO_WORLD_SCALE, y: koZ * KO_TO_WORLD_SCALE };
}

/** Ters dönüşüm — world → KO ızgarası.
 *
 *  Neden var: Moradon spawn dikdörtgenleri kaynakta KO ızgarasında yazılıdır
 *  (`npc_positions.left_x/top_z/right_x/bottom_z`). İleride bir world noktasını
 *  o dikdörtgenlerle karşılaştırmak ya da telemetride "şu an KO'da neredeyim"
 *  demek gerekecek. Ölçek 5 olduğu için tam sayı katlarında gidiş-dönüş
 *  BİREBİRDİR (testli). */
export function worldToKo(worldX: number, worldY: number): { x: number; z: number } {
  return { x: worldX / KO_TO_WORLD_SCALE, z: worldY / KO_TO_WORLD_SCALE };
}

/* ───────────────────── ileride kullanılacak hazır değerler ───────────────────── */

/** Moradon'un Project Legacy mantıksal world sınırları.
 *  HENÜZ BAĞLANMADI — aktif `WORLD_BOUNDS` değişmedi. */
export const MORADON_WORLD_BOUNDS = {
  width: MORADON_WORLD_WIDTH,
  height: MORADON_WORLD_HEIGHT,
} as const;

/** Moradon başlangıç noktasının world karşılığı → (1530, 1760).
 *  HENÜZ BAĞLANMADI — aktif `SPAWN_POINT` değişmedi. */
export const MORADON_WORLD_SPAWN: WorldPoint =
  koToWorld(MORADON_KO_SPAWN.x, MORADON_KO_SPAWN.z);
