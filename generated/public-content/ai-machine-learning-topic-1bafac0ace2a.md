---
layout: default
title: 미세 조정
nav_order: 8
permalink: /wiki/ai-machine-learning-topic-1bafac0ace2a/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-topic-1bafac0ace2a
projection_sha256: 3d0a34d23fe75c3bf5fd0433d8c014dd1ec2bffd422d0a79d3150e6ee78e5adc
parent: LLM
content_status: ready
public_parent_id: Wiki/ai-machine-learning/llm
grand_parent: AI
---

# 미세 조정
{: .no_toc }

## 답을 얻는 방식과 가중치를 바꾸는 방식을 구분한다

미세 조정은 사전학습 모델을 출발점으로 특정 데이터의 목적함수를 더 최적화하는 과정이다. 문장에 클래스 레이블을 붙이는 분류와 답변 토큰열을 학습하는 instruction tuning은 정답 구조부터 다르다. 같은 목적함수에도 full fine-tuning·head-only·LoRA처럼 다른 갱신 범위를 선택할 수 있다.

[Prompting](/wiki/ai-machine-learning-topic-2095b58a805d/)은 입력의 지시·예시를 바꾸고, RAG는 검색한 근거를 입력에 공급한다. 별도의 학습 절차가 없다면 두 방법 자체로 가중치가 바뀌지는 않는다. 자주 바뀌는 자료를 근거와 함께 답해야 하면 검색 경로가 유용하고, 반복되는 출력 형식이나 판단 양식을 바꾸려면 미세 조정을 검토할 수 있다. 다만 RAG의 최신성은 수집·색인에 달려 있고, 미세 조정도 지식을 바꿀 수 있으므로 지식/행동을 절대적인 이분법으로 나누지 않는다.

## 목적함수에 연결되는 파라미터만 갱신한다

| 방식 | 고정하는 부분 | 새로 학습하거나 갱신하는 부분 |
|---|---|---|
| Full fine-tuning | backbone의 학습 파라미터를 동결하지 않음 | 목적함수에 연결된 backbone과 과업 head |
| Head-only | 사전학습 backbone | 분류 head 등 과업 출력층 |
| LoRA | 기본 가중치 | 선택한 선형층의 저랭크 변화량과 필요 시 head |
| QLoRA | 양자화한 기본 가중치 | LoRA adapter 등 선택한 학습 파라미터 |

`requires_grad=False`는 해당 파라미터의 gradient 계산 여부를 정한다. optimizer에는 갱신하려는 파라미터를 전달한다. 등록된 파라미터가 모두 loss 경로에서 사용되는 것은 아니다. 분류 손실 계산에 사용하지 않는 LM head에는 해당 손실의 gradient가 전달되지 않는다. 동결해도 backbone의 forward 계산은 필요하다. Dropout 같은 상태성 동작은 train/eval로 따로 결정하며, 가중치 동결과 eval 모드는 같은 설정이 아니다.

분류 head에는 대표 hidden state를 전달한다. 오른쪽에만 padding한 배치라면 마지막 유효 위치는 `유효 토큰 수 - 1`이지만, 왼쪽 padding이나 중간 빈칸에는 같은 식을 쓸 수 없다. 전부 padding인 입력은 따로 거절하고, index와 hidden의 device도 맞춰야 한다. BERT의 CLS, mean pooling, decoder의 마지막 유효 토큰은 서로 다른 선택이다.

## LoRA가 줄이는 것은 어느 행렬인가

기본 선형층이 `y = Wx`이고 W가 `(d_out,d_in)`이면 LoRA는 `W + (alpha/r)BA`를 사용한다. A는 `(r,d_in)`, B는 `(d_out,r)`이며 기본 W를 고정하고 A·B를 학습한다. 추가 파라미터는 `r(d_in+d_out)`개다. rank, 적용할 층, head 포함 여부가 달라지면 절감 비율도 달라진다. [LoRA 논문](https://arxiv.org/abs/2106.09685)

작은 GPT를 D=256·6 blocks·QKV bias 없음·FFN 폭 4D로 구성했을 때의 파라미터 수는 다음과 같다.

| 구성 | 파라미터 수 |
|---|---:|
| 한 block의 QKV | 3D² = 196,608 |
| attention 출력 투영과 bias | D²+D = 65,792 |
| FFN 두 선형층과 bias | 8D²+5D = 525,568 |
| 두 LayerNorm의 gamma·beta | 4D = 1,024 |
| 한 block 합 / 6 blocks | 788,992 / 4,733,952 |
| 2-class 분류 head | 256×2+2 = 514 |
| rank 8을 Q·V에만 적용한 LoRA | 6×2×(2×8×256) = 49,152 |
| LoRA와 분류 head | 49,666 |

4,733,952는 block만 센 값이다. 전체 backbone에는 V×256 token embedding, C×256 position embedding, 마지막 LayerNorm 512개도 더한다. 따라서 49,666개를 ‘전체 모델의 약 1%’라고 단정하지 않는다. head-only는 이 조건에서 514개를 학습한다.

QLoRA는 기본 모델의 저비트 저장과 adapter 학습을 결합한다. 저비트화는 저장량을 줄이지만 연산 dtype, 양자화 metadata, activation, optimizer 상태, 시퀀스·배치 길이를 함께 고려해야 한다. 특정 7B 모델이 GPU 한 장이나 노트북에서 항상 실행된다는 보장은 없다. [QLoRA 논문](https://arxiv.org/abs/2305.14314)

## 기존 능력을 얼마나 유지할 것인가

큰 update나 좁은 데이터에 대한 반복 학습은 기존 능력을 훼손할 수 있다. 새 과업 validation과 보존하려는 기존 능력의 평가를 함께 두고, 학습률·학습 기간·갱신 범위를 비교한다. 사전학습보다 작은 학습률로 시작하는 것은 후보 전략이지 ‘언제나 10배 작게’라는 계약은 아니다. 새로 초기화한 head와 pretrained backbone에 다른 학습률을 둘 수도 있다.

현재 `lrn-gpt`는 직접 구현한 작은 LM의 학습·생성·checkpoint 재개를 제공한다. LoRA·QLoRA는 이 프로그램의 실행 범위에 포함되지 않는다.

감성 분류와 지시 학습을 설계할 때는 정답이 class label인지 답변 토큰열인지, 어떤 표현을 과업 head에 연결할지 함께 정해야 한다. 과거 과제의 두 학습 방식을 비교한 자료에서 이 차이를 확인할 수 있다. [지시 미세튜닝과 분류 미세튜닝 · 7875b64](https://github.com/woonyong-kr/lrn-gpt/blob/7875b64f85f19959d66dcaf06c1dcbeb129d71eb/docs/woonyong/02-fine-tuning.md)
