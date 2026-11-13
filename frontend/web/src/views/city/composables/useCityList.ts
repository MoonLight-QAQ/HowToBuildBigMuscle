/**
 * 城市列表页的状态：加载城市、在列表中切换配送方式。
 *
 * 职责：
 * - 管理加载中、加载失败、空数据三种状态，以及「重试」。
 * - 新的请求开始时取消上一次未完成的请求，迟到的旧结果不会覆盖新结果。
 * - 切换配送方式：调用接口、提示结果、重新加载列表。请求体和提示文案由 model/city-form.ts 生成。
 * - 错误提示一律取 ApiError.message：http.ts 已按错误码从 src/constants/error-code.ts 取出文案，
 *   这里不写死任何错误文案。
 *
 * 城市不分页（见契约 listCities），所以这里没有使用 src/composables/useTable.ts。
 *
 * 其他模块照着写时要改的地方：
 * - 不分页的列表（如类目、时段）：照着这个文件写，把 listCities 换成本模块的接口函数。
 * - 分页列表（如订单、商品）：改用 src/composables/useTable.ts，不要照抄这里的加载逻辑。
 * - 列表中的写操作（如本文件的 toggleFulfillment）换成本模块的操作；
 *   请求体和提示文案放在 model 中，这里只负责调用和处理错误。
 */
import { computed, getCurrentScope, onScopeDispose, readonly, ref, shallowRef } from 'vue'
import { ElMessage } from 'element-plus'
import { listCities, updateCity, type City } from '@/api/city'
import { ApiError, isErrorCode } from '@/api/http'
import { CLIENT_ERROR_MESSAGES, ERROR_CODE } from '@/constants/error-code'
import { fulfillmentChangedMessage, toggleFulfillmentInput } from '../model/city-form'

/**
 * 取出可以直接提示给店员的错误文案。
 * ApiError 的 message 已由 http.ts 按错误码取自 src/constants/error-code.ts；其他错误用通用提示。
 * 参数：捕获到的错误。返回：中文文案。
 */
export function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : CLIENT_ERROR_MESSAGES.http
}

export function useCityList() {
  const cities = shallowRef<City[]>([])
  const loading = ref(false)
  /** 是否已经成功加载过。用来区分「还没加载」和「加载成功但没有数据」。 */
  const loaded = ref(false)
  const error = shallowRef<unknown>(null)
  /** 正在切换配送方式的城市 id，同一时间只允许切换一个。 */
  const togglingId = ref<string | null>(null)

  /** 加载失败时显示的文案；没有错误时为 null。 */
  const errorMessage = computed(() => (error.value === null ? null : toErrorMessage(error.value)))
  /** 只有成功加载、且没有数据时才算空数据。加载失败不算空数据。 */
  const empty = computed(
    () => loaded.value && !loading.value && error.value === null && cities.value.length === 0,
  )

  let sequence = 0
  let controller: AbortController | undefined
  let disposed = false

  /**
   * 加载全部城市。失败时保留上次的数据，并设置 error。
   * 返回：成功为 true；失败或被更新的请求取代时为 false。
   */
  async function load(): Promise<boolean> {
    if (disposed) return false
    controller?.abort()
    const current = new AbortController()
    controller = current
    const request = ++sequence
    loading.value = true
    error.value = null
    try {
      const result = await listCities(current.signal)
      if (request !== sequence) return false
      cities.value = result.items
      loaded.value = true
      return true
    } catch (cause) {
      if (request === sequence) error.value = cause
      return false
    } finally {
      if (request === sequence) {
        loading.value = false
        controller = undefined
      }
    }
  }

  /**
   * 切换一个城市的配送方式（线下 ↔ 快递）。确认由页面上的组件完成，这里直接提交。
   * 成功：提示切换结果，重新加载列表。失败：提示错误；城市已不存在时也重新加载列表。
   * 参数：列表中的城市。返回：是否成功。
   */
  async function toggleFulfillment(city: City): Promise<boolean> {
    if (togglingId.value !== null) return false
    togglingId.value = city.id
    try {
      const updated = await updateCity(city.id, toggleFulfillmentInput(city))
      ElMessage.success(fulfillmentChangedMessage(updated))
      await load()
      return true
    } catch (cause) {
      ElMessage.error(toErrorMessage(cause))
      if (isErrorCode(cause, ERROR_CODE.NOT_FOUND)) await load()
      return false
    } finally {
      togglingId.value = null
    }
  }

  /** 取消未完成的加载，之后不再加载。组件卸载时自动调用。 */
  function dispose(): void {
    disposed = true
    sequence += 1
    controller?.abort()
    controller = undefined
    loading.value = false
  }
  if (getCurrentScope()) onScopeDispose(dispose)

  return {
    cities: readonly(cities),
    loading: readonly(loading),
    loaded: readonly(loaded),
    error: readonly(error),
    errorMessage,
    empty,
    togglingId: readonly(togglingId),
    load,
    toggleFulfillment,
  }
}
