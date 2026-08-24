/** ZİNDAN OTURUMU — AYRI KARAKTER (P3.5)
 *
 *  ══════════════ NEDEN AYRI BİR SINIF ══════════════
 *  Zindanın kendi karakteri var: ayrı seviye, envanter, ekipman, altın
 *  ve ilerleme. Kullanıcı kararı: "data duplication değil, progression
 *  separation".
 *
 *  Bu, mevcut mimaride ucuza çıkıyor — `PrototypeState` kurucusu zaten
 *  `(seed, slots, worldCfg, saveKey)` alıyor. İkinci bir ÖRNEK yeterli;
 *  savaş, item, skill, örs ve ganimet aynen paylaşılır çünkü hepsi
 *  saf veri ya da örnek başına durum.
 *
 *  ══════════════ EN CİDDİ RİSK: KAYIT KARIŞMASI ══════════════
 *  İki karakter aynı anahtara yazarsa biri diğerini SİLER. Anahtar
 *  artık kurucudan geliyor ve iki anahtarın farklı olduğu testle
 *  korunuyor.
 *
 *  ══════════════ ZİNDAN SLOT TABLOSU BOŞ ══════════════
 *  Normal haritanın 52 slotu zindanda DOĞMAZ: moblar dalga hâlinde
 *  gelir. Boş slot listesiyle kurulan `PrototypeState` hiç mob
 *  doğurmaz ve dünya sessiz kalır. */

import { PrototypeState } from '../state.js';
import { DUNGEON_SAVE_KEY } from '../data/proto-save.js';
import { DungeonState } from './DungeonState.js';
import { CORPSE_VISIBLE_SEC } from '../render3d/frame.js';
import { WaveSpawner } from './WaveSpawner.js';
import { mulberry32 } from '../../../src/engine/rng.js';
import { DUNGEON_WORLD } from '../data/dungeon-world.js';
import {
  DUNGEON_DROP_UPGRADE, WAVE_OVERLAP_THRESHOLD, WAVE_REWARD_MULT, WAVE_TROPHY_CHANCE,
} from '../data/wave-floors.js';
import { DUNGEON_TROPHY_REF } from '../data/sell-prices.js';
import { planPurchase, shopCatalog, type BuyResult } from '../ui/potion-shop.js';

export class DungeonSession {
  /** Zindan karakteri — normal dünyadakinden BAĞIMSIZ. */
  readonly state: PrototypeState;
  /** Kat/dalga sayaçları. */
  readonly dungeon: DungeonState;
  readonly spawner: WaveSpawner;

  constructor(seed = 20260824) {
    /* BOŞ SLOT TABLOSU: zindanda sabit mob yok, yalnız dalga. */
    /* P3.20 — ZİNDAN ARTIK KENDİ HARİTASINDA: Moradon yapılandırması
       yerine küçük düz arena (bkz. `data/dungeon-world.ts`). Doğuş arena
       merkezidir; Moradon yürüme maskesi ve engelleri burada GEÇERSİZ. */
    this.state = new PrototypeState(seed, [], DUNGEON_WORLD, DUNGEON_SAVE_KEY);
    this.spawner = new WaveSpawner({
      rng: mulberry32(seed ^ 0x5eed),
      ai: this.state.mobs.ai,
      playerAt: () => ({ x: this.state.world.worldX, y: this.state.world.worldY }),
    });
    this.dungeon = new DungeonState(this.spawner);
    /* ═══ P3.18 — ZİNDANDA RESPAWN YOK ═══
       Dalga mobunun `slotId`'si gerçek bir slot DEĞİL (`wave_1_3`),
       bu yüzden `MobSlotSystem.respawn` evi bulamaz ve mobu EV
       NOKTASINDA — yani oyuncunun konumunda — yeniden doğurur.

       Ceset budaması bunu genelde önler (4 sn < 8 sn) ama bir kare
       gecikmesi bile mobun oyuncunun dibinde belirmesine yeter. Bu
       yüzden sayacın kendisi devre dışı bırakılır: ikinci bir savunma
       hattı.

       `respawnOverrideSec` bu zindanın KENDİ AI denetleyicisindedir;
       normal dünya etkilenmez. */
    this.state.mobs.ai.respawnOverrideSec = Number.POSITIVE_INFINITY;
    /* ═══ ZİNDAN ÖDÜL KURALLARI ═══
       Kanca burada bağlanır; normal dünyanın `PrototypeState` örneği
       bunu ASLA görmez, o yüzden zindan kuralı oraya sızamaz. */
    this.state.drops.deps.dungeon = {
      floor: () => this.dungeon.floor,
      rewardMult: WAVE_REWARD_MULT,
      dropUpgrade: DUNGEON_DROP_UPGRADE,
      trophyRef: DUNGEON_TROPHY_REF,
      trophyChance: WAVE_TROPHY_CHANCE,
    };
    /* EXP de yarıya iner — kullanıcı kararı. `BalanceProfile` zaten
       bu iş için var; ayrı bir çarpan katmanı eklemedim. */
    this.state.balance.set({
      expMultiplier: this.state.balance.exp * WAVE_REWARD_MULT,
    });
    /* P3.12 — ZİNDANDA GENIE SABİT KALIR (kullanıcı kararı).
       Moblar zaten oyuncuya geliyor; Genie'nin onlara doğru yürümesi
       dikey akışı bozuyor ve oyuncu kontrolü kaybediyordu. Hareket
       tamamen joystick'e kalır, saldırı ve iksir Genie'de. */
    this.state.genie.settings.holdPosition = true;

    /* NOT: karakter zaten yirmi can iksiriyle doğuyor (`PrototypeState`
       başlangıç envanteri). Zindana AYRICA iksir vermedim — ölçüm,
       asıl sorunun iksir eksikliği değil ERKEN DALGA KALABALIĞI
       olduğunu gösterdi (bkz. `wave-floors.ts`, `WAVE_MIN_COUNT`). */
  }

  /** Doğan dalgayı dünyaya bağlar: `MobSlotSystem`in mob listesine
   *  eklenir ki savaş, hedefleme ve ganimet aynı kapılardan geçsin. */
  /** ═══ P3.23 — DALGALAR ÖRTÜŞÜR ═══
   *  Ölçüldü: zindanda dakikada 5 kill, Moradon'da 30. Fark dalga
   *  döngüsündeki ÖLÜ ZAMANDAN geliyordu — dalga bitiyor, sonraki
   *  doğuyor, 720 birim yürüyor, ancak sonra dövüş başlıyor.
   *
   *  Artık sahadaki dalga İNCELDİĞİNDE sonraki doğar; yürüyüş süresi
   *  dövüşle örtüşür ve akış kesilmez. "Yukarıdan gelen dalga" hissi
   *  korunur, yalnız aralık kapanır. */
  get waveThin(): boolean {
    const alive = this.dungeon.activeMobs.filter((m) => m.ai !== 'dead').length;
    return alive <= WAVE_OVERLAP_THRESHOLD;
  }

  startNextWave(): boolean {
    const w = this.dungeon.startNextWave(WAVE_OVERLAP_THRESHOLD);
    if (!w) return false;
    for (const m of w.mobs) this.state.mobs.mobs.push(m);
    return true;
  }

  /** Temizlenen dalganın cesetlerini dünyadan siler ve sayacı
   *  ilerletir. Zindanda respawn yok; ceset birikmemeli.
   *
   *  ═══ P3.16 — REAP EDİLMEMİŞ CESET SÜPÜRÜLMEZ ═══
   *  Oyun testi bulgusu: "moblar ölüyor ama EXP gelmiyor". Sebep bir
   *  SIRA hatasıydı: sahne önce süpürüyor, sonra `reapDead()` çağırıyordu.
   *  Ölen mob listeden çıkınca ödül kapısı onu HİÇ GÖRMÜYOR ve EXP,
   *  coin, ganimet buharlaşıyordu.
   *
   *  Sıra sahnede düzeltildi; buraya da bir KORUMA konuldu: `dying`
   *  durumundaki (henüz ödülü verilmemiş) mob süpürülmez. Böylece
   *  ileride sıra yeniden bozulsa bile ödül kaybolmaz. */
  sweepCleared(): boolean {
    /* Ödülü verilmemiş ceset varsa BEKLE — `reapDead()` onu bu karede
       ya da sonraki karede işleyecek. */
    const pending = this.state.mobs.mobs.some(
      (m) => m.slotId.startsWith('wave_') && m.state === 'dying' && m.ai !== 'dead',
    );
    if (pending) return false;
    if (!this.dungeon.completeWaveIfCleared()) return false;

    /* ═══ P3.17 — CESET ÖLÜM ANİMASYONUNU OYNASIN ═══
       Oyun testi bulgusu: "zindanda moblarda ölme efekti yok". Sebep:
       dalga temizlenir temizlenmez bütün cesetler listeden siliniyordu.
       Renderer görseli `frame.mobs` üzerinden kurar; mob listeden
       çıkınca ölüm klibi (goblin `05_DEATH`, 1,4 sn) hiç oynamıyordu.

       Artık dalga sayacı HEMEN ilerler (oyun akışı durmaz) ama ceset
       `CORPSE_VISIBLE_SEC` boyunca listede KALIR. Renderer zaten o
       süre dolunca görseli kendiliğinden söküyor — iki taraf aynı
       sabiti kullanır, iki farklı süre olmaz. */
    this.pruneFadedCorpses();
    return true;
  }

  /** Görselini tamamlamış cesetleri listeden çıkarır.
   *
   *  Her karede çağrılabilir; dalga bitmemiş olsa bile eski cesetler
   *  temizlenir. Zindanda respawn yok, ceset birikmemeli. */
  pruneFadedCorpses(): void {
    /* `mobs` salt okunur bir dizi ALANIDIR — yeniden atanamaz, yerinde
       budanır. Referansı koruyan sistemler (AI, hedefleme) bozulmasın. */
    /* ═══ P3.18 — "CANLI" GERÇEKTEN CANLI DEMEK ═══
       Önceki hâlde `live`, sahadaki dalganın BÜTÜN üyeleriydi — ölüler
       dahil. Dalga sürerken ölen mob "canlı" sayılıp listede kalıyor,
       sekiz saniye sonra respawn sayacı dolunca OYUNCUNUN DİBİNDE
       yeniden doğuyordu (bulgu: "ölen moblar dibimde spawn oluyor").

       Zindanda respawn YOKTUR; ölü mob yalnız cesedi kadar yaşar. */
    /* SAHADAKİ dalganın üyeleri — bunun DIŞINDAKİ canlı dalga mobu
       bir DİRİLİŞ demektir ve kaldırılır. Üçüncü savunma hattı:
       respawn sayacı herhangi bir yolla sıfırlanırsa mob yine de
       oyuncunun dibinde kalıcı olamaz. */
    const inWave = new Set(this.dungeon.activeMobs.map((m) => m.uid));
    const keep = this.state.mobs.mobs.filter((m) => {
      if (!m.slotId.startsWith('wave_')) return true;
      if (m.ai === 'dead') return m.deathTimer <= CORPSE_VISIBLE_SEC;
      return inWave.has(m.uid);                          // canlı ama dalgada mı
    });
    this.state.mobs.mobs.length = 0;
    this.state.mobs.mobs.push(...keep);
  }

  /** Ölüm: bir kat düş, sahayı temizle, karakteri dirilt. */
  onDeath(): number {
    const floor = this.dungeon.onDeath();
    const keep = this.state.mobs.mobs.filter((m) => !m.slotId.startsWith('wave_'));
    this.state.mobs.mobs.length = 0;
    this.state.mobs.mobs.push(...keep);
    this.state.reviveAtSpawn();
    return floor;
  }

  /** Kaydeder. Zindan ilerlemesi karakterin yanına yazılır — ikisi
   *  ayrılamaz, birlikte anlamlıdır. */
  save(): boolean {
    const snap = this.state.snapshot();
    return this.state.saves.save({ ...snap, dungeon: this.dungeon.serialize() });
  }

  /** Yükler. Kayıt yoksa `false` — yeni zindan karakteri başlar. */
  load(): boolean {
    const d = this.state.saves.load();
    if (!d) return false;
    this.state.restore(d);
    this.dungeon.restore(d.dungeon);
    return true;
  }

  /** İKSİR SATIN ALMA. Kısmi alım yoktur (bkz. `planPurchase`).
   *
   *  Genie'nin iksir tüketimiyle bu satın alma AYNI envanteri kullanır;
   *  ayrı bir "mağaza stoğu" yoktur. */
  buyPotion(itemRef: number, quantity: number): BuyResult {
    const entry = shopCatalog().find((e) => e.itemRef === itemRef);
    const coins = this.state.player.coins;
    const plan = planPurchase(entry, quantity, coins);
    if (!plan.ok || !entry) {
      return {
        ok: false, fail: plan.fail, itemRef, quantity,
        cost: plan.cost, coinsAfter: coins,
      };
    }
    const add = this.state.inventory.add(itemRef, { quantity });
    if (!add.ok) {
      return {
        ok: false, fail: 'inventoryFull', itemRef, quantity,
        cost: plan.cost, coinsAfter: coins,
      };
    }
    /* Altın YALNIZ envantere gerçekten girdikten sonra düşer —
       sıra ters olsaydı dolu çantada para buharlaşırdı. */
    this.state.player.coins = coins - plan.cost;
    return {
      ok: true, itemRef, quantity, cost: plan.cost,
      coinsAfter: this.state.player.coins,
    };
  }
}
