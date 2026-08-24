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
import { WaveSpawner } from './WaveSpawner.js';
import { mulberry32 } from '../../../src/engine/rng.js';
import { ACTIVE_WORLD } from '../data/world-map.js';
import {
  DUNGEON_DROP_UPGRADE, WAVE_REWARD_MULT, WAVE_TROPHY_CHANCE,
} from '../data/wave-floors.js';
import { DUNGEON_TROPHY_REF } from '../data/sell-prices.js';

export class DungeonSession {
  /** Zindan karakteri — normal dünyadakinden BAĞIMSIZ. */
  readonly state: PrototypeState;
  /** Kat/dalga sayaçları. */
  readonly dungeon: DungeonState;
  readonly spawner: WaveSpawner;

  constructor(seed = 20260824) {
    /* BOŞ SLOT TABLOSU: zindanda sabit mob yok, yalnız dalga. */
    this.state = new PrototypeState(seed, [], ACTIVE_WORLD, DUNGEON_SAVE_KEY);
    this.spawner = new WaveSpawner({
      rng: mulberry32(seed ^ 0x5eed),
      ai: this.state.mobs.ai,
      playerAt: () => ({ x: this.state.world.worldX, y: this.state.world.worldY }),
    });
    this.dungeon = new DungeonState(this.spawner);
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
  }

  /** Doğan dalgayı dünyaya bağlar: `MobSlotSystem`in mob listesine
   *  eklenir ki savaş, hedefleme ve ganimet aynı kapılardan geçsin. */
  startNextWave(): boolean {
    const w = this.dungeon.startNextWave();
    if (!w) return false;
    for (const m of w.mobs) this.state.mobs.mobs.push(m);
    return true;
  }

  /** Temizlenen dalganın cesetlerini dünyadan siler ve sayacı
   *  ilerletir. Zindanda respawn yok; ceset birikmemeli. */
  sweepCleared(): boolean {
    if (!this.dungeon.completeWaveIfCleared()) return false;
    /* `mobs` salt okunur bir dizi ALANIDIR — yeniden atanamaz, yerinde
       budanır. Referansı koruyan sistemler (AI, hedefleme) bozulmasın. */
    const live = new Set(this.dungeon.activeMobs.map((m) => m.uid));
    const keep = this.state.mobs.mobs.filter(
      (m) => live.has(m.uid) || !m.slotId.startsWith('wave_'),
    );
    this.state.mobs.mobs.length = 0;
    this.state.mobs.mobs.push(...keep);
    return true;
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
}
