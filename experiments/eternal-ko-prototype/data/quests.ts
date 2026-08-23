/** GÖREVLER — SAF TANIM KATMANI (P2.21)
 *
 *  ══════════════ TASARIM (kullanıcı kararı) ══════════════
 *  · Görevler MOB KESME hedefidir: "şu yaratıktan N adet".
 *  · NPC YOKTUR. Görev seviyeyle kendiliğinden açılır.
 *  · Tamamlanınca OTOMATİK ONAYLANIR — teslim etmeye gerek yok.
 *
 *  ══════════════ SINIF GEÇİŞİ ══════════════
 *  Beginner → Hunter geçişi bir görevin ödülüdür. P2.5A'da geçici olarak
 *  seviye eşiğine bağlanmıştı (`HUNTER_LEVEL_GATE`); artık gerçek
 *  tetikleyici burada.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, `Math.random()`, mutasyon YOKTUR. İlerleme durumu
 *  `world/QuestSystem.ts` içindedir.
 *
 *  ══════════════ SAYILAR TUNING'DİR ══════════════
 *  Hedef adetleri ve ödüller kaynaktan gelmez; oynanış temposuna göre
 *  seçildi ve tek yerden değişir. Mob referansları ise KAYNAKTIR. */

export type QuestReward = {
  readonly exp: number;
  readonly coins: number;
  /** Bu görev sınıf aşamasını yükseltir mi? */
  readonly promote?: boolean;
};

export interface QuestObjective {
  /** Kaynak mob referansı. */
  readonly monsterRef: number;
  /** Oyuncuya gösterilecek ad (override katmanından gelir, burada değil). */
  readonly count: number;
}

export interface QuestDef {
  readonly id: string;
  readonly title: string;
  /** Bu seviyeye ulaşınca açılır. */
  readonly minLevel: number;
  readonly objectives: readonly QuestObjective[];
  readonly reward: QuestReward;
  /** Sıralı zincir: bu görev açılmadan önce şu tamamlanmalı. */
  readonly requires?: string;
}

/** Moradon görev zinciri. Sıra ÖNEMLİ: liste sırası = açılış sırası. */
export const QUESTS: readonly QuestDef[] = [
  {
    id: 'q1_solucan',
    title: 'İlk Adım',
    minLevel: 1,
    objectives: [{ monsterRef: 750, count: 10 }],
    reward: { exp: 120, coins: 200 },
  },
  {
    id: 'q2_sican',
    title: 'Çalılık Temizliği',
    minLevel: 3,
    requires: 'q1_solucan',
    objectives: [{ monsterRef: 850, count: 12 }, { monsterRef: 851, count: 8 }],
    reward: { exp: 600, coins: 500 },
  },
  {
    id: 'q3_bocek',
    title: 'Leş Kokusu',
    minLevel: 6,
    requires: 'q2_sican',
    objectives: [{ monsterRef: 754, count: 15 }],
    reward: { exp: 1400, coins: 900 },
  },
  {
    /* SINIF GÖREVİ — Beginner Rogue'dan Hunter'a geçiş.
       Sv8'de açılır: P2.5A ölçümünde sınıf katsayısı farkı ancak Lv10
       civarında hissedilir hâle geliyordu, görev de oraya denk gelsin. */
    id: 'q4_avci',
    title: 'Avcı Sınavı',
    minLevel: 8,
    requires: 'q3_bocek',
    objectives: [{ monsterRef: 150, count: 20 }, { monsterRef: 755, count: 10 }],
    reward: { exp: 3000, coins: 1500, promote: true },
  },
  {
    id: 'q5_bataklik',
    title: 'Bataklık Seferi',
    minLevel: 11,
    requires: 'q4_avci',
    objectives: [{ monsterRef: 255, count: 18 }, { monsterRef: 250, count: 12 }],
    reward: { exp: 7000, coins: 3000 },
  },
  {
    id: 'q6_reis',
    title: 'Reisin Sonu',
    minLevel: 14,
    requires: 'q5_bataklik',
    objectives: [{ monsterRef: 252, count: 15 }],
    reward: { exp: 14000, coins: 6000 },
  },
  {
    id: 'q7_kecoon',
    title: 'Kecoon Tehdidi',
    minLevel: 16,
    requires: 'q6_reis',
    objectives: [{ monsterRef: 105, count: 20 }, { monsterRef: 203, count: 12 }],
    reward: { exp: 24000, coins: 10000 },
  },
  {
    id: 'q8_kaptan',
    title: 'Kaptanı Devir',
    minLevel: 19,
    requires: 'q7_kecoon',
    objectives: [{ monsterRef: 109, count: 15 }],
    reward: { exp: 40000, coins: 20000 },
  },
];

const BY_ID = new Map(QUESTS.map((q) => [q.id, q]));

export function questById(id: string): QuestDef | undefined { return BY_ID.get(id); }

/** Sınıf yükselten görev(ler). Test bunun TEK olduğunu doğrular —
 *  iki promote görevi olsaydı aşama sessizce iki kez atlardı. */
export function promotionQuests(): readonly QuestDef[] {
  return QUESTS.filter((q) => q.reward.promote === true);
}

/** Bir görevin toplam hedef sayısı (ilerleme yüzdesi için). */
export function totalTarget(q: QuestDef): number {
  return q.objectives.reduce((n, o) => n + o.count, 0);
}
