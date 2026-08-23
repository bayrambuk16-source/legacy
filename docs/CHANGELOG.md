# CHANGELOG

## P2.4B — Dikdörtgen Çok-Moblu Slot Temeli (22 Ağu 2026)
*Yalnız spawn-slot temeli. Gerçek Moradon spawn verisi import EDİLMEDİ ·
terrain YOK · map switch YOK · yeni mob GLB YOK · combat/Genie/camera tuning YOK.*

- **`data/mob-slot-schema.ts` (YENİ): kanonik slot sözleşmesi.**
  `1 SLOT = 1 MOB TÜRÜ + 1 DİKDÖRTGEN + 5..8 BAĞIMSIZ ÖRNEK`.
  `MIN_MOBS_PER_SLOT = 5` · `MAX_MOBS_PER_SLOT = 8`. Saf katman: three
  IMPORT ETMEZ, gameplay sistemine yazmaz, `Math.random()` KULLANMAZ.
- **Doğrulama SESSİZ CLAMP YAPMAZ.** `validateMobSlot()` result döndürür,
  `defineMobSlot()` geçersiz girdide FIRLATIR. `4 → RED · 5,6,7,8 → KABUL ·
  9 → RED`; tam sayı olmayan, normalize olmayan dikdörtgen ve çok örnekli
  slotta sıfır alan da reddedilir.
- **`world/MobSlotSystem.ts`: slot başına `count` örnek.** `populate()` artık
  yuva (`slotId + instanceIndex`) bazlı çalışır; dolu yuva atlanır. Her
  örneğin KENDİ evi, HP'si, AI runtime'ı, hedef durumu ve **kendi respawn
  sayacı** vardır. Bir slot ASLA tek paylaşılan HP/AI nesnesi taşımaz.
- **`world/types.ts`: `WorldMob.instanceIndex` EKLENDİ (additive).** Kimlik
  artık dörtlüdür: `slotId` (hangi slot) · `instanceIndex` (slot içi yuva) ·
  `generation` (+1 her respawn) · `uid` (asla yeniden kullanılmaz).
- **Deterministik doğuş.** Nokta `(slotId, instanceIndex, generation)`
  üçlüsünden FNV-1a ile türer — paylaşılan RNG akışından BAĞIMSIZDIR (iki
  farklı tohumlu sistem AYNI yerleşimi üretiyor, testli). Dikdörtgen `count`
  hücreye bölünür ve örnek #i yalnız kendi hücresinde jitter yapar →
  **üst üste doğmak imkânsız** (ölçülen en yakın mesafe: slot A 91,7 ·
  slot B 94,7 world birimi). Generation değişince aynı hücrede YENİ nokta.
- **Respawn ÖRNEK BAZLI.** Süre `slot.respawnSec`'ten okunur. `8 canlı →
  #2 ölür → 7 canlı → (4 s) → 8 canlı`; komşuların uid/generation/HP/ev
  noktası DEĞİŞMEZ, slot SIFIRLANMAZ, population count'u AŞMAZ. 13 mobun
  tamamı öldürülüp 20 s simüle edildi: nesne sayısı 13, canlı tavanı 13.
- **`data/test-mob-slots.ts` (YENİ): sentetik fixture — CANLI OYUNA BAĞLI
  DEĞİL.** `state.ts` import etmez (testle taranıyor). Nötr isimler
  (`test_slot_a` / `test_mob_a`); KO isimleri runtime'a GİRMEDİ.
  Slot A: count 5 · Slot B: count 8 · toplam 13.
- **CANLI PREVIEW DEĞİŞMEDİ.** `FARM_AREA_SLOTS` (8 legacy tekil slot)
  aynen çalışır ve `defineMobSlot()` doğrulamasından GEÇMEZ. Yeni public
  bayrak EKLENMEDİ; uyum `slotPlacement()` içindeki TEK dallanmadır —
  alan yoksa dikdörtgen ev noktasına çöker, population 1 olur. Legacy
  respawn hâlâ AYNI ev noktasına döner (testli).
- **RENDERER DEĞİŞMEDİ.** `test_mob_a` ve `test_mob_b` gameplay açısından
  farklı türlerdir ama İKİSİ DE `mutant_mobile_v1.glb` ile render edilir.
  `MobAssetFamily` / `MobModelResolver` / `perMobGLB` EKLENMEDİ; renderer
  `monsterRef` kelimesini hiç GÖRMEZ (kaynak taramasıyla testli).
- **Gameplay authority'leri DEĞİŞMEDİ:** CombatPipeline · WorldTargetSystem ·
  MobAi · GenieSystem · WorldMovementSystem · DropSystem · WorldLootSystem ·
  Projectiles · ArcherAnimator · MutantAnimator · ThreeWorldRenderer. Combat
  HP bağımsızlığı, ayrı target seçimi, Genie'nin kill sonrası başka canlı
  örneğe geçmesi ve kill-instance bazlı drop AYRI AYRI testlendi.
- **P2.4A DEĞİŞMEDİ** (ölçek 5 · 512×512 · 2560×2560 · spawn 306/352 →
  1530/1760). Moradon map switch YAPILMADI.
- **Testler:** prototip **523/523** (P2.4B için 24 yeni) · ana paket
  **106/106** · `src/` DEĞİŞMEDİ · `dist/preview.html` md5
  `0399549684eec7137f46cee73c318710` (tam rebuild sonrası DEĞİŞMEDİ) ·
  tarayıcı doğrulaması **SORUN: YOK**.

## P2.4A — Moradon Koordinat Temeli (22 Ağu 2026)
*Yalnız koordinat köprüsü. Terrain YOK · gerçek Moradon spawnları YOK ·
MobSlotSystem V2 YOK · UI değişikliği YOK · combat tuning YOK.*

- **`data/moradon-coords.ts` (YENİ): KO Moradon → Project Legacy world
  köprüsü.** Saf matematik; three IMPORT ETMEZ, yan etki üretmez,
  deterministiktir. Hiçbir gameplay sistemine BAĞLANMADI (kaynak taramasıyla
  testli).
- **VERİLEN DEĞERLER KÖRLEMESİNE ALINMADI, KAYNAKTAN DOĞRULANDI.**
  `reference/KO_Reference_v8.db` sorgulandı: `zones.zone_no = 21` ·
  `zone_file = moradon_0826.smd` · `zone_name = "Moradon"` ve
  `start_positions` zone 21 → `karus_x 306` / `karus_z 352`
  (`elmorad_x/z` de aynı, `extraction_confidence` = "high"). **Dördü de
  KAYNAK DOĞRULANDI.**
- **512 × 512 KAYNAKTA YAZILI DEĞİL — açıkça işaretlendi.** DB'de harita
  boyutu kolonu YOKTUR (boyut `.smd` başlığında yaşar, bu veri setinde yok).
  Zone 21'in kendi verisiyle çapraz kontrol edildi: `npc_positions` zone 21 →
  **134 spawn kaydı**, dikdörtgen aralığı **X 27..498 · Z 23..497**, hepsi
  0..512 içinde. Diğer zonelar 2007'ye çıktığı için bu bir tavan artefaktı
  değil. Yine de **KANIT değil TUTARLILIK** olarak işaretli.
- **KARIŞTIRILMAMASI GEREKEN ALAN NOT EDİLDİ:** zone 21'in
  `init_x = 31200` / `init_z = 40200` değerleri BAŞKA bir koordinat
  uzayındadır ve 306/352'nin katı DEĞİLDİR (≈102× ve ≈114×). Bu modül yalnız
  `start_positions` ızgarasını (0..512) kullanır.
- **DÖNÜŞÜM:** `koToWorld(koX, koZ) → { x: koX * 5, y: koZ * 5 }`.
  **X → worldX · Z → worldY.** Ofset YOK · rotasyon YOK · eksen ters çevirme
  YOK. `KO_TO_WORLD_SCALE = 5` bir PROJECT LEGACY kararıdır, kaynaktan gelmez.
- **TÜRETİLMİŞ DEĞERLER ELLE YAZILMADI:** `MORADON_WORLD_WIDTH/HEIGHT`
  ölçekten, `MORADON_WORLD_SPAWN` ise `koToWorld()`'dan türetiliyor — test
  ikisini de ayrıca doğruluyor. Sonuç: **2560 × 2560** ve **(1530, 1760)**.
- **`worldToKo()` eklendi** — Moradon spawn dikdörtgenleri kaynakta KO
  ızgarasında yazılı olduğu için ileride gerekli. Ölçek 5 olduğundan tam sayı
  katlarında gidiş-dönüş BİREBİR (5 noktada testli).
- **AKTİF HARİTA DEĞİŞMEDİ.** `WORLD_BOUNDS` 2480×3300, `SPAWN_POINT`
  1240/1650, `ROADS`, `OBSTACLES` ve 8 farm slotu AYNEN duruyor. `ROADS`/
  `OBSTACLES` eski test haritası için tasarlandığından bazı koordinatları
  2560 sınırının dışına çıkabilir; harita anahtarı sonraki görevde atılacak.
  Test aktif değerleri, oyuncu başlangıç konumunu ve slot sayısını kilitliyor.
- **TESTLER: 496/496** (8 yeni Moradon testi) · `npm test` 106/106 ·
  `dist/preview.html` md5 DEĞİŞMEDİ · `src/` DEĞİŞMEDİ.
- **GAMEPLAY PARITY:** hiçbir otoriteye dokunulmadı — playerSpeed 120, combat
  range, projectile speed, aggro/leash, mob HP/damage çarpanı, Genie Farm
  Boundary, 8 farm slotu, respawn süreleri AYNEN.


## P2.4 — Gerçek Ok Modeli (22 Ağu 2026)

- **VARLIK ÖNCE DOĞRULANDI, SONRA BAĞLANDI.** `arrow_mobile_v1.glb`'nin
  manifestteki her iddiası ölçüldü: 0 klip / skinned mesh yok (statik) ·
  1 mesh / 1 materyal / **1 draw call** · 82 vertex / 80 üçgen · nock düzlemi
  tam `z = 0` · uzunluk **0,7504 m** +Z boyunca · `arrow_tip` düğümü
  `(0, 0, 0.7504)` · `alphaTest = 0.5` · `side = DoubleSide` · zorunlu
  extension YOK. **Hepsi tuttu.**
- **EK DÖNÜŞÜM GEREKMEDİ.** Varlığın yönelimi projenin kendi sözleşmesiyle
  birebir aynı (**+Z ileri**); P2.3'te primitive ok da yerel +Z'ye bakacak
  şekilde kurulmuştu, bu yüzden gerçek mesh doğrudan yerine geçti.
- **TEK UYARLAMA: ORİJİN NOCK'TAN UCA.** Varlığın orijini NOCK'ta (arka uç),
  gameplay'in otoritatif konumu ise okun VURDUĞU nokta. Geometri yüklenirken
  bir kez world birimine ölçeklenip `−21,67` birim ötelendi → görsel kök
  otoritenin konumunda, gövde arkada. Manifestin kendi entegrasyon notu da
  bunu söylüyor.
- **TEK SAHNE NESNESİ KORUNDU.** GLB'nin düğüm grafiği KOPYALANMAZ; yalnız
  geometri (klonlanmış) + materyal mevcut **paylaşılan** projectile yoluna
  takılır. Ok başına **1 sahne nesnesi** (testli), `arrow_nock`/`arrow_tip`
  işaretçileri sahneye sızmaz. Havadaki oklar model açılıp kapanınca yeniden
  DOĞMAZ — geometri/materyal yerinde değişir.
- **ALFA VE ÇİFT YÜZ ZORUNLULUKLARI KORUNDU:** `MASK` (blend değil → sıralama
  sorunu yok) ve `doubleSided` GLTFLoader tarafından kuruluyor; uç silueti ve
  üç tüy alfa kesimli olduğu için ikisi de gerekli.
- **DEV ANAHTARI:** `Ok: MODEL / PRIMITIF` — P2.3 primitive silüetine canlı
  dönüş.
- **TESTLER: 488/488** (6 yeni ok testi) · `npm test` 106/106 ·
  `dist/preview.html` md5 DEĞİŞMEDİ.
- **OK MODELİ PARITY:** 15 sn deterministik farm senaryosu primitive silüet vs
  gerçek model — HP/EXP/coin/kill/item ve her mobun uid/nesil/HP/AI durumu
  FARKSIZ. Yön testi gerçek mesh ile 8 açıda tekrarlandı: sapma **< 0,5°**.
- **SINIRLAR:** ok eğimi (pitch) yok (~2–3°, ihmal edildi) · hedefe saplanma
  YOK (manifest formül veriyor ama impact'te görsel siliniyor — istenmedi,
  uydurulmadı) · nişan sırasında kirişte ok YOK (manifest `nock` socketini
  gösteriyor, eklenmedi) · normal map yok, gövde bükülemez, üç non-manifold
  kenar — üçü de manifestin bildirdiği zararsız sınırlar.


## P2.3 — Combat Ölçer Kaldırma + Ok Görseli Düzeltmesi (22 Ağu 2026)

- **COMBAT ÖLÇER KALDIRILDI.** `world/CombatMeter.ts` silindi ·
  `PrototypeState.meter` gitti · panel, `RESET STATS`, `recordMeter()` ve
  `renderMeter()` kaldırıldı. **`SONSUZ MP` anahtarı SİLİNMEDİ** — panelin
  içinde yaşıyordu, DEV paneline taşındı. Test kaynak ağacını tarıyor:
  `CombatMeter` / `S.meter` / `DPS_WINDOW_SEC` geçen dosya kalırsa kırmızı.
- **OK YANLIŞ YÖNE BAKIYORDU — P2.0'dan beri, ölçülerek bulundu.** Eski kod
  `rotation.set(π/2, 0, −atan2(dirY, dirX))` okun eksenini **45° köşegeni
  etrafında aynalıyordu**: 0°/90°/180°/270° uçuşlarda sapma **90°**, yalnız
  45°'de doğru. P2.0 varsayılan kamerası 45° olduğu için gözden kaçmıştı.
  Geometri artık kurulurken yerel **+Z**'ye döndürülüyor ve renderer yalnız
  `yaw` uyguluyor. Test 8 açıda sapmanın **< 0,5°** olduğunu kilitliyor.
- **OK YAYDAN ÇIKIP DALIYORDU.** `ArrowSpawn` ~41 birimde, eski kod ilk
  **0,12 sn'de** sabit **26 birime** iniyordu. Artık iniş uçuşun TAMAMINA
  yayılıyor ve varış yüksekliği **gerçek hedefin gövde ortası**; ıskada ok
  **düz uçuyor**. `ProjectileView` bunun için `targetUid` · `travelled` ·
  `travelDistance` taşıyor (hepsi `CombatPipeline`'dan KOPYA). Yaydan çıkış
  karışımı zaman yerine **katedilen mesafeye** bağlandı (45 birim ≈ 1,5 m) —
  kare hızından bağımsız.
- **OK ARTIK OK GİBİ GÖRÜNÜYOR.** Tek koni ("havuç") yerine gövde + uç + iki
  yelek, `mergeGeometries` ile **tek tampona** birleştirildi: silüet düzeldi,
  **draw call AYNI kaldı** (ok başına 1 sahne nesnesi — testli).
- **SOCKET MATRİSİ BİR KARE BAYATTI.** `ArrowSpawn`'ın dünya matrisi karenin
  SONUNDA tazeleniyordu; ok bir kare eski (ilk karede hiç kurulmamış) bir
  noktadan doğuyordu. Ok döngüsünden önce `playerRoot.updateMatrixWorld(true)`
  eklendi.
- **BUILD HATTINDA SESSİZ DÜŞÜŞ DÜZELTİLDİ.** `BufferGeometryUtils` alias'ı
  `tools/build.mjs`'e eklenmemişti; **esbuild düştü ve build sessizce yedek
  bundler'a geçti**. Alias eklendi, esbuild hatası artık TAM basılıyor.
- **TESTLER: 481/481** (5 yeni ok/ölçer testi eklendi, 5 ölçer testi
  kaldırıldı) · `npm test` 106/106 · `dist/preview.html` md5 DEĞİŞMEDİ.
- **SINIRLAR:** ok hâlâ primitive (gerçek ok GLB'si verilirse aynı yere
  bağlanır) · ok eğimi (pitch) yok, iniş açısı ~2–3° olduğu için ihmal edildi ·
  DPS/cast sayaçları artık yalnız telemetri araçlarında.


## P2.2 — Mutant Mob Entegrasyonu + Training Dummy Kaldırma (22 Ağu 2026)
*Hasar kuklası prototipten TAMAMEN çıktı; combat artık gerçek mutant mob
üzerinde. GLB'ler YENİDEN OPTİMİZE EDİLMEDİ.*

- **MUTANT GLB GERÇEK MOB GÖRSELİ OLDU.** 8 farm slotunun tamamı
  `mutant_mobile_v1.glb` ile çiziliyor; AI tipi yalnız ÖLÇEĞİ değiştiriyor.
  Manifest authoritative: 822 716 bayt · 6 928 vertex · 11 271 üçgen ·
  1 mesh / 1 materyal / **1 draw call** · 30 skin joint + 2 attachment node ·
  8 klip · 512×512 WebP (+JPEG fallback) · Y-up · +Z · 1,861 m ·
  **decoder bağımlılığı YOK**. Yükleme P2.1'in `fetch`-siz / `blob`-suz
  yolunu aynen kullanır.
- **TRAINING DUMMY TAMAMEN KALDIRILDI.** `world/TrainingDummy.ts` silindi ·
  `PrototypeState.dummies` kaldırıldı · `entities()` artık yalnız gerçek
  moblar · **`WorldMob.isDummy` ve `.infiniteHealth` tip sözleşmesinden
  silindi** · `state.ts` kukla kapıları (`if (m.isDummy) continue`) gitti ·
  sahnedeki kukla çizimi, "TEST ALANI" katmanı ve `Dummy Combat Radius` DEV
  düğmesi kaldırıldı. **Test bunu kilitliyor:** kaynak ağacında `isDummy` /
  `TrainingDummySystem` / `S.dummies` / `TRAINING_AREA` geçen bir dosya
  kalırsa test kırmızı yanar.
- **`TrainingStats` → `CombatMeter`.** Ölçüm katmanı silinmedi, GERÇEK moba
  bağlandı; panel "HASAR KUKLASI — TEST" yerine **"COMBAT ÖLÇER — SEÇİLİ
  MOB"** ve yalnız canlı bir mob hedefliyken görünüyor. Sayaç matematiği ve
  DPS penceresi DEĞİŞMEDİ.
- **KLİP EŞLEMESİ AI'IN KENDİ FAZINDAN GELİR:** `IDLE → 01_IDLE` ·
  15 sn+ kesintisiz duruş → `02_IDLE_BREATHE` · `ROAM`/`RETURN` → `03_WALK` ·
  `CHASE` → `04_RUN` · `ATTACK` → `06_ATTACK_PUNCH` · `AGGRO` yükselen kenarı
  → `07_ROAR` (harekette kesilir) · `DYING`/`DEAD` → `08_DEATH` (LoopOnce +
  clamp) · `RESPAWN` → tam sıfırlama. **MobAi otoritesi DEĞİŞMEDİ** — bu
  katman faz ÜRETMEZ, yalnız okur.
- **SALDIRI KLİBİ UYDURULMADI:** manifestteki ÖLÇÜLMÜŞ `hitTimeSec` ile
  `MobAiProfile.hitMomentSec` farkı en küçük olan klip seçilir. Profil
  0,45 sn → punch (0,267 · fark 0,183) swipe'tan (1,300 · fark 0,850) yakın →
  **`06_ATTACK_PUNCH`**. Manifestin kendi önerisiyle örtüşüyor. Ağır profil
  tanımlanırsa AYNI kural `05_ATTACK_SWIPE`'ı seçer.
- **VURUŞ HİZALAMASI:** `MobAi` vuruşu `hitMomentSec` (0,45 sn) sonunda
  düşürür; klip windup sayacı klibin ölçülmüş vuruş anına (0,267 sn) inince
  başlatılır → **yumruğun teması gameplay vuruşuyla AYNI KAREYE gelir**.
  Gameplay zamanlaması DEĞİŞTİRİLMEDİ.
- **PLAYBACK HIZI ÖLÇÜMDEN:** `timeScale = ölçülen hız ÷ klibin kaynak hızı`.
  ROAM 1,90 m/sn → `03_WALK` ×1,57 · CHASE 2,60 m/sn → `04_RUN` ×1,18.
  `MobAiProfile` hızları (`moveSpeed 55`, `chaseSpeed 75/80`) DEĞİŞMEDİ.
- **ÖLÇEK P2.0 SİLÜET HİYERARŞİSİNİ KORUR:** ölçek uydurulmadı,
  `placeholder yüksekliği / doğal boy` oranıdır → NORMAL ×22,569 (42,0) ·
  AGGRESSIVE ×27,942 (52,0) · ELITE ×38,689 (72,0). Metre↔world köprüsü
  Archer ile AYNI; ikinci ölçek sabiti tanımlanmadı.
- **CESET ARTIK YAŞIYOR.** P2.0'da ölü mob görseli siliniyordu; artık
  `08_DEATH` oynayıp son karede tutuluyor. Görsel, respawn'da yeni bir
  `uid:generation` alındığı için kendiliğinden siliniyor — **eski poz yeni
  nesle SIZAMIYOR** (testli). Kaynaktan gelen 0,0705 m zemin batması ölüm
  boyunca **+0,075 m GÖRSEL Y ötelemesiyle** kapatıldı; gameplay
  zemin/çarpışma sistemine YAZILMIYOR. 0,87 m'lik yazılı geriye düşüş
  model-yerel SUNUM olarak kaldı.
- **GEOMETRİ VE MATERYAL PAYLAŞILIYOR:** örnekler `SkeletonUtils.clone()` ile
  üretiliyor — düğüm grafiği + skeleton kopyalanıyor, `BufferGeometry` ve
  `Material` TEK KOPYA. Test bunu **nesne kimliğiyle** doğruluyor. 60 sn
  respawn döngüsünde mob örnek tepesi **8**, canlı görsel `üretilen − silinen`
  muhasebesiyle tutuyor. Mixer bağları örnek silinirken `uncacheRoot` +
  `uncacheClip` ile çözülüyor.
- **`SkeletonUtils.js` VENDOR'A EKLENDİ** (yerel tarball'dan) ve
  `VENDOR.json` bütünlük kaydına girdi — artık **5 dosya**, sha256
  doğrulamalı. CDN YOK.
- **OYUNCUDA ATTACK / SKILL STATE'İ AYRILDI.** `ArcherAnimator` artık
  mantıksal state taşıyor (`IDLE · MOVE · ATTACK · SKILL · AIM · HIT ·
  EQUIP · DISARM · DEATH`); ayrım **kaynak referansından** gelir (P1.2.2
  kuralı aynen): Standart Atış → ATTACK, diğer 14 okçu skilli → SKILL.
- **İKİ VARLIK BOŞLUĞU AÇIKÇA BİLDİRİLDİ, UYDURULMADI:** (1) mutantta
  **`HIT_REACT` YOK** — Creature Pack (2) içinde hiçbir hasar tepkisi klibi
  bulunmuyor, hiçbir klip yerine geçmek üzere yeniden adlandırılmadı, mob
  hasar alınca klip DEĞİŞMİYOR; (2) archer'da **ikinci atış klibi YOK** —
  ATTACK ve SKILL ayrı state ama bugün aynı klibe çözülüyor. İkisi de
  telemetride ve testte görünür durumda.
- **PARITY ÜÇ KİPTE BİREBİR:** 20 sn deterministik farm senaryosu renderer
  KAPALI · AÇIK+silindir · AÇIK+**gerçek mutant** koşuldu; oyuncu konumu, HP,
  EXP, coin, hedef, Genie durumu, kill/item, yerdeki ganimet ve her mobun
  uid/nesil/HP/AI durumu FARKSIZ.
- **TESTLER: 481/481** (P2.1'de 465) — WebGL bağlamı olmadan. Kukla testleri
  silinmedi, **gerçek mob karşılıklarıyla değiştirildi** ve üzerine
  "GERÇEK ÖLÜM → GERÇEK LOOT" eklendi (kuklayla mümkün DEĞİLDİ).
  `npm test` (ana oyun) 106/106.
- **İZOLASYON:** `src/` DEĞİŞMEDİ · kaynak DB/JSON DEĞİŞMEDİ ·
  `dist/preview.html` md5 `0399549684eec7137f46cee73c318710`.
- **YAPILMADI (sınırlar korundu):** yeni game design · yeni skill · yeni mob
  sistemi · çoklu mob wave · upgrade / merchant / item balance · GLB yeniden
  optimizasyonu · blend katmanı · `05_ATTACK_SWIPE` için ağır saldırı profili.


## P2.1 — Archer GLB Entegrasyonu (22 Ağu 2026)
*Primitive kapsül gitti: gerçek rigged + animasyonlu Archer modeli oyunda.
GLB YENİDEN OPTİMİZE EDİLMEDİ; animasyon/kemik/doku verisine DOKUNULMADI.*

- **MANİFEST AUTHORITATIVE METADATA OLDU.** `archer_mobile_v1.manifest.json`
  `data/archer-manifest.json` olarak repoya alındı; `data/archer-model.ts`
  onu yalnız TİPLİ hale getirir. Kemik adı · socket ofseti · klip süresi ·
  kaynak hız · bilinen kusur — **hiçbiri elle yazılmadı**. Varlık gerçekleri
  testle manifeste kilitli: 929 200 bayt · 12 240 vertex · 20 820 üçgen ·
  1 mesh / 1 primitive / 1 materyal / **1 draw call** · 23 kemik · 17 klip ·
  512×512 WebP (+JPEG fallback) · Y-up · +Z forward · 1,801 m ·
  **decoder bağımlılığı YOK** (`extensionsRequired` boş).
- **`render3d/GlbLoader.ts` (YENİ):** yerel `vendor/three@0.169.0`
  GLTFLoader adaptörü. **CDN YOK.** Draco/Meshopt/KTX2 gerekmediği için ek
  çözücü bağlanmadı. **DÜĞÜM ADI TUZAĞI ÇÖZÜLDÜ:** glTF yükleyici adları
  `PropertyBinding.sanitizeNodeName` ile temizler ve iki nokta DÜŞER
  (`mixamorig:Left_arch1` → `mixamorigLeft_arch1`); manifest DEĞİŞTİRİLMEDİ,
  arama iki adımlı yapıldı.
- **YÜKLEME YOLUNDAN `fetch` TAMAMEN ÇIKARILDI — GERÇEK KUSUR DÜZELTİLDİ.**
  İlk sürüm `GLTFLoader.load(url)` çağırıyordu; o yol `FileLoader` üzerinden
  **bir `Request` NESNESİ kurup** `fetch(req)` çağırır (three 0.169.0,
  `three.module.js` ~44415). Önizleme, isteği `postMessage` ile ileten bir
  görüntüleyicide açıldığında `Request` yapısal olarak klonlanamıyor ve model
  `DataCloneError: Failed to execute 'postMessage' on 'Window': Request object
  could not be cloned.` ile düşüyordu. **`file://` ile açılan yerel testlerde
  GÖRÜNMÜYORDU.** Yeni yol: `data:` URI `atob` ile YERİNDE çözülür, diğer
  URL'ler `XMLHttpRequest` ile indirilir, her ikisinde de `GLTFLoader.parse()`
  çağrılır — `FileLoader` DEVRE DIŞI. Doku yolu da sabitlendi: `GLTFParser`
  kurucusu sırasında `createImageBitmap` globali geçici gizlenir, böylece
  `fetch` kullanan `ImageBitmapLoader` yerine `<img>` tabanlı `TextureLoader`
  seçilir. **Yan fayda:** headless testler ile tarayıcı artık AYNI doku yolunu
  çalıştırır. İki katmanlı kanıt: (1) headless testte `fetch` DataCloneError
  fırlatacak şekilde değiştirilip **fetch çağrısı 0** ölçüldü; (2) tarayıcıda
  `window.fetch` VE `new Request` ikisi de DataCloneError fırlatırken model
  **17/17 klip ile yüklendi**, konsolda uyarı/hata YOK.
- **`blob:` YOLU DA ÇIKARILDI — İKİNCİ GERÇEK KUSUR.** `fetch` düzeltildikten
  sonra model geliyor ama **DOKUSUZ (beyaz)** görünüyordu:
  `THREE.GLTFLoader: Couldn't load texture blob-request://blob-…`. Sebep:
  GLB dokusu `bufferView` içinde gömülü ve `GLTFLoader` onu
  `new Blob(...)` → `URL.createObjectURL(blob)` → `<img src=…>` ile çözüyor;
  aynı görüntüleyici `createObjectURL`'i de sarmalayıp `blob-request://`
  şemasına yönlendiriyor ve `<img>` o şemayı yükleyemiyor. Çözüm
  **`inlineGlbImages()`**: GLB'nin JSON parçası çözümlemeden ÖNCE yeniden
  yazılır, `bufferView` tabanlı her görsel BIN'den çıkarılıp `data:` URI'sine
  taşınır (WebP birincil + JPEG fallback = **2 görsel**). **İkili veri
  DEĞİŞMEZ** — BIN parçası bit-bit kopyalanır, yalnız `images[]` kayıtları ve
  chunk uzunlukları güncellenir. Ölçüldü: `fetch` çağrısı **0**,
  `URL.createObjectURL` çağrısı **0**, materyalde doku **var**.
- **JOYSTICK TERS ÇALIŞIYORDU — KAMERA EKSENİ DÜZELTİLDİ.** Joystick `dx/dy`
  EKRAN uzayındadır; 2D renderer dünyayı eksen hizalı çizer
  (ekran SAĞ = worldX+, YUKARI = worldY−). P2.0'ın `yawDeg = 45` varsayılanı
  bu hizayı bozuyordu: ölçülen ekran SAĞ ekseni **(−0.707, +0.707)** —
  joystick "sağ" komutu karakteri ekranda **yukarı-sola** götürüyordu.
  Varsayılan **`yawDeg = 270`** oldu; ekran ekseni 2D ile BİREBİR hizalı
  (**SAĞ = (+1, 0) · YUKARI = (0, −1)**). Bu bir GÖRSEL yerleşim kararıdır —
  joystick semantiği, `WorldMovementSystem` ve hiçbir gameplay değeri
  DEĞİŞMEDİ. Yeni `screenAxes()` hizayı ölçülebilir kılar, test kilitler.
  Kamera DEV'den döndürülürse `screenToWorldMove()` girdiyi kamera çerçevesine
  çevirir; **varsayılan kamerada bu dönüşüm BİREBİR KİMLİKTİR**, yani 3D
  katmanın açık/kapalı olması hareketi DEĞİŞTİRMEZ. Bedeli: 45°'lik izometrik
  döndürme gitti, görüntü düz yüksek 3/4 (pitch 60) oldu.
- **`render3d/ArcherAnimator.ts` (YENİ): 17 klibin KARARI three'siz.**
  `AnimationMixer` bu dosyanın DIŞINDADIR, bu yüzden tüm klip mantığı WebGL
  olmadan sınanır. three importu artık üç dosyada (`GlbLoader`, `ArcherRig`,
  `ThreeWorldRenderer`) ve bu **testle kilitli**.
- **YÖN EŞLEMESİ ELLE YAZILMADI:** hareketin model-yerel yön vektörü ile her
  klibin manifestteki `direction` vektörünün iç çarpımı en büyük olan klip
  seçilir. Doğrulandı: δ=0 → `03_RUN_FORWARD` · δ=π → `04_RUN_BACK` ·
  δ=+π/2 → `06_RUN_RIGHT` (yerel −X) · δ=−π/2 → `05_RUN_LEFT` (yerel +X).
- **RUN ↔ AIM_WALK EŞİĞİ DE MANİFESTTEN TÜRER:** iki kaynak hızın GEOMETRİK
  ORTASI — ileri yönde √(3,632 × 1,156) = **2,049 m/sn**. Joystick analog
  olduğu için her iki klip ailesi de gerçekten kullanılır. Sabit uydurulmadı.
- **PLAYBACK = ölçülen görsel hız ÷ klibin kaynak hızı.** Hız gameplay'e
  SORULMAZ, renderer konum farkından ölçer. Varsayılan `playerSpeed = 120`
  → 4,16 m/sn → `03_RUN_FORWARD` ×1,14. **`WorldMovementSystem` otorite kaldı,
  `playerSpeed` DEĞİŞMEDİ.**
- **ÖLÇEK KÖPRÜSÜ (yalnız GÖRSEL):** P2.0 placeholder kapsülü 52 world birimi
  olduğu için `52 / 1,801 = 28,873 world birimi / metre`. Ölçülen dünya sınır
  kutusu IDLE pozunda **48,7 birim**. Menzil / hitbox / hız DEĞİŞMEDİ.
- **`releaseDelay = 0.20` GAMEPLAY SABİTİ DEĞİŞTİRİLMEDİ.** Animasyonun doğal
  bırakma anı 0,183 sn (kare 6); **fark 0,017 sn** DEV telemetri panelinde ve
  `telemetry:render` çıktısında raporlanır.
- **ÖLÜM: gameplay konumu DEĞİŞMEZ — ölçüldü.** `15_DEATH` tek
  `rootMotionRemoved:false` klibidir ve 1,13 m yazılı geriye düşüş taşır. Bu
  **model-yerel sunum** olarak ele alındı: 3,5 sn boyunca gameplay
  `worldX/worldY` değişimi **0,000000 / 0,000000**, model-yerel kayma
  **1,129 m**. Kaynaktan gelen 0,118 m zemin batması **+0,12 m GÖRSEL Y
  ötelemesiyle** kapatıldı; ölüm boyunca gameplay zemin/çarpışma sistemine
  hiçbir şey YAZILMAZ. Klip LoopOnce + clamp — **asla döngü yapmaz**.
- **RESPAWN TAM SIFIRLAMA:** diriliş anında ölüm pozu, model-yerel kayma ve
  görsel öteleme TAMAMEN temizlenir (`ArcherRig.hardReset()`); ölçülen kök
  ötelemesi `{0,0,0}`, klip `01_IDLE`.
- **SOCKETLER MANİFESTTEN BİREBİR:** `bow`/`arrowSpawn` →
  `mixamorig:Left_arch1`, `nock` → `mixamorig:RightHand`; localPosition ve
  localRotation aynen. **BAĞIMSIZ DOĞRULAMA:** ölçülen `nock` ↔ `arrowSpawn`
  mesafesi ≈ **0,87 m** — manifestin bildirdiği çekiş uzunluğu bandının
  (0,761–0,909 m) tam içinde.
- **OK GÖRSELİ ArrowSpawn'DAN ÇIKAR:** ilk 0,12 sn'de otoritenin konumuna
  karışır. Karışım YALNIZ görseldir — otoritenin konumu/hızı/hasarı/**sayısı**
  değişmez (üçlü salvo 3 ok → 3 görsel). **Model yokken karışım da yoktur** →
  P2.0 davranışı bit-bit korunur.
- **YAY 17 KLİPTE ELDEN KOPMUYOR — ölçüldü:** 17 klip × 5 kare, yay ↔ sol el
  mesafesi sapması **1,02 × 10⁻⁵ m (0,01 mm)**. Kalan sapma float32 kemik
  matrislerinden gelir.
- **17 KLİBİN TAMAMI KULLANILIYOR:** ölüm > atış (`13_AIM_RECOIL`) >
  kuşan/çıkar (`16`/`17`) > hasar (`14_HIT_REACT`) > lokomosyon (`03..10`) >
  nişan tutuşu (`12_AIM_OVERDRAW`, LoopOnce + clamp — manifest "bu bir ÇEKİŞ
  değil TUTUŞ klibi" notuna uygun) > duruş (`01`/`02`).
- **HAREKET HALİNDE ATIŞ KESİMİ:** karışım katmanı olmadığı için 0,7 sn'lik
  recoil yürürken bacakları dondururdu; klip **bırakma anından SONRA**
  (0,35 sn) kesilip lokomosyona döner. Ölçülen kesim > 0,183 sn ve < 0,45 sn.
- **PRIMITIVE FALLBACK YAŞIYOR:** GLB yüklenemezse `console.warn` düşer ve
  P2.0 kapsülü devreye girer — oyun DURMAZ. DEV → Renderer paneli → **Model**
  düğmesiyle canlı geçiş; tarayıcıda ölçüldü: GLB **21 374 üçgen**,
  primitive **870 üçgen**, ikisinde de **6 draw call**.
- **HEADLESS TESTLER HÂLÂ WebGL İSTEMİYOR: 465/465** (P2.0'da 440; P2.1
  25 test ekledi). GLB testlerde **gerçek `GLTFLoader`** ile çözülür; Node'da
  `Image`/`document` olmadığı için yalnız DOKU DECODE yolu `tests/headless-dom.ts`
  şimiyle kapatılır — geometri, iskelet, inverse-bind matrisleri, 17 klip ve
  socket kemikleri GERÇEKTİR. Şim tarayıcı bundle'ına GİRMEZ.
- **RENDERER PARITY ÜÇ KİPTE BİREBİR:** 20 sn deterministik farm senaryosu
  renderer KAPALI · AÇIK+primitive · AÇIK+**gerçek GLB** koşuldu; oyuncu
  konumu/bakışı (1e-6), HP, MP, EXP, coin, seviye, hedef, Genie durumu ve tik
  sayısı, kill/item/coin, yerdeki ganimet ve her mobun uid/nesil/HP/konum/AI
  durumu **farksız**.
- **İZOLASYON:** `src/` DEĞİŞMEDİ (three/render3d/GLTFLoader importu YOK) ·
  kaynak DB/JSON DEĞİŞMEDİ · `dist/preview.html` md5
  `0399549684eec7137f46cee73c318710` — `tools/pack-preview.mjs` `.glb` MIME
  kaydıyla genişletildikten SONRA yeniden derlenip doğrulandı ·
  `npm test` 106/106.
- **YAPILMADI (P2.2+):** GLB yeniden optimizasyonu · decimation · yeni parmak
  rig'i / IK · animasyon blend ağacı (upper/lower body layering) · mob GLB'leri ·
  ekipman/zırh/silah görselleri · tam harita · environment · post-processing ·
  navmesh · physics · upgrade / Anvil / Scroll NPC · combat yeniden yazımı.
- **BİLİNEN SINIRLAR:** (1) parmak animasyonu baked — `13_AIM_RECOIL` takibi ve
  `17_DISARM_BOW` sırasında el kavrayışlı kalır (manifest kusuru, IK yazılmadı);
  (2) blend katmanı yok; (3) bu ortamda GPU yok — SwiftShader ile 20 FPS,
  gerçek cihaz ölçümü YAPILMADI; (4) ölüm görseli tarayıcıda doğrulanmadı
  (oyuncuyu öldürecek DEV kapısı yok) — headless test + telemetri ile ölçüldü.


## P2.0 — Three.js 2.5D Renderer Foundation (22 Ağu 2026)
*Gameplay'i okuyan, gameplay'e ASLA yazmayan Three.js dünya katmanı.
Gerçek Archer GLB KULLANILMADI (24 MB model P2.1'e aittir).*

- **`three@0.169.0` YEREL BAĞIMLILIK OLARAK KİLİTLENDİ.** Ortamda npm registry
  tamamen kapalı (403 — `npm ping` dahil), bu yüzden kütüphane kullanıcının
  sağladığı `three-0.169.0.tgz` tarball'ından `vendor/three/` altına vendor
  edildi. **Runtime CDN YOK, internet bağımlılığı YOK.** Dört dosya sha256 ile
  `vendor/three/VENDOR.json` içinde sabitlendi ve `npm run verify:three`
  bütünlük kapısı `verify:proto` zincirinin İLK adımı yapıldı.
  Çözümleme iki yoldan: tarayıcıda esbuild `alias`, headless'ta
  `tools/link-vendor.mjs` ile yerel `node_modules/three` bağlantısı.
- **`three@0.169.0` TypeScript tipi TAŞIMAZ** (`@types/three` ayrı ve erişilemez
  paket). Bu yüzden **yalnız projenin kullandığı yüzey** için elle
  `vendor/three/three.d.ts` yazıldı — kullanılmayan API bildirilmez, bildirim
  gerçek kullanımla senkron kalır.
- **`render3d/` KATMANI (YENİ): 7 dosya, THREE'Yİ İMPORT EDEN TEK DOSYA VAR.**
  `coords.ts` · `CameraRig.ts` · `views.ts` · `VisualRegistry.ts` ·
  `assets3d.ts` · `frame.ts` üçünün de three bağımlılığı YOKTUR ve saf
  matematik/veri olarak headless test edilir; three yalnız
  `ThreeWorldRenderer.ts` içindedir.
- **TEK YÖNLÜ SÖZLEŞME:** renderer gameplay nesnelerine referans bile TUTMAZ.
  `frame.ts` her karede **kopyalanmış, salt-okunur, dar** bir `WorldFrame`
  üretir. Renderer'ın gameplay'i mutasyona uğratma YOLU YOKTUR — bu bir
  konvansiyon değil, tip ve veri akışı garantisidir.
- **SINIR TESTLİDİR:** kaynak dosyalar taranır; `world/`, `data/`, `scenes/`,
  `tools/` ve kök dosyalarda `three` importu bulunursa test kırmızı yanar.
  Genie · MobAi · CombatPipeline · WorldCombatAdapter · `state.ts` ayrıca
  `Object3D` / `AnimationMixer` / `WebGLRenderer` kimliklerini de kullanamaz.
- **KOORDİNAT KÖPRÜSÜ:** `gameplay(worldX, worldY) → three(x, 0, z)`; düşey
  eksenin gameplay'de karşılığı YOKTUR ve ters dönüşümde ATILIR, böylece
  Three'nin Y/Z mantığı gameplay'e sızamaz. Bakış: `yaw = π/2 − facingAngle`,
  16 açıda gidiş-dönüş testli.
- **SABİT YÜKSEK 3/4 KAMERA:** yaw 45° · pitch 60° · mesafe 750 · bakış
  yüksekliği 90 · FOV 40. Oyuncu döndüremez, serbest kamera yoktur.
  Yumuşatma **kare-hızından bağımsızdır** (30/60/120 FPS'te aynı noktaya varır)
  ve determinizm için 0'a çekilebilir; kamera hiçbir gameplay kararına girmez.
- **PERSPECTIVE vs ORTHOGRAPHIC ölçüldü, karar verildi:** ikisi arasında DEV
  panelinden anında geçilebiliyor ve **gameplay ikisinde de aynı**.
  **Perspective varsayılan kalır** — P2.1'de gerçek rigged Archer GLB gelecek
  ve ortografik projeksiyonda model hacmi yassılaşıyor. Ortografik mod DEV
  aracı olarak korundu.
- **PLACEHOLDER GEOMETRİ (gerçek sanat YOK):** oyuncu kapsül + yön koni'si
  (360° dönüş ekranda okunur), mob silindir (NORMAL bej r16/h42 · AGGRESSIVE
  kırmızımsı r19/h52 · ELITE altın r26/h72), ok koni, ganimet kutu/küre —
  ganimet rengi **P1.8 `ITEM_CLASS_COLOR`'dan** gelir, renderer kendi renk
  tablosunu tutmaz.
- **RAYCASTER YALNIZ GİRDİ ADAPTÖRÜ:** `pickMobAt()` bir `uid` döndürür, o
  kadar. Hedef seçimi `WorldTargetSystem`'de kalır; testte raycast sonrası
  `targets.selectedUid` hâlâ `null`'dır. Raycast HP/mob state/combat/hedef
  DEĞİŞTİRMEZ.
- **PROJECTILE GÖRSELİ HASAR VEREMEZ — kasten kötüye kullanılarak kanıtlandı:**
  test ok görselini zorla mobun tam içine taşır, mobun HP'si DEĞİŞMEZ.
  Salvo sayıları authoritative ok sayısıyla birebir: 1 / **3** / **5**.
- **GÖRSEL KİMLİĞİ `uid:generation`:** P1.6.1 kimlik üçlüsü render katmanına
  taşındı; respawn olan mob eski görseli DEVRALAMAZ (testli).
- **HUD THREE'YE TAŞINMADI:** arkada Three canvas'ı (dünya), önde mevcut 2D
  canvas (HUD). 3D açıkken 2D katman `clearRect` ile şeffaf temizlenir ve
  yalnız HUD çizer; 3D kapalıyken P1.8'deki gibi dünyayı kendisi çizer.
  Girdi DAİMA 2D katmandadır. **WebGL yoksa 3D katman hiç kurulmaz** ve oyun
  eskisi gibi çalışır.
- **GLB / ANİMASYON / SOKET HAZIRLIĞI (implementasyon DEĞİL):** `assets3d.ts`
  manifest + durum makinesi (`missing → loading → ready | failed`) — P2.0'da
  **tüm `url`'ler `null`**, hepsi `PRIMITIVE fallback`. Kanonik runtime formatı
  **GLB**. `GLTFLoader` yerel paketten bağlandı. Klip sözleşmesi
  `IDLE/WALK/RUN/ATTACK/SKILL/DEATH` tanımlandı ama **hiçbir klip oynatılmıyor**;
  `BowSocket`/`ArrowSpawn` için yerel ofset fallback'i var, bone araması YOK,
  `releaseDelay = 0.20` korundu.
- **RENDERER PARITY (§26) BİREBİR:** 30 sn deterministik farm senaryosu renderer
  AÇIK ve KAPALI koşuldu; oyuncu konumu/bakışı (1e-6), HP, MP, EXP, coin,
  seviye, hedef uid, Genie durumu ve karar tik sayısı, kill/item/coin toplamı,
  yerdeki ganimet sayısı ve **her mobun** uid/nesil/HP/konum/AI durumu
  karşılaştırıldı. **Fark YOK.**
- **HEADLESS TESTLER WebGL İSTEMİYOR:** 440/440 test WebGL bağlamı olmadan
  geçiyor ve **gerçek `ThreeWorldRenderer` örneğini** kullanıyor — `canvas`
  verilmediğinde `WebGLRenderer` oluşturulmaz ama sahne grafiği, kamera, görsel
  yaşam döngüsü ve raycast kurulup çalışır. Sahte nesne değil, gerçek kod yolu.
- **SIZINTI MUHASEBESİ:** `VisualRegistry` her karede canlılığı işaretler,
  işaretlenmeyen görsel silinir. Ganimet kalkınca 0, tüm moblar ölünce 0;
  2 dakikalık respawn döngüsünde mob tepe ≤ 8 · ok tepe ≤ 24 ve
  `canlı = üretilen − silinen` muhasebesi tutuyor. Paylaşılan geometri/materyal
  görsel silinirken DOKUNULMAZ, yalnız `dispose()` serbest bırakır.
- **ÇİZİM MALİYETİ:** stress sahnesi (1 oyuncu · 20 mob · 30 ok · zemin · ışık)
  **39 draw call · 1 734 üçgen · 10 geometri · 6 shader programı**; gerçek oyun
  karesi (8 mob, Genie açık) **10 draw call · 1 002 üçgen**. Paylaşılan
  geometri/materyal sayesinde maliyet entity sayısıyla DEĞİL tip sayısıyla
  büyür. `devicePixelRatio` 2 ile sınırlandı.
- **DÜZELTİLEN GERÇEK KUSURLAR:** (1) yönlü ışığın gölge kamerası orijinde
  sabitti, dünya (1240, 1650) civarında olduğu için zemin tamamen karanlık
  çıkıyordu → güneş ve gölge kamerası oyuncuyu takip ediyor; (2) `matrixWorld`
  yalnız `render()` sırasında güncellendiği için headless raycast `null`
  dönüyordu → `update()` sonunda `scene.updateMatrixWorld(true)`.
- **İZOLASYON:** `src/` DEĞİŞMEDİ (three/render3d importu YOK, grep boş) ·
  kaynak DB/JSON DEĞİŞMEDİ · `dist/preview.html` md5
  `0399549684eec7137f46cee73c318710` (P1.2'den beri aynı) · `npm test` 106/106.
- **YAPILMADI (P2.1+):** 24 MB Archer GLB importu · model optimizasyonu ·
  gerçek karakter/mob sanatı · tam harita · environment · ekipman görselleri ·
  zırh değişimi · silah soketi implementasyonu · gelişmiş animasyon sistemi ·
  post-processing · bloom · SSAO · navmesh · physics · multiplayer · upgrade ·
  Scroll NPC · Anvil · combat yeniden yazımı.


## P1.8 — Item Class + Equipment + Build V1 (22 Ağu 2026)
*Drop edilen item → item kimliği/sınıfı → envanter → equip → build → combat
stat recalc zinciri. Upgrade / anvil / scroll NPC YAPILMADI (P1.9).*

- **BEŞ ITEM SINIFI AUTHORITATIVE ALAN OLDU:** `LOW` beyaz · `MIDDLE` yeşil ·
  `HIGH` mavi · `RARE` mor · `UNIQUE` turuncu. **Kaynakta rarity KOLONU YOK** —
  bu tamamen bir Project Legacy kararıdır. Domain yalnız `ItemClass` taşır;
  renk eşlemesi TEK YERDE (`ITEM_CLASS_COLOR`), renderer coupling yok.
- **`data/item-model.ts` (YENİ): ItemDefinition / ItemInstance ayrımı.**
  Statlar instance'a KOPYALANMAZ, definition üzerinden çözülür.
- **SİLAH PRIMARY STAT YASAĞI DERLEYİCİ GARANTİSİ:** `WeaponStats` içinde
  `str`/`dex`/`int`/`sta` ALANI HİÇ YOKTUR — silaha primary stat yazmak
  derleme hatası verir. **KAYNAK BULGUSU:** KO'da silahlar primary stat
  TAŞIYABİLİR (2505 yayın 208'inde `dex_bonus`, 197'sinde `str_bonus` ≠ 0);
  Project Legacy bunu BİLEREK kullanmaz ve her tanımda `droppedSourceFields`
  ile işaretler.
- **CRIT HİÇBİR YERDE YOK:** hiçbir stat bloğunda kritik alanı bulunmuyor;
  `items_server` tablosunda da kritik KOLONU YOK — "kaldırılmadı, hiç yoktu".
- **RASTGELE AFFIX YOK:** aynı isimli item her düştüğünde AYNI statları taşır;
  roll aralığı / affix havuzu / rastgele direnç sistemi YOKTUR.
- **`data/item-catalog.ts` (YENİ): 22 tanımlı Archer kataloğu** — 5 yay (her
  sınıftan bir), 11 zırh (5 parçalık başlangıç seti + üst sınıf örnekleri),
  6 aksesuar (2 küpe · 2 yüzük · 1 kolye · 1 kemer). Tüm `definitionRef`
  değerleri GERÇEK drop havuzu itemleridir → drop → equip uçtan uca çalışır.
- **`world/BuildResolver.ts` (YENİ): TEK stat authority'si.** `CharacterStats`'tan
  türer, yalnız `equipmentStats()`'i ezer — ana zincir DEĞİŞMEDİ. Taban /
  ekipman / toplam AYRI görünür. **DRIFT İMKÂNSIZ:** hiçbir mutable sayıya
  ekleme yapılmaz, her çağrıda sıfırdan hesaplanır. 100 kez equip/unequip
  sonrası build BİREBİR aynı.
- **`world/EquipService.ts` (YENİ):** doğrula → planla → uygula. Katalog ·
  sınıf · seviye · slot kapıları; başarısızlıkta HİÇBİR mutasyon yok. Çanta
  dolu iken swap kapasiteyi aşmaz ve item KAYBOLMAZ.
- **SİLAH ELEMENTALİ AYRI BİLEŞEN (§21):** `ImpactEvent` artık
  `physicalDamage` · `elementalDamage` (skill) · **`weaponElementalDamage`** +
  tür dağılımını ayrı taşır; tek alana EZİLMEZ. Kaynakta bu entegrasyon
  DOĞRULANAMADIĞI için PROJECT LEGACY V1 TUNING olarak etiketlendi.
- **POISON ≠ DoT (§4):** zehirli yay (poison 50) vurduğunda hasar bileşeni
  uygulanır ama **status yapışmaz ve tik atmaz** (ölçüldü: 0 status, 0 tik).
  Zehir SKİLLİ aynı testte 4 tik atmaya devam ediyor — iki sistem ayrı.
- **COMBAT VERDICT:** Attack ✅ · Defense ✅ · MaxHP/MaxMP ✅ · silah
  elementali ✅ (V1 tuning) · **DEX/STR/INT ⚠️ ENTEGRE DEĞİL** (ana hasar
  formülünde `dex` kullanılmıyor — yeni formül UYDURULMADI) ·
  **dirençler ⚠️ ENTEGRE DEĞİL** (mitigation yolu yok, uydurulmadı).
- **`req_str`/`req_dex`/`req_intel` — NOT VERIFIED / deferred:** kaynak yaylar
  `req_dex` 56–88 ister, Project Legacy karakterinin DEX ölçeği tek hanelidir;
  iki ölçek uyuşmadığı için gereksinim UYGULANMADI, kaynak değer taşınıyor.
- **§8/§9 upgrade YAPILMADI ama model hazır:** `baseItemRef` + instance
  `upgradeLevel` alanları var; P1.8'de upgrade seviyesi STATLARI DEĞİŞTİRMEZ
  (testle korunuyor). §31 `setId` taşınıyor, set BONUSU yok.
- **DEV panelleri:** `Build telemetrisi` (taban/ekipman/toplam + 12 slot,
  sınıf renkleriyle) · `Test ekipmanı ver` (katalog takımını verir/kuşandırır
  ve ayak dibine örnek yay bırakır) · yerdeki item için **tooltip**
  (ad · sınıf · seviye · slot · statlar · +0 — crit satırı YOK, roll satırı YOK).
  Headless: `npm run telemetry:items`.
- **Testler:** 417 prototip (P1.8 ile +30) · ana oyun 106/106.
- **İZOLASYON:** `src/` DEĞİŞMEDİ · kaynak DB/JSON DEĞİŞMEDİ ·
  `dist/preview.html` md5 `0399549684eec7137f46cee73c318710` (aynı).
- Ayrıntı: `docs/ITEM_EQUIPMENT_BUILD_V1.md`.

## P1.7 — Drop & Loot Farm Loop V1 (22 Ağu 2026)
- **KAYNAK ZİNCİRİ DOĞRULANDI** (KO_Reference_v8.db):
  `monsters.s_sid → monster_drops.s_index (slot_no 1..5 · drop_kind ·
  item_or_group_id · rate_raw)` → direct ise `items_server.num`, group ise
  `make_item_groups.group_id → item_id[]`. Coin `monsters.i_money`.
- **`rate_raw` ON BİNDE BİRDİR** (yüzde değil): `rate_percent = rate_raw/100`,
  2275 satırda ihlal 0. Örn. `rate_raw 85 → %0.85`.
- **YUVALAR BAĞIMSIZ ATILIR** — kaynaktan çıkan bir SONUÇ: 526 mobun 216'sında
  yuva oranları toplamı %100'ü aşıyor (en yüksek %375); tek seçim modeli
  matematiksel olarak imkânsız.
- **UYDURULMAYANLAR:** grup içi üye AĞIRLIĞI kaynakta YOK → seçim `uniform`
  (PROJECT LEGACY, üretilmiş içerikte de böyle işaretli) · coin'in aralık olup
  olmadığı bilinmiyor → **COIN_RANGE_SEMANTIC UNRESOLVED**, sabit miktar ·
  çıkarılamamış 331 grup satırı icat EDİLMEDİ.
- **`data/drop-profile.ts` (YENİ):** SOURCE FACT (`slotNo`, `kind`, `rateRaw`,
  `triggerPercent`, `itemRef`, `groupRef`, `memberItemRefs`, `selection`) ile
  PROJECT LEGACY TUNING (`coinMultiplier`, `dropRateMultiplier`,
  `ownerPlayerId`, `lootLifetimeSec 60`, `pickupRadius 70`) ayrı.
- **`world/DropSystem.ts` (YENİ): tek drop authority'si.** kill → roll →
  sahiplik → teslimat. Drop tablosu semantiği ana `LootSystem.roll()`,
  envanter ana `InventoryState`, item adı/stat `Content.item()` — hiçbiri
  kopyalanmadı. Scene'de drop tablosu YOK.
- **AUTO LOOT ARTIK MESAFESİZ.** Karar DROP ANINDA verilir: drop oyuncuya aitse
  mob 1000 birim uzakta ölse bile doğrudan envantere/cüzdana girer. Skill
  menzili, Farm Boundary ve oyuncu mesafesiyle İLİŞKİSİ YOK.
- **§23 ESKİ AUTO LOOT RANGE KALDIRILDI:** `autoRadius` (90/300/600/1200),
  `LOOT_RADIUS_OPTIONS/LABELS`, yarıçap tarayan `autoPickup()`,
  `AUTO_LOOT_MAX_PER_TICK` ve ayar ekranındaki "Auto Loot Menzili" satırı.
  `LOOT_DEFAULTS` artık yalnız `mode` taşır.
- **ÇANTA DOLU → ITEM KAYBOLMAZ:** loot MOBUN ÖLÜM NOKTASINDA yere düşer
  (`FULL_INVENTORY_GROUND`); oyuncunun konumunda ASLA oluşmaz.
- **SAHİPLİK authoritative:** `ownerPlayerId` bir UI etiketi değil, `claim()`in
  ilk kapısıdır; başka oyuncu `notOwner` alır ve envantere dokunamaz.
- **CLAIM IDEMPOTENCY:** bir `lootUid` yalnız bir kez talep edilir; ikinci
  deneme `alreadyClaimed`. Envanter reddederse loot yerde kalır, `claimed`
  işaretlenmez (kısmi mutasyon yok).
- **LOOT KİMLİĞİ MOB KİMLİĞİNDEN AYRI:** `lootUid` (örnek kapsamlı sayaç) +
  izlenebilirlik için `sourceMobUid` / `sourceSpawnSlot` / `sourceGeneration`.
  Mob respawn olsa da yerdeki loot silinmez, taşınmaz, sahibi değişmez.
- **DESPAWN 60 sn, FPS BAĞIMSIZ** (DEV: 15/60/180). 59.5 sn'de duruyor,
  60.5 sn'de gitmiş — 30/60/120 FPS'te aynı.
- **COIN tek authority:** Auto Loot ON → cüzdan (slot KAPLAMAZ) · OFF → yerde
  coin entity. `resolveKill()` artık coin KREDİ ETMEZ, yalnız EXP verir.
- **GENIE LOOT TOPLAMAZ:** `GenieAction` `'loot'` türü ve `GenieDeps.lootPolicy`
  kaldırıldı. Auto Loot Genie'den bağımsız oyuncu tercihidir — Genie KAPALI +
  Auto Loot AÇIK + manuel kill → doğrudan envanter.
- **MANUEL TOPLAMA 70 birim:** menzil dışında `outOfRange`, hiçbir mutasyon yok,
  oyuncu OTOMATİK YÜRÜTÜLMEZ.
- **DEV → Drop telemetrisi** (yeni panel): son kill'in kaynak zinciri, her
  drop'un teslimat yolu, coin, EXP, toplam sayaçlar + yerdeki her entity'nin
  uid/sahip/konum/mesafe/kalan ömür/kaynak mob bilgisi. `Loot ömrü` preseti.
  Headless: `npm run telemetry:drops`.
- **Testler:** 387 prototip (P1.7 ile +20, eski yarıçap testleri kaldırıldı) ·
  ana oyun 106/106. 30 dk soak: yerdeki loot ≤200, claim geçmişi ≤512,
  çift claim 0, `items = toInventory + toGround` (item kaybı yok).
- **İZOLASYON:** `src/` DEĞİŞMEDİ · kaynak DB/JSON DEĞİŞMEDİ ·
  `dist/preview.html` md5 `0399549684eec7137f46cee73c318710` (aynı).
- Ayrıntı: `docs/DROP_LOOT_FARM_LOOP_V1.md`.

## P1.6.1 — Architecture Correctness Pass (22 Ağu 2026)
*Fable P1–P1.6 Architecture Audit'in correctness/identity/timing borçları.
YENİ FEATURE YOK; P1.6 gameplay davranışı ve bütün tuning değerleri KORUNDU.*

- **HIGH #1 — ENTITY KİMLİĞİ.** Respawn eskiden aynı `uid`'i koruyordu; hâlâ
  havada olan ESKİ bir ok, aynı slotta YENİ doğan canlıyı buluyor ve GERÇEKTEN
  vuruyordu (fix kaldırılıp doğrulandı: impact `invalid: null` dönüyordu).
  Kök neden: SPAWN SLOT kimliği ile MOB ÖRNEĞİ kimliği aynı alana bindirilmişti.
  Artık **üç ayrı kavram**: `slotId` (sabit) · `generation` (her respawn +1) ·
  `uid` (her doğuşta YENİ, asla yeniden kullanılmaz). Mob NESNESİ hâlâ yeniden
  kullanılır → duplicate imkânsızlığı korunur.
- **Projectile kimlik kapısı.** Ok, release anında hedefin `uid` VE `generation`
  değerini kopyalar. Impact'te uid çözülmezse `targetGone`, nesil uyuşmazsa
  `targetReplaced`. Her iki durumda: hasar yok · DoT yok · aggro yok · kill/loot yok.
- **HIGH #2 — GENIE KARAR SAATİ.** `timer = interval` sıfırlaması taşan süreyi
  çöpe atıyordu; gerçek aralık kare süresine yuvarlanıyordu. 9.95 sn'de
  **30 FPS → 75 · 60 FPS → 86 · 120 FPS → 92** karar (ideal 99). Artık
  artık-koruyan biriktirici (sonsuz döngü guard'lı): **99 / 99 / 99**.
  `decisionIntervalSec` DEĞİŞMEDİ — sadece gerçekten uygulanıyor.
- **DoT SAATİ — aynı sınıf hata.** Ana `tickStatuses()` (src/, değiştirilemez)
  de `tickTimer = tickSec` sıfırlaması yapıyor. Formül kopyalanmadan ana
  fonksiyon **SABİT 1/128 adımla** sürülüyor. Zehir tikleri eskiden
  **3 / 4 / 3** (60 FPS %33 fazla hasar!), şimdi **4 / 4 / 4**. `1/128` seçildi
  çünkü ikilik tabanda TAM temsil edilir (128 adım = 1.000 sn); `1/120` FPS'i
  eşitler ama son tiki düşürür. P1.3 zehir tuning'i DEĞİŞMEDİ.
- **castId LIFECYCLE.** `ImpactEvent.castId` her zaman **0** yazılıyordu ve
  `Projectile` castId taşımıyordu. Artık accept → release → projectile → impact
  → telemetri boyunca korunuyor; aynı skill'den iki eşzamanlı cast karışmıyor.
- **BOŞ TESTİN BULDUĞU GERÇEK HATA.** Eski §25 testi hiç üretilmeyen bir
  `wait/range` gerekçesini sayıyordu (daima 0 → hiçbir şey kanıtlamıyordu).
  Casus (spy) ile yeniden yazıldı ve **açık bir sızıntı** buldu: `ACQUIRE`
  durumunda Genie menzil dışındaki hedefe cast deniyordu. Cast kapısı artık bir
  DURUM ADINA değil **gerçek mesafeye** bakıyor
  (`GenieMovementController.inCastingPosition()` — eşikler tek yerde).
- **ÖLÜ DEFTER TEMİZLİĞİ.** `castProjectiles` map'ine yalnız yazılıyordu →
  sınırsız büyüme. Artık son ok çözülünce kayıt siliniyor (`openCastCount`
  telemetride ve soak testinde). Kullanılmayan `resetPipelineIds()` kaldırıldı.
- **ID SAYAÇLARI ÖRNEK KAPSAMINA TAŞINDI.** `CombatPipeline` (cast+projectile),
  `MobSlotSystem` (entity), `WorldLootSystem`, `TrainingDummySystem`,
  `ProjectileFxSystem` — modül düzeyindeki `let next…` sayaçları runtime'lar
  arasında sızıyordu. İki ayrı `PrototypeState` artık birebir aynı ID'lerle başlar.
- **TEK ÖLÜM KAPISI STATE'E TAŞINDI.** `reapDead()` Scene'den `PrototypeState`'e
  alındı (Scene yalnız görsel tepki verir). Aynı karede DoT tiki + ok impact'i
  öldürürse `resolveKill` **1**, loot **1**, ikinci reap **0**.
- **17 YENİ REGRESYON TESTİ**: kimlik · castId · Genie FPS eşitliği · DoT FPS
  eşitliği · APPROACH/ACQUIRE cast sızıntısı · çift ölüm yarışı · canlı boundary
  küçültme · oyuncu ölümü sonrası stale aggro · kilitli+kullanılabilir iksir
  yığını atomikliği · **30 dakikalık bounded-growth soak**.
- **ESKİ/YANLIŞ METİNLER.** Genie Ayarları ekranında oyuncuya
  "V0: otomatik hareket YOK" yazıyordu (P1.5'ten beri yanlış) → düzeltildi.
  Aynı yanlış iki kod yorumunda da vardı.
- `npm run telemetry:correctness` — üç borcun ESKİ/YENİ ölçümlerini basar.
- **Testler:** 376 prototip (P1.6.1 ile +17) · ana oyun 106/106.
- **İZOLASYON:** `src/` DEĞİŞMEDİ · kaynak DB/JSON DEĞİŞMEDİ ·
  `dist/preview.html` md5 `0399549684eec7137f46cee73c318710` (aynı).
- Ayrıntı: `docs/ARCHITECTURE_CORRECTNESS_P1_6_1.md`.

## P1.6 — Mob AI + Farm Area V1 (22 Ağu 2026)
- **`world/MobAi.ts` (YENİ): mob durum makinesi.**
  `IDLE / ROAM / AGGRO / CHASE / ATTACK / RETURN / DYING / DEAD / RESPAWN`.
  Renderer'dan ve Scene'den BAĞIMSIZ, tek başına test edilebilir. Scene'de
  dağılmış AI if bloğu YOK — Scene yalnız çizer.
- **`data/mob-ai-profiles.ts` (YENİ): NORMAL / AGGRESSIVE / ELITE.**
  ÜÇ AYRI AI yazılmadı; aynı durum makinesi üç parametre setiyle çalışır.
  `NORMAL.aggroRadius = 0` → **PASİF**: oyuncu yanından geçmekle saldırmaz,
  yalnız **hasar alınca** uyanır.
- **`data/farm-area.ts` (YENİ): 8 tekil spawn slotu** (2 yakın · 3 orta · 3 uzak,
  4 NORMAL / 3 AGGRESSIVE / 1 ELITE). Her slot TEK mobun SABİT EVİDİR; roam,
  leash ve return hesabı bu ev noktasından yapılır. Eski küme tabanlı
  `data/mob-slots.ts` KALDIRILDI.
- **AGGRO YALNIZ IMPACT ANINDA.** Cast anında aggro olmaz (P1.4 iki fazlı
  mimariyle tutarlı). Çok-ok (3/5) aynı moba değse bile **tek** durum geçişi
  üretir — `notifyDamaged` idempotenttir.
- **SALDIRI TEMPOSU FPS'TEN BAĞIMSIZ.** Sayaç `=` ile sıfırlanmaz, `+=` ile
  devreder. 10 sn ölçümü: 1/30 → 6 vuruş · 1/60 → 6 · 1/120 → 6.
  Vuruş yalnız authoritative `attackRange` (55) içindeyken düşer; histerezis
  bandında (55 < d ≤ 65) mob ATTACK durumundadır ama hasar VERMEZ.
- **LEASH EVDEN ÖLÇÜLÜR** → mob haritanın öbür ucuna sürüklenemez.
  **RETURN sırasında yeniden aggro OLMAZ** (V1 kararı: dönen moba hasar
  vurulabilir ama dönüşü bozulmaz — aksi halde "vur–dön–vur" kilidi oluşurdu).
- **HP YALNIZ EVE VARINCA dolar** (`returnTolerance = 14`), dönüş başlarken
  veya yolda değil. Varışta `status[]` de temizlenir.
- **RESPAWN aynı slotta, TAM ev noktasında, dolu canla.** Yeni mob NESNESİ
  üretilmez (aynı `uid`) → duplicate imkânsız. `populate()` slotta herhangi
  bir mob kaydı varsa (ceset dahil) yeni mob üretmez.
  DEV preseti **3 / 8 / 15** sn (ölçülen 3.02 / 8.02 / 15.00).
- **`world/MobAttack.ts` (YENİ): mob → oyuncu hasarı.** YENİ FORMÜL YOK —
  ana `CombatSystem.damageRoll()` + `PlayerState.takeDamage()` yeniden
  kullanılır. Ana `enemyAttackTick()` DEĞİŞTİRİLMEDİ ve ana oyunda çalışmaya
  devam ediyor; prototipteki tek fark ZAMANLAMADIR.
- **DOĞUŞ GÜVENLİĞİ DÜZELTMESİ (telemetride bulundu):** `fa_a1` slotu profil
  varsayılanıyla (aggroRadius 220, ev 210 birim uzakta) doğuş noktasını
  kapsıyordu ve oyuncu oyuna girer girmez saldırıya uğruyordu. Slot ezmesiyle
  `aggroRadius 120` + `roamRadius 60`. Kural testle korunuyor:
  `aggroRadius + roamRadius < ev-doğuş mesafesi`.
- **Telemetri:** DEV panelinde `Mob telemetri` (varsayılan KAPALI) — her mob
  için durum, HP, oyuncuya/eve mesafe, aggro sebebi, respawn sayacı; üstte
  farm alanı özeti. Açıkken Genie listesinin YERİNE çizilir (üst üste binme
  yok). Haritada ev noktası + roam yarıçapı; `Show projectile rays` açıkken
  aggro (kırmızı) ve leash (mavi) yarıçapları. Headless: `npm run telemetry:mobs`.
- **Testler:** 359 prototip testi (P1.6 ile +29), ana oyun 106/106.
  On "TAMAMLANMADI" şartının her biri ayrı testle kapatıldı.
- **İZOLASYON:** `src/` DEĞİŞMEDİ · kaynak DB/JSON DEĞİŞMEDİ ·
  `dist/preview.html` md5 `0399549684eec7137f46cee73c318710` (aynı).
- Ayrıntı: `docs/MOB_AI_FARM_AREA_V1.md`.

## P1.5 — Genie Movement + Farm Loop V1 (22 Ağu 2026)
- **`world/GenieMovement.ts` (YENİ): Genie hareket durum makinesi.**
  `IDLE / ACQUIRE / APPROACH / COMBAT / RETURN / WAIT`. Renderer'dan ve Scene'den
  BAĞIMSIZ, tek başına test edilebilir; Scene'e dağılmış if blokları YOK.
  Karar saf veri üzerinden: `decide(input) → { state, intent, distance }`.
  `MoveIntent` bir BİRİM YÖN vektörü + `destinationWorldX/Y` taşır (world
  koordinatı; canvas/ekran değeri girmez, ileride 3D/navmesh aynı arayüzü
  kullanabilir).
- **Gerçek farm döngüsü:** hedef ara → yaklaş → menzile gir → dur → cast →
  impact → ölürse yeni hedef → hedef yoksa merkeze dön → bekle.
- **Üç menzil ayrı:** acquisition **450** (değişmedi) · authoritative cast range
  **400** (değişmedi) · otomatik konumlanma hedefi **380** (YENİ, yalnız
  movement tuning — skill menzili DEĞİL).
- **Histerezis 380/400:** `d > 400 → APPROACH`, `d ≤ 380 → COMBAT`, arada durum
  KORUNUR. Ölçüldü: `405→APPROACH · 380→COMBAT · 400→COMBAT · 401→APPROACH`.
  399 ↔ 401 titremesi imkânsız.
- **RANGE FAIL SPAM'İ BİTTİ:** APPROACH durumundayken hiçbir skill denenmez;
  Genie `wait/approaching` üretir. Yaklaşma boyunca `range` reddi sayısı **0**.
  Skill'in menzil kapısı (400) `WorldCombatAdapter`'da kaldırılmadı.
- **Genie'ye özel hız YOK:** oyuncunun aynı `WorldMovementSystem`'i ve aynı hızı
  kullanılır. Ölçüldü: 90/120/150 → 90.0/120.0/150.0 birim/sn; ActionLock
  aktifken Attack Move %60 → 54/72/90.
- **Farm Boundary artık gerçek hareket kısıtı:** sınır dışı mob hedeflenmez,
  hedef sınır dışına kaçarsa bırakılır, peşinden gidilmez; Genie kaynaklı
  hareketten sonra `clampPlayer()` oyuncuyu sınır dairesine geri çeker.
  Manuel oyuncu kısıtlanmaz.
- **RETURN CENTER:** uygun hedef yokken merkeze yürünür, `returnTolerance = 20`
  ile durulur (pixel-perfect gitme yok). RETURN sırasında tarama sürer; uygun
  mob girerse RETURN iptal → ACQUIRE.
- **§13 MANUEL ÖNCELİK — VEKTÖRLER TOPLANMAZ:** joystick dead-zone üstündeyse
  o kare manuel hareket uygulanır, Genie vektörü uygulanmaz (Genie
  DURDURULMAZ). Ölçüldü: bileşke hız 120.0 = base speed, X kayması 0.00.
  Joystick bırakılınca Genie kaldığı yerden devam eder.
- **DURDUR:** hareket anında 0, Genie iç durumu temizlenir; havadaki ok
  İPTAL EDİLMEZ, mana/cooldown iadesi yok. **BAŞLAT:** stale target
  kullanılmaz, farm merkezi kilitlenir, ACQUIRE ile başlanır.
- **DEV telemetrisi:** GENIE STATE, son geçiş, hareket kaynağı
  (MANUAL/GENIE/NONE), auto hız, hedef mesafe (380), cast range (400),
  acquisition (450), merkeze uzaklık.
- **`npm run telemetry:farm` (YENİ):** tam farm döngüsü, histerezis, hız,
  boundary, return, manuel öncelik ölçümleri.
- Korunanlar: Auto Loot (kill→loot testli), iksir sistemi (Genie yürürken
  iksir kullanabiliyor, hareket durmuyor), Training Dummy hedefleme davranışı,
  manuel mod (Genie kapalıyken skill oyuncuyu yürütmez), Genie skill kararı
  (sequence/priority/set seçimi/cursor) DEĞİŞMEDİ.
- Testler: **306 → 330** (24 yeni). Ana test 106/106; `dist/preview.html` md5
  DEĞİŞMEDİ.

## P1.4.1 — Range + Movement + KO Potion Correctness (22 Ağu 2026)
- **`ARCHER_CAST_RANGE` 340 → 400.** 15 Archer saldırı skillinin tamamı.
  PROJECT LEGACY TUNING; kaynak `range_value`/`add_range` DEĞİŞMEDİ.
  Ölçüldü: 395 ✓ · 400 ✓ (tam sınır) · **401 → `range` reddi** (mana/cooldown/
  ActionLock/projectile/hasar mutasyonu YOK, otomatik yaklaşma YOK).
  Genie hedef edinme yarıçapı (450) ayrı kavram olarak duruyor.
- **`playerSpeed` varsayılanı 210 → 120** world birimi/sn. DEV presetleri
  90 / 120 / 150 (tek düğmeyle döner). Combat/projectile/kamera/cooldown
  bununla ölçeklenmedi, global timeScale yok.
- **Attack Move yeni base üzerinden:** base120 → %0 = 0 · %60 = **72** ·
  %100 = 120. base90 %60 = 54 · base150 %60 = 90. `72` hiçbir yerde hard-code
  DEĞİL — çarpan o anki base'e uygulanır.
- **KO iksir verisi DB'den doğrulandı.** Zincir çözüldü:
  `items_server.effect1 → magic_type3.magic_num`, `first_damage` = SABİT geri
  kazanım, `direct_type` 1 = HP / 2 = MP, `duration = 0` → ANLIK.
  MP: spirit 120 · intelligence 240 · **sagacity 480 · wisdom 960 · soul 1920**.
  HP: **life 90 · love 180 · grace 360 · favors 720**. Beklenen progression
  birebir tuttu. (Ana `consumable-behaviors.ts` başlığındaki "effect1/effect2
  çözülmedi" notu artık geçersiz — o dosya bu görevde DEĞİŞTİRİLMEDİ.)
- **`data/ko-potions.ts` + `world/PotionSystem.ts` (YENİ, prototipe özel):**
  yüzde YOK, `after = min(max, before + restoreAmount)`. Yavaş dolum yok,
  mana-over-time yok, her kullanım `quantity − 1`. Atomik: başarısız kullanımda
  HP/MP ve adet değişmez. **Ana Faz 6.1 yüzdelik iksirleri olduğu gibi duruyor**
  (regresyon testi ile korunuyor).
- **Genie artık kendi iksir SEÇMİYOR.** `hpPotionRef` / `mpPotionRef` ile tek
  kademe seçilir (KAPALI + bütün kademeler). Seçili kademe bittiğinde **başka
  kademeye OTOMATİK GEÇMEZ**: envanter mutasyonu yok, `potionEmpty` eylemi ve
  "MP iksiri bitti" geri bildirimi üretilir (spam koruması 3 sn — gameplay
  cooldown'u DEĞİL).
- **Eşik yalnız TETİK:** `hp/maxHp <= threshold` ne zaman içileceğini belirler;
  miktar sabittir. Ayar etiketleri "HP/MP Eşiği (tetik)" oldu.
- **İksir telemetrisi:** `before → after`, `actual`, `wasted` (clamp ziyanı),
  `remaining`. DEV panelinde ve log satırında.
- **DEV → `Test iksirleri ver`:** HP 90/180/360/720 ×20 + MP 480/960/1920 ×20.
  Normal başlangıç envanteri DEĞİŞMEDİ.
- **POTION RECAST SEMANTIC UNRESOLVED:** dokuz kayıtta da `cast_time = 5`,
  `recast_time = 1`; birim doğrulanamadı, DB'de sunucu kullanım kodu yok →
  iksir cooldown'u UYDURULMADI.
- **ÖLÇEK BULGUSU (rapor, düzeltme yok):** `maxMP = 474` iken MP 480/960/1920
  kademeleri DAİMA tavana takılıyor (106/586/1546 ziyan). Bugün işe yarayan MP
  kademeleri 120 ve 240. HP tarafında sorun yok (`maxHP = 1086`).
- 3/5 telemetrisi range 400'de yeniden alındı; **spread DEĞİŞTİRİLMEDİ**
  (395'te Small r26: Üçlü 1/3, Beşli 1/5; Boss r60: 3/3 ve 5/5).
- P1.4 mimarisine (cast→release→impact, payloadProxy, ortak pipeline, ActionLock,
  hasar/Fire/Poison/3-5 katsayı ve spread) DOKUNULMADI.
- Testler: **284 → 306** (22 yeni). Ana test 106/106; `dist/preview.html` md5
  DEĞİŞMEDİ.

## P1.4 — Manual Combat Feel V1 (22 Ağu 2026)
- **İKİ FAZLI COMBAT: CAST ≠ IMPACT.** Hasar artık skill'e basıldığı an DEĞİL,
  okun hedefe ULAŞTIĞI an uygulanır. Cast kabulünde yalnız mana + individual
  cooldown + ActionLock + animasyon commit edilir; hedefin HP'si değişmez, DoT
  eklenmez, kill/loot oluşmaz.
  `t=0.00 cast → t=0.20 release → t≈0.53 impact` (mesafe 300, hız 900).
- **`world/CombatPipeline.ts` (YENİ):** `PendingCast` → `Projectile` → impact
  zamanlaması. Renderer'sız, **world koordinatlı** (canvas/ekran değeri girmez),
  ileride 3D renderer ile de kullanılabilir.
- **Formüller İKİNCİ KEZ YAZILMADI, `src/` DEĞİŞMEDİ.** `SkillSystem.useByRef()`
  atomik olduğu için effect'ler cast anında hedefin bir SNAPSHOT stand-in'ine
  (`payloadProxy`) çözülür; sonuç okun içinde taşınır ve impact anında gerçek
  hedefe uygulanır. Mana/cooldown/seviye/silah/damageRoll/elemental/DoT hepsi
  ana sistemden gelir.
- **Release delay 0.20 s** — individual cooldown DEĞİL, Action Time DEĞİL; ayrı
  bir combat timing alanı. Gerçek `releaseFrame` / 3D BowSocket event'i geldiğinde
  `releaseDelayFor()` tek değişecek yerdir.
- **Projectile speed 900 birim/sn** (DEV: 700 / 900 / 1200 / 1500). Ölçülen
  toplam gecikme: 100 → 0.311s · 200 → 0.422s · 300 → 0.533s · 335 → 0.572s.
- **Attack Move A/B/C** (DEV: %0 / %60 / %100, varsayılan **%60**). ActionLock
  aktifken hareket hızına çarpan uygulanır; joystick girdisi KAYBOLMAZ ve
  `movementFacing` %0'da bile joystick yönünü izler → saldırı bitince karakter
  GÜNCEL yöne döner. Ölçüldü: 0 / 63.0 / 105.0 birim (%0 / %60 / %100).
- **Ateş:** cast anında hasar yok; impact'te fiziksel + ateş AYNI anda.
  **Zehir:** cast anında status yok; DoT impact'te başlar, ilk tick +1.003 s.
  Stack/refresh davranışı DEĞİŞMEDİ, yalnız başlangıç zamanı taşındı.
- **3/5 okları gerçekten uçuyor:** her ok kendi impact'ini üretir, ıskalar menzil
  sonuna kadar uçar ve hasar vermez. Geometri P1.3.1 ile birebir aynı
  (3'lü ±5°, 5'li ±8°; Small r26: 3'lü 100/200 → 3/3, 300/335 → 1/3).
- **Hedef impact'ten önce ölürse:** kalan oklar `impactInvalid = targetDead`;
  HP mutasyonu, DoT, ikinci kill ve ikinci loot YOK. `resolveKill` mob başına
  bir kez. Mana/cooldown iade EDİLMEZ.
- **Genie ve manuel TEK pipeline** kullanır — Genie de artık gecikmeli impact
  üretir (eskiden anında hasar verirdi). Genie karar mantığı DEĞİŞMEDİ,
  auto movement YOK.
- **ActionLock impact beklemez:** Üçlü action 0.70s / impact 0.571s,
  Kara Takip action 0.90s / impact 0.572s — iki state birbirinden bağımsız.
- **Menzil geri bildirimi:** hedef 340'ın dışındaysa cast reddedilir, oyuncu
  otomatik yaklaşmaz ("Menzil dışı"). Otomatik yaklaşma P1.5'in işi.
- **DEV telemetrisi (§18):** son cast için mesafe/ok, isabet (release),
  impact tamamlanan, cast→release, release→impact, TOPLAM gecikme, travel
  mesafe, impact hasarı ve `impactInvalid`.
- **`npm run telemetry:feel` (YENİ):** bütün P1.4 ölçümleri headless.
- **BALANCE DEĞİŞMEDİ:** P1.3/P1.3.1 katsayıları, MP, cooldown, Action Time ve
  spread açıları regresyon testiyle kilitli.
- Testler: **259 → 284** (25 yeni). Ana test 106/106; `dist/preview.html` md5
  DEĞİŞMEDİ.
- Doküman düzeltmesi: `ARCHER_BALANCE_V1.md` içindeki eski "3'lü ∓4°" satırları
  P1.3.1 canonical değeriyle (±5°) güncellendi; tarihsel karşılaştırma
  "önce ±4 / şimdi ±5" olarak ayrıldı.

## P1.3.1 — dört correctness düzeltmesi (22 Ağu 2026) — yeni sistem YOK
- **Standart Atış açılış seviyesi 3 → 1**, **Delici Ok 0 → 3.** İkisi de
  PROJECT LEGACY TUNING'dir: kaynak `skills.skill_level` değerleri (3 ve 0)
  DEĞİŞTİRİLMEDİ ve raporda ham hâliyle görünmeye devam ediyor. Ezme
  `tuning.requiredLevelOverride` alanından okunur ve `registerPrototypeSkills()`
  içinde, kayıttan SONRA uygulanır — `src/` ve generated JSON'a dokunulmadı.
  BALANCE tablosunda ezmeli satırlar `Lv*` ile işaretli.
- **Üçlü Salvo spread ±4° → ±5°.** Amaç mesafe riski açmaktı: ±4°'de isabet
  sınırı `26 / sin 4° = 372` birim, yani cast menzilinin (340) ÖTESİNDEYDİ ve
  3'lü hiçbir mesafede ok kaybetmiyordu. ±5° ile sınır **298** birime indi.
  Ölçüldü (Small Dummy r26): `100 → 3/3 · 200 → 3/3 · 295 → 3/3 · 300 → 1/3 ·
  335 → 1/3`. Beşli Salvo'nun ±8°'si DEĞİŞMEDİ.
- **Training Dummy → SONSUZ MP toggle** (varsayılan KAPALI). Mana kapısını
  KALDIRMAZ — `SkillSystem`'in gerçek mana yolu aynen çalışır; toggle yalnız
  her karede MP'yi tavana doldurur. 740 MP'lik rotasyonu MP tavanına (474)
  takılmadan ölçmek için.
- **P1.3 hasar katsayılarının hiçbirine dokunulmadı** (0.99/ok, 1.00–2.50 phys,
  ateş 0.25/0.50/0.75, zehir 0.30/0.60/0.90, menzil 340, action time) — regresyon
  testi ile korunuyor.
- Testler: **248 → 259** (11 yeni). Ana Faz 6.1 `dist/preview.html` md5 DEĞİŞMEDİ.

## P1.3 — Archer Combat Balance V1 (22 Ağu 2026)
- **`data/archer-balance.ts` (YENİ): tek data-driven balance profili.** Her alan
  `source` (KO_Reference_v8.db'den okundu) veya `tuning` (Project Legacy kararı)
  bloğundadır; ikisi karışmaz. `archer-skills.ts`, `MultiShot.ts` ve `state.ts`
  artık kendi tablolarını tutmuyor, buradan türetiyor. Scene'de/Genie'de hasar
  rakamı YOK.
- **Tek kural: `physicalCoefficient = add_damage / 100`.** Tek-oklu ve çok-oklu
  ayrımı kalktı — 3/5 salvoda bu katsayı OK BAŞINADIR.
- **KO fidelity pass — 3/5:** ok başına katsayı `0.75 / 0.62` → **`0.99 / 0.99`**
  (kaynak `add_damage = 99`). Gerçek projectile geometrisi, ∓4° / ∓8° spread ve
  ok başına hit/miss AYNEN korundu; `damage × N` tek vuruşa çevrilmedi.
  Individual cooldown 0 kaldı — 3/5 yapay cooldown ile nerflenmedi.
- **Menzil V1:** 15 Archer saldırı skillinin tamamı **340 world**. Gerekçe
  kaynakta: `skills.range_value` 15 kayıtta da 0, `magic_type2.add_range`
  14 kayıtta da 100 → kaynak menzil ayrımı üretmiyor. 340 bir TUNING değeridir.
  Genie hedef edinme yarıçapı (450) bundan ayrıdır, değişmedi.
- **Ateş:** ek anlık bonus `0.55 / 1.10 / 1.65` → **`0.25 / 0.50 / 0.75`**
  (KO `first_damage` 1 : 2 : 3 oranı; mutlak KO rakamı kullanılmadı).
- **Zehir — semantik düzeltmesi:** katsayı artık tick başına değil **TOPLAM**.
  `0.30 / 0.60 / 0.90` toplam, 4 tick'e deterministik bölünüyor
  (0.60 → 4 × 0.15). Ölçüldü: uygulanan toplam beklenenden **sapmıyor** (0).
- **Hasar bileşen telemetrisi:** `DamageBreakdown` — `physicalDamage`,
  `elementalDamage`, `totalDamage`, `dotPerTickDamage`, `dotTickCount`,
  `dotExpectedTotal`. Element tipi taşınıyor (ileride resistance bağlanabilsin).
- **Ham source alanları korunuyor:** `hit_type` (0/2), `hit_rate` (100/150/300)
  profilde saklanır ama DAVRANIŞ ÜRETMEZ. Accuracy/resistance sistemi YAZILMADI.
- **DEV → `BALANCE V1 tablosu`:** 15 satırlık MP / CD / action / range / phys /
  ok / elem / DoT / hit_type-hit_rate tablosu + son cast bileşenleri.
- **`npm run telemetry:archer` (YENİ):** headless ölçüm — Small/Boss dummy
  100/200/300/335 mesafe, 3/5 isabet oranı, rotasyon, ateş/zehir örnekleri.
- **Ölçüm bulguları (nerf YAPILMADI, raporlandı):** Üçlü küçük kuklada her
  mesafede 3/3 (∓4° sapması hitbox'ı aşmıyor); Beşli küçük kuklada 100'de 5/5,
  200+'da 3/5; Boss kuklada Beşli her mesafede 5/5. Rotasyon teorik maliyeti
  740 MP doğrulandı ama oyuncunun MP tavanı 474 → Kara Takip gerçek koşulda
  `mana` ile reddediliyor (gerçekleşen katsayı 10.42 / teorik 12.92).
- Testler: **216 → 248** (32 yeni). Ana Faz 6.1 `dist/preview.html` md5 DEĞİŞMEDİ.
- DEĞİŞMEYENLER: ActionLock, action time değerleri, Genie sequence ve setleri,
  movementFacing/combatFacing, Farm Boundary, Auto Loot, atlas pipeline, spread
  açıları, kaynak DB ve generated JSON.

## P1.2.2 — Archer Visual Integration (22 Ağu 2026)
- **Yüklenen 4 sayfa runtime atlas OLARAK BAĞLANMADI.** Doğrulama sonucu: başlık /
  tablo / lejant / referans paneli içeren *contact sheet*'ler; alfa kanalı yok,
  hücre ≈120×115 px (spec 300×300), ATTACK ve SKILL sayfalarında yön çeşitliliği
  yok. Görev şartı gereği körlemesine atlas olarak kullanılmadı, posterden kırpma
  yapılmadı. Ayrıntı: `docs/ARCHER_SHEET_REVIEW_V1.md`.
- **Atlas boru hattı asset'ten bağımsız olarak tamamlandı** (`data/archer-atlas.ts`):
  5 klip (walk 8 / attack 6 / skill 6 / idle 1 / dead 1) × 8 yön, metadata-driven
  kare sayısı / fps / loop, `validateAtlasMeta()` ile metadata doğrulama.
- **Yön eşlemesi açık tablo** (`RUNTIME_INDEX_TO_ATLAS_ROW = [2,3,4,5,6,7,0,1]`),
  formülle türetilmiyor. `atlasRowForAngle()` tek giriş noktası.
- **Gerçek walk klibi** devrede: hareket artık walk karelerini oynatıyor.
  Atlas aktifken **sahte hop / bob / sway / squash / gölge nabzı = 0** (spec §8).
  Efektler silinmedi, kapıya alındı — atlas yokken P1.2.1 fallback aynen çalışır.
- **Foot anchor korundu:** `footAnchorY = 264` → altta 36 px pay, legacy
  `OKCU_FOOT_PAD` ile birebir aynı. Ayak zeminden kopmuyor.
- **Facing ikiye ayrıldı:** `movementFacing` (joystick) / `combatFacing` (hedef).
  Saldırı boyunca combat facing öncelikli; saldırı bitince movement facing geri
  gelir (arka planda güncellendiği için eski yöne takılmıyor).
- **Klip kararı sourceRef ile:** `102003 Standart Atış → ATTACK`, diğer 14 skill
  → `SKILL`. "Basic mi skill mi" sorgusu kullanılmıyor. Genie de aynı kapıdan
  geçiyor (`applyAnimFor` artık `skillRef` okuyor).
- **Ölüm çapası:** ilk ölüm karesinde world konumu donduruluyor; yatan sprite
  farklı ölçüde olsa bile karakter yer değiştirmiyor.
- **FX çift gösterim koruması:** karakter atlası element-nötr; `releaseFrame` /
  `contactFrames` metadata'da null iken runtime hiçbir şey tahmin etmiyor.
- **DEV → `Archer atlas modu`** (varsayılan KAPALI): gerçek atlas yoksa runtime'da
  ÇİZİLEN, `DEBUG` damgalı yer tutucu üretir. Bundle'a bayt eklemez, posterden
  kırpılmamıştır, sanat varlığı değildir. Gerçek `archer_*` anahtarları manifeste
  girdiği an onlar kullanılır.
- Testler: **187 → 216** (29 yeni). Ana Faz 6.1 `dist/preview.html` md5 DEĞİŞMEDİ.
- Açık kalan karar: walk kare seçimi zaman-kilitli (varsayılan, spec fps 10) mi
  mesafe-kilitli mi — gerçek sanat ölçülmeden kapatılmayacak.

## P1.2.1 — iki correctness düzeltmesi (22 Ağu 2026) — yeni özellik YOK
- **Genie varsayılan set modları: üçü de `sequence`.** `priority` modu sistemden
  KALDIRILMADI; oyuncu ayar ekranından set başına seçebilir (davranışı test ile
  korunuyor). Kabul edilen rotasyonlar doğrulandı:
  Set 2 `Delici → İzci → Standart → wrap`,
  Set 3 `Kara Takip → Gölge Avcısı → Yırtıcı → Beşli → Üçlü → wrap`.
  Bir entry CD/mana/menzil sebebiyle kullanılamıyorsa mevcut sequence tarama
  davranışı geçerli (sonraki seçili entry denenir, cursor onun ardına gider).
- **Delici Ok (Through Shot 107500): kaynakta olmayan savunma debuff'ı kaldırıldı.**
  `targetDebuff defense ×0.6 / 5 sn` silindi; skill artık yalnız kaynak
  `magic_type2` davranışını temsil ediyor: `directDamage 1.50` (= add_damage %150).
  İçerik açıklamasındaki "savunmasını 5 saniye düşürür" ifadesi de kaldırıldı
  (`content_overrides.json` → yeniden import).
  **Ana oyuna DOKUNULMADI:** aynı debuff `SKILL_BEHAVIORS` içinde duruyor ve orada
  `targetDebuff` ailesinin tek kullanıcısı (ana test paketi onu kullanıyor).
  Sapma koda not olarak işaretlendi; ana oyundan kaldırma ayrı bir karar.
- Fire/Poison ek hasarı ve 3/5 ok katsayılarına DOKUNULMADI; belgede "canonical
  balance DEĞİL, ayrı damage/balance görevinde ele alınacak" olarak açık kaldı.
- `docs/ARCHER_RUNTIME_GAP.md`'ye TODO eklendi: atlaslar geldiğinde Standart Atış
  `archer_attack`, diğer 14 skill `archer_skill` kullanacak; `archer_skill`
  element-nötr olmalı. **Runtime animasyonu şu an DEĞİŞTİRİLMEDİ.**
- Archer atlasları entegre EDİLMEDİ.
- Testler: prototip 177 → **187**. Ana paket 106/106 (değişmedi).

## PROJE YÖNÜ KARARI + ARCHER COMBAT V1 (22 Ağu 2026)
**Yön kararı (canonical):** Eternal Hero benzeri sabit 3/4 kamera + portrait +
360° joystick artık ANA oyun yönüdür (`docs/PROJECT_DIRECTION.md`). KO ruhu korunur:
target combat, skill combat, 3/5 ok, mob slot/farm, Genie, drop, upgrade, equipment.
Jump/roll/dodge/manuel kamera YOK. Ana Faz 6.1 bozulmadı, Faz 7'ye geçilmedi.

**İki kaynak belirsizliği çözüldü** (docs/CONTENT_MAPPING.md):
- `skills.recast_time` → **desisaniye** (`/10 = sn`). 6 bağımsız kayıt doğruladı.
- `magic_type2.add_damage` → **hasar yüzdesi**; kaynağın kendi açıklama metni
  ("Inflict 150% / 200% / 250% damage") 5 kayıtta doğruladı.
Kaynak DB değişmedi; ana oyunun `SKILL_BEHAVIORS` cooldown değerleri de bilerek
değiştirilmedi (Faz 6.1 dengesi korunsun diye) — yalnız yorum notu eklendi.

**ARCHER COMBAT V1** (`docs/ARCHER_COMBAT_V1.md`, prototip katmanı):
- **15 okçu skilli** import edildi (whitelist + Türkçe override). Kaynak ID'ler
  sorgulandı, tahmin edilmedi. `Dark pursuer` 1075 dalında yok → 1085'ten **108570**.
- **Normal atış artık gerçek bir skill**: "Standart Atış" (Archery 102003, 0 MP,
  1 projectile, CD 0). Ayrı Basic Attack düğmesi ve **Genie fallback'i KALDIRILDI**.
  Seçili skiller kullanılamıyorsa Genie BEKLER; gizli saldırı üretmez.
- **Individual cooldown KAYNAKTAN türetiliyor** (`recast_time/10`), kodda sabit yok.
  recast=0 skillere yapay 3/5/7 sn eklenmiyor; 3.2s/4.2s olanlar korunuyor.
- **ACTION LOCK** (`world/ActionLock.ts`) — cooldown'dan AYRI attack recovery.
  Mana/cooldown kapısından ÖNCE gelir → reddedilen cast mana harcamaz. P1.1'in
  "Genie 1 saniyede her şeyi boşaltıyor" problemi kapandı (test: 1 sn'de ≤ 2 cast).
- **`ArcherCombatTimingProfile`** (`data/archer-timing.ts`) — 15 skill için action
  time; skill JSON'una YAZILMADI, ayrı tuning katmanı. Genie karar tiki 0.25 → 0.10.
- **Aktif bar 5 slot** + 15 skillik **skill kitabı** (Ayarlar → Aktif Bar sekmesi).
  `SkillLoadout` slot sayısı parametrik yapıldı — ADDITIVE, ana oyun hâlâ 3 slot.
- **Cooldown UI ayrıldı**: gerçek CD'de perde + kalan saniye; recast=0 skillerde
  sahte perde YOK; action recovery ayrı ACTION çubuğu + ikon alt kenarı.
- Varsayılan Genie setleri güncellendi (Set 1 = yalnız Beşli + Üçlü Salvo).
- Prototip başlangıç seviyesi 55 → **70** (Kara Takip'in kaynak şartı).
- Testler: prototip 154 → **177**. Ana paket 106/106. Basic-fallback davranışını
  test eden 3 eski test, yeni kurala göre GÜNCELLENDİ (silinmedi).

## ARCHER ANIMATION ASSET SPEC V1 — hazırlık (22 Ağu 2026) — ENTEGRASYON YOK
Kullanıcının yüklediği master spec poster'ı **runtime asset olarak kullanılmadı**;
posterden kırpma yapılmadı. Gerçek atlaslar henüz teslim edilmediği için **hiçbir
runtime kodu değiştirilmedi** — P1.1.4 preview'ü ve ana Faz 6.1 aynen duruyor.
Üretilenler yalnız belge + araç:
- `docs/ARCHER_ANIMATION_SPEC.md` — normatif standart: 5 atlas
  (`archer_walk/attack/skill/idle/dead`), sabit direction row sırası (BACK=0 …
  BACK_LEFT=7), walk 8×8 / attack 8×6 / skill 8×6 / idle 8×1 / dead 8×1,
  300×300 kare, `(150,264)` foot anchor, WebP runtime + lossless PNG kaynak,
  renderer'ın hop/bob/bounce/squash uygulamaması, sanatçı teslim kontrol listesi.
  Runtime yön sırası atlas sırasından farklı olduğu için **açık eşleme tablosu**
  belgelendi (runtime index +2 mod 8 → atlas row; formül değil tablo kullanılacak).
- `docs/schema/archer_animation.schema.json` + `archer_animation.example.json` —
  metadata sözleşmesi. `releaseFrame: null` ise runtime projectile timing'i TAHMİN
  ETMEZ. Spec'e ek olarak opsiyonel `contactFrames` / `pivotOverrides` / izlenebilirlik
  alanları önerildi (verilmezse ilgili efekt üretilmez, tahmin edilmez).
- `tools/validate-archer-sprites.mjs` + `npm run validate:archer` — bağımlılıksız
  sprite validator. PNG çözümü `node:zlib` ile elle yazıldı (registry 403).
  Doğrulama **lossless PNG kaynak** üzerinde çalışır (spec §12). Kontroller: atlas
  boyutu, deterministik satır/sütun çıkarımı, 8 satır dolu mu, sütun sayısı, alfa
  kanalı ve gerçek şeffaflık, boş kare, **pixel-identical duplicate** (FAIL),
  perceptual benzerlik ve sahte döngü (A A A… / A B A B…) tespiti (WARN), bbox
  sıçraması, foot anchor tutarlılığı, `releaseFrame` doldurulmuş mu.
  **Hiçbir dosyayı silmez/değiştirmez**; asset yoksa exit 0 ile nazikçe çıkar ve bu
  yüzden ana `verify` zincirine dahil EDİLMEDİ.
  `--selftest` sentetik fikstürlerle aracın kendini doğrular: **6/6** senaryo
  (temiz / walk hepsi aynı / A B A B / boş kare / alfa yok / yanlış boyut).
  `--make-fixture` uçtan uca deneme için sentetik örnek üretir.
- `docs/ARCHER_RUNTIME_GAP.md` — mevcut `PlayerAnimator`'ın atlas sistemini karşılama
  analizi. Sonuç: mimari uyumlu. Anchor (264), facing ayrımı ve tetikleme disiplini
  ZATEN doğru; eksikler walk kare seçimi, metadata-driven kare/fps, dead/idle atlası,
  yön eşleme tablosu ve prosedürel hop/sway/squash'ın kapıya alınması.
  Ayrıca fps-kilitli oynatmada ayak kayması riski hesaplandı (8 kare @10 fps =
  döngü başına 168 birim) — karar **art ölçülmeden verilmeyecek**.
- Ana paket 106/106, prototip 154/154 aynen geçiyor; iki preview de değişmedi.

## Oyun içi gözlem düzeltmeleri — 8 yön / yürüyüş / set kilidi / uzaktan loot (22 Ağu 2026)
EXPERIMENT P1.1.1 içinde, ana yol DIŞI. Faz 6.1 ve Faz 7'ye dokunulmadı; paket
sürümü 0.6.2'de kaldı. Çıktı: `dist/preview-eternal-ko-p1-1-4.html`.
- **Kaynak tespiti:** legacy havuzunda okçunun **8 yönlü** sayfaları zaten vardı
  (manifeste yalnız `_sag` alınmıştı) + ölüm/diriliş sayfaları. **Yürüme animasyonu
  hiçbir sınıf için YOK.** Yeni sayfalar prototipe özel manifeste kondu
  (`data/proto-assets.ts`) ve `build:proto --manifest` ile yalnız prototip
  preview'ine gömülüyor → **ana preview değişmedi** (32 varlık / 2947 KB).
- **(1) "kayıyor" düzeltildi.** Adım döngüsü artık zamana değil KATEDİLEN MESAFEYE
  bağlı (`PlayerWorldState.travelled`, adım = 46 birim): zıplama + basış ezilmesi +
  gövde salınımı + gölge nabzı + ayak tozu. Engele dayanınca mesafe artmadığı için
  döngü de duruyor.
- **(2) "havada duruyor" düzeltildi.** Ölçüldü: 300 px karede içerik y≈264'te
  bitiyor → 36 px şeffaf pay. Çizim bu payı telafi ediyor (eski `py + 6` fudge'ı
  yerine ölçülmüş `OKCU_FOOT_PAD` sabiti).
- **(3) "yöne bakmıyor" düzeltildi.** `facingAngle` (radyan) eklendi: yürürken
  hareket açısı, saldırırken hedef açısı. Renderer açıyı 8 yöne yuvarlayıp doğru
  sayfayı seçiyor; `flipX` aynası artık gerekmiyor. Eski kod yalnız `mv.x` işaretine
  bakıyordu, bu yüzden dikey harekette yön değişmiyor ve saldırı onu ters
  çevirebiliyordu.
- **(4) "seçtiğim skilleri atmıyor" düzeltildi.** Sebep: aktif set mesafeye/elite
  göre OTOMATİK değişiyordu. `GenieSettings.forcedSet` eklendi —
  `Aktif Set: OTOMATİK / SET 1 / SET 2 / SET 3`. Kilitliyken `chooseSet()` mesafe ve
  elit durumunu tamamen göz ardı eder. Setler sekmesinde kilitli set KİLİT, canlı
  set `aktif` etiketiyle işaretleniyor.
- **(5) "kutuyu almak için üstünden geçmek gerekiyor" düzeltildi.** `autoRadius`
  eklendi (90 / 300 / **600 varsayılan** / 1200). AUTO modda bu yarıçaptaki loot,
  mob nerede ölürse ölsün doğrudan çantaya girer; oyuncu yürütülmez, item alındığı
  yerden oyuncuya uçarak çizilir. Yarıçap bir SINIRDIR; çanta doluysa item yerde
  kalır; Genie STOP olunca auto loot da durur.
- `tools/build.mjs` + `tools/pack-preview.mjs` artık `--manifest` ile EK varlık
  manifesti kabul ediyor (ana çağrıda verilmiyor → ana çıktı etkilenmiyor).
- Testler: prototip 133 → **154** (21 yeni: 5 yürüyüş, 1 ayak hizası, 5 sekiz yön,
  4 set kilidi, 6 uzaktan loot). Ana paket 106/106 aynı.
- Ölçüm: 60.0 FPS, JS heap 10 MB.

## P1.1.1 — gözlemsel düzeltmeler: anim state / menzil ayrımı / auto loot (22 Ağu 2026)
Ana yol DIŞI. Faz 6.1 ve Faz 7'ye dokunulmadı; paket sürümü 0.6.2'de kaldı
(çıktı adı → `dist/preview-eternal-ko-p1-1-3.html`).
- **KRİTİK anim hatası düzeltildi.** Prototip sahnesi oyuncunun sprite karesini
  doğrudan `world.moving`'e bağlıyordu; `gt_okcu_y_sag` ise bir OK ATMA sheet'idir
  (ana oyunun CombatScene'i onu doğru kullanıyor). Sonuç: yürürken, hiç saldırmadan
  ve Genie kapalıyken bile karakter sürekli ok atıyordu. Artık `PlayerAnimator`
  (renderer'sız durum makinesi) var: `idle` / `move` / `attack` / `skill` / `dead`.
  idle+move DAİMA duruş karesi + hafif locomotion (bob/eğim) yaklaşıklaması; saldırı
  sheet'i YALNIZ saldırıda, bir kez oynar. Tetik gameplay SONUCUNDAN gelir
  (`PrototypeState.performBasic/performSkill/applyAnimFor`) — Scene ve Genie aynı
  kapıyı kullanır, başarısız/menzil dışı deneme animasyon üretmez.
- **Genie menzili ikiye ayrıldı.** (A) `Attack Range` artık OYUNCU merkezlidir ve
  onunla hareket eder — *target acquisition* menzilidir, skill menzili değildir
  (250/350/450/550/650, varsayılan 450). (B) `Farm Boundary` BAŞLAT konumunda sabit
  kalır (350/500/650/800/1000, varsayılan 650) ve `Farm Alanı: Açık/Kapalı` +
  `Farm Alanını Göster: Açık/Kapalı` ile yönetilir. Görsel olarak ayrıştırıldı:
  hareketli mavi sık noktalı halka = Attack Range, sabit turuncu kesikli halka =
  Farm Boundary. Yeni API: `inAttackRange` / `inFarmBoundary` / `canTarget`.
  Auto Movement geldiğinde boundary hard limit olarak kullanılacak.
- **P1.1'den kalan hata:** geçersizleşen hedef (ölü / menzil dışı / sınır dışı)
  `targets.clear()` edilmiyordu; Genie stale hedefte takılı kalıyordu. Düzeltildi.
  DURDUR davranışı DEĞİŞMEDİ (mevcut hedefi korur).
- **Auto Loot V0** (`world/LootPolicy.ts`): `mode: manual | auto`. Auto yalnız
  oyuncunun GERÇEK `lootPickupRadius`'una giren lootu alır — teleport yok, karakteri
  yürütmez. Çanta doluysa item yerde kalır ve `Çanta dolu` bildirimi verilir.
  Tick başına en fazla 3 item (bounded), aynı loot iki kez alınamaz. **Auto Loot
  Genie'nin alt özelliğidir: Genie DURDUR olduğunda o da durur.** Auto-sell / rarity
  filtresi / whitelist / blacklist BİLEREK yapılmadı — sonraki sürümde bu policy'nin
  üzerine gelecek.
- DEV paneli: `Attack range (oyuncu)`, `Farm boundary`, `Loot: AUTO/MANUAL`,
  `Ground Loot`, `Anim state` satırları eklendi.
- Testler: prototip 108 → **133** (25 yeni: 8 animasyon, 7 menzil, 10 auto loot).
  Ana paket 106/106 aynı; önceki P1 / P1.1 / P1.1.1 / kukla testleri silinmedi.
- Tarayıcı kabul testleri geçti: yürüyüş karelerinde ok atma yok; 450'lik halka
  karakterle hareket ederken 650'lik farm halkası yerinde kaldı; MANUAL'de yerde
  kalan 4 ganimet AUTO'ya geçince toplandı, uzaktaki 1 ganimet yerde kaldı.
- Ölçüm: 59.9 FPS, JS heap 10 MB.

## HASAR KUKLASI / Training Dummy (22 Ağu 2026) — EXPERIMENT P1.1.1 içinde, ana yol DIŞI
3/5 ok kombolarını uzun süre ölçebilmek için prototip haritasına ölmeyen test hedefi
eklendi. **Ana Faz 6.1'e kukla EKLENMEDİ**; Faz 7'ye geçilmedi. Paket sürümü 0.6.2'de
kaldı (yalnız `experiments/` ve `build:proto` çıktı adı etkilendi →
`dist/preview-eternal-ko-p1-1-2.html`).
- **`TrainingDummySystem`** — kuklalar `MobSlotSystem`'e girmez (AI/aggro/leash/respawn/
  loot oraya bağlıdır). `PrototypeState.entities()` normal mobları ve kuklaları tek
  listede birleştirir; hedefleme, menzil, MultiShot ve ana CombatSystem/SkillSystem
  bu listeyi kullandığı için kukla **özel durum kodu olmadan** normal hasar alır.
- Kukla: hareket etmez, saldırmaz, aggro olmaz, leash/respawn yok, loot/EXP/coin yok;
  Genie ve manuel target seçimiyle hedeflenebilir. `maxHp = 10.000.000` +
  `infiniteHealth`: hasar normal hesaplanır ve telemetriye yazılır, kare sonunda
  `sustain()` canı geri doldurur — kukla yalnız HP yüzünden ölmez.
- **Test alanı** `(830, 1650)` r300 — spawn'ın 410 birim batısında, yol üzerinde;
  koridor boyunca en yakın engele 262 birim boşluk (doğrulandı). İki kukla yaklaşma
  hattına dik: **Küçük Kukla** (830, 1550) r26 ve **Boss Kukla** (830, 1750) r60.
  Aralarındaki tek mekanik fark hitbox'tır (savunma/can/tier aynı).
- **DEV: `Dummy Combat Radius`** 18 / 26 / 40 / 60 arasında döner (Küçük Kukla'ya
  uygulanır, Boss 60'ta sabit) → aynı kuklada küçük mob ↔ boss hitbox karşılaştırması.
- **Test paneli**: Son Skill, Mesafe, Projectile (hedef/atılan), Son Vuruş Hasarı,
  Toplam Hasar, Son 10 sn Hasar, DPS, Toplam Cast, Toplam Projectile, Hedefe İsabet,
  Yan İsabet + `Ok Yağmuru | 5/5 | 612 hasar` özeti. Zaman kaynağı `dt` birikimi
  (`Date.now()` yok) → deterministik test edilebilir.
- **`[ RESET STATS ]`** yalnız telemetriyi sıfırlar; oyuncu HP/MP'si, envanter, coin
  ve Genie ayarları korunur (test ile doğrulandı).
- Genie kuklada Set 1 `sequence` rotasyonunu kesintisiz çalıştırır (kukla ölmediği için
  combo yarıda kesilmez); Attack Range ve Auto Burst Range kuralları aynen geçerlidir.
- Testler: prototip 89 → **108** (19 yeni kukla regresyonu). Ana paket 106/106 aynı;
  P1 / P1.1 / P1.1.1 testlerinin hiçbiri silinmedi.
- Ölçüm: kukla + Genie + rays + test paneli açıkken **60.1 FPS**, JS heap 10 MB.

## EXPERIMENT P1.1.1 — Genie/Multishot correctness (22 Ağu 2026) — ana yol DIŞI
Yeni özellik yok; P1.1 incelemesinden çıkan doğruluk düzeltmeleri. Ana Faz 6.1 ve
Faz 7'ye dokunulmadı; paket sürümü **0.6.2'de kaldı** (ana oyun kodu/verisi değişmedi,
yalnız `experiments/` ve `build:proto` çıktı adı etkilendi).
- **Genie skill set execution mode.** Set başına `priority` | `sequence` seçilebiliyor.
  `sequence`'te set için runtime cursor tutulur; başarılı cast'te cursor bir sonraki
  entry'ye ilerler ve wrap eder — böylece listedeki **duplicate skill gerçek bir combo
  adımı** olur (P1.1'de her tik index 0'dan tarandığı için ikinci kopyaya sıra
  gelmiyordu). Sonsuz bekleme yok: cursor'dan itibaren **en fazla bir tam tur**
  taranır, sonra temel saldırıya düşülür ve cursor değişmez.
  Varsayılan: Set 1 `sequence`, Set 2/3 `priority`. Ayar ekranından değiştirilebilir.
  Cursor politikası: **BAŞLAT sıfırlar**, DURDUR korur, set değişiminde her setin
  kendi cursor'u korunur, mod değişiminde sıfırlanır.
- **Multi-shot hedef telemetrisi.** `hitCount` "herhangi bir moba çarpan ok" demekti ve
  seçili hedefteki 3/5'i yanıltabiliyordu. Eklendi: `totalProjectileCount`,
  `targetHitCount`, `sideHitCount`, `targetDamage`, `sideDamage` (+ ışın başına
  `onTarget`). `hitCount`/`total` geriye dönük uyumluluk için korundu ama UI artık
  hedefi esas alıyor: `Ok Yağmuru: hedef 3/5 | yan isabet 1 | hedef 184 | toplam 231`.
- **`collisionMode` prototip seçeneği.** V8 DB yalnız `need_arrow = 3/5`'i doğruluyor;
  okların başka mob tarafından intercept edilmesi doğrulanmış değil. `targetOnly`
  (yalnız seçili hedef test edilir) ve `firstMobAlongRay` (P1.1 davranışı) eklendi.
  **Default `targetOnly`** — doğrulanmamış davranış varsayılan olmasın ve hedef isabet
  ölçümü kirlenmesin diye. Nihai karar açık; DEV panelinden anlık değiştirilebiliyor.
- **Kaynak semantik düzeltmesi (belge).** `magic_type2.add_damage = 99` artık "ok başına
  %99 tam hasar / 5× total" gibi kesin bilgi olarak yazılmıyor: alanın hasar semantiği
  bu projede doğrulanmadığı için damage coefficient'te kullanılmadığı belirtiliyor.
  `need_arrow = 3/5` doğrulanmış kaynak veri olarak kalıyor.
- Testler: prototip 69 → **89** (20 yeni; 12 sequence, 3 hedef telemetrisi,
  5 collisionMode). Ana paket 106/106 aynı, P1/P1.1 testleri silinmedi.
- Kamera, joystick, hareket, Genie hedefleme/farm merkezi ve potion davranışı
  değişmedi.

## EXPERIMENT P1.1 — Genie V0 + 3/5 ok combosu (22 Ağu 2026) — ana yol DIŞI
Faz 7'ye geçilmedi, ana Faz 6.1 oynanışı değişmedi. Paket sürümü 0.6.1 → **0.6.2**
(yalnız veri + araç değişikliği yansıtılıyor).
- **3/5 ok geometrik yayılım** (`world/MultiShot.ts`): `damage × N` tek vuruş YOK,
  yüzde tablosu YOK. Her ok gerçek bir doğru; isabet, okun hedefin world-space
  `combatRadius`'unu kesmesiyle bulunur → yakında 5/5, uzakta doğal 4/5, 3/5, 2/5.
  Mana + cooldown cast başına BİR KEZ (ana `SkillSystem`), her isabet için ana
  `CombatSystem.damageRoll()` ayrı çağrılır.
- **Ok sayısı KAYNAKTAN**: `magic_type2.need_arrow` → 107515 = 3, 107555 = 5
  ("Shoot 3/5 arrows at once"). `manaCost` / `requiredLevel` `skills.json`'da
  authoritative kalır (40 MP/Sv15 ve 150 MP/Sv55).
- **Monster hitbox** (`world/hitbox.ts`) sprite genişliğinden ayrı gameplay değeri;
  seviye + elit kademesi ile büyür, 3/5 isabetini doğrudan etkiler.
- **GENIE V0** (`world/GenieSystem.ts`): BAŞLAT/DURDUR/AYARLAR; BAŞLAT'ta farm merkezi
  kilitlenir (harita boyunca kovalama yok), DURDUR mevcut hedefi silmez. Attack Range,
  hedef önceliği (Nearest/Lowest HP/Elite), HP/MP iksir eşikleri, Auto Burst Range ve
  3 skill seti (4-6 skill, **tekrar serbest**) ayarlanabilir. Genie hiçbir skill kuralını
  kendi hesaplamaz; cooldown/mana/seviye/silah/menzil ana SkillSystem'den gelir.
  **V0'da otomatik hareket YOK** — joystick ve kamera oyuncuda kalır.
- **Görsel oklar** (`world/Projectiles.ts`), isabet/ıska ayrımı ve opsiyonel
  `Show projectile rays` debug katmanı — gameplay çarpışmasından tamamen bağımsız.
- **DEV paneli**: Genie durumu, farm merkezi, attack/burst range, hedef, mesafe,
  aktif set, son eylem, son çok-ok sonucu, uçan ok sayısı.
- **P1 incelemesinden gelen iki düzeltme**: `MobSlotSystem.populate()` artık sınırlı ve
  deterministik (tüm `monsterRefs` geçersizken sonsuz döngü yok, `{spawned, failed}` döner);
  `respawn()` eski `attackTimer`'ı taşımıyor. İkisi için de regresyon testi eklendi.
- Ana projeye **yalnız veri** eklendi: import whitelist'ine 107515/107555 ve
  `content_overrides.json`'a Türkçe ad/açıklama. Ana oyunun `SKILL_BEHAVIORS` listesi
  bu ID'leri tanımıyor → oynanış aynı. `SkillRegistry.registerBehavior()` deneyler için
  additive API olarak eklendi.
- Testler: prototip 26 → **69** (43 yeni, tamamı renderer'sız). Ana paket 106/106 aynı.
- Ölçüm: headless Chromium'da Genie AÇIK + rays AÇIK **60.1 FPS**, JS heap 10 MB.

## EXPERIMENT P1 — Eternal Hero × KO prototipi (21 Ağu 2026) — ana yol DIŞI
Ana sürüm numarası **değişmedi** (0.6.1). Bu bir deneydir, tasarım kararı değildir ve
`experiments/eternal-ko-prototype/` altında izoledir; klasör silinirse ana oyun etkilenmez.
- Yeni sistemler: `WorldMovementSystem`, `WorldCameraController`, `WorldTargetSystem`,
  `MobSlotSystem`, `WorldCombatAdapter`, `WorldLootSystem`, `CombatRangeProfile`.
  Hepsi renderer'sız test edilebilir; `WorldPrototypeScene` yalnız girdi + çizim yapar.
- Sabit 3/4 kamera (manuel döndürme/pinch yok), clamp'li look-ahead, hafif hedef framing;
  360° joystick hareketi (jump/dash/dodge yok); 2.5D projeksiyon yalnız render katmanında.
- KO tarzı iki mob slotu (data-driven spawn/respawn/leash/aggro), idle→chase→attack→return AI.
- Combat/skill/loot/stat sistemleri ana oyundan AYNEN kullanıldı; formüller tekrar yazılmadı.
- Prototip kendi state'ini kurar, **kayıt yazmaz** — save şeması v2'de kaldı.
- Ortak kodda tek dokunuş: `tools/build.mjs` + `tools/pack-preview.mjs` argüman kabul ediyor
  (varsayılanlar aynı; ana build/preview davranışı değişmedi).
- Yeni scriptler: `build:proto`, `test:proto`, `typecheck:proto`, `verify:proto`.
- Prototip testleri: 26 (ana paketin 106 testi ayrı ve bozulmadı).

## 0.6.1 — Faz 6.1 hardening (21 Ağu 2026)
- **Consumable atomikliği + kilitli item açığı kapatıldı.** Eskiden effect'ler uygulanıp
  sonra `remove()` çağrılıyordu; kilitli iksirde remove reddedilince iksir tükenmeden
  HP/MP veriyordu (sınırsız kaynak). Artık handler'lar saf: yalnız delta hesaplar.
  Sıra: doğrulama → saf plan → adet düşürme → delta uygulama. `ConsumeFail` içine
  `locked` (ve `empty`) eklendi; MVP politikası **kilitli tüketilebilir kullanılamaz**.
  Başarısız kullanımda HP, MP ve adet değişmiyor. `InventoryState`'e domain API'si
  eklendi: `canConsume()` + atomik `consume()`; `ConsumableSystem.canUse()` UI'ın
  kuralı kopyalamadan buton kilitlemesine izin veriyor.
- **İki aşamalı save restore.** `restoreProfile()` (StateRestore.ts) sırayı tek yerde
  tutuyor: progression (level/exp/coins) → envanter/ekipman/kapasite → vitals (HP/MP).
  Böylece ekipman doğrulaması KAYITLI seviyeyle yapılıyor ve HP/MP clamp'i ekipmandan
  gelen maxHp/maxMp bonusları hesaba katıldıktan sonra oluyor. `PlayerState` API'si
  `restoreProgression()` / `restoreVitals()` olarak ayrıldı; `restore()` yalnız newGame
  ve testler için kısayol olarak kaldı. GameState sırayı kopyalamıyor.
- **Player alanları normalize ediliyor:** level finite tamsayı ve 1..maxLevel aralığında,
  exp/coins finite ve negatif değil, hp/mp finite (NaN → tam dolu, negatif → 0).
  Anti-cheat değil, corruption dayanıklılığı olarak belgelendi.
- **README lockfile notu düzeltildi:** tam sürüm pinlerinin yalnız doğrudan bağımlılıkları
  sabitlediği, geçişli ağacın lockfile olmadan deterministik olmadığı açıkça yazıldı;
  registry erişimi olan ilk ortamda `package-lock.json` üretip `npm ci` kullanma önerisi eklendi.
- Testler 94 → 106 (consumable 7, restore/normalizasyon 5).

## 0.6.0 — Faz 5.1 hardening + Faz 6 Merchant/Skills (21 Ağu 2026)

### Faz 5.1 — save & toolchain hardening
- **Restore kapasite açığı kapatıldı.** Eski akışta `InventoryState.restore()` sahte
  `equippedSlot` değerlerine güvenip o entry'leri kapasiteden saymıyordu; ardından
  `EquipmentState.restore()` bayrakları temizleyince çanta 60'ı aşabiliyordu. Artık:
  inventory restore TÜM bayrakları null'lar (otorite equipment map'i), equipment restore
  doğrulanmış map'i işaretler, sonda `enforceCapacity()` fazlalığı deterministik olarak
  düşürür. Sıra + final normalizasyon yeni `systems/StateRestore.ts` içinde; UI'da değil.
  Zincir sonunda `usedSlots <= capacity` garanti ve `invariantOk` ile raporlanıyor.
- **Restore artık normal equip kurallarını uyguluyor:** slot tipi, sınıf, silah türü ve
  seviye. Kurallar `validateEquipCandidate()` saf fonksiyonuna çıkarıldı; `canEquip()`
  ve `restore()` aynı kaynağı kullanıyor (kopya kural yok). Reddedilen item çantada kalıyor.
- **ZIP/toolchain iddiası düzeltildi (Seçenek B).** Bağımsız review'da `npm run verify`
  temiz klasörde `tsx: not found` ile duruyordu. ZIP artık `node_modules` içermiyor
  (vendor edilen esbuild/@types kaldırıldı → ~11 MB tasarruf); README'de hangi kapının
  `npm install` olmadan çalışıp çalışmadığı tablo halinde, sonuçların alındığı ortam ve
  komut ise "Doğrulama raporu" bölümünde yazılı. Yanlış "offline verify" ifadesi silindi.

### Faz 6 — Merchant Economy + SkillsScene
- `EconomyProfile`: buyMultiplier/sellMultiplier/minSellPrice; kaynak buy_price
  authoritative, kaynak sell_price 0 olduğu için satış türetiliyor. Kaynak JSON değişmiyor.
- `MerchantSystem`: teklifler `merchants.json`dan, fiyat EconomyProfile'dan. Atomik
  transaction — alışta coin düşmeden önce kapasite doğrulanıyor, kısmi ekleme olursa
  coin iade + rollback; satışta item silinmeden coin verilmiyor. Kilitli ve kuşanılı
  item satılamıyor; stackable alım açık yığına biniyor (çanta doluyken de mümkün).
- `InventoryState`: `hasOpenStack()` ve rollback için `removeByRef()` eklendi.
- `MerchantScene`: tek ekran, scroll yok — sayfalı liste (7 satır), İksirci/Levazımcı
  sekmeleri, Satın Al/Sat modu, miktar −/+/Tümü, coin ve kapasite göstergesi, iksirlerde
  etki özeti. Hub'a "Tüccar" düğmesi eklendi.
- `ConsumableSystem` + `data/consumable-behaviors.ts`: iksir etkileri veri tablosunda,
  `restoreHp/restoreMp/cure` handler'larıyla çözülüyor (item ID switch yok). Etkisi
  olmayan kullanım adedi harcamıyor. Combat hotbar Faz 7'ye bırakıldı.
- `SkillCatalog` (`skillCatalog()` + `assignSkill()`): Skills UI'ının tek sistem API'si;
  kilit durumu ve atama kuralları burada, Scene'de değil.
- `SkillsScene`: 3 aktif slot + yetenek havuzu (gerekli seviye, mana, atanmış slot),
  kilitli skiller görünür ama atanamaz, slot boşaltma. Alt navdaki "Yetenekler" ikonu
  gerçek sahneye bağlandı.
- İçerik: 24 levazımcı item'ine Türkçe override yazıldı.
- **Save şeması v2'de kaldı** — merchant/skills durumu zaten inventory+coin+loadout
  üzerinden kaydediliyor; sırf faz numarası için sürüm yükseltilmedi. Faz 5 (v2) ve
  Faz 4 (v1) kayıtları açılmaya devam ediyor (tarayıcıda doğrulandı).
- Testler 64 → 94 (Faz 5.1: 8, Faz 6: 22).

## 0.5.0 — Faz 4.1 hardening + Faz 5 Skill System V2 (21 Ağu 2026)

### Faz 4.1 — hardening (davranış ve save uyumu korunarak)
- `EquipmentState` domain invariant'ları: `unequip()` çanta doluyken artık **sistem
  katmanında** reddediyor (`{ok:false, reason:'inventoryFull'}`); UI yalnız mesaj gösteriyor.
  `equip()` swap'ı atomik hale geldi — yeni item önce çantadan çıkıyor, yerinden edilen
  sonra çantaya dönüyor; 60/60 çantada bile kapasite ne geçici ne de final durumda aşılıyor.
- Tek instance = tek slot invariant'ı: zaten kuşanılı bir item tekrar equip edilirse
  mevcut slotu korunuyor (`alreadyEquipped`), asla ikinci slota kopyalanmıyor.
- `EquipmentState.restore()` artık doğruluyor: geçerli slot ID, envanterde var olan
  instance, duplicate instanceId yok, item-slot tipi uyumu, entry bayrağı senkronu.
  Reddedilenler `RestoreReport` ile dönüyor ve konsola uyarı düşüyor.
  `InventoryState.restore()` de bozuk girdileri (duplicate id, olmayan item, negatif adet)
  temizliyor. Belgelenmiş sınır: bu bir güvenlik doğrulaması değil, corruption dayanıklılığı.
- Toolchain yeniden üretilebilir: `package.json`'a pinli devDependencies
  (typescript 6.0.3, tsx 4.21.0, esbuild 0.27.7, @types/node 25.6.2) + `engines.node >= 22.5`,
  `npm run verify` toplu kapı. `tools/build.mjs` bundler'ı seçiyor: önce esbuild
  (devDependency), yoksa PATH'teki bun — **bun artık zorunlu değil**. README'de kurulum,
  registry 403 kısıtı, lockfile'ın neden üretilemediği ve vendor edilen paketler yazılı.
- Aksesuar whitelist'i (8 item) eklendi; küpe/kolye/kemer slotları artık test edilebilir.

### Faz 5 — Skill System V2
- `data/skill-behaviors.ts`: davranış/override katmanı. `skills.json` authoritative kalıyor —
  manaCost ve requiredLevel oradan; burada yalnız cooldownSec, targeting, weaponKinds,
  classes ve effect kompozisyonu var. Yeni sınıf eklemek veri girdisi eklemek demek.
- `SkillRegistry`: veri + davranış birleşimi; eksik/duplicate ID uyarı üretip atlanıyor,
  hiçbir durumda crash yok. `forClass()` ileriki SkillsScene için hazır.
- `SkillLoadout`: 3 aktif slot, kullanılabilir havuzdan ayrı; save'e giriyor, `setSlot()`
  aynı skilli iki slota koymuyor, geçersiz ID null'a düşüyor.
- `SkillSystem`: gereksinim zinciri (alive → level → cooldown → weapon → mana → target),
  cooldown yönetimi ve effect çözümü. Scene hiçbir kuralı hesaplamıyor; `slots()[i].blocked`
  ile hazır cevap alıp butonu kilitliyor (ör. "Sv 10").
- Effect handler registry: `directDamage`, `selfBuff`, `targetDebuff`, `heal`,
  `damageOverTime` — skill ID'ye göre if/switch zinciri YOK. DoT/debuff düşman üzerinde
  `status[]` olarak yaşıyor, `tickStatuses()` ilerletiyor, debuff `effectiveDefense()` ve
  hareket hızına gerçek zamanlı yansıyor.
- Mevcut Archer slice'ı bozulmadan taşındı (Temel Atış 1.25, Alev Oku 1.9, Rüzgar Adımı
  ×1.35/6sn). Yeni aileleri göstermek için havuza Zehirli Ok (hasar+DoT) ve Delici Atış
  (hasar+savunma debuff'ı) eklendi — varsayılan barda değiller.
- Save v2: `skills.loadout` alanı; `migrate()` zinciri v1→v2 (Faz 4 kaydı açılıyor,
  varsayılan bar atanıyor, oyuncu skillsiz kalmıyor). Tarayıcıda v1 kaydı enjekte edilerek
  doğrulandı: Sv 8 / 4242 coin korundu, kayıt v2'ye yükseldi.
- Testler 37 → 64 (Faz 4.1: 8, Faz 5: 18, mevcut 37 korundu).

## 0.3.0 — Faz 4: Inventory + Equipment + Character Power (21 Ağu 2026)
- Veri: items.json genişletildi — equipSlot (kaynak slot kodlarından eşlenerek), classCode,
  baseUpgradeLevel (isimdeki "(+N)" parse), elemental bonuslar, kindCode; slot bazlı
  varsayılan ikon eşlemesi (Legacy es_okcu seti, 10 yeni asset).
- `InventoryState` v2: instanceId/itemRef/quantity/upgradeLevel/locked/equippedSlot;
  60 slot kapasite, stackable/non-stackable ayrımı, dolu envanterde add() reddi
  (item yerde kalır, "Çanta Dolu!" uyarısı, ömür tazelenir).
- `EquipmentState`: tam 12 slot (weapon, helmet, chest, pants, gloves, boots, earring×2,
  ring×2, necklace, belt) — UI'dan bağımsız; sınıf (okçu = classCode {0,2} + yay/arbalet)
  ve seviye gereksinimi; çift slotlarda boş olana yerleşme, doluysa swap.
- `CharacterStats` + `StatCalculator`: Base + Equipment + Upgrade + Buff = Final mimarisi.
  Silah değişimi saldırıyı, zırh savunmayı, aksesuar statları gerçek zamanlı değiştirir;
  CombatSystem yalnız finalStats() kullanır (silahsızken saldırı/hasar skilleri kapalı).
- `BalanceProfile`: monsterHp/monsterDamage/playerDamage/exp/coin runtime çarpanları;
  kaynak JSON değerleri değişmez (testle doğrulanır).
- `SaveSystem`: saveVersion:1 şema + migrate() iskeleti; autosave (bölge geçişi, loot,
  equip/unequip, zafer/ölüm, nav); Boot'ta yükleme, kayıt yoksa newGame (starter yay
  kuşanılı başlar). Storage try/catch'li — kısıtlı ortamda bellek-içi yedek.
- InventoryScene (tek ekran, scroll yok): karakter görünümü + kuşanılı silah göstergesi,
  12 ekipman slotu, 10×6 grid, kapasite sayacı, seçili item paneli (isim/rarity/tip/
  statlar/gereksinim/upgrade) + takılıyla fark karşılaştırması (+yeşil/−kırmızı),
  Kuşan/Çıkar/Kilitle. Alt nav artık gerçek navigasyon: Kamp/Çanta aktif, 3 slot rezerve.
- Rarity gösterimi upgradeLevel'dan türetilir (kaynakta rarity yok — CONTENT_MAPPING.md).
- Testler 22 → 37: inventory v2 (stack/kapasite/kilit), equipment (12 slot, çift slot,
  sınıf/seviye engeli, unequip), stats (silah/zırh/upgrade çarpanı, combat etkisi),
  balance (kaynak korunumu), save round-trip + migrate.

## 0.2.0 — Teknik borç + Faz 3 Vertical Slice (21 Ağu 2026)
Teknik borç (bağımsız review bulguları):
- Input listener lifecycle: `DisposerBag` eklendi; Boot/Hub/Combat sahneleri tüm
  aboneliklerini `exit()` içinde temizliyor, yeniden girişte duplicate listener oluşmuyor
  (mock host ile test edildi). BootScene'in asset yüklemesi de yeniden girişte tekrarlanmıyor.
- Typecheck kapısı: `tsconfig.app.json` (src, Node type'sız) + `tsconfig.tools.json`
  (tools/tests, vendored @types/node) ayrımı; `npm run typecheck` ikisini de koşuyor ve
  bu zip'te node_modules/@types dahil edildiği için registry erişimi olmadan da geçiyor.

Faz 3:
- Engine: SpriteAnimator (frame/time), Tween, FxApi (floating text + particle, havuzlu/sınırlı),
  AudioApi (WebAudio synth + Null impl), paylaşılan mulberry32 RNG modülü. Hepsi arayüz
  arkasında; Phaser'a geçişte yalnız engine implementasyonu değişir.
- Sistemler: PlayerState, InventoryState, SpawnSystem, TargetSystem, CombatSystem, LootSystem —
  scene'ler yalnız orchestration/render. RNG enjekte edilebilir.
- CombatScene: Hub → bölge → savaş → ödül → Hub/devam döngüsü. Düşman sağdan doğar (zones.json
  ağırlıklı), sola yürür, kuyruk olur (yığılmaz), yalnız menzildeki vurur. Karma oynanış:
  otomatik temel saldırı + dokunarak hedef seçimi + manuel skill. Kurt sprite'ları (yürüme/
  saldırı/ölüm, sol yön satırı) tier ölçekleriyle. Loot yerde 6 sn görünür, dokununca envantere.
- HUD: HP/MP/EXP barları (sayısal değer yok), seçili hedefte isim + HP barı, sağda Saldırı +
  Temel Atış/Alev Oku/Rüzgar Adımı (mana skills.json'dan, cooldown perdesi), altta 5 ikonluk
  rezerve nav, ölüm/zafer overlay'i (Yeniden Dene / Devam Et / Kampa Dön).
- Denge kararı: KO s_ac değerleri oyuncu hasarına göre büyük olduğundan defenseFactor 0.1
  seçildi ve oyuncu saldırısı silah + seviye×2 yapıldı (config.ts'te belgeli).
- Skill import'u LIMIT'li sorgudan açık ID listesine çevrildi (107010 dışarıda kalıyordu).
- Testler 8 → 22: input lifecycle, PlayerState (EXP/mana/ölüm/retry), CombatSystem (formül,
  cooldown, mana, buff, düşman hasarı), SpawnSystem, TargetSystem, loot→inventory,
  "grup tetik ≠ üye oranı" istatistik testi.

## 0.1.0 — Faz 0-2 (21 Ağu 2026)
- Faz 0: v8.db audit — tüm sayılar README ile tutarlı; bulgular DATA_AUDIT.md'de
  (çözülmemiş 4 grup, 172 ölü item referansı, boş upgrade_probabilities, path not_decoded).
- Faz 1: proje iskeleti. npm registry 403 verdiği için brif fallback'i uygulandı:
  saf TypeScript + Canvas 2D + bun bundle (ARCHITECTURE.md). Portrait 620×1100 mantıksal
  alan, letterbox + safe-area. BootScene (asset yükleme + BAŞLA) ve HubScene (bölge
  kartları + yaratık önizleme) çalışıyor. Legacy v137'den 20 varlık taşındı.
- Faz 2: deterministik import pipeline (`npm run import`): 11 monster, 161 item whitelist,
  3 zone, 12 skill, 2 merchant, Lv1-80 eğrisi, upgrade eğrisi. content_overrides katmanı,
  validate aracı (exit 1 kalite kapısı), 8 birim test. İki kez çalıştırma byte-byte aynı
  çıktıyı üretir (md5 doğrulandı).
- Tasarım kararları CONTENT_MAPPING.md'de: sanal zone bölümlemesi, iki aşamalı grup roll,
  slot-uniform üye seçimi (kaynak tekrar ağırlığını korur), elite kademesi.
- Bilinen eksikler: combat yok (Faz 3), item override'larının çoğu placeholder,
  merchant/upgrade/skill sistemleri veri olarak hazır ama sistem katmanı yok.
