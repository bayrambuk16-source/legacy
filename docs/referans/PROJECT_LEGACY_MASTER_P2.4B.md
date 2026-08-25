# PROJECT LEGACY — ANA BAŞVURU DOKÜMANI

> ⚠️ **TARİHSEL BELGE — SAYILAR P2.4B DÖNEMİNE AİT (25 Ağu 2026 öncesi).**
> Sistem anlatımları (üç fazlı cast, dört iptal kapısı, DoT modeli, kimlik
> üçlüsü, kaynak DB çözümleri) hâlâ geçerlidir; SAYISAL değerlerin bir kısmı
> eskimiştir. Bilinen bayatlar: `monsterDamage/HpMultiplier = 8` → artık
> seviye eğrisi (2,0→1,0, `mob-damage-curve.ts`) · başlangıç Sv70 prototipi →
> tavan 50 · test haritası 2480×3300 / spawn (1240,1650) → canlı harita
> Moradon · "bütün moblar mutant GLB" → 7 model · 523 test → 816+.
> Güncel değerler için ilgili `data/` dosyalarına ve CHANGELOG'a bakın.


**Ne bu:** projenin şu ana kadar üretilmiş bütün *işe yarar* bilgisinin tek
yerde toplanmış hâli. Her sayı ya koddan okundu ya da `KO_Reference_v8.db`
üzerinde doğrudan sorgulandı. Tahmin edilen hiçbir değer yok; emin
olunmayanlar **§13 Veri Boşlukları**'nda açıkça listeli.

**Güncelleme:** 25 Ağu 2026 · P2.4B GREEN sonrası.

---

## 0. DOKÜMAN HARİTASI

Bu dosya özet + karar kaydıdır. Ayrıntı gerektiğinde:

| Konu | Dosya |
|---|---|
| Proje yönü / vizyon | `PROJECT_DIRECTION.md` |
| Mimari katmanlar + kurallar | `ARCHITECTURE.md` · `ARCHITECTURE_CORRECTNESS_P1_6_1.md` |
| Okçu skill dengesi (15 skill tam tablo) | `ARCHER_BALANCE_V1.md` |
| KO Rogue'un 4 skill sekmesi | `KO_ROGUE_SKILL_TABS.md` |
| KO Archery skill listesi (ham kaynak) | `KO_ARCHERY_SKILL_LIST.md` |
| Okçunun kullanabildiği 193 item | `KO_ARCHER_ITEM_LIST.md` |
| Hasar döngüsü (mob ⇄ karakter) | `DAMAGE_LOOP_V1.md` |
| Drop / loot / farm ekonomisi | `DROP_LOOT_FARM_LOOP_V1.md` |
| Genie otomatik farm | `GENIE_FARM_LOOP_V1.md` |
| Item / equipment / build | `ITEM_EQUIPMENT_BUILD_V1.md` |
| Mob AI + farm alanı | `MOB_AI_FARM_AREA_V1.md` |
| Combat hissi / timing | `COMBAT_FEEL_V1.md` · `POTION_RANGE_MOVEMENT_V1.md` |
| Three.js 2.5D renderer | `THREE_RENDERER_FOUNDATION_P2_0.md` |
| Archer / Mutant / Arrow GLB entegrasyonu | `ARCHER_GLB_INTEGRATION_P2_1.md` · `MUTANT_MOB_INTEGRATION_P2_2.md` |
| Moradon koordinat köprüsü | `MORADON_COORDINATES_P2_4A.md` |
| Çok-moblu spawn slotu | `MULTI_MOB_SLOTS_P2_4B.md` |
| Tam değişiklik geçmişi | `CHANGELOG.md` |

---

## 1. PROJE NEDİR

**Project Legacy** — Knight Online referans verisinden türetilmiş, **veri
odaklı portrait mobil RPG**. KO bir *kaynaktır*, kopyalanacak bir oyun değil.

Çalışma alanı: `experiments/eternal-ko-prototype/` — ana `src/` oyununun
Faz 6.1 gameplay'ine **dokunulmaz**.

### Değişmeyen üç ilke

1. **KAYNAK OTORİTEDİR.** Kaynak JSON/DB neyi söylüyorsa o gerçektir.
   Davranış katmanı yalnız kaynağın *söylemediğini* belirler.
2. **SOURCE FACT ≠ PROJECT LEGACY TUNING.** İkisi hiçbir dosyada
   karıştırılmaz; her tuning değeri kaynaktan gelmediğini yazan bir yorumla
   birlikte durur.
3. **VERİ NETSE OKU, DEĞİLSE YAZ.** Belirsiz bir alan tahmin edilmez —
   ham saklanır ve boşluk olarak işaretlenir.

### KO'dan korunan ruh

Tek hedef seçimi (otomatik herkese vurmak yok) · ok tüketimi kavramı ·
mob'un evine dönmesi (leash) · slot tabanlı spawn · upgrade eğrisi ·
sınıf kısıtlı ekipman.

### Şimdilik YOK

Kritik vuruş · isabet/kaçınma sistemi · set bonusu · rastgele affix ·
PvP · çok oyunculu · rarity kolonundan gelen nadirlik.

---

## 2. MİMARİ — PAZARLIĞA KAPALI KURALLAR

```
data/        saf veri + saf fonksiyon · three YOK · yan etki YOK
world/       gameplay otoriteleri · renderer'dan BAĞIMSIZ · headless test edilebilir
render3d/    yalnız çizim · gameplay'e ASLA yazmaz
scenes/      girdi + kompozisyon
```

| Kural | Neden |
|---|---|
| `world/` üç boyut bilmez | renderer açık/kapalı gameplay sonucunu değiştiremez |
| `WorldFrame` **dar, kopyalanmış, salt-okunur** bir görünümdür | renderer gameplay referansı tutamaz |
| Hasar uygulaması **tek kapıdan** geçer | Scene'e dağılmış hasar = izlenemez bug |
| Ölüm **tek kapıdan** geçer (`reapDead()`) | kill başına tek EXP, tek drop |
| Türetilmiş statı **yalnız** `ArcherBuildResolver` hesaplar | tek authority → drift yok |
| Stat her çağrıda **sıfırdan** toplanır | 100 equip/unequip sonrası değer birebir aynı |
| `Math.random()` runtime'da **yasak** | deterministik RNG (`mulberry32`) |
| Sayaçlar `+=` ile **devreder**, `=` ile sıfırlanmaz | 30/60/120 fps aynı sonucu verir |
| three **vendored** (`vendor/three/`), CDN **yasak** | sha256 bütünlük kapısı, 5 dosya |

### Kimlik üçlüsü (P1.6.1) + slot yuvası (P2.4B)

| Kavram | Anlam |
|---|---|
| `slotId` | hangi spawn slotu üretti — **yaşam boyu kimlik değil** |
| `instanceIndex` | slot içi yuva (0..count−1) |
| `generation` | o yuvadaki kaçıncı canlı (+1 her respawn) |
| `uid` | anlık entity — **asla yeniden kullanılmaz** |

Renderer görsel anahtarı `uid:generation`. Bu sayede eski ceset, eski
animasyon durumu ve havadaki eski oklar yeni nesle **çözülemez**.

---

## 3. KAYNAK VERİTABANI — NE VAR, NE GÜVENİLİR

`reference/KO_Reference_v8.db` · 36 tablo.

| Tablo | Satır | Rol | Güven |
|---|---:|---|---|
| `items_server` | 62 954 | tüm itemler, tüm upgrade satırları | yüksek · **`req_level` BOZUK** |
| `items` | 301 | küratörlü taban item listesi | yüksek |
| `skills` | 1 732 | skill kayıtları | yüksek · **`description` BOZUK** |
| `magic_type1..9` | ~1 700 | skill etki tabloları | yüksek |
| `monsters` | 700 | mob statları | yüksek |
| `monster_drops` | 2 275 | drop yuvaları | yüksek |
| `make_item_groups` | 2 215 | drop grup üyeleri | yüksek |
| `npc_positions` | 2 495 | spawn dikdörtgenleri | yüksek |
| `zones` | 61 | harita kayıtları | yüksek |
| `start_positions` | 62 | başlangıç noktaları | yüksek |
| `item_upgrades` | 6 583 | upgrade eğrisi | yüksek |
| `level_exp` | 80 | seviye eğrisi | yüksek |

### Çözülmüş kodlar

| Kod | Anlam | Nasıl kanıtlandı |
|---|---|---|
| `class_code` 0 / 1 / 2 / 3 / 4 | herkes / Warrior / **Rogue** / Mage / Priest | `class_code × kind` çapraz tablosu |
| `class_code` 6 / 8 / 10 / 12 | aynıların Master sürümü | aynı çapraz tablo |
| `skills.moral` 1 / 2 / 4 / 6 / 7 | kendine / tek dosta / parti üyesine / partiye / düşmana | okunaklı İngilizce açıklamalarla |
| `magic_type3.attribute` 1 / 6 | ateş / zehir | skill isimleriyle birebir |
| `rate_raw` | **on binde bir** (yüzde değil) | 2275 satırda `rate_percent = rate_raw/100`, ihlal 0 |
| drop yuvaları | **bağımsız atılır** | 526 mobun 216'sında toplam %100'ü aşıyor (max %375) |
| `recast_time / 10` | saniye | 32 → 3,2 · 42 → 4,2 tutarlı |
| `item_group 391010000` | **Arrow (+0)** | `items_server` kaydı |

### Bozuk / kullanılamaz alanlar

- **`items_server.req_level`** — 2506 yayın **hepsinde 1**. Seviye kapısı bu
  tabloda düzleşmiş. Gerçek seviyeler yalnız küratörlü `items` tablosunda
  (301 satır); fiili kapı `req_dex`.
- **`ac = 65466`** — 166 satırda. 65536 − 70, yani işaretli/işaretsiz taşma.
  Windforce yayları etkileniyor.
- **`skills.description`** — iki ayrı bozukluk: (a) `108xxx` ailesinin çoğu
  Korece metni `??? 150 ????` şeklinde kaybetmiş, (b) `208xxx` ailesinde bazı
  satırların metni **komşusundan kopyalanmış** (Concentration ve Smoke Screen
  ikisi de Wild Advent'in metnini taşıyor). **Metin ile sayı çelişirse SAYI
  esas alınır.**

---

## 4. OKÇU — SKILL AĞACI

KO'da okçu **ayrı bir sınıf değil**: Rogue'un dört sekmesinden biri.
Dört sınıfın hepsi aynı iskeleti kullanıyor (`x0` temel · `x5`/`x6`/`x7` üç
ağaç · `x8` master · `x9` tek skill).

| # | Sekme | grp | Skill |
|---|---|---|---:|
| 1 | Temel | 1080 | 5 |
| 2 | **Archery** | **1085** | **13** |
| 3 | Assassination | 1086 | 14 |
| 4 | Gizlenme / hayatta kalma | 1087 | 13 |
| — | Master seti (sekme değil) | 1088 | 6 |

### Archery ailesi — dört net çizgi

| Aile | İlerleme | Ölçek |
|---|---|---|
| Saf fiziksel | Through Shot → Perfect Shot → Arc Shot | %150 → %200 → %250 |
| Ateş (anlık) | Fire Arrow → Fire Shot → Explosive Shot | +156 → +309 → +463 |
| Zehir (DoT) | Poison Arrow → Poison Shot → Viper | 232 → 463 → 691 |
| Takipli (`hit_type=2`) | Guided Arrow → Shadow Hunter → Dark Pursuer | hit_rate 100 → 150 → 300 |
| Çok oklu | Multiple Shot (3 ok) · Arrow Shower (5 ok) | ok başına %99 |

Ateş ↔ zehir eşleşmesi kasıtlı: aynı seviye basamağında biri **anlık**,
diğeri **yayılı**, benzer büyüklükte (309↔463, 463↔691).

### Projede kullanılan 15 skill — FINAL V1

| Skill | KO | ref | Lv | MP | CD | action | phys | ok | element | elem | DoT |
|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| Standart Atış | Archery | 102003 | 1 | 0 | — | 1.10s | 1.00 | 1 | — | — | — |
| Delici Ok | Through Shot | 107500 | 3 | 15 | — | 0.75s | 1.50 | 1 | — | — | — |
| Kor Oku | Fire Arrow | 107505 | 5 | 10 | 3.2s | 0.75s | 1.00 | 1 | ateş | 0.25 | — |
| Zehirli Uç | Poison Arrow | 107510 | 10 | 10 | 3.2s | 0.75s | 1.00 | 1 | zehir | — | 0.30 |
| Üçlü Salvo | Multiple Shot | 107515 | 15 | 40 | — | 0.70s | 0.99 | **3** | — | — | — |
| İzci Oku | Guided Arrow | 107520 | 20 | 40 | — | 0.75s | 1.00 | 1 | — | — | — |
| Keskin Atış | Perfect Shot | 107525 | 25 | 70 | — | 0.80s | 2.00 | 1 | — | — | — |
| Alev Atışı | Fire Shot | 107530 | 30 | 30 | 4.2s | 0.80s | 1.00 | 1 | ateş | 0.50 | — |
| Toksik Atış | Poison Shot | 107535 | 35 | 30 | 4.2s | 0.80s | 1.00 | 1 | zehir | — | 0.60 |
| Yırtıcı Ok | Arc Shot | 107540 | 40 | 100 | — | 0.85s | 2.50 | 1 | — | — | — |
| Patlayıcı Ok | Explosive Shot | 107545 | 45 | 50 | 4.2s | 0.85s | 1.00 | 1 | ateş | 0.75 | — |
| Engerek Oku | Viper | 107550 | 50 | 50 | 4.2s | 0.85s | 1.00 | 1 | zehir | — | 0.90 |
| Beşli Salvo | Arrow Shower | 107555 | 55 | 150 | — | 0.80s | 0.99 | **5** | — | — | — |
| Gölge Avcısı | Shadow Hunter | 107560 | 60 | 250 | — | 0.85s | 2.50 | 1 | — | — | — |
| Kara Takip | Dark Pursuer | 108570 | 70 | 300 | — | 0.90s | 2.50 | 1 | — | — | — |

> `phys` çok-oklu skillerde **ok başınadır**. Toplam `damage × N` değildir —
> her ok ayrı `damageRoll` ve ayrı isabet üretir.
>
> Kaynak formülü: `physicalCoefficient = magic_type2.add_damage / 100`.
> Cast menzili **400** — kaynakta `range_value` 15 kaydın hepsinde 0 olduğu
> için bu bir tuning kararıdır.

---

## 5. OKÇU — EKİPMAN

**193 taban item** (upgrade ve attribute varyantları birleştirilmiş).

| Kategori | kind | Adet | class_code |
|---|---:|---:|---|
| Yay | 70 | 25 | **2** (yalnız Rogue) |
| Arbalet | 71 | 3 | **2** (yalnız Rogue) |
| Rogue zırhı | 220 | 48 | **2** / **8** |
| Küpe · Kolye · Yüzük · Kemer | 91–94 | 115 | **0** (herkes) |
| Ok | 120 | 2 | **0** |

### Slot haritası (isimlerden doğrulandı)

`3` iki el (arbalet) · `4` yay · `5` gövde · `6` bacak · `7` baş ·
`8` el · `9` ayak · `10/11/12/14` küpe/kolye/yüzük/kemer · `15,17` sarf.

### Bilinmesi gerekenler

- **Yay ve arbalet yalnız Rogue'a açık.** Başka hiçbir sınıf kullanamıyor.
- **Arbalet iki el (`slot 3`), yay ayrı bir slotta (`slot 4`).** Bu ayrımın
  oyun içi anlamı kaynakta yazılı **değil**.
- Silahlar KO'da **primary stat taşıyabiliyor** (2505 yayın 208'inde
  `dex_bonus`, 197'sinde `str_bonus`). Project Legacy bunu **bilerek
  kullanmıyor** — silahın işi ATTACK'tır; her tanımda `droppedSourceFields`
  ile işaretli.
- **Rarity kolonu YOK · set bonusu alanı YOK.** Projedeki `itemClass` bir
  tasarım kararıdır, kaynaktan gelmez.
- Ok tüketimi kaynakta gerçek: her okçu skilli `item_group = 391010000`
  taşıyor, `need_arrow` kadar düşüyor (tek atış 1 · Multiple Shot 3 ·
  Arrow Shower 5). **Project Legacy'de şu an modellenmiyor.**

---

## 6. HASAR DÖNGÜSÜ

İki yön de **aynı formülü** kullanır:

```ts
damageRoll(attack, defense, coefficient = 1) {
  const raw = attack * coefficient - defense * 0.1;
  return Math.max(1, Math.round(raw * range(rng, 0.9, 1.1)));
}
```

### A) Oyuncu → mob — üç fazlı

```
t = 0.00   CAST      mana + cooldown + ActionLock + animasyon · HP DEĞİŞMEZ
t = 0.20   RELEASE   oklar doğar · hedefin uid + generation KOPYALANIR
t ≈ 0.53   IMPACT    ► hasar · DoT · kill · loot BURADA
```

```
playerAttack() = (level × 2 + Σ ekipman.attack) × balance.playerDamage
```

### B) Mob → oyuncu — iki fazlı

```
windup 0.45 sn ─► VURUŞ DÜŞER ─► recovery 1.15 sn ─► başa dön
```

Mobun skili yok, katsayı daima 1:
`damageRoll(monster.attack × 8, playerDefense())`.

Histerezis: `enterAttack 50` → `attackRange 55` → `leaveAttack 65`.
Aradaki bant sınırda titremeyi engelliyor.

### C) DoT — ayrı tik döngüsü

`perTick = damageRoll(playerAttack(), mobDefense, dotTotalCoef / tickCount)`
Toplam katsayı tasarım girdisidir; tik sayısı değişirse tek tik hasarı
kendiliğinden yeniden bölünür.

### Hasarın iptal edildiği dört kapı

| `invalid` | Anlamı |
|---|---|
| `miss` | ok kimseyi hedeflemiyordu |
| `targetGone` | entity listede yok |
| `targetDead` | hedef ok havadayken başka yolla öldü → **ikinci kill/loot yok** |
| `targetReplaced` | uid aynı ama **generation farklı** → aynı slotta yeniden doğmuş başka canlı |

### Döngünün kapanışı

```
mob.hp<=0 → 'dying' → reapDead() → EXP + drop + respawn sayacı → yeni uid/gen
player.hp<=0 → alive=false → mob aggro'su DÜŞER → moblar RETURN → regen
```

**Asimetri kasıtlı:** mob ölünce yeniden doğar, oyuncu ölünce dünya durmaz.

---

## 7. SPAWN SLOTU (P2.4B)

```
1 SLOT = 1 MOB TÜRÜ + 1 DİKDÖRTGEN + 5..8 BAĞIMSIZ ÖRNEK + slot respawn'ı
```

`MIN_MOBS_PER_SLOT = 5` · `MAX_MOBS_PER_SLOT = 8`.
Geçersiz `count` **sessizce kırpılmaz** — `defineMobSlot()` fırlatır.

**Deterministik doğuş:** nokta `(slotId, instanceIndex, generation)`
üçlüsünden FNV-1a ile türer — paylaşılan RNG akışından bağımsız.
Dikdörtgen `count` hücreye bölünür, örnek #i yalnız kendi hücresinde jitter
yapar → **üst üste doğmak imkânsız**.

**Respawn örnek bazlı:** bir örnek ölünce yalnız o örnek döner. Slot
sıfırlanmaz, tek ortak timer yok, population count'u aşmaz.

**Legacy uyum:** P1.6'dan gelen 8 tekil slot kanonik değil; `slotPlacement()`
içindeki tek dallanma ile dikdörtgen ev noktasına çöküyor (count 1). Yeni
public bayrak eklenmedi.

---

## 8. MORADON KOORDİNAT KÖPRÜSÜ (P2.4A)

| Sabit | Değer | Kaynak |
|---|---|---|
| `MORADON_ZONE_ID` | 21 | `zones.zone_no` — **DB doğrulandı** |
| `MORADON_MAP_FILE` | `moradon_0826.smd` | `zones.zone_file` — **DB doğrulandı** |
| `MORADON_SOURCE_SIZE` | 512 × 512 | `.smd` header (129 ızgara × 4.0 aralık) |
| `MORADON_KO_SPAWN` | (306, 352) | `start_positions` — **DB doğrulandı** |
| `KO_TO_WORLD_SCALE` | **5** | Project Legacy kararı |
| `MORADON_WORLD_SIZE` | 2560 × 2560 | türetilmiş |
| `MORADON_WORLD_SPAWN` | (1530, 1760) | türetilmiş |

```
worldX = koX × 5      worldY = koZ × 5
```
Ofset yok · rotasyon yok · eksen çevirme yok. KO'nun **Z** ekseni world
**Y**'sine gider.

> `zones.init_x = 31200` / `init_z = 40200` **başka bir koordinat uzayıdır**
> (306/352'nin katı değil). Karıştırılmamalı.

**Terrain GLB doğrulaması** (kullanıcı tarafından sağlandı, ölçüldü):
16 641 vertex = **129 × 129**, aralık **20 world birimi** (= 4.0 × 5),
kapsam **X/Z 0..2560**, 32 768 üçgen, dejenere üçgen 0, tutarlı winding.
Yani terrain dosyası ölçek 5 ve 2560×2560 kararlarını **bağımsız olarak
doğruluyor**. *(Dosyada normal, UV, materyal ve doku YOK — sadece POSITION
+ indices.)*

---

## 9. SİSTEM ENVANTERİ

| Dosya | Sorumluluk |
|---|---|
| `world/CombatPipeline.ts` | cast → release → impact zamanlaması + taşıma |
| `world/WorldCombatAdapter.ts` | payload üretimi + impact uygulaması + kill |
| `world/MobAttack.ts` | mob → oyuncu hasarı (tek kapı) |
| `world/MobAi.ts` | tek durum makinesi, üç profil parametresi |
| `world/MobSlotSystem.ts` | spawn / ölüm / respawn yaşam döngüsü |
| `world/WorldTargetSystem.ts` | tek hedef seçimi (KO ruhu) |
| `world/GenieSystem.ts` | otomatik farm kararları |
| `world/GenieMovement.ts` | Genie hareket durum makinesi |
| `world/DropSystem.ts` | drop + coin authority'si |
| `world/WorldLootSystem.ts` | yerdeki ganimet |
| `world/LootPolicy.ts` | auto loot tercihi |
| `world/MultiShot.ts` | 3/5 ok geometrisi |
| `world/Projectiles.ts` | ok görsel efekti |
| `world/WorldMovementSystem.ts` | hareket authority'si |
| `world/WorldCameraController.ts` | kamera takibi |
| `world/BuildResolver.ts` | türetilmiş stat — **tek authority** |
| `world/EquipService.ts` | equip kapıları (katalog + sınıf + seviye) |
| `world/PotionSystem.ts` | KO sabit miktarlı iksirler |
| `world/ActionLock.ts` | attack recovery / action time |
| `world/PlayerAnimation.ts` | oyuncu görsel durum makinesi |
| `world/hitbox.ts` | combat çarpışma yarıçapı (sprite'tan bağımsız) |
| `render3d/ThreeWorldRenderer.ts` | tek ağır three dosyası |
| `render3d/frame.ts` | gameplay → dar salt-okunur görünüm |
| `render3d/CameraRig.ts` | kamera açıları + ekran ekseni |
| `render3d/GlbLoader.ts` | fetch-free / blob-free GLB yükleme |
| `render3d/ArcherRig.ts` · `MobRig.ts` | iskelet klonlama |
| `render3d/ArcherAnimator.ts` · `MutantAnimator.ts` | klip seçimi |
| `data/mob-slot-schema.ts` | kanonik slot sözleşmesi + doğrulama |
| `data/moradon-coords.ts` | KO → world koordinat köprüsü |
| `data/archer-balance.ts` | skill dengesinin tek otoritesi |
| `data/item-catalog.ts` | Project Legacy item tanımları |

---

## 10. BÜTÜN SAYILAR TEK TABLODA

### Kaynaktan gelen (SOURCE FACT)

| Ne | Nereden |
|---|---|
| skill katsayısı | `magic_type2.add_damage / 100` |
| elemental / DoT ham değerleri | `magic_type3.first_damage` · `time_damage` |
| mana maliyeti · cooldown | `skills.mana_cost` · `recast_time / 10` |
| mob HP / attack / defense / exp / coin | `monsters` |
| drop oranı | `monster_drops.rate_raw` (on binde bir) |
| ok tüketimi | `magic_type2.need_arrow` |

### Project Legacy tuning (KAYNAKTAN GELMEZ)

| Değer | Ayar |
|---|---:|
| `defenseFactor` | 0.1 |
| varyans | 0.9 – 1.1 |
| `minDamage` | 1 |
| `playerAttackPerLevel` | 2 |
| `baseHp` / `hpPerLevel` | 120 / 14 |
| `baseMp` / `mpPerLevel` | 60 / 6 |
| `hpRegenPerSec` / `mpRegenPerSec` | 1.5 / 4 |
| `basicAttackCooldownSec` | 1.1 |
| `monsterHpMultiplier` / `monsterDamageMultiplier` | 8 / 8 |
| `releaseDelaySec` | 0.20 |
| `projectileSpeed` | 900 |
| `attackMoveMult` | 0.60 |
| cast range | 400 |
| `playerSpeed` | 120 |
| mob `attackRange` / `enterAttack` / `leaveAttack` | 55 / 50 / 65 |
| mob `hitMomentSec` / `attackIntervalSec` | 0.45 / 1.6 |
| mob `respawnSec` (varsayılan) | 8 |
| mob `roamRadius` / `leashRadius` | 80 / 500 |
| aggro yarıçapı NORMAL / AGGRESSIVE / ELITE | 0 / 220 / 260 |
| Genie acquisition / cast / konumlanma | 450 / 400 / 380 |
| Genie farm boundary | 650 |
| Genie karar aralığı | 0.10 sn |
| Genie HP / MP iksir eşiği | %40 / %30 |
| loot ömrü / toplama yarıçapı | 60 sn / 70 |
| zehir süresi / tick | 4.0 sn / 1.0 sn |
| 3'lü / 5'li spread | ±5° / ±8° |
| `WORLD_UNITS_PER_METER` | 28.873 (52 / 1.801) |
| `KO_TO_WORLD_SCALE` | 5 |
| mantıksal ekran | 620 × 1100 |
| aktif test haritası | 2480 × 3300, spawn (1240, 1650) |
| başlangıç seviyesi (prototip) | 70 |

---

## 11. 3D KATMANI

- **three@0.169.0**, `vendor/three/` altında **vendored**. CDN yasak.
  sha256 bütünlük kapısı `VENDOR.json` — **5 dosya**.
- **fetch-free / blob-free GLB yükleme.** İki gerçek kullanıcı hatası bunu
  zorunlu kıldı: `DataCloneError` (Three'nin `FileLoader`'ı `new Request`
  kuruyor) ve `blob-request://` doku hatası. Çözüm: `decodeDataUri()` +
  `inlineGlbImages()` — GLB'nin JSON chunk'ı yeniden yazılır, BIN chunk
  bit-bit kopyalanır.
- **Kamera yaw 270°** — ekran ekseni 2D sözleşmesiyle hizalı. Joystick
  yönünün ters çalışması bu şekilde düzeldi.
- **Manifest authoritative asset metadata.** Socket konumları, ölçek,
  materyal zorunlulukları manifestten **birebir** okunur; elle yazılmaz.
- Varlıklar: `archer_mobile_v1.glb` · `mutant_mobile_v1.glb` ·
  `arrow_mobile_v1.glb`. **Bütün mob türleri şimdilik aynı mutant GLB'siyle
  render edilir**; `mobRef → GLB` seçimi YOK.

---

## 12. FAZ GEÇMİŞİ

| Faz | Ne yapıldı |
|---|---|
| P1.2 – P1.5 | okçu combat V1, atlas, iki fazlı cast, Genie farm döngüsü |
| P1.6 | mob AI durum makinesi + farm alanı (8 tekil slot) |
| P1.6.1 | mimari doğruluk geçişi — kimlik üçlüsü, biriktirici sayaçlar |
| P1.7 | drop & loot farm döngüsü |
| P1.8 | item / equipment / build |
| P2.0 | Three.js 2.5D renderer temeli |
| P2.1 | Archer GLB entegrasyonu |
| P2.2 | Mutant GLB gerçek mob + training dummy kaldırıldı |
| P2.3 | combat ölçer kaldırıldı + oklar düzeltildi |
| P2.4 | gerçek ok GLB'si |
| P2.4A | Moradon koordinat temeli |
| **P2.4B** | **dikdörtgen çok-moblu slot temeli** ← şu an |
| P2.4C | *(sıradaki)* gerçek Moradon spawn verisi importu |

**Test durumu:** prototip **523/523** · ana paket **106/106** ·
`src/` değişmedi · `dist/preview.html` md5 `0399549684eec7137f46cee73c318710`
(tam rebuild sonrası değişmedi).

---

## 13. VERİ BOŞLUKLARI — TAHMİN EDİLMEDİ

### Kaynakta çözülemeyenler

1. **`magic_type2.hit_type` (0/2) ve `hit_rate` (100/150/300)** — semantiği
   doğrulanmadı, ham saklanıyor. **İsabet/kritik sistemi YOK.**
2. **`skills.cast_time` (13/15)** — birimi çözülmedi, kullanılmıyor.
3. **`magic_type3.duration = 20`** — ham; saniye olduğu doğrulanmadı.
4. **`skills.range_value`** — 15 kaydın hepsinde 0; menzil ayrımı üretmiyor.
5. **`magic_type5.effect_subtype`** (Cure curse 2, Cure disease 1) — kod
   anlamı çözülmedi.
6. **`magic_type8.warp_type = 25`** ve **`magic_type9.state_change` (1/3/4/5)**
   — kod anlamları çözülmedi.
7. **`items_server.effect1` / `effect2`** — anlamı çözülmedi.
8. **Silah elementalinin combat entegrasyonu** — kaynakta kolonlar var ama
   hiçbir tüketicisi yok. Minimum adaptör yazıldı, ayrı bileşen olarak.

### Kaynakta hiç olmayanlar

9. **Item rarity kolonu YOK.**
10. **Set bonusu alanı YOK.**
11. **Oyuncu taban statı YOK** — seviye eğrisi `config.ts`'te tasarım kararı.
12. **8 üst-tier Archery skilli** (`Ice Shot`, `Lightning Shot`, `Power Shot`
    %500, `Blinding Strafe` %400, `Blow Arrow`, `Shadow Shot`,
    `Counter Strike`, `Multiple Shot`@108) yalnız `magic_type2`'de —
    seviye/MP/cooldown/element **yok**.
13. **`valor` · `matchless` · `Source Marking` · `Armor Cancellation` ·
    `whipping`** — hiçbir `magic_type` tablosunda kaydı yok.

### Ölçülmüş ama açık kalan tasarım soruları

14. **Denge bozuk (ölçüldü).** Varsayılan prototip durumu seviye 70 +
    ekipmansız: `attack 140`, `defense **0**`. Toprak Solucanı 56 HP —
    Standart Atış tek vuruşta öldürüyor (ölçülen 135 hasar), mob 33 vuruyor.
    `monsterHpMultiplier = 8` telafi etmiyor. **Bu bir tuning görevidir.**
15. **Oyuncu savunması hiç sınanmadı** (varsayılan 0). Ekipman geldiğinde
    `defenseFactor = 0.1` yeniden ölçülmeli.
16. **Mob savunması debuff'lanabiliyor** (`statusModifiers().defenseMult`)
    ama okçu ağacında savunma düşüren skill **yok** — bu yol şu an ölü kod.
17. **Ok tüketimi modellenmiyor** — kaynakta gerçek, oyunda yok.
18. **8 farm slotunun hepsi mutant görselini kullanıyor** — tek mutanta
    indirmek `data/farm-area.ts`'te bir veri kararı.
19. **Terrain GLB'sinde normal/UV/materyal yok** — render için
    `computeVertexNormals()` gerekiyor.
20. **`.smd` içindeki nesne/collider verisi henüz okunmadı** — haritada
    görünmez engel şüphesi bununla ilgili olabilir.
