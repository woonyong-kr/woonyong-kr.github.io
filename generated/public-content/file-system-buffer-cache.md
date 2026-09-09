---
layout: default
title: Buffer Cache
nav_order: 6
permalink: /wiki/file-system-buffer-cache/
publication_state: publish
has_toc: true
projection_id: Wiki/computer-systems-network/os/file-system/buffer-cache
projection_sha256: 3929fd7cc3f475505e09fcbf53818c57aa69df3e09a82e4dbd173bd26e8f0a24
parent: 파일 시스템
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-2f8a1e4d5189
search_terms:
- 버퍼 캐시
- Page Cache
- 페이지 캐시
- Writeback
- Cache Hit
- Cache Miss
grand_parent: OS
ancestor: CS
---

# Buffer Cache
{: .no_toc }

같은 파일의 같은 512바이트를 열 번 읽더라도 디스크에 열 번 요청할 필요는 없다. 처음 읽은 내용을 RAM에 보관했다면 나머지 읽기는 그 복사본으로 처리할 수 있다. Buffer Cache는 이렇게 파일 시스템과 블록 장치 사이에서 읽은 데이터를 재사용한다. 읽기를 줄이는 원리는 단순하지만, 수정된 데이터를 언제 저장하고 어느 항목을 비울지 결정하는 순간부터 일관성과 동시성을 함께 다뤄야 한다.

여기서는 [lrn-pintos의 `5afaa6d` 시점](https://github.com/woonyong-kr/lrn-pintos/tree/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0)을 기준으로 현재 inode의 I/O와 캐시를 추가할 자리를 구분한다. 캐시가 줄이는 것은 해당 계층 아래로 내려가는 요청이다. 요청 수가 10회에서 1회로 줄었다고 실행 시간도 정확히 10배 빨라지는 것은 아니다.

## Hit로 끝나는 읽기와 Miss 뒤에 필요한 일

요청한 블록이 이미 캐시에 있으면 Cache Hit다. 슬롯의 데이터를 복사하면 되므로 해당 요청을 위해 `disk_read()`를 부르지 않는다. Cache Miss이면 공간을 확보하고 장치에서 데이터를 읽은 뒤 캐시 항목으로 등록한다.

여러 Thread가 같은 Sector를 동시에 요청할 수 있다면 ‘캐시에 없음을 확인한다’와 ‘그 Sector를 적재 중으로 표시한다’ 사이도 보호해야 한다. 그렇지 않으면 같은 Sector의 슬롯이 둘 생기거나, 아직 읽기가 끝나지 않은 버퍼를 다른 Thread가 사용할 수 있다. 읽기 도중인 항목과 사용할 준비가 된 항목을 구분하고, 복사하거나 I/O 중인 슬롯을 교체하지 않도록 참조 또는 Pin 상태를 관리해야 한다.

캐시가 없다면 PintOS의 `inode_read_at()`은 요청을 Sector별로 나누어 `disk_read()`를 호출한다. Sector 전체를 읽는 조각은 호출자의 버퍼로 바로 받고, 일부만 읽는 조각은 512바이트 Bounce Buffer에 전체를 읽어 필요한 부분을 복사한다. 이 Bounce Buffer는 한 번의 함수 호출 안에서 재사용하는 임시 공간이며, 다음 호출을 위한 캐시가 아니다. [현재 inode 읽기·쓰기](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/filesys/inode.c)

부분 쓰기도 원래 내용을 보존해야 하므로 읽기 후 수정이 필요할 수 있다. 반면 Sector 전체를 덮어쓰고 그 모든 바이트가 주어졌다면, 덮어쓸 예전 내용을 먼저 읽을 필요는 없다. 모든 Write Miss에 반드시 디스크 읽기가 필요하다고 그리면 이 차이가 사라진다.

## Dirty는 아직 아래 계층에 반영하지 않은 변경이다

캐시에서 값을 바꾸면 RAM과 아래 계층의 값이 달라진다. 이 항목을 Dirty로 표시하고, 변경을 내려보내는 작업을 Writeback이라고 한다. Dirty 슬롯을 저장하지 않은 채 다른 데이터로 재사용하면 수정 내용이 사라진다.

| 정책 | 쓰기 요청에서 하는 일 | 남는 비용과 조건 |
|---|---|---|
| Write-through | 캐시를 수정하고 아래 계층의 쓰기도 완료시킨다. | 반복 쓰기를 매번 전달한다. 아래 계층에도 휘발성 캐시가 있으면 별도의 영속성 조건이 필요하다. |
| Write-back | 캐시를 Dirty로 만들고 쓰기를 모아서 전달한다. | 같은 블록의 여러 변경을 합칠 수 있다. Dirty 데이터의 유실과 Writeback 실패를 다뤄야 한다. |

Write-through를 선택했다고 전원 손실에 무조건 안전해지는 것은 아니다. 장치나 가상화 계층이 완료를 어떤 의미로 응답하는지까지 봐야 한다. Write-back도 주기적으로 쓰기만 하면 끝나는 문제가 아니다. 교체할 때와 정상 종료 때 변경을 내보내야 하고, 실패하면 Dirty 데이터를 보존하거나 호출자에게 실패를 전달할 수 있어야 한다. 여러 블록의 변경을 장애 뒤에 일관되게 복구하는 문제는 [Journaling](/wiki/computer-systems-network-topic-63adab3bfc7e/)과 연결된다.

다음은 두 슬롯을 쓰는 작은 LRU Write-back 모델이다. `disk`는 메모리로 표현한 블록 장치이며 `reads`와 `writes`는 이 모델의 장치 호출 수다. 실제 디스크 성능이나 PintOS 커널의 실행을 측정하지 않는다. 각 요청은 한 Thread에서 순서대로 처리하며 I/O 실패도 발생시키지 않는다.

```run-python
from collections import OrderedDict

class MemoryDisk:
    def __init__(self):
        self.blocks = {sector: bytearray(512) for sector in range(4)}
        self.reads = 0
        self.writes = 0

    def read(self, sector):
        self.reads += 1
        return self.blocks[sector].copy()

    def write(self, sector, data):
        self.writes += 1
        self.blocks[sector] = data.copy()

class WriteBackCache:
    def __init__(self, disk, capacity=2):
        self.disk = disk
        self.capacity = capacity
        self.entries = OrderedDict()

    def load(self, sector):
        if sector not in self.entries:
            if len(self.entries) == self.capacity:
                victim = next(iter(self.entries))
                data, dirty = self.entries[victim]
                if dirty:
                    self.disk.write(victim, data)
                del self.entries[victim]
            self.entries[sector] = [self.disk.read(sector), False]
        self.entries.move_to_end(sector)
        return self.entries[sector]

    def read_byte(self, sector, offset=0):
        return self.load(sector)[0][offset]

    def write_byte(self, sector, value, offset=0):
        entry = self.load(sector)
        entry[0][offset] = value
        entry[1] = True

    def flush(self):
        for sector, entry in self.entries.items():
            if entry[1]:
                self.disk.write(sector, entry[0])
                entry[1] = False

disk = MemoryDisk()
cache = WriteBackCache(disk)
for _ in range(10):
    cache.read_byte(0)
print("reads after ten requests:", disk.reads)

cache.write_byte(0, 65)
cache.write_byte(0, 66)
print("cached value:", cache.read_byte(0))
print("disk value before writeback:", disk.blocks[0][0])
print("writes before eviction:", disk.writes)

cache.read_byte(1)
cache.read_byte(2)
print("cached sectors:", list(cache.entries))
print("disk value after eviction:", disk.blocks[0][0])
print("writes after eviction:", disk.writes)

cache.write_byte(1, 67)
cache.flush()
print("disk value after flush:", disk.blocks[1][0])
print("total reads and writes:", disk.reads, disk.writes)
```

열 번 읽은 뒤 장치 읽기는 1회다. Sector 0에 65와 66을 연달아 써도 캐시에는 마지막 값 66이 있고, 장치의 값은 아직 0이다. Sector 1과 2를 차례로 읽으면 두 슬롯이 가득 차 Sector 0을 내보낸다. 이때 Dirty 데이터를 저장하므로 두 번의 수정이 장치 쓰기 한 번으로 합쳐진다. 마지막 `flush()`는 Sector 1의 변경을 저장하고, 전체 장치 호출은 읽기 3회와 쓰기 2회가 된다.

캐시 크기를 3으로 바꾸면 Sector 0이 교체되지 않아 `flush()`에서 저장된다. 값이 같아지는 시점이 교체 정책과 캐시 용량에 따라 달라진다는 점을 확인할 수 있다.

## 무엇을 내보낼지 결정하기

캐시에 빈 슬롯이 없으면 Victim을 고른다. Clean 항목은 버릴 수 있지만, Dirty 항목은 먼저 변경을 저장해야 한다. 따라서 적중률뿐 아니라 교체로 발생하는 쓰기와 기다림도 비용에 포함된다.

| 정책 | 선택 기준 | 구현하면서 주의할 점 |
|---|---|---|
| LRU | 가장 오래 접근하지 않은 항목 | Hash Map과 연결 List를 함께 쓰면 검색과 순서 갱신을 효율적으로 처리할 수 있다. 단순 배열에서 매번 최솟값을 찾는 구현과 비용이 다르다. |
| Clock | 원형으로 훑으며 최근 접근한 항목에 한 번 더 기회를 준다. | Accessed 표식을 지우며 전진한다. 한 번의 교체가 여러 슬롯을 검사할 수 있으므로 항상 O(1)이라고 할 수 없다. |
| LFU | 접근 횟수가 적은 항목 | 오래전에 자주 쓰던 데이터가 남는 문제를 줄이려면 횟수의 Aging 같은 보완이 필요하다. |

현재 PintOS의 `vm_get_victim()`은 Frame List와 `clock_hand`를 사용한다. 사용 중인 Frame을 건너뛰고 PTE의 Accessed Bit가 설정돼 있으면 비운 뒤 다음 후보로 간다. 확인한 코드의 탐색 상한은 Frame 수의 두 배다. 이는 VM의 Frame 교체 구현이며, 미구현인 Buffer Cache까지 완성돼 있다는 근거가 되지는 않는다. [Frame 교체 코드](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/vm/vm.c)

Sector 슬롯으로 만든 캐시에서는 접근 여부를 소프트웨어 필드로 기록할 수 있다. VM과 통합한다면 어떤 가상 주소로 접근했는지와 PTE의 Accessed·Dirty Bit가 갱신되는 경로도 따로 확인해야 한다. 소프트웨어 캐시의 Dirty와 하드웨어 PTE의 Dirty를 같은 상태로 취급하면 변경을 놓칠 수 있다.

## PintOS의 Page Cache는 구현할 자리가 남아 있다

`filesys/page_cache.c`의 `page_cache_op`는 `swap_in`에 `page_cache_readahead`, `swap_out`에 `page_cache_writeback`, `destroy`에 `page_cache_destroy`를 연결하고 타입을 `VM_PAGE_CACHE`로 지정한다. `page_cache_initializer()`는 이 연산 표를 `page->operations`에 넣는다.

현재 revision에서 적재·쓰기·파괴 함수의 본문은 비어 있다. `pagecache_init()`의 Worker 생성도 `TODO`이며 `page_cache_kworkerd()`도 비어 있다. 따라서 함수 이름이 존재하거나 Breakpoint에 도달했다는 사실만으로 Cache Hit, 선행 읽기 또는 주기적 Writeback이 작동한다고 볼 수 없다. [Page Cache의 현재 구현 상태](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/filesys/page_cache.c)

KAIST 과제의 Buffer Cache는 추가 과제다. 공식 명세는 64 Sector 이하의 캐시, Clock 이상 수준의 교체, Dirty 항목의 교체·주기적·종료 시 Writeback과 비동기 Readahead를 요구한다. free map의 상주 복사본은 그 한도에서 제외할 수 있다. VM 인터페이스를 이용해 Page 단위로 관리하는 설계도 제시한다. [KAIST Buffer Cache 명세](https://casys-kaist.github.io/pintos-kaist/project4/buffer_cache.html)

512바이트 Sector 64개는 32KiB다. 4KiB Page 64개는 256KiB이므로, 단위만 Page로 바꾸고 개수를 그대로 두면 같은 용량 제한이 아니다. 과제의 단위와 허용 용량을 확인하고, 설계에서 실제 메모리를 얼마나 차지하는지 계산해야 한다.

Readahead는 현재 요청을 끝낸 뒤 다음에 쓸 가능성이 있는 블록을 미리 읽는 방식이다. 현재 읽기를 다음 블록의 완료까지 기다리게 만들면 선행 읽기의 목적이 약해진다. 순차 접근에서는 도움이 될 수 있지만, 무작위 접근에서 불필요한 I/O를 만들거나 유용한 캐시 항목을 밀어낼 수도 있다.

## Linux와 QEMU에도 각자의 캐시가 있다

Linux의 일반적인 읽기·쓰기와 파일 `mmap`은 Page Cache를 이용한다. 최근 커널 문서는 이 캐시의 메모리 관리 단위를 Folio로 설명한다. 모든 파일 시스템을 ‘4KiB `struct page` 위에 512바이트 `buffer_head`를 붙인 구조’라고 고정해서 설명할 수는 없다. [Linux Page Cache](https://docs.kernel.org/mm/page_cache.html)

`buffer_head`는 파일 시스템 Block의 상태를 관리하는 기존 방식이다. 현재 문서는 새 파일 시스템에 iomap 사용을 권장한다. iomap은 Folio 안의 Block별 Uptodate·Dirty 상태를 관리할 수 있으며, 파일 시스템이 명시적으로 요구하지 않으면 Buffer Head를 쓰지 않는다. [Buffer Head](https://www.kernel.org/doc/html/latest/filesystems/buffer.html), [iomap의 Buffered I/O](https://www.kernel.org/doc/html/latest/filesystems/iomap/operations.html)

Linux의 Dirty 관련 설정도 의미를 구분해야 한다. `dirty_background_ratio`는 백그라운드 쓰기를 시작할 비율, `dirty_ratio`는 쓰기를 발생시키는 프로세스 쪽에서도 쓰기를 수행하게 되는 임계값을 정한다. 이 비율의 기준은 단순한 전체 RAM 용량과 같지 않다. `dirty_writeback_centisecs`는 주기적 Flusher의 기상 간격을 1/100초 단위로 지정한다. 예를 들어 500이면 5초지만, 이를 모든 시스템의 고정값이나 모든 변경의 최대 유실 시간으로 해석하면 안 된다. [Linux Dirty 설정](https://www.kernel.org/doc/html/latest/admin-guide/sysctl/vm.html)

`fsync()`는 지정한 파일의 변경 데이터와 관련 Metadata를 저장 장치에 동기화하고 완료 보고를 기다린다. 파일 이름을 새로 만들거나 바꿨다면 그 이름을 담은 Directory까지 동기화해야 하는 경우가 있다. RAM에서 Dirty 표시가 지워졌다는 관찰만으로 전체 변경의 영속성을 주장하지 않는다. [Linux `fsync()`의 동기화 범위](https://man7.org/linux/man-pages/man2/fsync.2.html)

QEMU 안의 Guest 캐시와 Host OS의 Page Cache도 별개다. Guest의 Hit는 가상 장치로 내려가는 I/O를 줄인다. Guest에서 Miss가 나더라도 Host가 디스크 이미지 데이터를 가지고 있으면 실제 저장 장치의 읽기는 줄어들 수 있다.

QEMU의 `cache=writeback`은 Host Page Cache를 사용하는 설정이고, `cache=none`은 `cache.direct=on`에 대응해 Host Page Cache를 우회하도록 한다. 하지만 `none`이 Guest 캐시나 장치의 모든 캐시를 끈다는 뜻은 아니다. `cache.writeback`과 `cache.no-flush`도 별도의 의미를 가지므로 이름 하나만 보고 영속성을 판단하지 않는다. 실제 실행 옵션과 이미지 형식을 확인해야 측정값의 의미를 알 수 있다. [QEMU 캐시 옵션의 대응표](https://www.qemu.org/docs/master/system/invocation.html)

## 호출 수를 관찰할 때 구분할 범위

PintOS의 파일 시스템 디스크 읽기만 세려면 `disk_read()`의 장치 인자를 함께 확인해야 한다. Swap이나 다른 디스크의 요청까지 합치면 파일 캐시의 효과를 잘못 해석할 수 있다. 현재 코드의 인자 이름은 `d`와 `sec_no`다. 아래는 PintOS에 연결된 GDB에서 사용할 명령이며, 브라우저에서 실행하는 Python 모델과 별개다.

```gdb
set $filesys_reads = 0
set $previous_sector = -1
break disk_read if d == filesys_disk
commands
  silent
  set $filesys_reads = $filesys_reads + 1
  printf "sector=%u", sec_no
  if $previous_sector >= 0
    if sec_no == $previous_sector + 1
      printf " sequential\n"
    else
      printf " non-consecutive\n"
    end
  else
    printf " first\n"
  end
  set $previous_sector = sec_no
  continue
end
```

관찰할 테스트를 실행하고 다시 멈춘 뒤 `print $filesys_reads`로 누적 호출 수를 읽는다. 연속 Sector가 나왔다는 것만으로 Readahead라고 결론 내릴 수는 없다. 하나의 순차 읽기 요청을 드라이버가 Sector별로 처리했을 수도 있기 때문이다.

Bounce Buffer 경로를 보려면 현재 소스의 `inode_read_at()` 안에서 `sector_ofs`와 `chunk_size`가 정해진 뒤를 관찰한다. `sector_ofs == 0`이고 `chunk_size == 512`이면 직접 읽기, 그렇지 않으면 부분 복사 경로다. 쓰기에서 `inode->deny_write_cnt`가 0보다 크면 캐시 여부와 별개로 쓰기를 거부한다. 함수 이름과 실제 소스를 기준으로 Breakpoint를 잡아야 이전 revision의 줄 번호에 의존하지 않는다.

4KiB를 처음 읽을 때 데이터 Sector가 여덟 개라면 기본 경로의 데이터 읽기 요청도 여덟 번이 필요하다. 같은 범위가 캐시에 남아 있는 두 번째 읽기는 그 요청을 줄일 수 있다. 다만 파일을 여는 Metadata I/O, 선행 읽기, 교체와 Writeback이 함께 발생할 수 있으므로 측정 구간을 나누어야 한다. 호출 수는 Guest I/O의 변화로 보고하고, 지연이나 배속은 같은 조건에서 시간을 따로 측정한 경우에만 제시한다.
