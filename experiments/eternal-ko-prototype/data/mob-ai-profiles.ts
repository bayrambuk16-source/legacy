/** MOB AI DAVRANIŞ PROFİLLERİ — P1.6 (prototipe özel)
 *
 *  Üç davranış profili vardır; ÜÇ AYRI AI YAZILMAZ. Aynı durum makinesi bu
 *  parametrelerle çalışır (`world/MobAi.ts`).
 *
 *  Bütün sayılar PROJECT LEGACY TUNING'dir — kaynak DB'den GELMEZ. Monster'ın
 *  HP/attack/defense/exp değerleri ise ANA VERİ katmanından (`monsters.json`)
 *  gelmeye devam eder; burada kopyalanmaz.
 *
 *  Bu görev bir MOB BALANCE görevi DEĞİLDİR: değerler playtest başlangıcıdır. */

export type MobAiType = 'NORMAL' | 'AGGRESSIVE' | 'ELITE';
export const MOB_AI_TYPES: MobAiType[] = ['NORMAL', 'AGGRESSIVE', 'ELITE'];

export interface MobAiProfile {
  readonly type: MobAiType;
  /** Oyuncu bu mesafeye girince KENDİ BAŞINA aggro olur.
   *  NORMAL'da **0**: pasif mobdur, yalnız HASAR ALINCA aggro olur. */
  readonly aggroRadius: number;
  /** Mob EVİNDEN bu kadar uzaklaşırsa hedefi bırakır ve döner. */
  readonly leashRadius: number;
  /** Ev çevresinde dolaşma yarıçapı. */
  readonly roamRadius: number;
  /** Normal (roam/return) hızı, world birimi/sn. */
  readonly moveSpeed: number;
  /** Kovalama hızı, world birimi/sn. */
  readonly chaseSpeed: number;
  /** AUTHORITATIVE vuruş menzili (hasar bu mesafede uygulanır). */
  readonly attackRange: number;
  /** Histerezis: bu mesafeye gelince ATTACK'a geçer. */
  readonly enterAttack: number;
  /** Histerezis: bu mesafeyi aşarsa CHASE'e döner. */
  readonly leaveAttack: number;
  /** Hedefi fark ettikten sonra harekete geçmeden önceki tepki gecikmesi (sn).
   *  Mobun anında sıçramasını engeller; oyuncuya kaçma penceresi verir. */
  readonly aggroReactionSec: number;
  /** Bir tam saldırı çevrimi (windup + recovery) — sn. */
  readonly attackIntervalSec: number;
  /** Çevrim başından vuruşun DÜŞTÜĞÜ ana kadar geçen süre — sn. */
  readonly hitMomentSec: number;
  /** Ölümden sonra yeniden doğma (sn). Slot bunu ezebilir. */
  readonly respawnSec: number;
  /** IDLE'da yeni roam hedefi seçmeden önce beklenen süre aralığı (sn). */
  readonly idleMinSec: number;
  readonly idleMaxSec: number;
  /** Eve dönüşte "ulaştı" sayılan mesafe. */
  readonly returnTolerance: number;
}

const BASE = {
  roamRadius: 80,
  moveSpeed: 55,
  chaseSpeed: 75,
  attackRange: 55,
  enterAttack: 50,
  leaveAttack: 65,
  aggroReactionSec: 0.25,
  attackIntervalSec: 1.6,
  hitMomentSec: 0.45,
  respawnSec: 8,
  idleMinSec: 1.4,
  idleMaxSec: 3.2,
  returnTolerance: 14,
} as const;

export const MOB_AI_PROFILES: Readonly<Record<MobAiType, MobAiProfile>> = {
  /** PASİF: oyuncu yanından geçse bile saldırmaz. Yalnız HASAR ALINCA aggro. */
  NORMAL: { ...BASE, type: 'NORMAL', aggroRadius: 0, leashRadius: 500 },
  /** SALDIRGAN: oyuncu yarıçapa girerse kendi başına hedef alır. */
  AGGRESSIVE: { ...BASE, type: 'AGGRESSIVE', aggroRadius: 220, leashRadius: 500 },
  /** ELİT: saldırgan gibi, biraz daha geniş algı ve leash.
   *  YENİ ödül/drop/görsel sistemi YOK — yalnız davranış profili. */
  ELITE: { ...BASE, type: 'ELITE', aggroRadius: 260, leashRadius: 560, chaseSpeed: 80 },
};

/** DEV: respawn süresi seçenekleri. Normal oynanış varsayılanı 8. */
export const RESPAWN_OPTIONS = [3, 8, 15] as const;
export const RESPAWN_DEFAULT = 8;
