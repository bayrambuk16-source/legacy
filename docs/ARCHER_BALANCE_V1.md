# ARCHER COMBAT BALANCE V1 — P1.3

**Kapsam:** yalnız gameplay/domain combat balance. Görsel pipeline, atlas, 3D,
renderer, kamera, world art, equipment visual, Faz 7 ve ana Faz 6.1 dengesi
**DEĞİŞMEDİ**.

---

## 1. SOURCE FACT / PROJECT LEGACY TUNING AYRIMI

Tek otorite: `experiments/eternal-ko-prototype/data/archer-balance.ts`.
Her alan iki sınıftan birindedir; ikisi asla karışmaz.

### 1.1 SOURCE FACT — KO_Reference_v8.db'den OKUNDU (22 Ağu 2026 sorgusu)

| alan | tablo | kullanım |
|---|---|---|
| `add_damage` | magic_type2 | `physicalCoefficient = add_damage / 100` |
| `need_arrow` | magic_type2 | projectile sayısı (1 / 3 / 5) |
| `hit_type` | magic_type2 | HAM saklanır — davranış üretmez |
| `hit_rate` | magic_type2 | HAM saklanır — davranış üretmez |
| `add_range` | magic_type2 | 14 kayıtta da 100 → ayrım üretmez |
| `first_damage` | magic_type3 | ateş oranının kaynağı (mutlak değer KULLANILMADI) |
| `time_damage` | magic_type3 | zehir oranının kaynağı (mutlak değer KULLANILMADI) |
| `duration` | magic_type3 | ham 20 — **birimi ÇÖZÜLMEDİ** |
| `attribute` | magic_type3 | 1 = ateş, 6 = zehir |
| `mana_cost` · `skill_level` | skills | doğrudan |
| `recast_time` | skills | `individualCooldown = recast_time / 10` |
| `range_value` | skills | 15 kayıtta da 0 → menzil ayrımı ÜRETMEZ |
| `cast_time` | skills | ham 13 / 15 — **birimi ÇÖZÜLMEDİ**, kullanılmadı |

### 1.2 PROJECT LEGACY TUNING — KO'dan GELMEZ

| değer | karar | gerekçe |
|---|---|---|
| cast range | **340** (15 skilde de aynı) | kaynak `range_value = 0`, `add_range = 100` sabit → kaynak ayrım üretmiyor |
| Standart Atış katsayısı | **1.00** | 102003'ün `magic_type2` KAYDI YOK; "normal atış = %100" bir proje kararıdır |
| ateş bonusu | 0.25 / 0.50 / 0.75 | KO'nun 1 : 2 : 3 ORANI korundu, mutlak rakamı DEĞİL |
| zehir DoT TOPLAM | 0.30 / 0.60 / 0.90 | aynı gerekçe |
| zehir süresi / tick | 4.0 s / 1.0 s | kaynak `duration = 20` birimi çözülmedi |
| spread açıları | **3'lü ±5°** · 5'li ±8° | kaynakta yok; 3'lü ±5° P1.3.1'de canonical oldu (önce ±4) |
| action time | 0.70 – 1.10 s | ayrı sistem (`archer-timing.ts`); bu görevde DEĞİŞTİRİLMEDİ |
| collision mode | `targetOnly` | kaynak yan-isabeti doğrulamıyor |

---

## 2. 15 SKİLL FINAL V1 TABLOSU

| skill | KO | ref | Lv | MP | ind. CD | action | range | phys | ok | element | elem | DoT total | hit_type | hit_rate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Standart Atış | Archery | 102003 | 1 | 0 | 0.0s | 1.10s | 340 | 1.00 | 1 | none | 0.00 | 0.00 | — | — |
| Delici Ok | Through Shot | 107500 | 3 | 15 | 0.0s | 0.75s | 340 | 1.50 | 1 | none | 0.00 | 0.00 | 0 | 100 |
| Kor Oku | Fire Arrow | 107505 | 5 | 10 | 3.2s | 0.75s | 340 | 1.00 | 1 | fire | 0.25 | 0.00 | 0 | 100 |
| Zehirli Uç | Poison Arrow | 107510 | 10 | 10 | 3.2s | 0.75s | 340 | 1.00 | 1 | poison | 0.00 | 0.30 | 0 | 100 |
| Üçlü Salvo | Multiple Shot | 107515 | 15 | 40 | 0.0s | 0.70s | 340 | 0.99 | 3 | none | 0.00 | 0.00 | 0 | 100 |
| İzci Oku | Guided Arrow | 107520 | 20 | 40 | 0.0s | 0.75s | 340 | 1.00 | 1 | none | 0.00 | 0.00 | 2 | 100 |
| Keskin Atış | Perfect Shot | 107525 | 25 | 70 | 0.0s | 0.80s | 340 | 2.00 | 1 | none | 0.00 | 0.00 | 0 | 150 |
| Alev Atışı | Fire Shot | 107530 | 30 | 30 | 4.2s | 0.80s | 340 | 1.00 | 1 | fire | 0.50 | 0.00 | 0 | 100 |
| Toksik Atış | Poison Shot | 107535 | 35 | 30 | 4.2s | 0.80s | 340 | 1.00 | 1 | poison | 0.00 | 0.60 | 0 | 100 |
| Yırtıcı Ok | Arc Shot | 107540 | 40 | 100 | 0.0s | 0.85s | 340 | 2.50 | 1 | none | 0.00 | 0.00 | 0 | 100 |
| Patlayıcı Ok | Explosive Shot | 107545 | 45 | 50 | 4.2s | 0.85s | 340 | 1.00 | 1 | fire | 0.75 | 0.00 | 0 | 100 |
| Engerek Oku | Viper | 107550 | 50 | 50 | 4.2s | 0.85s | 340 | 1.00 | 1 | poison | 0.00 | 0.90 | 0 | 100 |
| Beşli Salvo | Arrow Shower | 107555 | 55 | 150 | 0.0s | 0.80s | 340 | 0.99 | 5 | none | 0.00 | 0.00 | 0 | 100 |
| Gölge Avcısı | Shadow Hunter | 107560 | 60 | 250 | 0.0s | 0.85s | 340 | 2.50 | 1 | none | 0.00 | 0.00 | 2 | 100 |
| Kara Takip | Dark Pursuer | 108570 | 70 | 300 | 0.0s | 0.90s | 340 | 2.50 | 1 | none | 0.00 | 0.00 | 2 | 300 |

> `phys` çok-oklu skillerde **OK BAŞINA** katsayıdır. Toplam hasar `damage × N`
> DEĞİLDİR — her ok ayrı hit/miss üretir.

---

## 2.1 P1.3.1 — DÖRT CORRECTNESS DÜZELTMESİ (22 Ağu 2026)

| # | değişiklik | sınıf | not |
|---|---|---|---|
| 1 | Standart Atış açılış seviyesi 3 → **1** | TUNING | kaynak `skill_level = 3` AYNEN duruyor |
| 2 | Delici Ok açılış seviyesi 0 → **3** | TUNING | kaynak `skill_level = 0` AYNEN duruyor |
| 3 | Üçlü Salvo spread ±4° → **±5°** | TUNING | Beşli ±8° DEĞİŞMEDİ |
| 4 | Training Dummy → **SONSUZ MP** toggle | TEST ARACI | varsayılan KAPALI |

**Seviye ezmeleri nasıl uygulanıyor:** `SkillRegistry` seviyeyi kaynaktan alır ve
bu doğru davranıştır. Ezme `experiments/.../state.ts` içinde, kayıttan SONRA,
`ARCHER_BALANCE[ref].tuning.requiredLevelOverride` okunarak uygulanır. Kaynak DB
ve generated JSON'a **dokunulmadı**; `balanceRow()` iki değeri de ayrı taşır
(`sourceRequiredLevel` / `requiredLevel`), BALANCE tablosunda ezmeli satırlar
`Lv*` ile işaretlidir.

**SONSUZ MP mana kapısını KALDIRMAZ.** `SkillSystem`'in gerçek mana yolu aynen
çalışır (harcama + `mana` reddi); toggle yalnız her karede MP'yi tavana doldurur.
Amaç 740 MP'lik rotasyonu MP tavanına (474) takılmadan ölçebilmek.

P1.3 hasar katsayılarının hiçbirine dokunulmadı — test ile korunuyor
(`P1.3 HASARLARINA DOKUNULMADI`).

---

## 3. DEĞİŞENLER

### 3.1 3'lü / 5'li — KO fidelity pass
| | önce (P1) | sonra (P1.3) |
|---|---|---|
| Üçlü Salvo | 0.75 / ok | **0.99 / ok** (= source `add_damage 99`) |
| Beşli Salvo | 0.62 / ok | **0.99 / ok** |
| cast range | 340 / 360 | **340 / 340** |
| individual CD | 0 | 0 (değişmedi) |
| spread | önce ±4° / ±8° | **şimdi ±5° / ±8°** (3'lü P1.3.1'de değişti; 5'li aynı) |
| geometri | ok başına hit/miss | değişmedi |

### 3.2 Ateş
| | önce | sonra |
|---|---|---|
| Kor Oku | 0.55 | **0.25** |
| Alev Atışı | 1.10 | **0.50** |
| Patlayıcı Ok | 1.65 | **0.75** |

### 3.3 Zehir — semantik değişti
Önceki değerler **tick BAŞINAYDI** (0.35 / 0.70 / 1.05 → 4 tick'te toplam
1.40 / 2.80 / 4.20). Artık **TOPLAM** katsayıdır ve 4 tick'e deterministik
bölünür:

| skill | DoT TOPLAM | tick başına |
|---|---|---|
| Zehirli Uç | 0.30 | 4 × 0.075 |
| Toksik Atış | 0.60 | 4 × 0.15 |
| Engerek Oku | 0.90 | 4 × 0.225 |

### 3.4 Menzil
15 skilin tamamı **340**. Önce: çoğu 340, Beşli 360, Standart Atış 300
(temel saldırı menzili). Genie'nin hedef edinme yarıçapı (`attackRange`, 450)
BUNDAN AYRIDIR ve değişmedi.

---

## 4. TELEMETRİ — SMALL DUMMY

### Üçlü Salvo · Multiple Shot · 3 ok · 0.99/ok
| mesafe | hitbox r | ok | hedef isabet | ıska | katsayı/ok | toplam hasar |
|---|---|---|---|---|---|---|
| 100 | 26 | 3 | **3/3** | 0 | 0.99 | 446 |
| 200 | 26 | 3 | **3/3** | 0 | 0.99 | 446 |
| 300 | 26 | 3 | **1/3** | 2 | 0.99 | 138 |
| 335 | 26 | 3 | **1/3** | 2 | 0.99 | 138 |

### Beşli Salvo · Arrow Shower · 5 ok · 0.99/ok
| mesafe | hitbox r | ok | hedef isabet | ıska | katsayı/ok | toplam hasar |
|---|---|---|---|---|---|---|
| 100 | 26 | 5 | **5/5** | 0 | 0.99 | 731 |
| 200 | 26 | 5 | **3/5** | 2 | 0.99 | 446 |
| 300 | 26 | 5 | **3/5** | 2 | 0.99 | 446 |
| 335 | 26 | 5 | **3/5** | 2 | 0.99 | 446 |

### Üçlü Salvo ±5° — isabet sınırı taraması (Small Dummy, r 26)
| mesafe | hedef isabet |
|---|---|
| 260 | 3/3 |
| 265 | 3/3 |
| 270 | 3/3 |
| 275 | 3/3 |
| 280 | 3/3 |
| 285 | 3/3 |
| 290 | 3/3 |
| 295 | 3/3 |
| 300 | 1/3 |
| 305 | 1/3 |
| 310 | 1/3 |
| 315 | 1/3 |
| 320 | 1/3 |
| 325 | 1/3 |
| 330 | 1/3 |
| 335 | 1/3 |
| 340 | 1/3 |

**Sınır:** dış oklar 300 birimde kaçmaya başlıyor.
Geometrik beklenti: r / sin 5° = 26 / 0.08716 = 298.3 birim.

### BOSS DUMMY

### Üçlü Salvo · Multiple Shot · 3 ok · 0.99/ok
| mesafe | hitbox r | ok | hedef isabet | ıska | katsayı/ok | toplam hasar |
|---|---|---|---|---|---|---|
| 100 | 60 | 3 | **3/3** | 0 | 0.99 | 446 |
| 200 | 60 | 3 | **3/3** | 0 | 0.99 | 446 |
| 300 | 60 | 3 | **3/3** | 0 | 0.99 | 446 |
| 335 | 60 | 3 | **3/3** | 0 | 0.99 | 446 |

### Beşli Salvo · Arrow Shower · 5 ok · 0.99/ok
| mesafe | hitbox r | ok | hedef isabet | ıska | katsayı/ok | toplam hasar |
|---|---|---|---|---|---|---|
| 100 | 60 | 5 | **5/5** | 0 | 0.99 | 731 |
| 200 | 60 | 5 | **5/5** | 0 | 0.99 | 731 |
| 300 | 60 | 5 | **5/5** | 0 | 0.99 | 731 |
| 335 | 60 | 5 | **5/5** | 0 | 0.99 | 731 |

### ROTASYON: Beşli → Üçlü → Kara Takip → Gölge Avcısı

Oyuncunun MAKSİMUM MP'si: 474 — rotasyonun teorik maliyeti 740 MP.

### Small Dummy · mesafe 100 · başlangıç MP 474
| t (s) | skill | MP | ok | isabet | fiziksel | elemental | toplam | action lock | kalan MP |
|---|---|---|---|---|---|---|---|---|---|
| 0.00 | Arrow Shower | 150 | 5 | 5/5 | 731 | 0 | 731 | 0.80s | 324 |
| 0.80 | Multiple Shot | 40 | 3 | 3/3 | 474 | 0 | 474 | 0.70s | 284 |
| 1.50 | Dark Pursuer | — | — | REDDEDİLDİ (mana) | — | — | — | — | 284 |
| 1.50 | Shadow Hunter | 250 | 1 | 1/1 | 351 | 0 | 351 | 0.85s | 34 |

**Toplam:** MP 440 · anlık hasar 1556 · GERÇEKLEŞEN fiziksel katsayı 10.42 · cycle 1.50s

### Small Dummy · mesafe 300 · başlangıç MP 474
| t (s) | skill | MP | ok | isabet | fiziksel | elemental | toplam | action lock | kalan MP |
|---|---|---|---|---|---|---|---|---|---|
| 0.00 | Arrow Shower | 150 | 5 | 3/5 | 446 | 0 | 446 | 0.80s | 324 |
| 0.80 | Multiple Shot | 40 | 3 | 1/3 | 136 | 0 | 136 | 0.70s | 284 |
| 1.50 | Dark Pursuer | — | — | REDDEDİLDİ (mana) | — | — | — | — | 284 |
| 1.50 | Shadow Hunter | 250 | 1 | 1/1 | 375 | 0 | 375 | 0.85s | 34 |

**Toplam:** MP 440 · anlık hasar 957 · GERÇEKLEŞEN fiziksel katsayı 6.46 · cycle 1.50s

### Boss Dummy · mesafe 300 · başlangıç MP 474
| t (s) | skill | MP | ok | isabet | fiziksel | elemental | toplam | action lock | kalan MP |
|---|---|---|---|---|---|---|---|---|---|
| 0.00 | Arrow Shower | 150 | 5 | 5/5 | 731 | 0 | 731 | 0.80s | 324 |
| 0.80 | Multiple Shot | 40 | 3 | 3/3 | 474 | 0 | 474 | 0.70s | 284 |
| 1.50 | Dark Pursuer | — | — | REDDEDİLDİ (mana) | — | — | — | — | 284 |
| 1.50 | Shadow Hunter | 250 | 1 | 1/1 | 351 | 0 | 351 | 0.85s | 34 |

**Toplam:** MP 440 · anlık hasar 1556 · GERÇEKLEŞEN fiziksel katsayı 10.42 · cycle 1.50s

### Boss Dummy · mesafe 100 · başlangıç MP 474 · **MP SINIRSIZ (teorik)**
| t (s) | skill | MP | ok | isabet | fiziksel | elemental | toplam | action lock | kalan MP |
|---|---|---|---|---|---|---|---|---|---|
| 0.00 | Arrow Shower | 150 | 5 | 5/5 | 731 | 0 | 731 | 0.80s | 324 |
| 0.80 | Multiple Shot | 40 | 3 | 3/3 | 474 | 0 | 474 | 0.70s | 434 |
| 1.50 | Dark Pursuer | 300 | 1 | 1/1 | 351 | 0 | 351 | 0.90s | 174 |
| 2.40 | Shadow Hunter | 250 | 1 | 1/1 | 391 | 0 | 391 | 0.85s | 224 |

**Toplam:** MP 740 · anlık hasar 1947 · GERÇEKLEŞEN fiziksel katsayı 12.92 · cycle 2.40s

### ATEŞ ve ZEHİR ÖRNEKLERİ (Small Dummy, mesafe 100)
| skill | element | fiziksel | anlık elemental | DoT/tick | tick | DoT beklenen | anlık toplam |
|---|---|---|---|---|---|---|---|
| Fire Arrow | fire | 139 | 38 | 0 | 0 | 0 | 177 |
| Fire Shot | fire | 139 | 75 | 0 | 0 | 0 | 214 |
| Explosive Shot | fire | 139 | 113 | 0 | 0 | 0 | 252 |
| Poison Arrow | poison | 139 | 0 | 11 | 4 | 44 | 139 |
| Poison Shot | poison | 139 | 0 | 23 | 4 | 92 | 139 |
| Viper | poison | 139 | 0 | 34 | 4 | 136 | 139 |

### Zehir: BEKLENEN vs GERÇEKTEN uygulanan (yuvarlama sapması testi)
| skill | beklenen toplam | uygulanan tick | uygulanan toplam | sapma |
|---|---|---|---|---|
| Poison Arrow | 44 | 4 | 44 | 0 |
| Poison Shot | 92 | 4 | 92 | 0 |
| Viper | 136 | 4 | 136 | 0 |

---

## 5. TELEMETRİ YORUMU (nerf YAPILMADI — rapor)

**Üçlü Salvo (P1.3.1 sonrası, ±5°) küçük kuklada mesafeyle dağılıyor.**
Sınır ölçüldü: dış oklar **300 birimde** kaçmaya başlıyor. Geometrik beklenti
`26 / sin 5° = 298.3` — ölçüm 5 birimlik tarama adımıyla bunu doğruluyor.
100 → 3/3 · 200 → 3/3 · 295 → 3/3 · 300 → 1/3 · 335 → 1/3.
(±4° iken sınır `26 / sin 4° = 372` idi, yani cast menzilinin ÖTESİNDEYDİ ve
3'lü hiçbir mesafede ok kaybetmiyordu.)

**Beşli Salvo küçük kuklada:** `100 · sin 8° = 13.9` (< 26 → 5/5) ·
`200 · sin 8° = 27.8` (> 26 → 3/5). ±8° DEĞİŞMEDİ.

**Boss kuklada (r = 60):** Üçlü her mesafede 3/3 (`335 · sin 5° = 29.2 < 60`),
Beşli her mesafede 5/5 (`335 · sin 8° = 46.6 < 60`). Büyük hitbox gerçekten
daha çok ok yiyor — beklenen davranış.

**Rotasyon MP ile sınırlı.** Teorik maliyet 740 MP doğrulandı, ancak Sv70
oyuncunun MAKSİMUM MP'si **474**. Gerçek koşulda Kara Takip `mana` sebebiyle
REDDEDİLİYOR (gerçekleşen katsayı 10.42 / teorik 12.92). P1.3.1'de eklenen
**SONSUZ MP** toggle'ı ile tam cycle ölçülebiliyor: **12.92 · 740 MP · 2.40 s**.

MP tavanı bulgusu düzeltilmedi (denge kararı playtest sonrası); Üçlü'nün mesafe
riski P1.3.1'de spread ile açıldı, hasar katsayılarına DOKUNULMADI.

---

## 6. POISON STACK / REFRESH DAVRANIŞI (mevcut, DEĞİŞTİRİLMEDİ)

Motor: `src/game/systems/skills/effects.ts`.

- **Stack eder, refresh ETMEZ.** Her cast hedefin `status[]` dizisine YENİ ve
  BAĞIMSIZ bir `dot` kaydı `push` eder. Var olan kayıt aranmaz, süresi
  tazelenmez, üst üste binen kayıtlar birleştirilmez.
- **Cap YOK.** Aynı hedefe 5 kez Engerek Oku atılırsa 5 ayrı DoT paralel işler.
- **Tick hasarı cast ANINDA dondurulur** (`damagePerTick`); sonradan saldırı
  gücü veya hedef savunması değişse bile o kayıt etkilenmez.
- **Farklı zehirler karışmaz** — Zehirli Uç + Toksik Atış iki ayrı kayıttır.
- Hedef `dying` olduğunda bütün status'ler temizlenir.
- Ölçüm: tek cast **tam 4 tick** uyguluyor ve toplam **hiç sapmıyor**
  (yukarıdaki tabloda sapma sütunu 0).

Bu görevde stacking/refresh tasarımı EKLENMEDİ (§9 açık talimat).

---

## 7. BİLEREK AÇIK BIRAKILAN KAYNAK BELİRSİZLİKLERİ

1. **`magic_type3.duration = 20`** — birim (saniye? tick? decisecond?)
   doğrulanmadı. Zehir süresi 4 s bir TUNING değeridir, kaynak süresi
   olarak belgelenmiyor.
2. **`magic_type2.hit_type` (0 / 2)** — semantiği doğrulanmadı. Guided Arrow,
   Shadow Hunter, Dark Pursuer'da 2. "Kesin isabet" gibi bir davranış
   EKLENMEDİ; alan ham saklanıyor.
3. **`magic_type2.hit_rate` (100 / 150 / 300)** — semantiği doğrulanmadı.
   Perfect Shot 150, Dark Pursuer 300. Accuracy sistemi YAZILMADI.
4. **`skills.cast_time` (13 / 15)** — birim doğrulanmadı. Action time ile
   İLİŞKİLENDİRİLMEDİ; ilginç bir ipucu ama tahmin yapılmadı.
5. **Elemental mutlak ölçek** — `first_damage` / `time_damage` KO'nun HP
   ölçeğinde. Bizim ölçeğe çevirme faktörü bilinmiyor; yalnız 1 : 2 : 3 oranı
   taşındı.
6. **`magic_type3.radius = 20`** — tüm elemental kayıtlarda var, alan etkisi mi
   yoksa görsel yarıçap mı belirsiz. AoE davranışı EKLENMEDİ.
7. **Ok intercept davranışı** — kaynakta yok; `targetOnly` / `firstMobAlongRay`
   ikisi de prototip seçeneği olarak duruyor.

---

## 8. DEĞİŞEN DOSYALAR

| dosya | değişiklik |
|---|---|
| `data/archer-balance.ts` | **YENİ** — tek balance profili (source/tuning ayrımı, türev formüller) |
| `data/archer-skills.ts` | kendi katsayı tablolarını BIRAKTI; profilden türetiyor |
| `world/MultiShot.ts` | `MULTISHOT_PROFILES` artık profilden inşa ediliyor (0.99, range 340) |
| `world/WorldCombatAdapter.ts` | `DamageBreakdown` telemetrisi (physical / elemental / DoT) |
| `state.ts` | 15 skilin cast range'i profilden kaydediliyor |
| `scenes/WorldPrototypeScene.ts` | DEV → BALANCE V1 tablosu + son-cast bileşen satırları |
| `tools/balance-telemetry.ts` | **YENİ** — headless ölçüm (`npm run telemetry:archer`) |
| `tests/run.ts` | 32 yeni P1.3 regresyonu (248 test) |
| `package.json` | v0.6.4 · `build:proto` → P1.3 · `telemetry:archer` |

**`src/` altında hiçbir dosya değişmedi.** Kaynak DB ve generated JSON'a
dokunulmadı. `dist/preview.html` md5 aynı: `0399549684eec7137f46cee73c318710`.
