# 0004. Realnin 管理端范围重置与契约基线

- 日期：2026-11-01（Australia/Sydney）
- 决定来源：用户在本次会话的明确指令与后续确认
- 当前 Story：W-00b，统一任务入口为 [Issue #17](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/issues/17)；进度以 Projects 为准
- 分支：`feat/docs-realnin-admin-contract`，创建自 `develop` 的 `b9f7d2d`，公共契约基线为 `104ee58`（含 PR #38 修复）
- 规则依据：最新 `develop`；原 `chore/repo-rules` 已合并并删除，遵循 Projects 协作规则

## 范围

用户取消此前的商城四模块工作，明确重新负责**订单、退款、概览、举报**。举报的负责人变更以本次用户指令为准；其他成员模块不扩展。本轮提交契约及对应的需求/字段说明对齐；生成类型归后续 W-01b 独立 PR。后续按[Story 清单](../tasks/realnin-admin-stories.md)逐项建立分支和 PR。

旧商城 PR #1、#11 已取消，旧个人分支清理；不带入旧商城页面、路由、接口、Mock 或 RN 商城任务。团队原始原型、需求与占位目录属于团队资料，继续保留。Git 历史保留正常追溯记录，不声称消除了公开仓库的历史副本。

团队新建 Projects 后，W-00b 使用看板内既有 Issue #17；此前 Issue #12 保留交叉引用。PR #13 作为本 Story 的契约交付，按模板关联任务，通过同伴审查并合入 `develop` 后自动关闭；不由 AI 关闭 Issue 或修改看板状态、日期、负责人。

## 用户已定稿的口径

管理后台前端采用 **Vue 3 + Pinia**，后端采用 **Go**。遵循仓库现有的 Vite、TypeScript、Element Plus 与统一 Axios 请求约定；Pinia 仅承载登录信息等跨页面共享状态，列表、筛选和表单状态留在所属页面/组合式函数。本轮仍为前端契约阶段，不提前开发 Go 服务。小程序和 App 不属于本 Story。

1. 金额为澳元分，字段以 `Cents` 结尾；时间返回 UTC，由展示端按城市 IANA 时区格式化。
2. 用户已确认退款审核与渠道进度独立、实际渠道未定且先做可替换 Mock；评审方同意渠道中性字段。退款字段、五枚举、空值、入账和未终结额度规则统一放在[字段清单](../design/admin-data-dictionary.md)；本文件仅保留决定来源，不再另立退款定义文档。本轮不接入真实退款、支付或云资源。
3. 2026-11-02 用户明确确认配送管理员可见完整收货电话。订单详情采用必返字符串 `contactPhone`，替换临时的 `contactPhoneMasked`。只有具备本订单配送资料查看权限的管理员可以获取含电话的 Order 响应，权限不足返回403且不返回联系人对象；配送/送达操作在任何写入前同时校验动作及资料查看权限，403不改变订单状态或版本。此决定作为订单履约场景对架构第136行泛化隐私描述的明确例外，用户简表、订单列表、退款、举报和闲置投影仍不返回私人联系方式。

电话示例使用 `0491 570 006`，依据 [ACMA 官方虚构号码清单](https://www.acma.gov.au/phone-numbers-use-tv-shows-films-and-creative-works)（2026-11-02核验），不采用真实顾客资料。这是展示示例，不执行呼叫或短信。

## 契约与协作边界

[W-00a #16](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/issues/16) 已通过 [PR #37](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/pull/37) 合入 `develop`。已同步 [PR #38](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/pull/38) 的 `x-blocks` 修复（`104ee58`），按框架说明将空 `paths: {}` 改为包含 A 接口的映射。除此一行适配外，公共部分、B/C 及区块外文本保持基线，A 只填入自己的 paths/schemas。继续复用公共鉴权、基础类型、响应、错误和分页。

当前为13个业务操作。移除原草案的两个 Mock 控制端点，模拟进度/重置属于后续 W-01b 的测试基础设施，不纳入生产契约。没有商城商品、类目、配送设置或城市写接口；概览中的配送配置只是只读投影。

写操作分别限定允许的旧状态，复用允许初值0的公共 Version。举报下架在售帖子时原因必填，已非在售只关闭举报；举报与帖子状态更新一起成功，失败不产生部分提交。删除评论必须返回空正文。错误响应列出适用 code，不保留“具体业务错误”占位。

## 共享文件锁定与生成类型

PR #37 已明确：锁定工具按整个文件路径生效，若锁定共享契约会阻塞 W-00b/c/d；待三组契约都合并后再统一锁定整个文件。W-00b 沿用此约定，不锁共享契约或共享生成类型，不伪造 `#A` 之类工具不支持的路径。

2026-11-01 用户另行明确确认本 Story 的共享文件例外：`docs/api/admin.openapi.yaml` 和 `frontend/web/src/api/generated/admin.ts` 按 A 区块及其必要生成差异审查，不锁整份文件；契约中公共部分、B/C 区块仍须保持不变。此确认只适用于本 Story 的这两个共享文件。

按 PR #13 评审意见，`frontend/web/src/api/generated/admin.ts` 移出本 Story；本地临时生成只作兼容性预检，不随本 PR 提交，也不手改生成结果。待 W-01a #20 完成后，由 W-01b #21 使用项目固定工具链和 `pnpm gen:api` 统一生成。不得在等待期间代做 W-01a 或把 W-01b 提前标为完成。去除框架占位后，临时生成的 paths 应只包含真实业务路径。

## 验证边界

校验包含按 PR #38 规范化空 paths 后的 A 区块外原文一致性、YAML 重复键、引用、状态枚举、响应必返字段、JSON Schema 2020 与显式示例，以及本地临时类型生成兼容性预检。电话权限和写入前授权是后续 Mock/Go 必须实现的契约要求，尚未执行真实 API 授权测试；不能以契约示例校验代替真实退款、库存或并发行为验证。

前端工程尚未初始化，页面 lint、完整应用类型检查、应用测试、构建与浏览器交互验收归后续 Story；不沿用旧商城的60项测试作为新业务证据。

关联：[统一字段清单](../design/admin-data-dictionary.md)、[接口契约](../api/admin.openapi.yaml)。
