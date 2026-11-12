// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { http as mockHttp, HttpResponse, type HttpResponseResolver } from 'msw/http'
import { setupServer } from 'msw/node'
import { createDashboardData } from '@/mocks/data/dashboard'
import { createDashboardHandlers, type DashboardMockRole } from '@/mocks/handlers/dashboard'

/** 创建提升后的合成客户端上下文；无真实凭据或网络副作用。 / Create hoisted synthetic client context without real credentials or network effects. */
const context = vi.hoisted(function createContext() {
  return {
    baseURL: 'http://localhost:48235/api/admin',
    role: 'reader' as DashboardMockRole | null,
    generation: 0,
    expired: 0,
    passwordChanges: 0,
  }
})

/** 将默认客户端替换为同一真实实现的隔离实例；不模拟请求或解析行为。 / Install an isolated real client without mocking transport or parsing behavior. */
vi.mock('./http', async function isolateClient(importOriginal) {
  const actual = await importOriginal<typeof import('./http')>()
  return {
    ...actual,
    http: new actual.HttpClient({
      baseURL: context.baseURL,
      auth: {
        /** 读取当前测试会话代次。 / Read the current test session generation. */
        getSessionGeneration(): number {
          return context.generation
        },
        /** 记录改密通知，不导航。 / Record password-change notifications without navigation. */
        onPasswordChangeRequired(): void {
          context.passwordChanges += 1
        },
        /** 记录登录失效通知，不导航。 / Record expiry notifications without navigation. */
        onNeedLogin(): void {
          context.expired += 1
        },
      },
    }),
  }
})

import { dashboardApi, parseSummary, type Summary } from './dashboard'

const server = setupServer()
const summaryURL = `${context.baseURL}/summary`

/** 创建合法投影，不使用业务解析器生成预期值。 / Build a valid projection without deriving expectations from the parser. */
function fixture(): Summary {
  return {
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
  }
}

/** 为未知投影创建JSON解析器测试响应。 / Return an HTTP resolver for an arbitrary projection. */
function respond(value: unknown): HttpResponseResolver {
  /** 返回投影，不修改数据。 / Return the supplied projection without mutation. */
  function resolve(): Response {
    return HttpResponse.json({ ok: true, data: value })
  }
  return resolve
}

/** 断言未知响应被解析器拒绝，不改变输入。 / Assert rejection of an unknown response without mutating it. */
function expectInvalid(value: unknown): void {
  /** 执行待断言的解析，允许错误向断言传播。 / Run parsing and let failures reach the assertion. */
  function parseInvalid(): Summary {
    return parseSummary(value)
  }
  expect(parseInvalid).toThrow()
}

/** 启动隔离网络拦截，未知请求失败。 / Start isolated interception and fail unhandled requests. */
function start(): void {
  server.listen({ onUnhandledFrame: 'error' })
}
/** 中文：为隔离交叉测试提供身份，不修改请求头。 English: Resolve the isolated test role without modifying request headers. */
function readTestRole(): DashboardMockRole | null {
  return context.role
}

/** 每例恢复合法身份与独立 Mock。 / Restore the authorized role and isolated Mock per test. */
function reset(): void {
  context.role = 'reader'
  context.generation += 1
  context.expired = 0
  context.passwordChanges = 0
  server.use(...createDashboardHandlers(createDashboardData(), context.baseURL, readTestRole))
}
/** 清除临时拦截规则。 / Remove temporary handlers. */
function cleanup(): void {
  server.resetHandlers()
}
/** 关闭网络拦截。 / Close isolated interception. */
function close(): void {
  server.close()
}
beforeAll(start)
beforeEach(reset)
afterEach(cleanup)
afterAll(close)

/** 验证真实客户端与默认Mock往返，字符串ID和金额不变。 / Verify real client/default Mock round trip preserves IDs and cents. */
it('GET /summary 拆包并返回默认Mock的当前计数与配置', async function testRoundTrip() {
  await expect(dashboardApi.get()).resolves.toEqual(fixture())
})

/** 零计数及零金额均为真实值，空城市不代表请求失败。 / Preserve legitimate zeros and empty city configuration. */
it('接受零计数、零费用和空城市', async function testZeros() {
  const summary = {
    pendingOrderCount: 0,
    deliveringOrderCount: 0,
    openRefundCount: 0,
    openReportCount: 0,
    cities: [],
    localFeeCents: 0,
    postFeeCents: 0,
    freeShippingThresholdCents: 0,
  }
  server.use(mockHttp.get(summaryURL, respond(summary)))
  await expect(dashboardApi.get()).resolves.toEqual(summary)
})

const integerFields = [
  'pendingOrderCount',
  'deliveringOrderCount',
  'openRefundCount',
  'openReportCount',
  'localFeeCents',
  'postFeeCents',
  'freeShippingThresholdCents',
] as const
const invalidIntegers = [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, '2', null]

/** 任意整数投影字段非法时整份拒绝，不让错误显示成零。 / Reject the entire projection for invalid integer fields, never displaying fabricated zeros. */
it.each(integerFields)(
  '拒绝 %s 的负值、小数、不安全整数、字符串和null',
  async function testInvalidInteger(key) {
    for (const value of invalidIntegers) {
      server.use(mockHttp.get(summaryURL, respond({ ...fixture(), [key]: value })))
      await expect(dashboardApi.get()).rejects.toMatchObject({ kind: 'protocol', status: 200 })
    }
  },
)

/** 安全整数上界仍能正确保留。 / Preserve valid safe-integer upper boundaries. */
it('接受安全整数上界，不舍入', function testSafeBoundary() {
  const summary = fixture()
  for (const key of integerFields) summary[key] = Number.MAX_SAFE_INTEGER
  expect(parseSummary(summary)).toEqual(summary)
})

/** 全部必填字段缺失均失败，避免默认补值。 / Reject every missing required summary field instead of filling defaults. */
it.each([...integerFields, 'cities'] as const)('缺少 %s 时拒绝', function testMissingField(key) {
  const summary: Record<string, unknown> = { ...fixture() }
  delete summary[key]
  expectInvalid(summary)
})

/** 顶层必须是准确对象，附加字段禁止。 / Require the exact object shape and disallow extra fields. */
it.each([null, [], 'summary', 1, { ...fixture(), extra: true }])(
  '拒绝非法顶层 %j',
  function testInvalidTop(value) {
    expectInvalid(value)
  },
)

/** cities必须为数组，且逐个校验城市结构。 / Require a city array and validate every city record. */
it.each([null, {}, 'cities', [null], [[]]])(
  '拒绝非法城市集合 %j',
  function testInvalidCities(cities) {
    expectInvalid({ ...fixture(), cities })
  },
)

const invalidCities = [
  { id: 9000000000000000040 },
  { id: '' },
  { id: '1a' },
  { id: '1'.repeat(21) },
  { fulfillment: 'courier' },
  { nameZh: null },
  { nameZh: '字'.repeat(41) },
  { deliverableZoneNamesZh: null },
  { deliverableZoneNamesZh: [1] },
  { deliverableZoneNamesZh: ['😀'.repeat(21)] },
  { extra: true },
]

/** 城市结构非法时拒绝，不转换ID或臆测配送类型。 / Reject invalid city records without ID coercion or fulfillment guesses. */
it.each(invalidCities)('拒绝非法城市字段 %j', function testInvalidCity(patch) {
  const city = { ...fixture().cities[0], ...patch }
  expectInvalid({ ...fixture(), cities: [city] })
})

/** 每个城市字段都是必填，不对缺失大区列表补空。 / Require every city field, without filling missing zone lists. */
it.each(['id', 'nameZh', 'fulfillment', 'deliverableZoneNamesZh'])(
  '城市缺少 %s 时拒绝',
  function testMissingCityField(key) {
    const city: Record<string, unknown> = { ...fixture().cities[0] }
    delete city[key]
    expectInvalid({ ...fixture(), cities: [city] })
  },
)

/** 旧区字段不能满足新契约。 / Reject a legacy district field in place of the required zone list. */
it('拒绝只有旧配送区字段的响应', function testLegacyCity() {
  const { id, nameZh, fulfillment } = fixture().cities[0]!
  expectInvalid({
    ...fixture(),
    cities: [{ id, nameZh, fulfillment, deliverableDistrictNamesZh: ['旧配送区'] }],
  })
})

/** 快递城市只接受空大区列表，非空时以协议错误结束请求。 / Require empty post zone lists and report nonempty lists as protocol errors. */
it('拒绝快递城市的非空配送大区数组', async function testPostZones() {
  const summary = fixture()
  summary.cities[1]!.deliverableZoneNamesZh = ['快递范围不能写进线下大区摘要']
  server.use(mockHttp.get(summaryURL, respond(summary)))
  await expect(dashboardApi.get()).rejects.toMatchObject({ kind: 'protocol', status: 200 })
})

/** 城市与配送大区分别按40和20码点校验，保留合法空名称和原顺序。 / Enforce 40 and 20 code point limits, preserving valid empty names and source order. */
it('保留合法的城市、大区名称、重复城市ID和大区顺序', function testSchemaBoundaries() {
  const city = {
    id: '0'.repeat(20),
    nameZh: '😀'.repeat(40),
    fulfillment: 'local' as const,
    deliverableZoneNamesZh: ['乙', '😀'.repeat(20), ''],
  }
  const summary = { ...fixture(), cities: [city, { ...city, nameZh: '' }] }
  expect(parseSummary(summary)).toEqual(summary)
})

/** 复制层级避免View通过解析结果修改原始响应。 / Copy nested objects so rendering cannot mutate the transport response. */
it('返回独立对象与大区数组', function testCopy() {
  const input = fixture()
  const result = parseSummary(input)
  result.cities[0]!.nameZh = '修改后的名称'
  result.cities[0]!.deliverableZoneNamesZh.push('修改后的大区')
  expect(input.cities[0]!.nameZh).toBe('虚构线下演示城市')
  expect(input.cities[0]!.deliverableZoneNamesZh).toHaveLength(2)
})

/** 授权失败保留错误语义，401通知登录适配器。 / Preserve authorization errors and notify the session adapter only for 401. */
it.each([
  { role: null, code: 'NEED_LOGIN', status: 401, expired: 1 },
  { role: 'denied', code: 'FORBIDDEN', status: 403, expired: 0 },
] as const)('权限错误 $code 不变成空概览', async function testAuthError(testCase) {
  context.role = testCase.role
  await expect(dashboardApi.get()).rejects.toMatchObject({
    kind: 'business',
    code: testCase.code,
    status: testCase.status,
  })
  expect(context.expired).toBe(testCase.expired)
  expect(context.passwordChanges).toBe(0)
})

/** 中文：概览请求须先改密码时通知会话适配器，拒绝读取摘要。 English: Notify the session adapter on password-change requirements and reject summary reads. */
it('须先改密码时保留 403 并通知改密流程', async function testPasswordChangeRequired() {
  /** 中文：返回上游改密错误的模拟响应。 English: Return the upstream password-change error from Mock. */
  function requirePasswordChange(): Response {
    return HttpResponse.json(
      { ok: false, code: 'PASSWORD_CHANGE_REQUIRED', message: '请先修改初始密码' },
      { status: 403 },
    )
  }
  server.use(mockHttp.get(summaryURL, requirePasswordChange))
  await expect(dashboardApi.get()).rejects.toMatchObject({
    kind: 'business',
    code: 'PASSWORD_CHANGE_REQUIRED',
    status: 403,
  })
  expect(context.passwordChanges).toBe(1)
  expect(context.expired).toBe(0)
})

/** 服务失败保持失败，不返回假零值。 / Preserve server failure rather than returning false zeros. */
it('服务器错误透传统一错误', async function testServerError() {
  /** 模拟契约服务器错误，不回显请求。 / Return a contract server failure without request echo. */
  function fail(): Response {
    return HttpResponse.json(
      { ok: false, code: 'INTERNAL_ERROR', message: '仅供测试' },
      { status: 500 },
    )
  }
  server.use(mockHttp.get(summaryURL, fail))
  await expect(dashboardApi.get()).rejects.toMatchObject({
    kind: 'business',
    code: 'INTERNAL_ERROR',
    status: 500,
  })
})

/** 取消信号透传真实客户端，不产生成功数据。 / Forward cancellation through the real client without successful data. */
it('取消读取时抛取消错误', async function testCancellation() {
  const controller = new AbortController()
  controller.abort()
  await expect(dashboardApi.get(controller.signal)).rejects.toMatchObject({ kind: 'canceled' })
})
