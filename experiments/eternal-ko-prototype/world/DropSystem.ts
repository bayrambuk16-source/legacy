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
  HIGH_TIER_MONSTER_LEVEL, HIGH_TIER_TROPHY_CHANCE, HIGH_TIER_TROPHY_REF,
  WEAPON_PITY_LIMIT, equipChanceFor, pickFromPool, poolFor, weaponsIn,
} from '../data/moradon-loot-pool.js';
import { WAVE_REWARD_MULT, coinForKill, dungeonLootLevel } from '../data/wave-floors.js';
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
  /** P2.13 — envantere yeni eşya girdi. Oto giy kancası; bağlanmazsa
   *  drop davranışı P2.12 ile birebir aynıdır. */
  onItemAcquired?: (instanceId: number) => void;
  /** ═══ P3.6 — ZİNDAN KİPİ ═══
   *
   *  Bağlanmazsa NORMAL HARİTA davranışı birebir korunur; zindan
   *  kuralları yalnız bu kanca varken devreye girer. Bu, "zindan
   *  kuralı normal haritaya sızmasın" şartının tek yerde tutulmuş
   *  hâlidir. */
  dungeon?: {
    /** Bulunulan kat — ganimet değeri ve kademe bundan türer. */
    floor: () => number;
    /** Ödül çarpanı (EXP ve coin). Kullanıcı kararı: yarısı. */
    rewardMult: number;
    /** Düşen ekipmanın başlangıç yükseltmesi. Kullanıcı kararı: +1. */
    dropUpgrade: number;
    /** Ganimet eşyası ve şansı. */
    trophyRef: number;
    trophyChance: number;
  };
}

/** Parşömen düşme şansı (mob başına). PROJECT LEGACY KARARI — kaynaktan
 *  gelmez. %6: yaklaşık 17 mobda bir parşömen, elitlerde iki katı. */
export const SCROLL_DROP_CHANCE = 0.06;

/* ═══════════ P2.14 — MORADON ÖZEL DROPLARI ═══════════
   Kullanıcı kararı: Moradon'da yalnız şunlar düşsün —
     · zırh / takı / silah   (katalog süzgeci, aşağıda)
     · yükseltme parşömeni   (`SCROLL_DROP_CHANCE`)
     · 5k eden özel bir eşya (`TROPHY_ITEM_REF`)
     · düşük seviye HP/MP iksiri

   Bunlar kaynak ganimet tablolarında YOKTUR; ayrı ve sabit şanslardır.
   Uydurma satır eklemek yerine kural olarak dururlar. */

/** Moradon'a özel değerli ganimet: "Yaşam Taşı".
 *  Kaynak `vendorBuy` 20 000 → satış fiyatı formülümüzle 5 000. */
export const TROPHY_ITEM_REF = 379006000;
export const TROPHY_DROP_CHANCE = 0.03;

/** Düşük seviye iksirler (kaynak: `ko-potions.ts` ilk kademe). */
export const HP_POTION_REF = 389011000;   // Yaşam Suyu  +90
export const MP_POTION_REF = 389016000;   // Ruh İksiri  +120
export const POTION_DROP_CHANCE = 0.18;

export class DropSystem {
  tuning: DropTuning = { ...DROP_TUNING_V1 };
  /** Son kill'in drop olayı (DEV telemetrisi). */
  last: DropEvent | null = null;
  /** Toplam sayaçlar (soak/telemetri). */
  readonly totals = { kills: 0, items: 0, coin: 0, toInventory: 0, toGround: 0, blockedFull: 0 };
  /** P3.22 — art arda kaç ekipman düştü ve hiçbiri silah değildi. */
  private weaponDry = 0;

  /** `deps` PUBLIC: zindan kancası kurulumdan SONRA bağlanır
   *  (`DungeonSession`). Kurucuya taşımak `PrototypeState` imzasını
   *  zindana bulaştırırdı — normal dünya bu kancayı hiç görmemeli. */
  constructor(readonly deps: DropSystemDeps) {}

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

    /* Zindan kipi: bağlı değilse NORMAL HARİTA davranışı birebir. */
    const dg = this.deps.dungeon;

    /* ── 2) EKİPMAN — P2.30'DAN İTİBAREN KATALOGDAN TÜRER ──
       Kaynak ganimet tabloları kataloğumuzun ancak yarısını kapsıyordu:
       takıların HİÇBİRİ, A1'de eklenen Avcı/Zırhlı Avcı setlerinin de
       hiçbiri hiçbir mobun tablosunda yoktu. Bir saat oynayıp bot,
       eldiven ve takı düşmemesinin sebebi buydu.

       Artık havuz MOBUN SEVİYE BANDINDAKİ katalog eşyalarından
       türetilir (`moradon-loot-pool.ts`). Kaynak tablolar SİLİNMEDİ —
       `ev.sourceChain` ve `source.slots` denetlenebilir kalır; yalnız
       oyuncuya ULAŞAN havuz değişti. */
    const eliteX = mob.monster.tier === 'elite' ? 2 : 1;
    /* P2.33 — SV50 GANİMETİ. Yalnız üst seviye moblardan, %0,5.
       Yığılabilir ve 50 000 altın eder; satış kuralı
       `AutoGearSystem.sellPrice` içindedir. */
    /* Elit çarpanı UYGULANMAZ: üst seviye mobların hepsi zaten elit,
       çarpan istenen %0,5'i %1'e çıkarırdı. */
    if (mob.monster.level >= HIGH_TIER_MONSTER_LEVEL
      && this.deps.rng() < HIGH_TIER_TROPHY_CHANCE) {
      ev.records.push(
        this.deliverItem(mob, HIGH_TIER_TROPHY_REF, 1, 'scroll', autoLoot, owner),
      );
    }
    /* Ekipman şansı seviyeye bağlı: üst seviye moblarda İKİ KAT ZOR
       (kullanıcı kararı) — ganimet daha değerli, daha seyrek. */
    if (this.deps.rng() < equipChanceFor(mob.monster.level, eliteX === 2)) {
      /* Zindanda havuz BİR BANT AŞAĞIDAN gelir: ödül yarıya inerken
         drop ŞANSINA dokunmamak için kademe düşürülür (ölçüldü: şansı
         yarıya indirmek üst katlarda modu ölü hissettiriyor). */
      const lootLv = dg ? dungeonLootLevel(mob.monster.level) : mob.monster.level;
      const pool = poolFor(lootLv);
      /* P3.22 — SİLAH ACIMA SAYACI. Okçuda güç yaya bağlıdır; yay
         düşmezse ilerleme kilitlenir (ölçüldü: 32 ekipman, 0 yay).
         Sayaç dolduysa havuz silahlara daraltılır — eşya yine
         havuzdan ve kendi ağırlığıyla seçilir. */
      const dry = this.weaponDry >= WEAPON_PITY_LIMIT;
      const narrowed = dry ? weaponsIn(pool) : pool;
      const pick = pickFromPool(
        narrowed.length > 0 ? narrowed : pool, lootLv, this.deps.rng(),
      );
      if (pick) {
        this.weaponDry = pick.category === 'weapon' ? 0 : this.weaponDry + 1;
      }
      if (pick) {
        ev.records.push(this.deliverItem(
          mob, pick.definitionRef, 1, 'group', autoLoot, owner, dg?.dropUpgrade ?? 0,
        ));
      }
    }
    /* P3.6 — ZİNDAN GANİMETİ: kata göre değeri artan, yığılabilir eşya. */
    if (dg && this.deps.rng() < dg.trophyChance) {
      ev.records.push(this.deliverItem(mob, dg.trophyRef, 1, 'scroll', autoLoot, owner));
    }

    /* ── 2b) YÜKSELTME PARŞÖMENİ (P2.8) ──
       Örs'ün malzemesi. Ganimet tablosundan DEĞİL, ayrı ve sabit bir şanstan
       gelir: kaynak loot tablolarında böyle bir kayıt yoktur, uydurma bir
       satır eklemek yerine ayrı bir kural olarak durur. Elit moblar iki kat.
       Zar aynı tohumlu akıştandır. */
    const eliteMult = mob.monster.tier === 'elite' ? 2 : 1;
    if (this.deps.rng() < SCROLL_DROP_CHANCE * eliteMult) {
      ev.records.push(this.deliverItem(mob, SCROLL_ITEM_REF, 1, 'scroll', autoLoot, owner));
    }
    /* Özel ganimet — yalnız satılır, kuşanılmaz. */
    if (this.deps.rng() < TROPHY_DROP_CHANCE * eliteMult) {
      ev.records.push(this.deliverItem(mob, TROPHY_ITEM_REF, 1, 'scroll', autoLoot, owner));
    }
    /* İksir — HP ve MP eşit şansla, biri ya da diğeri. */
    if (this.deps.rng() < POTION_DROP_CHANCE) {
      const ref = this.deps.rng() < 0.5 ? HP_POTION_REF : MP_POTION_REF;
      ev.records.push(this.deliverItem(mob, ref, 1, 'scroll', autoLoot, owner));
    }

    /* ── 3) COIN — envanter slotu KAPLAMAZ, tek authority (§14) ── */
    /* P3.6 — ZİNDANDA COIN mobun SEVİYESİNDEN türer, kaynak tablodan
       değil: zindan mobu ölçeklenmiş bir kopyadır ve tablodaki sabit
       coin onun zorluğunu yansıtmaz. Ölçek `K_MONSTER.iMoney`den
       çıkarıldı (≈17 coin/seviye) — uydurma değil. */
    const coin = dg
      ? coinForKill(mob.monster.level, dg.rewardMult / WAVE_REWARD_MULT)
      : (profile ? effectiveCoin(profile, this.tuning) : rolled.coin);
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
  /** @param upgradeLevel P3.6 — zindanda ekipman +1 gelir. Varsayılan 0
   *  olduğu için NORMAL HARİTA davranışı değişmez. */
  private deliverItem(
    mob: WorldMob, itemRef: number, quantity: number,
    from: DropRecord['from'], autoLoot: boolean, owner: number,
    upgradeLevel = 0,
  ): DropRecord {
    const itemName = Content.item(itemRef)?.displayName ?? `#${itemRef}`;
    this.totals.items += quantity;

    if (autoLoot) {
      /* MESAFE KONTROLÜ YOKTUR — sahiplik + envanter yeterlidir (§7). */
      const add = this.deps.inventory.add(itemRef, { quantity, upgradeLevel });
      if (add.ok) {
        this.totals.toInventory += quantity;
        /* P2.13 — OTO GİY. Düşen eşya güç skorunu yükseltiyorsa kuşanılır.
           Karar `AutoGearSystem`e aittir; burada yalnız haber verilir.
           Bağlı değilse (test kurulumları) hiçbir şey olmaz. */
        this.deps.onItemAcquired?.(add.instance.instanceId);
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
      upgradeLevel,
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
