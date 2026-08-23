# MOB AI + FARM AREA V1 — P1.6

**Kapsam:** prototip (`experiments/eternal-ko-prototype/`). Ana oyun (Faz 6.1)
DEĞİŞMEDİ: `src/` dosyalarına dokunulmadı, `dist/preview.html` md5'i aynı kaldı.
Kaynak DB ve üretilmiş JSON'lar DEĞİŞMEDİ.

---

## 1. NE EKLENDİ

| Dosya | Rol |
|---|---|
| `data/mob-ai-profiles.ts` | NORMAL / AGGRESSIVE / ELITE davranış parametreleri |
| `data/farm-area.ts` | 8 tekil spawn slotu (ev noktaları + AI tipi) |
| `world/MobAi.ts` | Durum makinesi (renderer'dan bağımsız, testli) |
| `world/MobAttack.ts` | Mob → oyuncu hasarı (ana `damageRoll` yeniden kullanılır) |
| `world/MobSlotSystem.ts` | Yeniden yazıldı: yaşam döngüsü + telemetri |
| `tools/farm-area-telemetry.ts` | `npm run telemetry:mobs` |

Silinen: `data/mob-slots.ts` (küme tabanlı eski yerleşim; yerini
`data/farm-area.ts` aldı).

---

## 2. DURUM MAKİNESİ

```
                  ┌──────────── roam hedefi ────────────┐
                  ▼                                     │
   RESPAWN ──► IDLE ──► ROAM ──────────────────────────┘
                │  ▲                                    
   aggro (yakınlık VEYA hasar)                          
                ▼  │ eve varış (+ HP reset)             
              AGGRO │                                   
                │   │                                   
      tepki gecikmesi                                   
                ▼   │                                   
              CHASE ─── d ≤ enterAttack ──► ATTACK      
                │   ▲                          │        
                │   └──── d > leaveAttack ─────┘        
                │                                       
        leash aşıldı / oyuncu öldü                      
                ▼                                       
             RETURN ──────────────────────────► IDLE    
                                                        
   herhangi bir durumdan:  ölüm → DYING → DEAD → RESPAWN
```

Scene içinde **hiçbir AI if bloğu yoktur**; Scene yalnız çizer ve
`S.mobs.update(dt, player)` çağırır.

**DYING/DEAD sözleşmesi değişmedi:** ölüm `mob.state = 'dying'` ile başlar,
tek ölüm kapısı `reapDead()` ödülü çözer, `markDead()` `mob.ai = 'dead'` yapar.
AI ikinci bir ölüm yolu AÇMAZ (test edildi).

---

## 3. PROFİLLER (PROJECT LEGACY TUNING — kaynaktan GELMEZ)

| Tip | aggroR | leashR | roamR | hız | kovala | attackR | enter/leave | çevrim | vuruş anı | tepki | respawn |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
| NORMAL | **0** | 500 | 80 | 55 | 75 | 55 | 50/65 | 1.6s | 0.45s | 0.25s | 8s |
| AGGRESSIVE | 220 | 500 | 80 | 55 | 75 | 55 | 50/65 | 1.6s | 0.45s | 0.25s | 8s |
| ELITE | 260 | 560 | 80 | 55 | **80** | 55 | 50/65 | 1.6s | 0.45s | 0.25s | 8s |

`NORMAL.aggroRadius = 0` → **PASİF**: oyuncu yanından geçmekle saldırmaz;
tek uyanma yolu **hasar almaktır**.

**Monster statları buraya KOPYALANMADI.** HP / attack / defense / exp hâlâ
`monsters.json` → `Content.monster()` üzerinden gelir; HP ayrıca ana
`BalanceProfile.monsterHp` çarpanından geçer (prototipte ×8).

**ELITE bir ödül/drop sistemi DEĞİLDİR** — yalnız davranış profilidir. Yeni
loot/exp kuralı eklenmedi.

---

## 4. FARM ALANI (8 SLOT)

Her slot **tek** mobun **sabit evidir**. Mob roam / leash / return hesabını
mevcut konumundan değil bu ev noktasından yapar.

| Slot | Ad | ref | AI | Doğuşa uzaklık | Kaynak |
|---|---|---:|---|---:|---|
| fa_n1 | Toprak Solucanı | 750 | NORMAL | 190 | lv1 · 7 hp · 4 atk |
| fa_a1 | Çalı Sıçanı | 850 | AGGRESSIVE¹ | 210 | lv2 · 11 hp · 3 atk |
| fa_n2 | Çalı Sıçanı | 850 | NORMAL | 340 | lv2 · 11 hp · 3 atk |
| fa_a2 | Yaban Sıçanı | 851 | AGGRESSIVE | 370 | lv5 · 26 hp · 4 atk |
| fa_n3 | Yaban Sıçanı | 851 | NORMAL | 360 | lv5 · 26 hp · 4 atk |
| fa_n4 | Bataklık Yaratığı | 255 | NORMAL | 544 | lv9 · 57 hp · 6 atk |
| fa_a3 | Bataklık Devi | 250 | AGGRESSIVE | 560 | lv11 · 99 hp · 11 atk |
| fa_e1 | Bataklık Reisi | 252 | ELITE | 590 | lv15 · 169 hp · 17 atk |

Dağılım: **2 yakın · 3 orta · 3 uzak**, farklı yönlerde, ev noktaları en az
120 world birim ayrık. Hepsi Genie'nin varsayılan Farm Boundary yarıçapının
(650) içinde.

¹ **DOĞUŞ GÜVENLİĞİ DÜZELTMESİ (telemetride bulundu).** `fa_a1` profil
varsayılanıyla (aggroRadius 220) doğuş noktasını kapsıyordu: oyuncu oyuna
girer girmez saldırıya uğruyordu. Slot ezmesiyle `aggroRadius 120` +
`roamRadius 60` yapıldı. Kural artık testle korunuyor:

> her saldırgan slot için `aggroRadius + roamRadius < ev-doğuş mesafesi`

---

## 5. AGGRO KURALLARI

- **Yalnız IMPACT anında.** Cast anında aggro OLMAZ (ölçüldü: cast sonrası
  `aggro=false`, impact sonrası `aggro=true`).
- **İdempotent.** 3/5 ok aynı moba değse bile **tek** durum geçişi olur;
  tepki gecikmesi sayacı sıfırlanmaz.
- **Kukla (dummy) aggro olmaz** — test entity'si davranış üretmez.
- **RETURN sırasında yeniden aggro YOKTUR** (§17). Bu bilinçli bir V1
  kararıdır: dönen moba hasar vurulabilir, ama dönüşü bozulmaz. Aksi halde
  "vur–dön–vur" döngüsü mobun eve varmasını sonsuza kadar engelleyebilirdi.

---

## 6. SALDIRI ZAMANLAMASI — FPS BAĞIMSIZ

Çevrim: `windup (0.45s) → VURUŞ → recovery (1.15s) → windup …`

Sayaç `=` ile **sıfırlanmaz**, `+=` ile **devreder**. Ölçüm (10 sn, oyuncu
menzilde):

| dt | vuruş |
|---|---:|
| 1/30 | 6 |
| 1/60 | 6 |
| 1/120 | 6 |

Vuruş **yalnız** authoritative `attackRange` (55) içindeyken düşer. Histerezis
bandında (55 < d ≤ 65) mob ATTACK durumunda kalır ama **hasar vermez** —
ölçüldü.

---

## 7. LEASH / RETURN / HP

- Leash **EVDEN** ölçülür (oyuncudan değil) → mob haritanın öbür ucuna
  sürüklenemez. Ölçüm: oyuncu 5000 birim kaçtığında mobun evden azami
  uzaklığı `leashRadius` ile sınırlı kaldı.
- RETURN'de mob `moveSpeed` ile eve yürür. **HP yalnız eve VARINCA** dolar
  (`returnTolerance = 14`), dönüş başlarken veya yolda DEĞİL — test edildi.
- Eve varışta `status[]` (DoT/debuff) temizlenir, saldırı sayacı sıfırlanır.

---

## 8. RESPAWN

- Aynı slot, **tam ev noktası**, dolu can, temiz sayaçlar.
- **Yeni nesne üretilmez** — aynı `uid` yeniden kullanılır → duplicate imkânsız.
- `populate()` slotta **herhangi bir mob kaydı** varsa (canlı ya da respawn
  bekleyen ceset) yeni mob üretmez.
- DEV preseti: **3 / 8 / 15** sn. Ölçülen: 3.02 / 8.02 / 15.00.

---

## 9. TELEMETRİ

**DEV panelinde** `Mob telemetri` düğmesi (varsayılan KAPALI). Açıkken sol
sütun Genie durumu yerine farm alanını gösterir — ikisi asla üst üste binmez.

Her satır: `slot · ad · [AI tipi] · DURUM · hp/maxHp · dPlayer · dHome · aggro sebebi`
Ölü mob için: `respawn <saniye>`.

Üst satır (§30): `slot 8 · canlı N · ölü M (N 4/A 3/E 1)`.

Haritada: her slotun ev noktası, roam yarıçapı ve AI tipine göre renk;
`Show projectile rays` açıkken ayrıca **aggro** (kırmızı) ve **leash** (mavi)
yarıçapları çizilir.

Headless rapor: `npm run telemetry:mobs`.

---

## 10. AYRIMLARIN KORUNMASI

| Sistem | Sahibi | Bu görevde değişti mi |
|---|---|---|
| Monster HP/atk/def/exp | `monsters.json` (KAYNAK) | ✗ |
| Hasar formülü | `CombatSystem.damageRoll` (ANA OYUN) | ✗ |
| Oyuncu hasar alma | `PlayerState.takeDamage` (ANA OYUN) | ✗ |
| Mob AI parametreleri | `data/mob-ai-profiles.ts` (TUNING) | YENİ |
| Slot yerleşimi | `data/farm-area.ts` (TUNING) | YENİ |
| Genie hareket (P1.5) | `world/GenieMovement.ts` | ✗ |
| İki fazlı combat (P1.4) | `world/CombatPipeline.ts` | ✗ |

`CombatSystem.enemyAttackTick()` **silinmedi ve değiştirilmedi**; ana oyunda
çalışmaya devam ediyor. Prototip artık onun yerine `MobAttackProfile` +
`MobAiController` zamanlamasını kullanıyor — tek fark ZAMANLAMA, formül değil.

---

## 11. AÇIK KALAN / V1 SINIRLARI

- **Tek hedef:** mob yalnız oyuncuyu hedefler (pet/NPC yok — oyunda da yok).
- **Mob–mob çarpışması yok:** iki mob aynı noktada üst üste durabilir.
- **Engel farkındalığı yok:** mob `WorldMovementSystem` engellerini kullanmaz,
  düz çizgide yürür. Farm alanı engelsiz bölgeye yerleştirildi.
- **Grup/link aggro yok:** bir mobun aggrosu komşusunu uyandırmaz.
- **RETURN sırasında hasar alınabilir** ama aggro olmaz (§5).
- Sayılar **playtest başlangıcıdır**; bu bir mob balance görevi değildi.
