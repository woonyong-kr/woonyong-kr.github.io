---
layout: default
title: 충돌
nav_order: 3
permalink: /wiki/computer-science-topic-8d3fce7eee29/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-8d3fce7eee29
projection_sha256: 6317ded013f6323b55b3e8e54092cebd05ea69bc8790df4487822d54ca3ecd78
parent: Hash Table
content_status: ready
public_parent_id: Wiki/keywords/computer-science-topic-c3f2953a97c2
search_terms:
- 충돌
- Hash Collision
- Hash 값
- Bucket
grand_parent: 자료구조
ancestor: CS 기초
---

# 충돌
{: .no_toc }

`cat`과 `act`라는 서로 다른 키를 저장하려는데 두 키가 같은 0번 Bucket을 가리킬 수 있다. 이처럼 다른 키가 같은 위치로 모이는 일이 충돌이다. 기존 값을 덮어쓰지 않으려면 두 항목을 보존할 방법을 정하고, 조회할 때도 실제 키를 비교해야 한다.

입력으로 받을 수 있는 서로 다른 키의 종류가 Bucket 수보다 많으면, 모든 키를 서로 다른 시작 위치에 배정할 수 없다. 좋은 Hash Function도 이런 충돌의 가능성 자체를 없애지는 못한다.

## Hash 값이 같은 경우와 Bucket만 같은 경우

문자 코드를 모두 더하는 함수에서는 `cat`과 `act`의 Hash 값이 모두 312다. 이 함수는 문자 순서를 반영하지 않는다. Bucket 배열을 키워도 같은 Hash 값에 같은 계산을 적용하므로 두 키는 다시 같은 Bucket을 선택한다.

다른 두 키의 Hash 값이 각각 5와 13이라면 Hash 값 자체는 다르다. 하지만 Bucket이 8개일 때는 둘 다 5번을 고른다. 16개로 늘리면 각각 5번과 13번으로 나뉜다.

| 계산한 Hash 값 | Bucket 수 | 선택한 위치 |
|---|---:|---|
| 312와 312 | 8 | 0과 0 |
| 312와 312 | 16 | 8과 8 |
| 5와 13 | 8 | 5와 5 |
| 5와 13 | 16 | 5와 13 |

재해싱이 모든 충돌을 없애는 작업은 아니다. Bucket 수가 부족해 같은 위치로 모인 일부 항목을 더 넓게 분산할 수 있지만, 같은 Hash 값을 가진 키는 여전히 충돌할 수 있다. Hash Function의 분포와 충돌 처리 방식이 모두 필요하다.

## 충돌한 항목을 보존하기

[Chaining](/wiki/computer-science-topic-16b53895ae32/)은 같은 Bucket의 항목을 연결해 두고 그 연결 안에서 키를 비교한다. [개방 주소법](/wiki/computer-science-topic-beb55415c2d3/)은 배열의 다른 위치를 찾아 저장하고, 조회 때도 같은 탐사 순서를 따른다.

두 방식 모두 찾는 키와 저장된 키가 같은지 확인해야 한다. Hash 값 비교를 먼저 하면 불필요한 키 비교를 줄일 수 있지만, Hash 값의 일치만으로 키의 일치를 대신할 수는 없다. Hash 기반 중복 판별에서도 충돌 가능한 Hash 값만 저장해 같은 값이라고 단정하면 서로 다른 자료를 잘못 합칠 수 있다.

키가 몰리는 입력에서는 탐색할 항목 수가 늘어난다. OpenJDK의 `HashMap`은 한 Bucket에 항목이 많아지고 구현 조건을 충족하면 연결 리스트를 균형 트리로 바꾼다. Java 8에서 도입된 충돌 완화 방식이지만, 같은 Hash 값을 가진 키 사이에서 비교 순서를 사용할 수 없는 경우까지 일괄 O(log n)을 보장하는 것은 아니다. API가 보장하는 범위와 사용 중인 구현의 조건을 구분해야 한다. [Java 8의 HashMap 변경](https://docs.oracle.com/javase/8/docs/technotes/guides/collections/changes8.html) · [OpenJDK 25 HashMap 구현](https://github.com/openjdk/jdk/blob/jdk-25-ga/src/java.base/share/classes/java/util/HashMap.java#L143-L170)
