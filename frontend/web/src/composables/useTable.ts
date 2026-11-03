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

/** 管理页面本地分页状态；参数为已校验数据的加载器。 / Manage local paging using a validated-data loader.
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
    return loaded.value && !loading.value && error.value === null && items.value.length === 0
  })

  /** 取消当前加载并废弃未返回的数据；无参数，返回void。 / Cancel and invalidate pending work; returns void. */
  function cancel(): void {
    sequence += 1
    controller?.abort()
    controller = undefined
    loading.value = false
  }

  /** 加载当前页；无参数，成功返回true，失败或过时返回false。 / Load current page; return false for failure or stale work.
   * 副作用/Effects: 调用loader并更新本页状态，错误仅暴露给调用者处理 / Call loader, update state, expose errors for caller handling.
   */
  async function load(): Promise<boolean> {
    if (disposed) return false
    cancel()
    const request = sequence
    const current = new AbortController()
    controller = current
    loading.value = true
    loaded.value = false
    error.value = null
    items.value = []
    total.value = 0
    try {
      const result = await loader({
        page: page.value,
        pageSize: pageSize.value,
        signal: current.signal,
      })
      if (request !== sequence || current.signal.aborted) return false
      if (
        !Array.isArray(result.items) ||
        !Number.isSafeInteger(result.total) ||
        result.total < result.items.length
      )
        throw new TypeError('invalid-table-result')
      items.value = [...result.items]
      total.value = result.total
      loaded.value = true
      return true
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

  /** 刷新当前或第一页；参数决定是否重置页码，返回加载结果。 / Reload, optionally reset to page one; return load result. */
  function reload(resetPage = false): Promise<boolean> {
    if (resetPage) page.value = 1
    return load()
  }
  /** 切换页码并加载；非法页码抛错，返回加载结果。 / Validate and load another page; invalid values throw. */
  function setPage(value: number): Promise<boolean> {
    validatePage(value)
    page.value = value
    return load()
  }
  /** 修改每页条数并回第一页；只接受1至100整数，返回加载结果。 / Set size from 1 to 100 and load page one. */
  function setPageSize(value: number): Promise<boolean> {
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
