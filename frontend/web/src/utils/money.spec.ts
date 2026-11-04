import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { displayMoney, formatCents, formatMoney, parseAmountToCents } from './money'

/** 中文：金额由十进制字符串精确转为整数分。 English: Parse decimal dollars into exact safe integer cents. */
it.each([
  ['0', 0],
  ['0.01', 1],
  ['0.1', 10],
  ['39', 3900],
  ['39.09', 3909],
  ['-1.25', -125],
  ['-0.00', 0],
  ['0001.20', 120],
  ['90071992547409.91', Number.MAX_SAFE_INTEGER],
  ['-90071992547409.91', Number.MIN_SAFE_INTEGER],
])('元 %s 精确转换为分', function testParseAmount(amount, expected) {
  expect(parseAmountToCents(amount)).toBe(expected)
})

/** 中文：拒绝不明确格式与越界金额，不将空值当零。 English: Reject ambiguous, empty and unsafe amounts. */
it.each([
  '',
  ' ',
  ' 1',
  '1 ',
  '+1',
  '.50',
  '1.',
  '1.001',
  '1,000',
  '1e2',
  'NaN',
  'Infinity',
  '--1',
  '90071992547409.92',
  '-90071992547409.92',
])('拒绝元输入 %j', function testInvalidAmount(amount) {
  expect(() => parseAmountToCents(amount)).toThrow(RangeError)
})

/** 中文：格式化不通过元的浮点运算或舍入。 English: Format exact cents without floating-point dollar arithmetic. */
it.each([
  [0, '0.00'],
  [1, '0.01'],
  [10, '0.10'],
  [3900, '39.00'],
  [-125, '-1.25'],
  [-0, '0.00'],
  [Number.MAX_SAFE_INTEGER, '90071992547409.91'],
  [Number.MIN_SAFE_INTEGER, '-90071992547409.91'],
])('整数分 %s 显示两位元', function testFormatCents(cents, expected) {
  expect(formatCents(cents)).toBe(expected)
  expect(parseAmountToCents(formatCents(cents))).toBe(cents === 0 ? 0 : cents)
})

/** 中文：拒绝小数、非有限和不安全分值。 English: Reject fractional, non-finite and unsafe cents. */
it.each([0.1, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1])(
  '拒绝非法分值 %s',
  function testInvalidCents(cents) {
    expect(() => formatCents(cents)).toThrow(RangeError)
    expect(() => formatMoney(cents)).toThrow(RangeError)
  },
)

/** 中文：币种明确标注澳元，负值不丢符号。 English: Clearly label AUD and retain a negative sign. */
it('澳元显示使用 A$ 标识', function testCurrencyLabel() {
  expect(formatMoney(3909)).toBe('A$ 39.09')
  expect(formatMoney(-125)).toBe('A$ -1.25')
})

/** 中文：运行时也拒绝非字符串元和非数字分。 English: Runtime validation rejects wrong scalar types. */
it('错误类型不能被隐式转换成金额', function testInvalidRuntimeTypes() {
  // @ts-expect-error 验证来自运行时的不可信类型。 / Probe untrusted runtime input.
  expect(() => parseAmountToCents(null)).toThrow(RangeError)
  // @ts-expect-error 验证来自运行时的不可信类型。 / Probe untrusted runtime input.
  expect(() => formatCents(null)).toThrow(RangeError)
})

/** 中文：显示层区分真实零值和非法资料。 English: Preserve real zero while invalid display values use a placeholder. */
it.each([null, undefined, '', '3909', false, {}, NaN, Infinity, 0.1, Number.MAX_SAFE_INTEGER + 1])(
  '非法分值显示为占位符 %j',
  function testSafeMoneyPlaceholder(value) {
    expect(displayMoney(value)).toBe('—')
  },
)

/** 中文：合法金额保留精确值和币种，零不显示占位。 English: Keep exact valid amounts, currency and an explicit zero. */
it.each([
  [0, 'A$ 0.00'],
  [3909, 'A$ 39.09'],
  [-125, 'A$ -1.25'],
  [Number.MAX_SAFE_INTEGER, 'A$ 90071992547409.91'],
])('安全显示整数分 %s', function testSafeMoneyValue(value, expected) {
  expect(displayMoney(value)).toBe(expected)
})

/** 中文：真实Vue渲染中单个非法单元格不影响合法行。 English: Invalid money cells must not abort a real Vue render. */
it('金额单元格异常不造成整页渲染失败', function testMoneyRenderIsolation() {
  const MoneyCells = defineComponent({
    /** 中文：渲染测试单元格，无参数，返回VNode，不读写外部资料。 English: Return fixture cells without external effects. */
    render() {
      return h('div', [
        h('span', { 'data-cell': 'invalid' }, displayMoney(null)),
        h('span', { 'data-cell': 'zero' }, displayMoney(0)),
        h('span', { 'data-cell': 'valid' }, displayMoney(3909)),
      ])
    },
  })
  const view = mount(MoneyCells)
  expect(view.get('[data-cell="invalid"]').text()).toBe('—')
  expect(view.get('[data-cell="zero"]').text()).toBe('A$ 0.00')
  expect(view.get('[data-cell="valid"]').text()).toBe('A$ 39.09')
  view.unmount()
})
