# P1.4 — MANUAL COMBAT FEEL V1

**Kapsam:** manuel savaş hissi. **BALANCE GÖREVİ DEĞİLDİR** — P1.3/P1.3.1
katsayıları, MP maliyetleri, cooldown'lar, Action Time değerleri ve 3/5 spread
geometrisi **DEĞİŞMEDİ** (regresyon testi ile kilitli).

**`src/` altında hiçbir dosya değişmedi.** `dist/preview.html` md5 aynı.

---

## 1. İKİ FAZLI MİMARİ — CAST ≠ IMPACT

### 1.1 Akış

```
t = 0.000   CAST ACCEPTED
            ├─ kapılar: action lock → hedef → menzil → seviye/silah/mana/cooldown
            ├─ mana harcanır (ana SkillSystem)
            ├─ individual cooldown başlar (ana SkillSystem)
            ├─ ActionLock başlar
            ├─ attack/skill animasyonu başlar
            └─ HEDEFİN HP'Sİ DEĞİŞMEZ · DoT EKLENMEZ · KILL/LOOT YOK

t = 0.200   RELEASE            (releaseDelaySec — ayrı bir combat timing alanı)
            ├─ çok-okta geometri + ok başına hasar KİLİTLENİR (§10)
            └─ WorldProjectile(ler) doğar

t ≈ 0.533   IMPACT             (release + mesafe / projectileSpeed)
            ├─ HP düşer
            ├─ ateş hasarı AYNI anda uygulanır
            ├─ zehir DoT status'ü TAM BURADA başlar
            └─ HP ≤ 0 ise kill → resolveKill → EXP/coin/loot
```

### 1.2 Katmanlar

| katman | dosya | sorumluluk |
|---|---|---|
| `CombatPipeline` | `world/CombatPipeline.ts` | zamanlama + taşıma. `PendingCast` kuyruğu, `Projectile` listesi, `advance(dt) → {released, impacts}`. **Renderer'sız, world-koordinatlı.** |
| `WorldCombatAdapter` | `world/WorldCombatAdapter.ts` | kapılar → commit → release çözümü → impact uygulaması. Formül YOK. |
| `ProjectileFxSystem` | `world/Projectiles.ts` | artık yalnız DEBUG IŞINLARI. Okları ÜRETMEZ. |
| Scene | `scenes/WorldPrototypeScene.ts` | yalnız gösterim: ok çizimi, hasar yazısı, telemetri. Hiçbir HP mutasyonu yok. |

### 1.3 En kritik nokta — `useByRef` atomiktir

`SkillSystem.useByRef()` tek çağrıda **kapı + mana + cooldown + effect çözümü**
yapar ve `src/` **değiştirilmeyecek**. Effect'leri geciktirmek için formülleri
kopyalamak §5'e (ikinci paralel combat sistemi yok) aykırı olurdu.

**Çözüm — PAYLOAD SNAPSHOT.** Cast anında `useByRef` gerçek hedefe değil, hedefin
bir stand-in'ine (`payloadProxy`) uygulanır:

```ts
function payloadProxy(mob: WorldMob): EnemyUnit {
  return {
    monster: mob.monster,            // effectiveDefense() DOĞRU çalışır
    hp: Number.POSITIVE_INFINITY,    // cast anında ÖLÜM/kill kararı YOK
    status: [...(mob.status ?? [])], // debuff OKUNUR, yeni DoT buraya düşer
    ...
  };
}
```

Sonuç (`outcomes[]` + yeni `statuses[]`) `EffectPayload` olarak **okun içine
konur** ve impact anında gerçek hedefe uygulanır.

Böylece **mana, cooldown, seviye/silah şartı, `damageRoll`, elemental katsayı ve
DoT üretimi ANA SİSTEMDEN gelir**; yalnız SONUCUN UYGULANMASI ertelenir.

### 1.4 V1 davranışı (bilinçli, belgeli)

- **Tek-oklu** skillerde hasar CAST anında rollenir, IMPACT'te uygulanır.
- **Çok-oklu** skillerde geometri + ok başına hasar RELEASE anında kilitlenir
  (§10). Ok uçarken mob kıpırdarsa ışın YENİDEN hesaplanmaz.
- Aradaki ~0.2–0.4 sn'de hedefin savunması değişirse rollenmiş sayı eskidir.
- Sürekli fizik-tabanlı projectile collision bu görevin kapsamı **değildir**.

---

## 2. DEĞİŞEN DOSYALAR

| dosya | değişiklik |
|---|---|
| `world/CombatPipeline.ts` | **YENİ** — pending/projectile kuyruğu, timing profili (release delay, projectile speed, attack move) |
| `world/WorldCombatAdapter.ts` | cast/release/impact üç faza ayrıldı; `payloadProxy`; `ImpactEvent`/`ReleaseEvent`; `updatePipeline()` |
| `world/Projectiles.ts` | ok üretimi KALDIRILDI (`spawnRays` eklendi); yalnız debug ışını |
| `world/PlayerAnimation.ts` | `update(..., inputActive)` — %0 attack move'da bile movementFacing joystick'i izler |
| `world/GenieSystem.ts` | `GenieAction.skill` artık `castId`/`projectileCount` taşır (damage/killed KALDIRILDI). **Karar mantığı DEĞİŞMEDİ.** |
| `state.ts` | hız çarpanı (`attackMoveMultiplier`), `resolveCastToImpact()` test/telemetri yardımcısı |
| `scenes/WorldPrototypeScene.ts` | cast → yalnız kabul; release/impact işleme; gerçek ok çizimi; DEV: Attack Move + Projectile Speed; §18 telemetrisi |
| `tools/combat-feel-telemetry.ts` | **YENİ** — `npm run telemetry:feel` |
| `tools/balance-telemetry.ts` | pipeline'a göre migrate edildi |
| `tests/run.ts` | mevcut testler pipeline'a migrate; **25 yeni P1.4 testi** |
| `package.json` | v0.7.0 · `build:proto` → P1.4 · `telemetry:feel` |

**`src/` altında değişiklik YOK.**

---

## 3. MANUEL TARGET KURALLARI (§2)

Genie KAPALI iken:

| durum | davranış |
|---|---|
| Moba dokun | target seçilir |
| Başka moba dokun | target ANINDA değişir |
| Skill'e bas, target yok | `noTarget` — mana/cooldown/ActionLock/animasyon/projectile **YOK** |
| Target menzil dışı (>340) | `range` — **otomatik yürüme YOK**, hiçbir mutasyon yok |
| Target ölür | manuel target temizlenir |
| Target öldükten sonra | oyun **kendi kendine başka hedef seçmez** |

`WorldTargetSystem.current()` ölü/uzak hedefi temizler ve **asla** başka hedefe
atlamaz. "Hedef" düğmesi (en yakın hedef) oyuncunun kendi eylemidir.
Genie AÇIKKEN mevcut acquisition davranışı aynen sürer.

---

## 4. ATTACK MOVE 0 / 60 / 100 (§3)

ActionLock aktifken hareket hızına çarpan uygulanır; **joystick girdisi
kaybolmaz** — yalnız katedilen mesafe ölçeklenir. `movementFacing` %0'da bile
joystick yönünü izler (`PlayerAnimator.update(..., inputActive)`), böylece
saldırı bitince karakter GÜNCEL yöne döner.

## 6. ATTACK MOVE 0 / 60 / 100
| mod | 0.50 sn joystick ile katedilen mesafe | oran | ActionLock |
|---|---|---|---|
| %0 | 0.0 birim | 0% | aktif |
| %60 | 63.0 birim | 60% | aktif |
| %100 | 105.0 birim | 100% | aktif |

DEV panelinden değiştirilir. **P1.4 varsayılanı %60** — bu bir canonical balance
kararı DEĞİL, playtest tuning'idir.

---

## 5. PROJECTILE TIMING TELEMETRİSİ

| mesafe | cast→release | release→impact | TOPLAM | beklenen | hasar | cast anında HP |
|---|---|---|---|---|---|---|
| 100 | 0.200s | 0.111s | **0.311s** | 0.311s | 139 | DEĞİŞMEDİ ✓ |
| 200 | 0.200s | 0.222s | **0.422s** | 0.422s | 139 | DEĞİŞMEDİ ✓ |
| 300 | 0.200s | 0.333s | **0.533s** | 0.533s | 139 | DEĞİŞMEDİ ✓ |
| 335 | 0.200s | 0.372s | **0.572s** | 0.572s | 139 | DEĞİŞMEDİ ✓ |

### projectile speed karşılaştırması (mesafe 300)
| hız | release→impact | TOPLAM |
|---|---|---|
| 700 | 0.429s | 0.629s |
| 900 | 0.333s | 0.533s |
| 1200 | 0.250s | 0.450s |
| 1500 | 0.200s | 0.400s |

---

## 6. ATEŞ IMPACT

| skill | mesafe | cast HP | impact fiziksel | impact ateş | impact toplam | impact anı |
|---|---|---|---|---|---|---|
| Kor Oku | 200 | DEĞİŞMEDİ ✓ | 139 | 38 | 177 | 0.422s |
| Alev Atışı | 200 | DEĞİŞMEDİ ✓ | 139 | 75 | 214 | 0.422s |
| Patlayıcı Ok | 200 | DEĞİŞMEDİ ✓ | 139 | 113 | 252 | 0.422s |

---

## 7. ZEHİR IMPACT + İLK TICK

Zehir cast anında **eklenmez**; DoT status'ü impact anında başlar ve ilk tick
ondan **1.00 sn** sonra gelir. Stack/refresh davranışı **DEĞİŞMEDİ** (stack eder,
refresh etmez, cap yok) — yalnız başlangıç zamanı CAST → IMPACT'e taşındı.

| skill | cast status | impact status | impact anı | ilk tick anı | fark | tick hasarı |
|---|---|---|---|---|---|---|
| Zehirli Uç | 0 ✓ | 1 | 0.422s | 1.425s | 1.003s | 11 |
| Toksik Atış | 0 ✓ | 1 | 0.422s | 1.425s | 1.003s | 23 |
| Engerek Oku | 0 ✓ | 1 | 0.422s | 1.425s | 1.003s | 34 |

---

## 8. ÜÇLÜ / BEŞLİ IMPACT TELEMETRİSİ

Geometri P1.3.1 ile **birebir aynı**; tek fark hasarın impact anında gelmesi ve
her okun kendi impact zamanının olması (yakın oklar önce, ıskalar menzil sonunda).


### Small Dummy (r26)
| skill | mesafe | ok | isabet (release) | ıska | impact hasar | ilk impact | son impact |
|---|---|---|---|---|---|---|---|
| Üçlü Salvo | 100 | 3 | **3/3** | 0 | 446 | 0.311s | 0.311s |
| Üçlü Salvo | 200 | 3 | **3/3** | 0 | 446 | 0.421s | 0.422s |
| Üçlü Salvo | 300 | 3 | **1/3** | 2 | 138 | 0.533s | 0.578s |
| Üçlü Salvo | 335 | 3 | **1/3** | 2 | 138 | 0.572s | 0.578s |
| Beşli Salvo | 100 | 5 | **5/5** | 0 | 731 | 0.310s | 0.311s |
| Beşli Salvo | 200 | 5 | **3/5** | 2 | 446 | 0.422s | 0.578s |
| Beşli Salvo | 300 | 5 | **3/5** | 2 | 446 | 0.533s | 0.578s |
| Beşli Salvo | 335 | 5 | **3/5** | 2 | 446 | 0.571s | 0.578s |

### Boss Dummy (r60)
| skill | mesafe | ok | isabet (release) | ıska | impact hasar | ilk impact | son impact |
|---|---|---|---|---|---|---|---|
| Üçlü Salvo | 100 | 3 | **3/3** | 0 | 446 | 0.311s | 0.311s |
| Üçlü Salvo | 200 | 3 | **3/3** | 0 | 446 | 0.421s | 0.422s |
| Üçlü Salvo | 300 | 3 | **3/3** | 0 | 446 | 0.532s | 0.533s |
| Üçlü Salvo | 335 | 3 | **3/3** | 0 | 446 | 0.571s | 0.572s |
| Beşli Salvo | 100 | 5 | **5/5** | 0 | 731 | 0.310s | 0.311s |
| Beşli Salvo | 200 | 5 | **5/5** | 0 | 731 | 0.420s | 0.422s |
| Beşli Salvo | 300 | 5 | **5/5** | 0 | 731 | 0.530s | 0.533s |
| Beşli Salvo | 335 | 5 | **5/5** | 0 | 731 | 0.569s | 0.572s |

---

## 9. HEDEF IMPACT'TEN ÖNCE ÖLÜRSE (§12)

| ok # | impact anı | invalid | hasar | kill |
|---|---|---|---|---|
| 0 | 0.530s | — | 138 | EVET |
| 1 | 0.533s | targetDead | 0 | hayır |
| 2 | 0.533s | targetDead | 0 | hayır |
| 3 | 0.533s | targetDead | 0 | hayır |
| 4 | 0.530s | targetDead | 0 | hayır |

**kill sayısı: 1** · **resolveKill çağrısı: 1** · cast kabul: evet · mana iade: YOK

Kalan oklar `impactInvalid = targetDead` ile döner: **HP mutasyonu yok, DoT yok,
ikinci kill yok, ikinci loot yok.** Mana/cooldown **iade edilmez** — atış zaten
yapılmıştır. `resolveKill` mob başına **bir kez** çalışır (`ai !== 'dead'` kapısı).

---

## 10. GENIE ve MANUEL — TEK PIPELINE (§14)

| yol | cast anında HP | uçan ok | impact sayısı | impact hasar |
|---|---|---|---|---|
| MANUEL | DEĞİŞMEDİ ✓ | 5 | 5 | 731 |
| GENIE  | DEĞİŞMEDİ ✓ | 5 | 5 | 731 |

Genie'nin karar mantığı (sequence/priority, set seçimi, cursor) **değişmedi**.
Değişen tek şey: `GenieAction.skill` artık hasar taşımıyor, `castId` taşıyor —
çünkü hasar henüz oluşmamıştır. Auto movement bu görevde **YOK**.

---

## 11. ACTION LOCK IMPACT BEKLEMEZ (§15)

| skill | action time | impact anı | action lock bitişi | ilişki |
|---|---|---|---|---|
| Üçlü Salvo | 0.70s | 0.571s | 0.70s | impact ÖNCE (lock uzamadı) |
| Kara Takip | 0.90s | 0.572s | 0.90s | impact ÖNCE (lock uzamadı) |

ActionLock cast kabulünde başlar ve normal ilerler; okun havada olması onu
uzatmaz. Individual cooldown da impact beklemez.

---

## 12. DEV / PLAYTEST ARAÇLARI (§20)

| araç | yer | değerler |
|---|---|---|
| Attack Move | DEV paneli | 0 / 60 / 100 (varsayılan 60) |
| Projectile Speed | DEV paneli | 700 / 900 / 1200 / 1500 (varsayılan 900) |
| Son cast izi | DEV telemetrisi | mesafe, ok, isabet, impact tamamlanan, cast→release, release→impact, TOPLAM gecikme, travel mesafe, impact hasar, impactInvalid |
| Sonsuz MP | kukla paneli | P1.3.1'den, değişmedi |
| Collision mode | DEV paneli | targetOnly / firstMobAlongRay — korundu |

---

## 13. AÇIK BIRAKILAN / SONRAKİ AŞAMA

- `releaseDelaySec = 0.20` bütün Archer skillerinde aynı. Gerçek sprite
  `releaseFrame` veya 3D animation event (BowSocket) geldiğinde
  `CombatTimingProfileV1.releaseDelayFor()` tek değişecek yerdir.
- Projectile spawn noktası şimdilik oyuncunun world konumu. `originWorldX/Y`
  API'si hazır; ileride BowSocket buraya bağlanır. **Canvas sprite anchor'ı ile
  gameplay bağı YOKTUR.**
- Hit kararı release'te kilitlenir (§10) — sürekli collision V1'de yok.
- Otomatik yaklaşma **yok**; P1.5 Genie Movement'ın işi.
