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
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";

export default function LearningCard() {
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const label = useMemo(() => `${count}개의 실험을 완료했어요`, [count]);

  return (
    <>
      <section style={{ maxWidth: 420, padding: 24, borderRadius: 16, background: "#10251d", color: "#ecfff3", fontFamily: "system-ui" }}>
        <p style={{ margin: 0, color: "#73e6a5", fontSize: 12, fontWeight: 800, letterSpacing: ".08em" }}>REACT PLAYGROUND</p>
        <h2 style={{ margin: "10px 0 6px" }}>작게 만들고, 바로 확인하기</h2>
        <p style={{ margin: "0 0 18px", color: "#c8d9cf" }}>{label}</p>
        <button onClick={() => setCount((value) => value + 1)}>완료 +1</button>{" "}
        <button onClick={() => setIsOpen(true)}>요약 보기</button>
        <p style={{ margin: "16px 0 0", color: "#9fb9aa", fontSize: 12 }}>
          {typeof createRoot === "function" ? "ReactDOMClient ready" : "Loading renderer"}
        </p>
      </section>
      {isOpen && createPortal(
        <div role="dialog" aria-modal="true" aria-label="실험 요약" style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "rgb(0 0 0 / 56%)", fontFamily: "system-ui" }}>
          <article style={{ width: "min(360px, calc(100% - 32px))", padding: 24, borderRadius: 16, background: "white", color: "#18231d", boxShadow: "0 20px 70px rgb(0 0 0 / 30%)" }}>
            <h3 style={{ marginTop: 0 }}>오늘의 실험</h3>
            <p>{label}</p>
            <button onClick={() => setIsOpen(false)}>계속 만들기</button>
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
