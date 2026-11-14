/**
 * 配送方式（Fulfillment）的显示文案和标签颜色。
 *
 * 取值见字段清单。城市、订单、概览都会用到，所以放在 src/constants/ 中，各模块共用，
 * 不要在页面里写 if (fulfillment === 'local') 之类的文案映射。
 */
import type { components } from '@/api/generated/admin'

type Fulfillment = components['schemas']['Fulfillment']

/** 配送方式的中文名称。 */
export const FULFILLMENT_LABEL: Readonly<Record<Fulfillment, string>> = {
  local: '线下配送',
  post: '快递',
}

/** 配送方式在 ElTag 中的颜色类型。 */
export const FULFILLMENT_TAG_TYPE: Readonly<Record<Fulfillment, 'success' | 'info'>> = {
  local: 'success',
  post: 'info',
}

/** 单选框选项，按上表顺序。 */
export const FULFILLMENT_OPTIONS: readonly { value: Fulfillment; label: string }[] = (
  Object.keys(FULFILLMENT_LABEL) as Fulfillment[]
).map((value) => ({ value, label: FULFILLMENT_LABEL[value] }))
