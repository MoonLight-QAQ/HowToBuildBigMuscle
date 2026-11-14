/**
 * 删除商城类目的状态：正在删除的类目、提交删除和结果处理。
 *
 * 职责：
 * - 删除前的二次确认由表格组件完成（ElPopconfirm，文案见 model 的 deleteConfirmMessage），这里直接提交。
 * - 同一时间只删除一个类目：deletingId 不为 null 时，再次删除直接返回 false。
 * - 成功：提示「已删除」，通知页面重新加载列表。
 * - 失败：提示文案由 model 的 deleteErrorMessage 决定；
 *   CATEGORY_IN_USE、NOT_FOUND 说明页面数据已过时，还要重新加载列表（shouldReloadAfterDeleteError）。
 *   其他错误（网络、服务器错误等）只提示，不重新加载。
 */
import { readonly, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { deleteMallCategory, type MallCategory } from '@/api/mall-category'
import { deleteErrorMessage, shouldReloadAfterDeleteError } from '../model/mall-category-form'

export interface UseMallCategoryDeleteOptions {
  /** 删除成功，或发现列表已过时（CATEGORY_IN_USE、NOT_FOUND）时调用，页面在这里重新加载列表。 */
  onChanged: () => unknown
}

export function useMallCategoryDelete(options: UseMallCategoryDeleteOptions) {
  /** 正在删除的类目 id；没有删除时为 null。 */
  const deletingId = ref<string | null>(null)

  /**
   * 删除一个类目。调用前组件应已完成二次确认。
   * 参数：列表中的类目。返回：是否删除成功。
   */
  async function remove(category: Pick<MallCategory, 'id'>): Promise<boolean> {
    if (deletingId.value !== null) return false
    deletingId.value = category.id
    try {
      await deleteMallCategory(category.id)
      ElMessage.success('已删除')
      await options.onChanged()
      return true
    } catch (cause) {
      ElMessage.error(deleteErrorMessage(cause))
      if (shouldReloadAfterDeleteError(cause)) await options.onChanged()
      return false
    } finally {
      deletingId.value = null
    }
  }

  return { deletingId: readonly(deletingId), remove }
}
