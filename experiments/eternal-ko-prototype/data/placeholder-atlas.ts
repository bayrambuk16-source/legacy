/** GEÇİCİ (DEBUG) ATLAS ÜRETİCİ — P1.2.2
 *
 *  NEDEN VAR: gerçek Archer atlasları henüz teslim edilmedi (yüklenen dört sayfa
 *  contact sheet'tir, runtime atlas değildir — `docs/ARCHER_SHEET_REVIEW_V1.md`).
 *  Atlas boru hattının (satır=yön, sütun=kare, footAnchor, klip ayrımı, sahte
 *  efektlerin kapanması) GERÇEKTEN çalıştığını gözle doğrulayabilmek için
 *  runtime'da ÇİZİLEN bir yer tutucu üretilir.
 *
 *  KURALLAR
 *  - Bu bir SANAT VARLIĞI DEĞİLDİR; üzerinde "DEBUG" damgası vardır.
 *  - Posterden KIRPILMAZ, poster pikseli KULLANILMAZ (spec §0 yasağı).
 *  - Bundle'a bayt eklemez: tarayıcıda canvas'a çizilip data URI'ye çevrilir.
 *  - Varsayılan KAPALI. DEV panelinden açılır.
 *  - Ayak hizası her karede tam olarak `footAnchorY` (264) çizgisidir; amaç
 *    "karakter havada duruyor" hatasının geri gelmediğini görebilmektir. */

import {
  ARCHER_ATLAS_DEFAULT, ATLAS_DIRECTIONS, RUNTIME_INDEX_DIRECTION,
  type ArcherAtlasMeta, type ArcherClip,
} from './archer-atlas.js';

const CLIP_TINT: Record<ArcherClip, string> = {
  walk: '#6f9f6a', attack: '#d8a24a', skill: '#7b8fd8', idle: '#8a8f96', dead: '#8c5a52',
};

/** Yön adının EKRAN açısı (radyan) — runtime indeks tablosundan türetilir. */
function screenAngleFor(dir: string): number {
  const idx = RUNTIME_INDEX_DIRECTION.indexOf(dir as never);
  return (idx * 45 * Math.PI) / 180;
}

function drawFigure(
  c: CanvasRenderingContext2D, cx: number, footY: number,
  dir: string, clip: ArcherClip, frame: number, frames: number,
): void {
  const a = screenAngleFor(dir);
  const tint = CLIP_TINT[clip];
  const t = frames > 1 ? frame / (frames - 1) : 0;

  if (clip === 'dead') {
    /* YATAN POZ: bilerek GENİŞ ve ALÇAK. Çapa yine `footY` çizgisidir —
       farklı silüet ölçüsünün karakteri kaydırmadığı böyle görülür. */
    c.fillStyle = tint;
    c.beginPath();
    c.ellipse(cx, footY - 16, 74, 20, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath(); c.arc(cx - 62, footY - 26, 17, 0, Math.PI * 2); c.fill();
    return;
  }

  /* bacaklar: walk'ta kare kare salınır, diğer kliplerde sabit */
  const swing = clip === 'walk' ? Math.sin((frame / frames) * Math.PI * 2) * 26 : 8;
  c.strokeStyle = tint; c.lineWidth = 9; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(cx, footY - 78); c.lineTo(cx + swing, footY);
  c.moveTo(cx, footY - 78); c.lineTo(cx - swing, footY);
  c.stroke();

  /* gövde + kafa */
  c.beginPath(); c.moveTo(cx, footY - 78); c.lineTo(cx, footY - 148); c.stroke();
  c.fillStyle = tint;
  c.beginPath(); c.arc(cx, footY - 168, 21, 0, Math.PI * 2); c.fill();

  /* YÖN GÖSTERGESİ: burun kaması bakılan tarafa uzar */
  c.fillStyle = '#f2e6c8';
  c.beginPath();
  c.moveTo(cx + Math.cos(a) * 34, footY - 168 + Math.sin(a) * 20);
  c.lineTo(cx + Math.cos(a + 2.5) * 15, footY - 168 + Math.sin(a + 2.5) * 9);
  c.lineTo(cx + Math.cos(a - 2.5) * 15, footY - 168 + Math.sin(a - 2.5) * 9);
  c.closePath(); c.fill();

  /* yay kolu: attack/skill'de kare ilerledikçe gerilir, walk'ta iner */
  const reach = clip === 'walk' ? 30 : 34 + t * 44;
  c.strokeStyle = clip === 'skill' ? '#b9c8ff' : '#e8d29a';
  c.lineWidth = clip === 'skill' ? 8 : 6;
  c.beginPath();
  c.moveTo(cx, footY - 122);
  c.lineTo(cx + Math.cos(a) * reach, footY - 122 + Math.sin(a) * reach * 0.6);
  c.stroke();
}

/** 5 klip için data URI üretir. Yalnız tarayıcıda çağrılır. */
export function buildPlaceholderAtlas(
  meta: ArcherAtlasMeta = ARCHER_ATLAS_DEFAULT,
): Record<ArcherClip, string> {
  const out = {} as Record<ArcherClip, string>;
  const F = meta.frameWidth, H = meta.frameHeight;
  for (const clip of Object.keys(meta.clips) as ArcherClip[]) {
    const m = meta.clips[clip];
    const cv = document.createElement('canvas');
    cv.width = F * m.frames; cv.height = H * ATLAS_DIRECTIONS.length;
    const c = cv.getContext('2d')!;
    for (let row = 0; row < ATLAS_DIRECTIONS.length; row++) {
      const dir = ATLAS_DIRECTIONS[row]!;
      for (let f = 0; f < m.frames; f++) {
        c.save();
        c.translate(f * F, row * H);
        /* kare çerçevesi + ayak hizası çizgisi (hizalama gözle doğrulanabilsin) */
        c.strokeStyle = 'rgba(255,255,255,0.10)'; c.lineWidth = 2;
        c.strokeRect(1, 1, F - 2, H - 2);
        c.strokeStyle = 'rgba(255,90,90,0.35)';
        c.beginPath(); c.moveTo(0, meta.footAnchorY); c.lineTo(F, meta.footAnchorY); c.stroke();
        drawFigure(c, meta.footAnchorX, meta.footAnchorY, dir, clip, f, m.frames);
        c.fillStyle = 'rgba(230,226,214,0.75)';
        c.font = 'bold 22px system-ui, sans-serif'; c.textAlign = 'left';
        c.fillText(`${dir} ${f}`, 10, 30);
        c.fillStyle = 'rgba(255,255,255,0.16)';
        c.font = 'bold 30px system-ui, sans-serif'; c.textAlign = 'center';
        c.fillText('DEBUG', F / 2, H - 14);
        c.restore();
      }
    }
    out[clip] = cv.toDataURL('image/png');
  }
  return out;
}
