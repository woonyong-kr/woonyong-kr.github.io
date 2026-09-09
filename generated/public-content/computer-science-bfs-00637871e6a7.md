---
layout: default
title: BFS
nav_order: 2
permalink: /wiki/computer-science-bfs-00637871e6a7/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-bfs-00637871e6a7
projection_sha256: 69eb5f8bc1e7c38e5f4baeeeb5d0033d1e0e7ed0f3f39a6740c3f066d9824d14
parent: 그래프 알고리즘
content_status: ready
public_parent_id: Wiki/keywords/computer-science-topic-f8706f61ab70
search_terms:
- BFS
- 너비 우선 탐색
- Breadth-First Search
- DFS와 BFS
- Queue
- 최단 거리
- visited
grand_parent: 알고리즘
ancestor: CS 기초
---

# BFS
{: .no_toc }

지하철 노선도에서 출발역부터 간선을 몇 개 지나야 다른 역에 닿는지 구한다고 하자. BFS(Breadth-First Search, 너비 우선 탐색)는 **출발점에서 가까운 정점부터 거리별로 탐색**한다. 한 갈래를 끝까지 따라가는 [DFS](/wiki/computer-science-dfs-278d75d9bc61/)와 달리, 먼저 발견한 후보를 [Queue](/wiki/computer-science-topic-fd1595b77add/)의 앞에서 꺼낸다.

여기서 거리는 간선 수다. 역 사이의 실제 이동 시간이나 서로 다른 간선 비용을 그대로 최소화하는 알고리즘은 아니다.

## Queue가 만드는 방문 순서

정점 0의 이웃이 1·2, 정점 1의 나머지 이웃이 3·4, 정점 2의 나머지 이웃이 5라고 하자. 무방향 그래프이므로 각 이웃 목록에는 되돌아가는 간선도 들어 있다. 정점 6은 연결되지 않았다.

출발점 0을 Queue에 넣고 방문 표시를 한다. 이후 **앞에서 하나 꺼내기 → 미방문 이웃을 표시하고 뒤에 넣기 → Queue가 빌 때까지 반복하기**를 수행한다. 이웃을 작은 번호부터 읽으면 Queue는 다음처럼 변한다.

| 처리한 정점 | 처리 후 Queue: 앞 → 뒤 | 새로 발견한 거리 |
| --- | --- | --- |
| 시작점 등록 | 0 | 0의 거리 = 0 |
| 0 | 1, 2 | 1·2의 거리 = 1 |
| 1 | 2, 3, 4 | 3·4의 거리 = 2 |
| 2 | 3, 4, 5 | 5의 거리 = 2 |
| 3, 4, 5 | 비어 있음 | 새 정점 없음 |

방문 순서는 **0 → 1 → 2 → 3 → 4 → 5**다. 같은 거리 안에서의 순서는 이웃을 읽는 순서에 따라 달라질 수 있다. 그러나 거리 2인 후보가 거리 1인 후보보다 먼저 처리되지는 않는다.

거리 k인 정점의 미방문 이웃은 거리 k+1로 발견된다. Queue에 먼저 들어온 가까운 정점들이 먼저 처리되므로, 어떤 정점에 처음 도달했을 때 그보다 짧은 경로가 뒤늦게 나타나지 않는다. 이것이 모든 간선의 비용을 1로 볼 때 BFS가 최단 거리를 구하는 이유다. [BFS의 거리 순 탐색](https://algs4.cs.princeton.edu/41graph/)

## 방문 표시는 Queue에 넣을 때

여러 정점이 같은 이웃으로 연결될 수 있다. 꺼낼 때까지 방문 표시를 미루면, 그 사이 다른 정점도 같은 이웃을 Queue에 넣을 수 있다. 발견한 즉시 표시하면 각 정점을 한 번만 넣는다.

방문 여부와 거리를 따로 저장할 수도 있다. 다음 예제에서는 `distance[v] == -1`을 미방문 상태로 사용한다. 새 정점을 발견하면 `distance[v] = distance[u] + 1`을 먼저 기록하고 Queue에 넣는다. 이 대입이 거리 계산과 방문 표시를 함께 맡는다. [BFS의 발견 시점·거리·Queue 구현](https://algs4.cs.princeton.edu/41graph/BreadthFirstPaths.java.html)

사이클이 있어도 이미 거리가 정해진 정점은 다시 넣지 않는다. 무방향 트리에서도 부모 방향 간선을 다시 읽으므로, 이 방문 표시를 없애거나 동등한 부모 제외 조건 없이 탐색을 반복해서는 안 된다.

## C로 방문 순서와 거리 확인하기

다음 프로그램은 최대 이웃 수가 3인 작은 고정 그래프를 사용한다. `adj_len[u]`는 정점 u의 실제 이웃 수이며 나머지 배열 칸은 읽지 않는다. `queue[V]`에 V칸을 둔 근거는 각 정점을 한 번만 넣는다는 규칙이다. `front`는 다음에 꺼낼 위치, `back`은 다음에 넣을 위치다.

기본 그래프, 2–4 간선으로 사이클을 추가한 그래프, 고립된 정점 6에서 시작한 경우를 확인한다. 매번 거리 배열과 Queue의 인덱스를 새로 초기화한다.

```run-c
#include <stdio.h>

enum { V = 7, MAX_DEGREE = 3 };
static int adj[V][MAX_DEGREE] = {
    {1, 2}, {0, 3, 4}, {0, 5}, {1}, {1}, {2}, {0}
};
static int adj_len[V] = {2, 3, 2, 1, 1, 1, 0};

static void bfs(const char *name, int start) {
    int queue[V], front = 0, back = 0;
    int distance[V];
    for (int u = 0; u < V; ++u) {
        distance[u] = -1;
    }
    distance[start] = 0;
    queue[back++] = start;
    puts(name);
    printf("order: ");

    while (front < back) {
        int u = queue[front++];
        printf("%d ", u);
        for (int i = 0; i < adj_len[u]; ++i) {
            int v = adj[u][i];
            if (distance[v] == -1) {
                distance[v] = distance[u] + 1;
                queue[back++] = v;
            }
        }
    }
    printf("\ndistance:");
    for (int u = 0; u < V; ++u) {
        printf(" %d", distance[u]);
    }
    printf("\nenqueued: %d\n", back);
}

int main(void) {
    bfs("base from 0", 0);
    adj[2][1] = 4;
    adj[2][2] = 5;
    adj_len[2] = 3;
    adj[4][1] = 2;
    adj_len[4] = 2;
    bfs("cycle from 0", 0);
    bfs("isolated from 6", 6);
    return 0;
}
```

0에서 시작한 두 경우 모두 방문 순서는 `0 1 2 3 4 5`이고, 정점 번호 0~6의 거리는 다음과 같다.

```text
distance: 0 1 1 2 2 2 -1
enqueued: 6
```

사이클을 추가해도 각 정점은 한 번씩만 들어가므로 등록 횟수는 6이다. 정점 6의 -1은 출발점에서 도달하지 못했다는 뜻이다. 마지막에 6에서 시작하면 방문 순서는 6 하나이고 거리는 `-1 -1 -1 -1 -1 -1 0`, 등록 횟수는 1이다.

탐색이 끝났다는 것은 해당 시작점에서 도달할 수 있는 정점을 모두 처리했다는 뜻이다. 그래프의 모든 정점을 처리하려면 아직 방문하지 않은 정점에서 탐색을 이어 가야 한다. 무방향 그래프의 연결 요소를 찾는 용도로는 DFS와 BFS를 모두 사용할 수 있다.

## 시간과 메모리

인접 목록에서는 각 정점을 한 번 처리하고 그 정점의 이웃 목록을 한 번 훑는다. 전체 정점 수 V의 거리 배열 초기화까지 포함한 최악의 시간은 O(V + E)다. 한 시작점에서 실제로 확인하는 간선은 도달 가능한 부분의 간선이다. 무방향 그래프에서 양쪽 인접 목록을 합하면 2E개 항목을 읽는 계산은 [DFS의 탐색 비용 설명](/wiki/computer-science-dfs-278d75d9bc61/)과 같다.

그래프 저장 공간을 제외하면 거리 배열과 Queue에 O(V)의 추가 공간이 필요하다. 넓게 퍼지는 그래프에서는 가까운 두 거리 층의 일부가 Queue에 함께 남아 대기 공간이 커질 수 있다. 깊게 이어진 그래프에서는 재귀 DFS의 호출 깊이가 커질 수 있으므로, DFS와 BFS 중 어느 쪽이 항상 메모리를 덜 쓴다고 정할 수는 없다. [BFS의 시간·추가 공간](https://algs4.cs.princeton.edu/41graph/BreadthFirstPaths.java.html)

미로의 최소 이동 횟수, 친구 관계의 n촌 거리, 네트워크의 최소 홉 수처럼 각 연결을 같은 비용으로 셀 때 BFS를 사용할 수 있다. 웹 페이지도 링크를 따라가는 깊이별로 수집 순서를 정할 수 있다. 간선마다 비용이 다르면 처음 도착한 경로가 최소 비용이라는 보장은 없어지므로, 거리의 의미와 비용 조건을 먼저 확인한다.

트리에서 같은 깊이의 정점을 차례로 처리하는 레벨 순회도 BFS의 응용이다. [트리 순회](/wiki/computer-science-topic-17f8492e4ed6/)에서 DFS의 전위·중위·후위와 나란히 비교할 수 있다.
