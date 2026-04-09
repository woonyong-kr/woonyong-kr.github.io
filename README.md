# blog.woonyong.org

실제 블로그 운영용 저장소입니다.

테마 소스는 [woonyong-kr/jekyll-theme-velog](https://github.com/woonyong-kr/jekyll-theme-velog) 에서 관리합니다.

## 테마 업데이트 동기화

이 저장소는 GitHub의 fork 네트워크에 직접 연결되어 있지 않아서, 대신 `.github/workflows/sync-theme-updates.yml` 로 업스트림 테마 변경을 자동 PR로 받아옵니다.

- 수동 실행: `Actions -> Sync Theme Updates -> Run workflow`
- 자동 실행: 매주 월요일 오전 10:10(KST)
- PR 브랜치: `sync/theme-updates`

동기화 PR은 테마 레포의 최신 `main` 을 병합한 뒤, 아래 운영 전용 파일은 현재 블로그 기준으로 다시 복원합니다.

- `CNAME`
- `README.md`
- `_config.yml`
- `_data/profile.yml`
- `_data/theme.yml`
- `about.md`
- `_posts/`
- `_drafts/`
- `assets/images/profile.svg`
- `assets/images/favicon.png`
- `assets/images/posts/`

즉, 공통 레이아웃과 스타일은 테마에서 따라오고, 실제 블로그 설정과 콘텐츠는 운영 레포에 남는 구조입니다.

공유 UI/CSS/레이아웃 파일에 충돌이 나면 sync workflow는 테마 레포 버전을 우선 적용합니다. 운영 레포에서 공유 파일을 직접 수정하는 방식은 지양하고, 공통 변경은 테마 레포에서 먼저 반영하는 것을 기본 원칙으로 사용합니다.

## 댓글 설정

GitHub Discussions 기반 댓글은 이미 연결되어 있습니다.

- Discussions: 활성화됨
- 댓글 provider: `giscus`
- repo: `woonyong-kr/woonyong-kr.github.io`
- category: `Announcements`
- mapping: `pathname`

댓글 저장소나 카테고리를 바꾸려면 `_config.yml` 의 `comments.giscus` 값을 함께 갱신하면 됩니다.
