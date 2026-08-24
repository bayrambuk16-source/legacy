/** ZİNDAN HUD YERLEŞİMİ — SAF KATMAN (P3.7)
 *
 *  ══════════════ DİKEY EKRAN ══════════════
 *  Kullanıcı kararı: telefon dikey, oyuncu ekranın ALTINDA, moblar
 *  yukarıdan aşağı geliyor. Bu yüzden bilgi şeridi ÜSTTE, eylem
 *  düğmeleri ALTTA — parmağın doğal olarak durduğu yerde.
 *
 *  Savaş alanı ortada boş kalır: kat/dalga bilgisi üstte, NEXT/GERİ
 *  altta, aradaki bant hiçbir şeyle kapatılmaz.
 *
 *  ══════════════ KOORDİNATLAR ══════════════
 *  Sahne pikselinde (620×1100), HUD'ın geri kalanıyla aynı sistemde.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. */

import type { UiRect } from './inventory-panel.js';

/** Üst bilgi şeridi: kat, dalga, güç, risk. */
export const DUNGEON_INFO: UiRect = { x: 20, y: 96, w: 580, h: 92 };

/** Kat göstergesi (sol) ve dalga göstergesi (sağ). */
export const DUNGEON_FLOOR_BOX: UiRect = { x: 28, y: 102, w: 200, h: 38 };
export const DUNGEON_WAVE_BOX: UiRect = { x: 392, y: 102, w: 200, h: 38 };
/** Güç / önerilen güç / risk satırı. */
export const DUNGEON_POWER_ROW: UiRect = { x: 28, y: 144, w: 564, h: 38 };

/** ═══ ALT EYLEM ŞERİDİ ═══
 *
 *  Üç düğme: GERİ, ÇIK, NEXT. Ortada ÇIK olması bilinçli — yanlışlıkla
 *  basılması en zararsız olan o. NEXT sağda, çünkü ilerleme sağa
 *  doğrudur ve baskın el başparmağı oraya daha rahat uzanır. */
/** ═══ P3.19 — ALT MENÜNÜN ÜSTÜNE ÇEKİLDİ ═══
 *  Oyun testi bulgusu: "zindanda skill puanı kullanamıyorum".
 *  Sebep ölçüldü — eylem şeridi y 946-1002'deydi, alt menü (Çanta,
 *  Karakter, YETENEK, Örs, Menü) ise y 938-1027. Neredeyse tam
 *  üst üsteydiler ve zindan girdisi panellerden ÖNCE işlendiği için
 *  "Yetenek" düğmesine dokunmak `ÇIK`a basmak oluyordu.
 *
 *  Yani zindanda HİÇBİR panel açılamıyordu; sorun skill sistemine
 *  özgü değildi.
 *
 *  Şerit ALT bölgeden ÜST bölgeye taşındı. Alt bölgede yer yoktu:
 *      alt menü      938-1027
 *      skill barı    673-882  (sağ yarı)
 *      joystick      merkez (122, 838), yarıçap 92 → 746-930 (sol yarı)
 *  Aradaki 882-938 bandı hem dar hem de skill barıyla kesişiyordu.
 *
 *  Üstte, bilgi şeridinin hemen altında geniş ve boş bir bant var.
 *  Savaş alanı 310'dan aşağısı; hâlâ ekranın yarısından fazlası. */
export const DUNGEON_ACTION_Y = 254;
export const DUNGEON_ACTION_H = 56;

export function dungeonActions(): Array<UiRect & { id: string; label: string }> {
  const y = DUNGEON_ACTION_Y, h = DUNGEON_ACTION_H;
  return [
    { id: 'dg_prev', label: 'GERİ', x: 24, y, w: 170, h },
    { id: 'dg_exit', label: 'ÇIK', x: 214, y, w: 152, h },
    { id: 'dg_next', label: 'İLERİ', x: 386, y, w: 170, h },
  ];
}

/** İksir mağazası düğmesi — alt şeridin üstünde, sağda. */
/** İksir mağazası — bilgi şeridinin hemen ALTINDA, sağda. Eylem
 *  şeridiyle de alt menüyle de çakışmaz. */
export const DUNGEON_SHOP_BTN: UiRect = { x: 470, y: 196, w: 120, h: 50 };

/** ═══ İKSİR MAĞAZASI ═══
 *
 *  Kullanıcı kararı: zindanda iksir tüketilecek ve mağazadan satın
 *  alınacak. Fiyatlar KAYNAKTAN gelir (`ko-potions.ts` → `vendorPrice`,
 *  160 / 600 / 2 000 / 7 000) — uydurulmadı.
 *
 *  Mağaza panelinin kendi çerçevesi yok; mevcut satış panelinin görsel
 *  dilini kullanır. */
export const SHOP_PANEL: UiRect = { x: 40, y: 150, w: 540, h: 700 };
export const SHOP_ROW_H = 68;
/** Kaynak kataloğunda dokuz iksir var (dört can, beş mana); satır
 *  sayısı ondan AZ OLAMAZ, yoksa alt kademeler görünmez. */
export const SHOP_ROWS = 9;

export function shopRows(): UiRect[] {
  const out: UiRect[] = [];
  for (let i = 0; i < SHOP_ROWS; i++) {
    out.push({
      x: SHOP_PANEL.x + 16,
      y: SHOP_PANEL.y + 64 + i * SHOP_ROW_H,
      w: SHOP_PANEL.w - 32,
      h: SHOP_ROW_H - 12,
    });
  }
  return out;
}

/** Satır içindeki "1 al" ve "10 al" düğmeleri. */
export function shopBuyButtons(row: UiRect): Array<UiRect & { qty: number }> {
  const w = 64, h = 34, y = row.y + (row.h - h) / 2;
  return [
    { qty: 1, x: row.x + row.w - 150, y, w, h },
    { qty: 10, x: row.x + row.w - 78, y, w, h },
  ];
}

export const SHOP_CLOSE: UiRect & { id: string; label: string } = {
  id: 'shop_close', label: '✕',
  x: SHOP_PANEL.x + SHOP_PANEL.w - 56, y: SHOP_PANEL.y + 12, w: 44, h: 44,
};

/** Dokunma çözümlemesi. */
export type DungeonHit =
  | { readonly kind: 'action'; readonly id: string }
  | { readonly kind: 'shop' }
  | null;

const inside = (r: UiRect, x: number, y: number): boolean =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export function dungeonHitTest(x: number, y: number): DungeonHit {
  if (inside(DUNGEON_SHOP_BTN, x, y)) return { kind: 'shop' };
  for (const b of dungeonActions()) {
    if (inside(b, x, y)) return { kind: 'action', id: b.id };
  }
  return null;
}
