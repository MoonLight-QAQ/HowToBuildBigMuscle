/**
 * 城市模块的接口函数与类型。
 *
 * 作用：
 * - 导出本模块用到的契约类型别名。类型一律取自 src/api/generated/，不手写与契约重复的类型。
 * - 导出调用接口的函数。函数通过 src/api/http.ts 发请求，返回响应中的 data 部分；
 *   失败时由 http.ts 抛出带 code 的 ApiError，这里不捕获、不判断业务错误。
 * - 导出返回数据的解析函数 parseXxx。http.request 要求每个请求都传入 parse：
 *   生成的文件只有类型，没有运行时校验，所以由这里检查返回数据的结构是否符合契约，
 *   不符合时抛错（http.ts 会转为 protocol 错误）。解析函数只检查结构，不写业务判断。
 *
 * 其他模块照着写时要改的地方：
 * - 类型别名：换成本模块的 schema。列表的 data 类型从 operations['listXxx'] 中取。
 * - 枚举的取值表（如下方 STATE_VALUES）：用 Record<枚举类型, true> 声明，契约增加取值时类型检查会提示补上。
 * - parseXxx：按本模块 schema 的 required 字段逐个检查，只保留契约中的字段。
 * - 接口函数：路径和方法与契约一致；路径中的 id 用 encodeURIComponent 处理。
 *   分页列表的函数要接收 page、pageSize，并返回 { items, total }，见 src/composables/useTable.ts。
 */
import type { components, operations } from '@/api/generated/admin'
import { http } from '@/api/http'

export type City = components['schemas']['City']
export type CityCreateInput = components['schemas']['CityCreateInput']
export type CityUpdateInput = components['schemas']['CityUpdateInput']
export type AustralianState = components['schemas']['AustralianState']
export type Fulfillment = components['schemas']['Fulfillment']
/** 城市列表接口的 data 部分：{ items: City[] }。城市不分页，见契约 listCities。 */
export type CityList = NonNullable<
  operations['listCities']['responses'][200]['content']['application/json']['data']
>

/** 州的全部取值，用于解析时检查。 */
const STATE_VALUES: Readonly<Record<AustralianState, true>> = {
  NSW: true,
  VIC: true,
  QLD: true,
  WA: true,
  SA: true,
  TAS: true,
  ACT: true,
  NT: true,
}

/** 配送方式的全部取值，用于解析时检查。 */
const FULFILLMENT_VALUES: Readonly<Record<Fulfillment, true>> = { local: true, post: true }

/** 契约 Id 的格式：1～20 位数字的字符串。 */
const ID_PATTERN = /^[0-9]{1,20}$/

/** 判断是否为普通对象（不是 null，也不是数组）。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 解析一个城市。只保留契约中的字段。
 * 参数：接口返回的数据。返回：City。结构不符合契约时抛出 TypeError。
 */
export function parseCity(value: unknown): City {
  if (!isRecord(value)) throw new TypeError('invalid-city')
  const { id, nameZh, nameEn, fulfillment, state, timezone, sort } = value
  if (
    typeof id !== 'string' ||
    !ID_PATTERN.test(id) ||
    typeof nameZh !== 'string' ||
    typeof nameEn !== 'string' ||
    typeof fulfillment !== 'string' ||
    !Object.hasOwn(FULFILLMENT_VALUES, fulfillment) ||
    typeof state !== 'string' ||
    !Object.hasOwn(STATE_VALUES, state) ||
    typeof timezone !== 'string' ||
    typeof sort !== 'number' ||
    !Number.isSafeInteger(sort)
  ) {
    throw new TypeError('invalid-city')
  }
  return {
    id,
    nameZh,
    nameEn,
    fulfillment: fulfillment as Fulfillment,
    state: state as AustralianState,
    timezone,
    sort,
  }
}

/**
 * 解析城市列表。
 * 参数：接口返回的数据。返回：{ items }。结构不符合契约时抛出 TypeError。
 */
export function parseCityList(value: unknown): CityList {
  if (!isRecord(value) || !Array.isArray(value.items)) throw new TypeError('invalid-city-list')
  return { items: value.items.map(parseCity) }
}

/**
 * 查询全部城市，按 sort 从小到大排序（排序由服务器完成）。
 * 参数：可选的取消信号。返回：{ items }。
 */
export function listCities(signal?: AbortSignal): Promise<CityList> {
  return http.request('/cities', { signal, parse: parseCityList })
}

/**
 * 新增城市。
 * 参数：新增请求体。返回：新建的城市。
 * 可能的业务错误：VALIDATION_FAILED（带 details）、NAME_DUPLICATED。
 */
export function createCity(input: CityCreateInput): Promise<City> {
  return http.request('/cities', { method: 'POST', data: input, parse: parseCity })
}

/**
 * 修改城市。请求体不包含 state。
 * 参数：城市 id、修改请求体。返回：修改后的城市。
 * 可能的业务错误：VALIDATION_FAILED（带 details）、NOT_FOUND、NAME_DUPLICATED。
 */
export function updateCity(id: string, input: CityUpdateInput): Promise<City> {
  return http.request(`/cities/${encodeURIComponent(id)}`, {
    method: 'PUT',
    data: input,
    parse: parseCity,
  })
}
