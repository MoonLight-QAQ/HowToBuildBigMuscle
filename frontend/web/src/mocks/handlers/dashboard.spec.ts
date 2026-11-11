// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import type { components } from '@/api/generated/admin'
import { createDashboardData, type DashboardMockData } from '../data/dashboard'
import { createDashboardHandlers, DASHBOARD_MOCK_TOKENS } from './dashboard'

type Summary = components['schemas']['Summary']
const baseURL = 'http://localhost:48236/api/admin'
const server = setupServer()
let source: DashboardMockData

/** 发出被MSW完全拦截的GET；返回响应，不触达真实后端。 / Send a fully intercepted GET and return its response without a real backend. */
function getSummary(token: string | null = DASHBOARD_MOCK_TOKENS.reader): Promise<Response> {
  return fetch(`${baseURL}/summary`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
}

/** 拆出测试成功摘要，失败由断言报告。 / Unwrap a successful test summary, reporting failures through assertions. */
async function readSummary(): Promise<Summary> {
  const response = await getSummary()
  expect(response.status).toBe(200)
  const body = (await response.json()) as { ok: boolean; data: Summary }
  expect(body.ok).toBe(true)
  return body.data
}

/** 启动拦截，禁止未处理请求。 / Start interception and reject unhandled traffic. */
function start(): void {
  server.listen({ onUnhandledFrame: 'error' })
}
/** 每例建立独立数据源与拦截器。 / Create a fresh source and handlers for every test. */
function reset(): void {
  source = createDashboardData()
  server.use(...createDashboardHandlers(source, baseURL))
}
/** 清除临时规则。 / Remove temporary handlers. */
function cleanup(): void {
  server.resetHandlers()
}
/** 关闭拦截。 / Close interception. */
function close(): void {
  server.close()
}
beforeAll(start)
beforeEach(reset)
afterEach(cleanup)
afterAll(close)

/** 验证待办与大区投影，覆盖成员开关、空成员、排序和快递空数组。 / Verify workload and zone projections with member overrides, empty memberships, sort order and empty post lists. */
it('按记录统计待办并返回按最终可送成员汇总的大区', async function testDefaultSummary() {
  expect(await readSummary()).toEqual({
    pendingOrderCount: 2,
    deliveringOrderCount: 1,
    openRefundCount: 2,
    openReportCount: 2,
    cities: [
      {
        id: '9000000000000000040',
        nameZh: '虚构线下演示城市',
        fulfillment: 'local',
        deliverableZoneNamesZh: ['虚构可送大区甲', '虚构可送大区乙'],
      },
      {
        id: '9000000000000000041',
        nameZh: '虚构快递演示城市',
        fulfillment: 'post',
        deliverableZoneNamesZh: [],
      },
      {
        id: '9000000000000000042',
        nameZh: '虚构暂无可送大区城市',
        fulfillment: 'local',
        deliverableZoneNamesZh: [],
      },
    ],
    localFeeCents: 600,
    postFeeCents: 1000,
    freeShippingThresholdCents: 10000,
  })
})

/** 清除成员覆盖或修改大区排序后，下一次GET按最新配置投影。 / Recompute membership and sort order on the next GET after configuration changes. */
it('成员覆盖和大区排序变更后重新汇总', async function testCurrentZones() {
  const initial = await readSummary()
  expect(initial.cities[0]!.deliverableZoneNamesZh).toEqual(['虚构可送大区甲', '虚构可送大区乙'])
  const [enabledByMember, disabledByMembers] = source.delivery.cities[0]!.zones
  enabledByMember!.members[0]!.deliverableOverride = null
  disabledByMembers!.members[1]!.deliverableOverride = true
  disabledByMembers!.sort = 5
  const updated = await readSummary()
  expect(updated.cities[0]!.deliverableZoneNamesZh).toEqual(['虚构成员停送大区', '虚构可送大区甲'])
  expect(updated.cities[1]!.deliverableZoneNamesZh).toEqual([])
})

/** 每次GET重新统计当前记录与配置，不缓存初始计数。 / Recompute records and configuration on each GET instead of caching initial counts. */
it('服务端状态变化后重新读取可见新计数和费用', async function testCurrentRecords() {
  await readSummary()
  source.orders[0]!.status = 'delivering'
  source.refunds[0]!.status = 'approved'
  source.refunds[0]!.providerRefundStatus = 'pending'
  source.reports[0]!.status = 'ignored'
  source.delivery.localFeeCents = 800
  const updated = await readSummary()
  expect(updated).toMatchObject({
    pendingOrderCount: 1,
    deliveringOrderCount: 2,
    openRefundCount: 1,
    openReportCount: 1,
    localFeeCents: 800,
  })
})

/** 待审退款统计申请，而非退款中的订单或渠道处理中申请。 / Count open refund requests, not refunding orders or approved provider-pending requests. */
it('多条待审退款独立计数，approved+pending 和 refunding订单不算待审', async function testRefundIndependence() {
  source.orders = [{ status: 'refunding' }, { status: 'refunding' }, { status: 'refunding' }]
  source.refunds = [
    { status: 'open', providerRefundStatus: null },
    { status: 'open', providerRefundStatus: null },
    { status: 'approved', providerRefundStatus: 'pending' },
    { status: 'approved', providerRefundStatus: 'failed' },
  ]
  expect(await readSummary()).toMatchObject({
    pendingOrderCount: 0,
    deliveringOrderCount: 0,
    openRefundCount: 2,
  })
})

/** 其余履约与举报终态不进入待办计数。 / Exclude other order states and resolved reports from workload counts. */
it('忽略非目标订单状态和已处理举报', async function testExcludedStatuses() {
  source.orders = [
    { status: 'unpaid' },
    { status: 'done' },
    { status: 'refunding' },
    { status: 'refunded' },
    { status: 'cancelled' },
  ]
  source.refunds = [{ status: 'rejected', providerRefundStatus: null }]
  source.reports = [{ status: 'ignored' }, { status: 'handled' }]
  expect(await readSummary()).toMatchObject({
    pendingOrderCount: 0,
    deliveringOrderCount: 0,
    openRefundCount: 0,
    openReportCount: 0,
  })
})

/** 空数据与零费用仍为合法成功，保留其含义。 / Empty records and zero fees remain a valid successful response. */
it('无记录和城市时返回真实零值', async function testEmptySource() {
  source.orders = []
  source.refunds = []
  source.reports = []
  source.delivery = { cities: [], localFeeCents: 0, postFeeCents: 0, freeShippingThresholdCents: 0 }
  expect(await readSummary()).toEqual({
    pendingOrderCount: 0,
    deliveringOrderCount: 0,
    openRefundCount: 0,
    openReportCount: 0,
    ...source.delivery,
  })
})

/** 读取不修改来源，响应对象也不能反向影响下一次响应。 / Reads preserve the source and response mutations cannot affect subsequent reads. */
it('响应与来源隔离，GET不会修改业务记录', async function testReadOnlyIsolation() {
  const before = structuredClone(source)
  const initial = await readSummary()
  const result = await readSummary()
  result.cities[0]!.nameZh = '修改结果'
  result.cities[0]!.deliverableZoneNamesZh.push('新增结果大区')
  expect(source).toEqual(before)
  expect(await readSummary()).toEqual(initial)
})

/** 工厂为每个测试或宿主提供独立默认记录。 / The factory creates independent default records per test or host. */
it('两份默认数据不共享嵌套数组', function testFactoryIsolation() {
  const first = createDashboardData()
  const second = createDashboardData()
  first.orders[0]!.status = 'done'
  first.delivery.cities[0]!.zones[0]!.members[0]!.deliverableOverride = false
  expect(second.orders[0]!.status).toBe('pending')
  expect(second.delivery.cities[0]!.zones[0]!.members[0]!.deliverableOverride).toBe(true)
})

/** 非法或无权限合成身份在读取摘要前被拒绝，不泄露数据。 / Reject invalid or forbidden identities before reading summary data. */
it.each([
  { token: null, status: 401, code: 'NEED_LOGIN' },
  { token: 'mock-customer', status: 401, code: 'NEED_LOGIN' },
  { token: 'unknown-token', status: 401, code: 'NEED_LOGIN' },
  { token: DASHBOARD_MOCK_TOKENS.denied, status: 403, code: 'FORBIDDEN' },
])('身份 $token 返回 $status 且不读取数据', async function testAuthorization(testCase) {
  let reads = 0
  /** 记录不应发生的数据读取，读取时令测试失败。 / Count forbidden reads and throw if data is accessed. */
  function observeRead(): never {
    reads += 1
    throw new Error('unauthorized-data-read')
  }
  Object.defineProperty(source, 'orders', { get: observeRead })
  const response = await getSummary(testCase.token)
  expect(response.status).toBe(testCase.status)
  const body = await response.json()
  expect(body).toMatchObject({ ok: false, code: testCase.code })
  expect(body).not.toHaveProperty('data')
  expect(reads).toBe(0)
})
