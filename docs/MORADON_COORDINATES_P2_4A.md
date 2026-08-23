# MORADON KOORDİNAT TEMELİ — P2.4A

**Kapsam:** yalnız koordinat köprüsü. Terrain yükleme YOK · gerçek Moradon
spawnları YOK · MobSlotSystem V2 YOK · UI değişikliği YOK · combat tuning YOK.

**İzolasyon:** `src/` DEĞİŞMEDİ · aktif test haritası DEĞİŞMEDİ ·
`dist/preview.html` md5 `0399549684eec7137f46cee73c318710`.

---

## 1. Kaynak doğrulaması

Verilen değerleri körlemesine almadan `reference/KO_Reference_v8.db` üzerinde
doğrudan sorguladım:

| Değer | Kaynak | Durum |
|---|---|---|
| zone 21 | `zones.zone_no = 21` | **KAYNAK DOĞRULANDI** |
| `moradon_0826.smd` | `zones.zone_file` | **KAYNAK DOĞRULANDI** |
| "Moradon" | `zones.zone_name` | **KAYNAK DOĞRULANDI** |
| KO spawn (306, 352) | `start_positions` zone_id 21 → `karus_x` 306 · `karus_z` 352 (`elmorad_x/z` de aynı, `extraction_confidence` = "high") | **KAYNAK DOĞRULANDI** |
| 512 × 512 | — | **KAYNAKTA YAZILI DEĞİL** |

### 512 × 512 hakkında — dürüst durum

DB'de **harita boyutu kolonu yoktur** (boyut `.smd` başlığında yaşar, bu veri
setinde bulunmuyor). Değer kullanıcı tarafından verildi. Zone 21'in KENDİ
verisiyle çapraz kontrol ettim:

- `npc_positions` zone 21 → **134 spawn kaydı**
- dikdörtgenlerin aralığı: **X 27..498 · Z 23..497**
- hepsi 0..512 içinde ✔

Diğer zonelar `npc_positions`'ta 2007'ye kadar çıkıyor, yani 512 bir global
tavan artefaktı değil — zone 21'e özgü ve tutarlı. Yine de bu **KANIT değil
TUTARLILIKTIR**; `.smd` başlığı okunana kadar modülde böyle işaretli duruyor.

### Karıştırılmaması gereken bir alan

Zone 21 kaydında `init_x = 31200`, `init_z = 40200` var. Bunlar **başka bir
koordinat uzayındadır** (sunucu ölçeği) ve `start_positions`'ın 306/352
değerlerinin katı DEĞİLDİR (31200/306 ≈ 102, 40200/352 ≈ 114). İki farklı
nokta. Bu modül YALNIZ `start_positions` uzayını (0..512 ızgara) kullanır ve
bu ayrım dosya başlığında yazılıdır.

---

## 2. Sabitler ve dönüşüm

```
MORADON_ZONE_ID        = 21
MORADON_MAP_FILE       = 'moradon_0826.smd'
MORADON_SOURCE_WIDTH   = 512
MORADON_SOURCE_HEIGHT  = 512
KO_TO_WORLD_SCALE      = 5                     ← PROJECT LEGACY KARARI
MORADON_WORLD_WIDTH    = 512 * 5 = 2560        ← TÜRETİLİR
MORADON_WORLD_HEIGHT   = 512 * 5 = 2560        ← TÜRETİLİR
MORADON_KO_SPAWN       = { x: 306, z: 352 }
MORADON_WORLD_BOUNDS   = { width: 2560, height: 2560 }
MORADON_WORLD_SPAWN    = koToWorld(306, 352) = { x: 1530, y: 1760 }   ← TÜRETİLİR
```

`MORADON_WORLD_WIDTH/HEIGHT` ve `MORADON_WORLD_SPAWN` **elle yazılmadı**,
ölçekten/dönüşümden türetiliyor — test bunu ayrıca doğruluyor.

```ts
koToWorld(koX, koZ) → { x: koX * 5, y: koZ * 5 }
```

**X → worldX · Z → worldY.** Ofset YOK · rotasyon YOK · eksen ters çevirme
YOK. KO'nun dikey ekseni bu köprüde kullanılmaz.

`worldToKo()` da eklendi: Moradon spawn dikdörtgenleri kaynakta KO ızgarasında
yazılı (`npc_positions.left_x/top_z/right_x/bottom_z`), ileride bir world
noktasını onlarla karşılaştırmak gerekecek. Ölçek 5 olduğu için tam sayı
katlarında gidiş-dönüş birebir — testli.

---

## 3. Aktif harita neden değişmedi

`data/world-map.ts` içindeki geçici test dünyası aynen duruyor:

| | Aktif (değişmedi) | Moradon (hazır, bağlanmadı) |
|---|---|---|
| bounds | 2480 × 3300 | 2560 × 2560 |
| spawn | 1240 / 1650 | 1530 / 1760 |
| ROADS · OBSTACLES | aynen | — |

`ROADS` ve `OBSTACLES` eski test haritası için tasarlandı; bazı koordinatları
2560 sınırının dışına çıkabilir. Harita anahtarı sonraki küçük görevde
atılacak.

**Test bunu kilitliyor:** aktif `WORLD_BOUNDS`/`SPAWN_POINT` değerleri, oyuncu
başlangıç konumu ve 8 farm slotu ayrıca doğrulanıyor; ayrıca kaynak taraması
`moradon-coords`'u import eden başka bir dosya olmadığını kanıtlıyor.

---

## 4. Testler (8 yeni)

kaynak sabitleri · world boyutlarının ölçekten türemesi ·
`koToWorld` üç kanonik dönüşüm (0,0 / 512,512 / 306,352) ·
eksen ayrımı (yalnız X ve yalnız Z) · `MORADON_WORLD_SPAWN` türetimi ·
`worldToKo` gidiş-dönüş (5 nokta) · saflık ve determinizm ·
aktif haritanın değişmediği · Moradon katmanının hiçbir gameplay sistemine
bağlanmadığı (kaynak taraması) + three importu olmadığı.

**496/496** prototip testi · `npm test` **106/106**.

---

## 5. Bilinen sınırlar

1. **512 × 512 kaynakta yazılı değil** — kullanıcı verdi, zone 21 spawn
   verisiyle tutarlı, `.smd` başlığı okunmadı.
2. **`KO_TO_WORLD_SCALE = 5` bir PROJECT LEGACY kararıdır**, kaynaktan
   gelmez. Değişirse `MORADON_WORLD_*` ve `MORADON_WORLD_SPAWN` kendiliğinden
   güncellenir (türetilmiş oldukları için).
3. **Yükseklik (KO Y) yok.** Köprü yalnız yatay düzlemi çevirir.
4. **Aktif harita hâlâ test dünyası.** Moradon değerleri hazır ama bağlı
   değil.
5. **P2.4B için hazır veri:** `npc_positions` zone 21'de 134 kayıt var;
   `left_x/top_z/right_x/bottom_z` + `num_npc` + `reg_time` alanları
   dikdörtgen spawn + count sistemi için gerekeni taşıyor. Oyuncu başlangıcı
   için de `start_positions.range_x = 10`, `range_z = 10` mevcut. Bu görevde
   HİÇBİRİ kullanılmadı.
