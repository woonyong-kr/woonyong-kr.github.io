---
layout: default
title: 컴포넌트 렌더링
nav_order: 9
permalink: /wiki/frontend-topic-556b062c7529/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/frontend-topic-556b062c7529
projection_sha256: 8d379bfaef0018e4a81a57894f94fdd67613b768e1d7d92b69396a41c62bbea5
parent: React
content_status: ready
public_parent_id: Wiki/keywords/frontend-react-8bebe766ebac
grand_parent: Frontend
---

# 컴포넌트 렌더링
{: .no_toc }

컴포넌트 렌더링은 상태에서 화면의 구조를 계산하고 그 차이를 DOM에 반영하는 과정이다. `lrn-react`의 작은 UI 런타임을 예로 들면 항목의 정체성, 상태 저장, 화면 갱신이 각각 어떤 역할을 하는지 구분할 수 있다.

## 카드 순서가 바뀌어도 같은 항목을 찾아가기

카드 A와 B의 순서가 바뀌었을 때 위치만 비교하면 첫 번째 자리에 있던 DOM을 다른 카드의 내용으로 바꾸게 된다. 안정된 key를 비교하면 같은 카드가 이동한 것으로 처리할 수 있다. `lrn-react`의 옛 diff 안내는 key가 있는 형제 집합은 key를 사용하고, 없는 경우 위치로 비교하는 `auto` 방식과 비교용 `index`·`keyed` 방식을 설명한다. key는 형제 집합 안의 정체성이지 모든 트리에서 공통으로 쓰는 번호가 아니다.

`h()`는 화면을 VNode 객체로 만들고 함수형 자식은 resolver에서 일반 노드로 전개된다. diff는 두 VNode 사이의 텍스트·속성·이벤트·자식 추가/삭제/이동을 patch 목록으로 만든다. renderer는 그 목록을 DOM 변경으로 실행한다. 필요한 부분을 갱신한다는 설명은 가능한 모든 경우에 patch 개수가 수학적으로 최소라는 보장은 아니다. [React 유사 Virtual DOM 시스템의 Diff 알고리즘 설명서 · 5e9a60f](https://github.com/woonyong-kr/lrn-react/blob/5e9a60f126cc1a2f6ad8df31c7db0f5a59fb929e/archive/v1/guides/diff-algorithm-guide.md) [VDOM, Resolver, Diff, Patch 설명 · 5e9a60f](https://github.com/woonyong-kr/lrn-react/blob/5e9a60f126cc1a2f6ad8df31c7db0f5a59fb929e/learning-docs/renderer-and-vdom.md)

## 상태 저장과 DOM 반영 사이의 책임

`props`는 컴포넌트에 전달하는 입력이다. 부모는 표시할 데이터와 이벤트 함수를 자식의 props로 넘기고, 자식은 그 입력으로 화면을 계산한다. 이 런타임의 `performRender()`는 현재 props를 정하고 `hookCursor`를 0으로 되돌린 뒤, 저장된 `renderFn`을 호출해 새 VNode를 얻는다. 렌더가 반복되어도 함수 정의를 매번 새로 만드는 것은 아니다. `update(nextProps)`에 인자를 전달하면 기존 props와 병합하지 않고 교체한다. [렌더와 props 갱신](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/FunctionComponent.js)

`useState()`는 컴포넌트의 `hooks` 배열에서 현재 순서에 해당하는 Slot을 읽는다. 처음에는 상태 값과 setter를 만들고, 다음 렌더에서는 같은 Slot을 재사용한다. 나중에 이벤트에서 호출하는 setter는 클로저에 남은 `slot`과 `component`를 사용한다. setter를 부르는 순서와 렌더 중 Hook을 부르는 순서는 서로 다르다. 상태를 올바르게 이어 가려면 Hook 호출 순서와 컴포넌트 정체성을 함께 유지해야 한다. [상태 Slot과 setter](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/hooks/useState.js)

setter는 DOM을 직접 고치지 않는다. 값을 바꾼 뒤 `scheduleUpdate()`를 호출하며, 자식의 갱신도 `rootOwner`에 예약한다. microtask 모드에서는 이미 유효한 예약이 있으면 다시 예약하지 않는다. 콜백이 기억한 token과 현재 `scheduledUpdate`가 다르거나 취소된 경우에는 오래된 예약을 실행하지 않는다. 이로써 같은 동기 구간의 여러 상태 갱신을 한 번의 update로 묶는다. 실행을 시작한 render·diff·patch를 우선순위에 따라 중단하는 스케줄러는 아니다. [갱신 예약과 취소](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/scheduleUpdate.js)

`useMemo()`는 렌더 중 계산 결과를 재사용하고, `useEffect()`는 DOM 반영 뒤에 실행할 작업을 등록한다. 두 Hook에 전달하는 `deps`는 의존값 배열이다. 이 구현은 두 배열의 길이와 각 원소를 `Object.is()`로 비교한다. 객체 내부를 재귀적으로 비교하거나 콜백이 읽은 값을 자동으로 수집하지 않는다. [의존값 비교](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/areHookDepsEqual.js)

Memo의 계산 결과는 Hook Slot에 남는다. Effect의 실행 함수와 cleanup도 Slot에 저장하지만, 이번에 실행할 Slot의 인덱스는 `pendingEffects`에 따로 모은다. DOM patch 뒤의 commit 단계는 이 목록을 읽어 이전 cleanup, 새 Effect, 새 cleanup 저장 순서로 처리한다. unmount에서도 자원을 정리한다. 이벤트 핸들러를 바꿀 때 이전 리스너를 제거하고 새 리스너를 등록하는 처리 역시 필요하다. [Memo 계산](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/hooks/useMemo.js), [Effect 등록](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/hooks/useEffect.js), [Effect commit](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/commitEffects.js)

비동기 API 응답을 저장하고 다음 화면 갱신을 알리는 일과, 이미 가진 값으로 파생 결과를 계산하는 일은 나누어 생각해야 한다. 이 앱은 응답을 상태에 저장하고 Memo로 파생값을 계산한다. 응답 내용이 잘 바뀌지 않더라도 `useMemo()`가 응답 도착을 감지해 화면 갱신까지 예약해 주는 것은 아니다.

옛 런타임 안내에는 ‘루트에서만 Hook 허용’이라는 제약이 남아 있다. 이후 학습 레포는 컴포넌트별 Hook을 지원하므로 버전에 따라 읽어야 한다. 여기서 다루는 것은 자체 UI 런타임이며 React 전체의 호환 구현은 아니다. [초기 런타임 안내](https://github.com/woonyong-kr/lrn-react/blob/5e9a60f126cc1a2f6ad8df31c7db0f5a59fb929e/learning-docs/runtime-walkthrough.md)

## 화면 변화와 Inspector를 함께 읽기

카드 hover를 검토한 당시에는 두 가지 갱신 경로가 있었다. 카드 선택과 데이터 로드는 상태를 바꿔 런타임의 patch를 거쳤고, 광택·기울기 효과는 이벤트에서 DOM style을 직접 바꿨다. 이후 상세 카드 한 장을 상태 갱신 경로로 옮겨 전체 흐름을 관찰하도록 했다. 이벤트 연결과 요소 생성이 런타임을 거친다고 해서 이후 모든 시각효과도 같은 경로를 거치는 것은 아니다.

Inspector는 렌더 횟수와 patch 목록 등을 요약한 snapshot을 보여 준다. `createRuntimeBridge()`의 `subscribe()`는 콜백을 등록하고 해제 함수를 반환하며, `publish()`는 최신 snapshot을 저장한 뒤 등록된 콜백을 호출한다. snapshot은 실제 DOM 전체를 복사한 자료가 아니므로, 화면 효과의 실행 경로나 성능을 확인하려면 해당 이벤트와 DOM 변경도 함께 살펴야 한다. [Inspector와 구독 연결](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/app/main.js)

## 순서를 바꿨을 때 상태가 따라가는 항목

아래 예제는 DOM을 만들지 않고 각 항목이 소유한 입력 상태만 비교한다. B를 앞으로 옮겼을 때 위치를 기준으로 재사용하면 A의 상태가 B 자리에 붙는다. key를 기준으로 찾으면 B가 자신의 상태를 유지한다.

```run-javascript
const previous = [
  { key: "A", input: "사과 메모" },
  { key: "B", input: "바나나 메모" },
];
const nextKeys = ["B", "A"];
const byKey = new Map(previous.map(item => [item.key, item]));

for (const [index, key] of nextKeys.entries()) {
  const fromIndex = previous[index].input;
  const fromKey = byKey.get(key).input;
  console.log(`${key}: 위치로 재사용 = ${fromIndex}, key로 재사용 = ${fromKey}`);
}
if (byKey.get(nextKeys[0]).input !== "바나나 메모") {
  throw new Error("B의 상태를 찾지 못했습니다.");
}
```

실제 reconciler는 key와 함께 노드 타입, 부모와 자식 관계도 확인한다. 이 코드는 정체성을 찾는 기준의 차이만 보여 주며 DOM 이동이나 Hook 구현 전체를 대신하지 않는다.
