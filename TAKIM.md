# Project Legacy — Çalışma Düzeni

**Game Director: sen (kullanıcı).** Vizyon, öncelik, kapsam ve nihai ürün
kararları sende.

Ekip bir "org şeması" değil, **iki farklı araç** olarak kurgulandı:

| | Ne yapar | Maliyet | Ne zaman |
|---|---|---|---|
| **Skill** | Kuralları **mevcut** oturuma yükler | Ucuz — soğuk başlangıç yok | İşin çoğu |
| **Subagent** | **Ayrı** context'te çalışır, özet döner | Pahalı — repoyu yeniden keşfeder | Sadece 4 durum |

Subagent her spawn'da konuşmayı görmeden başlar ve CLAUDE.md'yi + dosyaları
yeniden okur. Bu, `CLAUDE.md`'deki **DÜŞÜK BAKİYE MODU** ile doğrudan çelişir —
o yüzden yalnız izolasyonun gerçekten kazandırdığı 4 iş subagent olarak kaldı.

---

## Skill'ler (14) — işin çoğu burada

Konuyla ilgili iş başlayınca kendiliğinden yüklenir; `/ad` ile de çağırabilirsin.

### Kod
| Skill | Kapsam |
|---|---|
| `gameplay-kod` | 7 mimari sözleşme + zorunlu doğrulama döngüsü. Combat, AI, loot, inventory, quest kodu |
| `ui-hud` | 941×1672 maket ölçeği, UI_SCALE, saf UI katmanı, dokunma ergonomisi, 4 portrait çözünürlük |
| `save-veri` | Save/load şeması, migration, gerçek kapat-aç doğrulaması |
| `multiplayer` | Server-authoritative model, sync, reconnect, onay kapısı |
| `build-test` | `npm.cmd` komutları, Playwright altyapısı, `?dbg=1` kancası, git disiplini |

### Tasarım
| Skill | Kapsam |
|---|---|
| `tasarim-spec` | Mekanik spec formatı + kabul kriteri zorunluluğu |
| `ekonomi-denge` | EXP/stat/drop/fiyat + **MyKO kaynak zorunluluğu, uydurma yasak** |
| `liveops` | Event, sezon, günlük görev, ödül tablosu |

### Görsel & ses
| Skill | Kapsam |
|---|---|
| `harita-cevre` | WORLD_BOUNDS, spawn, collision durumu, **slot çakışma kuralı**, dekor bütçesi |
| `vfx-performans` | Shader/particle + **dispose disiplini** + FPS/memory ölçümü |
| `animasyon-rig` | Mixamo `mixamorig:` öneki, ölçek tuzağı, socket, mixer temizliği |
| `konsept-2d` | Konsept, ikon, SVG/WebP, 3D ekibine referans formatı |
| `ses` | CC0 tedarik + lisans künyesi, voice limit, AudioContext kuralı |

### İletişim
| Skill | Kapsam |
|---|---|
| `topluluk` | Sürüm notu, geri bildirim sınıflandırması, **onaysız yayın yok** |

---

## Subagent'lar (4) — sadece bunlar

Hepsi **açık çağrı** ister; adını yazmazsan kendiliğinden spawn olmazlar.

| Ajan | Neden ayrı context | Model |
|---|---|---|
| `qa-tester` | 550+ test ve 30 dk log çıktısı ana context'i boğar | sonnet |
| `veri-analisti` | Binlerce iterasyonluk simülasyon çıktısı; sonuç tablosu yeterli | sonnet |
| `teknik-lider` | Soğuk context burada **avantaj** — az önce yazılan koda bağlanmadan bakar | **opus** |
| `karakter-artist` | Uzun MCP üretim döngüleri (Meshy/Blender), ana akıştan ayrı | sonnet |

Çağırma: *"qa-tester ile tam regression koş"*, *"teknik-lider bu bug'a taze gözle baksın"*.

**`teknik-lider` ne zaman:** aynı problem **iki kontrollü denemede** çözülemediyse.
Görev zor *göründüğü* için değil.

---

## Tipik akışlar

- **Yeni mob** → `tasarim-spec` + `ekonomi-denge` (MyKO statları) → `karakter-artist` (ajan, GLB) → `animasyon-rig` → `gameplay-kod` → `qa-tester` (ajan)
- **Yeni UI ekranı** → `ui-hud` + `konsept-2d` → 4 portrait ekran görüntüsü → gerekirse `qa-tester`
- **FPS düştü** → `vfx-performans` (önce/sonra ölçüm) → çözülmezse `teknik-lider` (ajan)
- **Harita genişletme** → `harita-cevre` → `gameplay-kod` (slot kaydı) → `qa-tester`
- **Bilinmeyen runtime bug** → `gameplay-kod` ile iki deneme → `teknik-lider` (ajan)

---

## Herkes için geçerli

- **CLAUDE.md sözleşmeleri ihlal edilmez.** Bir testi "geçsin diye" gevşetme;
  kural değişmeliyse karar senin.
- **Değer uydurma yasak.** Mob/item/stat/EXP MyKO kaynağından gelir
  (`docs/MYKO_SOURCE_MAP.md` önce okunur). Kaynak yoksa kısa blocker bildir, dur.
- **Test edilmeden TAMAMLANDI yok.** Kod → typecheck + test + gerçek tarayıcı.
  UI → 4 portrait ekran görüntüsü. Save → gerçek kapat-aç.
- **Minimum değişiklik.** Çalışan mimariyi baştan yazma, yeni framework ekleme,
  kapsamı kendi başına genişletme.
- **Kısa rapor:** `Yapılanlar` / `Değişen dosyalar` / `Doğrulama` / varsa `Blocker`.
- Kod yorumları ve raporlar **Türkçe**; yorum NE değil **NEDEN** anlatır.

## Kapsam

Bu tanımlar `project-legacy` klasörüne özel (`.claude/skills/`, `.claude/agents/`).
Başka projede de geçerli olsun istersen `~/.claude/skills/` ve
`~/.claude/agents/` altına kopyala.
