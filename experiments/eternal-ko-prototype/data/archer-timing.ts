/** ARCHER COMBAT TIMING PROFILE — action time (attack recovery).
 *
 *  BU DEĞERLER KAYNAK VERİ DEĞİLDİR ve skill JSON'una YAZILMAZ. Gameplay
 *  tuning'idir; gerçek animasyon atlasları gelince release/recovery sürelerine
 *  göre yeniden ayarlanacaktır.
 *
 *  ── Individual cooldown ile action time FARKLI iki sistemdir ──────────────
 *  · Individual cooldown : AYNI skill tekrar ne zaman kullanılabilir?
 *                          Kaynaktan gelir (recast_time / 10). Çoğu okçu
 *                          skillinde 0'dır.
 *  · Action time         : Karakter bir saldırıyı bitirdikten sonra BAŞKA bir
 *                          saldırıya ne zaman başlayabilir? Combat ritmini bu
 *                          belirler. Cooldown DEĞİLDİR, skill ikonunda cooldown
 *                          gibi gösterilmez.
 *
 *  P1.1'deki asıl combat problemi buydu: cooldown'u 0 olan skiller aynı saniye
 *  içinde arka arkaya boşaltılabiliyordu. */
import { ARCHER } from './archer-skills.js';

/** Saniye. Prototip tuning başlangıç profili. */
export const ARCHER_ACTION_TIME: Record<number, number> = {
  [ARCHER.STANDART_ATIS]: 1.10,
  [ARCHER.DELICI_OK]: 0.75,
  [ARCHER.KOR_OKU]: 0.75,
  [ARCHER.ZEHIRLI_UC]: 0.75,
  [ARCHER.UCLU_SALVO]: 0.70,
  [ARCHER.IZCI_OKU]: 0.75,
  [ARCHER.KESKIN_ATIS]: 0.80,
  [ARCHER.ALEV_ATISI]: 0.80,
  [ARCHER.TOKSIK_ATIS]: 0.80,
  [ARCHER.YIRTICI_OK]: 0.85,
  [ARCHER.PATLAYICI_OK]: 0.85,
  [ARCHER.ENGEREK_OKU]: 0.85,
  [ARCHER.BESLI_SALVO]: 0.80,
  [ARCHER.GOLGE_AVCISI]: 0.85,
  [ARCHER.KARA_TAKIP]: 0.90,
};

/** Tanımsız skill için düşülecek süre. */
export const DEFAULT_ACTION_TIME = 0.80;

export class ArcherCombatTimingProfile {
  private values: Record<number, number> = { ...ARCHER_ACTION_TIME };

  actionTime(sourceRef: number): number {
    return this.values[sourceRef] ?? DEFAULT_ACTION_TIME;
  }
  /** DEV tuning — runtime'da değiştirilebilir. */
  set(sourceRef: number, seconds: number): void {
    this.values[sourceRef] = Math.max(0, seconds);
  }
  /** Bütün profili ölçekler (DEV panelinden "combat temposu" ayarı). */
  scaleAll(factor: number): void {
    for (const k of Object.keys(this.values)) {
      this.values[Number(k)] = +(ARCHER_ACTION_TIME[Number(k)] * factor).toFixed(3);
    }
  }
  reset(): void { this.values = { ...ARCHER_ACTION_TIME }; }
  snapshot(): Record<number, number> { return { ...this.values }; }
}
