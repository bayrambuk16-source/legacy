/** Serbest 360° hareket + dünya çarpışması. Renderer'dan tamamen bağımsız;
 *  testler bu sistemi canvas olmadan çalıştırır.
 *  Frame-rate bağımsızdır: tüm hareket dt ile ölçeklenir. */
import type { Obstacle, PlayerWorldState, Vec2, WorldBounds } from './types.js';
import { PROTO } from '../config.js';

export interface JoystickInput {
  /** Ham vektör (ekran uzayında, joystick merkezine göre). */
  dx: number;
  dy: number;
  active: boolean;
}
export interface MoveVector { x: number; y: number; magnitude: number }

/** Ham joystick girdisini dead-zone + analog büyüklük + normalize yöne çevirir. */
export function resolveJoystick(input: JoystickInput, radius = PROTO.joystickRadius, deadZone = PROTO.joystickDeadZone): MoveVector {
  if (!input.active) return { x: 0, y: 0, magnitude: 0 };
  const len = Math.hypot(input.dx, input.dy);
  if (len <= 0) return { x: 0, y: 0, magnitude: 0 };
  const norm = Math.min(1, len / radius);
  if (norm < deadZone) return { x: 0, y: 0, magnitude: 0 };
  /* dead-zone sonrası büyüklüğü 0..1'e yeniden ölçekle (eşikte zıplama olmasın) */
  const magnitude = (norm - deadZone) / (1 - deadZone);
  return { x: input.dx / len, y: input.dy / len, magnitude };
}

export class WorldMovementSystem {
  /** @param stepAllowed P2.4C — ADIM KAPISI. Moradon'da yürünebilirlik
   *  maskesine (`worldStepAllowed`), test dünyasında sabit `true`ya çözülür.
   *  Kontrol ENDPOINT-ONLY DEĞİLDİR: `from → to` arasında kesilen bütün
   *  hücreler denetlenir, böylece büyük `dt`'de duvarın öbür yanına atlanamaz.
   *  Mob hareketi (`MobAi`) AYNI kapıyı kullanır — ikinci bir yol açılmaz. */
  constructor(
    private bounds: WorldBounds,
    private obstacles: Obstacle[],
    private speedProvider: () => number,
    private stepAllowed: (fx: number, fy: number, tx: number, ty: number) => boolean =
    () => true,
  ) {}

  /** Bir noktanın engelle çakışıp çakışmadığı (yarıçaplı). */
  collides(x: number, y: number, radius: number): boolean {
    for (const o of this.obstacles) {
      const r = o.radius + radius;
      const dx = x - o.x, dy = y - o.y;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }

  clampToBounds(x: number, y: number, radius: number): Vec2 {
    return {
      x: Math.max(radius, Math.min(this.bounds.width - radius, x)),
      y: Math.max(radius, Math.min(this.bounds.height - radius, y)),
    };
  }

  /** Oyuncuyu hareket ettirir. Eksen bazlı kayma (sliding) ile engellere takılıp
   *  kalmaz. Dönen değer yeni konumdur; state yerinde güncellenir. */
  move(player: PlayerWorldState, mv: MoveVector, dt: number): void {
    player.moving = mv.magnitude > 0;
    if (!player.moving) { player.moveX = 0; player.moveY = 0; return; }

    const step = this.speedProvider() * mv.magnitude * dt;
    player.moveX = mv.x; player.moveY = mv.y;
    /* 8 YÖNLÜ BAKIŞ: karakter gittiği yöne bakar. Eski kod yalnız mv.x işaretine
       bakıyordu; dikey harekette yön değişmiyor, saldırı ise onu ters çevirebiliyordu
       (gözlem #3 "rastgele bakıyor"). Artık gerçek hareket açısı saklanır. */
    player.facingAngle = Math.atan2(mv.y, mv.x);
    if (Math.abs(mv.x) > 0.05) player.facing = mv.x >= 0 ? 1 : -1;
    player.animT += dt * (1 + mv.magnitude);

    const r = PROTO.playerRadius;
    const beforeX = player.worldX, beforeY = player.worldY;
    /* Eksenler AYRI denenir → duvara sürtünerek kayma korunur. Her eksen kendi
       adımını kapıdan geçirir; biri reddedilse de diğeri ilerleyebilir. */
    // X ekseni
    const nx = this.clampToBounds(player.worldX + mv.x * step, player.worldY, r).x;
    if (!this.collides(nx, player.worldY, r)
      && this.stepAllowed(player.worldX, player.worldY, nx, player.worldY)) {
      player.worldX = nx;
    }
    // Y ekseni
    const ny = this.clampToBounds(player.worldX, player.worldY + mv.y * step, r).y;
    if (!this.collides(player.worldX, ny, r)
      && this.stepAllowed(player.worldX, player.worldY, player.worldX, ny)) {
      player.worldY = ny;
    }
    /* GERÇEKTEN katedilen mesafe (engele dayanınca adım döngüsü de durur) */
    player.travelled += Math.hypot(player.worldX - beforeX, player.worldY - beforeY);
  }

  /** Mob/AI için ortak yardımcı: hedefe doğru adım (engel-farkında değil, basit). */
  static stepToward(from: { x: number; y: number }, tx: number, ty: number, speed: number, dt: number): Vec2 {
    const dx = tx - from.x, dy = ty - from.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-3) return { x: from.x, y: from.y };
    const step = Math.min(d, speed * dt);
    return { x: from.x + (dx / d) * step, y: from.y + (dy / d) * step };
  }
}
