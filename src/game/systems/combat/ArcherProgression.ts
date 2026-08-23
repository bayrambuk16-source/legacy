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
  ARCHER_BASE_STATS, ROGUE_STAGES, rogueStageForLevel, skillPointsForLevel,
  statPointsForLevel, type RogueStage, type RogueStageCoefficients,
} from './KoArcherDamage.js';

/** Dağıtılabilir statlar. */
export type ArcherStatId = 'dex' | 'hp';

export interface ArcherAllocation {
  readonly dex: number;
  readonly hp: number;
  /** P2.21 — puanla açılmış skill referansları. */
  readonly skills?: readonly number[];
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

  /** GÖREVLE kazanılmış aşama. `null` ise seviye eşiği geçerlidir.
   *  P2.21 — sınıf geçişi artık görev ödülüdür; seviye eşiği YEDEKTİR
   *  (görev sistemi devre dışıysa oyun yine ilerler). */
  private questStage: (() => RogueStage | null) | null = null;

  bindQuestStage(fn: () => RogueStage | null): void { this.questStage = fn; }

  /** Aktif sınıf aşaması. Görev kazanımı seviye eşiğini EZER — ikisi
   *  çelişirse oyuncunun HAK ETTİĞİ olan kazanır. */
  get stage(): RogueStageCoefficients {
    const earned = this.questStage?.() ?? null;
    if (earned !== null) return ROGUE_STAGES[earned];
    return rogueStageForLevel(this.levelOf());
  }

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

  /* ═══════════ P2.21 — SKILL PUANI ═══════════
     Stat puanıyla AYNI desen: bütçe seviyeden türer, harcanan burada
     tutulur, bütçe aşımı reddedilir. Fark: harcama SKILL BAŞINA yapılır
     ve bir skill açıldıktan sonra geri alınamaz. */
  private unlocked = new Set<number>();

  /** Harcanmamış skill puanı. */
  get skillUnspent(): number {
    return Math.max(0, this.skillBudget - this.spentSkillPoints);
  }

  /** Açılmış skill sayısının maliyeti. Şimdilik skill başına SABİT 2
   *  puan — KO'da skill seviyeleri var ama bizde tek kademe. */
  static readonly SKILL_COST = 2;

  private get spentSkillPoints(): number {
    return this.unlocked.size * ArcherProgression.SKILL_COST;
  }

  isUnlocked(sourceRef: number): boolean {
    return this.unlocked.has(sourceRef) || this.granted.has(sourceRef);
  }

  /** PUANSIZ açar — başlangıç barı ve görev ödülleri için.
   *  `unlockSkill` bütçe harcar, bu HARCAMAZ. İkisini ayırmak önemli:
   *  bedava verilen skiller bütçeyi tüketmemeli. */
  grantSkill(sourceRef: number): void { this.granted.add(sourceRef); }

  private granted = new Set<number>();
  unlockedRefs(): number[] { return [...this.unlocked, ...this.granted]; }

  /** Skill açar. Puan yetmezse ya da zaten açıksa HİÇBİR mutasyon olmaz. */
  unlockSkill(sourceRef: number): SpendResult {
    if (this.isUnlocked(sourceRef)) return { ok: false, reason: 'badAmount' };
    if (this.skillUnspent < ArcherProgression.SKILL_COST) {
      return { ok: false, reason: 'noPoints' };
    }
    this.unlocked.add(sourceRef);
    return { ok: true, remaining: this.skillUnspent };
  }

  /** Bütün puanları geri alır (DEV / stat reset). */
  reset(): void { this.spentDex = 0; this.spentHp = 0; this.unlocked.clear(); }

  /** Kayıt için. */
  serialize(): ArcherAllocation {
    return { dex: this.spentDex, hp: this.spentHp, skills: [...this.unlocked] };
  }

  /** Kayıttan geri yükler. Bütçeyi aşan kayıt SESSİZCE KIRPILMAZ —
   *  aşan kısım düşürülür ve rapor edilir (bozuk kayıt gizlenmez). */
  restore(a: Partial<ArcherAllocation> | null | undefined): { clamped: boolean } {
    const dex = Math.max(0, Math.trunc(Number(a?.dex ?? 0)) || 0);
    const hp = Math.max(0, Math.trunc(Number(a?.hp ?? 0)) || 0);
    /* Skill kilitleri: bütçeyi aşan kayıt KIRPILIR (fazlası düşer). */
    this.unlocked = new Set(
      (Array.isArray(a?.skills) ? a.skills : [])
        .map((r) => Math.trunc(Number(r)))
        .filter((r) => Number.isFinite(r) && r > 0)
        .slice(0, Math.floor(this.skillBudget / ArcherProgression.SKILL_COST)),
    );
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
