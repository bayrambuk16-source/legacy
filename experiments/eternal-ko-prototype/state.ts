/** Prototip durumu — ANA `GameState`'ten TAMAMEN AYRI.
 *  Aynı domain sınıfları kullanılır ama ayrı örneklerdir ve KAYIT YAZMAZ:
 *  bu deney ana oyunun save dosyasına dokunmaz. */
import { PlayerState } from '../../src/game/systems/PlayerState.js';
import { InventoryState } from '../../src/game/systems/InventoryState.js';
import { EquipmentState } from '../../src/game/systems/EquipmentState.js';
import { BalanceProfile } from '../../src/game/systems/BalanceProfile.js';
import { CombatSystem } from '../../src/game/systems/CombatSystem.js';
import { ConsumableSystem } from '../../src/game/systems/ConsumableSystem.js';
import { LootSystem } from '../../src/game/systems/LootSystem.js';
import { SkillLoadout } from '../../src/game/systems/SkillLoadout.js';
import { SkillRegistry } from '../../src/game/systems/SkillRegistry.js';
import { mulberry32, type Rng } from '../../src/engine/rng.js';
import { PLAYER } from '../../src/game/config.js';
import { CombatRangeProfile } from './world/CombatRangeProfile.js';
import { WorldCombatAdapter } from './world/WorldCombatAdapter.js';
import { WorldLootSystem } from './world/WorldLootSystem.js';
import { WorldMovementSystem } from './world/WorldMovementSystem.js';
import { WorldTargetSystem } from './world/WorldTargetSystem.js';
import { WorldCameraController } from './world/WorldCameraController.js';
import { MobSlotSystem } from './world/MobSlotSystem.js';
import { MobAttackProfile } from './world/MobAttack.js';
import { GenieSystem } from './world/GenieSystem.js';
import { ProjectileFxSystem } from './world/Projectiles.js';
import { LootPolicy } from './world/LootPolicy.js';
import { DropSystem, type DropEvent } from './world/DropSystem.js';
import { ArcherBuildResolver } from './world/BuildResolver.js';
import { EquipService } from './world/EquipService.js';
import { ForgeSystem } from './world/ForgeSystem.js';
import { allDefinitions } from './data/item-catalog.js';
import { KoPotionSystem } from './world/PotionSystem.js';
import { PlayerAnimator } from './world/PlayerAnimation.js';
import { FARM_AREA_SLOTS } from './data/farm-area.js';
import type { MobSpawnSlot } from './data/mob-slot-schema.js';
import { RESPAWN_DEFAULT } from './data/mob-ai-profiles.js';
import { ACTIVE_WORLD, type WorldConfig } from './data/world-map.js';
import {
  ACTIVE_BAR_SLOTS, DEFAULT_ACTIVE_BAR, DEFAULT_GENIE_SETS, archerBehaviors,
} from './data/archer-skills.js';
import { ARCHER_CAST_RANGE, ARCHER_SKILL_ORDER, castRange, effectiveRequiredLevel } from './data/archer-balance.js';
import { DEV_TEST_POTIONS } from './data/ko-potions.js';
import { DROP_TUNING_V1, LOOT_LIFETIME_DEFAULT } from './data/drop-profile.js';
import { ArcherCombatTimingProfile } from './data/archer-timing.js';
import { ActionLock } from './world/ActionLock.js';
import { PROTO, Tuning } from './config.js';
import type { GenieAction } from './world/GenieSystem.js';
import type { StatusTickEvent } from '../../src/game/systems/skills/effects.js';
import type {
  ImpactEvent, KillEvent, ReleaseEvent, WorldAttackResult, WorldSkillResult,
} from './world/WorldCombatAdapter.js';
import type { PlayerWorldState, WorldMob } from './world/types.js';

/** Prototip davranışlarını ana SkillRegistry'ye EKLER (additive; ana oyun etkilenmez).
 *  Birden fazla PrototypeState örneği açılsa da bir kez çalışır. */
let behaviorsRegistered = false;
export function registerPrototypeSkills(): void {
  if (behaviorsRegistered) return;
  /* 15 okçu skilli — cooldown KAYNAKTAN türetilir (recast_time / 10). */
  for (const b of archerBehaviors()) SkillRegistry.registerBehavior(b);
  /* P1.3.1 — AÇILIŞ SEVİYESİ TUNING EZMESİ (yalnız prototip).
     `SkillRegistry` seviyeyi kaynaktan (`skills.json` → `skill.level`) alır ve
     bu doğru davranıştır. Standart Atış (kaynak 3 → 1) ve Delici Ok (kaynak 0 → 3)
     için oyunun kendi açılış eğrisi farklıdır; bu bir PROJECT LEGACY kararıdır.
     Kaynak JSON'a ve DB'ye DOKUNULMAZ — ezme burada, kayıttan SONRA uygulanır.
     Bu blok `experiments/` içindedir; ana oyunun bundle'ına girmez. */
  for (const ref of ARCHER_SKILL_ORDER) {
    const def = SkillRegistry.get(ref);
    if (def) def.requiredLevel = effectiveRequiredLevel(ref);
  }
  behaviorsRegistered = true;
}

export class PrototypeState {
  readonly tuning = new Tuning();
  readonly player = new PlayerState();
  readonly inventory = new InventoryState();
  readonly equipment: EquipmentState;
  /** P1.8 — türetilmiş stat AUTHORITY'si. `CharacterStats`'tan türer ve
   *  yalnız `equipmentStats()`'i ezer; ana zincir DEĞİŞMEDİ. */
  readonly stats: ArcherBuildResolver;
  /** P1.8 — Project Legacy equip kapıları (katalog + sınıf + seviye). */
  readonly equipService: EquipService;
  readonly balance = new BalanceProfile({
    monsterHpMultiplier: PROTO.monsterHpMultiplier,
    monsterDamageMultiplier: PROTO.monsterDamageMultiplier,
  });
  /** Eternal tarzı portrait bar: 5 aktif combat slotu (skill kitabında 15'in tamamı).
   *  ÖNEMLİ: davranışlar kaydedilmeden kurulursa slotlar boş kalır → constructor'da
   *  `registerPrototypeSkills()` çağrısından SONRA atanır. */
  readonly skills: SkillLoadout;
  readonly combat: CombatSystem;
  readonly consumables: ConsumableSystem;
  readonly loot: LootSystem;
  readonly ranges = new CombatRangeProfile();
  readonly adapter: WorldCombatAdapter;
  readonly worldLoot: WorldLootSystem;
  readonly movement: WorldMovementSystem;
  readonly targets = new WorldTargetSystem();
  readonly camera: WorldCameraController;
  readonly mobs: MobSlotSystem;
  /** P1.6 — mob → oyuncu hasarı. Ana formül (`damageRoll`) yeniden kullanılır. */
  readonly mobAttack: MobAttackProfile;
  readonly genie: GenieSystem;
  readonly projectiles = new ProjectileFxSystem();
  /** Hasar kuklaları — normal mob sisteminden AYRI test entity'leri. */
  /** AUTO LOOT tercihi — P1.7'den beri Genie'den BAĞIMSIZ oyuncu ayarıdır. */
  readonly lootPolicy = new LootPolicy();
  /** P1.7 — drop → sahiplik → teslimat authority'si. */
  readonly drops: DropSystem;
  /** Attack recovery — individual cooldown'dan AYRI sistem. */
  readonly action = new ActionLock();
  /** P1.4.1 — KO kaynağına sadık SABİT miktarlı iksir sistemi (prototipe özel).
   *  Ana `ConsumableSystem` (yüzdelik) DEĞİŞTİRİLMEDİ ve hâlâ mevcuttur. */
  readonly potions: KoPotionSystem;
  readonly timing = new ArcherCombatTimingProfile();
  /** P2.8 — Örs. Yükseltmenin TEK mutasyon kapısı. */
  forge!: ForgeSystem;
  /** Oyuncu görsel durum makinesi — saldırı animasyonu YALNIZ buradan tetiklenir. */
  readonly anim = new PlayerAnimator();

  /** HASAR KUKLASI TEST AYARI — SONSUZ MP (varsayılan KAPALI).
   *  Rotasyon ölçümlerinde MP tavanı (474) 740 MP'lik cycle'ı kesiyordu; bu
   *  toggle mana kapısını KALDIRMAZ, yalnız her karede MP'yi doldurur. Böylece
   *  `SkillSystem`'in gerçek mana yolu (harcama + `mana` reddi) aynen çalışır.
   *  Bir TEST aracıdır; oyun dengesi değildir. */
  infiniteMp = false;

  /** ActionLock aktifken hareket hızı çarpanı (P1.4 A/B/C testi). */
  attackMoveMultiplier(): number {
    return this.adapter.actionBusy ? this.adapter.pipeline.timing.attackMoveMult : 1;
  }

  /** DEV (P1.8) — Project Legacy katalogundan tam takım verir ve kuşandırır.
   *  Bir TEST aracıdır; drop yolunu DEĞİŞTİRMEZ, yeni item üretmez —
   *  yalnız katalogda zaten tanımlı itemleri çantaya koyup equip eder. */
  giveTestGear(): { given: number; equipped: number; ground: number } {
    let given = 0, equipped = 0;
    for (const d of allDefinitions()) {
      const add = this.inventory.add(d.definitionRef);
      if (!add.ok) continue;
      given += 1;
      if (this.equipService.equip(add.instance.instanceId).ok) equipped += 1;
    }
    /* Manuel toplama + tooltip yolunu da denenebilir kılmak için AYAK DİBİNE
       bir örnek yay bırakılır (DEV aracı; drop tablosunu etkilemez). */
    const sample = allDefinitions().find((d) => d.category === 'weapon' && d.itemClass === 'RARE');
    let ground = 0;
    if (sample) {
      this.worldLoot.spawn({
        kind: 'item', itemRef: sample.definitionRef, quantity: 1,
        ownerPlayerId: this.drops.tuning.ownerPlayerId,
        worldX: this.world.worldX + 30, worldY: this.world.worldY,
        sourceMobUid: -1, sourceSpawnSlot: 'dev', sourceGeneration: 1, sourceMonsterRef: -1,
      });
      ground = 1;
    }
    return { given, equipped, ground };
  }

  /** DEV (§14) — test iksirleri verir. Normal başlangıç envanterini DEĞİŞTİRMEZ. */
  giveTestPotions(): number {
    let added = 0;
    for (const p of DEV_TEST_POTIONS) {
      const r = this.inventory.add(p.itemRef, { quantity: p.quantity });
      if (r.ok) added += p.quantity;
    }
    return added;
  }

  /** Sonsuz MP açıksa MP'yi tavana çeker. Scene her karede çağırır. */
  updateInfiniteMp(): void {
    if (this.infiniteMp) this.player.restoreVitals({ mp: Number.POSITIVE_INFINITY });
  }

  /** Hedeflenebilir tüm varlıklar: normal moblar + hasar kuklaları.
   *  Kuklalar MobSlotSystem'e GİRMEZ (AI/respawn/loot oraya bağlıdır); yalnız
   *  hedefleme/menzil/hasar yolları için aynı listede taşınırlar. */
  entities(): WorldMob[] {
    return [...this.mobs.mobs];
  }

  /* ---- GÖRSEL TETİK KAPILARI ----
     Saldırı/cast animasyonu YALNIZ buradan başlar: tetik, gameplay SONUCUNA
     bağlıdır (`ok === true`). Başarısız/menzil dışı denemeler animasyon
     üretmez ve hareket hiçbir zaman bu yolu çağırmaz. Scene ve Genie AYNI
     kapıları kullanır — kural Scene'e kopyalanmaz. */

  /** Temel saldırı + (başarılıysa) attack animasyonu. */
  performBasic(target: WorldMob | null): WorldAttackResult {
    const res = this.adapter.basicAttack(this.world, target);
    if (res.ok) this.anim.triggerAttack(this.angleTo(target));
    return res;
  }

  /** Hedefe bakış açısı (yoksa mevcut yön korunur). */
  private angleTo(target: WorldMob | null): number {
    if (!target) return this.world.facingAngle;
    return Math.atan2(target.worldY - this.world.worldY, target.worldX - this.world.worldX);
  }

  /** Skill cast + (başarılıysa) cast animasyonu.
   *  P1.2.2: klip "basic mi skill mi" ile DEĞİL, KAYNAK REFERANSI ile seçilir —
   *  Standart Atış (102003) bir skill slotundan atılır ama ATTACK atlasını
   *  kullanır (bkz. `data/archer-atlas.ts`). */
  performSkill(sourceRef: number, target: WorldMob | null, mobs?: WorldMob[]): WorldSkillResult {
    const res = this.adapter.useSkillRef(sourceRef, this.world, target, mobs ?? this.entities());
    if (res.ok) this.anim.triggerForRef(sourceRef, this.angleTo(target));
    return res;
  }

  /** P1.6.1 — DoT SAATİ: SABİT ADIMLI biriktirici.
   *
   *  ANA `tickStatuses()` (src/) DEĞİŞTİRİLMEDİ ve DEĞİŞTİRİLEMEZ; ama onun
   *  iç sayacı (`tickTimer = tickSec`) tik anında artığı atıyor — yani DoT
   *  temposu, çağıran tarafın `dt`'sine göre kayıyordu. Formülü kopyalamak
   *  yerine ANA FONKSİYON SABİT bir adımla sürülür: ne kadar süre geçerse
   *  geçsin, `tickStatuses` daima `STATUS_STEP_SEC` ile çağrılır ve artan
   *  süre bir sonraki kareye devreder.
   *
   *  ADIM NEDEN 1/128? İKİLİK TABANDA TAM temsil edilir (2'nin kuvveti), yani
   *  128 adım TAM 1.000 sn eder. `1/120` ile adımlar mikroskobik olarak fazla
   *  sürüyor, her tikte biriken taşma sonunda SON TİKİ DÜŞÜRÜYORDU:
   *  4 sn / 1 sn'lik zehir 4 yerine 3 tik veriyordu (her FPS'te). 1/128 ile
   *  tik anları 1.000 / 2.000 / 3.000 / 4.000'a TAM oturur → 4 tik.
   *
   *  Sonuç: 30 / 60 / 120 FPS'te tik sayısı, toplam hasar ve süre bitişi
   *  BİREBİR aynıdır; son tik sınırda KAYBOLMAZ ve ÇİFT ÇALIŞMAZ —
   *  P1.3 zehir tuning'ine (0.30/0.60/0.90 · 4 sn · 1 sn) hiç dokunulmadan. */
  static readonly STATUS_STEP_SEC = 1 / 128;
  /** Tek `tickStatuses(dt)` çağrısında en fazla kaç sabit adım işlenir
   *  (sonsuz döngü guard'ı; kalan borç ATILIR). */
  private static readonly MAX_STATUS_STEPS = 16;
  private statusAccumulator = 0;

  tickStatuses(dt: number, entities?: WorldMob[]): StatusTickEvent[] {
    const list = entities ?? this.entities();
    const step = PrototypeState.STATUS_STEP_SEC;
    this.statusAccumulator += dt;
    const events: StatusTickEvent[] = [];
    let steps = 0;
    while (this.statusAccumulator >= step && steps < PrototypeState.MAX_STATUS_STEPS) {
      this.statusAccumulator -= step;
      steps += 1;
      events.push(...this.combat.skills.tickStatuses(list, step));
    }
    if (this.statusAccumulator >= step) this.statusAccumulator = 0;
    return events;
  }

  /** TEK ÖLÜM KAPISI — hangi yoldan ölürse ölsün (impact / DoT / çok-ok)
   *  ödül, loot ve respawn BURADA BİR KEZ çözülür.
   *
   *  P1.6.1: bu mantık eskiden Scene içindeydi; testler onu çağıramadığı için
   *  "aynı karede DoT + ok ölümü" gibi yarışlar test edilemiyordu. Artık
   *  gameplay tarafı burada, Scene yalnız görsel/ses tepkisi veriyor.
   *  `markDead()` `ai = 'dead'` yaptığı için ikinci çağrı hiçbir şey bulmaz. */
  reapDead(): Array<{ kill: KillEvent; drop: DropEvent }> {
    const out: Array<{ kill: KillEvent; drop: DropEvent }> = [];
    for (const m of this.mobs.mobs) {
      if (m.state !== 'dying' || m.ai === 'dead') continue;
      /* SIRA ÖNEMLİ: drop mobun ÖLÜM KONUMUNU ve kimliğini kullanır, bu yüzden
         `markDead()`ten (respawn sayacını başlatır) ÖNCE çözülür. Kill başına
         TEK roll — tek reap kapısı bunu garanti eder (§19). */
      const kill = this.adapter.resolveKill(m);
      const drop = this.drops.resolve(m, kill.exp);
      this.mobs.markDead(m);
      if (this.targets.selectedUid === m.uid) this.targets.clear();
      out.push({ kill, drop });
    }
    return out;
  }

  /** P1.6 — COMBAT KARESİ: pipeline'ı ilerletir VE impact yan etkilerini uygular.
   *  AGGRO YALNIZ IMPACT ANINDA tetiklenir (cast anında DEĞİL): hasar gerçekten
   *  uygulandıysa mob uyanır. Çok-ok (3/5) aynı moba değse bile `notifyDamaged`
   *  idempotenttir → tek aggro. Manuel oyuncu ve Genie AYNI yoldan geçer. */
  stepCombat(dt: number, mobs?: WorldMob[]): { releases: ReleaseEvent[]; impacts: ImpactEvent[] } {
    const list = mobs ?? this.entities();
    const out = this.adapter.updatePipeline(dt, this.world, list);
    for (const im of out.impacts) {
      if (im.invalid !== null || !im.target) continue;
      if (im.damage <= 0 && im.statusesApplied === 0) continue;
      this.mobs.notifyDamaged(im.target);
    }
    return out;
  }

  /** P1.4 — CAST → RELEASE → IMPACT zincirini SONUNA kadar ilerletir.
   *  Yalnız TEST ve TELEMETRİ içindir; oyun döngüsü `adapter.updatePipeline()`
   *  çağırır. Manuel oyuncu ile Genie AYNI yoldan geçer (§14).
   *  Dönen `impacts` hasarın GERÇEKTEN uygulandığı olaylardır. */
  resolveCastToImpact(
    sourceRef: number, target: WorldMob | null, mobs?: WorldMob[], dt = 1 / 120,
  ): { result: WorldSkillResult; releases: ReleaseEvent[]; impacts: ImpactEvent[] } {
    const list = mobs ?? this.entities();
    const result = this.performSkill(sourceRef, target, list);
    const releases: ReleaseEvent[] = [];
    const impacts: ImpactEvent[] = [];
    if (!result.ok) return { result, releases, impacts };
    /* Release + bütün okların impact'i bitene kadar (üst sınır güvenlik ağı). */
    for (let i = 0; i < 20000; i++) {
      const out = this.stepCombat(dt, list);
      releases.push(...out.releases);
      impacts.push(...out.impacts);
      if (this.adapter.pipeline.pending.length === 0
        && this.adapter.pipeline.projectiles.length === 0) break;
    }
    return { result, releases, impacts };
  }

  /** Genie eylemlerini aynı görsel tetiklere bağlar (Scene için tek yol).
   *  Genie de aynı sourceRef kuralına tabidir — Scene'e kopya mantık yazılmaz. */
  applyAnimFor(actions: GenieAction[]): void {
    for (const a of actions) {
      if (a.kind === 'skill') this.anim.triggerForRef(a.skillRef, this.angleTo(a.target));
    }
  }

  /** Oyuncunun dünya durumu. Doğuş noktası kurucuda enjekte edilen dünyadan
   *  gelir (alan başlatıcıları kurucudan ÖNCE çalıştığı için burada
   *  `ACTIVE_WORLD` yazılır, kurucu gerekirse üzerine yazar). */
  readonly world: PlayerWorldState = {
    worldX: ACTIVE_WORLD.spawn.x, worldY: ACTIVE_WORLD.spawn.y,
    facing: 1, facingAngle: 0, travelled: 0, moveX: 0, moveY: 0, moving: false, animT: 0,
  };

  /** `slots` YALNIZ test/telemetri içindir ve VARSAYILANI DEĞİŞMEDİ:
   *  parametresiz çağrı P1.6'dan beri olduğu gibi `FARM_AREA_SLOTS` kullanır.
   *  P2.4B çok-moblu fixture'ı canlı oyuna BAĞLAMAZ; yalnız testin gerçek bir
   *  dünyada (Genie/Drop/Target ile birlikte) koşabilmesi için vardır. */
  /** @param world P2.4C — dünya yapılandırması (sınır/doğuş/engel/adım kapısı).
   *  VARSAYILAN DEĞİŞMEZ: canlı oyun `ACTIVE_WORLD`u kullanır. Testler P1.6
   *  senaryolarını `TEST_WORLD` ile koşturabilir. */
  constructor(
    seed = 20260821,
    slots: readonly MobSpawnSlot[] = FARM_AREA_SLOTS,
    worldCfg: WorldConfig = ACTIVE_WORLD,
  ) {
    registerPrototypeSkills();                 // 15 okçu skilli kayıt olsun
    this.world.worldX = worldCfg.spawn.x;
    this.world.worldY = worldCfg.spawn.y;
    this.skills = new SkillLoadout('archer', ACTIVE_BAR_SLOTS, DEFAULT_ACTIVE_BAR);
    const rng: Rng = mulberry32(seed);
    this.equipment = new EquipmentState(this.inventory, () => this.player.level);
    this.stats = new ArcherBuildResolver(
      () => this.player.level, this.equipment,
      () => ({ attackSpeedMult: this.player.attackSpeedMult }),
    );
    this.equipService = new EquipService({
      equipment: this.equipment, inventory: this.inventory,
      playerLevel: () => this.player.level,
      playerClass: () => 'archer',
    });
    this.player.bindStats(this.stats);
    /* Prototip başlangıcı: skiller açık olsun diye yüksek seviye + kuşanılı başlangıç yayı.
       NOT: `restoreProgression` seviyeyi ana MVP tavanına (20) kırpar; prototipin
       kaynak seviye şartı 55 olan "arrow shower"ı test edebilmesi için seviye
       DOĞRUDAN atanır. Ana oyunun ilerleme eğrisi/​tavanı DEĞİŞMEMİŞTİR. */
    this.player.restoreProgression({ level: 1, exp: 0, coins: 0 });
    this.player.level = PROTO.startLevel;
    const bow = this.inventory.add(PLAYER.starterWeaponRef);
    if (bow.ok) this.equipment.equip(bow.instance.instanceId);
    for (const p of PROTO.startPotions) this.inventory.add(p.itemRef, { quantity: p.quantity });
    this.player.restoreVitals({ hp: Number.POSITIVE_INFINITY, mp: Number.POSITIVE_INFINITY });

    this.combat = new CombatSystem(rng, this.player, this.stats, this.balance, this.skills);
    this.consumables = new ConsumableSystem(this.inventory, this.player, this.stats);
    this.potions = new KoPotionSystem(this.inventory, this.player, this.stats);
    this.loot = new LootSystem(rng);
    this.adapter = new WorldCombatAdapter(
      this.combat, this.player, this.ranges, this.action, this.timing,
    );
    /* P1.8 §21 — kuşanılı silahın elemental bileşeni combat'a AYRI bileşen
       olarak bağlanır (fiziksel hasarla tek alana ezilmez). */
    this.adapter.weaponElementalProvider = () => this.stats.weaponElemental();
    this.worldLoot = new WorldLootSystem(this.inventory, this.player);
    this.worldLoot.tuning.lootLifetimeSec = LOOT_LIFETIME_DEFAULT;
    this.worldLoot.tuning.pickupRadius = DROP_TUNING_V1.pickupRadius;
    /* P1.7 — drop RNG oyunun TOHUMLU rng'sinden gelir (LootSystem içinde);
       bu katmanda `Math.random()` YOKTUR → aynı tohum aynı loot dizisi. */
    this.drops = new DropSystem({
      rng, loot: this.loot, inventory: this.inventory, player: this.player,
      ground: this.worldLoot,
      autoLoot: () => this.lootPolicy.autoLoot,
    });
    /* P1.4 §3 — ATTACK MOVE: ActionLock aktifken hız çarpanı uygulanır (0 / 60 / 100 %).
       Joystick girdisi KAYBOLMAZ; yalnız katedilen mesafe ölçeklenir. Çarpan
       `pipeline.timing.attackMoveMult` içindedir (DEV panelinden değişir). */
    this.movement = new WorldMovementSystem(
      worldCfg.bounds, worldCfg.obstacles,
      () => this.tuning.get('playerSpeed') * this.attackMoveMultiplier(),
      /* P2.4C — TEK ADIM KAPISI: aşağıda mob sistemine verilen fonksiyonun
         AYNISI. Oyuncu ve mob için ikinci bir yürünebilirlik yolu YOKTUR. */
      worldCfg.stepAllowed,
    );
    this.camera = new WorldCameraController(this.tuning);
    this.camera.snapTo(this.world.worldX, this.world.worldY);
    this.mobAttack = new MobAttackProfile(this.combat, this.player, this.balance);
    /* P1.6 — FARM AREA V1: 8 tekil spawn slotu (2 yakın · 3 orta · 3 uzak).
       Eski küme tabanlı `MOB_SLOTS` yerine her slot TEK mobun sabit evidir. */
    this.mobs = new MobSlotSystem(slots, {
      rng,
      aggroMult: () => this.tuning.get('aggroRadiusMult'),
      hpMult: () => this.balance.monsterHp,
      playerAlive: () => this.player.alive,
      strike: (mob) => this.mobAttack.strike(mob),
      stepAllowed: worldCfg.stepAllowed,      // oyuncuyla AYNI kapı
    });
    this.forge = new ForgeSystem({
      rng, inventory: this.inventory, equipment: this.equipment, player: this.player,
    });
    /* P2.9 — P2.4D "KAPI 1" AÇILDI: DEV respawn ezmesi artık varsayılan
       olarak KURULMAZ. Süre slotun kendi `respawnSec` değerinden okunur
       (Moradon'da 20 sn). Ezme yalnız DEV panelinden bilinçli açılır. */
    this.mobs.ai.respawnOverrideSec = null;
    this.mobs.populate();

    this.genie = new GenieSystem({
      player: this.player, stats: this.stats, inventory: this.inventory,
      consumables: this.consumables, adapter: this.adapter, targets: this.targets,
      potions: this.potions,
      /* P1.5 — Genie'nin AYRI hızı YOKTUR: oyuncunun gerçek hızını (Attack Move
         çarpanı dahil) telemetriye verir. Cast range de skill profilinden okunur. */
      castRange: () => ARCHER_CAST_RANGE,
      moveSpeed: () => this.tuning.get('playerSpeed') * this.attackMoveMultiplier(),
    });
    this.genie.settings.sets = DEFAULT_GENIE_SETS();

    /* MENZİL V1 (P1.3 §7) — 15 Archer saldırı skillinin TAMAMI aynı cast
       menzilini kullanır (340 world). Gerekçe kaynakta: `skills.range_value`
       15 kayıtta da 0, `magic_type2.add_range` 14 kayıtta da 100 → kaynak
       menzil AYRIMI ÜRETMİYOR. 340 bir PROJECT LEGACY TUNING değeridir.
       Genie'nin hedef edinme yarıçapı (attackRange) BUNDAN AYRIDIR. */
    for (const ref of ARCHER_SKILL_ORDER) this.ranges.setSkillRange(ref, castRange(ref));
  }
}
