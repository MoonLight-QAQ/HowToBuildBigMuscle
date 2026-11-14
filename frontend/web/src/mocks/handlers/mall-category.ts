/**
 * 商城类目的模拟接口。用内存中的列表模拟数据库，实现契约 description 中写明的规则：
 * - GET /mall-categories：返回全部未删除的类目，按 sort 从小到大排序，sort 相同时按创建顺序。不分页。
 * - POST /mall-categories：校验请求体（名称为空或超长、sort 不是整数、出现未定义的字段时返回
 *   VALIDATION_FAILED）；中文名或英文名与已有类目重复时返回 NAME_DUPLICATED；新类目的 inUseCount 为 0。
 * - DELETE /mall-categories/:id：找不到返回 NOT_FOUND；inUseCount 大于 0 返回 CATEGORY_IN_USE。
 *   删除后从列表中移除，名称可以再次使用。
 *
 * 契约没有写明、这里自行假设的规则（与城市模块一致，后端实现时需要确认）：
 * - 名称去掉首尾空格后保存和比较；英文名比较时不区分大小写。
 * - 名称长度按字符计算（一个 emoji 算一个字符），与 JSON Schema 的 maxLength 一致。
 *
 * 模拟数据只在内存中，刷新页面后恢复为 src/mocks/data/mall-category.ts 的初始数据。
 */
import { delay } from 'msw'
import { http, HttpResponse, type HttpHandler } from 'msw/http'
import type { components } from '@/api/generated/admin'
import type { MallCategory, MallCategoryInput } from '@/api/mall-category'
import { ERROR_CODE } from '@/constants/error-code'
import { mallCategoryRecords } from '@/mocks/data/mall-category'

type ErrorResponse = components['schemas']['ErrorResponse']
type FieldError = components['schemas']['FieldError']

const baseURL = import.meta.env.VITE_API_BASE_URL

const NAME_ZH_MAX_LENGTH = 20
const NAME_EN_MAX_LENGTH = 40
const ALLOWED_FIELDS = ['nameZh', 'nameEn', 'sort']

/** 内存中的「数据库」。数组顺序就是创建顺序。 */
let categories: MallCategory[] = []
/** 已经发出的最大 ID。删除后列表变短，靠它避免删掉最后一个后再新增时 ID 重复。 */
let lastIssuedId = 0n

/** 恢复为初始数据。模块加载时执行一次；测试在每个用例前调用。 */
export function resetMallCategoryMock(): void {
  categories = mallCategoryRecords.map((category) => ({ ...category }))
  lastIssuedId = 0n
}
resetMallCategoryMock()

/**
 * 生成新的雪花 ID：现有最大 ID 与已经发出的最大 ID 中较大的一个加 1。
 * 用 BigInt 计算，不把 ID 转成 number。
 */
function nextId(): string {
  const max = categories.reduce((result, category) => {
    const id = BigInt(category.id)
    return id > result ? id : result
  }, 1854239876543209539n)
  lastIssuedId = (max > lastIssuedId ? max : lastIssuedId) + 1n
  return lastIssuedId.toString()
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
 * 校验新增的请求体。
 * 参数：请求体。返回：校验通过时为整理后的数据，否则为 details。
 */
function validateMallCategoryInput(
  body: unknown,
): { input: MallCategoryInput } | { details: FieldError[] } {
  if (!isRecord(body)) return { details: [{ field: 'body', message: '请求体必须是对象' }] }
  const details: FieldError[] = []
  for (const field of Object.keys(body)) {
    if (!ALLOWED_FIELDS.includes(field)) details.push({ field, message: '不是可用的字段' })
  }

  const nameZh = checkName(body, 'nameZh', NAME_ZH_MAX_LENGTH, details)
  const nameEn = checkName(body, 'nameEn', NAME_EN_MAX_LENGTH, details)

  // 契约 MallCategoryInput 中 sort 必填，只要求是整数，不限制下限。
  if (typeof body.sort !== 'number' || !Number.isSafeInteger(body.sort)) {
    details.push({ field: 'sort', message: '必须是整数' })
  }

  if (details.length > 0) return { details }
  return { input: { nameZh, nameEn, sort: body.sort as number } }
}

/**
 * 名称是否与已有类目重复。中文名完全相同，或英文名不区分大小写相同，都算重复。
 * 参数：去掉首尾空格后的名称。
 */
function isNameDuplicated(nameZh: string, nameEn: string): boolean {
  const lowerEn = nameEn.toLowerCase()
  return categories.some(
    (category) => category.nameZh === nameZh || category.nameEn.toLowerCase() === lowerEn,
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

export const mallCategoryHandlers: HttpHandler[] = [
  http.get(`${baseURL}/mall-categories`, async () => {
    await delay()
    // Array.prototype.sort 是稳定排序：sort 相同时保持创建顺序。
    const items = [...categories].sort((a, b) => a.sort - b.sort)
    return HttpResponse.json({ ok: true, data: { items } })
  }),

  http.post(`${baseURL}/mall-categories`, async ({ request }) => {
    await delay()
    const result = validateMallCategoryInput(await readJson(request))
    if ('details' in result) return fail(400, ERROR_CODE.VALIDATION_FAILED, result.details)
    const { input } = result
    if (isNameDuplicated(input.nameZh, input.nameEn)) return fail(409, ERROR_CODE.NAME_DUPLICATED)
    const category: MallCategory = { id: nextId(), ...input, inUseCount: 0 }
    categories.push(category)
    return HttpResponse.json({ ok: true, data: category })
  }),

  http.delete(`${baseURL}/mall-categories/:id`, async ({ params }) => {
    await delay()
    const index = categories.findIndex((category) => category.id === params.id)
    if (index === -1) return fail(404, ERROR_CODE.NOT_FOUND)
    if (categories[index]!.inUseCount > 0) return fail(409, ERROR_CODE.CATEGORY_IN_USE)
    categories.splice(index, 1)
    return HttpResponse.json({ ok: true, data: null })
  }),
]
