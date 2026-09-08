---
layout: default
title: 프로세스 생성
nav_order: 5
permalink: /wiki/computer-systems-network-topic-4af2e32913a4/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-4af2e32913a4
projection_sha256: 998ce75b7b29357459870ac5421b19f54fe93d899e8aac728df63abf0491230e
parent: 사용자 프로그램
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-63dd07ba6393
search_terms:
- process_fork
- __do_fork
- fork_args
- fork_sema
- fork_success
- duplicate_fd_table
- duplicate_running_file
- intr_frame
- RAX
- duplicate_pte
- page_get_type
- spt_copy_uninit_page
grand_parent: PintOS
ancestor: 시스템
---

# 프로세스 생성
{: .no_toc }

`fork()`는 부모가 실행하던 지점에서 이어갈 자식 프로세스를 만든다. 부모는 자식의 ID를 받고 자식은 0을 받는다. 두 실행 흐름이 같은 호출 다음에서 갈라질 수 있으려면 레지스터뿐 아니라 주소 공간과 열린 파일의 상태도 준비되어야 한다.

PintOS에서는 이 준비를 새로 만든 자식 Thread의 `__do_fork()`가 수행한다. 부모의 `process_fork()`는 자식이 초기화 결과를 알릴 때까지 기다린다. 아래 코드는 [lrn-pintos의 `5afaa6d`](https://github.com/woonyong-kr/lrn-pintos/tree/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos)를 기준으로 읽는다.

## Thread 생성과 프로세스 복제의 완료 시점

`thread_create()`의 성공만으로 사용자 프로세스 복제가 끝난 것은 아니다. 이 함수는 Kernel Thread의 Page와 시작 문맥을 만들고 스케줄러에 등록한다. 주소 공간과 파일 복제는 이후 자식의 진입 함수가 담당한다. 부모가 결과를 확인하지 않고 성공 ID를 반환하면 뒤늦은 복제 실패를 호출자에게 전달하지 못한다.

그렇다고 `thread_create()`가 돌아온 순간에 자식이 항상 READY 상태라고 고정할 수도 없다. 현재 구현은 더 높은 우선순위의 자식을 깨우면 `thread_yield()`를 호출한다. Timer에 의한 선점도 가능하므로 자식이 이미 실행되었거나 초기화를 마쳤을 수 있다. 부모가 필요한 것은 특정 실행 순서가 아니라 **초기화 결과가 준비된 다음에만 결과를 읽는 순서**다. [Thread 생성](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/thread.c)

`child_status` 안의 두 Semaphore는 기다리는 사건이 다르다.

| 필드 | 기다리는 사건 | 결과를 읽는 함수 |
|---|---|---|
| `fork_sema`와 `fork_success` | 자식의 초기화 성공 또는 실패 | 부모의 `process_fork()` |
| `wait_sema`와 `exit_status` | 자식의 종료 | 부모의 `process_wait()` |

fork가 성공해도 프로그램이 나중에 오류로 종료할 수 있다. 생성 결과와 종료 결과는 별도로 받아야 한다. 종료 상태의 수명과 수거는 [프로세스 종료](/wiki/computer-systems-network-topic-93ebb5bf7e48/)에서 다룬다.

## 부모의 User 문맥을 자식에게 전달한다

System Call에 진입할 때 `RAX`는 `SYS_FORK`, `RDI`는 새 Thread 이름의 User 포인터다. `syscall_handler()`는 `fork(thread_name, f)`를 거쳐 `process_fork(thread_name, f)`로 현재 User 레지스터를 담은 `intr_frame`을 전달한다. 이름 포인터는 User 메모리 검증을 거친다.

부모는 `child_status`를 할당하고 상태와 두 Semaphore를 초기화한다. 이어 다음 정보로 `fork_args`를 만든다.

```c
struct fork_args {
    struct thread *parent;
    struct intr_frame if_;
    struct child_status *cs;
};
```

`args->if_ = *if_`는 프레임의 값을 복사한다. 자식은 자신의 지역 변수 `if_`로 다시 복사한 뒤 `args`를 해제한다. 부모가 나중에 프레임의 `RAX`를 반환 ID로 바꾸더라도, 자식이 보관한 복사본까지 같은 값으로 바뀌어서는 안 된다.

여기서 부모의 `thread->tf`를 대신 복사하면 안 된다. 그 필드는 Thread 스케줄링 문맥에도 쓰이며, 이번 fork를 호출한 User 문맥을 전달하는 인자가 아니다. 자식은 전달받은 프레임의 `if_.R.rax`를 0으로 바꾸고 `do_iret(&if_)`로 복원한다. 부모의 반환 값은 `process_fork()`가 돌려준 ID를 System Call 프레임의 `f->R.rax`에 쓰는 경로로 결정된다. [fork 진입과 프레임 전달](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/userprog/process.c), [System Call wrapper](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/userprog/syscall.c)

`struct intr_frame`과 `fork_args`의 크기는 해당 빌드에서 `sizeof`로 확인한다. 포인터 둘의 크기에 프레임 크기를 더할 때도 정렬과 Padding을 고려해야 한다. 특정 자료에서 본 184바이트를 모든 x86-64 프레임의 고정값으로 사용하지 않는다.

### 같은 가상 주소와 다른 프레임

부모와 자식의 User RIP·RSP 값이 같아도 두 프로세스의 모든 물리 메모리가 같은 것은 아니다. 같은 User 가상 주소를 각 프로세스의 Page Table로 해석한다. non-VM 복제는 별도 Frame으로 같은 내용을 만들고, Copy-on-Write는 처음에 Frame을 공유했다가 쓰기 권한과 참조 상태에 따라 분리할 수 있다. User Stack 주소 값과 프레임 복사본을 둔 Kernel Stack 주소도 구분한다.

현재 `include/threads/interrupt.h`의 packed 정의를 기준으로 계산하면 `gp_registers`는 15개의 64비트 레지스터, 즉 120바이트다. 전체 `intr_frame`은 명시된 Segment Padding과 벡터·오류 코드, 복귀 정보를 포함해 192바이트다. `R.rax`의 offset은 112, `rip`는 152, `rsp`는 176이다. 이 값은 해당 소스의 x86-64 배치에서 계산한 것이며 실제 빌드의 GDB 출력이나 CPU 실행 측정값은 아니다. [프레임 정의](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/threads/interrupt.h)

다음 예제는 이 배치에 레지스터 값을 넣고 부모 → args → 자식의 두 번 값 복사를 실행한다. 부모가 반환 ID를 쓰더라도 자식의 복사본은 별도로 남는다.

```run-python
import struct

fields = [(name, 8) for name in
          "r15 r14 r13 r12 r11 r10 r9 r8 rsi rdi rbp rdx rcx rbx rax".split()]
fields += [("es와 Padding", 8), ("ds와 Padding", 8), ("vec_no", 8),
           ("error_code", 8), ("rip", 8), ("cs와 Padding", 8),
           ("eflags", 8), ("rsp", 8), ("ss와 Padding", 8)]
offsets, total = {}, 0
for name, size in fields:
    offsets[name] = total
    total += size
assert total == 192 and offsets["rax"] == 112
assert offsets["rip"] == 152 and offsets["rsp"] == 176

parent = bytearray(total)
for name, value in [("rax", 2), ("rip", 0x401122), ("rsp", 0x7FFFFF00)]:
    struct.pack_into("<Q", parent, offsets[name], value)
args_frame = bytearray(parent)
child = bytearray(args_frame)
del args_frame
struct.pack_into("<Q", parent, offsets["rax"], 17)
struct.pack_into("<Q", child, offsets["rax"], 0)

for label, frame in [("부모", parent), ("자식", child)]:
    values = {name: hex(struct.unpack_from("<Q", frame, offsets[name])[0])
              for name in ["rax", "rip", "rsp"]}
    print(label, values)
assert parent is not child
assert parent[:112] == child[:112] and parent[120:] == child[120:]
print(f"프레임 {total}B, 소스 수준의 두 번 복사 {2 * total}B")
```

이 코드의 초기 `RAX = 2`는 해당 저장소의 `SYS_FORK` 번호다. 자식의 프레임을 복사한 직후에는 아직 부모가 돌려받을 자식 ID가 들어 있는 것이 아니다. 부모 ID 17은 결과 전달 모델의 예시다. 두 번의 구조체 복사는 소스에서 수행하는 복사량이며 Compiler가 생성하는 실제 load/store 수나 실행 시간을 뜻하지 않는다.

`do_iret()`은 현재 `threads/thread.c`에 있다. 먼저 프레임에서 범용 레지스터와 Segment 값을 복원한 뒤 `iretq`를 실행한다. 이 경로에서 남은 복귀 프레임은 RIP·CS·RFLAGS·RSP·SS다. 현재 User Code Selector `SEL_UCSEG`는 `0x23`, 하위 두 비트의 RPL은 3이다. Selector 값만 맞으면 무조건 복귀가 성공하는 것은 아니며, Descriptor와 주소 등의 조건도 유효해야 한다. [레지스터 복원](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/thread.c), [Selector 정의](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/threads/loader.h)

Linux v6.12의 x86 구현에서도 `copy_thread()`가 User `pt_regs`를 복사하고 `childregs->ax = 0`으로 만든다. 다만 `childregs->sp`를 새 Kernel Stack 주소로 바꾼다는 설명은 틀리다. 새 Kernel 실행 문맥은 `p->thread.sp`에 준비하고, `childregs->sp`는 `args->stack`이 지정된 경우 그 User Stack 값으로 바뀐다. User 복귀 문맥과 Kernel의 시작 프레임을 서로 다른 필드로 읽어야 한다. [Linux x86 copy_thread](https://github.com/torvalds/linux/blob/v6.12/arch/x86/kernel/process.c)

## 자식이 성공을 알리기 전에 준비하는 것

정상적으로 전달된 `fork_args`를 받은 `__do_fork()`의 순서는 다음과 같다.

```text
self_status 연결 → User intr_frame 복사 → fork_args 해제
  → pml4_create()
  → process_activate(): 자식 Page Table과 TSS 갱신
  → VM: SPT 초기화와 복제
    또는 non-VM: pml4_for_each(duplicate_pte)
  → duplicate_fd_table()
  → duplicate_running_file()
  → if_.R.rax = 0
  → process_init()
  → fork_success = true
  → sema_up(fork_sema)
  → do_iret(): 자식 User 문맥으로 진입
```

현재 `process_init()`의 본문은 별도 초기화 작업을 하지 않는다. fd Table은 앞선 `duplicate_fd_table()`에서 만들기 때문에, 함수 이름만 보고 `process_init()`이 fd를 복제한다고 추정하지 않는다.

non-VM의 `duplicate_pte()`는 User Frame을 새로 할당해 4096바이트를 복사하고 부모 PTE의 쓰기 권한을 반영한다. VM에서는 [보조 페이지 테이블](/wiki/computer-systems-network-topic-aa5da5d73167/)이 Lazy 상태와 backing 정보를 포함하므로, 현재 Present인 PTE만 복제하는 경로와 다르다. 현재 SPT 복제는 최종 타입이 `VM_FILE`인 mmap Page를 제외한다. 이를 Linux의 일반적인 mmap 상속 규칙으로 설명하지 않는다. [mmap](/wiki/computer-systems-network-mmap-838e9b0f7e0a/)의 fork 경계와 함께 읽는다.

`duplicate_fd_table()`은 새 fd Table을 만들고 각 파일에 `file_duplicate()`를 호출한다. 이 저장소의 `file_duplicate()`는 새 `struct file`에 현재 위치 `pos`와 쓰기 금지 상태를 복사하고 같은 Inode를 참조한다. 디스크 파일 내용까지 통째로 복제하는 의미의 Deep Copy가 아니다. 실행 파일의 쓰기 금지 참조는 `duplicate_running_file()`에서 별도로 이어받는다. [파일 복제](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/filesys/file.c)

부모는 복제가 진행되는 동안 `process_fork()`에서 결과를 기다리므로, 같은 부모 Thread가 User 코드로 돌아가 원본 주소 공간을 바꾸거나 파일을 닫는 것을 막는다. 이것만으로 공유 자원 전체가 여러 CPU와 Thread 사이에서 안전하다고 일반화할 수는 없다.

### 현재 VM 복제에서 확인할 경계

현재 소스의 함수 이름만 보고 Lazy·Swap·COW 복제가 모두 완성되었다고 판단할 수는 없다. `page_get_type()`은 현재 Operations 타입이 UNINIT이면 `page->uninit.type`의 최종 타입을 반환한다. 정상적인 Lazy Anonymous Page에 이 함수를 적용하면 `VM_ANON`이 나온다.

그런데 `supplemental_page_table_copy()`는 이 반환 값에 `VM_UNINIT`을 비교해 `spt_copy_uninit_page()`를 호출한다. 최종 타입이 ANON 또는 FILE로 등록된 일반적인 UNINIT Page는 이 조건에 들어가지 않는다. helper에 aux 복사와 `file_reopen()`이 구현되어 있다는 사실과 실제 분기가 그 helper에 도달한다는 사실은 별개다.

Swap에 있는 ANON Page도 따로 살펴봐야 한다. 현재 분기에서 Frame이 없으면 자식 Page를 할당·claim하지만, 부모의 `swap_slot` 내용을 읽어 복사하는 처리가 없다. 마지막 `memcpy()`도 부모 Frame이 있을 때만 실행한다. 따라서 이 경로를 “Swap Slot snapshot 복사”라고 설명할 근거가 없다. 새 Page의 초기화 방식에 따라 값이 달라질 수 있으므로, 부모 데이터를 읽지 않았다는 코드 관찰을 임의의 바이트 결과나 재현한 Kernel 오류로 바꾸지 않는다. [타입 조회와 SPT 복제 분기](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/vm/vm.c)

| 부모 Page의 상태 | 현재 복제 분기에서 읽히는 경로 |
|---|---|
| UNINIT, 최종 FILE | FILE 제외 조건으로 건너뛴다 |
| UNINIT, 최종 ANON | `page_get_type()`이 ANON이므로 UNINIT helper 분기를 지나간다 |
| 초기화된 ANON, Frame 있음 | `spt_copy_cow_page()`로 Frame을 공유한다 |
| 초기화된 ANON, Frame 없음 | 새 Page를 claim하지만 부모의 Swap 데이터를 복사하는 분기가 없다 |

이 표는 현재 코드의 검토 결과다. VM 구현을 수정한 결과나 관련 테스트가 통과한 결과는 아니다. COW가 있는 코드와 모든 Page 상태의 복제가 올바른 코드는 같은 의미가 아니므로, 이 구분을 유지한 채 상태별 학습을 이어간다.

non-VM에서 User Page가 10개라면 데이터 복사량은 `10 × 4096 = 40960`바이트다. 여기에 Page Table·자식 Thread Page·fd Table·상태 객체의 할당이 더해진다. 데이터 Page 수에 비례하는 복사 비용만으로 fork 전체의 정확한 시간 복잡도나 실제 실행 시간을 설명하지 않는다. Lazy·Swap·공유 Frame이 섞인 VM 경로에는 같은 복사량 공식을 그대로 적용할 수 없다.

GDB에서 `duplicate_pte()`를 세면 callback 진입 수이며, 그중 할당·매핑까지 성공한 Page 수와 다를 수 있다. memcpy 뒤의 데이터를 확인하려면 부모·자식 포인터를 유효한 시점에 GDB 변수로 저장하고 현재 소스 줄에서 관찰한다. `finish`로 함수를 빠져나온 뒤 이미 사라진 지역 변수 `newpage`를 그대로 읽지 않는다. 첫 8바이트가 같다는 것만으로 4096바이트 전체가 같다는 결론도 내리지 않는다.

## 성공과 실패를 한 번씩 전달한다

부모는 `thread_create()`가 성공하면 자식 ID를 상태 객체에 넣고 `sema_down(&cs->fork_sema)`를 한 번 호출한다. 자식이 아직 결과를 알리지 않았다면 값 0에서 잠들고, 먼저 알렸다면 값 1을 소비하고 곧바로 진행한다. “초기값이 0이므로 부모는 반드시 Block된다”는 설명은 두 번째 순서를 놓친다.

자식은 성공 여부를 먼저 기록한 다음 `sema_up()`으로 알린다. 알림만 먼저 보내면 깨어난 부모가 아직 초기값인 `fork_success = false`를 읽을 수 있다. 부모에게 필요한 것은 결과 저장, 알림, 결과 읽기의 순서다.

| 실패 지점 | 현재 코드의 상태 정리와 알림 |
|---|---|
| 부모의 `child_status`·`fork_args` 할당 실패 | 부모가 가진 임시 객체를 정리하고 `TID_ERROR`를 반환한다. 생성된 자식이 없으므로 Semaphore에서 기다리지 않는다 |
| `thread_create()` 실패 | 부모가 `args`와 상태 항목을 정리하고 반환한다. 자식의 알림을 기다리지 않는다 |
| 자식의 PML4·SPT/PTE 복제 실패 | `error` 경로에서 실패를 알린 뒤 `thread_exit()`의 공통 정리를 거친다 |
| 자식의 fd 복제 실패 | helper가 이미 복제한 파일과 fd Table을 정리한다. 그 뒤 자식의 공통 실패 경로로 간다 |
| 실행 파일 복제 실패 | 자식의 실패 알림 뒤 공통 종료 경로가 이미 보유한 자원을 정리한다 |

자식의 일반적인 초기화 실패 경로는 다음 순서다.

```c
cs->exit_status = -1;
cs->exited = true;
cs->fork_success = false;
curr->self_status = NULL;
sema_up(&cs->fork_sema);
```

이후 자식은 `thread_exit()`로 부분적으로 만든 주소 공간과 파일을 정리한다. 부모는 false 결과를 읽고 자신의 목록에서 상태 객체를 제거해 해제한다. `curr->self_status = NULL`은 자식의 종료 정리가 부모가 회수할 상태 객체에 다시 접근하지 않게 하는 경계다. 앞의 [wait/exit 종료 알림](/wiki/computer-systems-network-topic-93ebb5bf7e48/)에서 검토한 마지막 참조 문제와 비교할 수 있다.

따라서 현재 실패 경로를 “PML4·SPT를 모두 파괴한 뒤 실패를 통지한다”는 그림으로 바꾸면 호출 순서가 틀린다. 실패 알림을 받은 부모가 먼저 실행될 수 있고, 자식의 자원 정리는 그 뒤에 이어질 수 있다. 초기화 실패라는 결과와 모든 메모리 반환이 끝난 시점은 같다기보다 별도 사건이다.

정상 인자로 만들어진 자식에 대해서는 성공 또는 일반 초기화 실패 중 한 경로에서 알림 한 번이 필요하다. 다만 `__do_fork()` 앞부분의 NULL 인자 방어 경로는 바로 종료한다. 내부 호출 계약이 깨지는 경우까지 “어떤 실패에서도 반드시 알린다”고 단정하지 않는다.

### 실행 순서와 실패 지점을 바꿔 본다

다음 예제는 부모의 대기 순서와 네 초기화 단계의 실패를 바꿔 본다. 실제 Frame이나 fd를 할당하는 대신 소유 자원 이름을 기록한다. 성공할 때는 두 프레임의 `RAX`가 갈라지고, 실패할 때는 상태와 자식 자원의 회수 책임이 나뉘는 것을 확인한다.

```run-python
from dataclasses import dataclass

@dataclass
class Status:
    success: bool = False
    exited: bool = False
    exit_status: int = -1
    sema: int = 0
    signals: int = 0
    alive: bool = True


def fork_model(child_first, fail_at=None):
    stages = ["PML4", "주소 공간", "fd Table", "실행 파일"]
    cs = Status()
    resources = []
    parent_frame = {"rax": "SYS_FORK", "rip": 0x401122, "rsp": 0x7FFFFF00}
    child_frame = parent_frame.copy()
    self_status_attached = True
    log = []

    if not child_first:
        assert cs.sema == 0
        log.append("부모: fork_sema에서 BLOCKED")

    for stage in stages:
        if stage == fail_at:
            log.append(f"자식: {stage} 실패")
            break
        resources.append(stage)
    else:
        child_frame["rax"] = 0
        cs.success = True

    if not cs.success:
        cs.exited = True
        self_status_attached = False
    cs.sema += 1
    cs.signals += 1
    log.append(f"자식: 결과={cs.success} 기록 후 알림")

    assert cs.signals == 1 and cs.sema == 1
    cs.sema -= 1
    log.append("부모: 대기 없이 알림 소비" if child_first else "부모: 재개 후 알림 소비")
    parent_frame["rax"] = 17 if cs.success else -1

    if not cs.success:
        assert not self_status_attached
        cs.alive = False
        log.append("부모: 실패 상태 해제")
        resources.clear()
        log.append("자식: 부분 자원 정리, User 진입 없음")
        assert not resources
    else:
        assert parent_frame["rax"] == 17 and child_frame["rax"] == 0
        assert len(resources) == 4 and cs.alive
        log.append("자식: User 문맥 RAX=0, 부모 반환=17")

    assert cs.sema == 0
    print(f"자식 알림 먼저={child_first}, 실패 지점={fail_at}")
    print("  " + " → ".join(log))

for child_first in [False, True]:
    for fail_at in [None, "PML4", "주소 공간", "fd Table", "실행 파일"]:
        fork_model(child_first, fail_at)

# Thread 생성 자체가 실패한 경우에는 자식 알림을 기다리지 않는다.
created = False
print("Thread 생성 실패:", {"반환": -1, "down 횟수": int(created), "자식 알림": 0})
```

모델에서 fd 단계가 실패하면 해당 helper 내부의 부분 회수까지 끝났다고 취급한다. 실제 저장소에서는 `duplicate_fd_table()`의 `error` 경로와 `thread_exit()`의 공통 정리를 따로 추적해야 한다. 이 모델의 통과는 실제 메모리 부족 경로 전체의 무결성을 입증하지 않는다.

## 파일 복제가 의미하는 것을 테스트로 읽는다

`fork-read`는 부모가 파일의 처음 20바이트를 읽은 뒤 fork한다. 자식은 이어지는 부분을 읽고 User 버퍼를 바꾼 뒤 파일을 닫는다. 부모는 자식의 종료를 기다린 뒤 자신의 fd로 같은 나머지 부분을 읽어 원문과 비교한다. fd Table의 분리뿐 아니라 현재 위치 복사와 User 메모리의 독립성도 살펴보는 테스트다.

이 저장소에서는 부모와 자식의 `struct file.pos`가 각각 존재한다. Linux의 일반 fork는 같은 Open File Description을 가리켜 파일 offset을 공유하므로 이 차이를 구분해야 한다. 다음 예제는 PintOS 쪽의 별도 위치와 같은 파일 데이터 참조를 작은 모델로 표현한다.

```run-python
data = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
parent = {"data": data, "pos": 20, "closed": False}
child = parent.copy()

def read(handle, size):
    assert not handle["closed"]
    start = handle["pos"]
    result = handle["data"][start:start + size]
    handle["pos"] += len(result)
    return result

child_result = read(child, 6)
child["closed"] = True
assert parent["pos"] == 20 and not parent["closed"]
parent_result = read(parent, 6)
assert child_result == parent_result == b"KLMNOP"
assert parent["data"] is child["data"]
print("자식이 읽은 값:", child_result.decode())
print("자식을 닫은 뒤 부모가 읽은 값:", parent_result.decode())
print("같은 데이터 참조, 별도 위치와 닫힘 상태")
```

파일 객체의 수명과 fd 번호의 상세 규칙은 [File Descriptor](/wiki/pintos-file-descriptors/)에서 이어진다.

| 테스트 | 실제 소스의 확인 범위 |
|---|---|
| `fork-boundary` | Page 경계를 넘는 이름 문자열로 자식을 만들고, 자식의 종료 값 54를 부모가 받는지 확인한다 |
| `fork-read` | 부모·자식의 읽기 위치, 닫힘 상태, User 버퍼의 분리를 확인한다 |
| `fork-close` | 자식이 fd를 닫은 뒤에도 부모의 fd로 전체 내용을 읽을 수 있는지 확인한다 |
| `no-vm/multi-oom` | 재귀적으로 자식을 만들다가 실패하면 깊이를 전달한다. 이후 반복에서 도달 깊이가 줄어들지 않는지 확인한다 |

현재 `multi-oom`의 기준 상수는 10이다. 첫 실행 깊이를 구한 뒤 10회 더 반복하며, 각 반복의 깊이가 첫 값보다 작으면 실패한다. 파일 앞의 “최소 28개” 또는 “항상 같은 깊이”라는 오래된 주석보다 실제 상수와 `< first_run_depth` 조건을 기준으로 읽는다. 별도 비정상 종료 자식도 만들지만, 이 테스트 하나로 모든 실패 분기의 해제 횟수가 정확하다고 증명할 수는 없다.

다음 명령은 x86-64 Linux의 PintOS Compiler와 QEMU 환경이 준비되었을 때 저장소 루트에서 실행할 수 있다. 여기서는 테스트 소스와 기대 파일을 읽었으며 Kernel 실행 결과를 새로 확인한 것은 아니다.

```bash
make -C pintos/userprog check \
  TESTS='tests/userprog/fork-boundary tests/userprog/fork-read
         tests/userprog/fork-close tests/userprog/no-vm/multi-oom'
```

성공 출력만으로 부모가 실제로 얼마나 오래 Block했는지까지 알 수 없다. 초기화의 각 실패 지점과 알림의 순서는 중단점이나 별도의 실패 주입으로 관찰해야 한다. [fork 테스트 소스](https://github.com/woonyong-kr/lrn-pintos/tree/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/tests/userprog)

## Linux·Windows·QEMU에서의 생성 경계

Linux v6.12의 `kernel_clone()`은 호출한 쪽에서 `copy_process()`로 새 Task와 자원 관계를 준비한 뒤 `wake_up_new_task()`로 자식을 실행 가능하게 만든다. PintOS처럼 자식 Thread가 복제를 끝냈다는 Semaphore 알림을 부모가 기다리는 구조와는 다르다. Copy-on-Write는 데이터 Page의 복사를 늦추지만 Task와 Page Table 준비까지 없어지는 것은 아니다. “COW이므로 즉시 반환하고 동기화도 없다”는 표현은 생성 비용과 내부 보호를 지나치게 생략한다. [Linux 생성 경로](https://github.com/torvalds/linux/blob/v6.12/kernel/fork.c)

같은 함수의 `CLONE_VFORK` 경로는 별도의 Completion을 만들고 `wait_for_vfork_done()`으로 기다린다. 이것은 일반 fork의 생성 준비와 다른 대기다. Linux fork의 부모 반환은 자식 PID, 자식 반환은 0이며 실패는 부모에게 `-1`과 `errno`로 전달된다. fd는 복사되지만 해당 Open File Description의 offset과 상태 Flag를 공유한다. [Linux fork API](https://man7.org/linux/man-pages/man2/fork.2.html)

Windows의 `CreateProcessW()`는 실행 파일로 새 프로세스와 초기 Thread를 만든다. 부모의 실행 지점에서 같은 호출이 두 번 반환되는 fork 모델과는 다르다. 더구나 함수의 성공 반환이 새 프로그램의 초기화까지 모두 끝났음을 뜻하지 않는다. 필요한 DLL을 찾거나 초기화하는 데 뒤늦게 실패하면 새 프로세스가 종료될 수 있다. 따라서 PintOS의 `fork_success`를 모든 OS의 애플리케이션 준비 완료 신호로 대응시키지 않는다. [Microsoft CreateProcessW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw)

QEMU의 TCG는 Guest의 System Call, 레지스터와 메모리 접근, 인터럽트와 장치 동작을 실행한다. `fork_success`라는 결과의 의미나 언제 부모에게 알릴지는 PintOS 코드가 결정한다. QEMU v10의 x86 System Call 경로는 `gen_SYSCALL()`과 `target/i386/tcg/system/seg_helper.c`의 `helper_syscall()`에서 확인할 수 있다. [TCG System Call 생성](https://github.com/qemu/qemu/blob/v10.0.0/target/i386/tcg/emit.c.inc), [x86 System Call helper](https://github.com/qemu/qemu/blob/v10.0.0/target/i386/tcg/system/seg_helper.c)

부모가 Block하면 PintOS의 스케줄러가 바로 다른 Thread를 선택할 수 있다. 자식 실행이 반드시 다음 Timer Tick까지 기다려야 하는 것은 아니다. 실제 하드웨어를 항상 결정적이라고 보거나 QEMU의 Timer가 항상 `icount`로만 정해진다고 비교하지 않는다. 명시적인 `icount` 설정, 가속 방식, 외부 입력과 부하를 확인하지 않은 타이밍 수치는 쓰지 않는다.

## GDB에서 초기화 결과를 확인한다

실제 Kernel 심볼을 사용하는 GDB에서 다음 진입점부터 시작한다.

```gdb
break process_fork
break __do_fork
break duplicate_fd_table
break duplicate_running_file
break do_iret
```

부모의 `process_fork()`에서 `cs`가 할당·초기화된 뒤 실제 소스 줄에 중단하고 관찰할 Semaphore를 고른다. 아래 명령은 그때 실행한다.

```gdb
set $cs = cs
set $fork_sem = &$cs->fork_sema
p $cs->tid
p $cs->fork_success
p $fork_sem->value
break sema_down if sema == $fork_sem
break sema_up if sema == $fork_sem
```

자식의 알림 직전에는 `curr->self_status->fork_success`, 지역 프레임 `if_.R.rax`, `curr->pml4`, `curr->fd_table`, `curr->running_file`을 확인한다. `do_iret()`에 들어간 뒤에는 함수의 프레임 포인터 인자를 기준으로 읽는다. 지역 변수의 이름과 생존 범위가 다른 지점에서 같은 명령을 재사용하지 않는다.

실패 경로에서는 `cs->exit_status = -1`, `cs->exited = true`, `fork_success = false`와 `curr->self_status = NULL`을 알림 전에 확인한다. 부모가 false 결과를 수거한 뒤에는 `$cs`를 더 읽지 않는다. `fork_args`도 자식이 초기에 해제하므로 이후에는 자식의 지역 `if_` 복사본을 관찰한다.

Linux 전용 GDB helper인 `$lx_current()`를 PintOS의 Thread 조회 함수처럼 쓰거나, 예전 파일 줄 번호를 그대로 붙여 넣지 않는다. `info line process_fork`, `list __do_fork`로 현재 소스 위치를 찾고 `thread_current()`와 실제 인자를 대응시킨다. 프레임과 구조체 크기는 `p sizeof(struct intr_frame)`, `p sizeof(struct fork_args)`로 같은 빌드에서 확인한다.
