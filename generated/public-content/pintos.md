---
layout: default
title: PintOS
nav_order: 10
permalink: /wiki/pintos/
publication_state: publish
has_toc: true
projection_id: Wiki/projects/pintos
projection_sha256: d50539faa7838cc946548fb38dac5d7350c776d544587d6405f2bd702d4ddca3
parent: OS
content_status: ready
public_parent_id: Wiki/computer-systems-network/os
grand_parent: Systems
ancestor: CS
---

# PintOS
{: .no_toc }

실행할 Thread를 고르는 순간과 가상 주소를 실제 Frame에 연결하는 순간에는 서로 다른 자원 관리 규칙이 필요하다. PintOS에서는 작은 교육용 커널의 코드를 따라가며 이 규칙이 어디서 적용되는지 확인할 수 있다. 구현을 보관하는 저장소는 `lrn-pintos`다.

## Thread에서 프로세스로

Threads 영역에서는 스케줄링, 동기화와 인터럽트를 다룬다. `pintos/threads/thread.c`와 `synch.c`를 함께 읽으면 실행 순서를 고르는 코드와 대기 중인 Thread를 깨우는 코드의 관계를 살펴볼 수 있다.

User Programs에서는 사용자 프로그램을 적재하고 System Call을 처리한다. `pintos/userprog/process.c`의 `fork`, `exec`, `wait` 흐름을 따라가면 부모와 자식 프로세스가 실행 상태와 종료 결과를 주고받는 경계를 확인할 수 있다.

## 가상 메모리와 Frame의 수명

Virtual Memory에서는 Page Fault를 계기로 Page를 준비하고, 필요에 따라 Swap이나 파일에서 내용을 읽는다. `pintos/vm/vm.c`, `anon.c`, `file.c`가 각각 공통 VM 경로, 익명 Page, 파일 기반 Page를 다룬다.

Copy-on-Write에서는 부모와 자식이 Frame을 공유하다가 쓰기 시점에 분리한다. 공유 횟수뿐 아니라 누가 Frame을 참조하는지도 회수 판단에 필요하므로, 구조체와 해제 경로를 함께 읽어야 한다.

## 구현과 실행 환경

이 저장소는 KAIST PintOS를 바탕으로 한 크래프톤 정글 팀 구현의 개인 보존 저장소다. 제공된 커널 기반 코드와 팀 구현, 개인 기여를 구분한다. 교육용 커널에서 확인한 결과를 실제 서비스 운영 경험으로 확대하지 않는다.

검증 환경은 x86-64와 QEMU를 사용한다. 저장소에 기록된 이전 테스트 결과와 현재 커밋의 CI 결과는 구분해서 확인한다.

- [lrn-pintos](https://github.com/woonyong-kr/lrn-pintos)
- [영역별 구현 기록](https://github.com/woonyong-kr/lrn-pintos/tree/main/docs/pintos)
- [가상 메모리 코드](https://github.com/woonyong-kr/lrn-pintos/tree/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/vm)
- [CI 실행 결과](https://github.com/woonyong-kr/lrn-pintos/actions/workflows/ci.yml)
