import { http, HttpResponse, type HttpHandler, type HttpResponseResolver } from 'msw/http'
import type { components } from '@/api/generated/admin'
import { ERROR_CODE } from '@/constants/error-code'
import {
  createDashboardData,
  type DashboardMockCity,
  type DashboardMockData,
  type DashboardMockZone,
} from '../data/dashboard'

// 模拟服务端使用契约 Cookie 名和合成会话标识。 / Use the contract cookie name with synthetic Mock sessions.
export const DASHBOARD_MOCK_COOKIE = '__Host-pickaus_admin'
export const DASHBOARD_MOCK_SESSIONS = {
  reader: 'mock-dashboard-reader',
  denied: 'mock-dashboard-denied',
} as const

type ResolverInput = Parameters<HttpResponseResolver>[0]
export type DashboardMockRole = keyof typeof DASHBOARD_MOCK_SESSIONS
type ReadDashboardMockRole = (cookies: ResolverInput['cookies']) => DashboardMockRole | null

/** 中文：读取模拟请求 Cookie，未知会话返回 null。 English: Read the Mock request cookie and return null for unknown sessions. */
function readCookieRole(cookies: ResolverInput['cookies']): DashboardMockRole | null {
  const session = cookies[DASHBOARD_MOCK_COOKIE]
  if (session === DASHBOARD_MOCK_SESSIONS.reader) return 'reader'
  if (session === DASHBOARD_MOCK_SESSIONS.denied) return 'denied'
  return null
}

/** 判断大区是否至少有一个最终可送成员，空成员返回false。 / Check whether at least one member is deliverable, returning false for an empty zone. */
function hasDeliverableMember(zone: DashboardMockZone): boolean {
  return zone.members.some(
    /** 成员设置优先，null时使用大区默认。 / Prefer the member override and use the zone default for null. */
    function isDeliverable(member) {
      return member.deliverableOverride ?? zone.deliverable
    },
  )
}

/** 按大区sort升序比较，返回排序所需的差值。 / Compare zones by ascending sort order. */
function compareZoneSort(first: DashboardMockZone, second: DashboardMockZone): number {
  return first.sort - second.sort
}

/** 读取大区中文名供摘要投影，无副作用。 / Read a zone's Chinese name for the summary without effects. */
function zoneName(zone: DashboardMockZone): string {
  return zone.nameZh
}

/** 按最终可送成员投影线下大区，快递城市的摘要大区列表为空。 / Project local zones with deliverable members and an empty summary list for post cities. */
function projectCity(city: DashboardMockCity): components['schemas']['CityOverview'] {
  return {
    id: city.id,
    nameZh: city.nameZh,
    fulfillment: city.fulfillment,
    deliverableZoneNamesZh:
      city.fulfillment === 'local'
        ? city.zones.filter(hasDeliverableMember).sort(compareZoneSort).map(zoneName)
        : [],
  }
}

/** 按当前记录统计待办并汇总配送大区，返回只读响应投影。 / Count current workload and aggregate delivery zones into a read-only response. */
function readSummary(source: DashboardMockData): components['schemas']['Summary'] {
  let pendingOrderCount = 0
  let deliveringOrderCount = 0
  let openRefundCount = 0
  let openReportCount = 0
  for (const order of source.orders) {
    if (order.status === 'pending') pendingOrderCount += 1
    if (order.status === 'delivering') deliveringOrderCount += 1
  }
  for (const refund of source.refunds) {
    if (refund.status === 'open') openRefundCount += 1
  }
  for (const report of source.reports) {
    if (report.status === 'open') openReportCount += 1
  }
  const { cities, localFeeCents, postFeeCents, freeShippingThresholdCents } = source.delivery
  return {
    pendingOrderCount,
    deliveringOrderCount,
    openRefundCount,
    openReportCount,
    cities: cities.map(projectCity),
    localFeeCents,
    postFeeCents,
    freeShippingThresholdCents,
  }
}

/** 创建独立GET拦截器；按会话解析器授权后读取摘要，默认从模拟请求 Cookie 获取身份。 / Read the summary after resolving authorization, using Mock request cookies by default. */
export function createDashboardHandlers(
  source: DashboardMockData = createDashboardData(),
  baseURL: string = import.meta.env.VITE_API_BASE_URL,
  readRole: ReadDashboardMockRole = readCookieRole,
): HttpHandler[] {
  /** 校验合成身份并返回当前摘要；不回显身份，不写业务记录。 / Authorize a synthetic identity and return the current summary without credential echo or business writes. */
  function getSummary({ cookies }: ResolverInput): Response {
    const role = readRole(cookies)
    if (role !== 'reader') {
      const forbidden = role === 'denied'
      const error = forbidden ? ERROR_CODE.FORBIDDEN : ERROR_CODE.NEED_LOGIN
      return HttpResponse.json<components['schemas']['ErrorResponse']>(
        { ok: false, code: error.code, message: error.message },
        { status: forbidden ? 403 : 401 },
      )
    }
    return HttpResponse.json({ ok: true, data: readSummary(source) })
  }
  return [http.get(`${baseURL}/summary`, getSummary)]
}
