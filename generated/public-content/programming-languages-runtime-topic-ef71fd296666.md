---
layout: default
title: Pointer
nav_order: 2
permalink: /wiki/programming-languages-runtime-topic-ef71fd296666/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/programming-languages-runtime-topic-ef71fd296666
projection_sha256: 74ccb21120e88dbfbf010d5dba4cd27aadf4ec49f5381bc30cf84c9fe5b537f3
parent: C
content_status: ready
public_parent_id: Wiki/programming-languages-runtime/c
search_terms:
- 포인터
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
