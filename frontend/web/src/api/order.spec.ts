// @vitest-environment node
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { delay } from 'msw'
import { http as mockHttp, HttpResponse, type HttpResponseResolver } from 'msw/http'
import { setupServer } from 'msw/node'
import { ApiError, http } from './http'
import { createOrderFixtures } from '@/mocks/data/order'
import { createOrderHandlers, type OrderMockRole } from '@/mocks/handlers/order'
import {
  orderApi,
  parseOrder,
  parseOrderPage,
  type ArriveOrderInput,
  type ListOrdersQuery,
  type Order,
  type OrderListItem,
  type StartOrderDeliveryInput,
} from './order'

/** 中文：只替换客户端实例的测试地址，保留真实 HttpClient；无外网请求。 English: Replaces only the client instance with a test-base real HttpClient; no external traffic. */
vi.mock('./http', async function configureClient(importOriginal) {
  const actual = await importOriginal<typeof import('./http')>()
  return { ...actual, http: new actual.HttpClient({ baseURL: 'http://localhost:48133/api/admin' }) }
})

const baseURL = 'http://localhost:48133/api/admin'
const server = setupServer()

/** 中文：创建完全虚构的订单快照，每次返回独立副本，无网络副作用。 English: Creates a fresh wholly fictional order snapshot; no network effects. */
function fixture(): Order {
  return {
    id: '9000000000000000010',
    orderNo: 'MOCK-ORDER-001',
    status: 'pending',
    fulfillment: 'local',
    user: { id: '9000000000000000001', nickname: '演示用户' },
    cityNameZh: '演示城市',
    timezone: 'Australia/Sydney',
    slotStartAt: '2026-11-02T07:00:00Z',
    slotEndAt: '2026-11-02T09:00:00Z',
    actualAmountCents: 8400,
    createdAt: '2026-11-01T00:00:00Z',
    version: 7,
    contactName: '演示收货人',
    contactPhone: '0491 570 006',
    address: {
      formatted: '演示地址，请勿配送',
      street: '示例街道',
      zoneNameZh: '演示大区',
      suburb: 'Example Suburb',
      postcode: '0200',
      state: 'NSW',
    },
    deliveryDate: '2026-11-02',
    slotNameZh: '演示时段',
    remark: null,
    items: [
      {
        id: '9000000000000000011',
        productId: '9000000000000000012',
        nameZh: '示例商品',
        nameEn: 'Example product',
        priceCents: 3900,
        qty: 2,
        refundedQty: 0,
      },
    ],
    goodsAmountCents: 7800,
    shippingFeeCents: 600,
    payExpireAt: null,
    paidAt: '2026-11-01T00:01:00Z',
    completedAt: null,
    completedBy: null,
    cancelledAt: null,
    refunds: [{ id: '9000000000000000020', refundNo: 'MOCK-REFUND-001', status: 'approved' }],
  }
}

/** 中文：显式投影公开列表字段，不复用完整详情对象，无副作用。 English: Explicitly projects public list fields without spreading recipient details; no effects. */
function listFixture(): OrderListItem {
  const order = fixture()
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    fulfillment: order.fulfillment,
    user: order.user,
    cityNameZh: order.cityNameZh,
    timezone: order.timezone,
    slotStartAt: order.slotStartAt,
    slotEndAt: order.slotEndAt,
    itemsSummary: '示例商品 × 2',
    actualAmountCents: order.actualAmountCents,
    createdAt: order.createdAt,
    version: order.version,
  }
}

/** 中文：为给定 data 建立成功响应解析器，不连接真实服务。 English: Creates a successful response resolver for supplied data without a real service. */
function success(data: unknown): HttpResponseResolver {
  /** 中文：返回已包裹的虚构响应，不修改输入。 English: Returns an enveloped fictional response without changing input. */
  function resolveSuccess(): Response {
    return HttpResponse.json({ ok: true, data })
  }
  return resolveSuccess
}

/** 中文：启用隔离拦截，未声明请求失败。 English: Starts isolated interception, failing undeclared requests. */
function startServer(): void {
  server.listen({ onUnhandledFrame: 'error' })
}

/** 中文：清理每例 handler，无返回值。 English: Clears per-test handlers; returns nothing. */
function resetServer(): void {
  server.resetHandlers()
  http.setAuth(null)
}

/** 中文：结束拦截并恢复网络实现。 English: Stops interception and restores the network implementation. */
function stopServer(): void {
  server.close()
}

beforeAll(startServer)
afterEach(resetServer)
afterAll(stopServer)

/** 中文：验证快照字段、ID、整数分及虚构完整电话保持原值并产生副本。 English: Verifies snapshot values, string IDs, cents and fictional full phone survive in a copied object. */
it('解析详情快照，保留大数 ID、金额和前导零邮编', function testValidOrder() {
  const original = fixture()
  original.address.zoneNameZh = '😀'.repeat(20)
  original.address.suburb = '😀'.repeat(40)
  const parsed = parseOrder(original)
  expect(parsed).toEqual(original)
  expect(parsed).not.toBe(original)
  expect(parsed.address).not.toBe(original.address)
  expect(parsed.items).not.toBe(original.items)
  expect(parsed.address.postcode).toBe('0200')
})

/** 中文：验证快递空时段、可空字段、空商品数组及 Unicode 字符长度遵循契约。 English: Verifies postal null slots, nullable fields, empty items and Unicode lengths follow the contract. */
it('接受契约允许的空值和字符串 ID，不额外限制数组或中文长度', function testContractBoundaries() {
  const base = fixture()
  const order: Order = {
    ...base,
    id: '0',
    fulfillment: 'post',
    slotStartAt: null,
    slotEndAt: null,
    deliveryDate: null,
    slotNameZh: null,
    address: { ...base.address, zoneNameZh: null, suburb: '' },
    items: [],
    contactName: '😀'.repeat(60),
    remark: '',
  }
  expect(parseOrder(order)).toEqual(order)
})

/** 中文：验证退款中的已完成订单仍保留原金额及完成历史，不以退款件数重算。 English: Verifies refunding orders retain original amounts and completion history without repricing refunded quantities. */
it('保留部分退款后的原始快照与历史完成信息', function testRefundSnapshot() {
  const order = fixture()
  order.status = 'refunding'
  order.items[0]!.refundedQty = 1
  order.completedAt = '2026-11-02T09:00:00Z'
  order.completedBy = 'user'
  expect(parseOrder(order).actualAmountCents).toBe(8400)
})

/** 中文：通用详情按 schema 独立保留历史 nullable 字段，不把现行写操作要求施加到历史读取。 English: Preserves independently nullable historical fields without imposing current mutation requirements on reads. */
it.each([
  { completedAt: '2026-11-02T09:00:00Z', completedBy: null },
  { completedAt: null, completedBy: 'user' },
  { status: 'done', completedAt: null, completedBy: null },
  { status: 'cancelled', cancelledAt: null, shippingFeeCents: 0, actualAmountCents: 7800 },
])('接受历史 nullable 字段：%j', function testHistoricalNullableFields(patch) {
  expect(parseOrder({ ...fixture(), ...patch })).toMatchObject(patch)
})

/** 中文：验证待支付/取消使用零运费的原始商品快照，不按当前配置补运费。 English: Verifies unpaid/cancelled orders use zero-fee goods snapshots without adding current shipping rates. */
it.each(['unpaid', 'cancelled'] as const)(
  '接受 %s 的零运费快照',
  function testNoShippingSnapshot(status) {
    const order: Order = {
      ...fixture(),
      status,
      shippingFeeCents: 0,
      actualAmountCents: 7800,
      cancelledAt: status === 'cancelled' ? '2026-11-01T00:02:00Z' : null,
    }
    expect(parseOrder(order).actualAmountCents).toBe(7800)
  },
)

/** 中文：验证契约允许的亚毫秒时段不被 Date 精度截断误拒绝。 English: Verifies contract-valid submillisecond intervals are not rejected due to Date truncation. */
it('保留 UTC 时间的小数秒精度来比较时段', function testFractionalSlot() {
  const order = {
    ...fixture(),
    slotStartAt: '2026-11-02T07:00:00.0001Z',
    slotEndAt: '2026-11-02T07:00:00.0002Z',
  }
  expect(parseOrder(order)).toEqual(order)
})

const invalidOrderPatches: Array<[string, Record<string, unknown>]> = [
  ['数字 ID', { id: 9000000000000000010 }],
  ['超长 ID', { id: '1'.repeat(21) }],
  ['未知订单状态', { status: 'paid' }],
  ['未知配送方式', { fulfillment: 'drone' }],
  ['用户联系方式泄露', { user: { ...fixture().user, phone: 'private-marker' } }],
  ['未知详情字段', { unexpectedField: 'extra-marker' }],
  ['缺失必填 nullable', { remark: undefined }],
  ['未知 IANA 时区', { timezone: 'Australia/Invalid' }],
  ['固定时区偏移', { timezone: '+11:00' }],
  ['非 UTC 时间', { createdAt: '2026-11-01T00:00:00+00:00' }],
  ['不存在的日期', { createdAt: '2026-02-30T00:00:00Z' }],
  ['不存在的当地日期', { deliveryDate: '2026-02-30' }],
  ['小数金额', { actualAmountCents: 8400.5 }],
  ['不安全金额', { actualAmountCents: Number.MAX_SAFE_INTEGER + 1 }],
  ['不安全版本', { version: Number.MAX_SAFE_INTEGER + 1 }],
  ['负数版本', { version: -1 }],
  ['金额关系冲突', { actualAmountCents: 7800 }],
  ['取消订单非零运费', { status: 'cancelled', cancelledAt: '2026-11-01T00:02:00Z' }],
  ['未支付订单非零运费', { status: 'unpaid' }],
  ['时段缺一端', { slotEndAt: null }],
  ['时段反序', { slotEndAt: '2026-11-02T06:00:00Z' }],
  ['快递带配送时段', { fulfillment: 'post' }],
  ['快递带当地日期', { fulfillment: 'post', slotStartAt: null, slotEndAt: null }],
  ['空联系电话', { contactPhone: '' }],
  ['超长收货人名', { contactName: '字'.repeat(61) }],
  ['超长配送大区名', { address: { ...fixture().address, zoneNameZh: '😀'.repeat(21) } }],
  ['超长街区名', { address: { ...fixture().address, suburb: '😀'.repeat(41) } }],
  ['街区为 null', { address: { ...fixture().address, suburb: null } }],
  ['州代码为 null', { address: { ...fixture().address, state: null } }],
  ['未知州代码', { address: { ...fixture().address, state: 'nsw' } }],
  ['旧配送区字段', { address: { ...fixture().address, districtNameZh: '旧区' } }],
  ['数字邮编', { address: { ...fixture().address, postcode: 2000 } }],
  ['未知完成者', { completedAt: '2026-11-02T09:00:00Z', completedBy: 'system' }],
  ['未知退款审核状态', { refunds: [{ ...fixture().refunds[0], status: 'succeeded' }] }],
  [
    '退款摘要携带渠道进度',
    { refunds: [{ ...fixture().refunds[0], providerRefundStatus: 'pending' }] },
  ],
  ['退款件数超出购买', { items: [{ ...fixture().items[0], refundedQty: 3 }] }],
  ['零购买件数', { items: [{ ...fixture().items[0], qty: 0 }] }],
  ['负数商品单价', { items: [{ ...fixture().items[0], priceCents: -1 }] }],
]

/** 中文：逐例验证未知/不一致响应不能进入 View，不产生副作用。 English: Verifies invalid or inconsistent response cases cannot reach the view; no effects. */
it.each(invalidOrderPatches)('拒绝详情：%s', function testInvalidOrder(_label, patch) {
  /** 中文：构造单例非法响应并触发校验，失败预期抛错，无副作用。 English: Parses one invalid fixture, expecting an error; no effects. */
  function parseInvalidFixture(): Order {
    return parseOrder({ ...fixture(), ...patch })
  }
  expect(parseInvalidFixture).toThrow()
})

/** 中文：拒绝缺少新版地址字段的快照，包含可空但必返的大区名。 English: Reject snapshots missing a new address field, including the required nullable zone name. */
it.each(['zoneNameZh', 'suburb', 'state'] as const)(
  '拒绝地址缺少 %s',
  function testMissingAddressField(field) {
    const order = fixture()
    const address: Partial<Order['address']> = { ...order.address }
    delete address[field]

    /** 中文：解析缺少地址字段的详情，预期抛错。 English: Parse a detail with a missing address field, expecting an error. */
    function parseIncompleteOrder(): Order {
      return parseOrder({ ...order, address })
    }

    expect(parseIncompleteOrder).toThrow()
  },
)

/** 中文：验证真正缺失字段与非对象均被拒绝，失败预期抛错。 English: Verifies missing required fields and nonobjects are rejected with expected errors. */
it('拒绝缺失字段、null 和数组详情', function testMissingFields() {
  const missing: Record<string, unknown> = { ...fixture() }
  delete missing.remark
  for (const value of [missing, null, [], 'order']) {
    /** 中文：尝试解析非法容器，预期抛错，无副作用。 English: Parses an invalid container, expecting an error; no effects. */
    function parseInvalidContainer(): Order {
      return parseOrder(value)
    }
    expect(parseInvalidContainer).toThrow()
  }
})

/** 中文：验证列表只包含公开投影，并允许分页结构扩展但不透传。 English: Verifies list projections are public and page extensions are allowed but discarded. */
it('解析安全列表、零总数及允许的分页扩展', function testValidPage() {
  const page = { items: [listFixture()], total: 1, page: 1, pageSize: 20 }
  expect(parseOrderPage({ ...page, nextCursor: null })).toEqual(page)
  expect(parseOrderPage({ items: [], total: 0, page: 1, pageSize: 100 })).toEqual({
    items: [],
    total: 0,
    page: 1,
    pageSize: 100,
  })
})

const invalidPagePatches: Array<[string, Record<string, unknown>]> = [
  ['列表收货电话', { items: [{ ...listFixture(), contactPhone: 'private-marker' }] }],
  [
    '用户私人联系方式',
    { items: [{ ...listFixture(), user: { ...listFixture().user, email: 'private-marker' } }] },
  ],
  ['详情误作列表项', { items: [fixture()] }],
  ['缺失列表摘要', { items: [{ ...listFixture(), itemsSummary: undefined }] }],
  ['非数组 items', { items: null }],
  ['不安全 total', { total: Number.MAX_SAFE_INTEGER + 1 }],
  ['零页码', { page: 0 }],
  ['每页超限', { pageSize: 101 }],
]

/** 中文：逐例验证列表隐私和分页边界，失败预期抛错。 English: Verifies privacy and pagination failures are rejected with expected errors. */
it.each(invalidPagePatches)('拒绝列表：%s', function testInvalidPage(_label, patch) {
  /** 中文：解析单例非法分页响应，无副作用。 English: Parses an invalid page fixture without effects. */
  function parseInvalidPage(): unknown {
    return parseOrderPage({ items: [listFixture()], total: 1, page: 1, pageSize: 20, ...patch })
  }
  expect(parseInvalidPage).toThrow()
})

/** 中文：验证真实请求客户端发送正确查询并解析安全投影。 English: Verifies the real client sends the contract query and parses safe projections. */
it('列表仅发送 page/pageSize/status；取消信号可传递', async function testListRequest() {
  /** 中文：核对 URL 查询并返回安全分页，无真实后端副作用。 English: Checks URL parameters and returns a safe page; no real backend effects. */
  function resolveList({ request }: Parameters<HttpResponseResolver>[0]): Response {
    expect(new URL(request.url).searchParams.toString()).toBe('page=2&pageSize=10&status=refunding')
    return HttpResponse.json({
      ok: true,
      data: { items: [listFixture()], total: 11, page: 2, pageSize: 10 },
    })
  }
  server.use(mockHttp.get(`${baseURL}/orders`, resolveList))
  const page = await orderApi.list(
    { page: 2, pageSize: 10, status: 'refunding' },
    new AbortController().signal,
  )
  expect(page.items[0]?.id).toBe(fixture().id)
})

/** 中文：验证不传筛选时不构造空状态，使用服务端默认分页。 English: Verifies omitted filters do not create an empty status and preserve server pagination defaults. */
it('列表默认请求不发送多余查询', async function testDefaultListRequest() {
  /** 中文：检查无查询并返回空页，无真实写入。 English: Checks an empty query and returns an empty page without writes. */
  function resolveDefaultList({ request }: Parameters<HttpResponseResolver>[0]): Response {
    expect(new URL(request.url).search).toBe('')
    return HttpResponse.json({ ok: true, data: { items: [], total: 0, page: 1, pageSize: 20 } })
  }
  server.use(mockHttp.get(`${baseURL}/orders`, resolveDefaultList))
  await expect(orderApi.list()).resolves.toMatchObject({ total: 0 })
})

/** 中文：验证详情路径保留字符串 ID，响应不经过数字转换。 English: Verifies detail paths preserve string IDs without numeric conversion. */
it('按字符串 ID 获取详情并保留前导零', async function testDetailRequest() {
  const order = { ...fixture(), id: '00000000000000000010' }
  server.use(mockHttp.get(`${baseURL}/orders/${order.id}`, success(order)))
  await expect(orderApi.get(order.id)).resolves.toEqual(order)
})

/** 中文：验证开始配送只提交版本与旧状态，并解析递增版本。 English: Verifies start delivery sends only version/old state and parses an incremented version. */
it('POST 开始配送携带准确 version 与 expectedStatus', async function testStartDeliveryRequest() {
  const order = fixture()
  /** 中文：核对命令输入，返回配送中快照；仅修改虚构响应。 English: Checks command input and returns a delivering fictional snapshot only. */
  async function resolveDelivery({
    request,
  }: Parameters<HttpResponseResolver>[0]): Promise<Response> {
    expect(await request.json()).toEqual({ version: 7, expectedStatus: 'pending' })
    return HttpResponse.json({ ok: true, data: { ...order, status: 'delivering', version: 8 } })
  }
  server.use(mockHttp.post(`${baseURL}/orders/${order.id}/start-delivery`, resolveDelivery))
  await expect(
    orderApi.startDelivery(order.id, { version: 7, expectedStatus: 'pending' }),
  ).resolves.toMatchObject({ status: 'delivering', version: 8 })
})

/** 中文：验证 pending/delivering 均可提交送达，不提交完成时间或操作者。 English: Verifies either pending/delivering can arrive without submitting completion time or actor. */
it.each(['pending', 'delivering'] as const)(
  '送达提交 %s 旧状态和版本',
  async function testArriveRequest(expectedStatus) {
    const order = fixture()
    /** 中文：核对送达 body，返回服务端完成时间与 staff 来源，无真实写入。 English: Checks arrival body and returns server completion time and staff source, without real writes. */
    async function resolveArrival({
      request,
    }: Parameters<HttpResponseResolver>[0]): Promise<Response> {
      expect(await request.json()).toEqual({ version: 7, expectedStatus })
      return HttpResponse.json({
        ok: true,
        data: {
          ...order,
          status: 'done',
          version: 8,
          completedBy: 'staff',
          completedAt: '2026-11-02T08:00:00Z',
        },
      })
    }
    server.use(mockHttp.post(`${baseURL}/orders/${order.id}/arrive`, resolveArrival))
    await expect(orderApi.arrive(order.id, { version: 7, expectedStatus })).resolves.toMatchObject({
      status: 'done',
      completedBy: 'staff',
      version: 8,
    })
  },
)

/** 中文：验证业务错误不被模块吞掉或误作快照，保留冲突/权限语义。 English: Verifies business errors are preserved with conflict/permission semantics rather than becoming snapshots. */
it.each([
  [403, 'FORBIDDEN'],
  [409, 'VERSION_CONFLICT'],
  [409, 'INVALID_STATUS'],
] as const)('保留业务错误 %s/%s', async function testBusinessError(status, code) {
  /** 中文：模拟安全业务失败响应，无私人数据。 English: Returns a safe business failure without private data. */
  function resolveFailure(): Response {
    return HttpResponse.json({ ok: false, code, message: '安全测试错误' }, { status })
  }
  server.use(mockHttp.post(`${baseURL}/orders/${fixture().id}/start-delivery`, resolveFailure))
  await expect(
    orderApi.startDelivery(fixture().id, { version: 7, expectedStatus: 'pending' }),
  ).rejects.toMatchObject({ kind: 'business', code, status })
})

/** 中文：验证权限不足的详情不会以任何 data 作为成功返回。 English: Verifies forbidden detail data is never returned as a successful order. */
it('详情 403 保留 FORBIDDEN，即便响应错误附带 data', async function testForbiddenDetail() {
  /** 中文：模拟有恶意多余 data 的错误响应，不返回给调用者。 English: Returns a failure envelope with malicious extra data that must not reach callers. */
  function resolveForbidden(): Response {
    return HttpResponse.json(
      { ok: false, code: 'FORBIDDEN', message: '无权限', data: fixture() },
      { status: 403 },
    )
  }
  server.use(mockHttp.get(`${baseURL}/orders/${fixture().id}`, resolveForbidden))
  await expect(orderApi.get(fixture().id)).rejects.toMatchObject({
    kind: 'business',
    code: 'FORBIDDEN',
    status: 403,
  })
})

/** 中文：验证数据层拒绝不同订单、错误状态及未递增版本，不更新本地快照。 English: Verifies mismatched IDs, states and nonincremented versions reject without updating local snapshots. */
it.each([
  { id: '999' },
  { status: 'pending' },
  { version: 7 },
  { version: 9 },
  { actualAmountCents: 1 },
])('写响应不一致时返回 protocol：%j', async function testInvalidWriteResponse(patch) {
  server.use(
    mockHttp.post(
      `${baseURL}/orders/${fixture().id}/start-delivery`,
      success({ ...fixture(), status: 'delivering', version: 8, ...patch }),
    ),
  )
  await expect(
    orderApi.startDelivery(fixture().id, { version: 7, expectedStatus: 'pending' }),
  ).rejects.toMatchObject({ kind: 'protocol', status: 200 })
})

/** 中文：店员送达即时响应须包含 staff 和完成时间，禁止从历史通用 nullable 推导此次写入成功。 English: Requires staff and completion time in immediate arrival responses instead of inferring mutation success from historical nullability. */
it.each([
  ['用户来源', { completedBy: 'user' }],
  ['自动来源', { completedBy: 'auto' }],
  ['空完成来源', { completedBy: null }],
  ['空完成时间', { completedAt: null }],
  ['缺完成时间', { completedAt: undefined }],
])('拒绝送达响应：%s', async function testInvalidArrivalResponse(_label, patch) {
  server.use(
    mockHttp.post(
      `${baseURL}/orders/${fixture().id}/arrive`,
      success({
        ...fixture(),
        status: 'done',
        version: 8,
        completedBy: 'staff',
        completedAt: '2026-11-02T08:00:00Z',
        ...patch,
      }),
    ),
  )
  await expect(
    orderApi.arrive(fixture().id, { version: 7, expectedStatus: 'pending' }),
  ).rejects.toMatchObject({ kind: 'protocol', status: 200 })
})

/** 中文：验证详情错误 ID 和非契约 payload 由 HttpClient 安全归一化。 English: Verifies wrong-detail IDs and invalid payloads are safely normalized by HttpClient. */
it.each([{ ...fixture(), id: '9' }, { ...fixture(), contactPhone: null }, null])(
  '详情非法响应归一化 protocol',
  async function testInvalidDetailResponse(data) {
    server.use(mockHttp.get(`${baseURL}/orders/${fixture().id}`, success(data)))
    await expect(orderApi.get(fixture().id)).rejects.toBeInstanceOf(ApiError)
    await expect(orderApi.get(fixture().id)).rejects.toMatchObject({
      kind: 'protocol',
      status: 200,
    })
  },
)

/** 中文：验证取消信号穿透模块到 HTTP，取消不会变成业务错误。 English: Verifies cancellation reaches HTTP and is preserved as cancellation rather than a business failure. */
it('取消详情请求保留 canceled 分类', async function testCancelDetail() {
  /** 中文：延迟返回虚构数据供取消测试，不访问外网。 English: Delays a fictional response for cancellation testing without external traffic. */
  async function resolveSlowDetail(): Promise<Response> {
    await delay(100)
    return HttpResponse.json({ ok: true, data: fixture() })
  }
  server.use(mockHttp.get(`${baseURL}/orders/${fixture().id}`, resolveSlowDetail))
  const controller = new AbortController()
  const pending = orderApi.get(fixture().id, controller.signal)
  controller.abort()
  await expect(pending).rejects.toMatchObject({ kind: 'canceled', code: null })
})

/** 中文：验证非法路径和输入在发网前失败，避免 PII/越权字段进入请求。 English: Verifies invalid paths and input fail before dispatch, preventing PII/unauthorized request fields. */
it('拒绝路径注入、空筛选、分页越界及伪造写字段', async function testInvalidInput() {
  let requests = 0
  /** 中文：记录意外请求，若触发则返回安全响应；不访问真实后端。 English: Counts unexpected requests and returns a safe response, without a real backend. */
  function countUnexpectedRequest(): Response {
    requests += 1
    return HttpResponse.json({ ok: true, data: fixture() })
  }
  server.use(mockHttp.all(`${baseURL}/*`, countUnexpectedRequest))
  const invalidQueries = [
    { status: '' },
    { page: 0 },
    { pageSize: 101 },
    { contactPhone: 'private-marker' },
  ]
  for (const query of invalidQueries) {
    await expect(orderApi.list(query as ListOrdersQuery)).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      kind: 'business',
    })
  }
  for (const id of ['../1', '1?x=1', '1/arrive', 'https://evil.example', '1%2f2']) {
    await expect(orderApi.get(id)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  }
  await expect(
    orderApi.startDelivery(fixture().id, {
      version: 7,
      expectedStatus: 'delivering',
    } as unknown as StartOrderDeliveryInput),
  ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  await expect(
    orderApi.arrive(fixture().id, {
      version: 7,
      expectedStatus: 'pending',
      completedBy: 'staff',
    } as ArriveOrderInput),
  ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  await expect(
    orderApi.arrive(fixture().id, { version: -1, expectedStatus: 'pending' }),
  ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  expect(requests).toBe(0)
})

/** 中文：返回隔离交叉测试的配送身份；不向请求加鉴权头。 English: Supply the test delivery role without adding authentication headers. */
function readTestOrderRole(): OrderMockRole {
  return 'delivery'
}

/** 中文：安装真实订单 handler 和隔离测试会话。 English: Install the real order handlers with an isolated test session. */
function installOrderMock(): void {
  server.use(...createOrderHandlers(baseURL, readTestOrderRole))
}

/** 中文：用真实 API/HttpClient/默认 Mock 验证全部 15 个订单均能解析，不依赖自行简化的响应。 English: Exercises real API/HttpClient/default Mock for all 15 order snapshots without simplified responses. */
it('默认 Mock 的七种状态/两类配送/三类完成来源全部通过 API 解析', async function testAllDefaultFixtures() {
  installOrderMock()
  const fixtures = createOrderFixtures()
  const expected = new Map<string, Order>()
  for (const order of fixtures) expected.set(order.id, order)
  const page = await orderApi.list()
  expect(page.total).toBe(15)
  expect(page.items).toHaveLength(15)
  for (const item of page.items) {
    expect(await orderApi.get(item.id)).toEqual(expected.get(item.id))
    expect(item).not.toHaveProperty('contactPhone')
    expect(item.user).toEqual({
      id: expected.get(item.id)!.user.id,
      nickname: expected.get(item.id)!.user.nickname,
    })
  }
})

/** 中文：交叉验证默认 Mock 的合法状态写入返回最新可解析快照，不重算价格或伪造完成时间。 English: Verifies legal default-Mock writes return parsed current snapshots without repricing or invented completion time. */
it.each(['local', 'post'] as const)(
  '默认 Mock 的 %s 开始配送和送达可经 API 完整往返',
  async function testDefaultMockWrites(fulfillment) {
    installOrderMock()
    /** 中文：按本例履约方式匹配列表快照，返回布尔值，无副作用。 English: Matches a list snapshot against this test's fulfillment, returning a boolean without effects. */
    function matchFulfillment(order: OrderListItem): boolean {
      return order.fulfillment === fulfillment
    }
    const pending = (await orderApi.list({ status: 'pending' })).items.find(matchFulfillment)!
    const delivered = await orderApi.startDelivery(pending.id, {
      version: pending.version,
      expectedStatus: 'pending',
    })
    expect(delivered.status).toBe('delivering')
    expect(delivered.version).toBe(pending.version + 1)
    expect(delivered.actualAmountCents).toBe(pending.actualAmountCents)
    const done = await orderApi.arrive(delivered.id, {
      version: delivered.version,
      expectedStatus: 'delivering',
    })
    expect(done.status).toBe('done')
    expect(done.version).toBe(delivered.version + 1)
    expect(done.completedBy).toBe('staff')
    expect(done.completedAt).not.toBeNull()
    expect(await orderApi.get(done.id)).toEqual(done)
  },
)

/** 中文：交叉验证默认 Mock 允许待配送直接送达且版本仅增加一次。 English: Verifies the default Mock supports direct arrival from pending with one version increment. */
it('默认 Mock 的待配送可以直接送达', async function testDefaultDirectArrival() {
  installOrderMock()
  const pending = (await orderApi.list({ status: 'pending' })).items[0]!
  const done = await orderApi.arrive(pending.id, {
    version: pending.version,
    expectedStatus: 'pending',
  })
  expect(done).toMatchObject({ status: 'done', version: pending.version + 1, completedBy: 'staff' })
})
