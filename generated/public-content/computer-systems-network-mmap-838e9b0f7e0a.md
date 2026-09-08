---
layout: default
title: mmap
nav_order: 8
permalink: /wiki/computer-systems-network-mmap-838e9b0f7e0a/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-systems-network-mmap-838e9b0f7e0a
projection_sha256: 593b3b66353a48de7984e5494d6551a02b92d584b27781357a8e3c858f43f893
parent: 가상 메모리 구현
content_status: ready
public_parent_id: Wiki/keywords/computer-systems-network-topic-83f24986336f
search_terms:
- mmap
- munmap
- VM_FILE
- UNINIT
- file_backed_swap_in
- file_backed_swap_out
- page_read_bytes
- map_start
- Dirty Page
- QEMU
grand_parent: PintOS
ancestor: 시스템
---

# mmap
{: .no_toc }

PintOS의 `mmap()`은 파일의 일정 구간을 가상 주소에 연결한다. 매핑된 주소를 읽으면 파일에서 온 바이트가 보이고, 쓰기 가능한 매핑을 수정하면 해제나 Page 교체 과정에서 변경을 파일에 돌려준다. 프로그램이 `write()`를 호출하지 않아도 파일이 바뀔 수 있는 이유다.

이 문서는 `lrn-pintos`의 `5afaa6d` 코드에서 파일 매핑이 등록되고, 처음 접근되고, 해제되는 경로를 설명한다. 일반 OS의 공유 매핑과 private 매핑은 [메모리 매핑](/wiki/computer-systems-network-topic-aad7c9c2b57f/)에서 구분한다. PintOS의 인자는 `addr, length, writable, fd, offset`이며 Linux의 `prot`, `flags`를 그대로 받는 API가 아니다.

## 매핑을 등록할 때 파일을 모두 읽지 않는다

PintOS 사용자 프로그램에서 다음 호출은 파일 offset `0`부터 `6000`바이트를 주소 `0x10000000`에 연결한다. 아래 C 조각은 PintOS의 열린 File Descriptor와 사용자 프로그램 환경을 전제로 한다.

```c
char *p = mmap((void *) 0x10000000, 6000, 1, fd, 0);
if (p != MAP_FAILED) {
    p[5000] = 'X';
    munmap(p);
}
```

이 저장소에서 `MAP_FAILED`는 `NULL`이다. Linux의 `(void *) -1`과 혼동하지 않는다. `mmap()`의 성공은 주소와 backing 정보를 등록했다는 뜻이며, 모든 파일 Page를 RAM으로 읽었다는 뜻은 아니다.

호출은 `lib/user/syscall.c`의 `syscall5()`에서 `userprog/syscall.c`의 `SYS_MMAP` 분기로 들어간다. 커널의 `mmap()`은 `fd`를 `struct file *`로 바꾼 뒤 `do_mmap()`을 부른다. 현재 코드에는 `SYS_MMAP`, `SYS_MUNMAP`, `struct file_page`와 실제 Page 연산이 구현되어 있다. [현재 syscall 코드](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/userprog/syscall.c)

입력 검사는 두 곳에 나뉜다. 커널의 `mmap()`은 NULL 주소, 0 길이, 주소·offset의 Page 정렬, 음수 offset, Console fd, 주소 덧셈의 wraparound, Kernel 주소, 유효한 파일과 빈 파일 여부를 검사한다. `do_mmap()`은 예정된 각 Page의 주소를 SPT에서 찾아 기존 영역과 겹치는지 검사한다. 아직 Page Fault가 나지 않은 SPT Entry도 이미 점유된 주소이므로, Present PTE만 확인해서는 안 된다.

## 파일 위치를 기억하는 두 단계

등록 직후 Page의 현재 연산은 `VM_UNINIT`이고, 나중에 사용할 타입은 `VM_FILE`이다. `do_mmap()`은 각 Page에 `lazy_load_arg`를 만들고 `vm_alloc_page_with_initializer(VM_FILE, ..., lazy_load_file, aux)`로 등록한다.

| 정보 | 현재 코드의 필드 | 필요한 이유 |
|---|---|---|
| 연결된 파일 | `file` | Page를 다시 읽고 수정된 내용을 저장한다 |
| 파일 내 시작 위치 | `ofs` | 각 Page가 파일의 어느 구간인지 찾는다 |
| 파일에서 읽을 길이 | `page_read_bytes` | 마지막 Page에서 파일 끝을 넘지 않는다 |
| 0으로 채울 길이 | `page_zero_bytes` | 파일이 없는 Frame의 뒷부분을 초기화한다 |
| 매핑 시작 주소 | `map_start` | `munmap()`이 같은 매핑에 속한 Page만 제거한다 |

가상 주소와 쓰기 권한은 `struct page`의 `va`, `writable`에 있다. `struct file_page`에 `writable`이라는 필드가 따로 있는 것은 아니다.

현재 구현은 Page마다 `file_reopen()`으로 독립된 파일 참조를 보관한다. 원래 fd가 닫혀도 매핑이 파일에 접근할 수 있는 이유다. 여기서 참조를 다시 연다는 것은 파일 내용 전체를 복제한다는 뜻이 아니다. `struct file`과 inode의 관계는 [File Descriptor](/wiki/pintos-file-descriptors/)와 [inode](/wiki/computer-systems-network-topic-c76b83867c50/)에서 이어진다.

설계를 바꾸어 여러 Page가 하나의 매핑 객체와 파일 참조를 공유하게 할 수도 있다. 이 경우에는 마지막 참조가 사라질 때 파일을 닫도록 소유권을 관리해야 한다. 현재 방식은 각 Page의 정리가 단순한 대신 열린 파일 객체가 Page 수만큼 늘어난다. 어느 방식을 쓰든 fd Table의 포인터만 빌려 둔 채 매핑 수명을 보장할 수는 없다.

매핑 객체를 공유하는 설계에서는 Page 정리가 참조할 객체를 먼저 해제하지 않는다. Page마다 파일을 닫는 현재 방식과 매핑 객체가 한 번 닫는 방식을 섞으면 같은 참조를 중복으로 닫을 수 있다.

처음 접근하면 Page Fault 처리에서 SPT Entry를 찾고 `vm_do_claim_page()`로 Frame을 확보한다. 이 코드의 실제 순서는 Frame 연결, `pml4_set_page()`, `swap_in()`이다. 그 뒤 `uninit_initialize()`가 `file_backed_initializer()`를 호출하여 aux의 필드를 `page->file`로 옮기고, `lazy_load_file()`이 파일 바이트를 읽는다.

`file_backed_swap_in()`은 `file_read_at(file, kva, page_read_bytes, ofs)`로 읽고, 나머지를 `memset()`으로 0으로 채운다. `file_read_at()`은 파일의 현재 position을 이동하지 않으므로 매핑의 Page Fault가 다른 `read()`의 위치를 바꾸지 않는다. 이미 `VM_FILE`로 초기화된 Page가 다시 적재될 때는 aux 전환 없이 이 연산을 사용한다. [현재 file.c](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/vm/file.c), [현재 vm.c](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/vm/vm.c)

`page->uninit`, `page->anon`, `page->file`은 같은 Union 공간을 쓴다. 아직 UNINIT 연산이 필요한데 `page->file`에 먼저 값을 써 넣으면 callback이나 aux 포인터를 덮을 수 있다. 현재 `uninit_initialize()`는 callback과 aux를 지역 변수에 먼저 보관하고, 타입을 전환한 뒤 그 callback을 호출한다.

`file_backed_initializer()`는 aux를 별도 인자로 받지 않고 `page->uninit.aux`에서 지역 포인터로 꺼낸다. 이어서 `page->operations`를 바꾸고 파일 정보를 `page->file`로 옮긴다. Metadata를 옮기는 곳은 이 initializer이고, `lazy_load_file()`은 읽기를 시도한 뒤 aux 메모리를 해제한다.

실행 파일의 `load_segment()`도 파일·offset·read/zero 길이를 aux에 담지만, 현재 VM 코드에서는 목표 타입을 `VM_ANON`으로 등록한다. mmap의 `VM_FILE`처럼 나중에 원본 실행 파일로 쓰기를 돌려주는 Page가 아니다. 같은 초기 파일 읽기를 사용한다고 이후 backing과 정리 정책까지 같은 것은 아니다. [실행 파일 적재](/wiki/computer-systems-network-topic-a6a32eb78db0/)에서 이 차이를 다룬다.

## 6000바이트 파일의 마지막 Page

Page가 `4096`바이트이고 매핑 길이와 파일 길이가 모두 `6000`바이트라면 다음 두 구간이 생긴다.

| 가상 Page 시작 주소 | 파일 offset | 파일에서 읽는 바이트 | 0으로 채우는 바이트 |
|---|---:|---:|---:|
| `0x10000000` | 0 | 4096 | 0 |
| `0x10001000` | 4096 | 1904 | 2192 |

`p[5000]`의 주소는 `0x10001388`이다. 두 번째 Page 안에서는 `904 = 0x388`번째 위치이고, 파일 위치는 `4096 + 904 = 5000`이다. 다음 코드는 주소 계산과 파일 읽기·zero fill을 함께 실행한다. 실제 Page Fault 대신 두 번째 Frame을 `bytearray`로 만든다.

```run-python
page_size = 4096
base = 0x10000000
file_bytes = bytes(i % 256 for i in range(6000))
index = 5000

page_number, within_page = divmod(index, page_size)
page_base = base + page_number * page_size
file_offset = page_number * page_size
read_bytes = min(page_size, len(file_bytes) - file_offset)
zero_bytes = page_size - read_bytes
frame = bytearray(file_bytes[file_offset:file_offset + read_bytes])
frame.extend(bytes(zero_bytes))

print(f"접근 주소: {base + index:#x}, Page 시작: {page_base:#x}")
print(f"Page 내부: {within_page}, 파일 위치: {file_offset + within_page}")
print(f"파일 {read_bytes}B + zero fill {zero_bytes}B")
print(f"읽은 값: {frame[within_page]:#x}")
assert frame[within_page] == file_bytes[index] == 0x88
assert len(frame) == page_size
assert frame[read_bytes:] == bytes(zero_bytes)

# 매핑이 파일 중간에서 시작하면 파일 위치에 시작 offset을 더한다.
mapping_offset = 0x1000
second_page_file_offset = mapping_offset + page_number * page_size
access_file_offset = second_page_file_offset + within_page
print(f"매핑 시작 offset {mapping_offset:#x}: Page의 파일 offset {second_page_file_offset:#x}")
print(f"같은 p[5000]의 파일 위치: {access_file_offset:#x}")
assert access_file_offset == 0x2388
```

매핑을 수정한 뒤 파일로 되돌릴 때도 `page_read_bytes`만 쓴다. 위의 두 번째 Page에서는 `1904`바이트만 파일에 대응하며, 뒤의 `2192`바이트는 파일을 늘리는 내용이 아니다. 매핑 길이가 파일 길이보다 짧다면 그 길이도 함께 제한한다. 현재 `do_mmap()`은 남은 매핑 길이, Page 크기, 남은 파일 바이트 중 읽을 수 있는 양을 선택한다.

예제 끝에서 매핑 시작 offset을 `0x1000`으로 바꾸면 두 번째 Page의 파일 offset은 `0x2000`, `p[5000]`의 파일 위치는 `0x2388`이다. 이 경우에도 `4096 + 1904`바이트를 모두 파일에서 읽으려면 파일이 최소 `0x1000 + 6000 = 10096`바이트여야 한다. 파일 길이가 여전히 `6000`바이트라면 매핑 시작점 뒤에 남은 실제 파일 데이터는 `1904`바이트뿐이다. 매핑 길이와 파일 길이를 같은 값으로 놓고 시작 offset을 빠뜨리면 마지막 Page 계산이 틀어진다.

## Dirty Page를 구분해야 하는 이유

읽기만 한 Frame과 수정한 Frame을 같은 방식으로 파일에 쓰면 안 된다. 매핑을 읽은 뒤 일반 `write()`가 원본 파일을 바꿨는데, `munmap()`이 예전 Frame을 무조건 기록하면 새 파일 내용이 사라진다. `mmap-clean`은 바로 이 경우를 검사한다. [mmap-clean 테스트 소스](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/tests/vm/mmap-clean.c)

x86 PTE의 `PTE_D = 0x40`은 그 변환을 통한 쓰기가 있었음을 나타낸다. 예를 들어 `0x12345067`의 하위 Flag에는 Present `0x01`, Writable `0x02`, User `0x04`, Accessed `0x20`, Dirty `0x40`이 들어 있다. Dirty는 변경된 바이트 수나 원본과의 비교 결과가 아니다. 같은 값을 다시 써도 쓰기는 일어난다.

현재 `file_backed_swap_out()`은 Frame의 소유 Thread를 찾아 그 `pml4`에서 `page->va`의 Dirty Bit를 읽는다. 다른 프로세스의 Frame을 내보내는데 무조건 `thread_current()->pml4`를 검사하면 다른 Page Table을 볼 수 있다. 하나의 Frame에 여러 가상 주소가 연결되는 경우에도 어느 PTE를 통해 썼는지 구분해야 한다.

Dirty이고 파일에 대응하는 바이트가 있으면 `filesys_lock`을 잡고 `file_write_at()`을 호출한다. 요청한 길이를 모두 쓴 경우에만 Dirty Bit를 내린다. Short Write이면 `false`를 반환하여 성공으로 처리하지 않는다. 현재 구현은 여기서 `page->writable`을 다시 검사하는 대신, 매핑 권한과 Page Fault 처리에서 허용된 쓰기가 PTE에 기록되도록 한다. 읽기 전용 매핑에 쓰려는 접근은 정상적인 Dirty Page 생성 경로가 되어서는 안 된다.

다음 모델에서는 clean Frame을 저장하지 않아 파일의 새 내용이 유지되는 경우와, dirty Frame에서 마지막 Page의 유효 바이트만 저장하는 경우를 비교한다.

```run-python
page_size = 4096

def write_back(file_bytes, frame, offset, read_bytes, dirty):
    if not dirty or read_bytes == 0:
        return 0
    file_bytes[offset:offset + read_bytes] = frame[:read_bytes]
    return read_bytes

file_bytes = bytearray(b"old!")
clean_frame = bytearray(file_bytes) + bytearray(page_size - len(file_bytes))
file_bytes[:] = b"new!"  # 일반 write()에 대응하는 파일 변경
written = write_back(file_bytes, clean_frame, 0, 4, dirty=False)
print("clean Page:", written, "B 저장, 파일:", bytes(file_bytes))
assert file_bytes == b"new!"

file_bytes = bytearray(b"a" * 6000)
offset = 4096
read_bytes = 6000 - offset
frame = bytearray(file_bytes[offset:]) + bytearray(page_size - read_bytes)
frame[904] = ord("X")
frame[3000] = ord("Z")  # 파일 끝 뒤의 padding 수정
written = write_back(file_bytes, frame, offset, read_bytes, dirty=True)
print("dirty Page:", written, "B 저장, 파일 길이:", len(file_bytes))
print("파일 offset 5000:", chr(file_bytes[5000]))
assert written == 1904 and len(file_bytes) == 6000
assert file_bytes[5000] == ord("X") and ord("Z") not in file_bytes
```

이 모델의 `dirty` 인자는 PTE를 읽는 대신 직접 준 값이다. 실행 결과는 파일 경계와 덮어쓰기 정책을 보여 주며, Kernel의 Dirty 추적이나 저장 장치 내구성을 검증하지는 않는다.

## 해제와 Page 교체의 공통점, 다른 점

`do_munmap(addr)`은 SPT에서 Page를 하나씩 찾으며 `map_start == addr`인 동안만 제거한다. 연속된 주소에 다른 파일 매핑이 있어도 시작 주소가 다르면 순회가 멈춘다. 아직 접근하지 않은 `UNINIT(FILE)`은 aux의 `map_start`를 보고, 초기화된 `VM_FILE`은 `page->file.map_start`를 본다.

현재 연산 타입과 최종 Page 타입은 구분해야 한다. `page_get_type()`은 UNINIT의 경우 나중에 사용할 `page->uninit.type`을 반환한다. 따라서 `page_get_type(page) == VM_FILE`만으로는 `page->file`을 읽어도 되는지 알 수 없다. 실제 `destroy(page)`의 분기는 현재 `page->operations`가 정한다.

| 상태 | 현재 연산 타입 | Frame | 파일 정보와 정리 경로 |
|---|---|---|---|
| 접근하기 전 | `VM_UNINIT` | 없음 | aux를 읽고 `uninit_destroy()`로 정리한다 |
| 적재된 파일 Page | `VM_FILE` | 있음 | `page->file`을 읽고 Dirty이면 저장한다 |
| 교체되어 나간 파일 Page | `VM_FILE` | 없음 | 재적재를 위해 보관한 `page->file`의 참조를 정리한다 |

Frame이 없다는 조건만으로 UNINIT이라고 판단하면 세 번째 상태를 놓친다. 반대로 PTE만 지우고 SPT Entry를 남기면 다음 접근의 Page Fault가 매핑을 다시 살릴 수 있다. 해제는 주소 변환과 SPT의 등록 정보를 함께 정리해야 끝난다.

접근하지 않은 Page에는 저장할 Frame 바이트가 없다. `uninit_destroy()`가 열린 파일 참조와 aux를 정리하면 된다. 초기화된 Page는 `file_backed_destroy()`가 write-back을 시도하고 파일 참조를 닫는다. 실제 Frame 정리와 Page 메모리 해제는 바깥의 `vm_dealloc_page()`가 이어서 수행한다. 프로세스 종료 때도 SPT의 Page를 정리하는 경로가 사용된다.

파일 참조를 aux에서 `page->file`로 옮겼다면 aux를 해제하면서 그 파일까지 닫으면 안 된다. aux의 저장 공간은 버려도 파일 참조는 이후 Page-in과 write-back에 필요하다. 타입 전환 뒤에는 `page->uninit.aux`를 다시 읽지 않고, 각 상태의 소유자가 한 번씩 정리한다.

6000바이트 매핑에서 `p[0]`만 수정했다면 첫 번째 Page는 Dirty인 `VM_FILE`, 두 번째 Page는 아직 `VM_UNINIT`일 수 있다. 첫 번째는 파일의 앞 `4096`바이트를 저장할 수 있고, 두 번째는 Page 데이터 쓰기 없이 aux와 파일 참조를 정리한다. 같은 매핑 안에서도 실제 접근 여부에 따라 정리 경로가 다르다.

다음 실행 모델은 파일 참조와 aux 메모리의 수명을 센다. Dirty write-back은 앞의 예제에서 분리해 다뤘으므로 여기서는 소유권 이동만 표현한다.

```run-python
def lifecycle(access, evict=False):
    page = {"type": "UNINIT", "aux": {"file": "reopened-file"},
            "file": None, "resident": False}
    freed_aux = closed_file = 0

    if access:
        aux = page["aux"]
        page["file"] = aux["file"]  # 참조를 이동하며 다시 열지는 않는다.
        page["type"] = "FILE"
        page["aux"] = None
        freed_aux += 1
        page["resident"] = True
        if evict:
            page["resident"] = False
            assert page["file"] is not None  # 재적재를 위해 보존
            page["resident"] = True  # 같은 파일 참조로 다시 적재

    if page["type"] == "UNINIT":
        closed_file += 1
        page["aux"] = None
        freed_aux += 1
    else:
        closed_file += 1
        page["file"] = None
    page["resident"] = False
    assert freed_aux == closed_file == 1
    return freed_aux, closed_file

for label, accessed, evicted in [
    ("접근 없이 해제", False, False),
    ("첫 접근 후 해제", True, False),
    ("접근·교체·재적재 후 해제", True, True),
]:
    freed, closed = lifecycle(accessed, evicted)
    print(f"{label}: aux 해제 {freed}회, 파일 참조 닫기 {closed}회")
```

이 모델은 등록과 파일 읽기가 성공한 경로를 비교한다. 실제 구현의 초기화 실패 경로까지 보장하는 예제는 아니다. 현재 VM 빌드의 `process_exit()`은 `process_cleanup()`으로 SPT와 PML4를 정리한 뒤 실행 파일과 fd Table의 파일을 닫는다. SPT를 정리할 때는 write-back에 필요한 PML4가 아직 유효해야 한다.

Page 교체는 Page 자체를 없애는 일이 아니다. 현재 `vm_evict_frame()`은 `swap_out(page)`이 성공한 뒤 소유자의 PTE를 지우고 Page와 Frame의 연결을 끊는다. File-backed Page는 파일과 offset을 남겨 두었다가 다시 읽을 수 있다. Anonymous Page를 보존하는 [Swap](/wiki/computer-systems-network-swap-11630540adf8/) Slot과 구분한다.

현재 코드에서 확인되는 한계도 있다. Eviction은 `swap_out()` 실패 시 Frame 회수를 중단하지만, `file_backed_destroy()`는 그 반환값을 확인하지 않고 파일을 닫는다. 또한 `vm_do_claim_page()`는 PTE 설치 실패를 정리하지만, 뒤의 `swap_in()` 실패에는 같은 정리 분기가 없다. 두 실패 경로까지 정상이라고 단정할 수 없으며, 파일 쓰기·읽기 실패를 주입하는 검증이 별도로 필요하다. 이 문서의 코드 대조는 해당 실행 시험을 통과했다는 뜻이 아니다.

## 파일 offset에서 디스크 요청까지

write-back은 `file_write_at()` → `inode_write_at()` → `disk_write()`로 이어진다. mmap만을 위한 별도의 디스크 장치를 쓰는 것이 아니다. 전체 Sector를 바꾸면 직접 쓰고, 일부만 바꾸면 기존 Sector를 Bounce Buffer로 읽어 나머지 바이트를 보존한 뒤 쓴다.

기본 파일 시스템의 연속 할당에서 파일의 첫 데이터 Sector가 `200`이라고 가정하면, 파일 offset `4096`은 8개 Sector 뒤인 `208`이다. 아래 계산은 이 연속 할당 가정을 사용한다. Index나 FAT로 연결된 파일에는 실제 블록 조회를 대신할 수 없다.

```run-python
pte = 0x12345067
flags = {"Present": 0x01, "Writable": 0x02, "User": 0x04,
         "Accessed": 0x20, "Dirty": 0x40}
print("PTE:", ", ".join(name for name, mask in flags.items() if pte & mask))

first_sector = 200
file_offset = 4096
sector_delta, within_sector = divmod(file_offset, 512)
disk_sector = first_sector + sector_delta
backend_offset = disk_sector * 512
print(f"Disk Sector: {disk_sector}, Sector 내부: {within_sector}")
print(f"BlockBackend offset: {backend_offset} = {backend_offset:#x}")
assert disk_sector == 208 and backend_offset == 106496 == 0x1A000
assert pte & flags["Dirty"]
```

`disk_write()` 아래의 [IDE 컨트롤러](/wiki/ide-controller/)는 ATA PIO 명령 `0x30`과 데이터 전송을 처리한다. QEMU의 `ide_sector_write()`는 Guest Sector 번호를 `sector_num << 9`로 바꾸어 `blk_aio_pwritev()`에 전달한다. [BlockBackend](/wiki/qemu-block-backend/) 아래에서 Raw·qcow2 같은 이미지 형식과 Host I/O를 처리한다. `0x1A000`을 Host 파일의 실제 위치로 곧바로 읽을 수 있는지는 이미지 형식과 Raw offset 설정에 달려 있다.

QEMU의 TCG x86 MMU 구현에는 Store 접근에서 `PG_DIRTY_MASK`를 설정하는 코드가 있다. Guest의 Page Fault와 PTE 변경을 하드웨어 동작으로 재현하는 부분이다. 디스크 쪽에는 별도로 IDE와 Block I/O 경로가 있다. QEMU가 PintOS의 `struct file_page`나 “이 매핑을 지금 저장해야 한다”는 정책을 판단하는 것은 아니다. TCG의 함수 경로를 KVM 등 다른 가속 방식에도 그대로 적용하지 않는다. [QEMU v10.0.0 x86 MMU](https://github.com/qemu/qemu/blob/v10.0.0/target/i386/tcg/system/excp_helper.c)

접근하지 않은 Page의 aux 누수나 중복 close는 디스크 Trace만으로 확인하기 어렵다. 또한 Page 데이터의 write-back이 없다고 전체 디스크 쓰기가 없다고 단정해서도 안 된다. 기본 파일 시스템에서 이미 제거된 inode의 마지막 참조를 닫으면 `inode_close()`가 Sector를 반환하고, `free_map_release()`가 Bitmap을 기록한다. 이런 Metadata I/O는 mmap Page의 Dirty write-back과 별개의 원인이다. [공간 반환 코드](https://github.com/woonyong-kr/lrn-pintos/blob/5afaa6dc2f7e38f6178cc8fcecad8989518f2eb0/pintos/filesys/free-map.c)

Guest에서 파일 쓰기가 끝난 것과 Host 저장 장치에 변경이 안전하게 남은 것은 별도의 경계다. `munmap()`에서 `file_write_at()`이 성공했다는 이유만으로 전원 장애까지 견딘다고 해석하지 않는다. 그 아래의 완료 조건은 [fsync](/wiki/file-system-fsync/)에서 다룬다.

## 실행 중에는 어느 값을 볼까

PintOS Kernel을 GDB로 디버깅할 때는 함수마다 유효한 인자가 다르다. `syscall_handler()`에서 `f`가 유효한 상태라면 다음 Register가 호출 인자를 담는다.

```gdb
break syscall_handler
print/x f->R.rax
print/x f->R.rdi
print f->R.rsi
print f->R.rdx
print f->R.r10
print f->R.r8
```

`RAX`는 호출 번호이고, 순서대로 `RDI=addr`, `RSI=length`, `RDX=writable`, `R10=fd`, `R8=offset`이다. `print` 명령은 실제로 해당 중단점에서 멈춘 뒤 실행한다.

aux 전환은 `uninit_initialize()` 진입에서 먼저 `page->operations->type`을 확인하고, UNINIT 상태일 때만 `print *(struct lazy_load_arg *) page->uninit.aux`로 읽는다. `file_backed_initializer()`가 끝난 뒤에는 아래의 `page->file` 필드로 옮겨서 확인한다. 디버거가 두 Union 멤버를 모두 출력할 수 있어도 둘이 동시에 유효하다는 뜻은 아니다.

`file_backed_swap_out()`에서는 `page`가 유효한지, resident Frame이 있는지부터 확인한다. 다음 조회는 초기화된 `VM_FILE` Page이며 `page->frame`이 NULL이 아닐 때 사용한다.

```gdb
break file_backed_swap_out
print/x page->va
print page->operations->type
print page->file.ofs
print page->file.page_read_bytes
print page->file.page_zero_bytes
print/x page->file.map_start
print page->frame->owner_thread
x/32xb page->frame->kva
```

Dirty 값은 `pml4_is_dirty()` 내부의 `pte` 계산 뒤에서 확인하면 실행 중인 Kernel 함수를 GDB에서 직접 호출하지 않아도 된다. `file_write_at()`에 멈추면 인자 `file_ofs`, `size`, `buffer`를 확인하고, `disk_write()`에 멈추면 그 함수의 `sec_no`, `buffer`로 내려간 값을 확인한다. Guest GDB에서 QEMU의 `blk_aio_pwritev()`가 잡히지는 않는다. 그 중단점은 Debug Symbol이 있는 QEMU 프로세스에 붙인 Host Debugger에서 사용한다.

현재 저장소의 테스트 소스는 각기 다른 경계를 확인한다.

| 테스트 | 확인하는 동작 |
|---|---|
| `mmap-read` | 매핑으로 읽은 바이트와 파일 내용, 마지막 Page의 zero fill |
| `mmap-write` | 매핑을 수정한 뒤 해제했을 때 파일에 남는 내용 |
| `mmap-clean` | 수정하지 않은 Frame이 일반 파일 쓰기를 덮어쓰지 않는지 |
| `mmap-off`, `mmap-bad-off` | 0이 아닌 정렬된 파일 offset과 정렬되지 않은 offset |
| `mmap-close`, `mmap-remove` | fd를 닫거나 파일 이름을 제거한 뒤에도 매핑의 파일 참조가 유지되는지 |
| `mmap-unmap` | 해제한 영역의 SPT 등록까지 제거되어 이후 접근이 허용되지 않는지 |
| `mmap-exit` | 명시적 `munmap()` 없이 종료해도 변경이 기록되는지 |
| `swap-file` | 파일 기반 Page를 메모리 압박 아래에서 교체해도 내용이 유지되는지 |

저장소 루트에서, x86-64 Linux와 PintOS용 Compiler·QEMU가 준비된 환경이라면 다음처럼 VM 테스트를 선택할 수 있다. 웹의 Python 실행기는 이 Kernel 테스트 환경을 대신하지 않는다.

```bash
make -C pintos/vm check TESTS='tests/vm/mmap-read tests/vm/mmap-write tests/vm/mmap-clean tests/vm/mmap-off tests/vm/mmap-bad-off tests/vm/mmap-close tests/vm/mmap-remove tests/vm/mmap-unmap tests/vm/mmap-exit tests/vm/swap-file'
```

위 명령은 재현할 테스트 범위를 제시한다. 이 글에서 직접 실행한 것은 Python 모델이며, 이 명령의 실행 결과나 QEMU 디버깅 화면을 측정 결과로 제시한 것은 아니다. 과제의 요구사항과 코드의 실제 구현, 실행으로 확인한 결과를 구분해서 읽는다. [KAIST PintOS Memory Mapped Files](https://casys-kaist.github.io/pintos-kaist/project3/memory_mapped_files.html)
