---
title: "로컬에서 테마를 설치하고 미리보기하는 가장 빠른 방법"
description: "Ruby 의존성 설치부터 GitHub 연동 데이터 동기화, 로컬 미리보기까지 필요한 명령만 모았습니다."
date: 2026-04-01 09:00:00 +0900
updated_at: 2026-04-02 23:10:00 +0900
thumbnail: /assets/images/posts/local-setup.svg
series: theme-setup
tags:
  - Quick Start
  - Local Preview
  - Ruby
  - Jekyll
---

처음 실행할 때는 세 단계만 기억하면 됩니다.

```bash
BUNDLE_FORCE_RUBY_PLATFORM=true bundle install
ruby scripts/fetch_github_contributions.rb
BUNDLE_FORCE_RUBY_PLATFORM=true bundle exec jekyll serve
```

기여 그래프를 쓰지 않거나 토큰이 없다면 두 번째 줄은 건너뛸 수 있습니다. 이 경우 프로필은 샘플 데이터로, 잔디 그래프는 비활성 상태로 열립니다.

로컬 주소는 기본적으로 `http://127.0.0.1:4000/blog/`입니다. GitHub Pages 프로젝트 페이지와 같은 경로 구조를 유지하기 위해 `baseurl`이 `/blog`로 잡혀 있습니다.
