# ITEM CLASS + EQUIPMENT + BUILD V1 — P1.8

**Kapsam:** prototip (`experiments/eternal-ko-prototype/`).
**Upgrade / anvil / scroll NPC BU GÖREVDE YAPILMADI** (§8/§42 → P1.9).

**İzolasyon:** `src/` DEĞİŞMEDİ · kaynak DB ve üretilmiş JSON DEĞİŞMEDİ ·
`dist/preview.html` md5 `0399549684eec7137f46cee73c318710` (aynı).

---

## 1. KO DB ITEM STAT MAPPING (doğrulandı)

Authoritative tablo: **`items_server`** (62 954 satır). `num` = 9 haneli KO item
kimliği; üretilmiş `items.json` bu tablodan türetilmiştir.

| Kolon | Anlam | Sıfır olmayan |
|---|---|---:|
| `damage` | silah saldırısı | 35 657 |
| `ac` | zırh savunması | 20 693 |
| `req_level` | seviye gereksinimi | 62 953 |
| `req_str` / `req_dex` / `req_intel` / `req_sta` / `req_cha` | stat gereksinimi | 36 628 / 10 682 / 15 211 / 7 213 / 8 004 |
| `fire_damage` / `ice_damage` / `lightning_damage` / `poison_damage` | silah elementali | 2 189 / 2 025 / 2 323 / 1 920 |
| `hp_drain` / `mp_drain` / `mp_damage` / `mirror_damage` | özel silah nitelikleri | 1 212 / 1 400 / 1 111 / 144 |
| `str_bonus` / `sta_bonus` / `dex_bonus` / `intel_bonus` / `cha_bonus` | primary stat bonusu | 5 541 / 5 752 / 5 504 / 4 945 / 3 324 |
| `max_hp_bonus` / `max_mp_bonus` | HP/MP bonusu | 1 056 / 996 |
| `fire_r` / `cold_r` / `lightning_r` / `magic_r` / `poison_r` / `curse_r` | dirençler | 4 197 / 3 868 / 3 690 / 2 745 / 2 816 / 2 441 |
| `delay` | saldırı gecikmesi | 62 531 |
| `kind` | item türü (70/71 = yay/arbalet) | — |
| `slot` | equip yuvası | — |
| `class_code` | sınıf kısıtı (0 = evrensel) | — |

**Slot eşlemesi** (Faz 4'te gözlemle doğrulanmış, P1.8'de yeniden kullanıldı):
`0/1/3/4` silah aileleri (**4 = yay**) · `2` kalkan · `5` chest · `6` pants ·
`7` helmet · `8` gloves · `9` boots · `10` earring · `11` necklace · `12` ring ·
`14` belt · `15/17` tüketilebilir.

**Sınıf kuralı:** `class_code` 0 evrensel, 1–4 sınıf özel. Okçu = KO rogue →
`class_code {0, 2}`, silahta `kind {70, 71}`.

### KRİTİK ALANI KAYNAKTA YOKTUR
`items_server` içinde kritik şansı/hasarı KOLONU BULUNMUYOR. §12/§36'daki crit
yasağı bu yüzden kaynakla da tutarlıdır — bir şeyi "kaldırmadık", hiç yoktu.

---

## 2. SOURCE FACT / PROJECT LEGACY AYRIMI

| Konu | Kaynak | Project Legacy kararı |
|---|---|---|
| **item sınıfı (rarity)** | **KOLON YOK** | `itemClass` authoritative alan olarak EKLENDİ (§1) |
| **silahta primary stat** | **VAR** — 2505 yayın 208'inde `dex_bonus`, 197'sinde `str_bonus` ≠ 0 | **BİLEREK KULLANILMIYOR** (§3). Her tanımda `droppedSourceFields` ile işaretli |
| silah `damage` | var | aynen kullanılır (SOURCE FACT) |
| zırh `ac` | var | aynen kullanılır (SOURCE FACT) |
| silah elementali | var | kullanılır + üst sınıflarda TUNING olarak eklenir |
| `req_level` | var | uygulanır |
| `req_str/dex/int` | var (yaylarda `req_dex` 56–88) | **UYGULANMADI — deferred**, bkz. §22 |
| item adları | placeholder (`[Bow]`) | Türkçe Project Legacy kimliği verildi |
| set kimliği | yok | `setId` alanı eklendi, **bonus İMPLEMENTE EDİLMEDİ** (§31) |

> **Bu bir çıkarım hatası değil, açık bir tasarım sapmasıdır.** Kaynakta bir
> alanın bulunması Project Legacy iteminde kullanıldığı anlamına gelmez (§2).

---

## 3–4. ItemDefinition / ItemInstance (§23)

```ts
ItemDefinition {                    // "bu item NEDİR" — TEK KOPYA, DEĞİŞMEZ
  definitionRef          // = envanterdeki itemRef (ayrı kimlik uzayı YOK)
  displayName, itemClass, category, equipSlot
  allowedClasses[], requiredLevel
  stackable: false                  // ekipman ASLA yığılmaz (§24)
  setId                             // §31 hazırlık, bonus YOK
  baseItemRef                       // §8/§14 upgrade hazırlığı
  source: ItemSourceFacts           // items_server'dan OKUNAN gerçekler
  droppedSourceFields[]             // kaynakta olup KULLANILMAYANLAR
  stats                             // kategoriye göre tip
}

ItemInstance (ana InventoryState)  // "oyuncunun sahip olduğu TEK PARÇA"
  instanceId, itemRef, quantity, upgradeLevel, locked, equippedSlot
```

**Statlar instance'a KOPYALANMAZ** — her okuma definition üzerinden çözülür.

### Silah primary stat yasağı DERLEYİCİ garantisidir

```ts
interface WeaponStats { attack; elemental; special; maxHp; maxMp; resist }
//  ↑ str / dex / int / sta ALANI HİÇ YOK → silaha yazmak DERLEME HATASI
```

Aynı şekilde hiçbir stat bloğunda `criticalChance` / `criticalDamage` alanı
yoktur. Testler ayrıca çözülmüş katkıyı ve tüm anahtarları tarar.

---

## 5. BEŞ SINIF / RENK (§1/§25)

| Sınıf | Etiket | Renk |
|---|---|---|
| LOW | Sıradan | BEYAZ `#e8e0d0` |
| MIDDLE | İyi | YEŞİL `#7fa85c` |
| HIGH | Üstün | MAVİ `#6f8fd0` |
| RARE | Nadir | MOR `#a06fd0` |
| UNIQUE | Eşsiz | TURUNCU `#e08a3c` |

Domain yalnız `ItemClass` taşır; renk eşlemesi **tek yerdedir**
(`ITEM_CLASS_COLOR`) ve yalnız sunum katmanı okur.

---

## 6. ON İKİ EQUIPMENT SLOTU (§22)

`weapon · helmet · chest · pants · gloves · boots · earring1 · earring2 ·
ring1 · ring2 · necklace · belt`

İki küpe ve iki yüzük AYRI slottur; aynı tipte ikinci item boş olan slota,
ikisi de doluysa ilkine (swap) gider.

---

## 7–9. Katalog (§27–§30)

**5 yay — her sınıftan bir örnek:**

| Ad | Sınıf | atk | Elemental / özel |
|---|---|---:|---|
| Meşe Yay | LOW | 12 | — |
| Avcı Yayı | MIDDLE | 20 | — |
| Çelik Tendon Yay | HIGH | 28 | fire 12 |
| Akrep Dişi Yayı | RARE | 31 | **poison 50** (KAYNAKTAN) |
| Karanlık Yemin | UNIQUE | 34 | ice 18 · lightning 10 · hpDrain 6 · mpDrain 4 · HP 60 · MP 40 · r-ice 10 |

**11 zırh** — 5 parçalık BEYAZ başlangıç seti + YEŞİL/MAVİ/MOR örnekleri.
Hepsinde ana stat DEFENSE; üst sınıflarda DEX / HP / direnç.

**6 aksesuar** — 2 küpe · 2 yüzük · 1 kolye · 1 kemer. Arketipler: DEX odaklı
(Şahin Küpesi), HP odaklı (Yaşam Kuşağı), dengeli (Zümrüt Yüzük), UNIQUE
(Kızıl Ejder Muskası). **Hiçbirinde Crit yok**, hiçbirinde defense yok.

Tüm `definitionRef` değerleri gerçek drop havuzundaki kaynak itemlerdir →
drop → equip zinciri uçtan uca çalışır.

---

## 10–11. Yasak testleri

- **§35 silah primary stat:** 5 silahın 5'inde `str/dex/int/sta = 0`; stat
  bloğunda bu anahtarlar HİÇ YOK. UNIQUE silah dahil.
- **§36 crit:** 22 tanımın stat ağacı özyinelemeli tarandı — `/crit/i` eşleşen
  **0** alan.

---

## 12–13. Equip akışı ve resolver

```
inventory instance seç
  → envanterde var mı?          notFound
  → katalogda tanım var mı?     noDefinition      (uydurma item kuşanılmaz)
  → sınıf izinli mi?            wrongClass
  → seviye yeterli mi?          levelReq
  → slot tipi uyumlu mu?        slotMismatch / noSlot
  → PLAN                        (hiçbir mutasyon YOK)
  → UYGULA: ana EquipmentState'in ATOMİK swap'i
       yeni item çantadan çıkar → eski item çantaya döner (net 0)
  → derived stat RECOMPUTE
```

`ArcherBuildResolver` (`CharacterStats`'tan türer, yalnız `equipmentStats()`'i
ezer) **tek authority**'dir. Scene, UI ve Inventory stat hesaplamaz.

**Drift imkânsız:** hiçbir mutable sayıya ekleme/çıkarma yapılmaz; her çağrıda

```
total = base(level) + Σ (kuşanılı tanımların statları)
```

sıfırdan hesaplanır.

---

## 14. Drift testi sonucu (§33)

Tam takım (silah + 2 RARE zırh + 6 aksesuar) kuşanıldı, **100 kez** silah
equip/unequip yapıldı. Sonuç: `JSON.stringify(build())` başlangıçla **birebir
aynı**, `player.maxHp` ve `maxMp` değişmedi.

---

## 15–16. Silah elementali ve POISON ≠ DoT

Kaynakta silah elementalinin combat entegrasyonu **DOĞRULANAMADI**: kolonlar
var, ama ana oyunun hasar yolunda hiçbir tüketicisi yok. Bu yüzden minimum bir
adaptör yazıldı ve **PROJECT LEGACY V1 TUNING** olarak etiketlendi:

- elemental RELEASE anında kilitlenir (çok-ok geometrisiyle aynı an),
- IMPACT'te **ayrı bir bileşen** olarak uygulanır,
- `ImpactEvent` alanları: `physicalDamage` · `elementalDamage` (skill) ·
  **`weaponElementalDamage`** · `weaponElemental{fire,ice,lightning,poison}`.

Ölçülen:

| Yay | fiziksel | silah elementali | toplam | yapışan status | DoT tiki |
|---|---:|---:|---:|---:|---:|
| Meşe Yay (LOW) | 136 | 0 | 136 | 0 | 0 |
| Akrep Dişi Yayı (RARE) | 154 | **50** | 204 | **0** | **0** |
| Karanlık Yemin (UNIQUE) | 157 | **28** | 185 | **0** | **0** |

**Silah zehri bir HASAR BİLEŞENİDİR** — status üretmez, tik atmaz. Aynı testte
zehir SKİLLİ kullanıldığında DoT sistemi ayrıca çalışır ve **4 tik** atar
(P1.6.1 ile aynı). İki sistem birbirine karışmaz.

---

## 17. İki identical item (§34)

Aynı `definitionRef`'ten iki instance: `instanceId` farklı, `quantity` her
ikisinde 1 (yığılmaz). Biri kuşanıldığında diğeri çantada kalır; unequip
sonrası her iki kimlik de korunur, kopya/silme yok.

---

## 18–19. Uçtan uca zincir

- **§38 Auto Loot ON:** mob kill → drop → gerçek envanter instance'ı →
  `equipService.equip()` → türetilmiş statlar değişir. Testte drop havuzundan
  kuşanılabilir katalog itemi düşene kadar farm edilir.
- **§39 Auto Loot OFF:** ekipman yere düşer → manuel toplama (70 birim) →
  envanter instance → equip → `attack` tam olarak yayın attack'ı kadar artar.

Ekran görüntüsüyle doğrulandı: yerdeki **Akrep Dişi Yayı +0** için tooltip
`Nadir · Sv 1 · weapon / Saldırı 31 / poison hasarı +50` gösteriyor —
**crit satırı yok, random roll satırı yok** (§26).

---

## 20. Örnek katalog build çıktısı

Tam takım kuşanıldığında (`npm run telemetry:items`):

| Stat | taban | ekipman | toplam |
|---|---:|---:|---:|
| Attack | 140 | +34 | 174 |
| Defense | 0 | +97 | 97 |
| DEX | 0 | +49 | 49 |
| STA | 0 | +52 | 52 |
| Max HP | 1086 | +550 | **1636** |
| Max MP | 474 | +200 | **674** |

Direnç `{fire 18, ice 22, lightning 0, poison 16}` · silah elementali
`{ice 18, lightning 10}` · özel `{hpDrain 6, mpDrain 4}`.
`player.maxHp` gerçekten 1086 → 1636 oldu.

---

## 21. COMBAT ENTEGRASYON VERDICT

| Stat | Durum | Yol |
|---|---|---|
| **Attack** | ✅ ENTEGRE | `CombatSystem.playerAttack()` → gerçek hasar (test: LOW yay > yaysız, UNIQUE > LOW) |
| **Defense** | ✅ ENTEGRE | `CombatSystem.playerDefense()` → mob hasarını azaltır |
| **Max HP / Max MP** | ✅ ENTEGRE | `PlayerState.maxHp/maxMp` → `finalStats()` |
| **Silah elementali** | ✅ ENTEGRE (V1 TUNING) | impact'te AYRI bileşen; kaynakta entegrasyon doğrulanamadı |
| **DEX / STR / INT** | ⚠️ **ENTEGRE DEĞİL** | Ana hasar formülünde `dex` KULLANILMIYOR (yalnız envanter ekranında gösteriliyor). §20 gereği **yeni formül UYDURULMADI**; türetilmiş stat olarak taşınıyor |
| **Dirençler** | ⚠️ **ENTEGRE DEĞİL** | `StatBlock`'ta direnç alanı YOK, combat'ta elemental azaltma yolu YOK. Yeni mitigation formülü UYDURULMADI |

---

## 22. ÇÖZÜLEMEYEN / ERTELENEN KAYNAK SEMANTİKLERİ

- **`req_str` / `req_dex` / `req_intel` — NOT VERIFIED / deferred.** Kaynakta
  yaylar `req_dex` 56–88 ister; Project Legacy karakterinin taban DEX'i 0 ve
  ekipman DEX'i tek hanelidir. İki ölçek uyuşmadığı için stat gereksinimi
  UYGULANMADI. Kaynak değerleri `source` içinde taşınmaya devam ediyor.
- **Silah elementalinin KO combat semantiği** — kaynakta tüketici yok; V1
  adaptörü PROJECT LEGACY TUNING olarak etiketlendi.
- **`mirror_damage`, `curse_r`, `magic_r`, `cha_bonus`** — Project Legacy stat
  modelinde karşılığı yok; taşınmadı.
- **Aşırı değerli satırlar** (`ac` max 65535, `max_mp_bonus` min −26624,
  `fire_r` max 22888) tablonun bazı bölgelerinde çıkarım gürültüsü olduğunu
  gösteriyor; katalog yalnız whitelist'teki doğrulanmış satırları kullanır.

---

## 23. Değişen dosyalar

**YENİ:** `data/item-model.ts` · `data/item-catalog.ts` ·
`world/BuildResolver.ts` · `world/EquipService.ts` · `tools/item-telemetry.ts`

**DEĞİŞEN:** `world/CombatPipeline.ts` (projectile `weaponElemental`) ·
`world/WorldCombatAdapter.ts` (ayrı elemental bileşen + provider) ·
`state.ts` (resolver + equip servisi + DEV gear) ·
`scenes/WorldPrototypeScene.ts` (build paneli, item tooltip, sınıf renkleri,
DEV düğmesi) · `tests/run.ts`

---

## 24. P1.8'DE YAPILMAYANLAR (§42)

Upgrade · başarı şansı · item kırılması · örs · scroll NPC · scroll/coin
fiyatlandırma · Trina · aksesuar birleştirme · +1/+8 stat eğrileri · rebirth ·
reduce · enchant scroll · elemental scroll · random affix · random roll ·
Crit item · set bonusu · market · trade · dayanıklılık · transmog · 3D zırh.
