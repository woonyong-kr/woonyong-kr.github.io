---
title: "프로필, 탭, 홈 화면을 테마 설정으로 커스터마이징하기"
description: "브랜드 문구와 탭 노출 여부, 홈 글 수, GitHub 연동 여부를 어디서 조절하는지 정리합니다."
date: 2026-03-31 09:00:00 +0900
updated_at: 2026-04-02 23:10:00 +0900
thumbnail: /assets/images/posts/customization.svg
series: theme-setup
tags:
  - Theme Config
  - Navigation
  - Profile
  - Customization
---

테마의 대부분은 `_data/profile.yml`과 `_data/theme.yml`만 수정해도 원하는 모양으로 맞출 수 있습니다.

예를 들어 소개 탭을 숨기고 GitHub 프로필 동기화만 켜고 싶다면 아래처럼 설정하면 됩니다.

```yml
tabs:
  show_about: false

profile:
  github_sync:
    enabled: true
```

홈에서 처음 보여줄 글 수, 검색 placeholder, 푸터 문구도 모두 같은 파일에서 관리합니다.

이 구조 덕분에 HTML 템플릿을 열지 않아도 대부분의 UI 문구를 바꿀 수 있고, 오픈소스 테마 사용자도 진입장벽이 낮습니다.
