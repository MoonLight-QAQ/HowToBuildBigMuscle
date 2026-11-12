import type { Refund } from '@/api/refund'

/** 创建虚构退款测试快照；覆盖字段使用生成类型，不访问真实用户或支付渠道。 / Create a fictional generated-type refund fixture without real users or payment channels. */
export function createRefund(overrides: Partial<Refund> = {}): Refund {
  return {
    id: '9000000000000000020',
    refundNo: 'MOCK-REFUND-001',
    orderId: '9000000000000000010',
    orderNo: 'MOCK-ORDER-001',
    user: { id: '9000000000000000001', nickname: '演示用户' },
    status: 'open',
    provider: null,
    providerRefundId: null,
    providerRefundStatus: null,
    reason: 'delivery_issue',
    extra: '虚构退款说明',
    items: [
      {
        orderItemId: '9000000000000000011',
        nameZh: '快照商品',
        priceCents: 3900,
        qty: 1,
        amountCents: 3900,
      },
    ],
    goodsAmountCents: 3900,
    shippingRefundCents: 0,
    totalAmountCents: 3900,
    orderStatusBeforeApply: 'delivering',
    autoApproved: false,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-11-01T00:05:00Z',
    version: 3,
    ...overrides,
  }
}

/** 构造已同意但渠道仍处理中的快照，不将审核同意当作成功。 / Create an approved snapshot whose provider is still processing, without inferring refund success. */
export function approvedRefund(overrides: Partial<Refund> = {}): Refund {
  return createRefund({
    status: 'approved',
    provider: 'mock',
    providerRefundId: 'mock-refund-001',
    providerRefundStatus: 'pending',
    reviewedBy: 'mock-admin',
    reviewedAt: '2026-11-01T00:06:00Z',
    version: 4,
    ...overrides,
  })
}
