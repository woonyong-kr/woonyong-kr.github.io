import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { expect, test } from '@playwright/test';
import browserPages from '../fixtures/browser-pages.json' with { type: 'json' };

const preview = parse(readFileSync('_config.yml', 'utf8')).wiki_show_planned === true;

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
