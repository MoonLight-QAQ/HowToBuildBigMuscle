import { effectScope, isReadonly, type EffectScope } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import { useTable, type TableLoader } from './useTable'

type Row = { id: string }
type Result = Awaited<ReturnType<TableLoader<Row>>>
const scopes: EffectScope[] = []

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

/** 释放本例所有作用域；无参数、无返回，会取消待处理请求。 / Stop all fixture scopes and abort pending requests. */
function disposeTables(): void {
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

/** 后续失败清除旧行和总数；保留错误供模块处理。 / Clear stale rows and expose the original loader failure. */
it('最新请求失败清空旧数据并保留错误，失败不算空态', async function testFailure() {
  const failure = new Error('fixture-load-failed')
  const loader = vi
    .fn<TableLoader<Row>>()
    .mockResolvedValueOnce({ items: [{ id: 'old' }], total: 7 })
    .mockRejectedValueOnce(failure)
  const { table } = createTable(loader)
  await table.load()
  await expect(table.reload()).resolves.toBe(false)
  expect(table.items.value).toEqual([])
  expect(table.total.value).toBe(0)
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
  const loader = vi.fn<TableLoader<Row>>().mockResolvedValue({ items: [], total: 0 })
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
it('非法切页与条数不修改状态或调用loader', function testInvalidActions() {
  const loader = vi.fn<TableLoader<Row>>()
  const { table } = createTable(loader)
  expect(() => table.setPage(0)).toThrow(RangeError)
  expect(() => table.setPageSize(101)).toThrow(RangeError)
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
