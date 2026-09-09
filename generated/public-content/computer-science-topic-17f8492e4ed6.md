---
layout: default
title: 트리 순회
nav_order: 2
permalink: /wiki/computer-science-topic-17f8492e4ed6/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-17f8492e4ed6
projection_sha256: 145a55472f382d9d6f0fe661c2be7b1ce1dfd663563c99f52fca651ec2355ff5
parent: Tree
content_status: ready
public_parent_id: Wiki/keywords/computer-science-topic-a06ebc760118
search_terms:
- Tree Traversal
- 트리 순회
- 전위
- 중위
- 후위
- 레벨 순회
- preorder
- inorder
- postorder
- last_visited
grand_parent: 자료구조
ancestor: CS 기초
---

# 트리 순회
{: .no_toc }

같은 트리라도 부모를 언제 처리하느냐에 따라 방문 순서가 달라진다. 재귀 호출을 반복문으로 바꿀 때도 이 순서를 보존해야 한다. **호출 스택이 기억하던 다음 방문지와 돌아온 뒤 할 일을 명시적인 자료구조에 옮기는 것**이 핵심이다.

다음 이진 트리를 기준으로 전위·중위·후위·레벨 순회를 살펴보자.

```text
        A
      /   \
     B     C
    / \     \
   D   E     F
```

| 순회 | 부모를 처리하는 시점 | 방문 순서 |
|---|---|---|
| 전위 | 자식보다 먼저 | A B D E C F |
| 중위 | 왼쪽 하위 트리를 처리한 뒤, 오른쪽보다 먼저 | D B E A C F |
| 후위 | 왼쪽·오른쪽 자식의 처리를 마친 뒤 | D E B F C A |
| 레벨 | 같은 깊이의 앞선 노드를 처리한 뒤 | A B C D E F |

전위·중위·후위는 깊이 우선 순회다. 레벨 순회는 가까운 깊이부터 처리하는 BFS에 해당한다.

## 전위: 꺼내자마자 방문한다

전위 순회는 부모를 먼저 방문하므로 Stack에서 노드를 꺼내는 즉시 결과에 넣을 수 있다. 그다음 자식들을 넣는다. **왼쪽을 먼저 방문하려면 오른쪽 자식을 먼저 넣어야 한다.** Stack은 나중에 넣은 원소를 먼저 꺼내기 때문이다.

루트 A를 방문하고 C, B 순서로 넣으면 B가 먼저 나온다. B를 방문한 뒤에도 E, D 순서로 넣어 D를 먼저 처리한다. 아직 방문하지 않은 C는 Stack 안에 남아 있어 B의 하위 트리를 처리한 뒤 이어 갈 수 있다.

부모 노드를 먼저 복사하고 그 아래 자식 연결을 채우는 작업에 이 순서를 사용할 수 있다. 방문값만 나열하면 원래 구조를 구분할 수 없는 경우가 있으므로, 구조를 복원하려면 빈 자식 표시나 연결 정보도 함께 남겨야 한다.

## 중위: 왼쪽에서 돌아온 뒤 부모를 방문한다

중위 순회는 왼쪽 하위 트리 → 부모 → 오른쪽 하위 트리 순서다. 먼저 왼쪽 끝까지 내려가면서 부모들을 Stack에 남긴다. 더 내려갈 수 없으면 맨 위 노드를 꺼내 방문하고, 그 노드의 오른쪽 하위 트리로 간다. 오른쪽이 없으면 Stack에 남아 있는 다음 부모로 돌아온다.

위 트리에서는 D를 꺼낸 뒤 B를 방문하고, B의 오른쪽 E를 처리한 다음 A로 돌아온다. Binary Search Tree가 대소 배치 규칙을 지키면 이 순서로 값이 정렬되어 나온다. 일반적인 Binary Tree에는 그런 보장이 없다.

## 후위: 자식 처리가 끝날 때까지 부모를 남겨 둔다

후위 순회에서는 Stack에서 노드를 보았다고 곧바로 결과에 넣을 수 없다. 부모보다 자식이 먼저 나와야 하기 때문이다. 한 개의 Stack으로 구현할 때는 다음 상태를 함께 사용한다.

- `current`: 지금 내려가서 살펴볼 노드다. 왼쪽 자식을 따라 내려가며 Stack에 쌓는다.
- `peek`: Stack 맨 위에서 처리를 기다리는 노드다. 아직 꺼내지 않고 오른쪽 자식을 확인한다.
- `last_visited`: 가장 최근에 결과에 넣고 Stack에서 꺼낸 노드다.

왼쪽으로 더 내려갈 수 없을 때 `peek.right`가 있고 그 오른쪽 자식이 `last_visited`와 다른 객체라면, 오른쪽 하위 트리를 먼저 처리한다. 오른쪽 자식이 없거나 이미 처리했다면 그제야 부모를 결과에 넣고 꺼낸다.

기본 트리의 B 하위 트리를 모두 처리한 뒤를 따라가 보자. Stack 표기는 왼쪽이 바닥이고 오른쪽이 꼭대기다.

| 남은 Stack | `last_visited` | 판단 |
|---|---|---|
| A | B | A의 오른쪽 C를 아직 처리하지 않았으므로 C로 간다 |
| A, C | B | C의 오른쪽 F를 아직 처리하지 않았으므로 F로 간다 |
| A, C | F | C의 오른쪽 처리가 끝났으므로 C를 방문하고 꺼낸다 |
| A | C | A의 오른쪽 처리가 끝났으므로 A를 방문하고 꺼낸다 |

오른쪽 하위 트리를 후위로 처리하면 그 하위 트리의 루트가 마지막에 나온다. 그래서 `last_visited is peek.right`가 오른쪽 처리가 끝났다는 표시가 될 수 있다. 값이 같은 노드가 여러 개 있어도 이 판단은 **값의 같음이 아니라 노드 객체의 동일성**을 확인해야 한다.

## 레벨: 먼저 기다리던 노드부터 꺼낸다

레벨 순회에서는 Queue 앞에서 노드를 꺼내 방문하고, 왼쪽·오른쪽 자식을 뒤에 넣는다. A를 꺼낸 뒤에는 B, C가 기다린다. B가 D, E를 추가해도 먼저 기다리던 C가 D, E보다 앞에서 처리된다.

왼쪽 자식을 먼저 넣는 순서가 같은 깊이의 왼쪽부터 방문하는 순서를 만든다. Queue를 그대로 Stack으로 바꾸면 일반적인 트리에서 이 레벨 순서를 보장하지 못한다. 부모를 꺼낸 순간 방문한다는 점이 전위와 비슷해 보여도, 다음 노드를 고르는 규칙이 다르다.

## 노드 정의부터 결과 확인까지 실행하기

예제는 순환이나 공유 자식이 없는 유한한 이진 트리를 입력으로 받는다. 순회 중에 자식 연결을 바꾸지 않는다. 임의의 그래프를 넣어 중복 방문과 순환까지 처리하는 함수는 아니므로, 그런 입력에는 방문 기록 등 별도 정책이 필요하다.

```run-python
from collections import deque


class Node:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def preorder(root):
    if root is None:
        return []
    result, stack = [], [root]
    while stack:
        node = stack.pop()
        result.append(node.val)
        if node.right is not None:
            stack.append(node.right)
        if node.left is not None:
            stack.append(node.left)
    return result


def postorder(root):
    result, stack = [], []
    current, last_visited = root, None
    while current is not None or stack:
        if current is not None:
            stack.append(current)
            current = current.left
        else:
            peek = stack[-1]
            if peek.right is not None and last_visited is not peek.right:
                current = peek.right
            else:
                result.append(peek.val)
                last_visited = stack.pop()
    return result


def level_order(root):
    if root is None:
        return []
    result, queue = [], deque([root])
    while queue:
        node = queue.popleft()
        result.append(node.val)
        if node.left is not None:
            queue.append(node.left)
        if node.right is not None:
            queue.append(node.right)
    return result


tree = Node("A", Node("B", Node("D"), Node("E")),
            Node("C", None, Node("F")))
cases = [
    ("기본 트리", tree, list("ABDECF"), list("DEBFCA"), list("ABCDEF")),
    ("빈 트리", None, [], [], []),
    ("한 노드", Node(0), [0], [0], [0]),
    ("왼쪽 사슬", Node("A", Node("B", Node("C"))),
     list("ABC"), list("CBA"), list("ABC")),
    ("오른쪽 사슬", Node("A", None, Node("B", None, Node("C"))),
     list("ABC"), list("CBA"), list("ABC")),
    ("같은 값의 별개 노드", Node("R", Node("x"), Node("x")),
     list("Rxx"), list("xxR"), list("Rxx")),
]
for name, root, expected_pre, expected_post, expected_level in cases:
    actual = [preorder(root), postorder(root), level_order(root)]
    assert actual == [expected_pre, expected_post, expected_level], (name, actual)
    print(name)
    for label, values in zip(("전위", "후위", "레벨"), actual):
        print(f"  {label}: {values}")
print(f"확인: 트리 {len(cases)}개, 순회 3종의 결과 일치")
```

기본 트리의 전위·후위·레벨 결과는 위 표와 일치한다. 빈 트리는 빈 List를 반환하고, 한 노드의 값이 0이어도 빠뜨리지 않는다. 왼쪽이나 오른쪽 자식만 있는 사슬도 처리하며, 값이 같은 두 자식은 각각 방문한다.

Queue에는 `collections.deque`를 사용했다. Python List의 `pop(0)`은 뒤 원소의 참조들을 옮겨야 하지만, `deque`는 양 끝의 추가·제거에 대략 O(1) 성능을 제공한다. [Python deque의 연산 조건](https://docs.python.org/3/library/collections.html#collections.deque)

## 재귀의 방문 위치와 중위 순회를 비교하기

재귀로는 두 자식 호출에 대한 방문 위치를 바꾸어 세 깊이 우선 순회를 표현할 수 있다. `result.append(node.val)`을 두 호출 앞에 두면 전위, 사이에 두면 중위, 뒤에 두면 후위다. 방문 결과를 바로 표시하려면 같은 위치에서 `print(node.val)`을 호출하면 된다.

다음 예제는 [Tree](/wiki/computer-science-topic-a06ebc760118/)에서 살펴본 숫자 트리를 사용한다. 앞의 문자 트리와 달리 6은 3의 왼쪽 자식이다.

```text
        1
      /   \
     2     3
    / \   /
   4   5 6
```

```run-python
class Node:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def recursive_order(root, order):
    if order not in ("pre", "in", "post"):
        raise ValueError("알 수 없는 순회 방식")
    result = []

    def visit(node):
        if node is None:
            return
        if order == "pre":
            result.append(node.val)
        visit(node.left)
        if order == "in":
            result.append(node.val)
        visit(node.right)
        if order == "post":
            result.append(node.val)

    visit(root)
    return result


def inorder(root):
    result, stack = [], []
    current = root
    while current is not None or stack:
        while current is not None:
            stack.append(current)
            current = current.left
        current = stack.pop()
        result.append(current.val)
        current = current.right
    return result


tree = Node(1, Node(2, Node(4), Node(5)), Node(3, Node(6)))
cases = [
    ("숫자 트리", tree, [1, 2, 4, 5, 3, 6], [4, 2, 5, 1, 6, 3], [4, 5, 2, 6, 3, 1]),
    ("빈 트리", None, [], [], []),
    ("한 노드", Node(0), [0], [0], [0]),
    ("왼쪽 사슬", Node(1, Node(2, Node(3))), [1, 2, 3], [3, 2, 1], [3, 2, 1]),
    ("오른쪽 사슬", Node(1, None, Node(2, None, Node(3))), [1, 2, 3], [1, 2, 3], [3, 2, 1]),
    ("같은 값의 별개 노드", Node(1, Node(2), Node(2)), [1, 2, 2], [2, 1, 2], [2, 2, 1]),
]
for name, root, expected_pre, expected_in, expected_post in cases:
    expected = [expected_pre, expected_in, expected_post]
    actual = [recursive_order(root, order) for order in ("pre", "in", "post")]
    assert actual == expected, (name, actual)
    assert inorder(root) == expected_in, name
    print(f"{name}: 전위={actual[0]}, 중위={actual[1]}, 후위={actual[2]}")
print(f"확인: 트리 {len(cases)}개, 재귀 3종과 반복 중위 결과 일치")
```

숫자 트리의 전위는 `1 2 4 5 3 6`, 중위는 `4 2 5 1 6 3`, 후위는 `4 5 2 6 3 1`이다. 같은 트리를 앞의 레벨 순회 방식으로 방문하면 `1 2 3 4 5 6` 순서가 된다.

`visit(node.left)`가 끝나면 그 호출 다음 줄로 돌아온다. 중위는 여기서 부모를 결과에 넣고 오른쪽으로 간다. 반복 구현의 Stack은 이때 다시 처리할 부모 경로를 직접 보관한다. 위 재귀 구현은 호출 깊이가 트리 높이만큼 늘어나므로, 깊은 입력에는 Python의 재귀 깊이 제한도 고려해야 한다.

## Stack이 한 개여도 공간이 O(1)은 아니다

노드 수를 n, 트리의 높이를 h, 한 레벨에 있는 최대 노드 수를 w라고 하자. 높이는 루트에서 가장 깊은 리프까지의 노드 수로 센다. 노드 하나의 방문·연결 확인을 일정한 비용으로 볼 때 위 구현들의 시간은 모두 O(n)이다. 각 노드를 일정한 횟수만 방문하고, 반복 구현도 일정한 횟수만 Stack이나 Queue에 넣고 꺼내기 때문이다.

| 구현 | 결과 List를 제외한 보조 공간 | 기억하는 것 |
|---|---|---|
| 재귀 전위·중위·후위 | O(h) | 호출이 끝나면 돌아갈 부모 경로 |
| 반복 전위 | O(h) 이내 | 아직 방문하지 않은 형제와 다음 방문지 |
| 반복 중위 | O(h) | 왼쪽 자식 처리가 끝나면 방문할 부모 경로 |
| 한 Stack 후위 | O(h) | 돌아갈 부모 경로와 오른쪽 처리 상태 |
| 레벨 | O(w) | 현재·다음 레벨에서 방문을 기다리는 노드 |

레벨 순회의 Queue에는 현재 레벨의 남은 노드와 다음 레벨의 일부가 함께 들어갈 수 있다. 따라서 Queue의 실제 길이가 매 순간 한 레벨의 노드 수와 같다는 뜻은 아니다.

한쪽으로 기운 트리는 h가 n까지 커질 수 있다. 후위 순회의 Stack 한 개도 그만큼 많은 노드를 담을 수 있다. 또한 위 함수들은 모든 방문 결과를 List로 반환하므로 **결과 저장 자체에 O(n) 공간**이 든다. 표는 이 출력 공간을 제외한 보조 공간을 비교한다.

반복으로 구현한 함수들은 순회 깊이만큼 Python 함수를 중첩 호출하지 않는다. 대신 Stack과 Queue가 필요한 상태를 보관한다. 재귀 깊이 제한을 피한다는 이유만으로 메모리 제한까지 사라졌다고 판단해서는 안 된다.

## 방문 시점과 다음 후보를 함께 고른다

부모를 먼저 처리해야 하면 전위, Binary Search Tree의 정렬된 값이 필요하면 중위, 자식 결과를 모은 뒤 부모를 처리해야 하면 후위, 루트에서 가까운 깊이부터 살펴야 하면 레벨 순회를 선택할 수 있다. 같은 알고리즘을 반복으로 옮길 때는 다음 방문지를 저장하는 규칙과 결과에 넣는 시점을 함께 보존해야 한다. 전위 재귀를 Queue로 바꾸는 것만으로 같은 전위 순서가 유지되지는 않는다.

[Tree](/wiki/computer-science-topic-a06ebc760118/)는 입력 구조를, [Stack](/wiki/computer-science-topic-39fd55620efd/)과 [Queue](/wiki/computer-science-topic-fd1595b77add/)는 후보를 꺼내는 규칙을 설명한다. 호출의 상태를 직접 저장하는 이유는 [재귀와 반복](/wiki/computer-science-topic-931a857d1d9a/)으로 이어진다.
