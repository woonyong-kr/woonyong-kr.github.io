---
layout: default
title: 기본 문법
nav_order: 2
permalink: /wiki/programming-languages-runtime-topic-ced5bd855b7b/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/programming-languages-runtime-topic-ced5bd855b7b
projection_sha256: 840c740bf8def6370e21c7852ada631c64d0efcd2da56a37c9a0c678a843d3ef
parent: Python
content_status: ready
public_parent_id: Wiki/programming-languages-runtime/python
search_terms:
- Python
- range
- len
- List
- dict.get
- Counter
- Set
- 누락된 양의 정수
- 고유한 값
- 등장 횟수
grand_parent: 프로그래밍 언어
ancestor: Programming
---

# 기본 문법
{: .no_toc }

Python에서 List를 다룰 때는 값, 값이 놓인 위치, 값의 개수를 구분해야 한다. 이 구분이 분명하면 반복 범위를 정하거나 중복을 판별하는 코드도 읽기 쉬워진다.

## List의 길이와 인덱스

`numbers = [1, 2, 3, 4, 5]`에는 값이 다섯 개 들어 있다. 길이 `len(numbers)`는 5이고 마지막 인덱스는 4다. `N = len(numbers)`라고 정했다면 N은 5다. 인덱스가 0부터 시작한다는 이유로 길이가 하나 줄어들지는 않는다.

```run-python
numbers = [1, 2, 3, 4, 5]
print("길이:", len(numbers))
print("마지막 인덱스:", len(numbers) - 1)
print("마지막 값:", numbers[-1])

for index, value in enumerate(numbers):
    print(f"numbers[{index}] = {value}")
```

값만 필요하면 `for value in numbers:`로 순회한다. 위치도 필요하면 위 코드처럼 `enumerate(numbers)`로 인덱스와 값을 함께 받는다. `for index in range(len(numbers)):`도 인덱스를 순회하는 방법이다. `range(numbers)`는 List를 정수 범위의 끝으로 사용할 수 없으므로 `TypeError`가 발생한다.

`for`, `if`, `def` 다음에 이어지는 블록은 `:`과 들여쓰기로 구분한다. `if counts[value] == 1:`에서 조건식을 괄호로 감쌀 필요는 없다. [Python 제어문](https://docs.python.org/3/tutorial/controlflow.html)

## 빈 List에 새 항목 넣기

`values = []`를 만들면 항목이 하나도 없다. `values[0] = 7`은 이미 있는 0번 항목을 바꾸는 연산이므로 실패한다. 뒤에 새 항목을 추가하려면 `append()`를 사용한다. 인덱스로 값을 바꾸려면 그 위치에 항목이 있어야 한다.

```run-python
values = []
try:
    values[0] = 7
except IndexError:
    print("빈 List에는 바꿀 0번 항목이 없다.")

values.append(7)
values.append(2)
values[0] = 9
print("추가한 뒤 수정:", values)

flags = [True] * len(values)
flags[0] = False
print("미리 만든 상태:", flags)
```

`[True] * len(values)`는 각 위치의 상태를 기록할 때 쓸 수 있다. 여기서 반복하는 `bool`은 불변 값이다. 안쪽 List처럼 변경 가능한 객체를 반복하면 같은 객체를 여러 위치에서 참조하므로 별도로 생성해야 한다. `values.copy()`는 바깥 List를 얕게 복사한다. [List의 변경과 복사](https://docs.python.org/3/tutorial/datastructures.html#more-on-lists)

Type Hint에는 `list[int]`, `list[tuple[int, int]]`처럼 대괄호를 쓴다. `list<tuple<int, int>>` 형태는 Python의 Type Hint 문법이 아니다. Python 3.9 이상에서는 내장 타입을 이렇게 표기할 수 있으며, 표기가 List의 항목 수를 미리 확보하거나 실행 중 타입을 강제하지는 않는다. 자세한 타입 표기는 [Type Hint](/wiki/programming-languages-runtime-topic-044a40a120f8/)에서 다룬다. [Generic Alias](https://docs.python.org/3/library/stdtypes.html#types-genericalias)

## `range`의 끝은 포함되지 않는다

`range(start, stop)`은 `start`부터 시작해 `stop`보다 작은 정수를 내놓는다. 기본 증가 폭이 1이고 `start < stop`이면 마지막 값은 `stop - 1`이다. `start >= stop`이면 범위가 비어 있다. `range` 객체를 만들 때 전체 List를 만드는 것은 아니며, 아래의 `list()`는 범위를 눈으로 확인하기 위해 사용한다.

```run-python
print("인덱스 0부터 4:", list(range(5)))
print("값 1부터 5:", list(range(1, 6)))
print("값 1부터 6:", list(range(1, 7)))
```

길이가 N인 List의 인덱스를 순회하려면 `range(N)`을 쓴다. 반면 값 1부터 N+1까지 조사하려면 `range(1, N + 2)`가 필요하다. 이때 `+2`는 조사할 마지막 값이 N+1이고 `stop`은 포함되지 않기 때문에 나온다. 인덱스가 0부터 시작하기 때문에 더하는 값은 아니다. [range](https://docs.python.org/3/library/stdtypes.html#range)

### 빠진 양의 정수 찾기

정수 목록에 없는 가장 작은 양의 정수를 찾는다고 하자. 값이 1, 2, 3처럼 이어지는지 확인하려면 입력에 들어 있는 값만 순회해서는 부족하다. 입력에 없는 값도 후보로 만들어야 한다.

값이 N개라면 1부터 N+1까지의 후보 N+1개를 모두 담을 수는 없다. 따라서 이 범위 안에 적어도 하나의 빈자리가 있다. 중복이나 음수가 있으면 서로 다른 양의 정수를 담은 자리는 더 적어진다.

```run-python
def smallest_missing_positive(numbers):
    present = set(numbers)
    for candidate in range(1, len(numbers) + 2):
        if candidate not in present:
            return candidate


for numbers in ([2, 4, 2, 1], [1, 2, 3, 4, 5], [-2, 0], []):
    print(numbers, "→", smallest_missing_positive(numbers))
```

출력은 차례로 3, 6, 1, 1이다. 두 번째 입력의 길이는 5이고 후보 범위는 1부터 6까지다. 코드의 `range(1, 7)`에서 7은 후보가 아니다.

`set(numbers)`는 존재 여부를 조회하는 데 사용한다. 중복을 없앤 뒤 길이가 달라져도 여기서 조사하는 것은 원래 List의 인덱스가 아니라 정수 후보의 값이다. `present`라는 이름도 양수만 담았다는 뜻은 아니다. Set 안에 음수와 0이 남아 있어도 후보를 1부터 만들기 때문에 결과에 영향을 주지 않는다.

CPython의 Set 조회가 평균 O(1)이라는 가정에서 Set을 만들고 최대 N+1개 후보를 확인하는 전체 시간은 평균 O(N), 추가 공간은 O(N)이다. List에서 매번 `candidate in numbers`를 검사하면 한 후보마다 최대 N개를 비교하므로 전체가 O(N²)까지 늘어날 수 있다. [CPython 자료구조의 시간 복잡도](https://wiki.python.org/moin/TimeComplexity)

## `dict.get()`으로 등장 횟수 누적하기

`dict`는 키에 값을 연결한다. 등장 횟수를 셀 때는 입력의 숫자를 키로, 지금까지 센 횟수를 값으로 사용한다. `counts`는 직접 정한 변수 이름이다.

`counts.get(number, 0)`은 `number`라는 키가 있으면 그 키에 저장된 값을 가져온다. 키가 없을 때만 기본값 0을 반환한다. 모든 키의 값을 0으로 읽거나, 값이 0인 키를 검색하는 연산이 아니다. `get()`으로 읽는 것만으로 새 키가 추가되지도 않는다. [dict.get](https://docs.python.org/3/library/stdtypes.html#dict.get)

```run-python
counts = {}
for number in [7, 2, 7]:
    previous = counts.get(number, 0)
    counts[number] = previous + 1
    print(f"키 {number}: 이전 횟수 {previous} → {counts[number]}")

print(counts)
print("없는 키 조회:", counts.get(99, 0))
print("조회 후 키 존재:", 99 in counts)
```

첫 번째 7을 만났을 때는 키가 없어 0을 읽고 1을 저장한다. 두 번째 7을 만났을 때는 저장된 1을 읽고 2로 바꾼다. 이를 한 줄로 쓰면 `counts[number] = counts.get(number, 0) + 1`이다.

`get()` 없이 같은 갱신을 풀어 쓰면 다음과 같다.

```run-python
counts = {}
for number in [7, 2, 7]:
    if number in counts:
        counts[number] += 1
    else:
        counts[number] = 1

print(counts)
```

## 한 번만 등장한 값 중 먼저 나온 값

`[9, 5, 9, 2]`에서 한 번만 등장한 값은 5와 2다. 원래 순서에서 먼저 나온 값은 5다. 숫자 크기를 비교하거나 정렬하면 이 조건을 바꾸게 된다.

각 값의 전체 등장 횟수를 먼저 구하고, 원래 List를 앞에서부터 다시 읽으면 된다. 한 번만 등장한 첫 값을 만나는 순간 그 값을 반환한다. 아래 함수는 입력에 음수가 없다고 정하고, 해당하는 값이 없으면 -1을 반환한다.

```run-python
def first_unique(numbers):
    counts = {}
    for number in numbers:
        counts[number] = counts.get(number, 0) + 1

    for number in numbers:
        if counts[number] == 1:
            return number

    return -1


for numbers in ([9, 5, 9, 2], [4, 4, 8, 8], [0], []):
    print(numbers, "→", first_unique(numbers))
```

출력은 차례로 5, -1, 0, -1이다. 두 번째 순회는 정렬된 키가 아니라 원래 List를 읽기 때문에 먼저 등장한 위치를 유지한다.

중복을 발견하자마자 `break`하면 아직 읽지 않은 값의 횟수를 세지 못한다. 또한 두 번째로 나온 위치만 중복으로 표시하면 첫 번째 위치가 고유한 값으로 남는다. 전체 횟수를 먼저 세면 같은 값을 가진 모든 위치를 일관되게 판별할 수 있다.

`return`은 함수 실행을 끝내고 값을 호출한 곳으로 돌려준다. 값을 찾지 못한 경우에도 `return -1`에 도달하도록 해야 한다. 끝에 `pass`만 쓰거나 아무것도 쓰지 않으면 함수는 `None`을 반환한다. [함수의 반환](https://docs.python.org/3/tutorial/controlflow.html#defining-functions)

### 위치별 상태를 따로 기록하는 방법

원래 값과 위치별 고유 여부를 각각 보관하는 방식도 가능하다. 아래에서는 List 전체에서 각 값의 횟수를 센 뒤 상태를 기록한다. 따라서 앞서 나온 중복 값도 고유한 것으로 남지 않는다.

```run-python
def first_unique_with_flags(numbers):
    values = numbers.copy()
    unique = [True] * len(values)
    for index in range(len(values)):
        if values.count(values[index]) > 1:
            unique[index] = False

    for index in range(len(values)):
        if unique[index]:
            return values[index]
    return -1


print(first_unique_with_flags([9, 5, 9, 2]))
print(first_unique_with_flags([4, 4, 8, 8]))
```

결과는 같지만 `count()`가 호출될 때마다 List를 끝까지 훑는다. N개 위치에서 N개 값을 세므로 O(N²)다. 별도 상태 List를 만들지 않고 등장 횟수를 한 번씩 누적하면, Dict 조회가 평균 O(1)인 조건에서 두 순회를 평균 O(N)에 마칠 수 있다. 이때 필요한 추가 공간은 서로 다른 값의 수만큼이며 최대 O(N)이다.

## `Counter`와 두 개의 Set

`Counter`는 `collections`에 있는 표준 라이브러리 Class다. 입력을 받아 각 항목의 개수를 저장하며, 없는 키를 조회하면 0을 반환한다. `dict.get()`으로 직접 누적한 작업을 간결하게 표현할 때 사용할 수 있다. [Counter](https://docs.python.org/3/library/collections.html#collections.Counter)

```run-python
from collections import Counter

numbers = [9, 5, 9, 2]
counts = Counter(numbers)
print("등장 횟수:", dict(counts))
print("없는 값의 횟수:", counts[100])

answer = -1
for number in numbers:
    if counts[number] == 1:
        answer = number
        break
print("먼저 나온 고유한 값:", answer)
```

여기서 `break`는 횟수를 모두 센 뒤 답을 찾는 반복문에 있다. 이미 답을 찾았으므로 더 읽을 필요가 없다. 횟수를 세던 중간에 반복을 중단하는 경우와 구분해야 한다.

정확한 횟수가 필요 없고 중복 여부만 필요하다면 Set 두 개를 사용할 수도 있다. `seen`에는 한 번이라도 본 값을, `duplicated`에는 두 번 이상 본 값을 넣는다.

```run-python
def first_unique_with_sets(numbers):
    seen = set()
    duplicated = set()
    for number in numbers:
        if number in seen:
            duplicated.add(number)
        else:
            seen.add(number)

    for number in numbers:
        if number not in duplicated:
            return number
    return -1


print(first_unique_with_sets([9, 5, 9, 2]))
print(first_unique_with_sets([4, 4, 8, 8]))
```

Set 하나로 중복을 제거하면 두 번 나온 값과 한 번 나온 값을 구별할 수 없다. 두 번째 Set이 중복 여부를 따로 기억해 이 정보를 보완한다. Set 자체의 순서에 기대지 않고 원래 List를 다시 순회하므로 답의 순서도 유지된다. 정확한 빈도가 필요하면 Dict나 Counter를, 존재 여부만 필요하면 Set을 선택할 수 있다.
