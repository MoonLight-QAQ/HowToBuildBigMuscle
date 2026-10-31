import { getData } from '@/api/http'
import { mallCategoryListSchema } from '@/api/schemas'
import type { MallCategoryListData, RequestOptions } from '@/types/api'

/**
 * listMallCategories loads the mall-only category list from its read contract.
 * 中文：按只读契约获取商城类目，不读取或修改闲置类目。
 * @param options Cancellation and mock scenario / 取消与Mock场景。
 * @returns Validated mall categories / 已校验商城类目。
 * Performs one GET and throws normalized ApiError on failure / 执行一次GET，失败抛统一错误。
 */
export function listMallCategories(options?: RequestOptions): Promise<MallCategoryListData> {
  return getData('/api/admin/mall-categories', mallCategoryListSchema, options)
}
