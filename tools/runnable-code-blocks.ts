import { createRunnerRegistry } from "../vendor/runnable-code-blocks/src/runner-composition";
import { enhanceRunnableCodeBlocks } from "../vendor/runnable-code-blocks/src/web-adapter";

const registry = createRunnerRegistry({
  executionOrder: "browser-first",
  fetch: window.fetch.bind(window),
  remoteExecutionEnabled: true,
});

enhanceRunnableCodeBlocks(document, registry);
