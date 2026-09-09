---
layout: default
title: 손실 함수
nav_order: 4
permalink: /wiki/ai-machine-learning-topic-7c39d8d61e07/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-topic-7c39d8d61e07
projection_sha256: d56c3ae54f5c524966656aee3bee93de860568622ac78155fcd2be86254825d3
parent: 딥러닝
content_status: ready
public_parent_id: Wiki/ai-machine-learning/deep-learning
grand_parent: AI
---

# 손실 함수
{: .no_toc }

## 예측과 정답을 어떤 값으로 비교하는가

손실 함수는 학습에서 줄일 오차를 수치로 정의한다. 분류에서는 모델의 마지막 선형층이 클래스별 실수 점수인 logits z를 출력하고, softmax로 확률 p를 만든다. 정답 분포 q에 대한 Cross Entropy는 `H(q,p) = -Σ q_i log p_i`다. 대칭성이나 삼각부등식을 만족하는 거리 함수는 아니다.

정답이 클래스 k 하나인 one-hot이면 손실은 `-log p_k`가 된다. 정답 확률 1·0.5·0.01에 대한 손실은 각각 0·약 0.693·약 4.605 nats다. 자연로그를 사용한 categorical negative log likelihood를 표본에 걸쳐 최소화하는 것은 해당 데이터의 우도를 최대화하는 것과 같다. q가 고정일 때 `H(q,p)=H(q)+KL(q||p)`라는 관계도 있다.

MSE도 확률 예측에 사용할 수 있다. 다만 softmax와 결합한 MSE의 logit gradient에는 softmax Jacobian이 남는다. 손실 이름만으로 학습 속도가 항상 빠르거나 느리다고 단정하지 않고, 입력이 확률인지 logit인지와 미분 대상을 함께 비교한다.

## 확률에 대한 미분과 logit에 대한 미분

샘플 하나에서 정답 확률에 대한 미분은 `∂L/∂p_k = -1/p_k`다. softmax를 합성해 logit에 대해 미분하면 `∂L/∂z_i = p_i - 1{i=k}`로 바뀐다. 전자는 p_k가 작아지면 크기가 커지지만 후자는 각 성분이 -1과 1 사이에 있다. 낮은 정답 확률이 ‘무한히 큰 logit gradient’를 만든다고 설명하지 않는다.

배치 N개의 무가중 평균 손실이면 logit gradient는 `(p-one_hot)/N`이다. 예측 확률을 복사한 뒤 각 행의 정답 열에서 1을 빼는 구현은 one-hot 배열을 직접 만들지 않고 같은 값을 얻는다.

아래는 분류기 학습 전체를 대신하지 않는 독립 계산 모형이다. 확률 세 행에 대해 loss와 logit gradient를 계산한다.

```run-python
from math import log

p = [[0.1, 0.2, 0.7], [0.8, 0.1, 0.1], [0.2, 0.6, 0.2]]
target = [2, 0, 1]
n = len(p)
loss = -sum(log(row[t]) for row, t in zip(p, target)) / n
gradient = [[(value - int(j == t)) / n for j, value in enumerate(row)]
            for row, t in zip(p, target)]
print(f"loss={loss:.6f}")
for row in gradient:
    print([round(value, 6) for value in row])
```

Python 3.9.6에서 확인한 출력이다.

```text
loss=0.363548
[0.033333, 0.066667, -0.1]
[-0.066667, 0.033333, 0.033333]
[0.066667, -0.133333, 0.066667]
```

`lrn-mnist`는 softmax 확률로 loss를 계산하고 위 결합 gradient를 바로 backward에 전달한다. 이 경로의 `Softmax.backward`는 받은 값을 통과시킨다. 일반적인 softmax의 미분이 항등이라는 뜻이 아니라 이미 softmax 미분까지 합친 특정 네트워크 계약이다. [MNIST 손실 구현](https://github.com/woonyong-kr/lrn-mnist/blob/61b7000fc084fc5f8de52cc665eca69c31b23eb8/src/losses.py)

## 안정적인 계산과 평균의 분모

확률을 만든 뒤 0에 가까운 값을 clip하면 log(0)을 피할 수 있지만 clipped loss의 경계 밖 미분은 원래 수식과 다르다. 극단적인 logits에서는 `logsumexp(z)-z_k`를 직접 계산하는 방식이 더 적합하다. 유한 logits에서 최댓값 m을 빼 `m+log Σ exp(z_i-m)-z_k`로 계산하면 지수 overflow를 피한다.

PyTorch `F.cross_entropy`는 logits를 받으며 class index target에서는 LogSoftmax와 NLLLoss를 결합한 계산에 해당한다. softmax 확률을 먼저 넣으면 확률을 다시 logits로 해석해 다른 손실이 된다. 단순 batch 평균 외에 class weight·ignore_index·reduction을 설정하면 분모와 gradient도 그 계약에 맞춰야 한다. [CrossEntropyLoss 문서](https://docs.pytorch.org/docs/stable/generated/torch.nn.CrossEntropyLoss.html)

언어 모델의 logits `(B,T,V)`는 `(B*T,V)`, target `(B,T)`는 `(B*T,)`로 펼칠 수 있다. padding이나 학습 대상이 아닌 prompt 위치를 제외한다면 실제 scoring한 토큰 수로 평균한다. 다른 크기 배치의 loss를 단순 평균하면 표본 평균과 달라질 수 있다.

## Perplexity를 비교할 수 있는 조건

자연로그로 계산한 평균 token loss L의 perplexity는 `exp(L)`다. 예를 들어 PPL=100은 정답 토큰에 부여한 확률의 기하평균이 1/100이라는 뜻이며, 매 위치에서 정확히 100개 후보가 균등하다는 뜻은 아니다. [토크나이저](/wiki/ai-machine-learning-topic-b126bbe83b86/)·코퍼스·문맥·scoring 위치가 다르면 같은 단위의 비교가 아니다. 특정 GPT 버전의 PPL도 평가 코퍼스와 tokenizer·문맥·scoring 조건을 함께 알아야 해석할 수 있다.

정수 레이블로 정답 열을 선택하는 `dout[np.arange(N), target] -= 1`은 one-hot 배열 없이 정답 위치의 gradient를 계산하는 코드다. HyeYeon의 손실 함수·dout 노트는 이를 손실별 미분 경로와 연결한다. 위 독립 예제는 그 노트의 확률 행렬을 사용한다. [04. 학습, 손실함수, 수치미분 · 1c28de6](https://github.com/woonyong-kr/lrn-mnist/blob/1c28de6983671e891faac453e392f68b354bdb53/docs/woonyong/deep-learning-from-scratch/04-learning-loss-gradient.md) [1. 손실 함수란 · 1c28de6](https://github.com/woonyong-kr/lrn-mnist/blob/1c28de6983671e891faac453e392f68b354bdb53/src/study/HyeYeon/md/%EA%B5%90%EC%B0%A8%EC%97%94%ED%8A%B8%EB%A1%9C%ED%94%BC%EC%98%A4%EC%B0%A8%EC%99%80_%EC%98%A4%EC%B0%A8%EC%A0%9C%EA%B3%B1%ED%95%A9_%EB%B9%84%EA%B5%90.md) [Softmax + CrossEntropy의 dout 만들기 · 1c28de6](https://github.com/woonyong-kr/lrn-mnist/blob/1c28de6983671e891faac453e392f68b354bdb53/src/study/HyeYeon/md/%EC%86%8C%ED%94%84%ED%8A%B8%EB%A7%A5%EC%8A%A4_%EA%B5%90%EC%B0%A8%EC%97%94%ED%8A%B8%EB%A1%9C%ED%94%BC_dout_%EC%98%88%EC%8B%9C.md)
