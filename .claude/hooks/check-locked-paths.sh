#!/usr/bin/env bash
# Claude Code 钩子：阻止编辑 docs/tasks/locked-paths.txt 中列出的锁定目录。
#
# 获得模块负责人同意后，用户可以在启动 Claude Code 前设置环境变量临时解锁，例如：
#   PICKAUS_UNLOCK="frontend/web/src/views/city/" claude
# 多个路径用冒号分隔。

set -u

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
LOCK_FILE="${ROOT}/docs/tasks/locked-paths.txt"
[ -f "${LOCK_FILE}" ] || exit 0

# 从钩子输入（JSON）中取出要编辑的文件路径
FILE_PATH="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)"
[ -n "${FILE_PATH}" ] || exit 0

# 转为相对仓库根目录的路径
REL="${FILE_PATH#"${ROOT}"/}"

UNLOCK="${PICKAUS_UNLOCK:-}"

while IFS= read -r LINE || [ -n "${LINE}" ]; do
  LOCKED="$(printf '%s' "${LINE}" | sed -e 's/#.*//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  [ -n "${LOCKED}" ] || continue
  case "${REL}" in
    "${LOCKED}"*)
      # 检查是否已临时解锁
      IFS=':' read -r -a ALLOWED <<< "${UNLOCK}"
      for A in "${ALLOWED[@]:-}"; do
        if [ -n "${A}" ] && [ "${LOCKED#"${A}"}" != "${LOCKED}" -o "${REL#"${A}"}" != "${REL}" ]; then
          exit 0
        fi
      done
      echo "已阻止：${REL} 位于锁定目录 ${LOCKED} 中（见 docs/tasks/locked-paths.txt）。" >&2
      echo "请停止修改，并告诉用户：要改什么、为什么改。需要模块负责人同意后，由用户临时解锁。" >&2
      exit 2
      ;;
  esac
done < "${LOCK_FILE}"

exit 0
