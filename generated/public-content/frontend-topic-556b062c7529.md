---
layout: default
title: 컴포넌트 렌더링
nav_order: 9
permalink: /wiki/frontend-topic-556b062c7529/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/frontend-topic-556b062c7529
projection_sha256: 1a1fc6ed59213a66b5270d1da4b4397abd2c78c7eb703bebf6defbae0e1f122b
parent: React
content_status: ready
public_parent_id: Wiki/keywords/frontend-react-8bebe766ebac
grand_parent: Frontend
---

# 컴포넌트 렌더링
{: .no_toc }

카드 A와 B의 순서를 바꾸면서 각 카드에 입력한 내용은 그대로 유지하려면, 화면의 위치와 항목의 정체성을 구분해야 한다. `lrn-react`의 `0cfbd03` 버전은 컴포넌트 입력으로 VNode를 계산하고 이전 화면과의 차이를 DOM에 반영한다. 이 경로를 따라가면 상태 저장과 화면 갱신이 어떻게 이어지는지 볼 수 있다.

## 브라우저에서 앱이 처음 시작될 때

SPA는 한 문서를 연 뒤 JavaScript가 화면을 바꾸며 사용하는 웹 앱 구조다. 화면마다 새 HTML 문서를 내려받아 전체 이동을 해야 하는 것은 아니다. React 사용 여부와 SPA 여부는 별개이며, SPA에도 URL과 뒤로가기 처리를 위한 라우팅을 둘 수 있다. 이 카드 앱에서는 페이지 상태에 따라 보여 줄 컴포넌트를 바꾼다.

첫 화면을 붙이려면 먼저 HTML의 루트 요소가 있어야 한다. `main.js`는 `document.readyState`가 `interactive` 또는 `complete`이면 `mountApp()`을 바로 호출하고, 아직 준비 중이면 `DOMContentLoaded`에 한 번만 연결한다. 이 이벤트를 이미지까지 모두 다운로드됐다는 뜻으로 읽지는 않는다.

`mountApp()`은 `#app`을 찾고, 없으면 오류를 낸다. 이어 runtimeBridge를 만들고 Inspector의 구독을 연결한 뒤 `createApp({ root, component: App, props: { runtimeBridge }, batching: "microtask" })`으로 런타임 객체를 준비한다. 이때 정한 batching은 이후 상태 갱신 예약에 사용된다. 객체를 만드는 것과 첫 DOM을 붙이는 것은 다른 단계다.

다음 `app.mount()`가 내부 `FunctionComponent.mount()`를 호출한다. 루트 요소를 저장하고 App과 자식 컴포넌트에서 VNode를 계산한 다음 엔진을 만들어 첫 DOM을 붙이고 컴포넌트들의 Effect를 commit한다. `mountApp()`은 마지막으로 초기 Inspector snapshot을 화면에 맞춘다. 브리지를 구독시키는 일, 컴포넌트 입력을 준비하는 일, DOM을 붙이는 일의 역할을 이 순서로 나누어 읽으면 된다. [앱 시작점](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/app/main.js#L143), [공개 createApp API](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/createApp.js#L25), [첫 mount](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/FunctionComponent.js#L207)

## 카드 순서가 바뀌어도 같은 항목을 찾아가기

카드 A와 B의 순서가 바뀌었을 때 위치만 비교하면 첫 번째 자리에 있던 DOM을 다른 카드의 내용으로 바꾸게 된다. 안정된 key를 비교하면 같은 카드가 이동한 것으로 처리할 수 있다. 이 버전의 `auto` 모드는 이전·다음 자식 중 key가 하나라도 있으면 keyed 비교를 선택하고, 양쪽 모두 key가 없으면 위치로 비교한다. 비교용 `index`·`keyed` 모드도 제공한다. key는 형제 집합 안의 정체성이지 모든 트리에서 공통으로 쓰는 번호가 아니다.

`h()`는 화면을 VNode 객체로 만들고 함수형 자식은 resolver에서 일반 노드로 전개된다. diff는 두 VNode 사이의 텍스트·속성·이벤트·자식 추가/삭제/이동을 patch 목록으로 만든다. renderer는 그 목록을 DOM 변경으로 실행한다. 필요한 부분을 갱신한다는 설명은 가능한 모든 경우에 patch 개수가 수학적으로 최소라는 보장은 아니다. [자식 비교와 모드 선택](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/reconciler/diffChildren.js), [컴포넌트 전개와 렌더](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/FunctionComponent.js)

## Patch의 인덱스는 어느 시점의 DOM을 가리키는가

`path = [2, 1]`은 루트의 `childNodes[2]`에서 다시 `childNodes[1]`로 내려가는 경로다. Element만 세는 `children`과 달리 Text Node도 인덱스에 포함된다. `getDomNodeByPath()`는 이 경로를 따라가며, 없는 노드를 가리키면 오류를 낸다. 자식 추가·삭제·이동은 먼저 그 자식들을 소유한 부모를 찾는다.

`orderPatches()`는 같은 부모 경로의 삭제끼리는 뒤 인덱스를 먼저 처리하고, 같은 경로의 삭제와 삽입을 비교하면 삭제를 앞에 둔다. 그렇다고 임의의 patch 목록을 어떤 순서로 만들어도 안전해지는 것은 아니다. 한 번 삭제하거나 옮기면 뒤의 인덱스가 가리키는 대상이 달라지므로, patch를 만드는 쪽과 적용하는 쪽이 같은 시점의 DOM을 전제해야 한다.

이 버전의 keyed diff는 옛 항목의 정체성을 `working` 배열에 놓고, 없어진 항목을 뒤에서부터 제거한다. 이후 새 목록을 왼쪽부터 맞추면서 삽입·이동을 만들 때마다 `working`도 갱신한다. 이어지는 patch의 인덱스는 앞선 조작을 반영한 배열을 기준으로 계산된다. `MOVE_CHILD`는 이 생성 순서 안에서 기존 DOM을 `insertBefore()`로 옮긴다. 이를 임의의 양방향 인덱스 이동을 모두 처리하는 독립 API로 일반화하지 않는다. [keyed diff의 작업 배열](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/reconciler/diffChildren.js#L88), [적용 순서와 경로 탐색](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/renderer-dom/patch.js#L18)

`applySinglePatch()`는 VNode를 다시 비교하지 않고 결정된 연산을 실행한다. 속성 변경·제거는 `applyDomProp`, 텍스트는 `textContent`, 자식 삽입·삭제·이동은 부모의 DOM 연산, 노드 교체는 `replaceWith`, 이벤트 변경은 리스너 전용 helper가 맡는다. 이벤트 핸들러를 바꿀 때 이전 리스너를 제거하고 새 리스너를 등록하는 처리 역시 필요하다. 알 수 없는 patch 타입은 오류로 처리한다. `applyPatches()`는 이 평평한 목록을 순회하지만, 각 항목을 적용할 때 필요한 DOM 경로 탐색까지 사라지는 것은 아니다.

하이라이트 helper는 변경된 노드나 그 조상을 찾아 CSS 클래스를 다시 붙여 변화를 눈에 보이게 한다. Text Node에서는 표시 가능한 부모가 필요하고, 애니메이션을 다시 시작시키는 처리에는 레이아웃 읽기도 들어간다. 이 표시는 관찰을 위한 추가 작업이므로 patch 자체의 성능 측정과 구분한다. [개별 DOM 연산과 목록 적용](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/renderer-dom/patch.js#L171)

## 상태 저장과 DOM 반영 사이의 책임

`props`는 컴포넌트에 전달하는 입력이다. 부모는 표시할 데이터와 이벤트 함수를 자식의 props로 넘기고, 자식은 그 입력으로 화면을 계산한다. 이 런타임의 `performRender()`는 현재 props를 정하고 `hookCursor`를 0으로 되돌린 뒤, 저장된 `renderFn`을 호출해 새 VNode를 얻는다. 렌더가 반복되어도 함수 정의를 매번 새로 만드는 것은 아니다. `update(nextProps)`에 인자를 전달하면 기존 props와 병합하지 않고 교체한다. [렌더와 props 갱신](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/FunctionComponent.js)

`useState()`는 컴포넌트의 `hooks` 배열에서 현재 순서에 해당하는 Slot을 읽는다. 처음에는 상태 값과 setter를 만들고, 다음 렌더에서는 같은 Slot을 재사용한다. 나중에 이벤트에서 호출하는 setter는 클로저에 남은 `slot`과 `component`를 사용한다. setter를 부르는 순서와 렌더 중 Hook을 부르는 순서는 서로 다르다. 상태를 올바르게 이어 가려면 Hook 호출 순서와 컴포넌트 정체성을 함께 유지해야 한다. [상태 Slot과 setter](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/hooks/useState.js)

setter는 DOM을 직접 고치지 않는다. 값을 바꾼 뒤 `scheduleUpdate()`를 호출하며, 자식의 갱신도 `rootOwner`에 예약한다. microtask 모드에서는 이미 유효한 예약이 있으면 다시 예약하지 않는다. 콜백이 기억한 token과 현재 `scheduledUpdate`가 다르거나 취소된 경우에는 오래된 예약을 실행하지 않는다. 이로써 같은 동기 구간의 여러 상태 갱신을 한 번의 update로 묶는다. 실행을 시작한 render·diff·patch를 우선순위에 따라 중단하는 스케줄러는 아니다. [갱신 예약과 취소](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/scheduleUpdate.js)

`useMemo()`는 렌더 중 계산 결과를 Hook Slot에 보관해 재사용하고, `useEffect()`는 DOM 반영 뒤 실행할 작업을 등록한다. 두 Hook은 의존값 배열인 `deps`를 사용한다. 의존값 비교와 Effect의 등록·cleanup은 [Effect](/wiki/frontend-effect-4cf810ca362a/)에서 이어진다. [Memo 계산](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/hooks/useMemo.js)

## 외부의 변화가 컴포넌트 입력이 되기까지

네트워크 응답이나 브라우저 이벤트가 도착해도, 그 사실만으로 컴포넌트의 props가 자동 변경되지는 않는다. 이벤트를 받은 코드가 상태 setter를 호출하거나 외부 앱 API로 새 입력을 전달해야 한다. 이 카드 앱은 응답을 상태에 저장하고 Memo로 파생값을 계산한다. 부모가 새 상태로 렌더되면 자식에게 전달하는 props도 새로 계산된다. `useMemo()`는 그 렌더에서 파생값을 재사용할 뿐, 외부 변화를 구독하거나 렌더를 예약하는 기능을 대신하지 않는다.

이 런타임의 `app.updateProps(nextProps)`는 mount 이후에만 호출할 수 있으며, 내부 `update()`에 새 객체를 전달한다. 반면 `runtimeBridge.publish()`는 Inspector 구독자에게 snapshot을 알리는 관찰 경로다. 모든 외부 데이터 변경을 앱 상태로 바꾸는 범용 Store 구독이라고 해석하면 안 된다. [외부 props 전달](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/createApp.js#L54)

이 버전은 컴포넌트마다 Hook 상태를 보관한다. 초기 버전의 루트 전용 제약을 현재 구현에 적용하면 자식의 상태 수명을 잘못 읽게 된다. 공식 API의 역할과 이 학습 런타임에서 확장해야 할 부분은 [Hooks](/wiki/frontend-hooks-5f0c93de5131/)에 정리한다.

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
