/** DisposerBag — scene başına input/event aboneliklerini toplar,
 *  exit()'te tek çağrıyla temizler. Aynı sahneye yeniden girişte
 *  duplicate listener oluşmasını engellemenin standart yolu. */
export class DisposerBag {
  private disposers: Array<() => void> = [];

  add(d: () => void): void { this.disposers.push(d); }

  /** Tümünü çalıştırır ve bag'i boşaltır. Birden çok çağrı güvenlidir. */
  disposeAll(): void {
    const list = this.disposers;
    this.disposers = [];
    for (const d of list) d();
  }

  get size(): number { return this.disposers.length; }
}
