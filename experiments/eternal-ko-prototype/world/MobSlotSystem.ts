/** SPAWN SLOT SİSTEMİ — P1.6, P2.4B'de ÇOK ÖRNEKLİ
 *
 *  Spawn slotu AYRI bir domain kavramıdır (`data/mob-slot-schema.ts` →
 *  `MobSpawnSlot`). P2.4B'den itibaren bir slot TEK bir mob türünün 5..8
 *  BAĞIMSIZ örneğini taşır; her örneğin kendi uid'i, generation'ı, HP'si,
 *  konumu, AI durumu ve KENDİ respawn sayacı vardır.
 *
 *  ══════════════ RESPAWN ÖRNEK BAZLIDIR ══════════════
 *  Bir örnek ölünce YALNIZ o örnek `slot.respawnSec` sonra döner. Slot
 *  SIFIRLANMAZ, diğer örnekler etkilenmez, population anlık olarak count'a
 *  ZIPLAMAZ. Bu sayaç `MobAiRuntime.respawnTimer` içindedir ve zaten örnek
 *  başınadır — P2.4B bunu değiştirmez, yalnız slot başına birden çok örnek
 *  üretir.
 *
 *  ══════════════ POPULATION SIZINTISI İMKÂNSIZ ══════════════
 *  Bir slot yuvası (`slotId + instanceIndex`) için EN FAZLA BİR mob NESNESİ
 *  vardır; respawn yeni nesne yaratmaz, aynı nesneye yeni uid/generation verir.
 *  `populate()` dolu yuvayı atlar. Bu yüzden canlı sayı count'u AŞAMAZ.
 *
 *  AI burada DEĞİLDİR: davranış `world/MobAi.ts` içindeki durum makinesindedir.
 *  Bu sınıf yalnız yaşam döngüsünü (spawn / ölüm / respawn) ve mob listesini
 *  yönetir; hasar uygulamasını `world/MobAttack.ts` yapar.
 *
 *  Monster statları ANA VERİ katmanından gelir (`monsters.json` → `Content.monster`);
 *  burada HP/hasar HARDCODE EDİLMEZ. */
import { Content } from '../../../src/game/data/GameContentRepository.js';
import type { Rng } from '../../../src/engine/rng.js';
import type { MobSpawnSlot } from '../data/mob-slot-schema.js';
import { instanceSpawnPoint, slotPlacement } from '../data/mob-slot-schema.js';
import { MobAiController, type MobAiRuntime, type MobPhase } from './MobAi.js';
import type { MobHitEvent } from './MobAttack.js';
import type { PlayerWorldState, WorldMob } from './types.js';
import { hitboxRadius } from './hitbox.js';

export interface MobSlotDeps {
  rng: Rng;
  /** Aggro yarıçapı çarpanı (DEV panelinden). */
  aggroMult: () => number;
  /** Mob HP çarpanı (BalanceProfile). Kaynak DB değeri değişmez; runtime katsayıdır. */
  hpMult?: () => number;
  /** Oyuncu hayatta mı? */
  playerAlive: () => boolean;
  /** Vuruş anında hasarı uygulayan tek yol (`MobAttackProfile.strike`). */
  strike: (mob: WorldMob) => MobHitEvent | null;
  /** P2.4C — ADIM KAPISI (oyuncuyla AYNI fonksiyon). Yalnız `MobAi`'ye
   *  aktarılır; bu sınıf hareket etmez. */
  stepAllowed?: (fx: number, fy: number, tx: number, ty: number) => boolean;
}

export interface MobTelemetryRow {
  uid: number;
  slotId: string;
  instanceIndex: number;
  generation: number;
  name: string;
  aiType: string;
  phase: MobPhase;
  hp: number;
  maxHp: number;
  distPlayer: number;
  distHome: number;
  aggro: boolean;
  aggroCause: string;
  respawnIn: number;
}

export class MobSlotSystem {
  readonly mobs: WorldMob[] = [];
  readonly ai: MobAiController;
  /** P1.6.1 — ENTITY uid sayacı ARTIK MODÜL DÜZEYİNDE DEĞİL.
   *  Global `let nextUid` iki farklı `PrototypeState` arasında sızıyor ve
   *  testlerin uid'lerini birbirine bağımlı kılıyordu. */
  private nextUid = 1;
  private slots: MobSpawnSlot[];
  /** Bu karede düşen mob vuruşları (Scene float-text için okur). */
  readonly lastHits: MobHitEvent[] = [];

  constructor(slots: readonly MobSpawnSlot[], private deps: MobSlotDeps) {
    this.slots = [...slots];
    this.ai = new MobAiController({
      rng: deps.rng,
      aggroMult: deps.aggroMult,
      slotOf: (id) => this.slots.find((s) => s.id === id),
      playerAlive: deps.playerAlive,
      stepAllowed: deps.stepAllowed,
      onAttackHit: (mob) => {
        const ev = this.deps.strike(mob);
        if (ev) this.lastHits.push(ev);
      },
    });
  }

  slotConfigs(): MobSpawnSlot[] { return this.slots; }
  slotOf(id: string): MobSpawnSlot | undefined { return this.slots.find((s) => s.id === id); }

  /** Slot başına `count` örnek (legacy tekil slotta 1).
   *  DUPLICATE KORUMASI: bir YUVADA (`slotId + instanceIndex`) zaten bir mob
   *  KAYDI varsa (canlı ya da respawn bekleyen ceset) yeni mob ÜRETİLMEZ.
   *  Yeniden doğuş `MobAiController` → `respawn()` yoluyla AYNI nesne üzerinde
   *  olur; ikinci nesne asla yaratılmaz → population sızıntısı imkânsız. */
  populate(): { spawned: number; failed: number } {
    let spawned = 0, failed = 0;
    for (const slot of this.slots) {
      const { count } = slotPlacement(slot);
      for (let i = 0; i < count; i++) {
        if (this.mobs.some((m) => m.slotId === slot.id && m.instanceIndex === i)) continue;
        if (this.spawnOne(slot, i)) spawned += 1; else failed += 1;
      }
    }
    return { spawned, failed };
  }

  /** Slotun HEDEF population'ı (kanonik slotta 5..8, legacy slotta 1). */
  targetCount(slotId: string): number {
    const slot = this.slotOf(slotId);
    return slot ? slotPlacement(slot).count : 0;
  }

  /** Slotun ürettiği bütün örnekler (canlı + ceset). */
  instancesOf(slotId: string): WorldMob[] {
    return this.mobs.filter((m) => m.slotId === slotId);
  }

  /** Slotta yaşayan (ceset olmayan) mob sayısı. */
  aliveIn(slotId: string): number {
    return this.mobs.filter((m) => m.slotId === slotId && m.ai !== 'dead').length;
  }

  private spawnOne(slot: MobSpawnSlot, instanceIndex: number): WorldMob | null {
    const monster = Content.monster(slot.monsterRef);
    if (!monster) return null;                       // bilinmeyen ID → sessiz atla
    const hp = Math.max(1, Math.round(monster.hp * (this.deps.hpMult?.() ?? 1)));
    /* Her ÖRNEĞİN kendi evi vardır — slot merkezi DEĞİL. Roam/leash bu noktadan
       hesaplanır, böylece aynı dikdörtgendeki 8 mob birbirine yapışmaz. */
    const home = instanceSpawnPoint(slot, instanceIndex, 1);
    const mob: WorldMob = {
      uid: this.nextUid++,
      monster,
      x: home.x, y: home.y,                          // EnemyUnit uyumluluğu (mirror)
      worldX: home.x, worldY: home.y,
      hp, maxHp: hp,
      attackTimer: 0,
      state: 'walk',
      deathTimer: 0,
      status: [],
      slotId: slot.id,
      instanceIndex,
      generation: 1,
      combatRadius: hitboxRadius(monster, slot),
      ai: 'idle',
      homeX: home.x, homeY: home.y,
      respawnTimer: 0,
      facing: -1,
      animT: 0,
    };
    this.mobs.push(mob);
    this.ai.register(mob, slot.aiType);
    return mob;
  }

  /** Ölüm bildirimi — tek ölüm kapısı (`reapDead`) çağırır. */
  markDead(mob: WorldMob): void {
    mob.ai = 'dead';
    mob.state = 'dying';
    mob.deathTimer = 0;
    this.ai.notifyDead(mob);
  }

  /** IMPACT anında hasar alan mob — aggro yalnız BURADAN tetiklenir. */
  notifyDamaged(mob: WorldMob): void { this.ai.notifyDamaged(mob); }

  update(dt: number, player: PlayerWorldState): MobHitEvent[] {
    this.lastHits.length = 0;
    for (const mob of this.mobs) {
      this.ai.step(dt, mob, player, (m, rt) => this.respawn(m, rt));
    }
    return this.lastHits;
  }

  /** AYNI slotta, AYNI ev noktasında yeniden doğuş.
   *
   *  P1.6.1 — KİMLİK KURALI: yeni mob NESNESİ üretilmez (duplicate imkânsız),
   *  ama entity **YENİ BİR uid** ve **BİR ARTIRILMIŞ generation** alır. Ölen
   *  canlının uid'i BİR DAHA ASLA kullanılmaz; böylece hâlâ havada olan eski
   *  oklar, eski hedef listeleri ve stale telemetri yeni canlıya çözülemez.
   *  Slot kimliği (`slotId`) değişmez — slot ile örnek AYRI kavramlardır. */
  private respawn(mob: WorldMob, _rt: MobAiRuntime): void {
    const oldUid = mob.uid;
    mob.uid = this.nextUid++;
    mob.generation += 1;
    this.ai.reindex(oldUid, mob.uid);
    const slot = this.slotOf(mob.slotId);
    /* P2.4B — YENİ NESİL, DİKDÖRTGEN İÇİNDE YENİ BİR NOKTADA doğar (§17).
       Nokta `(slotId, instanceIndex, generation)` üçlüsünden DETERMİNİSTİK
       türer; örnek kendi hücresinde kalır, bu yüzden komşusunun üstüne düşemez.
       Legacy tekil slotta dikdörtgen eve çöktüğü için davranış DEĞİŞMEZ. */
    const home = slot
      ? instanceSpawnPoint(slot, mob.instanceIndex, mob.generation)
      : { x: mob.homeX, y: mob.homeY };
    const hx = home.x;
    const hy = home.y;
    mob.homeX = hx; mob.homeY = hy;
    mob.worldX = hx; mob.worldY = hy;
    mob.x = hx; mob.y = hy;
    mob.maxHp = Math.max(1, Math.round(mob.monster.hp * (this.deps.hpMult?.() ?? 1)));
    mob.hp = mob.maxHp;
    mob.state = 'walk';
    mob.ai = 'idle';
    mob.deathTimer = 0;
    mob.status = [];
    mob.attackTimer = 0;
    mob.respawnTimer = 0;
  }

  /** §29 — mob telemetrisi. */
  telemetry(player: PlayerWorldState): MobTelemetryRow[] {
    return this.mobs.map((m) => {
      const rt = this.ai.runtimeOf(m.uid);
      const slot = this.slotOf(m.slotId);
      return {
        uid: m.uid,
        slotId: m.slotId,
        instanceIndex: m.instanceIndex,
        generation: m.generation,
        name: slot?.displayName ?? m.monster.displayName,
        aiType: slot?.aiType ?? 'NORMAL',
        phase: rt?.phase ?? 'IDLE',
        hp: Math.round(m.hp), maxHp: m.maxHp,
        distPlayer: Math.round(Math.hypot(m.worldX - player.worldX, m.worldY - player.worldY)),
        distHome: Math.round(Math.hypot(m.worldX - m.homeX, m.worldY - m.homeY)),
        aggro: rt?.aggro ?? false,
        aggroCause: rt?.aggroCause ?? 'none',
        respawnIn: Math.max(0, Math.round((rt?.respawnTimer ?? 0) * 10) / 10),
      };
    });
  }

  /** §30 — farm alanı özeti. */
  areaTelemetry(): {
    slots: number; population: number; alive: number; dead: number; byType: Record<string, number>;
  } {
    const byType: Record<string, number> = { NORMAL: 0, AGGRESSIVE: 0, ELITE: 0 };
    for (const s of this.slots) byType[s.aiType] = (byType[s.aiType] ?? 0) + 1;
    const alive = this.mobs.filter((m) => m.ai !== 'dead' && m.state !== 'dying').length;
    const population = this.slots.reduce((n, sl) => n + slotPlacement(sl).count, 0);
    return { slots: this.slots.length, population, alive, dead: this.mobs.length - alive, byType };
  }
}
