var e=`다누리 XR 엔진은 C++ 로 만들어진 개발 중인 엔진이었습니다. 콘텐츠를 만드는 협업사 열 곳이 그 위에서 작업했고, 엔진 인터페이스는 계속 바뀌었습니다. 콘텐츠가 엔진 API 를 직접 쓰면 엔진이 바뀔 때마다 따라 깨집니다.

그래서 그 사이에 C# 프레임워크 계층을 만들었습니다. 설계 기준은 하나였습니다 — **콘텐츠 개발자가 이미 아는 모양으로 만들 것.** 대부분 Unity 를 써 본 사람들이었으니, Unity 와 같은 어휘를 쓰면 배우는 비용이 사라집니다.

## 생명주기 — 익숙한 여섯 개의 훅

액터는 \`OnCreate\` → \`OnEnable\` → \`Update\` / \`LateUpdate\` → \`OnDisable\` → \`OnDestroy\` 로 살고 죽습니다. 실제 코드는 이렇게 생겼습니다.

\`\`\`csharp
public override int OnCreate()
{
    base.OnCreate();
    ...
    JEventHandler.ExecuteEvent(Evnet.OnCreateJActor, this);
}

public override int OnDestroy()
{
    base.OnDestroy();
    ...
    JEventHandler.ExecuteEvent(Evnet.OnDestroyJActor, this);
}
\`\`\`

생성과 파괴가 이벤트 허브(\`JEventHandler\`)로 브로드캐스트되므로, 다른 시스템이 액터의 탄생과 죽음을 구독할 수 있습니다. 컴포넌트 검색도 Unity 와 같은 문법입니다.

\`\`\`csharp
public static T GetComponent<T>(this Container container)
    where T : ContainerComponent
{
    return container.GetComponent(typeof(T)) as T;
}
\`\`\`

## 코루틴 — 60줄짜리 실행기

씬 전환처럼 여러 프레임에 걸치는 흐름은 코루틴으로 씁니다. C# \`IEnumerator\` 위에 직접 만든 실행기의 핵심은 이 두 함수입니다.

\`\`\`csharp
public void Update(float deltaTime)
{
    for (int i = 0; i < _routines.Count; i++)
    {
        if (_delays[i] > 0f)
            _delays[i] -= deltaTime;
        else if (_routines[i] == null || !MoveNext(_routines[i], i))
        {
            _routines.RemoveAt(i);
            _delays.RemoveAt(i--);
        }
    }
}

bool MoveNext(IEnumerator routine, int index)
{
    if (routine.Current is IEnumerator)          // 중첩 코루틴
    {
        if (MoveNext((IEnumerator)routine.Current, index))
            return true;
        _delays[index] = 0f;
    }

    bool result = routine.MoveNext();

    if (routine.Current is float)                // yield return 1.5f = 1.5초 대기
        _delays[index] = (float)routine.Current;

    return result;
}
\`\`\`

\`yield return\` 으로 float 를 내면 그만큼 기다리고, \`IEnumerator\` 를 내면 자식 코루틴이 끝날 때까지 재귀로 돌립니다. 씬 진입 · 종료 연출이 이 위에서 단계별로 진행됩니다.

## 이벤트 — 시스템을 잇는 허브

\`JEventHandler\` 는 문자열 키 델리게이트 허브, \`JScheduler\` 는 예약 실행과 배속 조절을 맡습니다. 시스템끼리 서로를 직접 참조하지 않고 이벤트로만 잇는 구조 — 나중에 [Kyro 에서 서비스 40여 개를 이벤트로만 통신하게 설계](#/posts/event-stream)했을 때, 규모만 달랐지 같은 원칙이었습니다.

## 코드가 근거다

이 코드는 [dx_framework](https://github.com/woonyong-kr/dx_framework)에 공개돼 있습니다. 콘텐츠 저장소는 독립 대표 프로젝트가 아니라 프레임워크의 소비 계층이어서 비공개로 보존합니다. 공개 저장소 안의 \`JFbx\`, \`JWidget\`, \`JPanel\`, \`JUICamera\`에서도 생명주기와 \`GetComponent<T>\` 사용 경로를 확인할 수 있습니다. git 이력은 뒤늦게 통째로 올린 것이라 커밋 수는 근거가 되지 않습니다 — 코드가 근거입니다.

한계도 그대로 적습니다. 이 실행기는 단일 스레드 전제이고, 예외 전파와 취소 토큰 같은 현대적 장치가 없습니다. Unity 라는 원형을 흉내 낸 설계라 독창성을 주장할 물건도 아닙니다. 다만 **엔진이 흔들려도 콘텐츠가 깨지지 않는 한 겹**이라는 목적은 이뤘습니다.`;export{e as default};