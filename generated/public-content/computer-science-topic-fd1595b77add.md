---
layout: default
title: Queue
nav_order: 5
permalink: /wiki/computer-science-topic-fd1595b77add/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-fd1595b77add
projection_sha256: af49a2d72c979dd51707bd277260bbb5a0a81b69b12c45503237a1834c3ae062
parent: 자료구조
content_status: ready
public_parent_id: Wiki/computer-science/data-structures
search_terms:
- Queue
- 큐
- FIFO
- enqueue
- dequeue
- deque
grand_parent: CS
---

# Queue
{: .no_toc }

작업 `A`, `B`, `C`가 도착한 순서대로 처리돼야 한다면 뒤에 넣고 앞에서 꺼낸다. Queue의 기본 규칙은 **FIFO(First In, First Out)**다. 넣는 연산을 `enqueue`, 꺼내는 연산을 `dequeue`라고 부른다.

```run-python
from collections import deque

waiting = deque(["A", "B"])
waiting.append("C")
print("처리:", waiting.popleft())
waiting.append("D")
print("대기:", list(waiting))
while waiting:
    print("처리:", waiting.popleft())

try:
    waiting.popleft()
except IndexError:
    print("빈 Queue에서는 꺼낼 수 없음")
```

먼저 `A`를 처리하고 `D`가 도착해도, 이미 기다리던 `B`, `C`가 `D`보다 먼저 나온다. 이 예제에는 Thread 간 동기화나 실제 작업 실행은 들어 있지 않다. 도착과 처리 순서만 살펴본다.

## 앞에서 꺼낼 때 원소를 모두 옮겨야 할까

Python List에서 `pop(0)`을 반복하면 뒤의 참조들을 앞으로 옮기는 비용이 든다. `collections.deque`는 양 끝의 추가·제거에 대략 O(1) 성능을 제공한다. 반면 중간 인덱스 접근까지 Array처럼 O(1)인 것은 아니다. [Python deque의 연산 조건](https://docs.python.org/3/library/collections.html#collections.deque)

Queue를 반드시 Linked List로 만들 필요는 없다. head와 tail을 보관한 Linked List로 구현할 수도 있고, Array를 원형으로 사용해 앞뒤 인덱스만 옮길 수도 있다. 후자는 앞에서 꺼낼 때마다 남은 원소를 당기지 않는다. 대신 빈 상태와 가득 찬 상태, 용량을 넘었을 때의 정책을 정해야 한다.

## 대기열이라는 이름과 처리 정책

먼저 온 요청을 먼저 처리하는 작업 대기열에 FIFO Queue를 사용할 수 있다. 하지만 OS의 ready queue라는 이름만으로 항상 FIFO라고 판단하지 않는다. 우선순위를 기준으로 Thread를 선택한다면 도착 순서 외의 정책이 적용된다.

PintOS의 실제 대기 List와 우선순위에 따른 삽입·선택은 [Doubly Linked List](/wiki/computer-science-topic-2d043afd0f9f/)로 이어진다. 자료구조의 연결 방식과 스케줄러가 다음 Thread를 고르는 규칙을 나누어 읽어야 한다.
