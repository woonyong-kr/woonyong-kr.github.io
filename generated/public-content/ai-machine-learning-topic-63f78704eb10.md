---
layout: default
title: 최적화 알고리즘
nav_order: 7
permalink: /wiki/ai-machine-learning-topic-63f78704eb10/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-topic-63f78704eb10
projection_sha256: a6db4ac2df0ca6a5edc6f9cc373117e767e6193adcb1b48a0d901d6a570883cd
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

같은 gradient 배열을 받아도 어떤 상태를 보관하느냐에 따라 실제 이동량이 달라진다. 아래 연산은 파라미터 성분별로 적용한다. `m`, `v`는 0에서 시작하며 SGD에는 이런 누적 상태가 없다.

| 규칙 | 보관하는 상태 | 기본 갱신 |
|---|---|---|
| SGD | gradient 외 누적 상태 없음 | `W -= lr*g` |
| EMA Momentum | `m=beta*m+(1-beta)*g` | `W -= lr*m` |
| AdaGrad | `v += g*g` | `W -= lr*g/(sqrt(v)+eps)` |
| RMSProp | `v=rho*v+(1-rho)*g*g` | `W -= lr*g/(sqrt(v)+eps)` |
| Adam | gradient와 제곱의 이동평균 | 초기 편향을 보정한 비율로 이동 |

Momentum에서 같은 방향의 gradient는 이동평균에 남고, 부호가 번갈아 나타나는 성분은 일부 상쇄된다. 다만 일정한 gradient를 주었을 때 EMA는 그 값에 가까워지므로 속도가 무한히 증가하는 것은 아니다. `v=beta*v+g`처럼 `(1-beta)`를 생략하는 관례도 있다. 두 식은 같은 lr에서 이동량이 다르므로 구현의 규칙까지 기록한다.

`beta=0.9`의 시간 척도는 대략 10 step이지만 정확히 최근 10개만 기억하는 이동 창은 아니다. 한 gradient가 처음 들어올 때의 계수는 `0.1`, 10회 뒤에는 `0.1*0.9**10≈0.0349`다. 처음 기여량의 약 34.9%가 남는다는 뜻이다. beta를 0.99로 키우면 더 오래 기억하고 0.5로 낮추면 새 gradient에 더 빨리 반응한다. 그 자체가 수렴 속도의 우열을 뜻하지는 않는다.

AdaGrad는 지금까지 받은 gradient 제곱의 합으로 성분별 이동량을 조절한다. 희소한 입력에서 드물게 갱신되는 성분을 다르게 다룰 수 있지만, 분모를 정하는 것은 등장 횟수만이 아니라 누적된 제곱의 크기다. `g=0.1`, `lr=0.01`이 계속 같고 eps를 무시하면 다음과 같다. 실효 학습률은 gradient에 곱해지는 계수이며 실제 이동량과 구분한다.

| 업데이트 수 t | 누적 제곱 v | 실효 학습률 `lr/sqrt(v)` | 실제 이동량의 크기 |
|---|---:|---:|---:|
| 1 | 0.01 | 0.1 | 0.01 |
| 10 | 0.1 | 약 0.0316228 | 약 0.00316228 |
| 100 | 1 | 0.01 | 0.001 |
| 1,000 | 10 | 약 0.00316228 | 약 0.000316228 |

이 조건에서 마지막 실효 학습률은 첫 값의 약 3.16%다. v는 줄지 않지만 모든 학습에서 무한히 커지는 것은 아니다. gradient가 0이 되거나 제곱의 합이 유한하게 수렴하면 실효 학습률이 반드시 0으로 가는 것은 아니다.

RMSProp은 단순 누적 대신 제곱의 지수이동평균을 사용해 오래된 값의 영향을 줄인다. 예를 들어 `rho=0.99`이면 이번 제곱의 계수는 0.01이다. 유한한 최근 구간만 사용하는 방식은 아니며, 이 변경만으로 발산이나 느린 수렴이 모두 해결된다고 보장할 수 없다. 여기서는 평균 gradient의 제곱을 빼지 않는 기본 형태를 다룬다. [PyTorch RMSprop 2.9](https://docs.pytorch.org/docs/2.9/generated/torch.optim.RMSprop.html)

Adam의 t번째 갱신은 다음과 같다.

```text
m = beta1*m + (1-beta1)*g
v = beta2*v + (1-beta2)*g²
m_hat = m / (1-beta1**t)
v_hat = v / (1-beta2**t)
W -= lr*m_hat/(sqrt(v_hat)+eps)
```

v는 gradient 제곱의 이동평균인 두 번째 raw moment이며 분산 자체가 아니다. 일정하게 큰 gradient도 v를 크게 만든다. 따라서 ‘요동이 작으면 v가 작다’고 설명하면 틀릴 수 있다. 0에서 시작한 m·v의 초기 편향을 `1-beta**t`로 보정하고, eps는 분모가 작을 때의 수치 문제를 줄인다. [Adam 원 논문](https://arxiv.org/abs/1412.6980)

현재 `lrn-mnist/src/optimizers.py`에는 SGD와 Adam이 구현되어 있다. 두 클래스는 `update(params, grads)`로 배열을 갱신하며 기본 lr은 각각 0.01, 0.001이다. Momentum·AdaGrad·RMSProp은 아래 독립 계산 모델에서 비교하는 규칙이지 현재 레포의 구현 클래스가 아니다. m·v의 파라미터별 shape와 학습 재개 계약은 뒤의 상태 저장 설명과 함께 확인한다. [현재 MNIST optimizer · 61b7000](https://github.com/woonyong-kr/lrn-mnist/blob/61b7000fc084fc5f8de52cc665eca69c31b23eb8/src/optimizers.py)

## L2 페널티와 AdamW를 혼동하지 않는다

큰 가중치는 입력 변화에 민감한 모델을 만드는 한 요인이 될 수 있다. 그러나 가중치 norm이 크다는 사실만으로 과적합을 판정하거나 작다는 사실만으로 일반화를 보장하지는 않는다. 정규화는 학습 목적이나 갱신 규칙을 바꾸는 선택이고, 강도는 validation 결과로 판단한다.

같은 대상 가중치에 대해 `L_total=L_data+lambda/2*sum(W²)`로 정의하면 gradient는 `g_data+lambda*W`다. 앞의 `1/2`를 생략했다면 미분 결과도 `2*lambda*W`로 바뀐다. NumPy로 구현할 때는 손실에 더한 대상과 gradient에 더한 대상을 일치시킨다. 손실만 바꾸고 `grads`에 벌점의 미분을 더하지 않으면 그 벌점으로 가중치를 학습하지 않는다.

Momentum이나 적응적 상태가 없는 기본 SGD에서는, 갱신 전 W에서 계산한 같은 데이터 gradient와 lambda를 쓸 때 다음 두 식이 같다.

`W_new=W_old-lr*(g_data+lambda*W_old)`

`W_new=(1-lr*lambda)*W_old-lr*g_data`

이 동치를 모든 optimizer에 확장하면 안 된다. Adam에 L2 gradient를 넣으면 `g_data+lambda*W_old`가 m과 v에 모두 누적된다. 단순한 곱셈 감쇠와는 이후 상태까지 달라진다. v가 큰 성분에서 벌점만 독립적으로 약해진다고 설명하기도 어렵다. 데이터 gradient와 벌점이 함께 이동평균을 바꾸기 때문이다. 이것이 Adam+L2가 모든 상황에서 잘못된 선택이라는 뜻은 아니다. [Decoupled Weight Decay Regularization](https://arxiv.org/abs/1711.05101)

AdamW는 m·v를 데이터 gradient로 갱신하고 감쇠를 분리한다. `d=m_hat/(sqrt(v_hat)+eps)`라면 한 업데이트는 `W_new=(1-lr*lambda)*W_old-lr*d`다. 데이터 gradient는 갱신 전 W에서 계산한다. 따라서 gradient를 계산한 뒤 기존 W를 감쇠하고 적응적 이동량을 빼거나, 별도로 보관한 W_old에서 감쇠량을 계산해야 한다. 적응적 이동을 먼저 한 **새 W 전체를 곱셈 감쇠하면** `(1-lr*lambda)*(W_old-lr*d)`가 되어 적응적 이동량까지 감쇠하는 다른 식이 된다. [PyTorch AdamW 2.9](https://docs.pytorch.org/docs/2.9/generated/torch.optim.AdamW.html)

분리됐다는 말은 학습률과 무관하다는 뜻도 아니다. 한 step의 감쇠 계수는 lr과 lambda 둘 다에 의존한다. 보통의 `0≤lr*lambda<1`에서 감쇠 항 자체는 가중치를 줄이지만, 데이터 gradient 갱신을 더한 최종 norm은 커질 수 있다. bias나 정규화 계수를 제외할지도 parameter group으로 명시해야 하며 AdamW가 자동으로 판단해 주지 않는다. PyTorch 2.9의 `Adam`은 기본 `decoupled_weight_decay=False`이고, True로 설정하면 AdamW와 같은 분리 방식을 선택할 수 있다. 이름만으로 모든 버전과 옵션의 동작을 단정하지 않는다. [PyTorch Adam 2.9](https://docs.pytorch.org/docs/2.9/generated/torch.optim.Adam.html)

현재 작은 GPT의 실행 경로는 `AdamW(model.parameters(), ...)` 한 그룹을 사용한다. 코드의 fallback은 `learning_rate=4e-4`, `weight_decay=0.1`이며 설정으로 바꿀 수 있다. bias·정규화 계수를 따로 제외하는 그룹은 이 경로에 없다. 이는 현재 구현의 사실이지 권장 최적 설정이나 이번 작업의 학습 실험 결과가 아니다. [현재 GPT 학습 경로 · 027830d](https://github.com/woonyong-kr/lrn-gpt/blob/027830d7f49904f656c2d3003d4f6a818ef50269/src/runnable.py)

### 갱신 규칙과 감쇠를 같은 입력으로 계산한다

다음 표준 라이브러리 예제는 파라미터·gradient·m·v·t만 가진 독립 산술 모델이다. 같은 인터페이스에서 다섯 갱신 규칙을 비교한 다음, 같은 엔진에 일정한 gradient를 넣어 L2와 감쇠 순서를 확인한다. PyTorch나 MNIST·GPT 학습을 실행하는 코드가 아니다.

먼저 `f(x,y)=x²+100y²`, `(x,y)=(5,5)`, `lr=0.01`을 생각하자. SGD의 y는 `y_new=(1-200*lr)*y_old=-y_old`이므로 ±5로 진동한다. 이 방향이 수렴하려면 `|1-200*lr|<1`, 즉 `0<lr<0.01`이어야 한다. 아래에서 실제 값을 확인할 수 있다.

```run-python
import math


def run(kind, start, lr, steps, decay=0.0, fixed_gradient=None):
    # A scalar/vector arithmetic model, not a framework implementation.
    w = list(start)
    m, v = [0.0] * len(w), [0.0] * len(w)
    eps = 1e-8
    for t in range(1, steps + 1):
        g = (list(fixed_gradient) if fixed_gradient is not None
             else [2 * w[0], 200 * w[1]])
        for i, old in enumerate(w):
            grad = g[i] + decay * old if kind == "adam_l2" else g[i]
            if kind == "sgd":
                direction = grad
            elif kind == "momentum":
                m[i] = 0.9 * m[i] + 0.1 * grad
                direction = m[i]
            elif kind == "adagrad":
                v[i] += grad * grad
                direction = grad / (math.sqrt(v[i]) + eps)
            elif kind == "rmsprop":
                v[i] = 0.99 * v[i] + 0.01 * grad * grad
                direction = grad / (math.sqrt(v[i]) + eps)
            elif kind in ("adam", "adam_l2", "adamw"):
                m[i] = 0.9 * m[i] + 0.1 * grad
                v[i] = 0.999 * v[i] + 0.001 * grad * grad
                m_hat = m[i] / (1 - 0.9 ** t)
                v_hat = v[i] / (1 - 0.999 ** t)
                direction = m_hat / (math.sqrt(v_hat) + eps)
            else:
                raise ValueError(kind)
            shrink = decay if kind in ("sgd", "adamw") else 0.0
            w[i] = (1 - lr * shrink) * old - lr * direction
    return w


print("quadratic: x*x + 100*y*y; start=(5,5); lr=0.01; updates=30")
for kind in ("sgd", "momentum", "adagrad", "rmsprop", "adam"):
    x, y = run(kind, [5.0, 5.0], 0.01, 30)
    print(f"{kind:8s} x={x:.6f} y={y:.6f} loss={x*x+100*y*y:.6f}")
x, y = run("sgd", [5.0, 5.0], 0.01, 30)
assert math.isclose(x, 5 * 0.98 ** 30) and y == 5.0
x, y = run("sgd", [5.0, 5.0], 0.005, 30)
assert math.isclose(x, 5 * 0.99 ** 30) and y == 0.0
print(f"sgd lr=0.005: x={x:.6f} y={y:.6f}")

print("constant gradient=0.1; start=5; lr=0.01; decay=0 or 0.1")
for steps in (1, 10):
    plain = run("sgd", [5.0], 0.01, steps, fixed_gradient=[0.1])[0]
    decay = run("sgd", [5.0], 0.01, steps, 0.1, [0.1])[0]
    assert math.isclose(plain, 5 - steps * 0.001)
    assert math.isclose(decay, 6 * 0.999 ** steps - 1)
    print(f"sgd updates={steps}: plain={plain:.12f} decay={decay:.12f}")
coupled = run("adam_l2", [5.0], 0.01, 1, 0.1, [0.1])[0]
decoupled = run("adamw", [5.0], 0.01, 1, 0.1, [0.1])[0]
adaptive_step = 0.01 * 0.1 / (0.1 + 1e-8)
decay_after_update = (5 - adaptive_step) * (1 - 0.01 * 0.1)
assert math.isclose(decoupled, 5 * 0.999 - adaptive_step)
assert math.isclose(decay_after_update - decoupled, 0.001 * adaptive_step)
print(f"adam_l2={coupled:.12f} adamw={decoupled:.12f}")
print(f"different rule (decay after adaptive update)={decay_after_update:.12f}")
```

Python 3.9.6에서 실행한 결과다.

```text
quadratic: x*x + 100*y*y; start=(5,5); lr=0.01; updates=30
sgd      x=2.727422 y=5.000000 loss=2507.438829
momentum x=3.114115 y=0.220214 loss=14.547134
adagrad  x=4.904503 y=4.904503 loss=2429.468805
rmsprop  x=4.053890 y=4.053890 loss=1659.836471
adam     x=4.701538 y=4.701538 loss=2232.550055
sgd lr=0.005: x=3.698502 y=0.000000
constant gradient=0.1; start=5; lr=0.01; decay=0 or 0.1
sgd updates=1: plain=4.999000000000 decay=4.994000000000
sgd updates=10: plain=4.990000000000 decay=4.940269281258
adam_l2=4.990000000167 adamw=4.985000001000
different rule (decay after adaptive update)=4.985010000999
```

SGD의 x는 `5*0.98**30≈2.727422`, y는 5다. lr을 0.005로 바꾸면 이 함수의 y는 첫 업데이트에 0이 되지만 x는 여전히 천천히 줄어든다. 출력에서 Momentum의 최종 loss가 작더라도, 같은 lr 하나와 30회만으로 전체 알고리즘의 우열을 정할 수는 없다. 각 규칙에 맞춘 설정 탐색, 같은 평가 예산과 실제 데이터에서의 검증이 별도로 필요하다.

일정한 `g=0.1`, `W=5`, `lr=0.01`, `lambda=0.1`의 SGD는 한 번 뒤 감쇠 없이 4.999, 감쇠를 넣으면 4.994다. 10회 뒤에는 각각 4.99와 `6*0.999**10-1≈4.940269281258`이다. 매 업데이트에서 바뀐 W에 감쇠를 적용한 결과다. 같은 설정에서 **갱신 전** W가 5이면 감쇠량은 0.005, W가 0.1이면 0.0001이 된다.

모델 설정표는 출처와 맥락을 함께 읽는다. GPT-3 논문 Appendix B는 weight decay 0.1과 optimizer 명칭 Adam을 쓰고 분리 감쇠 논문을 인용한다. 이 표기만으로 특정 PyTorch 클래스 사용까지 단정하지 않는다. LLaMA 논문 §2.3은 AdamW와 weight decay 0.1을 명시한다. 어느 경우도 작은 개인 모델의 최적값을 보장하지 않는다. `1e-4~1e-2` 같은 범위 역시 실험 후보일 수는 있지만 보편적 권장값으로 취급하지 않는다. [GPT-3 학습 설정](https://arxiv.org/html/2005.14165v4), [LLaMA 학습 설정](https://arxiv.org/html/2302.13971v1)
## 학습률 스케줄과 clipping의 위치

학습률은 gradient가 만든 이동량의 크기를 조절한다. 너무 큰 값은 진동이나 발산을, 너무 작은 값은 느린 진행을 만들 수 있다. 초기 손실이 크다고 반드시 최적점에서 멀다는 뜻은 아니며, 고정 학습률이 항상 실패하는 것도 아니다. optimizer가 `self.lr`를 보관한다면 외부에서 그 값을 바꿀 수 있으므로 SGD를 고정 학습률만 쓰는 방식으로 정의하지 않는다.

| 방식 | 바꾸는 규칙 | 함께 정할 것 |
|---|---|---|
| 선형 warmup | 처음 W번 동안 peak까지 점차 증가 | 첫 업데이트의 lr, W |
| Step Decay | 일정한 epoch 또는 update 간격마다 gamma를 곱함 | 기준 단위, 최초 lr, 간격, gamma |
| Cosine Decay | 진행도에 따라 peak에서 floor까지 부드럽게 감소 | 시작·종료 지점, floor, 종료 이후 동작 |

Warmup은 초기 업데이트를 작게 시작하기 위한 선택이다. 총 학습의 5~10% 같은 비율을 모든 모델에 적용할 필수값으로 정하지 않는다. 원 논문에서도 길이를 세는 단위가 다르다. GPT-3는 warmup을 토큰 수로 설명하고, LLaMA는 2,000 step을 사용한다. 모델 크기와 batch 설정을 제외한 숫자만 옮기면 서로 다른 스케줄이 된다. [GPT-3 Appendix B](https://arxiv.org/html/2005.14165v4), [LLaMA §2.3](https://arxiv.org/html/2302.13971v1)

warmup 뒤 cosine을 붙인 직접 구현에서는 **실제 optimizer 업데이트 번호** t를 1부터 센다고 하자. `0<W<T`일 때 `t≤W`에서는 `lr=peak*t/W`, 그 뒤에는 `u=(t-W)/(T-W)`와 `lr=floor+(peak-floor)*(1+cos(pi*u))/2`를 쓴다. warmup을 제외한 진행도이므로 이 구간을 단순히 `u=t/T`로 계산하지 않는다. 아래 모델은 t가 T를 넘으면 floor에 고정한다. W=0일 때는 첫 업데이트가 peak, T번째가 floor가 되도록 별도로 정의한다. 이는 이 모델의 계약이며 모든 라이브러리 scheduler의 종료 동작을 설명하는 것은 아니다.

`W=100`, `T=1000`, `peak=0.001`, `floor=0.0001`이면 첫 lr은 0.00001이다. 100번째에 peak에 도달하고, cosine 구간의 중간은 500번째가 아니라 **550번째**다. 이때 lr은 0.00055다.

Step Decay를 초기값으로 직접 계산한다면 `lr=initial_lr*gamma**(epoch//interval)`을 쓴다. 예를 들어 0부터 세는 epoch, 초기값 0.1, 간격 30, gamma=0.1이면 epoch 0~29는 0.1, 30~59는 0.01, 60~89는 0.001이다. 현재 lr에 이미 누적된 지수를 매번 다시 곱하지 않는다. [PyTorch StepLR 2.9의 epoch 예제](https://docs.pytorch.org/docs/2.9/generated/torch.optim.lr_scheduler.StepLR.html)

### 곡선보다 실제 업데이트에 사용된 값부터 확인한다

직접 `optimizer.lr`를 바꾸는 구현에서는 해당 업데이트가 사용할 lr을 먼저 지정한다. optimizer가 peak로 시작하고 `optimizer.update()` 뒤에 처음으로 작은 warmup 값을 지정하면 첫 업데이트는 warmup을 건너뛰고 이후 값도 한 칸 밀린다. 반면 PyTorch의 scheduler는 초기 lr 설정과 자체 상태를 포함하며 일반적인 사용법은 `optimizer.step()` **뒤에** `scheduler.step()`을 호출하는 것이다. 직접 만든 함수의 순서를 라이브러리에 그대로 적용하면 안 된다. 실제로 optimizer가 사용한 값과 scheduler의 API 계약을 함께 확인한다. [PyTorch 학습률 조정과 호출 순서](https://docs.pytorch.org/docs/2.9/optim.html)

다음 독립 산술 모델은 lr 곡선·호출 시점·epoch 경계·batch 수·재개 시점을 하나의 업데이트 시간표로 확인한다. scalar `w²/2`에 대한 세 번의 SGD 계산은 호출 순서의 차이만 보여 주며 모델 학습 성능을 측정하지 않는다.

```run-python
import math


def lr_at(update, warmup=100, total=1000, peak=0.001, floor=0.0001):
    # update is one-based; this model stays at floor after total updates.
    if update < 1 or total < 2 or not 0 <= warmup < total:
        raise ValueError("require update >= 1, total >= 2, 0 <= warmup < total")
    if not 0 <= floor <= peak or peak <= 0:
        raise ValueError("require 0 <= floor <= peak and peak > 0")
    if warmup and update <= warmup:
        return peak * update / warmup
    progress = ((update - warmup) / (total - warmup) if warmup
                else (update - 1) / (total - 1))
    progress = min(progress, 1.0)
    return floor + (peak - floor) * (1 + math.cos(math.pi * progress)) / 2


print("warmup=100; total=1000; peak=0.001; floor=0.0001")
for update in (1, 50, 100, 250, 500, 550, 750, 1000):
    print(f"update={update:4d} lr={lr_at(update):.12f}")
assert math.isclose(lr_at(100), 0.001)
assert math.isclose(lr_at(550), 0.00055)
assert math.isclose(lr_at(1000), 0.0001)
assert math.isclose(lr_at(1001), 0.0001)
assert math.isclose(lr_at(1, warmup=0), 0.001)

# Same SGD scalar objective (w*w/2), different assignment timing.
correct_w, late_w, late_lr = 5.0, 5.0, 0.001
correct_used, late_used = [], []
for update in range(1, 4):
    current_lr = lr_at(update)
    correct_used.append(current_lr)
    correct_w -= current_lr * correct_w
    late_used.append(late_lr)
    late_w -= late_lr * late_w
    late_lr = lr_at(update)
print("set lr before update:", [f"{x:.8f}" for x in correct_used])
print("start at peak; set lr after update:", [f"{x:.8f}" for x in late_used])
print(f"w after 3 updates: before={correct_w:.12f} after={late_w:.12f}")
assert math.isclose(correct_used[0], 0.00001)
assert math.isclose(late_used[0], 0.001)

print("step decay: initial_lr=0.1; gamma=0.1; epoch interval=30")
for epoch in (0, 29, 30, 59, 60):
    print(f"epoch={epoch:2d} lr={0.1 * 0.1 ** (epoch // 30):.6f}")
samples, batch_size = 10, 4
actual_batches = len(range(0, samples, batch_size))
assert actual_batches == math.ceil(samples / batch_size) == 3
print(f"keep partial batch: floor estimate={samples//batch_size} actual={actual_batches}")
completed_updates = 3
print(f"resume next lr={lr_at(completed_updates+1):.8f}; reset lr={lr_at(1):.8f}")
```

Python 3.9.6에서 실행한 결과다.

```text
warmup=100; total=1000; peak=0.001; floor=0.0001
update=   1 lr=0.000010000000
update=  50 lr=0.000500000000
update= 100 lr=0.001000000000
update= 250 lr=0.000939711432
update= 500 lr=0.000628141680
update= 550 lr=0.000550000000
update= 750 lr=0.000260745576
update=1000 lr=0.000100000000
set lr before update: ['0.00001000', '0.00002000', '0.00003000']
start at peak; set lr after update: ['0.00100000', '0.00001000', '0.00002000']
w after 3 updates: before=4.999700005500 after=4.994850150999
step decay: initial_lr=0.1; gamma=0.1; epoch interval=30
epoch= 0 lr=0.100000
epoch=29 lr=0.100000
epoch=30 lr=0.010000
epoch=59 lr=0.010000
epoch=60 lr=0.001000
keep partial batch: floor estimate=2 actual=3
resume next lr=0.00004000; reset lr=0.00001000
```

마지막 작은 batch도 처리하는 `range(0,N,B)` 루프는 epoch마다 `ceil(N/B)`번 호출한다. `total_steps=epochs*(N//B)`로 잡으면 N이 B로 나누어떨어지지 않을 때 실제 루프보다 짧아진다. `drop_last`, gradient accumulation, 건너뛴 업데이트가 있다면 batch 수와 optimizer 업데이트 수도 달라질 수 있다. 스케줄이 어느 단위를 세는지 고정하고 그 카운터를 저장한다. 재개할 때 카운터를 0으로 초기화하면 중간부터의 lr 대신 warmup을 다시 적용하게 된다.

현재 `lrn-gpt/src/runnable.py`는 고정 lr의 AdamW를 사용하고 scheduler를 호출하지 않는다. 과거 실험 코드의 warmup을 현재 실행 경로의 기능이라고 설명하지 않는다. 위 예제도 현재 레포에 추가한 기능이 아니다. [현재 GPT 실행 경로 · 027830d](https://github.com/woonyong-kr/lrn-gpt/blob/027830d7f49904f656c2d3003d4f6a818ef50269/src/runnable.py)

일반적인 PyTorch 단일 update는 zero_grad → forward/loss → backward → 필요 시 gradient clipping → optimizer.step 순서다. backward는 등록된 모든 파라미터가 아니라 gradient를 요구하고 loss에 연결된 경로에 기여한다. gradient는 누적되므로 accumulation을 의도하지 않으면 이전 값을 초기화한다.

Global norm clipping은 여러 파라미터의 gradient를 이어 붙인 벡터의 norm을 제한한다. 임계값을 넘으면 같은 비율로 줄이며 loss를 다시 미분하는 단계는 아니다. 현재 작은 GPT 경로는 backward 뒤 norm 1.0 clipping을 호출한다. AMP에서는 unscale 뒤 clipping해야 하고, accumulation에서는 update에 사용할 gradient를 모은 뒤 적용한다.

NumPy 구현의 `gradient()`는 `model.grads`를 채우고 `update(params,grads)`가 배열을 제자리에서 갱신한다. PyTorch의 `loss.backward()`·`param.grad`·`optimizer.step()`이 각각 대응한다. `model.parameters()`에는 동결된 파라미터도 포함될 수 있어 이름만으로 전부 학습 가능하다고 가정하지 않는다.
## 재개하려면 optimizer의 시간도 저장한다

현재 MNIST의 Adam은 각 파라미터와 같은 shape의 m·v 및 t를 사용하고 beta1=0.9, beta2=0.999, eps=1e-8을 적용한다. 이는 그 구현의 설정이지 다른 모델의 최적값은 아니다. 학습을 정확한 다음 update로 재개하려면 가중치뿐 아니라 이 상태와 스케줄·난수 상태도 필요하다. `lrn-gpt` checkpoint는 optimizer 상태와 global_step을 함께 저장한다. MNIST의 추론 모델 저장은 학습 재개 상태 전체를 담는 계약과 구분한다. [MNIST optimizer 구현](https://github.com/woonyong-kr/lrn-mnist/blob/61b7000fc084fc5f8de52cc665eca69c31b23eb8/src/optimizers.py), [GPT 학습·저장 경로](https://github.com/woonyong-kr/lrn-gpt/blob/027830d7f49904f656c2d3003d4f6a818ef50269/src/runnable.py)

## Adam의 상태도 파라미터별로 보관한다

`params['W']`와 `grads['W']`가 행렬이면 Adam의 `m['W']`, `v['W']`도 같은 shape여야 한다. `b`, BatchNorm의 `gamma`, `beta` 등 다른 파라미터에도 각각 독립된 상태가 필요하다. 하나의 누적값을 모든 층에 공유하면 서로 다른 파라미터의 갱신 이력이 섞인다.

학습 개선 기법 노트와 HyeYeon의 optimizer 정리는 특정 이차함수 조건에서 갱신 경로를 비교한다. 그 조건에서의 결과만으로 MNIST나 다른 모델에서도 Adam이 항상 더 낫다고 판단할 수는 없다. [06. 학습 개선 기법 · 1c28de6](https://github.com/woonyong-kr/lrn-mnist/blob/1c28de6983671e891faac453e392f68b354bdb53/docs/woonyong/deep-learning-from-scratch/06-training-techniques.md) [Optimizer 정리: Momentum, AdaGrad, Adam · 1c28de6](https://github.com/woonyong-kr/lrn-mnist/blob/1c28de6983671e891faac453e392f68b354bdb53/src/study/HyeYeon/md/%EB%AA%A8%EB%A9%98%ED%85%80_AdaGrad_Adam_%EC%B5%9C%EC%A0%81%ED%99%94_%EC%9D%B4%ED%95%B4.md)
