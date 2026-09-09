---
layout: default
title: IDE 컨트롤러
nav_order: 1
permalink: /wiki/ide-controller/
publication_state: publish
has_toc: true
projection_id: Wiki/computer-systems-network/os/io/devices/ide-controller
projection_sha256: 9a95c636214b9719c06765d9089d7ba849b47fb5f7fec1eece05c8eb402e0ea4
parent: 장치
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-d38307e3894c
search_terms:
- ATA
- PIO
- LBA28
- IRQ14
- IRQ15
- I/O Port
- IDE Controller
grand_parent: 입출력
ancestor: CS
---

# IDE 컨트롤러
{: .no_toc }

파일 시스템이 “이 Sector를 읽어 달라”고 요청하면 장치 Driver는 그 요청을 컨트롤러가 이해하는 명령으로 바꾼다. PintOS의 IDE Driver는 I/O Port에 장치 번호와 주소를 쓰고, 데이터가 준비됐다는 Interrupt를 기다린 뒤 Sector를 전송한다.

IDE는 여기서 ATA 저장 장치 인터페이스를 가리킨다. 편집기·Debugger를 묶는 개발 도구인 IDE와는 다른 뜻이다. 아래 설명은 [lrn-pintos `5afaa6d`의 ATA PIO 구현](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/devices/disk.c)을 기준으로 한다.

## 두 장치가 Channel을 공유한다

현재 Driver에는 두 Channel이 있고 각 Channel에 장치 두 개를 연결할 수 있다. 같은 Channel의 장치는 I/O Port와 Interrupt를 공유한다. 어느 장치가 요청을 받을지는 Device Register의 선택 Bit로 정한다.

| Channel·장치 | PintOS 이름 | Data Port | IRQ·Interrupt Vector | 기본 용도 |
| --- | --- | --- | --- | --- |
| Primary Master | `hd0:0` | `0x1f0` | 14·`0x2e` | Boot·Kernel |
| Primary Slave | `hd0:1` | `0x1f0` | 14·`0x2e` | 파일 시스템 |
| Secondary Master | `hd1:0` | `0x170` | 15·`0x2f` | Scratch |
| Secondary Slave | `hd1:1` | `0x170` | 15·`0x2f` | Swap |

`struct channel`은 Port 기준 주소, Interrupt Vector, Lock, 완료 대기 Semaphore와 `devices[2]`를 가진다. `struct disk`에는 Channel 포인터, 장치 번호, Sector 용량과 읽기·쓰기 횟수가 들어간다. 파일과 Swap의 이름만으로 장치를 고르는 대신 `disk_get(channel, device)`와 실행 시 연결한 이미지를 함께 확인한다.

표의 14와 15는 IRQ 번호다. 현재 코드의 `c->irq`에는 `14 + 0x20`, `15 + 0x20`이라는 **Interrupt Vector 값**이 저장된다. 변수 이름만 보고 값 14가 들어 있다고 해석하면 Interrupt Handler의 비교를 잘못 읽게 된다.

## Port에 쓰는 주소는 메모리 주소가 아니다

ATA 명령의 Register는 Channel의 기준 Port에 다음 오프셋을 더해 찾는다. 같은 Port도 읽을 때와 쓸 때 역할이 다를 수 있다.

| 오프셋 | 읽기 | 쓰기 |
| --- | --- | --- |
| `+0` | Data | Data |
| `+1` | Error | Features |
| `+2` | Sector Count | Sector Count |
| `+3` | LBA Low | LBA Low |
| `+4` | LBA Mid | LBA Mid |
| `+5` | LBA High | LBA High |
| `+6` | Device | Device |
| `+7` | Status | Command |
| `+0x206` | Alternate Status | Control |

Port `0x1f0`과 메모리 주소 `0x1f0`은 같은 위치가 아니다. 현재 x86 Driver는 `inb`·`outb`와 `insw`·`outsw`를 사용해 I/O Port 공간에 접근한다. CPU가 파일명이나 Swap Slot을 알아서 해석하는 것이 아니라, Kernel이 계산한 값을 정해진 Register에 전달한다.

`select_sector()`는 먼저 Sector 번호가 장치 용량과 28비트 범위 안에 있는지 검사한다. 장치를 선택하고 대기 상태를 확인한 뒤 Sector Count에 1을 쓴다. LBA의 하위 세 바이트는 Low·Mid·High Register에 나누고, 상위 네 Bit는 Device Register에 장치 선택·LBA 모드 Bit와 함께 넣는다.

다음 코드는 그 분해와 조립만 실행한다. 실제 Port에 접근하지 않으므로 브라우저에서도 계산을 바꿔 볼 수 있다. `dev_no=1`은 Slave 장치다.

```run-python
def encode_lba28(sector, dev_no):
    if not 0 <= sector < (1 << 28):
        raise ValueError("LBA28 범위를 벗어났다.")
    if dev_no not in (0, 1):
        raise ValueError("장치 번호는 0 또는 1이다.")
    return {
        "count": 1,
        "low": sector & 0xff,
        "mid": (sector >> 8) & 0xff,
        "high": (sector >> 16) & 0xff,
        "device": 0xa0 | 0x40 | (dev_no << 4) | ((sector >> 24) & 0x0f),
    }


def decode_lba28(registers):
    return (registers["low"] | (registers["mid"] << 8)
            | (registers["high"] << 16)
            | ((registers["device"] & 0x0f) << 24))


for sector in (24, 0x1234567, (1 << 28) - 1):
    registers = encode_lba28(sector, dev_no=1)
    restored = decode_lba28(registers)
    assert restored == sector
    values = {key: hex(value) for key, value in registers.items()}
    print(f"LBA={hex(sector)}, registers={values}, 복원={hex(restored)}")
```

Sector 24에서는 Low가 `0x18`, Mid와 High가 0이고 Device는 `0xf0`이다. Device 전체를 주소 상위 바이트로 사용하면 장치 선택과 모드 Bit까지 섞인다. 복원할 때 `& 0x0f`가 필요한 이유다.

## Lock은 요청 순서를, Semaphore는 완료 대기를 다룬다

같은 Channel의 두 Thread가 LBA와 Command를 섞어 쓰면 주소는 한 요청에서, 데이터는 다른 요청에서 가져오는 문제가 생길 수 있다. Channel Lock은 장치 선택부터 전송 완료까지 이 순서를 보호한다. Channel이 다른 장치까지 이 Lock 하나로 직렬화하는 것은 아니다.

`issue_pio_command()`는 Interrupt가 켜져 있는지 확인하고 `expecting_interrupt = true`로 만든 뒤 명령을 쓴다. 현재 읽기 명령은 `0x20`, 쓰기 명령은 `0x30`이다. Interrupt Handler는 Vector가 일치하는 Channel을 찾고, 대기 중인 요청이면 Status Register를 읽은 뒤 `sema_up()`으로 대기자를 깨운다.

Semaphore는 Interrupt가 `sema_down()`보다 먼저 도착한 경우에도 완료 신호를 보관할 수 있다. Lock과 Semaphore는 같은 장치를 위한 도구여도 역할이 다르다. 또한 Channel Lock이 inode의 길이·빈 공간·Directory 갱신 전체의 원자성을 보장하지는 않는다.

| 단계 | `disk_read()` | `disk_write()` |
| --- | --- | --- |
| 준비 | Channel Lock·장치와 Sector 선택 | Channel Lock·장치와 Sector 선택 |
| 명령 | Read Sector 발행 | Write Sector 발행 |
| 전송 전 | 완료 Interrupt를 기다리고 Busy 상태 확인 | 데이터를 받을 준비가 됐는지 Busy 상태 확인 |
| 데이터 | `input_sector()`로 받음 | `output_sector()`로 보냄 |
| 전송 후 | 읽기 횟수를 늘리고 Lock 해제 | 완료 Interrupt를 기다린 뒤 쓰기 횟수를 늘리고 Lock 해제 |

읽기와 쓰기는 대기와 전송의 순서가 다르다. 쓰기에서 데이터를 보내기 전에 읽기와 같은 완료 대기를 넣으면 정상적인 PIO 순서를 설명하지 못한다. 현재 Driver는 준비 확인이 실패하면 `PANIC`하며, 범용 OS의 복구·재시도 정책까지 구현한 Driver로 보아서는 안 된다.

Sector 하나는 512바이트다. `input_sector()`와 `output_sector()`는 각각 `insw()`와 `outsw()`를 **한 번 호출하면서 16비트 Word 256개**를 전송한다. 256번의 C 함수 호출이 아니다. 반복 I/O 명령이 메모리와 Port 사이의 Word를 옮기며, DMA 장치가 버퍼를 직접 전송하는 방식과 구분된다. [I/O 명령 Wrapper](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/threads/io.h)

Linux에서는 libATA가 ATA Controller와 장치를 지원하고, 하위 Driver가 PIO·DMA 등의 기능을 연결한다. 선택 가능한 모드는 장치·Controller·설정의 영향을 받으므로 PIO를 오직 DMA 초기화 실패 때만 쓰는 기능으로 설명하지 않는다. NVMe의 여러 Queue나 SATA의 NCQ를 현재 PintOS의 단일 Sector 요청과 비교할 때도 장치가 지원하는 Queue 깊이를 따로 확인한다. [Linux libATA](https://www.kernel.org/doc/html/latest/driver-api/libata.html)

Windows의 저장소도 Class·Filter·Port Driver와 장치별 Miniport 등을 구분한다. Storport의 Miniport는 해당 HBA의 특성을 처리한다. 이 계층 구조와 PintOS의 `struct disk → struct channel`을 비교하면 범용 OS가 장치 차이와 복구 정책을 어디에 두는지 볼 수 있다. [Windows 저장소 Driver 구조](https://learn.microsoft.com/en-us/windows-hardware/drivers/storage/storage-driver-architecture)

## QEMU는 같은 인터페이스를 소프트웨어로 구현한다

PintOS는 ATA 명령을 보내지만 QEMU는 실제 ATA 디스크 대신 가상 장치 모델로 응답한다. Register에 모은 LBA를 블록 요청의 바이트 오프셋으로 바꾸고, 연결된 이미지나 Backend에서 데이터를 얻는다. 읽기에서는 데이터가 준비된 뒤 Guest에게 Interrupt와 PIO 데이터를 제공한다. 쓰기에서는 Guest가 보낸 데이터를 받은 뒤 Backend 완료에 따라 장치 상태를 갱신한다.

현재 PintOS 실행기의 디스크 배치에서는 파일 시스템 요청은 Primary, Swap 요청은 Secondary Channel을 사용한다. 따라서 Swap 완료까지 무조건 IRQ14라고 쓰면 틀린 설명이 된다. QEMU의 Machine·Controller 구성에 따라서도 연결 방식이 달라지므로 “QEMU는 언제나 이 IDE 배치를 쓴다”고 일반화하지 않는다. [PintOS의 QEMU 실행 인자](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/utils/pintos)

IDE의 Guest 요청이 Host 파일로 이어지는 과정은 [BlockBackend](/wiki/qemu-block-backend/)에서 다룬다. 현재 PintOS의 PIO는 호출자가 완료를 기다리지만, QEMU 아래의 I/O까지 같은 Thread에서 동기 시스템 콜 하나로 처리한다는 뜻은 아니다.

## GDB에서 주소와 전송 버퍼 확인하기

아래는 해당 PintOS Kernel에 연결한 GDB에서 사용하는 관찰 명령이다. Kernel Symbol과 실행 환경이 필요하며 실제 Port를 조작하는 독립 프로그램은 아니다.

```gdb
break select_sector
commands
  silent
  printf "disk=%s LBA=%u low=%02x mid=%02x high=%02x top=%x\n", d->name, (unsigned)sec_no, (unsigned)(sec_no & 255), (unsigned)((sec_no >> 8) & 255), (unsigned)((sec_no >> 16) & 255), (unsigned)((sec_no >> 24) & 15)
  continue
end

break issue_pio_command
commands
  silent
  printf "channel=%s command=%02x vector=%02x\n", c->name, (unsigned)command, (unsigned)c->irq
  continue
end

break output_sector
commands
  silent
  printf "data port=%04x first 16 bytes:\n", (unsigned)c->reg_base
  x/16bx sector
  continue
end
```

전송 버퍼를 비교할 때 `x/16bx`는 바이트를, `x/2wx`는 Word 두 개를 보여 준다는 차이도 구분한다. 파일 내용을 확인하려면 Byte 출력이 해석하기 쉽다. 읽기·쓰기 횟수와 완료 반환의 의미는 [fsync](/wiki/file-system-fsync/)에서 이어서 살펴본다. 빌드마다 달라지는 `disk_write+120` 같은 고정 명령어 오프셋이나 한 번 관찰한 주소를 다음 빌드의 완료 지점으로 재사용하지 않는다.
