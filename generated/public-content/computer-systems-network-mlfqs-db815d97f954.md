---
layout: default
title: MLFQS
nav_order: 5
permalink: /wiki/computer-systems-network-mlfqs-db815d97f954/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-mlfqs-db815d97f954
projection_sha256: dfad4ac4b7e550569fca7d5fe473659531a163d821c25cdedc518d246d50716f
parent: 스레드 구현
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-936b351311c8
search_terms:
- MLFQS
- recent_cpu
- load_avg
- nice
- '17.14'
- Fixed Point
- all_list
grand_parent: PintOS
ancestor: CS 기초
---

# MLFQS
{: .no_toc }

MLFQS는 최근 CPU 사용량과 `nice`를 반영해 Thread의 우선순위를 다시 계산한다. 우선순위를 직접 정하는 기본 정책과 달리 실행 이력이 계산 입력이 된다. PintOS의 이 학습용 정책을 현재 Linux Scheduler의 구현과 같은 것으로 보지는 않는다.

## 무엇을 계산하는가

현재 `lrn-pintos`의 `9d1b14c`는 `load_avg`, Thread별 `recent_cpu`, `nice`를 사용한다. 계산식은 다음과 같다. 아래 표기는 수학적 관계이며, 실제 정수 구현은 뒤의 고정소수점 연산을 거친다.

```text
load_avg = (59 / 60) × load_avg + (1 / 60) × ready_threads
recent_cpu = (2 × load_avg) / (2 × load_avg + 1) × recent_cpu + nice
priority = PRI_MAX - trunc(recent_cpu / 4) - 2 × nice
```

`ready_threads`에는 Ready Queue의 Thread 수와 현재 실행 중인 일반 Thread를 포함한다. Idle은 제외한다. CPU를 사용할 수 없는 BLOCKED Thread를 부하의 실행 후보 수에 넣지는 않지만, 그 Thread의 `recent_cpu`도 주기적 감쇠 계산 대상이다. 그래서 전체 Thread를 잇는 `all_list`가 필요하다.

현재 코드에서 `priority`는 0–63 범위로 제한하고, `nice`는 -20–20을 받는다. CPU를 최근 많이 사용하거나 `nice`가 커지면 우선순위가 내려간다. 음수 `nice`에서는 `recent_cpu`도 음수가 될 수 있으므로 이를 임의로 0으로 자르면 원래 계산과 달라진다. [MLFQS 계산과 전체 목록 갱신](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/thread.c#L825)

## 같은 tick에서 갱신 순서도 중요하다

| 갱신 시점 | 현재 코드의 처리 |
|---|---|
| 매 tick | Idle이 아닌 실행 Thread의 `recent_cpu`에 1을 더함 |
| `ticks % TIMER_FREQ == 0` | `load_avg`를 계산한 뒤 전체 Thread의 `recent_cpu`를 갱신 |
| `ticks % TIME_SLICE == 0` | 전체 우선순위를 갱신하고 Ready Queue를 다시 정렬 |

두 주기가 겹치면 현재 코드는 실행 Thread의 사용량 증가, 부하·사용량 재계산, 우선순위 갱신 순으로 처리한다. `TIMER_FREQ = 100`, `TIME_SLICE = 4`이므로 100번째 tick은 세 처리가 모두 적용되는 지점이다. `thread_ticks`가 아니라 전역 `ticks`의 나머지로 MLFQS 주기를 판단하는 점도 구분한다. [thread_tick의 갱신 순서](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/thread.c#L224)

Ready Queue 안의 객체가 가진 숫자만 바꾸면 List의 순서는 자동으로 바뀌지 않는다. 현재 MLFQS 경로는 우선순위를 갱신한 뒤 `list_sort()`를 호출하고, 새 첫 Thread가 현재보다 높으면 IRQ 반환 시 양보를 요청한다. 기본 Donation 경로에서 순서를 처리하는 방식과 구별해 읽는다.

## 17.14 고정소수점으로 계산하기

현재 구현은 부호를 가진 정수에 `F = 1 << 14`를 단위로 사용한다. 실수 1을 원시 정수 16384로 나타내므로 소수부를 별도 Floating-point Register 없이 계산할 수 있다. 곱셈은 `x × y / F`, 나눗셈은 `x × F / y`로 스케일을 맞춘다. 곱셈과 나눗셈의 중간값에는 `int64_t`를 사용해 32비트 중간 곱의 Overflow를 줄인다. 그 뒤의 최종 범위까지 무제한으로 보장하는 방식은 아니다.

다음은 현재 C 함수의 계산 순서와 0 방향 정수 나눗셈을 Python으로 재현한 예제다. 이전 `load_avg`가 0이고, 갱신 직전 `recent_cpu`가 100, 실행 가능한 Thread가 2개인 입력을 사용한다. 100 tick의 실제 Kernel 실행이나 Scheduler 테스트를 수행하는 코드는 아니다.

```run-python
F = 1 << 14

def trunc_div(x, y):
    # C 정수 나눗셈처럼 0 방향으로 버린다. Python의 //와 음수에서 다르다.
    magnitude = abs(x) // abs(y)
    return -magnitude if (x < 0) != (y < 0) else magnitude

def mul(x, y):
    return trunc_div(x * y, F)

def div(x, y):
    return trunc_div(x * F, y)

def nearest(x):
    return trunc_div(x + F // 2 if x >= 0 else x - F // 2, F)

load_avg = 0
recent_cpu = 100 * F
nice = 0
ready_threads = 2
load_avg = mul(trunc_div(59 * F, 60), load_avg) + trunc_div(F, 60) * ready_threads
coefficient = div(2 * load_avg, 2 * load_avg + F)
recent_cpu = mul(coefficient, recent_cpu) + nice * F
priority = max(0, min(63, 63 - trunc_div(trunc_div(recent_cpu, 4), F) - 2 * nice))
print(f"1초 갱신 뒤 load_avg 원시 정수 = {load_avg}")
print(f"recent_cpu 원시 정수 = {recent_cpu}")
print(f"같은 tick의 priority 갱신 = {priority}")
print(f"load_avg × 100 반올림 = {nearest(100 * load_avg)}")
print(f"-7 / 4: C 방식 = {trunc_div(-7, 4)}, Python // = {-7 // 4}")
```

실행 결과:

```text
1초 갱신 뒤 load_avg 원시 정수 = 546
recent_cpu 원시 정수 = 102300
같은 tick의 priority 갱신 = 62
load_avg × 100 반올림 = 3
-7 / 4: C 방식 = -1, Python // = -2
```

`59 / 60`을 일반 C 정수로 먼저 계산하면 0이 되어 정보가 사라진다. `59 × F / 60`처럼 단위를 적용한 뒤 나누어야 한다. 반대로 Python `//`는 음수에서 아래쪽으로 버리므로 C 정수 나눗셈과 다르다. 부호를 처리한 `trunc_div()`를 둔 이유다.

우선순위의 정수 변환은 0 방향 버림이고, `thread_get_recent_cpu()`와 `thread_get_load_avg()`의 공개 반환값은 해당 값을 100배 한 뒤 가장 가까운 정수로 반올림한다. 같은 원시 정수를 읽더라도 반환 목적에 따라 변환 규칙이 다르다. [고정소수점 변환](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/threads/thread.c#L511)

## 생성과 우선순위 설정에 연결되는 규칙

MLFQS에서 새 일반 Thread는 생성자의 `nice`와 `recent_cpu`를 이어받고 우선순위를 계산한다. Idle 생성은 이 상속 경로에서 제외한다. `thread_set_priority()`는 MLFQS가 켜져 있으면 바로 반환하고, `thread_set_nice()`는 새 `nice`로 우선순위를 다시 계산한 뒤 선점을 확인한다.

`all_elem`은 Ready·Sleep·Semaphore에서 사용하는 `elem`과 다른 연결이다. BLOCKED인 Thread까지 전체 계산에 포함하면서 각각의 대기 목록도 유지하려면 두 소속이 독립적이어야 한다. 연결 구조는 [Doubly Linked List](/wiki/computer-science-topic-2d043afd0f9f/)에서, 부팅 시 초기 값과 생성 경로는 [스레드 구현](/wiki/computer-systems-network-topic-936b351311c8/)에서 살펴본다.

여기서 확인한 범위는 현재 저장소의 계산 코드와 독립 실행 예제다. 경계 시점에 대한 Kernel 테스트 통과나 모든 스케줄링 경로의 정확성을 검증한 결과로 확대하지 않는다.
