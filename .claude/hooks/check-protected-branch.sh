#!/usr/bin/env bash
# Claude Code 钩子：阻止在 develop 或 main 分支上提交和推送，阻止跳过本地检查。

set -u

CMD="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)"
[ -n "${CMD}" ] || exit 0

# 跳过 lefthook 检查
if printf '%s' "${CMD}" | grep -Eq 'git[[:space:]]+commit.*(--no-verify|[[:space:]]-n([[:space:]]|$))'; then
  echo "已阻止：不允许使用 --no-verify 跳过提交前检查。请修复检查发现的问题。" >&2
  exit 2
fi

# 在受保护分支上提交或推送
if printf '%s' "${CMD}" | grep -Eq 'git[[:space:]]+(commit|push)'; then
  BRANCH="$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null)"
  if [ "${BRANCH}" = "develop" ] || [ "${BRANCH}" = "main" ]; then
    echo "已阻止：当前在 ${BRANCH} 分支上。请先创建功能分支（如 git checkout -b feat/fe-web-xxx）。" >&2
    exit 2
  fi
  if printf '%s' "${CMD}" | grep -Eq 'git[[:space:]]+push.*[[:space:]](origin[[:space:]]+)?(develop|main)([[:space:]]|$)'; then
    echo "已阻止：不允许直接推送到 develop 或 main，请通过 PR 合并。" >&2
    exit 2
  fi
fi

exit 0
