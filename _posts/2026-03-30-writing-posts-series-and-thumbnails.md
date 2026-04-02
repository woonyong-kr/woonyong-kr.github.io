---
title: "글, 시리즈, 태그, 썸네일을 이 테마에서 다루는 방법"
description: "Markdown 글 작성부터 시리즈 연결, 태그 필터, 썸네일 조건부 노출까지 한 번에 설명합니다."
date: 2026-03-30 09:00:00 +0900
updated_at: 2026-04-02 23:10:00 +0900
thumbnail: /assets/images/posts/writing-guide.svg
series: theme-overview
tags:
  - Markdown
  - Series
  - Tags
  - Thumbnail
---

이 테마에서 포스트는 Jekyll 기본 규칙을 따르면서도 개발 블로그에 자주 필요한 메타데이터를 조금 더 얹어서 씁니다.

```md
---
title: 글 제목
description: 목록에 보일 요약
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
- `series`는 `_data/series.yml` 키와 연결됩니다.
- `tags`는 목록 필터와 글 상세 링크에 모두 쓰입니다.

샘플 이미지는 모두 벡터 SVG라서 해상도 손실 없이 가볍고, 저장소에 함께 배포하기도 쉽습니다.
