import type { Order, OrderStatus } from '@/api/order'

/** 订单状态的中文标签与默认组件色彩。 / Chinese order labels and default component tones. */
export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; type: 'primary' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  unpaid: { label: '待付款', type: 'info' },
  pending: { label: '待配送', type: 'warning' },
  delivering: { label: '配送中', type: 'primary' },
  done: { label: '已完成', type: 'success' },
  refunding: { label: '退款中', type: 'warning' },
  refunded: { label: '已退款', type: 'danger' },
  cancelled: { label: '已取消', type: 'info' },
}

/** 全部筛选不发送状态参数。 / The all filter omits the status parameter. */
export const ORDER_FILTERS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'unpaid', label: ORDER_STATUS.unpaid.label },
  { value: 'pending', label: ORDER_STATUS.pending.label },
  { value: 'delivering', label: ORDER_STATUS.delivering.label },
  { value: 'done', label: ORDER_STATUS.done.label },
  { value: 'refunding', label: ORDER_STATUS.refunding.label },
  { value: 'refunded', label: ORDER_STATUS.refunded.label },
  { value: 'cancelled', label: ORDER_STATUS.cancelled.label },
]

/** 配送方式来自契约枚举。 / Fulfillment labels follow contract enum values. */
export const ORDER_FULFILLMENT: Record<Order['fulfillment'], string> = {
  local: '线下配送',
  post: '快递',
}

/** 这里只显示退款审核结果，渠道退款进度由退款模块负责。 / Show review status only; the refund module owns provider progress. */
export const ORDER_REFUND_STATUS: Record<Order['refunds'][number]['status'], string> = {
  open: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}

/** 完成人由服务端返回；未知或未完成时不自行推测。 / Completion source is supplied by the server. */
export const ORDER_COMPLETED_BY = { user: '用户确认', staff: '管理员标记', auto: '系统自动' }

/** 写操作文案与确认内容集中定义。 / Centralized mutation copy and confirmation text. */
export const ORDER_ACTION_COPY = {
  startLocal: '开始配送',
  startPost: '标记已寄出',
  arrive: '标记已送达',
  directArrive: '直接标记已送达',
  startLocalConfirm: '确认开始配送此订单？请核实订单、收货信息和配送安排。',
  startPostConfirm: '确认此订单已寄出？请核实订单与寄送情况。',
  arriveConfirm: '确认此订单已送达？此操作将把订单标记为已完成。',
  success: '订单状态已更新。',
  canceled: '已取消本次操作，订单未变更。',
  uncertain: '操作结果尚未确认。请核对重新读取的订单状态；若读取失败，请刷新后再操作。',
}
