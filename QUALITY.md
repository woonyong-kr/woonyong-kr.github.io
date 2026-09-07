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
최종 `npm run verify`: Node/Jekyll 25개, Ruby 4개, 브라우저 32개 모두 통과했다.
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

## 전달과 남는 한계

로컬·CI의 사이트 최종 명령은 `npm run verify`다. PR은 검증만 하고 검증된 main 산출물만 배포한다.
배포 권한은 deploy job에 한정한다. adapter 원격 commit을 먼저 확인한 뒤 사이트 pointer를 전달한다.
`build-info.json`은 공개 site SHA·adapter SHA·자산 해시만 포함한다. 배포 후 이 정보를 실제 자산과 대조한다.

HTTP 취소는 응답 대기 취소이며 서버 실행 종료를 보장하지 않는다.
현재 iframe 구조는 CPU 무한 반복의 강제 종료를 보장하지 않는다.
개인 서버 offline은 브라우저 실행·본문·검색·테마의 장애와 구분한다.
Obsidian 정식 release·설치, 실행 인프라 교체, 상시 monitoring은 수행하지 않았다.
실패한 운영 반영은 직전 검증된 site/adapter 조합으로 revert하며 history를 재작성하지 않는다.
