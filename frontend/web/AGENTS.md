# frontend/web · 管理后台前端规则

本文件是 `frontend/web` 工程的规则，在仓库根目录 `AGENTS.md` 的基础上补充。两者冲突时，以根目录为准。

## 工程概述

拾澳管理后台的网页前端，供店员在电脑上使用。

- **需求**：`docs/prd/admin-prd.md`
- **交互**：`docs/prototype/admin/`（只有交互逻辑，没有 UI 设计）
- **接口**：`docs/api/admin.openapi.yaml`，通用约定见 `docs/api/conventions.md`
- **任务与负责人**：`docs/tasks/admin-web.md`

**当前阶段没有后端。** 所有接口都通过 MSW 模拟，模拟数据必须严格符合接口契约。后端完成后关闭模拟即可对接，页面代码不应因此改动。

## 技术栈

| 用途 | 选型 |
| --- | --- |
| 框架 | Vue 3，只用 `<script setup>` 和组合式 API，不用选项式 API |
| 语言 | TypeScript，严格模式 |
| 构建 | Vite |
| 组件库 | Element Plus（暂用默认主题，见「样式」一节） |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| 请求 | axios，只在 `src/api/http.ts` 中使用 |
| 接口类型 | openapi-typescript，从契约生成 |
| 模拟接口 | MSW |
| 测试 | Vitest + Vue Test Utils |
| 代码检查 | ESLint + Prettier |
| 包管理 | pnpm（不要使用 npm 或 yarn，以免生成其他锁文件） |

新增依赖前先确认现有依赖能否满足。确需新增时，在 PR 描述里说明理由。

## 常用命令

所有命令都在 `frontend/web` 目录下执行。

| 命令 | 作用 |
| --- | --- |
| `pnpm install` | 安装依赖 |
| `pnpm dev` | 启动开发服务器（默认开启模拟接口） |
| `pnpm gen:api` | 根据 `docs/api/admin.openapi.yaml` 重新生成接口类型 |
| `pnpm lint` | 代码检查 |
| `pnpm typecheck` | 类型检查 |
| `pnpm test` | 单元测试 |
| `pnpm build` | 生产构建 |

**声称任务完成之前，`lint`、`typecheck`、`test`、`build` 必须全部通过。**

## 目录约定

```text
src/
├── api/
│   ├── http.ts              # 请求封装，全工程唯一使用 axios 的地方
│   ├── generated/           # 从契约生成的类型，禁止手动修改
│   └── <模块>.ts            # 每个业务模块一个文件，导出该模块的接口函数
├── mocks/
│   ├── browser.ts           # 模拟启动入口
│   ├── handlers/
│   │   ├── index.ts         # 汇总所有模块的 handler
│   │   └── <模块>.ts        # 每个模块一个文件
│   └── data/<模块>.ts       # 每个模块的模拟数据
├── router/
│   ├── index.ts             # 路由表
│   └── guard.ts             # 登录守卫
├── stores/                  # 只放跨页面共享的状态
├── layouts/                 # 页面布局
├── views/<模块>/
│   ├── <名称>View.vue       # 页面入口组件
│   └── components/          # 只在本模块内使用的组件
├── components/              # 被两个及以上模块使用的通用组件
├── composables/             # 组合式函数，命名为 useXxx
├── utils/                   # 纯函数工具
├── constants/               # 常量：状态枚举的显示文案、错误码等
├── types/                   # 不来自契约的通用类型
├── assets/
└── styles/
```

### 一个业务模块由哪些文件组成

以「城市」为例，一个模块只包含以下文件，任务清单里的「范围」也按此划分：

```text
src/views/city/
src/api/city.ts
src/mocks/handlers/city.ts
src/mocks/data/city.ts
```

以及 `src/router/index.ts` 中**属于该模块的那几条路由**。

### 共享区域

以下文件和目录被所有模块共用，修改时影响所有人：

`src/api/http.ts`、`src/router/guard.ts`、`src/layouts/`、`src/components/`、`src/composables/`、`src/utils/`、`src/styles/`、`src/stores/`

规则：

- 开发业务模块时，**不要顺手修改共享区域**。确实需要时，先告诉用户，并在 PR 描述里单独列出对共享区域的改动。
- 一个组件只在一个模块里用，就放在该模块的 `views/<模块>/components/` 下，不要放进 `src/components/`。有第二个模块要用时，再移到 `src/components/`。

## 命名

| 对象 | 规则 | 示例 |
| --- | --- | --- |
| Vue 组件文件 | PascalCase | `BilingualInput.vue` |
| 页面组件 | PascalCase，以 `View` 结尾 | `OrderListView.vue` |
| TS 文件 | kebab-case | `mall-category.ts` |
| 组合式函数 | `use` 开头，camelCase | `useTable.ts` |
| 路由路径 | kebab-case | `/mall-categories` |
| 路由名称 | PascalCase | `MallCategoryList` |
| 测试文件 | 与被测文件同名，后缀 `.spec.ts`，放在同一目录 | `money.spec.ts` |

## 页面与路由

页面以原型为准，对应关系如下：

| 原型页面 | 路由路径 | 模块目录 |
| --- | --- | --- |
| 登录 | `/login` | `login` |
| 概览 | `/` | `dashboard` |
| 订单列表 | `/orders` | `order` |
| 订单详情 | `/orders/:id` | `order` |
| 退款列表 | `/refunds` | `refund` |
| 退款详情 | `/refunds/:id` | `refund` |
| 商品列表 | `/products` | `product` |
| 新增商品 | `/products/new` | `product` |
| 编辑商品 | `/products/:id/edit` | `product` |
| 商城类目 | `/mall-categories` | `mall-category` |
| 配送设置 | `/delivery` | `delivery` |
| 城市 | `/cities` | `city` |
| 闲置封面墙 | `/listings` | `listing` |
| 闲置详情 | `/listings/:id` | `listing` |
| 闲置类目 | `/flea-categories` | `flea-category` |
| 举报 | `/reports` | `report` |

除 `/login` 外，所有页面都需要登录，并使用 `AdminLayout` 布局。页面组件一律用路由懒加载（`() => import(...)`）。

## 接口调用

这是本工程最重要的规则。目的是：后端完成后，关闭模拟就能直接对接，页面代码一行不改。

### 契约先行

需要新接口或新字段时，按以下顺序进行，**不能跳步**：

1. 修改 `docs/api/admin.openapi.yaml`。
2. 执行 `pnpm gen:api`，重新生成类型。
3. 修改或新增 `src/mocks/` 下的模拟接口和数据。
4. 修改 `src/api/<模块>.ts`。
5. 修改页面。

修改契约属于修改共享内容，会影响后端的实现。改之前先告诉用户。

### 规则

1. **页面和组件中不直接发请求。** 只调用 `src/api/<模块>.ts` 导出的函数；这些函数内部通过 `http.ts` 发请求。
2. **接口的入参和出参类型，一律从 `src/api/generated/` 中取。** 不要手写与契约重复的类型，不要使用 `any`。
3. **`src/api/<模块>.ts` 中的函数，返回 `data` 部分。** 统一响应格式的拆包由 `http.ts` 完成，失败时抛出带 `code` 的错误。
4. **错误处理分两层：**
   - `http.ts` 统一处理：未登录（跳转登录页）、网络错误、服务器错误。
   - 业务错误（如 `BAD_PASSWORD`、`HAS_PRODUCTS`）在调用处根据 `code` 处理，提示文案定义在 `src/constants/error-code.ts`，不要在页面里写死。

### 模拟接口

1. 页面用到的每一个接口，都必须有对应的模拟 handler。
2. 模拟数据必须使用生成的类型声明，保证与契约一致；契约改动后，类型检查会指出需要同步修改的地方。
3. 每个写操作（新增、修改、删除、状态变更）至少模拟一个失败场景，便于开发错误提示。
4. 模拟接口要模拟真实的业务规则。例如订单「开始配送」只对待配送状态有效，对其他状态返回对应的错误码。
5. 是否启用模拟由环境变量 `VITE_USE_MOCK` 控制。不要在业务代码里判断是否处于模拟状态。

## 数据显示与输入

| 数据 | 规则 |
| --- | --- |
| ID | 字符串。不要用 `Number()` 转换，不要做数值比较 |
| 金额 | 接口中是整数「分」。显示时用 `src/utils/money.ts` 的函数转换为元；表单输入的元，在提交前转换为分。**不要对元做浮点运算** |
| 时间 | 用 `src/utils/date.ts` 的函数格式化，不要直接调用 `toLocaleString()` |
| 状态枚举 | 显示文案和标签颜色统一定义在 `src/constants/` 下，不要在页面里写 `if (status === 'pending')` 之类的文案映射 |
| 双语字段 | 管理后台界面只有中文，但商品、类目、城市、区等数据有中英文两个字段。表单中用 `BilingualInput` 组件同时录入，两个都是必填 |
| 图片 | 通过 OSS 直传，接口中只保存对象 key；显示时用工具函数拼接完整地址 |

## 状态管理

- Pinia 只放**跨页面**共享的状态，如登录信息。
- 列表数据、表单数据、筛选条件属于页面自己的状态，放在页面组件里，不要放进 store。

## 样式

暂时没有 UI 设计稿，先用 Element Plus 默认主题开发。以后有设计稿时统一换肤，所以：

1. 颜色、间距、圆角等使用 `src/styles/variables.scss` 中的变量，不要在组件里写死颜色值。
2. 优先使用 Element Plus 组件的属性实现效果，不要用 `:deep()` 覆盖组件内部样式。确实需要时，写在 `src/styles/` 下的全局样式里，并加注释说明原因。
3. 组件内的样式加 `scoped`。

## 测试

- `src/utils/` 和 `src/composables/` 中的每个函数都要有单元测试。
- 页面中有业务规则的逻辑（如按状态决定显示哪些操作按钮），抽成纯函数后测试。
- 测试文件与被测文件放在同一目录，后缀 `.spec.ts`。

## 禁止修改的文件

| 文件 | 原因 |
| --- | --- |
| `src/api/generated/` | 由 `pnpm gen:api` 生成，改契约后重新生成 |
| `public/mockServiceWorker.js` | 由 MSW 生成 |
| `pnpm-lock.yaml` | 只能由 `pnpm install` 等命令更新，不要手动编辑 |
