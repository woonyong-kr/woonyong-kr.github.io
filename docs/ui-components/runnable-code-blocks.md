---
layout: default
title: Runnable Code Blocks
parent: UI Components
nav_order: 8
---

# Runnable Code Blocks

이 페이지는 WN Docs의 24개 `run-<language>` fenced block이 실제로 mount되고 실행되는지
언어별로 확인하는 공개 smoke-test 페이지입니다. **Run**을 누르기 전에는 어떤 코드도
실행하거나 전송하지 않습니다. 코드는 수정한 뒤 다시 실행할 수 있지만, 그 변경은 이
페이지의 Markdown에 저장되지 않습니다.

## 실행 경계

| 구분 | 언어 | 실행 위치 |
|:--|:--|:--|
| 브라우저 | JavaScript, TypeScript | sandboxed Web Worker / browser transpile |
| 브라우저 preview | HTML, CSS | script·network가 차단된 sandboxed iframe |
| 브라우저 상호작용 | React (JSX/TSX), Web (HTML/CSS/JS), Web (HTML/CSS/TypeScript) | script만 허용한 isolated iframe |
| 명시된 provider | Kotlin | Kotlin Playground |
| 명시된 provider | Dart | DartPad compile → isolated frame |
| 명시된 provider | Swift | SwiftFiddle |
| 명시된 provider | Python, SQL, Java, C, C++, Go, Rust, C#, Ruby, PHP, R, Scala, Lua, Shell | Wandbox |

외부 provider를 사용하는 언어는 Run을 누를 때 source가 해당 provider로 전송됩니다.
네트워크·provider 제한·컴파일러 변경 때문에 실패하거나 시간이 걸릴 수 있으며, 실패한
실행을 다른 provider로 자동 재시도하지 않습니다.

`run-react`, `run-web`, `run-web-ts`는 iframe 안에서만 script를 실행합니다. 네트워크 요청,
외부 리소스, 팝업, form 제출, top navigation, same-origin 접근은 허용하지 않으며,
`console.log`와 runtime 오류는 Output으로 전달됩니다. `run-react`는 bundle에 포함된
React와 ReactDOM만 사용할 수 있고, `react`, `react-dom`, `react-dom/client` 이외의 import와
상대 경로 multi-file import는 거부합니다.

## 신뢰·sandbox 경계

Run은 사용자가 누른 시점에만 실행되며, 이 공개 문서의 관리된 Markdown처럼 신뢰한 코드에만
사용해야 합니다. 비밀값, 개인 데이터, 제3자가 제공한 임의 코드를 붙여 넣어 실행하는 기능은
아닙니다. 실행 결과는 host와 분리된 중첩 iframe 안에서 렌더링됩니다. 바깥 iframe은 메시지
전달을 위해 `allow-scripts`만 허용하고, 대화형 preview의 안쪽 iframe도 `allow-scripts`만
허용합니다. 둘 모두 `allow-same-origin` 없이 opaque origin으로 동작하며 CSP로 network,
form, popup, top navigation, object 및 외부 resource를 차단합니다. 이 제약은 host 문서를
보호하지만, 실행 버튼을 누르는 행위 자체가 신뢰하지 않는 코드를 안전하게 만드는 것은 아닙니다.

## Browser runners

아래 예제는 실행 방식을 섞지 않습니다. React는 **모션**, **상태 파생**, **접근 가능한
modal**을 각각 하나의 독립된 block으로 나눴고, HTML·CSS는 독립 preview, Web·Web-TS는
사용자 입력을 받는 작은 인터랙션을 렌더링합니다. 따라서 한 예제를 고쳐도 다른 개념의
결과가 같이 바뀌지 않습니다.

### React 1 — Motion landing

카드의 진입·hover·선택 전환만 다루는 React 모션 예제입니다. `prefers-reduced-motion`도
함께 확인할 수 있습니다.

{% raw %}
```run-react
import { useState } from "react";

const routes = [
  { id: "shape", label: "SHAPE", title: "Find the rhythm", copy: "여백과 대비를 먼저 맞춥니다." },
  { id: "motion", label: "MOTION", title: "Guide the next move", copy: "짧은 전환으로 다음 행동을 알립니다." },
  { id: "detail", label: "DETAIL", title: "Leave a clear trace", copy: "선택된 상태를 분명하게 남깁니다." }
];

export default function MotionLanding() {
  const [selected, setSelected] = useState("shape");

  return (
    <section className="motion-example" aria-label="React motion landing example">
      <style>{`
        * { box-sizing: border-box; }
        .motion-example { position: relative; isolation: isolate; overflow: hidden; max-width: 760px; padding: clamp(22px, 5vw, 44px); border: 1px solid rgb(255 255 255 / 13%); border-radius: 28px; background: #111a16; color: #f0fff5; box-shadow: 0 28px 70px rgb(0 0 0 / 28%); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
        .motion-example::before { position: absolute; z-index: -1; top: -150px; right: -90px; width: 350px; height: 350px; border-radius: 999px; background: radial-gradient(circle, rgb(0 217 112 / 34%), transparent 68%); content: ""; animation: orbit 10s ease-in-out infinite alternate; }
        .motion-kicker { display: inline-flex; align-items: center; gap: 9px; margin: 0; color: #8dffba; font-size: 11px; font-weight: 800; letter-spacing: .14em; }
        .motion-kicker::before { width: 9px; height: 9px; border-radius: 50%; background: #00d970; box-shadow: 0 0 0 6px rgb(0 217 112 / 12%); content: ""; animation: pulse 1.8s ease-out infinite; }
        .motion-title { max-width: 620px; margin: 18px 0 12px; font-size: clamp(38px, 8vw, 70px); letter-spacing: -.07em; line-height: .92; }
        .motion-copy { max-width: 500px; margin: 0; color: #b8ccbe; line-height: 1.65; }
        .motion-route-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 34px; }
        .motion-route { min-height: 176px; padding: 18px; border: 1px solid rgb(255 255 255 / 10%); border-radius: 18px; background: rgb(255 255 255 / 5%); color: inherit; cursor: pointer; text-align: left; transition: transform 220ms cubic-bezier(.22, 1, .36, 1), border-color 220ms ease, background-color 220ms ease; animation: enter 560ms both; }
        .motion-route:nth-child(2) { animation-delay: 80ms; } .motion-route:nth-child(3) { animation-delay: 160ms; }
        .motion-route:hover { transform: translateY(-5px); border-color: rgb(141 255 186 / 55%); background: rgb(0 217 112 / 10%); }
        .motion-route[aria-pressed="true"] { border-color: #00d970; background: linear-gradient(145deg, rgb(0 217 112 / 20%), rgb(255 255 255 / 5%)); box-shadow: 0 16px 32px rgb(0 0 0 / 18%); }
        .motion-route:focus-visible { outline: 3px solid #b8ffce; outline-offset: 3px; }
        .motion-route small { color: #8dffba; font-weight: 800; letter-spacing: .12em; } .motion-route h2 { margin: 38px 0 8px; font-size: 19px; letter-spacing: -.04em; } .motion-route p { margin: 0; color: #b8ccbe; font-size: 13px; line-height: 1.55; }
        .motion-selection { margin: 22px 0 0; color: #b8ccbe; font-size: 13px; } .motion-selection strong { color: #f0fff5; }
        @keyframes orbit { to { transform: translate3d(-34px, 30px, 0) scale(1.12); } } @keyframes pulse { 50% { box-shadow: 0 0 0 12px rgb(0 217 112 / 0%), 0 0 24px rgb(0 217 112 / 64%); } } @keyframes enter { from { opacity: 0; transform: translateY(18px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (max-width: 620px) { .motion-route-list { grid-template-columns: 1fr; } .motion-route { min-height: 136px; } .motion-route h2 { margin-top: 22px; } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
      `}</style>
      <p className="motion-kicker">MOTION STUDY · REACT</p>
      <h1 className="motion-title">Make the next move obvious.</h1>
      <p className="motion-copy">카드를 선택해 hover, 선택 상태, staggered entrance가 한 화면에서 어떻게 연결되는지 확인하세요.</p>
      <div className="motion-route-list">
        {routes.map((route) => (
          <button key={route.id} className="motion-route" type="button" aria-pressed={selected === route.id} onClick={() => setSelected(route.id)}>
            <small>{route.label}</small><h2>{route.title}</h2><p>{route.copy}</p>
          </button>
        ))}
      </div>
      <p className="motion-selection">Selected motion route: <strong>{routes.find((route) => route.id === selected)?.label}</strong></p>
    </section>
  );
}
```
{% endraw %}

### React 2 — State dashboard

완료 항목 배열 하나로 진행률·남은 항목·선택 표시를 파생하는 예제입니다. 모션이나 modal을
섞지 않아 state 변경과 렌더 결과의 관계를 바로 확인할 수 있습니다.

{% raw %}
```run-react
import { useMemo, useState } from "react";

const tasks = [
  { id: "draft", label: "Draft the flow", time: "12 min" },
  { id: "test", label: "Test the interaction", time: "08 min" },
  { id: "ship", label: "Ship the detail", time: "05 min" }
];

export default function StateDashboard() {
  const [completedIds, setCompletedIds] = useState(["draft"]);
  const summary = useMemo(() => ({
    done: completedIds.length,
    remaining: tasks.length - completedIds.length,
    percent: Math.round((completedIds.length / tasks.length) * 100)
  }), [completedIds]);

  function toggleTask(id) {
    setCompletedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  return (
    <section className="state-example" aria-label="React state dashboard example">
      <style>{`
        * { box-sizing: border-box; } .state-example { max-width: 720px; padding: clamp(20px, 4vw, 34px); border: 1px solid #d9e5dd; border-radius: 24px; background: linear-gradient(135deg, #f7fcf8, #eff8f2); color: #153122; font-family: Inter, ui-sans-serif, system-ui, sans-serif; box-shadow: 0 18px 44px rgb(16 71 38 / 10%); } .state-top { display: flex; align-items: end; justify-content: space-between; gap: 16px; } .state-kicker { margin: 0 0 8px; color: #087e41; font-size: 11px; font-weight: 800; letter-spacing: .13em; } .state-title { margin: 0; font-size: clamp(28px, 5vw, 40px); letter-spacing: -.05em; } .state-score { color: #087e41; font-size: 30px; font-weight: 850; letter-spacing: -.06em; } .state-progress { height: 10px; margin: 26px 0 10px; overflow: hidden; border-radius: 999px; background: #dcece1; } .state-progress span { display: block; width: ${summary.percent}%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #00863f, #00c967); transition: width 260ms cubic-bezier(.22, 1, .36, 1); } .state-meta { display: flex; justify-content: space-between; color: #55705f; font-size: 13px; } .state-list { display: grid; gap: 10px; margin: 24px 0 0; } .state-task { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 13px; width: 100%; min-height: 66px; padding: 12px 15px; border: 1px solid #dbe8df; border-radius: 15px; background: #fff; color: #153122; cursor: pointer; text-align: left; transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease; } .state-task:hover { transform: translateY(-2px); border-color: #73c996; box-shadow: 0 9px 20px rgb(16 71 38 / 9%); } .state-task:focus-visible { outline: 3px solid #40b76e; outline-offset: 3px; } .state-check { display: grid; width: 24px; height: 24px; place-items: center; border: 1px solid #a9cdb5; border-radius: 50%; color: transparent; font-weight: 850; transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease; } .state-task[data-done="true"] .state-check { border-color: #00863f; background: #00863f; color: #fff; } .state-task[data-done="true"] .state-label { color: #51715d; text-decoration: line-through; } .state-label { font-weight: 760; } .state-time { color: #6a8373; font-size: 12px; font-weight: 700; } @media (max-width: 460px) { .state-top { align-items: start; flex-direction: column; } .state-score { font-size: 25px; } }
      `}</style>
      <header className="state-top"><div><p className="state-kicker">DERIVED STATE · REACT</p><h1 className="state-title">A clear release checklist.</h1></div><strong className="state-score">{summary.percent}%</strong></header>
      <div className="state-progress" role="progressbar" aria-label="완료 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow={summary.percent}><span /></div>
      <div className="state-meta"><span>{summary.done} of {tasks.length} complete</span><span>{summary.remaining} remaining</span></div>
      <div className="state-list">{tasks.map((task) => { const isDone = completedIds.includes(task.id); return <button key={task.id} className="state-task" type="button" data-done={isDone} aria-pressed={isDone} onClick={() => toggleTask(task.id)}><span className="state-check" aria-hidden="true">✓</span><span className="state-label">{task.label}</span><span className="state-time">{task.time}</span></button>; })}</div>
    </section>
  );
}
```
{% endraw %}

### React 3 — Accessible modal

열기·닫기·`Escape`·초기 focus를 한 예제에만 둔 modal입니다. 닫힌 dialog는 DOM에서 제거되어
tab 순서에 남지 않습니다.

{% raw %}
```run-react
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";

export default function AccessibleModal() {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => { window.removeEventListener("keydown", closeOnEscape); window.cancelAnimationFrame(frame); };
  }, [isOpen]);

  return (
    <section className="modal-example" aria-label="Accessible React modal example">
      <style>{`
        * { box-sizing: border-box; } .modal-example { max-width: 680px; padding: clamp(22px, 5vw, 40px); border: 1px solid rgb(255 255 255 / 12%); border-radius: 24px; background: #202125; color: #f8f8fb; font-family: Inter, ui-sans-serif, system-ui, sans-serif; box-shadow: 0 24px 60px rgb(0 0 0 / 23%); } .modal-kicker { margin: 0 0 10px; color: #a7b0ff; font-size: 11px; font-weight: 800; letter-spacing: .13em; } .modal-title { margin: 0; font-size: clamp(30px, 5vw, 46px); letter-spacing: -.055em; } .modal-copy { max-width: 480px; margin: 16px 0 26px; color: #c7c8d2; line-height: 1.65; } .modal-open, .modal-close { min-height: 46px; border: 0; border-radius: 12px; cursor: pointer; font: inherit; font-weight: 800; } .modal-open { padding: 0 18px; background: #8090ff; color: #121522; box-shadow: 0 10px 24px rgb(128 144 255 / 26%); transition: transform 180ms ease, box-shadow 180ms ease; } .modal-open:hover { transform: translateY(-2px); box-shadow: 0 14px 30px rgb(128 144 255 / 36%); } .modal-open:focus-visible, .modal-close:focus-visible { outline: 3px solid #d6dcff; outline-offset: 3px; } .modal-backdrop { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; padding: 20px; background: rgb(9 10 15 / 72%); backdrop-filter: blur(10px); } .modal-dialog { width: min(100%, 420px); padding: 26px; border: 1px solid rgb(255 255 255 / 16%); border-radius: 20px; background: #2a2c35; box-shadow: 0 30px 80px rgb(0 0 0 / 46%); animation: modal-in 220ms cubic-bezier(.22, 1, .36, 1); } .modal-dialog h2 { margin: 14px 0 9px; font-size: 28px; letter-spacing: -.045em; } .modal-dialog p { margin: 0 0 22px; color: #c7c8d2; line-height: 1.6; } .modal-close { width: 100%; background: #f3f4fb; color: #252733; } @keyframes modal-in { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } } @media (prefers-reduced-motion: reduce) { * { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
      `}</style>
      <p className="modal-kicker">FOCUS + ESCAPE · REACT</p><h1 className="modal-title">A dialog should leave cleanly.</h1><p className="modal-copy">Open을 누른 뒤 `Escape`를 눌러 보세요. modal이 닫히면 React가 dialog를 render하지 않아 keyboard focus도 함께 사라집니다.</p>
      <button className="modal-open" type="button" onClick={() => setIsOpen(true)}>Open release note</button>
      {isOpen && createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={() => setIsOpen(false)}><article className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-heading" onMouseDown={(event) => event.stopPropagation()}><p className="modal-kicker">RELEASE NOTE</p><h2 id="modal-heading">Keyboard first.</h2><p>초기 focus는 닫기 버튼으로 이동하고, `Escape`와 backdrop click 모두 dialog를 닫습니다.</p><button ref={closeButtonRef} className="modal-close" type="button" onClick={() => setIsOpen(false)}>Close dialog</button></article></div>, document.body)}
      <small style={{ display: "block", marginTop: "18px", color: "#9fa4b8" }}>{typeof createRoot === "function" ? "ReactDOMClient ready" : "Loading renderer"}</small>
    </section>
  );
}
```
{% endraw %}

### JavaScript — Web Worker output

DOM 없이 계산과 `console.log` 결과만 확인하는 JavaScript 예제입니다.

```run-javascript
const samples = ["HTML", "CSS", "JavaScript"];
const report = samples.reduce(
  (state, name) => ({ ...state, [name]: `${name} example ready` }),
  {}
);

console.log(Object.values(report).join("\n"));
```

### TypeScript — browser transpile

type 검사 가능한 TypeScript를 browser에서 transpile해 Output으로 확인합니다.

```run-typescript
type Check = { name: string; passed: boolean };

const checks: Check[] = [
  { name: "types", passed: true },
  { name: "output", passed: true }
];

console.log(checks.filter(({ passed }) => passed).map(({ name }) => name).join(", "));
```

### HTML — isolated semantic preview

구조와 접근 가능한 markup만 미리보기로 렌더링합니다. script와 network는 실행하지 않습니다.

```run-html
<main style="max-width: 36rem; padding: 1.5rem; border-radius: 1rem; background: linear-gradient(135deg, #edfdf3, #f8fbf9); color: #163524; font-family: system-ui">
  <p style="margin: 0; color: #087a3b; font-size: .75rem; font-weight: 800; letter-spacing: .08em">HTML PREVIEW</p>
  <h1 style="margin: .5rem 0">읽기 좋은 문서 카드</h1>
  <p style="line-height: 1.6">의미 있는 HTML만으로도 제목, 요약, 목록, 링크의 구조를 먼저 확인할 수 있습니다.</p>
  <ul style="padding-left: 1.25rem; line-height: 1.7">
    <li><strong>semantic</strong> markup</li>
    <li>isolated preview</li>
    <li><a href="#details">details</a></li>
  </ul>
</main>
```

### CSS — isolated style preview

CSS만 수정해 card·gradient·responsive layout 결과를 확인하는 preview입니다.

```run-css
.preview {
  display: grid;
  place-items: center;
  min-height: 18rem;
  padding: 2rem;
  background: radial-gradient(circle at top right, #b8f5cc, transparent 42%), #f4fbf6;
}

.preview-card {
  position: relative;
  overflow: hidden;
  border: 0;
  border-radius: 1.25rem;
  background: #123524;
  color: #f1fff6;
  box-shadow: 0 1.25rem 3.5rem rgb(11 73 37 / 24%);
}

.preview-card::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: .35rem;
  background: #00d970;
  content: "";
}

.preview-eyebrow { color: #7df0ab; }
.preview-copy { color: #c1d9ca; }

.preview-button {
  border: 0;
  background: #00d970;
  color: #07311a;
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.preview-button:hover {
  box-shadow: 0 .5rem 1.25rem rgb(0 217 112 / 28%);
  transform: translateY(-2px);
}
```

### Web (HTML/CSS/JS) — DOM interaction

HTML, CSS, JavaScript을 함께 편집해 button event와 Output을 연결하는 예제입니다.

```run-web
<main class="demo">
  <p class="eyebrow">WEB INTERACTION</p>
  <h1>오늘의 집중 세션</h1>
  <p id="message">아직 시작하지 않았습니다.</p>
  <div class="actions">
    <button id="start" type="button">세션 시작</button>
    <button id="reset" type="button" disabled>초기화</button>
  </div>
</main>
<style>
  .demo { max-width: 34rem; padding: 1.5rem; border: 1px solid #d7e7dc; border-radius: 1rem; color: #153623; font-family: system-ui; }
  .eyebrow { margin: 0; color: #00863f; font-size: .75rem; font-weight: 800; letter-spacing: .08em; }
  h1 { margin: .5rem 0; } .actions { display: flex; gap: .5rem; }
  button { border: 0; border-radius: .6rem; padding: .65rem .9rem; background: #00863f; color: white; cursor: pointer; font: inherit; font-weight: 750; }
  button[disabled] { cursor: not-allowed; opacity: .45; } #reset { background: #e8f2eb; color: #215b39; }
</style>
<script>
  const start = document.querySelector("#start");
  const reset = document.querySelector("#reset");
  const message = document.querySelector("#message");
  start.addEventListener("click", () => {
    message.textContent = "25분 집중 세션이 진행 중입니다.";
    start.textContent = "진행 중";
    start.disabled = true;
    reset.disabled = false;
    console.log("focus session started");
  });
  reset.addEventListener("click", () => {
    message.textContent = "아직 시작하지 않았습니다.";
    start.textContent = "세션 시작";
    start.disabled = false;
    reset.disabled = true;
  });
</script>
```

### Web (HTML/CSS/TypeScript) — typed DOM interaction

동일한 interactive preview를 TypeScript DOM typing과 함께 다룹니다.

```run-web-ts
<main class="panel">
  <p>TypeScript state example</p>
  <strong id="status">draft</strong>
  <button id="advance" type="button">다음 상태</button>
</main>
<style>
  .panel { display: flex; align-items: center; gap: .75rem; max-width: 34rem; padding: 1.25rem; border-radius: 1rem; background: #172a22; color: #ebfff2; font-family: system-ui; }
  .panel p { flex: 1; margin: 0; } .panel strong { color: #7df0ab; } .panel button { border: 0; border-radius: .55rem; padding: .55rem .75rem; background: #00d970; color: #07311a; font: inherit; font-weight: 800; }
</style>
<script type="text/typescript">
  type Status = "draft" | "review" | "published";
  const statuses: Status[] = ["draft", "review", "published"];
  let index: number = 0;
  const status = document.querySelector<HTMLElement>("#status")!;
  const button = document.querySelector<HTMLButtonElement>("#advance")!;

  button.addEventListener("click", () => {
    index = (index + 1) % statuses.length;
    status.textContent = statuses[index];
    console.log(`document moved to ${statuses[index]}`);
  });
</script>
```

## JVM and systems languages

### Kotlin

```run-kotlin
data class Document(val title: String, val published: Boolean)

fun main() {
    val published = listOf(
        Document("Runner contract", true),
        Document("Private draft", false)
    ).filter { it.published }

    println(published.joinToString { it.title })
}
```

### Java

```run-java
import java.util.List;

class Main {
  public static void main(String[] args) {
    System.out.println(String.join(" → ", List.of("build", "check", "publish")));
  }
}
```

### C

```run-c
#include <stdio.h>

int main(void) {
  const char *status = "c runner ok";
  puts(status);
  return 0;
}
```

### C++

```run-cpp
#include <iostream>
#include <numeric>
#include <vector>

int main() {
  std::vector<int> checks{1, 1, 1};
  std::cout << std::accumulate(checks.begin(), checks.end(), 0) << " checks passed\n";
}
```

### Go

```run-go
package main

import "fmt"

func main() {
  checks := []string{"build", "link", "run"}
  fmt.Println(len(checks), "checks configured")
}
```

### Rust

```run-rust
fn main() {
    let checks = ["build", "link", "run"];
    println!("{} checks configured", checks.len());
}
```

### C#

```run-csharp
using System;
using System.Linq;

class Program {
  static void Main() {
    var checks = new[] { "build", "link", "run" };
    Console.WriteLine(string.Join(" → ", checks.Select((check, index) => $"{index + 1}.{check}")));
  }
}
```

### Swift

```run-swift
let checks = ["build", "link", "run"]
print("\(checks.count) checks configured")
```

### Dart

```run-dart
void main() {
  final checks = ["build", "link", "run"];
  print("${checks.length} checks configured");
}
```

## Scripting, data, and query languages

### Python

```run-python
checks = {"build": True, "links": True, "runner": True}
passed = [name for name, value in checks.items() if value]
print(", ".join(passed))
```

### SQL (SQLite)

```run-sql
with checks(name, passed) as (
  values ('build', 1), ('links', 1), ('runner', 1)
)
select count(*) as passed_checks
from checks
where passed = 1;
```

### Ruby

```run-ruby
checks = %w[build links runner]
puts checks.each_with_index.map { |check, index| "#{index + 1}.#{check}" }.join(" → ")
```

### PHP

```run-php
<?php
$checks = ["build", "links", "runner"];
echo count($checks) . " checks configured\n";
```

### R

```run-r
checks <- c("build", "links", "runner")
cat(length(checks), "checks configured\n")
```

### Scala

```run-scala
@main def main() =
  val checks = List("build", "links", "runner")
  println(s"${checks.size} checks configured")
```

### Lua

```run-lua
local checks = {"build", "links", "runner"}
print(#checks .. " checks configured")
```

### Shell

```run-shell
checks=(build links runner)
printf '%s checks configured\n' "${#checks[@]}"
```

## Edit and re-run

각 block의 코드를 고친 뒤 Run을 다시 눌러 성공·컴파일 오류·runtime 오류를 확인할 수
있습니다. 외부 provider 결과는 현재 요청의 결과일 뿐, 문서나 시스템의 품질을 보증하는
시험 성과로 기록하지 않습니다.
