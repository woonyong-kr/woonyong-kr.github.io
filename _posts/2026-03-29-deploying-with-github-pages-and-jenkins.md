---
title: "GitHub Pages와 Jenkins로 테마를 배포하는 방법"
description: "프로젝트 페이지 기준으로 빌드 결과를 gh-pages 브랜치에 배포하는 기본 흐름을 정리합니다."
date: 2026-03-29 09:00:00 +0900
updated_at: 2026-04-02 23:10:00 +0900
thumbnail: /assets/images/posts/deployment-guide.svg
series: theme-operations
tags:
  - GitHub Pages
  - Jenkins
  - Deployment
  - Open Source
---

이 저장소는 `main`에서 Jekyll을 빌드하고, 결과를 `gh-pages` 브랜치로 배포하는 구조를 기본값으로 둡니다.

파이프라인이 하는 일은 단순합니다.

1. gem 설치
2. GitHub 프로필과 기여 그래프 캐시 동기화
3. `jekyll build`
4. `_site/` 내용을 `gh-pages`로 푸시

Jenkins를 쓰지 않더라도, 생성 결과는 어디서든 재사용할 수 있습니다.

```bash
BUNDLE_FORCE_RUBY_PLATFORM=true bundle exec jekyll build
```

Jenkins를 붙인다면 `github-pages` 크리덴셜만 준비하면 되고, GitHub Pages의 소스를 `gh-pages` 브랜치 루트로 지정하면 됩니다.

이 글의 썸네일과 다른 샘플 SVG는 모두 이 저장소를 위해 직접 만든 원본 자산이라, 오픈소스 데모로 그대로 배포할 수 있습니다.
