---
layout: default
title: 메모리 관리
nav_order: 6
permalink: /wiki/computer-systems-network-topic-d160fea60072/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-d160fea60072
projection_sha256: 23011bd6a594dfb0355e01eb0d1467bf000d34f4e05e1c37f0df7c3b88ce0388
parent: OS
content_status: ready
public_parent_id: Wiki/computer-systems-network/os
search_terms:
- palloc
- malloc
- mem_sbrk
- Buddy Allocator
- Slab Cache
- Arena
- 공간 이용률
grand_parent: 시스템
---

# 메모리 관리
{: .no_toc }

OS의 메모리 관리는 프로그램이 사용할 주소를 정하고, 실제 공간을 배정하며, 필요하지 않은 공간을 회수하는 일로 이어진다. [주소 공간](/wiki/computer-systems-network-topic-3521ee6344f1/)은 프로그램이 어떤 주소를 사용할 수 있는지 설명하고, [가상 메모리](/wiki/computer-systems-network-topic-1cf0821635df/)는 그 주소와 물리 메모리의 관계를 다룬다.

이때 ‘메모리가 남는다’는 사실만으로 모든 요청을 처리할 수 있는 것은 아니다. 먼저 어느 단위로 공간을 나누고 어떤 연속성을 요구하는지 살펴보면, 할당 실패와 공간 낭비를 구체적으로 설명할 수 있다.

## 메모리 할당과 단편화

메모리가 남아 있는데도 할당이 실패할 수 있다. 남은 공간이 요청한 모양으로 이어져 있지 않기 때문이다. 반대로 할당에는 성공했지만, 받은 블록이 요청보다 커서 일부 공간을 쓰지 못할 수도 있다. 내부 단편화와 외부 단편화는 이 두 상황을 구분한다.

| 구분 | 남은 공간의 위치 | 예 |
| --- | --- | --- |
| 내부 단편화 | 이미 할당한 블록 안 | 17바이트 요청에 32바이트를 배정해 15바이트가 남음 |
| 외부 단편화 | 사용 중인 블록 사이 | 빈 페이지가 총 4개여도 연속 3페이지를 찾지 못함 |

단편화가 어느 계층에서 발생하는지 함께 말해야 한다. 응용 프로그램의 Heap 블록, Kernel의 객체 할당, 물리 페이지의 연속성은 서로 다른 조건을 가진다. 사용 시간이 길다는 이유만으로 단편화가 언제나 나빠지는 것도 아니다. 요청 크기와 할당·해제 순서가 결과를 바꾼다.

### 크기를 올림할 때 남는 공간

[PintOS `5afaa6d`의 `malloc.c`](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/malloc.c)는 Kernel 내부에서 사용하는 할당기다. `descs[10]` 배열 가운데 크기별 빈 블록 목록을 관리하는 Descriptor 일곱 개를 초기화한다. 블록 크기는 `16, 32, 64, 128, 256, 512, 1024`바이트다. 루프 조건이 `block_size < PGSIZE / 2`이므로 2048바이트 Descriptor는 없다. 응용 프로그램의 C 라이브러리가 제공하는 `malloc()`과는 별개의 구현이다.

요청을 담을 수 있는 가장 작은 Descriptor를 고르므로 17바이트 요청은 32바이트 블록을 받는다. 남은 15바이트는 배정한 블록의 약 46.9%다. 이를 모든 블록의 ‘최악은 블록 크기에서 1을 뺀 값’으로 설명하면 크기 구간을 놓친다. 이 구현에서 32바이트 블록을 선택하는 요청은 17~32바이트이므로 최대 차이는 15바이트다. 최소 블록인 16바이트는 1~16바이트 요청에 사용된다.

페이지 단위 올림도 같은 방식으로 계산할 수 있다. 4097바이트의 데이터를 4096바이트 페이지 두 개에 담으면 `8192 - 4097 = 4095`바이트가 남는다. 다음 모델은 Descriptor의 올림과 페이지 올림을 계산한다. 실제 `malloc()` 호출이나 Arena의 관리 비용까지 측정하는 예제는 아니다.

```run-python
classes = [16, 32, 64, 128, 256, 512, 1024]
for requested in [1, 16, 17, 1024, 1025]:
    assert requested > 0
    block = next((size for size in classes if size >= requested), None)
    if block is None:
        print(requested, '바이트: Descriptor 대신 큰 할당 경로')
    else:
        unused = block - requested
        print(requested, '바이트 →', block, '바이트 블록, 남음:', unused,
              '배정 크기 대비:', f'{unused / block:.1%}')

requested = 4097
page_size = 4096
pages = (requested + page_size - 1) // page_size
unused = pages * page_size - requested
print('페이지 올림:', pages, '페이지, 남음:', unused, '바이트')
assert pages == 2 and unused == 4095
```

이 할당기는 여러 블록을 담는 메모리 영역을 Arena라고 부른다. 작은 블록의 Arena는 한 페이지에서 관리 정보인 `sizeof(struct arena)`를 제외한 영역을 블록으로 나누며, 나눗셈의 나머지 공간도 생길 수 있다. Descriptor보다 큰 요청은 `size + sizeof(struct arena)`를 페이지 수로 올림해 `palloc_get_multiple()`에 전달한다. 따라서 **큰 malloc의 실제 페이지 수**와 위 예제의 **데이터만 페이지로 올림한 수**는 구분해야 한다. 구현은 1024바이트를 넘는 요청부터 큰 할당 경로로 들어가므로, 파일 앞부분의 ‘2 kB보다 큰 블록’이라는 주석만으로 경계를 정하면 안 된다. 크기 0 요청은 이 선택 전에 `NULL`로 처리하며 위 모델은 양의 크기만 비교한다.

### 빈 공간이 이어져 있어야 할 때

PintOS의 [`palloc_get_multiple()`](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/palloc.c)은 선택한 Pool의 Bitmap에서 요청한 수만큼 연속된 빈 비트를 찾는다. `PAL_USER`가 있으면 사용자 페이지용 User Pool을, 없으면 Kernel Pool을 선택한다. 빈 페이지를 모두 합하면 충분하더라도 하나의 연속 구간으로 찾지 못하면 실패한다. `PAL_ASSERT`가 있으면 실패 시 Kernel Panic을 일으키고, 없으면 `NULL`을 반환한다.

아래 모델에서 `1`은 사용 중인 페이지, `0`은 빈 페이지다. 세 페이지 요청이 실패한 뒤, 사이에 있던 한 페이지를 해제하면 빈 구간이 이어지면서 같은 요청이 성공한다. 이는 주소 범위의 계산이며 실제 PintOS Pool이나 Lock을 실행하지 않는다.

```run-python
def first_run(used, count):
    assert count > 0
    for start in range(len(used) - count + 1):
        if not any(used[start:start + count]):
            return start
    return None

used = [1, 0, 1, 0, 0, 1, 1, 1, 1, 0]
print('Bitmap:', used, '빈 페이지:', used.count(0))
print('연속 3페이지 시작점:', first_run(used, 3))
assert used.count(0) == 4 and first_run(used, 3) is None
used[2] = 0
start = first_run(used, 3)
print('2번 페이지 해제 후:', used)
print('연속 3페이지 시작점:', start)
assert start == 1
```

`palloc_get_page()`는 한 페이지만 요청하므로 빈 페이지가 하나라도 있으면 이 연속성 조건 때문에 실패하지는 않는다. 다만 빈 페이지 자체가 없으면 실패할 수 있다. 큰 `malloc()`은 여러 물리 페이지를 한꺼번에 요구할 수 있으므로 외부 단편화의 영향을 받는다.

### 가상 주소의 연속성과 물리 주소의 연속성

[Paging](/wiki/computer-systems-network-topic-dbd836d1a044/)에서는 가상 주소에서 연속된 페이지들을 서로 떨어진 물리 Frame에 Mapping할 수 있다. 이 경우 연속된 가상 주소 10페이지를 얻기 위해 반드시 연속된 물리 Frame 10개를 확보할 필요는 없다. 하지만 그 성질이 `palloc_get_multiple()`처럼 물리적 연속성을 직접 요구하는 모든 할당 문제를 없애지는 않는다. 마지막 페이지에 남는 내부 단편화도 여전히 존재한다.

Linux에서도 할당 목적에 맞는 API를 고른다. `vmalloc()` 계열은 큰 가상 연속 영역을 제공하지만 물리적 연속성을 보장하지 않는다. 같은 종류의 객체를 반복해서 할당할 때는 Slab Cache를 만들고 `kmem_cache_alloc()`으로 객체를 얻을 수 있다. 이러한 분류는 단편화를 완전히 없앤다는 보장이 아니라, 관리 단위와 요구 조건이 다르다는 뜻이다. [Linux 메모리 할당 안내](https://docs.kernel.org/core-api/memory-allocation.html)

Linux의 Buddy Allocator는 2의 거듭제곱 크기인 페이지 묶음을 관리한다. 더 큰 빈 묶음을 나누어 요청을 처리하고, 해제할 때 조건이 맞는 Buddy와 병합해 큰 묶음을 다시 만들 수 있다. 작은 객체를 다루는 Slab Cache와 물리 페이지 묶음을 다루는 Buddy를 같은 단위의 할당기로 보면 안 된다. [Linux 페이지 묶음의 분할과 병합](https://docs.kernel.org/mm/physical_memory.html)

### Malloc Lab에서 공간 이용률을 읽는 법

Malloc Lab은 `mem_sbrk()`로 얻은 제한된 Heap 안에서 블록과 관리 정보를 다루도록 구성한다. 빈 블록마다 관리용 노드를 시스템 `malloc()`으로 따로 만들면 실제 비용이 측정 대상 Heap 밖으로 빠진다. 빈 블록의 Payload 일부를 Free List의 `prev`·`next` 링크로 재사용하는 이유다. List의 첫 원소나 Tree Root를 가리키는 포인터와 블록마다 외부 노드를 만드는 선택은 같지 않다. 허용되는 전역 배열의 범위는 해당 과제 규칙을 확인한다.

[`24c2cc8`의 `mdriver.c`](https://github.com/woonyong-kr/lrn-malloc/blob/24c2cc836b519985e3163b2acdf6d409543e4410/malloc-lab/mdriver.c)는 Trace를 재생하면서 동시에 사용 중인 요청 바이트의 최댓값을 구하고, 마지막 `mem_heapsize()`로 나누어 공간 이용률을 계산한다. 이 비율에는 내부·외부 단편화뿐 아니라 Heap 안의 관리 정보와 확보해 둔 공간도 영향을 준다. 따라서 이용률 하나를 내부 단편화율로 해석하면 안 된다.

Trace의 `a id bytes`, `r id bytes`, `f id`는 할당·재할당·해제를 뜻한다. 예를 들어 `a 0 512 → a 1 128 → r 0 640 → f 1 → f 0`에서는 두 블록을 만든 뒤 첫 블록을 키운다. 늘릴 공간이 바로 옆에 있는지, 옮겨야 한다면 기존 내용을 어떻게 보존하는지, 해제 뒤 인접 빈 블록을 병합하는지를 순서대로 살필 수 있다. [Malloc Lab의 Trace 형식](https://github.com/woonyong-kr/lrn-malloc/blob/24c2cc836b519985e3163b2acdf6d409543e4410/malloc-lab/README.md)

빠른 탐색과 높은 공간 이용률은 별도로 측정해야 한다. AVL Tree를 썼다는 이유만으로 단순 Free List보다 전체 성능이 좋다고 결론낼 수 없다. 같은 Trace와 실행 조건에서 정렬·범위·겹침·재할당 데이터 보존을 먼저 확인하고, 이용률과 처리량을 비교해야 한다.

## 공간 확보에서 주소 변환과 회수로

할당기가 공간을 확보한 뒤에는 프로그램의 VA가 그 공간을 어떻게 가리키는지 확인해야 한다. 파일이나 물리 메모리를 주소 공간과 연결하는 방식은 [메모리 매핑](/wiki/computer-systems-network-topic-aad7c9c2b57f/)에서, 빈 Frame이 부족할 때 기존 내용을 보존하며 재사용할 대상을 고르는 문제는 [페이지 교체](/wiki/computer-systems-network-topic-e50fd5d11ab2/)에서 이어진다. 연속된 빈 공간이 없는 상태와, 내보낼 수 있는 Page 자체가 없는 상태는 서로 다른 실패 조건이다.
