# WN Docs 품질 개선 검증 기록

2026-09-08. 테마·실행기 개선과 별도 승인된 Wiki 생성물 갱신을 통합한다.
내용은 Vault producer에서 생성했고 사이트에서 생성 Markdown을 직접 보정하지 않았다.

## 검증 범위와 비교 조건

- 실행기 기준 revision: `4e9268d` → `3d5c849`. 공통 구현 `5b740e7`의 `npm run verify`와
  [원격 CI](https://github.com/woonyong-kr/obsidian-runnable-code-blocks/actions/runs/34159250664)가 통과했다.
  최종 revision은 취소 테스트의 완료 관찰만 강화한 별도 commit이며 격리된 원본에서 typecheck·147개 테스트를 다시 통과했다.
  [최종 commit CI](https://github.com/woonyong-kr/obsidian-runnable-code-blocks/actions/runs/34162244451)도 전체 verify를 통과했다.
- 사이트 기준 revision: `1c42064`. 공개 projection은 별도 Wiki 작업에서 167개 → 1,337개로 갱신됐다.
  따라서 전체 HTML 전송량을 테마 최적화의 전후 수치로 비교하지 않는다.
- 같은 역할의 자산을 Node `gzipSync` 기본값으로 비교한다. 초기 실행 비용은
  Run을 누르지 않은 일반 문서에서 측정하며, 모든 정적 import 조각을 포함한다.

| 항목 | 변경 전 | 변경 후 |
| --- | ---: | ---: |
| 초기 실행기 JS 원본 bytes | 997,282 | 2,751 |
| 초기 실행기 JS gzip bytes | 307,401 | 1,519 |
| 전체 색상 stylesheet | 3 | 2 |
| 기본 light stylesheet bytes | 135,039 | 134,984 |
| custom dark stylesheet bytes | 140,800 | 140,743 |
| 별도 중복 light stylesheet bytes | 135,042 | 0 |

초기 실행기 전송량은 gzip 기준 약 99.5% 감소했다. 작은 upstream navigation 보조 CSS와
사이트별 보조 CSS는 유지한다. 실행기 본체, React, TypeScript, 개인 서버 요청은 일반 문서에서 0건이다.
화면 밖 block은 편집기를 만들지 않으며 React·Sucrase는 해당 실행 전에는 요청하지 않는다.
실행기 전체를 사용하면 필요한 chunk를 내려받으므로 모든 코드 실행의 총 전송량이 99.5% 줄었다는 의미는 아니다.

## 테스트 유지·교체·삭제 판단

| 대상 | 조치와 실제로 보호하는 동작 |
| --- | --- |
| stylesheet ID/HTML 문자열로 테마 성공 판정 | 삭제. 실제 OS 테마, 첫 화면, module 지연·차단, 수동 선택, 페이지 재진입, no-JS 검사로 교체 |
| HTML provider 하나로 실행 순서 판정 | private-first/remote-first의 두 provider 선택 순서와 실제 POST 한 번을 검증하도록 교체 |
| 언어/provider 개수·내부 배열 순서 고정 | 대표 공개 fence 호환성과 실제 registry/provider 선택 계약으로 교체 |
| CSS 최대 높이 문자열 assertion | 중복 assertion 삭제. 실제 102/103줄 편집기 스크롤 경계 브라우저 검사를 유지 |
| TypeScript 소스 정규식으로 언어 추출 | runtime 없는 `language-catalog` 진입점을 build tool에서 읽어 fence 예제 누락을 검사 |
| wikilink만 확인한 공개 경계 테스트 | 중복 YAML key, 타입, alias/merge/tag, 다중 문서, 파일 종류, symlink, 중복 URL/ID, 렌더링 URL별 실패 사례로 분리 |
| 정해진 microtask 횟수/임의 sleep | UI 상태·preview-ready·요청 실패 이벤트 등 관찰 가능한 완료를 기다리도록 교체 |
| 취소·중복 실행·sandbox·출력 제한 | 유지. late result, HTTP body 취소, preview 중단/재시작과 연결 |
| 두 저장소에서 같은 runner mock 반복 | 공통 원본이 runner·Obsidian·provider 계약을 담당하고 사이트는 실제 Jekyll 산출물과 웹 연결을 담당 |

공통 원본: Node/Vitest 147개, Chromium E2E 9개. Coverage는
statements 80.81%, branches 76.19%, functions 81.67%, lines 84.72%이며 기존 threshold를 낮추지 않았다.
사이트 검사는 Node/Jekyll 경계·integration, Wiki visibility Ruby 검사와 Chromium/Firefox/WebKit의 실제 문서를 사용한다.
통합 commit `c204ee4`의 로컬·원격 `npm run verify`: Node/Jekyll 25개, Ruby 4개, 브라우저 32개 모두 통과했다.
운영 확인에서 발견한 검색 focusout 회귀를 추가한 뒤 실제 빌드·공개 산출물 검사와 브라우저 35개를 통과했다.
최종 산출물 1,340개 HTML·1,361개 파일과 2,610개 내부 링크 및 제목 앵커를 검사했다.
테스트 개수 자체를 품질 목표로 삼지 않는다.

## 재현으로 확인한 회귀

- 변경 전 HTTP helper는 header 수신 뒤 timeout을 해제했다. 멈춘 body, header 이후 취소,
  1MiB 초과 응답 재현 3개가 실패했고 body 소비까지 책임지는 helper로 수정 후 통과했다.
- 전체 22초 deadline 초과 뒤 재시도와 429 Retry-After metadata 누락을 실패 테스트로 확인했다.
  전송 실패는 같은 request ID로 최대 한 번만 재시도하며 취소·timeout·429는 자동 실행하지 않는다.
- 격리된 임시 checkout에서 늦은 결과를 막는 상태 guard를 제거했다. 기존 취소 테스트가 잘못 통과하는 것을 확인한 뒤,
  실제 실행 Promise의 완료를 기다리도록 강화했다. 같은 mutation에서 cancelled가 success로 바뀌어 테스트가 실패하고,
  원본 guard를 복원하면 통과한다. 다른 작업의 진행 중인 변경은 이 검증과 commit에 포함하지 않았다.
- quoted 중복 승인 key, 예상 밖 파일과 중복 permalink 등의 기존 validator 실패 사례를 확인했다.
  YAML schema와 최종 산출물 allowlist로 거부한다. `projection_sha256`는 파일 해시로 재계산하지 않는다.
- light 보조 버튼 4.37:1, 실행 환경 표시 4.46:1, 선택된 코드 줄의 문자열 4.34:1을 실제 렌더에서 발견해
  foreground/background를 함께 조정했다. 검사하는 본문·버튼·편집기 token은 4.5:1 이상이다.
- 모바일 no-JS 화면의 GitHub 링크 누락을 실제 브라우저에서 발견해 보완했다.
- 현재 문서 조상은 펼쳐져 있는데 aria-expanded=false인 upstream 동작을 3브라우저에서 재현했다.
  초기 navigation 동작 후 속성을 동기화하고 실제 키보드 접기·펼치기를 검사한다.
- Wiki 영어 표제의 한국어 별칭은 검색 metadata로 보존한다. 기본 Latin trimmer가 한글과 C++/C# 기호를
  제거하는 실패를 실제 검색에서 확인하고 공식 Lunr 확장 지점에서 Unicode 문자·숫자와 언어 기호를 보존한다.
- 실제 배포 화면에서 검색창의 focusout 대상이 null일 때 upstream이 예외를 내고 검색을 닫지 못하는 결함을 발견했다.
  실제 `blur()` 후 닫기·다시 열기와 pageerror 검사가 수정 전 3브라우저에서 모두 실패했다. Jekyll hook이 gem의
  검색 코드에 작은 null guard를 적용하도록 했다. upstream 전체 파일을 복사하지 않으며, 해당 구문이 바뀌면
  빌드를 실패시켜 호환성 수정을 다시 검토하게 한다.
- 브라우저는 실패한 module import를 현재 문서에 캐시한다. 최초 다운로드 실패 때는 원래 코드를 보존하고
  작동하는 새로고침 복구를 제공한다. 서버 offline/잘못된 endpoint 복구는 새로고침 없이 편집 내용을 유지한다.

## 공개 경계와 정리

로컬 canonical producer 비교: 1,337개, missing 0 / extra 0 / bytes changed 0.
`wiki_show_planned:false`의 실제 Jekyll integration은 HTML·navigation·검색·sitemap을 함께 검증한다.
기본 true 설정은 공개 승인된 전체 키워드를 보여 준다. 공개 상태를 우회하는 설정은 아니다.

43개 데모와 upstream CHANGELOG/MIGRATION의 종료 URL은
[retired-urls.json](tests/fixtures/retired-urls.json)에 있다. 이 주소는 404이며 홈으로 redirect하지 않는다.
showcase는 `/docs/ui-components/runnable-code-blocks/`를 유지하고 검색에서 찾을 수 있다.
Wiki 상위 navigation은 Home과 9개 분류를 유지한다.

데모 이미지 2개, 중복 light entry와 취약한 정적 테마 검사도 제거했다.
LICENSE, lockfiles, footer override, sandbox·접근성 보호와 사용하는 legacy-modes는 유지했다.
README의 생성 bundle `git add` 명령을 제거했다.

## 추가 개선: 실제 실행 종료와 개인 파비콘

이 추가 작업은 Wiki 본문·Vault·생성 Markdown을 수정하지 않았다. 사이트 `136b7e6`에서
별도 worktree로 테마/실행기만 변경했다. 위쪽의 기존 검증 수치는 앞선 개선 시점의 기록이다.

- 실행기 `454e268799ca10fc527e7ef9a9c02540214e3d5f`의
  [원격 verify](https://github.com/woonyong-kr/obsidian-runnable-code-blocks/actions/runs/34207869072)가 통과했다.
  Node/Vitest 158개, Chromium E2E 16개, 별도 Chromium/Firefox/WebKit 핵심 실행 검사 21개를 통과했다.
  사이트 연결 검사에서 찾은 inline HTML handler 회귀를 후속 `31ee753`에서 보완했고,
  최종 원본의 로컬 `npm run verify`와
  [후속 원격 CI](https://github.com/woonyong-kr/obsidian-runnable-code-blocks/actions/runs/34209605335)는
  Node/Vitest 158개와 Chromium E2E 17개를 통과했다.
  Coverage는 statements 81.65%, branches 74.43%, functions 84.75%, lines 86.31%다.
  기존 threshold는 유지하며 별도 iframe bundle entry만 Node coverage에서 제외하고 실제 브라우저에서 검증한다.
- 취소 요청은 기존 UUID로 `POST /v1/cancel`을 보내며 source를 다시 전송하지 않는다.
  컨테이너 생성 중 취소, 취소 후 늦은 POST, IP 변경 후 취소, 제거 실패, 늦은 취소 응답을 검사한다.
  Docker 컨테이너의 강제 제거가 끝난 뒤에만 서버가 `cancelled`를 응답한다.
- 운영 서버에서 실제 무한 반복 Python PID를 관찰한 뒤 취소를 요청했다.
  534ms 후 취소 확인, 컨테이너 소멸, 원래 요청 409, 같은 UUID 재사용 거부와 새 실행 성공을 확인했다.
  요청 ID와 운영 환경 경로를 포함하는 상세 receipt는 로컬에만 보관한다.
- React 무한 반복의 기존 iframe 정지 실패를 실제 브라우저에서 먼저 재현했다.
  사용자 JavaScript를 Worker로 이동해 Stop으로 실제 Worker close를 확인하며,
  응답이 없는 Worker는 2초 watchdog이 종료한다. 동기 루프, 끝없는 Promise microtask,
  native 정규식 반복을 각각 검사한다. 문서·테마 제어는 응답을 유지한다.
- 실제 사이트의 `onclick` 예제가 Worker DOM의 attribute selector에서 대상 요소를 찾지 못하는
  실패를 3브라우저에서 발견했다. 충돌을 피하는 class로 연결을 바꾸고, 클릭·누름 이벤트 및
  `this`가 같은 요소를 가리키는지 실패→통과 재현으로 고정했다.
- 작성자 script는 iframe 안에서 실행 가능한 script가 아니라 inert JSON으로 전달한다.
  DOM 메시지의 크기·빈도·노드 수와 허용 opcode를 제한하고 executable element/attribute를 거부한다.
  기존 sandbox, 네트워크 제한, 출력 상한과 React state/portal 및 TypeScript DOM 이벤트를 검증했다.
- 실행기 HTML 문자열에 `unsafe-inline`을 요구하던 검사와 React 내부 module 이름 검사는 제거하고
  실행 결과·실제 Worker 종료·재시작 검증으로 교체했다. 사이트는 실제 Jekyll 산출물에서
  취소 RPC 연결과 preview 종료/복구를 확인한다. 공통 mock 시나리오는 원본 테스트가 담당한다.
- 사용자 지정에 따라 보라색 JTD 글자 파비콘을 녹색 DOC로 교체했다.
  폰트에 의존하지 않는 vector 원본은 `tools/favicon.svg`, 탭 아이콘은 16/24/32/64px ICO다.
  기존 asset SHA revision을 파비콘 URL에도 적용하며 외부 이미지 요청은 추가하지 않는다.
- 추가한 Worker DOM의 Apache-2.0 고지문은 배포 자산
  `assets/js/runnable/THIRD_PARTY_NOTICES.txt`에 포함하고 최종 파일 allowlist/해시 검사에 연결한다.

같은 fixture/build 조건의 실행기 초기 import 합계는 2,751 → 2,681 bytes,
gzip은 1,519 → 1,482 bytes다. 새 preview Worker chunk는 84,310 bytes / gzip 23,110 bytes이며
HTML/Web/React 실행 때만 요청한다. 일반 문서는 이 chunk를 요청하지 않는다.
실행기 본체는 gzip 194,356 → 195,626 bytes다. CPU 종료를 위한 코드 비용은 실행 시에 지불한다.

## Canvas와 Kotlin 종료 진단 후속 개선

- 실행기 `b1c4989fa966919edd148b56022c64dac2ea7249`에서 native OffscreenCanvas의
  2D·WebGL·WebGL2를 Worker 안에서 실행한다. 실제 shader 출력·readback·크기 변경·입력·
  증분 그리기·Worker 종료와 재시작을 Chromium/Firefox/WebKit 15개 검사로 확인했다.
  이 신규 기능 검사는 수정 전 revision에서 4개 모두 실패했다.
- 화면에는 bounded ImageBitmap만 전송하고 generic DOM method executor는 열지 않았다.
  canvas 최대 8개·한 변 2048px·개별 1 megapixel·전체 4 megapixel, 최대 30fps 및
  canvas별 전송 중 이미지 1개를 제한한다. frame의 크기 제한만 완화한 임시 mutation에서는
  비정상 전송 보호 검사가 실제 실패했고 원상 복구 후 최종 검증했다.
- Kotlin 정상 예제가 CPU를 제한한 실제 Docker에서 15초 후 `exitCode: 137` 및 빈 stdout/stderr로
  끝나는 현상을 재현했다. 같은 조건의 수정본은 `exitCode: 124`, `failureReason: timeout`,
  컴파일을 포함한 15초 제한 설명을 반환한다. 기존 최초 1회는 stderr/exitCode 기록이 없어
  원인을 소급 확정하지 않는다. 수정 후 일반 조건의 실제 Kotlin 4회는 모두 정상 출력했다
  (4.44–5.07초). 확인된 Docker OOM과 진단 없는 비정상 종료도 별도로 분류한다.
- 취소 테스트는 실제 child process가 1초 내 시작한다는 가정을 제거하고 시작·제거 이벤트를
  기다린다. 기존 취소·중복 실행·sandbox·출력 제한 검사는 유지했다. timeout·OOM·동일 ID
  결과 재사용·선택적 metadata 검사를 추가했고 기준을 낮추지 않았다.
- 원본의 최종 `npm run verify`는 168개 Node/Vitest, 22개 Chromium E2E를 통과했다.
  coverage는 statements 82%, branches 74.92%, functions 85.15%, lines 86.62%다.
  Worker Canvas entry는 frame entry와 같이 실제 브라우저에서 실행되므로 Node coverage에서 제외한다.
  사이트는 production bundle의 Canvas/WebGL 연결을 별도로 검증한다.
- 같은 사이트 빌드 조건에서 초기 탐색 코드 합계는 2,681 → 2,809 bytes,
  gzip 1,482 → 1,549 bytes다. 실행할 때만 받는 preview chunk는
  84,310 → 88,201 bytes / gzip 23,110 → 24,661 bytes이고,
  실행기 본체 gzip은 195,626 → 195,674 bytes다. 일반 문서의 실행기 본체 요청은 추가하지 않는다.
- 이번 후속 변경은 위키 본문·Vault·생성 Markdown을 수정하지 않는다.
  콘텐츠 담당 작업의 `b1bbe65`를 보존하며, 그 작업의 Mermaid 검증과 함께 사이트 `npm run verify`를 실행한다.

## 초기 실행 가능 여부와 CI 렌더링 환경

- 후속 실행기 `4c1f8f24c9ebf7331d5faaa39eb1fcb0278c24d2`는 선택적 local-runner의
  capabilities 조회를 단일 Docker image 목록·동시 요청 공유·2초 cache로 변경했다.
  설치된 repository와 pinned digest가 모두 일치할 때만 제공하며 실패는 cache하지 않는다.
  실제 6개 동시 요청의 조회 시간은 3.25초 → 0.49초였고 client의 2.5초 deadline은 유지한다.
  최종 원본 verify는 170개 Node/Vitest와 22개 Chromium E2E를 통과했다.
  변경은 서버와 테스트에 한정되어 browser/plugin bundle hash는 앞선 revision과 동일하다.
- 실제 Worker close 관찰에서 생성 후 약 2.34초에 watchdog 안내가 도착하고,
  Chromium의 target detachment는 생성 후 약 3.98초에 도착했다. 2초 watchdog과
  4초 이내 안내 assertion은 유지하고 별도 close 관찰만 6초로 보완했다.
- Ubuntu CI의 Firefox trace는 `WEBGL_EXHAUSTED_DRIVERS`를 기록했다.
  사이트 검사는 preview와 독립된 native Worker의 WebGL 지원을 먼저 조회한다.
  Canvas 2D는 항상 실제 픽셀을 검사하고, native WebGL이 있으면 실제 WebGL 픽셀도 검사한다.
  native context가 없으면 명확한 안내와 2D 표시·중단 가능 상태를 검증한다.
  macOS의 세 브라우저에서는 native WebGL 지원과 실제 shader 출력을 별도로 확인했다.
  브라우저 제한 때문에 WebGL 검사를 통째로 삭제하거나 무조건 건너뛰지 않는다.
- showcase의 오래된 HTTP/CPU 취소 불가 설명을 현재 동작으로 고쳤다. Wiki 본문은 수정하지 않았다.
- 공통 UI revision `9745b806bb14108a9f4245a3e04fe8ac9f10bbe7`은 같은 실행기와
  공통 SVG 버튼·접근성 이름·상하 여백 개선을 포함한다. 원본의 170개 Node/Vitest와
  22개 Chromium E2E를 다시 통과했고 360px·1280px에서 실제 복사와 toolbar 여백을 확인했다.
  사이트 전용 UI 복사본은 추가하지 않는다. WebGL을 비활성화한 Chromium에서도
  앞선 사이트 검사의 2D 출력·지원 안내·중단 경로가 통과했다.

## Kotlin 컴파일 시작 비용과 최종 UI

- Kotlin 개선 revision은 `6b503ecfcadfa4d2e11da1b9f6bd6cb5aa8f53da`다.
  Obsidian host CSS가 실행 버튼의 색상을 덮는 문제도 공통 selector에서 보완했다.
  사이트별 버튼 구현은 추가하지 않았다.
- 운영 확인 중 부하가 있는 호스트에서 간단한 Kotlin 코드도 15초를 넘기는 사례를 다시 기록했다.
  같은 코드·1 CPU·512 MiB·15초 조건으로 기존/수정 방식을 번갈아 세 번 비교했다.
  `kotlinc`에만 `-J-XX:TieredStopAtLevel=1`을 적용한 중앙값은 13.36초 → 9.37초였다.
  사용자 프로그램의 JVM 기본 설정은 유지하며 시간·자원 제한을 늘리지 않는다.
- 실제 Docker에서 컬렉션 출력·사용자 JVM 기본값·컴파일 오류·15초 timeout·정상 회복을 확인했다.
  마지막 회복은 7.57초에 정상 출력했고 전체 원본 verify 170개 Node/Vitest·22개 Chromium E2E도 통과했다.
  호스트 부하나 큰 코드로 deadline에 도달하는 경우는 여전히 명시적인 timeout으로 종료한다.
- 코드 변경 전에 운영 실패와 교차 비교를 기록했다. JVM flag 문자열을 그대로 기대값으로 복제하는
  단위 테스트는 추가하지 않았고 실제 컴파일 결과와 사용자 JVM 인자를 확인했다.
- 콘텐츠 담당 작업의 `f95b350`까지 보존하며, Wiki 본문을 직접 수정하지 않았다.

최종 사이트 adapter는 `832e2fbb381528f5b6587c3d3f847d78d24401af`이다.
서버의 비동기 요청 실패를 처리하고 다음 요청을 받을 수 있게 하는 공통 경계를 포함한다.
또한 Obsidian의 24px 접기 여백이 중첩된 실행 편집기에 들어와 활성 줄 배경을 끊는 문제를
`.rcb` 범위 안에서 수정했다. 실제 host CSS를 넣은 회귀 검사는 수정 전에 실패했고,
수정 후 줄번호와 코드의 배경·높이·경계가 이어지며 코드 안쪽 8px 여백을 확인했다.
별도 실행의 원본 verify는 171개 Node/Vitest와 24개 Chromium E2E를 통과했다.
운영 서버 CLI의 hash는 UI 변경 전후 동일하며 추가 서버 재시작은 필요하지 않다.

Run과 Stop은 하나의 버튼에서 전환되고, preview watchdog이 Worker를 종료해도 Run으로 복귀한다.
복사 성공 아이콘은 1.5초 후 원래 아이콘으로 돌아온다. 원본 편집 동작은 선택적인 host callback을
사용하므로 정본 편집을 제공하지 않는 웹 문서에는 표시하지 않는다. 편집기에 focus가 있을 때만
활성 줄을 강조하고, host의 중복 테두리·스크롤바 여백과 더 이상 도달하지 않는 disabled CSS를 정리했다.
원본의 실제 복사·자동 종료 후 재실행·host hover/focus 검사를 유지·확장했고 기준은 낮추지 않았다.

사이트 CI `34224050915`의 Firefox 실패는 Worker 종료 실패가 아니었다. trace에서 종료를 기다리는
5초 timer가 preview 버튼 준비 전 시작됐고, 중첩 iframe의 자동 scroll이 버튼을 sticky header 뒤로
옮겨 Stop 호출 전에 timer가 만료됐다. 6초 후 버튼을 공개하는 독립 fixture로 기존 검사의 실패를
재현했다. 수정 검사는 실제 pointer hit testing과 보이는 위치를 확인한 뒤 Run/Stop을 조작하고,
미리 연결한 close listener로 Stop 이후 5초 경계만 검사한다. 임의 sleep·force click·재시도는 사용하지
않는다. fractional CSS pixel 비교에만 1px 이내 반올림 오차를 허용한다. 수정본은 Chromium·Firefox·
WebKit에서 모두 통과했다. 기존 취소·재실행 시나리오를 교체했으며 보호 검사를 삭제하지 않았다.

최종 콘텐츠 기준은 담당 작업의 `1a195b1`이다. producer 대조에서 발견한 다음 배포용
Socket·데이터 표현 두 문서는 담당 작업이 producer로 반영했고, 이번 검증이 끝날 때까지
canonical compiler와 공개 projection을 함께 동결했다. 생성물의 수동 보정은 하지 않았다.

## 전달과 남는 한계

로컬·CI의 사이트 최종 명령은 `npm run verify`다. PR은 검증만 하고 검증된 main 산출물만 배포한다.
배포 권한은 deploy job에 한정한다. adapter 원격 commit을 먼저 확인한 뒤 사이트 pointer를 전달한다.
`build-info.json`은 공개 site SHA·adapter SHA·자산 해시만 포함한다. 배포 후 이 정보를 실제 자산과 대조한다.

아래 두 한계는 추가 개선으로 해소했다. 개인 서버는 요청 ID로 실제 Docker 작업을 취소하고,
interactive preview의 사용자 코드는 종료 가능한 Worker에서 실행한다. 서버가 오프라인이거나
이전 버전이라 취소를 확인할 수 없을 때에는 UI가 종료를 확인했다고 표시하지 않는다.
Canvas 2D·WebGL·WebGL2는 후속 개선으로 Worker의 native OffscreenCanvas에서 실행한다.
Worker DOM은 완전한 browser DOM이 아니므로 임의의 동기식 layout/browser API는 지원 범위에 따른다.
개인 서버 offline은 브라우저 실행·본문·검색·테마의 장애와 구분한다.
Obsidian 정식 release·설치, 실행 인프라 교체, 상시 monitoring은 수행하지 않았다.
실패한 운영 반영은 직전 검증된 site/adapter 조합으로 revert하며 history를 재작성하지 않는다.
