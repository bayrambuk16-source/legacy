/** PROTOTİPE ÖZEL varlık manifesti.
 *
 *  Ana `src/game/data/assets-manifest.ts` DEĞİŞTİRİLMEDİ: bu dosyadaki anahtarlar
 *  yalnız prototip bundle'ına gömülür (`build:proto --manifest ...`), ana oyunun
 *  `dist/preview.html` çıktısına eklenmez.
 *
 *  8 yönlü okçu sayfaları legacy havuzunda ZATEN VARDI (yalnız `_sag` manifeste
 *  alınmıştı). Her sayfa 1800×300 = 6 kare; kare 0 o yönün DURUŞ pozudur,
 *  1-5 ok atma. Yürüyüş animasyonu kaynakta YOKTUR (bkz. README). */

/** P2.6 — YENİ SANAT YÖNÜ HUD VARLIKLARI.
 *  Kaynak: kullanıcı UI kit sayfaları (1122×1402, şeffaf). Parçalar bileşen
 *  bazında kesildi, ekran ölçeğinin ~2 katına indirildi ve WebP q90 olarak
 *  `public/assets/ui/` altına yazıldı (~490 KB toplam). Yerleşim
 *  `ui/hud-layout.ts` içindedir; burası yalnız anahtar → dosya eşlemesidir. */
/** P2.11 — zemin dokusu. Kaynak: Poly Haven "rocky_terrain_02" 4K diffuse.
 *  Tileable olduğu ölçülerek doğrulandı (kenar farkı 6,0/6,9 ≈ iç doku
 *  farkı 5,8 → döşendiğinde dikiş görünmez). 512×512 WebP, 35 KB. */
export const GROUND_TEXTURE_KEY = 'ground_texture';

/* ═══ P2.25.2 — ITEM İKONLARI DÜZ METİN OLARAK BURADA ═══
   Önceden `...ITEM_ICON_PATHS` yayılımıyla geliyorlardı. Ama
   `tools/pack-preview.mjs` manifesti KOD OLARAK DEĞİL, DÜZ METİN
   olarak tarıyor (`key: 'assets/…'` deseni) ve yayılımı izleyemiyor.
   Sonuç: 39 ikon önizleme paketine hiç girmedi, oyunda yedek daireler
   çizildi. İki tur boyunca yanlış yerde arandı.

   Kesin çözüm: yollar BURADA düz yazılı. Eşleme (`ref → anahtar`)
   hâlâ `item-icons.ts` içinde; orası tek kaynak olmaya devam eder,
   yalnız YOLLAR çift yazılır ve test ikisinin eşitliğini bağlar. */
export const UI_ASSETS: Record<string, string> = {
  item_kul_agaci_yay: 'assets/ui/items/kul_agaci_yay.webp',
  item_mese_yay: 'assets/ui/items/mese_yay.webp',
  item_kisa_avci_yayi: 'assets/ui/items/kisa_avci_yayi.webp',
  item_avci_yayi: 'assets/ui/items/avci_yayi.webp',
  item_celik_tendon: 'assets/ui/items/celik_tendon.webp',
  item_yirtici_yay: 'assets/ui/items/yirtici_yay.webp',
  item_akrep_disi: 'assets/ui/items/akrep_disi.webp',
  item_karanlik_yemin: 'assets/ui/items/karanlik_yemin.webp',
  item_avci_basligi: 'assets/ui/items/avci_basligi.webp',
  item_deri_baslik: 'assets/ui/items/deri_baslik.webp',
  item_zirhli_migfer: 'assets/ui/items/zirhli_migfer.webp',
  item_sertlestirilmis_baslik: 'assets/ui/items/sertlestirilmis_baslik.webp',
  item_golge_basligi: 'assets/ui/items/golge_basligi.webp',
  item_avci_gomlegi: 'assets/ui/items/avci_gomlegi.webp',
  item_deri_gogusluk: 'assets/ui/items/deri_gogusluk.webp',
  item_sertlestirilmis_gogusluk: 'assets/ui/items/sertlestirilmis_gogusluk.webp',
  item_zirhli_gogusluk: 'assets/ui/items/zirhli_gogusluk.webp',
  item_avci_dizligi: 'assets/ui/items/avci_dizligi.webp',
  item_deri_pantolon: 'assets/ui/items/deri_pantolon.webp',
  item_zirhli_dizlik: 'assets/ui/items/zirhli_dizlik.webp',
  item_iz_surucu_pantolon: 'assets/ui/items/iz_surucu_pantolon.webp',
  item_avci_eldiveni: 'assets/ui/items/avci_eldiveni.webp',
  item_deri_eldiven: 'assets/ui/items/deri_eldiven.webp',
  item_zirhli_eldiven: 'assets/ui/items/zirhli_eldiven.webp',
  item_iz_surucu_eldiven: 'assets/ui/items/iz_surucu_eldiven.webp',
  item_avci_cizmesi: 'assets/ui/items/avci_cizmesi.webp',
  item_deri_cizme: 'assets/ui/items/deri_cizme.webp',
  item_zirhli_cizme: 'assets/ui/items/zirhli_cizme.webp',
  item_golge_cizmesi: 'assets/ui/items/golge_cizmesi.webp',
  item_tunc_kupe: 'assets/ui/items/tunc_kupe.webp',
  item_sahin_kupesi: 'assets/ui/items/sahin_kupesi.webp',
  item_kekuri_yuzugu: 'assets/ui/items/kekuri_yuzugu.webp',
  item_zumrut_yuzuk: 'assets/ui/items/zumrut_yuzuk.webp',
  item_kizil_ejder: 'assets/ui/items/kizil_ejder.webp',
  item_yasam_kusagi: 'assets/ui/items/yasam_kusagi.webp',
  item_parsomen: 'assets/ui/items/parsomen.webp',
  item_yasam_tasi: 'assets/ui/items/yasam_tasi.webp',
  item_yasam_suyu: 'assets/ui/items/yasam_suyu.webp',
  item_ruh_iksiri: 'assets/ui/items/ruh_iksiri.webp',
  /* P2.18 — zemin dokusu (GEÇİCİ, sonra değişecek).
     Kullanıcının ürettiği çim/toprak dokusu. Tileable olduğu ÖLÇÜLEREK
     doğrulandı: sol-sağ kenar farkı 13,9 ve üst-alt 13,1; dokunun kendi
     iç komşu-sütun farkı 11,8. Kenarlar iç dokudan ayırt edilemiyor →
     döşendiğinde dikiş görünmez.
     512×512 WebP, 83 KB (kaynak 1254×1254 PNG). */
  ground_texture: 'assets/nature/ground.webp',
  /* P2.23 — envanter paneli. TEK PARÇA: çerçeve, yuva zeminleri, etiket
     şeritleri, yer tutucu ikonlar ve üç düğme zemini aynı görselde.
     Parçalara ayırmadım çünkü maket zaten hizalı üretildi; kesip yeniden
     hizalamak hata kaynağı olurdu. Metin ve item ikonları ÜSTÜNE çizilir. */
  ui_inv_panel: 'assets/ui/inv_panel.webp',
  /* P2.25 — üç panel daha. Hepsi 941×1672 maket ölçüsünde ve YAZISIZ;
     metin, ikon ve durum vurgusu kod tarafından çizilir. */
  ui_char_panel: 'assets/ui/char_panel.webp',
  ui_skill_panel: 'assets/ui/skill_panel.webp',
  ui_genie_panel: 'assets/ui/genie_panel.webp',
  ui_player_card: 'assets/ui/ui_player_card.webp',
  ui_target_card: 'assets/ui/ui_target_card.webp',
  ui_genie_toggle: 'assets/ui/ui_genie_toggle.webp',
  ui_settings: 'assets/ui/ui_settings.webp',
  ui_nav_canta: 'assets/ui/ui_nav_canta.webp',
  ui_nav_karakter: 'assets/ui/ui_nav_karakter.webp',
  ui_nav_yetenek: 'assets/ui/ui_nav_yetenek.webp',
  ui_nav_ors: 'assets/ui/ui_nav_ors.webp',
  ui_nav_menu: 'assets/ui/ui_nav_menu.webp',
  ui_exp_bar: 'assets/ui/ui_exp_bar.webp',
  ui_joy_base: 'assets/ui/ui_joy_base.webp',
  ui_joy_knob: 'assets/ui/ui_joy_knob.webp',
  ui_page_dots: 'assets/ui/ui_page_dots.webp',
  ui_skill_standart: 'assets/ui/ui_skill_standart.webp',
  ui_skill_yesil: 'assets/ui/ui_skill_yesil.webp',
  ui_skill_kara: 'assets/ui/ui_skill_kara.webp',
  ui_skill_golge: 'assets/ui/ui_skill_golge.webp',
  ui_skill_uclu: 'assets/ui/ui_skill_uclu.webp',
  ui_target_btn: 'assets/ui/ui_target_btn.webp',
  ui_btn_potion: 'assets/ui/ui_btn_potion.webp',
  ui_btn_gear: 'assets/ui/ui_btn_gear.webp',
  ui_frame_a: 'assets/ui/ui_frame_a.webp',
  ui_frame_b: 'assets/ui/ui_frame_b.webp',
  ui_frame_c: 'assets/ui/ui_frame_c.webp',
  ui_arrow_left: 'assets/ui/ui_arrow_left.webp',
  ui_arrow_right: 'assets/ui/ui_arrow_right.webp',
  ui_corner_tl: 'assets/ui/ui_corner_tl.webp',
  ui_corner_tr: 'assets/ui/ui_corner_tr.webp',
  ui_divider: 'assets/ui/ui_divider.webp',
  ui_divider_small: 'assets/ui/ui_divider_small.webp',
};

export const PROTO_ASSETS: Record<string, string> = {
  ...UI_ASSETS,
  gt_okcu_y_on: 'assets/legacy/gt_okcu_y_on.webp',
  gt_okcu_y_on_sag: 'assets/legacy/gt_okcu_y_on_sag.webp',
  gt_okcu_y_arka_sag: 'assets/legacy/gt_okcu_y_arka_sag.webp',
  gt_okcu_y_arka: 'assets/legacy/gt_okcu_y_arka.webp',
  gt_okcu_y_arka_sol: 'assets/legacy/gt_okcu_y_arka_sol.webp',
  gt_okcu_y_sol: 'assets/legacy/gt_okcu_y_sol.webp',
  gt_okcu_y_on_sol: 'assets/legacy/gt_okcu_y_on_sol.webp',
  gt_okcu_olum: 'assets/legacy/gt_okcu_olum.webp',
};

/** Karenin görünen içeriğinin ALT kenarı ile kare tabanı arasındaki boşluk (kaynak px).
 *  Ölçüldü: 300 px'lik karede içerik ~264'te bitiyor → 36 px şeffaf pay.
 *  Bu telafi edilmezse karakter HAVADA duruyor gibi görünür. */
export const OKCU_FOOT_PAD = 36;
export const OKCU_FRAME = 300;

/** 8 yön → sayfa anahtarı. Açı 0 = +X (sağ), saat yönünde artar (ekran Y aşağı). */
export const OKCU_DIRECTION_SHEETS = [
  'gt_okcu_y_sag',        // 0   →  sağ
  'gt_okcu_y_on_sag',     // 45  →  sağ-ön (aşağı-sağ)
  'gt_okcu_y_on',         // 90  →  ön (aşağı)
  'gt_okcu_y_on_sol',     // 135 →  sol-ön
  'gt_okcu_y_sol',        // 180 →  sol
  'gt_okcu_y_arka_sol',   // 225 →  sol-arka (yukarı-sol)
  'gt_okcu_y_arka',       // 270 →  arka (yukarı)
  'gt_okcu_y_arka_sag',   // 315 →  sağ-arka
] as const;

/** Açıyı (radyan) 8 yönden birine yuvarlar. */
export function directionIndex(angleRad: number): number {
  const deg = ((angleRad * 180) / Math.PI + 360) % 360;
  return Math.round(deg / 45) % 8;
}

export function okcuSheet(angleRad: number): string {
  return OKCU_DIRECTION_SHEETS[directionIndex(angleRad)];
}

/* ═══════════════════════════ P2.1 — 3D MODEL MANİFESTİ ═══════════════════════════
 *
 *  GLB **görsel varlıktır**, `PROTO_ASSETS` gibi `loadImage()` ile YÜKLENMEZ:
 *  ayrı bir kayıt olmasının sebebi budur (main.ts görüntü ön-yüklemesi bu
 *  anahtarları GÖRMEZ). `pack-preview.mjs` yine de burayı tarar ve dosyayı
 *  önizleme HTML'ine `model/gltf-binary` data URI olarak gömer.
 *
 *  Kaynak: `archer_mobile_v1.glb` — 929 200 bayt, sha256
 *  f48f0ebca9d3c405623f2a325deb0439a3903808754929845b492da84f661ff4.
 *  Dosya YENİDEN OPTİMİZE EDİLMEDİ; animasyon/kemik/doku verisine
 *  DOKUNULMADI (P2.1 asset override kuralı). */
export const PROTO_MODELS: Record<string, string> = {
  archer_glb: 'assets/models/archer_mobile_v1.glb',
  /* P2.2 — mutant mob. 822 716 bayt, sha256
     50f1e7bf726bad773912bfdfc623e4c4a7a5080c1914d0e5d03ff25c4091f01b.
     Dosya YENİDEN OPTİMİZE EDİLMEDİ. */
  mutant_glb: 'assets/models/mutant_mobile_v1.glb',
  /* P2.4 — ok projectile'ı. 38 804 bayt, sha256
     3bb19b3ad5e4689bd7996cfbe1bbba3978832683836139ac44ca276e8c9700db.
     Statik mesh: skin/iskelet/animasyon YOK. */
  arrow_glb: 'assets/models/arrow_mobile_v1.glb',
  /* P2.28 — ZAYIF MOB MODELİ (Sv1-10). Kecoon iskeletine bağlanmış
     goblin mesh'i; 747 064 bayt. Güçlü moblar mutant modelini
     kullanmaya devam eder — silüet farkı seviye bandını okutur.
     LİSANS: mesh CC-BY-4.0 / RapidAssets, GÖRÜNÜR künye zorunlu. */
  kecoon_glb: 'assets/models/kecoon_goblin_mobile_v1.glb',

  /* ═══════════ P2.11 — DOĞA VARLIKLARI ═══════════
     Kaynak: Stylized Nature MegaKit (68 model). Yalnız 7 aile alındı;
     her aileden TEK model, varyantlar elenmedi — sahnede aynı model
     tekrar tekrar örneklenir (68 dosya yerine 7 dosya, 8,8 MB yerine
     661 KB).

     OPTİMİZASYON: kaynak dokular 1024×1024 PNG'ydi (68 dosyada 77,7 MB).
     128×128 JPEG q78'e indirildi. Geometriye DOKUNULMADI — üçgen sayısı,
     kemik ve materyal yapısı kaynaktaki gibi.

     Twisted Tree (9 600 üçgen) ALINMADI: tek başına diğer üç ağacın
     toplamı kadar. Yol taşları ve mantarlar Moradon'a uymadığı için
     kapsam dışı. */
  nature_agac: 'assets/nature/agac.glb',
  nature_cam: 'assets/nature/cam.glb',
  nature_olu_agac: 'assets/nature/olu_agac.glb',
  nature_cali: 'assets/nature/cali.glb',
  nature_ot: 'assets/nature/ot.glb',
  nature_cicek: 'assets/nature/cicek.glb',
  nature_kaya: 'assets/nature/kaya.glb',
};

/** Önizleme paketi varsa gömülü data URI, yoksa dosya yolu. */
export function modelSrc(key: keyof typeof PROTO_MODELS | string): string {
  const inline = (globalThis as { __ASSETS__?: Record<string, string> }).__ASSETS__;
  return inline?.[key] ?? PROTO_MODELS[key] ?? '';
}
