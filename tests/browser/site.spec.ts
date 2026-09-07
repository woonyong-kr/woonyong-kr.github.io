import { expect, test, type Page } from '@playwright/test';
import retiredUrls from '../fixtures/retired-urls.json' with { type: 'json' };

const showcase = '/docs/ui-components/runnable-code-blocks/';
const api = 'http://127.0.0.1:4177';
async function configureRunner(page: Page, endpoint = api) {
  await page.addInitScript(endpoint => {
    new MutationObserver((_, observer) => {
      const meta = document.querySelector<HTMLMetaElement>('meta[name="rcb-personal-compiler-endpoint"]');
      if (meta) { meta.content = endpoint; observer.disconnect(); }
    }).observe(document, { childList: true, subtree: true });
  }, endpoint);
}
async function block(page: Page, language: string) {
  const mounted = page.locator(`.rcb[data-language="${language}"]`).first();
  await page.evaluate(language => {
    document.querySelector(`pre > code.language-run-${language}`)?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, language);
  await expect(mounted).toBeVisible();
  const identity = crypto.randomUUID();
  await mounted.evaluate((element, identity) => { (element as HTMLElement).dataset.testBlock = identity; }, identity);
  return page.locator(`[data-test-block="${identity}"]`);
}

test('@core documents, search and theme survive blocked runner downloads', async ({ page }) => {
  await page.route('**/assets/js/runnable/**', route => route.abort());
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko-KR');
  await expect(page.locator('h1')).toContainText('개발 Wiki');
  const github = page.locator('.wn-header-action--github:visible');
  await expect(github).toHaveAttribute('href', 'https://github.com/woonyong-kr');
  await page.locator('.wn-header-action--theme:visible').click();
  await expect(page.locator('html')).toHaveAttribute('data-wn-theme', 'dark');
  await page.locator('#search-input').pressSequentially('Runnable');
  await expect(page.locator('.search-result').first()).toBeVisible();
  await page.goto(showcase);
  await expect(page.locator('pre > code.language-run-javascript')).toBeAttached();
});

for (const width of [375, 1440]) {
  test(`@core first paint, page-local theme selection and focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    // A module held indefinitely cannot delay the independent header controls.
    await page.route('**/assets/js/runnable/loader.js*', () => {});
    await page.goto('/', { waitUntil: 'commit' });
    await expect(page.locator('.wn-header-action--theme:visible')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-wn-theme', 'dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(39, 38, 43)');
    const theme = page.locator('.wn-header-action--theme:visible');
    await theme.focus();
    await expect(theme).toHaveCSS('outline-style', 'solid');
    await theme.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-wn-theme', 'light');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-wn-theme', 'light');
    await expect(page.locator('body')).toHaveCSS('transition-duration', '0s');
    await page.reload({ waitUntil: 'commit' });
    await expect(page.locator('html')).toHaveAttribute('data-wn-theme', 'dark');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('@core no-JS documents retain GitHub and system theme', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto(`${api}/`);
  await expect(page.locator('.wn-header-action--github:visible')).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(39, 38, 43)');
  await expect(page.getByRole('link', { name: 'Wiki 열기' })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(page.locator('.wn-header-action--github:visible')).toBeVisible();
  await context.close();
});

test('plain documents request no editor/runtime or personal service; viewport loading defers React and TypeScript', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/wiki/home/');
  await page.waitForLoadState('networkidle');
  expect(requests.filter(url => /runnable-runtime-|virtual_react|\/esm-|\/v1\//.test(url))).toEqual([]);
  expect(await page.locator('link[rel="stylesheet"][href*="just-the-docs-"]:not(#jtd-head-nav-stylesheet)').count()).toBe(2);
  requests.length = 0;
  await configureRunner(page);
  await page.goto(showcase);
  // Browser intersection delivery has occurred once the first visible editor mounts.
  const js = await block(page, 'javascript');
  expect(await page.locator('.rcb[data-language="java"]').count()).toBe(0);
  expect(requests.filter(url => /virtual_react|\/esm-|\/v1\/run/.test(url))).toEqual([]);
  await js.locator('.cm-content').fill('console.log("browser-ok")');
  await js.getByRole('button', { name: 'Run code', exact: true }).click();
  await expect(js.locator('.rcb__output')).toContainText('browser-ok');
  expect(requests.filter(url => /virtual_react|\/esm-/.test(url))).toEqual([]);
  const ts = await block(page, 'typescript');
  await ts.getByRole('button', { name: 'Run code', exact: true }).click();
  await expect(ts).toHaveAttribute('data-state', 'success');
  expect(requests.some(url => /\/esm-/.test(url))).toBe(true);
  expect(requests.some(url => /virtual_react/.test(url))).toBe(false);
  const react = await block(page, 'react');
  await react.locator('.cm-content').fill('export default function App() { return <p>React on demand</p>; }');
  await react.getByRole('button', { name: 'Run code', exact: true }).click();
  await expect(react.locator('.rcb__console-meta')).toContainText('Preview ready');
  await expect(react.locator('iframe').contentFrame().locator('#preview').contentFrame().getByText('React on demand')).toBeVisible();
  expect(requests.some(url => /virtual_react/.test(url))).toBe(true);
});

test('@core browser preview can stop and restart', async ({ page }) => {
  await configureRunner(page);
  await page.goto(showcase);
  const web = await block(page, 'web');
  await web.locator('.cm-content').fill('<button onclick="this.textContent=\'clicked\'">preview</button>');
  await web.getByRole('button', { name: 'Run code', exact: true }).click();
  await expect(web.locator('.rcb__console-meta')).toContainText('Preview ready');
  const preview = web.locator('iframe').contentFrame().locator('#preview').contentFrame();
  await preview.getByRole('button', { name: 'preview' }).click();
  await expect(preview.getByRole('button', { name: 'clicked' })).toBeVisible();
  await web.getByRole('button', { name: '중단' }).click();
  await expect(web.locator('iframe')).toHaveCount(0);
  await web.getByRole('button', { name: 'Run code', exact: true }).click();
  await expect(web.locator('.rcb__console-meta')).toContainText('Preview ready');
});

test('@core offline recovery and corrected endpoint retain edited source and avoid automatic execution', async ({ page }) => {
  await configureRunner(page, 'invalid-endpoint');
  let runs = 0;
  page.on('request', request => { if (request.url().endsWith('/v1/run')) runs++; });
  await page.goto(showcase);
  const java = await block(page, 'java');
  await expect(java).toHaveAttribute('data-state', 'unavailable');
  await java.locator('.cm-content').fill('edited source');
  await page.evaluate(endpoint => { document.querySelector<HTMLMetaElement>('meta[name="rcb-personal-compiler-endpoint"]')!.content = endpoint; }, api);
  await page.context().setOffline(true);
  await java.getByRole('button', { name: '다시 확인' }).click();
  await expect(java.getByRole('button', { name: '다시 확인' })).toBeEnabled();
  await page.context().setOffline(false);
  await expect(java.getByRole('button', { name: 'Run code', exact: true })).toBeEnabled();
  await expect(java.locator('.cm-content')).toContainText('edited source');
  expect(runs).toBe(0);
  await java.getByRole('button', { name: 'Run code', exact: true }).click();
  await expect(java.locator('.rcb__output')).toContainText('server-ok');
  expect(runs).toBe(1);
});

test('429 shows Retry-After; a stalled body can be cancelled without claiming server cancellation', async ({ page }) => {
  await configureRunner(page);
  let mode = 'rate-limit';
  let runs = 0;
  await page.route('**/v1/run', route => { runs++; return route.continue({ headers: { ...route.request().headers(), 'x-test-response': mode } }); });
  await page.goto(showcase);
  const java = await block(page, 'java');
  await java.getByRole('button', { name: 'Run code', exact: true }).click();
  await expect(java.locator('.rcb__notice')).toContainText('1초');
  expect(runs).toBe(1);
  await expect(java.getByRole('button', { name: '다시 확인' })).toBeDisabled();
  await expect(java.getByRole('button', { name: '다시 확인' })).toBeEnabled();
  await java.getByRole('button', { name: '다시 확인' }).click();
  mode = 'body';
  await java.getByRole('button', { name: 'Run code', exact: true }).click();
  await expect.poll(() => runs).toBe(2);
  await java.getByRole('button', { name: '중단' }).click();
  await expect(java.locator('.rcb__output')).toContainText('서버 작업의 종료 여부는 확인되지 않았습니다');
  await expect(java.getByRole('button', { name: 'Run code', exact: true })).toBeEnabled();
});

test('a stalled response ends within the complete 22-second deadline and truncated JSON releases the UI', async ({ page }) => {
  await configureRunner(page);
  let mode = 'body';
  await page.route('**/v1/run', route => route.continue({ headers: { ...route.request().headers(), 'x-test-response': mode } }));
  await page.goto(showcase);
  const java = await block(page, 'java');
  const started = Date.now();
  await java.getByRole('button', { name: 'Run code', exact: true }).click();
  await expect(java).toHaveAttribute('data-state', 'error', { timeout: 25_000 });
  expect(Date.now() - started).toBeLessThan(25_000);
  await expect(java.getByRole('button', { name: 'Run code', exact: true })).toBeEnabled();
  mode = 'truncated';
  await java.getByRole('button', { name: 'Run code', exact: true }).click();
  await expect(java).toHaveAttribute('data-state', 'error');
  await expect(java.getByRole('button', { name: 'Run code', exact: true })).toBeEnabled();
});

test('retired demos really return 404 with Korean navigation', async ({ page, request }) => {
  for (const url of retiredUrls) expect((await request.get(url)).status(), url).toBe(404);
  const response = await page.goto('/docs/configuration/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('찾을 수 없습니다');
  await expect(page.locator('#main-content').getByRole('link', { name: '홈', exact: true })).toBeVisible();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`readable normal text, buttons and editor tokens in ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await configureRunner(page);
    await page.goto('/');
    async function checkContrast(selector: string) {
      const ratios = await page.locator(selector).evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().width > 0).map(el => {
        const rgba = (value: string) => value.match(/[\d.]+/g)!.map(Number);
        let background = [255, 255, 255];
        const ancestors: Element[] = [];
        for (let node: Element | null = el; node; node = node.parentElement) ancestors.unshift(node);
        for (const node of ancestors) {
          const [r, g, b, alpha = 1] = rgba(getComputedStyle(node).backgroundColor);
          background = [r, g, b].map((value, i) => value * alpha + background[i] * (1 - alpha));
        }
        const foreground = rgba(getComputedStyle(el).color);
        const luminance = (rgb: number[]) => rgb.slice(0, 3).map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
        const a = luminance(foreground), b = luminance(background);
        return { text: el.textContent?.slice(0, 45), ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
      }));
      expect(ratios.length).toBeGreaterThan(0);
      for (const value of ratios) expect(value.ratio, `${scheme}: ${value.text}`).toBeGreaterThanOrEqual(4.5);
    }
    await checkContrast('#main-content p, #main-content .btn');
    await page.goto(showcase);
    const js = await block(page, 'javascript');
    await js.locator('.cm-content').fill('// comment\nconst value = "string"; console.log(value + 42);');
    await checkContrast('.rcb[data-language="javascript"] .cm-content span, .rcb[data-language="javascript"] .rcb__language, .rcb[data-language="javascript"] .rcb__environment-name');
  });
}

test('capability header timeout exposes recovery after 2.5 seconds', async ({ page }) => {
  await configureRunner(page);
  let stalled = true;
  await page.route('**/v1/capabilities', route => route.continue({ headers: { ...route.request().headers(), ...(stalled ? { 'x-test-response': 'headers' } : {}) } }));
  await page.goto(showcase);
  const started = Date.now();
  const java = await block(page, 'java');
  await expect(java).toHaveAttribute('data-state', 'unavailable', { timeout: 4_000 });
  expect(Date.now() - started).toBeLessThan(4_500);
  stalled = false;
  await java.getByRole('button', { name: '다시 확인' }).click();
  await expect(java.getByRole('button', { name: 'Run code', exact: true })).toBeEnabled();
});

test('@core expanded navigation reports its state and toggles with the keyboard', async ({ page }) => {
  await page.goto('/wiki/pintos/');
  const expanded = page.locator('#site-nav li.nav-list-item.active > button.nav-list-expander');
  expect(await expanded.count()).toBeGreaterThan(0);
  for (const button of await expanded.all()) await expect(button).toHaveAttribute('aria-expanded', 'true');
  const button = page.getByRole('button', { name: 'OS submenu', exact: true });
  const children = button.locator('..').locator(':scope > ul');
  await expect(children).toBeVisible();
  await button.focus();
  await button.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(children).toBeHidden();
  await button.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(children).toBeVisible();
});

test('a failed cold module leaves readable code and offers working reload recovery', async ({ page }) => {
  let blocked = true;
  await configureRunner(page);
  await page.route('**/runnable-runtime-*.js', route => blocked ? route.abort() : route.continue());
  await page.goto(showcase);
  const code = page.locator('pre > code.language-run-javascript');
  await code.scrollIntoViewIfNeeded();
  await expect(code).toContainText('console');
  const retry = code.locator('..').locator('xpath=following-sibling::button[1]');
  await expect(retry).toContainText('페이지 새로고침');
  await expect(page.locator('.wn-header-action--theme:visible')).toBeVisible();
  blocked = false;
  await Promise.all([page.waitForEvent('domcontentloaded'), retry.click()]);
  const js = await block(page, 'javascript');
  await expect(js.getByRole('button', { name: 'Run code', exact: true })).toBeEnabled();
});
