---
layout: default
title: 재귀와 반복
nav_order: 4
permalink: /wiki/computer-science-topic-931a857d1d9a/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-931a857d1d9a
projection_sha256: f4b6d3c13df39aa75d67f000b9df686c5c4bba63a9f11beffe03fa42c248189e
parent: 재귀
content_status: ready
public_parent_id: Wiki/keywords/computer-science-topic-1df2006f50cf
search_terms:
- 재귀
- 반복
- Recursion
- Iteration
- Call Stack
- 꼬리 재귀
- Tail Call
- PintOS
grand_parent: 알고리즘
ancestor: CS
---

# 재귀와 반복
{: .no_toc }

숫자 1부터 5까지 곱한 `5!`은 120이다. 반복은 누적값에 2, 3, 4, 5를 차례로 곱한다. 재귀는 `5! = 5 × 4!`로 문제를 줄이고, `4!`의 답이 돌아오기를 기다린다. **같은 답을 구하더라도, 아직 끝나지 않은 일을 어디에 기억하는지가 다르다.**

## 작은 문제를 부르고, 답을 받아 돌아온다

재귀는 함수가 자신을 다시 호출하는 방식이다. 다른 함수를 거쳐 돌아오는 간접 재귀도 있다. 더 나누지 않고 답을 내는 **종료 조건**과, 그 조건에 도달하도록 상태를 바꾸는 재귀 단계가 필요하다. 반복은 `for`나 `while` 안에서 카운터·누적값 같은 상태를 갱신한다.

`factorial_rec(3)`은 `factorial_rec(2)`의 결과에 3을 곱해야 하고, 안쪽 호출은 `factorial_rec(1)`의 결과에 2를 곱해야 한다. 1을 반환한 뒤에야 기다리던 곱셈을 끝낼 수 있다.

| 진행 | 지금 하는 일 | 아직 남은 일 |
|---|---|---|
| 3에서 2 호출 | 더 작은 팩토리얼을 구한다 | 결과에 3 곱하기 |
| 2에서 1 호출 | 종료 조건에 도달한다 | 결과에 2 곱하기, 그다음 3 곱하기 |
| 1 반환 | 1을 돌려준다 | `2 × 1` |
| 2 반환 | 2를 돌려준다 | `3 × 2` |
| 3 반환 | 6을 돌려준다 | 계산 완료 |

마트료시카를 안쪽까지 열었다가 **가장 안쪽부터 차례로 다시 닫는** 모습과 비슷하다. 각 단계에서 돌아갈 위치와 필요한 상태를 메모지에 적어 쌓는다고 생각하면 호출 스택의 역할이 보인다. 일반적인 호출 구현은 이런 정보를 스택 프레임에 보관하지만, 지역 변수·반환 위치의 실제 저장 방법과 프레임 수는 컴파일러와 최적화에 따라 달라질 수 있다.

## 재귀·반복·꼬리 재귀로 같은 입력 계산하기

아래 프로그램은 `0, 1, 3, 5, 20`을 세 방식으로 계산하고 알려진 답과 대조한다. `-1`과 `21`은 계산 전에 거부한다. `3!`에 대해서만 재귀 호출과 반환을 출력한다.

팩토리얼 값은 빨리 커진다. 예제는 `unsigned long long`을 사용하고 입력을 **0부터 20까지**로 제한한다. 이 구간의 값은 C가 보장하는 해당 타입의 최소 표현 범위에 들어간다. 더 큰 입력을 지원하려면 별도의 넘침 검사나 큰 정수 구현이 필요하다. 세 계산 함수는 `main`에서 확인한 입력만 받는 내부 함수다. [C11 공개 초안 N1570 §5.2.4.2.1](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf#page=46)

```run-c
#include <assert.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>

static unsigned long long factorial_rec(unsigned n, bool trace) {
    if (trace) printf("호출: %u\n", n);
    unsigned long long result = 1;
    if (n > 1) result = n * factorial_rec(n - 1, trace);
    if (trace) printf("반환: %u! = %llu\n", n, result);
    return result;
}

static unsigned long long factorial_iter(unsigned n) {
    unsigned long long result = 1;
    for (unsigned i = 2; i <= n; ++i) result *= i;
    return result;
}

static unsigned long long factorial_tail(unsigned n, unsigned long long acc) {
    if (n <= 1) return acc;
    return factorial_tail(n - 1, n * acc);
}

int main(void) {
    const int inputs[] = {-1, 0, 1, 3, 5, 20, 21};
    const unsigned long long expected[] = {
        0, 1, 1, 6, 120, 2432902008176640000ULL, 0
    };
    size_t accepted = 0, rejected = 0;
    for (size_t i = 0; i < sizeof inputs / sizeof inputs[0]; ++i) {
        int input = inputs[i];
        if (input < 0 || input > 20) {
            printf("입력 %d: 범위 밖이라 거부\n", input);
            ++rejected;
            continue;
        }
        unsigned n = (unsigned) input;
        unsigned long long recursive = factorial_rec(n, n == 3);
        unsigned long long iterative = factorial_iter(n);
        unsigned long long tail = factorial_tail(n, 1);
        assert(recursive == expected[i]);
        assert(iterative == expected[i] && tail == expected[i]);
        printf("%u!: 재귀=%llu, 반복=%llu, 꼬리 재귀=%llu\n",
               n, recursive, iterative, tail);
        ++accepted;
    }
    assert(accepted == 5 && rejected == 2);
    printf("확인: 계산 %zu건, 입력 거부 %zu건\n", accepted, rejected);
    return 0;
}
```

`3!`에서는 호출이 `3 → 2 → 1`, 반환이 `1! = 1 → 2! = 2 → 3! = 6` 순서로 출력된다. `0! = 1`도 세 구현에서 같다. 반복 함수는 호출 결과를 기다리는 대신 `result`를 갱신하고, 꼬리 재귀 함수는 계산한 값을 `acc`에 담아 다음 호출로 보낸다.

출력에서 계산값과 호출·반환 순서를 확인할 수 있다. 실제 스택 프레임의 수와 크기는 컴파일된 코드에 따라 달라진다.

## 종료 조건이 있어도 거기에 도달해야 한다

`n <= 1`이라는 조건만 두면 음수까지 1을 반환할 수 있다. 자연수와 0에 대한 팩토리얼을 구현한다면 음수는 먼저 거부해야 한다. 위 프로그램이 입력 검사와 계산을 나눈 이유다.

종료 조건이 0인데 양수 입력에서 매번 `n + 1`로 호출하면 조건에 가까워지지 않는다. 조건 없이 `return n * broken(n - 1)`만 반복하는 함수도 정상적으로 답을 반환할 근거가 없다. 트리·그래프·디렉터리를 따라갈 때는 깊이뿐 아니라 같은 지점을 다시 방문하는 순환도 살펴야 한다. 방문 여부나 작업량 제한이 필요한 문제도 있다.

이때 “반드시 스택이 넘쳐 OS가 프로세스를 종료한다”고 결과를 고정해서는 안 된다. 구현에 따라 런타임의 깊이 제한에 걸리거나 메모리를 소진할 수 있고, 컴파일러 변환도 영향을 준다. C에서 부호 있는 `int`를 계속 줄여 표현 범위를 벗어나는 산술은 정의되지 않은 동작이므로, 음수 아래로 무한히 내려가는 수학적 정수처럼 설명할 수도 없다. [C11 공개 초안 N1570 §6.5¶5](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf#page=94)

CPython에는 재귀 깊이 제한이 있다. 제한을 크게 올리는 것만으로 필요한 메모리가 확보되거나 프로그램이 안전해지는 것은 아니다. [Python의 재귀 깊이 제한](https://docs.python.org/3/library/sys.html#sys.setrecursionlimit)

## 반복으로 바꾸면 공간이 항상 O(1)일까

곱셈과 정수 하나의 저장을 일정한 비용으로 보는 계산 모델에서, 팩토리얼의 재귀와 반복은 모두 O(n)번의 일을 한다. 다만 추가로 기억하는 상태가 다르다.

| 구현 | 아직 끝나지 않은 상태 | 추가 공간의 조건 |
|---|---|---|
| 일반 재귀 | 하위 결과를 기다리는 호출들 | 호출을 그대로 쌓으면 O(n) |
| 누적값을 갱신하는 반복 | 카운터와 누적값 | 이 팩토리얼 구현은 O(1) |
| 꼬리 재귀 | 다음 호출로 넘기는 누적값 | 최적화 없이는 O(n), 프레임 누적을 제거하면 O(1) |

표는 입력 크기에 따른 알고리즘의 비용을 나타낸다. C 예제의 입력은 0~20으로 제한돼 있다. 큰 정수로 이 제한을 풀면 곱셈과 숫자 저장 자체의 비용도 다시 고려해야 한다.

트리 순회를 반복으로 바꿀 때는 돌아갈 노드를 **명시적인 Stack**에 보관할 수 있다. 재귀 호출을 없앴어도 이 저장 공간까지 사라지는 것은 아니다. 어떤 자식을 처리했는지까지 기억해야 하는 후위 순회처럼 추가 상태가 필요한 경우도 있다. 전위·후위·레벨 순회의 반복 구현은 [트리 순회](/wiki/computer-science-topic-17f8492e4ed6/)에서 살펴본다.

## 마지막 일이 호출 자체인 경우

일반 팩토리얼의 `n * factorial_rec(n - 1, trace)`는 호출이 돌아온 뒤 곱셈이 남아 있다. 반면 `factorial_tail(n - 1, n * acc)`는 곱셈한 누적값을 먼저 넘기고, 돌아온 값을 그대로 반환한다. **호출 뒤에 남은 일이 없는 재귀 호출**을 꼬리 재귀라고 한다. 단순히 코드의 마지막 줄에 호출이 있다는 뜻은 아니다.

컴파일러가 이런 호출을 점프나 반복으로 바꾸면 프레임을 계속 쌓지 않을 수 있다. GCC에는 `-foptimize-sibling-calls`가 있고 일부 최적화 수준에서 활성화된다. 실제 변환 여부는 옵션이나 계산 결과만으로 알 수 없으므로 생성된 코드를 확인해야 한다. [GCC의 꼬리 호출 최적화 옵션](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html#index-foptimize-sibling-calls)

CPython 3.14는 Python 함수의 꼬리 호출 최적화를 구현하지 않는다. 이 버전의 선택적 tail-call interpreter는 인터프리터 내부 C 함수의 실행 방식에 관한 것으로, 사용자가 작성한 Python 재귀 함수를 일정한 스택 공간으로 바꿔 준다는 뜻이 아니다. [Python 3.14의 설명](https://docs.python.org/3/whatsnew/3.14.html#new-type-of-interpreter)

## PintOS에서는 4 KiB 전체가 스택이 아니다

`lrn-pintos`의 `5afaa6d` 버전에서 `PGSIZE`는 `1 << 12`, 즉 4,096바이트다. 스레드 하나에 페이지 한 장을 할당하고, 낮은 주소 쪽에 `struct thread`, 나머지 쪽에 아래로 자라는 커널 스택을 둔다. 따라서 **커널 스택이 쓸 수 있는 공간은 4 KiB보다 작다.** 사용자 프로그램의 스택과도 구분해야 한다. [페이지 크기](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/threads/vaddr.h#L28), [스레드와 스택의 배치](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/threads/thread.h#L73)

깊은 재귀나 큰 자동 지역 배열이 이 공간을 소진하면 스레드 구조체를 손상시킬 수 있다. `magic`은 그 구조체 안의 확인용 값이며, `thread_current()`는 `is_thread(t)`로 이 값을 검사한다. 손상된 값이 검사 시점에 읽히면 assertion 실패로 드러날 수 있다. 하지만 모든 스택 넘침을 미리 막는 경계 검사도 아니고, 모든 `magic` 손상이 스택 넘침 때문에 생겼다는 증명도 아니다. [검사 함수와 조건](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/thread.c#L392), [magic 확인 매크로](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/threads/thread.c#L137)

해당 소스 주석은 큰 지역 구조체·배열 대신 `malloc()`이나 `palloc_get_page()`를 사용하라고 안내한다. 동적 할당을 택하면 할당 실패와 해제 책임도 함께 다뤄야 한다. [커널 스택 사용 지침](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/include/threads/thread.h#L101)

## 문제 구조와 예상 깊이를 함께 본다

하위 트리·중첩 괄호·디렉터리처럼 더 작은 구조에 같은 규칙을 적용할 때는 재귀가 처리 순서를 직접 드러낼 수 있다. 반대로 길이가 긴 List를 한 노드씩 재귀로 따라가면 호출 깊이가 입력 길이만큼 늘 수 있다. 깊이를 통제하기 어렵거나 커널처럼 스택이 좁다면 반복과 명시적 Stack을 검토한다.

선택 기준은 재귀 코드의 길이만이 아니다. 입력이 종료 조건으로 진행하는지, 최악에 어느 깊이까지 내려가는지, 돌아올 때 어떤 상태가 필요한지, 그 상태를 어디에 보관할지를 함께 판단한다. [Stack](/wiki/computer-science-topic-39fd55620efd/)은 저장 순서의 규칙을, [Stack과 Heap](/wiki/computer-systems-network-topic-3521ee6344f1/)은 메모리 영역을, [시간 복잡도](/wiki/computer-science-topic-869aa2bd6535/)는 입력 크기에 따른 연산량을 살펴보는 연결 지점이다.
