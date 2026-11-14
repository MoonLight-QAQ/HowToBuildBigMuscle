import { effectScope, ref, type EffectScope } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { orderApi, type Order } from '@/api/order'
import { ApiError } from '@/api/http'
import { ERROR_CODE } from '@/constants/error-code'
import { ORDER_ACTION_COPY } from '@/constants/order'
import { useOrderDetail, type OrderConfirmation } from './use-order-detail'
import { createOrder } from './order-test-data'

const scopes: EffectScope[] = []
/** 清理作用域，禁止测试间遗留侦听或请求。 / Dispose scopes to prevent leaked watchers and requests between tests. */
afterEach(function cleanupScopes() {
  for (const scope of scopes) scope.stop()
  scopes.length = 0
})

/** 创建带显式完成控制的测试Promise；不执行网络。 / Create a manually resolved promise without network effects. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  /** 保存完成函数以重放请求先后顺序。 / Save completion functions to control response ordering. */
  const promise = new Promise<T>(function retainCompletion(onResolve, onReject) {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

/** 创建完全使用生成类型的服务间谍。 / Create service spies typed from generated contract aliases. */
function createService() {
  return {
    get: vi.fn<typeof orderApi.get>().mockResolvedValue(createOrder()),
    startDelivery: vi
      .fn<typeof orderApi.startDelivery>()
      .mockResolvedValue(createOrder({ status: 'delivering', version: 4 })),
    arrive: vi.fn<typeof orderApi.arrive>().mockResolvedValue(
      createOrder({
        status: 'done',
        version: 4,
        completedBy: 'staff',
        completedAt: '2026-11-02T07:30:00Z',
      }),
    ),
  }
}

/** 建立独立订单详情作用域；自动首读，默认确认成功。 / Mount isolated detail state with an initial read and affirmative confirmation. */
function setupDetail(
  service = createService(),
  confirmation: OrderConfirmation = { confirm: vi.fn().mockResolvedValue(true) },
) {
  const id = ref('9000000000000000010')
  const scope = effectScope()
  scopes.push(scope)
  /** 初始化组合式函数；请求只发给本例测试服务。 / Initialize the composable with this test's service only. */
  const state = scope.run(function initializeDetail() {
    return useOrderDetail(id, service, confirmation)
  })!
  return { state, service, id, scope, confirmation }
}

/** 验证订单详情、乐观锁提交与页面生命周期隔离。 / Verify detail, optimistic concurrency inputs and lifecycle isolation. */
describe('useOrderDetail', function orderDetailSuite() {
  /** 从返回快照取版本，开始配送成功后采用服务端新状态。 / Submit snapshot version and adopt the confirmed delivery result. */
  it('submits version and pending status only after confirmation', async function testStart() {
    const { state, service } = setupDetail()
    await flushPromises()
    expect(state.order.value?.contactPhone).toBe('0491 570 006')
    expect(await state.startDelivery()).toBe(true)
    expect(service.startDelivery).toHaveBeenCalledWith(
      '9000000000000000010',
      { version: 3, expectedStatus: 'pending' },
      expect.any(AbortSignal),
    )
    expect(state.order.value?.status).toBe('delivering')
    expect(state.actionMessage.value).toBe(ORDER_ACTION_COPY.success)
    expect(state.actionBusy.value).toBe(false)
  })
  /** 待配送与配送中都允许确认送达，保持原状态条件。 / Allow arrival from pending or delivering while preserving the expected status. */
  it.each(['pending', 'delivering'] as const)(
    'arrives from %s',
    async function testArrival(status) {
      const service = createService()
      service.get.mockResolvedValue(createOrder({ status }))
      const { state } = setupDetail(service)
      await flushPromises()
      expect(await state.arrive()).toBe(true)
      expect(service.arrive).toHaveBeenCalledWith(
        '9000000000000000010',
        { version: 3, expectedStatus: status },
        expect.any(AbortSignal),
      )
      expect(state.order.value?.completedBy).toBe('staff')
    },
  )
  /** 非配送状态不能触发写请求。 / Disallowed states never issue mutation requests. */
  it.each(['unpaid', 'done', 'refunding', 'refunded', 'cancelled'] as const)(
    'rejects delivery writes for %s',
    async function testForbiddenState(status) {
      const service = createService()
      service.get.mockResolvedValue(createOrder({ status }))
      const { state, confirmation } = setupDetail(service)
      await flushPromises()
      expect(await state.startDelivery()).toBe(false)
      expect(await state.arrive()).toBe(false)
      expect(confirmation.confirm).not.toHaveBeenCalled()
      expect(service.startDelivery).not.toHaveBeenCalled()
      expect(service.arrive).not.toHaveBeenCalled()
    },
  )
  /** 打开确认框即锁定操作，双击或另一操作不重复弹窗和提交。 / Lock while confirming so double clicks cannot duplicate dialogs or writes. */
  it('prevents duplicate actions while confirmation is pending', async function testDuplicateClick() {
    const confirmationResult = deferred<boolean>()
    const confirm = vi.fn().mockReturnValue(confirmationResult.promise)
    const { state, service } = setupDetail(createService(), { confirm })
    await flushPromises()
    const first = state.startDelivery()
    expect(state.actionBusy.value).toBe(true)
    expect(await state.startDelivery()).toBe(false)
    expect(await state.arrive()).toBe(false)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(service.startDelivery).not.toHaveBeenCalled()
    confirmationResult.resolve(true)
    await first
    expect(service.startDelivery).toHaveBeenCalledTimes(1)
  })
  /** 取消显示中性反馈，既不提交也不显示错误或成功。 / Cancellation shows neutral feedback without a write, error or success. */
  it('keeps cancellation distinct from failure and success', async function testCancel() {
    const { state, service } = setupDetail(createService(), {
      confirm: vi.fn().mockResolvedValue(false),
    })
    await flushPromises()
    expect(await state.arrive()).toBe(false)
    expect(state.actionErrorMessage.value).toBe('')
    expect(state.actionMessage.value).toBe(ORDER_ACTION_COPY.canceled)
    expect(state.actionMessageType.value).toBe('info')
    expect(service.arrive).not.toHaveBeenCalled()
    expect(state.order.value?.status).toBe('pending')
  })
  /** 写入失败不提前显示成功，不覆盖已读快照。 / Failed writes never show optimistic success or replace the saved snapshot. */
  it('does not show success on a failed write', async function testFailedWrite() {
    const { state, service } = setupDetail()
    await flushPromises()
    service.arrive.mockRejectedValueOnce(new ApiError('network'))
    expect(await state.arrive()).toBe(false)
    expect(state.actionMessage.value).toBe('')
    expect(state.actionErrorMessage.value).toBeTruthy()
    expect(state.order.value?.status).toBe('pending')
  })
  /** 回包丢失可能已提交，只读重新获取快照，绝不自动重试写入。 / Lost responses may hide a committed write; reread once and never auto-retry the mutation. */
  it.each([
    new ApiError('network'),
    new ApiError('timeout'),
    new ApiError('protocol'),
    new ApiError('http', 500),
  ])('reconciles uncertain mutation outcomes %#', async function testUncertainOutcome(error) {
    const { state, service } = setupDetail()
    await flushPromises()
    service.arrive.mockRejectedValueOnce(error)
    service.get.mockResolvedValueOnce(createOrder({ status: 'done', version: 4 }))
    expect(await state.arrive()).toBe(false)
    expect(service.arrive).toHaveBeenCalledTimes(1)
    expect(service.get).toHaveBeenCalledTimes(2)
    expect(state.order.value?.status).toBe('done')
    expect(state.actionErrorMessage.value).toContain(ORDER_ACTION_COPY.uncertain)
    expect(state.actionMessage.value).toBe('')
    expect(state.actionBusy.value).toBe(false)
  })
  /** 不确定写入后的只读请求失败，禁止保留旧收货信息和操作入口。 / Failed reconciliation cannot retain private detail or writable stale state. */
  it('clears stale writable detail when uncertain-outcome reload fails', async function testFailedReconciliation() {
    const { state, service } = setupDetail()
    await flushPromises()
    service.arrive.mockRejectedValueOnce(new ApiError('timeout'))
    service.get.mockRejectedValueOnce(new ApiError('network'))
    await state.arrive()
    expect(state.order.value).toBeNull()
    expect(state.loadErrorMessage.value).toBeTruthy()
    expect(state.actionErrorMessage.value).toContain(ORDER_ACTION_COPY.uncertain)
    expect(await state.arrive()).toBe(false)
    expect(service.arrive).toHaveBeenCalledTimes(1)
  })
  /** 冲突后重新读取最新订单，保留冲突提示且恢复操作状态。 / Reload on conflicts, retain the warning and settle busy state. */
  it.each([ERROR_CODE.VERSION_CONFLICT, ERROR_CODE.INVALID_STATUS])(
    'refreshes on $code',
    async function testConflict(definition) {
      const { state, service } = setupDetail()
      await flushPromises()
      service.arrive.mockRejectedValueOnce(new ApiError('business', 409, definition.code))
      service.get.mockResolvedValueOnce(createOrder({ status: 'delivering', version: 9 }))
      expect(await state.arrive()).toBe(false)
      expect(service.get).toHaveBeenCalledTimes(2)
      expect(state.order.value?.version).toBe(9)
      expect(state.actionErrorMessage.value).toBe(definition.message)
      expect(state.actionMessage.value).toBe('')
      expect(state.actionBusy.value).toBe(false)
      expect(state.loading.value).toBe(false)
    },
  )
  /** 会话失效或权限不足立即移除完整收货信息。 / Remove full recipient data immediately on expired sessions or denied access. */
  it.each([
    { status: 401, error: ERROR_CODE.NEED_LOGIN },
    { status: 403, error: ERROR_CODE.FORBIDDEN },
  ])('clears PII on $status mutation failures', async function testDeniedWrite(testCase) {
    const { state, service } = setupDetail()
    await flushPromises()
    service.arrive.mockRejectedValueOnce(
      new ApiError('business', testCase.status, testCase.error.code),
    )
    await state.arrive()
    expect(state.order.value).toBeNull()
    expect(state.loadErrorMessage.value).toBe(testCase.error.message)
    expect(state.actionMessage.value).toBe('')
  })
  /** 刷新开始即清除旧PII，失败不保留之前的联系人。 / Clear PII when reload starts and never restore it after denial. */
  it('clears previous detail while reloading and after forbidden reads', async function testReadDenial() {
    const { state, service } = setupDetail()
    await flushPromises()
    const response = deferred<Order>()
    service.get.mockReturnValueOnce(response.promise)
    const reload = state.reload()
    expect(state.order.value).toBeNull()
    expect(state.loading.value).toBe(true)
    response.reject(new ApiError('business', 403, ERROR_CODE.FORBIDDEN.code))
    await reload
    expect(state.order.value).toBeNull()
    expect(state.loadErrorMessage.value).toBe(ERROR_CODE.FORBIDDEN.message)
  })
  /** 切单取消旧读取，迟到旧结果不能覆盖新订单。 / Changing IDs cancels old reads and prevents late results replacing the new order. */
  it('ignores late reads after switching orders', async function testReadRace() {
    const service = createService()
    const response = deferred<Order>()
    service.get.mockReturnValueOnce(response.promise)
    const { state, id } = setupDetail(service)
    const oldSignal = service.get.mock.calls[0]?.[1]
    id.value = '9000000000000000020'
    service.get.mockResolvedValue(createOrder({ id: id.value }))
    await state.reload()
    expect(oldSignal?.aborted).toBe(true)
    response.resolve(createOrder())
    await flushPromises()
    expect(state.order.value?.id).toBe(id.value)
  })
  /** 切单后确认框的迟到同意不能发出旧订单写请求。 / A late confirmation cannot write the previous order after an ID change. */
  it('ignores confirmations after switching orders', async function testConfirmationRace() {
    const result = deferred<boolean>()
    const { state, id, service } = setupDetail(createService(), {
      confirm: vi.fn().mockReturnValue(result.promise),
    })
    await flushPromises()
    const write = state.arrive()
    id.value = '9000000000000000020'
    result.resolve(true)
    expect(await write).toBe(false)
    expect(service.arrive).not.toHaveBeenCalled()
  })
  /** 旧写入即使忽略取消并返回，也不能改变新单或显示成功。 / A late write result cannot change a new order or claim success even if cancellation is ignored. */
  it('ignores late mutation results after switching orders', async function testWriteRace() {
    const { state, id, service } = setupDetail()
    await flushPromises()
    const response = deferred<Order>()
    service.arrive.mockReturnValueOnce(response.promise)
    const write = state.arrive()
    await flushPromises()
    const oldSignal = service.arrive.mock.calls[0]?.[2]
    const next = createOrder({ id: '9000000000000000020', orderNo: 'NEXT-ORDER' })
    service.get.mockResolvedValueOnce(next)
    id.value = next.id
    await flushPromises()
    response.resolve(createOrder({ status: 'done' }))
    expect(await write).toBe(false)
    expect(oldSignal?.aborted).toBe(true)
    expect(state.order.value?.orderNo).toBe('NEXT-ORDER')
    expect(state.actionMessage.value).toBe('')
    expect(state.actionBusy.value).toBe(false)
  })
  /** 卸载清除PII并阻止迟到响应和再次刷新。 / Disposal clears PII, ignores late responses and prevents reloading. */
  it('disposes pending work without restoring private detail', async function testDisposal() {
    const response = deferred<Order>()
    const service = createService()
    service.get.mockReturnValueOnce(response.promise)
    const { state, scope } = setupDetail(service)
    scope.stop()
    response.resolve(createOrder())
    await flushPromises()
    expect(state.order.value).toBeNull()
    expect(await state.reload()).toBe(false)
  })
})
