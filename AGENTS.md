# 拾澳 PickAus · 仓库总规则

本文件对仓库内所有工程、所有 AI 编码工具（Claude Code、Codex 等）和所有成员生效。
各工程目录下还有自己的 `AGENTS.md`，在本文件基础上补充该工程的规则；两者冲突时，以本文件为准。

## 项目概述

**拾澳（PickAus）**：面向澳洲华人社区的同城电商，包含商城和二手闲置两部分。

代码仓库名为 `HowToBuildBigMuscle`，与产品名不同，这是正常的。代码、文档、界面文案中的产品名一律使用「拾澳」或「PickAus」。

| 端 | 状态 |
| --- | --- |
| 管理后台（网页） | **当前阶段：前端开发** |
| 微信小程序 | 待开发 |
| APP | 未来规划 |

开发顺序：管理后台前端 → 表设计 → 小程序前端 → 后端。

## 仓库结构

仓库内有 6 个**完全独立**的工程，只是暂时放在同一个仓库里：

| 目录 | 工程 | 技术栈 |
| --- | --- | --- |
| `frontend/web` | 管理后台前端 | Vue 3 + Vite + TypeScript + Element Plus + Pinia |
| `frontend/mini` | 微信小程序 | Uniapp（CLI 版）+ Vue 3 + TypeScript + Pinia |
| `frontend/app` | APP（占位） | Uniapp |
| `backend/admin` | 管理端后端 | Go + Gin + GORM |
| `backend/mini` | 小程序后端 | Go + Gin + GORM |
| `backend/app` | APP 后端（占位） | Go + Gin + GORM |

Go 工程的模块路径为 `github.com/MoonLight-QAQ/HowToBuildBigMuscle/backend/<工程名>`。**大小写必须与此完全一致**（`MoonLight-QAQ`，不是 `moonlight-qaq`），否则依赖无法解析。

其他目录：

| 目录 | 内容 |
| --- | --- |
| `docs/prd/` | 需求文档，功能以此为准 |
| `docs/prototype/` | 产品原型，交互以此为准（不含 UI 设计） |
| `docs/design/` | 架构设计、字段清单 |
| `docs/api/` | 接口约定与接口契约（OpenAPI） |
| `docs/adr/` | 架构决策记录 |
| `docs/tasks/` | 任务清单与锁定目录 |
| `.agents/skills/` | AI 的操作手册（skill），Claude Code 和 Codex 通过符号链接共用 |
| `.github/repo-settings/` | GitHub 仓库设置（分支保护等），以代码形式管理 |

## 硬规则（任何情况下都不能违反）

1. **工程之间禁止互相引用。** 任何工程都不能通过相对路径（`../`）或模块路径引用另一个工程的代码。需要相同的工具函数时，各自写一份。
2. **契约先行。** 新增或修改接口，必须先改 `docs/api/` 下的接口契约，再改前端或后端代码。前后端都以契约为准，不以对方的代码为准。
3. **不修改已锁定的目录。** 动手前先查看 `docs/tasks/locked-paths.txt`。要修改其中的目录，必须先停下来，告诉用户要改什么、为什么改，得到明确同意后才能继续。
4. **不在 `develop` 或 `main` 上直接提交。** 任何改动都在功能分支上进行，通过 PR 合并。
5. **不读取、不写入、不提交密钥。** 包括 `.env`、`*.local.yaml`、各类证书（`*.pem`、`*.key` 等）。仓库是**公开**的，任何提交都会被所有人看到，且无法真正撤回。
6. **不手动修改自动生成的文件。** 例如从契约生成的类型文件，需要修改时改契约，再重新生成。
7. **不提交 IDE 和系统文件。** `.idea/`、`.vscode/`、`.DS_Store` 等已在 `.gitignore` 中，不要用 `git add -f` 强行加入。

## 接口与数据约定

完整约定见 `docs/api/conventions.md`，以下是最常用的几条：

| 项目 | 约定 |
| --- | --- |
| 响应格式 | 成功：`{ "ok": true, "data": ... }`；失败：`{ "ok": false, "code": "ERROR_CODE", "message": "..." }` |
| ID | 雪花 ID，**一律用字符串传输**（超出 JavaScript 数字精度） |
| 金额 | 整数，单位为**分**（澳元分）。前端显示时再转换为元 |
| 时间 | ISO 8601 格式，统一为 UTC，如 `2026-11-01T03:30:00Z`；前端按城市时区显示 |
| 双语字段 | 字段名后缀 `Zh` 和 `En`，如 `nameZh`、`nameEn` |
| 字段命名 | JSON 用 camelCase；数据库用 snake_case |

## 代码风格

- 标识符（变量、函数、类型、文件名）用**英文**。
- 代码注释、提交信息、PR 描述、文档用**中文**。
- 各工程的具体格式由各自的格式化工具决定（Go 用 `gofmt`，前端用 Prettier），不要手动调整格式。

## 分支与提交

### 分支策略

| 分支 | 用途 | 接收谁的合并 | 合并方式 |
| --- | --- | --- | --- |
| `main` | 已验证、可发布的代码 | 只接收 `develop` 和 `hotfix/*` | Merge commit |
| `develop` | 日常集成，仓库默认分支 | 所有功能分支 | Squash |

### 分支命名

格式：`类型/范围-简短描述`，全部用小写英文和连字符，如 `feat/fe-web-city`。

| 类型 | 用途 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `refactor` | 重构，不改变功能 |
| `test` | 只加或改测试 |
| `docs` | 只改文档 |
| `chore` | 配置、依赖、脚本 |
| `hotfix` | 线上紧急修复，从 `main` 拉出 |

| 范围 | 对应 |
| --- | --- |
| `fe-web` / `fe-mini` / `fe-app` | `frontend/web` / `frontend/mini` / `frontend/app` |
| `be-admin` / `be-mini` / `be-app` | `backend/admin` / `backend/mini` / `backend/app` |
| `docs` | 文档、契约、任务清单 |
| `repo` | 仓库级配置 |

### PR 与提交

- PR 的目标分支是 **`develop`**。只有发版（`develop` → `main`）和线上修复（`hotfix/*` → `main`）的目标才是 `main`。
- PR 标题用 Conventional Commits 格式：`类型(范围): 中文描述`，如 `feat(fe-web): 城市管理页面`。Squash 合并后，PR 标题就是 `develop` 上的提交信息。
- 一个任务对应一个分支、一个 PR。不在一个 PR 里顺手修改无关内容。
- PR 尽量控制在 400 行以内（不含测试和自动生成的文件），太大就拆开。

### 发布

- 每个工程独立发版，tag 格式为 `范围/v主版本.次版本.修订号`，如 `fe-web/v0.1.0`。只有管理员可以创建发布 tag。
- 线上紧急修复：从 `main` 拉 `hotfix/*` 分支，修复后合进 `main` 并发布，**再把 `main` 同步回 `develop`**。

## 任务与锁定

- 任务清单在 `docs/tasks/` 下，每个阶段一份（当前为 `admin-web.md`）。
- 开始一个任务前，先在清单中确认这个任务的 ID、范围和负责人。**只修改该任务「范围」列出的目录**，需要改动范围之外的文件时，先告诉用户。
- 任务完成的那个 PR 里，同时做两件事：把清单里的状态改为「已完成 🔒」，并把该任务的目录加入 `docs/tasks/locked-paths.txt`。
- 已锁定的目录，修改前必须得到负责人同意；PR 需要加上 `unlock` 标签才能合并。

## AI 的工作方式

1. **先理解，再动手。** 开始任务时，先读相关的 PRD 章节、原型、接口契约和任务清单，再给出计划。涉及多个文件的改动，先出计划，等用户确认后再写代码。
2. **小步前进。** 每完成一小步就运行该工程的检查命令（lint、类型检查、测试），通过后再继续。
3. **不确定就问。** PRD 没写清楚、契约和 PRD 不一致、需要改动任务范围以外的文件时，停下来问用户，不要自行假设。
4. **完成前自查。** 声称任务完成之前，先按 `pr-checklist` skill 逐项检查。
5. **用中文回复用户。**

## 常用 skill

| skill | 用途 |
| --- | --- |
| `new-module` | 照着示例模块新增一个业务模块 |
| `pr-checklist` | 提 PR 前的自查清单 |
| `code-review` | 审查别人的 PR |

## 文档索引

| 想了解 | 看这里 |
| --- | --- |
| 协作流程、本地环境配置 | `CONTRIBUTING.md` |
| 架构设计 | `docs/design/architecture.md` |
| 接口约定 | `docs/api/conventions.md` |
| 某个工程的具体规则 | 该工程目录下的 `AGENTS.md` |
| 仓库设置 | `.github/repo-settings/README.md` |
