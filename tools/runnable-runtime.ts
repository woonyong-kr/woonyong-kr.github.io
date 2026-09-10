import type { CodeRunner } from "../vendor/runnable-code-blocks/src/contracts";
import { configureDomAdapter } from "../vendor/runnable-code-blocks/src/dom";
import { UnavailableRunner } from "../vendor/runnable-code-blocks/src/runner-registry";
import { mountRunnableBlock } from "../vendor/runnable-code-blocks/src/ui";
import { createPrivateWebRunnerRegistry } from "../vendor/runnable-code-blocks/src/private-web-adapter";
import { BROWSER_DOM_ADAPTER } from "../vendor/runnable-code-blocks/site/browser-dom-adapter.mjs";

configureDomAdapter(BROWSER_DOM_ADAPTER);
const fetch_ = window.fetch.bind(window);

// Refresh the host configuration without replacing mounted editors or results.
const registry = createPrivateWebRunnerRegistry(() => ({
  fetch: fetch_,
  personalCompilerEndpoint: document.querySelector<HTMLMetaElement>('meta[name="rcb-personal-compiler-endpoint"]')?.content.trim()
}));

function createRunner(language: string): CodeRunner {
  return registry.create(language) ?? new UnavailableRunner(language, "browser", "이 언어는 현재 사이트에서 실행하지 않습니다. 코드는 계속 읽고 편집할 수 있어요.");
}

export function mount(code: HTMLElement, language: string) {
  const pre = code.parentElement!;
  const host = document.createElement("div");
  pre.before(host);
  try {
    const handle = mountRunnableBlock(host, { code: code.textContent ?? "", language, runner: createRunner(language) });
    pre.remove();
    return handle;
  } catch (error) {
    host.remove();
    throw error;
  }
}
