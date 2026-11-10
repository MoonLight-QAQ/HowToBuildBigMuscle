import type { ReportListingStatus, ReportReason, ReportStatus } from '@/api/report'

export const REPORT_STATUS = {
  open: { label: '待处理', type: 'warning' },
  ignored: { label: '已忽略', type: 'info' },
  handled: { label: '已处理', type: 'success' },
} as const satisfies Record<ReportStatus, { label: string; type: string }>

export const REPORT_REASON = {
  fake_info: '虚假信息',
  harassment: '骚扰',
  prohibited: '违禁内容',
  other: '其他',
} as const satisfies Record<ReportReason, string>

export const REPORT_LISTING_STATUS = {
  on_sale: '在售',
  sold: '已出',
  self_removed: '卖家已下架',
  admin_removed: '后台已下架',
} as const satisfies Record<ReportListingStatus, string>

export const REPORT_COPY = {
  ignoreConfirm: '确认忽略这条举报？帖子、评论和已有下架原因将保持原样。',
  takedownConfirm:
    '确认强制下架整条帖子并处理这条举报？即使举报的是评论，也将下架整条帖子。下架原因会展示给卖家。',
  closeConfirm: '帖子已非在售。确认仅关闭这条举报？保留帖子当前状态和已有下架原因。',
  reasonInvalid: '请填写 1–200 个字符的下架原因，不能全为空白。',
  canceled: '已取消操作，未提交。',
  ignored: '举报已忽略，帖子保持原样。',
  removed: '举报已处理，整条帖子已下架。',
  closed: '举报已处理，保留帖子原状态与原因。',
  uncertain: '操作结果尚未确认；已尝试重新读取一次，请核对后再操作，不要重复提交。',
} as const
