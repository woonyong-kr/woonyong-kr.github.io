# WN.

<https://woonyong-kr.github.io>의 공개 개발 블로그·Wiki·선택 프로젝트·About 이력서 소스입니다.

## 공개 정보 구조

```text
content/posts/              ── Blog
content/work/kyro.md        ── Projects의 유일한 case study
content/resume.md           ── About (공개 웹 이력서)
woon-knowledge Git HEAD     ── 공개 승인된 Wiki만 투영
                              ↓
Jekyll + Just the Docs      ── dist/ ── GitHub Pages
```

- `/`은 최신 글을 보여 주는 Blog 홈이고, `/blog/`은 글·태그·시리즈 목록입니다.
- `/wiki/`는 `publish: true`, `access: public`, `status: Active`이고 draft/private가 아닌 Obsidian 문서만 가져옵니다. Vault의 미커밋 변경이나 개인 메모는 읽지 않습니다.
- `/projects/`에는 사용자가 직접 선택한 Kyro만 있습니다. 대표 이미지는 실제 아키텍처 SVG입니다.
- `/about/`은 공개 이력서입니다. 별도의 숨긴 이력서 URL은 만들지 않습니다.
- 기존 `index.html#/posts/<slug>`와 `index.html#/projects/kyro`는 시작 시 안정 URL로 이동합니다.

`generated/_blog`, `generated/_wiki`, `generated/_projects`, `generated/_pages`, `dist/`는 생성물입니다. 원본을 수정한 뒤 `npm run sync:public`으로 다시 만듭니다.

## 로컬 실행과 검증

Ruby 3.2 이상과 Node.js가 필요합니다.

```shell
bundle install
npm install
npm run dev       # http://localhost:5173
npm run lint
npm test
npm run build     # 공개 투영, 근거·이미지·출력 경계 검사 포함
```

배포는 출력 저장소만 갱신합니다.

```shell
npm run deploy
```

공개할 Wiki 문서는 먼저 private Vault에서 검토하고 커밋한 뒤, 위 빌드와 화면 확인을 통과한 경우에만 배포합니다. 공개 승격은 자동 선택하지 않습니다.

## 작성 기준

- Blog: 문제·판단·구현·검증 범위와 한계를 연결한 개발 노트
- Wiki: 나중에 다시 찾고 다른 개발자가 따라갈 수 있는 개념·책 중심 기술 노트
- Project: 구현 단위의 맥락과 역할·근거·한계를 묶은 선택 case study
- About: 지원 시 읽히는 짧고 사실 중심의 공개 웹 이력서

JD별 이력서 조합과 이전 제출본은 `career/`의 로컬 자료이며 공개 빌드에는 포함하지 않습니다. 과거 제출본을 현재 사실의 공개 근거로 자동 승격하지 않습니다.
