---
layout: default
title: 렌더링 최적화
nav_order: 7
permalink: /wiki/frontend-topic-842cf28e5f50/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/frontend-topic-842cf28e5f50
projection_sha256: a3865f6e5d76adb07640b88d4694a94c3274b8250f3cb6e5fe9af95ee02d4513
parent: 웹 성능
content_status: ready
public_parent_id: Wiki/keywords/frontend-topic-88f740e8afd2
grand_parent: 프론트엔드
---

# 렌더링 최적화
{: .no_toc }

렌더링 비용은 갱신 횟수와 한 번에 처리하는 작업량에 영향을 받는다. 여러 갱신을 한 번으로 묶는 방법과 화면에 필요한 항목만 만드는 방법을 `lrn-react`의 구현 흐름으로 살펴본다.

## 한 번으로 묶는 것과 일을 나누는 것

같은 동기 실행 구간에서 상태를 세 번 바꿔도 이미 예약한 update가 있으면 `queueMicrotask()` 호출을 추가하지 않는 방식으로 한 번의 렌더에 묶을 수 있다. 원본 런타임의 `sync` 모드는 즉시 update를 호출하고 `microtask` 모드는 시작 시점을 미룬다.

하지만 예약된 update가 시작되면 컴포넌트 실행, VNode 계산, diff, patch, effect commit이 한 흐름으로 끝난다. 긴 렌더가 여러 작업으로 나뉘거나 중간에 양보되는 구조는 아니다. batching 횟수와 한 번의 렌더 소요 시간을 따로 봐야 하는 이유다. [업데이트 흐름과 스케줄링 정리 · 5e9a60f](https://github.com/woonyong-kr/lrn-react/blob/5e9a60f126cc1a2f6ad8df31c7db0f5a59fb929e/docs/update-flow-and-scheduling.md)

## 마우스 이동과 카드 상태의 갱신 주기 나누기

카드 선택·검색·정렬·즐겨찾기는 앱 데이터 상태를 바꾸지만, 포인터가 움직일 때의 tilt 각도와 glare 위치는 같은 빈도로 전체 앱 상태에 저장할 필요가 없다. 원본 쇼케이스는 이 시각 효과를 카드 DOM의 보조 효과로 처리하고 데이터 변화는 상태 기반 렌더 경로에 남긴다. 이 선택의 효과는 실제 프레임 시간으로 측정해야 하며 설계 이유만으로 성능 향상을 수치화할 수는 없다.

가상 스크롤도 전체 카드 개수와 현재 DOM에 올라온 카드 수를 분리한다. 스크롤 컨테이너를 유지하면서 내부 window를 바꾸고 안정된 key로 항목을 재사용해야 카드 상태가 다른 항목으로 섞이지 않는다. 옛 원격 카탈로그·브랜드 이미지·언어 지원 목록은 구현 역사로 보존하며 현재 독립 실행 프로그램의 필수 외부 서비스로 정의하지 않는다. [카드 컬렉션 쇼케이스 앱 설명 · 5e9a60f](https://github.com/woonyong-kr/lrn-react/blob/5e9a60f126cc1a2f6ad8df31c7db0f5a59fb929e/learning-docs/app-showcase-guide.md)

## 같은 실행 구간의 갱신 묶어 보기

`pending`은 이미 예약한 갱신이 있는지를 나타낸다. 아래 코드는 상태를 세 번 바꿔도 microtask를 하나만 예약한다. 동기 구간이 끝난 뒤 출력되는 렌더 횟수와 최종 상태를 확인할 수 있다.

```run-javascript
let state = 0;
let pending = false;
let renders = 0;

function setState(value) {
  state = value;
  if (pending) return;
  pending = true;
  queueMicrotask(() => {
    pending = false;
    renders += 1;
    console.log(`렌더 ${renders}회, 상태 ${state}`);
  });
}

setState(1);
setState(2);
setState(3);
console.log(`동기 구간: 렌더 ${renders}회, 상태 ${state}`);
queueMicrotask(() => {
  if (renders !== 1 || state !== 3) throw new Error("갱신이 묶이지 않았습니다.");
});
```

이 예약 방식은 렌더 자체를 작은 작업으로 나누지 않는다. microtask 안의 계산이 오래 걸리면 그 계산이 끝날 때까지 다음 작업도 기다린다.
