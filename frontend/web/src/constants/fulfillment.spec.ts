/** 配送方式显示文案的测试：每个取值都有中文名称、标签颜色和选项。 */
import { expect, it } from 'vitest'
import { FULFILLMENT_LABEL, FULFILLMENT_OPTIONS, FULFILLMENT_TAG_TYPE } from './fulfillment'

it('线下配送和快递', () => {
  expect(FULFILLMENT_LABEL).toEqual({ local: '线下配送', post: '快递' })
})

it('每个取值都有标签颜色和选项', () => {
  expect(Object.keys(FULFILLMENT_TAG_TYPE)).toEqual(Object.keys(FULFILLMENT_LABEL))
  expect(FULFILLMENT_OPTIONS).toEqual([
    { value: 'local', label: '线下配送' },
    { value: 'post', label: '快递' },
  ])
})
