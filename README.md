# Velog Style Jekyll Theme

velog의 글 읽기 흐름을 참고해 만든 Jekyll 기반 오픈소스 개발 블로그 테마입니다. GitHub Pages 프로젝트 페이지를 기본 배포 대상으로 두고, 태그 필터, 시리즈, 검색, GitHub 프로필 동기화, 기여 그래프까지 한 저장소 안에서 바로 사용할 수 있게 구성했습니다.

## 포함된 것

- velog 스타일의 글 목록, 시리즈, 상세 읽기 레이아웃
- 태그 필터와 검색
- 시스템 라이트/다크 모드 동기화
- GitHub 프로필과 기여 그래프 동기화
- GitHub Pages와 Jenkins 배포 흐름
- MIT 라이선스로 함께 배포 가능한 원본 SVG 샘플 자산

## 빠른 시작

```bash
BUNDLE_FORCE_RUBY_PLATFORM=true bundle install
ruby scripts/fetch_github_contributions.rb
BUNDLE_FORCE_RUBY_PLATFORM=true bundle exec jekyll serve
```

기본 주소는 [http://127.0.0.1:4000/blog/](http://127.0.0.1:4000/blog/) 입니다.

## 가장 먼저 바꿀 파일

- [_config.yml](/Users/woonyong/workspace/blog/_config.yml)
  사이트 제목, 설명, URL, 외부 연동 설정
- [_data/profile.yml](/Users/woonyong/workspace/blog/_data/profile.yml)
  기본 프로필 이름, 소개 문구, 샘플 GitHub 링크
- [_data/theme.yml](/Users/woonyong/workspace/blog/_data/theme.yml)
  탭 노출, 헤더 버튼, 홈 문구, GitHub 연동 옵션
- [_data/series.yml](/Users/woonyong/workspace/blog/_data/series.yml)
  시리즈 키와 표시 제목
- [_posts](/Users/woonyong/workspace/blog/_posts)
  실제 블로그 글
- [about.md](/Users/woonyong/workspace/blog/about.md)
  소개 탭을 켰을 때 보여줄 문서

## 설정 구조

### 사이트 메타와 외부 연동

[_config.yml](/Users/woonyong/workspace/blog/_config.yml)은 사이트 메타데이터와 외부 서비스 설정을 담습니다.

```yml
title: Velog Style Jekyll Theme
description: velog 감성의 개발 블로그를 GitHub Pages와 Jekyll로 구성한 오픈소스 테마 데모
url: "https://your-name.github.io"
baseurl: "/repo-name"
```

### UI와 동작 옵션

[_data/theme.yml](/Users/woonyong/workspace/blog/_data/theme.yml)은 테마 UI 옵션과 문구를 담당합니다.

```yml
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

### 기본 프로필 샘플

[_data/profile.yml](/Users/woonyong/workspace/blog/_data/profile.yml)은 GitHub 연결이 없을 때 보여줄 기본 프로필 값을 담습니다.

GitHub 아이디가 연결되어 있고 `profile.github_sync.enabled`가 켜져 있으면, 이름과 아바타, GitHub 링크는 공개 프로필 기준으로 자동 매핑됩니다. `bio`나 `intro`가 GitHub에서 비어 있으면 샘플 텍스트를 그대로 유지합니다.

## 글 작성 규칙

포스트는 [_posts](/Users/woonyong/workspace/blog/_posts)에 Markdown 파일로 추가합니다.

```md
---
title: 글 제목
description: 목록에 보일 짧은 설명
date: 2026-04-02 09:00:00 +0900
updated_at: 2026-04-02 20:00:00 +0900
thumbnail: /assets/images/posts/example.svg
series: theme-overview
tags:
  - Jekyll
  - Theme
---
```

- `thumbnail`이 있으면 목록 카드와 글 상단에 표시됩니다.
- `series`는 [_data/series.yml](/Users/woonyong/workspace/blog/_data/series.yml)의 키와 연결됩니다.
- `tags`는 목록 필터와 글 상세 태그 링크에 동시에 사용됩니다.

## GitHub 동기화

이 테마는 하나의 스크립트로 두 가지 데이터를 생성합니다.

- [_data/github_contributions_cache.json](/Users/woonyong/workspace/blog/_data/github_contributions_cache.json)
- [_data/github_profile_cache.json](/Users/woonyong/workspace/blog/_data/github_profile_cache.json)

실행 명령:

```bash
ruby scripts/fetch_github_contributions.rb
```

인증은 아래 셋 중 하나면 됩니다.

- `GITHUB_GRAPHQL_TOKEN`
- `GITHUB_TOKEN`
- `gh auth login`

## 샘플 이미지와 저작권

이 저장소의 샘플 SVG는 모두 이 프로젝트를 위해 직접 만든 원본 자산입니다.

- [assets/images/profile.svg](/Users/woonyong/workspace/blog/assets/images/profile.svg)
- [assets/images/avatar-placeholder.svg](/Users/woonyong/workspace/blog/assets/images/avatar-placeholder.svg)
- [assets/images/posts](/Users/woonyong/workspace/blog/assets/images/posts)

자세한 안내는 [NOTICE.md](/Users/woonyong/workspace/blog/NOTICE.md)에 정리했습니다. 외부 사진이나 서드파티 일러스트를 번들하지 않았기 때문에, 저장소를 그대로 데모 테마로 공개해도 샘플 자산 쪽 저작권 부담이 적습니다.

## Jenkins 배포

[Jenkinsfile](/Users/woonyong/workspace/blog/Jenkinsfile)은 아래 순서로 동작합니다.

1. 의존성 설치
2. GitHub 프로필/기여 그래프 동기화
3. Jekyll 빌드
4. `_site/`를 `gh-pages` 브랜치로 배포

필요한 Jenkins Credentials:

- `github-pages`
  - username: GitHub 사용자명
  - password: GitHub Personal Access Token

## 샘플 데이터 아카이브

이전 데모 포스트 세트는 [examples/demo-posts](/Users/woonyong/workspace/blog/examples/demo-posts)에 보관되어 있습니다. 기본 빌드에서는 제외되며, 필요할 때만 `_posts/`로 옮겨 사용할 수 있습니다.

## 라이선스

이 프로젝트는 [MIT License](/Users/woonyong/workspace/blog/LICENSE)를 사용합니다.
