import { configureDomAdapter } from "../vendor/runnable-code-blocks/src/dom";
import { createRunnerRegistry } from "../vendor/runnable-code-blocks/src/runner-composition";
import { enhanceRunnableCodeBlocks } from "../vendor/runnable-code-blocks/src/web-adapter";
import { BROWSER_DOM_ADAPTER } from "../vendor/runnable-code-blocks/site/browser-dom-adapter";

configureDomAdapter(BROWSER_DOM_ADAPTER);

const registry = createRunnerRegistry({
  executionOrder: "private-first",
  fetch: window.fetch.bind(window),
  personalCompilerEnabled: true,
  personalCompilerEndpoint: "https://runner.woonyong.com",
  remoteExecutionEnabled: false,
});

enhanceRunnableCodeBlocks(document, registry);
