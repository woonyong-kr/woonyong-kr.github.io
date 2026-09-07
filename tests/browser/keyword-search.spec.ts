import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { expect, test } from '@playwright/test';

const preview = parse(readFileSync('_config.yml', 'utf8')).wiki_show_planned === true;

test('@core Korean keyword aliases and language symbols remain searchable', async ({ page }) => {
  test.skip(!preview, 'The full planned keyword preview is disabled.');
  await page.goto('/wiki/home/', { waitUntil: 'networkidle' });
  for (const [query, title] of [
    ['힙', 'Heap'], ['Heap', 'Heap'], ['클래스', 'Class'], ['큐', 'Queue'],
    ['C++', 'C++'], ['C#', 'C#'], ['.NET', '.NET'],
  ]) {
    await page.locator('#search-input').fill(query);
    await page.locator('#search-input').press('End');
    const titles = page.locator('.search-result-doc-title');
    await expect.poll(() => titles.allTextContents()).toContain(title);
  }
});
