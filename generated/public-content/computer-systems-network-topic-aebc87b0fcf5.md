---
layout: default
title: Thread
nav_order: 3
permalink: /wiki/computer-systems-network-topic-aebc87b0fcf5/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-aebc87b0fcf5
projection_sha256: 2383b21c2be9df108870c2b24f0e467f773292d3ab889b91f971c6c50a40d335
parent: 프로세스와 스레드
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-63b969bafddd
search_terms:
- 스레드
- thread_block
- thread_yield
- thread_unblock
- THREAD_BLOCKED
- THREAD_READY
- THREAD_DYING
- do_schedule
- destruction_req
- Idle Thread
grand_parent: OS
ancestor: CS 기초
---

# Thread
{: .no_toc }

Thread는 실행을 이어 가는 데 필요한 Register와 Stack을 가진 실행 단위다. 실행할 수 있는 상태인지와 지금 CPU를 사용하는지는 별개다. 화면에서 프로그램이 멈춘 것처럼 보여도, CPU를 기다리는 중인지 다른 작업의 완료를 기다리는 중인지에 따라 살펴볼 코드가 달라진다.

## 실행 차례를 기다릴 때와 사건을 기다릴 때

PintOS의 `enum thread_status`는 네 상태를 구분한다. 다음 표의 Queue 규칙은 일반 Thread를 기준으로 하며, Idle Thread에는 뒤에서 설명할 예외가 있다.

| 상태 | 값 | 의미 | `ready_list` |
|---|---|---|---|
| RUNNING | 0 | 현재 CPU에서 실행 중 | 들어 있지 않음 |
| READY | 1 | 실행할 수 있지만 아직 선택되지 않음 | 들어 있음 |
| BLOCKED | 2 | Timer, Semaphore 등 깨울 사건을 기다림 | 들어 있지 않음 |
| DYING | 3 | 실행을 끝내고 Thread 페이지 회수를 기다림 | 들어 있지 않음 |

`timer_sleep(100)`을 호출한 Thread는 BLOCKED가 된다. 목표 tick에 `thread_unblock()`이 호출되면 READY로 바뀌지만, 실제 실행은 Scheduler가 선택한 뒤에 시작된다. 깨운 시각과 다시 실행한 시각 사이에 대기 시간이 더 생길 수 있다. [Alarm Clock](/wiki/computer-systems-network-alarm-clock-4f0f0546530e/)에서 이 차이를 tick과 대기 목록으로 확인할 수 있다.

상태를 바꾸는 주체도 다르다. 실행 중인 Thread는 `thread_block()`으로 기다리거나 `thread_yield()`로 양보한다. 다른 Thread나 외부 IRQ Handler는 `thread_unblock(t)`으로 대상을 실행 후보로 돌려놓는다. `schedule()`은 다음 대상을 RUNNING으로 표시한다. [상태 정의](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/include/threads/thread.h), [상태를 바꾸는 함수](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/thread.c)

## Block은 기다림의 이유를 정하지 않는다

현재 PintOS의 `thread_block()`은 다음과 같다.

```c
void
thread_block (void) {
    ASSERT (!intr_context ());
    ASSERT (intr_get_level () == INTR_OFF);
    thread_current ()->status = THREAD_BLOCKED;
    schedule ();
}
```

이 함수는 자신을 Semaphore나 Sleep Queue에 넣지 않는다. 호출자가 먼저 대기할 조건과 대상을 연결해야 한다. `sema_down()`은 값이 0이면 `waiters`에 자신을 넣고, `thread_sleep()`은 `sleep_list`에 깨울 시각을 기록한 뒤 Block한다. 따라서 깨우기가 일어나지 않는 문제는 `thread_block()` 한 함수만 읽어서는 찾기 어렵다. 대기 목록에 넣은 코드와 그 목록에서 꺼내는 코드를 함께 따라가야 한다.

`sema_down()`은 다시 실행된 뒤에도 `while (sema->value == 0)`을 검사한다. READY가 되었다고 Semaphore를 이미 얻은 것은 아니다. 실제로 값이 양수일 때 감소시키고 대기를 끝낸다. [Semaphore의 대기와 깨우기](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/synch.c)

외부 IRQ Handler는 Block할 수 없다. 반면 일반 Thread가 IF를 끈 채 `thread_block()`을 호출하는 것은 위 코드가 요구하는 순서다. **인터럽트 비활성화는 CPU 양보 자체를 금지하지 않는다.** 목록과 상태를 바꾸는 도중 Timer IRQ가 끼어들지 않게 보호하는 것이다. SMP의 다른 CPU까지 보호하는 방법은 아니므로, Linux의 Spinlock·선점 제어와 그대로 대응시키지는 않는다.

## Yield한 Thread가 다시 선택될 수도 있다

`thread_yield()`는 기다릴 사건을 등록하지 않는다. 일반 Thread를 `ready_list`에 다시 넣고 `do_schedule(THREAD_READY)`를 호출한다. 가장 높은 우선순위가 여전히 자신에게 있으면 같은 Thread가 다시 선택된다. Yield는 다른 Thread의 실행이나 특정 시간 동안의 대기를 보장하는 함수가 아니다.

| 호출 | 호출 전 IF | Queue 변화 | 이후 경로 |
|---|---|---|---|
| `thread_block()` | OFF 필요 | Ready Queue에 넣지 않음 | 상태를 BLOCKED로 바꾼 뒤 `schedule()` |
| `thread_yield()` | 함수 안에서 OFF로 바꿈 | 우선순위에 맞춰 다시 삽입 | `do_schedule(THREAD_READY)` → `schedule()` |
| `thread_unblock(t)` | 함수 안에서 OFF로 바꿈 | BLOCKED인 대상을 삽입 | READY로 바꾸고 호출자에게 반환 |

`do_schedule()`이 `schedule()`을 호출한다. 반대 순서가 아니다. Block 경로는 상태를 직접 바꾸므로 `do_schedule()`을 거치지 않는다. `schedule()`은 `next_thread_to_run()`으로 대상을 고르고, RUNNING 표시와 `thread_ticks = 0`을 처리한다. USERPROG 빌드에서는 다음 Thread의 주소 공간도 활성화한다. 현재와 다음 대상이 다를 때만 `thread_launch(next)`로 Register와 Stack을 전환한다.

양보한 Thread가 나중에 다시 선택되면 자신이 멈췄던 호출 경로를 이어 간다. `thread_yield()`의 `intr_set_level(old_level)`이나 `thread_sleep()`의 같은 복원 코드는 그때 실행된다. 다른 Thread가 이전 Thread의 지역 변수 `old_level`을 대신 복원하는 구조가 아니다. 처음 실행되는 새 Thread는 `kernel_thread(function, aux)`에서 시작한다.

다음 대상을 선택하는 규칙과 입력을 바꾸는 실행 예제는 [우선순위 스케줄링](/wiki/computer-systems-network-topic-6276ce481024/)에 이어진다. Register 저장·복원은 [QEMU](/wiki/computer-systems-network-qemu-b1366076be02/)의 Thread 실행 흐름과 함께 볼 수 있다.

## 생성, 종료, Idle의 예외

새 Thread는 `init_thread()`에서 BLOCKED로 초기화된다. 생성 코드가 실행 진입점과 인자, Stack을 준비한 뒤 `thread_unblock()`으로 READY로 만든다. “생성과 동시에 RUNNING”도 아니고, “생성 함수가 반환할 때까지 실행되지 않음”도 아니다. 높은 우선순위의 새 Thread가 생성 함수를 호출한 Thread보다 먼저 실행될 수 있다.

일반적으로 새 Thread 한 개에는 4KiB 페이지 한 장을 할당하고, 아래쪽에 `struct thread`, 나머지 공간에 아래로 자라는 Kernel Stack을 둔다. 현재 `init_thread()`는 초기 RSP를 `페이지 시작 + PGSIZE - sizeof(void *)`로 설정한다. 구조체에 필드가 추가되면 Stack에 남는 공간도 줄어든다. 큰 지역 배열과 깊은 재귀가 `magic`과 상태 필드를 손상시킬 수 있는 이유다.

`thread_exit()`는 USERPROG 자원을 정리하고 `all_list`에서 자신을 뺀 뒤 `do_schedule(THREAD_DYING)`으로 내려간다. 아직 사용 중인 Kernel Stack 페이지는 즉시 해제할 수 없다. 현재 `schedule()`은 종료된 이전 Thread를 `destruction_req`에 넣고, **이후 `do_schedule()` 호출**이 그 목록의 페이지를 해제한다. 다음 `schedule()` 호출마다 곧바로 해제하는 것은 아니다. 초기 Thread는 이 페이지 해제 대상에서 제외된다. 소스의 오래된 `schedule_tail()` 주석보다 실제 `destruction_req` 처리 위치를 기준으로 읽는다.

Idle Thread는 초기 실행을 위해 한 번 Ready Queue에 들어간다. 그 뒤에는 Queue가 비었을 때 `next_thread_to_run()`이 직접 반환하는 특별한 대상이다. Idle이 Block했더라도 다른 후보가 없으면 곧바로 자신이 선택되어 RUNNING이 될 수 있다. 이 경우 일반 Thread의 “BLOCKED → READY → RUNNING” 경로를 적용하면 설명이 맞지 않는다.

Idle의 `sti; hlt`는 Thread를 파괴하거나 컴퓨터를 종료하는 명령이 아니다. CPU가 다음 사건을 기다리는 경로다. IRQ가 처리되는 동안에도 현재 PintOS Thread가 자동으로 `tid=0`인 별도 Thread로 바뀌지는 않는다. IF와 외부 IRQ 문맥의 구분은 [Interrupt](/wiki/computer-systems-network-topic-c19e34701c6c/)에서 다룬다.

## 다른 운영체제의 상태 이름을 읽을 때

Linux v6.12의 `TASK_RUNNING`은 CPU에서 실행 중인 경우와 실행 가능한 대기를 같은 값으로 표현한다. `TASK_INTERRUPTIBLE`은 Signal로 대기가 중단될 수 있고, `TASK_UNINTERRUPTIBLE`은 일반적인 Signal 깨우기를 받지 않는 대기다. 후자를 “I/O만 기다리는 상태”로 한정할 수는 없다. 정지 상태와 추적 상태도 별도로 있으며, `EXIT_ZOMBIE` 같은 종료 상태는 `__state`와 다른 `exit_state` 필드에서 관리한다. [Linux Task 상태 정의](https://github.com/torvalds/linux/blob/v6.12/include/linux/sched.h)

Signal로 깨어났다는 사실만으로 모든 시스템 콜이 항상 `EINTR`을 반환한다고 단정하지 않는다. 예를 들어 `wait_event_interruptible()`은 조건이 참이면 0, Signal로 중단되면 커널 내부의 `-ERESTARTSYS`를 반환한다. 호출자가 이를 처리하는 경로까지 읽어야 최종 반환 동작을 알 수 있다. [Wait Queue API](https://github.com/torvalds/linux/blob/v6.12/include/linux/wait.h)

Windows에서도 Running·Ready·Waiting을 구분한다. 실행 가능한 Thread가 CPU를 기다리는 경우와, Timer나 동기화 객체를 기다려 실행할 수 없는 경우는 성능 분석에서도 다른 의미를 가진다. Waiting 시간이 길다는 사실만으로 문제라고 판단할 수는 없다. [Microsoft의 Thread 상태 분석](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/cpu-analysis)

관찰 API에 따라 더 세밀한 상태도 보인다. `System.Diagnostics.ThreadState`의 Standby는 CPU를 사용하기 직전인 상태, Terminated는 실행을 마친 상태를 나타낸다. 이 진단용 상태값을 읽어 Thread 사이의 동기화를 대신해서는 안 된다. [진단용 ThreadState](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.threadstate)

## 상태와 Stack을 함께 관찰하기

GDB에서는 커널 함수 호출로 값을 얻기보다, 현재 Register와 메모리에 저장된 필드를 먼저 읽는다. 다음은 일치하는 Debug Symbol을 사용한 PintOS Guest의 관찰 절차다. 실행을 마친 로그는 아니다.

```gdb
tbreak *thread_block
continue
set $blocked = (struct thread *)((unsigned long)$rsp & ~0xfffUL)
p $blocked->name
p $blocked->tid
p $blocked->status
p/x ($eflags & 0x200)
bt 4
tbreak *thread_unblock
continue
set $woken = (struct thread *)$rdi
p $woken->name
p $woken->status
```

`thread_block()`의 첫 명령에서 대상은 아직 RUNNING이다. 상태 대입문을 지난 뒤 BLOCKED를 확인해야 한다. 반대로 `thread_unblock()` 첫 명령의 RDI는 깨울 대상이며, 현재 실행 중인 Thread와 다를 수 있다. Semaphore 대기라면 값과 `waiters`, Timer 대기라면 `wake_tick`과 `sleep_list`를 함께 본다.

전환 직전과 직후에는 `disassemble /r thread_launch`로 실제 명령 위치를 확인하고 RSP와 저장된 `tf`를 비교한다. 고정된 `+0x18` Offset이나 `stepi 5`가 모든 빌드에서 전환 지점이라고 가정하지 않는다. `next_thread_to_run()`을 GDB의 식으로 호출하면 Ready Queue에서 원소를 꺼낼 수 있으므로, 관찰 목적으로 직접 호출하지 않는다. QEMU Guest Debugger의 `info threads`도 PintOS 전체 Thread 목록을 뜻하지 않는다.
