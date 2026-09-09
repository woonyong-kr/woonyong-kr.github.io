---
layout: default
title: Hooks
nav_order: 5
permalink: /wiki/frontend-hooks-5f0c93de5131/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/frontend-hooks-5f0c93de5131
projection_sha256: fb82f48449a8eb7a33cf4a813a0f786ef88b34d023c5a73b452afda891447a7d
parent: React
content_status: ready
public_parent_id: Wiki/keywords/frontend-react-8bebe766ebac
grand_parent: Frontend
---

# Hooks
{: .no_toc }

컴포넌트 함수는 렌더할 때 다시 실행된다. 그런데 입력한 값이나 연결해 둔 외부 시스템은 함수 호출이 끝난 뒤에도 이어져야 한다. Hooks는 이런 상태와 수명에 컴포넌트 코드를 연결하는 API다.

## 필요한 역할에 따라 고르기

React 19.2의 API는 값을 기억하는 일, 외부 시스템과 연결하는 일, 갱신의 우선순위를 정하는 일을 나누어 제공한다.

| 필요한 일 | React API |
|---|---|
| 값을 기억하고 갱신하기 | `useState`, `useReducer` |
| 상위 Provider의 값 읽기 | `useContext` |
| 렌더와 별도로 값 보관·명령형 접근 노출 | `useRef`, `useImperativeHandle` |
| 외부 시스템과 연결·정리 | `useEffect` |
| 페인트 전 레이아웃 작업·CSS 삽입 시점 구분 | `useLayoutEffect`, `useInsertionEffect` |
| Effect에서 호출하는 비반응형 로직 분리 | `useEffectEvent` |
| 계산 결과·함수 참조 재사용 | `useMemo`, `useCallback` |
| 긴급하지 않은 갱신·표시값 지연 | `useTransition`, `useDeferredValue` |
| 외부 Store snapshot 구독 | `useSyncExternalStore` |
| 낙관적 표시·Action의 상태 관리 | `useOptimistic`, `useActionState` |
| 접근성 연결 ID·개발 도구 표시 | `useId`, `useDebugValue` |

[React의 기본 Hook 목록](https://react.dev/reference/react/hooks)과 별도로, 브라우저용 `react-dom`에는 Form의 제출 상태를 읽는 `useFormStatus`가 있다. 또한 `use(resource)`는 Promise나 Context를 읽는 API이며, 일반 Hook의 호출 규칙과 완전히 같지 않다. 조건문·반복문 안에서도 쓸 수 있지만 컴포넌트나 Hook 안에서 호출해야 한다. [React DOM Hook](https://react.dev/reference/react-dom/hooks), [use API](https://react.dev/reference/react/use)

## 작은 런타임에서 같은 계약을 만들려면

`lrn-react`의 `0cfbd03` 버전에서 확인한 Hook은 `useState`, `useEffect`, `useMemo`다. 컴포넌트의 `hooks` 배열에 상태를 보관하고 매 렌더마다 cursor를 처음으로 되돌린다. 이 구조를 읽을 때는 API의 이름보다 그 API가 보장할 상태 수명과 갱신 경로를 먼저 정해야 한다. 이미 구현된 렌더 경로는 [컴포넌트 렌더링](/wiki/frontend-topic-556b062c7529/)에서 확인할 수 있다.

자체 런타임을 확장한다면 저장과 계산 원리부터 비교할 수 있다. `useRef`는 렌더를 예약하지 않는 지속 객체, `useReducer`는 현재 상태에 action과 reducer를 적용하는 갱신 경로, `useCallback`은 의존값이 같을 때 함수 값을 재사용하는 형태로 작은 원형을 설계할 수 있다. `useDebugValue`에는 Inspector로 값을 전달하는 계약이, `useId`에는 루트·컴포넌트 수명에 걸친 ID 관리가 필요하다. 목록의 key는 데이터 자체의 정체성에서 정해야 하므로 `useId`로 생성하지 않는다.

`useContext`에는 Provider 탐색과 값 변경 전파가 필요하고, `useImperativeHandle`에는 ref의 연결·교체·해제 시점을 정해야 한다. 컴포넌트별 Hook 저장소에 더해 이런 관계와 수명을 추적할 상태가 필요하다.

`useTransition`·`useDeferredValue`에는 긴급한 갱신을 우선하고 진행 중인 작업을 다시 시작할 수 있는 스케줄링이 필요하다. 현재의 microtask batching은 같은 동기 구간의 갱신을 묶지만, 실행 중인 작업을 중단하고 우선순위를 바꾸지는 않는다. `useOptimistic`·`useActionState`에는 요청 진행·결과·실패와 상태를 맞추는 추가 규칙이 필요하다.

Effect의 실행 시점과 외부 Store 구독은 [Effect](/wiki/frontend-effect-4cf810ca362a/)에서 이어진다. 컴포넌트별 배열이 있다는 사실만으로 React의 모든 Hook 계약을 충족하지는 않는다. 위 확장안은 기존 코드를 바탕으로 비교한 설계이며, 구현·실행을 마친 기능 목록은 아니다.
