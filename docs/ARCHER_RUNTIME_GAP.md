# ARCHER ATLAS — RUNTIME UYUM ANALİZİ

**Kime:** mühendislik (sanatçıya verilecek belge `docs/ARCHER_ANIMATION_SPEC.md`).
**Ne zaman:** gerçek atlaslar teslim edilmeden ÖNCE, P1.1.4 kodu üzerinden.
**Sonuç:** mimari uyumlu; kırılacak bir şey yok. Değişiklikler `PlayerAnimator` +
`proto-assets.ts` + sahnenin oyuncu çizim bloğunda toplanıyor. Combat, Genie, loot,
kamera, hareket **etkilenmiyor**.

---

## 1. Özet tablo

| Spec gereği | P1.1.4 durumu | Aksiyon |
|---|---|---|
| 5 atlas, satır=yön / sütun=kare | Renderer `sx/sy/sw/sh` alt-dikdörtgen destekliyor (kurt sprite'ı zaten satır indeksliyor) | **Hazır** — yeni kod gerekmiyor |
| `frameWidth/Height = 300` | `OKCU_FRAME = 300` sabit | Metadata'dan oku |
| `footAnchor (150, 264)` | `OKCU_FOOT_PAD = 36` → `300 − 36 = 264`, `originX 0.5` | **Zaten birebir aynı**; sabiti metadata'ya bağla |
| 8 yön | `directionIndex()` + 8 sayfa var | Sayfa tablosu → **satır tablosu** olacak |
| Direction row sırası (BACK=0…) | Runtime sırası açı tabanlı (SAĞ=0…) | **Açık eşleme tablosu + test** (spec §2.1) |
| state: idle/walk/attack/skill/dead | idle/**move**/attack/skill/dead | İsim `walk`'a çevrilecek (yalnız adlandırma) |
| Öncelik dead > skill/attack > walk > idle | `update()` aynı sırayla kısa devre yapıyor | **Hazır** |
| Attack/skill başarısızsa animasyon başlamaz | `performBasic/performSkill` yalnız `ok:true`'da tetikliyor | **Hazır** |
| Attack facing > movement facing | `triggerAttack(angle)` hedef açısını kilitliyor, `isActing` iken `aimAngle` ezilmiyor | **Hazır** |
| Saldırı bitince movement facing'e dön | `update()` acting bitince `aimAngle`'ı hareket açısına bırakıyor | **Hazır** |
| Walk 8 kare, fps 10, loop | `frame` getter walk'ta **her zaman 0** döndürüyor | **Yeni**: walk kare seçimi |
| Attack/skill kare + fps metadata'dan | `attackFrames: 6`, `attackFps: 22`, `skillFps: 16` **koda gömülü** | Metadata'dan oku |
| Renderer hop/bob/bounce/squash **uygulamaz** | Sahne `hopOffset`, `swayOffset`, `squashY` uyguluyor | **Kaldırılacak** (bkz. §3) |
| `releaseFrame` ile projectile timing | Mermi cast anında çıkıyor | releaseFrame varsa geciktir, null ise **tahmin etme** |
| dead atlası | `dead` state duruş karesini gösteriyor | dead atlasına bağla |
| idle atlası | idle = attack sayfasının 0. karesi ("yay inik" pozu) | idle atlasına bağla |

---

## 2. Zaten doğru olan üç şey (dokunulmayacak)

**Anchor.** Poster `footAnchorY = 264` diyor. P1.1.4'te "karakter havada duruyor"
sorununu düzeltirken mevcut legacy sayfalarını ölçmüştüm: içerik **tam olarak
y = 264**'te bitiyordu. Yani spec bizim kare düzenimizden türemiş; anchor kodu
olduğu gibi çalışacak, sadece sabit yerine metadata okunacak.

**Facing ayrımı.** Spec §10'un istediği "saldırıda hedef yönü öncelikli, bitince
hareket yönüne dön" davranışı P1.1.4'te zaten var ve testi mevcut
(`yürürken bakış hareket yönünü izler, saldırı bitince serbest kalır`).

**Tetikleme disiplini.** "Attack başarısızsa animasyon başlamaz" kuralı
`PrototypeState.performBasic/performSkill` kapılarıyla sağlanıyor; hareket bu yolu
hiç çağırmıyor. Testleri var (`BAŞARISIZ / menzil dışı saldırı animasyon tetiklemez`,
`Genie KAPALI + hareket → hiçbir saldırı animasyonu üretilmez`).

---

## 3. Kaldırılacak: prosedürel adım efektleri

P1.1.4'te gerçek walk animasyonu **olmadığı için** şunlar üretilmişti:

```
hopOffset · swayOffset · squashY · shadowScale · footPlanted (toz)
+ mesafeye bağlı stride fazı (strideWorld = 46 birim)
```

Spec §8 renderer'ın `hop/bob/bounce/squash` uygulamasını **yasaklıyor** — çünkü
gerçek walk karelerinde dikey hareket zaten çizimin içinde; ikisi üst üste binerse
çift zıplama olur.

**Plan:** bu efektler silinmez, **kapıya alınır**:

```
gerçek walk atlası yüklü mü?
  evet →  hop/sway/squash = 0,  kare = walk atlasından
  hayır → mevcut P1.1.4 davranışı (fallback)
```

Böylece atlas gelmeden preview bozulmaz, atlas gelince otomatik doğru davranış olur.
Gölge nabzı ve toz: `contactFrames` metadata'da **verilmişse** o karelerde üretilir,
**verilmemişse hiç üretilmez** (tahmin yok — `releaseFrame` ile aynı prensip).

### 3.1 Kare seçimi: fps mi, mesafe mi?

Spec §3 `fps = 10, loop = true` diyor; implementasyon bunu **varsayılan** alacak.

Ama not: fps-kilitli oynatmada ayak kayması (foot sliding) hız uyuşmazlığından doğar.
`playerSpeed = 210 birim/sn`, 8 kare @ 10 fps = 0.8 sn/döngü → **döngü başına 168 birim**.
Sanat 2 adım/döngü ise adım başına 84 birim. Bu değer gerçek çizimdeki adım
uzunluğuyla örtüşmezse ayak kayar.

Teslim geldiğinde ölçülüp iki koldan biri seçilecek:
1. `playerSpeed` veya `walk.fps` ayarlanır (tercih edilen, veri değişikliği), **veya**
2. metadata'ya opsiyonel `distanceLocked: true` + `strideWorld` eklenir ve kare
   seçimi mesafeden türetilir (P1.1.4'teki stride mantığının aynısı, ama sahte
   zıplama olmadan).

Bu karar **art ölçülmeden verilmeyecek**.

---

## 4. Dokunulacak dosyalar (tahmini)

| Dosya | Değişiklik |
|---|---|
| `experiments/eternal-ko-prototype/data/proto-assets.ts` | 8 sayfa anahtarı → 5 atlas anahtarı + `directionRows` eşleme tablosu + metadata yükleme |
| `experiments/eternal-ko-prototype/world/PlayerAnimation.ts` | kare sayısı/fps/loop metadata'dan; `walk` kare seçimi; hop/sway/squash fallback'e alınır; `move` → `walk` |
| `experiments/eternal-ko-prototype/scenes/WorldPrototypeScene.ts` | çizimde `sy = row × frameH`; hop/sway/squash kaldırma; dead/idle atlası |
| `experiments/eternal-ko-prototype/world/WorldCombatAdapter.ts` *(opsiyonel)* | `releaseFrame` varsa mermi spawn'ını geciktirme |
| `package.json` | `build:proto --manifest` zaten var; 5 yeni anahtar eklenecek |
| testler | yön eşleme tablosu testi, metadata-driven kare testi, "renderer hop uygulamıyor" testi |

**Etkilenmeyen:** CombatSystem, SkillSystem, Genie, LootPolicy, TrainingDummy,
MobSlotSystem, kamera, hareket, ana Faz 6.1.

---

## 5. Atlas boyutu / bellek notu (karar değil, bilgi)

Spec §13 gereği ilk entegrasyonda **kırpma yapılmayacak**. Kayıt için ölçüm:

| | değer |
|---|---|
| toplam kare | 176 |
| WebP tahmini | ~1.4 MB (mevcut sayfalardan kare başı ~8 KB ölçüldü) |
| preview'e gömülü (base64) | ~1.9 MB → prototip preview ~3.5 MB'dan ~5.4 MB'a çıkar |
| canvas/GPU (RGBA, 300×300×176) | ~60 MB |

Optimizasyon aşaması geldiğinde `trim + daha küçük kare` bu son satırı ~23 MB'a
indiriyor. **Şimdi yapılmayacak** — animasyon doğruluğu önce.

---

## 6. Doğrulama aracı

`tools/validate-archer-sprites.mjs` — `npm run validate:archer`

- **Bağımlılık yok**: PNG çözümü `node:zlib` ile elle yazıldı (registry 403 olduğu için
  kütüphane eklenemiyor).
- **Kaynak PNG üzerinde çalışır** (spec §12): pixel-identical duplicate ve boş-kare
  tespiti kayıplı WebP'de güvenilir değil. Klasörde yalnız `.webp` varsa açıkça
  "PNG kaynak teslim edin" der.
- **Hiçbir dosyayı silmez/değiştirmez.** Perceptual benzerlik **WARN**, pixel-identical
  **FAIL**.
- Atlas yoksa nazikçe çıkar (exit 0) — kalite kapısı kırmızı yanmaz. Bu yüzden
  `verify` zincirine **bilerek eklenmedi**.
- `--selftest`: sentetik fikstürlerle aracın kendisini doğrular (temiz / hepsi aynı /
  A B A B / boş kare / alfa yok / yanlış boyut) — **6/6 geçiyor**.
- `--make-fixture [klasör]`: aracı uçtan uca denemek için sentetik örnek üretir
  (gerçek sanat değildir, asset klasörlerine yazmaz).

---

## 7. TODO — animasyon eşlemesi (atlaslar geldiğinde)

Şu an runtime'da **hiçbir şey değiştirilmedi**; bu bölüm P1.1.5 entegrasyonu için nottur.

ARCHER COMBAT V1 ile normal atış artık ayrı bir "basic attack" değil, gerçek bir
skilldir (**Standart Atış**, Archery 102003). Atlaslar geldiğinde animasyon eşlemesi
şöyle olmalı:

| Skill | Atlas |
|---|---|
| **Standart Atış** (102003) | `archer_attack` — normal ok atışı |
| Diğer 14 okçu skilli | `archer_skill` — skill cast animasyonu |

Yani ayrım **"basic mi skill mi"** değil, **"hangi skill"** üzerinden yapılacak:
`sourceRef === ARCHER.STANDART_ATIS ? 'attack' : 'skill'`.

`PlayerAnimator` bugün zaten iki ayrı state tutuyor (`attack` / `skill`) ve tetik
`PrototypeState.performSkill()` üzerinden geliyor; tek gereken, tetikte hangi state'in
seçileceğine skill ref'ine bakarak karar vermek. **Şu an `performSkill` her zaman
`triggerSkill()` çağırıyor** — Standart Atış dahil. Atlaslar gelmeden değiştirilmedi,
çünkü mevcut tek sayfada iki state görsel olarak zaten ayırt edilemiyor.

Ek not: `archer_skill` animasyonu **element-nötr** olmalı (bkz. master poster
değerlendirmesi) — 15 skill farklı elementlerde (ateş / zehir / fiziksel / çok-ok)
ve tek bir baked mavi efekt hiçbirine uymaz. Renk/trail/glow gameplay FX katmanından
gelmeli.

---

## 6. P1.2.2 SONRASI DURUM (22 Ağu 2026)

§1 tablosundaki "Aksiyon" sütununun tamamı **uygulandı** — asset'ten bağımsız
olarak. Gerçek atlas geldiğinde kod değişikliği beklenmiyor; iş dosya değişimi +
`npm run validate:archer` + `archer_animation.json` yüklemesi.

| §1'deki aksiyon | P1.2.2 |
|---|---|
| Sayfa tablosu → satır tablosu | ✅ `RUNTIME_INDEX_TO_ATLAS_ROW`, testli |
| Kare sayısı/fps/loop metadata'dan | ✅ `ArcherAtlasMeta`, koda gömülü değil |
| Walk kare seçimi | ✅ `frame` getter walk klibini oynatıyor |
| hop/sway/squash kaldırma | ✅ atlas aktifken 0/0/1, fallback korundu |
| `releaseFrame` varsa geciktir, null ise tahmin etme | ✅ `atReleaseFrame`, null → daima false |
| dead/idle atlasına bağlama | ✅ `STATE_CLIP`, ölüm çapası dondurma |
| `move` → `walk` adlandırması | ✅ state `move` kaldı, `clip` getter `walk` döndürüyor |

### 6.1 Standart Atış / diğer skiller — animasyon ayrımı (P1.2.1 TODO'su kapandı)

P1.2.1'de "ileride Standart Atış `attack`, diğerleri `skill` animasyonu kullanacak"
notu bırakılmıştı. **P1.2.2'de uygulandı:** `clipForSkillRef(sourceRef)`.
`ATTACK_CLIP_REFS = [102003]`; başka bir skill ATTACK klibine geçmek isterse bu
listeye eklenir — dallanma kodda çoğaltılmaz.

### 6.2 Hâlâ AÇIK olan tek karar

**Walk: zaman kilidi mi mesafe kilidi mi?** (§3.1). Varsayılan metadata fps (10).
`PlayerAnimator.walkDistanceLock` alternatifi hazır ve testli ama KAPALI.
Gerçek atlas geldiğinde adım uzunluğu ölçülüp karar verilecek — tahmin edilmeyecek.
