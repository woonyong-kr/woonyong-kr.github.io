#!/usr/bin/env bash

set -euo pipefail

THEME_REPO_URL="${THEME_REPO_URL:-https://github.com/woonyong-kr/jekyll-theme-velog.git}"
THEME_REMOTE="${THEME_REMOTE:-theme}"
THEME_BRANCH="${THEME_BRANCH:-main}"
BASE_BRANCH="${BASE_BRANCH:-main}"
SYNC_BRANCH="${SYNC_BRANCH:-sync/theme-updates}"
PR_TITLE="${PR_TITLE:-chore: sync theme updates from jekyll-theme-velog}"
GH_REPO="${GITHUB_REPOSITORY:-woonyong-kr/woonyong-kr.github.io}"
GH_OWNER="${GH_REPO%%/*}"
DRY_RUN="${DRY_RUN:-0}"

PRESERVED_PATHS=(
  "CNAME"
  "README.md"
  "_config.yml"
  "_data/profile.yml"
  "_data/theme.yml"
  "about.md"
  "_posts"
  "_drafts"
  "assets/images/profile.svg"
  "assets/images/favicon.png"
  "assets/images/posts"
)

is_preserved_path() {
  local path="$1"

  case "$path" in
    CNAME|README.md|_config.yml|_data/profile.yml|_data/theme.yml|about.md|assets/images/profile.svg|assets/images/favicon.png)
      return 0
      ;;
    _posts|_posts/*|_drafts|_drafts/*|assets/images/posts|assets/images/posts/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

restore_preserved_path() {
  local path="$1"

  if git cat-file -e "origin/${BASE_BRANCH}:${path}" 2>/dev/null; then
    git restore --source="origin/${BASE_BRANCH}" --staged --worktree -- "${path}" 2>/dev/null || true
  else
    rm -rf "${path}"
    git add -A -- "${path}" 2>/dev/null || true
  fi
}

find_open_pr_number() {
  gh pr list \
    --repo "${GH_REPO}" \
    --base "${BASE_BRANCH}" \
    --head "${GH_OWNER}:${SYNC_BRANCH}" \
    --state open \
    --json number \
    --jq '.[0].number // ""'
}

append_summary() {
  local message="$1"

  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    printf '%s\n' "${message}" >> "${GITHUB_STEP_SUMMARY}"
  fi
}

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

git fetch origin "${BASE_BRANCH}"

if git remote get-url "${THEME_REMOTE}" >/dev/null 2>&1; then
  git remote set-url "${THEME_REMOTE}" "${THEME_REPO_URL}"
else
  git remote add "${THEME_REMOTE}" "${THEME_REPO_URL}"
fi

git fetch "${THEME_REMOTE}" "${THEME_BRANCH}"

incoming_commits="$(git rev-list --right-only --count "origin/${BASE_BRANCH}...${THEME_REMOTE}/${THEME_BRANCH}")"

if [[ "${incoming_commits}" == "0" ]]; then
  echo "No new theme commits to sync."
  append_summary "## Theme Sync\n- 업스트림 테마에 새 커밋이 없어 PR을 만들지 않았습니다."
  exit 0
fi

git checkout -B "${SYNC_BRANCH}" "origin/${BASE_BRANCH}"

merge_failed=0
if ! git merge --no-ff --no-commit "${THEME_REMOTE}/${THEME_BRANCH}"; then
  merge_failed=1
fi

if [[ "${merge_failed}" == "1" ]]; then
  conflicted_paths="$(git diff --name-only --diff-filter=U)"

  if [[ -z "${conflicted_paths}" ]]; then
    echo "::error::Theme merge failed before conflicts could be resolved."
    git merge --abort || true
    exit 1
  fi

  while IFS= read -r conflicted_path; do
    if [[ -z "${conflicted_path}" ]]; then
      continue
    fi

    if is_preserved_path "${conflicted_path}"; then
      git checkout --ours -- "${conflicted_path}"
      git add -- "${conflicted_path}"
      continue
    fi

    echo "::error::Automatic merge conflict in non-preserved path: ${conflicted_path}"
    git merge --abort || true
    exit 1
  done <<< "${conflicted_paths}"
fi

for preserved_path in "${PRESERVED_PATHS[@]}"; do
  restore_preserved_path "${preserved_path}"
done

if [[ -z "$(git status --short)" ]]; then
  echo "Theme updates only touched preserved paths. Nothing to open as a PR."
  append_summary "## Theme Sync\n- 새 테마 커밋은 있었지만 운영 전용 파일만 바뀌어 PR을 만들지 않았습니다."
  exit 0
fi

git add -A

theme_head="$(git rev-parse --short "${THEME_REMOTE}/${THEME_BRANCH}")"

git commit -m "chore: sync theme updates from jekyll-theme-velog (${theme_head})"

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "Dry run enabled. Skipping push and PR creation."
  git status --short
  exit 0
fi

git push --force-with-lease origin "${SYNC_BRANCH}"

read -r -d '' pr_body <<EOF || true
## 변경 개요
- \`${THEME_REPO_URL}\` 의 \`${THEME_BRANCH}\` 최신 변경을 가져왔습니다.
- 운영 레포가 소유하는 설정과 콘텐츠 파일은 현재 블로그 기준으로 유지했습니다.

## 자동 보존 파일
- \`CNAME\`
- \`README.md\`
- \`_config.yml\`
- \`_data/profile.yml\`
- \`_data/theme.yml\`
- \`about.md\`
- \`_posts/\`
- \`_drafts/\`
- \`assets/images/profile.svg\`
- \`assets/images/favicon.png\`
- \`assets/images/posts/\`

## 검토 포인트
- 공통 UI, 레이아웃, 스크립트, 스타일 변경이 운영 블로그에도 그대로 반영되어도 되는지 확인
- 필요하면 이 PR에서 운영 전용 조정을 추가 커밋으로 보완
EOF

open_pr_number="$(find_open_pr_number)"

if [[ -n "${open_pr_number}" ]]; then
  gh pr edit "${open_pr_number}" \
    --repo "${GH_REPO}" \
    --title "${PR_TITLE}" \
    --body "${pr_body}"
  append_summary "## Theme Sync\n- 기존 PR #${open_pr_number} 을 최신 테마 기준으로 갱신했습니다."
else
  gh pr create \
    --repo "${GH_REPO}" \
    --base "${BASE_BRANCH}" \
    --head "${SYNC_BRANCH}" \
    --title "${PR_TITLE}" \
    --body "${pr_body}"
  append_summary "## Theme Sync\n- 새 테마 동기화 PR을 생성했습니다."
fi
