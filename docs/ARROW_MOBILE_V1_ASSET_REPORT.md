# PROJECT LEGACY — ARROW MOBILE GLB V1

Archer paketinde brief §7 gereği **çıkardığım** ok mesh'ini, bağımsız bir projectile asset'i olarak paketledim.

| Çıktı | Boyut |
|---|---|
| `arrow_mobile_v1.glb` | **37.9 KB** |
| `arrow_mobile_v1.manifest.json` | 4.6 KB |
| `arrow_mobile_v1_report.md` | bu dosya |
| `arrow_mobile_v1_inspector.html` | 72 KB (runtime paketinin parçası değil) |

**Statik mesh** — skin yok, iskelet yok, animasyon yok. 82 vertex, 80 üçgen, 1 materyal, **1 draw call**.

---

## Yönelim ve orijin — en önemli kısım

```
origin (0,0,0) ─── nock düzlemi
                   │
                   ├──────── gövde ────────┐
                   │                        │
   fletching                            broadhead
   (3 tüy)                              uç (0,0,0.7504)
      ◄────────── +Z ilerleme yönü ──────────►
```

- **Orijin = nock düzlemi**, okun arka yüzü tam olarak `z = 0`'da.
- **+Z ucu gösteriyor**, uzunluk **0,7504 m**.
- Uç eksende, tam `(0, 0, 0.7504)`.
- İki boş işaretçi düğüm var: `arrow_nock` ve `arrow_tip`.

**Bu orijini rastgele seçmedim.** Archer manifestinde size verdiğim `nock` socket'i `mixamorig:RightHand` üzerinde `localPosition (0,0,0)` ve rotasyonu nişan eksenine hizalı. Yani:

```js
nockSocket.add(arrow);           // arrow.position ve quaternion identity kalır
```

11_DRAW_ARROW / 12_AIM_OVERDRAW oynarken ok kirişte, nişan ekseni boyunca, **ek hesap olmadan** doğru duruyor.

Uçuş ve saplanma:

```js
// uçarken
arrow.position.copy(nockWorldPos);
arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), velocity.clone().normalize());

// hedefe saplanınca — uç temas noktasında kalsın, gövde arkada
arrow.position.copy(hitPoint).addScaledVector(dir, -0.7504 * 0.85);  // ~11 cm gömülü
```

Projectile'ınız nock yerine **ucu** entegre ediyorsa ofset `(0,0,0.7504)` — ya da `arrow_tip` düğümünü okuyun.

---

## Materyalde iki zorunluluk

Bu asset, setteki diğerlerinden farklı olarak **alfaya gerçekten muhtaç.**

Kaynak dokuya baktım: hem **çakmaktaşı ucun yontulmuş silueti** hem de **üç tüy** alfa kesimli. Dokunun %14,3'ü tam saydam. Alfayı düşürseydim uç ve tüyler dikdörtgen levhalara dönerdi — bir okun en tanınabilir iki parçası.

- **`alphaMode: MASK`, `alphaCutoff: 0.5`** — zorunlu.
- **`doubleSided: true`** — zorunlu. Üç tüy düz tek yüzlü quad; tek yüzlü bırakırsam bir taraftan kayboluyorlar. 80 üçgende maliyeti sıfır, o yüzden tek materyal / tek draw call korundu.

(Caveworm'da `doubleSided`'ı kapatmıştım — orada mesh kapalıydı ve Sketchfab varsayılanıydı. Burada gerçekten gerekiyor.)

**Normal map (`Arrow_NM.jpg`) alınmadı.** Kaynak mesh'te tangent yok; normal map kullanmak TANGENT niteliği üretip saklamayı (82 × 16 B) artı ikinci bir dokuyu gerektirirdi — **modelin tamamından fazla bayt**, uçuşta ya da hedefe saplı halde mob mesafesinden görülen 75 cm'lik bir nesne için.

---

## Doku — fallback'te palet numarası

| | Boyut |
|---|---:|
| Kaynak `Arrow_DIFF.png` 512² RGBA | 285 KB |
| **256² WebP + alfa (birincil)** | **13,8 KB** |
| **256² PNG8 / 128 renk + alfa (fallback)** | **19,3 KB** |

Burada bir sorun vardı: alfa gerektiği için fallback JPEG olamaz. Düz 256² RGBA PNG **90,9 KB** — yani dosyanın %83'ü, kimsenin kullanmayacağı bir yedek için.

Paletlemeyi denedim: **128 renkli PNG8 ile 19,3 KB**, ortalama RGB hatası 3/255. Kritik soru alfa siluetinin bozulup bozulmadığıydı, çünkü `MASK` kesimi ona bağlı. Ölçtüm:

> **65.536 texel'in 0'ı 0,5 eşiğinin karşı tarafına geçti — siluet %100,000 aynı.**

Yani fallback yolu da birebir doğru siluet veriyor, 71,6 KB tasarrufla. Zorunlu extension yok.

---

## Doğrulama

27 kontrol, hepsi geçti:

```
PASS  gecerli GLB / glTF 2.0 / zorunlu extension yok / tek scene root / root identity
PASS  skin yok (statik projectile) / animasyon yok
PASS  1 mesh / 1 primitive -> 1 draw call / tek materyal
PASS  sadece POSITION/NORMAL/TEXCOORD_0 (skin yok, tangent yok)
PASS  alphaMode MASK cutoff 0.5 / doubleSided / metalness 0
PASS  pozisyon-normal sonlu / normaller birim / UV [0,1] icinde / uint16 index
PASS  nock duzlemi tam z=0 (min z = +0.000000)
PASS  uzunluk 0.7504 m, +Z boyunca
PASS  uc eksende: (+0.0000, +0.0000, 0.7504)
PASS  +Z ucu bas (maks yaricap 1.09 cm), -Z ucu fletching (2.66 cm)
PASS  arrow_nock / arrow_tip isaretci dugumleri mevcut ve geometriyle uyumlu
PASS  256x256 WebP+alfa / 256x256 PNG fallback+alfa
PASS  iki kodlama da ayni alfa-MASK silueti veriyor (%100.000)

RESULT: ALL CHECKS PASSED
```

Ayrıca kendi glTF okuyucumla yükleyip WebGL2'de render ettim: gövde, çakmaktaşı uç ve üç tüy doğru; alfa kesimi çalışıyor; tüyler iki taraftan da görünüyor.

## Bilinen sınırlar

1. **Gövdede ara vertex halkası yok** — kaynak mesh'te vertexler yalnızca iki uçta. Düz bir ok için sorun değil ama gövde bükülemez; bu mesh üzerinde esneme animasyonu denemeyin.
2. **Üç non-manifold kenar**, düz tüylerin gövdeyle birleştiği yerde. Render için zararsız; yalnızca bu mesh'i fizik convex-hull veya CSG rutinine verirseniz önemli olur.

## Three.js 0.169.0

```js
const gltf  = await new GLTFLoader().loadAsync('arrow_mobile_v1.glb');
const arrow = gltf.scene;                       // root "Arrow", transform identity
const tip   = arrow.getObjectByName('arrow_tip');   // yerel (0, 0, 0.7504)

// cok sayida ok icin klonlayin - materyal ve geometri paylasilir
const shot = arrow.clone();
```

- Ekstra decoder gerekmez, zorunlu extension yok.
- Doku sRGB; `renderer.outputColorSpace = THREE.SRGBColorSpace`.
- `alphaTest` materyalde zaten tanımlı — GLTFLoader `MASK` + `alphaCutoff`'u `material.alphaTest = 0.5` olarak kurar.
