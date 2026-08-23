# Veri Denetimi (Faz 0)

Kaynak: `KO_Reference_v8.db` — canonical kabul edildi. `PRAGMA integrity_check` = ok.

## Sayılar (README_KO_Reference_v8 ile karşılaştırma)
| Sistem | DB | README | Durum |
|---|---|---|---|
| items_server (benzersiz num) | 62.954 | 62.954 | ✓ hepsi isimli, hepsi high confidence |
| monsters | 700 | 700 | ✓ |
| npcs | 434 | 434 | ✓ v7 monster/NPC ayrımı uygulanmış |
| zones | 61 | 61 | ✓ |
| npc_positions (spawn) | 2.495 | 2.495 | ✓ |
| skills | 1.732 | 1.732 | ✓ |
| magic_type1..9 | 194/76/658/506/38/153/17/32/36 | aynı | ✓ |
| item_upgrades | 6.583 | 6.583 | ✓ |
| level_exp | 80 satır, Lv80=2.141.236.485 | aynı | ✓ |
| start_positions | 62 | 62 | ✓ |
| monster_drops slot | 2.275 | 2.275 | ✓ |
| make_item_groups üye | 2.215 (98 grup) | aynı | ✓ |
| merchant_groups | 16 satır / 11 kod | 11 group | ✓ (aynı kodun alt-varyantları) |

## Bulgular / riskler
1. Drop'ların referans verdiği **4 grup ID çözülememiş**: 1, 5, 7, 8 (README 3 diyordu; 5 de eksik).
   Import bunları "slot atlandı" uyarısıyla geçer.
2. **5 direct-drop item** ve **167 grup üyesi item** items_server'da yok (muhtemelen ölü ID'ler).
   Import'ta atlanır ve loglanır — sessiz kayıp yok.
3. `upgrade_probabilities` tablosu boş (v2 README'de belirtildiği gibi ITEMUP_PROBABILITY
   doldurulmamış). Upgrade oranları `item_upgrades.probability_percent` + `upgrade_curve_summary`.
4. `npc_positions.path` alanı çözülmemiş (`path_status='not_decoded'`) — devriye sistemi bu
   alana bağlanamaz; MVP radius/leash kullanır (brif kuralı).
5. Zone listesinde "unknown moradon" gibi sıfır spawn'lı çift kayıtlar var; canonical 61
   sayısına dahil ama MVP kapsamını etkilemez.
6. `reg_time` birimi doğrulanmadı; `regTimeSourceRaw` olarak taşınır, saniye varsayılmaz.
7. KO gruplarında aynı item birden çok slotta tekrar ediyor — bu, kaynağın kendi
   ağırlıklandırması. Slot üzerinden uniform seçim ağırlığı otomatik korur (test edildi).

## MVP seçimi
- 10 normal + 1 elite monster (Lv1-15, hepsi zone 21 kaynağından; drop + spawn kaydı olanlar)
- 161 item whitelist'i (drop havuzu + merchant 253/255 + başlangıç yayı 160100000)
- 12 skill (archery type-2 düşük seviye + 2 hız buffı)
- 3 zone: hub + seviye bandına göre bölünmüş 2 sanal combat zone (bkz. CONTENT_MAPPING.md)
