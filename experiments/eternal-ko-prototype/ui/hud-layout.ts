/** HUD YERLEŞİMİ — SAF KATMAN (P2.6)
 *
 *  ══════════════ BU DOSYA NE YAPAR ══════════════
 *  Yeni sanat yönü maketindeki ögelerin EKRAN YERLEŞİMİNİ üretir. Çizim
 *  BURADA DEĞİLDİR (Scene çizer), girdi kararı BURADA DEĞİLDİR.
 *
 *  ══════════════ ÖLÇEK MAKETTEN TÜRER, ELLE YAZILMAZ ══════════════
 *  Maket 941×1672 (9:16). Prototip sahnesi `PROTO.screenW/H` = 620×1100 —
 *  aynı oran. Bütün koordinatlar maket pikselinde yazılır ve TEK bir çarpanla
 *  (`UI_SCALE`) sahneye taşınır. Böylece sahne ölçüsü değişirse yerleşim
 *  kendiliğinden uyar ve maketle karşılaştırma yapılabilir kalır.
 *
 *  ══════════════ SAF ══════════════
 *  Canvas, three, `Math.random()` YOKTUR. Aynı girdi → aynı yerleşim. */

import { PROTO } from '../config.js';

/** Sanat yönü maketinin ölçüsü (kaynak). */
export const UI_MOCK = { w: 941, h: 1672 } as const;

/** Maket pikseli → sahne pikseli. */
export const UI_SCALE = PROTO.screenW / UI_MOCK.w;

/** Maket koordinatını sahneye taşır. */
export const ui = (v: number): number => v * UI_SCALE;

export interface UiBox { x: number; y: number; w: number; h: number }

/** Görsel anahtarı + o görselin kaynak en-boy oranı. Yükseklik GENİŞLİKTEN
 *  türer; böylece bir varlık yeniden dışa aktarılınca yerleşim bozulmaz. */
export interface UiSprite extends UiBox { key: string }

/** Genişlik ve en-boy oranından kutu üretir (maket birimiyle). */
function sprite(key: string, x: number, y: number, w: number, aspect: number): UiSprite {
  return { key, x: ui(x), y: ui(y), w: ui(w), h: ui(w / aspect) };
}

/* ───────────────────────── üst şerit ───────────────────────── */

/** Oyuncu kartı (portre + Sv + HP/MP). Kaynak 460×221. */
export const HUD_PLAYER_CARD = sprite('ui_player_card', 8, 10, 348, 460 / 221);
/** Hedef kartı (mob adı + HP). Kaynak 400×150. */
export const HUD_TARGET_CARD = sprite('ui_target_card', 380, 30, 300, 400 / 150);
/** Genie aç/kapa. Kaynak 160×158. */
export const HUD_GENIE = sprite('ui_genie_toggle', 712, 18, 118, 160 / 158);
/** Ayar düğmesi. Kaynak 110×112. */
export const HUD_SETTINGS = sprite('ui_settings', 852, 24, 78, 110 / 112);

/** P2.19 — KAMERA MODU düğmesi. Ana ekranda, ayar dişlisinin altında.
 *  Modal panellerin arkasında kalmasın diye üst şeritte durur. */
export const HUD_CAMERA_BTN = sprite('ui_btn_gear', 858, 116, 66, 110 / 114);

/** P3.2 — ZİNDAN GİRİŞİ. Kamera düğmesinin altında, aynı sütunda.
 *  Sağ üst sütun (ayar → kamera → zindan) kalıcı eylemler için;
 *  alt menü sekmeleri panel açar, bu ise MOD DEĞİŞTİRİR. */
export const HUD_DUNGEON_BTN = sprite('ui_btn_gear', 858, 200, 66, 110 / 114);

/** Bir sprite'ın İÇİNDEKİ oransal bölge → sahne dikdörtgeni.
 *  Oranlar GÖRSELİN KENDİSİNDEN ölçüldü (dolgu piksellerinin sınırları), göz
 *  kararı değil. Varlık yeniden dışa aktarılıp ölçeği değişse bile dolgu
 *  çerçevenin içinde kalır. */
function inset(
  s: UiSprite, x0: number, x1: number, y0: number, y1: number,
): UiBox {
  return { x: s.x + s.w * x0, y: s.y + s.h * y0, w: s.w * (x1 - x0), h: s.h * (y1 - y0) };
}

/** HP/MP dolguları — `ui_player_card.webp` içindeki kırmızı/mavi bantların
 *  ölçülmüş oranları. */
/*  ══════════ ÖNEMLİ: ÇUBUKLAR VARLIKTA DOLU BOYALIDIR ══════════
 *  Kırmızı ve mavi bantlar kaynak görselde UÇTAN UCA doludur. Üstlerine
 *  ikinci bir dolgu çizmek "iki çubuk" görüntüsü yaratır — ekranda böyle
 *  oldu. Doğrusu TERSİDİR: eksik kısmın üstü koyu perdeyle ÖRTÜLÜR. */
export const HUD_BARS = {
  hp: inset(HUD_PLAYER_CARD, 0.374, 0.913, 0.407, 0.538),
  mp: inset(HUD_PLAYER_CARD, 0.372, 0.915, 0.597, 0.729),
  /* "Sv 70" yazısı varlıktan SİLİNDİ; seviye buraya koddan yazılır. */
  levelText: { x: HUD_PLAYER_CARD.x + HUD_PLAYER_CARD.w * 0.42,
    y: HUD_PLAYER_CARD.y + HUD_PLAYER_CARD.h * 0.185 },
} as const;

/** Hedef kartı içindeki HP dolgusu ve ad satırı (ölçülmüş oranlar). */
export const HUD_TARGET = {
  /* Hedef kartının HP çubuğu da DOLU boyalıdır — aynı perde kuralı. */
  bar: inset(HUD_TARGET_CARD, 0.058, 0.947, 0.697, 0.848),
  name: { x: HUD_TARGET_CARD.x + HUD_TARGET_CARD.w * 0.5,
    y: HUD_TARGET_CARD.y + HUD_TARGET_CARD.h * 0.30 },
} as const;

/* ───────────────────────── skill çemberi ───────────────────────── */

/** Beş skill yuvasının maket merkezleri. Sıra `ACTIVE_BAR_SLOTS` ile aynıdır:
 *  index 0 MERKEZDEKİ büyük yuvadır (standart atış). */
/** Skill yuvaları — maket ölçüsünde merkez + genişlik.
 *
 *  P2.6.1: maket ölçüleri oyun alanının belirgin bir kısmını yiyordu (oyuncu
 *  ekranın ortasında, düğmeler onun üstüne geliyordu). Çember %22 küçültüldü
 *  ve sağ-alta, alt menünün hemen üstüne çekildi. Dokunma hedefi hâlâ
 *  rahat: en küçük yuva sahnede ~76 px. */
/* P2.31 — SPOT ARTIK GÖRSEL TAŞIMAZ, yalnız KONUM.
   Eskiden her konumun sabit bir ikon anahtarı vardı; birinci yuvada
   hangi skill olursa olsun `ui_skill_standart` çiziliyordu. Oyuncu
   barı yeniden düzenleyince ikon yerinde kalıyor, skill değişiyordu
   ("görünen ikon başka, çalışan skill başka" bulgusu).

   İkon artık SKILL REFERANSINDAN gelir: `data/skill-visuals.ts`.
   `key` alanı yalnız varlık ön-yüklemesi için korunur. */
const SKILL_SPOTS: ReadonlyArray<{ cx: number; cy: number; w: number; key: string }> = [
  { cx: 762, cy: 1272, w: 132, key: 'ui_skill_standart' },
  { cx: 700, cy: 1080, w: 116, key: 'ui_skill_yesil' },
  { cx: 838, cy: 1080, w: 116, key: 'ui_skill_kara' },
  { cx: 638, cy: 1212, w: 116, key: 'ui_skill_golge' },
  { cx: 878, cy: 1212, w: 116, key: 'ui_skill_uclu' },
];

/** Skill düğmelerinin sahne kutuları (merkezden köşeye çevrilmiş). */
export function hudSkillBoxes(): UiSprite[] {
  return SKILL_SPOTS.map((s) => {
    const w = ui(s.w);
    return { key: s.key, x: ui(s.cx) - w / 2, y: ui(s.cy) - w / 2, w, h: w };
  });
}

/** "Hedef" düğmesi — skill çemberinin sol üstü. Kaynak 180×191. */
export const HUD_TARGET_BTN = sprite('ui_target_btn', 806, 936, 92, 180 / 191);

/* ───────────────────────── iksir hızlı kullanım (P2.33) ───────────────────────── */

/** HP/MP iksir düğmeleri. Joystick'in HEMEN ÜSTÜNDE dururlar: başparmak
 *  joystick'ten kalkmadan tek dokunuşla erişilir. Alt kenarları joystick
 *  bölgesine (y > %66) sarkar; dokunma önceliği Scene'de düğmelere verilir.
 *  Kaynak 110×116 (`ui_btn_potion`); MP aynı çerçeveyi kullanır, rozet
 *  rengi ayrıştırır. */
export const HUD_POTION_HP = sprite('ui_btn_potion', 40, 1030, 104, 110 / 116);
export const HUD_POTION_MP = sprite('ui_btn_potion', 168, 1030, 104, 110 / 116);

/** Sayfa noktaları (1..8). Kaynak 520×73. */
export const HUD_PAGE_DOTS = sprite('ui_page_dots', 566, 1348, 310, 520 / 73);

/* ───────────────────────── joystick ───────────────────────── */

/** Joystick tabanı ve topuzu. Merkez `PROTO.joystickCenter`tan gelir —
 *  girdi otoritesi orasıdır, görsel ona UYAR (tersi değil). */
export const HUD_JOY_BASE_W = ui(236);
export const HUD_JOY_KNOB_W = ui(112);

/* ───────────────────────── alt menü ───────────────────────── */

export const NAV_ITEMS = [
  { id: 'nav_bag', key: 'ui_nav_canta', label: 'Çanta' },
  { id: 'nav_char', key: 'ui_nav_karakter', label: 'Karakter' },
  { id: 'nav_skill', key: 'ui_nav_yetenek', label: 'Yetenek' },
  { id: 'nav_forge', key: 'ui_nav_ors', label: 'Örs' },
  { id: 'nav_menu', key: 'ui_nav_menu', label: 'Menü' },
] as const;

/** Alt menü düğmeleri — maket merkezlerinden eşit aralıklı. */
export function hudNavBoxes(): Array<UiSprite & { id: string }> {
  const w = ui(122);
  const h = w * (221 / 200);
  const yTop = ui(1424);
  const step = ui(176);
  const first = ui(128);
  return NAV_ITEMS.map((n, i) => ({
    id: n.id, key: n.key,
    x: first + i * step - w / 2, y: yTop, w, h,
  }));
}

/** EXP çubuğu. Kaynak 1020×98. */
export const HUD_EXP_BAR = sprite('ui_exp_bar', 96, 1596, 749, 1020 / 98);
/** EXP dolgusunun çubuk İÇİNDEKİ yeri (görselden ölçüldü).
 *  NOT: varlıktaki boyalı "48.37%" yazısı SİLİNDİ; "EXP" etiketi sabit
 *  olduğu için kaldı. Çubukta %48'lik altın dolgu BOYALIDIR — Scene önce
 *  yuvayı koyuyla örter, sonra gerçek oranı çizer. Sınırlar görselden
 *  ölçüldü (altın dolgu 0.158..0.531, yuva 0.814'e kadar sürüyor). */
export const HUD_EXP_FILL = inset(HUD_EXP_BAR, 0.158, 0.812, 0.429, 0.592);
/** Yüzde yazısının yeri — çubuğun sağ penceresi (yazı silindi, burası boş). */
export const HUD_EXP_TEXT = {
  x: HUD_EXP_BAR.x + HUD_EXP_BAR.w * 0.905,
  y: HUD_EXP_BAR.y + HUD_EXP_BAR.h * 0.36,
} as const;

/** Bütün HUD görsellerinin anahtarları — manifest testi bunu tarar. */
export function hudSpriteKeys(): string[] {
  return [
    HUD_PLAYER_CARD.key, HUD_TARGET_CARD.key, HUD_GENIE.key, HUD_SETTINGS.key,
    HUD_TARGET_BTN.key, HUD_POTION_HP.key, HUD_POTION_MP.key, HUD_PAGE_DOTS.key, HUD_EXP_BAR.key, HUD_CAMERA_BTN.key,
    HUD_DUNGEON_BTN.key,
    'ui_joy_base', 'ui_joy_knob',
    ...hudSkillBoxes().map((s) => s.key),
    ...NAV_ITEMS.map((n) => n.key),
  ];
}
