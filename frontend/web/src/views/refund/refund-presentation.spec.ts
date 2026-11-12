import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/http'
import type { Refund } from '@/api/refund'
import { ERROR_CODE } from '@/constants/error-code'
import {
  canReviewRefund,
  refundErrorMessage,
  refundItemsSummary,
  refundProviderProgress,
  refundReviewHint,
} from './refund-presentation'
import { approvedRefund, createRefund } from './refund-test-data'

/** 验证审核权限与渠道进度相互独立，并检查安全文案。 / Verify independent review permissions/provider progress and safe copy. */
describe('refund presentation', function refundPresentationSuite() {
  const reviewMatrix: { status: Refund['status']; autoApproved: boolean; allowed: boolean }[] = [
    { status: 'open', autoApproved: false, allowed: true },
    { status: 'approved', autoApproved: false, allowed: false },
    { status: 'rejected', autoApproved: false, allowed: false },
    { status: 'open', autoApproved: true, allowed: false },
    { status: 'approved', autoApproved: true, allowed: false },
    { status: 'rejected', autoApproved: true, allowed: false },
  ]
  /** 使用显式验收矩阵验证人工待审权限，自动同意禁止再审。 / Check an explicit acceptance matrix, including no rereview after auto-approval. */
  it.each(reviewMatrix)(
    'gates review for $status / auto $autoApproved',
    function testReviewMatrix(testCase) {
      expect(canReviewRefund(testCase)).toBe(testCase.allowed)
    },
  )
  const progressMatrix: { status: Refund['providerRefundStatus']; label: string }[] = [
    { status: 'pending', label: '退款处理中' },
    { status: 'requires_action', label: '待补充处理' },
    { status: 'succeeded', label: '退款成功（渠道确认）' },
    { status: 'failed', label: '退款失败' },
    { status: 'canceled', label: '退款已取消' },
  ]
  /** 五种渠道进度使用明确标签，不由approved推导成功。 / Label all five provider states without deriving success from approval. */
  it.each(progressMatrix)('labels provider status $status', function testProviderMatrix(testCase) {
    expect(
      refundProviderProgress(approvedRefund({ providerRefundStatus: testCase.status })).label,
    ).toBe(testCase.label)
  })
  /** 两类null有不同语义，审核已同意而未发起仍显示未发起。 / Distinguish both null cases, including approved reviews without a provider object. */
  it('distinguishes not started and unknown provider progress', function testNullSemantics() {
    expect(refundProviderProgress(createRefund()).label).toBe('未发起')
    expect(
      refundProviderProgress(approvedRefund({ providerRefundId: null, providerRefundStatus: null }))
        .label,
    ).toBe('未发起')
    expect(refundProviderProgress(approvedRefund({ providerRefundStatus: null })).label).toBe(
      '待确认',
    )
  })
  /** 文案只描述退款快照，不猜测当前订单状态或整单覆盖。 / Guidance describes refund snapshots without guessing current order state or coverage. */
  it('keeps review hints independent of current order state', function testReviewHints() {
    expect(refundReviewHint(createRefund())).toContain('核对退款商品')
    expect(refundReviewHint(approvedRefund())).toContain('核对渠道退款进度')
    expect(refundReviewHint(approvedRefund({ autoApproved: true }))).toContain('无需再次审核')
    expect(refundReviewHint(createRefund({ status: 'rejected' }))).toContain('以订单详情为准')
    expect(refundItemsSummary(createRefund().items)).toBe('快照商品 × 1')
  })
  /** 未知异常不会回显渠道原文或私密资料。 / Unknown errors cannot expose raw provider text or private data. */
  it('shows normalized errors only', function testSafeErrors() {
    expect(
      refundErrorMessage(new ApiError('business', 409, ERROR_CODE.VERSION_CONFLICT.code)),
    ).toBe(ERROR_CODE.VERSION_CONFLICT.message)
    expect(refundErrorMessage(new Error('secret payment record'))).not.toContain('secret')
  })
})
