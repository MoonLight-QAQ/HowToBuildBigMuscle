import type { components } from '@/api/generated/admin'

type Order = components['schemas']['Order']
type OrderStatus = components['schemas']['OrderStatus']
type Fulfillment = components['schemas']['Fulfillment']

const statuses: OrderStatus[] = [
  'unpaid',
  'pending',
  'delivering',
  'done',
  'refunding',
  'refunded',
  'cancelled',
]

/**
 * 中文：按状态、履约方式和序号创建全虚构订单快照；返回独立对象，不读取真实用户资料。
 * English: Build a fictional order snapshot from status, fulfillment and index; no real personal data.
 */
function createFixture(status: OrderStatus, fulfillment: Fulfillment, index: number): Order {
  const local = fulfillment === 'local'
  const paid = status !== 'unpaid' && status !== 'cancelled'
  const completed = status === 'done'
  const shippingFeeCents = paid ? 600 : 0
  const id = `90000000000000001${String(index).padStart(2, '0')}`
  return {
    id,
    orderNo: `MOCK-ORDER-${String(index + 1).padStart(3, '0')}`,
    status,
    fulfillment,
    user: { id: '9000000000000000001', nickname: `虚构演示用户${index + 1}` },
    cityNameZh: local ? '悉尼（演示）' : '珀斯（演示）',
    timezone: local ? 'Australia/Sydney' : 'Australia/Perth',
    slotStartAt: local ? '2026-11-03T07:00:00Z' : null,
    slotEndAt: local ? '2026-11-03T09:00:00Z' : null,
    actualAmountCents: 7800 + shippingFeeCents,
    createdAt: '2026-11-01T00:00:00Z',
    version: 0,
    contactName: `虚构收货人${index + 1}`,
    // ACMA 预留的虚构移动号码；不可用于实际配送。 / ACMA-reserved fictional mobile number.
    contactPhone: '0491 570 006',
    address: {
      formatted: '虚构演示地址，请勿实际配送',
      street: 'Example Street（虚构街道）',
      zoneNameZh: local ? '演示大区' : null,
      suburb: local ? 'Example Sydney Suburb' : 'Example Perth Suburb',
      postcode: local ? '2000' : '6000',
      state: local ? 'NSW' : 'WA',
    },
    deliveryDate: local ? '2026-11-03' : null,
    slotNameZh: local ? '演示晚间时段' : null,
    remark: index % 2 === 0 ? '仅供开发测试的虚构订单' : null,
    items: [
      {
        id: `90000000000000002${String(index).padStart(2, '0')}`,
        productId: '9000000000000000012',
        nameZh: '演示商品（下单快照）',
        nameEn: 'Example product (order snapshot)',
        priceCents: 3900,
        qty: 2,
        refundedQty: status === 'refunded' ? 2 : status === 'delivering' ? 1 : 0,
      },
    ],
    goodsAmountCents: 7800,
    shippingFeeCents,
    payExpireAt: status === 'unpaid' ? '2026-11-01T00:15:00Z' : null,
    paidAt: paid ? '2026-11-01T00:01:00Z' : null,
    completedAt: completed ? '2026-11-03T08:00:00Z' : null,
    completedBy: completed ? (local ? 'user' : 'staff') : null,
    cancelledAt: status === 'cancelled' ? '2026-11-01T00:15:00Z' : null,
    refunds:
      status === 'refunding' || status === 'refunded' || status === 'delivering'
        ? [
            {
              id: `90000000000000003${String(index).padStart(2, '0')}`,
              refundNo: `MOCK-REFUND-${String(index + 1).padStart(3, '0')}`,
              status: status === 'refunding' ? 'open' : 'approved',
            },
          ]
        : [],
  }
}

/**
 * 中文：创建各七种状态、两种履约方式及三种完成来源的独立数据；无输入，无外部副作用。
 * English: Create fresh fixtures for seven states, two fulfillments and three completion sources.
 */
export function createOrderFixtures(): Order[] {
  const orders: Order[] = []
  for (const status of statuses) {
    orders.push(createFixture(status, 'local', orders.length))
    orders.push(createFixture(status, 'post', orders.length))
  }
  const autoCompleted = createFixture('done', 'local', orders.length)
  autoCompleted.completedBy = 'auto'
  autoCompleted.completedAt = '2026-11-04T09:00:00Z'
  orders.push(autoCompleted)
  return orders
}
