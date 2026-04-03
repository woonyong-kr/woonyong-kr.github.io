# Velog Style Jekyll Theme

`velog`의 읽기 흐름을 참고해 만든 Jekyll 기반 개발 블로그 테마입니다. GitHub Pages 프로젝트 페이지를 기본 대상으로 하고, 태그 필터, 시리즈, 검색, GitHub 프로필 동기화, 기여 그래프, 라이트/다크 모드까지 한 번에 갖춘 출발점을 목표로 정리했습니다.

이 저장소는 단순한 마크업 샘플이 아니라, 실제로 복제해서 바로 바꿔 쓸 수 있는 오픈소스 테마 템플릿입니다. README와 `_posts/`의 데모 글은 모두 “테마 사용 설명서” 역할을 하도록 작성했습니다.

라이브 데모: [https://woonyong-kr.github.io/jekyll-theme-velog/](https://woonyong-kr.github.io/jekyll-theme-velog/)

라이트 모드와 다크 모드를 모두 지원하며, 기본값은 사용자의 시스템 모드를 따릅니다. 아래 프리뷰 이미지는 다크 모드 기준으로 캡처한 화면입니다.

## Preview

### Home

![Home preview](assets/images/docs/home-preview.png)

### Series

![Series preview](assets/images/docs/series-preview.png)

### Post

![Post preview](assets/images/docs/post-preview.png)

## What You Get

- velog 스타일의 글 목록과 시리즈 탭
- 태그 필터와 검색
- 글 상세 상단 썸네일, 태그, 이전/다음 글 네비게이션
- GitHub 프로필 동기화와 1년 기여 그래프
- 시스템 모드 동기화 기반 라이트/다크 모드 지원
- GitHub Pages 프로젝트 페이지 기준 경로 구조
- Jenkins 기반 자동 배포 예시
- README와 데모 글까지 포함된 문서형 샘플 콘텐츠

## Good Fit

- 개인 개발 블로그를 빠르게 열고 싶은 경우
- GitHub Pages에 바로 올릴 수 있는 정적 블로그가 필요한 경우
- 글, 시리즈, 태그, 검색이 모두 있는 시작점을 원하는 경우
- 오픈소스 공개용 테마 저장소를 템플릿처럼 다듬고 싶은 경우

## Quick Start

```bash
BUNDLE_FORCE_RUBY_PLATFORM=true bundle install
BUNDLE_FORCE_RUBY_PLATFORM=true bundle exec jekyll serve
```

기본 미리보기 주소:

```text
http://127.0.0.1:4000/jekyll-theme-velog/
```

GitHub 프로필과 잔디 그래프까지 같이 보고 싶다면 한 단계만 더 실행하면 됩니다.

```bash
ruby scripts/fetch_github_contributions.rb
```

이 단계는 선택 사항입니다. 토큰이나 `gh auth login`이 준비되지 않았다면 생략해도 되고, 그 경우에는 `_data/profile.yml`의 샘플 프로필이 대신 보입니다.

## First 10 Minutes

이 테마를 새 블로그로 바꿀 때는 아래 순서가 가장 빠릅니다.

1. `_config.yml`에서 `title`, `description`, `url`, `baseurl` 수정
2. `_data/profile.yml`에서 기본 이름, 소개 문구, 기본 GitHub 링크 수정
3. `_data/theme.yml`에서 헤더 버튼, 탭, GitHub 동기화 옵션 조정
4. `_data/series.yml`에 실제 시리즈 이름과 설명 입력
5. `_posts/`의 데모 글을 유지하거나 교체
6. 필요하면 `scripts/fetch_github_contributions.rb`로 GitHub 프로필 연결

여기까지 하면 HTML을 직접 수정하지 않아도 대부분의 브랜딩 전환이 끝납니다.

## Project Structure

```text
.
├── _config.yml
├── _data
│   ├── profile.yml
│   ├── series.yml
│   └── theme.yml
├── _includes
├── _layouts
├── _posts
├── assets
│   ├── css/main.css
│   ├── images
│   └── js/site.js
├── scripts/fetch_github_contributions.rb
├── Jenkinsfile
└── posts.json
```

구조는 크게 네 층으로 보면 이해가 쉽습니다.

1. `_config.yml`
   사이트 메타데이터, 배포 경로, 외부 연동
2. `_data/*.yml`
   프로필, 시리즈, UI 옵션 같은 구조화된 설정
3. `_layouts`, `_includes`, `assets`
   실제 테마 렌더링 코드
4. `_posts`
   사용자 콘텐츠

## Configuration Map

### `_config.yml`

사이트 레벨 설정입니다.

```yml
title: Velog Style Jekyll Theme
description: velog 감성의 개발 블로그를 GitHub Pages와 Jekyll로 구성한 오픈소스 테마 데모
url: "https://your-name.github.io"
baseurl: "/repo-name"
```

중요한 점은 `baseurl`입니다. GitHub Pages 프로젝트 페이지는 저장소 이름이 곧 URL 경로가 되므로, 저장소 이름을 바꾸면 `baseurl`도 같이 바꿔야 합니다.

### `_data/theme.yml`

테마 레벨 설정입니다. 표시 여부와 UI 문구를 이 파일에서 바꿉니다.

```yml
header:
  show_github_link: true
  show_rss_link: true
  show_theme_toggle: true

tabs:
  show_about: false

home:
  initial_post_count: 12
  search_placeholder: 검색어를 입력하세요

profile:
  github_sync:
    enabled: true

hero:
  github_contributions:
    enabled: true
    username: your-github-id
```

### Theme Modes

테마는 라이트 모드와 다크 모드를 모두 지원합니다.

- 기본값은 `prefers-color-scheme`를 따름
- 사용자가 토글하면 선택값을 `localStorage`에 저장
- 홈, 시리즈, 글 상세 페이지가 같은 테마 토큰을 공유
- README 프리뷰 이미지는 다크 모드 기준으로 정리

### `_data/profile.yml`

GitHub 연결이 없을 때 보여줄 fallback 데이터를 담습니다.

- 표시 이름
- 소개 문구
- 기본 아바타
- 기본 GitHub 링크

즉, GitHub 동기화가 실패해도 화면이 비어 보이지 않게 받쳐 주는 파일입니다.

### `_data/series.yml`

시리즈 키와 사용자에게 보일 제목/설명을 분리합니다.

```yml
theme-overview:
  title: 테마 소개와 구조
  description: 홈 구성, 글 목록, 시리즈 카드처럼 테마의 핵심 화면 구성을 빠르게 훑습니다.
```

글 front matter에는 짧은 키만 쓰고, 실제 카드 문구는 이 파일에서 관리하는 편이 유지보수에 좋습니다.

## Writing Posts

포스트는 `_posts/`에 Jekyll 규칙대로 작성합니다.

```md
---
title: 글 제목
description: 목록에 보일 짧은 설명
date: 2026-04-03 09:00:00 +0900
updated_at: 2026-04-03 21:00:00 +0900
thumbnail: /assets/images/posts/my-post-cover.png
series: theme-overview
tags:
  - Jekyll
  - Theme
---
```

필드별 사용 위치:

| 필드 | 용도 |
| --- | --- |
| `title` | 글 목록 제목, 상세 제목 |
| `description` | 카드 요약 문구 |
| `date` | 발행일 |
| `updated_at` | 수정일 표기, 최신 정렬 기준 |
| `thumbnail` | 카드 상단, 글 상세 상단 썸네일 |
| `series` | 시리즈 카드, 시리즈 필터 연결 |
| `tags` | 홈 태그 목록과 글 상세 태그 링크 |

현재 테마에서 확인해 둔 Markdown 범위:

- 제목과 일반 문단
- 리스트와 체크리스트
- 표
- 코드 블록
- 이미지
- 링크
- 인용문
- raw HTML
- YouTube iframe

## Demo Content

현재 `_posts/`에는 lorem ipsum 대신 아래 주제를 설명하는 실제 가이드 글이 들어 있습니다.

- 테마 소개
- 로컬 설치
- 테마 커스터마이징
- 글 작성 규칙
- GitHub 프로필 동기화
- GitHub Pages + Jenkins 배포

즉, 이 저장소를 실행하면 “빈 테마”가 아니라 “사용법을 같이 보여주는 테마 데모 사이트”가 열립니다.

| 글 | 다루는 내용 |
| --- | --- |
| `Velog Style Jekyll Theme 소개` | 전체 화면 구성과 오픈소스 테마로서의 방향 |
| `로컬에서 테마를 설치하고 미리보기하는 가장 빠른 방법` | 로컬 실행, `baseurl`, 초기 오류 대응 |
| `프로필, 탭, 홈 화면을 테마 설정으로 커스터마이징하기` | `_config.yml`, `_data/theme.yml`, `_data/profile.yml` 사용법 |
| `글, 시리즈, 태그, 썸네일을 이 테마에서 다루는 방법` | front matter, 시리즈, 태그, 썸네일 작성 규칙 |
| `GitHub 프로필 동기화와 기여 그래프를 붙이는 방법` | 프로필 동기화, 파비콘, 기여 그래프 캐시 구조 |
| `GitHub Pages와 Jenkins로 테마를 배포하는 방법` | `gh-pages` 배포와 Jenkins 파이프라인 흐름 |

## GitHub Profile Sync

`scripts/fetch_github_contributions.rb`는 두 가지 캐시를 만듭니다.

- `_data/github_contributions_cache.json`
- `_data/github_profile_cache.json`

실행 명령:

```bash
ruby scripts/fetch_github_contributions.rb
```

인증은 아래 셋 중 하나면 됩니다.

- `GITHUB_GRAPHQL_TOKEN`
- `GITHUB_TOKEN`
- `gh auth login`

동기화가 성공하면 아래 항목이 자동으로 갱신됩니다.

- 홈 프로필 아바타와 이름
- 헤더 브랜드 아이콘
- 브라우저 탭 파비콘
- GitHub 링크
- 1년 기여 그래프

연결이 실패해도 `_data/profile.yml`의 샘플 데이터로 화면이 유지되도록 설계했습니다.

## External Integrations

기본값은 모두 비활성 상태입니다. 필요할 때만 `_config.yml`을 채우면 됩니다.

### Google Analytics

```yml
analytics:
  google:
    measurement_id: "G-XXXXXXXXXX"
```

### Disqus

```yml
comments:
  provider: "disqus"
  disqus:
    shortname: "your-shortname"
```

### Algolia

```yml
search:
  provider: "algolia"
  algolia:
    app_id: "YOUR_APP_ID"
    api_key: "YOUR_SEARCH_API_KEY"
    index_name: "YOUR_INDEX_NAME"
    insights: true
```

## Deployment

### GitHub Pages

이 테마는 GitHub Pages 프로젝트 페이지 구조를 기본값으로 사용합니다.

1. 저장소의 Pages 소스를 `gh-pages` 브랜치 `/ (root)`로 설정
2. `_config.yml`의 `baseurl`을 저장소 이름과 맞춤
3. 생성된 `_site/`를 `gh-pages`로 배포

### Jenkins

`Jenkinsfile`은 아래 순서로 동작합니다.

1. Ruby 의존성 설치
2. GitHub 프로필과 기여 그래프 동기화
3. `jekyll build`
4. `_site/`를 `gh-pages` 브랜치로 반영

필요한 Jenkins Credentials:

- `github-pages`
  - username: GitHub 사용자명
  - password: GitHub Personal Access Token

## Troubleshooting

### 스타일이 깨져 보일 때

가장 먼저 `_config.yml`의 `baseurl`과 실제 저장소 이름이 같은지 확인하세요. 프로젝트 페이지에서는 이 값이 어긋나면 CSS, JS, 이미지 경로가 같이 틀어집니다.

### GitHub 그래프가 비어 있을 때

아래 중 하나가 준비돼 있는지 확인하세요.

- `GITHUB_GRAPHQL_TOKEN`
- `GITHUB_TOKEN`
- `gh auth login`

### 로컬에서 gem 설치가 실패할 때

Apple Silicon 환경이나 네이티브 gem 문제를 피하기 위해 예시 명령에 `BUNDLE_FORCE_RUBY_PLATFORM=true`를 기본으로 넣어 두었습니다.

## Bundled Assets And License

이 저장소에는 세 종류의 자산이 포함됩니다.

- 직접 제작한 프로필 관련 SVG
- Unsplash License 기준으로 사용할 수 있는 포스트 커버 PNG
- 이 테마를 실제로 캡처해 만든 프리뷰 스크린샷

자세한 출처는 [NOTICE.md](NOTICE.md)에 정리되어 있습니다.

## Cleanup Principles

오픈소스 테마로 공개하기 위해 저장소에는 아래 기준을 적용했습니다.

- 렌더링에 쓰이지 않는 예전 데모 자산은 남기지 않음
- 문서용 이미지와 실제 사이트 자산의 역할을 분리
- 샘플 콘텐츠도 사용자 가이드 역할을 하도록 유지
- 빌드에 필요 없는 임시 산출물은 추적하지 않음

## License

이 프로젝트는 `MIT License`를 사용합니다.
