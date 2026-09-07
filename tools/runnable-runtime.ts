import type { CodeRunner, RunContext } from "../vendor/runnable-code-blocks/src/contracts";
import { configureDomAdapter } from "../vendor/runnable-code-blocks/src/dom";
import { supportedLanguage } from "../vendor/runnable-code-blocks/src/language-catalog";
import { UnavailableRunner } from "../vendor/runnable-code-blocks/src/runner-registry";
import { BrowserJavaScriptRunner } from "../vendor/runnable-code-blocks/src/runners/javascript-runner";
import { BrowserTypeScriptRunner } from "../vendor/runnable-code-blocks/src/runners/typescript-runner";
import { BrowserPreviewRunner } from "../vendor/runnable-code-blocks/src/runners/browser-preview-runner";
import { PersonalCompilerRunner } from "../vendor/runnable-code-blocks/src/runners/personal-compiler-runner";
import { mountRunnableBlock } from "../vendor/runnable-code-blocks/src/ui";
import { BROWSER_DOM_ADAPTER } from "../vendor/runnable-code-blocks/site/browser-dom-adapter";

configureDomAdapter(BROWSER_DOM_ADAPTER);
const fetch_ = window.fetch.bind(window);

// A checked instance is retained for the run; a subsequent explicit refresh can
// repair configuration without replacing the user's editor or results.
function personalCompiler(language: string): CodeRunner {
  let endpoint: string | undefined;
  let runner: PersonalCompilerRunner | undefined;
  return {
    environment: "remote", language,
    async availability(context?: RunContext) {
      try {
        const configured = document.querySelector<HTMLMetaElement>('meta[name="rcb-personal-compiler-endpoint"]')?.content.trim();
        if (!configured) throw new Error("개인 컴파일러 주소가 설정되지 않았습니다.");
        if (configured !== endpoint) {
          runner = new PersonalCompilerRunner({ endpoint: configured, fetch: fetch_, language });
          endpoint = configured;
        }
        return await runner!.availability(context);
      } catch (error) {
        if (context?.signal?.aborted) throw error;
        return { available: false, reason: "misconfigured", detail: "개인 컴파일러 설정을 확인할 수 없습니다. 브라우저 예제는 계속 사용할 수 있어요." };
      }
    },
    async run(code, context) {
      if (!runner) throw new Error("개인 컴파일러를 먼저 확인해 주세요.");
      return await runner.run(code, context);
    }
  };
}

function createRunner(language: string): CodeRunner {
  if (language === "javascript") return new BrowserJavaScriptRunner();
  if (language === "typescript") return new BrowserTypeScriptRunner();
  if (language === "html" || language === "css" || language === "web" || language === "web-ts" || language === "react") return new BrowserPreviewRunner(language);
  if (supportedLanguage(language)?.localAdapter) return personalCompiler(language);
  return new UnavailableRunner(language, "browser", "이 언어는 현재 사이트에서 실행하지 않습니다. 코드는 계속 읽고 편집할 수 있어요.");
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
