import { onMounted, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { normalizeError } from '@/api/http'
import type { ApiError } from '@/api/http'
import type { MockScenario, RequestOptions } from '@/types/api'

export type ResourceStatus = 'loading' | 'success' | 'empty' | 'error'

/**
 * isEmptyResource identifies absent configuration or an empty typed list.
 * 中文：识别尚未配置的空值和空列表，不把数值零视为空数据。
 * @param value Parsed API data / 已校验的接口数据。
 * @returns Whether the resource has no records / 是否没有记录。
 */
export function isEmptyResource(value: unknown): boolean {
  if (value === null) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object' && value !== null && 'items' in value) {
    return Array.isArray(value.items) && value.items.length === 0
  }
  return false
}

/**
 * useResource owns loading and cancellation for a parsed read operation.
 * 中文：为已校验的读取操作管理加载、空态、错误及取消，过期响应不会覆盖最新结果。
 * @param loader Named data-layer reader / 数据层命名读取方法。
 * @param key Stable diagnostic module name / 稳定的模块名称。
 * @returns Reactive resource state and reload action / 响应式状态与重新加载方法。
 * Starts on mount and cancels on disposal; never clears local drafts / 挂载时读取，销毁时取消，不清空草稿。
 */
export function useResource<T>(loader: (options?: RequestOptions) => Promise<T>, key: string) {
  const data = shallowRef<T | null>(null)
  const error = shallowRef<ApiError | null>(null)
  const status = ref<ResourceStatus>('loading')
  const scenario = ref<MockScenario>('success')
  let requestId = 0
  let controller: AbortController | undefined
  let disposed = false

  /**
   * load fetches the latest selected scenario and replaces only current state.
   * 中文：读取当前场景，仅当前请求可更新状态，旧请求或组件销毁后返回的结果会忽略。
   * @returns Settled read lifecycle / 读取生命周期结束的Promise。
   * Cancels the previous request and normalizes failures / 取消上次请求并统一失败状态。
   */
  async function load(): Promise<void> {
    controller?.abort()
    controller = new AbortController()
    const activeId = ++requestId
    status.value = 'loading'
    error.value = null
    data.value = null
    try {
      const result = await loader({ signal: controller.signal, scenario: scenario.value })
      if (disposed || activeId !== requestId) return
      data.value = result
      status.value = isEmptyResource(result) ? 'empty' : 'success'
    } catch (failure) {
      if (disposed || activeId !== requestId) return
      const normalized = normalizeError(failure)
      if (normalized.code === 'CANCELLED') return
      error.value = normalized
      status.value = 'error'
    }
  }

  /**
   * dispose cancels in-flight work and prevents subsequent state updates.
   * 中文：停止在途请求并阻止后续异步结果回写。
   * @returns Nothing / 无返回值。
   */
  function dispose(): void {
    disposed = true
    requestId += 1
    controller?.abort()
  }

  watch(scenario, load)
  onMounted(load)
  onScopeDispose(dispose)
  return { data, status, error, scenario, load, resourceKey: key }
}
