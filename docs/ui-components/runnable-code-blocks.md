---
layout: default
title: Runnable Code Blocks
parent: UI Components
nav_order: 8
---

# Runnable Code Blocks

이 페이지는 WN Docs의 `run-<language>` fenced block이 실제로 mount되고 실행되는지
언어별로 확인하는 공개 smoke-test 페이지입니다. **Run**을 누르기 전에는 어떤 코드도
실행하거나 전송하지 않습니다. 코드는 수정한 뒤 다시 실행할 수 있지만, 그 변경은 이
페이지의 Markdown에 저장되지 않습니다.

## 실행 경계

| 구분 | 언어 | 실행 위치 |
|:--|:--|:--|
| 브라우저 | JavaScript, TypeScript | sandboxed Web Worker / browser transpile |
| 브라우저 preview | HTML, CSS | sandboxed iframe |
| 명시된 provider | Kotlin | Kotlin Playground |
| 명시된 provider | Dart | DartPad compile → isolated frame |
| 명시된 provider | Swift | SwiftFiddle |
| 명시된 provider | Python, SQL, Java, C, C++, Go, Rust, C#, Ruby, PHP, R, Scala, Lua, Shell | Wandbox |

외부 provider를 사용하는 언어는 Run을 누를 때 source가 해당 provider로 전송됩니다.
네트워크·provider 제한·컴파일러 변경 때문에 실패하거나 시간이 걸릴 수 있으며, 실패한
실행을 다른 provider로 자동 재시도하지 않습니다.

## Browser runners

### JavaScript

```run-javascript
const stages = ["source", "render", "verify"];
const completed = stages.map((stage, index) => `${index + 1}. ${stage}`);
console.log(completed.join(" → "));
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
<main style="font-family: system-ui; padding: 1rem; border: 2px solid #00863f">
  <strong>HTML preview</strong>
  <p>이 preview는 sandboxed iframe 안에서 렌더링됩니다.</p>
</main>
```

### CSS

```run-css
.preview {
  display: grid;
  place-items: center;
  min-height: 7rem;
  color: #fff;
  background: #00863f;
  border-radius: 0.35rem;
}

.preview::after {
  content: "CSS preview";
  font-weight: 700;
}
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
