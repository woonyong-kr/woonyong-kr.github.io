---
layout: default
title: REST
nav_order: 2
permalink: /wiki/backend-services-rest-c3f71fdaf43a/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/backend-services-rest-c3f71fdaf43a
projection_sha256: b8fd0f8d90dd9746ab668a59a508309649f79df64c0d975afc0c754e84cd6c58
parent: API
content_status: ready
public_parent_id: Wiki/backend-services/api
grand_parent: 백엔드
---

# REST
{: .no_toc }

REST(Representational State Transfer)는 분산된 시스템의 구성 요소가 자원의 표현을 주고받는 방식을 설명하는 아키텍처 스타일이다. 웹 API에서 URI와 HTTP Method를 조합하는 설계와 자주 연결되지만, 주소를 명사로 정하고 JSON을 반환하는 것만으로 REST의 조건이 모두 갖춰지는 것은 아니다.

## 자원과 표현

자원은 식별해서 다룰 수 있는 개념이다. 사용자 한 명, 게시글 목록이나 주문 상태가 자원이 될 수 있다. 자원을 DB Row 하나와 반드시 같은 것으로 볼 필요는 없다. 서버의 내부 저장 구조와 외부에 제공하는 자원은 다르게 설계할 수 있다.

`/users/42`가 사용자를 가리킨다면 서버가 보내는 JSON이나 HTML은 그 자원의 표현이다. 이름이나 나이가 바뀌어도 같은 자원을 계속 가리킬 수 있고, 같은 자원을 여러 형식으로 표현할 수도 있다. URI, 자원, 그때 받은 데이터의 표현을 구분하는 것이 출발점이다.

동작마다 `/getPostList`, `/createNewPost`, `/deletePost?id=3`, `/post_remove?postId=3`처럼 주소를 만들면 클라이언트는 개별 이름과 규칙을 익혀야 한다. 자원에 URI를 부여하고 HTTP Method의 의미를 활용하면 이런 차이를 줄일 수 있다.

| 요청 예 | API가 제공하는 동작 |
| --- | --- |
| `GET /users` | 사용자 목록 조회 |
| `GET /users/42` | 사용자 한 명 조회 |
| `POST /users` | 새 사용자 생성 요청 |
| `PUT /users/42` | 보낸 표현으로 사용자 상태 생성 또는 교체 |
| `PATCH /users/42` | 지정한 변경 사항 적용 |
| `DELETE /users/42` | 해당 사용자 자원 제거 요청 |

이 표는 자원을 중심으로 구성한 HTTP API의 예다. POST가 언제나 생성만을 뜻하거나 DELETE가 저장된 Row를 즉시 물리적으로 지워야 한다는 뜻은 아니다. Method의 의미와 안전성·멱등성은 [Method](/wiki/computer-systems-network-topic-e51a6ade671c/)에서 구분한다.

컬렉션에 `/users` 같은 복수 명사를 쓰고, 관련 자원을 `/users/42/posts`처럼 표현하는 것은 널리 쓰는 일관성 규칙이다. REST가 URI의 영문 명사나 복수형 문법을 강제하는 것은 아니다. 이름만 검사하기보다 자원의 의미와 인터페이스 전체의 동작을 함께 봐야 한다.

## REST를 이루는 제약

REST는 Client와 Server의 책임 분리, 무상태 통신, 캐시, 일관된 인터페이스, 계층화된 시스템을 함께 다룬다. 필요할 때 코드를 내려받아 실행하는 Code-on-Demand는 선택 사항이다. 원래 정의는 [Fielding의 REST 설명](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm)에 있다.

Client와 Server가 분리되면 화면과 저장·처리 구현을 독립적으로 바꿀 여지가 생긴다. 계층화된 시스템에서는 클라이언트가 당장 통신하는 상대 뒤에 Cache나 Proxy가 있는지까지 모두 알아야 할 필요가 없다. 이 성질을 이용해 중간 계층에서 캐시나 부하 분산을 처리할 수 있다.

일관된 인터페이스에는 자원 식별, 표현을 통한 자원 조작, 메시지 자체로 해석할 수 있는 정보, Hypermedia를 통한 상태 전이가 포함된다. Method와 상태 코드를 일관되게 쓰는 것은 그중 일부다.

Hypermedia는 응답의 링크나 폼을 통해 다음에 할 수 있는 일을 찾는 방식이다. 예를 들어 주문을 조회한 응답에서 결제나 취소로 이어지는 동작을 발견하도록 만들 수 있다. 링크 몇 개를 추가했다는 사실만으로 충분한 것은 아니며, 클라이언트가 그 링크의 의미와 사용 방법을 이해할 수 있는 형식도 필요하다. [REST API와 Hypermedia에 대한 Fielding의 설명](https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven)

현장에서 REST API라고 부르는 서비스 중에는 Hypermedia 없이 미리 정한 경로로 CRUD를 수행하는 HTTP API도 많다. 설계를 설명할 때는 사용한 용어와 실제로 적용한 제약을 구분하는 편이 정확하다.

## 무상태성과 서버의 데이터

REST의 무상태 제약은 요청을 이해하기 위해 서버가 이전 요청의 대화 맥락을 따로 기억해야 하는 구조를 피한다는 뜻이다. 인증을 사용하는 요청이라면 그 요청을 처리하는 데 필요한 인증 정보도 전달해야 한다.

이 제약이 서버에 사용자나 주문을 저장하지 말라는 뜻은 아니다. 자원의 상태와 클라이언트의 대화 상태는 구분한다. 서버가 보관한 주문을 조회하는 일과, 이전 요청에서 선택해 둔 주문 번호를 다음 요청의 숨은 전제로 사용하는 일은 다르다.

일반적인 HTTP 서비스에서는 서버 측 Session을 사용할 수 있다. 다만 서버가 그 Session에 저장한 대화 맥락에 의존하는 구조와 REST의 엄격한 무상태 제약을 같은 것으로 설명하지는 않는다. HTTP라는 프로토콜의 무상태성과 그 위에 만든 애플리케이션의 설계 제약을 나누어 봐야 한다.

요청을 특정 서버의 대화 상태에 묶지 않으면 다른 인스턴스로 분산하기 쉬워진다. 그래도 공유 데이터의 정합성, 인증 검증과 저장소 접근 문제는 남는다. 매번 필요한 정보를 보내는 비용도 있어, 무상태성 하나로 확장이 자동 해결되는 것은 아니다.

## 처리 결과를 응답에 담기

Method가 요청한 동작을 나타내면 상태 코드는 그 처리 결과를 나타낸다. 응답 본문에는 새로 만든 자원의 표현이나 오류를 이해할 세부 정보를 담을 수 있다.

| 응답 | 사용자 API에서 읽을 수 있는 예 |
| --- | --- |
| 200 | 조회한 표현이나 처리 결과 반환 |
| 201 | 새 사용자 생성. `Location`으로 새 자원 위치를 알릴 수 있음 |
| 204 | 요청 성공, 응답 본문 없음 |
| 400 | 잘못된 요청 형식 등으로 처리 불가 |
| 404 | 요청한 자원을 찾지 못함 |
| 409 | 기존 상태와 충돌. 예를 들어 중복을 허용하지 않는 값으로 생성 요청 |

`POST /users`에 이름과 나이를 보내 새 사용자를 만들었다면, 서버는 `201`과 `Location: /users/42`를 응답할 수 있다. 이어서 `GET /users/42`는 `200`과 현재 표현을 반환한다. 삭제가 완료되고 전할 본문이 없다면 `204`를 사용할 수 있다. 204 응답에 설명용 JSON 본문을 함께 넣지는 않는다.

이 흐름은 특정 API의 선택이다. 모든 생성·수정·삭제가 항상 같은 상태 코드 하나로 고정되는 것은 아니다. 실제 처리 결과와 [상태 코드](/wiki/computer-systems-network-topic-834a2597bdfc/)의 의미가 맞아야 한다. 본문을 보내는 경우에는 [Header](/wiki/computer-systems-network-topic-e67ae5ecc7e4/)가 그 표현의 형식과 길이를 설명한다.

## Method와 경로로 처리 코드 찾기

서버의 Router는 Method와 경로 패턴을 보고 처리할 코드를 고른다. 다음 예제는 이 선택 과정만 실행한다. 실제 HTTP 서버를 열거나 사용자를 DB에 저장하지는 않는다.

```run-python
import json
import re
from urllib.parse import urlsplit

routes = [
    ("GET", r"/users", "list_users"),
    ("POST", r"/users", "create_user"),
    ("GET", r"/users/(?P<id>[0-9]+)", "get_user"),
    ("PUT", r"/users/(?P<id>[0-9]+)", "replace_user"),
    ("PATCH", r"/users/(?P<id>[0-9]+)", "update_user"),
    ("DELETE", r"/users/(?P<id>[0-9]+)", "delete_user"),
]


def choose_route(method, target):
    path = urlsplit(target).path
    allowed = []
    for route_method, pattern, handler_name in routes:
        match = re.fullmatch(pattern, path)
        if match is None:
            continue
        allowed.append(route_method)
        if method == route_method:
            return {"handler": handler_name, "params": match.groupdict()}
    if allowed:
        return {"status": 405, "Allow": ", ".join(sorted(allowed))}
    return {"status": 404}


for method, target in [
    ("GET", "/users?page=2"),
    ("POST", "/users"),
    ("GET", "/users/42"),
    ("PUT", "/users/42"),
    ("DELETE", "/users/42"),
    ("POST", "/users/42"),
    ("GET", "/posts/42"),
]:
    print(method, target)
    print(json.dumps(choose_route(method, target), ensure_ascii=False))
```

`GET /users/42`와 `PUT /users/42`는 같은 경로에서 서로 다른 Handler를 선택한다. `/users?page=2`에서는 경로와 Query를 먼저 나눈다. 실제 목록 Handler는 Query에서 페이지 번호를 읽겠지만, 이 예제는 라우팅에 사용할 경로만 비교한다.

`POST /users/42`는 경로 패턴이 있지만 해당 Method를 등록하지 않았으므로 `405`와 허용 목록을 반환한다. `/posts/42`는 등록한 경로가 없어 `404`가 된다. 경로를 찾지 못한 경우와 찾은 경로에서 Method를 허용하지 않는 경우를 구분하는 것이다.

Handler를 찾았다고 자원의 존재나 요청 성공까지 결정된 것은 아니다. `get_user`를 호출한 뒤 실제 저장소에 사용자 42가 없다면 그 처리 단계에서 404를 반환할 수 있다. 인증·권한 검사와 입력 검증도 라우팅에 성공했다는 이유로 생략하지 않는다.
