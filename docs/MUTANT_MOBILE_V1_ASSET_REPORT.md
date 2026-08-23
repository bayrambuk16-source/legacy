# PROJECT LEGACY — MUTANT MOBILE GLB OPTIMIZATION V1

**Durum: TAMAMLANDI** — 39. maddedeki tamamlanmadı şartlarının hiçbiri oluşmadı.

| Çıktı | Boyut |
|---|---|
| `mutant_mobile_v1.glb` | **803.4 KB** (822.716 B) |
| `mutant_mobile_v1.manifest.json` | 14.0 KB |
| `mutant_mobile_v1_report.md` | bu dosya |
| `mutant_mobile_v1_inspector.html` | 1.1 MB (runtime paketinin parçası değil) |

Hedef 0.5–1.0 MB idi. **803 KB** ile ideal bandın içinde ve bunun için ne siluetten ne rigden ne animasyondan ödün verildi.

---

## 1–2. Kaynak ve seçilen animasyonlar

| | Bayt | |
|---|---:|---|
| Creature Pack (2).zip | 20.836.300 | 19.9 MB |
| `Mutant.fbx` | 19.805.233 | 18.9 MB |
| 19 animasyon FBX (tümü) | 5.854.035 | 5.6 MB |
| **8 seçilen animasyon FBX** | **2.681.000** | **2.6 MB** |
| **Kullanılan kaynak alt küme (model + 8 klip)** | **22.486.233** | **21.4 MB** |
| **Final GLB** | **822.716** | **803.4 KB** |

**Compression ratio: 27.3× (%96,34 azalma)** — kullanılan alt kümeye göre. Tüm pakete göre 31.2×.

Archer'da olduğu gibi burada da boyutun kaynağı doku: 18.9 MB'lık `Mutant.fbx`'in **15.2 MB'ı** iki adet gömülü 2048² PNG (`Mutant_diffuse` 7.63 MB + `Mutant_normal` 7.52 MB).

Seçilen 8 kaynak dosya:

```
mutant idle.fbx              mutant swiping.fbx
mutant breathing idle.fbx    mutant punch.fbx
mutant walking.fbx           mutant roaring.fbx
mutant run.fbx               mutant dying.fbx
```

## 3. Dışlanan animasyonlar ve nedenleri

| Dosya | Neden |
|---|---|
| `mutant right turn 90` · `mutant right turn 45` · `mutant right turn 45 (2)` · `mutant left turn 45` · `left turn 45` | Turn animasyonu gameplay için gereksiz — mob visual root doğrudan Three.js üzerinden döndürülecek (brief §4) |
| `mutant jumping` · `mutant jumping (2)` · `jump attack` · `mutant jump attack` | Projede jump / dodge / vertical combat locomotion yok (brief §4) |
| `mutant idle (2)` | Üçüncü idle — runtime 2 idle ile sınırlı. Gerekçe aşağıda, madde 11 |
| `mutant flexing muscles` | Brief §5 gereği **OPTIONAL** işaretlendi, V1 runtime GLB'ye alınmadı |

### GLB'ye alınmadı ama önemli: HIT_REACT = **MISSING**

Pakette **hiçbir hit / damage reaction animasyonu yok.** 19 animasyon dosyasının tamamı isme değil içeriğe bakılarak kontrol edildi: 3 idle, walk, run, 5 turn, 4 jump/jump-attack, swipe, punch, roar, dying, flexing muscles. Hiçbiri irkilme/sendeleme değil. **Eksiği kapatmak için hiçbir klip yeniden isimlendirilmedi.** P2.2 öncesi Mixamo'dan gerçek bir hit reaction indirilmeli.

---

## 4–7. Geometri, materyal, draw call

| | Kaynak | Final |
|---|---:|---:|
| Vertex | 6.928 | **6.928** |
| Üçgen | 11.271 | **11.271** |
| Mesh | 1 | **1** |
| Materyal | 1 | **1** |
| Draw call | 1 | **1** |
| Kemik | 37 | **30 skin joint** (+2 attachment node) |

**Decimation yapılmadı ve yapılmasına gerek yoktu.** Kaynak zaten 11.271 üçgenle brief'in verdiği 6k–15k bandının tam ortasında, üstelik tek mesh + tek materyal olarak geliyor. Brief §9 "Model zaten bu civardaysa gereksiz decimation YAPMA" diyor — eller, pençeler, kafa ve omuzlar dokunulmadan bırakıldı. Birleştirme de gerekmedi; mesh zaten tekti.

Archer'daki gibi bir atlas paketlemesine de ihtiyaç olmadı: model tek UV setiyle geliyor, UV aralığı `[0.003, 0.997]`.

---

## 8. Doku — A/B karşılaştırması yapıldı

Brief §11 "körlemesine silme, önce karşılaştır" diyordu. İki varyant üretip aynı kamera/pozdan render edip piksel farkını ölçtüm:

| Varyant | Doku | GLB |
|---|---|---:|
| **A (seçilen)** | 512² baseColor WebP q86 + JPEG fallback | **803.4 KB** |
| B | A + 256² normal map WebP q84 + JPEG fallback | 860.7 KB |

Ölçülen görsel fark (RGB toplam farkı > 20/765 olan piksel oranı):

| Kamera | Farklı piksel |
|---|---:|
| **Orta mesafe (Project Legacy'nin göreceği mesafe)** | **%0,86** |
| Yakın plan gövde | %4,81 |
| Yakın plan pençe/saldırı | %3,49 |

Sebebi net: **kaynak diffuse dokusuna kas gölgelendirmesi ve AO zaten pişirilmiş.** Normal map çoğunlukla aynı bilgiyi tekrar ediyor. Kas/deri okunurluğu diffuse-only ile korunuyor.

**Karar: A.** +57,3 KB ve fazladan bir texture unit karşılığında orta mesafede %0,86 piksel farkı almaya değmez. B varyantı istenirse tek komutla üretilebilir.

Doku sRGB, `metalness = 0`, `roughness = 0.9` — mutant deri/kas yüzeyi için mat, glossy değil.

---

## 9. İskelet analizi ve indirgeme

Kaynak: **37 kemik**, düz bir `mixamorig` humanoid. Cloth / armor / belly / spike / appendage gibi secondary bone **yok** (brief §14 kontrolü).

Dikkat çeken bir asimetri var: **parmak kemikleri yalnızca SAĞ elde.** Sağ el Index/Pinky/Thumb zincirlerine (12 kemik) sahipken sol elin parmak kemiği yok ve `mixamorig:LeftHand` **sıfır skin ağırlığı taşıyor** — sol pençenin tamamı `mixamorig:LeftForeArm`'a skinli (679 vertex, X +0.43..+1.49 m). Bu, swipe saldırısının hangi kemikle sürüldüğünü belirlediği için kritik; madde 14'e bakın.

### Ölçüm: hangi kemikler gerçekten animasyonlu (8 klip boyunca)

| Kemik grubu | Rotasyon varyasyonu | Karar |
|---|---:|---|
| Gövde / kollar / bacaklar | 20°–113° | korundu |
| Sağ el parmakları (Index1-3, Pinky1-3, Thumb1-3) | 28°–85° | **korundu** |
| `RightHandIndex4/Pinky4/Thumb4` | **0,000°** | silindi |
| `LeftToe_End`, `RightToe_End` | **0,000°** | silindi |
| `HeadTop_End` | **0,000°** | attachment node olarak tutuldu |
| `LeftHand` | **0,000°** | attachment node olarak tutuldu |

Silinen 5 kemiğin hepsi hem **sıfır skin ağırlığı** taşıyor hem de 8 klibin tamamında bind local transformundan **0,000° / 0,0000 cm** sapıyor. Bu yüzden indirgeme matematiksel olarak **birebir kayıpsız**: ölçülen skinning sapması **0,0000 cm**.

**Parmaklar birleştirilmedi.** Brief §13 "Mutantın elleri ekranda büyük ve saldırının önemli parçasıysa gerekirse parmak kemiklerini koru" diyor. Sağ el punch'ın vuruş yüzeyi ve parmaklar 85°'ye varan gerçek hareket yapıyor — Archer'daki gibi bind'e pişirme burada yanlış olurdu. Hedef sayı zorlanmadı.

**İki attachment node** (skin joint değil, animasyon track'i de yok, maliyeti ~0 bayt):
- `mixamorig:LeftHand` — sol pençe için debug melee reach / efekt bağlama noktası
- `mixamorig:HeadTop_End` — kafa üstü çapa (can barı, hasar sayısı, aggro işareti)

Final: **30 skin joint + 2 attachment node = 32 iskelet node'u.**

---

## 10. 8 klip

| # | Klip | Kaynak | Süre | Kare | Loop | Root motion | Hız |
|---|---|---|---:|---:|---|---|---:|
| 01 | IDLE | mutant idle | 14.23 s | 428 | ✅ | çıkarıldı | — |
| 02 | IDLE_BREATHE | mutant breathing idle | 4.03 s | 122 | ✅ | çıkarıldı | — |
| 03 | WALK | mutant walking | 1.43 s | 44 | ✅ | çıkarıldı | 1.21 m/s |
| 04 | RUN | mutant run | 0.87 s | 27 | ✅ | çıkarıldı | 2.21 m/s |
| 05 | ATTACK_SWIPE | mutant swiping | 2.67 s | 81 | one-shot | çıkarıldı | — |
| 06 | ATTACK_PUNCH | mutant punch | 1.10 s | 34 | one-shot | çıkarıldı | — |
| 07 | ROAR | mutant roaring | 5.40 s | 163 | one-shot | çıkarıldı | — |
| 08 | DEATH | mutant dying | 4.60 s | 139 | one-shot / **clamp** | **korundu** | — |

---

## 11. Idle seçim gerekçesi

Üç idle hem teknik hem görsel olarak karşılaştırıldı.

| Klip | Süre | Loop seam (vertex) | Hareket genliği | Karakter |
|---|---:|---:|---:|---|
| **`mutant idle`** | 14.23 s | **0,47 cm** / 0,94° | 6,91° | Çoğunlukla sakin duruş, ~7. saniyede tek bir doğal geriniş/esneme |
| `mutant idle (2)` | 5.30 s | **2,09 cm** / 6,14° | **9,49°** | En hareketli — 5.3 s içinde iki kez kolları kaldırıyor, tedirgin/agresif |
| **`mutant breathing idle`** | 4.03 s | **0,00 cm** / 0,00° | 1,04° | Saf nefes alma, başka hiçbir şey yok |

**01_IDLE = `mutant idle`.** En doğal ana bekleme: uzun süre sakin duruyor, arada bir canlılık veren tek bir geriniş yapıyor, ve 14 saniyelik döngüsü neredeyse kusursuz kapanıyor (0,47 cm). Uzun süre kadrajda duracak bir mob için tekrar hissi en az olan seçenek.

**02_IDLE_BREATHE = `mutant breathing idle`.** Loop seam'i **matematiksel olarak sıfır** — hiç pop yok. Sakin ve belirgin biçimde "canlı ama hareketsiz" bir alternatif.

**`mutant idle (2)` neden alınmadı:** en hareketli olan o, ama loop dikişi diğerlerinden 4–5 kat kötü (2,09 cm / 6,14° vertex sıçraması). Tarz değil, **ölçülmüş loop kalitesi** yüzünden elendi. İleride "agitated / combat idle" olarak istenirse çapraz geçişle (crossfade) kullanılabilir — sert kesmeyin.

**Maliyet notu:** 01_IDLE tek başına 107 KB, yani dosyanın %13'ü. Kare kare kontrol ettim: **daha kısa temiz bir alt döngüsü yok**, 14.23 s tek bir bütün cycle. Yer gerekirse `mutant idle (2)`'ye (5.3 s) geçilebilir, 2,09 cm dikiş kabul edilerek.

### OPTIONAL: `mutant flexing muscles`

4.67 s, loop seam 0,69°, root motion 0.000 m. Görselde ~2.3 saniyede öne doğru kamburlaşıp kaslarını geriyor — **taunt / elite introduction / boss idle special** olarak gerçekten iyi duruyor. Brief §5 gereği manifestte `optionalClips` altında OPTIONAL işaretlendi, V1 GLB'ye alınmadı. Sonradan eklenirse ~35 KB.

---

## 12–13. Walk / run hızları ve ayak kayması

Root motion, XZ net drift'i çıkarılarak kaldırıldı — sıfırlanarak değil: `pos'(t) = pos(t) − v_ort·t`. Kalçanın doğal yalpalaması korunuyor, loop tutarlılığı bozulmuyor (son kare = ilk kare, XZ'de). **Ölçülen net kalça XZ kayması: 0,00 cm.**

| Klip | Source speed | Basılı ayak hızı | **Ayak kayması** | Loop seam |
|---|---:|---:|---:|---:|
| 03_WALK | **1,21 m/s** | 1,21 | **%0,3** | 1,13° / 1,40 cm |
| 04_RUN | **2,21 m/s** | 2,23 | **%1,2** | 0,70° / 0,22 cm |

Yön: ikisi de `[0, 0, +1]` (tam ileri).

**MobAi mobu `sourceSpeedMetersPerSec` değerinde sürerse ayak kayması %1,2'nin altında kalır.** Farklı bir gameplay hızı isterseniz doğru oran `timeScale = hedefHız / sourceSpeed`. Bu task'te MobAi hız değerlerine dokunulmadı.

Tek uyarı: WALK'ın loop dikişi 1,40 cm (RUN 0,22 cm). Kısa bir crossfade ile görünmez, ama loop noktasında sert kesmeyin.

---

## 14. SWIPE saldırısı — kare kare

Kemik orijinini değil, **gerçek pençe ucu vertexlerini** takip ettim (sol kolun tamamı tek kemikle sürüldüğü için kemik orijini dirsekte kalıyor ve yanıltıyor).

**Vuran uzuv: SOL PENÇE** — `mixamorig:LeftForeArm`. Sağ kol swing sırasında yalnızca karşı-dönüş yapıyor, 37. kareye kadar hiç 6 m/s'yi geçmiyor, vurmuyor.

| Faz | Kare | Zaman | Ne oluyor |
|---|---|---|---|
| Hazırlık | 0–17 | 0.000–0.567 s | Yaratık yerleşiyor, pençe önde (z ≈ +0.5 m) |
| **Windup** | 18–32 | 0.600–1.067 s | Sol pençe geriye çekiliyor, kalçanın **1,19 m arkasına** kadar |
| Swing | 33–38 | 1.100–1.267 s | Öne savruluyor |
| **CONTACT** | **39** | **1.300 s** | Pençe kalçanın **1,496 m önünde**, merkeze uzaklık **1,530 m** |
| Follow-through | 40–80 | 1.333–2.667 s | Geri çekilme |

- Zirve pençe hızı: **37,9 m/s**
- **Temas penceresi: kare 37–40.** Swing ön bölgeyi 3 karede geçiyor, o yüzden hit detection'da tek an değil pencere kullanın.
- Root motion: 0,032 m — ihmal edilebilir, gameplay pozisyonuna dokunmuyor.

**Not:** vuruş klibin %49'unda. 2,67 saniyelik toplam süre bir mob saldırı döngüsü için uzun; ilk 0,5 saniyeyi kırpmak veya `timeScale` ile hızlandırmak isteyebilirsiniz. Brief §19 gereği **gameplay timing'e dokunulmadı**, yalnız ölçüldü.

## 15. PUNCH saldırısı — kare kare

**Vuran uzuv: SAĞ YUMRUK** — `mixamorig:RightHand` (+ 3 parmak zinciri).

| Faz | Kare | Zaman | Ne oluyor |
|---|---|---|---|
| **Windup** | 0–5 | 0.000–0.167 s | Yumruk geriye çekiliyor (z: +0.391 → −0.008) |
| Uzatma | 6–7 | 0.200–0.233 s | Patlayıcı açılım |
| **CONTACT** | **8** | **0.267 s** | Yumruk kalçanın **0,844 m önünde**, uzaklık **0,852 m** |
| Zirve hız | 9 | 0.300 s | 17,24 m/s (maksimum uzanmadan 1 kare sonra) |
| Toparlanma | 10–33 | 0.333–1.100 s | Geri çekiliş ve duruşa dönüş |

- **Temas penceresi: kare 7–10.**
- Root motion: **0,000 m** — tamamen yerinde.

## 16. Hangisi basic, hangisi heavy?

| | PUNCH | SWIPE |
|---|---:|---:|
| Toplam süre | 1,10 s | 2,67 s |
| Vuruş anı | 0,267 s (%24) | 1,300 s (%49) |
| Menzil | 0,85 m | **1,53 m** |
| Zirve uzuv hızı | 17,2 m/s | **37,9 m/s** |

**Öneri: `06_ATTACK_PUNCH` = basic attack, `05_ATTACK_SWIPE` = heavy attack.** Punch 2,4 kat kısa döngüde bitiyor ve vuruşu erken geliyor — sık tekrarlanan temel saldırı için doğru. Swipe %80 daha uzun menzilli ve çok daha uzun windup'lı — telegraph edilebilir ağır saldırı için doğru. Gameplay design implement edilmedi, yalnız öneri.

## 17. ROAR

- Süre **5,40 s** / 163 kare, `loop = false`.
- **Peak pose: t = 1,40 s** — kol açıklığı 0,87 m → 1,07 m maksimuma çıkıyor, kafa kalçanın 0,710 m üstüne kalkıyor (idle'da 0,495 m).
- İlk/son poz farkı **15,07°** → temiz loop etmiyor, zaten one-shot olmalı.
- Root motion 0,009 m — yerinde.
- Kullanım: aggro / spawn / combat intro **görsel** amaçlı. Kısa bir intro isterseniz **0,0–2,2 s** aralığı yeterli. Brief §22 gereği **gameplay effect uydurulmadı** — combat damage üretmez.

## 18. DEATH

- Süre **4,60 s** / 139 kare, `LoopOnce` + `clampWhenFinished`. İlk/son poz farkı **91,2°** — loop ederse kesinlikle patlar.
- Final poz: sırtüstü yatıyor, mesh tepesi yerden 0,434 m → corpse düzgün duruyor.
- **Root motion korundu: 0,866 m geriye** (vektör `[−0.05, −0.64, −0.87]`). Bu locomotion değil, düşen gövdenin gerçek yer değiştirmesi; kaldırılırsa yaratık geriye devrilmek yerine olduğu yerde çöker. Manifestte `rootMotionRemoved: false` olarak işaretli. Gameplay pozisyon yetkisi MobAi / MobSlotSystem'de kalıyor.
- **Ground penetration: 0,0705 m** (düşüşün sonunda). Kaynak Mixamo klibinden geliyor. Çözüm: death state'inde ~7 cm yukarı ötelemek veya zemin çarpışmasını kapatmak.

## 19. Root motion özeti

| Klip | Kaynak net XZ | Runtime |
|---|---:|---|
| 01_IDLE / 02_IDLE_BREATHE | ~0,00 m | çıkarıldı |
| 03_WALK | 1,74 m | **çıkarıldı** → in-place |
| 04_RUN | 1,91 m | **çıkarıldı** → in-place |
| 05_ATTACK_SWIPE | 0,032 m | çıkarıldı (ihmal edilebilirdi) |
| 06_ATTACK_PUNCH | 0,000 m | — |
| 07_ROAR | 0,009 m | çıkarıldı |
| 08_DEATH | 0,866 m | **korundu**, visual root motion olarak sınıflandırıldı |

Hiçbir klip mobu dünyada kendi başına taşımıyor (DEATH hariç, ki o da bilinçli ve işaretli).

## 20. El ve secondary bone korunumu

- Sağ el parmak zincirleri (9 animasyonlu kemik) **korundu** — punch'ın vuruş yüzeyi.
- Sol pençe zaten `LeftForeArm`'a skinli, dokunulmadı — swipe'ın vuruş yüzeyi.
- Secondary bone (cloth/armor/spike/appendage) rigde **yok**.
- Silinen 5 kemiğin tamamı sıfır ağırlıklı ve bind'den sıfır sapmalı → **skinning deviation 0,0000 cm**.

---

## 21. Sıkıştırma ve extension'lar

**Draco YOK. Meshopt YOK. KTX2 YOK. `extensionsRequired` boş.**

Tek kullanılan extension `EXT_texture_webp` ve o da yalnız `extensionsUsed`'da: texture düğümünde hem WebP kaynağı hem gömülü **JPEG fallback** var, dolayısıyla WebP'yi tanımayan herhangi bir uyumlu glTF 2.0 yükleyici bile dosyayı açar. **Zorunlu decoder bağımlılığı sıfır.**

Çekirdek glTF ile yapılan sıkıştırma:
- `TEXCOORD_0` → `u16 normalized`, `JOINTS_0` → `u8`, `WEIGHTS_0` → `u8 normalized`
- Animasyon rotasyonları → **`i16 normalized` quaternion** (glTF 2.0 çekirdeği, extension değil) — animasyon verisi yarıya indi
- Sadece rotasyon track'i + Hips translation. Scale track'i yok, kullanılmayan track yok.
- Kaynak eğriler kübik auto-tangent; kendi Hermite değerlendiricimle **30 FPS'e resample** edildi, quaternion süreklilik düzeltmesi uygulandı (ardışık karelerde işaret çevirme). Eller / saldırılar / omurga / kafa üzerinde agresif key reduction **yapılmadı** — hiçbir kemikte yapılmadı.

### GLB içi dağılım

| Bölüm | KB | % |
|---|---:|---:|
| Geometri | 309,6 | 38,5 |
| Animasyon (8 klip) | 259,5 | 32,3 |
| JPEG fallback dokusu | 86,4 | 10,8 |
| WebP dokusu | 77,9 | 9,7 |
| JSON chunk | 68,1 | 8,5 |
| Inverse bind matrisleri | 1,9 | 0,2 |

Klip başına animasyon maliyeti: IDLE 107,0 · ROAR 40,8 · DEATH 34,8 · IDLE_BREATHE 30,5 · SWIPE 20,2 · WALK 11,0 · PUNCH 8,5 · RUN 6,8 KB.

---

## 22. Three.js 0.169.0

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltf = await new GLTFLoader().loadAsync('mutant_mobile_v1.glb');
const mutant = gltf.scene;                    // root "Mutant", transform identity
const mixer  = new THREE.AnimationMixer(mutant);
const clips  = Object.fromEntries(gltf.animations.map(c => [c.name, c]));

mixer.clipAction(clips['01_IDLE']).setLoop(THREE.LoopRepeat).play();

const death = mixer.clipAction(clips['08_DEATH']);
death.setLoop(THREE.LoopOnce, 1);
death.clampWhenFinished = true;               // corpse holds the final pose

const roar = mixer.clipAction(clips['07_ROAR']);
roar.setLoop(THREE.LoopOnce, 1);
roar.clampWhenFinished = true;

// debug melee reach
const swipeBone = mutant.getObjectByName('mixamorig:LeftForeArm');  // sol pençe
const punchBone = mutant.getObjectByName('mixamorig:RightHand');    // sağ yumruk
const headTop   = mutant.getObjectByName('mixamorig:HeadTop_End');  // can barı çapası
```

- Ekstra decoder gerekmez, CDN gerekmez.
- Doku sRGB; `GLTFLoader` colorSpace'i doğru ayarlar. `renderer.outputColorSpace = THREE.SRGBColorSpace` olduğundan emin olun.
- Materyal `MeshStandardMaterial` olarak gelir; sadece baseColor var, `metalness 0 / roughness 0.9` ile ambient veya envMap vermezseniz fazla mat görünür.
- Node isimleri iki nokta içerir (`mixamorig:Hips`) — `getObjectByName` sorun çıkarmaz.

---

## 23. Doğrulama

GLB, yazıldıktan sonra **iki bağımsız okuyucuyla** tekrar yüklendi.

**(a) Python glTF okuyucusu — 28 kontrol, hepsi geçti:**

```
PASS  glTF 2.0 / zorunlu extension yok / tek scene root / root transform identity
PASS  tek mesh, tek primitive -> 1 draw call / tek materyal / metalness 0 / opak
PASS  kullanılmayan vertex attribute yok
PASS  30 joint / zorunlu kemiklerin tamamı mevcut (parmaklar dahil)
PASS  inverse bind matrisleri NaN'sız / joint index'leri aralıkta (maks 29)
PASS  skin agirliklari normalize (maks sapma 0.0000) / negatif yok / agirliksiz vertex yok
PASS  pozisyon-normal sonlu / normaller birim / UV [0,1] icinde (0.003..0.997)
PASS  karakter yuksekligi 1.861 m -> birim metre
PASS  bind pozu grounded: min Y = -0.0059 m
PASS  8 klip / klip isimleri birebir dogru
PASS  hicbir animasyon track'inde NaN/Inf yok
PASS  lokomosyon klipleri IN-PLACE (maks net kalca XZ kaymasi 0.00 cm)
PASS  DEATH authored displacement'i koruyor (0.87 m) - manifestte isaretli
PASS  ground penetration tolerans icinde (en kotu -0.067 m, 08_DEATH)
PASS  512x512 webp dokusu / jpeg fallback gecerli / 1 materyal - 1 draw call

RESULT: ALL CHECKS PASSED
```

**(b) WebGL2 render'ı** — Three.js kullanmadan, kendi yazdığım bağımsız glTF okuyucusu + skinning shader'ı ile 8 klibin tamamı yüklenip render edildi. Konsol hatası yok, WebP dokusu doğru çözüldü, skin çalışıyor.

## 24. Görsel doğrulama

Brief §34'te istenen klipler hem yakın plandan hem Project Legacy'ye benzer 3/4 orta mesafeden incelendi (IDLE, RUN, ATTACK_SWIPE, ATTACK_PUNCH, ROAR, DEATH + WALK, IDLE_BREATHE).

| Kontrol | Sonuç |
|---|---|
| Mesh patlaması | ✅ yok — NaN yok, normaller birim |
| Kol kırılması | ✅ yok |
| Shoulder collapse | ✅ yok |
| El deformasyonu | ✅ yok — parmaklar korunduğu için sağ el punch'ta bozulmuyor |
| Foot sliding | ✅ ölçülen maks %1,2 |
| Ground penetration | ⚠️ sadece 08_DEATH (0,0705 m, kaynaktan) |
| Texture blur | ✅ yok — 512 diffuse orta mesafede net, A/B farkı %0,86 |
| Animation pop | ⚠️ 03_WALK loop dikişi 1,40 cm (crossfade ile görünmez) |
| Saldırı okunurluğu | ✅ swipe'ın geniş sol pençe yayı ve punch'ın düz sağ yumruğu net ayırt ediliyor |

## 25. Bilinen sorunlar

1. **08_DEATH 7 cm zemin batması** — Mixamo kaynak klibinden geliyor, pipeline üretmiyor. Death state'inde karakteri ~7 cm ötele veya zemin çarpışmasını kapat.
2. **08_DEATH 0,87 m geri yer değiştirme** — bilinçli korundu (gerçek gövde hareketi). MobAi pozisyon yetkisini etkilemez, sadece görsel.
3. **03_WALK 1,40 cm loop dikişi** — kısa crossfade ile görünmez, sert kesme yapmayın.
4. **01_IDLE 107 KB, dosyanın %13'ü** — 14,23 s tek parça cycle, daha kısa temiz alt döngüsü yok (kare kare doğrulandı). Yer gerekirse `mutant idle (2)` (5,3 s) alternatifi var, 2,09 cm dikiş bedeliyle.
5. **HIT_REACT eksik** — pakette yok, uydurulmadı. P2.2 öncesi Mixamo'dan indirilmeli.

---

## 26–28. Dosyalar

```
mutant_mobile_v1.glb                803.4 KB   runtime asset
mutant_mobile_v1.manifest.json       14.0 KB   iskelet + saldırı timing + klip metadata
mutant_mobile_v1_report.md                     bu rapor
mutant_mobile_v1_inspector.html       1.1 MB   opsiyonel: tarayıcıda GLB inceleyici
```

Inspector, GLB'yi gömülü taşıyan bağımsız bir doğrulama aracıdır — Three.js kullanmaz, kendi glTF okuyucumla açar. 8 klibi tek tek oynatır, wireframe gösterir, vertex/üçgen/kemik/materyal/doku sayılarını okur. **Runtime oyun paketine dahil edilmeyecek.**

## Kaynak korundu

`Creature Pack (2).zip` içindeki orijinal FBX'ler **değiştirilmedi, silinmedi**. Bu çıktı salt-okunur kaynaktan türetilmiş bir **mobile runtime derivative**'dir.

---

## 39. Tamamlanmadı şartları — kontrol

| Şart | Durum |
|---|---|
| Rig kırılmış | ❌ hayır — skinning sapması 0,0000 cm (kayıpsız indirgeme) |
| Swipe/Punch sırasında kol veya el bozuluyor | ❌ hayır — parmaklar korundu, görsel doğrulandı |
| Walk/Run net root locomotion taşıyor | ❌ hayır — net kalça XZ kayması 0,00 cm |
| Attack clip hit zamanı ölçülmemiş | ❌ ölçüldü — SWIPE 1,300 s (kare 39), PUNCH 0,267 s (kare 8) |
| Death loop ediyor | ❌ hayır — one-shot, clamp notu manifestte |
| Turn/jump animasyonları runtime'a alınmış | ❌ hayır — 9 dosyanın tamamı dışlandı |
| Model scale/axis yanlış | ❌ hayır — 1,861 m, metre, Y-up, +Z forward |
| Texture bulunamıyor | ❌ hayır — gömülü, WebP + JPEG fallback |
| Animation clip isimleri belirsiz | ❌ hayır — brief'teki 8 isim birebir |
| Three.js 0.169 GLTFLoader ile açılamıyor | ❌ hayır — zorunlu extension yok, bağımsız okuyucuyla doğrulandı |
| <1 MB uğruna mob bozulmuş | ❌ hayır — decimation yok, parmaklar korundu, siluete dokunulmadı |

**Sonuç: TAMAMLANDI.**
