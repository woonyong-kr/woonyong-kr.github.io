---
layout: default
title: Header
nav_order: 5
permalink: /wiki/computer-systems-network-topic-e67ae5ecc7e4/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-e67ae5ecc7e4
projection_sha256: 10560918a48946194596c464650ca8d4aae07a61aa3d3eb1a2aee9820e91c7a1
parent: HTTP
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-http-2fe226962c51
search_terms:
- 헤더
grand_parent: 네트워크
ancestor: CS
---

# Header
{: .no_toc }

Header는 HTTP 메시지를 어떻게 해석하고 처리할지 알려 주는 필드다. 요청 대상, 본문의 형식과 길이, 캐시 조건처럼 메시지의 동작에 필요한 정보를 담는다. 요청과 응답에 모두 사용할 수 있지만 각 필드의 의미와 허용 범위는 다르다.

HTTP/1.x에서는 `이름: 값` 형식으로 한 줄씩 표현한다. 필드 이름은 대소문자를 구분하지 않지만, 값까지 모두 대소문자를 무시한다는 뜻은 아니다. HTTP/2·HTTP/3의 전송 형식과 이름 표기 규칙은 별도로 확인해야 한다.

## 대상과 본문을 설명하는 필드

| Header | 확인할 정보 |
| --- | --- |
| Host | HTTP/1.1 요청이 향하는 호스트와 필요한 Port |
| Content-Type | 본문 표현의 Media Type과 필요한 매개변수 |
| Content-Length | 규칙에 따라 계산한 본문 표현의 Byte 길이 |
| Server | 서버가 공개하는 소프트웨어 정보 |
| Allow | 대상 자원에서 허용하는 Method |

HTTP/1.1 요청에는 Host가 필요하다. 같은 IP 주소에서 여러 도메인을 제공할 때도 요청의 대상 호스트를 구분해야 한다. 그렇다고 Host만 바꾸면 어떤 서버의 자원이라도 제공되는 것은 아니다. 실제 연결 대상과 서버의 라우팅 설정을 함께 본다.

`Content-Type: text/plain; charset=utf-8`은 본문을 UTF-8 일반 텍스트로 해석하도록 알린다. `text/html`이나 `application/json`도 자주 사용하는 Media Type이다. 요청의 Content-Type은 보내는 내용의 형식이고, 응답의 Content-Type은 반환한 내용의 형식이다.

Server는 모든 서버가 반드시 같은 수준의 정보를 공개하는 필드가 아니다. 소프트웨어의 종류나 버전을 판단할 때 이 값만을 확정적인 구현 근거로 삼지는 않는다.

## 문자 수와 Byte 수

Content-Length는 문자 개수가 아니다. `안녕하세요\n`은 줄바꿈을 포함해 Python 문자열에서 여섯 문자지만 UTF-8로 인코딩하면 16 Byte다. 네트워크에 보낼 Byte 배열의 길이를 계산해야 Header와 실제 데이터가 맞는다.

[요청과 응답](/wiki/computer-systems-network-topic-58802d355c9c/)의 실행 예제는 문자열을 먼저 UTF-8로 인코딩한 뒤 `len(body)`를 사용한다. 문자 수를 세어 Header에 넣으면 한글 같은 데이터에서 수신자가 잘못된 위치를 본문의 끝으로 판단할 수 있다.

HEAD 응답에 Content-Length가 있다면 같은 GET 요청으로 보냈을 표현의 길이를 나타낸다. 실제 HEAD 본문은 없다. 304에도 별도의 길이 규칙이 있으며, 1xx·204 응답에는 Content-Length를 보내지 않는다. [Content-Length의 규칙](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.6)

HTTP/1.1의 본문 길이는 Content-Length 하나만 보고 정하지 않는다. Method·상태 코드, Transfer-Encoding 등 메시지의 Framing 규칙을 함께 적용해야 한다. 서로 모순되는 길이 정보를 임의로 선택하면 중간 장치와 서버가 메시지를 다르게 해석할 수 있다.

## 연결에 적용하는 지시

HTTP/1.1의 `Connection: close`는 해당 메시지 뒤에 연결을 닫는 동작과 관련된다. HTTP/1.1은 기본적으로 연결을 재사용할 수 있으므로, 유지하려면 항상 `Connection: keep-alive`가 있어야 한다고 외우면 안 된다.

Connection은 현재 연결에 적용할 필드를 지정하는 역할도 한다. Proxy는 연결에만 해당하는 정보를 다음 연결로 무작정 전달하지 않는다. 본문 형식처럼 메시지의 표현을 설명하는 필드와 연결 제어 필드를 구분해야 한다.

HTTP/2·HTTP/3에서는 Connection 같은 연결 전용 필드를 이 방식으로 보내지 않는다. [HTTP/2의 연결 전용 필드](https://www.rfc-editor.org/rfc/rfc9113.html#section-8.2.2), [HTTP/3의 필드 규칙](https://www.rfc-editor.org/rfc/rfc9114.html#section-4.2)
