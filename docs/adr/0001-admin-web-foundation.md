# ADR 0001：商城管理端基础与可替换 Mock

日期：2026-11-01。状态：RN-SETUP-01 实施中，关联 [Issue #10](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/issues/10)，由 RealninX 认领，供 PR 审查；不是团队规则已获批准或真实服务已完成的证明。

## 背景

已合并的仓库目录使用 `frontend/web` 与 `frontend/mini`，日常集成分支为 `develop`。此前提出的另一管理端路径不再采用。本轮只建立商品、商城类目、配送、城市四模块的管理端基础：只读列表、数据层、Mock 和失败场景，以及无业务效力的本地备注草稿。

`chore/repo-rules` 提出的技术栈和目录约定仍在审查中。为减少后续冲突，本次实现主动采用与其相容的前端选型；不把未合并文件中的审批、任务锁、账号配置或安装示例当成新的执行授权。

## 决策

1. 网页管理端放在 `frontend/web`，使用 Vue 3 组合式 API、TypeScript 严格模式、Vite、Element Plus 默认主题及 Vue Router。Pinia 已在入口注册，作为团队后续共享状态入口，当前尚无业务 store；没有跨页共享状态时不为列表或表单建立全局 store。
2. 固定 Node `24.22.1`、pnpm `11.25.0` 和 TypeScript `5.9.3`；TypeScript 版本兼容所选 `openapi-typescript` 的 peer 范围。其他依赖以该工程 `package.json` 与 `pnpm-lock.yaml` 为准，不在另一个工程复用运行时代码或锁文件。
3. HTTP 业务契约先以 `docs/api/admin.openapi.yaml` 的**草案**描述。通过 `pnpm gen:api` 生成 `src/api/generated/admin.ts`，禁止手工维护与契约重复的响应类型。契约、生成类型、Mock 与数据层需要一起更新。
4. axios 仅在 `src/api/http.ts` 使用。独立模块 API 返回已拆包的 `data`，响应结构和失败结果在数据层核对；View 绑定状态、诊断结果及命名操作，不直接请求或清洗服务端数据。请求路径自带 `/api/admin` 前缀，`VITE_API_BASE_URL` 留空使用当前 origin；显式配置只填例如 `http://localhost:8080` 的 origin，不能再次带 `/api/admin`。
5. MSW 拦截 HTTP 提供 Mock，使用 `VITE_USE_MOCK` 切换。当前没有真实管理后端；关闭 Mock 只改变请求去向，不能使不存在的接口变成可用服务。页面不根据 Mock 模式改写业务结果。
6. 四页均提供成功、空数据、401、403、422、409、网络失败及响应格式错误场景。它们是基础数据层/交互诊断，不代表已经实现登录、写入、校验或并发业务；取消的请求不显示为业务失败，旧请求结果不得覆盖新结果。
7. `useDraft(key)` 保存的是本地演示备注字符串，键前缀为 `shiao:admin:rn-setup-01:<module>`。使用 `sessionStorage` 保留同一标签页中的路由切换与刷新草稿，重置只清当前模块；不上传、不视为保存到服务器，不存真实顾客或凭据。存储被禁用时退化为内存状态，并通过 `storageAvailable` 明确提示。标签页会话结束通常清除，浏览器恢复会话可能恢复数据，因此不作绝对删除保证。
8. 用 Vitest 与 Vue Test Utils 验证必要的数据层与交互行为。PR CI 限定本工程及其契约输入，执行冻结锁文件安装、类型生成漂移检查、lint、typecheck、test、build；实际结果由当前提交的运行证据决定。

CI 的第三方 Actions 以完整提交 SHA 固定，并在配置中标注核验版本：[checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1)、[setup-node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0)、[pnpm/action-setup v6.1.0](https://github.com/pnpm/action-setup/releases/tag/v6.1.0)。这仅确认所选官方版本及输入接口，不表示远程工作流已运行通过。

## 草案兼容取舍

本轮只读契约保留原始 PRD 的最小商品 `name`、商城类目 `name` 字段，城市使用 `nameZh` / `nameEn`。待审前端规则提出商品、类目、城市等统一双语录入；这与原型的单语言录入字段存在差异。完整双语字段、必填和缺译策略在对应业务故事中对齐，不能为凑齐草案字段编造英文商品资料，或把演示翻译当成已批准经营事实。

`pnpm-workspace.yaml` 是本工程 pnpm 安装策略的一部分，连同锁文件提交；可选 `@parcel/watcher` 构建脚本保持禁用，不为了本轮只读页开启无关安装脚本。具体依赖策略按当前文件及 PR 证据审查，不据此扩大其他工程的安装配置。

## 范围与后果

RN-SETUP-01 不完成商品新增/编辑、真实图片上传、库存修改、上下架、点赞写入、类目删除、配送配置写入或城市切换。后续业务故事依次接入同一数据层及契约；不能因为基础只读页能打开就把这些故事标为完成。

共享管理员认证、导航、上传、区来源、库存读模型及后端写入由团队对齐。此工程不实现伙伴的登录、概览、订单、支付、退款、举报、闲置、地图，也不创建 Go 服务、数据库、云资源或部署。

以下业务事项仍待确认：本位币代码，时段的时区/跨日/重叠规则，以及是否至少保留一个启用时段。原需求已要求至少保留一个时段条目；原型中的 `¥`、样例金额和待审规则中的澳元分，均不能单独替代实际业务确认。接口草案中的错误和字段只是当前可审查约定，不表示后端团队已经接受。

开发在基于 `develop` 的功能分支进行，PR 目标为 `develop`，不直接向 `develop` 或 `main` 提交。本 ADR 不应用远程仓库设置、不合并 PR、不发布。

## 关联

- [工程启动与 Mock 说明](../../frontend/web/README.md)
- [当前任务清单](../tasks/admin-web.md)
- [管理端接口草案](../api/admin.openapi.yaml)
