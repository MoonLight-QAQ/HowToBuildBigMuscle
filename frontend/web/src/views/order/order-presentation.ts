import { ApiError } from '@/api/http'
import type { Order, OrderListItem, OrderStatus } from '@/api/order'
import { CLIENT_ERROR_MESSAGES } from '@/constants/error-code'
import { ORDER_ACTION_COPY } from '@/constants/order'
import { displayDateTime } from '@/utils/date'

/** 判断当前状态能否开始配送；无副作用。 / Determine whether delivery can start, without effects. */
export function canStartDelivery(status: OrderStatus): boolean {
  return status === 'pending'
}

/** 判断能否手动确认送达；无副作用。 / Determine whether staff can mark arrival, without effects. */
export function canMarkArrived(status: OrderStatus): boolean {
  return status === 'pending' || status === 'delivering'
}

/** 按配送快照返回操作标签；不重算业务状态。 / Label the delivery action from the fulfillment snapshot. */
export function startDeliveryLabel(fulfillment: Order['fulfillment']): string {
  return fulfillment === 'post' ? ORDER_ACTION_COPY.startPost : ORDER_ACTION_COPY.startLocal
}

/** 按当前状态返回送达标签；无副作用。 / Label direct or in-progress arrival, without effects. */
export function arriveLabel(status: OrderStatus): string {
  return status === 'pending' ? ORDER_ACTION_COPY.directArrive : ORDER_ACTION_COPY.arrive
}

/** 展示订单内保存的配送窗口；快递不显示本地时段。 / Show the saved local slot; postal orders have no local slot. */
export function deliveryWindow(
  order: Pick<OrderListItem, 'fulfillment' | 'slotStartAt' | 'slotEndAt' | 'timezone'>,
): string {
  if (order.fulfillment === 'post') return '快递'
  if (!order.slotStartAt || !order.slotEndAt) return '—'
  return `${displayDateTime(order.slotStartAt, order.timezone)} 至 ${displayDateTime(order.slotEndAt, order.timezone)}`
}

/** 仅展示归一化安全错误；不回显服务端原文或请求资料。 / Render normalized errors without raw server or request data. */
export function orderErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : CLIENT_ERROR_MESSAGES.http
}
