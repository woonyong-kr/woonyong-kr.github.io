---
layout: default
title: Effect
nav_order: 6
permalink: /wiki/frontend-effect-4cf810ca362a/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/frontend-effect-4cf810ca362a
projection_sha256: aeaf209d1b8bd01398f76e3cfd008627ff6e2db3c03966a861a968cbe56bd043
parent: React
content_status: ready
public_parent_id: Wiki/keywords/frontend-react-8bebe766ebac
grand_parent: Frontend
---

# Effect
{: .no_toc }

컴포넌트가 새 화면을 계산하는 일과 타이머·이벤트 리스너·외부 Store를 연결하는 일은 서로 다른 수명을 가진다. Effect를 읽을 때는 어떤 값을 기준으로 연결을 다시 만들고, 이전 연결을 언제 정리하는지부터 살펴본다.

## 등록한 작업이 실행되기까지

`lrn-react`의 `0cfbd03` 버전에서 `useEffect()`는 렌더 중 작업을 등록하고 DOM 반영 뒤 commit 단계에서 실행한다. 의존값 배열은 길이와 각 원소의 `Object.is()` 결과로 비교한다. 객체 내부를 재귀적으로 비교하거나 콜백이 읽은 값을 자동으로 수집하지 않는다. [의존값 비교](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/areHookDepsEqual.js)

Effect의 실행 함수와 cleanup은 Slot에 저장하지만, 이번에 실행할 Slot의 인덱스는 `pendingEffects`에 따로 모은다. DOM patch 뒤의 commit 단계는 이 목록을 읽어 이전 cleanup, 새 Effect, 새 cleanup 저장 순서로 처리한다. unmount에서도 자원을 정리한다. [Effect 등록](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/hooks/useEffect.js), [Effect commit](https://github.com/woonyong-kr/lrn-react/blob/0cfbd0305bd6f260d5b41dec9c069fbbe32852bd/src/core/runtime/commitEffects.js)

이 과정은 [컴포넌트 렌더링](/wiki/frontend-topic-556b062c7529/)의 마지막 단계와 연결된다. 화면이 준비된 뒤 실행한다는 큰 순서가 같아도, React API별로 요구하는 세부 시점까지 같다고 볼 수는 없다.

## React의 Effect 시점과 구독 계약

`useLayoutEffect`는 브라우저가 다시 그리기 전 작업이며, `useInsertionEffect`는 다른 layout Effect가 실행되기 전에 스타일을 준비하기 위한 API다. `useInsertionEffect`는 DOM 변경 전후 어느 쪽에서도 실행될 수 있다. 구현을 확장하려면 현재의 commit queue와 별도로 어떤 시점에 작업을 실행할지 정해야 한다. [useInsertionEffect의 시점 제한](https://react.dev/reference/react/useInsertionEffect)

`useSyncExternalStore`는 구독 함수와 해제, 변경되지 않았을 때 재사용하는 snapshot, 갱신 도중 Store 버전의 일관성까지 다룬다. 단순한 `useEffect` 구독 예제가 그 계약 전체를 대신하지 않는다. [외부 Store 구독 계약](https://react.dev/reference/react/useSyncExternalStore)

`useEffectEvent`는 Effect에서 호출하는 로직이 최신 commit의 props·state를 읽게 한다. 의존값을 숨기는 용도나 임의의 자식에게 전달하는 이벤트 API가 아니다. 반환 함수의 참조는 렌더마다 바뀐다. 따라서 동일한 함수 참조를 유지하는 wrapper만으로 이 API를 구현할 수는 없다. Effect 또는 같은 컴포넌트의 다른 Effect Event 안에서 호출하는 범위와 최신 committed 값을 읽는 동작을 함께 지켜야 한다. [Effect Event의 호출 범위와 최신 값](https://react.dev/reference/react/useEffectEvent)
