---
layout: default
title: 경로 탐색
nav_order: 4
permalink: /wiki/computer-systems-network-topic-5cd65ddb9366/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-topic-5cd65ddb9366
projection_sha256: f4b93cd377a7709b0eb30f0d04b7fa3d138866df84f35988a06da23aa3a51173
parent: 파일 시스템 구현
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-c76b83867c50
grand_parent: PintOS
ancestor: CS
---

# 경로 탐색
{: .no_toc }

`work/data.csv`와 `other/data.csv`에 서로 다른 내용이 들어 있다면, `open("data.csv")`는 어느 파일을 열까? 답은 파일 이름만으로 정해지지 않는다. 경로 탐색을 시작한 디렉터리도 함께 알아야 한다.

이름 하나를 inode에 연결하는 [PintOS Directory](/wiki/computer-systems-network-topic-db92c0e5225c/)에서 더 나아가, 여기서는 상대 경로의 기준과 여러 디렉터리를 거치는 탐색을 살펴본다. Python 예제는 실제 실행 환경의 동작이며, PintOS 부분은 아직 하위 경로가 없는 저장소의 확장 설계다.

## 상대 경로의 시작점

하위 디렉터리가 있는 파일 시스템에서는 같은 `data.csv`도 어디에서 찾기 시작하느냐에 따라 다른 파일을 가리킨다. 상대 경로의 시작점이 되는 디렉터리를 작업 디렉터리, 또는 cwd라고 한다. `/`로 시작하는 절대 경로는 프로세스가 보는 루트에서 시작하고, 상대 경로는 cwd에서 시작한다.

아래 예제는 실행 환경의 임시 디렉터리에 두 파일을 만들고 실제로 읽는다. PintOS 실행이 아니라 Python을 실행하는 환경의 작업 디렉터리 동작을 확인한다. 작업이 끝나면 원래 cwd로 돌아가고 임시 파일을 제거한다.

```run-python
import os
from pathlib import Path
from tempfile import TemporaryDirectory

original_cwd = Path.cwd()
with TemporaryDirectory() as temporary:
    root = Path(temporary).resolve()
    work = root / "work"
    other = root / "other"
    work.mkdir()
    other.mkdir()
    (work / "data.csv").write_text("from work", encoding="utf-8")
    (other / "data.csv").write_text("from other", encoding="utf-8")
    absolute_file = work / "data.csv"
    try:
        os.chdir(work)
        print("work + relative:", Path("data.csv").read_text(encoding="utf-8"))
        os.chdir(other)
        print("other + relative:", Path("data.csv").read_text(encoding="utf-8"))
        print("other + absolute:", absolute_file.read_text(encoding="utf-8"))
    finally:
        os.chdir(original_cwd)
```

상대 경로는 cwd를 바꾸면 `from work`에서 `from other`로 결과가 달라진다. `absolute_file`은 절대 경로로 만들어 두었으므로 cwd를 바꾼 뒤에도 처음 파일을 읽는다. `chdir()`가 바꾸는 것은 파일 내용이나 이름이 아니라 이후 상대 경로 탐색의 기준이다.

Linux에서 cwd는 프로세스의 파일 시스템 상태에 속하며, 스레드들이 이를 공유할 수 있다. 따라서 `chdir()`를 어느 스레드에만 영향을 주는 지역 설정처럼 사용하지 않는다. 또한 경로 탐색은 문자열의 `/`를 나누는 것만으로 끝나지 않는다. 중간 항목이 디렉터리인지, 접근 권한이 있는지, Symbolic Link를 만나면 어디로 이어지는지를 파일 시스템 상태와 함께 판단한다. [Linux 경로 탐색](https://man7.org/linux/man-pages/man7/path_resolution.7.html)

## PintOS에 하위 경로를 추가하려면

현재 `filesys_open()`에는 cwd를 선택하거나 `/a/b/c.txt`를 구성 요소로 나누는 코드가 없다. 이름 전체를 루트에서 비교한다. 따라서 `/`가 들어 있다고 계층 탐색을 수행한다고 설명하면 구현보다 앞서 나간다.

하위 경로를 지원하는 구현에서는 먼저 `/a/b/c.txt`의 시작 디렉터리를 루트로 정한다. `a`를 찾아 디렉터리인지 확인하고 열며, 이어 그 안에서 `b`를 찾는다. 마지막 이름 `c.txt`는 `b` 안에서 찾는다. 상대 경로라면 같은 과정의 시작점만 cwd로 바뀐다.

이 과정을 넣으려면 다음 상태와 연산을 함께 설계해야 한다.

- inode가 일반 파일과 디렉터리 중 무엇을 나타내는지 구분한다. 파일을 중간 디렉터리처럼 열어 다음 이름을 찾지 않도록 한다.
- `.`은 현재 디렉터리, `..`는 부모를 뜻하도록 처리한다. 디렉터리 항목으로 저장하는 방식이라면 생성·삭제 시에도 이 관계를 유지하고 루트의 부모 경계를 정한다.
- 프로세스의 cwd를 열린 디렉터리 참조로 유지하고 `chdir()`에서 바꾼다. 프로세스를 만들거나 종료할 때 참조를 복제하고 닫는 수명도 함께 다룬다.
- 파일 생성·열기·삭제가 같은 경로 탐색 규칙을 사용하도록 한다. 생성에서는 마지막 이름이 아직 없을 수 있으므로, 부모 디렉터리 탐색과 마지막 항목 처리를 구분한다.
- 항목이 늘어나는 디렉터리는 저장 파일도 확장할 수 있어야 한다. 사용 중인 디렉터리나 비어 있지 않은 디렉터리의 삭제 조건도 정한다.

이는 현재 저장소에 이미 구현된 기능 목록이 아니라 기존 루트 검색을 확장할 때 필요한 설계다. 완성 여부는 경로별 성공·실패와 자원 정리를 실제 커널에서 확인해야 한다.

상대 경로가 예상과 다른 파일을 연다면 처음부터 문자열을 바꾸기보다 cwd와 중간 디렉터리를 순서대로 확인해 보자. 같은 이름이 다른 결과로 이어진 지점을 찾을 수 있다.
