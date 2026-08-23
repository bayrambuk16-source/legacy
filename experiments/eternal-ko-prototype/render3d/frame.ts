/** GAMEPLAY → GÖRÜNÜM ADAPTÖRÜ — P2.0
 *
 *  Gameplay durumunu OKUR ve renderer'ın anlayacağı DAR görünüme çevirir.
 *  Bu dosya **THREE İMPORT ETMEZ** ve gameplay'e HİÇBİR ŞEY YAZMAZ —
 *  yalnız alan kopyalar. Bu yüzden headless test edilebilir ve renderer
 *  açık/kapalı olması gameplay sonucunu değiştiremez (§26/§36).
 *
 *  KİMLİK: mob görünümü `uid` ile birlikte **`generation`** taşır; P1.6.1
 *  respawn kimliği renderer'a bu şekilde geçer (§7). */
import { CombatPipeline } from '../world/CombatPipeline.js';
import { itemDefinition } from '../data/item-catalog.js';
import { ITEM_CLASS_COLOR } from '../data/item-model.js';
import { MOB_AI_PROFILES } from '../data/mob-ai-profiles.js';
import type { PrototypeState } from '../state.js';
import type { BoundaryView, LootView, MobView, ProjectileView, WorldFrame } from './views.js';

/** Altın rengi — item sınıfı olmayan para birimi için. */
const COIN_COLOR = '#e8d9a0';
/** Katalogda tanımı olmayan item için nötr renk. */
const UNKNOWN_ITEM_COLOR = '#cfc7b6';

export function buildWorldFrame(S: PrototypeState): WorldFrame {
  const w = S.world;

  const mobs: MobView[] = [];
  for (const m of S.mobs.mobs) {
    const slot = S.mobs.slotOf(m.slotId);
    const aiType = slot?.aiType ?? 'NORMAL';
    /* P2.2 — AI runtime'ı KOPYALANIR (referans tutulmaz). Faz, saldırı çevrimi
       ve profil vuruş anı klip seçimi/hizalaması için gereklidir. */
    const rt = S.mobs.ai.runtimeOf(m.uid);
    mobs.push({
      uid: m.uid,
      generation: m.generation,
      worldX: m.worldX,
      worldY: m.worldY,
      aiType,
      hpRatio: m.maxHp > 0 ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0,
      dead: m.ai === 'dead' || m.state === 'dying',
      phase: rt?.phase ?? 'IDLE',
      attackPhase: rt?.attackPhase ?? 'recovery',
      attackTimer: rt?.attackTimer ?? 0,
      hitMomentSec: MOB_AI_PROFILES[aiType].hitMomentSec,
    });
  }

  const projectiles: ProjectileView[] = S.adapter.pipeline.projectiles.map((p) => {
    const pos = CombatPipeline.position(p);
    return {
      id: p.id, worldX: pos.x, worldY: pos.y, dirX: p.dirX, dirY: p.dirY,
      targetUid: p.targetUid, travelled: p.travelled, travelDistance: p.travelDistance,
    };
  });

  const loot: LootView[] = S.worldLoot.items.map((l) => {
    const def = l.kind === 'coin' ? undefined : itemDefinition(l.itemRef);
    return {
      lootUid: l.lootUid,
      worldX: l.worldX,
      worldY: l.worldY,
      isCoin: l.kind === 'coin',
      colorHex: l.kind === 'coin' ? COIN_COLOR
        : def ? ITEM_CLASS_COLOR[def.itemClass] : UNKNOWN_ITEM_COLOR,
    };
  });

  const center = S.genie.farmCenter;
  const boundary: BoundaryView | null = center === null ? null : {
    centerX: center.x,
    centerY: center.y,
    radius: S.genie.settings.farmBoundaryRadius,
    enabled: S.genie.settings.farmBoundaryEnabled && S.genie.settings.showFarmBoundary,
  };

  return {
    player: {
      worldX: w.worldX,
      worldY: w.worldY,
      facingAngle: w.facingAngle,
      moving: w.moving,
      alive: S.player.alive,
      /* P2.1 — gövde açısı P1.2.2 kuralını AYNEN kullanır: saldırıda hedef,
         aksi halde hareket yönü. Renderer kendi kuralını UYDURMAZ. */
      bodyAngle: S.anim.angle,
      moveX: w.moveX,
      moveY: w.moveY,
      hpRatio: S.player.maxHp > 0
        ? Math.max(0, Math.min(1, S.player.hp / S.player.maxHp)) : 0,
      weaponRef: S.stats.slots().find((sl) => sl.slotId === 'weapon')?.definitionRef ?? null,
      attackTriggers: S.anim.triggers.attack,
      skillTriggers: S.anim.triggers.skill,
    },
    mobs,
    projectiles,
    loot,
    targetUid: S.targets.selectedUid,
    boundary,
  };
}
