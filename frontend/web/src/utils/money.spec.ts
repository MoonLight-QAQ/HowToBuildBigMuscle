import { expect, it } from 'vitest'
import { formatCents, formatMoney, parseAmountToCents } from './money'

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
