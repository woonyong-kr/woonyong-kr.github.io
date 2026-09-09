---
layout: default
title: Stack
nav_order: 4
permalink: /wiki/computer-science-topic-39fd55620efd/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-39fd55620efd
projection_sha256: 3e777e40061441fcb2bf59d93bea12004fc0f91f773b429572f4f04c5205a1ae
parent: 자료구조
content_status: ready
public_parent_id: Wiki/computer-science/data-structures
search_terms:
- Stack
- 스택
- LIFO
- push
- pop
- Call Stack
grand_parent: CS
---

# Stack
{: .no_toc }

접시를 세 장 쌓은 뒤 맨 위에서 꺼내면 마지막에 놓은 접시가 먼저 나온다. Stack은 이 **LIFO(Last In, First Out)** 규칙으로 원소를 다룬다. `push`는 위에 넣고, `pop`은 같은 쪽에서 꺼낸다.

## 넣은 순서의 반대로 꺼내기

Python List의 끝을 Stack의 위쪽으로 쓰면 `append()`와 인덱스 없는 `pop()`으로 구현할 수 있다. 아래에서는 세 작업의 이름을 넣었다가 거꾸로 꺼낸다. [Python의 Stack 예제](https://docs.python.org/3/tutorial/datastructures.html#using-lists-as-stacks)

```run-python
stack = []
for name in ("main", "load", "parse"):
    stack.append(name)
    print("push:", name, "=>", stack)

while stack:
    print("pop:", stack.pop())

try:
    stack.pop()
except IndexError:
    print("빈 Stack에서는 꺼낼 수 없음")
```

`parse`, `load`, `main` 순서로 출력된다. 실제 함수들을 호출한 코드는 아니며, 이름을 쌓아 LIFO 순서를 보여 준 것이다. 빈 Stack에서 꺼내는 동작은 구현에 따라 예외나 실패 값으로 알릴 수 있으므로 호출 쪽에서 계약을 확인해야 한다.

## 호출과 반환이 겹치는 순서

일반적인 중첩 함수 호출에서 `main`이 `load`를 부르고 `load`가 `parse`를 부르면, 정상 반환은 `parse → load → main` 순서로 일어난다. 나중에 시작한 호출이 끝나야 기다리던 호출을 이어 갈 수 있어 Call Stack으로 설명한다. 각 호출이 필요한 반환 위치와 지역 상태를 Stack Frame으로 다룬다.

이 설명이 모든 언어와 최적화에서 함수마다 물리적인 Frame 하나가 반드시 생긴다는 보장은 아니다. 인라인이나 꼬리 호출 최적화, Coroutine처럼 실행을 중단하고 재개하는 방식은 따로 살펴야 한다. 메모리 영역으로서의 Stack과 Heap은 [Stack과 Heap](/wiki/computer-systems-network-topic-3521ee6344f1/)에서 다룬다.

Stack은 저장 방식을 하나로 정하지 않는다. Array 끝을 사용하거나 Singly Linked List의 앞쪽에서 넣고 뺄 수 있다. Dynamic Array는 확장 비용을 여러 삽입에 나누어 설명하고, Linked List는 노드 할당 비용을 연결 변경과 구분한다. 어느 구현이든 뒤에 넣은 원소가 먼저 나와야 Stack의 규칙을 만족한다.
