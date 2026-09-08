---
layout: default
title: lrn-sql
nav_order: 15
permalink: /wiki/lrn-sql/
publication_state: publish
has_toc: true
projection_id: Wiki/projects/minidb
projection_sha256: 28918c6919782a1c51302993850a696eb52ff4478e083c35949cfed6586883ba
parent: Database
content_status: ready
public_parent_id: Wiki/data-storage
search_terms:
- SQL
- lrn-sql
- MiniDB
- minidb
grand_parent: Data
---

# lrn-sql
{: .no_toc }

`SELECT`로 요청한 행이 파일에서 돌아오기까지는 문장 해석, 실행 계획, Index 탐색과 Page 읽기가 이어진다. lrn-sql은 이 경로를 C로 구현한 학습 저장소다. SQL 문법 자체는 [SQL](/wiki/sql/)에서 다루고, 여기서는 문법이 저장 구조와 만나는 지점을 살펴본다.

## 요청에서 저장소까지

`src/sql/parser.c`는 문장을 해석하고, `planner.c`와 `executor.c`는 실행할 작업과 데이터 접근 경로를 연결한다. `src/storage/bptree.c`는 정렬된 Key의 탐색과 분할을, `table.c`는 Page 안의 행 저장을 맡는다. `pager.c`는 상위 계층과 파일 I/O 사이에서 Page Cache를 관리한다.

이 계층을 나눠 읽으면 쿼리 결과가 잘못됐을 때 문장 해석 문제인지, 탐색 경로 문제인지, 저장된 바이트의 문제인지 확인할 위치를 좁힐 수 있다.

## 동시성과 내구성의 경계

Row Lock과 Range Lock을 관리하는 코드는 `src/server/lock_table.c`에 있다. 문장 실행 후 Lock을 해제하는 경로도 있으므로, 동시성 제어가 전혀 없다고 설명하면 실제 구현을 놓친다. 다만 이 구조를 WAL 기반 장애 복구나 MVCC를 갖춘 범용 DBMS와 같다고 볼 수는 없다.

저장소의 PostgreSQL 비교 기록 역시 내구성 설정과 실행 조건이 다르다는 한계를 명시한다. 특정 수치만 떼어 운영 DB보다 빠르다는 결론으로 사용하지 않는다.

## 코드와 구현 기록

크래프톤 정글 팀 구현의 개인 보존 저장소다. 공동 구현과 개인 기여는 원본 팀 저장소와 커밋 이력으로 구분한다.

- [lrn-sql](https://github.com/woonyong-kr/lrn-sql)
- [SQL 구현 설명](https://github.com/woonyong-kr/lrn-sql/tree/main/docs/sql)
- [동시성 제어 코드](https://github.com/woonyong-kr/lrn-sql/blob/49ac2cbf310c1d8df720432833664e319484fdcc/src/server/lock_table.c)
- [벤치마크의 조건과 한계](https://github.com/woonyong-kr/lrn-sql/blob/49ac2cbf310c1d8df720432833664e319484fdcc/docs/benchmark-postgres.md)
