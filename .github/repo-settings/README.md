# 仓库设置（Settings as Code）

本目录以代码形式保存 GitHub 仓库设置，修改需走 PR 审查。

## 分支策略

| 分支 | 用途 | 接收谁的合并 | 合并方式 |
| --- | --- | --- | --- |
| `main` | 已验证、可发布的代码 | `develop`、`hotfix/*` | Merge commit |
| `develop` | 日常集成，仓库默认分支 | 所有功能分支 | Squash |

发布 tag 格式为 `工程/v版本号`（如 `be-admin/v0.1.0`），只有管理员可以创建、修改、删除。

## 文件

| 文件 | 内容 |
| --- | --- |
| `protect-main.ruleset.json` | main 保护：需 PR、1 人审批、只允许 Merge commit |
| `protect-develop.ruleset.json` | develop 保护：需 PR、1 人审批、只允许 Squash、要求线性历史 |
| `protect-release-tags.ruleset.json` | 发布 tag 保护：仅管理员可创建、修改、删除 |
| `apply.sh` | 一键应用：规则集、默认分支、合并方式、安全功能、Actions 权限、外部互动限制 |

## 使用

```bash
gh auth login                          # 首次使用，需仓库管理员账号
bash .github/repo-settings/apply.sh    # 在仓库根目录执行
```

前提：远程仓库上已存在 `develop` 分支。

## 管理员例外

`protect-main` 与 `protect-develop` 允许仓库管理员以 `pull_request` 模式绕过审批：
仍须通过 PR 合并、不能直接推送，但可在无人审批时合并自己的 PR。
仅用于仓库设置、文档和紧急修复，业务代码仍需他人审查。

## 修改流程

1. 修改本目录下的文件，提 PR。
2. 审查通过并合并后，由管理员重新执行 `apply.sh`。

## 待办

- [ ] CODEOWNERS 合并后：两个分支规则集的 `require_code_owner_review` 改为 `true`
- [ ] CI 合并后：两个分支规则集增加 `required_status_checks` 规则
- [ ] CI 中增加检查：目标为 main 的 PR，来源只能是 `develop` 或 `hotfix/*`
- [ ] 外部互动限制每 6 个月到期，到期后重新执行 `apply.sh`