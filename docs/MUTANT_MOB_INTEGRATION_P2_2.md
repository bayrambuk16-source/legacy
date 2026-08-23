# MUTANT MOB + DUMMY KALDIRMA — P2.2

**Kapsam:** prototip (`experiments/eternal-ko-prototype/`).
**GLB'ler YENİDEN OPTİMİZE EDİLMEDİ** — animasyon / kemik / doku verisine dokunulmadı.

**İzolasyon:** `src/` DEĞİŞMEDİ · kaynak DB/JSON DEĞİŞMEDİ ·
`dist/preview.html` md5 `0399549684eec7137f46cee73c318710` (P1.2'den beri aynı).

---

## 1. Ne yapıldı

1. **Mutant GLB gerçek mob görseli oldu.** 8 farm slotunun tamamı artık
   `mutant_mobile_v1.glb` ile çiziliyor; AI tipi yalnız ÖLÇEĞİ değiştiriyor.
2. **Training dummy prototipten TAMAMEN çıkarıldı** — sistem, UI, DEV
   düğmesi, test alanı çizimi, `WorldMob` alanları ve telemetri araçlarındaki
   izleri dahil.
3. **Combat ölçer gerçek moba bağlandı.** `TrainingStats` → `CombatMeter`;
   panel artık "COMBAT ÖLÇER — SEÇİLİ MOB".
4. **Oyuncuda ATTACK / SKILL state'i ayrıldı** (Standart Atış ↔ diğer okçu
   skilleri).
5. Gameplay otoritelerinin HİÇBİRİNE dokunulmadı: `MobAi`, `MobSlotSystem`,
   `WorldTargetSystem`, `CombatPipeline`, `Genie`, `DropSystem`,
   `WorldMovementSystem` aynen duruyor.

---

## 2. Mutant varlık gerçekleri (manifest authoritative)

`mutant_mobile_v1.manifest.json` repoya `data/mutant-manifest.json` olarak
alındı; `data/mutant-model.ts` yalnız onu tipli hale getirir. Hiçbir değer
elle yazılmadı.

| Alan | Değer |
|---|---|
| dosya | `mutant_mobile_v1.glb` · **822 716 bayt** |
| sha256 | `50f1e7bf726bad773912bfdfc623e4c4a7a5080c1914d0e5d03ff25c4091f01b` |
| vertex / üçgen | **6 928 / 11 271** |
| mesh / materyal / draw call | **1 / 1 / 1** |
| skin joint / iskelet node | **30 / 32** |
| klip | **8** |
| doku | 512×512 WebP (+ gömülü JPEG fallback) |
| eksen | Y-up · +Z forward |
| boy | **1,861 m** |
| decoder bağımlılığı | **YOK** (`extensionsRequired` boş) |

Yükleme, P2.1'de kurulan `fetch`-siz / `blob`-suz yolu AYNEN kullanır
(`data:` URI → `atob` → `GLTFLoader.parse`, gömülü görseller `data:` URI'ye
taşınmış). Bu yüzden mutant da araya girilmiş `fetch`/`createObjectURL`
ortamında sorunsuz yükleniyor.

---

## 3. Animasyon eşlemesi

### 3.1 Mob — 8 klip

Eşleme TEK YERDE: `render3d/MutantAnimator.ts` → `MUTANT_CLIP_MAP`.

| MobAi fazı | Klip | Kip |
|---|---|---|
| `IDLE` | `01_IDLE` | LoopRepeat |
| `IDLE` (15 sn+ kesintisiz) | `02_IDLE_BREATHE` | LoopRepeat |
| `ROAM`, `RETURN` | `03_WALK` | LoopRepeat |
| `CHASE` | `04_RUN` | LoopRepeat |
| `ATTACK` | `06_ATTACK_PUNCH` *(seçim kuralı §3.2)* | LoopOnce |
| `AGGRO` (yükselen kenar) | `07_ROAR` | LoopOnce, harekette kesilir |
| `DYING`, `DEAD` | `08_DEATH` | LoopOnce + **clamp** |
| `RESPAWN` | tam sıfırlama → `01_IDLE` | — |

**Klip ailesi AI'ın KENDİ anlamından, oynatma hızı ÖLÇÜMDEN gelir:**

| faz | ölçülen hız | klip | kaynak | timeScale |
|---|---:|---|---:|---:|
| ROAM / RETURN | 1,90 m/sn | `03_WALK` | 1,214 | ×1,57 |
| CHASE | 2,60 m/sn | `04_RUN` | 2,205 | ×1,18 |

Hız gameplay'e sorulmaz; renderer konum farkından ölçer. `MobAiProfile`
hızları (`moveSpeed 55`, `chaseSpeed 75/80`) DEĞİŞMEDİ.

### 3.2 Saldırı klibi seçimi — uydurulmadı

Sabit bir eşleme yazılmadı. Manifestteki **ölçülmüş** `hitTimeSec` ile
`MobAiProfile.hitMomentSec` arasındaki fark en küçük olan klip seçilir:

| klip | ölçülmüş vuruş | profil (0,45 sn) farkı |
|---|---:|---:|
| `06_ATTACK_PUNCH` | 0,267 sn | **0,183** ← seçilen |
| `05_ATTACK_SWIPE` | 1,300 sn | 0,850 |

Bu, manifestin kendi önerisiyle (punch = basic) örtüşür. Ağır bir profil
(`hitMomentSec` ≈ 1,2) tanımlanırsa AYNI kural `05_ATTACK_SWIPE`'ı seçer —
tabloyu elle değiştirmek gerekmez. **`05_ATTACK_SWIPE` yüklü ama şu anki
profillerle seçilmiyor.**

**Vuruş hizalaması:** `MobAi` vuruşu `hitMomentSec` (0,45 sn) sonunda düşürür.
Klip, windup sayacı klibin vuruş anına (0,267 sn) inince başlatılır → yumruğun
teması gameplay vuruşuyla AYNI KAREYE gelir. Gameplay zamanlaması
DEĞİŞTİRİLMEDİ.

### 3.3 Oyuncu — ATTACK / SKILL ayrımı

`ArcherAnimator` artık mantıksal state taşıyor: `IDLE · MOVE · ATTACK ·
SKILL · AIM · HIT · EQUIP · DISARM · DEATH`. Ayrım **kaynak referansından**
gelir (P1.2.2 kuralı aynen): `clipForSkillRef(102003) === 'attack'`, diğer 14
okçu skilli `'skill'`.

| state | klip |
|---|---|
| ATTACK (Standart Atış) | `13_AIM_RECOIL` |
| SKILL (diğer archery skilleri) | `13_AIM_RECOIL` |

> **VARLIK BOŞLUĞU — AÇIKÇA BİLDİRİLİYOR.** `archer_mobile_v1.glb` **tek bir
> bırakma klibi** taşır. Pakette ikinci bir atış/cast animasyonu YOKTUR ve
> boşluğu kapatmak için hiçbir klip yeniden adlandırılmadı. İki state AYRI
> (telemetride ve testte görünür) ama bugün AYNI klibe çözülüyor. Gerçek bir
> skill klibi geldiğinde değişecek tek satır `ARCHER_CLIP_MAP.SKILL`'dir.
> Aynı dürüstlük kuralı mutantın eksik `HIT_REACT`'i için de geçerli.

---

## 4. Ölçek — P2.0 silüet hiyerarşisi korundu

Mutant tek bir varlıktır; AI tipi farkı yalnız ölçektir. Ölçek uydurulmadı,
`P2.0 placeholder yüksekliği / modelin doğal boyu` oranıdır:

| AI tipi | placeholder | ölçek | world yüksekliği |
|---|---:|---:|---:|
| NORMAL | 42 | ×22,569 | **42,0** |
| AGGRESSIVE | 52 | ×27,942 | **52,0** |
| ELITE | 72 | ×38,689 | **72,0** |

Metre↔world köprüsü Archer ile AYNI (`WORLD_UNITS_PER_METER = 28,873`);
ikinci bir ölçek sabiti tanımlanmadı.

---

## 5. Ölüm → ceset → loot → respawn

`08_DEATH` tek `rootMotionRemoved: false` klibidir ve 0,87 m'lik geriye
düşüş taşır. Bu **model-yerel sunumdur**; mob konum otoritesi `MobAi` /
`MobSlotSystem`'de kalır.

- Klip `LoopOnce + clampWhenFinished` — ceset son pozda durur, **asla loop
  etmez** (ilk/son poz farkı 91,2°, loop ederse patlardı).
- Kaynaktan gelen **0,0705 m zemin batması** ölüm boyunca **+0,075 m GÖRSEL Y
  ötelemesiyle** kapatıldı. Gameplay zemin/çarpışma sistemine YAZILMAZ.
- **P2.0'da ölü mob görseli siliniyordu; P2.2'de ceset YAŞAR.** Görsel,
  mob respawn olunca yeni bir `uid:generation` aldığı için kendiliğinden
  silinir — eski poz yeni nesle SIZAMAZ (test edilir).

Ölçülen: ölüm anında `deathActive = 1`, ceset klibi `08_DEATH`,
`drops.totals.kills = 1`, respawn sonrası yeni uid + nesil, `deathActive = 0`
ve yeni nesil ölüm pozunu devralmıyor.

---

## 6. Performans — geometri/materyal paylaşımı

Örnekler `three/addons/utils/SkeletonUtils.js` → `clone()` ile üretilir:
düğüm grafiği + skeleton KOPYALANIR (her mobun kendi pozu olsun diye),
`BufferGeometry` ve `Material` **tek kopya paylaşılır**. Test bunu nesne
kimliğiyle doğrular (`geometry === geometry`, `material === material`).

`SkeletonUtils.js` vendor'a eklendi ve `VENDOR.json` bütünlük kaydına girdi
(artık 5 dosya, sha256 doğrulamalı). CDN yok.

**60 sn respawn döngüsü ölçümü:**

| Ölçüm | Değer |
|---|---:|
| mob örnek TEPESİ | **8** |
| görsel üretilen / silinen | 128 / 120 |
| canlı görsel | **8** |

Tarayıcıda (SwiftShader): 8 mob + oyuncu → **draw call 5–8 · üçgen
33 364–43 876 · geometri 4–7**. Mixer bağları örnek silinirken
`uncacheRoot` + `uncacheClip` ile çözülür.

---

## 7. Training dummy nasıl kaldırıldı

| Adım | Sonuç |
|---|---|
| `world/TrainingDummy.ts` | **silindi** |
| `world/TrainingStats.ts` | `world/CombatMeter.ts` olarak yeniden adlandırıldı (`TrainingStats` → `CombatMeter`) |
| `PrototypeState.dummies` · `.training` | kaldırıldı → `.meter` |
| `entities()` | artık yalnız `mobs.mobs` |
| `WorldMob.isDummy` · `.infiniteHealth` | tip sözleşmesinden **silindi** |
| `state.ts` kukla kapıları (`if (m.isDummy) continue`) | kaldırıldı |
| Sahne: kukla çizimi · TEST ALANI katmanı · `Dummy Combat Radius` DEV düğmesi | kaldırıldı |
| Sahne paneli | "HASAR KUKLASI — TEST" → **"COMBAT ÖLÇER — SEÇİLİ MOB"**, yalnız GERÇEK mob seçiliyken görünür |
| `tools/balance-telemetry.ts` | kukla yerine gerçek mob kaydı (aynı 26/60 hitbox yarıçapları korundu → seri karşılaştırılabilir) |
| `tools/combat-feel-telemetry.ts` · `farm-loop-telemetry.ts` | kukla temizleme satırları kaldırıldı |
| Testler | kukla blokları **gerçek mob** testleriyle DEĞİŞTİRİLDİ |

**Test bunu kilitliyor:** kaynak ağacı taranır; `isDummy`,
`TrainingDummySystem`, `S.dummies`, `TRAINING_AREA` geçen bir dosya kalırsa
test kırmızı yanar. Silinen dosyaların yokluğu ve `CombatMeter.ts`'in varlığı
da doğrulanır.

---

## 8. Test kapsamı

**481/481 prototip testi WebGL BAĞLAMI OLMADAN geçiyor** (P2.1'de 465).
Kukla testleri silinmedi, **karşılıkları yazıldı**:

| Eski (kukla) | Yeni (gerçek mob) |
|---|---|
| kuklalar ayrı listede | ölçüm hedefi GERÇEK mob listesinde + `S.dummies` YOK |
| kukla target seçilebilir | mob target seçilebilir (dokunma + en-yakın) |
| kukla hasar alır ama ölmez | mob CombatSystem üzerinden hasar alır |
| çok-ok kuklaya işler | çok-ok mob üzerinde işler + ölçer telemetrisi |
| DEV hitbox 18/26/40/60 | hitbox yarıçapı isabeti değiştirir (26 vs 60) |
| kukla loot üretmez | CANLI mob loot üretmez **+ GERÇEK ÖLÜM → GERÇEK LOOT** (yeni) |
| Genie kuklayı hedefler | Genie gerçek mobu hedefler (3 senaryo) |

**P2.2'de eklenen yeni testler (21):** mutant varlık gerçekleri · 8 klip ve
ölçülmüş vuruş anları · eksik klip işareti · ölçek hiyerarşisi · saldırı
klibi seçim kuralı · faz→klip ailesi ve timeScale · vuruş hizalaması ·
ölüm/clamp/Y-ötelemesi · aggro kükremesi ve kesilmesi · nefes klibi ·
GLB çözümü (8 klip / 30 joint / 4 kemik) · geometri-materyal paylaşımı ·
uçtan uca faz→klip · ölüm→ceset→loot→respawn kimlik sızıntısı · örnek
sızıntısı ve dispose · uzun oturum tepe sayısı · **üç kipli parity** ·
ATTACK/SKILL state ayrımı · kaynak-referansı klip ayrımı · kukla kaynak
taraması · combat ölçer.

`npm test` (ana oyun): **106/106**.

**Parity üç kipte birebir:** 20 sn deterministik farm senaryosu renderer
KAPALI · AÇIK+silindir · AÇIK+**gerçek mutant** koşuldu; oyuncu konumu, HP,
EXP, coin, hedef, Genie durumu, kill/item, yerdeki ganimet ve her mobun
uid/nesil/HP/AI durumu **farksız**.

---

## 9. Tarayıcıda doğrulananlar

Playwright + SwiftShader, **kullanıcının ortamının taklidiyle**
(`window.fetch`, `new Request` ve `URL.createObjectURL` üçü de
DataCloneError / `blob-request://`):

- Archer ve mutant **ikisi de dokusuyla** render oluyor, konsolda hata YOK
- Renderer paneli: `player ready → GLB`, `mob_normal/aggressive/elite ready → GLB`
- `MUTANT MOB (P2.2): 8 örnek · 8/8 klip`, saldırı klibi `06_ATTACK_PUNCH`
  (hizalama −0,183 sn), `EKSİK KLİP (uydurulmadı): HIT_REACT`
- Genie mutantı hedefleyip saldırıyor; **COMBAT ÖLÇER — SEÇİLİ MOB** paneli
  gerçek mob üzerinde ölçüyor (5 cast · 744 hasar · DPS 93,6)
- Gerçek kill → gerçek drop/altın log'da (`Yaban Sıçanı#4 → 0 drop · 60 altın`)
- Ölüm anında telemetride `08_DEATH`, `ölüm sunumu 5` (3 canlı + 5 ceset = 8 örnek)
- DEV → `Oyuncu: GLB` ve `Mob: MUTANT` düğmeleriyle canlı fallback geçişi

---

## 10. Bilinen sınırlar

1. **`HIT_REACT` YOK.** Creature Pack (2) içinde hiçbir hasar tepkisi
   animasyonu yok (manifest `missingClips`). Mob hasar alınca klip
   DEĞİŞMEZ — uydurulmadı. P2.3 öncesi Mixamo'dan indirilmeli.
2. **Archer'da ikinci atış klibi YOK.** ATTACK ve SKILL ayrı state ama aynı
   klip (§3.3).
3. **`05_ATTACK_SWIPE` yüklü ama kullanılmıyor** — mevcut profillerin vuruş
   anı (0,45 sn) punch'a yakın. Ağır saldırı profili tanımlanırsa kural onu
   otomatik seçer.
4. **Blend katmanı hâlâ yok** (P2.1 sınırı). Üst/alt gövde ayrı katmanda
   oynatılamıyor; bu yüzden mob saldırırken bacaklar duruyor.
5. **8 slotun tamamı mutant.** Görev "tek player + tek mutant yeterli"
   diyordu; "farm alanı mantığı bozulmasın" kuralı ve mevcut test kapsamı
   nedeniyle 8 slot KORUNDU ve hepsi mutant görseliyle çiziliyor. Tek mob
   isteniyorsa bu bir veri kararıdır (`data/farm-area.ts`) ve ayrıca
   söylenmeli — kendiliğinden silinmedi.
6. **FPS ölçümü bu ortamda anlamsız** — GPU yok, SwiftShader ile 20 FPS.
   Gerçek cihaz ölçümü YAPILMADI.
7. **Ölüm görseli tarayıcıda göz kanıtı olarak yakalanmadı**; ölüm davranışı
   headless test + telemetri paneliyle (`ölüm sunumu 5`) doğrulandı.
8. **`03_WALK` loop dikişi 1,40 cm** (manifest). 0,2 sn crossfade
   kullanılıyor, sert kesme yapılmıyor.

---

# P2.3 — COMBAT ÖLÇER KALDIRILDI + OK GÖRSELİ DÜZELTİLDİ

## 11. Combat ölçer kaldırıldı

`world/CombatMeter.ts` silindi · `PrototypeState.meter` kaldırıldı · panel,
`RESET STATS` düğmesi, `recordMeter()` ve `renderMeter()` gitti.

**`SONSUZ MP` anahtarı SİLİNMEDİ** — ölçüm panelinin içinde yaşıyordu, DEV
paneline taşındı (`DEV_TOGGLE_TOP + 80`). Kaybolan bir araç yok.

Bir test kaynak ağacını tarıyor: `CombatMeter`, `S.meter` ya da
`DPS_WINDOW_SEC` geçen bir dosya kalırsa kırmızı yanıyor.

## 12. Ok görseli — üç ölçülmüş kusur

### 12.1 Ok YANLIŞ YÖNE bakıyordu (P2.0'dan beri)

Eski kod: `rotation.set(π/2, 0, −atan2(dirY, dirX))`. Bu, okun eksenini
**45° köşegeni etrafında aynalıyordu**. Ölçüm:

| uçuş açısı | okun baktığı yön | sapma |
|---:|---|---:|
| 0° | (0, 0, 1) | **90,0°** |
| 45° | (0.71, 0, 0.71) | 0,0° |
| 90° | (1, 0, 0) | **90,0°** |
| 180° | (0, 0, −1) | **90,0°** |
| 270° | (−1, 0, 0) | **90,0°** |

Yalnız 45°'de doğruydu — P2.0'ın varsayılan kamera açısı 45° olduğu için
gözden kaçmıştı.

**Düzeltme:** geometri kurulurken yerel **+Z**'ye döndürülüyor, renderer
yalnız `yaw = facingToYaw(uçuşAçısı)` uyguluyor. Euler numarası kalmadı.
Test 8 açıda sapmanın **< 0,5°** olduğunu doğruluyor.

### 12.2 Ok yaydan çıkıp DALIYORDU

`ArrowSpawn` socketi ~41 birimde (1,4 m), eski kod ise ilk **0,12 saniyede**
sabit **26 birime** iniyordu — ok yaydan çıkar çıkmaz düşüyordu.

**Düzeltme:** iniş artık uçuşun TAMAMINA yayılıyor ve varış yüksekliği
**gerçek hedefin gövde ortası** (`MOB_STYLE[aiType].height / 2`). Hedef yoksa
(ıska) ok **düz uçuyor**. Bunun için `ProjectileView` üç alan daha taşıyor —
hepsi `CombatPipeline`'dan KOPYA: `targetUid`, `travelled`, `travelDistance`.

Yaydan çıkış karışımı da zaman yerine **katedilen mesafeye** bağlandı
(`ARROW_SPAWN_BLEND_WORLD = 45` birim ≈ 1,5 m) — kare hızından bağımsız.

### 12.3 Ok "havuç" gibi görünüyordu

Tek `ConeGeometry(3.5, 28, 6)` idi. Artık gövde (ince silindir) + uç (koni) +
iki yelek, `mergeGeometries` ile **tek tampona** birleştiriliyor:
silüet düzeldi, **draw call AYNI kaldı** (ok başına 1 sahne nesnesi — testli).

### 12.4 Socket matrisi BİR KARE BAYATTI

Ok, `ArrowSpawn` socketinin dünya konumundan doğuyor ama o matris
`scene.updateMatrixWorld()` ile karenin SONUNDA tazeleniyordu — ok bir kare
eski (ilk karede hiç kurulmamış) bir noktadan çıkıyordu. Ok döngüsünden önce
`playerRoot.updateMatrixWorld(true)` eklendi.

## 13. Build hattında sessiz düşüş düzeltildi

`three/addons/utils/BufferGeometryUtils.js` alias'ı `tools/build.mjs`'e
eklenmemişti; **esbuild düştü ve build sessizce yedek bundler'a geçti**.
Alias eklendi ve esbuild hatası artık TAM olarak basılıyor — yapılandırma
kusuru bir daha sessizce yedeğe kaymaz.

## 14. P2.3 doğrulaması

- **481/481** prototip testi (5 yeni ok/ölçer testi eklendi, 5 ölçer testi
  kaldırıldı) · `npm test` 106/106
- `dist/preview.html` md5 `0399549684eec7137f46cee73c318710` — değişmedi
- Tarayıcı (düşman ortam: `fetch`, `Request`, `createObjectURL` üçü de kırık):
  konsolda hata YOK, ölçüm paneli ekranda YOK, ok uçuş yönünde ve ok
  silüetinde görünüyor

## 15. P2.3 sınırları

1. **Ok hâlâ primitive.** Gerçek bir ok GLB'si verilirse aynı yere bağlanır;
   şu an gövde/uç/yelek elle kuruluyor.
2. **Ok eğimi (pitch) YOK.** İniş uçuşa yayıldığı için eğim ~2–3°; ok yalnız
   yaw ile döndürülüyor. Ölçüldü, ihmal edildi.
3. Ölçüm paneli kalktığı için DPS/cast sayaçları artık **yalnız telemetri
   araçlarında** (`npm run telemetry:archer`) ölçülüyor.

---

# P2.4 — GERÇEK OK MODELİ

## 16. Önce kontrol: varlık uygun mu?

Bağlamadan önce manifestin her iddiasını ölçtüm. Hepsi tuttu:

| Manifest iddiası | Ölçülen | |
|---|---|---|
| statik mesh, animasyon yok | 0 klip, skinned mesh yok | ✔ |
| 1 mesh / 1 materyal / 1 draw call | 1 / 1 / 1 | ✔ |
| 82 vertex · 80 üçgen | 82 / 80 | ✔ |
| attribute: POSITION/NORMAL/TEXCOORD_0 | position, normal, uv | ✔ |
| nock düzlemi tam `z = 0` | bbox min z = 0.0000 | ✔ |
| uzunluk 0,7504 m, +Z boyunca | bbox Z = 0.7504 | ✔ |
| uç `(0, 0, 0.7504)` | `arrow_tip` düğümü (0, 0, 0.7504) | ✔ |
| `arrow_nock` / `arrow_tip` düğümleri | ikisi de var | ✔ |
| `alphaMode MASK`, cutoff 0.5 | `material.alphaTest = 0.5` | ✔ |
| `doubleSided` | `side = 2` (DoubleSide) | ✔ |
| zorunlu extension yok | `extensionsRequired` boş | ✔ |

**Neden sorunsuz oturdu:** varlığın yönelimi projenin kendi sözleşmesiyle
birebir aynı — **+Z ileri**. P2.3'te primitive ok geometrisi de yerel +Z'ye
bakacak şekilde kurulmuştu (renderer yalnız yaw uygular), bu yüzden gerçek
mesh **ek bir dönüşüm yapılmadan** yerine geçti.

## 17. Tek uyarlama: orijin NOCK'tan UCA

Varlığın orijini NOCK'tadır (arka uç). Gameplay'in otoritatif projectile
konumu ise okun **vurduğu** noktadır — yani uç. Geometri yüklenirken bir kez:

```
geometry.scale(28,873)                    // metre → world birimi
geometry.translate(0, 0, −21,67)          // orijin: nock → UÇ
```

Manifestin kendi entegrasyon notu da bunu söylüyor: *"If your projectile
integrates the tip rather than the nock, offset by that vector."*

Sonuç: görsel kök otoritenin konumunda, gövde arkada — uçan ok için doğru
duruş. Test bunu 1e-9 hassasiyetle doğruluyor.

## 18. Tek sahne nesnesi korundu

GLB'nin **düğüm grafiği KOPYALANMAZ**. `attachArrow()` yalnız tek mesh'in
geometrisini (klonlanıp ölçeklenmiş) ve materyalini alıp mevcut **paylaşılan**
projectile yoluna takar. Böylece:

- ok başına **1 sahne nesnesi** (P2.3'teki gibi) — testli
- `arrow_nock` / `arrow_tip` işaretçileri sahneye **sızmaz**
- 10 ok = 10 nesne · 21,67 world birimi uzunluk (0,7504 m gerçek ölçü)

Alfa `MASK` (blend değil) olduğu için sıralama sorunu yok; `doubleSided`
GLTFLoader tarafından kuruluyor ve tüyler iki taraftan da görünüyor.

Havadaki oklar model açılıp kapanınca **yeniden doğmaz** — geometri/materyal
yerinde değişir (`rebuildProjectileVisuals`).

## 19. P2.4 doğrulaması

- **488/488** prototip testi (6 yeni ok testi) · `npm test` 106/106
- `dist/preview.html` md5 `0399549684eec7137f46cee73c318710` — değişmedi
- **Ok modeli parity:** 15 sn deterministik farm senaryosu primitive silüet vs
  gerçek model — HP/EXP/coin/kill/item ve her mobun uid/nesil/HP/AI durumu
  **farksız**
- Yön testi gerçek mesh ile 8 açıda tekrarlandı: sapma **< 0,5°**
- Tarayıcı (düşman ortam): konsolda hata yok, ok yaydan çıkıp hedefe doğru
  uçuyor
- DEV → `Ok: MODEL / PRIMITIF` anahtarıyla canlı geçiş

## 20. P2.4 sınırları

1. **Ok eğimi (pitch) hâlâ yok** — iniş açısı ~2–3°, yalnız yaw uygulanıyor.
2. **Hedefe saplanma yok.** Manifest bunun için bir formül veriyor
   (`hitPoint − dir × 0,7504 × 0,85`) ama impact'te ok görseli SİLİNİYOR;
   saplı ok bir gameplay/görsel kararıdır, istenmedi, uydurulmadı.
3. **Nişan sırasında kirişte ok YOK.** Manifest `nock` socketine kimlik
   transformuyla takılabileceğini söylüyor; `11_DRAW_ARROW` / `12_AIM_OVERDRAW`
   oynarken kirişte duran ok EKLENMEDİ — istenmedi.
4. **Normal map yok** (varlıkta bilinçli olarak yok), gövde bükülemez ve üç
   non-manifold kenar var — üçü de manifestin bildirdiği, render için zararsız
   sınırlar.
