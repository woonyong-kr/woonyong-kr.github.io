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

아래 예제는 서로 다른 실행 방식을 보여 줍니다. React 예제는 `react`, `react-dom`,
`react-dom/client` 세 진입점을 모두 사용하고, HTML·CSS는 독립 preview, Web·Web-TS는
사용자 입력을 받는 작은 인터랙션을 렌더링합니다.

### React (JSX / TSX)

{% raw %}
```run-react
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";

const sessions = [
  { id: "flow", eyebrow: "FLOW 01", title: "Layout rhythm", copy: "카드의 간격과 명암을 조율합니다.", time: "14 min" },
  { id: "motion", eyebrow: "FLOW 02", title: "Motion language", copy: "움직임이 다음 행동을 자연스럽게 안내합니다.", time: "09 min" },
  { id: "ship", eyebrow: "FLOW 03", title: "Ship the detail", copy: "작은 상태 변화까지 실제로 확인합니다.", time: "06 min" }
];

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function MotionLab() {
  const [activeId, setActiveId] = useState("flow");
  const [isRunning, setIsRunning] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(18 * 60 + 42);
  const [completed, setCompleted] = useState([]);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const closeButtonRef = useRef(null);
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeId) ?? sessions[0],
    [activeId]
  );
  const completion = Math.round((completed.length / sessions.length) * 100);

  useEffect(() => {
    if (!isRunning) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 18 * 60 + 42));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (!isReportOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsReportOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.cancelAnimationFrame(frame);
    };
  }, [isReportOpen]);

  function toggleCompleted(id) {
    setCompleted((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id]
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .motion-lab {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          max-width: 760px;
          min-height: 520px;
          padding: clamp(20px, 4vw, 38px);
          border: 1px solid rgb(255 255 255 / 12%);
          border-radius: 28px;
          background: #121815;
          color: #f2fff6;
          box-shadow: 0 30px 80px rgb(0 0 0 / 30%);
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }
        .motion-lab::before,
        .motion-lab::after {
          position: absolute;
          z-index: -1;
          width: 330px;
          height: 330px;
          border-radius: 999px;
          content: "";
          filter: blur(2px);
          opacity: .85;
          pointer-events: none;
        }
        .motion-lab::before {
          top: -130px;
          right: -110px;
          background: radial-gradient(circle, rgb(0 217 112 / 38%), transparent 68%);
          animation: motion-orbit 10s ease-in-out infinite alternate;
        }
        .motion-lab::after {
          bottom: -180px;
          left: -120px;
          background: radial-gradient(circle, rgb(87 111 255 / 25%), transparent 67%);
          animation: motion-orbit 13s ease-in-out infinite alternate-reverse;
        }
        .motion-lab button { font: inherit; }
        .motion-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgb(255 255 255 / 10%);
        }
        .motion-brand, .motion-status { display: inline-flex; align-items: center; gap: 9px; }
        .motion-brand { color: #f2fff6; font-size: 13px; font-weight: 800; letter-spacing: .12em; }
        .motion-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #00d970;
          box-shadow: 0 0 0 6px rgb(0 217 112 / 12%), 0 0 22px rgb(0 217 112 / 60%);
          animation: motion-pulse 1.8s ease-out infinite;
        }
        .motion-status { color: #b9c9bd; font-size: 12px; }
        .motion-status strong { color: #7df0ab; font-weight: 750; }
        .motion-hero { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 26px; align-items: end; padding: 34px 0 28px; }
        .motion-eyebrow { margin: 0 0 10px; color: #7df0ab; font-size: 11px; font-weight: 800; letter-spacing: .14em; }
        .motion-title { max-width: 560px; margin: 0; font-size: clamp(32px, 7vw, 58px); letter-spacing: -.06em; line-height: .96; }
        .motion-copy { max-width: 480px; margin: 16px 0 0; color: #b9c9bd; font-size: 15px; line-height: 1.65; }
        .motion-timer {
          min-width: 126px;
          padding: 16px 17px;
          border: 1px solid rgb(255 255 255 / 12%);
          border-radius: 18px;
          background: rgb(7 13 10 / 55%);
          box-shadow: inset 0 1px 0 rgb(255 255 255 / 5%);
          text-align: right;
        }
        .motion-timer span { display: block; color: #9fb6a6; font-size: 10px; font-weight: 800; letter-spacing: .12em; }
        .motion-timer strong { display: block; margin-top: 5px; color: #f2fff6; font-size: 27px; letter-spacing: -.06em; }
        .motion-progress { height: 8px; overflow: hidden; border-radius: 999px; background: rgb(255 255 255 / 10%); }
        .motion-progress span { display: block; width: ${completion}%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #00d970, #a4ffbf); box-shadow: 0 0 18px rgb(0 217 112 / 60%); transition: width 520ms cubic-bezier(.22, 1, .36, 1); }
        .motion-progress-meta { display: flex; justify-content: space-between; margin: 10px 1px 24px; color: #9fb6a6; font-size: 12px; }
        .motion-progress-meta strong { color: #dfffe8; }
        .motion-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .motion-card {
          position: relative;
          min-height: 188px;
          padding: 18px;
          border: 1px solid rgb(255 255 255 / 9%);
          border-radius: 18px;
          background: rgb(255 255 255 / 5%);
          color: inherit;
          cursor: pointer;
          text-align: left;
          transition: border-color 220ms ease, background-color 220ms ease, transform 220ms cubic-bezier(.22, 1, .36, 1), box-shadow 220ms ease;
          animation: motion-enter 620ms both;
        }
        .motion-card:nth-child(2) { animation-delay: 90ms; }
        .motion-card:nth-child(3) { animation-delay: 180ms; }
        .motion-card:hover { transform: translateY(-5px); border-color: rgb(125 240 171 / 55%); background: rgb(0 217 112 / 9%); box-shadow: 0 18px 36px rgb(0 0 0 / 18%); }
        .motion-card[aria-pressed="true"] { border-color: #00d970; background: linear-gradient(145deg, rgb(0 217 112 / 18%), rgb(255 255 255 / 5%)); }
        .motion-card:focus-visible, .motion-action:focus-visible, .motion-icon-button:focus-visible, .motion-close:focus-visible { outline: 3px solid #a4ffbf; outline-offset: 3px; }
        .motion-card small { color: #8fb49b; font-size: 10px; font-weight: 850; letter-spacing: .12em; }
        .motion-card h3 { margin: 42px 0 9px; font-size: 19px; letter-spacing: -.04em; }
        .motion-card p { margin: 0; color: #b9c9bd; font-size: 13px; line-height: 1.55; }
        .motion-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 17px; color: #dfffe8; font-size: 12px; font-weight: 750; }
        .motion-check { display: grid; width: 20px; height: 20px; place-items: center; border: 1px solid rgb(255 255 255 / 24%); border-radius: 999px; color: transparent; transition: all 220ms ease; }
        .motion-card.is-complete .motion-check { border-color: #00d970; background: #00d970; color: #062414; transform: scale(1.05); }
        .motion-controlbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 26px; padding-top: 22px; border-top: 1px solid rgb(255 255 255 / 10%); }
        .motion-active { min-width: 0; }
        .motion-active span { display: block; overflow: hidden; color: #8fb49b; font-size: 11px; font-weight: 800; letter-spacing: .1em; text-overflow: ellipsis; white-space: nowrap; }
        .motion-active strong { display: block; margin-top: 4px; font-size: 15px; }
        .motion-actions { display: flex; gap: 8px; }
        .motion-icon-button, .motion-action, .motion-close { border: 0; cursor: pointer; }
        .motion-icon-button { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 13px; background: rgb(255 255 255 / 9%); color: #f2fff6; transition: transform 180ms ease, background-color 180ms ease; }
        .motion-icon-button:hover { background: rgb(255 255 255 / 16%); transform: scale(1.04); }
        .motion-action { min-width: 112px; padding: 0 16px; border-radius: 13px; background: #00d970; color: #062414; font-weight: 850; transition: transform 180ms ease, box-shadow 180ms ease; }
        .motion-action:hover { box-shadow: 0 11px 25px rgb(0 217 112 / 25%); transform: translateY(-2px); }
        .motion-modal-backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 20px; background: rgb(2 8 5 / 68%); backdrop-filter: blur(12px); animation: motion-fade 180ms ease-out; }
        .motion-modal { width: min(100%, 420px); padding: 26px; border: 1px solid rgb(255 255 255 / 16%); border-radius: 22px; background: #18231d; box-shadow: 0 30px 90px rgb(0 0 0 / 48%); animation: motion-modal 300ms cubic-bezier(.22, 1, .36, 1); }
        .motion-modal h2 { margin: 18px 0 8px; font-size: 28px; letter-spacing: -.05em; }
        .motion-modal p { margin: 0; color: #b9c9bd; line-height: 1.65; }
        .motion-modal dl { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin: 24px 0; padding: 17px; border-radius: 15px; background: rgb(255 255 255 / 6%); }
        .motion-modal dt { color: #9fb6a6; } .motion-modal dd { margin: 0; color: #f2fff6; font-weight: 800; }
        .motion-close { width: 100%; min-height: 44px; border-radius: 12px; background: #00d970; color: #062414; font-weight: 850; }
        .motion-runtime { margin: 16px 0 0; color: #8fb49b; font-size: 11px; }
        @keyframes motion-orbit { to { transform: translate3d(-26px, 32px, 0) scale(1.12); } }
        @keyframes motion-pulse { 0%, 100% { box-shadow: 0 0 0 6px rgb(0 217 112 / 12%), 0 0 18px rgb(0 217 112 / 45%); } 50% { box-shadow: 0 0 0 11px rgb(0 217 112 / 0%), 0 0 28px rgb(0 217 112 / 75%); } }
        @keyframes motion-enter { from { opacity: 0; transform: translateY(18px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes motion-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes motion-modal { from { opacity: 0; transform: translateY(18px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (max-width: 620px) { .motion-hero { grid-template-columns: 1fr; } .motion-timer { width: 100%; text-align: left; } .motion-grid { grid-template-columns: 1fr; } .motion-card { min-height: 142px; } .motion-card h3 { margin-top: 24px; } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; } }
      `}</style>
      <section className="motion-lab" aria-label="Motion Lab React demo">
        <header className="motion-topbar">
          <div className="motion-brand"><span className="motion-dot" />MOTION LAB</div>
          <div className="motion-status"><strong>{isRunning ? "LIVE" : "PAUSED"}</strong> · React sandbox</div>
        </header>

        <div className="motion-hero">
          <div>
            <p className="motion-eyebrow">MAKE THE NEXT MOVE OBVIOUS</p>
            <h1 className="motion-title">Design that feels alive.</h1>
            <p className="motion-copy">React state가 카드 선택, 진행률, timer, modal을 연결합니다. 버튼을 눌러 실제 화면의 리듬을 바꿔보세요.</p>
          </div>
          <div className="motion-timer" aria-live="polite"><span>FOCUS CLOCK</span><strong>{formatTime(secondsLeft)}</strong></div>
        </div>

        <div className="motion-progress" role="progressbar" aria-label="완료한 flow" aria-valuemin="0" aria-valuemax="100" aria-valuenow={completion}><span /></div>
        <div className="motion-progress-meta"><span>{completed.length} of {sessions.length} flows complete</span><strong>{completion}%</strong></div>

        <div className="motion-grid">
          {sessions.map((session) => {
            const isComplete = completed.includes(session.id);
            return (
              <button
                key={session.id}
                type="button"
                className={`motion-card${activeId === session.id ? " is-active" : ""}${isComplete ? " is-complete" : ""}`}
                aria-pressed={activeId === session.id}
                onClick={() => { setActiveId(session.id); toggleCompleted(session.id); }}
              >
                <small>{session.eyebrow}</small>
                <h3>{session.title}</h3>
                <p>{session.copy}</p>
                <div className="motion-card-footer"><span>{session.time}</span><span className="motion-check" aria-label={isComplete ? "완료됨" : "완료로 표시"}>✓</span></div>
              </button>
            );
          })}
        </div>

        <footer className="motion-controlbar">
          <div className="motion-active"><span>NOW EXPLORING</span><strong>{activeSession.title}</strong></div>
          <div className="motion-actions">
            <button className="motion-icon-button" type="button" aria-label={isRunning ? "Timer pause" : "Timer resume"} onClick={() => setIsRunning((value) => !value)}>{isRunning ? "Ⅱ" : "▶"}</button>
            <button className="motion-action" type="button" onClick={() => setIsReportOpen(true)}>View report</button>
          </div>
        </footer>
        <p className="motion-runtime">{typeof createRoot === "function" ? "ReactDOMClient ready · keyboard focus supported" : "Loading React renderer"}</p>
      </section>

      {isReportOpen && createPortal(
        <div className="motion-modal-backdrop" role="presentation" onMouseDown={() => setIsReportOpen(false)}>
          <article className="motion-modal" role="dialog" aria-modal="true" aria-label="Motion Lab report" onMouseDown={(event) => event.stopPropagation()}>
            <p className="motion-eyebrow">SESSION REPORT</p>
            <h2>작은 변화도<br />사용자에게 보여주세요.</h2>
            <p>선택한 flow와 완료 상태는 React state에서 파생되고, modal은 닫힐 때 DOM에서 제거됩니다.</p>
            <dl><dt>Active flow</dt><dd>{activeSession.title}</dd><dt>Completion</dt><dd>{completion}%</dd><dt>Clock</dt><dd>{formatTime(secondsLeft)}</dd></dl>
            <button ref={closeButtonRef} className="motion-close" type="button" onClick={() => setIsReportOpen(false)}>계속 만들기</button>
          </article>
        </div>,
        document.body
      )}
    </>
  );
}
```
{% endraw %}

### JavaScript

```run-javascript
const samples = ["HTML", "CSS", "JavaScript"];
const report = samples.reduce(
  (state, name) => ({ ...state, [name]: `${name} example ready` }),
  {}
);

console.log(Object.values(report).join("\n"));
```

### TypeScript

```run-typescript
type Check = { name: string; passed: boolean };

const checks: Check[] = [
  { name: "types", passed: true },
  { name: "output", passed: true }
];

console.log(checks.filter(({ passed }) => passed).map(({ name }) => name).join(", "));
```

### HTML

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

### CSS

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

### Web (HTML/CSS/JS)

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

### Web (HTML/CSS/TypeScript)

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
