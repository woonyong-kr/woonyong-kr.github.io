---
layout: default
title: 관리형 서비스
nav_order: 7
permalink: /wiki/platform-delivery-operations-topic-f5955687c1b2/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/platform-delivery-operations-topic-f5955687c1b2
projection_sha256: e1b179880c58b9b301f8dc3a4da6a9c02a7d0f7251195b1bdd3c3a725178a1c9
parent: 클라우드
content_status: ready
public_parent_id: Wiki/platform-delivery-operations/cloud
grand_parent: 플랫폼
---

# 관리형 서비스
{: .no_toc }

관리형 서비스는 공급자가 서비스 운영의 일부를 맡는 방식이다. 애플리케이션 개발자는 제공되는 기능과 운영 범위를 확인하고, 자신의 데이터와 접근 권한을 설계한다. 서비스를 생성했다고 접속 경로나 권한 설정까지 저절로 완성되는 것은 아니다.

[Aurora](/wiki/aurora/)를 사용하는 웹 앱에는 DB 연결과 Secret 조회라는 두 경로가 있다. Security Group은 네트워크 접근을, IAM Role은 Secret을 읽을 권한을, DB 계정은 데이터베이스 내부 권한을 정한다. 한 경로가 열려 있어도 다른 경로에서 실패할 수 있다. Aurora 문서에서는 연결 오류를 구분하고 실습 리소스를 보존하거나 삭제하는 범위까지 살펴본다.

[Amazon Bedrock](/wiki/amazon-bedrock/)에서는 문서 색인과 검색·생성 연결을 관리형으로 구성한다. 원문과 Service Role, Vector Store의 상태가 맞아야 검색할 수 있으며, 결과가 나왔다는 사실과 답변의 근거가 충분하다는 판단은 구분해야 한다. 도구의 실행 권한과 입력·출력 검사도 애플리케이션이 정할 부분이다.
