import type { components, operations } from '@/api/generated/admin'
import { ApiError, http } from '@/api/http'
import { ERROR_CODE } from '@/constants/error-code'
import { formatDateTime } from '@/utils/date'

export type Refund = components['schemas']['Refund']
export type RefundPage = components['schemas']['RefundPage']
export type RefundStatus = components['schemas']['RefundStatus']
export type ProviderRefundStatus = components['schemas']['ProviderRefundStatus']
export type RefundReason = components['schemas']['RefundReason']
export type ListRefundsQuery = NonNullable<operations['listRefunds']['parameters']['query']>
export type ReviewRefundInput = components['schemas']['ReviewRefundInput']

type Parser<T> = (value: unknown) => T
type Fields<T> = { [Key in keyof T]-?: Parser<T[Key]> }

/** 中文：拒绝未知非法数据，抛不含原始响应的错误，无参数或副作用。 English: Throws a parsing error without raw response data; no input or effects. */
function invalidData(): never {
  throw new TypeError('invalid-refund-data')
}

/** 中文：按字段白名单复制未知对象，默认拒绝额外字段；失败抛错，无副作用。 English: Copies an unknown object through field parsers, rejecting extras by default; failures throw, no effects. */
function parseFields<T>(value: unknown, fields: Fields<T>, exact = true): T {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalidData()
  const record = value as Record<string, unknown>
  if (exact && Object.keys(record).some(isUnexpectedField)) invalidData()
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(fields) as Array<keyof T & string>) {
    if (!Object.hasOwn(record, key)) invalidData()
    result[key] = fields[key](record[key])
  }
  return result as T

  /** 中文：检查一个字段名是否未声明，返回布尔值，无副作用。 English: Reports whether one field name is undeclared; no effects. */
  function isUnexpectedField(key: string): boolean {
    return !Object.hasOwn(fields, key)
  }
}

/** 中文：创建按 Unicode 字符数限制的文本解析器，失败抛错，无副作用。 English: Creates a Unicode-length string parser; invalid values throw, no effects. */
function text(max = Infinity): Parser<string> {
  /** 中文：校验未知文本并保留原文，类型或长度非法时抛错，无副作用。 English: Preserves unknown text after type/length validation, otherwise throws; no effects. */
  function parseText(value: unknown): string {
    if (typeof value !== 'string' || [...value].length > max) invalidData()
    return value
  }
  return parseText
}

/** 中文：解析字符串 ID 并保留大数和前导零，非法值抛错，无副作用。 English: Parses a string ID preserving large values and zeroes; invalid input throws, no effects. */
function parseId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9]{1,20}$/.test(value)) invalidData()
  return value
}

/** 中文：解析非负安全整数分或版本，非法值抛错，无副作用。 English: Parses nonnegative safe integer cents or versions; invalid input throws, no effects. */
function parseInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalidData()
  return value
}

/** 中文：解析购买件数或页码的正安全整数，非法值抛错，无副作用。 English: Parses positive safe integer quantities or pages; invalid input throws, no effects. */
function parsePositive(value: unknown): number {
  const result = parseInteger(value)
  if (result < 1) invalidData()
  return result
}

/** 中文：解析每页 1–100 条限制，非法值抛错，无副作用。 English: Parses page sizes from 1 to 100; invalid input throws, no effects. */
function parsePageSize(value: unknown): number {
  const result = parsePositive(value)
  if (result > 100) invalidData()
  return result
}

/** 中文：创建契约枚举解析器，未知值抛错，无副作用。 English: Creates a contract enum parser; unknown values throw, no effects. */
function enumeration<T extends string>(values: readonly T[]): Parser<T> {
  /** 中文：返回允许的枚举值，非法类型或值抛错，无副作用。 English: Returns an allowed enum value or throws on invalid input, without effects. */
  function parseEnum(value: unknown): T {
    if (typeof value !== 'string' || !values.includes(value as T)) invalidData()
    return value as T
  }
  return parseEnum
}

/** 中文：允许解析器接收显式 null，字段缺失仍报错，无副作用。 English: Allows explicit null while missing fields still fail, without effects. */
function nullable<T>(parse: Parser<T>): Parser<T | null> {
  /** 中文：保留 null，否则按原解析器解析，失败抛错，无副作用。 English: Preserves null or delegates to the parser; failures throw, no effects. */
  function parseNullable(value: unknown): T | null {
    return value === null ? null : parse(value)
  }
  return parseNullable
}

/** 中文：创建逐项校验的数组副本解析器，非法值抛错，无副作用。 English: Creates a parser copying and validating array items; invalid input throws, no effects. */
function array<T>(parse: Parser<T>): Parser<T[]> {
  /** 中文：校验未知数组并返回已解析副本，失败抛错，无副作用。 English: Returns a parsed copy of an unknown array or throws, without effects. */
  function parseArray(value: unknown): T[] {
    if (!Array.isArray(value)) invalidData()
    return value.map(parse)
  }
  return parseArray
}

/** 中文：解析真实 Z 结尾 UTC 时间，保留原文，非法值抛错，无副作用。 English: Parses a real UTC timestamp ending in Z, preserving text; failures throw, no effects. */
function parseInstant(value: unknown): string {
  const result = text()(value)
  formatDateTime(result, 'UTC')
  return result
}

/** 中文：解析布尔字段，不把字符串或数字转为布尔，非法值抛错，无副作用。 English: Parses a boolean without string/number coercion; invalid input throws, no effects. */
function parseBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') invalidData()
  return value
}

const parseStatus = enumeration<RefundStatus>(['open', 'approved', 'rejected'])
const parseProviderStatus = enumeration<ProviderRefundStatus>([
  'pending',
  'requires_action',
  'succeeded',
  'failed',
  'canceled',
])
const parseReason = enumeration<RefundReason>([
  'changed_mind',
  'wrong_address',
  'delivery_issue',
  'other',
])
const parseOrderStatus = enumeration<components['schemas']['OrderStatus']>([
  'unpaid',
  'pending',
  'delivering',
  'done',
  'refunding',
  'refunded',
  'cancelled',
])

/** 中文：解析仅含 ID 与昵称的公开用户简表，拒绝联系方式，失败抛错，无副作用。 English: Parses only public user ID/nickname, rejecting contact extras; failures throw, no effects. */
function parseUser(value: unknown): components['schemas']['UserBrief'] {
  return parseFields(value, { id: parseId, nickname: text() })
}

/** 中文：解析退款商品快照，不读取现名或现价，失败抛错，无副作用。 English: Parses refunded item snapshots without current names/prices; failures throw, no effects. */
function parseItem(value: unknown): components['schemas']['RefundItem'] {
  return parseFields(value, {
    orderItemId: parseId,
    nameZh: text(60),
    priceCents: parseInteger,
    qty: parsePositive,
    amountCents: parseInteger,
  })
}

/** 中文：解析退款独立审核/渠道投影及快照金额；历史 nullable 原样保留，失败抛错，无副作用。 English: Parses independent review/provider projections and snapshot amounts, preserving historical nullable fields; failures throw, no effects. */
export function parseRefund(value: unknown): Refund {
  const refund = parseFields<Refund>(value, {
    id: parseId,
    refundNo: text(64),
    orderId: parseId,
    orderNo: text(64),
    user: parseUser,
    status: parseStatus,
    provider: nullable(text(32)),
    providerRefundId: nullable(text(100)),
    providerRefundStatus: nullable(parseProviderStatus),
    reason: parseReason,
    extra: nullable(text(200)),
    items: array(parseItem),
    goodsAmountCents: parseInteger,
    shippingRefundCents: parseInteger,
    totalAmountCents: parseInteger,
    orderStatusBeforeApply: nullable(parseOrderStatus),
    autoApproved: parseBoolean,
    reviewedBy: nullable(text(60)),
    reviewedAt: nullable(parseInstant),
    createdAt: parseInstant,
    version: parseInteger,
  })
  if (
    BigInt(refund.totalAmountCents) !==
    BigInt(refund.goodsAmountCents) + BigInt(refund.shippingRefundCents)
  )
    invalidData()
  return refund
}

/** 中文：解析退款分页，允许分页元数据扩展但仅输出契约字段，失败抛错，无副作用。 English: Parses a refund page, allowing metadata extensions but returning only contract fields; failures throw, no effects. */
export function parseRefundPage(value: unknown): RefundPage {
  return parseFields<RefundPage>(
    value,
    {
      total: parseInteger,
      page: parsePositive,
      pageSize: parsePageSize,
      items: array(parseRefund),
    },
    false,
  )
}

/** 中文：将非法请求输入转为统一参数 ApiError，不发网或回显输入。 English: Converts invalid request input into the common validation ApiError without dispatch or input echo. */
function input<T>(parse: Parser<T>, value: unknown): T {
  try {
    return parse(value)
  } catch {
    throw new ApiError('business', 400, ERROR_CODE.VALIDATION_FAILED.code)
  }
}

/** 中文：解析可选分页/审核状态查询，拒绝渠道筛选等未约定字段，失败抛错，无副作用。 English: Parses optional pagination/review filters, rejecting undeclared fields such as provider filters; failures throw, no effects. */
function parseQuery(value: unknown): ListRefundsQuery {
  if (value === undefined) return {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalidData()
  const record = value as Record<string, unknown>
  const query: ListRefundsQuery = {}
  for (const key of Object.keys(record)) {
    if (!['page', 'pageSize', 'status'].includes(key)) invalidData()
  }
  if (record.page !== undefined) query.page = parsePositive(record.page)
  if (record.pageSize !== undefined) query.pageSize = parsePageSize(record.pageSize)
  if (record.status !== undefined) query.status = parseStatus(record.status)
  return query
}

/** 中文：解析审核输入，只接收版本和 open，拒绝金额、数量或操作者，失败抛错，无副作用。 English: Parses review input with only version/open state, rejecting amounts, quantities or actors; failures throw, no effects. */
function parseReviewInput(value: unknown): ReviewRefundInput {
  return parseFields(value, {
    version: parseInteger,
    expectedStatus: enumeration(['open'] as const),
  })
}

/** 中文：创建目标退款及写后状态/版本解析器，拒绝操作按契约检查审核元数据，失败抛错，无副作用。 English: Creates an identity/state/version parser, checking audit metadata for rejection as required by that operation; failures throw, no effects. */
function matchingRefund(id: string, status?: RefundStatus, version?: number): Parser<Refund> {
  /** 中文：解析响应并核对请求上下文，不把审核同意推导为渠道成功，失败抛错，无副作用。 English: Checks response context without inferring provider success from approval; failures throw, no effects. */
  function parseMatchingRefund(value: unknown): Refund {
    const refund = parseRefund(value)
    if (refund.id !== id || (status !== undefined && refund.status !== status)) invalidData()
    if (version !== undefined && refund.version !== version + 1) invalidData()
    if (status === 'rejected' && (refund.reviewedBy === null || refund.reviewedAt === null))
      invalidData()
    return refund
  }
  return parseMatchingRefund
}

export const refundApi = {
  /** 中文：读取分页/审核状态列表，支持取消，返回快照或 ApiError，不重试。 English: Lists review-filtered snapshots with cancellation, returning a page or ApiError without retries. */
  async list(query?: ListRefundsQuery, signal?: AbortSignal): Promise<RefundPage> {
    return http.request('/refunds', {
      params: input(parseQuery, query),
      signal,
      parse: parseRefundPage,
    })
  },
  /** 中文：按字符串 ID 读取退款详情，支持取消，返回快照或 ApiError。 English: Reads a refund snapshot by string ID with cancellation, returning data or ApiError. */
  async get(id: string, signal?: AbortSignal): Promise<Refund> {
    const refundId = input(parseId, id)
    return http.request(`/refunds/${refundId}`, { signal, parse: matchingRefund(refundId) })
  },
  /** 中文：提交版本和旧状态同意审核，不承诺渠道成功或到账；支持取消，返回快照或 ApiError，不重试。 English: Approves using version/old state without asserting payout success; cancellable, returns a snapshot or ApiError without retries. */
  async approve(id: string, body: ReviewRefundInput, signal?: AbortSignal): Promise<Refund> {
    const refundId = input(parseId, id)
    const data = input(parseReviewInput, body)
    return http.request(`/refunds/${refundId}/approve`, {
      method: 'POST',
      data,
      signal,
      parse: matchingRefund(refundId, 'approved', data.version),
    })
  },
  /** 中文：提交版本和旧状态拒绝审核，无拒绝原因/金额字段；支持取消，返回快照或 ApiError，不重试。 English: Rejects using version/old state without reason/amount fields; cancellable, returns a snapshot or ApiError without retries. */
  async reject(id: string, body: ReviewRefundInput, signal?: AbortSignal): Promise<Refund> {
    const refundId = input(parseId, id)
    const data = input(parseReviewInput, body)
    return http.request(`/refunds/${refundId}/reject`, {
      method: 'POST',
      data,
      signal,
      parse: matchingRefund(refundId, 'rejected', data.version),
    })
  },
}
