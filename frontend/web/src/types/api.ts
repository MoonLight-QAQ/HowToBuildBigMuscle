import type { components } from '@/api/generated/admin'

export type Product = components['schemas']['Product']
export type ProductListData = components['schemas']['ProductListData']
export type MallCategory = components['schemas']['MallCategory']
export type MallCategoryListData = components['schemas']['MallCategoryListData']
export type City = components['schemas']['City']
export type CityListData = components['schemas']['CityListData']
export type DeliveryArea = components['schemas']['DeliveryArea']
export type DeliveryTimeSlot = components['schemas']['DeliveryTimeSlot']
export type DeliveryConfig = components['schemas']['DeliveryConfig']
export type ErrorResponse = components['schemas']['ErrorResponse']

export const MOCK_SCENARIOS = [
  'success',
  'empty',
  'unauthorized',
  'forbidden',
  'validation',
  'conflict',
  'network',
  'malformed',
] as const

export type MockScenario = (typeof MOCK_SCENARIOS)[number]

/** RequestOptions controls cancellation and mock-only scenarios. / 请求选项控制取消与仅供Mock使用的场景。 */
export interface RequestOptions {
  signal?: AbortSignal
  scenario?: MockScenario
}
