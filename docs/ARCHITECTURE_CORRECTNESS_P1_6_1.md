# ARCHITECTURE CORRECTNESS PASS — P1.6.1

**Kaynak:** Fable P1–P1.6 Architecture Audit.
**Bu bir feature görevi DEĞİLDİR.** P1.6 gameplay davranışı kabul edilmiştir;
burada yalnız correctness / identity / timing borçları kapatılmıştır.

**Değişmeyenler:** Archer range 400 · Genie acquisition 450 · positioning 380 ·
playerSpeed 120 · Attack Move · releaseDelay 0.20 · projectileSpeed 900 ·
3/5 spread ve hasarları · skill MP/cooldown · Action Time · KO iksir miktarları ·
mob profilleri (NORMAL/AGGRESSIVE/ELITE, hız, aggro, leash, saldırı aralığı,
respawn varsayılanı) · Farm Boundary tasarımı · manuel combat davranışı.

**İzolasyon:** `src/` DEĞİŞMEDİ · kaynak DB/JSON DEĞİŞMEDİ ·
`dist/preview.html` md5 `0399549684eec7137f46cee73c318710` (aynı).

---

## 1. HIGH #1 — ENTITY KİMLİĞİ (KÖK NEDEN)

### Neydi

P1.6'da respawn bilinçli olarak **aynı mob nesnesini** yeniden kullanıyordu ve
"duplicate mob üretilmesin" diye **uid'i de koruyordu**:

```ts
// P1.6
private respawn(mob) { mob.hp = mob.maxHp; mob.worldX = slot.homeX; ... }   // uid AYNI
```

Impact tarafı hedefi yalnız uid ile çözüyordu:

```ts
const mob = mobs.find((m) => m.uid === proj.targetUid);
```

Sonuç: bir mob ölür, aynı slotta yeni bir canlı doğar, **hâlâ havada olan eski
ok** aynı uid'i bulur ve **yeni doğan canlıyı vurur**. Yeni canlı hasar alır,
DoT yer, aggro olur, hatta ölebilirdi.

Kök neden bir yarış koşulu değil, bir **kavram karışıklığıydı**: SPAWN SLOT
kimliği ile MOB ÖRNEĞİ (entity) kimliği aynı alana (uid) bindirilmişti.

### Ne yapıldı

İki kavram ayrıldı:

| Kavram | Alan | Davranış |
|---|---|---|
| Spawn slot | `slotId` | Slotun ömrü boyunca **sabit** |
| Slot yaşamı | `generation` | Her respawn'da **+1** |
| Mob örneği | `uid` | Her doğuşta **yeni**, asla yeniden kullanılmaz |

```ts
private respawn(mob) {
  const oldUid = mob.uid;
  mob.uid = this.nextUid++;      // YENİ ENTITY KİMLİĞİ
  mob.generation += 1;           // SLOT YAŞAMI
  this.ai.reindex(oldUid, mob.uid);
  ...
}
```

Mob **nesnesi** hâlâ yeniden kullanılır → duplicate imkânsızlığı (P1.6 §7) korunur.

### İki savunma hattı

Projectile release anında hedefin **hem uid'ini hem neslini** kopyalar:

```ts
targetUid: victim?.uid ?? null,
targetGeneration: victim?.generation ?? null,
```

Impact'te:

1. uid artık çözülmez → `invalid: 'targetGone'`
2. uid bir şekilde yeniden kullanılırsa → `generation` uyuşmaz → `invalid: 'targetReplaced'`

Her iki durumda: **hasar yok · DoT yok · aggro yok · kill/loot yok.** Eski ok
sessizce yok olur.

### Test kanıtı (fix ÖNCESİ kırmızı, SONRASI yeşil)

`respawnOverrideSec = 0.08 sn`, okun uçuş süresinden **kısa** seçilerek senaryo
zorlanır. Fix kaldırılıp test tekrar çalıştırıldı:

```
✗ HIGH#1 — havadaki ESKİ ok, respawn olmuş YENİ moba VURAMAZ: yeni entity uid almalı (3 → 3)
✗ HIGH#1 — uid YENİDEN KULLANILSA BİLE nesil kapısı tutar: beklenen targetReplaced, gelen null
✗ kimlik: uid ASLA yeniden kullanılmaz: uid yeniden kullanıldı: 1
```

`gelen null` = impact **GEÇERLİ** sayılmış, yani eski ok yeni canlıyı gerçekten
vurmuştu. Fix sonrası üçü de yeşil.

---

## 2. HIGH #2 — GENIE KARAR SAATİ (KÖK NEDEN)

### Neydi

```ts
this.timer -= dt;
if (this.timer > 0) return [];
this.timer = this.settings.decisionIntervalSec;   // ← TAŞMA ÇÖPE
```

Sayaç tik anında **tam interval'e sıfırlanıyordu**; eksiye taşan kısım
kayboluyordu. Gerçek aralık `ceil(interval / dt) * dt` oluyordu — yani **kare
süresine yuvarlanıyordu**.

### Ölçüm (9.95 sn · aralık 0.10 sn · ideal 99 karar)

| FPS | ESKİ | YENİ |
|---:|---:|---:|
| 30 | **75** | 99 |
| 60 | **86** | 99 |
| 120 | **92** | 99 |

30 FPS'teki oyuncu, 120 FPS'teki oyuncudan **%19 daha az** cast/iksir kararı
alıyordu. Bu doğrudan DPS ve hayatta kalma farkı demekti.

### Ne yapıldı

Biriktirici + artık koruyan döngü, sonsuz döngü guard'lı:

```ts
this.accumulator += dt;
while (this.accumulator >= interval && ticks < MAX_TICKS_PER_UPDATE) {
  this.accumulator -= interval;          // ARTIK DEVREDER
  out.push(...this.decisionTick(interval, mobs, player));
}
if (this.accumulator >= interval) this.accumulator = 0;   // borç birikmez
```

`start()` artık saati **sıfırdan** başlatır: `update(interval)` çağrısı DAİMA
tam bir karar tikidir. Telemetri için `genie.decisionTicks` sayacı eklendi.

**Yan etki (kabul edilen):** Genie artık ayarlandığı tempoda (10 karar/sn) karar
alıyor, yani 60 FPS'te de eskisinden ~%16 daha sık cast ediyor. Bu bir buff
değil, **ayarın gerçekten uygulanması**dır; `decisionIntervalSec` değeri
DEĞİŞTİRİLMEDİ.

---

## 3. DoT SAATİ — AYNI SINIF HATA (ek bulgu)

Ana `tickStatuses()` (src/) de aynı deseni kullanıyor: `s.tickTimer = s.tickSec`.
`src/` değiştirilemeyeceği ve formül kopyalanmayacağı için **ana fonksiyon SABİT
ADIMLA sürülür**:

```ts
static readonly STATUS_STEP_SEC = 1 / 128;
tickStatuses(dt) { acc += dt; while (acc >= step) { acc -= step; main(list, step); } }
```

### Neden 1/128, 1/120 değil

`1/128` ikilik tabanda **tam** temsil edilir → 128 adım = **1.000000 sn**.
`1/120` her tikte mikroskobik olarak taşar; biriken gecikme **son tiki düşürür**.

| FPS | ESKİ (ham dt) | 1/120 adım | YENİ (1/128 adım) |
|---:|---:|---:|---:|
| 30 | **3** | 3 | **4** |
| 60 | **4** | 3 | **4** |
| 120 | **3** | 3 | **4** |

Eskiden 60 FPS oyuncusu 30/120 FPS oyuncusundan **%33 fazla** zehir hasarı
alıyordu. Artık her FPS'te 4 tik: son tik sınırda **kaybolmaz** ve **çift
çalışmaz**. P1.3 zehir tuning'i (0.30 / 0.60 / 0.90 · 4 sn · 1 sn) DEĞİŞMEDİ.

---

## 4. castId LIFECYCLE

**Neydi:** `Projectile` castId taşımıyordu ve `applyImpact` her olaya
`castId: 0` yazıyordu. Aynı skill'den iki cast havadayken impact'leri
birbirinden ayırmak imkânsızdı — `skillRef` bir sahiplik alanı değildir.

**Şimdi:**

```
useSkillRef → pipeline.accept()  → PendingCast.id = castId
            → resolveRelease()   → Projectile.castId = cast.id      (her ok)
            → applyImpact()      → ImpactEvent.castId = proj.castId
            → telemetri / Genie action / DEV paneli
```

Test: aynı skill'den iki eşzamanlı cast (A ve B), iki farklı hedefe. Her
impact'in castId'si kendi cast'ine bağlanıyor; `skillRef` ikisinde de aynı.

---

## 5. ÖLÜ DEFTER KAYITLARININ TEMİZLENMESİ

`castProjectiles` map'ine yalnız **yazılıyordu**, hiç silinmiyordu → uzun farm
oturumunda sınırsız büyüme. Artık her ok çözüldüğünde (impact ya da geçersiz)
sayaç azalır ve son okta kayıt **silinir**. `openCastCount` getter'ı soak
testinde doğrulanır.

`CombatPipeline.resetPipelineIds()` (kullanılmayan global sıfırlayıcı)
kaldırıldı. `data/mob-slots.ts` zaten P1.6'da kaldırılmıştı.

**PotionSystem authority birleştirilmedi** (§19) — `KoPotionSystem` ile ana
`ConsumableSystem` iki ayrı authority olarak migration debt'te kalıyor.
**payloadProxy'ye dokunulmadı** (§18).

---

## 6. ID SAYAÇLARI — ÖRNEK KAPSAMI

Modül düzeyindeki `let next…` sayaçları runtime'lar arasında state sızdırıyordu
(ikinci `PrototypeState` 1'den değil, birincinin bıraktığı yerden başlıyordu):

| Sayaç | Eski | Yeni |
|---|---|---|
| `CombatPipeline.nextId` (cast + projectile) | modül | örnek alanı |
| `MobSlotSystem.nextUid` (entity) | modül | örnek alanı |
| `WorldLootSystem.nextLootId` | modül | örnek alanı |
| `TrainingDummySystem.nextDummyUid` | modül | örnek alanı |
| `ProjectileFxSystem.nextArrowId` | modül | örnek alanı |

Test: iki ayrı `PrototypeState(1790)` **birebir aynı** ilk uid / loot id /
cast id üretiyor (1 / 1 / 1).

---

## 7. BOŞ (VACUOUS) TESTİN DÜZELTİLMESİ — ve BULDUĞU GERÇEK HATA

Eski §25 testi şunu iddia ediyordu:

```ts
eq(waits.filter((w) => w.reason === 'range').length, 0, '`range` reddi:');
```

`wait` eyleminin **`range` diye bir gerekçesi hiç üretilmiyor** (üretilenler:
`noTarget` / `approaching` / `actionLock` / `noUsableSkill`). İddia davranıştan
bağımsız olarak daima doğruydu.

Yeni test authoritative giriş noktasını **casusla (spy)** sarar:

```ts
S.adapter.useSkillRef = (...args) => { calls++; states.push(S.genie.movementState); return real(...args); };
```

**Casus AÇIK BİR SIZINTI buldu:** `movementIntent()` kare başında çalışır ve o
an hedef henüz seçilmemiştir → durum makinesi `ACQUIRE` der. Hemen ardından
karar tiki hedefi seçer; kapı yalnız `APPROACH`'ı bloklardığı için cast
**menzil dışında bile** deneniyor ve adaptörden `range` reddi alınıyordu. Bu,
P1.5'in kapattığını sandığı davranışın kalan son kapısıydı.

**Düzeltme:** kapı artık bir DURUM ADINA değil **gerçek mesafeye** bakıyor:

```ts
// GenieMovementController — SAF SORGU, durum değiştirmez, eşikler tek yerde
inCastingPosition(d) { return this.current === 'COMBAT' ? d <= 400 : d <= 380; }

// GenieSystem
if (!this.movement.inCastingPosition(this.lastDistance)) { wait('approaching'); return; }
```

Artık APPROACH / ACQUIRE / RETURN / WAIT — hangi durumda olursa olsun, atış
konumunda değilken `useSkillRef` **hiç çağrılmaz**. Testler bunu iki yönlü
kanıtlar: COMBAT dışı çağrı sayısı 0 **ve** COMBAT'ta çağrı sayısı > 0 (test
boşa geçmiyor).

---

## 8. YENİ REGRESYON TESTLERİ (17 test)

| # | Test | Kanıtladığı |
|---:|---|---|
| 1 | Eski ok → respawn olmuş yeni mob | HP/status/aggro/kill hiçbiri değişmez |
| 2 | uid yeniden kullanımı → `targetReplaced` | Nesil kapısı ikinci savunma hattı |
| 3 | 5 ölüm/respawn döngüsü | uid asla tekrarlanmaz, slot kimliği sabit |
| 4 | İki eşzamanlı aynı-skill cast | castId sahipliği karışmaz, artık 0 değil |
| 5 | 12 çok-oklu cast | Bookkeeping her seferinde 0'a döner |
| 6 | Genie 30/60/120 FPS | cast · iksir · hedef geçişi sayıları EŞİT |
| 7 | Karar tiki sayacı | 9.95 sn → 99 tik, her FPS'te |
| 8 | DoT 30/60/120 FPS | tik sayısı ve toplam hasar EŞİT, 4 tik |
| 9 | §25 casus testi | COMBAT dışı `useSkillRef` çağrısı = 0 |
| 10 | §25b RETURN/WAIT | Hedefsizken cast denemesi = 0 |
| 11 | Aynı karede DoT + ok ölümü | `resolveKill` = 1, loot = 1, ikinci reap = 0 |
| 12 | Ölü/dying moba ikinci ok | `targetDead`, HP değişmez |
| 13 | Canlı boundary küçültme | Hedef düşer, oyuncu sınır içinde, RETURN/WAIT |
| 14 | Oyuncu ölümü → NORMAL mob | Stale aggro ile yeniden saldırmaz |
| 15 | Oyuncu ölümü → AGGRESSIVE mob | Yalnız yarıçap koşulu sağlanırsa aggro |
| 16 | Kilitli + kullanılabilir yığın | Stok toplanır, TAM 1 adet düşer, atomik |
| 17 | 30 dakika soak | Koleksiyonlar sınırlı, NaN/negatif/kayıp entity yok |

---

## 9. SOAK SONUCU (30 dk simüle farm, 30 FPS = 54.000 kare)

| Koleksiyon | Tepe değer | Sınır |
|---|---:|---:|
| `pipeline.pending` | ≤ 8 | 8 |
| `pipeline.projectiles` | ≤ 64 | 64 |
| `openCastCount` | ≤ 16 | 16 |
| aktif `status` kaydı | ≤ 64 | 64 |
| yerdeki loot | ≤ 400 | 400 |
| mob NESNE sayısı | 8 | sabit |

Sağlık: oyuncu ve mob HP/MP sonlu, canlı mobda negatif HP yok, konumlar sonlu,
envanter adetleri pozitif, her canlının AI runtime'ı bağlı (kayıp entity yok).
Respawn sayısı büyür — **aktif koleksiyonlar büyümez**.

---

## 10. DÜZELTİLEN ESKİ/YANLIŞ YORUM VE METİNLER

| Yer | Eski (yanlış) | Yeni |
|---|---|---|
| `world/GenieSystem.ts` başlığı | "V0'da otomatik HAREKET YOKTUR — joystick oyuncudadır." | P1.5'ten beri otomatik hareket VAR; karar `world/GenieMovement.ts`'te, manuel joystick daima öncelikli |
| `scenes/WorldPrototypeScene.ts` `update()` | "Genie AÇIKKEN de joystick oyuncudadır — otomatik hareket YOK." (hemen altındaki blokla çelişiyordu) | kaldırıldı |
| **Genie Ayarları EKRANI** (kullanıcı görüyordu) | "V0: otomatik hareket YOK — joystick sende" | "Genie hedefe kendi yürür · joystick DAİMA öncelikli" |

Üçüncüsü bir yorum değil **ekranda oyuncuya gösterilen yanlış bilgiydi**.

`decisionIntervalSec` dokümantasyonu da güncellendi: değer artık gerçek aralıktır,
kare süresine yuvarlanmaz.

---

## 11. AÇIK KALAN MIGRATION DEBT (bilinçli)

- **payloadProxy** — cast/release/impact semantiği korundu, redesign yapılmadı (§18).
- **İki iksir authority'si** — `KoPotionSystem` (prototip, sabit miktar) ve
  `ConsumableSystem` (ana, yüzdelik) ayrı kaldı (§19).
- **Ana `tickStatuses` artık kaybı** — `src/` içinde duruyor; prototip onu sabit
  adımla sürerek etkisiz kılıyor. Ana oyun kendi yolunda hâlâ ham `dt` kullanıyor.
- **Mob–mob çarpışması, engel farkındalığı, grup aggro** — P1.6 V1 sınırları.
