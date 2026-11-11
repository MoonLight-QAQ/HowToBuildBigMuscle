import { defineComponent, effectScope, h, isReadonly, nextTick, type EffectScope } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { ElPagination } from 'element-plus'
import { useTable, type TableLoader } from './useTable'

type Row = { id: string }
type Result = Awaited<ReturnType<TableLoader<Row>>>
const scopes: EffectScope[] = []
const wrappers: VueWrapper[] = []

/** 创建可手动完成的异步结果；返回promise及控制函数，无外部副作用。 / Create a controllable promise for request ordering tests. */
function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  /** 捕获Promise的完成函数；参数为回调，返回void。 / Capture settlement callbacks and return void. */
  function capture(resolvePromise: typeof resolve, rejectPromise: typeof reject): void {
    resolve = resolvePromise
    reject = rejectPromise
  }
  const promise = new Promise<T>(capture)
  return { promise, resolve, reject }
}

/** 在独立作用域创建列表；参数为loader和初始分页，返回实例和scope。 / Create a scoped table for each fixture. */
function createTable(loader: TableLoader<Row>, initial?: { page?: number; pageSize?: number }) {
  const scope = effectScope()
  scopes.push(scope)
  /** 在scope内注册清理；无参数，返回列表实例。 / Register lifecycle cleanup and return the table. */
  function setupTable() {
    return useTable(loader, initial)
  }
  const table = scope.run(setupTable)
  if (!table) throw new Error('missing-test-table')
  return { table, scope }
}

/** 接入真实Element Plus分页器；返回表格状态和组件，清理时卸载。 / Mount real pagination and expose table state for regression tests. */
function createPagination(loader: TableLoader<Row>) {
  let table!: ReturnType<typeof useTable<Row>>
  /** 建立组件作用域并提供渲染函数。 / Register table disposal in the component scope and return its renderer. */
  function setupPagination() {
    table = useTable(loader)
    /** 用真实分页属性和事件联动。 / Bind live pagination props and update events; no network effects. */
    function renderPagination() {
      return h(ElPagination, {
        currentPage: table.page.value,
        pageSize: table.pageSize.value,
        total: table.total.value,
        layout: 'prev, pager, next',
        'onUpdate:currentPage': table.setPage,
      })
    }
    return renderPagination
  }
  const wrapper = mount(defineComponent({ setup: setupPagination }))
  wrappers.push(wrapper)
  return { table, wrapper }
}

/** 释放本例所有作用域；无参数、无返回，会取消待处理请求。 / Stop all fixture scopes and abort pending requests. */
function disposeTables(): void {
  for (const wrapper of wrappers) wrapper.unmount()
  wrappers.length = 0
  for (const scope of scopes) scope.stop()
  scopes.length = 0
}
afterEach(disposeTables)

/** 读取默认页与只读状态；无参数，不请求外部网络。 / Verify defaults, readonly state and lazy loading. */
it('默认从第1页、每页20条开始，不自动加载，也不将未加载当空态', function testInitialState() {
  const loader = vi.fn<TableLoader<Row>>()
  const { table } = createTable(loader)
  expect(table.page.value).toBe(1)
  expect(table.pageSize.value).toBe(20)
  expect(table.empty.value).toBe(false)
  expect(table.loading.value).toBe(false)
  expect(table.error.value).toBeNull()
  for (const state of [
    table.items,
    table.total,
    table.page,
    table.pageSize,
    table.loading,
    table.error,
  ]) {
    expect(isReadonly(state)).toBe(true)
  }
  expect(loader).not.toHaveBeenCalled()
})

/** 加载已校验行并传递取消信号；返回结果无字段转换。 / Pass pagination and abort signal while preserving row IDs. */
it('显式load传入分页并保存成功结果，保留字符串ID', async function testSuccessfulLoad() {
  const rows = [{ id: '1854239876543209472' }]
  /** 返回本地已校验数据，无副作用。 / Return fixture rows without external effects. */
  async function fetchRows(): Promise<Result> {
    return { items: rows, total: 31 }
  }
  const loader = vi.fn(fetchRows)
  const { table } = createTable(loader, { page: 2, pageSize: 10 })
  const pending = table.load()
  expect(table.loading.value).toBe(true)
  expect(table.empty.value).toBe(false)
  await expect(pending).resolves.toBe(true)
  expect(loader).toHaveBeenCalledWith({ page: 2, pageSize: 10, signal: expect.any(AbortSignal) })
  expect(table.items.value).toEqual(rows)
  rows.push({ id: 'later-mutation' })
  expect(table.items.value).toHaveLength(1)
  expect(table.total.value).toBe(31)
  expect(table.loading.value).toBe(false)
  expect(table.empty.value).toBe(false)
})

/** 成功空结果才开启空态；无输入，返回成功布尔值。 / Distinguish successful empty data from unloaded or failed states. */
it('成功空列表显示empty而不伪造错误', async function testEmptyResult() {
  /** 返回空集合，无副作用。 / Return an empty page without side effects. */
  async function fetchEmpty(): Promise<Result> {
    return { items: [], total: 0 }
  }
  const { table } = createTable(fetchEmpty)
  await expect(table.load()).resolves.toBe(true)
  expect(table.empty.value).toBe(true)
  expect(table.error.value).toBeNull()
})

/** 后续失败保留最后有效快照和错误，避免分页器重置。 / Retain valid data and expose the original failure without resetting pagination. */
it('最新请求失败保留旧数据和错误，失败不算空态或新结果', async function testFailure() {
  const failure = new Error('fixture-load-failed')
  const loader = vi
    .fn<TableLoader<Row>>()
    .mockResolvedValueOnce({ items: [{ id: 'old' }], total: 7 })
    .mockRejectedValueOnce(failure)
  const { table } = createTable(loader)
  await table.load()
  await expect(table.reload()).resolves.toBe(false)
  expect(table.items.value).toEqual([{ id: 'old' }])
  expect(table.total.value).toBe(7)
  expect(table.error.value).toBe(failure)
  expect(table.empty.value).toBe(false)
  expect(table.loading.value).toBe(false)
})

/** 空拒绝原因也必须保留可感知的失败状态。 / Normalize nullish rejection reasons into observable failures. */
it.each([null, undefined])(
  '空拒绝原因 %s 归一化为错误而不是空态',
  async function testNullishFailure(cause) {
    const loader = vi.fn<TableLoader<Row>>().mockRejectedValue(cause)
    const { table } = createTable(loader)
    await expect(table.load()).resolves.toBe(false)
    expect(table.error.value).toBeInstanceOf(Error)
    expect(table.items.value).toEqual([])
    expect(table.total.value).toBe(0)
    expect(table.empty.value).toBe(false)
    expect(table.loading.value).toBe(false)
  },
)

/** 快速切页会取消旧请求，旧成功无法覆盖新页。 / Abort the old page and ignore late successful responses. */
it('切页取消旧请求，忽略不响应abort的旧成功', async function testStaleSuccess() {
  const old = deferred<Result>()
  const current = deferred<Result>()
  const loader = vi
    .fn<TableLoader<Row>>()
    .mockReturnValueOnce(old.promise)
    .mockReturnValueOnce(current.promise)
  const { table } = createTable(loader)
  const first = table.load()
  const signal = loader.mock.calls[0]?.[0].signal
  const second = table.setPage(2)
  expect(signal?.aborted).toBe(true)
  expect(loader.mock.calls[1]?.[0].page).toBe(2)
  current.resolve({ items: [{ id: 'new' }], total: 30 })
  await expect(second).resolves.toBe(true)
  old.resolve({ items: [{ id: 'old' }], total: 50 })
  await expect(first).resolves.toBe(false)
  expect(table.items.value).toEqual([{ id: 'new' }])
  expect(table.total.value).toBe(30)
  expect(table.page.value).toBe(2)
})

/** 旧失败及finally均不可更新新请求状态。 / Late failures and cleanup cannot disturb the current request. */
it('旧请求失败不覆盖新请求的loading和error', async function testStaleFailure() {
  const old = deferred<Result>()
  const current = deferred<Result>()
  const loader = vi
    .fn<TableLoader<Row>>()
    .mockReturnValueOnce(old.promise)
    .mockReturnValueOnce(current.promise)
  const { table } = createTable(loader)
  const first = table.load()
  const second = table.reload()
  old.reject(new Error('old-error'))
  await expect(first).resolves.toBe(false)
  expect(table.loading.value).toBe(true)
  expect(table.error.value).toBeNull()
  current.resolve({ items: [{ id: 'current' }], total: 1 })
  await second
  expect(table.loading.value).toBe(false)
  expect(table.items.value).toEqual([{ id: 'current' }])
})

/** 取消立刻结束loading，不将后续abort失败当业务错误。 / Explicit cancel stops loading and ignores late rejection. */
it('cancel中止网络且迟到失败不写回，之后可以重新加载', async function testCancel() {
  const pendingResult = deferred<Result>()
  const loader = vi
    .fn<TableLoader<Row>>()
    .mockReturnValueOnce(pendingResult.promise)
    .mockResolvedValueOnce({ items: [], total: 0 })
  const { table } = createTable(loader)
  const first = table.load()
  table.cancel()
  expect(loader.mock.calls[0]?.[0].signal.aborted).toBe(true)
  expect(table.loading.value).toBe(false)
  pendingResult.reject(new Error('aborted-fixture'))
  await expect(first).resolves.toBe(false)
  expect(table.error.value).toBeNull()
  expect(table.empty.value).toBe(false)
  await expect(table.load()).resolves.toBe(true)
})

/** 销毁会取消未完成工作并禁止再次调用loader。 / Disposal prevents pending or subsequent work from mutating the table. */
it('作用域销毁取消请求，迟到成功和再次load均不写回', async function testScopeDisposal() {
  const pendingResult = deferred<Result>()
  const loader = vi.fn<TableLoader<Row>>().mockReturnValue(pendingResult.promise)
  const { table, scope } = createTable(loader)
  const pending = table.load()
  scope.stop()
  expect(loader.mock.calls[0]?.[0].signal.aborted).toBe(true)
  pendingResult.resolve({ items: [{ id: 'late' }], total: 1 })
  await expect(pending).resolves.toBe(false)
  expect(table.items.value).toEqual([])
  expect(table.loading.value).toBe(false)
  await expect(table.load()).resolves.toBe(false)
  expect(loader).toHaveBeenCalledTimes(1)
})

/** pageSize变更和显式筛选重置都回第一页。 / Page-size changes and filter resets load page one. */
it('setPageSize与reload(true)回到第一页，reload()保留当前页', async function testPaginationActions() {
  const loader = vi
    .fn<TableLoader<Row>>()
    .mockResolvedValue({ items: [{ id: 'page-row' }], total: 301 })
  const { table } = createTable(loader, { page: 4 })
  await table.setPageSize(100)
  expect(loader.mock.calls[0]?.[0]).toMatchObject({ page: 1, pageSize: 100 })
  await table.setPage(3)
  await table.reload()
  expect(loader.mock.calls[2]?.[0].page).toBe(3)
  await table.reload(true)
  expect(loader.mock.calls[3]?.[0].page).toBe(1)
})

/** 非法初始分页在请求前拒绝，无网络副作用。 / Reject invalid initial pagination before invoking a loader. */
it.each([
  { page: 0 },
  { page: -1 },
  { page: 1.5 },
  { page: NaN },
  { page: Infinity },
  { page: Number.MAX_SAFE_INTEGER + 1 },
  { pageSize: 0 },
  { pageSize: 101 },
])('拒绝非法初始分页 %j', function testInvalidInitial(initial) {
  const loader = vi.fn<TableLoader<Row>>()
  expect(() => createTable(loader, initial)).toThrow(RangeError)
  expect(loader).not.toHaveBeenCalled()
})

/** 非法操作不修改原分页或发起请求。 / Invalid pagination actions leave the previous state intact. */
it('非法切页与条数通过Promise拒绝，不修改状态或调用loader', async function testInvalidActions() {
  const loader = vi.fn<TableLoader<Row>>()
  const { table } = createTable(loader)
  await expect(table.setPage(0)).rejects.toThrow(RangeError)
  await expect(table.setPageSize(101)).rejects.toThrow(RangeError)
  expect(table.page.value).toBe(1)
  expect(table.pageSize.value).toBe(20)
  expect(loader).not.toHaveBeenCalled()
})

/** 错误元数据不能生成成功或空态。 / Reject impossible totals rather than manufacture successful data. */
it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  '拒绝非法列表总数 %s',
  async function testInvalidResult(total) {
    const loader = vi.fn<TableLoader<Row>>().mockResolvedValue({ items: [], total })
    const { table } = createTable(loader)
    await expect(table.load()).resolves.toBe(false)
    expect(table.error.value).toBeInstanceOf(TypeError)
    expect(table.empty.value).toBe(false)
  },
)

/** 加载时保留总数，真实分页器不能把第3页拉回第1页。 / Retain totals while loading so real pagination stays on page three. */
it('真实ElPagination加载第3页时只请求第1、3页并停留第3页', async function testRealPaginationLoading() {
  const third = deferred<Result>()
  const loader = vi
    .fn<TableLoader<Row>>()
    .mockResolvedValueOnce({ items: [{ id: 'first' }], total: 60 })
    .mockReturnValueOnce(third.promise)
  const { table, wrapper } = createPagination(loader)
  await table.load()
  await flushPromises()
  const pending = table.setPage(3)
  await nextTick()
  expect(table.loading.value).toBe(true)
  expect(table.items.value).toEqual([{ id: 'first' }])
  expect(table.total.value).toBe(60)
  expect(wrapper.get('.el-pager .is-active').text()).toBe('3')
  third.resolve({ items: [{ id: 'third' }], total: 60 })
  await expect(pending).resolves.toBe(true)
  await flushPromises()
  expect(loader.mock.calls.map(([query]) => query.page)).toEqual([1, 3])
  expect(table.page.value).toBe(3)
  expect(table.items.value).toEqual([{ id: 'third' }])
})

/** 失败时也保留有效总数，不产生分页器触发的隐式重试。 / Failure retains pagination metadata and cannot trigger hidden page-one retries. */
it('真实ElPagination第3页失败后不回第1页或自动重试', async function testRealPaginationFailure() {
  const failure = new Error('third-page-failed')
  const loader = vi
    .fn<TableLoader<Row>>()
    .mockResolvedValueOnce({ items: [{ id: 'first' }], total: 60 })
    .mockRejectedValueOnce(failure)
  const { table, wrapper } = createPagination(loader)
  await table.load()
  await flushPromises()
  await expect(table.setPage(3)).resolves.toBe(false)
  await flushPromises()
  expect(loader.mock.calls.map(([query]) => query.page)).toEqual([1, 3])
  expect(wrapper.get('.el-pager .is-active').text()).toBe('3')
  expect(table.total.value).toBe(60)
  expect(table.error.value).toBe(failure)
  expect(table.empty.value).toBe(false)
})

/** 删除末页最后一条后最多补取一次有效末页。 / Recover a shortened final page once without pagination feedback loops. */
it('末页最后一条删除后回到最后有效页并补取一次', async function testLastPageRecovery() {
  const loader = vi
    .fn<TableLoader<Row>>()
    .mockResolvedValueOnce({ items: [{ id: 'last-row' }], total: 41 })
    .mockResolvedValueOnce({ items: [], total: 40 })
    .mockResolvedValueOnce({ items: [{ id: 'remaining' }], total: 40 })
  const { table } = createTable(loader, { page: 3 })
  await table.load()
  await expect(table.reload()).resolves.toBe(true)
  expect(loader.mock.calls.map(([query]) => query.page)).toEqual([3, 3, 2])
  expect(table.page.value).toBe(2)
  expect(table.items.value).toEqual([{ id: 'remaining' }])
  expect(table.total.value).toBe(40)
})

/** 末页回退发布新总数时不触发真实分页器的额外请求。 / Last-page recovery updates real pagination without extra loads. */
it('真实ElPagination末页删除后稳定回到第2页', async function testRealPaginationRecovery() {
  const loader = vi
    .fn<TableLoader<Row>>()
    .mockResolvedValueOnce({ items: [{ id: 'first' }], total: 41 })
    .mockResolvedValueOnce({ items: [{ id: 'last-row' }], total: 41 })
    .mockResolvedValueOnce({ items: [], total: 40 })
    .mockResolvedValueOnce({ items: [{ id: 'remaining' }], total: 40 })
  const { table, wrapper } = createPagination(loader)
  await table.load()
  await flushPromises()
  await table.setPage(3)
  await flushPromises()
  await expect(table.reload()).resolves.toBe(true)
  await flushPromises()
  expect(loader.mock.calls.map(([query]) => query.page)).toEqual([1, 3, 3, 2])
  expect(table.page.value).toBe(2)
  expect(wrapper.get('.el-pager .is-active').text()).toBe('2')
  expect(table.items.value).toEqual([{ id: 'remaining' }])
})

/** 连续变化或不一致的结果不能形成无限重载。 / Bound recovery when totals keep changing or remain inconsistent. */
it('末页补取仍为空时暴露错误，不循环加载或伪造空态', async function testBoundedRecovery() {
  const loader = vi
    .fn<TableLoader<Row>>()
    .mockResolvedValueOnce({ items: [], total: 40 })
    .mockResolvedValueOnce({ items: [], total: 20 })
  const { table } = createTable(loader, { page: 3 })
  await expect(table.load()).resolves.toBe(false)
  expect(loader.mock.calls.map(([query]) => query.page)).toEqual([3, 2])
  expect(table.error.value).toBeInstanceOf(TypeError)
  expect(table.empty.value).toBe(false)
  expect(table.loading.value).toBe(false)
})

/** 仍在有效范围的空页是响应不一致，不能跳向更后的页。 / An empty valid page is inconsistent and must not navigate forward. */
it.each([
  { page: 1, total: 60 },
  { page: 2, total: 60 },
  { page: 2, total: 40 },
])('有效范围内的空页 %j 不调整页码或补取', async function testInconsistentValidPage(initial) {
  const loader = vi.fn<TableLoader<Row>>().mockResolvedValue({ items: [], total: initial.total })
  const { table } = createTable(loader, { page: initial.page })
  await expect(table.load()).resolves.toBe(false)
  expect(loader).toHaveBeenCalledTimes(1)
  expect(table.page.value).toBe(initial.page)
  expect(table.error.value).toBeInstanceOf(TypeError)
  expect(table.empty.value).toBe(false)
})

/** 末页补取同样接受取消和序号保护。 / Recovery shares abort and stale-result protection with ordinary loads. */
it('末页补取迟到成功不能覆盖用户新请求', async function testStaleRecovery() {
  const recovery = deferred<Result>()
  const loader = vi
    .fn<TableLoader<Row>>()
    .mockResolvedValueOnce({ items: [], total: 40 })
    .mockReturnValueOnce(recovery.promise)
    .mockResolvedValueOnce({ items: [{ id: 'new-filter' }], total: 1 })
  const { table } = createTable(loader, { page: 3 })
  const old = table.load()
  await flushPromises()
  const signal = loader.mock.calls[1]?.[0].signal
  await expect(table.reload(true)).resolves.toBe(true)
  expect(signal?.aborted).toBe(true)
  recovery.resolve({ items: [{ id: 'late-recovery' }], total: 40 })
  await expect(old).resolves.toBe(false)
  expect(table.items.value).toEqual([{ id: 'new-filter' }])
  expect(table.page.value).toBe(1)
})

/** 末页补取使用同一取消与销毁边界，迟到结果不可写回。 / Cancel or dispose a recovery request and ignore its late response. */
it.each(['cancel', 'dispose'] as const)(
  '末页补取中%s后迟到结果不写回',
  async function testStopRecovery(action) {
    const recovery = deferred<Result>()
    const loader = vi
      .fn<TableLoader<Row>>()
      .mockResolvedValueOnce({ items: [], total: 40 })
      .mockReturnValueOnce(recovery.promise)
    const { table, scope } = createTable(loader, { page: 3 })
    const pending = table.load()
    await flushPromises()
    const signal = loader.mock.calls[1]?.[0].signal
    if (action === 'cancel') table.cancel()
    else scope.stop()
    expect(signal?.aborted).toBe(true)
    recovery.resolve({ items: [{ id: 'late-recovery' }], total: 40 })
    await expect(pending).resolves.toBe(false)
    expect(table.items.value).toEqual([])
    expect(table.total.value).toBe(0)
    expect(table.loading.value).toBe(false)
    expect(table.error.value).toBeNull()
    if (action === 'dispose') await expect(table.load()).resolves.toBe(false)
    expect(loader).toHaveBeenCalledTimes(2)
  },
)

/** 全部记录删除后显式回到第1页。 / Reset to page one after the whole result becomes empty. */
it('所有记录已删除时回第1页并显示成功空态', async function testEntireResultDeleted() {
  const loader = vi.fn<TableLoader<Row>>().mockResolvedValue({ items: [], total: 0 })
  const { table } = createTable(loader, { page: 3 })
  await expect(table.load()).resolves.toBe(true)
  expect(table.page.value).toBe(1)
  expect(table.empty.value).toBe(true)
})
