/** ARCHER İLERLEME DURUMU — P2.5A
 *
 *  ══════════════ BU DOSYA NE YAPAR ══════════════
 *  Oyuncunun SEVİYEYE ve DAĞITILAN PUANLARA bağlı durumunu tutar: taban
 *  statlar, harcanan DEX/HP puanları, kalan puanlar, sınıf aşaması.
 *  Formül BURADA DEĞİLDİR (`KoArcherDamage.ts`), ekipman BURADA DEĞİLDİR
 *  (`EquipmentState`).
 *
 *  ══════════════ YALNIZ İKİ STAT DAĞITILIR ══════════════
 *  KO'da beş stat vardır (STR/HP/DEX/INT/MP). Project Legacy okçusu yalnız
 *  **DEX** ve **HP** dağıtır — kullanıcı kararı. Diğer üçü taban değerinde
 *  KALIR ve saklanır (ileride başka sınıf gelirse yerinde durur).
 *
 *  ══════════════ PUAN BÜTÇESİ AŞILAMAZ ══════════════
 *  Harcanan toplam, seviyenin verdiği bütçeyi geçemez; `spend()` reddeder.
 *  Bütçe seviyeden TÜRETİLİR, ayrı bir sayaçta tutulmaz — böylece seviye
 *  atlayınca puan kendiliğinden artar, senkron kaçmaz. */

import {
  ARCHER_BASE_STATS, rogueStageForLevel, skillPointsForLevel, statPointsForLevel,
  type RogueStageCoefficients,
} from './KoArcherDamage.js';

/** Dağıtılabilir statlar. */
export type ArcherStatId = 'dex' | 'hp';

export interface ArcherAllocation {
  readonly dex: number;
  readonly hp: number;
}

export type SpendResult =
  | { readonly ok: true; readonly remaining: number }
  | { readonly ok: false; readonly reason: 'noPoints' | 'badAmount' };

export class ArcherProgression {
  private levelOf: () => number;
  private spentDex = 0;
  private spentHp = 0;

  constructor(levelOf: () => number) { this.levelOf = levelOf; }

  /** Seviyenin verdiği TOPLAM stat puanı (yaratılış dahil). */
  get statBudget(): number { return statPointsForLevel(this.levelOf()); }
  /** Seviyenin verdiği TOPLAM skill puanı. */
  get skillBudget(): number { return skillPointsForLevel(this.levelOf()); }

  get spent(): ArcherAllocation { return { dex: this.spentDex, hp: this.spentHp }; }
  /** Harcanmamış stat puanı. Seviye atlayınca kendiliğinden artar. */
  get unspent(): number { return Math.max(0, this.statBudget - this.spentDex - this.spentHp); }

  /** Aktif sınıf aşaması. GEÇİCİ olarak seviyeden türer — görev sistemi
   *  geldiğinde bu tek çağrı değişir (bkz. `KoArcherDamage.rogueStageForLevel`). */
  get stage(): RogueStageCoefficients { return rogueStageForLevel(this.levelOf()); }

  /** Dağıtılmış puanlar DAHİL efektif DEX (ekipman HARİÇ). */
  get dexStat(): number { return ARCHER_BASE_STATS.dex + this.spentDex; }
  /** Dağıtılmış puanlar DAHİL efektif HP statı (ekipman HARİÇ).
   *  Rogue'da mana havuzu da bu stattan türer. */
  get staStat(): number { return ARCHER_BASE_STATS.sta + this.spentHp; }

  /** Puan harcar. Bütçe yetmezse HİÇBİR mutasyon olmaz. */
  spend(stat: ArcherStatId, amount = 1): SpendResult {
    if (!Number.isInteger(amount) || amount <= 0) return { ok: false, reason: 'badAmount' };
    if (amount > this.unspent) return { ok: false, reason: 'noPoints' };
    if (stat === 'dex') this.spentDex += amount; else this.spentHp += amount;
    return { ok: true, remaining: this.unspent };
  }

  /** Bütün puanları geri alır (DEV / stat reset). */
  reset(): void { this.spentDex = 0; this.spentHp = 0; }

  /** Kayıt için. */
  serialize(): ArcherAllocation { return { dex: this.spentDex, hp: this.spentHp }; }

  /** Kayıttan geri yükler. Bütçeyi aşan kayıt SESSİZCE KIRPILMAZ —
   *  aşan kısım düşürülür ve rapor edilir (bozuk kayıt gizlenmez). */
  restore(a: Partial<ArcherAllocation> | null | undefined): { clamped: boolean } {
    const dex = Math.max(0, Math.trunc(Number(a?.dex ?? 0)) || 0);
    const hp = Math.max(0, Math.trunc(Number(a?.hp ?? 0)) || 0);
    const budget = this.statBudget;
    if (dex + hp <= budget) {
      this.spentDex = dex; this.spentHp = hp;
      return { clamped: false };
    }
    /* Oransal kırpma: hangi stata basıldığı korunur. */
    const total = dex + hp;
    this.spentDex = Math.trunc((dex * budget) / total);
    this.spentHp = Math.min(budget - this.spentDex, hp);
    return { clamped: true };
  }
}
