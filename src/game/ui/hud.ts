/** HUD çizim yardımcıları — saf render fonksiyonları, durum tutmaz. */
import type { DrawApi, GameHost, PointerEventInfo } from '../../engine/types.js';

export interface ButtonRect { id: string; x: number; y: number; w: number; h: number; label: string }

export function inRect(p: PointerEventInfo, r: { x: number; y: number; w: number; h: number }): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

/** Doluluk barı — sayısal değer YAZMAZ (tasarım kuralı). */
export function drawBar(g: DrawApi, x: number, y: number, w: number, h: number, ratio: number, fill: string, back: string): void {
  const r = Math.max(0, Math.min(1, ratio));
  g.rect(x, y, w, h, back);
  if (r > 0) g.rect(x + 1, y + 1, (w - 2) * r, h - 2, fill);
}

/** Skill/saldırı butonu; ratio > 0 iken cooldown perdesi çizer. */
export function drawButton(g: DrawApi, b: ButtonRect, cooldownRatio: number, subLabel = '', locked = false): void {
  g.rect(b.x, b.y, b.w, b.h, '#221c14', 0.92);
  g.rect(b.x, b.y, b.w, 3, locked ? '#3a3128' : '#4a3f30');
  g.text(b.label, b.x + b.w / 2, b.y + b.h / 2 - (subLabel ? 8 : 0),
    { align: 'center', size: 13, bold: true, color: locked ? '#6f655a' : '#e8e0d0' });
  if (subLabel) g.text(subLabel, b.x + b.w / 2, b.y + b.h / 2 + 14,
    { align: 'center', size: 11, color: locked ? '#8d6a5a' : '#6f8fd0' });
  if (cooldownRatio > 0) {
    g.rect(b.x, b.y + b.h * (1 - cooldownRatio), b.w, b.h * cooldownRatio, '#0b0908', 0.7);
  }
}

/** Alt navigasyon: 5 sabit ikon. harita→hub ve çanta→envanter aktif;
 *  kalan üçü ileriki fazlara rezerve (soluk çizilir). */
export interface NavDef { icon: string; scene: string | null; label: string }
export const NAV_ITEMS: NavDef[] = [
  { icon: 'mn2_harita', scene: 'hub', label: 'Kamp' },
  { icon: 'mn2_envanter', scene: 'inventory', label: 'Çanta' },
  { icon: 'mn2_karakter', scene: null, label: 'Karakter' },
  { icon: 'mn2_yetenek', scene: 'skills', label: 'Yetenekler' },
  { icon: 'mn2_ayar', scene: null, label: 'Ayarlar' },
];
export const NAV_H = 92;

export function drawBottomNav(g: DrawApi, host: GameHost, activeScene?: string): void {
  const y = g.height - NAV_H;
  g.rect(0, y, g.width, NAV_H, '#0b0908', 0.9);
  g.rect(0, y, g.width, 2, '#2c2417');
  const cell = g.width / NAV_ITEMS.length;
  NAV_ITEMS.forEach((item, i) => {
    const cx = cell * i + cell / 2;
    const active = item.scene !== null;
    const alpha = item.scene === activeScene ? 1 : active ? 0.7 : 0.3;
    if (host.assets.has(item.icon)) {
      g.image(item.icon, cx, y + NAV_H / 2 - 12, { w: 40, h: 40, originX: 0.5, originY: 0.5, alpha });
    } else {
      g.circle(cx, y + NAV_H / 2 - 12, 18, '#2c2417', alpha);
    }
    g.text(item.label, cx, y + NAV_H - 16, { align: 'center', size: 11, color: '#8d8272', alpha });
  });
}

/** Nav dokunuşu: hedef scene anahtarı döner (aktif olmayanlar null). */
export function navHit(p: PointerEventInfo, g: DrawApi): string | null {
  const y = g.height - NAV_H;
  if (p.y < y) return null;
  const cell = g.width / NAV_ITEMS.length;
  const idx = Math.min(NAV_ITEMS.length - 1, Math.max(0, Math.floor(p.x / cell)));
  return NAV_ITEMS[idx].scene;
}
