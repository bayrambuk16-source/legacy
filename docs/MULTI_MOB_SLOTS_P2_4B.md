# P2.4B — DİKDÖRTGEN ÇOK-MOBLU SLOT TEMELİ

Bu doküman P2.4B'de kurulan **kanonik spawn slotu** sözleşmesini anlatır.
Gerçek Moradon içeriği **bu görevde import EDİLMEDİ** (P2.4C).

---

## 1. Kanonik kural

```
1 SLOT = 1 MOB TÜRÜ + 1 DİKDÖRTGEN + 5..8 BAĞIMSIZ ÖRNEK + slot kaynaklı respawn
```

Aynı slotta farklı mob türü **karıştırılamaz** — bu, tipin kendisiyle
garanti edilir: slot tek bir `monsterRef` alanı taşır, liste değil.
Farklı tür isteyen ayrı slot açar.

| Sabit | Değer |
|---|---|
| `MIN_MOBS_PER_SLOT` | **5** |
| `MAX_MOBS_PER_SLOT` | **8** |

## 2. Doğrulama — sessiz clamp YOK

`validateMobSlot()` result döndürür (`{ ok } | { ok:false, errors }`),
`defineMobSlot()` geçersiz girdide **fırlatır**. Geçersiz `count` 5 veya 8'e
kırpılmaz.

```
count = 4 → RED       count = 5..8 → KABUL       count = 9 → RED
count = 5.5 → RED (tam sayı değil)               count = 1  → RED
minX > maxX → RED     çok örnekli slotta 0 genişlik/yükseklik → RED
```

## 3. Deterministik yerleşim

Doğuş noktası **`(slotId, instanceIndex, generation)`** üçlüsünden türer:

```
FNV-1a(slotId#instanceIndex#generation) → 2 bağımsız [0,1) değeri
```

`Math.random()` **kullanılmaz**; paylaşılan `Rng` akışı da kullanılmaz —
akış çağrı sırasına bağlı olurdu, oysa sözleşme "aynı üçlü → aynı nokta"dır.

**Üst üste doğmama garantisi:** dikdörtgen `count` hücreye bölünür
(count=5 → 3×2, count=8 → 3×3), örnek #i **yalnız #i'nin hücresinde**
%64'lük iç alanda jitter yapar. Hücreler ayrık olduğu için iki örnek
aynı koordinata düşemez. Generation değişince aynı hücrede yeni bir nokta
seçilir → respawn yerinde çakılıp kalmaz.

Ölçülen en yakın iki örnek arası: **slot A 91,7** · **slot B 94,7** world birimi.

## 4. Respawn — ÖRNEK BAZLI

Süre `slot.respawnSec`'ten okunur, sayaç **örnek başınadır**
(`MobAiRuntime.respawnTimer`). Bir örnek ölünce yalnız o örnek döner:

```
slot B · count 8 · respawn 4s
  8 canlı → #2 ölür → 7 canlı → (4 s) → 8 canlı
  #2: uid 8 → 15 · generation 1 → 2 · konum (1819,1324) → (1764,1283)
  komşuların uid/generation/HP/ev noktası DEĞİŞMEDİ
```

Slot sıfırlanmaz · tek ortak timer yoktur · population anlık olarak count'a
zıplamaz · tavan aşılmaz.

**Population sızıntısı imkânsız:** bir yuva (`slotId + instanceIndex`) için
en fazla bir mob **nesnesi** vardır; respawn yeni nesne yaratmaz, aynı nesneye
yeni uid/generation verir. 13 mobun tamamı aynı anda öldürülüp 20 s
simüle edildiğinde nesne sayısı 13'te, canlı tavanı 13'te kaldı.

## 5. Kimlik

| Kavram | Anlamı |
|---|---|
| `slotId` | hangi slot ürettі — yaşam boyu kimlik DEĞİL |
| `instanceIndex` | slot içi yuva (0..count-1) — **P2.4B'de eklendi** |
| `generation` | o yuvadaki kaçıncı canlı (+1 her respawn) |
| `uid` | anlık entity — **asla yeniden kullanılmaz** |

Renderer görsel anahtarı `uid:generation` olmaya devam eder → eski ceset,
eski animasyon durumu ve havadaki eski oklar yeni nesle çözülemez.

## 6. Legacy uyum

P1.6'dan gelen canlı farm alanı (`FARM_AREA_SLOTS`, 8 tekil slot) **kanonik
değildir** ve `defineMobSlot()` doğrulamasından geçmez. Yeni public bayrak
(`legacySingleInstance` vb.) **eklenmedi**; uyum `slotPlacement()` içindeki
tek bir dallanmadır:

```ts
area/count yoksa → dikdörtgen homeX/homeY noktasına ÇÖKER, count = 1
```

Dejenere dikdörtgende `instanceSpawnPoint()` tam olarak `(homeX, homeY)`
döndürür → canlı preview davranışı bit düzeyinde aynıdır (testli).

Yeni kanonik slot **asla count=1 kabul etmez**.

## 7. Renderer

Değişiklik **yoktur**. `test_mob_a` ve `test_mob_b` gameplay açısından farklı
türlerdir (farklı `monsterRef`, farklı HP), ama ikisi de aynı
`mutant_mobile_v1.glb` ile render edilir. `MobAssetFamily` /
`MobModelResolver` / `perMobGLB` gibi sistemler **eklenmedi**; renderer
`monsterRef` kelimesini hiç görmez (testle taranıyor) ve population'ı
gameplay'in `WorldFrame`'inden alır.

## 8. Test fixture'ı

`data/test-mob-slots.ts` — **canlı oyuna bağlı değildir**, `state.ts` import
etmez. KO isimleri kullanılmaz; kimlikler nötrdür (`test_slot_a` /
`test_mob_a`). `monsterRef` hâlâ ana veri katmanının sayısal referansıdır —
HP/exp/stat oradan gelir ve burada kopyalanmaz.

| | slot A | slot B |
|---|---|---|
| `monsterRef` | 750 | 850 |
| `count` | 5 | 8 |
| dikdörtgen | X 600..1000 · Y 600..900 | X 1400..1900 · Y 1200..1700 |
| respawn | 4 s | 4 s |

Toplam fixture population: **13**.

## 9. Bilinen sınırlar

1. Aktivasyon yarıçapı, simulation sleeping, uzak culling **yoktur** (§39 —
   ayrı görev). En büyük fixture 13 mantıksal mobdur.
2. Canlı preview hâlâ 8 legacy tekil slot kullanır; çok-moblu sistem test
   fixture'ı üzerinden kanıtlanmıştır (§40 izin veriyor).
3. `PrototypeState` DEV respawn ezmesini (`respawnOverrideSec = 8`) canlı
   oyunda korumaya devam eder; `slot.respawnSec` yolu ezme kapalıyken
   (test/telemetri) çalışır. Bu P1.6'dan gelen mevcut davranıştır.
4. Hücre ızgarası dikdörtgeni eşit böler; KO'nun gerçek spawn yoğunluğu
   (örneğin duvar kenarına yığılma) modellenmez. Gerçek veri P2.4C'de gelecek.
5. Engel (`OBSTACLES`) çakışması kontrol edilmez — doğuş noktası yalnız
   dikdörtgen içinde olmayı garanti eder.
