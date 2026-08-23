/** GENIE MOVEMENT STATE MACHINE — FARM LOOP V1 (P1.5)
 *
 *  Genie artık yalnız "hangi skill" sorusunu yanıtlamıyor; gerçek bir farm
 *  döngüsü yürütüyor:
 *
 *      ACQUIRE → APPROACH → COMBAT → (hedef ölür) → ACQUIRE → …
 *                    └──────── hedef yoksa ────────→ RETURN → WAIT
 *
 *  ══ TASARIM KURALLARI ══
 *  · Bu dosya RENDERER'DAN ve Scene'den BAĞIMSIZDIR. Karar `decide()` ile
 *    saf veri üzerinden verilir, tek başına test edilebilir. Scene'e dağılmış
 *    if blokları YOKTUR.
 *  · Her şey WORLD koordinatındadır. Canvas/ekran değeri buraya GİRMEZ;
 *    hareket hedefi `destinationWorldX/Y` olarak taşınır ki ileride
 *    3D renderer / navmesh aynı arayüzü kullanabilsin.
 *  · Hız BURADA hesaplanmaz. Dönen `MoveIntent` bir BİRİM YÖN vektörüdür;
 *    gerçek hız oyuncunun `WorldMovementSystem`'inden gelir (cheat speed YOK,
 *    Genie'ye özel `genieSpeed` YOK). Attack Move çarpanı da oradan uygulanır.
 *  · Navmesh / A* / engel kaçınma V1'de YOKTUR: düz çizgi hareket.
 *
 *  ══ İKİ MENZİL + HİSTEREZİS ══
 *      Attack Range   450  — hedef EDİNME (GenieSystem'de, DEĞİŞMEDİ)
 *      Cast range     400  — skill'in AUTHORITATIVE menzili (SkillSystem'de)
 *      enterCombat    380  — otomatik konumlanma hedefi (YALNIZ movement tuning)
 *
 *  380 YENİ BİR SKILL MENZİLİ DEĞİLDİR. Amacı, tam 400 sınırında
 *  399 ↔ 401 titremesini (oscillation) engellemektir:
 *      d > 400            → APPROACH
 *      d <= 380           → COMBAT
 *      380 < d <= 400     → MEVCUT durum korunur (COMBAT ise COMBAT kalır,
 *                           APPROACH ise 380'e kadar yaklaşmaya devam eder) */

import type { PlayerWorldState } from './types.js';

export type GenieState = 'IDLE' | 'ACQUIRE' | 'APPROACH' | 'COMBAT' | 'RETURN' | 'WAIT';

/** Hareketi bu karede kim sürdü? İki vektör ASLA TOPLANMAZ. */
export type MovementSource = 'MANUAL' | 'GENIE' | 'NONE';

/** PROJECT LEGACY TUNING — kaynaktan gelmez. */
export const GENIE_MOVEMENT_V1 = {
  /** Bu mesafeye gelince hareket KESİLİR ve combat başlar. */
  enterCombatDistance: 380,
  /** Bu mesafenin ÜSTÜNE çıkılırsa yeniden yaklaşılır (= cast range). */
  leaveCombatDistance: 400,
  /** Merkeze bu kadar yaklaşınca RETURN biter (pixel-perfect gitmeye çalışma). */
  returnTolerance: 20,
} as const;

/** Bir karelik hareket NİYETİ. `magnitude = 0` → hareket yok. */
export interface MoveIntent {
  x: number; y: number; magnitude: number;
  /** Nereye gidiliyor (world). Hareket yoksa null. */
  destinationWorldX: number | null;
  destinationWorldY: number | null;
}

export const NO_MOVE: MoveIntent = {
  x: 0, y: 0, magnitude: 0, destinationWorldX: null, destinationWorldY: null,
};

export interface GenieMovementInput {
  enabled: boolean;
  playerX: number; playerY: number;
  /** Genie'nin O AN seçili hedefi (yoksa null). */
  target: { uid: number; worldX: number; worldY: number } | null;
  /** Hedef yok ama menzilde uygun mob VAR mı? (arama durumu) */
  hasEligibleTarget: boolean;
  farmCenter: { x: number; y: number } | null;
}

export interface GenieMovementDecision {
  state: GenieState;
  intent: MoveIntent;
  /** Hedefe / merkeze olan mesafe (telemetri). */
  distance: number | null;
}

function toward(fromX: number, fromY: number, toX: number, toY: number): MoveIntent {
  const dx = toX - fromX, dy = toY - fromY;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return NO_MOVE;
  return {
    x: dx / d, y: dy / d, magnitude: 1,
    destinationWorldX: toX, destinationWorldY: toY,
  };
}

export class GenieMovementController {
  readonly tuning = { ...GENIE_MOVEMENT_V1 };
  private current: GenieState = 'IDLE';
  private transition: string | null = null;

  get state(): GenieState { return this.current; }
  /** "APPROACH → COMBAT" biçiminde son geçiş (telemetri). */
  get lastTransition(): string | null { return this.transition; }

  /** BAŞLAT: eski durum temizlenir, arama ile başlanır. */
  reset(): void {
    this.setState('IDLE');
    this.transition = null;
  }
  begin(): void { this.setState('ACQUIRE'); }

  /** ATIŞ KONUMUNDA MIYIZ? — SAF SORGU, durum DEĞİŞTİRMEZ.
   *
   *  `decide()` içindeki histerezisin BİREBİR aynı ifadesidir (eşikler tek
   *  yerde tanımlıdır, kopyalanmaz). GenieSystem cast kapısı olarak bunu
   *  kullanır; böylece kapı bir DURUM ADINA değil GERÇEK MESAFEYE bakar.
   *
   *  Durum makinesi henüz sürülmemişse (`ACQUIRE`/`IDLE`) daha KATI olan
   *  giriş eşiği (380) uygulanır — güvenli taraf. */
  inCastingPosition(distance: number | null): boolean {
    if (distance === null) return false;
    return this.current === 'COMBAT'
      ? distance <= this.tuning.leaveCombatDistance
      : distance <= this.tuning.enterCombatDistance;
  }

  private setState(next: GenieState): void {
    if (next !== this.current) {
      this.transition = `${this.current} → ${next}`;
      this.current = next;
    }
  }

  /** Tek karelik karar. Saf: hiçbir state'e YAZMAZ, yalnız kendi durumunu günceller. */
  decide(input: GenieMovementInput): GenieMovementDecision {
    if (!input.enabled) {
      this.setState('IDLE');
      return { state: this.current, intent: NO_MOVE, distance: null };
    }

    /* ---- hedef var: yaklaş veya dövüş (histerezisli) ---- */
    if (input.target) {
      const d = Math.hypot(input.target.worldX - input.playerX, input.target.worldY - input.playerY);
      const inCombat = this.current === 'COMBAT'
        ? d <= this.tuning.leaveCombatDistance          // combat'ta kal: 400'e kadar
        : d <= this.tuning.enterCombatDistance;         // combat'a gir: 380
      if (inCombat) {
        this.setState('COMBAT');
        return { state: this.current, intent: NO_MOVE, distance: d };
      }
      this.setState('APPROACH');
      return {
        state: this.current,
        intent: toward(input.playerX, input.playerY, input.target.worldX, input.target.worldY),
        distance: d,
      };
    }

    /* ---- hedef yok ---- */
    if (input.hasEligibleTarget) {
      /* Bu karede uygun mob var ama henüz seçilmedi (karar tiki bekliyor). */
      this.setState('ACQUIRE');
      return { state: this.current, intent: NO_MOVE, distance: null };
    }

    if (input.farmCenter) {
      const d = Math.hypot(input.farmCenter.x - input.playerX, input.farmCenter.y - input.playerY);
      if (d > this.tuning.returnTolerance) {
        this.setState('RETURN');
        return {
          state: this.current,
          intent: toward(input.playerX, input.playerY, input.farmCenter.x, input.farmCenter.y),
          distance: d,
        };
      }
      this.setState('WAIT');
      return { state: this.current, intent: NO_MOVE, distance: d };
    }

    this.setState('WAIT');
    return { state: this.current, intent: NO_MOVE, distance: null };
  }
}

/** FARM BOUNDARY HARD LIMIT — oyuncuyu sınır dairesine geri çeker.
 *  YALNIZ Genie kaynaklı harekette uygulanır; manuel oyuncu serbesttir.
 *  Daire dışbükey olduğu için sınır içindeki bir hedefe düz çizgide gitmek
 *  zaten dışarı çıkarmaz; bu, yarıçap küçültülmesi gibi kenar durumlar için
 *  güvenlik ağıdır. Dönen değer: kırpma yapıldı mı. */
export function clampToBoundary(
  player: PlayerWorldState,
  center: { x: number; y: number } | null,
  radius: number,
  enabled: boolean,
): boolean {
  if (!enabled || !center) return false;
  const dx = player.worldX - center.x, dy = player.worldY - center.y;
  const d = Math.hypot(dx, dy);
  if (d <= radius || d < 1e-9) return false;
  player.worldX = center.x + (dx / d) * radius;
  player.worldY = center.y + (dy / d) * radius;
  return true;
}
