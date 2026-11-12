// @vitest-environment node
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { delay } from 'msw'
import { http as mockHttp, HttpResponse, type HttpResponseResolver } from 'msw/http'
import { setupServer } from 'msw/node'
import { createRefundFixtures } from '@/mocks/data/refund'
import { createRefundHandlers, type RefundMockRole } from '@/mocks/handlers/refund'
import { ApiError, http } from './http'
import {
  refundApi,
  parseRefund,
  parseRefundPage,
  type Refund,
  type ListRefundsQuery,
  type ReviewRefundInput,
  type ProviderRefundStatus,
} from './refund'

/** 中文：仅替换实例测试地址，保留真实 HttpClient，不访问外部服务。 English: Replaces only the instance base URL while retaining real HttpClient and avoiding external traffic. */
vi.mock('./http', async function configureClient(importOriginal) {
  const actual = await importOriginal<typeof import('./http')>()
  return { ...actual, http: new actual.HttpClient({ baseURL: 'http://localhost:48134/api/admin' }) }
})

const baseURL = 'http://localhost:48134/api/admin'
const server = setupServer()

/** 中文：创建全虚构退款快照，返回独立对象，无输入或外部副作用。 English: Creates a fresh wholly fictional refund snapshot without input or external effects. */
function fixture(): Refund {
  return {
    id: '9000000000000000020',
    refundNo: 'MOCK-REFUND-001',
    orderId: '9000000000000000010',
    orderNo: 'MOCK-ORDER-001',
    user: { id: '9000000000000000001', nickname: '演示用户' },
    status: 'open',
    provider: null,
    providerRefundId: null,
    providerRefundStatus: null,
    reason: 'delivery_issue',
    extra: null,
    items: [
      {
        orderItemId: '9000000000000000011',
        nameZh: '示例商品快照',
        priceCents: 3900,
        qty: 1,
        amountCents: 3900,
      },
    ],
    goodsAmountCents: 3900,
    shippingRefundCents: 600,
    totalAmountCents: 4500,
    orderStatusBeforeApply: 'delivering',
    autoApproved: false,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-11-01T00:05:00Z',
    version: 7,
  }
}

/** 中文：创建成功 JSON 响应解析器，不访问真实后端。 English: Creates a successful JSON resolver without a real backend. */
function success(data: unknown): HttpResponseResolver {
  /** 中文：返回安全虚构响应，不修改输入。 English: Returns a fictional response without changing its input. */
  function resolveSuccess(): Response {
    return HttpResponse.json({ ok: true, data })
  }
  return resolveSuccess
}

/** 中文：启动隔离 Mock，未知请求报错，无外网流量。 English: Starts isolated interception and fails unknown requests without external traffic. */
function startServer(): void {
  server.listen({ onUnhandledFrame: 'error' })
}
/** 中文：清理每例拦截及合成认证，无返回值。 English: Clears per-test handlers and synthetic authentication, returning nothing. */
function resetServer(): void {
  server.resetHandlers()
  http.setAuth(null)
}
/** 中文：停止拦截并恢复网络实现，无返回值。 English: Stops interception and restores the network implementation, returning nothing. */
function stopServer(): void {
  server.close()
}

beforeAll(startServer)
afterEach(resetServer)
afterAll(stopServer)

/** 中文：验证解析产生独立快照，保留字符串 ID、金额和商品历史信息。 English: Verifies parsing copies snapshots and preserves string IDs, cents and historical item information. */
it('读取完整快照，保留大数 ID、整数分和原始商品', function testValidSnapshot() {
  const original = fixture()
  const refund = parseRefund(original)
  expect(refund).toEqual(original)
  expect(refund).not.toBe(original)
  expect(refund.items).not.toBe(original.items)
  expect(refund.user).not.toBe(original.user)
})

/** 中文：验证审核和渠道状态独立，不把 approved 映射为 succeeded 或 pending。 English: Verifies review/provider states remain independent without mapping approval into success or pending. */
it.each([null, 'pending', 'requires_action', 'succeeded', 'failed', 'canceled'] as const)(
  '保留审核同意后的渠道状态 %s',
  function testIndependentProviderStatus(providerRefundStatus) {
    const refund: Refund = { ...fixture(), status: 'approved', providerRefundStatus }
    expect(parseRefund(refund).providerRefundStatus).toBe(providerRefundStatus)
  },
)

/** 中文：通用读取允许历史审核与渠道字段独立为 null，不增设非空业务约束。 English: Allows independent historical nullable review/provider fields without inventing nonnull requirements. */
it.each([
  { status: 'approved', reviewedBy: null, reviewedAt: null },
  { status: 'rejected', reviewedBy: null, reviewedAt: null },
  { status: 'approved', reviewedBy: '历史审核员', reviewedAt: null },
  { status: 'approved', reviewedBy: null, reviewedAt: '2026-11-01T00:06:00Z' },
  { provider: 'mock', providerRefundId: 'mock-refund-001', providerRefundStatus: null },
])('保留历史 nullable：%j', function testHistoricalNullable(patch) {
  expect(parseRefund({ ...fixture(), ...patch })).toMatchObject(patch)
})

/** 中文：验证四种原因和契约允许的边界，不收紧空数组/文本、零 ID 或 Unicode 长度。 English: Verifies four reasons and schema boundaries without tightening empty values, zero IDs or Unicode lengths. */
it.each(['changed_mind', 'wrong_address', 'delivery_issue', 'other'] as const)(
  '接受原因 %s 及契约边界',
  function testReasonBoundaries(reason) {
    const refund = {
      ...fixture(),
      id: '0',
      orderId: '0001',
      reason,
      items: [],
      extra: '',
      reviewedBy: '😀'.repeat(60),
    }
    expect(parseRefund(refund)).toEqual(refund)
  },
)

const invalidPatches: Array<[string, Record<string, unknown>]> = [
  ['数字 ID', { id: 9000000000000000020 }],
  ['超长 ID', { orderId: '1'.repeat(21) }],
  ['未知审核状态', { status: 'refunding' }],
  ['未知渠道状态', { providerRefundStatus: 'approved' }],
  ['拼写混淆渠道取消', { providerRefundStatus: 'cancelled' }],
  ['未知退款原因', { reason: 'damaged' }],
  ['未知原订单状态', { orderStatusBeforeApply: 'paid' }],
  ['用户手机号', { user: { ...fixture().user, phone: 'private-marker' } }],
  ['用户邮箱', { user: { ...fixture().user, email: 'private-marker' } }],
  ['收货电话', { contactPhone: 'private-marker' }],
  ['未知投影字段', { unexpectedField: 'extra-marker' }],
  ['缺失 nullable', { extra: undefined }],
  ['负金额', { goodsAmountCents: -1 }],
  ['小数金额', { shippingRefundCents: 0.1 }],
  ['金额关系冲突', { totalAmountCents: 3900 }],
  ['不安全金额', { totalAmountCents: Number.MAX_SAFE_INTEGER + 1 }],
  ['不安全版本', { version: Number.MAX_SAFE_INTEGER + 1 }],
  ['字符串版本', { version: '7' }],
  ['负版本', { version: -1 }],
  ['非 UTC', { createdAt: '2026-11-01T00:05:00+00:00' }],
  ['不存在日期', { reviewedAt: '2026-02-30T00:00:00Z' }],
  ['非时间文本', { createdAt: '2026-11-01' }],
  ['非布尔自动审核', { autoApproved: 'false' }],
  ['过长补充说明', { extra: '字'.repeat(201) }],
  ['过长渠道标识', { provider: 'a'.repeat(33) }],
  ['过长渠道对象标识', { providerRefundId: 'a'.repeat(101) }],
  ['非数组商品', { items: null }],
  ['零商品件数', { items: [{ ...fixture().items[0], qty: 0 }] }],
  ['不安全商品件数', { items: [{ ...fixture().items[0], qty: Number.MAX_SAFE_INTEGER + 1 }] }],
  ['商品单价非整数', { items: [{ ...fixture().items[0], priceCents: 1.2 }] }],
  ['商品金额负数', { items: [{ ...fixture().items[0], amountCents: -1 }] }],
  ['商品快照额外字段', { items: [{ ...fixture().items[0], extraField: true }] }],
]

/** 中文：逐例拒绝非法响应和隐私泄露，不把原始值交给 View。 English: Rejects invalid responses and privacy leaks before raw data reaches the view. */
it.each(invalidPatches)('拒绝退款响应：%s', function testInvalidSnapshot(_label, patch) {
  /** 中文：解析一个非法快照，预期抛错，无副作用。 English: Parses one invalid snapshot, expecting an error; no effects. */
  function parseInvalidSnapshot(): Refund {
    return parseRefund({ ...fixture(), ...patch })
  }
  expect(parseInvalidSnapshot).toThrow()
})

/** 中文：验证非对象和真正缺字段被拒绝，预期抛错，无副作用。 English: Verifies nonobjects and genuinely missing fields throw, without effects. */
it('拒绝非对象及缺失必填字段', function testMissingFields() {
  const missing: Record<string, unknown> = { ...fixture() }
  delete missing.providerRefundStatus
  for (const value of [missing, null, [], 'refund']) {
    /** 中文：尝试解析非法容器，无副作用。 English: Parses an invalid container without effects. */
    function parseInvalidContainer(): Refund {
      return parseRefund(value)
    }
    expect(parseInvalidContainer).toThrow()
  }
})

/** 中文：验证分页元数据可扩展但输出白名单，空集合可正常解析。 English: Verifies extensible pagination is projected to known fields and empty collections parse successfully. */
it('解析安全分页并丢弃分页扩展', function testValidPage() {
  const page = { items: [fixture()], total: 1, page: 1, pageSize: 20 }
  expect(parseRefundPage({ ...page, nextCursor: null })).toEqual(page)
  expect(parseRefundPage({ items: [], total: 0, page: 1, pageSize: 100 })).toEqual({
    items: [],
    total: 0,
    page: 1,
    pageSize: 100,
  })
})

/** 中文：验证分页数量和列表内隐私按同一契约严格解析。 English: Verifies pagination boundaries and nested privacy follow the same contract parser. */
it.each([
  { page: 0 },
  { pageSize: 101 },
  { total: Number.MAX_SAFE_INTEGER + 1 },
  { items: [{ ...fixture(), user: { ...fixture().user, phone: 'private-marker' } }] },
])('拒绝非法分页 %j', function testInvalidPage(patch) {
  /** 中文：解析单例非法分页，预期抛错，无副作用。 English: Parses an invalid page fixture, expecting an error; no effects. */
  function parseInvalidPage(): unknown {
    return parseRefundPage({ items: [fixture()], total: 1, page: 1, pageSize: 20, ...patch })
  }
  expect(parseInvalidPage).toThrow()
})

/** 中文：验证真实 HttpClient 发送审核状态筛选和分页，保留字符串 ID。 English: Verifies real HttpClient sends review filters/pagination and preserves string IDs. */
it('列表发送 page/pageSize/审核 status，不发送渠道进度', async function testListRequest() {
  /** 中文：核对查询参数并返回安全分页，无真实后端副作用。 English: Checks query metadata and returns a safe page without real backend effects. */
  function resolveList({ request }: Parameters<HttpResponseResolver>[0]): Response {
    expect(new URL(request.url).searchParams.toString()).toBe('page=2&pageSize=10&status=approved')
    return HttpResponse.json({
      ok: true,
      data: { items: [fixture()], total: 11, page: 2, pageSize: 10 },
    })
  }
  server.use(mockHttp.get(`${baseURL}/refunds`, resolveList))
  await expect(
    refundApi.list({ page: 2, pageSize: 10, status: 'approved' }, new AbortController().signal),
  ).resolves.toMatchObject({ total: 11 })
})

/** 中文：验证默认查询不把全部筛选编码成空状态。 English: Verifies the default list does not encode the all filter as an empty status. */
it('默认列表不发送查询', async function testDefaultListRequest() {
  /** 中文：核对无查询并返回空页，无写入。 English: Checks an empty query and returns an empty page without writes. */
  function resolveDefaultList({ request }: Parameters<HttpResponseResolver>[0]): Response {
    expect(new URL(request.url).search).toBe('')
    return HttpResponse.json({ ok: true, data: { items: [], total: 0, page: 1, pageSize: 20 } })
  }
  server.use(mockHttp.get(`${baseURL}/refunds`, resolveDefaultList))
  await expect(refundApi.list()).resolves.toMatchObject({ total: 0 })
})

/** 中文：验证路径 ID 保留前导零且响应目标必须匹配。 English: Verifies path IDs preserve leading zeroes and response identity matches. */
it('按字符串 ID 获取退款详情', async function testDetailRequest() {
  const refund = { ...fixture(), id: '00000000000000000020' }
  server.use(mockHttp.get(`${baseURL}/refunds/${refund.id}`, success(refund)))
  await expect(refundApi.get(refund.id)).resolves.toEqual(refund)
})

/** 中文：验证批准只提交版本和 open，合法渠道状态和 nullable 审核元数据原样保留。 English: Verifies approval sends only version/open and preserves legal provider states and nullable review metadata. */
it.each([null, 'pending', 'requires_action', 'succeeded', 'failed', 'canceled'] as const)(
  '审核同意响应可为渠道 %s',
  async function testApproveRequest(providerRefundStatus: ProviderRefundStatus | null) {
    /** 中文：核对批准输入并返回审核同意快照，不模拟到账副作用。 English: Checks approval input and returns an approved snapshot without payout effects. */
    async function resolveApproval({
      request,
    }: Parameters<HttpResponseResolver>[0]): Promise<Response> {
      expect(await request.json()).toEqual({ version: 7, expectedStatus: 'open' })
      return HttpResponse.json({
        ok: true,
        data: { ...fixture(), status: 'approved', version: 8, providerRefundStatus },
      })
    }
    server.use(mockHttp.post(`${baseURL}/refunds/${fixture().id}/approve`, resolveApproval))
    await expect(
      refundApi.approve(fixture().id, { version: 7, expectedStatus: 'open' }),
    ).resolves.toMatchObject({
      status: 'approved',
      version: 8,
      providerRefundStatus,
      reviewedBy: null,
      reviewedAt: null,
    })
  },
)

/** 中文：验证拒绝只提交版本和 open，不增加拒绝原因字段，读取服务端审核元数据。 English: Verifies rejection sends only version/open without a rejection-reason field and reads server audit metadata. */
it('拒绝审核返回服务端审核人和 UTC 时间', async function testRejectRequest() {
  /** 中文：核对拒绝输入并返回安全审核快照，不真实退款。 English: Checks rejection input and returns a safe review snapshot without a real refund. */
  async function resolveRejection({
    request,
  }: Parameters<HttpResponseResolver>[0]): Promise<Response> {
    expect(await request.json()).toEqual({ version: 7, expectedStatus: 'open' })
    return HttpResponse.json({
      ok: true,
      data: {
        ...fixture(),
        status: 'rejected',
        version: 8,
        reviewedBy: 'mock-admin',
        reviewedAt: '2026-11-01T00:06:00Z',
      },
    })
  }
  server.use(mockHttp.post(`${baseURL}/refunds/${fixture().id}/reject`, resolveRejection))
  await expect(
    refundApi.reject(fixture().id, { version: 7, expectedStatus: 'open' }),
  ).resolves.toMatchObject({ status: 'rejected', version: 8, reviewedBy: 'mock-admin' })
})

/** 中文：验证写后 ID、审核状态及版本正确，异常响应归一为 protocol。 English: Verifies post-write identity, review state and version, normalizing mismatches as protocol errors. */
it.each([{ id: '9' }, { status: 'open' }, { version: 7 }, { version: 9 }, { totalAmountCents: 1 }])(
  '拒绝批准响应不一致：%j',
  async function testInvalidApprovalResponse(patch) {
    server.use(
      mockHttp.post(
        `${baseURL}/refunds/${fixture().id}/approve`,
        success({ ...fixture(), status: 'approved', version: 8, ...patch }),
      ),
    )
    await expect(
      refundApi.approve(fixture().id, { version: 7, expectedStatus: 'open' }),
    ).rejects.toMatchObject({ kind: 'protocol', status: 200 })
  },
)

/** 中文：仅即时拒绝操作要求非空审核人/时间，历史通用详情仍可为空。 English: Requires nonnull audit metadata only for immediate rejection, while historical reads remain nullable. */
it.each([{ reviewedBy: null }, { reviewedAt: null }, { reviewedAt: undefined }])(
  '拒绝即时审核元数据缺失 %j',
  async function testMissingRejectionAudit(patch) {
    server.use(
      mockHttp.post(
        `${baseURL}/refunds/${fixture().id}/reject`,
        success({
          ...fixture(),
          status: 'rejected',
          version: 8,
          reviewedBy: 'mock-admin',
          reviewedAt: '2026-11-01T00:06:00Z',
          ...patch,
        }),
      ),
    )
    await expect(
      refundApi.reject(fixture().id, { version: 7, expectedStatus: 'open' }),
    ).rejects.toMatchObject({ kind: 'protocol', status: 200 })
  },
)

/** 中文：验证 403、409 和渠道失败仍保持独立业务错误，不重试写操作。 English: Verifies permission/conflict/provider failures remain business errors without write retries. */
it.each([
  [403, 'FORBIDDEN'],
  [409, 'VERSION_CONFLICT'],
  [409, 'INVALID_STATUS'],
  [409, 'REFUND_PAYOUT_FAILED'],
] as const)('保留错误 %s/%s', async function testBusinessError(status, code) {
  let writes = 0
  /** 中文：记录单次写请求并返回安全错误，无订单资料。 English: Counts one write and returns a safe error without order data. */
  function resolveFailure(): Response {
    writes += 1
    return HttpResponse.json({ ok: false, code, message: '测试安全错误' }, { status })
  }
  server.use(mockHttp.post(`${baseURL}/refunds/${fixture().id}/approve`, resolveFailure))
  await expect(
    refundApi.approve(fixture().id, { version: 7, expectedStatus: 'open' }),
  ).rejects.toMatchObject({ kind: 'business', code, status })
  expect(writes).toBe(1)
})

/** 中文：验证详情错误和解析失败归一化，原始 data 不被错误返回。 English: Verifies detail errors and parse failures are normalized without returning raw data. */
it('拒绝错位详情响应且不泄露 403 附带 data', async function testDetailFailures() {
  server.use(mockHttp.get(`${baseURL}/refunds/${fixture().id}`, success({ ...fixture(), id: '9' })))
  await expect(refundApi.get(fixture().id)).rejects.toMatchObject({ kind: 'protocol' })
  /** 中文：模拟错误附带 data，HTTP 失败不得返回成功数据。 English: Returns data inside an error envelope, which must never become successful data. */
  function resolveForbidden(): Response {
    return HttpResponse.json(
      { ok: false, code: 'FORBIDDEN', message: '无权限', data: fixture() },
      { status: 403 },
    )
  }
  server.use(mockHttp.get(`${baseURL}/refunds/${fixture().id}`, resolveForbidden))
  await expect(refundApi.get(fixture().id)).rejects.toMatchObject({
    kind: 'business',
    code: 'FORBIDDEN',
  })
})

/** 中文：验证取消信号经过每个 API 方法，保留 canceled，不推断写入结果。 English: Verifies cancellation flows through each API method and remains canceled without inferring a write outcome. */
it.each(['list', 'get', 'approve', 'reject'] as const)(
  '取消 %s 请求',
  async function testCancellation(method) {
    /** 中文：延迟安全响应供取消检查，不访问外网。 English: Delays a safe response for cancellation tests without external traffic. */
    async function resolveSlowResponse(): Promise<Response> {
      await delay(100)
      return HttpResponse.json({ ok: true, data: fixture() })
    }
    server.use(mockHttp.all(`${baseURL}/*`, resolveSlowResponse))
    const controller = new AbortController()
    let request: Promise<unknown>
    if (method === 'list') request = refundApi.list(undefined, controller.signal)
    else if (method === 'get') request = refundApi.get(fixture().id, controller.signal)
    else
      request = refundApi[method](
        fixture().id,
        { version: 7, expectedStatus: 'open' },
        controller.signal,
      )
    controller.abort()
    await expect(request).rejects.toMatchObject({ kind: 'canceled', code: null })
  },
)

/** 中文：非法 ID、筛选、写字段在发网前失败，避免提交金额、数量、操作者或拒绝原因。 English: Rejects invalid IDs, filters and mutation fields before dispatch, preventing amounts, quantities, actors or rejection reasons in commands. */
it('非法输入转统一参数错误且不发送请求', async function testInvalidInput() {
  let requests = 0
  /** 中文：记录不应发生的请求并返回安全响应，无真实写入。 English: Counts forbidden dispatches and returns safe data without real writes. */
  function countUnexpectedRequest(): Response {
    requests += 1
    return HttpResponse.json({ ok: true, data: fixture() })
  }
  server.use(mockHttp.all(`${baseURL}/*`, countUnexpectedRequest))
  for (const id of ['../1', '1/approve', '1?x=1', '1%2F2', 'https://example.invalid']) {
    await expect(refundApi.get(id)).rejects.toBeInstanceOf(ApiError)
  }
  for (const query of [
    { status: '' },
    { status: 'pending' },
    { page: 0 },
    { pageSize: 101 },
    { providerRefundStatus: 'pending' },
  ]) {
    await expect(refundApi.list(query as ListRefundsQuery)).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      kind: 'business',
    })
  }
  for (const patch of [
    { totalAmountCents: 1 },
    { qty: 1 },
    { reviewedBy: 'pretend' },
    { reason: 'other' },
    { expectedStatus: 'approved' },
    { version: -1 },
  ]) {
    const body = { version: 7, expectedStatus: 'open', ...patch } as ReviewRefundInput
    await expect(refundApi.approve(fixture().id, body)).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    })
    await expect(refundApi.reject(fixture().id, body)).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    })
  }
  expect(requests).toBe(0)
})

/** 中文：提供隔离测试的退款审核身份，不向请求添加鉴权头。 English: Supply the isolated test reviewer without adding an authentication header. */
function readTestRefundRole(): RefundMockRole {
  return 'reviewer'
}

/** 中文：安装退款 handler 和隔离测试会话。 English: Install the refund handlers with an isolated test session. */
function installRefundMock(): void {
  server.use(...createRefundHandlers(baseURL, readTestRefundRole))
}

/** 中文：通过真实 API/HttpClient 解析全部默认退款 Mock，覆盖审核、渠道、空值和自动同意。 English: Parses every default refund Mock through real API/HttpClient, covering reviews, provider states, nulls and automatic approval. */
it('默认十二条 Mock 全部通过列表及逐条详情解析', async function testAllDefaultFixtures() {
  installRefundMock()
  const expected = new Map<string, Refund>()
  for (const refund of createRefundFixtures()) expected.set(refund.id, refund)
  const page = await refundApi.list()
  expect(page.total).toBe(12)
  expect(page.items).toHaveLength(12)
  for (const refund of page.items) {
    expect(refund).toEqual(expected.get(refund.id))
    expect(await refundApi.get(refund.id)).toEqual(expected.get(refund.id))
    expect(refund.user).not.toHaveProperty('phone')
  }
})

/** 中文：交叉验证默认 Mock 批准返回独立渠道快照，版本递增且不改变退款金额。 English: Verifies default-Mock approval returns independent provider state with an incremented version and unchanged refund amounts. */
it('默认 Mock 批准可完整往返，审核同意与渠道进度独立', async function testDefaultApproval() {
  installRefundMock()
  const open = (await refundApi.list({ status: 'open' })).items[0]!
  const approved = await refundApi.approve(open.id, {
    version: open.version,
    expectedStatus: 'open',
  })
  expect(approved).toMatchObject({
    id: open.id,
    status: 'approved',
    version: open.version + 1,
    totalAmountCents: open.totalAmountCents,
  })
  expect(approved.providerRefundStatus).toBe('pending')
  expect(await refundApi.get(approved.id)).toEqual(approved)
})

/** 中文：交叉验证整单申请拒绝返回服务端审核记录；API不自行推断当前订单状态。 English: Verifies rejection of a whole claim returns server audit records without the API inferring current order state. */
it('默认 Mock 拒绝可完整往返并解析审核元数据', async function testDefaultRejection() {
  installRefundMock()
  /** 中文：匹配保存原订单状态的整单申请，返回布尔值，无副作用。 English: Matches a whole claim with its original order state, returning a boolean without effects. */
  function isWholeClaim(refund: Refund): boolean {
    return refund.orderStatusBeforeApply !== null
  }
  const open = (await refundApi.list({ status: 'open' })).items.find(isWholeClaim)!
  const rejected = await refundApi.reject(open.id, {
    version: open.version,
    expectedStatus: 'open',
  })
  expect(rejected).toMatchObject({
    id: open.id,
    status: 'rejected',
    version: open.version + 1,
    totalAmountCents: open.totalAmountCents,
  })
  expect(rejected.reviewedBy).not.toBeNull()
  expect(rejected.reviewedAt).not.toBeNull()
  expect(rejected.providerRefundId).toBeNull()
  expect(rejected.providerRefundStatus).toBeNull()
  expect(await refundApi.get(rejected.id)).toEqual(rejected)
})
