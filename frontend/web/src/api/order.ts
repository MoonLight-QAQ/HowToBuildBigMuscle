import type { components, operations } from '@/api/generated/admin'
import { ApiError, http } from '@/api/http'
import { ERROR_CODE } from '@/constants/error-code'
import { formatDateTime, formatLocalDate } from '@/utils/date'

export type Order = components['schemas']['Order']
export type OrderPage = components['schemas']['OrderPage']
export type OrderListItem = components['schemas']['OrderListItem']
export type OrderStatus = components['schemas']['OrderStatus']
export type ListOrdersQuery = NonNullable<operations['listOrders']['parameters']['query']>
export type StartOrderDeliveryInput = components['schemas']['StartOrderDeliveryInput']
export type ArriveOrderInput = components['schemas']['ArriveOrderInput']

type Parser<T> = (value: unknown) => T
type Fields<T> = { [Key in keyof T]-?: Parser<T[Key]> }

/** 中文：拒绝不符合订单契约的数据，无参数，抛安全错误且无副作用。 English: Throws a safe parsing error; no input or side effects. */
function invalidData(): never {
  throw new TypeError('invalid-order-data')
}

/** 中文：将未知对象逐字段解析为快照；额外字段默认拒绝，失败抛错，无副作用。 English: Parses an unknown object with field parsers; rejects extras by default, throws on failure, no effects. */
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

  /** 中文：判断输入键是否未声明，返回布尔值，无副作用。 English: Reports whether an input key is undeclared; no effects. */
  function isUnexpectedField(key: string): boolean {
    return !Object.hasOwn(fields, key)
  }
}

/** 中文：按契约字符数校验文本，返回解析器；非法值抛错，无副作用。 English: Creates a Unicode-length string parser; invalid values throw, no effects. */
function text(max = Infinity, min = 0): Parser<string> {
  /** 中文：解析未知文本并保留原文，非法类型或长度抛错，无副作用。 English: Preserves text after type/length validation; throws on invalid input, no effects. */
  function parseText(value: unknown): string {
    if (typeof value !== 'string' || [...value].length < min || [...value].length > max) {
      invalidData()
    }
    return value
  }
  return parseText
}

/** 中文：校验字符串 ID，保留前导零和大数，非法值抛错，无副作用。 English: Parses an ID without numeric conversion, preserving zeroes; throws on invalid input, no effects. */
function parseId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9]{1,20}$/.test(value)) invalidData()
  return value
}

/** 中文：校验非负安全整数，返回原数，非法值抛错，无副作用。 English: Parses a nonnegative safe integer; throws on invalid input, no effects. */
function parseInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalidData()
  return value
}

/** 中文：校验正安全整数，返回原数，非法值抛错，无副作用。 English: Parses a positive safe integer; throws on invalid input, no effects. */
function parsePositive(value: unknown): number {
  const result = parseInteger(value)
  if (result < 1) invalidData()
  return result
}

/** 中文：校验契约每页数量 1–100，返回原数，非法值抛错，无副作用。 English: Parses a page size from 1 to 100; throws on invalid input, no effects. */
function parsePageSize(value: unknown): number {
  const result = parsePositive(value)
  if (result > 100) invalidData()
  return result
}

/** 中文：由契约枚举创建解析器，未知值抛错，无副作用。 English: Creates a parser for contract enum values; unknown values throw, no effects. */
function enumeration<T extends string>(values: readonly T[]): Parser<T> {
  /** 中文：解析一个未知枚举值，返回允许值或抛错，无副作用。 English: Returns an allowed enum value or throws, without effects. */
  function parseEnum(value: unknown): T {
    if (typeof value !== 'string' || !values.includes(value as T)) invalidData()
    return value as T
  }
  return parseEnum
}

/** 中文：给解析器增加显式 null 分支，不接受缺字段，无副作用。 English: Adds an explicit null branch to a parser, without accepting missing fields or causing effects. */
function nullable<T>(parse: Parser<T>): Parser<T | null> {
  /** 中文：原样保留 null，其余值交原解析器，失败抛错，无副作用。 English: Preserves null or delegates to the parser; failures throw, no effects. */
  function parseNullable(value: unknown): T | null {
    return value === null ? null : parse(value)
  }
  return parseNullable
}

/** 中文：创建数组解析器，逐项产生已校验副本，失败抛错，无副作用。 English: Creates an array parser that validates and copies each item; failures throw, no effects. */
function array<T>(parse: Parser<T>): Parser<T[]> {
  /** 中文：解析未知数组，各项遵循给定解析器，非法值抛错，无副作用。 English: Parses an unknown array using the supplied item parser; invalid input throws, no effects. */
  function parseArray(value: unknown): T[] {
    if (!Array.isArray(value)) invalidData()
    return value.map(parse)
  }
  return parseArray
}

/** 中文：校验 Z 结尾的真实 UTC 时间，返回原文，非法值抛错，无副作用。 English: Parses a real UTC timestamp ending in Z; returns unchanged text or throws, no effects. */
function parseInstant(value: unknown): string {
  const result = text()(value)
  formatDateTime(result, 'UTC')
  return result
}

/** 中文：校验城市 IANA 时区，返回原文，非法值抛错，无副作用。 English: Parses a city IANA time zone; returns unchanged text or throws, no effects. */
function parseTimezone(value: unknown): string {
  const result = text(80, 1)(value)
  formatDateTime('2026-01-01T00:00:00Z', result)
  return result
}

/** 中文：校验真实当地日期，返回原文，非法值抛错，无副作用。 English: Parses a real local date; returns unchanged text or throws, no effects. */
function parseDate(value: unknown): string {
  return formatLocalDate(text()(value))
}

/** 中文：校验四位邮编并保留前导零，失败抛错，无副作用。 English: Parses a four-digit postcode while preserving zeroes; invalid input throws, no effects. */
function parsePostcode(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9]{4}$/.test(value)) invalidData()
  return value
}

const parseStatus = enumeration<OrderStatus>([
  'unpaid',
  'pending',
  'delivering',
  'done',
  'refunding',
  'refunded',
  'cancelled',
])

const parseAustralianState = enumeration<components['schemas']['AustralianState']>([
  'NSW',
  'VIC',
  'QLD',
  'WA',
  'SA',
  'TAS',
  'ACT',
  'NT',
])

/** 中文：解析用户公开简表，拒绝手机号等额外字段，失败抛错，无副作用。 English: Parses the public user projection, rejecting extra fields such as phone; failures throw, no effects. */
function parseUser(value: unknown): components['schemas']['UserBrief'] {
  return parseFields(value, { id: parseId, nickname: text() })
}

/** 中文：解析商品快照与已退款件数，不读取现价，失败抛错，无副作用。 English: Parses a purchased item snapshot and refunded quantity without current prices; failures throw, no effects. */
function parseItem(value: unknown): components['schemas']['OrderItem'] {
  const item = parseFields<components['schemas']['OrderItem']>(value, {
    id: parseId,
    productId: parseId,
    nameZh: text(60),
    nameEn: text(120),
    priceCents: parseInteger,
    qty: parsePositive,
    refundedQty: parseInteger,
  })
  if (item.refundedQty > item.qty) invalidData()
  return item
}

/** 中文：解析退款只读跳转摘要，拒绝支付或私人字段，失败抛错，无副作用。 English: Parses a refund navigation summary, rejecting payment/private extras; failures throw, no effects. */
function parseRefund(value: unknown): components['schemas']['RefundBrief'] {
  return parseFields(value, {
    id: parseId,
    refundNo: text(64),
    status: enumeration(['open', 'approved', 'rejected'] as const),
  })
}

/** 中文：按契约保留收货地址快照的原值，失败抛错，无副作用。 English: Parses a recipient address snapshot and preserves its original values; failures throw, no effects. */
function parseAddress(value: unknown): components['schemas']['AddressSnapshot'] {
  return parseFields(value, {
    formatted: text(300),
    street: text(150),
    zoneNameZh: nullable(text(20)),
    suburb: text(40),
    postcode: parsePostcode,
    state: parseAustralianState,
  })
}

const commonFields = {
  id: parseId,
  orderNo: text(64),
  status: parseStatus,
  fulfillment: enumeration(['local', 'post'] as const),
  user: parseUser,
  cityNameZh: text(60),
  timezone: parseTimezone,
  slotStartAt: nullable(parseInstant),
  slotEndAt: nullable(parseInstant),
  actualAmountCents: parseInteger,
  createdAt: parseInstant,
  version: parseInteger,
} satisfies Omit<Fields<OrderListItem>, 'itemsSummary'>

/** 中文：校验配送时段成对、先后及快递空值，失败抛错，无副作用。 English: Validates paired chronological slots and null postal slots; failures throw, no effects. */
function validateSlots(order: Pick<Order, 'fulfillment' | 'slotStartAt' | 'slotEndAt'>): void {
  const { slotStartAt: start, slotEndAt: end } = order
  if ((start === null) !== (end === null)) invalidData()
  if (order.fulfillment === 'post' && start !== null) invalidData()
  if (start !== null && end !== null) {
    // 中文：按完整秒与补零小数比较，避免 Date 截断毫秒以下精度。 English: Compare seconds and padded fractions without losing submillisecond precision.
    const startSecond = start.slice(0, 19)
    const endSecond = end.slice(0, 19)
    const width = Math.max(start.length, end.length)
    const isEarlier =
      startSecond < endSecond ||
      (startSecond === endSecond &&
        start.slice(20, -1).padEnd(width, '0') < end.slice(20, -1).padEnd(width, '0'))
    if (!isEarlier) invalidData()
  }
}

/** 中文：解析不含收货隐私的列表项，失败抛错，无副作用。 English: Parses an order list item without recipient PII; failures throw, no effects. */
function parseListItem(value: unknown): OrderListItem {
  const order = parseFields<OrderListItem>(value, { ...commonFields, itemsSummary: text(300) })
  validateSlots(order)
  return order
}

/** 中文：解析订单详情全部快照和状态关系，不重算现价，失败抛错，无副作用。 English: Parses the full order snapshot and state relationships without repricing; failures throw, no effects. */
export function parseOrder(value: unknown): Order {
  const order = parseFields<Order>(value, {
    ...commonFields,
    contactName: text(60),
    contactPhone: text(40, 1),
    address: parseAddress,
    deliveryDate: nullable(parseDate),
    slotNameZh: nullable(text(40)),
    remark: nullable(text(80)),
    items: array(parseItem),
    goodsAmountCents: parseInteger,
    shippingFeeCents: parseInteger,
    payExpireAt: nullable(parseInstant),
    paidAt: nullable(parseInstant),
    completedAt: nullable(parseInstant),
    completedBy: nullable(enumeration(['user', 'staff', 'auto'] as const)),
    cancelledAt: nullable(parseInstant),
    refunds: array(parseRefund),
  })
  validateSlots(order)
  if (order.fulfillment === 'post' && order.deliveryDate !== null) invalidData()
  const withoutShipping = order.status === 'unpaid' || order.status === 'cancelled'
  if (withoutShipping && order.shippingFeeCents !== 0) invalidData()
  const expectedAmount = BigInt(order.goodsAmountCents) + BigInt(order.shippingFeeCents)
  if (BigInt(order.actualAmountCents) !== expectedAmount) invalidData()
  return order
}

/** 中文：解析分页与安全列表投影；保留契约可扩展的分页但不透传扩展，失败抛错，无副作用。 English: Parses pagination and safe list projections, discarding allowed page extensions; failures throw, no effects. */
export function parseOrderPage(value: unknown): OrderPage {
  return parseFields<OrderPage>(
    value,
    {
      total: parseInteger,
      page: parsePositive,
      pageSize: parsePageSize,
      items: array(parseListItem),
    },
    false,
  )
}

/** 中文：校验请求输入并将非法值转为统一参数错误，不发请求。 English: Validates request input or throws the common validation ApiError; no requests. */
function input<T>(parse: Parser<T>, value: unknown): T {
  try {
    return parse(value)
  } catch {
    throw new ApiError('business', 400, ERROR_CODE.VALIDATION_FAILED.code)
  }
}

/** 中文：解析可选列表参数，仅发送契约字段，失败抛错，无副作用。 English: Parses optional list parameters and retains contract fields only; failures throw, no effects. */
function parseQuery(value: unknown): ListOrdersQuery {
  if (value === undefined) return {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalidData()
  const record = value as Record<string, unknown>
  const query: ListOrdersQuery = {}
  for (const key of Object.keys(record)) {
    if (!['page', 'pageSize', 'status'].includes(key)) invalidData()
  }
  if (record.page !== undefined) query.page = parsePositive(record.page)
  if (record.pageSize !== undefined) query.pageSize = parsePageSize(record.pageSize)
  if (record.status !== undefined) query.status = parseStatus(record.status)
  return query
}

/** 中文：创建详情匹配解析器，校验目标订单及写入后状态/版本，失败抛错，无副作用。 English: Creates a parser checking target identity and optional post-write state/version; failures throw, no effects. */
function matchingOrder(id: string, status?: OrderStatus, version?: number): Parser<Order> {
  /** 中文：解析未知订单并核对请求上下文，失败抛错，无副作用。 English: Parses an unknown order and checks its request context; failures throw, no effects. */
  function parseMatchingOrder(value: unknown): Order {
    const order = parseOrder(value)
    if (order.id !== id || (status !== undefined && order.status !== status)) invalidData()
    if (version !== undefined && order.version !== version + 1) invalidData()
    // 中文：仅店员送达操作的即时响应要求 staff 与服务端完成时间；历史详情的独立 nullable 字段保持契约原样。 English: Only the staff-arrival response requires staff and a server completion time; historical nullable fields remain independent.
    if (status === 'done' && (order.completedBy !== 'staff' || order.completedAt === null))
      invalidData()
    return order
  }
  return parseMatchingOrder
}

export const orderApi = {
  /** 中文：按可选分页/状态读取列表，支持取消；返回安全投影或 ApiError，不重试。 English: Lists safe projections with optional pagination/status and cancellation; returns a page or ApiError, no retries. */
  async list(query?: ListOrdersQuery, signal?: AbortSignal): Promise<OrderPage> {
    return http.request('/orders', {
      params: input(parseQuery, query),
      signal,
      parse: parseOrderPage,
    })
  },
  /** 中文：按字符串 ID 读取配送权限详情，支持取消；返回快照或 ApiError。 English: Gets the delivery-authorized detail by string ID with cancellation; returns a snapshot or ApiError. */
  async get(id: string, signal?: AbortSignal): Promise<Order> {
    const orderId = input(parseId, id)
    return http.request(`/orders/${orderId}`, { signal, parse: matchingOrder(orderId) })
  },
  /** 中文：提交已读版本与 pending，启动配送；返回更新快照或 ApiError，支持取消且不重试。 English: Starts delivery with the read version and pending state; returns an updated snapshot or ApiError, cancellable without retries. */
  async startDelivery(
    id: string,
    body: StartOrderDeliveryInput,
    signal?: AbortSignal,
  ): Promise<Order> {
    const orderId = input(parseId, id)
    const data = input(parseDeliveryInput, body)
    return http.request(`/orders/${orderId}/start-delivery`, {
      method: 'POST',
      data,
      signal,
      parse: matchingOrder(orderId, 'delivering', data.version),
    })
  },
  /** 中文：提交已读版本与旧状态并标记送达；返回服务端完成快照或 ApiError，支持取消且不重试。 English: Marks arrival using the read version/old state; returns the server completion snapshot or ApiError, cancellable without retries. */
  async arrive(id: string, body: ArriveOrderInput, signal?: AbortSignal): Promise<Order> {
    const orderId = input(parseId, id)
    const data = input(parseArriveInput, body)
    return http.request(`/orders/${orderId}/arrive`, {
      method: 'POST',
      data,
      signal,
      parse: matchingOrder(orderId, 'done', data.version),
    })
  },
}

/** 中文：解析开始配送输入，拒绝越权字段，失败抛错，无副作用。 English: Parses delivery input, rejecting unauthorized extras; failures throw, no effects. */
function parseDeliveryInput(value: unknown): StartOrderDeliveryInput {
  return parseFields(value, {
    version: parseInteger,
    expectedStatus: enumeration(['pending'] as const),
  })
}

/** 中文：解析送达输入，拒绝伪造完成时间等字段，失败抛错，无副作用。 English: Parses arrival input, rejecting forged completion fields; failures throw, no effects. */
function parseArriveInput(value: unknown): ArriveOrderInput {
  return parseFields(value, {
    version: parseInteger,
    expectedStatus: enumeration(['pending', 'delivering'] as const),
  })
}
