var e=`장애 원인 판정 규칙을 코드에 쓰면, 원인 하나를 추가할 때마다 배포를 해야 합니다. 판정 로직과 판정 지식이 한 파일에 섞여서, 뭘 근거로 판정하는지가 코드를 읽는 사람에게만 보입니다.

그래서 지식과 엔진을 분리했습니다.

\`\`\`
catalog/*.yaml   무엇을 보고 어떤 원인이라 하는가  (규칙 29종 · 원인 후보 87종)
engine.py        규칙을 어떻게 적용하는가
signals.py       근거에서 신호를 어떻게 추출하는가
\`\`\`

## 규칙의 생김새

CrashLoopBackOff 장애에서 OOM 을 판정하는 규칙입니다.

\`\`\`yaml
- candidate_id: "oom_killed"
  expected_evidence: ["kubernetes:cluster_resource_state", "logs:related_logs"]
  signals:
    - id: "oom_evidence"
      any_of:
        - fact: "terminated_reason=OOMKilled"
        - fact: "exit_code=137"
        - log_pattern: "out of memory"
\`\`\`

핵심 규칙은 하나입니다. **선언된 신호 그룹이 전부 충족돼야 확정 점수(1.0)에 도달합니다.** 증거 파일이 존재한다는 것만으로는 어떤 후보도 확정되지 않습니다.

## 엔진이 맞는지는 어떻게 아는가

규칙 87종을 만들고 나면 질문이 남습니다. 이게 진짜 맞게 판정하나.

카탈로그를 역산해 검증 시나리오를 자동 생성했습니다. 후보마다 그 후보의 신호를 담은 장애 상황 1개(87개), 규칙마다 신호가 없는 정상 상황 1개(29개), 합쳐 116개입니다. 각 시나리오를 실제 판정 경로에 넣고 채점합니다.

첫 측정 결과입니다.

\`\`\`
accuracy:       82/87 = 94.3%
false positive:  0/29 = 0.0%
\`\`\`

## 틀린 5건이 전부 결함이었다

5건을 추적하니 패턴이 하나였습니다. **넓은 패턴이 형제 후보의 좁은 신호를 삼키고 있었습니다.**

- \`upstream_status:500\` 로그가 형제 후보의 \`"upstream"\` 패턴에도 걸림
- \`untolerated taint\` 이벤트가 형제 후보의 \`"taint"\` 패턴에도 걸림
- \`ExternalSecret\` 이벤트가 형제 후보의 \`"secret"\` 패턴에도 걸림

둘 다 확정 점수 1.0 이 되고, 동점이면 **먼저 선언된 후보가 이기는** 구조였습니다. 판정 결과가 규칙의 내용이 아니라 파일 안 순서에 달려 있던 겁니다.

패턴을 실제 오류 문구로 좁히고(\`"no healthy upstream"\` 등), 릴리스 회귀 후보에는 배포 변경 신호를 추가하고, 엔진의 동점 처리를 "판별 신호를 더 많이 충족한 후보 우선" 으로 바꿨습니다.

\`\`\`
수정 후: accuracy 87/87 = 100.0%, false positive 0/29 = 0.0%
\`\`\`

## 확인할 수 있는 것

\`\`\`bash
uv run python evals/build_golden_set.py
uv run python evals/run_eval.py
\`\`\`

- 카탈로그: \`src/services/ai/agent/causes/catalog/\`
- 엔진 · 신호: \`src/services/ai/agent/causes/engine.py\`, \`signals.py\`
- 측정 결과 원본: \`evals/results.md\` — coverage 100.0% (116/116) 가 기록돼 있습니다
- 수정 커밋: "평가로 찾은 규칙 판별 결함 5건 개선"

## 한계

시나리오는 합성입니다. 후보마다 첫 번째 신호 경로만 검증하고, 신호 여러 개가 동시에 뜨는 실전 노이즈는 없습니다. 100% 는 "카탈로그의 판정 경로가 설계대로 동작한다" 는 뜻이지 실제 장애에서의 정확도가 아닙니다. 그건 실전 데이터가 쌓여야 잴 수 있습니다.

규칙이 매칭하지 못한 장애를 어떻게 처리하는지는 다음 글 [LLM 에게 정답 대신 후보를 시키기](#/posts/llm-fallback) 에 있습니다.`;export{e as default};