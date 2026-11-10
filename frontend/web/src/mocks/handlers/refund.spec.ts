// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import type { components } from '@/api/generated/admin'
import {
  createRefundFixtures,
  createRefundOrderFixtures,
  type RefundMockOrder,
} from '@/mocks/data/refund'
import { createRefundMock, REFUND_MOCK_TOKENS, type RefundProviderResult } from './refund'

type Refund = components['schemas']['Refund']
const baseURL = 'http://localhost:48134/api/admin'
const server = setupServer()
const fixtures = createRefundFixtures()
let mock: ReturnType<typeof createRefundMock>

/** 中文：开启严格网络拦截，不允许真实流量。 English: Start strict interception without real traffic. */
function startServer(): void {
  server.listen({ onUnhandledFrame: 'error' })
}
/** 中文：每例创建独立账本与拦截，防止测试互相影响。 English: Install isolated ledgers and handlers before each test. */
function resetFixtures(): void {
  mock = createRefundMock({ baseURL })
  server.resetHandlers(...mock.handlers)
}
/** 中文：移除本例拦截，无输入。 English: Remove per-test handlers without input. */
function resetServer(): void {
  server.resetHandlers()
}
/** 中文：关闭拦截，恢复网络实现。 English: Close interception and restore the network implementation. */
function stopServer(): void {
  server.close()
}
beforeAll(startServer)
beforeEach(resetFixtures)
afterEach(resetServer)
afterAll(stopServer)

/** 中文：读取独立fixture副本，缺失序号抛错。 English: Return a fixture copy or throw for a missing index. */
function fixture(index = 0): Refund {
  const refund = fixtures[index]
  if (!refund) throw new Error('missing-refund-fixture')
  return structuredClone(refund)
}

/** 中文：安装同订单自定义故障场景，深拷贝由工厂负责。 English: Install custom same-order failure scenarios, cloned by the factory. */
function scenario(refunds: Refund[], order?: RefundMockOrder): void {
  const first = refunds[0]
  if (!first) throw new Error('missing-refund-fixture')
  const ledger = order ?? createRefundOrderFixtures([first])[0]
  if (!ledger) throw new Error('missing-order-fixture')
  mock = createRefundMock({ baseURL, refunds, orders: [ledger] })
  server.resetHandlers(...mock.handlers)
}

/** 中文：复制另一条同订单申请，输入覆盖项只作用于测试数据。 English: Copy a related same-order claim using test-only overrides. */
function related(refund: Refund, overrides: Partial<Refund> = {}): Refund {
  return {
    ...structuredClone(refund),
    id: '9500000000000000099',
    refundNo: 'MOCK-REFUND-RELATED',
    ...overrides,
  }
}

/** 中文：发送合成身份的拦截请求，有body时使用POST，无真实后端。 English: Send intercepted synthetic-auth GET/POST requests without a backend. */
function request(
  path: string,
  token: string | null = REFUND_MOCK_TOKENS.reviewer,
  body?: unknown,
): Promise<Response> {
  const headers = new Headers()
  if (token !== null) headers.set('Authorization', `Bearer ${token}`)
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  return fetch(`${baseURL}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

/** 中文：提交当前读到的待审版本，返回响应，不重试。 English: Submit the read open version once and return the response. */
function review(refund: Refund, action: 'approve' | 'reject', token?: string): Promise<Response> {
  return request(`/refunds/${refund.id}/${action}`, token, {
    version: refund.version,
    expectedStatus: 'open',
  })
}

/** 中文：读取成功响应的退款详情，验证封装状态。 English: Read a refund from a verified successful response envelope. */
async function readRefund(response: Response): Promise<Refund> {
  expect(response.status).toBe(200)
  const body = (await response.json()) as { ok: true; data: Refund }
  expect(body.ok).toBe(true)
  return body.data
}

/** 中文：验证安全错误且无私人资料/成功data。 English: Assert safe errors contain neither private information nor successful data. */
async function assertError(response: Response, status: number, code: string): Promise<void> {
  expect(response.status).toBe(status)
  const body: unknown = await response.json()
  expect(body).toMatchObject({ ok: false, code, message: expect.any(String) })
  expect(body).not.toHaveProperty('data')
  expect(JSON.stringify(body)).not.toContain('contactPhone')
}

/** 中文：从审核结果创建可靠成功事件，不连接支付服务。 English: Create a reliably confirmed success event without payment traffic. */
function success(refund: Refund): RefundProviderResult {
  if (!refund.providerRefundId) throw new Error('missing-mock-provider-id')
  return { providerRefundId: refund.providerRefundId, status: 'succeeded', confirmedTerminal: true }
}

/** 中文：核验审核/渠道/原因/空值覆盖，默认订单互不超占且不含收货资料。 English: Verify independent fixture coverage and absence of recipient data. */
it('覆盖审核三态、渠道五态与两种null语义，快照金额自洽', function testFixtureCoverage() {
  const reviews = new Set<string>()
  const providerStatuses = new Set<string>()
  const reasons = new Set<string>()
  const orders = new Set<string>()
  let uninitiated = false
  let unknown = false
  let automatic = false
  let shipping = false
  for (const refund of fixtures) {
    reviews.add(refund.status)
    if (refund.providerRefundStatus) providerStatuses.add(refund.providerRefundStatus)
    reasons.add(refund.reason)
    orders.add(refund.orderId)
    uninitiated ||= refund.providerRefundId === null && refund.providerRefundStatus === null
    unknown ||= refund.providerRefundId !== null && refund.providerRefundStatus === null
    automatic ||= refund.autoApproved && refund.status === 'approved'
    shipping ||= refund.shippingRefundCents > 0
    expect(Object.keys(refund.user).sort()).toEqual(['id', 'nickname'])
    expect(refund.totalAmountCents).toBe(refund.goodsAmountCents + refund.shippingRefundCents)
    for (const item of refund.items) expect(item.amountCents).toBe(item.qty * item.priceCents)
    expect([null, 'mock']).toContain(refund.provider)
    expect(JSON.stringify(refund)).not.toMatch(/contactPhone|contactName|postcode|@/)
  }
  expect(reviews).toEqual(new Set(['open', 'approved', 'rejected']))
  expect(providerStatuses).toEqual(
    new Set(['pending', 'requires_action', 'succeeded', 'failed', 'canceled']),
  )
  expect(reasons.size).toBe(4)
  expect(orders.size).toBe(fixtures.length)
  expect([uninitiated, unknown, automatic, shipping]).toEqual([true, true, true, true])
  const copies = createRefundFixtures()
  const first = copies[0]
  if (!first) throw new Error('missing-refund-fixture')
  first.user.nickname = 'changed'
  expect(fixtures[0]?.user.nickname).not.toBe('changed')
})

/** 中文：列表分页及审核筛选遵循契约，不用渠道状态筛审核。 English: Follow contract pagination and review filtering, not provider status filtering. */
it('列表默认分页、详情和审核筛选均保留公开快照', async function testReads() {
  const response = await request('/refunds', REFUND_MOCK_TOKENS.readonly)
  expect(response.status).toBe(200)
  const body = (await response.json()) as { data: components['schemas']['RefundPage'] }
  expect(body.data).toMatchObject({ page: 1, pageSize: 20, total: fixtures.length })
  expect(body.data.items).toEqual(fixtures)
  for (const status of ['open', 'approved', 'rejected']) {
    const filtered = (await (await request(`/refunds?status=${status}`)).json()) as {
      data: components['schemas']['RefundPage']
    }
    expect(filtered.data.items.length).toBeGreaterThan(0)
    for (const refund of filtered.data.items) expect(refund.status).toBe(status)
  }
  const page = (await (await request('/refunds?page=2&pageSize=3')).json()) as {
    data: components['schemas']['RefundPage']
  }
  expect(page.data.items[0]?.id).toBe(fixtures[3]?.id)
  const empty = (await (await request('/refunds?page=100&pageSize=100')).json()) as {
    data: components['schemas']['RefundPage']
  }
  expect(empty.data.items).toEqual([])
  expect(await readRefund(await request(`/refunds/${fixture(7).id}`))).toEqual(fixture(7))
})

/** 中文：非法或重复查询在列表和详情被拒绝，不写入。 English: Reject invalid/duplicate queries without mutations. */
it.each([
  'page=0',
  'page=-1',
  'page=1.2',
  'page=',
  'page=9007199254740992',
  'pageSize=0',
  'pageSize=101',
  'pageSize=abc',
  'status=',
  'status=pending',
  'status=open&status=approved',
  'page=1&page=2',
  'providerRefundStatus=pending',
  'unknown=1',
])('拒绝非法列表查询 %s', async function testInvalidQuery(query) {
  await assertError(await request(`/refunds?${query}`), 400, 'VALIDATION_FAILED')
})

/** 中文：无认证/顾客/未知token均不能读取或审核，错误不改变快照。 English: Missing/customer/unknown tokens cannot read or review and never alter snapshots. */
it.each([null, 'customer-token', 'arbitrary-token', 'expired-token'])(
  '拒绝无效认证 %s',
  async function testAuthentication(token) {
    const refund = fixture()
    await assertError(await request('/refunds', token), 401, 'NEED_LOGIN')
    await assertError(await request(`/refunds/${refund.id}`, token), 401, 'NEED_LOGIN')
    for (const action of ['approve', 'reject'])
      await assertError(
        await request(`/refunds/${refund.id}/${action}`, token, {
          version: 0,
          expectedStatus: 'open',
        }),
        401,
        'NEED_LOGIN',
      )
    expect(mock.inspectRefund(refund.id)).toEqual(refund)
  },
)

/** 中文：只读管理员不可审核，已认证无权限角色也不可读取，所有权限检查在写前。 English: Enforce readonly and denied-role permissions before any write. */
it('403不修改审核、渠道或订单账本', async function testPermissions() {
  const refund = fixture()
  const order = mock.inspectOrder(refund.orderId)
  for (const action of ['approve', 'reject'] as const)
    await assertError(await review(refund, action, REFUND_MOCK_TOKENS.readonly), 403, 'FORBIDDEN')
  await assertError(await request('/refunds', REFUND_MOCK_TOKENS.denied), 403, 'FORBIDDEN')
  await assertError(
    await request(`/refunds/${refund.id}`, REFUND_MOCK_TOKENS.denied),
    403,
    'FORBIDDEN',
  )
  expect(mock.inspectRefund(refund.id)).toEqual(refund)
  expect(mock.inspectOrder(refund.orderId)).toEqual(order)
})

/** 中文：资源ID与额外查询验证失败时无数据修改，未知资源404。 English: Validate IDs/queries without mutation and return 404 for unknown resources. */
it('验证资源ID、未知查询和404', async function testResources() {
  for (const id of ['abc', '-1', '1'.repeat(21), '%20'])
    await assertError(await request(`/refunds/${id}`), 400, 'VALIDATION_FAILED')
  await assertError(await request(`/refunds/${fixture().id}?full=true`), 400, 'VALIDATION_FAILED')
  await assertError(await request('/refunds/999'), 404, 'NOT_FOUND')
  await assertError(
    await request('/refunds/999/approve', undefined, { version: 0, expectedStatus: 'open' }),
    404,
    'NOT_FOUND',
  )
  await assertError(
    await request('/refunds/abc/reject', undefined, { version: 0, expectedStatus: 'open' }),
    400,
    'VALIDATION_FAILED',
  )
})

/** 中文：审核同意只是approved/pending，不增加已退件数/运费/库存，完整记录审核人时间版本。 English: Approval records review metadata and pending progress without settling goods, shipping or inventory. */
it('同意仅变为approved/pending，重复请求返回冲突', async function testApproval() {
  const refund = fixture()
  const order = mock.inspectOrder(refund.orderId)
  const before = Date.now()
  const approved = await readRefund(await review(refund, 'approve'))
  expect(approved).toMatchObject({
    status: 'approved',
    provider: 'mock',
    providerRefundStatus: 'pending',
    reviewedBy: 'mock-refund-admin',
    version: 1,
  })
  expect(approved.providerRefundId).toBeTruthy()
  expect(Date.parse(approved.reviewedAt ?? '')).toBeGreaterThanOrEqual(before)
  expect(approved.reviewedAt).toMatch(/Z$/)
  expect(mock.inspectOrder(refund.orderId)).toEqual(order)
  await assertError(await review(refund, 'approve'), 409, 'VERSION_CONFLICT')
  await assertError(await review(approved, 'approve'), 409, 'INVALID_STATUS')
  await assertError(await review(approved, 'reject'), 409, 'INVALID_STATUS')
  expect(mock.inspectRefund(refund.id)).toEqual(approved)
})

/** 中文：拒绝整单恢复保存的履约状态，拒绝部分不改变履约，均不伪造渠道退款。 English: Whole-claim rejection restores fulfillment; partial rejection preserves it and never fabricates payouts. */
it.each([0, 1])('拒绝申请%d按整单/部分恢复规则处理', async function testRejection(index) {
  const refund = fixture(index)
  const order = mock.inspectOrder(refund.orderId)
  const rejected = await readRefund(await review(refund, 'reject'))
  expect(rejected).toMatchObject({
    status: 'rejected',
    version: 1,
    providerRefundId: null,
    providerRefundStatus: null,
    reviewedBy: 'mock-refund-admin',
  })
  expect(rejected.reviewedAt).toMatch(/Z$/)
  expect(mock.inspectOrder(refund.orderId)).toEqual(
    index === 1 ? { ...order, status: 'delivering' } : order,
  )
  await assertError(await review(rejected, 'reject'), 409, 'INVALID_STATUS')
})

/** 中文：自动同意及已审核申请不提供再次审核，原始数据保持。 English: Already reviewed/automatic claims reject repeated review without changing data. */
it.each([2, 3, 4, 5, 6, 7, 8, 9, 10, 11])(
  '拒绝再次审核fixture%d',
  async function testReviewedState(index) {
    const refund = fixture(index)
    for (const action of ['approve', 'reject'] as const)
      await assertError(await review(refund, action), 409, 'INVALID_STATUS')
    expect(mock.inspectRefund(refund.id)).toEqual(refund)
  },
)

/** 中文：精确审核体拒绝金额/审核人/数量及非法版本，不留下部分更新。 English: Exact review bodies reject financial/actor/quantity fields and invalid versions atomically. */
it.each([
  {},
  null,
  [],
  { version: 0 },
  { expectedStatus: 'open' },
  { version: -1, expectedStatus: 'open' },
  { version: 0.5, expectedStatus: 'open' },
  { version: '0', expectedStatus: 'open' },
  { version: 9007199254740992, expectedStatus: 'open' },
  { version: 0, expectedStatus: 'approved' },
  { version: 0, expectedStatus: 'open', amountCents: 1 },
  { version: 0, expectedStatus: 'open', reviewedBy: 'forged' },
  { version: 0, expectedStatus: 'open', qty: 99 },
])('拒绝非法审核体%j', async function testInvalidBody(body) {
  const refund = fixture()
  const order = mock.inspectOrder(refund.orderId)
  for (const action of ['approve', 'reject'])
    await assertError(
      await request(`/refunds/${refund.id}/${action}`, undefined, body),
      400,
      'VALIDATION_FAILED',
    )
  expect(mock.inspectRefund(refund.id)).toEqual(refund)
  expect(mock.inspectOrder(refund.orderId)).toEqual(order)
})

/** 中文：损坏JSON、错误类型或额外查询不产生审核副作用。 English: Malformed JSON/media types/queries do not cause review side effects. */
it('拒绝损坏传输和额外查询，过期版本不写入', async function testMalformedTransport() {
  const refund = fixture()
  const headers = {
    Authorization: `Bearer ${REFUND_MOCK_TOKENS.reviewer}`,
    'Content-Type': 'application/json',
  }
  await assertError(
    await fetch(`${baseURL}/refunds/${refund.id}/approve`, { method: 'POST', headers, body: '{' }),
    400,
    'VALIDATION_FAILED',
  )
  await assertError(
    await fetch(`${baseURL}/refunds/${refund.id}/approve`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json-invalid' },
      body: '{}',
    }),
    400,
    'VALIDATION_FAILED',
  )
  await assertError(
    await request(`/refunds/${refund.id}/approve?force=true`, undefined, {
      version: 0,
      expectedStatus: 'open',
    }),
    400,
    'VALIDATION_FAILED',
  )
  for (const action of ['approve', 'reject'])
    await assertError(
      await request(`/refunds/${refund.id}/${action}`, undefined, {
        version: 99,
        expectedStatus: 'open',
      }),
      409,
      'VERSION_CONFLICT',
    )
  expect(mock.inspectRefund(refund.id)).toEqual(refund)
})

/** 中文：同一版本并发审核只有一次成功，另一请求冲突，不重复创建渠道对象。 English: Concurrent reviews of one version succeed once without duplicate provider creation. */
it('并发相同version审核只成功一次', async function testConcurrentReviews() {
  const refund = fixture()
  const responses = await Promise.all([review(refund, 'approve'), review(refund, 'reject')])
  const statuses: number[] = []
  for (const response of responses) {
    statuses.push(response.status)
    if (response.status === 409) await assertError(response, 409, 'VERSION_CONFLICT')
  }
  expect(statuses.sort()).toEqual([200, 409])
  expect(mock.inspectRefund(refund.id)?.version).toBe(1)
})

/** 中文：处理中/待操作/未知不入账，可靠部分成功仅入账一次并保持履约和库存。 English: Pending/action/unknown results never settle; reliable partial success books once and preserves fulfillment/inventory. */
it('动态渠道成功幂等增加部分已退量，旧事件不能回退终态', async function testPartialSettlement() {
  const refund = fixture()
  const order = mock.inspectOrder(refund.orderId)
  const approved = await readRefund(await review(refund, 'approve'))
  const event = success(approved)
  for (const status of ['pending', 'requires_action', null] as const) {
    expect(mock.applyProviderResult({ ...event, status })).toEqual({ ok: true, applied: true })
    expect(mock.inspectOrder(refund.orderId)).toEqual(order)
  }
  expect(mock.applyProviderResult({ ...event, confirmedTerminal: false })).toEqual({
    ok: false,
    code: 'VALIDATION_FAILED',
  })
  expect(mock.inspectOrder(refund.orderId)).toEqual(order)
  expect(mock.applyProviderResult(event)).toEqual({ ok: true, applied: true })
  const settled = mock.inspectOrder(refund.orderId)
  expect(settled).toMatchObject({
    status: 'delivering',
    shippingRefundedCents: 0,
    inventoryOnHand: 100,
  })
  expect(settled?.items[0]?.refundedQty).toBe(1)
  expect(mock.inspectRefund(refund.id)).toMatchObject({
    status: 'approved',
    providerRefundStatus: 'succeeded',
  })
  expect(mock.applyProviderResult(event)).toEqual({ ok: true, applied: false })
  expect(mock.applyProviderResult({ ...event, status: 'pending' })).toEqual({
    ok: false,
    code: 'INVALID_STATUS',
  })
  expect(mock.applyProviderResult({ ...event, status: 'failed' })).toEqual({
    ok: false,
    code: 'INVALID_STATUS',
  })
  expect(mock.inspectOrder(refund.orderId)).toEqual(settled)
  expect(mock.inspectRefund(refund.id)?.providerRefundStatus).toBe('succeeded')
})

/** 中文：多申请按渠道标识分次入账，只有全部商品可靠成功才改已退款。 English: Settle separate provider IDs incrementally and mark refunded only after every unit succeeds. */
it('两次部分退款均成功后才将整单置为refunded', async function testAllGoodsSettlement() {
  const first = fixture()
  const second = related(first)
  scenario([first, second])
  const approvedFirst = await readRefund(await review(first, 'approve'))
  const approvedSecond = await readRefund(await review(second, 'approve'))
  expect(mock.applyProviderResult(success(approvedFirst))).toEqual({ ok: true, applied: true })
  expect(mock.inspectOrder(first.orderId)?.status).toBe('delivering')
  expect(mock.applyProviderResult(success(approvedSecond))).toEqual({ ok: true, applied: true })
  expect(mock.inspectOrder(first.orderId)).toMatchObject({
    status: 'refunded',
    inventoryOnHand: 100,
  })
  expect(mock.inspectOrder(first.orderId)?.items[0]?.refundedQty).toBe(2)
})

/** 中文：整单申请可退快照运费，渠道成功前不记账，重复成功不二次退费。 English: Settle whole-order snapshot shipping only on reliable success and never twice. */
it('整单可靠成功同时入账商品和快照运费，不回库存', async function testShippingSettlement() {
  const refund = fixture(1)
  const approved = await readRefund(await review(refund, 'approve'))
  expect(mock.inspectOrder(refund.orderId)).toMatchObject({
    status: 'refunding',
    shippingRefundedCents: 0,
    inventoryOnHand: 100,
  })
  expect(mock.applyProviderResult(success(approved))).toEqual({ ok: true, applied: true })
  const settled = mock.inspectOrder(refund.orderId)
  expect(settled).toMatchObject({
    status: 'refunded',
    shippingRefundedCents: 600,
    inventoryOnHand: 100,
  })
  expect(mock.applyProviderResult(success(approved))).toEqual({ ok: true, applied: false })
  expect(mock.inspectOrder(refund.orderId)).toEqual(settled)
})

/** 中文：SKU A已全部退款时，剩余SKU B可独立退运费；同类整单拒绝仍恢复原履约。 English: After SKU A is fully refunded, remaining SKU B can refund shipping or restore fulfillment when rejected. */
it.each(['approve', 'reject'] as const)(
  '已退完的SKU不阻止剩余整单%s及运费处理',
  async function testRemainingSku(action) {
    const refund = fixture(1)
    const order = createRefundOrderFixtures([refund])[0]
    if (!order?.items[0]) throw new Error('missing-order-fixture')
    order.items[0].refundedQty = order.items[0].qty
    const secondId = '9500000000000000299'
    order.items.push({ id: secondId, qty: 1, refundedQty: 0, priceCents: 3900 })
    refund.items = [
      {
        orderItemId: secondId,
        nameZh: '剩余SKU B快照',
        priceCents: 3900,
        qty: 1,
        amountCents: 3900,
      },
    ]
    refund.goodsAmountCents = 3900
    refund.totalAmountCents = 4500
    scenario([refund], order)
    const reviewed = await readRefund(await review(refund, action))
    if (action === 'approve') {
      expect(mock.applyProviderResult(success(reviewed))).toEqual({ ok: true, applied: true })
      expect(mock.inspectOrder(refund.orderId)).toMatchObject({
        status: 'refunded',
        shippingRefundedCents: 600,
        inventoryOnHand: 100,
      })
      expect(mock.inspectOrder(refund.orderId)?.items[1]?.refundedQty).toBe(1)
    } else {
      expect(mock.inspectOrder(refund.orderId)).toEqual({ ...order, status: 'delivering' })
    }
  },
)

/** 中文：待审/渠道未终结均占用额度，超占时发起和结算原子拒绝，不留下审核或账本更新。 English: Open/unresolved claims reserve capacity; overclaims reject initiation and settlement atomically. */
it.each(['open', 'pending', 'requires_action', 'unknown', 'uninitiated'] as const)(
  '未终结的%s申请继续占用商品额度',
  async function testReservations(state) {
    const first = fixture()
    const second = related(first, {
      status: state === 'open' ? 'open' : 'approved',
      provider: state === 'open' || state === 'uninitiated' ? null : 'mock',
      providerRefundId:
        state === 'open' || state === 'uninitiated' ? null : 'mock-related-provider',
      providerRefundStatus: state === 'pending' || state === 'requires_action' ? state : null,
    })
    const order = createRefundOrderFixtures([first])[0]
    if (!order?.items[0]) throw new Error('missing-order-fixture')
    order.items[0].refundedQty = 1
    scenario([first, second], order)
    await assertError(await review(first, 'approve'), 409, 'INVALID_STATUS')
    expect(mock.inspectRefund(first.id)).toEqual(first)
    expect(mock.inspectOrder(first.orderId)).toEqual(order)
    if (second.providerRefundId) {
      expect(mock.applyProviderResult(success(second))).toEqual({
        ok: false,
        code: 'INVALID_STATUS',
      })
      expect(mock.inspectRefund(second.id)).toEqual(second)
      expect(mock.inspectOrder(first.orderId)).toEqual(order)
    }
  },
)

/** 中文：失败/取消未经可靠确认仍占用，确认后释放但审核不回待审，旧pending和成功不能复活终态。 English: Unconfirmed failure/cancel still reserves; confirmation releases capacity without reopening review or accepting stale events. */
it.each(['failed', 'canceled'] as const)(
  '渠道%s可靠终止后才释放，不增加已退量',
  async function testTerminalRelease(status) {
    const first = fixture()
    const pending = related(first, {
      status: 'approved',
      provider: 'mock',
      providerRefundId: 'mock-related-provider',
      providerRefundStatus: 'pending',
    })
    const order = createRefundOrderFixtures([first])[0]
    if (!order?.items[0]) throw new Error('missing-order-fixture')
    order.items[0].refundedQty = 1
    scenario([first, pending], order)
    const event: RefundProviderResult = { providerRefundId: 'mock-related-provider', status }
    expect(mock.applyProviderResult(event)).toEqual({ ok: true, applied: true })
    await assertError(await review(first, 'approve'), 409, 'INVALID_STATUS')
    expect(mock.inspectOrder(first.orderId)).toEqual(order)
    expect(mock.applyProviderResult({ ...event, confirmedTerminal: true })).toEqual({
      ok: true,
      applied: true,
    })
    expect(mock.inspectRefund(pending.id)).toMatchObject({
      status: 'approved',
      providerRefundStatus: status,
    })
    expect(mock.inspectOrder(first.orderId)).toEqual(order)
    expect(mock.applyProviderResult({ ...event, status: 'pending' })).toEqual({
      ok: false,
      code: 'INVALID_STATUS',
    })
    expect(
      mock.applyProviderResult({ ...event, status: 'succeeded', confirmedTerminal: true }),
    ).toEqual({ ok: false, code: 'INVALID_STATUS' })
    expect((await readRefund(await review(first, 'approve'))).status).toBe('approved')
  },
)

/** 中文：部分商品申请不能退款运费，已退与占用运费也不能超过快照，失败无副作用。 English: Reject shipping for partial goods and cap settled plus reserved shipping atomically. */
it('防止部分退运费以及累计运费超退', async function testShippingCapacity() {
  const partial = fixture()
  partial.shippingRefundCents = 600
  partial.totalAmountCents += 600
  scenario([partial])
  await assertError(await review(partial, 'approve'), 409, 'INVALID_STATUS')
  expect(mock.inspectRefund(partial.id)).toEqual(partial)
  const whole = fixture(1)
  const order = createRefundOrderFixtures([whole])[0]
  if (!order) throw new Error('missing-order-fixture')
  order.shippingRefundedCents = 1
  scenario([whole], order)
  await assertError(await review(whole, 'approve'), 409, 'INVALID_STATUS')
  expect(mock.inspectOrder(whole.orderId)).toEqual(order)
  const approved: Refund = {
    ...whole,
    status: 'approved',
    provider: 'mock',
    providerRefundId: 'mock-overclaim',
    providerRefundStatus: 'pending',
  }
  scenario([approved], order)
  expect(mock.applyProviderResult(success(approved))).toEqual({ ok: false, code: 'INVALID_STATUS' })
  expect(mock.inspectRefund(whole.id)).toEqual(approved)
  expect(mock.inspectOrder(whole.orderId)).toEqual(order)
})

/** 中文：未知商品、超额数量及篡改快照金额在发起和结算时均原子拒绝。 English: Reject unknown items, excess quantities and tampered amounts atomically at initiation and settlement. */
it.each(['unknown-item', 'excess-quantity', 'changed-price', 'wrong-amount'] as const)(
  '发起与结算拒绝%s',
  async function testInvalidClaim(kind) {
    const refund = fixture()
    const order = createRefundOrderFixtures([refund])[0]
    const item = refund.items[0]
    if (!item || !order) throw new Error('missing-fixture')
    if (kind === 'unknown-item') item.orderItemId = '9500000000000000299'
    if (kind === 'excess-quantity') item.qty = 3
    if (kind === 'changed-price') item.priceCents = 1
    item.amountCents = item.qty * item.priceCents + (kind === 'wrong-amount' ? 1 : 0)
    refund.goodsAmountCents = item.amountCents
    refund.totalAmountCents = refund.goodsAmountCents
    scenario([refund], order)
    await assertError(await review(refund, 'approve'), 409, 'INVALID_STATUS')
    expect(mock.inspectRefund(refund.id)).toEqual(refund)
    expect(mock.inspectOrder(refund.orderId)).toEqual(order)
    const approved: Refund = {
      ...refund,
      status: 'approved',
      provider: 'mock',
      providerRefundId: 'mock-invalid-claim',
      providerRefundStatus: 'pending',
    }
    scenario([approved], order)
    expect(mock.applyProviderResult(success(approved))).toEqual({
      ok: false,
      code: 'INVALID_STATUS',
    })
    expect(mock.inspectRefund(refund.id)).toEqual(approved)
    expect(mock.inspectOrder(refund.orderId)).toEqual(order)
  },
)

/** 中文：拒绝未发起申请释放其占用，不增加退款或库存，其他合法申请随后可批准。 English: Rejection releases an uninitiated reservation without settling/restocking and permits a remaining valid claim. */
it('拒绝待审申请释放其额度', async function testRejectedReservationRelease() {
  const first = fixture()
  const second = related(first)
  const order = createRefundOrderFixtures([first])[0]
  if (!order?.items[0]) throw new Error('missing-order-fixture')
  order.items[0].refundedQty = 1
  scenario([first, second], order)
  await assertError(await review(first, 'approve'), 409, 'INVALID_STATUS')
  await readRefund(await review(second, 'reject'))
  expect(mock.inspectOrder(first.orderId)).toEqual(order)
  expect((await readRefund(await review(first, 'approve'))).status).toBe('approved')
})

/** 中文：成功和可靠终止的默认记录已入账/释放，不能因重复事件再次改变库存或件数。 English: Default terminal records are already booked/released and cannot settle twice. */
it('默认已成功快照与未知渠道对象都按标识幂等处理', function testSeededTerminalAndUnknown() {
  const succeeded = fixture(4)
  const before = mock.inspectOrder(succeeded.orderId)
  expect(mock.applyProviderResult(success(succeeded))).toEqual({ ok: true, applied: false })
  expect(mock.inspectOrder(succeeded.orderId)).toEqual(before)
  expect(
    mock.applyProviderResult({
      providerRefundId: 'not-a-real-refund',
      status: 'succeeded',
      confirmedTerminal: true,
    }),
  ).toEqual({ ok: false, code: 'NOT_FOUND' })
})

/** 中文：检查测试端口返回深拷贝，工厂实例和传入种子也互不共享。 English: Verify defensive test ports and factory/seed isolation. */
it('测试端口和新工厂不会泄漏可变账本引用', async function testIsolation() {
  const refund = fixture()
  const originalOrder = mock.inspectOrder(refund.orderId)
  const copy = mock.inspectRefund(refund.id)
  if (!copy || !originalOrder) throw new Error('missing-fixture')
  copy.user.nickname = 'changed'
  const orderCopy = mock.inspectOrder(refund.orderId)
  if (orderCopy) orderCopy.inventoryOnHand = 0
  expect(mock.inspectRefund(refund.id)).toEqual(refund)
  expect(mock.inspectOrder(refund.orderId)).toEqual(originalOrder)
  await readRefund(await review(refund, 'approve'))
  const fresh = createRefundMock({ baseURL })
  expect(fresh.inspectRefund(refund.id)).toEqual(refund)
})
