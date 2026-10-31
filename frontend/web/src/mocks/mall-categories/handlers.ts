import { http } from 'msw/http'
import type { HttpResponseResolver } from 'msw/http'
import { sampleMallCategories, emptyMallCategories } from '@/mocks/mall-categories/data'
import { scenarioResponse } from '@/mocks/shared/scenario'

type ResolverInfo = Parameters<HttpResponseResolver>[0]

/**
 * handleMallCategories resolves the synthetic mall category read.
 * 中文：处理商城类目演示读取，不涉及闲置类目。
 * @param info MSW resolver context / MSW处理上下文。
 * @returns Category scenario response / 类目场景响应；不写业务数据。
 */
function handleMallCategories(info: ResolverInfo): Response {
  return scenarioResponse(info.request, sampleMallCategories, emptyMallCategories)
}

export const mallCategoryHandlers = [http.get('*/api/admin/mall-categories', handleMallCategories)]
