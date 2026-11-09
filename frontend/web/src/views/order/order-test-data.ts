import type { Order, OrderListItem } from '@/api/order'

/** 构造虚构订单测试快照；覆盖项来自契约，不访问网络或真实用户。 / Create a fictional contract-typed test snapshot without network or real user data. */
export function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: '9000000000000000010',
    orderNo: 'MOCK-ORDER-001',
    status: 'pending',
    fulfillment: 'local',
    user: { id: '9000000000000000001', nickname: '演示用户' },
    cityNameZh: '演示城市',
    timezone: 'Australia/Sydney',
    slotStartAt: '2026-11-02T07:00:00Z',
    slotEndAt: '2026-11-02T09:00:00Z',
    actualAmountCents: 8400,
    createdAt: '2026-11-01T00:00:00Z',
    version: 3,
    contactName: '演示收货人',
    contactPhone: '0491 570 006',
    address: {
      formatted: '演示地址，请勿配送',
      street: '示例街道',
      districtNameZh: '演示区域',
      postcode: '2000',
    },
    deliveryDate: '2026-11-02',
    slotNameZh: '演示时段',
    remark: null,
    items: [
      {
        id: '9000000000000000011',
        productId: '9000000000000000012',
        nameZh: '快照商品',
        nameEn: 'Snapshot product',
        priceCents: 3900,
        qty: 2,
        refundedQty: 0,
      },
    ],
    goodsAmountCents: 7800,
    shippingFeeCents: 600,
    payExpireAt: null,
    paidAt: '2026-11-01T00:01:00Z',
    completedAt: null,
    completedBy: null,
    cancelledAt: null,
    refunds: [],
    ...overrides,
  }
}

/** 显式生成不含联系人资料的列表投影；无副作用。 / Build an explicit list projection without contact data or side effects. */
export function projectOrder(order: Order): OrderListItem {
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    fulfillment: order.fulfillment,
    user: order.user,
    cityNameZh: order.cityNameZh,
    timezone: order.timezone,
    slotStartAt: order.slotStartAt,
    slotEndAt: order.slotEndAt,
    itemsSummary: '快照商品 × 2',
    actualAmountCents: order.actualAmountCents,
    createdAt: order.createdAt,
    version: order.version,
  }
}
