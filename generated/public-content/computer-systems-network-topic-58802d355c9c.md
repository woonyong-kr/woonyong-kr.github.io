---
layout: default
title: 요청과 응답
nav_order: 2
permalink: /wiki/computer-systems-network-topic-58802d355c9c/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-58802d355c9c
projection_sha256: efbc8fbbfb4cf8e93dc9e1a5597ae82687ad487d3e6227a331c753c29f40a4a4
parent: HTTP
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-http-2fe226962c51
grand_parent: 네트워크
ancestor: 시스템
---

# 요청과 응답
{: .no_toc }

HTTP 요청과 응답은 서로 대응한다. 클라이언트는 요청 대상과 수행할 동작을 보내고, 서버는 처리 결과와 필요한 데이터를 돌려준다. HTTP/1.x에서는 시작 줄, Header, 빈 줄과 선택적인 본문으로 메시지를 읽을 수 있다.

## 시작 줄과 본문의 경계

다음은 HTTP/1.1의 요청 구조를 보여 주는 예다.

```http
GET /hello HTTP/1.1
Host: example.com
Connection: close

```

첫 줄은 `Method Request-target Version` 순서다. 일반적인 서버 요청에서는 `/hello` 같은 경로와 필요한 Query가 Request-target이 된다. Proxy에 보내는 요청이나 CONNECT처럼 다른 형식을 사용하는 경우도 있어, 모든 요청 대상이 파일 경로인 것은 아니다.

HTTP/1.1의 실제 줄 구분은 CRLF(`\r\n`)다. 마지막 Header 줄의 CRLF 뒤에 빈 줄의 CRLF가 더해져 `\r\n\r\n`이 Header 영역의 끝을 나타낸다. 위 코드 블록은 이 구조를 사람이 읽기 편하게 줄바꿈으로 표시했다.

서버가 다섯 Byte의 `Hello`를 돌려주는 응답은 다음처럼 표현할 수 있다.

```http
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 5
Connection: close

Hello
```

상태 라인은 Version, 상태 코드와 사유 구문으로 구성된다. 프로그램은 `200` 같은 상태 코드를 기준으로 처리하며, `OK`라는 사람이 읽는 문구 자체를 성공 판정의 규칙으로 사용하지 않는다.

빈 줄은 Header와 본문을 나눌 뿐, 본문이 어디에서 끝나는지까지 정하지는 않는다. HTTP/1.1에서는 Method·상태 코드와 `Content-Length`·`Transfer-Encoding`, 연결 종료 등의 규칙을 함께 적용한다. 이 경계를 틀리게 해석하면 다음 메시지의 시작 위치도 어긋난다. [HTTP/1.1의 메시지 길이](https://www.rfc-editor.org/rfc/rfc9112.html#section-6)

## 서버와 클라이언트를 함께 실행하기

아래 예제는 같은 실행 환경 안에서 HTTP 서버와 클라이언트를 만든다. 외부 웹사이트에 요청하지 않으며, Loopback 주소와 자동 할당 Port를 사용한다. 서버는 `/hello`에 인사말을 제공한다.

```run-python
from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from urllib.parse import urlsplit

method = "GET"   # HEAD, POST로 바꿔 비교한다.
target = "/hello"  # /missing으로 바꾸면 404 응답을 받는다.


class DemoHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def reply(self, status, text, *, send_body=True, allow=None):
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "close")
        if allow is not None:
            self.send_header("Allow", allow)
        self.end_headers()
        if send_body:
            self.wfile.write(body)
        self.close_connection = True

    def get_resource(self, *, send_body):
        if urlsplit(self.path).path == "/hello":
            self.reply(200, "안녕하세요\n", send_body=send_body)
        else:
            self.reply(404, "찾을 수 없습니다.\n", send_body=send_body)

    def do_GET(self):
        self.get_resource(send_body=True)

    def do_HEAD(self):
        self.get_resource(send_body=False)

    def do_POST(self):
        self.reply(405, "이 Method는 사용할 수 없습니다.\n", allow="GET, HEAD")

    def log_message(self, format, *args):
        pass


with ThreadingHTTPServer(("127.0.0.1", 0), DemoHandler) as server:
    worker = Thread(target=server.serve_forever,
                    kwargs={"poll_interval": 0.05}, daemon=True)
    worker.start()
    client = HTTPConnection("127.0.0.1", server.server_port, timeout=2)
    try:
        client.request(method, target)
        response = client.getresponse()
        body = response.read()
        print(f"요청: {method} {target}")
        version = f"{response.version // 10}.{response.version % 10}"
        print(f"응답: HTTP/{version} {response.status} {response.reason}")
        for name in ["Content-Type", "Content-Length", "Connection", "Allow"]:
            value = response.getheader(name)
            if value is not None:
                print(f"{name}: {value}")
        print(f"본문 Byte 수: {len(body)}")
        print(f"본문: {body.decode('utf-8')!r}")
    finally:
        client.close()
        server.shutdown()
        worker.join(timeout=2)
```

처음 실행하면 `200 OK`와 `안녕하세요`를 받는다. 줄바꿈을 포함한 본문은 UTF-8에서 16 Byte다. `Content-Length`도 문자열의 문자 수가 아니라 인코딩한 Byte 수로 계산한다.

`method`를 `HEAD`로 바꾸면 `Content-Length: 16`을 유지하면서 실제 읽은 본문은 0 Byte가 된다. HEAD 응답에는 본문을 보내지 않으며, Content-Length를 보낸다면 같은 GET 요청에서 전송할 표현의 길이를 나타낸다. 이 차이는 Header의 숫자를 실제 수신한 본문 길이로 무조건 해석해서는 안 되는 사례다.

`target`을 `/missing`으로 바꾸면 404를, `method`를 `POST`로 바꾸면 405와 `Allow: GET, HEAD`를 확인할 수 있다. 이 서버가 해당 요청을 어떻게 처리하도록 작성되어 있는지 코드와 결과를 함께 읽는다.

예제는 응답 뒤 연결을 닫도록 `Connection: close`를 명시한다. HTTP/1.1 자체가 항상 요청마다 연결을 닫는다는 뜻은 아니다. `timeout=2`는 클라이언트 소켓의 대기에 대한 제한이며 전체 프로그램 실행 시간을 정확히 2초로 제한하는 설정은 아니다. 서버와 클라이언트의 API는 [Python http.server](https://docs.python.org/3/library/http.server.html)와 [http.client](https://docs.python.org/3/library/http.client.html)에서 확인할 수 있다.

## 직접 메시지를 처리하는 서버에서 볼 부분

교육용 서버를 읽을 때는 요청 파싱, 자원 선택, 응답 Header 구성, 본문 전송을 나누어 본다. 시작 줄을 공백으로 나누면 Method·요청 대상·버전을 얻을 수 있지만, 그것만으로 HTTP 메시지의 검증이 끝나지는 않는다. 입력 길이와 파싱 결과, Header와 본문의 경계도 처리해야 한다.

정적 파일을 제공한다면 파일의 데이터 형식과 길이를 확인해 Header를 만들고, 빈 줄 뒤에 파일 내용을 전송한다. 파일 확장자로 `Content-Type`을 선택하는 구현도 있지만 확장자와 실제 데이터가 반드시 일치하는 것은 아니다. 문자열로 Header를 조립할 때는 Buffer가 잘렸는지 확인하고, 전송 함수가 요청한 Byte를 모두 보냈는지도 확인한다.

파일 내용을 전달하는 한 방법은 `open()`으로 파일을 열고 `mmap()`으로 내용을 주소 공간에 매핑한 뒤, 그 메모리를 소켓에 쓰는 것이다. 매핑이 만들어진 후 File Descriptor를 닫아도 매핑은 유지되며, 사용을 마치면 `munmap()`으로 해제한다. 파일 크기가 0이거나 매핑이 실패한 경우도 구분해야 한다. 이는 HTTP의 요구사항이 아니라 파일 입출력 구현의 선택이다. 자세한 동작은 [mmap](/wiki/computer-systems-network-mmap-838e9b0f7e0a/)과 [mmap 함수](https://man7.org/linux/man-pages/man2/mmap.2.html)에서 확인할 수 있다.

오류 응답도 같은 메시지 구조를 사용한다. 요청한 파일이 없으면 적절한 상태 코드와 설명 본문을 만들고, 그 본문의 실제 Byte 수를 Header에 반영한다. 요청에서 받은 문자열을 HTML 오류 페이지에 넣는다면 그대로 결합하지 않고 HTML에 맞게 이스케이프해야 한다.

HTTP/1.x에서 이렇게 만든 메시지는 [TCP](/wiki/computer-systems-network-tcp-a7f7f386cd75/)의 Stream으로 전달된다. 소켓의 한 번의 읽기·쓰기와 HTTP 메시지 하나가 일치하는 것은 아니므로, 메시지 경계는 응용에서 처리해야 한다.
