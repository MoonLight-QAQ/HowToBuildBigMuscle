import { ApiError } from '@/api/http'
import type { Refund } from '@/api/refund'
import { CLIENT_ERROR_MESSAGES } from '@/constants/error-code'
import { REFUND_COPY, REFUND_PROVIDER_EMPTY, REFUND_PROVIDER_STATUS } from '@/constants/refund'

/** 只有非自动同意的待审申请允许审核；返回布尔值，无副作用。 / Only manually reviewed open applications permit review; no side effects. */
export function canReviewRefund(refund: Pick<Refund, 'status' | 'autoApproved'>): boolean {
  return refund.status === 'open' && !refund.autoApproved
}

/** 根据独立渠道字段选择进度标签，不用审核状态推导成功；无副作用。 / Select provider progress independently of review status without inferring success. */
export function refundProviderProgress(
  refund: Pick<Refund, 'providerRefundId' | 'providerRefundStatus'>,
) {
  if (refund.providerRefundStatus !== null)
    return REFUND_PROVIDER_STATUS[refund.providerRefundStatus]
  return refund.providerRefundId === null
    ? REFUND_PROVIDER_EMPTY.notStarted
    : REFUND_PROVIDER_EMPTY.unknown
}

/** 展示退款商品摘要，不重新计算数量或金额；无副作用。 / Summarize requested items without recomputing quantities or money. */
export function refundItemsSummary(
  items: ReadonlyArray<Readonly<Refund['items'][number]>>,
): string {
  /** 每行使用申请快照名称和数量；返回摘要片段，无副作用。 / Return each saved item name and quantity without effects. */
  function summarizeItem(item: Readonly<Refund['items'][number]>): string {
    return `${item.nameZh} × ${item.qty}`
  }
  return items.map(summarizeItem).join('、')
}

/** 按审核快照展示处理提示，不猜测当前订单状态或整单范围。 / Show review guidance without inferring current order state or full-order coverage. */
export function refundReviewHint(refund: Pick<Refund, 'status' | 'autoApproved'>): string {
  if (refund.autoApproved) return REFUND_COPY.autoApproved
  if (refund.status === 'approved') return REFUND_COPY.reviewApproved
  if (refund.status === 'rejected') return REFUND_COPY.reviewRejected
  return REFUND_COPY.reviewOpen
}

/** 仅显示归一化安全错误，不回显任意异常或渠道原文。 / Present normalized safe errors without arbitrary exception or provider text. */
export function refundErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : CLIENT_ERROR_MESSAGES.http
}
