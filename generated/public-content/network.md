---
layout: default
title: 네트워크
nav_order: 4
permalink: /wiki/network/
publication_state: publish
has_toc: true
projection_id: Wiki/computer-systems-network/network
projection_sha256: f7a0240fcdb1c92b801ea740f1b01972d85eb0c530868030e8ab756c00b15c65
parent: 시스템
content_status: ready
public_parent_id: Wiki/computer-systems-network
---

# 네트워크
{: .no_toc }

네트워크에서 데이터를 보낸다는 일은 여러 문제를 나누어 푸는 과정이다. 어느 주소로 보낼지, 목적지의 어느 소켓에 전달할지, 빠진 데이터를 다시 보낼지, 받은 Byte를 어떤 메시지로 해석할지가 서로 다르다.

예를 들어 웹 주소를 입력하면 DNS로 주소를 구하고, 선택한 전송 프로토콜로 통신하며, HTTP 규칙에 따라 요청과 응답을 해석한다. 이 과정의 역할을 나누어 보면 화면에 같은 연결 오류가 나타나더라도 어느 단계부터 확인할지 판단하기 쉽다.

## TCP/IP의 네 계층

TCP/IP 모델은 인터넷 통신을 응용·전송·인터넷·Link 계층으로 나누어 설명한다. 다음 표는 위에서 아래로 송신 데이터가 처리되는 순서다.

| 계층 | 맡는 일과 예 |
| --- | --- |
| 응용 | 메시지의 의미와 교환 규칙. HTTP, DNS, FTP, SSH |
| 전송 | 소켓 간 데이터 전달. TCP, UDP |
| 인터넷 | 네트워크 사이의 주소 지정과 전달. IP, ICMP |
| Link | 연결된 구간에서 Frame 전달. Ethernet, Wi-Fi |

응용 데이터에 TCP 또는 UDP 헤더가 붙고, 이를 담은 IP 패킷이 Link 계층의 Frame으로 전달된다. 수신 측은 각 계층에서 필요한 정보를 처리하고 응용에 데이터를 넘긴다. 이때 응용의 한 번의 쓰기와 네트워크 패킷 하나가 반드시 대응하는 것은 아니다.

IPv4에서 이웃의 Link 주소를 구하는 ARP는 IP 패킷 안에 실리는 전송 프로토콜이 아니다. 여기서는 Link 계층과 주소 해석의 관계로 다룬다. 계층의 기본 구분은 [RFC 1122](https://datatracker.ietf.org/doc/html/rfc1122#section-1.1.3)에 설명되어 있다.

주소와 경로는 [IP](/wiki/computer-systems-network-ip-cf75ea1b870d/), 소켓의 서비스 구분은 [Port](/wiki/computer-systems-network-topic-3c0bb7fb878f/), 이름으로 주소를 찾는 과정은 [DNS](/wiki/computer-systems-network-dns-c7fd180532b4/)로 이어진다.

## TCP와 UDP를 고를 때

TCP와 UDP는 모두 IP 위에서 동작하지만 응용에 제공하는 전달 방식이 다르다.

| 기준 | TCP | UDP |
| --- | --- | --- |
| 응용이 받는 단위 | 순서가 있는 Byte Stream | Datagram |
| 연결 수립 | 연결 상태와 Handshake 사용 | 전송 전에 Handshake가 필요하지 않음 |
| 손실과 순서 변경 | 재전송·재조립으로 처리 | 프로토콜 자체가 복구하지 않음 |
| 흐름·혼잡 제어 | 제공 | 프로토콜 자체에는 없음 |
| 기본 헤더 | 최소 20 Byte | 8 Byte |

[TCP](/wiki/computer-systems-network-tcp-a7f7f386cd75/)는 누락되거나 순서가 바뀐 데이터를 응용이 일일이 복구하지 않도록 해 준다. SMTP, FTP, SSH처럼 순서 있는 전달을 사용하는 프로토콜에서 볼 수 있다. 다만 연결이 영원히 유지되거나 상대 애플리케이션의 처리가 반드시 성공한다는 뜻은 아니다.

[UDP](/wiki/computer-systems-network-udp-c5651ad64f2d/)를 사용하는 실시간 음성·게임에서는 늦어진 과거 데이터보다 최신 데이터가 중요할 수 있다. 그렇다고 UDP를 고르기만 하면 지연이 항상 낮아지는 것은 아니다. 손실을 허용할지, 어떤 메시지는 다시 보낼지, 혼잡을 어떻게 피할지 응용이나 상위 프로토콜에서 정해야 한다.

HTTP도 버전에 따라 전송 방식이 다르다. HTTP/1.1과 HTTP/2의 일반적인 연결은 TCP를 사용하지만 HTTP/3는 UDP 기반 QUIC을 사용한다. QUIC은 그 위에서 신뢰성 있는 Stream과 혼잡 제어 등을 제공한다. 따라서 HTTP는 항상 TCP이고 UDP는 신뢰성을 구현할 수 없다고 나누면 실제 구성을 설명하지 못한다. [HTTP/3 규격](https://www.rfc-editor.org/rfc/rfc9114.html)
