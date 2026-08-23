# MP ÖLÇEĞİ — KAYNAK ARAŞTIRMASI ve ÖNERİ

**Durum:** yalnız ARAŞTIRMA ve ÖNERİ. **Hiçbir dosya değiştirilmedi**, maxMP
artırılmadı. Kaynak: `reference/KO_Reference_v8.db` (doğrudan sorgulandı,
22 Ağu 2026).

---

## 1. SORUNUN CEVABI: KAYNAK BU FORMÜLÜ İÇERMİYOR

**Archer/Rogue MP'sinin level ve statlarla nasıl ölçeklendiği bu DB'den
TÜRETİLEMEZ.** Sebep tek bir eksik tablo:

```
source_tables.LEVEL_UP
  extraction_status : not_confirmed_in_sql_backup
  purpose           : "Previously assumed leveling table; exact LEVEL_UP
                       object name was not found in this SQL backup"
```

`LEVEL_UP` KO'da sınıf × seviye başına HP/MP/stat kazanımını tutan tablodur.
Yedekte bulunamamış.

Kontrol ettiğim diğer bütün yollar da kapalı:

| aday | bulgu |
|---|---|
| `level_exp` (80 satır) | YALNIZ EXP (`Player_experience.tbl`). HP/MP yok. |
| `s_mp_point` | Yalnız `monsters` / `npcs` / `entity_catalog_raw_v3` — **oyuncu değil** |
| `magic_type4.max_mp` / `max_mp_pct` | 41 kaydın hepsinde `1 / 1` (nötr çarpan; `max_hp_pct = 100` = değişim yok) → additive MP yok |
| `magic_type6.max_hp/max_mp` | dönüşüm efektleri, oyuncu taban havuzu değil |
| oyuncu stat tablosu | DB'de **yok** |

Projenin kendi kodu da bunu zaten kabul ediyor:
`StatCalculator.baseStats()` → *"Seviyeden gelen taban blok (config; **kaynak
DB'de oyuncu statı yok**)"*.

> **Bu yüzden L1 / L30 / L60 / L70 / L80 için "kaynak doğrulanmış MP havuzu"
> ÜRETMİYORUM.** Aşağıdaki bant bir ÇIKARIMDIR ve öyle etiketlenmiştir.

---

## 2. KAYNAKTAN DOĞRULANAN DOLAYLI KANITLAR

### 2.1 Sınıf stat kapısı — NET (SOURCE FACT)

`items_server.req_intel` / `req_dex` dağılımı:

| kind | ne | kayıt | req_dex | req_intel |
|---|---|---|---|---|
| 220 | **Rogue zırhı** | 4275 | **≤ 194** | **0** |
| 70 | **Yay** | 2504 | **≤ 236** | 0 |
| 71 | Crossbow | 947 | ≤ 224 | 0 |
| 11 | Dagger | 2954 | ≤ 236 | ≤ 56 (11 istisna) |
| 230 | Mage zırhı | 4275 | 0 | **≤ 160** |
| 240 | Priest zırhı | 4274 | 0 | **≤ 194** |
| 110 | Staff | 3635 | 0 | **≤ 178** |

**Sonuç: Archer/Rogue bir DEX sınıfıdır; INT mage/priest statıdır.**
KO'da okçunun MP'si INT'e bağlı DEĞİLDİR — bu, "MP statlarla nasıl ölçeklenir"
sorusunun okçu için doğrulanmış cevabıdır: **ölçeklenmez.**

### 2.2 Ekipmandan gelen MP (SOURCE FACT)

`items_server.max_mp_bonus` — 996 item taşıyor. Aralık **+10 … +525**,
yoğun kademeler 50 / 100 / 150 / 200 / 250.

| slot ailesi | MP taşıyan | ortalama | tavan |
|---|---|---|---|
| Sınıf zırhı (210/220/230/240) | ~20/4285 | +25 | +60 |
| Yay (70) | 44/2506 | +190 | **+400** |
| Staff (110) | 134/3738 | +186 | **+500** |
| Pendant (92) | 126/1653 | +146 | **+525** |
| Ring (93) | 92/1644 | +90 | +350 |
| Earring (91) | 52/1613 | +61 | +250 |
| Belt (94) | 56/2189 | +84 | +175 |

Dikkat: **zırh neredeyse hiç MP vermiyor ve sınıfa göre farklılaşmıyor.**
MP silah ve takılarda.

Tipik kuşanmış okçu: `190 + 146 + 2×90 + 2×61 + 84` ≈ **+722 MP**
Max-roll tavan: ≈ **+2600 MP**

### 2.3 İksir aileleri (P1.4.1'de doğrulanmıştı)

| | miktarlar | fiyatlar | MP başına fiyat |
|---|---|---|---|
| HP | 90 · 180 · 360 · 720 | 160 · 600 · 2000 · 7000 | 1.78 → 9.72 |
| MP | 120 · 240 · 480 · 960 · 1920 | 160 · 600 · 2000 · 7000 · 15000 | 1.33 → 7.81 |

MP başına fiyat kademe yükseldikçe **artıyor** → klasik "kolaylık primi";
bütün kademelerin bir arada kullanılması tasarlanmış.

**Kritik okuma:** iksir aileleri BÜTÜN sınıflara hizmet eder. HP tavanı 720
büyük-HP'li warrior için, MP tavanı 1920 büyük-MP'li **mage** içindir.
§2.1'deki kapı mantığıyla birlikte: **1920 bir MAGE iksiridir, okçu iksiri
değildir.** Okçunun çalışma kademeleri alt/orta sıradır.

### 2.4 Archer skill MP eğrisi (SOURCE FACT)

| açılış lv | MP | skill |
|---|---|---|
| 0 | 15 | Through Shot |
| 3 | 0 | Archery |
| 5 / 10 | 10 | Fire / Poison Arrow |
| 15 / 20 | 40 | Multiple Shot / Guided Arrow |
| 25 | 70 | Perfect Shot |
| 30 / 35 | 30 | Fire / Poison Shot |
| 40 | 100 | Arc Shot |
| 45 / 50 | 50 | Explosive Shot / Viper |
| 55 | 150 | Arrow Shower |
| 60 | 250 | Shadow Hunter |
| 70 | **300** | Dark Pursuer |

---

## 3. ÇIKARIM BANDI (kaynak değil — açıkça işaretli)

İki bağımsız yoldan:

**(a) Ekipman payı.** Kuşanma ~700 (tipik) … ~2600 (max-roll) MP veriyor.
Ekipmanın *bonus* olması için (havuzun tamamı olmaması için) seviyeden gelen
taban da benzer büyüklükte olmalı → L70 tabanı **~700–1500**, toplam
**~1400–2500**.

**(b) İmza skill maliyeti.** 300 MP'lik Dark Pursuer'ın dolu barda 6–8 kez
atılabilmesi bekleniyorsa toplam havuz **~1800–2400**.

**İki yol örtüşüyor → kuşanmış L70 okçu için makul MP bandı ≈ 1500–2500.**
Bu bir TASARIM ÇIKARIMIDIR; KO formülü değildir.

---

## 4. PROJECT LEGACY'NİN ŞU ANKİ ÖLÇEĞİ

```ts
// src/game/config.ts (PLAYER)
baseHp: 120,  hpPerLevel: 14
baseMp:  60,  mpPerLevel:  6
mpRegenPerSec: 4
```

| lv | maxHP | maxMP | MP/HP | 300 MP skill | 740 MP rotasyon | +120 | +240 | +480 | +960 | +1920 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 120 | 60 | 0.50 | 0.2 | 0.08× | 100% | 100% | 100% | 100% | 100% |
| **20** | **386** | **174** | 0.45 | 0.6 | 0.24× | 69% | 100% | 100% | 100% | 100% |
| 30 | 526 | 234 | 0.44 | 0.8 | 0.32× | 51% | 100% | 100% | 100% | 100% |
| 60 | 946 | 414 | 0.44 | 1.4 | 0.56× | 29% | 58% | 100% | 100% | 100% |
| **70** | **1086** | **474** | 0.44 | **1.6** | **0.64×** | 25% | 51% | 100% | 100% | 100% |
| 80 | 1226 | 534 | 0.44 | 1.8 | 0.72× | 22% | 45% | 90% | 100% | 100% |

### 4.1 ASIL KÖK NEDEN — eğri tasarım aralığının DIŞINDA kullanılıyor

```ts
LEVELING.maxLevel = 20   // "MVP seviye tavanı"
PROTO.startLevel  = 70   // prototip karakteri
```

Bu eğri **20 seviyelik bir MVP için** tasarlandı. Prototip karakteri seviye
70'e ZORLANIYOR — yani eğri tasarım aralığının **3.5 katı** ötesine
uzatılıyor.

L20'de sayılar kendi içinde tutarlı: MP 174, o seviyede açık en pahalı skill
Guided Arrow 40 MP → **4.3 cast**. Sorun yok.

**"L70'te 474 MP" bir denge kararı değildir; aralık dışı ekstrapolasyondur.**
Bu yüzden `mpPerLevel`'i yamamak semptomu tedavi eder, hastalığı değil.

---

## 5. ÖNERİ

### 5.1 Önce karar: seviye tavanı ne?

`LEVELING.maxLevel` 20 mi kalacak, KO'nun 80'ine mi gidecek?
- **20 kalacaksa:** MP ölçeğinde sorun YOK. Okçunun çalışan iksirleri 120 ve
  240'tır; 480+ zaten mage kademesidir (§2.3). Yapılacak tek şey prototipin
  `startLevel = 70` kısayolundan vazgeçmesi.
- **80'e gidilecekse:** HP/MP/attack eğrilerinin tamamı yeniden tasarlanmalı —
  bu `mpPerLevel` yaması değil, bir eğri pass'idir.

### 5.2 80 tavanı için aday eğriler

| seçenek | hp/lv · mp/lv | L30 HP/MP | L60 HP/MP | L70 HP/MP | L80 HP/MP | MP/HP | 300 cast | 740 rot |
|---|---|---|---|---|---|---|---|---|
| **A** MP-only | 14 · **30** | 526/930 | 946/1830 | 1086/**2130** | 1226/2430 | **1.96** | 7.1 | 2.9× |
| **B1** dengeli | **40** · **20** | 1280/640 | 2480/1240 | 2880/**1440** | 3280/1640 | 0.50 | 4.8 | 1.9× |
| **B2** dengeli | 45 · 26 | 1425/814 | 2775/1594 | 3225/**1854** | 3675/2114 | 0.57 | 6.2 | 2.5× |
| **B3** dengeli | 38 · 18 | 1222/582 | 2362/1122 | 2742/**1302** | 3122/1482 | 0.47 | 4.3 | 1.8× |

İksir kademelerinin L70'te anlamı:

| seçenek | maxMP | +120 | +240 | +480 | +960 | +1920 |
|---|---|---|---|---|---|---|
| A | 2130 | 6% | 11% | 23% | 45% | 90% |
| **B1** | **1440** | **8%** | **17%** | **33%** | **67%** | **100%** |
| B2 | 1854 | 6% | 13% | 26% | 52% | 104% |
| B3 | 1302 | 9% | 18% | 37% | 74% | 100%+ |

### 5.3 Tavsiyem: **B1** (`hpPerLevel 40`, `mpPerLevel 20`)

Gerekçeler:
1. **İksir progression'ı birebir oturuyor:** 8 / 17 / 33 / 67 / **100%**.
   Kademeler tam ikiye katlanıyor ve **1920 tam olarak bir dolu bar** —
   yani "mage/acil durum iksiri" rolü sayıyla doğrulanıyor.
2. **MP/HP = 0.50** → okçu kimliği korunuyor (§2.1: DEX sınıfı, INT değil).
   A seçeneği MP'yi HP'nin 2 katına çıkarıyor; bu kaynakla çelişir → **elendi.**
3. **740 MP'lik rotasyon dolu barda ~1.9 kez** dönüyor: sert burst, sonra kuru.
   P1.3'te bulunan "rotasyon tek sefer bile tamamlanamıyor" sorunu çözülür ama
   spam da olmaz.
4. Çıkarım bandının (1500–2500) alt ucunda; ekipman MP'si (+722 tipik)
   eklenince **1440 + 722 ≈ 2160** ile bandın ortasına oturur.

Zayıf yanı: 300 MP'lik Dark Pursuer dolu barda **4.8 cast**. Bir Lv70 imza
skilli için savunulabilir; kabul edilmezse B2'ye (6.2 cast) geçilir, karşılığında
alt iksir kademeleri anlamsızlaşır (+120 = %6).

### 5.4 Yan etki: MP REGEN de ölçeklenmeli

`mpRegenPerSec = 4` şu an barın **%0.84/sn**'si. B1'de aynı 4 değeri
**%0.28/sn**'ye düşer (dolu bar 360 sn).

Aynı doluluk hızını korumak için: **`mpRegenPerSec ≈ 12`** (1440 / 120 sn).
Bilinçli olarak düşük bırakılırsa iksirler zorunlu hale gelir — bu da geçerli
bir tasarım kararıdır ama **açıkça seçilmelidir**, kazara olmamalıdır.

### 5.5 Blast radius uyarısı

B1, HP'yi L70'te **1086 → 2880 (2.65×)** çıkarır. Bu ana `src/game/config.ts`
dosyasını ve dolayısıyla Faz 6.1'i etkiler; ayrıca şunları yeniden ölçmeyi
gerektirir:

- `BalanceProfile.monsterDamageMultiplier` (prototipte 8)
- `BalanceProfile.monsterHpMultiplier` (prototipte 8)
- `COMBAT.playerAttackPerLevel = 2` ve `defenseFactor = 0.1`
- mob HP havuzları / kill süreleri
- HP iksirlerinin anlamı (720, 2880 barın %25'i olur)

### 5.6 Önerdiğim uygulama yolu (P1.4.1 ile aynı disiplin)

`src/` doğrudan değiştirilmesin. Önce **prototipe özel bir stat profili**
açılsın — tıpkı `data/ko-potions.ts`'in ana `consumable-behaviors.ts`'i
ezmeden KO iksirlerini getirdiği gibi:

```
experiments/eternal-ko-prototype/data/archer-stat-profile.ts
    baseHp / hpPerLevel / baseMp / mpPerLevel / mpRegenPerSec
    → PrototypeState bunu kullanır, ana CharacterStats DEĞİŞMEZ
```

Sonra ölç (rotasyon başına cast, iksir tüketimi/dakika, kill süresi), telefonda
oyna, **sonra** `src/`'ye terfi kararı ver.

---

## 6. ÖZET

| soru | cevap |
|---|---|
| KO'da okçu MP'si level ile nasıl ölçekleniyor? | **Kaynakta YOK** — `LEVEL_UP` yedekte bulunamamış |
| Statlarla nasıl ölçekleniyor? | Okçu için **ölçeklenmiyor**: rogue/yay `req_dex`, INT mage/priest statı (SOURCE) |
| L1/30/60/70/80 beklenen havuz? | **Kaynak doğrulamalı değer üretilemez.** Çıkarım bandı: kuşanmış L70 için ~1500–2500 |
| 1920'lik iksir okçu için mi? | **Hayır** — mage kademesi. Okçunun çalışan kademeleri alt/orta sıra |
| Şu anki 474 neden düşük? | Denge kararı değil: 20-seviye MVP eğrisi L70'e ekstrapole ediliyor |
| Öneri | Önce seviye tavanına karar; 80 ise **B1** (`hp/lv 40`, `mp/lv 20`, `mpRegen ≈ 12`), prototip stat profili üzerinden ölçülerek |

**Hiçbir değer değiştirilmedi.**
