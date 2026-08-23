/** SKILL GÖRSEL KİMLİĞİ — TEK MERKEZ (P2.31)
 *
 *  ══════════════ NEDEN VAR ══════════════
 *  Oyun testi bulgusu: "görünen ikon ile tetiklenen skill farklı".
 *
 *  Sebep ölçüldü: HUD ikonu skille DEĞİL, YUVA KONUMUNA bağlıydı.
 *  `hud-layout.ts` içindeki `SKILL_SPOTS` her konuma sabit bir görsel
 *  veriyordu — birinci yuvada hangi skill olursa olsun `ui_skill_standart`
 *  çiziliyordu. Oyuncu barı yeniden düzenleyince ikon yerinde kalıyor,
 *  skill değişiyordu.
 *
 *  Artık ikon SKILL REFERANSINA bağlı. Yuva sırası değişse de ikon
 *  skille birlikte gider.
 *
 *  ══════════════ İKON SAYISI YETMİYOR — GİZLENMEDİ ══════════════
 *  Elimizde BEŞ ikon varlığı var, on beş skill. On skill için görsel
 *  YOK. Sahte eşleme yapmak yerine `null` döner ve sunu katmanı
 *  yer tutucu çizer: kalite renginde çerçeve + skillin baş harfi.
 *  Böylece hangi skillin ikonsuz olduğu GÖRÜNÜR kalır ve gerçek ikon
 *  geldiğinde tek satırla bağlanır.
 *
 *  ══════════════ SAF ══════════════
 *  canvas, three, mutasyon YOKTUR. */

import { ARCHER } from './archer-balance.js';

/** Skill referansı → HUD ikon anahtarı. Anahtar `PROTO_ASSETS` içinde
 *  kayıtlı olmalıdır; test bunu doğrular. */
export const SKILL_ICONS: Readonly<Record<number, string>> = {
  [ARCHER.STANDART_ATIS]: 'ui_skill_standart',
  [ARCHER.UCLU_SALVO]: 'ui_skill_uclu',
  [ARCHER.BESLI_SALVO]: 'ui_skill_yesil',
  [ARCHER.GOLGE_AVCISI]: 'ui_skill_golge',
  [ARCHER.KARA_TAKIP]: 'ui_skill_kara',
};

/** İkon anahtarı; yoksa `null` — çağıran yer tutucu çizer. */
export function skillIconKey(sourceRef: number): string | null {
  return SKILL_ICONS[sourceRef] ?? null;
}

/** İkonsuz skiller. Denetim ve ileride görsel üretimi için liste. */
export function skillsWithoutIcon(order: readonly number[]): number[] {
  return order.filter((r) => skillIconKey(r) === null);
}

/** Yer tutucu harfi — ikon yokken çizilir. Skillin görünen adının
 *  ilk harfi; boşsa '?'. */
export function skillInitial(displayName: string): string {
  const t = displayName.trim();
  return t.length > 0 ? t[0]!.toLocaleUpperCase('tr-TR') : '?';
}

/** ═══ KİLİT DURUMU ═══
 *
 *  Oyun testi bulgusu: "seviye yetersiz skill aktifmiş gibi görünüyor".
 *  Sv1 oyuncu hangi skilli kullanabildiğini anlayamıyordu.
 *
 *  Durum ÜÇ değerlidir; ikisi değil. Eskiden yalnız "engelli mi"
 *  bakılıyordu ve seviye kilidi ile mana yetersizliği aynı görünüyordu
 *  — oysa biri KALICI, diğeri geçici. */
export type SkillGateState =
  /** Kullanılabilir. */
  | 'ready'
  /** Seviye yetersiz — KALICI kilit, oyuncu bekleyerek çözemez. */
  | 'levelLocked'
  /** Puanla açılmamış — oyuncu SKILL PUANI harcayarak çözebilir. */
  | 'unpurchased'
  /** Mana/cooldown/hedef — GEÇİCİ, birazdan geçer. */
  | 'busy';

export interface GateInput {
  readonly requiredLevel: number;
  readonly playerLevel: number;
  readonly unlocked: boolean;
  /** `SkillLoadout` engel sebebi; yoksa `null`. */
  readonly blocked: string | null;
}

/** Kapı durumu. SIRA ÖNEMLİDİR: kalıcı engeller geçicilerden önce
 *  bildirilir, yoksa Sv70 skilli "mana yetmiyor" gibi görünür. */
export function skillGate(i: GateInput): SkillGateState {
  if (i.playerLevel < i.requiredLevel) return 'levelLocked';
  if (!i.unlocked) return 'unpurchased';
  if (i.blocked !== null && i.blocked !== 'noTarget') return 'busy';
  return 'ready';
}

/** Kapı durumuna göre çizim opaklığı. Kalıcı kilit EN SOLUK olmalı ki
 *  Sv1 oyuncu bir bakışta neyi kullanabildiğini görsün. */
export const GATE_ALPHA: Readonly<Record<SkillGateState, number>> = {
  ready: 1,
  busy: 0.62,
  unpurchased: 0.38,
  levelLocked: 0.22,
};

/** Kapı durumuna göre kenar rengi. */
export const GATE_COLOR: Readonly<Record<SkillGateState, string>> = {
  ready: '#e8d9a0',
  busy: '#6f8fd0',
  unpurchased: '#7fa85c',
  levelLocked: '#c96a5a',
};

/** Kilitli skillin üstünde gösterilecek KISA rozet. `null` = rozet yok. */
export function gateBadge(state: SkillGateState, requiredLevel: number): string | null {
  if (state === 'levelLocked') return `Sv${requiredLevel}`;
  if (state === 'unpurchased') return 'AÇ';
  return null;
}
