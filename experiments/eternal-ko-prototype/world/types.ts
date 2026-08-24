/** Prototip dünya tipleri. Gameplay koordinatı DAİMA world'dür; canvas X/Y asla
 *  gameplay state olarak kullanılmaz (renderer projeksiyonu ayrı katmandır). */
import type { EnemyUnit } from '../../../src/game/systems/SpawnSystem.js';

export interface Vec2 { x: number; y: number }

/** Dairesel engel (ağaç/taş). Basit ve testi kolay. */
export interface Obstacle { x: number; y: number; radius: number; kind: 'tree' | 'rock' }

export interface WorldBounds { width: number; height: number }

/** P1.6 — `roam` ve `aggro` EKLENDİ (additive).
 *  `dead` ve `dying` sözleşmesi DEĞİŞMEDİ: ölüm `state === 'dying'` ile başlar,
 *  `markDead()` `ai = 'dead'` yapar. Mevcut tüketiciler (`WorldTargetSystem`,
 *  `MultiShot`, `GenieSystem`, `WorldCombatAdapter`) yalnız bu ikisine bakar. */
export type MobAiState =
  | 'idle' | 'roam' | 'aggro' | 'chase' | 'attack' | 'return' | 'dead';

/** Ana oyunun `EnemyUnit` sözleşmesini KORUR (CombatSystem/SkillSystem doğrudan
 *  çalışabilsin diye) ve üzerine world alanları ekler. */
export interface WorldMob extends EnemyUnit {
  worldX: number;
  worldY: number;
  /** SPAWN SLOT KİMLİĞİ — hangi slotun evinde yaşıyor. Slot kimliği bir
   *  YAŞAM BOYU kimlik DEĞİLDİR: aynı slotta sırayla farklı canlılar doğar. */
  slotId: string;
  /** SPAWN NESLİ — bu slottaki kaçıncı canlı olduğu. Her respawn'da artar.
   *  `slotId + generation` bir SLOT-YAŞAMINI, `uid` ise MOB ÖRNEĞİNİ (entity)
   *  benzersiz tanımlar. İkisi AYRI kavramdır ve karıştırılmamalıdır:
   *  havadaki bir ok slot kimliğine değil ENTITY kimliğine bağlıdır. */
  generation: number;
  /** P2.4B — SLOT İÇİ ÖRNEK SIRASI (0..count-1). Slot kimliği tek başına
   *  ARTIK YETMEZ: bir slot 5..8 bağımsız canlı taşır. `slotId + instanceIndex`
   *  bir SLOT YUVASINI, `uid` ise o yuvadaki ANLIK canlıyı tanımlar.
   *  Deterministik doğuş noktası da bu üçlüden türer
   *  (`instanceSpawnPoint(slot, instanceIndex, generation)`). */
  instanceIndex: number;
  /** Combat çarpışma yarıçapı (world) — sprite genişliğinden BAĞIMSIZ. */
  combatRadius: number;
  ai: MobAiState;
  homeX: number;
  homeY: number;
  respawnTimer: number;
  facing: 1 | -1;
  /** basit yürüme animasyon fazı */
  animT: number;
}

/** Yerdeki ganimet — P1.7.
 *
 *  KİMLİK: `lootUid` loot'un KENDİ benzersiz kimliğidir ve mobun uid'siyle
 *  AYNI ŞEY DEĞİLDİR. Kaynak mob bilgisi ayrıca taşınır (izlenebilirlik) ama
 *  loot'un yaşam döngüsü mobunkinden BAĞIMSIZDIR: mob respawn olsa bile bu
 *  kayıt silinmez, taşınmaz, sahibi değişmez (§12). */
export interface WorldGroundLoot {
  /** Benzersiz loot kimliği (sistem örneği kapsamında sayaç). */
  lootUid: number;
  /** 'item' envanter slotu kaplar · 'coin' KAPLAMAZ, doğrudan cüzdana girer. */
  kind: 'item' | 'coin';
  /** kind='item' için `items_server.num`. kind='coin' için 0. */
  itemRef: number;
  /** item için adet, coin için miktar. */
  quantity: number;
  /** P3.6 — zindanda +1 gelen ekipmanın yükseltme seviyesi. */
  upgradeLevel?: number;
  /** SAHİPLİK — pickup doğrulamasında AUTHORITATIVE (§6). */
  ownerPlayerId: number;
  worldX: number;
  worldY: number;
  /** Kalan ömür (sn). */
  life: number;
  /** Toplam ömür (sn) — telemetri. */
  lifetimeSec: number;
  /** Bir kez talep edildi mi? (idempotency — §18) */
  claimed: boolean;
  /* ---- kaynak izlenebilirliği (loot kimliği DEĞİL) ---- */
  sourceMobUid: number;
  sourceSpawnSlot: string;
  sourceGeneration: number;
  sourceMonsterRef: number;
}

export interface PlayerWorldState {
  worldX: number;
  worldY: number;
  /** Geriye dönük: yalnız sol/sağ ayna. 8 yönlü çizim `facingAngle` kullanır. */
  facing: 1 | -1;
  /** Karakterin BAKTIĞI yön (radyan, 0 = +X). Hareket ederken hareket yönü,
   *  saldırırken hedefin yönü. Dikey hareketle rastgele sağa/sola dönmeyi
   *  bitirir (P1.1.1 gözlem #3). */
  facingAngle: number;
  /** Yürünen toplam mesafe (world birimi) — adım döngüsü buna bağlıdır ki
   *  hız değişince adım temposu da değişsin (kayma hissi olmasın). */
  travelled: number;
  /** son hareket vektörü (yönelme ve look-ahead için) */
  moveX: number;
  moveY: number;
  moving: boolean;
  animT: number;
}
