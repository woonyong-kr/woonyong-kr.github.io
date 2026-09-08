---
layout: default
title: Proxy
nav_order: 2
permalink: /wiki/computer-systems-network-topic-e8bae755299d/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-e8bae755299d
projection_sha256: 725c231c3d5f547ce748a42a79c701353aefb4d14c55b7a082f552254bb2ae9a
parent: 트래픽 처리
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-7b8f000c7073
search_terms:
- 프록시
grand_parent: 네트워크
ancestor: 시스템
---

# Proxy
{: .no_toc }

Proxy는 클라이언트와 서버 사이에서 요청이나 데이터를 중계하는 구성 요소다. HTTP Proxy를 보면 클라이언트의 요청을 받아 다른 서버로 보내고, 받은 응답을 다시 클라이언트에 전달하는 두 통신 구간이 생긴다.

클라이언트 쪽에서는 서버 역할을 하고, 원본 서버 쪽에서는 클라이언트 역할을 한다. 그래서 클라이언트와 연결된 소켓과 원본 서버에 연결할 소켓의 수명·오류를 각각 관리해야 한다.

## 중간에 놓인 두 연결

클라이언트가 Proxy에 보낸 요청과 Proxy가 원본에 보낸 요청은 같은 애플리케이션 작업으로 이어질 수 있지만, 동일한 네트워크 연결은 아니다. 한쪽 연결이 닫혔을 때 다른 쪽의 대기와 진행 중인 작업을 어떻게 처리할지도 정해야 한다.

Forward Proxy는 클라이언트가 사용할 중계 서버로 선택하는 형태를 설명할 때 쓴다. 원본 서비스 앞에서 클라이언트 요청을 받는 [Reverse Proxy](/wiki/computer-systems-network-topic-a60fe7b10695/)는 서버 측의 진입점 역할을 한다. HTTP 규격은 Proxy, Gateway와 Tunnel을 구분하므로 구체적인 중계 방식을 함께 봐야 한다. [HTTP 중간 구성 요소](https://www.rfc-editor.org/rfc/rfc9110.html#section-3.7)

HTTP 메시지를 해석하는 Proxy는 목적지와 전달할 Header를 판단한다. 반면 CONNECT로 만든 Tunnel 같은 구간에서는 이후의 Byte를 전달하며 내부 메시지 해석을 하지 않는 방식도 있다. HTTPS를 중계한다는 말만으로 모든 Proxy가 암호화된 HTTP 내용을 읽는다고 단정해서는 안 된다.

## 원본으로 보낼 요청 구성

일반적인 HTTP/1.1 Forward Proxy 요청에서는 요청 대상에 `http://example.com:8080/search?q=socket` 같은 절대 URI를 사용할 수 있다. Proxy가 원본 서버에 직접 보낼 때는 연결할 Host와 Port를 정하고, `/search?q=socket` 같은 요청 대상과 Host 필드를 구성한다.

아래 코드는 이 URI를 나누는 과정만 실행한다. 소켓을 열거나 임의의 주소로 요청하는 Proxy 서버는 아니다.

```run-python
from urllib.parse import urlsplit, urlunsplit


def split_http_target(target):
    if any(ord(char) <= 32 or ord(char) == 127 for char in target):
        raise ValueError("공백과 제어 문자가 없는 URI를 사용한다.")
    uri = urlsplit(target)
    if uri.scheme != "http" or not uri.hostname:
        raise ValueError("이 예제는 일반 HTTP 절대 URI만 처리한다.")
    if uri.username is not None or uri.password is not None or uri.fragment:
        raise ValueError("사용자 정보와 Fragment는 요청 대상에서 제외한다.")
    port = 80 if uri.port is None else uri.port
    if not 1 <= port <= 65535:
        raise ValueError("유효한 목적지 Port를 지정한다.")
    origin_target = urlunsplit(("", "", uri.path or "/", uri.query, ""))
    return uri.hostname, port, uri.netloc, origin_target


for target in ["http://example.com:8080/search?q=socket", "http://example.com"]:
    host, port, authority, origin_target = split_http_target(target)
    print("Proxy가 받은 대상:", target)
    print("원본 연결 대상:", host, port)
    print("원본 요청 대상:", origin_target)
    print("원본 Host 필드:", authority)
```

첫 URI에서는 원본 연결 대상이 `example.com:8080`, 요청 대상이 `/search?q=socket`으로 나뉜다. 두 번째 URI에는 경로가 없어 `/`를 사용하고 HTTP의 기본 Port 80을 선택한다. 인코딩된 경로와 Query를 임의로 풀었다가 다시 조립하면 의미가 바뀔 수 있어, 예제는 전송할 부분의 표현을 유지한다.

실제 Proxy에는 이 분리보다 많은 처리가 필요하다. HTTP 메시지의 길이와 요청 대상의 형식을 검증하고, 허용할 목적지와 접근 권한을 판단해야 한다. 이 예제는 HTTP 메시지 전체의 파서나 목적지 허용 정책을 제공하지 않는다.

## Header와 오류를 전달할 때

Proxy가 받은 Header를 모두 다음 연결로 복사해서는 안 된다. Connection 필드에 지정된 연결 전용 필드와 그 밖의 Hop-by-hop 정보는 해당 연결의 규칙에 맞게 처리해야 한다. Host도 실제 요청 대상과 일치해야 한다. [메시지 전달 규칙](https://www.rfc-editor.org/rfc/rfc9110.html#section-7.6)

클라이언트에서 요청을 읽지 못한 실패, 원본 주소를 찾거나 연결하지 못한 실패, 원본이 반환한 HTTP 오류 응답은 서로 다르다. 원본의 404 응답은 네트워크 연결 실패가 아니다. 요청·응답을 기록할 때 어느 구간에서 생긴 결과인지 구분하면 확인할 위치가 분명해진다.

한쪽에서 읽은 Byte를 다른 쪽에 쓸 때도 부분 입출력을 처리해야 한다. 느린 수신자 때문에 Buffer가 계속 커지지 않도록 흐름을 조절하고, 취소·시간 제한·소켓 해제를 함께 다룬다. [Socket](/wiki/socket/)의 읽기·쓰기 규칙이 이 두 연결에 각각 적용된다.

중계 지점에는 캐시, 필터링, 로깅, 인증과 부하 분산 같은 기능을 둘 수 있다. 모든 Proxy가 그 기능을 전부 수행하는 것은 아니며, 적용할 때는 응답의 재사용 범위와 사용자 정보의 전달을 확인해야 한다. 캐시를 여러 거점에서 사용하는 구조는 [CDN](/wiki/computer-systems-network-cdn-a6d4d37d4c09/)으로 이어진다.
