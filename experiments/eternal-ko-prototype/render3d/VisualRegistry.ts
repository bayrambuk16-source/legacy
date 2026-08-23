/** GÖRSEL YAŞAM DÖNGÜSÜ KAYITÇISI — P2.0 §24
 *
 *  Gameplay varlıklarının (mob / projectile / loot) görsellerini KİMLİK
 *  üzerinden eşler ve sızıntıyı imkânsız kılar:
 *
 *    · her karede "bu kimlik hâlâ yaşıyor mu" işaretlenir,
 *    · işaretlenmeyen her görsel SİLİNİR ve dispose edilir,
 *    · aynı kimlik iki görsel ALAMAZ.
 *
 *  ══════════ KİMLİK KURALI (P1.6.1 KORUNUR) ══════════
 *  Mob anahtarı `uid` DEĞİL, **`uid:generation`**'dır. Respawn olan mob yeni
 *  bir uid ve nesil aldığı için ESKİ görseli devralamaz; eski görsel silinir,
 *  yenisi sıfırdan doğar.
 *
 *  ══════════ BU DOSYA THREE İMPORT ETMEZ ══════════
 *  Jeneriktir (`T`); Three nesnesi de tutabilir, testte sahte nesne de. */

export interface VisualHandle<T> {
  key: string;
  object: T;
  /** Oluşturulduğu kare damgası (telemetri). */
  bornAt: number;
}

export class VisualRegistry<T> {
  private items = new Map<string, VisualHandle<T>>();
  private alive = new Set<string>();
  private frame = 0;
  /** Telemetri: toplam oluşturma / silme sayısı. */
  created = 0;
  removed = 0;

  constructor(
    private factory: (key: string) => T,
    private disposer: (object: T, key: string) => void,
  ) {}

  get size(): number { return this.items.size; }
  keys(): string[] { return [...this.items.keys()]; }
  get(key: string): T | undefined { return this.items.get(key)?.object; }
  has(key: string): boolean { return this.items.has(key); }

  /** Kareyi başlat: canlılık işaretleri sıfırlanır. */
  beginFrame(): void {
    this.alive.clear();
    this.frame += 1;
  }

  /** Bu kimlik YAŞIYOR — görseli yoksa üretilir, varsa korunur. */
  touch(key: string): T {
    this.alive.add(key);
    const hit = this.items.get(key);
    if (hit) return hit.object;
    const object = this.factory(key);
    this.items.set(key, { key, object, bornAt: this.frame });
    this.created += 1;
    return object;
  }

  /** Kareyi bitir: İŞARETLENMEYEN her görsel silinir. Silinenlerin anahtarı döner. */
  endFrame(): string[] {
    const dead: string[] = [];
    for (const [key, handle] of this.items) {
      if (this.alive.has(key)) continue;
      this.disposer(handle.object, key);
      this.items.delete(key);
      this.removed += 1;
      dead.push(key);
    }
    return dead;
  }

  /** Tümünü sil (sahne kapanışı). */
  clear(): void {
    for (const [key, handle] of this.items) this.disposer(handle.object, key);
    this.removed += this.items.size;
    this.items.clear();
    this.alive.clear();
  }
}

/** MOB GÖRSEL ANAHTARI — kimlik kuralının TEK tanımı.
 *  `uid` tek başına YETMEZ: P1.6.1'de respawn yeni uid verir ama nesil de
 *  artar; ikisini birlikte kullanmak "eski görseli yanlış moba bağlama"
 *  hatasını yapısal olarak imkânsız kılar (§7). */
export function mobVisualKey(uid: number, generation: number): string {
  return `mob:${uid}:${generation}`;
}
export function projectileVisualKey(id: number): string { return `proj:${id}`; }
export function lootVisualKey(lootUid: number): string { return `loot:${lootUid}`; }
