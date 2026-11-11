import type { components } from '@/api/generated/admin'
import { http } from './http'

export type Summary = components['schemas']['Summary']
type CityOverview = components['schemas']['CityOverview']

/** 校验对象字段与契约完全一致；返回记录，非法值抛错，无副作用。 / Validate exact object keys and return the record, throwing on invalid input without effects. */
function readRecord(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('invalid-summary')
  }
  const record = value as Record<string, unknown>
  if (Object.keys(record).length !== keys.length) throw new TypeError('invalid-summary')
  for (const key of keys) {
    if (!Object.hasOwn(record, key)) throw new TypeError('invalid-summary')
  }
  return record
}

/** 读取非负安全整数计数或澳元分；非法值抛错，不进行修正。 / Read a nonnegative safe integer count or AUD cents, throwing without coercion. */
function readInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError('invalid-summary')
  }
  return value
}

/** 校验名称的Unicode码点数不超过指定上限；空字符串合法，无副作用。 / Validate a name against its Unicode code point limit, allowing empty text without effects. */
function readName(value: unknown, maximum: number): string {
  if (typeof value !== 'string' || [...value].length > maximum)
    throw new TypeError('invalid-summary')
  return value
}

/** 校验配送大区名称，最多20个Unicode码点；非法值抛错，无副作用。 / Validate a zone name up to 20 Unicode code points, throwing on invalid input. */
function readZoneName(value: unknown): string {
  return readName(value, 20)
}

/** 解析城市配送投影；保留字符串ID和大区顺序，快递大区数组必须为空。 / Parse a city projection, preserving string IDs and zone order and requiring an empty list for post cities. */
function parseCity(value: unknown): CityOverview {
  const city = readRecord(value, ['id', 'nameZh', 'fulfillment', 'deliverableZoneNamesZh'])
  if (
    typeof city.id !== 'string' ||
    !/^[0-9]{1,20}$/.test(city.id) ||
    (city.fulfillment !== 'local' && city.fulfillment !== 'post') ||
    !Array.isArray(city.deliverableZoneNamesZh) ||
    (city.fulfillment === 'post' && city.deliverableZoneNamesZh.length > 0)
  ) {
    throw new TypeError('invalid-summary')
  }
  return {
    id: city.id,
    nameZh: readName(city.nameZh, 40),
    fulfillment: city.fulfillment,
    deliverableZoneNamesZh: city.deliverableZoneNamesZh.map(readZoneName),
  }
}

/** 校验并复制服务端概览；计数和金额必须有效，失败抛错，不推导或补零。 / Validate and copy the server summary, throwing instead of deriving counts or filling zeros. */
export function parseSummary(value: unknown): Summary {
  const summary = readRecord(value, [
    'pendingOrderCount',
    'deliveringOrderCount',
    'openRefundCount',
    'openReportCount',
    'cities',
    'localFeeCents',
    'postFeeCents',
    'freeShippingThresholdCents',
  ])
  if (!Array.isArray(summary.cities)) throw new TypeError('invalid-summary')
  return {
    pendingOrderCount: readInteger(summary.pendingOrderCount),
    deliveringOrderCount: readInteger(summary.deliveringOrderCount),
    openRefundCount: readInteger(summary.openRefundCount),
    openReportCount: readInteger(summary.openReportCount),
    cities: summary.cities.map(parseCity),
    localFeeCents: readInteger(summary.localFeeCents),
    postFeeCents: readInteger(summary.postFeeCents),
    freeShippingThresholdCents: readInteger(summary.freeShippingThresholdCents),
  }
}

export const dashboardApi = {
  /** 获取当前待办及配送摘要；可取消，失败由统一客户端归一化，无写入。 / Fetch current workload and delivery summary with cancellation and normalized errors, without writes. */
  get(signal?: AbortSignal): Promise<Summary> {
    return http.request('/summary', { signal, parse: parseSummary })
  },
}
