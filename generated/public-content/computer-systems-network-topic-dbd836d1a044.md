---
layout: default
title: Paging
nav_order: 4
permalink: /wiki/computer-systems-network-topic-dbd836d1a044/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-dbd836d1a044
projection_sha256: 5b531862d628153b366c5447e30fd321d171799fc8ec90c8564193257a45e51b
parent: 메모리 관리
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-d160fea60072
search_terms:
- 페이징
grand_parent: OS
ancestor: 시스템
---

# Paging
{: .no_toc }

## 가상 페이지와 물리 Frame을 연결한다

Paging은 가상 주소 공간을 페이지로 나누고 각 페이지를 물리 Frame에 연결한다. 페이지 크기가 4 KiB라면 주소의 하위 12비트는 페이지 안의 offset이고 나머지는 어느 페이지인지 구분하는 데 쓰인다. 연속된 가상 페이지가 물리적으로도 연속된 Frame을 사용해야 하는 것은 아니다.

Page Table에는 주소뿐 아니라 접근 권한과 상태도 들어간다. 프로세스마다 같은 숫자의 User VA를 서로 다른 Frame에 연결할 수 있고, 한 Frame을 여러 VA로 볼 수도 있다. 후자는 공유 메모리나 파일 Mapping뿐 아니라 Kernel이 사용자 메모리에 접근하는 구조를 이해할 때도 필요하다.

## 주소의 어느 비트로 테이블을 고르는가

x86-64의 4단계 Paging에서 4 KiB 페이지를 찾을 때는 VA의 36비트를 9비트씩 나눠 네 테이블의 index로 사용한다. 각 테이블에는 8바이트 엔트리 512개가 들어가므로 테이블 자체의 크기는 4 KiB다. 엔트리 하나가 담당하는 가상 주소 범위는 단계마다 다르다.

| 필드 | VA 비트 | PintOS 계산 | 한 엔트리의 범위 | 테이블 전체의 범위 |
|---|---|---|---|---|
| PML4 index | 47:39 | `(va>>39)&0x1ff` | 512 GiB | 256 TiB |
| PDPT index | 38:30 | `(va>>30)&0x1ff` | 1 GiB | 512 GiB |
| PD index | 29:21 | `(va>>21)&0x1ff` | 2 MiB | 1 GiB |
| PT index | 20:12 | `(va>>12)&0x1ff` | 4 KiB | 2 MiB |
| Page offset | 11:0 | `va&0xfff` | 페이지 안의 바이트 위치 | 0~4,095 |

`0x1ff`는 9비트가 모두 1인 511이다. index는 항상 0~511이며 1은 두 번째 엔트리를 뜻한다. 예를 들어 상위 index들이 0인 PD[2]의 범위는 `0x400000~0x5fffff`이고, PT[2]는 `0x2000~0x2fff`를 담당한다. 마지막 PD[511]은 `0x3fe00000~0x3fffffff`, 마지막 PT[511]은 `0x1ff000~0x1fffff` 범위다. [PintOS의 index 매크로](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/threads/pte.h)

이 표는 4단계 주소 변환을 전제로 한다. 64비트 값 모두를 독립적인 VA로 사용하는 것은 아니다. 이 모드의 canonical 주소는 상위 16비트가 bit 47의 부호 확장이며, 그 조건을 어기는 값을 네 index로 나눴다고 해서 유효한 주소가 되지는 않는다. 주소 비트 조건을 만족하는 것과 실제 Mapping·접근 권한이 있는 것도 별개의 조건이다.

### 같은 주소를 분해하고 다시 조립한다

다음 코드는 index와 offset을 구한 뒤 원래 주소를 다시 조립한다. PintOS의 `KERN_BASE=0x8004000000`, User Stack 바로 아래의 `0x4747f000`, 여러 테이블 범위를 선택하는 주소를 같은 방식으로 계산한다. 실제 Page Table이나 MMU를 실행하는 모형은 아니다.

```run-python
PAGE, MASK = 4096, 4095
SHIFTS = (39, 30, 21, 12)
U64 = (1 << 64)-1

def canonical48(address):
    sign = (address >> 47) & 1
    return 0 <= address <= U64 and address >> 48 == (0xffff if sign else 0)

def split(address):
    assert canonical48(address)
    return tuple((address >> shift) & 0x1ff for shift in SHIFTS)+(address & MASK,)

def join(fields):
    address = sum(index*(1 << shift) for index,shift in zip(fields[:4],SHIFTS))+fields[4]
    if address & (1 << 47):
        address |= U64 ^ ((1 << 48)-1)
    return address

addresses = [0x08048123, 0x8004000000, 0x4000000000,
             0x4747f000, 0x4000401000, 0x4001a03c,
             0xffff800000000123]
print('VA                 PML4 PDPT PD  PT  offset')
for address in addresses:
    fields = split(address)
    assert all(0 <= index < 512 for index in fields[:4])
    assert join(fields) == address
    print(f'{address:016x}', *[f'{index:4d}' for index in fields[:4]], f'{fields[4]:03x}')
assert split(0x08048123) == (0,0,64,72,0x123)
assert split(0x8004000000) == (1,0,32,0,0)
assert not canonical48(0x0000800000000000)

address = 0x4001a03c
base = address & ~MASK
rounded_up = (address+MASK) & ~MASK
print(f'page_number={address>>12:x} down={base:x} up={rounded_up:x}')
assert ((base+MASK) & ~MASK) == base
# Independent entry arithmetic: assume a 52-bit physical address field and NX bit.
physical_mask = ((1 << 52)-1) & ~MASK
pte = (1 << 63) | 0x12345000 | 7
physical = (pte & physical_mask) | (address & MASK)
assert physical == 0x1234503c
print(f'pte={pte:016x} frame={pte & physical_mask:x} physical={physical:x}')
print(f'PT base=3000 index=1 entry_address={0x3000+8*1:x}')

start, remaining = 0x40000ffe, 4
chunks = []
while remaining:
    count = min(remaining,PAGE-(start & MASK))
    chunks.append((hex(start),count))
    start += count
    remaining -= count
assert chunks == [('0x40000ffe',2),('0x40001000',2)]
print('page_chunks',chunks)
print('remaining_at_offset_300',PAGE-0x300)
print('fully_populated_table_bytes',[PAGE*512**level for level in range(4)])
```

Python 3.9.6에서 실행한 결과다.

```text
VA                 PML4 PDPT PD  PT  offset
0000000008048123    0    0   64   72 123
0000008004000000    1    0   32    0 000
0000004000000000    0  256    0    0 000
000000004747f000    0    1   58  127 000
0000004000401000    0  256    2    1 000
000000004001a03c    0    1    0   26 03c
ffff800000000123  256    0    0    0 123
page_number=4001a down=4001a000 up=4001b000
pte=8000000012345007 frame=12345000 physical=1234503c
PT base=3000 index=1 entry_address=3008
page_chunks [('0x40000ffe', 2), ('0x40001000', 2)]
remaining_at_offset_300 3328
fully_populated_table_bytes [4096, 2097152, 1073741824, 549755813888]
```

`0x08048123`의 PD index는 64이고 PT index는 72다. KERN_BASE는 PML4[1] 아래의 PDPT[0]·PD[32]에서 시작한다. `0x4747f000`도 같은 9비트 마스크로 계산하므로 PD index가 511을 넘을 수 없다. 주소를 조립하는 검산은 index 값과 비트 위치를 함께 확인하는 방법이다.

### 엔트리의 주소와 엔트리에 저장된 주소

CR3는 현재 루트 테이블의 물리 주소와 제어 정보를 담는다. 그 루트에서 PML4E, PDPTE, PDE가 다음 테이블의 주소를 제공하고, 마지막 PTE가 데이터 Frame의 주소를 제공한다. 각 단계에서 읽는 **엔트리 자체의 주소**와 그 엔트리에 **저장된 다음 주소**를 구별해야 한다. PT의 물리 시작이 `0x3000`이고 PT index가 1이면 PTE가 놓인 물리 위치는 `0x3008`이다. 그 위치의 8바이트 값에 들어 있는 Frame 주소가 최종 변환에 쓰인다.

현재 PintOS의 소프트웨어 조회는 `pml4_get_page → pml4e_walk → pdpe_walk → pgdir_walk`로 이어진다. 별도의 `pt_walk()`를 호출하지 않는다. 마지막 `pgdir_walk()`가 `ptov(PTE_ADDR(pdp[idx])+8*PTX(va))`로 PTE를 읽고 쓸 Kernel 포인터를 반환한다. `pml4e_walk()`의 반환값이 NULL이 아니어도 최종 PTE의 P 비트가 0일 수 있다. [조회와 Mapping 구현](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/mmu.c)

`create=0`에서 중간 테이블이 없으면 조회는 NULL을 반환한다. `create=1`이면 `PAL_ZERO`로 필요한 테이블을 확보하고 그 물리 주소와 P·W·U 비트를 상위 엔트리에 기록한다. `pml4e_walk()`와 `pdpe_walk()`는 이번 호출에서 새 테이블을 만들었는지 `allocated`로 기억한다. 하위 조회가 실패했을 때만 그 새 페이지를 회수하고 엔트리를 0으로 되돌린다. 이미 있던 테이블까지 함께 해제하는 절차가 아니다. 테이블 페이지를 만든 것과 사용자의 데이터 Frame을 확보한 것도 서로 다른 할당이다.

P·W·U는 존재 여부와 접근 허용에, A·D는 접근·쓰기 상태 추적에 쓰인다. PintOS의 `PTE_A`는 bit 5(`0x20`), `PTE_D`는 bit 6(`0x40`)다. `is_writable(pte)`와 `is_user_pte(pte)`는 해당 leaf PTE의 W·U 비트만 검사한다. OS가 W·U를 설정하고 하드웨어가 접근에 따라 A·D를 갱신하는 역할을 모두 ‘하드웨어가 권한 비트를 켠다’로 묶으면 안 된다. User 접근과 쓰기 허용은 최종 PTE만으로 결정되지 않으며 상위 엔트리와 CPU의 접근 모드도 함께 작용한다.

PintOS의 `PTE_ADDR()`와 `pte_get_paddr()`는 하위 12비트를 지우는 단순 마스크다. 이것을 모든 x86-64 PTE의 완전한 주소 추출식으로 쓰면 NX 같은 상위 비트가 남는다. 위 실행 예제는 물리 주소 폭을 52비트로 **가정한** 마스크로 NX를 분리했다. 실제 하드웨어에서는 지원하는 물리 주소 폭과 엔트리 종류에 맞춰 주소·예약·상태 비트를 해석한다. PDPTE·PDE의 PS 비트와 마지막 PTE의 같은 위치에 있는 PAT 비트도 같은 의미가 아니다.

### 필요한 하위 테이블만 만든다

사용하지 않는 주소 범위의 하위 테이블까지 미리 만들 필요는 없다. 4 KiB 페이지로 4단계의 모든 엔트리를 채운다는 가정에서는 PML4 1개, PDPT 512개, PD 512²개, PT 512³개가 필요하다. 테이블별 총 저장량은 각각 4 KiB, 2 MiB, 1 GiB, 512 GiB다. 실제 프로세스의 측정값이 아니라 전체 공간을 빠짐없이 채웠을 때의 계산이며 데이터 Frame의 비용은 포함하지 않는다.

큰 페이지는 중간 단계에서 Frame을 직접 가리켜 더 아래의 테이블을 생략한다. 지원되는 하드웨어에서 PDPTE의 PS=1은 1 GiB 페이지와 30비트 offset, PDE의 PS=1은 2 MiB 페이지와 21비트 offset을 사용한다. 일반 4 KiB Mapping은 마지막 PTE까지 내려가 12비트 offset을 붙인다. Frame도 선택한 페이지 크기로 정렬되어야 한다.

PintOS의 **부트 초기 Mapping과 일반 Mapping은 여기서 다르다**. [`start.S`](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/start.S)는 PDE에 `PTE_P|PTE_W|0x180`을 기록하고, 2 MiB 간격의 물리 주소를 두 PD에 각각 128개 PDE로 연결한다. 두 범위가 같은 물리 영역을 별칭으로 가리킨다. PS가 켜진 부트 Mapping이다. 이후 [`paging_init()`](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/init.c)은 PGSIZE 간격으로 일반 테이블을 구성한다. 현재 `mmu.c`의 walk에는 PS를 읽고 조기에 종료하는 분기가 없으므로, 이 조회 함수를 부트의 큰 페이지 테이블에도 그대로 사용할 수는 없다.

Linux는 공통 계층을 `PGD → P4D → PUD → PMD → PTE`로 표현한다. x86의 4단계 구성에서는 P4D가 접히고 PGD가 PML4에 해당하며, PUD는 PDPT, PMD는 PD에 해당한다. 5단계 구성에서는 57비트 가상 주소를 사용하고 비트 56:48이 PML5 index가 된다. 이때 Linux의 PGD는 PML5, P4D는 PML4에 해당한다. 엔트리를 찾는 `*_offset()`·`pte_offset_*()`과 상태를 바꾸는 PTE helper를 구별해 읽는다. Linux 6.16의 `pte_mkwrite()`·`pte_wrprotect()`는 쓰기, `pte_mkyoung()`·`pte_mkold()`는 접근, `pte_mkdirty()`·`pte_mkclean()`은 dirty 상태를 다룬다. [x86 PTE helper](https://github.com/torvalds/linux/blob/v6.16/arch/x86/include/asm/pgtable.h) [Linux Page Table 계층과 folding](https://docs.kernel.org/6.16/mm/page_tables.html), [x86 5단계 Paging](https://docs.kernel.org/6.16/arch/x86/x86_64/5level-paging.html)

Linux HugeTLB는 지원되는 크기의 큰 페이지를 별도 Pool에서 관리한다. `/proc/meminfo`의 `HugePages_Total`만 보고 1 GiB 페이지 수라고 읽으면 안 된다. `Hugepagesize`는 기본 크기이고 크기별 Pool은 `/sys/kernel/mm/hugepages`에서 구별한다. PMD 크기의 THP는 애플리케이션이 HugeTLB Pool을 직접 지정하는 방식과 다르다. 큰 페이지는 TLB 부담을 줄일 수 있지만 연속된 물리 공간과 단편화 비용도 함께 고려한다. [HugeTLB의 크기별 Pool](https://docs.kernel.org/6.16/admin-guide/mm/hugetlbpage.html)

Windows의 일반 애플리케이션은 `GetLargePageMinimum()`으로 크기를 조회하고, 필요한 권한과 정렬을 갖춰 `VirtualAlloc(...,MEM_LARGE_PAGES,...)` 경로를 사용한다. `CreateFileMappingW`에서 `SEC_LARGE_PAGES|SEC_COMMIT`을 사용하는 경로도 있다. 이 경우 paging file이 backing이어야 하고, `SeLockMemoryPrivilege`와 large-page 크기에 맞는 객체·view 크기 및 정렬이 필요하다. 일반 데이터 파일이나 실행 이미지 Mapping에 같은 옵션을 적용하는 것은 아니다. [SEC_LARGE_PAGES의 조건](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-createfilemappingw) 특정 크기의 지원을 OS 이름만으로 단정하지 않는다. Kernel 내부 `_MMPTE`·`MiGetPteAddress`의 형태를 고정 API로 사용하는 대신, 디버거에서는 `!pte`가 보여 주는 PDE·PTE와 상태 비트를 대상 시스템에 맞춰 읽는다. [Windows Large Page](https://learn.microsoft.com/en-us/windows/win32/memory/large-page-support), [WinDbg !pte](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/-pte)

## 페이지 안의 위치로 경계와 접근 범위를 계산한다

`pg_ofs(va)`는 offset, `pg_no(va)`는 `va>>12`로 페이지 번호를 얻는다. `pg_round_down()`은 페이지 시작으로 내리고, `pg_round_up()`은 현재 주소 이상인 가장 가까운 경계로 올린다. 이미 정렬된 주소는 그대로다. C의 고정 폭 정수에서는 올림에 사용하는 덧셈이 넘치지 않는 입력 범위도 확인해야 한다. [PintOS의 페이지 연산](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/threads/vaddr.h)

VA `0x4001a03c`는 페이지 `0x4001a000` 안의 offset `0x3c`를 가리킨다. Frame 시작이 `0x12345000`이면 PA는 `0x1234503c`다. 페이지 크기만큼 정렬된 Frame에 offset을 더하므로 이 경우 덧셈과 OR의 결과가 같다. 같은 페이지 안의 주소들이 Frame을 공유한다는 것은 페이지 경계를 넘는 다음 바이트까지 같은 Frame에 있다는 뜻이 아니다.

offset이 `0x300`이면 현재 페이지에 남은 바이트 수는 `4096-768=3328`이다. 현재 [`copy_in()`·`copy_out()`](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/userprog/syscall.c)는 매번 주소를 검증하고 `min(남은 전체 크기,PGSIZE-pg_ofs(user))`만 복사한다. 다음 페이지에서는 다시 검증한다. 첫 페이지가 유효하다는 사실만으로 버퍼 전체의 접근을 허용하지 않는 이유다.

같은 내림 연산도 사용하는 목적은 다르다. SPT 검색은 fault 주소를 페이지 시작으로 정규화한다. `running_thread()`는 **Kernel Stack에서 실행 중인 RSP**가 `struct thread`와 같은 페이지에 놓인다는 배치 규칙을 이용한다. 임의의 User RSP를 내렸다고 Kernel의 thread 객체를 얻는 것은 아니다. Stack growth도 정렬만으로 허용하지 않는다. 현재 코드는 원래 fault 주소가 User Stack 최대 범위 안에 있고 기준 RSP의 32바이트 아래 이상인지 확인한 뒤 페이지를 확보한다. [SPT와 Stack growth](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/vm/vm.c), [현재 Thread의 Stack 배치](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/thread.c)

TLB는 변환을 재사용하지만 VPN과 PFN 두 숫자만 저장하는 단순 표로 이해하면 부족하다. 접근 종류와 권한, 주소 공간의 문맥도 관계된다. QEMU 10.0의 TCG 코드도 MMU index와 읽기·쓰기·명령어 접근을 구분하고, 직접 RAM을 접근할 수 있는 경로에서는 Guest VA에 `addend`를 더해 Host 포인터를 구한다. 모든 접근이 `mmu_translate()` 호출 하나를 거친다거나 TLB 태그의 하위 비트가 항상 0이라는 설명은 맞지 않는다. 이 Host 포인터 계산과 앞서 구한 Guest PA도 구별한다. [QEMU의 TLB 처리](https://github.com/qemu/qemu/blob/v10.0.0/accel/tcg/cputlb.c)

GDB에서 이미 멈춘 대상의 주소를 분해할 때는 다음처럼 64비트 마스크를 쓸 수 있다. 아래는 대상에 연결한 뒤 사용하는 관찰 명령이며 이 문서에서 실행한 GDB 결과는 아니다.

```gdb
set $va = (unsigned long long)$rip
p/x $va & 0xfffULL
p/x $va & ~0xfffULL
p/x ($va >> 39) & 0x1ffULL
p/x ($va >> 30) & 0x1ffULL
p/x ($va >> 21) & 0x1ffULL
p/x ($va >> 12) & 0x1ffULL
```

페이지 시작의 `x/1gx`는 해당 주소가 현재 문맥에 매핑된 경우에 읽는다. QEMU monitor의 `info tlb`와 GDB의 명령도 구별해야 한다. 표에 나온 index를 계산하는 것, 테이블 엔트리를 읽는 것, 실제 CPU 접근이 허용되는 것은 각각 따로 확인할 단계다.

## PAL_USER가 고르는 것은 주소가 아니라 Pool이다

PintOS의 [`palloc_get_page(PAL_USER)`](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/palloc.c)는 User Pool에서 프레임을 예약하지만 **Kernel VA를 반환한다**. `PAL_USER`는 어떤 자원 Pool을 사용할지 정한다. 호출자가 사용할 User VA나 Page Table을 인자로 받는 함수가 아니다.

| 값 | 역할 |
|---|---|
| `upage` | 프로세스가 사용할 가상 페이지의 시작 주소 |
| `kpage` | Kernel이 프레임을 읽고 쓸 때 사용할 가상 주소 |
| `vtop(kpage)` | Page Table에 기록할 Guest 물리 Frame의 시작 주소 |
| `PTE_P` | 현재 Mapping이 present인지 나타내는 비트 |
| `PTE_U` | User 모드 접근을 허용하는 비트 |
| `PTE_W` | 쓰기를 허용하는 비트 |

Kernel은 실행 파일의 데이터를 프레임에 읽거나, 남은 부분을 0으로 채우고, fork의 내용을 복사해야 한다. 이때 `file_read_at()`·`memset()`·`memcpy()`에 넘길 C 포인터가 필요하다. 한편 프로세스는 자기 주소 공간의 코드·Stack 주소를 통해 같은 바이트에 접근한다. 두 요구를 연결하는 것이 Mapping이다.

[메모리 관리](/wiki/computer-systems-network-topic-d160fea60072/)의 할당기가 빈 Frame을 확보한 뒤, Page Table에 `upage → Frame`을 설치한다. `upage → kpage → Frame`처럼 User VA가 다른 VA를 거쳐 번역되는 구조는 아니다. User Mapping과 Kernel Mapping이 각각 같은 Frame을 가리킨다.

## Kernel 직접 Mapping과 PTE의 주소

이 레포의 [`vaddr.h`](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/threads/vaddr.h)는 `KERN_BASE=0x8004000000`을 사용한다.

```text
Kernel VA = Guest PA + KERN_BASE
Guest PA  = Kernel VA - KERN_BASE
```

`ptov()`는 첫 번째 계산으로 포인터를 만들고, `vtop()`은 Kernel 주소인지 ASSERT로 확인한 뒤 두 번째 계산을 한다. 이 산술 함수가 실제 메모리 접근 때 호출되어 CPU의 주소 번역을 대신하는 것은 아니다. CPU는 현재 Page Table과 TLB를 통해 주소를 번역하며, 직접 Mapping은 위 관계가 성립하도록 미리 구성된 Mapping이다. 변환 매크로만으로 해당 물리 주소에 RAM이 존재하거나 접근 권한이 있다고 증명할 수도 없다.

[`pml4_set_page()`](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/mmu.c)는 `upage`에 해당하는 leaf PTE를 찾거나 만들고 다음 값을 기록한다.

```c
*pte = vtop(kpage) | PTE_P | (rw ? PTE_W : 0) | PTE_U;
```

kpage 자체가 PTE에 들어가지 않고, 물리 Frame 주소로 바꾼 값이 들어간다. 이때 `PTE_P/W/U`의 값은 각각 `0x1/0x2/0x4`다.

반대로 `pml4_get_page(pml4,uaddr)`는 present PTE를 찾으면 `ptov(PTE_ADDR(*pte))+pg_ofs(uaddr)`를 반환한다. 결과는 Kernel VA이며, 입력 uaddr의 페이지 안 offset도 유지한다. 현재 함수가 확인하는 것은 Mapping의 present 상태다. 이 함수가 포인터를 반환했다고 User 쓰기 권한이나 전체 버퍼의 유효성이 자동으로 확인되는 것은 아니다.

### 두 VA에서 같은 바이트를 읽는다

다음 모형은 물리 Frame 하나를 Byte Array로 두고 User VA와 Kernel VA로 각각 접근한다. Frame의 PA는 `0xb05000`, User 페이지는 `0x8048000`으로 정했다. 실제 부팅에서 얻은 주소가 아니라 주소·offset·권한의 역할을 비교하기 위한 값이다. 간단한 leaf PTE만 모델링하며 네 단계 Page Table이나 TLB는 구현하지 않는다.

```run-python
PAGE = 4096
KERN_BASE = 0x8004000000
PRESENT, WRITE, USER = 1,2,4
upage,frame_pa = 0x8048000,0xb05000
kpage = KERN_BASE+frame_pa
pte = frame_pa|PRESENT|WRITE|USER
frame = bytearray(PAGE)

def user_offset(address,writing=False):
    if address//PAGE != upage//PAGE or not pte&PRESENT or not pte&USER:
        raise PermissionError('user mapping unavailable')
    if writing and not pte&WRITE:
        raise PermissionError('user page is read only')
    physical = (pte&~(PAGE-1))+(address&(PAGE-1))
    return physical-frame_pa

def kernel_offset(address):
    physical = address-KERN_BASE
    if not frame_pa <= physical < frame_pa+PAGE:
        raise ValueError('outside this frame')
    return physical-frame_pa

offset = 0x123
uva,kva = upage+offset,kpage+offset
frame[kernel_offset(kva)] = 0x41
print('pte',hex(pte),'user_va',hex(uva),'kernel_va',hex(kva))
print('guest_pa_from_user',hex((pte&~(PAGE-1))+offset))
print('guest_pa_from_kernel',hex(kva-KERN_BASE))
print('initial_views',hex(frame[user_offset(uva)]),hex(frame[kernel_offset(kva)]))
frame[user_offset(uva,writing=True)] = 0x5a
print('after_user_write',hex(frame[kernel_offset(kva)]))
pte &= ~WRITE
try:
    user_offset(uva,writing=True)
except PermissionError:
    print('read_only_user_write_rejected',True)
print('kernel_alias_still_readable',hex(frame[kernel_offset(kva)]))
assert (pte&~(PAGE-1))+offset == kva-KERN_BASE
```

처음 Kernel 주소로 넣은 `0x41`을 User 주소에서도 읽고, User 주소로 바꾼 `0x5a`를 Kernel 주소에서 읽는다. 데이터가 별도로 복제된 것이 아니라 같은 Byte Array 위치에 접근한 결과다. 한 Mapping의 쓰기 권한을 바꾸는 일과 Frame 자체를 제거하는 일도 구분된다.

## 실행 파일의 적재와 VM의 지연 적재

[`process.c`](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/userprog/process.c)의 VM을 사용하지 않는 `load_segment()`는 프레임을 먼저 확보한다. 페이지에 해당하는 파일 바이트를 `file_read_at(file,kpage,page_read_bytes,ofs)`로 읽고, 남은 `page_zero_bytes`를 0으로 채운 다음 `install_page(upage,kpage,writable)`로 연결한다. 읽기나 Mapping 설치가 실패하면 확보한 프레임을 반환한다.

`install_page()`는 `pml4_get_page()`로 기존 Mapping이 없는지 검사한 뒤 `pml4_set_page()`를 호출한다. 현재 `pml4_set_page()` 자체는 leaf가 이미 present인지 검사하지 않으므로, 상위 호출자의 중복 검사와 하위 함수의 역할을 나누어 읽어야 한다.

VM 빌드의 `load_segment()`는 파일·offset·읽을 길이·0으로 채울 길이를 aux에 담고 `vm_alloc_page_with_initializer()`로 등록한다. 아직 모든 프레임을 읽어 오는 단계는 아니다. 나중에 프레임을 확보하면 `lazy_load_segment()`가 `page->frame->kva`에 파일 내용을 읽고 나머지를 0으로 채운다. aux와 파일 참조의 반환은 이 페이지의 초기화 수명에 속한다. Eager 적재의 코드 조각을 모든 VM 실행 경로의 순서라고 일반화하면 안 된다.

## Guest 물리 주소와 Host 메모리

QEMU에서 PintOS의 PTE가 가리키는 것은 **Guest PA**다. Host의 물리 주소나 QEMU 프로세스의 포인터가 아니다. QEMU의 메모리 계층은 Guest 물리 주소의 구간을 RAM backing이나 MMIO 동작에 연결한다. RAM 구간은 Host 메모리에, MMIO 구간은 장치 동작을 처리하는 callback에 대응할 수 있다. [QEMU 메모리 API](https://www.qemu.org/docs/master/devel/memory.html)

TCG 실행에서 Guest의 메모리 명령은 주소 번역과 접근 처리를 거친다. Guest에서 `memset(kpage,0,...)`를 실행한다는 이유만으로 전체 호출이 반드시 Host의 `memset()` 한 번으로 바뀐다고 볼 수는 없다. 또한 User VA와 Kernel VA가 각각 같은 Frame에 도달한다는 설명은 Guest 주소 공간 안의 별칭 관계다. 가상화 구현에서 Guest PA를 Host 메모리에 연결하는 별도 계층까지 없다는 뜻은 아니다.

Linux는 `struct page` 같은 메타데이터로 페이지를 다루며, 영구적인 직접 Mapping에 포함되지 않은 Highmem 페이지에는 임시 Mapping이 필요할 수 있다. `kmap_local_page()`로 얻은 주소는 호출한 문맥 안에서 사용하고 `kunmap_local()`로 반환한다. 낮은 메모리 페이지나 `CONFIG_HIGHMEM=n` 구성에서는 같은 API가 직접 Mapping 주소를 돌려줄 수 있다. 이 구분 때문에 모든 Kernel 페이지 접근을 고정된 상수 덧셈 하나로 설명할 수는 없다. [Linux의 Highmem과 임시 Mapping](https://docs.kernel.org/mm/highmem.html)

Windows의 MDL은 버퍼가 차지하는 물리 페이지를 기술하며, pageable 버퍼의 페이지를 고정하는 작업과 System 주소로 Mapping하는 작업은 구분된다. `MmGetSystemAddressForMdlSafe()`는 원래 프로세스의 User 주소 문맥에 의존하지 않는 System Mapping을 얻는 데 쓰인다. MDL을 할당하는 것만으로 페이지 고정과 Mapping이 모두 끝나는 것은 아니다. [Windows MDL 사용법](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/using-mdls)

## GDB로 Mapping과 데이터를 함께 확인한다

PintOS를 디버깅할 때는 이미 실행 중인 `pml4_set_page()`에서 멈추어 인자를 확인할 수 있다. 다음 명령은 QEMU와 해당 빌드의 심볼을 연결한 GDB 세션에서 사용하는 절차이며, 위 Python 모형의 실행 결과와는 별개의 검증이다.

```gdb
break pml4_set_page
continue
print/x upage
print/x kpage
print/x (uint64_t)kpage - 0x8004000000
```

소스를 보며 PTE 대입을 실행한 뒤 `pte`가 유효한지 확인하고 값을 읽는다. 고정된 `next` 두 번을 모든 빌드의 대입 완료 지점으로 가정하지 않는다.

```gdb
print/x pte
print/x *pte
print/x ((uint64_t)*pte & ~0xfffUL)
set $page_byte_offset = 0x123
x/16xb (char *)kpage + $page_byte_offset
```

그다음 현재 CR3가 대상 프로세스의 Page Table을 사용하는지 확인한 경우에만 User VA 쪽을 비교한다.

```gdb
x/16xb (char *)upage + $page_byte_offset
```

비교할 것은 PTE의 Frame 주소와 `kpage-KERN_BASE`, 두 Mapping이 가리키는 offset, 그리고 실제 바이트다. 서로 다른 두 Frame에 우연히 같은 데이터가 들어 있을 수도 있으므로 Dump 값이 같다는 사실 하나만으로 주소 별칭이 입증되지는 않는다. 프레임 번호와 유효한 Mapping을 함께 확인해야 한다.
