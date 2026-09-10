---
layout: default
title: 동적 계획법
nav_order: 8
permalink: /wiki/computer-science-topic-7a70b4370929/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-7a70b4370929
projection_sha256: 070fa3ce2a12044943b052375f13efd8a2db4f2892c7ace8e77ff9e318dc735b
parent: 알고리즘
content_status: ready
public_parent_id: Wiki/computer-science/algorithms
search_terms:
- DP
- Dynamic Programming
- Fibonacci
- 피보나치
- TSP
- 외판원 순회
- 비트마스크 DP
grand_parent: CS 기초
---

# 동적 계획법
{: .no_toc }

`fib(5)`를 정의 그대로 계산하면 `fib(4)`와 `fib(3)`을 구해야 한다. 그런데 `fib(4)`도 다시 `fib(3)`을 부른다. 처음 구한 `fib(3)`의 답을 적어 두면 같은 문제를 처음부터 풀 필요가 없다.

**동적 계획법(Dynamic Programming, DP)**은 이렇게 같은 부분 문제의 답을 공유하는 방법이다. 중요한 것은 표를 만드는 문법보다 **어떤 경우를 같은 문제로 볼 것인가**다. 피보나치에서는 `n` 하나면 충분하지만, 외판원 순회에서는 현재 도시와 방문한 도시 집합이 함께 필요하다.

## 같은 부분 문제가 여러 경로에서 나타난다

피보나치 수는 `F(0) = 0`, `F(1) = 1`, `F(n) = F(n-1) + F(n-2)`로 정한다. 순수 재귀의 `fib(5)`에서는 다음 두 경로가 같은 `fib(3)`으로 이어진다.

```text
fib(5) → fib(3)
fib(5) → fib(4) → fib(3)
```

각 호출을 따로 펼치면 `fib(3)` 아래의 계산도 반복된다. `fib(0)`과 `fib(1)`에서 끝내는 순수 재귀의 호출 횟수는 다음과 같다.

| 호출 | fib(5) | fib(4) | fib(3) | fib(2) | fib(1) | fib(0) |
| --- | --- | --- | --- | --- | --- | --- |
| 등장 횟수 | 1 | 1 | 2 | 3 | 5 | 3 |

합하면 15회지만 서로 다른 문제는 0부터 5까지 여섯 개다. 이를 **중복 부분 문제(overlapping subproblems)**라고 한다. 같은 입력의 답이 이후에도 유효하다면 한 번 계산한 값을 저장해 재사용할 수 있다. [MIT의 부분 문제와 Memoization 설명](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/resources/lecture-19-dynamic-programming-i-fibonacci-shortest-paths/)

순수 재귀의 호출 수 `C(n)`은 `C(0) = C(1) = 1`, `C(n) = 1 + C(n-1) + C(n-2)`다. 따라서 `C(n) = 2F(n+1) - 1`이고 황금비 `φ`에 대해 `Θ(φ^n)`으로 증가한다. 특정 노트북에서 몇 초 걸렸다는 측정 없이도 중복 계산이 빠르게 늘어나는 이유를 설명할 수 있다.

## Top-down은 저장하며 내려가고 Bottom-up은 차례로 채운다

**Memoization**은 재귀로 필요한 문제를 찾아 내려가면서 답을 Cache에 저장한다. 이미 구한 값이면 곧바로 반환한다. **Tabulation**은 작은 문제부터 순서대로 표를 채운다. 두 방법이 같은 점화식과 기초값을 사용하면 같은 답을 얻는다.

| 방향 | 계산 순서 | 함께 관리할 것 |
| --- | --- | --- |
| Top-down | 요청한 문제에서 필요한 부분 문제로 내려감 | Cache와 재귀 호출 Stack |
| Bottom-up | 의존하는 작은 답을 먼저 계산함 | 표를 채우는 순서와 기초값 |

아래 `fib_dp`의 `table[i]`는 `F(i)`다. `table[0]`, `table[1]`을 먼저 정하고, `i = 2`부터 앞의 두 값을 더한다. `fib_memo`도 같은 식을 쓰되 `cache`에 답이 있는지 먼저 본다. 이 예제는 0과 1도 Cache에 저장한다. `cache`를 직접 전달할 때는 이 점화식으로 계산한 값을 보관하는 용도로만 사용한다.

```run-python
def fib_dp(n):
    if n < 0:
        raise ValueError("n must be nonnegative")
    if n < 2:
        return n
    table = [0] * (n + 1)
    table[1] = 1
    for i in range(2, n + 1):
        table[i] = table[i - 1] + table[i - 2]
    return table[n]


def fib_memo(n, cache=None):
    if n < 0:
        raise ValueError("n must be nonnegative")
    if cache is None:
        cache = {}
    if n in cache:
        return cache[n]
    if n < 2:
        cache[n] = n
    else:
        cache[n] = fib_memo(n - 1, cache) + fib_memo(n - 2, cache)
    return cache[n]


def main():
    calls = 0

    def naive(n):
        nonlocal calls
        calls += 1
        return n if n < 2 else naive(n - 1) + naive(n - 2)

    assert naive(5) == 5 and calls == 15
    print(f"naive fib(5): value=5; calls={calls}")
    cache = {}
    assert fib_memo(5, cache) == 5 and len(cache) == 6
    print(f"memo fib(5): value=5; stored states={len(cache)}")
    assert fib_dp(5) == 5
    print("table fib(5): value=5")
    for n, answer in [(0, 0), (1, 1), (10, 55), (50, 12586269025)]:
        assert fib_memo(n) == fib_dp(n) == answer
        print(f"memo/table fib({n}): {answer}")
    for function in (fib_dp, fib_memo):
        try:
            function(-1)
        except ValueError:
            pass
        else:
            raise AssertionError("negative n was accepted")
    print("negative n: rejected; all checks passed")


if __name__ == "__main__":
    main()
```

실행 출력은 다음과 같다.

```text
naive fib(5): value=5; calls=15
memo fib(5): value=5; stored states=6
table fib(5): value=5
memo/table fib(0): 0
memo/table fib(1): 1
memo/table fib(10): 55
memo/table fib(50): 12586269025
negative n: rejected; all checks passed
```

순수 재귀는 작은 `5`에만 실행해 15회 호출을 확인했다. 같은 값을 Memoization으로 구했을 때는 여섯 상태가 저장됐다. `0`, `1`, `10`, `50`의 답도 두 구현이 일치한다. 음수는 피보나치 입력 범위에서 제외하며 `ValueError`로 알린다.

DP를 적용한 두 구현은 `n + 1`개의 상태에서 상수 횟수의 산술 연산을 하므로 **산술 연산 횟수**가 `O(n)`이다. Python 정수는 값이 커질수록 자릿수와 덧셈 비용도 늘어나므로 모든 크기의 정수 덧셈이 같은 실제 시간을 쓴다는 뜻은 아니다. 표와 Cache에는 `O(n)`개의 정수가 필요하고 Top-down에는 재귀 Stack도 필요하다. 큰 `n`에서는 재귀 깊이 제한을 고려해야 한다. 최종 답만 필요하면 Bottom-up에서 직전 두 값만 남겨 저장하는 정수 개수를 줄일 수 있다.

## 최적값을 구하려면 상태와 전이가 충분해야 한다

피보나치는 최적해를 고르는 문제가 아니라 수열 값을 계산하는 문제다. DP가 최적화 문제에만 쓰이는 것은 아니다. 최솟값·최댓값을 구하는 문제에서는 **최적 부분 구조(optimal substructure)**를 따진다. 전체 최적해 안의 부분 선택을 더 좋은 부분해로 바꿀 수 있다면 전체 값도 좋아져야 한다는 관계다.

최적 부분 구조만 있다고 DP의 이점이 생기는 것은 아니다. 서로 겹치지 않는 부분 문제라면 [Quick Sort](/wiki/computer-science-topic-0865c05ef97a/) 같은 분할 정복으로도 충분할 수 있다. 반대로 겹치는 문제가 있어도, 상태에서 필요한 조건을 빠뜨리면 서로 다른 문제의 답을 잘못 공유하게 된다.

최단 경로나 배낭 문제에서도 먼저 남은 답을 결정하는 상태, 가능한 선택, 종료 조건을 정한다. 예를 들어 배낭에서는 남은 용량뿐 아니라 사용할 수 있는 물건 범위가 필요한 경우가 있다. 이름을 DP라고 붙이거나 Cache를 추가하는 것만으로 정답이 보장되지는 않는다.

[Greedy](/wiki/computer-science-topic-20932461ee68/)는 각 단계에서 한 선택을 확정해 다른 후보를 버린다. DP는 상태별로 필요한 후보를 비교하고 답을 공유한다. Greedy에서는 버린 선택을 나중에 되살릴 필요가 없다는 정당성까지 필요하다. 그 조건을 확인하지 못했다면 반례를 찾고 DP나 다른 탐색 방법을 검토한다.

## 외판원 순회에서는 현재 도시와 방문 집합을 묶는다

외판원 순회(TSP)는 모든 도시를 한 번씩 방문한 뒤 출발점으로 돌아오는 최소 비용 경로를 찾는다. 출발점을 `0`으로 고정해도 나머지 도시의 방문 순서는 `(N - 1)!`개다. 방문 순서 전체를 각각 계산하는 대신, 앞으로 해야 할 일이 같은 경우를 하나의 상태로 묶는다.

다음 함수의 뜻을 먼저 정한다.

```text
dp(cur, visited)
  = cur에서 출발해 아직 방문하지 않은 도시를 모두 방문하고
    0으로 돌아가는 데 필요한 최소 추가 비용
```

도시가 다섯 개일 때 `0 → 1 → 2 → 3`과 `0 → 2 → 1 → 3`은 모두 현재 도시가 `3`이고 방문 집합이 `{0, 1, 2, 3}`이다. 이제 남은 일은 도시 `4`를 거쳐 `0`으로 돌아가는 것이다. 여기까지 든 비용은 서로 다를 수 있지만 **앞으로 필요한 최소 추가 비용**은 공유한다. 반면 `0 → 1 → 2`와 `0 → 3 → 2`는 현재 도시만 같고 방문 집합은 다르므로 같은 상태가 아니다.

이 상태가 충분한 이유는 이동 비용이 현재 도시와 다음 도시로 정해지고, 남은 선택을 방문 집합으로 판별할 수 있기 때문이다. 방문 시간 제한이나 남은 연료처럼 미래 선택에 영향을 주는 조건이 추가되면 상태도 달라져야 한다.

### 방문 집합을 정수의 비트로 표현한다

도시 `i`를 방문했으면 `1 << i` 비트를 켠다. 오른쪽 끝 비트가 도시 `0`이다.

| 비트마스크 | 방문한 도시 |
| --- | --- |
| `0001` | 0 |
| `0101` | 0, 2 |
| `1111` | 0, 1, 2, 3 |

`visited & (1 << nxt)`가 0이 아니면 이미 방문한 도시다. `visited | (1 << nxt)`는 다음 도시의 비트를 켠다. 도시가 `N`개일 때 모든 비트가 켜진 값은 `(1 << N) - 1`이다. 앞의 다섯 도시 사례에서 방문 집합은 `01111`, 전체 집합은 `11111`로 구별한다.

### 다음 도시를 고르고 돌아오는 비용까지 포함한다

현재 도시에서 갈 수 있는 미방문 도시 `nxt`를 하나 고르면 비용은 다음과 같다.

```text
cost[cur][nxt] + dp(nxt, visited | (1 << nxt))
```

이 후보들의 최솟값을 저장한다. 모두 방문한 상태에서는 `cur`에서 `0`으로 돌아가는 길이 있어야 순회가 완성된다. 마지막 귀환 비용을 빼거나, 귀환할 수 없는 경로를 비용 0으로 처리하면 다른 문제를 풀게 된다.

이 구현은 방향이 있는 비용 행렬도 받는다. 비용은 0 이상의 정수이며 **0은 길이 없다는 표시**다. 따라서 비용이 0인 실제 간선을 표현하는 형식은 아니다. 빈 행렬과 정사각형이 아닌 행렬은 거부한다. 도시가 하나라면 이동하지 않는 순회 비용을 0으로 정하고, 순회가 불가능하면 `None`을 반환한다.

```run-python
from itertools import permutations
from math import inf


def tsp(cost):
    n = len(cost)
    if n == 0 or any(len(row) != n for row in cost):
        raise ValueError("cost must be a nonempty square matrix")
    if any(type(value) is not int or value < 0 for row in cost for value in row):
        raise ValueError("costs must be nonnegative integers; 0 means no edge")
    if n == 1:
        return 0
    full = (1 << n) - 1
    memo = [[None] * (1 << n) for _ in range(n)]

    def dfs(cur, visited):
        if visited == full:
            return cost[cur][0] if cost[cur][0] != 0 else inf
        if memo[cur][visited] is not None:
            return memo[cur][visited]
        best = inf
        for nxt in range(n):
            if visited & (1 << nxt) or cost[cur][nxt] == 0:
                continue
            remaining = dfs(nxt, visited | (1 << nxt))
            if remaining != inf:
                best = min(best, cost[cur][nxt] + remaining)
        memo[cur][visited] = best
        return best

    result = dfs(0, 1)
    return None if result == inf else result


# 작은 입력의 답은 DP 상태를 쓰지 않는 순열 탐색과 대조한다.
def brute_tsp(cost):
    if len(cost) == 1:
        return 0
    best = inf
    for order in permutations(range(1, len(cost))):
        route = (0,) + order + (0,)
        edges = [cost[a][b] for a, b in zip(route, route[1:])]
        if all(edge != 0 for edge in edges):
            best = min(best, sum(edges))
    return None if best == inf else best


def main():
    cases = [
        ("one city", [[0]], 0),
        ("two cities", [[0, 3], [5, 0]], 8),
        ("no return edge", [[0, 3], [0, 0]], None),
        ("four cities", [[0, 10, 15, 20], [5, 0, 9, 10],
                         [6, 13, 0, 12], [8, 8, 9, 0]], 35),
        ("five cities", [[0 if i == j else 1 for j in range(5)]
                         for i in range(5)], 5),
        ("large costs", [[0, 10**15], [10**15, 0]], 2 * 10**15),
        ("disconnected", [[0, 1, 0], [1, 0, 0], [0, 0, 0]], None),
    ]
    for name, cost, answer in cases:
        before = [row[:] for row in cost]
        assert tsp(cost) == brute_tsp(cost) == answer
        assert cost == before
        print(f"{name}: {answer}")
    for invalid in ([], [[0, 1]], [[0, -1], [1, 0]]):
        try:
            tsp(invalid)
        except ValueError:
            pass
        else:
            raise AssertionError("invalid matrix was accepted")
    print("invalid matrix: rejected; all checks passed")


if __name__ == "__main__":
    main()
```

실행 출력은 다음과 같다.

```text
one city: 0
two cities: 8
no return edge: None
four cities: 35
five cities: 5
large costs: 2000000000000000
disconnected: None
invalid matrix: rejected; all checks passed
```

네 도시 예제의 최소 비용은 `35`이며 `0 → 1 → 3 → 2 → 0`의 `10 + 10 + 9 + 6`으로 확인할 수 있다. 귀환 간선이 없거나 도시가 분리된 경우에는 `None`이다. 가능한 경로의 비용보다 작은 임의의 숫자를 무한대로 쓰지 않도록 내부에서는 `inf`를 사용했다. `10**15`짜리 간선 두 개로 이루어진 순회도 실제 비용 `2 × 10**15`를 반환한다.

작은 일곱 행렬은 방문 순서를 모두 나열하는 `brute_tsp`와 대조했다. 이 함수는 비트마스크 DP의 점화식을 재사용하지 않는다. 입력 행렬 보존과 잘못된 입력의 거부도 확인했다. 두 Python 예제는 각각 독립적으로 실행하며 `assert`를 없애는 `-O` 옵션은 붙이지 않는다.

### 상태 압축 뒤에도 지수 크기는 남는다

상태 수의 상한은 `N × 2^N`, 각 상태에서 살필 다음 도시는 최대 `N`개이므로 시간은 `O(N² × 2^N)`, Memoization 배열은 `O(N × 2^N)`이다. 모든 비트 조합이 실제로 도달 가능한 상태인 것은 아니지만, 이 배열 구현은 전체 공간을 먼저 확보한다. 재귀 깊이는 최대 `O(N)`이다.

`N = 16`이면 배열 슬롯만 `16 × 65,536 = 1,048,576`개다. 순열보다 줄였어도 큰 입력을 쉽게 처리하는 다항 시간 알고리즘이 된 것은 아니다. 시간·메모리 제한과 언어의 객체 비용을 보고 적용 범위를 정해야 한다. 위 실행은 작은 입력의 정확성 확인이며 큰 도시 수의 성능 측정은 아니다.

`dfs`라는 함수 이름은 상태를 재귀로 펼치는 흐름에서 왔다. [DFS](/wiki/computer-science-dfs-278d75d9bc61/)로 탐색하더라도 Cache가 같은 상태의 반복 계산을 막는다. 모든 이동 비용이 같을 때 단계 수를 구하는 [BFS](/wiki/computer-science-bfs-00637871e6a7/)와는 목적이 다르다. 호출의 구조는 [재귀와 반복](/wiki/computer-science-topic-931a857d1d9a/), 상태와 비용의 표기는 [Graph](/wiki/computer-science-topic-1a8e559de264/)와 [시간 복잡도](/wiki/computer-science-topic-869aa2bd6535/)에서 이어진다.
