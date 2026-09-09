---
layout: default
title: 토큰화
nav_order: 2
permalink: /wiki/ai-machine-learning-topic-b126bbe83b86/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-topic-b126bbe83b86
projection_sha256: c716fea914478506a14038c0cf3813f0a902f15bbab243bb7f7951cea0330c0b
parent: LLM
content_status: ready
public_parent_id: Wiki/ai-machine-learning/llm
grand_parent: AI
---

# 토큰화
{: .no_toc }

## 텍스트를 어떤 단위의 ID로 바꿀 것인가

토큰화는 문자열을 모델이 처리할 정수 ID 열로 바꾸는 단계다. 문자 단위는 어휘가 작지만 문맥이 길어지고, 단어 단위는 흔한 단어를 짧게 표현하지만 어휘 밖 단어를 처리할 규칙이 필요하다. 서브워드는 빈번한 조각을 합치고 드문 단어는 작은 조각으로 나눠 두 비용을 조정한다. ID의 숫자 크기는 의미의 크기나 거리와 관계없다. 이 ID로 벡터를 조회하는 과정은 [Embedding](/wiki/ai-machine-learning-topic-7c4a8b2afe4c/)에서 이어진다.

토크나이저 학습은 어휘와 분할 규칙을 만드는 과정이다. 이를 고정해 encode한 ID로 신경망의 가중치를 학습하는 과정과 구분한다. 이미 학습된 tokenizer로 새 문장을 encode할 때 새 병합 규칙을 배우면 같은 ID의 의미가 달라져 모델과 맞지 않는다. 체크포인트에는 어휘·특수 토큰 ID·병합 순서·정규화 설정을 함께 보존한다.

## BPE는 현재 시퀀스에서 빈도가 높은 쌍을 합친다

Byte-level BPE는 256개 바이트를 기본 단위로 삼는다. `lrn-gpt`는 여기에 `<pad>`, `<unk>`, `<bos>`, `<eos>` 4개를 앞에 두므로 0~3은 특수 ID, 4~259는 바이트 ID, 260부터는 병합 ID다. 예를 들어 `Hello`의 UTF-8 바이트 `[72,101,108,108,111]`은 이 구현에서 `[76,105,112,112,115]`로 시작한다. 이 offset은 프로젝트의 규약이며 GPT-2의 ID 배치와 같지 않다.

학습은 인접 쌍 빈도 계산 → 최빈 쌍 선택 → 새 ID 부여 → 겹치지 않는 치환 → 빈도 갱신을 반복한다. `l + o → lo`를 합치면 기존 `o,w`가 사라지고 `lo,w`가 생길 수 있다. 최초 빈도 순위를 끝까지 재사용하면 다른 알고리즘이 된다. 동률 규칙과 최소 빈도도 재현 조건이다.

한 번의 치환은 왼쪽부터 진행한다. `[a,a,a]`에서 `(a,a)`를 합치면 `[aa,a]`이며 가운데 a를 두 번 소비해 `[aa,aa]`를 만들지 않는다. encode에서는 저장된 병합 순서를 적용한다. decode에서는 병합 토큰을 바이트열로 풀고 전체 바이트열을 UTF-8로 해석한다. 한 토큰이 완전한 UTF-8 문자라는 보장은 없으므로 토큰마다 따로 문자열로 바꾸면 깨질 수 있다.

목표 어휘 수는 실제 생성된 어휘 수와 다를 수 있다. 유효한 쌍이 없거나 최소 빈도 아래면 일찍 멈춘다. 이 프로젝트는 기본 어휘만 260개이므로 그보다 작은 요청도 실제 어휘를 260개 미만으로 줄이지 않는다. 모델의 embedding과 출력층은 요청값 대신 실제 ID 범위에 맞춰야 한다. [lrn-gpt의 BPE 구현](https://github.com/woonyong-kr/lrn-gpt/blob/027830d7f49904f656c2d3003d4f6a818ef50269/src/bpe.py)

## 병합 전에 어떤 경계를 만드는가

GPT-2는 UTF-8 바이트를 가역적인 유니코드 표기로 매핑하고, 정규식으로 나눈 조각 안에서 BPE를 적용한다. 문자 클래스 `\p{L}`·`\p{N}`과 공백·축약형을 구분하는 규칙을 사용한다. Python 표준 `re`의 `\w`로 바꾼 짧은 패턴은 숫자·밑줄 처리 등이 달라 같은 tokenizer가 아니다. `lrn-gpt`의 작은 BPE는 전체 바이트열에 병합을 학습한다. 두 구현은 병합 전의 분할 경계가 달라 같은 입력에서도 서로 다른 토큰열을 만들 수 있다. [GPT-2 encoder 원본](https://github.com/openai/gpt-2/blob/master/src/encoder.py)

문서 끝·문장 시작·padding·채팅 역할을 나타내는 특수 토큰도 모델별 계약이다. `<|endoftext|>`나 특정 채팅 템플릿의 구분자를 모든 모델에 공통으로 넣을 수는 없다. 사용자 문자열 안에 같은 표기가 나타난 경우 일반 텍스트로 처리할지 특수 ID로 허용할지도 구분해야 한다.

## BPE·WordPiece·Unigram을 비교하는 축

| 방법 | 학습 방향 | encode에서 중요한 규칙 |
|---|---|---|
| BPE | 작은 단위에서 빈번한 인접 쌍을 병합 | 학습한 merge rank와 전처리 경계 |
| WordPiece | 작은 조각에서 어휘를 늘리는 계열 | 어휘에서 가장 긴 접두 조각을 찾는 분할과 continuation 표기 |
| Unigram | 큰 후보 어휘에서 확률 모델에 덜 필요한 조각을 제거 | 가능한 분할의 확률; 최적 분할 또는 sampling |

WordPiece의 교육용 병합 점수는 `freq(AB)/(freq(A)·freq(B))`로 자주 설명한다. 예를 들어 쌍 빈도가 같으면 각 조각이 따로 덜 등장하는 쌍의 점수가 높다. 하지만 Google의 학습 구현 전체가 공개된 것은 아니므로 이 식을 정확한 구현 계약으로 단정하지 않는다. BPE의 점수 함수만 바꾸면 WordPiece encode까지 구현되는 것도 아니다. `un`, `##afford`, `##able`에서 `##`는 중간 조각 표기이며 별개의 접두 토큰이라고 가정하지 않는다. [Hugging Face의 WordPiece 설명](https://huggingface.co/docs/course/chapter6/6)

Unigram은 각 분할을 구성하는 조각의 확률을 이용해 코퍼스 우도를 계산하고, 후보를 제거했을 때의 손실을 고려해 어휘를 줄인다. 최고 확률 분할을 고르면 결정적으로 사용할 수 있고, 여러 분할을 sampling하면 subword regularization에 쓸 수 있다. 확률 모델이라는 이유만으로 매번 다른 결과가 나오는 것은 아니다. SentencePiece는 BPE와 Unigram 등을 제공하는 구현 도구이며 별도의 네 번째 알고리즘 이름이 아니다. [SentencePiece](https://github.com/google/sentencepiece)

SentencePiece는 BPE·Unigram에서 언어별 단어 분리기 없이 텍스트를 입력받을 수 있지만 내부 정규화와 분할 제약까지 없는 것은 아니다. 공백 표기 `▁`와 decode 규칙은 정규화된 입력을 다루며, 기본 NFKC 계열 정규화는 원래 표기를 바꿀 수 있다. 원본 바이트 왕복이 요구되면 normalizer와 whitespace 설정까지 확인한다. [SentencePiece 정규화 계약](https://github.com/google/sentencepiece/blob/master/doc/normalization.md)

## 어휘를 늘릴 때 함께 커지는 비용

어휘 크기 V와 embedding 폭 D가 정해지면 token embedding은 VD개 파라미터를 가진다. GPT-2 small의 V=50,257, D=768이면 38,597,376개다. 어휘가 커져 시퀀스 길이 T가 줄면 일반적인 dense attention의 토큰 쌍 계산을 줄일 수 있지만 embedding·출력층 비용과 드문 토큰의 학습 빈도는 달라진다. 어휘 크기만으로 압축률이나 품질이 일정 비율로 좋아진다고 보장하지 않는다.

한글 `가`는 UTF-8에서 세 바이트 `EA B0 80`이다. 이 바이트를 하나로 병합할지는 코퍼스 빈도와 병합 예산에 달려 있다. 한글의 영어 대비 토큰 수가 항상 3~5배라는 고정 배율은 없다. 어휘별 토큰 수는 같은 문자열을 각 tokenizer로 encode해 측정해야 한다. 비교할 때는 같은 문자열의 실제 토큰 수, 어휘 수, 정규화 여부, decode 일치를 기록한다.

## 같은 검증 문자열로 loss의 단위를 맞추기

서로 다른 tokenizer를 비교할 때 token당 loss가 작은 모델이 같은 텍스트를 더 잘 설명한다고 바로 결론낼 수 없다. 동일 평가 범위의 token당 평균 nats에 `검증 token 수 / 검증 문자 수`를 곱해 문자당 nats를 구하고, 이를 `ln(2)`로 나눠 bits/char로 비교한다. 특수 토큰·padding·실제 scoring된 문자 범위를 다르게 세면 이 환산도 비교 가능한 지표가 되지 않는다.

한글 인식 BPE 보고서는 256개 byte와 4개 특수 토큰의 기본 어휘, 빈도 기반 병합, 한글 음절을 우선 묶는 하이브리드를 비교할 가설로 제시한다. UTF-8 경계 복원과 자주 쓰이는 조각의 압축은 다른 문제다. 어휘 확장은 시퀀스를 줄일 수 있지만 embedding·출력층 비용과 드문 토큰의 학습 빈도도 바꾼다. 이 하이브리드는 보고서의 비교 가설이며, 보고서에는 구현·채택·품질 우위를 입증한 결과가 제시되어 있지 않다. [토크나이저 / BPE / 데이터셋 프로필 · 7875b64](https://github.com/woonyong-kr/lrn-gpt/blob/7875b64f85f19959d66dcaf06c1dcbeb129d71eb/docs/train/tokenizer_profile.md) [한글 인식 BPE 토크나이저 보고서 · 7875b64](https://github.com/woonyong-kr/lrn-gpt/blob/7875b64f85f19959d66dcaf06c1dcbeb129d71eb/docs/woonyong/11-hangul-aware-bpe-report.md)

## 두 번의 병합과 바이트 복원을 실행한다

다음은 정규식·특수 토큰을 생략한 독립 BPE 모형이다. 현재 시퀀스의 쌍 빈도를 매번 다시 세고 동률이면 사전순으로 선택한다. 이 모형의 기본 ID는 바이트 값과 같으며, 프로젝트의 특수 토큰 4개에 따른 ID offset은 적용하지 않는다. [Byte-level BPE 학습 노트](https://github.com/woonyong-kr/lrn-gpt/blob/7875b64f85f19959d66dcaf06c1dcbeb129d71eb/docs/woonyong/06-byte-pair-encoding.md)

```run-python
from collections import Counter

def replace_pair(seq, pair, token):
    out, i = [], 0
    while i < len(seq):
        if tuple(seq[i:i+2]) == pair:
            out.append(token)
            i += 2
        else:
            out.append(seq[i])
            i += 1
    return out

text = 'ababab'
vocab = {i: bytes([i]) for i in range(256)}
seq = list(text.encode('utf-8'))
rules = []
for _ in range(2):
    counts = Counter(zip(seq, seq[1:]))
    pair = min(counts, key=lambda p: (-counts[p], p))
    token = len(vocab)
    vocab[token] = vocab[pair[0]] + vocab[pair[1]]
    rules.append((pair, token))
    seq = replace_pair(seq, pair, token)
    print('merge', pair, 'count', counts[pair], 'ids', seq)
encoded = list(text.encode('utf-8'))
for pair, token in rules:
    encoded = replace_pair(encoded, pair, token)
decoded = b''.join(vocab[i] for i in encoded).decode('utf-8')
print('decoded', decoded, 'roundtrip', decoded == text)
```

Python 3.9.6에서 확인한 출력이다.

```text
merge (97, 98) count 3 ids [256, 256, 256]
merge (256, 256) count 2 ids [257, 256]
decoded ababab roundtrip True
```
