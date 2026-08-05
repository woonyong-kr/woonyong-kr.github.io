var e=`[서비스 40여 개를 이벤트로 이은 설계](#/posts/event-stream)에는 청구서가 따라왔습니다. 논리적 경계로는 옳았던 분할을 물리적 배포 경계로 그대로 옮겼고, 그 결정이 AWS 청구서에 어떻게 나타났는지를 Git 이력과 대조해 회고했습니다.

먼저 밝혀 둘 것 두 가지입니다. 원본 시스템은 5인 팀의 것이고, 아래의 통합 작업은 프로젝트가 끝난 뒤 제가 개인적으로 확장한 것입니다. 그리고 같은 AWS 계정에서 팀의 다른 워크로드(게임 서버 노드그룹)가 함께 돌았기 때문에, **전송량 전부를 이 시스템 탓으로 돌릴 수 없습니다.** 이 두 경계를 지키면서 읽을 수 있는 것만 읽었습니다.

## 청구서가 보여준 것

7월 한 달 Regional Transfer 청구 사용량은 29,683.72GB, 사용 비용은 $296.83 이었습니다(프로모션 크레딧으로 전액 차감). 배포 문서가 46개로 늘어난 7월 15일에 일 사용량이 뛰었고, 신규 클러스터와 게임 노드그룹이 함께 돌던 7월 20–26일에 **전체의 75.1%** 가 발생했습니다.

![7월 일별 Regional Transfer 29.68TB 와 집중 구간 75.1%](images/posts/01-aws-regional-transfer.png)

시간상 상관관계는 뚜렷하지만, 청구서에는 Pod 별 flow log 가 없습니다. 그래서 "워커 32개가 원인" 이라고 쓰지 않았습니다. 방향을 좁히려고 CloudWatch 의 노드그룹별 송수신을 따로 봤습니다.

![노드그룹별 송수신 방향 — 게임 노드 대량 송신과 인프라 노드 대량 수신이 맞물림](images/posts/02-cloudwatch-nodegroup-direction.png)

게임 노드의 송신 4,895GiB 와 인프라 노드의 수신 5,228GiB 가 시계열로 맞물렸습니다. 즉 트래픽 가설은 최소 둘이고(관리면의 단계별 NATS 왕복, 데이터면의 게임→인프라 전달), 문제를 "서비스 숫자" 하나로 축약하면 두 번째 경로를 놓칩니다.

## 무엇을 바꿨나 — 이벤트 계약은 두고 프로세스를 합쳤다

관리면의 결론은 마이크로서비스를 후회하는 것이 아니라, **논리 경계와 물리 경계를 분리**하는 것이었습니다. 발견 서비스 41개 중 신뢰 경계가 다른 agent 2개만 밖에 남기고, 관리 서비스 39개를 한 프로세스에 조립했습니다. 이벤트 계약(EventEnvelope)은 그대로라, 프로세스 안에서는 인메모리 버스가 같은 계약을 나릅니다.

\`\`\`text
이전
worker A Pod → NATS → worker B Pod → NATS → worker C Pod

변경
controller process
  ├─ worker A task
  ├─ InMemoryEventBus (같은 EventEnvelope 계약)
  ├─ worker B task
  └─ worker C task

별도 유지
target cluster-agent / node-collector → 신뢰 경계가 다름
\`\`\`

합친 기준은 "작은 서비스가 나쁘다" 가 아닙니다. 같은 릴리스 주기 · 같은 DB · 같은 장애 영역 · 같은 팀 소유이고 네트워크 격리가 필요 없으면 한 프로세스, 신뢰 경계가 다르거나 독립 확장이 필요하면 별도 프로세스. 도메인 모듈과 이벤트 계약을 유지했으므로 필요하면 다시 쪼갤 수 있습니다.

## 확인할 수 있는 것

- 회고 원문과 재조회 명령: \`k8s-ops-min\` 저장소의 \`docs/architecture-cost-postmortem.md\`
- 통합 확인: \`python src/entrypoints/app.py --check\` — controller_services 39 · agent_services 2
- 청구서 · CloudWatch 원본 캡처와 CSV: \`docs/evidence/\`

## 한계

공유 계정이라 시스템 단독 비용을 분리하지 못했고, Pod 별 flow log 와 subject 별 처리량이 없어 원인을 특정하지 못했습니다. 이 회고가 주장하는 것은 인과가 아니라 **아키텍처 결정을 청구서로 검증하는 절차**입니다. 그 절차가 없었다면 상관관계조차 보지 못했을 것입니다.`;export{e as default};