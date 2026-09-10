---
layout: default
title: 데이터 표현
nav_order: 2
permalink: /wiki/computer-systems-network-topic-e647548deca2/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-e647548deca2
projection_sha256: 2b1fd1a80ba3725e79ee05a5c78cb4789d4c5693b1e414da1fa9d1f5879984e5
parent: 컴퓨터 구조
content_status: ready
public_parent_id: Wiki/computer-systems-network/computer-architecture
search_terms:
- Byte Order
- Endianness
- Little-endian
- Big-endian
- signed
- unsigned
- 바이트 정수 해석
- GDB 메모리 덤프
- off_t
grand_parent: Systems
ancestor: CS 기초
---

# 데이터 표현
{: .no_toc }

Port 번호 9000을 출력했는데 메모리에는 `28 23`이 보일 수 있다. 값이 바뀐 것이 아니라, 16진수 `0x2328`을 이루는 두 Byte가 Little-endian 순서로 놓인 것이다. 같은 메모리를 몇 Byte씩 묶는지, 어떤 순서와 부호로 읽는지에 따라 표시되는 정수가 달라진다.

먼저 소켓 API가 Byte Order를 바꾸는 경우를 살펴보고, 그다음 메모리 덤프의 필드 크기와 부호를 구분한다. 이 규칙은 PintOS의 정수 필드와 PTE를 읽을 때도 그대로 필요하다.

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

## 같은 메모리를 몇 Byte씩 읽을 것인가

Byte Order를 맞췄어도 읽는 크기를 잘못 잡으면 다른 값이 나온다. 메모리에 `05 00 00 00 03 00 00 00`이 있고, 이를 Little-endian으로 읽는다고 해 보자. 처음 4 Byte와 다음 4 Byte를 각각 읽으면 5와 3이다. 8 Byte 전체를 하나의 정수로 읽으면 뒤쪽의 3이 상위 32 Bit를 차지하므로 `5 + 3 × 2³² = 12,884,901,893`이 된다.

Byte가 달라진 것이 아니라 필드 경계를 달리 잡은 것이다. 같은 8 Byte는 1 Byte 값 여덟 개, 4 Byte 값 두 개, 8 Byte 값 한 개로 해석할 수 있다. 어느 쪽이 맞는지는 그 메모리에 저장한 자료형과 형식이 정한다.

부호도 별도의 조건이다. `ff ff ff ff`를 32 Bit unsigned 정수로 읽으면 `2³² - 1`, 즉 4,294,967,295다. 같은 Bit를 2의 보수 signed 정수로 읽으면 -1이다. n Bit signed 정수는 최상위 Bit가 1일 때 unsigned 값에서 `2ⁿ`을 빼서 해석한다. Endianness는 Byte의 순서이고, signed 여부는 그렇게 모은 Bit의 의미다.

아래 예제는 실제 메모리 주소에 접근하는 대신 Byte Buffer를 만든다. `integer()`는 시작 위치·크기·Byte Order·부호를 명시해 읽는다. Python의 Slice는 범위를 넘어도 잘린 결과를 반환하므로, 필요한 Byte가 전부 있는지 먼저 검사한다. 마지막 PTE 예제는 같은 정수를 Flag와 주소 필드로 나누는 경우다. [int.from_bytes()](https://docs.python.org/3/library/stdtypes.html#int.from_bytes)

```run-python
def integer(data, offset, size, *, byteorder="little", signed=False):
    if size not in (1, 2, 4, 8):
        raise ValueError("크기는 1, 2, 4, 8 Byte 중 하나여야 한다")
    if offset < 0 or offset + size > len(data):
        raise ValueError("읽을 범위가 Buffer를 벗어난다")
    return int.from_bytes(data[offset:offset + size], byteorder, signed=signed)


value = bytes.fromhex("00 10 00 00 00 00 00 00")
print("4096의 Little-endian Byte:", value.hex(" "))
print("8 Byte Little-endian:", integer(value, 0, 8))
print("8 Byte Big-endian:", integer(value, 0, 8, byteorder="big"))

fields = bytes.fromhex("05 00 00 00 03 00 00 00")
for size in (1, 2, 4, 8):
    print(f"{size} Byte 정수:", integer(fields, 0, size))
print("4 Byte씩 나누면:", integer(fields, 0, 4), integer(fields, 4, 4))

negative = bytes.fromhex("ff ff ff ff")
print("같은 32 Bit의 signed / unsigned:",
      integer(negative, 0, 4, signed=True), integer(negative, 0, 4))

pte = 0x000000000800B067
flags = {"Present": 0x01, "Writable": 0x02, "User": 0x04,
         "Accessed": 0x20, "Dirty": 0x40}
# 이 값은 상위 주소·제어 Bit가 없는 4 KiB leaf PTE 예제다.
frame_base = pte & 0x000FFFFFFFFFF000
print(f"PTE: {pte:#018x} = {pte:,}")
print("설정된 Flag:", ", ".join(name for name, mask in flags.items() if pte & mask))
print(f"물리 Frame 번호: {frame_base >> 12:#x}, 시작 주소: {frame_base:#x}")

for size in (1, 2, 4, 8):
    bits = size * 8
    for n in (0, (1 << bits) - 1):
        for order in ("little", "big"):
            encoded = n.to_bytes(size, order)
            assert integer(encoded, 0, size, byteorder=order) == n
    for n in (-(1 << (bits - 1)), -1, 0, (1 << (bits - 1)) - 1):
        encoded = n.to_bytes(size, "little", signed=True)
        assert integer(encoded, 0, size, signed=True) == n
assert integer(fields, 0, 8) == 5 + 3 * (1 << 32)
assert frame_base >> 12 == 0x800B
for data, offset, size in ((b"", 0, 1), (fields, 5, 4), (fields, -1, 1)):
    try:
        integer(data, offset, size)
    except ValueError:
        pass
    else:
        raise AssertionError("범위를 벗어난 읽기가 허용됐다")
print("확인: 크기·Byte Order·signed 경계값과 Buffer 범위 검사 통과")
```

Python 3.9.6에서 실행한 결과다. PintOS나 GDB를 실행한 출력이 아니라, 명시한 Byte 배열을 해석한 결과다.

```text
4096의 Little-endian Byte: 00 10 00 00 00 00 00 00
8 Byte Little-endian: 4096
8 Byte Big-endian: 4503599627370496
1 Byte 정수: 5
2 Byte 정수: 5
4 Byte 정수: 5
8 Byte 정수: 12884901893
4 Byte씩 나누면: 5 3
같은 32 Bit의 signed / unsigned: -1 4294967295
PTE: 0x000000000800b067 = 134,262,887
설정된 Flag: Present, Writable, User, Accessed, Dirty
물리 Frame 번호: 0x800b, 시작 주소: 0x800b000
확인: 크기·Byte Order·signed 경계값과 Buffer 범위 검사 통과
```

첫 배열의 `10`은 Little-endian에서 두 번째 Byte이므로 `16 × 256 = 4096`에 해당한다. 같은 배열을 Big-endian으로 읽으면 그 Byte의 자리값이 달라져 큰 수가 나온다. 반면 두 번째 배열은 1·2·4 Byte로 읽을 때 모두 5여서 문제가 없어 보이지만, 8 Byte로 읽는 순간 두 필드가 합쳐진다. 값이 그럴듯하다는 이유만으로 읽기 단위가 맞다고 판단할 수 없는 이유다.

`fields`의 다섯 번째 Byte를 `03`에서 `01`로 바꾸면 8 Byte 결과는 `5 + 2³²`가 된다. 이 변화는 처음 4 Byte의 값 5를 바꾸지 않는다. `negative`의 마지막 Byte를 `7f`로 바꾸면 최상위 Bit가 0이 되므로 signed와 unsigned 결과가 같아진다. 출력 식과 Byte 위치를 함께 보며 확인할 수 있다.

## GDB에서 크기와 표시 형식을 지정한다

GDB의 `x` 명령은 프로그램의 자료형과 별개로 메모리를 읽는다. `x/nfu addr`에서 `n`은 읽을 단위의 개수, `f`는 표시 형식, `u`는 단위 크기다. `b`, `h`, `w`, `g`는 각각 1·2·4·8 Byte를 뜻한다. GDB의 `w`는 4 Byte이므로 x86 문서에서 2 Byte를 가리키는 word와 혼동하지 않아야 한다. [GDB 메모리 조회](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Memory.html)

| 명령 | 읽는 범위와 표시 |
| --- | --- |
| `x/8bx addr` | 1 Byte씩 여덟 개를 16진수로 표시한다. |
| `x/2wx addr` | 4 Byte씩 두 개를 16진수로 표시한다. |
| `x/1gx addr` | 8 Byte 하나를 16진수로 표시한다. |
| `x/1wd addr` | 4 Byte 하나를 signed 10진수로 표시한다. |
| `x/1wu addr` | 4 Byte 하나를 unsigned 10진수로 표시한다. |
| `x/1gd addr` | 8 Byte 하나를 signed 10진수로 표시한다. |

표의 `addr`에는 현재 디버깅 대상의 유효한 주소를 넣는다. 여기서는 GDB Session을 실행하지 않았으며, 명령의 읽기 범위를 설명한 것이다. `x`, `d`, `u` 외에 `t`는 2진수, `o`는 8진수 표시다. 생략한 형식과 크기는 앞선 명령의 영향을 받으므로, 값을 비교할 때는 명시하는 편이 낫다.

예를 들어 앞서 만든 4096의 배열을 실제 대상 메모리에 놓았다면 `x/8bx`와 `x/1gx`는 같은 8 Byte를 각각 나누거나 묶어서 보여 준다. `x/1gd`로 표시를 바꾸어도 메모리에 저장된 Bit는 변하지 않는다.

## PintOS 필드는 선언과 함께 읽는다

메모리 덤프만으로는 값이 Thread ID인지, 파일 Offset인지 알 수 없다. 먼저 필드 선언을 확인해야 한다. 다음 표는 `lrn-pintos`의 `9d1b14c` 버전에서 확인한 선언이다. 이 저장소의 `off_t`는 `int32_t`이며, 다른 OS의 같은 이름을 보고 8 Byte라고 추정해서는 안 된다.

| 값 | 확인한 선언 | 해석할 때 볼 조건 |
| --- | --- | --- |
| Thread ID | `tid_t`, 즉 `int` | `struct thread.tid`를 읽는다. 오류값 `TID_ERROR`는 -1이다. |
| 우선순위 | `int priority`, `int base_priority` | 유효 우선순위와 기부 전 우선순위를 구분한다. 범위는 0~63이다. |
| 깨울 시각 | `int64_t wake_tick` | 8 Byte signed 값이다. Tick의 의미는 Scheduling 코드가 정한다. |
| Sector 번호 | `uint32_t disk_sector_t` | 4 Byte unsigned 값이다. 실제 유효 번호는 디스크 크기에 따라 달라진다. |
| 파일 Offset | `int32_t off_t` | 4 Byte signed 값이다. 페이지 내부 Offset과 같은 개념이 아니다. |
| 종료 상태 | `int child_status.exit_status` | `process_exit_with_status(int status)`가 저장한다. |
| System Call 번호 | `intr_frame.R.rax` | Register의 폭과 번호의 유효 범위를 구분한다. 번호는 `syscall-nr.h`를 따른다. |
| Page Table Entry | `uint64_t`로 다루는 엔트리 | 8 Byte에서 주소와 Flag를 분리한다. |

선언은 [thread.h](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/include/threads/thread.h), [off_t.h](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/include/filesys/off_t.h), [disk.h](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/include/devices/disk.h)에서 확인할 수 있다. 종료 상태의 저장과 전달은 [process.c](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/userprog/process.c), System Call 번호는 [syscall-nr.h](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/include/lib/syscall-nr.h)에 있다.

`THREAD_RUNNING`, `THREAD_READY`, `THREAD_BLOCKED`, `THREAD_DYING`은 차례로 0·1·2·3이다. 따라서 앞 예제의 두 번째 값 3을 이 Enum으로 읽으면 `THREAD_DYING`이다. Byte를 제대로 읽어도 이름을 잘못 대응시키면 해석은 틀린다. 종료 상태 역시 이 구현에서는 `int` 값이 저장되고 `process_wait()`로 전달된다. Shell에서 흔히 보는 종료 코드 범위를 이 필드의 저장 범위로 대신할 수 없다.

구조체의 Offset도 실행 파일과 맞춰 확인한다. 이 버전의 `struct thread`에는 `tid`, `status`, `priority`, `base_priority`, `wake_tick` 순으로 필드가 선언되어 있다. 그러나 실제 Byte Offset과 Padding은 대상 ABI와 컴파일 조건까지 반영한 결과다. Little-endian이라는 사실만으로 구조체 배치가 정해지지는 않는다.

Debug Symbol을 읽은 GDB에서는 아래 명령으로 필드 Offset과 크기를 확인할 수 있다. 이는 실행할 명령의 예이며 이 글에서 확인한 GDB 출력은 아니다.

```gdb
ptype /o struct thread
ptype off_t
p sizeof(off_t)
ptype /o struct child_status
```

`ptype /o`는 필드의 Offset·크기와 Padding을 보여 준다. 이 정보로 경계를 잡은 뒤 필요한 주소를 `x`로 읽는다. Linux의 `task_struct`나 파일시스템 자료구조를 읽을 때도 해당 빌드의 선언과 Debug Symbol을 확인하는 순서가 같다. PintOS의 필드 위치를 그대로 적용할 수는 없다. [GDB 자료형과 필드 배치](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Symbols.html)

## 정수에서 Flag와 주소를 분리한다

예제의 PTE `0x000000000800B067`을 10진수로 쓰면 134,262,887이다. 이 큰 수 자체보다 어떤 Bit가 켜져 있는지가 필요하다. 하위 값 `0x067`에는 Present·Writable·User·Accessed·Dirty에 해당하는 Bit 0·1·2·5·6이 설정되어 있다. 각 Flag는 `pte & mask`가 0인지로 검사한다. [PintOS의 PTE Flag](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/include/threads/pte.h)

여기서는 상위 제어 Bit가 없는 4 KiB 페이지의 leaf PTE 값을 사용했다. 주소 부분 `0x0800B000`을 12 Bit 오른쪽으로 이동하면 물리 Frame 번호 `0x800B`가 된다. 다시 4096을 곱하면 Frame 시작 주소로 돌아간다. 이 주소는 페이지 안의 특정 Byte 주소와는 다르며, 실제 접근 주소를 얻으려면 해당 Offset을 더해야 한다.

이 한 값을 분해한 것이 모든 PTE 형식을 검증했다는 뜻은 아니다. 물리 주소의 지원 폭과 상위 제어 Bit, 큰 페이지 여부는 별도로 확인해야 한다. 특히 모든 상위 Bit를 주소로 간주해서는 안 된다. 단계별 주소 변환과 권한 판단은 [Paging](/wiki/computer-systems-network-topic-dbd836d1a044/)에서 이어서 다룬다.

## 바이트를 읽는 쪽과 의미를 붙이는 쪽

QEMU의 GDB Stub은 메모리와 Register를 원격 디버거에 제공한다. 메모리를 요청하는 Remote Protocol의 `m` Packet에는 주소와 길이가 들어가며, 응답은 Byte를 16진수로 인코딩한 내용이다. `x/1wd`처럼 크기와 표시 형식을 선택하는 것은 GDB 명령의 역할이다. Stub이 그 명령을 그대로 받아 signed 10진수로 변환한다고 이해하면 두 역할이 섞인다. [GDB Remote Protocol의 메모리 읽기](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Packets.html)

GDB는 Debug Symbol이 있으면 자료형과 필드 이름을 사용해 구조체를 보여 줄 수도 있다. 다만 `priority=31`이 어떤 Scheduling 판단에 쓰이는지는 프로그램의 규칙까지 읽어야 알 수 있다. CPU 명령이 정수·주소·명령어로 Bit를 해석하는 일, 디버거가 그 값을 표시하는 일, 개발자가 필드의 의미를 판단하는 일은 서로 이어지지만 같은 작업은 아니다.
