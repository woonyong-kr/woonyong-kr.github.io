import { expect, test } from '@playwright/test';

for (const javaScriptEnabled of [true, false]) {
  test(`@core raw runnable source stays readable after resize with JavaScript ${javaScriptEnabled}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled, viewport: { width: 1440, height: 900 } });
    try {
      const page = await context.newPage();
      await page.route('**/assets/js/runnable/**', route => route.abort());
      await page.goto(`${baseURL}/wiki/platform-delivery-operations-topic-82e47b673856/`);
      await page.setViewportSize({ width: 375, height: 812 });
      const source = page.locator('pre > code.language-run-python');
      await expect(source).toContainText('겹치는 Subnet:');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
      await source.scrollIntoViewIfNeeded();
      const pre = source.locator('..');
      await expect(pre).toHaveCSS('overflow-x', 'auto');
      expect(await pre.evaluate(element => {
        element.scrollLeft = element.scrollWidth;
        return element.scrollLeft;
      })).toBeGreaterThan(0);
      await expect(page.locator('.rcb')).toHaveCount(0);
    } finally { await context.close(); }
  });
}
