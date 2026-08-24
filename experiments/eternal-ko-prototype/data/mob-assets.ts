/** MOB VARLIK KAYITLARI — P3.21
 *
 *  ══════════════ NEDEN TEK BİR KAYIT ══════════════
 *  P2.28'de ikinci model (goblin) gelince klip eşlemesi İKİ YOLLU bir
 *  dallanmaya dönüşmüştü: `02_WALK` varsa goblin, yoksa mutant. Beş
 *  model daha eklenince bu çöker — üç varlık `03_WALK`, biri `02_WALK`
 *  taşıyor, biri hiç yürüyemiyor.
 *
 *  Artık her varlık kendi kaydını taşır: klip adları, hızlar, boy ve
 *  yetenekler. Yeni bir model eklemek bu tabloya bir satır yazmaktır.
 *
 *  ══════════════ DEĞERLER ÖLÇÜLDÜ ══════════════
 *  Bütün sayılar varlık manifestlerinden gelir (`*_manifest.json`).
 *  Hız birimleri ZATEN dünya birimi/sn: manifest `world_units_per_metre`
 *  30,6 kullanıyor, bizim `WORLD_UNITS_PER_METER` ile aynı.
 *
 *  ══════════════ EKSİK KLİP UYDURULMAZ ══════════════
 *  Bir varlıkta yürüyüş yoksa `walk: null`; koşu yoksa yürüyüşe düşer.
 *  Sahte klip adı ÜRETİLMEZ; `clipFactOf` bulamazsa güvenli varsayılana
 *  düşer.
 *
 *  ══════════════ LİSANS ══════════════
 *  Beş varlık da CC-BY-4.0. Künye metinleri burada saklanır ve
 *  oyunda GÖRÜNÜR bir yerde gösterilmek zorundadır. Yükleyici ile
 *  gerçek yaratıcı FARKLI olabilir; doğrulama proje sahibindedir.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. */

import type { MobAiType } from './mob-ai-profiles.js';
import { WORLD_UNITS_PER_METER } from './archer-model.js';

/** Bir mob modelinin klip adları. `null` = o klip YOK. */
export interface MobClipNames {
  readonly idle: string;
  /** Nefes/oyalanma; yoksa `idle` kullanılır. */
  readonly idleLong: string | null;
  readonly walk: string | null;
  readonly run: string | null;
  /** Saldırı klipleri — birden çoksa vuruş anına en yakını seçilir. */
  readonly attacks: readonly string[];
  readonly death: string | null;
  readonly hitReact: string | null;
  /** Kükreme/uyanma; yoksa faz ATLANIR. */
  readonly roar: string | null;
}

export interface MobAssetRecord {
  /** `PROTO_ASSETS` anahtarı. */
  readonly assetKey: string;
  readonly displayName: string;
  /** Metre cinsinden doğal boy (manifest `height_m`). */
  readonly heightMeters: number;
  /** Manifest `speeds_world_units` — ZATEN dünya birimi/sn. */
  readonly walkSpeed: number | null;
  readonly runSpeed: number | null;
  readonly clips: MobClipNames;
  /** Kovalayabilir mi? `false` ise mob YERİNDE durur. */
  readonly canChase: boolean;
  readonly attribution: string;
}

/* ── klip adları manifestlerden birebir ── */

export const MOB_ASSETS: Readonly<Record<string, MobAssetRecord>> = {
  crab: {
    assetKey: 'crab_glb', displayName: 'Yengeç',
    heightMeters: 0.95, walkSpeed: 29.6, runSpeed: 50.2,
    clips: {
      idle: '01_IDLE', idleLong: '02_IDLE_FIDGET',
      walk: '03_WALK', run: '04_RUN',
      attacks: ['05_ATTACK_1'], death: '12_DEATH',
      hitReact: '11_HIT_REACT', roar: null,
    },
    canChase: true,
    attribution: 'Crab — CC-BY-4.0',
  },
  monsterx: {
    assetKey: 'monsterx_glb', displayName: 'Bataklık Avcısı',
    heightMeters: 1.15, walkSpeed: 14.5, runSpeed: 52.7,
    clips: {
      idle: '01_IDLE', idleLong: '02_IDLE_FIDGET',
      walk: '03_WALK', run: '04_RUN',
      attacks: ['05_ATTACK_1', '06_ATTACK_2'], death: '12_DEATH',
      hitReact: '11_HIT_REACT', roar: '10_SHOUT',
    },
    canChase: true,
    attribution: 'Monster X — CC-BY-4.0',
  },
  rhinobeast: {
    assetKey: 'rhinobeast_glb', displayName: 'Boynuzlu Dev',
    heightMeters: 2.6, walkSpeed: 35.7, runSpeed: 115.8,
    clips: {
      idle: '01_IDLE', idleLong: '02_IDLE_FIDGET',
      walk: '03_WALK', run: '04_RUN',
      attacks: ['05_ATTACK_1', '06_ATTACK_2', '07_ATTACK_3'], death: '12_DEATH',
      hitReact: '11_HIT_REACT', roar: '10_SHOUT',
    },
    canChase: true,
    attribution: 'Rhino Beast — CC-BY-4.0',
  },
  spikebeast: {
    assetKey: 'spikebeast_glb', displayName: 'Dikenli Canavar',
    heightMeters: 1.6, walkSpeed: 29.1, runSpeed: 132.4,
    clips: {
      idle: '01_IDLE', idleLong: null,
      walk: '03_WALK', run: '04_RUN',
      attacks: ['05_ATTACK_1'], death: '12_DEATH',
      hitReact: null, roar: null,
    },
    canChase: true,
    attribution: 'Spike Beast — CC-BY-4.0',
  },
  /* ═══ P3.27 — YENİ GOBLİN ═══
     Gövde spec'e üretildi, İSKELET VE ON KLİBİN TAMAMI monsterx'ten
     geliyor. Klip adları bu yüzden monsterx ile BİREBİR AYNI —
     `assetForClips` ikisini ayırt EDEMEZ. Bu sorun değil: klip
     tabloları da aynı, hangisine çözülürse çözülsün doğru süre ve
     hız gelir. Model seçimi zaten `assetForLevel` ile yapılır.

     YÜRÜYÜŞ AYAK KAYMASI %30,7 (referans %8,7) — otomatik rig'in
     bilinen zayıflığı. Koşusu ise %0,5 ile kusursuz. Bu yüzden
     kovalamada koşu kullanılır (`pickLocomotion` zaten oranı 1'e
     yakın tutanı seçiyor: 90,8 birim/sn → 75 için 0,83×). */
  goblin: {
    assetKey: 'goblin_glb', displayName: 'Goblin',
    heightMeters: 0.923, walkSpeed: 20.5, runSpeed: 90.8,
    clips: {
      idle: '01_IDLE', idleLong: '02_IDLE_FIDGET',
      walk: '03_WALK', run: '04_RUN',
      attacks: ['05_ATTACK_1', '06_ATTACK_2'], death: '12_DEATH',
      hitReact: '11_HIT_REACT', roar: '10_SHOUT',
    },
    canChase: true,
    /* Lisans ZİNCİRİ iki parçalı: gövde yeni, ama iskelet ve bütün
       klipler Monsters X varlığından. Gövdeyi değiştirmek CC-BY
       yükümlülüğünü kaldırmaz. */
    attribution: 'Goblin (rig: Monsters X) — CC-BY-4.0',
  },
  lavaspider: {
    assetKey: 'lavaspider_glb', displayName: 'Lav Örümceği',
    heightMeters: 1.3, walkSpeed: null, runSpeed: null,
    clips: {
      idle: '01_IDLE', idleLong: null,
      walk: null, run: null,
      attacks: ['05_ATTACK_1'], death: '12_DEATH',
      hitReact: null, roar: '90_ALERT_RISE',
    },
    /* Yürüyüş klibi YOK — kovalayamaz. Kullanıcı kararı: açık dünyada
       İLK SEVİYE yaratığı olarak, yerinde duran bir düşman. */
    canChase: false,
    attribution: 'Lava Spider — CC-BY-4.0',
  },
};

/** Klip adından varlığı bulur. `MobRig` model adı bilmez; elindeki
 *  klip listesini verir, kayıt buradan çözülür.
 *
 *  Eşleşme SAĞLAM olmalı: iki varlık aynı klip adlarını taşıyorsa
 *  (örneğin ikisi de `03_WALK`) ölüm klibi ayırt eder. */
export function assetForClips(available: readonly string[]): MobAssetRecord | null {
  const set = new Set(available);
  let best: MobAssetRecord | null = null;
  let bestScore = 0;
  for (const rec of Object.values(MOB_ASSETS)) {
    const names = [
      rec.clips.idle, rec.clips.idleLong, rec.clips.walk, rec.clips.run,
      ...rec.clips.attacks, rec.clips.death, rec.clips.hitReact, rec.clips.roar,
    ].filter((n): n is string => n !== null);
    /* Kaydın BÜTÜN klipleri mevcut olmalı; fazlası sorun değil. */
    if (!names.every((n) => set.has(n))) continue;
    if (names.length > bestScore) { bestScore = names.length; best = rec; }
  }
  return best;
}

/** Oynatma oranı: klip doğal hızından farklı bir hızda kullanılacaksa
 *  ayak kaymasın diye zaman ölçeği de değişmeli.
 *
 *      oran = hedefHız / klipDoğalHızı
 *
 *  Aşırı oran bozuk görünür (Monster X yürüyüşüyle 75'e çıkmak 5,03×
 *  gerektiriyor). Bu yüzden oran KIRPILIR ve çağıran koşuya düşer. */
export const MIN_PLAYBACK_RATE = 0.5;
export const MAX_PLAYBACK_RATE = 2.0;

export function playbackRate(targetSpeed: number, clipSpeed: number | null): number {
  if (clipSpeed === null || clipSpeed <= 0) return 1;
  const r = targetSpeed / clipSpeed;
  return Math.max(MIN_PLAYBACK_RATE, Math.min(MAX_PLAYBACK_RATE, r));
}

/** Hedef hız için HANGİ klip kullanılmalı: yürüyüş mü koşu mu?
 *
 *  Oranı `[0,5 · 2,0]` aralığına en yakın tutan klip seçilir. Böylece
 *  Monster X 75'te KOŞUYU (1,39×), gergedan da KOŞUYU (0,65×) kullanır;
 *  yürüyüşle zorlanmaz. */
export function pickLocomotion(
  rec: MobAssetRecord, targetSpeed: number,
): { clip: string | null; rate: number } {
  const options: Array<{ clip: string | null; speed: number | null }> = [
    { clip: rec.clips.run, speed: rec.runSpeed },
    { clip: rec.clips.walk, speed: rec.walkSpeed },
  ].filter((o) => o.clip !== null && o.speed !== null && o.speed > 0);
  if (options.length === 0) return { clip: rec.clips.walk ?? rec.clips.idle, rate: 1 };
  let best = options[0]!;
  let bestErr = Infinity;
  for (const o of options) {
    const raw = targetSpeed / (o.speed ?? 1);
    /* 1'e ne kadar yakınsa o kadar iyi — logaritmik uzaklık, 0,5× ile
       2× simetrik cezalansın. */
    const err = Math.abs(Math.log(raw));
    if (err < bestErr) { bestErr = err; best = o; }
  }
  return { clip: best.clip, rate: playbackRate(targetSpeed, best.speed) };
}

/** AI tipine göre dünya birimi yükseklik — silüet hiyerarşisi korunur. */
export const MOB_HEIGHT_WORLD: Readonly<Record<MobAiType, number>> = {
  NORMAL: 40, AGGRESSIVE: 48, ELITE: 64,
};

export function assetScaleFor(rec: MobAssetRecord, type: MobAiType): number {
  const natural = rec.heightMeters * WORLD_UNITS_PER_METER;
  return (MOB_HEIGHT_WORLD[type] / natural) * WORLD_UNITS_PER_METER;
}

/** Bütün künyeler — künye ekranı bunu okur. */
export function allAttributions(): string[] {
  return Object.values(MOB_ASSETS).map((r) => r.attribution);
}

/* ═══════════════ HANGİ MOB HANGİ MODEL ═══════════════
 *
 *  Kullanıcı kararı: lav örümceği AÇIK DÜNYADA ilk seviye yaratığı,
 *  yürüyen dört varlık zindanda da görünsün. Kalan dağıtım bana
 *  bırakıldı.
 *
 *  Dağıtım ölçütü SİLÜET AYRIMI: her seviye bandı bir öncekinden
 *  gözle ayrılsın. Boy sırası kendiliğinden bir merdiven veriyor —
 *  yengeç 0,95 m · Monster X 1,15 · lav örümceği 1,3 · dikenli 1,6 ·
 *  gergedan 2,6.
 *
 *  Goblin ve mutant KORUNUR: onlar Sv1-10 ve Sv11+ bandını taşıyordu,
 *  yeni varlıklar aralara girer. */
export interface ModelBand {
  readonly minLevel: number;
  readonly maxLevel: number;
  /** `MOB_ASSETS` anahtarı; `null` → eski davranış (goblin/mutant). */
  readonly asset: string | null;
}

export const MODEL_BANDS: readonly ModelBand[] = [
  /* Sv1-2 — açık dünyanın ilk yaratığı. Yerinde durur; oyuncu ona
     gider. Kullanıcı kararı. */
  { minLevel: 1, maxLevel: 2, asset: 'lavaspider' },
  /* ═══ P3.27 — GOBLİN İLK İNSANSI DÜŞMAN ═══
     Kecoon goblini (P2.28) bu bandı taşıyordu; yeni goblin onun
     yerine geçer ve Sv3'e çekildi.

     İki sebep: (1) boyu 0,923 m, yengeçten (0,95) KISA — merdivenin
     başında durması gerekiyor, yoksa sıra kırılır. (2) On klibi var
     (yengeçte sekiz): tepki, kükreme, iki saldırı. Oyuncunun en çok
     vakit geçirdiği bant en zengin animasyonu hak ediyor.

     Kecoon goblini SİLİNMEDİ: model yüklenemezse eski ikiliye düşüş
     hâlâ oradan geçiyor. */
  { minLevel: 3, maxLevel: 8, asset: 'goblin' },
  /* Sv9-16 — yengeç. Kabuklu silüet insansıdan sonra belirgin fark. */
  { minLevel: 9, maxLevel: 16, asset: 'crab' },
  /* Sv17-20 — bataklık bandı. Orta boy, iki saldırı klibi. */
  { minLevel: 17, maxLevel: 20, asset: 'monsterx' },
  /* Sv21-32 — dikenli. Koşusu çok hızlı (132 birim/sn), oynatma
     oranıyla dizginlenir. */
  { minLevel: 21, maxLevel: 32, asset: 'spikebeast' },
  /* Sv33-50 — en büyük silüet, üç saldırı klibi. Üst bandın ağırlığı. */
  { minLevel: 33, maxLevel: 50, asset: 'rhinobeast' },
];

/** Bir mob seviyesinin modeli. Bant bulunamazsa `null` — çağıran
 *  mevcut goblin/mutant yoluna düşer, mob görünmez kalmaz. */
export function assetForLevel(monsterLevel: number): MobAssetRecord | null {
  for (const b of MODEL_BANDS) {
    if (monsterLevel >= b.minLevel && monsterLevel <= b.maxLevel) {
      return b.asset === null ? null : (MOB_ASSETS[b.asset] ?? null);
    }
  }
  return null;
}

/** Zindanda KOVALAYAMAYAN model kullanılamaz: dalga oyuncuya gelmek
 *  zorunda. Lav örümceği yalnız açık dünyada görünür.
 *
 *  Kovalayamayan bir bant zindanda bir SONRAKİ kovalayabilen banda
 *  düşer — mob görünmez kalmaz, yalnız görseli değişir. */
export function dungeonAssetForLevel(monsterLevel: number): MobAssetRecord | null {
  const direct = assetForLevel(monsterLevel);
  if (direct && direct.canChase) return direct;
  for (const b of MODEL_BANDS) {
    if (b.minLevel <= monsterLevel) continue;
    const rec = b.asset === null ? null : MOB_ASSETS[b.asset];
    if (rec && rec.canChase) return rec;
  }
  return null;
}
