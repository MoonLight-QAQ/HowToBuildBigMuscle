// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import type { components } from '@/api/generated/admin'
import { createOrderFixtures } from '@/mocks/data/order'
import { createOrderHandlers, ORDER_MOCK_TOKENS } from './order'

type Order = components['schemas']['Order']
type OrderPage = components['schemas']['OrderPage']
type OrderStatus = components['schemas']['OrderStatus']
type ErrorBody = components['schemas']['ErrorResponse']

const baseURL = 'http://localhost:48125/api/admin'
const server = setupServer()
const fixtures = createOrderFixtures()
const statuses: OrderStatus[] = [
  'unpaid',
  'pending',
  'delivering',
  'done',
  'refunding',
  'refunded',
  'cancelled',
]

/** 中文：启动严格网络拦截，无输入，不允许未注册请求访问网络。 English: Start strict interception without real network traffic. */
function startServer(): void {
  server.listen({ onUnhandledFrame: 'error' })
}

/** 中文：每例安装全新订单仓库，隔离写入副作用。 English: Install a fresh isolated order store before each test. */
function resetFixtures(): void {
  server.resetHandlers(...createOrderHandlers(baseURL))
}

/** 中文：清除本例 handler，无输入。 English: Clear handlers after each test. */
function resetServer(): void {
  server.resetHandlers()
}

/** 中文：恢复网络实现，无输入。 English: Close interception after the suite. */
function stopServer(): void {
  server.close()
}

beforeAll(startServer)
beforeEach(resetFixtures)
afterEach(resetServer)
afterAll(stopServer)

/** 中文：按状态找本地配送快照，返回匹配项；数据缺失抛错。 English: Find a local fixture by status or throw on missing test data. */
function findOrder(status: OrderStatus): Order {
  for (const order of fixtures)
    if (order.status === status && order.fulfillment === 'local') return order
  throw new Error('missing-order-fixture')
}

/** 中文：发送带合成 token 的测试请求；有 body 时 POST，否则 GET，不访问真实服务。 English: Send intercepted GET/POST requests with optional synthetic authentication. */
function request(
  path: string,
  token: string | null = ORDER_MOCK_TOKENS.delivery,
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

/** 中文：读取成功详情并验证响应封装，输入响应，返回类型化订单。 English: Assert a successful envelope and read its order. */
async function readOrder(response: Response): Promise<Order> {
  expect(response.status).toBe(200)
  const body = (await response.json()) as { ok: true; data: Order }
  expect(body.ok).toBe(true)
  return body.data
}

/** 中文：验证安全错误码与状态，无订单或收货人泄漏；返回错误封装。 English: Assert error status/code and absence of order/contact data. */
async function assertError(
  response: Response,
  status: number,
  code: ErrorBody['code'],
): Promise<void> {
  expect(response.status).toBe(status)
  const body: unknown = await response.json()
  expect(body).toMatchObject({ ok: false, code, message: expect.any(String) })
  expect(body).not.toHaveProperty('data')
  expect(JSON.stringify(body)).not.toContain('0491 570 006')
  expect(JSON.stringify(body)).not.toContain('Example Street')
}

/** 中文：验证虚构数据覆盖契约状态、履约、时区、完成来源和退款快照，且实例独立。 English: Verify fixture coverage, snapshot consistency and independent copies. */
it('覆盖七种状态、两种履约及三种完成来源，保留金额快照与退款导航', function testFixtureCoverage() {
  const coverage = new Set<string>()
  const completionSources = new Set<string>()
  for (const order of fixtures) {
    coverage.add(`${order.status}/${order.fulfillment}`)
    expect(order.id).toMatch(/^[0-9]{1,20}$/)
    expect(order.contactPhone).toBe('0491 570 006')
    expect(order.address.formatted).toContain('虚构')
    expect(order.address).toMatchObject(
      order.fulfillment === 'local'
        ? {
            zoneNameZh: '演示大区',
            suburb: 'Example Sydney Suburb',
            postcode: '2000',
            state: 'NSW',
          }
        : { zoneNameZh: null, suburb: 'Example Perth Suburb', postcode: '6000', state: 'WA' },
    )
    expect(order.actualAmountCents).toBe(order.goodsAmountCents + order.shippingFeeCents)
    expect(order.user).toEqual({ id: '9000000000000000001', nickname: expect.any(String) })
    expect(order.timezone).toMatch(/^Australia\//)
    if (order.completedBy) completionSources.add(order.completedBy)
    if (order.completedBy === 'auto') {
      expect(Date.parse(order.completedAt ?? '') - Date.parse(order.slotEndAt ?? '')).toBe(
        24 * 60 * 60 * 1000,
      )
    }
    if (order.status === 'unpaid') {
      expect(Date.parse(order.payExpireAt ?? '') - Date.parse(order.createdAt)).toBe(15 * 60 * 1000)
    }
    if (order.fulfillment === 'post') {
      expect([order.deliveryDate, order.slotNameZh, order.slotStartAt, order.slotEndAt]).toEqual([
        null,
        null,
        null,
        null,
      ])
    }
  }
  expect(coverage.size).toBe(14)
  expect(completionSources).toEqual(new Set(['user', 'staff', 'auto']))
  expect(findOrder('delivering').items[0]?.refundedQty).toBe(1)
  expect(findOrder('delivering').actualAmountCents).toBe(8400)
  expect(findOrder('delivering').refunds[0]?.status).toBe('approved')
  const separate = createOrderFixtures()
  const first = separate[0]
  if (!first) throw new Error('missing-order-fixture')
  first.address.formatted = 'changed'
  expect(fixtures[0]?.address.formatted).not.toBe('changed')
})

/** 中文：验证默认分页与列表字段白名单，低权限管理员不可获取收货隐私。 English: Assert default pagination and an explicit PII-free list projection. */
it('列表默认分页且没有电话、地址、备注或详情字段', async function testListProjection() {
  const response = await request('/orders', ORDER_MOCK_TOKENS.readonly)
  expect(response.status).toBe(200)
  const body = (await response.json()) as { ok: true; data: OrderPage }
  expect(body).toMatchObject({ ok: true, data: { total: fixtures.length, page: 1, pageSize: 20 } })
  for (const item of body.data.items) {
    expect(Object.keys(item).sort()).toEqual(
      [
        'actualAmountCents',
        'cityNameZh',
        'createdAt',
        'fulfillment',
        'id',
        'itemsSummary',
        'orderNo',
        'slotEndAt',
        'slotStartAt',
        'status',
        'timezone',
        'user',
        'version',
      ].sort(),
    )
    expect(Object.keys(item.user).sort()).toEqual(['id', 'nickname'])
  }
  expect(JSON.stringify(body)).not.toContain('0491 570 006')
  expect(JSON.stringify(body)).not.toContain('Example Street')
})

/** 中文：验证分页边界与总数，不修改仓库。 English: Assert paging boundaries and stable totals. */
it('分页保留总数，超出末页返回空数组', async function testPagination() {
  const second = (await (await request('/orders?page=2&pageSize=3')).json()) as { data: OrderPage }
  expect(second.data).toMatchObject({ total: fixtures.length, page: 2, pageSize: 3 })
  expect(second.data.items[0]?.id).toBe(fixtures[3]?.id)
  expect(second.data.items).toHaveLength(3)
  const last = (await (await request('/orders?page=100&pageSize=100')).json()) as {
    data: OrderPage
  }
  expect(last.data.items).toEqual([])
})

/** 中文：验证每种状态筛选，输入状态枚举，无写入。 English: Assert each supported status filter without mutations. */
it.each(statuses)('按 %s 筛选订单', async function testStatusFilter(status) {
  const body = (await (await request(`/orders?status=${status}`)).json()) as { data: OrderPage }
  expect(body.data.items.length).toBeGreaterThan(0)
  for (const order of body.data.items) expect(order.status).toBe(status)
  expect(body.data.total).toBe(body.data.items.length)
})

/** 中文：验证分页、未知/重复查询和状态校验，非法输入返回 400。 English: Reject malformed, duplicate and unknown list parameters. */
it.each([
  'page=0',
  'page=-1',
  'page=1.5',
  'page=',
  'page=abc',
  'page=9007199254740992',
  'pageSize=0',
  'pageSize=101',
  'pageSize=2.5',
  'pageSize=',
  'page=1&page=2',
  'pageSize=2&pageSize=3',
  'status=',
  'status=unknown',
  'status=pending&status=done',
  'unknown=true',
])('拒绝非法列表查询 %s', async function testInvalidQuery(query) {
  await assertError(await request(`/orders?${query}`), 400, 'VALIDATION_FAILED')
})

/** 中文：未认证、未知/顾客 token 在列表和详情均失败且无隐私泄漏。 English: Reject missing, unknown and customer tokens without disclosing details. */
it.each([null, 'arbitrary-token', 'customer-token', 'expired-token'])(
  '拒绝无效认证 %s',
  async function testAuthentication(token) {
    const order = findOrder('pending')
    await assertError(await request('/orders', token), 401, 'NEED_LOGIN')
    await assertError(await request(`/orders/${order.id}`, token), 401, 'NEED_LOGIN')
    await assertError(
      await request(`/orders/${order.id}/arrive`, token, { version: 0, expectedStatus: 'pending' }),
      401,
      'NEED_LOGIN',
    )
  },
)

/** 中文：验证详情配送资料权限、完整虚构电话、订单金额与退款导航。 English: Protect details and preserve authorized snapshot data. */
it('详情需要配送资料权限，授权角色可见完整虚构号码', async function testDetailPermissions() {
  const order = findOrder('delivering')
  await assertError(
    await request(`/orders/${order.id}`, ORDER_MOCK_TOKENS.readonly),
    403,
    'FORBIDDEN',
  )
  const result = await readOrder(
    await request(`/orders/${order.id}`, ORDER_MOCK_TOKENS.deliveryReadonly),
  )
  expect(result).toEqual(order)
  expect(result.contactPhone).toBe('0491 570 006')
  expect(result.refunds[0]?.id).toEqual(order.refunds[0]?.id)
})

/** 中文：验证详情 ID、未知查询和未找到资源，无状态修改。 English: Reject invalid resource IDs/queries and report unknown IDs. */
it('拒绝非法资源 ID、额外查询并返回 404', async function testResourceValidation() {
  for (const id of ['abc', '-1', '900000000000000000000', '%20']) {
    await assertError(await request(`/orders/${id}`), 400, 'VALIDATION_FAILED')
  }
  await assertError(
    await request(`/orders/${findOrder('pending').id}?full=true`),
    400,
    'VALIDATION_FAILED',
  )
  await assertError(await request('/orders/999'), 404, 'NOT_FOUND')
  await assertError(
    await request('/orders/999/start-delivery', undefined, {
      version: 0,
      expectedStatus: 'pending',
    }),
    404,
    'NOT_FOUND',
  )
})

/** 中文：验证待配送到配送中、版本递增及完整快照保持，重复请求冲突。 English: Start delivery, increment version and reject repeated stale writes. */
it('开始配送只更新状态/版本，重复写入不静默成功', async function testStartDelivery() {
  const order = findOrder('pending')
  const path = `/orders/${order.id}/start-delivery`
  const input = { version: order.version, expectedStatus: 'pending' }
  const updated = await readOrder(await request(path, undefined, input))
  expect(updated).toEqual({ ...order, status: 'delivering', version: 1 })
  await assertError(await request(path, undefined, input), 409, 'VERSION_CONFLICT')
  await assertError(await request(path, undefined, { ...input, version: 1 }), 409, 'INVALID_STATUS')
  expect(await readOrder(await request(`/orders/${order.id}`))).toEqual(updated)
})

/** 中文：验证直接/配送中送达、UTC 完成时间、店员来源及版本，无退款金额重算。 English: Complete pending/delivering orders with UTC staff metadata and unchanged snapshots. */
it.each(['pending', 'delivering'] as const)(
  '允许 %s 确认送达并记录 staff',
  async function testArrive(status) {
    const order = findOrder(status)
    const before = Date.now()
    const path = `/orders/${order.id}/arrive`
    const updated = await readOrder(
      await request(path, undefined, { version: 0, expectedStatus: status }),
    )
    expect(updated.status).toBe('done')
    expect(updated.version).toBe(1)
    expect(updated.completedBy).toBe('staff')
    expect(updated.completedAt).toMatch(/Z$/)
    expect(Date.parse(updated.completedAt ?? '')).toBeGreaterThanOrEqual(before)
    expect(Date.parse(updated.completedAt ?? '')).toBeLessThanOrEqual(Date.now())
    expect(updated.actualAmountCents).toBe(order.actualAmountCents)
    expect(updated.shippingFeeCents).toBe(order.shippingFeeCents)
    expect(updated.address).toEqual(order.address)
    expect(updated.items).toEqual(order.items)
    expect(updated.refunds).toEqual(order.refunds)
    await assertError(
      await request(path, undefined, { version: 1, expectedStatus: status }),
      409,
      'INVALID_STATUS',
    )
    expect(await readOrder(await request(`/orders/${order.id}`))).toEqual(updated)
  },
)

/** 中文：所有写入权限先于变更验证，无配送资料或操作权限时状态保持。 English: Require both delivery-data and action permission before either mutation. */
it.each([
  ORDER_MOCK_TOKENS.readonly,
  ORDER_MOCK_TOKENS.deliveryReadonly,
  ORDER_MOCK_TOKENS.actionWithoutDelivery,
])('写入拒绝权限不足的合成角色 %s 且不修改状态', async function testWritePermissions(token) {
  const order = findOrder('pending')
  for (const action of ['start-delivery', 'arrive']) {
    await assertError(
      await request(`/orders/${order.id}/${action}`, token, {
        version: 0,
        expectedStatus: 'pending',
      }),
      403,
      'FORBIDDEN',
    )
    expect(await readOrder(await request(`/orders/${order.id}`))).toEqual(order)
  }
})

/** 中文：非法 JSON 字段/版本/旧状态均失败，原订单不变。 English: Reject malformed transition bodies without changing the original order. */
it.each([
  {},
  null,
  [],
  { version: 0 },
  { expectedStatus: 'pending' },
  { version: -1, expectedStatus: 'pending' },
  { version: 0.5, expectedStatus: 'pending' },
  { version: '0', expectedStatus: 'pending' },
  { version: 9007199254740992, expectedStatus: 'pending' },
  { version: 0, expectedStatus: 'done' },
  { version: 0, expectedStatus: 'pending', completedBy: 'auto' },
  { version: 0, expectedStatus: 'pending', completedAt: '2026-11-10T00:00:00Z' },
])('拒绝非法变更体 %j，保留原快照', async function testInvalidBody(body) {
  const order = findOrder('pending')
  for (const action of ['start-delivery', 'arrive']) {
    await assertError(
      await request(`/orders/${order.id}/${action}`, undefined, body),
      400,
      'VALIDATION_FAILED',
    )
    expect(await readOrder(await request(`/orders/${order.id}`))).toEqual(order)
  }
})

/** 中文：拒绝损坏 JSON、错误媒体类型、写入额外查询和非法 ID，无写入。 English: Reject malformed transport, extra queries and invalid write IDs without mutation. */
it('拒绝损坏 JSON、错误媒体类型及写入额外参数', async function testMalformedTransport() {
  const order = findOrder('pending')
  const path = `${baseURL}/orders/${order.id}/start-delivery`
  const headers = {
    Authorization: `Bearer ${ORDER_MOCK_TOKENS.delivery}`,
    'Content-Type': 'application/json',
  }
  await assertError(
    await fetch(path, { method: 'POST', headers, body: '{' }),
    400,
    'VALIDATION_FAILED',
  )
  await assertError(
    await fetch(path, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'text/plain' },
      body: '{}',
    }),
    400,
    'VALIDATION_FAILED',
  )
  await assertError(
    await fetch(path, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json-invalid' },
      body: '{"version":0,"expectedStatus":"pending"}',
    }),
    400,
    'VALIDATION_FAILED',
  )
  await assertError(
    await request(`/orders/${order.id}/arrive?force=true`, undefined, {
      version: 0,
      expectedStatus: 'pending',
    }),
    400,
    'VALIDATION_FAILED',
  )
  await assertError(
    await request('/orders/abc/arrive', undefined, { version: 0, expectedStatus: 'pending' }),
    400,
    'VALIDATION_FAILED',
  )
  await assertError(
    await request(`/orders/${order.id}/start-delivery`, undefined, {
      version: 0,
      expectedStatus: 'delivering',
    }),
    400,
    'VALIDATION_FAILED',
  )
  expect(await readOrder(await request(`/orders/${order.id}`))).toEqual(order)
})

/** 中文：非允许状态不可开始配送或送达，返回冲突且保持全部数据。 English: Reject actions from terminal/unpaid/refund states without mutation. */
it.each(['unpaid', 'done', 'refunding', 'refunded', 'cancelled'] as const)(
  '拒绝 %s 状态的配送变更',
  async function testInvalidCurrentState(status) {
    const order = findOrder(status)
    for (const action of ['start-delivery', 'arrive']) {
      await assertError(
        await request(`/orders/${order.id}/${action}`, undefined, {
          version: 0,
          expectedStatus: 'pending',
        }),
        409,
        'INVALID_STATUS',
      )
      expect(await readOrder(await request(`/orders/${order.id}`))).toEqual(order)
    }
  },
)

/** 中文：两种写操作在版本过期时不写入，重新安装工厂可恢复隔离状态。 English: Reject stale versions for both actions and verify factory isolation. */
it('版本冲突不写入，工厂新实例不共享状态', async function testVersionAndIsolation() {
  const order = findOrder('pending')
  for (const action of ['start-delivery', 'arrive']) {
    await assertError(
      await request(`/orders/${order.id}/${action}`, undefined, {
        version: 99,
        expectedStatus: 'pending',
      }),
      409,
      'VERSION_CONFLICT',
    )
    expect(await readOrder(await request(`/orders/${order.id}`))).toEqual(order)
  }
  await readOrder(
    await request(`/orders/${order.id}/arrive`, undefined, {
      version: 0,
      expectedStatus: 'pending',
    }),
  )
  server.resetHandlers(...createOrderHandlers(baseURL))
  expect(await readOrder(await request(`/orders/${order.id}`))).toEqual(order)
})

/** 中文：并发提交同一版本只能写入一次，落败请求不得覆盖最新订单。 English: Allow exactly one concurrent write per version without overwriting the winner. */
it('并发相同版本的写入仅成功一次', async function testConcurrentWrites() {
  const order = findOrder('pending')
  const path = `/orders/${order.id}/arrive`
  const input = { version: 0, expectedStatus: 'pending' }
  const responses = await Promise.all([
    request(path, undefined, input),
    request(path, undefined, input),
  ])
  const codes: number[] = []
  for (const response of responses) {
    codes.push(response.status)
    if (response.status === 409) await assertError(response, 409, 'VERSION_CONFLICT')
  }
  expect(codes.sort()).toEqual([200, 409])
  const latest = await readOrder(await request(`/orders/${order.id}`))
  expect(latest).toMatchObject({ status: 'done', completedBy: 'staff', version: 1 })
})
