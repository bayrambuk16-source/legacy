/** Test yardımcıları — party-rpg.
 *
 *  Oyunu açmanın tek doğru yolu burada toplandı: kökten değil tam yoldan,
 *  ?dbg=1 ile (kanca olmadan iç durum gözlenemiyor), temiz localStorage ile.
 */

export const OYUN_YOLU = '/experiments/party-rpg/index.html?dbg=1';

/** Sayfayı açar, varlıklar yüklenene ve slot ekranı gelene kadar bekler.
 *  Dönen kayıt: console error/warning ve sayfa hataları biriktirilir —
 *  CLAUDE.md "0 uncaught error / 0 unhandled rejection" kapısı için. */
export async function oyunuAc(page, { temizKayit = true } = {}) {
  const kayit = { hata: [], uyari: [], sayfaHatasi: [], bozukIstek: [] };

  page.on('console', (m) => {
    if (m.type() === 'error') kayit.hata.push(m.text());
    else if (m.type() === 'warning') kayit.uyari.push(m.text());
  });
  page.on('pageerror', (e) => kayit.sayfaHatasi.push(String(e)));
  page.on('requestfailed', (r) => kayit.bozukIstek.push(r.url()));
  page.on('response', (r) => { if (r.status() >= 400) kayit.bozukIstek.push(r.status() + ' ' + r.url()); });

  if (temizKayit) {
    /* localStorage origin'e bağlı: önce sayfayı açıp sonra temizle, sonra yeniden yükle. */
    await page.goto(OYUN_YOLU);
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  }
  await page.goto(OYUN_YOLU);

  /* Yükleme perdesi kalkınca varlıklar hazırdır (hepsiniYukle sonrası remove edilir). */
  await page.waitForFunction(() => !document.getElementById('perde') && !!window.__PARTY, null, { timeout: 60_000 });
  return kayit;
}

/** Slot seçip savaşı başlatır. Aktif slot zaten n ise tıklama doğrudan başlatır. */
export async function basla(page, n = 1) {
  await page.waitForSelector('.slotKart');
  await page.evaluate((slot) => {
    const P = window.__PARTY;
    const k = document.querySelector(`.slotKart[data-n="${slot}"]`) || document.querySelector(`.slotKart[data-n="${P.SLOT}"]`);
    if (k) k.click();
  }, n);
  await page.waitForFunction(() => !document.querySelector('.slotKart'), null, { timeout: 20_000 });
}

/** Oyunu `sn` saniye GERÇEK zamanda koşturur (rAF canlı, FPS ölçülebilir).
 *  Headless Chromium sekmeyi görünür sayar, bu yüzden rAF durmaz. */
export async function kos(page, sn) {
  await page.waitForTimeout(sn * 1000);
}

/** Tolerans kapısı — CLAUDE.md "Hata toleransı" listesi. */
export function toleransRaporu(kayit, olcum) {
  return {
    uncaughtError: kayit.sayfaHatasi.length,
    consoleError: kayit.hata.length,
    bozukVarlik: kayit.bozukIstek.length,
    nanDeger: olcum ? olcum.nan : null,
    kameraKaymasi: olcum ? olcum.kameraKaymasi : null,
  };
}

/** Oyun içi ölçüm: NaN taraması, kamera, GPU sayaçları, savaş ilerlemesi. */
export async function olc(page) {
  return page.evaluate(() => {
    const P = window.__PARTY;
    const sayi = (v) => typeof v === 'number';
    const nanlar = [];
    const bak = (ad, v) => { if (sayi(v) && !Number.isFinite(v)) nanlar.push(ad); };
    for (const k of ['okcuCan', 'bruteCan', 'mageCan', 'priestCan', 'sure', 'kesim', 'seviye', 'sevKesim', 'puan', 'bolge', 'bolum', 'bolumKesim'])
      bak('D.' + k, P.D[k]);
    for (const kim of P.sabit.KIMLER) { bak('ulti.' + kim, P.D.ulti[kim]); bak('cd.' + kim, P.D.cd[kim]); }
    for (const m of P.D.moblar) { bak('mob.can', m.can); bak('mob.x', m.kok.position.x); bak('mob.z', m.kok.position.z); }
    for (const [ad, kh] of [['okcu', P.okcu], ['brute', P.brute], ['mage', P.mage], ['priest', P.priest]])
      if (kh) { bak(ad + '.x', kh.kok.position.x); bak(ad + '.z', kh.kok.position.z); }
    bak('altin', P.ENV.altin);

    return {
      nan: nanlar,
      sure: P.D.sure, kesim: P.D.kesim, seviye: P.D.seviye, altin: P.ENV.altin,
      bolge: P.D.bolge, bolum: P.D.bolum, bitti: P.D.bitti,
      mob: P.D.moblar.length, canliMob: P.D.moblar.filter((m) => m.durum !== 'olu').length,
      kahramanVar: !!(P.okcu && P.brute && P.mage && P.priest),
      kamera: P.kamera.position.toArray(),
      gpu: {
        geo: P.renderer.info.memory.geometries,
        doku: P.renderer.info.memory.textures,
        cizim: P.renderer.info.render.calls,
      },
      sahne: P.sahne.children.length,
      efekt: P.D.efektler.length,
      besteci: !!P.besteci,
      heap: performance.memory ? performance.memory.usedJSHeapSize : null,
    };
  });
}
