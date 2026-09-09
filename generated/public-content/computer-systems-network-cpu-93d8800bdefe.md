---
layout: default
title: CPU 캐시
nav_order: 9
permalink: /wiki/computer-systems-network-cpu-93d8800bdefe/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-cpu-93d8800bdefe
projection_sha256: 7e4d3efd091ec52e81e9d99102804f79018b6d2546f59ba7fcf5afe06cb08d5b
parent: 컴퓨터 구조
content_status: ready
public_parent_id: Wiki/computer-systems-network/computer-architecture
grand_parent: Systems
ancestor: CS
---

# CPU 캐시
{: .no_toc }

CPU 캐시는 자주 쓰는 명령어와 데이터를 가까운 곳에 보관해 메모리를 기다리는 비용을 줄인다. CPU가 처리할 수 있는 속도와 메모리에서 데이터를 공급하는 속도의 차이를 Memory Wall이라고 부른다. 이 차이는 CPU, 메모리 구성, 접근 패턴에 따라 달라지므로 하나의 고정된 지연 시간으로 설명할 수는 없다.

## 작은 캐시가 효과를 내는 이유

캐시에 프로그램의 모든 데이터를 담을 필요는 없다. 최근에 읽은 값을 곧 다시 읽는 **시간 지역성**과, 한 주소를 읽은 뒤 이웃한 주소를 읽는 **공간 지역성**을 이용한다. 반복문에서 같은 값을 재사용하는 경우와 배열을 차례로 순회하는 경우가 각각의 예다.

CPU 캐시에는 일반적으로 SRAM을, 주 메모리에는 DRAM을 사용한다. SRAM은 빠른 접근에 유리하지만 같은 용량에 더 많은 면적이 필요하다. CPU 가까이에 작고 빠른 캐시를 두고, 그 아래에 더 큰 계층을 두는 이유다. L1에서 찾지 못한 데이터를 L2나 마지막 단계 캐시에서 찾을 수 있으므로 **L1 Miss가 곧 DRAM 접근은 아니다**.

L1을 명령어용과 데이터용으로 나누거나 여러 코어가 하위 캐시를 공유하는 구성도 있다. 하지만 ‘모든 L3는 모든 코어가 공유한다’처럼 계층 이름만으로 공유 범위를 정할 수는 없다. Linux에서는 CPU별 `cache/index*` 아래의 `level`, `type`, `size`, `shared_cpu_list`, `coherency_line_size` 등으로 실제 구성을 살핀다. [Linux의 CPU Cache 정보](https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-devices-system-cpu)

## Page, Cache Line, 접근하는 데이터의 크기

세 단위는 서로 다른 문제를 다룬다.

| 단위 | 역할 | 이 문서의 계산 예 |
|---|---|---|
| Page | 가상 주소와 물리 Frame의 연결, 접근 권한과 메모리 관리 | 4 KiB |
| Cache Line | CPU 캐시가 데이터를 보관하고 가져오는 블록 | 64 B |
| Load·Store의 데이터 폭 | 명령이 실제로 읽거나 쓰는 값의 크기 | `int` 4 B |

페이지가 언제나 디스크와 RAM 사이를 오가는 것은 아니다. 새 익명 페이지를 0으로 채우거나 RAM에 있는 내용을 복사해 Page Fault를 처리할 수도 있다. 반대로 데이터 Cache Miss는 하위 캐시나 RAM에서 데이터를 찾는 사건으로, 그 자체가 Page Fault나 디스크 읽기를 뜻하지 않는다. [Paging](/wiki/computer-systems-network-topic-dbd836d1a044/)과 [Page Fault](/wiki/computer-systems-network-topic-5cebdbc10ddf/)에서 주소 변환과 복구 조건을 함께 볼 수 있다.

`word`도 문맥을 확인해야 한다. 일반적인 설명에서는 CPU가 다루는 기본 데이터 폭을 뜻하기도 하지만, x86 용어에서 Word는 16비트, Doubleword는 32비트, Quadword는 64비트다. 64비트 환경이라는 이유로 Word를 항상 8 B라고 부르거나 `int`를 반 Word라고 정하지 않는다. 할당기의 정렬과 최소 블록 크기는 다시 별도의 규칙이다. [Intel SDM의 기본 데이터 형식](https://www.intel.com/content/dam/support/us/en/documents/processors/pentium4/sb/25366521.pdf)

64 B Line을 가정하면 주소 `0x1004`의 4 B는 `0x1000`부터 `0x103f`까지의 Line에 들어간다. 그 Line이 이미 캐시에 있으면 다시 가져올 필요가 없다. 가져와야 한다면 이웃한 바이트도 함께 보관하므로 다음 접근에서 공간 지역성을 활용할 수 있다. 실제 Cache Line 크기나 메모리 버스의 전송 구성을 모든 x86·ARM CPU에 같은 값으로 고정하지 않는다.

Line을 크게 하면 이웃 데이터를 더 많이 가져올 수 있지만 사용하지 않는 바이트도 늘어난다. 더 작은 Line은 이런 낭비를 줄일 수 있는 대신 관리할 항목과 요청이 늘 수 있다. 캐시 용량, 접근 패턴, 전송 비용을 함께 고려하는 선택이다.

### 주소와 배열의 정렬을 바꿔 본다

4 KiB Page와 64 B Line에서 VA `0x1234`는 VPN 1, 페이지 offset `0x234`로 나뉜다. 페이지 안에서 아홉 번째 Line의 offset 52에 있는 주소다. 여기서 ‘아홉 번째’는 0부터 세면 index 8이라는 뜻이다. VPN 1을 물리 Frame 9로 연결했다면 PA는 `0x9234`이고, 그 주소가 속한 물리 Line의 시작은 `0x9200`이다. **VA를 분해해 얻은 숫자를 그대로 PA라고 읽지 않는다.**

다음 모형은 필요한 Line의 수를 계산한다. 실제 메모리를 읽거나 Cache Hit 횟수를 측정하는 코드는 아니다.

```run-python
PAGE, LINE, ITEM_BYTES = 4096, 64, 4
address, frame_number = 0x1234, 9
vpn, page_offset = divmod(address, PAGE)
physical = frame_number * PAGE + page_offset
print(f"VPN={vpn}, page_offset={page_offset:#x}, PA={physical:#x}")
print(f"line_base={physical // LINE * LINE:#x}, "
      f"line_offset={physical % LINE}")

def touched_lines(base, count, stride):
    assert count >= 0 and stride > 0
    return {(base + i * stride + byte) // LINE
            for i in range(count) for byte in range(ITEM_BYTES)}

for label, base, stride in [("aligned", 0x1000, 4),
                            ("shifted by 4 B", 0x1004, 4),
                            ("stride 64 B", 0x1000, 64)]:
    print(f"{label}: {len(touched_lines(base, 16, stride))} lines")
```

Python 3.9.6에서 실행한 결과다.

```text
VPN=1, page_offset=0x234, PA=0x9234
line_base=0x9200, line_offset=52
aligned: 1 lines
shifted by 4 B: 2 lines
stride 64 B: 16 lines
```

4 B 정수 16개는 합계 64 B지만, 시작 주소가 Line 경계에서 4 B 밀리면 두 Line에 걸친다. 배열 크기만으로 ‘첫 접근 한 번이 Miss이고 나머지는 전부 Hit’라고 보장할 수 없는 이유다. 실제 결과에는 Prefetch, 교체, 다른 코어의 쓰기와 캐시 상태도 영향을 준다.

## 어디에 보관하고 무엇을 내보내는가

캐시에 없는 데이터를 요청하는 이유는 나누어 생각할 수 있다. 처음 접근한 데이터는 Compulsory Miss, 필요한 데이터가 용량을 넘어 밀려나는 경우는 Capacity Miss, 같은 위치에 들어가야 하는 Line끼리 경쟁하는 경우는 Conflict Miss로 설명한다. 여러 코어의 일관성 처리에서 생기는 Miss까지 이 세 분류만으로 모두 설명하는 것은 아니다.

| 배치 방식 | Line을 둘 수 있는 위치 |
|---|---|
| Direct Mapped | 정해진 한 위치 |
| Fully Associative | 캐시의 어느 위치든 가능 |
| Set Associative | 정해진 Set 안의 여러 Way 중 하나 |

Fully Associative라고 용량 부족이나 첫 접근의 Miss까지 사라지는 것은 아니다. N-way는 Set 하나의 후보 수이며 전체 캐시의 Line 수와 구별한다. 주소로 Set을 고르는 방식과 그 안에서 Tag를 비교하는 방식도 함께 읽어야 한다.

교체에는 LRU처럼 최근 사용 이력을 고려하는 방식, 그 이력을 적은 상태로 근사하는 방식, 무작위 선택 등이 있다. 어떤 정책이 유리한지는 접근 패턴과 구현 비용에 달려 있다. 특정 계층이 언제나 같은 정책을 쓰거나 Random과 LRU의 성능이 항상 비슷하다고 단정하지 않는다.

## 쓰기를 전달하는 시점과 공유의 비용

Write-through는 캐시에 한 쓰기를 아래 계층에도 전달하는 정책이고, Write-back은 변경된 Line을 Dirty로 표시해 나중에 전달할 수 있는 정책이다. 아래 계층은 반드시 DRAM 하나로 고정되지 않는다. Dirty Line은 교체 외에도 일관성 요청이나 명시적 처리에 따라 전달될 수 있다.

Write-through라는 이름만으로 여러 코어의 동기화와 프로그램의 데이터 경쟁이 해결되지는 않는다. Cache Coherence가 한 주소의 일관성을 다루더라도, 복합 연산 전체를 원자적으로 만들거나 필요한 실행 순서를 모두 보장하는 것은 아니다. 프로그램은 Mutex나 Atomic 등 해당 언어와 실행 환경의 동기화 규칙을 따라야 한다.

서로 다른 변수도 같은 Line에 놓일 수 있다. 한 코어가 자주 쓰는 변수와 다른 코어가 읽는 변수가 같은 Line을 공유하면, 읽는 변수 자체가 바뀌지 않아도 Line을 다시 가져오는 비용이 생길 수 있다. 이것이 False Sharing이다. 올바르게 동기화한 프로그램에서도 생길 수 있는 성능 문제이므로 Data Race와 같은 뜻으로 쓰지 않는다. [Linux의 False Sharing 사례](https://docs.kernel.org/kernel-hacking/false-sharing.html)

## OS와 에뮬레이터에서 확인할 범위

일반적인 캐시 적재와 교체는 하드웨어가 수행하지만, OS와 프로그램에도 영향을 줄 수 있는 수단이 있다. 데이터 배치와 CPU 배정, 페이지 배치, Prefetch와 Cache 관리 명령, 메모리 유형과 동기화가 캐시의 사용 양상에 관계된다. Page Coloring은 물리 페이지와 캐시 Set의 관계를 이용하는 기법이지만, 모든 Linux·Windows 구성이 같은 정책으로 이를 사용한다고 설명해서는 안 된다.

DMA에서도 무조건 `clflush`를 직접 호출하면 된다고 일반화하지 않는다. Linux의 DMA API는 장치와 CPU의 주소·일관성 조건을 다루며, Coherent Mapping과 Streaming Mapping의 계약이 다르다. Coherent Memory에서도 Descriptor의 내용을 먼저 쓰고 유효 상태를 나중에 알리는 순서에는 적절한 Barrier가 필요할 수 있다. [Linux DMA Mapping의 일관성 조건](https://docs.kernel.org/core-api/dma-api-howto.html)

`lrn-pintos`의 `5afaa6d` 시점에서는 `PGSIZE=4096`이고 페이지 할당은 Pool과 Bitmap을 사용한다. 64 B Line을 **가정하면** 4 KiB Frame에는 64개 Line이 들어간다는 정렬 관계를 계산할 수 있다. 하지만 할당기가 캐시의 Set을 고르거나 그 페이지를 L1에 올려 준다는 뜻은 아니다. 메모리 맵의 사용 가능한 구간과 예약 영역도 확인해야 하므로 Pool을 무조건 하나의 연속된 사용 가능 RAM 덩어리로 간주하지 않는다. [PintOS의 페이지 할당](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/palloc.c), [페이지 크기와 정렬](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/threads/vaddr.h)

QEMU TCG는 Guest 명령을 Host에서 실행할 코드로 번역한다. 일반 TCG의 Software TLB는 주소 변환을 빠르게 처리하는 자료구조이며, Guest CPU의 L1·L2·L3 Hit·Miss 지연을 그대로 재현하는 장치가 아니다. QEMU에서 잰 경과 시간에는 Host와 에뮬레이터의 비용이 섞이므로 그 시간을 Guest 하드웨어의 Cache Miss Cycle로 보고하지 않는다. [QEMU TCG의 메모리 처리와 캐시 모델 범위](https://www.qemu.org/docs/master/devel/multi-thread-tcg.html)

CPU 캐시는 명령어와 데이터를, TLB는 주소 변환을, OS의 Page Cache나 Buffer Cache는 파일·장치 I/O에 쓰는 내용을 보관한다. 저장 대상과 관리 계층이 다르므로 이 셋을 CPU Cache → TLB → Disk Cache라는 하나의 직렬 경로로 그리지 않는다. 주소 변환은 [Paging](/wiki/computer-systems-network-topic-dbd836d1a044/), 파일과 장치 쪽의 재사용은 [Buffer Cache](/wiki/file-system-buffer-cache/)로 이어진다.
