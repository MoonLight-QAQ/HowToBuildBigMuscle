import type { Summary } from '@/api/dashboard'

export type DashboardCountKey =
  'pendingOrderCount' | 'deliveringOrderCount' | 'openRefundCount' | 'openReportCount'

export const DASHBOARD_TASKS = [
  { key: 'pendingOrderCount', label: '待配送', hint: '查看待配送订单' },
  { key: 'deliveringOrderCount', label: '配送中', hint: '查看配送中的订单' },
  { key: 'openRefundCount', label: '退款待审', hint: '查看待审退款单' },
  { key: 'openReportCount', label: '举报待处理', hint: '查看待处理举报' },
] as const satisfies ReadonlyArray<{
  key: DashboardCountKey & keyof Summary
  label: string
  hint: string
}>

export const DASHBOARD_FULFILLMENT = { local: '线下配送', post: '快递' } as const
