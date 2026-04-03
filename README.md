# Velog Style Jekyll Theme

`velog`의 읽기 흐름을 참고해 만든 Jekyll 기반 개발 블로그 테마입니다. GitHub Pages 프로젝트 페이지를 기본 대상으로 삼고, 태그 필터, 시리즈, 검색, GitHub 프로필 동기화, 기여 그래프, Jenkins 배포 흐름까지 한 저장소 안에서 바로 사용할 수 있도록 정리했습니다.

이 저장소는 단순한 화면 데모가 아니라, 실제 테마 사용자 입장에서 필요한 설치 문서와 예시 글 세트를 함께 제공합니다. `_posts/`에 들어 있는 글은 테마 소개용 샘플이자 곧바로 복제 가능한 운영 가이드입니다.

## 포함된 기능

- velog 스타일의 글 목록, 글 상세, 시리즈 카드 레이아웃
- 태그 필터와 검색
- 시스템 라이트/다크 모드 동기화
- GitHub 프로필 동기화와 기여 그래프
- GitHub Pages 프로젝트 페이지 배포 구조
- Jenkins 기반 자동 배포 예시
- MIT 라이선스로 함께 배포 가능한 원본 SVG 샘플 자산

## 이 테마가 어울리는 경우

- 긴 기술 글과 짧은 메모를 함께 운영하는 개인 개발 블로그
- GitHub Pages 위에 올릴 수 있는 정적 블로그 테마가 필요한 경우
- 프로필, 태그, 시리즈, 검색을 한 번에 갖춘 출발점을 원하는 경우
- README와 예시 글까지 포함된 오픈소스 테마 템플릿이 필요한 경우

## 빠른 시작

```bash
BUNDLE_FORCE_RUBY_PLATFORM=true bundle install
ruby scripts/fetch_github_contributions.rb
BUNDLE_FORCE_RUBY_PLATFORM=true bundle exec jekyll serve
```

기본 미리보기 주소는 `http://127.0.0.1:4000/jekyll-theme-velog/` 입니다.

`ruby scripts/fetch_github_contributions.rb`는 선택 사항입니다. GitHub 토큰이나 `gh auth login`이 준비되지 않았다면 이 단계를 건너뛸 수 있고, 그 경우에는 `_data/profile.yml`의 샘플 프로필이 대신 보입니다.

## 가장 먼저 바꿀 파일

- `_config.yml`
  - 사이트 제목, 설명, `url`, `baseurl`, 외부 연동 설정
- `_data/profile.yml`
  - GitHub 연결이 없을 때 보여줄 기본 프로필 이름, 소개 문구, 기본 아바타
- `_data/theme.yml`
  - 헤더 링크, 탭 노출, 홈 문구, GitHub 연동 옵션
- `_data/series.yml`
  - 시리즈 키와 표시 이름, 시리즈 설명
- `_posts/`
  - 실제 블로그 글
- `about.md`
  - 소개 탭을 켰을 때 보여줄 문서

## 프로젝트 구조

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

구조는 크게 네 층으로 나뉩니다.

1. `_config.yml`
   - 사이트 메타데이터와 외부 연동 설정
2. `_data/*.yml`
   - 프로필, 시리즈, UI 옵션 같은 구조화된 설정
3. `_layouts`, `_includes`, `assets`
   - 실제 테마 렌더링 코드
4. `_posts`
   - 사용자 콘텐츠

## 설정 구조

### 1. 사이트 메타와 배포 경로

`_config.yml`은 사이트 제목, 설명, 배포 주소, 외부 서비스 설정을 담당합니다.

```yml
title: Velog Style Jekyll Theme
description: velog 감성의 개발 블로그를 GitHub Pages와 Jekyll로 구성한 오픈소스 테마 데모
url: "https://your-name.github.io"
baseurl: "/repo-name"
```

중요한 점은 `baseurl`입니다. GitHub Pages 프로젝트 페이지는 저장소 이름이 곧 URL 경로가 되므로, 저장소 이름을 바꾸면 `baseurl`도 반드시 같이 바꿔야 합니다.

### 2. UI와 동작 옵션

`_data/theme.yml`은 테마 토글과 문구를 관리합니다.

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

HTML을 수정하지 않고도 대부분의 UI 문구와 표시 여부를 이 파일에서 바꿀 수 있습니다.

### 3. 기본 프로필 샘플

`_data/profile.yml`은 GitHub 연결이 없을 때 보여줄 fallback 데이터를 담습니다.

GitHub 동기화가 켜져 있으면 다음 값이 자동으로 덮어써질 수 있습니다.

- 이름
- 아바타
- GitHub 링크
- 프로필 소개 일부

공개 프로필의 `bio`가 비어 있으면 샘플 소개 문구를 그대로 유지하도록 만들어 두었습니다.

### 4. 시리즈 정의

시리즈는 `series` front matter 값과 `_data/series.yml` 키를 연결하는 방식입니다.

```yml
theme-overview:
  title: 테마 소개와 구조
  description: 홈 구성, 글 목록, 시리즈 카드처럼 테마의 핵심 화면 구성을 빠르게 훑습니다.
```

제목과 설명을 분리해 두었기 때문에, 시리즈 카드에는 사용자 친화적인 텍스트를 보여주고 글 front matter는 짧은 키로 관리할 수 있습니다.

## 글 작성 규칙

포스트는 `_posts/`에 Jekyll 규칙대로 작성합니다.

```md
---
title: 글 제목
description: 목록에 보일 짧은 설명
date: 2026-04-03 09:00:00 +0900
updated_at: 2026-04-03 21:00:00 +0900
thumbnail: /assets/images/posts/example.svg
series: theme-overview
tags:
  - Jekyll
  - Theme
---
```

주요 필드는 다음처럼 동작합니다.

| 필드 | 용도 |
| --- | --- |
| `title` | 글 제목 |
| `description` | 글 목록 요약 |
| `date` | 발행일 |
| `updated_at` | 수정일 표시와 최신 정렬 기준 |
| `thumbnail` | 카드/상세 상단 썸네일 |
| `series` | 시리즈 카드 및 필터 연결 |
| `tags` | 홈 필터와 글 상세 태그 링크 |

Markdown은 `kramdown + GFM` 기준으로 동작합니다. 이 저장소의 예시 글에는 다음 요소가 포함되어 있습니다.

- 제목, 리스트, 체크리스트
- 표
- 코드 블록
- 이미지
- 링크
- 인용문
- raw HTML
- YouTube iframe

## GitHub 프로필과 기여 그래프 동기화

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

이 스크립트가 성공하면 홈의 프로필 블록과 잔디 그래프가 자동으로 갱신됩니다.

## 외부 연동

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

## 배포

### GitHub Pages

이 테마는 GitHub Pages 프로젝트 페이지 구조를 기본값으로 사용합니다.

1. 저장소의 Pages 소스를 `gh-pages` 브랜치 `/ (root)`로 설정
2. `_config.yml`의 `baseurl`을 저장소 이름과 맞춤
3. 생성된 `_site/`를 `gh-pages`로 배포

### Jenkins

`Jenkinsfile`은 아래 순서로 동작합니다.

1. Ruby 의존성 설치
2. GitHub 프로필/기여 그래프 동기화
3. `jekyll build`
4. `_site/`를 `gh-pages` 브랜치로 반영

필요한 Jenkins Credentials:

- `github-pages`
  - username: GitHub 사용자명
  - password: GitHub Personal Access Token

## 데모 콘텐츠

현재 `_posts/`에는 단순 lorem ipsum이 아니라, 실제 테마 사용 설명서 역할을 하는 예시 문서를 넣어두었습니다.

- 테마 소개
- 로컬 설치
- 테마 커스터마이징
- 글 작성 규칙
- GitHub 동기화
- GitHub Pages + Jenkins 배포

즉, 이 저장소를 그대로 실행하면 “예쁜 빈 테마”가 아니라 “어떻게 써야 하는지 바로 알 수 있는 문서형 데모 블로그”가 열리도록 구성했습니다.

## 샘플 이미지와 저작권

이 저장소에 포함된 SVG 자산은 모두 이 프로젝트를 위해 직접 만든 원본입니다.

- `assets/images/profile.svg`
- `assets/images/avatar-placeholder.svg`
- `assets/images/posts/*`

외부 사진, 서드파티 아이콘 세트, 상업용 일러스트를 번들하지 않았기 때문에 공개 저장소 데모로 배포하기에 안전한 편입니다. 자세한 내용은 `NOTICE.md`를 참고하세요.

## 정리 원칙

오픈소스 테마로 배포하기 위해 저장소에는 다음 원칙을 적용했습니다.

- 생성 산출물은 Git으로 추적하지 않음
- 빈 예시 폴더나 폐기된 데모 세트는 남기지 않음
- 실제로 렌더링되지 않는 분기나 죽은 스타일은 정리
- 샘플 콘텐츠도 사용 설명서 역할을 할 수 있어야 함

## 라이선스

이 프로젝트는 `MIT License`를 사용합니다.
