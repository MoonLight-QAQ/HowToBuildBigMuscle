# 退款渠道状态：Stripe 官方定义与本项目前端

核验日期：2026-11-01。用户已要求独立展示退款进度，并尽量对齐 Stripe。本文记录方案，用户已确认渠道暂未确定，先做可替换 Mock，不表示接入或执行了真实退款。

Stripe 的退款对象是 **Refund**，官方 `status` 原始值如下；前端建议保留枚举原值，只映射显示文案。[官方 Refund 对象](https://docs.stripe.com/api/refunds/object)

| 原始值 | 建议中文显示 |
|---|---|
| `pending` | 退款处理中 |
| `requires_action` | 待补充处理 |
| `succeeded` | 退款成功（渠道确认） |
| `failed` | 退款失败 |
| `canceled` | 退款已取消 |

这些值不包含“未发起”。建议用渠道退款对象尚未创建表示未发起；若对象已存在而渠道状态为空，则显示状态待确认，避免混为未发起。`succeeded` 不显示成前端已经核验顾客银行到账，点击同意或请求被受理也不直接推导为成功。渠道结果由后端可靠同步。[官方退款处理说明](https://docs.stripe.com/refunds)

字段建议使用 `providerRefundStatus`，与审核状态分开。旧建议名 `payoutStatus` 容易混淆：Stripe 的 Payout 表示向商户银行账户或借记卡划出资金，使用另一套状态，并非顾客退款。[官方 Payout 对象](https://docs.stripe.com/api/payouts/object)

现有团队 PRD 和字段字典写的是微信退款。需要明确本轮是否将 Stripe 定为目标渠道，或仅借鉴枚举设计；如仍采用微信，则通过单独映射保留其权威状态，不能把不同渠道的值硬混为一种。正式契约和 Mock 将在该决定后同步，不将本文当作团队已批准的新支付方案。
