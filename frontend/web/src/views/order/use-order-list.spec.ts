import { effectScope, type EffectScope } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { orderApi, type OrderPage } from '@/api/order'
import { ApiError } from '@/api/http'
import { useOrderList } from './use-order-list'
import { createOrder, projectOrder } from './order-test-data'

const scopes: EffectScope[] = []
/** 每例测试结束后卸载组合式函数；取消未完成请求。 / Dispose each composable after the test and cancel outstanding requests. */
afterEach(function cleanupScopes() {
  for (const scope of scopes) scope.stop()
})

/** 在独立Vue作用域内运行列表；返回状态及服务间谍。 / Run list state inside an isolated Vue scope with a typed service spy. */
function setupList() {
  const service = { list: vi.fn<typeof orderApi.list>() }
  const scope = effectScope()
  scopes.push(scope)
  /** 创建本次列表状态；仅作用于测试服务。 / Create list state backed only by the test service. */
  const state = scope.run(function initializeList() {
    return useOrderList(service)
  })!
  return { state, service, scope }
}

/** 验证筛选、分页、错误与迟到响应规则。 / Verify filtering, pagination, errors and stale response rules. */
describe('useOrderList', function orderListSuite() {
  /** 全部不传状态，修改筛选后从第一页加载。 / Omit all-status filtering and reset to page one after selection. */
  it('omits all status and resets pagination after filtering', async function testFiltering() {
    const { state, service } = setupList()
    service.list.mockResolvedValue({
      items: [projectOrder(createOrder())],
      total: 31,
      page: 1,
      pageSize: 20,
    })
    await state.load()
    expect(service.list.mock.calls[0]?.[0]).toEqual({ page: 1, pageSize: 20 })
    await state.setPage(2)
    await state.filter('done')
    expect(service.list.mock.lastCall?.[0]).toEqual({ page: 1, pageSize: 20, status: 'done' })
  })
  /** 区分成功空集合和失败，并允许重试。 / Distinguish a successful empty result from errors and allow retry. */
  it('distinguishes loading, empty and failure states', async function testEmptyAndRetry() {
    const { state, service } = setupList()
    service.list.mockRejectedValueOnce(new ApiError('network'))
    expect(await state.load()).toBe(false)
    expect(state.empty.value).toBe(false)
    expect(state.errorMessage.value).toBeTruthy()
    service.list.mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 })
    expect(await state.reload()).toBe(true)
    expect(state.empty.value).toBe(true)
    expect(state.errorMessage.value).toBe('')
  })
  /** 筛选后旧响应不能覆盖新结果，销毁取消请求。 / A superseded response cannot replace current rows; disposal cancels requests. */
  it('cancels and ignores late responses after filtering', async function testListRace() {
    const { state, service, scope } = setupList()
    let resolveOld!: (value: OrderPage) => void
    /** 保留旧请求以验证迟到结果。 / Retain the old request to test a late result. */
    service.list.mockImplementationOnce(function oldRequest() {
      /** 保存旧响应完成函数以验证取消保护。 / Save the old completion callback to verify cancellation guards. */
      return new Promise(function retainResolve(resolve) {
        resolveOld = resolve
      })
    })
    const old = state.load()
    const oldSignal = service.list.mock.calls[0]?.[1]
    service.list.mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 })
    await state.filter('cancelled')
    expect(oldSignal?.aborted).toBe(true)
    resolveOld({ items: [projectOrder(createOrder())], total: 1, page: 1, pageSize: 20 })
    await old
    await flushPromises()
    expect(state.items.value).toEqual([])
    scope.stop()
    expect(await state.load()).toBe(false)
  })
})
