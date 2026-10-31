import { getData } from '@/api/http'
import { cityListSchema } from '@/api/schemas'
import type { City, RequestOptions } from '@/types/api'

/**
 * toCityPreview adds a display label without changing fulfillment semantics.
 * 中文：补充配送方式文字，不修改城市的线下或快递语义。
 * @param city Validated generated-contract city / 经校验的生成契约城市。
 * @returns Display-ready city / 可直接显示的城市；无副作用。
 */
export function toCityPreview(city: City) {
  return { ...city, fulfillmentLabel: city.fulfillment === 'local' ? '线下配送' : '快递' }
}

export type CityPreview = ReturnType<typeof toCityPreview>

/**
 * listCities reads cities with local display labels.
 * 中文：读取城市及数据层生成的展示文字，不执行任何城市配置写入。
 * @param options Cancellation and mock scenario / 取消与Mock场景。
 * @returns Validated city list / 已校验城市列表。
 * Performs one GET and throws normalized ApiError on failure / 执行一次GET，失败抛统一错误。
 */
export async function listCities(options?: RequestOptions) {
  const data = await getData('/api/admin/cities', cityListSchema, options)
  return { ...data, items: data.items.map(toCityPreview) }
}

export type CityListPreview = Awaited<ReturnType<typeof listCities>>
