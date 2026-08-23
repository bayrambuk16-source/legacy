/** KAMERA MODLARI — SAF KATMAN (P2.19)
 *
 *  ══════════════ İKİ MOD ══════════════
 *  1. KUŞ BAKIŞI (`overhead`) — P2.0'dan beri var olan 60° eğik açı.
 *     Kamera SABİT yönde durur (`yawDeg 270`), karakter döndükçe kamera
 *     dönmez. Farm ve genel bakış için iyi.
 *
 *  2. ÜÇÜNCÜ ŞAHIS (`third`) — Knight Online / Metin2 dili. Kamera
 *     karakterin ARKASINDA durur ve karakter döndükçe ONUNLA döner.
 *     Daha alçak açı, daha yakın mesafe.
 *
 *  ══════════════ NEDEN AYRI DOSYA ══════════════
 *  `CameraRig` ayarları TAŞIR; mod seçimi ise hangi ayarın ne zaman
 *  kullanılacağına karar verir. İkisini karıştırmamak için ayrı.
 *
 *  ══════════════ SAF ══════════════
 *  three, canvas, `Math.random()` YOKTUR. Aynı mod + aynı bakış açısı →
 *  aynı ayar.
 *
 *  ══════════════ ZOOM HER İKİ MODDA DA ÇALIŞIR ══════════════
 *  İki parmak jesti mod bilmez; `applyZoom` taban ayara uygulanır.
 *  Modlar farklı taban mesafe taşıdığı için zoom aralığı da farklı
 *  hissettirir — kuş bakışında geniş, üçüncü şahısta yakın. */

import { CAMERA_V1, type CameraTuning } from '../render3d/CameraRig.js';

export type CameraMode = 'overhead' | 'third';

export const CAMERA_MODES: readonly CameraMode[] = ['overhead', 'third'];

export const CAMERA_MODE_LABEL: Readonly<Record<CameraMode, string>> = {
  overhead: 'KUŞ BAKIŞI',
  third: '3. ŞAHIS',
};

/** ÜÇÜNCÜ ŞAHIS TABAN AYARI — PROJECT LEGACY TUNING.
 *
 *  `pitchDeg 28`: omuz üstü hissi. 60 (kuş bakışı) tepeden bakar, 28
 *  ufka yakındır ve ufuk çizgisi görünür — mesafe algısı buradan gelir.
 *
 *  `distance 300`: kuş bakışının (750) yarısından az. Karakter ekranda
 *  belirgin ama önünü görmeyi engellemeyecek kadar.
 *
 *  `height 105`: bakış noktası ayaktan yukarı — göğüs/omuz hizası.
 *  Ayağa bakarsak karakter ekranın üst yarısına kaçar.
 *
 *  `fov 55`: kuş bakışından (40) geniş. Yakın kamerada dar açı klostrofobik
 *  hissettirir. */
export const CAMERA_THIRD: CameraTuning = {
  ...CAMERA_V1,
  pitchDeg: 28,
  distance: 300,
  height: 105,
  fov: 55,
  /* Daha hızlı takip: yakın kamerada gecikme daha çok fark edilir. */
  smoothing: 12,
};

/** Bir modun TABAN ayarı. Zoom ve yön bunun ÜSTÜNE uygulanır. */
export function baseTuning(mode: CameraMode): CameraTuning {
  return mode === 'third' ? CAMERA_THIRD : CAMERA_V1;
}

/** Kameranın yatay yönü.
 *
 *  KUŞ BAKIŞI: SABİT. Kamera dönmez; joystick ekran ekseniyle hizalı
 *  kalır (`yawDeg 270` — bkz. `CameraRig` başlığı).
 *
 *  ÜÇÜNCÜ ŞAHIS: karakterin ARKASI. Karakter `facingAngle` yönüne
 *  bakıyorsa kamera ters yönde, yani `facing + 180°` konumundadır.
 *
 *  @param facingAngle oyuncunun bakış açısı (radyan, +X = 0)
 *  @returns derece cinsinden yaw */
export function modeYaw(mode: CameraMode, facingAngle: number): number {
  if (mode !== 'third') return CAMERA_V1.yawDeg;
  const deg = (facingAngle * 180) / Math.PI;
  /* Kamera hedefin GERİSİNDE: `cameraPosition` yaw yönünün TERSİNE
     yerleşiyor (target - cos(yaw)*d), yani yaw doğrudan bakış yönüdür. */
  return ((deg % 360) + 360) % 360;
}

/** Sıradaki mod (tuş her basışta döner). */
export function nextMode(mode: CameraMode): CameraMode {
  const i = CAMERA_MODES.indexOf(mode);
  return CAMERA_MODES[(i + 1) % CAMERA_MODES.length]!;
}

/** ÜÇÜNCÜ ŞAHIS DÖNÜŞ YUMUŞATMASI.
 *
 *  Karakter aniden dönünce kamera da anında dönerse mide bulandırır.
 *  Yaw açısı EN KISA YOLDAN hedefe yaklaştırılır (359° → 1° geçişi
 *  358 derece geri değil, 2 derece ileri gitmeli).
 *
 *  @param dt kare süresi (sn) · `rate` saniyedeki yakınsama oranı */
export function approachYaw(current: number, target: number, dt: number, rate = 6): number {
  let diff = ((target - current) % 360 + 540) % 360 - 180;
  const k = 1 - Math.exp(-rate * dt);
  return ((current + diff * k) % 360 + 360) % 360;
}
