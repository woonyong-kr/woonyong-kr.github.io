---
layout: default
title: Embedding
nav_order: 3
permalink: /wiki/ai-machine-learning-topic-7c4a8b2afe4c/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-topic-7c4a8b2afe4c
projection_sha256: 4397dd199a6f9800751255b268bdfbf3d235530ba9f1775b758f120474e17ab4
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

## 정적 벡터와 멀티모달 표현의 경계

word2vec은 단어마다 정적 벡터를 부여한다. Transformer에서도 초기 token embedding은 ID별로 같지만, 이후 층을 통과한 표현은 입력 문맥에 따라 달라진다. 이미지나 오디오가 숫자로 표현된다는 사실만으로 텍스트 벡터와 거리를 비교할 수 있는 공통 의미 공간이 생기지는 않는다. 서로 다른 입력 표현을 비교 가능하게 만드는 학습 목표가 필요하다. 현재 `lrn-gpt`는 텍스트 token을 입력으로 다루며, 이미지·오디오를 텍스트와 같은 의미 공간에 정렬하는 멀티모달 검색은 구현 범위에 포함되지 않는다. [벡터, 임베딩, word2vec · 7875b64](https://github.com/woonyong-kr/lrn-gpt/blob/7875b64f85f19959d66dcaf06c1dcbeb129d71eb/docs/woonyong/00-embedding-and-word2vec.md)
