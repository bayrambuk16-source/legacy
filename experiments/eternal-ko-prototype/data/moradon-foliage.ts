/** MORADON BİTKİ ÖRTÜSÜ — TOHUMLU YERLEŞİM (P2.11)
 *
 *  ══════════════ BU DOSYA NE YAPAR ══════════════
 *  Haritaya serpiştirilecek ağaç/çalı/ot/kaya konumlarını üretir. Model
 *  yükleme ve çizim BURADA DEĞİLDİR (renderer), gameplay etkisi YOKTUR.
 *
 *  ══════════════ SAF ══════════════
 *  three yok, canvas yok, `Math.random()` YOK. Tohum sabit olduğu için
 *  yerleşim her derlemede AYNIDIR — test edilebilir, ama gözle bakınca
 *  düzensizdir (ızgara hissi yok).
 *
 *  ══════════════ BİTKİLER DEKORDUR, ENGEL DEĞİL ══════════════
 *  Collision'a girmezler. Sebep: Genie'nin yol bulma sistemi yok; ağaç
 *  engel olsaydı otomatik farm sırasında takılıp kalırdı. İleride yol
 *  bulma gelirse gövdeler engele çevrilebilir.
 *
 *  ══════════════ YERLEŞİM KURALLARI ══════════════
 *  1. Yalnız YÜRÜNEBİLİR hücreler — bina içinde bitki olmaz. Engeller
 *     şu an kapalı olsa bile bu kural korunur (duvarlar geri açılınca
 *     ağaç duvarın içinde kalmasın).
 *  2. Doğuş meydanı boş: `SPAWN_CLEAR` yarıçapında hiçbir şey yok.
 *  3. Mob slotlarının içine ve 40 birim çevresine BÜYÜK bitki konmaz —
 *     savaş sırasında görüşü kapatmasın. Ot ve çiçek girebilir.
 *  4. Nesneler arası en az mesafe var; büyük bitkiler daha seyrek.
 *
 *  ══════════════ P2.33 — SAYILAR YİNE SABİT ══════════════
 *  Slot sayısı 33'ten 52'ye çıktı ama BİTKİ SAYISI DEĞİŞMEDİ
 *  (kullanıcı kararı: "mevcut bitki sayısını artırma, haritada
 *  orantılı şekilde yay"). 860 nesne aynı 5120×5120'ye yayılmaya
 *  devam eder; tohum sabit olduğu için dağılım da aynıdır.
 *
 *  ══════════════ P2.12 — SAYILAR SABİT, ARALIK AÇILDI ══════════════
 *  Oyun testinde bitkiler "ekranı kaplıyor" bulundu. Harita ölçeği iki
 *  katına çıkınca (alan dört katı) aynı 860 nesne kendiliğinden dörtte
 *  bir yoğunluğa indi. NESNE SAYILARI DEĞİŞMEDİ (kullanıcı kararı);
 *  yalnız en az aralıklar ~1,8 katına çıkarıldı ki büyük alanda
 *  kümelenme olmasın ve dağılım gerçekten yayılsın. */

import { MORADON_FARM_SLOTS, MORADON_PLAY_SPAWN, SLOT_RECT } from './moradon-farm-slots.js';
import { MORADON_PLAYABLE_RECT, isWalkable } from './moradon-walkmask.js';

/** Doğuş çevresinde bitkisiz yarıçap (kale meydanı). */
export const SPAWN_CLEAR = 360;

/** Slot dikdörtgeninin çevresinde büyük bitki yasağı payı. */
export const SLOT_MARGIN = 80;

export type FoliageKind = 'agac' | 'cam' | 'olu_agac' | 'cali' | 'ot' | 'cicek' | 'kaya';

export interface FoliageItem {
  readonly kind: FoliageKind;
  readonly x: number;
  readonly y: number;
  /** Y ekseni etrafında dönüş (radyan) — hepsi aynı yöne bakmasın. */
  readonly rotation: number;
  /** Ölçek çarpanı — aynı model farklı boyutlarda görünsün. */
  readonly scale: number;
}

interface KindSpec {
  readonly kind: FoliageKind;
  readonly count: number;
  /** Bu türden iki nesne arası en az mesafe. */
  readonly spacing: number;
  /** Büyük bitki mi? (slot içine girmez) */
  readonly large: boolean;
  readonly scaleMin: number;
  readonly scaleMax: number;
}

/** Tür başına hedef sayı ve kurallar — PROJECT LEGACY TUNING.
 *  SIRA ÖNEMLİ: büyükler önce yerleşir, küçükler kalan boşluğu doldurur.
 *  Ters sırada kayalara yer kalmıyordu (plan denemesinde 120 yerine 19
 *  kaya yerleşmişti). */
const SPECS: readonly KindSpec[] = [
  { kind: 'agac', count: 110, spacing: 170, large: true, scaleMin: 0.85, scaleMax: 1.35 },
  { kind: 'cam', count: 80, spacing: 170, large: true, scaleMin: 0.9, scaleMax: 1.4 },
  { kind: 'olu_agac', count: 60, spacing: 170, large: true, scaleMin: 0.8, scaleMax: 1.2 },
  { kind: 'kaya', count: 120, spacing: 125, large: true, scaleMin: 0.7, scaleMax: 1.6 },
  { kind: 'cali', count: 140, spacing: 100, large: false, scaleMin: 0.8, scaleMax: 1.3 },
  { kind: 'cicek', count: 90, spacing: 72, large: false, scaleMin: 0.9, scaleMax: 1.4 },
  { kind: 'ot', count: 260, spacing: 68, large: false, scaleMin: 0.8, scaleMax: 1.5 },
];

/** Tohumlu doğrusal üreteç — `Math.random()` KULLANILMAZ. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Yerleşim tohumu. Değiştirilirse bütün harita yeniden dizilir. */
export const FOLIAGE_SEED = 20260824;

function insideSlotArea(x: number, y: number): boolean {
  for (const s of MORADON_FARM_SLOTS) {
    const minX = s.homeX - SLOT_RECT / 2 - SLOT_MARGIN;
    const maxX = s.homeX + SLOT_RECT / 2 + SLOT_MARGIN;
    const minY = s.homeY - SLOT_RECT / 2 - SLOT_MARGIN;
    const maxY = s.homeY + SLOT_RECT / 2 + SLOT_MARGIN;
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) return true;
  }
  return false;
}

/** Bitki örtüsünü üretir. Deterministiktir: aynı tohum → aynı liste. */
export function buildFoliage(seed: number = FOLIAGE_SEED): FoliageItem[] {
  const rng = makeRng(seed);
  const out: FoliageItem[] = [];
  const R = MORADON_PLAYABLE_RECT;

  for (const spec of SPECS) {
    let placed = 0;
    let tries = 0;
    const maxTries = spec.count * 120;
    while (placed < spec.count && tries < maxTries) {
      tries += 1;
      const x = R.minX + rng() * (R.maxX - R.minX);
      const y = R.minY + rng() * (R.maxY - R.minY);
      if (!isWalkable(x, y)) continue;
      const dx = x - MORADON_PLAY_SPAWN.x;
      const dy = y - MORADON_PLAY_SPAWN.y;
      if (dx * dx + dy * dy < SPAWN_CLEAR * SPAWN_CLEAR) continue;
      if (spec.large && insideSlotArea(x, y)) continue;
      let clash = false;
      for (const o of out) {
        const ox = o.x - x, oy = o.y - y;
        const min = Math.max(spec.spacing, 55);
        if (ox * ox + oy * oy < min * min) { clash = true; break; }
      }
      if (clash) continue;
      out.push({
        kind: spec.kind, x, y,
        rotation: rng() * Math.PI * 2,
        scale: spec.scaleMin + rng() * (spec.scaleMax - spec.scaleMin),
      });
      placed += 1;
    }
  }
  return out;
}

/** Tür → manifest anahtarı. */
export const FOLIAGE_MODEL_KEY: Readonly<Record<FoliageKind, string>> = {
  agac: 'nature_agac',
  cam: 'nature_cam',
  olu_agac: 'nature_olu_agac',
  cali: 'nature_cali',
  ot: 'nature_ot',
  cicek: 'nature_cicek',
  kaya: 'nature_kaya',
};

/** Modelin dünya birimindeki taban ölçeği (kaynak modeller ~1 birim yüksek,
 *  bizim dünyamız 5 birim = 1 KO birimi). PROJECT LEGACY TUNING. */
export const FOLIAGE_BASE_SCALE: Readonly<Record<FoliageKind, number>> = {
  agac: 34, cam: 34, olu_agac: 30, cali: 14, ot: 9, cicek: 7, kaya: 12,
};

/** Kameradan bu mesafeden uzaktaki bitkiler ÇİZİLMEZ.
 *  759 nesnenin tamamı ~1,3 milyon üçgen eder; mobil için fazla. Kesim
 *  sonrası ekranda aynı anda 40-60 nesne kalır (~150 bin üçgen), bu da
 *  mevcut mob yüküne yakındır. */
export const FOLIAGE_DRAW_DISTANCE = 900;

/** P2.29 — UZAYSAL HÜCRE KENARI (dünya birimi).
 *
 *  Bitkiler tür başına TEK InstancedMesh olarak çiziliyordu ve three'nin
 *  frustum kesimi devreye girmiyordu: InstancedMesh tek nesne sayılır,
 *  bütün örnekler ya çizilir ya çizilmez. Tek mesh bütün haritayı
 *  kapladığı için hep çiziliyordu — 860 nesne, ~1,3 milyon üçgen.
 *
 *  Artık (tür × hücre) başına bir mesh var. 5120 / 1706 ≈ 3×3 = 9 hücre;
 *  kamera aynı anda 2-4 hücre görür, yani üçgen yükü kabaca dokuzda
 *  birine iner. Çizim çağrısı 7'den ~20'ye çıkar — mobilde bu takas
 *  değer. */
export const FOLIAGE_CELL = 1706;
