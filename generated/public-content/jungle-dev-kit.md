---
layout: default
title: Jungle Dev Kit
nav_order: 1
permalink: /wiki/jungle-dev-kit/
publication_state: publish
has_toc: true
projection_id: Wiki/platform-delivery-operations/development-tools/jungle-dev-kit
projection_sha256: f09fbfc0129ca145140b0034d2e0d0bea4a13763dd4b7b651d7afb59ecdeb4cd
parent: 개발 도구
content_status: ready
public_parent_id: Wiki/keywords/platform-delivery-operations-topic-dd9189189d5c
grand_parent: DevOps
---

# Jungle Dev Kit
{: .no_toc }

Jungle Dev Kit은 `@todo`, `@review`, `@warn`, `@breakpoint` 등의 주석을 모아 사이드바와 코드 옆의 표시로 연결하는 VS Code 확장이다. 저장소 이름은 `jungle-dev-kit`, 확장 식별자는 `woonyong.jungle-dev-kit`, 표시명은 `Annotation`이다. 아래에서는 `0.29.5`의 소스 커밋 `a18dbae`를 기준으로 주석과 편집 화면을 동기화하는 구조를 살펴본다.

## 주석과 사이드바가 달라지는 이유

코드에서 태그 주석을 지웠는데 사이드바에 항목이 남거나 다음 스캔에서 주석이 되살아나는 문제는, 각 상태를 저장하고 갱신하는 경로를 따라가며 읽을 수 있다.

파일의 주석, `.annotation/annotations.json`에 저장되는 항목과 표시 정보, 메모리의 `annotations`, 화면의 하이라이트는 같은 저장물이 아니다. 특히 자동 리뷰의 `virtual` 항목은 파일에 대응하는 주석이 없어도 유지할 대상이다. 따라서 파일에 없는 태그를 모두 지우는 규칙만으로는 동기화를 설명할 수 없다.

명시적인 전체 새로고침은 발견한 파일 집합 `discoveredFiles`와 태그가 있는 파일 집합 `taggedFiles`를 모은 뒤 `reconcileWorkspaceAnnotations()`로 항목을 거른다. 일반 항목은 두 집합에 파일이 모두 있어야 남고, `virtual` 항목은 이 조건과 별개로 보존된다. 태그가 있는 파일을 추가하는 일과 태그가 사라진 파일의 옛 항목을 제거하는 일을 함께 처리하는 구조다.

자동 스캔은 목적이 다르다. `scanDocument()`에는 Git이 파일을 교체하면서 주석이 일시적으로 사라졌다고 추정하면 이전 주석을 파일에 복원하는 경로가 있다. 파일을 저장했는지, 명시적으로 지웠는지, 보존 상태가 이미 켜졌는지에 따라 판단이 달라진다. 이는 실제 변경 원인을 확인한 결과가 아니라 상태에 근거한 추정이므로, 자동 스캔과 전체 새로고침을 같은 동작으로 보면 안 된다.

파일을 열지 못한 경우도 구분해야 한다. 전체 스캔은 열기 실패를 건너뛰지만 해당 파일을 `taggedFiles`에 넣지 않는다. 이후 정리에서는 파일을 읽지 못한 경우와 태그가 없는 경우가 같은 제거 조건에 들어갈 수 있다. [스캔과 복원 코드][tags] · [전체 새로고침의 정리 조건][reconciler]

## 삭제와 편집 이벤트

줄 번호는 태그의 정체성 자체가 아니다. 위쪽 줄을 편집하면 저장된 위치에 다른 주석이 올 수 있다. `deleteAnnotation()`은 일반 태그를 지우기 전에 `annotationLineMatches()`로 현재 줄을 확인하고, `virtual` 태그는 실제 파일 삭제에서 제외한다. 단일행 주석은 종류와 내용을 비교하지만 다중행 주석은 시작 줄의 종류가 맞으면 통과하므로, 모든 형태의 주석 내용을 완전히 대조하는 검사는 아니다.

삭제는 문서 변경 이벤트를 다시 발생시킨다. 현재 경로는 예약된 스캔 타이머를 취소하고, 편집 뒤 재예약된 타이머도 취소하며, 아래쪽 항목의 줄 번호를 조정한다. 삭제 직후 스캔이 같은 항목을 다시 추가하지 않도록 `_deletionGuard`도 둔다. 따라서 삭제를 볼 때는 파일의 한 줄뿐 아니라 타이머, 메모리의 위치, 복원 조건까지 따라가야 한다.

수정과 삭제의 실패 처리도 같지 않다. `replaceAnnotationTextInFile()`은 `applyEdit()`의 반환값이 실패이면 경고하고 중단한다. 반면 단일 항목 삭제 경로는 그 반환값을 검사하지 않은 채 메모리와 저장된 목록을 정리한다. 편집이 적용되지 않으면 파일의 주석과 저장된 목록이 어긋날 수 있다.

사이드바에서 일반 태그를 수정하면 파일 주석도 바꾸고 다시 스캔한다. 가상 리뷰의 수정은 `displayLabel`만 바꾼다. 표시 이름을 바꾸는 일과 원문을 고치는 일이 같은 계약이 아니라는 점이 이 분기를 설명한다. [삭제·수정과 문서 변경 처리][tags]

## 빈 태그와 표시 규칙

내용이 비어 있어도 태그가 사라진 것은 아니다. 현재 파서는 `// @todo`와 뒤에 공백만 있는 형태를 받아들이며, 내용 존재 여부를 별도로 다룬다. 반대로 태그가 파일에 있다는 사실이 곧 사이드바 표시를 뜻하지는 않는다.

| 대상 | 소스에서 확인한 처리 |
| --- | --- |
| `@note` | 파일 파싱과 아이콘 대상에는 포함되지만 사이드바 목록에서는 숨긴다. `note.svg`가 있고 smoke test가 태그별 아이콘 파일 존재를 검사한다. |
| `@endregion` | 독립 사이드바 항목으로 표시하지 않는다. 필터를 통과한 `@region`의 파일에서 닫는 태그를 모아 중첩 구조를 만든다. |
| 태그 추가 | 활성 에디터가 없으면 안내하고, 현재 구현은 `.c`·`.h` 파일만 허용한다. 삽입 실패 여부도 확인한다. |
| `@warn` 근처 수정 | 문서 변경 시 일반 `@warn`의 위아래 두 줄 범위와 겹치면 경고 로그를 남기는 함수와 호출 경로가 있다. |

README의 “`@warn`은 수동으로만 추가된다”는 설명은 아래의 GDB 자동 삽입 코드와 일치하지 않는다. 문서의 설명과 현재 구현을 함께 읽어야 한다. [태그·필터·편집 경고][tags] · [아이콘과 명령 등록 검사][smoke]

## 중단점, 오류 신호, Watch

사용자가 잡은 중단점에서 멈추는 것은 프로그램 오류와 다르다. 과거에는 정상 디버깅 이동에도 `@warn`이 생긴다는 사용자 보고가 있었고, `b17faa8`에서 일반 `Breakpoint ... at file:line` 출력을 오류로 분류하던 패턴을 제거했다. 현재 `GdbWarnTracker`는 signal 출력 뒤의 위치 정보, `PANIC`, assertion 실패 패턴을 처리한다. 다만 signal 정규식은 `SIGSEGV`만 고르는 것이 아니므로 감지한 모든 신호를 크래시로 일반화할 수 없다.

같은 위치에 이미 `// @warn` 또는 `/* @warn`이 있으면 삽입을 건너뛴다. 세션 종료 시에는 보류 중인 signal과 중복 방지 집합을 초기화한다. 보류 중인 signal과 중복 방지 집합은 tracker 인스턴스의 필드이므로 여러 디버그 세션이 같은 인스턴스를 쓰면 이 상태도 공유한다. 또한 위치를 중복 집합에 넣는 시점이 파일 탐색과 편집 성공보다 앞서 있어, 실패 뒤 같은 위치를 다시 시도하는 경우에는 추가 확인이 필요하다.

빈 `@breakpoint`는 멈출 위치만 뜻한다. 이를 `breakpoint`라는 Watch 식으로 등록하면 안 된다. `syncWatchExpressions()`는 내용 없는 태그를 제외하고, 쉼표로 나눈 식을 중복 제거한 뒤 `annotation.registeredWatch`에 없는 항목을 명령으로 전달한다. 예외 없이 끝난 명령의 식만 기록하며, 세션을 시작할 때마다 이 기록을 지우지는 않는다.

명령 호출 기록은 Watch 창의 현재 내용 자체가 아니다. 사용자가 Watch 식을 수동 삭제했거나 여러 세션이 함께 있을 때 저장된 기록과 실제 창이 일치하는지는 별도 확인 대상이다. 단위 테스트는 수동 중단점 출력과 signal 출력의 분류를 다룬다. 실제 Watch 목록과 명령 호출 기록의 일치 여부는 별도로 확인해야 한다. [GDB 출력 처리][gdb] · [Watch 동기화][tags] · [단위 테스트의 입력과 기대값][unit]

## 빨간 배경과 줄 번호의 기준

`@warn`을 지웠는데 빨간 배경이 남는다는 보고에서는 태그 표시와 Shadow Diff의 충돌 표시를 구분해야 했다. 두 기능이 비슷한 색을 사용해도 상태를 계산하는 주체는 다르다. 모든 원격 변경을 노랗게 칠하던 표시를 제거한 이력과, 충돌 가능 줄의 빨간 표시를 다시 계산한 이력도 별개의 변경이다.

Shadow Diff는 `parseWorkingTreeDiffHunks()`로 변경 구간을 읽고 `mapHeadLineToWorkingTree()`로 HEAD 기준 위치를 작업 파일의 위치로 옮긴다. 현재 단위 테스트에는 위쪽 줄 하나를 삭제했을 때 0-based 위치 `81`이 `80`으로, 삽입했을 때 `82`로 이동해야 한다는 기대값이 있다.

문서 변경 이벤트가 다시 계산을 예약하더라도, 위치 매핑에 사용하는 입력은 `git diff -U0 HEAD -- <file>`이다. HEAD, Git index, 디스크의 작업 파일, 저장하지 않은 에디터 문서는 구분해야 한다. 저장하지 않은 에디터의 줄 변화는 이 Git diff 입력에 아직 포함되지 않을 수 있다. [줄 매핑과 화면 갱신 코드][shadow] · [삽입·삭제 매핑 테스트][unit]

## 설정과 인증의 경계

설정 파일에 값을 저장하는 것과 기능이 그 값을 읽는 것은 다르다. 과거 style 설정 무시 문제를 고친 경로는 `.annotation/config.json`의 기본값을 읽고, `resolveAutoCreateClangFormat()`에서 명시적인 `workspaceFolder` 값, `workspace` 값, 프로젝트 값 순으로 선택한다. `env.checks`도 중첩 항목을 따로 병합해 일부 검사 설정만 바꿔도 나머지 기본 항목을 유지한다.

이 우선순위가 기존 파일 보존까지 보장하지는 않는다. 현재 `StyleEnforcer.activate()`는 자동 생성이 켜져 있으면 기존 파일 존재 여부를 조건으로 삼지 않고 루트의 `.clang-format`을 쓴다. 워크스페이스의 자동 저장과 C/C++ 저장 시 포맷 설정도 변경하는 경로가 있다. [설정 로딩][config] · [설정 우선순위와 적용][style]

PR 생성도 Git push 권한만으로 설명할 수 없다. `GitHubPrClient`는 원격 주소를 파싱하고 환경변수나 원격 주소에 포함된 토큰을 선택한 뒤, 없으면 credential helper에서 자격증명을 구하는 경로를 둔다. 일반 HTTPS 사용자명은 토큰으로 취급하지 않으며, 후행 `/`와 `.git`도 정규화한다. 하지만 토큰 없이 API를 호출하면 거절하도록 되어 있으므로 SSH로 push할 수 있다는 사실만으로 PR 생성이 보장되지는 않는다. API에서 허용되는 권한도 별도다. [원격 주소·자격증명·PR 요청 코드][pr]

기존 PR을 여는 경로는 API 조회와 `gh pr view` 조회를 지원한다. CLI를 부를 때는 `execFileAsync()`에 실행 파일과 인자 배열을 따로 전달한다. 새 PR을 만드는 경로는 API 토큰을 확인하고 현재 브랜치의 열린 PR을 먼저 찾아, 이미 있으면 그 주소를 안내한다. 회귀 하네스의 `gh pr view` 문자열 검사와 `execFileAsync` 호출 검사도 이 구분을 반영하지만, 문자열이 있다는 사실만으로 인증과 조회 성공까지 확인할 수는 없다. [기존 PR 조회와 생성](https://github.com/woonyong-kr/jungle-dev-kit/blob/a18dbae87781380e6b36a38a40514310e44edcff/src/features/prPanel.ts)

## 추가했다가 제거한 Goal

초기 Goal 기능은 목표와 완료 기준을 `.annotation/goal.json`에 저장하고 상태바에 표시하며, AI 커밋·PR·리뷰 기능에 현재 목표를 문자열로 전달했다. 이 구현은 로컬 목표 기록과 프롬프트 문맥 공유였으며, 에이전트를 목표 달성까지 자율적으로 계속 실행하는 기능은 아니었다.

`2ed0c40`에는 `goalTracker.ts`가 있지만, `edfcbc5`에서 파일과 관련 명령·설정·연결이 제거됐다. 현재 소스에는 이 기능이 없는데 `docs/FEATURE_SPEC.md`의 Goal 절은 남아 있다. 이 절은 채택 후 제거된 설계 이력이며 현재 기능 목록에서는 제외해야 한다. [초기 Goal 구현][goal] · [Goal 제거 커밋][goal-removal]

## 구현과 검증 기록의 범위

`reconcileWorkspaceAnnotations()`는 `303bcb2`에 추가됐지만 `f8ca357`에서는 파일이 비어 있었고, `a18dbae`에서 다시 구현됐다. 한 번의 수정과 테스트 통과가 이후 코드 상태까지 보장하지 않는 사례다. 현재 단위 테스트에는 stale 일반 항목 제거와 가상 항목 보존, 줄 매핑, signal 분류, 설정 우선순위를 확인하는 입력과 기대값이 있다. smoke test는 선언된 명령과 등록 코드, 태그 아이콘, 배포 제외 규칙 등을 검사한다.

과거 작업 답변에는 `npm test`와 회귀 하네스의 `22 PASS / 0 FAIL / 0 WARN`, `0.29.5` publish 성공이 보고됐다. 같은 답변은 당시 공개 조회 인덱스가 아직 `0.29.4`를 반환했다고도 밝혔다. 소스의 버전, publish 응답, 공개 검색 결과, 설치된 확장과 실제 화면은 각각 다른 확인 대상이다. 이 글은 코드와 과거 기록을 대조한 결과다. 현재 테스트 실행, VS Code 화면, Marketplace 배포 상태를 새로 검증한 결과는 포함하지 않는다.

배포 구성에서는 `.annotation/**`, `.jungle-kit/**`, `scripts/**`를 VSIX에서 제외하도록 되어 있고 smoke test도 주요 제외 규칙을 확인한다. 로컬 상태와 개발용 자료를 패키지에서 제외하는 설정이다. 실제 VSIX의 파일 목록은 별도로 확인해야 한다.

같은 문제가 다시 보이면 먼저 어느 버전의 소스와 확장이 실행 중인지, 파일·메타데이터·에디터 중 어디에서 상태가 달라졌는지 확인해야 한다. 그다음 정상 입력과 실패 입력을 나눠 보면, 과거 수정 기록을 현재 증거로 잘못 재사용하는 일을 줄일 수 있다.

[tags]: https://github.com/woonyong-kr/jungle-dev-kit/blob/a18dbae87781380e6b36a38a40514310e44edcff/src/features/tagSystem.ts
[reconciler]: https://github.com/woonyong-kr/jungle-dev-kit/blob/a18dbae87781380e6b36a38a40514310e44edcff/src/utils/annotationReconciler.ts
[gdb]: https://github.com/woonyong-kr/jungle-dev-kit/blob/a18dbae87781380e6b36a38a40514310e44edcff/src/features/gdbWarnTracker.ts
[shadow]: https://github.com/woonyong-kr/jungle-dev-kit/blob/a18dbae87781380e6b36a38a40514310e44edcff/src/features/shadowDiff.ts
[unit]: https://github.com/woonyong-kr/jungle-dev-kit/blob/a18dbae87781380e6b36a38a40514310e44edcff/scripts/unit-test.js
[smoke]: https://github.com/woonyong-kr/jungle-dev-kit/blob/a18dbae87781380e6b36a38a40514310e44edcff/scripts/smoke-test.js
[config]: https://github.com/woonyong-kr/jungle-dev-kit/blob/a18dbae87781380e6b36a38a40514310e44edcff/src/utils/configManager.ts
[style]: https://github.com/woonyong-kr/jungle-dev-kit/blob/a18dbae87781380e6b36a38a40514310e44edcff/src/features/styleEnforcer.ts
[pr]: https://github.com/woonyong-kr/jungle-dev-kit/blob/a18dbae87781380e6b36a38a40514310e44edcff/src/utils/githubPrClient.ts
[goal]: https://github.com/woonyong-kr/jungle-dev-kit/blob/2ed0c40581a81fd7d2fc7918ca8d20742ddcd419/src/features/goalTracker.ts
[goal-removal]: https://github.com/woonyong-kr/jungle-dev-kit/commit/edfcbc56196bd5f539f72c1d3a90a202d3ae6b6a
