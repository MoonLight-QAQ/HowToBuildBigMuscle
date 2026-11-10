import { http, HttpResponse, type HttpHandler, type HttpResponseResolver } from 'msw/http'
import type { components } from '@/api/generated/admin'
import { ERROR_CODE, type ErrorDefinition } from '@/constants/error-code'
import {
  createRefundFixtures,
  createRefundOrderFixtures,
  type RefundMockOrder,
} from '@/mocks/data/refund'

type Refund = components['schemas']['Refund']
type ProviderStatus = components['schemas']['ProviderRefundStatus']
type ReviewInput = components['schemas']['ReviewRefundInput']
type ResolverInput = Parameters<HttpResponseResolver>[0]
type MockResult =
  | { ok: true; applied: boolean }
  | { ok: false; code: components['schemas']['ErrorResponse']['code'] }

/** 合成身份只在 Mock 中有效，不是真实凭据。 / Synthetic identities are Mock-only, never real credentials. */
export const REFUND_MOCK_TOKENS = {
  reviewer: 'mock-refund-reviewer',
  readonly: 'mock-refund-readonly',
  denied: 'mock-refund-denied',
} as const

/** 仅内存测试适配器事件；可靠终态必须显式确认，不是生产接口。 / In-memory test adapter event, not an API; reliable terminal results require confirmation. */
export type RefundProviderResult = {
  providerRefundId: string
  status: ProviderStatus | null
  confirmedTerminal?: boolean
}

/** 自定义数据仅供测试故障/超占场景；工厂深拷贝，不修改传入值。 / Custom seeds model test failures/overclaims and are cloned by the factory. */
export type RefundMockOptions = {
  baseURL?: string
  refunds?: readonly Refund[]
  orders?: readonly RefundMockOrder[]
}

/** 中文：返回不含私人资料的契约错误，输入定义和HTTP状态，无副作用。 English: Return a safe contract error for a definition/status without side effects. */
function fail(error: ErrorDefinition, status: number): Response {
  return HttpResponse.json<components['schemas']['ErrorResponse']>(
    { ok: false, code: error.code, message: error.message },
    { status },
  )
}

/** 中文：校验合成管理员及审核权限，失败返回错误，不修改数据。 English: Check synthetic administrator/review permissions before mutation. */
function authorize(request: Request, write = false): Response | undefined {
  const token = request.headers.get('authorization')
  if (token === `Bearer ${REFUND_MOCK_TOKENS.reviewer}`) return undefined
  if (token === `Bearer ${REFUND_MOCK_TOKENS.readonly}`)
    return write ? fail(ERROR_CODE.FORBIDDEN, 403) : undefined
  return token === `Bearer ${REFUND_MOCK_TOKENS.denied}`
    ? fail(ERROR_CODE.FORBIDDEN, 403)
    : fail(ERROR_CODE.NEED_LOGIN, 401)
}

/** 中文：检查查询白名单及重复字段，返回布尔，无副作用。 English: Check allowed query keys and reject duplicates without effects. */
function validQuery(url: URL, allowed: readonly string[]): boolean {
  for (const key of url.searchParams.keys())
    if (!allowed.includes(key) || url.searchParams.getAll(key).length !== 1) return false
  return true
}

/** 中文：解析正整数分页，非法返回null，不转换资源ID。 English: Parse positive pagination integers or null, never resource IDs. */
function parsePage(
  value: string | null,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number | null {
  if (value === null) return fallback
  if (!/^[1-9][0-9]*$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null
}

/** 中文：检查ID及资源请求无额外查询，返回布尔，无状态变更。 English: Check contract IDs and reject extra resource queries without mutation. */
function validResource(input: ResolverInput): input is ResolverInput & { params: { id: string } } {
  return (
    typeof input.params.id === 'string' &&
    /^[0-9]{1,20}$/.test(input.params.id) &&
    validQuery(new URL(input.request.url), [])
  )
}

/** 中文：解析精确审核体，只接受版本与open，不允许金额/审核人等字段。 English: Parse only version/open, rejecting amounts, reviewers and other fields. */
async function parseReview(request: Request): Promise<ReviewInput | null> {
  if (
    request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json'
  )
    return null
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
    record.version < 0 ||
    record.version >= Number.MAX_SAFE_INTEGER ||
    record.expectedStatus !== 'open'
  )
    return null
  return { version: record.version, expectedStatus: record.expectedStatus }
}

/** 中文：判断内部账本金额/数量能否安全记账，不读取外部数据。 English: Check a nonnegative safe accounting integer without external data. */
function safeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0
}

/** 中文：判断申请是否覆盖全部剩余商品，输入退款与订单，不扣除其他申请占用。 English: Check whether a claim covers every remaining unit without subtracting other reservations. */
function coversRemaining(refund: Refund, order: RefundMockOrder): boolean {
  const quantities = new Map<string, bigint>()
  for (const item of refund.items) {
    if (!safeInteger(item.qty)) return false
    quantities.set(item.orderItemId, (quantities.get(item.orderItemId) ?? 0n) + BigInt(item.qty))
  }
  for (const item of order.items) {
    if (
      !safeInteger(item.qty) ||
      !safeInteger(item.refundedQty) ||
      item.refundedQty > item.qty ||
      (quantities.get(item.id) ?? 0n) !== BigInt(item.qty - item.refundedQty)
    )
      return false
    quantities.delete(item.id)
  }
  return quantities.size === 0
}

/** 中文：创建隔离退款仓库、订单账本及测试事件端口；不连接支付服务，不注册控制HTTP接口。 English: Create isolated refund/ledger state and test event ports without payments or control HTTP endpoints. */
export function createRefundMock(options: RefundMockOptions = {}) {
  const baseURL = options.baseURL ?? import.meta.env.VITE_API_BASE_URL
  const seeds = structuredClone(options.refunds ?? createRefundFixtures())
  const refunds = new Map<string, Refund>()
  const orders = new Map<string, RefundMockOrder>()
  const terminals = new Map<string, ProviderStatus>()
  for (const refund of seeds) {
    refunds.set(refund.id, refund)
    if (
      refund.providerRefundId &&
      ['succeeded', 'failed', 'canceled'].includes(refund.providerRefundStatus ?? '')
    ) {
      terminals.set(refund.providerRefundId, refund.providerRefundStatus as ProviderStatus)
    }
  }
  for (const order of structuredClone(options.orders ?? createRefundOrderFixtures(seeds)))
    orders.set(order.id, order)

  /** 中文：待审或未可靠终结的已同意申请继续占用额度；无副作用。 English: Reserve capacity for open or not-reliably-terminated approved claims without effects. */
  function reserved(refund: Refund): boolean {
    return (
      refund.status === 'open' ||
      (refund.status === 'approved' &&
        !(refund.providerRefundId && terminals.has(refund.providerRefundId)))
    )
  }

  /** 中文：原子写前核验快照金额、已退量及所有未终结占用；非法/超额返回false。 English: Validate snapshot arithmetic and settled plus reserved capacity before any atomic write. */
  function fitsCapacity(order: RefundMockOrder): boolean {
    if (!safeInteger(order.shippingFeeCents) || !safeInteger(order.shippingRefundedCents))
      return false
    const purchased = new Map<string, RefundMockOrder['items'][number]>()
    const claimed = new Map<string, bigint>()
    for (const item of order.items) {
      if (
        !safeInteger(item.qty) ||
        item.qty < 1 ||
        !safeInteger(item.refundedQty) ||
        !safeInteger(item.priceCents) ||
        item.refundedQty > item.qty ||
        purchased.has(item.id)
      )
        return false
      purchased.set(item.id, item)
      claimed.set(item.id, BigInt(item.refundedQty))
    }
    let shipping = BigInt(order.shippingRefundedCents)
    for (const refund of refunds.values()) {
      if (refund.orderId !== order.id || !reserved(refund)) continue
      if (
        !safeInteger(refund.goodsAmountCents) ||
        !safeInteger(refund.shippingRefundCents) ||
        !safeInteger(refund.totalAmountCents)
      )
        return false
      let goods = 0n
      for (const item of refund.items) {
        const original = purchased.get(item.orderItemId)
        if (
          !original ||
          !safeInteger(item.qty) ||
          item.qty < 1 ||
          !safeInteger(item.priceCents) ||
          !safeInteger(item.amountCents) ||
          item.priceCents !== original.priceCents ||
          BigInt(item.qty) * BigInt(item.priceCents) !== BigInt(item.amountCents)
        )
          return false
        goods += BigInt(item.amountCents)
        claimed.set(item.orderItemId, (claimed.get(item.orderItemId) ?? 0n) + BigInt(item.qty))
      }
      if (
        goods !== BigInt(refund.goodsAmountCents) ||
        goods + BigInt(refund.shippingRefundCents) !== BigInt(refund.totalAmountCents)
      )
        return false
      if (refund.shippingRefundCents > 0 && !coversRemaining(refund, order)) return false
      shipping += BigInt(refund.shippingRefundCents)
    }
    for (const item of order.items)
      if ((claimed.get(item.id) ?? 0n) > BigInt(item.qty)) return false
    return shipping <= BigInt(order.shippingFeeCents)
  }

  /** 中文：读取账本深拷贝供测试断言，不向页面提供新接口或可变引用。 English: Return a defensive ledger copy for tests, never a new page API or mutable reference. */
  function inspectOrder(id: string): RefundMockOrder | undefined {
    const order = orders.get(id)
    return order ? structuredClone(order) : undefined
  }

  /** 中文：读取退款深拷贝供测试断言，不暴露内部可变对象。 English: Return a defensive refund copy for assertions without exposing state. */
  function inspectRefund(id: string): Refund | undefined {
    const refund = refunds.get(id)
    return refund ? structuredClone(refund) : undefined
  }

  /** 中文：处理仅内存的合成渠道事件；可靠成功幂等入账，失败终止可释放占用但不回库存。 English: Apply synthetic in-memory events; reliably confirmed success books once and terminal failure releases capacity without restocking. */
  function applyProviderResult(event: RefundProviderResult): MockResult {
    if (
      typeof event.providerRefundId !== 'string' ||
      !event.providerRefundId ||
      (event.status !== null &&
        !['pending', 'requires_action', 'succeeded', 'failed', 'canceled'].includes(event.status))
    )
      return { ok: false, code: 'VALIDATION_FAILED' }
    let refund: Refund | undefined
    for (const candidate of refunds.values()) {
      if (candidate.providerRefundId !== event.providerRefundId) continue
      if (refund) return { ok: false, code: 'INVALID_STATUS' }
      refund = candidate
    }
    if (!refund) return { ok: false, code: 'NOT_FOUND' }
    if (refund.status !== 'approved') return { ok: false, code: 'INVALID_STATUS' }
    const terminal = terminals.get(event.providerRefundId)
    if (terminal)
      return event.status === terminal
        ? { ok: true, applied: false }
        : { ok: false, code: 'INVALID_STATUS' }
    if (event.status === 'succeeded' && event.confirmedTerminal !== true)
      return { ok: false, code: 'VALIDATION_FAILED' }
    const order = orders.get(refund.orderId)
    if (!order) return { ok: false, code: 'NOT_FOUND' }
    if (event.status === 'succeeded' && !fitsCapacity(order))
      return { ok: false, code: 'INVALID_STATUS' }
    const updatedRefund: Refund = { ...refund, providerRefundStatus: event.status }
    if (event.status === 'succeeded') {
      const updatedOrder = structuredClone(order)
      for (const line of refund.items) {
        for (const item of updatedOrder.items)
          if (item.id === line.orderItemId) item.refundedQty += line.qty
      }
      updatedOrder.shippingRefundedCents += refund.shippingRefundCents
      let allRefunded = true
      for (const item of updatedOrder.items) if (item.refundedQty !== item.qty) allRefunded = false
      if (allRefunded) updatedOrder.status = 'refunded'
      orders.set(order.id, updatedOrder)
      terminals.set(event.providerRefundId, 'succeeded')
    } else if (
      (event.status === 'failed' || event.status === 'canceled') &&
      event.confirmedTerminal === true
    ) {
      terminals.set(event.providerRefundId, event.status)
    }
    refunds.set(refund.id, updatedRefund)
    return { ok: true, applied: true }
  }

  /** 中文：分页查询审核状态，不按渠道进度替代审核，不写入。 English: List by review status without substituting provider status or mutating data. */
  function list({ request }: ResolverInput): Response {
    const denied = authorize(request)
    if (denied) return denied
    const url = new URL(request.url)
    const page = parsePage(url.searchParams.get('page'), 1)
    const pageSize = parsePage(url.searchParams.get('pageSize'), 20, 100)
    const status = url.searchParams.get('status')
    if (
      !validQuery(url, ['page', 'pageSize', 'status']) ||
      page === null ||
      pageSize === null ||
      (status !== null && !['open', 'approved', 'rejected'].includes(status))
    )
      return fail(ERROR_CODE.VALIDATION_FAILED, 400)
    const matched: Refund[] = []
    for (const refund of refunds.values())
      if (status === null || status === refund.status) matched.push(refund)
    const offset = (page - 1) * pageSize
    const data: components['schemas']['RefundPage'] = {
      items: matched.slice(offset, offset + pageSize),
      total: matched.length,
      page,
      pageSize,
    }
    return HttpResponse.json({ ok: true, data })
  }

  /** 中文：校验认证/ID后读取退款单，失败不含data。 English: Read a refund after authentication/ID validation; errors contain no data. */
  function get(input: ResolverInput): Response {
    const denied = authorize(input.request)
    if (denied) return denied
    if (!validResource(input)) return fail(ERROR_CODE.VALIDATION_FAILED, 400)
    const refund = refunds.get(input.params.id)
    return refund ? HttpResponse.json({ ok: true, data: refund }) : fail(ERROR_CODE.NOT_FOUND, 404)
  }

  /** 中文：审核前一次性校验权限/版本/状态及额度，成功记录审核但不增加已退量。 English: Validate authorization/version/state/capacity atomically, then record review without settling quantities. */
  async function review(input: ResolverInput, approve: boolean): Promise<Response> {
    const denied = authorize(input.request, true)
    if (denied) return denied
    if (!validResource(input)) return fail(ERROR_CODE.VALIDATION_FAILED, 400)
    const payload = await parseReview(input.request)
    if (!payload) return fail(ERROR_CODE.VALIDATION_FAILED, 400)
    const refund = refunds.get(input.params.id)
    if (!refund) return fail(ERROR_CODE.NOT_FOUND, 404)
    if (refund.version !== payload.version) return fail(ERROR_CODE.VERSION_CONFLICT, 409)
    if (refund.status !== payload.expectedStatus) return fail(ERROR_CODE.INVALID_STATUS, 409)
    const order = orders.get(refund.orderId)
    if (!order) return fail(ERROR_CODE.NOT_FOUND, 404)
    if (approve && !fitsCapacity(order)) return fail(ERROR_CODE.INVALID_STATUS, 409)
    const providerRefundId = refund.providerRefundId ?? `mock-provider-refund-${refund.id}`
    if (approve) {
      for (const other of refunds.values())
        if (other.id !== refund.id && other.providerRefundId === providerRefundId)
          return fail(ERROR_CODE.INVALID_STATUS, 409)
    }
    const updated: Refund = {
      ...refund,
      status: approve ? 'approved' : 'rejected',
      reviewedBy: 'mock-refund-admin',
      reviewedAt: new Date().toISOString(),
      version: refund.version + 1,
      provider: approve ? 'mock' : refund.provider,
      providerRefundId: approve ? providerRefundId : refund.providerRefundId,
      providerRefundStatus: approve ? 'pending' : refund.providerRefundStatus,
    }
    if (
      !approve &&
      order.status === 'refunding' &&
      refund.orderStatusBeforeApply !== null &&
      coversRemaining(refund, order)
    ) {
      orders.set(order.id, { ...order, status: refund.orderStatusBeforeApply })
    }
    refunds.set(refund.id, updated)
    return HttpResponse.json({ ok: true, data: updated })
  }

  /** 中文：只同意待审申请，返回approved/pending，不执行真实退款。 English: Approve only open claims into approved/pending without real payments. */
  async function approve(input: ResolverInput): Promise<Response> {
    return review(input, true)
  }
  /** 中文：只拒绝待审申请，按保存的原状态恢复整单履约。 English: Reject only open claims and restore the saved whole-order fulfillment state. */
  async function reject(input: ResolverInput): Promise<Response> {
    return review(input, false)
  }

  const handlers: HttpHandler[] = [
    http.get(`${baseURL}/refunds`, list),
    http.get(`${baseURL}/refunds/:id`, get),
    http.post(`${baseURL}/refunds/:id/approve`, approve),
    http.post(`${baseURL}/refunds/:id/reject`, reject),
  ]
  return { handlers, applyProviderResult, inspectOrder, inspectRefund }
}

/** 中文：按可选URL创建新隔离仓库的四个handler，无真实支付。 English: Create four handlers with fresh isolated state for an optional URL, without payments. */
export function createRefundHandlers(baseURL?: string): HttpHandler[] {
  return createRefundMock({ baseURL }).handlers
}

export const refundMock = createRefundMock()
export const refundHandlers = refundMock.handlers
