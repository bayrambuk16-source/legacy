# P1.5 — GENIE MOVEMENT + FARM LOOP V1

**Kapsam:** Genie'nin gerçek farm döngüsü. P1.4/P1.4.1 combat baseline'ına
(cast→release→impact, payloadProxy, cast range 400, acquisition 450,
playerSpeed 120, Attack Move 0/60/100, projectile 900, release 0.20, manuel
target kuralları, 3/5 geometrisi, KO potion sistemi) **DOKUNULMADI**.
MP pool balance **DEĞİŞMEDİ**.

**`src/` altında hiçbir dosya değişmedi.** `dist/preview.html` md5 aynı.

---

## 1. HAREKET DURUM MAKİNESİ

`world/GenieMovement.ts` — **renderer'dan ve Scene'den bağımsız**, tek başına
test edilebilir. Scene'e dağılmış if blokları yok.

```
              ┌──────── Genie kapalı ────────┐
              ▼                              │
           IDLE ──BAŞLAT──► ACQUIRE ─────────┘
                               │
                    hedef var  │  hedef yok
                    ┌──────────┴──────────┐
                    ▼                     ▼
     d > 400 ──► APPROACH            merkeze uzak?
                    │  d ≤ 380        ┌────┴────┐
                    ▼                 ▼         ▼
                 COMBAT            RETURN     WAIT
                    │  d > 400        │ d ≤ 20  ▲
                    └────► APPROACH   └─────────┘
```

| durum | anlamı | hareket |
|---|---|---|
| `IDLE` | Genie kapalı | yok |
| `ACQUIRE` | uygun hedef aranıyor | yok |
| `APPROACH` | hedef cast menzili dışında | hedefe doğru |
| `COMBAT` | hedef konumlanma mesafesinde | **yok** (skill kararı devreye girer) |
| `RETURN` | uygun hedef yok, merkezden uzakta | merkeze doğru |
| `WAIT` | merkezde, hedef yok | yok |

Karar arayüzü saf veri: `decide(input) → { state, intent, distance }`.
`MoveIntent` bir **birim yön vektörü** + `destinationWorldX/Y` taşır — hız
BURADA hesaplanmaz.

---

## 2. ÜÇ MENZİL — BİRBİRİNE KARIŞTIRILMIYOR

| değer | ne | nerede | değişti mi |
|---|---|---|---|
| **450** | acquisition (hedef EDİNME, oyuncu merkezli) | `GenieSettings.attackRange` | hayır |
| **400** | **authoritative cast range** | `ARCHER_CAST_RANGE` → `WorldCombatAdapter` | hayır |
| **380** | otomatik konumlanma hedefi | `GENIE_MOVEMENT_V1.enterCombatDistance` | **YENİ** |

> **380 yeni bir skill menzili DEĞİLDİR.** Yalnız auto-positioning tuning'idir;
> skill'in menzil kapısı hâlâ 400'de, `WorldCombatAdapter` içinde.

Örnek: mob 430 → acquire EDİLİR (450 içinde), skill ATILMAZ (400 dışında),
APPROACH → 380 → COMBAT. Mob 500 → acquire EDİLMEZ.

---

## 3. HİSTEREZİS 380 / 400 KANITI

| mesafe | önceki durum | sonuç |
|---|---|---|
| 405 | COMBAT | **APPROACH** |
| 395 | APPROACH | **APPROACH** |
| 385 | APPROACH | **APPROACH** |
| 381 | APPROACH | **APPROACH** |
| 380 | APPROACH | **COMBAT** |
| 390 | COMBAT | **COMBAT** |
| 400 | COMBAT | **COMBAT** |
| 401 | COMBAT | **APPROACH** |
| 399 | APPROACH | **APPROACH** |

`405 → APPROACH` · `380 → COMBAT` · `400 → COMBAT (kalır)` · `401 → APPROACH`.
380–400 bandında durum **korunur** → 399 ↔ 401 titremesi imkânsız.

---

## 4. HIZ — GENIE'YE ÖZEL HIZ YOK

Genie oyuncunun **aynı** `WorldMovementSystem`'ini ve **aynı** hızını kullanır;
`genieSpeed` gibi bir sabit YOKTUR. Attack Move çarpanı da aynen geçerlidir.

| playerSpeed | ölçülen auto yaklaşma | Attack Move %60 (ActionLock) |
|---|---|---|
| 90 | 90.0 birim/sn | 54.0 birim/sn |
| 120 | 120.0 birim/sn | 72.0 birim/sn |
| 150 | 150.0 birim/sn | 90.0 birim/sn |

Sağ sütun §16/§33'ün kanıtı: ActionLock aktifken yaklaşma Attack Move
çarpanıyla yavaşlar (120 → 72), lock bitince tam hıza döner.

---

## 5. TAM FARM DÖNGÜSÜ (§24 senaryosu)

A(430) ve B(420) sınır içinde, C merkezden 900 (sınır **dışında**):


| t (s) | state | geçiş | hedef | mesafe | merkeze | kaynak | hız |
|---|---|---|---|---|---|---|---|
| 0.00 | **ACQUIRE** | IDLE → ACQUIRE | B | 420 | 0 | NONE | — |
| 0.02 | **APPROACH** | ACQUIRE → APPROACH | B | 420 | 0 | GENIE | 120 |
| 0.35 | **COMBAT** | APPROACH → COMBAT | B | 380 | 40 | NONE | — |
| 1.00 | **ACQUIRE** | COMBAT → ACQUIRE | B | 380 | 40 | NONE | — |
| 1.05 | **ACQUIRE** | COMBAT → ACQUIRE | A | 432 | 40 | NONE | — |
| 1.07 | **APPROACH** | ACQUIRE → APPROACH | A | 432 | 40 | GENIE | 72 |
| 1.55 | **COMBAT** | APPROACH → COMBAT | A | 381 | 64 | NONE | — |
| 2.30 | **RETURN** | COMBAT → RETURN | A | 379 | 64 | GENIE | 72 |
| 2.33 | **RETURN** | COMBAT → RETURN | — | — | 61 | GENIE | 72 |
| 2.68 | **WAIT** | RETURN → WAIT | — | — | 20 | NONE | — |

**Sonuç:** A ÖLDÜ · B ÖLDÜ · C YOK SAYILDI ✓ (sınır dışı) · son durum WAIT · merkeze 20 (sınır 600)

Okunuşu: B daha yakın olduğu için önce o seçildi (nearest), 380'de durup
öldürüldü; sonra A; C hiç hedeflenmedi; hedef kalmayınca merkeze dönüp
WAIT'e geçti. `1.07 s` satırındaki **72** hız, ActionLock sürerken yaklaşmanın
Attack Move çarpanını kullandığını gösteriyor.

---

## 6. FARM BOUNDARY — HARD CONSTRAINT


| kontrol | sonuç |
|---|---|
| sınır yarıçapı | 500 |
| oyuncunun merkeze EN UZAK noktası | **60.0** ✓ sınır aşılmadı |
| sınır İÇİ mob (440) hedeflendi | EVET ✓ |
| sınır DIŞI mob (560) hedeflendi | HAYIR ✓ |
| hedef sınır dışına kaçtı → hedef | DÜŞTÜ ✓ |
| peşinden gidildi mi | HAYIR ✓ (merkeze 20) |

İki katman: (a) sınır dışı mob **hedeflenmez**, hedef sınır dışına kaçarsa
**bırakılır**; (b) Genie kaynaklı hareketten sonra `clampPlayer()` oyuncuyu
sınır dairesine geri çeker. Manuel oyuncu **kısıtlanmaz**.

---

## 7. RETURN CENTER ve KESİNTİ


| t (s) | state | merkeze uzaklık |
|---|---|---|
| 0.00 | RETURN | 298.0 |
| 0.75 | RETURN | 208.0 |
| 1.50 | RETURN | 118.0 |
| 2.25 | RETURN | 28.0 |
| 2.33 | WAIT | 20.0 |

RETURN kesintisi: **RETURN → COMBAT** (hedef edinildi ✓)

---

## 8. MANUEL ÖNCELİK — VEKTÖRLER TOPLANMAZ


| kontrol | sonuç |
|---|---|
| joystick basılıyken kaynak | MANUAL |
| GENIE hareketi uygulandı mı | HAYIR ✓ |
| 1 sn'de X kayması (Genie yönü) | 0.00 (≈0 olmalı) |
| 1 sn'de Y hareketi (manuel) | -120.0 |
| bileşke hız | **120.0** birim/sn (base 120 aşılmamalı) |
| joystick bırakıldı → kaynak | GENIE, NONE |
| Genie devam etti mi | EVET ✓ |
Kural: joystick dead-zone üstündeyse **o kare** manuel hareket uygulanır ve
Genie vektörü uygulanmaz. **Genie DURDURULMAZ** — joystick bırakılınca kaldığı
yerden devam eder. İki vektör hiçbir yerde toplanmaz, bu yüzden bileşke hız
base speed'i aşamaz.

---

## 9. RANGE FAIL SPAM'İNİN ÖNLENMESİ

Eskiden Genie her karar tikinde cast deneyip `range` reddi alabiliyordu.
Artık `movement.state === 'APPROACH'` iken **hiçbir skill denenmez**; Genie
`wait / approaching` eylemi üretir. Test bunu kilitliyor: yaklaşma boyunca
`range` reddi sayısı **0**.

Skill'in authoritative menzil kapısı yine `WorldCombatAdapter`'da (400) —
kaldırılmadı, sadece gereksiz yere tetiklenmiyor.

---

## 10. DEĞİŞEN DOSYALAR

| dosya | değişiklik |
|---|---|
| `world/GenieMovement.ts` | **YENİ** — durum makinesi, `MoveIntent`, `clampToBoundary` |
| `world/GenieSystem.ts` | `movementIntent()` (her kare), `clampPlayer()`, APPROACH'ta cast denemesi yok, `start()` stale target temizler, `stop()` hareketi sıfırlar, farm-loop telemetrisi |
| `state.ts` | Genie'ye `castRange` + `moveSpeed` sağlayıcıları (Genie'nin ayrı hızı yok) |
| `scenes/WorldPrototypeScene.ts` | hareket önceliği (MANUAL > GENIE > NONE, toplama yok), boundary clamp, GENIE STATE telemetrisi |
| `tools/farm-loop-telemetry.ts` | **YENİ** — `npm run telemetry:farm` |
| `tests/run.ts` | **24 yeni P1.5 testi** (toplam 330) |
| `package.json` | v0.8.0 · `build:proto` → P1.5 · `telemetry:farm` |

**`src/` altında değişiklik YOK.**

---

## 11. KORUNAN DAVRANIŞLAR

- **Auto Loot** yeniden tasarlanmadı; kill → loot akışı testli (`resolveKill` tek sefer).
- **İksir** sistemi movement controller'a gömülmedi; Genie yürürken iksir
  kullanabiliyor ve hareket durmuyor (testli).
- **Training Dummy** hedefleme davranışı P1.1.1'deki hâliyle korundu (kuklalar
  `entities()` üzerinden hedeflenebilir olmaya devam ediyor).
- **DURDUR**: hareket anında 0, Genie iç durumu temizlenir; havadaki ok
  **iptal edilmez**, mana/cooldown iadesi yok (testli).
- **Manuel mod**: Genie kapalıyken skill'e basmak oyuncuyu yürütmez; 400 dışı
  `range` geri bildirimi verir (testli).

---

## 12. TAMAMLANMA ŞARTLARI

| yasak davranış | durum |
|---|---|
| 450 dışındaki mobu acquire etmek | **YOK** ✓ (460 → hedef alınmadı) |
| 400 dışından skill cast etmek | **YOK** ✓ (449'da cast sayısı 0) |
| Yaklaşmak yerine range fail spamlamak | **YOK** ✓ (`range` reddi 0, `approaching` üretiliyor) |
| Farm Boundary dışına çıkmak | **YOK** ✓ (en uzak nokta ≤ yarıçap) |
| Manuel + Genie vektörünün toplanması | **YOK** ✓ (bileşke hız 120.0 = base) |
| Genie kapalıyken manuel skill'in yürütmesi | **YOK** ✓ (konum değişmedi) |
