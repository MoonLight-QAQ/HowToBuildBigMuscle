import { getData } from '@/api/http'
import { formatMinorAmount } from '@/api/presentation'
import { deliverySchema } from '@/api/schemas'
import type { DeliveryArea, DeliveryConfig, DeliveryTimeSlot, RequestOptions } from '@/types/api'

/**
 * toAreaPreview prepares an area availability label.
 * 中文：补充配送区可送状态文字，不改变服务端可送标识。
 * @param area Validated delivery area / 已校验配送区。
 * @returns Display-ready area / 可直接显示的区；无副作用。
 */
function toAreaPreview(area: DeliveryArea) {
  return { ...area, availabilityLabel: area.enabled ? '可配送' : '不可配送' }
}

/**
 * toTimeSlotPreview prepares a configured clock range and enabled label.
 * 中文：展示配置钟点和启用状态，不在浏览器生成订单日期或时间。
 * @param slot Validated daily time slot / 已校验的每日时段。
 * @returns Display-ready slot / 可直接显示的时段；无副作用。
 */
function toTimeSlotPreview(slot: DeliveryTimeSlot) {
  return {
    ...slot,
    rangeText: `${slot.startTime}–${slot.endTime}`,
    statusLabel: slot.enabled ? '已启用' : '已停用',
  }
}

/**
 * toDeliveryPreview formats configured fees and preserves missing configuration.
 * 中文：格式化配送配置；无配置仍为空值，不伪造零费用。
 * @param config Validated configuration or null / 已校验配置或空值。
 * @returns Display-ready configuration or null / 可直接显示的配置或空值；无副作用。
 */
export function toDeliveryPreview(config: DeliveryConfig | null) {
  if (config === null) return null
  return {
    ...config,
    localFeeText: formatMinorAmount(config.localFeeMinor, config.currency),
    postFeeText: formatMinorAmount(config.postFeeMinor, config.currency),
    freePostThresholdText: formatMinorAmount(config.freePostThresholdMinor, config.currency),
    areas: config.areas.map(toAreaPreview),
    timeSlots: config.timeSlots.map(toTimeSlotPreview),
  }
}

export type DeliveryPreview = NonNullable<ReturnType<typeof toDeliveryPreview>>

/**
 * getDelivery reads the complete draft delivery configuration.
 * 中文：按只读草案获取费用、配送区和时段，不保存或改动配置。
 * @param options Cancellation and mock scenario / 取消与Mock场景。
 * @returns Display-ready configuration or null / 可直接展示的配置或空值。
 * Performs one GET and throws normalized ApiError on failure / 执行一次GET，失败抛统一错误。
 */
export async function getDelivery(options?: RequestOptions) {
  const data = await getData('/api/admin/delivery', deliverySchema, options)
  return toDeliveryPreview(data)
}
