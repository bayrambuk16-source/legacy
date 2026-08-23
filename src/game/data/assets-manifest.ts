/** Asset manifesti — key → dosya yolu.
 *  Önizleme paketinde (tek dosya HTML) pack-preview.mjs bu yolları
 *  window.__ASSETS__ içindeki data URI'larla değiştirir. */

export const ASSET_MANIFEST: Record<string, string> = {
  acilis: 'assets/legacy/acilis.webp',
  hud_coin: 'assets/legacy/hud_coin.webp',
  hud_tas: 'assets/legacy/hud_tas.webp',
  pr_ortak: 'assets/legacy/pr_ortak.webp',
  pr_warrior: 'assets/legacy/pr_warrior.webp',
  pr_okcu: 'assets/legacy/pr_okcu.webp',
  pr_mage: 'assets/legacy/pr_mage.webp',
  pr_priest: 'assets/legacy/pr_priest.webp',
  es_okcu_silah: 'assets/legacy/es_okcu_silah.webp',
  es_okcu_yardimci: 'assets/legacy/es_okcu_yardimci.webp',
  es_okcu_kask: 'assets/legacy/es_okcu_kask.webp',
  es_okcu_zirh: 'assets/legacy/es_okcu_zirh.webp',
  es_okcu_eldiven: 'assets/legacy/es_okcu_eldiven.webp',
  es_okcu_pantolon: 'assets/legacy/es_okcu_pantolon.webp',
  es_okcu_bot: 'assets/legacy/es_okcu_bot.webp',
  es_okcu_kolye: 'assets/legacy/es_okcu_kolye.webp',
  es_okcu_yuzuk: 'assets/legacy/es_okcu_yuzuk.webp',
  es_okcu_tilsim: 'assets/legacy/es_okcu_tilsim.webp',
  gt_okcu_y_sag: 'assets/legacy/gt_okcu_y_sag.webp',
  bg_orman: 'assets/legacy/bg1.webp',
  kd_kurt_k: 'assets/legacy/kd_kurt_k.webp',
  kd_kurt_s: 'assets/legacy/kd_kurt_s.webp',
  kd_kurt_o: 'assets/legacy/kd_kurt_o.webp',
  zemin1: 'assets/legacy/zt1.webp',
  mn2_drop: 'assets/legacy/mn2_drop.webp',
  mn2_envanter: 'assets/legacy/mn2_envanter.webp',
  mn2_ors: 'assets/legacy/mn2_ors.webp',
  mn2_karakter: 'assets/legacy/mn2_karakter.webp',
  mn2_yetenek: 'assets/legacy/mn2_yetenek.webp',
  mn2_harita: 'assets/legacy/mn2_harita.webp',
  mn2_gorev: 'assets/legacy/mn2_gorev.webp',
  mn2_ayar: 'assets/legacy/mn2_ayar.webp',
};

declare global {
  interface Window { __ASSETS__?: Record<string, string> }
}

/** Önizleme paketi varsa gömülü data URI, yoksa dosya yolu döner. */
export function assetSrc(key: string): string {
  const inline = typeof window !== 'undefined' ? window.__ASSETS__ : undefined;
  return inline?.[key] ?? ASSET_MANIFEST[key] ?? '';
}
