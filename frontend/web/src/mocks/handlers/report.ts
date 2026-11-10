import { http, HttpResponse, type HttpHandler, type HttpResponseResolver } from 'msw/http'
import type { components } from '@/api/generated/admin'
import { ERROR_CODE, type ErrorDefinition } from '@/constants/error-code'
import {
  createReportFixtures,
  createReportListingFixtures,
  type ReportMockListing,
} from '@/mocks/data/report'

type Report = components['schemas']['Report']
type ResolverInput = Parameters<HttpResponseResolver>[0]
type Body = Record<string, unknown>
export const REPORT_MOCK_TOKENS = {
  reviewer: 'mock-report-reviewer',
  readonly: 'mock-report-readonly',
  denied: 'mock-report-denied',
} as const
export type ReportMockOptions = {
  baseURL?: string
  reports?: readonly Report[]
  listings?: readonly ReportMockListing[]
  deletedReportIds?: readonly string[]
}

/** 返回不回显请求资料的契约错误；输入定义和HTTP状态，无状态修改。 / Return a safe contract error by definition/status without request disclosure or mutation. */
function fail(error: ErrorDefinition, status: number): Response {
  return HttpResponse.json<components['schemas']['ErrorResponse']>(
    { ok: false, code: error.code, message: error.message },
    { status },
  )
}
/** 验证合成管理员权限；只读身份不能写，失败前不读取业务记录。 / Authorize synthetic admins before business reads; read-only identities cannot write. */
function authorize(request: Request, write = false): Response | undefined {
  const token = request.headers.get('authorization')
  if (token === `Bearer ${REPORT_MOCK_TOKENS.reviewer}`) return undefined
  if (token === `Bearer ${REPORT_MOCK_TOKENS.readonly}`)
    return write ? fail(ERROR_CODE.FORBIDDEN, 403) : undefined
  return token === `Bearer ${REPORT_MOCK_TOKENS.denied}`
    ? fail(ERROR_CODE.FORBIDDEN, 403)
    : fail(ERROR_CODE.NEED_LOGIN, 401)
}
/** 校验查询白名单及重复字段；返回布尔，不改变记录。 / Validate allowed and unique query keys without changing records. */
function validQuery(url: URL, allowed: readonly string[]): boolean {
  for (const key of url.searchParams.keys())
    if (!allowed.includes(key) || url.searchParams.getAll(key).length !== 1) return false
  return true
}
/** 解析正整数分页，非法返回null；不转换资源ID。 / Parse positive pagination integers or null without converting resource IDs. */
function pageValue(
  value: string | null,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number | null {
  if (value === null) return fallback
  if (!/^[1-9][0-9]*$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null
}
/** 校验资源ID和无额外查询；只作格式检查，无副作用。 / Validate resource ID and absence of extra query parameters without effects. */
function validResource(input: ResolverInput): input is ResolverInput & { params: { id: string } } {
  return (
    typeof input.params.id === 'string' &&
    /^[0-9]{1,20}$/.test(input.params.id) &&
    validQuery(new URL(input.request.url), [])
  )
}
/** 读取JSON对象，格式错误返回null，不修正请求字段。 / Read a JSON object or null without coercing request fields. */
async function readBody(request: Request): Promise<Body | null> {
  if (
    request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json'
  )
    return null
  try {
    const value: unknown = await request.json()
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Body)
      : null
  } catch {
    return null
  }
}
/** 校验精确字段集合及审核基本体；返回布尔，不修改版本。 / Validate exact fields and the review body without modifying versions. */
function validBody(body: Body, keys: readonly string[]): boolean {
  return (
    Object.keys(body).length === keys.length &&
    keys.every(
      /** 逐个确认必填字段存在；无副作用。 / Confirm required fields without effects. */
      function hasKey(key) {
        return Object.hasOwn(body, key)
      },
    ) &&
    typeof body.version === 'number' &&
    Number.isSafeInteger(body.version) &&
    body.version >= 0 &&
    body.expectedStatus === 'open'
  )
}
/** 检查在售下架原因的码点长度及非空白内容，不裁剪或替换用户输入。 / Check reason code-point length and nonblank content without altering the input. */
function validReason(reason: unknown): reason is string {
  return (
    typeof reason === 'string' &&
    [...reason].length >= 1 &&
    [...reason].length <= 200 &&
    /\S/u.test(reason)
  )
}
/** 创建独立举报和帖子状态仓库，只有内存测试端口，没有公开控制接口。 / Create isolated report/listing state with in-memory test ports and no public control endpoint. */
export function createReportMock(options: ReportMockOptions = {}) {
  const baseURL = options.baseURL ?? import.meta.env.VITE_API_BASE_URL
  const seeds = structuredClone(options.reports ?? createReportFixtures())
  const reports = new Map<string, Report>()
  const listings = new Map<string, ReportMockListing>()
  const deleted = new Set(options.deletedReportIds ?? [])
  for (const report of seeds) reports.set(report.id, report)
  for (const listing of structuredClone(options.listings ?? createReportListingFixtures(seeds)))
    listings.set(listing.id, listing)
  /** 生成当前只读投影，排除私有字段并清空已删除评论正文；不更新已浏览。 / Project current state, omitting private fields and deleted comment text without marking seen. */
  function project(report: Report): Report | undefined {
    const listing = listings.get(report.listing.id)
    if (deleted.has(report.id) || !listing || listing.isDeleted) return undefined
    return structuredClone({
      id: report.id,
      listing: {
        id: listing.id,
        title: listing.title,
        status: listing.status,
        cover: {
          key: listing.cover.key,
          url: listing.cover.url,
          width: listing.cover.width,
          height: listing.cover.height,
        },
        removeReason: listing.removeReason,
      },
      comment:
        report.comment === null
          ? null
          : {
              id: report.comment.id,
              content: report.comment.deleted ? '' : report.comment.content,
              deleted: report.comment.deleted,
            },
      reason: report.reason,
      extra: report.extra,
      reporter: { id: report.reporter.id, nickname: report.reporter.nickname },
      status: report.status,
      handledBy: report.handledBy,
      handledAt: report.handledAt,
      createdAt: report.createdAt,
      version: report.version,
    })
  }
  /** 分页读取当前举报投影；不下架帖子、不修改浏览标记。 / Read current report projections with pagination without removing or marking listings seen. */
  function listReports({ request }: ResolverInput): Response {
    const denied = authorize(request)
    if (denied) return denied
    const url = new URL(request.url)
    const page = pageValue(url.searchParams.get('page'), 1),
      pageSize = pageValue(url.searchParams.get('pageSize'), 20, 100)
    const status = url.searchParams.get('status')
    if (
      !validQuery(url, ['page', 'pageSize', 'status']) ||
      page === null ||
      pageSize === null ||
      (status !== null && !['open', 'ignored', 'handled'].includes(status))
    )
      return fail(ERROR_CODE.VALIDATION_FAILED, 400)
    const items: Report[] = []
    for (const report of reports.values()) {
      const current = project(report)
      if (current && (status === null || current.status === status)) items.push(current)
    }
    const offset = (BigInt(page) - 1n) * BigInt(pageSize)
    return HttpResponse.json({
      ok: true,
      data: {
        items:
          offset >= BigInt(items.length)
            ? []
            : items.slice(Number(offset), Number(offset) + pageSize),
        total: items.length,
        page,
        pageSize,
      },
    })
  }
  /** 读取单个举报当前投影；不存在或逻辑删除时返回404，不改变内容。 / Read one current report or 404 for absent/logically deleted data without mutation. */
  function getReport(input: ResolverInput): Response {
    const denied = authorize(input.request)
    if (denied) return denied
    if (!validResource(input)) return fail(ERROR_CODE.VALIDATION_FAILED, 400)
    const report = reports.get(input.params.id),
      current = report && project(report)
    return current
      ? HttpResponse.json({ ok: true, data: current })
      : fail(ERROR_CODE.NOT_FOUND, 404)
  }
  /** 验证后一次性提交举报与适用的帖子更新；失败无半写，不更新内容或浏览版本。 / Commit report and applicable listing updates atomically after validation, without content/seen changes. */
  async function review(input: ResolverInput, takedown: boolean): Promise<Response> {
    const denied = authorize(input.request, true)
    if (denied) return denied
    if (!validResource(input)) return fail(ERROR_CODE.VALIDATION_FAILED, 400)
    const body = await readBody(input.request)
    const keys = !takedown
      ? ['version', 'expectedStatus']
      : body?.expectedListingStatus === 'on_sale'
        ? ['version', 'expectedStatus', 'expectedListingStatus', 'reason']
        : ['version', 'expectedStatus', 'expectedListingStatus']
    if (
      !body ||
      !validBody(body, keys) ||
      (takedown &&
        (typeof body.expectedListingStatus !== 'string' ||
          !['on_sale', 'sold', 'self_removed', 'admin_removed'].includes(
            body.expectedListingStatus,
          ) ||
          (body.expectedListingStatus === 'on_sale' && !validReason(body.reason))))
    )
      return fail(ERROR_CODE.VALIDATION_FAILED, 400)
    const report = reports.get(input.params.id),
      current = report && project(report)
    if (!report || !current) return fail(ERROR_CODE.NOT_FOUND, 404)
    const listing = listings.get(report.listing.id)!
    if (report.version !== body.version || report.version >= Number.MAX_SAFE_INTEGER)
      return fail(ERROR_CODE.VERSION_CONFLICT, 409)
    if (report.status !== 'open' || (takedown && listing.status !== body.expectedListingStatus))
      return fail(ERROR_CODE.INVALID_STATUS, 409)
    const shouldRemove = takedown && listing.status === 'on_sale'
    if (
      shouldRemove &&
      (!Number.isSafeInteger(listing.version) ||
        listing.version < 0 ||
        listing.version >= Number.MAX_SAFE_INTEGER)
    )
      return fail(ERROR_CODE.VERSION_CONFLICT, 409)
    const nextReport: Report = {
      ...report,
      status: takedown ? 'handled' : 'ignored',
      version: report.version + 1,
      handledBy: 'mock-report-admin',
      handledAt: new Date().toISOString(),
    }
    if (shouldRemove)
      listings.set(listing.id, {
        ...listing,
        status: 'admin_removed',
        removeReason: body.reason as string,
        version: listing.version + 1,
      })
    reports.set(report.id, nextReport)
    return HttpResponse.json({ ok: true, data: project(nextReport)! })
  }
  /** 忽略待处理举报，保持帖子和评论不变。 / Ignore an open report without changing its listing or comment. */
  function ignoreReport(input: ResolverInput): Promise<Response> {
    return review(input, false)
  }
  /** 在售则下架整帖，非在售仅关闭举报；两者均使用已读状态条件。 / Remove the whole on-sale listing or close an off-sale report using read-state preconditions. */
  function takeDownReport(input: ResolverInput): Promise<Response> {
    return review(input, true)
  }
  /** 返回当前举报副本，仅供本地验证，不暴露HTTP控制能力。 / Inspect a report copy for local verification without HTTP controls. */
  function inspectReport(id: string): Report | undefined {
    const report = reports.get(id)
    return report && project(report)
  }
  /** 返回内部帖子账本副本，用于核对内容和浏览版本未变。 / Inspect a listing ledger copy to verify unchanged content and seen versions. */
  function inspectListing(id: string): ReportMockListing | undefined {
    const listing = listings.get(id)
    return listing && structuredClone(listing)
  }
  /** 模拟外部状态变化的内存端口；成功增加帖子版本，不改变内容或浏览标记。 / Simulate external listing state changes in memory, incrementing its version without content/seen changes. */
  function updateListing(
    id: string,
    patch: Partial<Pick<ReportMockListing, 'status' | 'removeReason' | 'isDeleted'>>,
  ): boolean {
    const listing = listings.get(id)
    if (!listing || listing.version >= Number.MAX_SAFE_INTEGER) return false
    listings.set(id, { ...listing, ...patch, version: listing.version + 1 })
    return true
  }
  const handlers: HttpHandler[] = [
    http.get(`${baseURL}/reports`, listReports),
    http.get(`${baseURL}/reports/:id`, getReport),
    http.post(`${baseURL}/reports/:id/ignore`, ignoreReport),
    http.post(`${baseURL}/reports/:id/takedown`, takeDownReport),
  ]
  return { handlers, inspectReport, inspectListing, updateListing }
}

export const reportMock = createReportMock()
export const reportHandlers = reportMock.handlers
