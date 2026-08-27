/** Playwright — party-rpg gerçek tarayıcı testi.
 *
 *  CLAUDE.md "Çalışma döngüsü" bölümü her değişiklikten sonra gerçek
 *  tarayıcı testi istiyor; bu dosya o kapıyı kurar.
 *
 *  webServer: repo kökünü servis eden mevcut sunucuyu kullanır. Zaten
 *  açıksa yenisini başlatmaz (reuseExistingServer) — geliştirici
 *  `npm run dev:party` ile çalışırken test koşmak serbest olsun diye.
 *
 *  Portrait projeler yalnız UI testini koşar; savaş/regression testi tek
 *  çözünürlükte koşar, çünkü dört kez koşmak aynı hatayı dört kez bulur.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 8123;

export default defineConfig({
  testDir: './experiments/party-rpg/tests',
  /* Oyun testleri zamana bağlı: paralel koşarsa aynı localStorage'ı ezerler. */
  fullyParallel: false,
  workers: 1,
  /* Savaş simülasyonu uzun sürebilir; tolerans testleri için bol zaman. */
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'regression',
      testMatch: /regression\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
    /* CLAUDE.md'deki dört portrait çözünürlüğü */
    ...[
      ['320x568', 320, 568],
      ['375x667', 375, 667],
      ['390x844', 390, 844],
      ['430x932', 430, 932],
    ].map(([ad, width, height]) => ({
      name: `ui-${ad}`,
      testMatch: /ui\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width, height }, isMobile: false },
    })),
  ],
  webServer: {
    command: `node tools/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}/experiments/party-rpg/index.html`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
