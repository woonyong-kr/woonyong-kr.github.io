---
layout: default
title: 시스템 콜
nav_order: 4
permalink: /wiki/computer-systems-network-topic-3cc26725c1cb/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-3cc26725c1cb
projection_sha256: 132f28edf5e162d1f79b6e505e6095e6185967cd41ac106a934ce6b075eda5df
parent: 사용자 프로그램
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-63dd07ba6393
search_terms:
- syscall_handler
- SYSCALL
- RAX
- R10
- SYS_MMAP
- SYS_MUNMAP
- filesys_lock
- copy_in_string
- ABI
grand_parent: PintOS
ancestor: CS 기초
---

# 시스템 콜
{: .no_toc }

사용자 프로그램이 파일에 쓰려면 커널에 파일과 장치 처리를 요청해야 한다. 시스템 콜은 이 요청의 번호·인자·반환값을 약속한 인터페이스다. 커널에 들어오는 CPU 명령과, 들어온 뒤 번호에 맞는 기능을 실행하는 Dispatch는 서로 다른 단계다.

PintOS의 `write(fd, buffer, size)`를 따라가면 사용자 Wrapper가 RAX에 번호 10을, RDI·RSI·RDX에 세 인자를 놓는다. `syscall3`의 3은 인자 개수다. `SYSCALL`이 `syscall_entry`로 진입하면 Assembly가 Kernel Stack으로 옮겨 Frame을 만든 뒤 `syscall_handler()`를 호출한다. [사용자 Wrapper](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/lib/user/syscall.c)

## 저장한 인자를 C 함수에 넘긴다

`syscall_entry`가 C 함수를 부를 때의 RDI는 `intr_frame *`다. 따라서 Handler 안에서 현재 CPU의 RDI를 fd로 읽으면 안 된다. 원래 사용자 번호와 인자는 `f->R.rax`, `f->R.rdi`, `f->R.rsi`, `f->R.rdx`에 저장되어 있다.

```c
case SYS_WRITE:
    f->R.rax = write (f->R.rdi,
                     (const void *) f->R.rsi,
                     f->R.rdx, f);
    break;
```

이것은 실제 Handler의 분기다. `write()`가 돌려준 값을 **저장된 RAX**에 대입하면, Assembly가 Frame을 복원할 때 사용자에게 전달할 RAX가 된다. 정상적으로 반환하는 호출은 `syscall_entry` 끝의 `sysretq`로 돌아간다. 이 경로에서 항상 `do_iret()`를 호출하는 것은 아니다. [Handler](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/userprog/syscall.c), [진입·복귀 Assembly](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/userprog/syscall-entry.S)

`SYSCALL` 자체는 User RSP를 Kernel RSP로 바꾸지 않는다. PintOS의 Assembly가 TSS에서 Kernel Stack 위치를 읽고 전환한다. CPU가 LSTAR·STAR·FMASK를 사용하는 방식과 QEMU의 해당 명령 구현은 [QEMU](/wiki/computer-systems-network-qemu-b1366076be02/)에, Frame과 복귀 상태는 [커널과 사용자 영역](/wiki/computer-systems-network-topic-41565131cfca/)에 이어진다.

## 번호와 인자 규약

인자는 차례로 RDI, RSI, RDX, **R10**, R8, R9를 사용한다. 일반적인 x86-64 C 함수 호출의 네 번째 인자인 RCX와 혼동하기 쉽다. `SYSCALL`이 RCX를 복귀 RIP 저장에 사용하므로, 이 시스템 콜 규약의 네 번째 인자는 R10이다.

다음은 `lrn-pintos`의 `9d1b14c` 커밋에 있는 번호와 Handler를 함께 읽은 결과다. 번호를 정의한 것과 기능을 구현한 것은 구별해야 한다.

| 번호 | 이름 | 인자 순서 | 현재 동작·반환 |
|---|---|---|---|
| 0 | `SYS_HALT` | 없음 | 시스템 전원 종료 |
| 1 | `SYS_EXIT` | status | 프로세스 종료, 원래 호출 위치로 돌아오지 않음 |
| 2 | `SYS_FORK` | thread_name | 자식 tid 또는 실패값 |
| 3 | `SYS_EXEC` | cmd_line | 성공하면 새 프로그램으로 진입, 실패하면 `exit(-1)` |
| 4 | `SYS_WAIT` | tid | 자식 종료 상태 또는 -1 |
| 5 | `SYS_CREATE` | file, initial_size | 성공 여부 |
| 6 | `SYS_REMOVE` | file | 성공 여부 |
| 7 | `SYS_OPEN` | file | fd 또는 -1 |
| 8 | `SYS_FILESIZE` | fd | 파일 크기 또는 -1 |
| 9 | `SYS_READ` | fd, buffer, size | 읽은 바이트 수 또는 -1 |
| 10 | `SYS_WRITE` | fd, buffer, size | 쓴 바이트 수 또는 -1 |
| 11 | `SYS_SEEK` | fd, position | 파일 위치 변경 |
| 12 | `SYS_TELL` | fd | 위치 반환, 현재 구현은 잘못된 fd에서 0 |
| 13 | `SYS_CLOSE` | fd | 파일 Descriptor 닫기 |
| 14 | `SYS_MMAP` | addr, length, writable, fd, offset | VM 구현의 Mapping 주소 또는 NULL |
| 15 | `SYS_MUNMAP` | addr | VM Mapping 해제 |

`mmap`의 fd는 R10, offset은 R8에서 읽는다. 번호는 14와 15다. Handler의 두 `case` 자체는 존재하지만, `VM`을 끈 빌드에서는 `mmap()`이 NULL을 반환하고 `munmap()`은 Mapping 해제를 실행하지 않는다.

16–21은 CHDIR·MKDIR·READDIR·ISDIR·INUMBER·SYMLINK, 22는 DUP2, 23–24는 MOUNT·UMOUNT로 선언되어 있다. 이 번호에 대응하는 현재 Handler 분기는 없다. DUP2는 사용자 Wrapper도 있지만, Handler의 `default`는 `break`만 하므로 저장된 RAX가 그대로 반환될 수 있다. 이 값을 성공이나 정상적인 오류 반환으로 해석하지 않는다. [번호 정의](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/include/lib/syscall-nr.h)

### R10과 반환값을 확인하는 예제

아래 코드는 Register를 Dictionary로 표현해 인자 해석과 반환값 전달만 실행한다. 파일을 쓰거나 실제 시스템 콜을 호출하지 않는다. `frame["r10"]`과 RCX를 서로 다른 값으로 두면 네 번째 인자를 잘못 읽었을 때의 차이를 확인할 수 있다.

```run-python
from struct import pack, unpack

names = "HALT EXIT FORK EXEC WAIT CREATE REMOVE OPEN FILESIZE READ WRITE SEEK TELL CLOSE MMAP MUNMAP CHDIR MKDIR READDIR ISDIR INUMBER SYMLINK DUP2 MOUNT UMOUNT".split()
numbers = {name: i for i, name in enumerate(names)}
arg_registers = ("rdi", "rsi", "rdx", "r10", "r8", "r9")

frame = dict(rax=numbers["MMAP"], rdi=0x400000, rsi=8192, rdx=1,
             r10=3, r8=4096, r9=0, rcx=0x401234)
args = tuple(frame[reg] for reg in arg_registers[:5])
print(f"SYS_MMAP={frame['rax']}, args={args}")
print(f"fd from R10={args[3]}, saved RCX is not arg4={frame['rcx']:#x}")

frame = dict(rax=numbers["WRITE"], rdi=1, rsi=0x500000, rdx=5)
print(f"SYS_WRITE={frame['rax']}, fd={frame['rdi']}, size={frame['rdx']}")
frame["rax"] = 5  # 파일이나 장치에 쓰지 않고 반환값 전달만 표현한다.
print(f"user return RAX={frame['rax']}")

frame["rax"] = (1 << 64) - 1
signed_int = unpack("<i", pack("<I", frame["rax"] & 0xffffffff))[0]
print(f"error bits={frame['rax']:#x}, C int result={signed_int}")

frame["rax"] = numbers["DUP2"]
# 현재 PintOS의 default: break와 같이 결과를 대입하지 않는다.
print(f"unimplemented SYS_DUP2 returns unchanged RAX={frame['rax']}")
```

실행 결과:

```text
SYS_MMAP=14, args=(4194304, 8192, 1, 3, 4096)
fd from R10=3, saved RCX is not arg4=0x401234
SYS_WRITE=10, fd=1, size=5
user return RAX=5
error bits=0xffffffffffffffff, C int result=-1
unimplemented SYS_DUP2 returns unchanged RAX=22
```

같은 64비트 RAX도 반환형에 따라 해석이 달라진다. 예제는 -1의 비트 패턴을 C `int` 반환형으로 읽는 과정을 따로 보여 준다. 마지막의 22는 DUP2 성공값을 흉내 낸 것이 아니라, 결과를 쓰지 않는 현재 `default` 분기의 문제를 표현한 것이다.

## 사용자 주소와 Kernel Buffer 사이

포인터를 인자로 받았다고 해서 커널이 그 주소를 바로 안전하게 읽을 수 있는 것은 아니다. 버퍼는 여러 페이지에 걸칠 수 있고, 시작 주소가 유효해도 마지막 페이지가 없거나 쓰기 권한이 부족할 수 있다.

현재 `validate_user_buffer()`는 크기가 0이면 바로 돌아온다. 그 외에는 NULL과 범위 덧셈의 Overflow를 검사하고, 버퍼가 걸치는 페이지를 따라 `validate_user_addr()`를 호출한다. `write`의 입력 버퍼는 읽을 수 있어야 하고, `read`의 출력 버퍼는 쓸 수 있어야 한다. VM을 사용하는 경우에는 주소·권한과 함께 Lazy Page를 실제로 확보할 수 있는지도 검사한다.

`copy_in()`과 `copy_out()`은 페이지 경계에서 복사 크기를 끊고 다음 페이지를 다시 확인한다. 파일 이름이나 명령 문자열은 `copy_in_string()`이 종료 문자를 찾아 Kernel Page에 복사한다. 이 함수는 한 페이지 안에 끝나는 문자열을 요구하므로, 4KiB 페이지에서는 종료 문자 이전 최대 길이가 4,095바이트다. 이 제한은 모든 OS의 문자열 길이 제한이 아니라 해당 구현의 선택이다.

파일 연산에는 `filesys_lock`이 사용되지만 시스템 콜 전체를 하나의 Lock으로 감싼 구조는 아니다. 현재 `write()`는 사용자 데이터를 Kernel Buffer로 복사한 뒤 파일 쓰기 구간에 Lock을 건다. `read()`는 파일에서 Kernel Buffer로 읽는 구간의 Lock을 푼 다음 사용자 버퍼에 복사한다. 표준 입력 fd 0과 표준 출력 fd 1에도 별도 경로가 있다. 따라서 사용자 페이지 확보와 장치 대기를 모두 전역 Lock 안에서 처리한다고 설명하면 실제 순서와 달라진다.

각 호출의 오류 처리도 확인할 필요가 있다. 현재 `read()`와 `write()`는 크기가 0이면 0을 반환하고, 유효하지 않은 파일 fd와 메모리 할당 실패 등은 각 경로의 실패값으로 처리한다. 이미 일부 바이트를 처리한 뒤 다음 조각에서 실패하면 일부 처리량을 반환할 수 있다. 사용자 주소 자체를 검증하지 못한 경로는 `exit(-1)`로 이어진다. [버퍼 검사·복사·파일 I/O 구현](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/userprog/syscall.c)

## 돌아오는 호출과 실행을 바꾸는 호출

`fork()`는 사용자에게 받은 Thread 이름을 Kernel Buffer로 복사하고, 저장된 Frame을 `process_fork()`에 전달한다. 자식의 실행 문맥을 준비하는 과정은 [커널과 사용자 영역](/wiki/computer-systems-network-topic-41565131cfca/)의 Frame 복사와 연결된다.

`exec()`는 문자열을 복사한 뒤 `process_exec()`를 호출한다. 적재에 성공하면 새 사용자 프로그램으로 넘어가므로 기존 `exec()` 호출 지점으로 돌아오지 않는다. 현재 Wrapper는 실패했을 때도 -1을 사용자에게 반환하는 대신 `exit(-1)`을 호출한다. `exit()` 역시 프로세스 종료 경로로 들어간다. 이 차이를 빼고 모든 분기의 끝을 “RAX 저장 후 사용자 복귀”로 그리면 실제 동작을 놓친다.

## Dispatch 방식은 구현과 버전으로 확인한다

번호와 구현 함수를 연결할 때는 함수 포인터 배열이나 `switch` 등을 사용할 수 있다. 그러나 배열이 소스에 존재한다는 사실만으로 현재 진입 경로가 그 배열을 호출한다고 결론 낼 수는 없다.

Linux v6.12의 x86-64 경로는 `do_syscall_64()`에서 `x64_sys_call()`로 이어지고, 후자는 생성된 `case`를 넣은 `switch`를 사용한다. 같은 파일의 `sys_call_table[]`은 Trace용 주소 조회에 남아 있다. 번호 자료도 `asm-offsets.h`의 구조체 Offset과 구분해야 한다. [x86-64 진입 처리](https://github.com/torvalds/linux/blob/v6.12/arch/x86/entry/common.c), [v6.12 Dispatch](https://github.com/torvalds/linux/blob/v6.12/arch/x86/entry/syscall_64.c)

ABI의 번호는 OS와 아키텍처별로 다르다. Linux x86-64의 write 번호 1을 PintOS에 그대로 적용할 수 없다. QEMU의 system emulation은 Guest 커널 대신 그 번호 체계를 정하지 않으며, Host 서비스를 호출하는 user emulation의 syscall 변환과도 구별된다.

## Handler에서 관찰할 값

Debug Symbol이 일치하는 Guest에 연결한 상태라면 C Handler의 첫 명령에서 Frame 포인터를 보관해 읽을 수 있다.

```gdb
tbreak *syscall_handler
continue
set $call = (struct intr_frame *)$rdi
p/d $call->R.rax
p/x $call->R.rdi
p/x $call->R.rsi
p/x $call->R.rdx
p/x $call->R.r10
p/x $call->R.r8
p/x $call->rsp
```

먼저 번호를 확인한 뒤 그 호출에서 의미가 있는 인자만 해석한다. 반환값 대입문을 지난 위치에서는 같은 Frame의 RAX를 다시 읽는다. `exec()`나 `exit()`처럼 복귀하지 않는 호출에 무조건 `finish`를 적용하지 않는다. `validate_user_buffer`, `copy_in_string`, `filesys_lock`의 획득·해제 위치도 함께 살피면 주소 검증과 파일 연산의 순서를 확인할 수 있다.
