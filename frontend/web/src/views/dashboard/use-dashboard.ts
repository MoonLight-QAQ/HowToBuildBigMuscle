import { computed, onScopeDispose, readonly, shallowRef } from 'vue'
import { dashboardApi, type Summary } from '@/api/dashboard'
import { ApiError } from '@/api/http'
import { CLIENT_ERROR_MESSAGES } from '@/constants/error-code'

/** 管理概览读取生命周期；输入可替换的只读服务，返回状态和刷新方法，不写业务数据。
 * / Manage summary reads with an optional read service; return state and reload without business writes.
 */
export function useDashboard(service: Pick<typeof dashboardApi, 'get'> = dashboardApi) {
  const summary = shallowRef<Summary | null>(null)
  const loading = shallowRef(false)
  const error = shallowRef('')
  let controller: AbortController | undefined
  let epoch = 0
  let disposed = false
  /** 读取当前工作量，清除旧快照并隔离过期响应；返回本次是否成功，失败使用安全文案。
   * / Read current workload, clear stale snapshots, and isolate late responses; return success with safe errors.
   */
  async function load(): Promise<boolean> {
    if (disposed) return false
    const current = ++epoch
    controller?.abort()
    const request = new AbortController()
    controller = request
    summary.value = null
    error.value = ''
    loading.value = true
    try {
      const result = await service.get(request.signal)
      if (disposed || current !== epoch) return false
      summary.value = result
      return true
    } catch (cause) {
      if (disposed || current !== epoch) return false
      error.value = cause instanceof ApiError ? cause.message : CLIENT_ERROR_MESSAGES.http
      return false
    } finally {
      if (!disposed && current === epoch) loading.value = false
    }
  }
  /** 取消当前读取并使全部迟到响应失效；无输入和返回，不触发服务器写入。
   * / Cancel reads and invalidate every late response; no inputs/result or server writes.
   */
  function dispose(): void {
    disposed = true
    epoch += 1
    controller?.abort()
    summary.value = null
    loading.value = false
    error.value = ''
  }
  /** 从已验证概览筛选线下城市；只产生展示投影，不补写城市或配送配置。
   * / Select local cities from validated data without creating cities or changing configuration.
   */
  function selectLocalCities() {
    return (
      summary.value?.cities.filter(
        /** 按服务端配送方式判断；返回是否为线下城市。 / Match the server fulfillment as local. */
        function isLocal(city) {
          return city.fulfillment === 'local'
        },
      ) ?? []
    )
  }
  /** 从已验证概览筛选快递城市；无额外请求或副作用。
   * / Select postal cities from validated data without extra requests or effects.
   */
  function selectPostCities() {
    return (
      summary.value?.cities.filter(
        /** 按服务端配送方式判断；返回是否为快递城市。 / Match the server fulfillment as post. */
        function isPost(city) {
          return city.fulfillment === 'post'
        },
      ) ?? []
    )
  }
  onScopeDispose(dispose)
  return {
    summary: readonly(summary),
    loading: readonly(loading),
    errorMessage: readonly(error),
    localCities: computed(selectLocalCities),
    postCities: computed(selectPostCities),
    load,
  }
}
