import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { expect, test } from '@playwright/test';
import browserPages from '../fixtures/browser-pages.json' with { type: 'json' };

const preview = parse(readFileSync('_config.yml', 'utf8')).wiki_show_planned === true;

test('@core search keeps input typed before the index is ready and accepts Korean input events', async ({ page }) => {
  let releaseIndex!: () => void;
  const indexGate = new Promise<void>(resolve => { releaseIndex = resolve; });
  await page.route('**/assets/js/search-data.json*', async route => {
    await indexGate;
    await route.continue();
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(browserPages.home, { waitUntil: 'domcontentloaded' });
  const input = page.locator('#search-input');
  await input.fill('Big O');
  releaseIndex();
  await expect(page.locator('.search-result[href="/wiki/computer-science-big-o-33c1cf0fde3d/"]').first()).toBeVisible();
  // fill dispatches input without a synthetic keyup, as paste and IME commits can.
  await input.fill('충돌');
  await expect(page.locator('.search-result[href="/wiki/computer-science-topic-8d3fce7eee29/"]').first()).toBeVisible();
  await input.press('Escape');
  await expect(input).toHaveValue('');
  await expect(page.locator('html')).not.toHaveClass(/search-active/);
  expect(errors).toEqual([]);
});

test('@core Korean keyword aliases and language symbols remain searchable', async ({ page }) => {
  test.skip(!preview, 'The full planned keyword preview is disabled.');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(browserPages.home, { waitUntil: 'networkidle' });
  for (const [query, title] of [
    ['힙', 'Heap'], ['Heap', 'Heap'], ['리스트', 'Linked List'], ['List', 'Linked List'],
    ['클래스', 'Class'], ['Class', 'Class'], ['큐', 'Queue'], ['Queue', 'Queue'],
    ['그리드', 'Grid'], ['Grid', 'Grid'],
    ['C++', 'C++'], ['C#', 'C#'], ['.NET', '.NET'],
  ]) {
    await page.locator('#search-input').fill(query);
    await page.locator('#search-input').press('End');
    const titles = page.locator('.search-result-doc-title');
    await expect.poll(() => titles.allTextContents()).toContain(title);
  }
  expect(errors).toEqual([]);
});
