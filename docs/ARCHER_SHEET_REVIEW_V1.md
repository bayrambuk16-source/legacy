# ARCHER SPRITE SHEET REVIEW — V1 (teslim 1)

**Durum:** yalnız inceleme raporu. **Entegrasyon YAPILMADI**, runtime'a dokunulmadı,
poster/kontak sayfası kırpılmadı.
**Kaynak:** kullanıcı tarafından yüklenen 4 dosya (IDLE+DEAD, ATTACK, WALK, SKILL).
**Karşılaştırma tabanı:** `docs/ARCHER_ANIMATION_SPEC.md` V1.

---

## 0. Dosya künyesi

| Sayfa | Boyut | Mod | Not |
|---|---|---|---|
| IDLE + DEAD | 1448×1086 | **RGB** | alfa yok |
| ATTACK | 1448×1086 | **RGB** | alfa yok |
| WALK | 1448×1086 | **RGB** | alfa yok |
| SKILL | 1448×1086 | **RGB** | alfa yok |

Bunlar **atlas değil, kontak sayfası (contact sheet / poster)**: başlık, lejant, bilgi
kutusu, portre ve ölçek referansı içeriyorlar. Poster içindeki bir hücre ≈ **120×115 px**;
spec **300×300** istiyor. Ayrıca posterlerin bilgi kutusunda `Format: PNG (transparent)`
yazıyor ama teslim edilen dosyalarda **alfa kanalı yok** — koyu mavi zemine düzleştirilmiş.

> Bu sayfalardan runtime asset üretilemez ve spec §0 gereği üretilmeyecek.

---

## 1. SPEC İLE UYUMLU OLANLAR ✅

### 1.1 Yön sırası — birebir doğru
Dört sayfada da satır sırası spec §2 ile aynı:
`BACK, BACK-RIGHT, RIGHT, FRONT-RIGHT, FRONT, FRONT-LEFT, LEFT, BACK-LEFT`

### 1.2 Kare sayıları — doğru
IDLE 1 · DEAD 1 · WALK 8 · ATTACK 6 · SKILL 6 → **16 + 64 + 48 + 48 = 176 kare**.

### 1.3 WALK kareleri gerçekten farklı
Satır içi maksimum benzerlik **%94.3**, **%97 üstü 0 çift**.
Sahte `A A A A` veya `A B A B` döngüsü **yok**.

### 1.4 WALK yönleri gerçek
Yay/silahın gövde merkezine göre yatay ofseti (negatif = sol, pozitif = sağ):

| yön | ofset |
|---|---|
| BACK | +1.3% |
| BACK-RIGHT | +5.5% |
| RIGHT | +6.1% |
| FRONT-RIGHT | +6.0% |
| FRONT | +3.1% |
| FRONT-LEFT | **−4.9%** |
| LEFT | **−9.9%** |
| BACK-LEFT | −0.7% |

İşaret sağ yarıda pozitif, sol yarıda negatif → **yön gerçekten dönüyor**.
RIGHT↔LEFT satır benzerliği **−0.01** (tamamen farklı, olması gereken bu).

### 1.5 IDLE 8 yön gerçek ve doğru
Görsel doğrulama: BACK'te sadak + sırt, yüz yok · BACK-RIGHT'ta sırt 3/4 · RIGHT sağ
profil · FRONT-RIGHT ön 3/4 · FRONT tam ön · FRONT-LEFT ön 3/4 sola · LEFT sol profil ·
BACK-LEFT sırt 3/4 sola. Çapraz benzerlik matrisi doğru "halka" yapısı veriyor
(komşu yönler en benzer: FRONT↔FRONT-RIGHT +0.60, BACK↔BACK-RIGHT +0.41).

### 1.6 DEAD 8 yön dönüyor
Kafa (kızıl saç kütlesi) yatay konumu hücre genişliğinin %66 → %27'sine kayıyor,
gövde ana ekseni de dönüyor. Yani ölü poz yöne göre yeniden çizilmiş.

### 1.7 Baked FX yok
WALK / ATTACK / SKILL sayfalarında **doygun mavi piksel sayısı 0**.
Önceki posterdeki "efekt karelere pişirilmiş" sorunu **çözülmüş**.

### 1.8 Ölçek tutarlı
Sayfalar arası ortalama içerik yüksekliği **109.5 / 111.3 / 110.0 px** (~%1.6 sapma).

### 1.9 ATTACK ile SKILL birbirinden ayırt edilebilir
Aynı (yön, kare) için ortalama benzerlik **%63.4**, maksimum **%74.0**,
**%97 üstü 0/48**. Spec §5 karşılanıyor.

---

## 2. KRİTİK SORUNLAR ❌

### 2.1 ATTACK sayfasında YÖN YOK — **blocker**
8 satırın hepsi **aynı, sağa nişan alan** pozu gösteriyor.

Yay ofseti (8 satır): `+6.8 · +7.8 · +6.5 · +6.3 · +6.6 · +6.5 · +6.5 · +6.6`
→ satırdan satıra **hiç değişmiyor**.

| test | sonuç | beklenen |
|---|---|---|
| RIGHT ↔ LEFT satır benzerliği | **+0.72** | en düşük olmalı |
| RIGHT ↔ ayna(LEFT) | +0.05 | ayna bile değil |
| satır-dışı ortalama benzerlik | **+0.44** | WALK'ta +0.12 |
| BACK satırı | yüz görünür, sağa nişan | sırt + sadak, yüz yok |

**Oyundaki etkisi:** karakter sola koşup sola ateş ettiğinde ekranda **sağa nişan alır**.
Bu sayfa bu haliyle kullanılamaz.

### 2.2 SKILL sayfasında yön çok zayıf — **blocker**
Yay ofseti `+4.3 … +6.1`, **8 satırda da pozitif**. RIGHT↔LEFT direct **+0.31**,
mirrored **+0.11**. Satır-dışı ortalama **+0.35**. 8 yön yeniden çizilmeli.

### 2.3 WALK `BACK-RIGHT` satırı yanlış
Bu satır sırtı değil **önü** gösteriyor (yüz tam görünür, sadak yok).
`BACK-RIGHT ↔ FRONT-RIGHT` benzerliği **+0.43** — WALK sayfasındaki en yüksek
satır-dışı değer (sayfa ortalaması +0.12). `BACK` ve `BACK-LEFT` satırları doğru.
→ Tek satır düzeltmesi yeterli.

### 2.4 Foot anchor çelişkisi — **hâlâ açık, tek sayı gerekiyor**
| kaynak | değer |
|---|---|
| Posterler (4 sayfada da) | `Foot Anchor Y = 0 (bottom center)`, `Origin (0,0)` |
| `docs/ARCHER_ANIMATION_SPEC.md` | `footAnchorY = 264` (300px karede altta **36px** pad) |

İkisi aynı anda doğru olamaz. Çözülmezse **"karakter havada duruyor / yere gömülüyor"**
hatası aynen geri gelir — bu, kullanıcının 2 numaralı gözlemiydi.

Poster çözünürlüğünde (hücre ≈115px) anchor güvenilir **ölçülemiyor**; gerçek 300×300
atlasta doğrulanmalı. Öneri: spec'teki **264**'te kalınsın, sanatçıya şu cümle verilsin:
> "Ayak tabanı, 300px karenin üstünden **264. piksel** hizasında olacak; karenin
> altında **36px** boşluk kalacak. Bu boşluk gölge/perspektif payıdır, kırpılmayacak."

---

## 3. MİNÖR / DOĞRULANAMAYAN

- **`BACK-LEFT` sütunu posterin sağ kenarında kırpılmış**: üç sayfada da bu sütunun
  bbox genişliği 97px, diğerlerinde 103–105px. Büyük ihtimalle **poster kırpma
  artefaktı**, ama gerçek atlasta kontrol edilmeli.
- **Dikey oturma (bottom gap)** poster ölçeğinde 0–9px arası oynuyor; bu çözünürlükte
  ayırt edilemiyor. Gerçek atlas gelince `tools/validate-archer-sprites.mjs` ile
  ölçülecek.

---

## 4. SANATÇIDAN İSTENECEKLER

1. **ATTACK — 8 yön yeniden çizilsin.** BACK gerçekten sırt (sadak görünür, yüz yok),
   LEFT gerçekten sola nişan. Ayna kullanılacaksa da sonuç ayna olmalı; şu an değil.
2. **SKILL — 8 yön yeniden çizilsin.** Aynı kriter.
3. **WALK `BACK-RIGHT` satırı** sırt 3/4 olacak şekilde yeniden.
4. **Foot anchor için tek net sayı** (öneri: 264 / 36px pad — bkz. §2.4).
5. **Teslim formatı:** poster değil, **5 ayrı lossless PNG atlas**, **alfa kanallı,
   arka plansız**, 300×300 kare, + `archer_animation.json`
   (bkz. `docs/schema/archer_animation.schema.json`).

Gerçek atlaslar geldiğinde `npm run validate:archer` ile
(boş kare / duplicate kare / alfa / anchor / bbox) otomatik doğrulama yapılacak.

---

## 5. DEĞİŞEN DOSYA

Yalnız bu belge eklendi. **Kod, asset, runtime, Faz 6.1 ve prototip değişmedi.**
