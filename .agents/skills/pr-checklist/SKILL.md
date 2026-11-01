---
name: pr-checklist
description: 提交 PR 前的自查清单。当用户说要提 PR、准备合并、问「可以提交了吗」，或在声称一个任务完成之前使用。
---

# 提 PR 前自查

逐项检查，**实际执行命令验证**，不要凭印象判断。最后用表格向用户报告每一项的结果（✅ 通过 / ❌ 未通过 / ➖ 不适用），未通过的项说明原因和修复方法。

## 一、分支

- [ ] 当前分支不是 `develop` 或 `main`（`git branch --show-current`）
- [ ] 分支名符合 `类型/范围-简短描述`
- [ ] 已同步最新的 develop（`git fetch origin && git log --oneline HEAD..origin/develop` 无输出；有输出时提醒用户执行 `git pull --rebase origin develop`）

## 二、改动范围

用 `git diff --stat origin/develop...HEAD` 查看本分支的全部改动，然后检查：

- [ ] 所有改动都在任务 issue 的「范围」内（`gh issue view <编号>` 查看）
- [ ] 没有修改 `docs/tasks/locked-paths.txt` 中的锁定目录。如有，确认用户已获得负责人同意
- [ ] 如果修改了共享区域，已向用户说明，并需要在 PR 描述中单独列出
- [ ] 没有修改其他工程（只改了一个工程目录，文档除外）
- [ ] 改动规模合理：不含测试和自动生成文件，大约在 400 行以内。过大时建议拆分

## 三、不该提交的内容

- [ ] 没有密钥：`.env`、`*.local.yaml`、`*.pem`、`*.key` 等
- [ ] 没有 IDE 和系统文件：`.idea/`、`.vscode/`、`.DS_Store`
- [ ] 没有手动修改自动生成的文件：`src/api/generated/`、`public/mockServiceWorker.js`
- [ ] 没有遗留的调试代码：`console.log`、`debugger`、被注释掉的大段代码

## 四、契约与约定

- [ ] 如果修改了接口契约，已重新生成类型，并需要在 PR 描述中单独列出
- [ ] 页面和组件中没有直接发请求，都通过 `src/api/<模块>.ts`
- [ ] 没有使用 `any`
- [ ] ID 按字符串处理，金额按「分」处理，时间通过工具函数格式化
- [ ] 界面上的状态文案和错误提示来自 `src/constants/`，没有写死

## 五、检查命令

在对应工程目录下执行，全部通过：

| 工程 | 命令 |
| --- | --- |
| `frontend/web` | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |

## 六、任务与锁定

- [ ] 已确认本 PR 对应哪个任务 issue（编号）
- [ ] 如果本 PR 完成了任务：issue「范围」中的目录已加入 `docs/tasks/locked-paths.txt`
- [ ] 没有修改 `docs/tasks/` 下与本任务无关的内容

任务的状态在 GitHub Project 看板上管理，**不需要、也不要**在文件里修改状态。

## 七、PR 信息

全部检查通过后，为用户准备：

1. **PR 标题**：`类型(范围): 中文描述`
2. **PR 描述**：按 `.github/pull_request_template.md` 填写。「关联任务」一行：完成任务写 `Closes #<编号>`，只完成一部分写 `Refs #<编号>`
3. **创建命令**：`gh pr create --base develop`

**目标分支必须是 `develop`**，除非是发版或 hotfix。
