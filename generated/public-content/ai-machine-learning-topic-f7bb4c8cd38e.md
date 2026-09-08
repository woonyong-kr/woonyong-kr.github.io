---
layout: default
title: 역전파
nav_order: 5
permalink: /wiki/ai-machine-learning-topic-f7bb4c8cd38e/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-topic-f7bb4c8cd38e
projection_sha256: adb813bea3da26d3ef1b0e7c413be741467a53b581cbbf583c42f3fcfb38922d
parent: 딥러닝
content_status: ready
public_parent_id: Wiki/ai-machine-learning/deep-learning
grand_parent: AI
---

# 역전파
{: .no_toc }

## 손실에서 입력 방향으로 계산을 재사용한다

역전파는 스칼라 손실 L을 이루는 계산 그래프에서 연쇄법칙을 역순으로 적용해 각 입력과 파라미터의 gradient를 구한다. gradient를 계산하는 단계이며 실제 파라미터 변경은 [optimizer](/wiki/ai-machine-learning-topic-63f78704eb10/)가 맡는다. `L=f(g(x))`라면 `dL/dx=(dL/dg)(dg/dx)`이고, 입력이 여러 경로에서 사용되면 각 경로의 기여를 더한다.

중앙 차분은 한 파라미터에 대해 `(L(w+h)-L(w-h))/(2h)`를 계산한다. P개를 모두 검사하면 손실 평가가 2P회 필요하다. Affine 파라미터 535,818개면 1,071,636회다. 역전파는 한 순전파의 중간값을 재사용하고 그래프를 역순으로 한 번 순회한다. 순전파와 역전파의 비용은 같지 않으므로 호출 횟수 비율을 실제 속도 향상 배수로 쓰지 않는다. BatchNorm의 gamma·beta를 포함하면 검사할 파라미터 수도 늘어난다.

## 각 연산이 돌려주는 국소 gradient

덧셈 `z=x+y`는 상류 gradient를 두 입력에 전달한다. 곱셈 `z=xy`는 각각 다른 입력의 forward 값을 곱한다. 이 때문에 층은 backward에 필요한 입력·활성화·마스크를 저장한다.

| 연산 | 순전파 | 상류 gradient G에 대한 역전파 |
|---|---|---|
| Affine | `Y=XW+b` | `dX=GWᵀ`, `dW=XᵀG`, `db=sum(G, batch축)` |
| ReLU | `max(0,X)` | 양수 위치는 G, 음수 위치는 0 |
| Softmax+CE | class 확률과 평균 loss | logits에 대해 `(p-one_hot)/N` |
| 공유 파라미터 | 여러 위치에서 같은 값을 사용 | 사용된 각 경로의 gradient 합 |

ReLU의 0에서는 고전적인 미분이 존재하지 않는다. 이 구현은 0의 gradient를 0으로 선택한다. 수치 미분으로 확인할 때 작은 perturbation이 0의 양쪽을 가로지르면 불일치가 생길 수 있다.

Affine의 X가 `(N,I)`, W가 `(I,O)`, G가 `(N,O)`이면 `X.T@G`는 `(I,O)`다. 1차원 벡터 x에서 `x.T`는 shape를 바꾸지 않으므로 샘플 하나의 `dW`는 outer product로 계산하거나 X를 `(1,I)`로 유지한다.

## 작은 네트워크의 값을 따라간다

고정 입력 x=`[1,0.5,-0.3]`, 정답 class 1을 두고 다음 행렬을 사용한다.

```text
W1 = [[0.2,0.4],[0.3,-0.1],[0.1,0.5]], b1=[0.1,-0.1]
W2 = [[0.3,-0.2],[0.1,0.4]], b2=[0,0]
z1=xW1+b1=[0.42,0.10], a1=ReLU(z1)=[0.42,0.10]
z2=a1W2+b2=[0.136,-0.044]
p≈[0.544879,0.455121], L≈0.787192
dz2≈[0.544879,-0.544879]
da1=dz2 W2ᵀ≈[0.272439,-0.163464]
dz1=da1 (두 z1 성분이 모두 양수)
dW2=outer(a1,dz2), dW1=outer(x,dz1)
```

이 계산은 학습된 성능값이 아니라 고정된 숫자에 연쇄법칙을 적용한 모형이다. 손실만으로 첫 층의 기울기를 직접 추측하는 대신 출력 gradient에서 각 행렬곱·ReLU를 되짚는다.

다음 독립 모형은 같은 네트워크에서 W1의 각 성분을 중앙 차분으로 확인한다. 모든 입력을 코드 안에 정의하고 ReLU의 꺾이는 지점을 피한다. 실제 MNIST 전체의 gradient 검사 결과를 대신하지 않는다.

```run-python
from math import exp, log

x = [1.0,0.5,-0.3]
w1 = [[0.2,0.4],[0.3,-0.1],[0.1,0.5]]
b1 = [0.1,-0.1]
w2 = [[0.3,-0.2],[0.1,0.4]]

def forward():
    z1 = [sum(x[i]*w1[i][j] for i in range(3))+b1[j] for j in range(2)]
    a1 = [max(0,v) for v in z1]
    z2 = [sum(a1[i]*w2[i][j] for i in range(2)) for j in range(2)]
    e = [exp(v-max(z2)) for v in z2]
    p = [v/sum(e) for v in e]
    return -log(p[1]), z1, p

loss, z1, p = forward()
dz2 = [p[0],p[1]-1]
dz1 = [sum(dz2[j]*w2[i][j] for j in range(2)) * (z1[i]>0) for i in range(2)]
analytic = [[v*g for g in dz1] for v in x]
h, errors = 1e-5, []
for i in range(3):
    for j in range(2):
        old = w1[i][j]
        try:
            w1[i][j] = old+h
            plus = forward()[0]
            w1[i][j] = old-h
            minus = forward()[0]
        finally:
            w1[i][j] = old
        errors.append(abs((plus-minus)/(2*h)-analytic[i][j]))
print(f'loss={loss:.6f}')
print('dW1', [[round(v,6) for v in row] for row in analytic])
print('max_abs_error_below_1e-8', max(errors)<1e-8)
```

Python 3.9.6에서 확인한 출력이다.

```text
loss=0.787192
dW1 [[0.272439, -0.163464], [0.13622, -0.081732], [-0.081732, 0.049039]]
max_abs_error_below_1e-8 True
```

## 저장한 중간값과 optimizer 상태를 분리한다

MNIST의 `Affine.forward`는 X와 원래 shape를 저장하고, `backward`는 `dW, db`와 원래 shape의 입력 gradient를 만든다. ReLU·Dropout은 forward 마스크, BatchNorm은 평균 중심화 값·표준편차·정규화 결과를 사용한다. 이 중간값은 해당 forward에 대응해야 한다. 다른 입력을 forward한 뒤 오래된 loss의 backward를 호출하면 저장값이 덮일 수 있다.

`NeuralNetwork.gradient(x,y)`는 확률과 loss를 계산하고 결합 gradient를 만든 뒤 층을 역순으로 호출한다. Affine의 W·b뿐 아니라 활성화된 BatchNorm의 gamma·beta gradient도 수집한다. 이후 `optimizer.update(params,grads)`가 파라미터를 바꾼다. optimizer의 Adam 상태 m·v는 한 forward의 임시값과 달리 update 사이에 이어진다.

## 수치 미분은 같은 함수를 비교해야 한다

### 수식의 미분과 함수값의 차이

수치 미분은 함수값을 조금씩 달리 구해 미분을 근사한다. 해석적 미분은 `f(x)=x²`에서 `f'(x)=2x`를 얻는 것처럼 미분 규칙을 수식에 적용한다. 역전파는 실제 계산 그래프의 국소 미분을 역순으로 연결하는 reverse-mode 자동 미분에 해당한다. 전체 미분식을 기호로 전개해 저장하는 symbolic differentiation과는 구현 방법이 다르다. [PyTorch의 자동 미분과 gradient 검사](https://docs.pytorch.org/docs/2.14/notes/gradcheck.html)

전방 차분은 `(f(x+h)-f(x))/h`, 중앙 차분은 `(f(x+h)-f(x-h))/(2h)`다. 함수가 충분히 매끄러울 때 전방 차분의 절단 오차는 O(h), 중앙 차분은 O(h²)다. Taylor 전개에서 `f(x+h)`와 `f(x-h)`를 빼면 같은 부호의 짝수 차수 항이 상쇄되어, `2h`로 나눈 뒤 남는 첫 오차 항이 h²에 비례한다. 이는 h를 줄였을 때의 오차 차수이며 실제 오차가 정확히 h 또는 h²라는 뜻은 아니다. h를 지나치게 줄이면 뺄셈의 소거와 반올림 오차가 커질 수 있다.

```text
f(x+h) = f(x) + f'(x)h + f''(x)h²/2 + O(h³)
f(x-h) = f(x) - f'(x)h + f''(x)h²/2 + O(h³)
f(x+h) - f(x-h) = 2f'(x)h + O(h³)
```

`f(x,y)=x²+y²`를 (3,4)에서 미분하면 gradient는 (6,8)이다. y에 대한 중앙 차분에서 `25.00080001-24.99920001=0.0016`이고, 이를 `0.0002`로 나누면 8이 된다. 부동소수점 계산은 마지막 자릿수가 달라질 수 있으므로 `==` 대신 허용 오차로 비교한다.

```run-python
from math import isclose

def value(point):
    return sum(v*v for v in point)

def numeric_gradient(f, point, h=1e-4):
    assert h > 0
    x = [float(v) for v in point]
    gradient = []
    for i, old in enumerate(x):
        try:
            x[i] = old + h
            plus = f(x)
            x[i] = old - h
            minus = f(x)
        finally:
            x[i] = old
        gradient.append((plus-minus)/(2*h))
    return gradient

point = [3.0, 4.0]
numeric = numeric_gradient(value, point)
analytic = [2*v for v in point]
print('중앙 차분:', [round(v, 6) for v in numeric])
print('해석적 미분:', analytic)
print('입력 보존:', point)
assert all(isclose(n, a, rel_tol=1e-8, abs_tol=1e-8)
           for n, a in zip(numeric, analytic))

current = point[:]
for _ in range(10):
    grad = numeric_gradient(value, current)
    current = [v-0.1*g for v, g in zip(current, grad)]
print('수치 gradient로 10회 이동:', [round(v, 6) for v in current])
print('함수값:', round(value(current), 6))
assert value(current) < value(point)
```

이 예제는 좌표 두 개의 함수에서 중앙 차분과 경사 하강의 연결을 보여 준다. N차원 배열에서도 각 좌표를 차례로 바꾸는 원리는 같으며, NumPy의 `nditer(..., flags=['multi_index'])`로 원래 인덱스를 유지할 수 있다. 계산 전에 float 배열을 준비하고, 각 좌표의 평가가 끝나거나 예외가 나도 원래 값을 복원해야 한다.

Gradient 검사에서는 절대 오차뿐 아니라 `|g₁-g₂| / max(|g₁|, |g₂|, eps)` 같은 상대 오차도 살핀다. eps는 두 값이 모두 0에 가까울 때 분모를 보호한다. 특정 예제의 `1e-5` 합격 기준을 모든 dtype·함수에 적용할 수는 없다. ReLU의 꺾이는 지점을 피하고 Dropout의 마스크를 고정하거나 끈다. BatchNorm의 통계 갱신도 두 평가 사이에 같은 조건을 유지해야 한다. 확률을 clip한 loss와 clip하지 않은 결합 gradient는 같은 함수를 미분한 결과가 아니다. 작은 모형에서 시작해 실제 구현의 필요한 좌표를 검사하면 모든 파라미터를 수치 미분할 필요는 없다.
