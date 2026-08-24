/** ZİNDAN DURUMU — KAT VE DALGA (P3.4)
 *
 *  ══════════════ NE TUTAR ══════════════
 *  Bulunulan kat, en yüksek açılmış kat, sıradaki dalga ve dalganın
 *  canlı mobları. Karakter, envanter ve ekipman BURADA DEĞİLDİR —
 *  onlar ayrı bir `PrototypeState` örneğindedir (Aşama 4).
 *
 *  ══════════════ KAPI YOK, RİSK VAR ══════════════
 *  Kullanıcı kararı: NEXT her zaman basılabilir. Güç yetersizse mob
 *  öldürür — bu bir ceza değil, oyuncunun aldığı risktir. Yapay duvar
 *  koymuyoruz.
 *
 *  ══════════════ NEXT DALGA ORTASINDA ÇALIŞMAZ ══════════════
 *  Dalga bitmeden geçilirse yarım kalan mobların ödülü kaybolur ve
 *  oyuncu ne olduğunu anlamaz. Geri gitmek her zaman serbesttir —
 *  aşağı inmek bir kaçış yoludur, engellenmemeli.
 *
 *  ══════════════ SAF DEĞİL, AMA DAR ══════════════
 *  Yalnız kat/dalga sayaçlarını yönetir. Doğuş `WaveSpawner`da,
 *  savaş ve ganimet kendi kapılarındadır. */

import type { WorldMob } from './types.js';
import { WaveSpawner, type SpawnedWave } from './WaveSpawner.js';

export type FloorChangeFail =
  /** Dalga sürüyor — önce temizle. */
  | 'waveActive'
  /** En alttasın. */
  | 'atBottom'
  /** Oyuncu ölü. */
  | 'dead';

export interface FloorChangeResult {
  readonly ok: boolean;
  readonly floor: number;
  readonly fail?: FloorChangeFail;
}

export interface DungeonSaveData {
  readonly floor: number;
  readonly highestFloor: number;
}

export class DungeonState {
  /** Bulunulan kat. */
  private floorValue = 1;
  /** Ulaşılmış en yüksek kat — ölünce DÜŞMEZ. */
  private highestValue = 1;
  /** Sıradaki dalga numarası (1'den başlar). */
  private waveValue = 1;
  /** O an sahadaki dalga; `null` = dalga bekleniyor. */
  private active: SpawnedWave | null = null;

  private spawner: WaveSpawner;

  constructor(spawner: WaveSpawner) { this.spawner = spawner; }

  get floor(): number { return this.floorValue; }
  get highestFloor(): number { return this.highestValue; }
  get wave(): number { return this.waveValue; }
  get activeMobs(): readonly WorldMob[] { return this.active?.mobs ?? []; }
  get activePlan(): SpawnedWave['plan'] | null { return this.active?.plan ?? null; }

  /** Dalga sahada ve henüz temizlenmedi mi? */
  get waveActive(): boolean {
    return this.active !== null && !WaveSpawner.isCleared(this.active.mobs);
  }

  /** Sıradaki dalgayı doğurur. Zaten sahada dalga varsa hiçbir şey
   *  yapmaz — çifte doğuş mob sayısını sessizce ikiye katlardı. */
  startNextWave(overlapThreshold = 0): SpawnedWave | null {
    /* ═══ P3.23 — ÖRTÜŞMEYE İZİN ═══
       Sahadaki dalga İNCELDİYSE (eşik kadar veya daha az canlı)
       sonraki dalga doğabilir. Ölçüldü: örtüşme olmadan dakikada
       5 kill, Moradon'da 30 — fark dalga arasındaki ölü zamandı.

       Eşik 0 iken davranış eskisiyle AYNI: dalga tamamen bitmeden
       yenisi doğmaz. */
    const alive = this.active === null
      ? 0
      : this.active.mobs.filter((m) => m.hp > 0 && m.ai !== 'dead').length;
    if (this.active !== null && alive > overlapThreshold) return null;
    this.active = this.spawner.spawn(this.floorValue, this.waveValue);
    return this.active;
  }

  /** Sahadaki dalga temizlendiyse sayacı ilerletir ve `true` döner. */
  completeWaveIfCleared(): boolean {
    if (this.active === null || this.waveActive) return false;
    this.waveValue += 1;
    this.active = null;
    return true;
  }

  /** ÜST KATA GEÇ.
   *
   *  Güç kontrolü YOKTUR (kullanıcı kararı). Tek şart dalganın
   *  bitmiş olmasıdır. */
  nextFloor(alive = true): FloorChangeResult {
    if (!alive) return { ok: false, floor: this.floorValue, fail: 'dead' };
    if (this.waveActive) return { ok: false, floor: this.floorValue, fail: 'waveActive' };
    this.floorValue += 1;
    this.highestValue = Math.max(this.highestValue, this.floorValue);
    this.resetWaves();
    return { ok: true, floor: this.floorValue };
  }

  /** ALT KATA İN. Dalga sürerken de serbest: aşağı inmek bir KAÇIŞ
   *  yoludur, engellenirse oyuncu ölmeye mahkûm kalır. */
  previousFloor(): FloorChangeResult {
    if (this.floorValue <= 1) return { ok: false, floor: 1, fail: 'atBottom' };
    this.floorValue -= 1;
    this.resetWaves();
    return { ok: true, floor: this.floorValue };
  }

  /** Açılmış bir kata DOĞRUDAN git. Kilitli kata atlanamaz. */
  jumpTo(floor: number): FloorChangeResult {
    const target = Math.max(1, Math.floor(floor));
    if (target > this.highestValue) {
      return { ok: false, floor: this.floorValue, fail: 'waveActive' };
    }
    this.floorValue = target;
    this.resetWaves();
    return { ok: true, floor: this.floorValue };
  }

  /** ÖLÜM: yalnız DALGA sıfırlanır, KAT DÜŞMEZ.
   *
   *  ═══ P3.22 — KAT DÜŞÜŞÜ KALDIRILDI ═══
   *  Otuz dakikalık oturumda ölçüldü: on sekiz ölüm, on sekiz kez
   *  kat düşüşü demekti ve oyuncu hiç ivme kazanamıyordu. Dalga
   *  sıfırlanması zaten yeterli bir kayıp — o katın ilerlemesi gider.
   *
   *  Tasarımın ruhu da buydu: kat oyuncunun KENDİ kararıyla değişsin
   *  (NEXT/GERİ). Ölümün kat düşürmesi, oyuncunun seçimini elinden
   *  alıyordu. */
  onDeath(): number {
    this.resetWaves();
    return this.floorValue;
  }

  /** Kat değişince dalga baştan başlar: yeni katın 37. dalgasında
   *  belirmek anlamsız olurdu. */
  private resetWaves(): void {
    this.waveValue = 1;
    this.active = null;
  }

  /* ─────────────────────── kayıt ─────────────────────── */

  /** DALGA SAYACI KAYDEDİLMEZ (kullanıcı kararı doğrultusunda öneri).
   *  Oyundan çıkıp girince kat aynı, dalga 1'den başlar — hem basit
   *  hem de oturuma "ısınarak" başlama hissi verir. */
  serialize(): DungeonSaveData {
    return { floor: this.floorValue, highestFloor: this.highestValue };
  }

  restore(d: Partial<DungeonSaveData> | null | undefined): void {
    const hi = Math.max(1, Math.floor(Number(d?.highestFloor) || 1));
    const fl = Math.max(1, Math.floor(Number(d?.floor) || 1));
    this.highestValue = hi;
    /* Bozuk kayıt: kat, açılmış tavanı AŞAMAZ. */
    this.floorValue = Math.min(fl, hi);
    this.resetWaves();
  }
}
