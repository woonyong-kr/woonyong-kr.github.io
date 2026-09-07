import { configureDomAdapter } from "../vendor/runnable-code-blocks/src/dom";
import {
  createStaticWebRunnerRegistry,
  enhanceRunnableCodeBlocks,
} from "../vendor/runnable-code-blocks/src/web-adapter";
import { BROWSER_DOM_ADAPTER } from "../vendor/runnable-code-blocks/site/browser-dom-adapter";

configureDomAdapter(BROWSER_DOM_ADAPTER);

const personalCompilerEndpoint = document
  .querySelector<HTMLMetaElement>('meta[name="rcb-personal-compiler-endpoint"]')
  ?.content.trim();

const registry = createStaticWebRunnerRegistry({
  fetch: window.fetch.bind(window),
  personalCompilerEndpoint,
  remoteExecutionEnabled: false,
});

enhanceRunnableCodeBlocks(document, registry);
