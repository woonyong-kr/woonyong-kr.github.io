---
layout: default
title: 페이지 교체
nav_order: 5
permalink: /wiki/computer-systems-network-topic-e50fd5d11ab2/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-e50fd5d11ab2
projection_sha256: 93e3892c8a818d8e2077f5bb4142cadd6cbb0a0d49a1faea0bbec5be840360a0
parent: 메모리 관리
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-d160fea60072
search_terms:
- OPT
- LRU
- FIFO
- Clock
- Stack Property
- Page Fault
grand_parent: OS
ancestor: 시스템
---

# 페이지 교체
{: .no_toc }

페이지를 올릴 빈 Frame이 없을 때, 어떤 페이지를 내보내야 다음 접근을 덜 방해할까? 페이지 교체 알고리즘은 이 선택을 담당한다. 가까운 시점에 다시 사용할 페이지를 남겨 두면 불필요한 재적재를 줄일 수 있다.

정책을 비교할 때는 같은 참조 순서와 Frame 수, 초기 상태를 사용해야 한다. 여기서는 메모리에 없는 페이지를 참조하면 Fault 하나로 세는 모델을 사용한다. 실제 OS의 Page Fault에는 권한 위반이나 처음 접근하는 페이지의 준비 등도 포함되므로, 아래 수치를 실제 디스크 I/O 횟수나 실행 시간으로 해석하지는 않는다.

## 어떤 정보를 보고 내보낼까

| 정책 | 교체 기준 | 필요한 정보 |
| --- | --- | --- |
| OPT | 다음 사용이 가장 먼 페이지 | 미래의 참조 순서 |
| LRU | 마지막 사용이 가장 오래된 페이지 | 과거의 접근 순서 |
| FIFO | 메모리에 들어온 지 가장 오래된 페이지 | 적재 순서 |
| Clock | 최근 접근 흔적이 없는 후보 | 참조 비트와 다음 검사 위치 |

OPT는 같은 조건에서 Fault를 최소로 만드는 비교 기준이다. 미래에 다시 사용하지 않는 페이지가 있으면 그런 페이지를 먼저 내보낼 수 있다. 범용 OS는 프로그램의 미래 참조를 미리 알 수 없지만, 이미 수집한 참조 기록을 재생하는 실험에서는 OPT를 계산할 수 있다. [OPT의 비교 기준](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf)

LRU는 미래 대신 최근의 사용 이력을 활용한다. FIFO와 달리 이미 메모리에 있는 페이지를 다시 사용한 순간에도 순서가 바뀐다. 정확한 LRU를 구현하려면 접근 때마다 순서를 갱신하거나 그와 동등한 정보를 유지해야 한다. 아래처럼 작은 시뮬레이터에서 마지막 접근 시각을 Dictionary에 저장하는 방식과, 모든 CPU 메모리 접근을 OS가 관찰하는 데 드는 비용은 구분해야 한다.

Clock은 완전한 접근 순서를 유지하는 부담을 줄인다. 참조 비트가 1인 후보는 비트를 내리고 지나가며, 0인 후보를 만났을 때 선택한다. 비트가 0이라는 것은 관찰한 Mapping에서 마지막 초기화 이후의 접근 흔적을 찾지 못했다는 뜻이다. 정확히 언제 사용됐는지나 모든 다른 Mapping의 접근 여부까지 담고 있지는 않다.

## 같은 참조 순서를 실행해 보기

참조 순서는 `1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5`이고 Frame은 처음에 모두 비어 있다. OPT는 네 번째 참조에서 Page 3을 내보내 1과 2의 곧 이어질 접근을 Hit으로 만든다. LRU는 같은 시점에 가장 오래전에 사용한 Page 1을 내보내므로, 다음 Page 1 접근에서 다시 Fault가 발생한다.

아래 코드는 네 정책의 Fault 수와 OPT·LRU의 선택 과정을 출력한다. `references`나 `capacities`를 바꾸어 다른 경우도 비교할 수 있다. Clock 모델은 새로 적재한 페이지와 Hit한 페이지의 참조 비트를 1로 만들며, 선택 후에는 다음 Frame에서 순회를 이어 간다.

```run-python
def simulate(policy, references, capacity):
    assert policy in {'OPT', 'LRU', 'FIFO', 'CLOCK'} and capacity > 0
    assert None not in references
    frames = [None] * capacity
    referenced = [False] * capacity
    last_used = {}
    hand = 0
    faults = 0
    trace = []

    for time, page in enumerate(references):
        evicted = None
        hit = page in frames
        if hit:
            referenced[frames.index(page)] = True
        else:
            faults += 1
            if policy == 'CLOCK':
                while frames[hand] is not None and referenced[hand]:
                    referenced[hand] = False
                    hand = (hand + 1) % capacity
                index = hand
                hand = (hand + 1) % capacity
            elif policy == 'FIFO':
                index = hand
                hand = (hand + 1) % capacity
            elif None in frames:
                index = frames.index(None)
            elif policy == 'LRU':
                index = min(range(capacity), key=lambda i: last_used[frames[i]])
            else:
                future = references[time + 1:]
                def next_use(index):
                    resident = frames[index]
                    return future.index(resident) if resident in future else float('inf')
                index = max(range(capacity), key=next_use)
            evicted = frames[index]
            frames[index] = page
            referenced[index] = True
        last_used[page] = time
        trace.append((time + 1, page, frames.copy(), hit, evicted))
    return faults, trace

references = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
capacities = [3, 4]
results = {}
for policy in ['OPT', 'LRU', 'FIFO', 'CLOCK']:
    results[policy] = [simulate(policy, references, n)[0] for n in capacities]
    print(policy, 'Frame 수:', capacities, 'Fault 수:', results[policy])

for policy in ['OPT', 'LRU']:
    print('\n'+policy+'의 Frame 3개 추적')
    _, trace = simulate(policy, references, 3)
    for time, page, frames, hit, evicted in trace:
        print(time, '참조:', page, 'Frame:', frames,
              'Hit' if hit else 'Fault', '내보낸 페이지:', evicted)
```

기본 입력의 결과는 다음과 같다. OPT가 미래 정보를 이용해 얼마나 다른 선택을 하는지와, LRU의 이점이 모든 참조 순서에서 일정하지 않다는 점을 함께 볼 수 있다.

OPT에서 앞으로 다시 사용하지 않는 페이지가 여러 개라면 어느 것을 내보내도 최솟값은 같다. 이 코드는 Frame 번호가 작은 후보를 먼저 고르므로, 다른 설명의 Frame 배치와 달라도 Fault 수는 같을 수 있다.

| 정책 | Frame 3개 | Frame 4개 |
| --- | ---: | ---: |
| OPT | 7 | 6 |
| LRU | 10 | 8 |
| FIFO | 9 | 10 |
| Clock | 9 | 10 |

## Frame을 늘렸는데 Fault가 늘어나는 이유

FIFO에서는 Frame을 3개에서 4개로 늘렸는데 Fault가 9회에서 10회로 늘어난다. 이런 현상을 **Bélády's Anomaly**라고 한다. 적재 순서에 따라 선택이 달라지므로, 작은 메모리에서 남아 있던 페이지가 큰 메모리에서도 반드시 남아 있으리라는 보장이 없다. 위 Clock 모델도 같은 입력에서 이 현상을 보인다.

LRU는 같은 참조 기록과 빈 초기 상태에서 Frame `N`개에 들어 있는 페이지가 `N+1`개의 경우에도 포함되는 Stack Property를 갖는다. 여기서 Stack은 프로그램의 Call Stack을 뜻하지 않는다. OPT 역시 Frame 수를 늘리면 달성 가능한 Fault 최솟값이 더 나빠지지 않는다. Clock은 LRU의 근사이지만 이러한 성질까지 그대로 이어받는 것은 아니다. [Bélády's Anomaly와 Stack Property](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf)

## Fault 수 밖의 비용

정책을 실제 OS에 적용할 때는 후보를 찾는 비용과 데이터를 보존하는 비용도 고려해야 한다. 원본 파일에서 복원 가능한 Clean Page와, 수정된 데이터를 보관해야 하는 페이지는 내보내는 비용이 다르다. Dirty 상태까지 참고하는 NRU·Enhanced Clock 계열의 분류는 [PintOS 페이지 교체의 비교 설명](/wiki/computer-systems-network-topic-163345dd1b02/#dirty까지-고려하는-변형)에서 볼 수 있다.

Accessed Bit를 하드웨어가 제공해도 OS의 순회와 비트 초기화, 필요한 TLB 무효화가 사라지는 것은 아니다. 공유되거나 고정된 Frame은 후보에서 제외해야 할 수 있고, 파일 쓰기나 Swap 공간 확보가 실패할 수도 있다. 따라서 알고리즘의 Fault 수가 적다는 결과와 전체 시스템의 지연이 짧다는 결과는 각각 확인해야 한다.

## 실제 구현으로 이어가기

Linux의 페이지 회수에는 비동기 `kswapd`와 Direct Reclaim이 있으며, 사용 중인 정책은 Build와 실행 설정에 따라 달라진다. 전통적인 Active/Inactive LRU 계열과 Multi-Gen LRU를 구분해 확인해야 한다. [Linux 회수 개념](https://docs.kernel.org/admin-guide/mm/concepts.html#reclaim), [Multi-Gen LRU](https://docs.kernel.org/admin-guide/mm/multigen_lru.html)

현재 학습용 PintOS에서는 `vm_get_frame()`이 할당 실패 시 `vm_evict_frame()`을 부르고, `vm_get_victim()`이 `clock_hand`로 후보를 고른다. 공유 Frame 제외, 최대 두 바퀴의 검사, 실패 반환, 보존 후 Mapping 해제는 [PintOS 페이지 교체](/wiki/computer-systems-network-topic-163345dd1b02/)에서 실제 코드와 연결한다. 익명 페이지의 Slot과 Sector 계산은 [Swap](/wiki/computer-systems-network-swap-11630540adf8/), 파일 Page의 Writeback 범위는 [PintOS mmap](/wiki/computer-systems-network-mmap-838e9b0f7e0a/)에 정리한다.
