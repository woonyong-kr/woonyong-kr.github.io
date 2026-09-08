---
layout: default
title: 최적화 알고리즘
nav_order: 7
permalink: /wiki/ai-machine-learning-topic-63f78704eb10/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-topic-63f78704eb10
projection_sha256: 57c5871855dcc00bac73eb5c266fe91151c1ebe6d9616f38cb7c3200989f5c4d
parent: 딥러닝
content_status: ready
public_parent_id: Wiki/ai-machine-learning/deep-learning
grand_parent: AI
---

# 최적화 알고리즘
{: .no_toc }

## 같은 gradient도 갱신 규칙에 따라 이동이 달라진다

[역전파](/wiki/ai-machine-learning-topic-f7bb4c8cd38e/)는 손실의 gradient g를 계산하고 optimizer는 g와 자체 상태로 파라미터를 바꾼다. SGD의 기본 갱신은 `W←W-lr·g`다. 학습률은 상수일 수도 있고 스케줄에 따라 달라질 수도 있으므로 SGD를 고정 학습률만 쓰는 방법으로 정의하지 않는다.

좁고 긴 손실 골짜기에서는 큰 곡률 방향으로 진동하면서 작은 곡률 방향으로 천천히 이동할 수 있다. Momentum은 이전 gradient를 누적하고 AdaGrad·RMSProp·Adam은 성분별 크기 정보를 추가해 이동을 조정한다. 실제 수렴·일반화의 우열은 데이터와 설정을 맞춘 평가가 필요하다.

## 방향의 누적과 제곱 크기의 누적

| 규칙 | 보관하는 상태 | 기본 갱신 |
|---|---|---|
| SGD | gradient 외 누적 상태 없음 | `W -= lr*g` |
| EMA Momentum | `m=beta*m+(1-beta)*g` | `W -= lr*m` |
| AdaGrad | `v += g*g` | `W -= lr*g/(sqrt(v)+eps)` |
| RMSProp | `v=beta*v+(1-beta)*g*g` | `W -= lr*g/(sqrt(v)+eps)` |
| Adam | gradient와 제곱의 이동평균 | 초기 편향을 보정한 비율로 이동 |

Momentum은 `v=beta*v+g`처럼 (1-beta)를 생략하는 관례도 있다. 두 식은 같은 lr에서 이동량이 다르므로 구현의 규칙까지 기록한다. beta=0.9를 약 10 step의 시간 척도로 설명할 수 있지만 정확히 최근 10개만 기억하는 이동 창은 아니다.

Adam의 t번째 갱신은 다음과 같다.

```text
m = beta1*m + (1-beta1)*g
v = beta2*v + (1-beta2)*g²
m_hat = m / (1-beta1**t)
v_hat = v / (1-beta2**t)
W -= lr*m_hat/(sqrt(v_hat)+eps)
```

v는 gradient 제곱의 이동평균인 두 번째 raw moment이며 분산 자체가 아니다. 일정하게 큰 gradient도 v를 크게 만든다. 따라서 ‘요동이 작으면 v가 작다’고 설명하면 틀릴 수 있다. 0에서 시작한 m·v의 초기 편향을 `1-beta**t`로 보정하고, eps는 분모가 작을 때의 수치 문제를 줄인다. [Adam 원 논문](https://arxiv.org/abs/1412.6980)

## L2 페널티와 AdamW를 혼동하지 않는다

손실에 `lambda/2 * sum(W²)`를 더하면 gradient에 lambda·W가 더해진다. 기본 SGD에서는 이를 `W=(1-lr*lambda)W-lr*g`로 쓸 수 있다. Adam에서는 이 항도 m·v에 들어가므로 단순한 곱셈 감쇠와 같지 않다. AdamW는 `W←(1-lr*lambda)W`의 감쇠를 적응적 gradient 갱신과 분리한다. 적용할 parameter group과 감쇠 제외 대상도 설정의 일부다. [Decoupled Weight Decay Regularization](https://arxiv.org/abs/1711.05101)

## 학습률 스케줄과 clipping의 위치

Warmup은 초기 몇 step에 lr을 높이고, cosine decay는 남은 진행도 u∈[0,1]에 대해 `min_lr + (max_lr-min_lr)(1+cos(pi*u))/2`로 낮추는 구성이다. warmup 길이·총 step·시작 lr·끝 lr와 step을 세는 기준이 필요하다. 모든 모델에 필수인 구조가 아니며 현재 `lrn-gpt/src/runnable.py`는 고정 lr의 AdamW를 사용한다. 과거 실험 코드에는 warmup이 있었지만, 현재 실행 경로에서는 사용하지 않는다.

일반적인 PyTorch 단일 update는 zero_grad → forward/loss → backward → 필요 시 gradient clipping → optimizer.step 순서다. backward는 등록된 모든 파라미터가 아니라 gradient를 요구하고 loss에 연결된 경로에 기여한다. gradient는 누적되므로 accumulation을 의도하지 않으면 이전 값을 초기화한다.

Global norm clipping은 여러 파라미터의 gradient를 이어 붙인 벡터의 norm을 제한한다. 임계값을 넘으면 같은 비율로 줄이며 loss를 다시 미분하는 단계는 아니다. 현재 작은 GPT 경로는 backward 뒤 norm 1.0 clipping을 호출한다. AMP에서는 unscale 뒤 clipping해야 하고, accumulation에서는 update에 사용할 gradient를 모은 뒤 적용한다.

NumPy 구현의 `gradient()`는 `model.grads`를 채우고 `update(params,grads)`가 배열을 제자리에서 갱신한다. PyTorch의 `loss.backward()`·`param.grad`·`optimizer.step()`이 각각 대응한다. `model.parameters()`에는 동결된 파라미터도 포함될 수 있어 이름만으로 전부 학습 가능하다고 가정하지 않는다.

## 재개하려면 optimizer의 시간도 저장한다

현재 MNIST의 Adam은 각 파라미터와 같은 shape의 m·v 및 t를 사용하고 beta1=0.9, beta2=0.999, eps=1e-8을 적용한다. 이는 그 구현의 설정이지 다른 모델의 최적값은 아니다. 학습을 정확한 다음 update로 재개하려면 가중치뿐 아니라 이 상태와 스케줄·난수 상태도 필요하다. `lrn-gpt` checkpoint는 optimizer 상태와 global_step을 함께 저장한다. MNIST의 추론 모델 저장은 학습 재개 상태 전체를 담는 계약과 구분한다. [MNIST optimizer 구현](https://github.com/woonyong-kr/lrn-mnist/blob/61b7000fc084fc5f8de52cc665eca69c31b23eb8/src/optimizers.py), [GPT 학습·저장 경로](https://github.com/woonyong-kr/lrn-gpt/blob/027830d7f49904f656c2d3003d4f6a818ef50269/src/runnable.py)

## Adam의 상태도 파라미터별로 보관한다

`params['W']`와 `grads['W']`가 행렬이면 Adam의 `m['W']`, `v['W']`도 같은 shape여야 한다. `b`, BatchNorm의 `gamma`, `beta` 등 다른 파라미터에도 각각 독립된 상태가 필요하다. 하나의 누적값을 모든 층에 공유하면 서로 다른 파라미터의 갱신 이력이 섞인다.

학습 개선 기법 노트와 HyeYeon의 optimizer 정리는 특정 이차함수 조건에서 갱신 경로를 비교한다. 그 조건에서의 결과만으로 MNIST나 다른 모델에서도 Adam이 항상 더 낫다고 판단할 수는 없다. [06. 학습 개선 기법 · 1c28de6](https://github.com/woonyong-kr/lrn-mnist/blob/1c28de6983671e891faac453e392f68b354bdb53/docs/woonyong/deep-learning-from-scratch/06-training-techniques.md) [Optimizer 정리: Momentum, AdaGrad, Adam · 1c28de6](https://github.com/woonyong-kr/lrn-mnist/blob/1c28de6983671e891faac453e392f68b354bdb53/src/study/HyeYeon/md/%EB%AA%A8%EB%A9%98%ED%85%80_AdaGrad_Adam_%EC%B5%9C%EC%A0%81%ED%99%94_%EC%9D%B4%ED%95%B4.md)
