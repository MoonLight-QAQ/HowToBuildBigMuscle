# 拾澳 PickAus

面向澳洲华人社区的同城电商，包含**商城**（店铺自营商品，线下配送或快递）和**闲置**（用户发布二手物品，平台只撮合联系方式）两部分。

> 代码仓库名为 `HowToBuildBigMuscle`，与产品名不同，这是正常的。代码、文档、界面中的产品名一律使用「拾澳」或「PickAus」。

| 端 | 使用者 | 状态 |
| --- | --- | --- |
| 管理后台（网页） | 店员 | **当前阶段：准备开发前端** |
| 微信小程序 | 顾客 | 待开发 |
| APP | 顾客 | 未来规划 |

开发顺序：**管理后台前端 → 表设计 → 小程序前端 → 后端**。

---

## 目录

1. [新成员快速上手](#一新成员快速上手)
2. [仓库结构](#二仓库结构)
3. [每个人都必须知道的 12 条规则](#三每个人都必须知道的-12-条规则)
4. [日常开发流程](#四日常开发流程)
5. [团队分工与任务](#五团队分工与任务)
6. [开发前已完成的准备工作](#六开发前已完成的准备工作)
7. [待确认事项](#七待确认事项)
8. [文档索引](#八文档索引)

---

## 一、新成员快速上手

按顺序完成以下 4 步，大约需要 1 小时。

### 第 1 步：阅读（20 分钟）

| 顺序 | 文件 | 读什么 |
| --- | --- | --- |
| 1 | 本文件 | 整体情况 |
| 2 | `AGENTS.md` | 仓库的硬规则、接口约定、分支规则 |
| 3 | `CONTRIBUTING.md` | 具体操作步骤 |
| 4 | 你负责的工程目录下的 `AGENTS.md`，如 `frontend/web/AGENTS.md` | 该工程的规则 |
| 5 | `docs/tasks/github-project-guide.md` | 如何在看板上查看和更新任务 |
| 6 | GitHub Project 看板「拾澳 · 管理后台前端」的「我的任务」视图 | 分配给你的任务 |

### 第 2 步：安装工具（20 分钟）

macOS 用户：

```bash
brew install git gh node pnpm lefthook
```

再安装 AI 编码工具，**Claude Code 或 Codex 二选一**，以及编辑器（GoLand 或 VS Code）。

### 第 3 步：一次性配置（15 分钟）

```bash
# 1. 登录 GitHub
gh auth login                 # 选择 GitHub.com → HTTPS → Login with a web browser
gh auth setup-git

# 2. 全局配置
git config --global fetch.prune true
echo ".DS_Store" >> ~/.gitignore_global                     # macOS 用户
git config --global core.excludesfile ~/.gitignore_global

# 3. 克隆仓库
git clone https://github.com/MoonLight-QAQ/HowToBuildBigMuscle.git
cd HowToBuildBigMuscle

# 4. 启用提交前检查（必须执行）
lefthook install
```

还需要：

- **确认 Git 提交邮箱**：执行 `git config user.email`，确认这个邮箱已添加到你 GitHub 账号的 Settings → Emails。否则你的提交不会显示为你的账号。电脑上有多个 Git 身份时，见 `CONTRIBUTING.md` 第一部分的「按目录切换身份」。
- **开启 GitHub 两步验证**：Settings → Password and authentication。
- **配置 AI 工具**：
  - Claude Code：在 GoLand 中安装插件 **Claude Code [Beta]**，完全重启 GoLand；从**仓库根目录**启动 `claude`，输入 `/config` 把 diff tool 设为 `auto`，按 `Shift + Tab` 切换到 **manual** 模式。**不要执行 `/init`**。
  - Codex：在仓库根目录启动即可，会自动读取 `AGENTS.md`。

### 第 4 步：验证配置是否生效（5 分钟）

| 验证 | 操作 | 预期结果 |
| --- | --- | --- |
| lefthook 生效 | `git checkout develop && git commit --allow-empty -m test` | 被拦截，提示不能在 develop 上提交 |
| Claude Code 读到规则 | 在 Claude Code 中问「这个仓库有哪些硬规则」 | 能列出 `AGENTS.md` 中的规则 |
| Claude Code 权限生效 | 输入 `/permissions` | 能看到禁止读取密钥等规则 |
| skill 可用 | 输入 `/` | 候选列表中有 `new-module`、`pr-checklist`、`code-review` |

验证完成后执行 `git checkout -` 回到原来的分支。

---

## 二、仓库结构

仓库内有 **6 个完全独立的工程**，只是暂时放在同一个仓库里。工程之间不共享任何代码，只通过接口契约和数据库发生关系。

```text
HowToBuildBigMuscle/
├── README.md                    # 本文件
├── AGENTS.md                    # 仓库总规则（AI 和人都要遵守）
├── CLAUDE.md                    # 让 Claude Code 读取 AGENTS.md
├── CONTRIBUTING.md              # 协作指南：环境配置、开发流程、发版、回滚
├── lefthook.yml                 # 提交前的本地检查
├── .editorconfig                # 统一编辑器格式
├── .gitignore
│
├── .agents/skills/              # AI 的操作手册（Claude Code 和 Codex 共用）
│   ├── new-module/              #   新增业务模块
│   ├── pr-checklist/            #   提 PR 前自查
│   └── code-review/             #   审查 PR
├── .claude/                     # Claude Code 配置
│   ├── settings.json            #   权限规则
│   ├── hooks/                   #   锁定目录检查、受保护分支检查
│   ├── agents/                  #   代码审查、测试编写子代理
│   └── skills → ../.agents/skills
├── .codex/
│   └── skills → ../.agents/skills
├── .github/
│   ├── repo-settings/           # GitHub 仓库设置（分支保护等），以代码形式管理
│   ├── project-setup/           # 一键创建任务看板和任务 issue 的脚本
│   ├── ISSUE_TEMPLATE/          # 新建任务时使用的模板
│   ├── workflows/               # CI 流水线（待建）
│   ├── CODEOWNERS               # 每个目录由谁负责审查
│   └── pull_request_template.md # PR 描述模板
│
├── docs/
│   ├── prd/                     # 需求文档
│   ├── prototype/               # 产品原型（admin/、mini/）
│   ├── design/                  # 架构设计、管理端字段清单
│   ├── api/                     # 接口通用约定、接口契约（待写）
│   ├── adr/                     # 架构决策记录
│   ├── sql/                     # 表设计（表设计阶段编写）
│   └── tasks/                   # 任务清单、锁定目录、看板使用指南
│
├── frontend/
│   ├── web/                     # 管理后台前端（Vue 3）       ← 当前阶段
│   ├── mini/                    # 微信小程序（Uniapp）        尚未开工
│   └── app/                     # APP（Uniapp）               未来
└── backend/
    ├── admin/                   # 管理端后端（Go）            尚未开工
    ├── mini/                    # 小程序后端（Go）            尚未开工
    └── app/                     # APP 后端（Go）              未来
```

### 技术栈

| 领域 | 选型 |
| --- | --- |
| 管理后台前端 | Vue 3、Vite、TypeScript、Element Plus、Pinia、MSW（模拟接口） |
| 小程序前端 | Uniapp（CLI 版）、Vue 3、TypeScript、Pinia |
| 后端 | Go、Gin、GORM、Viper、Zap |
| 云服务 | **AWS**（悉尼区域）：RDS for MySQL、ElastiCache（Redis 兼容）、S3 + CloudFront、Secrets Manager |
| 代码托管与 CI | GitHub、GitHub Actions |
| AI 编码工具 | Claude Code、Codex |

---

## 三、每个人都必须知道的 12 条规则

完整规则见 `AGENTS.md`。以下 12 条违反了会直接造成问题，其中大部分有机器强制执行。

| # | 规则 | 违反时 |
| --- | --- | --- |
| 1 | **不在 `develop` 或 `main` 上直接提交**，从 develop 拉功能分支 | lefthook 拦截提交，GitHub 拒绝推送 |
| 2 | **PR 的目标分支是 `develop`**（发版和 hotfix 除外） | 合错分支需要额外同步 |
| 3 | 合进 develop 用 **Squash**；develop 合进 main 用 **Merge commit** | GitHub 只提供对应的合并方式 |
| 4 | **工程之间禁止互相引用代码** | 违反独立性，以后无法拆分 |
| 5 | **契约先行**：新接口或新字段，先改 `docs/api/` 下的契约，再改代码 | 前后端对接时对不上 |
| 6 | **只修改任务范围内的文件**；已锁定的目录，修改前要负责人同意 | Claude Code 钩子拦截；以后 CI 也会拦截 |
| 7 | **不提交密钥、本地配置、IDE 和系统文件**（`.env`、`*.pem`、`.idea/`、`.DS_Store` 等） | lefthook 和 GitHub 推送保护拦截。**仓库是公开的** |
| 8 | **ID 用字符串**，金额用**整数分**，时间用 **UTC** | 精度丢失、金额错误、时区错误 |
| 9 | **不手动修改自动生成的文件**（如从契约生成的类型） | 下次生成时被覆盖 |
| 10 | **你对 AI 写的每一行代码负责**，看不懂的不提交 | — |
| 11 | **不使用 `--no-verify` 跳过提交检查** | Claude Code 钩子拦截 |
| 12 | 后端：**不使用数据库锁**，用乐观锁或带旧状态条件的更新 | 违反架构决策 |

---

## 四、日常开发流程

详细步骤和命令见 `CONTRIBUTING.md` 第二部分。

```text
1. 在看板的「我的任务」视图找到任务，确认范围和依赖，把卡片拖到 In Progress
2. git checkout develop && git pull && git checkout -b feat/fe-web-xxx
3. 启动 Claude Code → plan 模式出计划 → 确认后切回 manual 模式执行
4. 运行检查（lint、类型检查、测试、构建），在 GoLand 中看一遍所有改动
5. /pr-checklist 自查
6. git push，然后 gh pr create --base develop，描述里写 Closes #issue编号
7. 等待审查（审查人当天给出意见），Squash 合并，任务自动移到 Done
8. git checkout develop && git pull && git branch -D feat/fe-web-xxx
```

### 命名约定

| 对象 | 格式 | 示例 |
| --- | --- | --- |
| 分支 | `类型/范围-描述` | `feat/fe-web-city` |
| PR 标题 | `类型(范围): 中文描述` | `feat(fe-web): 城市管理页面` |
| 发布 tag | `范围/v版本号` | `fe-web/v0.1.0` |

类型：`feat` `fix` `refactor` `test` `docs` `chore` `hotfix`。
范围：`fe-web` `fe-mini` `fe-app` `be-admin` `be-mini` `be-app` `docs` `repo`。

---

## 五、团队分工与任务

| 代号 | GitHub | 业务模块 |
| --- | --- | --- |
| A | @RealninX | 概览、订单、退款、举报 |
| B | @MoonLight-QAQ | 城市、商城类目、商品、配送 |
| C | @celine-hy | 登录、闲置类目、闲置 |

接口契约、工程骨架、共享区域由三人共同完成，拆成子任务，每个子任务有一位负责人。

### 管理后台前端的开发顺序

```text
W-00a 契约框架（B）
   ├─ W-00b A 的模块接口   W-00c B 的模块接口   W-00d C 的模块接口   （并行）
   ▼
W-01a 工程初始化（B）
   ├─ W-01b 请求与模拟（A）   W-01c 路由与布局（C）   W-01d 通用组件（A）   （并行）
   ▼
W-02 城市（B，示例模块，其他人照着它的写法开发）
   ▼
其余业务模块并行开发
```

每个任务的范围和依赖见 `docs/tasks/admin-web.md`；**状态和计划日期在 GitHub Project 看板上**，看板的「路线图」视图就是甘特图，可以直接拖动调整。

### 代码审查

每个模块有一位负责人和一位备份审查人，三人轮转。因为 GitHub 不允许作者批准自己的 PR，负责人修改自己的模块时，由备份审查人审查。共享区域和文档由三人中除作者外任意一人审查。详见 `.github/CODEOWNERS`。

---

## 六、开发前已完成的准备工作

### 1. GitHub 仓库设置

全部以代码形式保存在 `.github/repo-settings/`，修改要走 PR，由管理员执行 `apply.sh` 生效。

| 设置 | 内容 |
| --- | --- |
| 分支策略 | `develop` 为默认分支，日常开发合进它；`main` 只接收 `develop` 和 `hotfix/*` |
| `main` 的保护 | 必须通过 PR、1 人审批、只允许 Merge commit、禁止强制推送和删除 |
| `develop` 的保护 | 必须通过 PR、1 人审批、只允许 Squash、要求线性历史、禁止强制推送和删除 |
| 审批规则 | 有新提交时之前的审批失效；所有审查意见都处理完才能合并 |
| 管理员例外 | 可以跳过审批合并自己的 PR，但**不能绕过 PR 直接推送**。仅用于仓库设置、文档和紧急修复 |
| 发布 tag 保护 | 只有管理员能创建、修改、删除 `*/v*` 格式的 tag |
| 分支清理 | PR 合并后自动删除远程功能分支 |
| 安全 | 密钥扫描和推送保护、Dependabot 告警和安全更新、私下漏洞报告 |
| CI 权限 | 默认只读；外部 fork 的 PR 需审批后才能运行 CI |
| 公开仓库防护 | 仅协作者可提 issue 和 PR（每 6 个月需重新执行 `apply.sh` 续期） |

### 2. 本地提交检查（lefthook）

每次 `git commit` 前自动执行，**对所有人、所有 AI 工具都生效**：

- 禁止在 `develop` 和 `main` 上提交
- 禁止提交密钥、本地配置、IDE 和系统文件
- 自动格式化和 lint（各工程搭建后生效）

### 3. AI 编码规范

| 内容 | 位置 | 作用 |
| --- | --- | --- |
| 规则 | 根目录和各工程的 `AGENTS.md` | 所有 AI 工具都读取。`CLAUDE.md` 只负责导入它 |
| 操作手册（skill） | `.agents/skills/` | 新增模块、PR 自查、代码审查。Claude Code 和 Codex 通过符号链接共用 |
| Claude Code 权限 | `.claude/settings.json` | 禁止读取密钥、编辑 IDE 配置和自动生成的文件、强制推送；推送和安装依赖前需确认 |
| Claude Code 钩子 | `.claude/hooks/` | 拦截编辑锁定目录、在受保护分支上提交和推送、跳过提交检查 |
| 子代理 | `.claude/agents/` | 代码审查员（只读）、测试编写员（只写测试） |

### 4. 任务与锁定机制

- 每个任务是一个 GitHub issue，放在 GitHub Project 看板上。**拖动卡片改状态，拖动路线图上的横条改日期**；PR 合并后任务自动变为已完成。看板由 `.github/project-setup/` 中的脚本一键创建。
- 每个开发阶段一份任务清单（`docs/tasks/`），记录每个任务的范围、依赖和负责人。
- **任务完成后，其范围内的目录加入 `docs/tasks/locked-paths.txt`，默认不允许修改。**
- 修改已锁定的模块：先和负责人沟通 → PR 加 `unlock` 标签 → 负责人审批。
- 锁定通过三层执行：`AGENTS.md` 中的规则提醒 AI；Claude Code 钩子直接拦截；CI 检查（待建）阻止合并。

### 5. 设计文档

| 文档 | 内容 |
| --- | --- |
| `docs/design/architecture.md` | 系统组成、6 个工程的关系、技术选型、开发阶段、部署规划 |
| `docs/design/admin-data-dictionary.md` | 管理端 15 个业务对象的字段、11 组状态枚举、每个操作的状态规则 |
| `docs/api/conventions.md` | 接口通用约定：路径、响应格式、分页、ID、金额、时间、图片上传、错误码 |
| `docs/adr/` | 3 份决策记录：工程结构、分支策略、契约先行 |

### 6. 关键决策一览

| 决策 | 原因 | 详见 |
| --- | --- | --- |
| 前后端分离，每端完全独立，不共享代码 | 以后可以直接拆成独立仓库和服务 | `docs/adr/0001-project-structure.md` |
| develop + main 双分支 | 日常开发顺畅，同时有一层发版前的缓冲 | `docs/adr/0002-branch-strategy.md` |
| 契约先行，前端用模拟数据开发 | 前端可以先于后端开发，对接时不用改页面 | `docs/adr/0003-contract-first.md` |
| 云服务统一使用 AWS 悉尼区域 | 靠近用户，数据留在澳洲 | `docs/design/architecture.md` |
| 规则写在 `AGENTS.md`，强制检查放在 Git 和 CI 层 | 团队同时使用 Claude Code 和 Codex，规则要对所有工具生效 | `CONTRIBUTING.md` |

---

## 七、待确认事项

以下事项需要团队确认，**确认前不能开始写接口契约**的已标出。

| # | 事项 | 影响 | 阻塞契约 |
| --- | --- | --- | --- |
| 1 | 金额字段名是否统一以 `Cents` 结尾（如 `priceCents`） | 所有接口和前端代码 | ✅ 是 |
| 2 | 接口时间是否统一返回 UTC，前端按城市时区显示 | 所有接口和前端代码 | ✅ 是 |
| 3 | 区是否增加 `suburbs` 字段，用于把地图返回的 suburb 匹配到区（需和产品确认） | 配送设置、小程序下单 | ✅ 是 |
| 4 | 独立渠道进度及 `provider` / `providerRefundId` / `providerRefundStatus` 已确认，定义见字段清单；真实供应商与适配待接入时确定 | 退款页面 | 本轮可替换 Mock 不阻塞 |
| 5 | 字段清单中其他标注【建议】的条目（长度上限、类目能否改名、城市能否删除等） | 各业务模块 | 部分 |
| 6 | RealninX 的 PR #1「建立技术规范与商城前端任务基线」如何处理 | 可能与现有规则冲突 | — |
| 7 | CI 流水线（前端检查、PR 来源检查、锁定目录检查、依赖更新）由谁负责 | 必须在 W-02 合并前完成 | — |
| 8 | 微信支付需走跨境收款；小程序需以境外主体注册，需提前了解流程 | 只影响小程序阶段 | — |
| 9 | `docs/prd/` 下需求文档的文件名，与规则文件中引用的 `admin-prd.md`、`mini-prd.md` 是否一致；PRD 正文中的旧名称「巷口到家」和旧路径如何处理 | AI 能否找到需求 | — |

---

## 八、文档索引

| 想了解 | 看这里 |
| --- | --- |
| 仓库硬规则、接口与分支约定 | `AGENTS.md` |
| 环境配置、开发流程、审查、发版、hotfix、回滚、常见问题 | `CONTRIBUTING.md` |
| 某个工程的具体规则 | 该工程目录下的 `AGENTS.md` |
| 需求 | `docs/prd/` |
| 原型 | `docs/prototype/admin/`、`docs/prototype/mini/`，用浏览器打开 `index.html` |
| 架构 | `docs/design/architecture.md` |
| 管理端的字段和状态 | `docs/design/admin-data-dictionary.md` |
| 接口约定 | `docs/api/conventions.md` |
| 为什么这样设计 | `docs/adr/` |
| 任务的范围、依赖、负责人 | `docs/tasks/admin-web.md` |
| 任务的状态、计划日期 | GitHub Project 看板「拾澳 · 管理后台前端」 |
| 看板怎么用 | `docs/tasks/github-project-guide.md` |
| 谁负责审查哪部分代码 | `.github/CODEOWNERS` |
| 仓库设置怎么改 | `.github/repo-settings/README.md` |

遇到问题，先查 `CONTRIBUTING.md` 最后的「常见问题」。
