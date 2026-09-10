---
layout: default
title: 우선순위 스케줄링
nav_order: 3
permalink: /wiki/computer-systems-network-topic-6276ce481024/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-6276ce481024
projection_sha256: 1802db68554436327e497fb5da9f37aa2597e89c37d1ffd2de09f2dd5a20dbde
parent: 스레드 구현
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-936b351311c8
search_terms:
- Priority Scheduling
- ready_list
- thread_create
- check_preemption
- thread_priority
- FIFO
- TIME_SLICE
- MLFQS
grand_parent: PintOS
ancestor: CS 기초
---

# 우선순위 스케줄링
{: .no_toc }

우선순위가 31인 A가 40인 B를 만들면 누가 먼저 실행될까? 현재 PintOS 구현에서는 B를 READY로 만든 뒤 우선순위를 비교하고 A가 CPU를 양보한다. 하지만 B가 생성되었다는 사실만으로 CPU 실행이 저절로 바뀌지는 않는다. Ready Queue에 넣는 단계와 다음 Thread를 고르는 단계를 따라가야 한다.

## Ready Queue에서 무엇을 먼저 고르는가

이 문서의 코드는 `lrn-pintos`의 기본 우선순위 모드를 기준으로 한다. 우선순위 범위는 0–63이며 값이 클수록 먼저 선택한다. `ready_list`는 `thread_priority()`의 `a->priority > b->priority` 비교로 정렬된 Doubly Linked List다. 다음 대상을 고르는 `next_thread_to_run()`은 목록이 비었으면 Idle Thread, 그렇지 않으면 맨 앞 원소를 반환한다. [현재 스케줄러](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/thread.c)

T1(10), T2(31), T3(20)이 모두 READY라면 선택 순서는 T2 → T3 → T1이다. 같은 우선순위라면 `list_insert_ordered()`가 앞서 들어온 동순위 원소 뒤에 삽입하므로 FIFO 순서를 유지한다. 이 규칙은 우선순위가 유지되는 구간의 Queue 순서다. Priority Donation이나 MLFQS로 값이 바뀌는 경로는 별도로 함께 읽어야 한다. [정렬 삽입 구현](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/lib/kernel/list.c)

일반 Thread가 Yield하면 자신도 우선순위에 맞게 다시 들어간다. 여전히 가장 높은 우선순위라면 자신이 바로 선택되고, 동순위 후보가 있으면 그 후보 뒤에서 기다린다. 따라서 Time Slice가 끝났다는 이유만으로 낮은 우선순위 Thread가 반드시 CPU를 받는 것은 아니다. 높은 우선순위의 실행 가능 작업이 계속 남아 있으면 낮은 우선순위 작업이 오래 기다릴 수 있다.

## 깨우기와 선점 판단을 분리한다

`thread_unblock()`은 BLOCKED인 대상을 Ready Queue에 삽입하고 READY로 바꾼다. 함수 안에서 즉시 `thread_yield()`를 호출하지 않는다. 호출자가 대상을 깨운 뒤 공유 상태의 나머지를 갱신할 수 있어야 하기 때문이다.

Semaphore가 좋은 예다. `sema_up()`은 대기 목록을 현재 우선순위로 다시 정렬하고 첫 Thread를 깨운 다음, `sema->value`를 증가시킨다. 그 뒤 IF를 복원하고 `check_preemption()`을 호출한다. 값 증가 전에 CPU를 넘기면 깨어난 Thread가 아직 0인 값을 보고 다시 기다릴 수 있다. [Semaphore의 선점 판단 위치](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/synch.c)

현재 `check_preemption()`은 문맥에 따라 두 경로를 선택한다.

```c
if (list_empty (&ready_list))
    return;
struct thread *front =
        list_entry (list_begin (&ready_list), struct thread, elem);
if (thread_current ()->priority < front->priority) {
    if (intr_context ())
        intr_yield_on_return ();
    else
        thread_yield ();
}
```

외부 IRQ 문맥에서는 선점을 무시하는 것이 아니라 **IRQ 마무리에서 양보하도록 예약**한다. 일반 Thread 문맥에서는 즉시 `thread_yield()`로 내려간다. 다만 이 함수가 존재한다는 것과 모든 깨우기 경로에서 호출된다는 것은 다르다. 현재 Alarm Clock의 `thread_awake()`는 `thread_unblock()`만 호출한다. 따라서 Alarm 깨우기마다 이 우선순위 검사가 자동으로 실행된다고 설명해서는 안 된다.

`thread_unblock()`과 `thread_yield()`는 내부에서 IF를 끄고 이전 값을 복원한다. 호출 전에 IF가 반드시 켜져 있어야 하는 함수는 아니다. 반면 외부 IRQ Handler는 `thread_yield()`를 직접 호출할 수 없다. 이 차이와 EOI 이후 실제 양보 순서는 [Interrupt](/wiki/computer-systems-network-topic-c19e34701c6c/)에 연결된다.

## 새 Thread는 생성 함수가 반환하기 전에 실행될 수 있다

`thread_create()`는 먼저 페이지를 할당하고 `init_thread()`로 BLOCKED 상태를 만든다. 할당에 실패하면 `TID_ERROR`를 반환한다. 성공하면 TID를 배정하고 초기 Frame의 RIP를 `kernel_thread`, RDI를 실행할 함수, RSI를 `aux`로 설정한다. Segment와 초기 IF를 준비하고 `all_list`에 연결한 뒤 `thread_unblock(t)`을 호출한다.

이 시점에는 새 Thread가 실행에 필요한 초기 상태를 갖춘다. “초기화가 아직 안 끝났기 때문에 unblock 안에서 양보하면 안 된다”는 설명보다, **깨우기 함수에 호출자마다 다른 후속 처리를 끼워 넣지 않는 역할 분담**으로 이해하는 편이 정확하다.

마지막 비교는 함수에 전달된 `priority` 인자가 아니라 `t->priority > thread_current()->priority`다. MLFQS 모드에서는 새 Thread가 부모의 `nice`와 `recent_cpu`를 물려받고 우선순위를 계산하므로 두 값이 항상 같지 않다. 기본 우선순위 모드에서 A(31)가 B(40)를 만들면 A는 양보하고, B가 C(35)를 만들면 B는 계속 실행한다.

더 높은 우선순위의 후보가 있으면 Scheduler는 전체 Queue에서 먼저 선택할 대상을 고른다. 방금 생성한 Thread가 모든 경우에 바로 선택된다고 단정할 수는 없다. 새 Thread가 먼저 실행되고 종료하거나 Block한 뒤, 생성한 Thread가 돌아와 `thread_create()`의 TID 반환까지 이어 갈 수도 있다.

## 입력을 바꾸며 선택 순서를 확인하기

다음 예제는 Queue와 상태 전환을 한 번에 한 사건씩 진행하는 Python 모델이다. 실제 PintOS Thread·IRQ·Register를 실행하지 않고, Priority Donation과 MLFQS도 생략한다. `create()`·`unblock()`·`yield_cpu()`를 비교하면 깨우기, 양보, 선택의 차이가 보인다.

```run-python
states = {"A": "RUNNING"}
priorities = {"A": 31}
ready = []
current = "A"
yield_on_return = False

def enqueue(name):
    ready.append(name)
    ready.sort(key=lambda n: -priorities[n])  # 동순위는 삽입 순서 유지

def show(event):
    queue = ",".join(f"{n}:{priorities[n]}" for n in ready) or "empty"
    print(f"{event}: running={current}, ready=[{queue}]")

def select():
    global current
    assert ready, "이 예제에서는 Idle 대신 실행 후보가 있다고 가정한다."
    current = ready.pop(0)
    states[current] = "RUNNING"

def yield_cpu():
    states[current] = "READY"
    enqueue(current)
    select()

def unblock(name):
    assert states[name] == "BLOCKED"
    states[name] = "READY"
    enqueue(name)

def create(name, priority):
    states[name] = "BLOCKED"
    priorities[name] = priority
    unblock(name)
    if priority > priorities[current]:
        yield_cpu()

def block():
    states[current] = "BLOCKED"
    select()

def check_preemption(external_irq):
    global yield_on_return
    if ready and priorities[ready[0]] > priorities[current]:
        if external_irq:
            yield_on_return = True
        else:
            yield_cpu()

create("B", 40)
show("A creates B(40)")
create("C", 35)
show("B creates C(35)")
yield_cpu()
show("B yields")
block()
show("B blocks")
unblock("B")
show("unblock B only")
check_preemption(external_irq=True)
print(f"IRQ check: deferred={yield_on_return}, running={current}")
# 외부 IRQ 표시 해제와 EOI를 마친 뒤의 양보만 모델링한다.
if yield_on_return:
    yield_on_return = False
    yield_cpu()
show("IRQ finish")
create("D", 40)
show("B creates D(40)")
yield_cpu()
show("B yields to equal priority")
```

실행 결과:

```text
A creates B(40): running=B, ready=[A:31]
B creates C(35): running=B, ready=[C:35,A:31]
B yields: running=B, ready=[C:35,A:31]
B blocks: running=C, ready=[A:31]
unblock B only: running=C, ready=[B:40,A:31]
IRQ check: deferred=True, running=C
IRQ finish: running=B, ready=[C:35,A:31]
B creates D(40): running=B, ready=[D:40,C:35,A:31]
B yields to equal priority: running=D, ready=[B:40,C:35,A:31]
```

B가 C보다 우선순위가 높을 때 Yield해도 B가 다시 선택된다. B가 Block해야 C가 실행된다. B를 깨우는 함수는 C를 즉시 바꾸지 않고, 뒤의 선점 검사가 양보를 예약한다. 마지막에는 같은 우선순위의 D가 먼저 Ready Queue에 있으므로 B가 Yield할 때 D를 고른다.

B와 C의 우선순위를 같게 바꾸거나 D를 더 낮게 바꾸어, 예상한 실행 순서와 출력을 비교해 볼 수 있다. 이 예제의 Python List 연산 시간은 PintOS Linked List의 비용 측정으로 사용할 수 없다.

## Time Slice와 실행 비용을 해석하기

`thread_tick()`은 실행 조각의 `thread_ticks`를 증가시키고 4에 도달하면 양보를 예약한다. `schedule()`은 같은 Thread를 다시 골라도 이 값을 0으로 만든다. 일반 Thread의 Ready Queue 재삽입은 후보 수 n에 대해 O(n), 맨 앞 선택 자체는 O(1)이다. 전체 전환에는 주소 공간 활성화와 Register 복원 등 다른 작업도 포함된다.

100Hz에서 4 tick을 곱하면 명목상 40ms가 나오지만, 모든 실행의 최대 연속 시간이나 선점 지연을 보장하는 수치는 아니다. IRQ를 끈 구간, 가상 시간, Host 스케줄링, 호출 시점과 tick 경계가 영향을 준다. “깨우면 지연 0ms”, “최악 지연은 항상 1 tick”, “Context Switch는 수백 Cycle” 같은 수치는 측정 없이 성능값으로 쓰지 않는다.

QEMU는 가상 PIT·PIC와 Guest CPU 명령을 실행한다. PintOS의 우선순위 숫자나 Ready Queue에서의 선택은 Guest 소프트웨어의 정책이다. TCG와 KVM 같은 실행 방식에 따라 시간 특성은 달라져도, QEMU가 PintOS의 대기 목록을 대신 정렬하는 것은 아니다.

## Linux와 Windows를 비교하는 기준

Linux v6.12의 Fair Scheduler는 EEVDF 선택을 사용한다. 깨어난 Task의 가상 실행 시간만 비교해 가장 작은 Task를 무조건 고른다는 과거 CFS 설명을 그대로 적용하면 맞지 않는다. `check_preempt_wakeup_fair()`는 `pick_eevdf()`의 결과에 따라 `resched_curr()`로 재스케줄링을 요청하며, `yield_task_fair()`는 현재 Entity의 가상 Deadline을 늘린다. `vruntime`을 무조건 최댓값으로 만드는 함수가 아니다. [Linux v6.12 Fair Scheduler](https://github.com/torvalds/linux/blob/v6.12/kernel/sched/fair.c)

Linux의 재스케줄링 요청과 실제 전환 시점은 실행 문맥과 선점 설정에 달려 있다. per-CPU Run Queue, 동기화와 CPU 간 깨우기도 고려해야 한다. PintOS의 한 CPU·한 Ready Queue와 같은 지연 수치로 비교하지 않는다.

Windows는 같은 우선순위의 실행 가능한 Thread에 Time Slice를 나누고, 더 높은 우선순위의 Thread가 준비되면 낮은 우선순위 Thread의 남은 Time Slice보다 이를 우선한다. Process의 Priority Class와 Thread의 Priority Level이 기본 우선순위에 함께 반영된다. 모든 Windows 버전의 Quantum을 30ms나 180ms로 고정해 설명하거나, 이 규칙을 하나의 내부 DPC 함수 호출로 단정하지 않는다. [Windows Scheduling Priorities](https://learn.microsoft.com/en-us/windows/win32/procthread/scheduling-priorities)

## Queue를 바꾸지 않고 다음 후보 확인하기

Debugger에서는 `thread_unblock`, `thread_yield`, `check_preemption`, `next_thread_to_run`에 중단점을 두어 원인과 결과를 연결한다. 다음은 Debug Symbol이 있는 Guest에서 Ready Queue를 읽는 명령이다. `list_entry` Macro나 커널 함수 호출을 사용하지 않는다.

```gdb
set $elem_offset = (unsigned long)&((struct thread *)0)->elem
set $e = 'thread.c'::ready_list.head.next
while $e != &'thread.c'::ready_list.tail
  set $t = (struct thread *)((char *)$e - $elem_offset)
  p $t->name
  p $t->priority
  p $t->status
  set $e = $e->next
end
```

Queue가 비어 있으면 반복문은 한 번도 실행되지 않는다. `next_thread_to_run()`을 식으로 직접 호출하면 원소를 제거하므로 관찰값을 훼손할 수 있다. 실제 선택을 보려면 함수의 반환값이나 `schedule()`에서 대입을 마친 `next`를 관찰한다. Thread가 Yield하기 전후의 상태와 Stack은 [Thread](/wiki/computer-systems-network-topic-aebc87b0fcf5/)에서 이어진다.
