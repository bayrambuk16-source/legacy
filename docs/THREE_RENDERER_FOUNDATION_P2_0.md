# THREE.JS 2.5D RENDERER FOUNDATION — P2.0

**Kapsam:** prototip (`experiments/eternal-ko-prototype/`).
**Gerçek Archer GLB KULLANILMADI** (24 MB model P2.1'e aittir, §32).

**İzolasyon:** `src/` DEĞİŞMEDİ (three/render3d importu YOK) · kaynak DB/JSON
DEĞİŞMEDİ · `dist/preview.html` md5 `0399549684eec7137f46cee73c318710` (aynı).

---

## 1–2. Three.js sürümü ve bağımlılık kurulumu

| Alan | Değer |
|---|---|
| sürüm | **0.169.0** — SABİT |
| kaynak | kullanıcının sağladığı `npm pack three@0.169.0` tarball'ı |
| konum | `vendor/three/` (yerel) |
| runtime CDN | **YOK** |
| bütünlük | `npm run verify:three` → sha256 doğrulaması |

**npm registry bu ortamda tamamen kapalıdır** (`three`, `gl-matrix`, hatta
`npm ping` ve kurulu `esbuild`'i görüntülemek bile 403; npmmirror ve yarnpkg
de aynı). Bu yüzden kütüphane tarball'dan **vendor edildi**:

```
vendor/three/
  build/three.module.js                      1 304 820 B   (tarayıcı ESM)
  build/three.cjs                            1 315 715 B   (headless/node)
  examples/jsm/loaders/GLTFLoader.js           110 029 B   (§27)
  examples/jsm/utils/BufferGeometryUtils.js     31 768 B   (GLTFLoader bağımlılığı)
  three.d.ts                                   (elle yazılmış tip bildirimi)
  package.json · VENDOR.json · LICENSE
```

`three@0.169.0` TypeScript tipi TAŞIMAZ (`@types/three` ayrı pakettir ve
erişilemez). Bu yüzden **yalnız projenin kullandığı yüzey** için elle bir
`three.d.ts` yazıldı — kullanılmayan API bildirilmez, böylece bildirim gerçek
kullanımla senkron kalır.

**İki çözümleme yolu:**

- tarayıcı: esbuild `alias` → `vendor/three/build/three.module.js`
- headless (tsx/node): `node_modules/three` → `vendor/three` yerel bağlantısı
  (`npm run` ile değil, `tools/link-vendor.mjs` ile; ağ erişimi yok)

Bundle etkisi: **3 567 KB → 4 079 KB** (+512 KB, tree-shaken + minified).

---

## 3–4. Renderer mimarisi ve gameplay/render sınırı

```
experiments/eternal-ko-prototype/render3d/
  coords.ts              koordinat köprüsü          — three YOK
  CameraRig.ts           kamera matematiği          — three YOK
  views.ts               gameplay↔renderer sözleşmesi — three YOK
  VisualRegistry.ts      görsel yaşam döngüsü        — three YOK
  assets3d.ts            GLB kayıtçısı + fallback    — three YOK
  frame.ts               gameplay → görünüm adaptörü — three YOK
  ThreeWorldRenderer.ts  ★ THREE'Yİ KULLANAN TEK DOSYA
```

Bağımlılık yönü **tek taraflıdır**:

```
gameplay  ←──yalnız okur──  render3d/ThreeWorldRenderer
```

Renderer gameplay nesnelerine referans bile TUTMAZ: `frame.ts` her karede
**kopyalanmış, salt-okunur, dar** bir görünüm üretir (`WorldFrame`). Bu yüzden
renderer'ın gameplay'i mutasyona uğratma YOLU YOKTUR.

**Testle korunuyor:** kaynak dosyalar taranır; `world/`, `data/`, `scenes/`,
`tools/` ve kök dosyalarda `three` importu bulunursa test kırmızı yanar.
`render3d/` içinde three importu **tek dosyada** olmalıdır.

Genie, MobAi, CombatPipeline, WorldCombatAdapter ve `state.ts` ayrıca
`Object3D` / `AnimationMixer` / `WebGLRenderer` gibi kimlikleri de
KULLANMAMALIDIR — bu da testlidir.

---

## 5. Koordinat eşlemesi

```
gameplay(worldX, worldY)  →  three(x = worldX, y = 0, z = worldY)
örnek: (1240, 1650) → { x: 1240, y: 0, z: 1650 }
```

Y ekseni düşeydir ve **gameplay'de karşılığı yoktur** (zıplama yok, §2).
Ters dönüşümde düşey bileşen ATILIR — Three'nin Y/Z mantığı gameplay'e
sızamaz.

Bakış açısı: yerel ileri yön +Z kabul edilir, `yaw = π/2 − facingAngle`.
16 açı üzerinde gidiş-dönüş testi yapılır.

---

## 6. Kamera değerleri

> **P2.1 DÜZELTMESİ — bu bölümdeki `yaw 45` varsayılanı ARTIK GEÇERSİZ.**
> Ölçüldüğünde `yaw 45` ekran SAĞ eksenini `(−0.707, +0.707)` yapıyordu; yani
> joystick "sağ" komutu karakteri ekranda yukarı-sola götürüyordu. Kullanıcı
> bunu bildirdi. Varsayılan **`yaw 270`** oldu (ekran ekseni 2D ile birebir
> hizalı). Ayrıntı: `docs/ARCHER_GLB_INTEGRATION_P2_1.md` §15.


| Parametre | Varsayılan | DEV seçenekleri |
|---|---:|---|
| yaw | **45°** | 0 / 45 / 90 / 135 |
| pitch | **60°** | 40 / 50 / 55 / 60 / 70 |
| mesafe | **750** | 600 / 750 / 900 / 1100 / 1400 |
| bakış yüksekliği | **90** | 0 / 60 / 90 / 140 |
| FOV | **40** | 30 / 35 / 40 / 45 |
| yumuşatma | 8 | YALNIZ GÖRSEL |

Oyuncu (1240, 1650) iken kamera **(975, 650, 1385)**, bakış **(1240, 90, 1650)**.

Kamera oyuncu tarafından döndürülemez, serbest kamera yoktur, yalnız takip
eder. Yumuşatma kare-hızından bağımsızdır (30/60/120 FPS'te 1 sn sonunda aynı
noktaya varır) ve `smoothing = 0` ile determinizm için kapatılabilir.

**Güneş ve gölge kamerası oyuncuyu takip eder.** İlk kurulumda sabitti ve dünya
(1240, 1650) civarında olduğu için zemin gölge haritasının dışında kalıp
tamamen karanlık görünüyordu — düzeltildi.

---

## 7. Perspective vs Orthographic

DEV panelinden anında geçiş yapılabilir; **gameplay ikisinde de aynıdır**
(kamera hiçbir gameplay kararına girmez).

| | Perspective (varsayılan) | Orthographic |
|---|---|---|
| derinlik hissi | var — uzak moblar küçülür, dikey eksende hacim okunur | yok — her mesafede aynı boyut |
| Eternal Hero benzeri mobil his | **daha yakın** | daha "board game" / izometrik |
| yakın plan | oyuncu çevresi doğal genişler | sabit ölçek, kalabalıkta okunaklı |
| ileride 3D karakter | model hacmi doğru okunur | model yassı görünür |

**Karar: Perspective varsayılan kalır.** Gerekçe: P2.1'de gerçek rigged Archer
GLB gelecek ve karakter hacminin okunması gerekiyor; ortografik projeksiyonda
model yassılaşıyor. Ortografik mod DEV aracı olarak korunuyor.

---

## 8–9. Placeholder'lar

- **Oyuncu (§6):** kapsül gövde + koni "burun". Burun 360° dönüşü ekranda
  okunur kılar; joystick ile dönüş doğrulandı.
- **Mob (§7):** silindir; tip başına yalnız boyut/renk farkı —
  NORMAL (r16, h42, bej) · AGGRESSIVE (r19, h52, kırmızımsı) ·
  ELITE (r26, h72, altın).
- **Ok (§15):** koni · **Ganimet (§19):** kutu (item) / küre (altın),
  rengi **P1.8 item sınıfından** gelir.
- Zemin: tek `PlaneGeometry` + okunabilirlik için tek `GridHelper`
  (LineSegments — 1 draw call). Navmesh/physics YOK.
- Işık: Ambient + Directional (gölgeli). PBR/post-processing YOK.

---

## 10. Hedef raycast'i

`Raycaster` **yalnız girdi adaptörüdür (§13)**:

```
ekran(x, y) → Raycaster → mob gövdesi → uid
                                          ↓
                       Scene → WorldTargetSystem.select(uid)   ← AUTHORITY
```

`pickMobAt()` HP, mob state, combat ya da hedef DEĞİŞTİRMEZ — testte
raycast sonrası `targets.selectedUid` hâlâ `null` kalır. Hedefi gameplay
sistemi seçer.

Raycast `matrixWorld`'e baktığı için `update()` sonunda
`scene.updateMatrixWorld(true)` çağrılır; böylece `render()` çağrılmayan
headless durumda da doğru çalışır.

---

## 11. Projectile

`CombatPipeline` authority'si **aynen korunmuştur**. Renderer havadaki ok
listesini okuyup görsel üretir. Üçlü/beşli salvo görsel sayısı ölçüldü:

| Skill | authoritative ok | görsel |
|---|---:|---:|
| Standart Atış | 1 | 1 |
| Üçlü Salvo | **3** | **3** |
| Beşli Salvo | **5** | **5** |

**Projectile görselleri HASAR VEREMEZ (§15).** Test bunu kasten kötüye
kullanarak kanıtlar: ok görseli zorla mobun tam içine taşınır ve mobun HP'si
DEĞİŞMEZ — çünkü bu katmanın gameplay'e yazma yolu yoktur.

---

## 12–14. Genie · MobAi · Loot entegrasyonu

Üçü de Three'yi bilmez; renderer yalnız sonucu gösterir.

- **Genie:** ACQUIRE/APPROACH/COMBAT/RETURN/WAIT aynen çalışır; renderer
  yalnız hareketi çizer. Farm Boundary halkası DEBUG amaçlıdır ve gameplay
  etkisi yoktur.
- **MobAi:** Scene referansı almaz. Mob görseli **`uid:generation`** ile
  anahtarlanır — P1.6.1 kimliği korunur; respawn olan mob eski görseli
  DEVRALAMAZ (test edilir).
- **Loot:** işaretçi görselleri; sahiplik/claim otoritesi P1.7'de kalır.
  Auto Loot davranışı değişmedi.

---

## 15. HUD overlay stratejisi

```
[arka]  Three.js canvas   → DÜNYA katmanı
[ön]    mevcut 2D canvas  → HUD overlay (joystick, butonlar, paneller)
```

HUD Three'ye TAŞINMADI. 3D açıkken 2D katman `clearRect` ile **şeffaf**
temizlenir ve yalnız HUD çizilir; 3D kapalıyken P1.8'deki gibi dünyayı
kendisi çizer. WebGL yoksa 3D katman hiç kurulmaz ve oyun eskisi gibi çalışır.
Girdi DAİMA 2D katmandadır (`pointer-events: none` 3D canvas'ta).

---

## 16–18. GLB / animasyon / soket hazırlığı

- **GLB kayıtçısı** (`assets3d.ts`): manifest kaydı + durum makinesi
  (`missing → loading → ready | failed`). P2.0'da **tüm `url`'ler `null`**
  → hepsi `PRIMITIVE fallback`. Runtime kanonik format **GLB**; FBX yok.
- `GLTFLoader` yerel pakette hazır (`three/addons/loaders/GLTFLoader.js`).
- **Animasyon (§28):** `IDLE / WALK / RUN / ATTACK / SKILL / DEATH` klip
  sözleşmesi tanımlı; `AnimationMixer` renderer içinde kalacak, gameplay
  bilmeyecek. P2.0'da hiçbir klip OYNATILMAZ.
- **Soket (§29):** `BowSocket` ve `ArrowSpawn` için yerel ofset fallback'i
  hazır; bone araması YOK. `releaseDelay = 0.20` korunuyor, animasyon
  event'ine geçilmedi.

---

## 19–20. Stress ve çizim maliyeti

**§23 stress sahnesi** (1 oyuncu · 20 mob · 30 ok · zemin · ışık), gerçek
WebGL altında ölçüldü:

| Ölçüm | Değer |
|---|---:|
| draw calls | **39** |
| üçgen | **1 734** |
| doku | 1 |
| geometri | 10 |
| shader programı | 6 |
| sahne nesnesi | 81 |
| mob / ok görseli | 20 / 30 |

Gerçek oyun karesi (8 mob, Genie açık): **10 draw call · 1 002 üçgen**.

> **FPS notu:** bu ortamda GPU yoktur; Chromium **SwiftShader** ile CPU'da
> rasterize eder ve 16–20 FPS ölçülür. 39 draw call / 1 734 üçgen herhangi bir
> mobil GPU için önemsizdir; gerçek cihaz ölçümü P2.1'e aittir. Paylaşılan
> geometri/materyal sayesinde geometri sayısı entity sayısıyla DEĞİL, tip
> sayısıyla büyür (10 geometri, 6 program).

`devicePixelRatio` **2 ile sınırlıdır** (§22); resize'da renderer boyutu ve
kamera izdüşümü birlikte güncellenir.

---

## 21. Sızıntı testleri

`VisualRegistry` her karede canlılığı işaretler; **işaretlenmeyen her görsel
silinir**. Paylaşılan geometri/materyal görsel silinirken DOKUNULMAZ; yalnız
`dispose()` içinde serbest bırakılır (§24 — asset ownership açık).

- ganimet kaldırılınca görsel **0**'a düşer
- tüm moblar ölünce mob görseli **0**'a düşer
- 2 dakikalık respawn döngüsünde: mob tepe ≤ 8 · ok tepe ≤ 24 ·
  `canlı = üretilen − silinen` muhasebesi tutar
- `dispose()` sonrası sahne boşalır

---

## 22. Renderer parity (§26)

30 saniyelik deterministik farm senaryosu **renderer AÇIK** ve **KAPALI**
çalıştırıldı. Karşılaştırılan alanlar: oyuncu konumu ve bakış açısı (1e-6
hassasiyet), HP, MP, EXP, coin, seviye, hedef uid, Genie durumu ve karar tik
sayısı, kill/item/coin toplamları, yerdeki ganimet sayısı ve **her mobun**
uid / nesil / HP / konum / AI durumu.

**Sonuç: BİREBİR AYNI.** Renderer gameplay sonucunu değiştirmiyor.

---

## 23. Headless sonuçlar

**440/440 prototip testi WebGL BAĞLAMI OLMADAN geçiyor.** Renderer testleri
gerçek `ThreeWorldRenderer` örneğini kullanır: `canvas` verilmediğinde
`WebGLRenderer` OLUŞTURULMAZ ama sahne grafiği, kamera, görsel yaşam döngüsü
ve raycast kurulur ve çalışır. Böylece testler sahte nesne değil **gerçek kod
yollarını** sınar.

`three` headless'ta yalnız matematik/sahne grafiği için kullanılır; WebGL
bağlamı yalnız `WebGLRenderer` kurulduğunda gerekir.

---

## 24. Değişen dosyalar

**YENİ:** `vendor/three/**` (kütüphane + tip bildirimi + bütünlük manifesti) ·
`render3d/coords.ts` · `render3d/CameraRig.ts` · `render3d/views.ts` ·
`render3d/VisualRegistry.ts` · `render3d/assets3d.ts` · `render3d/frame.ts` ·
`render3d/ThreeWorldRenderer.ts` · `tools/verify-vendor.mjs` ·
`tools/link-vendor.mjs` · `tools/render-telemetry.ts`

**DEĞİŞEN:** `main.ts` (iki katmanlı sunum) ·
`scenes/WorldPrototypeScene.ts` (3D katman, raycast girdi, DEV kamera
kontrolleri, renderer telemetri paneli) · `tests/run.ts` ·
`tools/build.mjs` (esbuild alias) · `tsconfig.proto.json` (paths) ·
`package.json` (vendor kaydı + scriptler)

**DEĞİŞMEYEN:** `src/**` · gameplay domain'in tamamı (`world/`, `data/`,
`state.ts`) — P1.8 sistemleri dahil hiçbiri Three'yi bilmiyor.

---

## 25. P2.0'DA YAPILMAYANLAR (§32)

24 MB Archer GLB importu · model optimizasyonu · gerçek karakter/mob sanatı ·
tam harita · environment · ekipman görselleri · zırh değişimi · silah soketi
implementasyonu · gelişmiş animasyon sistemi · post-processing · bloom ·
SSAO · navmesh · physics · multiplayer · upgrade · Scroll NPC · Anvil ·
combat yeniden yazımı.
