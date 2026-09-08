---
layout: default
title: 신경망
nav_order: 2
permalink: /wiki/ai-machine-learning-topic-de3a4dbc880f/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-topic-de3a4dbc880f
projection_sha256: 7d15f68e7188c64702018ff1d4fe3278d09c385ecd4fc792d9149320f8514c11
parent: 딥러닝
content_status: ready
public_parent_id: Wiki/ai-machine-learning/deep-learning
grand_parent: AI
---

# 신경망
{: .no_toc }

## 가중합의 경계를 여러 층으로 연결한다

신경망은 입력에 가중치와 편향을 적용하고 비선형 함수를 거쳐 표현을 바꾸는 계산을 연결한다. 단순한 퍼셉트론은 `z=w1*x1+w2*x2+b`, `y=1 if z>0 else 0`으로 정의할 수 있다. w는 경계의 방향, b는 위치에 관여한다. 여기서 사람이 정한 가중치로 게이트를 구성하는 일과 데이터로 가중치를 학습하는 일은 구분한다. 계단 함수에 일반적인 gradient 학습을 그대로 적용할 수는 없으며, 고전 퍼셉트론 학습 규칙과 미분 가능한 신경망의 역전파는 다른 절차다.

| 게이트 | w1, w2, b | (0,0) | (0,1) | (1,0) | (1,1) |
|---|---|---:|---:|---:|---:|
| AND | 0.5, 0.5, -0.7 | 0 | 0 | 0 | 1 |
| OR | 0.5, 0.5, -0.2 | 0 | 1 | 1 | 1 |
| NAND | -0.5, -0.5, 0.7 | 1 | 1 | 1 | 0 |
| XOR | NAND와 OR의 출력을 AND로 연결 | 0 | 1 | 1 | 0 |

AND·OR·NAND는 평면의 직선 하나로 출력 두 종류를 분리한다. XOR은 대각선 쌍이 같은 레이블이므로 선형 분리가 되지 않는다. 첫 층에서 `s1=NAND(x1,x2)`, `s2=OR(x1,x2)`를 만들고 두 번째 층에서 `AND(s1,s2)`를 계산하면 표현할 수 있다. 입력 (1,0)은 첫 층의 z가 각각 0.2·0.3으로 양수여서 (s1,s2)=(1,1)이 되고, 마지막 AND의 z=0.3이므로 1을 출력한다. 비선형성을 없애고 Affine만 여러 번 합성하면 다시 하나의 Affine이 된다.

## MLP의 순전파를 행렬 shape로 읽는다

다층 퍼셉트론은 `Z_l=A_(l-1)W_l+b_l`, `A_l=f(Z_l)`을 반복한다. X가 `(N,I)`이고 W가 `(I,O)`이면 Z는 `(N,O)`다. 편향 `(O,)`는 N개 샘플에서 공유한다. 이 연산을 행렬곱으로 묶으면 최적화된 수치 라이브러리를 활용할 수 있지만 속도 차이는 행렬 크기·하드웨어·메모리 배치에 달려 있다.

2→3→2→2 구조는 W1 `(2,3)`, W2 `(3,2)`, W3 `(2,2)`를 갖고 배치 축 N을 유지한다. 아래 독립 계산 모형은 고정 가중치의 sigmoid 은닉층 두 개와 softmax 출력층을 계산한다. 학습된 분류기의 성능 예제가 아니다.

```run-python
from math import exp

def affine(x, w, b):
    return [sum(x[i]*w[i][j] for i in range(len(x))) + b[j]
            for j in range(len(b))]

def sigmoid(x):
    return [1/(1+exp(-v)) for v in x]

x = [1.0, 0.5]
z1 = affine(x, [[0.1,0.3,0.5],[0.2,0.4,0.6]], [0.1,0.2,0.3])
a1 = sigmoid(z1)
z2 = affine(a1, [[0.1,0.4],[0.2,0.5],[0.3,0.6]], [0.1,0.2])
a2 = sigmoid(z2)
z3 = affine(a2, [[0.1,0.3],[0.2,0.4]], [0.1,0.2])
e = [exp(v-max(z3)) for v in z3]
p = [v/sum(e) for v in e]
for name, values in [('z1',z1),('a1',a1),('z2',z2),('a2',a2),('z3',z3),('p',p)]:
    print(name, [round(v,6) for v in values])
```

Python 3.9.6에서 확인한 출력이다.

```text
z1 [0.3, 0.7, 1.1]
a1 [0.574443, 0.668188, 0.75026]
z2 [0.51616, 1.214027]
a2 [0.626249, 0.771011]
z3 [0.316827, 0.696279]
p [0.406259, 0.593741]
```

출력층이 softmax인지 항등 함수인지에 따라 z3와 최종 출력은 다르다. 위 입력에서는 z1=[0.3,0.7,1.1]이고 최종 p는 약 [0.406259,0.593741]이다. 중간 z2는 [0.516160,1.214027], a2는 [0.626249,0.771011], z3는 [0.316827,0.696279]이다. `[0.31682708,0.68317292]`를 이 가중치의 softmax 결과로 계산하면 오류다. z3의 두 성분에 지수 함수를 적용한 뒤 그 합으로 나눠 p를 구해야 한다.

NumPy에서는 각 층을 직접 호출하거나 OrderedDict의 등록 순서대로 forward한다. PyTorch의 `nn.Module`은 파라미터와 하위 모듈을 등록하고 `nn.Sequential`은 단순 직렬 실행을 표현한다. PyTorch Linear의 가중치 shape는 `(out_features,in_features)`이므로 위 행벡터 수식의 W를 이식할 때 전치가 필요하다. logits를 [CrossEntropyLoss](/wiki/ai-machine-learning-topic-7c39d8d61e07/)에 넣는 경로에는 별도 softmax를 중복 적용하지 않는다.

## 같은 shape를 유지해도 층의 책임은 다르다

MNIST의 `(128,784)` 입력에 `(784,512)` W를 곱하면 `(128,512)`가 된다. 뒤의 BatchNorm·ReLU·Dropout은 shape를 유지하지만 Affine은 W·b, BatchNorm은 gamma·beta를 학습하고 ReLU·Dropout은 backward에 필요한 마스크를 저장한다. 모든 층을 통과한 고정 가중치의 추론과, loss에서 gradient를 계산해 갱신하는 학습은 별개다.

현재 `lrn-mnist`의 은닉층 순서는 `Affine → BatchNorm(선택) → ReLU → Dropout(선택)`이며 마지막 Affine 뒤 softmax가 클래스 점수를 확률로 바꾼다. BatchNorm과 Dropout은 train/inference 분기가 필요하다. [현재 network 구현](https://github.com/woonyong-kr/lrn-mnist/blob/61b7000fc084fc5f8de52cc665eca69c31b23eb8/src/network.py)

HyeYeon의 한 층 흐름 노트는 작은 `(2, 3) → (2, 2)` 배열에서 Affine → BatchNorm → ReLU → Dropout의 계산을 추적한다. 고정 가중치로 출력을 계산하는 과정과 gradient로 가중치를 갱신하는 과정을 구분해 읽을 수 있다. 그 노트의 숫자는 당시 설명용 예시이며, 위 독립 순전파 모형의 실행 결과와는 별개다. [03. 신경망 순전파 · 1c28de6](https://github.com/woonyong-kr/lrn-mnist/blob/1c28de6983671e891faac453e392f68b354bdb53/docs/woonyong/deep-learning-from-scratch/03-neural-network-forward.md) [Affine -> BatchNorm -> ReLU -> Dropout 한 층 흐름 이해 · 1c28de6](https://github.com/woonyong-kr/lrn-mnist/blob/1c28de6983671e891faac453e392f68b354bdb53/src/study/HyeYeon/md/%EC%9D%80%EB%8B%89%EC%B8%B5_%EB%B8%94%EB%A1%9D_Affine_BatchNorm_ReLU_Dropout_%ED%9D%90%EB%A6%84_%EC%9D%B4%ED%95%B4.md)

## BatchNorm은 배치 통계와 학습 파라미터를 함께 사용한다

MLP의 X가 `(N,D)`일 때 feature별로 배치 평균 μ와 분산 v를 계산한다.

```text
μ = mean(X, axis=0)
v = mean((X-μ)², axis=0)
σ = sqrt(v+eps)
X_hat = (X-μ)/σ
Y = gamma*X_hat + beta
```

μ·v는 현재 입력의 통계, gamma·beta는 optimizer가 학습하는 파라미터다. X_hat의 feature별 평균은 반올림 오차 범위에서 0이고 분산은 `v/(v+eps)`다. eps가 있으므로 정확히 1이 아니며, v=0인 feature는 X_hat=0이다. gamma·beta를 적용한 Y가 평균 0·분산 1이라는 보장도 없다. 특정 배치에서 gamma=`sqrt(v+eps)`, beta=μ로 두면 입력을 복원할 수 있지만 고정 gamma·beta가 모든 배치의 통계를 동시에 되돌리는 것은 아니다.

BatchNorm은 입력 분포 변화에 대한 문제의식에서 제안되었다. 다만 내부 공변량 이동 감소만이 성능 개선의 확정된 원인이라고 단정하지 않는다. 후속 연구는 최적화 지형의 매끄러움 등 다른 설명을 제시한다. 모델·배치·배치 통계의 대표성에 따라 효과가 달라지고 빠른 수렴이나 높은 학습률 사용은 보장되지 않는다. [BatchNorm 원 논문](https://arxiv.org/abs/1502.03167), [최적화 효과에 관한 후속 연구](https://arxiv.org/abs/1805.11604)

### 학습과 추론의 통계

현재 NumPy 구현은 학습에서 현재 배치 통계를 쓰면서 `running = 0.9*running + 0.1*batch_stat`로 평균과 분산을 누적한다. 추론에서는 누적 통계로 계산하므로 모델을 저장할 때 W·b·gamma·beta뿐 아니라 running_mean·running_var도 포함한다. NumPy 구현의 momentum 0.9는 과거 통계의 계수다. PyTorch BatchNorm의 momentum은 새 통계의 계수이며, forward와 running variance에서 사용하는 분산 추정량도 구분하므로 숫자를 그대로 옮기지 않는다. [PyTorch BatchNorm1d](https://docs.pytorch.org/docs/stable/generated/torch.nn.modules.batchnorm.BatchNorm1d.html)

NumPy 층은 `(N,...)`의 나머지 축을 평탄화해 feature별 통계를 구한다. CNN에서 공간 위치까지 묶어 채널별로 통계를 구하는 BatchNorm2d와 동일한 계약은 아니다. 학습 배치가 한 개면 feature 분산이 0이 되고 신호가 크게 제한된다. 학습 직후의 추론에는 누적 통계가 얼마나 대표성을 갖는지도 영향을 준다.

### gamma·beta와 입력으로 돌아가는 gradient

상류 gradient G와 학습에서 저장한 X_hat·σ를 사용하면 다음과 같이 계산한다. 합은 배치 축으로 구한다.

```text
dbeta = Σ G
dgamma = Σ (G*X_hat)
U = G*gamma
dX = (N*U - ΣU - X_hat*Σ(U*X_hat)) / (N*σ)
```

이 식은 학습 배치 통계를 X에서 계산한 경우의 미분이다. 추론에서 고정된 running 통계를 사용하는 경우에는 `dX=G*gamma/sqrt(running_var+eps)`로 경로가 다르다. 실제 학습 코드의 backward는 직전 학습 forward의 저장값과 짝을 이뤄야 한다.

## CNN은 공간적 이웃과 가중치 공유를 연산에 넣는다

이미지를 `(N,784)`로 펼쳐도 픽셀 값과 순서는 복원할 수 있으므로 공간 정보 자체가 삭제되는 것은 아니다. 다만 완전연결층은 이웃 픽셀의 관계나 위치 간 같은 필터의 재사용을 구조적으로 강제하지 않는다. CNN은 작은 영역에 같은 필터를 적용해 지역 연결과 가중치 공유라는 가정을 넣는다.

기본적인 groups=1 합성곱에서 입력은 `(N,C_in,H,W)`, 필터는 `(C_out,C_in,FH,FW)`다. 각 필터는 입력 채널들의 지역 곱을 합해 출력 채널 하나를 만든다. 딥러닝 라이브러리에서 흔히 convolution이라고 부르는 연산은 필터를 뒤집지 않는 cross-correlation이다. 2×2 패치 `[[1,2],[3,4]]`와 필터 `[[0.1,0.2],[0.3,0.4]]`의 곱합은 3.0이다.

대칭 padding P·stride S·dilation d를 쓰면 높이는 `floor((H+2P-d*(FH-1)-1)/S)+1`이다. d=1이면 `floor((H+2P-FH)/S)+1`로 줄어든다. 너비도 같은 방식으로 계산한다. H=28, FH=3, S=1에서는 P=0이면 26, P=1이면 28이다. padding·stride·경계에서는 이동에 대한 등변성이 깨질 수 있고, CNN이 모든 위치 이동에 불변인 것은 아니다.

### im2col과 pooling

im2col은 필터가 닿는 각 패치를 행으로 펼친다. `(1,1,4,4)` 입력에 3×3 필터·stride 1·padding 0이면 패치 4개를 `(4,9)`로 만들고, 필터를 `(9,1)`로 펼쳐 `(4,1)` 결과를 구한 뒤 `(1,1,2,2)`로 돌린다. 최적화된 행렬곱을 이용할 수 있지만 겹치는 입력을 복제하므로 메모리가 늘 수 있다. backward의 col2im은 겹친 위치의 기여를 더해야 하며 단순한 reshape 역변환이 아니다.

Max pooling은 영역의 최댓값을 남기며 학습 파라미터가 없다. `[[1,3],[2,4]]`의 결과는 4다. backward에서는 선택된 최댓값 위치로 gradient를 전달하고 겹치는 창의 기여는 합산한다. 동률일 때 어느 위치를 선택하는지는 구현 계약이다. 제한된 작은 이동에 둔감해질 수 있지만 일반적인 이동 불변성을 보장하지 않는다.

아래 독립 모형은 고정한 3×3 필터의 cross-correlation과 2×2 max pooling을 계산한다. 필터 학습은 포함하지 않는다.

```run-python
x = [[1,2,3,0],[0,1,2,3],[3,0,1,2],[2,3,0,1]]
w = [[1,0,-1],[1,0,-1],[1,0,-1]]
conv = [[sum(x[i+u][j+v]*w[u][v] for u in range(3) for v in range(3))
         for j in range(2)] for i in range(2)]
feature = [[1,3,2,4],[5,6,7,8],[3,2,1,0],[1,2,3,4]]
pool = [[max(feature[2*i+u][2*j+v] for u in range(2) for v in range(2))
         for j in range(2)] for i in range(2)]
print('cross_correlation', conv)
print('max_pool', pool)
```

Python 3.9.6에서 확인한 출력이다.

```text
cross_correlation [[-2, -2], [2, -2]]
max_pool [[6, 8], [3, 4]]
```

왼쪽 열 +1·오른쪽 열 -1 필터는 좌우 방향의 밝기 차이에 반응해 세로 경계를 검출하는 예다. ‘세로 방향으로 값이 변할 때 반응한다’와 구분한다.

### MNIST 크기로 연결한 설계 예

`(N,1,28,28) → Conv 32개(3×3,pad=1) → ReLU → MaxPool 2×2 → (N,32,14,14) → Conv 64개 → ReLU → MaxPool → (N,64,7,7) → Flatten(N,3136) → Affine(N,10)`으로 구성할 수 있다. 필터의 역할은 학습 결과로 생기며 사람이 모든 층에 눈·코 같은 의미를 미리 지정하지 않는다. 이 CNN은 구조 설명용이고, 현재 `lrn-mnist`가 실행하는 모델은 NumPy MLP다.
