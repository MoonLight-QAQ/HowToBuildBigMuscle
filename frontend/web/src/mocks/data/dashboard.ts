import type { components } from '@/api/generated/admin'

export interface DashboardMockZone {
  nameZh: string
  sort: number
  deliverable: boolean
  members: { deliverableOverride: boolean | null }[]
}

export interface DashboardMockCity extends Pick<
  components['schemas']['CityOverview'],
  'id' | 'nameZh' | 'fulfillment'
> {
  zones: DashboardMockZone[]
}

export interface DashboardMockData {
  orders: Pick<components['schemas']['Order'], 'status'>[]
  refunds: Pick<components['schemas']['Refund'], 'status' | 'providerRefundStatus'>[]
  reports: Pick<components['schemas']['Report'], 'status'>[]
  delivery: Pick<
    components['schemas']['Summary'],
    'localFeeCents' | 'postFeeCents' | 'freeShippingThresholdCents'
  > & { cities: DashboardMockCity[] }
}

/** 创建互相隔离的虚构服务端数据；返回状态记录与配送大区成员，无共享修改。 / Create isolated synthetic server records and delivery zone memberships without shared mutation. */
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
          zones: [
            {
              nameZh: '虚构可送大区乙',
              sort: 20,
              deliverable: false,
              members: [{ deliverableOverride: true }],
            },
            {
              nameZh: '虚构成员停送大区',
              sort: 30,
              deliverable: true,
              members: [{ deliverableOverride: false }, { deliverableOverride: false }],
            },
            {
              nameZh: '虚构可送大区甲',
              sort: 10,
              deliverable: true,
              members: [{ deliverableOverride: null }],
            },
            { nameZh: '虚构空成员大区', sort: 0, deliverable: true, members: [] },
          ],
        },
        {
          id: '9000000000000000041',
          nameZh: '虚构快递演示城市',
          fulfillment: 'post',
          zones: [
            {
              nameZh: '虚构快递服务大区',
              sort: 10,
              deliverable: false,
              members: [{ deliverableOverride: true }],
            },
          ],
        },
        {
          id: '9000000000000000042',
          nameZh: '虚构暂无可送大区城市',
          fulfillment: 'local',
          zones: [],
        },
      ],
      localFeeCents: 600,
      postFeeCents: 1000,
      freeShippingThresholdCents: 10000,
    },
  }
}
