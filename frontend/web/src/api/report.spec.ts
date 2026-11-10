// @vitest-environment node
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { delay } from 'msw'
import { http as mockHttp, HttpResponse, type HttpResponseResolver } from 'msw/http'
import { setupServer } from 'msw/node'
import { createReportMock, REPORT_MOCK_TOKENS } from '@/mocks/handlers/report'
import { createReportFixtures } from '@/mocks/data/report'
import { http } from './http'
import {
  reportApi,
  parseReport,
  parseReportPage,
  type Report,
  type ListReportsQuery,
  type IgnoreReportInput,
  type TakeDownReportInput,
} from './report'

/** 使用隔离地址的真实HttpClient；只替换实例地址，不伪造请求／解析。 / Install a real HttpClient at an isolated address without faking transport or parsing. */
vi.mock('./http', async function configureClient(importOriginal) {
  const actual = await importOriginal<typeof import('./http')>()
  return { ...actual, http: new actual.HttpClient({ baseURL: 'http://localhost:48132/api/admin' }) }
})
const baseURL = 'http://localhost:48132/api/admin'
const server = setupServer()
/** 创建完整虚构举报，返回独立快照，无外部副作用。 / Create a fresh complete synthetic report without external effects. */
function fixture(): Report {
  return {
    id: '9000000000000000200',
    listing: {
      id: '9000000000000000300',
      title: '虚构帖子',
      status: 'on_sale',
      cover: {
        key: 'dev/report/demo/v1/cover.jpg',
        url: 'https://example.invalid/cover.jpg',
        width: 600,
        height: 800,
      },
      removeReason: null,
    },
    comment: null,
    reason: 'fake_info',
    extra: null,
    reporter: { id: '9000000000000000001', nickname: '虚构举报人' },
    status: 'open',
    handledBy: null,
    handledAt: null,
    createdAt: '2026-11-01T00:05:00Z',
    version: 7,
  }
}
/** 创建成功响应器，不修改输入，不访问真实服务。 / Create a success resolver without mutating input or accessing a real service. */
function success(data: unknown): HttpResponseResolver {
  /** 返回提供的虚构data包装，无业务写入。 / Return the supplied synthetic data envelope without business writes. */
  function resolveSuccess(): Response {
    return HttpResponse.json({ ok: true, data })
  }
  return resolveSuccess
}
/** 断言未知举报被拒绝，不修改输入；用于契约负向探针。 / Assert rejection of unknown report data without mutating the test input. */
function expectInvalidReport(value: unknown): void {
  /** 运行待测举报解析器，允许断言捕获错误。 / Run report parsing so the assertion can capture its error. */
  function parseInvalid(): Report {
    return parseReport(value)
  }
  expect(parseInvalid).toThrow()
}
/** 断言未知分页被拒绝，不修改输入。 / Assert rejection of invalid page data without mutating it. */
function expectInvalidPage(value: unknown): void {
  /** 运行待测分页解析器，允许断言捕获错误。 / Run page parsing so the assertion can capture its error. */
  function parseInvalid() {
    return parseReportPage(value)
  }
  expect(parseInvalid).toThrow()
}

/** 启动隔离拦截，未声明请求报错；无外网请求。 / Start isolated interception and fail undeclared requests without external traffic. */
beforeAll(function startServer() {
  server.listen({ onUnhandledFrame: 'error' })
})
/** 每例还原拦截和身份，避免跨测试泄漏。 / Reset handlers and identity after each case to prevent leakage. */
afterEach(function resetServer() {
  server.resetHandlers()
  http.setAuth(null)
  vi.restoreAllMocks()
})
/** 关闭拦截并恢复网络实现，无业务写入。 / Stop interception and restore networking without business writes. */
afterAll(function stopServer() {
  server.close()
})

/** 举报投影必须完整且为独立对象，保留字符串ID。 / Require complete copied projections while preserving string IDs. */
it('copies report, nested listing, image and user projections', function testValid() {
  const source = fixture(),
    result = parseReport(source)
  expect(result).toEqual(source)
  expect(result).not.toBe(source)
  expect(result.listing).not.toBe(source.listing)
  expect(result.listing.cover).not.toBe(source.listing.cover)
  expect(result.reporter).not.toBe(source.reporter)
})
/** 读取时独立保留历史nullable处理字段，不强制状态关系。 / Preserve independently nullable historical audit fields without inventing state relationships. */
it.each([
  { status: 'ignored', handledBy: null, handledAt: null },
  { status: 'handled', handledBy: '历史处理员', handledAt: null },
  { status: 'open', handledBy: null, handledAt: '2026-11-01T00:06:00Z' },
] as const)('preserves historical nullable %j', function testHistory(patch) {
  expect(parseReport({ ...fixture(), ...patch })).toMatchObject(patch)
})
/** 明确接受schema允许的空值、零ID和Unicode上限。 / Accept schema-permitted emptiness, zero IDs and Unicode limits. */
it('keeps permissive read boundaries and discards shared schema extras safely', function testBoundaries() {
  const source = fixture()
  source.id = '0'
  source.listing.id = '0001'
  source.listing.title = '😀'.repeat(40)
  source.extra = ''
  source.listing.removeReason = ''
  source.reporter.nickname = ''
  const extended = {
    ...source,
    reporter: { ...source.reporter, contactPhone: 'must-not-reach-view' },
    listing: { ...source.listing, cover: { ...source.listing.cover, extra: 'shared-extension' } },
  }
  const result = parseReport(extended)
  expect(result.id).toBe('0')
  expect(result.listing.title).toBe('😀'.repeat(40))
  expect(result.reporter).not.toHaveProperty('contactPhone')
  expect(result.listing.cover).not.toHaveProperty('extra')
})
/** 校验每一种举报原因，不自行增设业务枚举。 / Accept every declared report reason without inventing enum values. */
it.each(['fake_info', 'harassment', 'prohibited', 'other'] as const)(
  'accepts reason %s',
  function testReason(reason) {
    expect(parseReport({ ...fixture(), reason }).reason).toBe(reason)
  },
)
/** 已删除评论只允许空内容，不能传播原文。 / Deleted comments permit only empty content and cannot disclose the original text. */
it('preserves deleted empty comments and rejects leaked deleted text', function testDeletedComment() {
  const comment = { id: '9000000000000000400', deleted: true, content: '' }
  expect(parseReport({ ...fixture(), comment }).comment).toEqual(comment)
  expectInvalidReport({ ...fixture(), comment: { ...comment, content: 'deleted private text' } })
})
/** 逐层非法值必须在进入页面前失败，不进行类型转换或修复。 / Invalid nested values fail before reaching views without coercion or repair. */
it.each([
  ['id', 0],
  ['id', '-1'],
  ['id', '1'.repeat(21)],
  ['reason', 'spam'],
  ['status', 'done'],
  ['version', -1],
  ['version', 1.5],
  ['version', Number.MAX_SAFE_INTEGER + 1],
  ['createdAt', '2026-02-30T00:00:00Z'],
  ['createdAt', '2026-11-01T00:00:00+00:00'],
  ['handledAt', 'not-a-date'],
  ['handledBy', 'x'.repeat(61)],
  ['extra', '😀'.repeat(201)],
  ['sellerPhone', 'forbidden-extra'],
] as const)('rejects invalid report field %s=%s', function testInvalidReport(key, value) {
  expectInvalidReport({ ...fixture(), [key]: value })
})
/** 嵌套字段严格遵循各自schema，缺失或额外私密字段不能放行。 / Nested fields obey their own schemas and reject missing or extra private fields. */
it.each([
  { title: '😀'.repeat(41) },
  { status: 'deleted' },
  { removeReason: 'x'.repeat(201) },
  { sellerPhone: 'secret' },
  { cover: { key: '', url: 'https://example.invalid/a', width: 1, height: 1 } },
  { cover: { key: 'a', url: '/relative.jpg', width: 1, height: 1 } },
  { cover: { key: 'a', url: 'https://example.invalid/a', width: 0, height: 1 } },
])('rejects invalid listing projection %j', function testInvalidListing(patch) {
  expectInvalidReport({ ...fixture(), listing: { ...fixture().listing, ...patch } })
})
/** 每个必填字段缺失都必须失败，不能补null或默认值。 / Every missing required field fails instead of receiving defaults or nulls. */
it.each(Object.keys(fixture()))('rejects missing required field %s', function testMissing(key) {
  const source: Record<string, unknown> = { ...fixture() }
  delete source[key]
  expectInvalidReport(source)
})
/** 分页容许共享扩展但校验页码、大小和每条内容，不自造总数关系。 / Allow shared page extensions while validating metadata and items without invented total relationships. */
it('validates page metadata, empty results and each item', function testPage() {
  expect(parseReportPage({ items: [], total: 0, page: 3, pageSize: 20, extension: true })).toEqual({
    items: [],
    total: 0,
    page: 3,
    pageSize: 20,
  })
  for (const patch of [
    { total: -1 },
    { total: Infinity },
    { page: 0 },
    { pageSize: 101 },
    { items: [{ ...fixture(), status: 'bad' }] },
  ])
    expectInvalidPage({ items: [], total: 0, page: 1, pageSize: 20, ...patch })
})

/** 非法请求必须在dispatch前拒绝，防止注入ID和伪造写入字段。 / Reject invalid requests before dispatch to prevent ID injection and forged write fields. */
it.each([
  { kind: 'id', value: '../1' },
  { kind: 'id', value: 1 },
  { kind: 'query', value: { status: '' } },
  { kind: 'query', value: { status: 'all' } },
  { kind: 'query', value: { page: 0 } },
  { kind: 'query', value: { pageSize: 101 } },
  { kind: 'query', value: { extra: 1 } },
  { kind: 'ignore', value: { version: 0, expectedStatus: 'handled' } },
  { kind: 'ignore', value: { version: 0, expectedStatus: 'open', handledBy: 'forged' } },
  {
    kind: 'takedown',
    value: { version: 0, expectedStatus: 'open', expectedListingStatus: 'on_sale' },
  },
  {
    kind: 'takedown',
    value: {
      version: 0,
      expectedStatus: 'open',
      expectedListingStatus: 'on_sale',
      reason: '  \n ',
    },
  },
  {
    kind: 'takedown',
    value: {
      version: 0,
      expectedStatus: 'open',
      expectedListingStatus: 'on_sale',
      reason: '😀'.repeat(201),
    },
  },
  {
    kind: 'takedown',
    value: {
      version: 0,
      expectedStatus: 'open',
      expectedListingStatus: 'sold',
      reason: 'must-not-overwrite',
    },
  },
  {
    kind: 'takedown',
    value: { version: -1, expectedStatus: 'open', expectedListingStatus: 'sold' },
  },
])('rejects invalid $kind input before HTTP', async function testInvalidInput({ kind, value }) {
  const dispatch = vi.spyOn(http, 'request')
  let request: Promise<unknown>
  if (kind === 'id') request = reportApi.get(value as string)
  else if (kind === 'query') request = reportApi.list(value as ListReportsQuery)
  else if (kind === 'ignore') request = reportApi.ignore('1', value as IgnoreReportInput)
  else request = reportApi.takedown('1', value as TakeDownReportInput)
  await expect(request).rejects.toMatchObject({
    kind: 'business',
    status: 400,
    code: 'VALIDATION_FAILED',
  })
  expect(dispatch).not.toHaveBeenCalled()
  dispatch.mockRestore()
})
/** 查询以真实HTTP发送，全部不传status且仅发送声明参数。 / Dispatch real HTTP queries, omitting all-status filters and undeclared parameters. */
it('sends pagination and optional status while unwrapping the response', async function testQueryTransport() {
  const queries: string[] = []
  /** 记录安全测试查询，返回空分页，不记录身份。 / Record safe test queries and return an empty page without identities. */
  function list({ request }: Parameters<HttpResponseResolver>[0]): Response {
    queries.push(new URL(request.url).search)
    return HttpResponse.json({ ok: true, data: { items: [], page: 1, pageSize: 20, total: 0 } })
  }
  server.use(mockHttp.get(`${baseURL}/reports`, list))
  expect((await reportApi.list()).items).toEqual([])
  await reportApi.list({ page: 2, pageSize: 10, status: 'open' })
  expect(queries).toEqual(['', '?page=2&pageSize=10&status=open'])
})
/** 同意的HTTP包装不能替代请求身份与写后版本核对。 / Successful HTTP envelopes cannot replace response identity and write-version checks. */
it.each([
  { id: '9000000000000000201' },
  { status: 'open' },
  { version: 7 },
  { handledBy: null },
  { handledAt: null },
] as const)(
  'rejects mismatched immediate ignore response %j',
  async function testWriteMismatch(patch) {
    const response = {
      ...fixture(),
      status: 'ignored',
      version: 8,
      handledBy: 'mock-admin',
      handledAt: '2026-11-01T00:06:00Z',
      ...patch,
    }
    server.use(mockHttp.post(`${baseURL}/reports/:id/ignore`, success(response)))
    await expect(
      reportApi.ignore(fixture().id, { version: 7, expectedStatus: 'open' }),
    ).rejects.toMatchObject({ kind: 'protocol' })
  },
)
/** 下架即时响应必须显示对应帖子分支，不能以已处理冒充真正下架。 / Immediate takedown responses must match the listing branch, not merely claim report handling. */
it.each([
  { status: 'on_sale', removeReason: 'valid reason' },
  { status: 'admin_removed', removeReason: 'different reason' },
])(
  'rejects a wrong on-sale takedown outcome %j',
  async function testTakedownMismatch(listingPatch) {
    const response = {
      ...fixture(),
      status: 'handled',
      version: 8,
      handledBy: 'mock-admin',
      handledAt: '2026-11-01T00:06:00Z',
      listing: { ...fixture().listing, ...listingPatch },
    }
    server.use(mockHttp.post(`${baseURL}/reports/:id/takedown`, success(response)))
    await expect(
      reportApi.takedown(fixture().id, {
        version: 7,
        expectedStatus: 'open',
        expectedListingStatus: 'on_sale',
        reason: 'valid reason',
      }),
    ).rejects.toMatchObject({ kind: 'protocol' })
  },
)
/** 非在售关闭分支不提交原因，并核对返回帖子状态未被改成后台下架。 / Off-sale closure omits reason and requires the original listing state in its response. */
it.each(['sold', 'self_removed', 'admin_removed'] as const)(
  'closes an already %s listing without a reason field',
  async function testOffSale(expectedListingStatus) {
    let submitted: unknown
    const response: Report = {
      ...fixture(),
      status: 'handled',
      version: 8,
      handledBy: 'mock-admin',
      handledAt: '2026-11-01T00:06:00Z',
      listing: {
        ...fixture().listing,
        status: expectedListingStatus,
        removeReason: 'original reason',
      },
    }
    /** 返回关闭投影并检查测试请求体，不执行真实业务写入。 / Capture the test body and return a closure projection without real writes. */
    async function close({ request }: Parameters<HttpResponseResolver>[0]): Promise<Response> {
      submitted = await request.json()
      return HttpResponse.json({ ok: true, data: response })
    }
    server.use(mockHttp.post(`${baseURL}/reports/:id/takedown`, close))
    expect(
      await reportApi.takedown(fixture().id, {
        version: 7,
        expectedStatus: 'open',
        expectedListingStatus,
      }),
    ).toEqual(response)
    expect(submitted).toEqual({ version: 7, expectedStatus: 'open', expectedListingStatus })
  },
)
/** 业务错误保留统一分类，失败不自动重复写入。 / Preserve normalized business errors without automatically repeating writes. */
it.each([
  { status: 401, code: 'NEED_LOGIN' },
  { status: 403, code: 'FORBIDDEN' },
  { status: 404, code: 'NOT_FOUND' },
  { status: 409, code: 'VERSION_CONFLICT' },
  { status: 409, code: 'INVALID_STATUS' },
  { status: 500, code: 'INTERNAL_ERROR' },
])('preserves $code without retry', async function testErrors({ status, code }) {
  let calls = 0
  /** 返回指定契约错误并计数，避免真实流量。 / Return the declared error and count requests without real traffic. */
  function failure(): Response {
    calls += 1
    return HttpResponse.json({ ok: false, code, message: 'synthetic error' }, { status })
  }
  server.use(mockHttp.post(`${baseURL}/reports/:id/ignore`, failure))
  await expect(
    reportApi.ignore(fixture().id, { version: 7, expectedStatus: 'open' }),
  ).rejects.toMatchObject({ kind: 'business', status, code })
  expect(calls).toBe(1)
})
/** 取消读取由HttpClient分类，不得返回空列表或成功。 / Canceled reads retain the client classification instead of becoming empty success. */
it('forwards cancellation to the real client', async function testCancellation() {
  /** 延迟测试响应以验证取消，不访问真实后端。 / Delay the test response to verify cancellation without a real backend. */
  async function delayed(): Promise<Response> {
    await delay(30)
    return HttpResponse.json({ ok: true, data: fixture() })
  }
  server.use(mockHttp.get(`${baseURL}/reports/:id`, delayed))
  const controller = new AbortController(),
    pending = reportApi.get(fixture().id, controller.signal)
  controller.abort()
  await expect(pending).rejects.toMatchObject({ kind: 'canceled' })
})
/** 默认Mock与真实API逐条往返，校验完整快照和两个写分支。 / Roundtrip every default Mock through the real API, including both write branches. */
it('roundtrips default mock reads, ignore, on-sale takedown and off-sale closure', async function testDefaultMock() {
  const mock = createReportMock({ baseURL })
  server.use(...mock.handlers)
  /** 返回合成管理员token，不读取真实会话。 / Return a synthetic reviewer token without reading a real session. */
  function getToken(): string {
    return REPORT_MOCK_TOKENS.reviewer
  }
  /** 测试中无需登录导航，保持无副作用。 / Omit login navigation in this isolated test. */
  function onNeedLogin(): void {}
  http.setAuth({ getToken, onNeedLogin })
  const fixtures = createReportFixtures()
  expect((await reportApi.list()).total).toBe(fixtures.length)
  for (const report of fixtures)
    expect(await reportApi.get(report.id)).toMatchObject({ id: report.id, status: report.status })
  const first = await reportApi.get('9000000000000000200')
  expect(
    (await reportApi.ignore(first.id, { version: first.version, expectedStatus: 'open' })).status,
  ).toBe('ignored')
  const onSale = await reportApi.get('9000000000000000204')
  const removed = await reportApi.takedown(onSale.id, {
    version: onSale.version,
    expectedStatus: 'open',
    expectedListingStatus: 'on_sale',
    reason: '虚构下架原因',
  })
  expect(removed.listing).toMatchObject({ status: 'admin_removed', removeReason: '虚构下架原因' })
  const offSale = await reportApi.get('9000000000000000201')
  if (offSale.listing.status === 'on_sale') throw new Error('off-sale fixture required')
  const closed = await reportApi.takedown(offSale.id, {
    version: offSale.version,
    expectedStatus: 'open',
    expectedListingStatus: offSale.listing.status,
  })
  expect(closed.listing).toEqual(offSale.listing)
})
