/** DALGA DOĞUŞU — ZİNDAN (P3.3)
 *
 *  ══════════════ NEDEN AYRI BİR DOĞUŞ YOLU ══════════════
 *  `MobSlotSystem` SLOT tabanlıdır: sabit dikdörtgenler, slot başına
 *  5-8 örnek, ölünce respawn sayacı. Dalga mantığı buna oturmaz —
 *  dalga gelir, hepsi ölür, sonraki dalga gelir; respawn YOKTUR.
 *
 *  Bu yüzden doğuş ayrı. Ama `WorldMob`, `MobAi`, savaş zinciri ve
 *  ganimet AYNEN kullanılır: kullanıcı kararı "yeni düşman sistemi
 *  kurmak istemiyoruz".
 *
 *  ══════════════ YERLEŞİM: DİKEY EKRAN ══════════════
 *  Kullanıcı kararı: telefon dikey, oyuncu ekranın ALTINDA, moblar
 *  YUKARIDAN aşağı geliyormuş gibi görünsün.
 *
 *  Bu yüzden dalga, oyuncunun ÜSTÜNDE bir şeritte doğar ve mob AI'ı
 *  onları aşağı, oyuncuya doğru getirir. Doğuş noktaları şeride
 *  yayılır ki hepsi tek noktadan akmasın.
 *
 *  ══════════════ SAF DEĞİL, AMA DAR ══════════════
 *  Bu dosya `WorldMob` üretir ve `MobAi`ye kaydeder — mutasyon burada
 *  biter. Savaş, ganimet ve EXP başka kapılardadır. */

import { Content } from '../../../src/game/data/GameContentRepository.js';
import type { MobAiController } from './MobAi.js';
import type { WorldMob } from './types.js';

import { hitboxRadius } from './hitbox.js';
import { floorMonsters, floorStatMult, planWave, type WavePlan } from '../data/wave-floors.js';

/** Dalganın doğduğu şerit: oyuncunun kaç birim ÜSTÜ. */
export const SPAWN_BAND_AHEAD = 620;
/** Şeridin yatay genişliği — moblar buna yayılır. */
export const SPAWN_BAND_WIDTH = 520;
/** Şeridin dikey derinliği: hepsi tam aynı hizada belirmesin. */
export const SPAWN_BAND_DEPTH = 180;

export interface WaveSpawnDeps {
  rng: () => number;
  ai: MobAiController;
  /** Oyuncunun konumu — şerit buna göre yerleşir. */
  playerAt: () => { x: number; y: number };
}

/** Bir dalganın doğurduğu moblar ve planı. */
export interface SpawnedWave {
  readonly plan: WavePlan;
  readonly mobs: WorldMob[];
}

export class WaveSpawner {
  /** Zindan mobları AYRI uid uzayında: normal dünyanın uid'leriyle
   *  karışırsa havadaki oklar yanlış hedefe bağlanır. */
  private nextUid = 5_000_000;

  private deps: WaveSpawnDeps;

  constructor(deps: WaveSpawnDeps) { this.deps = deps; }

  /** `floor` katında `waveIndex` dalgasını doğurur.
   *
   *  Mob TÜRÜ katın bandından, SAYI ve ÇARPAN dalga planından gelir.
   *  Kaynak mob verisi DEĞİŞMEZ — çarpan runtime katsayısıdır, tıpkı
   *  normal haritadaki `hpMult` gibi. */
  spawn(floor: number, waveIndex: number): SpawnedWave {
    const plan = planWave(waveIndex);
    const refs = floorMonsters(floor);
    const mult = plan.statMult * floorStatMult(floor);
    const at = this.deps.playerAt();
    const mobs: WorldMob[] = [];

    for (let i = 0; i < plan.count; i++) {
      const ref = refs[Math.floor(this.deps.rng() * refs.length) % refs.length]!;
      const monster = Content.monster(ref);
      if (!monster) continue;

      /* ŞERİDE YAY: yatayda eşit aralık + küçük sapma, dikeyde rastgele
         derinlik. Tek noktadan akmasınlar. */
      const t = plan.count === 1 ? 0.5 : i / (plan.count - 1);
      const jitterX = (this.deps.rng() - 0.5) * (SPAWN_BAND_WIDTH / Math.max(2, plan.count));
      const x = at.x + (t - 0.5) * SPAWN_BAND_WIDTH + jitterX;
      const y = at.y - SPAWN_BAND_AHEAD - this.deps.rng() * SPAWN_BAND_DEPTH;

      /* Statlar ÖLÇEKLENİR ama kaynak nesne KOPYALANIR — `Content`
         deposundaki kayıt asla değiştirilmez. */
      const scaled = {
        ...monster,
        hp: Math.max(1, Math.round(monster.hp * mult)),
        attack: Math.max(1, Math.round(monster.attack * mult)),
      };
      const hp = scaled.hp;

      const mob: WorldMob = {
        uid: this.nextUid++,
        monster: scaled,
        x, y, worldX: x, worldY: y,
        hp, maxHp: hp,
        attackTimer: 0,
        state: 'walk',
        deathTimer: 0,
        status: [],
        /* Slot kimliği dalgayı işaretler: aynı dalganın mobları bir
           arada sayılabilsin. Zindanda RESPAWN YOK. */
        slotId: `wave_${floor}_${waveIndex}`,
        instanceIndex: i,
        generation: 1,
        combatRadius: hitboxRadius(scaled, undefined),
        ai: 'idle',
        /* EV oyuncunun tarafı: mob aşağı, oyuncuya doğru gelsin.
           Leash mantığı bu noktadan hesaplanır. */
        homeX: at.x, homeY: at.y,
        respawnTimer: 0,
        facing: -1,
        animT: 0,
      };
      /* Dalga mobları AGGRESSIVE: gelip saldırsınlar, dolaşmasınlar. */
      this.deps.ai.register(mob, plan.kind === 'normal' ? 'AGGRESSIVE' : 'ELITE');
      mobs.push(mob);
    }
    return { plan, mobs };
  }

  /** Bir dalga bitti mi? Zindanda respawn olmadığı için "hepsi ölü"
   *  yeterlidir; ceset süresi beklenmez. */
  static isCleared(mobs: readonly WorldMob[]): boolean {
    return mobs.every((m) => m.hp <= 0 || m.ai === 'dead');
  }
}
