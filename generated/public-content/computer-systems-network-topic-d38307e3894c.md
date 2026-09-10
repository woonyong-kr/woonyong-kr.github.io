---
layout: default
title: 장치
nav_order: 2
permalink: /wiki/computer-systems-network-topic-d38307e3894c/
publication_state: publish
has_toc: false
projection_id: Wiki/keywords/computer-systems-network-topic-d38307e3894c
projection_sha256: aa8131d153a48a09bfd7325a283e5f17b8c362afb0658a8f5f8d50fb78f68f3b
parent: 입출력
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-d4ff1bb79941
search_terms:
- Port I/O
- MMIO
- PMIO
- PIO
- DMA
- PIT
- PIC
- IDE
- VGA
- I/O Port
- MemoryRegionOps
grand_parent: OS
ancestor: CS 기초
---

# 장치
{: .no_toc }

`0x1f0`라는 숫자를 보았을 때 그것이 메모리 주소인지 I/O Port인지 먼저 구별해야 한다. PintOS의 IDE Driver에서 이 값은 Data Port다. 같은 숫자의 메모리를 읽는 것으로 디스크 데이터를 받을 수는 없다.

장치는 명령을 받는 Register, 데이터를 옮기는 통로, 완료를 알리는 방법을 제공한다. OS Driver는 이 약속에 맞춰 접근하고 여러 요청의 순서를 보호한다. 아래 PintOS 코드는 [lrn-pintos `9d1b14c`](https://github.com/woonyong-kr/lrn-pintos/tree/9d1b14cbdf41425ba8867af743c03cf32190ee9b), QEMU 내부 경로는 v10.0.0을 기준으로 한다. 실제 Guest를 부팅해 얻은 관찰 기록은 아니다.

## Port와 메모리에 놓인 Register

x86의 Port I/O는 메모리와 구분되는 16비트 Port 공간을 사용한다. `IN`·`OUT`은 1·2·4바이트 단위로 값을 전달하고, 반복 I/O 명령은 같은 Port와 메모리 버퍼 사이에서 여러 값을 옮긴다. PintOS의 `inb`·`outb`, `insw`·`outsw`는 이런 명령을 감싼 함수다. [PintOS I/O Wrapper](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/include/threads/io.h)

MMIO는 장치 영역을 물리 주소 공간에 배치한다. CPU가 해당 영역에 load/store를 실행하면 일반 RAM 대신 장치가 응답한다. 가상 주소를 사용하는 Kernel에서는 그 장치 영역으로 연결되는 Mapping도 필요하다.

| 구별할 조건 | Port I/O | MMIO |
|---|---|---|
| 주소의 뜻 | 별도 I/O 공간의 Port 번호 | 장치 영역으로 연결되는 메모리 주소 |
| x86의 접근 | IN·OUT 및 반복 I/O 명령 | 메모리 load/store 명령 |
| PintOS 예 | PIT 설정, PIC 제어, IDE PIO | VGA 텍스트 화면의 문자·속성 바이트 |
| 접근 전 확인 | Port 번호·폭과 I/O 권한 | Mapping·접근 권한·장치의 메모리 속성과 폭 |

PintOS가 모든 장치를 Port I/O로만 접근하는 것은 아니다. `devices/vga.c`의 초기화는 `ptov(0xb8000)`을 화면 버퍼 포인터로 저장한다. 문자 한 칸은 문자와 속성 두 바이트이며, 80열·25행이면 총 4,000바이트다. 반면 VGA 커서 위치는 CRT Port `0x3d4`·`0x3d5`로 읽고 쓴다. **같은 장치에도 두 접근 방식이 함께 쓰일 수 있다.** [VGA 화면과 커서](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/devices/vga.c)

다음 예제는 Port 상태와 화면 버퍼를 별도로 만든다. 실제 Port나 화면 메모리에 쓰지 않고 주소 공간의 구분과 문자 위치 계산을 실행한다.

```run-python
ports = {0x43: 0}
memory = {0x43: 99}
ports[0x43] = 0x34
print(f'Port 0x43={ports[0x43]:#x}, memory[0x43]={memory[0x43]}')
assert memory[0x43] == 99

columns, rows = 80, 25
framebuffer = bytearray(columns * rows * 2)

def put_cell(x, y, character, attribute):
    if not (0 <= x < columns and 0 <= y < rows):
        raise ValueError('화면 범위를 벗어났다.')
    if len(character) != 1 or not (0 <= ord(character) < 128 and 0 <= attribute <= 255):
        raise ValueError('ASCII 문자 한 개와 한 바이트 속성이 필요하다.')
    offset = (y * columns + x) * 2
    framebuffer[offset:offset + 2] = bytes((ord(character), attribute))
    return offset

offset = put_cell(2, 1, 'A', 0x1f)
gpa = 0xb8000 + offset
kernel_va = 0x8004000000 + gpa
print(f'화면 크기={len(framebuffer)} bytes, (2, 1)의 offset={offset}')
print(f'GPA={gpa:#x}, Kernel VA={kernel_va:#x}')
print('문자와 속성:', framebuffer[offset:offset + 2].hex(' '))
assert framebuffer[offset:offset + 2] == b'A\x1f'
try:
    put_cell(80, 0, 'B', 7)
except ValueError as error:
    print('좌표 검사:', error)
else:
    raise AssertionError('화면 밖의 좌표는 거부해야 한다.')
```

Python 3.9.6에서 실행한 결과다.

```text
Port 0x43=0x34, memory[0x43]=99
화면 크기=4000 bytes, (2, 1)의 offset=164
GPA=0xb80a4, Kernel VA=0x80040b80a4
문자와 속성: 41 1f
좌표 검사: 화면 범위를 벗어났다.
```

Port `0x43`에 기록한 값은 같은 숫자의 메모리 값을 바꾸지 않는다. 화면의 `(2, 1)` 위치는 `(1*80+2)*2 = 164`바이트 지점이고, 문자 `A`와 속성 `0x1f`가 나란히 저장된다. Python 버퍼 자체가 물리 주소 `0xb8000`에 있다는 뜻은 아니다.

## MMIO를 일반 변수처럼 다루면 안 되는 이유

장치 Register는 읽는 것만으로 상태가 바뀌거나, 정해진 크기로 써야 동작할 수 있다. 단순히 `volatile` 포인터를 붙이는 것으로 CPU의 접근 순서·메모리 속성·장치까지의 전달 완료가 모두 보장되지는 않는다.

Linux Driver는 장치 자원을 확인하고 `ioremap()` 또는 자원 관리 Wrapper로 Mapping을 얻은 뒤 `readl()`·`writel()` 같은 접근자를 사용한다. Register용 기본 Mapping과 화면 버퍼 등에 사용할 수 있는 Write Combining은 보장하는 조건이 다르다. Posted Write에서는 CPU의 쓰기 명령이 끝나도 장치에 아직 도착하지 않았을 수 있어, 필요한 경우 같은 장치의 읽기로 완료를 확인한다. 일반 `memcpy()` 대신 I/O 전용 복사 API가 필요한 경우도 있다. [Linux의 장치 접근과 Mapping 조건](https://www.kernel.org/doc/html/latest/driver-api/device-io.html)

Port I/O와 MMIO는 **어디에 어떻게 명령을 쓰는가**의 구분이다. CPU가 데이터를 직접 옮기는 PIO와 장치가 메모리에 접근하는 DMA의 구분과 같지 않다. 예를 들어 MMIO Register로 DMA 요청을 시작할 수 있다. PintOS IDE의 데이터 전송은 CPU의 반복 Port I/O를 사용하며, 그 전송·대기 순서는 [IDE 컨트롤러](/wiki/ide-controller/)에서 읽는다.

## PIT·PIC·IDE는 서로 다른 일을 한다

PIT는 설정된 카운터와 모드에 따라 Timer 출력을 만들고, PIC는 장치의 IRQ 요청을 CPU에 전달한다. IDE Controller는 저장 장치의 명령·상태·데이터를 제공한다. PIC가 디스크 데이터를 옮기거나 PIT가 실행할 Thread를 선택하는 것은 아니다.

| 장치 | 현재 PintOS의 접근 위치 | 관련 IRQ·Vector |
|---|---|---|
| PIT Counter 0 | Data `0x40`, Control `0x43` | IRQ0 → `0x20` |
| PIC Master | `0x20`·`0x21` | IRQ0–7의 요청과 상태 |
| PIC Slave | `0xa0`·`0xa1` | IRQ8–15; Master IRQ2로 연결 |
| IDE Primary | `0x1f0`–`0x1f7`, Control `0x3f6` | IRQ14 → `0x2e` |
| IDE Secondary | `0x170`–`0x177`, Control `0x376` | IRQ15 → `0x2f` |
| Keyboard | Data `0x60`, Controller `0x64` | IRQ1 → `0x21` |
| Serial COM1 | `0x3f8`부터의 Register | IRQ4 → `0x24` |

표의 Vector는 PintOS가 PIC를 초기화하면서 정한 배치다. IRQ 번호와 Vector 값을 같은 숫자로 읽지 않는다. PIC는 요청 상태(IRR), Mask(IMR), 처리 중인 상태(ISR)를 구별한다. 요청이 생겨도 Mask와 우선순위, CPU의 인터럽트 허용 상태 등에 따라 바로 Handler가 실행되는 것은 아니다. [PintOS PIC 초기화](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/interrupt.c#L356), [QEMU PIC 모델](https://github.com/qemu/qemu/blob/v10.0.0/hw/intc/i8259.c)

현재 `timer_init()`은 PIT Counter 0에 모드와 카운터를 쓰고 Vector `0x20`의 Handler를 등록한다. `TIMER_FREQ=100`일 때 코드의 정수 계산은 `(1193180 + 50) / 100 = 11932`다. QEMU의 PIT 모델은 가상 시간인 `QEMU_CLOCK_VIRTUAL`을 사용해 다음 출력 변화를 예약하고 IRQ Line의 상태를 갱신한다. Guest의 Timer 설정 주기와 Host 벽시계에서 관찰하는 Handler 실행 간격은 다를 수 있다. [Timer 설정](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/devices/timer.c), [QEMU PIT의 가상 시간](https://github.com/qemu/qemu/blob/v10.0.0/hw/timer/i8254.c)

## 초기화와 완료 처리를 코드 순서로 따라간다

PintOS의 `main()`은 `intr_init()`, `timer_init()`, `kbd_init()`, `input_init()`으로 인터럽트·입력 경로를 준비한다. USERPROG이면 예외와 syscall도 초기화한다. 그다음 `thread_start()`가 Idle Thread를 만들고 `intr_enable()`을 실행한다. 이후 `serial_init_queue()`, `timer_calibrate()`가 이어지며, FILESYS 빌드의 `disk_init()`은 그 뒤에 있다. 이 순서에서는 디스크 초기화에 앞서 인터럽트가 활성화된다. [실제 초기화 순서](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/init.c#L113), [스케줄러 시작과 인터럽트 활성화](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/thread.c#L201)

외부 인터럽트가 들어오면 공통 `intr_handler()`가 Vector에 등록한 Handler를 호출한다. Timer Handler는 틱과 Scheduler 처리를 이어 가고, 디스크 Handler는 요청의 완료 Semaphore에 신호를 보낸다. 장치 Handler가 돌아온 뒤 공통 경로가 PIC에 EOI를 보내고, 필요한 경우 복귀 전에 `thread_yield()`를 실행한다. 장치별 Handler와 공통 완료 처리가 이렇게 나뉜다. [공통 인터럽트 처리](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/interrupt.c#L415)

IDE 읽기는 명령 발행, 완료 대기, 데이터 수거를 구별한다. `insw(port, buffer, 256)`는 Wrapper 한 번으로 16비트 Word 256개를 전송한다. 장치 callback 횟수는 Wrapper의 호출 횟수뿐 아니라 상태 조회·재시도와 장치 구현의 접근 폭에도 영향을 받는다. Channel Lock과 Semaphore가 보호하는 내용은 [IDE 컨트롤러](/wiki/ide-controller/)의 읽기·쓰기 비교에 이어진다.

## QEMU 안에서 조사할 때는 Debugger의 대상을 바꾼다

QEMU v10.0.0에서 x86 `helper_outb()`는 `address_space_stb(&address_space_io, ...)`, `helper_inb()`는 `address_space_ldub(...)`를 사용한다. MemoryRegion에 등록한 장치 callback으로 연결되지만, MMIO의 Guest 메모리 접근과 처음부터 같은 CPU 경로를 거치는 것은 아니다. MMIO에서는 주소 변환 정보가 적중해도 장치 callback을 위한 느린 경로가 필요할 수 있다. 느린 경로를 무조건 TLB Miss라고 읽지 않는다. [Port I/O Helper](https://github.com/qemu/qemu/blob/v10.0.0/target/i386/tcg/system/misc_helper.c#L30)

Guest GDB에서는 `timer_interrupt()`, `pic_end_of_interrupt()`, `issue_pio_command()` 같은 PintOS 함수를 관찰한다. Host Debugger에서는 QEMU의 `pit_ioport_write()`, `pic_ioport_write()`, `helper_outb()` 등을 조사한다. 서로 다른 실행 파일의 Symbol이므로 Guest GDB 연결 하나로 두 쪽의 내부 함수를 모두 볼 수는 없다. 인라인 `outb()`에 항상 함수 진입점이 있을 것이라고 가정하는 대신 호출한 코드와 Disassembly도 확인한다.

타이머를 관찰할 때는 중단점 방문 횟수와 가상 시간의 진행을 구별한다. 디스크에서는 IRQ가 왔는지뿐 아니라 어느 Channel의 어떤 요청이 완료됐는지 확인한다. QEMU의 영역 배치와 Callback 전달은 [QEMU](/wiki/computer-systems-network-qemu-b1366076be02/), 저장 요청이 Host 파일까지 내려가는 과정은 [BlockBackend](/wiki/qemu-block-backend/)에서 이어서 읽는다.
