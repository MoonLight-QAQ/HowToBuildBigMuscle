// @vitest-environment node
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { createReportFixtures, createReportListingFixtures } from '@/mocks/data/report'
import { createReportMock, REPORT_MOCK_TOKENS } from './report'

const baseURL = 'http://localhost:48232/api/admin'
const reportId = '9000000000000000200'
const listingId = '9000000000000000300'
let mock = createReportMock({ baseURL })
const server = setupServer()
/** 启动严格隔离拦截，禁止未声明请求透传。 / Start isolated interception without allowing undeclared requests through. */
beforeAll(function startServer() {
  server.listen({ onUnhandledFrame: 'error' })
})
/** 每次恢复独立账本和handler，不影响其他测试。 / Restore isolated state and handlers before each test. */
beforeEach(function resetMock() {
  mock = createReportMock({ baseURL })
  server.resetHandlers(...mock.handlers)
})
/** 关闭拦截，不遗留网络适配器。 / Close interception without leaving network adapters behind. */
afterAll(function stopServer() {
  server.close()
})

/** 请求合成管理接口；可替换身份和请求体，不使用真实凭据。 / Request a synthetic admin endpoint with optional identity/body, without real credentials. */
async function request(
  path: string,
  body?: unknown,
  token: string | null = REPORT_MOCK_TOKENS.reviewer,
): Promise<Response> {
  return fetch(`${baseURL}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}
/** 构造已读版本和待处理状态；可追加下架分支字段，无副作用。 / Build read-version/open preconditions plus optional takedown fields without effects. */
function input(extra: Record<string, unknown> = {}) {
  return { version: 0, expectedStatus: 'open', ...extra }
}
/** 验证契约失败码和HTTP状态。 / Verify contract error code and HTTP status. */
async function expectFailure(response: Response, status: number, code: string): Promise<void> {
  expect(response.status).toBe(status)
  expect(await response.json()).toMatchObject({ ok: false, code })
}

/** 默认数据展示所有状态，分页只过滤举报状态，读取不改变帖子浏览标记。 / Default data covers states; pagination filters reports only and reads never mark listings seen. */
it('paginates all twelve reports and filters eight open reports without read mutation', async function testPagination() {
  const before = mock.inspectListing(listingId)
  const all = await (await request('/reports')).json()
  expect(all.data).toMatchObject({ total: 12, page: 1, pageSize: 20 })
  expect(all.data.items).toHaveLength(12)
  expect(
    new Set(
      all.data.items.map(
        /** 收集状态验证默认覆盖；无副作用。 / Collect statuses to verify default coverage without effects. */
        function status(report: { status: string }) {
          return report.status
        },
      ),
    ),
  ).toEqual(new Set(['open', 'ignored', 'handled']))
  const page = await (await request('/reports?status=open&page=2&pageSize=5')).json()
  expect(page.data).toMatchObject({ total: 8, page: 2, pageSize: 5 })
  expect(page.data.items).toHaveLength(3)
  await request(`/reports/${reportId}`)
  expect(mock.inspectListing(listingId)).toEqual(before)
})

/** 当前页超出数据时返回空页，使用大整数分页仍不溢出。 / Return empty pages for out-of-range safe pagination without overflow. */
it('returns empty pages for large safe offsets and empty stores', async function testEmpty() {
  expect(
    (await (await request('/reports?page=9007199254740991&pageSize=100')).json()).data.items,
  ).toEqual([])
  mock = createReportMock({ baseURL, reports: [] })
  server.resetHandlers(...mock.handlers)
  expect((await (await request('/reports')).json()).data).toEqual({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  })
})

/** 非法查询拒绝而不退化为全部列表。 / Reject invalid queries instead of silently showing all reports. */
it.each([
  '?status=',
  '?status=unknown',
  '?page=0',
  '?page=1.5',
  '?page=-1',
  '?page=9007199254740992',
  '?pageSize=101',
  '?pageSize=0',
  '?page=1&page=2',
  '?status=open&status=handled',
  '?other=1',
])('rejects invalid list query %s', async function testInvalidQuery(query) {
  await expectFailure(await request(`/reports${query}`), 400, 'VALIDATION_FAILED')
})

/** 合成身份的读写权限分开，拒绝前不提交任何修改。 / Separate synthetic read/write permissions and refuse mutations before commit. */
it.each([
  { token: null, status: 401, code: 'NEED_LOGIN' },
  { token: 'mock-customer', status: 401, code: 'NEED_LOGIN' },
  { token: REPORT_MOCK_TOKENS.denied, status: 403, code: 'FORBIDDEN' },
])(
  'rejects unauthorized $status identities before reads/writes',
  async function testAuthorization({ token, status, code }) {
    const before = mock.inspectReport(reportId)
    for (const path of ['/reports', `/reports/${reportId}`])
      await expectFailure(await request(path, undefined, token), status, code)
    await expectFailure(await request(`/reports/${reportId}/ignore`, input(), token), status, code)
    await expectFailure(
      await request(
        `/reports/${reportId}/takedown`,
        input({ expectedListingStatus: 'on_sale', reason: '原因' }),
        token,
      ),
      status,
      code,
    )
    expect(mock.inspectReport(reportId)).toEqual(before)
  },
)

/** 只读管理员可以读取，但两个写接口都不能提交。 / Allow reads for read-only admins while forbidding both write operations. */
it('permits readonly reads while blocking every write', async function testReadonly() {
  expect((await request('/reports', undefined, REPORT_MOCK_TOKENS.readonly)).status).toBe(200)
  expect(
    (await request(`/reports/${reportId}`, undefined, REPORT_MOCK_TOKENS.readonly)).status,
  ).toBe(200)
  await expectFailure(
    await request(`/reports/${reportId}/ignore`, input(), REPORT_MOCK_TOKENS.readonly),
    403,
    'FORBIDDEN',
  )
  await expectFailure(
    await request(
      `/reports/${reportId}/takedown`,
      input({ expectedListingStatus: 'on_sale', reason: '原因' }),
      REPORT_MOCK_TOKENS.readonly,
    ),
    403,
    'FORBIDDEN',
  )
})

/** 无效ID或额外资源查询返回400，合法但不存在的ID返回404。 / Distinguish malformed resources from missing valid IDs. */
it.each(['/reports/not-an-id', '/reports/123456789012345678901', `/reports/${reportId}?extra=1`])(
  'rejects malformed resource %s',
  async function testResource(path) {
    await expectFailure(await request(path), 400, 'VALIDATION_FAILED')
  },
)
/** 不存在记录和逻辑删除在列表及单项中都不可见。 / Exclude missing and logically deleted records from lists and detail reads. */
it('hides logical report/listing deletion and nonexistent IDs', async function testDeleted() {
  await expectFailure(await request('/reports/999'), 404, 'NOT_FOUND')
  mock = createReportMock({ baseURL, deletedReportIds: [reportId] })
  server.resetHandlers(...mock.handlers)
  await expectFailure(await request(`/reports/${reportId}`), 404, 'NOT_FOUND')
  expect((await (await request('/reports')).json()).data.total).toBe(11)
  mock = createReportMock({ baseURL })
  server.resetHandlers(...mock.handlers)
  mock.updateListing(listingId, { isDeleted: true })
  await expectFailure(await request(`/reports/${reportId}/ignore`, input()), 404, 'NOT_FOUND')
  expect(mock.inspectReport(reportId)).toBeUndefined()
})

/** 已删除评论正文与私有扩展字段不会进入公开举报投影。 / Strip deleted comment text and private extras from public report projections. */
it('redacts deleted comments and projects only allowed user/listing fields', async function testPrivacy() {
  const reports = createReportFixtures()
  reports[0]!.comment = { id: '55', content: '已删除的私密正文', deleted: true }
  Object.assign(reports[0]!.reporter, { phone: 'private-phone', wechat: 'private-wechat' })
  Object.assign(reports[0]!.listing, { sellerPhone: 'private-seller' })
  mock = createReportMock({ baseURL, reports })
  server.resetHandlers(...mock.handlers)
  const report = (await (await request(`/reports/${reportId}`)).json()).data
  expect(report.comment).toEqual({ id: '55', content: '', deleted: true })
  expect(JSON.stringify(report)).not.toMatch(/private|私密正文/)
  expect(Object.keys(report.reporter)).toEqual(['id', 'nickname'])
})

/** 忽略只修改举报状态与审计版本，帖子及评论保持原样。 / Ignore changes only report state/audit/version, preserving listings and comments. */
it('ignores an open report without changing listing or comment', async function testIgnore() {
  const beforeListing = mock.inspectListing(listingId),
    beforeReport = mock.inspectReport(reportId)!
  const response = await request(`/reports/${reportId}/ignore`, input())
  expect(response.status).toBe(200)
  const after = (await response.json()).data
  expect(after).toMatchObject({ status: 'ignored', version: 1, handledBy: 'mock-report-admin' })
  expect(after.handledAt).toMatch(/Z$/)
  expect(after.comment).toEqual(beforeReport.comment)
  expect(mock.inspectListing(listingId)).toEqual(beforeListing)
  await expectFailure(
    await request(`/reports/${reportId}/ignore`, input()),
    409,
    'VERSION_CONFLICT',
  )
})

/** 评论举报也下架整帖，原子更新举报与帖子，内容及已浏览版本不变。 / Comment reports remove the whole listing atomically without content/seen-version changes. */
it('takes down an on-sale listing for a comment report and preserves seen metadata', async function testTakedown() {
  const id = '9000000000000000204',
    listing = '9000000000000000304'
  const before = mock.inspectListing(listing)!
  const response = await request(
    `/reports/${id}/takedown`,
    input({ expectedListingStatus: 'on_sale', reason: '  虚构核验原因  ' }),
  )
  expect(response.status).toBe(200)
  const after = (await response.json()).data
  expect(after).toMatchObject({
    status: 'handled',
    version: 1,
    listing: { status: 'admin_removed', removeReason: '  虚构核验原因  ' },
  })
  expect(after.comment).toEqual(mock.inspectReport(id)!.comment)
  expect(mock.inspectListing(listing)).toEqual({
    ...before,
    status: 'admin_removed',
    removeReason: '  虚构核验原因  ',
    version: before.version + 1,
  })
})

/** 处理已非在售的举报不覆盖帖子原状态、原因或版本。 / Close reports for off-sale listings without overwriting state, reason or version. */
it.each([
  { index: 1, status: 'sold' },
  { index: 2, status: 'self_removed' },
  { index: 3, status: 'admin_removed' },
])(
  'closes $status reports while preserving existing listing',
  async function testOffSale({ index, status }) {
    const id = String(9000000000000000200n + BigInt(index)),
      listing = String(9000000000000000300n + BigInt(index))
    const before = mock.inspectListing(listing)
    expect(
      (await request(`/reports/${id}/takedown`, input({ expectedListingStatus: status }))).status,
    ).toBe(200)
    expect(mock.inspectReport(id)!.status).toBe('handled')
    expect(mock.inspectListing(listing)).toEqual(before)
  },
)

/** 同帖其他举报读取当前帖子投影，但不会一起被关闭。 / Other reports for the same listing read its current projection without being closed together. */
it('refreshes shared listing projections without closing unrelated reports', async function testSharedListing() {
  const reports = createReportFixtures()
  reports[1]!.listing = structuredClone(reports[0]!.listing)
  mock = createReportMock({ baseURL, reports })
  server.resetHandlers(...mock.handlers)
  await request(
    `/reports/${reportId}/takedown`,
    input({ expectedListingStatus: 'on_sale', reason: '核验原因' }),
  )
  const other = (await (await request('/reports/9000000000000000201')).json()).data
  expect(other).toMatchObject({
    status: 'open',
    version: 0,
    listing: { status: 'admin_removed', removeReason: '核验原因' },
  })
})

/** 非法写体（含伪造操作者与原因分支错误）拒绝且无半写。 / Reject invalid bodies including forged actors or reason-branch violations without partial writes. */
it.each([
  {},
  input({ expectedStatus: 'handled' }),
  input({ version: -1 }),
  input({ version: 0.5 }),
  input({ handledBy: 'forged' }),
  input({ expectedListingStatus: 'on_sale' }),
  input({ expectedListingStatus: 'on_sale', reason: '' }),
  input({ expectedListingStatus: 'on_sale', reason: '  \n' }),
  input({ expectedListingStatus: 'on_sale', reason: '😀'.repeat(201) }),
  input({ expectedListingStatus: 'sold', reason: '不允许覆盖' }),
  input({ expectedListingStatus: 'unknown' }),
  input({ expectedListingStatus: ['sold'] }),
  input({ expectedListingStatus: { status: 'sold' } }),
  input({ expectedListingStatus: 1 }),
])('rejects invalid takedown body %# without mutation', async function testBadBody(body) {
  const beforeReport = mock.inspectReport(reportId),
    beforeListing = mock.inspectListing(listingId)
  await expectFailure(
    await request(`/reports/${reportId}/takedown`, body),
    400,
    'VALIDATION_FAILED',
  )
  expect(mock.inspectReport(reportId)).toEqual(beforeReport)
  expect(mock.inspectListing(listingId)).toEqual(beforeListing)
})

/** 非JSON及损坏JSON请求体不能进入审核。 / Reject non-JSON and malformed JSON bodies before review. */
it('rejects malformed JSON and extra ignore fields', async function testMalformedBody() {
  const response = await fetch(`${baseURL}/reports/${reportId}/ignore`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REPORT_MOCK_TOKENS.reviewer}`,
      'Content-Type': 'application/json',
    },
    body: '{',
  })
  await expectFailure(response, 400, 'VALIDATION_FAILED')
  await expectFailure(
    await request(`/reports/${reportId}/ignore`, input({ reason: 'extra' })),
    400,
    'VALIDATION_FAILED',
  )
})

/** 最多200个Unicode码点的有效原因按原值保存。 / Preserve a valid reason of up to 200 Unicode code points exactly. */
it('accepts 200 Unicode code points without UTF16 truncation', async function testUnicode() {
  const reason = '😀'.repeat(200)
  expect(
    (
      await request(
        `/reports/${reportId}/takedown`,
        input({ expectedListingStatus: 'on_sale', reason }),
      )
    ).status,
  ).toBe(200)
  expect(mock.inspectListing(listingId)!.removeReason).toBe(reason)
})

/** 举报旧版本、旧状态或帖子旧状态变化均拒绝且不提交另一实体。 / Reject stale report versions/states or listing states without committing the other entity. */
it('rejects conflicts atomically and preserves externally changed listing data', async function testConflict() {
  const beforeReport = mock.inspectReport(reportId)
  await expectFailure(
    await request(`/reports/${reportId}/ignore`, input({ version: 3 })),
    409,
    'VERSION_CONFLICT',
  )
  mock.updateListing(listingId, { status: 'sold', removeReason: '已有说明' })
  const external = mock.inspectListing(listingId)
  await expectFailure(
    await request(
      `/reports/${reportId}/takedown`,
      input({ expectedListingStatus: 'on_sale', reason: '不能覆盖' }),
    ),
    409,
    'INVALID_STATUS',
  )
  expect(mock.inspectReport(reportId)).toEqual({
    ...beforeReport,
    listing: { ...beforeReport!.listing, status: 'sold', removeReason: '已有说明' },
  })
  expect(mock.inspectListing(listingId)).toEqual(external)
  await expectFailure(
    await request('/reports/9000000000000000208/ignore', input({ version: 1 })),
    409,
    'INVALID_STATUS',
  )
})

/** 同一版本并发处理只允许一个提交，不重复更新帖子版本。 / Concurrent reviews of one version allow one commit without duplicate listing updates. */
it('allows a single winner for concurrent same-version writes', async function testConcurrency() {
  const body = input({ expectedListingStatus: 'on_sale', reason: '并发核验' })
  const responses = await Promise.all([
    request(`/reports/${reportId}/takedown`, body),
    request(`/reports/${reportId}/takedown`, body),
  ])
  expect(
    responses
      .map(
        /** 提取HTTP状态后排序比较；不改变业务数据。 / Collect HTTP statuses without business mutation. */
        function status(response) {
          return response.status
        },
      )
      .sort(),
  ).toEqual([200, 409])
  expect(mock.inspectReport(reportId)!.version).toBe(1)
  expect(mock.inspectListing(listingId)!.version).toBe(5)
})

/** 安全整数上限不能递增，举报或帖子溢出时双方都不提交。 / Refuse report/listing version overflow without committing either entity. */
it.each(['report', 'listing'])(
  'prevents %s version overflow atomically',
  async function testOverflow(entity) {
    const reports = createReportFixtures(),
      listings = createReportListingFixtures(reports)
    if (entity === 'report') reports[0]!.version = Number.MAX_SAFE_INTEGER
    else listings[0]!.version = Number.MAX_SAFE_INTEGER
    mock = createReportMock({ baseURL, reports, listings })
    server.resetHandlers(...mock.handlers)
    const beforeReport = mock.inspectReport(reportId),
      beforeListing = mock.inspectListing(listingId)
    await expectFailure(
      await request(
        `/reports/${reportId}/takedown`,
        input({ version: reports[0]!.version, expectedListingStatus: 'on_sale', reason: '核验' }),
      ),
      409,
      'VERSION_CONFLICT',
    )
    expect(mock.inspectReport(reportId)).toEqual(beforeReport)
    expect(mock.inspectListing(listingId)).toEqual(beforeListing)
  },
)

/** 工厂与检查副本相互隔离，外部修改不会悄悄改写仓库。 / Isolate factory seeds and inspection copies from accidental external mutations. */
it('isolates seed data, instances and inspection snapshots', async function testIsolation() {
  const reports = createReportFixtures()
  mock = createReportMock({ baseURL, reports })
  server.resetHandlers(...mock.handlers)
  const other = createReportMock({ reports })
  reports[0]!.status = 'handled'
  const snapshot = mock.inspectListing(listingId)!
  snapshot.status = 'sold'
  await request(`/reports/${reportId}/ignore`, input())
  expect(mock.inspectListing(listingId)!.status).toBe('on_sale')
  expect(other.inspectReport(reportId)!.status).toBe('open')
})
