# PROJE YÖNÜ — KARAR KAYDI

**Tarih:** 22 Ağu 2026 · **Durum:** canonical (bağlayıcı)

## 1. Eternal tarzı artık ANA OYUN YÖNÜDÜR

EXPERIMENT P1 ile başlayan Eternal Hero benzeri oynanış **artık yalnız bir deney
değildir**. Bundan sonra oyunun ana gameplay/world yönü:

> Eternal Hero benzeri **sabit 3/4 kamera** + **portrait mobil** + **360° joystick
> serbest hareket**

Oyun Eternal Hero **kopyası olmayacaktır**.

## 2. Knight Online'dan korunacak temel ruh

- target tabanlı combat
- skill combat
- Archer 3/5 ok mekaniği
- mob slot / farm mantığı
- Genie
- item / drop
- upgrade
- build / stat
- equipment progression

## 3. Şimdilik YOK

- jump
- roll / dodge
- manuel kamera rotasyonu

Sabit 3/4 kamera korunur.

## 4. Mimari sonuç

Bundan sonraki geliştirmeler bu **world-space gameplay** yönüne göre kurulur.
Combat/Genie/loot sistemleri **scene-independent domain katmanında** tutulur ki
ana world gameplay'e taşınabilsin.

### Taşınmaya hazır (renderer'sız) katmanlar

| Dosya | Sorumluluk |
|---|---|
| `experiments/eternal-ko-prototype/world/ActionLock.ts` | attack recovery / action time |
| `experiments/eternal-ko-prototype/world/GenieSystem.ts` | otomatik farm kararları |
| `experiments/eternal-ko-prototype/world/MultiShot.ts` | 3/5 ok geometrisi |
| `experiments/eternal-ko-prototype/world/LootPolicy.ts` | loot politikası |
| `experiments/eternal-ko-prototype/world/PlayerAnimation.ts` | görsel durum makinesi |
| `experiments/eternal-ko-prototype/world/*System.ts` | hareket / kamera / hedef / mob slot |
| `experiments/eternal-ko-prototype/data/archer-*.ts` | skill verisi + timing profili |

`WorldPrototypeScene` **yalnız** girdi toplama + çizim yapar; kural içermez.

## 5. Ana Faz 6.1 ne olacak?

Mevcut ana oyun (Hub → CombatScene → Inventory → Merchant → Skills) **bozulmadı**
ve bozulmayacak. Yeni world gameplay olgunlaştığında geçiş ayrı bir fazda planlanır.
Bu karar kaydı, o geçişin hangi yöne olacağını sabitler.

Referans: `docs/ARCHER_COMBAT_V1.md`, `docs/ARCHER_ANIMATION_SPEC.md`.
