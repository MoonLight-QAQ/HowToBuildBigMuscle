/**
 * 商城类目模块的接口函数与类型。
 *
 * 作用：
 * - 导出本模块用到的契约类型别名。类型一律取自 src/api/generated/，不手写与契约重复的类型。
 * - 导出调用接口的函数。函数通过 src/api/http.ts 发请求，返回响应中的 data 部分；
 *   失败时由 http.ts 抛出带 code 的 ApiError，这里不捕获、不判断业务错误。
 * - 导出返回数据的解析函数 parseXxx：检查返回数据的结构是否符合契约，不符合时抛错
 *   （http.ts 会转为 protocol 错误）。解析函数只检查结构，不写业务判断。
 *
 * 商城类目只能新增和删除，不能修改（见契约 MallCategory），所以没有修改接口。
 */
import type { components, operations } from '@/api/generated/admin'
import { http } from '@/api/http'

export type MallCategory = components['schemas']['MallCategory']
export type MallCategoryInput = components['schemas']['MallCategoryInput']
/** 商城类目列表接口的 data 部分：{ items: MallCategory[] }。不分页，见契约 listMallCategories。 */
export type MallCategoryList = NonNullable<
  operations['listMallCategories']['responses'][200]['content']['application/json']['data']
>

/** 契约 Id 的格式：1～20 位数字的字符串。 */
const ID_PATTERN = /^[0-9]{1,20}$/

/** 判断是否为普通对象（不是 null，也不是数组）。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 解析一个商城类目。只保留契约中的字段。
 * 参数：接口返回的数据。返回：MallCategory。结构不符合契约时抛出 TypeError。
 */
export function parseMallCategory(value: unknown): MallCategory {
  if (!isRecord(value)) throw new TypeError('invalid-mall-category')
  const { id, nameZh, nameEn, sort, inUseCount } = value
  if (
    typeof id !== 'string' ||
    !ID_PATTERN.test(id) ||
    typeof nameZh !== 'string' ||
    typeof nameEn !== 'string' ||
    typeof sort !== 'number' ||
    !Number.isSafeInteger(sort) ||
    typeof inUseCount !== 'number' ||
    !Number.isSafeInteger(inUseCount) ||
    inUseCount < 0
  ) {
    throw new TypeError('invalid-mall-category')
  }
  return { id, nameZh, nameEn, sort, inUseCount }
}

/**
 * 解析商城类目列表。
 * 参数：接口返回的数据。返回：{ items }。结构不符合契约时抛出 TypeError。
 */
export function parseMallCategoryList(value: unknown): MallCategoryList {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new TypeError('invalid-mall-category-list')
  }
  return { items: value.items.map(parseMallCategory) }
}

/**
 * 解析没有数据的成功响应（契约 OkNoData）：data 必须是 null。
 * 参数：接口返回的数据。结构不符合契约时抛出 TypeError。
 */
function parseNoData(value: unknown): void {
  if (value !== null) throw new TypeError('invalid-no-data')
}

/**
 * 查询全部商城类目，按 sort 从小到大排序（排序由服务器完成）。
 * 参数：可选的取消信号。返回：{ items }。
 */
export function listMallCategories(signal?: AbortSignal): Promise<MallCategoryList> {
  return http.request('/mall-categories', { signal, parse: parseMallCategoryList })
}

/**
 * 新增商城类目。
 * 参数：新增请求体。返回：新建的类目（inUseCount 为 0）。
 * 可能的业务错误：VALIDATION_FAILED（带 details）、NAME_DUPLICATED。
 */
export function createMallCategory(input: MallCategoryInput): Promise<MallCategory> {
  return http.request('/mall-categories', {
    method: 'POST',
    data: input,
    parse: parseMallCategory,
  })
}

/**
 * 删除商城类目（服务器软删除）。
 * 参数：类目 id。成功时没有返回数据。
 * 可能的业务错误：NOT_FOUND、CATEGORY_IN_USE（服务器删除时重新统计，不以前端看到的 inUseCount 为准）。
 */
export function deleteMallCategory(id: string): Promise<void> {
  return http.request(`/mall-categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    parse: parseNoData,
  })
}
