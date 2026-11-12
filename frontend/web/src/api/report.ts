import type { components, operations } from '@/api/generated/admin'
import { ApiError, http } from './http'
import { ERROR_CODE } from '@/constants/error-code'
import { formatDateTime } from '@/utils/date'

export type Report = components['schemas']['Report']
export type ReportPage = components['schemas']['ReportPage']
export type ReportStatus = components['schemas']['ReportStatus']
export type ReportReason = components['schemas']['ReportReason']
export type ReportListingStatus = components['schemas']['ReportListingStatus']
export type IgnoreReportInput = components['schemas']['IgnoreReportInput']
export type TakeDownReportInput = components['schemas']['TakeDownReportInput']
export type ListReportsQuery = NonNullable<operations['listReports']['parameters']['query']>

type Parser<T> = (value: unknown) => T
type Fields<T> = { [Key in keyof T]-?: Parser<T[Key]> }

/** 拒绝非法举报数据，不回显原响应；无输入或副作用。 / Reject invalid report data without echoing a response or causing effects. */
function invalid(): never {
  throw new TypeError('invalid-report-data')
}

/** 按声明字段校验并复制对象，exact控制额外字段；非法值抛错，无副作用。 / Validate and copy declared fields, optionally rejecting extras; invalid data throws without effects. */
function fields<T>(value: unknown, parsers: Fields<T>, exact = true): T {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid()
  const record = value as Record<string, unknown>
  if (exact && Object.keys(record).some(unexpected)) invalid()
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(parsers) as Array<keyof T & string>) {
    if (!Object.hasOwn(record, key)) invalid()
    result[key] = parsers[key](record[key])
  }
  return result as T
  /** 判断字段是否未声明，返回布尔值，无副作用。 / Test whether a field is undeclared without effects. */
  function unexpected(key: string): boolean {
    return !Object.hasOwn(parsers, key)
  }
}

/** 创建Unicode长度文本校验器，保留原文；非法值抛错，无副作用。 / Create a Unicode-length text parser preserving input; invalid data throws without effects. */
function text(max = Infinity, min = 0): Parser<string> {
  /** 校验字符串类型和码点数，返回原文或抛错。 / Return validated text or throw for invalid type or code-point length. */
  function parseText(value: unknown): string {
    if (typeof value !== 'string' || [...value].length > max || [...value].length < min) invalid()
    return value
  }
  return parseText
}

/** 解析字符串ID，保留大整数和前导零；非法值抛错，无副作用。 / Parse string IDs preserving large values and leading zeros; invalid data throws without effects. */
function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9]{1,20}$/.test(value)) invalid()
  return value
}
/** 解析非负安全整数版本或计数，非法值抛错，无副作用。 / Parse nonnegative safe integer versions or counts, throwing without effects. */
function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalid()
  return value
}
/** 解析正安全整数页码或尺寸，非法值抛错，无副作用。 / Parse positive safe integer pages or dimensions, throwing without effects. */
function positive(value: unknown): number {
  const result = integer(value)
  if (result < 1) invalid()
  return result
}
/** 解析1至100的每页数量，非法值抛错，无副作用。 / Parse page sizes from 1 to 100, throwing without effects. */
function pageSize(value: unknown): number {
  const result = positive(value)
  if (result > 100) invalid()
  return result
}
/** 创建精确枚举校验器，未知值抛错，无副作用。 / Create a strict enum parser, throwing on unknown values without effects. */
function enumeration<T extends string>(values: readonly T[]): Parser<T> {
  /** 返回允许值，拒绝其他类型和未知值。 / Return an allowed value and reject other types or values. */
  function parseEnum(value: unknown): T {
    if (typeof value !== 'string' || !values.includes(value as T)) invalid()
    return value as T
  }
  return parseEnum
}
/** 允许显式null但不允许字段缺失，非法值抛错，无副作用。 / Allow explicit null while rejecting missing fields, throwing without effects. */
function nullable<T>(parse: Parser<T>): Parser<T | null> {
  /** 保留null或校验非空值，无副作用。 / Preserve null or validate the value without effects. */
  function parseNullable(value: unknown): T | null {
    return value === null ? null : parse(value)
  }
  return parseNullable
}
/** 创建逐项校验的数组副本，非法值抛错，无副作用。 / Create validated array copies, throwing without effects. */
function array<T>(parse: Parser<T>): Parser<T[]> {
  /** 返回解析后的数组，不修改原数据。 / Return a parsed array without modifying its source. */
  function parseArray(value: unknown): T[] {
    if (!Array.isArray(value)) invalid()
    return value.map(parse)
  }
  return parseArray
}
/** 校验真实UTC时间，返回原Z结尾文本；非法值抛错，无副作用。 / Validate a real UTC instant and retain its Z text, throwing without effects. */
function instant(value: unknown): string {
  const result = text()(value)
  formatDateTime(result, 'UTC')
  return result
}
/** 解析严格布尔值，不作类型转换，失败抛错，无副作用。 / Parse a strict boolean without coercion, throwing without effects. */
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') invalid()
  return value
}
/** 校验绝对URI，返回原地址；不拼接或请求图片。 / Validate an absolute URI and retain it without building or requesting images. */
function uri(value: unknown): string {
  const result = text()(value)
  try {
    new URL(result)
  } catch {
    invalid()
  }
  return result
}

const status = enumeration<ReportStatus>(['open', 'ignored', 'handled'])
const listingStatus = enumeration<ReportListingStatus>([
  'on_sale',
  'sold',
  'self_removed',
  'admin_removed',
])
const reason = enumeration<ReportReason>(['fake_info', 'harassment', 'prohibited', 'other'])

/** 读取公共图片字段并丢弃未约定扩展，非法值抛错，无外部请求。 / Read declared shared image fields, discarding extensions and throwing without requests. */
function image(value: unknown): components['schemas']['Image'] {
  return fields(
    value,
    { key: text(Infinity, 1), url: uri, width: positive, height: positive },
    false,
  )
}
/** 只输出公共用户ID和昵称，不向页面传播扩展联系方式。 / Return only public user ID and nickname without propagating extended contact details. */
function user(value: unknown): components['schemas']['UserBrief'] {
  return fields(value, { id, nickname: text() }, false)
}
/** 解析举报专用帖子投影，拒绝额外字段；无已浏览或其他写入。 / Parse the exact report listing projection without marking it seen or writing data. */
function listing(value: unknown): components['schemas']['ReportListingBrief'] {
  return fields(value, {
    id,
    title: text(40),
    status: listingStatus,
    cover: image,
    removeReason: nullable(text(200)),
  })
}
/** 已删除评论必须为空正文；拒绝泄漏，返回独立摘要，无副作用。 / Require empty text for deleted comments, rejecting disclosure and returning a copied brief. */
function comment(value: unknown): components['schemas']['ReportCommentBrief'] {
  const result = fields(value, { id, content: text(200), deleted: boolean })
  if (result.deleted && result.content !== '') invalid()
  return result
}
/** 校验并复制举报；历史处理人和时间分别允许null，不伪造关联条件。 / Validate and copy a report, preserving independently nullable historical audit fields. */
export function parseReport(value: unknown): Report {
  return fields(value, {
    id,
    listing,
    comment: nullable(comment),
    reason,
    extra: nullable(text(200)),
    reporter: user,
    status,
    handledBy: nullable(text(60)),
    handledAt: nullable(instant),
    createdAt: instant,
    version: integer,
  })
}
/** 解析举报分页并只输出声明字段；允许公共分页扩展，无副作用。 / Parse a report page and return declared fields, allowing shared metadata extensions without effects. */
export function parseReportPage(value: unknown): ReportPage {
  return fields(
    value,
    { items: array(parseReport), total: integer, page: positive, pageSize },
    false,
  )
}
/** 校验可选查询，未选状态不发送status；非法值抛错，无副作用。 / Validate optional query filters, omitting absent status and throwing without effects. */
function query(value: unknown): ListReportsQuery {
  if (value === undefined) return {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid()
  const record = value as Record<string, unknown>
  for (const key of Object.keys(record))
    if (!['page', 'pageSize', 'status'].includes(key)) invalid()
  const result: ListReportsQuery = {}
  if (record.page !== undefined) result.page = positive(record.page)
  if (record.pageSize !== undefined) result.pageSize = pageSize(record.pageSize)
  if (record.status !== undefined) result.status = status(record.status)
  return result
}
/** 校验忽略请求的已读版本和旧状态，拒绝伪造操作者等字段。 / Validate ignore input with the read version and old state, rejecting actor overrides or extras. */
function ignoreInput(value: unknown): IgnoreReportInput {
  return fields(value, { version: integer, expectedStatus: enumeration(['open'] as const) })
}
/** 校验下架的互斥分支；在售需非空白原因，非在售禁止新原因。 / Validate exclusive takedown branches, requiring a nonblank on-sale reason and no new off-sale reason. */
function takedownInput(value: unknown): TakeDownReportInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid()
  const record = value as Record<string, unknown>
  if (record.expectedListingStatus === 'on_sale') {
    const result = fields(value, {
      version: integer,
      expectedStatus: enumeration(['open'] as const),
      expectedListingStatus: enumeration(['on_sale'] as const),
      reason: text(200, 1),
    })
    if (!/\S/.test(result.reason)) invalid()
    return result
  }
  return fields(value, {
    version: integer,
    expectedStatus: enumeration(['open'] as const),
    expectedListingStatus: enumeration(['sold', 'self_removed', 'admin_removed'] as const),
  })
}
/** 请求前将非法输入转为安全参数错误，不发网或回显输入。 / Convert invalid inputs to a safe validation error before dispatch without echoing input. */
function input<T>(parse: Parser<T>, value: unknown): T {
  try {
    return parse(value)
  } catch {
    throw new ApiError('business', 400, ERROR_CODE.VALIDATION_FAILED.code)
  }
}
/** 按请求上下文检查身份及即时写后状态，不收紧一般历史读取。 / Check response identity and immediate write outcomes without narrowing historical reads. */
function matching(
  reportId: string,
  action?: 'ignored' | 'handled',
  body?: IgnoreReportInput | TakeDownReportInput,
): Parser<Report> {
  /** 返回匹配的完整投影，写后版本／审计／帖子分支不符时抛错。 / Return the matching projection or throw on invalid write version, audit or listing branch. */
  function parseMatching(value: unknown): Report {
    const result = parseReport(value)
    if (result.id !== reportId) invalid()
    if (action && body) {
      if (
        result.status !== action ||
        BigInt(result.version) !== BigInt(body.version) + 1n ||
        result.handledBy === null ||
        result.handledAt === null
      )
        invalid()
      if ('expectedListingStatus' in body) {
        const expected =
          body.expectedListingStatus === 'on_sale' ? 'admin_removed' : body.expectedListingStatus
        if (result.listing.status !== expected) invalid()
        if (body.expectedListingStatus === 'on_sale' && result.listing.removeReason !== body.reason)
          invalid()
      }
    }
    return result
  }
  return parseMatching
}

export const reportApi = {
  /** 读取分页举报，支持取消，返回已校验投影或ApiError，不写入。 / Read validated paginated reports with cancellation, returning data or ApiError without writes. */
  async list(filters?: ListReportsQuery, signal?: AbortSignal): Promise<ReportPage> {
    return http.request('/reports', {
      params: input(query, filters),
      signal,
      parse: parseReportPage,
    })
  },
  /** 按字符串ID读取举报，不改变帖子已浏览标记；支持取消。 / Read a report by string ID with cancellation, without changing listing seen state. */
  async get(reportId: string, signal?: AbortSignal): Promise<Report> {
    const validId = input(id, reportId)
    return http.request(`/reports/${validId}`, { signal, parse: matching(validId) })
  },
  /** 提交已读版本忽略待处理举报；支持取消，不自动重试或修改帖子。 / Ignore an open report using its read version; cancellable, without retries or listing edits. */
  async ignore(reportId: string, body: IgnoreReportInput, signal?: AbortSignal): Promise<Report> {
    const validId = input(id, reportId),
      data = input(ignoreInput, body)
    return http.request(`/reports/${validId}/ignore`, {
      method: 'POST',
      data,
      signal,
      parse: matching(validId, 'ignored', data),
    })
  },
  /** 提交已读举报版本及帖子旧状态下架或仅关闭；支持取消，不自动重试。 / Takedown or close using read report version and listing state, with cancellation and no automatic retries. */
  async takedown(
    reportId: string,
    body: TakeDownReportInput,
    signal?: AbortSignal,
  ): Promise<Report> {
    const validId = input(id, reportId),
      data = input(takedownInput, body)
    return http.request(`/reports/${validId}/takedown`, {
      method: 'POST',
      data,
      signal,
      parse: matching(validId, 'handled', data),
    })
  },
}
