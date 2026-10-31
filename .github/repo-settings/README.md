# 仓库设置（Settings as Code）

本目录以代码形式保存 GitHub 仓库设置，修改需走 PR 审查。

| 文件 | 内容 |
| --- | --- |
| `protect-main.ruleset.json` | main 分支保护规则集 |
| `apply.sh` | 一键应用全部设置：分支保护、合并方式、安全功能、Actions 权限、外部互动限制 |

## 使用

```bash
gh auth login                          # 首次使用，需仓库管理员账号
bash .github/repo-settings/apply.sh    # 在仓库根目录执行
```

## 修改流程

1. 修改本目录下的文件，提 PR。
2. 审查通过并合并后，由管理员重新执行 `apply.sh`。

## 待办

- [ ] 第 1 个 PR（含 CODEOWNERS）合并后：`protect-main.ruleset.json` 中 `require_code_owner_review` 改为 `true`
- [ ] 第 5 个 PR（含 CI）合并后：规则集中增加 `required_status_checks` 规则
- [ ] 外部互动限制每 6 个月到期，到期后重新执行 `apply.sh`
