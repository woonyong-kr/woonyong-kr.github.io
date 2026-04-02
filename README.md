# Velog-Inspired Jekyll Theme

velog의 글 읽기 흐름을 참고해 만든 Jekyll 기반 개발 블로그 테마입니다. GitHub Pages 프로젝트 페이지와 Jenkins 배포를 기본으로 두고, 태그 필터, 시리즈, 검색, 다크 모드, GitHub 기여 그래프까지 정적 사이트에 맞게 구성했습니다.

이 저장소의 현재 값은 예시이므로, 공개 테마처럼 쓰려면 아래 파일부터 바꾸면 됩니다.

## 핵심 기능

- velog 스타일의 글 목록, 시리즈, 소개 탭
- 태그 필터와 검색
- 썸네일 조건부 노출
- 다크 모드와 시스템 테마 동기화
- GitHub 기여 그래프 히어로 섹션
- Google Analytics, Disqus, Algolia 선택 연동
- Jenkins 기반 `gh-pages` 배포

## 빠른 시작

```bash
BUNDLE_FORCE_RUBY_PLATFORM=true bundle install
ruby scripts/fetch_github_contributions.rb
BUNDLE_FORCE_RUBY_PLATFORM=true bundle exec jekyll serve
```

기본 주소는 [http://127.0.0.1:4000/blog/](http://127.0.0.1:4000/blog/) 입니다.

기여 그래프를 쓰지 않거나 토큰이 없으면 `ruby scripts/fetch_github_contributions.rb` 단계는 건너뛸 수 있습니다. 이 경우 잔디 그래프만 숨겨집니다.

## 가장 먼저 바꿀 파일

- [_config.yml](/Users/woonyong/workspace/blog/_config.yml)
  - `title`, `description`, `url`, `baseurl`
  - Analytics, 댓글, Algolia 같은 외부 연동
- [_data/profile.yml](/Users/woonyong/workspace/blog/_data/profile.yml)
  - 이름, 소개, 아바타, GitHub 링크
- [_data/theme.yml](/Users/woonyong/workspace/blog/_data/theme.yml)
  - 탭 라벨, 헤더 아이콘 표시, 기본 페이지 크기, 홈 문구
- [_data/series.yml](/Users/woonyong/workspace/blog/_data/series.yml)
  - 시리즈 키와 제목
- [about.md](/Users/woonyong/workspace/blog/about.md)
  - 소개 페이지 본문
- [_posts](/Users/woonyong/workspace/blog/_posts)
  - 실제 글
- [examples/demo-posts](/Users/woonyong/workspace/blog/examples/demo-posts)
  - 기본 빌드에서는 제외되는 추가 데모 글 모음

## 설정 구조

### 사이트와 배포 설정

[_config.yml](/Users/woonyong/workspace/blog/_config.yml)은 사이트 메타데이터와 외부 연동처럼 “빌드에 영향을 주는 값”을 둡니다.

```yml
title: your-blog
description: 개발 기록을 남기는 블로그
url: "https://your-name.github.io"
baseurl: "/blog"
```

`baseurl`은 GitHub Pages 프로젝트 페이지라면 `/repo-name`, 사용자 페이지라면 보통 빈 문자열 `""`입니다.

### UI 테마 설정

[_data/theme.yml](/Users/woonyong/workspace/blog/_data/theme.yml)은 테마의 표시 옵션과 라벨을 둡니다.

```yml
header:
  show_github_link: true
  show_rss_link: true
  show_theme_toggle: true

tabs:
  posts_label: 글
  series_label: 시리즈
  about_label: 소개

home:
  initial_post_count: 12
  search_placeholder: 검색어를 입력하세요
  all_posts_label: 전체보기
  tag_list_title: 태그 목록
```

추천 기준은 이렇습니다.

- `_config.yml`: URL, 외부 연동, 빌드에 필요한 값
- `_data/theme.yml`: 문구, 표시 여부, 목록 크기 같은 UI 값
- `_data/profile.yml`: 블로그 소유자 정보

## 글 작성 규칙

포스트는 [_posts](/Users/woonyong/workspace/blog/_posts)에 Markdown 파일로 추가합니다.

더 많은 샘플 글이 필요하면 [examples/demo-posts](/Users/woonyong/workspace/blog/examples/demo-posts)에 있는 예시 포스트를 `_posts/`로 옮겨서 데모 세트를 확장할 수 있습니다.

예시 front matter:

```md
---
title: 글 제목
description: 목록에 보일 짧은 설명
date: 2026-04-02 09:00:00 +0900
updated_at: 2026-04-02 20:00:00 +0900
thumbnail: /assets/images/posts/example.svg
tags:
  - Jekyll
  - GitHub Pages
series: shipping-fast
---
```

- `thumbnail`이 있으면 카드와 상세 상단에 이미지를 보여줍니다.
- `updated_at`이 있으면 상세 메타에 수정일을 보여줍니다.
- `series`는 [_data/series.yml](/Users/woonyong/workspace/blog/_data/series.yml)의 키와 맞아야 합니다.

## GitHub 기여 그래프

히어로 영역의 잔디 그래프는 GitHub GraphQL API에서 최근 1년 기여 데이터를 받아 그립니다.

설정 파일:
- [_data/theme.yml](/Users/woonyong/workspace/blog/_data/theme.yml)

```yml
hero:
  github_contributions:
    enabled: true
    username: your-github-id
```

데이터 생성:

```bash
ruby scripts/fetch_github_contributions.rb
```

이 스크립트는 [_data/github_contributions_cache.json](/Users/woonyong/workspace/blog/_data/github_contributions_cache.json)에 캐시를 만들고, 빌드 시 이 데이터를 사용합니다.

인증 방법은 셋 중 하나면 됩니다.

- `GITHUB_GRAPHQL_TOKEN`
- `GITHUB_TOKEN`
- `gh auth login`

## 선택 연동

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
  provider: algolia
  algolia:
    app_id: "YOUR_APP_ID"
    api_key: "YOUR_SEARCH_ONLY_KEY"
    index_name: "YOUR_INDEX_NAME"
    insights: true
```

## 빌드

```bash
ruby scripts/fetch_github_contributions.rb
BUNDLE_FORCE_RUBY_PLATFORM=true bundle exec jekyll build
```

빌드 결과물은 [_site](/Users/woonyong/workspace/blog/_site)에 생성됩니다.

검증:

```bash
BUNDLE_FORCE_RUBY_PLATFORM=true bundle exec jekyll doctor
```

## Jenkins 배포

[Jenkinsfile](/Users/woonyong/workspace/blog/Jenkinsfile)은 다음 순서로 동작합니다.

- 의존성 설치
- GitHub 기여 그래프 동기화
- Jekyll 빌드
- `_site/`를 `gh-pages` 브랜치로 배포

필요한 Jenkins Credentials:

- `github-pages`
  - username: GitHub 사용자명
  - password: GitHub Personal Access Token

현재 파이프라인은 하루 한 번 GitHub 기여 그래프를 자동 동기화하도록 스케줄되어 있습니다.

## 공개 테마로 정리할 때 권장 사항

- [_data/profile.yml](/Users/woonyong/workspace/blog/_data/profile.yml)의 개인 정보는 샘플 값으로 교체
- [about.md](/Users/woonyong/workspace/blog/about.md)는 예시 소개 페이지로 단순화
- [_posts](/Users/woonyong/workspace/blog/_posts)는 기본 데모 세트만 유지하고, 추가 샘플은 [examples/demo-posts](/Users/woonyong/workspace/blog/examples/demo-posts)로 분리
- GitHub Pages 프로젝트 페이지가 아니라 사용자 페이지를 쓸 경우 `baseurl` 조정

## 참고

- GitHub Pages 프로젝트 페이지 경로를 쓰는 경우 `baseurl` 설정이 중요합니다.
- 디자인 구조와 읽기 흐름은 [velog-io/velog](https://github.com/velog-io/velog) 오픈소스를 참고해 정적 블로그에 맞게 재구성했습니다.
