# Realnin 新管理端 Story 清单

2026-11-01 用户最终范围：订单、退款、概览、举报，与团队[任务表](admin-web.md)一致。此文件仅保留个人任务入口和分支约定；范围、依赖和负责人以正式任务表及对应 Issue 为准，状态与计划日期以 [Projects「拾澳 · 管理后台前端」](https://github.com/users/MoonLight-QAQ/projects/2)为准。

用户确认技术栈：管理后台为 Vue 3 + Pinia，后端为 Go。Pinia 用于跨页面状态；页面自己的列表、筛选和表单状态不集中进 store。当前先完成管理后台前端，Go 实现另按后端阶段任务推进。

| Story | 本次范围 | 既有 Issue | 分支 |
|---|---|---|---|
| W-00b | 订单、退款、概览、举报的契约草案与生成类型 | [#17](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/issues/17) | `feat/docs-realnin-admin-contract` |
| W-01b | 统一请求、认证接入点、错误归一化、Mock基础与类型生成检查 | [#21](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/issues/21) | `feat/fe-web-realnin-request-mock` |
| W-01d | 金额/时间工具、通用组件、组合式函数及测试 | [#23](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/issues/23) | `feat/fe-web-realnin-common-ui` |
| W-10 | 订单列表、详情、开始配送/寄出、标记送达 | [#33](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/issues/33) | `feat/fe-web-realnin-orders` |
| W-11 | 退款列表、详情、同意/拒绝与独立渠道进度 | [#34](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/issues/34) | `feat/fe-web-realnin-refunds` |
| W-12 | 概览四项实时计数、过滤跳转与只读配置摘要 | [#35](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/issues/35) | `feat/fe-web-realnin-dashboard` |
| W-09 | 举报列表、忽略、下架或关闭已非在售帖子的举报 | [#32](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/issues/32) | `feat/fe-web-realnin-reports` |

每条 Story 独立分支、独立 PR，目标为 develop。依赖以团队任务表为准：W-00a公共契约、W-01a工程初始化、W-01c路由/登录状态、W-02城市示例，以及举报依赖的W-08闲置，仍需相应负责人验收。已有本地准备不等于这些任务已经完成。

## 日常维护

开始开发前读取对应 Issue 的范围、依赖和验收标准。实际进度、验证记录和 PR 链接写在该 Issue 中，不在本文件维护第二套状态。看板状态、日期、负责人由人操作；不由 AI 提前关闭 Issue 或标记 Done。

当前契约草案 PR 为 [#13](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/pull/13)，以 `Refs #17` 关联部分成果。旧 [#12](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/issues/12)保留关联说明，不再分别维护 W-00b 进度。完成整个任务的 PR 再写 `Closes #<编号>` 并锁定对应范围；Mock 成功不作为真实支付、库存或上线证据。
