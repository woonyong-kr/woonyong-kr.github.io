---
layout: default
title: 검증 데이터
nav_order: 7
permalink: /wiki/ai-machine-learning-topic-3b9f4a2496bc/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/ai-machine-learning-topic-3b9f4a2496bc
projection_sha256: 443277bb45d230bfa4406e72191b272ca66ee70e6a299e6f864f8ea9ed315d33
parent: 머신러닝
content_status: ready
public_parent_id: Wiki/ai-machine-learning/ml
grand_parent: AI
---

# 검증 데이터
{: .no_toc }

## 설정을 고르는 데이터와 마지막에 평가하는 데이터

검증 데이터(validation set)는 학습률·모델 크기·학습 종료 시점처럼 학습 절차를 선택하는 데 사용한다. 학습 데이터는 [손실](/wiki/ai-machine-learning-topic-7c39d8d61e07/)의 gradient로 가중치를 갱신하고, test 데이터는 선택이 끝난 모델을 평가한다. 검증 결과가 설정 선택에 영향을 주는 것은 정상이다. 검증 데이터를 가중치 학습이나 전처리 통계 계산에 섞고도 독립된 평가처럼 취급하는 것이 누수다.

비율을 80:10:10으로 고정해야 하는 것은 아니다. 같은 사람·문서·시계열의 인접 샘플이 양쪽에 섞이면 무작위 분할만으로도 누수가 생길 수 있어 실제 배포에서 만날 새 입력의 단위에 맞춰 나눈다. 분할 인덱스와 seed를 먼저 고정하고, 표준화·어휘 학습 등 데이터에서 얻는 변환은 학습 부분에서만 추정한다. 모델 선택을 마친 뒤 train과 validation으로 다시 학습할 수 있지만, 이때도 test 결과를 보고 설정을 되돌려 고르지 않는다.

하이퍼파라미터는 보통 가중치 학습의 바깥에서 선택하는 설정이다. 사람이 직접 정할 수도 있고 자동 탐색이 선택할 수도 있다. 학습률 스케줄처럼 학습 도중 값이 달라지는 설정도 있으므로 ‘알고리즘이 바꿀 수 없는 상수’로 정의하지 않는다.

| 설정 | 바꾸는 것 | 비교할 때 함께 고정할 조건 |
|---|---|---|
| 학습률·optimizer | 한 gradient를 실제 이동량으로 바꾸는 규칙 | 스케줄, update 횟수, 초기값 |
| 은닉층 폭·깊이 | 표현 용량과 계산량 | 학습 데이터, 예산, 정규화 |
| 배치 크기 | 한 update에 쓰는 표본과 gradient 잡음 | 에폭뿐 아니라 update·처리 표본 수 |
| Dropout 비율 | 학습 중 차단하는 경로의 확률 | 층 위치, train/inference 스케일링 |
| 에폭·종료 기준 | 데이터를 사용하는 양과 checkpoint 선택 | validation 지표와 patience |

## 탐색 예산을 쓰는 방법

Grid search는 각 축의 후보를 모두 조합하므로 후보가 각각 4·3·5개면 60회를 실행한다. Random search는 정한 분포에서 조합을 뽑아 예산만큼 비교한다. 모든 축을 촘촘히 훑는 대신 영향이 큰 축에 다양한 값을 시도할 수 있지만 최적값 발견을 보장하지는 않는다. 학습률은 자릿수 차이가 중요하므로 예를 들어 `10 ** uniform(-4, -1)`처럼 로그 공간에서 뽑는다. 이 범위와 20회 같은 예산은 예시이며 모델별 권장값이 아니다.

각 후보는 새 모델과 새 optimizer 상태로 시작한다. 공통 분할에서 같은 지표를 계산하고, 초기화·셔플의 차이를 줄여 비교한 뒤 유망한 후보에는 여러 seed를 적용한다. 탐색을 많이 할수록 validation에도 선택 편향이 쌓일 수 있어, 후보 개수와 탐색에 쓴 데이터까지 기록한다. 확률 0~1로 반환된 accuracy를 출력할 때는 100을 곱한 뒤 `%`를 붙여야 한다.

훈련 손실은 내려가는데 검증 손실이 나빠지면 일반화 격차를 조사한다. 이것만으로 암기를 직접 측정했다고 하거나 특정 학습률이 항상 적절하다고 단정하지 않는다. 데이터 분포 차이, 규제, 실행 예산, 평가 모드도 함께 살핀다.

## 폭을 바꾸면 몇 개의 파라미터가 달라지는가

Affine의 가중치와 편향 수는 `입력 폭 × 출력 폭 + 출력 폭`이다. 아래 합에는 BatchNorm 파라미터와 통계가 포함되지 않는다.

| 구조 | 첫 Affine | 둘째 Affine | 출력 Affine | Affine 합 |
|---|---:|---:|---:|---:|
| 784 → 512 → 256 → 10 | 401,408 + 512 | 131,072 + 256 | 2,560 + 10 | 535,818 |
| 784 → 128 → 64 → 10 | 100,352 + 128 | 8,192 + 64 | 640 + 10 | 109,386 |

두 은닉층에 BatchNorm을 넣으면 `gamma, beta`가 각각 추가되어 첫 구조는 1,536개, 둘째는 384개의 학습 파라미터가 더 필요하다. running mean·variance는 별도의 저장 상태다. 작은 구조의 Affine 수는 약 4.9배 적지만 속도와 일반화 성능이 같은 비율로 좋아지지는 않는다.

현재 `lrn-mnist`의 `src/application.py`는 공식 training 60,000장을 seed로 나눠 50,000장으로 학습하고 10,000장으로 validation 정확도를 계산한다. validation에서 가장 좋은 모델의 가중치·BatchNorm 통계·분할 seed·데이터 hash를 저장하고, 공식 test 10,000장 평가는 별도 명령에서 수행한다. 과거 과제의 랜덤 탐색은 `training.py`를 import하는 구조였으며, 현재 `application.py`의 실행 인터페이스와는 다르다.

## 정확도가 비슷할 때 무엇을 근거로 선택했는가

MNIST 팀 보고서는 `batch_64`와 더 넓은 `[1024, 512]` 은닉층이 모두 test 정확도 98.54%를 기록했지만, 더 적은 파라미터와 학습 시간이 드는 설정을 최종 선택했다고 설명한다. 당시 환경은 Apple M4·macOS 26.3.1·Python 3.11.15이며 훈련 데이터 60,000개를 사용했다. 이 수치는 최우녕·이창원·이혜연 세 사람의 팀 보고서에 기록된 당시 결과다. 개인 단독 성과나 현재 validation 분할을 사용한 모델의 재측정 결과와는 구분한다.

보고서 자체가 여러 test 결과를 보고 최종 설정을 선택한 경로를 담고 있다. 그 값을 독립된 최종 test 평가로 다시 제시하면 선택 편향을 숨기게 된다. 독립된 평가를 얻으려면 validation에서 설정을 선택한 뒤 test로 평가해야 한다. 이 사례는 정확도가 같아도 파라미터 수와 학습 비용이 다를 수 있음을 보여 준다. 반복 seed 없이 0.1%p 안팎의 차이를 일반적 우열로 확대하지 않는다. [MNIST 손글씨 인식 과제 보고서 · 1c28de6](https://github.com/woonyong-kr/lrn-mnist/blob/1c28de6983671e891faac453e392f68b354bdb53/REPORT.md) [08. 깊은 신경망과 실험 방법 · 1c28de6](https://github.com/woonyong-kr/lrn-mnist/blob/1c28de6983671e891faac453e392f68b354bdb53/docs/woonyong/deep-learning-from-scratch/08-deep-learning-practice.md)

## 혼합 실험 표의 상관을 단일 설정의 효과로 읽지 않기

mini GPT 보고서에는 context 길이·어휘 크기·head 수·깊이·정규화 위치 등 여러 조건의 실험이 섞여 있다. 상관 보고서의 Pearson/Spearman 값은 이 표 안의 관찰 관계이며 한 변수를 바꿨을 때의 인과 효과가 아니다. 예를 들어 tokenizer가 달라지면 토큰 하나의 평균 길이와 loss 단위도 달라져 token loss만으로 순위를 매길 수 없다.

짝비교 노트는 `delta = variant - baseline`으로 방향을 통일하고, 어떤 축이 함께 바뀌었는지 기록한다. validation loss가 낮아졌어도 train/validation gap이 커졌다면 비용을 함께 해석해야 한다. gap 자체가 암기의 직접 측정치는 아니므로 과적합 가능성을 보여 주는 진단값으로 사용한다. 실험 그래프·ID·설정은 당시 보고서에서 함께 확인할 수 있다. 특정 head 수나 activation이 모든 모델의 최적값이라고 일반화할 수는 없다. [mini GPT 구현 및 LLM 하이퍼파라미터 실험 보고서 · 7875b64](https://github.com/woonyong-kr/lrn-gpt/blob/7875b64f85f19959d66dcaf06c1dcbeb129d71eb/REPORT.md) [상관 증거 보고서 · 7875b64](https://github.com/woonyong-kr/lrn-gpt/blob/7875b64f85f19959d66dcaf06c1dcbeb129d71eb/docs/train/correlation_report.md) [변수 효과 지도 · 7875b64](https://github.com/woonyong-kr/lrn-gpt/blob/7875b64f85f19959d66dcaf06c1dcbeb129d71eb/docs/train/effect_map.md)

## 실험 계획 횟수와 실제 완료 기록을 구분하기

2026-06-03 연구 상황 보고서는 자동 실험 112개를 기록하고, raw validation loss 최저 run과 별도의 overfit-aware 점수로 선택한 run을 구분한다. 150회 실험 설계 문서의 횟수는 계획이므로 이를 완료 150회로 합산해서는 안 된다. 수동 HY 실험과 자동 loop는 corpus·tokenizer·모델 크기·배치 조건도 달라 loss 절대값을 같은 순위표에 섞지 않는다.

실험 비교에 재사용할 부분은 단일 변수 변경, 비교 가능한 학습 예산, seed 반복, 목적에 맞춘 지표다. 당시 자동 실험 loop는 연구용 구성이었다. 현재 `lrn-gpt`의 실행 경로는 작은 LM의 학습·생성·checkpoint 재개이며, 이 자동 탐색 loop는 제공하지 않는다. [mini GPT 실험 연구 상황 보고서 · 7875b64](https://github.com/woonyong-kr/lrn-gpt/blob/7875b64f85f19959d66dcaf06c1dcbeb129d71eb/docs/train/research_status_report.md) [GPT 하이퍼파라미터 실험 설계 · 7875b64](https://github.com/woonyong-kr/lrn-gpt/blob/7875b64f85f19959d66dcaf06c1dcbeb129d71eb/docs/woonyong/10-hyperparameter-experiment-plan.md)
