---
layout: default
title: 활성화 함수
nav_order: 3
permalink: /wiki/ai-machine-learning-topic-ff856a774938/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-topic-ff856a774938
projection_sha256: 562df158267e28080180111106039e798dfc0d50b4a6418752d67a7c6fa7a48d
parent: 딥러닝
content_status: ready
public_parent_id: Wiki/ai-machine-learning/deep-learning
grand_parent: AI
---

# 활성화 함수
{: .no_toc }

## 층 사이의 비선형성과 출력의 의미를 정한다

신경망에서 Affine 연산은 입력을 가중합으로 바꾼다. 두 층을 `y=(xW1+b1)W2+b2`로 연결하면 `y=x(W1W2)+(b1W2+b2)`로 합칠 수 있다. 편향이 있는 변환은 엄밀히 affine이며, 이러한 층만 반복해도 함수의 형태는 그대로다. 층 사이에 비선형성을 넣으면 XOR처럼 한 직선으로 나눌 수 없는 패턴을 표현할 수 있다.

활성화 함수는 이 비선형 변환을 담당한다. ReLU·Sigmoid·Tanh·GELU는 각 원소를 따로 바꾸지만, Softmax는 선택한 축의 여러 점수를 함께 정규화한다. 값을 변환하는 규칙과 텐서 shape를 구분해야 한다. 보통 활성화 연산은 입력 shape를 유지하지만 gated FFN의 분할·곱셈이나 입력 차원을 보정하는 wrapper에는 별도의 shape 규칙이 있다.

| 사용 위치 | 필요한 출력 | 함수와 학습 입력 |
|---|---|---|
| 은닉층 | 표현을 바꾸는 비선형성 | ReLU·GELU·SiLU 등을 초기화·정규화와 함께 비교한다 |
| 이진 분류 | 한 사건의 확률 | logit 하나를 Sigmoid로 바꾼다. `BCEWithLogitsLoss`에는 logit을 직접 넣는다 |
| 여러 레이블의 독립 판정 | 클래스마다 별도의 확률 | 클래스별 Sigmoid를 사용한다. 확률 합이 1일 필요는 없다 |
| 상호 배타적인 다중 분류 | 후보 전체의 확률 분포 | Softmax를 사용한다. `CrossEntropyLoss`에는 logits를 직접 넣는다 |
| 제약 없는 회귀 | 실수 예측값 | 항등 출력이 가능하다. 양수·유계 출력이 필요한 과업은 그 제약에 맞춰 정한다 |
| 게이트 | 다른 표현을 통과시킬 비율 | Sigmoid 등의 출력과 별도 value를 곱한다 |

함수 하나가 모든 은닉층에 적합한 것은 아니다. 출력 범위, 포화 구간, 미분값, 초기화, 실행 비용을 함께 보며 실제 학습 비교에서는 데이터 분할·seed·학습 예산을 맞춘다. 부드러운 함수라는 사실만으로 높은 정확도나 안정적인 학습이 보장되지는 않는다.

## Sigmoid와 Tanh는 출력 범위를 제한한다

Sigmoid를 σ라고 쓰면 `σ(x)=1/(1+exp(-x))`, 미분은 `σ'(x)=σ(x)(1-σ(x))`다. 실수 유한 입력에서 출력은 `(0,1)`이고 x=0에서 0.5다. 미분의 최댓값은 0.25다. Tanh는 `tanh(x)=2σ(2x)-1`, 미분은 `1-tanh(x)²`이며 출력 범위는 `(-1,1)`이다. x=0에서 출력 0·미분 1이고 양 끝으로 갈수록 두 함수 모두 포화한다.

Tanh가 홀함수이고 출력 범위가 0을 중심으로 대칭이라는 사실은 모든 입력 배치의 출력 평균이 0이라는 뜻이 아니다. 입력 분포가 0에 대해 대칭이면 출력 평균도 0이지만, 양수 입력만 주면 Tanh 출력도 양수다. 마찬가지로 BatchNorm의 표준화 결과와 학습 가능한 gamma·beta를 거친 최종 출력의 평균도 구분한다.

Sigmoid의 미분만 다섯 번 곱한 상한은 `0.25⁵=0.0009765625`, 약 0.098%다. 실제 [역전파](/wiki/ai-machine-learning-topic-f7bb4c8cd38e/)에는 가중치 행렬과 다른 연산도 곱해지므로 이 값이 전체 gradient의 상한은 아니다. x=±3에서는 Sigmoid 미분이 약 0.045177, Tanh 미분이 약 0.009866이다. Tanh의 중심 미분이 더 크더라도 포화 구간에서는 더 작을 수 있다.

Sigmoid의 양수 출력 a를 다음 Affine에 넣으면 한 샘플의 `dW_ij=a_i·G_j`에서 같은 출력 j로 들어가는 가중치들의 gradient 부호가 G_j에 묶인다. 이것이 최적화 경로에 영향을 줄 수 있지만, 여러 샘플의 합과 다른 층까지 포함한 모든 갱신이 같은 부호이거나 반드시 지그재그라는 결론은 성립하지 않는다.

두 함수는 은닉층의 일반적인 대안 외에도 용도가 있다. LSTM은 input·forget·output gate에 Sigmoid를, GRU는 update·reset gate에 Sigmoid를 사용한다. 단순 RNN의 `h_t=tanh(W_h h_(t-1)+W_x x_t+b)`는 은닉 상태의 각 값을 제한한다. 그러나 상태 값이 유계여도 반복되는 가중치와 Jacobian 때문에 gradient가 폭주하거나 소실될 수 있다. Sigmoid attention이나 gating은 선택한 구조의 규칙이며, Softmax처럼 후보들의 합을 자동으로 1로 만들지 않는다.

수치 구현에서는 `exp(-x)`에 큰 양수가 들어가지 않게 한다. x≥0이면 원래 식을, x<0이면 `exp(x)/(1+exp(x))`를 사용하면 된다. 유한 정밀도에서는 작은 값이 underflow하거나 출력이 정확히 0·1로 반올림될 수 있다. 이진 분류 학습에는 Sigmoid 확률을 만든 뒤 log를 취하기보다, log-sum-exp 방식으로 결합한 손실이 유리하다. [PyTorch BCEWithLogitsLoss](https://docs.pytorch.org/docs/stable/generated/torch.nn.BCEWithLogitsLoss.html)

## ReLU의 음수 경로와 누설 기울기를 비교한다

계단 함수 `1{x>0}`는 0에서 불연속이고 나머지 구간의 미분이 0이다. 일반적인 gradient 학습으로는 이 경계를 어떻게 움직일지 신호를 얻기 어렵다. ReLU는 `max(0,x)`로 양수 구간을 기울기 1로 통과시킨다. 0에서는 미분이 존재하지 않으며, 현재 MNIST 구현은 backward 값을 0으로 선택한다.

한 샘플에서 뉴런의 가중합 z가 -0.5라면 ReLU를 통한 gradient는 0이다. 그 상태가 모든 학습 입력에서 지속되면 해당 경로의 학습이 정체될 수 있다. 한 배치에서 음수였다는 사실만으로 뉴런이 영구히 죽었다고 판정할 수는 없다. 다른 입력이나 앞 층의 변화, optimizer의 누적 상태 등으로 z가 다시 양수가 될 수 있다.

| 함수 | x>0 | x<0 | 음수 구간의 미분 |
|---|---|---|---|
| ReLU | x | 0 | 0 |
| Leaky ReLU | x | αx | α |
| PReLU | x | 학습 가능한 α·x | α |
| ELU | x | α·(exp(x)-1) | α·exp(x) |

Leaky ReLU의 α=0.01은 흔한 설정 예다. α>0이면 음수 구간에도 기울기가 남지만, 학습의 회복이나 성능 개선을 보장하지는 않는다. α≠1이면 0의 좌우 미분이 다르므로 그 점의 backward 값은 구현에서 정해야 한다. PReLU는 α를 채널별 또는 공유 파라미터로 학습한다. 음수 위치에서 α로 전달되는 gradient는 `Σ G·x`이며, α의 공유 범위에 맞춰 합산한다. PReLU는 He 초기화와 함께 연구되었다. [PReLU와 rectifier 초기화 논문](https://arxiv.org/pdf/1502.01852)

ELU는 α>0일 때 큰 음수에서 -α로 포화한다. 0에서는 함수가 연속이지만 왼쪽 미분은 α, 오른쪽 미분은 1이므로 미분까지 연속인 것은 α=1일 때다. 음수 출력을 허용해 평균을 낮출 수 있으나 평균을 정확히 0으로 맞추는 정규화는 아니다. `exp`를 계산하는 비용은 ReLU의 비교 연산과 다르지만 실제 시간 차이는 dtype·장치·kernel에 따라 측정해야 한다. [PyTorch ELU 정의](https://docs.pytorch.org/docs/2.9/generated/torch.nn.ELU.html)

NumPy로 ELU를 만들 때 `np.where(x>0, x, α*(np.exp(x)-1))`는 선택되지 않을 양수 위치의 지수도 계산한다. 큰 양수에서 불필요한 overflow가 날 수 있으므로 음수 위치만 계산하는 마스크 방식을 사용할 수 있다. 0 근처의 음수에서는 `expm1(x)`가 `exp(x)-1`의 뺄셈 오차를 줄인다.

NumPy의 `np.maximum(0,x)`는 배열의 각 원소에 ReLU를 적용한다. 계단 함수도 `(x>0)`의 Boolean 배열을 정수로 바꿔 구현할 수 있다. 현재 `lrn-mnist`의 ReLU는 forward의 `x<=0` 마스크를 저장하고, 입력과 상류 gradient를 복사한 뒤 그 위치를 0으로 만든다. Sigmoid·Tanh의 수동 backward는 각각 저장한 출력 s·t에서 `G*s*(1-s)`, `G*(1-t*t)`를 구할 수 있다. 어떤 방식이든 backward가 사용하는 저장값은 같은 forward에서 나온 것이어야 한다. [MNIST 활성화 구현](https://github.com/woonyong-kr/lrn-mnist/blob/61b7000fc084fc5f8de52cc665eca69c31b23eb8/src/activations.py)

### 같은 입력에서 값과 미분을 확인한다

다음은 표준 라이브러리만 사용하는 독립 계산이다. 표의 α는 0.01, ELU의 α는 1이다. 마지막 출력은 큰 절댓값의 Sigmoid 입력과 0 중심이 아닌 입력 배치도 확인한다. 학습된 모델의 예측이나 성능을 측정하는 코드는 아니다.

```run-python
from math import exp, expm1, tanh

def sigmoid(x):
    if x >= 0:
        return 1.0 / (1.0 + exp(-x))
    e = exp(x)
    return e / (1.0 + e)

print('x step sigmoid dsigmoid tanh dtanh relu leaky elu silu')
for x in [-3.0, -2.0, -1.0, -0.5, 0.0, 0.5, 1.0, 2.0, 3.0]:
    s, t = sigmoid(x), tanh(x)
    values = [s, s*(1-s), t, 1-t*t, max(0.0,x),
              x if x > 0 else 0.01*x,
              x if x > 0 else expm1(x), x*s]
    print(f'{x:4.1f} {int(x>0)}', ' '.join(f'{v:.6f}' for v in values))
print('sigmoid_extremes', [sigmoid(x) for x in [-1000.0, 1000.0]])
print('five_sigmoid_factors', 0.25**5)
print('tanh_mean_positive_inputs', round((tanh(1)+tanh(2))/2, 6))
```

Python 3.9.6에서 확인한 출력이다.

```text
x step sigmoid dsigmoid tanh dtanh relu leaky elu silu
-3.0 0 0.047426 0.045177 -0.995055 0.009866 0.000000 -0.030000 -0.950213 -0.142278
-2.0 0 0.119203 0.104994 -0.964028 0.070651 0.000000 -0.020000 -0.864665 -0.238406
-1.0 0 0.268941 0.196612 -0.761594 0.419974 0.000000 -0.010000 -0.632121 -0.268941
-0.5 0 0.377541 0.235004 -0.462117 0.786448 0.000000 -0.005000 -0.393469 -0.188770
 0.0 0 0.500000 0.250000 0.000000 1.000000 0.000000 0.000000 0.000000 0.000000
 0.5 1 0.622459 0.235004 0.462117 0.786448 0.500000 0.500000 0.500000 0.311230
 1.0 1 0.731059 0.196612 0.761594 0.419974 1.000000 1.000000 1.000000 0.731059
 2.0 1 0.880797 0.104994 0.964028 0.070651 2.000000 2.000000 2.000000 1.761594
 3.0 1 0.952574 0.045177 0.995055 0.009866 3.000000 3.000000 3.000000 2.857722
sigmoid_extremes [0.0, 1.0]
five_sigmoid_factors 0.0009765625
tanh_mean_positive_inputs 0.862811
```

## GELU와 SiLU는 입력에 연속적인 가중치를 곱한다

GELU는 `f(x)=xΦ(x)`이고 `Φ(x)=P(Z≤x), Z~N(0,1)`이다. 고정된 입력 x가 양수일 확률을 추정하는 함수는 아니다. Φ는 표준 정규분포에서 x 이하의 누적 확률을 구한다. `m~Bernoulli(Φ(x))`인 모형의 `E[xm|x]`가 GELU와 같다는 해석은 가능하지만, 통상적인 GELU 연산 자체는 마스크를 난수로 뽑지 않는다. [GELU의 정의와 확률 모형](https://arxiv.org/html/1606.08415v5)

Φ(0)=0.5여도 x=0이므로 출력은 0이다. x=2에서는 Φ≈0.97725, 출력≈1.9545이고 x=-2에서는 출력≈-0.0455다. 작은 양수에서는 출력이 x와 상당히 다를 수 있으며, x가 충분히 클 때 x에 가까워진다. 정확한 미분은 `f'(x)=Φ(x)+xφ(x)`다. φ는 표준 정규분포의 밀도다. 0의 미분은 0.5이고 일부 음수 구간에서는 미분이 음수여서 GELU는 단조 증가 함수가 아니다. 음수 구간 전체가 평평하지 않더라도 극단적인 입력에서 작은 gradient가 생길 수 있다.

| 구현 | 식 |
|---|---|
| exact GELU | `x * 0.5 * (1+erf(x/sqrt(2)))` |
| tanh 근사 | `0.5*x*(1+tanh(sqrt(2/pi)*(x+0.044715*x³)))` |
| sigmoid 근사 | `x*σ(1.702*x)` |
| SiLU | `x*σ(x)` |

1.702는 GELU 논문에 제시된 sigmoid 근사 계수다. 오차의 정의·입력 구간을 정하지 않고 모든 조건에서 최적이라고 해석할 수는 없다. tanh와 sigmoid 근사는 서로 다른 함수이므로 forward에 선택한 근사와 backward를 일치시킨다. `s=σ(kx)`라면 `d[xs]/dx=s+kx*s*(1-s)`이며, sigmoid 근사는 k=1.702, SiLU는 k=1이다. tanh 근사에서 `u=sqrt(2/pi)*(x+0.044715*x³)`라 두면 미분은 `0.5*(1+tanh(u))+0.5*x*(1-tanh(u)²)*sqrt(2/pi)*(1+3*0.044715*x²)`다.

PyTorch `GELU`는 `approximate='none'`과 `'tanh'`를 구분한다. 현재 `lrn-gpt`의 기본 `gelu`는 직접 구현한 tanh 근사이고 `gelu_exact`는 `F.gelu(..., approximate='none')`, `quick_gelu`는 k=1.702의 sigmoid 근사다. tanh 근사의 상수 tensor도 입력과 같은 device·dtype으로 만든다. [PyTorch GELU API](https://docs.pytorch.org/docs/2.9/generated/torch.nn.GELU.html), [GPT 활성화 선택과 구현](https://github.com/woonyong-kr/lrn-gpt/blob/027830d7f49904f656c2d3003d4f6a818ef50269/src/model.py)

### 근사 오차와 backward를 같은 함수로 비교한다

다음 모형은 exact 식, 두 근사식, SiLU를 같은 입력에서 비교한다. exact 계산에는 음수 꼬리에서 `1+erf`의 소거를 줄이는 `erfc` 표현을 사용한다. 오차는 `[-5,5]`의 0.01 간격 격자에서만 측정한다. 중앙 차분은 sigmoid 근사의 해석 미분과 비교하며 실제 PyTorch kernel이나 전체 모델의 검증 결과는 아니다.

```run-python
from math import erfc, exp, pi, sqrt, tanh

def sigmoid(x):
    if x >= 0:
        return 1.0/(1.0+exp(-x))
    e = exp(x)
    return e/(1.0+e)

def exact(x):
    return x*0.5*erfc(-x/sqrt(2.0))

def approximate_tanh(x):
    return 0.5*x*(1+tanh(sqrt(2/pi)*(x+0.044715*x**3)))

def quick(x):
    return x*sigmoid(1.702*x)

def quick_grad(x):
    s = sigmoid(1.702*x)
    return s+1.702*x*s*(1-s)

print('x exact tanh quick silu quick_grad')
for x in [-3.0, -2.0, -1.0, -0.5, 0.0, 0.5, 1.0, 2.0, 3.0]:
    values = [exact(x), approximate_tanh(x), quick(x), x*sigmoid(x), quick_grad(x)]
    print(f'{x:4.1f}', ' '.join(f'{v:.6f}' for v in values))
grid = [i/100 for i in range(-500,501)]
for name, function in [('tanh',approximate_tanh), ('quick',quick)]:
    error = max(abs(function(x)-exact(x)) for x in grid)
    print(f'max_abs_error_{name}_grid={error:.9f}')
h = 1e-5
error = max(abs((quick(x+h)-quick(x-h))/(2*h)-quick_grad(x)) for x in grid)
print('quick_gradient_error_below_1e-8', error < 1e-8)
assert error < 1e-8
```

Python 3.9.6에서 확인한 출력이다.

```text
x exact tanh quick silu quick_grad
-3.0 -0.004050 -0.003637 -0.018071 -0.142278 -0.024548
-2.0 -0.045500 -0.045402 -0.064341 -0.238406 -0.073815
-1.0 -0.158655 -0.158808 -0.154204 -0.268941 -0.067780
-0.5 -0.154269 -0.154286 -0.149612 -0.188770 0.120778
 0.0 0.000000 0.000000 0.000000 0.000000 0.500000
 0.5 0.345731 0.345714 0.350388 0.311230 0.879222
 1.0 0.841345 0.841192 0.845796 0.731059 1.067780
 2.0 1.954500 1.954598 1.935659 1.761594 1.073815
 3.0 2.995950 2.996363 2.981929 2.857722 1.024548
max_abs_error_tanh_grid=0.000473235
max_abs_error_quick_grid=0.020334869
quick_gradient_error_below_1e-8 True
```

SiLU라는 이름과 `xσ(x)` 식은 GELU 연구에도 등장한다. 이후 자동 탐색 연구의 Swish는 `xσ(βx)`를 다뤘으며 β=1이면 SiLU와 같다. 따라서 SiLU를 자동 탐색 연구에서 처음 발견된 함수라고만 설명하면 앞선 연구를 놓친다. [PyTorch SiLU의 출처 설명](https://docs.pytorch.org/docs/2.9/generated/torch.nn.SiLU.html), [Swish의 탐색과 β](https://arxiv.org/html/1710.05941v2)

SiLU를 단독으로 적용하는 것과 SwiGLU FFN은 구성이 다르다. SwiGLU는 별도로 투영한 value와 gate를 `value*SiLU(gate)`로 결합한다. LLaMA의 2023년 설계도 SwiGLU와 조정된 FFN 폭을 사용한다. 특정 모델의 채택은 GELU와의 보편적인 성능 동등성이나 비용 우위를 뜻하지 않는다. [LLaMA의 FFN 구성](https://arxiv.org/html/2302.13971v1#S2.SS2)

## Softmax는 한 축의 점수를 함께 정규화한다

logits z에 대한 확률은 `p_i=exp(z_i)/Σ_j exp(z_j)`다. 유한한 logits와 후보 C≥2인 실수 계산에서는 `0<p_i<1`, `Σp_i=1`이다. C=1이면 출력은 1이고, 부동소수점에서는 underflow·반올림으로 0이나 1이 나올 수 있다. 점수 차이는 `p_i/p_j=exp(z_i-z_j)`라는 확률 비율이 된다. z의 순서와 argmax는 유지하지만 이 정규화만으로 실제 정답 빈도에 맞춘 확률 보정(calibration)이 보장되지는 않는다.

세 클래스의 `[2,1,0.1]`은 약 `[0.659001,0.242433,0.098566]`이 된다. MNIST 전체 출력은 10개지만 이 수치 예제는 세 클래스만 사용한다. Softmax가 필요한 것은 확률 분포이며, 가장 큰 클래스 하나만 고를 때는 logits의 argmax로도 같은 순위를 얻는다.

모든 logits에 같은 c를 빼도 분자·분모의 공통 지수 인수가 약분되어 확률이 같다. c=max(z)로 두면 가장 큰 지수는 exp(0)=1이 된다. `[1000,1001,999]`를 `[-1,0,-2]`로 이동하면 overflow 없이 확률을 계산할 수 있다. NumPy의 직접 지수는 큰 값에서 inf와 경고를 낼 수 있고 Python `math.exp`는 `OverflowError`를 낼 수 있어 실패 방식도 같지는 않다.

최댓값 이동은 NaN이나 모든 위치가 -inf인 입력을 자동으로 고치지 않는다. attention에서 차단 위치에 -inf를 넣으려면 각 행에 적어도 하나의 유효 score가 있어야 한다. 매우 작은 확률이 필요한 손실에는 `log(softmax(z))`보다 `z-max(z)-log Σ exp(z-max(z))` 형태의 log-softmax가 유리하다. 확률이 0으로 underflow해도 log 확률은 유한하게 표현할 수 있는 경우가 있다.

### Temperature와 동률인 최댓값

Temperature T>0은 `softmax(z/T)`를 만든다. 유한 logits에서 T→∞이면 균등 분포에 가까워진다. T→0⁺에서 최댓값이 유일하면 해당 위치로 집중하지만 최댓값이 k개 동률이면 그 k개에 1/k씩 남는다. T=0은 이 나눗셈 식으로 계산할 수 없고 greedy 선택 등 별도의 규칙이 필요하다.

T가 바꾸는 것은 주어진 logits의 분포다. 높은 T가 창의성을, 낮은 T가 사실 정확성이나 일관성을 보장하지는 않는다. 생성 품질은 모델과 sampling의 다른 설정까지 포함해 평가한다.

```run-python
from math import exp, isfinite, log

def softmax(values, temperature=1.0):
    if not values or not isfinite(temperature) or temperature <= 0:
        raise ValueError('nonempty logits and positive finite temperature required')
    if not all(isfinite(v) for v in values):
        raise ValueError('this example accepts finite logits only')
    maximum = max(values)
    weights = [exp((v-maximum)/temperature) for v in values]
    total = sum(weights)
    return [w/total for w in weights]

def show(label, values):
    print(label, [round(v,6) for v in values], 'sum', round(sum(values),6))

show('three_classes', softmax([2.0,1.0,0.1]))
show('large_logits', softmax([1000.0,1001.0,999.0]))
for temperature in [0.1,0.5,1.0,2.0,10.0]:
    show(f'T={temperature}', softmax([3.0,1.0,0.5], temperature))
show('tied_maximum_T=0.01', softmax([3.0,3.0,0.5],0.01))
p = softmax([2.0,1.0,0.1])
gradient = [value-int(i==0) for i,value in enumerate(p)]
print('cross_entropy_gradient', [round(v,6) for v in gradient])
print('gradient_sum_below_1e-12', abs(sum(gradient)) < 1e-12)
assert abs(sum(gradient)) < 1e-12
shifted = [0.0,-1000.0]
log_normalizer = log(sum(exp(v) for v in shifted))
print('underflow_probabilities', softmax([1000.0,0.0]))
print('stable_log_probabilities', [v-log_normalizer for v in shifted])
try:
    softmax([1.0,2.0],0.0)
except ValueError:
    print('zero_temperature_rejected', True)
```

Python 3.9.6에서 확인한 출력이다.

```text
three_classes [0.659001, 0.242433, 0.098566] sum 1.0
large_logits [0.244728, 0.665241, 0.090031] sum 1.0
T=0.1 [1.0, 0.0, 0.0] sum 1.0
T=0.5 [0.975559, 0.017868, 0.006573] sum 1.0
T=1.0 [0.821409, 0.111166, 0.067425] sum 1.0
T=2.0 [0.604455, 0.222366, 0.173179] sum 1.0
T=10.0 [0.384981, 0.315196, 0.299823] sum 1.0
tied_maximum_T=0.01 [0.5, 0.5, 0.0] sum 1.0
cross_entropy_gradient [-0.340999, 0.242433, 0.098566]
gradient_sum_below_1e-12 True
underflow_probabilities [1.0, 0.0]
stable_log_probabilities [0.0, -1000.0]
zero_temperature_rejected True
```

이 함수는 유한 logits만 받는 독립 모형이다. 마스킹된 attention의 전체 입력 계약은 구현하지 않는다. temperature 표의 합과 동률 처리, 확률 underflow와 log 확률의 차이를 직접 비교할 수 있다.

## 정규화할 축과 손실의 입력 계약을 맞춘다

배치 logits `(N,C)`에서는 `max(axis=1,keepdims=True)`와 행별 합이 `(N,1)`을 만들어 각 행을 독립적으로 정규화한다. `(B,T,V)`의 언어 모델 출력에서는 어휘 축 V가 대상이다. `F.softmax(logits,dim=-1)`의 dim은 함수 호출에서 정하지만 `CrossEntropyLoss`에는 같은 이름의 dim 인자가 없다. 손실에 전달할 때는 클래스 축 위치에 맞게 reshape·transpose한다. [PyTorch Softmax API](https://docs.pytorch.org/docs/2.9/generated/torch.nn.functional.softmax.html)

Softmax의 Jacobian은 `∂p_i/∂z_j=p_i(δ_ij-p_j)`다. 후보들이 분모를 공유하므로 원소마다 독립적인 미분이 아니다. 상류 gradient G에 대한 입력 gradient는 `p*(G-Σ_j p_j G_j)`로 구한다. 정답 분포 q의 합이 1인 Cross Entropy와 결합하면 T=1에서 `dL/dz=p-q`가 된다. 무가중 batch 평균이면 N으로 나누고, `softmax(z/T)`에 같은 손실을 사용하면 T로도 나눈다. class weight·ignore_index 등은 해당 손실의 분모와 계약을 따로 확인한다.

현재 `lrn-mnist`는 확률로 Cross Entropy를 계산한 뒤 결합 gradient를 직접 만들기 때문에 `Softmax.backward`에서 받은 값을 통과시킨다. 일반적인 Softmax 미분이 항등이라는 뜻은 아니다. 이 구현은 1차원 입력 `(C,)`를 `(1,C)`로 바꾸므로 출력도 2차원이다. PyTorch `CrossEntropyLoss`는 logits를 받는 결합 손실이어서 Softmax 확률을 먼저 전달하면 다른 함수를 계산하게 된다. [손실 함수](/wiki/ai-machine-learning-topic-7c39d8d61e07/)의 미분 대상과 평균 분모를 함께 확인한다.

## MNIST와 GPT에서 활성화 함수가 놓이는 위치

`lrn-mnist`는 은닉층 ReLU와 출력 Softmax를 사용하며 BatchNorm·Dropout은 옵션이다. 순전파의 위치는 `Affine → BatchNorm(선택) → ReLU → Dropout(선택)`이다. [MNIST 층 구성](https://github.com/woonyong-kr/lrn-mnist/blob/61b7000fc084fc5f8de52cc665eca69c31b23eb8/src/network.py)

`lrn-gpt`의 일반 FFN은 폭 D→mult·D→D의 `Linear → activation → Linear`이며 기본 mult는 4, 활성화는 tanh 근사 GELU다. Dropout은 기본적으로 출력 Linear 뒤에 있고, 설정에 따라 활성화 뒤에 두거나 생략할 수 있다. `swiglu`·`geglu`를 선택하면 첫 Linear가 2·mult·D를 출력해 value·gate로 나눈 뒤 곱한다. 단순히 ReLU 호출을 SiLU로 바꾸는 것과는 가중치 수·중간 shape도 다르다. ReLU·SiLU 외에 Tanh·Mish·Squared ReLU·Identity 등의 비교 옵션이 있으므로 모델 이름만으로 활성화를 추정하지 않는다. [GPT 설정](https://github.com/woonyong-kr/lrn-gpt/blob/027830d7f49904f656c2d3003d4f6a818ef50269/src/config.py)

PyTorch에서는 `nn.ReLU`·`nn.GELU` 같은 모듈을 `nn.Sequential`에 넣거나 forward 안에서 `F.relu`·`F.gelu` 등 함수형 연산을 호출할 수 있다. 같은 이름의 함수라도 근사 모드와 dtype·device를 확인해야 한다.
