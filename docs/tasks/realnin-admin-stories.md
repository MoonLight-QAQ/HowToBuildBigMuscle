# Realnin 新管理端 Story 清单

2026-11-01 用户最终范围：订单、退款、概览、举报。参考团队[任务表](https://github.com/MoonLight-QAQ/HowToBuildBigMuscle/blob/5b4395f/docs/tasks/admin-web.md)；举报依用户最新指令纳入RealninX。此清单记录个人推进，不覆盖团队的整张任务表。

| Story | 本次范围 | 分支 | 状态 |
|---|---|---|---|
| W-00b | 订单、退款、概览、举报的契约草案与生成类型 | `feat/docs-realnin-admin-contract` | 本地契约验证通过，待 PR 审查 |
| W-01b | 统一请求、认证接入点、错误归一化、Mock基础与类型生成检查 | `feat/fe-web-realnin-request-mock` | 待办 |
| W-01d | 金额/时间工具、通用组件、组合式函数及测试 | `feat/fe-web-realnin-common-ui` | 待办 |
| W-10 | 订单列表、详情、开始配送/寄出、标记送达 | `feat/fe-web-realnin-orders` | 待办 |
| W-11 | 退款列表、详情、同意/拒绝与独立渠道进度 | `feat/fe-web-realnin-refunds` | 待办 |
| W-12 | 概览四项实时计数、过滤跳转与只读配置摘要 | `feat/fe-web-realnin-dashboard` | 待办 |
| W-09 | 举报列表、忽略、下架或关闭已非在售帖子的举报 | `feat/fe-web-realnin-reports` | 待办 |

每条 Story 独立分支、独立 PR，目标为 develop。依赖以团队任务表为准：W-00a公共契约、W-01a工程初始化、W-01c路由/登录状态、W-02城市示例，以及举报依赖的W-08闲置，仍需相应负责人验收。已有本地准备不等于这些任务已经完成。

## 当前 W-00b 的验收

- [x] 只定义当前四模块、公共结构及明确的Mock控制，不包含旧商城业务接口。
- [x] AUD整数分、Cents、UTC、字符串ID和统一错误包裹明确。
- [x] 审核状态与渠道进度分开；支付渠道未确定的边界明确。
- [x] 每个正式接口有operationId、标签、认证要求及错误响应；状态写入带版本和预期旧状态。
- [x] OpenAPI引用与类型生成校验通过，生成类型由固定版本工具输出。
- [ ] W-00a负责人及业务相关伙伴审查公共结构、审核状态语义和依赖。
- [ ] 合入develop后按团队规则更新正式任务状态；本轮不预先锁定未合并任务。

当前只有第一条进入提交。后续Story逐条运行适用的格式、类型、测试、构建及浏览器验收，记录实际结果。Mock成功不作为真实支付、库存或上线证据。
