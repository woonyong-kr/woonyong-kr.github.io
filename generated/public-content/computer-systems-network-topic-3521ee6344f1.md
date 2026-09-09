---
layout: default
title: 주소 공간
nav_order: 2
permalink: /wiki/computer-systems-network-topic-3521ee6344f1/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-3521ee6344f1
projection_sha256: c0b2019596592a2acec1696fda910a5d7c4cdad1a2808bacb3933a93d0342e00
parent: 메모리 관리
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-d160fea60072
grand_parent: OS
ancestor: CS
---

# 주소 공간
{: .no_toc }

프로그램이 사용하는 주소는 프로세스의 **가상 주소 공간**에 속한다. 같은 주소라도 프로세스가 다르면 다른 메모리를 가리킬 수 있고, 서로 다른 주소를 같은 물리 페이지에 연결할 수도 있다. 주소의 범위와 접근 권한을 정하는 일, 물리 Frame을 확보하는 일, 그 안에 객체를 만드는 일은 각각 다른 단계다.

전역 변수 `int g = 42;`와 `malloc()`으로 얻은 블록을 비교하면 이 차이가 드러난다. 전역 변수의 초기값은 실행 파일에서 출발하고, 동적 할당은 실행 중에 필요한 공간을 요청한다. 어느 경우든 주소를 사용할 수 있다는 사실만으로 해당 페이지가 이미 물리 메모리에 상주한다고 결론낼 수는 없다. 주소 변환 자체는 [Paging](/wiki/computer-systems-network-topic-dbd836d1a044/)에서 다룬다.

## 실행 파일에서 메모리로

Linux의 ELF 실행 파일을 예로 들어 `g`의 경로를 따라가 보자. 컴파일러와 어셈블러는 소스를 기계어와 데이터, 심볼 정보가 있는 목적 파일로 바꾼다. 링커는 목적 파일들을 결합하면서 심볼 참조를 해결하고 실행 파일의 배치를 정한다. 일반적인 구성에서 쓰기 가능한 전역 변수의 초기값 42는 `.data`에 들어간다. 실제 배치는 최적화와 Linker 설정에 따라 달라질 수 있다.

여기서 **Section**과 **Segment**를 구분해야 한다. `.text`, `.data`, `.bss` 같은 Section은 파일 안의 내용을 종류별로 나눈다. 실행할 때 로딩할 범위와 권한은 Program Header가 나타내며, 그중 `PT_LOAD` Segment가 메모리에 적재할 영역을 기술한다. Section 하나마다 별도의 Mapping이 생기는 것은 아니다. `.bss`는 보통 `SHT_NOBITS` Section으로 표현하므로 크기는 있어도 그 크기만큼의 초기값을 파일에 저장하지 않는다. 명시적으로 0을 대입한 정적 객체도 이 영역에 놓일 수 있다. [ELF의 Section과 Program Header](https://man7.org/linux/man-pages/man5/elf.5.html)

`execve()`로 새 프로그램을 실행하면 Kernel은 기존 주소 공간의 Mapping을 새 실행 이미지에 맞게 바꾼다. 동적 링크 ELF라면 `PT_INTERP`가 지정한 인터프리터도 관여해 필요한 공유 라이브러리를 준비한다. 실행 파일에 있는 내용을 모두 먼저 읽어야만 프로그램이 시작되는 것은 아니다. [Linux의 `execve()`](https://man7.org/linux/man-pages/man2/execve.2.html)

프로그램이 `g`를 처음 읽는 순간에도 여러 경로가 가능하다. 같은 페이지를 이미 접근했거나 로딩 과정에서 준비했다면 곧바로 읽을 수 있다. 페이지가 아직 현재 프로세스에 연결되지 않았지만 파일 내용이 Page Cache에 있다면 디스크를 읽지 않는 Minor Fault로 처리할 수 있다. 저장 장치에서 내용을 가져와야 하는 경우에는 Major Fault가 발생할 수 있다. 따라서 ‘변수의 첫 접근 → Page Fault → 디스크 읽기’가 언제나 성립하는 것은 아니다. Fault의 종류와 처리 경로는 [Page Fault](/wiki/computer-systems-network-topic-5cebdbc10ddf/)에서 이어진다.

### 파일에 없는 0은 어디서 오는가

`PT_LOAD`의 `p_filesz`는 파일에서 가져올 바이트 수, `p_memsz`는 메모리에 필요한 바이트 수다. `p_memsz`가 더 크면 그 차이에 해당하는 영역은 0으로 채워진다. 다음 코드는 초기값 42를 담은 4바이트와 뒤의 0으로 채울 영역을 구성한다. ELF 파일을 직접 로딩하는 프로그램은 아니며, Segment의 두 크기가 의미하는 바이트 배열을 실행해 보는 모델이다.

```run-python
from struct import pack, unpack_from

file_bytes = pack('<I', 42)
file_size = len(file_bytes)
memory_size = 12
virtual_start = 0x400000
assert 0 <= file_size <= memory_size

segment = bytearray(memory_size)
segment[:file_size] = file_bytes
for offset in range(0, memory_size, 4):
    value = unpack_from('<I', segment, offset)[0]
    origin = '파일의 초기값' if offset < file_size else '0으로 채운 영역'
    print(f'VA={virtual_start + offset:#x}: {value} ({origin})')

assert unpack_from('<I', segment, 0)[0] == 42
assert segment[file_size:] == bytes(memory_size - file_size)
```

첫 주소에는 42, 뒤의 두 주소에는 0이 출력된다. 이 예제는 4바이트 정수와 Little Endian을 명시적으로 선택했다. 실제 Kernel이 페이지를 언제 확보하는지, 어떤 Frame에 연결하는지까지 이 배열로 재현하지는 않는다.

## 영역의 이름과 객체의 수명

주소 공간을 설명할 때는 보통 다음 영역을 구분한다. 이는 각 영역의 용도를 정리한 표이며, 모든 프로세스가 이 순서로 연속 배치된다는 뜻은 아니다.

| 영역 | 주로 담는 내용 | 함께 볼 조건 |
| --- | --- | --- |
| Text | 실행할 기계어 | 실행·읽기·쓰기 권한은 Segment와 Mapping 설정에 달려 있다. |
| Data | 초기값이 있는 정적 객체 | 파일의 초기값과 실행 중 변경된 값은 다를 수 있다. |
| BSS | 0으로 초기화할 정적 객체 | 파일에 같은 크기의 0을 모두 저장할 필요가 없다. |
| Heap | 동적으로 할당하는 블록 | 할당기가 여러 Mapping과 Arena를 사용할 수 있다. |
| Stack | 함수 호출에 필요한 저장 공간 | 같은 프로세스의 Thread들도 보통 각자의 Stack을 사용한다. |
| 기타 Mapping | 공유 라이브러리, 파일, 익명 메모리 등 | 공유 여부와 접근 권한을 Mapping마다 정한다. |

‘Heap은 위로, Stack은 아래로 자란다’는 그림은 전형적인 배치를 단순화한 것이다. `brk()`로 관리하는 영역의 끝은 주소가 커지는 방향으로 확장할 수 있지만, 모든 `malloc()`이 그 끝을 늘리는 것은 아니다. 주소 배치는 ASLR, 실행 파일 형식과 ABI, Mapping 요청 등에 영향을 받는다. 서로 떨어진 영역을 하나의 Heap 그림으로 표현하면 이 차이가 사라진다.

객체의 **수명**은 실제 배치와 구분해서 읽어야 한다. C에서 자동 저장 기간을 가진 일반적인 지역 객체는 해당 Block을 실행하는 동안 존재한다. 그 Block이 끝난 뒤 객체를 가리키던 포인터로 접근하면 안 된다. 지역 변수라고 해서 항상 Stack에 바이트가 생기는 것은 아니다. 컴파일러가 Register에 두거나 연산 자체를 없앨 수도 있다. [C 작업 초안 N3096, 6.2.4 객체의 저장 기간](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3096.pdf)

| 저장 기간 | 예 | 수명이 끝나는 기준 |
| --- | --- | --- |
| Static | 전역 변수, 함수 안의 `static` 변수 | 프로그램 실행이 끝날 때 |
| Thread | C의 Thread Local 객체 | 해당 Thread 실행이 끝날 때 |
| Automatic | 일반적인 Block 내부 지역 변수 | 해당 Block의 실행이 끝날 때; VLA에는 선언 시점과 Scope에 따른 별도 규칙이 있다. |
| Allocated | `malloc()` 등으로 확보한 객체 | 해제할 때 |

함수 안에 선언한 `static` 변수는 함수가 반환되어도 남는다. 반대로 지역 포인터가 사라져도 그 포인터가 가리키던 동적 할당은 자동으로 해제되지 않는다. 소유한 블록을 해제하지 못하면 누수가 되고, 해제한 뒤 다시 접근하면 Use After Free가 된다. 프로세스가 종료되면 OS가 그 주소 공간을 회수하지만, 실행 중의 반환 책임까지 없어지는 것은 아니다. C++의 `new`·`delete`처럼 사용하는 언어와 API에 맞는 생성·소멸 규칙도 함께 확인한다. 선언 위치만 보는 대신 ‘누가 이 공간을 소유하며 언제까지 사용하는가’를 확인해야 한다.

## 함수 호출과 Stack Frame

Stack은 중첩된 함수 호출과 반환에 맞춰 저장 공간을 관리한다. x86-64에서 `RSP`는 현재 Stack 위치를 가리키며, 호출 과정에는 반환 주소와 필요한 Register 저장, 지역 저장 공간이 관여한다. 다만 모든 호출이 같은 모양의 Stack Frame을 만들지는 않는다. Inline으로 호출 자체가 없어질 수 있고, Frame Pointer인 `RBP`를 생략하는 코드도 있다.

인자 전달 규칙도 ‘x86-64는 처음 여섯 개를 Register로 전달한다’만으로 설명하기에는 부족하다. **System V AMD64 ABI**에서는 INTEGER로 분류한 인자를 `RDI`, `RSI`, `RDX`, `RCX`, `R8`, `R9` 순서의 사용 가능한 Register에 배정한다. SSE로 분류한 인자는 별도의 Vector Register를 사용한다. 구조체의 분류, 정렬과 Register의 잔여 수에 따라서도 전달 위치가 달라진다. 이는 하나의 ABI 규칙이며, 다른 ABI에 그대로 적용하지 않는다. [System V AMD64 ABI의 Stack Frame과 인자 전달](https://gitlab.com/x86-psABIs/x86-64-ABI/-/blob/master/x86-64-ABI/low-level-sys-info.tex)

Stack 공간에는 한도가 있으므로 깊은 재귀 호출과 큰 지역 배열은 주의해야 한다. Linux의 Stack 크기를 일괄적으로 8 MiB라고 정할 수는 없다. NPTL에서 새 Thread의 기본 Stack 크기는 프로그램 시작 시점의 `RLIMIT_STACK`이 유한한지와 아키텍처에 영향을 받으며, Thread 속성으로 바꿀 수도 있다. Stack 확장이 한도에 도달하면 `SIGSEGV`가 발생할 수 있다. 모든 Stack 손상이 반드시 Guard Page에서 즉시 잡힌다는 뜻은 아니다. [Thread의 기본 Stack 크기](https://man7.org/linux/man-pages/man3/pthread_create.3.html), [Stack 자원 한도](https://man7.org/linux/man-pages/man2/getrlimit.2.html)

## malloc과 OS 사이의 경계

`malloc(size)`는 요청을 담을 블록을 할당기에서 받는 함수다. 이미 확보한 빈 블록으로 요청을 처리할 수도 있으므로 호출할 때마다 시스템 호출이 필요한 것은 아니다. `free(ptr)`도 먼저 할당기 관점의 반환이며, 항상 즉시 Mapping을 없애거나 프로세스의 메모리 사용량을 같은 크기만큼 줄이지는 않는다.

Linux의 `brk()`는 데이터 영역 끝을 나타내는 **Program Break**를 바꾼다. `sbrk()`는 증가량으로 이 위치를 조정하는 라이브러리 함수이며, Linux에서는 내부적으로 `brk()`를 사용한다. 일반 응용 프로그램은 이 경계를 직접 조작하기보다 `malloc()` 같은 할당 인터페이스를 사용한다. [Program Break와 `sbrk()`](https://man7.org/linux/man-pages/man2/brk.2.html)

별도의 [메모리 매핑](/wiki/computer-systems-network-topic-aad7c9c2b57f/)을 얻는 `mmap()` 경로도 있다. glibc의 할당기는 요청 크기와 기존 빈 공간, Arena와 설정에 따라 경로를 고른다. `M_MMAP_THRESHOLD`의 초기값 128 KiB는 ‘그 이상이면 반드시 mmap’이라는 고정 규칙이 아니다. 기존 빈 블록에서 요청을 처리할 수 있고, 기본 동작에서는 임계값도 할당·해제 이력에 따라 조정된다. [glibc의 mmap 임계값](https://man7.org/linux/man-pages/man3/mallopt.3.html)

따라서 `malloc(256 * 1024)`만 보고 정확한 시스템 호출을 단정할 수 없다. 어떤 할당기를 쓰는지, 재사용할 공간이 있는지, 임계값과 Arena 상태가 어떤지 알아야 한다. 실제 호출 경로를 확인하려면 해당 환경에서 추적해야 한다. 독립된 큰 Mapping은 해제할 때 개별적으로 반환하기 쉽지만, Program Break로 얻은 영역의 중간 블록은 비어도 끝을 바로 줄일 수 없다. 재사용을 위해 보유하는 정책도 OS 반환 시점에 영향을 준다.

Stack을 ‘빠르고 단편화가 없는 공간’, Heap을 ‘느리지만 무제한인 공간’으로 나누는 설명도 거칠다. Stack의 연속적인 Frame 관리는 단순하지만 호출·정렬·페이지 확보 비용까지 사라지는 것은 아니다. Heap에는 탐색·동기화·단편화 비용이 있으나 이미 준비한 블록을 빠르게 재사용하는 경로도 있다. 두 공간 모두 환경의 한도 안에서 사용한다. 블록의 분할과 병합, 재할당 실패 시 내용 보존은 [메모리 관리](/wiki/computer-systems-network-topic-d160fea60072/)에서 다룬다.

## PintOS에서 같은 차이를 읽는다

[PintOS `5afaa6d`의 Thread 구조](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/threads/thread.h)에서는 4 KiB 페이지 하나를 `struct thread`와 Kernel Stack이 함께 사용한다. 구조체는 낮은 쪽에 놓이고 Stack은 페이지 끝에서 아래로 자란다. 따라서 **실제로 쓸 수 있는 Kernel Stack은 4 KiB보다 작다.** 구조체 크기는 빌드 구성과 필드에 따라 달라진다.

`struct thread` 끝쪽의 `magic`은 손상을 알아차리는 보조 수단이다. [`thread_current()`](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/thread.c#L392)는 현재 Thread를 구한 뒤 Magic과 실행 상태를 검사한다. Stack이 구조체를 침범해 Magic을 바꾸면 이 검사에서 잡힐 수 있지만, 모든 Overflow를 잡는 Guard Page와 같지 않다. 다른 잘못된 쓰기도 Magic을 손상할 수 있다.

User Stack은 이 Kernel Stack과 별개다. 이 저장소는 `USER_STACK`을 `0x47480000`으로 정의하며, 사용자 프로그램의 Stack을 그 아래에 준비한다. 초기 Stack에 넣는 내용은 [인자 전달](/wiki/computer-systems-network-topic-1217820258bd/)에서, Project 3의 Fault 기반 성장 조건은 [Page Fault](/wiki/computer-systems-network-topic-5cebdbc10ddf/)에서 확인할 수 있다. 이 주소와 성장 규칙을 일반적인 Linux 기본값으로 옮겨 해석하지 않는다.

Kernel 함수에서 큰 지역 배열이 필요하다면 제한된 Stack을 얼마나 차지하는지 먼저 확인한다. 수명이 호출 범위를 넘거나 크기가 크면 `malloc()` 또는 `palloc_get_page()` 같은 동적 할당을 고려하고, 성공 여부와 반환 책임을 함께 처리한다. 이 PintOS의 Kernel `malloc()`은 `palloc` 위에서 작은 블록과 Arena를 관리한다. 사용자 프로그램의 `malloc()`이 같은 함수를 직접 호출한다고 보면 안 된다.

작은 블록을 묶는 Descriptor와 Arena, 페이지를 추적하는 Pool·Bitmap의 구체적인 구현은 [메모리 관리](/wiki/computer-systems-network-topic-d160fea60072/)에 정리되어 있다. Kernel Pool과 User Pool은 예약 영역 등을 제외하고 할당에 사용할 물리 메모리를 나누며, 시스템 RAM 전체를 단순히 반씩 가진다는 뜻은 아니다. 두 Pool을 나누면 사용자 페이지 요청이 Kernel Pool을 직접 소진하는 일을 제한할 수 있지만, 모든 Kernel 할당의 성공을 보장하지는 않는다.
