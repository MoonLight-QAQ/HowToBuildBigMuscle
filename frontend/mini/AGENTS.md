# frontend/mini · 微信小程序前端规则

本文件是 `` 工程的规则，在仓库根目录 `AGENTS.md` 的基础上补充。两者冲突时，以根目录为准。

> **当前状态：尚未开始。** 本工程在管理后台前端和表设计之后开发。开工前需要先完成：
> 小程序接口契约 `docs/api/mini.openapi.yaml`、UI 设计稿、任务清单 `docs/tasks/mini.md`。
> 开工时会补全本文件。

## 工程概述

拾澳的微信小程序，面向顾客：浏览商城、下单支付、发布和浏览二手闲置。

- **需求**：`docs/prd/mini-prd.md`
- **交互**：`../../docs/prototype/mini`
- **接口**：`docs/api/mini.openapi.yaml`（待编写），通用约定见 `docs/api/conventions.md`

## 技术栈

| 用途 | 选型 |
| --- | --- |
| 框架 | Uniapp（CLI 版，基于 Vite）+ Vue 3 `<script setup>` |
| 语言 | TypeScript，严格模式 |
| 状态管理 | Pinia |
| 请求 | `uni.request` 的封装，只在 `src/api/request.ts` 中使用。**不使用 axios**（小程序环境不支持） |
| 接口类型 | openapi-typescript，从契约生成 |
| 测试 | Vitest（用于工具函数和业务逻辑） |
| 包管理 | pnpm |

本工程**只编译为微信小程序**。APP 是另一个独立工程（`../app`），不要在本工程中添加 APP 相关的条件编译。

## 常用命令

所有命令都在 `` 目录下执行。

| 命令 | 作用 |
| --- | --- |
| `pnpm dev:mp-weixin` | 开发模式编译，用微信开发者工具打开 `dist/dev/mp-weixin` 预览 |
| `pnpm build:mp-weixin` | 生产构建 |
| `pnpm gen:api` | 根据契约重新生成接口类型 |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | 代码检查、类型检查、单元测试 |

## 目录约定

```text
src/
├── pages/                 # 主包：只放 4 个 tabBar 页面
├── subpackages/           # 分包：其余页面按业务分组
│   ├── mall/              #   类目、搜索、商品详情
│   ├── order/             #   确认订单、支付结果、订单、退款、地址
│   ├── flea/              #   帖子、发布、我的闲置、申请联系、举报
│   └── user/              #   登录、绑定手机、城市、联系方式、消息、客服
├── api/                   # request.ts 加每个模块一个文件
├── stores/                # 只放跨页面状态：用户、当前城市和语言、购物车
├── components/            # 通用组件
├── platform/              # 微信专属能力的封装
├── locale/                # 中英文文案
├── utils/
├── constants/
├── types/
└── static/                # 只放体积很小的图标
```

## 小程序特有的规则

### 包体积

- 微信限制主包不超过 2MB。主包只放 tabBar 页面和它们直接依赖的代码，其余页面一律放进分包。
- 图片放在 OSS 上，不要放进 `static/`。`static/` 只放 tabBar 图标这类体积很小的文件。

### 平台能力

- 登录（`wx.login`）、支付（`requestPayment`）、订阅消息、分享等微信专属能力，**只能在 `src/platform/` 中调用**。页面只调用 `platform/` 导出的函数。
- 这样以后开发 APP 时，只需替换这一层的实现。

### 三级身份

用户分为游客、已登录、已绑手机三级。后端返回 `NEED_LOGIN` 或 `NEED_PHONE` 时，由 `request.ts` 统一跳转到登录页或绑定手机页，页面中不要单独处理。

### 文案与双语

- 界面上所有文字都写在 `src/locale/` 的中英文文件中，页面里不写死任何中文或英文。
- 接口返回的双语字段（如 `nameZh`、`nameEn`），用工具函数按当前语言取值，不要在页面里写 `lang === 'zh' ? ... : ...`。

### 隐私

- 不在日志、埋点或本地存储中记录任何人的手机号和微信号。
- 别人的联系方式只在获准查看的页面上显示，离开页面后不保留。

## 接口与数据

- 契约先行的流程、接口调用的分层、类型只能从契约生成，这些规则与管理后台相同：先改契约，再生成类型，再改代码。
- **模拟接口不能用 MSW**（小程序环境不支持 Service Worker）。在 `request.ts` 中按环境变量切换为本地模拟数据，模拟数据同样必须使用生成的类型。
- ID 用字符串，金额用分，时间用 ISO 8601，见根目录 `../../AGENTS.md`。
- 购物车只保存在本地，不调用接口。

## 样式

- 等 UI 设计稿完成后再开发页面样式。
- 尺寸单位用 `rpx`。颜色、字号等使用 `uni.scss` 中的变量，不要写死。
