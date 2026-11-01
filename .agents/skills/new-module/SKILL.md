---
name: new-module
description: 新增一个业务模块（当前阶段为管理后台前端 frontend/web）。当用户要求开发、实现或新增某个页面或业务模块，或提到某个任务 ID（如 W-03）时使用。
---

# 新增业务模块

按以下步骤进行，**不要跳步**。每一步完成后简要告诉用户结果，遇到不确定的地方先停下来问。

## 第 1 步：确认任务

1. 读取任务的 GitHub issue，确认：任务 ID、负责人、**范围**（允许修改的目录和文件）、**依赖**。
   - 用户给了 issue 编号时：`gh issue view <编号>`
   - 只给了任务 ID 时：`gh issue list --label task --search "<任务ID> in:title"`，找到编号后再查看
2. 确认依赖的任务都已完成：逐个执行 `gh issue view <依赖任务的编号>`，状态应为 `CLOSED`。有未完成的依赖时，告诉用户。
3. 查看 `docs/tasks/locked-paths.txt`，确认范围内没有已锁定的目录。
4. 确认当前分支不是 `develop` 或 `main`，且分支名符合 `类型/范围-简短描述`。不符合时提醒用户先创建分支。
5. 提醒用户：如果还没有在看板上把这个任务拖到 `In Progress`，现在去拖一下。**不要自己修改看板或 issue 的状态。**
6. 找不到对应的 issue，或者范围不清楚时，**停下来问用户**。

## 第 2 步：理解需求

1. 阅读 PRD 中对应的章节（管理后台为 `docs/prd/admin-prd.md`）。
2. 阅读原型中对应的页面（`docs/prototype/admin/`），弄清楚页面上有哪些数据、哪些操作、各种状态下显示什么。
3. 在 `docs/api/admin.openapi.yaml` 中找到本模块用到的接口。
4. 向用户简要复述你的理解：页面有哪些功能、用到哪些接口、有哪些业务规则。PRD 与原型或契约不一致时，列出来请用户确认。

## 第 3 步：给出计划

切换到计划模式（或在回复中给出计划），列出：

- 要新建和修改的每个文件
- 是否需要修改接口契约，改什么
- 是否需要修改共享区域（`src/api/http.ts`、`src/components/`、`src/layouts/` 等）。需要的话，单独说明理由

**用户确认计划后再开始写代码。**

## 第 4 步：接口契约（需要时）

契约中缺少本模块需要的接口或字段时：

1. 修改 `docs/api/admin.openapi.yaml`，遵守 `docs/api/conventions.md` 中的约定。
2. 在 `frontend/web` 下执行 `pnpm gen:api`，重新生成类型。
3. 告诉用户契约改了什么。**契约的改动会影响后端，需要在 PR 描述中单独列出。**

## 第 5 步：模拟接口

1. 在 `src/mocks/data/<模块>.ts` 中编写模拟数据，使用生成的类型声明。数据要覆盖页面上的各种状态（如每一种订单状态各有几条）。
2. 在 `src/mocks/handlers/<模块>.ts` 中编写模拟接口：
   - 模拟真实的业务规则，例如只有特定状态才能执行某个操作
   - 每个写操作至少模拟一个失败场景，返回契约中定义的错误码
3. 在 `src/mocks/handlers/index.ts` 中注册。

## 第 6 步：接口函数

在 `src/api/<模块>.ts` 中编写接口函数：

- 通过 `src/api/http.ts` 发请求，不直接使用 axios
- 入参和返回值类型从 `src/api/generated/` 中取

## 第 7 步：页面

1. 在 `src/views/<模块>/` 中编写页面，入口组件命名为 `<名称>View.vue`。
2. 只在本模块使用的组件放在 `src/views/<模块>/components/`。
3. 在 `src/router/index.ts` 中添加本模块的路由。只添加本模块的路由，不改动其他路由。
4. 遵守 `frontend/web/AGENTS.md` 中的数据显示规则：ID 用字符串、金额用分并通过工具函数显示、状态文案来自 `src/constants/`、双语字段用 `BilingualInput`。

## 第 8 步：测试

1. 页面中的业务规则（如「按状态决定显示哪些操作按钮」）抽成纯函数，编写单元测试。
2. 新增的工具函数和组合式函数都要有测试。

## 第 9 步：检查

在 `frontend/web` 下依次执行，全部通过后才算完成：

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

失败时修复后重新执行，不要跳过。

## 第 10 步：收尾

1. 如果这是完成该任务的 PR，把 issue 中「范围」列出的路径逐行加入 `docs/tasks/locked-paths.txt`。
2. 执行 `pr-checklist` skill，逐项自查。
3. 提醒用户：PR 描述的「关联任务」一行写 `Closes #<issue编号>`（完成任务）或 `Refs #<issue编号>`（只完成一部分）。合并后看板会自动更新状态。
