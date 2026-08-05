var e=`Strict 2PL 로 행 잠금을 걸면 더티 리드와 갱신 유실은 막힙니다. 그런데 이런 시나리오가 남습니다.

\`\`\`
T1: SELECT ... WHERE id BETWEEN 10 AND 20     → 3행
T2: INSERT id=15                              → 커밋
T1: 같은 질의를 다시 실행                      → 4행
\`\`\`

T1 은 아무 행도 놓치지 않고 잠갔습니다. 문제는 **아직 존재하지 않는 행은 잠글 수 없다**는 것입니다. 새로 태어난 행이 잠금 사이로 걸어 들어옵니다. 그래서 유령(Phantom)입니다.

## 없는 행 대신 구간을 잠근다

행 잠금과 별도로 구간 잠금을 뒀습니다.

\`\`\`
Row Lock    해시 테이블      id 하나를 잠금
Range Lock  연결 리스트      [low, high] 구간을 잠금
\`\`\`

충돌 판정은 세 조합입니다. Row 대 Row 는 같은 id 인지, Row 대 Range 는 id 가 구간 안인지, Range 대 Range 는 두 구간이 겹치는지. T2 의 \`INSERT id=15\` 는 T1 이 잡은 \`[10, 20]\` 구간과 충돌하므로 T1 이 끝날 때까지 대기합니다.

## 교착은 시간으로 끊는다

잠금이 서로를 기다리면 교착입니다. 대기 그래프로 탐지하는 대신 3초 제한을 뒀습니다. 정확한 해법은 아니지만 시스템이 멈추지는 않고, 교육 구현의 복잡도 예산 안에서 감당이 됩니다. 무엇을 안 만들지 정하는 것도 설계라서, 이 선택은 README 에 그대로 적어 뒀습니다.

## 실제 DB 와의 거리

Range Lock 은 연결 리스트 순회라 구간이 많아지면 판정이 느려집니다. 실제 DB 가 쓰는 Next-Key Lock(인덱스 간격 잠금)과의 구조 비교는 글로만 정리했고 구현은 하지 않았습니다.

충돌 판정 세 조합은 [\`lock_table.c\`](https://github.com/woonyong-kr/minidb/blob/main/src/server/lock_table.c) 에, 3초 타임아웃은 [\`db.c\`](https://github.com/woonyong-kr/minidb/blob/main/src/db.c) 에, 동시 트랜잭션 시나리오는 \`tests/\` 에 있습니다.`;export{e as default};