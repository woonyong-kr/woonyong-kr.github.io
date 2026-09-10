---
layout: default
title: Greedy
nav_order: 7
permalink: /wiki/computer-science-topic-20932461ee68/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-20932461ee68
projection_sha256: 78f4544408435627491072ad45e57679e9f7805b99645b28ca1cf3e78f0c1a28
parent: 알고리즘
content_status: ready
public_parent_id: Wiki/computer-science/algorithms
search_terms:
- 그리디
- Greedy
- 탐욕법
- 거스름돈
- 멀티탭 스케줄링
- Farthest-in-Future
- 교환 논증
grand_parent: CS 기초
---

# Greedy
{: .no_toc }

`6`을 `4, 3, 1` 단위의 동전으로 만들 때 큰 동전부터 고르면 `4 + 1 + 1`이다. 하지만 `3 + 3`이면 동전 두 개로 충분하다. 당장 큰 값을 고르는 기준이 전체 동전 수까지 줄여 주지는 않는다.

**Greedy(탐욕법)**는 각 단계에서 정한 기준에 따라 한 선택을 확정하고 되돌아가지 않는 방법이다. 구현을 짧게 만들 수 있다는 점보다 **그 선택을 포함하는 최적해가 있는가**가 먼저다. 동전에서는 반례를 찾고, 미래 사용 순서를 아는 멀티탭에서는 다음 등장 시점을 기준으로 선택하는 이유를 살펴본다.

## 큰 동전부터 고를 수 있는 조건

`1320`을 `500, 100, 50, 10` 단위로 거슬러 준다고 하자. 큰 단위부터 고르면 `500` 두 개, `100` 세 개, `10` 두 개로 모두 일곱 개다. 이 구성에서는 더 작은 동전 여러 개를 바로 위 단위 하나로 바꿀 수 있다.

예를 들어 `10` 다섯 개는 `50` 하나, `50` 두 개는 `100` 하나, `100` 다섯 개는 `500` 하나로 바뀐다. 최적해라면 이렇게 동전 수를 줄일 여지를 남기지 않는다. 아래 단위들이 만들 수 있는 나머지를 차례로 제한하면 큰 동전부터 가능한 만큼 고르는 형태가 나온다. 여기에는 **각 단위가 바로 아래 단위의 정수 배수이고, 동전을 무제한 사용할 수 있으며, 금액이 최소 단위로 표현 가능하다**는 조건이 있다.

`4, 3, 1`에는 이 교환 관계가 없다. `6`에 대해 큰 동전부터 고른 결과는 세 개지만 최적값은 두 개다. 이 반례는 ‘큰 동전 우선’ 규칙의 한계를 보여 준다. 모든 Greedy가 틀리거나 이 문제를 반드시 한 가지 방법으로만 풀어야 한다는 뜻은 아니다.

정답 보장이 필요한 일반 동전 구성에서는 [동적 계획법](/wiki/computer-science-topic-7a70b4370929/)으로 남은 금액의 최적값을 비교할 수 있다. 뒤의 실행 코드에서 `best[value]`는 해당 금액을 만드는 최소 동전 수이며, 가능한 동전마다 `1 + best[value - coin]`을 비교한다.

## 선택을 확정하기 전에 정당성을 확인한다

Greedy의 **탐욕적 선택 속성(greedy-choice property)**은 지금 고른 선택을 포함하는 최적해가 존재한다는 것이다. 반드시 모든 최적해가 같은 선택을 포함해야 하는 것은 아니다. 선택을 확정한 뒤 남은 문제도 올바르게 풀 수 있도록 최적 부분 구조를 함께 살핀다.

흔히 쓰는 증명 방법은 **교환 논증(exchange argument)**이다. 최적해가 Greedy와 다른 선택을 했다고 두고, 그 선택을 Greedy의 선택으로 바꿔도 결과가 나빠지지 않는지 보인다. 이런 교환을 반복할 수 있어야 국소적인 선택을 전체 최적해로 연결할 수 있다. [Princeton의 Greedy와 교환 논증](https://www.cs.princeton.edu/courses/archive/spr05/cos423/lectures/04greed.pdf)

DP와 Greedy를 ‘느리지만 무조건 정답’과 ‘빠르지만 가끔 오답’으로 나누면 부정확하다. DP도 충분한 상태와 올바른 전이가 필요하고, Greedy도 조건과 정당성이 갖춰지면 정확한 알고리즘이다. 최단 경로의 Dijkstra는 간선 가중치가 음수가 아니라는 조건 아래에서 최단 거리를 확정해 나간다. 이름보다 선택 기준과 전제를 확인해야 한다.

## 멀티탭에서는 다음 사용 시점이 기준이다

멀티탭에 빈자리가 없는데 새 기기를 사용해야 하면 기존 기기 하나를 뽑아야 한다. 이 문제에서는 **전체 사용 순서를 미리 알고 있고**, 기기마다 한 자리를 차지하며 제거 한 번의 비용이 같다. 목표는 플러그를 뽑는 횟수를 최소화하는 것이다.

처리 규칙은 다음과 같다.

1. 이미 꽂힌 기기는 그대로 사용한다.
2. 빈자리가 있으면 새 기기를 꽂는다.
3. 가득 찼다면 다시 쓰지 않을 기기를 뽑는다.
4. 모두 다시 쓰인다면 다음 사용이 가장 먼 기기를 뽑는다.

두 번째와 세 번째 사이를 구분해야 한다. 빈자리를 채우는 일은 제거 횟수에 포함하지 않는다. 자리가 가득 차고 현재 기기가 없을 때만 제거 대상을 찾는다.

자리 두 개에 `2, 3, 2, 3, 1, 2, 7`을 차례로 사용하면 다음과 같다.

| 요청 | 꽂힌 기기 | 처리 |
| --- | --- | --- |
| 2 | 2 | 빈자리 사용 |
| 3 | 2, 3 | 빈자리 사용 |
| 2 | 2, 3 | 그대로 사용 |
| 3 | 2, 3 | 그대로 사용 |
| 1 | 2, 1 | 다시 쓰지 않는 3 제거 |
| 2 | 2, 1 | 그대로 사용 |
| 7 | 1, 7 | 둘 다 다시 쓰지 않아 2 제거 |

마지막에는 `1`을 제거해도 최적 제거 횟수는 같다. 아래 구현은 List에서 먼저 찾은 재사용 없는 기기를 고르므로 `2`를 제거한다. 결과를 하나로 정하는 규칙과 최적값이 유일하다는 주장은 다르다.

### 가장 늦은 재사용을 미룬다

현재 꽂힌 `A`, `B`, `C`의 다음 사용이 각각 2칸, 5칸, 9칸 뒤라면 `C`를 뽑는다. `A`나 `B`를 뽑으면 `C`가 필요해지기 전에 더 먼저 필요한 기기를 다시 꽂을 수 있기 때문이다. 다음 사용이 없는 기기는 이 비교에서 가장 먼 것으로 본다. 전체 등장 횟수가 적은 기기와 다음 사용이 먼 기기는 다를 수 있다.

정당성은 한 번의 직관적인 비교를 넘어 남은 일정에도 적용되어야 한다. 최적 교체 일정과 처음 다르게 고르는 지점에서, 더 먼저 필요한 기기를 남기고 가장 늦은 기기의 제거를 택하는 일정으로 바꾸어도 제거 횟수가 늘지 않음을 보이는 교환 논증을 사용한다. 이후 요청과 교체도 함께 대응시키는 논증이며, 그 사이에 새로운 기기가 전혀 나오지 않는다고 가정하는 것은 아니다. 이 방식은 **Farthest-in-Future**라는 최적 오프라인 교체 규칙과 같다. [Princeton의 최적 오프라인 Cache 교체](https://www.cs.princeton.edu/courses/archive/spr05/cos423/lectures/04greed.pdf)

## 반례와 교체 과정을 실행한다

아래 프로그램은 두 선택을 함께 비교한다. `greedy_coins`는 선택이 금액을 완성하지 못하면 `None`을 반환한다. 이것은 **Greedy가 답을 찾지 못했다**는 뜻이며, 어떤 방법으로도 금액을 만들 수 없다는 판정은 아니다. `6`과 `4, 3`에서는 Greedy가 `4`를 고른 뒤 멈추지만 `3 + 3`은 가능하다.

`min_unplugs`는 꽂힌 기기를 List로 관리한다. `schedule.index(old, i + 1)`은 현재 요청 뒤의 첫 등장 위치를 찾고, 없으면 `ValueError`가 발생한다. 다음 위치가 가장 큰 후보를 기억하다가 제거한다. 일정의 뒷부분을 매번 Slice로 복사하지 않아도 같은 위치 비교를 할 수 있다.

```run-python
from functools import lru_cache


def valid_coins(amount, coins):
    if type(amount) is not int or amount < 0:
        raise ValueError("amount must be a nonnegative integer")
    if any(type(coin) is not int or coin <= 0 for coin in coins):
        raise ValueError("coins must be positive integers")
    return sorted(set(coins), reverse=True)


def greedy_coins(amount, coins):
    coins = valid_coins(amount, coins)
    count = 0
    for coin in coins:
        count += amount // coin
        amount %= coin
    return count if amount == 0 else None


def min_coins_dp(amount, coins):
    coins = valid_coins(amount, coins)
    unreachable = amount + 1
    best = [0] + [unreachable] * amount
    for value in range(1, amount + 1):
        for coin in coins:
            if coin <= value:
                best[value] = min(best[value], 1 + best[value - coin])
    return None if best[amount] == unreachable else best[amount]


def min_unplugs(capacity, schedule, events=None):
    if type(capacity) is not int or capacity < 1:
        raise ValueError("capacity must be a positive integer")
    plugged = []
    count = 0
    for i, device in enumerate(schedule):
        if device in plugged:
            continue
        if len(plugged) < capacity:
            plugged.append(device)
            continue
        farthest, target = -1, None
        for old in plugged:
            try:
                next_use = schedule.index(old, i + 1)
            except ValueError:
                target = old
                break
            if next_use > farthest:
                farthest, target = next_use, old
        plugged.remove(target)
        plugged.append(device)
        count += 1
        if events is not None:
            events.append((i, target, device))
    return count


# 작은 일정에서는 가능한 제거 대상을 모두 비교해 Greedy의 답을 확인한다.
def optimal_unplugs(capacity, schedule):
    @lru_cache(None)
    def solve(i, state):
        if i == len(schedule):
            return 0
        device = schedule[i]
        plugged = set(state)
        if device in plugged:
            return solve(i + 1, state)
        if len(plugged) < capacity:
            return solve(i + 1, tuple(sorted(plugged | {device})))
        return 1 + min(solve(i + 1, tuple(sorted((plugged - {old}) | {device})))
                       for old in plugged)
    return solve(0, ())


def main():
    for amount, coins, greedy_answer, optimum in [
        (1320, [500, 100, 50, 10], 7, 7),
        (6, [4, 3, 1], 3, 2),
        (6, [4, 3], None, 2),
        (5, [4, 2], None, None),
        (0, [], 0, 0),
    ]:
        assert greedy_coins(amount, coins) == greedy_answer
        assert min_coins_dp(amount, coins) == optimum
        print(f"coins {coins}, amount={amount}: greedy={greedy_answer}; optimum={optimum}")
    for amount, coins in [(-1, [1]), (3, [0]), (3, [-1])]:
        for function in (greedy_coins, min_coins_dp):
            try:
                function(amount, coins)
            except ValueError:
                pass
            else:
                raise AssertionError("invalid coin input was accepted")

    schedule = [2, 3, 2, 3, 1, 2, 7]
    events = []
    assert min_unplugs(2, schedule, events) == optimal_unplugs(2, schedule) == 2
    assert events == [(4, 3, 1), (6, 2, 7)]
    print(f"schedule sample: unplugs=2; events={events}")
    schedules = [[], [1], [1, 1, 1], [1, 2, 3], [1, 2, 3, 1, 2, 3],
                 [1, 2, 1, 3, 2, 4, 1], [1, 2, 3, 4, 3, 2, 1]]
    for sequence in schedules:
        for capacity in (1, 2, 3):
            before = sequence[:]
            assert min_unplugs(capacity, sequence) == optimal_unplugs(capacity, sequence)
            assert sequence == before
    try:
        min_unplugs(0, [1])
    except ValueError:
        pass
    else:
        raise AssertionError("zero capacity was accepted")
    print("21 small schedule cases: matched exhaustive choices")
    print("invalid inputs: rejected; all checks passed")


if __name__ == "__main__":
    main()
```

실행 출력은 다음과 같다.

```text
coins [500, 100, 50, 10], amount=1320: greedy=7; optimum=7
coins [4, 3, 1], amount=6: greedy=3; optimum=2
coins [4, 3], amount=6: greedy=None; optimum=2
coins [4, 2], amount=5: greedy=None; optimum=None
coins [], amount=0: greedy=0; optimum=0
schedule sample: unplugs=2; events=[(4, 3, 1), (6, 2, 7)]
21 small schedule cases: matched exhaustive choices
invalid inputs: rejected; all checks passed
```

동전 반례에서는 Greedy의 `3`과 DP의 `2`가 다르다. `4, 3`으로 `6`을 만드는 경우에는 Greedy만 실패한다. `4, 2`로 `5`를 만들 때는 두 방법 모두 답을 찾지 못한다. 금액이 0이면 빈 동전 목록으로도 비용 0이며, 음수 금액이나 0 이하의 동전은 거부한다.

멀티탭 예제의 이벤트는 `(요청 인덱스, 제거한 기기, 새 기기)`다. 인덱스는 0부터 시작하므로 `(4, 3, 1)`은 다섯 번째 요청 `1`을 처리하며 `3`을 뽑았다는 뜻이다. 작은 일정 일곱 개와 용량 1·2·3의 조합도, 제거할 수 있는 모든 기기를 비교하는 `optimal_unplugs`와 답이 일치했다. 이 비교 함수는 Greedy의 ‘가장 먼 사용’ 규칙을 사용하지 않는다. 작은 입력의 실행 결과는 정당성 설명을 보조하며 모든 입력을 검사했다는 뜻은 아니다.

표시된 Python 코드는 외부 패키지 없이 독립적으로 실행한다. `assert`를 없애는 `-O` 옵션은 붙이지 않는다. 멀티탭 용량은 양의 정수이며, 예제의 일정은 정수 기기 번호의 List다. 입력 일정은 바꾸지 않는다.

## Greedy라는 이름만으로 빠르다고 볼 수는 없다

동전 종류를 `D`, 금액을 `A`라고 하면 큰 동전부터 고르는 코드는 정렬에 `O(D log D)`, 선택에 `O(D)`가 든다. 비교용 DP는 `O(A × D)` 시간과 `O(A)`개의 표 항목을 사용한다. 금액 자체에 비례하는 비용과 동전 종류 수에 비례하는 비용은 다르다.

멀티탭 요청 수가 `M`, 자리가 `K`개일 때, 이 단순 구현은 교체마다 최대 `K`개 기기에 대해 남은 일정에서 다음 위치를 찾는다. 최악의 시간 상한은 `O(K × M²)`이며 꽂힌 기기 저장에는 `O(K)` 공간을 쓴다. 이벤트를 기록하면 최대 `O(M)`개의 기록이 추가된다. 최적값을 대조하는 검증 함수의 모든 선택지 탐색은 이 비용과 별도다. 실제 교체가 적으면 덜 일할 수 있지만, Greedy를 썼다는 이유만으로 선형 시간이라고 쓰면 안 된다. 입력 크기가 커지면 기기별 다음 등장 위치를 미리 관리하는 구현을 검토할 수 있다.

실제 Cache나 [비용 분석](/wiki/computer-science-topic-869aa2bd6535/)에 이 규칙을 적용할 때는 미래 정보를 알 수 있는지 먼저 구별한다. 이 문제의 최적 규칙은 미래 사용 순서를 입력으로 받는다. 미래를 모르는 운영체제나 일반 Cache가 같은 정보를 사용할 수 있다고 가정하지 않는다. 자료를 보관하는 방식은 [자료구조](/wiki/data-structures/), 상태를 묶어 최적값을 비교하는 방식은 [동적 계획법](/wiki/computer-science-topic-7a70b4370929/)으로 이어진다.
