/** GÖREV SİSTEMİ — P2.21
 *
 *  ══════════════ TEK İLERLEME KAPISI ══════════════
 *  Görev sayacı YALNIZ `onKill()` ile ilerler ve bu tek kapı
 *  `PrototypeState.reapDead()` içinden çağrılır — yani kill başına BİR
 *  KEZ. Drop ve EXP ile aynı kapıyı paylaşır; ikinci bir sayaç yoktur.
 *
 *  ══════════════ OTOMATİK ONAY ══════════════
 *  Kullanıcı kararı: NPC yok, teslim yok. Hedef dolunca ödül ANINDA
 *  verilir ve sıradaki görev açılır.
 *
 *  ══════════════ SINIF GEÇİŞİ ══════════════
 *  `promote: true` olan görev tamamlanınca aşama yükselir. P2.5A'daki
 *  geçici seviye eşiği artık YEDEK: görev tamamlanmışsa o kazanır. */

import type { PlayerState } from '../../../src/game/systems/PlayerState.js';
import { QUESTS, questById, totalTarget, type QuestDef } from '../data/quests.js';
import type { RogueStage } from '../../../src/game/systems/combat/KoArcherDamage.js';

export interface QuestProgress {
  readonly id: string;
  /** monsterRef → kesilen adet. */
  readonly counts: Record<number, number>;
  readonly done: boolean;
}

export interface QuestCompletion {
  readonly quest: QuestDef;
  readonly exp: number;
  readonly coins: number;
  readonly promoted: boolean;
}

export interface QuestSaveData {
  readonly completed: string[];
  readonly counts: Record<string, Record<number, number>>;
  readonly stage: RogueStage | null;
}

export interface QuestDeps {
  player: PlayerState;
  /** Ödül EXP'si buradan geçer — seviye farkı cezası UYGULANMAZ,
   *  görev ödülü sabit bir taahhüttür. */
  grantExp: (amount: number) => void;
}

export class QuestSystem {
  private completed = new Set<string>();
  private counts = new Map<string, Map<number, number>>();
  /** Görevle kazanılmış sınıf aşaması. `null` = henüz yükselmedi. */
  private earnedStage: RogueStage | null = null;

  private deps: QuestDeps;

  constructor(deps: QuestDeps) { this.deps = deps; }

  /** Görev AÇIK mı? Seviye ve önkoşul birlikte bakılır. */
  isAvailable(q: QuestDef): boolean {
    if (this.completed.has(q.id)) return false;
    if (this.deps.player.level < q.minLevel) return false;
    if (q.requires && !this.completed.has(q.requires)) return false;
    return true;
  }

  /** O an takip edilen görev — açık olan İLK görev. Tek görev göstermek
   *  bilinçli: mobil ekranda liste yığmak yerine tek hedef. */
  active(): QuestDef | null {
    return QUESTS.find((q) => this.isAvailable(q)) ?? null;
  }

  isCompleted(id: string): boolean { return this.completed.has(id); }

  /** Bir görevin ilerlemesi. Açık değilse `null`. */
  progress(q: QuestDef): QuestProgress | null {
    if (this.completed.has(q.id)) {
      return { id: q.id, counts: {}, done: true };
    }
    const m = this.counts.get(q.id) ?? new Map<number, number>();
    const counts: Record<number, number> = {};
    let done = true;
    for (const o of q.objectives) {
      const have = Math.min(o.count, m.get(o.monsterRef) ?? 0);
      counts[o.monsterRef] = have;
      if (have < o.count) done = false;
    }
    return { id: q.id, counts, done };
  }

  /** Toplam ilerleme [0,1] — HUD çubuğu için. */
  ratio(q: QuestDef): number {
    const p = this.progress(q);
    if (!p) return 1;
    if (p.done) return 1;
    const have = Object.values(p.counts).reduce((n, v) => n + v, 0);
    const need = totalTarget(q);
    return need > 0 ? have / need : 1;
  }

  /** KILL KAPISI. `reapDead()` içinden kill başına BİR KEZ çağrılır.
   *  Tamamlanan görev(ler) döner — çağıran bildirim gösterir. */
  onKill(monsterRef: number): QuestCompletion[] {
    const out: QuestCompletion[] = [];
    const q = this.active();
    if (!q) return out;
    /* Yalnız AKTİF görevin sayacı ilerler: arka planda birikip sonra
       toplu tamamlanan görevler oyuncuya "ne oldu" dedirtirdi. */
    const wants = q.objectives.some((o) => o.monsterRef === monsterRef);
    if (!wants) return out;

    const m = this.counts.get(q.id) ?? new Map<number, number>();
    m.set(monsterRef, (m.get(monsterRef) ?? 0) + 1);
    this.counts.set(q.id, m);

    const p = this.progress(q);
    if (p && p.done) out.push(this.complete(q));
    return out;
  }

  /** Ödülü verir ve görevi kapatır. TEK ödül kapısı. */
  private complete(q: QuestDef): QuestCompletion {
    this.completed.add(q.id);
    this.counts.delete(q.id);
    this.deps.grantExp(q.reward.exp);
    this.deps.player.coins += q.reward.coins;
    let promoted = false;
    if (q.reward.promote === true && this.earnedStage !== 'hunter') {
      this.earnedStage = 'hunter';
      promoted = true;
    }
    return { quest: q, exp: q.reward.exp, coins: q.reward.coins, promoted };
  }

  /** Görevle kazanılmış aşama. `null` ise seviye eşiği geçerlidir
   *  (P2.5A yedeği). */
  get stageOverride(): RogueStage | null { return this.earnedStage; }

  /* ─────────────────────── kayıt ─────────────────────── */

  serialize(): QuestSaveData {
    const counts: Record<string, Record<number, number>> = {};
    for (const [id, m] of this.counts) {
      counts[id] = Object.fromEntries(m);
    }
    return { completed: [...this.completed], counts, stage: this.earnedStage };
  }

  restore(d: Partial<QuestSaveData> | null | undefined): void {
    this.completed = new Set(
      Array.isArray(d?.completed) ? d.completed.filter((id) => questById(id) !== undefined) : [],
    );
    this.counts = new Map();
    for (const [id, rec] of Object.entries(d?.counts ?? {})) {
      if (!questById(id)) continue;
      this.counts.set(id, new Map(Object.entries(rec).map(([k, v]) => [Number(k), Number(v) || 0])));
    }
    this.earnedStage = d?.stage === 'hunter' || d?.stage === 'master' ? d.stage : null;
  }
}
