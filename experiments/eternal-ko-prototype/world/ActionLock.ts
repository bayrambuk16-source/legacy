/** ACTION LOCK — attack recovery / action time.
 *
 *  Karakter bir saldırıyı başlattıktan sonra, action süresi dolana kadar BAŞKA
 *  bir saldırı başlatamaz. Bu **cooldown DEĞİLDİR**:
 *   · individual cooldown → skill BAZINDA, kaynaktan (recast_time)
 *   · action lock         → KARAKTER bazında, gameplay tuning'inden
 *
 *  Skill ikonunda cooldown perdesi olarak GÖSTERİLMEZ; ayrı bir combat state'tir
 *  (oyuncu "skill CD'de mi, karakter hâlâ atış animasyonunda mı" ayırabilsin).
 *
 *  Renderer'sız, sahneden bağımsız — ana world gameplay'e taşınabilir. */
export class ActionLock {
  private remaining = 0;
  private total = 0;
  /** Son kilidi başlatan skill (telemetri/UI için). */
  private sourceRef: number | null = null;

  get busy(): boolean { return this.remaining > 1e-6; }
  get remainingSec(): number { return Math.max(0, this.remaining); }
  get totalSec(): number { return this.total; }
  get lastRef(): number | null { return this.sourceRef; }
  /** 1 = yeni başladı, 0 = bitti (UI çubuğu için). */
  get ratio(): number { return this.total > 0 ? Math.max(0, this.remaining / this.total) : 0; }

  /** Saldırı başladı: bu kadar süre yeni saldırı başlatılamaz. */
  begin(seconds: number, sourceRef: number | null = null): void {
    if (seconds <= 0) { this.remaining = 0; this.total = 0; this.sourceRef = sourceRef; return; }
    this.remaining = seconds;
    this.total = seconds;
    this.sourceRef = sourceRef;
  }

  update(dt: number): void {
    if (this.remaining > 0) this.remaining = Math.max(0, this.remaining - dt);
  }

  reset(): void { this.remaining = 0; this.total = 0; this.sourceRef = null; }
}
