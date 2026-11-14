/** 州显示文案的测试：每个州都有中文名称，选项与名称表一致。 */
import { expect, it } from 'vitest'
import { AUSTRALIAN_STATE_LABEL, AUSTRALIAN_STATE_OPTIONS } from './australian-state'

it('8 个州和领地都有中文名称', () => {
  expect(Object.keys(AUSTRALIAN_STATE_LABEL)).toEqual([
    'NSW',
    'VIC',
    'QLD',
    'WA',
    'SA',
    'TAS',
    'ACT',
    'NT',
  ])
  for (const label of Object.values(AUSTRALIAN_STATE_LABEL)) expect(label.trim()).not.toBe('')
})

it('选项显示中文名称和缩写', () => {
  expect(AUSTRALIAN_STATE_OPTIONS[0]).toEqual({ value: 'NSW', label: '新南威尔士州（NSW）' })
  expect(AUSTRALIAN_STATE_OPTIONS).toHaveLength(8)
})
