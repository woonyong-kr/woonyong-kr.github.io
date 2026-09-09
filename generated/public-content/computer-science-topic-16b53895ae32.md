---
layout: default
title: Chaining
nav_order: 4
permalink: /wiki/computer-science-topic-16b53895ae32/
publication_state: publish
has_toc: true
projection_id: Wiki/keywords/computer-science-topic-16b53895ae32
projection_sha256: 4ae6dbdfb38d40ba9b01c75bfd7d30f5d619e92d2d54b99ccc025bdbbfc7d8e4
parent: Hash Table
content_status: ready
public_parent_id: Wiki/keywords/computer-science-topic-c3f2953a97c2
search_terms:
- Chaining
- 연결 리스트
- malloc
- djb2
- strcmp
grand_parent: 자료구조
ancestor: CS
---

# Chaining
{: .no_toc }

서로 다른 키가 같은 Bucket으로 가더라도, 각 키와 값을 별도의 Node에 저장하면 둘을 구분할 수 있다. Chaining은 Bucket마다 여러 항목을 연결해 두고 그 안에서 실제 키를 비교하는 충돌 처리 방식이다.

## 같은 Bucket의 항목을 연결한다

아래 예제의 Hash Function은 문자열을 읽으며 `hash * 33 + 글자`를 누적한다. Bucket이 8개일 때 `cat`과 `act`는 모두 5번 Bucket으로 간다. Hash 값이나 Bucket 번호가 같다는 것만으로 같은 키라고 판단하지 않고 `strcmp()`로 문자열까지 비교해야 한다.

새 키를 넣을 때는 해당 Bucket의 연결을 먼저 읽는다. 같은 키가 있으면 값을 바꾸고, 없으면 Node를 새로 만든다. 새 Node는 기존 머리를 가리키게 하고 Bucket의 머리를 새 Node로 바꾼다. 연결을 붙이는 동작 자체는 O(1)이지만, 같은 키가 있는지 먼저 찾는 비용까지 O(1)이라고 단정할 수는 없다.

## C로 저장과 조회를 실행해 보기

이 예제는 고정된 Bucket 8개에서 문자열 키와 정수 값을 저장한다. 같은 키의 갱신, 존재하지 않는 키의 조회, 할당한 메모리 해제까지 실행한다. Bucket을 늘리는 재해싱은 포함하지 않는다.

```run-c
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define BUCKET_COUNT 8

struct node {
    char *key;
    int value;
    struct node *next;
};

static struct node *buckets[BUCKET_COUNT];

static unsigned long hash_key(const char *key) {
    unsigned long hash = 5381;
    while (*key != '\0') {
        hash = hash * 33 + (unsigned char)*key;
        ++key;
    }
    return hash;
}

static size_t bucket_index(const char *key) {
    return hash_key(key) % BUCKET_COUNT;
}

static int put(const char *key, int value) {
    size_t index = bucket_index(key);
    for (struct node *p = buckets[index]; p != NULL; p = p->next) {
        if (strcmp(p->key, key) == 0) {
            p->value = value;
            return 1;
        }
    }

    struct node *fresh = malloc(sizeof *fresh);
    if (fresh == NULL) return 0;
    fresh->key = malloc(strlen(key) + 1);
    if (fresh->key == NULL) {
        free(fresh);
        return 0;
    }
    strcpy(fresh->key, key);
    fresh->value = value;
    fresh->next = buckets[index];
    buckets[index] = fresh;
    return 1;
}

static int find(const char *key, int *result) {
    for (struct node *p = buckets[bucket_index(key)]; p != NULL; p = p->next) {
        if (strcmp(p->key, key) == 0) {
            *result = p->value;
            return 1;
        }
    }
    return 0;
}

static void clear(void) {
    for (size_t i = 0; i < BUCKET_COUNT; ++i) {
        while (buckets[i] != NULL) {
            struct node *old = buckets[i];
            buckets[i] = old->next;
            free(old->key);
            free(old);
        }
    }
}

int main(void) {
    if (!put("cat", 5) || !put("act", 9) || !put("cat", 7)) {
        clear();
        fprintf(stderr, "allocation failed\n");
        return EXIT_FAILURE;
    }
    printf("cat bucket: %zu, act bucket: %zu\n",
           bucket_index("cat"), bucket_index("act"));
    printf("chain:");
    for (struct node *p = buckets[bucket_index("cat")]; p != NULL; p = p->next)
        printf(" %s=%d", p->key, p->value);
    printf("\n");

    int value = 0;
    int found = find("cat", &value);
    assert(found && value == 7);
    printf("cat: %d\n", value);
    found = find("act", &value);
    assert(found && value == 9);
    printf("act: %d\n", value);
    found = find("dog", &value);
    assert(!found);
    printf("dog: missing\n");
    clear();
    assert(!find("cat", &value));
    return EXIT_SUCCESS;
}
```

5번 Bucket에는 `act=9`, `cat=7` 순서로 항목이 연결된다. `cat`을 다시 넣을 때 새 Node가 추가되는 대신 기존 값 5가 7로 바뀐다. 조회는 그 Bucket의 첫 Node부터 키를 대조하므로, 먼저 저장한 `cat`을 찾을 때는 `act`를 지나 다음 Node로 이동한다.

`hash_key()`는 문자열의 각 바이트를 Hash 값에 반영한다. `unsigned long`의 계산은 해당 타입의 범위에서 순환한다. 이 예시 함수가 모든 입력을 고르게 분산하거나 공격에 안전하다는 보장은 없다. Hash 계산과 Bucket 선택은 [Hash Function](/wiki/computer-science-topic-a4ead10ed55a/)에서 구분한다.

`malloc()`으로 Node와 키 사본을 따로 할당하므로 원래 문자열의 저장 공간과 수명을 그대로 빌리지 않는다. 할당 실패는 호출한 곳에 알리고, 종료할 때 `clear()`가 키 사본과 Node를 모두 해제한다. `fresh->next`와 Bucket의 머리가 연결되는 방식은 [Singly Linked List](/wiki/computer-science-topic-e00dfaa7306e/)와 같다.

`find()`의 반환값은 발견 여부이고 `result`는 찾은 정수 값을 돌려주는 별도 Pointer다. 값으로 0을 저장했더라도 존재하지 않는 키와 구분할 수 있다. 이처럼 반환값과 출력 인자를 나누는 방식은 [Pointer](/wiki/programming-languages-runtime-topic-ef71fd296666/)의 사용 예이기도 하다.

## 연결이 길어지면 조회도 길어진다

항목 수를 n, Bucket 수를 m이라고 하면 평균 연결 길이는 부하율 α = n/m과 관계가 있다. 키가 고르게 퍼지고 Hash 계산과 비교 비용을 상수로 볼 수 있는 조건에서 조회의 기대 비용은 O(1+α)다. 모든 키가 하나의 Bucket에 몰리면 최대 n개 Node를 읽는다. 긴 문자열 키라면 문자열을 Hash하고 비교하는 비용도 따로 고려해야 한다.

Chaining은 Bucket 바깥에 Node를 둘 수 있으므로 부하율이 1을 넘을 수 있다. 그렇다고 연결을 계속 늘려도 빠른 것은 아니다. Bucket 배열을 키워 항목을 다시 분산하면 평균 연결 길이를 줄일 수 있다. 반면 Node별 할당과 Pointer 추적에는 공간·접근 비용이 든다. 항목을 배열 안에 직접 저장하는 [개방 주소법](/wiki/computer-science-topic-beb55415c2d3/)은 이 비용과 다른 절충을 한다.
