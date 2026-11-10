import { effectScope, nextTick, ref, type EffectScope } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/http'
import type { Report, ReportStatus } from '@/api/report'
import { REPORT_COPY } from '@/constants/report'
import { useReportPage } from './use-report-page'
import { createReport, createReportPage, deferred } from './report-test-data'

const scopes: EffectScope[] = []
/** 创建隔离服务间谍和Vue作用域；无真实请求，返回可检查的本地状态。 / Create isolated service spies and a Vue scope without real requests. */
function setup(initial = ref<ReportStatus | undefined>(undefined)) {
  const service = {
    list: vi.fn().mockResolvedValue(createReportPage()),
    get: vi.fn().mockResolvedValue(createReport()),
    ignore: vi.fn().mockResolvedValue(createReport({ status: 'ignored', version: 1 })),
    takedown: vi.fn().mockResolvedValue(createReport({ status: 'handled', version: 1 })),
  }
  const confirmation = { confirm: vi.fn().mockResolvedValue(true) }
  const scope = effectScope()
  scopes.push(scope)
  const state = scope.run(
    /** 在可销毁的作用域内创建数据层。 / Create the data layer in a disposable scope. */
    function initialize() {
      return useReportPage(initial, service, confirmation)
    },
  )!
  return { state, service, confirmation, scope, initial }
}
/** 清理响应式作用域，阻止请求和watch跨测试泄漏。 / Dispose scopes to prevent reads and watches leaking between tests. */
afterEach(function cleanup() {
  for (const scope of scopes) scope.stop()
  scopes.length = 0
  vi.restoreAllMocks()
})

/** 待处理为默认入口；全部筛选通过省略status表达，分页由公共表格传递。 / Open is the default entry; all statuses omit the filter and use shared pagination. */
it('loads open by default and resets pagination for all statuses', async function testFilters() {
  const { state, service } = setup()
  await state.reload()
  expect(service.list.mock.calls[0]?.[0]).toEqual({ page: 1, pageSize: 20, status: 'open' })
  await state.filter('')
  expect(service.list.mock.calls[1]?.[0]).toEqual({ page: 1, pageSize: 20 })
  await state.setPageSize(10)
  expect(service.list.mock.calls[2]?.[0]).toEqual({ page: 1, pageSize: 10 })
})
/** 处理前按字符串ID读取当前投影，原列表快照不作为写入依据。 / Read current detail using the string ID before handling instead of writing from list snapshots. */
it('selects the latest report and clears it when returning', async function testSelection() {
  const { state, service } = setup()
  await state.reload()
  await state.select('9000000000000000030')
  expect(service.get).toHaveBeenCalledWith('9000000000000000030', expect.any(AbortSignal))
  expect(state.report.value?.version).toBe(0)
  state.close()
  expect(state.report.value).toBeNull()
  expect(state.selectedId.value).toBe('')
})
/** 取消确认不提交；忽略只发送举报版本与旧状态，成功后重新加载列表。 / Cancellation sends nothing; ignore submits only report version/state and refreshes rows after success. */
it('cancels first, then confirms ignore without extra fields', async function testIgnore() {
  const { state, service, confirmation } = setup()
  await state.reload()
  await state.select('9000000000000000030')
  confirmation.confirm.mockResolvedValueOnce(false)
  expect(await state.ignore()).toBe(false)
  expect(service.ignore).not.toHaveBeenCalled()
  expect(state.actionMessage.value).toBe(REPORT_COPY.canceled)
  expect(await state.ignore()).toBe(true)
  expect(service.ignore).toHaveBeenCalledWith(
    '9000000000000000030',
    { version: 0, expectedStatus: 'open' },
    expect.any(AbortSignal),
  )
  expect(service.list).toHaveBeenCalledTimes(2)
})
/** 原因在确认前校验，合法原文进入整帖下架请求。 / Validate reason before confirmation and send valid raw text for whole-post takedown. */
it('requires a valid on-sale reason before confirmation', async function testTakedown() {
  const { state, service, confirmation } = setup()
  await state.select('9000000000000000030')
  state.reason.value = ' \n'
  expect(await state.takedown()).toBe(false)
  expect(confirmation.confirm).not.toHaveBeenCalled()
  expect(state.actionErrorMessage.value).toBe(REPORT_COPY.reasonInvalid)
  state.reason.value = ' 虚构原因 '
  expect(await state.takedown()).toBe(true)
  expect(confirmation.confirm).toHaveBeenCalledWith(REPORT_COPY.takedownConfirm)
  expect(service.takedown).toHaveBeenCalledWith(
    '9000000000000000030',
    { version: 0, expectedStatus: 'open', expectedListingStatus: 'on_sale', reason: ' 虚构原因 ' },
    expect.any(AbortSignal),
  )
})
/** 已非在售只关举报，不提交或覆盖原原因。 / Close off-sale reports without submitting or overriding a reason. */
it('closes an off-sale report without a reason field', async function testCloseOnly() {
  const { state, service, confirmation } = setup()
  const record = createReport()
  record.listing.status = 'self_removed'
  record.listing.removeReason = '原原因'
  service.get.mockResolvedValue(record)
  await state.select(record.id)
  state.reason.value = '旧表单'
  await state.takedown()
  expect(confirmation.confirm).toHaveBeenCalledWith(REPORT_COPY.closeConfirm)
  expect(service.takedown.mock.calls[0]?.[1]).toEqual({
    version: 0,
    expectedStatus: 'open',
    expectedListingStatus: 'self_removed',
  })
})
/** 确认与写入期间锁定上下文，双击、刷新、关闭和切单都不会发起新操作。 / Lock context during confirmation/writes so double clicks, refresh, close and selection cannot start work. */
it('blocks duplicate actions and context changes while confirming', async function testBusyGuard() {
  const { state, service, confirmation } = setup()
  await state.select('9000000000000000030')
  const prompt = deferred<boolean>()
  confirmation.confirm.mockReturnValueOnce(prompt.promise)
  const first = state.ignore()
  expect(state.busy.value).toBe(true)
  expect(await state.ignore()).toBe(false)
  expect(await state.reload()).toBe(false)
  expect(await state.refreshDetail()).toBe(false)
  expect(await state.select('2')).toBe(false)
  state.close()
  expect(state.selectedId.value).toBe('9000000000000000030')
  prompt.resolve(true)
  await first
  expect(service.ignore).toHaveBeenCalledTimes(1)
  expect(state.busy.value).toBe(false)
})
/** 冲突仅复读一次并要求重新确认，不能自动重发POST。 / Reconcile conflicts once through GET and require a new confirmation instead of POST retry. */
it('rereads conflicts and uses the fresh version only after another confirmation', async function testConflict() {
  const { state, service, confirmation } = setup()
  service.get
    .mockResolvedValueOnce(createReport())
    .mockResolvedValueOnce(createReport({ version: 7 }))
  await state.select('9000000000000000030')
  service.ignore.mockRejectedValueOnce(new ApiError('business', 409, 'VERSION_CONFLICT'))
  expect(await state.ignore()).toBe(false)
  expect(service.ignore).toHaveBeenCalledTimes(1)
  expect(service.get).toHaveBeenCalledTimes(2)
  expect(state.report.value?.version).toBe(7)
  await state.ignore()
  expect(service.ignore.mock.calls[1]?.[1].version).toBe(7)
  expect(confirmation.confirm).toHaveBeenCalledTimes(2)
})
/** 写入回包未知时只复读一次，复读失败仍保留未确认提示。 / Unknown write responses trigger one read; failed reconciliation keeps uncertainty feedback. */
it.each([true, false])(
  'does not retry uncertain writes, reconciliation success=%s',
  async function testUncertain(success) {
    const { state, service } = setup()
    await state.select('9000000000000000030')
    service.ignore.mockRejectedValueOnce(new ApiError('network'))
    if (success) service.get.mockResolvedValueOnce(createReport({ status: 'ignored', version: 1 }))
    else service.get.mockRejectedValueOnce(new ApiError('timeout'))
    expect(await state.ignore()).toBe(false)
    expect(service.ignore).toHaveBeenCalledTimes(1)
    expect(service.get).toHaveBeenCalledTimes(2)
    expect(state.actionErrorMessage.value).toContain(REPORT_COPY.uncertain)
    expect(state.busy.value).toBe(false)
  },
)
/** 权限错误撤下列表与处理资料，不保留可导航的旧投影。 / Access failures withdraw both rows and selected projections without stale navigation. */
it.each([401, 403])(
  'clears visible rows and detail after action %s',
  async function testActionAccess(status) {
    const { state, service } = setup()
    await state.reload()
    await state.select('9000000000000000030')
    service.ignore.mockRejectedValue(
      new ApiError('business', status, status === 401 ? 'NEED_LOGIN' : 'FORBIDDEN'),
    )
    await state.ignore()
    expect(state.report.value).toBeNull()
    expect(state.items.value).toEqual([])
    expect(state.errorMessage.value).not.toBe('')
  },
)
/** 读取权限失效同样清旧详情，普通失败不伪装为空数据。 / Read access failures clear detail and ordinary failures never masquerade as empty data. */
it('clears both projections when list refresh access fails', async function testListAccess() {
  const { state, service } = setup()
  await state.reload()
  await state.select('9000000000000000030')
  service.list.mockRejectedValue(new ApiError('business', 403, 'FORBIDDEN'))
  await state.reload()
  expect(state.items.value).toEqual([])
  expect(state.report.value).toBeNull()
  expect(state.empty.value).toBe(false)
})

/** 权限恢复重试先重新读取列表，不直接复活撤下的旧缓存。 / Retry after access recovery reloads the list instead of reviving withdrawn cached rows. */
it('requires a fresh authorized list before leaving an access error', async function testAccessRecovery() {
  const { state, service } = setup()
  await state.reload()
  await state.select('9000000000000000030')
  service.ignore.mockRejectedValueOnce(new ApiError('business', 403, 'FORBIDDEN'))
  await state.ignore()
  service.list.mockResolvedValueOnce(createReportPage([]))
  await state.refreshDetail()
  expect(service.get).toHaveBeenCalledTimes(1)
  expect(service.list).toHaveBeenCalledTimes(2)
  expect(state.items.value).toEqual([])
  expect(state.selectedId.value).toBe('')
  expect(state.errorMessage.value).toBe('')
})
/** 切单时取消旧GET，旧成功或错误不能覆盖新选择。 / Switching selections aborts old GETs and ignores late successes or errors. */
it.each([true, false])(
  'isolates late detail responses, success=%s',
  async function testLateRead(success) {
    const { state, service } = setup()
    const old = deferred<Report>()
    service.get.mockReturnValueOnce(old.promise).mockResolvedValueOnce(createReport({ id: '2' }))
    const first = state.select('1')
    const oldSignal = service.get.mock.calls[0]?.[1]
    await state.select('2')
    expect(oldSignal.aborted).toBe(true)
    if (success) old.resolve(createReport({ id: '1' }))
    else old.reject(new ApiError('network'))
    await first
    expect(state.report.value?.id).toBe('2')
    expect(state.detailErrorMessage.value).toBe('')
  },
)
/** 卸载后取消写入并忽略迟到成功，不回写页面状态或刷新列表。 / Disposal cancels writes and ignores late success without state updates or list refresh. */
it('disposes during writes and ignores late success', async function testDispose() {
  const { state, service, scope } = setup()
  await state.select('9000000000000000030')
  const pending = deferred<Report>()
  service.ignore.mockReturnValueOnce(pending.promise)
  const result = state.ignore()
  await nextTick()
  scope.stop()
  pending.resolve(createReport({ status: 'ignored', version: 1 }))
  expect(await result).toBe(false)
  expect(state.report.value).toBeNull()
  expect(service.list).not.toHaveBeenCalled()
})
/** 宿主筛选切换废弃正在等待的确认，不能把旧操作带到新入口。 / Host filter changes invalidate pending confirmation instead of carrying actions into a new entry. */
it('invalidates a pending confirmation when the host entry changes', async function testHostChange() {
  const { state, service, confirmation, initial } = setup()
  await state.select('9000000000000000030')
  const prompt = deferred<boolean>()
  confirmation.confirm.mockReturnValueOnce(prompt.promise)
  const result = state.ignore()
  initial.value = 'handled'
  await nextTick()
  prompt.resolve(true)
  expect(await result).toBe(false)
  expect(service.ignore).not.toHaveBeenCalled()
  expect(state.status.value).toBe('handled')
})
