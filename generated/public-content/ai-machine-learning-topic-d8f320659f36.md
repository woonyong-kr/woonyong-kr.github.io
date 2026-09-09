---
layout: default
title: 규제
nav_order: 10
permalink: /wiki/ai-machine-learning-topic-d8f320659f36/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-topic-d8f320659f36
projection_sha256: 78f97df294b34e442794fabb90982f6a8bdb2bee6cfe8202ab3ce0acbdf533f8
parent: 머신러닝
content_status: ready
public_parent_id: Wiki/ai-machine-learning/ml
grand_parent: AI
---

# 규제
{: .no_toc }

## 규제는 훈련 데이터에만 맞는 해를 줄이려는 개입이다

규제(regularization)는 손실에 제약을 추가하거나 학습 중 계산·데이터·학습 기간에 변화를 주어 일반화를 돕는 방법이다. Dropout은 그중 활성화 일부를 무작위로 0으로 만드는 방식이다. 특정 경로 조합에만 의존하기 어렵게 만들지만, 어떤 모델에서도 과적합이 해결된다는 보장은 없다.

## 일반화 격차를 보고 개입할 위치를 정한다

훈련 오차가 작아도 새 데이터에서 오차가 크면, 학습한 규칙이 훈련 표본에 지나치게 맞춰졌는지 살핀다. 훈련과 검증에서 모두 원하는 수준에 못 미친다면 모델의 표현력·특징·학습 예산 부족도 후보가 된다. 두 곡선의 차이만으로 원인이 확정되지는 않으므로 데이터 분포와 평가 모드를 함께 확인한다.

784→100→50→10의 Affine 층에는 W와 b가 총 84,060개 있다. 이 수를 MNIST 훈련 이미지 60,000장과 비교하는 것만으로 이미지 전체를 외울 수 있다고 단정할 수는 없다. 파라미터 수와 샘플 수는 서로 다른 단위이고, 구조·데이터·학습 과정도 표현 능력과 일반화에 영향을 준다.

| 개입 위치 | 방법 | 확인할 조건 |
| --- | --- | --- |
| 파라미터 갱신 | L2 페널티·Weight Decay | optimizer와 감쇠 대상, 데이터 손실과의 균형 |
| 학습 중 활성화 | Dropout | 차단 확률·층 위치·학습과 추론의 스케일 |
| 학습 기간 | Early Stopping | 검증 지표·개선 기준·patience·복원할 checkpoint |
| 학습 데이터 | Data Augmentation | 변형 뒤에도 목표 레이블이 유지되는지 |

### 가중치 크기에 비용을 붙이는 경우

L2 페널티는 데이터 손실에 `lambda/2 * sum(W²)`를 더한다. 이때 W의 gradient에는 `lambda*W`가 추가된다. 기본 SGD에서는 곱셈 감쇠로 정리할 수 있지만, Adam처럼 gradient 이력을 변환하는 방법에서 같은 동작이라고 가정할 수는 없다. 감쇠를 분리하는 AdamW와의 차이는 [최적화 알고리즘](/wiki/ai-machine-learning-topic-63f78704eb10/)에서 다룬다.

학습용 MNIST 구현의 [SGD·Adam 클래스](https://github.com/woonyong-kr/lrn-mnist/blob/61b7000fc084fc5f8de52cc665eca69c31b23eb8/src/optimizers.py)에는 `weight_decay` 인자가 없다. 아래 예제에서 비용과 gradient를 직접 계산하는 것과 이 optimizer가 감쇠를 적용하는 것은 구분해야 한다.

다음 계산은 가중치 행렬 두 개에 L2 비용을 추가한다. lambda는 원리를 보이기 위한 값이며 권장 설정이나 현재 MNIST 실행 결과가 아니다.

```run-python
weights = [[[1.0, -2.0], [0.5, 0.5]], [[0.2], [-0.1]]]
data_loss = 0.4
decay = 0.1
squared_sum = sum(v*v for matrix in weights for row in matrix for v in row)
penalty = 0.5*decay*squared_sum
print('가중치 제곱합:', round(squared_sum, 6))
print('L2 페널티:', round(penalty, 6))
print('전체 손실:', round(data_loss+penalty, 6))
print('첫 행렬의 추가 gradient:',
      [[round(decay*v, 6) for v in row] for row in weights[0]])
assert abs(penalty-0.2775) < 1e-12
```

lambda=0이면 이 추가 비용은 없다. 값을 크게 하면 작은 가중치를 선호하는 압력이 강해지지만, 규제를 늘릴수록 검증 성능도 좋아지는 것은 아니다. 여러 층과 정규화가 있는 모델의 입력 민감도를 가중치 하나의 크기만으로 판단하기도 어렵다. Bias나 정규화 층의 파라미터를 감쇠 대상에 포함할지는 명시적으로 정한다.

### 멈출 시점과 사용할 모델은 함께 정한다

Early Stopping은 정한 validation 지표가 충분히 개선되지 않는 상태가 일정 기간 이어질 때 학습을 중단한다. Loss를 줄일지 accuracy를 높일지 먼저 정하고, `min_delta` 같은 개선 기준과 기다릴 횟수인 patience를 함께 기록한다. 한 번의 나쁜 평가에 바로 멈추면 잡음에 민감해질 수 있다.

중단 시점의 마지막 모델과 validation에서 가장 좋았던 모델은 다를 수 있다. 선택한 시점으로 돌아가려면 W·b뿐 아니라 BatchNorm의 누적 통계 등 추론에 필요한 상태도 같은 checkpoint에서 복원해야 한다. 설정을 고르는 데이터와 최종 평가 데이터의 분리는 [검증 데이터](/wiki/ai-machine-learning-topic-3b9f4a2496bc/)의 기준을 따른다.

### 변형과 정답을 함께 확인한다

회전·이동·반전·크롭·색상 변화는 이미지 과업에서 시도할 수 있는 변형이다. 다만 변형이 목표의 의미를 유지해야 한다. 숫자의 방향이나 물체의 색이 정답에 중요하다면 큰 회전·반전·색상 제거가 잘못된 레이블을 만들 수 있다. Augmentation은 원하는 변형에 덜 민감한 예측을 유도하는 학습 조건이며 완전한 불변성을 보장하지 않는다.

Label Smoothing은 정답 분포를 부드럽게 만드는 다른 개입이다. K개 클래스의 one-hot q를 균등분포와 섞는 정의에서는 `q'=(1-eps)q+eps/K`가 된다. 확신을 낮추는 학습 압력을 주지만 확률 보정이나 정확도 개선은 따로 평가한다. Gradient Clipping은 gradient 크기를 제한하는 학습 안정화 방법으로, 같은 의미의 과적합 대책으로 묶지 않는다.

BatchNorm의 배치 통계와 Dropout의 마스크를 함께 사용하는 경우도 validation으로 상호작용을 살핀다. 모든 기법을 정해진 순서대로 추가하는 규칙보다, 바꿀 조건을 명시하고 같은 기준으로 비교하는 편이 원인을 해석하기 쉽다.

## Dropout으로 학습 경로를 바꾼다

표준 elementwise Dropout의 마스크는 배치 전체에 뉴런 하나를 공동으로 끄는 것이 아니라 입력의 각 원소에 적용한다. 채널 단위 Dropout 등은 별도 규칙이다. p는 정확히 p 비율의 원소를 골라 끄는 개수가 아니라 각 원소를 끌 확률이므로 작은 배열에서 실제 비율은 달라진다.

## 두 스케일링 관례를 섞지 않는다

keep 확률 q=1-p, 마스크 M∈{0,1}로 두면 두 관례가 있다.

| 방식 | 학습 출력 | 추론 출력 | 학습 backward |
|---|---|---|---|
| 기본 Dropout | X·M | qX | G·M |
| Inverted Dropout | X·M/q | X | G·M/q |

현재 `lrn-mnist`는 기본 방식을 사용하고 PyTorch `nn.Dropout`은 inverted 방식을 사용한다. inverted는 살아남은 값을 q로 나누는 것이며 `1/q`로 나누는 것이 아니다. p=0은 항등이고 위 나눗셈 식은 p<1에서 정의된다. p=1을 허용하는 구현은 전체 0 처리를 별도로 해야 한다.

학습 출력의 기대 크기를 맞추는 것은 각 층 입력을 고정했을 때의 설명이다. 비선형 층을 거친 전체 네트워크에서 추론 결과가 모든 마스크 결과의 정확한 평균과 같다는 뜻은 아니다. [PyTorch Dropout](https://docs.pytorch.org/docs/stable/generated/torch.nn.Dropout)

## forward의 마스크를 backward에서도 사용한다

NumPy 구현은 `mask = np.random.rand(*x.shape) > p`를 만들고 `x*mask`를 반환한다. backward에서 새 마스크를 뽑으면 forward에서 쓰지 않은 경로로 gradient가 흐르므로 같은 마스크를 재사용한다. 추론 분기는 qX를 반환하며 학습 forward의 마스크를 생성하지 않는다. 따라서 추론 뒤에 같은 학습 backward 계약을 무조건 호출할 수 없다.

마스크 연산 자체를 비교할 때는 아래처럼 값을 명시한 독립 모형을 사용한다. 난수 생성 결과와 분리해 스케일링을 확인할 수 있다.

```run-python
x = [[0.5,-0.3,0.8,1.2],[0.1,0.9,0.4,0.7]]
mask = [[False,True,True,True],[False,False,False,True]]
q = 0.5
train = [[v*int(m) for v,m in zip(row,marks)] for row,marks in zip(x,mask)]
infer = [[v*q for v in row] for row in x]
inverted = [[v/q for v in row] for row in train]
print('train', train)
print('infer', infer)
print('inverted_train', inverted)
```

Python 3.9.6에서 확인한 출력이다.

```text
train [[0.0, -0.3, 0.8, 1.2], [0.0, 0.0, 0.0, 0.7]]
infer [[0.25, -0.15, 0.4, 0.6], [0.05, 0.45, 0.2, 0.35]]
inverted_train [[0.0, -0.6, 1.6, 2.4], [0.0, 0.0, 0.0, 1.4]]
```

`Affine → BatchNorm → ReLU → Dropout`은 해당 MNIST 구현의 은닉층 구성이다. 모든 신경망이 같은 위치에 Dropout을 둬야 하는 규칙은 아니며, BatchNorm과 함께 쓰면 통계와 마스크의 상호작용도 validation에서 확인한다. 비율·위치·seed를 기록하고 [검증 데이터](/wiki/ai-machine-learning-topic-3b9f4a2496bc/)에서 학습·추론 모드를 맞춰 비교한다.

## 마스크로 고르는 것과 원래 자리에서 0으로 만드는 것

입력이 `(3, 4)`이고 같은 shape의 Boolean 마스크에서 True가 여섯 개라면 `x[mask]`는 선택된 여섯 값을 모은 `(6,)` 배열이다. `x * mask`는 `(3, 4)`의 위치를 유지하고 False 자리의 값만 0으로 만든다. Dropout에 필요한 것은 후자의 shape 보존이다. 순전파에 쓴 마스크를 역전파에서도 재사용해야 차단한 위치로 gradient가 흐르지 않는다.

HyeYeon의 Dropout 트러블슈팅 기록에는 `(4,)`와 `(3, 4)`의 assertion 오류가 등장한다. 제시된 동일 shape 마스크 예제만으로 당시 `(4,)`가 나온 전체 경로를 확정할 수는 없다. 행 단위 마스크 `[True, False, False]`의 결과는 `(1, 4)`이며 `x[0]`의 `(4,)`와도 다르다. 오류를 재현하려면 마스크의 shape뿐 아니라 그 전에 어떤 인덱싱을 거쳤는지도 추적해야 한다. shape를 올바르게 유지한 뒤에는 선택한 기본·inverted 방식에 맞춰 train/inference 스케일링을 적용한다. [Dropout mask 트러블슈팅: `x[self.mask]`와 `x * self.mask`의 차이 · 1c28de6](https://github.com/woonyong-kr/lrn-mnist/blob/1c28de6983671e891faac453e392f68b354bdb53/src/study/HyeYeon/md/%EB%93%9C%EB%A1%AD%EC%95%84%EC%9B%83_%EB%A7%88%EC%8A%A4%ED%81%AC_%EC%9D%B8%EB%8D%B1%EC%8B%B1_%ED%8A%B8%EB%9F%AC%EB%B8%94%EC%8A%88%ED%8C%85.md)
