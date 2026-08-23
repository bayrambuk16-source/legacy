/** DROP & TESLİMAT AUTHORITY — P1.7
 *
 *  Kill olayı → drop roll → sahiplenmiş loot → teslimat. TEK YOL BURASIDIR:
 *  Scene'de drop tablosu yoktur, Genie'nin kendi loot yolu yoktur.
 *
 *  ══ NE YENİDEN YAZILMAZ ══
 *  · Drop tablosu semantiği: ana `LootSystem.roll()` (iki aşamalı; yuva tetiği
 *    + grup içi tekdüze üye seçimi). Formül burada KOPYALANMAZ.
 *  · Envanter kuralları: ana `InventoryState` (kapasite, yığın, instance).
 *  · Item adı/stat/ikon/rarity: `Content.item()` (§15) — buraya kopyalanmaz.
 *
 *  ══ TESLİMAT KARARI ══
 *      AUTO LOOT ON   → MESAFEYE BAKILMAZ, doğrudan envanter/cüzdan denenir
 *                       envanter kabul etmezse → mobun ÖLÜM NOKTASINDA yere düşer
 *      AUTO LOOT OFF  → her zaman yere düşer (oyuncu manuel toplar)
 *
 *  Auto Loot bir OYUNCU TERCİHİDİR ve Genie'den BAĞIMSIZDIR (§22): Genie kapalı
 *  iken manuel öldürülen mobun dropu da doğrudan envantere girebilir.
 *
 *  ══ RNG ══
 *  Drop RNG gameplay sisteminin parçasıdır ve DIŞARIDAN ENJEKTE EDİLİR
 *  (`LootSystem`'in tohumlu rng'si). Bu katmanda `Math.random()` YOKTUR. */
import type { LootSystem } from '../../../src/game/systems/LootSystem.js';
import type { InventoryState } from '../../../src/game/systems/InventoryState.js';
import type { PlayerState } from '../../../src/game/systems/PlayerState.js';
import { Content } from '../../../src/game/data/GameContentRepository.js';
import type { Rng } from '../../../src/engine/rng.js';
import { SCROLL_ITEM_REF } from './ForgeSystem.js';
import {
  DROP_TUNING_V1, dropProfile, effectiveCoin,
  type DropTuning, type MonsterDropProfile,
} from '../data/drop-profile.js';
import type { WorldLootSystem } from './WorldLootSystem.js';
import type { WorldMob } from './types.js';

/** Bir itemin oyuncuya nasıl ulaştığı. */
export type LootDelivery =
  | 'AUTO_INVENTORY'          // Auto Loot ON · doğrudan envantere/cüzdana
  | 'FULL_INVENTORY_GROUND'   // Auto Loot ON ama envanter almadı → yere
  | 'GROUND';                 // Auto Loot OFF → yere (manuel toplanır)

/** Tek bir drop kaydı (telemetri §24). */
export interface DropRecord {
  itemRef: number;
  itemName: string;
  quantity: number;
  kind: 'item' | 'coin';
  /** Hangi kaynak yuvasından geldi. */
  /** Hangi kaynaktan geldi. `scroll` P2.8'de eklendi: parşömen ganimet
   *  tablosundan DEĞİL, Örs'e özel sabit şanstan gelir. */
  from: 'direct' | 'group' | 'coin' | 'scroll';
  delivery: LootDelivery;
  ownerPlayerId: number;
  /** Yere düştüyse entity kimliği. */
  lootUid: number | null;
}

/** Bir kill'in TAM drop olayı. */
export interface DropEvent {
  /* kaynak mob kimliği */
  mobUid: number;
  monsterRef: number;
  monsterName: string;
  spawnSlot: string;
  generation: number;
  worldX: number;
  worldY: number;
  /* kaynak zinciri */
  lootTableId: string;
  sourceChain: string;
  /* sonuç */
  records: DropRecord[];
  coin: number;
  coinDelivery: LootDelivery;
  exp: number;
  autoLoot: boolean;
}

export interface DropSystemDeps {
  /** P2.8 — parşömen zarı. `LootSystem`'inkiyle AYNI tohumlu akış olmalı;
   *  ayrı bir akış açmak tekrar üretilebilirliği bozar. */
  rng: Rng;
  loot: LootSystem;
  inventory: InventoryState;
  player: PlayerState;
  ground: WorldLootSystem;
  /** Auto Loot açık mı? OYUNCU TERCİHİ — Genie durumundan bağımsız. */
  autoLoot: () => boolean;
}

/** Parşömen düşme şansı (mob başına). PROJECT LEGACY KARARI — kaynaktan
 *  gelmez. %6: yaklaşık 17 mobda bir parşömen, elitlerde iki katı. */
export const SCROLL_DROP_CHANCE = 0.06;

export class DropSystem {
  tuning: DropTuning = { ...DROP_TUNING_V1 };
  /** Son kill'in drop olayı (DEV telemetrisi). */
  last: DropEvent | null = null;
  /** Toplam sayaçlar (soak/telemetri). */
  readonly totals = { kills: 0, items: 0, coin: 0, toInventory: 0, toGround: 0, blockedFull: 0 };

  constructor(private deps: DropSystemDeps) {}

  profileFor(monsterRef: number): MonsterDropProfile | null { return dropProfile(monsterRef); }

  /** KILL BAŞINA BİR KEZ çağrılır (`PrototypeState.reapDead`).
   *  İkinci çağrı ikinci drop üretir — bu yüzden tek reap kapısı korunur (§19). */
  resolve(mob: WorldMob, exp: number): DropEvent {
    const monsterRef = mob.monster.sourceRef;
    const profile = this.profileFor(monsterRef);
    const autoLoot = this.deps.autoLoot();
    const owner = this.tuning.ownerPlayerId;

    /* ── 1) ROLL — ana LootSystem, tohumlu rng ── */
    const rolled = this.deps.loot.roll(mob.monster.lootTableId);

    const ev: DropEvent = {
      mobUid: mob.uid,
      monsterRef,
      monsterName: mob.monster.displayName,
      spawnSlot: mob.slotId,
      generation: mob.generation,
      worldX: mob.worldX,
      worldY: mob.worldY,
      lootTableId: mob.monster.lootTableId,
      sourceChain: profile?.sourceChain ?? `(kaynak tablosu YOK: ${mob.monster.lootTableId})`,
      records: [],
      coin: 0,
      coinDelivery: autoLoot ? 'AUTO_INVENTORY' : 'GROUND',
      exp,
      autoLoot,
    };

    /* ── 2) ITEM'LER — her drop AYRI kayıt / AYRI teslimat (§17) ── */
    for (const d of rolled.drops) {
      ev.records.push(this.deliverItem(mob, d.itemRef, 1, d.from, autoLoot, owner));
    }

    /* ── 2b) YÜKSELTME PARŞÖMENİ (P2.8) ──
       Örs'ün malzemesi. Ganimet tablosundan DEĞİL, ayrı ve sabit bir şanstan
       gelir: kaynak loot tablolarında böyle bir kayıt yoktur, uydurma bir
       satır eklemek yerine ayrı bir kural olarak durur. Elit moblar iki kat.
       Zar aynı tohumlu akıştandır. */
    if (this.deps.rng() < SCROLL_DROP_CHANCE * (mob.monster.tier === 'elite' ? 2 : 1)) {
      ev.records.push(this.deliverItem(mob, SCROLL_ITEM_REF, 1, 'scroll', autoLoot, owner));
    }

    /* ── 3) COIN — envanter slotu KAPLAMAZ, tek authority (§14) ── */
    const coin = profile ? effectiveCoin(profile, this.tuning) : rolled.coin;
    if (coin > 0) {
      ev.coin = coin;
      if (autoLoot) {
        this.deps.player.coins += coin;
        ev.coinDelivery = 'AUTO_INVENTORY';
      } else {
        const entity = this.deps.ground.spawn({
          kind: 'coin', itemRef: 0, quantity: coin, ownerPlayerId: owner,
          worldX: mob.worldX, worldY: mob.worldY,
          sourceMobUid: mob.uid, sourceSpawnSlot: mob.slotId,
          sourceGeneration: mob.generation, sourceMonsterRef: monsterRef,
        }, this.tuning.lootLifetimeSec);
        ev.coinDelivery = 'GROUND';
        ev.records.push({
          itemRef: 0, itemName: 'Altın', quantity: coin, kind: 'coin', from: 'coin',
          delivery: 'GROUND', ownerPlayerId: owner, lootUid: entity.lootUid,
        });
      }
      this.totals.coin += coin;
    }

    this.totals.kills += 1;
    this.last = ev;
    return ev;
  }

  /** Tek bir itemin teslimatı. Envanter reddi item'ı YOK ETMEZ (§8/§16). */
  private deliverItem(
    mob: WorldMob, itemRef: number, quantity: number,
    from: 'direct' | 'group', autoLoot: boolean, owner: number,
  ): DropRecord {
    const itemName = Content.item(itemRef)?.displayName ?? `#${itemRef}`;
    this.totals.items += quantity;

    if (autoLoot) {
      /* MESAFE KONTROLÜ YOKTUR — sahiplik + envanter yeterlidir (§7). */
      const add = this.deps.inventory.add(itemRef, { quantity });
      if (add.ok) {
        this.totals.toInventory += quantity;
        return {
          itemRef, itemName, quantity, kind: 'item', from,
          delivery: 'AUTO_INVENTORY', ownerPlayerId: owner, lootUid: null,
        };
      }
      this.totals.blockedFull += quantity;
    }

    /* Yere düş — DAİMA MOBUN ÖLÜM NOKTASI, oyuncunun konumu DEĞİL. */
    const entity = this.deps.ground.spawn({
      kind: 'item', itemRef, quantity, ownerPlayerId: owner,
      worldX: mob.worldX, worldY: mob.worldY,
      sourceMobUid: mob.uid, sourceSpawnSlot: mob.slotId,
      sourceGeneration: mob.generation, sourceMonsterRef: mob.monster.sourceRef,
    }, this.tuning.lootLifetimeSec);
    this.totals.toGround += quantity;
    return {
      itemRef, itemName, quantity, kind: 'item', from,
      delivery: autoLoot ? 'FULL_INVENTORY_GROUND' : 'GROUND',
      ownerPlayerId: owner, lootUid: entity.lootUid,
    };
  }

  resetTotals(): void {
    this.totals.kills = 0; this.totals.items = 0; this.totals.coin = 0;
    this.totals.toInventory = 0; this.totals.toGround = 0; this.totals.blockedFull = 0;
  }
}
