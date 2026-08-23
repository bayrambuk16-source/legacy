/** KAMERA ZOOM — SAF KATMAN (P2.9)
 *
 *  ══════════════ BU DOSYA NE YAPAR ══════════════
 *  İki parmak (pinch) jestini bir ZOOM ÇARPANINA çevirir ve çarpanı kamera
 *  ayarına uygular. Girdi dinleme BURADA DEĞİLDİR (Scene), kamera çizimi
 *  BURADA DEĞİLDİR (renderer).
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()` YOKTUR. Aynı parmak mesafesi → aynı zoom.
 *
 *  ══════════════ ZOOM GAMEPLAY'İ ETKİLEMEZ ══════════════
 *  Yalnız `distance` / `orthoHeight` değişir. Menzil, aggro, hitbox ve
 *  hareket world biriminde ölçülür; kamera bunları GÖRMEZ. */

import type { CameraTuning } from '../render3d/CameraRig.js';

/** Zoom sınırları — 1 = varsayılan kadraj. Kullanıcı iki parmakla bu
 *  aralıkta gezinir. Alt sınır fazla yaklaşırsa mob göremez, üst sınır
 *  fazla uzaklaşırsa karakter noktaya döner; ikisi de playtest değeridir. */
export const ZOOM_MIN = 0.55;
export const ZOOM_MAX = 2.2;
export const ZOOM_DEFAULT = 1;

/** İki parmağın ekran mesafesi. `null` → jest yok. */
export interface PinchState {
  readonly startDistance: number;
  readonly startZoom: number;
}

export const clampZoom = (z: number): number =>
  z < ZOOM_MIN ? ZOOM_MIN : z > ZOOM_MAX ? ZOOM_MAX : z;

/** İki nokta arası ekran mesafesi. */
export function pinchDistance(
  a: { x: number; y: number }, b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Jest sırasında yeni zoom. Parmaklar AÇILINCA yakınlaşır (zoom küçülür),
 *  KAPANINCA uzaklaşır — telefonlardaki alışılmış yön. */
export function pinchZoom(state: PinchState, currentDistance: number): number {
  if (state.startDistance <= 1 || currentDistance <= 1) return state.startZoom;
  return clampZoom(state.startZoom * (state.startDistance / currentDistance));
}

/** Zoom çarpanını kamera ayarına uygular. TABAN DEĞERLER KORUNUR: çarpan
 *  her karede TABANA uygulanır, bir öncekine değil — yoksa zoom sürüklenir. */
export function applyZoom(
  base: CameraTuning, zoom: number,
): Pick<CameraTuning, 'distance' | 'orthoHeight' | 'height'> {
  const z = clampZoom(zoom);
  return {
    distance: base.distance * z,
    orthoHeight: base.orthoHeight * z,
    /* Bakış noktası yükselmez: uzaklaşınca karakter kadrajın ortasında kalır. */
    height: base.height,
  };
}
