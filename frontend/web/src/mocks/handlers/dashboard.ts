import { http, HttpResponse, type HttpHandler, type HttpResponseResolver } from 'msw/http'
import type { components } from '@/api/generated/admin'
import { ERROR_CODE } from '@/constants/error-code'
import { createDashboardData, type DashboardMockData } from '../data/dashboard'

export const DASHBOARD_MOCK_TOKENS = {
  reader: 'mock-dashboard-reader',
  denied: 'mock-dashboard-denied',
} as const

/** 按当前记录统计待办，复制配送快照；不按日期筛选，不写订单或退款。 / Count current records and copy delivery snapshots without date filtering or business writes. */
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
  return {
    pendingOrderCount,
    deliveringOrderCount,
    openRefundCount,
    openReportCount,
    ...structuredClone(source.delivery),
  }
}

/** 创建独立GET拦截器；每次读取调用方持有的数据，授权前不读取摘要，无真实请求。 / Create isolated GET handlers reading caller-owned data per request, only after authorization. */
export function createDashboardHandlers(
  source: DashboardMockData = createDashboardData(),
  baseURL: string = import.meta.env.VITE_API_BASE_URL,
): HttpHandler[] {
  /** 校验合成身份并返回当前摘要；不回显身份，不写业务记录。 / Authorize a synthetic identity and return the current summary without credential echo or business writes. */
  function getSummary({ request }: Parameters<HttpResponseResolver>[0]): Response {
    const authorization = request.headers.get('authorization')
    if (authorization !== `Bearer ${DASHBOARD_MOCK_TOKENS.reader}`) {
      const forbidden = authorization === `Bearer ${DASHBOARD_MOCK_TOKENS.denied}`
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

export const dashboardHandlers = createDashboardHandlers()
