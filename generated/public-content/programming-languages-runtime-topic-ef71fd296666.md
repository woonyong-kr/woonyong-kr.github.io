---
layout: default
title: Pointer
nav_order: 2
permalink: /wiki/programming-languages-runtime-topic-ef71fd296666/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/programming-languages-runtime-topic-ef71fd296666
projection_sha256: 1da6afe04f03a61798b40a10d25beb247f9df1694d55ecefb673c1746690a8ee
parent: C
content_status: ready
public_parent_id: Wiki/programming-languages-runtime/c
search_terms:
- 포인터
- Pointer
- 이중 포인터
- 포인터 배열
- 슬롯 주소
- GDB 주소 표시
- canonical address
- Guest 주소
- Host 주소
grand_parent: 프로그래밍 언어
ancestor: Programming
---

# Pointer
{: .no_toc }

`int *p = &x` 다음에 `*p = 42`를 실행하면 `x`가 바뀐다. 반면 `p = &y`는 `x`의 값을 바꾸지 않고, `p`가 다른 객체를 가리키게 한다. C의 Pointer를 읽을 때는 포인터에 저장한 값과 그 포인터가 가리키는 객체를 먼저 구분해야 한다.

## 주소를 얻고 값을 읽기

`&x`는 객체 `x`의 주소를 얻고, `*p`는 유효한 `p`가 가리키는 객체를 나타낸다. `int *p`에서 `*`는 포인터를 선언하는 표기이고, 식 `*p`에서는 대상을 찾아가는 역참조 연산자다. 포인터는 값이며, `p`는 그 값을 보관하는 변수다. 모든 포인터 표현식이 별도의 포인터 변수를 만드는 것은 아니다.

다음 예제에서 `x`는 `p`를 통해 바뀌고, 구조체의 `x` 멤버는 `position`을 통해 바뀐다.

```run-c
#include <assert.h>
#include <stdio.h>

struct point {
    int x;
    int y;
};

int main(void) {
    int x = 10;
    int *p = &x;
    int before = *p;
    *p = 42;

    struct point point = {3, 7};
    struct point *position = &point;
    position->x = 5;

    printf("x: %d -> %d\n", before, x);
    printf("point: (%d, %d)\n", (*position).x, point.y);
    printf("sizeof(int)=%zu, sizeof(int *)=%zu\n",
           sizeof x, sizeof p);
    assert(x == 42 && point.x == 5 && position->y == 7);
    return 0;
}
```

`position->x`와 `(*position).x`는 같은 멤버를 가리킨다. 객체에서 멤버를 고를 때는 `.`, 구조체 포인터를 통해 고를 때는 `->`를 사용한다. PintOS의 `thread_current()->status`도 같은 방식으로 읽는다.

마지막 줄의 크기는 실행 환경에서 확인할 값이다. 흔한 x86-64·AArch64 ABI에서는 `int`가 4바이트이고 객체 포인터가 8바이트이지만, C가 모든 환경에서 그 크기를 강제하지는 않는다. “64비트 시스템”이라는 이름만으로 모든 포인터 종류와 정수의 크기를 결정하지 말고, 대상 ABI와 `sizeof`를 확인해야 한다.

## 복사한 주소와 호출자의 변수

C는 함수 인자의 값을 매개변수로 전달한다. 포인터를 전달할 때도 주소 값이 복사된다. 따라서 함수의 `p = next`는 지역 매개변수만 바꾸지만, `*p = value`는 호출자도 사용하는 객체를 바꿀 수 있다. 호출자의 포인터 변수 자체를 바꾸려면 그 변수의 주소를 전달한다.

아래 코드는 가리키는 값의 수정, 복사본의 재지정, 원래 포인터의 재지정을 차례로 비교한다.

```run-c
#include <assert.h>
#include <stdio.h>

static void change_value(int *p) {
    *p = 42;
}

static void change_copy(int *p, int *next) {
    p = next;
    printf("함수 안의 복사본: %d\n", *p);
}

static void change_pointer(int **pp, int *next) {
    *pp = next;
}

int main(void) {
    int x = 10;
    int y = 99;
    int *p = &x;

    change_value(p);
    printf("객체 수정 뒤: x=%d\n", x);
    change_copy(p, &y);
    printf("복사본 변경 뒤 호출자: %d\n", *p);
    assert(p == &x && x == 42);

    change_pointer(&p, &y);
    printf("원래 포인터 변경 뒤: %d\n", *p);
    assert(p == &y && x == 42);
    return 0;
}
```

`change_pointer()`의 `pp`는 `p`의 주소를, `*pp`는 호출자의 포인터 변수를 나타낸다. `**pp`를 읽으면 그 포인터가 가리키는 정수에 도달한다. 이중 포인터는 한 번 더 따라가야 하는 대상을 표현하는 타입이다. [포인터 매개변수와 대상의 변경](https://wiki.sei.cmu.edu/confluence/display/c/DCL13-C.+Declare+function+parameters+that+are+pointers+to+values+not+changed+by+the+function+as+const)

Linked List의 head를 바꾸는 함수가 언제나 이중 포인터를 받아야 하는 것은 아니다. 함수가 어느 객체를 받는지에 따라 수정 경로가 달라진다.

| 함수에 전달하는 대상 | 변경하는 위치 |
|---|---|
| 리스트 객체의 주소 `LinkedList *ll` | 같은 객체의 `ll->head` 필드 |
| head 변수의 주소 `ListNode **head` | 호출자가 가진 포인터 변수 `*head` |
| 현재 head 값 `ListNode *head` | 새 head를 반환하고 호출자가 대입 |

자료구조 과제의 `insertSortedLL(LinkedList *ll, int item)`은 첫 번째 형태다. `LinkedList`에는 `size`와 `ListNode *head`가 있고, `ListNode`에는 정수 `item`과 다음 노드의 주소가 있다. `ListNode *`는 정수 하나의 주소인 `int *`와 다른 타입이다. 인자 전달 방식은 여전히 값 전달이며, 그 값으로 같은 리스트 객체에 접근하는 것이다. [과제의 타입과 함수 계약](https://github.com/woonyong-kr/SW-AI-W06-data_structures_docker/blob/70284b20008dfe697de84431bedff6f059dc33c0/Data-Structures/Linked_List/Q1_A_LL.c#L13)

## 타입을 지운 주소와 다시 읽을 타입

객체 포인터는 `void *`로 바꾸었다가 원래 타입으로 되돌릴 수 있다. `malloc()`의 반환값이나 `memcpy()`의 인자가 특정 객체 타입에 묶이지 않는 이유다. 이 보장을 함수 포인터까지 확대하지는 않는다.

C에서는 `void *`를 적절한 객체 포인터 변수에 대입할 때 명시적인 cast가 필수는 아니다. 다음은 변환을 설명하는 식이며, `x`가 살아 있는 `int` 객체라는 전제다.

```c
void *address = &x;
int *value = address;
```

`void *` 자체로 정수 값을 읽을 수는 없다. 대상 타입을 정한 뒤 접근해야 하며, cast를 썼다고 해서 주소의 정렬·객체 타입·수명이 자동으로 맞아지는 것도 아니다. C++의 암시적 변환 규칙과도 구분해야 한다. [C11 초안 §6.3.2.3, §6.5.16.1](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf)

`NULL`은 어떤 객체나 함수도 가리키지 않는 포인터를 나타내는 데 쓰며, 역참조할 대상이 아니다. `p != NULL`만 검사해도 충분하지는 않다. 해제한 Heap 객체나 수명이 끝난 지역 객체를 가리키는 포인터 역시 사용할 수 없기 때문이다. 객체의 할당·수명·해제는 [메모리 관리](/wiki/programming-languages-runtime-topic-a1c0b9893bd1/)에서 이어진다.

포인터에 정수를 더할 때는 가리키는 타입의 크기로 이동한다. `char *`의 한 칸은 C의 1바이트이고, `int *`의 한 칸은 `sizeof(int)`, `struct thread *`의 한 칸은 `sizeof(struct thread)`다. 배열 안에서의 이동과 경계는 [Array](/wiki/programming-languages-runtime-topic-2ac2dfca2dd1/)에서 다룬다. 표준 C는 `void *` 산술을 지원하지 않는다. 객체의 바이트 표현을 읽을 때는 `unsigned char *` 같은 문자 타입의 포인터를 사용한다.

## 멤버의 위치에서 구조체 찾기

PintOS의 Intrusive List는 바깥 객체에 `struct list_elem`을 넣고 그 멤버들끼리 연결한다. 순회로 얻은 `list_elem *`에서 원래 `struct thread *`를 찾으려면 어떤 멤버를 통해 연결됐는지 알아야 한다.

`offsetof(타입, 멤버)`는 구조체 시작부터 해당 멤버까지의 바이트 거리를 구한다. 다음 코드는 작은 구조체에서 `elem.next`의 위치를 확인한다. 실제 PintOS의 필드 배치나 크기를 측정하는 예제는 아니다.

```run-c
#include <assert.h>
#include <stddef.h>
#include <stdio.h>

struct link {
    struct link *prev;
    struct link *next;
};

struct task {
    int id;
    struct link elem;
};

int main(void) {
    struct task task = {.id = 7, .elem = {NULL, NULL}};
    size_t offset = offsetof(struct task, elem.next);
    unsigned char *start = (unsigned char *)&task;
    unsigned char *member = (unsigned char *)&task.elem.next;

    printf("elem.next offset: %zu bytes\n", offset);
    printf("시작 주소 + offset == 멤버 주소: %d\n", start + offset == member);
    assert(start + offset == member);
    return 0;
}
```

`offsetof`는 컴파일러가 정한 padding까지 반영한다. 멤버의 크기를 단순히 더하거나 `magic`처럼 다른 멤버의 offset을 사용하면 원하는 위치를 얻지 못한다.

`lrn-pintos`의 `5afaa6d` 버전은 다음 매크로를 사용한다. 이 코드는 PintOS의 리스트 구현을 읽기 위한 발췌다.

```c
#define list_entry(LIST_ELEM, STRUCT, MEMBER)           \
    ((STRUCT *) ((uint8_t *) &(LIST_ELEM)->next         \
        - offsetof(STRUCT, MEMBER.next)))
```

`LIST_ELEM`이 `thread.elem`을 가리킨다면, `&(LIST_ELEM)->next`는 `thread.elem.next`의 주소다. 여기서 `offsetof(struct thread, elem.next)`를 바이트 단위로 빼 바깥 구조체의 시작 주소를 복원하고 `struct thread *`로 해석한다. `donation_elem`으로 연결한 목록이라면 그 멤버 이름을 넘겨야 한다. 서로 다른 멤버의 offset을 섞으면 다른 주소를 계산하게 된다. [해당 버전의 list_entry](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/lib/kernel/list.h#L99)

같은 버전의 `stddef.h`에는 `((size_t) &((TYPE *) 0)->MEMBER)` 형태의 `offsetof` 정의가 있다. 이를 일반 C 코드에 복사해 NULL 포인터를 통한 멤버 접근도 안전하다고 결론내려서는 안 된다. 독립 C 프로그램에서는 표준 `<stddef.h>`의 `offsetof`를 사용하고, PintOS의 매크로와 주소 복원 방식은 그 빌드 환경의 계약으로 읽는다. [PintOS의 stddef.h](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/lib/stddef.h), [표준 offsetof의 의미: C11 초안 §7.19](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf)

인자 배열의 `char **argv`는 이중 포인터가 쓰이는 다른 예다. 포인터 배열의 한 칸에서 문자열 주소를 읽고 다시 그 문자를 따라간다. 이 관계와 PintOS가 문자열 주소를 사용자 Stack으로 옮기는 과정은 [Array](/wiki/programming-languages-runtime-topic-2ac2dfca2dd1/)와 [인자 전달](/wiki/computer-systems-network-topic-1217820258bd/)에서 이어진다.

## GDB에서 포인터가 놓인 자리와 대상을 구분한다

메모리에서 읽은 값이 주소처럼 보인다고 해서 바로 역참조할 수 있는 것은 아니다. x86-64 PintOS에서 Byte `00 d0 00 04 80 00 00 00`을 Little-endian으로 읽으면 `0x800400d000`이 된다. 이 숫자가 `struct thread *` 필드에 저장된 값인지, 단순한 정수인지는 선언과 사용 위치를 함께 봐야 한다. C의 임의 정수를 cast한다고 살아 있는 객체가 새로 생기지는 않는다.

GDB의 주소 표시 형식 `a`는 16진수 주소와, 찾을 수 있다면 앞선 Symbol로부터의 거리를 보여 준다. `x/1gx`는 8 Byte를 16진수로, `x/1ga`는 8 Byte를 주소 형식으로 표시한다. 표시를 바꾸는 것과 그 주소에서 객체를 읽는 것은 별개다. Symbol 이름이 붙었다는 사실도 객체의 수명을 보장하지 않는다. [GDB 표시 형식](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Output-Formats.html)

포인터 배열에서는 주소가 한 단계 더 생긴다. `fd_table`은 배열의 시작을 가리키고, `&fd_table[3]`은 인덱스 3의 **슬롯이 놓인 주소**다. `fd_table[3]`은 그 슬롯에 **저장된 파일 객체의 주소**다. 아래 모델은 둘을 숫자로 나누어 출력한다. 8 Byte 포인터와 4 KiB Table을 명시해 만들었으며, Python 프로세스나 실행 중인 PintOS 메모리를 읽는 코드는 아니다.

```run-python
POINTER_BYTES = 8
PAGE_BYTES = 4096
TABLE_BASE = 0x800400F000
FILE_ADDRESS = 0x800400A200
KERN_BASE = 0x8004000000

# 주소는 예제의 숫자다. Python 프로세스의 실제 메모리를 가리키지 않는다.
table = bytearray(PAGE_BYTES)
files = {FILE_ADDRESS: {"name": "sample.txt", "inode": 0x800400B000}}
table[3 * POINTER_BYTES:4 * POINTER_BYTES] = FILE_ADDRESS.to_bytes(POINTER_BYTES, "little")


def read_slot(fd):
    if not 0 <= fd < PAGE_BYTES // POINTER_BYTES:
        raise IndexError("fd가 Table 범위를 벗어난다")
    offset = fd * POINTER_BYTES
    value = int.from_bytes(table[offset:offset + POINTER_BYTES], "little")
    return TABLE_BASE + offset, value


def canonical48(address):
    if not 0 <= address < 1 << 64:
        return False
    return address >> 48 == (0xFFFF if address & (1 << 47) else 0)


print("Table 슬롯 수:", PAGE_BYTES // POINTER_BYTES)
for fd in (3, 100, 511):
    slot, value = read_slot(fd)
    print(f"fd={fd}: 슬롯 주소={slot:#x}, 저장된 주소={value:#x}")
    if value == 0:
        print("  파일 객체를 따라가지 않는다: 비어 있는 슬롯")
    else:
        file = files.get(value)
        print(f"  파일={file['name']}, inode 주소={file['inode']:#x}")

slot, value = read_slot(3)
assert slot == TABLE_BASE + 24 and value == FILE_ADDRESS
assert slot != value
table[24:32] = bytes(POINTER_BYTES)
assert read_slot(3) == (slot, 0)
assert FILE_ADDRESS in files  # 슬롯을 비우는 것과 객체를 없애는 것은 별개다.
print("슬롯을 비운 뒤: 저장된 주소=0, 예제 파일 객체는 남아 있다")

for address in (0, KERN_BASE, 0x0000800000000000, 0xFFFF800000000000):
    print(f"{address:#018x}: canonical48={canonical48(address)}")
assert canonical48(KERN_BASE) and KERN_BASE >> 47 == 0
assert not canonical48(1 << 64) and not canonical48(-1)
for fd in (-1, 512):
    try:
        read_slot(fd)
    except IndexError:
        pass
    else:
        raise AssertionError("Table 범위 검사가 실패했다")
print("확인: 슬롯 경계·주소의 구분·48 Bit 형식 검사 통과")
```

Python 3.9.6에서 실행한 결과다.

```text
Table 슬롯 수: 512
fd=3: 슬롯 주소=0x800400f018, 저장된 주소=0x800400a200
  파일=sample.txt, inode 주소=0x800400b000
fd=100: 슬롯 주소=0x800400f320, 저장된 주소=0x0
  파일 객체를 따라가지 않는다: 비어 있는 슬롯
fd=511: 슬롯 주소=0x800400fff8, 저장된 주소=0x0
  파일 객체를 따라가지 않는다: 비어 있는 슬롯
슬롯을 비운 뒤: 저장된 주소=0, 예제 파일 객체는 남아 있다
0x0000000000000000: canonical48=True
0x0000008004000000: canonical48=True
0x0000800000000000: canonical48=False
0xffff800000000000: canonical48=True
확인: 슬롯 경계·주소의 구분·48 Bit 형식 검사 통과
```

fd 3의 슬롯은 `Table 시작 + 3 × 8`, 즉 `0x800400f018`에 놓인다. 그곳에 저장한 값은 `0x800400a200`이고, 예제의 `files`는 이 값을 파일 객체와 연결한다. fd 100에서는 800 Byte, 마지막 슬롯인 fd 511에서는 4088 Byte 이동한다. 포인터 배열의 인덱스 5로 이동하는 식도 `base + 5 × sizeof(원소)`로 읽으면 된다. 다만 계산된 주소가 배열 안에 있는지 먼저 확인해야 한다.

슬롯을 0으로 바꾸는 것과 객체를 해제하는 것도 구분한다. 이 모델은 Table만 비워서 `files`의 객체는 남는다. 실제 PintOS의 `close()`는 파일 참조를 정리하고 슬롯을 비우는 별도 경로를 수행한다. `fd_table[fd] == NULL`은 해당 슬롯이 비어 있다는 뜻이며, 그 번호가 과거에 열렸다가 닫혔는지는 값 하나로 알 수 없다. 할당·재사용·복제 과정은 [File Descriptor](/wiki/pintos-file-descriptors/)에서 이어진다.

### 선언을 따라 구조체를 찾는다

실제 대상에서는 `struct thread`의 Offset을 임의로 더하기보다 타입과 멤버를 이용해 한 단계씩 확인한다. 다음 명령은 유효한 `struct thread *`를 GDB Convenience Variable `$t`에 넣었고, 해당 커널의 Debug Symbol을 읽었다는 전제다. 여기서는 이 GDB Session을 실행하지 않았으며 주소나 객체 출력을 관찰값으로 제시하지 않는다.

```gdb
ptype /o struct thread
p/x $t->fd_table
p/x &$t->fd_table[3]
p/x $t->fd_table[3]
```

마지막에 얻은 파일 포인터가 유효한지 확인한 뒤에만 `p *$t->fd_table[3]`처럼 대상을 읽는다. `thread_current()`를 GDB에서 호출하면 대상 함수 실행이 필요할 수 있으므로, 정지한 상태에서 이미 확인한 포인터를 사용하는 편이 호출의 영향을 구분하기 쉽다.

`lrn-pintos`의 `9d1b14c` 버전에는 다음 관계가 선언되어 있다. 이는 필드의 의미를 읽는 표이며 Offset 측정 결과가 아니다.

| 필드 | 선언과 가리키는 대상 |
| --- | --- |
| `thread.pml4` | `uint64_t *`; Page Table을 읽기 위한 Kernel VA다. |
| `thread.fd_table` | `struct file **`; 파일 포인터 배열을 가리킨다. |
| `page.frame` | `struct frame *`; Frame 관리 객체를 가리킨다. |
| `frame.kva` | `void *`; Frame 메모리에 접근할 Kernel VA다. |
| `frame.page` | `struct page *`; 연결된 페이지 관리 객체를 가리킨다. |
| `intr_frame.rip`, `intr_frame.rsp` | `uintptr_t`; 저장된 명령어 주소와 Stack 주소를 담는다. |

필드 선언은 [thread.h](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/include/threads/thread.h), [vm.h](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/include/vm/vm.h), [interrupt.h](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/include/threads/interrupt.h)에 있다. 이 버전의 `struct thread`에는 `parent` 포인터가 없다. 다른 구현의 부모 참조 필드를 가져와 같은 Offset에 있다고 가정해서는 안 된다.

Linked List의 `ready_list.head.next`를 따라갈 때도 같은 기준을 적용한다. 여기서 얻는 것은 `struct list_elem *`이므로, 앞서 살펴본 `list_entry`로 바깥 `struct thread`를 복원해야 한다. 빈 리스트의 Sentinel인지, 어떤 멤버로 연결한 리스트인지 먼저 확인하고 해당 멤버의 Offset을 사용한다. `magic` 불일치는 손상 신호지만 그것만으로 이미 해제된 객체라고 확정할 수는 없다. 다른 잘못된 쓰기도 같은 증상을 만들 수 있다.

## 주소 형식과 접근 가능성은 다르다

예제의 `canonical48()`은 4단계 Paging에서 사용하는 48 Bit canonical 형식만 검사한다. 이 형식에서는 Bit 63~48이 Bit 47의 부호 확장이어야 한다. 낮은 범위는 `0x0000000000000000`~`0x00007fffffffffff`, 높은 범위는 `0xffff800000000000`~`0xffffffffffffffff`다. 중간의 값은 이 모드에서 canonical 주소가 아니다.

이 두 범위에 곧바로 User·Kernel이라는 이름을 붙여서는 안 된다. PintOS의 `KERN_BASE`는 `0x8004000000`으로, Bit 47이 0인 낮은 canonical 범위 안에 있다. `is_kernel_vaddr()`는 이 기준값 이상의 숫자인지 비교한다. 따라서 예제에서 KERN_BASE가 canonical이라고 나온 것은 주소의 형식 검사 결과이며, 특정 프로세스가 읽을 수 있다는 뜻이 아니다. 5단계 Paging의 주소 규칙에도 이 48 Bit 함수를 그대로 적용하지 않는다. [PintOS의 주소 구분과 변환](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/include/threads/vaddr.h), [KERN_BASE 정의](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/include/threads/loader.h)

주소가 형식을 만족해도 Mapping·접근 권한·대상 타입의 정렬·객체의 수명이 맞아야 한다. 0 역시 예제에서는 canonical이지만 NULL 포인터를 역참조해도 된다는 뜻은 아니다. 정렬도 포인터 값이 저장된 변수의 정렬과 그 값이 가리키는 대상의 정렬을 구별한다. `char *`가 8 Byte 크기라고 해서 문자 주소가 항상 8의 배수일 필요는 없다.

Page Table을 따라갈 때는 엔트리에서 읽은 주소가 **물리 주소**라는 점이 추가된다. 예를 들어 다음 테이블의 PA가 `0x502000`이라면 PintOS의 직접 매핑에서 이를 읽는 Kernel VA는 `ptov(0x502000)`, 즉 `KERN_BASE + 0x502000`이다. PA 숫자를 그대로 Kernel 포인터로 역참조하면 같은 메모리를 읽는다고 보장할 수 없다. 엔트리 자체의 위치와 엔트리에 저장된 다음 테이블 주소도 구분해야 한다. 주소·Flag 분리와 페이지별 권한은 [Paging](/wiki/computer-systems-network-topic-dbd836d1a044/)에서 다룬다.

## Guest 주소를 Host 포인터로 사용하지 않는다

PintOS의 포인터는 Guest 주소 공간의 값이다. QEMU 내부에 저장한 Guest CR3 값 역시 Guest의 물리 주소와 제어 정보를 나타내며, QEMU 프로세스가 곧바로 역참조할 Host 포인터가 아니다.

QEMU의 Memory API는 RAM뿐 아니라 MMIO와 Alias 등을 MemoryRegion으로 구성하고, CPU나 장치가 보는 AddressSpace에서 주소를 해석한다. 따라서 Guest PA 전체를 하나의 `RAMBlock 시작 + PA` 식으로 Host VA에 대응시킬 수는 없다. 먼저 어느 Region에 속하는 접근인지 확인해야 한다. [QEMU Memory API](https://www.qemu.org/docs/master/devel/memory.html)

Linux 커널을 디버깅할 때도 현재 실행 중인 커널과 맞는 Symbol·배치를 사용해야 한다. PintOS의 부모 참조나 파일 Table이 Linux의 필드와 일대일로 같은 위치에 놓이는 것은 아니다. 같은 Byte를 숫자로 읽는 단계는 [데이터 표현](/wiki/computer-systems-network-topic-e647548deca2/)에, 그 주소가 속한 Mapping과 객체의 수명은 [주소 공간](/wiki/computer-systems-network-topic-3521ee6344f1/)에 연결된다.
