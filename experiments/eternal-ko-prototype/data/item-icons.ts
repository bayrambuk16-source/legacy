/** ITEM İKONLARI — P2.24
 *
 *  ══════════════ TEK EŞLEME NOKTASI ══════════════
 *  Kaynak referans → ikon anahtarı. Katalog tanımları kendi
 *  `iconKey` alanını taşıyor ama o alan SLOT bazlıydı (bütün yaylar
 *  aynı ikon). Bu tablo ITEM bazlıdır: her eşyanın kendi görseli var.
 *
 *  ══════════════ ÜRETİM ══════════════
 *  39 ikonluk tek bir sayfa üretildi, alfa kanalından her nesnenin
 *  KENDİ sınırı bulunarak tek tek kesildi ve 128×128 tuvale orantılı
 *  ortalandı. Sabit ızgarayla kesilseydi hücre genişlikleri eşit
 *  olmadığı için (159-189 px) bazı ikonlar kırpılırdı.
 *
 *  ══════════════ EKSİK İKON HATA DEĞİL ══════════════
 *  Tabloda olmayan referans için sunu katmanı SLOT ikonuna düşer.
 *  Katalog büyüdükçe ikonlar sonradan eklenir. */

/** Kaynak referans → ikon anahtarı. */
export const ITEM_ICONS: Readonly<Record<number, string>> = {
  160100000: 'item_kul_agaci_yay',
  160100002: 'item_mese_yay',
  160210000: 'item_kisa_avci_yayi',
  160100004: 'item_avci_yayi',
  160100006: 'item_celik_tendon',
  160410000: 'item_yirtici_yay',
  160210045: 'item_akrep_disi',
  160100005: 'item_karanlik_yemin',
  241003000: 'item_avci_basligi',
  241003503: 'item_deri_baslik',
  242003000: 'item_zirhli_migfer',
  241003504: 'item_sertlestirilmis_baslik',
  241003505: 'item_golge_basligi',
  241001000: 'item_avci_gomlegi',
  241001503: 'item_deri_gogusluk',
  241001504: 'item_sertlestirilmis_gogusluk',
  242001000: 'item_zirhli_gogusluk',
  241002000: 'item_avci_dizligi',
  241002503: 'item_deri_pantolon',
  242002000: 'item_zirhli_dizlik',
  241002505: 'item_iz_surucu_pantolon',
  241004000: 'item_avci_eldiveni',
  241004503: 'item_deri_eldiven',
  242004000: 'item_zirhli_eldiven',
  241004505: 'item_iz_surucu_eldiven',
  241005000: 'item_avci_cizmesi',
  241005503: 'item_deri_cizme',
  242005000: 'item_zirhli_cizme',
  241005504: 'item_golge_cizmesi',
  310110101: 'item_tunc_kupe',
  310110103: 'item_sahin_kupesi',
  330310014: 'item_kekuri_yuzugu',
  330110262: 'item_zumrut_yuzuk',
  320310129: 'item_kizil_ejder',
  340110101: 'item_yasam_kusagi',
  379016000: 'item_parsomen',
  379006000: 'item_yasam_tasi',
  389011000: 'item_yasam_suyu',
  389016000: 'item_ruh_iksiri',
};

/** Manifest yolları — `PROTO_ASSETS` bunları yükler. */
export const ITEM_ICON_PATHS: Readonly<Record<string, string>> = {

  item_kul_agaci_yay: 'assets/items/kul_agaci_yay.webp',
  item_mese_yay: 'assets/items/mese_yay.webp',
  item_kisa_avci_yayi: 'assets/items/kisa_avci_yayi.webp',
  item_avci_yayi: 'assets/items/avci_yayi.webp',
  item_celik_tendon: 'assets/items/celik_tendon.webp',
  item_yirtici_yay: 'assets/items/yirtici_yay.webp',
  item_akrep_disi: 'assets/items/akrep_disi.webp',
  item_karanlik_yemin: 'assets/items/karanlik_yemin.webp',
  item_avci_basligi: 'assets/items/avci_basligi.webp',
  item_deri_baslik: 'assets/items/deri_baslik.webp',
  item_zirhli_migfer: 'assets/items/zirhli_migfer.webp',
  item_sertlestirilmis_baslik: 'assets/items/sertlestirilmis_baslik.webp',
  item_golge_basligi: 'assets/items/golge_basligi.webp',
  item_avci_gomlegi: 'assets/items/avci_gomlegi.webp',
  item_deri_gogusluk: 'assets/items/deri_gogusluk.webp',
  item_sertlestirilmis_gogusluk: 'assets/items/sertlestirilmis_gogusluk.webp',
  item_zirhli_gogusluk: 'assets/items/zirhli_gogusluk.webp',
  item_avci_dizligi: 'assets/items/avci_dizligi.webp',
  item_deri_pantolon: 'assets/items/deri_pantolon.webp',
  item_zirhli_dizlik: 'assets/items/zirhli_dizlik.webp',
  item_iz_surucu_pantolon: 'assets/items/iz_surucu_pantolon.webp',
  item_avci_eldiveni: 'assets/items/avci_eldiveni.webp',
  item_deri_eldiven: 'assets/items/deri_eldiven.webp',
  item_zirhli_eldiven: 'assets/items/zirhli_eldiven.webp',
  item_iz_surucu_eldiven: 'assets/items/iz_surucu_eldiven.webp',
  item_avci_cizmesi: 'assets/items/avci_cizmesi.webp',
  item_deri_cizme: 'assets/items/deri_cizme.webp',
  item_zirhli_cizme: 'assets/items/zirhli_cizme.webp',
  item_golge_cizmesi: 'assets/items/golge_cizmesi.webp',
  item_tunc_kupe: 'assets/items/tunc_kupe.webp',
  item_sahin_kupesi: 'assets/items/sahin_kupesi.webp',
  item_kekuri_yuzugu: 'assets/items/kekuri_yuzugu.webp',
  item_zumrut_yuzuk: 'assets/items/zumrut_yuzuk.webp',
  item_kizil_ejder: 'assets/items/kizil_ejder.webp',
  item_yasam_kusagi: 'assets/items/yasam_kusagi.webp',
  item_parsomen: 'assets/items/parsomen.webp',
  item_yasam_tasi: 'assets/items/yasam_tasi.webp',
  item_yasam_suyu: 'assets/items/yasam_suyu.webp',
  item_ruh_iksiri: 'assets/items/ruh_iksiri.webp',
};

/** Bir eşyanın ikon anahtarı. Yoksa `null` — çağıran slot ikonuna düşer. */
export function itemIconKey(sourceRef: number): string | null {
  return ITEM_ICONS[sourceRef] ?? null;
}
