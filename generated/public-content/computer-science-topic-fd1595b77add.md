---
layout: default
title: Queue
nav_order: 5
permalink: /wiki/computer-science-topic-fd1595b77add/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-fd1595b77add
projection_sha256: b17ae8437cac264ee397577aebe839f5cd3c0b5ed645bf15cbf821f1d491003b
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
- 재귀로 큐 뒤집기
- 재귀로 큐 뒤집기 — 앞 원소를 보류하고 돌아오는 길에 붙이는 법
- recursive_reverse
- RecursionError
- 큐 뒤집기
- 호출 Stack
grand_parent: CS 기초
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

## 앞 원소를 보류했다가 재귀로 뒤집기

Queue의 앞에서 꺼낸 원소를 잠시 보류하고, 나중에 다른 순서로 다시 넣으면 Queue 전체의 순서를 바꿀 수 있다. 재귀를 이용하면 각 호출의 지역 변수 `front`가 꺼낸 원소 하나를 기억한다. 남은 Queue를 먼저 처리한 뒤, 호출에서 돌아오는 순서대로 뒤에 붙인다.

모든 호출의 `q`는 **같은 deque 객체**를 가리킨다. 호출마다 새 Queue를 만드는 것이 아니다. 반면 `front`는 각 호출이 따로 보관하는 값이다. 이런 지역 상태와 복귀 순서는 [재귀와 반복](/wiki/computer-science-topic-931a857d1d9a/)의 호출 문맥으로 설명할 수 있다.

### 복귀할 때 뒤에 넣는 이유

처음 Queue가 `[1, 2, 3, 4]`라면 아래처럼 변한다. Queue는 왼쪽이 앞이고, 대기 중인 `front`는 바깥 호출부터 안쪽 호출 순서다. 표의 대기 목록은 설명을 위한 표기이며 프로그램이 별도 List를 만든다는 뜻은 아니다.

| 실행 단계 | 같은 q의 현재 내용 | 대기 중인 front |
| --- | --- | --- |
| 시작 | `[1, 2, 3, 4]` | 없음 |
| 1을 꺼내고 재귀 호출 | `[2, 3, 4]` | 1 |
| 2를 꺼내고 재귀 호출 | `[3, 4]` | 1, 2 |
| 3을 꺼내고 재귀 호출 | `[4]` | 1, 2, 3 |
| 4를 꺼내고 재귀 호출 | `[]` | 1, 2, 3, 4 |
| 빈 Queue에서 반환 | `[]` | 1, 2, 3, 4 |
| 4를 뒤에 넣고 반환 | `[4]` | 1, 2, 3 |
| 3을 뒤에 넣고 반환 | `[4, 3]` | 1, 2 |
| 2를 뒤에 넣고 반환 | `[4, 3, 2]` | 1 |
| 1을 뒤에 넣고 반환 | `[4, 3, 2, 1]` | 없음 |

왜 전체가 뒤집히는지는 한 호출만 보아도 설명할 수 있다. 처음 원소를 a, 나머지를 R이라고 하자. a를 꺼낸 뒤 재귀 호출이 R을 역순으로 만들고 정상 반환하면, 그 뒤에 a를 붙여 전체의 역순을 완성한다. 빈 Queue는 그대로 반환하면 되므로 이 과정의 끝도 정해져 있다.

`q.append(front)`는 재귀 호출 **뒤**에 있어야 한다. 먼저 다시 넣으면 Queue의 원소 수가 줄지 않아 빈 Queue에 도달하는 종료 조건을 만들 수 없다. 정상 실행에서는 꺼내는 순서가 1·2·3·4이고 다시 넣는 순서는 4·3·2·1이다. 앞에서 꺼내고 뒤에 넣는 Queue 연산은 유지되며, 호출의 복귀가 재삽입 순서를 바꾼다.

### Python으로 같은 Queue를 바꾸기

다음 예제는 Python 3.9 이상의 `deque[int]` 표기를 사용한다. 빈 입력·원소 하나·여러 원소·중복 원소를 확인한다. 정상 반환값은 `None`이고 입력받은 deque의 내용이 바뀐다. 따라서 `q = recursive_reverse(q)`처럼 반환값을 새 Queue로 사용하지 않는다.

마지막 입력은 현재 재귀 한도보다 원소 수가 많은 임시 Queue다. 이 경우 예외가 난 뒤 Queue에 어떤 상태가 남는지도 확인한다. 재귀 한도 설정은 바꾸지 않는다.

```run-python
from collections import deque
import sys


def recursive_reverse(q: deque[int]) -> None:
    if not q:
        return

    front = q.popleft()
    recursive_reverse(q)
    q.append(front)

for values in ([], [7], [1, 2, 3, 4], [2, 1, 2, 3]):
    q = deque(values)
    alias = q
    result = recursive_reverse(q)
    after = list(q)
    print(f"{values} -> {after}; same={q is alias}; return={result}")
    if after != values[::-1] or q is not alias or result is not None:
        raise AssertionError("reverse contract mismatch")

original_size = sys.getrecursionlimit() + 10
q = deque(range(original_size))
try:
    recursive_reverse(q)
except RecursionError:
    print("depth limit: RecursionError")
    print("queue partially changed:", 0 < len(q) < original_size)
else:
    raise AssertionError("expected recursion depth failure")
```

정상 입력의 출력은 다음과 같다. `same=True`는 함수 호출 전후에 같은 Queue 객체를 사용했다는 뜻이다.

```text
[] -> []; same=True; return=None
[7] -> [7]; same=True; return=None
[1, 2, 3, 4] -> [4, 3, 2, 1]; same=True; return=None
[2, 1, 2, 3] -> [3, 2, 1, 2]; same=True; return=None
```

중복된 값도 원래 개수대로 남으며, 값을 정렬하는 것이 아니라 위치를 뒤집는다. 호출과 복귀를 따라가는 예제는 [스택·큐 Q5. 재귀로 큐 뒤집기](https://cedis.tistory.com/172)로 이어서 볼 수 있다.

### 재귀 한도를 넘었을 때 남는 상태

원소 n개를 처리하려면 빈 Queue에서 반환하는 호출까지 이 함수의 호출이 n+1개 겹친다. 여기에 이미 실행 중인 바깥 호출도 있으므로, 재귀 한도를 곧바로 처리 가능한 원소 수로 볼 수는 없다. Python의 현재 한도는 `sys.getrecursionlimit()`으로 읽을 수 있다. [Python의 재귀 한도](https://docs.python.org/3/library/sys.html#sys.getrecursionlimit)

깊이 제한에 걸리면 `RecursionError`가 발생할 수 있다. 이 함수에는 예외가 발생했을 때 이미 꺼낸 원소를 다시 넣는 복구 코드가 없다. 재귀 호출이 정상 반환하지 않으면 뒤의 `q.append(front)`도 실행되지 않기 때문이다.

마지막 실행에서는 `depth limit: RecursionError`와 `queue partially changed: True`를 확인한다. 입력 Queue는 원래 상태도, 완전히 뒤집힌 결과도 아닌 상태로 남는다. 예외를 잡았다는 사실만으로 원래 데이터가 보존되는 것은 아니다. 정확히 몇 개를 꺼낸 뒤 실패하는지는 실행 환경과 현재 호출 깊이에 따라 달라진다.

### 시간과 임시 저장 공간

정상 실행에서 각 원소는 한 번 `popleft()`되고 한 번 `append()`된다. `deque`의 양 끝 연산을 대략 O(1)로 계산하면 전체 시간은 O(n)이다. 이를 Python List의 `pop(0)`으로 바꾸면 남은 원소를 옮기는 비용이 반복되어 O(n²)가 될 수 있다. [deque와 List의 앞 원소 제거 비용](https://docs.python.org/3/library/collections.html#collections.deque)

별도 Stack 변수를 선언하지 않아도 대기 중인 호출들이 각각 `front`와 이어서 실행할 위치를 보관한다. 따라서 추가 공간은 O(n)이다. 시간도 O(n), 임시 저장 공간도 O(n)이라는 두 설명은 서로 다른 비용을 가리킨다.

명시적인 Stack에 원소를 차례로 넣었다가 꺼내 Queue 뒤에 붙이는 방법도 O(n)의 임시 저장 공간을 사용한다. 이 방식은 Python 함수의 재귀 깊이에 의존하지 않는다. [Stack](/wiki/computer-science-topic-39fd55620efd/)의 괄호 검사에서는 아직 닫히지 않은 짝을, [트리 순회](/wiki/computer-science-topic-17f8492e4ed6/)에서는 아직 끝나지 않은 작업을 보관한다는 점을 함께 비교할 수 있다.

재귀의 동작을 배우는 목적을 넘어 deque의 순서만 뒤집으려면 `q.reverse()`도 사용할 수 있다. 이 메서드 역시 같은 객체의 내용을 바꾸고 `None`을 반환한다. [deque.reverse](https://docs.python.org/3/library/collections.html#collections.deque.reverse)

## 대기열이라는 이름과 처리 정책

먼저 온 요청을 먼저 처리하는 작업 대기열에 FIFO Queue를 사용할 수 있다. 하지만 OS의 ready queue라는 이름만으로 항상 FIFO라고 판단하지 않는다. 우선순위를 기준으로 Thread를 선택한다면 도착 순서 외의 정책이 적용된다.

PintOS의 실제 대기 List와 우선순위에 따른 삽입·선택은 [Doubly Linked List](/wiki/computer-science-topic-2d043afd0f9f/)로 이어진다. 자료구조의 연결 방식과 스케줄러가 다음 Thread를 고르는 규칙을 나누어 읽어야 한다.
