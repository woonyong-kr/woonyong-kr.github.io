---
layout: default
title: UDP
nav_order: 3
permalink: /wiki/computer-systems-network-udp-c5651ad64f2d/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-udp-c5651ad64f2d
projection_sha256: 494e328430fedb14fd88c3d7a768812c4aaaebafda133fbc437c43484d842590
parent: 전송 프로토콜
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-692017ad8918
grand_parent: 네트워크
ancestor: 시스템
---

# UDP
{: .no_toc }

UDP(User Datagram Protocol)는 IP 위에서 Datagram을 주고받는 전송 프로토콜이다. 보내기 전에 TCP 같은 Handshake를 거치지 않으며, 수신자가 응답했는지 확인하거나 손실된 데이터를 재전송하는 기능을 자체적으로 제공하지 않는다.

응용이 한 번에 보낸 Datagram은 수신 측에서도 하나의 Datagram으로 다룬다. 이것이 Byte Stream을 제공하는 TCP와의 중요한 차이다. 다만 Datagram이 반드시 도착하거나 순서대로 도착한다는 보장은 없고, 중복될 수도 있다.

## 작은 헤더와 응용의 책임

UDP 헤더는 8 Byte이며 네 필드가 각각 16 Bit를 차지한다.

| 필드 | 의미 |
| --- | --- |
| Source Port | 보내는 쪽의 Port |
| Destination Port | 받는 쪽의 Port |
| Length | 일반적인 Datagram에서 UDP 헤더와 데이터의 전체 길이 |
| Checksum | IP 주소를 포함한 Pseudo-header와 UDP 헤더·데이터의 오류 검출 |

Sequence Number, ACK, Receive Window는 UDP 헤더에 없다. 손실·순서 변경을 복구하거나 수신 속도와 네트워크 혼잡에 맞춰 송신량을 조절하려면 응용 또는 상위 프로토콜에서 처리해야 한다. [UDP 규격](https://www.rfc-editor.org/rfc/rfc768.html)

IPv4에서는 Checksum을 사용하지 않았음을 0으로 나타낼 수 있다. IPv6에서는 원칙적으로 UDP Checksum이 필요하며, 0을 허용하는 경우는 별도 규격과 조건을 따르는 제한된 예외다. 이 규칙을 모든 IP 버전에서 선택 사항이라고 설명하면 안 된다. [IPv6의 UDP Checksum](https://datatracker.ietf.org/doc/html/rfc8200#section-8.1)

## `recvfrom()`으로 내용과 송신자 함께 받기

UDP 서버는 일반적으로 `socket()` → `bind()` → `recvfrom()` 순서로 데이터를 받는다. `recvfrom()`은 Datagram의 내용과 보낸 주소를 함께 알려 주고, 서버는 그 주소를 `sendto()`에 넘겨 답할 수 있다. TCP 서버의 `listen()`과 `accept()`는 사용하지 않는다.

하나의 UDP 소켓으로 여러 상대의 Datagram을 받을 수 있다. 각 메시지가 누구에게서 왔는지를 따로 확인해야 하는 이유다. UDP 소켓에 `connect()`를 호출하는 것도 가능하지만, 이는 기본 상대 주소 등을 설정하는 소켓 API 동작이며 TCP Handshake를 만든다는 뜻은 아니다. [Linux UDP 소켓 설명](https://man7.org/linux/man-pages/man7/udp.7.html)

### Buffer가 작으면 남은 데이터는 어떻게 되는가

Datagram보다 작은 Buffer로 읽으면 들어가지 못한 부분은 버려질 수 있다. TCP Stream처럼 다음 `recvfrom()`에서 나머지를 이어서 받는 방식이 아니다.

아래 프로그램은 Loopback에서 서버와 클라이언트를 함께 만든다. 클라이언트가 `Hello`, `World`를 별도의 Datagram으로 보내고, 서버는 첫 번째 메시지를 두 Byte만 읽는다. 다음 읽기에서 무엇을 받는지 확인하면 Datagram의 경계가 드러난다.

```run-c
#define _POSIX_C_SOURCE 200112L
#include <arpa/inet.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <unistd.h>

static void require(int ok, const char *operation) {
    if (!ok) { perror(operation); exit(1); }
}

static int make_socket(void) {
    int fd = socket(AF_INET, SOCK_DGRAM, 0);
    require(fd >= 0, "socket");
    struct timeval timeout = {.tv_sec = 2};
    require(setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout)) == 0,
            "receive timeout");
    return fd;
}

int main(void) {
    int server = make_socket();
    int client = make_socket();
    struct sockaddr_in address = {.sin_family = AF_INET, .sin_port = htons(0)};
    require(inet_pton(AF_INET, "127.0.0.1", &address.sin_addr) == 1, "inet_pton");
    require(bind(server, (struct sockaddr *)&address, sizeof(address)) == 0, "bind");
    socklen_t address_size = sizeof(address);
    require(getsockname(server, (struct sockaddr *)&address, &address_size) == 0,
            "getsockname");

    require(sendto(client, "Hello", 5, 0,
                   (struct sockaddr *)&address, address_size) == 5, "send Hello");
    require(sendto(client, "World", 5, 0,
                   (struct sockaddr *)&address, address_size) == 5, "send World");

    struct sockaddr_in sender;
    socklen_t sender_size = sizeof(sender);
    char data[32];
    ssize_t n = recvfrom(server, data, 2, 0,
                         (struct sockaddr *)&sender, &sender_size);
    require(n >= 0, "first recvfrom");
    printf("첫 데이터그램을 2 Byte 버퍼로 수신: %.*s\n", (int)n, data);
    sender_size = sizeof(sender);
    n = recvfrom(server, data, sizeof(data), 0,
                  (struct sockaddr *)&sender, &sender_size);
    require(n >= 0, "second recvfrom");
    printf("다음 데이터그램: %.*s\n", (int)n, data);
    require(sendto(server, data, (size_t)n, 0,
                   (struct sockaddr *)&sender, sender_size) == n, "echo sendto");
    n = recvfrom(client, data, sizeof(data), 0, NULL, NULL);
    require(n >= 0, "client recvfrom");
    printf("클라이언트가 받은 응답: %.*s\n", (int)n, data);
    close(client);
    close(server);
    return 0;
}
```

첫 출력은 `He`이고 다음 출력은 `World`다. 첫 메시지에서 남은 `llo`는 다음 Datagram 앞에 붙지 않는다. 서버는 두 번째 메시지의 송신자 주소로 `World`를 되돌려 준다.

이 예제는 한 호스트의 Loopback에서 동작을 확인한다. 같은 결과가 외부 네트워크의 무손실·순서 보장을 뜻하지는 않는다. 수신에 2초 제한을 두었으므로 데이터가 오지 않으면 오류로 끝난다. 실제 서비스에서 Datagram이 잘렸는지 검사하려면 `recvmsg()`의 `MSG_TRUNC` 같은 기능도 살펴볼 수 있다.

## 어떤 데이터에 사용할 것인가

실시간 음성이나 게임 상태에서는 이미 늦은 과거 데이터를 모두 재전송하기보다 새로운 데이터를 처리하는 편이 나을 수 있다. 그래도 로그인 결과나 결제처럼 누락을 허용할 수 없는 메시지를 같은 기준으로 다루어서는 안 된다. 재전송·중복 제거·순서·혼잡 처리를 어떤 계층이 맡을지 정해야 한다.

짧은 요청과 응답을 주고받는 [DNS](/wiki/computer-systems-network-dns-c7fd180532b4/)도 UDP를 사용하지만 TCP를 함께 지원한다. DHCP는 주소 설정을 시작하는 클라이언트와 Broadcast 등을 지원하기 위해 UDP 기반으로 동작한다. 한 애플리케이션이 UDP를 사용한다는 사실만으로 모든 요청이 전달 보장을 필요로 하지 않는다고 일반화하지 않는다.

UDP 위에 신뢰성 있는 전송을 구현할 수도 있다. HTTP/3가 사용하는 QUIC이 그 사례다. [네트워크](/wiki/network/)의 TCP·UDP 비교는 기본 전송 프로토콜이 제공하는 기능을 비교한 것이며, 그 위에 구현된 전체 프로토콜의 기능까지 제한하는 표가 아니다.
