---
layout: default
title: 관리형 서비스
nav_order: 7
permalink: /wiki/platform-delivery-operations-topic-f5955687c1b2/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/platform-delivery-operations-topic-f5955687c1b2
projection_sha256: 40f9e59dc3884fbe5e8ce1294743f49ade426d80ecb286e5f994907b30986e83
parent: 클라우드
content_status: ready
public_parent_id: Wiki/platform-delivery-operations/cloud
grand_parent: 플랫폼
---

# 관리형 서비스
{: .no_toc }

관리형 서비스는 공급자가 서비스 운영의 일부를 맡는 방식이다. 애플리케이션 개발자는 제공되는 기능과 운영 범위를 확인하고, 자신의 데이터와 접근 권한을 설계한다. 서비스를 생성했다고 접속 경로나 권한 설정까지 저절로 완성되는 것은 아니다.

## Aurora에서 살펴볼 경계

Aurora를 사용하는 웹 앱은 DB 연결과 Secret 조회라는 두 경로를 함께 다룬다. Security Group은 네트워크 접근을, IAM Role은 Secret을 읽을 권한을, DB 계정은 데이터베이스 내부 권한을 정한다. 한 경로가 열려 있어도 다른 경로에서 실패할 수 있다.

[Aurora](/wiki/aurora/)에서는 기존 실습 구성을 따라 이 경계를 살펴본다. 인스턴스를 생성하는 순서뿐 아니라 연결 오류를 구분하고, 실습을 마친 뒤 무엇을 보존하거나 삭제할지도 함께 다룬다.
