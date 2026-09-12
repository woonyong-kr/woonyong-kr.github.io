---
layout: default
title: 커널과 사용자 영역
nav_order: 5
permalink: /wiki/computer-systems-network-topic-41565131cfca/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-41565131cfca
projection_sha256: a4d536cef3ab4ba335681351187e970505ab5fce9cd5547a16951337fc630d08
parent: 커널 구조
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-5cd3e3706e06
search_terms:
- intr_frame
- CPL
- RPL
- SS:RSP
- sysretq
- thread_launch
- intr_entry
- Interrupt Frame
- 저장된 Register
grand_parent: PintOS
ancestor: CS 기초
---

# 커널과 사용자 영역
{: .no_toc }

사용자 프로그램이 커널 함수를 호출한다고 해서 그 프로그램에 커널 권한을 넘겨주는 것은 아니다. CPU는 현재 권한 수준에 맞는 명령과 메모리 접근만 허용하고, 커널은 정해진 진입 경로에서 요청을 처리한 뒤 사용자 실행 상태를 복원한다. 이 경계를 이해하려면 실행 주소뿐 아니라 CS, RFLAGS, Stack과 Page Table을 함께 봐야 한다.

여기서는 [lrn-pintos의 x86-64 구현](https://github.com/woonyong-kr/lrn-pintos/tree/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos)을 기준으로 새 프로그램의 시작, Thread 전환, 인터럽트 복귀와 시스템 콜 복귀를 구분한다. 주소 공간을 준비하는 과정은 [실행 파일 적재](/wiki/computer-systems-network-topic-a6a32eb78db0/), `argc`와 `argv` 배치는 [인자 전달](/wiki/computer-systems-network-topic-1217820258bd/)에서 이어진다.

## 실행 주소와 실행 권한

RIP는 실행할 명령어의 주소이고, CPL은 현재 실행 권한 수준이다. PintOS는 커널에서 CPL 0, 사용자 프로그램에서 CPL 3을 사용한다. 사용자 주소로 RIP를 바꾸는 것만으로 CPL이 바뀌지는 않는다. 반대로 사용자 코드로 복귀할 CS를 골랐더라도 해당 주소의 Page Table Mapping과 접근 권한이 맞아야 명령어를 가져올 수 있다.

Segment Selector에는 GDT 또는 LDT의 항목 위치와 요청 권한 수준인 RPL이 들어 있다. PintOS의 상수는 다음과 같다. Selector 자체가 코드나 Stack의 주소인 것은 아니다. [Selector 정의](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/threads/loader.h)

| 용도 | Selector | Table index | TI | RPL |
|---|---:|---:|---:|---:|
| Kernel Code | `0x08` | 1 | 0, GDT | 0 |
| Kernel Data | `0x10` | 2 | 0, GDT | 0 |
| User Data·Stack | `0x1b` | 3 | 0, GDT | 3 |
| User Code | `0x23` | 4 | 0, GDT | 3 |

다음 예제에서 Selector 값을 바꾸면 Table 위치와 RPL이 어떻게 나뉘는지 볼 수 있다. 비트를 해석하는 예제이므로 해당 GDT Descriptor가 실제로 존재하거나 권한 검사를 통과한다는 뜻은 아니다.

```run-python
selectors = {'kernel code': 0x08, 'kernel data': 0x10,
             'user data': 0x1B, 'user code': 0x23}
for name, selector in selectors.items():
    index = selector >> 3
    table = 'LDT' if selector & 4 else 'GDT'
    rpl = selector & 3
    print(f'{name:11}  0x{selector:02x}  {table}[{index}]  RPL={rpl}')

flags = (1 << 9) | (1 << 1)
assert flags == 0x202
print(f'새 사용자 문맥의 RFLAGS: 0x{flags:x}')
```

`process_exec()`는 `FLAG_IF | FLAG_MBS`, 즉 `0x202`를 저장한다. IF는 Maskable Interrupt 허용 비트이고 MBS는 항상 1로 유지하는 bit 1이다. 인터럽트를 허용한다는 사실과 사용자 코드에 특권 명령을 허용한다는 사실은 다르다.

## intr_frame에 담긴 실행 상태

`struct intr_frame`은 복귀에 필요한 레지스터를 메모리에 담는다. CPU가 자동으로 저장하는 부분과 Assembly가 저장하는 부분이 합쳐져 같은 배치를 이룬다. 새 프로그램이나 새 Thread를 시작할 때는 커널이 그 배치에 맞춰 값을 직접 준비할 수도 있다. [구조체 정의](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/threads/interrupt.h)

| 시작 offset | 크기 | 필드 | 복원 방법 |
|---|---:|---|---|
| `0x00` | 120 B | `R.r15`부터 `R.rax`까지 15개 GPR | `movq`로 각각 복원 |
| `0x78` | 8 B | `es`와 padding | 아래 2바이트를 ES에 적재 |
| `0x80` | 8 B | `ds`와 padding | 아래 2바이트를 DS에 적재 |
| `0x88` | 8 B | `vec_no` | 건너뜀 |
| `0x90` | 8 B | `error_code` | 건너뜀 |
| `0x98` | 8 B | `rip` | `iretq`의 첫 항목 |
| `0xa0` | 8 B | `cs`와 padding | `iretq`가 Code Selector 확인 |
| `0xa8` | 8 B | `eflags` | `iretq`가 허용된 Flag 복원 |
| `0xb0` | 8 B | `rsp` | `iretq`가 복귀 Stack Pointer 복원 |
| `0xb8` | 8 B | `ss`와 padding | `iretq`가 Stack Selector 복원 |

전체 크기는 192바이트다. `rip`의 offset은 152바이트, 즉 `0x98`이다. `0xa0`을 RIP의 위치로 읽으면 실제로는 CS slot을 읽게 된다. 또한 `cs`, `ss`, `ds`, `es`는 16비트 필드이지만 각각 padding을 포함한 8바이트 slot을 차지한다. 구조체 크기를 필드 이름의 개수로 계산하면 이 부분을 놓치기 쉽다.

`vec_no`는 Assembly Stub이 넣은 인터럽트 번호다. `error_code`는 예외에 따라 CPU가 넣거나 Stub이 0으로 채운다. 이 둘은 핸들러가 원인을 판단하는 정보이므로 복귀할 CPU 레지스터에 다시 적재하지 않는다. 일반 시스템 콜의 진입 코드는 이 영역을 건너뛸 공간만 확보한다. 프레임의 모든 slot이 모든 진입 경로에서 유효한 값으로 채워진다고 가정하지 않는다.

`intr_frame`은 CPU 전체 상태를 담는 구조체가 아니다. 이 배치에는 CR3, FPU·SIMD Register와 모든 MSR이 들어 있지 않다. 주소 공간은 `process_activate()`와 페이지 테이블 활성화 경로에서 따로 관리한다. Linux의 `pt_regs`와도 저장 목적을 비교할 수 있지만 같은 크기·필드 배치나 전체 Context라고 간주하지 않는다. [현재 PintOS의 구조체와 활성화 경로](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/userprog/process.c)

저장된 값은 Frame의 생성 시점과 수정 시점을 함께 읽는다. `syscall_handler()` 안의 현재 RAX와 `f->R.rax`는 서로 다를 수 있고, Handler가 반환값을 쓰면 저장된 RAX의 의미도 syscall 번호에서 복귀 값으로 달라진다. 타이머 Interrupt의 Frame도 항상 User 상태인 것은 아니다. 현재 구현의 Code Selector를 해석해 중단된 실행이 User인지 Kernel인지 확인하며, 64 Bit Interrupt 진입에서는 같은 CPL이어도 SS와 RSP가 저장된다. [현재 Interrupt Stub](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/intr-stubs.S), [QEMU v10.0.0의 64 Bit Interrupt 구현](https://github.com/qemu/qemu/blob/v10.0.0/target/i386/tcg/seg_helper.c)

현재 CPU와 저장된 Frame을 같은 중단점에서 비교하는 순서는 [Debugger](/wiki/platform-delivery-operations-topic-f89d71c7eb29/)에서 이어서 확인한다.

## do_iret가 복원하는 순서

`do_iret(tf)`는 먼저 현재 RSP를 프레임 시작 주소로 바꾼다. 이어 15개 GPR을 복원하고 ES와 DS를 적재한 뒤, RSP를 `tf->rip`까지 옮겨 `iretq`를 실행한다. 아래 Assembly는 실제 함수에서 중간 GPR 복원만 생략한 설명용 발췌다. 일반 사용자 프로그램이나 브라우저에서 실행할 수 있는 코드는 아니다. [do_iret와 thread_launch](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/thread.c)

```asm
movq tf_address, %rsp     # 설명용: 실제 inline assembly의 입력 operand
movq 0(%rsp), %r15
# ... r14부터 rbx까지 복원 ...
movq 112(%rsp), %rax
addq $120, %rsp
movw 8(%rsp), %ds
movw (%rsp), %es
addq $32, %rsp            # ES, DS, vec_no, error_code 영역 통과
iretq                    # 현재 RSP는 tf->rip을 가리킨다
```

첫 `movq` 이후에는 이 함수가 원래 사용하던 호출 Stack을 그대로 쓸 수 없다. 그렇다고 Kernel Stack 메모리를 해제한 것은 아니다. RSP가 복원용 프레임을 가리키도록 바뀐 것이며, 곧 프레임 안의 새 RSP를 복원한다. 이 중간에 C 함수 호출이나 임의의 `push`를 끼워 넣으면 프레임을 훼손할 수 있다.

**64비트 모드의 `iretq`는 CPL이 같아도 RIP, CS, RFLAGS, RSP, SS의 5개 slot을 사용한다.** 따라서 커널 Thread 사이의 전환에서도 저장된 SS:RSP로 돌아간다. 같은 CPL이면 앞의 3개 slot만 사용한다는 설명은 여기의 64비트 복귀 규칙과 맞지 않는다. Compatibility Mode의 규칙과 구분해야 한다. [Intel SDM Volume 3A, 6.14.3–6.14.4](https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-software-developer-vol-3a-part-1-manual.pdf)

`iretq` 자체가 RDI, RSI, RAX까지 복원하는 것은 아니다. 그 레지스터들은 앞의 `movq`에서 복원된다. 최초 프로그램의 `argc`·`argv`와 fork 자식의 반환값도 이 구분을 따라 전달된다.

다음 코드는 192바이트 프레임을 구성하고 복원에 사용되는 값을 읽는다. 주소는 배치를 설명하기 위한 값이다. CPU Emulator가 아니므로 GDT 검사, 예외, Flag masking이나 실제 권한 전환은 실행하지 않는다.

```run-python
import struct

gpr_names = ('r15', 'r14', 'r13', 'r12', 'r11', 'r10', 'r9', 'r8',
             'rsi', 'rdi', 'rbp', 'rdx', 'rcx', 'rbx', 'rax')
offsets = {name: 8 * i for i, name in enumerate(gpr_names)}
offsets.update(es=120, ds=128, vec_no=136, error_code=144,
               rip=152, cs=160, rflags=168, rsp=176, ss=184)

def make_frame(cs, ss, rip, rsp):
    frame = bytearray(192)
    for index, name in enumerate(gpr_names):
        struct.pack_into('<Q', frame, offsets[name], index + 1)
    for name, value in {'rip': rip, 'rflags': 0x202, 'rsp': rsp}.items():
        struct.pack_into('<Q', frame, offsets[name], value)
    for name, value in {'cs': cs, 'ss': ss, 'ds': ss, 'es': ss}.items():
        struct.pack_into('<H', frame, offsets[name], value)
    return frame

for label, cs, ss, rip, rsp in (
    ('커널 복귀', 0x08, 0x10, 0x8004001234, 0x8004010F00),
    ('사용자 진입', 0x23, 0x1B, 0x400120, 0x4747FFA0),
):
    frame = make_frame(cs, ss, rip, rsp)
    gprs = {name: struct.unpack_from('<Q', frame, offset)[0]
            for name, offset in offsets.items() if name in gpr_names}
    cursor = 120 + 32
    restored = struct.unpack_from('<5Q', frame, cursor)
    next_rip, cs_slot, flags, next_rsp, ss_slot = restored
    assert len(frame) == cursor + 40 == 192
    assert next_rsp == rsp
    assert next_rip == rip
    assert gprs['rax'] == 15
    assert struct.unpack_from('<H', frame, 0xA0)[0] == cs
    print(f'{label}: CPL={cs_slot & 3}, RIP=0x{next_rip:x}, RSP=0x{next_rsp:x}')
    print(f'  GPR 120 B + 중간 영역 32 B + iretq 영역 40 B = {len(frame)} B')
    print(f'  CS=0x{cs_slot:x}, SS=0x{ss_slot:x}, RFLAGS=0x{flags:x}')
```

두 경우 모두 프레임 끝까지 40바이트를 읽고, 결과의 RSP는 입력에 저장한 `rsp` 값이 된다. 현재 프레임에서 24바이트를 소비한 주소를 복귀 RSP로 삼는 모델과 결과를 비교해 보면 같은 CPL의 복귀에서도 Stack 전환이 필요한 이유가 드러난다.

## 같은 복원 코드가 서로 다른 실행을 시작한다

복원할 프레임을 어디에서 준비했는지에 따라 `do_iret()`의 의미가 달라진다.

| 준비하는 경로 | RIP | RSP | CS | 실행 결과 |
|---|---|---|---|---|
| 새 Kernel Thread | `kernel_thread` | 새 Thread의 Kernel Stack | `0x08` | 등록한 함수와 aux로 실행 시작 |
| 이미 실행한 Thread의 `thread_launch()` | `out_iret` | 이전에 저장한 Kernel Stack 위치 | `0x08` | 중단된 커널 실행 재개 |
| `process_exec()` | ELF의 `e_entry` | 인자 배치를 끝낸 User Stack | `0x23` | 새 사용자 프로그램 시작 |
| `__do_fork()` | 부모의 시스템 콜 다음 명령 | 복제한 사용자 문맥의 RSP | 부모의 User CS | 자식에서 fork가 0을 반환한 흐름 재개 |

`thread_launch()`는 현재 실행 상태를 `running_thread()->tf`에 **저장**한다. `call __next`로 얻은 주소에 Label 간 거리를 더해 `out_iret`의 주소를 구하고, 현재 RSP와 SS도 프레임에 기록한다. 이후 다음 Thread의 프레임을 `do_iret()`에 전달한다. 다음에 원래 Thread가 선택되면 `out_iret`에서 이어진다. Thread를 처음 만들 때는 아직 재개할 위치가 없으므로 `thread_create()`가 `kernel_thread`를 RIP로 준비한다.

`process_exec()`는 새로운 지역 변수 `struct intr_frame _if`에 사용자 Segment와 Flag를 설정하고 `load()`에 전달한다. 적재 성공 뒤에는 `do_iret(&_if)`를 호출하고 원래 C 호출 위치로 돌아오지 않는다. 다음 코드는 전체 오류 처리와 주소 공간 준비를 생략해, 프레임에 넣는 값만 나타낸 것이다.

```c
struct intr_frame _if;
_if.ds = _if.es = _if.ss = SEL_UDSEG;
_if.cs = SEL_UCSEG;
_if.eflags = FLAG_IF | FLAG_MBS;

/* load() 성공 시 rip, rsp, R.rdi, R.rsi가 준비된다. */
do_iret(&_if);
```

이 선언은 프레임 전체를 0으로 초기화하지 않는다. 명시적으로 설정한 필드와 아직 값을 보장하지 않은 필드를 구분해야 한다. 특히 exec 진입 시 RAX가 0이라거나 모든 GPR이 초기화되었다고 예상해서는 안 된다. 이는 첫 인자를 RDI와 RSI에 전달하는 계약과 별개의 구현 점검 사항이다.

fork 자식은 부모의 프레임을 복사한 뒤 `if_.R.rax = 0`으로 바꾼다. 사용자 주소 공간과 필요한 자원 복제를 마치고 부모에게 준비 완료를 알린 다음 `do_iret(&if_)`로 들어간다. 같은 RSP 값이더라도 부모와 자식의 주소 공간이 서로 다를 수 있다는 점도 함께 봐야 한다. 자원 복제와 부모·자식 동기화는 [프로세스 생성](/wiki/computer-systems-network-topic-4af2e32913a4/)에서 다룬다. [exec와 fork 구현](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/userprog/process.c)

## 인터럽트와 시스템 콜은 복귀 경로가 다르다

현재 구현의 `intr_entry`는 핸들러를 호출한 뒤 자체 Assembly로 GPR과 Segment를 복원하고 `iretq`를 실행한다. `do_iret()`와 같은 프레임 배치를 쓰지만 C 함수 `do_iret()`를 호출하는 경로는 아니다. 인터럽트 번호와 예외별 error code를 준비하는 실제 Stub Macro도 함께 읽어야 한다. 파일의 오래된 32비트 주석에 등장하는 EBP 저장 설명을 현재 Macro의 동작으로 옮기지 않는다. [인터럽트 진입·복귀 Assembly](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/intr-stubs.S)

일반 시스템 콜은 `syscall_entry`가 처리한다. 사용자 RSP를 보관하고 TSS의 `rsp0` 값을 읽어 Kernel Stack으로 옮긴 뒤 프레임을 만든다. 핸들러가 반환하면 저장된 RIP를 RCX에, Flag를 R11에, 사용자 Stack 위치를 RSP에 옮기고 `sysretq`를 실행한다. 따라서 PintOS가 모든 복귀에서 `iretq`만 사용한다고 설명하면 실제 구현과 어긋난다. [시스템 콜 진입·복귀 Assembly](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/userprog/syscall-entry.S)

| 경로 | 사용자 상태를 복원하는 방식 |
|---|---|
| 새 이미지와 fork 자식 | `do_iret()`의 `iretq` |
| 인터럽트·예외 핸들러가 정상 반환 | `intr_entry` 끝의 `iretq` |
| 일반 시스템 콜 핸들러가 정상 반환 | `syscall_entry` 끝의 `sysretq` |
| exit 또는 복귀하지 않는 exec | 원래 시스템 콜 반환 위치에 도달하지 않음 |

`sysretq`는 Stack에서 `iretq` 프레임을 읽는 명령이 아니다. Code·Stack Selector는 MSR 설정에 따르며, PintOS는 `syscall_init()`에서 `MSR_STAR`를 설정한다. RSP도 `sysretq` 앞의 Assembly가 직접 복원한다. [MSR 설정](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/userprog/syscall.c)

TSS의 `rsp0`는 사용자 모드로 나갈 때의 Stack Pointer가 아니다. `process_activate()`는 Page Table을 활성화하고 `tss_update()`로 다음 Thread의 Kernel Stack 위치를 기록한다. 사용자 모드에서 커널로 들어오는 인터럽트는 그 경로에서 TSS를 사용할 수 있고, 이 구현의 `syscall_entry`는 TSS를 소프트웨어로 읽는다. 반대 방향의 `iretq`는 자신에게 전달된 프레임의 `rsp`를 복원한다. [TSS 갱신](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/userprog/tss.c)

## TSS에는 다음 진입에 사용할 Stack을 기록한다

이 PintOS의 부팅 코드는 `tss_init()`, `gdt_init()`, `intr_init()` 순서로 실행한다. 첫 함수가 TSS용 Page를 할당하고 `rsp0`를 초기화한다. `gdt_init()`은 TSS의 주소를 GDT Descriptor에 기록하고 GDTR을 적재하며, `intr_init()`에서 `ltr(SEL_TSS)`로 TR에 TSS Selector를 적재한다. GDT를 적재하는 `lgdt`와 TSS를 선택하는 `ltr`는 서로 다른 명령이다. [부팅 순서](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/init.c#L105-L119), [GDT 설정](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/userprog/gdt.c), [TR 적재](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/interrupt.c#L228-L232)

`SEL_TSS=0x28`은 GDT index 5를 뜻한다. 64비트 TSS Descriptor는 16바이트이므로 GDT[5]와 GDT[6] 두 칸을 사용한다. Descriptor에 넣은 TSS Base는 구조체의 선형 주소이며, 그 주소를 실제 메모리로 번역하는 일은 Paging 경로를 거친다. TR은 Selector와 함께 Descriptor에서 얻은 Base·Limit·속성을 보관한다. TSS의 내용 전체를 TR 안에 복사하는 것은 아니다.

GDB에서 이 등록을 확인하려면 GDT[5]와 GDT[6]을 각각 64비트 값으로 읽는다. 첫 값의 bit 16–39는 Base의 하위 24비트, bit 56–63은 그다음 8비트다. 두 번째 값의 하위 32비트가 Base의 상위 32비트다. 이 세 부분을 이어 붙인 주소를 `tss` 포인터와 비교한다. 그 주소에서 `rsp0`·`rsp1`·`rsp2`와 IST 필드를 읽으면 Descriptor에 등록한 위치와 TSS에 기록한 Stack 값을 구분해 관찰할 수 있다.

`struct task_state`는 `packed`로 선언돼 있다. 앞의 4바이트 다음에 `rsp0`가 오며, IST1은 `0x24`, IST7은 `0x54`에서 시작한다. `rsp0`와 IST1 사이에는 `rsp1`·`rsp2`와 예약 영역이 있다. 마지막 `iomb`는 I/O Permission Bitmap의 시작 위치를 표현하는 필드다. 이 구현은 TSS용 Page를 0으로 초기화하고 `rsp0`를 설정한다. [TSS 선언](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/include/userprog/tss.h), [초기화와 갱신](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/userprog/tss.c)

IST(Interrupt Stack Table)는 NMI·Double Fault·Machine Check처럼 현재 Stack 상태를 가정하기 어려운 상황에 별도 Stack을 선택하는 데 쓰인다. IDT Gate의 IST가 0이 아니면 CPL이 같아도 해당 TSS 항목의 Stack으로 전환한다. 이 PintOS는 TSS를 0으로 초기화하고 `make_gate`의 IST도 0으로 설정하므로 IST Stack을 사용하지 않는다. User에서 Ring 0으로 들어오는 IDT 경로에서는 `rsp0`를 사용한다. [IST의 용도](https://docs.kernel.org/arch/x86/kernel-stacks.html), [PintOS의 Gate](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/interrupt.c#L78-L96)

### Page 끝과 현재 Stack 위치를 구분한다

`tss_update(next)`가 기록하는 값은 `(uint64_t)next + PGSIZE`다. 이 값은 Thread Page 바로 다음 주소인 Stack 꼭대기다. 아직 아무것도 쌓지 않아 RSP가 꼭대기에 있을 때 `RSP & ~0xfff`를 계산하면 다음 Page가 나온다. 프레임을 쌓은 뒤 Page 안에 들어온 RSP에 같은 계산을 적용하는 경우와 다르다.

이 4 KiB Page의 아래쪽에는 `struct thread`, 위쪽에는 아래로 자라는 Kernel Stack이 있다. `setup_stack()`이 `USER_STACK` 아래에 준비하는 User Stack은 별도의 Mapping이다. 사용자 Stack의 시작과 확장은 [실행 파일 적재](/wiki/computer-systems-network-topic-a6a32eb78db0/)와 [Page Fault](/wiki/computer-systems-network-topic-5cebdbc10ddf/)에서 이어서 확인한다.

아래 C 예제는 TSS와 같은 배치의 구조체를 만들고 주소를 계산한다. 일곱 IST 필드는 배열로 표현했다. 커널 메모리를 할당하거나 실제 TR·RSP를 바꾸는 프로그램은 아니며, 주소는 계산을 위한 값이다.

```run-c
#include <assert.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>

struct Tss {
    uint32_t reserved1;
    uint64_t rsp0, rsp1, rsp2, reserved2;
    uint64_t ist[7];
    uint64_t reserved3;
    uint16_t reserved4, iomb;
} __attribute__((packed));

int main(void) {
    _Static_assert(sizeof(struct Tss) == 104, "TSS size");
    _Static_assert(offsetof(struct Tss, rsp0) == 4, "RSP0 offset");
    _Static_assert(offsetof(struct Tss, ist) == 36, "IST1 offset");
    _Static_assert(offsetof(struct Tss, iomb) == 102, "I/O bitmap offset");

    const uint64_t thread = UINT64_C(0x8004200000);
    const uint64_t page_mask = ~UINT64_C(0xfff);
    struct Tss tss = {.rsp0 = thread + 4096};
    uint64_t frame = tss.rsp0 - 192;
    printf("TSS=%zu, rsp0=%zu, IST1=%zu, iomb=%zu\n",
           sizeof tss, offsetof(struct Tss, rsp0),
           offsetof(struct Tss, ist), offsetof(struct Tss, iomb));
    printf("thread=0x%llx, rsp0=0x%llx, frame=0x%llx\n",
           (unsigned long long)thread, (unsigned long long)tss.rsp0,
           (unsigned long long)frame);
    printf("page(top)=0x%llx, page(top-8)=0x%llx\n",
           (unsigned long long)(tss.rsp0 & page_mask),
           (unsigned long long)((tss.rsp0 - 8) & page_mask));
    assert((tss.rsp0 & page_mask) == thread + 4096);
    assert(((tss.rsp0 - 8) & page_mask) == thread);
    assert(frame == thread + 0xf40);
    return 0;
}
```

출력:

```text
TSS=104, rsp0=4, IST1=36, iomb=102
thread=0x8004200000, rsp0=0x8004201000, frame=0x8004200f40
page(top)=0x8004201000, page(top-8)=0x8004200000
```

전체 TSS 구조체는 104바이트이고 `rsp0`의 Offset은 4다. 같은 Thread Page에서 192바이트 프레임을 쌓으면 시작 위치는 Page 안의 `0xf40`이 된다. 실제 Stack에는 C 호출의 복귀 주소와 지역 변수도 들어가므로 이 값만으로 전체 사용량을 측정할 수는 없다.

Stack 사용량을 살필 때는 먼저 알고 있는 Thread 주소와 현재 RSP가 같은 Kernel Page에 있는지 확인한다. 그 조건에서 `top - RSP`는 꼭대기부터 사용한 바이트 수이고, `RSP - (thread 주소 + sizeof(struct thread))`는 Thread 구조체 위에 남은 공간이다. User Stack이나 IRQ의 별도 Stack에 멈춘 상태에는 이 계산을 그대로 적용하지 않는다.

RSP가 Thread 구조체 영역까지 내려오면 그 안의 상태를 훼손할 수 있다. 이 구현은 `magic`을 `THREAD_MAGIC`, 즉 `0xcd6abf4b`와 비교해 손상을 확인한다. 이 검사는 주소 접근 자체를 막는 Guard Page와 다르다. Linux의 `CONFIG_VMAP_STACK`은 지원하는 Architecture에서 Guard Page를 둔 Stack을 사용한다. [PintOS의 Magic 검사](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/thread.c#L20-L24), [Linux의 Stack과 Guard Page](https://docs.kernel.org/mm/vmalloced-kernel-stacks.html)

### TSS 갱신 전후를 비교할 때

`schedule()`은 실제 `thread_launch()` 전에 `process_activate(next)`를 호출한다. 이 함수는 다음 Page Table을 활성화한 뒤 TSS를 갱신한다. 따라서 전환 중간에는 아직 이전 Thread의 Stack에서 실행하면서 TSS는 다음 Thread를 가리킬 수 있다. 어느 명령에서 멈췄는지 확인하지 않고 두 값의 차이만으로 버그를 판단하면 정상적인 전환을 잘못 해석한다. [Scheduler의 순서](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/thread.c#L779-L809), [주소 공간과 TSS 활성화](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/userprog/process.c#L729-L733)

TSS를 갱신했다고 다음 Thread가 실행되는 것은 아니다. 실행 상태의 저장과 복원은 앞에서 살펴본 `thread_launch()`와 `do_iret()`가 맡는다. 이 PintOS의 전역 TSS 한 개를 쓰는 구성을 여러 CPU가 공유하는 설계로 그대로 확대해서는 안 된다. Linux는 CPU별 TSS와 진입 상태를 둔다.

GDB에서는 `tss_update`의 `next`와 대입 전 `tss->rsp0`를 기록하고, 대입을 지난 뒤 새 값을 비교한다. 시스템 콜 진입에서는 현재 빌드의 Stack 교체 명령을 찾아 그 전후 RSP를 읽는다. 고정된 `syscall_entry+18`이나 명령 세 개라는 가정을 쓰기보다 `disassemble /r syscall_entry`로 실제 순서를 확인한다. `__do_fork()`는 자식 Thread에서 실행하므로 그 위치의 현재 Thread를 부모라고 기록해서도 안 된다.

인터럽트가 어디서 왔는지는 Handler 안의 현재 CS가 아니라 저장된 Frame의 CS로 확인한다. Ring 0 Handler에 도착한 뒤의 현재 CS만 보고 User에서 온 IRQ를 분류할 수는 없다. 이 관찰 절차는 새 GDB 실행 기록이 아니며, TSS와 예상 Stack이 다를 때도 중단 위치·포인터 계산·메모리 손상을 함께 조사해야 한다.

### Linux와 QEMU가 TSS를 사용하는 위치

Linux v6.12의 일반 x86-64 경로는 PintOS처럼 모든 Thread 전환에서 TSS의 `sp0`를 해당 Thread Stack으로 바꾼다고 설명할 수 없다. `__switch_to()`는 `pcpu_hot.top_of_stack`을 갱신하며, `update_task_stack()`에서 `load_sp0()`를 호출하는 64비트 분기는 FRED가 꺼진 Xen PV 조건에 있다. 기존 진입 경로의 일정한 진입용 Stack과 Thread Stack을 구분해야 한다. [Thread별 Stack 위치 갱신](https://github.com/torvalds/linux/blob/v6.12/arch/x86/kernel/process_64.c), [sp0와 Xen PV 조건](https://github.com/torvalds/linux/blob/v6.12/arch/x86/include/asm/switch_to.h#L60-L70)

QEMU v10.0.0의 `helper_ltr()`는 Guest GDT의 TSS Descriptor를 읽어 `env->tr`에 Base·Limit·속성을 넣고 GDT 쪽에 Busy Bit를 기록한다. `get_rsp_from_tss()`는 이 Base에 Offset을 더해 Guest 메모리에서 Stack Pointer를 읽는다. 권한 전환이면 해당 CPL의 RSP를, IST가 지정됐으면 해당 IST 칸을 사용한다. Base를 Guest 물리 주소나 Host 포인터로 해석하지 않는다. [TR 적재와 TSS 읽기](https://github.com/qemu/qemu/blob/v10.0.0/target/i386/tcg/seg_helper.c)

이 TSS 접근은 Page Table의 주소 변환을 대신하지 않는다. 인터럽트의 Stack 선택과 저장 Frame은 [Interrupt](/wiki/computer-systems-network-topic-c19e34701c6c/#cpu와-assembly가-함께-만드는-frame)에서, SYSCALL 명령 뒤 PintOS가 직접 RSP를 바꾸는 과정은 [시스템 콜](/wiki/computer-systems-network-topic-3cc26725c1cb/#진입-주소에-도착해도-스택은-아직-사용자-것이다)에서 이어서 읽는다.

## 복귀 직전과 직후를 비교하기

GDB 절차는 디버그 심볼이 있는 PintOS Kernel과 QEMU에 연결한 환경에서 수행한다. 아래 명령은 관찰 방법이며 이 문서의 Python 실행 결과와 달리 실제 Kernel 실행 기록은 아니다.

```gdb
break *do_iret
continue
set $saved_tf = (struct intr_frame *)$rdi
p sizeof(struct intr_frame)
p/x $saved_tf->rip
p/x $saved_tf->cs
p/x $saved_tf->eflags
p/x $saved_tf->rsp
p/x $saved_tf->ss
p $saved_tf->R.rdi
p/x $saved_tf->R.rsi
p/x $saved_tf->R.rax
disassemble /r do_iret
```

함수의 첫 명령에 중단했다면 x86-64 C 호출 규약의 첫 인자는 RDI에 있다. `do_iret`는 Kernel Thread에도 쓰이므로 첫 중단이 곧 사용자 진입이라는 전제는 두지 않는다. 저장한 CS가 `0x23`인지 먼저 확인한다.

`disassemble /r` 출력에서 **현재 빌드의** `iretq` 위치를 찾아 그 주소에 임시 중단점을 두거나 `stepi`로 진행한다. `do_iret+87` 같은 고정 offset은 Compiler·옵션에 따라 달라질 수 있다. 아래 명령은 이미 `iretq` 직전에 중단한 상태에서 실행한다.

```gdb
x/i $rip
x/5gx $rsp
info registers rax rdi rsi
stepi
info registers rip cs eflags rsp ss
```

명령 직전의 `$rsp`는 복원할 User Stack이 아니라 Kernel 메모리의 RIP slot을 가리킨다. 그 위치에서 읽은 다섯 값과 명령 직후의 레지스터를 비교한다. CS·SS slot은 아래 16비트를 Selector로 읽으며 padding까지 Selector 값으로 해석하지 않는다. `stepi` 하나로 항상 `do_iret()` 전체를 지난다고 가정해서는 안 된다. 사용자 코드가 시작된 뒤에는 예외나 인터럽트가 바로 발생할 수도 있다.

복귀 실패도 발생 위치를 구분해 조사한다. 프레임 자체를 읽지 못했는지, Segment 검증이 실패했는지, 복귀 후 첫 명령어의 주소 변환에 실패했는지는 서로 다르다. CS의 RPL만 3으로 맞춘다고 충분하지 않으며 Descriptor의 종류·DPL·Present와 SS 관계도 맞아야 한다. 모든 실패를 `#GP(0)` 하나로 기록하지 않는다. [Intel IRET와 인터럽트 처리 규칙](https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-software-developer-vol-3a-part-1-manual.pdf)

## Linux와 QEMU에서 비교할 지점

Linux v6.12의 `start_thread_common()`은 `pt_regs`에 새 IP·SP·Segment·Flag를 넣는다. x86-64의 `pt_regs`는 21개의 8바이트 slot, 168바이트이며 CS와 SS 영역에는 Union이 사용된다. PintOS의 192바이트 구조체와 필드 순서가 같지 않다. 또한 이 버전은 FRED 경로를 포함하므로 모든 시스템의 사용자 진입을 무조건 `iretq` 한 경로로 그리지 않는다. [Linux 실행 문맥 초기화](https://github.com/torvalds/linux/blob/v6.12/arch/x86/kernel/process_64.c), [pt_regs](https://github.com/torvalds/linux/blob/v6.12/arch/x86/include/asm/ptrace.h)

전통적인 x86-64 시스템 콜 경로의 `do_syscall_64()`는 RCX와 IP, R11과 Flag의 일치, CS·SS, 사용자 IP 범위, RF·TF와 Xen PV 여부를 확인해 SYSRET 가능 여부를 반환한다. AC나 Signal 존재 여부만으로 두 경로를 나누는 흐름도는 이 구현의 최종 조건을 나타내지 못한다. `ptrace`를 사용했다는 사실만으로 결론 내리는 대신 복귀 직전의 저장 상태와 조건식을 확인한다. [Linux v6.12 반환 조건](https://github.com/torvalds/linux/blob/v6.12/arch/x86/entry/common.c)

`entry_64.S`는 이 결과에 따라 SYSRET 경로 또는 사용자 레지스터를 복원하는 경로로 이동한다. `ret_from_fork_asm`에도 기존 IRET 경로와 FRED 대체 경로가 구분돼 있다. NMI·IST나 Signal 처리까지 비교할 때는 해당 진입점과 Kernel 설정을 더 읽어야 한다. 두 복귀 명령의 비용도 CPU와 완화 옵션에 따라 달라지므로 측정 없이 고정 Cycle 차이나 성능 향상을 적지 않는다. [Linux x86-64 진입 Assembly](https://github.com/torvalds/linux/blob/v6.12/arch/x86/entry/entry_64.S)

QEMU v10.0.0의 TCG에서는 `gen_IRET()`가 실행 모드에 따라 Helper를 고르고 현재 Translation Block을 끝내도록 표시한다. PintOS의 64비트 보호 모드 경로는 `helper_iret_protected()`이며, `helper_iret_real()`은 Real Mode·VM86 쪽이다. 분기는 `translate.c`라는 이름만 찾기보다 실제 `emit.c.inc`까지 확인해야 한다. [TCG의 IRET 변환](https://github.com/qemu/qemu/blob/v10.0.0/target/i386/tcg/emit.c.inc)

보호 모드 Helper는 Guest Stack에서 값을 읽고 Descriptor를 검사한 뒤 `CPUX86State`의 `eip`, `regs[R_ESP]`, Segment 상태와 Flag를 갱신한다. 64비트 IRET에는 같은 CPL에서도 SS:RSP를 읽는 분기가 적용된다. 그 경로에서 `validate_seg()`는 ES·DS·FS·GS의 접근 조건도 재검사한다. 모든 Segment Cache를 무조건 비우는 것은 아니며 NULL FS·GS를 별도로 다루는 분기도 있다. Flag 복원 Mask는 복귀 전 CPL과 IOPL 등을 기준으로 정하므로 저장된 RFLAGS의 모든 비트가 그대로 대입된다고 설명하지 않는다.

이후 새 실행 상태에 맞는 TB를 찾으며, 이미 번역된 TB를 재사용할 수도 있다. 복귀할 때마다 새 TB를 반드시 생성한다는 뜻은 아니다. 이 구현은 Guest CPU 상태를 다루므로 Guest RIP와 Host의 명령어 주소도 구분한다. [QEMU IRET Helper](https://github.com/qemu/qemu/blob/v10.0.0/target/i386/tcg/seg_helper.c)
