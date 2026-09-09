---
layout: default
title: 역전파
nav_order: 5
permalink: /wiki/ai-machine-learning-topic-f7bb4c8cd38e/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-topic-f7bb4c8cd38e
projection_sha256: 2f80cade4b3364aaab7d298c7d40a719edd6e447dc1969b39d83f95f201ef336
parent: 딥러닝
content_status: ready
public_parent_id: Wiki/ai-machine-learning/deep-learning
grand_parent: AI
---

# 역전파
{: .no_toc }

## 손실에서 입력 방향으로 계산을 재사용한다

역전파는 스칼라 손실 L을 이루는 계산 그래프에서 연쇄법칙을 역순으로 적용해 각 입력과 파라미터의 gradient를 구한다. gradient를 계산하는 단계이며 실제 파라미터 변경은 [optimizer](/wiki/ai-machine-learning-topic-63f78704eb10/)가 맡는다. `L=f(g(x))`라면 `dL/dx=(dL/dg)(dg/dx)`이고, 입력이 여러 경로에서 사용되면 각 경로의 기여를 더한다.

계산 그래프는 복잡한 함수를 작은 연산과 데이터 의존 관계로 표현한다. 연산을 노드로, 입력·출력의 전달을 간선으로 그릴 수 있다. 구현에서는 결과값 객체가 자신을 만든 연산과 부모 값을 가리키기도 한다. 순전파에서 값을 계산하고, 역전파에서는 저장한 중간값으로 국소 미분을 평가한다. gradient는 현재 입력 근처에서의 민감도이지, 어떤 입력이 잘못의 원인인지 판정한 값은 아니다.

### 작은 합성 함수에서 출발한다

다음 값은 고정된 수식의 계산이다. 환율 예시는 실제 시세가 아닌 가정이며, 여러 단계를 통과할 때 변화율을 곱한다는 뜻만 보여 준다.

| 합성 계산과 입력 | 순전파 값 | 역방향의 변화율 |
|---|---|---|
| `s=x+y; z=s*t`, x=2, y=3, t=3 | s=5, z=15 | `dz/ds=3`, `dz/dx=dz/dy=3`, `dz/dt=5` |
| 가격 100, 수량 2의 곱 | 총액 200 | 가격에 대해 2, 수량에 대해 100 |
| 달러→유로 0.85, 유로→원 1400을 가정 | 달러 금액에 1190을 곱함 | 두 국소 변화율의 곱 `0.85*1400=1190` |
| `u=2x+3; z=u²`, x=1 | u=5, z=25 | `(2u)*2=20`; 전개한 `4x²+12x+9`의 미분과 같음 |
| `z=Wx+b; L=(z-t)²/2`, x=2, W=3, b=1, t=10 | z=7, L=4.5 | `dL/dz=-3`, `dW=-6`, `db=-3`, `dx=-9` |

마지막 행에서 음수 dW는 W를 **충분히 작게** 늘릴 때 loss가 줄어드는 국소 방향을 뜻한다. 스칼라 함수의 gradient는 유클리드 길이가 같은 작은 이동 중 가장 빠르게 증가하는 방향이며, 반대 방향을 택해도 임의의 큰 학습률에서 loss 감소가 보장되지는 않는다.

스칼라 loss에서 시작하는 seed는 `dL/dL=1`이다. 벡터 출력에는 출력과 같은 shape의 상류 값이 필요하며, 어떤 출력의 조합을 미분할지 정해야 한다. 뒤의 자동 미분 절에서 이 계산을 VJP로 표현한다.

### 공유한 값의 gradient는 덮어쓰지 않고 더한다

`u=x*y; L=u*u+u`에서 u는 제곱의 두 피연산자와 마지막 덧셈에 쓰인다. x=2, y=3이면 u=6, L=42이며 `dL/du=6+6+1=13`이다. 따라서 `dL/dx=39`, `dL/dy=26`이다. 같은 부모를 가리키는 두 간선을 하나로 지우거나, 각 기여를 대입으로 덮어쓰면 이 값이 사라진다.

다음 독립 모형은 실수 스칼라의 덧셈·곱셈만 기록한다. forward 때 국소 미분값을 간선에 저장하고, 역위상 순서에서 `+=`로 누적한다. 텐서 연산·학습·범용 자동 미분기는 포함하지 않는다.

```run-python
from math import isclose

class Value:
    def __init__(self, value, edges=()):
        self.value = float(value)
        self.edges = edges
        self.grad = 0.0

    def __add__(self, other):
        return Value(self.value + other.value,
                     ((self, 1.0), (other, 1.0)))

    def __mul__(self, other):
        return Value(self.value * other.value,
                     ((self, other.value), (other, self.value)))

    def backward(self, seed=1.0):
        order, seen = [], set()
        def visit(node):
            if node in seen:
                return
            seen.add(node)
            for parent, _ in node.edges:
                visit(parent)
            order.append(node)
        visit(self)
        for node in order:
            node.grad = 0.0
        self.grad = float(seed)
        for node in reversed(order):
            for parent, local in node.edges:
                parent.grad += node.grad * local

x, y = Value(2), Value(3)
u = x * y
loss = u * u + u
loss.backward()
print(f'u={u.value:.1f} loss={loss.value:.1f}')
print(f'du={u.grad:.1f} dx={x.grad:.1f} dy={y.grad:.1f}')
assert (u.grad, x.grad, y.grad) == (13.0, 39.0, 26.0)

def objective(a, b):
    product = a * b
    return product * product + product

h = 1e-5
numeric_x = (objective(2+h, 3)-objective(2-h, 3))/(2*h)
numeric_y = (objective(2, 3+h)-objective(2, 3-h))/(2*h)
print('central_difference', [round(numeric_x, 6), round(numeric_y, 6)])
assert isclose(x.grad, numeric_x, rel_tol=1e-8, abs_tol=1e-8)
assert isclose(y.grad, numeric_y, rel_tol=1e-8, abs_tol=1e-8)

loss.backward(seed=2.0)
print(f'seed=2 dx={x.grad:.1f} dy={y.grad:.1f}')
assert (x.grad, y.grad) == (78.0, 52.0)
```

Python 3.9.6에서 한 번 실행해 확인한 출력이다.

```text
u=6.0 loss=42.0
du=13.0 dx=39.0 dy=26.0
central_difference [39.0, 26.0]
seed=2 dx=78.0 dy=52.0
```

이 모형의 `backward`는 호출할 때 도달 가능한 모든 gradient를 0으로 초기화한다. 뒤에서 설명할 PyTorch의 leaf `.grad` 누적 계약과 다르다. 값을 바꿔 재평가하려면 새 forward 그래프를 만든다. 층이 단순히 이어진 네트워크는 층 목록을 뒤집어 순회할 수 있지만, 일반적인 분기 그래프에서는 모든 후속 경로의 기여를 모은 다음 해당 노드를 처리해야 한다.

중앙 차분은 한 파라미터에 대해 `(L(w+h)-L(w-h))/(2h)`를 계산한다. P개를 모두 검사하면 손실 평가가 2P회 필요하다. Affine 파라미터 535,818개면 1,071,636회다. 역전파는 한 순전파의 중간값을 재사용하고 그래프를 역순으로 한 번 순회한다. 순전파와 역전파의 비용은 같지 않으므로 호출 횟수 비율을 실제 속도 향상 배수로 쓰지 않는다. BatchNorm의 gamma·beta를 포함하면 검사할 파라미터 수도 늘어난다.

## 각 연산이 돌려주는 국소 gradient

덧셈 `z=x+y`는 상류 gradient를 두 입력에 전달한다. 곱셈 `z=xy`는 각각 다른 입력의 forward 값을 곱한다. 이 때문에 층은 backward에 필요한 입력·활성화·마스크를 저장한다. 배열의 연쇄법칙에서는 원소별 곱만 사용하는 것이 아니라 연산에 맞는 행렬곱과 축 합산이 필요하다.

| 연산 | 순전파 | 상류 gradient G에 대한 역전파 |
|---|---|---|
| Affine | `Y=XW+b` | `dX=GWᵀ`, `dW=XᵀG`, `db=sum(G, batch축)` |
| ReLU | `max(0,X)` | 양수 위치는 G, 음수 위치는 0 |
| Softmax+CE | class 확률과 평균 loss | logits에 대해 `(p-one_hot)/N` |
| 공유 파라미터 | 여러 위치에서 같은 값을 사용 | 사용된 각 경로의 gradient 합 |

### Affine의 전치와 축 합산

Affine의 X가 `(N,I)`, W가 `(I,O)`, b가 `(O,)`, G가 `(N,O)`이면 `X.T@G`는 `(I,O)`다. 성분으로 쓰면 `dW[i,j]=sum_n X[n,i]*G[n,j]`다. W를 바꿨을 때 **출력 Y**가 변하는 경로를 미분한 것이며, 독립 입력 X를 W로 미분한 식이 아니다. bias는 모든 샘플에 공유되므로 배치 축의 기여를 합한다.

1차원 벡터 x에서 `x.T`는 shape를 바꾸지 않으므로 샘플 하나의 `dW`는 outer product로 계산하거나 X를 `(1,I)`로 유지한다. 예를 들어 입력 `(N,784)`, W `(784,256)`, G `(N,256)`이면 dW는 `(784,256)`, db는 `(256,)`, dX는 `(N,784)`다. 현재 구현은 forward에서 첫 축을 배치로 두고 나머지를 펼치며 backward 마지막에 입력의 원래 shape를 복원한다. [현재 MNIST Affine 구현](https://github.com/woonyong-kr/lrn-mnist/blob/61b7000fc084fc5f8de52cc665eca69c31b23eb8/src/layers.py)

작은 Affine 연산에 값을 대입하면 다음과 같이 계산할 수 있다.

```text
X = [ [1,2] ], W = [[0.3,0.5,0.1],[0.2,0.4,0.6]], b = [0.1,0,-0.1]
Y = [ [0.8,1.3,1.2] ]
G = [ [1,1,1] ]  (Y의 모든 성분을 더한 scalar loss)
dW = [[1,1,1],[2,2,2]], db = [1,1,1], dX = [ [0.9,1.2] ]
```

스칼라 loss에 대한 파라미터 gradient는 각 파라미터와 같은 shape다. W `(784,512)`이면 그 안의 401,408개 편미분이 같은 배열에 놓인다. `params['W1']`과 `grads['W1']`처럼 key도 대응해야 한다. 다만 shape·key가 맞는다는 사실만으로 미분값이 옳다고 판단할 수는 없다. 벡터 함수의 전체 미분을 구한다면 출력 차원을 포함한 Jacobian을 다룬다.

### ReLU 마스크와 결합 loss의 계약

현재 ReLU는 forward에서 입력이 0 이하인 위치를 기록하고, backward에서 복사한 상류 gradient의 해당 위치를 0으로 만든다. 학습할 W·b는 없다. 입력 `[0.8,-0.5,1.2]`, 상류 `[0.3,0.7,0.1]`이면 `[0.3,0,0.1]`을 돌려준다. 이 값은 위 Affine의 Y에 바로 ReLU를 적용한 결과와 별개의 입력 예시다. [현재 ReLU의 복사와 마스크](https://github.com/woonyong-kr/lrn-mnist/blob/61b7000fc084fc5f8de52cc665eca69c31b23eb8/src/activations.py)

ReLU의 0에서는 고전적인 미분이 존재하지 않는다. 이 구현은 0의 gradient를 0으로 선택한다. 수치 미분으로 확인할 때 작은 perturbation이 0의 양쪽을 가로지르면 불일치가 생길 수 있다.

`(p-one_hot)/N`은 class weight가 없는 표준 Softmax와 샘플 평균 Cross Entropy를 결합한 **logits의 gradient**다. 정수 class 라벨이면 확률 배열을 복사하고 정답 위치에서 1을 뺀 뒤 N으로 나눠 계산한다. 확률 p 자체의 gradient나 모든 Softmax backward에 그대로 쓸 공식은 아니다. 현재 MNIST는 이 결합 gradient를 먼저 만들기 때문에 `Softmax.backward`가 받은 값을 그대로 통과시킨다. loss 값의 확률 clip과 결합 gradient 사이의 차이는 뒤의 수치 미분 절에서 구분한다. [결합 gradient](https://github.com/woonyong-kr/lrn-mnist/blob/61b7000fc084fc5f8de52cc665eca69c31b23eb8/src/losses.py)

## 여러 층을 거치면 gradient의 방향과 크기가 함께 바뀐다

출력에 가까운 층의 gradient가 충분히 커도 입력에 가까운 층에서는 거의 보이지 않을 수 있다. 반대로 앞쪽으로 전달하면서 지나치게 커져 update가 불안정해질 수도 있다. 전자를 기울기 소실, 후자를 기울기 폭발이라고 한다. 특정 층 수에서 반드시 시작하는 현상은 아니며 초기화·활성화·가중치·입력과 loss의 영향을 함께 받는다.

층의 입력을 a_(l-1), 출력을 a_l이라 두고, 이번에는 각 벡터를 열벡터로 표기한다. 국소 Jacobian `J_l=∂a_l/∂a_(l-1)`은 입력의 작은 변화가 출력에 어떻게 전달되는지 나타내는 행렬이다. 상류 gradient g_l은 `g_(l-1)=J_lᵀ g_l`로 전달된다. 단순 연쇄 구조에서는 이 행렬들이 차례로 곱해지고, 분기·공유 경로가 있으면 각 경로의 기여를 더한다.

`a_l=f(W_l a_(l-1)+b_l)`이면 `J_l=diag(f'(z_l)) W_l`이다. 활성화 미분만 보거나 W만 보는 대신 두 항을 함께 본다. 파라미터의 gradient에는 해당 층의 입력도 곱해지므로 전달된 g 하나와 dW를 동일하게 취급하지 않는다. [Jacobian 곱으로 분석한 소실과 폭발](https://proceedings.mlr.press/v28/pascanu13.pdf)

### 작은 국소 미분과 영벡터인 경로

Sigmoid의 최대 미분 0.25를 열 번 곱하면 `0.25^10≈9.536743×10^-7`이다. 이는 활성화 미분 인수만의 계산이며 가중치 행렬을 포함한 실제 gradient의 상한이 아니다. ReLU는 양수 구간의 미분이 1이라 그 위치에서 활성화 자체가 값을 줄이지 않지만, 음수 위치에서는 해당 gradient를 0으로 만든다. 0의 미분은 수학적으로 정의되지 않으며 현재 MNIST 구현은 0을 선택한다.

현재 ReLU의 mask는 **이번 forward에서 입력이 0 이하였던 위치**다. 그 위치를 영구히 죽은 뉴런으로 판정한 기록이 아니다. 다른 입력·앞 층의 변화·optimizer 상태에 따라 다시 양수로 바뀔 수 있다. 임의로 뽑은 열 개 입력의 ReLU 미분을 곱해 0 또는 1을 얻는 모형도 한 경로의 예시이며, 가중치와 여러 경로를 합치는 실제 신경망 전체의 결과는 아니다. [MNIST ReLU의 forward·backward](https://github.com/woonyong-kr/lrn-mnist/blob/61b7000fc084fc5f8de52cc665eca69c31b23eb8/src/activations.py)

### 최대 확대율이 커도 모든 gradient가 커지지는 않는다

벡터의 유클리드 길이를 `||g||₂`로 쓰면 `||g_(l-1)||₂≤||J_l||₂ ||g_l||₂`다. 행렬의 `||J_l||₂`는 최대 특이값으로, 한 층에서 가능한 가장 큰 확대율이다. 각 층의 확대율을 곱하면 gradient norm이 증폭되는 비율의 **상한**을 얻는다. 입력 쪽 gradient norm의 상한은 여기에 출력 gradient norm을 곱한 값으로, `||g_0||₂≤(∏_l ||J_l||₂)||g_L||₂`다. 확대율의 곱이 1보다 크다는 사실만으로 실제 벡터가 확대된다고 결론 내릴 수 없다. 벡터가 어떤 방향을 향하는지와 다음 층이 어느 방향을 확대하는지도 중요하다.

다음 독립 선형 모형은 두 좌표에 각각 1.5·0.5를 곱하는 층과, 반대로 0.5·1.5를 곱하는 층을 비교한다. 두 층 모두 최대 특이값은 1.5다. 출력 gradient를 `[1,0]`으로 고정해 같은 층 열 개를 지나는 경우와 두 종류를 번갈아 지나는 경우를 계산한다.

```run-python
from math import hypot, isclose

def backward(diagonals, output_gradient):
    gradient = list(output_gradient)
    for diagonal in reversed(diagonals):
        gradient = [d*g for d,g in zip(diagonal,gradient)]
    return gradient

a, b = (1.5,0.5), (0.5,1.5)
output_gradient = [1.0,0.0]
for name, layers in [('aligned',[a]*10), ('alternating',[a,b]*5)]:
    result = backward(layers,output_gradient)
    bound = 1.0
    for diagonal in layers:
        bound *= max(abs(d) for d in diagonal)
    print(name, 'gradient', [round(v,9) for v in result],
          f'norm={hypot(*result):.9f}', f'norm_bound={bound:.9f}')
    assert hypot(*result) <= bound+1e-12

assert isclose(backward([a]*10,output_gradient)[0],1.5**10)
assert isclose(backward([a,b]*5,output_gradient)[0],0.75**5)
```

Python 3.9.6에서 확인한 출력이다.

```text
aligned gradient [57.665039062, 0.0] norm=57.665039062 norm_bound=57.665039062
alternating gradient [0.237304688, 0.0] norm=0.237304688 norm_bound=57.665039062
```

같은 방향을 확대하면 약 57.7배가 되지만, 두 종류를 번갈아 통과하면 두 층마다 0.75배가 되어 최종 norm이 약 0.2373으로 줄었다. 층별 최대 특이값의 곱은 두 경우 모두 같아도 실제 전달 결과는 다르다.

### 원인에 맞춰 조절할 항을 고른다

초기화는 학습 시작의 신호 크기를 조절한다. ReLU를 위한 He의 `Var(W)=2/fan_in`은 대칭 분포와 독립성 등 가정 아래 두 번째 모멘트의 흐름을 맞추는 조건이다. ReLU 뒤 평균이 양수이므로 두 번째 모멘트와 분산은 같지 않다. gain=1인 기본 Xavier의 분산은 `2/(fan_in+fan_out)`이고, fan_in=fan_out일 때만 `1/fan_in`으로 줄어든다. 구체적인 수치와 현재 MNIST의 적용 범위는 [신경망](/wiki/ai-machine-learning-topic-de3a4dbc880f/)의 초기화 절과 함께 확인한다.

BatchNorm·LayerNorm은 선택한 축의 통계를 사용해 값을 정규화한다. 입력·설정·학습 상태에 따라 효과가 달라지므로 norm 층을 넣었다는 사실만으로 gradient 안정성을 보장할 수 없다. 초기화·정규화·[활성화 함수](/wiki/ai-machine-learning-topic-ff856a774938/)는 서로 다른 연산에 작용한다.

같은 차원의 잔차 연결 `y=x+F(x)`에서는 `J=I+J_F`로 identity 경로가 더해진다. 직접 경로가 있다는 사실은 gradient가 항상 1 이상으로 남는다는 보장은 아니다. 예를 들어 `F(x)=-x`이면 두 경로가 상쇄된다. projection shortcut이나 덧셈 뒤의 활성화가 있으면 그 미분도 포함해야 한다. [Residual 블록의 identity·projection 경로](https://arxiv.org/html/1512.03385v1)

폭발한 gradient의 norm을 제한하려면 유한한 norm r이 임계값 c보다 클 때 `g←(c/r)g`로 줄이는 norm clipping을 사용할 수 있다. 원소별 값을 각각 자르는 clipping과는 다르다. `clip_grad_norm_`은 파라미터 gradient들을 하나로 본 전체 norm을 기준으로 기존 gradient를 바꾼다. backward 뒤 optimizer update 전에 적용하되, 소실된 정보를 복원하거나 이미 생긴 NaN·inf를 자동 복구하는 방법으로 쓰지 않는다. [Norm clipping의 제안](https://proceedings.mlr.press/v28/pascanu13.pdf), [PyTorch의 전체 norm 계약](https://docs.pytorch.org/docs/2.9/generated/torch.nn.utils.clip_grad_norm_.html)

실제 학습을 진단할 때는 같은 배치에서 층별 activation과 gradient의 norm·유한값 여부를 먼저 비교한다. gradient가 계산됐는지와 optimizer가 파라미터를 갱신했는지도 나누어 본다. RNN에서는 깊이 대신 시간 단계가 늘며 유사한 곱이 누적되고, LSTM·GRU의 상태·gate 경로도 그 관점에서 분석한다. 위 계산은 고정된 국소 연산의 예제이며 실제 MNIST 학습 실패나 특정 개선의 성능을 측정한 결과가 아니다.

## 작은 네트워크의 값을 따라간다

이 예제에서는 앞의 Affine 절처럼 행벡터 표기를 사용한다. 고정 입력 x=`[1,0.5,-0.3]`, 정답 class 1을 두고 다음 행렬을 사용한다.

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

### 수동 계층의 backward가 소유하는 값

MNIST의 `Affine.forward`는 X와 원래 shape를 저장하고, `backward`는 `dW, db`와 원래 shape의 입력 gradient를 만든다. ReLU·Dropout은 forward 마스크, BatchNorm은 평균 중심화 값·표준편차·정규화 결과를 사용한다. 이 중간값은 해당 forward에 대응해야 한다. 다른 입력을 forward한 뒤 오래된 loss의 backward를 호출하면 저장값이 덮일 수 있다.

`NeuralNetwork.gradient(x,y)`는 확률과 loss를 계산하고 결합 gradient를 만든 뒤 층을 역순으로 호출한다. gradient 배열을 반환하는 함수로 오해하지 않도록 주의한다. 현재 메서드는 loss를 반환하고 `self.grads`를 채운다. 은닉층 하나에 BatchNorm·Dropout을 모두 쓰면 역순은 `Softmax 통과 → Affine2 → Dropout → ReLU → BatchNorm → Affine1`이다. 두 옵션을 끄면 해당 층도 빠진다. [현재 네트워크의 층 구성과 gradient 수집](https://github.com/woonyong-kr/lrn-mnist/blob/61b7000fc084fc5f8de52cc665eca69c31b23eb8/src/network.py)

Affine의 W·b뿐 아니라 활성화된 BatchNorm의 gamma·beta gradient도 수집한다. 이후 `optimizer.update(params,grads)`가 파라미터를 바꾼다. SGD는 `p-=lr*g`로 갱신하지만 Adam은 m·v와 편향 보정을 사용한다. 이 상태는 한 forward의 임시값과 달리 update 사이에 이어진다. [현재 SGD·Adam 구현](https://github.com/woonyong-kr/lrn-mnist/blob/61b7000fc084fc5f8de52cc665eca69c31b23eb8/src/optimizers.py)

층마다 `forward`와 `backward`가 있어도 새 층을 무조건 끼울 수 있는 것은 아니다. 입력·출력 shape와 학습/추론 계약을 맞춰야 하며, 학습 파라미터가 추가되면 현재의 층 종류별 params·grads 수집에도 등록해야 한다. 이런 연결과 미분을 층마다 작성하는 NumPy 구현에 비해, 자동 미분은 지원하는 기본 연산의 미분 규칙을 재사용한다.

### 자동 미분은 필요한 방향의 미분을 전달한다

자동 미분(AD)은 실행할 계산을 기본 연산으로 나누고 그 국소 미분을 연쇄법칙으로 연결한다. 수치 미분·기호 미분과 같은 미분을 목표로 하되 계산 방법이 다르다. 함수값의 작은 차이나 전체 미분식 전개를 직접 구성하지 않는다. 반올림 오차나 미분 불가능한 지점의 처리까지 사라지는 것은 아니다.

`f: Rⁿ→Rᵐ`의 Jacobian J를 `(m,n)`으로 놓고 열벡터로 표기하면 다음 두 방향을 구분할 수 있다.

| 방식 | 입력하는 방향 | 계산하는 값 |
|---|---|---|
| forward-mode | 입력 방향 v `(n,)` | `Jv` `(m,)`: JVP |
| reverse-mode | 출력 쪽 seed u `(m,)` | `Jᵀu` `(n,)`: VJP를 열벡터로 표기한 값 |

전체 Jacobian을 기저 방향 하나씩 구하면 forward-mode는 n방향, reverse-mode는 m방향이 필요하다. 입력 파라미터가 많고 출력이 loss 하나인 경우 reverse-mode는 seed 1로 전체 gradient를 구할 수 있다. **한 방향의 JVP**만 필요한 경우에는 forward-mode도 한 번의 전파로 계산한다. 방향 수가 곧 실제 속도 배수는 아니며 벡터화·연산 비용·중간값 메모리도 영향을 준다. AD는 실행 중 기록 방식 외에 코드 변환·컴파일 방식으로도 구현할 수 있다. [Baydin 등의 AD survey, §2·3·5](https://www.jmlr.org/papers/volume18/17-468/17-468.pdf)

### PyTorch가 기록하는 그래프와 `.grad`를 구분한다

PyTorch eager autograd는 grad mode에서 미분 추적이 필요한 입력을 사용하는 연산을 기록하고, backward에 필요한 중간값을 보관한다. 실행 때 선택된 분기·반복의 경로를 미분하며 Python의 이산적인 분기 선택 자체를 미분하는 것은 아니다. NumPy 계층의 수동 reverse 순회와 목표는 같아도 그래프 관리 방식은 다르다. [PyTorch 2.9의 autograd 동작](https://docs.pytorch.org/docs/2.9/notes/autograd.html)

`loss.backward()`는 기본적으로 그래프에 연결된 `requires_grad=True`인 **leaf 텐서**의 `.grad`에 기여를 누적한다. 중간 non-leaf의 gradient를 보려면 `retain_grad()` 등이 필요하다. 미분 경로가 없으면 `.grad`가 `None`일 수 있다. 위 Affine 예시에서 X에 추적을 켜지 않아도 수학적인 dX는 정의되지만 X의 `.grad`가 자동으로 저장되지는 않는다. `torch.autograd.grad`는 요청한 입력의 gradient를 반환하며 그 입력의 `.grad`에 누적하는 호출과 구분한다. [Leaf의 gradient 저장](https://docs.pytorch.org/docs/2.9/notes/autograd.html#setting-requires-grad), [autograd.grad의 반환 계약](https://docs.pytorch.org/docs/2.9/generated/torch.autograd.grad.html)

현재 GPT 실행 경로는 `src/runnable.py`의 `TrainingRun.step`이다. `model.train()` 뒤 배치를 만들고 `zero_grad(set_to_none=True) → forward와 scalar loss → backward → gradient norm clipping → AdamW.step()`을 수행한다. `GPTModel.forward`는 targets가 있으면 logits·정답 토큰을 펼쳐 Cross Entropy를 계산하고 `(loss, logits)`를 돌려준다. targets가 없으면 logits만 반환한다. [현재 학습 루프](https://github.com/woonyong-kr/lrn-gpt/blob/027830d7f49904f656c2d3003d4f6a818ef50269/src/runnable.py), [현재 logits·loss 계산](https://github.com/woonyong-kr/lrn-gpt/blob/027830d7f49904f656c2d3003d4f6a818ef50269/src/model.py)

독립된 update마다 이전 gradient를 지우는 것이 이 실행 경로의 계약이다. microbatch 여러 개의 gradient를 의도적으로 누적할 때는 매번 지우지 않을 수 있으며, loss의 평균·합과 각 배치의 가중치도 원하는 목적함수에 맞춰야 한다. `.grad` 계산과 optimizer 갱신은 별개이므로 backward가 끝났다는 사실만으로 파라미터가 바뀌었다고 판단하지 않는다.

### 평가 모드와 추적 중단은 별개의 선택이다

`model.eval()`은 Dropout·BatchNorm 같은 모듈의 동작 모드를 바꾸며 자동 미분을 끄지 않는다. `torch.no_grad()`는 그 안의 일반 연산을 reverse-mode 그래프에 기록하지 않도록 한다. `requires_grad`를 받는 텐서 생성 함수에는 예외가 있고, forward-mode AD를 끄는 문맥도 아니다. 문맥에 들어가기 전에 만든 그래프까지 지우는 것은 아니다. [평가 모드의 독립성](https://docs.pytorch.org/docs/2.9/notes/autograd.html#evaluation-mode-nn-module-eval), [no_grad의 범위와 예외](https://docs.pytorch.org/docs/2.9/generated/torch.no_grad.html)

현재 GPT 검증은 `eval()`과 `no_grad()`를 함께 쓰고 이전 학습 모드를 복원한다. 주 생성 경로 `src/generation.py`는 `inference_mode()`를 사용한다. `src/model.py`의 작은 `generate_text_simple` helper는 `eval()`과 `no_grad()`를 사용하는 별도 경로다. 이 구분은 저장소 코드를 확인한 결과다. [현재 생성 코드](https://github.com/woonyong-kr/lrn-gpt/blob/027830d7f49904f656c2d3003d4f6a818ef50269/src/generation.py)

“PyTorch는 동적, TensorFlow는 정적”이라는 구분은 TensorFlow 1의 Session 중심 설명을 현재 전체에 적용할 수 없다. TensorFlow 2는 eager가 기본이며 `tf.function`으로 그래프를 만들 수도 있다. 실행·컴파일 방식과 forward/reverse-mode라는 미분 방향을 별개의 축으로 구분한다. [TensorFlow 2의 eager와 tf.function](https://www.tensorflow.org/guide/function)

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
