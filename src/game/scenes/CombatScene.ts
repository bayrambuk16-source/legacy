/** Combat sahnesi — YALNIZ orchestration + render.
 *  Sayısal mantık: CombatSystem/SpawnSystem/TargetSystem/LootSystem/PlayerState.
 *  Döngü: Hub → bölge → savaş → ödül ekranı → Hub / devam. */
import type { DrawApi, GameHost, PointerEventInfo, Scene } from '../../engine/types.js';
import { DisposerBag } from '../../engine/dispose.js';
import { SpriteAnimator } from '../../engine/anim.js';
import { mulberry32, type Rng } from '../../engine/rng.js';
import { Content, type GameZone } from '../data/GameContentRepository.js';
import { COMBAT, LOOT, MONSTER_VISUALS, SPAWN } from '../config.js';
import { GameState } from '../state.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { SpawnSystem, type EnemyUnit } from '../systems/SpawnSystem.js';
import { TargetSystem } from '../systems/TargetSystem.js';
import { LootSystem } from '../systems/LootSystem.js';
import { drawBar, drawBottomNav, drawButton, inRect, navHit, type ButtonRect } from '../ui/hud.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import type { SkillFailReason } from '../systems/SkillSystem.js';

/** Skill reddi → oyuncuya gösterilecek metin (kural hesabı Scene'de DEĞİL). */
const SKILL_FAIL_TEXT: Record<SkillFailReason, string> = {
  unknown: 'Bilinmeyen beceri',
  emptySlot: 'Boş slot',
  dead: 'Öldün',
  levelReq: 'Seviye yetersiz',
  mana: 'Mana yetersiz',
  cooldown: 'Hazır değil',
  noWeapon: 'Uygun silah gerek',
  noTarget: 'Hedef yok',
};

/* kurt sheet: 6 kare × 8 yön satırı; "sol" = satır 6 (Legacy KURT_YON sırası) */
const KURT_ROW_SOL = 6;
const KURT_FRAME = 230;
const OKCU_FRAME = 300;

interface GroundLoot { itemRef: number; x: number; y: number; life: number }
interface EnemyView { anim: SpriteAnimator }

type Phase = 'fight' | 'victory' | 'defeat';

export class CombatScene implements Scene {
  readonly key = 'combat';
  private bag = new DisposerBag();
  private rng: Rng = mulberry32(Date.now() >>> 0);

  private zone!: GameZone;
  private combat!: CombatSystem;
  private spawner!: SpawnSystem;
  private targets = new TargetSystem();
  private lootSys!: LootSystem;

  private enemies: EnemyUnit[] = [];
  private views = new Map<number, EnemyView>();
  private groundLoot: GroundLoot[] = [];
  private kills = 0;
  private phase: Phase = 'fight';
  private playerAnim = new SpriteAnimator({ sheetKey: 'gt_okcu_y_sag', frameW: OKCU_FRAME, frameH: OKCU_FRAME, row: 0, frames: 1, fps: 1, loop: true });
  private attackFlash = 0;

  private buttons: ButtonRect[] = [];

  constructor(private host: GameHost) {}

  enter(): void {
    this.zone = Content.zone(GameState.currentZoneId) ?? Content.combatZones()[0];
    this.combat = new CombatSystem(this.rng, GameState.player, GameState.stats, GameState.balance, GameState.skills);
    this.spawner = new SpawnSystem(this.rng, this.zone, GameState.balance);
    this.lootSys = new LootSystem(this.rng);
    this.enemies = [];
    this.views.clear();
    this.groundLoot = [];
    this.kills = 0;
    this.phase = 'fight';
    this.targets.clear();
    this.layoutButtons();
    this.bag.add(this.host.input.onDown((p) => this.tap(p)));
    this.bag.add(GameState.player.onLevelUp((e) => {
      this.host.fx.floatText(COMBAT.playerX, COMBAT.laneY - 180, `SEVİYE ${e.newLevel}!`, { color: '#e8d9a0', size: 26 });
      this.host.audio.play('levelup');
    }));
  }

  exit(): void {
    this.bag.disposeAll();
  }

  private layoutButtons(): void {
    const bx = 620 - 92, size = 76, gap = 14;
    this.buttons = [
      { id: 'basic', x: bx, y: 560, w: size, h: size, label: 'Saldırı' },
      ...this.combat.skills.slots().map((s) => ({
        id: `slot_${s.index}`,
        x: bx, y: 560 + (s.index + 1) * (size + gap), w: size, h: size,
        label: s.def?.displayName ?? 'Boş',
      })),
    ];
  }

  /* ---------------- input ---------------- */
  private tap(p: PointerEventInfo): void {
    if (this.phase === 'victory' || this.phase === 'defeat') { this.tapOverlay(p); return; }

    const nav = navHit(p, this.host.draw);
    if (nav !== null) {
      GameState.autosave();
      this.host.audio.play('ui');
      this.host.goTo(nav);
      return;
    }

    for (const b of this.buttons) {
      if (inRect(p, b)) { this.pressButton(b.id); return; }
    }
    // yerde loot toplama
    for (let i = this.groundLoot.length - 1; i >= 0; i--) {
      const l = this.groundLoot[i];
      if (Math.hypot(l.x - p.x, l.y - p.y) <= LOOT.pickupRadius) {
        const result = GameState.inventory.add(l.itemRef);
        if (!result.ok) {
          // çanta dolu: item YOK OLMAZ, yerde kalır ve ömrü tazelenir
          l.life = LOOT.groundLifeSec;
          this.host.fx.floatText(l.x, l.y - 20, 'Çanta Dolu!', { color: '#c96a5a', size: 18 });
          return;
        }
        const item = Content.item(l.itemRef);
        this.host.fx.floatText(l.x, l.y - 20, item?.displayName ?? '?', { color: '#7fa85c', size: 16 });
        this.host.audio.play('loot');
        this.groundLoot.splice(i, 1);
        GameState.autosave();
        return;
      }
    }
    // düşman hedefleme
    if (this.targets.tapSelect(this.enemies, p.x, p.y, 70)) this.host.audio.play('ui');
  }

  private pressButton(id: string): void {
    const target = this.targets.current(this.enemies, COMBAT.playerX);
    if (id === 'basic') {
      const out = target ? this.combat.basicAttack(target) : null;
      if (out) this.onPlayerHit(target!, out.damage, out.killed, '#f4e8c8');
      return;
    }
    const slotIndex = Number(id.replace('slot_', ''));
    const res = this.combat.skills.useSlot(slotIndex, target);
    if (!res.ok) {
      this.host.fx.floatText(310, 500, SKILL_FAIL_TEXT[res.fail ?? 'unknown'], { color: '#c96a5a', size: 18 });
      return;
    }
    this.host.audio.play('skill');
    for (const out of res.outcomes ?? []) {
      if (out.damage !== undefined && target) {
        this.onPlayerHit(target, out.damage, out.killed ?? false, out.fxColor ?? '#f4e8c8');
      } else if (out.healed !== undefined && out.healed > 0) {
        this.host.fx.floatText(COMBAT.playerX, COMBAT.laneY - 170, `+${out.healed}`, { color: out.fxColor ?? '#7fa85c', size: 20 });
      } else if (out.label) {
        const isSelf = res.def?.targeting === 'self';
        const x = isSelf ? COMBAT.playerX : (target?.x ?? COMBAT.playerX);
        const y = isSelf ? COMBAT.laneY - 170 : (target?.y ?? COMBAT.laneY) - 150;
        this.host.fx.floatText(x, y, res.def?.displayName ?? out.label, { color: out.fxColor ?? '#7fa85c', size: 18 });
        this.host.fx.particles(x, y + 60, { color: out.fxColor ?? '#7fa85c', count: 10 });
      }
    }
  }

  private onPlayerHit(target: EnemyUnit, damage: number, killed: boolean, color: string): void {
    this.attackFlash = 0.22;
    this.playerAnim.play({ sheetKey: 'gt_okcu_y_sag', frameW: OKCU_FRAME, frameH: OKCU_FRAME, row: 0, frames: 6, fps: 22, loop: false }, true);
    this.host.fx.floatText(target.x, target.y - 130, String(damage), { color, size: 22 });
    this.host.fx.particles(target.x, target.y - 70, { color, count: 6 });
    this.host.audio.play('attack');
    if (killed) this.onKill(target);
  }

  private onKill(enemy: EnemyUnit): void {
    this.kills += 1;
    const exp = Math.round(enemy.monster.exp * GameState.balance.exp);
    GameState.player.addExp(exp);
    this.host.fx.floatText(enemy.x, enemy.y - 160, `+${exp} XP`, { color: '#6f8fd0', size: 16 });
    const { drops, coin } = this.lootSys.roll(enemy.monster.lootTableId);
    const coinFinal = Math.round(coin * GameState.balance.coin);
    if (coinFinal > 0) {
      GameState.player.coins += coinFinal;
      this.host.fx.floatText(enemy.x + 30, enemy.y - 120, `+${coinFinal}`, { color: '#e8d9a0', size: 15 });
    }
    drops.forEach((d, i) => {
      this.groundLoot.push({ itemRef: d.itemRef, x: enemy.x - 20 + i * 34, y: enemy.y + 26, life: LOOT.groundLifeSec });
    });
    this.host.audio.play('hit');
    if (this.kills >= SPAWN.killTarget) { this.phase = 'victory'; GameState.autosave(); }
  }

  /* ---------------- overlay ---------------- */
  private tapOverlay(p: PointerEventInfo): void {
    const cont = { id: 'c', x: 90, y: 660, w: 440, h: 64, label: '' };
    const back = { id: 'b', x: 90, y: 744, w: 440, h: 64, label: '' };
    if (inRect(p, cont)) {
      if (this.phase === 'defeat') GameState.player.reviveForRetry();
      GameState.autosave();
      this.combat.reset();
      this.exit(); this.enter(); // combat yeniden başlatma — temiz kurulum
    } else if (inRect(p, back)) {
      if (this.phase === 'defeat') GameState.player.reviveForRetry();
      GameState.autosave();
      this.host.goTo('hub');
    }
  }

  /* ---------------- update ---------------- */
  update(dt: number): void {
    if (this.phase !== 'fight') return;
    const player = GameState.player;
    player.update(dt);
    this.combat.update(dt);
    this.playerAnim.update(dt);
    if (this.attackFlash > 0) this.attackFlash -= dt;
    if (this.playerAnim.done) this.playerAnim.play({ sheetKey: 'gt_okcu_y_sag', frameW: OKCU_FRAME, frameH: OKCU_FRAME, row: 0, frames: 1, fps: 1, loop: true }, true);

    // spawn
    const alive = this.enemies.filter((e) => e.state !== 'dying');
    const born = this.spawner.update(dt, alive.length);
    if (born) {
      this.enemies.push(born);
      this.views.set(born.uid, {
        anim: new SpriteAnimator({ sheetKey: 'kd_kurt_k', frameW: KURT_FRAME, frameH: KURT_FRAME, row: KURT_ROW_SOL, frames: 6, fps: 10, loop: true }),
      });
    }

    // karma oynanış: temel saldırı hazır olunca kendiliğinden atılır
    if (COMBAT.autoBasicAttack && this.combat.basicReady) {
      const t = this.targets.current(this.enemies, COMBAT.playerX);
      if (t) {
        const out = this.combat.basicAttack(t);
        if (out) this.onPlayerHit(t, out.damage, out.killed, '#f4e8c8');
      }
    }

    // DoT / debuff ilerlemesi (SkillSystem çözer; Scene yalnız fx gösterir)
    for (const ev of this.combat.skills.tickStatuses(this.enemies, dt)) {
      this.host.fx.floatText(ev.enemy.x, ev.enemy.y - 110, String(ev.damage), { color: ev.fxColor, size: 16 });
      if (ev.killed) this.onKill(ev.enemy);
    }

    // düşman hareket + saldırı (kuyruk: yaşayanlar sırayla durur, yığılmaz)
    const queue = this.enemies.filter((x) => x.state !== 'dying');
    for (const e of this.enemies) {
      const v = this.views.get(e.uid);
      v?.anim.update(dt);
      if (e.state === 'dying') {
        e.deathTimer += dt;
        continue;
      }
      const qi = queue.indexOf(e);
      const stopX = COMBAT.playerX + COMBAT.meleeStopDistance + qi * COMBAT.queueGap;
      if (e.x > stopX + 2) {
        if (e.state !== 'walk') { // kuyruk ilerledi → tekrar yürü
          e.state = 'walk';
          v?.anim.play({ sheetKey: 'kd_kurt_k', frameW: KURT_FRAME, frameH: KURT_FRAME, row: KURT_ROW_SOL, frames: 6, fps: 10, loop: true }, true);
        }
        const slow = SkillSystem.modifiers(e).moveSpeedMult;
        e.x = Math.max(stopX, e.x - e.monster.moveSpeed * COMBAT.monsterSpeedScale * slow * dt);
      } else if (e.state !== 'attack') {
        e.state = 'attack';
        e.attackTimer = 0.4;
        v?.anim.play({ sheetKey: 'kd_kurt_s', frameW: KURT_FRAME, frameH: KURT_FRAME, row: KURT_ROW_SOL, frames: 6, fps: 9, loop: true }, true);
      }
      // yalnız kuyruğun önündeki (menzildeki) düşman vurabilir
      const inHitRange = e.x <= COMBAT.playerX + COMBAT.meleeStopDistance + 6;
      const dmg = inHitRange ? this.combat.enemyAttackTick(e, dt) : null;
      if (dmg !== null) {
        this.host.fx.floatText(COMBAT.playerX, COMBAT.laneY - 150, `-${dmg}`, { color: '#c96a5a', size: 20 });
        this.host.audio.play('hit');
        if (!player.alive) { this.phase = 'defeat'; this.host.audio.play('death'); GameState.autosave(); }
      }
    }
    // ölüm animasyonu başlat + süpür
    for (const e of this.enemies) {
      if (e.state === 'dying' && e.deathTimer === 0) {
        this.views.get(e.uid)?.anim.play({ sheetKey: 'kd_kurt_o', frameW: KURT_FRAME, frameH: KURT_FRAME, row: KURT_ROW_SOL, frames: 6, fps: 10, loop: false }, true);
      }
    }
    this.enemies = this.enemies.filter((e) => {
      const gone = e.state === 'dying' && e.deathTimer > 0.8;
      if (gone) this.views.delete(e.uid);
      return !gone;
    });

    // yerdeki loot ömrü
    for (const l of this.groundLoot) l.life -= dt;
    this.groundLoot = this.groundLoot.filter((l) => l.life > 0);
  }

  /* ---------------- render ---------------- */
  render(g: DrawApi): void {
    // arka plan
    g.clear('#14100c');
    if (this.host.assets.has('bg_orman')) {
      const s = this.host.assets.size('bg_orman')!;
      const scale = Math.max(g.width / s.w, 760 / s.h);
      g.image('bg_orman', (g.width - s.w * scale) / 2, 0, { w: s.w * scale, h: s.h * scale });
      g.rect(0, 0, g.width, g.height, '#0b0908', 0.25);
    }

    // yerde loot
    for (const l of this.groundLoot) {
      const item = Content.item(l.itemRef);
      const blink = l.life < 1.5 ? (Math.sin(l.life * 18) + 1) / 2 * 0.6 + 0.4 : 1;
      g.circle(l.x, l.y, 17, '#0b0908', 0.55 * blink);
      if (item && this.host.assets.has(item.iconKey)) {
        g.image(item.iconKey, l.x, l.y, { w: 28, h: 28, originX: 0.5, originY: 0.5, alpha: blink });
      } else {
        g.circle(l.x, l.y, 10, '#e8d9a0', blink);
      }
    }

    // oyuncu + kuşanılı silah göstergesi (Faz 4: silah değişimi görsel olarak burada)
    this.playerAnim.render(g, COMBAT.playerX, COMBAT.laneY + 14, { scale: 0.62 });
    const weapon = GameState.equipment.equippedItem('weapon');
    if (weapon) {
      g.circle(COMBAT.playerX + 44, COMBAT.laneY - 116, 17, '#0b0908', 0.6);
      if (this.host.assets.has(weapon.iconKey)) {
        g.image(weapon.iconKey, COMBAT.playerX + 44, COMBAT.laneY - 116, { w: 26, h: 26, originX: 0.5, originY: 0.5 });
      }
    } else {
      g.text('SİLAHSIZ', COMBAT.playerX, COMBAT.laneY - 140, { align: 'center', size: 13, color: '#c96a5a' });
    }

    // düşmanlar
    const targetNow = this.targets.current(this.enemies, COMBAT.playerX);
    for (const e of this.enemies) {
      const vis = MONSTER_VISUALS[e.monster.visualKey] ?? MONSTER_VISUALS.kurt;
      const v = this.views.get(e.uid);
      const dyingAlpha = e.state === 'dying' ? Math.max(0, 1 - e.deathTimer / 0.8) : 1;
      g.circle(e.x, e.y + 6, 34 * vis.scale, '#000', 0.25 * dyingAlpha);
      v?.anim.render(g, e.x, e.y + 10, { scale: vis.scale, alpha: dyingAlpha });
      if (e.state !== 'dying') {
        const selected = targetNow?.uid === e.uid;
        if (selected) {
          g.circle(e.x, e.y + 8, 40 * vis.scale, '#e08a3c', 0.28);
          // hedef HP barı (yalnız seçili hedef için — kabul kriteri)
          drawBar(g, e.x - 45, e.y - 120 * vis.scale - 26, 90, 9, e.hp / e.maxHp, '#c96a5a', '#241c14');
          g.text(e.monster.displayName, e.x, e.y - 120 * vis.scale - 42, { align: 'center', size: 13, color: '#e8e0d0' });
        }
      }
    }

    this.renderHud(g);
    if (this.phase !== 'fight') this.renderOverlay(g);
  }

  private renderHud(g: DrawApi): void {
    const p = GameState.player;
    // üst: oyuncu barları — sayısal HP YOK, yalnız doluluk
    g.rect(0, 0, g.width, 118, '#0b0908', 0.72);
    g.text(`Sv ${p.level}`, 24, 34, { size: 20, bold: true, color: '#e8d9a0' });
    drawBar(g, 90, 24, 320, 16, p.hp / p.maxHp, '#7fa85c', '#241c14');
    drawBar(g, 90, 48, 320, 12, p.mp / p.maxMp, '#6f8fd0', '#1a1f2c');
    drawBar(g, 90, 68, 320, 6, p.expProgress(), '#9b7cc4', '#221c2a');
    if (this.host.assets.has('hud_coin')) g.image('hud_coin', 440, 24, { w: 24, h: 24 });
    g.text(String(p.coins), 472, 36, { size: 17, color: '#e8d9a0' });
    g.text(`${this.zone.displayName} · ${this.kills}/${SPAWN.killTarget}`, 24, 98, { size: 14, color: '#8d8272' });
    g.text(`Çanta: ${GameState.inventory.totalItems}`, 440, 98, { size: 14, color: '#8d8272' });

    // sağ: saldırı + 3 skill slotu (loadout'tan)
    const slots = this.combat.skills.slots();
    for (const b of this.buttons) {
      let ratio = 0; let sub = ''; let locked = false;
      if (b.id === 'basic') {
        ratio = this.combat.basicCooldownRatio;
      } else {
        const s = slots[Number(b.id.replace('slot_', ''))];
        if (s) {
          ratio = s.cooldownRatio;
          if (!s.def) { sub = '—'; locked = true; }
          else if (s.blocked === 'levelReq') { sub = `Sv ${s.def.requiredLevel}`; locked = true; }
          else { sub = s.def.manaCost > 0 ? `${s.def.manaCost} MP` : ''; locked = s.blocked === 'mana' || s.blocked === 'noWeapon'; }
        }
      }
      drawButton(g, b, ratio, sub, locked);
    }

    drawBottomNav(g, this.host, this.key);
  }

  private renderOverlay(g: DrawApi): void {
    g.rect(0, 0, g.width, g.height, '#0b0908', 0.82);
    const won = this.phase === 'victory';
    g.text(won ? 'BÖLÜM TAMAMLANDI' : 'YENİLDİN', g.width / 2, 400, { align: 'center', size: 32, bold: true, color: won ? '#e8d9a0' : '#c96a5a' });
    g.text(`${this.kills} kesim · çanta ${GameState.inventory.totalItems} eşya · ${GameState.player.coins} coin`, g.width / 2, 452, { align: 'center', size: 16, color: '#8d8272' });
    g.rect(90, 660, 440, 64, '#2c2417');
    g.text(won ? 'Devam Et' : 'Yeniden Dene', g.width / 2, 692, { align: 'center', size: 20, bold: true, color: '#e8e0d0' });
    g.rect(90, 744, 440, 64, '#221c14');
    g.text('Kampa Dön', g.width / 2, 776, { align: 'center', size: 20, color: '#cfc7b6' });
  }
}
