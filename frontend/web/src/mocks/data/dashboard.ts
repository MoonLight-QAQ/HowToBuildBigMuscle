import type { components } from '@/api/generated/admin'

export interface DashboardMockData {
  orders: Pick<components['schemas']['Order'], 'status'>[]
  refunds: Pick<components['schemas']['Refund'], 'status' | 'providerRefundStatus'>[]
  reports: Pick<components['schemas']['Report'], 'status'>[]
  delivery: Pick<
    components['schemas']['Summary'],
    'cities' | 'localFeeCents' | 'postFeeCents' | 'freeShippingThresholdCents'
  >
}

/** 创建互相隔离的虚构服务端数据；无输入，返回状态记录和配送快照，无共享修改。 / Create isolated synthetic server records and delivery snapshots without shared mutation. */
export function createDashboardData(): DashboardMockData {
  return {
    orders: [
      { status: 'pending' },
      { status: 'pending' },
      { status: 'delivering' },
      { status: 'unpaid' },
      { status: 'done' },
      { status: 'refunding' },
      { status: 'refunded' },
      { status: 'cancelled' },
    ],
    refunds: [
      { status: 'open', providerRefundStatus: null },
      { status: 'open', providerRefundStatus: null },
      { status: 'approved', providerRefundStatus: 'pending' },
      { status: 'approved', providerRefundStatus: 'succeeded' },
      { status: 'rejected', providerRefundStatus: null },
    ],
    reports: [{ status: 'open' }, { status: 'open' }, { status: 'ignored' }, { status: 'handled' }],
    delivery: {
      cities: [
        {
          id: '9000000000000000040',
          nameZh: '虚构线下演示城市',
          fulfillment: 'local',
          deliverableDistrictNamesZh: ['虚构可送区域甲', '虚构可送区域乙'],
        },
        {
          id: '9000000000000000041',
          nameZh: '虚构快递演示城市',
          fulfillment: 'post',
          deliverableDistrictNamesZh: [],
        },
        {
          id: '9000000000000000042',
          nameZh: '虚构暂无可送区城市',
          fulfillment: 'local',
          deliverableDistrictNamesZh: [],
        },
      ],
      localFeeCents: 600,
      postFeeCents: 1000,
      freeShippingThresholdCents: 10000,
    },
  }
}
