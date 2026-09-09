import { expect, test } from '@playwright/test';
import browserPages from '../fixtures/browser-pages.json' with { type: 'json' };

test.beforeEach(async ({ page, baseURL }) => {
  // The Index page also contains SQL; keep its capability probe on the test server.
  await page.addInitScript(endpoint => {
    new MutationObserver((_, observer) => {
      const meta = document.querySelector<HTMLMetaElement>('meta[name="rcb-personal-compiler-endpoint"]');
      if (meta) { meta.content = endpoint; observer.disconnect(); }
    }).observe(document, { childList: true, subtree: true });
  }, baseURL!);
});

for (const path of [browserPages.indexes, browserPages.btree, browserPages.cloud]) {
  const slug = path.split('/')[2];
  test(`@core ${slug} diagrams fit mobile and follow theme changes`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(path);
    await expect(page.locator('.wn-diagram svg').first()).toBeVisible();
    await expect(page.locator('code.language-mermaid')).toHaveCount(0);
    if (path === browserPages.cloud) await expect(page.locator('.wn-diagram svg')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await page.emulateMedia({ colorScheme: 'dark' });
    for (const diagram of await page.locator('.wn-diagram').all()) {
      await expect(diagram).toHaveAttribute('data-theme', 'dark');
      await expect(diagram.locator('svg')).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    expect(errors).toEqual([]);
  });
}

test('@core pages without diagrams do not request Mermaid', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/assets/js/diagrams/')) requests.push(request.url()); });
  await page.goto(browserPages.home);
  await expect(page.locator('#main-content h1')).toBeVisible();
  expect(requests).toEqual([]);
});

test('@core blocked Mermaid download preserves bounded source', async ({ page }) => {
  await page.route('**/assets/js/diagrams/**', route => route.abort());
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(browserPages.indexes);
  await expect(page.locator('code.language-mermaid')).toContainText('row_ref');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('@core invalid diagram preserves its source and explains the failure', async ({ page }) => {
  await page.route(`**${browserPages.indexes}`, async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace(/(<code class="language-mermaid">)[\s\S]*?(<\/code>)/u, '$1invalid-diagram-source$2');
    await route.fulfill({ response, body: html });
  });
  await page.goto(browserPages.indexes);
  await expect(page.getByText('그림을 표시할 수 없어 원문 코드를 보여 줍니다.', { exact: true })).toBeVisible();
  await expect(page.locator('code.language-mermaid')).toHaveText('invalid-diagram-source');
  await expect(page.locator('body > div[id^="dwn-diagram-"]')).toHaveCount(0);
});

test('@core no-JS diagram source stays inside the mobile page', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  try {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4177${browserPages.indexes}`);
    await expect(page.locator('code.language-mermaid')).toContainText('row_ref');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  } finally { await context.close(); }
});
