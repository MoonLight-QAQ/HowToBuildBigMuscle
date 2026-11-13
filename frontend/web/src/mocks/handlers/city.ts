/**
 * 城市的模拟接口。用内存中的列表模拟数据库，实现契约 description 中写明的规则：
 * - GET /cities：返回全部城市，按 sort 从小到大排序，sort 相同时按创建顺序。不分页。
 * - POST /cities：校验请求体；fulfillment 不传时默认为 post；中英文名与已有城市重复时返回 NAME_DUPLICATED。
 * - PUT /cities/:id：找不到返回 NOT_FOUND；请求体出现 state 等未定义的字段时返回 VALIDATION_FAILED；
 *   名称与其他城市重复（不和自己比较）时返回 NAME_DUPLICATED。
 *
 * 契约没有写明、这里自行假设的规则（后端实现时需要确认）：
 * - 名称去掉首尾空格后保存和比较；英文名比较时不区分大小写。
 * - 名称长度按字符计算（一个 emoji 算一个字符），与 JSON Schema 的 maxLength 一致。
 *
 * 模拟数据只在内存中，刷新页面后恢复为 src/mocks/data/city.ts 的初始数据。
 *
 * 其他模块照着写时要改的地方：
 * - 路径、请求体校验（validateXxxInput）和业务规则换成本模块的。
 * - 每个写操作至少模拟一个失败场景，错误码和 HTTP 状态与契约一致，文案取自 ERROR_CODE。
 * - 在 src/mocks/handlers/index.ts 中注册，放在兜底 handler 之前。
 * - 导出 resetXxxMock()，供测试在每个用例之前恢复初始数据。
 */
import { delay } from 'msw'
import { http, HttpResponse, type HttpHandler } from 'msw/http'
import type { components } from '@/api/generated/admin'
import type {
  AustralianState,
  City,
  CityCreateInput,
  CityUpdateInput,
  Fulfillment,
} from '@/api/city'
import { ERROR_CODE } from '@/constants/error-code'
import { cityRecords } from '@/mocks/data/city'

type ErrorResponse = components['schemas']['ErrorResponse']
type FieldError = components['schemas']['FieldError']

const baseURL = import.meta.env.VITE_API_BASE_URL

const STATES: readonly AustralianState[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']
const FULFILLMENTS: readonly Fulfillment[] = ['local', 'post']
const NAME_ZH_MAX_LENGTH = 20
const NAME_EN_MAX_LENGTH = 40

/** 内存中的「数据库」。数组顺序就是创建顺序。 */
let cities: City[] = []

/** 恢复为初始数据。模块加载时执行一次；测试在每个用例前调用。 */
export function resetCityMock(): void {
  cities = cityRecords.map((city) => ({ ...city }))
}
resetCityMock()

/** 生成新的雪花 ID：现有最大 ID 加 1。用 BigInt 计算，不把 ID 转成 number。 */
function nextId(): string {
  const max = cities.reduce((result, city) => {
    const id = BigInt(city.id)
    return id > result ? id : result
  }, 1854239876543209472n)
  return (max + 1n).toString()
}

/** 返回失败响应。 */
function fail(
  status: number,
  definition: { code: ErrorResponse['code']; message: string },
  details?: FieldError[],
) {
  const body: ErrorResponse = { ok: false, code: definition.code, message: definition.message }
  if (details) body.details = details
  return HttpResponse.json(body, { status })
}

/** 判断是否为普通对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 判断是否为有效的 IANA 时区名：浏览器和 Node.js 不认识的时区会抛出 RangeError。 */
function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-AU', { timeZone: value })
    return true
  } catch {
    return false
  }
}

/** 检查名称，有错误时加入 details。返回去掉首尾空格后的名称。 */
function checkName(
  body: Record<string, unknown>,
  field: 'nameZh' | 'nameEn',
  maxLength: number,
  details: FieldError[],
): string {
  const value = body[field]
  const text = typeof value === 'string' ? value.trim() : ''
  if (text === '') details.push({ field, message: '不能为空' })
  else if ([...text].length > maxLength)
    details.push({ field, message: `不能超过 ${maxLength} 个字符` })
  return text
}

/**
 * 校验新增或修改的请求体。
 * 参数：请求体、模式（create 时允许并要求 state；update 时 state 属于未定义的字段）。
 * 返回：校验通过时为整理后的数据，否则为 details。
 */
function validateCityInput(
  body: unknown,
  mode: 'create',
): { input: Required<CityCreateInput> } | { details: FieldError[] }
function validateCityInput(
  body: unknown,
  mode: 'update',
): { input: CityUpdateInput } | { details: FieldError[] }
function validateCityInput(
  body: unknown,
  mode: 'create' | 'update',
): { input: CityCreateInput | CityUpdateInput } | { details: FieldError[] } {
  if (!isRecord(body)) return { details: [{ field: 'body', message: '请求体必须是对象' }] }
  const details: FieldError[] = []
  const allowed =
    mode === 'create'
      ? ['nameZh', 'nameEn', 'fulfillment', 'state', 'timezone', 'sort']
      : ['nameZh', 'nameEn', 'fulfillment', 'timezone', 'sort']
  for (const field of Object.keys(body)) {
    if (!allowed.includes(field)) details.push({ field, message: '不是可用的字段' })
  }

  const nameZh = checkName(body, 'nameZh', NAME_ZH_MAX_LENGTH, details)
  const nameEn = checkName(body, 'nameEn', NAME_EN_MAX_LENGTH, details)

  // 新增时 fulfillment 可以不传，默认为 post；修改时必填。
  let fulfillment = body.fulfillment
  if (mode === 'create' && fulfillment === undefined) fulfillment = 'post'
  if (!FULFILLMENTS.includes(fulfillment as Fulfillment)) {
    details.push({ field: 'fulfillment', message: '必须是 local 或 post' })
  }

  if (mode === 'create' && !STATES.includes(body.state as AustralianState)) {
    details.push({ field: 'state', message: '必须是有效的州' })
  }

  const timezone = typeof body.timezone === 'string' ? body.timezone.trim() : ''
  if (timezone === '' || !isValidTimezone(timezone)) {
    details.push({ field: 'timezone', message: '必须是有效的 IANA 时区名' })
  }

  if (typeof body.sort !== 'number' || !Number.isSafeInteger(body.sort)) {
    details.push({ field: 'sort', message: '必须是整数' })
  }

  if (details.length > 0) return { details }
  const input: CityUpdateInput = {
    nameZh,
    nameEn,
    fulfillment: fulfillment as Fulfillment,
    timezone,
    sort: body.sort as number,
  }
  return mode === 'create'
    ? { input: { ...input, state: body.state as AustralianState } }
    : { input }
}

/**
 * 名称是否与其他城市重复。中文名完全相同，或英文名不区分大小写相同，都算重复。
 * 参数：名称、要排除的城市 id（修改时排除自己）。
 */
function isNameDuplicated(nameZh: string, nameEn: string, excludeId?: string): boolean {
  const lowerEn = nameEn.toLowerCase()
  return cities.some(
    (city) =>
      city.id !== excludeId && (city.nameZh === nameZh || city.nameEn.toLowerCase() === lowerEn),
  )
}

/** 读取 JSON 请求体，不是合法 JSON 时返回 undefined（之后按校验失败处理）。 */
async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

export const cityHandlers: HttpHandler[] = [
  http.get(`${baseURL}/cities`, async () => {
    await delay()
    // Array.prototype.sort 是稳定排序：sort 相同时保持创建顺序。
    const items = [...cities].sort((a, b) => a.sort - b.sort)
    return HttpResponse.json({ ok: true, data: { items } })
  }),

  http.post(`${baseURL}/cities`, async ({ request }) => {
    await delay()
    const result = validateCityInput(await readJson(request), 'create')
    if ('details' in result) return fail(400, ERROR_CODE.VALIDATION_FAILED, result.details)
    const { input } = result
    if (isNameDuplicated(input.nameZh, input.nameEn)) return fail(409, ERROR_CODE.NAME_DUPLICATED)
    const city: City = { id: nextId(), ...input }
    cities.push(city)
    return HttpResponse.json({ ok: true, data: city })
  }),

  http.put(`${baseURL}/cities/:id`, async ({ request, params }) => {
    await delay()
    const index = cities.findIndex((city) => city.id === params.id)
    if (index === -1) return fail(404, ERROR_CODE.NOT_FOUND)
    const result = validateCityInput(await readJson(request), 'update')
    if ('details' in result) return fail(400, ERROR_CODE.VALIDATION_FAILED, result.details)
    const { input } = result
    const current = cities[index]!
    if (isNameDuplicated(input.nameZh, input.nameEn, current.id)) {
      return fail(409, ERROR_CODE.NAME_DUPLICATED)
    }
    // state 和 id 沿用原值：州创建后不能修改。
    const updated: City = { ...current, ...input }
    cities[index] = updated
    return HttpResponse.json({ ok: true, data: updated })
  }),
]
