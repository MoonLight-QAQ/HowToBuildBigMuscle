import { effectScope, ref, type EffectScope } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { refundApi, type RefundPage, type RefundStatus } from '@/api/refund'
import { ApiError } from '@/api/http'
import { useRefundList } from './use-refund-list'
import { createRefund } from './refund-test-data'

const scopes: EffectScope[] = []
/** 清理测试作用域，取消遗留请求。 / Dispose test scopes and cancel outstanding requests. */
afterEach(function cleanupScopes() {
  for (const scope of scopes) scope.stop()
  scopes.length = 0
})

/** 创建独立列表与契约类型的服务间谍，不访问网络。 / Create isolated list state and contract-typed service spies without network access. */
function setupList(initial?: RefundStatus) {
  const service = { list: vi.fn<typeof refundApi.list>() }
  const hostStatus = ref<RefundStatus | undefined>(initial)
  const scope = effectScope()
  scopes.push(scope)
  /** 只在本例作用域内建立列表状态。 / Initialize list state within this test scope. */
  const state = scope.run(function initializeList() {
    return useRefundList(hostStatus, service)
  })!
  return { state, service, hostStatus, scope }
}

/** 验证待审入口、筛选分页、错误与取消保护。 / Verify pending-entry filters, pagination, errors and cancellation guards. */
describe('useRefundList', function refundListSuite() {
  /** 宿主可直接进入待审列表，全部时省略状态，筛选回到第一页。 / Allow a pending-entry filter, omit all status and reset pages after filtering. */
  it('supports the pending entry and all-status filtering', async function testInitialFilter() {
    const { state, service } = setupList('open')
    service.list.mockResolvedValue({ items: [createRefund()], total: 30, page: 1, pageSize: 20 })
    await state.load()
    expect(service.list.mock.lastCall?.[0]).toEqual({ page: 1, pageSize: 20, status: 'open' })
    await state.setPage(2)
    await state.filter('')
    expect(service.list.mock.lastCall?.[0]).toEqual({ page: 1, pageSize: 20 })
    expect(state.page.value).toBe(1)
  })
  /** 宿主重新打开待审入口时响应其筛选变化。 / React when the host opens the pending entry again. */
  it('reacts to changes in the host entry status', async function testHostFilter() {
    const { state, service, hostStatus } = setupList()
    service.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })
    await state.load()
    hostStatus.value = 'open'
    await flushPromises()
    expect(state.status.value).toBe('open')
    expect(service.list.mock.lastCall?.[0]).toEqual({ page: 1, pageSize: 20, status: 'open' })
  })
  /** 成功空集合与读取失败分开，重试可恢复。 / Separate a successful empty result from read failures and recover on retry. */
  it('distinguishes empty and failed results with retry', async function testRetry() {
    const { state, service } = setupList()
    service.list.mockRejectedValueOnce(new ApiError('network'))
    expect(await state.load()).toBe(false)
    expect(state.errorMessage.value).toBeTruthy()
    expect(state.empty.value).toBe(false)
    service.list.mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 })
    expect(await state.reload()).toBe(true)
    expect(state.empty.value).toBe(true)
    expect(state.errorMessage.value).toBe('')
  })
  /** 取消旧请求并忽略筛选变化后的迟到结果。 / Cancel old requests and ignore late responses after filtering. */
  it('ignores late list responses after changing filters', async function testListRace() {
    const { state, service } = setupList()
    let resolve!: (value: RefundPage) => void
    /** 暂存旧请求以控制返回顺序。 / Retain the old request to control completion ordering. */
    const oldResponse = new Promise<RefundPage>(function retainResponse(complete) {
      resolve = complete
    })
    service.list.mockReturnValueOnce(oldResponse)
    const old = state.load()
    const signal = service.list.mock.calls[0]?.[1]
    service.list.mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 })
    await state.filter('rejected')
    expect(signal?.aborted).toBe(true)
    resolve({ items: [createRefund()], total: 1, page: 1, pageSize: 20 })
    await old
    expect(state.items.value).toEqual([])
  })
})
