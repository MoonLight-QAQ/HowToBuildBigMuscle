/**
 * 商城类目列表页的状态：加载类目。
 *
 * 职责：
 * - 管理加载中、加载失败、空数据三种状态，以及「重试」。
 * - 新的请求开始时取消上一次未完成的请求，迟到的旧结果不会覆盖新结果。
 * - 列表顺序以服务器为准（契约 listMallCategories：按 sort 从小到大），前端不再排序。
 * - 错误提示经 model/error-message.ts 的 toErrorMessage 取 ApiError.message，这里不写死错误文案。
 *
 * 类目不分页，所以照着城市的 useCityList 写，没有使用 src/composables/useTable.ts。
 * 删除操作在 useMallCategoryDelete 中，新增在 useMallCategoryForm 中。
 */
import { computed, getCurrentScope, onScopeDispose, readonly, ref, shallowRef } from 'vue'
import { listMallCategories, type MallCategory } from '@/api/mall-category'
import { toErrorMessage } from '../model/error-message'

export function useMallCategoryList() {
  const categories = shallowRef<MallCategory[]>([])
  const loading = ref(false)
  /** 是否已经成功加载过。用来区分「还没加载」和「加载成功但没有数据」。 */
  const loaded = ref(false)
  const error = shallowRef<unknown>(null)

  /** 加载失败时显示的文案；没有错误时为 null。 */
  const errorMessage = computed(() => (error.value === null ? null : toErrorMessage(error.value)))
  /** 只有成功加载、且没有数据时才算空数据。加载失败不算空数据。 */
  const empty = computed(
    () => loaded.value && !loading.value && error.value === null && categories.value.length === 0,
  )

  let sequence = 0
  let controller: AbortController | undefined
  let disposed = false

  /**
   * 加载全部类目。失败时保留上次的数据，并设置 error。
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
      const result = await listMallCategories(current.signal)
      if (request !== sequence) return false
      categories.value = result.items
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
    categories: readonly(categories),
    loading: readonly(loading),
    loaded: readonly(loaded),
    error: readonly(error),
    errorMessage,
    empty,
    load,
  }
}
