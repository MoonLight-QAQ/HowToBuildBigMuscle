import { computed, getCurrentScope, onScopeDispose, readonly, ref, shallowRef } from 'vue'

/** 模块校验后的列表加载器；不绑定传输包装。 / A loader of validated rows, independent of wire envelopes. */
export type TableLoader<T> = (query: {
  page: number
  pageSize: number
  signal: AbortSignal
}) => Promise<{ items: T[]; total: number }>

/** 校验分页整数；失败抛 RangeError，无副作用。 / Validate a positive safe integer or throw, without effects. */
function validatePage(value: number, maximum = Number.MAX_SAFE_INTEGER): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum)
    throw new RangeError('invalid-pagination')
}

/** 管理页面本地分页状态；loader通过闭包读取筛选，筛选变化调用reload(true)。 / Read filters in the loader closure; reset with reload(true).
 * 返回/Returns: 只读状态和命名操作 / Readonly state and actions.
 * 副作用/Effects: 显式加载时调用loader；取消旧请求、忽略迟到结果；作用域销毁时取消 / Calls loader on demand and cancels on disposal.
 */
export function useTable<T>(
  loader: TableLoader<T>,
  initial: { page?: number; pageSize?: number } = {},
) {
  validatePage(initial.page ?? 1)
  validatePage(initial.pageSize ?? 20, 100)
  const page = ref(initial.page ?? 1)
  const pageSize = ref(initial.pageSize ?? 20)
  const items = shallowRef<T[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = shallowRef<unknown>(null)
  let sequence = 0
  let controller: AbortController | undefined
  let disposed = false
  const loaded = ref(false)
  /** 仅成功加载的空集合是空态；无参数、无副作用。 / Only a successful empty result is empty state. */
  const empty = computed(function isEmpty() {
    return (
      loaded.value &&
      !loading.value &&
      error.value === null &&
      items.value.length === 0 &&
      total.value === 0
    )
  })

  /** 取消当前加载并废弃未返回的数据；无参数，返回void。 / Cancel and invalidate pending work; returns void. */
  function cancel(): void {
    sequence += 1
    controller?.abort()
    controller = undefined
    loading.value = false
  }

  /** 加载当前页，最多补取一次缩短后的末页。 / Load a page and recover a shortened last page at most once.
   * 参数/Params: 无。返回/Returns: 成功true，失败/过时false；失败保留上次数据，须按error显示错误 / Preserve prior rows on failure; render error explicitly.
   */
  async function load(): Promise<boolean> {
    if (disposed) return false
    cancel()
    const request = sequence
    const current = new AbortController()
    controller = current
    let requestedPage = page.value
    const requestedSize = pageSize.value
    loading.value = true
    loaded.value = false
    error.value = null
    // 保留有效总数，避免分页器把待加载页改回1。 / Retain totals so pagination cannot reset a pending page to one.
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const result = await loader({
          page: requestedPage,
          pageSize: requestedSize,
          signal: current.signal,
        })
        if (request !== sequence || current.signal.aborted) return false
        if (
          !Array.isArray(result.items) ||
          !Number.isSafeInteger(result.total) ||
          result.total < result.items.length
        )
          throw new TypeError('invalid-table-result')
        if (result.items.length === 0 && result.total > 0) {
          const lastPage = Math.ceil(result.total / requestedSize)
          if (attempt > 0 || requestedPage <= lastPage)
            throw new TypeError('inconsistent-table-page')
          requestedPage = lastPage
          page.value = requestedPage
          continue
        }
        if (result.total === 0) page.value = 1
        items.value = [...result.items]
        total.value = result.total
        loaded.value = true
        return true
      }
      return false
    } catch (cause) {
      if (request === sequence && !current.signal.aborted)
        error.value = cause ?? new Error('table-load-failed')
      return false
    } finally {
      if (request === sequence) {
        loading.value = false
        controller = undefined
      }
    }
  }

  /** 刷新当前或第一页；筛选变化传true，返回加载结果。 / Pass true after filter changes to load page one. */
  function reload(resetPage = false): Promise<boolean> {
    if (resetPage) page.value = 1
    return load()
  }
  /** 切换页码并加载；非法页码返回拒绝的Promise，不改状态。 / Invalid page values reject the promise without mutation. */
  async function setPage(value: number): Promise<boolean> {
    validatePage(value)
    page.value = value
    return load()
  }
  /** 修改条数并回第一页；非法值返回拒绝的Promise。 / Set size from 1 to 100; invalid values reject the promise. */
  async function setPageSize(value: number): Promise<boolean> {
    validatePage(value, 100)
    pageSize.value = value
    return reload(true)
  }
  /** 销毁后禁止再次加载；无参数，无返回，取消网络操作。 / Dispose permanently and cancel pending work. */
  function dispose(): void {
    disposed = true
    cancel()
  }
  if (getCurrentScope()) onScopeDispose(dispose)
  return {
    items: readonly(items),
    total: readonly(total),
    page: readonly(page),
    pageSize: readonly(pageSize),
    loading: readonly(loading),
    error: readonly(error),
    empty,
    load,
    reload,
    setPage,
    setPageSize,
    cancel,
  }
}
