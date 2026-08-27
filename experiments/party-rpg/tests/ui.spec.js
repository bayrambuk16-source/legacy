/** UI / HUD — CLAUDE.md'deki dört portrait çözünürlükte.
 *  Her çözünürlük ayrı bir Playwright projesi olarak koşar (config'e bak).
 */
import { test, expect } from '@playwright/test';
import { oyunuAc, basla, kos } from './yardim.js';

test('portrait HUD: taşma / çakışma / yatay kaydırma yok', async ({ page }, testInfo) => {
  const kayit = await oyunuAc(page);
  await basla(page, 1);
  await kos(page, 6);

  const olcum = await page.evaluate(() => {
    const gor = (e) => { const s = getComputedStyle(e);
      return s.display !== 'none' && s.visibility !== 'hidden' && e.getBoundingClientRect().width > 0; };
    const ids = ['ust', 'expKutu', 'kahramanHud', 'solRay', 'sagRay', 'orsAc'];
    const el = ids.map((i) => document.getElementById(i)).filter((e) => e && gor(e))
      .map((e) => ({ i: e.id, r: e.getBoundingClientRect() }));

    const tasan = el.filter((o) => o.r.right > innerWidth + 0.5 || o.r.left < -0.5
      || o.r.bottom > innerHeight + 0.5 || o.r.top < -0.5).map((o) => o.i);

    /* 'ust' tam genişlikte bir şerit ve expKutu bilerek üstünde duruyor —
       ikisinin kesişmesi tasarım, çakışma sayılmaz. */
    const kes = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
    const cak = [];
    for (let a = 0; a < el.length; a++)
      for (let b = a + 1; b < el.length; b++)
        if (el[a].i !== 'ust' && el[b].i !== 'ust' && kes(el[a].r, el[b].r)) cak.push(el[a].i + '×' + el[b].i);

    return {
      gen: innerWidth, yuk: innerHeight,
      yatayKaydirma: document.documentElement.scrollWidth > innerWidth + 1,
      tasan, cakisan: cak,
      kartGen: [...document.querySelectorAll('.kart')].map((k) => Math.round(k.getBoundingClientRect().width)),
      canvas: [document.querySelector('#sahne canvas').clientWidth,
               document.querySelector('#sahne canvas').clientHeight],
    };
  });

  expect(olcum.yatayKaydirma, 'yatay kaydırma oluştu').toBe(false);
  expect(olcum.tasan, `ekran dışına taşan: ${olcum.tasan.join(', ')}`).toEqual([]);
  expect(olcum.cakisan, `çakışan: ${olcum.cakisan.join(', ')}`).toEqual([]);
  expect(olcum.canvas[0], 'canvas viewport genişliğine oturmadı').toBe(olcum.gen);
  expect(Math.min(...olcum.kartGen), 'kahraman kartı eziliyor').toBeGreaterThan(40);

  /* CLAUDE.md: görsel değişiklikte ekran görüntüsü üret */
  /* Sabit yola yaz: list reporter'da attachment kalici degil, gecen testin
     cikti klasoru siliniyor. CLAUDE.md ekran goruntusu URETILMESINI istiyor. */
  const ad = `hud-${olcum.gen}x${olcum.yuk}.png`;
  await page.screenshot({ path: `test-results/ekran/${ad}` });
  await testInfo.attach(ad, { body: await page.screenshot(), contentType: 'image/png' });

  expect(kayit.sayfaHatasi, `uncaught: ${kayit.sayfaHatasi.join(' | ')}`).toEqual([]);
});

test('menü ve panel ekran içinde açılıyor', async ({ page }, testInfo) => {
  await oyunuAc(page);
  await basla(page, 1);
  await kos(page, 3);

  const sonuc = await page.evaluate(() => {
    document.getElementById('menuBtn').click();
    const mi = document.getElementById('menuIzgara');
    /* Menü durumu HEMEN burada okunmalı: bir öğeye tıklamak menüyü kapatır,
       sonra bakılırsa hep 'kapalı' görünür (testin kendi tuzağıydı). */
    const menuAcik = getComputedStyle(mi).display !== 'none';
    const r = mi.getBoundingClientRect();
    const disari = r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5 || r.left < -0.5 || r.top < -0.5;
    const ilk = mi.querySelector('[data-p]');
    let panel = null;
    if (ilk) { ilk.click();
      const p = document.getElementById('panel'), pr = p.getBoundingClientRect();
      panel = { acik: getComputedStyle(p).display !== 'none',
        disari: pr.right > innerWidth + 0.5 || pr.left < -0.5,
        icerik: document.getElementById('panelIc').innerHTML.length }; }
    const x = document.getElementById('panelX'); if (x) x.click();
    return { menuAcik, menuDisari: disari, panel };
  });

  expect(sonuc.menuAcik, 'menü açılmadı').toBe(true);
  expect(sonuc.menuDisari, 'menü ekran dışına taştı').toBe(false);
  expect(sonuc.panel && sonuc.panel.disari, 'panel ekran dışına taştı').toBe(false);
  expect(sonuc.panel && sonuc.panel.icerik, 'panel içeriği boş').toBeGreaterThan(50);

  const g = await page.evaluate(() => innerWidth + 'x' + innerHeight);
  await page.screenshot({ path: `test-results/ekran/menu-${g}.png` });
  await testInfo.attach('menu.png', { body: await page.screenshot(), contentType: 'image/png' });
});
