var e=`우선순위 스케줄러는 "가장 급한 스레드를 먼저 돌린다" 는 약속입니다. 락 하나가 이 약속을 깰 수 있습니다.

\`\`\`
L(낮음) 이 락을 잡음
H(높음) 이 같은 락을 요청 → 대기
M(중간) 이 실행됨 → L 이 CPU 를 못 받음 → 락이 안 풀림
결과: 중간이 높음을 무기한 막음. 우선순위가 뒤집혔다
\`\`\`

이론 문제가 아닙니다. 1997년 화성 탐사선 Pathfinder 가 이 문제로 반복 리셋됐고, 지구에서 우선순위 상속을 켜는 패치를 올려 살렸습니다.

## Donation: 우선순위를 빌려준다

높은 스레드가 락을 기다리게 되면, **자기 우선순위를 락 소유자에게 빌려줍니다.** 위 상황에서 L 은 잠시 H 의 우선순위로 실행되어 M 에게 밀리지 않고, 락을 놓는 즉시 원래 우선순위로 돌아옵니다.

구현에서 어려운 건 단순 기부가 아니라 두 가지였습니다.

**사슬 전파.** H 가 기다리는 락을 L1 이 잡고 있는데, L1 은 또 L2 의 락을 기다리는 중이면, 기부는 L1 을 지나 L2 까지 흘러야 합니다. 한 단계만 기부하면 사슬 어딘가에서 다시 역전이 생깁니다.

**반납 계산.** 스레드는 락을 여러 개 쥘 수 있고 락마다 기부자가 다릅니다. 락 하나를 놓을 때 **그 락 때문에 받은 기부만** 사라져야 합니다. 그래서 기부를 통째 덮어쓰지 않고 목록(\`donation_list\`)으로 들고, 락을 놓을 때마다 남은 기부 중 최댓값으로 유효 우선순위를 다시 계산합니다.

\`\`\`
유효 우선순위 = max(자기 우선순위, 남아 있는 기부들의 최댓값)
\`\`\`

## 사슬은 어디까지 흐르나

\`priority-donate-chain\` 테스트는 이 사슬을 7단계까지 세웁니다. 스레드 7이 락 6을, 6이 5를 … 1이 락 0을 기다리고, main 이 락 0을 쥔 상태 — 기부가 한 단계라도 끊기면 main 의 우선순위가 오르지 않아 전체가 멈춥니다. 테스트의 기대 출력이 그 전파를 단계별로 검사합니다.

\`\`\`
main should have priority 3.  Actual priority: 3.
main should have priority 6.  Actual priority: 6.
...
main should have priority 21. Actual priority: 21.
\`\`\`

기부가 실제로 들어가는 지점은 두 줄입니다. 기다리게 된 스레드가 자신을 락 소유자의 기부 목록에 정렬 삽입하고, 어떤 락을 기다리는지 기록합니다.

\`\`\`c
list_insert_ordered(&holder->donation_list, &curr->donation_elem,
                    thread_priority_donation_elem, NULL);
curr->waiting_lock = lock;
\`\`\`

## 락에만 넣은 것도 선택이었다

Donation 은 락에만 적용했습니다. 기부는 "이 자원을 쥔 소유자" 가 명확할 때 성립하는데, 세마포어는 소유자 개념이 없어 대기열의 우선순위 정렬까지만 다뤘습니다. 또 다른 해법인 우선순위 상한(Priority Ceiling)과의 비교는 구현하지 않았습니다.

기부 목록과 유효 우선순위 재계산은 [\`thread.c\`](https://github.com/woonyong-kr/pintos/blob/main/pintos/threads/thread.c) 에, 획득 · 해제 경로의 전파는 [\`synch.c\`](https://github.com/woonyong-kr/pintos/blob/main/pintos/threads/synch.c) 에 있고, 7단계 사슬은 \`tests/threads/priority-donate-chain\` 이 기대 출력으로 검사합니다.`;export{e as default};