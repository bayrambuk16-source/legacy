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
export const WAVE_MIN_COUNT = 3;
export const WAVE_MAX_COUNT = 12;
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
export const FLOOR_LEVEL_STEP = 5;
export const MAX_DISTINCT_FLOOR = 10;

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
 *  Kullanıcı kararı: dalga modu ödülü normal haritanın YARISI.
 *  EXP ve coin'e uygulanır; DROP ŞANSINA UYGULANMAZ.
 *
 *  Gerekçe: drop zaten seyrek (üst bantta %3). Yarıya inerse üst
 *  katlarda saatlerce hiçbir şey düşmez ve mod ölü hisseder. Bunun
 *  yerine düşen eşyanın KADEMESİ bir bant aşağıdadır. */
export const WAVE_REWARD_MULT = 0.5;

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
export function recommendedPower(floor: number): number {
  const refs = floorMonsters(floor);
  const mult = floorStatMult(floor);
  let hp = 0, atk = 0, n = 0;
  for (const r of refs) {
    const m = Content.monster(r);
    if (!m) continue;
    hp += m.hp * mult; atk += m.attack * mult; n += 1;
  }
  if (n === 0) return 1;
  const avgHp = hp / n, avgAtk = atk / n;
  /* Oyuncunun mobu ~8 vuruşta indirmesi ve ~10 vuruşa dayanması
     hedeflenir; ikisinin karekök çarpımı `combatPower` ile aynı
     ölçekte durur. */
  return Math.max(1, Math.round(1.35 * Math.sqrt((avgHp / 8) * (avgAtk * 10))));
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

/** Zindanda düşen eşyanın KADEMESİ bir bant aşağıdadır.
 *
 *  Kullanıcı kararı ödülün yarıya inmesiydi; drop ŞANSINI yarıya
 *  indirmek yerine kademeyi düşürüyoruz. Sebep ölçüldü: üst bantta
 *  drop zaten %3; yarıya inerse üst katlarda saatlerce hiçbir şey
 *  düşmez ve mod ölü hisseder. Böylece oyuncu eşya alır ama en iyisini
 *  normal haritada aramaya devam eder. */
export const DUNGEON_TIER_PENALTY = 5;

/** Zindanda bir mobun ganimet havuzu için kullanılacak "sanal seviye". */
export function dungeonLootLevel(monsterLevel: number): number {
  return Math.max(1, monsterLevel - DUNGEON_TIER_PENALTY);
}
