import type { components } from '@/api/generated/admin'

type Refund = components['schemas']['Refund']
type ProviderStatus = components['schemas']['ProviderRefundStatus']

/** 仅供退款 Mock 内存记账的订单投影，不是新增接口。 / Internal refund-Mock accounting projection, never an API. */
export type RefundMockOrder = Pick<
  components['schemas']['Order'],
  'id' | 'status' | 'shippingFeeCents'
> & {
  items: Pick<components['schemas']['OrderItem'], 'id' | 'priceCents' | 'qty' | 'refundedQty'>[]
  shippingRefundedCents: components['schemas']['Cents']
  inventoryOnHand: number
}

const reasons: components['schemas']['RefundReason'][] = [
  'changed_mind',
  'wrong_address',
  'delivery_issue',
  'other',
]

/** 中文：以序号创建独立虚构退款快照；无真实联系信息或网络副作用。 English: Create an independent fictional refund snapshot without contact data or network effects. */
function createFixture(index: number): Refund {
  const suffix = String(index).padStart(2, '0')
  return {
    id: `95000000000000000${suffix}`,
    refundNo: `MOCK-REFUND-${String(index + 1).padStart(3, '0')}`,
    orderId: `95000000000000001${suffix}`,
    orderNo: `MOCK-ORDER-${String(index + 1).padStart(3, '0')}`,
    user: { id: '9500000000000000001', nickname: `虚构演示用户${index + 1}` },
    status: 'open',
    provider: null,
    providerRefundId: null,
    providerRefundStatus: null,
    reason: reasons[index % reasons.length] ?? 'other',
    extra: index % 4 === 3 ? '仅供开发测试的虚构退款说明' : null,
    items: [
      {
        orderItemId: `95000000000000002${suffix}`,
        nameZh: '演示商品快照',
        priceCents: 3900,
        qty: 1,
        amountCents: 3900,
      },
    ],
    goodsAmountCents: 3900,
    shippingRefundCents: 0,
    totalAmountCents: 3900,
    orderStatusBeforeApply: null,
    autoApproved: false,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-11-01T00:05:00Z',
    version: 0,
  }
}

/** 中文：将快照改为退全部剩余商品及快照运费，仅修改传入的虚构对象。 English: Adjust a fixture to claim all remaining goods and snapshot shipping in place. */
function makeWhole(refund: Refund): void {
  const item = refund.items[0]
  if (!item) throw new Error('missing-refund-fixture-item')
  item.qty = 2
  item.amountCents = 7800
  refund.goodsAmountCents = 7800
  refund.shippingRefundCents = 600
  refund.totalAmountCents = 8400
  refund.orderStatusBeforeApply = 'delivering'
}

/** 中文：创建十二条独立订单上的审核/渠道/空值/自动同意快照，无外部副作用。 English: Create twelve independent-order fixtures covering review, channel, null and automatic states. */
export function createRefundFixtures(): Refund[] {
  const refunds: Refund[] = []
  for (let index = 0; index < 12; index += 1) refunds.push(createFixture(index))
  const whole = refunds[1]
  if (!whole) throw new Error('missing-refund-fixture')
  makeWhole(whole)
  const providerStatuses: ProviderStatus[] = [
    'pending',
    'requires_action',
    'succeeded',
    'failed',
    'canceled',
  ]
  for (let index = 2; index < 10; index += 1) {
    const refund = refunds[index]
    if (!refund) throw new Error('missing-refund-fixture')
    refund.status = 'approved'
    refund.provider = 'mock'
    refund.providerRefundId = index === 8 ? null : `mock-provider-refund-${index}`
    refund.providerRefundStatus = providerStatuses[index - 2] ?? null
    refund.reviewedBy = 'mock-refund-admin'
    refund.reviewedAt = '2026-11-01T00:06:00Z'
    refund.version = 1
  }
  const automatic = refunds[9]
  const rejectedWhole = refunds[10]
  const rejectedPartial = refunds[11]
  if (!automatic || !rejectedWhole || !rejectedPartial) throw new Error('missing-refund-fixture')
  makeWhole(automatic)
  automatic.providerRefundStatus = 'pending'
  automatic.autoApproved = true
  automatic.reviewedBy = 'mock-system'
  automatic.orderStatusBeforeApply = 'pending'
  makeWhole(rejectedWhole)
  rejectedWhole.orderStatusBeforeApply = 'pending'
  for (const refund of [rejectedWhole, rejectedPartial]) {
    refund.status = 'rejected'
    refund.reviewedBy = 'mock-refund-admin'
    refund.reviewedAt = '2026-11-01T00:06:00Z'
    refund.version = 1
  }
  return refunds
}

/** 中文：由独立订单快照建立 Mock 账本；成功退款预先入账，其余不加已退量，库存固定。 English: Build independent ledgers with successful refunds already booked and inventory unchanged. */
export function createRefundOrderFixtures(
  refunds: readonly Refund[] = createRefundFixtures(),
): RefundMockOrder[] {
  const orders: RefundMockOrder[] = []
  for (const refund of refunds) {
    const item = refund.items[0]
    if (!item) throw new Error('missing-refund-fixture-item')
    const settled = refund.providerRefundStatus === 'succeeded'
    const whole = refund.orderStatusBeforeApply !== null
    orders.push({
      id: refund.orderId,
      status:
        whole && refund.status !== 'rejected'
          ? 'refunding'
          : (refund.orderStatusBeforeApply ?? 'delivering'),
      items: [
        {
          id: item.orderItemId,
          priceCents: item.priceCents,
          qty: 2,
          refundedQty: settled ? item.qty : 0,
        },
      ],
      shippingFeeCents: 600,
      shippingRefundedCents: settled ? refund.shippingRefundCents : 0,
      inventoryOnHand: 100,
    })
  }
  return orders
}
