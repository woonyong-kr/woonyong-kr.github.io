import { parseRunnableFence } from "../vendor/runnable-code-blocks/src/contracts";
import type { MountedRunnableBlock } from "../vendor/runnable-code-blocks/src/ui";

const mounted = new Set<MountedRunnableBlock>();
const pending = new WeakSet<Element>();
let runtime: ReturnType<typeof importRuntime> | undefined;
let disposed = false;
const importRuntime = () => import("./runnable-runtime");

async function prepare(code: HTMLElement) {
  if (pending.has(code) || !code.isConnected || disposed) return;
  const language = [...code.classList].map(value => value.startsWith("language-") ? parseRunnableFence(value.slice(9)) : null).find(Boolean);
  if (!language) return;
  pending.add(code);
  const pre = code.parentElement!;
  let notice = pre.nextElementSibling?.matches(".wn-runner-retry") ? pre.nextElementSibling as HTMLButtonElement : null;
  try {
    runtime ??= importRuntime().catch(error => { runtime = undefined; throw error; });
    const module = await runtime;
    if (disposed || !code.isConnected) return;
    const handle = module.mount(code, language);
    notice?.remove();
    mounted.add(handle);
    observer?.unobserve(code);
  } catch {
    pending.delete(code);
    if (disposed || !code.isConnected) return;
    if (!notice) {
      notice = document.createElement("button");
      notice.className = "wn-runner-retry btn";
      notice.type = "button";
      // Browsers cache failed module imports for the document lifetime. A cold
      // import failure has no mounted editors; reload is the honest recovery.
      const needsReload = runtime === undefined;
      notice.textContent = needsReload ? "실행기 준비 실패 · 페이지 새로고침" : "실행기 준비 실패 · 다시 시도";
      notice.addEventListener("click", () => { if (needsReload) location.reload(); else void prepare(code); });
      pre.after(notice);
    }
  }
}

const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) void prepare(entry.target as HTMLElement);
}, { rootMargin: "200px" });

function discover() {
for (const code of document.querySelectorAll<HTMLElement>('pre > code[class*="language-run-"]')) {
  observer?.observe(code);
  code.parentElement?.addEventListener("pointerdown", () => { void prepare(code); }, { once: true });
  if (code.parentElement) code.parentElement.tabIndex = 0;
  code.parentElement?.addEventListener("focusin", () => { void prepare(code); }, { once: true });
  if (!observer) void prepare(code);
}
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", discover, { once: true });
else discover();

const refresh = () => { if (document.visibilityState === "visible") for (const handle of mounted) void handle.refreshAvailability(); };
window.addEventListener("online", refresh);
window.addEventListener("pageshow", refresh);
document.addEventListener("visibilitychange", refresh);
window.addEventListener("pagehide", event => {
  if (event.persisted) return;
  disposed = true;
  observer?.disconnect();
  for (const handle of mounted) handle.dispose();
  mounted.clear();
  window.removeEventListener("online", refresh);
  window.removeEventListener("pageshow", refresh);
  document.removeEventListener("visibilitychange", refresh);
});
