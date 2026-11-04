# 拾澳管理后台（frontend/web）

拾澳 PickAus 管理后台的网页前端，供店员在电脑上使用。

本文件说明怎么把工程跑起来。**开发规则**（目录约定、接口调用、命名、样式、测试）见同目录的 [AGENTS.md](./AGENTS.md)，协作流程见仓库根目录的 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

技术栈：Vue 3 + Vite + TypeScript + Element Plus + Pinia，接口用 MSW 模拟，测试用 Vitest。

## 环境要求

| 工具 | 版本 | 以哪里为准 |
| --- | --- | --- |
| Node.js | 24.22.1 | `.node-version` |
| pnpm | 12.15.0 | `package.json` 的 `packageManager` 字段 |

**Node**：推荐用 [fnm](https://github.com/Schniz/fnm) 或 nvm 管理版本。fnm 在进入目录时会自动读取 `.node-version`：

```bash
brew install fnm
# 在 ~/.zshrc 中加入下面一行，然后重新打开终端
eval "$(fnm env --use-on-cd)"

cd frontend/web
fnm install   # 安装 .node-version 中的版本
```

**pnpm**：不要用 `brew install pnpm` 或 `npm i -g pnpm` 安装，否则版本可能和工程不一致。用 Node 自带的 corepack，它会自动使用 `packageManager` 指定的版本：

```bash
corepack enable
pnpm -v       # 应输出 12.15.0
```

## 快速开始

```bash
cd frontend/web
pnpm install
pnpm dev      # 默认开启模拟接口，不需要后端
```

## 常用命令

所有命令都在 `frontend/web` 目录下执行。

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 类型检查并生产构建，产物在 `dist/` |
| `pnpm preview` | 本地预览生产构建的结果 |
| `pnpm typecheck` | 类型检查 |
| `pnpm lint` | ESLint 检查（不自动修复） |
| `pnpm format` | 用 Prettier 格式化全部文件 |
| `pnpm format:check` | 只检查格式，不修改 |
| `pnpm test` | 运行一次全部单元测试 |
| `pnpm test:watch` | 监听文件变化，自动重跑测试 |
| `pnpm gen:api` | 根据接口契约重新生成接口类型 |

**提 PR 前，`lint`、`typecheck`、`test`、`build` 必须全部通过。**

## 环境变量

| 变量 | 含义 | 开发环境 | 生产环境 |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | 接口前缀 | `/api/admin` | `/api/admin` |
| `VITE_USE_MOCK` | 是否启用 MSW 模拟接口 | `true` | `false` |

- 取值在 `.env.development` 和 `.env.production` 中，类型声明在 `env.d.ts` 中。新增变量时，两处都要改。
- 环境变量都是字符串，判断时写 `import.meta.env.VITE_USE_MOCK === 'true'`。
- 本地需要不同的值时，新建 `.env.development.local` 覆盖，它已被 git 忽略。**不要在任何 `.env` 文件中放密钥**，仓库是公开的。

## 接口类型

接口的入参和出参类型从契约 `docs/api/admin.openapi.yaml` 生成，放在 `src/api/generated/`。

```bash
pnpm gen:api
```

契约修改后要重新执行。生成的文件**不要手动修改**，lint 和 Prettier 也会跳过这个目录。

## 请求与模拟接口（W-01b）

- 模块 API 只调用 `src/api/http.ts` 导出的 `http.request('/资源', options)`；默认 GET，写入指定 `method` 和 `data`，筛选用 `params`。
- `options.parse` 必填：先校验 `unknown` 数据，再转换成模块需要的结果。入参和结果类型引用生成类型，不直接用断言假装完成校验。请求层校验 JSON/响应包装并拆出 `data`，模块解析器负责业务对象字段校验。
- `signal` 接收 `AbortController.signal`，页面卸载或请求过期时取消；请求层不自动重试，避免重复写入。
- 错误为 `ApiError`：`kind` 区分业务、HTTP、网络、超时、取消、协议错误；服务端业务 `code` 原样保留，客户端故障的 `code` 为 null。`status` 为可用的 HTTP 状态，字段校验信息在 `details`。文案来自 `src/constants/error-code.ts`，不回显任意服务端消息，不保留带认证头的原始请求/响应。
- 业务判断使用 `ERROR_CODE.BAD_PASSWORD` 等常量，每项同时提供 `code` 和 `message`；`isErrorCode(error, ERROR_CODE.BAD_PASSWORD)` 从 `unknown` 收窄为匹配的 `ApiError`。不要在页面手写错误码字符串。常量覆盖契约全部错误码并检查 key/code 一致；未知未来错误码仍原样保留，显示通用安全文案。当前契约使用字符串码，整数码需另行讨论后修改契约。
- W-01c 在创建登录 store/router 后调用 `http.setAuth({ getToken, onNeedLogin })`。每次请求读取当前管理员 token；`onNeedLogin` 负责清理登录并跳转。过期旧请求不会注销已更新的登录；同一失效 token 去重通知。登录请求指定 `anonymous: true`；`BAD_PASSWORD` 不触发全局注销。未接适配器时，`NEED_LOGIN` 默认跳转 `/login`。
- 开发入口在挂载前动态启动 MSW 3，注册失败阻止挂载；生产入口不启动或导入 MSW。注册选项使用 `onUnhandledFrame`（不是 MSW 2 的 `onUnhandledRequest`），详见 [MSW 3 迁移说明](https://mswjs.io/docs/migrations/2.x-to-3.x)。
- 模块 handler 在 `src/mocks/handlers/index.ts` 的最后兜底之前注册，数据用生成类型。尚未注册的管理接口返回契约错误，不透传到真实服务；测试 handler 仅在测试文件中，不进入应用接口契约。
- worker 由 `pnpm exec msw init public --save` 生成，禁止手改。生产 `dist` 会保留这个静态文件，但入口不注册它，应用 JS 不包含 MSW 运行时代码。

当前类型以 `develop` 已合入的契约为准，已包括 W-00b 的 A 区块和 PR #43 的 C 区块（登录、闲置类目、闲置）。B 区块后续合入后，再按解锁流程运行 `pnpm gen:api`；不从尚未合并的 PR 复制接口。仅锁定 `src/constants/error-code.ts`，业务模块可以在 `src/constants/` 新建状态文案文件；`src/mocks/handlers/index.ts` 保持开放，模块在兜底 handler 前追加注册。

## 依赖管理

- **只用 pnpm**，不要用 npm 或 yarn，以免生成其他锁文件。
- **只安装发布满 7 天的版本**。`pnpm-workspace.yaml` 中的 `minimumReleaseAge` 会自动跳过刚发布的版本，包括间接依赖。刚发布的版本可能有问题或被投毒。
- **新增依赖前，先确认现有依赖能否满足**，确需新增时在 PR 描述里说明理由。

## 提交检查

仓库用 lefthook 在提交前自动检查（需要先在仓库根目录执行一次 `lefthook install`）。对本工程，它会对暂存的文件执行 Prettier 格式化和 ESLint 检查，未通过时提交会被拦下。不要用 `git commit --no-verify` 跳过。

## 常见问题

**`pnpm install` 报 `ERR_PNPM_IGNORED_BUILDS`**

新增的依赖（或它的依赖）带有安装脚本。pnpm 默认不运行安装脚本，并要求每个这样的包都明确表态。确认该脚本是否必要后，在 `pnpm-workspace.yaml` 的 `allowBuilds` 中加上一行：`true` 表示允许运行，`false` 表示拒绝，并写注释说明原因。

**在 GoLand 等图形界面中提交时，提示 `pnpm: command not found`**

图形界面的 git 不会加载终端的配置文件（如 `~/.zshrc`），找不到 fnm 管理的 Node 和 pnpm。可以改在终端中提交，或者从终端启动 IDE，让它继承终端的环境变量。

**`pnpm -v` 的版本不是 12.15.0**

pnpm 不是通过 corepack 使用的。卸载用其他方式安装的 pnpm 后，执行 `corepack enable`。

