/** KOORDİNAT KÖPRÜSÜ — P2.0 §5
 *
 *  ══════════ TEK YÖNLÜ SÖZLEŞME ══════════
 *  Gameplay DAİMA `worldX` / `worldY` kullanır ve Three'nin Y/Z mantığını
 *  ASLA görmez. Dönüşüm YALNIZ burada yapılır:
 *
 *      gameplay(worldX, worldY)  →  three(x = worldX, y = 0, z = worldY)
 *      three(x, z)               →  gameplay(worldX = x, worldY = z)
 *
 *  Y ekseni DÜŞEYDİR ve gameplay'de karşılığı YOKTUR (zıplama yok, §2).
 *
 *  ══════════ BU DOSYA THREE İMPORT ETMEZ ══════════
 *  Saf matematiktir; WebGL olmadan test edilir (§25). */

/** Gameplay düzlemindeki bir nokta. */
export interface GameplayPoint { worldX: number; worldY: number }
/** Three sahne uzayındaki bir nokta. */
export interface ScenePoint { x: number; y: number; z: number }

/** Zemin yüksekliği (gameplay'de karşılığı yok — düz arazi, §10). */
export const GROUND_Y = 0;

/** gameplay → three. `elevation` yalnız GÖRSEL yüksekliktir. */
export function toScene(p: GameplayPoint, elevation = GROUND_Y): ScenePoint {
  return { x: p.worldX, y: elevation, z: p.worldY };
}

/** three → gameplay. Düşey bileşen ATILIR (gameplay onu bilmez). */
export function toGameplay(p: ScenePoint): GameplayPoint {
  return { worldX: p.x, worldY: p.z };
}

/** Gameplay bakış açısı (radyan, 0 = +X, saat yönünde +Y'ye doğru) →
 *  Three'de Y ekseni etrafında dönüş.
 *
 *  Yerel ileri yön +Z kabul edilir. Yaw θ, +Z'yi (sin θ, 0, cos θ)'ya taşır.
 *  Hedef yön (cos a, 0, sin a) olduğundan:  θ = π/2 − a. */
export function facingToYaw(facingAngle: number): number {
  return Math.PI / 2 - facingAngle;
}

/** Ters dönüşüm — test ve telemetri için. */
export function yawToFacing(yaw: number): number {
  return Math.PI / 2 - yaw;
}

/** İki gameplay noktası arası mesafe (three'ye çevirmeden). */
export function gameplayDistance(a: GameplayPoint, b: GameplayPoint): number {
  return Math.hypot(a.worldX - b.worldX, a.worldY - b.worldY);
}

/** Açıyı [-π, π) aralığına indirger (facing karşılaştırmaları için). */
export function normalizeAngle(a: number): number {
  const twoPi = Math.PI * 2;
  let r = (a + Math.PI) % twoPi;
  if (r < 0) r += twoPi;
  return r - Math.PI;
}
