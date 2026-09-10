---
layout: default
title: CPU
nav_order: 4
permalink: /wiki/computer-systems-network-cpu-4b05d739f0f6/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-cpu-4b05d739f0f6
projection_sha256: ade1076bb2b71e12ffe23ac6558576dee58cbb7fa2907db6899b506f47b4b9cc
parent: 컴퓨터 구조
content_status: ready
public_parent_id: Wiki/computer-systems-network/computer-architecture
search_terms:
- Register
- RAX
- EAX
- RFLAGS
- EFLAGS
- CF
- OF
- IF
- syscall 인자
grand_parent: Systems
ancestor: CS 기초
---

# CPU
{: .no_toc }

`write(1, "hello", 5)`를 호출한 프로그램이 커널 입구에서 멈췄다고 하자. 화면에는 RAX, RDI, RSI, RDX 같은 Register 이름과 숫자가 보인다. 이 숫자는 출력할 문자열 자체일 수도 있고, 그 문자열이 놓인 주소일 수도 있다. 무엇을 담았는지는 명령어와 호출 규약을 함께 읽어야 알 수 있다.

CPU는 명령어를 실행하면서 계산에 쓸 값, 다음 명령의 위치, 메모리에 접근할 조건을 바꾼다. 여기서는 PintOS의 x86-64 실행을 따라 그 상태를 읽는다. CPU의 내부 회로와 소프트웨어가 관찰하는 상태를 같은 것으로 간주하지는 않는다. Register Renaming이나 Pipeline처럼 실제 실행을 구성하는 방식이 달라도 프로그램에는 해당 아키텍처가 정한 결과가 보여야 한다. 명령어 Byte를 해석하는 과정은 [명령어](/wiki/computer-systems-network-topic-4a1a79029429/)에서 이어진다.

## 같은 Register의 다른 크기

RAX는 x86-64에서 64 Bit 값을 담는 범용 Register다. EAX는 그중 아래 32 Bit, AX는 아래 16 Bit, AL은 아래 8 Bit를 가리킨다. 이름만 보고 네 개의 독립된 저장소라고 생각하면 한 값을 바꾼 뒤 다른 이름으로 읽은 결과를 설명하기 어렵다.

64 Bit 모드에서 EAX에 값을 쓰면 RAX의 위쪽 32 Bit가 0이 된다. 반면 AX나 AL에 쓰는 일반적인 정수 명령은 나머지 Bit를 보존한다. 그래서 RAX가 `0x123456789abcdeff`일 때 AL에 1을 쓰면 `0x123456789abcde01`이 되고, EAX에 1을 쓰면 전체 RAX가 1이 된다. AH처럼 다른 부분을 가리키는 이름과 개별 명령의 예외까지 이 규칙 하나로 확장하지 않는다.

범용 Register의 용도도 이름에 고정되어 있지 않다. RAX는 산술 계산에 사용할 수 있고 함수 반환값이나 syscall 번호도 담는다. RSP는 현재 Stack 위치, RIP는 실행 위치를 나타낸다. RBP를 반드시 모든 함수의 Frame 기준으로 쓴다고 가정해서는 안 된다. Compiler가 Frame Pointer를 생략한 빌드에서는 Debug 정보와 Unwind 정보를 함께 읽어야 한다.

함수 호출의 보존 약속도 실행 문맥 전체를 저장하는 규칙과 구별한다. System V x86-64 ABI의 RBX·RBP·R12–R15는 호출받은 함수가 보존하는 Callee-saved Register다. 호출 중 값을 자유롭게 바꿀 수 있는 Register와 달리 함수가 반환했을 때 호출자가 기대한 값을 돌려놓아야 한다. 이것만으로 Interrupt, Thread 전환, 주소 공간과 부동소수점 상태의 보존 범위까지 결정되는 것은 아니다.

## write에 전달되는 네 값

현재 PintOS의 사용자 `write()`는 `syscall3(SYS_WRITE, fd, buffer, size)`를 호출한다. `SYS_WRITE`는 10이다. `syscall3`의 3은 syscall 번호가 아니라 전달할 인자의 개수를 뜻한다. [사용자 wrapper](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/lib/user/syscall.c)

문자열이 사용자 주소 `0x8048123`에 있다고 가정하면 `SYSCALL` 직전에 다음 값을 구별할 수 있다. 주소는 설명용이며 실제 프로그램에서 측정한 위치가 아니다.

| Register | 값 | 이번 호출의 의미 |
|---|---:|---|
| RAX | 10 | `SYS_WRITE` 번호 |
| RDI | 1 | 파일 Descriptor |
| RSI | `0x8048123` | 문자열의 첫 Byte 주소 |
| RDX | 5 | 요청한 Byte 수 |

RSI에는 `hello`의 다섯 글자가 한꺼번에 들어 있지 않다. 커널이 RSI를 주소로 해석하고 RDX만큼 읽는다. 따라서 인자 값이 올바른 것과 그 메모리에 접근할 수 있는 것은 별도의 조건이다. [Pointer](/wiki/programming-languages-runtime-topic-ef71fd296666/)와 [Paging](/wiki/computer-systems-network-topic-dbd836d1a044/)에서 주소와 접근 조건을 이어서 볼 수 있다.

이 PintOS의 syscall 인자는 RDI·RSI·RDX·R10·R8·R9 순으로 전달된다. 일반 C 함수 호출의 네 번째 인자에 사용하는 RCX와 다르다. `SYSCALL`이 RCX에 복귀 RIP를, R11에 Flag를 저장하기 때문이다. CPU는 `SYS_WRITE`라는 이름이나 fd 1의 뜻을 해석하지 않는다. 진입점을 고르는 MSR 설정과 PintOS의 handler가 요청을 나누는 과정은 [QEMU](/wiki/computer-systems-network-qemu-b1366076be02/)의 syscall 설명에 연결되어 있다. 다른 OS의 wrapper와 ABI에 이 번호나 인자 배치를 그대로 적용하지 않는다.

## 계산이 남기는 Flag

8 Bit에서 `0xff + 1`은 0이 된다. 저장할 수 있는 범위를 넘어간 Bit는 결과에 들어가지 않지만, Carry Flag인 CF에는 그 사실을 남길 수 있다. 같은 크기에서 `0x7f + 1`은 `0x80`이다. 부호 있는 정수로 읽으면 127 다음에 음수 범위로 넘어갔으므로 Overflow Flag인 OF가 켜진다. CF와 OF가 서로 다른 질문에 답하는 이유다.

RFLAGS는 64 Bit Register이고 EFLAGS는 아래 32 Bit 부분을 가리킨다. 어떤 명령이 어느 Flag를 변경하는지는 명령별로 다르다. 특히 값을 옮기는 MOV가 아래 산술 Flag를 모두 새로 계산한다고 생각해서는 안 된다.

| Flag | 이 값으로 확인하는 것 |
|---|---|
| CF | 부호 없는 덧셈의 Carry 또는 뺄셈의 Borrow |
| ZF | 연산 결과가 0인지 |
| SF | 결과의 최상위 Bit; 부호 있는 값으로 해석할 때 Sign |
| OF | 부호 있는 연산 결과가 표현 범위를 벗어났는지 |
| PF | 결과의 아래 8 Bit에 1이 짝수 개 있는지 |
| AF | 아래쪽 4 Bit 경계를 넘는 Carry 또는 Borrow |
| IF | Mask 가능한 외부 Interrupt의 허용 상태 |
| DF | MOVS·STOS 등 String 명령이 주소를 증가시킬지 감소시킬지 |
| TF | 명령 단위 Debug 예외에 관여하는 상태 |

SF만 보고 모든 값이 음수라고 결론 내리지 않는다. 같은 Bit를 unsigned 값으로 읽으면 해석이 달라진다. 또한 IF가 0이라고 Page Fault나 NMI까지 차단되는 것은 아니다. TF에 따른 Debug 예외에는 명령과 이벤트별 조건이 있으므로, GDB의 한 번의 `stepi`와 언제나 동일한 구현이라고 설명할 수도 없다. Flag의 정식 정의는 [Intel SDM의 Basic Architecture](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)에서 Register와 명령별 규칙을 함께 확인한다.

## 초기 Flag와 커널 진입

PintOS의 `process_exec()`는 새 실행 문맥의 `eflags`에 `FLAG_IF | FLAG_MBS`, 즉 `0x202`를 넣는다. Bit 9의 IF와 항상 1로 두는 Bit 1을 켠 값이다. `intr_get_level()`은 현재 Flag에서 IF를 읽고, `intr_disable()`과 `intr_enable()`은 CLI·STI를 사용한다. 이 값은 새 사용자 실행의 초기 설정이며 실행 중의 Flag가 계속 `0x202`라는 뜻은 아니다. [프로세스 시작](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/userprog/process.c), [Interrupt 제어](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/interrupt.c)

`syscall_init()`은 `MSR_SYSCALL_MASK`에 IF·TF·DF·IOPL·AC·NT를 지정한다. 합계는 `0x47700`이다. 이 Mask는 `SYSCALL` 진입 시 현재 Flag의 해당 Bit를 지우도록 설정한다. 이후 Assembly가 Kernel Stack으로 옮기고 인자를 저장한다. 어떤 Flag가 사용자 복귀에 복원되는지는 저장된 Frame과 실제 `SYSRET`·`IRET` 경로를 따라 읽어야 한다. [syscall 설정](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/userprog/syscall.c)

IOPL은 I/O 권한 판단에 사용하는 두 Bit다. Port I/O에는 TSS의 I/O Permission Bitmap도 관여할 수 있으므로 `CPL > IOPL`이면 모든 OS에서 항상 같은 결과라고 줄이지 않는다. AC 역시 Alignment Check의 조건뿐 아니라 SMAP을 사용하는 환경의 접근 규칙과 함께 읽어야 한다. NT와 가상 Interrupt 관련 Flag까지 한꺼번에 익히기보다, 지금 실행하는 명령이 참조하는 Flag와 제어 설정부터 확인하는 편이 정확하다.

## 값의 크기와 Flag를 함께 바꿔 보기

다음 Python 코드는 부분 Register 쓰기, 8 Bit 덧셈의 일부 Flag, PintOS의 초기 Flag Mask를 계산한다. 실제 CPU 명령이나 권한 전환을 실행하는 Emulator는 아니다. `write_low()`의 32 Bit 분기와 `add_flags()`의 CF·OF가 서로 다른 조건을 검사하는 부분을 먼저 비교해 보자.

```run-python
def write_low(rax, value, bits):
    if bits not in (8, 16, 32, 64):
        raise ValueError('지원하는 크기는 8, 16, 32, 64 Bit다.')
    mask = (1 << bits) - 1
    low = value & mask
    return low if bits >= 32 else (rax & ~mask) | low


def add_flags(a, b, bits=8):
    mask = (1 << bits) - 1
    if not (0 <= a <= mask and 0 <= b <= mask):
        raise ValueError('입력은 지정한 크기 안의 정수여야 한다.')
    result = (a + b) & mask
    sign = 1 << (bits - 1)
    flags = dict(CF=int(a + b > mask), ZF=int(result == 0),
                 SF=int(bool(result & sign)),
                 OF=int(bool((~(a ^ b) & (a ^ result)) & sign)),
                 PF=int(bin(result & 0xff).count('1') % 2 == 0))
    return result, flags


initial = 0x123456789abcdeff
for bits in (8, 16, 32, 64):
    print(f'{bits:2}-bit write 1: RAX=0x{write_low(initial, 1, bits):016x}')
for a, b in ((0xff, 1), (0x7f, 1), (1, 1)):
    result, flags = add_flags(a, b)
    values = ' '.join(f'{name}={value}' for name, value in flags.items())
    print(f'8-bit {a:02x}+{b:02x}={result:02x}: {values}')

initial_flags = (1 << 9) | (1 << 1)
syscall_mask = (1 << 9) | (1 << 8) | (1 << 10) | (3 << 12) | (1 << 18) | (1 << 14)
print(f'초기 RFLAGS=0x{initial_flags:x}, IF={(initial_flags >> 9) & 1}')
print(f'SYSCALL mask=0x{syscall_mask:x}, mask 적용=0x{initial_flags & ~syscall_mask:x}')
try:
    add_flags(256, 1)
except ValueError as error:
    print(f'범위 검사: {error}')
```

Python 3.9.6에서 실행해 확인한 결과다.

```text
 8-bit write 1: RAX=0x123456789abcde01
16-bit write 1: RAX=0x123456789abc0001
32-bit write 1: RAX=0x0000000000000001
64-bit write 1: RAX=0x0000000000000001
8-bit ff+01=00: CF=1 ZF=1 SF=0 OF=0 PF=1
8-bit 7f+01=80: CF=0 ZF=0 SF=1 OF=1 PF=0
8-bit 01+01=02: CF=0 ZF=0 SF=0 OF=0 PF=0
초기 RFLAGS=0x202, IF=1
SYSCALL mask=0x47700, mask 적용=0x2
범위 검사: 입력은 지정한 크기 안의 정수여야 한다.
```

`ff+01`에서는 CF와 ZF가 켜지고, `7f+01`에서는 OF와 SF가 켜진다. 마지막 Mask 계산은 시작값을 `0x202`로 고정했기 때문에 `0x2`가 남는다. 다른 Flag가 함께 켜진 입력이라면 Mask에 포함되지 않은 Bit는 남는다. `initial_flags`를 바꿔 이 차이를 확인할 수 있다.

## 멈춘 CPU와 저장된 Frame

`syscall_handler(struct intr_frame *f)` 안에서는 현재 RAX와 `f->R.rax`가 다를 수 있다. 앞의 값은 handler를 실행하다 멈춘 CPU 상태이고, 뒤의 값은 Assembly가 메모리에 저장한 syscall 번호다. Handler가 `f->R.rax`에 반환값을 쓰면 같은 필드는 이제 복귀할 값을 담는다. 저장된 Frame도 생성 이후 언제 읽었는지 확인해야 한다.

RIP·RSP·Flag와 일부 GPR을 복원한다고 CPU의 모든 상태를 복원한 것은 아니다. 주소 공간을 고르는 CR3, FPU·SIMD, Debug Register 같은 상태는 별도 경로를 가진다. [커널과 사용자 영역](/wiki/computer-systems-network-topic-41565131cfca/)에서 `intr_frame`의 192 Byte 배치와 복원 코드를 읽고, [Debugger](/wiki/platform-delivery-operations-topic-f89d71c7eb29/)에서 현재 Frame과 저장된 Frame을 같은 중단점에서 비교한다. 다음에 Register 값이 이상해 보이면 먼저 값의 크기, 호출 규약, 관찰 시점을 각각 확인한다.
