---
layout: default
title: 가상 머신
nav_order: 2
permalink: /wiki/computer-systems-network-topic-deac44c773cf/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-deac44c773cf
projection_sha256: d3cc8e30c61a13418d57f4ed75273017d6b4ea7f42a80e9104f835b386063d13
parent: 가상화
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-32f58d9d99d8
search_terms:
- VM
- Virtual Machine
- Guest
- Host
- Hypervisor
- TCG
- KVM
- Hyper-V
- Root Partition
- HVF
- WHPX
grand_parent: OS
ancestor: CS 기초
---

# 가상 머신
{: .no_toc }

PintOS를 실행하는 창을 닫아도 Host OS는 계속 동작한다. PintOS는 Host 안에서 별도의 CPU 상태와 메모리·장치를 제공받는 Guest이기 때문이다. 여기서 **가상 머신(VM)**은 Guest OS가 부팅하고 프로그램을 실행할 수 있도록 제공한 머신 환경을 가리킨다.

CPU 명령을 실행하는 방법, 메모리를 연결하는 방법, 장치를 제공하는 방법은 서로 다를 수 있다. 모든 부품을 C 코드로 하나씩 흉내 내야만 가상 머신이 되는 것은 아니다. QEMU의 system emulation도 TCG 번역뿐 아니라 여러 가속기와 장치 구성을 지원한다. [QEMU의 머신과 가속기](https://www.qemu.org/docs/master/system/introduction.html)

## Guest가 쓰는 자원과 Host의 자원

Guest는 자신의 Register, 주소 공간, 인터럽트와 장치를 사용한다. 그러나 Guest의 물리 주소가 곧 Host 물리 주소인 것은 아니며, Guest Thread 하나가 반드시 Host Thread 하나와 대응하는 것도 아니다.

| Guest에서 보이는 것 | Host 쪽에서 확인할 것 |
|---|---|
| vCPU와 Register | 실행 상태를 저장·복원하는 구현과 가속기 |
| Guest RAM | backing 영역과 두 단계의 주소 변환 |
| 디스크 | 장치 모델, 이미지 형식과 Storage Backend |
| Timer·IRQ | 가상 시간, 장치 모델과 인터럽트 전달 |
| 부팅 | 선택한 Machine, Firmware·Boot 이미지 |

이 경계를 제공하고 자원 접근을 조정하는 계층을 Hypervisor라고 부른다. CPU를 직접 실행하는 경로와 장치를 처리하는 경로가 같은 소프트웨어 한곳에 있어야 하는 것은 아니다. 예를 들어 QEMU와 Linux KVM은 사용자 공간의 머신 구성과 커널의 가상화 API가 함께 동작하는 조합이다. 세부 실행 경로는 [QEMU](/wiki/computer-systems-network-qemu-b1366076be02/)의 TCG·KVM 비교로 이어진다.

## Type 구분만으로 실행 구조가 정해지지는 않는다

Type 1은 하드웨어 위에서 가상화 계층이 동작하는 구성을, Type 2는 Host OS 위의 소프트웨어가 머신 환경을 제공하는 구성을 설명할 때 사용한다. 이 구분은 출발점이지만 제품 이름 하나를 붙이는 것으로 CPU·장치·관리 도구의 위치가 모두 설명되지는 않는다.

Hyper-V에는 Hypervisor와 별도로 Windows를 실행하는 Root Partition이 있고, 그 안에 관리 기능과 장치 접근 경로가 있다. Hypervisor와 관리용 OS의 역할을 나누어 읽어야 하는 구성이다. QEMU 프로세스가 보인다는 사실만으로 CPU 실행까지 언제나 사용자 공간의 에뮬레이션이라고 판단할 수도 없다. [Hyper-V의 Root·Child Partition](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/architecture)

구성을 비교할 때는 Guest CPU를 누가 실행하는지, 장치 요청을 누가 받는지, Host 자원을 누가 할당하는지 차례로 확인하는 편이 정확하다. 공유 디렉터리·장치 연결 같은 설정도 경계에 영향을 주므로 Guest의 중단과 Host의 완전한 안전을 같은 주장으로 묶지 않는다.

## TCG와 하드웨어 가속을 선택하는 조건

TCG는 지원되는 Guest 명령을 Host 코드로 번역하므로 서로 다른 아키텍처 사이의 실행에 사용할 수 있다. Apple Silicon에서 x86-64 PintOS를 실행하는 경우가 그 예다. 하드웨어 가속은 Host OS와 CPU, Guest 아키텍처가 지원하는 조합이어야 한다. Linux의 KVM, macOS의 Hypervisor Framework, Windows Hypervisor Platform 등은 Host 조건도 서로 다르다. [QEMU가 지원하는 가속기](https://www.qemu.org/docs/master/system/introduction.html#virtualisation-accelerators)

하드웨어 가속이 항상 정해진 속도를 보장하는 것은 아니다. VM Exit, 메모리 변환, 장치 접근, Host의 스케줄링과 작업 내용이 영향을 준다. TCG도 번역한 코드를 재사용하지만 모든 실행이 네이티브와 같은 비용으로 바뀌는 것은 아니다.

PintOS 저장소 `9d1b14c`의 실행기는 `qemu-system-x86_64`와 CPU 모델 `qemu64`를 사용한다. 메모리 옵션의 기본값은 **256 MiB**이며, 활성화된 KVM 인자는 없다. `--gdb`일 때 `-s`·`-S`를 추가한다. [실행기가 만드는 인자](https://github.com/woonyong-kr/lrn-pintos/blob/9d1b14cbdf41425ba8867af743c03cf32190ee9b/pintos/utils/pintos#L115)

`-s`는 GDB Stub의 TCP 1234 포트를 여는 약어이고 `-S`는 Guest CPU가 시작부터 실행되지 않게 한다. GDB가 연결됐다는 사실만으로 자동 실행을 시작하지는 않는다. 디스크의 Boot·파일 시스템·Scratch·Swap 배치와 실제 이미지 연결은 [BlockBackend](/wiki/qemu-block-backend/)에서 확인한다.

## 실행 중인 대상을 구별하며 읽는다

Guest GDB는 Guest CPU와 Guest 메모리를 읽는다. Host Debugger는 QEMU 프로세스의 구조체와 Host 주소를 읽는다. 같은 숫자가 보여도 주소 공간과 저장한 상태가 다르므로 한쪽의 포인터를 다른 쪽에서 그대로 해석하지 않는다.

PintOS가 `fork()`로 자식 프로세스를 만들거나 `cli`로 인터럽트를 막는 것도 Guest 안의 동작이다. Host 프로세스를 같은 수만큼 만들거나 Host 전체의 인터럽트를 끄는 명령이 아니다. syscall·Thread·주소 변환과 장치 요청의 각 경계는 [QEMU](/wiki/computer-systems-network-qemu-b1366076be02/)에서 실제 PintOS 코드와 연결해 읽을 수 있다.
