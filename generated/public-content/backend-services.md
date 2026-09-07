---
layout: default
title: 백엔드
nav_order: 7
permalink: /wiki/backend-services/
publication_state: publish
has_toc: true
projection_id: Wiki/backend-services
projection_sha256: c850862304dd6321a03b7bc020c51cb175661dbd422bd13ac8fd2f2fb27f28e9
content_status: overview
---

# 백엔드
{: .no_toc }

서버는 요청을 받은 뒤 입력을 확인하고, 필요한 권한을 검사하며, 데이터를 읽거나 변경해 응답한다. 여러 요청이 동시에 들어오거나 외부 시스템이 늦어지는 상황에서도 이 흐름을 유지해야 한다.

Kotlin과 Spring을 중심으로 API, 데이터 처리, 비동기 작업을 다룬다. 설계와 테스트, 보안은 기능을 만드는 과정과 연결하고, 성능과 장애 처리에서는 선택의 근거를 살펴본다.
