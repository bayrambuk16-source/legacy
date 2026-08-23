/** ARROW MOBILE V1 — VARLIK GERÇEKLERİ (P2.4)
 *
 *  ══════════════ MANİFEST AUTHORITATIVE'DİR ══════════════
 *  `arrow-manifest.json` varlıkla birlikte gelen metadata dosyasıdır; uzunluk,
 *  yönelim, uç konumu ve materyal zorunlulukları BURADAN okunur.
 *
 *  ══════════════ NEDEN SORUNSUZ OTURDU ══════════════
 *  Varlığın yönelimi projenin KENDİ sözleşmesiyle birebir aynı:
 *
 *      +Z ileri · orijin NOCK düzleminde (z = 0) · uç (0, 0, 0.7504)
 *
 *  P2.3'te primitive ok geometrisi de yerel +Z'ye bakacak şekilde kurulmuştu
 *  (renderer yalnız yaw uygular). Bu yüzden gerçek mesh, ek bir dönüşüm
 *  YAPILMADAN yerine geçer.
 *
 *  ══════════════ TEK FARK: ORİJİN ══════════════
 *  Varlığın orijini NOCK'tadır (arka uç). Gameplay'in otoritatif konumu ise
 *  okun VURDUĞU noktadır — yani UÇ. Bu yüzden geometri yüklenirken bir kez
 *  `-uzunluk` kadar ötelenir: orijin UCA taşınır, gövde arkada kalır.
 *  Manifest de bunu söylüyor: "If your projectile integrates the tip rather
 *  than the nock, offset by that vector."
 *
 *  ══════════════ BU DOSYA THREE İMPORT ETMEZ ══════════════ */
import manifest from './arrow-manifest.json';
import { WORLD_UNITS_PER_METER } from './archer-model.js';

export const ARROW_MODEL = {
  file: manifest.file,
  fileBytes: manifest.fileBytes,
  units: manifest.units,
  upAxis: manifest.upAxis,
  forwardAxis: manifest.forwardAxis,
  vertices: manifest.geometry.vertices,
  triangles: manifest.geometry.triangles,
  meshes: manifest.geometry.meshes,
  primitives: manifest.geometry.primitives,
  drawCalls: manifest.geometry.drawCalls,
  materials: manifest.geometry.materials,
  lengthMeters: manifest.geometry.lengthMeters,
  /** `MASK` + `alphaCutoff` — uç silueti ve tüyler alfa kesimlidir, ZORUNLU. */
  alphaMode: manifest.material.alphaMode,
  alphaCutoff: manifest.material.alphaCutoff,
  /** Tüyler tek yüzlü quad; kapatılırsa bir taraftan kaybolur. ZORUNLU. */
  doubleSided: manifest.material.doubleSided,
  decoderDependency: manifest.runtime.decoderDependency as string | null,
  extensionsRequired: manifest.runtime.extensionsRequired as readonly string[],
} as const;

/** Okun UCUNUN model-yerel konumu (metre) — manifestten BİREBİR. */
export const ARROW_TIP_LOCAL = manifest.orientation.tipLocalPosition as readonly number[];

/** İşaretçi düğüm adları (varlıkta boş node olarak bulunur). */
export const ARROW_MARKERS = { nock: 'arrow_nock', tip: 'arrow_tip' } as const;

/** Manifestin kendi bildirdiği bilinen kusurlar. */
export const ARROW_KNOWN_ISSUES = manifest.validation.knownIssues as readonly string[];

/** Metre → world birimi. Archer/Mutant ile AYNI köprü; üçüncü bir ölçek
 *  sabiti TANIMLANMAZ. */
export const ARROW_MODEL_SCALE = WORLD_UNITS_PER_METER;

/** Okun world birimi cinsinden uzunluğu (≈ 21,7 birim). */
export const ARROW_LENGTH_WORLD = ARROW_MODEL.lengthMeters * WORLD_UNITS_PER_METER;
