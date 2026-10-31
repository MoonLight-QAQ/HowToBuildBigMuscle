#!/usr/bin/env bash
# GitHub 仓库设置一键应用脚本
#
# 用法：在仓库根目录执行  bash .github/repo-settings/apply.sh
# 前提：已安装 GitHub CLI（gh），已 gh auth login，当前账号是仓库管理员；
#       远程仓库上已存在 develop 分支。
# 特点：可重复执行。规则集按名称查找，已存在则更新，不存在则创建。
#
# 修改设置的方式：改本目录下的文件 → 提 PR 审查 → 合并后重新执行本脚本。

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v gh >/dev/null 2>&1; then
  echo "未找到 gh 命令，请先安装 GitHub CLI：https://cli.github.com" >&2
  exit 1
fi

REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
echo "目标仓库：${REPO}"
echo

ok()   { echo "  ✓ $1"; }
warn() { echo "  ! $1（已跳过，可在网页上手动设置）"; }

# ---------- 0. 前置检查：develop 分支必须存在 ----------
if ! gh api "repos/${REPO}/branches/develop" >/dev/null 2>&1; then
  echo "远程仓库上还没有 develop 分支。请先执行：" >&2
  echo "  git checkout main && git pull && git checkout -b develop && git push -u origin develop" >&2
  exit 1
fi

# ---------- 1. 规则集（分支保护、tag 保护） ----------
# 必须先于第 2 步执行：protect-main 的目标要先改成明确的 main，再改默认分支。
echo "[1/6] 规则集"
for FILE in "${DIR}"/*.ruleset.json; do
  NAME="$(sed -n 's/^  "name": "\(.*\)",$/\1/p' "${FILE}" | head -n 1)"
  ID="$(gh api "repos/${REPO}/rulesets" --jq ".[] | select(.name==\"${NAME}\") | .id")"
  if [ -n "${ID}" ]; then
    gh api -X PUT "repos/${REPO}/rulesets/${ID}" --input "${FILE}" >/dev/null
    ok "已更新规则集 ${NAME} (id=${ID})"
  else
    gh api -X POST "repos/${REPO}/rulesets" --input "${FILE}" >/dev/null
    ok "已创建规则集 ${NAME}"
  fi
done

# ---------- 2. 默认分支与合并方式 ----------
# 仓库层面同时允许 Squash 和 Merge commit；每个分支具体允许哪种，由各自的规则集决定。
echo "[2/6] 默认分支与合并方式"
gh api -X PATCH "repos/${REPO}" --input - >/dev/null <<'JSON'
{
  "default_branch": "develop",
  "allow_squash_merge": true,
  "allow_merge_commit": true,
  "allow_rebase_merge": false,
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "PR_BODY",
  "merge_commit_title": "PR_TITLE",
  "merge_commit_message": "PR_BODY",
  "delete_branch_on_merge": true,
  "allow_update_branch": true
}
JSON
ok "默认分支为 develop；允许 Squash 与 Merge commit；合并后自动删除功能分支"

# ---------- 3. 安全功能 ----------
echo "[3/6] 安全功能"
gh api -X PATCH "repos/${REPO}" --input - >/dev/null 2>&1 <<'JSON' && ok "Secret scanning 与 Push protection 已开启" || warn "Secret scanning 设置失败"
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
JSON
gh api -X PUT "repos/${REPO}/vulnerability-alerts" >/dev/null 2>&1 \
  && ok "Dependabot alerts 已开启" || warn "Dependabot alerts 设置失败"
gh api -X PUT "repos/${REPO}/automated-security-fixes" >/dev/null 2>&1 \
  && ok "Dependabot security updates 已开启" || warn "Dependabot security updates 设置失败"
gh api -X PUT "repos/${REPO}/private-vulnerability-reporting" >/dev/null 2>&1 \
  && ok "Private vulnerability reporting 已开启" || warn "Private vulnerability reporting 设置失败"

# ---------- 4. Actions 权限 ----------
echo "[4/6] Actions 权限"
gh api -X PUT "repos/${REPO}/actions/permissions/workflow" \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false >/dev/null 2>&1 \
  && ok "CI 默认只读" || warn "CI 默认权限设置失败"
gh api -X PUT "repos/${REPO}/actions/permissions/fork-pr-contributor-approval" \
  -f approval_policy=all_external_contributors >/dev/null 2>&1 \
  && ok "外部贡献者的 fork PR 需审批后才能运行 CI" || warn "fork PR 审批策略设置失败"

# ---------- 5. 外部互动限制（公开仓库） ----------
echo "[5/6] 外部互动限制"
gh api -X PUT "repos/${REPO}/interaction-limits" \
  -f limit=collaborators_only -f expiry=six_months >/dev/null 2>&1 \
  && ok "仅协作者可提 issue 和 PR（有效期 6 个月，到期需重新执行本脚本）" \
  || warn "互动限制设置失败"

# ---------- 6. 结果核对 ----------
echo "[6/6] 当前规则集"
gh api "repos/${REPO}/rulesets" --jq '.[] | "  - \(.name)  [\(.target)]  \(.enforcement)"'

echo
echo "完成。验证方法："
echo "  1. 直接推送 main 或 develop 应被拒绝："
echo "     git commit --allow-empty -m \"test\" && git push origin develop   # 应被拒绝"
echo "     git reset --hard HEAD~1                                         # 撤销本地测试提交"
echo "  2. 在 GitHub 上新建 PR 时，目标分支默认应为 develop。"