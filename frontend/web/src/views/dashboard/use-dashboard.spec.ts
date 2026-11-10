import { effectScope, type EffectScope } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/http'
import { CLIENT_ERROR_MESSAGES, ERROR_CODE } from '@/constants/error-code'
import { useDashboard } from './use-dashboard'
import { createSummary, deferredSummary } from './dashboard-test-data'
import type { Summary } from '@/api/dashboard'

const scopes: EffectScope[] = []
/** 在Vue作用域运行读取逻辑；输入假服务，返回状态及可停止的作用域。
 * / Run reads in a Vue scope with a supplied fake service and return state plus stoppable scope.
 */
function setup(get: (signal?: AbortSignal) => Promise<Summary>) {
  const scope = effectScope()
  scopes.push(scope)
  const state = scope.run(
    /** 创建局部概览数据层，无网络副作用。 / Create the local dashboard data layer without network effects. */
    function initialize() {
      return useDashboard({ get })
    },
  )!
  return { scope, state }
}
/** 清除响应式作用域与间谍；防止测试泄漏。
 * / Dispose reactive scopes and spies to prevent test leakage.
 */
afterEach(function cleanup() {
  for (const scope of scopes) scope.stop()
  scopes.length = 0
  vi.restoreAllMocks()
})

/** 验证首读前没有伪造零，成功返回原计数并按配送方式分组。
 * / Verify no invented zeros before success, then retain counts and group cities by fulfillment.
 */
it('starts empty and displays server counts and city groups only after success', async function testRead() {
  const pending = deferredSummary()
  const { state } = setup(vi.fn().mockReturnValue(pending.promise))
  expect(state.summary.value).toBeNull()
  expect(state.errorMessage.value).toBe('')
  const result = state.load()
  expect(state.loading.value).toBe(true)
  expect(state.summary.value).toBeNull()
  pending.resolve(createSummary())
  expect(await result).toBe(true)
  expect(state.summary.value?.pendingOrderCount).toBe(3)
  expect(
    state.localCities.value.map(
      /** 提取展示城市名；不修改投影。 / Extract display names without mutating projections. */
      function cityName(city) {
        return city.nameZh
      },
    ),
  ).toEqual(['演示线下城市'])
  expect(state.postCities.value[0]?.nameZh).toBe('演示快递城市')
  expect(state.loading.value).toBe(false)
})

/** 刷新期间立即撤下旧快照，鉴权错误后保持清空，不能显示过期待办。
 * / Remove old snapshots during refresh and keep them cleared after authorization errors.
 */
it.each([ERROR_CODE.NEED_LOGIN, ERROR_CODE.FORBIDDEN])(
  'clears loaded values before refresh and after $code',
  async function testAuthFailure(definition) {
    const failure = deferredSummary()
    const get = vi.fn().mockResolvedValueOnce(createSummary()).mockReturnValueOnce(failure.promise)
    const { state } = setup(get)
    await state.load()
    const refresh = state.load()
    expect(state.summary.value).toBeNull()
    expect(state.localCities.value).toEqual([])
    failure.reject(
      new ApiError('business', definition.code === 'NEED_LOGIN' ? 401 : 403, definition.code),
    )
    expect(await refresh).toBe(false)
    expect(state.summary.value).toBeNull()
    expect(state.errorMessage.value).toBe(definition.message)
  },
)

/** 新请求取消旧请求；较晚返回的旧成功不得覆盖当前工作量。
 * / New reads cancel predecessors; late old success must never overwrite current workload.
 */
it('aborts superseded reads and ignores their late success', async function testLateSuccess() {
  const old = deferredSummary(),
    latest = deferredSummary()
  const get = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
  const { state } = setup(get)
  const first = state.load(),
    second = state.load()
  expect(get.mock.calls[0]?.[0]?.aborted).toBe(true)
  latest.resolve(createSummary({ pendingOrderCount: 9 }))
  expect(await second).toBe(true)
  old.resolve(createSummary({ pendingOrderCount: 99 }))
  expect(await first).toBe(false)
  expect(state.summary.value?.pendingOrderCount).toBe(9)
  expect(state.errorMessage.value).toBe('')
})

/** 已过期的错误不得替换已成功的新快照或重置其加载状态。
 * / Superseded errors cannot replace a new successful snapshot or its loading state.
 */
it('ignores late failures from superseded reads', async function testLateError() {
  const old = deferredSummary()
  const get = vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce(createSummary())
  const { state } = setup(get)
  const first = state.load()
  await state.load()
  old.reject(new ApiError('business', 403, 'FORBIDDEN'))
  expect(await first).toBe(false)
  expect(state.summary.value?.pendingOrderCount).toBe(3)
  expect(state.loading.value).toBe(false)
  expect(state.errorMessage.value).toBe('')
})

/** 作用域结束清空数据、取消读取，迟到成功不能复活页面。
 * / Scope disposal clears data and cancels reads; late success cannot revive the page.
 */
it('disposes and ignores a late response without starting new reads', async function testDispose() {
  const pending = deferredSummary()
  const get = vi.fn().mockReturnValue(pending.promise)
  const { scope, state } = setup(get)
  const result = state.load()
  scope.stop()
  expect(get.mock.calls[0]?.[0]?.aborted).toBe(true)
  pending.resolve(createSummary())
  expect(await result).toBe(false)
  expect(state.summary.value).toBeNull()
  expect(state.loading.value).toBe(false)
  expect(await state.load()).toBe(false)
  expect(get).toHaveBeenCalledTimes(1)
})

/** 未知异常仅显示公共安全文案，不泄露原异常；手动重试仍可恢复真实零。
 * / Unknown errors use safe public text; manual retry may recover genuine zero counts.
 */
it('uses safe errors and recovers zero values on retry', async function testSafeRetry() {
  const get = vi
    .fn()
    .mockRejectedValueOnce(new Error('private internals'))
    .mockResolvedValueOnce(
      createSummary({
        pendingOrderCount: 0,
        deliveringOrderCount: 0,
        openRefundCount: 0,
        openReportCount: 0,
        cities: [],
      }),
    )
  const { state } = setup(get)
  expect(await state.load()).toBe(false)
  expect(state.errorMessage.value).toBe(CLIENT_ERROR_MESSAGES.http)
  expect(await state.load()).toBe(true)
  expect(state.summary.value?.pendingOrderCount).toBe(0)
  expect(state.errorMessage.value).toBe('')
  expect(state.localCities.value).toEqual([])
  expect(state.postCities.value).toEqual([])
})
