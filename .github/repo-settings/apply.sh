#!/usr/bin/env bash
# GitHub 仓库设置一键应用脚本
#
# 用法：在仓库根目录执行  bash .github/repo-settings/apply.sh
# 前提：已安装 GitHub CLI（gh），已执行 gh auth login，且当前账号是仓库管理员。
# 特点：可重复执行。规则集按名称查找，已存在则更新，不存在则创建。
#
# 修改设置的方式：改本目录下的 JSON 或本脚本 → 提 PR 审查 → 合并后重新执行本脚本。

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v gh >/dev/null 2>&1; then
  echo "未找到 gh 命令，请先安装 GitHub CLI：https://cli.github.com" >&2
  exit 1
fi

REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
echo "目标仓库：$REPO"
echo

ok()   { echo "  ✓ $1"; }
warn() { echo "  ! $1（已跳过，可在网页上手动设置）"; }

# ---------- 1. main 分支保护规则集 ----------
echo "[1/5] main 分支保护"
RULESET_FILE="$DIR/protect-main.ruleset.json"
RULESET_ID="$(gh api "repos/$REPO/rulesets" --jq '.[] | select(.name=="protect-main") | .id')"
if [ -n "$RULESET_ID" ]; then
  gh api -X PUT "repos/$REPO/rulesets/$RULESET_ID" --input "$RULESET_FILE" >/dev/null
  ok "已更新规则集 protect-main（id=$RULESET_ID）"
else
  gh api -X POST "repos/$REPO/rulesets" --input "$RULESET_FILE" >/dev/null
  ok "已创建规则集 protect-main"
fi

# ---------- 2. 合并方式 ----------
echo "[2/5] 合并方式：只允许 Squash，合并后自动删除分支"
gh api -X PATCH "repos/$REPO" --input - >/dev/null <<'JSON'
{
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": false,
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "PR_BODY",
  "delete_branch_on_merge": true,
  "allow_update_branch": true
}
JSON
ok "合并方式已设置"

# ---------- 3. 安全功能 ----------
echo "[3/5] 安全功能"
gh api -X PATCH "repos/$REPO" --input - >/dev/null <<'JSON' && ok "Secret scanning 与 Push protection 已开启" || warn "Secret scanning 设置失败"
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
JSON
gh api -X PUT "repos/$REPO/vulnerability-alerts" >/dev/null 2>&1 \
  && ok "Dependabot alerts 已开启" || warn "Dependabot alerts 设置失败"
gh api -X PUT "repos/$REPO/automated-security-fixes" >/dev/null 2>&1 \
  && ok "Dependabot security updates 已开启" || warn "Dependabot security updates 设置失败"
gh api -X PUT "repos/$REPO/private-vulnerability-reporting" >/dev/null 2>&1 \
  && ok "Private vulnerability reporting 已开启" || warn "Private vulnerability reporting 设置失败"

# ---------- 4. Actions 权限 ----------
echo "[4/5] Actions 权限"
gh api -X PUT "repos/$REPO/actions/permissions/workflow" \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false >/dev/null 2>&1 \
  && ok "CI 默认只读" || warn "CI 默认权限设置失败"
gh api -X PUT "repos/$REPO/actions/permissions/fork-pr-contributor-approval" \
  -f approval_policy=all_external_contributors >/dev/null 2>&1 \
  && ok "外部贡献者的 fork PR 需审批后才能运行 CI" || warn "fork PR 审批策略设置失败"

# ---------- 5. 外部互动限制（公开仓库） ----------
echo "[5/5] 外部互动限制"
gh api -X PUT "repos/$REPO/interaction-limits" \
  -f limit=collaborators_only -f expiry=six_months >/dev/null 2>&1 \
  && ok "仅协作者可提 issue 和 PR（有效期 6 个月，到期需重新执行本脚本）" \
  || warn "互动限制设置失败"

echo
echo "完成。请执行以下命令验证 main 保护是否生效（应被拒绝）："
echo "  git commit --allow-empty -m \"test: 验证分支保护\" && git push origin main"
echo "验证后撤销本地提交：git reset --hard HEAD~1"
