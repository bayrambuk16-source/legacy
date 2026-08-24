/** DALGA MODU — KAT YAPILANDIRMASI (P3.1)
 *
 *  ══════════════ BU DOSYA NE YAPAR ══════════════
 *  Her katın hangi mobları, hangi dalga desenini, hangi ödül ölçeğini
 *  ve hangi önerilen gücü taşıdığını tanımlar. Doğuş, savaş ve çizim
 *  BURADA DEĞİLDİR.
 *
 *  ══════════════ MOBLAR AYNI ══════════════
 *  Kullanıcı kararı: yeni düşman yok, mevcut mob tanımları ve ADLARI
 *  aynen kullanılır. Kat, mobun seviye bandını seçer.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. */

import { Content } from '../../../src/game/data/GameContentRepository.js';

/** Dalga türü. Elit ve boss dalgaları mevcut mobların ÖLÇEKLENMİŞ
 *  hâlidir — yeni tanım eklenmez. */
export type WaveKind = 'normal' | 'elite' | 'boss';

export interface WavePlan {
  readonly index: number;
  readonly kind: WaveKind;
  /** Bu dalgada doğacak mob sayısı. */
  readonly count: number;
  /** Mob statlarına uygulanacak çarpan (can/saldırı). */
  readonly statMult: number;
}

/** ═══ DALGA DESENİ ═══
 *
 *  Beşte bir elit, yirmi beşte bir boss. Kullanıcının önerdiği iskelet;
 *  sayılar TUNING'dir.
 *
 *  Mob sayısı dalga ile ARTAR ama TAVANLIDIR: çizim tavanımız 30 görsel
 *  (`MAX_MOB_VISUALS`) ve mobil performansı bunun üstünü kaldırmaz. */
/** ═══ P3.23 — DALGA BOYU YENİDEN AÇILDI ═══
 *  P3.11'de tek moba indirilmişti çünkü kat 1 Sv1-5 bandındaydı ve
 *  üç mob başlangıç karakterini eziyordu. Kat adımı ikiye inince
 *  (`FLOOR_LEVEL_STEP`) kat 1 artık Sv1-2; üç zayıf mob sorun değil
 *  ve kill hacmi üç katına çıkıyor.
 *
 *  Bu, ölçülen asıl darboğazın çözümü: dalga başına mob sayısı. */
export const WAVE_MIN_COUNT = 3;
export const WAVE_MAX_COUNT = 12;

/** Sahadaki dalga bu kadar veya daha az canlıya inince SONRAKİ dalga
 *  doğar. Yürüyüş süresi dövüşle örtüşür; akış kesilmez. */
export const WAVE_OVERLAP_THRESHOLD = 1;
export const ELITE_EVERY = 5;
export const BOSS_EVERY = 25;

export function planWave(waveIndex: number): WavePlan {
  const boss = waveIndex > 0 && waveIndex % BOSS_EVERY === 0;
  const elite = !boss && waveIndex > 0 && waveIndex % ELITE_EVERY === 0;
  /* Sayı her dalgada bir artar, tavana kadar; boss TEK gelir. */
  const grown = Math.min(WAVE_MAX_COUNT, WAVE_MIN_COUNT + Math.floor(waveIndex / 3));
  if (boss) return { index: waveIndex, kind: 'boss', count: 1, statMult: 6 };
  if (elite) return { index: waveIndex, kind: 'elite', count: Math.max(2, Math.floor(grown / 2)), statMult: 2.2 };
  return { index: waveIndex, kind: 'normal', count: grown, statMult: 1 };
}

/** ═══ KAT → MOB SEVİYE BANDI ═══
 *
 *  Kat 1 Sv1-5, sonra her kat beş seviye yukarı. Kat 10'da Sv46-50,
 *  yani mevcut mob havuzunun tepesi. Kat 10'dan sonra mob aynı kalır,
 *  yalnız `statMult` büyür — kullanıcı kararı: yeni mob eklenmeyecek. */
/** ═══ P3.22 — KAT ADIMI 5'TEN 2'YE ═══
 *
 *  Ölçüldü: her kat mob seviyesini BEŞ artırıyordu ama oyuncu bir katı
 *  farm ederken ancak bir-iki seviye kazanıyordu. Katlar oyuncuyu
 *  geride bırakıyor, kat 3'te (Sv11-15) Sv6 bir karakter kilitleniyordu
 *  — otuz dakikalık oturumda 15. dakikadan sonra HİÇ kill yok.
 *
 *  İki seviyelik adım, oyuncunun kazanç hızına yakın. Kat sayısı 10'dan
 *  25'e çıkar; her kat daha kısa ve NEXT daha sık anlamlı olur. */
export const FLOOR_LEVEL_STEP = 2;
export const MAX_DISTINCT_FLOOR = 25;

export function floorLevelBand(floor: number): { min: number; max: number } {
  const f = Math.max(1, Math.min(MAX_DISTINCT_FLOOR, floor));
  return { min: (f - 1) * FLOOR_LEVEL_STEP + 1, max: f * FLOOR_LEVEL_STEP };
}

/** Kat 10'un ötesinde mob değişmez; zorluk çarpanla artar. */
export function floorStatMult(floor: number): number {
  if (floor <= MAX_DISTINCT_FLOOR) return 1;
  return 1.35 ** (floor - MAX_DISTINCT_FLOOR);
}

/** Katın mob havuzu — mevcut tanımlardan, ADLARI DEĞİŞMEDEN. */
export function floorMonsters(floor: number): number[] {
  const band = floorLevelBand(floor);
  const out = Content.monsters
    .filter((m) => m.level >= band.min && m.level <= band.max)
    .map((m) => m.sourceRef);
  if (out.length > 0) return out;
  /* Bant boşsa en yakın seviyeye düş — boş havuz "hiç mob gelmez"
     demektir ve kat oynanamaz olur. */
  const target = (band.min + band.max) / 2;
  let best = Content.monsters[0]!;
  for (const m of Content.monsters) {
    if (Math.abs(m.level - target) < Math.abs(best.level - target)) best = m;
  }
  return [best.sourceRef];
}

/** ═══ ÖDÜL ÖLÇEĞİ ═══
 *
 *  ═══ P3.23 — YARIM ÖDÜL KALDIRILDI ═══
 *  İlk tasarımda ödül normal haritanın yarısıydı. Otuz dakikalık
 *  ölçüm bunun modu geride bıraktığını gösterdi:
 *
 *      Moradon 30 dk → Sv10 · 908 kill · sıfır ölüm
 *      Zindan  30 dk → Sv 9 · 153 kill · on üç ölüm
 *
 *  Seviye yakın ama KİLL HACMİ altıda bir; yani ganimet, altın ve
 *  parşömen de altıda bir. Zindanın amacı yükseltme malzemesi
 *  toplamaktı, o yüzden bu fark modu anlamsız kılıyordu.
 *
 *  Kullanıcı kararı: Moradon'la aynı seviyeye getir. Ödül çarpanı
 *  1.0 oldu; zindanın dengesi artık ölüm riskiyle kurulur, ödül
 *  kısıntısıyla değil. */
export const WAVE_REWARD_MULT = 1.0;

/** ═══ COIN ═══
 *
 *  Kaynak `K_MONSTER.iMoney` ölçüldü ve seviyeyle DOĞRUSAL çıktı:
 *      Sv1 → 18 · Sv11 → 145 · Sv30 → 544 · Sv48 → 827
 *  Oran ortalaması ≈ 17 coin/seviye (medyan 17,2).
 *
 *  Uydurma bir sayı değil; kaynak eğrisinin sadeleştirilmiş hâli. */
export const COIN_PER_LEVEL = 17;

export function coinForKill(monsterLevel: number, waveMult: number): number {
  return Math.max(1, Math.floor(COIN_PER_LEVEL * monsterLevel * waveMult * WAVE_REWARD_MULT));
}

/** ═══ SATILABİLİR GANİMET ═══
 *
 *  Kullanıcı kararı: kat başına DOĞRUSAL büyüsün, %1 şansla düşsün.
 *
 *  İkiye katlanma REDDEDİLDİ (ölçüldü): kat 10'da 2,56M, kat 20'de
 *  2,6 milyar ederdi. En pahalı iksirimiz 7 000 altın — altın tamamen
 *  anlamsızlaşır ve iksir ekonomisi çöker. Doğrusal büyüme iksir
 *  ölçeğiyle aynı bantta kalır. */
export const TROPHY_BASE_VALUE = 5_000;
/** Ad çakışması: `DropSystem` içinde normal haritanın ganimet şansı
 *  var. Dalga modununki AYRI bir sabittir. */
export const WAVE_TROPHY_CHANCE = 0.01;

export function trophyValue(floor: number): number {
  return TROPHY_BASE_VALUE * Math.max(1, floor);
}

/** ═══ ÖNERİLEN GÜÇ ═══
 *
 *  Katın moblarının gerçek tehdidinden TÜRETİLİR, elle yazılmaz.
 *  Böylece mob verisi değişince eşik kendiliğinden düzelir.
 *
 *  Ölçü: bir mobu makul sürede öldürebilmek ve birkaç vuruşa
 *  dayanabilmek. `combatPower` ile AYNI birimde olması için aynı
 *  karekök yapısı kullanılır. */
/** ═══ P3.22 — ÖNERİ OYUNCU EĞRİSİNDEN TÜRER ═══
 *
 *  Önceki formül mob statlarından tahmin yürütüyordu ve ÖLÇÜMDE
 *  yalan söylediği görüldü:
 *
 *      kat 3 → öneri 65 · gerçek gereken 254
 *      kat 5 → öneri 232 · gerçek gereken 459
 *
 *  Yani risk etiketi "Güvenli" derken oyuncu dakikada bir ölüyordu.
 *  Otuz dakikalık oturumda oyuncu kat 3'te kilitlendi: 15. dakikadan
 *  sonra HİÇ kill yok, yalnız ölüm.
 *
 *  Artık öneri ÖLÇÜLEN oyuncu eğrisinden gelir: bandın tepesindeki
 *  seviyeye uygun +1 ekipmanlı bir karakterin gücü. Tablo tek tek
 *  ölçüldü, formülle uydurulmadı. */
const PLAYER_POWER_CURVE: ReadonlyArray<readonly [number, number]> = [
  [1, 25], [5, 70], [10, 129], [15, 254], [20, 394],
  [25, 459], [30, 574], [40, 756], [50, 973],
];

/** Bir seviyedeki iyi donanımlı oyuncunun gücü — tablo arası
 *  doğrusal geçiş. */
export function playerPowerAtLevel(level: number): number {
  const c = PLAYER_POWER_CURVE;
  if (level <= c[0]![0]) return c[0]![1];
  for (let i = 1; i < c.length; i++) {
    const [l1, p1] = c[i]!;
    if (level <= l1) {
      const [l0, p0] = c[i - 1]!;
      const t = (level - l0) / (l1 - l0);
      return Math.round(p0 + (p1 - p0) * t);
    }
  }
  /* Tablonun ötesi: son iki nokta arasındaki eğimle uzatılır. */
  const [lA, pA] = c[c.length - 2]!;
  const [lB, pB] = c[c.length - 1]!;
  return Math.round(pB + ((pB - pA) / (lB - lA)) * (level - lB));
}

export function recommendedPower(floor: number): number {
  const band = floorLevelBand(floor);
  /* Bandın TEPESİ ölçüt: oyuncu o seviyedeki mobları rahat
     öldürebilmeli. Kat 10'un ötesinde mob değişmez, çarpan büyür —
     öneri de aynı oranda büyür. */
  const base = playerPowerAtLevel(band.max);
  return Math.max(1, Math.round(base * floorStatMult(floor)));
}

/* ═══════════════ ZİNDAN DROPLARI ═══════════════ */

/** Zindanda düşen HER ekipman +1 gelir (kullanıcı kararı).
 *
 *  Gerekçe oyunun içinden: zindanın amacı yükseltme çabası. +1 ile
 *  başlamak, oyuncuyu +5/+6 hedefine bir adım yakın başlatır ve
 *  parşömen/altın toplamayı anlamlı kılar.
 *
 *  Normal harita ETKİLENMEZ — orada droplar +0 gelmeye devam eder. */
export const DUNGEON_DROP_UPGRADE = 1;

/** ═══ P3.22 — KADEME CEZASI KALDIRILDI ═══
 *
 *  Bu ceza BENİM eklediğim bir fikirdi (kullanıcı kararı değildi) ve
 *  otuz dakikalık oturumda modu ÇÖKERTTİĞİ ölçüldü:
 *
 *      30 dk → Sv8 · kat 2 · 18 ölüm · AP 8'de SABİT
 *
 *  Zincir şuydu: kat 1'in mobları Sv1-5; eksi beş kademe yapınca havuz
 *  yalnız kademe 1'e iniyor — katalogdaki en zayıf eşyalar. Oyuncu
 *  zindanda DAHA İYİ BİR YAY ASLA BULAMIYOR.
 *
 *  KO formülünde DEX yay hasarıyla ÇARPILIR (`0.005×BowAP×(DEX+40)+…`);
 *  yay 8'de kalınca puan dağıtmak da işe yaramıyor. Güç artmıyor → kat
 *  çıkılamıyor → daha iyi eşya düşmüyor. Kapalı döngü.
 *
 *  Ödül yarıya inişi EXP ve COIN'de KALIR; ekipman artık mobun kendi
 *  seviyesinden düşer. Zindan bir ilerleme yolu olmalı, çıkmaz değil. */
export const DUNGEON_TIER_PENALTY = 0;

/** Zindanda bir mobun ganimet havuzu için kullanılacak "sanal seviye". */
export function dungeonLootLevel(monsterLevel: number): number {
  return Math.max(1, monsterLevel - DUNGEON_TIER_PENALTY);
}
