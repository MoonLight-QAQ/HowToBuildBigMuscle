import type { Refund } from '@/api/refund'

type TagType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

/** 审核状态与渠道进度分别显示。 / Display review states separately from provider progress. */
export const REFUND_STATUS: Record<Refund['status'], { label: string; type: TagType }> = {
  open: { label: '待审', type: 'warning' },
  approved: { label: '已同意', type: 'primary' },
  rejected: { label: '已拒绝', type: 'info' },
}

/** 全部筛选不向接口传状态。 / The all filter omits status from the API query. */
export const REFUND_FILTERS: { value: Refund['status'] | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'open', label: REFUND_STATUS.open.label },
  { value: 'approved', label: REFUND_STATUS.approved.label },
  { value: 'rejected', label: REFUND_STATUS.rejected.label },
]

/** 渠道中性进度，不推导顾客银行到账。 / Provider-neutral progress without inferring customer bank settlement. */
export const REFUND_PROVIDER_STATUS: Record<
  NonNullable<Refund['providerRefundStatus']>,
  { label: string; type: TagType; description: string }
> = {
  pending: {
    label: '退款处理中',
    type: 'warning',
    description: '渠道正在处理退款，请继续核对渠道进度。',
  },
  requires_action: {
    label: '待补充处理',
    type: 'warning',
    description: '渠道需要补充处理，请核对渠道要求。',
  },
  succeeded: {
    label: '退款成功（渠道确认）',
    type: 'success',
    description: '渠道已确认退款成功，银行到账需以实际收款记录为准。',
  },
  failed: {
    label: '退款失败',
    type: 'danger',
    description: '渠道退款失败，请核实渠道记录；审核状态仍单独保留。',
  },
  canceled: {
    label: '退款已取消',
    type: 'info',
    description: '渠道退款已取消，请核实渠道记录；审核状态仍单独保留。',
  },
}

/** 两种空值含义不同，不能把渠道对象已存在写成未发起。 / Distinguish no provider object from an existing object with an unknown status. */
export const REFUND_PROVIDER_EMPTY = {
  notStarted: { label: '未发起', type: 'info' as const, description: '尚未创建渠道退款对象。' },
  unknown: {
    label: '待确认',
    type: 'warning' as const,
    description: '渠道退款对象已存在，进度尚未同步，请核对渠道结果。',
  },
}

/** 原因枚举以字段字典为准。 / Reason labels follow the field dictionary. */
export const REFUND_REASON: Record<Refund['reason'], string> = {
  changed_mind: '不想要了',
  wrong_address: '地址选错了',
  delivery_issue: '送达有问题',
  other: '其他',
}

/** 退款审核与操作反馈的集中业务文案。 / Centralized review guidance and action feedback. */
export const REFUND_COPY = {
  reviewOpen: '请核对退款商品、数量和金额后审核。同意后请继续核对独立的渠道进度。',
  reviewApproved: '审核已同意，请核对渠道退款进度。',
  reviewRejected: '审核已拒绝，关联订单的后续状态以订单详情为准。',
  autoApproved: '此申请已自动同意，无需再次审核。',
  inventory: '审核同意不表示渠道退款成功，库存不会因退款自动加回。',
  approveConfirm: '确认同意此退款申请？审核同意后请继续核对独立的渠道退款进度。',
  rejectConfirm: '确认拒绝此退款申请？请先核对申请内容。',
  approved: '审核已同意，请继续核对渠道退款进度。',
  rejected: '审核已拒绝。',
  canceled: '已取消本次操作，未提交审核。',
  uncertain: '操作结果尚未确认。请核对重新读取的退款单；若读取失败，请刷新后再操作。',
}
