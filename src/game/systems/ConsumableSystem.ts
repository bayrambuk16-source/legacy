/** Tüketilebilir kullanımı — davranış `consumable-behaviors.ts`ten okunur,
 *  effect kind'ına göre handler çalışır (item ID switch zinciri YOK).
 *
 *  ATOMİKLİK (Faz 6.1): handler'lar SAF'tır — yalnız delta hesaplar, state'e dokunmaz.
 *  Akış: (1) tüm doğrulamalar → (2) delta hesabı → (3) adet düşürme → (4) delta uygula.
 *  Başarısız kullanımda HP, MP ve adet DEĞİŞMEZ. Kilitli item kullanılamaz (MVP kararı):
 *  aksi halde kilitli iksir sınırsız HP/MP kaynağına dönüşürdü. */
import { Content } from '../data/GameContentRepository.js';
import { CONSUMABLE_BEHAVIORS, type ConsumableBehaviorDef, type ConsumableEffect } from '../data/consumable-behaviors.js';
import type { InventoryState } from './InventoryState.js';
import type { PlayerState } from './PlayerState.js';
import type { CharacterStats } from './CharacterStats.js';

export type ConsumeFail = 'notFound' | 'noBehavior' | 'noEffect' | 'equipped' | 'locked' | 'empty';
export interface ConsumeResult {
  ok: boolean;
  fail?: ConsumeFail;
  hpRestored?: number;
  mpRestored?: number;
  labels?: string[];
}

/** Saf önizleme sonucu — hiçbir state değişmeden ne olacağını söyler. */
interface EffectPlan { hpDelta: number; mpDelta: number; labels: string[] }
interface PlanContext { hp: number; maxHp: number; mp: number; maxMp: number }
type ConsumablePlanner = (ctx: PlanContext, effect: ConsumableEffect, plan: EffectPlan) => void;

const PLANNERS: Record<ConsumableEffect['kind'], ConsumablePlanner> = {
  restoreHp: (ctx, effect, plan) => {
    if (effect.kind !== 'restoreHp') return;
    const target = Math.min(ctx.maxHp, ctx.hp + plan.hpDelta + ctx.maxHp * effect.percentOfMax);
    plan.hpDelta = target - ctx.hp;
  },
  restoreMp: (ctx, effect, plan) => {
    if (effect.kind !== 'restoreMp') return;
    const target = Math.min(ctx.maxMp, ctx.mp + plan.mpDelta + ctx.maxMp * effect.percentOfMax);
    plan.mpDelta = target - ctx.mp;
  },
  cure: (_ctx, _effect, plan) => { plan.labels.push('Arınma'); },
};

export class ConsumableSystem {
  private byRef = new Map<number, ConsumableBehaviorDef>(
    CONSUMABLE_BEHAVIORS.map((b) => [b.sourceRef, b]),
  );

  constructor(
    private inventory: InventoryState,
    private player: PlayerState,
    private stats: CharacterStats,
  ) {}

  isConsumable(itemRef: number): boolean {
    return this.byRef.has(itemRef) && (Content.item(itemRef)?.stackable ?? false);
  }
  behavior(itemRef: number): ConsumableBehaviorDef | undefined { return this.byRef.get(itemRef); }

  /** Etkileri uygulamadan, bu kullanımın ne yapacağını hesaplar (saf). */
  private plan(def: ConsumableBehaviorDef): EffectPlan {
    const final = this.stats.finalStats();
    const ctx: PlanContext = {
      hp: this.player.hp, maxHp: final.maxHp,
      mp: this.player.mp, maxMp: final.maxMp,
    };
    const plan: EffectPlan = { hpDelta: 0, mpDelta: 0, labels: [] };
    for (const effect of def.effects) PLANNERS[effect.kind]?.(ctx, effect, plan);
    return plan;
  }

  /** Kullanılabilirlik ön-kontrolü (UI butonunu kilitlemek için de kullanılabilir). */
  canUse(instanceId: number): { ok: true } | { ok: false; reason: ConsumeFail } {
    const entry = this.inventory.get(instanceId);
    if (!entry) return { ok: false, reason: 'notFound' };
    const guard = this.inventory.canConsume(instanceId, 1);
    if (!guard.ok) return { ok: false, reason: guard.reason };   // locked / equipped / empty
    if (!this.byRef.has(entry.itemRef)) return { ok: false, reason: 'noBehavior' };
    return { ok: true };
  }

  use(instanceId: number): ConsumeResult {
    /* 1) TÜM doğrulamalar — hiçbir mutasyon yok */
    const check = this.canUse(instanceId);
    if (!check.ok) return { ok: false, fail: check.reason };
    const entry = this.inventory.get(instanceId)!;
    const def = this.byRef.get(entry.itemRef)!;

    /* 2) saf delta hesabı */
    const plan = this.plan(def);
    const changes = plan.hpDelta > 0 || plan.mpDelta > 0 || plan.labels.length > 0;
    if (!changes) return { ok: false, fail: 'noEffect' };   // dolu canla iksir harcanmaz

    /* 3) adet düşürme — atomik; başarısızsa effect UYGULANMAZ */
    if (def.consumesOne && !this.inventory.consume(instanceId, 1)) {
      return { ok: false, fail: 'locked' };
    }

    /* 4) delta uygula */
    if (plan.hpDelta > 0) this.player.hp += plan.hpDelta;
    if (plan.mpDelta > 0) this.player.mp += plan.mpDelta;
    return {
      ok: true,
      hpRestored: Math.round(plan.hpDelta),
      mpRestored: Math.round(plan.mpDelta),
      labels: plan.labels.length ? plan.labels : undefined,
    };
  }
}
