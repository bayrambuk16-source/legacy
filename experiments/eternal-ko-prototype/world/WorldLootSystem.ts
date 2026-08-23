/** YERDEKİ GANİMET DEPOSU — P1.7
 *
 *  Bu sınıf yalnız YERDEKİ loot entity'lerini tutar ve talep (claim) eder.
 *  Drop kararını VERMEZ (bkz. `world/DropSystem.ts`), envanter kuralı YAZMAZ
 *  (ana `InventoryState` authoritative), Canvas/UI bilmez.
 *
 *  ══ KİMLİK ══
 *  Her entity kendi `lootUid`'ini taşır; sayaç MODÜL DÜZEYİNDE DEĞİL, sistem
 *  ÖRNEĞİ kapsamındadır (P1.6.1 kuralı). Loot kimliği mobun uid'siyle aynı şey
 *  değildir — kaynak mob bilgisi ayrıca ve yalnız İZLENEBİLİRLİK için tutulur.
 *
 *  ══ SAHİPLİK ══
 *  `ownerPlayerId` bir UI etiketi DEĞİLDİR: `claim()` önce sahipliği doğrular,
 *  sahibi olmayan hiçbir çağrı envantere dokunamaz.
 *
 *  ══ IDEMPOTENCY ══
 *  Bir `lootUid` YALNIZ BİR KEZ talep edilebilir. Başarılı talepte kayıt hem
 *  `claimed` işaretlenir hem listeden çıkar; aynı uid ikinci kez `missing`
 *  döner. Auto Loot ile manuel toplama aynı karede yarışsa bile tek claim olur. */
import type { InventoryState } from '../../../src/game/systems/InventoryState.js';
import type { PlayerState } from '../../../src/game/systems/PlayerState.js';
import { DROP_TUNING_V1, type DropTuning } from '../data/drop-profile.js';
import type { WorldGroundLoot } from './types.js';

export type ClaimFail =
  | 'missing'          // böyle bir loot yok (hiç olmadı ya da zaten alındı)
  | 'alreadyClaimed'   // bu kare içinde başka bir yol tarafından alındı
  | 'notOwner'         // sahiplik doğrulaması başarısız
  | 'outOfRange'       // manuel toplama yarıçapı dışında
  | 'inventoryFull';   // envanter kabul etmedi → loot YERDE KALIR

export type ClaimResult =
  | { ok: true; itemRef: number; quantity: number; kind: 'item' | 'coin'; lootUid: number }
  | { ok: false; reason: ClaimFail; lootUid: number };

/** Yeni bir yer ganimeti oluşturmak için gereken her şey. */
export interface GroundLootSpec {
  kind: 'item' | 'coin';
  itemRef: number;
  quantity: number;
  ownerPlayerId: number;
  worldX: number;
  worldY: number;
  sourceMobUid: number;
  sourceSpawnSlot: string;
  sourceGeneration: number;
  sourceMonsterRef: number;
}

export class WorldLootSystem {
  readonly items: WorldGroundLoot[] = [];
  /** Örnek kapsamlı kimlik sayacı (P1.6.1). */
  private nextLootUid = 1;
  /** Talep edilmiş uid'ler — ikinci claim'i reddetmek için (bounded, bkz. `prune`). */
  private claimedUids = new Set<number>();
  tuning: DropTuning = { ...DROP_TUNING_V1 };

  constructor(private inventory: InventoryState, private player?: PlayerState) {}

  /** Yerde duran (talep edilmemiş) ganimet sayısı. */
  get count(): number { return this.items.length; }
  /** Talep geçmişi boyutu — soak testinde sınırlılığı doğrulanır. */
  get claimedHistorySize(): number { return this.claimedUids.size; }

  /** Yeni yer ganimeti. Konum ÇAĞIRANDAN gelir (mobun ölüm noktası) —
   *  oyuncunun konumu ASLA kullanılmaz (§8). */
  spawn(spec: GroundLootSpec, lifetimeSec = this.tuning.lootLifetimeSec): WorldGroundLoot {
    const loot: WorldGroundLoot = {
      lootUid: this.nextLootUid++,
      kind: spec.kind,
      itemRef: spec.itemRef,
      quantity: spec.quantity,
      ownerPlayerId: spec.ownerPlayerId,
      worldX: spec.worldX,
      worldY: spec.worldY,
      life: lifetimeSec,
      lifetimeSec,
      claimed: false,
      sourceMobUid: spec.sourceMobUid,
      sourceSpawnSlot: spec.sourceSpawnSlot,
      sourceGeneration: spec.sourceGeneration,
      sourceMonsterRef: spec.sourceMonsterRef,
    };
    this.items.push(loot);
    return loot;
  }

  find(lootUid: number): WorldGroundLoot | undefined {
    return this.items.find((l) => l.lootUid === lootUid);
  }

  /** Oyuncunun toplama yarıçapındaki EN YAKIN ganimeti (toplama düğmesi için). */
  nearest(px: number, py: number, radius = this.tuning.pickupRadius): WorldGroundLoot | null {
    let best: WorldGroundLoot | null = null, bestD = Infinity;
    for (const l of this.items) {
      if (l.claimed) continue;
      const d = Math.hypot(l.worldX - px, l.worldY - py);
      if (d <= radius && d < bestD) { bestD = d; best = l; }
    }
    return best;
  }

  /** MANUEL TOPLAMA — mesafe kapısı VARDIR.
   *  Oyuncu otomatik yürütülmez; menzil dışındaysa `outOfRange` döner ve
   *  HİÇBİR mutasyon olmaz (§10). */
  pickup(lootUid: number, playerId: number, px: number, py: number,
    radius = this.tuning.pickupRadius): ClaimResult {
    const loot = this.find(lootUid);
    if (!loot) {
      return { ok: false, reason: this.claimedUids.has(lootUid) ? 'alreadyClaimed' : 'missing', lootUid };
    }
    if (Math.hypot(loot.worldX - px, loot.worldY - py) > radius) {
      return { ok: false, reason: 'outOfRange', lootUid };
    }
    return this.claim(lootUid, playerId);
  }

  /** TALEP — mesafe kapısı YOKTUR (Auto Loot buradan geçer, §7).
   *  ATOMİK: doğrula → planla → uygula. Envanter reddederse loot YERDE KALIR. */
  claim(lootUid: number, playerId: number): ClaimResult {
    /* 1) doğrulamalar — hiçbir mutasyon yok */
    const idx = this.items.findIndex((l) => l.lootUid === lootUid);
    if (idx < 0) {
      return { ok: false, reason: this.claimedUids.has(lootUid) ? 'alreadyClaimed' : 'missing', lootUid };
    }
    const loot = this.items[idx]!;
    if (loot.claimed) return { ok: false, reason: 'alreadyClaimed', lootUid };
    if (loot.ownerPlayerId !== playerId) return { ok: false, reason: 'notOwner', lootUid };

    /* 2) uygula — coin envanter slotu KAPLAMAZ */
    if (loot.kind === 'coin') {
      if (this.player) this.player.coins += loot.quantity;
    } else {
      const add = this.inventory.add(loot.itemRef, { quantity: loot.quantity });
      if (!add.ok) return { ok: false, reason: 'inventoryFull', lootUid };
    }

    /* 3) kaydı kapat — İKİNCİ claim imkânsız */
    loot.claimed = true;
    this.items.splice(idx, 1);
    this.claimedUids.add(lootUid);
    return { ok: true, itemRef: loot.itemRef, quantity: loot.quantity, kind: loot.kind, lootUid };
  }

  /** Ömür sayacı. `dt` toplamı gerçek geçen süredir → FPS bağımsızdır. */
  update(dt: number): WorldGroundLoot[] {
    const expired: WorldGroundLoot[] = [];
    for (let i = this.items.length - 1; i >= 0; i--) {
      const l = this.items[i]!;
      l.life -= dt;
      if (l.life <= 0) { expired.push(l); this.items.splice(i, 1); }
    }
    if (expired.length > 0) this.prune();
    return expired;
  }

  /** Talep geçmişini sınırlar: yalnız SON N kayıt tutulur. Amaç "az önce
   *  alınan loot" ile "hiç var olmamış loot" ayrımını kısa süre koruyabilmek;
   *  sonsuza kadar büyümek DEĞİL. */
  private static readonly CLAIM_HISTORY_MAX = 512;
  private prune(): void {
    if (this.claimedUids.size <= WorldLootSystem.CLAIM_HISTORY_MAX) return;
    const keep = [...this.claimedUids].slice(-WorldLootSystem.CLAIM_HISTORY_MAX);
    this.claimedUids = new Set(keep);
  }

  clear(): void {
    this.items.length = 0;
    this.claimedUids.clear();
  }
}
