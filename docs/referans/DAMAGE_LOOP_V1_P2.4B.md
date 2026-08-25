# HASAR DÖNGÜSÜ — MOB ⇄ KARAKTER (V1)

> ⚠️ **TARİHSEL BELGE — SAYILAR P2.4B DÖNEMİNE AİT (25 Ağu 2026 öncesi).**
> Sistem anlatımları (üç fazlı cast, dört iptal kapısı, DoT modeli, kimlik
> üçlüsü, kaynak DB çözümleri) hâlâ geçerlidir; SAYISAL değerlerin bir kısmı
> eskimiştir. Bilinen bayatlar: `monsterDamage/HpMultiplier = 8` → artık
> seviye eğrisi (2,0→1,0, `mob-damage-curve.ts`) · başlangıç Sv70 prototipi →
> tavan 50 · test haritası 2480×3300 / spawn (1240,1650) → canlı harita
> Moradon · "bütün moblar mutant GLB" → 7 model · 523 test → 816+.
> Güncel değerler için ilgili `data/` dosyalarına ve CHANGELOG'a bakın.


**Kaynak:** Project Legacy prototipinin çalışan kodu. Her formül ve her sayı
dosyadan okundu, ayrıca **ölçüldü** (§8). Tahmin yok.
**Kapsam:** yalnız belge — hiçbir kod dosyası değişmedi.

---

## 1. TEK CÜMLE

İki yön de **aynı hasar formülünü** kullanır; farkları **kimin saldırı/savunma
değerini koyduğu** ve **hasarın ne zaman uygulandığıdır**.

```
                    ┌──────────────────────────────┐
                    │   damageRoll(atk, def, coef) │   ← TEK FORMÜL
                    └──────────────────────────────┘
                         ▲                    ▲
          A) OYUNCU → MOB│                    │B) MOB → OYUNCU
   atk = playerAttack()  │                    │ atk = monster.attack × dmgMult
   def = mob.defense     │                    │ def = playerDefense()
   coef = skill katsayısı│                    │ coef = 1 (skill yok)
   uygulama: IMPACT anı  │                    │ uygulama: WINDUP bitişi
```

---

## 2. ORTAK FORMÜL — `CombatSystem.damageRoll()`

`src/game/systems/CombatSystem.ts`

```ts
damageRoll(attack, defense, coefficient = 1) {
  const variance = range(rng, 0.9, 1.1);
  const raw = attack * coefficient - defense * 0.1;
  return Math.max(1, Math.round(raw * variance));
}
```

| Sabit | Değer | Nerede |
|---|---:|---|
| `varianceMin` / `varianceMax` | 0.9 / 1.1 | `COMBAT` |
| `defenseFactor` | 0.1 | `COMBAT` |
| `minDamage` | 1 | `COMBAT` |

Üç davranış sonucu:

1. **Savunma çıkarmadır, yüzde değildir.** Savunma değerinin yalnız **%10'u**
   hasardan düşer. Bu bir **Project Legacy kararıdır**, KO formülü değildir —
   `config.ts` içindeki yorum bunu açıkça yazıyor: KO'nun `s_ac` değerleri
   oyuncu hasarına göre çok büyük olduğu için 0.1 seçildi, yoksa düşük
   seviyede hasar 1'e yapışıyordu.
2. **Hasar asla 0 olamaz** — taban 1.
3. **±%10 varyans deterministik RNG'den gelir** (`mulberry32`), yani aynı
   tohum aynı sonucu verir.

> **Kritik vuruş YOKTUR.** Ne formülde ne item tanımlarında crit alanı var;
> tip düzeyinde de imkânsız.

---

## 3. YÖN A — OYUNCU → MOB (üç fazlı)

Hasar **skile basıldığı an uygulanmaz.** `world/CombatPipeline.ts` üç ayrı an
tanımlar:

```
t = 0.00   CAST KABUL     mana düşer · individual cooldown başlar
                          ActionLock kurulur · animasyon başlar
                          ► HEDEFİN HP'Sİ DEĞİŞMEZ

t = 0.20   RELEASE        çok-ok geometrisi çözülür, oklar doğar
                          hedefin uid + generation değeri KOPYALANIR

t ≈ 0.53   IMPACT         ► HASAR · DoT · kill · loot BURADA olur
```

`releaseDelaySec = 0.20` · `projectileSpeed = 900` birim/sn — ikisi de
**Project Legacy tuning**, kaynaktan gelmez.

### Saldırı değeri nereden gelir

```
playerAttack() = finalStats().attack × balance.playerDamage

finalStats().attack = base(level).attack + Σ ekipman.attack
base(level).attack  = level × playerAttackPerLevel (= 2)
```

Ekipman katkısını **yalnız** `ArcherBuildResolver` hesaplar (tek authority) ve
her çağrıda **sıfırdan** toplar — birikimli yuvarlama sapması oluşamaz.
Katalogda tanımı olmayan kuşanılı item **katkı vermez**.

### Skill katsayısı kaynaktan gelir

```
physicalCoefficient(ref) = magic_type2.add_damage / 100
```

Yani Delici Ok'un `add_damage = 150` değeri doğrudan `coef = 1.50` olur.
3/5 salvoda bu katsayı **ok başınadır** ve her ok **ayrı `damageRoll`** ile
çözülür — tek büyük vuruş bölünmez.

### Impact anında ne uygulanır

`world/WorldCombatAdapter.ts → applyImpact()` sırayla:

1. **Kimlik kapıları** (§6) — geçemezse hasar YOK.
2. **Fiziksel hasar** — cast anında rollenmiş payload uygulanır.
3. **Elemental hasar** (ateş ailesi) — ayrı bir bileşen olarak.
4. **DoT kaydı** — zehir ailesi. Status hedefin listesine **tam bu anda**
   eklenir, cast anında değil.
5. **Silah elementali** — fiziksel hasardan **ayrı** eklenir.
6. `mob.hp <= 0` ise `state = 'dying'`.

> **Silah elementali bir tuning kararıdır.** Kaynakta `fire_damage` gibi
> kolonlar var ama ana oyunun hasar yolunda **hiçbir tüketicisi yok** — bu
> yüzden minimum bir adaptör yazıldı ve ayrı bileşen olarak taşınıyor.
> **Zehir burada DoT değildir**; zehir skilinin DoT'u `SkillSystem` tarafındadır.

---

## 4. YÖN B — MOB → OYUNCU (iki fazlı)

Mob AI'ın saldırı çevrimi `world/MobAi.ts` içindedir ve **FPS bağımsızdır**:
sayaç `=` ile sıfırlanmaz, `+=` ile **devreder**. 30/60/120 fps aynı sayıda
vuruş üretir.

```
ATTACK durumu:
   windup    (hitMomentSec = 0.45 sn)
      └─► VURUŞ DÜŞER  ← hasar TAM BURADA uygulanır
   recovery  (attackIntervalSec − hitMomentSec = 1.15 sn)
      └─► çevrim başa döner
```

Vuruş yalnız **authoritative menzil** içindeyken düşer (`attackRange = 55`) ve
oyuncu hayattaysa. `MobAttackProfile.strike()` tek hasar kapısıdır — Scene'e
dağıtılmaz:

```ts
damage = damageRoll(
  mob.monster.attack × balance.monsterDamage,   // saldırı
  playerDefense(),                              // savunma
);                                              // coefficient = 1
player.takeDamage(damage);
```

**Mobun skili yoktur** — katsayı daima 1. Mobun hasarı yalnız üç şeyden
oluşur: kaynak `monsters.json` attack değeri, `monsterDamageMultiplier` (şu an
**8**) ve oyuncunun savunması.

### Histerezis — yapış-bırak titremesi yok

```
enterAttack = 50   → bu mesafeye gelince ATTACK'a geçer
leaveAttack = 65   → bu mesafeyi AŞARSA CHASE'e döner
attackRange = 55   → hasarın gerçekten uygulandığı mesafe
```

Aradaki 15 birimlik bant, sınırda duran oyuncuda durumun saniyede onlarca kez
gidip gelmesini engeller.

---

## 5. ÜÇÜNCÜ KANAL — DoT (ayrı tik döngüsü)

DoT ne A ne B yönündedir; **kendi zamanlaması** vardır.

```
IMPACT anında:  perTick = damageRoll(playerAttack(), mobDefense, dotPerTickCoef)
                status listesine eklenir  { damagePerTick, tickSec, timeLeft }

her karede:     timeLeft -= dt
                tickTimer -= dt → 0 olunca:  mob.hp -= damagePerTick
                                             ölürse state = 'dying'
                timeLeft <= 0 olan status listeden düşer
```

Katsayı **toplam** üzerinden bölünür, tik başına yazılmaz:

```
dotTickCount        = round(dotDurationSec / dotTickSec)
dotPerTickCoefficient = dotTotalCoefficient / dotTickCount
```

Yani "toplam katsayı" tasarım girdisidir; tik sayısı değişirse tek tik hasarı
kendiliğinden yeniden bölünür — toplam sabit kalır.

> **Ölen mobun statusları temizlenir** (`state === 'dying'` → `status = []`),
> böylece ceset tik almaz ve DoT ikinci bir kill üretemez.

---

## 6. HASARIN İPTAL EDİLDİĞİ DÖRT DURUM

Ok havadayken dünya değişebilir. `applyImpact()` dört kapı uygular:

| `invalid` | Anlamı | Neden gerekli |
|---|---|---|
| `miss` | ok kimseyi hedeflemiyordu | ıska; ok menzil sonuna kadar uçar |
| `targetGone` | entity listede yok | hedef öldü ve kaldırıldı |
| `targetDead` | hedef bu ok havadayken başka yolla öldü | **ikinci kill/loot/HP yok** |
| `targetReplaced` | uid aynı ama **generation farklı** | aynı slotta yeniden doğmuş **başka** bir canlı |

`targetReplaced` ikinci savunma hattıdır: respawn zaten yeni bir `uid` verir,
ama uid bir şekilde yeniden kullanılsa bile release anındaki nesille
uyuşmayan canlı **vurulmaz** — hasar almaz, DoT almaz, aggro olmaz, kill
üretmez.

---

## 7. DÖNGÜNÜN KAPANIŞI

```
mob.hp <= 0
   └─► state = 'dying'          (görsel ölüm başlar, saldırı durur)
        └─► reapDead()          TEK ölüm kapısı, kill başına BİR KEZ
             ├─ resolveKill()   → EXP  (monster.exp → player.addExp)
             ├─ drops.resolve() → coin + item rolü, ölüm KONUMUNDA
             ├─ markDead()      → respawn sayacı başlar
             └─ hedef temizle   (bu mob seçiliyse)
                  └─► respawnSec sonra: yeni uid + generation +1
                       └─► mob yeniden saldırabilir  ▲ döngü kapanır
```

Oyuncu tarafında karşılığı:

```
player.hp <= 0 → alive = false
   └─► mob aggro'su DÜŞER (ölü oyuncu kovalanmaz), moblar RETURN'e geçer
        └─► pasif regen:  hp +1.5/sn · mp +4/sn   (yalnız hayattayken)
```

**Asimetri kasıtlı:** mob ölünce yeniden doğar, oyuncu ölünce dünya durmaz —
moblar evlerine döner ve saldırı kapıları kapanır.

---

## 8. ÖLÇÜLEN ÖRNEK

Aşağıdaki değerler prototipin varsayılan durumundan (`seed 4242`) **çalıştırılarak**
alındı — elle yazılmadı.

**Oyuncu (seviye 70, ekipmansız):**

```
taban attack   = 70 × 2 = 140
ekipman attack = 0
playerAttack() = 140
defense        = 0
hp             = 1086 / 1086
```

**Mob (Toprak Solucanı):**

```
kaynak hp      = 7   × hpMult 8   → runtime maxHp = 56
kaynak attack  = 4   × dmgMult 8  → efektif 32
kaynak defense = 5                → effectiveDefense = 5
```

**A) Oyuncu → mob:**

| Skill | coef | ham hasar | varyans bandı |
|---|---:|---:|---|
| Standart Atış | 1.00 | 140 × 1.00 − 5 × 0.1 = **139.5** | 126 – 153 |
| Delici Ok | 1.50 | 140 × 1.50 − 0.5 = **209.5** | 189 – 230 |
| Kor Oku | 1.00 | **139.5** + elemental | 126 – 153 (+ elemental) |

Ölçülen tek cast: `released 1 · impact 1 · hasar 135 · invalid yok`
→ mob HP `56 → −79`, tek vuruşta ölü.

**B) Mob → oyuncu:**

```
ham = 4 × 8 − 0 × 0.1 = 32.0
ölçülen vuruş = 33        (varyans ×1.03)
oyuncu HP 1086 → 1053
```

**Bu dengesizlik gerçek ve beklenen:** varsayılan durum seviye 70 + ekipmansız
bir DEV durumudur; `monsterHpMultiplier = 8` bunu telafi etmeye yetmiyor.
Denge bir **tuning** görevidir, bu belge onu düzeltmez.

---

## 9. KAYNAK GERÇEĞİ ↔ PROJECT LEGACY TUNING

Karışmaması gereken ayrım:

| Değer | Nereden | Tür |
|---|---|---|
| `magic_type2.add_damage` → skill katsayısı | KO DB | **KAYNAK** |
| `magic_type3.first_damage / time_damage` | KO DB | **KAYNAK** |
| `monsters.json` attack / defense / hp / exp | KO DB | **KAYNAK** |
| `skills.mana_cost`, `recast_time / 10` | KO DB | **KAYNAK** |
| `defenseFactor = 0.1` | — | **TUNING** |
| `varianceMin/Max = 0.9 / 1.1` | — | **TUNING** |
| `playerAttackPerLevel = 2` | — | **TUNING** |
| `monsterHpMultiplier / monsterDamageMultiplier = 8` | — | **TUNING** |
| `releaseDelaySec = 0.20` · `projectileSpeed = 900` | — | **TUNING** |
| `attackRange 55` · `enterAttack 50` · `leaveAttack 65` | — | **TUNING** |
| `hitMomentSec 0.45` · `attackIntervalSec 1.6` | — | **TUNING** |
| Silah elementalinin ayrı bileşen olması | — | **TUNING** (kaynakta tüketici yok) |
| Cast/menzil değerleri | — | **TUNING** (`skills.range_value` 15 kaydın hepsinde 0) |

---

## 10. AÇIK SORULAR

1. **`skills.cast_time` (13 / 15) kullanılmıyor** — birimi çözülmedi. Şu an
   `releaseDelaySec` sabit 0.20; skill başına farklılaşması gerektiğinde
   değişecek tek yer `releaseDelayFor()`.
2. **`magic_type2.hit_type` (0 / 2) ve `hit_rate` (100 / 150 / 300)** hiçbir
   şey yapmıyor — ham saklanıyor. Isabet/kritik davranışı **yok**.
3. **`magic_type3.duration = 20`** ham değer; saniye olduğu doğrulanmadı.
   DoT süresi şu an tuning'den geliyor.
4. **Oyuncu savunması varsayılan durumda 0** — savunma tarafı hiç
   sınanmamış durumda. Ekipman geldiğinde `defenseFactor = 0.1` yeniden
   ölçülmeli.
5. **Mob savunması debuff'lanabiliyor** (`statusModifiers().defenseMult`) ama
   okçu ağacında savunma düşüren bir skill **yok** — bu yol şu an ölü kod.
