---
layout: default
title: Redis
nav_order: 12
permalink: /wiki/redis/
publication_state: publish
has_toc: true
projection_id: Wiki/data-storage/redis
projection_sha256: 3a8eab03038e9e023e6656bcf7fa4722982e0e827bd2db06759fc3d168f3a803
parent: Database
content_status: ready
public_parent_id: Wiki/data-storage
grand_parent: Data
---

# Redis
{: .no_toc }

Redis는 키에 값을 저장하고 자료형별 명령으로 데이터를 다루는 저장소다. 아래에서는 `lrn-redis`의 학습 구현을 따라 요청 파싱, 상태 변경, 만료와 복구가 이어지는 지점을 살펴본다.

## 명령 하나가 저장 상태를 바꾸는 경로

`SET cart:1 apple`을 전송했다고 해서 TCP 읽기 한 번에 요청 전체가 도착하는 것은 아니다. `lrn-redis`의 원본 구현 안내는 연결별 입력 버퍼에 바이트를 모으고, 파서가 완성된 RESP2 요청과 소비한 바이트 수를 반환한 뒤 남은 요청을 계속 처리하는 흐름을 설명한다. 입력 버퍼 상한과 연결당 처리량 제한은 큰 요청이나 명령을 계속 보내는 클라이언트가 자원을 독점하지 않도록 두는 경계다.

디스패처는 명령의 인자 수·숫자 형식·키의 자료형을 확인한 뒤 `DataStore`에 접근한다. Hash에는 직접 구현한 chaining 해시 테이블, Sorted Set에는 member→score 사전과 순서·rank를 관리하는 skiplist가 사용된다. List와 Set은 Python의 `deque`와 `set`을 사용한다. 자료형을 지원한다는 주장과 모든 내부 자료구조를 직접 구현했다는 주장을 구분해야 한다. [코드 실행 흐름 · 4ade14e](https://github.com/woonyong-kr/lrn-redis/blob/4ade14e1ec3ec2072d1ae9b7940946652bfb905e/docs/CODE-WALKTHROUGH.md)

## 메모리·만료·복구를 함께 유지하는 이유

메모리 제한을 검사할 때마다 모든 키의 크기를 다시 합하면 작은 키 하나를 변경해도 키 공간 전체의 크기에 영향을 받는다. 원본 안내의 갱신 경로는 변경할 키의 이전 크기와 새 크기 차이를 반영하고, `noeviction`으로 변경을 거절하면 그 키의 상태를 복원한다. Python 객체 크기 추정은 운영체제 RSS나 Redis allocator의 메모리 계측과 같은 값이 아니다.

만료 시각은 별도 상태로 보관하며 조회 시 만료 확인과 제한된 표본 순회를 함께 사용한다. 영속화에서는 성공한 쓰기를 RESP 명령으로 기록하고, 상대 TTL을 `PEXPIREAT`의 절대 시각으로 바꿔 재시작 때문에 수명이 늘지 않게 한다. 복구는 같은 디스패처를 다시 통과한다. `MINIRDB1` snapshot은 자체 형식이며 Redis RDB 호환 파일이 아니다. 여기서는 원본 revision의 설계 경로를 설명하며 전원 장애 시 저장 보장이나 현재 코드의 오류 처리를 새로 검증한 것은 아니다. [코드 실행 흐름 · 4ade14e](https://github.com/woonyong-kr/lrn-redis/blob/4ade14e1ec3ec2072d1ae9b7940946652bfb905e/docs/CODE-WALKTHROUGH.md)

## 53개 성공 사례와 완전 호환은 다른 주장이다

2026-07-31 보고서는 Redis 7.4.9와 공개 명령 53개의 대표 성공 경로를 비교해 53/53 일치를 기록했다. 순서가 계약이 아닌 응답은 정렬하고 TTL은 1초 차이를 허용했다. 이는 옵션 전체, 오류 문자열, 동시성 원자성, 내부 복잡도까지 같은 구현임을 뜻하지 않는다.

성능 비교는 Apple Silicon의 Linux aarch64 컨테이너, 단일 연결, 영속성과 maxmemory 비활성, warmup 50회·시나리오별 500회·전체 3회 조건이었다. 세 번 측정한 p95의 중앙값에서 GET은 기준 Redis의 1.10배, Sorted Set 갱신과 상위 조회는 4.14배였다. 네트워크·런타임·자료구조 비용이 섞인 역사적 관찰이며 운영 용량이나 최신 성능으로 사용하지 않는다.

이 보고서의 중요한 개선은 예외를 미구현으로 건너뛰던 검증기를 고친 것이다. 서비스 미준비, 명령 사례 누락, 응답 후조건 실패도 실패로 집계해야 오류 0건의 의미가 유지된다. 원본 결과 JSON과 명령 목록은 고정 revision의 보고서에서 함께 확인한다. [Redis 비교 검증 · 4ade14e](https://github.com/woonyong-kr/lrn-redis/blob/4ade14e1ec3ec2072d1ae9b7940946652bfb905e/docs/BENCHMARK.md)

## 재시작해도 만료 시각을 유지하기

10초 뒤 만료할 키를 저장하고 7초 뒤에 재시작한다고 해 보자. 복구할 때 상대 TTL 10초를 그대로 적용하면 원래보다 7초 늦게 만료된다. 아래 예제는 시간을 정수로 두고 두 방식의 차이를 계산한다. 실제 Redis 서버나 파일 복구를 실행하는 예제는 아니다.

```run-python
written_at = 1_000
ttl = 10
restarted_at = 1_007
deadline = written_at + ttl

wrong_deadline = restarted_at + ttl
remaining = max(0, deadline - restarted_at)
print("원래 만료 시각:", deadline)
print("상대 TTL을 다시 적용한 만료 시각:", wrong_deadline)
print("복구 시 남은 수명:", remaining, "초")
for now in [1_007, 1_010, 1_015]:
    print(now, "초:", "만료" if now >= deadline else "유효")
assert remaining == 3 and wrong_deadline - deadline == 7
```

만료 정보는 명령이 처리된 시점의 절대 시각과 함께 보존해야 한다. 위 계산은 시계가 같은 기준을 유지한다고 가정하며, 시스템 시계 보정이나 디스크 쓰기 보장은 별도의 문제다.
