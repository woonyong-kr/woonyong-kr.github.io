---
layout: default
title: 회귀
nav_order: 13
permalink: /wiki/ai-machine-learning-topic-93581f9e6303/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-topic-93581f9e6303
projection_sha256: 938bbfd2f61f9d2be248d96cac23ce66810b10ffeffdceeaec9b13be5c3079eb
parent: 머신러닝
content_status: ready
public_parent_id: Wiki/ai-machine-learning/ml
grand_parent: AI
---

# 회귀
{: .no_toc }

## 연속값 예측에서 어떤 오차를 줄일 것인가

관측값 `[0,0,9]`를 같은 숫자 하나로 예측해야 한다고 하자. 0을 고르면 절대 오차의 평균은 3이고 제곱 오차의 평균은 27이다. 3을 고르면 두 값은 각각 4와 18이 된다. 어떤 예측이 더 나은지는 큰 오차를 얼마나 무겁게 평가할지에 달려 있다.

회귀는 범주 이름 대신 연속적인 수치를 예측하는 문제다. 여기서는 예측값과 관측값의 차이에 대한 MSE·MAE·Huber 손실을 비교한다. 회귀 모델 전체의 설계나 모든 확률적 회귀 손실을 다루지는 않는다. 기대 제곱 오차를 최소화하는 점 예측은 조건부 평균을, 기대 절대 오차를 최소화하는 점 예측은 조건부 중앙값을 겨냥한다. 단순히 이상치가 보인다는 이유만으로 손실을 바꾸기 전에 무엇을 예측하고 어떤 오차를 줄이려는지 정해야 한다. [scikit-learn의 예측 목표와 평가 기준](https://scikit-learn.org/stable/modules/model_evaluation.html#which-scoring-function-should-i-use)

## 제곱·절댓값·Huber가 큰 오차를 다루는 방식

예측을 y, 정답을 t, 원소별 오차를 `e_i=y_i-t_i`라 하자. 평균에 포함하는 스칼라 오차가 M개라면 손실과 출력에 대한 미분은 다음과 같다. 표의 미분은 모델의 전체 파라미터가 아니라 각 예측 원소 y_i에 대한 값이다.

| 손실 | M개 오차의 평균 | `∂L/∂y_i` |
| --- | --- | --- |
| MSE | `Σ_i e_i² / M` | `2e_i/M` |
| MAE | `Σ_i abs(e_i) / M` | `sign(e_i)/M` (`e_i≠0`) |
| Huber | `Σ_i h_delta(e_i) / M` | `e_i/M` (`abs(e_i)≤delta`), 그 밖은 `delta·sign(e_i)/M` |

MSE의 제곱 항은 큰 오차를 강하게 반영한다. 절대 오차가 0.1·0.5·1·2·5일 때 제곱은 0.01·0.25·1·4·25다. 오차가 0.1에서 5로 50배 커지면 MSE에 들어가는 항은 2,500배, MAE의 항은 50배가 된다. 이 때문에 MAE는 MSE보다 큰 잔차에 덜 민감하다. 이것이 모든 종류의 이상치나 데이터 오류를 해결한다는 뜻은 아니다.

MAE는 0에서 미분할 수 없다. 평균 MAE에서 그 지점의 subgradient는 `[-1/M,1/M]` 중 하나를 고를 수 있고 0은 그중 한 선택이다. 0이 아닌 곳에서는 출력에 대한 미분의 크기가 `1/M`이므로, 고정된 학습률로 예측값 자체를 갱신하는 단순 모형에서는 최적점 주위를 오갈 수 있다. 신경망의 파라미터 gradient는 여기에 모델의 미분이 결합하므로 늘 같은 크기라고 말할 수 없다. MSE 역시 손실 이름만으로 안정적인 수렴을 보장하지 않는다.

Huber는 양수 `delta`를 경계로 `h_delta(e)=e²/2` (`abs(e)≤delta`), `delta·abs(e)-delta²/2` (그 밖)로 정의한다. 경계 양쪽의 값은 `delta²/2`, 미분은 부호에 따라 `±delta`로 이어진다. 작은 오차에서는 부드러운 이차식이고 큰 오차에서는 기울기 크기가 delta로 제한된다. 원래 단위에서 delta=1이던 기준을 정답의 단위나 정규화와 무관하게 유지하면 다른 손실이 된다. PyTorch의 HuberLoss와 SmoothL1Loss는 delta=1일 때 같지만 일반적인 delta에서는 같은 스케일이 아니다. [HuberLoss 2.14](https://docs.pytorch.org/docs/2.14/generated/torch.nn.HuberLoss.html)

## 평균의 분모와 오차제곱합을 구분하기

벡터 출력 D개를 가진 B개 샘플에서 모든 원소를 평균하면 `M=B*D`다. 샘플마다 출력 오차를 합하고 배치만 평균하면 분모는 B다. 두 정의는 D배 차이 나므로 loss와 backward를 같은 정의로 맞춰야 한다. NumPy의 `np.mean((y-t)**2)`와 `np.mean(np.abs(y-t))`는 지정한 축이 없을 때 배열 전체를 평균한다. PyTorch MSELoss·L1Loss의 `reduction='mean'`도 전체 손실 원소를 평균한다. 두 입력의 shape가 같아 의도한 원소끼리 비교되는지 먼저 확인한다. [MSELoss 2.14](https://docs.pytorch.org/docs/2.14/generated/torch.nn.MSELoss.html) · [L1Loss 2.14](https://docs.pytorch.org/docs/2.14/generated/torch.nn.L1Loss.html)

『밑바닥부터 시작하는 딥러닝 1』의 공개 예제에는 `sum_squared_error(y,t)`가 있고, 식은 `0.5*sum((y-t)**2)`다. 이 함수는 평균 MSE가 아니라 절반을 곱한 오차제곱합이다. 1/2을 곱했으므로 각 출력 미분은 `y_i-t_i`가 된다. 원래 SSE를 `Σ e_i²`로 부르는 정의와도 1/2 차이가 있다. 예제는 단일 샘플의 클래스 벡터를 비교하지만, 이 배열 연산 자체는 배치를 넣어도 모든 원소를 합하므로 자동으로 배치 평균을 만들지 않는다. [책의 공개 함수 구현](https://github.com/oreilly-japan/deep-learning-from-scratch/blob/master/common/functions.py)

이 계산을 확률 벡터에도 적용할 수 있다. 아래의 정답은 숫자 2의 one-hot 벡터다. 정답 확률이 0.6인 예측은 half-SSE가 0.0975, 7번 클래스에 0.6을 준 예측은 0.5975다. 같은 10개 원소를 평균 MSE로 계산하면 각각 0.0195·0.1195가 된다. 확률 예측의 제곱 오차는 분류에서도 사용할 수 있지만, softmax와의 합성 미분은 Cross-Entropy와 다르다. 그 차이는 [같은 logits에서 손실 비교하기](/wiki/ai-machine-learning-topic-7c39d8d61e07/)로 이어진다.

## 같은 입력에서 손실과 수치 미분 확인하기

다음은 외부 패키지 없이 계산 규칙을 드러내는 독립 Python 모형이다. 두 입력은 길이가 같은 비어 있지 않은 1차원 수치 목록으로 제한한다. Huber의 배열 구현에서 `q=min(abs(e),delta)`와 `r=abs(e)-q`를 구한 뒤 `mean(0.5*q²+delta*r)`를 계산하는 방식은 아래 분기식과 같은 항을 만든다.

```run-python
from math import copysign


def errors(y, t):
    if not y or len(y) != len(t):
        raise ValueError("equal nonempty one-dimensional inputs required")
    return [a - b for a, b in zip(y, t)]


def mse_loss(y, t):
    e = errors(y, t)
    return sum(value * value for value in e) / len(e)


def mae_loss(y, t):
    e = errors(y, t)
    return sum(abs(value) for value in e) / len(e)


def huber_loss(y, t, delta=1.0):
    if delta <= 0:
        raise ValueError("delta must be positive")
    e = errors(y, t)
    return sum(0.5 * value * value if abs(value) <= delta
               else delta * (abs(value) - 0.5 * delta) for value in e) / len(e)


# Mean reduction: its denominator is the number of scalar loss elements.
y, t = [2.5, 0.0, 2.1, 7.8], [3.0, -0.5, 2.0, 7.5]
analytic = [2 * value / len(y) for value in errors(y, t)]
h, numerical = 1e-5, []
for i in range(len(y)):
    plus, minus = y.copy(), y.copy()
    plus[i] += h
    minus[i] -= h
    numerical.append((mse_loss(plus, t) - mse_loss(minus, t)) / (2 * h))
assert max(abs(a - b) for a, b in zip(analytic, numerical)) < 1e-9
print(f"MSE={mse_loss(y, t):.4f}, MAE={mae_loss(y, t):.4f}, Huber={huber_loss(y, t):.4f}")
print("MSE analytic:", [round(value, 6) for value in analytic])
print("MSE numerical:", [round(value, 6) for value in numerical])

# Half SSE has no averaging; preserve the original ten-class example.
t = [0, 0, 1, 0, 0, 0, 0, 0, 0, 0]
good = [0.1, 0.05, 0.6, 0, 0.05, 0.1, 0, 0.1, 0, 0]
bad = [0.1, 0.05, 0.1, 0, 0.05, 0.1, 0, 0.6, 0, 0]
for name, p in (("good", good), ("bad", bad)):
    half_sse = 0.5 * sum(value * value for value in errors(p, t))
    print(f"{name}: half_SSE={half_sse:.4f}, element_MSE={mse_loss(p, t):.4f}")

print("error | square | absolute | Huber(delta=1) | Huber derivative")
for e in (0.1, 0.5, 1.0, 2.0, 5.0):
    derivative = e if abs(e) <= 1 else copysign(1, e)
    print(f"{e:.1f} | {e * e:.2f} | {e:.1f} | {huber_loss([e], [0]):.3f} | {derivative:.1f}")

# A constant prediction shows that mean and median answer different questions.
truth = [0, 0, 9]
for value in (0, 3):
    prediction = [value] * len(truth)
    print(f"constant={value}: MSE={mse_loss(prediction, truth):.1f}, MAE={mae_loss(prediction, truth):.1f}")
```

Python 3.9.6에서 1회 확인한 출력이다.

```text
MSE=0.1500, MAE=0.3500, Huber=0.0750
MSE analytic: [-0.25, 0.25, 0.05, 0.15]
MSE numerical: [-0.25, 0.25, 0.05, 0.15]
good: half_SSE=0.0975, element_MSE=0.0195
bad: half_SSE=0.5975, element_MSE=0.1195
error | square | absolute | Huber(delta=1) | Huber derivative
0.1 | 0.01 | 0.1 | 0.005 | 0.1
0.5 | 0.25 | 0.5 | 0.125 | 0.5
1.0 | 1.00 | 1.0 | 0.500 | 1.0
2.0 | 4.00 | 2.0 | 1.500 | 1.0
5.0 | 25.00 | 5.0 | 4.500 | 1.0
constant=0: MSE=27.0, MAE=3.0
constant=3: MSE=18.0, MAE=4.0
```

처음 네 오차는 `[-0.5,0.5,0.1,0.3]`이고 분모는 4다. MSE의 미분은 그 오차에 `2/4`를 곱한 `[-0.25,0.25,0.05,0.15]`다. 중심 차분의 간격을 `1e-5`로 둔 이 입력에서 해석적 미분과 수치 미분의 최대 차이가 `1e-9`보다 작은 것을 확인했다. MAE의 미분 불가능점이나 임의의 신경망 전체까지 검증한 것은 아니다.

마지막 두 줄에서는 상수 0이 MAE를, 상수 3이 MSE를 더 작게 만든다. 큰 잔차를 강하게 줄이려는지, 조건부 평균·중앙값 중 무엇이 필요한지, 작은 오차에서 매끄러운 미분이 필요한지를 정한 뒤 손실을 고른다. 이후 동일한 데이터 분리와 평가 조건에서 목적에 맞는지 확인한다. 이 산술 예제는 회귀 모델의 훈련 성능이나 어떤 손실의 보편적인 우월성을 측정하지 않는다.
