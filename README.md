# WN Docs

Just the Docs와 GitHub Pages로 운영하는 공개 문서 사이트입니다. 내용 정본은 private
Obsidian Vault에 있고, 이 저장소는 승인된 projection과 테마·웹 실행 연결을 관리합니다.

## 소유 경계

- `generated/public-content/`는 Vault producer의 결과입니다. 생성 Markdown과
  `projection_sha256`를 사이트에서 수동 수정하거나 재계산하지 않습니다.
- 공개 검사는 YAML parser와 schema, ID·permalink 유일성, 파일 유형을 검사합니다.
  Jekyll 빌드 후에는 정규화한 렌더링 URL, 검색·sitemap, 전체 배포 파일 목록도 검사합니다.
- `docs/`에는 기존 URL의 [실행 showcase](https://docs.woonyong.com/docs/ui-components/runnable-code-blocks/)만
  남습니다. 종료 주소는 404를 반환합니다. 작은 회귀 fixture는 `tests/fixtures/`에 있고 배포되지 않습니다.
- 표준 layout·검색·navigation은 Just the Docs gem을 사용합니다. 기본 stylesheet가 light를
  담당하고 custom dark를 추가합니다. 작은 upstream navigation 보조 stylesheet는 유지합니다.
- 테마 수동 선택은 현재 페이지에서만 유지합니다. 다음 페이지는 OS 설정을 따릅니다.
- `wiki_show_planned`는 승인된 공개 projection의 작성 예정 문서 표시 설정입니다.
  false이면 준비된 문서와 그 조상만 출력합니다. 공개 승인 자체를 바꾸는 설정은 아닙니다.

## 실행 방식

`vendor/runnable-code-blocks`는 [공통 원본](https://github.com/woonyong-kr/obsidian-runnable-code-blocks)의
검증된 Git submodule commit입니다. 공통 동작은 원본에서 수정하고 사이트에서 복제하지 않습니다.

일반 문서는 작은 탐색 코드만 내려받습니다. 원래 코드는 즉시 읽을 수 있고, 편집기는
viewport의 200px 이내 또는 사용자가 코드에 접근할 때 준비합니다. React·TypeScript는
해당 언어 실행 시 로드됩니다. 웹 bundle은 ESM chunk이고 Obsidian 배포물은 단일 bundle입니다.

브라우저 언어는 Worker 또는 sandbox preview를 사용합니다. 나머지는 현재 개인 실행 서버를
사용하며 Run 전에는 source를 보내지 않습니다. 외부 공개 provider로 자동 전환하지 않습니다.

- capabilities deadline: 2.5초. 실행 deadline: 전송 재시도를 포함해 22초.
- 전송 실패만 같은 request ID로 최대 한 번 재시도합니다. 취소·timeout·429는 자동 재실행하지 않습니다.
- JSON 응답은 최대 1MiB이며 header와 body 모두 deadline·취소 범위에 포함됩니다.
- 서버 사용 불가 상태는 다시 확인, online 전환, 탭 복귀로 복구합니다. 편집 내용과 출력은 유지합니다.
- 최초 module 다운로드 실패는 본문을 보존하고 새로고침 동작을 제공합니다. 브라우저가 실패한 module import를 현재 문서에 캐시하기 때문입니다. 이 단계에는 아직 생성된 편집기가 없습니다.
- HTTP 중단은 원래 request ID로 개인 서버에 취소를 요청합니다. 서버가 Docker 컨테이너 제거를 확인한 뒤에만 종료 완료로 표시하며, 오프라인·이전 서버·정리 실패로 확인할 수 없으면 종료 여부가 불명확하다고 표시합니다.
- Interactive preview의 JavaScript는 Worker에서 실행합니다. 중단은 Worker를 실제로 종료하며, 2초 동안 응답하지 않는 Worker도 자동 종료합니다. Canvas 2D·WebGL·WebGL2는 같은 Worker의 native OffscreenCanvas에서 그린 뒤 화면에 픽셀을 전달합니다. 편집·크기 변경·입력·중단 후 재실행을 지원합니다. 임의의 동기식 layout/browser API는 Worker DOM의 지원 범위에 따릅니다.
- Canvas는 최대 8개, 한 변 2048px, 개별 1 megapixel·전체 4 megapixel로 제한하고 화면 전송은 최대 30fps로 제어합니다. GPU context 지원 여부는 브라우저 환경에 따릅니다.
- 개인 서버의 15초 제한에는 컴파일 시간이 포함됩니다. timeout은 종료 코드 124와 안내를 반환하고, Docker가 확인한 메모리 초과·진단 없는 비정상 종료는 각각 구분합니다. 실패한 코드를 자동 재실행하지 않습니다.

## Mermaid

Mermaid fence가 있는 페이지에서만 로컬 렌더러를 불러옵니다. `tools/diagrams.ts`가
원문을 보존하며 밝은 테마와 어두운 테마에 맞춰 다시 그립니다. JavaScript가 없거나
렌더링에 실패해도 원문 코드는 가로 스크롤 안에서 읽을 수 있습니다.

`npm run build:diagrams`는 lockfile에 고정한 Mermaid와 필요한 diagram 모듈을
`assets/js/diagrams/`에 생성합니다. 생성물과 의존 패키지 고지문은 최종 자산 목록과
해시 검사에 포함하며, 일반 문서에서는 Mermaid 자산을 요청하지 않습니다.

## 로컬 검증

Node.js 22와 `.ruby-version`의 Ruby 3.2.9가 필요합니다. macOS 기본 Ruby 2.6은 사용하지 않습니다.

```bash
git clone --recurse-submodules https://github.com/woonyong-kr/woonyong-kr.github.io.git
cd woonyong-kr.github.io
rbenv shell 3.2.9
npm ci
npm --prefix vendor/runnable-code-blocks ci
bundle install
npx playwright install chromium firefox webkit
npm run verify
bundle exec jekyll serve --destination _site
```

`npm run verify`는 타입 검사, 공개 경계/Jekyll 통합 테스트, fence 예제 계약, projection 검사,
ESM·Jekyll build, 최종 파일/URL 검사, 내부 링크 검사, 실제 산출물 Playwright를 한 번씩 실행합니다.
Chromium은 전체 시나리오, Firefox·WebKit은 문서·테마·기본 실행·복구 시나리오를 검사합니다.
브라우저 테스트의 개인 서버는 로컬 fixture로 대체하며 source를 실제 서버로 전송하지 않습니다.

로컬 최종 전달 전에는 Woon producer가 설치된 Python 환경에서 읽기 전용 bytes 비교를 추가합니다.
CI에는 private Vault가 없으므로 이 검사는 로컬 전달 gate입니다.

```bash
python3 scripts/check-projection-source.py --vault <canonical-vault>
```

불일치하면 Vault producer 소유 작업에서 재생성하고 다시 비교합니다. 생성 파일의 수동 보정은 금지합니다.

## Adapter 갱신과 배포

1. 공통 원본에서 `npm run verify`를 통과시키고 commit을 원격에 먼저 올립니다.
2. 사이트 submodule을 그 commit으로 고정하고 사이트의 `npm run verify`를 실행합니다.
3. 사이트 commit은 submodule만 stage합니다. bundle·CSS·`_site`는 생성물이므로 Git에 추가하지 않습니다.

```bash
git -C vendor/runnable-code-blocks fetch origin
git -C vendor/runnable-code-blocks checkout <verified-remote-commit>
npm --prefix vendor/runnable-code-blocks ci
npm run verify
git add vendor/runnable-code-blocks
```

PR은 검증만 실행합니다. 검증된 main 산출물만 Pages에 배포하며 Pages·OIDC 권한은 deploy job에 한정합니다.
`build-info.json`에는 site SHA, adapter SHA, 공개 자산 해시만 포함합니다. private receipt나 Vault 경로는 없습니다.
배포 후 live build 정보·자산을 대조하고 홈·Wiki·showcase, 테마, 브라우저 실행과 개인 서버 실행을 확인합니다.
개인 서버 offline은 문서 사이트 장애와 구분해 기록합니다.

되돌릴 때는 직전 검증된 site commit과 adapter 조합으로 revert합니다. 생성 bundle 교체나 history 재작성으로
되돌리지 않습니다. 테스트 변경 근거와 측정 결과는 [QUALITY.md](QUALITY.md)에 기록합니다.
