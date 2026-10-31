import { http } from 'msw/http'
import type { HttpResponseResolver } from 'msw/http'
import { sampleProducts, emptyProducts } from '@/mocks/products/data'
import { scenarioResponse } from '@/mocks/shared/scenario'

type ResolverInfo = Parameters<HttpResponseResolver>[0]

/**
 * handleProducts resolves the synthetic product read.
 * 中文：处理商品演示读取。
 * @param info MSW resolver context / MSW处理上下文。
 * @returns Product scenario response / 商品场景响应；不写业务数据。
 */
function handleProducts(info: ResolverInfo): Response {
  return scenarioResponse(info.request, sampleProducts, emptyProducts)
}

export const productHandlers = [http.get('*/api/admin/products', handleProducts)]
