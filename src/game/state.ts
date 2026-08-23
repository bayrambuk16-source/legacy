/** Sahneler arası yaşayan oyun durumu + kayıt orkestrasyonu.
 *  Sistemlerin bağlanması (wiring) yalnız burada yapılır. */
import { PlayerState } from './systems/PlayerState.js';
import { InventoryState } from './systems/InventoryState.js';
import { EquipmentState } from './systems/EquipmentState.js';
import { CharacterStats } from './systems/CharacterStats.js';
import { BalanceProfile } from './systems/BalanceProfile.js';
import { SaveSystem, SAVE_VERSION, type SaveData } from './systems/SaveSystem.js';
import { SkillLoadout } from './systems/SkillLoadout.js';
import { restoreProfile } from './systems/StateRestore.js';
import { EconomyProfile } from './systems/EconomyProfile.js';
import { MerchantSystem } from './systems/MerchantSystem.js';
import { ConsumableSystem } from './systems/ConsumableSystem.js';
import { PLAYER } from './config.js';

class GameStateImpl {
  player = new PlayerState();
  inventory = new InventoryState();
  equipment: EquipmentState;
  stats: CharacterStats;
  balance = new BalanceProfile();
  saves = new SaveSystem();
  /** Aktif combat barı (3 slot) — kullanılabilir skill havuzundan ayrı. */
  skills = new SkillLoadout('archer');
  economy = new EconomyProfile();
  merchants!: MerchantSystem;
  consumables!: ConsumableSystem;
  currentZoneId = 'zone_combat_a';
  /** MerchantScene'in açtığı tüccar (Hub'dan seçilir). */
  currentMerchantId = 'merchant_253';

  constructor() {
    this.equipment = new EquipmentState(this.inventory, () => this.player.level);
    this.stats = new CharacterStats(
      () => this.player.level,
      this.equipment,
      () => ({ attackSpeedMult: this.player.attackSpeedMult }),
    );
    this.player.bindStats(this.stats);
    this.merchants = new MerchantSystem(this.inventory, this.player, this.economy);
    this.consumables = new ConsumableSystem(this.inventory, this.player, this.stats);
  }

  /** Yeni oyun: başlangıç yayı verilir ve kuşanılır. */
  newGame(): void {
    this.inventory.clear();
    this.equipment.clear();
    this.player.restore({ level: 1, exp: 0, hp: 9999, mp: 9999, coins: 0 });
    const bow = this.inventory.add(PLAYER.starterWeaponRef);
    if (bow.ok) this.equipment.equip(bow.instance.instanceId);
    this.skills.reset();
    this.player.reviveForRetry();
    this.currentZoneId = 'zone_combat_a';
  }

  serialize(): SaveData {
    return {
      saveVersion: SAVE_VERSION,
      player: this.player.serialize(),
      inventory: {
        entries: this.inventory.allEntries(),
        nextInstanceId: Math.max(0, ...this.inventory.allEntries().map((e) => e.instanceId)) + 1,
      },
      equipment: this.equipment.serialize(),
      skills: { loadout: this.skills.serialize() },
      currentZoneId: this.currentZoneId,
    };
  }

  /** Otomatik kayıt tetiklerinden çağrılır. */
  autosave(): void {
    this.saves.save(this.serialize());
  }

  /** Boot'ta çağrılır: kayıt varsa yükler, yoksa yeni oyun kurar. true = kayıt yüklendi. */
  loadOrNew(): boolean {
    const data = this.saves.load();
    if (!data) { this.newGame(); return false; }
    /* Sıra StateRestore.restoreProfile() içinde: progression → envanter/ekipman → vitals.
       Burada kopyalanmaz. */
    const report = restoreProfile(
      { player: this.player, inventory: this.inventory, equipment: this.equipment },
      { player: data.player, inventory: data.inventory, equipment: data.equipment },
    );
    if (report.equipment.rejected.length > 0) {
      console.warn('[save] geçersiz ekipman girdileri atlandı:', report.equipment.rejected);
    }
    if (report.capacity.dropped.length > 0) {
      console.warn(`[save] kapasite aşımı: ${report.capacity.dropped.length} entry düşürüldü`);
    }
    if (!report.invariantOk) console.error('[save] kapasite invariant\'ı sağlanamadı!');
    this.skills.restore(data.skills?.loadout);
    this.currentZoneId = data.currentZoneId;
    return true;
  }
}

export const GameState = new GameStateImpl();
