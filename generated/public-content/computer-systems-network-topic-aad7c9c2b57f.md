---
layout: default
title: 메모리 매핑
nav_order: 6
permalink: /wiki/computer-systems-network-topic-aad7c9c2b57f/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-aad7c9c2b57f
projection_sha256: 0f1d9e377aab7172cf0b75357775edc16565e2e5d53b21c94f1f89913c8837da
parent: 메모리 관리
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-d160fea60072
search_terms:
- mmap
- VMA
- VAD
- MAP_SHARED
- MAP_PRIVATE
- msync
- MapViewOfFile
- MAP_FIXED
- MAP_FIXED_NOREPLACE
- MapViewOfFileEx
- PROT_READ
- FILE_MAP_READ
grand_parent: OS
ancestor: CS
---

# 메모리 매핑
{: .no_toc }

메모리 매핑은 가상 주소의 일정 구간을 파일이나 익명 메모리와 연결하는 방법이다. 파일을 매핑하면 프로그램은 `read()`로 버퍼에 복사해 달라고 요청하는 대신, 연결된 주소를 읽어 파일 내용에 접근할 수 있다.

주소를 확보한 것과 파일의 모든 바이트가 RAM에 올라온 것은 다른 상태다. 필요한 Page를 첫 접근 때 준비하는 Demand Paging을 쓰면, 큰 파일을 매핑해도 실제로 접근한 부분부터 메모리를 채울 수 있다.

## 주소와 파일 위치를 연결한다

파일 offset `4096`부터 매핑한 주소를 `base`라고 하자. `base[123]`이 가리키는 파일 위치는 `4096 + 123 = 4219`다. 프로그램은 가상 주소를 사용하고, OS는 그 주소에 대응하는 파일과 offset을 기억한다.

| 접근 방법 | 프로그램이 지정하는 것 | 데이터가 준비되는 경로 |
|---|---|---|
| `read()` | File Descriptor, 버퍼, 읽을 길이 | 파일에서 읽은 바이트를 버퍼에 복사한다 |
| `mmap()` 뒤의 메모리 접근 | 매핑된 주소 | 주소 변환이 가능하면 곧바로 접근하고, 필요한 Page가 없으면 Page Fault로 준비한다 |

메모리 매핑으로 큰 파일의 일부를 임의로 읽을 때는 파일 위치를 옮기는 호출을 매번 작성하지 않아도 된다. 실행 파일과 공유 라이브러리 적재, 프로세스 간 공유 메모리, DB 파일 접근에도 이 관계를 이용한다. 익명 매핑은 연결된 일반 파일이 없으며, 메모리 할당기가 큰 할당에 사용하는 주소 공간을 마련할 때도 쓰인다.

매핑이 항상 더 빠른 것은 아니다. Page Fault 처리와 주소 공간 관리에도 비용이 든다. 이미 RAM에 있는 파일 Page라면 새 디스크 읽기 없이 매핑할 수 있고, OS가 미리 읽거나 Page Table을 준비할 수도 있다. 따라서 “메모리를 처음 읽으면 반드시 디스크 I/O가 한 번 발생한다”는 식으로 접근 횟수와 I/O 횟수를 맞추면 안 된다.

## 주소를 지정한다는 말의 차이

Linux의 `mmap()`에서 `addr=NULL`이면 OS가 주소를 고른다. `MAP_FIXED` 없이 주소를 주면 그 값은 후보를 제안하는 힌트다. 반환값이 요청한 주소와 같다고 가정하면 안 된다. `MAP_FIXED`는 지정한 주소를 사용하지만 겹치는 기존 매핑을 제거할 수 있다. 이미 사용 중인 주소를 덮어쓰지 않고 실패하게 하려면 `MAP_FIXED_NOREPLACE`의 의미를 확인해야 한다. [Linux mmap(2)](https://man7.org/linux/man-pages/man2/mmap.2.html)

Windows의 `MapViewOfFileEx()`는 `lpBaseAddress=NULL`이면 OS가 View 주소를 선택한다. 주소를 지정하면 그 범위가 비어 있어야 하며, 사용할 수 없으면 호출이 실패한다. 파일 offset과 지정한 주소의 정렬 기준은 `GetSystemInfo()`가 알려 주는 allocation granularity다. 이것을 모든 환경에서 Page 크기나 `4096`바이트라고 바꾸어 읽으면 안 된다. [Microsoft MapViewOfFileEx](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-mapviewoffileex)

이 위키에서 다루는 PintOS 구현은 정렬된 사용자 주소를 직접 받으며, NULL은 실패다. 주소를 고르는 편의 기능과 기존 영역을 바꿔 끼우는 기능을 제공하지 않는다. 같은 `mmap`이라는 이름을 보더라도 어느 OS의 인자와 반환 규칙인지 먼저 확인해야 한다.


## 매핑 정보와 Page Table의 역할

Linux의 VMA는 주소 구간의 권한, 연결된 파일과 offset 등 그 구간의 의미를 담는다. Page Table은 현재 접근 가능한 가상 Page가 어느 물리 Frame에 연결되는지를 나타낸다. 파일 기반 매핑은 보통 Page Cache와 연결되므로 `read()`와 매핑을 통한 접근이 같은 파일 데이터의 캐시를 이용할 수 있다. 캐시와 저장 시점은 [Buffer Cache](/wiki/file-system-buffer-cache/)에서 함께 다룬다.

Windows에서는 `CreateFileMapping`으로 File Mapping Object를 만들고 `MapViewOfFile`로 프로세스가 접근할 View를 매핑한다. 파일에 대응하는 Object와 프로세스 주소 공간의 View를 나누어 이해하면 된다. [Microsoft File Mapping](https://learn.microsoft.com/en-us/windows/win32/memory/file-mapping)

Windows Kernel 디버깅에서는 VAD(Virtual Address Descriptor)도 만난다. WinDbg의 `!vad`는 주소 구간과 보호 속성, 매핑 종류 등을 보여 준다. VAD로 보는 영역 정보와 PTE로 보는 현재 주소 변환을 나누어 확인하는 식이다. [Microsoft WinDbg !vad](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/-vad)

PintOS에서는 [보조 페이지 테이블](/wiki/computer-systems-network-topic-aa5da5d73167/)이 아직 Frame에 올라오지 않은 Page의 backing 정보를 기억한다. 이 학습 구현의 함수와 생명주기는 [mmap](/wiki/computer-systems-network-mmap-838e9b0f7e0a/)에서 이어진다. Linux의 VMA와 PintOS의 Page별 SPT Entry는 역할을 비교할 수 있지만 같은 자료구조는 아니다.

## 같은 파일을 읽어도 쓰기의 의미는 달라진다

Linux의 `MAP_SHARED`는 변경을 파일과 같은 영역의 공유 매핑에 반영한다. `MAP_PRIVATE`는 Copy-on-Write 방식이며, 매핑을 통해 수정한 내용을 원본 파일에 기록하지 않는다. 읽기·쓰기·실행 권한을 정하는 `prot`과 공유 방식을 정하는 `flags`는 서로 다른 선택이다. `MAP_PRIVATE`라고 쓰기 권한까지 자동으로 생기지는 않는다. [Linux mmap(2)](https://man7.org/linux/man-pages/man2/mmap.2.html)

파일 유무와 공유 방식은 서로 다른 축이다. 읽기·쓰기 권한을 별도로 정한다는 전제에서 네 조합을 비교할 수 있다.

| 내용의 출처 | 공유 방식 | 초기 내용과 쓰기 |
|---|---|---|
| 파일 | `MAP_SHARED` | 지정한 파일 구간에서 시작한다. 허용된 쓰기는 같은 구간의 공유 매핑에 보이며 파일에도 반영된다. 저장 완료 시점은 별도로 동기화한다. |
| 파일 | `MAP_PRIVATE` | 지정한 파일 구간에서 시작한다. 사적인 수정은 파일에 기록하지 않는다. 수정 전의 물리 페이지까지 반드시 독점한다는 뜻은 아니다. |
| 익명 메모리 | `MAP_SHARED` | 초기 내용은 0이다. Linux에서는 `fork()`로 같은 매핑을 물려받은 프로세스들이 공유할 수 있다. 동기화는 별도로 필요하다. |
| 익명 메모리 | `MAP_PRIVATE` | 초기 내용은 0이다. `fork()` 뒤에는 각 프로세스의 쓰기가 다른 쪽의 사적인 내용을 바꾸지 않는다. |

`mmap(NULL, 4096, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0)`은 OS가 고른 주소에 읽고 쓸 수 있는 사적 익명 구간을 요청한다. 연결된 일반 파일은 없고 초기값은 0이지만, 반환 즉시 모든 전용 Frame이 마련됐다고 판단할 수는 없다. 매핑 실패는 `MAP_FAILED`로 확인한다. 이후 접근에서 필요한 페이지를 준비하는 과정은 앞의 VMA·Page Table 구분을 따른다. [Linux mmap의 매핑 종류와 반환 규칙](https://man7.org/linux/man-pages/man2/mmap.2.html)

`libc.so`처럼 공유 라이브러리라는 이름을 가진 파일도 모든 구간을 `MAP_SHARED` 하나로 매핑하는 것은 아니다. 실행 코드와 데이터는 서로 다른 Segment와 권한을 가질 수 있다. 파일의 `MAP_PRIVATE` 매핑이어도 수정하지 않은 파일 페이지를 물리적으로 재사용할 수 있고, 사적 쓰기가 필요할 때는 내용을 분리한다. ‘공유 라이브러리’라는 배포 단위와 `mmap`의 공유 쓰기 옵션을 구별해야 한다. [Linux의 매핑별 권한과 Private·Shared 표시](https://man7.org/linux/man-pages/man5/proc_pid_maps.5.html)

Linux에서 `PROT_READ`만 허용한 매핑에 쓰면 `SIGSEGV`가 발생할 수 있다. Windows의 `FILE_MAP_READ` View에 쓰는 경우에는 access violation이 발생한다. 이는 읽기 전용 View와 Copy-on-Write View가 서로 다른 선택이라는 뜻이기도 하다. 읽기는 허용하되 쓰기는 거절하는 정책과, 쓰기 때 사본을 만들어 허용하는 정책을 나누어 확인한다. [Linux mmap(2)](https://man7.org/linux/man-pages/man2/mmap.2.html), [Microsoft MapViewOfFile](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-mapviewoffile)

다음 코드는 공유 데이터와 첫 쓰기 때 만드는 사본의 차이를 실행해 보는 작은 모델이다. Python의 `bytearray`로 정책을 표현하며, OS의 실제 `mmap()`이나 Page Fault를 실행하는 코드는 아니다.

```run-python
backing = bytearray(b"DATA")
shared = backing
private_copy = None

print("처음:", bytes(backing))
shared[0] = ord("S")
print("공유 매핑 쓰기:", bytes(backing))

# 이 모델에서는 private 쪽의 첫 쓰기 직전에 사본을 만든다.
private_copy = bytearray(backing)
private_copy[1] = ord("P")
print("private 사본:", bytes(private_copy))
print("공유 데이터:", bytes(shared))

assert bytes(private_copy) == b"SPTA"
assert bytes(backing) == b"SATA"
```

실행 결과에서 공유 데이터는 `SATA`, private 사본은 `SPTA`가 된다. 이 모델은 사본 분리만 보여 준다. 실제 시스템에서 파일이 나중에 변경될 때 `MAP_PRIVATE` 매핑에 어떻게 보이는지까지 이 결과로 일반화하지 않는다.

## 파일을 닫는 것과 매핑을 해제하는 것

Linux에서는 매핑을 만든 뒤 File Descriptor를 닫아도 매핑이 유지된다. `munmap()`은 주소 범위의 연결을 제거하며, 이후 그 주소로 접근할 수 있다는 보장은 사라진다. 다른 매핑이 그 주소를 다시 사용하지 않았다면 접근은 잘못된 메모리 참조가 된다.

Windows에서도 파일 Handle을 닫는 것과 `UnmapViewOfFile()`로 View를 해제하는 것을 구분한다. 시스템은 마지막 View가 해제될 때까지 해당 파일을 열어 둔다. View가 사라진 뒤에는 그 주소 범위를 다른 할당에 사용할 수 있다. [Microsoft UnmapViewOfFile](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-unmapviewoffile)

해제하는 범위도 API마다 다르다. Linux의 `munmap(addr, length)`는 시작 주소와 길이를 받아 기존 매핑의 일부를 해제할 수 있다. Windows의 `UnmapViewOfFile()`은 전달한 주소를 포함하는 View 전체를 해제한다. View 안쪽 주소를 넘겨도 그 지점 이후의 일부만 해제하는 호출이 아니다. PintOS의 `munmap(addr)`는 매핑 시작 주소를 받아 그 매핑 전체를 제거한다. 인자 개수만 보고 세 API의 동작을 같게 해석하지 않는다.

파일 끝이 Page 경계와 맞지 않으면 마지막 Page의 남은 부분은 0으로 채워진다. 이 꼬리 부분의 수정은 파일 내용으로 기록되지 않는다. 파일 끝을 넘는 Page에 접근하거나 매핑 중 파일이 잘리는 상황은 별도로 다뤄야 한다. Linux에서는 파일 크기를 벗어난 Page 접근이 `SIGBUS`로 이어질 수 있다. [Linux mmap(2)](https://man7.org/linux/man-pages/man2/mmap.2.html)

## 메모리에서 보이는 변경과 저장 완료

공유 매핑을 수정하면 변경이 먼저 메모리에서 보일 수 있다. OS는 Dirty Page를 추적하고 백그라운드 쓰기나 메모리 회수 과정에서 파일로 내보낸다. Linux의 `munmap()`을 파일 저장이 끝날 때까지 기다리는 호출로 취급해서는 안 된다. `msync(..., MS_SYNC)`는 지정한 매핑 범위의 변경을 파일 시스템에 반영하고 완료를 기다리는 용도로 제공된다. [Linux msync(2)](https://man7.org/linux/man-pages/man2/msync.2.html)

Windows에서도 View 해제와 저장 완료를 구분한다. `FlushViewOfFile`은 해당 범위의 Dirty Page 쓰기를 시작하지만 파일 Metadata와 장치의 캐시까지 모두 동기화하는 호출은 아니다. Microsoft는 그 경계까지 다루려면 이어서 `FlushFileBuffers`를 호출하도록 설명한다. [Microsoft FlushViewOfFile](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-flushviewoffile)

파일의 변경이 보이는 시점, 파일 시스템이 요청을 마친 시점, 전원이 끊겨도 데이터가 남는 시점은 구분해야 한다. 파일과 Directory의 동기화, 장치와 QEMU Cache의 영향은 [fsync](/wiki/file-system-fsync/)에서 다룬다.
