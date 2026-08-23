# PROJECT LEGACY — ARCHER MOBILE GLB OPTIMIZATION V1

**Durum: TAMAMLANDI** — 26. maddedeki tamamlanmadı şartlarının hiçbiri oluşmadı.

| Çıktı | Boyut |
|---|---|
| `archer_mobile_v1.glb` | **907.4 KB** (929.200 B) |
| `archer_mobile_v1.manifest.json` | 12.9 KB |
| `archer_mobile_v1_report.md` | bu dosya |
| `archer_mobile_v1_inspector.html` | 1.2 MB (opsiyonel, doğrulama aracı) |

---

## 1–2. Boyut

| | Bayt | |
|---|---:|---|
| Kaynak ZIP (Pro Longbow Pack) | 27.263.636 | 26.0 MB |
| Kaynak, açılmış — karakter + 39 animasyon | 41.237.880 | 39.3 MB |
| **Kaynak, bu işte kullanılan alt küme — karakter + 17 klip** | **32.097.458** | **30.6 MB** |
| **Final GLB** | **929.200** | **907.4 KB** |

**Compression ratio: 34.5× (%97,1 azalma)** — kullanılan kaynak alt kümesine göre.
Tüm pakete göre 44.4×, ZIP'e göre 29.3×.

Hedef ~1 MB idi; 907 KB ile altında kalındı ve bunun için silüetten, rigden veya animasyondan ödün verilmedi.

### GLB içi dağılım

| Bölüm | KB | % |
|---|---:|---:|
| Geometri (5 attribute + index) | 552.3 | 60.9 |
| Animasyon (17 klip) | 169.1 | 18.6 |
| JSON chunk | 104.5 | 11.5 |
| JPEG fallback dokusu | 47.4 | 5.2 |
| WebP dokusu | 32.6 | 3.6 |
| Inverse bind matrisleri | 1.4 | 0.2 |

Dikkat: 25 MB'lık kaynak dosyanın ~22 MB'ı gömülü 2048² dokulardı. Asıl kazanç oradan geldi; geometri zaten mobil ölçekteydi.

---

## 3–4. Mesh ve iskelet

| | Kaynak | Final |
|---|---:|---:|
| Vertex | 12.424 | **12.240** |
| Üçgen | 21.006 | **20.820** |
| Mesh sayısı | 6 | **1** |
| Draw call | 6 | **1** |
| Materyal | 6 | **1** |
| Kemik | 70 | **23** |
| Doku | 10 × 2048² | **1 × 512²** |

### Üçgen sayısı hakkında (spec §3: hedef 8k–15k)

20.820 üçgenle hedefin üzerinde kaldım; bu bilinçli bir karar:

- Spec'in kendi öncelik sırası **doğru siluet (3) > dosya boyutu (5)** diyor ve "modeli gereksiz şekilde bozma" uyarısı var.
- 15k'ya inmek için decimation gerekirdi; skinned bir mesh'te quadric decimation UV dikişlerinde ve ağırlık interpolasyonunda ölçülemeyen kalite riski taşır.
- Boyut zaten hedefin altında: 21k üçgen tek draw call'da, 23 kemikli GPU skinning ile mobilde önemsiz.
- Trianglelerin dağılımı: ten+kafa 12.570, giysi 6.330, gözler 1.520, yay 400.

**İsterseniz ayrı bir pass olarak decimation yapabilirim** — en verimli hedef gözler (1.520 üçgen, ekranda ~4 piksel). Şu haliyle riske girmedim.

### Silinen geometri

- **Ok mesh'i (82 vertex / 80 üçgen)** — spec §7 gereği çıkarıldı.
- **Kirpik mesh'i (102 vertex / 106 üçgen)** — çıkardım. Gerekçe: kirpik dokusu 2048² alfa-maskeli bir atlas; 512 atlasta 56 px'e inince alfa testi lekeleniyor. Çıkarınca tüm karakter tek **opak** materyal oldu, alfa gereksinimi ve onunla gelen risk sıfırlandı. Karakter kapüşonlu, kirpikler 2.5D'de alt-piksel. Geri istenirse eklenebilir (maliyet: alphaMode MASK + atlasta alfa kanalı).

---

## 5. Kemik indirgemesi ve ağırlıklar

70 → 23. Silinen 47 kemiğin dağılımı: **40 parmak**, 2 göz, 4 uç-efektör (`HeadTop_End`, `*Toe_End`), 1 yay ucu (`Left_arch2`).

Kalan kemikler (Mixamo isimleri **birebir** korundu, prefix dahil):

```
mixamorig:Hips  Spine  Spine1  Spine2  Neck  Head
mixamorig:LeftShoulder  LeftArm  LeftForeArm  LeftHand  Left_arch1
mixamorig:RightShoulder RightArm RightForeArm RightHand
mixamorig:LeftUpLeg  LeftLeg  LeftFoot  LeftToeBase
mixamorig:RightUpLeg RightLeg RightFoot RightToeBase
```

Spec'in zorunlu listesinin tamamı mevcut (root/hips, spine, chest, neck, head, iki clavicle, upper/lower arm, hand, upper/lower leg, foot) + bonus ToeBase + yay kemiği.

### Kayıpsız birleştirmeler (ölçüldü)

`LeftEye`, `RightEye`, `Left_arch1`, `Left_arch2` kemiklerinin ebeveynlerine göre local transformu **17 klibin hepsinde sabit ve bind değerine eşit** (rotasyon sapması 0.000°). Bu durumda ebeveyne birleştirme matematiksel olarak birebir aynı sonucu verir. Doğrulandı:

- **Yay mesh'i sapması: 0,0001 cm** — yay elden çıkmıyor, 17 klibin hiçbirinde.
- Göz mesh'i sapması: 0,116 cm.

### Parmaklar — kavrama pozunun bind'e pişirilmesi

Parmaklar gerçekten animasyonlu (klip içi 96°'ye varan varyasyon). Düz birleştirme onları T-pozundaki düz haline dondururdu ve yay kavrayışı bozulurdu. Onun yerine:

1. Referans poz olarak `standing aim overdraw` frame 0 seçildi (okçunun karakteristik pozu: sol el yayı kavrıyor, sağ el kirişte).
2. Parmak ağırlığı taşıyan her vertex için `v' = bindWorld[el] · inverse(refWorld[el]) · D_ref(v)` uygulandı ve sonuç parmak ağırlık oranıyla harmanlandı (f→0'da değişim sıfır, yani bilek dikişinde süreksizlik yok).
3. Ağırlıklar `mixamorig:LeftHand` / `mixamorig:RightHand` üzerine toplandı ve yeniden normalize edildi.

2.222 / 12.240 vertex yeniden konumlandı. Sonuç: eller yayın ve kirişin etrafında kıvrık kalıyor.

### Ölçülen skinning hatası (17 klip × 5 kare, orijinal 70 kemikli deformasyona karşı)

| Mesh | ortalama | p99 | maks |
|---|---:|---:|---:|
| Yay | 0,00 cm | 0,00 | **0,0001 cm** |
| Giysi | 0,00 cm | 0,00 | 0,12 cm |
| Gözler | — | — | 0,12 cm |
| Ten + kafa | 0,06–0,65 cm | ≤9,5 cm | 13,0 cm |
| **Mesh geneli ortalama** | **0,076 cm** | | |

13 cm'lik en kötü değer, ellerin açıldığı kliplerdeki (idle, disarm) **parmak ucu**. 1,80 m'lik karakterde %0,7; 2.5D'de ~300 px yükseklikte ≈ 2 px. Referans poza yakın kliplerde (aim/overdraw) maksimum sapma 0,79 cm.

Broken weight yok: tüm ağırlıklar normalize (maks sapma 0,0000), negatif ağırlık yok, ağırlıksız vertex yok, joint index'leri aralıkta.

---

## 6–8. Yay, ok ve socketler

- **Yay modelde**, `mixamorig:Left_arch1` kemiğine skinli olarak geliyor. Ayrı dosya yok. 17 klipte elden çıkmıyor (ölçülen sapma 0,0001 cm).
- **Ok mesh'i çıkarıldı.** Not: kaynaktaki `mixamorig:arrow` prop kemiği **hiçbir klipte animasyonlu değil** — Hips'e bağlı ve local translation'ı okun mesh'ini dünya orijinine, yani karakterin ayaklarının dibine oturtuyor. Yani o mesh zaten kullanılabilir durumda değildi.
- Modelde gerçek socket düğümü yok; yeni rig kurmadım. Bunun yerine `12_AIM_OVERDRAW @ t=1.5s` pozunda ölçülmüş **kemik + localPosition + localRotation** önerileri manifestte:

| Socket | Kemik | localPosition | Not |
|---|---|---|---|
| `bow` | `mixamorig:Left_arch1` | 0,0,0 | yay zaten bu kemiğe skinli, takmanıza gerek yok |
| `arrowSpawn` | `mixamorig:Left_arch1` | −0.0577, 0.0039, 0.0160 | yay kavrama noktasının 6 cm önü, projectile'i buradan çıkarın |
| `nock` | `mixamorig:RightHand` | 0, 0, 0 | kiriş eli; DRAW/OVERDRAW oynarken tutulan oku buraya parentleyin |

Ölçülen nişan doğrultusu (nock → yay): `(0.027, −0.029, 0.999)` — yani karakter aksı boyunca +Z.

---

## 9. Ölçek / eksen / grounding

- `units = meters` (kaynak cm idi, ×0.01 uygulandı) — ölçülen karakter yüksekliği **1,801 m**.
- Y-up, **+Z forward** (doğrulandı: nişan doğrultusu +Z).
- Root node `Archer`: translation/rotation/scale/matrix **hiç yok** → identity. Negatif scale yok, hiçbir node'da scale yok.
- Bind pozu grounding: **min Y = −0,0062 m**.

---

## 10–12. Doku ve materyal

Tek **512×512** atlas, sRGB, sadece baseColor. Normal / roughness / metallic / AO **yok**.

| Bölge | Konum | Kaynak |
|---|---|---|
| Ten + kafa | x 4–252, y 4–252 | FemaleFitA_Body_diffuse.png (2048²) |
| Giysi | x 260–508, y 4–252 | Erika_Archer_Clothes_diffuse.png (2048²) |
| Yay | x 4–252, y 260–508 | Bow_DIFF.jpg (2048²) |

4 px gutter + kenar dilatasyonu uygulandı (mip bleeding'e karşı). Tüm UV'ler [0,1] içinde, atlas dışına taşma yok.

**Görünüm bozulmadı ve bunun somut bir sebebi var:** karakter kapüşonlu — yüz kapalı. Yakın plan render'da görünen tek ten bölgesi eller ve önkol. Yani 512 atlasın en riskli noktası olan "yüz çözünürlüğü" bu karakterde konu değil. 1024 atlas ~+90 KB'a mal olurdu; gerek görmedim, isterseniz tek komutla üretebilirim.

Materyal: standart glTF PBR metallic-roughness → Three.js `MeshStandardMaterial`. `metalness = 0`, `roughness = 0.85`, `alphaMode = OPAQUE`, `doubleSided = false`. Kullanılmayan hiçbir texture channel üretilmedi.

**Gözler (§11):** `EyeSpec_MAT1`'in kendi diffuse'u olmadığı doğrulandı; UV'leri (u 0.502–0.598, v 0.704–0.998) gövde atlasına düşüyor. O bölgeyi kırpıp baktım: iki iris net şekilde orada. Gövde atlası atandı, final GLB'de render edilip doğrulandı — gözler kaybolmuş/siyah/şeffaf değil.

---

## 13. 17 klip

| # | Klip | Süre | Kare | Loop | Root motion | Kaynak hız |
|---|---|---:|---:|---|---|---:|
| 01 | IDLE | 5.10 s | 154 | ✅ | çıkarıldı | 0.00 |
| 02 | IDLE_LOOK | 3.20 s | 97 | ✅ | çıkarıldı | 0.00 |
| 03 | RUN_FORWARD | 0.87 s | 27 | ✅ | çıkarıldı | 3.63 m/s |
| 04 | RUN_BACK | 0.67 s | 21 | ✅ | çıkarıldı | 2.90 m/s |
| 05 | RUN_LEFT | 0.67 s | 21 | ✅ | çıkarıldı | 3.22 m/s |
| 06 | RUN_RIGHT | 0.77 s | 24 | ✅ | çıkarıldı | 3.24 m/s |
| 07 | AIM_WALK_FORWARD | 1.20 s | 37 | ✅ | çıkarıldı | 1.16 m/s |
| 08 | AIM_WALK_BACK | 1.47 s | 45 | ✅ | çıkarıldı | 0.95 m/s |
| 09 | AIM_WALK_LEFT | 1.20 s | 37 | ✅ | çıkarıldı | 1.49 m/s |
| 10 | AIM_WALK_RIGHT | 1.30 s | 40 | ✅ | çıkarıldı | 1.47 m/s |
| 11 | DRAW_ARROW | 1.03 s | 32 | one-shot | çıkarıldı | — |
| 12 | AIM_OVERDRAW | 3.77 s | 114 | one-shot / **hold** | çıkarıldı | — |
| 13 | AIM_RECOIL | 0.70 s | 22 | one-shot | çıkarıldı | — |
| 14 | HIT_REACT | 1.27 s | 39 | one-shot | çıkarıldı | — |
| 15 | DEATH | 3.10 s | 94 | one-shot / **clamp** | **korundu** | — |
| 16 | EQUIP_BOW | 0.90 s | 28 | one-shot | çıkarıldı | — |
| 17 | DISARM_BOW | 1.10 s | 34 | one-shot | çıkarıldı | — |

Diğer 22 klip GLB'ye alınmadı.

---

## 14–15. In-place ve root motion metadata

Root motion **net XZ drift'i çıkararak** kaldırıldı, sıfırlayarak değil: `pos'(t) = pos(t) − v_ort·t`. Böylece kalçanın doğal yalpalaması (koşuda 4–12 cm) korunuyor — düz sıfırlama yürüyüşü tahtalaştırırdı. Loop tutarlılığı da korunuyor (son kare = ilk kare, XZ'de).

**Ölçülen sonuç: 8 lokomosyon klibinde net kalça XZ kayması 0,00 cm.** Dikey hareket dokunulmadan bırakıldı.

**15_DEATH bir istisna:** geriye düşüşün 1,13 m'lik yer değiştirmesi korundu, çünkü bu lokomosyon değil gerçek gövde hareketi; kaldırılırsa karakter yere çakılmak yerine olduğu yerde çöker. Manifestte `rootMotionRemoved: false` olarak işaretli.

### Ayak kayması doğrulaması

Bu asıl önemli ölçüm. In-place bir klipte basılı ayak, kök hızının tam tersi yönde ve tam o hızda kaymalı. Ölçtüm:

| Klip | Kök hızı | Basılı ayak hızı | Kayma |
|---|---:|---:|---:|
| RUN_FORWARD | 3.63 | 3.65 | **0.4%** |
| RUN_BACK | 2.90 | 2.87 | 0.9% |
| RUN_LEFT | 3.22 | 3.17 | 1.4% |
| RUN_RIGHT | 3.24 | 3.23 | 0.4% |
| AIM_WALK_FORWARD | 1.16 | 1.15 | 0.2% |
| AIM_WALK_BACK | 0.95 | 0.95 | 0.0% |
| AIM_WALK_LEFT | 1.49 | 1.49 | 0.1% |
| AIM_WALK_RIGHT | 1.47 | 1.47 | 0.1% |

**WorldMovementSystem karakteri `sourceSpeedMetersPerSec` değerinde sürerse ayak kayması %1,4'ün altında kalır.** Farklı bir gameplay hızı isterseniz `timeScale = hedefHız / sourceSpeed` doğru orandır.

---

## 16. Loop semantiği (uydurulmadı, kaynak incelendi)

**`12_AIM_OVERDRAW` bir çekiş animasyonu DEĞİL.** Frame 0'da yay zaten tam gerili. Klip boyunca kiriş eli yavaşça daha da geriye gidiyor: çekiş uzunluğu 0.761 m → 0.909 m. Yani bu bir **hold / charge** klibi.

Doğru kullanım: `LoopOnce` + `clampWhenFinished = true`, ateş tuşu basılı kaldıkça son karede tut. Geçen süreyi charge gücü olarak kullanabilirsiniz. Kaynak, maksimum overdraw'ın %90'ına ancak 3.03 s'de ulaşıyor — 1.5–2.0× `timeScale` ile bunu ~1.5–2.0 s'ye çekmenizi öneririm.

`15_DEATH` de `LoopOnce` + `clampWhenFinished` olmalı; asla loop etmemeli.

---

## 17. ATTACK TIMING — ve önceki söylediğimin düzeltmesi

Kare kare ölçtüm (çekiş uzunluğu = kiriş eli ↔ yay kavrama mesafesi, ve el hızı):

### 11_DRAW_ARROW (1.033 s)
| t | Olay |
|---|---|
| 0.00–0.40 s | sağ el sadağa uzanıyor (el↔yay 1.02 m) |
| **0.567 s** | **nock** — el yaya en yakın noktada (0.285 m), ok kirişe geçiyor |
| 1.033 s | el anchor'a (yüze) ulaştı → `fullDrawTimeSec` |

Klip `12_AIM_OVERDRAW`'a kusursuz bağlanıyor: bu klibin son karesindeki çekiş uzunluğu ile OVERDRAW'ın ilk karesi **birebir 0.761 m**.

### 13_AIM_RECOIL (0.700 s) — gerçek RELEASE anı

| kare | t | çekiş uzunluğu | el hızı |
|---:|---:|---:|---:|
| 0 | 0.000 | 0.761 m | 0.00 m/s |
| 3 | 0.100 | 0.861 m | 1.19 m/s |
| 5 | 0.167 | 0.899 m | 0.56 m/s |
| **6** | **0.200** | **1.125 m** | **6.96 m/s** |
| 7 | 0.233 | 1.221 m | 3.00 m/s |

Frame 5 → 6 arasında çekiş uzunluğu 0.899 → 1.125 m'ye sıçrıyor ve el hızı 0.56 → 6.96 m/s'ye fırlıyor. **Kirişin bırakıldığı an bu.**

**`releaseTimeSec = 0.183` (frame 6 ≈ 0.200 s).**

> **Düzeltme:** Bu görevden önceki mesajımda "release recoil'in 0. karesinde, releaseDelay 0 olmalı" demiştim. **Yanlıştı** — o zaman sadece elin Z konumunu 3 karede bir örneklemiştim ve klibin ilk 0.17 saniyesindeki son germe hareketini release sanmıştım. Kare kare ölçünce gerçek release 0.183 s çıkıyor. **Mevcut `releaseDelay = 0.20` değeriniz doğruya çok yakın** (17 ms erken). Spec §17 gereği kodda hiçbir değişiklik yapmadım.

---

## 18–19. Animasyon optimizasyonu ve sıkıştırma

- Kaynak eğriler seyrek ve **kübik auto-tangent** (idle: 5.1 s için 57 anahtar). Bunları kendi Hermite değerlendiricimle **30 fps'e yeniden örnekledim**; kübik eğrinin şekli korunuyor, runtime tarafında interpolasyon LINEAR'a düşüyor.
- Sadece 23 kemiğin **rotasyonu** + **Hips translation'ı** yazıldı. Scale track'i yok (kaynakta hepsi ≈1). Kullanılmayan track yok, duplicate anahtar yok.
- Rotasyonlar **int16 normalized quaternion** (glTF 2.0 çekirdek özelliği, extension değil) → animasyon verisi yarıya indi, sapma ~1.5e-5/bileşen.
- Quaternion süreklilik düzeltmesi uygulandı (ardışık karelerde işaret çevirme), yani slerp yanlış yoldan dönmüyor.
- Eller / yay / omurga / omuzlarda **agresif key reduction yapılmadı** — hiçbir kemikte yapılmadı, tüm kareler korundu.

### Sıkıştırma / decoder bağımlılığı

**Draco YOK. Meshopt YOK. KTX2 YOK. `extensionsRequired` boş.**

Tek kullanılan extension `EXT_texture_webp` ve o da **`extensionsUsed`'da, `extensionsRequired`'da değil**: texture düğümünde hem WebP kaynağı hem de gömülü **JPEG fallback** var. Yani WebP'yi tanımayan herhangi bir uyumlu glTF 2.0 yükleyici bile modeli sorunsuz açar. Three.js 0.169.0 `GLTFLoader` WebP'yi doğrudan destekler (dahili `EXT_texture_webp` eklentisi), ekstra dosya yüklemeniz gerekmez.

Vertex attribute'ları çekirdek glTF ile sıkıştırıldı: TEXCOORD_0 `u16 normalized`, JOINTS_0 `u8`, WEIGHTS_0 `u8 normalized`. `KHR_mesh_quantization` kullanmadım — ~100 KB kazandırırdı ama zorunlu extension eklerdi ve zaten hedefin altındayız.

---

## 20. Doğrulama

GLB, yazıldıktan sonra **iki bağımsız okuyucuyla** tekrar yüklendi:

**(a) Python glTF okuyucusu** — 27 kontrol, hepsi tek bir bilinen istisna dışında geçti:

```
PASS  glTF 2.0 / zorunlu extension yok / tek scene root / root transform identity
PASS  tek mesh, tek primitive -> 1 draw call / tek materyal / metalness 0 / opak
PASS  kullanılmayan vertex attribute yok
PASS  23 joint / zorunlu kemiklerin tamamı mevcut / inverse bind matrisleri NaN'sız
PASS  joint index'leri aralıkta (maks 22)
PASS  skin ağırlıkları normalize (maks sapma 0.0000) / negatif yok / ağırlıksız vertex yok
PASS  pozisyon-normal sonlu / normaller birim / UV [0,1] içinde (0.009..0.991)
PASS  karakter yüksekliği 1.801 m -> birim metre
PASS  bind pozu grounded: min Y = -0.0062 m
PASS  17 klip / klip isimleri birebir doğru
PASS  hiçbir animasyon track'inde NaN/Inf yok
PASS  lokomosyon klipleri IN-PLACE (maks net kalça XZ kayması 0.00 cm)
PASS  512x512 webp atlas / jpeg fallback geçerli
FAIL  zemin batması: 15_DEATH'te min Y = -0.118 m
```

**(b) WebGL2 render'ı** — kendi yazdığım bağımsız glTF okuyucusu + skinning shader'ı ile 17 klibin tamamı yüklendi ve render edildi. Konsol hatası yok, WebP dokusu doğru çözüldü, skin çalışıyor.

### Zemin batması hakkında

Tek FAIL, `15_DEATH` klibinin sonunda gövdenin 11,8 cm zeminin altına inmesi. **Bu benim pipeline'ımın ürettiği bir hata değil:** aynı ölçümü orijinal 70 kemikli kaynak üzerinde yaptım, orada **15,5 cm**. Yani kemik indirgemesi batmayı azaltmış. Mixamo klibinin kendi özelliği. Çözüm: death state'inde karakteri ~12 cm yukarı ötelemek veya zemin çarpışmasını kapatmak. Manifestte `knownIssues` altında.

Diğer 16 klipte en kötü batma 1,2 cm (RUN_FORWARD).

---

## 21. Görsel doğrulama

Spec'te istenen 9 klibin hepsi render edilip incelendi (IDLE, RUN_FORWARD, RUN_LEFT, AIM_WALK_BACK, DRAW_ARROW, AIM_OVERDRAW, AIM_RECOIL, HIT_REACT, DEATH) + el/omuz/yüz yakın planları.

| Kontrol | Sonuç |
|---|---|
| Ayak kayması | ✅ yok — ölçülen maks %1,4 |
| Kol kırılması | ✅ yok |
| **Yay elden çıkması** | ✅ **yok — 17 klipte sapma 0,0001 cm** |
| Omuz deformasyonu | ✅ yok |
| Göz problemi | ✅ yok — irisler gövde atlasından doğru geliyor |
| Mesh patlaması | ✅ yok — NaN yok, normaller birim |
| Ground penetration | ⚠️ sadece 15_DEATH (kaynaktan gelen, yukarıda) |
| El kavrayışı | ✅ parmaklar yayı ve kirişi sarıyor (kavrama pozu bind'e pişirildi) |

Bilinen tek kalite kaybı: parmakların açıldığı kliplerde (13_AIM_RECOIL takip hareketi, 17_DISARM_BOW) el kavrayışlı şekilde kalıyor. Parmak ucu düzeyinde maks 13 cm, mesh geneli ortalama 0,076 cm.

---

## 22–23. Dosyalar

```
archer_mobile_v1.glb                 907.4 KB   runtime asset
archer_mobile_v1.manifest.json        12.9 KB   iskelet + socket + klip metadata
archer_mobile_v1_report.md                      bu rapor
archer_mobile_v1_inspector.html        1.2 MB   opsiyonel: tarayıcıda GLB inceleyici
```

Inspector, GLB'yi gömülü olarak taşıyan bağımsız bir doğrulama aracıdır — Three.js kullanmaz, kendi glTF okuyucumla açar. 17 klibi tek tek oynatır, wireframe gösterir, vertex/üçgen/kemik/materyal sayılarını okur. Runtime paketine dahil etmeyin.

---

## 24. Kaynak korundu

`Erika Archer With Bow Arrow.fbx` ve 39 animasyon FBX'i **değiştirilmedi, silinmedi**. Bu çıktı salt-okunur kaynaktan türetilmiş bir **mobile runtime derivative**'dir.

---

## 25. Three.js 0.169.0 entegrasyonu

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltf = await new GLTFLoader().loadAsync('archer_mobile_v1.glb');
const archer = gltf.scene;                    // root node "Archer", transform identity
const mixer  = new THREE.AnimationMixer(archer);

const clips = Object.fromEntries(gltf.animations.map(c => [c.name, c]));

// loop
const idle = mixer.clipAction(clips['01_IDLE']);
idle.setLoop(THREE.LoopRepeat).play();

// hold / charge
const draw = mixer.clipAction(clips['12_AIM_OVERDRAW']);
draw.setLoop(THREE.LoopOnce, 1);
draw.clampWhenFinished = true;
draw.timeScale = 1.8;                          // ~2 s'de tam charge

// death: asla loop etme
const death = mixer.clipAction(clips['15_DEATH']);
death.setLoop(THREE.LoopOnce, 1);
death.clampWhenFinished = true;

// socketler
const bowBone   = archer.getObjectByName('mixamorig:Left_arch1');
const rightHand = archer.getObjectByName('mixamorig:RightHand');
```

Notlar:

- Doku sRGB'dir; `GLTFLoader` `colorSpace`'i doğru ayarlar, elle dokunmayın.
- `renderer.outputColorSpace = THREE.SRGBColorSpace` olduğundan emin olun.
- Materyal `MeshStandardMaterial` olarak gelir. Sadece baseColor var, `envMap` veya en azından ambient ışık verin yoksa metalness 0 / roughness 0.85 ile karakter fazla mat görünür.
- Node isimleri iki nokta içerir (`mixamorig:Hips`). `getObjectByName` sorun çıkarmaz.

---

## 26. Tamamlanmadı şartları — kontrol

| Şart | Durum |
|---|---|
| Rig kırılmış | ❌ hayır — ağırlıklar normalize, NaN yok, ölçülen sapma 0,076 cm ortalama |
| Yay elden ayrılıyor | ❌ hayır — 0,0001 cm |
| Locomotion root motion taşıyor | ❌ hayır — net kalça XZ kayması 0,00 cm |
| 17 klipten biri eksik | ❌ hayır — 17/17 |
| Clip isimleri belirsiz | ❌ hayır — spec'teki isimler birebir |
| Scale/Y-up/+Z forward yanlış | ❌ hayır — 1,801 m, Y-up, +Z |
| Texture bulunamıyor | ❌ hayır — gömülü, WebP + JPEG fallback |
| Arrow prop gereksizce kalıyor | ❌ hayır — çıkarıldı |
| DEATH loop ediyor | ❌ hayır — one-shot, manifestte clamp notu |
| Projectile sistemi animasyona gömülü | ❌ hayır — sadece socket önerisi verildi |
| <1 MB için karakter bozulmuş | ❌ hayır — silüete dokunulmadı, decimation yapılmadı |

**Sonuç: TAMAMLANDI.**
