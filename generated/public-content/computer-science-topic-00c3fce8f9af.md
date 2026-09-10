---
layout: default
title: Two Pointers
nav_order: 4
permalink: /wiki/computer-science-topic-00c3fce8f9af/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-00c3fce8f9af
projection_sha256: 28d2dcae5c93dcc4c145c4897c1176578f7bfa310c7bc7df4acfb6106b4917dc
parent: 탐색
content_status: ready
public_parent_id: Wiki/keywords/computer-science-topic-88d3a3e31531
search_terms:
- 투 포인터
- Two Pointers
- slow
- fast
- front_back_split
- 연결 리스트 앞·뒤 절반 분할
- 연결 리스트 앞·뒤 절반 분할 — 가운데를 기준으로 둘로 나누는 법
- 홀수 길이
- 노드 동일성
grand_parent: 알고리즘
ancestor: CS 기초
---

# Two Pointers
{: .no_toc }

`1 → 2 → 3 → 4 → 5`를 앞 리스트 `1 → 2 → 3`과 뒤 리스트 `4 → 5`로 나누려면 어디에서 연결을 끊어야 할까? [Singly Linked List](/wiki/computer-science-topic-e00dfaa7306e/)에서는 Array의 중간 인덱스처럼 가운데 노드에 곧바로 접근할 수 없다. `next`를 따라 이동해 앞쪽의 마지막 노드를 찾아야 한다. 병합 정렬처럼 앞부분과 뒷부분을 따로 처리할 때 필요한 분할이다.

두 위치를 함께 추적하고 그 관계에 맞춰 이동시키는 접근을 **Two Pointers**라고 부른다. 여기서는 한 칸씩 이동하는 `slow`와 두 칸씩 이동하는 `fast`로 연결 리스트의 분할 경계를 찾는다. 정렬된 Array의 양 끝에서 서로 가까워지는 방식 등도 있으므로, Two Pointers가 언제나 이동 속도 1과 2를 뜻하는 것은 아니다. 이 예제는 그중 **slow/fast를 이용한 가운데 탐색과 분할**을 다룬다.

## slow가 앞 리스트의 마지막 노드에 멈추는 이유

먼저 분할 규칙을 정하자. 노드가 짝수 개면 두 리스트의 길이가 같고, 홀수 개면 앞 리스트가 하나 더 가진다. 따라서 길이 4에서는 두 번째 노드 뒤를, 길이 5에서는 세 번째 노드 뒤를 끊어야 한다. 뒤쪽 리스트가 하나 더 길어야 하는 문제에는 이 경계 선택을 그대로 사용할 수 없다.

입력은 `next`를 따라가면 None으로 끝나는 순환 없는 리스트다. 값이 정렬돼 있을 필요는 없다. 두 포인터는 값의 크기를 비교하지 않고 노드 사이의 연결만 따라간다.

`slow = head`, `fast = head.next`로 시작한다. `fast`를 먼저 한 칸 옮긴 뒤 아직 노드가 있으면, `slow`를 한 칸 옮기고 `fast`를 다시 한 칸 옮긴다. 첫 이동에서 `fast`가 None이 되면 `slow`는 움직이지 않는다. 빠른 쪽을 두 칸 옮길 때마다 느린 쪽을 한 칸 옮기되, 마지막 이동에서는 이 종료 조건을 확인한다.

아래 표는 각 반복을 끝낸 직후의 위치다. 숫자는 인덱스가 아니라 노드에 저장된 값이다. 길이 4와 5에서 마지막 `slow`가 어떻게 달라지는지 비교해 보자.

| 입력 길이 | 시점 | slow | fast |
| --- | --- | --- | --- |
| 4: 1 → 2 → 3 → 4 | 시작 | 1 | 2 |
| 4 | 첫 반복 뒤 | 2 | 4 |
| 4 | 둘째 반복 뒤 | 2 | None |
| 5: 1 → 2 → 3 → 4 → 5 | 시작 | 1 | 2 |
| 5 | 첫 반복 뒤 | 2 | 4 |
| 5 | 둘째 반복 뒤 | 3 | None |

길이 4의 마지막 반복에서는 `fast`가 4에서 None으로 가므로 `slow`는 2에 남는다. 길이 5에서는 `fast`가 4에서 5로 갈 수 있으므로 `slow`도 2에서 3으로 이동하고, `fast`가 다시 움직여 None이 된다. 두 경우 모두 `slow`는 **앞 리스트에 포함할 마지막 노드**다.

`fast`가 첫 노드보다 한 노드 앞에서 시작하고 이런 이동을 반복하므로, 길이 `n >= 2`에서 `slow`의 최종 위치는 처음부터 세어 `(n + 1) // 2`번째다. 앞 리스트는 `(n + 1) // 2`개, 뒤 리스트는 `n // 2`개의 노드를 갖는다. 시작 위치와 반복 조건은 함께 이 규칙을 만든다. 시작만 바꾸고 같은 분할 결과를 기대해서는 안 된다.

## 뒤쪽 시작점을 보관한 다음 연결을 끊는다

가운데를 찾았다고 두 리스트가 이미 나뉜 것은 아니다. 다섯 노드에서는 `slow`가 3에 도착해도 아직 3의 `next`가 4를 가리킨다. 먼저 `back = slow.next`로 4의 참조를 보관한 다음 `slow.next = None`으로 연결을 끊는다.

반환하는 `front`는 원래 `head`와 같은 노드이고, `back`은 방금 보관한 뒤쪽 첫 노드다. `front`에서 따라가면 1·2·3, `back`에서 따라가면 4·5를 만난다. 시작점을 보관하지 않고 먼저 끊으면 원래 `head`에서 뒤쪽으로 가던 경로가 사라져 버린다. 다른 곳에 뒤쪽 참조가 남아 있을 수는 있지만, 이 함수는 그 존재에 의존하지 않는다.

분할 함수는 **새 Node를 만들거나 값을 복사하지 않는다.** 원래 노드 하나의 `next`만 None으로 바꾼다. 그래서 호출 전에 원래 `head`를 다른 변수에 보관했어도, 호출 뒤에는 그 변수에서 앞 리스트만 따라갈 수 있다. 변수의 참조를 복사하는 것과 연결 구조를 복사하는 것은 다르다. [Pointer](/wiki/programming-languages-runtime-topic-ef71fd296666/)에서 주소를 보관하는 역할과 비교해 볼 수 있다.

빈 입력과 단일 노드에는 뒤쪽이 없다. 이때는 `head, None`을 반환하고 어떤 링크도 바꾸지 않는다. **링크 하나를 끊는 동작은 노드가 두 개 이상일 때** 발생한다.

## 분할한 뒤에도 같은 노드가 남는다

다음 전체 프로그램은 Python 3.9 이상에서 실행할 수 있다. `Optional[Node]`는 Node 또는 None을 뜻하고, `tuple[...]`과 `list[...]`로 반환값의 형태를 적었다. [Python의 Optional](https://docs.python.org/3.9/library/typing.html#typing.Optional), [내장 컬렉션의 타입 표기](https://docs.python.org/3.9/library/stdtypes.html#types-genericalias)

`front_back_split()`이 실제 분할 함수다. 그 아래 코드는 입력 노드를 만들고 결과를 확인한다. `collect()`는 한쪽 리스트를 따라 만난 노드들을 모으며, 검사 도중 같은 노드를 다시 만나면 순환으로 판단한다. 분할 함수 자체에 순환 탐지 기능을 추가한 것은 아니다.

검사에서는 결과의 앞·뒤 노드를 이어 놓은 순서가 원래 노드들과 모두 `is`로 일치하는지 확인한다. 값이 우연히 같다는 이유로 복제나 누락을 놓치지 않게 하려는 것이다. 바뀐 링크의 수뿐 아니라 정확히 앞쪽 마지막 노드의 링크만 None이 되었는지도 대조한다.

```run-python
from typing import Optional


class Node:
    def __init__(self, value: int, next: Optional["Node"] = None):
        self.value = value
        self.next = next


def front_back_split(head: Optional[Node]) -> tuple[Optional[Node], Optional[Node]]:
    if head is None or head.next is None:
        return head, None

    slow = head
    fast = head.next

    while fast is not None:
        fast = fast.next
        if fast is not None:
            slow = slow.next
            fast = fast.next

    front = head
    back = slow.next
    slow.next = None
    return front, back


def collect(head: Optional[Node]) -> list[Node]:
    result = []
    seen = set()
    while head is not None:
        assert id(head) not in seen, "cycle in result"
        seen.add(id(head))
        result.append(head)
        head = head.next
    return result


cases = ([], [1], [1, 2], [1, 2, 3], [1, 2, 3, 4],
         [1, 2, 3, 4, 5], [2, 1, 2, 1, 2, 1])
for values in cases:
    nodes = [Node(value) for value in values]
    for left, right in zip(nodes, nodes[1:]):
        left.next = right
    head = nodes[0] if nodes else None
    original_head = head
    old_links = [node.next for node in nodes]

    front, back = front_back_split(head)
    front_nodes = collect(front)
    back_nodes = collect(back)
    ordered = front_nodes + back_nodes
    same = len(ordered) == len(nodes) and all(
        actual is original for actual, original in zip(ordered, nodes)
    )
    assert same
    assert len({id(node) for node in ordered}) == len(nodes)
    assert [node.value for node in ordered] == values

    front_count = (len(nodes) + 1) // 2
    assert len(front_nodes) == front_count
    assert len(back_nodes) == len(nodes) // 2
    assert front is original_head
    assert back is (nodes[front_count] if front_count < len(nodes) else None)

    changed_links = sum(node.next is not old for node, old in zip(nodes, old_links))
    assert changed_links == (1 if len(nodes) >= 2 else 0)
    for i, node in enumerate(nodes):
        expected = None if len(nodes) >= 2 and i == front_count - 1 else old_links[i]
        assert node.next is expected

    print(f"{values} -> front={[n.value for n in front_nodes]}; "
          f"back={[n.value for n in back_nodes]}; "
          f"same={same}; changed_links={changed_links}")

print("identity, order, and split links: OK")

```

프로그램을 실행해 확인한 결과다. `front`와 `back`의 값 순서, 노드 동일성, 바뀐 링크 수를 함께 볼 수 있다.

```text
[] -> front=[]; back=[]; same=True; changed_links=0
[1] -> front=[1]; back=[]; same=True; changed_links=0
[1, 2] -> front=[1]; back=[2]; same=True; changed_links=1
[1, 2, 3] -> front=[1, 2]; back=[3]; same=True; changed_links=1
[1, 2, 3, 4] -> front=[1, 2]; back=[3, 4]; same=True; changed_links=1
[1, 2, 3, 4, 5] -> front=[1, 2, 3]; back=[4, 5]; same=True; changed_links=1
[2, 1, 2, 1, 2, 1] -> front=[2, 1, 2]; back=[1, 2, 1]; same=True; changed_links=1
identity, order, and split links: OK
```

길이 4는 2개와 2개, 길이 5는 3개와 2개로 나뉜다. `same=True`는 앞쪽 결과 다음에 뒤쪽 결과를 놓았을 때 원래의 각 노드와 같은 객체를 같은 순서로 만났다는 뜻이다. 두 결과에 걸쳐 같은 노드를 중복 사용하지 않았고, 원래 노드가 빠지지도 않았음을 함께 검사했다.

마지막 입력의 값은 정렬돼 있지 않고 중복도 있다. 그래도 `[2, 1, 2]`와 `[1, 2, 1]`로 원래 순서를 유지한다. 분할 기준은 값이 아니라 위치다. 빈 입력·단일 노드의 `changed_links=0`과 나머지 입력의 `changed_links=1`은 바로 앞에서 설명한 절단 조건을 보여 준다.

## 원본을 유지할 때는 무엇을 복사할까

원래 전체 리스트와 분할한 두 리스트를 동시에 독립적으로 사용해야 한다면, 새 노드들을 만들어 값을 옮겨 담는 방법이 있다. 링크를 공유하지 않는 노드를 새로 만들어야 뒤쪽 경계를 끊어도 원래 연결이 유지된다. 시작점을 담은 변수 두 개만 만드는 것으로는 원본 보존이 되지 않는다.

[연결 리스트 Q5. 앞/뒤 절반으로 분할하기](https://cedis.tistory.com/165)는 `size`로 앞쪽 길이를 계산하고 순회 중의 값을 `insertNode`에 넘겨 두 결과 리스트를 구성하는 별도 구현을 보여 준다. 여기의 slow/fast 탐색 및 기존 링크 절단과 같은 API는 아니다. 앞쪽에 홀수 길이의 남는 노드 하나를 배정한다는 규칙을 공유하지만, 노드를 재사용할지 결과 리스트를 따로 구성할지는 구분해서 읽어야 한다.

현재 함수의 가운데 탐색은 O(n), 경계를 찾은 뒤 연결 하나를 끊는 작업은 O(1)이다. `slow`와 `fast`는 뒤로 돌아가지 않고 각자 앞에서 뒤로 이동한다. 빠른 참조가 약 두 배 멀리 간다고 탐색 시간이 O(1)이 되는 것은 아니다. 이것은 실제 실행 시간 측정이 아니라 이동 횟수에 따른 [시간 복잡도](/wiki/computer-science-topic-869aa2bd6535/) 분석이다.

분할 함수 자체의 보조 공간은 O(1)이다. 반환하는 두 참조와 고정된 수의 지역 변수만 사용하며 새 노드는 없다. 반면 예제의 입력 준비·검사 목록과 집합에는 O(n) 공간이 필요하다. 새 노드들로 원본과 독립된 결과를 구성하는 방식도 노드 수에 비례하는 공간을 사용한다. [자료구조](/wiki/data-structures/)를 선택할 때는 이처럼 함수의 분할 비용, 검사를 위한 비용, 원본 보존을 위한 복사 비용을 나누어 판단한다.
