import { effectScope, ref, type EffectScope } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { refundApi, type Refund } from '@/api/refund'
import { ApiError } from '@/api/http'
import { ERROR_CODE } from '@/constants/error-code'
import { REFUND_COPY } from '@/constants/refund'
import { useRefundDetail, type RefundConfirmation } from './use-refund-detail'
import { approvedRefund, createRefund } from './refund-test-data'

const scopes: EffectScope[] = []
/** 销毁测试作用域，释放读写和侦听。 / Dispose test scopes and release reads, writes and watchers. */
afterEach(function cleanupScopes() {
  for (const scope of scopes) scope.stop()
  scopes.length = 0
})
/** 创建手动控制的Promise，用于乱序与取消回归；无网络副作用。 / Create a manually controlled promise for races and cancellation without network effects. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  /** 保留完成函数以按测试顺序发送响应。 / Retain completion functions for controlled response ordering. */
  const promise = new Promise<T>(function retainCompletion(onResolve, onReject) {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}
/** 创建契约类型服务间谍，默认批准后渠道仍pending。 / Create contract-typed spies whose default approval still has pending provider progress. */
function createService() {
  return {
    get: vi.fn<typeof refundApi.get>().mockResolvedValue(createRefund()),
    approve: vi.fn<typeof refundApi.approve>().mockResolvedValue(approvedRefund()),
    reject: vi.fn<typeof refundApi.reject>().mockResolvedValue(
      createRefund({
        status: 'rejected',
        reviewedBy: 'mock-admin',
        reviewedAt: '2026-11-01T00:06:00Z',
        version: 4,
      }),
    ),
  }
}
/** 在独立作用域建立详情，自动首读且默认确认同意。 / Initialize isolated detail with an initial read and affirmative confirmation. */
function setupDetail(
  service = createService(),
  confirmation: RefundConfirmation = { confirm: vi.fn().mockResolvedValue(true) },
) {
  const id = ref('9000000000000000020')
  const scope = effectScope()
  scopes.push(scope)
  /** 本例状态只使用测试服务。 / Initialize state using only this test's service. */
  const state = scope.run(function initializeDetail() {
    return useRefundDetail(id, service, confirmation)
  })!
  return { state, id, service, scope, confirmation }
}

/** 验证审核、独立渠道状态、版本条件与生命周期隔离。 / Verify review, independent provider state, concurrency inputs and lifecycle isolation. */
describe('useRefundDetail', function refundDetailSuite() {
  /** 提交已读版本与open，成功只说明审核完成，渠道仍pending。 / Submit saved version/open status; successful review can still have pending provider progress. */
  it('approves with version and expected status without claiming provider success', async function testApprove() {
    const { state, service } = setupDetail()
    await flushPromises()
    expect(await state.approve()).toBe(true)
    expect(service.approve).toHaveBeenCalledWith(
      '9000000000000000020',
      { version: 3, expectedStatus: 'open' },
      expect.any(AbortSignal),
    )
    expect(state.refund.value?.status).toBe('approved')
    expect(state.refund.value?.providerRefundStatus).toBe('pending')
    expect(state.actionMessage.value).toBe(REFUND_COPY.approved)
  })
  /** 拒绝只传版本和旧状态，不采集额外拒绝原因或改订单。 / Reject using only version/expected status without extra reason input or order mutation. */
  it('rejects with only the contract review input', async function testReject() {
    const { state, service } = setupDetail()
    await flushPromises()
    expect(await state.reject()).toBe(true)
    expect(service.reject).toHaveBeenCalledWith(
      '9000000000000000020',
      { version: 3, expectedStatus: 'open' },
      expect.any(AbortSignal),
    )
    expect(state.actionMessage.value).toBe(REFUND_COPY.rejected)
  })
  /** 已处理和自动同意均不能再次审核。 / Processed and auto-approved refunds cannot be reviewed again. */
  it.each([
    approvedRefund(),
    createRefund({ status: 'rejected' }),
    approvedRefund({ autoApproved: true }),
  ])('prevents repeated review %#', async function testNoRereview(refund) {
    const service = createService()
    service.get.mockResolvedValue(refund)
    const { state, confirmation } = setupDetail(service)
    await flushPromises()
    expect(await state.approve()).toBe(false)
    expect(await state.reject()).toBe(false)
    expect(confirmation.confirm).not.toHaveBeenCalled()
    expect(service.approve).not.toHaveBeenCalled()
    expect(service.reject).not.toHaveBeenCalled()
  })
  /** 从弹窗阶段即锁定按钮，批准与拒绝不能双重提交。 / Lock during confirmation to prevent duplicate or competing review submissions. */
  it('blocks double clicks and competing actions while confirming', async function testDoubleClick() {
    const response = deferred<boolean>()
    const confirm = vi.fn().mockReturnValue(response.promise)
    const { state, service } = setupDetail(createService(), { confirm })
    await flushPromises()
    const first = state.approve()
    expect(state.actionBusy.value).toBe(true)
    expect(await state.approve()).toBe(false)
    expect(await state.reject()).toBe(false)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(service.approve).not.toHaveBeenCalled()
    response.resolve(true)
    await first
    expect(service.approve).toHaveBeenCalledTimes(1)
  })
  /** 取消显示中性反馈，没有审核请求、失败或成功提示。 / Cancellation gives neutral feedback without a review request, error or success message. */
  it('treats cancellation as neutral', async function testCancellation() {
    const { state, service } = setupDetail(createService(), {
      confirm: vi.fn().mockResolvedValue(false),
    })
    await flushPromises()
    expect(await state.reject()).toBe(false)
    expect(state.actionMessage.value).toBe(REFUND_COPY.canceled)
    expect(state.actionMessageType.value).toBe('info')
    expect(state.actionErrorMessage.value).toBe('')
    expect(service.reject).not.toHaveBeenCalled()
  })
  /** 状态或版本冲突只读一次最新退款，保留失败反馈。 / Read fresh detail once after version/status conflicts while retaining failure feedback. */
  it.each([ERROR_CODE.VERSION_CONFLICT, ERROR_CODE.INVALID_STATUS])(
    'reloads on $code',
    async function testConflict(definition) {
      const { state, service } = setupDetail()
      await flushPromises()
      service.approve.mockRejectedValueOnce(new ApiError('business', 409, definition.code))
      service.get.mockResolvedValueOnce(approvedRefund())
      expect(await state.approve()).toBe(false)
      expect(service.get).toHaveBeenCalledTimes(2)
      expect(state.refund.value?.version).toBe(4)
      expect(state.actionErrorMessage.value).toBe(definition.message)
      expect(state.actionMessage.value).toBe('')
      expect(state.actionBusy.value).toBe(false)
    },
  )
  /** 会话失效或权限不足清除旧详情；不依赖正式路由完成隐藏。 / Clear stale detail after session expiry or denial without relying on routing. */
  it.each([
    { status: 401, error: ERROR_CODE.NEED_LOGIN },
    { status: 403, error: ERROR_CODE.FORBIDDEN },
  ])('clears detail after $status review errors', async function testDeniedReview(testCase) {
    const { state, service } = setupDetail()
    await flushPromises()
    service.reject.mockRejectedValueOnce(
      new ApiError('business', testCase.status, testCase.error.code),
    )
    await state.reject()
    expect(state.refund.value).toBeNull()
    expect(state.loadErrorMessage.value).toBe(testCase.error.message)
    expect(state.actionMessage.value).toBe('')
  })
  /** 回包丢失可能已审核，只读恢复而不自动重试POST。 / A lost response may hide committed review; reconcile with a read and never retry POST automatically. */
  it.each([
    new ApiError('network'),
    new ApiError('timeout'),
    new ApiError('protocol'),
    new ApiError('http', 500),
  ])('reconciles uncertain writes %#', async function testUncertainWrite(error) {
    const { state, service } = setupDetail()
    await flushPromises()
    service.approve.mockRejectedValueOnce(error)
    service.get.mockResolvedValueOnce(approvedRefund())
    expect(await state.approve()).toBe(false)
    expect(service.approve).toHaveBeenCalledTimes(1)
    expect(service.get).toHaveBeenCalledTimes(2)
    expect(state.refund.value?.status).toBe('approved')
    expect(state.actionErrorMessage.value).toContain(REFUND_COPY.uncertain)
    expect(state.actionMessage.value).toBe('')
    expect(state.loading.value).toBe(false)
    expect(state.actionBusy.value).toBe(false)
  })
  /** 复读失败时清除可审核的旧快照，保留未确认提示。 / Failed reconciliation clears a writable stale snapshot and retains uncertainty feedback. */
  it('clears stale review actions when reconciliation fails', async function testFailedReconciliation() {
    const { state, service } = setupDetail()
    await flushPromises()
    service.approve.mockRejectedValueOnce(new ApiError('timeout'))
    service.get.mockRejectedValueOnce(new ApiError('network'))
    await state.approve()
    expect(state.refund.value).toBeNull()
    expect(state.actionErrorMessage.value).toContain(REFUND_COPY.uncertain)
    expect(state.loadErrorMessage.value).toBeTruthy()
    expect(await state.reject()).toBe(false)
  })
  /** 拒绝读取详情不保留旧记录，支持再次重试。 / Denied rereads retain no old detail and support retry. */
  it('clears old detail while reloading and after forbidden reads', async function testReadDenial() {
    const { state, service } = setupDetail()
    await flushPromises()
    const response = deferred<Refund>()
    service.get.mockReturnValueOnce(response.promise)
    const reload = state.reload()
    expect(state.refund.value).toBeNull()
    response.reject(new ApiError('business', 403, ERROR_CODE.FORBIDDEN.code))
    await reload
    expect(state.refund.value).toBeNull()
    expect(state.loadErrorMessage.value).toBe(ERROR_CODE.FORBIDDEN.message)
    expect(await state.reload()).toBe(true)
  })
  /** 新ID读取成功后旧读取即使忽略取消返回，也不能覆盖新单。 / A late canceled read cannot replace a successfully loaded new refund. */
  it('ignores late reads after ID changes', async function testReadRace() {
    const service = createService()
    const response = deferred<Refund>()
    service.get.mockReturnValueOnce(response.promise)
    const { state, id } = setupDetail(service)
    const oldSignal = service.get.mock.calls[0]?.[1]
    const next = createRefund({ id: '9000000000000000030', refundNo: 'NEXT-REFUND' })
    service.get.mockResolvedValueOnce(next)
    id.value = next.id
    await flushPromises()
    response.resolve(createRefund())
    await flushPromises()
    expect(oldSignal?.aborted).toBe(true)
    expect(state.refund.value?.refundNo).toBe('NEXT-REFUND')
  })
  /** 切单后的迟到确认不允许提交旧申请。 / A late confirmation cannot submit the old application after switching IDs. */
  it('ignores late confirmation after ID changes', async function testConfirmationRace() {
    const response = deferred<boolean>()
    const { state, service, id } = setupDetail(createService(), {
      confirm: vi.fn().mockReturnValue(response.promise),
    })
    await flushPromises()
    const action = state.approve()
    id.value = '9000000000000000030'
    response.resolve(true)
    expect(await action).toBe(false)
    expect(service.approve).not.toHaveBeenCalled()
  })
  /** 切单后的旧写入结果不覆盖新单，也不显示旧成功提示。 / A late write result cannot replace the new refund or show stale success. */
  it('ignores late write responses after ID changes', async function testWriteRace() {
    const { state, service, id } = setupDetail()
    await flushPromises()
    const response = deferred<Refund>()
    service.approve.mockReturnValueOnce(response.promise)
    const action = state.approve()
    await flushPromises()
    const signal = service.approve.mock.calls[0]?.[2]
    const next = createRefund({ id: '9000000000000000030', refundNo: 'NEXT-REFUND' })
    service.get.mockResolvedValueOnce(next)
    id.value = next.id
    await flushPromises()
    response.resolve(approvedRefund())
    expect(await action).toBe(false)
    expect(signal?.aborted).toBe(true)
    expect(state.refund.value?.refundNo).toBe('NEXT-REFUND')
    expect(state.actionMessage.value).toBe('')
  })
  /** 卸载立即清空详情且丢弃迟到结果。 / Disposal immediately clears detail and discards late results. */
  it('cancels pending work and clears detail on disposal', async function testDisposal() {
    const service = createService()
    const response = deferred<Refund>()
    service.get.mockReturnValueOnce(response.promise)
    const { state, scope } = setupDetail(service)
    scope.stop()
    response.resolve(createRefund())
    await flushPromises()
    expect(state.refund.value).toBeNull()
    expect(await state.reload()).toBe(false)
  })
})
