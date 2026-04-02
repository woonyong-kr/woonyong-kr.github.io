---
title: "GitHub 프로필 동기화와 기여 그래프를 붙이는 방법"
description: "GitHub 아이디만 연결하면 이름, 아바타, 링크, 기여 그래프가 홈 화면에 반영되는 흐름을 설명합니다."
date: 2026-03-28 09:00:00 +0900
updated_at: 2026-04-02 23:10:00 +0900
thumbnail: /assets/images/posts/github-sync.svg
series: theme-operations
tags:
  - GitHub
  - GraphQL
  - Profile Sync
  - Jekyll Theme
---

이 테마는 GitHub 계정을 연결하면 홈 히어로와 글 상세의 작성자 영역을 자동으로 갱신합니다.

핵심은 `scripts/fetch_github_contributions.rb`가 두 가지 캐시를 만드는 구조입니다.

- `github_contributions_cache.json`
- `github_profile_cache.json`

설정은 `_data/theme.yml`에서 켭니다.

```yml
hero:
  github_contributions:
    enabled: true
    username: your-github-id

profile:
  github_sync:
    enabled: true
```

이후 아래 명령을 실행하면 공개 프로필과 최근 1년 기여 데이터가 함께 갱신됩니다.

```bash
ruby scripts/fetch_github_contributions.rb
```

GitHub 프로필에 `bio`나 `company`, `location`이 비어 있으면 테마는 `_data/profile.yml`의 샘플 문구를 그대로 유지합니다. 덕분에 연결이 불완전해도 화면이 비어 보이지 않습니다.
