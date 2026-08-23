# Legacy v137 — Denge ve Tasarım Referansı

Kaynak: `legacyprototip137.html` (sürüm yazısı 0.59). Bu belge yeni projeye taşınacak
denge kararlarının envanteridir; birebir kopya zorunlu değildir, referanstır.

## Aşama yapısı
- 10 bölüm × 10 kesim = 100 aşama (`KESIM=10`, `BOLUM_SAYISI=10`)
- Boss kesimleri: her bölümde 3, 6, 9 (ara boss) + 10 (son boss); boss kesiminde tek düşman, diğerlerinde 5
- Ölünce bir önceki kesime dönülür

## Düşman büyüme eğrisi (v131 düzeltmesi: üstel değil, doğrusal + kare terim)
- HP: `60 + 20·i + 0.22·i²`  (i = aşama indeksi)
- Hız: `min(88, 34 + 0.55·i)` px/sn
- Hasar: `6 + 0.85·i`
- XP: `14 + 9·i` — Coin: `7 + 3.6·i`
- Hedef süreler: canavar başına ~3 sn (aşama 10) → ~10 sn (aşama 100); boss 20-70 sn
- `DUSMAN_CAN_CARPAN = 1` (takım sistemi çarpanı)

## Düşman türleri (tek sprite, ton/ölçek varyantı — v137 kadrosu)
| Tür | Ölçek | Can | Hız | Hasar | Ödül | Ağırlık |
|---|---|---|---|---|---|---|
| Yavru Kurt | 0.74 | 0.55 | 1.35 | 0.65 | 0.7 | 0.45−0.004·i (min 0.05) |
| Kuduz Orman Kurdu | 1.00 | 1.00 | 1.00 | 1.00 | 1.0 | sabit 0.55 |
| Alfa Kurt | 1.28 | 2.10 | 0.78 | 1.45 | 1.9 | 0.05+0.004·i (max 0.40) |

## Ganimet / kalite
- Eşya düşüş şansı: mob %33 (`ESYA_DUSUS_SANS=0.33`), boss %100
- 5 kalite: Sıradan / Kaliteli / Nadir / Destansı / Efsanevi
  - Çarpanlar: 1.0 / 1.5 / 2.2 / 3.2 / 4.6 — satış coin: 6/18/55/160/500
  - Renkler: #cfc7b6 / #7fa85c / #6f8fd0 / #9b7cc4 / #e08a3c
- Şans Ocağı (drop kalite yükseltme): seviye 0-40, bedel `200 × 1.16^sv`
  - Ağırlıklar: sıradan `max(25, 100−1.9·sv)`, kaliteli `1+0.5·sv`, nadir `(sv−4)·0.30`, destansı `(sv−10)·0.18`, efsanevi `(sv−20)·0.10`
  - sv0 = %99/%1; nadir 5, destansı 11, efsanevi 21. seviyede açılır

## Upgrade (+N) sistemi
- Başarı eğrisi (+1..+10): `[100, 100, 95, 90, 85, 80, 70, 50, 25, 10]` %
- Trina bonusu: +%5 — Kırılma eşiği: +7'den sonra başarısızlıkta eşya kırılır
- Artırım sınırı: silah +8, zırh +8, takı +1
- Parşömen birleştirme: 3 alt = 1 üst
- Maliyet: `100 × 1.25^art × kalite_çarpanı × zorluk_coin`
- Eşya değeri: `taban × kalite_ölçeği × 1.20^art × (ancient? 1.15) × 1.115^eşya_seviyesi`
  - `SEVIYE_ARTIS = 1.115` (eşyanın düştüğü aşamanın seviye çarpanı)

## Takım (4 kahraman, karma otomatik savaş)
- Warrior (tank, ön): can ×1.6, hız 128 px/sn, menzil 52, tetik: düşman ekranın 1/3'ünü geçince
- Okçu: can ×1.0, tetik 1/5 — Mage: can ×0.75, tetik 1/4 — Priest: can ×0.85, en yaralıyı iyileştirir
- Diriliş: 15 sn, düştüğü yerde; oyun ancak dördü yerdeyken biter
- Hedefleme: warrior'ı geçmemiş düşman warrior'a; geçen geri dönmez (GECME_PAYI=22)

## Skill sistemi (okçu, 6 skill, 5 yuva)
| Skill | Lv | Bekleme | Tür | Etki |
|---|---|---|---|---|
| Seri Atış | 1 | 8 sn | Aktif | Saldırı hızı +%10 (6 sn) |
| Delici Ok | 5 | 6 sn | Aktif | %140 hasar, delip geçer |
| Zehirli Ok | 10 | 9 sn | Aktif | 4 sn zehir |
| Çoklu Atış | 15 | 10 sn | Aktif | 3 ok birden |
| Kartal Gözü | 25 | 20 sn | Buff | Kritik +%25 (8 sn) |
| Ok Yağmuru | 35 | 25 sn | Alan | Tüm düşmanlara alan hasarı |

## Karakter ilerleme
- XP eğrisi: `gerekenXp(lv) = 80 × 1.28^lv`
- Stat puanı pasif (`PUAN_BASINA_LEVEL=0`) — güç tamamen ekipmandan
- Demirhane: seviye başına ekipman hasarı +%8, bedel `250 × 1.55^sv`

## Envanter
- Karakter başına 10 slot: silah, yardımcı, kask, zırh, eldiven, pantolon, bot, kolye, yüzük, tılsım
- Ortak çanta 25 + rol çantası 20; çanta üst sınırı 50; kuşanılan eşya yer kaplamaz
- Beceri sırası 5 yuva (`SIRA_YUVA=5`)

## Yeni projeye taşınırken dikkat
- KO v8 verisi geldiğinde: upgrade eğrisi KO BUS eğrisiyle (100/100/100/70/50/30/9/5), EXP eğrisi
  Lv1-80 referansıyla, drop yapısı iki aşamalı group-roll ile karşılaştırılıp profil bazlı kurulmalı
- Legacy'nin doğrusal+kare düşman eğrisi (v131 dersi) korunmaya değer: üstel eğri 30. aşamada oyunu kilitliyordu
