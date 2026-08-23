/** SABİT 3/4 KAMERA — P2.0 §8
 *
 *  ══════════ KANONİK SUNUM (§2) ══════════
 *  Portrait mobil · SABİT yüksek 3/4 açı · oyuncu kamerayı DÖNDÜREMEZ ·
 *  serbest kamera YOK · zıplama YOK. Kamera yalnız oyuncuyu TAKİP eder.
 *
 *  ══════════ BU DOSYA THREE İMPORT ETMEZ ══════════
 *  Kamera yerleşimi saf küresel geometridir; WebGL olmadan test edilir.
 *  `ThreeWorldRenderer` çıktıyı alıp `camera.position`'a yazar.
 *
 *  ══════════ EKRAN EKSENİ = 2D EKSENİ (P2.1 DÜZELTMESİ) ══════════
 *  Joystick GAMEPLAY girdisidir ve `dx/dy` EKRAN uzayındadır. 2D renderer
 *  dünyayı eksen hizalı çizer: ekran SAĞ = worldX+, ekran YUKARI = worldY−.
 *  3D kamera bu hizayı BOZARSA joystick ters/çapraz hisseder.
 *
 *  P2.0'da varsayılan `yawDeg = 45` idi; ölçüldüğünde ekran SAĞ ekseni
 *  `(−0.707, +0.707)` çıkıyordu — yani joystick "sağ" komutu karakteri ekranda
 *  YUKARI-SOLA götürüyordu. Kullanıcı bunu "joystick ters çalışıyor" olarak
 *  bildirdi ve haklıydı.
 *
 *  Varsayılan artık **`yawDeg = 270`**: kamera oyuncunun worldY+ tarafında
 *  durur ve ekran eksenleri 2D ile BİREBİR hizalanır
 *  (SAĞ = (+1, 0) · YUKARI = (0, −1)). Bu bir GÖRSEL yerleşim düzeltmesidir;
 *  gameplay girdi semantiği DEĞİŞMEDİ. `screenAxes()` bu hizayı ölçülebilir
 *  kılar ve test onu kilitler.
 *
 *  ══════════ PARAMETRELER ══════════
 *    yawDeg    — kameranın oyuncuya göre yatay yönü (sahne +X'ten +Z'ye doğru).
 *                270° = kamera worldY+ tarafında → ekran ekseni 2D ile HİZALI.
 *    pitchDeg  — ufuktan yükseklik açısı
 *    distance  — boom uzunluğu (hedeften kameraya)
 *    height    — BAKIŞ NOKTASININ oyuncunun ayağından yukarı ofseti
 *                (kamera yüksekliği `distance`+`pitch`'ten türer; `height`
 *                nereye baktığımızı ayarlar — göğüs hizası gibi)
 *    fov       — perspektif görüş açısı
 *    smoothing — YALNIZ GÖRSEL takip yumuşatması (gameplay'i etkilemez, §8) */
import type { GameplayPoint, ScenePoint } from './coords.js';

export type CameraProjection = 'perspective' | 'orthographic';

export interface CameraTuning {
  yawDeg: number;
  pitchDeg: number;
  distance: number;
  height: number;
  fov: number;
  smoothing: number;
  projection: CameraProjection;
  /** Ortografik modda görünür dünya yüksekliği (birim). */
  orthoHeight: number;
}

/** PROJECT LEGACY TUNING — kaynaktan gelmez, playtest ile ayarlanır. */
export const CAMERA_V1: CameraTuning = {
  /* 270° = ekran ekseni 2D ile HİZALI (joystick doğru yönde). Bkz. başlık. */
  yawDeg: 270,
  pitchDeg: 60,
  distance: 750,
  height: 90,
  fov: 40,
  smoothing: 8,
  projection: 'perspective',
  orthoHeight: 1100,
};

/** DEV panel seçenekleri. */
/** 270 = 2D ile hizalı (VARSAYILAN). Diğerleri DEV keşfi içindir; seçilirse
 *  joystick `screenToWorldMove()` ile o çerçeveye çevrilir (§P2.1). */
export const YAW_OPTIONS = [270, 315, 225, 0, 90] as const;
export const PITCH_OPTIONS = [40, 50, 55, 60, 70] as const;
export const DISTANCE_OPTIONS = [600, 750, 900, 1100, 1400] as const;
export const HEIGHT_OPTIONS = [0, 60, 90, 140] as const;
export const FOV_OPTIONS = [30, 35, 40, 45] as const;

const deg = (d: number): number => (d * Math.PI) / 180;

/** Kameranın DÜNYA konumu (three uzayı). Hedef = oyuncunun ayak noktası. */
export function cameraPosition(target: GameplayPoint, t: CameraTuning): ScenePoint {
  const yaw = deg(t.yawDeg), pitch = deg(t.pitchDeg);
  const horizontal = t.distance * Math.cos(pitch);
  return {
    x: target.worldX - Math.cos(yaw) * horizontal,
    y: t.distance * Math.sin(pitch),
    z: target.worldY - Math.sin(yaw) * horizontal,
  };
}

/** Kameranın BAKTIĞI nokta — ayak noktasının `height` kadar üstü. */
export function cameraLookAt(target: GameplayPoint, t: CameraTuning): ScenePoint {
  return { x: target.worldX, y: t.height, z: target.worldY };
}

/** Kare-hızından BAĞIMSIZ üstel yumuşatma.
 *  `smoothing = 0` → anında yapış (test/determinizm için). */
export function smoothTowards(current: ScenePoint, desired: ScenePoint, dt: number, smoothing: number): ScenePoint {
  if (smoothing <= 0) return { ...desired };
  const k = 1 - Math.exp(-smoothing * dt);
  return {
    x: current.x + (desired.x - current.x) * k,
    y: current.y + (desired.y - current.y) * k,
    z: current.z + (desired.z - current.z) * k,
  };
}

/** Ekran eksenlerinin DÜNYA karşılığı (gameplay düzleminde, birim vektör).
 *
 *  `right` — ekranda SAĞA doğru gitmek hangi dünya yönüdür
 *  `up`    — ekranda YUKARI gitmek hangi dünya yönüdür
 *
 *  Türetim: `lookAt` kamerasının x ekseni `cross(up, eye−target)`,
 *  y ekseni `cross(z, x)`. Yatay bileşenleri sadeleşince:
 *      right = (−sin yaw,  cos yaw)
 *      up    = ( cos yaw,  sin yaw)
 *  Varsayılan (yaw 270): right = (+1, 0) · up = (0, −1) — 2D ile AYNI. */
export function screenAxes(t: CameraTuning): {
  right: { x: number; y: number }; up: { x: number; y: number };
} {
  const yaw = deg(t.yawDeg);
  return {
    right: { x: -Math.sin(yaw), y: Math.cos(yaw) },
    up: { x: Math.cos(yaw), y: Math.sin(yaw) },
  };
}

/** EKRAN uzayındaki joystick vektörünü DÜNYA yönüne çevirir.
 *
 *  `dy` EKRAN aşağı yönüdür (joystick ham girdisiyle aynı işaret).
 *  Varsayılan kamerada bu dönüşüm **BİREBİR KİMLİKTİR** — yani 3D katman
 *  açık/kapalı olması hareketi DEĞİŞTİRMEZ. Yalnız DEV panelinden kamera
 *  döndürülürse devreye girer ve kontrolü ekranla hizalı tutar. */
export function screenToWorldMove(
  dx: number, dy: number, t: CameraTuning,
): { x: number; y: number } {
  const a = screenAxes(t);
  return {
    x: dx * a.right.x - dy * a.up.x,
    y: dx * a.right.y - dy * a.up.y,
  };
}

/** Ortografik izdüşüm sınırları (aspect = genişlik / yükseklik). */
export function orthoBounds(t: CameraTuning, aspect: number): {
  left: number; right: number; top: number; bottom: number;
} {
  const h = t.orthoHeight / 2;
  const w = h * aspect;
  return { left: -w, right: w, top: h, bottom: -h };
}

/** Bir sonraki seçeneğe geç (DEV döngüsel ayar). */
export function cycle<T extends number>(options: readonly T[], current: number): T {
  const i = options.indexOf(current as T);
  return options[((i < 0 ? -1 : i) + 1) % options.length]!;
}
