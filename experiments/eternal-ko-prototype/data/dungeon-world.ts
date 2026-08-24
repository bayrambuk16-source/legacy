/** ZİNDAN DÜNYASI — AYRI KÜÇÜK HARİTA (P3.20)
 *
 *  ══════════════ NEDEN AYRI DÜNYA ══════════════
 *  Zindan bugüne dek Moradon'un dünya yapılandırmasını ödünç alıyordu:
 *  aynı çayır, aynı ağaçlar, aynı doğuş noktası. Kullanıcı kararı:
 *  zindan AYRI bir harita olsun. Büyük olması gerekmiyor — dalga modu
 *  oyuncunun ÇEVRESİNDE döner, geniş harita yalnız boş yürüyüş üretir.
 *
 *  ══════════════ TASARIM KARARLARI ══════════════
 *  · Arena 1440×1440: dalga doğuşları oyuncunun etrafında halka kurar;
 *    bu alan halkaya ve kaçış manevrasına yeter, gezmeye gerek bırakmaz.
 *  · Doğuş MERKEZDE: salon modelinin ortası. Dalgalar her yönden gelir.
 *  · Engel YOK, adım kapısı YALNIZ kenar payı: zindanda duvar labirenti
 *    değil savaş var. Görsel salon duvarları collision'a GİRMEZ (Moradon
 *    ağaçları gibi — görsel katman gameplay'e yazmaz, §26).
 *  · Ortam modeli (su-taş salon) SAF GÖRSELDİR: `DUNGEON_ENV` yalnız
 *    renderer tarafından okunur; hiçbir gameplay sistemi bunu görmez.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. */

import type { WorldConfig } from './world-map.js';

/** Arena sınırları. UZUN salon: dalga doğuş bandı oyuncunun 720-860
 *  birim KUZEYİNDE kurulur (`SPAWN_BAND_AHEAD/DEPTH`) — arena bu bandı
 *  İÇERİDE tutacak kadar derin olmak zorunda, yoksa moblar adım
 *  kapısının dışında doğar ve içeri giremez. */
export const DUNGEON_BOUNDS = { width: 1440, height: 2160 } as const;

/** Kenar payı — karakter arenanın dışına bu kadar yaklaşamaz.
 *  Kamera kenarında boşluk görünmesin diye sınırdan içeridedir. */
export const DUNGEON_EDGE_MARGIN = 80;

/** Doğuş: salonun güney yarısı. Kuzeyde dalga bandına (y≈700-840)
 *  yer kalır, güneyde geri çekilme payı vardır. */
export const DUNGEON_SPAWN = { x: 720, y: 1560 } as const;

/** Zindan adım kapısı: sınır payı içinde HER adım serbest.
 *  Moradon'un yürüme maskesi BURADA GEÇERSİZ — zindan düz bir arenadır. */
export function dungeonStepAllowed(
  _fx: number, _fy: number, tx: number, ty: number,
): boolean {
  return tx >= DUNGEON_EDGE_MARGIN
    && ty >= DUNGEON_EDGE_MARGIN
    && tx <= DUNGEON_BOUNDS.width - DUNGEON_EDGE_MARGIN
    && ty <= DUNGEON_BOUNDS.height - DUNGEON_EDGE_MARGIN;
}

export const DUNGEON_WORLD: WorldConfig = {
  bounds: { width: DUNGEON_BOUNDS.width, height: DUNGEON_BOUNDS.height },
  spawn: DUNGEON_SPAWN,
  obstacles: [],
  stepAllowed: dungeonStepAllowed,
};

/** ═══ ORTAM MODELİ YERLEŞİMİ (yalnız renderer okur) ═══
 *
 *  Kaynak salon yerel olarak ~24×48 birim (X×derinlik). Ölçek 30 ile
 *  ~720×1434 dünya birimine çıkar: arenayı boydan boya kaplar, oyuncu
 *  savaşı salonun İÇİNDE yaşar. Yükseklik ölçekle birlikte büyür; kamera
 *  kuşbakışına yakın olduğu için duvar yüksekliği oynanışı kapatmaz. */
export const DUNGEON_ENV = {
  modelKey: 'dungeon_env_glb',
  /** Salon merkezi ARENA merkezine oturur (doğuşa değil). */
  x: 720,
  y: DUNGEON_BOUNDS.height / 2,
  scale: 42,
  /** Uzun ekseni dünya Y'sine (ekran dikeyine) çevirir. */
  yawDeg: 0,
  /** Zemin/gök renkleri — zindan modunda renderer bunlara geçer. */
  groundColor: 0x2b2f33,
  backgroundColor: 0x101418,
} as const;
