import { http, HttpResponse, type HttpHandler, type HttpResponseResolver } from 'msw/http'
import type { components } from '@/api/generated/admin'
import { ERROR_CODE, type ErrorDefinition } from '@/constants/error-code'
import { createOrderFixtures } from '@/mocks/data/order'

type Order = components['schemas']['Order']
type OrderListItem = components['schemas']['OrderListItem']
type OrderPage = components['schemas']['OrderPage']
type OrderStatus = components['schemas']['OrderStatus']
type TransitionInput = components['schemas']['ArriveOrderInput']
type ResolverInput = Parameters<HttpResponseResolver>[0]
type Access = 'list' | 'detail' | 'write'

// 只在 Mock 开发/测试中识别的合成 token；不是真实登录凭据，也不接受任意 Bearer 授权。
// Synthetic Mock-only tokens, never real credentials or a production authorization mechanism.
export const ORDER_MOCK_TOKENS = {
  delivery: 'mock-order-delivery',
  readonly: 'mock-order-readonly',
  deliveryReadonly: 'mock-order-delivery-readonly',
  actionWithoutDelivery: 'mock-order-action-without-delivery',
} as const

const statuses: ReadonlySet<string> = new Set<OrderStatus>([
  'unpaid',
  'pending',
  'delivering',
  'done',
  'refunding',
  'refunded',
  'cancelled',
])

/** 中文：按契约生成安全错误；输入错误定义和状态码，返回无订单资料的响应。 English: Build a safe contract error without order data. */
function fail(error: ErrorDefinition, status: number): Response {
  return HttpResponse.json<components['schemas']['ErrorResponse']>(
    { ok: false, code: error.code, message: error.message },
    { status },
  )
}

/** 中文：验证合成认证及操作/配送资料权限，失败返回响应，无状态修改。 English: Check Mock authentication and permissions before any state mutation. */
function authorize(request: Request, access: Access): Response | undefined {
  const authorization = request.headers.get('authorization')
  const full = authorization === `Bearer ${ORDER_MOCK_TOKENS.delivery}`
  const read = authorization === `Bearer ${ORDER_MOCK_TOKENS.readonly}`
  const detail = authorization === `Bearer ${ORDER_MOCK_TOKENS.deliveryReadonly}`
  const action = authorization === `Bearer ${ORDER_MOCK_TOKENS.actionWithoutDelivery}`
  if (!full && !read && !detail && !action) return fail(ERROR_CODE.NEED_LOGIN, 401)
  if (access === 'list' || full || (access === 'detail' && detail)) return undefined
  return fail(ERROR_CODE.FORBIDDEN, 403)
}

/** 中文：按白名单返回订单列表快照，输入详情，输出不含收货隐私的独立投影。 English: Project a detail into an explicit PII-free list snapshot. */
function toListItem(order: Order): OrderListItem {
  const summary: string[] = []
  for (const item of order.items) summary.push(`${item.nameZh} × ${item.qty}`)
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    fulfillment: order.fulfillment,
    user: { id: order.user.id, nickname: order.user.nickname },
    cityNameZh: order.cityNameZh,
    timezone: order.timezone,
    slotStartAt: order.slotStartAt,
    slotEndAt: order.slotEndAt,
    itemsSummary: summary.join('；').slice(0, 300),
    actualAmountCents: order.actualAmountCents,
    createdAt: order.createdAt,
    version: order.version,
  }
}

/** 中文：验证查询字段白名单及重复值；输入 URL 和字段列表，无副作用。 English: Validate allowed query keys and reject duplicate values. */
function validQuery(url: URL, allowed: readonly string[]): boolean {
  for (const key of url.searchParams.keys()) {
    if (!allowed.includes(key) || url.searchParams.getAll(key).length !== 1) return false
  }
  return true
}

/** 中文：解析正整数分页参数，输入原值/默认值/上限，非法返回 null。 English: Parse a positive safe pagination integer or return null. */
function parsePage(
  value: string | null,
  fallback: number,
  max = Number.MAX_SAFE_INTEGER,
): number | null {
  if (value === null) return fallback
  if (!/^[1-9][0-9]*$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed <= max ? parsed : null
}

/** 中文：验证字符串 ID 和无查询参数的详情/写操作，非法返回 false。 English: Check the contract ID and reject extra detail/action queries. */
function validResource(input: ResolverInput): input is ResolverInput & { params: { id: string } } {
  return (
    typeof input.params.id === 'string' &&
    /^[0-9]{1,20}$/.test(input.params.id) &&
    validQuery(new URL(input.request.url), [])
  )
}

/** 中文：解析确切的状态变更请求；输入请求及目标操作，非法返回 null，不修改订单。 English: Parse the exact transition payload without changing orders. */
async function parseTransition(
  request: Request,
  startDelivery: boolean,
): Promise<TransitionInput | null> {
  const mediaType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
  if (mediaType !== 'application/json') return null
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return null
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const record = body as Record<string, unknown>
  if (
    Object.keys(record).length !== 2 ||
    !Object.hasOwn(record, 'version') ||
    !Object.hasOwn(record, 'expectedStatus')
  )
    return null
  if (
    typeof record.version !== 'number' ||
    !Number.isSafeInteger(record.version) ||
    record.version < 0
  )
    return null
  if (
    record.expectedStatus !== 'pending' &&
    (startDelivery || record.expectedStatus !== 'delivering')
  )
    return null
  return { version: record.version, expectedStatus: record.expectedStatus }
}

/**
 * 中文：按可选基础 URL 创建独立订单仓库及四个 handler；写入只影响本次工厂实例。
 * English: Create four handlers with an isolated order store for the optional base URL.
 */
export function createOrderHandlers(baseURL = import.meta.env.VITE_API_BASE_URL): HttpHandler[] {
  const orders = new Map<string, Order>()
  for (const order of createOrderFixtures()) orders.set(order.id, order)

  /** 中文：处理分页/状态列表请求；验证权限与参数，返回无隐私投影，不修改数据。 English: Resolve validated list queries with PII-free snapshots. */
  function listOrders({ request }: ResolverInput): Response {
    const denied = authorize(request, 'list')
    if (denied) return denied
    const url = new URL(request.url)
    const page = parsePage(url.searchParams.get('page'), 1)
    const pageSize = parsePage(url.searchParams.get('pageSize'), 20, 100)
    const status = url.searchParams.get('status')
    if (
      !validQuery(url, ['page', 'pageSize', 'status']) ||
      page === null ||
      pageSize === null ||
      (status !== null && !statuses.has(status))
    )
      return fail(ERROR_CODE.VALIDATION_FAILED, 400)
    const matched: OrderListItem[] = []
    for (const order of orders.values()) {
      if (status === null || order.status === status) matched.push(toListItem(order))
    }
    const offset = (page - 1) * pageSize
    const data: OrderPage = {
      items: matched.slice(offset, offset + pageSize),
      total: matched.length,
      page,
      pageSize,
    }
    return HttpResponse.json({ ok: true, data })
  }

  /** 中文：仅向有配送资料权限的管理员返回详情，失败不返回 data。 English: Return details only after delivery-data authorization. */
  function getOrder(input: ResolverInput): Response {
    const denied = authorize(input.request, 'detail')
    if (denied) return denied
    if (!validResource(input)) return fail(ERROR_CODE.VALIDATION_FAILED, 400)
    const order = orders.get(input.params.id)
    return order ? HttpResponse.json({ ok: true, data: order }) : fail(ERROR_CODE.NOT_FOUND, 404)
  }

  /** 中文：原子校验权限、入参、版本和旧状态后变更；失败无写入，成功返回最新详情。 English: Validate then atomically transition; failures never mutate the store. */
  async function transition(input: ResolverInput, startDelivery: boolean): Promise<Response> {
    const denied = authorize(input.request, 'write')
    if (denied) return denied
    if (!validResource(input)) return fail(ERROR_CODE.VALIDATION_FAILED, 400)
    const payload = await parseTransition(input.request, startDelivery)
    if (!payload) return fail(ERROR_CODE.VALIDATION_FAILED, 400)
    const order = orders.get(input.params.id)
    if (!order) return fail(ERROR_CODE.NOT_FOUND, 404)
    // 先判断版本，再判断状态；两者都过期时稳定返回版本冲突。 / Version conflicts take precedence.
    if (order.version !== payload.version) return fail(ERROR_CODE.VERSION_CONFLICT, 409)
    if (order.status !== payload.expectedStatus) return fail(ERROR_CODE.INVALID_STATUS, 409)
    const updated: Order = {
      ...order,
      status: startDelivery ? 'delivering' : 'done',
      version: order.version + 1,
      completedAt: startDelivery ? order.completedAt : new Date().toISOString(),
      completedBy: startDelivery ? order.completedBy : 'staff',
    }
    orders.set(order.id, updated)
    return HttpResponse.json({ ok: true, data: updated })
  }

  /** 中文：处理开始配送请求，仅允许待配送到配送中；成功修改实例状态。 English: Start delivery only from pending in this isolated store. */
  async function startDelivery(input: ResolverInput): Promise<Response> {
    return transition(input, true)
  }

  /** 中文：处理确认送达请求，仅允许待配送/配送中到完成并记录店员来源。 English: Complete pending/delivering orders with the staff source. */
  async function arrive(input: ResolverInput): Promise<Response> {
    return transition(input, false)
  }

  return [
    http.get(`${baseURL}/orders`, listOrders),
    http.get(`${baseURL}/orders/:id`, getOrder),
    http.post(`${baseURL}/orders/:id/start-delivery`, startDelivery),
    http.post(`${baseURL}/orders/:id/arrive`, arrive),
  ]
}

export const orderHandlers: HttpHandler[] = createOrderHandlers()
