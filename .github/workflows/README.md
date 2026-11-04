# CI 说明

本目录是仓库的 CI（持续集成）配置。每次提 PR、往 PR 推送新提交、给 PR 加减标签，以及合并到 `develop` 或 `main` 时，GitHub 都会自动运行一遍检查。**检查没有全部通过的 PR 不能合并。**

所有检查都在同一个工作流 `ci.yml` 中，每项检查是其中的一个 job。

## 怎么看检查结果

1. 打开 PR 页面，拉到最下方，能看到每项检查的状态：✅ 通过、❌ 失败、⏭️ 跳过（skipped）。
2. 点击失败那项右侧的 **Details**，进入运行日志。
3. 展开带红色 ❌ 的步骤，往下翻到最后几行，通常就能看到失败原因。以 `Error:` 开头的那一行是 CI 给出的说明。

**跳过不是失败。** 很多检查只在改动了相关目录时才运行，例如只改了文档时，前端检查会被跳过，这是正常的。

修复后，把修改提交并推送到同一个分支，CI 会自动重新运行，不需要关闭 PR。

## 检查一览

| 检查 | 什么时候运行 | 检查什么 |
| --- | --- | --- |
| `changes` | 每次都运行 | 判断这次改动涉及哪些目录，供后面的检查使用 |
| `actionlint` | 改动了 `.github/workflows/` | 工作流文件的语法和常见错误 |
| `frontend-web` | 改动了 `frontend/web/` 或 `docs/api/` | 管理后台前端的格式、代码检查、类型检查、测试、构建，以及生成的接口类型是否与契约一致 |
| `contract` | 改动了 `docs/api/` | 接口契约的 OpenAPI 格式 |
| `pr-target` | 目标分支是 `main` 的 PR | 来源分支是否为 `develop` 或 `hotfix/*` |
| `locked-paths` | 每个 PR | 是否改动了已锁定的目录 |
| `dependency-review` | 每个 PR | 新增或升级的依赖是否有高危漏洞 |
| `ci-required` | 每次都运行 | 汇总以上所有检查。分支保护只要求这一项通过 |

合并到 `develop` 或 `main` 时（push 事件），所有目录都视为有改动，上面的检查全部运行一遍；只针对 PR 的三项检查（`pr-target`、`locked-paths`、`dependency-review`）不运行。

## 各项检查失败时怎么办

### changes

几乎不会失败。如果失败，通常是 GitHub 那边暂时出了问题，在检查页面右上角点 **Re-run jobs** 重试即可。如果日志里写着「检出的不是合并提交」，说明 PR 与目标分支有冲突，先解决冲突再推送。

### actionlint

**原因**：工作流文件写错了，例如缩进错误、引用了不存在的输出、`run:` 里的脚本有问题（由 shellcheck 检查）。

**修复**：日志会写出文件名、行号和原因，按提示修改。只有修改工作流的人会遇到这项检查。

### frontend-web

这项检查在 `frontend/web` 目录下依次执行以下命令，哪一步失败就看哪一步。**所有命令都可以在本地先跑一遍**，本地通过了，CI 一般也能通过。

| 步骤 | 本地命令 | 常见原因 | 修复方法 |
| --- | --- | --- | --- |
| 安装依赖 | `pnpm install --frozen-lockfile` | 改了 `package.json`，但没有提交更新后的 `pnpm-lock.yaml` | 本地执行 `pnpm install`，把 `pnpm-lock.yaml` 一起提交 |
| 代码检查 | `pnpm lint` | 代码不符合 ESLint 规则 | 按日志提示修改，部分问题可以用 `pnpm lint --fix` 自动修复 |
| 格式检查 | `pnpm format:check` | 提交时没有经过本地的 lefthook 自动格式化（例如没有装钩子） | 执行 `pnpm format`，提交格式化后的文件 |
| 类型检查 | `pnpm typecheck` | 类型错误；改了契约后，用到相关类型的代码或模拟数据没有同步修改 | 按日志里的文件和行号修改 |
| 单元测试 | `pnpm test` | 测试没通过 | 本地运行 `pnpm test`，查看失败的测试用例 |
| 构建 | `pnpm build` | 生产构建出错 | 本地运行 `pnpm build` 复现 |
| 生成类型一致性检查 | `pnpm gen:api` | 日志显示「契约改了但类型没有重新生成」：改了 `docs/api/admin.openapi.yaml`，但没有重新生成类型；或者手动改了 `src/api/generated/` 下的文件 | 在 `frontend/web` 下执行 `pnpm gen:api`，把 `src/api/generated/` 的变化一起提交。**不要手动修改这个目录** |

Dependabot 升级 `openapi-typescript` 后，生成的内容可能会变化，导致一致性检查失败。这时在 Dependabot 的 PR 分支上执行一次 `pnpm gen:api` 并提交即可。

### contract

| 原因 | 修复方法 |
| --- | --- |
| redocly 报告了 error：契约不符合 OpenAPI 规范，例如 `$ref` 指向不存在的组件、缺少必填字段 | 按日志里的行号修改。本地检查：`npx @redocly/cli@<ci.yml 中的版本> lint docs/api/admin.openapi.yaml` |
| 「paths 下不能有 x- 开头的字段」 | 生成类型时，`paths` 下的 `x-xxx` 会被当成一个接口路径。把它移到根级别或具体接口内部 |

redocly 的 warning（黄色）不会导致失败，但建议顺手处理。

### pr-target

**原因**：PR 的目标分支是 `main`，但来源分支不是 `develop` 或 `hotfix/*`。按分支策略（`docs/adr/0002-branch-strategy.md`），功能分支只能合进 `develop`。

**修复**：在 PR 页面标题旁点 **Edit**，把目标分支（base）改为 `develop`。

### locked-paths

**原因**：PR 改动了 `docs/tasks/locked-paths.txt` 中列出的锁定目录（已完成并审查过的代码），但 PR 上没有 `unlock` 标签。日志会列出被锁定的文件和对应的锁定路径。

**修复**：

1. 如果是顺手改的（包括 AI 顺手改的），撤销对这些文件的修改。
2. 确实需要修改时，按 `docs/tasks/README.md` 的「锁定」一节处理：先和该模块的负责人沟通，负责人同意后在 PR 上加 `unlock` 标签，加上标签后 CI 会自动重新运行。

注意：

- 锁定清单以**目标分支上**的 `locked-paths.txt` 为准。在 PR 里删掉某条锁定，对这个 PR 本身不起作用。
- 把锁定目录中的文件移动或重命名到别处，同样算改动了锁定目录。

### dependency-review

**原因**：PR 新增或升级的依赖中，有已知的高危（high）或严重（critical）漏洞。

**修复**：日志会列出有问题的包、漏洞编号和已修复的版本。换成已修复的版本，或者换一个依赖。没有修复版本时，在 PR 中说明情况，和团队商量。

### ci-required

它本身不做检查，只汇总其他检查的结果：任何一项失败或被取消，它就失败。**看它上面哪一项失败了，处理那一项。**

## 依赖自动更新（Dependabot）

配置文件是 `../dependabot.yml`。

- 每周一检查一次 `frontend/web` 的 npm 依赖和工作流中的 Action，有新版本时自动向 `develop` 提 PR。
- 新版本发布满 7 天后才会提 PR，避免用到刚发布、可能有问题的版本。
- npm 依赖按 `dependencies`（生产依赖）和 `devDependencies`（开发依赖）各合成一个 PR，Action 合成一个 PR。

Dependabot 的 PR 和普通 PR 一样，要通过所有检查、经过审查后才能合并。

**安全更新**（修复已知漏洞的升级）由仓库设置单独开启，不受 7 天限制。审查这类 PR 时，请人工确认修复版本已发布满 7 天。

## 修改工作流时的要求

- 所有 Action 用完整的提交编号引用，后面注释版本号，例如 `uses: actions/checkout@<40 位提交编号> # v7.0.1`。只用发布满 7 天的版本。
- 工作流顶层的 `permissions` 保持为空，每个 job 只声明自己需要的最小权限。
- 不要使用 `pull_request_target` 触发器。
- Node 版本从 `frontend/web/.node-version` 读取，pnpm 版本从 `package.json` 的 `packageManager` 读取，不要在工作流中写死。
- 新增 job 后，把它加入 `ci-required` 的 `needs`，否则它失败了也不会阻止合并。
- 不要修改 `ci-required` 这个 job 名称，分支保护规则按这个名称查找必需检查。

## 已知限制

1. **`pr-target` 目前拒绝 `release/*` 分支。** 现行分支策略中，`main` 只接收 `develop` 和 `hotfix/*`。小程序或 APP 进入平台审核阶段、需要使用 `release/*` 分支之前，必须**同时**修改 `docs/adr/0002-branch-strategy.md` 和这项检查。
2. **`locked-paths` 只检查 PR 上有没有 `unlock` 标签，不检查是谁加的。** 「修改锁定目录必须由模块负责人同意」这一点，依赖分支保护规则集中的 `require_code_owner_review`：开启后，PR 必须经过 `.github/CODEOWNERS` 中对应目录的负责人（或备份审查人）批准才能合并。**这两者必须同时开启**，只有标签检查时，任何人加上 `unlock` 就能绕过锁定。
