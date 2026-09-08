import mermaid from 'mermaid';

const diagrams = [...document.querySelectorAll<HTMLElement>('pre > code.language-mermaid')].map((code, index) => ({
  source: code.textContent ?? '',
  original: code.parentElement!,
  current: code.parentElement!,
  error: document.createElement('p'),
  index,
}));
let requestedTheme = '';
let rendering = false;

async function renderDiagrams() {
  requestedTheme = document.documentElement.dataset.wnTheme === 'dark' ? 'dark' : 'default';
  if (rendering || diagrams.length === 0) return;
  rendering = true;
  try {
    let renderedTheme;
    do {
      renderedTheme = requestedTheme;
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: renderedTheme as 'dark' | 'default' });
      for (const diagram of diagrams) {
        try {
          const { svg, bindFunctions } = await mermaid.render(`wn-diagram-${diagram.index}-${renderedTheme}`, diagram.source);
          const element = document.createElement('div');
          element.className = 'wn-diagram';
          element.dataset.theme = renderedTheme;
          element.innerHTML = svg;
          diagram.current.replaceWith(element);
          diagram.current = element;
          diagram.error.remove();
          bindFunctions?.(element);
        } catch {
          // Preserve the readable source if this diagram cannot be rendered.
          document.getElementById(`dwn-diagram-${diagram.index}-${renderedTheme}`)?.remove();
          diagram.current.replaceWith(diagram.original);
          diagram.current = diagram.original;
          diagram.error.textContent = '그림을 표시할 수 없어 원문 코드를 보여 줍니다.';
          diagram.error.setAttribute('role', 'status');
          diagram.original.before(diagram.error);
        }
      }
    } while (renderedTheme !== requestedTheme);
  } finally {
    rendering = false;
  }
}

window.addEventListener('wn-theme-change', () => { void renderDiagrams(); });
void renderDiagrams();
