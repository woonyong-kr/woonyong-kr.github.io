---
layout: default
title: Doubly Linked List
nav_order: 4
permalink: /wiki/computer-science-topic-2d043afd0f9f/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-2d043afd0f9f
projection_sha256: f081d1419496bd1435925518cd6b9d3acfcd847e3bd062db755899bec35a7beb
parent: Linked List
content_status: ready
public_parent_id: Wiki/keywords/computer-science-topic-2f43235867e4
search_terms:
- Doubly Linked List
- 이중 연결 리스트
- Sentinel
- PintOS
- list_elem
- Intrusive List
grand_parent: 자료구조
ancestor: CS 기초
---

# Doubly Linked List
{: .no_toc }

`10 ⇄ 20 ⇄ 30`에서 `20`을 제거하려면 `10`의 다음을 `30`으로, `30`의 이전을 `10`으로 바꾼다. Doubly Linked List는 노드마다 `prev`와 `next`를 저장하므로 **삭제할 노드를 알고 있다면** 양쪽 이웃을 바로 찾을 수 있다.

인덱스나 값으로 그 노드를 먼저 찾아야 한다면 탐색 비용이 추가된다. 양방향이라는 이유로 Array처럼 임의의 인덱스에 O(1)로 접근하는 것은 아니다.

## 양 끝에 경계 노드를 둔다

첫 번째 노드나 마지막 노드를 제거할 때마다 특별한 분기를 넣는 대신, 데이터에 포함하지 않는 head와 tail 노드를 둘 수 있다. 이를 Sentinel이라고 부른다. 빈 List에서는 `head.next`가 tail을, `tail.prev`가 head를 가리킨다.

다음은 연결을 바꾸는 부분만 일반 C에서 실행하는 작은 모형이다. 값도 노드 안에 두었으며, PintOS Kernel을 실행하거나 실제 `struct thread`를 사용하는 코드는 아니다.

```run-c
#include <assert.h>
#include <stdio.h>

struct node {
    int value;
    struct node *prev;
    struct node *next;
};

static void insert_before(struct node *before, struct node *item) {
    assert(before->prev != NULL && item->prev == NULL && item->next == NULL);
    item->prev = before->prev;
    item->next = before;
    before->prev->next = item;
    before->prev = item;
}

static void remove_node(struct node *item) {
    assert(item->prev != NULL && item->next != NULL);
    item->prev->next = item->next;
    item->next->prev = item->prev;
    item->prev = NULL;
    item->next = NULL;
}

int main(void) {
    struct node head = {0, NULL, NULL}, tail = {0, NULL, NULL};
    head.next = &tail;
    tail.prev = &head;
    struct node a = {10, NULL, NULL}, b = {20, NULL, NULL};
    struct node c = {30, NULL, NULL};
    insert_before(&tail, &a);
    insert_before(&tail, &b);
    insert_before(&tail, &c);
    remove_node(&b);
    printf("중간 삭제: %d -> %d\n", head.next->value, head.next->next->value);
    assert(a.next == &c && c.prev == &a);
    remove_node(&a);
    printf("처음 삭제 후: %d\n", head.next->value);
    remove_node(&c);
    printf("빈 List: %s\n", head.next == &tail ? "yes" : "no");
    assert(head.next == &tail && tail.prev == &head);
    return 0;
}
```

세 번의 삭제가 모두 같은 함수로 처리된다. head와 tail은 경계를 나타내므로 데이터 노드처럼 제거하지 않는다. 이 모형에서는 제거한 노드의 연결도 NULL로 비우지만, 모든 Linked List 구현이 그렇게 하는 것은 아니다. 호출자는 이미 제거한 노드를 다시 제거하거나 같은 연결을 여러 List에 동시에 끼우지 않아야 한다.

연결을 바꾸는 대입 수는 List가 길어져도 일정하다. 다만 이 예제는 한 Thread에서 실행한다. 여러 Thread가 같은 List를 동시에 수정할 때의 동기화는 별도로 필요하다.

## PintOS의 구조체 안에 들어 있는 연결

`lrn-pintos`의 `5afaa6d` 버전에서 `struct list_elem`은 `prev`와 `next`를 가진다. `struct list`는 head와 tail 경계 노드를 보관한다. `list_init()`이 두 경계를 연결하고, `list_remove()`는 유효한 내부 원소의 이웃 두 곳을 이어 준 뒤 다음 원소를 반환한다. 위 모형과 달리 제거한 원소의 `prev`와 `next`를 NULL로 지우지는 않는다. [구조체 정의](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/lib/kernel/list.h#L83), [초기화](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/lib/kernel/list.c#L56), [제거 구현](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/lib/kernel/list.c#L241)

연결용 노드를 따로 할당하는 대신, List에 들어갈 구조체가 `struct list_elem` 멤버를 직접 품는다. 이런 형태를 Intrusive List라고 부른다. `list_entry()`는 연결 멤버의 주소에서 바깥 구조체를 찾는 데 쓰인다. List 조작 자체가 별도 노드 할당을 요구하지 않는다는 뜻이며, Thread 객체의 메모리 할당까지 없다는 뜻은 아니다.

`struct thread`의 `elem`은 ready List 또는 Semaphore 대기 List에 연결할 때 쓰고, `donation_elem`은 우선순위 기부 목록에 따로 쓴다. 서로 다른 목록에 동시에 참여하려면 각 연결의 소속을 구분해야 한다. 같은 `elem`을 두 목록에 동시에 넣으면 그 안의 `prev`·`next`가 두 연결을 함께 표현할 수 없다. [Thread의 연결 멤버](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/threads/thread.h#L129)

## 연결 변경이 빠르다고 스케줄링 전체가 O(1)은 아니다

현재 구현의 `thread_unblock()`과 `thread_yield()`는 ready List에 우선순위 비교 함수를 넘겨 `list_insert_ordered()`로 삽입한다. 이 함수는 들어갈 위치를 찾을 때 List를 순회한다. 연결 대입은 O(1)이지만 위치 탐색은 원소 수 n에 대해 최악 O(n)이다. [ready List 삽입](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/thread.c#L365), [정렬된 위치 탐색](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/lib/kernel/list.c#L415)

Semaphore도 `sema_down()`에서 우선순위에 맞춰 기다리는 Thread를 넣고, `sema_up()`에서 대기 목록을 다시 정렬한 뒤 앞 원소를 꺼내 깨운다. 따라서 단순 FIFO Queue로 설명하거나 꺼내는 연산 하나만 보고 `sema_up()` 전체를 O(1)이라고 할 수 없다. 대기 목록 정렬과 ready List 삽입 비용을 함께 읽어야 한다. [Semaphore의 대기와 깨우기](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/synch.c#L60)

List에 들어간 뒤 우선순위가 바뀌는 경로에서는 순서를 다시 맞추는지도 따로 확인해야 한다. 정렬 삽입 함수가 있다는 사실만으로 항상 최고 우선순위 Thread가 맨 앞에 있다고 보장할 수는 없다. 여기서 확인한 것은 해당 버전의 구조와 호출 경로이며, Kernel 실행으로 스케줄러의 모든 동작을 검증했다는 뜻은 아니다.
