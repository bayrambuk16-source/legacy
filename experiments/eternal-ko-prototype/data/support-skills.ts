/** DESTEK SKILL AĞACI — SOL BAR (P2.42)
 *
 *  ══════════════ NEDEN VAR ══════════════
 *  Ölçüldü: Sv50'de 82 skill puanı var, on iki okçu skillini açmak 24
 *  puan yetiyor. Elli sekiz puan gidecek yer bulamıyordu.
 *
 *  Sebep tek ağaç kullanmamız. KO'da Rogue'un DÖRT sekmesi var; okçunun
 *  ikinci sekmesi Gizlenme/Hayatta Kalma ağacı (grp 1087). Kaynak
 *  belgede "okçunun asıl destek sekmesi" diye geçiyor.
 *
 *  ══════════════ PUAN KURALI KO'NUNKİ ══════════════
 *  Puan skill SATIN ALMAZ, AĞACA YATIRILIR. Bir skilli kullanmak için
 *  o ağaçta skillin SEVİYESİ kadar puan olmalı.
 *
 *  Kullanıcının verdiği referans: Sv60'ta archery 60 + destek 42 = 102,
 *  bizim Sv60 bütçemizle birebir aynı. Yani fazla puan diye bir şey
 *  kalmıyor — puan derinliğin kendisi.
 *
 *  Sv50'de 82 puan: 50'si okçuluğa giderse Engerek Oku açılır, kalan 32
 *  destekte Safety'ye kadar getirir. Light Feet (35) açılmaz; istersen
 *  okçudan kısarsın ve Engerek'i kaybedersin. Gerilim burada.
 *
 *  ══════════════ KAYNAKTAN ÜÇ SAPMA ══════════════
 *  1. SAVUNMA YÜZDEYE ÇEVRİLDİ. Kaynak "+200/+400 savunma" diyor.
 *     Ölçüldü — bizim formülümüz ÇIKARMA tabanlı (`hasar = saldırı −
 *     savunma × 0,1`), kaynağınki BÖLME tabanlı. Aynı sayı aynı etkiyi
 *     vermiyor:
 *
 *         Sv20  taban vuruş 20 → +400 ile 1     (%95 azalma, ölümsüzlük)
 *         Sv50  taban vuruş 301 → +400 ile 266  (%12 azalma, hiçbir şey)
 *
 *     Yüzde her seviyede aynı hissi üretiyor: 1,7 kat dayanma süresi.
 *
 *  2. SALDIRI CEZASI KALDIRILDI. Kaynakta savunma açıkken saldırı gücü
 *     %10'a düşüyor. Genie otomatik farm ettiği için bu oyunu durdurur.
 *     Yerine BEKLEME SÜRESİ sınırlıyor: iki savunma skilini döndürerek
 *     en fazla %75 kapsama alınır, kesintisiz koruma imkânsız.
 *
 *  3. ÜÇ SKILL TÜRETİLDİ. `MINOR_HEALING_II`, `WOLF_II/III` ve
 *     `SMOKE_SCREEN_II` kaynakta YOK.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. */

/** Destek skill kimlikleri — kaynak `108xxx` ailesi (grp 1087/1080). */
export const SUPPORT = {
  SWIFT: 108010,
  MINOR_HEALING: 108705,
  MINOR_HEALING_II: 908705,      // türetildi
  EVADE: 108710,
  WOLF: 108030,
  WOLF_II: 908030,               // türetildi
  WOLF_III: 908031,              // türetildi
  SAFETY: 108730,
  LIGHT_FEET: 108725,
  SCALED_SKIN: 108760,
  SMOKE_SCREEN: 108780,
  SMOKE_SCREEN_II: 908780,       // türetildi
} as const;

/** Bir destek skillinin ne yaptığı. Etki türleri mevcut skill
 *  sisteminin desteklediklerinden seçildi; yeni bir sistem YOK. */
export type SupportEffect =
  /** Gelen hasarı ORANSAL azaltır (kaynak "+savunma" değil, bkz. sapma 1). */
  | { kind: 'damageReduction'; percent: number; durationSec: number }
  /** Saldırı gücünü çarpar. */
  | { kind: 'attackBuff'; percent: number; durationSec: number }
  /** Hareket hızını çarpar. */
  | { kind: 'speedBuff'; percent: number; durationSec: number }
  /** Anlık can yeniler. */
  | { kind: 'heal'; amount: number }
  /** Düşmanın savunmasını siler. */
  | { kind: 'defenseBreak'; percent: number; durationSec: number };

export interface SupportSkill {
  readonly ref: number;
  readonly displayName: string;
  readonly sourceName: string;
  /** Bu skilli kullanmak için destek ağacında gereken puan. Kaynak
   *  seviyesiyle AYNI sayıdır — KO kuralı budur. */
  readonly treePoints: number;
  readonly manaCost: number;
  /** Yeniden kullanım süresi. Savunma skillerinde bu, kesintisiz
   *  korumayı ENGELLEYEN şeydir (bkz. sapma 2). */
  readonly cooldownSec: number;
  readonly effect: SupportEffect;
  /** Aynı hattın bir alt kademesi; yoksa `null`. Üst kademeyi almak
   *  için alt kademe GEREKLİ değildir (puan zaten yeterli olmalı) ama
   *  UI hattı bununla gruplar. */
  readonly line: string;
  /** Kaynakta karşılığı var mı? `false` ise TÜRETİLMİŞTİR. */
  readonly fromSource: boolean;
}

export const SUPPORT_SKILLS: readonly SupportSkill[] = [
  {
    ref: SUPPORT.SWIFT, displayName: 'Çeviklik', sourceName: 'Swift',
    treePoints: 1, manaCost: 15, cooldownSec: 0,
    effect: { kind: 'speedBuff', percent: 150, durationSec: 600 },
    line: 'speed', fromSource: true,
  },
  {
    ref: SUPPORT.MINOR_HEALING, displayName: 'Küçük Şifa', sourceName: 'Minor Healing',
    treePoints: 10, manaCost: 100, cooldownSec: 6,
    effect: { kind: 'heal', amount: 60 },
    line: 'heal', fromSource: true,
  },
  {
    ref: SUPPORT.EVADE, displayName: 'Sıyrılma', sourceName: 'Evade',
    treePoints: 20, manaCost: 40, cooldownSec: 40,
    effect: { kind: 'damageReduction', percent: 25, durationSec: 15 },
    line: 'defense', fromSource: true,
  },
  {
    ref: SUPPORT.WOLF, displayName: 'Kurt Gücü', sourceName: 'Strength of Wolf',
    treePoints: 25, manaCost: 30, cooldownSec: 0,
    effect: { kind: 'attackBuff', percent: 10, durationSec: 120 },
    line: 'attack', fromSource: true,
  },
  {
    ref: SUPPORT.SAFETY, displayName: 'Korunma', sourceName: 'Safety',
    treePoints: 30, manaCost: 80, cooldownSec: 40,
    effect: { kind: 'damageReduction', percent: 40, durationSec: 15 },
    line: 'defense', fromSource: true,
  },
  {
    ref: SUPPORT.LIGHT_FEET, displayName: 'Hafif Ayak', sourceName: 'Light Feet',
    treePoints: 35, manaCost: 40, cooldownSec: 30,
    effect: { kind: 'speedBuff', percent: 200, durationSec: 10 },
    line: 'burst', fromSource: true,
  },
  {
    ref: SUPPORT.MINOR_HEALING_II, displayName: 'Şifa II', sourceName: '—',
    treePoints: 35, manaCost: 120, cooldownSec: 6,
    effect: { kind: 'heal', amount: 80 },
    line: 'heal', fromSource: false,
  },
  {
    ref: SUPPORT.WOLF_II, displayName: 'Kurt Gücü II', sourceName: '—',
    treePoints: 45, manaCost: 40, cooldownSec: 0,
    effect: { kind: 'attackBuff', percent: 15, durationSec: 120 },
    line: 'attack', fromSource: false,
  },
  {
    ref: SUPPORT.SCALED_SKIN, displayName: 'Pullu Deri', sourceName: 'Scaled Skin',
    treePoints: 50, manaCost: 160, cooldownSec: 40,
    effect: { kind: 'damageReduction', percent: 50, durationSec: 15 },
    line: 'defense', fromSource: true,
  },
  {
    ref: SUPPORT.SMOKE_SCREEN, displayName: 'Duman Perdesi', sourceName: 'Smoke Screen',
    treePoints: 60, manaCost: 250, cooldownSec: 30,
    effect: { kind: 'defenseBreak', percent: 30, durationSec: 10 },
    line: 'weaken', fromSource: true,
  },
  {
    ref: SUPPORT.WOLF_III, displayName: 'Kurt Gücü III', sourceName: '—',
    treePoints: 65, manaCost: 50, cooldownSec: 0,
    effect: { kind: 'attackBuff', percent: 20, durationSec: 120 },
    line: 'attack', fromSource: false,
  },
  {
    ref: SUPPORT.SMOKE_SCREEN_II, displayName: 'Duman Perdesi II', sourceName: '—',
    treePoints: 70, manaCost: 300, cooldownSec: 30,
    effect: { kind: 'defenseBreak', percent: 45, durationSec: 10 },
    line: 'weaken', fromSource: false,
  },
];

/** Sol barın yuva sayısı — kullanıcı kararı. On iki skill, sekiz yuva:
 *  hepsini aynı anda taşıyamazsın. */
export const SUPPORT_BAR_SLOTS = 8;

export function supportSkill(ref: number): SupportSkill | undefined {
  return SUPPORT_SKILLS.find((s) => s.ref === ref);
}

/** Destek ağacında bu kadar puan varken kullanılabilir skiller. */
export function unlockedSupport(treePoints: number): SupportSkill[] {
  return SUPPORT_SKILLS.filter((s) => s.treePoints <= treePoints);
}

/** ═══ SAVUNMA ROTASYONU ═══
 *
 *  Üç savunma skilli aynı anda taşınır; biri bitince diğerine basılır.
 *  Süre 15 sn, bekleme 40 sn — üçüyle en fazla 45 sn'lik koruma, 40
 *  sn'lik döngüde. Yani kesintisiz koruma MÜMKÜN ama ancak ÜÇÜ de
 *  açıkken; ikisiyle %75'te kalınır.
 *
 *  Bu, saldırı cezası yerine geçen kısıttır (bkz. sapma 2). */
export function defenseUptime(skills: readonly SupportSkill[]): number {
  const def = skills.filter((s) => s.effect.kind === 'damageReduction');
  if (def.length === 0) return 0;
  const covered = def.reduce((n, s) =>
    n + (s.effect.kind === 'damageReduction' ? s.effect.durationSec : 0), 0);
  const cycle = Math.max(...def.map((s) => s.cooldownSec));
  return Math.min(1, covered / Math.max(1, cycle));
}
