---
layout: default
title: 컴포넌트 렌더링
nav_order: 9
permalink: /wiki/frontend-topic-556b062c7529/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/frontend-topic-556b062c7529
projection_sha256: 734b921ab14ac5ccd3747d4c507d829271207f8603283da37621f7908687382a
parent: React
content_status: ready
public_parent_id: Wiki/keywords/frontend-react-8bebe766ebac
grand_parent: 프론트엔드
---

# 컴포넌트 렌더링
{: .no_toc }

컴포넌트 렌더링은 상태에서 화면의 구조를 계산하고 그 차이를 DOM에 반영하는 과정이다. `lrn-react`의 작은 UI 런타임을 예로 들면 항목의 정체성, 상태 저장, 화면 갱신이 각각 어떤 역할을 하는지 구분할 수 있다.

## 카드 순서가 바뀌어도 같은 항목을 찾아가기

카드 A와 B의 순서가 바뀌었을 때 위치만 비교하면 첫 번째 자리에 있던 DOM을 다른 카드의 내용으로 바꾸게 된다. 안정된 key를 비교하면 같은 카드가 이동한 것으로 처리할 수 있다. `lrn-react`의 옛 diff 안내는 key가 있는 형제 집합은 key를 사용하고, 없는 경우 위치로 비교하는 `auto` 방식과 비교용 `index`·`keyed` 방식을 설명한다. key는 형제 집합 안의 정체성이지 모든 트리에서 공통으로 쓰는 번호가 아니다.

`h()`는 화면을 VNode 객체로 만들고 함수형 자식은 resolver에서 일반 노드로 전개된다. diff는 두 VNode 사이의 텍스트·속성·이벤트·자식 추가/삭제/이동을 patch 목록으로 만든다. renderer는 그 목록을 DOM 변경으로 실행한다. 필요한 부분을 갱신한다는 설명은 가능한 모든 경우에 patch 개수가 수학적으로 최소라는 보장은 아니다. [React 유사 Virtual DOM 시스템의 Diff 알고리즘 설명서 · 5e9a60f](https://github.com/woonyong-kr/lrn-react/blob/5e9a60f126cc1a2f6ad8df31c7db0f5a59fb929e/archive/v1/guides/diff-algorithm-guide.md) [VDOM, Resolver, Diff, Patch 설명 · 5e9a60f](https://github.com/woonyong-kr/lrn-react/blob/5e9a60f126cc1a2f6ad8df31c7db0f5a59fb929e/learning-docs/renderer-and-vdom.md)

## 상태 저장과 DOM 반영 사이의 책임

원본 런타임 안내에서 `useState`의 setter는 DOM을 직접 고치지 않고 저장된 값을 바꾼 뒤 update를 예약한다. 렌더 중 dispatcher는 현재 Hook의 주인을 가리키며 슬롯 순서로 상태를 찾는다. 따라서 Hook 호출 순서와 컴포넌트 정체성을 함께 유지해야 한다.

DOM patch 뒤에는 effect를 commit한다. 의존성이 바뀐 effect를 다시 실행하기 전에 이전 cleanup을 호출하고, unmount에서도 자원 정리를 수행한다. 이벤트 핸들러 변경 역시 이전 리스너 제거와 새 리스너 등록을 구분해야 한다.

이 자료에는 초기 버전의 ‘루트에서만 Hook 허용’ 제약이 남아 있다. 이는 당시 설계의 한계이며 이후 학습 레포의 컴포넌트별 Hook 지원을 부정하는 현재 계약으로 옮기지 않는다. 이 문서는 자체 런타임을 통해 경계를 설명하며 React 전체 호환이나 React 내부 구현을 주장하지 않는다. [VDOM, Resolver, Diff, Patch 설명 · 5e9a60f](https://github.com/woonyong-kr/lrn-react/blob/5e9a60f126cc1a2f6ad8df31c7db0f5a59fb929e/learning-docs/renderer-and-vdom.md) [런타임 동작 설명 · 5e9a60f](https://github.com/woonyong-kr/lrn-react/blob/5e9a60f126cc1a2f6ad8df31c7db0f5a59fb929e/learning-docs/runtime-walkthrough.md)

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
