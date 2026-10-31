# 拾澳商城管理端基础

当前任务为 **RN-SETUP-01（本地验收通过，待 PR 审查）**：商品、商城类目、配送、城市的只读入口、独立数据层、接口草案和 Mock 诊断。本文件不表示业务故事已完成、真实接口可用或应用已经部署。

任务关联 [Issue #10](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/issues/10)，由 RealninX 认领；其余业务故事仍待办。

## 环境与启动

本工程固定 Node `24.22.1`、pnpm `11.25.0`，TypeScript 为 `5.9.3`。使用 Vue 3 / Vite / Element Plus；Pinia 已在入口注册，当前尚无业务 store，列表与表单保持页面状态。依赖版本以本目录 `package.json` 和 `pnpm-lock.yaml` 为准，不生成 npm/yarn 锁文件。

从仓库根目录进入本工程后执行：

```sh
cd frontend/web
pnpm install --frozen-lockfile
pnpm dev
```

开发服务器地址以终端输出为准。本轮没有真实管理员账号、密码、支付、数据库或对象存储要求，不要填入真实凭据。

## Mock 与 HTTP

- `VITE_USE_MOCK=true` 时启动 MSW，拦截 HTTP 并按当前契约草案返回演示数据。
- `VITE_USE_MOCK=false` 时关闭 MSW，请求会发向所配置的 HTTP 目标；**本轮未提供真实服务**，关闭 Mock 不等于接口已联通。`VITE_API_BASE_URL` 留空使用当前页面 origin；显式配置只填例如 `http://localhost:8080` 的 origin。模块路径已包含 `/api/admin`，不能在该变量里重复填写，否则会拼出错误地址。真实地址及认证需要团队对接后配置，不能为“让页面成功”关闭证书校验或伪造保存结果。
- 修改环境配置后重启 Vite。环境文件不提交真实 Token、密码或云密钥；生产环境是否允许 Mock 需在正式发布任务中另行核对。
- MSW 的 `public/mockServiceWorker.js` 是生成并提交的文件，不能手工编辑。更新 MSW 后按其生成命令更新，并核查变更。

四页的场景选择支持：成功、空列表、401、403、422、409、网络失败、响应格式错误。422/409 等属于本轮诊断草案，不代表已经存在真实写入或服务端冲突处理。取消请求不显示业务失败；切场景或离开页面时旧结果不得覆盖新结果。

页面包括 `/products`、`/mall-categories`、`/delivery` 和 `/cities`。当前只读，不提供真实商品新增/编辑、上传、库存、上下架、点赞、类目删除、费用或时段保存、城市方式写入。

## 演示备注草稿

每个模块的备注只是本地字符串，不是商品表单，也不向服务器提交。`useDraft(key)` 使用 `sessionStorage`，键前缀为 `shiao:admin:rn-setup-01:<module>`：

- 同一标签页切路由或刷新可保留；模块草稿互不覆盖。
- “重置”清除当前模块备注，不影响其他模块。
- 标签页会话结束通常清除；部分浏览器可能随恢复会话而恢复，不承诺永久删除。
- 存储不可用时 `storageAvailable` 提示降为内存草稿；刷新后可能丢失。

不要输入真实客户资料、密码或任何秘密。备注状态不等于业务保存成功。

## 数据层与契约

接口来源为 [管理端 OpenAPI 草案](../../docs/api/admin.openapi.yaml)，尚未宣称后端团队已经接受。axios 只在 `src/api/http.ts` 中使用；模块 API 返回已校验并拆包的 `data`，页面只消费状态和命名操作。金额单位、ID、双语、时间和错误语义以草案及待确认事项为准，不从原型 `¥` 推断本位币。

契约变更后先生成，再同步 Mock 和模块数据层：

```sh
pnpm gen:api
```

该命令由 `../../docs/api/admin.openapi.yaml` 生成 `src/api/generated/admin.ts`。生成文件不手工修改；生成后应检查差异并在同一 PR 提交需要的更新。

## 验证与交付

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`test` 为非监听的 `vitest run`；`build` 包含类型检查后再构建。CI 在契约/本工程变化时还会冻结锁文件安装，并验证再次生成 API 类型没有漂移。保存配置文件或提供上述命令，不表示它们已在当前提交上通过；实际结果由 PR/本地验证记录说明。

真实管理员鉴权、服务器库存与预留、订单快照、对象存储和跨端联调均未由本轮 Mock 证明。后续只围绕商城四模块完成业务故事，不顺手实现伙伴的登录、订单、支付、退款、闲置、举报或地图模块；不部署。

关联：[工程决策](../../docs/adr/0001-admin-web-foundation.md)、[任务清单](../../docs/tasks/admin-web.md)、[实际验证记录](../../docs/tasks/rn-setup-01-verification.md)。开发分支基于 `develop`，PR 指向 `develop`。
