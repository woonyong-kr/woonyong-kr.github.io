---
layout: default
title: IP
nav_order: 3
permalink: /wiki/computer-systems-network-ip-cf75ea1b870d/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-ip-cf75ea1b870d
projection_sha256: eb928da5cd5cd1783b1769682dc5a69d608c7fa4797e4932531f758dd9a035c9
parent: 네트워크
content_status: ready
public_parent_id: Wiki/computer-systems-network/network
grand_parent: Systems
ancestor: CS
---

# IP
{: .no_toc }

IP(Internet Protocol)는 패킷에 출발지와 목적지 주소를 담고 네트워크 사이에서 전달하는 역할을 한다. 송신 측은 목적지 주소와 Route를 바탕으로 다음 전달 지점을 선택하며, Router도 자신의 Routing Table을 보고 다음 구간으로 패킷을 보낸다.

IP는 전달을 시도하지만 도착, 순서와 중복 방지를 보장하지 않는다. 이를 Best-effort Delivery라고 한다. 패킷이 유실되거나 순서가 바뀌었을 때 복구할 필요가 있는지는 상위 계층에서 판단한다. TCP는 이 위에서 재전송과 순서 있는 Stream을 제공하고, UDP 자체는 이런 복구를 수행하지 않는다.

## 주소가 가리키는 대상

IPv4 주소는 32 Bit, IPv6 주소는 128 Bit다. IPv4는 `192.168.1.1`처럼 점으로 나뉜 네 개의 십진수로 흔히 표현하고, IPv6는 `::1`처럼 16진수와 콜론을 사용한다.

주소를 컴퓨터 한 대의 고정 이름으로만 생각하면 여러 인터페이스나 가상 주소가 있는 구성을 설명하기 어렵다. 한 시스템이 여러 주소를 가질 수 있고, 주소는 네트워크의 배치와 설정에 따라 바뀔 수 있다. 이름을 계속 사용하면서 현재 주소를 찾는 역할은 [DNS](/wiki/computer-systems-network-dns-c7fd180532b4/)와 연결된다.

IP 주소만으로 어느 애플리케이션에 데이터를 전달할지 모두 정해지는 것은 아니다. TCP와 UDP는 [Port](/wiki/computer-systems-network-topic-3c0bb7fb878f/)를 함께 사용한다. 예를 들어 `192.168.1.1:80`은 IPv4 주소와 Port의 조합이며, 실제 통신을 판단할 때는 TCP인지 UDP인지도 구분해야 한다.

## 주소가 있어도 통신하지 못하는 이유

출발지에 IP 주소를 설정했다고 목적지까지 경로가 생기는 것은 아니다. 같은 Subnet으로 직접 보낼 수 있는지, 다른 네트워크라면 어느 Gateway로 넘기는지, 돌아오는 경로가 있는지를 살펴야 한다. 도중의 방화벽 정책이나 목적지 서비스의 상태도 통신 결과에 영향을 준다.

클라우드에서 이 차이를 확인하는 사례가 [가상 네트워크](/wiki/platform-delivery-operations-topic-82e47b673856/)다. 주소 범위가 맞아도 Route Table과 Gateway가 다르면 외부에 도달하지 못할 수 있다. 반대로 네트워크 경로가 정상이어도 목적지 Port에 서버가 없다면 애플리케이션 연결은 실패한다.

IP는 전송할 데이터 전체를 하나의 메시지로 보존하는 계층도 아니다. 응용 메시지와 TCP Segment, IP 패킷, Link Frame은 서로 다른 단위다. 이 관계는 [네트워크](/wiki/network/)의 계층 구조에서 함께 살펴본다.
