---
layout: default
title: Socket
nav_order: 10
permalink: /wiki/socket/
publication_state: publish
has_toc: true
projection_id: Wiki/computer-systems-network/network/socket
projection_sha256: a07cb8d64caf90691e9975ea104281645a7d70b98924eb288a345cf0a055acd9
parent: 네트워크
content_status: ready
public_parent_id: Wiki/computer-systems-network/network
grand_parent: Systems
ancestor: CS 기초
---

# Socket
{: .no_toc }

Socket은 프로그램이 통신에 사용하는 끝점이다. BSD Socket API를 사용하면 프로그램이 직접 TCP의 재전송이나 패킷 전달을 구현하지 않고 운영체제의 통신 기능을 호출할 수 있다.

Unix 계열 시스템에서 `socket()`은 이 끝점을 가리키는 File Descriptor를 반환한다. 연결된 Stream 소켓에는 파일 입출력에 사용하는 `read()`·`write()`를 쓸 수 있고, 사용이 끝난 Descriptor는 `close()`로 닫는다. 그렇다고 Socket이 디스크 파일과 똑같은 성질을 갖는 것은 아니다. 통신의 경계, 대기와 오류는 소켓 종류와 연결 상태에 따라 달라진다.

## 주소 체계와 소켓 종류

소켓을 만들 때는 주소 체계, 전달 방식과 프로토콜을 선택한다. 구체적인 로컬 주소나 상대 주소는 이후 `bind()`·`connect()` 등의 호출에서 지정한다.

| 인자 | 예와 의미 |
| --- | --- |
| `domain` | `AF_INET`은 IPv4, `AF_INET6`은 IPv6, `AF_UNIX`는 로컬 통신 |
| `type` | `SOCK_STREAM`은 Stream, `SOCK_DGRAM`은 Datagram 방식 |
| `protocol` | 선택한 주소 체계와 종류에서 사용할 프로토콜. 0은 기본 프로토콜 |

IPv4·IPv6에서 `SOCK_STREAM`과 기본 프로토콜을 선택하면 일반적으로 TCP를 사용한다. 그러나 `SOCK_STREAM`이라는 이름 자체가 모든 주소 체계에서 TCP를 뜻하지는 않는다. Unix Domain Socket도 Stream 소켓을 제공한다. [socket 함수](https://man7.org/linux/man-pages/man2/socket.2.html)

IP 소켓의 끝점을 읽을 때는 주소와 Port, 전송 프로토콜을 함께 본다. Port를 프로세스 ID와 같은 뜻으로 쓰지는 않는다. 주소와 소켓의 관계는 [Port](/wiki/computer-systems-network-topic-3c0bb7fb878f/)에서 다룬다.

## 연결을 받는 창구와 연결별 소켓

TCP 서버의 Listening Socket은 연결을 받는 창구다. `accept()`가 반환한 Connected Socket은 한 연결의 데이터를 주고받는다. 대표 번호로 전화를 받고 실제 상담은 별도 회선에서 이어 가는 상황에 비유할 수 있다.

일반적인 TCP 서버와 클라이언트의 호출 순서는 다음과 같다.

| 서버 | 클라이언트 |
| --- | --- |
| `socket()`으로 소켓 생성 | `socket()`으로 소켓 생성 |
| `bind()`로 로컬 주소 지정 | 필요하면 로컬 주소를 명시적으로 지정 |
| `listen()`으로 연결을 받을 준비 | `connect()`로 상대 주소에 연결 요청 |
| `accept()`로 연결 소켓 얻기 | 연결 소켓으로 데이터 교환 |
| 연결 소켓으로 데이터 교환 | 사용이 끝나면 `close()` |
| 연결 소켓을 닫고 다음 연결 처리 | |

표의 각 행은 양쪽 호출이 반드시 동시에 실행된다는 뜻이 아니다. 커널이 TCP Handshake를 처리하며, 서버의 `accept()` 전에 연결이 진행되거나 완료될 수 있다. 대기할 연결이 없다면 Blocking 소켓의 `accept()`는 기다리고, Nonblocking 소켓은 오류 코드로 현재 상태를 알린다.

Listening Socket과 Connected Socket을 구분하면 서버가 다음 연결을 받으면서 기존 연결을 유지할 수 있는 이유도 설명된다. 다만 `accept()` 후 현재 클라이언트를 끝까지 처리하는 반복문은 다른 연결의 응용 처리를 미룰 수 있다. 여러 연결을 처리하는 방식은 [입출력 다중화](/wiki/computer-systems-network-topic-5022e4b7c883/)나 Thread 설계와 이어진다.

호출이 실제로 이어지는 실행 예제는 [TCP](/wiki/computer-systems-network-tcp-a7f7f386cd75/)에서 확인할 수 있다. 같은 프로세스 안에 서버와 클라이언트를 만들어 `connect()`와 `accept()`, 부분 송수신과 Half-close를 살펴본다. Datagram 소켓은 이와 달리 `listen()`·`accept()` 없이 주소를 지정해 데이터를 주고받으며, 해당 흐름은 [UDP](/wiki/computer-systems-network-udp-c5651ad64f2d/)에 있다.

## 주소 구조체를 채울 때

IPv4 주소는 `sockaddr_in`에 담는다. `sin_family`에는 `AF_INET`, `sin_port`에는 16 Bit Port, `sin_addr`에는 32 Bit IPv4 주소를 지정한다. 주소 구조체의 전체 크기와 부가 필드는 운영체제의 정의를 따라야 하므로 각 필드의 Offset을 임의로 가정하지 않는다.

다음은 IPv4의 로컬 주소를 정하는 부분이다. `fd`는 앞서 생성한 IPv4 TCP 소켓이다.

```c
struct sockaddr_in address = {0};
address.sin_family = AF_INET;
address.sin_addr.s_addr = htonl(INADDR_ANY);
address.sin_port = htons(9000);
if (bind(fd, (struct sockaddr *)&address, sizeof(address)) == -1) {
    perror("bind");
    /* 호출자에게 실패를 전달하고 열린 소켓을 정리한다. */
}
```

`INADDR_ANY`는 로컬 IPv4 인터페이스 전반에서 받을 주소를 지정한다. 같은 호스트에서만 실행할 실습이라면 Loopback 주소 `127.0.0.1`로 범위를 좁힐 수 있다. 이 주소 지정이 방화벽을 열거나 외부 접근을 자동으로 허용하지는 않는다.

Port와 주소에는 Network Byte Order를 사용한다. `htons(9000)`을 빠뜨렸을 때 값이 어떻게 달라지는지는 [데이터 표현](/wiki/computer-systems-network-topic-e647548deca2/)의 실행 예제로 확인한다. 호스트의 숫자와 이미 네트워크 표현으로 변환된 주소를 구분해야 한다.

### 재시작과 주소 재사용

`SO_REUSEADDR`는 소켓의 로컬 주소 재사용 규칙에 영향을 주는 옵션이다. 재시작 때 이전 연결 상태 때문에 `bind()`가 제한되는 일부 상황에 도움이 되지만, 같은 Port를 언제나 여러 서버가 동시에 사용할 수 있게 하는 옵션은 아니다. 운영체제의 조건과 기존 Listening Socket의 상태를 확인해야 한다. [Linux 소켓 옵션](https://man7.org/linux/man-pages/man7/socket.7.html)

옵션을 설정할 때는 `bind()` 전에 `setsockopt()`를 호출하고 반환값을 확인한다. 사용자에게 받은 Port를 `atoi()`로 변환한 뒤 작은 정수형으로 잘라 넣으면 잘못된 입력이나 범위 초과를 놓칠 수 있다. 숫자 변환의 성공 여부와 허용할 Port 범위를 먼저 검사한다.

## 읽기·쓰기와 오류 처리

연결된 Stream 소켓의 `read()`·`write()`는 한 번의 호출로 요청한 길이를 전부 처리하지 않을 수 있다. 반환한 Byte 수만큼 위치를 옮겨 반복해야 하며, 실패한 음수 반환값을 길이로 사용해서는 안 된다. 읽기의 0은 일반적으로 상대가 송신을 끝낸 EOF를 뜻한다.

신호로 호출이 중단된 `EINTR`, Nonblocking 소켓에서 지금 처리할 수 없다는 `EAGAIN`·`EWOULDBLOCK`, 연결이 끊어진 오류를 구분한다. 계속 0 Byte만 처리하면서 반복하지 않도록 진행 여부도 확인해야 한다. 끊어진 Stream에 쓰면 `SIGPIPE`가 발생할 수 있어 서버의 신호·오류 처리 정책도 필요하다.

File Descriptor를 받는다는 공통점 때문에 소켓을 입출력 감시 대상에 넣을 수 있다. 다만 `select()`·`poll()`·`epoll()`이 모든 종류의 파일을 똑같이 지원하는 것은 아니다. 예를 들어 Linux의 `epoll`에는 등록할 수 없는 일반 파일이 있다. [epoll 등록 오류](https://man7.org/linux/man-pages/man2/epoll_ctl.2.html)

클라이언트가 이름으로 접속할 때는 [DNS](/wiki/computer-systems-network-dns-c7fd180532b4/) 문서의 `getaddrinfo()` 예제처럼 주소 후보를 구한다. 각 후보로 소켓을 만들고 연결을 시도하되 실패한 소켓은 닫는다. 이름 해석 실패와 연결 실패, 연결 뒤의 입출력 실패를 나누어 보면 문제를 확인할 위치도 달라진다.

`bind()`가 보인다는 이유만으로 코드를 서버라고 단정하지는 않는다. 클라이언트도 출발지 주소를 선택하려고 `bind()`를 쓸 수 있고, UDP 소켓은 서버 역할이어도 `listen()`을 사용하지 않는다. 서버와 클라이언트의 역할은 사용하는 프로토콜과 전체 호출 흐름으로 판단한다.
