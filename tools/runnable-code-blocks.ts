import { createRunnerRegistry } from "../vendor/runnable-code-blocks/src/runner-composition";
import { enhanceRunnableCodeBlocks } from "../vendor/runnable-code-blocks/src/web-adapter";

const registry = createRunnerRegistry({
  executionOrder: "private-first",
  fetch: window.fetch.bind(window),
  personalCompilerEnabled: true,
  personalCompilerEndpoint: "https://runner.woonyong.com",
  remoteExecutionEnabled: false,
});

enhanceRunnableCodeBlocks(document, registry);
