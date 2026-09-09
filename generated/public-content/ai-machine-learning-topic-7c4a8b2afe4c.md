---
layout: default
title: Embedding
nav_order: 3
permalink: /wiki/ai-machine-learning-topic-7c4a8b2afe4c/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-topic-7c4a8b2afe4c
projection_sha256: 971d6b5e7934c21578f955b397b55df9ccca2666da7e887425174b79f6fa1330
parent: LLM
content_status: ready
public_parent_id: Wiki/ai-machine-learning/llm
search_terms:
- 임베딩
grand_parent: AI
---

# Embedding
{: .no_toc }

## 토큰 ID를 행 번호로 사용한다

Embedding lookup은 정수 ID로 학습 가능한 표의 행을 선택하는 연산이다. 어휘가 V개이고 벡터 폭이 D이면 표 E의 shape는 `(V,D)`다. 배치 ID가 `(B,T)`이면 `E[ids]`는 `(B,T,D)`가 된다. ID 100이 ID 10보다 열 배 큰 의미라는 해석은 성립하지 않는다.

수학적으로 lookup은 one-hot 벡터와 E의 행렬곱과 같다. 구현에서는 V개짜리 one-hot을 매번 만들 필요 없이 행을 조회한다. 따라서 ‘행렬곱과 다른 수학 연산’이 아니라 같은 결과를 더 직접적으로 얻는 구현으로 이해한다.

작은 표에서 ID `[2,0,2]`를 조회하면 세 번째·첫 번째·세 번째 행이 순서대로 나온다. ID 2가 두 번 등장해도 파라미터 행이 새로 생기는 것은 아니다. lookup 경로의 [역전파](/wiki/ai-machine-learning-topic-f7bb4c8cd38e/)에서는 같은 행으로 들어온 gradient가 합산된다. 다만 optimizer의 weight decay·이전 momentum 또는 공유된 출력층에서 들어오는 gradient 때문에 조회하지 않은 행의 파라미터도 바뀔 수 있다. ‘조회된 행에 lookup의 gradient가 생긴다’와 ‘그 행만 optimizer가 바꾼다’는 다른 주장이다.

아래는 lookup과 반복 ID의 gradient 합산을 보여 주는 독립 계산 모형이다. optimizer나 실제 embedding 학습은 포함하지 않는다.

```run-python
table = [[1.0,0.0],[0.0,1.0],[0.5,0.5]]
ids = [2,0,2]
upstream = [[1.0,2.0],[3.0,4.0],[5.0,6.0]]
result = [table[i][:] for i in ids]
grad = [[0.0,0.0] for _ in table]
for i, values in zip(ids, upstream):
    for j, value in enumerate(values):
        grad[i][j] += value
print('lookup', result)
print('lookup_gradient', grad)
```

Python 3.9.6에서 확인한 출력이다.

```text
lookup [[0.5, 0.5], [1.0, 0.0], [0.5, 0.5]]
lookup_gradient [[3.0, 4.0], [0.0, 0.0], [6.0, 8.0]]
```

## 위치를 더한 입력과 문맥화된 출력

GPT-2와 현재 `lrn-gpt`는 학습 가능한 token embedding과 position embedding을 더한다.

```text
ID (B,T) → token table 조회 (B,T,D)
위치 0..T-1 → position table 조회 (T,D)
두 배열의 합 → dropout → Transformer 입력 (B,T,D)
```

예를 들어 `(8,4)` ID 배치와 D=256이면 token 결과는 `(8,4,256)`이고 위치 벡터 `(4,256)`는 배치 축에 broadcast된다. `torch.arange(T, device=ids.device)`처럼 위치 ID를 같은 device에서 만들고 T가 위치 표 길이를 넘지 않게 검사한다. 이 표 기반 위치 방식은 RoPE 등 다른 위치 표현까지 일반화한 설명이 아니다.

동일 ID의 token 벡터는 같지만 위치 벡터가 다르고 attention으로 섞이는 문맥도 다르므로 최종 hidden state는 달라질 수 있다. 초기 embedding 표와 Transformer의 문맥 표현을 같은 값으로 취급하지 않는다. `lrn-gpt`의 `InputEmbedding`은 token·position lookup 뒤 PyTorch Dropout을 적용하며, 추론은 eval 모드를 사용한다. [현재 InputEmbedding](https://github.com/woonyong-kr/lrn-gpt/blob/027830d7f49904f656c2d3003d4f6a818ef50269/src/embeddings.py)

## 표의 크기와 출력층 공유

GPT-2 small의 token table은 `50,257 × 768 = 38,597,376`, position table은 `1,024 × 768 = 786,432`개 파라미터다. float32 원소의 저장량은 각각 원소 수의 4배 바이트이며, 학습에는 gradient·optimizer 상태·activation 저장 공간이 추가된다.

Weight tying은 token embedding 표를 LM head에서도 사용하는 것이다. hidden `(B,T,D)`에 E의 전치 `(D,V)`를 곱해 logits `(B,T,V)`를 만든다. 두 번째 VD개 파라미터를 별도로 소유하지 않지만 출력 행렬곱의 연산은 남는다. 현재 `lrn-gpt`는 `tie_embeddings` 설정으로 공유 여부를 선택하며 기본값은 false다. GPT-2의 공유 구조를 이 프로젝트의 모든 설정에 적용했다고 가정하지 않는다. [GPT 모델의 tying 분기](https://github.com/woonyong-kr/lrn-gpt/blob/027830d7f49904f656c2d3003d4f6a818ef50269/src/model.py)

벡터 폭 D는 토큰 하나에 배정된 실수 좌표의 개수다. D=2라면 평면의 점, D=256이라면 256개 좌표를 가진 점으로 생각할 수 있다. 그러나 각 좌표에 사람이 이름 붙일 수 있는 의미가 하나씩 대응하거나, 좌표를 늘리면 유용한 의미를 자동으로 더 담는 것은 아니다. 표현의 적합성은 학습 목표·데이터·학습 결과로 확인해야 한다.

어휘 V를 고정하고 D만 768에서 1536으로 늘리는 가상 비교에서는 token table이 77,194,752개로 두 배가 된다. 약 38.6M개가 추가되는 계산이다. 이 1536은 GPT-2 small의 실제 설정이라는 뜻이 아니다. 입력 표의 크기 증가와 나머지 Transformer의 비용을 나눠 보아야 한다.

## 벡터 폭을 두 배 늘릴 때 달라지는 비용

현재 `lrn-gpt`는 token·position embedding, attention, FFN, LayerNorm에 같은 모델 폭 D를 전달한다. B는 배치 크기, T는 입력 길이, V는 어휘 수, r은 일반 FFN의 확장 비율이다. 아래는 full-sequence forward에서 bias·정규화·활성화 비용을 제외한 주요 행렬 항이다. KV cache를 사용하는 한 토큰씩의 decode 비용표가 아니다.

| 항목 | 주요 크기 또는 연산량 | B·T·V·r을 고정하고 D를 2배로 |
| --- | --- | --- |
| token / position 표 | `VD` / `Tmax D` 파라미터 | 2배 |
| Q·K·V·출력 projection | `4D²` 가중치, `4BTD²` MAC | 4배 |
| 일반 두 행렬 FFN | `2rD²` 가중치, `2rBTD²` MAC | 4배 |
| attention의 `QK^T`·확률과 V의 곱 | 합계 약 `2BT²D` MAC | 2배 |
| vocabulary logits | `BTDV` MAC | 2배 |

MAC은 곱셈과 누적 덧셈 한 묶음이다. 이 항의 비율은 실행 시간이나 실제 peak memory의 비율이 아니다. LayerNorm·bias는 D에 선형인 항을 더하며, gated FFN·다른 projection 구조·kernel·dtype·메모리 접근에 따라 비용이 달라진다. 특히 현재 코드의 SwiGLU·GEGLU는 첫 FFN projection의 출력 폭을 두 배로 하므로 일반 FFN의 `2rD²` 식을 그대로 적용하지 않는다. [attention 가중치](https://github.com/woonyong-kr/lrn-gpt/blob/027830d7f49904f656c2d3003d4f6a818ef50269/src/attention.py) · [FFN 분기](https://github.com/woonyong-kr/lrn-gpt/blob/027830d7f49904f656c2d3003d4f6a818ef50269/src/model.py)

다음 독립 모형은 가중치를 생성하거나 모델을 실행하지 않고 위 정수 식을 계산한다. 표의 float32 바이트 수에는 파일 포맷·allocator·gradient·optimizer·activation이 포함되지 않는다.

```run-python
def leading_cost(vocab, context, width, batch, length, ffn_mult=4):
    return {
        "token_parameters": vocab * width,
        "position_parameters": context * width,
        "block_matrix_parameters": (4 + 2 * ffn_mult) * width * width,
        "projection_ffn_macs": (4 + 2 * ffn_mult) * batch * length * width * width,
        "attention_pair_macs": 2 * batch * length * length * width,
        "lm_head_macs": batch * length * width * vocab,
    }


for width in (768, 1536):
    count = 50257 * width
    print(f"D={width}: token_parameters={count:,}, token_fp32_bytes={count * 4:,}")
print(f"position_parameters(Tmax=1024,D=768)={1024 * 768:,}")

small = leading_cost(50257, 1024, 256, batch=2, length=4)
large = leading_cost(50257, 1024, 512, batch=2, length=4)
for key in small:
    print(f"D:256->512 {key} ratio={large[key] / small[key]:.1f}")

for width, heads in ((256, 8), (256, 7), (48, 4), (192, 4)):
    result = width // heads if width % heads == 0 else "invalid equal split"
    print(f"D={width}, heads={heads}: head_dim={result}")
print("shape: ids(2,4) -> token(2,4,256) + position(4,256) -> output(2,4,256)")
```

Python 3.9.6에서 확인한 출력이다.

```text
D=768: token_parameters=38,597,376, token_fp32_bytes=154,389,504
D=1536: token_parameters=77,194,752, token_fp32_bytes=308,779,008
position_parameters(Tmax=1024,D=768)=786,432
D:256->512 token_parameters ratio=2.0
D:256->512 position_parameters ratio=2.0
D:256->512 block_matrix_parameters ratio=4.0
D:256->512 projection_ffn_macs ratio=4.0
D:256->512 attention_pair_macs ratio=2.0
D:256->512 lm_head_macs ratio=2.0
D=256, heads=8: head_dim=32
D=256, heads=7: head_dim=invalid equal split
D=48, heads=4: head_dim=12
D=192, heads=4: head_dim=48
shape: ids(2,4) -> token(2,4,256) + position(4,256) -> output(2,4,256)
```

projection·일반 FFN의 항은 네 배이지만, attention의 토큰 쌍 연산과 LM head의 항은 두 배다. 따라서 “차원을 두 배 늘리면 모든 행렬곱과 전체 실행 시간이 네 배”라고 일반화할 수 없다. 동일 H를 유지하면 attention score 배열 `(B,H,T,T)`의 원소 수는 D를 직접 포함하지 않는 반면, Q·K·V 배열은 `(B,T,D)` 크기를 갖는다.

## 설정값과 헤드 수를 함께 확인한다

현재 `InputEmbedding`은 `nn.Embedding(V,D)`와 `nn.Embedding(Tmax,D)`를 만든다. 입력 `(B,T)`의 token lookup은 `(B,T,D)`, 위치 ID `0..T-1`의 lookup은 `(T,D)`가 되고, 배치 축으로 broadcast해 더한 뒤 dropout을 적용한다. 예를 들어 `(2,4)` 입력과 D=256이면 결과는 `(2,4,256)`이다. 같은 폭을 갖는다는 것이 두 표가 같은 파라미터라는 뜻은 아니다. [Embedding 2.14의 shape 계약](https://docs.pytorch.org/docs/2.14/generated/torch.nn.Embedding.html)

균등하게 H개 헤드로 나누는 현재 구현은 `D % H == 0`을 요구하고 `head_dim=D/H`로 설정한다. D=256·H=8이면 head_dim=32지만 H=7이면 이 분할을 할 수 없다. PyTorch MultiheadAttention도 전체 embed_dim을 head 수로 나누는 계약을 사용한다. 이 제약은 해당 균등 분할 구조의 조건이며 모든 attention 변형에 대한 수학적 필수 조건은 아니다. [MultiheadAttention 2.14](https://docs.pytorch.org/docs/2.14/generated/torch.nn.MultiheadAttention.html)

`GPTConfig` 기본값은 D=256·H=8·층 수 6이다. 실제 작은 CPU 경로는 `configs/cpu.json`의 D=48·H=4·층 수 2, NSMC 설정은 `configs/nsmc.json`의 D=192·H=4·층 수 4를 사용한다. 64~256을 학습용 모델의 고정 권장 범위로 해석할 근거는 없다. 공개 GPT-2 논문의 네 모델 폭 768·1024·1280·1600도 각 모델의 깊이·학습 조건에 결합된 설정값이다. [현재 설정](https://github.com/woonyong-kr/lrn-gpt/tree/027830d7f49904f656c2d3003d4f6a818ef50269/configs) · [GPT-2 논문 Table 2](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf)

이전 `train_loop_agent.py`에는 나누어떨어지는 head 수를 8·4·2·1 순서로 찾는 `ensure_head_divisible`과 최후의 `D=64,H=4` 반환문이 있었다. 현재 실행 경로는 이 자동 보정을 호출하지 않는다. 설정을 그대로 전달하고 attention 생성 시 나눗셈 조건을 검사하므로 잘못된 조합을 문서에서 조용히 고쳐 설명하지 않는다. [보존된 실험 코드 7875b64](https://github.com/woonyong-kr/lrn-gpt/blob/7875b64f85f19959d66dcaf06c1dcbeb129d71eb/src/train_loop_agent.py)

폭이 작으면 필요한 구분을 표현하지 못할 수 있고, 폭을 늘리면 모델 용량·비용이 커진다. 데이터가 적을 때 과적합 가능성을 고려해야 하지만, 폭 증가가 반드시 성능을 떨어뜨리거나 높인다고 단정할 수는 없다. 먼저 V·문맥 길이·깊이·FFN 종류·head 수·dtype·메모리 예산을 함께 정하고, 차원 선택의 효과는 동일한 데이터 분리와 평가 기준에서 확인한다. 여기의 비용 계산은 그 평가를 대신하지 않는다.

## 정적 벡터와 멀티모달 표현의 경계

word2vec은 단어마다 정적 벡터를 부여한다. Transformer에서도 초기 token embedding은 ID별로 같지만, 이후 층을 통과한 표현은 입력 문맥에 따라 달라진다. 이미지나 오디오가 숫자로 표현된다는 사실만으로 텍스트 벡터와 거리를 비교할 수 있는 공통 의미 공간이 생기지는 않는다. 서로 다른 입력 표현을 비교 가능하게 만드는 학습 목표가 필요하다. 현재 `lrn-gpt`는 텍스트 token을 입력으로 다루며, 이미지·오디오를 텍스트와 같은 의미 공간에 정렬하는 멀티모달 검색은 구현 범위에 포함되지 않는다. [벡터, 임베딩, word2vec · 7875b64](https://github.com/woonyong-kr/lrn-gpt/blob/7875b64f85f19959d66dcaf06c1dcbeb129d71eb/docs/woonyong/00-embedding-and-word2vec.md)

서로 다른 입력의 표현을 가까이 또는 멀리 학습시키는 기준은 [대조 손실의 거리·유사도 비교](/wiki/ai-machine-learning-topic-7c39d8d61e07/)에서 다룬다. 벡터 폭을 같게 맞추는 것과 의미가 대응하도록 학습하는 것은 다른 단계다.
