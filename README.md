# WN Docs

WN Docs의 테마 소스와 GitHub Pages 배포 원본입니다. 공개 문서의 내용 정본은
private Obsidian Vault에 있고, 이 저장소는 승인된 문서 projection과 그 문서를
읽는 테마만 관리합니다.

## 소유 경계

```text
Obsidian Vault                         WN Docs (this repository)
──────────────────────────────────     ─────────────────────────────────────────
private / draft / publish 문서 상태  →  generated/public-content (read-only projection)
공개 승인된 Markdown 원본            →  Just the Docs 기반 WN Docs theme
근거·승인 기록                       →  Runnable Code Blocks web adapter
                                      →  GitHub Actions → GitHub Pages
```

- `docs/`는 현재 Just the Docs 공식 데모를 비교하기 위해 둔 초기 문서 집합입니다.
  Vault projection으로 교체할 때까지는 개인 지식 정본이 아닙니다.
- `generated/public-content/`는 Vault compiler의 결과물만 받습니다. 이 저장소에서
  Markdown을 직접 고치지 않습니다.
- `config/public-projection.yml`과 `npm run check:projection`은 projection Markdown에
  `publication_state: publish`, projection hash, portable front matter가 있는지와
  Obsidian wikilink·로컬 경로·private source link·session ID가 없는지를 검사합니다.
  승인된 문서가 아직 없을 때는 빈 projection을 정상 상태로 처리합니다.
- 표준 layout, sidebar, 검색, child navigation, typography는 `just-the-docs` gem이
  소유합니다. 이 저장소는 Just the Docs의 public extension point만 사용합니다.
- 색상 변경은 기존 WN 정글 초록색 light/dark scheme으로 제한합니다. 첫 렌더와 실행 중
  OS의 `prefers-color-scheme` 변화를 따르며, 수동 토글이나 저장된 사용자 설정은 없습니다.

## Runnable Code Blocks

`vendor/runnable-code-blocks`는 [obsidian-runnable-code-blocks](https://github.com/woonyong-kr/obsidian-runnable-code-blocks)의
검토된 commit을 가리키는 Git submodule입니다. `tools/runnable-code-blocks.ts`가 그
공통 runner를 정적 웹 adapter로 bundle하고, `run-<language>` fenced block만 실행 UI로
바꿉니다.

- 실행 가능한 언어와 각 provider는 plugin source의 `SUPPORTED_LANGUAGES`가 정본입니다.
- JavaScript, TypeScript, HTML, CSS는 브라우저의 격리된 실행/preview를 사용합니다.
- 나머지 언어는 실행 버튼을 누른 경우에만 해당 provider로 source를 보냅니다. provider의
  응답·제한·가용성은 WN Docs가 보증하지 않습니다.
- 전체 예제는 [Runnable Code Blocks](https://woonyong-kr.github.io/docs/ui-components/runnable-code-blocks/)에서
  언어별로 확인할 수 있습니다.

### Adapter 업데이트

plugin 변경을 자동으로 따라가지 않습니다. 아래처럼 commit을 의도적으로 검토·고정한 뒤,
테스트와 사이트 build를 모두 통과시켜야 합니다.

```bash
git submodule update --init --recursive
git -C vendor/runnable-code-blocks fetch origin
git -C vendor/runnable-code-blocks checkout <reviewed-commit>
npm --prefix vendor/runnable-code-blocks ci
npm --prefix vendor/runnable-code-blocks test
npm run check:playground
npm run build
npm run check:links
git add vendor/runnable-code-blocks assets/js/runnable-code-blocks.js assets/css/runnable-code-blocks.css
```

`check:playground`는 plugin의 지원 언어 목록이 runnable examples 페이지에 모두
포함되는지 확인합니다. React는 모션·상태·접근성처럼 학습 목적별 예제를 여러 개 둘 수 있고,
나머지 언어는 하나의 대표 예제를 유지합니다.

## 로컬 실행과 검증

`.ruby-version`의 Ruby 3.2.9와 Node.js 22가 필요합니다. macOS 기본 Ruby 2.6은
`Gemfile.lock`의 Bundler를 만족하지 않으므로 사용하지 않습니다. rbenv를 쓰는 환경에서는
`rbenv shell 3.2.9`를 먼저 실행합니다.

```bash
git clone --recurse-submodules https://github.com/woonyong-kr/woonyong-kr.github.io.git
cd woonyong-kr.github.io
rbenv shell 3.2.9 # rbenv를 쓰는 경우
npm --prefix vendor/runnable-code-blocks ci
bundle install
npm run verify
bundle exec jekyll serve --destination _site
```

`npm run verify`는 projection boundary unit test·검사, adapter unit test, 지원 언어/예제
일치 검사, Jekyll build, 내부 링크와 페이지 anchor 검사를 순서대로 실행합니다. GitHub
Actions도 같은 검증을 실행한 뒤에만
Pages artifact를 올립니다.

## 배포

`main`에 push하면 `.github/workflows/deploy.yml`이 build와 검증을 거쳐 GitHub Pages에
배포합니다. 배포 결과는 [Actions](https://github.com/woonyong-kr/woonyong-kr.github.io/actions)와
[https://woonyong-kr.github.io/](https://woonyong-kr.github.io/)에서 확인합니다.

배포 전에는 다음을 확인합니다.

1. `git status --short`로 변경 범위와 submodule pointer를 확인한다.
2. `npm run verify`를 통과시킨다.
3. runnable page에서 적어도 browser runner 하나를 실제 실행하고, light/dark 렌더와
   console 오류를 확인한다.
4. push 뒤에는 Actions 성공과 라이브 페이지의 build 결과를 재확인한다.
