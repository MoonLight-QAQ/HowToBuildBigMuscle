import type { Report, TakeDownReportInput } from '@/api/report'
import { ApiError } from '@/api/http'
import { CLIENT_ERROR_MESSAGES } from '@/constants/error-code'
import {
  REPORT_COPY,
  REPORT_LISTING_STATUS,
  REPORT_REASON,
  REPORT_STATUS,
} from '@/constants/report'

/** 读取举报状态文案与颜色；输入举报投影，无副作用。 / Read report status text and tone without effects. */
export function reportStatusPresentation(report: Pick<Report, 'status'>) {
  return REPORT_STATUS[report.status]
}
/** 读取举报原因文案；输入举报投影，无副作用。 / Read the report reason label without effects. */
export function reportReasonLabel(report: Pick<Report, 'reason'>): string {
  return REPORT_REASON[report.reason]
}
/** 读取帖子当前状态文案；输入举报投影，无副作用。 / Read the current listing status label without effects. */
export function reportListingLabel(report: Pick<Report, 'listing'>): string {
  return REPORT_LISTING_STATUS[report.listing.status]
}

/** 判断是否仍可处理；输入举报投影，返回待处理判定，无副作用。 / Check an open report without effects. */
export function canHandleReport(report: Pick<Report, 'status'>): boolean {
  return report.status === 'open'
}

/** 按Unicode码点验证原因；输入原文，不自动截断或修改。 / Validate raw reason by Unicode code points without mutation or truncation. */
export function validRemovalReason(reason: string): boolean {
  return (
    typeof reason === 'string' &&
    [...reason].length >= 1 &&
    [...reason].length <= 200 &&
    /\S/u.test(reason)
  )
}

/** 从当前投影创建精确分支请求；在售原因非法时抛RangeError，无网络副作用。 / Build the exact branch input, throwing RangeError for an invalid on-sale reason without network effects. */
export function takeDownInput(report: Report, reason: string): TakeDownReportInput {
  const common = { version: report.version, expectedStatus: 'open' as const }
  if (report.listing.status === 'on_sale') {
    if (!validRemovalReason(reason)) throw new RangeError(REPORT_COPY.reasonInvalid)
    return { ...common, expectedListingStatus: 'on_sale', reason }
  }
  return { ...common, expectedListingStatus: report.listing.status }
}

/** 显示归一化安全错误；未知异常不回显内部资料。 / Show normalized safe errors without exposing unknown exception details. */
export function reportErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : CLIENT_ERROR_MESSAGES.http
}
