---
layout: default
title: 사전학습
nav_order: 7
permalink: /wiki/ai-machine-learning-topic-cf73c209b68a/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-topic-cf73c209b68a
projection_sha256: f1f8ba4c5b44663e55dec2d3bb444eb7f1fd63138fe704c4ceb175f93958a7bf
parent: LLM
content_status: ready
public_parent_id: Wiki/ai-machine-learning/llm
grand_parent: AI
---

# 사전학습
{: .no_toc }

사전학습은 후속 과업에 사용할 모델의 출발점을 만드는 학습이다. 언어 모델에서는 텍스트 자체에서 예측 문제를 구성할 수 있다. 어떤 토큰을 정답으로 삼고 어떤 문맥을 보여 주는지에 따라, 같은 [Transformer](/wiki/ai-machine-learning-transformer-924ea08dd69a/) 부품을 사용해도 학습하는 조건부 확률이 달라진다.

## 정답 위치와 참조 범위는 별개의 선택이다

다음 토큰이 이미 원문에 있으므로 Causal LM의 입력·정답 쌍에는 사람이 문장마다 클래스 레이블을 붙일 필요가 없다. `[10,20,30,40]`에서 입력 `[10,20,30]`, 정답 `[20,30,40]`을 만든다. 각 입력 위치의 출력은 자신이 읽은 토큰이 아니라 그다음 토큰을 맞힌다.

| 목적 | 예측할 정답 | Attention의 참조 범위 |
| --- | --- | --- |
| Causal LM | 다음 토큰 | 현재 입력 위치와 그 왼쪽 |
| Masked LM | 미리 선택한 위치의 원래 토큰 | 변형된 입력의 양방향 문맥 |
| Prefix LM | 조건부로 이어질 토큰열 | Prefix 내부는 양방향, 생성부는 Prefix 전체와 현재까지의 생성 입력 |

Attention mask는 정보를 읽을 수 있는 위치를 정하고, loss mask는 어떤 출력에 학습 신호를 줄지 정한다. 가려진 Attention 위치와 loss를 계산하지 않는 위치가 반드시 같지는 않다. 실제 [Attention 계산](/wiki/ai-machine-learning-attention-820ced4d5b89/)에서는 여기에 padding과 배치별 유효 길이도 반영한다.

## Causal LM은 다음 토큰을 병렬로 학습한다

길이 T의 원문에서 별도 시작 토큰 없이 인접 쌍을 만들면 예측할 정답은 T-1개다. 이때 평균 손실은 다음과 같다.

```text
L = -sum(log P(x[t] | x[0:t])) / (T-1),  t=1..T-1
```

시작 토큰을 앞에 붙여 첫 토큰까지 예측하거나 T+1개 원문에서 T개 입력·정답을 만들면 분모도 달라진다. 실제 scoring한 정답 수와 loss의 평균 분모를 맞춰야 한다.

Causal mask는 대각선 위를 막는다. 따라서 학습에서는 주어진 입력의 모든 위치를 한 번에 계산해도 미래의 정답을 직접 읽지 않는다. 생성할 때는 다음 토큰 자체가 아직 없으므로 한 토큰을 고른 뒤 입력에 이어 붙여 반복한다. 학습의 병렬성과 생성의 순차성은 서로 다른 조건에서 나온다.

## Masked LM의 선택 위치와 MASK 표기

Masked LM의 평균 손실은 선택 위치 집합 M에 대해 `-sum(log P(x[t] | 변형된 입력))/|M|`으로 계산한다. BERT는 후보 위치 중 약 15%를 예측 대상으로 선택하고, 그중 80%를 MASK 표기로 바꾼다. 임의 토큰으로 바꾸거나 원래 값을 유지한 선택 위치도 loss에 참여하므로 MASK 표기만 찾아 정답을 고르면 학습 목적이 달라진다. BERT의 입력·head 구성은 [Transformer의 BERT 구조 설명](/wiki/ai-machine-learning-transformer-924ea08dd69a/)에서 이어진다.

양방향 문맥을 읽는 입력을 구성해 가려진 내용을 복원하는 과업과, 왼쪽 문맥으로 다음 토큰을 생성하는 과업은 조건이 다르다. Masked LM으로 사전학습한 표현에는 감성 분류·개체명 인식·질문 답변 등에 맞는 head와 후속 학습을 연결할 수 있다. 선택 위치가 적다는 이유만으로 모델 간 데이터 효율을 그 비율로 계산할 수는 없다. 매우 짧은 입력에서 선택 위치가 0개가 된다면 학습 데이터 생성이나 loss 계산에서 이를 어떻게 처리할지도 정해야 한다.

## Prefix의 양방향 문맥과 생성부의 인과 제약

`A B C | D E`에서 `A B C`를 Prefix로 정하면 Prefix 내부는 서로 참조한다. D와 E를 읽는 생성부는 Prefix 전체와 현재 위치까지의 생성 입력만 참조한다. 질문이나 문서를 Prefix로 두는 번역·요약·질문 답변 등의 조건부 생성에 이 구성을 사용할 수 있다. Prefix가 미래 생성부를 읽으면 정답이 조건 쪽으로 새어 들어간다.

Teacher forcing에서는 정답을 한 칸 이동시키는 규칙을 함께 적용한다. 첫 생성 토큰 D를 예측하는 출력은 마지막 Prefix 입력 C의 위치에서, 다음 정답 E를 예측하는 출력은 입력 D의 위치에서 나온다. ‘생성부에만 loss를 둔다’는 말은 생성부의 **정답 토큰**을 선택한다는 뜻이며, 입력과 정답의 위치를 같은 인덱스로 혼동해서는 안 된다.

T5의 Encoder를 Prefix LM 전체와 동일시하면 구조를 잘못 묶게 된다. T5 연구는 하나의 스택에서 Prefix와 생성부를 함께 처리하는 Prefix LM과 Encoder-Decoder를 따로 비교했다. T5의 span corruption은 연속된 원문 구간을 sentinel 토큰으로 바꾸고, Decoder가 sentinel과 제거한 구간을 생성하도록 구성한다. Encoder의 양방향 Attention, Decoder의 causal Attention과 Encoder 출력에 대한 cross-attention은 하나의 Prefix mask와 다른 구조다. [T5의 구조·목적함수 비교](https://arxiv.org/html/1910.10683v4)

## 같은 토큰열에서 mask와 학습 신호를 계산한다

아래 모형은 토큰 다섯 개에서 입력·정답과 참조 행렬을 만든다. `1`은 참조 허용, `0`은 차단이다. Masked LM은 세 번째 위치 하나를 선택한 예이며, 다섯 개의 15%를 항상 한 개로 정한다는 규칙은 아니다. 뒤에서는 고정 logits로 세 정답의 평균 Cross Entropy를 계산한다. 실제 모델의 loss 측정값은 아니다.

```run-python
from math import exp, log

tokens = [10, 20, 30, 40, 50]
prefix_length = 3
selected = [2]
n = len(tokens)
causal = [[int(j <= i) for j in range(n)] for i in range(n)]
prefix = [[int(j < prefix_length or (i >= prefix_length and j <= i))
           for j in range(n)] for i in range(n)]
masked = [[1]*n for _ in range(n)]
masked_input = tokens[:]
for position in selected:
    masked_input[position] = '<MASK>'
for name, mask in [('Causal', causal), ('Masked', masked), ('Prefix', prefix)]:
    print(name, 'mask')
    for row in mask:
        print(row)
print('Causal input / target:', tokens[:-1], tokens[1:])
print('Masked 입력:', masked_input)
print('Masked 선택 정답:', [tokens[i] for i in selected])
print('Prefix 생성 정답:', tokens[prefix_length:])
print('Prefix 정답을 예측하는 입력 위치:', list(range(prefix_length-1, n-1)))
assert all(prefix[i][j] == 0 for i in range(prefix_length)
           for j in range(prefix_length, n))

logits = [[2.0, 1.0, 0.1, 0.5, 0.3],
          [0.5, 2.5, 0.2, 0.1, 0.8],
          [0.3, 0.1, 3.0, 0.4, 0.2]]
targets = [0, 1, 2]
losses, probabilities = [], []
for row, target in zip(logits, targets):
    maximum = max(row)
    normalizer = sum(exp(value-maximum) for value in row)
    loss = maximum + log(normalizer) - row[target]
    losses.append(loss)
    probabilities.append(exp(-loss))
print('정답 확률:', [round(value, 6) for value in probabilities])
print('평균 loss:', round(sum(losses)/len(losses), 6))
assert all(0 < p < 1 for p in probabilities)
assert abs(sum(losses)/len(losses)-0.431481) < 1e-6
```

이 설정의 정답 개수는 Causal 4개, Masked 1개, Prefix 2개다. 이 수는 지정한 선택 위치와 Prefix 길이의 결과다. 데이터의 정보량이나 모델의 성능 순위를 뜻하지 않는다. 다른 토크나이저의 loss를 비교할 때도 같은 평가 텍스트·정답 범위·평균 단위를 먼저 맞춘다. 확률과 logits의 차이, padding을 제외하는 분모는 [손실 함수](/wiki/ai-machine-learning-topic-7c39d8d61e07/)에서 다룬다.
