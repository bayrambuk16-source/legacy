import { ThreeWorldRenderer, type WorldFrame } from '../render3d/ThreeWorldRenderer.js';
import { toScene, facingToYaw, yawToFacing } from '../render3d/coords.js';
import { cameraPosition, CAMERA_V1 } from '../render3d/CameraRig.js';
import {
  DEFAULT_MOB_VIEW, DEFAULT_PLAYER_VIEW, DEFAULT_PROJECTILE_VIEW,
} from '../render3d/views.js';

const r = new ThreeWorldRenderer();          // canvas YOK → headless
console.log('WebGL kullanılıyor mu:', r.usingWebGL, '(headless olmalı: false)');

const frame = (t: number): WorldFrame => ({
  player: { ...DEFAULT_PLAYER_VIEW, worldX: 1240 + t * 10, worldY: 1650, facingAngle: 0.5, bodyAngle: 0.5, moving: true, moveX: 1, moveY: 0 },
  mobs: [
    { ...DEFAULT_MOB_VIEW, uid: 1, generation: 1, worldX: 1300, worldY: 1700, aiType: 'NORMAL', hpRatio: 1, dead: false },
    { ...DEFAULT_MOB_VIEW, uid: 2, generation: 1, worldX: 1180, worldY: 1600, aiType: 'AGGRESSIVE', hpRatio: 0.5, dead: false },
    { ...DEFAULT_MOB_VIEW, uid: 3, generation: 1, worldX: 1400, worldY: 1500, aiType: 'ELITE', hpRatio: 1, dead: false },
  ],
  projectiles: [{ ...DEFAULT_PROJECTILE_VIEW, id: 10, worldX: 1260, worldY: 1660 }],
  loot: [{ lootUid: 5, worldX: 1250, worldY: 1670, isCoin: false, colorHex: '#a06fd0' }],
  targetUid: 2,
  boundary: { centerX: 1240, centerY: 1650, radius: 650, enabled: true },
});
for (let i = 0; i < 5; i++) r.update(frame(i), 1 / 60);
let s = r.stats();
console.log('mob görsel:', s.mobVisualCount, '· projectile:', s.projectileVisualCount,
  '· loot:', s.lootVisualCount, '· sahne nesnesi:', s.activeObjectCount);

/* mob 1 respawn olsun: yeni uid + nesil */
const f2 = frame(5);
(f2.mobs as any)[0] = { uid: 9, generation: 2, worldX: 1300, worldY: 1700, aiType: 'NORMAL', hpRatio: 1, dead: false };
r.update(f2, 1 / 60);
s = r.stats();
console.log('respawn sonrası mob görsel:', s.mobVisualCount, '(3 olmalı) · üretilen:',
  s.visualsCreated, '· silinen:', s.visualsRemoved);

/* hepsi kaybolsun → sızıntı olmamalı */
r.update({ ...frame(6), mobs: [], projectiles: [], loot: [], targetUid: null }, 1 / 60);
s = r.stats();
console.log('boş kare → mob', s.mobVisualCount, 'proj', s.projectileVisualCount, 'loot', s.lootVisualCount);

/* koordinat + kamera */
console.log('toScene(100,200):', JSON.stringify(toScene({ worldX: 100, worldY: 200 })));
console.log('facing↔yaw tur:', yawToFacing(facingToYaw(0.77)).toFixed(4));
console.log('kamera:', JSON.stringify(cameraPosition({ worldX: 0, worldY: 0 }, CAMERA_V1)));
r.dispose();
console.log('dispose sonrası sahne nesnesi:', r.stats().activeObjectCount);
