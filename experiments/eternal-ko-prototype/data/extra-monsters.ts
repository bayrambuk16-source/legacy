/** SV16-30 MOBLARI — v8 DIŞI EK KAYITLAR (P2.17 · P2.27)
 *
 *  ══════════════ NEDEN GEREKTİ ══════════════
 *  `generated/monsters.json` MVP kapsamıyla üretildi ve en yüksek mobu
 *  Sv15 (Bataklık Reisi). Karakter Sv20'ye çıkabildiği için son beş
 *  seviyede avlanacak YENİ bir şey yoktu — hep aynı reis.
 *
 *  ══════════════ KAYNAK ══════════════
 *  2019 MYKO `kn_online` yedeğinin `K_MONSTER` tablosundan ham olarak
 *  çıkarıldı. Kolon ofsetleri şema bloğundan okundu, sonra v8'in ONBİR
 *  mobuyla karşılaştırıldı: `level`, `exp`, `hp`, `defense`, `attack`,
 *  `attackDelayMs` alanlarında **11/11 kayıt, SIFIR uyuşmazlık**.
 *  Ayrıştırıcı bu yüzden güvenilir kabul edildi.
 *
 *  ══════════════ SEÇİM ══════════════
 *  P2.17'de Sv16-20, P2.27'de Sv21-30, P2.33'te Sv32-50 eklendi. Moradon artık Sv30'a
 *  kadar içerik taşıyor (kullanıcı kararı: bir üst haritaya önerilen
 *  geçiş Sv30). Ölçüt: makul HP/AC — boss/event kayıtları elendi —
 *  ve kesintisiz bir zorluk merdiveni.
 *  Türkçe adlar `content_overrides.json` katmanındadır; kaynak adlar
 *  yalnız denetim içindir.
 *
 *  ══════════════ UYARI ══════════════
 *  MYKO bir ÖZEL SUNUCU veritabanıdır. Ortak alanlarda v8 ile birebir
 *  uyuşuyor; yine de denge değerleri kanonik KO sayılmamalıdır. */

import { Content, type GameMonster } from '../../../src/game/data/GameContentRepository.js';
import overridesJson from '../../../src/game/data/overrides/content_overrides.json';

const OVERRIDES = (overridesJson as { monsters: Record<string, { displayName: string; visualKey?: string }> }).monsters;

export interface ExtraMonsterRow {
  readonly sourceRef: number;
  readonly sourceName: string;
  readonly level: number;
  readonly hp: number;
  readonly attack: number;
  readonly defense: number;
  readonly exp: number;
  readonly attackDelayMs: number;
  readonly attackRange: number;
  readonly searchRange: number;
  readonly hitRate: number;
  readonly evadeRate: number;
}

export const EXTRA_MONSTERS: readonly ExtraMonsterRow[] = [
  {
    sourceRef: 105, sourceName: 'Kecoon warrior0',
    level: 16, hp: 190, attack: 16, defense: 83,
    exp: 2097, attackDelayMs: 1500,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 203, sourceName: 'Giant bulcan0',
    level: 17, hp: 214, attack: 22, defense: 88,
    exp: 2403, attackDelayMs: 1800,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 301, sourceName: 'Giant gavolt0',
    level: 18, hp: 238, attack: 24, defense: 93,
    exp: 2727, attackDelayMs: 1800,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 204, sourceName: 'Bulture0',
    level: 19, hp: 265, attack: 27, defense: 98,
    exp: 3069, attackDelayMs: 1800,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 109, sourceName: 'Kecoon captain0',
    level: 20, hp: 294, attack: 25, defense: 138,
    exp: 3438, attackDelayMs: 1500,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 1000, sourceName: 'Zombie0',
    level: 21, hp: 454, attack: 39, defense: 181,
    exp: 3798, attackDelayMs: 2000,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 500, sourceName: 'Werewolf0',
    level: 23, hp: 625, attack: 35, defense: 132,
    exp: 4671, attackDelayMs: 1800,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 114, sourceName: 'Kecoon berserker0',
    level: 25, hp: 745, attack: 43, defense: 144,
    exp: 6813, attackDelayMs: 1500,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 502, sourceName: 'Loup-garou0',
    level: 27, hp: 879, attack: 51, defense: 155,
    exp: 6813, attackDelayMs: 1800,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 115, sourceName: 'Kecoon dragoon0',
    level: 30, hp: 1108, attack: 83, defense: 204,
    exp: 10503, attackDelayMs: 1500,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 1100, sourceName: 'Skeleton0',
    level: 32, hp: 1193, attack: 89, defense: 210,
    exp: 9468, attackDelayMs: 2000,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 505, sourceName: 'Dire wolf0',
    level: 34, hp: 1373, attack: 104, defense: 224,
    exp: 11025, attackDelayMs: 1800,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 905, sourceName: 'Stinger0',
    level: 36, hp: 1286, attack: 111, defense: 346,
    exp: 11862, attackDelayMs: 1800,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 1102, sourceName: 'Skeleton knight0',
    level: 38, hp: 1572, attack: 119, defense: 238,
    exp: 12753, attackDelayMs: 1800,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 600, sourceName: 'Smilodon0',
    level: 40, hp: 1564, attack: 164, defense: 201,
    exp: 14652, attackDelayMs: 1500,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 1103, sourceName: 'Skeleton champion0',
    level: 42, hp: 1787, attack: 137, defense: 251,
    exp: 14652, attackDelayMs: 1800,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 603, sourceName: 'saber tooth0',
    level: 44, hp: 1992, attack: 229, defense: 236,
    exp: 18972, attackDelayMs: 1500,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 1111, sourceName: 'Death knight0',
    level: 46, hp: 2411, attack: 202, defense: 302,
    exp: 24201, attackDelayMs: 1800,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 1201, sourceName: 'Sheriff0',
    level: 48, hp: 3330, attack: 284, defense: 345,
    exp: 28494, attackDelayMs: 1800,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
  {
    sourceRef: 512, sourceName: 'Blood seeker0',
    level: 50, hp: 3681, attack: 325, defense: 360,
    exp: 38043, attackDelayMs: 1500,
    attackRange: 5, searchRange: 3,
    hitRate: 1, evadeRate: 1,
  },
];

/** Ek mobları Content deposuna tanıtır. VAR OLAN kayıt EZİLMEZ.
 *  Görünen ad `content_overrides.json` üzerinden gelir; burada kaynak
 *  ad taşınır ve override yoksa o kullanılır. */
export function registerExtraMonsters(): number {
  const rows: GameMonster[] = EXTRA_MONSTERS.map((m) => ({
    id: `mob_${m.sourceRef}`,
    sourceRef: m.sourceRef,
    sourceName: m.sourceName,
    /* Görünen ad `content_overrides.json` katmanından gelir; orada kayıt
       yoksa kaynak ad kullanılır (placeholder olduğu belli olsun). */
    displayName: OVERRIDES[String(m.sourceRef)]?.displayName ?? m.sourceName,
    visualKey: OVERRIDES[String(m.sourceRef)]?.visualKey ?? 'kurt',
    /* Sv20'den itibaren elit: iki kat parşömen/ganimet şansı ve
       ELITE AI profili. Sv30 tepe mobu doğal olarak elit olur. */
    tier: m.level >= 20 ? 'elite' : 'normal',
    level: m.level,
    hp: m.hp,
    attack: m.attack,
    defense: m.defense,
    hitRate: m.hitRate,
    evadeRate: m.evadeRate,
    attackDelayMs: m.attackDelayMs,
    moveSpeed: 1,
    exp: m.exp,
    attackRange: m.attackRange,
    searchRange: m.searchRange,
    /* Ganimet tablosu YOK: bu moblar Moradon'un özel drop kurallarını
       kullanır (parşömen, özel ganimet, iksir) — grup tablosu gerekmez. */
    lootTableId: `loot_${m.sourceRef}`,
  } as GameMonster));
  return Content.registerSourceMonsters(rows);
}
