# ARCHER ANIMATION ASSET SPEC — V1

**Durum:** normatif. Bu belge Archer animasyon paketinin **teknik standardıdır**.
**Bu aşamada entegrasyon YAPILMAMIŞTIR** — gerçek atlaslar henüz teslim edilmedi.

## 0. Kaynak ve kapsam

Standardın görsel referansı, kullanıcı tarafından yüklenen **master spec poster**'dır
(karakter tasarımı, 8 yön düzeni, animasyon türleri, kare sayıları, 300×300 kare
mantığı, `(150, 264)` foot anchor, yön isimleri).

> **Poster bir RUNTIME ASSET DEĞİLDİR.**
> Posterdeki küçük karakter kareleri final kalite değildir. Posterden kırpma yapılarak
> oyun asset'i üretilmesi **yasaktır**. Poster yalnız görsel/teknik referanstır.

Bu belge yalnız **Archer** içindir. Diğer sınıflar aynı standardı miras alacaksa
ayrı belge açılır.

---

## 1. Teslim edilecek dosyalar

176 ayrı dosya **istenmiyor**. Beş atlas + bir metadata:

| Dosya | İçerik |
|---|---|
| `archer_walk.webp` | 8 yön × 8 kare |
| `archer_attack.webp` | 8 yön × 6 kare |
| `archer_skill.webp` | 8 yön × 6 kare |
| `archer_idle.webp` | 8 yön × 1 kare |
| `archer_dead.webp` | 8 yön × 1 kare |
| `archer_animation.json` | metadata (bkz. §9) |

Gölge ayrı asset **zorunlu değildir**; runtime prosedürel elips gölge kullanır.

Kaynak (art production) tarafında **lossless PNG** kullanılabilir/kullanılmalıdır.
Pipeline: `source PNG → validation → optimized WebP runtime atlas` (bkz. §12).

---

## 2. Direction order — KESİNLİKLE SABİT

Bütün atlasların **satır** sırası aynıdır:

| row | yön |
|---|---|
| 0 | `ARKA` |
| 1 | `ARKA_SAG` |
| 2 | `SAG` |
| 3 | `ON_SAG` |
| 4 | `ON` |
| 5 | `ON_SOL` |
| 6 | `SOL` |
| 7 | `ARKA_SOL` |

```ts
AtlasDirectionRow = {
  BACK: 0, BACK_RIGHT: 1, RIGHT: 2, FRONT_RIGHT: 3,
  FRONT: 4, FRONT_LEFT: 5, LEFT: 6, BACK_LEFT: 7,
}
```

**Yön eşlemesi hiçbir yerde tahmin edilmez.** Runtime'ın kendi yön enum sırası bundan
farklıysa **atlas değiştirilmez**; runtime tarafında açık bir eşleme tablosu yazılır.

### 2.1 Mevcut runtime enum'u ile eşleme (bilgi)

P1.1.4 runtime'ı yönleri açıdan türetiyor (`0° = +X = SAĞ`, saat yönünde):

| runtime index | yön | **atlas row** |
|---|---|---|
| 0 | SAĞ | **2** |
| 1 | ÖN_SAĞ | **3** |
| 2 | ÖN | **4** |
| 3 | ÖN_SOL | **5** |
| 4 | SOL | **6** |
| 5 | ARKA_SOL | **7** |
| 6 | ARKA | **0** |
| 7 | ARKA_SAĞ | **1** |

Bu tablo `(index + 2) % 8` formülüne denk gelir; **formül koda yazılmaz**, tablo yazılır
ve iki sıradan biri değişirse yakalansın diye tabloyu doğrulayan bir test bulunur.

---

## 3. WALK — `archer_walk.webp`

| | |
|---|---|
| yön | 8 |
| yön başına kare | **8 gerçek farklı yürüyüş karesi** |
| toplam | 64 |
| atlas | `columns = 8`, `rows = 8` |
| nominal boyut | `2400 × 2400 px` |
| fps (başlangıç) | **10** — config'ten değiştirilebilir |
| loop | `true` |

Döngü gerçekten şunları içermeli: sağ ayak ileri → weight shift → neutral/pass →
sol ayak ileri → geçiş.

**Kabul edilmeyecekler:**
- Aynı resmin 8 kez tekrarlanıp birkaç piksel oynatılması.
- Gövdeyi prosedürel olarak yukarı-aşağı zıplatarak "yürüyüş" hissi verilmesi
  (bu P1.1.4'teki geçici çözümdü ve **kaldırılacaktır**, bkz. §8).

---

## 4. ATTACK — `archer_attack.webp`

| | |
|---|---|
| yön | 8 |
| yön başına kare | 6 |
| toplam | 48 |
| atlas | `columns = 6`, `rows = 8` |
| nominal boyut | `1800 × 2400 px` |
| fps (başlangıç) | **16–20** — config'ten değiştirilebilir |
| loop | `false` |

Akış: `idle → yayı kaldır → kirişi ger → release → recoil/recovery → idle`.

**`releaseFrame` metadata'da bulunmak zorundadır.** Final art tarafından
doğrulanmadan tahmin edilmez (bkz. §9).

---

## 5. SKILL — `archer_skill.webp`

| | |
|---|---|
| yön | 8 |
| yön başına kare | 6 |
| toplam | 48 |
| atlas | `columns = 6`, `rows = 8` |
| nominal boyut | `1800 × 2400 px` |
| fps (başlangıç) | **16** |
| loop | `false` |

Skill, normal attack'tan **görsel olarak ayırt edilebilmeli** (farklı poz/duruş,
farklı çekiş).

**Ağır particle efektleri karakter sheet'ine BAKED EDİLMEZ.** Sheet yalnız
karakter hareketi/pozu ve bow draw/release içerir. Projectile trail, glow, magic
efekt gibi şeyler gameplay FX katmanından gelir.

`releaseFrame` burada da metadata'dan okunur.

---

## 6. IDLE — `archer_idle.webp`

| | |
|---|---|
| yön | 8 |
| yön başına kare | 1 |
| atlas | `columns = 1`, `rows = 8` |
| nominal boyut | `300 × 2400 px` |
| loop | `true` (tek kare) |

Idle karakter:
- saldırı yapıyor gibi görünmemeli,
- yay tam saldırı geriliminde olmamalı,
- hareket etmemeli,
- **ayakları zemine basmalı** (anchor kuralı §8).

---

## 7. DEAD — `archer_dead.webp`

| | |
|---|---|
| yön | 8 |
| yön başına kare | 1 (final death pose) |
| atlas | `columns = 1`, `rows = 8` |
| nominal boyut | `300 × 2400 px` |
| loop | `false` |

V1 için tek poz kabul edilir. İleride çok kareli death animasyonu yapılabilsin diye
runtime **data-driven** kalır: kare sayısı metadata'dan okunur, koda gömülmez.

---

## 8. Foot anchor

Bütün 300×300 karelerde referans:

```
footAnchorX = 150      → originX = 0.5
footAnchorY = 264      → originY = 0.88
```

Bütün karelerde karakterin **world-ground bağlantısı aynı anchor noktasına göre**
düzenlenir.

Yürüyüş sırasındaki doğal dikey hareket **sprite'ın kendi çiziminin içinde** olabilir.
Bu yüzden renderer ek olarak:

- `hop` / `bob` / `bounce` / `squash-stretch`

**uygulamaz.** Aksi hâlde çift hareket oluşur. (P1.1.4'te bu efektler var; gerçek walk
atlası devreye girdiğinde kapatılacaklar — bkz. `docs/ARCHER_RUNTIME_GAP.md`.)

---

## 9. Metadata — `archer_animation.json`

Şema: `docs/schema/archer_animation.schema.json`
Varsayılan örnek: `docs/schema/archer_animation.example.json`

```json
{
  "frameWidth": 300,
  "frameHeight": 300,
  "footAnchor": { "x": 150, "y": 264 },
  "directionRows": {
    "BACK": 0, "BACK_RIGHT": 1, "RIGHT": 2, "FRONT_RIGHT": 3,
    "FRONT": 4, "FRONT_LEFT": 5, "LEFT": 6, "BACK_LEFT": 7
  },
  "animations": {
    "walk":   { "frames": 8, "fps": 10, "loop": true },
    "attack": { "frames": 6, "fps": 18, "loop": false, "releaseFrame": null },
    "skill":  { "frames": 6, "fps": 16, "loop": false, "releaseFrame": null },
    "idle":   { "frames": 1, "loop": true },
    "dead":   { "frames": 1, "loop": false }
  }
}
```

**`releaseFrame = null` ise runtime projectile timing'i TAHMİN ETMEZ.** Bu durumda
mermi, mevcut davranışta olduğu gibi cast anında çıkar ve metadata'da bunun
doğrulanmadığı DEV panelinde görünür. Final artwork geldiğinde gerçek kare belirlenir.

### 9.1 Öneri (spec'e ek — sanatçıdan istenmesi opsiyonel)

Aşağıdaki alanlar **kullanıcının orijinal şemasında yoktu**, ben ekliyorum. Zorunlu
değildir; verilmezse runtime ilgili özelliği **kapatır, tahmin etmez**:

| alan | ne işe yarar | verilmezse |
|---|---|---|
| `animations.walk.contactFrames` | ayak yere bastığı kare indeksleri (toz efekti, gölge nabzı) | toz/nabız üretilmez |
| `animations.*.pivotOverrides` | belirli karede anchor kayıyorsa kare bazlı düzeltme | tekil anchor kullanılır |
| `sourceFormat` / `version` / `producedAt` | teslim izlenebilirliği | rapor bilgisi eksik kalır |

---

## 10. Movement ve attack facing ayrımı

İki ayrı yön kavramı korunur:

**Movement**
```
joystick vector → movementDirection → 8 yön WALK satırı
```

**Combat**
```
player world pos → target world pos → attackDirection → 8 yön ATTACK/SKILL satırı
```

Saldırı sırasında **hedef yönü movement direction'dan önceliklidir**: oyuncu sağa
yürürken sol-üstteki moba skill atıyorsa skill animasyonu `ARKA_SOL` satırında oynar.

Saldırı tamamlandıktan sonra:
- oyuncu hâlâ hareket ediyorsa → movement facing'e dön,
- durmuşsa → son uygun facing korunur.

---

## 11. Player animation state

```
idle · walk · attack · skill · dead
```

Öncelik:

```
dead  >  skill / attack  >  walk  >  idle
```

- Walk animasyonu **kesinlikle** attack sheet'inden alınmaz.
- Attack başarısızsa (menzil/cooldown/mana/hedefsiz) attack animasyonu **başlamaz**.
- Skill başarısızsa skill animasyonu **başlamaz**.

---

## 12. Format ve pipeline

- **Runtime teslim formatı: WebP.**
- Kaynak/art production tarafında **lossless PNG** kullanılabilir.
- Pipeline: `source PNG → validation → optimized WebP runtime atlas`.
- **Kaynak kalite sırf preview boyutu için yok edilmez.**

Doğrulama (§14) **PNG kaynak üzerinde** çalışır: WebP'ye çevrildikten sonra
pixel-identical duplicate ve boş-kare tespiti güvenilir olmaz.

---

## 13. Kırpma / optimizasyon — ŞİMDİLİK YOK

İlk entegrasyonda `300 × 300` kare ve `(150, 264)` anchor **korunur**. Sebep: mevcut
P1.1.4 prototipinin koordinat/anchor davranışıyla karşılaştırmayı kolaylaştırmak.

Assetler doğru çalıştıktan **sonra** ayrı bir optimizasyon aşamasında değerlendirilir:
trim, daha küçük kare, texture packing.

Animasyon doğruluğu, performans mikro-optimizasyonuyla karıştırılmaz.

---

## 14. Kabul kriterleri — sprite validator

Araç: `tools/validate-archer-sprites.mjs` — `npm run validate:archer`

Kontroller:

| Kontrol | Sonuç |
|---|---|
| atlas genişlik/yükseklik doğru mu (`frameW × cols`, `frameH × rows`) | **FAIL** |
| satır/sütun çıkarımı deterministik mi (tam bölünüyor mu) | **FAIL** |
| 8 direction row var ve dolu mu | **FAIL** |
| beklenen kare sütun sayısı doğru mu | **FAIL** |
| alfa kanalı var mı, gerçekten şeffaflık içeriyor mu | **FAIL** |
| tamamen boş kare var mı | **FAIL** |
| pixel-identical kopya kare var mı (aynı yön içinde) | **FAIL** |
| perceptual benzerlik yüksek kare çiftleri | **WARN + rapor** |
| kare içerik bbox'ı anormal değişiyor mu | **WARN + rapor** |
| foot anchor civarında içerik mantıklı mı | **WARN + rapor** |

**Duplicate detector özellikle WALK için kritiktir.** `A A A A A A A A` veya
`A B A B A B A B` gibi sahte animasyon teslimi yakalanmalıdır.

Doğal yürüyüşte benzer pozların bulunabileceği hesaba katılır: perceptual/pixel
benzerlik **raporlanır**, yanlış pozitif yüzünden **otomatik asset silme/yasaklama
yapılmaz**. Araç hiçbir dosyayı silmez veya değiştirmez.

---

## 15. Teslim kontrol listesi (sanatçı için)

- [ ] 5 atlas + `archer_animation.json`
- [ ] Kaynak PNG'ler (lossless) ayrıca teslim
- [ ] Satır sırası §2 tablosuna birebir uyuyor
- [ ] WALK'ta 8 kare **gerçekten farklı**, tam bir adım döngüsü
- [ ] ATTACK ve SKILL görsel olarak ayırt edilebiliyor
- [ ] SKILL'de baked particle/glow yok
- [ ] IDLE saldırı pozunda değil
- [ ] Bütün karelerde ayak hizası `y = 264` referansına göre
- [ ] `releaseFrame` değerleri **gerçek kare** ile dolduruldu (null bırakılmadı)
- [ ] `npm run validate:archer` FAIL üretmiyor
