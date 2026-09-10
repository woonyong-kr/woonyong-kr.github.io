---
layout: default
title: Singly Linked List
nav_order: 3
permalink: /wiki/computer-science-topic-e00dfaa7306e/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-e00dfaa7306e
projection_sha256: 6be88decd6c7c20694299fb9e9b297a2afe3db7d24171a2c0b154d524b091be9
parent: Linked List
content_status: ready
public_parent_id: Wiki/keywords/computer-science-topic-2f43235867e4
search_terms:
- Singly Linked List
- 단일 연결 리스트
- next
- node_at
- 정렬된 연결 리스트 삽입
- 정렬된 연결 리스트 삽입 — 포인터를 끊지 않고 자리를 찾는 법
- insert_sorted
- prev
- cur
- malloc
- 할당 실패
- 중복 값
grand_parent: 자료구조
ancestor: CS 기초
---

# Singly Linked List
{: .no_toc }

`10 → 20 → 30`에서 `30`을 읽으려면 `10`의 `next`, `20`의 `next`를 차례로 따라간다. Singly Linked List의 노드에는 다음 노드로 가는 연결이 있고, 마지막 노드의 `next`는 NULL이다.

## next를 몇 번 따라가는가

다음 예제의 `node_at()`은 0부터 세는 인덱스를 받아 노드와 이동 횟수를 구한다. 노드들은 지역 변수로 만들었으므로 동적 메모리 할당은 필요하지 않다. 주소가 연속한지와 무관하게 `next`를 따라 순회한다.

```run-c
#include <assert.h>
#include <stddef.h>
#include <stdio.h>

struct node {
    int data;
    struct node *next;
};

static struct node *node_at(struct node *head, size_t index, size_t *steps) {
    *steps = 0;
    while (head != NULL && *steps < index) {
        head = head->next;
        ++*steps;
    }
    return head;
}

int main(void) {
    struct node third = {30, NULL};
    struct node second = {20, &third};
    struct node first = {10, &second};
    size_t steps = 0;
    struct node *found = node_at(&first, 2, &steps);
    assert(found == &third && steps == 2);
    printf("인덱스 2: %d, 이동: %zu\n", found->data, steps);

    struct node added = {15, first.next};
    first.next = &added;
    for (struct node *p = &first; p != NULL; p = p->next) {
        printf("%d%s", p->data, p->next == NULL ? "\n" : " -> ");
    }
    struct node *removed = first.next;
    first.next = removed->next;
    removed->next = NULL;
    assert(first.next == &second);
    printf("삭제 후 첫 노드의 다음 값: %d\n", first.next->data);

    found = node_at(&first, 3, &steps);
    printf("범위 밖: %s, 이동: %zu\n", found == NULL ? "없음" : "있음", steps);
    assert(found == NULL && steps == 3);
    found = node_at(NULL, 0, &steps);
    assert(found == NULL && steps == 0);
    return 0;
}
```

인덱스 2에 도달할 때 연결을 두 번 따라간다. 원소 수 n에 대해 뒤쪽 인덱스에 접근하는 최악 비용은 O(n)이다. 인덱스가 0이면 처음 노드를 바로 반환하고, 범위를 벗어나면 NULL에서 멈춘다. 실제 실행 시간이 아니라 **연결을 따라간 횟수**를 센 예제다.

## 끼워 넣을 앞 노드를 알고 있다면

예제에서는 `first` 뒤에 `added`를 삽입한다. 먼저 `added.next`가 기존 두 번째 노드를 가리키게 하고, `first.next`를 새 노드로 바꾼다. 나머지 노드는 옮기지 않는다. 이 두 대입이 O(1)이라는 사실과 `first`를 찾는 비용은 별개다.

삭제할 때도 앞 노드의 `next`가 삭제할 노드의 다음을 가리키게 한다. `removed.next = NULL`은 분리된 노드에 오래된 연결을 남기지 않기 위한 처리다. 노드를 `malloc()`으로 만들었다면 연결에서 뺀 뒤 더는 참조하지 않는 시점에 메모리를 해제하는 책임도 있다. 여기서는 지역 변수이므로 `free()`를 호출하지 않는다.

끝 삽입도 마지막 노드를 별도로 보관하면 연결 변경은 O(1)이다. `head`만 보관한다면 마지막 노드를 찾는 순회가 필요하다. 삭제할 노드의 주소만으로 앞뒤를 바로 연결하고 싶다면 [Doubly Linked List](/wiki/computer-science-topic-2d043afd0f9f/)에서 `prev`가 추가하는 역할을 볼 수 있다.

## 정렬을 유지하면서 6을 넣기

이번에는 이미 오름차순인 `1 → 4 → 7 → 10`에 `6`을 넣어 보자. 앞 예제와 달리 끼워 넣을 앞 노드를 미리 알지 못한다. `head`에서 출발해 `4`와 `7` 사이를 찾고, 새 노드만 연결하면 `1 → 4 → 6 → 7 → 10`이 된다. Array처럼 뒤 원소들을 한 칸씩 옮길 필요는 없다.

아래 삽입 함수는 **이미 오름차순으로 정렬된, 순환 없는 리스트**를 입력으로 받는다. 같은 값은 허용한다. 정렬되지 않은 리스트를 정렬하거나 손상된 연결을 복구하는 함수는 아니다.

### prev와 cur가 삽입할 틈을 기억한다

`cur`는 아직 확인할 노드이고, `prev`는 그 바로 앞 노드다. 처음에는 `prev = NULL`, `cur = *head`로 둔다. `cur`가 있고 그 값이 새 값보다 작은 동안 두 포인터를 함께 전진시킨다. `6`을 넣는 탐색에서는 다음 상태를 거친다.

| 상태 | prev | cur | 다음 판단 |
| --- | --- | --- | --- |
| 시작 | NULL | 값 1의 노드 | 1 < 6이므로 전진 |
| 한 번 전진 | 값 1의 노드 | 값 4의 노드 | 4 < 6이므로 전진 |
| 두 번 전진 | 값 4의 노드 | 값 7의 노드 | 7 < 6이 아니므로 정지 |

이 과정에서 지나온 노드들의 값은 모두 `value`보다 작다. `prev`가 있으면 항상 `prev->next == cur`이며, `prev`가 없으면 `cur`는 아직 첫 노드다. 이처럼 반복 전후에 유지되는 조건을 **불변식**이라고 한다. 위치를 찾는 동안 리스트의 링크는 바꾸지 않는다.

탐색이 멈추면 `cur`는 **값이 `value`보다 크거나 같은 첫 노드, 또는 NULL**이다. 첫 경우에는 그 앞에 삽입하고, NULL이면 맨 뒤에 삽입한다. `prev == NULL`은 앞 노드가 없다는 뜻이다. 빈 리스트일 때뿐 아니라 새 값이 기존 첫 값보다 작거나 같을 때도 이 분기로 들어간다.

### 다음 연결을 준비한 뒤 리스트에 붙인다

`prev`가 4, `cur`가 7을 가리킨다면 먼저 `new_node->next = cur`로 새 노드의 뒤를 연결한다. 그다음 `prev->next = new_node`로 기존 리스트에서 새 노드로 들어오는 연결을 바꾼다. 7 이후의 노드들은 그대로 남는다.

맨 앞에는 `prev`가 없으므로 `*head = new_node`로 시작점을 바꾼다. 빈 리스트라면 `cur`도 NULL이어서 새 노드의 `next`가 NULL이 된다. 맨 뒤라면 `prev`는 기존 마지막 노드, `cur`는 NULL이다. 이 두 경우에도 새 노드의 다음을 먼저 준비하는 순서는 같다.

`main`의 `head`는 첫 노드를 가리키는 변수다. 아래 함수에는 `&head`, 즉 그 변수의 주소를 넘긴다. 그래서 함수의 `struct Node **head` 매개변수에서 `*head`를 바꾸면 호출한 쪽의 시작점도 바뀐다. 노드의 주소와 그 주소를 보관하는 변수의 주소는 [Pointer](/wiki/programming-languages-runtime-topic-ef71fd296666/)에서 구분해 볼 수 있다. 더미 헤드처럼 실제 값 앞에 고정 노드를 두면 맨 앞 연결도 기존 노드의 `next` 변경으로 다룰 수 있지만, 여기서는 맨 앞 분기를 직접 남긴다.

### 삽입 성공과 할당 실패를 실행한다

이 예제의 `insert_sorted()`는 성공하면 `true`, 새 노드를 할당하지 못하면 `false`를 반환한다. `head` 인자에는 유효한 포인터 변수의 주소를 넘겨야 하며, 그 변수의 값이 NULL인 빈 리스트는 허용한다.

`allocate` 인자는 할당 실패를 일정하게 재현하기 위한 예제 장치다. 평소에는 `malloc`을 넘기고, 실패 확인에는 아무것도 할당하지 않고 NULL을 반환하는 `fail_allocate`를 넘긴다. 정렬 삽입에 이런 매개변수가 반드시 필요한 것은 아니다.

다음 전체 프로그램은 앞의 지역 변수 노드 예제와 별도로 실행한다. 각 삽입 뒤 값과 노드 수를 검사하고, 중복 값에서는 새 노드가 기존 같은 값 노드 앞에 있는지도 주소로 확인한다. 실패 검사에서는 기존 노드의 주소 순서를 저장해 모든 연결이 그대로인지 대조한다.

```run-c
#include <assert.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node *next;
};

static bool insert_sorted(struct Node **head, int value,
                          void *(*allocate)(size_t)) {
    struct Node *new_node = allocate(sizeof *new_node);
    if (new_node == NULL) {
        return false;
    }
    new_node->data = value;

    struct Node *prev = NULL;
    struct Node *cur = *head;
    while (cur != NULL && cur->data < value) {
        prev = cur;
        cur = cur->next;
    }

    new_node->next = cur;
    if (prev == NULL) {
        *head = new_node;
    } else {
        prev->next = new_node;
    }
    return true;
}

static void *fail_allocate(size_t size) {
    (void)size;
    return NULL;
}

static void clear(struct Node **head) {
    while (*head != NULL) {
        struct Node *removed = *head;
        *head = removed->next;
        free(removed);
    }
}

static void add(struct Node **head, int value) {
    if (!insert_sorted(head, value, malloc)) {
        fputs("allocation failed\n", stderr);
        clear(head);
        exit(EXIT_FAILURE);
    }
}

static void check_and_print(const char *label, const struct Node *head,
                            const int *expected, size_t count) {
    printf("%s: ", label);
    for (size_t i = 0; i < count; ++i) {
        assert(head != NULL && head->data == expected[i]);
        printf("%d%s", head->data, i + 1 == count ? "\n" : " -> ");
        head = head->next;
    }
    assert(head == NULL);
}

int main(void) {
    struct Node *head = NULL;
    add(&head, 1);
    check_and_print("empty + 1", head, (int[]){1}, 1);

    const int rest[] = {4, 7, 10};
    for (size_t i = 0; i < sizeof rest / sizeof rest[0]; ++i) {
        add(&head, rest[i]);
    }
    struct Node *old_four = head->next;
    check_and_print("start", head, (int[]){1, 4, 7, 10}, 4);

    add(&head, 6);
    check_and_print("middle + 6", head, (int[]){1, 4, 6, 7, 10}, 5);
    add(&head, 0);
    check_and_print("front + 0", head, (int[]){0, 1, 4, 6, 7, 10}, 6);
    add(&head, 12);
    check_and_print("tail + 12", head, (int[]){0, 1, 4, 6, 7, 10, 12}, 7);
    add(&head, 4);
    check_and_print("duplicate + 4", head, (int[]){0, 1, 4, 4, 6, 7, 10, 12}, 8);
    struct Node *new_four = head->next->next;
    assert(new_four != old_four && new_four->next == old_four);
    puts("duplicate order: new 4 before old 4");

    struct Node *saved[8];
    struct Node *cur = head;
    for (size_t i = 0; i < 8; ++i) {
        assert(cur != NULL);
        saved[i] = cur;
        cur = cur->next;
    }
    assert(cur == NULL);
    bool inserted = insert_sorted(&head, 5, fail_allocate);
    assert(!inserted);
    cur = head;
    for (size_t i = 0; i < 8; ++i) {
        assert(cur == saved[i]);
        cur = cur->next;
    }
    assert(cur == NULL);
    check_and_print("failed + 5", head, (int[]){0, 1, 4, 4, 6, 7, 10, 12}, 8);
    puts("allocation failure: same nodes and links");

    struct Node *empty = NULL;
    inserted = insert_sorted(&empty, 9, fail_allocate);
    assert(!inserted && empty == NULL);
    puts("empty allocation failure: still empty");

    clear(&head);
    assert(head == NULL);
    add(&empty, 9);
    struct Node *old_nine = empty;
    add(&empty, 9);
    check_and_print("equal minimum + 9", empty, (int[]){9, 9}, 2);
    assert(empty != old_nine && empty->next == old_nine);
    clear(&empty);
    assert(empty == NULL);
    puts("clear: both lists empty");
    return 0;
}
```

프로그램을 실행해 확인한 결과다. 삽입 위치별 연결과 할당 실패 뒤 남은 상태를 함께 볼 수 있다.

```text
empty + 1: 1
start: 1 -> 4 -> 7 -> 10
middle + 6: 1 -> 4 -> 6 -> 7 -> 10
front + 0: 0 -> 1 -> 4 -> 6 -> 7 -> 10
tail + 12: 0 -> 1 -> 4 -> 6 -> 7 -> 10 -> 12
duplicate + 4: 0 -> 1 -> 4 -> 4 -> 6 -> 7 -> 10 -> 12
duplicate order: new 4 before old 4
failed + 5: 0 -> 1 -> 4 -> 4 -> 6 -> 7 -> 10 -> 12
allocation failure: same nodes and links
empty allocation failure: still empty
equal minimum + 9: 9 -> 9
clear: both lists empty
```

`middle + 6`은 표에서 찾은 4와 7 사이의 삽입을 보여 준다. `front + 0`에서는 시작점이 바뀌고, `tail + 12`에서는 마지막 노드 뒤에 새 노드가 붙는다. `equal minimum + 9`는 값이 같은 첫 노드 앞에도 삽입할 수 있음을 확인한다.

### 같은 값은 어느 쪽에 놓을까

탐색 조건이 `cur->data < value`이므로 같은 값을 만나면 즉시 멈춘다. 따라서 새 `4`는 기존 `4` **앞**에 들어간다. 출력의 숫자 두 개만 보면 어느 노드가 먼저인지 알 수 없으므로, 코드에서는 `new_four->next == old_four`도 검사한다. 중복된 값을 제거하거나 덮어쓰지는 않는다.

같은 값들을 모두 지나가게 조건을 `<=`로 바꾸면 새 노드는 기존 같은 값들 뒤에 놓인다. 값 외에 입력 순서 같은 정보도 보관하는 노드라면 이 선택이 같은 값 사이의 순서를 바꾼다. 이번 실행으로 확인한 구현은 `<` 정책이다.

[연결 리스트 Q1. 정렬 연결 리스트에 값 삽입하기](https://cedis.tistory.com/161)는 같은 비교 조건으로 삽입 위치의 인덱스를 세고, 그 인덱스를 `insertNode`에 넘기는 방식을 보여 준다. 여기의 `prev`·`cur`로 직접 연결하는 구현과 비교하면, 위치를 찾는 일과 링크를 바꾸는 일을 어느 함수가 맡는지 구분할 수 있다.

### 할당에 실패해도 원래 연결은 남긴다

`malloc()`은 새 공간의 주소 대신 NULL을 반환할 수 있다. 그래서 `new_node->data`에 쓰기 전에 결과를 확인해야 한다. 이 함수는 할당 실패 시 어떤 기존 링크도 바꾸기 전에 `false`를 반환한다. [C11 위원회 초안 N1570, 7.22.3.4](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf#page=367)

출력의 `allocation failure: same nodes and links`는 단순히 첫 노드의 주소만 같다는 뜻이 아니다. 기존 8개 노드를 같은 주소 순서로 다시 만나고, 값과 마지막 NULL도 그대로임을 검사한 결과다. 빈 리스트에서 실패했을 때도 시작점은 NULL로 남는다. 실제 메모리를 소진시킨 실험이 아니라, NULL을 반환하는 할당 함수를 넣어 실패 분기를 확인한 것이다.

새 노드를 정상적으로 연결한 뒤에는 리스트를 관리하는 쪽이 그 메모리를 해제해야 한다. 여기서는 `clear()`가 다음 노드의 주소를 시작점에 보관한 뒤 현재 노드를 `free()`하고, 끝나면 시작점을 NULL로 만든다. `malloc`으로 만든 이번 노드들과 앞 예제의 지역 변수 노드들을 같은 방식으로 해제하면 안 된다.

### 위치를 찾는 비용과 연결을 바꾸는 비용

노드 할당 비용을 별도로 두면 맨 앞 삽입의 탐색·연결 변경은 O(1)이다. 맨 뒤에 들어가려면 n개의 기존 노드를 모두 지나갈 수 있으므로 최악의 탐색 비용은 O(n)이다. `prev`와 `cur`를 찾은 뒤 바꾸는 링크 수는 일정하므로 연결 변경 자체는 O(1)이다. 시간 측정을 한 결과가 아니라 비교와 포인터 이동 횟수에 따른 [시간 복잡도](/wiki/computer-science-topic-869aa2bd6535/) 분석이다.

탐색 중에는 `prev`, `cur`, `new_node`만 보관하므로 보조 공간은 O(1)이고, 성공할 때마다 리스트가 소유하는 노드 하나의 공간이 추가된다. 마지막 노드 주소를 알고 있어도 임의의 새 값이 들어갈 정렬 위치까지 알 수 있는 것은 아니다. [자료구조](/wiki/data-structures/)를 비교할 때는 노드가 여러 하위 연결을 가질 수 있는 [Tree](/wiki/computer-science-topic-a06ebc760118/)와, 각 노드의 하나뿐인 `next`를 따라 위치를 찾는 이 리스트의 탐색 경로를 구분한다.
