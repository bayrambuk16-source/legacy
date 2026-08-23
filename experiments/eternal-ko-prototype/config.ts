/** EXPERIMENT P1 — prototip ayarları.
 *  Buradaki hiçbir değer ana oyunu etkilemez; ana `src/game/config.ts` dosyasına
 *  dokunulmamıştır. DEV panelinden runtime'da değiştirilebilen alanlar `Tuning`
 *  sınıfındadır — kamera hissini kod değiştirmeden aramak için. */

export interface TuningValues {
  /** Kamera takibi yumuşatma katsayısı (büyük = daha çabuk yapışır), 1/sn. */
  cameraFollow: number;
  /** Look-ahead: ekran genişliğinin/yüksekliğinin yüzdesi (0.05-0.08 hedef bandı). */
  cameraLookAheadPct: number;
  /** Oyuncunun ekrandaki dikey konumu (0.58-0.63 hedef bandı). */
  cameraPlayerYPct: number;
  /** Oyuncu hareket hızı, world birimi/sn.
   *  P1.4.1: varsayılan 210 → **120**. Bu GERÇEK world hareket hızıdır;
   *  combat, projectile, kamera ve cooldown hızları bununla ÖLÇEKLENMEZ ve
   *  oyun global `timeScale` ile yavaşlatılmaz. */
  playerSpeed: number;
  /** 2.5D: worldY ekranda bu oranla sıkışır (1 = tepeden bakış, 0.5 = çok yatık). */
  worldYCompression: number;
  /** Karakter/mob sprite ölçeği. */
  characterScale: number;
  /** Slot config'lerindeki aggro yarıçapına uygulanan çarpan. */
  aggroRadiusMult: number;
}

/** P1.4.1 — DEV playtest presetleri (world birimi/sn). */
export const PLAYER_SPEED_OPTIONS = [90, 120, 150] as const;
export const PLAYER_SPEED_DEFAULT = 120;

export const TUNING_DEFAULTS: TuningValues = {
  cameraFollow: 6.5,
  cameraLookAheadPct: 0.065,
  cameraPlayerYPct: 0.60,
  playerSpeed: PLAYER_SPEED_DEFAULT,
  worldYCompression: 0.62,
  characterScale: 0.78,
  aggroRadiusMult: 1.0,
};

/** DEV panelinin düzenlediği canlı ayar kabı. */
export class Tuning {
  values: TuningValues = { ...TUNING_DEFAULTS };
  reset(): void { this.values = { ...TUNING_DEFAULTS }; }
  set<K extends keyof TuningValues>(k: K, v: TuningValues[K]): void { this.values[k] = v; }
  get<K extends keyof TuningValues>(k: K): TuningValues[K] { return this.values[k]; }
}

/** Sabit prototip parametreleri (DEV panelinde yok). */
export interface ProtoConstants {
  screenW: number; screenH: number;
  joystickRadius: number; joystickDeadZone: number;
  joystickCenter: { x: number; y: number };
  playerRadius: number;
  lookAheadFollow: number;
  targetFramingPct: number; targetFramingMaxDist: number;
  lootLifeSec: number; lootPickupRadius: number;
  startLevel: number;
  startPotions: Array<{ itemRef: number; quantity: number }>;
  monsterHpMultiplier: number;
  expMultiplier: number;
  monsterDamageMultiplier: number;
}

export const PROTO: ProtoConstants = {
  /** Mantıksal ekran (ana oyunla aynı portrait alan). */
  screenW: 620,
  screenH: 1100,
  /** Joystick */
  joystickRadius: 92,
  joystickDeadZone: 0.18,
  /* P2.6 — yeni HUD'da alt menü 928 px'te başlıyor; joystick tabanı (ui(260)
     ≈ 171 px) ona girmesin diye merkez 880 → 838 yükseltildi. */
  joystickCenter: { x: 122, y: 838 },
  /** Oyuncu çarpışma yarıçapı (world birimi) */
  playerRadius: 20,
  /** Kamera look-ahead dönüş yumuşatması (joystick bırakılınca merkeze dönüş) */
  lookAheadFollow: 3.2,
  /** Hedef seçiliyken kamera framing'inin hedefe kayma oranı (çok hafif) */
  targetFramingPct: 0.18,
  /** Bu mesafeden uzaktaki hedef için framing uygulanmaz (world) */
  targetFramingMaxDist: 520,
  /** Yerdeki lootun ömrü (sn) ve toplama yarıçapı (world) */
  /* P1.7 — PROJECT LEGACY TUNING (kaynaktan gelmez).
     Yerdeki ganimet ömrü ve MANUEL toplama yarıçapı. Auto Loot bu iki
     değerin HİÇBİRİNE bağlı değildir (mesafesizdir). */
  lootLifeSec: 60,
  lootPickupRadius: 70,
  /** Prototip oyuncusu bu seviyede başlar.
   *  ARCHER COMBAT V1: 15 skillin en üstü "Dark pursuer / Kara Takip" KAYNAK seviye
   *  şartı 70'tir (skills.json authoritative). Hepsi test edilebilsin diye başlangıç
   *  seviyesi 70. (P1.1'de 55'ti — arrow shower şartı.)
   *  Ana oyunun MVP tavanı (LEVELING.maxLevel = 20) DEĞİŞMEDİ; bu yalnız prototip
   *  state'inde doğrudan alan ataması ile yapılır (bkz. state.ts). */
  /* P2.8 — oyun testi için 1'e çekildi. Denge eğrisini baştan görmek gerekiyor;
     70 ile başlamak ilk saatleri atlıyordu. DEV panelinden değişmez, buradan. */
  startLevel: 1,
  /** Genie iksir eşiklerini test edebilmek için başlangıç iksirleri.
   *  İki farklı güç seviyesi var: Genie "eksiği karşılayan en küçük iksir"i seçer. */
  startPotions: [
    { itemRef: 389011000, quantity: 20 },   // Yaşam Suyu  (%25 HP)
    { itemRef: 389012000, quantity: 10 },   // Sevgi Suyu  (%40 HP)
    { itemRef: 389016000, quantity: 20 },   // Ruh İksiri  (%25 MP)
    { itemRef: 389017000, quantity: 10 },   // Zihin İksiri(%40 MP)
  ],
  /** Sv55 oyuncuya karşı Sv1-15 mobları anlamlı kalsın diye PROTOTİP denge katsayıları.
   *  Kaynak DB değerleri DEĞİŞMEZ — BalanceProfile runtime çarpanıdır. */
  /* P2.5A — MOB CANI ARTIK KAYNAK DEĞERİDİR.
     Çarpan 8 idi: KO hasar formülü gelmeden önce oyuncu hasarı çok düşük
     olduğu için mob canı yapay olarak şişirilmişti. KO zinciri kendi
     dengesini taşıdığı için çarpan 1'e çekildi — Sv1 solucan (7 can) iki
     atışta ölür, kaynak temposu budur. Mob HASARI çarpanına DOKUNULMADI. */
  monsterHpMultiplier: 1,
  /* P2.32 — MOB HASARI YARIYA. Oyun testi bulgusu: "moblar çok fazla
     vuruyor". Çarpan 8'den 4'e indi (kullanıcı kararı).

     Kaynak mob hasarı DEĞİŞMEDİ — bu bir denge çarpanıdır. P2.5A'da
     mob CANI 8'den 1'e çekilmişti ama HASAR çarpanına dokunulmamıştı;
     yani mob ölmesi kolaylaşırken vuruşu aynı sert kalmıştı. */
  monsterDamageMultiplier: 4,
  /* P2.14 — EXP ÇARPANI (kullanıcı kararı, kaynaktan gelmez).
     Ölçüm: kaynak eğrisiyle Lv1→20 yalnız 106 kill ≈ 19 dakika sürüyordu.
     KO'nun Lv1-20 bandı zaten hızlıdır (asıl duvar Lv20+), ama Moradon
     tavanı 20 olduğu için oyunun TAMAMI o hızlı banda düşüyor.
     0.4 ile süre ~45-50 dakikaya çıkar. Seviye farkı cezasıyla birlikte
     (bkz. `EXP_LEVEL_GAP`) gerçek tempo daha da uzar. */
  expMultiplier: 0.4,
};
