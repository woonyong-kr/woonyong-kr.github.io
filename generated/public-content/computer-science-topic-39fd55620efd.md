---
layout: default
title: Stack
nav_order: 4
permalink: /wiki/computer-science-topic-39fd55620efd/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-39fd55620efd
projection_sha256: 42e000f322493a87abcb428fddc26638f3084fd85e9674d73f9faa5f8844440c
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
- 균형 괄호 검사
- 균형 괄호 검사 — 스택이 짝을 기억하는 법
- balanced parentheses
- 괄호 검사
- is_balanced
- remove_until
- 특정 값까지 제거
- 스택에서 특정 값이 나올 때까지 제거하기
- 단락 평가
grand_parent: CS 기초
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

## 목표 값 위의 원소만 꺼내기

Stack이 아래에서 위로 `[3, 7, 4, 9]`일 때, 7을 남기고 그 위의 원소만 꺼내려면 9와 4를 차례로 제거한 뒤 멈춰야 한다. 목표인 7까지 꺼내는 동작과는 결과가 다르다. 오른쪽을 맨 위로 쓰는 Python List에서는 `stack[-1]`로 값을 확인하고 `pop()`으로 제거한다.

반복 조건은 **Stack이 비어 있지 않고, 맨 위가 목표 값과 다르다**는 것이다. 두 조건의 순서에도 의미가 있다. Python의 `and`는 왼쪽 값이 참으로 평가될 때만 오른쪽을 계산하므로, 빈 List라면 `stack[-1]`을 읽지 않는다. [Python의 단락 평가](https://docs.python.org/3/reference/expressions.html#boolean-operations)

```run-python
def remove_until(stack: list[int], target: int) -> None:
    while stack and stack[-1] != target:
        stack.pop()


cases = [
    ([3, 7, 4, 9], 7, [3, 7]),
    ([], 7, []),
    ([3, 7], 7, [3, 7]),
    ([1, 2, 5], 8, []),
    ([3, 7, 4, 7, 9], 7, [3, 7, 4, 7]),
    ([0, 1], 0, [0]),
]
for values, target, expected in cases:
    stack = values.copy()
    alias = stack
    result = remove_until(stack, target)
    assert stack == expected and stack is alias and result is None
    print(f"{values}, target={target} -> {stack}")

stack = []
try:
    while stack[-1] != 7 and stack:
        stack.pop()
except IndexError:
    print("조건 순서 반대: IndexError")
else:
    raise AssertionError("expected empty-stack lookup failure")
```

처음 입력에서는 9를 꺼내 `[3, 7, 4]`, 이어 4를 꺼내 `[3, 7]`이 된다. 다음 조건 검사에서 맨 위가 7이므로 반복문에 들어가지 않는다. 같은 값이 여러 개라면 **위에서 처음 만난 목표 값**에서 멈춘다. `[3, 7, 4, 7, 9]`가 `[3, 7, 4, 7]`로 남는 이유다. [스택·큐 Q6. 특정 값이 나올 때까지 스택 제거하기](https://cedis.tistory.com/173)

목표 값이 없으면 원소를 모두 꺼낸 뒤 빈 Stack에서 종료한다. 처음부터 비었거나 맨 위가 목표 값이면 아무것도 꺼내지 않는다. 이 함수는 입력 List를 직접 바꾸고 `None`을 반환한다. 목표를 찾았는지를 별도로 반환하거나, 찾지 못했을 때 제거한 원소를 복구하는 함수는 아니다.

예제 마지막에는 조건 순서를 뒤집었을 때의 오류를 확인한다. `stack[-1] != 7 and stack`은 빈 List의 맨 위부터 읽으려 하므로 `IndexError`가 발생한다. `pop()`을 먼저 하고 꺼낸 값을 검사하면 목표 값까지 제거할 수 있다. 원하는 종료 상태를 정한 뒤, 값을 읽는 시점과 제거하는 시점을 배치해야 한다.

원소가 n개일 때 제거 횟수는 0번부터 n번까지다. 맨 위가 이미 목표 값인 경우는 O(1), 모두 제거하는 경우는 O(n)이다. 이는 정수 비교를 일정한 비용으로 보고 List 끝에서 제거하는 비용을 분할 상환으로 계산한 설명이다. 함수가 따로 보관하는 상태는 일정하므로, 입력 List 자체를 제외한 보조 공간은 O(1)이다. 위 실행 예제에서 입력을 복사하고 예상 결과를 보관한 공간은 함수의 보조 공간과 구분한다.

여기서는 같은 쪽의 맨 위를 확인하고 꺼낸다. 앞에서 꺼내고 뒤에 넣는 [Queue](/wiki/computer-science-topic-fd1595b77add/)의 규칙과 구분하면, 별도의 앞·뒤 위치를 추적할 필요가 없는 이유도 알 수 있다.

## 가장 최근에 열린 괄호부터 닫기

`([)]`에는 여는 괄호와 닫는 괄호가 각각 두 개 있지만, 마지막에 연 `[`를 닫기 전에 `)`가 나온다. 개수만 같다고 중첩된 짝의 순서까지 맞는 것은 아니다.

이때 Stack에는 **아직 닫히지 않은 여는 괄호**를 저장한다. 오류 없이 지금까지의 문자를 처리했다면, Stack의 아래에서 위로 열린 순서가 남아 있고 맨 위가 다음에 닫아야 할 괄호다. 이것이 검사를 이어 가는 동안 유지할 불변식이다.

여는 괄호를 만나면 새로 끝내야 할 짝을 위에 넣는다. 닫는 괄호를 만나면 맨 위의 여는 괄호와 종류가 맞는지 확인하고 그 짝을 제거한다. 아래쪽 괄호를 먼저 꺼내면 안쪽 짝이 닫히기도 전에 바깥 짝을 닫게 된다. Queue에서 가장 먼저 연 `{`를 꺼내 `)`와 맞추려 하면, 올바른 입력 `{[()]}`도 제대로 처리하지 못한다.

### 문자마다 남아 있는 짝

`{[()]}`을 읽으면 Stack은 다음처럼 바뀐다. 오른쪽이 맨 위다.

| 읽은 문자 | 처리 후 Stack |
| --- | --- |
| `{` | `{` |
| `[` | `{ [` |
| `(` | `{ [ (` |
| `)` | `{ [` |
| `]` | `{` |
| `}` | 비어 있음 |

실패하는 시점은 세 가지다.

| 입력 예 | 실패 조건 | 이유 |
| --- | --- | --- |
| `)` | 닫는 괄호인데 Stack이 비어 있음 | 짝을 이룰 여는 괄호가 없다. |
| `([)]` | `)`에서 꺼낸 맨 위가 `[` | 열린 종류와 닫힌 종류가 다르다. |
| `(([]` | 입력을 다 읽었는데 `( (`가 남음 | 검사 중 짝이 맞았더라도 아직 닫히지 않은 괄호가 있다. |

종류가 맞는 짝만 제거하며 끝까지 읽었다면, 마지막에 Stack이 비어 있다는 조건으로 모든 여는 괄호까지 닫혔는지 확인할 수 있다. 중간의 불일치 검사와 마지막 빈 Stack 검사는 서로 다른 오류를 찾는다. [세 종류 괄호를 검사하는 Stack 알고리즘](https://algs4.cs.princeton.edu/13stacks/Parentheses.java.html)

### Python으로 판정하기

다음 `is_balanced()`는 문자열에서 `()[]{}`만 검사하고 나머지 문자는 무시한다. `pairs`는 닫는 괄호에서 필요한 여는 괄호를 찾는 표다. 빈 Stack에서 꺼내기 전에 검사하므로, 닫는 괄호가 먼저 나와도 `IndexError` 대신 `False`를 반환한다.

```run-python
def is_balanced(expr):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []

    for ch in expr:
        if ch in '([{':
            stack.append(ch)
        elif ch in ')]}':
            if not stack:
                return False

            top = stack.pop()
            if top != pairs[ch]:
                return False

    return len(stack) == 0

cases = [
    ("", True),
    ("{[()]}", True),
    ("([]){}", True),
    ("([)]", False),
    (")", False),
    ("(([]", False),
    ("a + (b * [c - d])", True),
    ('text = "("', False),
    ("<p></div>", True),
]

for expr, expected in cases:
    result = is_balanced(expr)
    print(f"{expr!r} -> {result}")
    if result != expected:
        raise AssertionError((expr, result, expected))
```

빈 문자열과 `{[()]}`, `([]){}`는 `True`다. `([)]`, `)`, `(([]`는 위 세 실패 조건에 따라 `False`다. 빈 문자열은 닫히지 않은 괄호가 없으므로 균형이 맞는 것으로 판정한다. [스택·큐 Q7. 괄호 균형 검사하기](https://cedis.tistory.com/174)

이 함수가 반환하는 값은 문자열 전체의 문법 판정이 아니다. 예를 들어 `text = "("` 안의 여는 괄호도 문자 그대로 세므로 결과는 `False`다. 반대로 `<p></div>`는 검사하는 괄호가 하나도 없어 `True`다. 따옴표·주석·Escape·태그 이름을 구분하지 않는다는 뜻이다. 수식이나 코드, 마크업의 중첩 구조를 다룰 때도 같은 원리를 활용할 수 있지만, 실제 언어를 처리하려면 토큰화와 그 언어의 문법 규칙이 더 필요하다.

### 한 번 훑는 비용

입력 문자가 n개라면 각 문자를 한 번 읽는다. 여는 괄호는 한 번 넣고, 짝이 맞는 닫는 괄호에서 한 번 꺼낸다. 괄호 종류가 고정되어 있고 Stack의 끝 연산을 상수 시간으로 계산하면 전체 시간은 O(n)이다. 앞에서 실패하면 남은 문자는 읽지 않는다.

Python List의 끝에 넣고 빼는 연산도 분할 상환 기준으로 계산한다. 한 번의 확장에서 저장 공간을 옮길 수 있지만, 그 비용을 여러 연산에 나누면 선형 횟수의 Stack 연산은 전체 O(n)으로 설명할 수 있다. [실행 버전 CPython 3.9.6의 List 확장·축소 구현](https://github.com/python/cpython/blob/v3.9.6/Objects/listobject.c)

검사 도중 아직 닫히지 않은 괄호가 가장 많을 때 d개라면 Stack에 저장하는 항목도 최대 d개다. 고정된 짝 표 등을 제외한 추가 공간은 O(d), 여는 괄호만 이어지는 최악의 입력에서는 O(n)이다. 이 계산은 연산 수와 최대 저장량에 대한 분석이며, 실행 시간이나 메모리 바이트 수를 측정한 결과는 아니다.

아직 끝나지 않은 대상을 역순으로 마무리하는 관점은 [재귀와 반복](/wiki/computer-science-topic-931a857d1d9a/)의 호출 문맥, [트리 순회](/wiki/computer-science-topic-17f8492e4ed6/)에서 남은 작업을 기억하는 방식으로 이어진다. 입력 크기에 따른 비용 표기는 [시간 복잡도](/wiki/computer-science-topic-869aa2bd6535/)에서 확인할 수 있다.

## 호출과 반환이 겹치는 순서

일반적인 중첩 함수 호출에서 `main`이 `load`를 부르고 `load`가 `parse`를 부르면, 정상 반환은 `parse → load → main` 순서로 일어난다. 나중에 시작한 호출이 끝나야 기다리던 호출을 이어 갈 수 있어 Call Stack으로 설명한다. 각 호출이 필요한 반환 위치와 지역 상태를 Stack Frame으로 다룬다.

이 설명이 모든 언어와 최적화에서 함수마다 물리적인 Frame 하나가 반드시 생긴다는 보장은 아니다. 인라인이나 꼬리 호출 최적화, Coroutine처럼 실행을 중단하고 재개하는 방식은 따로 살펴야 한다. 메모리 영역으로서의 Stack과 Heap은 [Stack과 Heap](/wiki/computer-systems-network-topic-3521ee6344f1/)에서 다룬다.

Stack은 저장 방식을 하나로 정하지 않는다. Array 끝을 사용하거나 Singly Linked List의 앞쪽에서 넣고 뺄 수 있다. Dynamic Array는 확장 비용을 여러 삽입에 나누어 설명하고, Linked List는 노드 할당 비용을 연결 변경과 구분한다. 어느 구현이든 뒤에 넣은 원소가 먼저 나와야 Stack의 규칙을 만족한다.
