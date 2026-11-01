# 0004. Realnin 管理端范围重置与契约基线

- 日期：2026-11-01（Australia/Sydney）
- 决定来源：用户在本次会话的明确指令与后续确认
- 当前 Story：W-00b，统一任务入口为 [Issue #17](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/issues/17)；进度以 Projects 为准
- 分支：`feat/docs-realnin-admin-contract`，创建自 `develop` 的 `b9f7d2d`，现已同步 `87fadaa`
- 规则依据：`develop` 的 `87fadaa`；原 `chore/repo-rules` 已合并并删除，遵循最新 Projects 协作规则

## 范围

用户取消此前的商城四模块工作，明确重新负责**订单、退款、概览、举报**。举报的负责人变更以本次用户指令为准；其他成员模块不扩展。本轮只提交新范围的接口草案、生成类型和决策记录，后续按[Story 清单](../tasks/realnin-admin-stories.md)逐项建立分支和 PR。

旧商城 PR #1、#11 已取消，旧个人分支清理；不带入旧商城页面、路由、接口、Mock 或 RN 商城任务。团队原始原型、需求与占位目录属于团队资料，继续保留。Git 历史保留正常追溯记录，不声称消除了公开仓库的历史副本。

团队新建 Projects 后，W-00b 使用看板内既有 Issue #17；此前 Issue #12 保留交叉引用。当前 PR #13 为部分契约草案，使用 `Refs #17`。完成全部验收后才按规则使用 `Closes` 和锁定范围；不由 AI 关闭 Issue 或修改看板状态、日期、负责人。

## 用户已定稿的口径

管理后台前端采用 **Vue 3 + Pinia**，后端采用 **Go**。遵循仓库现有的 Vite、TypeScript、Element Plus 与统一 Axios 请求约定；Pinia 仅承载登录信息等跨页面共享状态，列表、筛选和表单状态留在所属页面/组合式函数。本轮仍为前端契约阶段，不提前开发 Go 服务。小程序和 App 不属于本 Story。

1. 金额为澳元分，字段以 `Cents` 结尾；时间返回 UTC，由展示端按城市 IANA 时区格式化。
2. 审核状态和渠道退款进度独立。采用 `providerRefundStatus`，参考 Stripe Refund 的五个原始状态；不使用容易与商户出款混淆的 `payoutStatus`。
3. **实际支付渠道尚未确定，先做可替换 Mock**。未发起退款与渠道状态未知分别处理；本轮不接入真实退款、支付或云资源。
4. 为保持审核与渠道结果独立，模拟审核同意可返回 `approved + pending`；只有渠道模拟成功才增加已退数量。该处取代旧字典将审核同意与退款成功绑定的表达，需要前后端负责人一起审查，不表示现有微信后端已完成迁移。
5. 当前订单接口使用 `contactPhoneMasked` 脱敏投影。原架构的泛化隐私描述与订单 PRD 的配送联系电话存在范围差异，真实字段权限需在联调前明确，不在 Mock 中放真实顾客资料。

## 契约与协作边界

公共结构是为本轮重启提供的可审查草案，供 W-00a 负责人确认；不擅自把其任务标为完成。只新增 A 的订单、退款、概览及用户新指定的举报接口，不定义商城商品、类目、配送设置或城市写接口。

`/api/admin/mock/` 下的控制端点明确标记为仅供本地 Mock，不是生产退款能力；正式 HTTP 对接不能调用模拟控制。接口返回错误使用统一 code、message、可选 details，参数错误为400，认证失败为401，状态/版本冲突为409。

本 Story 只核验 OpenAPI、引用、操作标识和类型生成；页面 lint、编译、交互及完整回归归后续各自 Story 验收，不沿用旧商城的60项测试作为新业务证据。

关联：[退款状态研究](../design/refund-provider-status.md)、[接口草案](../api/admin.openapi.yaml)。
