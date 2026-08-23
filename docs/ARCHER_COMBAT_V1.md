# ARCHER COMBAT V1

**Durum:** uygulandı (prototip katmanı) · Çıktı: `dist/preview-eternal-ko-p1-2.html`

## 1. Normal atış artık bir SKILL

Ayrı "Basic Attack" kavramı Archer için **kaldırıldı**. KO'daki `Archery` mantığına
uygun olarak normal ok gerçek bir `SkillDefinition`'dır:

| | |
|---|---|
| Oyun adı | **Standart Atış** |
| Kaynak | `Archery` (102003) |
| Mana | **0** (kaynak) |
| Projectile | 1 |
| Individual cooldown | **0** (kaynak `recast_time = 0`) |
| Hasar | ana `CombatSystem.damageRoll` |

**Genie asla gizli/fallback saldırı üretmez.** Oyuncu Standart Atış'ı sete koyduysa
kullanılır, koymadıysa kullanılmaz. Seçili skillerin hiçbiri kullanılamıyorsa Genie
**bekler** — başka skill uydurmaz.

## 2. KAYNAK COOLDOWN KURALI — `recast_time` birimi çözüldü

Bu alan Faz 2'den beri "birimi doğrulanmadı" diye `recastTimeSourceRaw` olarak
taşınıyordu. **Birim desisaniyedir** ve altı bağımsız kayıtta beklenen değerle
birebir tutuyor:

```
recast_time / 10 = saniye
```

| Kaynak skill | raw | individual CD |
|---|---|---|
| Archery, Through Shot, Multiple Shot, Guided Arrow, Perfect Shot, Arc Shot, Arrow Shower, Shadow Hunter, Dark Pursuer | `0` | **0 sn** |
| Fire Arrow, Poison Arrow | `32` | **3.2 sn** |
| Fire Shot, Poison Shot, Explosive Shot, Viper | `42` | **4.2 sn** |

`recast_time = 0` olan okçu skillerine **yapay 3/5/7 sn cooldown EKLENMEZ**.
Kaynak DB değiştirilmedi; cooldown behavior katmanında kaynaktan **türetilir**
(`sourceCooldownSec()` — kodda sabit yoktur).

## 3. 15 ARCHER SKILL — mapping

| Oyun Lv* | Oyun adı | KO kaynak | sourceRef | Kaynak Lv | MP | Individual CD | Action time |
|---|---|---|---|---|---|---|---|
| 1 | Standart Atış | Archery | **102003** | 3 | 0 | 0 | 1.10s |
| 3 | Delici Ok | Through Shot | **107500** | 0 | 15 | 0 | 0.75s |
| 5 | Kor Oku | Fire Arrow | **107505** | 5 | 10 | **3.2s** | 0.75s |
| 10 | Zehirli Uç | Poison Arrow | **107510** | 10 | 10 | **3.2s** | 0.75s |
| 15 | Üçlü Salvo | Multiple Shot | **107515** | 15 | 40 | 0 | 0.70s |
| 20 | İzci Oku | Guided Arrow | **107520** | 20 | 40 | 0 | 0.75s |
| 25 | Keskin Atış | Perfect Shot | **107525** | 25 | 70 | 0 | 0.80s |
| 30 | Alev Atışı | Fire Shot | **107530** | 30 | 30 | **4.2s** | 0.80s |
| 35 | Toksik Atış | Poison Shot | **107535** | 35 | 30 | **4.2s** | 0.80s |
| 40 | Yırtıcı Ok | Arc Shot | **107540** | 40 | 100 | 0 | 0.85s |
| 45 | Patlayıcı Ok | Explosive Shot | **107545** | 45 | 50 | **4.2s** | 0.85s |
| 50 | Engerek Oku | Viper | **107550** | 50 | 50 | **4.2s** | 0.85s |
| 55 | Beşli Salvo | Arrow Shower | **107555** | 55 | 150 | 0 | 0.80s |
| 60 | Gölge Avcısı | Shadow Hunter | **107560** | 60 | 250 | 0 | 0.85s |
| 70 | Kara Takip | Dark Pursuer | **108570** | 70 | 300 | 0 | 0.90s |

\* "Oyun Lv" istenen tablodur; **runtime KAYNAK seviyeyi kullanır** (authoritative).
İki fark var ve bilerek kaynağa uyuldu: Archery kaynakta **Lv3** (tabloda 1),
Through Shot kaynakta **Lv0** (tabloda 3).

**Not — Kara Takip:** `Dark pursuer` 1075 (El Morad okçu) dalında **yoktur**;
yalnız 1085 (usta) dalında bulunur → `108570`. Tahmin edilmedi, sorgulandı.

Bütün MP değerleri istenen tabloyla birebir aynıdır (kaynaktan gelir).

## 4. Individual Cooldown ≠ Action Time

P1.1'in en büyük combat problemi: Genie ~1 saniyede bütün uygun skilleri
boşaltabiliyordu. Çözüm iki **ayrı** sistem:

| | Individual Skill Cooldown | Action / Attack Recovery |
|---|---|---|
| soru | *Aynı skill* tekrar ne zaman kullanılabilir? | *Karakter* başka saldırıya ne zaman başlayabilir? |
| kaynak | KO verisi (`recast_time / 10`) | gameplay tuning |
| kapsam | skill başına | karakter başına (global) |
| kod | `SkillSystem` (ana oyun) | `world/ActionLock.ts` |
| UI | ikon üzerinde perde + kalan saniye | ayrı **ACTION** çubuğu + ikon alt kenarı |

Örnek akış: `Beşli Salvo → release → action tamamlanır → Üçlü Salvo başlayabilir`.
Beşli'nin individual cooldown'u 0 olabilir; yine de aynı karede ikinci saldırı
başlatılamaz.

Reddedilen cast **mana harcamaz** (action lock kapısı mana/cooldown'dan ÖNCEDİR).

## 5. Action time profili

`data/archer-timing.ts` → `ArcherCombatTimingProfile`.
**Skill JSON'una source fact gibi YAZILMAZ**; gerçek animasyon atlasları gelince
release/recovery sürelerine göre değiştirilecektir. `scaleAll()` ile toplu tempo
ayarı yapılabilir.

Genie karar tiki `0.25 → 0.10 sn`'ye çekildi: ritmi artık action lock belirlediği
için yüksek karar tiki yalnız gecikme bindiriyordu.

## 6. Aktif bar ve Genie setleri

- **Aktif combat barı: 5 slot** (Eternal tarzı portrait düzen). Ayrı "Saldırı"
  düğmesi yoktur.
- **Skill kitabı: 15 skillin tamamı.** Ayarlar → *Aktif Bar* sekmesinden slot seçilip
  skill atanır.
- **Genie setleri ayrı yapıdır**, set başına en fazla **6** skill. Aktif barla aynı
  olmak zorunda değildir.

Varsayılan bar: Beşli Salvo · Üçlü Salvo · Kara Takip · Gölge Avcısı · Standart Atış.

Varsayılan Genie setleri — **üçü de `sequence` modunda** (P1.2.1):

| Set | Mod | Rotasyon |
|---|---|---|
| 1 — Yakın Burst | `sequence` | Beşli Salvo → Üçlü Salvo → wrap |
| 2 — Ekonomik | `sequence` | Delici Ok → İzci Oku → Standart Atış → wrap |
| 3 — Elite | `sequence` | Kara Takip → Gölge Avcısı → Yırtıcı Ok → Beşli Salvo → Üçlü Salvo → wrap |

`priority` modu **sistemden kaldırılmadı**; oyuncu ayar ekranından set başına
seçebilir. Yalnız varsayılan presetlerin üçü de `sequence` oldu.

Bir entry cooldown/mana/seviye/silah/menzil sebebiyle kullanılamıyorsa mevcut
sequence tarama davranışı geçerlidir: cursor'dan başlayarak en fazla bir tam tur
taranır, kullanılabilir bir sonraki seçili entry denenir, cursor onun ardına gider.

## 7. Cooldown UI kuralı

- Gerçek individual cooldown'u olan skillerde ikon üzerinde **perde + kalan saniye**.
- `recast = 0` skillerde **sahte 0.7/0.8 sn'lik perde YOKTUR**.
- Action recovery ikonun cooldown'u gibi gösterilmez: barın üstünde ayrı **ACTION**
  çubuğu ve ikonun alt kenarında ince mavi çizgi.

Böylece oyuncu "skill CD'de mi" ile "karakter hâlâ atış animasyonunda mı" ayrımını
görebilir.

## 8. Kaynak `add_damage` semantiği de çözüldü

`magic_type2.add_damage` bir **hasar yüzdesidir**; kaynağın kendi açıklama metni
bunu beş kayıtta doğruluyor:

```
107500 "Inflict 150% damage"       add_damage = 150
107525 "Inflict 200% damage"       add_damage = 200
107540 "Inflict 250% damage"       add_damage = 250
107560 "…with 250% damage"         add_damage = 250
108570 "…with 250% damage"         add_damage = 250
```

Tek-oklu skillerin hasar katsayısı artık `add_damage / 100`'dür (uydurma değil).

**Hâlâ prototip kararı olanlar — CANONICAL BALANCE DEĞİLDİR:** çok-ok başına
katsayı (0.75 / 0.62 — kaynak 0.99 der, denge için düşürüldü), ateş/zehir ek hasarı
(kaynak `first_damage` / `time_damage` KO ölçeğinde; yalnız **1 : 2 : 3 oranı**
korundu), zehir süresi (kaynak `duration = 20`, birimi doğrulanmadı → 4 sn).
Bunlar **ayrı bir damage/balance görevinde** ele alınacaktır; P1.2.1'de bilerek
dokunulmadı.

### 8.1 Kaynakta olmayan gameplay temizliği (P1.2.1)

**Delici Ok'un savunma debuff'ı KALDIRILDI.** `targetDebuff defense ×0.6 / 5 sn`
kaynakta yoktur — Faz 5'te `targetDebuff` effect ailesini göstermek için eklenmiş
bir örnekti. Delici Ok artık yalnız kaynak `magic_type2` davranışını temsil eder:

```
"Inflict 150% damage to an enemy"  →  directDamage coefficient 1.50
```

İçerik açıklamasından da "savunmasını 5 saniye düşürür" ifadesi kaldırıldı.

> **AÇIK KALAN KARAR:** aynı debuff ANA OYUNUN `SKILL_BEHAVIORS` listesinde
> duruyor ve orada `targetDebuff` ailesinin **tek kullanıcısı** (ana test paketi
> `targetDebuff savunmayı düşürür` onu kullanıyor). Ana oyundan da kaldırmak Faz 6.1
> dengesini ve effect-ailesi test kapsamını etkiler; bu yüzden P1.2.1'de ana oyuna
> DOKUNULMADI, yalnız sapma koda not olarak işaretlendi.

## 9. 3/5 projectile korunuyor

Üçlü Salvo = 3 ayrı projectile, Beşli Salvo = 5 ayrı projectile, geometrik spread.
`damage × 3` / `damage × 5` tek-hit sistemine **dönüştürülmedi**.
Ok sayısı kaynak `magic_type2.need_arrow`'dan gelir (3 / 5); diğer 13 skill 1'dir.
