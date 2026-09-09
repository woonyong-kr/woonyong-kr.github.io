---
layout: default
title: 데이터 표현
nav_order: 2
permalink: /wiki/computer-systems-network-topic-e647548deca2/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-e647548deca2
projection_sha256: b1443d7b10e45dcc2c2ceda25a1cf5d8b21686c0e4ca01b83603e91b29a0e3ee
parent: 컴퓨터 구조
content_status: ready
public_parent_id: Wiki/computer-systems-network/computer-architecture
grand_parent: Systems
ancestor: CS 기초
---

# 데이터 표현
{: .no_toc }

컴퓨터는 메모리의 Bit를 자료형과 규칙에 따라 해석한다. 같은 Bit 배열도 정수인지 문자 인코딩인지에 따라 의미가 달라진다. 여러 Byte를 하나의 값으로 묶을 때는 각 Byte를 어떤 순서로 놓을지도 정해야 한다.

네트워크의 Port 번호를 다루면 이 차이를 바로 확인할 수 있다. 숫자 9000이라는 값과 그 값이 메모리에 저장된 Byte 순서는 같은 개념이 아니다.

## 여러 Byte의 순서

9000을 16진수로 쓰면 `0x2328`이다. 두 Byte로 나타낼 때 큰 자리인 `23`을 앞에 두는 방식은 Big-endian, 작은 자리인 `28`을 앞에 두는 방식은 Little-endian이다.

| 방식 | 낮은 주소부터 놓인 Byte |
| --- | --- |
| Big-endian | `23 28` |
| Little-endian | `28 23` |

이는 값의 대소나 문자열을 읽는 방향에 관한 규칙이 아니다. 여러 Byte로 이루어진 수를 메모리나 전송 형식에 배치하는 순서다. x86은 Little-endian을 사용하지만, 모든 실행 환경의 Byte 순서가 같다고 가정해서는 안 된다.

IP 주소와 TCP·UDP Port 같은 네트워크 필드는 Network Byte Order를 사용한다. 이는 Big-endian이다. 소켓 주소에 Host Byte Order의 숫자를 그대로 대입하면, 호스트의 Byte 순서에 따라 다른 값으로 해석될 수 있다.

## 소켓 API의 변환 함수

`htons()`는 16 Bit 값을 Host Byte Order에서 Network Byte Order로 바꾼다. 이름의 `s`는 short에서 왔다. `htonl()`은 32 Bit 값을 변환하며, 반대 방향에는 `ntohs()`와 `ntohl()`이 있다. Host와 Network의 순서가 이미 같다면 Byte를 뒤집을 필요가 없다. [byteorder 함수](https://man7.org/linux/man-pages/man3/byteorder.3.html)

아래 코드는 Port 9000의 메모리 표현과 변환 결과를 출력한다. 실제 네트워크로 데이터를 보내지 않고 Byte 표현만 비교한다.

```run-c
#include <arpa/inet.h>
#include <stdint.h>
#include <stdio.h>

static void show_bytes(const char *label, uint16_t value) {
    const unsigned char *bytes = (const unsigned char *)&value;
    printf("%s: %02X %02X\n", label, (unsigned)bytes[0], (unsigned)bytes[1]);
}

int main(void) {
    uint16_t port = 9000;
    uint16_t network_port = htons(port);
    printf("Port: %u (0x%04X)\n", (unsigned)port, (unsigned)port);
    show_bytes("호스트 메모리", port);
    show_bytes("네트워크 순서", network_port);
    printf("ntohs로 복원: %u\n", (unsigned)ntohs(network_port));
    printf("변환 없이 네트워크 값으로 읽으면: %u\n", (unsigned)ntohs(port));
    return 0;
}
```

Little-endian 환경에서는 호스트 메모리가 `28 23`, 네트워크 순서가 `23 28`로 보인다. 변환하지 않은 값을 네트워크 순서라고 해석하면 `0x2823`, 즉 10275가 된다. `ntohs(htons(port))`는 원래 값 9000으로 돌아온다.

`port`를 9001로 바꾸면 마지막 Byte가 어떻게 달라지는지 비교할 수 있다. `show_bytes()`는 `unsigned char`로 객체의 Byte 표현을 읽는다. 숫자를 출력하는 `printf()`의 결과와 메모리의 Byte를 출력한 결과를 구분해서 보아야 한다.

문자열 IP 주소를 `inet_pton()`으로 변환했다면 그 함수가 만든 주소는 이미 네트워크 표현이다. 여기에 무조건 `htonl()`을 한 번 더 적용해서는 안 된다. 반면 `sockaddr_in.sin_port`에 호스트의 Port 숫자를 넣을 때는 `htons()`를 사용한다. 어느 값이 이미 변환되었는지 API의 입력·출력 계약을 확인하는 것이 중요하다.
