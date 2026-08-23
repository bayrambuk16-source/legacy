/** Kamera: sabit açı, sabit zoom, manuel kontrol YOK.
 *  - oyuncuyu takip eder (dt tabanlı exponential smoothing)
 *  - joystick yönüne çok hafif look-ahead uygular, bırakılınca merkeze döner
 *  - hedef seçiliyse framing'i çok hafif oyuncu-hedef arasına kaydırır
 *  Renderer'dan bağımsızdır; testler deterministik olarak çalıştırabilir. */
import type { Vec2 } from './types.js';
import { PROTO, type Tuning } from '../config.js';

export interface CameraFocus {
  playerX: number; playerY: number;
  /** normalize joystick yönü (0,0 = bırakılmış) */
  dirX: number; dirY: number;
  /** hedef world konumu (yoksa null) */
  targetX: number | null; targetY: number | null;
}

/** dt tabanlı yumuşatma katsayısı: 1 - e^(-k·dt) — frame-rate bağımsız. */
export function smoothFactor(k: number, dt: number): number {
  return 1 - Math.exp(-k * dt);
}

export class WorldCameraController {
  /** Kameranın baktığı world noktası (ekranda `cameraPlayerYPct` hizasına gelir). */
  x = 0;
  y = 0;
  /** Uygulanan look-ahead ofseti (world birimi) — yumuşak döner. */
  offsetX = 0;
  offsetY = 0;

  constructor(private tuning: Tuning) {}

  snapTo(x: number, y: number): void { this.x = x; this.y = y; this.offsetX = 0; this.offsetY = 0; }

  /** Look-ahead'in izin verilen en büyük world ofseti (ekran yüzdesinden). */
  maxLookAhead(): Vec2 {
    const pct = this.tuning.get('cameraLookAheadPct');
    return { x: PROTO.screenW * pct, y: PROTO.screenH * pct };
  }

  update(focus: CameraFocus, dt: number): void {
    const max = this.maxLookAhead();
    /* 1) look-ahead hedefi: joystick yönü × izin verilen ofset (clamp'li) */
    const wantX = Math.max(-max.x, Math.min(max.x, focus.dirX * max.x));
    const wantY = Math.max(-max.y, Math.min(max.y, focus.dirY * max.y));
    const la = smoothFactor(PROTO.lookAheadFollow, dt);
    this.offsetX += (wantX - this.offsetX) * la;
    this.offsetY += (wantY - this.offsetY) * la;

    /* 2) hedef framing: yalnız hedef makul mesafedeyse, çok hafif */
    let focusX = focus.playerX, focusY = focus.playerY;
    if (focus.targetX !== null && focus.targetY !== null) {
      const d = Math.hypot(focus.targetX - focus.playerX, focus.targetY - focus.playerY);
      if (d <= PROTO.targetFramingMaxDist) {
        focusX += (focus.targetX - focus.playerX) * PROTO.targetFramingPct;
        focusY += (focus.targetY - focus.playerY) * PROTO.targetFramingPct;
      }
    }

    /* 3) takip: exponential smoothing (dt tabanlı) */
    const f = smoothFactor(this.tuning.get('cameraFollow'), dt);
    this.x += (focusX + this.offsetX - this.x) * f;
    this.y += (focusY + this.offsetY - this.y) * f;
  }
}
