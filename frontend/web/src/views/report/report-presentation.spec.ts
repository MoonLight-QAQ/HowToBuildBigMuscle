import { expect, it } from 'vitest'
import { ApiError } from '@/api/http'
import { CLIENT_ERROR_MESSAGES, ERROR_CODE } from '@/constants/error-code'
import {
  canHandleReport,
  reportErrorMessage,
  takeDownInput,
  validRemovalReason,
  reportStatusPresentation,
  reportListingLabel,
  reportReasonLabel,
} from './report-presentation'
import { createReport } from './report-test-data'

/** 只有待处理举报提供写入入口；已处理不一概推断为已下架。 / Only open reports allow actions without treating every handled report as a takedown. */
it('allows actions only for open reports', function testActions() {
  expect(canHandleReport(createReport())).toBe(true)
  expect(canHandleReport(createReport({ status: 'handled' }))).toBe(false)
  expect(canHandleReport(createReport({ status: 'ignored' }))).toBe(false)
})

/** 已处理举报可以关联已出帖子，文案不能声称本次新下架。 / A handled report may concern a sold listing, so labels cannot claim a new takedown. */
it('keeps handled status distinct from listing removal', function testHandledLabel() {
  const record = createReport({ status: 'handled', reason: 'harassment' })
  record.listing.status = 'sold'
  expect(reportStatusPresentation(record).label).toBe('已处理')
  expect(reportListingLabel(record)).toBe('已出')
  expect(reportReasonLabel(record)).toBe('骚扰')
})
/** Unicode码点而非UTF16单元限制原因，并拒绝空白。 / Limit reason by Unicode code points instead of UTF16 units and reject whitespace. */
it('validates 1–200 Unicode code points without trimming', function testReason() {
  expect(validRemovalReason('')).toBe(false)
  expect(validRemovalReason(' \n\t')).toBe(false)
  expect(validRemovalReason('🙂'.repeat(200))).toBe(true)
  expect(validRemovalReason('🙂'.repeat(201))).toBe(false)
  expect(validRemovalReason(' 可保留前后空白 ')).toBe(true)
})
/** 在售提交已读版本、旧状态和原原因，不接收处理人。 / On-sale input retains read version, old status and raw reason without actor fields. */
it('constructs the exact on-sale request and rejects missing reasons', function testOnSaleInput() {
  expect(takeDownInput(createReport({ version: 3 }), ' 原因 ')).toEqual({
    version: 3,
    expectedStatus: 'open',
    expectedListingStatus: 'on_sale',
    reason: ' 原因 ',
  })
  expect(function invalidReason() {
    takeDownInput(createReport(), ' ')
  }).toThrow(RangeError)
})
/** 非在售即使旧表单留有文字，也不会提交新原因。 / Off-sale branches never submit a new reason even if the old local form contains text. */
it.each(['sold', 'self_removed', 'admin_removed'] as const)(
  'omits reason for %s',
  function testOffSaleInput(status) {
    const report = createReport()
    report.listing.status = status
    expect(takeDownInput(report, '不得发送')).toEqual({
      version: 0,
      expectedStatus: 'open',
      expectedListingStatus: status,
    })
  },
)
/** 错误仅使用公共安全文案，不回显内部异常。 / Use shared safe errors without echoing internal exceptions. */
it('maps safe error messages', function testErrors() {
  expect(reportErrorMessage(new ApiError('business', 403, 'FORBIDDEN'))).toBe(
    ERROR_CODE.FORBIDDEN.message,
  )
  expect(reportErrorMessage(new Error('private details'))).toBe(CLIENT_ERROR_MESSAGES.http)
})
