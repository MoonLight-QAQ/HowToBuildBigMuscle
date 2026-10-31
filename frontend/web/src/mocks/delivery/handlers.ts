import { http } from 'msw/http'
import type { HttpResponseResolver } from 'msw/http'
import { sampleDelivery } from '@/mocks/delivery/data'
import { scenarioResponse } from '@/mocks/shared/scenario'

type ResolverInfo = Parameters<HttpResponseResolver>[0]

/**
 * handleDelivery resolves the synthetic delivery read.
 * 中文：处理配送演示读取，无配置时返回空值。
 * @param info MSW resolver context / MSW处理上下文。
 * @returns Delivery scenario response / 配送场景响应；不修改配置。
 */
function handleDelivery(info: ResolverInfo): Response {
  return scenarioResponse(info.request, sampleDelivery, null)
}

export const deliveryHandlers = [http.get('*/api/admin/delivery', handleDelivery)]
