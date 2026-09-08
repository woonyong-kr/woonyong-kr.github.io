---
layout: default
title: Attention
nav_order: 4
permalink: /wiki/ai-machine-learning-attention-820ced4d5b89/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-attention-820ced4d5b89
projection_sha256: 55c80a3ef5b3c683bbaac71335ef82be009807121e4ee4776d89dbd0b40f8c1a
parent: LLM
content_status: ready
public_parent_id: Wiki/ai-machine-learning/llm
grand_parent: AI
---

# Attention
{: .no_toc }

## 각 query가 참조할 정보를 가중합한다

Attention은 query와 각 key의 점수로 가중치를 만들고 그 가중치로 value를 합치는 연산이다. Self-attention은 Q·K·V가 같은 입력 시퀀스에서 나온다. causal 여부와 head 수는 이와 별개의 축이다. 따라서 학습 가능한 QKV·multi-head·causal mask를 동시에 사용할 수 있다.

RNN은 이전 hidden state를 기다리는 순차 경로가 있는 반면, self-attention은 주어진 시퀀스의 토큰 쌍을 한 번에 계산할 수 있다. 이 병렬성은 teacher forcing 학습과 이미 주어진 문맥의 계산에 해당한다. autoregressive 생성에서는 아직 없는 다음 토큰을 기다려야 하므로 모든 미래 출력을 한 번에 생성한다는 뜻은 아니다.

## 점수·비율·문맥 벡터를 구분한다

먼저 Q·K·V 투영을 생략한 작은 모형을 보자. X의 각 행을 token 벡터로 놓고 `S=XXᵀ`, `A=softmax(S, axis=-1)`, `Z=AX`를 계산한다. S의 행 i는 현재 query, 열 j는 참조하는 key다. 각 A 행의 합은 1이고 `Z[i]=Σ_j A[i,j]X[j]`는 i 위치의 새 벡터다.

아래 독립 모형은 여섯 입력 벡터 중 두 번째를 `journey` 위치로 두고 계산한다. 손으로 정한 벡터의 점곱일 뿐 학습된 단어 의미나 실제 언어 모델의 attention을 측정하지 않는다.

```run-python
from math import exp

x = [[0.43,0.15,0.89],[0.55,0.87,0.66],[0.57,0.85,0.64],
     [0.22,0.58,0.33],[0.77,0.25,0.10],[0.05,0.80,0.55]]
query = x[1]
scores = [sum(a*b for a,b in zip(query,row)) for row in x]
e = [exp(s-max(scores)) for s in scores]
weights = [v/sum(e) for v in e]
context = [sum(w*row[j] for w,row in zip(weights,x)) for j in range(3)]
print('scores', [round(v,4) for v in scores])
print('weights', [round(v,4) for v in weights])
print('sum', round(sum(weights),6))
print('context', [round(v,4) for v in context])
```

Python 3.9.6에서 확인한 출력이다.

```text
scores [0.9544, 1.495, 1.4754, 0.8434, 0.707, 1.0865]
weights [0.1385, 0.2379, 0.2333, 0.124, 0.1082, 0.1581]
sum 1.0
context [0.4419, 0.6515, 0.5683]
```

`context += weight[i]*value[i]`는 value를 직접 바꾸는 것이 아니라 별도의 출력에 기여를 더한다. 여섯 벡터가 있으면 여섯 개를 고르는 결과가 아니라 해당 query 위치의 벡터 하나가 나온다. 모든 query에 반복하면 Z의 행들로 쌓인다. X `(6,3)`, A `(6,6)`, Z `(6,3)`의 shape가 이 관계를 보여 준다.

더 작은 X=`[[1,0],[0,1],[1,1]]`에서 한 행의 가중치를 `[0.2,0.5,0.3]`으로 정하면 결과는 `[0.5,0.8]`이다. 가중치 행렬을 `[[0.42,0.16,0.42],[0.16,0.42,0.42],[0.21,0.21,0.58]]`로 주면 세 행 결과는 `[[0.84,0.58],[0.58,0.84],[0.79,0.79]]`다. 이는 주어진 가중치의 가중합 계산이며 역전파 gradient가 아니다. gradient는 loss를 정한 뒤 `dL/dZ`로 계산한다.

## 학습 Q·K·V와 scaled dot-product

일반적인 한 head는 `Q=XW_Q`, `K=XW_K`, `V=XW_V`를 만든다. 점수 `S=QKᵀ/sqrt(d_k)`를 mask한 뒤 softmax를 적용하고 `Z=AV`를 계산한다. Q는 비교의 기준, K는 비교 대상, V는 가중합에 들어가는 정보다. 이 명칭은 역할을 설명하는 비유이며 각 차원의 의미가 사람이 지정한 정보로 고정되는 것은 아니다.

독립적이고 평균 0·분산 1인 Q와 K 성분을 가정하면 d_k항의 내적 분산이 d_k가 된다. sqrt(d_k)로 나누면 큰 차원에서 점수가 커져 softmax가 포화하는 경향을 줄일 수 있다. d_k=64에서 표준편차가 8이라는 계산이지 점수가 반드시 ±8 사이에 제한되는 것은 아니다. 학습된 벡터가 항상 이 분포 가정을 만족하는 것도 아니다. [Attention Is All You Need](https://arxiv.org/abs/1706.03762)

## 미래 위치를 가리는 mask

다음 토큰을 예측하는 query i는 위치 0부터 i까지 참조하고 j>i는 가린다. score 행렬의 대각선 위를 -inf로 바꾸고 softmax하면 가려진 위치의 가중치는 0이다. 유한한 큰 음수 -1e9는 dtype·점수 크기에 따라 근사이며, -inf와 모든 상황에서 같지 않다.

모든 key가 가려진 행은 일반 softmax에서 정의되지 않아 NaN이나 잘못된 균등 가중치를 만들 수 있다. padding과 causal mask를 함께 구성할 때 허용된 key가 남는지 검사하고 빈 행의 처리 계약을 정해야 한다. bool mask의 True가 허용인지 차단인지는 라이브러리 API마다 다를 수 있으므로 이름만 보고 넘기지 않는다. attention dropout 뒤의 가중치 합은 각 실행에서 1이 아닐 수도 있다.

## 행렬곱과 softmax의 역전파

상류 gradient G=`dL/dZ`일 때 저장한 A·V로 다음 계산을 한다. 이 식은 dropout을 생략하고 허용 위치가 하나 이상 있는 모형이다.

```text
Z = A V
dA = G Vᵀ
dV = Aᵀ G
dS = A * (dA - sum(A*dA, axis=-1, keepdims=True))
dS[차단 위치] = 0
dQ = dS K / sqrt(d_k)
dK = dSᵀ Q / sqrt(d_k)
dW_Q = Xᵀ dQ, dW_K = Xᵀ dK, dW_V = Xᵀ dV
dX = dQ W_Qᵀ + dK W_Kᵀ + dV W_Vᵀ
```

softmax의 Jacobian 원소는 `A_i(δ_ij-A_j)`이며 위 dS는 행별 Jacobian-vector product를 행렬 전체 생성 없이 구한 식이다. X가 Q·K·V 세 경로에서 쓰였으므로 dX도 세 경로의 합이다. mask를 상수로 교체했다면 해당 score의 미분도 차단해야 한다.

## 여러 head와 계산 비용

전체 폭 D를 H개 head로 나누면 head 폭은 D/H다. 통상적인 full MHA에서는 D가 H로 나누어떨어져야 하고, QKV `(B,T,D)`를 `(B,H,T,D/H)`로 reshape·transpose한다. score는 `(B,H,T,T)`, context는 `(B,H,T,D/H)`이며 head를 합쳐 `(B,T,D)`로 돌린 뒤 W_O를 적용한다.

폭 D를 고정하고 QKV·출력 투영을 모두 D×D로 유지하면 가중치 수 4D²는 H만 바꿔도 같다. bias 포함 여부는 별도다. head를 늘리면 head 폭이 줄고 score 저장량은 달라진다. 사람이 각 head에 문법·의미 역할을 지정하지 않으며 서로 다른 의미로 분화한다고 보장하지 않는다.

한 head의 토큰 쌍 계산은 대략 O(T²d_k), score 저장은 O(T²)다. [Transformer 전체](/wiki/ai-machine-learning-transformer-924ea08dd69a/)에는 projection·FFN 비용도 있어 언제나 attention 행렬곱만 지배하는 것은 아니다. 일반적인 모든 head의 score 저장은 O(BHT²)다. FlashAttention은 타일 계산과 메모리 접근을 조정해 전체 score 행렬을 큰 메모리에 저장하는 비용을 줄이는 exact attention 구현이며, 모든 토큰 쌍 연산을 없애거나 일반적인 계산량을 무조건 선형으로 바꾸는 방법은 아니다. [FlashAttention 논문](https://arxiv.org/abs/2205.14135)

간소화 attention에서 시작해 학습 QKV, causal mask, multi-head를 차례로 추가하면 투영·참조 범위·head 분리의 역할을 각각 확인할 수 있다. 이 요소들은 서로 배타적인 모델 분류가 아니며 하나의 attention 구현에 함께 사용할 수 있다. [어텐션 메커니즘 정리 · 7875b64](https://github.com/woonyong-kr/lrn-gpt/blob/7875b64f85f19959d66dcaf06c1dcbeb129d71eb/docs/woonyong/08-attention-mechanisms.md)

### Head를 나눈 뒤에는 같은 인덱스 순서로 합친다

D=768, H=12이면 head 폭은 64다. `(2,10,768)`을 `(2,10,12,64)`로 나눈 다음 토큰 축과 head 축을 바꾸면 `(2,12,10,64)`가 된다. 결과를 합칠 때는 이 순서를 반대로 따라간다. 단순히 원소 수가 맞는 shape로 바꾸는 것만으로 같은 토큰의 head들이 나란히 놓인다는 보장은 없다.

PyTorch의 `transpose`는 일반적으로 데이터를 옮기지 않고 stride와 shape를 바꾼 view를 만든다. 이어지는 `view`가 가능한지는 stride의 호환 조건에 달려 있다. 현재 `_merge_heads()`는 `transpose(1,2).contiguous().view(B,T,D)`를 사용해 마지막 두 축을 합칠 수 있는 배치를 준비한다. `view`가 언제나 완전한 contiguous 배열만 받는다는 설명은 지나치게 좁다. 이미 contiguous인 경우 `contiguous()`도 새 복사를 만들지 않는다. [PyTorch Tensor.view의 stride 조건](https://docs.pytorch.org/docs/2.14/generated/torch.Tensor.view.html)

[`lrn-gpt`의 Attention 구현](https://github.com/woonyong-kr/lrn-gpt/blob/027830d7f49904f656c2d3003d4f6a818ef50269/src/attention.py)은 score·mask·softmax·value 가중합을 각각 함수로 나누고, QKV를 투영한 뒤 head별로 계산한다. 순서대로 `attention_score_matrix()`, `apply_causal_score_mask()`, `normalize_attention_scores()`, `weighted_value_context()`가 그 연산을 맡는다. 현재 구현의 causal mask는 계산 Tensor와 같은 device에 생성된다. CPU에서 만든 mask를 GPU score에 그대로 섞으면 장치 불일치가 생길 수 있다.

`attention_impl='sdpa'`여도 가중치 행렬 반환을 요청하면 수동 계산 경로로 들어간다. SDPA 경로는 추론에서 `dropout_p=0.0`을 명시한다. 이 함수는 호출한 Module의 eval 상태를 스스로 읽어 Dropout을 끄지 않기 때문이다. 또한 SDPA의 Boolean mask는 True가 허용인 반면 `nn.MultiheadAttention`의 `key_padding_mask`는 True가 차단이다. [PyTorch SDPA의 Dropout·mask 규칙](https://docs.pytorch.org/docs/2.14/generated/torch.nn.functional.scaled_dot_product_attention.html)

### 출력 투영에서 QKV까지 gradient를 되돌린다

Head별 context를 합친 행렬을 C, 최종 출력 `Y=CW_O`에 들어온 gradient를 G라고 하자. 먼저 `dW_O=CᵀG`, `dC=GW_Oᵀ`를 구한다. dC를 순전파와 같은 head 순서로 나눈 뒤 각 head에서 `AV`, softmax, `QKᵀ/sqrt(d_k)`의 미분을 계산한다. 그 결과 dQ·dK·dV를 원래 폭으로 합쳐 `dW_Q=XᵀdQ` 등을 구하고, 입력에는 세 투영 경로의 기여를 합산한다.

수동 backward에는 X·Q·K·V·Attention 가중치·결합한 C가 필요하다. 유한한 값이나 -inf로 덮은 mask 위치는 상수이므로 해당 score로 gradient를 되돌리지 않는다. 아래는 배치와 bias·Dropout을 생략한 두 head 모형이다. 전체 순전파와 W_Q의 gradient를 계산하고 중앙 차분으로 대조한다.

```run-python
from math import exp, sqrt

x = [[1.0, 0.5, -0.5, 0.2], [0.1, 1.0, 0.3, -0.2],
     [-0.4, 0.2, 1.0, 0.7]]
heads, width = 2, 4
head_width = width // heads
assert heads > 0 and width % heads == 0

def transpose(a):
    return [list(row) for row in zip(*a)]

def matmul(a, b):
    assert len(a[0]) == len(b)
    return [[sum(u*v for u, v in zip(row, col))
             for col in transpose(b)] for row in a]

def diagonal(values):
    return [[value if i == j else 0.0 for j in range(width)]
            for i, value in enumerate(values)]

def split(a):
    return [[row[h*head_width:(h+1)*head_width] for row in a]
            for h in range(heads)]

def merge(parts):
    return [sum((part[i] for part in parts), []) for i in range(len(x))]

wq = diagonal([1.0, 0.8, 0.6, 1.2])
wk = diagonal([0.7, 1.1, 0.9, 0.5])
wv = diagonal([1.0, 2.0, 1.0, 2.0])
wo = diagonal([0.5, 1.0, 1.5, 0.8])
scale = sqrt(head_width)

def forward():
    q, k, v = [split(matmul(x, w)) for w in (wq, wk, wv)]
    weights, contexts = [], []
    for qh, kh, vh in zip(q, k, v):
        scores = matmul(qh, transpose(kh))
        a = []
        for i, row in enumerate(scores):
            allowed = [value/scale for value in row[:i+1]]
            exps = [exp(value-max(allowed)) for value in allowed]
            a.append([value/sum(exps) for value in exps]
                     + [0.0]*(len(row)-i-1))
        weights.append(a)
        contexts.append(matmul(a, vh))
    combined = merge(contexts)
    return matmul(combined, wo), (q, k, v, weights, combined)

y, (q, k, v, weights, combined) = forward()
g = [[0.2, -0.1, 0.3, 0.4], [0.1, 0.5, -0.2, 0.3],
     [-0.3, 0.4, 0.2, 0.1]]
dwo = matmul(transpose(combined), g)
dheads = split(matmul(g, transpose(wo)))
dq, dk, dv = [], [], []
for gh, qh, kh, vh, a in zip(dheads, q, k, v, weights):
    da = matmul(gh, transpose(vh))
    ds = []
    for i, (arow, grow) in enumerate(zip(a, da)):
        dot = sum(u*v for u, v in zip(arow, grow))
        ds.append([arow[j]*(grow[j]-dot)/scale if j <= i else 0.0
                   for j in range(len(arow))])
    dq.append(matmul(ds, kh))
    dk.append(matmul(transpose(ds), qh))
    dv.append(matmul(transpose(a), gh))
dwq, dwk, dwv = [matmul(transpose(x), merge(part)) for part in (dq, dk, dv)]
dx_paths = [matmul(merge(part), transpose(w))
            for part, w in zip((dq, dk, dv), (wq, wk, wv))]
dx = [[sum(part[i][j] for part in dx_paths) for j in range(width)]
      for i in range(len(x))]

def loss():
    output, _ = forward()
    return sum(a*b for row, grad in zip(output, g) for a, b in zip(row, grad))

h, errors = 1e-5, []
for i in range(width):
    for j in range(width):
        old = wq[i][j]
        try:
            wq[i][j] = old+h
            plus = loss()
            wq[i][j] = old-h
            minus = loss()
        finally:
            wq[i][j] = old
        errors.append(abs((plus-minus)/(2*h)-dwq[i][j]))
print('head 개수 / 폭:', heads, head_width)
print('출력:', [[round(a, 6) for a in row] for row in y])
print('입력 gradient:', [[round(a, 6) for a in row] for row in dx])
print('W_Q 중앙 차분 최대 오차 < 1e-8:', max(errors) < 1e-8)
assert max(errors) < 1e-8
```

여기서 직접 대조한 범위는 고정 입력과 causal mask 아래의 W_Q 16개 성분이다. 코드에 dW_K·dW_V·dW_O와 dX 계산도 있지만, 이 결과만으로 모든 입력·mask·dtype·Dropout 조합의 backward를 검증한 것은 아니다. batch가 있으면 파라미터 gradient는 각 배치의 사용 경로도 합산해야 한다.
