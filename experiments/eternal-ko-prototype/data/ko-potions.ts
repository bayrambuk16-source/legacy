/** KO POTION PROFILE — PROTOTİPE ÖZEL (P1.4.1)
 *
 *  ══ KAYNAK ÇÖZÜLDÜ ══
 *  Ana `src/game/data/consumable-behaviors.ts` dosyasının başındaki
 *  "effect1/effect2 alanları çözülmedi" notu ARTIK GEÇERLİ DEĞİLDİR.
 *  KO_Reference_v8.db doğrudan sorgulandı (22 Ağu 2026):
 *
 *      items_server.effect1  →  magic_type3.magic_num
 *      magic_type3.first_damage  =  SABİT geri kazanım miktarı
 *      magic_type3.direct_type   =  1 → HP · 2 → MP
 *      magic_type3.duration      =  0  → ANLIK (zamana yayılı DEĞİL)
 *
 *  Doğrulanan aileler:
 *      HP: 90 · 180 · 360 · 720            (Water of life/love/grace/favors)
 *      MP: 120 · 240 · 480 · 960 · 1920    (Potion of spirit/intelligence/
 *                                           sagacity/wisdom/soul)
 *
 *  ══ YÜZDE DEĞİL, SABİT ══
 *  Ana Faz 6.1 iksirleri `percentOfMax` kullanır ve O DOSYA DEĞİŞTİRİLMEDİ.
 *  Prototip bu profili kullanır:  after = min(max, before + restoreAmount)
 *  Yüzde YALNIZ Genie eşiği (ne zaman içileceği) içindir.
 *
 *  ══ ÇÖZÜLMEMİŞ ══
 *  `skills.cast_time = 5` ve `skills.recast_time = 1` bütün iksir efekt
 *  kayıtlarında aynı. BİRİMLERİ DOĞRULANMADI ve DB'de sunucu tarafı kullanım
 *  kodu yok → **POTION RECAST SEMANTIC UNRESOLVED**. Bu yüzden prototipte
 *  iksir cooldown'u UYDURULMADI (bkz. `PotionSystem`). */

export type PotionResource = 'hp' | 'mp';

export interface KoPotionProfile {
  /** `items_server.num` — envanterdeki item referansı. */
  readonly itemRef: number;
  /** Kaynaktaki İngilizce ad (`items_server.name`). */
  readonly sourceName: string;
  /** Oyundaki ad (`items.json`, içerik override'ı). */
  readonly displayName: string;
  readonly resource: PotionResource;
  /** `magic_type3.first_damage` — SABİT geri kazanım. SOURCE FACT. */
  readonly restoreAmount: number;
  /** `items_server.buy_price`. SOURCE FACT. */
  readonly vendorPrice: number;
  /** `items_server.effect1` → `magic_type3.magic_num`. */
  readonly sourceEffectRef: number;
  /** `magic_type3.direct_type` (1 = HP, 2 = MP). */
  readonly sourceDirectType: 1 | 2;
  /** `skills.cast_time` — BİRİM ÇÖZÜLMEDİ, ham saklanır. */
  readonly sourceCastTimeRaw: number;
  /** `skills.recast_time` — BİRİM ÇÖZÜLMEDİ, ham saklanır. */
  readonly sourceRecastTimeRaw: number;
}

/** Dokuz iksir — hepsi DB'den okundu, hiçbiri tahmin değil. */
export const KO_POTIONS: readonly KoPotionProfile[] = [
  /* ---- HP ailesi (direct_type 1) ---- */
  { itemRef: 389011000, sourceName: 'Water of life', displayName: 'Yaşam Suyu',
    resource: 'hp', restoreAmount: 90, vendorPrice: 160,
    sourceEffectRef: 490011, sourceDirectType: 1, sourceCastTimeRaw: 5, sourceRecastTimeRaw: 1 },
  { itemRef: 389012000, sourceName: 'Water of love', displayName: 'Sevgi Suyu',
    resource: 'hp', restoreAmount: 180, vendorPrice: 600,
    sourceEffectRef: 490012, sourceDirectType: 1, sourceCastTimeRaw: 5, sourceRecastTimeRaw: 1 },
  { itemRef: 389013000, sourceName: 'Water of grace', displayName: 'Zarafet Suyu',
    resource: 'hp', restoreAmount: 360, vendorPrice: 2000,
    sourceEffectRef: 490013, sourceDirectType: 1, sourceCastTimeRaw: 5, sourceRecastTimeRaw: 1 },
  { itemRef: 389014000, sourceName: 'Water of favors', displayName: 'Lütuf Suyu',
    resource: 'hp', restoreAmount: 720, vendorPrice: 7000,
    sourceEffectRef: 490014, sourceDirectType: 1, sourceCastTimeRaw: 5, sourceRecastTimeRaw: 1 },
  /* ---- MP ailesi (direct_type 2) ---- */
  { itemRef: 389016000, sourceName: 'Potion of spirit', displayName: 'Ruh İksiri',
    resource: 'mp', restoreAmount: 120, vendorPrice: 160,
    sourceEffectRef: 490016, sourceDirectType: 2, sourceCastTimeRaw: 5, sourceRecastTimeRaw: 1 },
  { itemRef: 389017000, sourceName: 'Potion of intelligence', displayName: 'Zihin İksiri',
    resource: 'mp', restoreAmount: 240, vendorPrice: 600,
    sourceEffectRef: 490017, sourceDirectType: 2, sourceCastTimeRaw: 5, sourceRecastTimeRaw: 1 },
  { itemRef: 389018000, sourceName: 'Potion of sagacity', displayName: 'Bilgelik İksiri',
    resource: 'mp', restoreAmount: 480, vendorPrice: 2000,
    sourceEffectRef: 490018, sourceDirectType: 2, sourceCastTimeRaw: 5, sourceRecastTimeRaw: 1 },
  { itemRef: 389019000, sourceName: 'Potion of wisdom', displayName: 'İrfan İksiri',
    resource: 'mp', restoreAmount: 960, vendorPrice: 7000,
    sourceEffectRef: 490019, sourceDirectType: 2, sourceCastTimeRaw: 5, sourceRecastTimeRaw: 1 },
  { itemRef: 389020000, sourceName: 'Potion of soul', displayName: 'Can İksiri',
    resource: 'mp', restoreAmount: 1920, vendorPrice: 15000,
    sourceEffectRef: 490020, sourceDirectType: 2, sourceCastTimeRaw: 5, sourceRecastTimeRaw: 1 },
] as const;

export function koPotion(itemRef: number): KoPotionProfile | undefined {
  return KO_POTIONS.find((p) => p.itemRef === itemRef);
}

/** Bir kaynak türünün iksirleri, KÜÇÜKTEN BÜYÜĞE. */
export function potionsFor(resource: PotionResource): KoPotionProfile[] {
  return KO_POTIONS.filter((p) => p.resource === resource)
    .slice().sort((a, b) => a.restoreAmount - b.restoreAmount);
}

/** Genie ayar ekranının döngüsü: KAPALI + o ailenin bütün kademeleri. */
export function potionOptions(resource: PotionResource): Array<number | null> {
  return [null, ...potionsFor(resource).map((p) => p.itemRef)];
}

/** Kısa etiket: "MP +960" / "HP +90". */
export function potionLabel(itemRef: number | null, resource: PotionResource): string {
  if (itemRef === null) return 'KAPALI';
  const p = koPotion(itemRef);
  if (!p) return '—';
  return `${resource.toUpperCase()} +${p.restoreAmount}`;
}

/** Prototip başlangıç seçimi: başlangıç çantasında BULUNAN en küçük kademe.
 *  (Yüksek kademeler DEV → "Test iksirleri ver" ile gelir.) */
export const DEFAULT_HP_POTION_REF = 389011000;   // Yaşam Suyu  +90
export const DEFAULT_MP_POTION_REF = 389016000;   // Ruh İksiri  +120

/** DEV test paketi (§14) — normal başlangıç envanterini DEĞİŞTİRMEZ. */
export const DEV_TEST_POTIONS: ReadonlyArray<{ itemRef: number; quantity: number }> = [
  { itemRef: 389011000, quantity: 20 },   // HP  +90
  { itemRef: 389012000, quantity: 20 },   // HP +180
  { itemRef: 389013000, quantity: 20 },   // HP +360
  { itemRef: 389014000, quantity: 20 },   // HP +720
  { itemRef: 389018000, quantity: 20 },   // MP +480
  { itemRef: 389019000, quantity: 20 },   // MP +960
  { itemRef: 389020000, quantity: 20 },   // MP +1920
];
