---
layout: default
title: 위상 정렬
nav_order: 5
permalink: /wiki/computer-science-topic-af71338cd6a3/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-af71338cd6a3
projection_sha256: 3ebe615cc716c92e5685a83e7def87bd952c6660ca7c5429c2a7a1dd31c6f3af
parent: 그래프 알고리즘
content_status: ready
public_parent_id: Wiki/keywords/computer-science-topic-f8706f61ab70
search_terms:
- 위상 정렬
- Topological Sort
- Kahn
- DAG
- 진입 차수
- indegree
- topological_sort
- 위상 정렬 — 먼저 해야 하는 일을 먼저 세우는 정렬
- 사이클
grand_parent: 알고리즘
ancestor: CS 기초
---

# 위상 정렬
{: .no_toc }

자료구조를 배운 뒤 알고리즘과 운영체제를 들을 수 있고, 알고리즘을 배운 뒤 그래프 문제를 풀 수 있다고 하자. 과목 이름이나 번호를 크기순으로 정렬하는 것으로는 이 조건을 지킬 수 없다. 각 과목을 정점으로, 먼저 배워야 하는 관계를 방향 간선으로 나타낸 [Graph](/wiki/computer-science-topic-1a8e559de264/)가 필요하다.

간선 `u → v`는 `u`를 `v`보다 앞에 놓으라는 조건이다. **위상 정렬(Topological Sort)**은 모든 정점을 한 번씩 나열하면서 모든 간선에 대해 이 조건을 지키는 순서를 만든다. 선수 과목뿐 아니라 빌드와 작업 의존성에도 같은 표현을 사용할 수 있다.

## 남은 선행 조건이 없는 정점부터 고른다

과목에 번호를 붙이면 다음과 같다. 간선은 `(0, 1)`, `(1, 2)`, `(0, 3)`이며, 출발 정점에서 도착 정점으로 향한다.

| 정점 | 과목 | 먼저 필요한 과목 |
| --- | --- | --- |
| 0 | 자료구조 | 없음 |
| 1 | 알고리즘 | 자료구조 |
| 2 | 그래프 문제 | 알고리즘 |
| 3 | 운영체제 | 자료구조 |

정점으로 들어오는 간선의 수를 **진입 차수(in-degree)**라고 한다. 처음에는 `indegree = [0, 1, 1, 1]`이다. 자료구조만 선행 조건이 없으므로 첫 후보가 된다.

Kahn 알고리즘은 아직 결과에 넣지 않은 정점 중 **남은 진입 차수가 0인 정점**을 [Queue](/wiki/computer-science-topic-fd1595b77add/)에 넣는다. Queue에서 하나를 꺼내 결과에 추가하면, 그 정점에서 나가는 간선마다 도착 정점의 진입 차수를 1씩 줄인다. 이때 새로 0이 된 정점만 후보로 추가한다.

`indegree[v]`는 진행 중에도 원래 그래프의 진입 차수를 그대로 뜻하는 것이 아니다. **아직 결과에 배치하지 않은 선행 정점에서 v로 들어오는 간선의 수**를 뜻한다. 따라서 선행 정점이 두 개라면 하나를 처리했다고 곧바로 v를 넣을 수 없고, 나머지 하나까지 처리해 0이 되어야 한다.

여기서 정점을 처리한다는 말은 순서 목록에 배치한다는 뜻이다. 실제 빌드 작업을 예약할 때는 작업의 완료 여부를 별도로 관리해야 한다.

## 진입 차수가 줄면 Queue는 어떻게 달라질까

아래 표는 앞의 과목 번호와 간선 나열 순서로 코드를 따라간 상태다. `graph[0]`에는 1 다음에 3이 들어 있고, Queue는 먼저 들어온 정점을 먼저 꺼낸다. 진입 차수 배열의 칸은 0·1·2·3 순서다.

| 단계 | 결과 order | 다음 Queue | 남은 진입 차수 |
| --- | --- | --- | --- |
| 초기 | [] | [0] | [0, 1, 1, 1] |
| 0 처리 | [0] | [1, 3] | [0, 0, 1, 0] |
| 1 처리 | [0, 1] | [3, 2] | [0, 0, 0, 0] |
| 3 처리 | [0, 1, 3] | [2] | [0, 0, 0, 0] |
| 2 처리 | [0, 1, 3, 2] | [] | [0, 0, 0, 0] |

0을 처리하면 1과 3이 함께 후보가 된다. 1을 처리해 2도 준비되지만, 이미 Queue에서 기다리던 3이 먼저 나온다. 결과는 **자료구조 → 알고리즘 → 운영체제 → 그래프 문제**다.

1과 3 사이에는 선행 관계가 없으므로 `[0, 3, 1, 2]`도 유효하다. 위상 정렬은 답이 여러 개일 수 있다. 이 구현에서 초기 후보는 정점 번호 순서로 들어가고, 이후 후보의 순서는 간선이 인접 목록에 들어간 순서에도 영향을 받는다. 가능한 정점 중 항상 가장 작은 번호를 고르는 규칙은 아니다.

Queue를 쓴다고 [BFS](/wiki/computer-science-bfs-00637871e6a7/)의 최단 거리 탐색과 같은 것은 아니다. BFS는 정점을 발견하는 시점에 후보로 넣지만, Kahn 알고리즘은 모든 선행 간선이 해결되어 진입 차수가 0이 된 시점에 넣는다. Queue의 변화는 [[정글 베이직 25] 위상 정렬(Topological Sort) 완전 정리](https://cedis.tistory.com/75)의 과목 예제와 비교해 볼 수 있다.

## Queue가 비었는데 정점이 남는 이유

`A → B → C → A`처럼 자기 자신으로 돌아오는 방향 경로가 있으면 선행 관계가 순환한다. A보다 C가 먼저, C보다 B가 먼저, B보다 A가 먼저여야 하므로 이 세 정점을 모두 만족시키는 첫 순서를 고를 수 없다. 이 예제는 세 정점의 초기 진입 차수가 모두 1이어서 Queue가 처음부터 비어 있다.

방향 사이클이 없는 그래프를 **DAG(Directed Acyclic Graph)**라고 한다. 전체 정점에 대한 위상 순서가 존재하는 조건은 그래프가 DAG인 것이다. 방향 사이클이 하나라도 있으면 전체 순서를 완성할 수 없다. [DAG와 위상 순서의 관계](https://algs4.cs.princeton.edu/42digraph/)

다만 사이클이 있다는 이유로 그래프의 모든 정점이 처음부터 막히는 것은 아니다. `0 → 1`과 별개로 `2 → 3 → 2`, `3 → 4`가 있다면 0과 1은 먼저 배치할 수 있다. 그 뒤에는 2·3의 순환이 해소되지 않아 Queue가 비고, 4도 선행 정점 3을 기다린다. 4는 사이클 자체에 속하지 않지만 처리되지 않는다.

그래서 **미처리 정점 전부가 사이클의 구성원이라고 단정하면 안 된다.** 남은 부분에 사이클이 존재한다고 판단하는 것이고, 실제 사이클 경로나 구성 정점을 반환하는 검사는 별도다.

Queue가 비었을 때 아직 정점이 남았다면, 남은 모든 정점에 다른 미처리 정점에서 들어오는 간선이 있다. 그 선행 정점을 계속 거슬러 올라가면 유한한 정점 중 하나를 다시 만나므로 방향 사이클이 생긴다. 반대로 모든 정점이 결과에 들어갔다면 각 간선의 출발 정점이 먼저 배치되었다. 코드 마지막의 `len(order) != num_nodes` 검사는 이 완료 조건을 확인한다.

## 모든 간선의 앞뒤 관계를 실행으로 확인한다

다음 프로그램의 `num_nodes`는 0 이상의 정점 수이고, 간선의 두 끝점은 `0`부터 `num_nodes - 1`까지의 정수다. 예제는 이 범위의 입력을 제공하며, 함수 안에서 잘못된 정점 번호나 입력 타입을 별도로 검사하지는 않는다.

`topological_sort()`는 새 인접 목록과 진입 차수 배열을 만들어 입력 간선 목록을 바꾸지 않는다. 사이클 때문에 전체 순서를 완성하지 못하면 부분 결과를 반환하지 않고 `ValueError("cycle detected")`를 발생시킨다.

`check_order()`는 결과가 모든 정점의 순열인지 확인하고, 각 간선 `u → v`에 대해 결과에서 u의 위치가 v보다 앞인지 검사한다. 가능한 순서가 여러 개이므로 특정 순서 하나와 같다는 것만을 정답 조건으로 삼지 않는다.

```run-python
from collections import deque

def topological_sort(num_nodes, edges):
    graph = [[] for _ in range(num_nodes)]
    indegree = [0] * num_nodes

    for u, v in edges:
        graph[u].append(v)
        indegree[v] += 1

    q = deque(i for i in range(num_nodes) if indegree[i] == 0)
    order = []

    while q:
        u = q.popleft()
        order.append(u)

        for v in graph[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                q.append(v)

    if len(order) != num_nodes:
        raise ValueError("cycle detected")

    return order


def check_order(num_nodes, edges, order):
    assert len(order) == num_nodes
    assert set(order) == set(range(num_nodes))
    position = {node: i for i, node in enumerate(order)}
    assert all(position[u] < position[v] for u, v in edges)


valid_cases = (
    ("empty", 0, []),
    ("isolated", 4, []),
    ("courses", 4, [(0, 1), (1, 2), (0, 3)]),
    ("same DAG, different edge order", 4, [(0, 3), (0, 1), (1, 2)]),
    ("two prerequisites", 4, [(0, 2), (1, 2), (2, 3)]),
    ("disconnected", 6, [(0, 1), (2, 3)]),
    ("duplicate edge", 2, [(0, 1), (0, 1)]),
)
for name, num_nodes, edges in valid_cases:
    before = edges.copy()
    order = topological_sort(num_nodes, edges)
    check_order(num_nodes, edges, order)
    assert edges == before
    print(f"{name}: {order}; all edges respected")

cyclic_cases = (
    ("self-loop", 1, [(0, 0)]),
    ("three-node cycle", 3, [(0, 1), (1, 2), (2, 0)]),
    ("cycle after independent work", 5, [(0, 1), (2, 3), (3, 2), (3, 4)]),
)
for name, num_nodes, edges in cyclic_cases:
    before = edges.copy()
    try:
        topological_sort(num_nodes, edges)
    except ValueError as error:
        assert str(error) == "cycle detected"
        assert edges == before
        print(f"{name}: {error}")
    else:
        raise AssertionError("cycle must not return an order")

```

프로그램을 실행해 확인한 결과다. 정상 입력에서는 실제 순서와 선행 관계 검사를, 사이클 입력에서는 전체 순서를 반환하지 않고 발생시킨 오류를 볼 수 있다.

```text
empty: []; all edges respected
isolated: [0, 1, 2, 3]; all edges respected
courses: [0, 1, 3, 2]; all edges respected
same DAG, different edge order: [0, 3, 1, 2]; all edges respected
two prerequisites: [0, 1, 2, 3]; all edges respected
disconnected: [0, 2, 4, 5, 1, 3]; all edges respected
duplicate edge: [0, 1]; all edges respected
self-loop: cycle detected
three-node cycle: cycle detected
cycle after independent work: cycle detected
```

`courses`와 `same DAG, different edge order`는 같은 선행 관계를 다른 순서로 입력했다. 반환 순서는 다르지만 둘 다 모든 간선을 만족한다. `two prerequisites`에서는 2로 들어오는 두 선행 간선이 모두 해결되어야 2가 후보가 된다.

`isolated`와 `disconnected`에서는 한 시작점에서 갈 수 없는 정점도 결과에 포함된다. 위상 정렬은 그래프 전체의 선행 순서를 구하므로, 고립된 정점도 빠뜨리지 않는다. 빈 그래프의 빈 순서는 처리하지 못한 정점이 없는 정상 결과다.

`duplicate edge`에서는 같은 간선을 입력한 횟수만큼 진입 차수도 늘고 줄어 결과가 유지된다. 자기 자신으로 향하는 간선은 선행 조건을 스스로 해결할 수 없으므로 사이클이다. 마지막 사례는 독립된 작업을 배치할 수 있어도 나머지에 사이클이 있으면 전체 정렬이 실패한다는 것을 보여 준다.

## DFS의 첫 방문 순서와는 다르다

[DFS](/wiki/computer-science-dfs-278d75d9bc61/)로도 위상 순서를 구할 수 있다. DAG의 모든 정점을 대상으로 DFS를 수행하고 **종료 순서를 뒤집으면** 된다. 정점에 처음 들어간 순서를 그대로 쓰는 것은 아니다. 아직 방문하지 않은 연결 부분이 있으면 새 시작점에서도 탐색해야 한다. [DFS의 종료 순서와 위상 정렬](https://algs4.cs.princeton.edu/42digraph/)

이 방법에서는 방향 사이클을 검사하는 조건도 필요하다. 단순한 visited 여부와 현재 탐색 경로에 남아 있는 상태를 구분해야 한다는 설명은 DFS에서 이어서 볼 수 있다.

Kahn 알고리즘에서는 정점 배열을 만들고 각 간선을 세며, 각 정점을 최대 한 번 Queue에 넣고 각 간선 항목을 최대 한 번 줄인다. 인접 목록으로 구현한 시간 복잡도는 O(V + E)다. V는 정점 수, E는 저장한 방향 간선 수이며 같은 간선을 두 번 입력했다면 두 항목으로 센다. 그래프 저장 공간을 제외한 진입 차수·Queue·결과 목록은 O(V), 함수가 만드는 인접 목록까지 포함하면 O(V + E) 공간이다. [Queue 기반 위상 정렬의 비용](https://algs4.cs.princeton.edu/42digraph/TopologicalX.java.html)

이것은 CPU 명령 수나 실행 시간을 측정한 값이 아니라 입력 크기에 따른 [시간 복잡도](/wiki/computer-science-topic-869aa2bd6535/) 분석이다. 순서가 하나 나왔다는 사실만으로 병렬 작업 시간이 최소가 되거나 어떤 비용이 최적이라는 보장은 없다.

DAG에서 선행 상태의 계산을 먼저 끝내야 하는 [DP](/wiki/computer-science-topic-7a70b4370929/)를 구성할 때도 위상 순서를 사용할 수 있다. 하지만 준비된 후보 중 어떤 선택이 비용까지 최적으로 만드는지는 [Greedy](/wiki/computer-science-topic-20932461ee68/)처럼 선택의 근거를 따로 따지는 문제다. 위상 정렬이 보장하는 것은 지정한 선행 관계를 만족하는 순서다.
