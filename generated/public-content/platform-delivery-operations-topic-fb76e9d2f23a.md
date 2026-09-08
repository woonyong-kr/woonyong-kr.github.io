---
layout: default
title: 객체 저장소
nav_order: 6
permalink: /wiki/platform-delivery-operations-topic-fb76e9d2f23a/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/platform-delivery-operations-topic-fb76e9d2f23a
projection_sha256: ea4c2c6c4b7755af77e94fabc946443651fb7024c55093d0c4639f7af2c34d3e
parent: 클라우드
content_status: ready
public_parent_id: Wiki/platform-delivery-operations/cloud
grand_parent: 플랫폼
---

# 객체 저장소
{: .no_toc }

웹 페이지의 HTML과 이미지를 웹 서버 디스크에 함께 보관한다고 하자. 서버를 교체하거나 여러 대로 늘리면 같은 파일을 어디에 두고 배포할지도 정해야 한다. 파일을 별도 저장소에 올리고 주소로 읽게 하면, 애플리케이션을 실행하는 서버와 파일을 전달하는 역할을 나눌 수 있다.

객체 저장소(Object Storage)는 파일의 내용과 이를 식별하는 Key를 묶어 관리한다. Amazon S3에서는 객체를 담는 단위를 Bucket, 저장한 파일을 Object라고 부른다. `index.html`과 `aws.png`를 같은 Bucket에 올리더라도 각각 다른 Key로 읽고 갱신한다.

## S3로 정적 페이지 전달하기

S3의 정적 웹 호스팅은 HTML, CSS, 이미지처럼 저장한 파일을 그대로 내려주는 데 적합하다. 서버에서 프로그램을 실행해 응답을 만드는 웹 애플리케이션과는 역할이 다르다. 애플리케이션의 이미지나 다운로드 파일만 S3에 두는 구성도 가능하다.

여기서는 AWS 실습 기록에 있는 구성을 예로 든다. S3에는 소개 페이지를 올리고, 그 페이지의 링크로 ALB 뒤의 웹 애플리케이션에 접속한다. ALB(Application Load Balancer)는 HTTP 요청을 실제 웹 서버에 전달하는 진입점이다. 다음은 실행 결과가 아니라 브라우저가 요청할 대상을 나눈 구성도다.

```text
브라우저
  ├─ S3 Website Endpoint에서 index.html 요청
  ├─ HTML에 적힌 Object URL로 aws.png 요청
  └─ 사용자가 링크를 누르면 ALB DNS 주소로 이동
       └─ ALB가 EC2 웹 서버로 요청 전달
```

S3가 ALB를 대신 실행하거나 요청을 중계하는 구성은 아니다. HTML을 받은 브라우저가 이미지와 링크의 주소를 읽고 각각 요청한다. 따라서 S3 페이지가 보인다는 사실만으로 ALB 뒤의 애플리케이션까지 정상이라고 판단할 수 없다.

## Bucket에 파일 올리기

실습용 Bucket 이름은 `immersion-day-user-name`처럼 구분하기 쉽게 정한다. 이 이름은 예시이므로 실제 생성 가능 여부를 확인해야 한다. 공유 Global Namespace의 일반 Bucket 이름은 같은 AWS Partition 안의 모든 계정과 Region에서 고유해야 한다. 현재 S3에는 Account Regional Namespace 선택지도 있으므로, 모든 Bucket의 이름 규칙을 단순히 ‘전 세계에서 고유하다’로 외우지 않는다. [S3 Bucket Namespace](https://docs.aws.amazon.com/AmazonS3/latest/userguide/gpbucketnamespaces.html)

Bucket을 만든 뒤 다음 두 파일을 올린다.

| Object Key | 파일에 담을 내용 |
| --- | --- |
| `aws.png` | 페이지에 표시할 이미지 |
| `index.html` | 이미지 Object URL과 ALB DNS 주소를 가리키는 링크 |

업로드 후 두 Object가 모두 있는지 확인한다. 아직 ALB가 없다면 HTML을 먼저 올리고, ALB를 만든 뒤 실제 DNS 주소를 반영해 다시 업로드할 수 있다. 이때 수정하는 대상은 링크가 들어 있는 `index.html`이다.

## 파일 주소와 웹 사이트 주소

Object URL은 `aws.png`처럼 특정 파일 하나를 가리킨다. Website Endpoint는 Bucket의 웹 사이트 설정을 적용해 응답한다. Bucket의 Properties에서 Static website hosting을 켜고 Index Document를 `index.html`로 지정하면, Website Endpoint의 루트 주소에서 그 파일을 받을 수 있다.

두 주소는 같은 파일을 읽더라도 동작이 같지 않다. S3 Website Endpoint는 Index Document와 웹 사이트용 오류 응답을 제공하지만 HTTPS를 지원하지 않는다. HTTPS가 필요한 공개 사이트는 CloudFront나 Amplify Hosting 같은 배포 구성을 함께 검토한다. Object를 읽는 REST API Endpoint의 HTTPS 지원과 혼동하지 않는다. [S3 Website Endpoint](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html)

브라우저에서 확인할 대상도 세 가지다. Website Endpoint에서 HTML이 열리는지, 이미지가 표시되는지, 링크를 누르면 의도한 ALB 주소로 이동하는지를 각각 확인한다.

## 공개 읽기와 403 응답

Website Endpoint로 직접 공개하려면 대상 Object를 누구나 읽을 수 있어야 한다. 새 Bucket의 Object Ownership 기본값은 `Bucket owner enforced`이며 ACL은 비활성화되어 있다. 이 상태에서는 Object ACL을 여는 대신 Bucket Policy 등 정책으로 접근을 제어한다. 예전 실습 화면에 ACL 항목이 있다고 해서 기본 설정을 바꿀 필요는 없다. [웹 사이트 접근 권한](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteAccessPermissionsReqd.html)

공개 읽기를 허용하는 정책이 있어도 Block Public Access가 이를 차단할 수 있다. Bucket뿐 아니라 계정과 조직에서 적용하는 설정까지 확인해야 한다. Bucket 설정만 해제하면 언제나 공개된다고 가정해서는 안 된다. 직접 공개할 파일만 실습 Bucket에 넣고, 읽기 허용과 업로드·삭제 권한을 구분한다. [S3 Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)

파일은 올렸는데 페이지가 열리지 않는다면 실패한 요청부터 구분한다.

| 관찰한 현상 | 먼저 확인할 대상 |
| --- | --- |
| Object URL은 열리지만 사이트 루트가 열리지 않는다 | Website Hosting 활성화 여부, Index Document의 이름과 실제 Key |
| Website Endpoint가 `403 AccessDenied`를 반환한다 | 해당 Object의 읽기 정책과 Block Public Access. ACL을 사용하는 기존 Bucket이라면 소유권과 ACL도 확인 |
| HTML은 열리지만 이미지가 보이지 않는다 | HTML에 적힌 이미지 URL, Object 존재 여부와 읽기 권한 |
| 링크가 이전 앱으로 이동한다 | `index.html`에 남아 있는 ALB DNS와 재업로드 여부 |
| ALB 주소까지 이동했지만 앱이 응답하지 않는다 | ALB 존재 여부, Target Group의 Health Check와 웹 서버 상태 |

`403`만 보고 공개 차단을 전부 해제하는 것은 원인 진단이 아니다. 어떤 주소의 어떤 Object를 읽으려 했는지 확인한 뒤, 필요한 접근 경로의 설정을 고친다.

## 같은 Key의 이전 버전

링크를 잘못 바꾼 `index.html`을 올렸다면 이전 파일로 되돌릴 수 있을까? Bucket Versioning을 켜면 같은 Key에 새 파일을 올려도 이전 버전이 보존된다. 수정한 HTML을 다시 업로드하고 Object Versions에서 새 버전과 이전 버전을 구분할 수 있는지 살펴본다.

Versioning은 수정한 부분만 저장하는 기능이 아니다. 각 버전의 전체 Object가 저장되므로 보존한 버전도 저장 공간을 사용한다. Versioning이 켜진 Bucket에서 일반 삭제를 하면 이전 버전이 모두 사라지는 대신 Delete Marker가 추가될 수 있다. 실습 Bucket을 비울 때는 현재 Object뿐 아니라 이전 버전과 Delete Marker까지 확인해야 한다. [S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)

실습이 끝나면 공개 접근을 닫거나, 보존할 자료를 확인한 뒤 Bucket을 비우고 삭제한다. 웹 서버와 ALB 구성은 [컴퓨팅](/wiki/platform-delivery-operations-topic-f3ba65e8d3b9/), 남은 리소스와 과금 확인은 [비용 관리](/wiki/platform-delivery-operations-topic-342f2ec03420/)로 이어진다. 이 글의 설정은 실습 절차와 공식 문서를 바탕으로 설명했으며, 현재 AWS 계정에서 배포나 삭제를 실행한 기록은 아니다.
