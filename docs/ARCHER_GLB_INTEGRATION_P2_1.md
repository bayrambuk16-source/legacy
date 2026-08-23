# ARCHER GLB ENTEGRASYONU — P2.1

**Kapsam:** prototip (`experiments/eternal-ko-prototype/`).
**GLB YENİDEN OPTİMİZE EDİLMEDİ** — animasyon / kemik / doku verisine dokunulmadı.

**İzolasyon:** `src/` DEĞİŞMEDİ (three / render3d / GLTFLoader importu YOK) ·
kaynak DB/JSON DEĞİŞMEDİ · `dist/preview.html` md5
`0399549684eec7137f46cee73c318710` (P1.2'den beri aynı; `tools/pack-preview.mjs`
değiştikten SONRA yeniden derlenip doğrulandı).

---

## 1. Varlık ve manifest

`archer_mobile_v1.manifest.json` bu projede **authoritative metadata**'dır:
`experiments/eternal-ko-prototype/data/archer-manifest.json` olarak repoya
alındı ve `data/archer-model.ts` yalnız onu TİPLİ hale getirir. Kemik adı,
socket ofseti, klip süresi, kaynak hız ve bilinen kusur — hiçbiri elle
yazılmadı, hepsi manifestten okunur.

| Alan | Değer |
|---|---|
| dosya | `archer_mobile_v1.glb` · **929 200 bayt** |
| sha256 | `f48f0ebca9d3c405623f2a325deb0439a3903808754929845b492da84f661ff4` |
| vertex / üçgen | **12 240 / 20 820** |
| mesh / primitive / materyal / draw call | **1 / 1 / 1 / 1** |
| kemik / klip | **23 / 17** |
| doku | **512×512 WebP** (+ gömülü JPEG fallback) |
| eksen | **Y-up · +Z forward** |
| karakter yüksekliği | **1,801 m** |
| decoder bağımlılığı | **YOK** — `extensionsRequired` boş (Draco/Meshopt/KTX2 yok) |

Yükleme yolu: `vendor/three@0.169.0` → `three/addons/loaders/GLTFLoader.js`.
Önizleme paketinde GLB `model/gltf-binary` data URI olarak GÖMÜLÜR
(`tools/pack-preview.mjs` yalnız `.glb` MIME kaydıyla genişletildi; ana oyunun
manifestinde model YOKTUR, bu yüzden ana çıktı bit-bit aynıdır).

### 1.1 `fetch` yükleme yolundan ÇIKARILDI (gerçek kusur)

İlk sürüm `GLTFLoader.load(url)` kullanıyordu. O yol Three'nin `FileLoader`
sınıfına gider ve `FileLoader` **bir `Request` nesnesi kurup** `fetch(req)`
çağırır (three 0.169.0, `three.module.js` ~44415).

Önizleme, `fetch`'in araya girildiği — isteği `postMessage` ile ana pencereye
ileten — bir görüntüleyicide açıldığında `Request` **yapısal olarak
klonlanamaz** ve model şu hatayla düşer:

```
DataCloneError: Failed to execute 'postMessage' on 'Window':
Request object could not be cloned.
```

`file://` ile açılan yerel Playwright testlerinde bu ortam YOKTU, bu yüzden
kusur ilk turda görünmedi. Yükleme yolu artık `fetch`'e HİÇ dokunmuyor:

| Girdi | Yol |
|---|---|
| `data:` URI (önizleme paketi) | `atob` ile YERİNDE çöz → `parse()` |
| diğer URL'ler | `XMLHttpRequest` (`Request` kurmaz) → `parse()` |

Doku yolu da aynı sebeple sabitlendi: `GLTFParser`, `createImageBitmap` varsa
`ImageBitmapLoader` (yine `fetch`) seçer. Bu global, parser kurucusu boyunca
geçici olarak gizlenir → `<img>` tabanlı `TextureLoader` seçilir. **Yan fayda:**
headless testler ile tarayıcı artık AYNI doku yolunu çalıştırır.

### 1.2 `blob:` de kullanılmıyor — ikinci kusur

Bu yetmedi. GLB dokusu `bufferView` içinde gömülüdür ve `GLTFLoader` onu
`new Blob([...])` → `URL.createObjectURL(blob)` → `<img src=…>` zinciriyle
çözer. Aynı görüntüleyici `URL.createObjectURL`'i de sarmalayıp
`blob-request://` şemasına yönlendiriyor; `<img>` o şemayı yükleyemiyor:

```
THREE.GLTFLoader: Couldn't load texture blob-request://blob-…
```

Model geliyor ama **dokusuz (beyaz)** görünüyordu. Çözüm `inlineGlbImages()`:
GLB'nin JSON parçası çözümlemeden ÖNCE yeniden yazılır; `bufferView` tabanlı
her görsel BIN parçasından çıkarılıp `data:` URI'sine taşınır (WebP birincil +
JPEG fallback = **2 görsel**). Böylece `GLTFLoader` `uri` dalına girer —
`Blob` de `createObjectURL` de HİÇ çağrılmaz.

**İkili veri DEĞİŞMEZ:** BIN parçası bit-bit kopyalanır; yalnız JSON
parçasındaki `images[]` kayıtları taşınır ve chunk uzunlukları düzeltilir.

### 1.3 Kanıt

**Headless test** — `fetch` DataCloneError fırlatacak, `URL.createObjectURL`
`blob-request://` döndürecek şekilde değiştirilip GLB gerçek data URI'sinden
yüklenir:

| Ölçüm | Sonuç |
|---|---:|
| `fetch` çağrısı | **0** |
| `URL.createObjectURL` çağrısı | **0** |
| klip / kemik | 17 / 23 |
| materyalde doku | **var** |

**Tarayıcı testi** — `window.fetch`, `new Request` VE `URL.createObjectURL`
üçü birden kullanıcının ortamındaki gibi kırılır; model dokusuyla birlikte
yüklenir, konsolda hata/uyarı YOK.

---

## 2. Ölçek köprüsü

Model metre ölçeğindedir; gameplay world birimi kullanır. P2.0 placeholder
kapsülü **52 world birimi** yüksekliğindeydi ve mob boyutları (42 / 52 / 72)
buna göre ayarlıydı. Dünyanın oranlarını KORUMAK için:

```
52 world birimi = 1,801 m   →   1 m = 28,873 world birimi
```

Ölçülen sonuç: modelin IDLE pozundaki dünya sınır kutusu **48,7 birim**
(diz kırık duruş; bind pozunda 52). Bu **yalnız görsel** bir karardır —
`playerSpeed = 120`, `playerRadius = 20`, menziller ve hitbox'lar DEĞİŞMEDİ.

---

## 3. Mimari — three sınırı korunuyor

```
render3d/
  coords.ts          CameraRig.ts     views.ts          ← three YOK
  VisualRegistry.ts  assets3d.ts      frame.ts          ← three YOK
  ArcherAnimator.ts  ★ 17 klip KARARI — three YOK, WebGL YOK
  ─────────────────────────────────────────────────────
  GlbLoader.ts       ★ three (GLTFLoader adaptörü)
  ArcherRig.ts       ★ three (mixer + action + socket)
  ThreeWorldRenderer.ts  ★ three
```

three importu **üç dosyada**dır ve bu testle kilitlidir. Karar katmanı
(`ArcherAnimator`) three'siz kaldığı için 17 klibin tamamı WebGL olmadan
sınanabiliyor. Gameplay domain'i (`world/`, `data/`, `state.ts`, `scenes/`)
hâlâ ne three'yi ne `render3d/`'yi biliyor.

---

## 4. Animasyon durum makinesi

Öncelik sırası: **ölüm > atış > kuşan/çıkar > hasar tepkisi > lokomosyon >
nişan tutuşu > duruş**.

| Durum | Klip | Kip |
|---|---|---|
| ölüm | `15_DEATH` | LoopOnce + **clamp** (asla döngü yok) |
| atış (cast tetiği) | `13_AIM_RECOIL` | LoopOnce |
| silah kuşanma / çıkarma | `16_EQUIP_BOW` / `17_DISARM_BOW` | LoopOnce |
| hasar | `14_HIT_REACT` | LoopOnce |
| koşu | `03..06_RUN_*` | LoopRepeat |
| nişan yürüyüşü | `07..10_AIM_WALK_*` | LoopRepeat |
| hedef varken duruş | `12_AIM_OVERDRAW` | LoopOnce + **clamp** (tutuş) |
| duruş | `01_IDLE` / `02_IDLE_LOOK` | LoopRepeat / tek atış |

**Yön eşlemesi elle yazılmadı.** Hareketin model-yerel yön vektörü ile her
klibin manifestteki `direction` vektörü arasındaki iç çarpım en büyük olan
klip seçilir. Doğrulanan sonuç: δ=0 → `03_RUN_FORWARD`, δ=π → `04_RUN_BACK`,
δ=+π/2 → `06_RUN_RIGHT` (yerel −X), δ=−π/2 → `05_RUN_LEFT` (yerel +X).

**Aile eşiği de manifestten türer:** RUN ↔ AIM_WALK geçişi iki kaynak hızın
GEOMETRİK ORTASINDADIR — ileri yönde √(3,632 × 1,156) = **2,049 m/sn**.
Joystick analog olduğu için her iki aile de gerçekten kullanılır.

**Playback hızı:** `timeScale = ölçülen görsel hız ÷ klibin kaynak hızı`.
Hız gameplay'e SORULMAZ, renderer konum farkından ölçer.

| playerSpeed | m/sn | klip | kaynak | timeScale |
|---:|---:|---|---:|---:|
| 120 (varsayılan) | 4,16 | `03_RUN_FORWARD` | 3,632 | **×1,14** |
| 90 | 3,12 | `03_RUN_FORWARD` | 3,632 | ×0,86 |
| 150 | 5,20 | `03_RUN_FORWARD` | 3,632 | ×1,43 |

`WorldMovementSystem` otorite olarak KALDI; `playerSpeed` DEĞİŞMEDİ.

**Hareket halinde atış:** karışım (blend) katmanı olmadığı için 0,7 sn'lik
recoil klibi yürürken bacakları dondururdu. Klip **bırakma anından SONRA**,
0,35 sn'de kesilip lokomosyona dönülür. Ölçülen kesim anı bırakmadan (0,183 sn)
sonra ve 0,45 sn'den önce.

---

## 5. Socketler — manifestten BİREBİR

| Socket | kemik | yerel konum (m) | ölçülen dünya (world birimi) |
|---|---|---|---|
| `bow` | `mixamorig:Left_arch1` | 0, 0, 0 | −5,3 · 40,7 · 23,4 |
| `arrowSpawn` | `mixamorig:Left_arch1` | −0,0577 · 0,0039 · 0,0160 | −5,2 · 40,6 · 25,1 |
| `nock` | `mixamorig:RightHand` | 0, 0, 0 | −5,9 · 41,3 · −0,0 |

Hard-code edilmiş farklı ofset UYDURULMADI. Ölçülen `nock` ↔ `arrowSpawn`
mesafesi ≈ **0,87 m** — manifestin bildirdiği çekiş uzunluğu bandının
(0,761–0,909 m) tam içinde; socket verisinin doğru bağlandığının bağımsız
kanıtı.

**Düğüm adı tuzağı:** glTF yükleyici düğüm adlarını
`PropertyBinding.sanitizeNodeName` ile temizler ve iki nokta DÜŞER
(`mixamorig:Left_arch1` → `mixamorigLeft_arch1`). Manifest DEĞİŞTİRİLMEDİ;
arama iki adımlıdır (`findNode`).

---

## 6. Release timing

| Kaynak | Değer |
|---|---:|
| animasyonun DOĞAL bırakma anı (`13_AIM_RECOIL`, kare 6) | **0,183 sn** |
| gameplay `releaseDelay` (**DEĞİŞTİRİLMEDİ**) | **0,20 sn** |
| fark | **0,017 sn** |

Gameplay sabiti P2.1'de dokunulmadı; fark yalnız DEV telemetri panelinde ve
`telemetry:render` çıktısında raporlanır.

---

## 7. Ölüm özel durumu

`15_DEATH` tek `rootMotionRemoved: false` klibidir ve **1,13 m'lik yazılı
geriye düşüş** taşır. Bu yer değiştirme **model-yerel sunum** olarak ele alındı:
renderer'ın gameplay'e yazma yolu zaten yoktur, düşüş modelin kendi uzayında
olur, `playerRoot` gameplay konumunda kalır.

Ölçülen sonuç (3,5 sn ölüm klibi boyunca):

| Ölçüm | Değer |
|---|---:|
| gameplay `worldX` / `worldY` değişimi | **0,000000 / 0,000000** |
| model-yerel yatay kayma | **1,129 m** (manifest 1,13 m) |
| kaynak zemin batması | 0,118 m |
| uygulanan GÖRSEL Y ötelemesi | **+0,12 m** |
| respawn sonrası kök ötelemesi | `{x:0, y:0, z:0}` |
| respawn sonrası klip | `01_IDLE` |

Ölüm boyunca gameplay zemin/çarpışma sistemine HİÇBİR ŞEY YAZILMAZ. Diriliş
anında ölüm pozu, model-yerel kayma ve görsel öteleme **tamamen** sıfırlanır
(`ArcherRig.hardReset()`).

---

## 8. Projectile

`CombatPipeline` otoritesi aynen korundu. Ok GÖRSELİ `arrowSpawn` socketinden
çıkar ve ilk **0,12 sn** içinde otoritenin konumuna karışır. Karışım YALNIZ
görseldir: otoritenin konumu, hızı, hasarı ve SAYISI değişmez.

- üçlü salvo: authoritative **3** ok → **3** görsel
- ilk karede görsel konumu = `arrowSpawn` dünya konumu (1e-9 hassasiyet)
- karışım bittiğinde görsel = otorite konumu (1e-9 hassasiyet)
- **model yokken karışım da yoktur** → P2.0 davranışı bit-bit korunur

---

## 9. Yay kavraması — 17 klipte ölçüm

Yay `mixamorig:Left_arch1` kemiğine skinlidir ve o kemik `LeftHand`'e sabittir.
17 klip × 5 kare örneklendi:

**Yay ↔ sol el mesafesi sapması: 1,02 × 10⁻⁵ m (0,01 mm).** Yay hiçbir klipte
elden kopmuyor. (Kalan sapma float32 kemik matrislerinden gelir.)

Parmak sınırlaması manifestte bildirildiği gibi kabul edildi: `13_AIM_RECOIL`
takip hareketi ve `17_DISARM_BOW` sırasında el kavrayışlı kalır. **IK veya yeni
parmak rig'i YAZILMADI** (P2.1 kuralı).

---

## 10. HUD / fallback / DEV

İki katmanlı sunum P2.0'daki gibi: arkada Three canvas'ı, önde 2D HUD.
GLB yüklenemezse `console.warn` düşer ve **P2.0 primitive kapsülü** devreye
girer — oyun durmaz. DEV → Renderer paneli → **Model** düğmesi ile canlı geçiş
yapılabilir; tarayıcıda doğrulandı:

| | üçgen | draw call |
|---|---:|---:|
| GERÇEK GLB | **21 374** | 6 |
| PRIMITIVE fallback | **870** | 6 |

Gameplay her iki durumda da AYNIDIR (§11).

---

## 11. Parity ve testler

**465/465 prototip testi WebGL BAĞLAMI OLMADAN geçiyor** (P2.0'da 440; P2.1
25 test ekledi). GLB, testlerde **gerçek `GLTFLoader`** ile çözülür — sahte
nesne yoktur. Node'da `Image`/`document` bulunmadığı için yalnız DOKU DECODE
yolu bir şimle kapatılır (`tests/headless-dom.ts`); geometri, iskelet,
inverse-bind matrisleri, 17 klip ve socket kemikleri GERÇEKTİR. Şim tarayıcı
bundle'ına GİRMEZ ve hiçbir GL bağlamı kurmaz.

**Renderer parity (20 sn deterministik farm senaryosu), üç kip:**
renderer KAPALI · renderer AÇIK + primitive · renderer AÇIK + **gerçek GLB**.
Karşılaştırılan alanlar: oyuncu konumu/bakışı (1e-6), HP, MP, EXP, coin,
seviye, hedef uid, Genie durumu ve karar tik sayısı, kill/item/coin toplamı,
yerdeki ganimet sayısı ve her mobun uid/nesil/HP/konum/AI durumu.
**Üçü de BİREBİR AYNI.**

`npm test` (ana oyun): **106/106**.

---

## 12. Değişen dosyalar

**YENİ:** `public/assets/models/archer_mobile_v1.glb` ·
`public/assets/models/archer_mobile_v1.manifest.json` ·
`experiments/.../data/archer-manifest.json` · `data/archer-model.ts` ·
`render3d/ArcherAnimator.ts` · `render3d/ArcherRig.ts` · `render3d/GlbLoader.ts` ·
`tests/headless-dom.ts` · `docs/ARCHER_MOBILE_V1_ASSET_REPORT.md`

**DEĞİŞEN:** `render3d/ThreeWorldRenderer.ts` (rig bağlama, ArrowSpawn karışımı,
telemetri) · `render3d/views.ts` (PlayerView + ArcherRenderStats) ·
`render3d/frame.ts` · `render3d/assets3d.ts` · `data/proto-assets.ts`
(`PROTO_MODELS`) · `main.ts` (model yükleme) ·
`scenes/WorldPrototypeScene.ts` (telemetri + Model düğmesi) · `tests/run.ts` ·
`tools/render-telemetry.ts` · `tools/pack-preview.mjs` (`.glb` MIME) ·
`tsconfig.proto.json` (json include) · `vendor/three/three.d.ts` (animasyon
yüzeyi) · `package.json`

**DEĞİŞMEYEN:** `src/**` · gameplay domain'in tamamı (`world/`, `data/` gameplay
dosyaları, `state.ts`) · kaynak GLB ve manifest içeriği.

---

## 15. JOYSTICK TERS ÇALIŞIYORDU — kamera ekseni düzeltmesi

**Bildirilen kusur:** "joystick ters çalışıyor, gitmek istediğim yönün tersine
gidiyor."

**Sebep — P2.0 kamera varsayılanı.** Joystick GAMEPLAY girdisidir ve `dx/dy`
EKRAN uzayındadır. 2D renderer dünyayı eksen hizalı çizer:

```
ekran SAĞ = worldX+        ekran YUKARI = worldY−
```

3D kamera `yawDeg = 45` ile yerleştirilince ekran eksenleri döndü. Ölçüldü:

| yaw | ekran SAĞ | ekran YUKARI |
|---:|---|---|
| **45** (P2.0 varsayılanı) | **(−0.707, +0.707)** | (+0.707, +0.707) |
| 0 | (0, +1) | (+1, 0) |
| 90 | (−1, 0) | (0, +1) |
| **270** (P2.1 varsayılanı) | **(+1, 0)** | **(0, −1)** |

`yaw 45`'te joystick "sağ" komutu karakteri ekranda **yukarı-sola**
götürüyordu — kullanıcının tarifi birebir doğruydu. 2D katmanda kusur yoktu,
çünkü 2D kamera eksen hizalıdır.

**Düzeltme.** Varsayılan **`yawDeg = 270`**: kamera oyuncunun worldY+
tarafında durur ve ekran eksenleri 2D ile BİREBİR hizalanır. Bu bir GÖRSEL
yerleşim kararıdır — joystick semantiği, `WorldMovementSystem` ve hiçbir
gameplay değeri DEĞİŞMEDİ. `screenAxes()` hizayı ölçülebilir kılar ve test
onu kilitler.

**Kamera DEV'den döndürülürse:** `screenToWorldMove()` girdiyi kamera
çerçevesine çevirir, böylece kontrol ekranla hizalı kalır. **Varsayılan
kamerada bu dönüşüm BİREBİR KİMLİKTİR** (testli) — yani 3D katmanın açık ya
da kapalı olması hareketi DEĞİŞTİRMEZ, parity kuralı korunur.

**Bedeli:** 45°'lik izometrik döndürme gitti; görüntü artık düz yüksek 3/4
(pitch 60). İzometrik açı istenirse DEV panelinden `yaw` döndürülebilir ve
kontrol otomatik hizalanır — ama o durumda 3D açıkken joystick→dünya eşlemesi
2D'den farklı olur. Varsayılanda böyle bir fark YOKTUR.

**Tarayıcı doğrulaması** (düşman ortamda): joystick sağ/sol/yukarı/aşağı dört
yön sürüldü, dünya her seferinde beklenen yönde kaydı.

---

## 13. P2.1'DE YAPILMAYANLAR

GLB yeniden optimizasyonu · decimation · yeni parmak rig'i / IK ·
animasyon blend ağacı (upper/lower body layering) · mob GLB'leri ·
ekipman görselleri · zırh/silah değişimi görseli · tam harita · environment ·
post-processing · navmesh · physics · upgrade / Anvil / Scroll NPC ·
combat yeniden yazımı.

---

## 14. BİLİNEN SINIRLAR

1. **Parmak animasyonu baked** (manifest kusuru): `13_AIM_RECOIL` takip
   hareketi ve `17_DISARM_BOW` sırasında eller kaynak kadar açılmaz.
   Mesh geneli ortalama sapma 0,076 cm, en kötü parmak ucu 13 cm.
2. **Karışım (blend) katmanı yok.** Üst gövde nişan alırken alt gövdenin
   koşması için animasyon layer'ı gerekir; P2.1'de tek klip oynatılır. Bu
   yüzden hareket halindeki atış klibi 0,35 sn'de kesilir.
3. **FPS ölçümü bu ortamda anlamsız:** GPU yok, Chromium SwiftShader ile CPU'da
   rasterize ediyor (20 FPS). 21 374 üçgen / 6 draw call herhangi bir mobil GPU
   için önemsizdir; gerçek cihaz ölçümü yapılmadı.
4. **Ölüm görseli tarayıcıda doğrulanmadı** — oyuncuyu öldürecek bir DEV kapısı
   yok. Ölüm davranışı headless testler ve telemetri ile ölçüldü (§7).
6. **`file://` testleri her ortamı temsil etmiyor.** §1.1'deki kusur tam olarak
   bu yüzden ilk turda kaçtı: yerel Playwright koşusunda `fetch` araya
   girilmemişti. Artık kırık-`fetch` senaryosu hem headless hem tarayıcı
   testinde koşuyor, ama başka ortam farkları (servis worker, CSP, blob
   kısıtları) hâlâ kapsanmıyor.
5. `Asset3dRegistry` durumu, DEV panelinden primitive'e geçilse bile `ready`
   kalır (varlık gerçekten yüklü). Canlı durum "ARCHER MODELİ" bloğundadır.
