---
layout: default
title: Array
nav_order: 2
permalink: /wiki/computer-science-topic-06d25b0021e7/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-06d25b0021e7
projection_sha256: b761155ea2ef717734b1ce04981158e5805ffc10bf21e8c9a90b17f0d08b5073
parent: 자료구조
content_status: ready
public_parent_id: Wiki/computer-science/data-structures
search_terms:
- Array
- 배열
- 인덱스
- Dynamic Array
- 분할 상환
grand_parent: CS
---

# Array
{: .no_toc }

`10, 20, 30, 40`을 보관한 Array에서 세 번째 값을 읽을 때 앞의 두 값을 차례로 확인할 필요는 없다. 시작 위치와 인덱스로 그 원소의 위치를 계산한다. 반면 `10`과 `20` 사이에 새 값을 넣으려면 뒤의 원소를 옮겨 자리를 만들어야 한다. **인덱스로 읽기와 순서를 유지하며 끼워 넣기는 서로 다른 연산이다.**

## 인덱스는 위치를 계산하는 데 쓰인다

Array는 같은 크기의 원소를 연속한 공간에 놓는다. 시작 주소가 `base`이고 원소 크기가 `s`라면, 0부터 세는 인덱스 `i`의 위치는 `base + i × s`다. 번호와 간격을 알면 극장 좌석의 위치를 찾을 수 있는 것과 같다.

이 계산 모델에서 인덱스 접근은 O(1)이다. 값이 어디 있는지 모른 채 처음부터 찾는 선형 탐색은 O(n)이다. `items[37]`과 “값이 37인 원소 찾기”를 같은 연산으로 읽으면 안 된다. [시간 복잡도](/wiki/computer-science-topic-869aa2bd6535/)에서 두 탐색의 비교 횟수를 살펴볼 수 있다.

연속한 것은 **Array의 원소가 차지하는 공간**이다. C의 `int` Array에는 정수들이 들어 있지만, CPython의 List에는 Python 객체를 가리키는 참조들이 들어 있다. 참조된 객체들까지 같은 간격으로 붙어 있다는 뜻은 아니다. [CPython List의 구현](https://docs.python.org/3/faq/design.html#how-are-lists-implemented-in-cpython)

## 한 칸을 끼워 넣으면 무엇이 움직이는가

다음 C 예제는 원소 다섯 개를 담을 공간 중 네 칸을 사용한다. 인덱스 1에 `15`를 넣을 때 몇 개의 원소를 옮기는지 출력한다. `get()`에는 실제 사용 중인 길이도 전달해 범위 밖 접근을 거부한다.

```run-c
#include <assert.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>

static bool get(const int *items, size_t count, size_t index, int *value) {
    if (index >= count) return false;
    *value = items[index];
    return true;
}

int main(void) {
    int items[5] = {10, 20, 30, 40};
    size_t count = 4, capacity = sizeof items / sizeof items[0];
    size_t index = 1, moved = 0;
    assert(count < capacity && index <= count);
    for (size_t i = count; i > index; --i) {
        items[i] = items[i - 1];
        ++moved;
    }
    items[index] = 15;
    ++count;
    printf("이동한 원소: %zu\n", moved);
    for (size_t i = 0; i < count; ++i) {
        printf("%s%d", i == 0 ? "" : " ", items[i]);
    }
    putchar('\n');
    int value = 0;
    bool found = get(items, count, 2, &value);
    printf("인덱스 2: %d\n", value);
    bool outside = get(items, count, count, &value);
    printf("범위 밖 접근: %s\n", outside ? "허용" : "거부");
    assert(moved == 3 && found && value == 20 && !outside);
    return 0;
}
```

뒤에서부터 옮겨야 아직 복사하지 않은 원소를 덮어쓰지 않는다. 앞에 넣을수록 이동할 원소가 많아지고, 맨 끝에 넣을 때는 기존 원소를 옮길 필요가 없다. 삭제도 순서를 유지하려면 빈칸 뒤의 원소를 당겨야 한다.

고정 크기 Array 자체가 자동으로 커지지는 않는다. Dynamic Array는 별도의 길이와 용량을 관리하며 공간이 부족하면 더 큰 저장 공간을 확보한다. 용량이 남은 끝 삽입은 O(1)이지만, 기존 원소 n개를 복사하는 확장 한 번은 O(n)이다. 용량을 일정 비율로 늘리는 방식에서는 여러 번의 끝 삽입 비용을 합쳐 **분할 상환 O(1)**로 설명할 수 있다. 임의의 확장 정책이나 매번 한 칸씩 늘리는 방식에 그대로 적용하는 보장은 아니다.

## 순서대로 읽을 때의 이점

CPU Cache는 이웃한 바이트들을 Cache Line 단위로 가져올 수 있다. Array를 처음부터 순회하면 앞의 원소를 읽으며 가져온 Line에서 다음 원소도 찾을 가능성이 있다. 노드의 주소를 따라가는 Linked List보다 순회에 유리할 수 있는 이유다.

예를 들어 원소가 4 B이고 Cache Line이 64 B라면 한 Line에 여러 원소가 들어간다. 실제 개수는 정렬과 경계에 영향을 받으며, 모든 CPU의 Line이 64 B인 것은 아니다. 같은 O(n) 순회라는 사실만으로 실제 실행 시간이 같다고 보거나, Array가 모든 작업에서 더 빠르다고 단정하지 않는다. [CPU 캐시](/wiki/computer-systems-network-cpu-93d8800bdefe/)에서 이 배치와 접근 비용의 관계를 다룬다.

Array와 Linked List의 연산 조건은 [Linked List](/wiki/computer-science-topic-2f43235867e4/)에서 비교한다. C의 `sizeof`, 포인터 변환, `arr[i]`와 `*(arr + i)`의 관계는 [C의 Array](/wiki/programming-languages-runtime-topic-2ac2dfca2dd1/)로 이어진다.
