/** SV16-20 MOBLARI — v8 DIŞI EK KAYITLAR (P2.17)
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
 *  Her seviyeden bir tane (16, 17, 18, 19, 20). Ölçüt: makul HP/AC
 *  (boss/event kayıtları elendi) ve kesintisiz bir zorluk merdiveni.
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
