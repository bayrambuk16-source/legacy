# İçerik Eşleme (kaynak → yeni oyun)

Kaynak veri matematik/denge referansıdır; oyuncuya giden kimlik `content_overrides.json`'dan.
`[köşeli parantezli]` görünen her isim, override'ı henüz yazılmamış placeholder demektir.

## Monster eşlemesi (MVP)
| sourceRef | Kaynak isim | Yeni isim | Sv | Bölge |
|---|---|---|---|---|
| 750 | Worm0 | Toprak Solucanı | 1 | Kuzey Ormanı |
| 850 | Bandicoot0 | Çalı Sıçanı | 2 | Kuzey Ormanı |
| 752 | Blood worm0 | Kan Solucanı | 4 | Kuzey Ormanı |
| 851 | Wild Bandicoot0 | Yaban Sıçanı | 5 | Kuzey Ormanı |
| 150 | Kecoon0 | Yamyam Goblin | 6 | Kuzey Ormanı |
| 754 | Carrion crawler0 | Leş Böceği | 6 | Kuzey Ormanı |
| 852 | Scavenger Bandicoot0 | Çöpçü Sıçan | 7 | Kuzey Ormanı |
| 755 | Snatcher0 | Kapkaççı | 8 | Gölgeli Vadi |
| 255 | Small bulcan0 | Bataklık Yaratığı | 9 | Gölgeli Vadi |
| 250 | Bulcan0 | Bataklık Devi | 11 | Gölgeli Vadi |
| 252 | Bulky bulcan0 | Bataklık Reisi (elite) | 15 | Gölgeli Vadi |

Görseller şimdilik Legacy kurt seti (`kd_kurt_*`) — `visualKey` kurt_yavru/kurt/kurt_alfa
Legacy'nin ölçek/ton varyant sistemine karşılık gelir. Özgün monster görselleri geldikçe
yalnızca `visualKey` eşlemesi değişir.

## Yeni oyun tasarım kararları (kaynakta OLMAYAN şeyler — açıkça işaretli)
1. **Sanal combat zone bölümlemesi.** Seçilen tüm MVP monsterları kaynakta zone 21'de
   (başlangıç bölgesi) spawn oluyor. Yeni oyunda zone 21'in spawn listesi seviye bandına
   göre ikiye bölündü: Sv ≤ 7 → "Kuzey Ormanı", Sv ≥ 8 → "Gölgeli Vadi". Spawn
   dikdörtgenleri/sayıları/reg_time kaynaktan aynen taşınır.
2. **Grup içi üye seçimi.** Kaynak yalnızca grup TETİK yüzdesini verir; üye seçim kuralı
   vermez. Karar: grup slotları üzerinden uniform seçim. KO grupları aynı itemi birden çok
   slotta tekrar ettiği için bu, kaynağın tekrar-tabanlı ağırlıklandırmasını otomatik korur
   (tests/run.ts'te 100k roll ile doğrulanır).
3. **Grup tetik oranı ≠ üye oranı.** "Grup %60 ise her item %60" hatası yapılmaz; iki
   aşamalı roll: önce tetik, sonra üye.
4. **Elite kademesi.** Kaynakta "elite" kavramı yok; 252 (Sv 15, yüksek HP) MVP elite/boss
   olarak işaretlendi.
5. **Hub.** "Avcı Kampı" tamamen özgün bir sahnedir; kaynak zone 21'in start_position'ı
   yalnızca referans.

## Item / skill
- Item whitelist: MVP drop havuzu + merchant 253 (iksir) + 255 (levazım) + başlangıç yayı.
  İsim override'ı yalnızca iksirler ve başlangıç yayı için yazıldı; kalanlar placeholder.
- Item num'ları (+N) upgrade seviyesini kodluyor (160100000..160100009 = Bow +0..+9).
  Yeni oyunda template ID ile instance upgrade seviyesi AYRIDIR; +N zincirleri
  UpgradeSystem'de template eşlemesi olarak kullanılacak (Faz 7).
- Skill type1 eşlemesi: 1 melee, 2 archery, 3 hasar/heal/AoE, 4 buff/debuff, 5 recovery,
  6 transformation, 7 state control, 8 teleport, 9 stealth. MVP okçu sınıfı type 2 + 4'ten
  effect composition ile kurulacak (Faz 5).

## Faz 4 eklemeleri
- **Slot eşlemesi (kaynak → 12 slot):** items_server.slot kodları gözlemle doğrulandı:
  0/1/3/4 silah aileleri (4=yay), 2 kalkan, 5 pauldron/chest, 6 pads/pants, 7 helmet,
  8 gloves, 9 boots, 10 earring, 11 necklace, 12 ring, 14 belt, 15/17 tüketilebilir.
- **Sınıf kuralı:** class_code 0 evrensel; 1-4 sınıf özel (210/220/230/240 zırh kind'larıyla
  uyumlu). Okçu = KO rogue karşılığı: class_code {0,2} + silahta kind {70,71}.
- **baseUpgradeLevel:** kaynak drop havuzu hazır-(+N) item varyantları içerir; isimdeki
  "(+N)" eki parse edilip instance'ın başlangıç upgrade seviyesi yapılır.
- **Rarity türetme:** kaynakta rarity alanı YOK. Gösterim upgradeLevel'dan türetilir:
  0-2 Sıradan / 3-4 Büyülü / 5-6 Nadir / 7+ Destansı (yeni oyun kararı, config.ts).
- **İkon eşlemesi:** varsayılan ikonlar equipSlot üzerinden Legacy es_okcu setine bağlanır;
  override katmanı önceliklidir.

## Faz 5 eklemeleri (skill)
- **`skills.json` authoritative:** `manaCost` ve `requiredLevel` YALNIZCA kaynaktan gelir;
  davranış katmanında (skill-behaviors.ts) tekrar tanımlanmaz.
- **`skill_level` yorumu (YENİ OYUN KARARI):** KO'da MAGIC.skill_level, skill ağacındaki
  kademe anlamına gelir. Yeni oyunda tek kademeli skiller olduğu için bu değer
  **karakter seviye gereksinimi** olarak yorumlanır (Temel Atış Sv3, Alev Oku Sv5,
  Rüzgar Adımı Sv10). Kaynak değer değiştirilmez, yorum sistem katmanındadır.
- **cast/recast birimi:** doğrulanmadı; `castTimeSourceRaw`/`recastTimeSourceRaw` olarak
  taşınır ve gameplay'de KULLANILMAZ. Gerçek cooldown `skill-behaviors.ts`'te açık saniyedir.
- **Silah gereksinimi:** kaynakta yok. Yeni kural: hasar skilleri `kind` 70/71 (yay/arbalet)
  ister; self-buff silah istemez.
- **Effect composition:** kaynak `type1/type2` (2=archery, 3=damage/DoT, 4=buff/debuff)
  ilham alınarak beş effect ailesine eşlendi; birebir port değildir.
- **Aksesuar whitelist'i (Faz 4.1):** MVP drop havuzunda küpe/kolye/kemer yoktu; kind 91-94,
  req_level 1, class_code 0 olan 8 aksesuar whitelist'e eklendi (drop tablosuna değil).

## Faz 6 eklemeleri (ekonomi + tüketilebilir)
- **Fiyat:** kaynak `buy_price` doğrudan kullanılır (authoritative). Kaynak `sell_price`
  MVP whitelist'indeki neredeyse tüm itemlerde 0 — satış fiyatı bu yüzden
  `EconomyProfile.sellMultiplier` (varsayılan %25) ile türetilir; upgrade seviyesi
  başına +%20 değer eklenir. Bu bir YENİ OYUN KARARIDIR, kaynak veri değişmez.
- **İksir etkileri:** kaynak `effect1/effect2` alanları çözülmediği için iksirlerin ne
  yaptığı `data/consumable-behaviors.ts` içinde tanımlanır. Aile eşlemesi:
  "Water of ..." → HP (%25/%40/%65/%100), "Potion of ..." → MP (%25/%40/%65/%100),
  "Potion of soul" → HP+MP tam, "Holy water" → arınma (Faz 7'de debuff temizleme).
- **Levazımcı isimleri:** ilk sayfalarda görünen 24 sundries item'ı için Türkçe override
  yazıldı; kalanlar `[köşeli]` placeholder olarak duruyor (KO isimleri nihai içerik
  DEĞİLDİR, geçici gösterimdir).

## ÇÖZÜLEN KAYNAK BELİRSİZLİKLERİ (ARCHER COMBAT V1 — 22 Ağu 2026)

İki alan Faz 2'den beri "birimi/semantiği doğrulanmadı" diye ham taşınıyordu.
Okçu skill seti üzerinde çapraz doğrulama ile ikisi de çözüldü:

### `skills.recast_time` → DESİSANİYE
`recast_time / 10 = saniye`. Altı bağımsız kayıt beklenen değerle birebir tutuyor:
`32 → 3.2 sn` (fire arrow, poison arrow), `42 → 4.2 sn` (fire shot, poison shot,
explosive shot, viper), `0 → 0 sn` (archery, through/multiple/guided/perfect/arc
shot, arrow shower, shadow hunter, dark pursuer).
Kaynak DB değişmedi; `recastTimeSourceRaw` alanı korunuyor, cooldown behavior
katmanında bundan TÜRETİLİYOR (`experiments/.../data/archer-skills.ts`).

### `magic_type2.add_damage` → HASAR YÜZDESİ
Kaynağın kendi açıklama metni beş kayıtta doğruluyor:
`107500 "Inflict 150% damage" → 150`, `107525 "…200%" → 200`,
`107540 "…250%" → 250`, `107560 / 108570 "…250% damage" → 250`.
Tek-oklu skillerin hasar katsayısı `add_damage / 100`.

### Hâlâ DOĞRULANMAMIŞ
- `magic_type3.duration` (zehir süresi) — ham `20`, birim bilinmiyor → prototip 4 sn.
- `magic_type3.first_damage` / `time_damage` — KO hasar ölçeğinde, bizim ölçeğe
  çevrilemez; yalnız aralarındaki 1 : 2 : 3 oranı kullanıldı.
- `magic_type2.hit_rate`, `add_range` — kullanılmıyor.
