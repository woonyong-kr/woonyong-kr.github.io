---
layout: default
title: Singly Linked List
nav_order: 3
permalink: /wiki/computer-science-topic-e00dfaa7306e/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-e00dfaa7306e
projection_sha256: 04d7ca2ce3d0cfffd8f1820b85f5d90815809d6b5df8ae1c8476387adb27427a
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
- 연결 리스트 최댓값 노드를 맨 앞으로 옮기기
- 연결 리스트 최댓값 노드를 맨 앞으로 옮기기 — 앞 노드를 기억하며 재배선하는 법
- move_max_to_front
- max_node
- max_prev
- 노드 이동
- 값 교환
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

## 최댓값 노드를 맨 앞으로 옮기기

`3 → 8 → 2 → 7`에서 값 8을 가진 **그 노드**를 맨 앞으로 옮기면 `8 → 3 → 2 → 7`이 된다. 새 노드를 삽입하는 것이 아니라, 기존 노드를 원래 연결에서 빼내 다시 붙이는 작업이다. 옮기지 않은 3·2·7의 상대적인 순서와 각 노드의 값은 그대로 둔다.

이번 함수는 정렬되지 않은 리스트도 받는다. 아래 예제의 `Node.value`는 정수이며 `next`를 따라 None에서 끝나는 연결을 순회한다. 순환이 있으면 이 탐색은 끝에 도달하지 않으므로, 입력에 순환이 없다는 범위에서 사용한다. 리스트 전체를 정렬하는 연산은 아니다.

### 최댓값과 그 앞 노드를 함께 기억한다

`cur`는 이번에 비교할 노드이고 `prev`는 그 앞 노드다. 여기에 지금까지의 최댓값을 가진 `max_node`와 그 직전 노드 `max_prev`를 따로 보관한다. 현재 위치를 전진시키는 것과 최댓값 후보를 갱신하는 것은 서로 다른 일이다.

처음에는 `max_node = head`, `max_prev = None`으로 둔다. 이미 첫 노드의 값을 알고 있으므로 `prev = head`, `cur = head.next`에서 나머지를 비교한다. 각 `cur`의 값을 비교한 직후의 후보는 다음과 같다.

| 비교한 cur의 값 | 비교할 때 prev의 값 | 비교 후 max_node의 값 | max_prev의 값 |
| --- | --- | --- | --- |
| 8 | 3 | 8 | 3 |
| 2 | 8 | 8 | 3 |
| 7 | 2 | 8 | 3 |

2와 7을 읽는 동안 `prev`는 바뀌지만 `max_prev`는 3에 남아 있다. 최댓값 노드를 원래 자리에서 빼낼 때 필요한 것은 탐색의 마지막 노드가 아니라 **최댓값 바로 앞의 노드**이기 때문이다.

순회 중에는 링크를 바꾸지 않는다. 더 큰 값을 발견하면 `max_node = cur`, `max_prev = prev`를 함께 갱신한다. 따라서 `max_prev`가 있으면 그 `next`가 `max_node`를 가리킨다는 관계도 유지된다. 최댓값 노드만 기억했다면 head에서 앞 노드를 다시 찾을 수는 있지만, 함께 기억하면 그 추가 순회가 필요 없다.

### 뒤쪽 연결을 사용한 뒤 새 머리에 붙인다

최댓값이 8이면 먼저 `max_prev.next = max_node.next`로 3의 다음을 2로 바꾼다. 원래 `head`에서 따라가는 경로는 이제 `3 → 2 → 7`이다. 8은 이 경로에서 빠졌지만 `max_node`가 여전히 그 노드를 보관한다.

그다음 `max_node.next = head`로 8을 기존 첫 노드 3 앞에 붙인다. `max_node.next`가 원래 가리키던 뒤쪽 연결을 분리에 사용하고 나서 새 값을 대입하는 순서다. 마지막 노드가 최댓값인 경우에는 원래 `max_node.next`가 None이므로 앞 노드를 새 마지막 노드로 만들 수 있다.

함수는 새 머리인 `max_node`를 반환한다. 호출한 쪽에서는 **`head = move_max_to_front(head)`**로 받아야 한다. 함수 안의 `return`이 호출자의 변수까지 자동으로 바꾸지는 않는다. 원래 head를 다른 변수에 보관했다면 그 변수는 여전히 옛 첫 노드를 가리키므로, 이동한 노드 뒤에서부터 리스트를 읽게 된다. 참조를 보관하는 변수와 노드의 연결은 [Pointer](/wiki/programming-languages-runtime-topic-ef71fd296666/)에서 구분해 볼 수 있다.

빈 리스트와 단일 노드는 그대로 반환한다. 두 개 이상을 탐색한 뒤 `max_prev is None`이면 선택된 최댓값이 이미 첫 노드이므로 연결을 바꾸지 않는다. 실제로 옮기는 경우에는 두 노드의 `next`가 바뀌고, 호출자가 새 head를 보관한다.

### 같은 최댓값이 여러 개라면

비교 조건은 `cur.value > max_node.value`다. 같은 값을 만나서는 후보를 갱신하지 않으므로 **처음 만난 최댓값 노드**를 옮긴다. `3 → 8 → 2 → 8 → 7`에서는 두 번째 자리에 있던 8이 앞으로 가고, 나중의 8은 나머지 노드 사이의 원래 순서를 유지한다.

처음 노드가 이미 최댓값인 `8 → 3 → 8`도 첫 8을 선택하므로 그대로 둔다. 마지막 최댓값을 선택하려는 계약이라면 `>=`로 갱신하는 등 선택 규칙을 바꿔야 한다. 아래 프로그램은 `>` 규칙을 사용한다.

[연결 리스트 Q6. 최댓값 노드를 맨 앞으로 옮기기](https://cedis.tistory.com/166)의 C 구현도 최댓값과 앞 노드를 함께 기억해 같은 순서로 연결을 바꾼다. 그 함수는 `ListNode **ptrHead`를 통해 호출자의 head를 갱신한다. 아래 Python 함수는 새 head를 반환하므로 호출 방법을 구분해서 읽으면 된다.

### 값 목록이 같아도 같은 노드가 옮겨졌을까

3과 8이 이웃인 첫 예제에서는 두 노드의 값만 교환해도 겉으로는 `8 → 3 → 2 → 7`처럼 보인다. 값 교환이 허용되는 문제라면 다른 계약으로 풀 수 있지만, 이번에는 기존 노드가 자기 값을 가진 채 이동해야 한다. 그래서 출력 값만으로 성공을 판단하지 않는다.

다음 전체 프로그램은 Python 3.9 이상의 `Optional[Node]`·`list[Node]` 표기를 사용한다. `move_max_to_front()` 아래에서는 입력 노드를 만들고, 이동 후 노드들의 순서와 각 노드의 값, 변경된 연결을 대조한다. `collect()`의 순환 검사는 결과 확인용이며 이동 함수 자체가 순환 입력을 탐지하는 것은 아니다.

```run-python
from typing import Optional


class Node:
    def __init__(self, value: int, next: Optional["Node"] = None):
        self.value = value
        self.next = next


def move_max_to_front(head: Optional[Node]) -> Optional[Node]:
    if head is None or head.next is None:
        return head

    max_node = head
    max_prev = None
    prev = head
    cur = head.next

    while cur is not None:
        if cur.value > max_node.value:
            max_node = cur
            max_prev = prev
        prev = cur
        cur = cur.next

    if max_prev is None:
        return head

    max_prev.next = max_node.next
    max_node.next = head
    return max_node


def collect(head: Optional[Node]) -> list[Node]:
    nodes = []
    seen = set()
    while head is not None:
        assert id(head) not in seen, "cycle in result"
        seen.add(id(head))
        nodes.append(head)
        head = head.next
    return nodes


cases = ([], [7], [9, 3, 2], [3, 8, 2, 7], [3, 2, 7],
         [3, 8, 2, 8, 7], [8, 3, 8], [-5, -2, -9])
for values in cases:
    nodes = [Node(value) for value in values]
    for left, right in zip(nodes, nodes[1:]):
        left.next = right
    head = nodes[0] if nodes else None
    original_head = head
    old_links = [node.next for node in nodes]
    picked_index = values.index(max(values)) if values else None
    picked = nodes[picked_index] if picked_index is not None else None
    expected = ([picked] + nodes[:picked_index] + nodes[picked_index + 1:]
                if picked_index is not None else [])

    head = move_max_to_front(head)
    actual = collect(head)
    same_nodes = len(actual) == len(expected) and all(
        left is right for left, right in zip(actual, expected)
    )
    same_values = all(node.value == value for node, value in zip(nodes, values))
    assert same_nodes and same_values
    assert len({id(node) for node in actual}) == len(nodes)
    assert head is picked

    moved = picked_index is not None and picked_index > 0
    changed_links = sum(node.next is not old for node, old in zip(nodes, old_links))
    assert changed_links == (2 if moved else 0)
    for i, node in enumerate(nodes):
        if moved and i == picked_index - 1:
            expected_next = old_links[picked_index]
        elif moved and node is picked:
            expected_next = original_head
        else:
            expected_next = old_links[i]
        assert node.next is expected_next

    print(f"{values} -> {[node.value for node in actual]}; "
          f"picked_index={picked_index}; same_nodes={same_nodes}; "
          f"same_values={same_values}; changed_links={changed_links}")

```

프로그램을 실행해 확인한 결과다. `picked_index`는 선택한 노드가 원래 리스트에서 차지한 0부터 시작하는 위치다.

```text
[] -> []; picked_index=None; same_nodes=True; same_values=True; changed_links=0
[7] -> [7]; picked_index=0; same_nodes=True; same_values=True; changed_links=0
[9, 3, 2] -> [9, 3, 2]; picked_index=0; same_nodes=True; same_values=True; changed_links=0
[3, 8, 2, 7] -> [8, 3, 2, 7]; picked_index=1; same_nodes=True; same_values=True; changed_links=2
[3, 2, 7] -> [7, 3, 2]; picked_index=2; same_nodes=True; same_values=True; changed_links=2
[3, 8, 2, 8, 7] -> [8, 3, 2, 8, 7]; picked_index=1; same_nodes=True; same_values=True; changed_links=2
[8, 3, 8] -> [8, 3, 8]; picked_index=0; same_nodes=True; same_values=True; changed_links=0
[-5, -2, -9] -> [-2, -5, -9]; picked_index=1; same_nodes=True; same_values=True; changed_links=2
```

`same_nodes=True`는 기대한 순서로 같은 노드 객체들이 남았다는 뜻이다. 선택한 최댓값을 맨 앞에 놓고 나머지는 원래 순서로 두었는지, 누락이나 중복이 없는지를 검사했다. `same_values=True`는 각 원래 노드가 자기 값을 그대로 가지고 있다는 뜻이다. 값 교환이나 새 노드 복제로 결과를 대신하지 않았음을 구분한다.

중간과 끝의 최댓값은 앞으로 이동하며 `changed_links=2`가 된다. 변경된 개수만 세는 것이 아니라, 이전 노드가 최댓값을 건너뛰고 최댓값의 다음이 옛 head를 가리키며 나머지 링크는 그대로인지도 검사한다. 빈 입력·단일 노드·이미 맨 앞인 경우에는 바뀐 링크가 없다. 음수 사례에서도 첫 노드의 값부터 비교하므로 최댓값 -2를 찾는다.

### 탐색은 끝까지, 이동은 두 연결만

최댓값을 찾는 동안에는 뒤에 더 큰 값이 있을 수 있으므로 끝까지 순회한다. 두 개 이상의 노드에서 n-1개의 나머지 값을 비교하므로 탐색은 O(n)이다. 탐색 결과 최댓값이 이미 앞에 있었다고 해도, 그것을 확인하기 위한 순회는 수행했다.

노드 이동 자체는 두 `next` 대입과 새 머리 반환이므로 O(1)이다. 고정된 수의 참조만 보관하고 새 Node를 생성하지 않아 함수의 보조 공간도 O(1)이다. 예제에서 입력을 만들고 결과를 확인하는 목록·집합은 별도의 O(n) 공간을 쓴다.

기존 노드의 링크만 바꾸는 또 다른 예는 [Two Pointers의 앞·뒤 분할](/wiki/computer-science-topic-00c3fce8f9af/)에서 볼 수 있다. 그쪽은 경계 뒤를 끊어 두 리스트로 나누고, 여기서는 한 노드를 분리한 뒤 다시 앞에 붙인다. [자료구조](/wiki/data-structures/)의 탐색 비용과 이미 찾은 위치의 연결 변경 비용을 나누어 읽으면, 새 노드를 삽입하는 앞 절과 기존 노드를 이동하는 이 연산의 차이를 설명할 수 있다.
