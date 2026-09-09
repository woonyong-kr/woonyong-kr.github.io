---
layout: default
title: QEMU
nav_order: 3
permalink: /wiki/computer-systems-network-qemu-b1366076be02/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-qemu-b1366076be02
projection_sha256: d72d285001a1354e5bedec92291075f57e4534596cb6bdd0d701ecee5ed71b57
parent: 개발 환경
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-327968e136ec
grand_parent: PintOS
ancestor: CS
---

# QEMU
{: .no_toc }

## write가 멈췄다면 어느 코드를 읽어야 하는가

PintOS에서 `write(1, buffer, size)`가 기대한 문자를 출력하지 않았다고 하자. 사용자 프로그램이 인자를 전달했는지, CPU가 커널 진입점으로 이동했는지, 커널이 버퍼를 읽고 출력 장치에 보냈는지는 서로 다른 질문이다. QEMU를 사용한다는 사실만으로 어느 단계가 실패했는지 정해지지 않는다.

여기서는 [lrn-pintos `5afaa6d`](https://github.com/woonyong-kr/lrn-pintos/tree/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0)를 가상 PC에서 실행하는 **system emulation**을 기준으로 이 경계를 따라간다. 구체적인 QEMU 소스는 [v10.0.0](https://github.com/qemu/qemu/tree/v10.0.0)으로 고정한다. 코드와 공식 문서를 읽어 확인한 설명이며, 아래 관찰 절차를 실제 PintOS·QEMU에서 실행하거나 성능을 측정한 기록은 아니다.

### 먼저 실행 모드를 구분한다

`qemu-system-x86_64`는 CPU·메모리·장치로 구성한 가상 머신을 제공하고 그 위에서 Guest OS를 실행한다. PintOS가 syscall 번호를 해석하고, 다음 Thread를 고르고, 파일 이름을 찾는 코드도 이 Guest 안에서 실행된다. QEMU는 이 코드가 이용하는 명령어와 장치의 동작을 제공한다. [QEMU의 system emulation](https://www.qemu.org/docs/master/system/introduction.html)

반면 `qemu-x86_64` 같은 **user emulation**은 다른 아키텍처용 사용자 프로그램을 실행하면서 Host 커널의 서비스를 사용한다. `qemu-linux-user`에는 syscall 변환기가 있어 번호·인자와 자료형 크기·바이트 순서 등을 맞추고 Host syscall을 호출한다. `clone`과 신호 처리에도 관여한다. 따라서 “QEMU는 syscall이나 프로세스를 전혀 모른다”는 문장은 QEMU 전체에 적용할 수 없다. [QEMU의 syscall·Thread 변환](https://www.qemu.org/docs/master/user/main.html#system-call-translation)

이 글에서 구분하려는 것은 **PintOS의 내부 자료구조와 정책을 대신 관리하는가**이다. QEMU가 Host 프로세스와 Thread를 사용하고, 파일과 장치를 열고, 가상 머신을 관리한다는 사실은 이 질문과 별개다.

## 가상 CPU를 실행하는 두 경로

Guest 명령어를 실행할 때 TCG는 대상 명령을 중간 표현으로 바꾼 뒤 Host에서 실행할 코드를 생성한다. 예를 들어 Guest의 메모리 읽기가 Host 코드로 번역되더라도, 그 주소를 PintOS의 `tid` 필드로 사용할지 배열 원소로 사용할지는 Guest 코드의 약속이다. 한 Guest 명령이 반드시 Host 명령 하나로 바뀌는 것도 아니다. [TCG의 번역 구조](https://www.qemu.org/docs/master/devel/tcg.html)

Linux에서 사용할 수 있는 KVM은 Linux 커널의 가상화 기능이다. QEMU의 커널 모듈을 뜻하지 않는다. QEMU는 `/dev/kvm`의 API로 VM과 vCPU를 만들고, 지원되는 Host CPU의 가상화 기능으로 Guest 코드를 실행한다. 장치 접근 중 일부는 QEMU로 돌아오지만, 커널 내부 장치 모델이나 vhost, 장치 직접 연결을 사용하는 경로도 있으므로 모든 I/O가 반드시 QEMU 사용자 공간을 거친다고 단정할 수 없다. [KVM API](https://www.kernel.org/doc/html/latest/virt/kvm/api.html), [QEMU의 장치 실행 경로](https://www.qemu.org/docs/master/system/introduction.html#feature-overview)

| 확인할 항목 | TCG | KVM |
|---|---|---|
| Guest CPU 실행 | Guest 명령을 번역한 Host 코드를 실행 | 호환되는 CPU 가상화 기능으로 실행 |
| 아키텍처 조건 | 지원되는 Host·Guest 조합에서 서로 다른 아키텍처도 가능 | Host 커널·CPU와 Guest 아키텍처의 지원 조건을 만족해야 함 |
| syscall 처리 | system mode에서 CPU 진입 동작을 재현하고 Guest 커널이 번호 해석 | Guest 커널이 번호 해석하며 syscall 자체가 항상 VM exit를 요구하지는 않음 |
| 실행 비용 | 번역·메모리·장치 접근 경로와 작업에 따라 달라짐 | VM exit·장치·메모리·Host 스케줄링 등의 영향을 받음 |
| GDB 지원 | system mode에서 breakpoint·watchpoint 지원 | accelerator의 지원 범위에 따라 달라짐 |

KVM을 사용하면 언제나 일정 배수만큼 빨라지거나, TCG이면 언제나 5~20배 느리다는 수치는 이 표에서 나오지 않는다. GDB도 KVM에서는 무조건 하드웨어 breakpoint만 써야 하는 것이 아니다. 메모리에 삽입하는 breakpoint와 accelerator가 제공하는 기능을 구분한다. [QEMU GDB의 breakpoint 지원](https://www.qemu.org/docs/master/system/gdb.html#breakpoint-and-watchpoint-support)

### CPU 상태와 RAM은 각각 여러 개일 수 있다

QEMU 프로세스 하나가 Guest CPU 하나만 표현하는 것은 아니다. Machine 구성에 따라 여러 vCPU를 만들 수 있고, MTTCG는 지원 조건에서 vCPU마다 Host Thread를 둔다. Host가 그 Thread들을 실행할 차례를 정하는 일과 PintOS가 Guest Thread를 고르는 일은 다른 스케줄링이다. [QEMU의 다중 vCPU 실행](https://www.qemu.org/docs/master/devel/multi-thread-tcg.html)

x86 CPU의 `CPUX86State`는 일반 레지스터뿐 아니라 제어 레지스터·세그먼트·MSR·부동소수점 상태 등을 담는다. 이것을 PintOS의 프로세스 테이블로 읽거나 크기를 고정된 바이트 수로 외우지 않는다. Guest 메모리도 `RAMBlock` 하나로만 이루어져야 하는 것은 아니다. RAM의 backing 영역과 RAM·ROM·MMIO를 배치하는 `MemoryRegion` 및 `AddressSpace`를 구분해야 한다. [CPU 상태](https://github.com/qemu/qemu/blob/v10.0.0/target/i386/cpu.h), [RAMBlock](https://github.com/qemu/qemu/blob/v10.0.0/include/exec/ramblock.h), [QEMU Memory API](https://www.qemu.org/docs/master/devel/memory.html)

## SYSCALL은 진입을, PintOS는 번호를 처리한다

현재 사용자 wrapper의 `write()`는 `syscall3(SYS_WRITE, fd, buffer, size)`를 사용한다. `syscall3`의 3은 인자 개수이며 syscall 번호가 아니다. 번호 `SYS_WRITE`는 10이고, wrapper는 RAX에 번호를, RDI·RSI·RDX에 세 인자를 배치한다. 네 번째부터 여섯 번째 인자는 R10·R8·R9를 사용한다. [PintOS의 사용자 wrapper](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/lib/user/syscall.c)

### CPU가 정한 상태 전환

64비트 코드의 `SYSCALL`은 커널 진입에 필요한 CPU 상태를 바꾼다. 다음 표는 명령의 효과를 나누어 적은 것이며, 각 행을 독립된 Guest 명령 다섯 개로 실행한다는 뜻은 아니다.

| 상태 | 64비트 SYSCALL의 효과 |
|---|---|
| RCX | **SYSCALL 다음 명령의 RIP**를 복귀 주소로 저장 |
| R11 | 복귀에 사용할 RFLAGS 저장; QEMU v10.0.0 경로는 RF를 제거한 값을 저장 |
| RIP | IA32_LSTAR의 커널 진입점으로 이동 |
| CS·SS | IA32_STAR의 커널 selector를 바탕으로 Ring 0 selector와 정해진 descriptor cache 속성을 설정 |
| 현재 RFLAGS | IA32_FMASK에 지정된 비트를 지움; 해당 QEMU 경로는 RF도 제거 |
| RSP | 명령 자체가 User RSP를 저장하거나 Kernel RSP로 교체하지 않음 |
| RAX | PintOS의 syscall 번호라는 의미로 해석하거나 반환값으로 바꾸지 않음 |

QEMU v10.0.0의 `helper_syscall(env, next_eip_addend)`는 `env->eip + next_eip_addend`를 RCX에 저장한다. “현재 RIP를 그대로 복사한다”는 의사 코드는 이 복귀 위치를 놓친다. 함수가 놓인 경로도 `target/i386/tcg/system/seg_helper.c`다. 같은 파일 이름의 다른 경로를 혼동하지 않는다. [QEMU의 system-mode SYSCALL 구현](https://github.com/qemu/qemu/blob/v10.0.0/target/i386/tcg/system/seg_helper.c#L30-L83)

PintOS의 `syscall_init()`은 LSTAR에 `syscall_entry`를 등록하고 FMASK로 IF·TF·DF·IOPL·AC·NT를 지우도록 설정한다. 진입한 assembly가 User RSP를 보관하고 TSS에서 Kernel RSP를 읽은 다음 `intr_frame`을 쌓는다. 즉 **CPU의 진입 동작과 커널 코드의 스택 교체**는 서로 다른 단계다. [초기화](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/userprog/syscall.c), [진입 assembly](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/userprog/syscall-entry.S)

### 저장된 인자를 커널 함수에 넘긴다

`syscall_entry`는 `intr_frame *`를 RDI에 놓고 `syscall_handler()`를 호출한다. 이 시점의 CPU RDI는 사용자 fd가 아니라 C 함수의 첫 인자인 Frame 포인터다. 원래 syscall의 번호와 인자는 `f->R.rax`, `f->R.rdi`, `f->R.rsi`, `f->R.rdx`에서 읽어야 한다.

handler는 `f->R.rax`로 분기한다. `SYS_WRITE`라면 fd·버퍼·길이와 Frame을 `write()`에 넘기고 반환값을 다시 `f->R.rax`에 저장한다. fd 1의 정상 출력 경로에는 `putbuf()`가 사용된다. 파일 fd라면 파일 객체와 파일 시스템을 거치는 별도 경로다. 일반적으로 돌아오는 syscall의 끝에서는 assembly가 저장한 상태와 결과를 복구하고 `sysretq`를 실행한다. `exit`처럼 사용자 호출 지점으로 돌아오지 않는 동작도 구분해야 한다.

### 번호의 선언과 구현 범위

이 커밋의 enum과 handler를 함께 읽으면 다음과 같다. 이름이 선언되어 있다는 사실만으로 그 기능이 구현되었다고 판단하지 않는다.

| 번호 | enum 이름 | 현재 handler |
|---|---|---|
| 0–4 | HALT, EXIT, FORK, EXEC, WAIT | 각 분기 존재 |
| 5–8 | CREATE, REMOVE, OPEN, FILESIZE | 각 분기 존재 |
| 9–13 | READ, WRITE, SEEK, TELL, CLOSE | 각 분기 존재 |
| 14–15 | MMAP, MUNMAP | 각 분기 존재; 실제 기능은 VM 빌드와 구현 조건을 함께 확인 |
| 16–21 | CHDIR, MKDIR, READDIR, ISDIR, INUMBER, SYMLINK | 대응 분기 없음 |
| 22 | DUP2 | 사용자 wrapper는 있으나 대응 분기 없음 |
| 23–24 | MOUNT, UMOUNT | 대응 분기 없음 |

표의 이름 앞에는 모두 `SYS_`가 붙는다. `default`는 `break`만 실행하며 실패 코드를 따로 넣지 않는다. 따라서 미구현 번호는 저장된 RAX가 바뀌지 않은 채 돌아갈 수 있다. 이를 성공, 정상 오류 처리 또는 `dup2` 지원으로 해석해서는 안 된다. [번호 정의](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/lib/syscall-nr.h), [현재 dispatch](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/userprog/syscall.c#L110-L174)

번호 체계는 OS와 아키텍처의 ABI가 정한다. 예를 들어 Linux x86-64의 `write` 번호 1과 이 PintOS의 번호 10은 다르다. system emulation이 Guest 커널 대신 그 차이를 결정하는 것이 아니다. QEMU 전체에서 `SYS_WRITE` 문자열이 검색되는지 여부도 이 책임 경계를 증명하지 못한다. user-mode 변환기처럼 실제로 번호를 처리하는 코드가 있기 때문이다. [Linux x86-64 syscall 번호](https://github.com/torvalds/linux/blob/v6.12/arch/x86/entry/syscalls/syscall_64.tbl)

## Thread를 고르는 자료구조와 CPU 상태

PintOS의 `ready_list`에 여러 Thread가 기다리면 `schedule()`은 `next_thread_to_run()`으로 다음 Thread를 고른다. 선택한 Thread의 상태를 `THREAD_RUNNING`으로 바꾸고 `thread_ticks`를 초기화한다. USERPROG 빌드에서는 `process_activate(next)`가 주소 공간과 TSS를 준비하고, 필요한 경우 `thread_launch(next)`가 저장된 실행 문맥으로 전환한다. [현재 schedule](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/thread.c)

| PintOS의 값 | 커널에서 쓰는 의미 | 가상 CPU·메모리에서 나타나는 변화 |
|---|---|---|
| `thread->tid`, `status` | 실행 단위의 식별자와 상태 | 구조체 필드의 읽기·쓰기 |
| `ready_list`, `thread->elem` | 실행 후보의 순서와 연결 | 포인터와 List 연결의 변경 |
| `child_status_list`, `self_status` | 부모·자식 관계와 종료 상태 | 공유 상태 레코드의 생성·갱신·회수 |
| `thread->pml4` | 사용할 주소 공간의 페이지 테이블 | CR3에 페이지 테이블의 Guest 물리 주소를 설정 |
| `thread->tf`, Kernel Stack | 중단한 실행을 이어 갈 문맥 | RIP·RSP와 일반 레지스터 등의 변경 |

QEMU의 CPU 실행 경로가 이 필드들을 PintOS의 프로세스 테이블로 등록하는 것은 아니다. `fork()` 때 자식 Thread·페이지 테이블·파일 참조가 생성되더라도 QEMU에 대응하는 자식 Host 프로세스를 하나씩 만드는 방식이 아니다. `exit()`의 상태 전달과 `wait()`의 회수 역시 PintOS의 상태 레코드와 동기화가 담당한다. 자세한 복제·회수는 [프로세스 생성](/wiki/computer-systems-network-topic-4af2e32913a4/)과 [프로세스 종료](/wiki/computer-systems-network-topic-93ebb5bf7e48/)로 이어진다.

`struct thread` 전체를 4,096바이트라고 쓰는 것도 정확하지 않다. 이 PintOS는 Thread 구조체와 Kernel Stack을 한 4KiB 페이지 안에 둔다. 구조체를 제외한 나머지 공간을 스택이 쓰므로, 구조체의 크기와 페이지 크기를 구분해야 한다. 빌드 옵션에 따라 필드도 달라지며, `elem`이 구조체의 첫 필드라는 보장도 없다. [Thread 배치](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/threads/thread.h)

### CR3는 프로세스 번호가 아니다

`process_activate(next)`는 `pml4_activate(next->pml4)`와 `tss_update(next)`를 호출한다. `thread->pml4`는 커널이 접근하는 가상 주소이고 CR3의 페이지 테이블 기준 주소는 Guest 물리 주소다. NULL인 커널 Thread 경로에는 기본 커널 페이지 테이블을 사용한다. 두 값을 비교할 때 주소 종류와 호출 전후의 시점을 함께 확인해야 한다.

CR3 변경을 관찰하면 CPU가 사용할 페이지 테이블 기준이 달라졌는지 조사할 수 있다. 하지만 그 값으로 PID·tid, 부모·자식 관계, 스케줄링 이유까지 알 수는 없다. 여러 Thread가 같은 주소 공간을 사용할 수 있고, 같은 주소 공간을 다시 활성화할 수도 있다. CPU의 TLB 무효화 범위도 아키텍처·제어 비트와 명령 조건에 따르므로 CR3를 쓸 때마다 모든 TLB가 무조건 사라진다고 일반화하지 않는다. [PintOS의 페이지 테이블 활성화](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/mmu.c)

## 타이머와 페이지 폴트는 결정을 요청한다

PintOS는 PIT에 주기를 설정하고 PIC를 통해 들어온 타이머 인터럽트를 `timer_interrupt()`에서 받는다. 현재 `TIMER_FREQ`는 100이며 설정 코드는 `(1193180 + TIMER_FREQ/2) / TIMER_FREQ`를 정수 계산해 카운터 값을 정한다. 기본값에서는 11,932다. 이는 프로그램한 주기의 계산이며, Host 벽시계에서 정확히 10ms마다 handler가 실행됐다는 측정값이 아니다.

handler는 `ticks`를 늘리고 `thread_tick()`과 깨울 Thread의 처리를 이어 간다. `TIME_SLICE=4`에 따른 선점 요청과 `intr_yield_on_return()`은 Guest 커널의 결정이다. PIT가 “tid 2를 실행하라”고 알려 주는 것은 아니다. 직렬 포트와 키보드 모델도 장치의 레지스터·데이터·인터럽트를 다루며, 이를 fd 1의 출력이나 fd 0의 입력으로 사용하는 규칙은 커널의 I/O 경로에서 생긴다. [타이머](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/devices/timer.c), [Thread의 틱 처리](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/thread.c)

### 주소 변환과 복구 정책

Guest 가상 주소를 페이지 테이블로 변환하는 것은 CPU의 MMU와 TLB에 관한 동작이다. 물리 메모리 영역을 RAM이나 장치에 연결하는 메모리 컨트롤러의 역할과 동일하지 않다. TCG에서는 CPU의 변환·접근 검사를 에뮬레이션하고, KVM에서는 하드웨어 가상화와 Host 커널이 해당 경로에 참여한다. Guest 물리 주소 역시 Host 가상 주소나 Host 물리 주소와 구별한다.

이 PintOS의 일반 4KiB 매핑에서는 네 단계의 페이지 테이블을 따른다. 부팅 초기 `start.S`가 2MiB 페이지를 쓰는 구간과는 구별한다. 매핑이 없거나 접근 권한을 위반하면 CPU는 페이지 폴트 `#PF`를 발생시킬 수 있다. 그러나 매핑이 없다는 사실만으로 OS 버그가 확정되지는 않는다. Lazy Loading, Swap In, Stack Growth, COW 등은 폴트를 계기로 필요한 상태를 만드는 정상 경로를 포함한다. `vm_try_handle_fault()`가 접근과 복구 가능성을 판단하며, 복구하지 못한 경우에 종료나 오류 처리를 이어 간다.

폴트가 요구하는 판단과 실제 매핑이 어떻게 연결되는지는 [가상 메모리 구현](/wiki/computer-systems-network-topic-83f24986336f/)에서 읽는다. Guest VA·PA와 커널 별칭의 계산은 [Paging](/wiki/computer-systems-network-topic-dbd836d1a044/)으로 연결한다. 장치 모델이 주소에 반응하는 동작과 OS가 그 페이지를 유효하다고 판단하는 정책을 함께 확인해야 원인을 좁힐 수 있다.

## 파일 이름이 Sector 요청으로 바뀌는 지점

`filesys_open("hello.txt")`를 처리할 때 PintOS는 Directory의 이름을 찾아 inode를 열고, 파일 안의 위치를 데이터 Sector로 바꾼다. 현재 기본 파일 시스템의 연속 할당 경로는 `inode->data.start + offset / DISK_SECTOR_SIZE`를 사용한다. 파일 길이 안의 유효한 offset인지도 커널이 검사한다. [파일 시스템 구현](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/filesys/inode.c)

inode가 Sector 5에 있고 첫 데이터 Sector가 40인 설명용 배치를 생각할 수 있다. 파일 offset 1,024는 `40 + 1024/512 = 42`에 대응한다. inode Metadata가 놓인 5와 데이터 위치 42는 서로 다르다. `disk_read()` 아래의 IDE 요청에는 장치·Sector·명령·데이터가 전달되며, 이 요청에 `hello.txt`를 찾는 Directory 탐색이 포함되는 것은 아니다.

현재 Driver는 LBA28의 번호를 Low·Mid·High 및 Device Register에 나누고, Read `0x20` 또는 Write `0x30` 명령을 쓴다. Primary Channel의 Data Port는 `0x1f0`, Secondary는 `0x170`이며 512바이트 Sector를 16비트 Word 256개로 전송한다. 장치 선택과 IRQ·PIO 대기 순서는 [IDE 컨트롤러](/wiki/ide-controller/)에서 이어서 확인한다.

### Guest 파일 정책과 Host 파일 정책은 별도로 존재한다

Guest의 기본 파일 시스템은 `dir_lookup()`으로 이름을 찾고, free map으로 빈 Sector를 추적하고, `inode_disk.length`로 길이를 관리한다. `deny_write_cnt`는 실행 중 파일 등에 적용하는 쓰기 금지 요청 수다. 이것이 Linux의 uid·gid·mode 같은 일반적인 사용자별 접근 권한 모델을 구현한 것은 아니다. 현재 PintOS의 이런 구조는 [파일 시스템 구현](/wiki/computer-systems-network-topic-c76b83867c50/)과 [저장 공간 관리](/wiki/computer-systems-network-topic-33acdcc0a664/)에서 구체적으로 읽을 수 있다.

QEMU의 일반 블록 장치 경로는 Guest 파일의 이름·소유자·디렉터리·빈 블록을 그 파일 시스템의 의미로 관리하지 않는다. 디렉터리나 텍스트 파일에 들어 있는 문자열 바이트가 전송될 수는 있어도, 그것을 Guest 파일의 이름으로 해석해 접근을 허가하는 절차는 아니다. Guest Linux에서도 VFS·파일 시스템이 경로·inode·권한·저널과 캐시를 관리하고 아래 블록 계층에 요청을 넘긴다.

반면 QEMU는 **Host의 이미지 파일 경로와 이미지 형식**을 알고 파일을 연다. Host 파일 시스템의 접근 권한과 Cache도 영향을 준다. `-virtfs`·9p처럼 Host 디렉터리를 Guest에 제공하는 기능에서는 QEMU가 이름과 파일 속성을 직접 처리한다. Virtual FAT처럼 Host 디렉터리에서 파일 시스템 이미지를 구성하는 기능도 있다. 따라서 “QEMU 소스 전체에 filename·directory·permission 개념이 없다”거나 “QEMU는 파일 이름을 본 적이 없다”고 주장할 수 없다. [9p 공유 설정](https://www.qemu.org/docs/master/system/invocation.html), [QEMU 9p의 Host 경로 처리](https://github.com/qemu/qemu/blob/v10.0.0/hw/9pfs/9p-local.c), [Virtual FAT](https://www.qemu.org/docs/master/system/images.html#virtual-fat-disk-images)

Guest 파일 캐시와 QEMU 블록 계층의 Cache 설정, Host Page Cache는 각각 다르다. Guest가 `disk_write()`를 완료했다는 사실만으로 Host 전원 손실 뒤에도 바이트가 남는다고 판단하지 않는다. [BlockBackend](/wiki/qemu-block-backend/)에서 이미지 경로와 완료·영속성의 차이를 이어서 확인할 수 있다.

### Raw 이미지의 직접 오프셋은 조건이 있다

이미지 전체를 기준 오프셋 없이 연결한 Raw 구성이라면 Sector 42의 데이터는 이미지 파일의 `42*512 = 21,504`, 즉 `0x5400`에서 시작한다. 512바이트 범위는 21,504 이상 22,016 미만이다. qcow2는 Cluster 매핑과 Metadata를 거치므로 같은 숫자를 Host 파일 오프셋으로 그대로 사용할 수 없다. Raw에서도 연결한 offset과 backing 구성을 확인해야 한다.

QEMU의 `ide_sector_read()`는 장치 상태를 처리하고 `ide_buffered_readv()`·`blk_aio_preadv()`를 거쳐 요청한다. 아래의 Format·Protocol Driver가 실제 저장소를 다룬다. `file-posix.c`에서도 설정에 따라 비동기 I/O나 Thread Pool 등으로 갈 수 있으므로 “IDE가 항상 `pread()` 한 번만 한다”고 줄이지 않는다. 이 내부 경로와 Raw·qcow2 비교는 [BlockBackend](/wiki/qemu-block-backend/)에서 자세히 다룬다. [QEMU IDE 읽기](https://github.com/qemu/qemu/blob/v10.0.0/hw/ide/core.c)

2MiB 장치와 512바이트 논리 Sector를 **가정하면** 총 4,096개 Sector다. 기본 PintOS 파일 시스템은 Sector 0을 Free Map 파일의 inode, Sector 1을 Root Directory inode에 사용한다. free map의 4,096비트 데이터는 512바이트지만 inode 등 Metadata 비용은 별도다. FAT 빌드의 배치까지 같다고 볼 수는 없다. 이 크기를 모든 실행의 기본 디스크 크기나 `pintos.dsk`라는 고정 파일 이름으로 일반화하지 않는다.

같은 방식으로 4MiB Swap 장치에 4KiB 페이지를 저장하면 1,024개 Slot을 둘 수 있고, 한 페이지는 512바이트 Sector 여덟 개에 해당한다. 어느 Slot을 예약·회수하고 어떤 페이지를 복구할지는 PintOS의 [Swap](/wiki/computer-systems-network-swap-11630540adf8/) 코드가 판단한다. QEMU가 `swap_table`을 검사해 빈 Slot을 골라 주는 것은 아니다. 실행기의 Boot·파일 시스템·Scratch·Swap 이미지 연결은 BlockBackend 문서의 장치 표와 실제 `-drive` 인자를 대조한다.

## 같은 중단점에서 무엇을 관찰할 것인가

Guest Kernel Symbol을 사용하는 원격 GDB와 QEMU 자체의 Host Debugger는 서로 다른 프로그램을 읽는다. Guest GDB에서 `syscall_handler()`를 볼 수 있다는 사실이 QEMU의 `ide_sector_read()`까지 같은 Symbol로 볼 수 있다는 뜻은 아니다. Guest 코드와 디버그 정보가 같은 빌드인지, 어느 vCPU와 주소 공간을 선택했는지도 먼저 확인한다. [QEMU GDB의 CPU·메모리 관찰](https://www.qemu.org/docs/master/system/gdb.html)

다음은 Kernel Symbol이 있는 해당 PintOS에 연결한 뒤 사용할 **정적 관찰 절차**다. 실행 출력은 제시하지 않는다. 각 묶음은 필요한 함수에서 멈춰 사용하는 절차다. 다른 중단점에 먼저 멈췄다면 현재 함수를 확인하고 해당 지점까지 진행한 뒤 변수를 읽는다. 코드 위치나 지역 변수의 가시성은 실제 빌드에서 확인한다.

```gdb
# syscall_handler에 저장된 사용자 인자를 읽는다.
tbreak syscall_handler
continue
p/x f->R.rax
p f->R.rdi
p/x f->R.rsi
p f->R.rdx

# 다음 Thread와 현재 CPU 상태를 비교한다.
tbreak process_activate
continue
p next->tid
p next->status
p/x next->pml4
info registers cr3 rip rsp

# 페이지 폴트의 접근 주소와 실패한 명령을 구별한다.
tbreak page_fault
continue
p/x $cr2
p/x f->error_code
p/x f->rip
```

`process_activate()` 입구에서는 새 CR3를 아직 쓰기 전일 수 있다. source를 따라 `pml4_activate()` 이후를 확인해야 선택한 Thread와 실제 페이지 테이블을 비교할 수 있다. `page_fault()`에서는 CR2를 다른 폴트로 덮기 전에 읽거나, `fault_addr = rcr2()`가 끝난 뒤 저장된 지역 변수를 읽는다. RCX는 fault 주소 레지스터가 아니며, PTE 하나의 존재 여부만으로 접근이 성공해야 한다고 판단할 수도 없다. 상위 단계 권한, 접근 종류, 현재 주소 공간과 복구 경로를 함께 본다.

### List 원소에서 Thread를 찾는다

`ready_list`의 포인터는 `struct thread`의 시작이 아니라 내부의 `elem`을 가리킨다. 원소 주소에서 실제 필드 오프셋을 빼야 Thread 주소가 된다. 다음은 스케줄러 안에서 멈춘 상태에 사용할 설명용 GDB 절차이며, 함수 호출로 Guest를 실행하지 않고 디버그 타입과 저장된 연결을 읽는다.

```gdb
set $thread_elem_offset = (unsigned long)&((struct thread *)0)->elem
set $ready_entry = ready_list.head.next
set $seen = 0
while $ready_entry != &ready_list.tail && $ready_entry != 0 && $seen < 64
  set $ready_thread = (struct thread *)((char *)$ready_entry - $thread_elem_offset)
  p $ready_thread->tid
  p $ready_thread->status
  p $ready_thread->priority
  set $ready_entry = $ready_entry->next
  set $seen = $seen + 1
end
```

64는 무한 순회를 피하기 위한 관찰 상한이며 Thread 수의 제한이 아니다. 상한 전에 tail에 닿지 않았다고 곧바로 순환 버그라고 단정하지 않는다. 또한 `x/4x`의 단위를 바이트로 가정하거나 임의 주소의 첫 네 바이트를 tid라고 지정하지 않는다. 타입을 읽을 때는 `p`, 실제 바이트를 확인할 때는 검증한 주소에 `x/4bx`처럼 단위를 명시한다.

| 증상 | 먼저 관찰할 값과 경로 | 그 관찰만으로 확정할 수 없는 것 |
|---|---|---|
| syscall 반환값 이상 | 저장된 번호·인자, handler 분기, fd·버퍼 검증과 하위 반환값 | QEMU 전체의 정상 여부나 미구현 번호의 성공 |
| Thread가 실행되지 않음 | `ready_list`, 상태·우선순위, `thread_tick()`, `schedule()` | vCPU가 존재한다는 사실만으로 Guest 스케줄링이 정상이라는 결론 |
| 페이지 폴트 | CR2, `f->rip`, error code, 페이지 테이블·SPT, 복구 handler | PTE가 없으면 반드시 버그라는 결론 |
| 디스크 내용 불일치 | 장치·Sector·버퍼, 연결한 이미지·Format·offset, 완료 시점 | 읽힌 바이트만으로 저장 장치의 영속성이나 모든 계층의 정상 여부 |
| 타이머 이상 | PIT·PIC 설정, IF, `timer_interrupt()` 진입과 `ticks` 변화 | handler가 한 번 호출되면 주파수·누락·지연까지 정상이라는 결론 |

fd table을 조사할 때도 먼저 fd 범위와 예약된 표준 입력·출력 번호를 확인한 뒤 파일 슬롯을 읽는다. 타이머에서는 중단점 방문 수와 가상 시간·Host 벽시계 시간을 구분한다. 관찰한 Guest 요청이 올바른데 장치 응답이 다르면 QEMU의 Machine·accelerator·장치·Backend 경로로 조사를 넓힌다. 책임 경계는 원인을 찾는 순서를 정해 주지만, 측정 없이 “99%는 OS 버그”라는 확률을 주지는 않는다.
