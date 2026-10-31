import { http } from 'msw/http'
import type { HttpResponseResolver } from 'msw/http'
import { sampleCities, emptyCities } from '@/mocks/cities/data'
import { scenarioResponse } from '@/mocks/shared/scenario'

type ResolverInfo = Parameters<HttpResponseResolver>[0]

/**
 * handleCities resolves the synthetic city read.
 * 中文：处理城市演示读取。
 * @param info MSW resolver context / MSW处理上下文。
 * @returns City scenario response / 城市场景响应；不修改城市。
 */
function handleCities(info: ResolverInfo): Response {
  return scenarioResponse(info.request, sampleCities, emptyCities)
}

export const cityHandlers = [http.get('*/api/admin/cities', handleCities)]
