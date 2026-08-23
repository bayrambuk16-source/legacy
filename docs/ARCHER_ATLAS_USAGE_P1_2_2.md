# ARCHER VISUAL INTEGRATION — P1.2.2 · ATLAS KULLANIM RAPORU

**Kapsam:** yalnız `experiments/eternal-ko-prototype/`.
**Ana Faz 6.1 / Faz 7:** DOKUNULMADI (kanıt: §6).

---

## 1. ÖNCE DOĞRULAMA — yüklenen sayfalar runtime atlas MI?

Görevin ilk maddesi: *"Bunların doğrudan runtime atlas olup olmadığını doğrula.
… Gerçek frame bölgelerini deterministik biçimde çıkarabileceğine emin değilsen
dur ve raporla."*

**Verdict: HAYIR — bu dosyalar runtime atlas DEĞİLDİR. Atlas olarak bağlanmadı.**

| kontrol | bulgu | sonuç |
|---|---|---|
| Başlık / tablo / lejant / referans paneli var mı? | 4 sayfada da var (başlık şeridi, portre, "8 DIRECTION OVERVIEW", "SPRITE INFO", "IMPLEMENTATION NOTES", "LEGEND", "SCALE REFERENCE") | ❌ contact sheet |
| Alfa kanalı | `mode = RGB`, alfa YOK — koyu mavi zemine düzleştirilmiş | ❌ |
| Kare boyutu | poster hücresi ≈ **120×115 px**; spec **300×300** | ❌ |
| Sayfa boyutu | 1448×1086 (8×8 kare için 2400×2400 beklenir) | ❌ |
| ATTACK yön çeşitliliği | 8 satır da **aynı sağa nişan pozu** (yay ofseti `+6.8 … +6.6`, RIGHT↔LEFT benzerliği **+0.72**) | ❌ blocker |
| SKILL yön çeşitliliği | 8 satırda da pozitif ofset (`+3.4 … +6.1`) | ❌ blocker |
| WALK | yön gerçek (ofset işareti dönüyor), kareler farklı | ✅ tek satır hatalı (`BACK_RIGHT`) |
| Foot anchor | posterde `Y = 0 (bottom center)`, spec'te `264` | ⚠ çelişki açık |

Ayrıntı: `docs/ARCHER_SHEET_REVIEW_V1.md`.

**Bu yüzden:** posterden kırpma YAPILMADI (spec §0 yasağı), poster pikseli koda
girmedi. Bunun yerine **atlas boru hattı asset'ten bağımsız olarak** tamamlandı;
gerçek atlaslar geldiğinde iş **dosya değişimi + `npm run validate:archer`**
seviyesine iner.

---

## 2. Runtime yapı (kurulan)

```
archer_walk     8 yön × 8 kare    fps 10   loop
archer_attack   8 yön × 6 kare    fps 18   tek sefer
archer_skill    8 yön × 6 kare    fps 16   tek sefer
archer_idle     8 yön × 1 kare
archer_dead     8 yön × 1 kare
frameWidth/Height = 300 · footAnchor = (150, 264)
```

Satır sırası (spec §2, DEĞİŞMEZ):
`BACK · BACK_RIGHT · RIGHT · FRONT_RIGHT · FRONT · FRONT_LEFT · LEFT · BACK_LEFT`

Runtime açıyı `0° = +X = SAĞ` olarak sayar; atlas `BACK`ten başlar. Aradaki köprü
**AÇIK TABLODUR, formül değildir** (`RUNTIME_INDEX_TO_ATLAS_ROW = [2,3,4,5,6,7,0,1]`).

| açı | yön | atlas satırı |
|---|---|---|
| 0° | RIGHT | 2 |
| 45° | FRONT_RIGHT | 3 |
| 90° | FRONT | 4 |
| 135° | FRONT_LEFT | 5 |
| 180° | LEFT | 6 |
| 225° | BACK_LEFT | 7 |
| 270° | BACK | 0 |
| 315° | BACK_RIGHT | 1 |

---

## 3. Uygulanan kurallar

### 3.1 Sahte adım efektleri KAPANDI
Atlas aktifken `hopOffset = 0`, `swayOffset = 0`, `squashY = 1`, `shadowScale = 1`,
`stridePhase = 0`. Efektler **silinmedi, kapıya alındı** — atlas yokken P1.2.1
fallback davranışı aynen sürer, böylece preview hiç bozulmaz.

Ayak tozu artık `walk.contactFrames` metadata'da **verilirse** üretilir; verilmezse
hiç üretilmez. Hangi karede ayak bastığı **tahmin edilmez**.

### 3.2 Foot anchor korundu
`footAnchorY = 264` → altta 36 px pay. Bu, legacy `OKCU_FOOT_PAD` ile **birebir
aynı sayıdır** (test: `footPad(meta) === OKCU_FOOT_PAD`). Ayak zeminden kopmuyor.

### 3.3 Facing ayrımı
İki AYRI alan tutulur:

```
movementFacing  ← joystick yönü      (walk satırını seçer)
combatFacing    ← hedefin konumu     (attack/skill satırını seçer)
angle = isActing ? combatFacing : movementFacing
```

`movementFacing` saldırı sırasında da arka planda güncellenir; bu yüzden saldırı
bitince karakter **eski yöne takılmaz**, gerçek hareket yönüne döner.

### 3.4 Klip kararı sourceRef ile
```
102003  Standart Atış   → ATTACK atlası
diğer 14 okçu skilli    → SKILL atlası
```
Karar `clipForSkillRef(sourceRef)` ile verilir. **"Basic mi skill mi" sorgusu
kullanılmaz** — Standart Atış bir skill slotundan `performSkill()` ile atılır ama
görsel olarak temel atıştır. Genie de aynı kapıdan geçer (`applyAnimFor` artık
`a.skillRef` okur); Scene'e kopya mantık yazılmadı.

### 3.5 FX çift gösterim koruması
Karakter atlası **element-nötr** kalır. Fire/Poison/mermi izi ve cast halesi
gameplay FX katmanından gelir (`ProjectileFxSystem`, sahnedeki hale çizimi).
`releaseFrame` metadata'da **null** olduğu sürece runtime mermi zamanlamasını
kareye bağlamaz — atlasa FX pişirilmişse bile ikinci kez çizilmez.

### 3.6 Ölüm çapası
İlk ölüm karesinde `deathAnchorX/Y` **dondurulur** ve bir daha güncellenmez;
çizim bu noktaya `originY = 1` ile oturur. Yatan sprite farklı genişlik/yükseklikte
olsa bile karakter yer değiştirmez.

---

## 4. DEBUG yer tutucu atlas (geçici)

Gerçek atlas olmadığı için boru hattı **runtime'da çizilen** bir yer tutucuyla
doğrulanabiliyor: DEV paneli → `☐ Archer atlas modu`.

- Varsayılan **KAPALI** (preview açılışta P1.2.1 görünümündedir).
- Canvas'a çizilir → `toDataURL` → `AssetStore`. **Bundle'a bayt eklemez.**
- Posterden KIRPILMAMIŞTIR, sanat varlığı değildir, üzerinde `DEBUG` damgası vardır.
- Her karede `footAnchorY` çizgisi kırmızı çizilir — hizalama gözle görülebilsin diye.
- Gerçek `archer_*` atlasları manifeste eklendiği an **onlar** kullanılır; yer
  tutucu üretilmez (`toggleAtlas()` önce `assets.has()` bakar).

### Tarayıcıda doğrulandı (Chromium, dist/preview-eternal-ko-p1-2-2.html)
| kontrol | sonuç |
|---|---|
| 8 yönde yürüme | joystick yönü ↔ hücre etiketi birebir: RIGHT / FRONT_RIGHT / FRONT / FRONT_LEFT / LEFT / BACK_LEFT / BACK / BACK_RIGHT ✅ |
| walk kare ilerlemesi | `RIGHT 2 → 4 → 7 → 1 → 3 → 5 → 7 → 0` (10 fps, loop) ✅ |
| ayak hizası | kırmızı anchor çizgisi ayakla ve gölge elipsiyle çakışık ✅ |
| Genie cast | idle (gri) ↔ skill (mavi, yay gerili) klibi değişiyor, hasar sayıları akıyor ✅ |
| DEV telemetrisi | `Anim atlas: AÇIK · row 2 · kare 0/1`, `Fake hop/sway/squash: 0 / 0 / 1 (kapalı)` ✅ |
| konsol hatası | yok ✅ |

---

## 5. AÇIK KARAR (tahminle kapatılmadı)

**Walk kare seçimi: zaman mı, mesafe mi?**
Varsayılan **metadata fps** (spec §3: 8 kare @ 10 fps). `playerSpeed = 210` ile
döngü başına 168 birim eder. Gerçek çizimdeki adım uzunluğu bunu tutmazsa ayak
kayar. `walkDistanceLock = true` alternatifi kodda hazır ve testli, ama
**varsayılan KAPALI** — karar gerçek sanat ölçülmeden verilmeyecek
(`docs/ARCHER_RUNTIME_GAP.md` §3.1).

**Foot anchor çelişkisi** hâlâ açık: posterler `Y = 0`, spec `264`. Runtime
`264`'ü kullanıyor (legacy ölçümle birebir uyuştuğu için). Sanatçıdan tek net
sayı gelince metadata'dan okunacak — kodda sabit yok.

---

## 6. Ana oyun etkilenmedi (kanıt)

```
dist/preview.html md5   ÖNCE : 0399549684eec7137f46cee73c318710
dist/preview.html md5   SONRA: 0399549684eec7137f46cee73c318710
```
Ana test paketi: **106 geçti, 0 kaldı**.

`src/` altında P1.2.2 kapsamında **hiçbir dosya değişmedi.**
