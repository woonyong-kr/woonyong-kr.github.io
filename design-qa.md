# Portfolio Selected Case — Design QA

## Evidence

- Source visual reference: `/Users/woonyong/Downloads/portfolio-concept-3-chronological-work-journal.png`
- Desktop implementation: `/tmp/woon-portfolio-architecture-thumbnail.png`
- Mobile implementation: `/tmp/woon-portfolio-selected-mobile-final.png`
- Route: `http://127.0.0.1:4173/#/portfolio`, dark theme, no modal
- Desktop capture: 1440 × 1800 CSS px, device scale factor 1
- Mobile capture: 500 × 2600 CSS px, device scale factor 1

## Current content contract

- The portfolio is an explicit selection, not a mirror of every work or blog entry.
- `portfolio: true` selects a project. Exactly one selected project is currently present: Kyro.
- A video must also carry its own `portfolio: true` flag. Only the Kyro public demo is selected.
- Blog posts, interviews, PintOS, MiniDB, Wecanverse, and the generic project table are not rendered on this route.
- Kyro owns its architecture gallery in `content/work/kyro.md`; adding or removing a diagram does not require editing the React component.

## Findings

- P0/P1/P2 residual findings: none.
- Hierarchy: `Selected Work → Architecture → Activity`. The rejected work-journal/blog archive structure is absent.
- Selected case: the card uses the provided Kyro Management EKS–Target EKS system architecture PNG as its representative thumbnail, with evidence metrics, role, year, and stack from content metadata.
- Architecture: three non-repeating real project diagrams are visible on the portfolio page: deployment-boundary redesign, diagnosis-input pipeline, and evaluation loop. Each links to the relevant project or evidence post.
- Activity: one selected Kyro demo is shown; unselected interviews are absent.
- Desktop: one selected case, three architecture cards, one activity card, and no horizontal overflow.
- Mobile: cards collapse to one column; diagrams remain fully contained; text wraps without clipping. The 500px-wide capture shows no horizontal clipping.
- Accessibility and interaction: semantic sections, headings, lists, figure captions, descriptive image alternatives, and one action per card are present. Architecture navigation succeeds. The video dialog opens with close-button focus and closes cleanly.
- Browser console: no application errors. Chrome-extension warnings were present and are unrelated to the site.

## Automated verification

- Portfolio Vitest: 3 tests passed.
- ESLint and style contract: passed.
- Content contract: the pinned project must include a non-empty architecture list; every selected diagram must include title, asset, alternative text, description, and valid internal link, and the asset must exist under `public/`.

final result: passed
