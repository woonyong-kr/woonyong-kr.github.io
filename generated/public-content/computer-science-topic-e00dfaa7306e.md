---
layout: default
title: Singly Linked List
nav_order: 3
permalink: /wiki/computer-science-topic-e00dfaa7306e/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-e00dfaa7306e
projection_sha256: 4056e122560487c35f8ec95ba2194531fbff92cd0df58475fed8c91989cea8ad
parent: Linked List
content_status: ready
public_parent_id: Wiki/keywords/computer-science-topic-2f43235867e4
search_terms:
- Singly Linked List
- 단일 연결 리스트
- next
- node_at
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
