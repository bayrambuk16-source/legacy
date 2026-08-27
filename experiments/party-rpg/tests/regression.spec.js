/** party-rpg regression — CLAUDE.md "Regression listesi"nin tarayıcı karşılığı.
 *
 *  Tek bir savaş oturumu açılır ve listedeki sistemler sırayla o oturum
 *  üzerinde doğrulanır. Sebep: her sistem için ayrı oyun açmak dakikalar
 *  ekler ve zaten aynı hatayı tekrar tekrar bulur.
 */
import { test, expect } from '@playwright/test';
import { oyunuAc, basla, kos, olc } from './yardim.js';

test.describe.configure({ mode: 'serial' });

test('regression: açılış → savaş → ilerleme → kayıt', async ({ page }) => {
  const kayit = await oyunuAc(page);

  /* ── game startup ── */
  expect(await page.locator('#sahne canvas').count(), 'canvas yok').toBe(1);
  expect(await page.locator('.slotKart').count(), 'slot ekranı gelmedi').toBe(6);

  /* Sabit sayı yerine KADROYA bağlı: mob kadrosu değiştiğinde (tür eklenip
     çıktığında) test kendiliğinden doğru kalsın, sihirli sayı bakım yükü olmasın. */
  const varliklar = await page.evaluate(() => {
    const P = window.__PARTY;
    const yuklu = Object.keys(P.MODEL);
    return {
      yuklu, beyan: P.sabit.VARLIK,
      eksik: P.sabit.VARLIK.filter((a) => !P.MODEL[a]),
      modelsizTur: P.sabit.TUR_SIRA.filter((t) => !P.MODEL[t]),
      statsizTur: P.sabit.TUR_SIRA.filter((t) => !P.sabit.TURLER[t]),
      doku: Object.keys(P.DOKU).length,
    };
  });
  expect(varliklar.eksik, `yüklenmeyen varlık: ${varliklar.eksik.join(', ')}`).toEqual([]);
  expect(varliklar.modelsizTur, `modeli olmayan mob türü: ${varliklar.modelsizTur.join(', ')}`).toEqual([]);
  expect(varliklar.statsizTur, `statı olmayan mob türü: ${varliklar.statsizTur.join(', ')}`).toEqual([]);
  expect(varliklar.doku, '19 VFX dokusu yüklenmeli').toBe(19);

  await basla(page, 1);

  /* ── character spawn ── */
  let m = await olc(page);
  expect(m.kahramanVar, 'dört kahraman kurulmadı').toBe(true);

  /* ── combat loop / mob spawn / target selection ── */
  await kos(page, 12);
  m = await olc(page);
  /* Döngünün İLERLEDİĞİNİ doğrula, HIZINI değil: "12 sn'de en az 5 sn" iddiası
     makine yükü altında haksız düşüyordu (dt 0.05'te kırpılıyor). FPS ölçümü
     uzun koşu testinin işi. Burada iki örnek alıp artışa bakmak yeterli. */
  const sure1 = m.sure;
  expect(sure1, 'oyun döngüsü hiç ilerlemedi').toBeGreaterThan(1);
  await kos(page, 2);
  const sure2 = (await olc(page)).sure;
  expect(sure2, 'oyun döngüsü durdu').toBeGreaterThan(sure1);
  expect(m.mob, 'mob doğmadı').toBeGreaterThan(0);
  expect(m.mob, 'AZAMI_MOB aşıldı').toBeLessThanOrEqual(12);

  const hedef = await page.evaluate(() => {
    const P = window.__PARTY;
    const e = P.et.enYakinMob();
    return { secildi: !!e, menzil: P.fn.okMenzil(),
      mesafe: e ? e.kok.position.distanceTo(P.okcu.kok.position) : null };
  });
  if (hedef.secildi) expect(hedef.mesafe, 'hedef menzil dışı').toBeLessThanOrEqual(hedef.menzil);

  /* ── skills / ultimate ── */
  const skill = await page.evaluate(() => {
    const P = window.__PARTY;
    P.D.puan = 8;
    for (let t = 0; t < 8; t++)
      for (const kim of P.sabit.KIMLER) {
        const b = [...document.querySelectorAll('.artiBtn')].find((x) => x.dataset.kim === kim);
        if (b && P.D.puan > 0) b.click();
      }
    return { skill: { ...P.D.skill }, kalanPuan: P.D.puan };
  });
  expect(Math.min(...Object.values(skill.skill)), 'skill açılmadı').toBeGreaterThan(0);

  await kos(page, 2);
  const kutu = await page.locator('.skillKutu.kilitli').count();
  expect(kutu, 'skill kutuları kilitli kaldı').toBeLessThan(12);

  const ulti = await page.evaluate(async () => {
    const P = window.__PARTY;
    P.ENV.auto = false;
    for (const k of P.sabit.KIMLER) P.D.ulti[k] = 1;
    await new Promise((r) => setTimeout(r, 300));
    const gorunur = [...document.querySelectorAll('.ultiBtn')].filter((b) => b.classList.contains('gorunur')).length;
    [...document.querySelectorAll('.ultiBtn')].forEach((b) => b.click());
    await new Promise((r) => setTimeout(r, 600));
    const kalan = Object.values(P.D.ulti).filter((v) => v >= 1).length;
    P.ENV.auto = true;
    return { gorunur, kalan };
  });
  expect(ulti.gorunur, 'AUTO kapalıyken ulti butonu görünmedi').toBe(4);
  expect(ulti.kalan, 'ulti tüketilmedi').toBeLessThan(4);

  /* ── heal / support ── */
  /* Rahibin heal'i cooldown'a bağlı: sabit pencerede bakmak flaky
     (bir koşuda 4 sn içinde hiç heal atmadı). Yükselişi YOKLA — sonraki
     hasar tepeyi düşürebileceği için en yüksek gözlenen değere bakılır. */
  const heal = await page.evaluate(async () => {
    const P = window.__PARTY;
    P.D.okcuCan = 20; P.D.mageCan = 20;
    const once = P.D.okcuCan + P.D.mageCan;
    let tepe = once;
    for (let i = 0; i < 40; i++) {          /* 40 × 0,5 sn = en çok 20 sn */
      await new Promise((r) => setTimeout(r, 500));
      tepe = Math.max(tepe, P.D.okcuCan + P.D.mageCan);
      if (tepe > once) break;
    }
    return { once, tepe, priestOlu: !!(P.priest && P.priest.olu) };
  });
  expect(heal.tepe, `iyileştirme çalışmıyor (priestÖlü=${heal.priestOlu})`).toBeGreaterThan(heal.once);

  /* ── death / resurrection ── */
  const olum = await page.evaluate(async () => {
    const P = window.__PARTY;
    P.et.kahramanaVur('mage', 99999);
    await new Promise((r) => setTimeout(r, 500));
    const olduMu = !!(P.mage && P.mage.olu);
    await new Promise((r) => setTimeout(r, 12000));
    return { olduMu, dirildi: !!(P.mage && !P.mage.olu), can: P.D.mageCan };
  });
  expect(olum.olduMu, 'kahraman ölmedi').toBe(true);
  expect(olum.dirildi, 'kahraman dirilmedi').toBe(true);

  /* ── item drops / inventory / equipment / upgrade ── */
  const esya = await page.evaluate(() => {
    const P = window.__PARTY;
    const oncekiDon = JSON.stringify(P.ENV.don);
    for (let n = 0; n <= 6; n++) for (const kim of P.sabit.KIMLER) P.et.itemVer(kim, n, P.okcu.kok.position);
    P.ENV.kagit = [400, 400, 400, 400, 400, 400, 400];
    const it = P.ENV.don.okcu.s1;
    const b0 = it ? (it.b || 0) : -1;
    for (let i = 0; i < 3; i++) P.et.basmaDene('okcu', 's1');
    const a0 = P.ENV.altin; P.ENV.altin = 100000;
    P.et.panelAc('okcu', 'envanter');
    const sekmeler = {};
    for (const s of ['envanter', 'depo', 'skiller', 'nitelikler', 'yukseltme', 'basarimlar', 'dukkan']) {
      const el = [...document.querySelectorAll('.sekme')].find((x) => x.dataset.s === s);
      if (el) { el.click(); sekmeler[s] = document.getElementById('panelIc').innerHTML.length; }
    }
    document.getElementById('panelX').click();
    return { donDegisti: JSON.stringify(P.ENV.don) !== oncekiDon,
      basmaOnce: b0, basmaSonra: P.ENV.don.okcu.s1 ? (P.ENV.don.okcu.s1.b || 0) : -1,
      sekmeler, depo: Object.values(P.ENV.depo).reduce((a, b) => a + b.length, 0) };
  });
  expect(esya.donDegisti, 'drop ekipmana yansımadı').toBe(true);
  expect(esya.basmaSonra, 'örs basma çalışmadı').toBeGreaterThan(esya.basmaOnce);
  for (const [ad, uzunluk] of Object.entries(esya.sekmeler))
    expect(uzunluk, `panel sekmesi boş: ${ad}`).toBeGreaterThan(50);

  /* ── boss / stage progression ── */
  const boss = await page.evaluate(async () => {
    const P = window.__PARTY;
    for (const kim of P.sabit.KIMLER)
      for (const s of ['s1', 's2', 'z', 'p', 'k', 'y', 'e']) P.ENV.don[kim][s] = { n: 5, b: 6 };
    const bolgeOnce = P.D.bolge;
    P.D.bolum = 5; P.D.bolumKesim = 19; P.et.rozetGuncelle();
    let gorulen = null;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const bm = P.D.moblar.find((x) => x.bossMu);
      if (bm && !gorulen) gorulen = { tur: bm.tur, ad: document.getElementById('bossAd').textContent };
      if (P.D.bolge > bolgeOnce) return { gorulen, yeniBolge: P.D.bolge, yeniBolum: P.D.bolum, bolgeOnce };
      if (P.D.bitti) return { gorulen, yenildi: true, bolgeOnce };
    }
    return { gorulen, zamanAsimi: true, bolgeOnce };
  });
  expect(boss.gorulen, 'boss hiç doğmadı').not.toBeNull();
  expect(boss.yeniBolge, 'boss ölünce bölge ilerlemedi').toBe(boss.bolgeOnce + 1);

  /* ── EXP / level ── */
  m = await olc(page);
  expect(m.seviye, 'seviye artmadı').toBeGreaterThan(1);

  /* ── camera drift: kamera sabit bir bakıştan sapmamalı ── */
  const kam0 = m.kamera;
  await kos(page, 10);
  const kam1 = (await olc(page)).kamera;
  const kayma = Math.hypot(kam1[0] - kam0[0], kam1[1] - kam0[1]);
  expect(kayma, `kamera kaydı: ${kayma}`).toBeLessThan(0.05);

  /* ── NaN taraması ── */
  m = await olc(page);
  expect(m.nan, `NaN gameplay değeri: ${m.nan.join(', ')}`).toEqual([]);

  /* ── console errors / unhandled rejection / broken asset ── */
  expect(kayit.sayfaHatasi, `uncaught: ${kayit.sayfaHatasi.join(' | ')}`).toEqual([]);
  expect(kayit.hata, `console error: ${kayit.hata.join(' | ')}`).toEqual([]);
  expect(kayit.bozukIstek, `bozuk varlık: ${kayit.bozukIstek.join(' | ')}`).toEqual([]);
});

test('save/load: kapat-aç sonrası ilerleme korunur', async ({ page }) => {
  await oyunuAc(page);
  await basla(page, 1);
  await kos(page, 8);

  const once = await page.evaluate(() => {
    const P = window.__PARTY;
    P.D.seviye = 12; P.ENV.altin = 4242;
    P.ENV.don.okcu.s1 = { n: 4, b: 3 };
    P.et.lvlKaydet(); P.et.envKaydet(); P.et.stageKaydet();
    return { seviye: P.D.seviye, altin: P.ENV.altin, bolge: P.D.bolge, s1: P.ENV.don.okcu.s1 };
  });

  /* gerçekten kapat-aç: yeni sayfa yüklemesi */
  await page.goto('/experiments/party-rpg/index.html?dbg=1');
  await page.waitForFunction(() => !document.getElementById('perde') && !!window.__PARTY, null, { timeout: 60_000 });

  const sonra = await page.evaluate(() => {
    const P = window.__PARTY;
    return { seviye: P.D.seviye, altin: P.ENV.altin, bolge: P.D.bolge, s1: P.ENV.don.okcu.s1 };
  });

  expect(sonra.seviye, 'seviye kaydedilmedi').toBe(once.seviye);
  expect(sonra.altin, 'altın kaydedilmedi').toBe(once.altin);
  expect(sonra.bolge, 'bölge kaydedilmedi').toBe(once.bolge);
  expect(sonra.s1, 'ekipman kaydedilmedi').toEqual(once.s1);
});

/** Uzun koşu — CLAUDE.md "Performans": büyük değişiklikten sonra 10 dk.
 *  Varsayılanda atlanır (her görevde 10 dk beklemek maliyetli);
 *  açmak için:  UZUN=1 npm run test:party
 *  Süreyi dakika olarak UZUN_DK ile ayarla (render değişikliğinde 30). */
test('uzun koşu: FPS / bellek / sayaç büyümesi', async ({ page }) => {
  test.skip(!process.env.UZUN, 'UZUN=1 ile açılır');
  const dk = Number(process.env.UZUN_DK || 10);
  test.setTimeout((dk * 60 + 120) * 1000);

  const kayit = await oyunuAc(page);
  await basla(page, 1);
  await kos(page, 5);

  /* FPS sayacı: gerçek rAF üzerinden */
  await page.evaluate(() => {
    window.__fps = { kare: 0, t0: performance.now() };
    const tik = () => { window.__fps.kare++; requestAnimationFrame(tik); };
    requestAnimationFrame(tik);
  });

  const ornek = [];
  for (let i = 0; i < dk; i++) {
    await kos(page, 60);
    const m = await olc(page);
    const fps = await page.evaluate(() => {
      const f = window.__fps, sn = (performance.now() - f.t0) / 1000;
      const v = f.kare / sn; f.kare = 0; f.t0 = performance.now(); return v;
    });
    ornek.push({ dk: i + 1, fps: +fps.toFixed(1), geo: m.gpu.geo, doku: m.gpu.doku,
      mob: m.mob, heapMB: m.heap ? Math.round(m.heap / 1048576) : null, kesim: m.kesim });
    /* yenilirsek tekrar başlat, koşu devam etsin */
    if (m.bitti) await page.evaluate(() => document.getElementById('tekrar').click());
  }
  console.log('uzun koşu örnekleri:', JSON.stringify(ornek, null, 1));

  const ilk = ornek[0], son = ornek[ornek.length - 1];
  expect(kayit.sayfaHatasi, `uncaught: ${kayit.sayfaHatasi.join(' | ')}`).toEqual([]);
  expect(son.fps, `FPS düştü: ${ilk.fps} → ${son.fps}`).toBeGreaterThan(ilk.fps * 0.7);
  expect(son.mob, 'mob sayısı kontrolden çıktı').toBeLessThanOrEqual(12);
});
