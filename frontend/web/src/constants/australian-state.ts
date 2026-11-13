/**
 * 澳洲州和领地（AustralianState）的显示文案。
 *
 * 取值和中文名称见字段清单「AustralianState 州」。城市、suburb 字典、订单地址快照都会用到，
 * 所以放在 src/constants/ 中，各模块共用，不要在页面里自己写州名的映射。
 */
import type { components } from '@/api/generated/admin'

type AustralianState = components['schemas']['AustralianState']

/** 州的中文名称。类型为 Record：契约增加州时，类型检查会提示这里补上。 */
export const AUSTRALIAN_STATE_LABEL: Readonly<Record<AustralianState, string>> = {
  NSW: '新南威尔士州',
  VIC: '维多利亚州',
  QLD: '昆士兰州',
  WA: '西澳大利亚州',
  SA: '南澳大利亚州',
  TAS: '塔斯马尼亚州',
  ACT: '澳大利亚首都领地',
  NT: '北领地',
}

/** 下拉框选项，按上表顺序。显示为「新南威尔士州（NSW）」。 */
export const AUSTRALIAN_STATE_OPTIONS: readonly { value: AustralianState; label: string }[] = (
  Object.keys(AUSTRALIAN_STATE_LABEL) as AustralianState[]
).map((value) => ({ value, label: `${AUSTRALIAN_STATE_LABEL[value]}（${value}）` }))
